import React, { useState } from 'react';
import {
  Users,
  Building2,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  Star,
  Truck
} from 'lucide-react';

const GeneralPartners = () => {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers' | 'logistics'>('customers');

  // Dữ liệu mẫu cho khách hàng
  const customerData = [
    {
      id: 1,
      maKhachHang: 'KH001',
      tenKhachHang: 'Công ty TNHH ABC Foods',
      loaiKhachHang: 'Doanh nghiệp',
      quocGia: 'Việt Nam',
      thanhPho: 'TP. Hồ Chí Minh',
      diaChi: '123 Nguyễn Văn Linh, Q.7',
      nguoiLienHe: 'Nguyễn Văn A',
      soDienThoai: '+84 901 234 567',
      email: 'contact@abcfoods.com',
      website: 'www.abcfoods.com',
      maSoThue: '0123456789',
      ngayHopTac: '2023-01-15',
      trangThai: 'Đang hợp tác',
      mucDoUuTien: 'Cao',
      giaTriHopDong: 2500000000,
      soLuongDonHang: 45,
      danhGia: 4.8,
      ghiChu: 'Khách hàng VIP, thanh toán đúng hạn'
    },
    {
      id: 2,
      maKhachHang: 'KH002',
      tenKhachHang: 'XYZ International Trading',
      loaiKhachHang: 'Xuất khẩu',
      quocGia: 'Nhật Bản',
      thanhPho: 'Tokyo',
      diaChi: '456 Shibuya District',
      nguoiLienHe: 'Tanaka Hiroshi',
      soDienThoai: '+81 3 1234 5678',
      email: 'hiroshi@xyztrading.jp',
      website: 'www.xyztrading.jp',
      maSoThue: 'JP987654321',
      ngayHopTac: '2023-03-20',
      trangThai: 'Đang hợp tác',
      mucDoUuTien: 'Trung bình',
      giaTriHopDong: 5800000000,
      soLuongDonHang: 28,
      danhGia: 4.5,
      ghiChu: 'Yêu cầu chứng nhận organic'
    }
  ];

  // Dữ liệu mẫu cho nhà cung cấp
  const supplierData = [
    {
      id: 1,
      maNhaCungCap: 'NCC001',
      tenNhaCungCap: 'Công ty Nông sản Đồng Tháp',
      loaiNhaCungCap: 'Nguyên liệu',
      sanPhamCungCap: 'Khoai tây tươi, Cà rốt',
      quocGia: 'Việt Nam',
      thanhPho: 'Đồng Tháp',
      diaChi: '789 Quốc lộ 80, Cao Lãnh',
      nguoiLienHe: 'Trần Văn B',
      soDienThoai: '+84 902 345 678',
      email: 'sales@dongthapfarm.com',
      website: 'www.dongthapfarm.com',
      maSoThue: '0987654321',
      ngayHopTac: '2022-08-10',
      trangThai: 'Đang hợp tác',
      mucDoUuTien: 'Cao',
      giaTriHopDong: 1200000000,
      soLuongDonHang: 156,
      danhGia: 4.7,
      chungNhan: 'VietGAP, GlobalGAP',
      ghiChu: 'Chất lượng ổn định, giao hàng đúng hẹn'
    },
    {
      id: 2,
      maNhaCungCap: 'NCC002',
      tenNhaCungCap: 'Bao bì Minh Phát',
      loaiNhaCungCap: 'Bao bì',
      sanPhamCungCap: 'Túi PA/PE, Hộp carton',
      quocGia: 'Việt Nam',
      thanhPho: 'Bình Dương',
      diaChi: '321 KCN Việt Hương, Thuận An',
      nguoiLienHe: 'Lê Thị C',
      soDienThoai: '+84 903 456 789',
      email: 'info@minhphatpack.com',
      website: 'www.minhphatpack.com',
      maSoThue: '0456789123',
      ngayHopTac: '2023-02-05',
      trangThai: 'Đang hợp tác',
      mucDoUuTien: 'Trung bình',
      giaTriHopDong: 800000000,
      soLuongDonHang: 89,
      danhGia: 4.3,
      chungNhan: 'ISO 9001, FSC',
      ghiChu: 'Thiết kế bao bì đẹp, giá cạnh tranh'
    }
  ];

  // Dữ liệu mẫu cho logistics
  const logisticsData = [
    {
      id: 1,
      maDichVu: 'DV001',
      tenCongTy: 'Vận tải Sài Gòn Express',
      loaiDichVu: 'Vận chuyển nội địa',
      phamViHoatDong: 'Toàn quốc',
      quocGia: 'Việt Nam',
      thanhPho: 'TP. Hồ Chí Minh',
      diaChi: '555 Xa lộ Hà Nội, Q.9',
      nguoiLienHe: 'Phạm Văn D',
      soDienThoai: '+84 904 567 890',
      email: 'logistics@sgexpress.com',
      website: 'www.sgexpress.com',
      maSoThue: '0789123456',
      ngayHopTac: '2022-12-01',
      trangThai: 'Đang hợp tác',
      mucDoUuTien: 'Cao',
      giaTriHopDong: 450000000,
      soLuongChuyen: 234,
      danhGia: 4.6,
      loaiXe: 'Container, Xe tải',
      ghiChu: 'Đội xe đông, giao hàng nhanh'
    },
    {
      id: 2,
      maDichVu: 'DV002',
      tenCongTy: 'Ocean Freight Solutions',
      loaiDichVu: 'Vận chuyển quốc tế',
      phamViHoatDong: 'Châu Á - Thái Bình Dương',
      quocGia: 'Singapore',
      thanhPho: 'Singapore',
      diaChi: '88 Marina Bay Street',
      nguoiLienHe: 'David Chen',
      soDienThoai: '+65 6123 4567',
      email: 'david@oceanfreight.sg',
      website: 'www.oceanfreight.sg',
      maSoThue: 'SG123456789',
      ngayHopTac: '2023-05-15',
      trangThai: 'Đang hợp tác',
      mucDoUuTien: 'Cao',
      giaTriHopDong: 1800000000,
      soLuongChuyen: 67,
      danhGia: 4.8,
      loaiXe: 'Container 20ft, 40ft',
      ghiChu: 'Chuyên tuyến Việt Nam - Nhật Bản'
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
    { id: 'customers', name: 'Khách hàng', icon: <Users className="w-4 h-4" /> },
    { id: 'suppliers', name: 'Nhà cung cấp', icon: <Building2 className="w-4 h-4" /> },
    { id: 'logistics', name: 'Logistics', icon: <Truck className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            Phòng chăm sóc đối tác
          </h1>
          <p className="text-gray-600">Quản lý khách hàng, nhà cung cấp và dịch vụ logistics</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Tổng quan khách hàng */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              Tổng quan khách hàng
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng khách hàng</span>
                <span className="text-lg font-bold text-blue-600">{customerData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang hợp tác</span>
                <span className="text-lg font-bold text-green-600">
                  {customerData.filter(item => item.trangThai === 'Đang hợp tác').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Khách hàng VIP</span>
                <span className="text-lg font-bold text-purple-600">
                  {customerData.filter(item => item.mucDoUuTien === 'Cao').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan nhà cung cấp */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Building2 className="w-5 h-5 text-green-600 mr-2" />
              Tổng quan nhà cung cấp
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng NCC</span>
                <span className="text-lg font-bold text-green-600">{supplierData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">NCC nguyên liệu</span>
                <span className="text-lg font-bold text-blue-600">
                  {supplierData.filter(item => item.loaiNhaCungCap === 'Nguyên liệu').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">NCC bao bì</span>
                <span className="text-lg font-bold text-yellow-600">
                  {supplierData.filter(item => item.loaiNhaCungCap === 'Bao bì').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan logistics */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Truck className="w-5 h-5 text-purple-600 mr-2" />
              Tổng quan logistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng đối tác</span>
                <span className="text-lg font-bold text-purple-600">{logisticsData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Vận chuyển nội địa</span>
                <span className="text-lg font-bold text-blue-600">
                  {logisticsData.filter(item => item.loaiDichVu === 'Vận chuyển nội địa').length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Vận chuyển quốc tế</span>
                <span className="text-lg font-bold text-green-600">
                  {logisticsData.filter(item => item.loaiDichVu === 'Vận chuyển quốc tế').length}
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
                  placeholder="Tìm kiếm đối tác..."
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
          {/* KHÁCH HÀNG */}
          {activeTab === 'customers' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã KH</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên khách hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại KH</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quốc gia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người liên hệ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điện thoại</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đánh giá</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customerData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maKhachHang}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.tenKhachHang}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.loaiKhachHang === 'Doanh nghiệp' ? 'bg-blue-100 text-blue-800' :
                          item.loaiKhachHang === 'Xuất khẩu' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.loaiKhachHang}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.quocGia}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.nguoiLienHe}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.soDienThoai}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đang hợp tác' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.trangThai}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span>{item.danhGia}</span>
                        </div>
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
                          <button className="text-red-600 hover:text-red-800" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* NHÀ CUNG CẤP */}
          {activeTab === 'suppliers' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NCC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên nhà cung cấp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại NCC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quốc gia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người liên hệ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đánh giá</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supplierData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maNhaCungCap}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.tenNhaCungCap}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.loaiNhaCungCap === 'Nguyên liệu' ? 'bg-green-100 text-green-800' :
                          item.loaiNhaCungCap === 'Bao bì' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.loaiNhaCungCap}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.sanPhamCungCap}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.quocGia}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.nguoiLienHe}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đang hợp tác' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.trangThai}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span>{item.danhGia}</span>
                        </div>
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
                          <button className="text-red-600 hover:text-red-800" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* LOGISTICS */}
          {activeTab === 'logistics' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã DV</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên công ty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại dịch vụ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phạm vi</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quốc gia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người liên hệ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đánh giá</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logisticsData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maDichVu}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.tenCongTy}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.loaiDichVu === 'Vận chuyển nội địa' ? 'bg-blue-100 text-blue-800' :
                          item.loaiDichVu === 'Vận chuyển quốc tế' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.loaiDichVu}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.phamViHoatDong}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.quocGia}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.nguoiLienHe}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đang hợp tác' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.trangThai}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span>{item.danhGia}</span>
                        </div>
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
                          <button className="text-red-600 hover:text-red-800" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneralPartners;
