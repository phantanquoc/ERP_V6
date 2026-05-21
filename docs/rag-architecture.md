# RAG Chatbot — Kiến trúc & Công nghệ

## Tổng quan Pipeline

```
User Query
    │
    ▼
┌─────────────────────────┐
│  1. Query Processing    │  Synonym expansion, intent detection
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  2. Semantic Cache      │  Cosine similarity ≥ 0.95 → trả cache
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  3. Hybrid Retrieval    │  Dense (ChromaDB) + Sparse (BM25)
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  4. RRF Fusion          │  Reciprocal Rank Fusion (k=60)
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  5. Confidence Gate     │  Cosine similarity < 0.32 → từ chối
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  6. Reranking           │  FlashRank cross-encoder
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  7. LLM Generation      │  Groq API (llama-3.3-70b)
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  8. Faithfulness Check  │  Ollama grader (gemma2:2b)
└───────────┘─────────────┘
            ▼
        Response
```

---

## Chi tiết từng lớp

### 1. Document Processing & Chunking

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| Nguồn tài liệu | Markdown files | `docs/chatbot/*.md` (11 files) |
| Chunking strategy | Header-based | Split theo `##`, `###`, `####` |
| Breadcrumb context | Custom logic | Heading cha prepend vào chunk con |
| Table summary | Rule-based parser | Tóm tắt bảng markdown → plain-text chunk riêng |
| Metadata | YAML frontmatter | `department`, `filename`, `section`, `type` |
| Tổng chunks | ~468 | Bao gồm content chunks + table summary chunks |

### 2. Embedding

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| Model | `AITeamVN/Vietnamese_Embedding_v2` | Sentence-transformers, tối ưu tiếng Việt |
| Framework | `sentence-transformers 3.4.1` | PyTorch backend |
| Dimension | 768 | Normalized embeddings |
| Runtime | CPU | ~10 phút cho 468 chunks (cold start) |

### 3. Vector Store (Dense Retrieval)

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| Database | ChromaDB 0.6.3 | PersistentClient, lưu disk |
| Distance metric | Cosine | `hnsw:space: cosine` |
| Top-K | 20 | Lấy 20 candidates cho RRF |
| Department filter | ChromaDB `$or` | Filter theo department + ALL + common file |
| Cache | Hash-based | Chỉ rebuild khi docs thay đổi (MD5 hash) |

### 4. Sparse Retrieval (BM25)

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| Algorithm | BM25Okapi | `rank-bm25 0.2.2` |
| Tokenization | Regex `\w+` | Lowercase, split theo word boundary |
| Top-K | 20 | Lấy 20 candidates cho RRF |
| Department filter | Score zeroing | Set score = 0 cho chunks ngoài department |

### 5. Fusion

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| Algorithm | Reciprocal Rank Fusion | k=60, top_n=20 |
| Deduplication | Chunk ID matching | `chunk_N` ID scheme chung giữa dense & BM25 |
| Output | 20 candidates | Kèm `_rrf_score` và `_cosine_sim` |

### 6. Confidence Gate

| Thành phần | Giá trị | Mục đích |
|---|---|---|
| Threshold | 0.32 | Top-1 cosine similarity < 0.32 → từ chối trả lời |
| Fallback message | Cố định | "Tôi không tìm thấy thông tin liên quan..." |

### 7. Reranking

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| Model | `ms-marco-MiniLM-L-12-v2` | FlashRank 0.2.9, cross-encoder |
| Input | 20 candidates từ RRF | |
| Output | Top 5-8 | 8 nếu câu hỏi dạng "hướng dẫn/làm thế nào", 5 cho còn lại |
| Lost-in-the-middle | Reorder | Chunk quan trọng nhất ở đầu và cuối |

### 8. LLM Generation

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| Provider chính | Groq API | Free tier, nhanh |
| Model | `llama-3.3-70b-versatile` | 70B params, hỗ trợ tiếng Việt tốt |
| Fallback | Ollama (local) | `qwen2.5:3b` khi không có Groq API key |
| Temperature | 0.1 | Deterministic, ít sáng tạo |
| Max tokens | 600 | Giới hạn response length |
| Context window | 3072 (Ollama) / unlimited (Groq) | |
| Streaming | Có | Endpoint `/chat/stream` |

