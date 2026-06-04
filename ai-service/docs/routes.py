"""Document upload and processing routes."""

import os
import hashlib
from pathlib import Path
from typing import Annotated, List, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/docs")

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".csv"}


class UploadResponse(BaseModel):
    filename: str
    file_size: int
    chunks_count: int
    file_id: str
    message: str


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: Annotated[UploadFile, File(description="Business document (PDF, DOCX, Excel, CSV)")],
):
    """Upload a business document for record creation."""
    from doc_processing.extractors import extract_text

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Loại file không hỗ trợ: {ext}")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = f"{hashlib.md5((file.filename or 'unknown').encode()).hexdigest()}{ext}"
    save_path = UPLOAD_DIR / safe_name

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File quá lớn (tối đa 50MB)")

    save_path.write_bytes(content)

    # Extract text for later use (stored on disk, not indexed into RAG)
    try:
        raw_text = extract_text(str(save_path))
    except Exception as e:
        raise HTTPException(422, f"Lỗi xử lý file: {str(e)}")

    file_id = safe_name.replace(ext, "")
    return UploadResponse(
        filename=file.filename or "",
        file_size=len(content),
        chunks_count=0,  # No RAG indexing
        file_id=file_id,
        message=f"Đã upload thành công '{file.filename}'"
    )


@router.get("/extract/{file_id}")
async def extract_file_data(
    file_id: str,
    action: Optional[str] = Query(None, description="Action to perform"),
):
    """Extract structured data from uploaded file for action execution."""
    from doc_processing.extractors import extract_text
    from doc_processing.actions import get_entity_info

    # Find the file
    upload_dir = UPLOAD_DIR
    for ext in ALLOWED_EXTENSIONS:
        file_path = upload_dir / f"{file_id}{ext}"
        if file_path.exists():
            break
    else:
        raise HTTPException(404, "File không tồn tại")

    raw_text = extract_text(str(file_path))

    if action:
        entity_info = get_entity_info(action)
        if entity_info:
            return {
                "raw_text": raw_text[:3000],  # Limit for LLM context
                "action": action,
                "required_fields": entity_info["required_fields"],
                "tool": entity_info["tool"],
            }

    return {"raw_text": raw_text[:3000], "action": None}
