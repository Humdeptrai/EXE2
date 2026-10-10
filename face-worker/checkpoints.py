"""Signed server checkpoints. Tokens never leave BE; stored there with AES-GCM."""
import base64
import hashlib
import hmac
import json
import logging
import math
import os
import secrets
import subprocess
import time

import cv2
import numpy as np
from fastapi import HTTPException

MAX_CHECKPOINT = 20 * 1024 * 1024
logger = logging.getLogger("uvicorn.error")


def seal(state):
    payload = json.dumps(state, ensure_ascii=True, separators=(",", ":"), allow_nan=False).encode()
    signature = hmac.new(os.environ['FACE_COMPARE_SHARED_KEY'].encode(), payload, hashlib.sha256).hexdigest()
    token = base64.b64encode(payload).decode() + "." + signature
    if len(token) > MAX_CHECKPOINT:
        raise HTTPException(413, 'Checkpoint too large')
    return token


def unseal(token):
    try:
        if not token or len(token) > MAX_CHECKPOINT: raise ValueError()
        encoded, signature = token.decode().rsplit('.', 1)
        payload = base64.b64decode(encoded, validate=True)
        expected = hmac.new(os.environ['FACE_COMPARE_SHARED_KEY'].encode(), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature): raise ValueError()
        state = json.loads(payload)
        if state['policyVersion'] != 4 or state['total'] != 6 or len(state['pad']) < 6: raise ValueError()
        if not all(math.isfinite(x) and .8 <= x <= 1 for x in state['pad']): raise ValueError()
        if not state['portrait'] or np.asarray(state['reference']).shape != (1, 128): raise ValueError()
        return state
    except (ValueError, KeyError, TypeError, UnicodeError):
        raise HTTPException(422, 'Invalid server checkpoint')


def export_scan(session):
    return seal(dict(policyVersion=4, total=6, nonce=session.setdefault('checkpoint_nonce', secrets.token_hex(16)),
                     portrait=base64.b64encode(session['portrait']).decode(),
                     reference=session['reference'].tolist(), baseline=session['baseline'], pad=session['pad'],
                     selfie=base64.b64encode(session['selfie']).decode() if session.get('selfie') else None,
                     selfieScore=session.get('selfie_score'), selfiePad=session.get('selfie_pad'), documents={}))


def selfie(app, token, raw, decode, feature, threshold):
    from liveness import SESSIONS, capture_selfie
    state = unseal(token)
    sid = secrets.token_urlsafe(32)
    session = dict(steps=['CENTER']*6, index=6, expires=time.monotonic()+120,
                   portrait=base64.b64decode(state['portrait']), pad=state['pad'],
                   reference=np.asarray(state['reference'], dtype=np.float32), baseline=state['baseline'])
    SESSIONS[sid] = session
    try:
        capture_selfie(app, sid, raw, decode, feature, threshold)
        state.update(selfie=base64.b64encode(session['selfie']).decode(), selfieScore=session['selfie_score'], selfiePad=session['selfie_pad'])
        # Existing document quality can remain, but changing the selfie requires rechecking its face comparison.
        state['documents'] = {}
        return dict(policyVersion=4, accepted=True, checkpoint=seal(state))
    finally:
        SESSIONS.pop(sid, None)


