"""Server-owned challenge sessions. RGB PAD is experimental, not certified eKYC."""
import base64
import secrets
import subprocess
import time

import cv2
import mediapipe as mp
import numpy as np
import torch
from fastapi import HTTPException
from vendor.MiniFASNet import MiniFASNetV2, MiniFASNetV1SE

TTL = 120
STEP_SECONDS = 25
HOLD_SECONDS = .8
PAD_THRESHOLD = .80
SESSIONS = {}


def initialize(app, models):
    torch.set_num_threads(1)
    app.state.pad = []
    for name, factory, scale in [('2.7_80x80_MiniFASNetV2.pth', MiniFASNetV2, 2.7),
                                  ('4_0_0_80x80_MiniFASNetV1SE.pth', MiniFASNetV1SE, 4.0)]:
        model = factory(conv6_kernel=(5, 5))
        state = torch.load(models / name, map_location='cpu', weights_only=True)
        model.load_state_dict({k.removeprefix('module.'): v for k, v in state.items()})
        model.eval()
        app.state.pad.append((model, scale))
    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(models / 'face_landmarker.task')),
        running_mode=mp.tasks.vision.RunningMode.IMAGE, num_faces=2,
        min_face_detection_confidence=.7, min_face_presence_confidence=.7,
        output_facial_transformation_matrixes=True)
    app.state.landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)


def cleanup():
    now = time.monotonic()
    for sid in list(SESSIONS):
        if SESSIONS[sid]['expires'] < now:
            del SESSIONS[sid]


def start():
    cleanup()
    if len(SESSIONS) >= 32:
        raise HTTPException(429, 'Busy')
    directions = ['LEFT', 'RIGHT', 'UP', 'DOWN']
    secrets.SystemRandom().shuffle(directions)
    sid = secrets.token_urlsafe(32)
    now = time.monotonic()
    SESSIONS[sid] = dict(steps=['CENTER'] + sum(([x, 'CENTER'] for x in directions), []),
        index=0, expires=now+TTL, step_started=now, last=0, hold=None,
        reference=None, portrait=None, pad=[], bad=0, frame_hash=None, hold_count=0, baseline=None)
    return progress(sid, SESSIONS[sid], 'Nhìn thẳng vào camera, giữ đầu ổn định.')


def progress(sid, s, message):
    n = len(s['steps'])
    return dict(sessionId=sid, step=s['steps'][s['index']] if s['index'] < n else 'DONE',
        completed=s['index'], total=n, progress=round(100*s['index']/n),
        complete=s['index']==n, message=message, expiresIn=max(0, int(s['expires']-time.monotonic())))


def pose(app, image):
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    result = app.state.landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
    if len(result.face_landmarks) != 1:
        raise ValueError('Giữ đúng một khuôn mặt trong khung hình.')
    # MediaPipe's canonical face transform avoids ambiguous PnP solutions.
    matrix = result.facial_transformation_matrixes[0][:3,:3]
    pitch, yaw, roll = cv2.RQDecomp3x3(matrix)[0]
    return pitch, yaw, roll



def pad(app, image, box):
    x,y,w,h = map(float, box[:4])
    ih,iw = image.shape[:2]
    values=[]
    with torch.inference_mode():
        for model, scale in app.state.pad:
            scale = min(scale, (iw-1)/w, (ih-1)/h)
            nw,nh=w*scale,h*scale
            left=max(0,min(x+w/2-nw/2,iw-nw-1)); top=max(0,min(y+h/2-nh/2,ih-nh-1))
            crop=image[int(top):int(top+nh),int(left):int(left+nw)]
            if crop.size == 0: raise ValueError('Đưa mặt vào giữa khung hình.')
            # Upstream models use BGR 0..255, not RGB/255 normalization.
            tensor=torch.from_numpy(cv2.resize(crop,(80,80)).transpose(2,0,1).copy()).float().unsqueeze(0)
            values.append(torch.softmax(model(tensor),dim=1)[0].numpy())
    probabilities=np.mean(values,axis=0)
    return float(probabilities[1]) if int(np.argmax(probabilities))==1 else 0.0


