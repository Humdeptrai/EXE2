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


def _line_quadrilaterals(gray):
    """Join four supported straight sides when shadows break a closed contour."""
    height, width = gray.shape
    detected = cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD).detect(gray)[0]
    if detected is None:
        return []
    lines = []
    for raw in detected.reshape(-1, 4):
        start, end = raw[:2], raw[2:]
        length = float(np.linalg.norm(end - start))
        if length >= min(width, height) * .25:
            lines.append((start, end, (end - start) / length, length))
    lines = sorted(lines, key=lambda line: line[3], reverse=True)[:40]
    pairs = []
    for i, first in enumerate(lines):
        for second in lines[i+1:]:
            if abs(float(np.dot(first[2], second[2]))) < .97:
                continue
            delta = second[0] - first[0]
            separation = abs(float(first[2][0] * delta[1] - first[2][1] * delta[0]))
            if separation < min(width, height) * .2:
                continue
            pairs.append((first, second))
    pairs.sort(key=lambda pair: pair[0][3] + pair[1][3], reverse=True)
    pairs = pairs[:60]
    edges = cv2.dilate(cv2.Canny(gray, 30, 100), np.ones((5, 5), np.uint8))
    candidates = []
    def crossing(a, b):
        matrix = np.column_stack((a[2], -b[2]))
        if abs(float(np.linalg.det(matrix))) < .1:
            return None
        distance = np.linalg.solve(matrix, b[0] - a[0])[0]
        return a[0] + distance * a[2]
    for i, horizontal in enumerate(pairs):
        for vertical in pairs[i+1:]:
            if abs(float(np.dot(horizontal[0][2], vertical[0][2]))) > .25:
                continue
            corners = [crossing(horizontal[0], vertical[0]), crossing(horizontal[0], vertical[1]),
                       crossing(horizontal[1], vertical[1]), crossing(horizontal[1], vertical[0])]
            if any(point is None for point in corners):
                continue
            points = np.asarray(corners, np.float32)
            if (points[:, 0].min() < 1 or points[:, 1].min() < 1
                    or points[:, 0].max() > width - 2 or points[:, 1].max() > height - 2
                    or not cv2.isContourConvex(points) or cv2.contourArea(points) < width * height * .2):
                continue
            supported = True
            for start, end in zip(points, np.roll(points, -1, axis=0)):
                samples = start + np.linspace(.1, .9, 60)[:, None] * (end - start)
                pixels = np.rint(samples).astype(int)
                if float(np.mean(edges[pixels[:, 1], pixels[:, 0]] > 0)) < .65:
                    supported = False
                    break
            if supported:
                candidates.append(points)
    return candidates