def document(app, token, side, raw, decode, feature, threshold):
    from document_checks import card_image, read_card, document_fields
    state = unseal(token)
    if not state.get('selfie'): raise HTTPException(422, 'Selfie required')
    started = time.monotonic()
    card, quality = card_image(decode(raw, max_edge=2400))
    reason = side.upper() + '_QUALITY_' + quality.get('reason', 'CARD_FRAME')
    data = dict(passed=False, quality=quality, reasonCode=reason)
    if card is not None:
        try:
            text, confidence = read_card(card, side=side)
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError) as error:
            logger.warning('Document OCR unavailable: side=%s exception=%s', side, type(error).__name__)
            raise HTTPException(503, 'OCR unavailable')
        fields = document_fields(text if side == 'front' else '', text if side == 'back' else '',
                                 confidence if side == 'front' else 0, confidence if side == 'back' else 0)
        data.update(text=text, confidence=confidence, passed=fields[side+'Readable'],
                    reasonCode=('OK' if fields[side+'Readable'] else side.upper()+'_OCR'))
        if side == 'front':
            data.update(documentNumber=fields['documentNumber'], fullName=fields['fullName'])
            if data['passed']:
                try:
                    vector = feature(app, card)
                    data['scanScore'] = float(app.state.recognizer.match(vector, feature(app, decode(base64.b64decode(state['portrait']))), cv2.FaceRecognizerSF_FR_COSINE))
                    data['selfieScore'] = float(app.state.recognizer.match(vector, feature(app, decode(base64.b64decode(state['selfie']))), cv2.FaceRecognizerSF_FR_COSINE))
                except HTTPException as error:
                    if error.status_code != 422: raise
                    data.update(passed=False, reasonCode='FRONT_FACE')
    logger.info('Document check: side=%s passed=%s reason=%s quality=%s confidence=%.1f nameExtracted=%s elapsedMs=%d',
                side, data['passed'], data['reasonCode'], quality.get('reason'), data.get('confidence', 0), bool(data.get('fullName')), round((time.monotonic()-started)*1000))
    data['digest'] = hashlib.sha256(raw).hexdigest()
    state['documents'][side] = data
    return dict(policyVersion=4, passed=data['passed'], reasonCode=data['reasonCode'], checkpoint=seal(state))


def finish(token, front, back, threshold):
    state = unseal(token)
    docs = state['documents']
    for side, raw in (('front', front), ('back', back)):
        data = docs.get(side, {})
        if not data.get('passed') or data.get('digest') != hashlib.sha256(raw).hexdigest():
            raise HTTPException(422, 'Document checkpoint does not match saved evidence')
    if not state.get('selfie') or state['selfieScore'] < threshold or state['selfiePad'] < .8:
        raise HTTPException(422, 'Selfie required')
    f, b = dict(docs['front']), docs['back']
    # Old signed checkpoints retain the old parser's empty name even after a
    # redeploy. Re-read only this field from the exact saved front evidence;
    # never use a profile name or change validated face comparison scores.
    if not f.get('fullName'):
        from document_checks import extract_name, card_image, read_card, document_fields
        f['fullName'] = extract_name(f.get('text', ''))
        if not f['fullName']:
            image = cv2.imdecode(np.frombuffer(front, np.uint8), cv2.IMREAD_COLOR)
            if image is not None:
                card, quality = card_image(image)
                if card is not None and quality['passed']:
                    try:
                        text, confidence = read_card(card, side='front')
                    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError) as error:
                        logger.warning('Saved front OCR unavailable: exception=%s', type(error).__name__)
                        raise HTTPException(503, 'OCR unavailable')
                    fields = document_fields(text, '', confidence, 0)
                    if fields['frontReadable'] and fields['documentNumber'] == f['documentNumber']:
                        f.update(fullName=fields['fullName'], text=text, confidence=confidence)
        logger.info('Saved front name refresh: nameExtracted=%s', bool(f['fullName']))
    score = min(f['scanScore'], f['selfieScore'])
    return dict(policyVersion=4, motionPassed=True, antiSpoofPassed=True, padScore=float(np.mean(state['pad'])),
                selfiePassed=True, selfieScanScore=state['selfieScore'], selfiePadScore=state['selfiePad'],
                documentQualityPassed=True, frontQuality=f['quality'], backQuality=b['quality'],
                documentReadable=True, frontReadable=True, backReadable=True, documentNumber=f['documentNumber'],
                fullName=f['fullName'], frontText=f['text'], backText=b['text'],
                cosineScore=score, threshold=threshold, decision='MATCH' if score>=threshold else 'NO_MATCH',
                faceJpeg=state['portrait'], selfieJpeg=state['selfie'], reasonCode='OK' if score>=threshold else 'FACE_MISMATCH')
