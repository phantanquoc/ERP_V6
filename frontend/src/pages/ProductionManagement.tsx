import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cog, Package, ClipboardList,
  CheckCircle,
  TrendingUp, ArrowRight, RefreshCw, Warehouse,
  Factory, FileBarChart
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useQueryClient } from '@tanstack/react-query';
import { KpiCard } from '../design-system/KpiCard';
import { CircularProgress, ProgressBar, NavCard } from '../design-system/Progress';
import { PageHeader } from '../design-system/PageHeader';
import { LoadingSkeleton } from '../design-system/States';
import { ChartCard } from '../design-system/ChartCard';
import { SectionCard } from '../design-system/SectionCard';
import { chartPalettes, chartHeights } from '../design-system/tokens';
import { useProductionOverview, productionOverviewKeys } from '../hooks/useProductionOverview';

// ── Constants ──
const MACHINE_COLORS = chartPalettes.status.slice(0, 3);


// ══════════════════════════════════════════════════════════════
// ██  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const ProductionManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    machineQ, orderQ, finishedQ, warehouseQ, receiptQ, issueQ, supplyQ,
    isLoading, isFetching,
    hasAuthError, hasForbidden, hasServerError,
  } = useProductionOverview();

  useEffect(() => {
    if (hasAuthError) navigate('/login');
  }, [hasAuthError, navigate]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: productionOverviewKeys.all });
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const machineStats = useMemo(() => {
    const machines: any[] = (machineQ.data as any)?.data ?? [];
    // Prefer pagination.total when available, fallback to page length
    const total = (machineQ.data as any)?.pagination?.total ?? machines.length;
    return {
      total,
      hoatDong: machines.filter((m: any) => m.trangThai === 'HOAT_DONG').length,
      baoTri: machines.filter((m: any) => m.trangThai === 'BAO_TRI').length,
      ngungHoatDong: machines.filter((m: any) => m.trangThai === 'NGUNG_HOAT_DONG').length,
    };
  }, [machineQ.data]);

  const orderStats = useMemo(() => {
    const orders: any[] = (orderQ.data as any)?.data ?? [];
    return {
      total: (orderQ.data as any)?.pagination?.total ?? orders.length,
      choLenKeHoach: orders.filter((o: any) => o.trangThaiSanXuat === 'CHO_LEN_KE_HOACH').length,
      choSanXuat: orders.filter((o: any) => o.trangThaiSanXuat === 'CHO_SAN_XUAT').length,
      dangSanXuat: orders.filter((o: any) => o.trangThaiSanXuat === 'DANG_SAN_XUAT').length,
      choGiaoHang: orders.filter((o: any) => o.trangThaiSanXuat === 'CHO_GIAO_HANG').length,
      daLenContainer: orders.filter((o: any) => o.trangThaiSanXuat === 'DA_LEN_CONTAINER').length,
      dangVanChuyen: orders.filter((o: any) => o.trangThaiSanXuat === 'DANG_VAN_CHUYEN').length,
      daGiao: orders.filter((o: any) => o.trangThaiSanXuat === 'DA_GIAO_CHO_KHACH_HANG').length,
    };
  }, [orderQ.data]);

  const finishedStats = useMemo(() => {
    const payload: any = finishedQ.data;
    const products: any[] = payload?.data ?? [];
    const total = payload?.pagination?.total ?? products.length;
    const thangNay = products.filter((p: any) => {
      const d = new Date(p.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    return { total, thangNay };
  }, [finishedQ.data, currentMonth, currentYear]);

  const warehouseStats = useMemo(() => {
    const raw: any = warehouseQ.data;
    const warehouses: any[] = raw?.data?.data ?? raw?.data ?? [];
    const allLots = warehouses.flatMap((w: any) => w.lots || []);
    const coHang = warehouses.filter((w: any) => (w.lots || []).some((l: any) => (l.lotProducts || []).length > 0)).length;
    const loTrong = allLots.filter((l: any) => !(l.lotProducts || []).length).length;
    return {
      totalWarehouses: warehouses.length,
      coHang,
      trong: warehouses.length - coHang,
      totalLots: allLots.length,
      loTrong,
    };
  }, [warehouseQ.data]);

  const receiptIssueStats = useMemo(() => {
    const isThisMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };
    const receipts: any[] = (receiptQ.data as any)?.data ?? [];
    const issues: any[] = (issueQ.data as any)?.data ?? [];
    return {
      totalReceipts: (receiptQ.data as any)?.pagination?.total ?? receipts.length,
      receiptThangNay: receipts.filter((r: any) => isThisMonth(r.createdAt || r.ngayNhap)).length,
      totalIssues: (issueQ.data as any)?.pagination?.total ?? issues.length,
      issueThangNay: issues.filter((i: any) => isThisMonth(i.createdAt || i.ngayXuat)).length,
    };
  }, [receiptQ.data, issueQ.data, currentMonth, currentYear]);

  const supplyStats = useMemo(() => {
    const supplies: any[] = (supplyQ.data as any)?.data ?? [];
    const daCungCap = supplies.filter((s: any) => s.trangThai === 'Đã cung cấp').length;
    const total = (supplyQ.data as any)?.pagination?.total ?? supplies.length;
    return { total, daCungCap, chuaCungCap: total - daCungCap };
  }, [supplyQ.data]);

  // ── Computed ──
  const machineRate = machineStats.total > 0 ? Math.round((machineStats.hoatDong / machineStats.total) * 100) : 0;
  const supplyRate = supplyStats.total > 0 ? Math.round((supplyStats.daCungCap / supplyStats.total) * 100) : 0;

  const machineDonutData = [
    { name: 'Hoạt động', value: machineStats.hoatDong },
    { name: 'Bảo trì', value: machineStats.baoTri },
    { name: 'Ngừng HĐ', value: machineStats.ngungHoatDong },
  ];

  const orderSegments = [
    { label: 'Chờ lên KH', value: orderStats.choLenKeHoach, color: 'bg-gray-400' },
    { label: 'Chờ SX', value: orderStats.choSanXuat, color: 'bg-yellow-400' },
    { label: 'Đang SX', value: orderStats.dangSanXuat, color: 'bg-blue-500' },
    { label: 'Chờ giao', value: orderStats.choGiaoHang, color: 'bg-purple-400' },
    { label: 'Container', value: orderStats.daLenContainer, color: 'bg-teal-400' },
    { label: 'Vận chuyển', value: orderStats.dangVanChuyen, color: 'bg-indigo-400' },
    { label: 'Đã giao', value: orderStats.daGiao, color: 'bg-emerald-500' },
  ];

  const machineRateDot = machineRate >= 80 ? 'bg-emerald-500' : machineRate >= 60 ? 'bg-amber-400' : 'bg-red-500';

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-5">
        <LoadingSkeleton />
      </div>
    );
  }

  const lastRefreshed = warehouseQ.dataUpdatedAt || machineQ.dataUpdatedAt || 0;
  const lastRefreshedDate = lastRefreshed ? new Date(lastRefreshed) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tổng quan Sản xuất"
        description={lastRefreshedDate ? `Cập nhật lúc: ${lastRefreshedDate.toLocaleTimeString('vi-VN')}` : 'Theo dõi máy móc, đơn hàng, kho và yêu cầu cung cấp'}
        icon={<Factory className="w-6 h-6 text-blue-500" />}
        actions={(
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
        )}
      />

      {hasAuthError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          Phiên đăng nhập hết hạn — đang chuyển tới trang đăng nhập...
        </div>
      )}
      {hasForbidden && !hasAuthError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">
          Bạn không có quyền xem một số số liệu tổng quan (403). Liên hệ quản trị viên nếu cần.
        </div>
      )}
      {hasServerError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          Lỗi máy chủ khi tải số liệu tổng quan (500). Vui lòng thử làm mới.
        </div>
      )}

      {/* ── HERO KPI STRIP ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <KpiCard
          label="Tỷ lệ hoạt động"
          value={`${machineRate}%`}
          icon={<Cog className="w-4 h-4" />}
          tone="gray"
          dot={machineRateDot}
          sub={`${machineStats.hoatDong}/${machineStats.total} máy`}
        />
        <KpiCard
          label="Tổng đơn hàng"
          value={orderStats.total}
          icon={<ClipboardList className="w-4 h-4" />}
          tone="gray"
        />
        <KpiCard
          label="Đang sản xuất"
          value={orderStats.dangSanXuat}
          icon={<TrendingUp className="w-4 h-4" />}
          tone="gray"
          dot="bg-blue-500"
        />
        <KpiCard
          label="Đã giao hàng"
          value={orderStats.daGiao}
          icon={<CheckCircle className="w-4 h-4" />}
          tone="gray"
          dot="bg-emerald-500"
        />
        <KpiCard
          label="Thành phẩm tháng này"
          value={finishedStats.thangNay}
          icon={<Package className="w-4 h-4" />}
          tone="gray"
          sub={`Tổng: ${finishedStats.total}`}
        />
      </div>

      {/* ── BENTO ROW A: Machine donut + Order bar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* A1: Machine Donut Chart */}
        <ChartCard title="Trạng thái máy móc">
          <div className="relative">
            <ResponsiveContainer width="100%" height={chartHeights.donut}>
              <PieChart>
                <Pie
                  data={machineDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {machineDonutData.map((_, i) => (
                    <Cell key={i} fill={MACHINE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: '28px' }}>
              <span className="text-2xl font-bold text-gray-800">{machineRate}%</span>
              <span className="text-xs text-gray-400">vận hành</span>
            </div>
          </div>
        </ChartCard>

        {/* A2: Order Status */}
        <SectionCard
          title="Phân bổ trạng thái đơn hàng"
          icon={<ClipboardList className="w-4 h-4" />}
          action={<span className="text-xs text-gray-400">Tổng: {orderStats.total}</span>}
          className="lg:col-span-2"
        >

          {/* Order stat grid */}
          <div className="grid grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
            {orderSegments.map((seg) => (
              <div key={seg.label} className="text-center p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className={`w-2 h-2 rounded-full ${seg.color}`} />
                  <span className="text-xs text-gray-500">{seg.label}</span>
                </div>
                <span className="text-lg font-bold text-gray-800">{seg.value}</span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <ProgressBar segments={orderSegments} total={orderStats.total} />
        </SectionCard>
      </div>

      {/* ── BENTO ROW B: Warehouse + Supply ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* B1: Warehouse Summary */}
        <SectionCard
          title="Tổng quan kho"
          icon={<Warehouse className="w-4 h-4" />}
          action={(
            <button
              onClick={() => navigate('/production/warehouse')}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Chi tiết <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          className="lg:col-span-2"
        >

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Số kho</p>
              <p className="text-xl font-bold text-gray-800">{warehouseStats.totalWarehouses}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-xs text-gray-500">Kho có hàng</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">{warehouseStats.coHang}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Tổng lô hàng</p>
              <p className="text-xl font-bold text-gray-800">{warehouseStats.totalLots}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <p className="text-xs text-gray-500">Lô trống</p>
              </div>
              <p className="text-xl font-bold text-gray-500">{warehouseStats.loTrong}</p>
            </div>
          </div>

          {/* Receipt / Issue strip */}
          <div className="flex items-center gap-6 bg-gray-50 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium uppercase">Tháng này</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-100 text-emerald-600 text-xs font-bold">+</span>
              <span className="text-sm text-gray-700"><strong>{receiptIssueStats.receiptThangNay}</strong> phiếu nhập</span>
              <span className="text-xs text-gray-400">(tổng: {receiptIssueStats.totalReceipts})</span>
            </div>
            <div className="w-px h-5 bg-gray-300" />
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-600 text-xs font-bold">-</span>
              <span className="text-sm text-gray-700"><strong>{receiptIssueStats.issueThangNay}</strong> phiếu xuất</span>
              <span className="text-xs text-gray-400">(tổng: {receiptIssueStats.totalIssues})</span>
            </div>
          </div>
        </SectionCard>

        {/* B2: Supply Completion */}
        <SectionCard title="Yêu cầu cung cấp" icon={<Package className="w-4 h-4" />}>

          <div className="flex flex-col items-center">
            <CircularProgress
              value={supplyRate}
              size={120}
              strokeWidth={10}
              color={supplyRate >= 80 ? '#10B981' : supplyRate >= 50 ? '#F59E0B' : '#EF4444'}
            />
            <p className="text-xs text-gray-400 mt-2">Tỷ lệ hoàn thành</p>

            <div className="flex items-center gap-4 mt-4 w-full">
              <div className="flex-1 text-center bg-emerald-50 rounded-lg py-2">
                <p className="text-lg font-bold text-emerald-600">{supplyStats.daCungCap}</p>
                <p className="text-xs text-gray-500">Đã cung cấp</p>
              </div>
              <div className="flex-1 text-center bg-amber-50 rounded-lg py-2">
                <p className="text-lg font-bold text-amber-600">{supplyStats.chuaCungCap}</p>
                <p className="text-xs text-gray-500">Chưa cung cấp</p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── ROW C: Navigation Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NavCard
          title="Phòng QLSX"
          desc="Máy móc, quy trình, đơn hàng"
          icon={<Factory className="w-5 h-5" />}
          to="/production/management"
        />
        <NavCard
          title="Dữ liệu sản xuất"
          desc="Đánh giá NL, vận hành, thành phẩm"
          icon={<FileBarChart className="w-5 h-5" />}
          to="/production/data"
        />
        <NavCard
          title="Kho sản xuất"
          desc="Kho, nhập xuất, yêu cầu cung cấp"
          icon={<Warehouse className="w-5 h-5" />}
          to="/production/warehouse"
        />
      </div>
    </div>
  );
};

export default ProductionManagement;
