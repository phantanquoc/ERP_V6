# 🚀 Hướng Dẫn Deploy ERP System lên Windows Server 2019

## 📋 Yêu Cầu Hệ Thống

- Windows Server 2019
- RAM tối thiểu: 4GB (khuyến nghị 8GB)
- Disk: 50GB trống
- Kết nối internet

---

## 📦 Bước 1: Cài Đặt Docker trên Windows Server 2019

### 1.1 Bật tính năng Containers

Mở **PowerShell với quyền Administrator** và chạy:

```powershell
# Cài đặt tính năng Containers
Install-WindowsFeature -Name Containers

# Restart server
Restart-Computer -Force
```

### 1.2 Cài đặt Docker

Sau khi restart, mở PowerShell Admin và chạy:

```powershell
# Cài đặt Docker provider
Install-Module -Name DockerMsftProvider -Repository PSGallery -Force

# Cài đặt Docker
Install-Package -Name docker -ProviderName DockerMsftProvider -Force

# Restart lần nữa
Restart-Computer -Force
```

### 1.3 Chuyển sang Linux Containers (BẮT BUỘC)

Vì project dùng Linux images, bạn cần bật WSL2:

```powershell
# Bật WSL
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Bật Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restart
Restart-Computer -Force
```

Sau khi restart, cài Docker Desktop for Windows:
1. Tải từ: https://www.docker.com/products/docker-desktop/
2. Cài đặt và chọn "Use WSL 2 based engine"
3. Khởi động Docker Desktop

### 1.4 Kiểm tra Docker

```powershell
docker --version
docker-compose --version
```

---

## 📁 Bước 2: Chuẩn Bị Source Code

### 2.1 Copy source code lên server

Có thể dùng một trong các cách:
- **Git clone** (nếu có Git trên server)
- **Copy thủ công** qua Remote Desktop
- **FTP/SFTP**

```powershell
# Tạo thư mục cho project
mkdir C:\ERP
cd C:\ERP

# Nếu dùng Git
git clone <your-repo-url> .
```

### 2.2 Tạo file .env

```powershell
# Copy file example
copy .env.production.example .env

# Mở và chỉnh sửa với notepad
notepad .env
```

**Cập nhật các giá trị trong .env:**

```env
# Database - ĐẶT MẬT KHẨU MẠNH!
POSTGRES_USER=erp_user
POSTGRES_PASSWORD=MatKhauRatManh123!@#
POSTGRES_DB=erp_database

# JWT - TẠO CHUỖI NGẪU NHIÊN!
JWT_SECRET=chuoi-ngau-nhien-dai-64-ky-tu-tro-len-cho-bao-mat
JWT_REFRESH_SECRET=chuoi-ngau-nhien-khac-cho-refresh-token

# Domain của bạn
CORS_ORIGIN=https://erp.yourdomain.com
API_URL=https://erp.yourdomain.com/api
VITE_API_URL=https://erp.yourdomain.com/api
```

---

## 🔐 Bước 3: Cấu Hình SSL Certificate

### 3.1 Tạo thư mục SSL

```powershell
mkdir nginx\ssl
```

### 3.2 Đặt SSL Certificate

Copy file certificate vào `nginx\ssl\`:
- `cert.pem` - SSL Certificate
- `key.pem` - Private Key

**Nếu chưa có SSL, tạo self-signed (chỉ để test):**

```powershell
# Cài OpenSSL trước, hoặc dùng Git Bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=erp.yourdomain.com"
```

---

## 🌐 Bước 5: Cấu Hình Domain

### 5.1 Cấu hình DNS

Trỏ domain của bạn về IP của server:
- Type: **A Record**
- Name: `erp` (hoặc `@` nếu dùng root domain)
- Value: IP của Windows Server

### 5.2 Mở Port trên Firewall

```powershell
# Mở port 80 (HTTP)
netsh advfirewall firewall add rule name="HTTP" dir=in action=allow protocol=tcp localport=80

# Mở port 443 (HTTPS)
netsh advfirewall firewall add rule name="HTTPS" dir=in action=allow protocol=tcp localport=443
```

---

## ✅ Bước 6: Kiểm Tra Hoạt Động

### 6.1 Test local

```powershell
# Test health endpoint
curl http://localhost/health

# Test API
curl http://localhost/api/health
```

### 6.2 Test từ trình duyệt

Truy cập: `https://erp.yourdomain.com`

---

## 🔧 Các Lệnh Quản Lý Thường Dùng

```powershell
# Xem containers đang chạy
docker-compose ps

# Stop tất cả
docker-compose down

# Restart một service
docker-compose restart backend

# Xem logs realtime
docker-compose logs -f --tail=100

# Update và rebuild
git pull
docker-compose build
docker-compose up -d

# Backup database
docker-compose exec postgres pg_dump -U erp_user erp_database > backup.sql

# Restore database
docker-compose exec -T postgres psql -U erp_user erp_database < backup.sql

# Xóa tất cả và làm lại (CẨN THẬN - MẤT DATA!)
docker-compose down -v
docker-compose up -d
```

---

## 🐛 Xử Lý Lỗi Thường Gặp

### Lỗi: "Cannot connect to database"
```powershell
# Kiểm tra postgres container
docker-compose logs postgres

# Đợi postgres khởi động xong (30s-1m)
docker-compose restart backend
```

### Lỗi: "Port already in use"
```powershell
# Tìm process đang dùng port
netstat -ano | findstr :80
netstat -ano | findstr :443

# Kill process (thay PID)
taskkill /PID <PID> /F
```

### Lỗi: "Permission denied" với uploads
```powershell
# Vào container và fix permission
docker-compose exec backend sh
chmod -R 755 /app/uploads
```

---

## 📊 Monitoring

### Xem resource usage
```powershell
docker stats
```

### Set up auto-restart khi server reboot
Docker Desktop tự động start với Windows. Các containers với `restart: unless-stopped` sẽ tự động chạy lại.

---

## 🔄 Cập Nhật Ứng Dụng

Khi có phiên bản mới:

```powershell
cd C:\ERP

# Pull code mới
git pull origin main

# Rebuild và deploy
docker-compose build
docker-compose up -d

# Chạy migration nếu có thay đổi database
docker-compose exec backend npx prisma migrate deploy
```

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. Logs: `docker-compose logs -f`
2. Container status: `docker-compose ps`
3. Disk space: `docker system df`
4. Network: `docker network ls`

## 🚀 Bước 4: Deploy với Docker Compose

### 4.1 Build và chạy

```powershell
cd C:\ERP

# Build tất cả images
docker-compose build

# Chạy tất cả services
docker-compose up -d
```

### 4.2 Chạy Prisma Migration

```powershell
# Vào container backend
docker-compose exec backend sh

# Trong container, chạy migration
npx prisma migrate deploy

# Seed data (nếu cần)
npx prisma db seed

# Thoát container
exit
```

### 4.3 Kiểm tra services

```powershell
# Xem status các containers
docker-compose ps

# Xem logs
docker-compose logs -f

# Xem logs từng service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

---

