# Playbook Deploy Production — ERP_V6 (template)

> Template public cho quy trình deploy prod. Bản chi tiết chứa IP/đường dẫn nội bộ **không push lên GitHub**.
> Copy file này thành `DEPLOY_PROD_PLAYBOOK.md` trên máy local/VPS và thay placeholder bằng giá trị thật.

Quy trình deploy prod an toàn, ưu tiên **KHÔNG BAO GIỜ MẤT DỮ LIỆU**.
Áp dụng cho VPS Linux (Docker Compose). Chạy tuần tự Phase 0 → 5.

> **Nguyên tắc**: Backup TRƯỚC mọi thứ, kể cả khi không có migration.
> Không phase nào được bỏ qua trừ khi ghi rõ điều kiện.

---

## Thông tin hạ tầng (điền trên máy local — không commit)

- **VPS**: `<user>@<VPS_IP> -p <SSH_PORT>`
- **Project dir**: `<path>/ERP_V6` (ví dụ `/home/erp/ERP_V6` trên prod)
- **Backup dir**: `<path>/erp-backups/pre-deploy/`
- **Containers**: erp_backend, erp_frontend, erp_postgres, erp_redis, erp_ai, erp_nginx (+ portainer, netdata)
- **DB**: user `erp_user`, db `erp_database`
- **Postgres volume (LIVE)**: điền sau khi verify — `docker inspect erp_postgres --format '{{range .Mounts}}{{.Name}} -> {{.Destination}}{{println}}{{end}}'`.
  **KHÔNG hardcode tên volume**: trên máy thật đã có volume cũ cùng tên nằm cạnh volume live
  (backup nhầm volume = backup trống, gate 0.4 vẫn "pass").
- **Backend thường KHÔNG publish port ra host** — truy cập API qua nginx (kiểm tra `docker port erp_backend`).
- **nginx `server_name`**: chỉ domain thật có proxy `/api` — `curl localhost/api/...` rơi vào default server
  (301 → HTTPS rỗng, content-length 0), KHÔNG phải backend.

---

## Phase 0 — PRE-FLIGHT + BACKUP 3 LỚP (BẮT BUỘC)

### 0.1 Pre-flight check
```bash
cd <PROJECT_DIR>
git status --short                    # phải sạch, không uncommitted trên prod
git log --oneline -1                  # HEAD hiện tại (ghi lại để rollback)
git fetch origin
git log --oneline HEAD..origin/main   # xem sẽ pull bao nhiêu commit
df -h <BACKUP_DIR> /                  # disk phải đủ (> tổng size backup dưới)
docker ps --format '{{.Names}}\t{{.Status}}'  # container đang healthy
```
**GATE**: nếu working tree bẩn → DỪNG, hỏi user. Nếu disk backup < 5GB trống → DỪNG.

**Khi user chọn stash (config ops làm trực tiếp trên server, vd HTTPS/ACME):**
```bash
git stash push -u -m "ops: config stashed during deploy $(date +%Y%m%d_%H%M%S)"
# ⚠️ file root-owned (vd nginx/certbot/...) có thể làm stash fail SAU khi đã lưu:
# stash có mặt nhưng working tree CHƯA reset, exit != 0. Kiểm tra rồi revert tay:
git stash list && git status --short
git checkout stash@{0} -- <các file modified>   # nội dung đã an toàn trong stash
git restore --staged <các file>                 # stash checkout sẽ stage — bỏ stage cho giống trạng thái gốc
# Deploy xong: git checkout stash@{0} -- <files> lần nữa → verify diff → git stash drop
# KHÔNG `git stash pop` khi untracked root-owned còn trên đĩa — pop conflict "already exists".
```
> File root-owned sót lại KHÔNG chặn ff-only (commit không thuộc path đó) — bỏ qua, không cần xóa.

### 0.2 Kiểm tra migration destructive (nếu pull có migration mới)
```bash
git diff --stat HEAD..origin/main -- backend/prisma/migrations/
# Với mỗi migration mới → đọc nội dung:
git show origin/main:backend/prisma/migrations/<dir>/migration.sql
```
**GATE**: nếu thấy `DROP TABLE`, `DROP COLUMN`, `ALTER ... TYPE`, `DELETE`, `TRUNCATE` trên bảng có dữ liệu → DỪNG, báo user, cần kế hoạch riêng. Chỉ `CREATE TABLE`/`ADD COLUMN`/`CREATE INDEX` (additive) mới auto-tiếp.

### 0.3 Backup 3 lớp
```bash
TS=$(date +%Y%m%d_%H%M%S)
BK=<BACKUP_DIR>
mkdir -p $BK
# Lớp 1: pg_dump custom format
docker compose exec -T postgres pg_dump -U erp_user -Fc erp_database > $BK/pre_deploy_$TS.dump
# Lớp 2: postgres volume — DÙNG VOLUME LIVE verify ở mục Hạ tầng (KHÔNG hardcode)
docker run --rm -v <PG_VOLUME_LIVE>:/data -v $BK:/backup alpine tar czf /backup/postgres_volume_$TS.tar.gz -C /data .
# Lớp 3: uploads
docker compose exec -T backend tar czf - -C /app uploads > $BK/uploads_$TS.tar.gz
```