def frame(app, sid, raw, decode, feature):
    import hashlib
    cleanup()
    s=SESSIONS.get(sid)
    if s is None: raise HTTPException(410,'Phiên đã hết hạn. Hãy bắt đầu lại.')
    now=time.monotonic()
    if s['index']==len(s['steps']): return progress(sid,s,'Đã hoàn thành động tác. Đang chờ đối chiếu CCCD.')
    if now-s['step_started']>STEP_SECONDS:
        del SESSIONS[sid]; raise HTTPException(410,'Quá thời gian thực hiện động tác. Hãy bắt đầu lại.')
    if now-s['last']<.25: raise HTTPException(429,'Gửi khung hình quá nhanh.')
    if now-s['last']>1.5:
        s['hold']=None; s['hold_count']=0
    s['last']=now
    digest=hashlib.sha256(raw).digest()
    if digest==s['frame_hash']:
        s['hold']=None; return progress(sid,s,'Camera chưa có khung hình mới.')
    s['frame_hash']=digest
    image=decode(raw)
    try:
        pitch,yaw,roll=pose(app,image)
        vector=feature(app,image)
        detector=app.state.detector
        detector.setInputSize((image.shape[1],image.shape[0])); _, boxes=detector.detect(image)
        if boxes is None or len(boxes)!=1: raise ValueError('Giữ một khuôn mặt trong khung hình.')
        x,y,w,h=boxes[0][:4]
        if w<image.shape[1]*.18 or w>image.shape[1]*.8 or h>image.shape[0]*.95 or abs((x+w/2)/image.shape[1]-.5)>.25 or abs((y+h/2)/image.shape[0]-.5)>.3:
            raise ValueError('Đưa mặt gần camera hơn và giữ trọn khuôn mặt trong khung.')
        crop=image[max(0,int(y)):min(image.shape[0],int(y+h)),max(0,int(x)):min(image.shape[1],int(x+w))]
        gray=cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY)
        if float(gray.mean())<45 or float(gray.mean())>235:
            raise ValueError('Ánh sáng chưa phù hợp. Tránh quá tối hoặc ngược sáng.')
        if cv2.Laplacian(gray,cv2.CV_64F).var()<35:
            raise ValueError('Ảnh mặt bị mờ. Lau camera và giữ đầu ổn định.')
        if s['reference'] is not None:
            same=float(app.state.recognizer.match(s['reference'],vector,cv2.FaceRecognizerSF_FR_COSINE))
            if same<.30: raise ValueError('Khuôn mặt thay đổi. Quay về chính diện hoặc bắt đầu lại.')
        target=s['steps'][s['index']]
        if s['baseline'] is not None:
            pitch-=s['baseline'][0]; yaw-=s['baseline'][1]; roll-=s['baseline'][2]
        centered=abs(yaw)<12 and abs(pitch)<15 and abs(roll)<15
        valid={'CENTER':centered,'LEFT':yaw>18 and yaw<38 and abs(pitch)<20,
               'RIGHT':yaw< -18 and yaw> -38 and abs(pitch)<20,
               'UP':pitch< -15 and pitch> -35 and abs(yaw)<15,
               'DOWN':pitch>15 and pitch<35 and abs(yaw)<15}[target]
        # Passive model is evaluated near frontal poses, its intended operating range.
        if target=='CENTER' and centered:
            score=pad(app,image,boxes[0])
            if score<PAD_THRESHOLD:
                s['bad']+=1; s['hold']=None
                if s['bad']>=3:
                    del SESSIONS[sid]; raise HTTPException(422,'Không vượt qua kiểm tra chống giả mạo. Dùng khuôn mặt thật, đủ sáng rồi thử lại.')
                return progress(sid,s,'Chưa vượt qua kiểm tra người thật. Đủ sáng, không dùng ảnh hoặc màn hình.')
            s['bad']=0
            if valid:
                s['pad'].append(score)
                s['pad']=s['pad'][-30:]
        if not valid:
            s['hold']=None
            return progress(sid,s,'Thực hiện đúng hướng yêu cầu, quay nhẹ rồi giữ đầu ổn định.')
        if s['hold'] is None: s['hold']=now; s['hold_count']=0
        s['hold_count']+=1
        if now-s['hold']<HOLD_SECONDS or s['hold_count']<3: return progress(sid,s,'Đúng hướng. Giữ nguyên một chút…')
        if target=='CENTER':
            if s['reference'] is None:
                s['reference']=vector; s['baseline']=(pitch,yaw,roll)
            _, jpeg=cv2.imencode('.jpg',image,[cv2.IMWRITE_JPEG_QUALITY,90]); s['portrait']=jpeg.tobytes()
        s['index']+=1; s['hold']=None; s['step_started']=now
        return progress(sid,s,'Đã nhận đúng động tác.')
    except ValueError as e:
        s['hold']=None; return progress(sid,s,str(e))
    except HTTPException as e:
        if sid not in SESSIONS: raise
        s['hold']=None
        if e.status_code==422: return progress(sid,s,'Chưa nhận rõ khuôn mặt. Giữ mặt trong khung và đủ sáng.')
        raise


def ocr(raw):
    # stdin/stdout only; no image or document file is persisted.
    result=subprocess.run(['tesseract','stdin','stdout','-l','vie+eng','--psm','6'],input=raw,
                          stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=15,check=True)
    return result.stdout.decode('utf-8',errors='replace').strip()[:8000]


def finish(app,sid,front,back,decode,feature,threshold):
    import re
    import unicodedata
    cleanup()
    s=SESSIONS.pop(sid,None)  # consume even when final document comparison fails
    if s is None or s['index']!=len(s['steps']) or not s['portrait'] or len(s['pad'])<6:
        raise HTTPException(422,'Chưa hoàn tất phiên quét khuôn mặt.')
    card=decode(front); reverse=decode(back); portrait=decode(s['portrait'])
    score=float(app.state.recognizer.match(feature(app,card),feature(app,portrait),cv2.FaceRecognizerSF_FR_COSINE))
    text=ocr(front); back_text=ocr(back)
    ids=[re.sub(r'\s','',x) for x in re.findall(r'(?<!\d)(?:\d[ \t]*){12}(?![ \t]*\d)',text)]
    plain=' '.join(''.join(c for c in unicodedata.normalize('NFD',text.upper()) if unicodedata.category(c)!='Mn').split())
    recognizable=('CAN CUOC' in plain or 'CONG DAN' in plain or 'IDENTITY' in plain)
    # OCR is evidence for review, not document authenticity validation.
    return dict(decision='MATCH' if score>=threshold else 'NO_MATCH',cosineScore=score,
        threshold=threshold,motionPassed=True,antiSpoofPassed=True,padScore=float(np.mean(s['pad'])),
        documentReadable=bool(ids and recognizable and len(back_text)>30),
        documentNumber=ids[0] if ids else '',frontText=text,backText=back_text,
        faceJpeg=base64.b64encode(s['portrait']).decode(),documentValidated=False,identityVerified=False)
