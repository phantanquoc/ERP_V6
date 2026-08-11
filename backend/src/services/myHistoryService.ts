import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HistoryGroup = 'Yêu cầu' | 'Nhiệm vụ' | 'Kế hoạch' | 'Báo cáo' | 'Phiếu';

export interface HistoryItem {
  entityType: string;
  entityId: string;         // CUID or stringified Int for RepairRequest
  group: HistoryGroup;
  title: string;
  code?: string | null;
  status?: string | null;
  createdAt: Date;
  role: 'creator' | 'related';
  metadata?: Record<string, unknown>;
  routeHint: string;
}

export interface MyHistoryQuery {
  userId: string;
  dateFrom?: Date;
  dateTo?: Date;
  types?: string[];
  statuses?: string[];
  roleFilter?: 'created' | 'related' | 'both';
  search?: string;
  page?: number;
  limit?: number;
}

export interface MyHistoryResult {
  items: HistoryItem[];
  total: number;
  page: number;
  totalPages: number;
  groupCounts: Record<HistoryGroup, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateWhere(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) return undefined;
  const where: any = {};
  if (dateFrom) where.gte = dateFrom;
  if (dateTo) where.lte = dateTo;
  return where;
}

function shouldQuery(types: string[] | undefined, entityType: string): boolean {
  if (!types || types.length === 0) return true;
  return types.includes(entityType);
}

function safeWrap<T>(promise: Promise<T[]>, entityType: string): Promise<T[]> {
  return promise.catch((err) => {
    console.error(`[myHistoryService] Failed to fetch ${entityType}:`, err);
    return [];
  });
}

// ─── Entity query functions ────────────────────────────────────────────────────

async function fetchQuotationRequests(employeeId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.quotationRequest.findMany({
    where: { employeeId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maYeuCauBaoGia: true, tenKhachHang: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'quotation-request',
    entityId: r.id,
    group: 'Yêu cầu' as HistoryGroup,
    title: `Yêu cầu báo giá - ${r.tenKhachHang}`,
    code: r.maYeuCauBaoGia,
    status: r.status as string,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/business/domestic?tab=quotationRequests`,
  }));
}

async function fetchSupplyRequests(employeeId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.supplyRequest.findMany({
    where: { employeeId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maYeuCau: true, mucDoUuTien: true, trangThai: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'supply-request',
    entityId: r.id,
    group: 'Yêu cầu' as HistoryGroup,
    title: `Yêu cầu cung cấp ${r.maYeuCau}`,
    code: r.maYeuCau,
    status: r.trangThai,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/production/warehouse?tab=supplyRequest&supplyRequestId=${r.id}`,
  }));
}

async function fetchPurchaseRequests(employeeId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.purchaseRequest.findMany({
    where: { employeeId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maYeuCau: true, mucDoUuTien: true, trangThai: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'purchase-request',
    entityId: r.id,
    group: 'Yêu cầu' as HistoryGroup,
    title: `Yêu cầu mua hàng ${r.maYeuCau}`,
    code: r.maYeuCau,
    status: r.trangThai,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/purchasing/materials?tab=purchaseRequestList&purchaseRequestId=${r.id}`,
  }));
}

async function fetchLeaveRequests(employeeId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.leaveRequest.findMany({
    where: { employeeId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, code: true, leaveType: true, status: true, createdAt: true, startDate: true, endDate: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'leave-request',
    entityId: r.id,
    group: 'Yêu cầu' as HistoryGroup,
    title: `Đơn nghỉ phép - ${r.leaveType}`,
    code: r.code,
    status: r.status as string,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/dashboard`,
  }));
}

async function fetchRepairRequestsCreator(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.repairRequest.findMany({
    where: { createdById: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maYeuCau: true, mucDoUuTien: true, trangThai: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'repair-request',
    entityId: String(r.id),
    group: 'Yêu cầu' as HistoryGroup,
    title: `Yêu cầu sửa chữa ${r.maYeuCau}`,
    code: r.maYeuCau,
    status: r.trangThai,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/technical/quality?tab=repairAndFault`,
  }));
}

// Nhiệm vụ group
async function fetchTasksCreator(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.task.findMany({
    where: { nguoiGiaoId: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, noiDung: true, mucDoUuTien: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'task',
    entityId: r.id,
    group: 'Nhiệm vụ' as HistoryGroup,
    title: `Nhiệm vụ: ${r.noiDung.slice(0, 80)}`,
    status: null,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/dashboard`,
  }));
}