### 0.4 VERIFY backup readable (không chỉ checksum)
```bash
# pg_restore: container postgres thường KHÔNG mount backup dir → phải docker cp vào trước
docker cp $BK/pre_deploy_$TS.dump erp_postgres:/tmp/check_$TS.dump
docker exec erp_postgres pg_restore -l /tmp/check_$TS.dump | head   # list được = dump OK (vd ~1091 TOC)
docker exec erp_postgres pg_restore -l /tmp/check_$TS.dump | wc -l
docker exec erp_postgres rm /tmp/check_$TS.dump
tar tzf $BK/postgres_volume_$TS.tar.gz | head                                  # list được = tar OK
tar tzf $BK/uploads_$TS.tar.gz | head
ls -lh $BK/*_$TS.*                                                             # ghi lại size
sha256sum $BK/*_$TS.* >> $BK/checksums.log
```
**GATE**: nếu bất kỳ lệnh verify nào lỗi → DỪNG, backup hỏng, KHÔNG deploy.

---

## Phase 1 — PULL (fast-forward only)

```bash
cd <PROJECT_DIR>
git fetch origin
git merge --ff-only origin/main       # KHÔNG tạo merge commit; fail nếu diverged
git log --oneline -1                  # xác nhận HEAD mới
```
**GATE**: nếu `--ff-only` fail (prod diverged) → DỪNG, KHÔNG force. Điều tra vì sao prod có commit lạ.

---

## Phase 2 — REBUILD + HEALTH VERIFY (không đụng postgres/redis)

```bash
docker compose build backend frontend
docker compose up -d --no-deps backend frontend
```

### 2.1 Health verify ĐỘC LẬP (bắt buộc trước smoke test)
```bash
sleep 15
docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'erp_backend|erp_frontend'   # phải (healthy)
# ⚠️ Production backend thường KHÔNG log dây chuyền boot ra stdout (chỉ thấy dòng dotenv) —
# tin cậy healthcheck HTTP: exit 0 nghĩa là GET /health trả 200 (Express đã boot).
docker inspect erp_backend --format 'health={{.State.Health.Status}}' && \
  docker inspect erp_backend --format '{{range .State.Health.Log}}{{.ExitCode}} {{end}}' | tail -c 20
docker compose logs --tail 40 backend | grep -iE 'TSError|error TS|crash|Cannot find module'  # PHẢI trống
```
**GATE**: nếu backend không `healthy` sau ~40s hoặc có TSError/crash trong log → rollback ngay (Phase 5 Mode A).

---

## Phase 3 — MIGRATE (chỉ khi có migration mới)

```bash
docker compose exec -T backend npx prisma migrate deploy
```
- "No pending migrations to apply" → bỏ qua, bình thường.
- Có migration additive đã duyệt ở Phase 0.2 → apply, xác nhận không lỗi.
**GATE**: migrate lỗi → rollback (Phase 5 Mode B — có restore DB).

---

## Phase 4 — SMOKE TEST

```bash
# ⚠️ PHẢI kèm Host header của domain thật — curl http(s)://localhost/api/... rơi vào nginx
#    default server (301 → HTTPS rỗng, content-length 0) chứ KHÔNG qua backend.
#    401 JSON "Không có token xác thực" hoặc 200 = Express + auth middleware sống.
for ep in /api/employees /api/orders /api/repair-requests; do
  printf "%s -> %s\n" "$ep" "$(curl -sk -o /dev/null -w '%{http_code}' -H 'Host: <DOMAIN>' https://localhost$ep)"
done
# Nếu deploy feature cụ thể: test endpoint của feature đó
# DB: xác nhận migration effect nếu có (VD cột mới)
docker compose exec -T postgres psql -U erp_user -d erp_database -c \
  "SELECT column_name FROM information_schema.columns WHERE table_schema='common' AND table_name='repair_requests' AND column_name='<cot_moi>';"
docker compose logs --tail 30 backend | grep -iE 'error|exception' || echo "log sạch"
```
**GATE**: endpoint chính không phản hồi (000/5xx) hoặc body không phải JSON API → rollback.

---

## Phase 5 — REPORT + ROLLBACK MATRIX

### Report ghi lại
- Commit: `<old>` → `<new>` (số commit)
- Migration: applied gì / none
- Downtime thực tế (~8-15s)
- Backup files + đã verify + disk còn lại
- Smoke test kết quả

### Rollback

**Mode A — chỉ code, KHÔNG migration** (nhanh, đa số trường hợp):
```bash
cd <PROJECT_DIR> && git reset --hard <OLD_HEAD>
docker compose build backend frontend && docker compose up -d --no-deps backend frontend
```

**Mode B — có migration (nhất là destructive)** — phải restore DB:
```bash
cd <PROJECT_DIR> && git reset --hard <OLD_HEAD>
docker compose exec -T postgres pg_restore -U erp_user -d erp_database --clean --if-exists < <BACKUP_DIR>/pre_deploy_<TS>.dump
docker compose build backend frontend && docker compose up -d --no-deps backend frontend
```
> Migration additive (chỉ CREATE) + rollback code: bảng mới còn lại nhưng vô hại, thường KHÔNG cần restore DB.

---

## Lưu ý vận hành

- **Downtime**: rebuild recreate backend/frontend ngắt ~8-15s. Chọn giờ vắng hoặc báo trước cho người đang nhập liệu.
- **Retention backup**: giữ 7 bản pre-deploy gần nhất, dọn cũ hơn:
  ```bash
  ls -t <BACKUP_DIR>/pre_deploy_*.dump | tail -n +8 | xargs -r rm
  ```
- **KHÔNG dùng** `docker compose down -v` (xóa volume = mất DB). KHÔNG `git push --force` lên prod.
