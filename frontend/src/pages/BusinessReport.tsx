import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock data
const businessData = {
  orders: {
    total: 10,
    international: 5,
    domestic: 5
  },
  internationalCustomers: {
    total: 10,
    new: 5,
    inactive: 5
  },
  domesticCustomers: {
    total: 10,
    new: 5,
    inactive: 5
  },
  customerFeedback: {
    total: 10,
    international: 5,
    domestic: 5
  }
};

// Mock data cho biểu đồ so sánh đơn hàng quốc tế 2024 vs 2025
const internationalOrderComparisonData = [
  { month: 'Tháng 1', '2024': 40, '2025': 65 },
  { month: 'Tháng 2', '2024': 55, '2025': 72 },
  { month: 'Tháng 3', '2024': 68, '2025': 78 },
  { month: 'Tháng 4', '2024': 86, '2025': 80 },
  { month: 'Tháng 5', '2024': 75, '2025': 76 },
  { month: 'Tháng 6', '2024': 72, '2025': 68 },
  { month: 'Tháng 7', '2024': 58, '2025': 52 },
  { month: 'Tháng 8', '2024': 55, '2025': 45 },
  { month: 'Tháng 9', '2024': 56, '2025': 48 },
  { month: 'Tháng 10', '2024': 58, '2025': 55 },
  { month: 'Tháng 11', '2024': 62, '2025': 60 },
  { month: 'Tháng 12', '2024': 87, '2025': 75 },
];

// Mock data cho biểu đồ so sánh đơn hàng nội địa 2024 vs 2025
const domesticOrderComparisonData = [
  { month: 'Tháng 1', '2024': 35, '2025': 50 },
  { month: 'Tháng 2', '2024': 48, '2025': 58 },
  { month: 'Tháng 3', '2024': 62, '2025': 70 },
  { month: 'Tháng 4', '2024': 70, '2025': 65 },
  { month: 'Tháng 5', '2024': 65, '2025': 60 },
  { month: 'Tháng 6', '2024': 58, '2025': 55 },
  { month: 'Tháng 7', '2024': 52, '2025': 48 },
  { month: 'Tháng 8', '2024': 50, '2025': 42 },
  { month: 'Tháng 9', '2024': 54, '2025': 46 },
  { month: 'Tháng 10', '2024': 60, '2025': 52 },
  { month: 'Tháng 11', '2024': 68, '2025': 58 },
  { month: 'Tháng 12', '2024': 80, '2025': 70 },
];

const BusinessReport: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className=" mx-auto">

        {/* Biểu đồ so sánh đơn hàng 2024 vs 2025 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Biểu đồ đơn hàng quốc tế */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg shadow-lg p-6s">
            <div className="mb-4">
              {/* <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">OVERVIEW</h2> */}
              <h3 className="text-2xl font-bold text-white mt-1">Tổng đơn hàng quốc tế</h3>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={internationalOrderComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                    tick={{ fill: '#cbd5e1', fontSize: 8 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#cbd5e1', fontSize: 10 }}
                    domain={[0, 100]}
                    width={20}
                    axisLine={true}
                    tickLine={true}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: '5px',
                      color: '#fff'
                    }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="2024"
                    stroke="#ec4899"
                    strokeWidth={3}
                    dot={{ fill: '#ec4899', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="2024"
                  />
                  <Line
                    type="monotone"
                    dataKey="2025"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="2025"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Biểu đồ đơn hàng nội địa */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg shadow-lg p-6">
            <div className="mb-4">
              {/* <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">OVERVIEW</h2> */}
              <h3 className="text-2xl font-bold text-white mt-1">Tổng đơn hàng nội địa</h3>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={domesticOrderComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                    tick={{ fill: '#cbd5e1', fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#cbd5e1', fontSize: 10 }}
                    domain={[0, 100]}
                    width={20}
                    axisLine={true}
                    tickLine={true}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: '5px',
                      color: '#fff'
                    }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="2024"
                    stroke="#ec4899"
                    strokeWidth={3}
                    dot={{ fill: '#ec4899', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="2024"
                  />
                  <Line
                    type="monotone"
                    dataKey="2025"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: '#6366f1', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="2025"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* 4 Flexbox Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Card 1: Đơn hàng */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center border-b pb-2">
              Đơn hàng
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tổng đơn hàng:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.orders.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Đơn hàng quốc tế:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.orders.international}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Đơn hàng nội địa:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.orders.domestic}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Khách hàng quốc tế */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center border-b pb-2">
              Khách hàng quốc tế
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tổng khách hàng:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.internationalCustomers.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Khách hàng mua mới:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.internationalCustomers.new}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Khách hàng ngừng mua:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.internationalCustomers.inactive}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Khách hàng nội địa */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center border-b pb-2">
              Khách hàng nội địa
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tổng khách hàng:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.domesticCustomers.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Khách hàng mua mới:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.domesticCustomers.new}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Khách hàng ngừng mua:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.domesticCustomers.inactive}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Phản hồi từ khách hàng */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center border-b pb-2">
              Phản hồi từ khách hàng
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tổng phản hồi:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.customerFeedback.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Phản hồi quốc tế:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.customerFeedback.international}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Phản hồi nội địa:</span>
                <span className="text-base font-semibold text-gray-800">{businessData.customerFeedback.domestic}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BusinessReport;
