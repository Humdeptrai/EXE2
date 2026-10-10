"""Private local RGB PAD / motion / OCR service. Never certifies identity or document authenticity."""
import hmac
import io
import logging
import math
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, Header, HTTPException, Request
from PIL import Image, UnidentifiedImageError

KEY = os.environ.get("FACE_COMPARE_SHARED_KEY", "")
THRESHOLD = float(os.environ.get("FACE_COMPARE_THRESHOLD", "0.32"))
MODELS = Path(os.environ.get("FACE_MODELS_DIR", "models"))
LOCK = threading.Lock()
MAX_IMAGE = 5 * 1024 * 1024
MAX_BODY = 30 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 16_000_000
cv2.setNumThreads(1)
logger = logging.getLogger("uvicorn.error")
_UNSET_FACES = object()

@asynccontextmanager
async def lifespan(app):
    if len(KEY) < 32 or not math.isfinite(THRESHOLD) or not .32 <= THRESHOLD < 1:
        raise RuntimeError("Configure a shared key of at least 32 characters and a valid threshold")
    # Detection confidence is separate from biometric matching and PAD thresholds.
    # 0.9 misses legitimate phone-camera faces before those checks can run.
    app.state.detector = cv2.FaceDetectorYN.create(str(MODELS / "yunet.onnx"), "", (320, 320), 0.8, 0.3, 5000)
    app.state.recognizer = cv2.FaceRecognizerSF.create(str(MODELS / "sface.onnx"), "")
    app.state.detect_faces = lambda image: detect_faces(app, image)
    from liveness import initialize
    initialize(app, MODELS)
    yield
    app.state.landmarker.close()

app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

@app.middleware("http")
async def limit_body(request: Request, call_next):
    # Reject before multipart parsing, including chunked requests.
    if request.url.path != "/health":
        if not hmac.compare_digest(request.headers.get("x-face-key", ""), KEY) or len(KEY) < 32:
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        chunks, size = [], 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > MAX_BODY:
                from fastapi.responses import JSONResponse
                return JSONResponse({"detail": "Too large"}, status_code=413)
            chunks.append(chunk)
        request._body = b"".join(chunks)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response

@app.get("/health")
def health():
    return {"status": "ok"}

