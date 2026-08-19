import prisma from '@config/database';
import {
  AGING_THRESHOLD,
  AGING_RED,
  NON_TERMINAL_STATUSES,
} from '../constants/quotationAging';
import {
  QuotationRequestStatus,
  QuotationStatus,
  OrderProductionStatus,
  OrderPaymentStatus,
} from '@prisma/client';

// ─── Shared helpers ──────────────────────────────────────────────────────────

function buildDateRange(
  month?: number,
  year?: number
): { gte: Date; lt: Date } | undefined {
  if (!month || !year) return undefined;
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
}

// Normalize Vietnamese "pending approval" strings — covers diacritics, casing,
// spaces vs underscores: "Chờ duyệt" | "cho duyet" | "cho_duyet" are identical.
function normalizeTrangThai(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_');
}

function isPurchasePending(trangThai: string): boolean {
  return normalizeTrangThai(trangThai) === 'cho_duyet';
}

// ─── DTO ─────────────────────────────────────────────────────────────────────

export interface PricingOverview {
  requests: {
    total: number;
    byStatus: Record<string, number>;
    byCustomerType: { quocTe: number; noiDia: number };
  };
  quotations: {
    total: number;
    byStatus: Record<string, number>;
    byCustomerType: { quocTe: number; noiDia: number };
    priceLockedCount: number;
  };
  orders: {
    total: number;
    byStatus: {
      production: Record<string, number>;
      payment: Record<string, number>;
    };
    byCustomerType: { quocTe: number; noiDia: number };
    totalValueVND: number;
  };
  costs: {
    generalTotal: number;
    exportTotal: number;
    avgGiaThanhNgay: number | null;
    topLoaiChiPhi: Array<{ loaiChiPhi: string; total: number; count: number }>;
  };
  approvals: {
    overtimePending: number;
    purchasePending: number;
  };
  warnings: {
    agingYellow: number;
    agingRed: number;
  };
}

// Status vocabularies — zero-filled so the frontend can render stable pills
const QR_STATUSES: QuotationRequestStatus[] = [
  QuotationRequestStatus.CHO_XU_LY,
  QuotationRequestStatus.DANG_BAO_GIA,
  QuotationRequestStatus.DA_BAO_GIA,
  QuotationRequestStatus.HUY,
];

const Q_STATUSES: QuotationStatus[] = [
  QuotationStatus.DRAFT,
  QuotationStatus.DANG_CHO_PHAN_HOI,
  QuotationStatus.DANG_CHO_GUI_DON_HANG,
  QuotationStatus.DA_DAT_HANG,
  QuotationStatus.KHONG_DAT_HANG,
  QuotationStatus.SENT,
  QuotationStatus.APPROVED,
  QuotationStatus.REJECTED,
  QuotationStatus.EXPIRED,
];

const ORDER_PROD_STATUSES: OrderProductionStatus[] = [
  OrderProductionStatus.CHO_LEN_KE_HOACH,
  OrderProductionStatus.CHO_SAN_XUAT,
  OrderProductionStatus.DANG_SAN_XUAT,
  OrderProductionStatus.CHO_GIAO_HANG,
  OrderProductionStatus.DA_LEN_CONTAINER,
  OrderProductionStatus.DANG_VAN_CHUYEN,
  OrderProductionStatus.DA_GIAO_CHO_KHACH_HANG,
];

const ORDER_PAY_STATUSES: (OrderPaymentStatus | string)[] = [
  OrderPaymentStatus.DA_THANH_TOAN_DOT_1,
  OrderPaymentStatus.CHO_THANH_TOAN_DOT_2,
  OrderPaymentStatus.DA_THANH_TOAN_DU,
  // historical literal still present in some rows
  'CHUA_THANH_TOAN' as any,
];

function zeroFill<T extends string>(keys: T[], from: Record<string, number>): Record<T, number> {
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = from[k] ?? 0;
  return out as Record<T, number>;
}

// ─── Aggregation helpers (each uses a single Prisma round-trip per domain) ────

