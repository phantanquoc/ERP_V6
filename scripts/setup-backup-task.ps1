# ============================================
# ERP System - Setup Backup Task Scheduler
# Chạy script này 1 lần với quyền Administrator
# để đăng ký backup tự động mỗi ngày lúc 2h sáng
# ============================================

param(
    [string]$ProjectDir = "C:\ERP",
    [string]$TaskName = "ERP_Daily_Backup",
    [string]$Time = "2am"
)

$scriptPath = Join-Path $ProjectDir "scripts\backup.ps1"

if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Khong tim thay: $scriptPath" -ForegroundColor Red
    exit 1
}

# Xóa task cũ nếu có
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "🗑️  Da xoa task cu: $TaskName" -ForegroundColor Yellow
}

# Tạo task mới
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -ProjectDir `"$ProjectDir`""

$trigger = New-ScheduledTaskTrigger -Daily -At $Time

$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 5)

$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "ERP System - Backup database + uploads hang ngay luc $Time"

Write-Host ""
Write-Host "✅ Da dang ky Task Scheduler:" -ForegroundColor Green
Write-Host "   Task:    $TaskName"
Write-Host "   Script:  $scriptPath"
Write-Host "   Lich:    Moi ngay luc $Time"
Write-Host ""
Write-Host "Kiem tra: Get-ScheduledTask -TaskName '$TaskName'"
Write-Host "Chay thu: Start-ScheduledTask -TaskName '$TaskName'"

