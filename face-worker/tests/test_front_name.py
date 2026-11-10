"""Synthetic name OCR regressions; never infer missing surname letters."""
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
import hashlib

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from document_checks import extract_name, read_front_name, _name_value


class FrontNameTests(unittest.TestCase):
    def test_labelled_vietnamese_name_is_uppercase_without_accents(self):
        self.assertEqual(extract_name('Họ và tên / Full name:\nTRỊNH ĐẠT HOÀNG\nNgày sinh: 01/01/2000'),
                         'TRINH DAT HOANG')

    def test_inline_and_wrapped_names_use_the_same_normalization(self):
        self.assertEqual(extract_name('Họ và tên: Đặng Văn An Ngày sinh: 01/01/2000'), 'DANG VAN AN')
        self.assertEqual(extract_name('Full name: ĐẶNG\nVĂN AN\nDate of birth: 01/01/2000'), 'DANG VAN AN')

    def test_damaged_initial_is_rejected_instead_of_guessed(self):
        self.assertEqual(_name_value("'RINH ĐẠT HOÀNG"), '')
        self.assertEqual(extract_name("Full name:\n'RINH ĐẠT HOÀNG\nDate of birth: 01/01/2000"), '')
        # A letter-only surname is not silently rewritten to a particular user.
        self.assertEqual(_name_value('RINH DAT HOANG'), 'RINH DAT HOANG')

    def test_wider_crop_preserves_name_initial_and_normalizes_ocr(self):
        image = np.full((540, 850, 3), 180, np.uint8)
        # Pixels between 20% and the former 27% crop boundary must reach OCR.
        image[:, int(850*.21):int(850*.25)] = 40
        rows = [{'text': 'Ho va ten / Full name', 'confidence': 90},
                {'text': 'TRỊNH ĐẠT HOÀNG', 'confidence': 85},
                {'text': 'Ngay sinh: 01/01/2000', 'confidence': 90}]
        with patch('document_checks._ocr', return_value=('', 85, rows)) as ocr:
            self.assertEqual(read_front_name(image), 'TRINH DAT HOANG')
        self.assertEqual(ocr.call_count, 3)
        self.assertLess(int(ocr.call_args_list[0].args[0].min()), 100)

    def test_damaged_crop_can_use_a_later_readable_pass(self):
        image = np.full((540, 850, 3), 180, np.uint8)
        def rows(name):
            return ('', 85, [{'text': 'Full name', 'confidence': 90}, {'text': name, 'confidence': 85}])
        with patch('document_checks._ocr', side_effect=[rows("'RINH ĐẠT HOÀNG"),
                                                       rows('TRỊNH ĐẠT HOÀNG'), rows('TRINH DAT HOANG')]):
            self.assertEqual(read_front_name(image), 'TRINH DAT HOANG')

    def test_finish_refreshes_legacy_name_from_saved_document_text(self):
        import checkpoints
        front, back = b'synthetic-front', b'synthetic-back'
        for previous in ('ĐẶNG VĂN AN', "'ANG VAN AN", None):
            with self.subTest(previous=previous):
                state = dict(selfie='synthetic-selfie', portrait='synthetic-face', selfieScore=.8, selfiePad=.9,
                             pad=[.9]*6, reference=[[0]*128], documents={
                    'front': dict(passed=True, digest=hashlib.sha256(front).hexdigest(), fullName=previous,
                                  text='Full name: ĐẶNG VĂN AN\nDate of birth: 01/01/2000', quality={'passed': True},
                                  documentNumber='012345678901', scanScore=.8, selfieScore=.8),
                    'back': dict(passed=True, digest=hashlib.sha256(back).hexdigest(), text='', quality={'passed': True})})
                with patch.object(checkpoints, 'unseal', return_value=state):
                    result = checkpoints.finish('synthetic', front, back, .32)
                self.assertEqual(result['fullName'], 'DANG VAN AN')
                self.assertEqual(result['decision'], 'MATCH')


if __name__ == '__main__':
    unittest.main()