async function aggregateRequests(
  dateRange?: { gte: Date; lt: Date }
): Promise<PricingOverview['requests']> {
  const dateWhere = dateRange ? { ngayYeuCau: dateRange } : {};

  const [byStatusRows, quocTe, noiDia] = await Promise.all([
    prisma.quotationRequest.groupBy({
      by: ['status'],
      where: { ...dateWhere },
      _count: true,
    }),
    prisma.quotationRequest.count({
      where: { ...dateWhere, customer: { quocGia: { not: null } } },
    }),
    prisma.quotationRequest.count({
      where: { ...dateWhere, customer: { tinhThanh: { not: null } } },
    }),
  ]);

  const byStatusRaw: Record<string, number> = {};
  let total = 0;
  for (const r of byStatusRows) {
    const v = (r as any)._count as number;
    byStatusRaw[r.status as string] = v;
    total += v;
  }

  return {
    total,
    byStatus: zeroFill(QR_STATUSES as any as string[], byStatusRaw) as any,
    byCustomerType: { quocTe, noiDia },
  };
}

async function aggregateQuotations(
  dateRange?: { gte: Date; lt: Date }
): Promise<PricingOverview['quotations']> {
  const dateWhere = dateRange ? { ngayBaoGia: dateRange } : {};

  const [byStatusRows, quocTe, noiDia, priceLockedCount] = await Promise.all([
    prisma.quotation.groupBy({
      by: ['tinhTrang'],
      where: { ...dateWhere },
      _count: true,
    }),
    prisma.quotation.count({
      where: { ...dateWhere, customer: { quocGia: { not: null } } },
    }),
    prisma.quotation.count({
      where: { ...dateWhere, customer: { tinhThanh: { not: null } } },
    }),
    prisma.quotation.count({
      where: { ...dateWhere, priceLocked: true },
    }),
  ]);

  const byStatusRaw: Record<string, number> = {};
  let total = 0;
  for (const r of byStatusRows) {
    const v = (r as any)._count as number;
    byStatusRaw[r.tinhTrang as string] = v;
    total += v;
  }

  return {
    total,
    byStatus: zeroFill(Q_STATUSES as any as string[], byStatusRaw) as any,
    byCustomerType: { quocTe, noiDia },
    priceLockedCount,
  };
}

async function aggregateOrders(
  dateRange?: { gte: Date; lt: Date }
): Promise<PricingOverview['orders']> {
  const dateWhere = dateRange ? { ngayDatHang: dateRange } : {};

  const [prodRows, payRows, quocTe, noiDia, agg] = await Promise.all([
    prisma.order.groupBy({
      by: ['trangThaiSanXuat'],
      where: { ...dateWhere },
      _count: true,
    }),
    prisma.order.groupBy({
      by: ['trangThaiThanhToan'],
      where: { ...dateWhere },
      _count: true,
    }),
    prisma.order.count({
      where: { ...dateWhere, customer: { quocGia: { not: null } } },
    }),
    prisma.order.count({
      where: { ...dateWhere, customer: { tinhThanh: { not: null } } },
    }),
    prisma.order.aggregate({
      where: { ...dateWhere },
      _sum: { giaTriDonHangVND: true },
      _count: true,
    }),
  ]);

  const productionRaw: Record<string, number> = {};
  for (const r of prodRows) {
    const key = (r.trangThaiSanXuat as string | null) ?? 'CHUA_CAP_NHAT';
    productionRaw[key] = (r as any)._count as number;
  }

  const paymentRaw: Record<string, number> = {};
  for (const r of payRows) {
    const key = (r.trangThaiThanhToan as string | null) ?? 'CHUA_CAP_NHAT';
    paymentRaw[key] = (r as any)._count as number;
  }

  // Ensure known statuses are zero-filled so the frontend gets stable keys
  const production = {
    ...zeroFill(ORDER_PROD_STATUSES as any as string[], productionRaw),
    ...productionRaw,
  };
  const payment = {
    ...zeroFill(ORDER_PAY_STATUSES as string[], paymentRaw),
    ...paymentRaw,
  };

  const totalValueVND = (agg as any)._sum?.giaTriDonHangVND ?? 0;
  const total = (agg as any)._count as number;

  return {
    total,
    byStatus: { production: production as any, payment: payment as any },
    byCustomerType: { quocTe, noiDia },
    totalValueVND: totalValueVND ?? 0,
  };
}

