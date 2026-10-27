"""Synthetic document framing regressions; no identity images or model downloads.

Run: python -m unittest discover -s face-worker/tests -v
These checks exercise image quality and OCR policy, not document authenticity.
"""
from pathlib import Path
import sys
import unittest

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from document_checks import card_image, document_fields


def photograph(frame=(1600, 1000), card=(640, 405), rotation=0):
    height, width = frame
    card_width, card_height = card
    image = np.full((height, width, 3), 70, np.uint8)
    x, y = (width-card_width)//2, (height-card_height)//2
    cv2.rectangle(image, (x, y), (x+card_width, y+card_height), (180, 205, 185), -1)
    for row in range(12):
        cv2.putText(image, 'SYNTHETIC DOCUMENT TEST', (x+30, y+35+row*28),
                    cv2.FONT_HERSHEY_SIMPLEX, .5, (35, 35, 35), 1, cv2.LINE_AA)
    if rotation:
        matrix = cv2.getRotationMatrix2D((width/2, height/2), rotation, 1)
        image = cv2.warpAffine(image, matrix, (width, height), borderValue=(70, 70, 70))
    return image


class CardFramingTests(unittest.TestCase):
    def assert_quality(self, image, passed, reason=None):
        card, quality = card_image(image)
        self.assertEqual(quality['passed'], passed, quality)
        self.assertEqual(card is not None, passed)
        if reason:
            self.assertEqual(quality['reason'], reason)
        return card

    def test_readable_card_in_portrait_photo(self):
        card = self.assert_quality(photograph(), True)
        # The returned crop must contain the card, not the entire photo.
        self.assertGreaterEqual(card.shape[1], 550)
        self.assertLess(card.shape[0], 450)
        self.assertLess(card.shape[1], 700)

    def test_readable_card_in_landscape_photo(self):
        self.assert_quality(photograph(frame=(1000, 1600)), True)

    def test_tilted_card_in_portrait_photo(self):
        for angle in (-9, 9):
            with self.subTest(angle=angle):
                self.assert_quality(photograph(rotation=angle), True)

    def test_close_photo_still_passes(self):
        self.assert_quality(photograph(frame=(900, 1200)), True)

    def test_jpeg_photo_still_passes(self):
        _, encoded = cv2.imencode('.jpg', photograph(), [cv2.IMWRITE_JPEG_QUALITY, 80])
        self.assert_quality(cv2.imdecode(encoded, cv2.IMREAD_COLOR), True)

    def test_card_too_small_in_pixels_is_rejected(self):
        self.assert_quality(photograph(frame=(700, 850), card=(500, 316)), False, 'TOO_SMALL')

    def test_blur_is_rejected(self):
        image = cv2.GaussianBlur(photograph(), (31, 31), 10)
        self.assert_quality(image, False, 'BLUR')

    def test_blank_background_is_rejected(self):
        self.assert_quality(np.full((1600, 1000, 3), 180, np.uint8), False, 'CARD_FRAME')

    def test_noise_is_not_a_card(self):
        image = np.random.default_rng(19).integers(0, 256, (1600, 1000, 3), dtype=np.uint8)
        self.assert_quality(image, False)

    def test_square_is_not_a_card(self):
        self.assert_quality(photograph(card=(640, 640)), False, 'CARD_FRAME')

    def test_readable_card_still_needs_ocr_evidence(self):
        self.assert_quality(photograph(), True)
        fields = document_fields('', 'SYNTHETIC DOCUMENT TEST\n' * 12, 0, 99)
        self.assertFalse(fields['backReadable'])
        self.assertFalse(fields['frontReadable'])

    def test_back_ocr_confidence_is_unchanged(self):
        text = 'Dac diem nhan dang / Personal identification: synthetic\nNgay cap / Date of issue: 01/01/2021'
        self.assertFalse(document_fields('', text, 0, 44)['backReadable'])
        self.assertTrue(document_fields('', text, 0, 45)['backReadable'])


if __name__ == '__main__':
    unittest.main()
