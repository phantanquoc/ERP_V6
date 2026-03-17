# ============================================
# ERP System - Backup Script (Windows)
# Backup database PostgreSQL + uploads
# Chạy tự động qua Task Scheduler hoặc thủ công
# ============================================

param(
    [string]$ProjectDir = "C:\ERP",
    [string]$BackupDir = "C:\ERP\backups",
    [int]$DailyRetention = 7,
    [int]$WeeklyRetention = 30,
    [int]$MonthlyRetention = 365
)

$ErrorActionPreference = "Stop"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$DayOfWeek = (Get-Date).DayOfWeek.value__  # 0=CN, 1=T2...7
$DayOfMonth = (Get-Date).Day
$LogFile = Join-Path $BackupDir "backup.log"

function Write-Log {
    param([string]$Message)
    $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Write-Host $entry
    Add-Content -Path $LogFile -Value $entry -ErrorAction SilentlyContinue
}

# Tạo thư mục
foreach ($sub in @("daily", "weekly", "monthly")) {
    New-Item -ItemType Directory -Path (Join-Path $BackupDir $sub) -Force | Out-Null
}

Write-Log "=========================================="
Write-Log "  BAT DAU BACKUP ERP SYSTEM"
Write-Log "=========================================="

# Kiểm tra disk
$drive = (Get-Item $BackupDir).PSDrive
$freeGB = [math]::Round($drive.Free / 1GB, 1)
if ($freeGB -lt 5) {
    Write-Log "❌ Chi con ${freeGB}GB disk trong. Dung backup."
    exit 1
}
Write-Log "💾 Disk con ${freeGB}GB trong"

# === 1. BACKUP DATABASE ===
$DbFile = Join-Path $BackupDir "daily\db_${Date}.sql"
Write-Log "📦 Backup database..."

try {
    docker-compose -f "$ProjectDir\docker-compose.yml" exec -T postgres `
        pg_dump -U erp_user -Fc --compress=6 erp_database > $DbFile 2>$null

    if (Test-Path $DbFile) {
        $dbSize = [math]::Round((Get-Item $DbFile).Length / 1MB, 1)
        Write-Log "✅ Database backup OK: db_${Date}.sql (${dbSize}MB)"
    } else {
        throw "File backup khong duoc tao"
    }
} catch {
    Write-Log "❌ Database backup THAT BAI: $_"
    Remove-Item $DbFile -ErrorAction SilentlyContinue
    exit 1
}

# === 2. BACKUP UPLOADS ===
$UploadsFile = Join-Path $BackupDir "daily\uploads_${Date}.zip"
Write-Log "📁 Backup uploads..."

try {
    $tempDir = Join-Path $env:TEMP "erp_uploads_$Date"
    docker cp erp_backend:/app/uploads $tempDir 2>$null

    if (Test-Path $tempDir) {
        Compress-Archive -Path $tempDir -DestinationPath $UploadsFile -Force
        $uploadsSize = [math]::Round((Get-Item $UploadsFile).Length / 1MB, 1)
        Write-Log "✅ Uploads backup OK (${uploadsSize}MB)"
        Remove-Item $tempDir -Recurse -Force
    } else {
        Write-Log "⚠️  Uploads backup bo qua (khong co file)"
    }
} catch {
    Write-Log "⚠️  Uploads backup bo qua: $_"
}

# === 3. WEEKLY BACKUP (Chu nhat) ===
if ($DayOfWeek -eq 0) {
    Copy-Item $DbFile (Join-Path $BackupDir "weekly\db_weekly_${Date}.sql")
    if (Test-Path $UploadsFile) {
        Copy-Item $UploadsFile (Join-Path $BackupDir "weekly\uploads_weekly_${Date}.zip")
    }
    Write-Log "📦 Weekly backup da tao"
}

# === 4. MONTHLY BACKUP (Ngay 1) ===
if ($DayOfMonth -eq 1) {
    Copy-Item $DbFile (Join-Path $BackupDir "monthly\db_monthly_${Date}.sql")
    if (Test-Path $UploadsFile) {
        Copy-Item $UploadsFile (Join-Path $BackupDir "monthly\uploads_monthly_${Date}.zip")
    }
    Write-Log "📦 Monthly backup da tao"
}

# === 5. XOA BACKUP CU ===
Write-Log "🗑️  Don backup cu..."
$now = Get-Date

Get-ChildItem (Join-Path $BackupDir "daily") -File |
    Where-Object { $_.LastWriteTime -lt $now.AddDays(-$DailyRetention) } |
    Remove-Item -Force

Get-ChildItem (Join-Path $BackupDir "weekly") -File |
    Where-Object { $_.LastWriteTime -lt $now.AddDays(-$WeeklyRetention) } |
    Remove-Item -Force

Get-ChildItem (Join-Path $BackupDir "monthly") -File |
    Where-Object { $_.LastWriteTime -lt $now.AddDays(-$MonthlyRetention) } |
    Remove-Item -Force

$dailyCount = (Get-ChildItem (Join-Path $BackupDir "daily") -File).Count
$weeklyCount = (Get-ChildItem (Join-Path $BackupDir "weekly") -File).Count
$monthlyCount = (Get-ChildItem (Join-Path $BackupDir "monthly") -File).Count
Write-Log "📊 Tong backup: daily=$dailyCount, weekly=$weeklyCount, monthly=$monthlyCount"

Write-Log "=========================================="
Write-Log "  BACKUP HOAN TAT"
Write-Log "=========================================="

