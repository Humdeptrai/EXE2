"""Image quality and OCR checks for app verification, not document authenticity."""
import csv
import io
import os
import re
import subprocess
import unicodedata
import time

import cv2
import numpy as np


def plain(text):
    return ' '.join(''.join(c for c in unicodedata.normalize('NFD', text.upper().replace('Đ', 'D'))
                           if unicodedata.category(c) != 'Mn').split())


def card_image(image):
    """Require four visible card edges and rectify the largest plausible ID card."""
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Detect boundaries at a bounded scale; map coordinates back to the original
    # pixels for OCR. Contrast enhancement helps light cards on light surfaces.
    scale = min(1.0, 1000 / max(width, height))
    detection = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    enhanced = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(detection)
    contours = []
    for source in (detection, enhanced):
        edges = cv2.Canny(cv2.GaussianBlur(source, (5, 5), 0), 40, 120)
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        found, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        contours.extend(contour.astype(np.float32) / scale for contour in found)
    too_small = False
    quality_failure = None
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:80]:
        if cv2.contourArea(contour) < width * height * .20:
            continue
        points = None
        hull = cv2.convexHull(contour)
        for epsilon in (.015, .025, .04):
            candidate = cv2.approxPolyDP(hull, epsilon * cv2.arcLength(hull, True), True)
            if len(candidate) == 4 and cv2.isContourConvex(candidate):
                points = candidate
                break
        if points is None:
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
            too_small = True
            continue
        target = np.array([[0, 0], [int(card_width)-1, 0], [int(card_width)-1, int(card_height)-1],
                           [0, int(card_height)-1]], np.float32)
        card = cv2.warpPerspective(image, cv2.getPerspectiveTransform(points, target),
                                   (int(card_width), int(card_height)))
        detail = cv2.cvtColor(cv2.resize(card, (850, 540)), cv2.COLOR_BGR2GRAY)
        sharpness = float(cv2.Laplacian(detail, cv2.CV_64F).var())
        brightness = float(detail.mean())
        white = float(np.mean(detail >= 250))
        if sharpness < 55:
            quality_failure = dict(passed=False, reason='BLUR', sharpness=sharpness)
            continue
        if brightness < 55 or brightness > 240 or white > .60:
            quality_failure = dict(passed=False, reason='LIGHTING', brightness=brightness)
            continue
        return card, dict(passed=True, reason='OK', sharpness=sharpness, brightness=brightness)
    return None, quality_failure or dict(passed=False, reason='TOO_SMALL' if too_small else 'CARD_FRAME')


def _ocr(image, psm, timeout):
    # PNG avoids an additional lossy JPEG pass over small document characters.
    _, encoded = cv2.imencode('.png', image)
    result = subprocess.run(['tesseract', 'stdin', 'stdout', '-l', 'vie+eng', '--psm', str(psm), 'tsv'],
                            input=encoded.tobytes(), stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                            timeout=timeout, check=True, env={**os.environ, "OMP_THREAD_LIMIT": "1"})
    lines, confidences = {}, []
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


def read_card(image, side=None):
    """Try sparse/bilingual layout before a block layout, with a shared time budget.

    Never concatenate guesses from different OCR passes: a candidate must satisfy
    the document policy on its own, including a unique 12-digit front number.
    """
    deadline = time.monotonic() + 45
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Bound OCR cost while preserving readable text; do not upscale tiny cards.
    scale = min(1.0, 1800 / max(gray.shape))
    gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    attempts = ((gray, 11, False), (gray, 6, False),
                (cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray), 11, False),
                (cv2.rotate(gray, cv2.ROTATE_180), 11, True))
    best = ('', 0.0)
    completed = 0
    last_timeout = None
    for candidate, psm, rotated in attempts:
        remaining = deadline - time.monotonic()
        if remaining <= 1:
            break
        try:
            text, confidence = _ocr(candidate, psm, min(10, remaining))
        except subprocess.TimeoutExpired as error:
            last_timeout = error
            continue
        completed += 1
        if confidence > best[1]:
            best = text, confidence
        if side in ('front', 'back'):
            fields = document_fields(text if side == 'front' else '', text if side == 'back' else '',
                                     confidence if side == 'front' else 0, confidence if side == 'back' else 0)
            if fields[side + 'Readable']:
                if rotated:
                    image[:] = cv2.rotate(image, cv2.ROTATE_180)
                return text, confidence
        elif confidence >= 45 and len(text) >= 60:
            return text, confidence
    if not completed and last_timeout is not None:
        raise last_timeout
    if not best[0]:
        # No recognized characters is a readable-image failure, not a service outage.
        return '', 0.0
    return best


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
    # Count distinct semantic fields, not overlapping synonyms of one heading.
    back_groups = (('DAN TOC',), ('TON GIAO',), ('DAC DIEM', 'PERSONAL IDENTIFICATION'),
                   ('NGAY CAP', 'DATE OF ISSUE'),
                   ('CO QUAN', 'BO CONG AN', 'MINISTRY', 'CUC CANH SAT', 'CUC TRUONG',
                    'CANH SAT QUAN LY', 'ISSUING AUTHORITY'),
                   ('NOI CU TRU', 'PLACE OF RESIDENCE'), ('NOI SINH',),
                   ('DATE OF EXPIRY', 'CO GIA TRI DEN'))
    back_ok = (len(back_text) >= 50 and back_confidence >= 45
               and sum(any(marker in back for marker in group) for group in back_groups) >= 2)
    return dict(frontReadable=front_ok, backReadable=back_ok,
                documentNumber=next(iter(numbers)) if len(numbers) == 1 else '', fullName=extract_name(front_text))
