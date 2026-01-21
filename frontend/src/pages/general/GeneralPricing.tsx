import React, { useState, useEffect } from 'react';
import {
  Calculator,
  FileText,
  ShoppingCart,
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

  // Stats overview
  const [requestStats, setRequestStats] = useState({
    total: 0,
    quocTe: 0,
    noiDia: 0
  });

  const [quotationStats, setQuotationStats] = useState({
    total: 0,
    quocTe: 0,
    noiDia: 0
  });

  const [orderStats, setOrderStats] = useState({
    total: 0,
    quocTe: 0,
    noiDia: 0
  });

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      // Fetch all data for both customer types
      const [
        requestsAllRes,
        requestsQuocTeRes,
        requestsNoiDiaRes,
        quotationsAllRes,
        quotationsQuocTeRes,
        quotationsNoiDiaRes,
        ordersAllRes,
        ordersQuocTeRes,
        ordersNoiDiaRes
      ] = await Promise.all([
        quotationRequestService.getAllQuotationRequests(1, 1),
        quotationRequestService.getAllQuotationRequests(1, 1, undefined, 'Quốc tế'),
        quotationRequestService.getAllQuotationRequests(1, 1, undefined, 'Nội địa'),
        quotationService.getAllQuotations(1, 1),
        quotationService.getAllQuotations(1, 1, undefined, 'Quốc tế'),
        quotationService.getAllQuotations(1, 1, undefined, 'Nội địa'),
        orderService.getAllOrders(1, 1),
        orderService.getAllOrders(1, 1, undefined, 'Quốc tế'),
        orderService.getAllOrders(1, 1, undefined, 'Nội địa')
      ]);

      setRequestStats({
        total: requestsAllRes.pagination.total,
        quocTe: requestsQuocTeRes.pagination.total,
        noiDia: requestsNoiDiaRes.pagination.total
      });

      setQuotationStats({
        total: quotationsAllRes.pagination.total,
        quocTe: quotationsQuocTeRes.pagination.total,
        noiDia: quotationsNoiDiaRes.pagination.total
      });

      setOrderStats({
        total: ordersAllRes.pagination.total,
        quocTe: ordersQuocTeRes.pagination.total,
        noiDia: ordersNoiDiaRes.pagination.total
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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
          {/* Card 1: Tổng quan yêu cầu báo giá */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Tổng quan yêu cầu BG
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng yêu cầu BG</span>
                  <span className="text-2xl font-bold text-blue-600">{requestStats.total}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-blue-600">{requestStats.quocTe}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Quốc tế</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{requestStats.noiDia}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Nội địa</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Tổng quan báo giá */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-green-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Calculator className="w-5 h-5 mr-2 text-green-600" />
                Tổng quan báo giá
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-3 hover:bg-green-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng báo giá</span>
                  <span className="text-2xl font-bold text-green-600">{quotationStats.total}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-blue-600">{quotationStats.quocTe}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Quốc tế</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{quotationStats.noiDia}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Nội địa</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Tổng quan đơn hàng */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <ShoppingCart className="w-5 h-5 mr-2 text-purple-600" />
                Tổng quan đơn hàng
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
                  <div className="text-xl font-bold text-blue-600">{orderStats.quocTe}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Quốc tế</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{orderStats.noiDia}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Nội địa</div>
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
