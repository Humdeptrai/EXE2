# Face worker

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
