-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "business";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "common";

-- CreateEnum
CREATE TYPE "auth"."UserRole" AS ENUM ('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "common"."EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "common"."ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "common"."ViolationLevel" AS ENUM ('LIGHT', 'MEDIUM', 'SERIOUS', 'CRITICAL');

-- CreateEnum
CREATE TYPE "common"."AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'OVERTIME');

-- CreateEnum
CREATE TYPE "common"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "common"."ContractType" AS ENUM ('PERMANENT', 'TEMPORARY', 'PROBATION', 'PART_TIME');

-- CreateEnum
CREATE TYPE "common"."EmployeeEducationLevel" AS ENUM ('HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE');

-- CreateEnum
CREATE TYPE "auth"."PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "common"."ResourceType" AS ENUM ('EMPLOYEE', 'DEPARTMENT', 'POSITION', 'PAYROLL', 'EVALUATION', 'QUALITY_CHECK', 'INSPECTION', 'RESPONSIBILITY', 'PRODUCT', 'REPORT');

-- CreateEnum
CREATE TYPE "business"."CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "common"."MaterialStandardType" AS ENUM ('RAW_MATERIAL', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "business"."QuotationStatus" AS ENUM ('DRAFT', 'DANG_CHO_PHAN_HOI', 'DANG_CHO_GUI_DON_HANG', 'DA_DAT_HANG', 'KHONG_DAT_HANG', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "business"."OrderProductionStatus" AS ENUM ('CHO_LEN_KE_HOACH', 'CHO_SAN_XUAT', 'DANG_SAN_XUAT', 'CHO_GIAO_HANG', 'DA_LEN_CONTAINER', 'DANG_VAN_CHUYEN', 'DA_GIAO_CHO_KHACH_HANG');

-- CreateEnum
CREATE TYPE "business"."OrderPaymentStatus" AS ENUM ('DA_THANH_TOAN_DOT_1', 'CHO_THANH_TOAN_DOT_2', 'DA_THANH_TOAN_DU');

-- CreateEnum
CREATE TYPE "business"."TaxReportStatus" AS ENUM ('CHUA_BAO_CAO', 'DANG_CAP_NHAT_HO_SO', 'DA_DAY_DU_HO_SO', 'DA_BAO_CAO', 'DA_QUYET_TOAN');

-- CreateEnum
CREATE TYPE "business"."MachineStatus" AS ENUM ('HOAT_DONG', 'BẢO_TRÌ', 'NGỪNG_HOẠT_ĐỘNG');

-- CreateEnum
CREATE TYPE "business"."SystemOperationStatus" AS ENUM ('DANG_HOAT_DONG', 'BAO_TRI', 'NGUNG_HOAT_DONG');

-- CreateEnum
CREATE TYPE "common"."DailyWorkReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "common"."TaskPriority" AS ENUM ('KHAN_CAP', 'CAO', 'TRUNG_BINH', 'THAP');

-- CreateEnum
CREATE TYPE "common"."WorkPlanStatus" AS ENUM ('CHUA_BAT_DAU', 'DANG_THUC_HIEN', 'HOAN_THANH', 'HUY');

-- CreateEnum
CREATE TYPE "common"."FeedbackType" AS ENUM ('GOP_Y', 'NEU_KHO_KHAN');

-- CreateEnum
CREATE TYPE "common"."FeedbackStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "common"."LeaveType" AS ENUM ('ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'EMERGENCY', 'COMPENSATORY');

-- CreateEnum
CREATE TYPE "common"."LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "common"."HalfDayPeriod" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateTable
CREATE TABLE "auth"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "auth"."UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" TEXT,
    "subDepartmentId" TEXT,
    "supervisor1Id" TEXT,
    "supervisor2Id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."login_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "action" "auth"."PermissionAction" NOT NULL,
    "resource" "common"."ResourceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."sub_departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."positions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."position_levels" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "kpiSalary" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "position_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."position_responsibilities" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "position_responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."employees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "gender" "common"."Gender",
    "dateOfBirth" TIMESTAMP(3),
    "phoneNumber" TEXT,
    "address" TEXT,
    "positionId" TEXT,
    "positionLevelId" TEXT,
    "subDepartmentId" TEXT,
    "status" "common"."EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "hireDate" TIMESTAMP(3) NOT NULL,
    "contractType" "common"."ContractType" NOT NULL DEFAULT 'PERMANENT',
    "educationLevel" "common"."EmployeeEducationLevel",
    "specialization" TEXT,
    "specialSkills" TEXT,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "kpiLevel" DOUBLE PRECISION,
    "responsibilityCode" TEXT,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "shirtSize" TEXT,
    "pantSize" TEXT,
    "shoeSize" TEXT,
    "bankAccount" TEXT,
    "lockerNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."employee_profiles" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "profileDocuments" TEXT,
    "activities" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."responsibilities" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."evaluations" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SELF_PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."evaluation_details" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "positionResponsibilityId" TEXT NOT NULL,
    "selfScore" DOUBLE PRECISION,
    "supervisorScore1" DOUBLE PRECISION,
    "supervisorScore2" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."notifications" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "period" TEXT,
    "evaluationId" TEXT,
    "taskId" TEXT,
    "acceptanceHandoverId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."products" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "description" TEXT,
    "productType" TEXT NOT NULL,
    "status" "common"."ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."quality_checks" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "checkCode" TEXT NOT NULL,
    "checkDate" TIMESTAMP(3) NOT NULL,
    "checkType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "reviewOpinion" TEXT NOT NULL,
    "checkedBy" TEXT NOT NULL,
    "checkedByCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."processes" (
    "id" TEXT NOT NULL,
    "maQuyTrinh" TEXT NOT NULL,
    "msnv" TEXT NOT NULL,
    "tenNhanVien" TEXT NOT NULL,
    "tenQuyTrinh" TEXT NOT NULL,
    "loaiQuyTrinh" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."process_flowcharts" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_flowcharts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."process_flowchart_sections" (
    "id" TEXT NOT NULL,
    "flowchartId" TEXT NOT NULL,
    "phanDoan" TEXT NOT NULL,
    "tenPhanDoan" TEXT,
    "noiDungCongViec" TEXT,
    "fileUrl" TEXT,
    "stt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_flowchart_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."process_flowchart_costs" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "loaiChiPhi" TEXT NOT NULL,
    "tenChiPhi" TEXT,
    "donVi" TEXT,
    "dinhMucLaoDong" DOUBLE PRECISION,
    "donViDinhMucLaoDong" TEXT,
    "soLuongNguyenLieu" DOUBLE PRECISION,
    "soPhutThucHien" DOUBLE PRECISION,
    "soLuongKeHoach" DOUBLE PRECISION,
    "soLuongThucTe" DOUBLE PRECISION,
    "giaKeHoach" DOUBLE PRECISION,
    "thanhTienKeHoach" DOUBLE PRECISION,
    "giaThucTe" DOUBLE PRECISION,
    "thanhTienThucTe" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_flowchart_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."production_processes" (
    "id" TEXT NOT NULL,
    "maQuyTrinhSanXuat" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "msnv" TEXT NOT NULL,
    "tenNhanVien" TEXT NOT NULL,
    "tenQuyTrinh" TEXT NOT NULL,
    "loaiQuyTrinh" TEXT NOT NULL,
    "tenQuyTrinhSanXuat" TEXT,
    "maNVSanXuat" TEXT,
    "tenNVSanXuat" TEXT,
    "khoiLuong" DOUBLE PRECISION,
    "thoiGian" DOUBLE PRECISION,
    "materialStandardId" TEXT,
    "sanPhamDauRa" TEXT,
    "tongNguyenLieuCanSanXuat" DOUBLE PRECISION,
    "soGioLamTrong1Ngay" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."production_flowcharts" (
    "id" TEXT NOT NULL,
    "productionProcessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_flowcharts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."production_flowchart_sections" (
    "id" TEXT NOT NULL,
    "flowchartId" TEXT NOT NULL,
    "phanDoan" TEXT NOT NULL,
    "tenPhanDoan" TEXT,
    "noiDungCongViec" TEXT,
    "fileUrl" TEXT,
    "stt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_flowchart_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."production_flowchart_costs" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "loaiChiPhi" TEXT NOT NULL,
    "tenChiPhi" TEXT,
    "donVi" TEXT,
    "dinhMucLaoDong" DOUBLE PRECISION,
    "donViDinhMucLaoDong" TEXT,
    "soLuongNguyenLieu" DOUBLE PRECISION,
    "soPhutThucHien" DOUBLE PRECISION,
    "soLuongKeHoach" DOUBLE PRECISION,
    "soLuongThucTe" DOUBLE PRECISION,
    "giaKeHoach" DOUBLE PRECISION,
    "thanhTienKeHoach" DOUBLE PRECISION,
    "giaThucTe" DOUBLE PRECISION,
    "thanhTienThucTe" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_flowchart_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."internal_inspections" (
    "id" TEXT NOT NULL,
    "inspectionCode" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectionPlanCode" TEXT NOT NULL,
    "inspectionPlanId" TEXT NOT NULL,
    "violationCode" TEXT NOT NULL,
    "violationContent" TEXT NOT NULL,
    "violationLevel" TEXT NOT NULL,
    "violationCategory" TEXT NOT NULL,
    "violationDescription" TEXT NOT NULL,
    "inspectedBy" TEXT NOT NULL,
    "inspectedByCode" TEXT NOT NULL,
    "verifiedBy1" TEXT NOT NULL,
    "verifiedBy1Code" TEXT NOT NULL,
    "verifiedBy2" TEXT NOT NULL,
    "verifiedBy2Code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."inspections" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "violationCode" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "planCode" TEXT NOT NULL,
    "violationType" TEXT NOT NULL,
    "violationContent" TEXT NOT NULL,
    "level" "common"."ViolationLevel" NOT NULL,
    "violationCount" INTEGER NOT NULL,
    "inspectedBy" TEXT NOT NULL,
    "verifiedBy" TEXT NOT NULL,
    "verifiedByCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."payrolls" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "positionAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAllowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kpiBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalIncome" DOUBLE PRECISION NOT NULL,
    "socialInsurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "healthInsurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unemploymentInsurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "personalIncomeTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kpiDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaveDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "workDays" INTEGER NOT NULL DEFAULT 0,
    "leaveDays" INTEGER NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."attendances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "workHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "common"."AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "isOvertime" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."work_shifts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."international_products" (
    "id" TEXT NOT NULL,
    "maSanPham" TEXT NOT NULL,
    "tenSanPham" TEXT NOT NULL,
    "moTaSanPham" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "loaiSanPham" TEXT,
    "donViTinh" TEXT,

    CONSTRAINT "international_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."quotation_requests" (
    "id" TEXT NOT NULL,
    "maYeuCauBaoGia" TEXT NOT NULL,
    "ngayYeuCau" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "maNhanVien" TEXT NOT NULL,
    "tenNhanVien" TEXT NOT NULL,
    "customerId" TEXT,
    "maKhachHang" TEXT NOT NULL,
    "tenKhachHang" TEXT NOT NULL,
    "hinhThucVanChuyen" TEXT,
    "hinhThucThanhToan" TEXT,
    "quocGia" TEXT,
    "cangDen" TEXT,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."quotation_request_items" (
    "id" TEXT NOT NULL,
    "quotationRequestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "maSanPham" TEXT NOT NULL,
    "tenSanPham" TEXT NOT NULL,
    "moTaSanPham" TEXT,
    "yeuCauSanPham" TEXT,
    "quyDongGoi" TEXT,
    "soLuong" DOUBLE PRECISION NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "giaDoiThuBan" DOUBLE PRECISION,
    "giaBanGanNhat" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."material_standards" (
    "id" TEXT NOT NULL,
    "maDinhMuc" TEXT NOT NULL,
    "tenDinhMuc" TEXT NOT NULL,
    "loaiDinhMuc" "common"."MaterialStandardType" NOT NULL,
    "tiLeThuHoi" DOUBLE PRECISION,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."material_standard_items" (
    "id" TEXT NOT NULL,
    "materialStandardId" TEXT NOT NULL,
    "tenThanhPham" TEXT NOT NULL,
    "tiLe" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_standard_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."material_standard_input_items" (
    "id" TEXT NOT NULL,
    "materialStandardId" TEXT NOT NULL,
    "tenNguyenLieu" TEXT NOT NULL,
    "tiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_standard_input_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."quotations" (
    "id" TEXT NOT NULL,
    "maBaoGia" TEXT NOT NULL,
    "ngayBaoGia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quotationRequestId" TEXT NOT NULL,
    "maYeuCauBaoGia" TEXT NOT NULL,
    "customerId" TEXT,
    "maKhachHang" TEXT NOT NULL,
    "tenKhachHang" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tenSanPham" TEXT NOT NULL,
    "khoiLuong" DOUBLE PRECISION NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "materialStandardId" TEXT,
    "maDinhMuc" TEXT,
    "tenDinhMuc" TEXT,
    "tiLeThuHoi" DOUBLE PRECISION,
    "sanPhamDauRa" TEXT,
    "thanhPhamTonKho" DOUBLE PRECISION,
    "tongThanhPhamCanSxThem" DOUBLE PRECISION,
    "tongNguyenLieuCanSanXuat" DOUBLE PRECISION,
    "nguyenLieuTonKho" DOUBLE PRECISION,
    "nguyenLieuCanNhapThem" DOUBLE PRECISION,
    "giaBaoKhach" DOUBLE PRECISION,
    "thoiGianGiaoHang" INTEGER,
    "hieuLucBaoGia" INTEGER,
    "employeeId" TEXT,
    "tenNhanVien" TEXT,
    "tinhTrang" "business"."QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."quotation_items" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "tenThanhPham" TEXT NOT NULL,
    "tiLe" DOUBLE PRECISION NOT NULL,
    "khoiLuongTuongUng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."general_costs" (
    "id" TEXT NOT NULL,
    "maChiPhi" TEXT NOT NULL,
    "tenChiPhi" TEXT NOT NULL,
    "loaiChiPhi" TEXT NOT NULL,
    "noiDung" TEXT,
    "donViTinh" TEXT,
    "giaThanhNgay" DOUBLE PRECISION,
    "donViTien" TEXT DEFAULT 'VND',
    "msnv" TEXT,
    "tenNhanVien" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "general_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."export_costs" (
    "id" TEXT NOT NULL,
    "maChiPhi" TEXT NOT NULL,
    "tenChiPhi" TEXT NOT NULL,
    "loaiChiPhi" TEXT NOT NULL,
    "noiDung" TEXT,
    "donViTinh" TEXT,
    "giaThanhNgay" DOUBLE PRECISION,
    "donViTien" TEXT DEFAULT 'VND',
    "msnv" TEXT,
    "tenNhanVien" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."quotation_calculators" (
    "id" TEXT NOT NULL,
    "quotationRequestId" TEXT NOT NULL,
    "maYeuCauBaoGia" TEXT NOT NULL,
    "phanTramThue" DOUBLE PRECISION,
    "phanTramQuy" DOUBLE PRECISION,
    "generalCostGroupsData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_calculators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."quotation_calculator_products" (
    "id" TEXT NOT NULL,
    "calculatorId" TEXT NOT NULL,
    "quotationRequestItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tenSanPham" TEXT NOT NULL,
    "soLuong" DOUBLE PRECISION NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "maBaoGia" TEXT NOT NULL,
    "materialStandardId" TEXT,
    "maDinhMuc" TEXT,
    "tenDinhMuc" TEXT,
    "tiLeThuHoi" DOUBLE PRECISION,
    "sanPhamDauRa" TEXT,
    "thanhPhamTonKho" DOUBLE PRECISION,
    "tongThanhPhamCanSxThem" DOUBLE PRECISION,
    "tongNguyenLieuCanSanXuat" DOUBLE PRECISION,
    "nguyenLieuTonKho" DOUBLE PRECISION,
    "nguyenLieuCanNhapThem" DOUBLE PRECISION,
    "productionProcessId" TEXT,
    "maQuyTrinhSanXuat" TEXT,
    "tenQuyTrinhSanXuat" TEXT,
    "flowchartData" JSONB,
    "thoiGianChoPhepToiDa" DOUBLE PRECISION,
    "ngayBatDauSanXuat" TIMESTAMP(3),
    "ngayHoanThanhThucTe" DOUBLE PRECISION,
    "chiPhiSanXuatKeHoach" DOUBLE PRECISION,
    "chiPhiSanXuatThucTe" DOUBLE PRECISION,
    "chiPhiChungKeHoach" DOUBLE PRECISION,
    "chiPhiChungThucTe" DOUBLE PRECISION,
    "chiPhiXuatKhauKeHoach" DOUBLE PRECISION,
    "chiPhiXuatKhauThucTe" DOUBLE PRECISION,
    "giaHoaVon" DOUBLE PRECISION,
    "loiNhuanCongThem" DOUBLE PRECISION,
    "ghiChu" TEXT,
    "isAdditionalCost" BOOLEAN NOT NULL DEFAULT false,
    "tenChiPhiBoSung" TEXT,
    "originalTabId" TEXT,
    "tongKhoiLuongThanhPhamThucTe" DOUBLE PRECISION,
    "thanhPhamTonKhoThucTe" DOUBLE PRECISION,
    "tongThanhPhamCanSxThemThucTe" DOUBLE PRECISION,
    "tongNguyenLieuCanSanXuatThucTe" DOUBLE PRECISION,
    "loiNhuanCongThemThucTe" DOUBLE PRECISION,
    "tiGiaUSD" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_calculator_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."quotation_calculator_by_products" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tenSanPham" TEXT NOT NULL,
    "tiLe" DOUBLE PRECISION,
    "tiLeThuHoiThucTe" DOUBLE PRECISION,
    "giaHoaVon" DOUBLE PRECISION NOT NULL,
    "giaHoaVonThucTe" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_calculator_by_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."quotation_calculator_general_costs" (
    "id" TEXT NOT NULL,
    "calculatorId" TEXT NOT NULL,
    "generalCostId" TEXT NOT NULL,
    "maChiPhi" TEXT NOT NULL,
    "tenChiPhi" TEXT NOT NULL,
    "donViTinh" TEXT,
    "keHoach" DOUBLE PRECISION NOT NULL,
    "thucTe" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_calculator_general_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."quotation_calculator_export_costs" (
    "id" TEXT NOT NULL,
    "calculatorId" TEXT NOT NULL,
    "exportCostId" TEXT NOT NULL,
    "maChiPhi" TEXT NOT NULL,
    "tenChiPhi" TEXT NOT NULL,
    "donViTinh" TEXT,
    "keHoach" DOUBLE PRECISION NOT NULL,
    "thucTe" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_calculator_export_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."orders" (
    "id" TEXT NOT NULL,
    "maDonHang" TEXT NOT NULL,
    "ngayDatHang" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quotationId" TEXT NOT NULL,
    "maBaoGia" TEXT NOT NULL,
    "quotationRequestId" TEXT NOT NULL,
    "maYeuCauBaoGia" TEXT NOT NULL,
    "customerId" TEXT,
    "maKhachHang" TEXT NOT NULL,
    "tenKhachHang" TEXT NOT NULL,
    "employeeId" TEXT,
    "tenNhanVien" TEXT,
    "giaTriDonHangUSD" DOUBLE PRECISION,
    "giaTriDonHangVND" DOUBLE PRECISION,
    "xuatKhauDot1USD" DOUBLE PRECISION,
    "noiDiaDot1VND" DOUBLE PRECISION,
    "ngayThanhToanDot1" TIMESTAMP(3),
    "xuatKhauDot2USD" DOUBLE PRECISION,
    "noiDiaDot2VND" DOUBLE PRECISION,
    "ngayThanhToanDot2" TIMESTAMP(3),
    "ngayBatDauSanXuatKeHoach" TIMESTAMP(3),
    "ngayHoanThanhSanXuatKeHoach" TIMESTAMP(3),
    "ngayHoanThanhThucTe" TIMESTAMP(3),
    "ngayGiaoHang" TIMESTAMP(3),
    "trangThaiSanXuat" "business"."OrderProductionStatus",
    "trangThaiThanhToan" "business"."OrderPaymentStatus",
    "ghiChu" TEXT,
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "maSanPham" TEXT NOT NULL,
    "tenHangHoa" TEXT NOT NULL,
    "yeuCauHangHoa" TEXT,
    "loaiHangHoa" TEXT,
    "dongGoi" TEXT,
    "soLuong" DOUBLE PRECISION NOT NULL,
    "donVi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."tax_reports" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ngayDatHang" TIMESTAMP(3) NOT NULL,
    "maDonHang" TEXT NOT NULL,
    "tenHangHoa" TEXT NOT NULL,
    "soLuong" DOUBLE PRECISION NOT NULL,
    "donVi" TEXT NOT NULL,
    "giaTriDonHang" DOUBLE PRECISION NOT NULL,
    "soTienDongThue" DOUBLE PRECISION,
    "trangThai" "business"."TaxReportStatus" NOT NULL DEFAULT 'CHUA_BAO_CAO',
    "ghiChi" TEXT,
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."customer_feedbacks" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "ngayPhanHoi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loaiPhanHoi" TEXT NOT NULL,
    "mucDoNghiemTrong" TEXT NOT NULL,
    "noiDungPhanHoi" TEXT NOT NULL,
    "sanPhamLienQuan" TEXT,
    "donHangLienQuan" TEXT,
    "nguoiTiepNhan" TEXT,
    "trangThaiXuLy" TEXT NOT NULL DEFAULT 'Chưa xử lý',
    "bienPhapXuLy" TEXT,
    "ketQuaXuLy" TEXT,
    "ngayXuLyXong" TIMESTAMP(3),
    "mucDoHaiLong" TEXT,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."supply_requests" (
    "id" TEXT NOT NULL,
    "stt" SERIAL NOT NULL,
    "ngayYeuCau" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maYeuCau" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "maNhanVien" TEXT NOT NULL,
    "tenNhanVien" TEXT NOT NULL,
    "boPhan" TEXT NOT NULL,
    "phanLoai" TEXT NOT NULL,
    "tenGoi" TEXT NOT NULL,
    "soLuong" DOUBLE PRECISION NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "mucDichYeuCau" TEXT NOT NULL,
    "mucDoUuTien" TEXT NOT NULL,
    "ghiChu" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'Chưa cung cấp',
    "fileKemTheo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."purchase_requests" (
    "id" TEXT NOT NULL,
    "stt" SERIAL NOT NULL,
    "ngayYeuCau" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maYeuCau" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "maNhanVien" TEXT NOT NULL,
    "tenNhanVien" TEXT NOT NULL,
    "phanLoai" TEXT NOT NULL,
    "tenHangHoa" TEXT NOT NULL,
    "soLuong" DOUBLE PRECISION NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "mucDichYeuCau" TEXT NOT NULL,
    "mucDoUuTien" TEXT NOT NULL,
    "ghiChu" TEXT,
    "fileKemTheo" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'Chờ duyệt',
    "nguoiDuyet" TEXT,
    "ngayDuyet" TIMESTAMP(3),
    "supplyRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."suppliers" (
    "id" TEXT NOT NULL,
    "maNhaCungCap" TEXT NOT NULL,
    "tenNhaCungCap" TEXT NOT NULL,
    "loaiCungCap" TEXT NOT NULL,
    "quocGia" TEXT NOT NULL,
    "website" TEXT,
    "nguoiLienHe" TEXT NOT NULL,
    "soDienThoai" TEXT NOT NULL,
    "emailLienHe" TEXT NOT NULL,
    "diaChi" TEXT NOT NULL,
    "khaNang" TEXT,
    "loaiHinh" TEXT NOT NULL,
    "trangThai" TEXT NOT NULL DEFAULT 'Đang cung cấp',
    "phanLoaiNCC" TEXT NOT NULL DEFAULT 'NVL',
    "doanhChi" DOUBLE PRECISION,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."product_batches" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "soLo" TEXT NOT NULL,
    "soLuong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soLuongNhap" DOUBLE PRECISION NOT NULL,
    "donViTinh" TEXT,
    "ngayNhap" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngaySanXuat" TIMESTAMP(3),
    "hanSuDung" TIMESTAMP(3),
    "giaNhap" DOUBLE PRECISION,
    "nhaCungCap" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'active',
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."warehouses" (
    "id" TEXT NOT NULL,
    "maKho" TEXT NOT NULL,
    "tenKho" TEXT NOT NULL,
    "loaiKho" TEXT,
    "diaChi" TEXT,
    "dienTich" DOUBLE PRECISION,
    "sucChua" DOUBLE PRECISION,
    "nguoiQuanLy" TEXT,
    "soDienThoai" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'active',
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."lots" (
    "id" TEXT NOT NULL,
    "tenLo" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."lot_products" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "internationalProductId" TEXT NOT NULL,
    "soLuong" DOUBLE PRECISION NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "giaThanh" DOUBLE PRECISION DEFAULT 100000,

    CONSTRAINT "lot_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."debts" (
    "id" TEXT NOT NULL,
    "ngayPhatSinh" TIMESTAMP(3) NOT NULL,
    "loaiChiPhi" TEXT,
    "maNhaCungCap" TEXT NOT NULL,
    "tenNhaCungCap" TEXT NOT NULL,
    "loaiCungCap" TEXT,
    "cungCap" TEXT,
    "noiDungChiCho" TEXT,
    "loaiHinh" TEXT,
    "soTienPhaiTra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soTienDaThanhToan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ngayHoachToan" TIMESTAMP(3),
    "ngayDenHan" TIMESTAMP(3),
    "soTaiKhoan" TEXT,
    "ghiChu" TEXT,
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."warehouse_receipts" (
    "id" TEXT NOT NULL,
    "maPhieuNhap" TEXT NOT NULL,
    "ngayNhap" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "maNhanVien" TEXT NOT NULL,
    "tenNhanVien" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "tenKho" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "tenLo" TEXT NOT NULL,
    "lotProductId" TEXT NOT NULL,
    "tenSanPham" TEXT NOT NULL,
    "soLuongTruoc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soLuongNhap" DOUBLE PRECISION NOT NULL,
    "soLuongSau" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "donViTinh" TEXT NOT NULL,
    "ghiChu" TEXT,
    "supplyRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."warehouse_issues" (
    "id" TEXT NOT NULL,
    "maPhieuXuat" TEXT NOT NULL,
    "ngayXuat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "maNhanVien" TEXT NOT NULL,
    "tenNhanVien" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "tenKho" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "tenLo" TEXT NOT NULL,
    "lotProductId" TEXT NOT NULL,
    "tenSanPham" TEXT NOT NULL,
    "soLuongTruoc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soLuongXuat" DOUBLE PRECISION NOT NULL,
    "soLuongSau" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "donViTinh" TEXT NOT NULL,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."customers" (
    "id" TEXT NOT NULL,
    "maKhachHang" TEXT NOT NULL,
    "tenCongTy" TEXT NOT NULL,
    "nguoiLienHe" TEXT NOT NULL,
    "loaiKhachHang" TEXT NOT NULL,
    "diaChi" TEXT,
    "soDienThoai" TEXT,
    "email" TEXT,
    "website" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'Hoạt động',
    "ngayHopTac" TIMESTAMP(3),
    "doanhThuNam" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soLuongDonHang" INTEGER NOT NULL DEFAULT 0,
    "sanPhamChinh" TEXT,
    "ghiChu" TEXT,
    "quocGia" TEXT,
    "thanhPho" TEXT,
    "tinhThanh" TEXT,
    "quanHuyen" TEXT,
    "maSoThue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."invoices" (
    "id" TEXT NOT NULL,
    "soHoaDon" TEXT NOT NULL,
    "ngayLap" TIMESTAMP(3) NOT NULL,
    "khachHang" TEXT NOT NULL,
    "maSoThue" TEXT,
    "loaiHoaDon" TEXT,
    "tongTien" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thanhTien" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trangThai" TEXT NOT NULL DEFAULT 'Chưa thanh toán',
    "nhanVienLap" TEXT,
    "phuongThucThanhToan" TEXT,
    "ngayThanhToan" TIMESTAMP(3),
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."material_evaluations" (
    "id" TEXT NOT NULL,
    "maChien" TEXT NOT NULL,
    "thoiGianChien" TIMESTAMP(3) NOT NULL,
    "tenHangHoa" TEXT NOT NULL,
    "soLoKien" TEXT NOT NULL,
    "khoiLuong" DOUBLE PRECISION NOT NULL,
    "soLanNgam" INTEGER NOT NULL,
    "nhietDoNuocTruocNgam" DOUBLE PRECISION NOT NULL,
    "nhietDoNuocSauVot" DOUBLE PRECISION NOT NULL,
    "thoiGianNgam" INTEGER NOT NULL,
    "brixNuocNgam" DOUBLE PRECISION NOT NULL,
    "danhGiaTruocNgam" TEXT NOT NULL,
    "danhGiaSauNgam" TEXT NOT NULL,
    "fileDinhKem" TEXT,
    "nguoiThucHien" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."material_evaluation_criteria" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_evaluation_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."machines" (
    "id" TEXT NOT NULL,
    "maMay" TEXT NOT NULL DEFAULT '',
    "tenMay" TEXT NOT NULL,
    "moTa" TEXT,
    "trangThai" "business"."MachineStatus" NOT NULL DEFAULT 'HOAT_DONG',
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."system_operations" (
    "id" TEXT NOT NULL,
    "maChien" TEXT NOT NULL,
    "machineId" TEXT,
    "tenMay" TEXT NOT NULL,
    "thoiGianChien" TIMESTAMP(3) NOT NULL,
    "khoiLuongDauVao" DOUBLE PRECISION DEFAULT 0,
    "giaiDoan1ThoiGian" INTEGER NOT NULL DEFAULT 0,
    "giaiDoan1NhietDo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "giaiDoan1ApSuat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "giaiDoan2ThoiGian" INTEGER NOT NULL DEFAULT 0,
    "giaiDoan2NhietDo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "giaiDoan2ApSuat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "giaiDoan3ThoiGian" INTEGER NOT NULL DEFAULT 0,
    "giaiDoan3NhietDo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "giaiDoan3ApSuat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "giaiDoan4ThoiGian" INTEGER NOT NULL DEFAULT 0,
    "giaiDoan4NhietDo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "giaiDoan4ApSuat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tongThoiGianSay" INTEGER NOT NULL DEFAULT 0,
    "trangThai" "business"."SystemOperationStatus" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "ghiChu" TEXT,
    "nguoiThucHien" TEXT NOT NULL,
    "materialEvaluationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."finished_products" (
    "id" TEXT NOT NULL,
    "maChien" TEXT NOT NULL,
    "thoiGianChien" TEXT NOT NULL,
    "tenHangHoa" TEXT NOT NULL,
    "khoiLuong" DOUBLE PRECISION NOT NULL,
    "machineId" TEXT,
    "tenMay" TEXT,
    "trangThai" "business"."SystemOperationStatus" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "materialEvaluationId" TEXT,
    "aKhoiLuong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bKhoiLuong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bDauKhoiLuong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bDauTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cKhoiLuong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vunLonKhoiLuong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vunLonTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vunNhoKhoiLuong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vunNhoTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phePhamKhoiLuong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phePhamTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uotKhoiLuong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uotTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tongKhoiLuong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fileDinhKem" TEXT,
    "nguoiThucHien" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finished_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."quality_evaluations" (
    "id" TEXT NOT NULL,
    "maChien" TEXT NOT NULL,
    "thoiGianChien" TEXT NOT NULL,
    "tenHangHoa" TEXT NOT NULL,
    "mauSac" TEXT NOT NULL DEFAULT '',
    "machineId" TEXT,
    "tenMay" TEXT,
    "finishedProductId" TEXT,
    "materialEvaluationId" TEXT,
    "aTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bDauTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vunLonTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vunNhoTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phePhamTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uotTiLe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "muiHuong" TEXT NOT NULL DEFAULT '',
    "huongVi" TEXT NOT NULL DEFAULT '',
    "doNgot" TEXT NOT NULL DEFAULT '',
    "doGion" TEXT NOT NULL DEFAULT '',
    "danhGiaTongQuan" TEXT NOT NULL DEFAULT '',
    "deXuatDieuChinh" TEXT NOT NULL DEFAULT '',
    "fileDinhKem" TEXT,
    "nguoiThucHien" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."production_reports" (
    "id" TEXT NOT NULL,
    "ngayThang" TEXT NOT NULL,
    "tongSoTuaSanXuat" INTEGER NOT NULL DEFAULT 0,
    "soMeTua" INTEGER NOT NULL DEFAULT 0,
    "tongSoMeKeHoach" INTEGER NOT NULL DEFAULT 0,
    "soMeThucTe" INTEGER NOT NULL DEFAULT 0,
    "maDinhMuc" TEXT NOT NULL DEFAULT '',
    "tongKhoiLuongNguyenLieu" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tongKhoiLuongThanhPhamDinhMuc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "khoiLuongThanhPhamThucTe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chenhLechKhoiLuong" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "danhGiaChenhLech" TEXT NOT NULL DEFAULT '',
    "nguyenNhanChenhLech" TEXT NOT NULL DEFAULT '',
    "deXuatDieuChinh" TEXT NOT NULL DEFAULT '',
    "fileDinhKem" TEXT,
    "nguoiThucHien" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."daily_work_reports" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "workDescription" TEXT NOT NULL,
    "achievements" TEXT,
    "challenges" TEXT,
    "planForNextDay" TEXT,
    "workHours" DOUBLE PRECISION,
    "status" "common"."DailyWorkReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "supervisorComment" TEXT,
    "supervisorId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "attachments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_work_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."tasks" (
    "id" TEXT NOT NULL,
    "ngayGiao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nguoiGiaoId" TEXT NOT NULL,
    "nguoiNhanIds" TEXT[],
    "noiDung" TEXT NOT NULL,
    "thoiHanHoanThanh" TIMESTAMP(3) NOT NULL,
    "ghiChu" TEXT,
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mucDoUuTien" "common"."TaskPriority" NOT NULL,
    "trangThaiTiepNhan" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."work_plans" (
    "id" TEXT NOT NULL,
    "tieuDe" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "nguoiTaoId" TEXT NOT NULL,
    "nguoiThucHienIds" TEXT[],
    "ngayBatDau" TIMESTAMP(3) NOT NULL,
    "ngayKetThuc" TIMESTAMP(3) NOT NULL,
    "mucDoUuTien" "common"."TaskPriority" NOT NULL,
    "trangThai" "common"."WorkPlanStatus" NOT NULL DEFAULT 'CHUA_BAT_DAU',
    "ghiChu" TEXT,
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."private_feedbacks" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "common"."FeedbackType" NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "notes" TEXT,
    "purpose" TEXT,
    "solution" TEXT,
    "attachments" TEXT[],
    "status" "common"."FeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "respondedBy" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."leave_requests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "common"."LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "halfDayPeriod" "common"."HalfDayPeriod",
    "reason" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "common"."LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."repair_requests" (
    "id" SERIAL NOT NULL,
    "ngayThang" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maYeuCau" TEXT NOT NULL,
    "tenHeThong" TEXT NOT NULL,
    "tinhTrangThietBi" TEXT NOT NULL,
    "loaiLoi" TEXT NOT NULL,
    "mucDoUuTien" TEXT NOT NULL,
    "noiDungLoi" TEXT NOT NULL,
    "ghiChu" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'Chờ xử lý',
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."acceptance_handovers" (
    "id" TEXT NOT NULL,
    "maNghiemThu" TEXT NOT NULL,
    "ngayNghiemThu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repairRequestId" INTEGER NOT NULL,
    "maYeuCauSuaChua" TEXT NOT NULL,
    "tenHeThongThietBi" TEXT NOT NULL,
    "tinhTrangTruocSuaChua" TEXT NOT NULL,
    "tinhTrangSauSuaChua" TEXT NOT NULL,
    "nguoiBanGiao" TEXT NOT NULL,
    "nguoiNhan" TEXT NOT NULL,
    "nguoiNhanId" TEXT,
    "fileDinhKem" TEXT,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acceptance_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."payroll_settings" (
    "id" TEXT NOT NULL,
    "standardWorkDays" INTEGER NOT NULL DEFAULT 26,
    "overtimeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "auth"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "auth"."refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "auth"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "auth"."permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_action_resource_key" ON "auth"."permissions"("action", "resource");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "auth"."role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON "auth"."user_roles"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "common"."departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "common"."departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sub_departments_code_key" ON "common"."sub_departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "positions_code_key" ON "common"."positions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "positions_name_key" ON "common"."positions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "position_levels_positionId_level_key" ON "common"."position_levels"("positionId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "common"."employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "common"."employees"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_employeeId_key" ON "common"."employee_profiles"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_employeeId_period_key" ON "common"."evaluations"("employeeId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_details_evaluationId_positionResponsibilityId_key" ON "common"."evaluation_details"("evaluationId", "positionResponsibilityId");

-- CreateIndex
CREATE UNIQUE INDEX "products_productCode_key" ON "common"."products"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "quality_checks_checkCode_key" ON "common"."quality_checks"("checkCode");

-- CreateIndex
CREATE UNIQUE INDEX "processes_maQuyTrinh_key" ON "common"."processes"("maQuyTrinh");

-- CreateIndex
CREATE UNIQUE INDEX "process_flowcharts_processId_key" ON "common"."process_flowcharts"("processId");

-- CreateIndex
CREATE UNIQUE INDEX "production_processes_maQuyTrinhSanXuat_key" ON "common"."production_processes"("maQuyTrinhSanXuat");

-- CreateIndex
CREATE UNIQUE INDEX "production_flowcharts_productionProcessId_key" ON "common"."production_flowcharts"("productionProcessId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_inspections_inspectionCode_key" ON "common"."internal_inspections"("inspectionCode");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_violationCode_key" ON "common"."inspections"("violationCode");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_employeeId_month_year_key" ON "common"."payrolls"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_employeeId_attendanceDate_isOvertime_key" ON "common"."attendances"("employeeId", "attendanceDate", "isOvertime");

-- CreateIndex
CREATE UNIQUE INDEX "international_products_maSanPham_key" ON "business"."international_products"("maSanPham");

-- CreateIndex
CREATE INDEX "international_products_tenSanPham_idx" ON "business"."international_products"("tenSanPham");

-- CreateIndex
CREATE INDEX "international_products_loaiSanPham_idx" ON "business"."international_products"("loaiSanPham");

-- CreateIndex
CREATE INDEX "international_products_createdAt_idx" ON "business"."international_products"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_requests_maYeuCauBaoGia_key" ON "business"."quotation_requests"("maYeuCauBaoGia");

-- CreateIndex
CREATE UNIQUE INDEX "material_standards_maDinhMuc_key" ON "common"."material_standards"("maDinhMuc");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_maBaoGia_key" ON "business"."quotations"("maBaoGia");

-- CreateIndex
CREATE UNIQUE INDEX "general_costs_maChiPhi_key" ON "business"."general_costs"("maChiPhi");

-- CreateIndex
CREATE UNIQUE INDEX "export_costs_maChiPhi_key" ON "business"."export_costs"("maChiPhi");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_calculators_quotationRequestId_key" ON "business"."quotation_calculators"("quotationRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_maDonHang_key" ON "business"."orders"("maDonHang");

-- CreateIndex
CREATE UNIQUE INDEX "orders_quotationId_key" ON "business"."orders"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "tax_reports_orderId_key" ON "business"."tax_reports"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "supply_requests_maYeuCau_key" ON "business"."supply_requests"("maYeuCau");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_maYeuCau_key" ON "business"."purchase_requests"("maYeuCau");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_maNhaCungCap_key" ON "business"."suppliers"("maNhaCungCap");

-- CreateIndex
CREATE UNIQUE INDEX "product_batches_productId_warehouseId_soLo_key" ON "business"."product_batches"("productId", "warehouseId", "soLo");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_maKho_key" ON "business"."warehouses"("maKho");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_receipts_maPhieuNhap_key" ON "business"."warehouse_receipts"("maPhieuNhap");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_issues_maPhieuXuat_key" ON "business"."warehouse_issues"("maPhieuXuat");

-- CreateIndex
CREATE UNIQUE INDEX "customers_maKhachHang_key" ON "business"."customers"("maKhachHang");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_soHoaDon_key" ON "business"."invoices"("soHoaDon");

-- CreateIndex
CREATE UNIQUE INDEX "material_evaluations_maChien_key" ON "business"."material_evaluations"("maChien");

-- CreateIndex
CREATE UNIQUE INDEX "material_evaluation_criteria_code_key" ON "business"."material_evaluation_criteria"("code");

-- CreateIndex
CREATE UNIQUE INDEX "machines_maMay_key" ON "business"."machines"("maMay");

-- CreateIndex
CREATE UNIQUE INDEX "machines_tenMay_key" ON "business"."machines"("tenMay");

-- CreateIndex
CREATE UNIQUE INDEX "finished_products_maChien_machineId_key" ON "business"."finished_products"("maChien", "machineId");

-- CreateIndex
CREATE UNIQUE INDEX "quality_evaluations_maChien_machineId_key" ON "business"."quality_evaluations"("maChien", "machineId");

-- CreateIndex
CREATE INDEX "daily_work_reports_employeeId_reportDate_idx" ON "common"."daily_work_reports"("employeeId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "private_feedbacks_code_key" ON "common"."private_feedbacks"("code");

-- CreateIndex
CREATE UNIQUE INDEX "leave_requests_code_key" ON "common"."leave_requests"("code");

-- CreateIndex
CREATE UNIQUE INDEX "repair_requests_maYeuCau_key" ON "common"."repair_requests"("maYeuCau");

-- CreateIndex
CREATE UNIQUE INDEX "acceptance_handovers_maNghiemThu_key" ON "common"."acceptance_handovers"("maNghiemThu");

-- AddForeignKey
ALTER TABLE "auth"."login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "auth"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "auth"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "auth"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."sub_departments" ADD CONSTRAINT "sub_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "common"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."position_levels" ADD CONSTRAINT "position_levels_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "common"."positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."position_responsibilities" ADD CONSTRAINT "position_responsibilities_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "common"."positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."employees" ADD CONSTRAINT "employees_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "common"."positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."employees" ADD CONSTRAINT "employees_positionLevelId_fkey" FOREIGN KEY ("positionLevelId") REFERENCES "common"."position_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."employees" ADD CONSTRAINT "employees_subDepartmentId_fkey" FOREIGN KEY ("subDepartmentId") REFERENCES "common"."sub_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."employee_profiles" ADD CONSTRAINT "employee_profiles_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."responsibilities" ADD CONSTRAINT "responsibilities_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluations" ADD CONSTRAINT "evaluations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_details" ADD CONSTRAINT "evaluation_details_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "common"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_details" ADD CONSTRAINT "evaluation_details_positionResponsibilityId_fkey" FOREIGN KEY ("positionResponsibilityId") REFERENCES "common"."position_responsibilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."notifications" ADD CONSTRAINT "notifications_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."quality_checks" ADD CONSTRAINT "quality_checks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "common"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."process_flowcharts" ADD CONSTRAINT "process_flowcharts_processId_fkey" FOREIGN KEY ("processId") REFERENCES "common"."processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."process_flowchart_sections" ADD CONSTRAINT "process_flowchart_sections_flowchartId_fkey" FOREIGN KEY ("flowchartId") REFERENCES "common"."process_flowcharts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."process_flowchart_costs" ADD CONSTRAINT "process_flowchart_costs_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "common"."process_flowchart_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."production_processes" ADD CONSTRAINT "production_processes_materialStandardId_fkey" FOREIGN KEY ("materialStandardId") REFERENCES "common"."material_standards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."production_processes" ADD CONSTRAINT "production_processes_processId_fkey" FOREIGN KEY ("processId") REFERENCES "common"."processes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."production_flowcharts" ADD CONSTRAINT "production_flowcharts_productionProcessId_fkey" FOREIGN KEY ("productionProcessId") REFERENCES "common"."production_processes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."production_flowchart_sections" ADD CONSTRAINT "production_flowchart_sections_flowchartId_fkey" FOREIGN KEY ("flowchartId") REFERENCES "common"."production_flowcharts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."production_flowchart_costs" ADD CONSTRAINT "production_flowchart_costs_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "common"."production_flowchart_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."inspections" ADD CONSTRAINT "inspections_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."payrolls" ADD CONSTRAINT "payrolls_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."attendances" ADD CONSTRAINT "attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_requests" ADD CONSTRAINT "quotation_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_requests" ADD CONSTRAINT "quotation_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_request_items" ADD CONSTRAINT "quotation_request_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "business"."international_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_request_items" ADD CONSTRAINT "quotation_request_items_quotationRequestId_fkey" FOREIGN KEY ("quotationRequestId") REFERENCES "business"."quotation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."material_standard_items" ADD CONSTRAINT "material_standard_items_materialStandardId_fkey" FOREIGN KEY ("materialStandardId") REFERENCES "common"."material_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."material_standard_input_items" ADD CONSTRAINT "material_standard_input_items_materialStandardId_fkey" FOREIGN KEY ("materialStandardId") REFERENCES "common"."material_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotations" ADD CONSTRAINT "quotations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotations" ADD CONSTRAINT "quotations_quotationRequestId_fkey" FOREIGN KEY ("quotationRequestId") REFERENCES "business"."quotation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_items" ADD CONSTRAINT "quotation_items_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "business"."quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_calculators" ADD CONSTRAINT "quotation_calculators_quotationRequestId_fkey" FOREIGN KEY ("quotationRequestId") REFERENCES "business"."quotation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_calculator_products" ADD CONSTRAINT "quotation_calculator_products_calculatorId_fkey" FOREIGN KEY ("calculatorId") REFERENCES "business"."quotation_calculators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_calculator_by_products" ADD CONSTRAINT "quotation_calculator_by_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "business"."quotation_calculator_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_calculator_general_costs" ADD CONSTRAINT "quotation_calculator_general_costs_calculatorId_fkey" FOREIGN KEY ("calculatorId") REFERENCES "business"."quotation_calculators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_calculator_export_costs" ADD CONSTRAINT "quotation_calculator_export_costs_calculatorId_fkey" FOREIGN KEY ("calculatorId") REFERENCES "business"."quotation_calculators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."orders" ADD CONSTRAINT "orders_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."orders" ADD CONSTRAINT "orders_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "business"."quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."orders" ADD CONSTRAINT "orders_quotationRequestId_fkey" FOREIGN KEY ("quotationRequestId") REFERENCES "business"."quotation_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "business"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "business"."international_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."tax_reports" ADD CONSTRAINT "tax_reports_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "business"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."supply_requests" ADD CONSTRAINT "supply_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."purchase_requests" ADD CONSTRAINT "purchase_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."purchase_requests" ADD CONSTRAINT "purchase_requests_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."suppliers" ADD CONSTRAINT "suppliers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."product_batches" ADD CONSTRAINT "product_batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "business"."international_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."product_batches" ADD CONSTRAINT "product_batches_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "business"."warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."lots" ADD CONSTRAINT "lots_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "business"."warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."lot_products" ADD CONSTRAINT "lot_products_internationalProductId_fkey" FOREIGN KEY ("internationalProductId") REFERENCES "business"."international_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."lot_products" ADD CONSTRAINT "lot_products_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "business"."lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."warehouse_receipts" ADD CONSTRAINT "warehouse_receipts_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."system_operations" ADD CONSTRAINT "system_operations_materialEvaluationId_fkey" FOREIGN KEY ("materialEvaluationId") REFERENCES "business"."material_evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."system_operations" ADD CONSTRAINT "system_operations_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "business"."machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."finished_products" ADD CONSTRAINT "finished_products_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "business"."machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."finished_products" ADD CONSTRAINT "finished_products_materialEvaluationId_fkey" FOREIGN KEY ("materialEvaluationId") REFERENCES "business"."material_evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quality_evaluations" ADD CONSTRAINT "quality_evaluations_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "business"."machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quality_evaluations" ADD CONSTRAINT "quality_evaluations_finishedProductId_fkey" FOREIGN KEY ("finishedProductId") REFERENCES "business"."finished_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quality_evaluations" ADD CONSTRAINT "quality_evaluations_materialEvaluationId_fkey" FOREIGN KEY ("materialEvaluationId") REFERENCES "business"."material_evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."daily_work_reports" ADD CONSTRAINT "daily_work_reports_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."private_feedbacks" ADD CONSTRAINT "private_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."acceptance_handovers" ADD CONSTRAINT "acceptance_handovers_repairRequestId_fkey" FOREIGN KEY ("repairRequestId") REFERENCES "common"."repair_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
