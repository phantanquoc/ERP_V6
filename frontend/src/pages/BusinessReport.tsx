import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ShoppingCart, MessageSquare, Plane, Building2, Briefcase, TrendingUp } from 'lucide-react';
import { orderService } from '../services/orderService';
import internationalCustomerService from '../services/internationalCustomerService';
import customerFeedbackService from '../services/customerFeedbackService';
import { PageHeader } from '../design-system/PageHeader';
import { KpiCard } from '../design-system/KpiCard';
import { ChartCard } from '../design-system/ChartCard';
import { LoadingState, ErrorState, EmptyState } from '../design-system/States';
import { chartPalettes, chartHeights } from '../design-system/tokens';

const ORDER_PIE_COLORS = chartPalettes.product.slice(0, 2);
const FEEDBACK_PIE_COLORS = chartPalettes.inspection.slice(0, 2);

const buildMonthlyChartData = (orders: any[]) => {
  const months = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  const currentYear = new Date().getFullYear();
  const prevYear = currentYear - 1;
  return months.map((month, idx) => {
    const prevYearCount = orders.filter((o: any) => {
      const d = new Date(o.ngayDatHang || o.createdAt);
      return d.getFullYear() === prevYear && d.getMonth() === idx;
    }).length;
    const currYearCount = orders.filter((o: any) => {
      const d = new Date(o.ngayDatHang || o.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === idx;
    }).length;
    return { month, [String(prevYear)]: prevYearCount, [String(currentYear)]: currYearCount };
  });
};

const BusinessReport = () => {
  const [businessData, setBusinessData] = useState({
    orders: { total: 0, international: 0, domestic: 0 },
    internationalCustomers: { total: 0, new: 0, inactive: 0 },
    domesticCustomers: { total: 0, new: 0, inactive: 0 },
    customerFeedback: { total: 0, international: 0, domestic: 0 },
  });
  const [internationalOrderComparisonData, setInternationalOrderComparisonData] = useState<any[]>([]);
  const [domesticOrderComparisonData, setDomesticOrderComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersIntl, ordersDom, customersIntl, customersDom, feedbackIntl, feedbackDom] = await Promise.all([
        orderService.getAllOrders(1, 10000, undefined, 'Quốc tế'),
        orderService.getAllOrders(1, 10000, undefined, 'Nội địa'),
        internationalCustomerService.getAllCustomers(1, 10000, undefined, 'Quốc tế'),
        internationalCustomerService.getAllCustomers(1, 10000, undefined, 'Nội địa'),
        customerFeedbackService.getAllFeedbacks({ customerType: 'Quốc tế' }),
        customerFeedbackService.getAllFeedbacks({ customerType: 'Nội địa' }),
      ]);

      const intlOrders = (ordersIntl as any).data || [];
      const domOrders = (ordersDom as any).data || [];
      const intlCustomers = (customersIntl as any).data || [];
      const domCustomers = (customersDom as any).data || [];
      const intlFeedback = (feedbackIntl as any) || [];
      const domFeedback = (feedbackDom as any) || [];
      const intlFbArr: any[] = Array.isArray(intlFeedback) ? intlFeedback : (intlFeedback as any).data || [];
      const domFbArr: any[] = Array.isArray(domFeedback) ? domFeedback : (domFeedback as any).data || [];

      setBusinessData({
        orders: { total: intlOrders.length + domOrders.length, international: intlOrders.length, domestic: domOrders.length },
        internationalCustomers: {
          total: intlCustomers.length,
          new: intlCustomers.filter((c: any) => c.trangThai === 'Đang giao dịch').length,
          inactive: intlCustomers.filter((c: any) => c.trangThai === 'Ngừng giao dịch').length,
        },
        domesticCustomers: {
          total: domCustomers.length,
          new: domCustomers.filter((c: any) => c.trangThai === 'Đang giao dịch').length,
          inactive: domCustomers.filter((c: any) => c.trangThai === 'Ngừng giao dịch').length,
        },
        customerFeedback: { total: intlFbArr.length + domFbArr.length, international: intlFbArr.length, domestic: domFbArr.length },
      });

      setInternationalOrderComparisonData(buildMonthlyChartData(intlOrders));
      setDomesticOrderComparisonData(buildMonthlyChartData(domOrders));
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error loading business report data:', err);
      setError('Không thể tải dữ liệu báo cáo kinh doanh');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading && !lastRefreshed) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Phòng kinh doanh"
          description="Tổng quan và quản lý các hoạt động kinh doanh"
          icon={<Briefcase className="h-5 w-5 text-sky-600" />}
        />
        <LoadingState message="Đang tải dữ liệu..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Phòng kinh doanh"
          description="Tổng quan và quản lý các hoạt động kinh doanh"
          icon={<Briefcase className="h-5 w-5 text-sky-600" />}
        />
        <ErrorState message={error} onRetry={fetchAll} />
      </div>
    );
  }

  const orderPieData = [
    { name: 'Quốc tế', value: businessData.orders.international },
    { name: 'Nội địa', value: businessData.orders.domestic },
  ];
  const feedbackPieData = [
    { name: 'Quốc tế', value: businessData.customerFeedback.international },
    { name: 'Nội địa', value: businessData.customerFeedback.domestic },
  ];

  const hasOrderPieData = orderPieData.some((d) => d.value > 0);
  const hasFeedbackPieData = feedbackPieData.some((d) => d.value > 0);
  const currYear = new Date().getFullYear();
  const prevYear = currYear - 1;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Phòng kinh doanh"
        description="Tổng quan đơn hàng, khách hàng và phản hồi"
        icon={<Briefcase className="h-5 w-5 text-sky-600" />}
        actions={
          <button
            onClick={fetchAll}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
          >
            <TrendingUp className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        }
      />
      {lastRefreshed && <p className="text-xs text-gray-400 -mt-3">Cập nhật lúc: {lastRefreshed.toLocaleTimeString('vi-VN')}</p>}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Đơn hàng"
          value={businessData.orders.total}
          sub={`Quốc tế: ${businessData.orders.international} · Nội địa: ${businessData.orders.domestic}`}
          icon={<ShoppingCart className="w-4 h-4" />}
          tone="blue"
          to="/business/management"
          subCounts={[
            { label: 'Quốc tế', count: businessData.orders.international, tone: 'blue' },
            { label: 'Nội địa', count: businessData.orders.domestic, tone: 'green' },
          ]}
        />
        <KpiCard
          label="Khách hàng quốc tế"
          value={businessData.internationalCustomers.total}
          sub={`Đang giao dịch: ${businessData.internationalCustomers.new} · Ngừng: ${businessData.internationalCustomers.inactive}`}
          icon={<Plane className="w-4 h-4" />}
          tone="green"
          to="/business/international"
          subCounts={[
            { label: 'Đang giao dịch', count: businessData.internationalCustomers.new, tone: 'green' },
            { label: 'Ngừng', count: businessData.internationalCustomers.inactive, tone: 'gray' },
          ]}
        />
        <KpiCard
          label="Khách hàng nội địa"
          value={businessData.domesticCustomers.total}
          sub={`Đang giao dịch: ${businessData.domesticCustomers.new} · Ngừng: ${businessData.domesticCustomers.inactive}`}
          icon={<Building2 className="w-4 h-4" />}
          tone="purple"
          to="/business/domestic"
          subCounts={[
            { label: 'Đang giao dịch', count: businessData.domesticCustomers.new, tone: 'green' },
            { label: 'Ngừng', count: businessData.domesticCustomers.inactive, tone: 'gray' },
          ]}
        />
        <KpiCard
          label="Phản hồi khách hàng"
          value={businessData.customerFeedback.total}
          sub={`Quốc tế: ${businessData.customerFeedback.international} · Nội địa: ${businessData.customerFeedback.domestic}`}
          icon={<MessageSquare className="w-4 h-4" />}
          tone="orange"
          to="/business/domestic"
          subCounts={[
            { label: 'Quốc tế', count: businessData.customerFeedback.international, tone: 'blue' },
            { label: 'Nội địa', count: businessData.customerFeedback.domestic, tone: 'green' },
          ]}
        />
      </div>

      {/* Pie Charts — 200px */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Phân bổ đơn hàng theo loại khách">
          {hasOrderPieData ? (
            <ResponsiveContainer width="100%" height={chartHeights.donut}>
              <PieChart>
                <Pie data={orderPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" nameKey="name" label={({ name, value, percent }: any) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}>
                  {orderPieData.map((_, i) => (
                    <Cell key={i} fill={ORDER_PIE_COLORS[i % ORDER_PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px]">
              <EmptyState message="Chưa có dữ liệu đơn hàng" description="Dữ liệu phân bổ sẽ hiển thị khi có đơn hàng." />
            </div>
          )}
        </ChartCard>

        <ChartCard title="Phân bổ phản hồi theo loại khách">
          {hasFeedbackPieData ? (
            <ResponsiveContainer width="100%" height={chartHeights.donut}>
              <PieChart>
                <Pie data={feedbackPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" nameKey="name" label={({ name, value, percent }: any) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}>
                  {feedbackPieData.map((_, i) => (
                    <Cell key={i} fill={FEEDBACK_PIE_COLORS[i % FEEDBACK_PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px]">
              <EmptyState message="Chưa có phản hồi" description="Dữ liệu phản hồi sẽ hiển thị khi có đánh giá từ khách hàng." />
            </div>
          )}
        </ChartCard>
      </div>

      {/* Line Charts — 260px dark */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Đơn hàng quốc tế theo tháng" variant="dark">
          <p className="text-xs text-gray-400 mb-2">{prevYear} vs {currYear}</p>
          <ResponsiveContainer width="100%" height={chartHeights.line}>
            <LineChart data={internationalOrderComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={30} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
              <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
              <Line type="monotone" dataKey={String(prevYear)} stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', r: 4 }} activeDot={{ r: 6 }} name={String(prevYear)} />
              <Line type="monotone" dataKey={String(currYear)} stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} name={String(currYear)} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Đơn hàng nội địa theo tháng" variant="dark">
          <p className="text-xs text-gray-400 mb-2">{prevYear} vs {currYear}</p>
          <ResponsiveContainer width="100%" height={chartHeights.line}>
            <LineChart data={domesticOrderComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={30} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
              <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
              <Line type="monotone" dataKey={String(prevYear)} stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', r: 4 }} activeDot={{ r: 6 }} name={String(prevYear)} />
              <Line type="monotone" dataKey={String(currYear)} stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} name={String(currYear)} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

export default BusinessReport;
