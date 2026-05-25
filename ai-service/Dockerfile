# AI Service - Face Recognition + RAG Chatbot
FROM python:3.11-slim

WORKDIR /app

# System deps for opencv / image processing + curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

# Copy pre-downloaded heavy wheels (tránh network timeout khi build)
COPY wheels/ /tmp/wheels/

# Install torch + tensorflow từ local wheels (deps nhỏ lấy từ PyPI)
RUN pip install --no-cache-dir --find-links=/tmp/wheels \
    "torch>=2.0.0" "tensorflow>=2.13.0,<2.18.0" tf-keras

# Install các deps còn lại
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Cleanup wheels
RUN rm -rf /tmp/wheels

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
USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
