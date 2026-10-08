FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY download_models.py .
RUN python download_models.py
COPY app.py .
RUN useradd --uid 10001 --create-home worker
USER worker
EXPOSE 8091
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8091} --workers 1 --no-access-log"]
