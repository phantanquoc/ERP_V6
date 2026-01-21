import React, { useState, useEffect } from 'react';
import {
  Home,
  Users,
  FileText,
  Package,
  MessageCircle
} from 'lucide-react';
import DomesticCustomerManagement from '../../components/DomesticCustomerManagement';
import QuotationRequestManagement from '../../components/QuotationRequestManagement';
import QuotationManagement from '../../components/QuotationManagement';
import OrderManagement from '../../components/OrderManagement';
import CustomerFeedbackManagement from '../../components/CustomerFeedbackManagement';
import { quotationRequestService } from '../../services/quotationRequestService';
import { quotationService } from '../../services/quotationService';
import { orderService } from '../../services/orderService';
import customerFeedbackService from '../../services/customerFeedbackService';

const BusinessDomestic = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'quotations' | 'quotationRequests' | 'customers' | 'feedback'>('quotationRequests');

  // Overview stats
  const [quotationRequestStats, setQuotationRequestStats] = useState({
    total: 0,
    daBaoGia: 0,
    chuaBaoGia: 0
  });

  const [quotationStats, setQuotationStats] = useState({
    total: 0,
    daDatHang: 0,
    dangChoPhanhoi: 0,
    dangChoGuiDonHang: 0,
    khongDatHang: 0
  });

  const [orderStats, setOrderStats] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0
  });

  const [feedbackStats, setFeedbackStats] = useState({
    total: 0,
    khanCap: 0,
    cao: 0
  });

  const [loading, setLoading] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadQuotationRequestStats(),
        loadQuotationStats(),
        loadOrderStats(),
        loadFeedbackStats()
      ]);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuotationRequestStats = async () => {
    try {
      const [requestsResponse, quotationsResponse] = await Promise.all([
        quotationRequestService.getAllQuotationRequests(1, 10000, undefined, 'Nội địa'),
        quotationService.getAllQuotations(1, 10000, undefined, 'Nội địa')
      ]);

      const requests = requestsResponse.data;
      const quotations = quotationsResponse.data;

      // Get unique quotation request IDs that have quotations
      const quotedRequestIds = new Set(quotations.map((q: any) => q.quotationRequestId));

      setQuotationRequestStats({
        total: requests.length,
        daBaoGia: quotedRequestIds.size,
        chuaBaoGia: requests.length - quotedRequestIds.size
      });
    } catch (error) {
      console.error('Error loading quotation request stats:', error);
    }
  };

  const loadQuotationStats = async () => {
    try {
      const response = await quotationService.getAllQuotations(1, 10000, undefined, 'Nội địa');
      const data = response.data;

      setQuotationStats({
        total: data.length,
        daDatHang: data.filter((item: any) => item.tinhTrang === 'DA_DAT_HANG').length,
        dangChoPhanhoi: data.filter((item: any) => item.tinhTrang === 'DANG_CHO_PHAN_HOI').length,
        dangChoGuiDonHang: data.filter((item: any) => item.tinhTrang === 'DANG_CHO_GUI_DON_HANG').length,
        khongDatHang: data.filter((item: any) => item.tinhTrang === 'KHONG_DAT_HANG').length
      });
    } catch (error) {
      console.error('Error loading quotation stats:', error);
    }
  };

  const loadOrderStats = async () => {
    try {
      const response = await orderService.getAllOrders(1, 10000, undefined, 'Nội địa');
      const data = response.data;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const thisMonthOrders = data.filter((item: any) => {
        const orderDate = new Date(item.ngayDatHang);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      });

      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const lastMonthOrders = data.filter((item: any) => {
        const orderDate = new Date(item.ngayDatHang);
        return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear;
      });

      setOrderStats({
        total: data.length,
        thisMonth: thisMonthOrders.length,
        lastMonth: lastMonthOrders.length
      });
    } catch (error) {
      console.error('Error loading order stats:', error);
    }
  };

  const loadFeedbackStats = async () => {
    try {
      const data = await customerFeedbackService.getAllFeedbacks({ customerType: 'Nội địa' });

      setFeedbackStats({
        total: data.length,
        khanCap: data.filter((item: any) => item.mucDoNghiemTrong === 'Khẩn cấp').length,
        cao: data.filter((item: any) => item.mucDoNghiemTrong === 'Cao').length
      });
    } catch (error) {
      console.error('Error loading feedback stats:', error);
    }
  };

  const tabs = [
    { id: 'quotationRequests', name: 'Danh sách yêu cầu BG', icon: <FileText className="w-4 h-4" /> },
    { id: 'quotations', name: 'Danh sách BG', icon: <FileText className="w-4 h-4" /> },
    { id: 'orders', name: 'Đơn hàng nội địa', icon: <Package className="w-4 h-4" /> },
    { id: 'customers', name: 'Danh sách khách hàng nội địa', icon: <Users className="w-4 h-4" /> },
    { id: 'feedback', name: 'Danh sách phản hồi từ KH', icon: <MessageCircle className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Home className="w-8 h-8 text-green-600 mr-3" />
            Phòng KD Nội Địa
          </h1>
          <p className="text-gray-600">Quản lý khách hàng nội địa, đơn hàng trong nước và hợp đồng thương mại</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Yêu cầu báo giá */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Yêu cầu báo giá
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng yêu cầu</span>
                  <span className="text-2xl font-bold text-blue-600">{quotationRequestStats.total}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{quotationRequestStats.daBaoGia}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đã báo giá</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-orange-600">{quotationRequestStats.chuaBaoGia}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Chưa báo giá</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Báo giá */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-green-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <FileText className="w-5 h-5 mr-2 text-green-600" />
                Báo giá
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-3 hover:bg-green-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng báo giá</span>
                  <span className="text-2xl font-bold text-green-600">{quotationStats.total}</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-lg font-bold text-green-600">{quotationStats.daDatHang}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5 leading-tight">Đã Đ.hàng</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-lg font-bold text-blue-600">{quotationStats.dangChoPhanhoi}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5 leading-tight">Chờ P.hồi</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-lg font-bold text-yellow-600">{quotationStats.dangChoGuiDonHang}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5 leading-tight">Chờ gửi ĐH</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-lg font-bold text-red-600">{quotationStats.khongDatHang}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5 leading-tight">Không ĐH</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Đơn hàng */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Package className="w-5 h-5 mr-2 text-purple-600" />
                Đơn hàng
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-purple-50 rounded-lg p-3 hover:bg-purple-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-purple-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng đơn hàng</span>
                  <span className="text-2xl font-bold text-purple-600">{orderStats.total}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{orderStats.thisMonth}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Tháng này</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-blue-600">{orderStats.lastMonth}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Tháng trước</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Phản hồi khách hàng */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-red-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <MessageCircle className="w-5 h-5 mr-2 text-red-600" />
                Phản hồi KH
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-red-50 rounded-lg p-3 hover:bg-red-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-red-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Số phản hồi</span>
                  <span className="text-2xl font-bold text-red-600">{feedbackStats.total}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-red-600">{feedbackStats.khanCap}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Khẩn cấp</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-orange-600">{feedbackStats.cao}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Cao</div>
                </div>
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
                      ? 'border-green-500 text-green-600'
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

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* KHÁCH HÀNG NỘI ĐỊA */}
          {activeTab === 'customers' && (
            <div className="p-6">
              <DomesticCustomerManagement />
            </div>
          )}

          {/* DANH SÁCH BÁO GIÁ */}
          {activeTab === 'quotations' && (
            <div className="p-6">
              <QuotationManagement customerType="Nội địa" />
            </div>
          )}

          {/* DANH SÁCH YÊU CẦU BÁO GIÁ */}
          {activeTab === 'quotationRequests' && (
            <div className="p-6">
              <QuotationRequestManagement customerType="Nội địa" />
            </div>
          )}

          {/* ĐƠN HÀNG NỘI ĐỊA */}
          {activeTab === 'orders' && (
            <div className="p-6">
              <OrderManagement hideHeader={true} customerType="Nội địa" />
            </div>
          )}

          {/* PHẢN HỒI TỪ KHÁCH HÀNG */}
          {activeTab === 'feedback' && (
            <div className="p-6">
              <CustomerFeedbackManagement customerType="Nội địa" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessDomestic;