async function aggregateCosts(dateRange?: { gte: Date; lt: Date }): Promise<PricingOverview['costs']> {
  const dateWhere = dateRange ? { createdAt: dateRange } : {};

  const [
    generalTotal,
    exportTotal,
    generalAvg,
    exportAvg,
    generalByLoai,
    exportByLoai,
  ] = await Promise.all([
    prisma.generalCost.count({ where: { ...dateWhere } }),
    prisma.exportCost.count({ where: { ...dateWhere } }),
    prisma.generalCost.aggregate({
      where: { ...dateWhere, giaThanhNgay: { not: null } },
      _avg: { giaThanhNgay: true },
    }),
    prisma.exportCost.aggregate({
      where: { ...dateWhere, giaThanhNgay: { not: null } },
      _avg: { giaThanhNgay: true },
    }),
    prisma.generalCost.groupBy({
      by: ['loaiChiPhi'],
      where: { ...dateWhere },
      _sum: { giaThanhNgay: true },
      _count: true,
    }),
    prisma.exportCost.groupBy({
      by: ['loaiChiPhi'],
      where: { ...dateWhere },
      _sum: { giaThanhNgay: true },
      _count: true,
    }),
  ]);

  // Combine global avg across both tables (weighted by row count would require counts per
  // not-null slice, so we do a simple mean-of-means when both exist)
  const ga = (generalAvg as any)._avg?.giaThanhNgay as number | null;
  const ea = (exportAvg as any)._avg?.giaThanhNgay as number | null;
  let avgGiaThanhNgay: number | null = null;
  if (ga != null && ea != null) avgGiaThanhNgay = (ga + ea) / 2;
  else if (ga != null) avgGiaThanhNgay = ga;
  else if (ea != null) avgGiaThanhNgay = ea;

  // Merge top-2 by summed giaThanhNgay across general + export
  const merged = new Map<string, { total: number; count: number }>();
  for (const r of [...(generalByLoai as any[]), ...(exportByLoai as any[])]) {
    const key = r.loaiChiPhi as string;
    const prev = merged.get(key);
    const total = (r._sum?.giaThanhNgay as number | null) ?? 0;
    const count = (r as any)._count as number;
    if (prev) {
      prev.total += total;
      prev.count += count;
    } else {
      merged.set(key, { total, count });
    }
  }
  const topLoaiChiPhi = [...merged.entries()]
    .map(([loaiChiPhi, v]) => ({ loaiChiPhi, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 2);

  return { generalTotal, exportTotal, avgGiaThanhNgay, topLoaiChiPhi };
}

// Backlog — intentionally NOT windowed by month/year (D2)
async function aggregateApprovals(): Promise<PricingOverview['approvals']> {
  const [overtimePending, purchaseRows] = await Promise.all([
    prisma.overtimePlan.count({ where: { trangThai: 'CHO_DUYET' as any } }),
    prisma.purchaseRequest.findMany({
      where: {},
      select: { trangThai: true },
    }),
  ]);

  const purchasePending = purchaseRows.filter((r) => isPurchasePending(r.trangThai as string)).length;

  return { overtimePending, purchasePending };
}

// Backlog — intentionally NOT windowed by month/year (D2)
async function aggregateWarnings(): Promise<PricingOverview['warnings']> {
  const rows = await prisma.quotation.findMany({
    where: { tinhTrang: { in: NON_TERMINAL_STATUSES as QuotationStatus[] } },
    select: { createdAt: true },
  });

  const now = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  let agingYellow = 0;
  let agingRed = 0;

  for (const r of rows) {
    const daysOpen = Math.floor((now - new Date(r.createdAt).getTime()) / MS_PER_DAY);
    if (daysOpen >= AGING_RED) agingRed++;
    else if (daysOpen >= AGING_THRESHOLD) agingYellow++;
  }

  return { agingYellow, agingRed };
}

// ─── Public entry point ──────────────────────────────────────────────────────

export async function getPricingOverview(
  month?: number,
  year?: number
): Promise<PricingOverview> {
  const dateRange = buildDateRange(month, year);

  // Date-windowed domains in parallel; backlog domains in parallel alongside them
  const [requests, quotations, orders, costs, approvals, warnings] = await Promise.all([
    aggregateRequests(dateRange),
    aggregateQuotations(dateRange),
    aggregateOrders(dateRange),
    aggregateCosts(dateRange),
    aggregateApprovals(),
    aggregateWarnings(),
  ]);

  return { requests, quotations, orders, costs, approvals, warnings };
}

export const pricingOverviewService = {
  getPricingOverview,
  buildDateRange,
  isPurchasePending,
  normalizeTrangThai,
};
