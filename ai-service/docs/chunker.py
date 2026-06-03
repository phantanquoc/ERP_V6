"""Chunk extracted text for RAG ingestion."""

import re
from typing import List


def chunk_for_rag(text: str, metadata: dict, filename: str) -> List[dict]:
    """Chunk text for RAG. Uses markdown headers if present, else paragraphs."""
    chunks = []
    if re.search(r"^#{1,4}\s", text, re.MULTILINE):
        chunks = _chunk_by_headers(text, metadata, filename)
    if not chunks:
        chunks = _chunk_by_paragraphs(text, metadata, filename)
    return chunks


def _chunk_by_headers(text, metadata, filename):
    chunks = []
    lines = text.splitlines()
    heading_stack = []
    current_lines = []
    current_title = ""
    current_level = 0

    def _heading_level(line):
        m = re.match(r"^(#{1,6})\s", line)
        return len(m.group(1)) if m else 0

    def _flush(title, level, content_lines):
        body = "\n".join(content_lines).strip()
        if not body:
            return
        breadcrumb = " > ".join(t for _, t in heading_stack if _ < level)
        full_title = f"{breadcrumb} > {title}" if breadcrumb else title
        chunks.append({
            "text": f"## {full_title}\n\n{body}",
            "metadata": {**metadata, "filename": filename, "section": full_title, "type": "uploaded_document"},
        })

    for line in lines:
        lvl = _heading_level(line)
        if lvl >= 2:
            if current_title:
                _flush(current_title, current_level, current_lines)
            heading_stack = [(l, t) for l, t in heading_stack if l < lvl]
            heading_stack.append((lvl, line.lstrip("#").strip()))
            current_title = line.lstrip("#").strip()
            current_level = lvl
            current_lines = []
        else:
            current_lines.append(line)

    if current_title:
        _flush(current_title, current_level, current_lines)
    return chunks


def _chunk_by_paragraphs(text, metadata, filename, max_tokens=500, overlap=150):
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks = []
    current_chunk = ""
    for para in paragraphs:
        if len(current_chunk) + len(para) > max_tokens * 4:
            if current_chunk:
                chunks.append({
                    "text": current_chunk.strip(),
                    "metadata": {**metadata, "filename": filename, "section": f"Chunk {len(chunks)+1}", "type": "uploaded_document"},
                })
            current_chunk = current_chunk[-overlap:] + "\n\n" + para if current_chunk else para
        else:
            current_chunk += "\n\n" + para if current_chunk else para
    if current_chunk.strip():
        chunks.append({
            "text": current_chunk.strip(),
            "metadata": {**metadata, "filename": filename, "section": f"Chunk {len(chunks)+1}", "type": "uploaded_document"},
        })
    return chunks
