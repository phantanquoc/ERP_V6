"""Hybrid search (dense + BM25), RRF fusion, reranking, semantic cache."""

import re
from typing import List

from config import (
    logger, COMMON_FILE, CONFIDENCE_THRESHOLD,
    SEM_CACHE_THRESHOLD, SEM_CACHE_MAX,
)
import chat.indexer as indexer

# Semantic cache: list of (query_embedding, answer, sources)
_sem_cache: List[tuple] = []


def _rrf_fuse(
    dense_ids: list[str],
    dense_docs: list[str],
    dense_metas: list[dict],
    dense_distances: list[float],
    bm25_chunks: list[dict],
    bm25_indices: list[int],
    k: int = 60,
    top_n: int = 20,
) -> list[dict]:
    """Reciprocal Rank Fusion: kết hợp kết quả dense (ChromaDB) và sparse (BM25)."""
    scores: dict[str, float] = {}
    chunk_map: dict[str, dict] = {}
    dist_map: dict[str, float] = {}

    for rank, (cid, doc, meta, dist) in enumerate(zip(dense_ids, dense_docs, dense_metas, dense_distances)):
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
        chunk_map[cid] = {"text": doc, "metadata": meta}
        dist_map[cid] = dist

    for rank, idx in enumerate(bm25_indices):
        cid = f"chunk_{idx}"
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
        if cid not in chunk_map:
            chunk_map[cid] = bm25_chunks[idx]
            dist_map[cid] = 0.4

    sorted_ids = sorted(scores, key=lambda x: scores[x], reverse=True)

    result = []
    for cid in sorted_ids[:top_n]:
        chunk = dict(chunk_map[cid])
        chunk["_rrf_score"] = scores[cid]
        chunk["_cosine_sim"] = 1.0 - dist_map.get(cid, 1.0)
        result.append(chunk)
    return result


def _rerank(query: str, candidates: list[dict], top_n: int) -> list[dict]:
    """FlashRank cross-encoder reranking."""
    if indexer.reranker is None:
        return candidates[:top_n]
    try:
        from flashrank import RerankRequest
        passages = [{"id": i, "text": c["text"]} for i, c in enumerate(candidates)]
        request = RerankRequest(query=query, passages=passages)
        results = indexer.reranker.rerank(request)
        reranked = sorted(results, key=lambda x: x["score"], reverse=True)[:top_n]
        return [candidates[r["id"]] for r in reranked]
    except Exception as e:
        logger.warning(f"Reranking failed, using RRF order: {e}")
        return candidates[:top_n]