def decode(raw, max_edge=1600):
    try:
        if not raw or len(raw) > MAX_IMAGE:
            raise ValueError()
        with Image.open(io.BytesIO(raw)) as image:
            w, h = image.size
            if image.format != "JPEG" or w < 320 or h < 240 or w > 5000 or h > 5000 or w * h > 16_000_000:
                raise ValueError()
            image.load()
            if max(w, h) > max_edge:
                image.thumbnail((max_edge, max_edge))
            return cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2BGR)
    except (ValueError, UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(422, "Use a clear JPEG image within the allowed size")

def detect_faces(app, image):
    # YuNet's face-size range is limited: phone portrait frames can contain a
    # face larger than the detector handles reliably at native resolution.
    # Keep recognition/PAD on the original image and map all five landmarks back.
    height, width = image.shape[:2]
    scale = min(1.0, 640.0 / max(width, height))
    small = cv2.resize(image, (round(width * scale), round(height * scale)),
                       interpolation=cv2.INTER_AREA) if scale < 1.0 else image
    detector = app.state.detector
    detector.setInputSize((small.shape[1], small.shape[0]))
    _, faces = detector.detect(small)
    if faces is not None and scale < 1.0:
        faces = faces.copy()
        # x/y for box origin, dimensions and five landmark pairs; not confidence.
        faces[:, 0:14:2] *= width / small.shape[1]
        faces[:, 1:14:2] *= height / small.shape[0]
    return faces

def feature(app, image, faces=_UNSET_FACES):
    if faces is _UNSET_FACES:
        faces = detect_faces(app, image)
    if faces is None or len(faces) != 1:
        logger.warning("Face detection rejected: image=%sx%s, faceCount=%s",
                       image.shape[1], image.shape[0], 0 if faces is None else len(faces))
        raise HTTPException(422, "Chưa tìm được khuôn mặt. Đưa mặt vào giữa khung và tránh ngược sáng."
                            if faces is None else "Camera nhận nhiều khuôn mặt. Chỉ giữ một người trong khung.")
    if min(faces[0][2:4]) < 40:
        raise HTTPException(422, "Face is too small; photograph the document more closely")
    recognizer = app.state.recognizer
    aligned = recognizer.alignCrop(image, faces[0])
    return recognizer.feature(aligned)

# The worker is private: browser traffic always goes through authenticated BE.
def locked(operation, *args):
    if not LOCK.acquire(blocking=False): raise HTTPException(429, "Busy")
    try: return operation(*args)
    finally: LOCK.release()

@app.post("/sessions")
async def begin():
    from liveness import start
    from starlette.concurrency import run_in_threadpool
    return await run_in_threadpool(locked, start)

@app.delete("/sessions/{sid}")
async def cancel(sid: str):
    from liveness import SESSIONS
    from starlette.concurrency import run_in_threadpool
    await run_in_threadpool(locked, lambda: SESSIONS.pop(sid, None))
    return {"cancelled": True}

@app.post("/sessions/{sid}/frame")
async def scan(request: Request, sid: str):
    from liveness import frame
    from starlette.concurrency import run_in_threadpool
    async with request.form(max_files=1, max_fields=0, max_part_size=MAX_IMAGE) as form:
        if set(form.keys()) != {"face"}: raise HTTPException(422, "Expected face")
        upload = form["face"]
        if getattr(upload, "content_type", None) != "image/jpeg": raise HTTPException(422, "JPEG required")
        raw = await upload.read(MAX_IMAGE + 1)
    return await run_in_threadpool(locked, frame, request.app, sid, raw, decode, feature)

@app.post("/sessions/{sid}/selfie")
async def take_selfie(request: Request, sid: str):
    from liveness import capture_selfie
    from starlette.concurrency import run_in_threadpool
    async with request.form(max_files=1, max_fields=0, max_part_size=MAX_IMAGE) as form:
        if set(form.keys()) != {"selfie"}: raise HTTPException(422, "Expected selfie")
        upload = form["selfie"]
        if getattr(upload, "content_type", None) != "image/jpeg": raise HTTPException(422, "JPEG required")
        raw = await upload.read(MAX_IMAGE + 1)
    return await run_in_threadpool(locked, capture_selfie, request.app, sid, raw, decode, feature, THRESHOLD)

@app.post("/sessions/{sid}/finish")
async def finalize(request: Request, sid: str):
    from liveness import finish
    from starlette.concurrency import run_in_threadpool
    async with request.form(max_files=2, max_fields=0, max_part_size=MAX_IMAGE) as form:
        if set(form.keys()) != {"front", "back"}: raise HTTPException(422, "Expected front and back")
        data=[]
        for name in ("front", "back"):
            upload=form[name]
            if getattr(upload, "content_type", None) != "image/jpeg": raise HTTPException(422, "JPEG required")
            data.append(await upload.read(MAX_IMAGE + 1))
    return await run_in_threadpool(locked, finish, request.app, sid, *data, decode, feature, THRESHOLD)

@app.post("/checkpoints/{operation}")
async def checkpoint_operation(request: Request, operation: str):
    from checkpoints import MAX_CHECKPOINT, selfie, document, finish
    from starlette.concurrency import run_in_threadpool
    expected = {"selfie": {"checkpoint", "selfie"}, "front": {"checkpoint", "front"},
                "back": {"checkpoint", "back"}, "finish": {"checkpoint", "front", "back"}}
    if operation not in expected: raise HTTPException(404, "Unknown operation")
    async with request.form(max_files=3, max_fields=0, max_part_size=MAX_CHECKPOINT) as form:
        if set(form.keys()) != expected[operation]: raise HTTPException(422, "Missing evidence")
        token = await form['checkpoint'].read(MAX_CHECKPOINT+1)
        images = {}
        for name in expected[operation]-{'checkpoint'}:
            upload = form[name]
            if getattr(upload, 'content_type', None) != 'image/jpeg': raise HTTPException(422, 'JPEG required')
            images[name] = await upload.read(MAX_IMAGE+1)
            if len(images[name]) > MAX_IMAGE: raise HTTPException(413, 'Image too large')
    if operation == 'selfie':
        return await run_in_threadpool(locked, selfie, request.app, token, images['selfie'], decode, feature, THRESHOLD)
    if operation == 'finish':
        return await run_in_threadpool(locked, finish, token, images['front'], images['back'], THRESHOLD)
    return await run_in_threadpool(locked, document, request.app, token, operation, images[operation], decode, feature, THRESHOLD)
