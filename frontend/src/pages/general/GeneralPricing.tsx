import React, { useState, useEffect } from 'react';
import {
  Calculator,
  FileText,
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  DollarSign,
  Plane
} from 'lucide-react';
import QuotationRequestManagement from '../../components/QuotationRequestManagement';
import QuotationManagement from '../../components/QuotationManagement';
import OrderManagement from '../../components/OrderManagement';
import GeneralCostManagement from '../../components/GeneralCostManagement';
import ExportCostManagement from '../../components/ExportCostManagement';
import { quotationService } from '../../services/quotationService';
import { quotationRequestService } from '../../services/quotationRequestService';
import { orderService } from '../../services/orderService';

const GeneralPricing = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'quotes' | 'orders' | 'general-cost' | 'export-cost'>('requests');
  const [quotationCount, setQuotationCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const [quotationsRes, requestsRes, ordersRes] = await Promise.all([
        quotationService.getAllQuotations(1, 1000), // Lấy nhiều để đếm theo trạng thái
        quotationRequestService.getAllQuotationRequests(1, 1),
        orderService.getAllOrders(1, 1000), // Lấy nhiều để đếm theo trạng thái
      ]);
      setQuotationCount(quotationsRes.pagination.total);
      setRequestCount(requestsRes.pagination.total);
      setOrderCount(ordersRes.pagination.total);
      setQuotations(quotationsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const tabs = [
    { id: 'requests', name: 'Danh sách YCBG', icon: <FileText className="w-4 h-4" /> },
    { id: 'quotes', name: 'Danh sách báo giá', icon: <Calculator className="w-4 h-4" /> },
    { id: 'orders', name: 'Danh sách đơn hàng', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'general-cost', name: 'Chi phí chung', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'export-cost', name: 'Chi phí xuất khẩu', icon: <Plane className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Calculator className="w-8 h-8 text-blue-600 mr-3" />
            Phòng giá thành
          </h1>
          <p className="text-gray-600">Quản lý yêu cầu báo giá, báo giá và đơn hàng</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Flexbox 1: Tổng quan đơn hàng */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg border border-blue-200 p-6 hover:shadow-xl transition-all duration-300">
            <h3 className="text-xl font-bold text-blue-800 mb-6 flex items-center">
              <div className="p-2 bg-blue-600 rounded-lg mr-3">
                <FileText className="w-5 h-5 text-white" />
              </div>
              Tổng quan đơn hàng
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                <span className="text-sm font-semibold text-gray-700">Danh sách YCBG</span>
                <span className="text-2xl font-bold text-blue-600">{requestCount}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
                <span className="text-sm font-semibold text-gray-700">Danh sách báo giá</span>
                <span className="text-2xl font-bold text-emerald-600">{quotationCount}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-4 border-violet-500 hover:shadow-md transition-shadow">
                <span className="text-sm font-semibold text-gray-700">Danh sách đơn hàng</span>
                <span className="text-2xl font-bold text-violet-600">{orderCount}</span>
              </div>
            </div>
          </div>

          {/* Flexbox 2: Tổng DS báo giá */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-lg border border-emerald-200 p-6 hover:shadow-xl transition-all duration-300">
            <h3 className="text-xl font-bold text-emerald-800 mb-6 flex items-center">
              <div className="p-2 bg-emerald-600 rounded-lg mr-3">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              Tổng DS báo giá
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
                <span className="text-sm font-semibold text-gray-700">DS báo giá đã gửi</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {quotations.filter(item => item.tinhTrang === 'Đã gửi').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-4 border-amber-500 hover:shadow-md transition-shadow">
                <span className="text-sm font-semibold text-gray-700">DS báo giá chờ phản hồi</span>
                <span className="text-2xl font-bold text-amber-600">
                  {quotations.filter(item => item.tinhTrang === 'Chờ phản hồi').length}
                </span>
              </div>
            </div>
          </div>

          {/* Flexbox 3: Tổng DS đơn hàng */}
          <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl shadow-lg border border-violet-200 p-6 hover:shadow-xl transition-all duration-300">
            <h3 className="text-xl font-bold text-violet-800 mb-6 flex items-center">
              <div className="p-2 bg-violet-600 rounded-lg mr-3">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              Tổng DS đơn hàng
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-4 border-slate-500 hover:shadow-md transition-shadow">
                <span className="text-sm font-semibold text-gray-700">ĐH chờ sản xuất</span>
                <span className="text-2xl font-bold text-slate-600">
                  {orders.filter(item => item.trangThai === 'Chờ sản xuất').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                <span className="text-sm font-semibold text-gray-700">ĐH đang sản xuất</span>
                <span className="text-2xl font-bold text-blue-600">
                  {orders.filter(item => item.trangThai === 'Đang sản xuất').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
                <span className="text-sm font-semibold text-gray-700">ĐH đã sản xuất</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {orders.filter(item => item.trangThai === 'Hoàn thành').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-4 border-red-500 hover:shadow-md transition-shadow">
                <span className="text-sm font-semibold text-gray-700">ĐH đã hủy</span>
                <span className="text-2xl font-bold text-red-600">
                  {orders.filter(item => item.trangThai === 'Đã hủy').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <Filter className="h-4 w-4" />
                Lọc
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                <Download className="h-4 w-4" />
                Xuất Excel
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Thêm mới
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* DANH SÁCH YCBG */}
          {activeTab === 'requests' && (
            <div className="p-6">
              <QuotationRequestManagement mode="pricing" />
            </div>
          )}

          {/* DANH SÁCH BÁO GIÁ */}
          {activeTab === 'quotes' && (
            <div className="p-6">
              <QuotationManagement />
            </div>
          )}

          {/* DANH SÁCH ĐƠN HÀNG */}
          {activeTab === 'orders' && (
            <div className="p-6">
              <OrderManagement />
            </div>
          )}

          {/* CHI PHÍ CHUNG */}
          {activeTab === 'general-cost' && (
            <GeneralCostManagement />
          )}

          {/* CHI PHÍ XUẤT KHẨU */}
          {activeTab === 'export-cost' && (
            <ExportCostManagement />
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralPricing;
