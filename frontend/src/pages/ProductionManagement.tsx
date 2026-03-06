import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cog, Package, ArrowDown, ArrowUp, ClipboardList,
  CheckCircle, AlertTriangle, XCircle, Clock,
  TrendingUp, ArrowRight, RefreshCw, Warehouse
} from 'lucide-react';
import machineService from '../services/machineService';
import { orderService } from '../services/orderService';
import finishedProductService from '../services/finishedProductService';
import warehouseService from '../services/warehouseService';
import warehouseReceiptService from '../services/warehouseReceiptService';
import warehouseIssueService from '../services/warehouseIssueService';
import supplyRequestService from '../services/supplyRequestService';

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
    <div className="text-gray-400 mt-0.5">{icon}</div>
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  </div>
);

interface ProgressBarProps {
  segments: { label: string; value: number; color: string }[];
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ segments, total }) => (
  <div>
    <div className="flex h-3 rounded overflow-hidden gap-0.5 mb-2">
      {segments.map((s) => (
        <div
          key={s.label}
          className={`${s.color} transition-all`}
          style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%` }}
        />
      ))}
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {segments.map((s) => (
        <span key={s.label} className="flex items-center gap-1 text-xs text-gray-500">
          <span className={`inline-block w-2 h-2 rounded-sm ${s.color}`} />
          {s.label}: <strong className="text-gray-700">{s.value}</strong>
        </span>
      ))}
    </div>
  </div>
);

const ProductionManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [machineStats, setMachineStats] = useState({ total: 0, hoatDong: 0, baoTri: 0, ngungHoatDong: 0 });
  const [orderStats, setOrderStats] = useState({ total: 0, choLenKeHoach: 0, choSanXuat: 0, dangSanXuat: 0, choGiaoHang: 0, daLenContainer: 0, dangVanChuyen: 0, daGiao: 0 });
  const [finishedStats, setFinishedStats] = useState({ total: 0, thangNay: 0 });
  const [warehouseStats, setWarehouseStats] = useState({ totalWarehouses: 0, coHang: 0, trong: 0, totalLots: 0, loTrong: 0 });
  const [receiptIssueStats, setReceiptIssueStats] = useState({ totalReceipts: 0, totalIssues: 0, receiptThangNay: 0, issueThangNay: 0 });
  const [supplyStats, setSupplyStats] = useState({ total: 0, daCungCap: 0, chuaCungCap: 0 });

  const now = new Date().toLocaleString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const loadAllStats = useCallback(async () => {
    setLoading(true);
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const [machineRes, orderRes, finishedRes, warehouseRes, receiptRes, issueRes, supplyRes] = await Promise.allSettled([
        machineService.getAllMachines(1, 10000),
        orderService.getAllOrders(1, 10000),
        finishedProductService.getAllFinishedProducts(1, 10000),
        warehouseService.getAllWarehouses(),
        warehouseReceiptService.getAllWarehouseReceipts(),
        warehouseIssueService.getAllWarehouseIssues(),
        supplyRequestService.getAllSupplyRequests(1, 10000),
      ]);

      // Machine stats
      if (machineRes.status === 'fulfilled') {
        const machines = machineRes.value.data;
        setMachineStats({
          total: machines.length,
          hoatDong: machines.filter((m: any) => m.trangThai === 'HOAT_DONG').length,
          baoTri: machines.filter((m: any) => m.trangThai === 'BẢO_TRÌ').length,
          ngungHoatDong: machines.filter((m: any) => m.trangThai === 'NGỪNG_HOẠT_ĐỘNG').length,
        });
      }

      // Order stats
      if (orderRes.status === 'fulfilled') {
        const orders = orderRes.value.data;
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

      // Finished product stats
      if (finishedRes.status === 'fulfilled') {
        const products = finishedRes.value.data;
        const thisMonth = products.filter((p: any) => {
          const d = new Date(p.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        setFinishedStats({ total: products.length, thangNay: thisMonth.length });
      }

      // Warehouse stats
      if (warehouseRes.status === 'fulfilled') {
        const warehouses = warehouseRes.value.data?.data || warehouseRes.value.data || [];
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

      // Receipt & Issue stats
      const isThisMonth = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      };

      if (receiptRes.status === 'fulfilled') {
        const receipts = receiptRes.value.data || [];
        setReceiptIssueStats(prev => ({
          ...prev,
          totalReceipts: receipts.length,
          receiptThangNay: receipts.filter((r: any) => isThisMonth(r.createdAt || r.ngayNhap)).length,
        }));
      }

      if (issueRes.status === 'fulfilled') {
        const issues = issueRes.value.data || [];
        setReceiptIssueStats(prev => ({
          ...prev,
          totalIssues: issues.length,
          issueThangNay: issues.filter((i: any) => isThisMonth(i.createdAt || i.ngayXuat)).length,
        }));
      }

      // Supply request stats
      if (supplyRes.status === 'fulfilled') {
        const supplies = supplyRes.value.data || [];
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
    }
  }, []);

  useEffect(() => {
    loadAllStats();
  }, [loadAllStats]);

  const machineRate = machineStats.total > 0 ? Math.round((machineStats.hoatDong / machineStats.total) * 100) : 0;

  const orderSegments = [
    { label: 'Chờ SX', value: orderStats.choSanXuat, color: 'bg-yellow-400' },
    { label: 'Đang SX', value: orderStats.dangSanXuat, color: 'bg-blue-500' },
    { label: 'Vận chuyển', value: orderStats.dangVanChuyen, color: 'bg-indigo-400' },
    { label: 'Đã giao', value: orderStats.daGiao, color: 'bg-green-500' },
    { label: 'Khác', value: orderStats.choLenKeHoach + orderStats.choGiaoHang + orderStats.daLenContainer, color: 'bg-gray-300' },
  ];

  const supplyRate = supplyStats.total > 0 ? Math.round((supplyStats.daCungCap / supplyStats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Tổng quan Sản xuất</h1>
          <p className="text-xs text-gray-400 mt-0.5">{now}</p>
        </div>
        <button onClick={loadAllStats} disabled={loading} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 bg-white rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* ── SECTION 1: MÁY MÓC & SẢN XUẤT ── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cog className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Máy móc & Sản xuất</h2>
          </div>
          <button
            onClick={() => navigate('/production/management')}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Machine stats */}
        <p className="text-xs font-medium text-gray-400 uppercase mb-2">Máy móc</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Tổng số máy" value={machineStats.total} sub={`Hoạt động ${machineRate}%`} icon={<Cog className="w-4 h-4" />} />
          <StatCard label="Đang hoạt động" value={machineStats.hoatDong} icon={<CheckCircle className="w-4 h-4 text-green-500" />} />
          <StatCard label="Đang bảo trì" value={machineStats.baoTri} icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />} />
          <StatCard label="Ngừng hoạt động" value={machineStats.ngungHoatDong} icon={<XCircle className="w-4 h-4 text-red-400" />} />
        </div>

        {/* Order stats */}
        <p className="text-xs font-medium text-gray-400 uppercase mb-2">Đơn hàng sản xuất</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="Tổng đơn hàng" value={orderStats.total} icon={<ClipboardList className="w-4 h-4" />} />
          <StatCard label="Chờ sản xuất" value={orderStats.choSanXuat} icon={<Clock className="w-4 h-4 text-yellow-500" />} />
          <StatCard label="Đang sản xuất" value={orderStats.dangSanXuat} icon={<TrendingUp className="w-4 h-4 text-blue-500" />} />
          <StatCard label="Đã giao" value={orderStats.daGiao} sub={`Tháng này: ${finishedStats.thangNay} thành phẩm`} icon={<CheckCircle className="w-4 h-4 text-green-500" />} />
        </div>

        {/* Order progress bar */}
        <div className="border border-gray-100 rounded p-3 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Phân bổ trạng thái đơn hàng</p>
          <ProgressBar segments={orderSegments} total={orderStats.total} />
        </div>
      </div>

      {/* ── SECTION 2: KHO & NHẬP XUẤT ── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Kho & Nhập xuất</h2>
          </div>
          <button
            onClick={() => navigate('/production/warehouse')}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Warehouse stats */}
        <p className="text-xs font-medium text-gray-400 uppercase mb-2">Tồn kho</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatCard label="Số kho" value={warehouseStats.totalWarehouses} sub={`Trống: ${warehouseStats.trong}`} icon={<Warehouse className="w-4 h-4" />} />
          <StatCard label="Kho có hàng" value={warehouseStats.coHang} icon={<Package className="w-4 h-4 text-green-500" />} />
          <StatCard label="Tổng lô hàng" value={warehouseStats.totalLots} sub={`Lô trống: ${warehouseStats.loTrong}`} icon={<ClipboardList className="w-4 h-4" />} />
          <StatCard label="Phiếu nhập / xuất" value={`${receiptIssueStats.totalReceipts} / ${receiptIssueStats.totalIssues}`} sub={`Tháng này: +${receiptIssueStats.receiptThangNay} / -${receiptIssueStats.issueThangNay}`} icon={<ArrowDown className="w-4 h-4 text-indigo-400" />} />
        </div>

        {/* Supply request */}
        <p className="text-xs font-medium text-gray-400 uppercase mb-2">Yêu cầu cung cấp</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-gray-100 rounded p-3 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-500">Tổng yêu cầu: <strong className="text-gray-700">{supplyStats.total}</strong></p>
              <span className="text-xs font-semibold text-gray-600">{supplyRate}% hoàn thành</span>
            </div>
            <ProgressBar
              segments={[
                { label: 'Đã cung cấp', value: supplyStats.daCungCap, color: 'bg-green-500' },
                { label: 'Chưa cung cấp', value: supplyStats.chuaCungCap, color: 'bg-gray-300' },
              ]}
              total={supplyStats.total}
            />
          </div>
          <div className="border border-gray-100 rounded p-3 bg-gray-50 flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{supplyStats.daCungCap}</p>
              <p className="text-xs text-gray-500 mt-0.5">Đã cung cấp</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{supplyStats.chuaCungCap}</p>
              <p className="text-xs text-gray-500 mt-0.5">Chưa cung cấp</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-500">{receiptIssueStats.totalReceipts}</p>
              <p className="text-xs text-gray-500 mt-0.5">Phiếu nhập</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{receiptIssueStats.totalIssues}</p>
              <p className="text-xs text-gray-500 mt-0.5">Phiếu xuất</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionManagement;
