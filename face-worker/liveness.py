"""Server-owned challenge sessions. RGB PAD is experimental, not certified eKYC."""
import base64
import hashlib
import logging
import secrets
import subprocess
import time

import cv2
import mediapipe as mp
import numpy as np
import torch
from fastapi import HTTPException
from vendor.MiniFASNet import MiniFASNetV2, MiniFASNetV1SE

TTL = 300
STEP_SECONDS = 60
FRAME_IDLE_SECONDS = 5.0
HOLD_SECONDS = .8
PAD_THRESHOLD = .80
SESSIONS = {}
logger = logging.getLogger("uvicorn.error")


def face_sharpness(gray):
    # Laplacian variance depends on pixel scale. A high-resolution face has
    # smoother adjacent pixels than the same sharp face in a smaller frame.
    # Measure at a consistent face scale; do not resize the recognition/PAD image.
    height, width = gray.shape[:2]
    scale = min(1.0, 256.0 / max(width, height))
    sample = cv2.resize(gray, (round(width * scale), round(height * scale)),
                        interpolation=cv2.INTER_AREA) if scale < 1.0 else gray
    return float(cv2.Laplacian(sample, cv2.CV_64F).var())


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
        reference=None, portrait=None, selfie=None, selfie_score=None, selfie_pad=None, pad=[], bad=0, frame_hash=None, hold_count=0, baseline=None)
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
    started = time.monotonic()
    try:
        return process_frame(app, sid, raw, decode, feature)
    finally:
        session = SESSIONS.get(sid)
        if session is not None:
            completed = time.monotonic()
            # The next frame is sent only after FE receives this response.
            # Inference time is not time the user stopped providing frames.
            session['last_processed'] = completed
            if completed - started > 1.5 and completed - session.get('latency_logged_at', 0) >= 5:
                logger.warning('Face frame processing slow: elapsedMs=%d step=%s acceptedFrames=%d',
                               round((completed-started)*1000), session['steps'][session['index']] if session['index'] < len(session['steps']) else 'DONE',
                               session.get('hold_count', 0))
                session['latency_logged_at'] = completed


def process_frame(app, sid, raw, decode, feature):
    import hashlib
    cleanup()
    s=SESSIONS.get(sid)
    if s is None: raise HTTPException(410,'Phiên đã hết hạn. Hãy bắt đầu lại.')
    now=time.monotonic()
    if s['index']==len(s['steps']): return progress(sid,s,'Đã hoàn thành động tác. Đang chờ đối chiếu CCCD.')
    if now-s['step_started']>STEP_SECONDS:
        del SESSIONS[sid]; raise HTTPException(410,'Quá thời gian thực hiện động tác. Hãy bắt đầu lại.')
    if now-s['last']<.25: raise HTTPException(429,'Gửi khung hình quá nhanh.')
    if now-s.get('last_processed', now)>FRAME_IDLE_SECONDS:
        s['hold']=None; s['hold_count']=0
    s['last']=now
    digest=hashlib.sha256(raw).digest()
    if digest==s['frame_hash']:
        s['hold']=None; return progress(sid,s,'Camera chưa có khung hình mới.')
    s['frame_hash']=digest
    image=decode(raw)
    try:
        pitch,yaw,roll=pose(app,image)
        boxes=app.state.detect_faces(image)
        vector=feature(app,image,boxes)
        x,y,w,h=boxes[0][:4]
        if w>image.shape[1]*.8 or h>image.shape[0]*.95:
            raise ValueError('Camera đang quá gần. Đưa điện thoại ra xa một chút để thấy trọn khuôn mặt.')
        if w<image.shape[1]*.18 or abs((x+w/2)/image.shape[1]-.5)>.25 or abs((y+h/2)/image.shape[0]-.5)>.3:
            raise ValueError('Đưa mặt gần camera hơn và giữ trọn khuôn mặt trong khung.')
        crop=image[max(0,int(y)):min(image.shape[0],int(y+h)),max(0,int(x)):min(image.shape[1],int(x+w))]
        gray=cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY)
        if float(gray.mean())<45 or float(gray.mean())>235:
            raise ValueError('Ánh sáng chưa phù hợp. Tránh quá tối hoặc ngược sáng.')
        sharpness=face_sharpness(gray)
        if sharpness<35:
            if now-s.get('quality_logged_at',0)>=5:
                logger.warning('Face quality rejected: stage=scan reason=blur faceSize=%sx%s normalizedSharpness=%.2f threshold=35',
                               gray.shape[1],gray.shape[0],sharpness)
                s['quality_logged_at']=now
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
        if e.status_code==422: return progress(sid,s,str(e.detail))
        raise


