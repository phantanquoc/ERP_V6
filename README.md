# ERP An Binh Foods

Hệ thống ERP nội bộ cho An Binh Foods — quản lý toàn bộ hoạt động doanh nghiệp từ kinh doanh, kế toán, thu mua, sản xuất đến kỹ thuật. Tích hợp chấm công nhận diện khuôn mặt và trợ lý AI (RAG chatbot) hỗ trợ nhân viên sử dụng hệ thống.

---

## Tính năng chính

| Bộ phận | Chức năng |
|---|---|
| **Kinh doanh** | Yêu cầu báo giá, báo giá, đơn hàng, khách hàng QT/NĐ, phản hồi KH |
| **Kế toán** | Hóa đơn, công nợ, tài sản/lô hàng, báo cáo thuế |
| **Thu mua** | Nhà cung cấp, yêu cầu mua hàng, đơn hàng NVL & thiết bị |
| **Sản xuất** | Lệnh sản xuất, quy trình, kho, thành phẩm, báo cáo sản lượng |
| **Kỹ thuật** | Hệ thống máy, báo cáo hoạt động, yêu cầu sửa chữa, nghiệm thu |
| **Chất lượng** | Nhân sự, đánh giá NVL, định mức, kiểm tra nội bộ |
| **Tổng hợp** | Giá thành, bảng lương, chăm sóc đối tác |
| **Chung** | Chấm công, nghỉ phép, nhiệm vụ, kế hoạch, tăng ca, góp ý |
| **Admin** | Quản lý user, theme, cài đặt hệ thống, chấm công khuôn mặt |
| **AI Chatbot** | Trợ lý RAG hướng dẫn sử dụng ERP theo từng phòng ban |

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind CSS |
| Backend | Express 5 + TypeScript + Prisma 6 |
| Database | PostgreSQL 16 |
| AI Service | FastAPI + DeepFace (face recognition) + Ollama (RAG chatbot) |
| RAG Pipeline | ChromaDB + BM25 + FlashRank + sentence-transformers |
| LLM | Ollama — `qwen2.5:7b` (chạy local, không cần API key) |
| Reverse Proxy | Nginx (production) |

---

## Cấu trúc dự án

```
ERP_V6/
├── frontend/           # React SPA
├── backend/            # Express API + Prisma
├── ai-service/         # FastAPI — face recognition + RAG chatbot
│   └── eval/           # RAGAS evaluation scripts + golden dataset
├── docs/
│   └── chatbot/        # Knowledge base markdown cho RAG (9 files)
├── nginx/              # nginx.conf + SSL certs
├── scripts/            # Backup scripts (bash + PowerShell)
├── docker-compose.yml          # Production
└── docker-compose.dev.yml      # Development
```

---

## Yêu cầu

- Docker Desktop 24+ (hoặc Docker Engine + Compose v2)
- 16GB RAM khuyến nghị (tensorflow + torch + Ollama model)
- 20GB disk trống

---

## Chạy môi trường Development

### 1. Clone và cấu hình

```bash
git clone <repo-url>
cd ERP_V6
```

Tạo file `.env` cho backend (xem `backend/.env.example`):

```bash
cp backend/.env.example backend/.env
# Chỉnh sửa các giá trị cần thiết
```

### 2. Start tất cả services

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

Lần đầu build mất ~30 phút do download tensorflow + torch.

### 3. Chạy migration database

```bash
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev
docker compose -f docker-compose.dev.yml exec backend npx prisma db seed
```

### 4. Pull Ollama model cho chatbot

```bash
docker exec erp_dev_ollama ollama pull qwen2.5:7b
```

### 5. Truy cập

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5003/api |
| AI Service | http://localhost:8001 |
| Ollama | http://localhost:11434 |
| PostgreSQL | localhost:5432 |

---

## Services (Development)

| Container | Image | Port | Mô tả |
|---|---|---|---|
| `erp_dev_postgres` | postgres:16-alpine | 5432 | Database |
| `erp_dev_backend` | erp_v6-backend | 5003 | Express API (hot-reload) |
| `erp_dev_frontend` | erp_v6-frontend | 5173 | Vite dev server (hot-reload) |
| `erp_dev_ai` | erp_v6-ai-service | 8001 | FastAPI — face recognition + chatbot |
| `erp_dev_ollama` | ollama/ollama | 11434 | Local LLM server |

---

## Biến môi trường

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://erp_user:erp_dev_password@postgres:5432/erp_database
JWT_SECRET=your_jwt_secret_min_64_chars
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret_min_64_chars
JWT_REFRESH_EXPIRE=30d
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
UPLOAD_DIR=./uploads
FACE_DATA_SECRET=your_face_data_secret
AI_SERVICE_URL=http://ai-service:8001
VAPID_PUBLIC_KEY=           # npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@anbinhfoods.net
```

### Frontend (build args)

```env
VITE_API_URL=http://localhost:5003/api
VITE_FACE_DEVICE_KEY=       # tùy chọn, cho kiosk chấm công
VITE_FACE_DEVICE_ID=        # tùy chọn
```

### AI Service

```env
OLLAMA_HOST=http://erp_dev_ollama:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_GRADER_MODEL=gemma2:2b   # tùy chọn, cho faithfulness check
```

---

## Phân quyền

Hệ thống dùng RBAC + ABAC — nhân viên chỉ thấy dữ liệu của phòng ban mình.

| Vai trò | Mô tả |
|---|---|
| `ADMIN` | Toàn quyền |
| `DEPARTMENT_HEAD` | Quản lý phòng ban, phê duyệt |
| `TEAM_LEAD` | Quản lý nhóm, tạo nhiệm vụ/kế hoạch |
| `EMPLOYEE` | Thực hiện công việc, xem dữ liệu cá nhân |

---

## RAG Chatbot

Chatbot hỗ trợ nhân viên sử dụng ERP — hướng dẫn từng bước, liệt kê field, dropdown values, quyền hạn theo vai trò.

**Pipeline:** Dense retrieval (ChromaDB) + BM25 → RRF fusion → FlashRank reranking → Confidence gate → Ollama generation → Faithfulness check → Semantic cache

**Knowledge base:** `docs/chatbot/` — 9 file markdown, mỗi file cho 1 phòng ban, có frontmatter `department` để filter theo user.

**Chạy evaluation:**

```bash
# Cài eval dependencies
pip install -r ai-service/eval/requirements-eval.txt

# Chạy 20 golden QA pairs
python ai-service/eval/run_eval.py --url http://localhost:8001
```

---

## Chấm công khuôn mặt

AI service tích hợp nhận diện khuôn mặt (ArcFace + RetinaFace + MiniFASNet anti-spoofing) cho kiosk chấm công. Truy cập kiosk tại `/face/kiosk` trên frontend.

---

## Production Deploy

Xem hướng dẫn chi tiết tại [`DEPLOY.md`](./DEPLOY.md) — bao gồm cấu hình Windows Server 2019, SSL, DNS, firewall, và lịch backup tự động.

```bash
# Build production
docker compose build

# Start
docker compose up -d

# Migration
docker compose exec backend npx prisma migrate deploy
```

---

## Lệnh hữu ích

```bash
# Xem logs
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f ai-service

# Restart một service
docker compose -f docker-compose.dev.yml restart backend

# Prisma Studio (xem database)
docker compose -f docker-compose.dev.yml exec backend npx prisma studio

# Chạy tests backend
docker compose -f docker-compose.dev.yml exec backend npm test

# Dừng tất cả
docker compose -f docker-compose.dev.yml down

# Dừng và xóa volumes (reset database)
docker compose -f docker-compose.dev.yml down -v
```
