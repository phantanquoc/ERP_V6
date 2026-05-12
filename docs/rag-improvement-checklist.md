# RAG Chatbot — Improvement Checklist

## Phase 1 — Highest ROI (1-2 ngày) ✅ DONE

- [x] **Đổi embedding model** → `AITeamVN/Vietnamese_Embedding_v2` (fine-tune BGE-M3 trên 1.1M cặp tiếng Việt, +16.8 điểm Accuracy@1)
- [x] **Hybrid search BM25 + ChromaDB** với Reciprocal Rank Fusion (RRF k=60) — bắt exact match tên trường, mã trạng thái
- [x] **Streaming response** — `/chat/stream` endpoint, frontend stream từng token (cursor nhấp nháy, nút Stop)
- [x] **Set `num_ctx=4096`** trong Ollama options — tránh silent truncation context

## Phase 2 — Quality guardrails (2-3 ngày) ✅ DONE

- [x] **Confidence gate** — cosine score < 0.35 → trả "Tôi không tìm thấy thông tin" thay vì hallucinate
- [x] **Reranking với `flashrank`** — retrieve top-20, rerank xuống top-5/8 (~50ms trên CPU, model `ms-marco-MiniLM-L-12-v2`)
- [x] **Table summarization khi index** — mỗi bảng markdown sinh thêm 1 chunk tóm tắt plain-text để retrieval tốt hơn

## Phase 3 — Evaluation & production hardening ✅ DONE

- [x] **RAGAS evaluation** — 20 golden QA pairs (`ai-service/eval/golden_dataset.json`), script `run_eval.py` với keyword recall + RAGAS faithfulness/relevancy/precision
- [x] **Semantic cache** — cosine similarity ≥ 0.95 → trả cache, không gọi LLM (tối đa 200 entries, FIFO, chỉ cache câu hỏi không có history)
- [x] **Post-generation faithfulness check** — Ollama grader model (`gemma2:2b`) kiểm tra answer có mâu thuẫn context không, fail-open nếu grader lỗi

## Bỏ qua (không đáng với knowledge base nhỏ ~200 chunks)

- ~~HyDE~~ — thêm 200-400ms latency, ít lợi với docs có cấu trúc rõ
- ~~GraphRAG~~ — overkill cho 9 files
- ~~Self-consistency voting~~ — 3-5x LLM calls trên local hardware

---

*Nguồn: AITeamVN/Vietnamese_Embedding_v2 (HuggingFace), FlashRank (GitHub), RAGAS (GitHub), LangChain benchmarking RAG on tables*