async function fetchTasksRelated(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.task.findMany({
    where: {
      nguoiNhanIds: { has: userId },
      NOT: { nguoiGiaoId: userId },
      ...(dateWhere ? { createdAt: dateWhere } : {}),
    },
    select: { id: true, noiDung: true, mucDoUuTien: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'task',
    entityId: r.id,
    group: 'Nhiệm vụ' as HistoryGroup,
    title: `Nhiệm vụ: ${r.noiDung.slice(0, 80)}`,
    status: null,
    createdAt: r.createdAt,
    role: 'related' as const,
    routeHint: `/dashboard`,
  }));
}

async function fetchOvertimePlans(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.overtimePlan.findMany({
    where: { nguoiTaoId: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, noiDung: true, trangThai: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'overtime-plan',
    entityId: r.id,
    group: 'Nhiệm vụ' as HistoryGroup,
    title: `Kế hoạch tăng ca: ${r.noiDung.slice(0, 80)}`,
    status: r.trangThai as string,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/dashboard`,
  }));
}

async function fetchDailyWorkReports(employeeId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.dailyWorkReport.findMany({
    where: { employeeId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, reportDate: true, status: true, createdAt: true, workDescription: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'daily-work-report',
    entityId: r.id,
    group: 'Nhiệm vụ' as HistoryGroup,
    title: `Báo cáo công việc ngày ${new Date(r.reportDate).toLocaleDateString('vi-VN')}`,
    status: r.status as string,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/dashboard`,
  }));
}

// Kế hoạch group
async function fetchWorkPlansCreator(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.workPlan.findMany({
    where: { nguoiTaoId: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, tieuDe: true, trangThai: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'work-plan',
    entityId: r.id,
    group: 'Kế hoạch' as HistoryGroup,
    title: r.tieuDe,
    status: r.trangThai as string,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/dashboard`,
  }));
}

async function fetchWorkPlansRelated(employeeId: string, userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.workPlan.findMany({
    where: {
      nguoiThucHienIds: { has: employeeId },
      NOT: { nguoiTaoId: userId },
      ...(dateWhere ? { createdAt: dateWhere } : {}),
    },
    select: { id: true, tieuDe: true, trangThai: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'work-plan',
    entityId: r.id,
    group: 'Kế hoạch' as HistoryGroup,
    title: r.tieuDe,
    status: r.trangThai as string,
    createdAt: r.createdAt,
    role: 'related' as const,
    routeHint: `/dashboard`,
  }));
}

async function fetchMaintenancePlans(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.maintenancePlan.findMany({
    where: { createdById: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maKeHoach: true, trangThai: true, createdAt: true, nam: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'maintenance-plan',
    entityId: r.id,
    group: 'Kế hoạch' as HistoryGroup,
    title: `Kế hoạch bảo trì ${r.maKeHoach} năm ${r.nam}`,
    code: r.maKeHoach,
    status: r.trangThai,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/technical/quality?tab=maintenance`,
  }));
}

