"""Bounded, separate lanes; model state and live sessions stay serialized."""
import threading
from contextlib import contextmanager

from fastapi import HTTPException

FACE_LOCK = threading.Lock()
OCR_SLOT = threading.BoundedSemaphore(1)


@contextmanager
def face_section(wait=False):
    # Document comparison holds this only for inference, never for OCR.
    acquired = FACE_LOCK.acquire(timeout=5) if wait else FACE_LOCK.acquire(blocking=False)
    if not acquired:
        raise HTTPException(429, "Face processing busy", headers={"Retry-After": "1"})
    try:
        yield
    finally:
        FACE_LOCK.release()


def face_work(operation, *args):
    with face_section():
        return operation(*args)


def document_work(operation, *args):
    # No unbounded image queue or extra OCR processes on a small instance.
    if not OCR_SLOT.acquire(blocking=False):
        raise HTTPException(429, "Document processing busy", headers={"Retry-After": "1"})
    try:
        return operation(*args)
    finally:
        OCR_SLOT.release()
