import React, { useState } from 'react';
import {
  Package,
  ArrowUp,
  ArrowDown,
  ClipboardCheck,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Truck,
  FileText
} from 'lucide-react';
import WarehouseInventoryManagement from '../../components/WarehouseInventoryManagement';
import SupplyRequestManagement from '../../components/SupplyRequestManagement';
import WarehouseManagement from '../../components/WarehouseManagement';
import WarehouseReceiptTab from '../../components/WarehouseReceiptTab';
import WarehouseIssueTab from '../../components/WarehouseIssueTab';

const ProductionWarehouse = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'inbound' | 'outbound' | 'audit' | 'reports' | 'supplyRequest' | 'warehouseManagement'>('inventory');

  // Dữ liệu mẫu cho TỒN KHO
  const inventoryData = [
    {
      id: 1,
      maSanPham: 'SP-001',
      tenSanPham: 'Tôm sú đông lạnh size 20-30',
      loaiSanPham: 'Thủy sản đông lạnh',
      soLuongTon: 15000,
      donVi: 'kg',
      giaTriTon: 1500000000,
      viTriKho: 'Kho lạnh A1-01',
      ngayNhapGanNhat: '2024-03-18',
      hanSuDung: '2024-09-18',
      trangThai: 'Bình thường',
      mucCanhBao: 5000,
      nhaCungCap: 'Công ty TNHH Thủy sản Miền Nam',
      ghiChu: 'Sản phẩm xuất khẩu'
    },
    {
      id: 2,
      maSanPham: 'SP-002',
      tenSanPham: 'Cá tra phi lê đông lạnh',
      loaiSanPham: 'Thủy sản đông lạnh',
      soLuongTon: 3000,
      donVi: 'kg',
      giaTriTon: 240000000,
      viTriKho: 'Kho lạnh B2-05',
      ngayNhapGanNhat: '2024-03-15',
      hanSuDung: '2024-09-15',
      trangThai: 'Cảnh báo',
      mucCanhBao: 5000,
      nhaCungCap: 'Trang trại cá tra An Giang',
      ghiChu: 'Sắp hết hàng, cần nhập thêm'
    }
  ];

  // CLEARED - Dữ liệu mẫu cho NHẬP KHO đã được xóa
  const inboundData: any[] = [];

  // CLEARED - Dữ liệu mẫu cho XUẤT KHO đã được xóa
  const outboundData: any[] = [];

  // Dữ liệu mẫu cho KIỂM KÊ KHO
  const auditData = [
    {
      id: 1,
      maKiemKe: 'KK-001/2024',
      ngayKiemKe: '2024-03-15',
      nguoiKiemKe: 'Nguyễn Văn An, Trần Thị Bình',
      khuVucKiemKe: 'Kho lạnh A1',
      tongSanPham: 25,
      sanPhamKhopSo: 23,
      sanPhamLech: 2,
      tyLeChinhXac: 92,
      giaTriLech: 15000000,
      trangThai: 'Hoàn thành',
      ketQua: 'Có sai lệch nhỏ',
      nguyenNhanLech: 'Sai sót trong ghi chép',
      bienPhapXuLy: 'Điều chỉnh số liệu, tăng cường kiểm soát',
      ghiChu: 'Kiểm kê định kỳ tháng 3'
    },
    {
      id: 2,
      maKiemKe: 'KK-002/2024',
      ngayKiemKe: '2024-03-10',
      nguoiKiemKe: 'Lê Văn Cường, Phạm Thị Dung',
      khuVucKiemKe: 'Kho lạnh B2',
      tongSanPham: 18,
      sanPhamKhopSo: 18,
      sanPhamLech: 0,
      tyLeChinhXac: 100,
      giaTriLech: 0,
      trangThai: 'Hoàn thành',
      ketQua: 'Chính xác 100%',
      nguyenNhanLech: 'Không có',
      bienPhapXuLy: 'Không cần',
      ghiChu: 'Kiểm kê xuất sắc'
    }
  ];

  // Dữ liệu mẫu cho BÁO CÁO KHO
  const reportData = [
    {
      id: 1,
      thang: 'Tháng 3/2024',
      tongGiaTriTon: 2500000000,
      soLuongNhap: 45000,
      giaTriNhap: 1800000000,
      soLuongXuat: 38000,
      giaTriXuat: 2200000000,
      vongQuayKho: 12.5,
      hieuSuatKho: 85.2,
      tyLeHaoHut: 1.2,
      chiPhiLuuKho: 125000000,
      soLanKiemKe: 2,
      tyLeChinhXacKiemKe: 96,
      ghiChu: 'Hoạt động kho ổn định'
    },
    {
      id: 2,
      thang: 'Tháng 2/2024',
      tongGiaTriTon: 2200000000,
      soLuongNhap: 42000,
      giaTriNhap: 1650000000,
      soLuongXuat: 40000,
      giaTriXuat: 2100000000,
      vongQuayKho: 11.8,
      hieuSuatKho: 82.7,
      tyLeHaoHut: 1.5,
      chiPhiLuuKho: 118000000,
      soLanKiemKe: 2,
      tyLeChinhXacKiemKe: 94,
      ghiChu: 'Tăng cường kiểm soát chất lượng'
    }
  ];

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
    { id: 'inventory', name: 'Tồn kho', icon: <Package className="w-4 h-4" /> },
    { id: 'inbound', name: 'Nhập kho', icon: <ArrowDown className="w-4 h-4" /> },
    { id: 'outbound', name: 'Xuất kho', icon: <ArrowUp className="w-4 h-4" /> },
    { id: 'audit', name: 'Kiểm kê kho', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'reports', name: 'Báo cáo kho', icon: <BarChart3 className="w-4 h-4" /> },
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
          <p className="text-gray-600">Quản lý tồn kho, nhập xuất kho, kiểm kê và báo cáo kho</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* Tổng quan tồn kho */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Package className="w-5 h-5 text-blue-600 mr-2" />
              Tồn kho
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng SP</span>
                <span className="text-lg font-bold text-blue-600">{inventoryData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Cảnh báo</span>
                <span className="text-lg font-bold text-red-600">
                  {inventoryData.filter(item => item.trangThai === 'Cảnh báo').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan nhập kho */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <ArrowDown className="w-5 h-5 text-green-600 mr-2" />
              Nhập kho
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng phiếu</span>
                <span className="text-lg font-bold text-green-600">{inboundData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đã nhập</span>
                <span className="text-lg font-bold text-blue-600">
                  {inboundData.filter(item => item.trangThai === 'Đã nhập').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan xuất kho */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <ArrowUp className="w-5 h-5 text-purple-600 mr-2" />
              Xuất kho
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng phiếu</span>
                <span className="text-lg font-bold text-purple-600">{outboundData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đã xuất</span>
                <span className="text-lg font-bold text-green-600">
                  {outboundData.filter(item => item.trangThai === 'Đã xuất').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan kiểm kê */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <ClipboardCheck className="w-5 h-5 text-orange-600 mr-2" />
              Kiểm kê
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Lần kiểm kê</span>
                <span className="text-lg font-bold text-orange-600">{auditData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Độ chính xác</span>
                <span className="text-lg font-bold text-green-600">
                  {auditData.length > 0 ? `${Math.round(auditData.reduce((acc, item) => acc + item.tyLeChinhXac, 0) / auditData.length)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan giá trị */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 text-cyan-600 mr-2" />
              Giá trị kho
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-cyan-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng giá trị</span>
                <span className="text-lg font-bold text-cyan-600">
                  {reportData.length > 0 ? `${(reportData[0].tongGiaTriTon / 1000000000).toFixed(1)}B` : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Vòng quay</span>
                <span className="text-lg font-bold text-green-600">
                  {reportData.length > 0 ? `${reportData[0].vongQuayKho}` : '0'}
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

        {/* Action Bar */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
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
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                <Plus className="h-4 w-4" />
                Thêm mới
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* QUẢN LÝ KHO */}
          {activeTab === 'warehouseManagement' && (
            <WarehouseManagement />
          )}

          {/* TỒN KHO */}
          {activeTab === 'inventory' && (
            <WarehouseInventoryManagement />
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

          {/* KIỂM KÊ KHO */}
          {activeTab === 'audit' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã kiểm kê</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày kiểm kê</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khu vực</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng SP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khớp số</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Độ chính xác</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị lệch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maKiemKe}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          {item.ngayKiemKe}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.khuVucKiemKe}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium">{item.tongSanPham}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium text-green-600">{item.sanPhamKhopSo}</div>
                          <div className="text-xs text-red-500">Lệch: {item.sanPhamLech}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-bold ${item.tyLeChinhXac >= 95 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.tyLeChinhXac}%
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-medium ${item.giaTriLech === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.giaTriLech === 0 ? '0' : `${(item.giaTriLech / 1000000).toFixed(0)}M`} VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Hoàn thành' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
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
                          <button className="text-green-600 hover:text-green-800" title="Xuất báo cáo">
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

          {/* BÁO CÁO KHO */}
          {activeTab === 'reports' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị tồn</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhập kho</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Xuất kho</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vòng quay</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hiệu suất</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tỷ lệ hao hụt</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chi phí</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.thang}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-bold text-green-600">
                          {(item.tongGiaTriTon / 1000000000).toFixed(1)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{(item.soLuongNhap / 1000).toFixed(0)}K kg</div>
                          <div className="text-xs text-gray-500">{(item.giaTriNhap / 1000000000).toFixed(1)}B VNĐ</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{(item.soLuongXuat / 1000).toFixed(0)}K kg</div>
                          <div className="text-xs text-gray-500">{(item.giaTriXuat / 1000000000).toFixed(1)}B VNĐ</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-blue-600">{item.vongQuayKho}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-purple-600">{item.hieuSuatKho}%</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-medium ${item.tyLeHaoHut <= 1.5 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.tyLeHaoHut}%
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-orange-600">
                          {(item.chiPhiLuuKho / 1000000).toFixed(0)}M VNĐ
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
                          <button className="text-green-600 hover:text-green-800" title="Xuất báo cáo">
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
