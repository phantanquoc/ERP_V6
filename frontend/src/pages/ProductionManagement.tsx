import React, { useState, useEffect, useCallback } from 'react';
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
import { KpiCard } from '../design-system/KpiCard';
import { CircularProgress, ProgressBar, NavCard } from '../design-system/Progress';
import machineSystemService from '../services/machineSystemService';
import { orderService } from '../services/orderService';
import finishedProductService from '../services/finishedProductService';
import warehouseService from '../services/warehouseService';
import warehouseReceiptService from '../services/warehouseReceiptService';
import warehouseIssueService from '../services/warehouseIssueService';
import supplyRequestService from '../services/supplyRequestService';

// ── Constants ──
const MACHINE_COLORS = ['#10B981', '#F59E0B', '#EF4444'];

// ── Skeleton ──
const DashboardSkeleton = () => (
  <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
    <div className="flex items-center justify-between mb-5">
      <div>
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 bg-white border border-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="h-72 bg-white border border-gray-200 rounded-lg animate-pulse" />
      <div className="col-span-2 h-72 bg-white border border-gray-200 rounded-lg animate-pulse" />
    </div>
    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="col-span-2 h-52 bg-white border border-gray-200 rounded-lg animate-pulse" />
      <div className="h-52 bg-white border border-gray-200 rounded-lg animate-pulse" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 bg-white border border-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  </div>
);


