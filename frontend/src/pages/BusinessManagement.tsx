import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, FileText, FileCheck, ShoppingCart, Users, TrendingUp, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageHeader from '../design-system/PageHeader';
import ChartCard from '../design-system/ChartCard';
import { LoadingState } from '../design-system/States';
import { chartPalettes } from '../design-system/tokens';
import { quotationRequestService } from '../services/quotationRequestService';
import { quotationService } from '../services/quotationService';
import { orderService } from '../services/orderService';
import internationalCustomerService from '../services/internationalCustomerService';

const COLORS = chartPalettes.product.slice(0, 4);
const STATUS_COLORS = chartPalettes.status;

const BusinessManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [kpi, setKpi] = useState({ ycbg: 0, baoGia: 0, donHang: 0, khachHang: 0 });
  const [ycbgByStatus, setYcbgByStatus] = useState<{ name: string; value: number }[]>([]);
  const [orderByStatus, setOrderByStatus] = useState<{ name: string; value: number }[]>([]);
  const [ordersByMonth, setOrdersByMonth] = useState<{ month: string; count: number }[]>([]);
  const [quotationsByMonth, setQuotationsByMonth] = useState<{ month: string; count: number }[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ycbgRes, baoGiaRes, donHangRes, khRes, ordersFull, quotationsFull] = await Promise.all([
        quotationRequestService.getAllQuotationRequests(1, 1) as Promise<any>,
        quotationService.getAllQuotations(1, 1) as Promise<any>,
        orderService.getAllOrders(1, 1) as Promise<any>,
        internationalCustomerService.getAllCustomers(1, 1) as Promise<any>,
        orderService.getAllOrders(1, 10000) as Promise<any>,
        quotationService.getAllQuotations(1, 10000) as Promise<any>,
      ]);

      const ycbgTotal = ycbgRes.pagination?.total ?? ycbgRes.data?.length ?? 0;
      const baoGiaTotal = baoGiaRes.pagination?.total ?? baoGiaRes.data?.length ?? 0;
      const donHangTotal = donHangRes.pagination?.total ?? (donHangRes.data?.length ?? 0);
      const khTotal = khRes.total ?? khRes.data?.length ?? 0;
      setKpi({ ycbg: ycbgTotal, baoGia: baoGiaTotal, donHang: donHangTotal, khachHang: khTotal });

      // Status breakdowns from full lists
      const ycbgList: any[] = ycbgRes.data ?? [];
      // If we only got 1 item for total, fetch more for breakdown when needed
      let ycbgFull: any[] = ycbgList;
      let orderFull: any[] = (ordersFull.data ?? ordersFull) as any[];
      if (!Array.isArray(orderFull)) orderFull = [];
      const quotationFull: any[] = (quotationsFull.data ?? quotationsFull) as any[];
      const quotFullArr = Array.isArray(quotationFull) ? quotationFull : [];

      // YCBG by status
      const ycbgStatusMap: Record<string, number> = {};
      ycbgFull.forEach((r: any) => {
        const s = r.status || r.trangThai || 'Khác';
        ycbgStatusMap[s] = (ycbgStatusMap[s] || 0) + 1;
      });
      const ycbgPie = Object.entries(ycbgStatusMap).map(([name, value]) => ({ name, value }));
      setYcbgByStatus(ycbgPie.length ? ycbgPie : [{ name: 'Chưa có dữ liệu', value: 1 }]);

      // Orders by production status
      const orderStatusMap: Record<string, number> = {};
      orderFull.forEach((o: any) => {
        const s = o.trangThaiSanXuat || 'Khác';
        orderStatusMap[s] = (orderStatusMap[s] || 0) + 1;
      });
      const orderPie = Object.entries(orderStatusMap).map(([name, value]) => ({ name, value }));
      setOrderByStatus(orderPie.length ? orderPie : [{ name: 'Chưa có dữ liệu', value: 1 }]);

      // Monthly trends (current year)
      const currentYear = new Date().getFullYear();
      const orderMonthCounts = new Array(12).fill(0);
      orderFull.forEach((o: any) => {
        const d = new Date(o.ngayDatHang || o.createdAt);
        if (!isNaN(d.getTime()) && d.getFullYear() === currentYear) orderMonthCounts[d.getMonth()]++;
      });
      setOrdersByMonth(orderMonthCounts.map((count, i) => ({ month: `T${i + 1}`, count })));

      const qMonthCounts = new Array(12).fill(0);
      quotFullArr.forEach((q: any) => {
        const d = new Date(q.createdAt);
        if (!isNaN(d.getTime()) && d.getFullYear() === currentYear) qMonthCounts[d.getMonth()]++;
      });
      setQuotationsByMonth(qMonthCounts.map((count, i) => ({ month: `T${i + 1}`, count })));
    } catch (err) {
      console.error('Failed to load business dashboard:', err);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading && !lastRefreshed) {
    return (
      <div className="space-y-5">
        <PageHeader title="Bộ phận kinh doanh" description="Tổng quan hoạt động kinh doanh" icon={<Briefcase className="h-5 w-5 text-sky-600" />} />
        <LoadingState message="Đang tải dữ liệu kinh doanh..." />
      </div>
    );
  }

  const hasYcbgData = !(ycbgByStatus.length === 1 && ycbgByStatus[0].name === 'Chưa có dữ liệu');
  const hasOrderData = !(orderByStatus.length === 1 && orderByStatus[0].name === 'Chưa có dữ liệu');

  const kpiCards = [
    { label: 'Yêu cầu báo giá', value: kpi.ycbg, icon: <FileText className="w-4 h-4" />, bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', to: '/business/international' },
    { label: 'Báo giá', value: kpi.baoGia, icon: <FileCheck className="w-4 h-4" />, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', to: '/business/international' },
    { label: 'Đơn hàng', value: kpi.donHang, icon: <ShoppingCart className="w-4 h-4" />, bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', to: '/business/international' },
    { label: 'Khách hàng', value: kpi.khachHang, icon: <Users className="w-4 h-4" />, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', to: '/business/international' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bộ phận kinh doanh"
        description="Tổng quan yêu cầu báo giá, báo giá, đơn hàng và khách hàng"
        icon={<Briefcase className="h-5 w-5 text-sky-600" />}
        actions={
          <button onClick={loadAll} disabled={loading} className="inline-flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50 shadow-sm">
            <TrendingUp className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        }
      />
      {lastRefreshed && <p className="text-xs text-gray-400 -mt-3">Cập nhật lúc: {lastRefreshed.toLocaleTimeString('vi-VN')}</p>}

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <button
            key={card.label}
            onClick={() => navigate(card.to)}
            className={`bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-left ${card.bg} ${card.border} border`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`${card.text}`}>{card.icon}</span>
              <span className="text-xs font-medium text-gray-500">{card.label}</span>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${card.text}`}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">Xem chi tiết →</p>
          </button>
        ))}
      </div>

      {/* Pies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="YCBG theo trạng thái">
          {hasYcbgData ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ycbgByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value, percent }: any) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}>
                  {ycbgByStatus.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">Chưa có dữ liệu</div>}
        </ChartCard>
        <ChartCard title="Đơn hàng theo trạng thái SX">
          {hasOrderData ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={orderByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value, percent }: any) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}>
                  {orderByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">Chưa có dữ liệu</div>}
        </ChartCard>
      </div>

      {/* Lines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Xu hướng đơn hàng theo tháng" variant="dark">
          <p className="text-xs text-gray-400 mb-3">Năm {new Date().getFullYear()}</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={ordersByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={30} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} formatter={(v: number) => [v, 'Số lượng']} />
              <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
              <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={3} dot={{ fill: '#38bdf8', r: 4 }} activeDot={{ r: 6 }} name="Đơn hàng" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Xu hướng báo giá theo tháng" variant="dark">
          <p className="text-xs text-gray-400 mb-3">Năm {new Date().getFullYear()}</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={quotationsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={30} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} formatter={(v: number) => [v, 'Số lượng']} />
              <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
              <Line type="monotone" dataKey="count" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#a78bfa', r: 4 }} activeDot={{ r: 6 }} name="Báo giá" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={() => navigate('/business/international')} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-sky-300 hover:shadow-md transition-all text-left group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-50 rounded-lg text-sky-600 group-hover:bg-sky-100"><Layers className="w-5 h-5" /></div>
              <div><p className="text-sm font-semibold text-gray-800">KD Quốc Tế</p><p className="text-xs text-gray-400">Khách hàng, YCBG, báo giá quốc tế</p></div>
            </div>
            <span className="text-gray-300 group-hover:text-sky-500">→</span>
          </div>
        </button>
        <button onClick={() => navigate('/business/domestic')} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-sky-300 hover:shadow-md transition-all text-left group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600 group-hover:bg-amber-100"><Layers className="w-5 h-5" /></div>
              <div><p className="text-sm font-semibold text-gray-800">KD Nội Địa</p><p className="text-xs text-gray-400">Khách hàng, YCBG, báo giá nội địa</p></div>
            </div>
            <span className="text-gray-300 group-hover:text-amber-500">→</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default BusinessManagement;
