#!/bin/bash
# ============================================
# ERP System - Health Monitor
# Kiểm tra sức khỏe hệ thống
# ============================================

PROJECT_DIR="/opt/erp"
BACKUP_DIR="/opt/erp-backups"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=====================================${NC}"
echo -e "${CYAN}  ERP SYSTEM HEALTH CHECK${NC}"
echo -e "${CYAN}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${CYAN}=====================================${NC}"

# === 1. DOCKER CONTAINERS ===
echo -e "\n${CYAN}📦 Container Status:${NC}"
docker compose -f "$PROJECT_DIR/docker-compose.yml" ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || echo "Không thể kết nối Docker"

# Đếm container healthy/unhealthy
TOTAL=$(docker compose -f "$PROJECT_DIR/docker-compose.yml" ps -q 2>/dev/null | wc -l)
RUNNING=$(docker compose -f "$PROJECT_DIR/docker-compose.yml" ps --filter "status=running" -q 2>/dev/null | wc -l)
if [ "$TOTAL" -eq "$RUNNING" ] && [ "$TOTAL" -gt 0 ]; then
    echo -e "${GREEN}✅ Tất cả $TOTAL containers đang chạy${NC}"
else
    echo -e "${RED}❌ Chỉ $RUNNING/$TOTAL containers đang chạy${NC}"
fi

# === 2. DISK USAGE ===
echo -e "\n${CYAN}💾 Disk Usage:${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
DISK_TOTAL=$(df -h / | awk 'NR==2 {print $2}')
DISK_AVAIL=$(df -h / | awk 'NR==2 {print $4}')

if [ "$DISK_USAGE" -gt 90 ]; then
    echo -e "${RED}🚨 NGUY HIỂM: Disk ${DISK_USAGE}% (còn $DISK_AVAIL / $DISK_TOTAL)${NC}"
elif [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${YELLOW}⚠️  CẢNH BÁO: Disk ${DISK_USAGE}% (còn $DISK_AVAIL / $DISK_TOTAL)${NC}"
else
    echo -e "${GREEN}✅ Disk: ${DISK_USAGE}% (còn $DISK_AVAIL / $DISK_TOTAL)${NC}"
fi

# Docker disk usage
echo -e "\n${CYAN}🐳 Docker Disk:${NC}"
docker system df 2>/dev/null | head -5

# === 3. MEMORY ===
echo -e "\n${CYAN}🧠 Memory:${NC}"
MEM_TOTAL=$(free -h | awk 'NR==2 {print $2}')
MEM_USED=$(free -h | awk 'NR==2 {print $3}')
MEM_AVAIL=$(free -h | awk 'NR==2 {print $7}')
MEM_PCT=$(free | awk 'NR==2 {printf "%.0f", $3/$2*100}')

if [ "$MEM_PCT" -gt 90 ]; then
    echo -e "${RED}🚨 Memory: ${MEM_PCT}% (dùng $MEM_USED / $MEM_TOTAL, còn $MEM_AVAIL)${NC}"
elif [ "$MEM_PCT" -gt 80 ]; then
    echo -e "${YELLOW}⚠️  Memory: ${MEM_PCT}% (dùng $MEM_USED / $MEM_TOTAL, còn $MEM_AVAIL)${NC}"
else
    echo -e "${GREEN}✅ Memory: ${MEM_PCT}% (dùng $MEM_USED / $MEM_TOTAL, còn $MEM_AVAIL)${NC}"
fi

# === 4. DATABASE ===
echo -e "\n${CYAN}🗄️  Database:${NC}"
DB_SIZE=$(docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
    psql -U erp_user -d erp_database -t -c \
    "SELECT pg_size_pretty(pg_database_size('erp_database'));" 2>/dev/null | xargs)

if [ -n "$DB_SIZE" ]; then
    echo -e "${GREEN}✅ Database size: $DB_SIZE${NC}"

    # Số connections
    CONN=$(docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
        psql -U erp_user -d erp_database -t -c \
        "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)
    echo "   Active connections: $CONN"
else
    echo -e "${RED}❌ Không thể kết nối database${NC}"
fi

# === 5. API HEALTH ===
echo -e "\n${CYAN}🌐 API Health:${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ API responding (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ API không phản hồi (HTTP $HTTP_CODE)${NC}"
fi

# === 6. BACKUP STATUS ===
echo -e "\n${CYAN}📋 Backup gần nhất:${NC}"
if [ -d "$BACKUP_DIR/daily" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR/daily"/db_*.dump 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" 2>/dev/null | cut -d'.' -f1)
        BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
        HOURS_AGO=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))

        if [ "$HOURS_AGO" -gt 48 ]; then
            echo -e "${RED}🚨 Backup cũ ${HOURS_AGO}h trước: $BACKUP_DATE ($BACKUP_SIZE)${NC}"
        elif [ "$HOURS_AGO" -gt 25 ]; then
            echo -e "${YELLOW}⚠️  Backup ${HOURS_AGO}h trước: $BACKUP_DATE ($BACKUP_SIZE)${NC}"
        else
            echo -e "${GREEN}✅ Backup ${HOURS_AGO}h trước: $BACKUP_DATE ($BACKUP_SIZE)${NC}"
        fi
    else
        echo -e "${RED}❌ Không tìm thấy backup nào!${NC}"
    fi

    DAILY_COUNT=$(find "$BACKUP_DIR/daily" -name "db_*.dump" | wc -l)
    WEEKLY_COUNT=$(find "$BACKUP_DIR/weekly" -name "db_*.dump" 2>/dev/null | wc -l)
    MONTHLY_COUNT=$(find "$BACKUP_DIR/monthly" -name "db_*.dump" 2>/dev/null | wc -l)
    echo "   Tổng: daily=$DAILY_COUNT, weekly=$WEEKLY_COUNT, monthly=$MONTHLY_COUNT"
else
    echo -e "${YELLOW}⚠️  Thư mục backup chưa tồn tại${NC}"
fi

echo -e "\n${CYAN}=====================================${NC}"