// ══════════════════════════════════════════════════════════════
// ██  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const ProductionManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [machineStats, setMachineStats] = useState({ total: 0, hoatDong: 0, baoTri: 0, ngungHoatDong: 0 });
  const [orderStats, setOrderStats] = useState({ total: 0, choLenKeHoach: 0, choSanXuat: 0, dangSanXuat: 0, choGiaoHang: 0, daLenContainer: 0, dangVanChuyen: 0, daGiao: 0 });
  const [finishedStats, setFinishedStats] = useState({ total: 0, thangNay: 0 });
  const [warehouseStats, setWarehouseStats] = useState({ totalWarehouses: 0, coHang: 0, trong: 0, totalLots: 0, loTrong: 0 });
  const [receiptIssueStats, setReceiptIssueStats] = useState({ totalReceipts: 0, totalIssues: 0, receiptThangNay: 0, issueThangNay: 0 });
  const [supplyStats, setSupplyStats] = useState({ total: 0, daCungCap: 0, chuaCungCap: 0 });

  const loadAllStats = useCallback(async () => {
    setLoading(true);
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const [machineRes, orderRes, finishedRes, warehouseRes, receiptRes, issueRes, supplyRes] = await Promise.allSettled([
        machineSystemService.getMachineSystems({ page: 1, limit: 10000 }),
        orderService.getAllOrders(1, 10000),
        finishedProductService.getAllFinishedProducts(1, 10000),
        warehouseService.getAllWarehouses(),
        warehouseReceiptService.getAllWarehouseReceipts(),
        warehouseIssueService.getAllWarehouseIssues(),
        supplyRequestService.getAllSupplyRequests(1, 10000),
      ]);

      if (machineRes.status === 'fulfilled') {
        const machines = machineRes.value.data ?? [];
        setMachineStats({
          total: machines.length,
          hoatDong: machines.filter((m: any) => m.trangThai === 'HOAT_DONG').length,
          baoTri: machines.filter((m: any) => m.trangThai === 'BAO_TRI').length,
          ngungHoatDong: machines.filter((m: any) => m.trangThai === 'NGUNG_HOAT_DONG').length,
        });
      }

      if (orderRes.status === 'fulfilled') {
        const orders = (orderRes.value.data ?? []) as any[];
        setOrderStats({
          total: orders.length,
          choLenKeHoach: orders.filter((o: any) => o.trangThaiSanXuat === 'CHO_LEN_KE_HOACH').length,
          choSanXuat: orders.filter((o: any) => o.trangThaiSanXuat === 'CHO_SAN_XUAT').length,
          dangSanXuat: orders.filter((o: any) => o.trangThaiSanXuat === 'DANG_SAN_XUAT').length,
          choGiaoHang: orders.filter((o: any) => o.trangThaiSanXuat === 'CHO_GIAO_HANG').length,
          daLenContainer: orders.filter((o: any) => o.trangThaiSanXuat === 'DA_LEN_CONTAINER').length,
          dangVanChuyen: orders.filter((o: any) => o.trangThaiSanXuat === 'DANG_VAN_CHUYEN').length,
          daGiao: orders.filter((o: any) => o.trangThaiSanXuat === 'DA_GIAO_CHO_KHACH_HANG').length,
        });
      }

      if (finishedRes.status === 'fulfilled') {
        const products = finishedRes.value.data;
        const thisMonth = products.filter((p: any) => {
          const d = new Date(p.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        setFinishedStats({ total: products.length, thangNay: thisMonth.length });
      }

      if (warehouseRes.status === 'fulfilled') {
        const warehouses = (warehouseRes.value as any).data?.data || (warehouseRes.value as any).data || [];
        const allLots = warehouses.flatMap((w: any) => w.lots || []);
        const coHang = warehouses.filter((w: any) => (w.lots || []).some((l: any) => (l.lotProducts || []).length > 0)).length;
        const loTrong = allLots.filter((l: any) => !(l.lotProducts || []).length).length;
        setWarehouseStats({
          totalWarehouses: warehouses.length,
          coHang,
          trong: warehouses.length - coHang,
          totalLots: allLots.length,
          loTrong,
        });
      }

      const isThisMonth = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      };

      if (receiptRes.status === 'fulfilled') {
        const receipts = (receiptRes.value as any).data || [];
        setReceiptIssueStats(prev => ({
          ...prev,
          totalReceipts: receipts.length,
          receiptThangNay: receipts.filter((r: any) => isThisMonth(r.createdAt || r.ngayNhap)).length,
        }));
      }

      if (issueRes.status === 'fulfilled') {
        const issues = (issueRes.value as any).data || [];
        setReceiptIssueStats(prev => ({
          ...prev,
          totalIssues: issues.length,
          issueThangNay: issues.filter((i: any) => isThisMonth(i.createdAt || i.ngayXuat)).length,
        }));
      }

      if (supplyRes.status === 'fulfilled') {
        const supplies = (supplyRes.value as any).data || [];
        const daCungCap = supplies.filter((s: any) => s.trangThai === 'Đã cung cấp').length;
        setSupplyStats({
          total: supplies.length,
          daCungCap,
          chuaCungCap: supplies.length - daCungCap,
        });
      }
    } catch (error) {
      console.error('Error loading production stats:', error);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, []);

  useEffect(() => {
    loadAllStats();
  }, [loadAllStats]);

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

  // ── Skeleton on first load ──
  if (loading && !lastRefreshed) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Tổng quan Sản xuất</h1>
          {lastRefreshed && (
            <p className="text-xs text-gray-400 mt-0.5">
              Cập nhật lúc: {lastRefreshed.toLocaleTimeString('vi-VN')}
            </p>
          )}
        </div>
        <button
          onClick={loadAllStats}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

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
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Cog className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Trạng thái máy móc</h3>
          </div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
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
        </div>

        {/* A2: Order Status */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Phân bổ trạng thái đơn hàng</h3>
            </div>
            <span className="text-xs text-gray-400">Tổng: {orderStats.total}</span>
          </div>

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
        </div>
      </div>

      {/* ── BENTO ROW B: Warehouse + Supply ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* B1: Warehouse Summary */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Tổng quan kho</h3>
            </div>
            <button
              onClick={() => navigate('/production/warehouse')}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Chi tiết <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

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
        </div>

        {/* B2: Supply Completion */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Yêu cầu cung cấp</h3>
          </div>

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
        </div>
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
