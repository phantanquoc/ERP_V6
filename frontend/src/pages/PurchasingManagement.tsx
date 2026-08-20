import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  Settings,
  Users,
  ClipboardList,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import PageHeader from '../design-system/PageHeader';
import ChartCard from '../design-system/ChartCard';
import { LoadingState } from '../design-system/States';
import { chartPalettes } from '../design-system/tokens';
import purchaseRequestService from '../services/purchaseRequestService';
import supplyRequestService from '../services/supplyRequestService';
import supplierService from '../services/supplierService';

const PIE_COLORS = chartPalettes.product.slice(0, 6);
const SUPPLIER_COLORS = ['#3B82F6', '#8B5CF6', '#9CA3AF'];
const LINE_COLOR_PR = '#f97316';
const LINE_COLOR_SUPPLY = '#6366f1';

interface KpiStats {
  purchaseRequests: number;
  supplyRequests: number;
  suppliers: number;
  choBaoGia: number;
  choDuyet: number;
  daDuyet: number;
  hoanThanh: number;
  nvlSuppliers: number;
  thietBiSuppliers: number;
}

interface MonthlyPoint {
  month: string;
  count: number;
}

const KpiCardLocal: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
  to?: string;
  tone?: string;
}> = ({ label, value, icon, sub, to }) => {
  const navigate = useNavigate();
  const Tag = to ? 'button' : 'div';
  const props: Record<string, unknown> = to
    ? { type: 'button' as const, onClick: () => navigate(to) }
    : {};
  return (
    <Tag
      {...props}
      className={`bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm text-left w-full ${to ? 'cursor-pointer hover:border-gray-300 hover:shadow-md transition-all duration-200' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-400 shrink-0">{icon}</span>
        <span className="text-xs font-medium text-gray-500 line-clamp-2 flex-1 min-w-0">{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-bold text-gray-800">{value}</div>
      {sub && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sub}</p>}
    </Tag>
  );
};

const NavCard: React.FC<{ title: string; desc: string; icon: React.ReactNode; to: string }> = ({
  title,
  desc,
  icon,
  to,
}) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-orange-300 hover:shadow-md transition-all duration-200 text-left w-full group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg text-orange-600 group-hover:bg-orange-100 transition-colors">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition-colors" />
      </div>
    </button>
  );
};

const PurchasingManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [stats, setStats] = useState<KpiStats>({
    purchaseRequests: 0,
    supplyRequests: 0,
    suppliers: 0,
    choBaoGia: 0,
    choDuyet: 0,
    daDuyet: 0,
    hoanThanh: 0,
    nvlSuppliers: 0,
    thietBiSuppliers: 0,
  });
  const [statusPie, setStatusPie] = useState<{ name: string; value: number }[]>([]);
  const [supplierPie, setSupplierPie] = useState<{ name: string; value: number }[]>([]);
  const [prByMonth, setPrByMonth] = useState<MonthlyPoint[]>([]);
  const [supplyByMonth, setSupplyByMonth] = useState<MonthlyPoint[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();

      const [prTotalRes, supplyTotalRes, supplierTotalRes, prFullRes, supplyFullRes, supplierFullRes] =
        await Promise.all([
          purchaseRequestService.getAllPurchaseRequests(1, 1) as Promise<any>,
          supplyRequestService.getAllSupplyRequests(1, 1) as Promise<any>,
          supplierService.getAllSuppliers(1, 1) as Promise<any>,
          purchaseRequestService.getAllPurchaseRequests(1, 10000) as Promise<any>,
          supplyRequestService.getAllSupplyRequests(1, 10000) as Promise<any>,
          supplierService.getAllSuppliers(1, 10000) as Promise<any>,
        ]);

      const prTotal = prTotalRes?.pagination?.total ?? (prTotalRes?.data?.length ?? 0);
      const supplyTotal = supplyTotalRes?.pagination?.total ?? (supplyTotalRes?.data?.length ?? 0);
      const supplierTotal = supplierTotalRes?.pagination?.total ?? (supplierTotalRes?.data?.length ?? 0);

      const prList: any[] = prFullRes?.data ?? [];
      const supplyList: any[] = supplyFullRes?.data ?? [];
      const supplierList: any[] = supplierFullRes?.data ?? [];

      const choBaoGia = prList.filter((p) => p.trangThai === 'Chờ báo giá').length;
      const choDuyet = prList.filter((p) => p.trangThai === 'Chờ duyệt').length;
      const daDuyet = prList.filter((p) => p.trangThai === 'Đã duyệt').length;
      const hoanThanh = prList.filter((p) => p.trangThai === 'Hoàn thành').length;
      const tuChoi = prList.filter((p) => p.trangThai === 'Từ chối').length;

      // Supplier by phanLoaiNCC — fallback to loaiCungCap inference if field missing
      const nvlSuppliers = supplierList.filter(
        (s) => (s.phanLoaiNCC ?? s.phanLoai) === 'NVL'
      ).length;
      const thietBiSuppliers = supplierList.filter(
        (s) => (s.phanLoaiNCC ?? s.phanLoai) === 'Thiết bị'
      ).length;
      const chuaPhanLoai = Math.max(0, supplierList.length - nvlSuppliers - thietBiSuppliers);

      setStats({
        purchaseRequests: prTotal,
        supplyRequests: supplyTotal,
        suppliers: supplierTotal,
        choBaoGia,
        choDuyet,
        daDuyet,
        hoanThanh,
        nvlSuppliers,
        thietBiSuppliers,
      });

      // Pie: request by status
      const pieData = [
        { name: 'Chờ báo giá', value: choBaoGia },
        { name: 'Chờ duyệt', value: choDuyet },
        { name: 'Đã duyệt', value: daDuyet },
        { name: 'Hoàn thành', value: hoanThanh },
        ...(tuChoi > 0 ? [{ name: 'Từ chối', value: tuChoi }] : []),
      ].filter((d) => d.value > 0);
      setStatusPie(pieData.length > 0 ? pieData : [{ name: 'Chưa có dữ liệu', value: 1 }]);

      // Pie: supplier by category
      const supPie = [
        { name: 'NVL', value: nvlSuppliers },
        { name: 'Thiết bị', value: thietBiSuppliers },
        ...(chuaPhanLoai > 0 ? [{ name: 'Chưa phân loại', value: chuaPhanLoai }] : []),
      ].filter((d) => d.value > 0);
      setSupplierPie(supPie.length > 0 ? supPie : [{ name: 'Chưa có dữ liệu', value: 1 }]);

      // Line: PR by month
      const prMonthCounts = new Array(12).fill(0);
      prList.forEach((pr: any) => {
        const d = new Date(pr.ngayYeuCau ?? pr.createdAt);
        if (!isNaN(d.getTime()) && d.getFullYear() === currentYear) prMonthCounts[d.getMonth()]++;
      });
      setPrByMonth(prMonthCounts.map((count, i) => ({ month: `T${i + 1}`, count })));

      // Line: supply requests by month
      const supMonthCounts = new Array(12).fill(0);
      supplyList.forEach((s: any) => {
        const d = new Date(s.ngayYeuCau ?? s.createdAt);
        if (!isNaN(d.getTime()) && d.getFullYear() === currentYear) supMonthCounts[d.getMonth()]++;
      });
      setSupplyByMonth(supMonthCounts.map((count, i) => ({ month: `T${i + 1}`, count })));
    } catch (err) {
      console.error('Failed to load purchasing dashboard:', err);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (loading && !lastRefreshed) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Bộ phận thu mua"
          description="Tổng quan hoạt động thu mua — yêu cầu, nhà cung cấp và đơn hàng"
          icon={<ShoppingCart className="h-5 w-5 text-orange-700" />}
        />
        <LoadingState message="Đang tải dữ liệu thu mua..." />
      </div>
    );
  }

  const hasStatusData = statusPie.length > 0 && !(statusPie.length === 1 && statusPie[0].name === 'Chưa có dữ liệu');
  const hasSupplierData = supplierPie.length > 0 && !(supplierPie.length === 1 && supplierPie[0].name === 'Chưa có dữ liệu');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bộ phận thu mua"
        description="Tổng quan hoạt động thu mua — yêu cầu, nhà cung cấp và đơn hàng"
        icon={<ShoppingCart className="h-5 w-5 text-orange-700" />}
        actions={
          <button
            onClick={loadAll}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        }
      />
      {lastRefreshed && (
        <p className="text-xs text-gray-400 -mt-3">Cập nhật lúc: {lastRefreshed.toLocaleTimeString('vi-VN')}</p>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCardLocal
          label="Yêu cầu mua NVL"
          value={stats.purchaseRequests}
          icon={<Package className="w-4 h-4" />}
          sub={`Chờ báo giá: ${stats.choBaoGia} · Chờ duyệt: ${stats.choDuyet}`}
        />
        <KpiCardLocal
          label="Mua thiết bị"
          value={stats.thietBiSuppliers + stats.hoanThanh}
          icon={<Settings className="w-4 h-4" />}
          sub={`NCC thiết bị: ${stats.thietBiSuppliers} · Hoàn thành: ${stats.hoanThanh}`}
        />
        <KpiCardLocal
          label="Nhà cung cấp"
          value={stats.suppliers}
          icon={<Users className="w-4 h-4" />}
          sub={`NVL: ${stats.nvlSuppliers} · Thiết bị: ${stats.thietBiSuppliers}`}
        />
        <KpiCardLocal
          label="Đơn mua hàng"
          value={stats.supplyRequests}
          icon={<ClipboardList className="w-4 h-4" />}
          sub={`Yêu cầu cung cấp: ${stats.supplyRequests}`}
        />
      </div>

      {/* Bento: 2 pies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Yêu cầu mua theo trạng thái">
          {hasStatusData ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value, percent }: any) =>
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {statusPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">Chưa có dữ liệu</div>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Chờ báo giá: <strong className="text-gray-700">{stats.choBaoGia}</strong></span>
            <span>·</span>
            <span>Chờ duyệt: <strong className="text-gray-700">{stats.choDuyet}</strong></span>
            <span>·</span>
            <span>Đã duyệt: <strong className="text-gray-700">{stats.daDuyet}</strong></span>
            <span>·</span>
            <span>Hoàn thành: <strong className="text-gray-700">{stats.hoanThanh}</strong></span>
          </div>
        </ChartCard>

        <ChartCard title="Nhà cung cấp theo phân loại">
          {hasSupplierData ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={supplierPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value, percent }: any) =>
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {supplierPie.map((_, i) => (
                    <Cell key={i} fill={SUPPLIER_COLORS[i % SUPPLIER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">Chưa có dữ liệu</div>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>NVL: <strong className="text-gray-700">{stats.nvlSuppliers}</strong></span>
            <span>·</span>
            <span>Thiết bị: <strong className="text-gray-700">{stats.thietBiSuppliers}</strong></span>
            <span>·</span>
            <span>Tổng: <strong className="text-gray-700">{stats.suppliers}</strong></span>
          </div>
        </ChartCard>
      </div>

      {/* Bento: 2 line charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Xu hướng yêu cầu mua theo tháng" variant="dark">
          <p className="text-xs text-gray-400 mb-3">Năm {new Date().getFullYear()} — theo ngày yêu cầu</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={prByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={30} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}
                formatter={(value: number) => [value, 'Số lượng']}
              />
              <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
              <Line type="monotone" dataKey="count" stroke={LINE_COLOR_PR} strokeWidth={3} dot={{ fill: LINE_COLOR_PR, r: 4 }} activeDot={{ r: 6 }} name="Yêu cầu mua" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Xu hướng yêu cầu cung cấp theo tháng" variant="dark">
          <p className="text-xs text-gray-400 mb-3">Năm {new Date().getFullYear()} — yêu cầu cung cấp</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={supplyByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={30} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}
                formatter={(value: number) => [value, 'Số lượng']}
              />
              <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
              <Line type="monotone" dataKey="count" stroke={LINE_COLOR_SUPPLY} strokeWidth={3} dot={{ fill: LINE_COLOR_SUPPLY, r: 4 }} activeDot={{ r: 6 }} name="Yêu cầu cung cấp" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NavCard
          title="Thu mua NVL"
          desc="Nhà cung cấp, đơn hàng và yêu cầu mua nguyên vật liệu"
          icon={<Package className="w-5 h-5" />}
          to="/purchasing/materials"
        />
        <NavCard
          title="Mua thiết bị"
          desc="Nhà cung cấp, đơn hàng và yêu cầu mua thiết bị máy móc"
          icon={<Settings className="w-5 h-5" />}
          to="/purchasing/equipment"
        />
      </div>

      {/* Quick links row */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate('/purchasing/materials?tab=suppliers')}
          className="text-xs text-gray-600 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-50"
        >
          NCC NVL
        </button>
        <button
          onClick={() => navigate('/purchasing/materials?tab=purchaseRequestList')}
          className="text-xs text-gray-600 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-50"
        >
          Yêu cầu mua NVL
        </button>
        <button
          onClick={() => navigate('/purchasing/equipment?tab=suppliers')}
          className="text-xs text-gray-600 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-50"
        >
          NCC thiết bị
        </button>
        <button
          onClick={() => navigate('/purchasing/equipment?tab=purchaseRequestList')}
          className="text-xs text-gray-600 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-50"
        >
          Yêu cầu mua thiết bị
        </button>
      </div>
    </div>
  );
};

export default PurchasingManagement;