async function fetchProjectsCreator(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.project.findMany({
    where: { nguoiTaoId: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maDuAn: true, tenDuAn: true, trangThai: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'project',
    entityId: r.id,
    group: 'Kế hoạch' as HistoryGroup,
    title: r.tenDuAn,
    code: r.maDuAn,
    status: r.trangThai,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/technical/projects?projectId=${r.id}`,
  }));
}

async function fetchProjectsRelated(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.projectMember.findMany({
    where: {
      userId,
      NOT: { project: { nguoiTaoId: userId } },
      ...(dateWhere ? { ngayThamGia: dateWhere } : {}),
    },
    select: {
      ngayThamGia: true,
      project: { select: { id: true, maDuAn: true, tenDuAn: true, trangThai: true, createdAt: true } },
    },
    orderBy: { ngayThamGia: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'project',
    entityId: r.project.id,
    group: 'Kế hoạch' as HistoryGroup,
    title: r.project.tenDuAn,
    code: r.project.maDuAn,
    status: r.project.trangThai,
    createdAt: r.project.createdAt,
    role: 'related' as const,
    routeHint: `/technical/projects?projectId=${r.project.id}`,
  }));
}

// ─── Báo cáo group ────────────────────────────────────────────────────────────

async function fetchFaultRecords(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.faultRecord.findMany({
    where: { createdById: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maLoi: true, tenLoi: true, trangThai: true, mucDo: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'fault-record',
    entityId: r.id,
    group: 'Báo cáo' as HistoryGroup,
    title: `Lỗi thiết bị: ${r.tenLoi}`,
    code: r.maLoi,
    status: r.trangThai,
    createdAt: r.createdAt,
    role: 'creator' as const,
    metadata: { mucDo: r.mucDo },
    routeHint: `/technical/quality?tab=repairAndFault`,
  }));
}

async function fetchMaintenanceRecords(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.maintenanceRecord.findMany({
    where: { createdById: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maBienBan: true, loai: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'maintenance-record',
    entityId: r.id,
    group: 'Báo cáo' as HistoryGroup,
    title: `Biên bản bảo trì ${r.maBienBan}`,
    code: r.maBienBan,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/technical/quality?tab=maintenance`,
  }));
}

async function fetchMaterialEvaluations(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.materialEvaluation.findMany({
    where: { createdById: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maChien: true, tenHangHoa: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'material-evaluation',
    entityId: r.id,
    group: 'Báo cáo' as HistoryGroup,
    title: `Đánh giá nguyên liệu: ${r.tenHangHoa}`,
    code: r.maChien,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/production/management?tab=materialEvaluation`,
  }));
}

async function fetchFinishedProducts(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.finishedProduct.findMany({
    where: { createdById: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maChien: true, tenHangHoa: true, trangThai: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'finished-product',
    entityId: r.id,
    group: 'Báo cáo' as HistoryGroup,
    title: `Thành phẩm: ${r.tenHangHoa}`,
    code: r.maChien,
    status: r.trangThai as string,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/production/management?tab=finishedProduct`,
  }));
}

async function fetchQualityEvaluations(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.qualityEvaluation.findMany({
    where: { createdById: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maChien: true, tenHangHoa: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'quality-evaluation',
    entityId: r.id,
    group: 'Báo cáo' as HistoryGroup,
    title: `Đánh giá chất lượng: ${r.tenHangHoa}`,
    code: r.maChien,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/production/management?tab=qualityEvaluation`,
  }));
}

async function fetchProductionReports(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.productionReport.findMany({
    where: { createdById: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, ngayThang: true, nguoiThucHien: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'production-report',
    entityId: r.id,
    group: 'Báo cáo' as HistoryGroup,
    title: `Báo cáo sản lượng ngày ${r.ngayThang}`,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/production/management?tab=productionReport`,
  }));
}

// ─── Phiếu group ──────────────────────────────────────────────────────────────

async function fetchWarehouseReceipts(employeeId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.warehouseReceipt.findMany({
    where: { employeeId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maPhieuNhap: true, soDongHang: true, tongSoLuongThucTe: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'warehouse-receipt',
    entityId: r.id,
    group: 'Phiếu' as HistoryGroup,
    title: `Phiếu nhập kho: ${r.soDongHang ?? 1} dòng, ${r.tongSoLuongThucTe ?? 0} Kg`,
    code: r.maPhieuNhap,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/production/warehouse?tab=inbound`,
  }));
}

async function fetchWarehouseIssues(employeeId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.warehouseIssue.findMany({
    where: { employeeId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maPhieuXuat: true, soDongHang: true, tongSoLuongThucTe: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'warehouse-issue',
    entityId: r.id,
    group: 'Phiếu' as HistoryGroup,
    title: `Phiếu xuất kho: ${r.soDongHang ?? 1} dòng, ${r.tongSoLuongThucTe ?? 0} Kg`,
    code: r.maPhieuXuat,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/production/warehouse?tab=outbound`,
  }));
}

