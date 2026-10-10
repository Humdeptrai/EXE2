"""Image quality and OCR checks for app verification, not document authenticity."""
import csv
import io
import os
import re
import subprocess
import unicodedata

import cv2
import numpy as np


def plain(text):
    return ' '.join(''.join(c for c in unicodedata.normalize('NFD', text.upper().replace('Đ', 'D'))
                           if unicodedata.category(c) != 'Mn').split())


def card_image(image):
    """Require four visible card edges and rectify the largest plausible ID card."""
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 40, 120)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:25]:
        if cv2.contourArea(contour) < width * height * .20:
            continue
        points = cv2.approxPolyDP(contour, .02 * cv2.arcLength(contour, True), True)
        if len(points) != 4 or not cv2.isContourConvex(points):
            continue
        points = points.reshape(4, 2).astype(np.float32)
        # Leave a margin: touching image borders can mean a cropped document.
        if (points[:, 0].min() < 3 or points[:, 1].min() < 3
                or points[:, 0].max() > width - 4 or points[:, 1].max() > height - 4):
            continue
        # Sort around the centroid, then rotate to the top-left corner.
        center = points.mean(axis=0)
        points = points[np.argsort(np.arctan2(points[:, 1] - center[1], points[:, 0] - center[0]))]
        points = np.roll(points, -int(np.argmin(points.sum(axis=1))), axis=0)
        tl, tr, br, bl = points
        card_width = max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl))
        card_height = max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr))
        if card_height > card_width:
            points = np.roll(points, -1, axis=0)
            card_width, card_height = card_height, card_width
        if not 1.35 <= card_width / max(card_height, 1) <= 1.90:
            continue
        if card_width < 550 or card_height < 320:
            return None, dict(passed=False, reason='TOO_SMALL')
        target = np.array([[0, 0], [int(card_width)-1, 0], [int(card_width)-1, int(card_height)-1],
                           [0, int(card_height)-1]], np.float32)
        card = cv2.warpPerspective(image, cv2.getPerspectiveTransform(points, target),
                                   (int(card_width), int(card_height)))
        detail = cv2.cvtColor(cv2.resize(card, (850, 540)), cv2.COLOR_BGR2GRAY)
        sharpness = float(cv2.Laplacian(detail, cv2.CV_64F).var())
        brightness = float(detail.mean())
        white = float(np.mean(detail >= 250))
        if sharpness < 55:
            return None, dict(passed=False, reason='BLUR', sharpness=sharpness)
        if brightness < 55 or brightness > 240 or white > .60:
            return None, dict(passed=False, reason='LIGHTING', brightness=brightness)
        return card, dict(passed=True, reason='OK', sharpness=sharpness, brightness=brightness)
    return None, dict(passed=False, reason='CARD_FRAME')


def read_card(image):
    _, jpeg = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 95])
    result = subprocess.run(['tesseract', 'stdin', 'stdout', '-l', 'vie+eng', '--psm', '6', 'tsv'],
                            input=jpeg.tobytes(), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                            timeout=45, check=True, env={**os.environ, "OMP_THREAD_LIMIT": "1"})
    lines = {}
    confidences = []
    for row in csv.DictReader(io.StringIO(result.stdout.decode('utf-8', errors='replace')), delimiter='\t'):
        word = (row.get('text') or '').strip()
        try:
            confidence = float(row.get('conf', '-1'))
        except ValueError:
            continue
        if not word or confidence < 0:
            continue
        key = (row.get('block_num'), row.get('par_num'), row.get('line_num'))
        lines.setdefault(key, []).append(word)
        if len(word) >= 2:
            confidences.append(confidence)
    return '\n'.join(' '.join(words) for words in lines.values())[:8000], float(np.mean(confidences)) if confidences else 0.0


def extract_name(text):
    lines = text.splitlines()
    for index, line in enumerate(lines):
        normalized = plain(line)
        if not any(label in normalized for label in ('HO VA TEN', 'FULL NAME')):
            continue
        # Prefer the label's own value; allow bilingual labels before the name.
        colon_value = line.rsplit(':', 1)[-1].strip() if ':' in line else ''
        for candidate in [colon_value] + lines[index+1:index+3]:
            candidate = candidate.strip(' :')
            normalized_candidate = plain(candidate)
            if any(label in normalized_candidate for label in ('NGAY SINH', 'DATE OF', 'GIOI TINH', 'QUOC TICH', 'SEX', 'NATIONALITY', 'QUE QUAN', 'NOI CU TRU')):
                break
            if (2 <= len(candidate) <= 100 and len(candidate.split()) >= 2
                    and all(c.isalpha() or c in " .'-" for c in candidate)
                    and not any(label in normalized_candidate for label in
                                ('HO VA TEN', 'FULL NAME', 'NGAY SINH', 'DATE OF', 'GIOI TINH', 'QUOC TICH'))):
                return candidate
    return ''


def document_fields(front_text, back_text, front_confidence, back_confidence):
    numbers = set(re.sub(r'\s', '', x) for x in re.findall(r'(?<!\d)(?:\d[ \t]*){12}(?![ \t]*\d)', front_text))
    front = plain(front_text)
    back = plain(back_text)
    front_ok = (len(numbers) == 1 and len(front_text) >= 60 and front_confidence >= 45
                and any(marker in front for marker in ('CAN CUOC', 'CONG DAN', 'IDENTITY')))
    back_markers = ('DAN TOC', 'TON GIAO', 'DAC DIEM', 'NGAY CAP', 'DATE OF ISSUE',
                    'CO QUAN', 'BO CONG AN', 'MINISTRY', 'NOI CU TRU', 'PLACE OF RESIDENCE', 'NOI SINH')
    back_ok = (len(back_text) >= 50 and back_confidence >= 45
               and sum(marker in back for marker in back_markers) >= 2)
    return dict(frontReadable=front_ok, backReadable=back_ok,
                documentNumber=next(iter(numbers)) if len(numbers) == 1 else '', fullName=extract_name(front_text))