def capture_selfie(app, sid, raw, decode, feature, threshold):
    cleanup()
    session = SESSIONS.get(sid)
    if session is None:
        raise HTTPException(410, 'Phiên đã hết hạn. Vui lòng quét lại.')
    if session['index'] != len(session['steps']) or len(session['pad']) < 6:
        raise HTTPException(422, 'Hoàn thành quét khuôn mặt trước khi chụp selfie.')
    image = decode(raw)
    try:
        pitch, yaw, roll = pose(app, image)
        if session['baseline'] is not None:
            pitch -= session['baseline'][0]; yaw -= session['baseline'][1]; roll -= session['baseline'][2]
        if abs(pitch) > 15 or abs(yaw) > 12 or abs(roll) > 15:
            raise ValueError('Nhìn thẳng và giữ đầu ổn định khi chụp selfie.')
        boxes = app.state.detect_faces(image)
        vector = feature(app, image, boxes)
        x, y, w, h = boxes[0][:4]
        if w < image.shape[1] * .18 or x < 0 or y < 0 or x+w > image.shape[1] or y+h > image.shape[0]:
            raise ValueError('Đưa trọn khuôn mặt vào giữa khung selfie.')
        gray = cv2.cvtColor(image[int(y):int(y+h), int(x):int(x+w)], cv2.COLOR_BGR2GRAY)
        sharpness = face_sharpness(gray)
        if gray.mean() < 45 or gray.mean() > 235 or sharpness < 35:
            logger.warning('Face quality rejected: stage=selfie faceSize=%sx%s brightness=%.2f normalizedSharpness=%.2f',
                           gray.shape[1],gray.shape[0],float(gray.mean()),sharpness)
            raise ValueError('Selfie chưa rõ hoặc ánh sáng chưa phù hợp.')
        score = float(app.state.recognizer.match(session['reference'], vector, cv2.FaceRecognizerSF_FR_COSINE))
        pad_score = pad(app, image, boxes[0])
        if score < threshold or pad_score < PAD_THRESHOLD:
            raise ValueError('Selfie chưa khớp phiên quét hoặc chưa đạt kiểm tra người thật.')
        _, jpeg = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 90])
        session['selfie'] = jpeg.tobytes(); session['selfie_score'] = score; session['selfie_pad'] = pad_score
        return dict(policyVersion=3, accepted=True, expiresIn=max(0, int(session['expires']-time.monotonic())))
    except ValueError as error:
        raise HTTPException(422, str(error))


def finish(app,sid,front,back,decode,feature,threshold):
    cleanup()
    session = SESSIONS.get(sid)
    if session is None:
        raise HTTPException(410, 'Phiên quét đã hết hạn.')
    digest = hashlib.sha256(front + back).digest()
    if session.get('finish_response') is not None:
        if session['finish_digest'] != digest:
            raise HTTPException(422, 'Hồ sơ phiên này đã được đối chiếu. Hãy bắt đầu phiên mới.')
        return session['finish_response']
    response = finish_documents(app,sid,front,back,decode,feature,threshold)
    session['finish_digest'] = digest
    session['finish_response'] = response
    return response


def finish_documents(app,sid,front,back,decode,feature,threshold):
    from document_checks import card_image, read_card, document_fields
    cleanup()
    s=SESSIONS.get(sid)
    if s is None or s['index']!=len(s['steps']) or not s['portrait'] or len(s['pad'])<6 or not s.get('selfie'):
        raise HTTPException(422,'Chưa hoàn tất phiên quét khuôn mặt.')
    response=dict(policyVersion=3,selfiePassed=True,selfieScanScore=s['selfie_score'],selfiePadScore=s['selfie_pad'],decision='NO_MATCH',cosineScore=0.0,threshold=threshold,
        motionPassed=True,antiSpoofPassed=True,padScore=float(np.mean(s['pad'])),
        documentReadable=False,documentQualityPassed=False,frontReadable=False,backReadable=False,
        documentNumber='',fullName='',frontText='',backText='',documentValidated=False,
        identityVerified=False,reasonCode='FRONT_QUALITY')
    card,quality=card_image(decode(front)); response['frontQuality']=quality
    if card is None: return response
    reverse,quality=card_image(decode(back)); response['backQuality']=quality
    if reverse is None:
        response['reasonCode']='BACK_QUALITY'; return response
    response['documentQualityPassed']=True
    try:
        text,front_confidence=read_card(card); back_text,back_confidence=read_card(reverse)
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError) as error:
        logger.warning("Document OCR unavailable: exception=%s", type(error).__name__)
        raise HTTPException(503,'Bộ đọc CCCD chưa sẵn sàng. Vui lòng thử lại sau.')
    fields=document_fields(text,back_text,front_confidence,back_confidence)
    response.update(fields,frontText=text,backText=back_text,
                    frontOcrConfidence=front_confidence,backOcrConfidence=back_confidence)
    if not fields['frontReadable']:
        response['reasonCode']='FRONT_OCR'; return response
    if not fields['backReadable']:
        response['reasonCode']='BACK_OCR'; return response
    response['documentReadable']=True
    try:
        card_vector=feature(app,card)
        scan_score=float(app.state.recognizer.match(card_vector,feature(app,decode(s['portrait'])),cv2.FaceRecognizerSF_FR_COSINE))
        selfie_score=float(app.state.recognizer.match(card_vector,feature(app,decode(s['selfie'])),cv2.FaceRecognizerSF_FR_COSINE))
        score=min(scan_score,selfie_score)
    except HTTPException as error:
        if error.status_code != 422: raise
        response['documentReadable']=False; response['reasonCode']='FRONT_FACE'; return response
    response.update(cosineScore=score,decision='MATCH' if score>=threshold else 'NO_MATCH',
        faceJpeg=base64.b64encode(s['portrait']).decode(),selfieJpeg=base64.b64encode(s['selfie']).decode(),
        documentScanScore=scan_score,documentSelfieScore=selfie_score,reasonCode='OK' if score>=threshold else 'FACE_MISMATCH')
    return response
