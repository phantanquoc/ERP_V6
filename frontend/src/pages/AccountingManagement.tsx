import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator, Receipt, Building, Package, AlertCircle, TrendingUp,
  ArrowRight, RefreshCw, FileText, DollarSign,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageHeader from '../design-system/PageHeader';
import { KpiCard } from '../design-system/KpiCard';
import { ChartCard } from '../design-system/ChartCard';
import { SectionCard } from '../design-system/SectionCard';
import { LoadingSkeleton, ErrorState } from '../design-system/States';
import { chartPalettes } from '../design-system/tokens';
import invoiceService from '../services/invoiceService';
import debtService from '../services/debtService';
import warehouseService from '../services/warehouseService';
import taxReportService from '../services/taxReportService';

// ── Colors from design tokens (preserve original hues via palette) ──
const INVOICE_COLORS: readonly string[] = [chartPalettes.status[0], chartPalettes.status[2], chartPalettes.status[1]];
const DEBT_COLORS: readonly string[] = [chartPalettes.product[0], chartPalettes.status[2]];

const AccountingManagement = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // KPI stats
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoiceByStatus, setInvoiceByStatus] = useState<{ name: string; value: number }[]>([]);
  const [debtTotal, setDebtTotal] = useState(0);
  const [debtSummary, setDebtSummary] = useState({ tongPhaiTra: 0, daThanhToan: 0, conNo: 0 });
  const [assetTotal, setAssetTotal] = useState(0);
  const [warehouseCount, setWarehouseCount] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [taxPending, setTaxPending] = useState(0);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoicesRes, debtSummaryRes, warehousesRes, taxRes] = await Promise.all([
        invoiceService.getAllInvoices(1, 1000, undefined, selectedMonth, selectedYear),
        debtService.getDebtSummary(selectedMonth, selectedYear),
        warehouseService.getAllWarehouses(),
        taxReportService.getAllTaxReports(1, 1000, undefined, selectedMonth, selectedYear),
      ]);

      // Invoices
      const invoices = (invoicesRes as any).data || [];
      setInvoiceTotal((invoicesRes as any).total ?? invoices.length);
      const daThanhToan = invoices.filter((inv: any) => inv.trangThai === 'Đã thanh toán').length;
      const chuaThanhToan = invoices.filter((inv: any) => inv.trangThai === 'Chưa thanh toán').length;
      const dangXuLy = invoices.length - daThanhToan - chuaThanhToan;
      setInvoiceByStatus([
        { name: 'Đã thanh toán', value: daThanhToan },
        { name: 'Chưa thanh toán', value: chuaThanhToan },
        { name: 'Đang xử lý', value: dangXuLy },
      ]);

      // Debt
      const ds = (debtSummaryRes as any).data?.data || (debtSummaryRes as any).data || {};
      setDebtSummary({
        tongPhaiTra: ds.tongPhaiTra || 0,
        daThanhToan: ds.daThanhToan || 0,
        conNo: ds.conNo || 0,
      });
      setDebtTotal(ds.soLuongCongNo ?? ds.tongPhaiTra ? (invoices.length > 0 ? ds.soLuongCongNo || 0 : 0) : 0);
      // Fallback: count debts via getAllDebts if summary count missing
      if (!ds.soLuongCongNo) {
        try {
          const debtsRes: any = await debtService.getAllDebts(selectedMonth, selectedYear);
          const debts = debtsRes.data?.data || debtsRes.data || [];
          setDebtTotal(Array.isArray(debts) ? debts.length : 0);
        } catch { /* ignore */ }
      }

      // Warehouses / assets
      const warehouses = (warehousesRes as any).data?.data || (warehousesRes as any).data || [];
      setWarehouseCount(Array.isArray(warehouses) ? warehouses.length : 0);
      let tongTaiSan = 0;
      (Array.isArray(warehouses) ? warehouses : []).forEach((w: any) => {
        (w.lots || []).forEach((lot: any) => {
          (lot.lotProducts || []).forEach((p: any) => {
            const giaThanh = p.giaThanh ?? 0;
            tongTaiSan += (p.soLuong || 0) * giaThanh;
          });
        });
      });
      setAssetTotal(tongTaiSan);

      // Tax reports
      const taxData: any[] = (taxRes as any).data || [];
      setTaxTotal((taxRes as any).pagination?.total ?? taxData.length);
      setTaxPending(taxData.filter((r: any) => r.trangThai === 'CHUA_BAO_CAO').length);

      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e?.message || 'Không thể tải dữ liệu tổng quan');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(v);
  const formatCompact = (v: number) =>
    new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(v);

  const debtDonutData = [
    { name: 'Đã thanh toán', value: debtSummary.daThanhToan },
    { name: 'Còn nợ', value: debtSummary.conNo },
  ];

  const filterActions = (
    <>
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(Number(e.target.value))}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>Tháng {m}</option>
        ))}
      </select>
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(Number(e.target.value))}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        {[2023, 2024, 2025, 2026].map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <button
        onClick={fetchStats}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        Làm mới
      </button>
    </>
  );

  if (loading && !lastRefreshed) return <LoadingSkeleton />;
  if (error && !lastRefreshed) return <ErrorState message={error} onRetry={fetchStats} />;

  const invoicePaidPct = invoiceTotal > 0
    ? Math.round((invoiceByStatus[0]?.value / invoiceTotal) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Bộ phận kế toán"
        description={lastRefreshed ? `Cập nhật lúc: ${lastRefreshed.toLocaleTimeString('vi-VN')}` : 'Tổng quan hóa đơn, công nợ, tài sản và thuế'}
        icon={<Calculator className="w-6 h-6 text-orange-500" />}
        actions={filterActions}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Hóa đơn" value={invoiceTotal} icon={<Receipt className="w-4 h-4" />} tone="orange" to="/accounting/admin?tab=invoices" sub={`${invoiceByStatus[0]?.value ?? 0} đã thanh toán`} />
        <KpiCard label="Công nợ" value={debtTotal} icon={<AlertCircle className="w-4 h-4" />} tone="red" to="/accounting/admin?tab=debts" sub={formatCompact(debtSummary.conNo) + ' còn nợ'} />
        <KpiCard label="Tổng tài sản" value={formatCurrency(assetTotal)} icon={<Building className="w-4 h-4" />} tone="blue" to="/accounting/admin?tab=assets" sub={`${warehouseCount} kho`} />
        <KpiCard label="Doanh thu" value={formatCompact(debtSummary.tongPhaiTra)} icon={<TrendingUp className="w-4 h-4" />} tone="green" sub="tổng phải trả" />
        <KpiCard label="Báo cáo thuế" value={taxTotal} icon={<FileText className="w-4 h-4" />} tone="amber" to="/accounting/tax" sub={`${taxPending} chưa báo cáo`} />
        <KpiCard label="Tỷ lệ HĐ thanh toán" value={`${invoicePaidPct}%`} icon={<DollarSign className="w-4 h-4" />} tone="green" sub={`${invoiceTotal} hóa đơn`} />
      </div>

      {/* Bento: charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Hóa đơn theo trạng thái" to="/accounting/admin?tab=invoices">
          {invoiceTotal === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-xs text-gray-400">Chưa có dữ liệu hóa đơn</div>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={invoiceByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name">
                    {invoiceByStatus.map((_, i) => (
                      <Cell key={i} fill={INVOICE_COLORS[i % INVOICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: '24px' }}>
                <span className="text-2xl font-bold text-gray-800">{invoiceTotal}</span>
                <span className="text-xs text-gray-400">hóa đơn</span>
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Tổng quan công nợ" to="/accounting/admin?tab=debts">
          {debtSummary.tongPhaiTra === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-xs text-gray-400">Chưa có dữ liệu công nợ</div>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={debtDonutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" nameKey="name">
                    {debtDonutData.map((_, i) => (
                      <Cell key={i} fill={DEBT_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCompact(v)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: '24px' }}>
                <span className="text-lg font-bold text-gray-800">{formatCompact(debtSummary.tongPhaiTra)}</span>
                <span className="text-xs text-gray-400">tổng phải trả</span>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Bento: summary + navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <SectionCard title="Tổng quan nhanh" icon={<Package className="w-4 h-4" />} className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Tổng tài sản</p>
              <p className="text-sm font-bold text-blue-600">{formatCurrency(assetTotal)}</p>
              <p className="text-xs text-gray-400 mt-1">{warehouseCount} kho</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Công nợ còn lại</p>
              <p className="text-sm font-bold text-red-600">{formatCompact(debtSummary.conNo)}</p>
              <p className="text-xs text-gray-400 mt-1">trên {formatCompact(debtSummary.tongPhaiTra)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Hóa đơn</p>
              <p className="text-sm font-bold text-orange-600">{invoiceTotal}</p>
              <p className="text-xs text-gray-400 mt-1">{invoicePaidPct}% đã thanh toán</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Báo cáo thuế</p>
              <p className="text-sm font-bold text-amber-600">{taxTotal}</p>
              <p className="text-xs text-gray-400 mt-1">{taxPending} chưa báo cáo</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Điều hướng nhanh">
          <div className="space-y-3">
            <button
              onClick={() => navigate('/accounting/admin')}
              className="w-full flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 hover:border-orange-300 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-orange-600"><Receipt className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Kế toán hành chính</p>
                  <p className="text-xs text-gray-400">Hóa đơn, tài sản, công nợ</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors" />
            </button>
            <button
              onClick={() => navigate('/accounting/tax')}
              className="w-full flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-red-600"><FileText className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Kế toán thuế</p>
                  <p className="text-xs text-gray-400">Báo cáo thuế, quyết toán</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default AccountingManagement;