async function fetchQuotations(employeeId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.quotation.findMany({
    where: { employeeId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maBaoGia: true, tenKhachHang: true, tinhTrang: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'quotation',
    entityId: r.id,
    group: 'Phiếu' as HistoryGroup,
    title: `Báo giá ${r.maBaoGia} - ${r.tenKhachHang}`,
    code: r.maBaoGia,
    status: r.tinhTrang as string,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/business/domestic?tab=quotations`,
  }));
}

async function fetchOrders(employeeId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.order.findMany({
    where: { employeeId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maDonHang: true, tenKhachHang: true, trangThaiSanXuat: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'order',
    entityId: r.id,
    group: 'Phiếu' as HistoryGroup,
    title: `Đơn hàng ${r.maDonHang} - ${r.tenKhachHang}`,
    code: r.maDonHang,
    status: r.trangThaiSanXuat as string | null ?? null,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/business/international`,
  }));
}

async function fetchAcceptanceHandoversCreator(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.acceptanceHandover.findMany({
    where: { createdById: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maNghiemThu: true, tenHeThongThietBi: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'acceptance-handover',
    entityId: r.id,
    group: 'Phiếu' as HistoryGroup,
    title: `Biên bản nghiệm thu: ${r.tenHeThongThietBi}`,
    code: r.maNghiemThu,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/dashboard`,
  }));
}

async function fetchAcceptanceHandoversRelated(employeeId: string, userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.acceptanceHandover.findMany({
    where: {
      nguoiNhanId: employeeId,
      NOT: { createdById: userId },
      ...(dateWhere ? { createdAt: dateWhere } : {}),
    },
    select: { id: true, maNghiemThu: true, tenHeThongThietBi: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'acceptance-handover',
    entityId: r.id,
    group: 'Phiếu' as HistoryGroup,
    title: `Biên bản nghiệm thu: ${r.tenHeThongThietBi}`,
    code: r.maNghiemThu,
    createdAt: r.createdAt,
    role: 'related' as const,
    routeHint: `/dashboard`,
  }));
}

async function fetchInternalInspections(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.internalInspection.findMany({
    where: { createdById: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, inspectionCode: true, violationContent: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'internal-inspection',
    entityId: r.id,
    group: 'Phiếu' as HistoryGroup,
    title: `Kiểm tra nội bộ: ${r.violationContent.slice(0, 60)}`,
    code: r.inspectionCode,
    status: r.status,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/quality/process?tab=inspection`,
  }));
}

async function fetchCustomerFeedbacks(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.customerFeedback.findMany({
    where: { createdById: userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, loaiPhanHoi: true, noiDungPhanHoi: true, trangThaiXuLy: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'customer-feedback',
    entityId: r.id,
    group: 'Phiếu' as HistoryGroup,
    title: `Phản hồi khách hàng: ${r.noiDungPhanHoi.slice(0, 60)}`,
    status: r.trangThaiXuLy,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/business/domestic?tab=feedback`,
  }));
}

async function fetchInvoices(dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.invoice.findMany({
    where: { ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, soHoaDon: true, customerId: true, trangThai: true, createdAt: true, customer: { select: { tenCongTy: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'invoice',
    entityId: r.id,
    group: 'Phiếu' as HistoryGroup,
    title: `Hóa đơn ${r.soHoaDon} - ${r.customer?.tenCongTy || 'N/A'}`,
    code: r.soHoaDon,
    status: r.trangThai,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/accounting/admin?tab=invoices`,
  }));
}

