import React, { useState } from 'react';
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

const ProductionDepartment = () => {
  const [activeTab, setActiveTab] = useState<'machines' | 'processList' | 'productionOrders' | 'orderList' | 'standards' | 'materialEvaluation' | 'systemOperation' | 'finishedProduct' | 'qualityEvaluation' | 'productionReport'>('machines');
  const [selectedMaChien, setSelectedMaChien] = useState<string>('');
  const [selectedThoiGianChien, setSelectedThoiGianChien] = useState<string>('');

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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* Tổng quan quy trình */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 text-blue-600 mr-2" />
              Quy trình
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng quy trình</span>
                <span className="text-lg font-bold text-blue-600">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang hoạt động</span>
                <span className="text-lg font-bold text-green-600">0</span>
              </div>
            </div>
          </div>

          {/* Tổng quan quy trình sản xuất */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <ClipboardList className="w-5 h-5 text-green-600 mr-2" />
              QT Sản xuất
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng QTSX</span>
                <span className="text-lg font-bold text-green-600">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang SX</span>
                <span className="text-lg font-bold text-blue-600">0</span>
              </div>
            </div>
          </div>

          {/* Tổng quan đơn hàng */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Package className="w-5 h-5 text-purple-600 mr-2" />
              Đơn hàng
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng đơn hàng</span>
                <span className="text-lg font-bold text-purple-600">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang xử lý</span>
                <span className="text-lg font-bold text-green-600">0</span>
              </div>
            </div>
          </div>

          {/* Tổng quan định mức */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar className="w-5 h-5 text-orange-600 mr-2" />
              Định mức NVL
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng định mức</span>
                <span className="text-lg font-bold text-orange-600">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang áp dụng</span>
                <span className="text-lg font-bold text-green-600">0</span>
              </div>
            </div>
          </div>

          {/* Tổng quan đánh giá nguyên liệu */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <ClipboardCheck className="w-5 h-5 text-indigo-600 mr-2" />
              Đánh giá NVL
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng đánh giá</span>
                <span className="text-lg font-bold text-indigo-600">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Hôm nay</span>
                <span className="text-lg font-bold text-green-600">0</span>
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