def _card_candidates(image):
    """Find bounded quadrilaterals; rounded cards may need colour boundaries."""
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
    # Wood grain/shadows can break a Canny perimeter. Independent colour
    # channels separate a light card from its background without relying on
    # the capture overlay (uploads use the same detector).
    small = cv2.resize(image, (detection.shape[1], detection.shape[0]), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(small, cv2.COLOR_BGR2LAB)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    for channel in (lab[:, :, 0], lab[:, :, 1], lab[:, :, 2], hsv[:, :, 1]):
        _, mask = cv2.threshold(cv2.GaussianBlur(channel, (5, 5), 0), 0, 255,
                                cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        for region in (mask, cv2.bitwise_not(mask)):
            region = cv2.morphologyEx(region, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
            found, _ = cv2.findContours(region, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            contours.extend(contour.astype(np.float32) / scale for contour in found)
    contours.extend(points / scale for points in _line_quadrilaterals(detection))
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:120]:
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
            # A nearly rectangular convex region can have >4 vertices solely
            # because the card corners are rounded. Never fit arbitrary blobs.
            rectangle = cv2.minAreaRect(hull)
            area = rectangle[1][0] * rectangle[1][1]
            if area <= 0 or cv2.contourArea(hull) / area < .92 or cv2.contourArea(contour) / area < .85:
                continue
            points = cv2.boxPoints(rectangle)
        points = points.reshape(4, 2).astype(np.float32)
        # Keep all fitted corners inside the image; a narrow but visible
        # border is valid too. Do not demand a fixed capture-overlay margin.
        if (points[:, 0].min() < 1 or points[:, 1].min() < 1
                or points[:, 0].max() > width - 2 or points[:, 1].max() > height - 2):
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
        yield points, card_width, card_height


def card_image(image):
    """Rectify a visible card, then enforce original resolution and quality."""
    too_small = False
    quality_failure = None
    for points, card_width, card_height in _card_candidates(image):
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
    bounds = {}
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
        left, top, width, height = (int(row.get(field) or 0) for field in ('left', 'top', 'width', 'height'))
        if key not in bounds:
            bounds[key] = [left, top, left + width, top + height]
        else:
            box = bounds[key]
            bounds[key] = [min(box[0], left), min(box[1], top), max(box[2], left + width), max(box[3], top + height)]
        if len(word) >= 2:
            confidences.append(confidence)
    # PSM 11 can emit each part of a name as a separate block. Reconstruct
    # visual rows from bounding boxes, not Tesseract's arbitrary block order.
    rows = []
    for key in sorted(lines, key=lambda key: (bounds[key][1], bounds[key][0])):
        box = bounds[key]
        center = (box[1] + box[3]) / 2
        height = max(1, box[3] - box[1])
        target = next((row for row in reversed(rows)
                       if abs(row['center'] - center) <= .45 * min(row['height'], height)), None)
        if target is None:
            target = dict(center=center, height=height, pieces=[])
            rows.append(target)
        target['pieces'].append((box[0], ' '.join(lines[key])))
    text = '\n'.join(' '.join(value for _, value in sorted(row['pieces']))
                     for row in sorted(rows, key=lambda row: row['center']))
    return text[:8000], float(np.mean(confidences)) if confidences else 0.0


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
    best_rank = (-1, -1, -1.0)
    best_rotated = False
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
        fields = document_fields(text if side == 'front' else '', text if side == 'back' else '',
                                 confidence if side == 'front' else 0, confidence if side == 'back' else 0)
        readable = fields.get(str(side) + 'Readable', confidence >= 45 and len(text) >= 60)
        # A pass that reads the number but misses the name must not prevent a
        # later layout from extracting a complete front document.
        has_name = bool(fields['fullName']) if side == 'front' else True
        rank = (int(readable), int(has_name), confidence)
        if rank > best_rank:
            best, best_rank, best_rotated = (text, confidence), rank, rotated
        if readable and has_name:
            if rotated:
                image[:] = cv2.rotate(image, cv2.ROTATE_180)
            return text, confidence
    if not completed and last_timeout is not None:
        raise last_timeout
    if not best[0]:
        # No recognized characters is a readable-image failure, not a service outage.
        return '', 0.0
    if best_rotated:
        image[:] = cv2.rotate(image, cv2.ROTATE_180)
    return best


def _unaccent(text):
    # Keep character offsets after NFC normalization; plain() collapses spaces.
    return ''.join(c for c in unicodedata.normalize('NFD', text.upper().replace('Đ', 'D'))
                   if unicodedata.category(c) != 'Mn')


_NAME_LABEL = re.compile(
    r"(?:HO\s+(?:VA\s+)?TEN|HO\s*,?\s*CHU\s+DEM\s+VA\s+TEN(?:\s+KHAI\s+SINH)?|FULL\s*NAME)")
_NAME_STOPS = re.compile(
    r"\b(?:NGAY SINH|DATE OF|GIOI TINH|QUOC TICH|SEX|NATIONALITY|QUE QUAN|NOI CU TRU|"
    r"NOI SINH|PLACE OF|CO GIA TRI|CAN CUOC|CONG DAN|IDENTITY|PERSONAL IDENTIFICATION|"
    r"SOCIALIST|CONG HOA|DOC LAP|FREEDOM|SO\s*:|NO\s*:)\b")


def _name_value(value):
    value = unicodedata.normalize('NFC', value).strip(" :/|;.,")
    while True:
        label = _NAME_LABEL.match(_unaccent(value))
        if not label:
            break
        value = value[label.end():].strip(" :/|;.,")
    stop = _NAME_STOPS.search(_unaccent(value))
    if stop:
        value = value[:stop.start()].strip(" :/|;.,")
    value = ' '.join(value.split())
    if (2 <= len(value) <= 100 and len(value.split()) >= 2
            and all(c.isalpha() or c in " .'-" for c in value)
            and not _NAME_LABEL.search(_unaccent(value))):
        return value
    return ''


def extract_name(text):
    lines = [unicodedata.normalize('NFC', line).strip() for line in text.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        label = _NAME_LABEL.search(_unaccent(line))
        if not label:
            continue
        values = []
        tail = line[label.end():]
        value = _name_value(tail)
        if value:
            values.append(value)
        elif tail.strip(" :/|;.,").isalpha() and not _NAME_LABEL.search(_unaccent(tail)):
            values.append(tail.strip(" :/|;.,"))
        if _NAME_STOPS.search(_unaccent(tail)):
            return ' '.join(values)
        for following in lines[index+1:index+5]:
            # Only collect letters inside the labelled name field, ending at
            # the next field. Do not invent a name from account/profile data.
            normalized = _unaccent(following)
            candidate = _name_value(following)
            if candidate:
                values.append(candidate)
            elif not _NAME_LABEL.search(normalized) and following.strip(" :/|;.,"):
                # Allow a wrapped single-word name segment, never digits.
                segment = following.strip(" :/|;.,")
                if segment.isalpha() and not _NAME_STOPS.search(normalized):
                    values.append(segment)
                elif values:
                    break
            if _NAME_STOPS.search(normalized):
                break
        name = _name_value(' '.join(values))
        if name:
            return name
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
