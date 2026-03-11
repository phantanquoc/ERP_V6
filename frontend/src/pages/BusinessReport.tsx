import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ShoppingCart, MessageSquare, Plane, Building2 } from 'lucide-react';
import { orderService } from '../services/orderService';
import internationalCustomerService from '../services/internationalCustomerService';
import customerFeedbackService from '../services/customerFeedbackService';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

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

const BusinessReport: React.FC = () => {
  const [businessData, setBusinessData] = useState({
    orders: { total: 0, international: 0, domestic: 0 },
    internationalCustomers: { total: 0, new: 0, inactive: 0 },
    domesticCustomers: { total: 0, new: 0, inactive: 0 },
    customerFeedback: { total: 0, international: 0, domestic: 0 }
  });
  const [internationalOrderComparisonData, setInternationalOrderComparisonData] = useState<any[]>([]);
  const [domesticOrderComparisonData, setDomesticOrderComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [ordersIntl, ordersDom, customersIntl, customersDom, feedbackIntl, feedbackDom] = await Promise.all([
          orderService.getAllOrders(1, 10000, undefined, 'Quốc tế'),
          orderService.getAllOrders(1, 10000, undefined, 'Nội địa'),
          internationalCustomerService.getAllCustomers(1, 10000, undefined, 'Quốc tế'),
          internationalCustomerService.getAllCustomers(1, 10000, undefined, 'Nội địa'),
          customerFeedbackService.getAllFeedbacks({ customerType: 'Quốc tế' }),
          customerFeedbackService.getAllFeedbacks({ customerType: 'Nội địa' }),
        ]);

        const intlOrders = ordersIntl.data || [];
        const domOrders = ordersDom.data || [];
        const intlCustomers = customersIntl.data || [];
        const domCustomers = customersDom.data || [];
        const intlFeedback = feedbackIntl || [];
        const domFeedback = feedbackDom || [];

        setBusinessData({
          orders: {
            total: intlOrders.length + domOrders.length,
            international: intlOrders.length,
            domestic: domOrders.length,
          },
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
          customerFeedback: {
            total: intlFeedback.length + domFeedback.length,
            international: intlFeedback.length,
            domestic: domFeedback.length,
          },
        });

        setInternationalOrderComparisonData(buildMonthlyChartData(intlOrders));
        setDomesticOrderComparisonData(buildMonthlyChartData(domOrders));
      } catch (error) {
        console.error('Error loading business report data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
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

  const orderPieData = [
    { name: 'Quốc tế', value: businessData.orders.international },
    { name: 'Nội địa', value: businessData.orders.domestic },
  ];
  const feedbackPieData = [
    { name: 'Quốc tế', value: businessData.customerFeedback.international },
    { name: 'Nội địa', value: businessData.customerFeedback.domestic },
  ];

  const statCards = [
    {
      title: 'Đơn hàng',
      icon: <ShoppingCart className="w-6 h-6 text-blue-600" />,
      total: businessData.orders.total,
      quocTe: businessData.orders.international,
      noiDia: businessData.orders.domestic,
      borderColor: 'border-blue-400',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Khách hàng quốc tế',
      icon: <Plane className="w-6 h-6 text-green-600" />,
      total: businessData.internationalCustomers.total,
      quocTe: businessData.internationalCustomers.new,
      noiDia: businessData.internationalCustomers.inactive,
      labelA: 'Đang giao dịch',
      labelB: 'Ngừng giao dịch',
      borderColor: 'border-green-400',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Khách hàng nội địa',
      icon: <Building2 className="w-6 h-6 text-purple-600" />,
      total: businessData.domesticCustomers.total,
      quocTe: businessData.domesticCustomers.new,
      noiDia: businessData.domesticCustomers.inactive,
      labelA: 'Đang giao dịch',
      labelB: 'Ngừng giao dịch',
      borderColor: 'border-purple-400',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Phản hồi khách hàng',
      icon: <MessageSquare className="w-6 h-6 text-orange-600" />,
      total: businessData.customerFeedback.total,
      quocTe: businessData.customerFeedback.international,
      noiDia: businessData.customerFeedback.domestic,
      borderColor: 'border-orange-400',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Phòng kinh doanh</h1>
          <p className="text-gray-600">Tổng quan và quản lý các hoạt động kinh doanh</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:${card.borderColor}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center text-gray-800">
                  {card.icon}
                  <span className="ml-2">{card.title}</span>
                </h3>
              </div>
              <div className="space-y-3">
                <div className={`${card.bgColor} rounded-lg p-3 border-2 ${card.borderColor}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">Tổng cộng</span>
                    <span className={`text-2xl font-bold ${card.textColor}`}>{card.total}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2 text-center border-2 border-gray-300">
                    <div className="text-xl font-bold text-blue-600">{card.quocTe}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{card.labelA || 'Quốc tế'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center border-2 border-gray-300">
                    <div className="text-xl font-bold text-green-600">{card.noiDia}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{card.labelB || 'Nội địa'}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pie Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {[
            { title: 'Phân bổ đơn hàng theo loại khách', data: orderPieData },
            { title: 'Phân bổ phản hồi theo loại khách', data: feedbackPieData },
          ].map((chart, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-300">
              <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">{chart.title}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={chart.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {chart.data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>

        {/* Line Charts - Dark Theme */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {[
            { title: 'Tổng đơn hàng quốc tế', data: internationalOrderComparisonData },
            { title: 'Tổng đơn hàng nội địa', data: domesticOrderComparisonData },
          ].map((chart, idx) => (
            <div key={idx} className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-white mt-1">{chart.title}</h3>
                <p className="text-sm text-gray-400">{new Date().getFullYear() - 1} vs {new Date().getFullYear()}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chart.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} width={30} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" />
                    <Line
                      type="monotone"
                      dataKey={String(new Date().getFullYear() - 1)}
                      stroke="#ec4899"
                      strokeWidth={3}
                      dot={{ fill: '#ec4899', r: 4 }}
                      activeDot={{ r: 6 }}
                      name={String(new Date().getFullYear() - 1)}
                    />
                    <Line
                      type="monotone"
                      dataKey={String(new Date().getFullYear())}
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ fill: '#6366f1', r: 4 }}
                      activeDot={{ r: 6 }}
                      name={String(new Date().getFullYear())}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusinessReport;
