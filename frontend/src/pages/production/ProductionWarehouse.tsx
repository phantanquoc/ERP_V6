import React, { useState, useEffect } from 'react';
import {
  Package,
  ArrowUp,
  ArrowDown,
  FileText,
  ClipboardList
} from 'lucide-react';
import SupplyRequestManagement from '../../components/SupplyRequestManagement';
import WarehouseManagement from '../../components/WarehouseManagement';
import WarehouseReceiptTab from '../../components/WarehouseReceiptTab';
import WarehouseIssueTab from '../../components/WarehouseIssueTab';
import warehouseService, { Warehouse as WarehouseType } from '../../services/warehouseService';
import warehouseReceiptService from '../../services/warehouseReceiptService';
import warehouseIssueService from '../../services/warehouseIssueService';
import supplyRequestService from '../../services/supplyRequestService';

const ProductionWarehouse = () => {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound' | 'supplyRequest' | 'warehouseManagement'>('warehouseManagement');

  // Overview data states
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [supplyRequests, setSupplyRequests] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Fetch overview data
  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoadingOverview(true);
      try {
        const [warehouseRes, receiptRes, issueRes, supplyRes] = await Promise.all([
          warehouseService.getAllWarehouses(),
          warehouseReceiptService.getAllWarehouseReceipts(),
          warehouseIssueService.getAllWarehouseIssues(),
          supplyRequestService.getAllSupplyRequests(1, 1000)
        ]);
        setWarehouses(warehouseRes.data.data || []);
        setReceipts(receiptRes.data || []);
        setIssues(issueRes.data || []);
        setSupplyRequests(supplyRes.data || []);
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoadingOverview(false);
      }
    };
    fetchOverviewData();
  }, []);

  // Calculate overview stats
  const totalWarehouses = warehouses.length;
  const emptyWarehouses = warehouses.filter(w => !w.lots || w.lots.length === 0).length;
  const emptyLots = warehouses.reduce((acc, w) => {
    if (!w.lots) return acc;
    return acc + w.lots.filter(lot => !lot.lotProducts || lot.lotProducts.length === 0).length;
  }, 0);

  const totalReceipts = receipts.length;
  const totalIssues = issues.length;

  const totalSupplyRequests = supplyRequests.length;
  const suppliedRequests = supplyRequests.filter(r => r.trangThai === 'Đã cung cấp').length;
  const pendingRequests = supplyRequests.filter(r => r.trangThai === 'Chưa cung cấp').length;

  // State for modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const openDetailModal = (item: any) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedItem(null);
  };

  const tabs = [
    { id: 'warehouseManagement', name: 'Quản lý kho', icon: <Package className="w-4 h-4" /> },
    { id: 'inbound', name: 'Nhập kho', icon: <ArrowDown className="w-4 h-4" /> },
    { id: 'outbound', name: 'Xuất kho', icon: <ArrowUp className="w-4 h-4" /> },
    { id: 'supplyRequest', name: 'Yêu cầu cung cấp', icon: <FileText className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Package className="w-8 h-8 text-indigo-600 mr-3" />
            Quản lý kho
          </h1>
          <p className="text-gray-600">Quản lý kho, nhập xuất kho và yêu cầu cung cấp</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Card 1: Tổng quan tồn kho */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Package className="w-5 h-5 mr-2 text-blue-600" />
                Tổng quan tồn kho
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Số lượng kho</span>
                  <span className="text-2xl font-bold text-blue-600">{loadingOverview ? '...' : totalWarehouses}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-yellow-50 rounded-lg p-2 text-center hover:bg-yellow-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-yellow-300 cursor-pointer">
                  <div className="text-xl font-bold text-yellow-600">{loadingOverview ? '...' : emptyWarehouses}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Kho trống</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-600">{loadingOverview ? '...' : emptyLots}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Lô trống</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Tổng quan nhập xuất kho */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-green-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <ArrowDown className="w-5 h-5 mr-2 text-green-600" />
                Tổng quan nhập xuất kho
              </h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 rounded-lg p-3 hover:bg-green-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="flex flex-col items-center">
                    <ArrowDown className="w-5 h-5 text-green-600 mb-1" />
                    <span className="text-2xl font-bold text-green-600">{loadingOverview ? '...' : totalReceipts}</span>
                    <span className="text-xs text-gray-600 mt-0.5">Phiếu nhập</span>
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 hover:bg-red-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-red-300 cursor-pointer">
                  <div className="flex flex-col items-center">
                    <ArrowUp className="w-5 h-5 text-red-600 mb-1" />
                    <span className="text-2xl font-bold text-red-600">{loadingOverview ? '...' : totalIssues}</span>
                    <span className="text-xs text-gray-600 mt-0.5">Phiếu xuất</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Tổng quan yêu cầu cung cấp */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <ClipboardList className="w-5 h-5 mr-2 text-purple-600" />
                Tổng quan yêu cầu cung cấp
              </h3>
            </div>
            <div className="space-y-3">
              <div className="bg-purple-50 rounded-lg p-3 hover:bg-purple-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-purple-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng yêu cầu</span>
                  <span className="text-2xl font-bold text-purple-600">{loadingOverview ? '...' : totalSupplyRequests}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 rounded-lg p-2 text-center hover:bg-green-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{loadingOverview ? '...' : suppliedRequests}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đã cung cấp</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-2 text-center hover:bg-orange-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-orange-300 cursor-pointer">
                  <div className="text-xl font-bold text-orange-600">{loadingOverview ? '...' : pendingRequests}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Chưa cung cấp</div>
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
                      ? 'border-indigo-500 text-indigo-600'
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
          {/* QUẢN LÝ KHO */}
          {activeTab === 'warehouseManagement' && (
            <WarehouseManagement />
          )}

          {/* NHẬP KHO */}
          {activeTab === 'inbound' && (
            <WarehouseReceiptTab />
          )}

          {/* NHẬP KHO - OLD MOCKDATA (COMMENTED OUT) */}
          {false && activeTab === 'inbound' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã phiếu nhập</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nhập</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhà cung cấp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vị trí</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inboundData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maPhieuNhap}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          {item.ngayNhap}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{item.nhaCungCap}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">{item.sanPham}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium">{item.soLuong.toLocaleString()} {item.donVi}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-bold text-green-600">
                          {(item.thanhTien / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.viTriLuuTru}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đã nhập' ? 'bg-green-100 text-green-800' :
                          item.trangThai === 'Đang xử lý' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.trangThai}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetailModal(item)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-800" title="Chỉnh sửa">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-purple-600 hover:text-purple-800" title="In phiếu">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* XUẤT KHO */}
          {activeTab === 'outbound' && (
            <WarehouseIssueTab />
          )}

          {/* XUẤT KHO - OLD MOCKDATA (COMMENTED OUT) */}
          {false && activeTab === 'outbound' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã phiếu xuất</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày xuất</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vận chuyển</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {outboundData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maPhieuXuat}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          {item.ngayXuat}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{item.khachHang}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">{item.sanPham}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium">{item.soLuong.toLocaleString()} {item.donVi}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-bold text-green-600">
                          {(item.thanhTien / 1000000000).toFixed(1)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium flex items-center">
                            <Truck className="w-4 h-4 text-gray-400 mr-1" />
                            {item.phuongThucVanChuyen}
                          </div>
                          <div className="text-xs text-gray-500">{item.soXe}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đã xuất' ? 'bg-green-100 text-green-800' :
                          item.trangThai === 'Đang chuẩn bị' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.trangThai}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetailModal(item)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-800" title="Chỉnh sửa">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-purple-600 hover:text-purple-800" title="In phiếu">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* YÊU CẦU CUNG CẤP */}
          {activeTab === 'supplyRequest' && (
            <SupplyRequestManagement />
          )}
        </div>

        {/* Detail Modal */}
        {isDetailModalOpen && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Chi tiết thông tin</h2>
                  <button
                    onClick={closeDetailModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(selectedItem).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </label>
                      <p className="text-sm text-gray-900">{String(value)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={closeDetailModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductionWarehouse;
