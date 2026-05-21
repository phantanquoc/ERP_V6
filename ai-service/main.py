"""Entry point for ai-service."""

import uvicorn
from app import app  # noqa: F401 — uvicorn needs this import

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=False)
