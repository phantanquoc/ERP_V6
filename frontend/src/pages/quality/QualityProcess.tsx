import React, { useState, useEffect } from 'react';
import {
  Settings,
  FileText,
  X,
  ClipboardList,
  Package,
  ShieldCheck
} from 'lucide-react';
import ProcessManagement from '../../components/ProcessManagement';
import OrderManagement from '../../components/OrderManagement';
import InternalInspectionManagement from '../../components/InternalInspectionManagement';
import { processService } from '../../services/processService';
import { internationalProductService } from '../../services/internationalProductService';

interface CostItem {
  id: string;
  loaiChiPhi: 'Nhân công' | 'Vật tư';
  tenChiPhi: string;
  dvt: string;
  donViTinh: string;
}

interface ProcessSection {
  id: string;
  tenPhanDoan: string;
  noiDungCongViec: string;
  costs: CostItem[];
}

interface ProcessDetail {
  id: number;
  stt: number;
  luuDo: string;
  noiDungCongViec: string;
  loaiChiPhi: string;
  tenChiPhi: string;
  dvt: string;
  donViTinh: string;
  tenNhanVien: string;
  tenQuyTrinh: string;
  loaiQuyTrinh: string;
  sections: ProcessSection[];
}

interface Process {
  id: number;
  stt: number;
  luuDo: string;
  noiDungCongViec: string;
  loaiChiPhi: string;
  tenChiPhi: string;
  dvt: string;
}

