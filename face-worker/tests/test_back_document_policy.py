"""Back-only relaxed framing and OCR policy; all identity evidence is synthetic."""
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from document_checks import _image_quality, card_image, document_fields, read_card

TEXT = 'Personal identification: synthetic mark\nDate of issue: 01/01/2021'


def borderless_photo():
    image = np.full((540, 850, 3), 180, np.uint8)
    for row in range(10):
        cv2.putText(image, 'SYNTHETIC BACK DOCUMENT', (40, 50+40*row),
                    cv2.FONT_HERSHEY_SIMPLEX, .8, (40, 40, 40), 2, cv2.LINE_AA)
    return image


class BackPolicyTests(unittest.TestCase):
    def test_missing_border_tries_original_pixels_only_for_back(self):
        image = borderless_photo()
        with patch('document_checks._card_candidates', return_value=iter(())):
            card, quality = card_image(image, side='back')
        self.assertTrue(quality['passed'])
        self.assertFalse(quality['frameDetected'])
        np.testing.assert_array_equal(card, image)
        with patch('document_checks._card_candidates', return_value=iter(())):
            card, quality = card_image(image, side='front')
        self.assertIsNone(card)
        self.assertEqual(quality['reason'], 'CARD_FRAME')

    def test_blank_back_still_fails_quality(self):
        with patch('document_checks._card_candidates', return_value=iter(())):
            card, quality = card_image(np.full((540, 850, 3), 180, np.uint8), side='back')
        self.assertIsNone(card)
        self.assertEqual(quality['reason'], 'BLUR')

    def test_small_back_still_fails_quality(self):
        with patch('document_checks._card_candidates', return_value=iter(())):
            card, quality = card_image(cv2.resize(borderless_photo(), (400, 250)), side='back')
        self.assertIsNone(card)
        self.assertEqual(quality['reason'], 'TOO_SMALL')

    def test_smaller_readable_back_without_border(self):
        image = cv2.resize(borderless_photo(), (450, 280))
        with patch('document_checks._card_candidates', return_value=iter(())):
            card, quality = card_image(image, side='back')
        self.assertTrue(quality['passed'], quality)
        np.testing.assert_array_equal(card, image)
        for size in ((449, 280), (450, 279)):
            with self.subTest(size=size), patch('document_checks._card_candidates', return_value=iter(())):
                card, quality = card_image(cv2.resize(image, size), side='back')
            self.assertIsNone(card)
            self.assertEqual(quality['reason'], 'TOO_SMALL')

    def test_smaller_detected_card_is_accepted_only_for_back(self):
        image = cv2.resize(borderless_photo(), (450, 280))
        points = np.array([[0, 0], [449, 0], [449, 279], [0, 279]], np.float32)
        for side, passed in (('back', True), ('front', False)):
            with self.subTest(side=side), patch('document_checks._card_candidates',
                                               return_value=iter(((points, 450, 280),))):
                card, quality = card_image(image, side=side)
            self.assertEqual(quality['passed'], passed, quality)
            self.assertEqual(card is not None, passed)

    def test_lower_contrast_text_is_accepted_only_for_back(self):
        image = borderless_photo()
        sharpness = _image_quality(image, side='back')['sharpness']
        # Retain actual text pixels with Laplacian variance between 25 and 35.
        image = np.rint(180 + (image.astype(float) - 180) * (30 / sharpness)**.5).astype(np.uint8)
        quality = _image_quality(image, side='back')
        self.assertGreaterEqual(quality['sharpness'], 25)
        self.assertLess(quality['sharpness'], 35)
        self.assertTrue(quality['passed'])
        self.assertEqual(_image_quality(image, side='front')['reason'], 'BLUR')

    def test_overexposed_back_still_fails_quality(self):
        image = borderless_photo()
        image[:450] = 255
        with patch('document_checks._card_candidates', return_value=iter(())):
            card, quality = card_image(image, side='back')
        self.assertIsNone(card)
        self.assertIn(quality['reason'], ('BLUR', 'LIGHTING'))

    def test_no_ocr_markers_does_not_pass_back(self):
        self.assertFalse(document_fields('', 'unrelated text '*20, 0, 99)['backReadable'])

    def test_one_repeated_field_does_not_pass_back(self):
        self.assertFalse(document_fields('', 'Personal identification '*5, 0, 99)['backReadable'])

    def test_back_confidence_threshold(self):
        self.assertTrue(document_fields('', TEXT, 0, 25)['backReadable'])
        self.assertFalse(document_fields('', TEXT, 0, 24)['backReadable'])

    def test_fingerprint_label_with_issue_date(self):
        text = 'Ngon tro trai / Left index finger\nNgay, thang, nam: 01/01/2021'
        self.assertTrue(document_fields('', text, 0, 36)['backReadable'])

    def test_front_confidence_threshold_is_unchanged(self):
        text = 'CAN CUOC CONG DAN IDENTITY\n012345678901\nHo va ten: NGUYEN VAN A\nNgay sinh 01/01/2000'
        self.assertFalse(document_fields(text, '', 44, 0)['frontReadable'])
        self.assertTrue(document_fields(text, '', 45, 0)['frontReadable'])

    def test_read_card_uses_relaxed_back_policy(self):
        with patch('document_checks._ocr', return_value=(TEXT, 25)) as ocr:
            _, confidence = read_card(borderless_photo(), side='back')
        self.assertEqual(confidence, 25)
        self.assertEqual(ocr.call_count, 1)

    def test_checkpoint_fallback_still_rejects_number_mismatch(self):
        import checkpoints
        state = dict(selfie='synthetic', documents={'front': {'documentNumber': '012345678901'}})
        with patch.object(checkpoints, 'unseal', return_value=state), \
                patch.object(checkpoints, 'seal', return_value='synthetic-checkpoint'), \
                patch('document_checks._card_candidates', return_value=iter(())), \
                patch('document_checks.read_card', return_value=(TEXT+'\n098765432109', 36)):
            result = checkpoints.document(None, 'token', 'back', b'synthetic',
                                          lambda *a, **kw: borderless_photo(), None, .32)
        self.assertFalse(result['passed'])
        self.assertEqual(result['reasonCode'], 'DOCUMENT_NUMBER_MISMATCH')

    def test_checkpoint_fallback_accepts_readable_back(self):
        import checkpoints
        state = dict(selfie='synthetic', documents={'front': {'documentNumber': '012345678901'}})
        with patch.object(checkpoints, 'unseal', return_value=state), \
                patch.object(checkpoints, 'seal', return_value='synthetic-checkpoint'), \
                patch('document_checks._card_candidates', return_value=iter(())), \
                patch('document_checks.read_card', return_value=(TEXT+'\n012345678901', 36)):
            result = checkpoints.document(None, 'token', 'back', b'synthetic',
                                          lambda *a, **kw: borderless_photo(), None, .32)
        self.assertTrue(result['passed'])
        self.assertEqual(result['reasonCode'], 'OK')


if __name__ == '__main__':
    unittest.main()