async function fetchTaxReports(dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.taxReport.findMany({
    where: { ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, maDonHang: true, tenHangHoa: true, trangThai: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'tax-report',
    entityId: r.id,
    group: 'Phiếu' as HistoryGroup,
    title: `Báo cáo thuế đơn hàng ${r.maDonHang}`,
    code: r.maDonHang,
    status: r.trangThai as string,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/accounting/tax`,
  }));
}

async function fetchPrivateFeedbacks(userId: string, dateWhere: any): Promise<HistoryItem[]> {
  const rows = await prisma.privateFeedback.findMany({
    where: { userId, ...(dateWhere ? { createdAt: dateWhere } : {}) },
    select: { id: true, code: true, type: true, status: true, createdAt: true, content: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    entityType: 'private-feedback',
    entityId: r.id,
    group: 'Phiếu' as HistoryGroup,
    title: `Góp ý/Khó khăn: ${r.content.slice(0, 60)}`,
    code: r.code,
    status: r.status as string,
    createdAt: r.createdAt,
    role: 'creator' as const,
    routeHint: `/dashboard`,
  }));
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * If the same entityType+entityId appears as both creator and related,
 * keep only the creator entry.
 */
function deduplicateItems(items: HistoryItem[]): HistoryItem[] {
  const seen = new Map<string, HistoryItem>();
  for (const item of items) {
    const key = `${item.entityType}:${item.entityId}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, item);
    } else if (item.role === 'creator' && existing.role === 'related') {
      // creator wins
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

// ─── Main service function ────────────────────────────────────────────────────

export async function getMyHistory(params: MyHistoryQuery): Promise<MyHistoryResult> {
  const {
    userId,
    types,
    statuses,
    roleFilter = 'both',
    search,
    page = 1,
    limit = 20,
  } = params;

  // Resolve dateFrom — default 90 days ago when not supplied
  const dateFrom = params.dateFrom ?? (() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d;
  })();
  const dateTo = params.dateTo;

  // Validate date range
  if (dateTo && dateFrom > dateTo) {
    throw new ValidationError('Khoảng thời gian không hợp lệ: dateFrom phải trước dateTo');
  }

  // Resolve the user → employee record (needed for employeeId-based queries)
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, employees: { select: { id: true } } },
  });
  if (!userRecord) {
    throw new NotFoundError('Không tìm thấy người dùng');
  }
  const employeeId = userRecord.employees?.id ?? '';

  const dateWhere = buildDateWhere(dateFrom, dateTo);

  // Run all entity branches in parallel; each branch catches its own error
  const branches: Promise<HistoryItem[]>[] = [];

  if (shouldQuery(types, 'quotation-request') && employeeId) {
    branches.push(safeWrap(fetchQuotationRequests(employeeId, dateWhere), 'quotation-request'));
  }
  if (shouldQuery(types, 'supply-request') && employeeId) {
    branches.push(safeWrap(fetchSupplyRequests(employeeId, dateWhere), 'supply-request'));
  }
  if (shouldQuery(types, 'purchase-request') && employeeId) {
    branches.push(safeWrap(fetchPurchaseRequests(employeeId, dateWhere), 'purchase-request'));
  }
  if (shouldQuery(types, 'leave-request') && employeeId) {
    branches.push(safeWrap(fetchLeaveRequests(employeeId, dateWhere), 'leave-request'));
  }
  if (shouldQuery(types, 'repair-request')) {
    branches.push(safeWrap(fetchRepairRequestsCreator(userId, dateWhere), 'repair-request'));
  }
  if (shouldQuery(types, 'task')) {
    branches.push(safeWrap(fetchTasksCreator(userId, dateWhere), 'task-creator'));
    branches.push(safeWrap(fetchTasksRelated(userId, dateWhere), 'task-related'));
  }
  if (shouldQuery(types, 'overtime-plan')) {
    branches.push(safeWrap(fetchOvertimePlans(userId, dateWhere), 'overtime-plan'));
  }
  if (shouldQuery(types, 'daily-work-report') && employeeId) {
    branches.push(safeWrap(fetchDailyWorkReports(employeeId, dateWhere), 'daily-work-report'));
  }
  if (shouldQuery(types, 'work-plan')) {
    branches.push(safeWrap(fetchWorkPlansCreator(userId, dateWhere), 'work-plan-creator'));
    if (employeeId) {
      branches.push(safeWrap(fetchWorkPlansRelated(employeeId, userId, dateWhere), 'work-plan-related'));
    }
  }
  if (shouldQuery(types, 'maintenance-plan')) {
    branches.push(safeWrap(fetchMaintenancePlans(userId, dateWhere), 'maintenance-plan'));
  }
  if (shouldQuery(types, 'project')) {
    branches.push(safeWrap(fetchProjectsCreator(userId, dateWhere), 'project-creator'));
    branches.push(safeWrap(fetchProjectsRelated(userId, dateWhere), 'project-related'));
  }
  if (shouldQuery(types, 'fault-record')) {
    branches.push(safeWrap(fetchFaultRecords(userId, dateWhere), 'fault-record'));
  }
  if (shouldQuery(types, 'maintenance-record')) {
    branches.push(safeWrap(fetchMaintenanceRecords(userId, dateWhere), 'maintenance-record'));
  }
  if (shouldQuery(types, 'material-evaluation')) {
    branches.push(safeWrap(fetchMaterialEvaluations(userId, dateWhere), 'material-evaluation'));
  }
  if (shouldQuery(types, 'finished-product')) {
    branches.push(safeWrap(fetchFinishedProducts(userId, dateWhere), 'finished-product'));
  }
  if (shouldQuery(types, 'quality-evaluation')) {
    branches.push(safeWrap(fetchQualityEvaluations(userId, dateWhere), 'quality-evaluation'));
  }
  if (shouldQuery(types, 'production-report')) {
    branches.push(safeWrap(fetchProductionReports(userId, dateWhere), 'production-report'));
  }
  if (shouldQuery(types, 'warehouse-receipt') && employeeId) {
    branches.push(safeWrap(fetchWarehouseReceipts(employeeId, dateWhere), 'warehouse-receipt'));
  }
  if (shouldQuery(types, 'warehouse-issue') && employeeId) {
    branches.push(safeWrap(fetchWarehouseIssues(employeeId, dateWhere), 'warehouse-issue'));
  }
  if (shouldQuery(types, 'quotation') && employeeId) {
    branches.push(safeWrap(fetchQuotations(employeeId, dateWhere), 'quotation'));
  }
  if (shouldQuery(types, 'order') && employeeId) {
    branches.push(safeWrap(fetchOrders(employeeId, dateWhere), 'order'));
  }
  if (shouldQuery(types, 'acceptance-handover')) {
    branches.push(safeWrap(fetchAcceptanceHandoversCreator(userId, dateWhere), 'acceptance-handover-creator'));
    if (employeeId) {
      branches.push(safeWrap(fetchAcceptanceHandoversRelated(employeeId, userId, dateWhere), 'acceptance-handover-related'));
    }
  }
  if (shouldQuery(types, 'internal-inspection')) {
    branches.push(safeWrap(fetchInternalInspections(userId, dateWhere), 'internal-inspection'));
  }
  if (shouldQuery(types, 'customer-feedback')) {
    branches.push(safeWrap(fetchCustomerFeedbacks(userId, dateWhere), 'customer-feedback'));
  }
  if (shouldQuery(types, 'invoice')) {
    branches.push(safeWrap(fetchInvoices(dateWhere), 'invoice'));
  }
  if (shouldQuery(types, 'tax-report')) {
    branches.push(safeWrap(fetchTaxReports(dateWhere), 'tax-report'));
  }
  if (shouldQuery(types, 'private-feedback')) {
    branches.push(safeWrap(fetchPrivateFeedbacks(userId, dateWhere), 'private-feedback'));
  }

  const results = await Promise.all(branches);
  const merged = deduplicateItems(results.flat());

  // Post-merge filters
  let filtered = merged;

  // Role filter
  if (roleFilter === 'created') {
    filtered = filtered.filter((i) => i.role === 'creator');
  } else if (roleFilter === 'related') {
    filtered = filtered.filter((i) => i.role === 'related');
  }

  // Status filter
  if (statuses && statuses.length > 0) {
    filtered = filtered.filter((i) => i.status != null && statuses.includes(i.status));
  }

  // Search filter
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.code != null && i.code.toLowerCase().includes(q)),
    );
  }

  // Sort by createdAt desc
  filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Group counts (post-filter, pre-paginate)
  const groupCounts: Record<HistoryGroup, number> = {
    'Yêu cầu': 0,
    'Nhiệm vụ': 0,
    'Kế hoạch': 0,
    'Báo cáo': 0,
    'Phiếu': 0,
  };
  for (const item of filtered) {
    groupCounts[item.group] = (groupCounts[item.group] ?? 0) + 1;
  }

  // Paginate
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const items = filtered.slice(offset, offset + limit);

  return { items, total, page, totalPages, groupCounts };
}

export default { getMyHistory };