### 9. Faithfulness Check (Post-generation)

| Thành phần | Công nghệ | Chi tiết |
|---|---|---|
| Grader model | Ollama `gemma2:2b` | Model nhỏ, tránh self-preference bias |
| Logic | PASS/FAIL | Kiểm tra answer có mâu thuẫn với context không |
| Fail behavior | Fail-open | Nếu grader lỗi → cho qua (không block) |
| Fail response | Cố định | "Xin lỗi, tôi không thể đưa ra câu trả lời chắc chắn..." |

### 10. Semantic Cache

| Thành phần | Giá trị | Chi tiết |
|---|---|---|
| Similarity threshold | 0.95 | Cosine sim ≥ 0.95 → cache hit |
| Max entries | 200 | FIFO eviction |
| Storage | In-memory | Mất khi restart container |
| Scope | Chỉ query không có history | Tránh cache multi-turn |

---

## Query Processing

### Synonym Expansion

```
đh → đơn hàng, ncc → nhà cung cấp, nvl → nguyên vật liệu
kh → khách hàng, nv → nhân viên, sx → sản xuất, kd → kinh doanh
```

### Department Filter Logic

```
ADMIN           → không filter, tìm toàn bộ KB
Cross-dept query → không filter (detect keyword: "bộ phận", "phòng ban", ...)
HR intent       → mở rộng filter thêm DEPT_QUALITY
Còn lại         → filter theo department user + ALL + 00-chung.md
```

### HR Intent Detection

Dùng phrase patterns + verb-noun combo:
- Phrases: "xóa nhân viên", "bảng lương", "quản lý user", ...
- Combo: HR verb ("xóa", "thêm", "quản lý") + HR noun ("nhân viên", "lương", "tài khoản")

---

## Infrastructure

| Thành phần | Công nghệ | Container |
|---|---|---|
| API Server | FastAPI + Uvicorn | `erp_dev_ai` (port 8001) |
| Vector DB | ChromaDB (embedded) | Cùng container ai-service |
| LLM API | Groq Cloud | External API |
| LLM Local (backup) | Ollama | Optional container |
| Backend proxy | Express.js | `erp_dev_backend` (port 5003) |
| Frontend | React + Vite | `erp_dev_frontend` (port 5173) |

---

## Dependencies (`ai-service/requirements.txt`)

| Package | Version | Vai trò |
|---|---|---|
| `sentence-transformers` | 3.4.1 | Vietnamese embedding model |
| `chromadb` | 0.6.3 | Vector store |
| `rank-bm25` | 0.2.2 | Sparse retrieval |
| `flashrank` | 0.2.9 | Cross-encoder reranking |
| `groq` | 0.13.1 | Groq LLM API client |
| `ollama` | 0.4.8 | Ollama LLM client (fallback) |
| `langchain` | 0.3.25 | Framework utilities |
| `fastapi` | 0.115.0 | HTTP API server |

---

## Các thông số quan trọng

| Parameter | Giá trị | Ý nghĩa |
|---|---|---|
| `CONFIDENCE_THRESHOLD` | 0.32 | Ngưỡng cosine sim để chấp nhận retrieval |
| `SEM_CACHE_THRESHOLD` | 0.95 | Ngưỡng cache hit |
| `SEM_CACHE_MAX` | 200 | Số entry cache tối đa |
| `RRF k` | 60 | Hằng số RRF (cao = ít phân biệt rank) |
| `Dense top-K` | 20 | Số candidates từ ChromaDB |
| `BM25 top-K` | 20 | Số candidates từ BM25 |
| `Rerank top-N` | 5-8 | Số chunks cuối cùng cho LLM |
| `Max context chunks` | 4 | Số chunks gửi vào LLM prompt |
| `Max chunk chars` | 800 | Cắt chunk dài trước khi gửi LLM |
| `LLM temperature` | 0.1 | Độ sáng tạo (thấp = deterministic) |
| `LLM max_tokens` | 600 | Giới hạn response |
