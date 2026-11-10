# Face worker

## Back CCCD capture thresholds

Back images require a minimum Laplacian sharpness of 25 (previously 35),
450x280 pixels (previously 500x300), and mean OCR confidence of 25 (previously
35). The pixel limits apply both to detected cards and the existing full-photo
fallback. Front thresholds, lighting limits, semantic field requirements, MRZ
checks, front/back number comparison and face/PAD checks are unchanged.

Only redeploy the worker for this threshold adjustment; no BE/FE change or
database migration is required. Run `python -m unittest discover -s tests -v`
from this directory for synthetic regressions. Real capture acceptance rates
still need validation on representative phone photos; these tests do not
measure OCR accuracy on actual CCCD images.

## Separate face and document processing

A single worker process now has one face/model lock and one document/OCR slot.
Scan frames, selfie and embedding extraction use the face lane. Document image
quality, Tesseract OCR and saved-name refresh use the document lane. Document
face comparison acquires the face lock only for its short model operation, with
a bounded 5-second wait. Other face requests receive 429 when inference is busy;
a second document request receives 429 instead of building an unbounded queue.

The legacy session finish endpoint snapshots its session under the face lock,
releases it for OCR, and checks the session/evidence again before caching a result.
The BE client also limits face requests and document requests independently.
Model thresholds, motion, PAD, checkpoint signatures, image digests and the current
manual ADMIN review policy are unchanged. CPU/RAM remain shared; this is not a
measured capacity increase and does not promise fully parallel CPU throughput.

Deploy worker, BE and FE for this phase. No new environment variables, extra
service, SQL migration or model download is required. Keep one Uvicorn process
because live session storage is still in memory.