const QualityProcess = () => {
  const [activeTab, setActiveTab] = useState<'processList' | 'orderList' | 'inspection'>('processList');

  // State for Process List
  const [processDetails, setProcessDetails] = useState<ProcessDetail[]>([]);

  // State for real data from API
  const [processes, setProcesses] = useState<any[]>([]);
  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch real data from API
  useEffect(() => {
    fetchProcessesAndProducts();
  }, []);

  const fetchProcessesAndProducts = async () => {
    try {
      setLoading(true);
      // Fetch all processes (no pagination limit)
      const processResponse = await processService.getAllProcesses(1, 1000);
      setProcesses(processResponse.data);

      // Fetch all products (no pagination limit)
      const productResponse = await internationalProductService.getAllProducts(1, 1000);
      setRealProducts(productResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [processFormData, setProcessFormData] = useState({
    tenNhanVien: '',
    tenQuyTrinh: '',
    loaiQuyTrinh: '',
    luuDo: '',
    sections: [
      {
        id: '1',
        tenPhanDoan: '',
        noiDungCongViec: '',
        costs: []
      }
    ]
  });

  const [currentSectionCost, setCurrentSectionCost] = useState<{
    sectionId: string;
    loaiChiPhi: 'Nhân công' | 'Vật tư';
    tenChiPhi: string;
    dvt: string;
    donViTinh: string;
  }>({
    sectionId: '1',
    loaiChiPhi: 'Nhân công',
    tenChiPhi: '',
    dvt: '',
    donViTinh: ''
  });

  // Process List handlers
  const handleOpenProcessModal = () => {
    setProcessFormData({
      tenNhanVien: '',
      tenQuyTrinh: '',
      loaiQuyTrinh: '',
      luuDo: '',
      sections: [
        {
          id: '1',
          tenPhanDoan: '',
          noiDungCongViec: '',
          costs: []
        }
      ]
    });
    setCurrentSectionCost({
      sectionId: '1',
      loaiChiPhi: 'Nhân công',
      tenChiPhi: '',
      dvt: '',
      donViTinh: ''
    });
    setIsProcessModalOpen(true);
  };

  const handleCloseProcessModal = () => {
    setIsProcessModalOpen(false);
  };

  const handleProcessInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProcessFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSectionInputChange = (sectionId: string, field: string, value: string) => {
    setProcessFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, [field]: value }
          : section
      )
    }));
  };

  const handleAddSection = () => {
    const newSectionId = String(Math.max(...processFormData.sections.map(s => parseInt(s.id)), 0) + 1);
    setProcessFormData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: newSectionId,
          tenPhanDoan: '',
          noiDungCongViec: '',
          costs: []
        }
      ]
    }));
    setCurrentSectionCost({
      sectionId: newSectionId,
      loaiChiPhi: 'Nhân công',
      tenChiPhi: '',
      dvt: '',
      donViTinh: ''
    });
  };

  const handleRemoveSection = (sectionId: string) => {
    if (processFormData.sections.length > 1) {
      setProcessFormData(prev => ({
        ...prev,
        sections: prev.sections.filter(s => s.id !== sectionId)
      }));
    }
  };

  const handleAddCost = () => {
    if (!currentSectionCost.tenChiPhi || !currentSectionCost.dvt) {
      alert('Vui lòng điền đầy đủ thông tin chi phí');
      return;
    }

    setProcessFormData(prev => {
      const updatedSections = prev.sections.map(section => {
        if (section.id === currentSectionCost.sectionId) {
          // Count existing costs of the same type
          const sameTypeCount = section.costs.filter(c => c.loaiChiPhi === currentSectionCost.loaiChiPhi).length + 1;
          const displayName = `${currentSectionCost.loaiChiPhi} ${sameTypeCount}`;

          return {
            ...section,
            costs: [
              ...section.costs,
              {
                id: String(Date.now()),
                loaiChiPhi: currentSectionCost.loaiChiPhi,
                tenChiPhi: currentSectionCost.tenChiPhi,
                dvt: currentSectionCost.dvt,
                donViTinh: currentSectionCost.donViTinh
              }
            ]
          };
        }
        return section;
      });

      return {
        ...prev,
        sections: updatedSections
      };
    });

    setCurrentSectionCost({
      sectionId: currentSectionCost.sectionId,
      loaiChiPhi: 'Nhân công',
      tenChiPhi: '',
      dvt: '',
      donViTinh: ''
    });
  };

  const handleRemoveCost = (sectionId: string, costId: string) => {
    setProcessFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              costs: section.costs.filter(c => c.id !== costId)
            }
          : section
      )
    }));
  };

  const handleProcessSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Create a ProcessDetail for each section
    const newProcessDetails = processFormData.sections.map((section, idx) => {
      const newProcessDetail: ProcessDetail = {
        id: Math.max(...processDetails.map(p => p.id), 0) + idx + 1,
        stt: processDetails.length + idx + 1,
        luuDo: processFormData.luuDo,
        noiDungCongViec: section.noiDungCongViec || processFormData.tenQuyTrinh,
        loaiChiPhi: '',
        tenChiPhi: '',
        dvt: '',
        donViTinh: '',
        tenNhanVien: processFormData.tenNhanVien,
        tenQuyTrinh: processFormData.tenQuyTrinh,
        loaiQuyTrinh: processFormData.loaiQuyTrinh,
        sections: [section] // Each ProcessDetail has only one section
      };
      return newProcessDetail;
    });

    setProcessDetails([...processDetails, ...newProcessDetails]);
    handleCloseProcessModal();
  };

  const handleDeleteProcess = (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa quy trình này?')) {
      setProcessDetails(processDetails.filter(p => p.id !== id).map((p, idx) => ({
        ...p,
        stt: idx + 1
      })));
    }
  };

  const tabs = [
    { id: 'processList', name: 'Danh sách quy trình', icon: <FileText className="w-4 h-4" /> },
    { id: 'orderList', name: 'Danh sách đơn hàng', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'inspection', name: 'Kiểm tra nội bộ', icon: <ShieldCheck className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            Quản lý quy trình chất lượng
          </h1>
          <p className="text-gray-600">Quản lý tiêu chuẩn, quy trình, kiểm tra và cải tiến chất lượng</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tổng quan danh sách quy trình */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Tổng quan danh sách quy trình
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng số quy trình</span>
                  <span className="text-2xl font-bold text-blue-600">{loading ? '...' : processes.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : processes.filter(p => p.loaiQuyTrinh === 'Sản xuất').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Sản xuất</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : processes.filter(p => p.loaiQuyTrinh === 'Kiểm tra').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Kiểm tra</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : processes.filter(p => p.loaiQuyTrinh === 'Đóng gói').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Đóng gói</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : processes.filter(p => p.loaiQuyTrinh === 'Vận chuyển').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Vận chuyển</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : processes.filter(p =>
                      p.loaiQuyTrinh !== 'Sản xuất' &&
                      p.loaiQuyTrinh !== 'Kiểm tra' &&
                      p.loaiQuyTrinh !== 'Đóng gói' &&
                      p.loaiQuyTrinh !== 'Vận chuyển'
                    ).length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Khác</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tổng quan danh sách sản phẩm */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-emerald-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Package className="w-5 h-5 mr-2 text-emerald-600" />
                Tổng quan danh sách sản phẩm
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng sản phẩm</span>
                  <span className="text-2xl font-bold text-blue-600">{loading ? '...' : realProducts.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : realProducts.filter(p => p.loaiSanPham === 'Nguyên liệu tươi').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">NL tươi</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : realProducts.filter(p => p.loaiSanPham === 'Nguyên liệu đông').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">NL đông</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : realProducts.filter(p => p.loaiSanPham === 'Sản phẩm khô').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">SP khô</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : realProducts.filter(p => p.loaiSanPham === 'Sản phẩm đông').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">SP đông</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-800">
                    {loading ? '...' : realProducts.filter(p => p.loaiSanPham === 'Phụ liệu').length}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Phụ liệu</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-3">
            <nav className="flex space-x-8">
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
          {/* DANH SÁCH QUY TRÌNH - SỬ DỤNG ProcessManagement COMPONENT */}
          {activeTab === 'processList' && (
            <div className="p-6">
              <ProcessManagement />
            </div>
          )}

          {/* DANH SÁCH ĐƠN HÀNG */}
          {activeTab === 'orderList' && (
            <div className="p-6">
              <OrderManagement hideHeader={true} />
            </div>
          )}

          {/* KIỂM TRA NỘI BỘ */}
          {activeTab === 'inspection' && (
            <div className="p-6">
              <InternalInspectionManagement />
            </div>
          )}




        </div>

        {/* Process Modal */}
        {isProcessModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-700">
                <h2 className="text-2xl font-bold text-white">TẠO QUY TRÌNH</h2>
                <button
                  onClick={handleCloseProcessModal}
                  className="text-gray-300 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleProcessSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên nhân viên:</label>
                    <input
                      type="text"
                      name="tenNhanVien"
                      value={processFormData.tenNhanVien}
                      onChange={handleProcessInputChange}
                      placeholder="Nhập tên nhân viên"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tên quy trình:</label>
                    <input
                      type="text"
                      name="tenQuyTrinh"
                      value={processFormData.tenQuyTrinh}
                      onChange={handleProcessInputChange}
                      placeholder="Nhập tên quy trình"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loại quy trình:</label>
                    <input
                      type="text"
                      name="loaiQuyTrinh"
                      value={processFormData.loaiQuyTrinh}
                      onChange={handleProcessInputChange}
                      placeholder="Nhập loại quy trình"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lưu đồ:</label>
                    <input
                      type="text"
                      name="luuDo"
                      value={processFormData.luuDo}
                      onChange={handleProcessInputChange}
                      placeholder="Nhập lưu đồ"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                  {processFormData.sections.map((section, sectionIndex) => (
                    <div key={section.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white bg-green-600 px-4 py-2 rounded w-full">
                          Phân đoạn {sectionIndex + 1}
                        </h3>
                        {processFormData.sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(section.id)}
                            className="ml-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Xóa
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Tên phân đoạn:</label>
                          <input
                            type="text"
                            value={section.tenPhanDoan}
                            onChange={(e) => handleSectionInputChange(section.id, 'tenPhanDoan', e.target.value)}
                            placeholder="Nhập tên phân đoạn"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung công việc:</label>
                        <textarea
                          value={section.noiDungCongViec}
                          onChange={(e) => handleSectionInputChange(section.id, 'noiDungCongViec', e.target.value)}
                          placeholder="Nhập nội dung công việc"
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Costs */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Loại chi phí:</label>
                        {section.costs.length > 0 && (
                          <div className="mb-3 overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                              <tbody>
                                {section.costs.map((cost, costIndex) => {
                                  // Count how many costs of the same type appear before this one
                                  const sameTypeIndex = section.costs.filter(c => c.loaiChiPhi === cost.loaiChiPhi).indexOf(cost) + 1;
                                  const displayLabel = `${cost.loaiChiPhi} ${sameTypeIndex}`;

                                  return (
                                    <tr key={cost.id} className="border-b border-gray-300">
                                      <td className="px-3 py-2 border-r border-gray-300 font-medium text-sm">{displayLabel}</td>
                                      <td className="px-3 py-2 border-r border-gray-300 text-sm">{cost.tenChiPhi}</td>
                                      <td className="px-3 py-2 border-r border-gray-300 text-sm">{cost.dvt}</td>
                                      <td className="px-3 py-2 border-r border-gray-300 text-sm">{cost.donViTinh}</td>
                                      <td className="px-3 py-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCost(section.id, cost.id)}
                                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
                                        >
                                          Xóa
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Add Cost Form */}
                        {currentSectionCost.sectionId === section.id && (
                          <div className="bg-gray-50 p-4 rounded border border-gray-300 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Loại chi phí:</label>
                                <select
                                  value={currentSectionCost.loaiChiPhi}
                                  onChange={(e) => setCurrentSectionCost({
                                    ...currentSectionCost,
                                    loaiChiPhi: e.target.value as 'Nhân công' | 'Vật tư'
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="Nhân công">Nhân công</option>
                                  <option value="Vật tư">Vật tư</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tên chi phí:</label>
                                <input
                                  type="text"
                                  value={currentSectionCost.tenChiPhi}
                                  onChange={(e) => setCurrentSectionCost({
                                    ...currentSectionCost,
                                    tenChiPhi: e.target.value
                                  })}
                                  placeholder="Nhập tên chi phí"
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">DVT:</label>
                                <input
                                  type="text"
                                  value={currentSectionCost.dvt}
                                  onChange={(e) => setCurrentSectionCost({
                                    ...currentSectionCost,
                                    dvt: e.target.value
                                  })}
                                  placeholder="Nhập DVT"
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Người/Cái/Đôi:</label>
                                <input
                                  type="text"
                                  value={currentSectionCost.donViTinh}
                                  onChange={(e) => setCurrentSectionCost({
                                    ...currentSectionCost,
                                    donViTinh: e.target.value
                                  })}
                                  placeholder="Nhập đơn vị"
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleAddCost}
                              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                            >
                              + Thêm chi phí
                            </button>
                          </div>
                        )}

                        {currentSectionCost.sectionId !== section.id && (
                          <button
                            type="button"
                            onClick={() => setCurrentSectionCost({
                              sectionId: section.id,
                              loaiChiPhi: 'Nhân công',
                              tenChiPhi: '',
                              dvt: '',
                              donViTinh: ''
                            })}
                            className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                          >
                            + Thêm (Nhân công/ vật tư)
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Section Button */}
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded hover:bg-gray-800 font-medium"
                >
                  + THÊM PHÂN ĐOẠN
                </button>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseProcessModal}
                    className="px-8 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                  >
                    Duyệt quy trình
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseProcessModal}
                    className="px-8 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                  >
                    Tạo quy trình
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default QualityProcess;
