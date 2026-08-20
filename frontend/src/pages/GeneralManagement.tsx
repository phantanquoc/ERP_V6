import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ShoppingCart, DollarSign, TrendingUp, Plane, Building2, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageHeader from '../design-system/PageHeader';
import ChartCard from '../design-system/ChartCard';
import { chartPalettes } from '../design-system/tokens';
import { quotationRequestService } from '../services/quotationRequestService';
import { quotationService } from '../services/quotationService';
import { orderService } from '../services/orderService';
import generalCostService from '../services/generalCostService';
import exportCostService from '../services/exportCostService';

const COLORS = chartPalettes.product.slice(0, 4);

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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 font-medium">Đang tải dữ liệu...</span>
        </div>
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

  const statCards = [
    {
      title: 'Yêu cầu báo giá',
      icon: <FileText className="w-6 h-6 text-blue-600" />,
      total: stats.ycbg.total,
      quocTe: stats.ycbg.quocTe,
      noiDia: stats.ycbg.noiDia,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      link: '/general/pricing?tab=requests',
    },
    {
      title: 'Bảng báo giá',
      icon: <TrendingUp className="w-6 h-6 text-green-600" />,
      total: stats.bangBaoGia.total,
      quocTe: stats.bangBaoGia.quocTe,
      noiDia: stats.bangBaoGia.noiDia,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      link: '/general/pricing?tab=quotes',
    },
    {
      title: 'Đơn hàng',
      icon: <ShoppingCart className="w-6 h-6 text-purple-600" />,
      total: stats.donHang.total,
      quocTe: stats.donHang.quocTe,
      noiDia: stats.donHang.noiDia,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      link: '/general/pricing?tab=orders',
    },
    {
      title: 'Chi phí chung',
      icon: <DollarSign className="w-6 h-6 text-orange-600" />,
      total: stats.chiPhiChung.total + stats.chiPhiChung.exportCost,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      isCost: true,
      generalCost: stats.chiPhiChung.total,
      exportCost: stats.chiPhiChung.exportCost,
      link: '/general/pricing?tab=costs',
    },
  ];

  return (
    <div className="space-y-5">
        <PageHeader
          title="Bộ phận tổng hợp"
          description="Tổng quan và quản lý các hoạt động của bộ phận"
          icon={<Layers className="h-5 w-5 text-blue-500" />}
        />

        {/* Stat Cards — neutral shell: grid-cols-1 md:grid-cols-2 lg:grid-cols-4, inner grid-cols-2 ~155px on 375px */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer min-w-0 overflow-hidden"
              onClick={() => navigate(card.link)}
            >
              <div className="flex items-center justify-between mb-3 min-w-0">
                <h3 className="text-sm font-semibold flex items-center text-gray-700 min-w-0">
                  <span className="shrink-0">{card.icon}</span>
                  <span className="ml-2 truncate" title={card.title}>{card.title}</span>
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className={`${card.bgColor} rounded-lg p-3 border border-gray-200`}>
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-gray-500 truncate">Tổng cộng</span>
                    <span className={`text-xl font-bold ${card.textColor} shrink-0`}>{card.total}</span>
                  </div>
                </div>
                {'isCost' in card && card.isCost ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 min-w-0 overflow-hidden">
                      <div className="text-lg font-bold text-orange-600 truncate">{card.generalCost}</div>
                      <div className="text-xs text-gray-500 mt-0.5 break-words line-clamp-2 leading-tight">Chi phí chung</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 min-w-0 overflow-hidden">
                      <div className="text-lg font-bold text-red-500 truncate">{card.exportCost}</div>
                      <div className="text-xs text-gray-500 mt-0.5 break-words line-clamp-2 leading-tight">Chi phí XK</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Plane className="w-3 h-3 text-blue-500 shrink-0" />
                      </div>
                      <div className="text-lg font-bold text-blue-600 truncate">{'quocTe' in card ? card.quocTe : 0}</div>
                      <div className="text-xs text-gray-500 mt-0.5 break-words line-clamp-2 leading-tight">Quốc tế</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 min-w-0 overflow-hidden">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <Building2 className="w-3 h-3 text-green-500 shrink-0" />
                      </div>
                      <div className="text-lg font-bold text-green-600 truncate">{'noiDia' in card ? card.noiDia : 0}</div>
                      <div className="text-xs text-gray-500 mt-0.5 break-words line-clamp-2 leading-tight">Nội địa</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Phân bổ YCBG theo loại khách', data: ycbgPieData },
            { title: 'Phân bổ Đơn hàng theo loại khách', data: orderPieData },
          ].map((chart, idx) => (
            <ChartCard key={idx} title={chart.title}>
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
            </ChartCard>
          ))}
        </div>

        {/* Line Charts - Dark variant via ChartCard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Xu hướng đơn hàng theo tháng', data: ordersByMonth, color: '#ec4899' },
            { title: 'Xu hướng báo giá theo tháng', data: quotationsByMonth, color: '#6366f1' },
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
