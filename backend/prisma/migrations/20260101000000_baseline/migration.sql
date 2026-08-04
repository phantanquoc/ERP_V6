-- Baseline: the entire schema as one migration.
--
-- Why this replaces 72 individual migrations (all preserved in _archived_pre_baseline/,
-- and in git history):
--
-- The migration history could not be replayed from an empty database, so Prisma's
-- shadow database always failed and `prisma migrate dev` was unusable — every schema
-- change had to be hand-written and applied with psql. Two independent causes:
--
--   1. 20260605 created an index on project_tasks."thuTu", but no migration ever
--      created that column.
--   2. Ten tables (maintenance_plans, maintenance_plan_items, maintenance_records,
--      maintenance_templates, machine_status_logs, project_costs, project_updates,
--      project_approvals, project_task_groups, overtime_plan_items) exist in the live
--      databases with real data, but no migration ever contained their CREATE TABLE.
--
-- Those tables were added out-of-band, so history and reality had permanently diverged.
-- Patching each gap individually would mean inventing CREATE TABLE statements after the
-- fact and guessing where they belong in the ordering. Collapsing to a baseline states
-- the current schema once, exactly as prisma/schema/*.prisma defines it.
--
-- Generated with:
--   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema --script
--
-- Existing databases are NOT re-created. This migration is recorded as already-applied
-- in _prisma_migrations on dev and prod; it only executes when a database is built from
-- scratch (a shadow database, a fresh clone, CI).
--
-- Detailed per-change history remains in _archived_pre_baseline/ and in git.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "business";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "common";

-- CreateEnum
CREATE TYPE "auth"."UserRole" AS ENUM ('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "auth"."PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'IMPORT');

-- CreateEnum
CREATE TYPE "business"."MachineStatus" AS ENUM ('HOAT_DONG', 'BAO_TRI', 'NGUNG_HOAT_DONG');

-- CreateEnum
CREATE TYPE "business"."MachineSystemCategory" AS ENUM ('SAN_XUAT', 'DONG_GOI', 'BAO_QUAN', 'DIEN', 'NUOC', 'HOI', 'KHI_NEN', 'LAM_NONG', 'VAN_CHUYEN', 'PCCC', 'CHAT_THAI', 'KIEM_TRA_CL', 'AN_TOAN', 'KHAC');

-- CreateEnum
CREATE TYPE "business"."MachineSystemDetailType" AS ENUM ('Thiet bi', 'Cum', 'Linh kien', 'Diem kiem tra');

-- CreateEnum
CREATE TYPE "business"."MaintenanceFrequency" AS ENUM ('HANG_NGAY', 'HANG_TUAN', 'HANG_THANG', 'HAI_THANG', 'BA_THANG', 'SAU_THANG', 'HANG_NAM', 'KHONG_CO_DINH');

-- CreateEnum
CREATE TYPE "business"."MaintenanceTeam" AS ENUM ('CO_KHI', 'CO_DIEN', 'DIEN', 'TONG_HOP');

-- CreateEnum
CREATE TYPE "business"."FaultRecordStatus" AS ENUM ('DANG_THEO_DOI', 'DA_XU_LY', 'TAI_PHAT');

-- CreateEnum
CREATE TYPE "business"."CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "business"."QuotationRequestStatus" AS ENUM ('CHO_XU_LY', 'DANG_BAO_GIA', 'DA_BAO_GIA', 'HUY');

-- CreateEnum
CREATE TYPE "business"."QuotationStatus" AS ENUM ('DRAFT', 'DANG_CHO_PHAN_HOI', 'DANG_CHO_GUI_DON_HANG', 'DA_DAT_HANG', 'KHONG_DAT_HANG', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "business"."OrderProductionStatus" AS ENUM ('CHO_LEN_KE_HOACH', 'CHO_SAN_XUAT', 'DANG_SAN_XUAT', 'CHO_GIAO_HANG', 'DA_LEN_CONTAINER', 'DANG_VAN_CHUYEN', 'DA_GIAO_CHO_KHACH_HANG');

-- CreateEnum
CREATE TYPE "business"."OrderPaymentStatus" AS ENUM ('DA_THANH_TOAN_DOT_1', 'CHO_THANH_TOAN_DOT_2', 'DA_THANH_TOAN_DU');

-- CreateEnum
CREATE TYPE "business"."TaxReportStatus" AS ENUM ('CHUA_BAO_CAO', 'DANG_CAP_NHAT_HO_SO', 'DA_DAY_DU_HO_SO', 'DA_BAO_CAO', 'DA_QUYET_TOAN');

-- CreateEnum
CREATE TYPE "business"."SystemOperationStatus" AS ENUM ('DANG_HOAT_DONG', 'BAO_TRI', 'NGUNG_HOAT_DONG');

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
CREATE TYPE "common"."ResourceType" AS ENUM ('EMPLOYEE', 'DEPARTMENT', 'POSITION', 'PAYROLL', 'EVALUATION', 'QUALITY_CHECK', 'INSPECTION', 'RESPONSIBILITY', 'PRODUCT', 'REPORT');

-- CreateEnum
CREATE TYPE "common"."MaterialStandardType" AS ENUM ('RAW_MATERIAL', 'EQUIPMENT');

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

-- CreateEnum
CREATE TYPE "common"."RepairRequestStatus" AS ENUM ('CHO_XU_LY', 'DANG_SUA_CHUA', 'HOAN_THANH', 'DA_HUY');

-- CreateEnum
CREATE TYPE "common"."OvertimePlanStatus" AS ENUM ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'HOAN_THANH', 'HUY');

-- CreateEnum
CREATE TYPE "common"."PositionCategory" AS ENUM ('PRODUCTION', 'OFFICE', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "common"."EvaluationMode" AS ENUM ('QUICK', 'FULL');

-- CreateEnum
CREATE TYPE "common"."EvaluationAuditAction" AS ENUM ('SCORE_UPDATE', 'COMMENT_UPDATE', 'STATUS_TRANSITION', 'NA_TOGGLE', 'APPEAL_SUBMIT', 'APPEAL_REPLY', 'EVIDENCE_ADD', 'EVIDENCE_DELETE', 'GOAL_UPDATE', 'IDP_UPDATE', 'PEER_INVITE', 'PEER_SUBMIT');

-- CreateEnum
CREATE TYPE "common"."PeerInviteStatus" AS ENUM ('PENDING', 'SUBMITTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "common"."LookupChangeAction" AS ENUM ('CREATE', 'UPDATE_LABEL', 'CASCADE_RENAME', 'UPDATE_SORT_ORDER', 'SOFT_DELETE', 'REACTIVATE');

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
CREATE TABLE "auth"."user_secondary_departments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "subDepartmentId" TEXT,
    "role" "auth"."UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_secondary_departments_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "auth"."push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "business"."machine_systems" (
    "id" TEXT NOT NULL,
    "khuVuc" TEXT NOT NULL,
    "viTri" TEXT NOT NULL,
    "maHeThong" TEXT NOT NULL,
    "tenHeThong" TEXT NOT NULL,
    "chucNang" TEXT NOT NULL,
    "loaiHeThong" "business"."MachineSystemCategory" NOT NULL,
    "maThietBi" TEXT,
    "tenThietBi" TEXT,
    "nhiemVu" TEXT,
    "maNguoiThucHien" TEXT,
    "nguoiThucHien" TEXT,
    "fileDinhKem" TEXT,
    "hoatDong" BOOLEAN NOT NULL DEFAULT true,
    "trangThai" "business"."MachineStatus" NOT NULL DEFAULT 'HOAT_DONG',
    "parentSystemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."machine_status_logs" (
    "id" TEXT NOT NULL,
    "machineSystemId" TEXT NOT NULL,
    "trangThaiCu" "business"."MachineStatus" NOT NULL,
    "trangThaiMoi" "business"."MachineStatus" NOT NULL,
    "nguyenNhan" TEXT NOT NULL,
    "nguoiCapNhat" TEXT NOT NULL,
    "ghiChu" TEXT,
    "thoiDiem" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."machine_system_details" (
    "id" TEXT NOT NULL,
    "machineSystemId" TEXT NOT NULL,
    "parentDetailId" TEXT,
    "loaiChiTiet" "business"."MachineSystemDetailType" NOT NULL,
    "maChiTiet" TEXT NOT NULL,
    "tenChiTiet" TEXT NOT NULL,
    "viTri" TEXT,
    "moTa" TEXT,
    "maNguoiPhuTrach" TEXT,
    "nguoiPhuTrach" TEXT,
    "fileDinhKem" TEXT,
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "hoatDong" BOOLEAN NOT NULL DEFAULT true,
    "trangThai" TEXT NOT NULL DEFAULT 'Hoạt động',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_system_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."fault_templates" (
    "id" TEXT NOT NULL,
    "maMauLoi" TEXT NOT NULL,
    "tenMauLoi" TEXT NOT NULL,
    "moTa" TEXT NOT NULL,
    "mucDo" TEXT NOT NULL,
    "machineSystemId" TEXT,
    "machineSystemDetailId" TEXT,
    "tenDetailGoiY" TEXT,
    "loaiDetailGoiY" TEXT,
    "hoatDong" BOOLEAN NOT NULL DEFAULT true,
    "trangThai" TEXT NOT NULL DEFAULT 'Hoạt động',
    "ghiChu" TEXT,
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fault_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."repair_steps" (
    "id" TEXT NOT NULL,
    "faultTemplateId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "moTa" TEXT NOT NULL,
    "thoiGianUocTinh" INTEGER,
    "dungCu" TEXT,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."fault_records" (
    "id" TEXT NOT NULL,
    "maLoi" TEXT NOT NULL,
    "tenLoi" TEXT NOT NULL,
    "moTa" TEXT NOT NULL,
    "maHeThong" TEXT,
    "machineSystemId" TEXT,
    "machineSystemDetailId" TEXT,
    "faultTemplateId" TEXT,
    "mucDo" TEXT NOT NULL,
    "trangThai" "business"."FaultRecordStatus" NOT NULL DEFAULT 'DANG_THEO_DOI',
    "nguoiPhatHien" TEXT NOT NULL,
    "ngayPhatHien" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngayXuLy" TIMESTAMP(3),
    "fileDinhKem" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fault_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."spare_parts" (
    "id" TEXT NOT NULL,
    "maLinhKien" TEXT NOT NULL,
    "tenLinhKien" TEXT NOT NULL,
    "loai" TEXT NOT NULL,
    "donVi" TEXT NOT NULL,
    "soLuongTon" INTEGER NOT NULL DEFAULT 0,
    "giaNhap" DOUBLE PRECISION,
    "nhaCungCap" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'Chưa sử dụng',
    "ngayMua" TIMESTAMP(3),
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spare_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."maintenance_templates" (
    "id" TEXT NOT NULL,
    "machineSystemDetailId" TEXT,
    "noiDung" TEXT NOT NULL,
    "tanSuat" "business"."MaintenanceFrequency" NOT NULL DEFAULT 'BA_THANG',
    "toThucHien" "business"."MaintenanceTeam" NOT NULL DEFAULT 'CO_KHI',
    "hoatDong" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."maintenance_plans" (
    "id" TEXT NOT NULL,
    "maKeHoach" TEXT NOT NULL,
    "machineSystemId" TEXT NOT NULL,
    "nam" INTEGER NOT NULL,
    "nguoiLap" TEXT NOT NULL,
    "ngayLap" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ghiChu" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'Đang thực hiện',
    "fileDinhKem" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."maintenance_plan_items" (
    "id" TEXT NOT NULL,
    "maintenancePlanId" TEXT NOT NULL,
    "machineSystemDetailId" TEXT NOT NULL,
    "maintenanceTemplateId" TEXT,
    "noiDung" TEXT NOT NULL,
    "tanSuat" "business"."MaintenanceFrequency" NOT NULL DEFAULT 'BA_THANG',
    "toThucHien" "business"."MaintenanceTeam" NOT NULL DEFAULT 'CO_KHI',
    "soLuong" INTEGER NOT NULL DEFAULT 1,
    "thangBatDau" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."maintenance_plan_item_logs" (
    "id" TEXT NOT NULL,
    "maintenancePlanItemId" TEXT NOT NULL,
    "thang" INTEGER NOT NULL,
    "lanThu" INTEGER NOT NULL,
    "hoanThanh" BOOLEAN NOT NULL DEFAULT false,
    "ghiChu" TEXT,
    "ngayThucHien" TIMESTAMP(3),
    "nguoiThucHien" TEXT,
    "nguoiPhu" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_plan_item_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."maintenance_records" (
    "id" TEXT NOT NULL,
    "maBienBan" TEXT NOT NULL,
    "maintenancePlanId" TEXT,
    "machineSystemId" TEXT NOT NULL,
    "machineSystemDetailId" TEXT NOT NULL,
    "sourceLogId" TEXT,
    "loai" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "tinhTrangTruoc" TEXT NOT NULL,
    "tinhTrangSau" TEXT NOT NULL,
    "deXuat" TEXT,
    "thoiGianThucHien" TEXT,
    "ngayThucHien" TIMESTAMP(3) NOT NULL,
    "nguoiThucHien" TEXT NOT NULL,
    "nguoiPhu" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fileDinhKem" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."projects" (
    "id" TEXT NOT NULL,
    "maDuAn" TEXT NOT NULL,
    "tenDuAn" TEXT NOT NULL,
    "moTa" TEXT,
    "ngayBatDau" TIMESTAMP(3) NOT NULL,
    "ngayKetThuc" TIMESTAMP(3),
    "trangThai" TEXT NOT NULL DEFAULT 'Lên kế hoạch',
    "nguoiTaoId" TEXT NOT NULL,
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."project_phases" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tenGiaiDoan" TEXT NOT NULL,
    "moTa" TEXT,
    "chuSoHuuId" TEXT,
    "chuSoHuu" TEXT,
    "nguoiPhuTrachId" TEXT,
    "nguoiPhuTrach" TEXT,
    "tienDo" INTEGER NOT NULL DEFAULT 0,
    "nganSach" DOUBLE PRECISION,
    "trangThai" TEXT NOT NULL DEFAULT 'Chưa bắt đầu',
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "ngayBatDau" TIMESTAMP(3),
    "ngayKetThuc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."project_task_groups" (
    "id" TEXT NOT NULL,
    "projectPhaseId" TEXT NOT NULL,
    "tenMuc" TEXT NOT NULL,
    "moTa" TEXT,
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_task_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vaiTro" TEXT NOT NULL DEFAULT 'Thành viên',
    "ngayThamGia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."project_tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectPhaseId" TEXT,
    "projectTaskGroupId" TEXT,
    "tieuDe" TEXT NOT NULL,
    "moTa" TEXT,
    "nguoiPhuTrach" TEXT,
    "tienDo" INTEGER NOT NULL DEFAULT 0,
    "ngayBatDau" TIMESTAMP(3),
    "ngayKetThuc" TIMESTAMP(3),
    "ngayBatDauThucTe" TIMESTAMP(3),
    "ngayHoanThanhThucTe" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "trangThai" TEXT NOT NULL DEFAULT 'Chưa bắt đầu',
    "mucDoUuTien" "common"."TaskPriority",
    "laMilestone" BOOLEAN NOT NULL DEFAULT false,
    "laPhatSinh" BOOLEAN NOT NULL DEFAULT false,
    "ghiChu" TEXT,
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."project_updates" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectPhaseId" TEXT,
    "ngay" TIMESTAMP(3) NOT NULL,
    "tieuDe" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "tienDoHienTai" INTEGER NOT NULL DEFAULT 0,
    "fileDinhKem" TEXT,
    "nguoiCapNhat" TEXT NOT NULL,
    "nguoiCapNhatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."project_costs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectPhaseId" TEXT,
    "projectTaskId" TEXT,
    "loaiChiPhi" TEXT NOT NULL,
    "tenChiPhi" TEXT,
    "donVi" TEXT,
    "soLuongKeHoach" DOUBLE PRECISION,
    "giaKeHoach" DOUBLE PRECISION,
    "thanhTienKeHoach" DOUBLE PRECISION,
    "soLuongThucTe" DOUBLE PRECISION,
    "giaThucTe" DOUBLE PRECISION,
    "thanhTienThucTe" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."project_approvals" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nguoiGuiId" TEXT NOT NULL,
    "nguoiDuyetId" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'CHO_DUYET',
    "lyDoTuChoi" TEXT,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."repair_request_status_logs" (
    "id" TEXT NOT NULL,
    "repairRequestId" INTEGER NOT NULL,
    "oldStatus" "common"."RepairRequestStatus" NOT NULL,
    "newStatus" "common"."RepairRequestStatus" NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_request_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."fault_record_status_logs" (
    "id" VARCHAR(30) NOT NULL,
    "faultRecordId" TEXT NOT NULL,
    "oldStatus" "business"."FaultRecordStatus",
    "newStatus" "business"."FaultRecordStatus" NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "source" VARCHAR(64) NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fault_record_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "business"."product_reorder_rules" (
    "id" TEXT NOT NULL,
    "internationalProductId" TEXT NOT NULL,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preferredSupplierId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "cooldownHours" INTEGER NOT NULL DEFAULT 24,
    "lastAlertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reorder_rules_pkey" PRIMARY KEY ("id")
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
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_feedbacks_pkey" PRIMARY KEY ("id")
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
    "tiGiaUSD" DOUBLE PRECISION,
    "ghiChu" TEXT,
    "status" "business"."QuotationRequestStatus" NOT NULL DEFAULT 'CHO_XU_LY',
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
    "priceLocked" BOOLEAN NOT NULL DEFAULT false,
    "priceLockedAt" TIMESTAMP(3),
    "priceLockedBy" TEXT,
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
    "ngayBatDauSanXuatThucTe" TIMESTAMP(3),
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
    "maDonHang" TEXT NOT NULL,
    "ngayDatHang" TIMESTAMP(3) NOT NULL,
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
CREATE TABLE "business"."quotation_revisions" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "quotation_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."invoices" (
    "id" TEXT NOT NULL,
    "soHoaDon" TEXT NOT NULL,
    "ngayLap" TIMESTAMP(3),
    "customerId" TEXT,
    "maSoThue" TEXT,
    "loaiHoaDon" TEXT,
    "boPhanSuDung" TEXT,
    "mucDichSuDung" TEXT,
    "tongTien" DOUBLE PRECISION,
    "thueVAT" DOUBLE PRECISION,
    "thanhTien" DOUBLE PRECISION,
    "trangThai" TEXT NOT NULL DEFAULT 'Chưa thanh toán',
    "phuongThucThanhToan" TEXT,
    "ngayThanhToan" TIMESTAMP(3),
    "nhanVienLap" TEXT NOT NULL,
    "ghiChu" TEXT,
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."debts" (
    "id" TEXT NOT NULL,
    "ngayPhatSinh" TIMESTAMP(3) NOT NULL,
    "loaiChiPhi" TEXT,
    "supplierId" TEXT NOT NULL,
    "maNhaCungCap" TEXT NOT NULL,
    "tenNhaCungCap" TEXT NOT NULL,
    "loaiCungCap" TEXT,
    "cungCap" TEXT,
    "noiDungChiCho" TEXT,
    "loaiHinh" TEXT,
    "soTienPhaiTra" DOUBLE PRECISION,
    "soTienDaThanhToan" DOUBLE PRECISION DEFAULT 0,
    "ngayHoachToan" TIMESTAMP(3),
    "ngayDenHan" TIMESTAMP(3),
    "soTaiKhoan" TEXT,
    "ghiChu" TEXT,
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
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
    "phanLoai" TEXT,
    "tenGoi" TEXT,
    "soLuong" DOUBLE PRECISION,
    "donViTinh" TEXT,
    "mucDichYeuCau" TEXT NOT NULL,
    "mucDoUuTien" TEXT NOT NULL,
    "ghiChu" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'Chưa cung cấp',
    "fileKemTheo" TEXT,
    "loaiYeuCau" TEXT DEFAULT 'Thường',
    "soTien" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."supply_request_items" (
    "id" TEXT NOT NULL,
    "supplyRequestId" TEXT NOT NULL,
    "phanLoai" TEXT NOT NULL,
    "tenGoi" TEXT NOT NULL,
    "soLuong" DOUBLE PRECISION NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "fulfilledQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'Chờ xử lý',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."supply_request_decisions" (
    "id" TEXT NOT NULL,
    "supplyRequestItemId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "fulfilledQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shortageQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "decidedByEmployeeId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredPurchaseRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_request_decisions_pkey" PRIMARY KEY ("id")
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
    "phanLoai" TEXT,
    "tenHangHoa" TEXT,
    "soLuong" DOUBLE PRECISION,
    "donViTinh" TEXT,
    "mucDichYeuCau" TEXT NOT NULL,
    "mucDoUuTien" TEXT NOT NULL,
    "ghiChu" TEXT,
    "fileKemTheo" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'Chờ duyệt',
    "nguoiDuyet" TEXT,
    "ngayDuyet" TIMESTAMP(3),
    "supplyRequestId" TEXT,
    "nhaCungCapId" TEXT,
    "giaDuKien" DOUBLE PRECISION,
    "ghiChuMuaHang" TEXT,
    "isQuickPurchase" BOOLEAN NOT NULL DEFAULT false,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."purchase_request_items" (
    "id" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "phanLoai" TEXT NOT NULL,
    "tenHangHoa" TEXT NOT NULL,
    "soLuong" DOUBLE PRECISION NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "nhaCungCapId" TEXT,
    "giaDuKien" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_request_items_pkey" PRIMARY KEY ("id")
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
    "maKien" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "giaThanh" DOUBLE PRECISION DEFAULT 100000,

    CONSTRAINT "lot_products_pkey" PRIMARY KEY ("id")
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
    "mucDich" TEXT,
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
    "supplyRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."material_evaluations" (
    "id" TEXT NOT NULL,
    "maChien" TEXT NOT NULL,
    "thoiGianChien" TIMESTAMP(3) NOT NULL,
    "ngaySanXuat" DATE,
    "ca" INTEGER,
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
    "ghiChu" TEXT,
    "fileDinhKem" TEXT,
    "nguoiThucHien" TEXT NOT NULL,
    "lotProductId" TEXT,
    "warehouseIssueId" TEXT,
    "createdById" TEXT,
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
CREATE TABLE "business"."system_operations" (
    "id" TEXT NOT NULL,
    "maChien" TEXT NOT NULL,
    "machineSystemId" TEXT,
    "thoiGianChien" TIMESTAMP(3) NOT NULL,
    "ngaySanXuat" DATE,
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
    "thoiGianChien" TIMESTAMP(3) NOT NULL,
    "ngaySanXuat" DATE,
    "tenHangHoa" TEXT NOT NULL,
    "khoiLuong" DOUBLE PRECISION NOT NULL,
    "machineSystemId" TEXT,
    "trangThai" "business"."SystemOperationStatus" NOT NULL DEFAULT 'DANG_HOAT_DONG',
    "materialEvaluationId" TEXT,
    "internationalProductId" TEXT,
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
    "daNhapKho" BOOLEAN NOT NULL DEFAULT false,
    "ghiChu" TEXT,
    "fileDinhKem" TEXT,
    "nguoiThucHien" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finished_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."finished_product_entry_history" (
    "id" TEXT NOT NULL,
    "finishedProductId" TEXT NOT NULL,
    "maChien" TEXT NOT NULL,
    "ngaySanXuat" DATE,
    "machineSystemId" TEXT,
    "grade" TEXT NOT NULL,
    "khoiLuong" DOUBLE PRECISION NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finished_product_entry_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."quality_evaluations" (
    "id" TEXT NOT NULL,
    "maChien" TEXT NOT NULL,
    "thoiGianChien" TEXT NOT NULL,
    "ngaySanXuat" DATE,
    "tenHangHoa" TEXT NOT NULL,
    "mauSac" TEXT NOT NULL DEFAULT '',
    "machineSystemId" TEXT,
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
    "createdById" TEXT,
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
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_reports_pkey" PRIMARY KEY ("id")
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
    "category" "common"."PositionCategory" NOT NULL DEFAULT 'OFFICE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."data_entry_page_positions" (
    "id" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_entry_page_positions_pkey" PRIMARY KEY ("id")
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
    "secondarySubDepartmentId" TEXT,
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
    "lastFaceScanAt" TIMESTAMP(3),
    "kmDistance" DOUBLE PRECISION,
    "leaveBalanceCarryOver" DOUBLE PRECISION,

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
    "evaluatedBy1Id" VARCHAR(30),
    "evaluatedBy2Id" VARCHAR(30),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" VARCHAR(30),
    "mode" "common"."EvaluationMode" NOT NULL DEFAULT 'FULL',
    "commentEmployee" TEXT,
    "commentSup1" TEXT,
    "commentSup2" TEXT,
    "selfScorePercentage" DOUBLE PRECISION,
    "sup1Percentage" DOUBLE PRECISION,
    "sup2Percentage" DOUBLE PRECISION,
    "appealComment" TEXT,
    "appealResponse" TEXT,
    "appealedAt" TIMESTAMP(3),
    "appealRespondedAt" TIMESTAMP(3),
    "appealResponderId" VARCHAR(30),
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
    "commentSup1" TEXT,
    "commentEmployee" TEXT,
    "commentSup2" TEXT,
    "notApplicable" BOOLEAN NOT NULL DEFAULT false,
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
    "metadata" JSONB,
    "period" TEXT,
    "evaluationId" TEXT,
    "taskId" TEXT,
    "acceptanceHandoverId" TEXT,
    "leaveRequestId" TEXT,
    "supplyRequestId" TEXT,
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
    "hienThiTrongChung" BOOLEAN NOT NULL DEFAULT false,
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
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
CREATE TABLE "common"."process_flowchart_section_files" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_flowchart_section_files_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "common"."production_flowchart_section_files" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_flowchart_section_files_pkey" PRIMARY KEY ("id")
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
    "nangSuatTrenPhut" DOUBLE PRECISION,
    "donViNangSuat" TEXT,
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
    "createdById" TEXT,
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
    "checkInWindowStart" TEXT,
    "checkInWindowEnd" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."material_standards" (
    "id" TEXT NOT NULL,
    "maDinhMuc" TEXT NOT NULL,
    "tenDinhMuc" TEXT NOT NULL,
    "loaiDinhMuc" TEXT,
    "kgNguyenLieuTren1KgThanhPham" DOUBLE PRECISION,
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
    "internationalProductId" TEXT,
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
    "internationalProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_standard_input_items_pkey" PRIMARY KEY ("id")
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
    "diemDanhGia" INTEGER,
    "noiDungDanhGia" TEXT,
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
    "tenHeThong" TEXT,
    "tinhTrangThietBi" TEXT,
    "loaiLoi" TEXT,
    "mucDoUuTien" TEXT NOT NULL,
    "noiDungLoi" TEXT,
    "ghiChu" TEXT,
    "trangThai" "common"."RepairRequestStatus" NOT NULL DEFAULT 'CHO_XU_LY',
    "fileDinhKem" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."repair_request_items" (
    "id" TEXT NOT NULL,
    "repairRequestId" INTEGER NOT NULL,
    "machineSystemId" TEXT,
    "machineSystemDetailId" TEXT,
    "faultRecordId" VARCHAR(30),
    "tenHeThong" TEXT NOT NULL,
    "tinhTrangThietBi" TEXT NOT NULL,
    "loaiLoi" TEXT NOT NULL,
    "noiDungLoi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_request_items_pkey" PRIMARY KEY ("id")
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
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acceptance_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."acceptance_handover_items" (
    "id" TEXT NOT NULL,
    "acceptanceHandoverId" TEXT NOT NULL,
    "repairRequestItemId" TEXT NOT NULL,
    "machineSystemId" TEXT,
    "machineSystemDetailId" TEXT,
    "tenHeThong" TEXT NOT NULL,
    "tenChiTiet" TEXT,
    "tinhTrangTruocSuaChua" TEXT NOT NULL,
    "tinhTrangSauSuaChua" TEXT NOT NULL,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acceptance_handover_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."overtime_plans" (
    "id" TEXT NOT NULL,
    "ngayTao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nguoiTaoId" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "ghiChu" TEXT,
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mucDoUuTien" "common"."TaskPriority" NOT NULL,
    "trangThai" "common"."OvertimePlanStatus" NOT NULL DEFAULT 'CHO_DUYET',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."overtime_plan_items" (
    "id" TEXT NOT NULL,
    "overtimePlanId" TEXT NOT NULL,
    "ngayTangCa" TIMESTAMP(3) NOT NULL,
    "gioBatDau" TEXT NOT NULL,
    "gioKetThuc" TEXT NOT NULL,
    "workShiftId" TEXT,
    "workShiftName" TEXT,
    "nguoiThamGiaIds" TEXT[],
    "ghiChuItem" TEXT,
    "trangThaiTiepNhan" JSONB NOT NULL DEFAULT '{}',
    "gioThucTe" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."payroll_settings" (
    "id" TEXT NOT NULL,
    "standardWorkDays" INTEGER NOT NULL DEFAULT 26,
    "overtimeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mealAllowancePerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeMealAllowance" DOUBLE PRECISION NOT NULL DEFAULT 25000,
    "sundayMealAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelPricePerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otRateWeekday" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "otRateWeekdayExtra" DOUBLE PRECISION NOT NULL DEFAULT 2.1,
    "otRateSunday" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "otRateSundayExtra" DOUBLE PRECISION NOT NULL DEFAULT 2.7,
    "otRateHoliday" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."system_settings" (
    "id" TEXT NOT NULL,
    "activeTheme" TEXT NOT NULL DEFAULT 'DEFAULT',
    "slogan" TEXT NOT NULL DEFAULT 'Nếu có ngôi nhà thứ 2 đó chính là nơi làm việc của mình, nơi có những người đồng nghiệp tuyệt vời, sẻ chia và tri kỷ.',
    "notificationSettings" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."face_profiles" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "face_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."face_images" (
    "id" TEXT NOT NULL,
    "faceProfileId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "embedding" TEXT,
    "qualityScore" DOUBLE PRECISION,
    "poseYaw" DOUBLE PRECISION,
    "posePitch" DOUBLE PRECISION,
    "capturedHour" INTEGER,
    "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."face_adaptive_events" (
    "id" TEXT NOT NULL,
    "faceProfileId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "reason" TEXT,
    "newQuality" DOUBLE PRECISION,
    "replacedId" TEXT,
    "replacedQuality" DOUBLE PRECISION,
    "distToCentroid" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_adaptive_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."face_attendance_logs" (
    "id" TEXT NOT NULL,
    "faceProfileId" TEXT,
    "employeeId" TEXT,
    "action" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "snapshotPath" TEXT,
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "attendanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."attendance_devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "location" TEXT,
    "type" TEXT NOT NULL DEFAULT 'FACE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."evaluation_evidences" (
    "id" TEXT NOT NULL,
    "evaluationDetailId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."evaluation_goals" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetPeriod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."evaluation_idp_items" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "skill" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_idp_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."evaluation_audit_logs" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "evaluationDetailId" TEXT,
    "changedByUserId" TEXT,
    "action" "common"."EvaluationAuditAction" NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."peer_feedback_invites" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "inviteeUserId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "status" "common"."PeerInviteStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "peer_feedback_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."evaluation_peer_feedbacks" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "weakness" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_peer_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."process_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "kichHoat" BOOLEAN NOT NULL DEFAULT true,
    "macDinhHeThong" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."holidays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."attendance_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."timesheet_cells" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "note" TEXT,
    "workHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheet_cells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."monthly_timesheet_overrides" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_timesheet_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."lookups" (
    "id" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lookups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."lookup_change_logs" (
    "id" TEXT NOT NULL,
    "lookupId" TEXT,
    "group" TEXT NOT NULL,
    "action" "common"."LookupChangeAction" NOT NULL,
    "oldLabel" TEXT,
    "newLabel" TEXT,
    "affectedRecords" INTEGER NOT NULL DEFAULT 0,
    "affectedTables" JSONB,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lookup_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "auth"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_secondary_departments_userId_departmentId_subDepartmen_key" ON "auth"."user_secondary_departments"("userId", "departmentId", "subDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "auth"."refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_userId_endpoint_key" ON "auth"."push_subscriptions"("userId", "endpoint");

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
CREATE UNIQUE INDEX "machine_systems_maHeThong_key" ON "business"."machine_systems"("maHeThong");

-- CreateIndex
CREATE INDEX "machine_systems_maHeThong_idx" ON "business"."machine_systems"("maHeThong");

-- CreateIndex
CREATE INDEX "machine_systems_parentSystemId_idx" ON "business"."machine_systems"("parentSystemId");

-- CreateIndex
CREATE INDEX "machine_status_logs_machineSystemId_idx" ON "business"."machine_status_logs"("machineSystemId");

-- CreateIndex
CREATE INDEX "machine_status_logs_thoiDiem_idx" ON "business"."machine_status_logs"("thoiDiem");

-- CreateIndex
CREATE UNIQUE INDEX "machine_system_details_maChiTiet_key" ON "business"."machine_system_details"("maChiTiet");

-- CreateIndex
CREATE INDEX "machine_system_details_machineSystemId_idx" ON "business"."machine_system_details"("machineSystemId");

-- CreateIndex
CREATE INDEX "machine_system_details_parentDetailId_idx" ON "business"."machine_system_details"("parentDetailId");

-- CreateIndex
CREATE INDEX "machine_system_details_loaiChiTiet_idx" ON "business"."machine_system_details"("loaiChiTiet");

-- CreateIndex
CREATE INDEX "machine_system_details_hoatDong_idx" ON "business"."machine_system_details"("hoatDong");

-- CreateIndex
CREATE INDEX "machine_system_details_trangThai_idx" ON "business"."machine_system_details"("trangThai");

-- CreateIndex
CREATE INDEX "machine_system_details_machineSystemId_thuTu_idx" ON "business"."machine_system_details"("machineSystemId", "thuTu");

-- CreateIndex
CREATE UNIQUE INDEX "fault_templates_maMauLoi_key" ON "business"."fault_templates"("maMauLoi");

-- CreateIndex
CREATE INDEX "fault_templates_machineSystemId_idx" ON "business"."fault_templates"("machineSystemId");

-- CreateIndex
CREATE INDEX "fault_templates_machineSystemDetailId_idx" ON "business"."fault_templates"("machineSystemDetailId");

-- CreateIndex
CREATE INDEX "fault_templates_hoatDong_idx" ON "business"."fault_templates"("hoatDong");

-- CreateIndex
CREATE INDEX "fault_templates_trangThai_idx" ON "business"."fault_templates"("trangThai");

-- CreateIndex
CREATE INDEX "repair_steps_faultTemplateId_idx" ON "business"."repair_steps"("faultTemplateId");

-- CreateIndex
CREATE INDEX "repair_steps_faultTemplateId_stepNumber_idx" ON "business"."repair_steps"("faultTemplateId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "fault_records_maLoi_key" ON "business"."fault_records"("maLoi");

-- CreateIndex
CREATE INDEX "fault_records_maLoi_idx" ON "business"."fault_records"("maLoi");

-- CreateIndex
CREATE INDEX "fault_records_machineSystemId_idx" ON "business"."fault_records"("machineSystemId");

-- CreateIndex
CREATE INDEX "fault_records_machineSystemDetailId_idx" ON "business"."fault_records"("machineSystemDetailId");

-- CreateIndex
CREATE INDEX "fault_records_faultTemplateId_idx" ON "business"."fault_records"("faultTemplateId");

-- CreateIndex
CREATE INDEX "fault_records_trangThai_idx" ON "business"."fault_records"("trangThai");

-- CreateIndex
CREATE INDEX "fault_records_createdById_idx" ON "business"."fault_records"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "spare_parts_maLinhKien_key" ON "business"."spare_parts"("maLinhKien");

-- CreateIndex
CREATE INDEX "spare_parts_maLinhKien_idx" ON "business"."spare_parts"("maLinhKien");

-- CreateIndex
CREATE INDEX "spare_parts_loai_idx" ON "business"."spare_parts"("loai");

-- CreateIndex
CREATE INDEX "spare_parts_trangThai_idx" ON "business"."spare_parts"("trangThai");

-- CreateIndex
CREATE INDEX "maintenance_templates_machineSystemDetailId_idx" ON "business"."maintenance_templates"("machineSystemDetailId");

-- CreateIndex
CREATE INDEX "maintenance_templates_hoatDong_idx" ON "business"."maintenance_templates"("hoatDong");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_plans_maKeHoach_key" ON "business"."maintenance_plans"("maKeHoach");

-- CreateIndex
CREATE INDEX "maintenance_plans_machineSystemId_idx" ON "business"."maintenance_plans"("machineSystemId");

-- CreateIndex
CREATE INDEX "maintenance_plans_nam_idx" ON "business"."maintenance_plans"("nam");

-- CreateIndex
CREATE INDEX "maintenance_plans_createdById_idx" ON "business"."maintenance_plans"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_plans_machineSystemId_nam_key" ON "business"."maintenance_plans"("machineSystemId", "nam");

-- CreateIndex
CREATE INDEX "maintenance_plan_items_maintenancePlanId_idx" ON "business"."maintenance_plan_items"("maintenancePlanId");

-- CreateIndex
CREATE INDEX "maintenance_plan_items_machineSystemDetailId_idx" ON "business"."maintenance_plan_items"("machineSystemDetailId");

-- CreateIndex
CREATE INDEX "maintenance_plan_item_logs_maintenancePlanItemId_idx" ON "business"."maintenance_plan_item_logs"("maintenancePlanItemId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_plan_item_logs_maintenancePlanItemId_thang_lanT_key" ON "business"."maintenance_plan_item_logs"("maintenancePlanItemId", "thang", "lanThu");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_records_maBienBan_key" ON "business"."maintenance_records"("maBienBan");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_records_sourceLogId_key" ON "business"."maintenance_records"("sourceLogId");

-- CreateIndex
CREATE INDEX "maintenance_records_maintenancePlanId_idx" ON "business"."maintenance_records"("maintenancePlanId");

-- CreateIndex
CREATE INDEX "maintenance_records_machineSystemId_idx" ON "business"."maintenance_records"("machineSystemId");

-- CreateIndex
CREATE INDEX "maintenance_records_machineSystemDetailId_idx" ON "business"."maintenance_records"("machineSystemDetailId");

-- CreateIndex
CREATE INDEX "maintenance_records_ngayThucHien_idx" ON "business"."maintenance_records"("ngayThucHien");

-- CreateIndex
CREATE INDEX "maintenance_records_sourceLogId_idx" ON "business"."maintenance_records"("sourceLogId");

-- CreateIndex
CREATE INDEX "maintenance_records_createdById_idx" ON "business"."maintenance_records"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "projects_maDuAn_key" ON "business"."projects"("maDuAn");

-- CreateIndex
CREATE INDEX "projects_nguoiTaoId_idx" ON "business"."projects"("nguoiTaoId");

-- CreateIndex
CREATE INDEX "projects_trangThai_idx" ON "business"."projects"("trangThai");

-- CreateIndex
CREATE INDEX "project_phases_projectId_idx" ON "business"."project_phases"("projectId");

-- CreateIndex
CREATE INDEX "project_phases_trangThai_idx" ON "business"."project_phases"("trangThai");

-- CreateIndex
CREATE INDEX "project_phases_projectId_thuTu_idx" ON "business"."project_phases"("projectId", "thuTu");

-- CreateIndex
CREATE INDEX "project_task_groups_projectPhaseId_idx" ON "business"."project_task_groups"("projectPhaseId");

-- CreateIndex
CREATE INDEX "project_task_groups_projectPhaseId_thuTu_idx" ON "business"."project_task_groups"("projectPhaseId", "thuTu");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_userId_key" ON "business"."project_members"("projectId", "userId");

-- CreateIndex
CREATE INDEX "project_tasks_projectId_idx" ON "business"."project_tasks"("projectId");

-- CreateIndex
CREATE INDEX "project_tasks_projectPhaseId_idx" ON "business"."project_tasks"("projectPhaseId");

-- CreateIndex
CREATE INDEX "project_tasks_projectTaskGroupId_idx" ON "business"."project_tasks"("projectTaskGroupId");

-- CreateIndex
CREATE INDEX "project_tasks_projectId_projectPhaseId_thuTu_idx" ON "business"."project_tasks"("projectId", "projectPhaseId", "thuTu");

-- CreateIndex
CREATE INDEX "project_updates_projectId_idx" ON "business"."project_updates"("projectId");

-- CreateIndex
CREATE INDEX "project_updates_projectPhaseId_idx" ON "business"."project_updates"("projectPhaseId");

-- CreateIndex
CREATE INDEX "project_updates_projectId_ngay_idx" ON "business"."project_updates"("projectId", "ngay");

-- CreateIndex
CREATE INDEX "project_costs_projectId_idx" ON "business"."project_costs"("projectId");

-- CreateIndex
CREATE INDEX "project_costs_projectPhaseId_idx" ON "business"."project_costs"("projectPhaseId");

-- CreateIndex
CREATE INDEX "project_costs_projectTaskId_idx" ON "business"."project_costs"("projectTaskId");

-- CreateIndex
CREATE INDEX "project_approvals_projectId_idx" ON "business"."project_approvals"("projectId");

-- CreateIndex
CREATE INDEX "repair_request_status_logs_repairRequestId_idx" ON "business"."repair_request_status_logs"("repairRequestId");

-- CreateIndex
CREATE INDEX "repair_request_status_logs_createdAt_idx" ON "business"."repair_request_status_logs"("createdAt");

-- CreateIndex
CREATE INDEX "fault_record_status_logs_faultRecordId_createdAt_idx" ON "business"."fault_record_status_logs"("faultRecordId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "business"."product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "international_products_maSanPham_key" ON "business"."international_products"("maSanPham");

-- CreateIndex
CREATE INDEX "international_products_tenSanPham_idx" ON "business"."international_products"("tenSanPham");

-- CreateIndex
CREATE INDEX "international_products_loaiSanPham_idx" ON "business"."international_products"("loaiSanPham");

-- CreateIndex
CREATE INDEX "international_products_createdAt_idx" ON "business"."international_products"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_reorder_rules_internationalProductId_key" ON "business"."product_reorder_rules"("internationalProductId");

-- CreateIndex
CREATE INDEX "product_reorder_rules_active_idx" ON "business"."product_reorder_rules"("active");

-- CreateIndex
CREATE UNIQUE INDEX "customers_maKhachHang_key" ON "business"."customers"("maKhachHang");

-- CreateIndex
CREATE INDEX "customer_feedbacks_createdById_idx" ON "business"."customer_feedbacks"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_requests_maYeuCauBaoGia_key" ON "business"."quotation_requests"("maYeuCauBaoGia");

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
CREATE INDEX "tax_reports_orderId_idx" ON "business"."tax_reports"("orderId");

-- CreateIndex
CREATE INDEX "tax_reports_trangThai_idx" ON "business"."tax_reports"("trangThai");

-- CreateIndex
CREATE INDEX "quotation_revisions_quotationId_idx" ON "business"."quotation_revisions"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_revisions_quotationId_revisionNumber_key" ON "business"."quotation_revisions"("quotationId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_soHoaDon_key" ON "business"."invoices"("soHoaDon");

-- CreateIndex
CREATE INDEX "invoices_customerId_idx" ON "business"."invoices"("customerId");

-- CreateIndex
CREATE INDEX "invoices_ngayLap_idx" ON "business"."invoices"("ngayLap");

-- CreateIndex
CREATE INDEX "invoices_trangThai_idx" ON "business"."invoices"("trangThai");

-- CreateIndex
CREATE INDEX "debts_supplierId_idx" ON "business"."debts"("supplierId");

-- CreateIndex
CREATE INDEX "debts_ngayPhatSinh_idx" ON "business"."debts"("ngayPhatSinh");

-- CreateIndex
CREATE INDEX "debts_ngayDenHan_idx" ON "business"."debts"("ngayDenHan");

-- CreateIndex
CREATE UNIQUE INDEX "supply_requests_maYeuCau_key" ON "business"."supply_requests"("maYeuCau");

-- CreateIndex
CREATE INDEX "supply_request_decisions_supplyRequestItemId_idx" ON "business"."supply_request_decisions"("supplyRequestItemId");

-- CreateIndex
CREATE INDEX "supply_request_decisions_decidedByEmployeeId_idx" ON "business"."supply_request_decisions"("decidedByEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_maYeuCau_key" ON "business"."purchase_requests"("maYeuCau");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_maNhaCungCap_key" ON "business"."suppliers"("maNhaCungCap");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_maKho_key" ON "business"."warehouses"("maKho");

-- CreateIndex
CREATE UNIQUE INDEX "lot_products_lotId_maKien_key" ON "business"."lot_products"("lotId", "maKien");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_receipts_maPhieuNhap_key" ON "business"."warehouse_receipts"("maPhieuNhap");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_issues_maPhieuXuat_key" ON "business"."warehouse_issues"("maPhieuXuat");

-- CreateIndex
CREATE UNIQUE INDEX "material_evaluations_warehouseIssueId_key" ON "business"."material_evaluations"("warehouseIssueId");

-- CreateIndex
CREATE INDEX "material_evaluations_lotProductId_idx" ON "business"."material_evaluations"("lotProductId");

-- CreateIndex
CREATE INDEX "material_evaluations_createdById_idx" ON "business"."material_evaluations"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "material_evaluations_maChien_ngaySanXuat_key" ON "business"."material_evaluations"("maChien", "ngaySanXuat");

-- CreateIndex
CREATE UNIQUE INDEX "material_evaluation_criteria_code_key" ON "business"."material_evaluation_criteria"("code");

-- CreateIndex
CREATE INDEX "system_operations_machineSystemId_idx" ON "business"."system_operations"("machineSystemId");

-- CreateIndex
CREATE UNIQUE INDEX "system_operations_maChien_ngaySanXuat_machineSystemId_key" ON "business"."system_operations"("maChien", "ngaySanXuat", "machineSystemId");

-- CreateIndex
CREATE INDEX "finished_products_machineSystemId_idx" ON "business"."finished_products"("machineSystemId");

-- CreateIndex
CREATE INDEX "finished_products_internationalProductId_idx" ON "business"."finished_products"("internationalProductId");

-- CreateIndex
CREATE INDEX "finished_products_createdById_idx" ON "business"."finished_products"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "finished_products_maChien_ngaySanXuat_machineSystemId_key" ON "business"."finished_products"("maChien", "ngaySanXuat", "machineSystemId");

-- CreateIndex
CREATE INDEX "finished_product_entry_history_finishedProductId_idx" ON "business"."finished_product_entry_history"("finishedProductId");

-- CreateIndex
CREATE INDEX "finished_product_entry_history_maChien_ngaySanXuat_machineS_idx" ON "business"."finished_product_entry_history"("maChien", "ngaySanXuat", "machineSystemId");

-- CreateIndex
CREATE INDEX "finished_product_entry_history_employeeId_idx" ON "business"."finished_product_entry_history"("employeeId");

-- CreateIndex
CREATE INDEX "quality_evaluations_machineSystemId_idx" ON "business"."quality_evaluations"("machineSystemId");

-- CreateIndex
CREATE INDEX "quality_evaluations_createdById_idx" ON "business"."quality_evaluations"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "quality_evaluations_maChien_ngaySanXuat_machineSystemId_key" ON "business"."quality_evaluations"("maChien", "ngaySanXuat", "machineSystemId");

-- CreateIndex
CREATE INDEX "production_reports_createdById_idx" ON "business"."production_reports"("createdById");

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
CREATE UNIQUE INDEX "data_entry_page_positions_pageKey_positionId_key" ON "common"."data_entry_page_positions"("pageKey", "positionId");

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
CREATE INDEX "notifications_employeeId_createdAt_idx" ON "common"."notifications"("employeeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_employeeId_isRead_idx" ON "common"."notifications"("employeeId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "products_productCode_key" ON "common"."products"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "quality_checks_checkCode_key" ON "common"."quality_checks"("checkCode");

-- CreateIndex
CREATE UNIQUE INDEX "processes_maQuyTrinh_key" ON "common"."processes"("maQuyTrinh");

-- CreateIndex
CREATE UNIQUE INDEX "process_flowcharts_processId_key" ON "common"."process_flowcharts"("processId");

-- CreateIndex
CREATE INDEX "process_flowchart_section_files_sectionId_order_idx" ON "common"."process_flowchart_section_files"("sectionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "production_processes_maQuyTrinhSanXuat_key" ON "common"."production_processes"("maQuyTrinhSanXuat");

-- CreateIndex
CREATE UNIQUE INDEX "production_flowcharts_productionProcessId_key" ON "common"."production_flowcharts"("productionProcessId");

-- CreateIndex
CREATE INDEX "production_flowchart_section_files_sectionId_order_idx" ON "common"."production_flowchart_section_files"("sectionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "internal_inspections_inspectionCode_key" ON "common"."internal_inspections"("inspectionCode");

-- CreateIndex
CREATE INDEX "internal_inspections_createdById_idx" ON "common"."internal_inspections"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_violationCode_key" ON "common"."inspections"("violationCode");

-- CreateIndex
CREATE UNIQUE INDEX "payrolls_employeeId_month_year_key" ON "common"."payrolls"("employeeId", "month", "year");

-- CreateIndex
CREATE INDEX "attendances_employeeId_attendanceDate_isOvertime_idx" ON "common"."attendances"("employeeId", "attendanceDate", "isOvertime");

-- CreateIndex
CREATE UNIQUE INDEX "work_shifts_name_key" ON "common"."work_shifts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "material_standards_maDinhMuc_key" ON "common"."material_standards"("maDinhMuc");

-- CreateIndex
CREATE INDEX "material_standard_items_internationalProductId_idx" ON "common"."material_standard_items"("internationalProductId");

-- CreateIndex
CREATE INDEX "material_standard_input_items_internationalProductId_idx" ON "common"."material_standard_input_items"("internationalProductId");

-- CreateIndex
CREATE INDEX "daily_work_reports_employeeId_reportDate_idx" ON "common"."daily_work_reports"("employeeId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "private_feedbacks_code_key" ON "common"."private_feedbacks"("code");

-- CreateIndex
CREATE UNIQUE INDEX "leave_requests_code_key" ON "common"."leave_requests"("code");

-- CreateIndex
CREATE UNIQUE INDEX "repair_requests_maYeuCau_key" ON "common"."repair_requests"("maYeuCau");

-- CreateIndex
CREATE INDEX "repair_requests_createdById_idx" ON "common"."repair_requests"("createdById");

-- CreateIndex
CREATE INDEX "repair_request_items_repairRequestId_idx" ON "common"."repair_request_items"("repairRequestId");

-- CreateIndex
CREATE INDEX "repair_request_items_machineSystemId_idx" ON "common"."repair_request_items"("machineSystemId");

-- CreateIndex
CREATE INDEX "repair_request_items_machineSystemDetailId_idx" ON "common"."repair_request_items"("machineSystemDetailId");

-- CreateIndex
CREATE INDEX "repair_request_items_faultRecordId_idx" ON "common"."repair_request_items"("faultRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "acceptance_handovers_maNghiemThu_key" ON "common"."acceptance_handovers"("maNghiemThu");

-- CreateIndex
CREATE INDEX "acceptance_handovers_createdById_idx" ON "common"."acceptance_handovers"("createdById");

-- CreateIndex
CREATE INDEX "acceptance_handover_items_acceptanceHandoverId_idx" ON "common"."acceptance_handover_items"("acceptanceHandoverId");

-- CreateIndex
CREATE INDEX "acceptance_handover_items_repairRequestItemId_idx" ON "common"."acceptance_handover_items"("repairRequestItemId");

-- CreateIndex
CREATE INDEX "acceptance_handover_items_machineSystemId_idx" ON "common"."acceptance_handover_items"("machineSystemId");

-- CreateIndex
CREATE INDEX "acceptance_handover_items_machineSystemDetailId_idx" ON "common"."acceptance_handover_items"("machineSystemDetailId");

-- CreateIndex
CREATE UNIQUE INDEX "acceptance_handover_items_acceptanceHandoverId_repairReques_key" ON "common"."acceptance_handover_items"("acceptanceHandoverId", "repairRequestItemId");

-- CreateIndex
CREATE INDEX "overtime_plan_items_overtimePlanId_idx" ON "common"."overtime_plan_items"("overtimePlanId");

-- CreateIndex
CREATE INDEX "overtime_plan_items_ngayTangCa_idx" ON "common"."overtime_plan_items"("ngayTangCa");

-- CreateIndex
CREATE INDEX "overtime_plan_items_workShiftId_idx" ON "common"."overtime_plan_items"("workShiftId");

-- CreateIndex
CREATE UNIQUE INDEX "face_profiles_employeeId_key" ON "common"."face_profiles"("employeeId");

-- CreateIndex
CREATE INDEX "face_images_faceProfileId_idx" ON "common"."face_images"("faceProfileId");

-- CreateIndex
CREATE INDEX "face_images_faceProfileId_rotatedAt_idx" ON "common"."face_images"("faceProfileId", "rotatedAt");

-- CreateIndex
CREATE INDEX "face_adaptive_events_faceProfileId_createdAt_idx" ON "common"."face_adaptive_events"("faceProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "face_adaptive_events_eventType_createdAt_idx" ON "common"."face_adaptive_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "face_attendance_logs_employeeId_createdAt_idx" ON "common"."face_attendance_logs"("employeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_devices_apiKey_key" ON "common"."attendance_devices"("apiKey");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "common"."notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_notificationType_key" ON "common"."notification_preferences"("userId", "notificationType");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "common"."audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "common"."audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "common"."audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "evaluation_evidences_evaluationDetailId_idx" ON "common"."evaluation_evidences"("evaluationDetailId");

-- CreateIndex
CREATE INDEX "evaluation_goals_evaluationId_orderIndex_idx" ON "common"."evaluation_goals"("evaluationId", "orderIndex");

-- CreateIndex
CREATE INDEX "evaluation_idp_items_evaluationId_orderIndex_idx" ON "common"."evaluation_idp_items"("evaluationId", "orderIndex");

-- CreateIndex
CREATE INDEX "evaluation_audit_logs_evaluationId_createdAt_idx" ON "common"."evaluation_audit_logs"("evaluationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "evaluation_audit_logs_evaluationDetailId_idx" ON "common"."evaluation_audit_logs"("evaluationDetailId");

-- CreateIndex
CREATE UNIQUE INDEX "peer_feedback_invites_token_key" ON "common"."peer_feedback_invites"("token");

-- CreateIndex
CREATE INDEX "peer_feedback_invites_token_idx" ON "common"."peer_feedback_invites"("token");

-- CreateIndex
CREATE INDEX "peer_feedback_invites_evaluationId_idx" ON "common"."peer_feedback_invites"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "peer_feedback_invites_evaluationId_inviteeUserId_key" ON "common"."peer_feedback_invites"("evaluationId", "inviteeUserId");

-- CreateIndex
CREATE INDEX "evaluation_peer_feedbacks_evaluationId_idx" ON "common"."evaluation_peer_feedbacks"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "process_types_code_key" ON "common"."process_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "process_types_name_key" ON "common"."process_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_codes_code_key" ON "common"."attendance_codes"("code");

-- CreateIndex
CREATE INDEX "timesheet_cells_employeeId_idx" ON "common"."timesheet_cells"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "timesheet_cells_employeeId_date_key" ON "common"."timesheet_cells"("employeeId", "date");

-- CreateIndex
CREATE INDEX "monthly_timesheet_overrides_employeeId_month_year_idx" ON "common"."monthly_timesheet_overrides"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_timesheet_overrides_employeeId_month_year_fieldKey_key" ON "common"."monthly_timesheet_overrides"("employeeId", "month", "year", "fieldKey");

-- CreateIndex
CREATE INDEX "lookups_group_isActive_sortOrder_idx" ON "common"."lookups"("group", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "lookups_group_code_key" ON "common"."lookups"("group", "code");

-- CreateIndex
CREATE INDEX "lookup_change_logs_lookupId_createdAt_idx" ON "common"."lookup_change_logs"("lookupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "lookup_change_logs_group_createdAt_idx" ON "common"."lookup_change_logs"("group", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "auth"."user_secondary_departments" ADD CONSTRAINT "user_secondary_departments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "auth"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "auth"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "auth"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."machine_systems" ADD CONSTRAINT "machine_systems_parentSystemId_fkey" FOREIGN KEY ("parentSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."machine_status_logs" ADD CONSTRAINT "machine_status_logs_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."machine_system_details" ADD CONSTRAINT "machine_system_details_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."machine_system_details" ADD CONSTRAINT "machine_system_details_parentDetailId_fkey" FOREIGN KEY ("parentDetailId") REFERENCES "business"."machine_system_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."fault_templates" ADD CONSTRAINT "fault_templates_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."fault_templates" ADD CONSTRAINT "fault_templates_machineSystemDetailId_fkey" FOREIGN KEY ("machineSystemDetailId") REFERENCES "business"."machine_system_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."repair_steps" ADD CONSTRAINT "repair_steps_faultTemplateId_fkey" FOREIGN KEY ("faultTemplateId") REFERENCES "business"."fault_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."fault_records" ADD CONSTRAINT "fault_records_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."fault_records" ADD CONSTRAINT "fault_records_machineSystemDetailId_fkey" FOREIGN KEY ("machineSystemDetailId") REFERENCES "business"."machine_system_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."fault_records" ADD CONSTRAINT "fault_records_faultTemplateId_fkey" FOREIGN KEY ("faultTemplateId") REFERENCES "business"."fault_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."maintenance_templates" ADD CONSTRAINT "maintenance_templates_machineSystemDetailId_fkey" FOREIGN KEY ("machineSystemDetailId") REFERENCES "business"."machine_system_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."maintenance_plans" ADD CONSTRAINT "maintenance_plans_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."maintenance_plan_items" ADD CONSTRAINT "maintenance_plan_items_maintenancePlanId_fkey" FOREIGN KEY ("maintenancePlanId") REFERENCES "business"."maintenance_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."maintenance_plan_items" ADD CONSTRAINT "maintenance_plan_items_machineSystemDetailId_fkey" FOREIGN KEY ("machineSystemDetailId") REFERENCES "business"."machine_system_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."maintenance_plan_items" ADD CONSTRAINT "maintenance_plan_items_maintenanceTemplateId_fkey" FOREIGN KEY ("maintenanceTemplateId") REFERENCES "business"."maintenance_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."maintenance_plan_item_logs" ADD CONSTRAINT "maintenance_plan_item_logs_maintenancePlanItemId_fkey" FOREIGN KEY ("maintenancePlanItemId") REFERENCES "business"."maintenance_plan_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."maintenance_records" ADD CONSTRAINT "maintenance_records_maintenancePlanId_fkey" FOREIGN KEY ("maintenancePlanId") REFERENCES "business"."maintenance_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."maintenance_records" ADD CONSTRAINT "maintenance_records_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."maintenance_records" ADD CONSTRAINT "maintenance_records_machineSystemDetailId_fkey" FOREIGN KEY ("machineSystemDetailId") REFERENCES "business"."machine_system_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_phases" ADD CONSTRAINT "project_phases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "business"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_task_groups" ADD CONSTRAINT "project_task_groups_projectPhaseId_fkey" FOREIGN KEY ("projectPhaseId") REFERENCES "business"."project_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "business"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_tasks" ADD CONSTRAINT "project_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "business"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_tasks" ADD CONSTRAINT "project_tasks_projectPhaseId_fkey" FOREIGN KEY ("projectPhaseId") REFERENCES "business"."project_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_tasks" ADD CONSTRAINT "project_tasks_projectTaskGroupId_fkey" FOREIGN KEY ("projectTaskGroupId") REFERENCES "business"."project_task_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_updates" ADD CONSTRAINT "project_updates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "business"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_updates" ADD CONSTRAINT "project_updates_projectPhaseId_fkey" FOREIGN KEY ("projectPhaseId") REFERENCES "business"."project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_costs" ADD CONSTRAINT "project_costs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "business"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_costs" ADD CONSTRAINT "project_costs_projectPhaseId_fkey" FOREIGN KEY ("projectPhaseId") REFERENCES "business"."project_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_costs" ADD CONSTRAINT "project_costs_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "business"."project_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_approvals" ADD CONSTRAINT "project_approvals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "business"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."repair_request_status_logs" ADD CONSTRAINT "repair_request_status_logs_repairRequestId_fkey" FOREIGN KEY ("repairRequestId") REFERENCES "common"."repair_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."fault_record_status_logs" ADD CONSTRAINT "fault_record_status_logs_faultRecordId_fkey" FOREIGN KEY ("faultRecordId") REFERENCES "business"."fault_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."product_reorder_rules" ADD CONSTRAINT "product_reorder_rules_internationalProductId_fkey" FOREIGN KEY ("internationalProductId") REFERENCES "business"."international_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."customer_feedbacks" ADD CONSTRAINT "customer_feedbacks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_requests" ADD CONSTRAINT "quotation_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_requests" ADD CONSTRAINT "quotation_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_request_items" ADD CONSTRAINT "quotation_request_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "business"."international_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quotation_request_items" ADD CONSTRAINT "quotation_request_items_quotationRequestId_fkey" FOREIGN KEY ("quotationRequestId") REFERENCES "business"."quotation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "business"."quotation_revisions" ADD CONSTRAINT "quotation_revisions_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "business"."quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "business"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."debts" ADD CONSTRAINT "debts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "business"."suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."supply_requests" ADD CONSTRAINT "supply_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."supply_request_items" ADD CONSTRAINT "supply_request_items_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."supply_request_decisions" ADD CONSTRAINT "supply_request_decisions_supplyRequestItemId_fkey" FOREIGN KEY ("supplyRequestItemId") REFERENCES "business"."supply_request_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."purchase_requests" ADD CONSTRAINT "purchase_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."purchase_requests" ADD CONSTRAINT "purchase_requests_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."purchase_requests" ADD CONSTRAINT "purchase_requests_nhaCungCapId_fkey" FOREIGN KEY ("nhaCungCapId") REFERENCES "business"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."purchase_request_items" ADD CONSTRAINT "purchase_request_items_nhaCungCapId_fkey" FOREIGN KEY ("nhaCungCapId") REFERENCES "business"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."purchase_request_items" ADD CONSTRAINT "purchase_request_items_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "business"."purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."suppliers" ADD CONSTRAINT "suppliers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."lots" ADD CONSTRAINT "lots_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "business"."warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."lot_products" ADD CONSTRAINT "lot_products_internationalProductId_fkey" FOREIGN KEY ("internationalProductId") REFERENCES "business"."international_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."lot_products" ADD CONSTRAINT "lot_products_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "business"."lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."warehouse_receipts" ADD CONSTRAINT "warehouse_receipts_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."warehouse_receipts" ADD CONSTRAINT "warehouse_receipts_lotProductId_fkey" FOREIGN KEY ("lotProductId") REFERENCES "business"."lot_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."warehouse_issues" ADD CONSTRAINT "warehouse_issues_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."warehouse_issues" ADD CONSTRAINT "warehouse_issues_lotProductId_fkey" FOREIGN KEY ("lotProductId") REFERENCES "business"."lot_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."material_evaluations" ADD CONSTRAINT "material_evaluations_lotProductId_fkey" FOREIGN KEY ("lotProductId") REFERENCES "business"."lot_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."material_evaluations" ADD CONSTRAINT "material_evaluations_warehouseIssueId_fkey" FOREIGN KEY ("warehouseIssueId") REFERENCES "business"."warehouse_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."system_operations" ADD CONSTRAINT "system_operations_materialEvaluationId_fkey" FOREIGN KEY ("materialEvaluationId") REFERENCES "business"."material_evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."system_operations" ADD CONSTRAINT "system_operations_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."finished_products" ADD CONSTRAINT "finished_products_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."finished_products" ADD CONSTRAINT "finished_products_materialEvaluationId_fkey" FOREIGN KEY ("materialEvaluationId") REFERENCES "business"."material_evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."finished_products" ADD CONSTRAINT "finished_products_internationalProductId_fkey" FOREIGN KEY ("internationalProductId") REFERENCES "business"."international_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."finished_product_entry_history" ADD CONSTRAINT "finished_product_entry_history_finishedProductId_fkey" FOREIGN KEY ("finishedProductId") REFERENCES "business"."finished_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quality_evaluations" ADD CONSTRAINT "quality_evaluations_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quality_evaluations" ADD CONSTRAINT "quality_evaluations_finishedProductId_fkey" FOREIGN KEY ("finishedProductId") REFERENCES "business"."finished_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."quality_evaluations" ADD CONSTRAINT "quality_evaluations_materialEvaluationId_fkey" FOREIGN KEY ("materialEvaluationId") REFERENCES "business"."material_evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."sub_departments" ADD CONSTRAINT "sub_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "common"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."data_entry_page_positions" ADD CONSTRAINT "data_entry_page_positions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "common"."positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "common"."process_flowchart_section_files" ADD CONSTRAINT "process_flowchart_section_files_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "common"."process_flowchart_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."process_flowchart_section_files" ADD CONSTRAINT "process_flowchart_section_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "common"."production_flowchart_section_files" ADD CONSTRAINT "production_flowchart_section_files_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "common"."production_flowchart_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."production_flowchart_section_files" ADD CONSTRAINT "production_flowchart_section_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."production_flowchart_costs" ADD CONSTRAINT "production_flowchart_costs_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "common"."production_flowchart_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."inspections" ADD CONSTRAINT "inspections_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."payrolls" ADD CONSTRAINT "payrolls_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."attendances" ADD CONSTRAINT "attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."material_standard_items" ADD CONSTRAINT "material_standard_items_materialStandardId_fkey" FOREIGN KEY ("materialStandardId") REFERENCES "common"."material_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."material_standard_items" ADD CONSTRAINT "material_standard_items_internationalProductId_fkey" FOREIGN KEY ("internationalProductId") REFERENCES "business"."international_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."material_standard_input_items" ADD CONSTRAINT "material_standard_input_items_materialStandardId_fkey" FOREIGN KEY ("materialStandardId") REFERENCES "common"."material_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."material_standard_input_items" ADD CONSTRAINT "material_standard_input_items_internationalProductId_fkey" FOREIGN KEY ("internationalProductId") REFERENCES "business"."international_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."daily_work_reports" ADD CONSTRAINT "daily_work_reports_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."private_feedbacks" ADD CONSTRAINT "private_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."repair_request_items" ADD CONSTRAINT "repair_request_items_repairRequestId_fkey" FOREIGN KEY ("repairRequestId") REFERENCES "common"."repair_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."repair_request_items" ADD CONSTRAINT "repair_request_items_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."repair_request_items" ADD CONSTRAINT "repair_request_items_machineSystemDetailId_fkey" FOREIGN KEY ("machineSystemDetailId") REFERENCES "business"."machine_system_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."repair_request_items" ADD CONSTRAINT "repair_request_items_faultRecordId_fkey" FOREIGN KEY ("faultRecordId") REFERENCES "business"."fault_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."acceptance_handovers" ADD CONSTRAINT "acceptance_handovers_repairRequestId_fkey" FOREIGN KEY ("repairRequestId") REFERENCES "common"."repair_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."acceptance_handover_items" ADD CONSTRAINT "acceptance_handover_items_acceptanceHandoverId_fkey" FOREIGN KEY ("acceptanceHandoverId") REFERENCES "common"."acceptance_handovers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."acceptance_handover_items" ADD CONSTRAINT "acceptance_handover_items_repairRequestItemId_fkey" FOREIGN KEY ("repairRequestItemId") REFERENCES "common"."repair_request_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."acceptance_handover_items" ADD CONSTRAINT "acceptance_handover_items_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."acceptance_handover_items" ADD CONSTRAINT "acceptance_handover_items_machineSystemDetailId_fkey" FOREIGN KEY ("machineSystemDetailId") REFERENCES "business"."machine_system_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."overtime_plan_items" ADD CONSTRAINT "overtime_plan_items_overtimePlanId_fkey" FOREIGN KEY ("overtimePlanId") REFERENCES "common"."overtime_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."overtime_plan_items" ADD CONSTRAINT "overtime_plan_items_workShiftId_fkey" FOREIGN KEY ("workShiftId") REFERENCES "common"."work_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."face_profiles" ADD CONSTRAINT "face_profiles_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."face_images" ADD CONSTRAINT "face_images_faceProfileId_fkey" FOREIGN KEY ("faceProfileId") REFERENCES "common"."face_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."face_attendance_logs" ADD CONSTRAINT "face_attendance_logs_faceProfileId_fkey" FOREIGN KEY ("faceProfileId") REFERENCES "common"."face_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_evidences" ADD CONSTRAINT "evaluation_evidences_evaluationDetailId_fkey" FOREIGN KEY ("evaluationDetailId") REFERENCES "common"."evaluation_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_goals" ADD CONSTRAINT "evaluation_goals_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "common"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_idp_items" ADD CONSTRAINT "evaluation_idp_items_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "common"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_audit_logs" ADD CONSTRAINT "evaluation_audit_logs_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "common"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_audit_logs" ADD CONSTRAINT "evaluation_audit_logs_evaluationDetailId_fkey" FOREIGN KEY ("evaluationDetailId") REFERENCES "common"."evaluation_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."peer_feedback_invites" ADD CONSTRAINT "peer_feedback_invites_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "common"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_peer_feedbacks" ADD CONSTRAINT "evaluation_peer_feedbacks_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "common"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."timesheet_cells" ADD CONSTRAINT "timesheet_cells_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."monthly_timesheet_overrides" ADD CONSTRAINT "monthly_timesheet_overrides_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."lookup_change_logs" ADD CONSTRAINT "lookup_change_logs_lookupId_fkey" FOREIGN KEY ("lookupId") REFERENCES "common"."lookups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

