import React, { useState, useEffect } from 'react';
import {
  Factory,
  Calendar,
  ClipboardList,
  Package,
  FileText,
  TrendingUp,
  ClipboardCheck,
  Cog,
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
import MachineManagement from '../../components/MachineManagement';
import FinishedProductManagement from '../../components/FinishedProductManagement';
import QualityEvaluationManagement from '../../components/QualityEvaluationManagement';
import ProductionReportList from '../../components/ProductionDepartment/ProductionReportList';
import machineService from '../../services/machineService';
import { orderService } from '../../services/orderService';

const ProductionDepartment = () => {
  const [activeTab, setActiveTab] = useState<'machines' | 'processList' | 'productionOrders' | 'orderList' | 'standards' | 'materialEvaluation' | 'systemOperation' | 'finishedProduct' | 'qualityEvaluation' | 'productionReport'>('machines');
  const [selectedMaChien, setSelectedMaChien] = useState<string>('');
  const [selectedThoiGianChien, setSelectedThoiGianChien] = useState<string>('');

  // Machine statistics
  const [machineStats, setMachineStats] = useState({
    total: 0,
    hoatDong: 0,
    baoTri: 0,
    ngungHoatDong: 0
  });

  // Order statistics
  const [orderStats, setOrderStats] = useState({
    total: 0,
    choSanXuat: 0,
    dangSanXuat: 0,
    vanChuyen: 0,
    daGiao: 0
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    setLoading(true);
    await Promise.all([
      loadMachineStats(),
      loadOrderStats()
    ]);
    setLoading(false);
  };

  const loadMachineStats = async () => {
    try {
      const result = await machineService.getAllMachines(1, 1000);
      const machines = result.data;

      setMachineStats({
        total: machines.length,
        hoatDong: machines.filter(m => m.trangThai === 'HOAT_DONG').length,
        baoTri: machines.filter(m => m.trangThai === 'BẢO_TRÌ').length,
        ngungHoatDong: machines.filter(m => m.trangThai === 'NGỪNG_HOẠT_ĐỘNG').length
      });
    } catch (error) {
      console.error('Error loading machine stats:', error);
    }
  };

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
    { id: 'machines', name: 'Quản lý máy móc', icon: <Cog className="w-4 h-4" /> },
    { id: 'processList', name: 'Danh sách quy trình', icon: <FileText className="w-4 h-4" /> },
    { id: 'productionOrders', name: 'Danh sách quy trình sản xuất', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'orderList', name: 'Danh sách đơn hàng', icon: <Package className="w-4 h-4" /> },
    { id: 'standards', name: 'Định mức NVL', icon: <Calendar className="w-4 h-4" /> },
    { id: 'materialEvaluation', name: 'Đánh giá nguyên liệu', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'systemOperation', name: 'Thông số vận hành hệ thống', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'finishedProduct', name: 'THÀNH PHẨM ĐẦU RA', icon: <PackageCheck className="w-4 h-4" />, count: 0 },
    { id: 'qualityEvaluation', name: 'ĐÁNH GIÁ CHẤT LƯỢNG', icon: <Star className="w-4 h-4" />, count: 0 },
    { id: 'productionReport', name: 'BÁO CÁO SẢN LƯỢNG', icon: <BarChart3 className="w-4 h-4" />, count: 0 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Factory className="w-8 h-8 text-blue-600 mr-3" />
            Phòng QLSX
          </h1>
          <p className="text-gray-600">Quản lý quy trình, đơn hàng và định mức nguyên vật liệu</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tổng quan máy móc */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Cog className="w-5 h-5 mr-2 text-blue-600" />
                Tổng quan máy móc
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng số máy</span>
                  <span className="text-2xl font-bold text-blue-600">{machineStats.total}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-50 rounded-lg p-2 text-center hover:bg-green-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{machineStats.hoatDong}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đang hoạt động</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-2 text-center hover:bg-yellow-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-yellow-300 cursor-pointer">
                  <div className="text-xl font-bold text-yellow-600">{machineStats.baoTri}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đang bảo trì</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center hover:bg-red-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-red-300 cursor-pointer">
                  <div className="text-xl font-bold text-red-600">{machineStats.ngungHoatDong}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Ngừng hoạt động</div>
                </div>
              </div>
            </div>
          </div>

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
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-600">{orderStats.choSanXuat}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Chờ SX</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center hover:bg-blue-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                  <div className="text-xl font-bold text-blue-600">{orderStats.dangSanXuat}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đang SX</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-2 text-center hover:bg-orange-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-orange-300 cursor-pointer">
                  <div className="text-xl font-bold text-orange-600">{orderStats.vanChuyen}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Vận chuyển</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center hover:bg-green-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{orderStats.daGiao}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đã giao</div>
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
                      : 'border-transparent text-gray-900 hover:text-blue-600 hover:border-gray-300'
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
          {/* QUẢN LÝ MÁY MÓC */}
          {activeTab === 'machines' && (
            <div className="p-6">
              <MachineManagement />
            </div>
          )}

          {/* DANH SÁCH QUY TRÌNH */}
          {activeTab === 'processList' && (
            <div className="p-6">
              <ProcessManagement mode="standard-only" />
            </div>
          )}

          {/* KẾ HOẠCH SẢN XUẤT - MOVED TO STANDARDS TAB */}
          {activeTab === 'standards' && (
            <div className="p-6">
              <MaterialStandardManagement />
            </div>
          )}

          {/* DANH SÁCH QUY TRÌNH SẢN XUẤT */}
          {activeTab === 'productionOrders' && (
            <div className="p-6">
              <ProductionProcessManagement />
            </div>
          )}

          {/* DANH SÁCH ĐƠN HÀNG */}
          {activeTab === 'orderList' && (
            <div className="p-6">
              <OrderManagement hideHeader={true} />
            </div>
          )}

          {/* ĐÁNH GIÁ NGUYÊN LIỆU */}
          {activeTab === 'materialEvaluation' && (
            <div className="p-6">
              <MaterialEvaluationManagement onCreateSystemOperation={handleCreateSystemOperation} />
            </div>
          )}

          {/* THÔNG SỐ VẬN HÀNH HỆ THỐNG */}
          {activeTab === 'systemOperation' && (
            <div className="p-6">
              <SystemOperationManagement
                initialMaChien={selectedMaChien}
                initialThoiGianChien={selectedThoiGianChien}
              />
            </div>
          )}

          {/* THÀNH PHẨM ĐẦU RA */}
          {activeTab === 'finishedProduct' && (
            <div className="p-6">
              <FinishedProductManagement />
            </div>
          )}

          {/* ĐÁNH GIÁ CHẤT LƯỢNG */}
          {activeTab === 'qualityEvaluation' && (
            <div className="p-6">
              <QualityEvaluationManagement />
            </div>
          )}

          {/* BÁO CÁO SẢN LƯỢNG */}
          {activeTab === 'productionReport' && (
            <div className="p-6">
              <ProductionReportList />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionDepartment;
