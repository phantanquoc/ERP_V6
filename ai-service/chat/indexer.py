"""RAG indexer — document parsing, chunking, ChromaDB + BM25 initialization."""

import re
import hashlib
import threading
from typing import List

from config import logger, DOCS_DIR, CHROMA_DIR

_rag_init_lock = threading.Lock()

# Lazy-loaded RAG components (module-level state)
chroma_client = None
chroma_collection = None
embedder = None
bm25_index = None
bm25_chunks: List[dict] = []
reranker = None
rag_ready = False


def _parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter từ markdown file."""
    if not content.startswith("---"):
        return {}, content
    end = content.find("---", 3)
    if end == -1:
        return {}, content
    fm_text = content[3:end].strip()
    body = content[end + 3:].strip()
    meta = {}
    for line in fm_text.splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            meta[key.strip()] = val.strip().strip('"')
    return meta, body


def _extract_tables(text: str) -> List[str]:
    """Trích xuất các bảng markdown từ text."""
    tables = []
    lines = text.splitlines()
    current: List[str] = []
    in_table = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("|") and "|" in stripped[1:]:
            in_table = True
            current.append(line)
        else:
            if in_table and current:
                tables.append("\n".join(current))
                current = []
            in_table = False
    if in_table and current:
        tables.append("\n".join(current))
    return tables


def _summarize_table(table_md: str, section_title: str) -> str:
    """Tóm tắt bảng markdown thành plain-text để retrieval tốt hơn."""
    lines = [l.strip() for l in table_md.strip().splitlines() if l.strip()]
    data_lines = [l for l in lines if not re.match(r"^\|[-| :]+\|$", l)]
    if not data_lines:
        return ""

    headers = [c.strip() for c in data_lines[0].strip("|").split("|")]
    rows = []
    for line in data_lines[1:]:
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) == len(headers):
            rows.append(dict(zip(headers, cells)))

    if not rows:
        return ""

    parts = [f"Bảng '{section_title}' gồm {len(rows)} dòng với các cột: {', '.join(headers)}."]
    for row in rows[:5]:
        row_text = "; ".join(f"{k}: {v}" for k, v in row.items() if v and v not in ("-", "—", ""))
        if row_text:
            parts.append(row_text)
    if len(rows) > 5:
        parts.append(f"... và {len(rows) - 5} dòng khác.")
    return "\n".join(parts)


def _chunk_by_header(body: str, meta: dict, filename: str) -> List[dict]:
    """Chunk markdown theo mọi cấp heading (##, ###, ####)."""
    chunks = []
    lines = body.splitlines()

    heading_stack: list[tuple[int, str]] = []
    current_lines: list[str] = []
    current_title = ""
    current_level = 0

    def _heading_level(line: str) -> int:
        m = re.match(r"^(#{2,4})\s", line)
        return len(m.group(1)) if m else 0

    def _flush(title: str, level: int, content_lines: list[str]):
        text = "\n".join(content_lines).strip()
        if not text:
            return
        breadcrumb = " > ".join(t for _, t in heading_stack if _ < level)
        full_title = f"{breadcrumb} > {title}" if breadcrumb else title
        chunk_text = f"## {full_title}\n\n{text}"
        chunks.append({
            "text": chunk_text,
            "metadata": {
                "department": meta.get("department", "ALL"),
                "filename": filename,
                "section": full_title,
                "type": "content",
            }
        })
        for table_md in _extract_tables(text):
            summary = _summarize_table(table_md, full_title)
            if summary:
                chunks.append({
                    "text": summary,
                    "metadata": {
                        "department": meta.get("department", "ALL"),
                        "filename": filename,
                        "section": full_title,
                        "type": "table_summary",
                    }
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


def _docs_hash() -> str:
    """Tính hash của tất cả docs để phát hiện thay đổi."""
    h = hashlib.md5()
    for f in sorted(DOCS_DIR.glob("*.md")):
        h.update(f.read_bytes())
    return h.hexdigest()


def init_rag():
    """Khởi tạo RAG: load docs, embed, lưu vào ChromaDB + BM25 + FlashRank."""
    global chroma_client, chroma_collection, embedder, bm25_index, bm25_chunks, reranker, rag_ready

    if rag_ready:
        return

    with _rag_init_lock:
        if rag_ready:
            return

        try:
            import chromadb
            from sentence_transformers import SentenceTransformer
            from rank_bm25 import BM25Okapi
            from flashrank import Ranker

            logger.info("Initializing RAG chatbot...")

            embedder = SentenceTransformer("AITeamVN/Vietnamese_Embedding_v2")
            reranker = Ranker(model_name="ms-marco-MultiBERT-L-12", cache_dir=str(CHROMA_DIR / "flashrank_cache"))
            logger.info("FlashRank reranker loaded")

            CHROMA_DIR.mkdir(parents=True, exist_ok=True)
            chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))

            current_hash = _docs_hash()
            hash_file = CHROMA_DIR / "docs_hash.txt"
            stored_hash = hash_file.read_text().strip() if hash_file.exists() else ""

            collection_exists = "erp_docs" in [str(c) for c in chroma_client.list_collections()]

            doc_files = sorted(DOCS_DIR.glob("*.md"))
            if not doc_files:
                logger.warning(f"No docs found in {DOCS_DIR}")
                return

            all_chunks = []
            for doc_path in doc_files:
                content = doc_path.read_text(encoding="utf-8")
                meta, body = _parse_frontmatter(content)
                chunks = _chunk_by_header(body, meta, doc_path.name)
                all_chunks.extend(chunks)

            if not all_chunks:
                logger.warning("No chunks loaded from docs")
                return

            tokenized = [re.findall(r"\w+", c["text"].lower()) for c in all_chunks]
            bm25_index = BM25Okapi(tokenized)
            bm25_chunks = all_chunks
            logger.info(f"BM25 index built: {len(all_chunks)} chunks (incl. table summaries)")

            if collection_exists and stored_hash == current_hash:
                logger.info("Docs unchanged — reusing existing ChromaDB index")
                chroma_collection = chroma_client.get_collection("erp_docs")
                rag_ready = True
                return

            logger.info("Docs changed or first run — rebuilding ChromaDB index...")
            try:
                chroma_client.delete_collection("erp_docs")
            except Exception:
                pass

            chroma_collection = chroma_client.create_collection(
                name="erp_docs",
                metadata={"hnsw:space": "cosine"}
            )

            batch_size = 50
            for i in range(0, len(all_chunks), batch_size):
                batch = all_chunks[i:i + batch_size]
                texts = [c["text"] for c in batch]
                embeddings = embedder.encode(texts, normalize_embeddings=True).tolist()
                chroma_collection.add(
                    ids=[f"chunk_{i + j}" for j in range(len(batch))],
                    embeddings=embeddings,
                    documents=texts,
                    metadatas=[c["metadata"] for c in batch],
                )
                logger.info(f"  Indexed {min(i + batch_size, len(all_chunks))}/{len(all_chunks)} chunks")

            hash_file.write_text(current_hash)
            rag_ready = True
            logger.info(f"RAG ready: {len(all_chunks)} chunks indexed")

        except Exception as e:
            logger.error(f"RAG init failed: {e}")
