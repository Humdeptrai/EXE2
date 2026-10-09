FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-vie libgl1 libgles2 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir -r requirements.txt
COPY vendor ./vendor
COPY download_models.py .
RUN python download_models.py
COPY app.py liveness.py document_checks.py ./
RUN useradd --uid 10001 --create-home worker
USER worker
EXPOSE 8091
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8091} --workers 1 --no-access-log"]
