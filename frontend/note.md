Thiếu Global State Managemen
Validation Không Đồng Nhất ( zod)
Critical | Rate Limiting | Low | High |
| 🔴 Critical | Password Policy | Low | High |
| 🔴 Critical | Input Sanitization | Medium | High |
| 🟠 High | Unit Tests | High | High |
| 🟠 High | Error Handling | Medium | Medium |
| 🟠 High | State Management | Medium | Medium |
| 🟡 Medium | API Documentation | Medium | Medium |
| 🟡 Medium | Logging | Low | Medium |
| 🟢 Low | Security Headers


CRITICAL - Cần Sửa Ngay**

### 1. **Thiếu Rate Limiting** ⚠️
**Vấn đề:** Không có rate limiting cho API endpoints, đặc biệt là `/api/auth/login`

**Tác động:** 
- Dễ bị brute force attack
- DoS attacks có thể làm sập server

**Ví dụ cụ thể:**
```typescript
// backend/src/routes/authRoutes.ts - Không có rate limiting
router.post('/login', validate([...]), (req, res) => authController.login(req, res));
```

**Giải pháp:**
```typescript
// Thêm express-rate-limit
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // 5 lần thử
  message: 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút'
});

router.post('/login', loginLimiter, validate([...]), authController.login);
```

---

### 2. **Password Policy Yếu** ⚠️
**Vấn đề:** Chỉ yêu cầu password >= 6 ký tự

**Ví dụ:**
```typescript
// backend/src/services/authService.ts
if (password.length < 6) {
  throw new ValidationError('Password must be at least 6 characters');
}
```

**Giải pháp:**
```typescript
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
if (!passwordRegex.test(password)) {
  throw new ValidationError('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt');
}
```

---

### 3. **Thiếu Input Sanitization** ⚠️
**Vấn đề:** Không sanitize input trước khi lưu vào database

**Ví dụ:**
```typescript
// backend/src/services/internationalCustomerService.ts
async createCustomer(data: any): Promise<any> {
  // Không sanitize data.tenCongTy, data.nguoiLienHe, etc.
  // Có thể bị XSS khi hiển thị trên frontend
}
```

**Giải pháp:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizedData = {
  tenCongTy: DOMPurify.sanitize(data.tenCongTy),
  nguoiLienHe: DOMPurify.sanitize(data.nguoiLienHe),
  // ...
};
```

---

## 🟠 **HIGH - Cần Cải Thiện Sớm**

### 4. **Thiếu Unit Tests**
**Vấn đề:** Không có test files trong project

**Tác động:**
- Không đảm bảo code hoạt động đúng sau khi refactor
- Khó maintain khi project lớn lên
- Không có regression testing

**Giải pháp:**
```
backend/
├── src/
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── authService.test.ts
│   │   │   ├── employeeService.test.ts
│   │   └── controllers/
│   └── integration/
│       ├── auth.test.ts
│       └── employee.test.ts
```

---

### 5. **Inconsistent Error Handling**
**Vấn đề:** Mỗi controller xử lý lỗi khác nhau

**Ví dụ 1 - Dùng try-catch riêng:**
```typescript
// backend/src/controllers/generalCostController.ts
async createGeneralCost(req: Request, res: Response) {
  try {
    const generalCost = await generalCostService.createGeneralCost(req.body);
    res.status(201).json(generalCost); // Không có success: true
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi...', error: error.message });
  }
}
```

**Ví dụ 2 - Dùng next(error):**
```typescript
// backend/src/routes/materialEvaluationCriteriaRoutes.ts
async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const criteria = await materialEvaluationCriteriaService.getAllCriteria();
    res.json({ success: true, data: criteria });
  } catch (error) {
    next(error); // Đúng cách
  }
}
```

**Giải pháp:** Tạo wrapper function:
```typescript
// utils/asyncHandler.ts
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Sử dụng
router.get('/', asyncHandler(controller.getAll));
```

---

### 6. **Thiếu Global State Management (Frontend)**
**Vấn đề:** Chỉ có AuthContext, không có global state cho data

**Ví dụ - Mỗi component tự fetch data:**
```typescript
// frontend/src/components/EmployeeManagement.tsx
const loadEmployees = async () => {
  const response = await employeeService.getAllEmployees(1, 100);
  setEmployees(response.data);
};

