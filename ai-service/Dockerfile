# AI Service - Face Recognition + RAG Chatbot
FROM python:3.11-slim

WORKDIR /app

# System deps for opencv / image processing + curl for healthcheck + su-exec for entrypoint
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

# Install all dependencies from PyPI
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY config.py .
COPY app.py .
COPY main.py .
COPY face/ ./face/
COPY chat/ ./chat/
COPY agent/ ./agent/

EXPOSE 8001

# Non-root user for security
RUN useradd -r -m -s /bin/false appuser && chown -R appuser:appuser /app

# Entrypoint: fix volume permissions (chroma_data may be owned by root from old container)
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
