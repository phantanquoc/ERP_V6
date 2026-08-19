import apiClient from './apiClient';

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

export const pricingOverviewService = {
  async getOverview(month?: number, year?: number): Promise<PricingOverview> {
    const params: Record<string, unknown> = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const res = await apiClient.get<PricingOverview>('/pricing/overview', { params });
    if (!res.data) throw new Error('Không tải được tổng quan phòng giá');
    // apiClient unwraps { success, data } into ApiResponse.data
    return res.data as PricingOverview;
  },
};

export default pricingOverviewService;
