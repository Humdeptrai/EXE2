"""Photo references stay distinct from live-scan evidence. Synthetic data only."""
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import sys
import unittest
import importlib.util
import numpy as np
from fastapi import HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import checkpoints


class PhotoReferenceTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict('os.environ', {'FACE_COMPARE_SHARED_KEY': 'synthetic-shared-key-for-tests-000000'})
        self.env.start(); self.addCleanup(self.env.stop)
        pattern = (np.indices((480, 640)).sum(axis=0) // 8 % 2 * 120 + 80).astype(np.uint8)
        self.image = np.repeat(pattern[:, :, None], 3, axis=2)
        self.feature = lambda *args: np.ones((1, 128), np.float32)
        self.decode = lambda *args, **kwargs: self.image.copy()

    def reference(self):
        return checkpoints.photo_reference(None, b'synthetic', self.decode, self.feature)['checkpoint']

    def test_photo_does_not_fabricate_motion_or_pad_scores(self):
        state = checkpoints.unseal(self.reference().encode())
        self.assertEqual(state['source'], 'PHOTO_UPLOAD')
        self.assertEqual(state['total'], 0)
        self.assertEqual(state['pad'], [])
        self.assertIsNone(state['selfie'])
        self.assertNotIn('motionPassed', state)

    def test_photo_cannot_finish_automatic_verification(self):
        with self.assertRaises(HTTPException) as error:
            checkpoints.finish(self.reference().encode(), b'front', b'back', .32)
        self.assertEqual(error.exception.status_code, 422)

    def test_selfie_still_requires_actual_matching_and_pad(self):
        # Load real selfie validation without downloading model runtimes. Only
        # pose/PAD inference is mocked; evidence checks and comparisons are real.
        spec = importlib.util.spec_from_file_location('liveness', Path(__file__).resolve().parents[1] / 'liveness.py')
        live = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {'mediapipe': SimpleNamespace(), 'torch': SimpleNamespace(),
                'vendor.MiniFASNet': SimpleNamespace(MiniFASNetV2=object, MiniFASNetV1SE=object)}):
            spec.loader.exec_module(live)
        token = self.reference().encode()
        app = SimpleNamespace(state=SimpleNamespace(
            detect_faces=lambda image: np.array([[80, 60, 320, 320]], np.float32),
            recognizer=SimpleNamespace(match=lambda *args: .9)))
        with patch.dict(sys.modules, {'liveness': live}), patch.object(live, 'pose', return_value=(0, 0, 0)), patch.object(live, 'pad', return_value=.95):
            response = checkpoints.selfie(app, token, b'selfie', self.decode, self.feature, .32)
        state = checkpoints.unseal(response['checkpoint'].encode())
        self.assertTrue(response['accepted']); self.assertEqual(state['pad'], [])
        self.assertEqual(state['total'], 0); self.assertEqual(state['selfiePad'], .95)
        with patch.dict(sys.modules, {'liveness': live}), patch.object(live, 'pose', return_value=(0, 0, 0)), patch.object(live, 'pad', return_value=.1):
            with self.assertRaises(HTTPException):
                checkpoints.selfie(app, token, b'bad-selfie', self.decode, self.feature, .32)
        live.SESSIONS['incomplete'] = dict(index=6, steps=['CENTER']*6, pad=[], expires=10**20)
        with self.assertRaises(HTTPException):
            live.capture_selfie(app, 'incomplete', b'selfie', self.decode, self.feature, .32)

    def test_live_checkpoint_rules_and_signature_remain_required(self):
        photo = checkpoints.unseal(self.reference().encode())
        photo['source'] = 'LIVE_SCAN'
        with self.assertRaises(HTTPException): checkpoints.unseal(checkpoints.seal(photo).encode())
        photo['total'] = 6; photo['pad'] = [.9]*6
        self.assertEqual(checkpoints.unseal(checkpoints.seal(photo).encode())['total'], 6)
        photo['source'] = 'PHOTO_UPLOAD'
        with self.assertRaises(HTTPException): checkpoints.unseal(checkpoints.seal(photo).encode())
        damaged = self.reference()[:-1] + 'x'
        with self.assertRaises(HTTPException): checkpoints.unseal(damaged.encode())


if __name__ == '__main__': unittest.main()