def build_retrieval(
    query_text: str,
    original_message: str,
    department: str,
    role: str = "",
) -> tuple[list[dict], bool]:
    """Pipeline retrieval: dense + BM25 -> RRF -> confidence gate -> rerank."""
    CROSS_DEPT_KEYWORDS = ["bộ phận", "phòng ban", "kế toán", "kinh doanh", "thu mua",
                           "sản xuất", "kỹ thuật", "chất lượng", "tổng hợp", "admin"]
    HR_ACTION_PATTERNS = [
        "xóa nhân viên", "thêm nhân viên", "sửa nhân viên", "tạo nhân viên",
        "quản lý nhân viên", "danh sách nhân viên", "hồ sơ nhân viên",
        "bảng lương", "tính lương", "xem lương", "quản lý lương",
        "đánh giá nhân viên", "điểm danh", "chấm công",
        "quản lý vị trí", "cấp độ lương", "quản lý user", "tạo tài khoản",
        "khóa tài khoản", "đơn nghỉ phép", "duyệt nghỉ phép",
    ]
    HR_NOUNS = ["nhân viên", "lương", "vị trí", "cấp độ", "tài khoản", "user"]
    HR_VERBS = ["xóa", "thêm", "sửa", "tạo", "quản lý", "danh sách", "cập nhật", "khóa", "mở khóa"]

    msg_lower = original_message.lower()
    is_admin = role.upper() == "ADMIN"
    is_cross_dept = any(kw in msg_lower for kw in CROSS_DEPT_KEYWORDS)

    is_hr_intent = any(p in msg_lower for p in HR_ACTION_PATTERNS)
    if not is_hr_intent:
        has_hr_noun = any(n in msg_lower for n in HR_NOUNS)
        has_hr_verb = any(v in msg_lower for v in HR_VERBS)
        is_hr_intent = has_hr_noun and has_hr_verb

    use_filter = department and not is_admin and not is_cross_dept

    # Dense retrieval
    query_embedding = indexer.embedder.encode([query_text], normalize_embeddings=True).tolist()[0]

    where_filter = None
    if use_filter:
        dept_conditions = [
            {"department": {"$eq": department}},
            {"department": {"$eq": "ALL"}},
            {"filename": {"$eq": COMMON_FILE}},
        ]
        if is_hr_intent and department != "DEPT_QUALITY":
            dept_conditions.append({"department": {"$eq": "DEPT_QUALITY"}})
        where_filter = {"$or": dept_conditions}

    dense_results = indexer.chroma_collection.query(
        query_embeddings=[query_embedding],
        n_results=20,
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )
    dense_ids = dense_results.get("ids", [[]])[0]
    dense_docs = dense_results.get("documents", [[]])[0]
    dense_metas = dense_results.get("metadatas", [[]])[0]
    dense_distances = dense_results.get("distances", [[]])[0]

    # BM25 retrieval
    query_tokens = re.findall(r"\w+", query_text.lower())
    bm25_scores = indexer.bm25_index.get_scores(query_tokens).copy()
    if use_filter:
        for i, chunk in enumerate(indexer.bm25_chunks):
            dept = chunk["metadata"].get("department", "ALL")
            fname = chunk["metadata"].get("filename", "")
            allowed = (dept == department or dept == "ALL" or fname == COMMON_FILE)
            if is_hr_intent and dept == "DEPT_QUALITY":
                allowed = True
            if not allowed:
                bm25_scores[i] = 0.0
    bm25_top = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[:20]

    # RRF fusion
    candidates = _rrf_fuse(
        dense_ids, dense_docs, dense_metas, dense_distances,
        indexer.bm25_chunks, bm25_top,
        k=60, top_n=20,
    )

    if not candidates:
        return [], False

    # Confidence gate
    top_sim = candidates[0].get("_cosine_sim", 0.0)
    is_confident = top_sim >= CONFIDENCE_THRESHOLD

    if not is_confident:
        logger.info(f"Low confidence (top_sim={top_sim:.3f}) for query: {original_message[:60]}")
        return [], False

    # Rerank
    how_to_kw = ["làm thế nào", "hướng dẫn", "tạo", "thêm", "điền",
                 "nhập", "các bước", "quy trình", "form", "trường", "ô"]
    top_n = 6 if any(kw in original_message.lower() for kw in how_to_kw) else 4
    reranked = _rerank(original_message, candidates, top_n)

    # Lost-in-the-middle mitigation
    if len(reranked) > 2:
        reranked = [reranked[0]] + reranked[1:-1] + [reranked[-1]]

    return reranked, True


# ─── Semantic Cache ──────────────────────────────────────────────────────────

def _cosine_sim_vec(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    return min(1.0, max(-1.0, dot))


def sem_cache_lookup(query_emb: list[float]) -> tuple | None:
    """Tìm cache hit."""
    best_sim = 0.0
    best_entry = None
    for cached_emb, answer, sources in _sem_cache:
        sim = _cosine_sim_vec(query_emb, cached_emb)
        if sim > best_sim:
            best_sim = sim
            best_entry = (answer, sources)
    if best_sim >= SEM_CACHE_THRESHOLD and best_entry:
        logger.info(f"Semantic cache hit (sim={best_sim:.3f})")
        return best_entry
    return None


def sem_cache_put(query_emb: list[float], answer: str, sources: list[str]):
    """Lưu vào cache, giữ tối đa SEM_CACHE_MAX entries (FIFO)."""
    _sem_cache.append((query_emb, answer, sources))
    if len(_sem_cache) > SEM_CACHE_MAX:
        _sem_cache.pop(0)
