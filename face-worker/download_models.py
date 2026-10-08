"""Download pinned official OpenCV Zoo models, verify Git LFS SHA-256, keep licenses."""
import hashlib
from pathlib import Path
import re
import urllib.request

REV = "47534e27c9851bb1128ccc0102f1145e27f23f98"
ROOT = Path(__file__).resolve().parent / "models"
ROOT.mkdir(exist_ok=True)
for folder, filename, target in [
    ("face_detection_yunet", "face_detection_yunet_2023mar.onnx", "yunet.onnx"),
    ("face_recognition_sface", "face_recognition_sface_2021dec.onnx", "sface.onnx"),
]:
    path = f"models/{folder}/{filename}"
    raw = f"https://raw.githubusercontent.com/opencv/opencv_zoo/{REV}/"
    pointer = urllib.request.urlopen(raw + path, timeout=60).read().decode()
    expected = re.search(r"oid sha256:([a-f0-9]{64})", pointer).group(1)
    dest = ROOT / target
    if not dest.exists() or hashlib.sha256(dest.read_bytes()).hexdigest() != expected:
        temp = dest.with_suffix(".tmp")
        try:
            with urllib.request.urlopen(f"https://media.githubusercontent.com/media/opencv/opencv_zoo/{REV}/{path}", timeout=120) as src, temp.open("wb") as out:
                while chunk := src.read(1024 * 1024):
                    out.write(chunk)
            if hashlib.sha256(temp.read_bytes()).hexdigest() != expected:
                raise RuntimeError("Model checksum mismatch")
            temp.replace(dest)
        finally:
            temp.unlink(missing_ok=True)
    (ROOT / (folder + "_LICENSE")).write_bytes(urllib.request.urlopen(raw + f"models/{folder}/LICENSE", timeout=60).read())
    print(target, expected)