// frontend/src/pages/quality/QualityPersonnel.tsx  
const loadEmployees = async () => {
  const response = await employeeService.getAllEmployees(1, 1000);
  setEmployees(response.data);
};
```

**Tác động:**
- Duplicate API calls
- Không có caching
- Khó sync data giữa các components

**Giải pháp:** Sử dụng React Query hoặc Zustand:
```typescript
// hooks/useEmployees.ts
import { useQuery } from '@tanstack/react-query';

export const useEmployees = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAllEmployees(1, 1000),
    staleTime: 5 * 60 * 1000, // Cache 5 phút
  });
};
```

---

### 7. **Validation Không Đồng Nhất**
**Vấn đề:** Backend dùng custom validation, Frontend dùng Zod - không sync

**Backend:**
```typescript
// backend/src/middlewares/validation.ts
validate([
  { field: 'email', required: true, type: 'email' },
  { field: 'password', required: true, type: 'string', minLength: 6 },
])
```

**Frontend:**
```typescript
// frontend/src/schemas/requestSchemas.ts
export const loginSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1).min(6),
});
```

**Giải pháp:** Dùng Zod cả 2 phía hoặc share validation schemas

---

## 🟡 **MEDIUM - Nên Cải Thiện**

### 8. **Thiếu API Documentation**
**Vấn đề:** Không có Swagger/OpenAPI documentation

**Giải pháp:** Thêm swagger-jsdoc + swagger-ui-express

---

### 9. **Logging Không Đầy Đủ**
**Vấn đề:** Chỉ dùng `console.log/console.error`

**Ví dụ:**
```typescript
console.error('Error creating general cost:', error);
```

**Giải pháp:** Dùng Winston hoặc Pino với log levels và file rotation

---

### 10. **Thiếu Database Indexing Review**
**Vấn đề:** Có thể thiếu indexes cho các trường thường query

**Giải pháp:** Review và thêm indexes trong Prisma schema:
```prisma
model Employee {
  // ...
  @@index([departmentId])
  @@index([status])
  @@index([hireDate])
}
```

---

### 11. **Mixed Language trong Code**
**Vấn đề:** Enum và field names dùng tiếng Việt có dấu

**Ví dụ:**
```prisma
enum MachineStatus {
  HOAT_DONG
  BẢO_TRÌ        // Có dấu tiếng Việt
  NGỪNG_HOẠT_ĐỘNG
}
```

**Tác động:** Có thể gây issues với encoding, khó maintain

---

### 12. **Temp Files Cần Cleanup**
**Vấn đề:** Có các file tạm trong repo
- `backend/temp_migration.sql`
- `backend/temp_routes.txt`
- `backend/test-leave-requests.ts`

**Giải pháp:** Xóa hoặc thêm vào `.gitignore`

---

## 🟢 **LOW - Nice to Have**

### 13. **Thiếu Health Check Endpoint Chi Tiết**
```typescript
// Hiện tại chỉ check server running
// Nên thêm check database connection, memory usage, etc.
```

### 14. **Thiếu Request ID Tracking**
Thêm correlation ID cho mỗi request để dễ debug

### 15. **Thiếu Compression Middleware**
```typescript
import compression from 'compression';
app.use(compression());
```

### 16. **Thiếu Security Headers**
```typescript
import helmet from 'helmet';
app.use(helmet());
```

---

## 📋 **Tóm Tắt Ưu Tiên**

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 🔴 Critical | Rate Limiting | Low | High |
| 🔴 Critical | Password Policy | Low | High |
| 🔴 Critical | Input Sanitization | Medium | High |
| 🟠 High | Unit Tests | High | High |
| 🟠 High | Error Handling | Medium | Medium |
| 🟠 High | State Management | Medium | Medium |
| 🟡 Medium | API Documentation | Medium | Medium |
| 🟡 Medium | Logging | Low | Medium |
| 🟢 Low | Security Headers
