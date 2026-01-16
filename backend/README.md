# ERP System Backend API

Backend API cho hệ thống ERP được xây dựng với Node.js, Express, TypeScript, và PostgreSQL.

## 🚀 Công nghệ sử dụng

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Database
- **Prisma** - ORM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## 📋 Yêu cầu

- Node.js >= 16.x
- npm hoặc yarn
- PostgreSQL >= 12.x

## 🔧 Setup

### 1. Clone repository và cài dependencies

```bash
cd backend
npm install
```

### 2. Cấu hình environment variables

```bash
cp .env.example .env
```

Cập nhật các giá trị trong `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/erp_db
JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
CORS_ORIGIN=http://localhost:5173
```

### 3. Tạo database

```bash
createdb erp_db
```

### 4. Chạy migrations

```bash
npm run prisma:migrate
```

### 5. Khởi động server

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:5000`

## 📁 Cấu trúc dự án

```
backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middlewares/     # Express middlewares
│   ├── services/        # Business logic
│   ├── config/          # Configuration files
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   └── index.ts         # Application entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── dist/                # Compiled JavaScript
├── .env                 # Environment variables
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

## 🔐 Authentication

API sử dụng JWT (JSON Web Tokens) cho authentication.

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "EMPLOYEE"
    }
  }
}
```

### Register

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Refresh Token

```bash
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

### Logout

```bash
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

## 📝 Available Scripts

- `npm run dev` - Chạy server ở development mode
- `npm run build` - Build TypeScript thành JavaScript
- `npm start` - Chạy server ở production mode
- `npm run lint` - Kiểm tra code style
- `npm run lint:fix` - Tự động fix code style
- `npm run format` - Format code với Prettier
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Chạy database migrations
- `npm run prisma:migrate:prod` - Chạy migrations ở production
- `npm run prisma:seed` - Seed database với dữ liệu mẫu
- `npm run prisma:studio` - Mở Prisma Studio

## 🔑 User Roles

- **ADMIN** - Quản trị viên hệ thống
- **MANAGER** - Quản lý
- **QC_STAFF** - Nhân viên QC
- **EMPLOYEE** - Nhân viên
- **HR** - Nhân sự

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Header

```
Authorization: Bearer <accessToken>
```

## 🐛 Troubleshooting

### Database connection error

Kiểm tra:
- PostgreSQL đang chạy
- DATABASE_URL đúng trong .env
- Database đã được tạo

### Port already in use

Thay đổi PORT trong .env hoặc kill process đang sử dụng port 5000

### Prisma migration error

```bash
npm run prisma:migrate -- --name init
```

## 📄 License

ISC

