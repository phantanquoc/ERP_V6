import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Factory,
  Calendar,
  ClipboardList,
  Package,
  FileText,
  TrendingUp,
  ClipboardCheck,
  PackageCheck,
  Star,
  BarChart3
} from 'lucide-react';
import MaterialStandardManagement from '../../components/MaterialStandardManagement';
import ProcessManagement from '../../components/ProcessManagement';
import ProductionProcessManagement from '../../components/ProductionProcessManagement';
import OrderManagement from '../../components/OrderManagement';
import MaterialEvaluationManagement from '../../components/MaterialEvaluationManagement';
import SystemOperationManagement from '../../components/SystemOperationManagement';
import FinishedProductManagement from '../../components/FinishedProductManagement';
import QualityEvaluationManagement from '../../components/QualityEvaluationManagement';
import ProductionReportList from '../../components/ProductionDepartment/ProductionReportList';
import { orderService } from '../../services/orderService';

const ProductionDepartment = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'processList' | 'productionOrders' | 'orderList' | 'standards' | 'materialEvaluation' | 'systemOperation' | 'finishedProduct' | 'qualityEvaluation' | 'productionReport'>(() => {
    const tabParam = searchParams.get('tab');
    const validTabs = ['processList', 'productionOrders', 'orderList', 'standards', 'materialEvaluation', 'systemOperation', 'finishedProduct', 'qualityEvaluation', 'productionReport'];
    return validTabs.includes(tabParam || '') ? tabParam as any : 'processList';
  });
  const [selectedMaChien, setSelectedMaChien] = useState<string>('');
  const [selectedThoiGianChien, setSelectedThoiGianChien] = useState<string>('');

  // Order statistics
  const [orderStats, setOrderStats] = useState({
    total: 0,
    choSanXuat: 0,
    dangSanXuat: 0,
    vanChuyen: 0,
    daGiao: 0
  });

  useEffect(() => {
    loadOrderStats();
  }, []);

  // Sync tab to URL when changed
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [activeTab]);

  const loadOrderStats = async () => {
    try {
      const response = await orderService.getAllOrders(1, 10000);
      const orders = response.data;

      setOrderStats({
        total: orders.length,
        choSanXuat: orders.filter((o: any) => o.trangThaiSanXuat === 'CHO_SAN_XUAT').length,
        dangSanXuat: orders.filter((o: any) => o.trangThaiSanXuat === 'DANG_SAN_XUAT').length,
        vanChuyen: orders.filter((o: any) => o.trangThaiSanXuat === 'DANG_VAN_CHUYEN').length,
        daGiao: orders.filter((o: any) => o.trangThaiSanXuat === 'DA_GIAO_CHO_KHACH_HANG').length
      });
    } catch (error) {
      console.error('Error loading order stats:', error);
    }
  };

  const handleCreateSystemOperation = (maChien: string, thoiGianChien: string) => {
    setSelectedMaChien(maChien);
    setSelectedThoiGianChien(thoiGianChien);
    setActiveTab('systemOperation');
  };



  const tabs = [
    { id: 'processList', name: 'Danh sách quy trình', icon: <FileText className="w-4 h-4" /> },
    { id: 'productionOrders', name: 'Danh sách quy trình sản xuất', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'orderList', name: 'Danh sách đơn hàng', icon: <Package className="w-4 h-4" /> },
    { id: 'standards', name: 'Định mức NVL', icon: <Calendar className="w-4 h-4" /> },
    { id: 'materialEvaluation', name: 'Đánh giá nguyên liệu', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'systemOperation', name: 'Thông số vận hành hệ thống', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'finishedProduct', name: 'Thành phẩm đầu ra', icon: <PackageCheck className="w-4 h-4" />, count: 0 },
    { id: 'qualityEvaluation', name: 'Đánh giá chất lượng', icon: <Star className="w-4 h-4" />, count: 0 },
    { id: 'productionReport', name: 'Báo cáo sản lượng', icon: <BarChart3 className="w-4 h-4" />, count: 0 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Factory className="w-6 h-6 text-blue-600" />
          Phòng QLSX
        </h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý quy trình, đơn hàng và định mức nguyên vật liệu</p>
      </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {/* Tổng quan đơn hàng */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Package className="w-5 h-5 mr-2 text-purple-600" />
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-lg sm:text-xl font-bold text-gray-600">{orderStats.choSanXuat}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Chờ SX</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center hover:bg-blue-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                  <div className="text-lg sm:text-xl font-bold text-blue-600">{orderStats.dangSanXuat}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đang SX</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-2 text-center hover:bg-orange-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-orange-300 cursor-pointer">
                  <div className="text-lg sm:text-xl font-bold text-orange-600">{orderStats.vanChuyen}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Vận chuyển</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center hover:bg-green-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="text-lg sm:text-xl font-bold text-green-600">{orderStats.daGiao}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đã giao</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'processList' && <ProcessManagement mode="standard-only" />}
      {activeTab === 'standards' && <MaterialStandardManagement />}
      {activeTab === 'productionOrders' && <ProductionProcessManagement />}
      {activeTab === 'orderList' && <OrderManagement hideHeader={true} />}
      {activeTab === 'materialEvaluation' && <MaterialEvaluationManagement onCreateSystemOperation={handleCreateSystemOperation} />}
      {activeTab === 'systemOperation' && (
        <SystemOperationManagement
          initialMaChien={selectedMaChien}
          initialThoiGianChien={selectedThoiGianChien}
        />
      )}
      {activeTab === 'finishedProduct' && <FinishedProductManagement />}
      {activeTab === 'qualityEvaluation' && <QualityEvaluationManagement />}
      {activeTab === 'productionReport' && <ProductionReportList />}
    </div>
  );
};

export default ProductionDepartment;
