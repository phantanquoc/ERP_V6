#!/bin/bash
# ============================================
# ERP System - Restore Database
# ⚠️  CẢNH BÁO: Script này GHI ĐÈ toàn bộ database!
# ============================================

set -euo pipefail

PROJECT_DIR="/opt/erp"
BACKUP_DIR="/opt/erp-backups"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load biến môi trường
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

POSTGRES_USER="${POSTGRES_USER:-erp_user}"
POSTGRES_DB="${POSTGRES_DB:-erp_database}"

# === CHỌN FILE BACKUP ===
if [ -n "${1:-}" ]; then
    BACKUP_FILE="$1"
else
    echo -e "${YELLOW}Các backup có sẵn:${NC}"
    echo ""
    echo "--- Daily ---"
    ls -lht "$BACKUP_DIR/daily"/db_*.dump 2>/dev/null | head -5 || echo "  (không có)"
    echo ""
    echo "--- Weekly ---"
    ls -lht "$BACKUP_DIR/weekly"/db_*.dump 2>/dev/null | head -5 || echo "  (không có)"
    echo ""
    echo "--- Monthly ---"
    ls -lht "$BACKUP_DIR/monthly"/db_*.dump 2>/dev/null | head -5 || echo "  (không có)"
    echo ""
    read -p "Nhập đường dẫn file backup: " BACKUP_FILE
fi

# Kiểm tra file tồn tại
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ File không tồn tại: $BACKUP_FILE${NC}"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo -e "${RED}╔══════════════════════════════════════════╗${NC}"
echo -e "${RED}║  ⚠️  CẢNH BÁO: RESTORE DATABASE          ║${NC}"
echo -e "${RED}║  Thao tác này sẽ GHI ĐÈ toàn bộ data!  ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "File backup: $BACKUP_FILE ($BACKUP_SIZE)"
echo "Database:    $POSTGRES_DB"
echo ""
read -p "Bạn có chắc chắn? Gõ 'YES' để tiếp tục: " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "Đã hủy restore."
    exit 0
fi

# === BACKUP TRƯỚC KHI RESTORE ===
echo -e "\n${YELLOW}📦 Tạo backup an toàn trước khi restore...${NC}"
SAFETY_FILE="$BACKUP_DIR/daily/db_before_restore_$(date +%Y%m%d_%H%M%S).dump"

docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --format=custom --compress=6 \
    > "$SAFETY_FILE" 2>/dev/null

echo -e "${GREEN}✅ Safety backup: $SAFETY_FILE${NC}"

# === RESTORE ===
echo -e "\n${YELLOW}🔄 Đang restore database...${NC}"

docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
    pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --clean --if-exists --no-owner --no-privileges \
    < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ RESTORE THÀNH CÔNG!${NC}"
    echo -e "Nếu cần rollback, dùng file: $SAFETY_FILE"
else
    echo -e "\n${RED}❌ Restore có lỗi (có thể một số warning là bình thường)${NC}"
    echo -e "File safety backup: $SAFETY_FILE"
fi

