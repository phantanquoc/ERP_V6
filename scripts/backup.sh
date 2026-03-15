#!/bin/bash
# ============================================
# ERP System - Backup Script
# Backup database PostgreSQL + uploads
# Chạy tự động qua cron hoặc thủ công
# ============================================

set -euo pipefail

# === CẤU HÌNH ===
BACKUP_DIR="/opt/erp-backups"
PROJECT_DIR="/opt/erp"
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)   # 1=Thứ 2, 7=Chủ nhật
DAY_OF_MONTH=$(date +%d)
LOG_FILE="$BACKUP_DIR/backup.log"

# Retention policy (số ngày giữ backup)
DAILY_RETENTION=7
WEEKLY_RETENTION=30
MONTHLY_RETENTION=365

# Load biến môi trường
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
else
    echo "❌ Không tìm thấy file .env tại $PROJECT_DIR/.env"
    exit 1
fi

# Giá trị mặc định nếu .env không có
POSTGRES_USER="${POSTGRES_USER:-erp_user}"
POSTGRES_DB="${POSTGRES_DB:-erp_database}"

# === HÀM TIỆN ÍCH ===
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_disk_space() {
    local available
    available=$(df -BG "$BACKUP_DIR" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [ "$available" -lt 5 ]; then
        log "⚠️  CẢNH BÁO: Chỉ còn ${available}GB disk trống!"
        return 1
    fi
    return 0
}

# === TẠO THƯ MỤC ===
mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly}

log "=========================================="
log "  BẮT ĐẦU BACKUP ERP SYSTEM"
log "=========================================="

# Kiểm tra disk
if ! check_disk_space; then
    log "❌ Không đủ dung lượng disk. Dừng backup."
    exit 1
fi

# === 1. BACKUP DATABASE ===
DB_FILE="$BACKUP_DIR/daily/db_${DATE}.dump"
log "📦 Backup database..."

if docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --format=custom --compress=6 \
    > "$DB_FILE" 2>/dev/null; then

    DB_SIZE=$(du -h "$DB_FILE" | cut -f1)
    log "✅ Database backup OK: db_${DATE}.dump ($DB_SIZE)"
else
    log "❌ Database backup THẤT BẠI!"
    rm -f "$DB_FILE"
    exit 1
fi

# === 2. BACKUP UPLOADS ===
UPLOADS_FILE="$BACKUP_DIR/daily/uploads_${DATE}.tar.gz"
log "📁 Backup uploads..."

TEMP_DIR=$(mktemp -d)
if docker compose -f "$PROJECT_DIR/docker-compose.yml" cp \
    backend:/app/uploads "$TEMP_DIR/uploads" 2>/dev/null; then

    tar -czf "$UPLOADS_FILE" -C "$TEMP_DIR" uploads 2>/dev/null
    UPLOADS_SIZE=$(du -h "$UPLOADS_FILE" | cut -f1)
    log "✅ Uploads backup OK ($UPLOADS_SIZE)"
else
    log "⚠️  Uploads backup bỏ qua (không có file hoặc container không chạy)"
fi
rm -rf "$TEMP_DIR"

# === 3. WEEKLY BACKUP (Chủ nhật) ===
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp "$DB_FILE" "$BACKUP_DIR/weekly/db_weekly_${DATE}.dump"
    [ -f "$UPLOADS_FILE" ] && cp "$UPLOADS_FILE" "$BACKUP_DIR/weekly/uploads_weekly_${DATE}.tar.gz"
    log "📦 Weekly backup đã tạo"
fi

# === 4. MONTHLY BACKUP (Ngày 1) ===
if [ "$DAY_OF_MONTH" = "01" ]; then
    cp "$DB_FILE" "$BACKUP_DIR/monthly/db_monthly_${DATE}.dump"
    [ -f "$UPLOADS_FILE" ] && cp "$UPLOADS_FILE" "$BACKUP_DIR/monthly/uploads_monthly_${DATE}.tar.gz"
    log "📦 Monthly backup đã tạo"
fi

# === 5. XÓA BACKUP CŨ ===
log "🗑️  Dọn backup cũ..."
find "$BACKUP_DIR/daily" -type f -mtime +$DAILY_RETENTION -delete 2>/dev/null
find "$BACKUP_DIR/weekly" -type f -mtime +$WEEKLY_RETENTION -delete 2>/dev/null
find "$BACKUP_DIR/monthly" -type f -mtime +$MONTHLY_RETENTION -delete 2>/dev/null

DAILY_COUNT=$(find "$BACKUP_DIR/daily" -type f | wc -l)
WEEKLY_COUNT=$(find "$BACKUP_DIR/weekly" -type f | wc -l)
MONTHLY_COUNT=$(find "$BACKUP_DIR/monthly" -type f | wc -l)
log "📊 Tổng backup: daily=$DAILY_COUNT, weekly=$WEEKLY_COUNT, monthly=$MONTHLY_COUNT"

log "=========================================="
log "  BACKUP HOÀN TẤT"
log "=========================================="

