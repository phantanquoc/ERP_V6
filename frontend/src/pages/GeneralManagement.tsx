import { useState, useEffect } from 'react';
import { FileText, ShoppingCart, DollarSign, TrendingUp, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageHeader from '../design-system/PageHeader';
import ChartCard from '../design-system/ChartCard';
import { LoadingState, ErrorState, EmptyState } from '../design-system/States';
import { KpiCard } from '../design-system/KpiCard';
import { chartPalettes } from '../design-system/tokens';
import { quotationRequestService } from '../services/quotationRequestService';
import { quotationService } from '../services/quotationService';
import { orderService } from '../services/orderService';
import generalCostService from '../services/generalCostService';
import exportCostService from '../services/exportCostService';

const COLORS = chartPalettes.product.slice(0, 4);
const LINE_COLOR_ORDERS = chartPalettes.product[5];
const LINE_COLOR_QUOTES = chartPalettes.product[0];

interface Stats {
  ycbg: { total: number; quocTe: number; noiDia: number };
  bangBaoGia: { total: number; quocTe: number; noiDia: number };
  donHang: { total: number; quocTe: number; noiDia: number };
  chiPhiChung: { total: number; exportCost: number };
}

interface MonthlyData {
  month: string;
  count: number;
}

const GeneralManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    ycbg: { total: 0, quocTe: 0, noiDia: 0 },
    bangBaoGia: { total: 0, quocTe: 0, noiDia: 0 },
    donHang: { total: 0, quocTe: 0, noiDia: 0 },
    chiPhiChung: { total: 0, exportCost: 0 },
  });
  const [ordersByMonth, setOrdersByMonth] = useState<MonthlyData[]>([]);
  const [quotationsByMonth, setQuotationsByMonth] = useState<MonthlyData[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const [
          ycbgAll, ycbgQt, ycbgNd,
          baoGiaAll, baoGiaQt, baoGiaNd,
          dhAll, dhQt, dhNd,
          cpChung, cpXuatKhau,
          ordersData, quotationsData,
        ] = await Promise.all([
          quotationRequestService.getAllQuotationRequests(1, 1),
          quotationRequestService.getAllQuotationRequests(1, 1, undefined, 'Quốc tế'),
          quotationRequestService.getAllQuotationRequests(1, 1, undefined, 'Nội địa'),
          quotationService.getAllQuotations(1, 1),
          quotationService.getAllQuotations(1, 1, undefined, 'Quốc tế'),
          quotationService.getAllQuotations(1, 1, undefined, 'Nội địa'),
          orderService.getAllOrders(1, 1),
          orderService.getAllOrders(1, 1, undefined, 'Quốc tế'),
          orderService.getAllOrders(1, 1, undefined, 'Nội địa'),
          generalCostService.getAllGeneralCosts(1, 1),
          exportCostService.getAllExportCosts(1, 1),
          orderService.getAllOrders(1, 9999),
          quotationService.getAllQuotations(1, 9999),
        ]);

        setStats({
          ycbg: { total: ycbgAll.pagination.total, quocTe: ycbgQt.pagination.total, noiDia: ycbgNd.pagination.total },
          bangBaoGia: { total: baoGiaAll.pagination.total, quocTe: baoGiaQt.pagination.total, noiDia: baoGiaNd.pagination.total },
          donHang: { total: dhAll.pagination?.total ?? 0, quocTe: dhQt.pagination?.total ?? 0, noiDia: dhNd.pagination?.total ?? 0 },
          chiPhiChung: { total: cpChung.pagination.total, exportCost: cpXuatKhau.pagination.total },
        });

        // Group orders by month (current year)
        const currentYear = new Date().getFullYear();
        const monthCounts = new Array(12).fill(0);
        ((ordersData as any).data || []).forEach((order: any) => {
          const d = new Date(order.ngayDatHang);
          if (d.getFullYear() === currentYear) monthCounts[d.getMonth()]++;
        });
        setOrdersByMonth(monthCounts.map((count, i) => ({ month: `T${i + 1}`, count })));

        // Group quotations by month (current year)
        const qMonthCounts = new Array(12).fill(0);
        ((quotationsData as any).data || []).forEach((q: any) => {
          const d = new Date(q.createdAt);
          if (d.getFullYear() === currentYear) qMonthCounts[d.getMonth()]++;
        });
        setQuotationsByMonth(qMonthCounts.map((count, i) => ({ month: `T${i + 1}`, count })));
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu tổng hợp');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Bộ phận tổng hợp"
          description="Tổng quan và quản lý các hoạt động của bộ phận"
          icon={<Layers className="h-5 w-5 text-blue-500" />}
        />
        <LoadingState message="Đang tải dữ liệu tổng hợp..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Bộ phận tổng hợp"
          description="Tổng quan và quản lý các hoạt động của bộ phận"
          icon={<Layers className="h-5 w-5 text-blue-500" />}
        />
        <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); window.location.reload(); }} />
      </div>
    );
  }

  const ycbgPieData = [
    { name: 'Quốc tế', value: stats.ycbg.quocTe },
    { name: 'Nội địa', value: stats.ycbg.noiDia },
  ];
  const orderPieData = [
    { name: 'Quốc tế', value: stats.donHang.quocTe },
    { name: 'Nội địa', value: stats.donHang.noiDia },
  ];

  return (
    <div className="space-y-5">
        <PageHeader
          title="Bộ phận tổng hợp"
          description="Tổng quan và quản lý các hoạt động của bộ phận"
          icon={<Layers className="h-5 w-5 text-blue-500" />}
        />

        {/* KPI row — KpiCard (design-system): p-3 sm:p-4, hover:border-gray-300 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <KpiCard
            label="Yêu cầu báo giá"
            value={stats.ycbg.total}
            icon={<FileText className="w-4 h-4" />}
            tone="blue"
            to="/general/pricing?tab=requests"
            sub={`Quốc tế: ${stats.ycbg.quocTe} · Nội địa: ${stats.ycbg.noiDia}`}
            subCounts={[
              { label: 'Quốc tế', count: stats.ycbg.quocTe, tone: 'blue' },
              { label: 'Nội địa', count: stats.ycbg.noiDia, tone: 'green' },
            ]}
          />
          <KpiCard
            label="Bảng báo giá"
            value={stats.bangBaoGia.total}
            icon={<TrendingUp className="w-4 h-4" />}
            tone="green"
            to="/general/pricing?tab=quotes"
            sub={`Quốc tế: ${stats.bangBaoGia.quocTe} · Nội địa: ${stats.bangBaoGia.noiDia}`}
            subCounts={[
              { label: 'Quốc tế', count: stats.bangBaoGia.quocTe, tone: 'blue' },
              { label: 'Nội địa', count: stats.bangBaoGia.noiDia, tone: 'green' },
            ]}
          />
          <KpiCard
            label="Đơn hàng"
            value={stats.donHang.total}
            icon={<ShoppingCart className="w-4 h-4" />}
            tone="purple"
            to="/general/pricing?tab=orders"
            sub={`Quốc tế: ${stats.donHang.quocTe} · Nội địa: ${stats.donHang.noiDia}`}
            subCounts={[
              { label: 'Quốc tế', count: stats.donHang.quocTe, tone: 'blue' },
              { label: 'Nội địa', count: stats.donHang.noiDia, tone: 'green' },
            ]}
          />
          <KpiCard
            label="Chi phí chung"
            value={stats.chiPhiChung.total + stats.chiPhiChung.exportCost}
            icon={<DollarSign className="w-4 h-4" />}
            tone="orange"
            to="/general/pricing?tab=costs"
            sub={`Chung: ${stats.chiPhiChung.total} · XK: ${stats.chiPhiChung.exportCost}`}
            subCounts={[
              { label: 'Chi phí chung', count: stats.chiPhiChung.total, tone: 'red' },
              { label: 'Chi phí XK', count: stats.chiPhiChung.exportCost, tone: 'yellow' },
            ]}
          />
        </div>

        {/* Pie Charts — EmptyState when all segments are zero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Phân bổ YCBG theo loại khách', data: ycbgPieData },
            { title: 'Phân bổ Đơn hàng theo loại khách', data: orderPieData },
          ].map((chart, idx) => {
            const isEmpty = chart.data.every((d) => d.value === 0);
            return (
              <ChartCard key={idx} title={chart.title}>
                {isEmpty ? (
                  <EmptyState message="Chưa có dữ liệu" description="Chưa có bản ghi nào để thống kê phân bổ theo loại khách." />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={chart.data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value, percent }: any) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {chart.data.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            );
          })}
        </div>

        {/* Line Charts - Dark variant via ChartCard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Xu hướng đơn hàng theo tháng', data: ordersByMonth, color: LINE_COLOR_ORDERS },
            { title: 'Xu hướng báo giá theo tháng', data: quotationsByMonth, color: LINE_COLOR_QUOTES },
          ].map((chart, idx) => (
            <ChartCard key={idx} title={chart.title} variant="dark">
              <p className="text-xs text-gray-400 mb-3">Năm {new Date().getFullYear()}</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chart.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={30} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: number) => [value, 'Số lượng']}
                    />
                    <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={chart.color}
                      strokeWidth={3}
                      dot={{ fill: chart.color, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Số lượng"
                    />
                  </LineChart>
                </ResponsiveContainer>
            </ChartCard>
          ))}
        </div>
    </div>
  );
};

export default GeneralManagement;
