# 🚀 Playbook Deploy Production — ERP_V6

Quy trình deploy prod an toàn, ưu tiên **KHÔNG BAO GIỜ MẤT DỮ LIỆU**.
Áp dụng cho VPS Linux (Docker Compose). Chạy tuần tự Phase 0 → 5.

> **Nguyên tắc**: Backup TRƯỚC mọi thứ, kể cả khi không có migration.
> Không phase nào được bỏ qua trừ khi ghi rõ điều kiện.

---

## Thông tin hạ tầng

- **VPS**: `erp@14.224.233.11 -p 2223`
- **Project dir**: `/home/erp/ERP_V6`
- **Backup dir**: `/backup/erp-backups/pre-deploy/`
- **Containers**: erp_backend, erp_frontend, erp_postgres, erp_redis, erp_ai, erp_nginx (+ portainer, netdata)
- **DB**: postgres user `erp_user`, db `erp_database`

---

## Phase 0 — PRE-FLIGHT + BACKUP 3 LỚP (BẮT BUỘC)

### 0.1 Pre-flight check
```bash
cd /home/erp/ERP_V6
git status --short                    # phải sạch, không uncommitted trên prod
git log --oneline -1                  # HEAD hiện tại (ghi lại để rollback)
git fetch origin
git log --oneline HEAD..origin/main   # xem sẽ pull bao nhiêu commit
df -h /backup /                       # disk phải đủ (> tổng size backup dưới)
docker ps --format '{{.Names}}\t{{.Status}}'  # container đang healthy
```
**GATE**: nếu working tree bẩn → DỪNG, hỏi user. Nếu disk `/backup` < 5GB trống → DỪNG.

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
BK=/backup/erp-backups/pre-deploy
mkdir -p $BK
# Lớp 1: pg_dump custom format
docker compose exec -T postgres pg_dump -U erp_user -Fc erp_database > $BK/pre_deploy_$TS.dump
# Lớp 2: postgres volume
docker run --rm -v erp_postgres_data:/data -v $BK:/backup alpine tar czf /backup/postgres_volume_$TS.tar.gz -C /data .
# Lớp 3: uploads
docker compose exec -T backend tar czf - -C /app uploads > $BK/uploads_$TS.tar.gz
```

### 0.4 VERIFY backup readable (không chỉ checksum)
```bash
docker compose exec -T postgres pg_restore -l $BK/pre_deploy_$TS.dump | head   # list được = dump OK
tar tzf $BK/postgres_volume_$TS.tar.gz | head                                  # list được = tar OK
tar tzf $BK/uploads_$TS.tar.gz | head
ls -lh $BK/*_$TS.*                                                             # ghi lại size
sha256sum $BK/*_$TS.* >> $BK/checksums.log
```
**GATE**: nếu bất kỳ lệnh verify nào lỗi → DỪNG, backup hỏng, KHÔNG deploy.

---

## Phase 1 — PULL (fast-forward only)

```bash
cd /home/erp/ERP_V6
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
docker compose logs --tail 40 backend | grep -iE 'Server is running|Registered.*routes'  # boot OK
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
# Health + auth + vài endpoint chính (điều chỉnh theo feature vừa deploy)
curl -s -o /dev/null -w '%{http_code}' http://localhost/api/employees        # 200/401 = server sống
curl -s -o /dev/null -w '%{http_code}' http://localhost/api/orders
# Nếu deploy feature cụ thể: test endpoint của feature đó
docker compose logs --tail 30 backend | grep -iE 'error|exception' || echo "log sạch"
```
**GATE**: endpoint chính không phản hồi (000/5xx) → rollback.

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
cd /home/erp/ERP_V6 && git reset --hard <OLD_HEAD>
docker compose build backend frontend && docker compose up -d --no-deps backend frontend
```

**Mode B — có migration (nhất là destructive)** — phải restore DB:
```bash
cd /home/erp/ERP_V6 && git reset --hard <OLD_HEAD>
docker compose exec -T postgres pg_restore -U erp_user -d erp_database --clean --if-exists < /backup/erp-backups/pre-deploy/pre_deploy_<TS>.dump
docker compose build backend frontend && docker compose up -d --no-deps backend frontend
```
> Migration additive (chỉ CREATE) + rollback code: bảng mới còn lại nhưng vô hại, thường KHÔNG cần restore DB.

---

## Lưu ý vận hành

- **Downtime**: rebuild recreate backend/frontend ngắt ~8-15s. Chọn giờ vắng hoặc báo trước cho người đang nhập liệu.
- **Retention backup**: giữ 7 bản pre-deploy gần nhất, dọn cũ hơn:
  ```bash
  ls -t /backup/erp-backups/pre-deploy/pre_deploy_*.dump | tail -n +8 | xargs -r rm
  ```
- **KHÔNG dùng** `docker compose down -v` (xóa volume = mất DB). KHÔNG `git push --force` lên prod.

