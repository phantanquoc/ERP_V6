import React, { useState } from 'react';
import {
  Settings,
  Users,
  FileText,
  TrendingUp,
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Star,
  Wrench,
  Zap
} from 'lucide-react';

const PurchasingEquipment = () => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders' | 'contracts' | 'reports'>('suppliers');

  // Dữ liệu mẫu cho NHÀ CUNG CẤP THIẾT BỊ
  const supplierData = [
    {
      id: 1,
      maNhaCungCap: 'NCC-TB001',
      tenCongTy: 'Công ty TNHH Thiết bị Công nghiệp Việt Nam',
      nguoiLienHe: 'Lê Văn Cường',
      chucVu: 'Giám đốc kỹ thuật',
      soDienThoai: '028-3845-6789',
      email: 'technical@vietequip.com',
      diaChi: '789 Lê Văn Việt, Q.9, TP.HCM',
      maSoThue: '0345678901',
      loaiThietBi: 'Máy móc sản xuất',
      danhGia: 4.7,
      trangThai: 'Hoạt động',
      ngayHopTac: '2021-03-10',
      tongGiaTriMua: 15000000000,
      soLuongDonHang: 24,
      ghiChu: 'Chuyên cung cấp thiết bị chế biến thủy sản'
    },
    {
      id: 2,
      maNhaCungCap: 'NCC-TB002',
      tenCongTy: 'Tập đoàn Thiết bị Lạnh Đông Nam Á',
      nguoiLienHe: 'Nguyễn Thị Mai',
      chucVu: 'Trưởng phòng kinh doanh',
      soDienThoai: '024-3567-8901',
      email: 'sales@seacooling.vn',
      diaChi: '456 Giải Phóng, Hai Bà Trưng, Hà Nội',
      maSoThue: '0567890123',
      loaiThietBi: 'Hệ thống làm lạnh',
      danhGia: 4.9,
      trangThai: 'Hoạt động',
      ngayHopTac: '2020-11-25',
      tongGiaTriMua: 25000000000,
      soLuongDonHang: 18,
      ghiChu: 'Hệ thống làm lạnh công nghiệp chất lượng cao'
    }
  ];

  // Dữ liệu mẫu cho ĐƠN HÀNG MUA THIẾT BỊ
  const orderData = [
    {
      id: 1,
      maDonHang: 'DH-TB2024001',
      maNhaCungCap: 'NCC-TB001',
      tenNhaCungCap: 'Công ty TNHH Thiết bị Công nghiệp Việt Nam',
      ngayDatHang: '2024-02-15',
      ngayGiaoHang: '2024-04-15',
      trangThai: 'Đang sản xuất',
      tongGiaTri: 2500000000,
      phuongThucThanhToan: 'Chuyển khoản',
      dieuKienThanhToan: 'Trả trước 30%, còn lại khi giao',
      tenThietBi: 'Dây chuyền chế biến tôm tự động',
      soLuong: 1,
      donVi: 'bộ',
      donGia: 2500000000,
      nhanVienPhuTrach: 'Trần Văn Đức',
      baoHanh: '24 tháng',
      ghiChu: 'Thiết bị nhập khẩu từ Nhật Bản'
    },
    {
      id: 2,
      maDonHang: 'DH-TB2024002',
      maNhaCungCap: 'NCC-TB002',
      tenNhaCungCap: 'Tập đoàn Thiết bị Lạnh Đông Nam Á',
      ngayDatHang: '2024-03-01',
      ngayGiaoHang: '2024-03-30',
      trangThai: 'Đã giao',
      tongGiaTri: 1800000000,
      phuongThucThanhToan: 'Chuyển khoản',
      dieuKienThanhToan: '45 ngày',
      tenThietBi: 'Hệ thống làm lạnh công nghiệp 500HP',
      soLuong: 2,
      donVi: 'bộ',
      donGia: 900000000,
      nhanVienPhuTrach: 'Phạm Thị Lan',
      baoHanh: '36 tháng',
      ghiChu: 'Lắp đặt và vận hành thử nghiệm'
    }
  ];

  // Dữ liệu mẫu cho HỢP ĐỒNG MUA THIẾT BỊ
  const contractData = [
    {
      id: 1,
      maHopDong: 'HD-TB001',
      tenHopDong: 'Hợp đồng cung cấp thiết bị chế biến 2024-2026',
      maNhaCungCap: 'NCC-TB001',
      tenNhaCungCap: 'Công ty TNHH Thiết bị Công nghiệp Việt Nam',
      ngayKyKet: '2024-01-15',
      ngayBatDau: '2024-02-01',
      ngayKetThuc: '2026-01-31',
      giaTriHopDong: 50000000000,
      trangThai: 'Đang thực hiện',
      loaiHopDong: 'Dài hạn',
      dieuKienThanhToan: 'Trả góp theo tiến độ',
      thietBiChinh: 'Dây chuyền chế biến thủy sản',
      soLuongCamKet: 5,
      donVi: 'dây chuyền',
      baoHanh: '60 tháng',
      ghiChu: 'Bao gồm lắp đặt và đào tạo vận hành'
    },
    {
      id: 2,
      maHopDong: 'HD-TB002',
      tenHopDong: 'Hợp đồng bảo trì thiết bị làm lạnh 2024',
      maNhaCungCap: 'NCC-TB002',
      tenNhaCungCap: 'Tập đoàn Thiết bị Lạnh Đông Nam Á',
      ngayKyKet: '2024-01-01',
      ngayBatDau: '2024-01-01',
      ngayKetThuc: '2024-12-31',
      giaTriHopDong: 2400000000,
      trangThai: 'Đang thực hiện',
      loaiHopDong: 'Bảo trì',
      dieuKienThanhToan: 'Thanh toán hàng quý',
      thietBiChinh: 'Hệ thống làm lạnh toàn nhà máy',
      soLuongCamKet: 12,
      donVi: 'lần bảo trì',
      baoHanh: 'Theo hợp đồng',
      ghiChu: 'Bảo trì định kỳ và sửa chữa khẩn cấp'
    }
  ];

  // Dữ liệu mẫu cho BÁO CÁO ĐẦU TƯ THIẾT BỊ
  const reportData = [
    {
      id: 1,
      thang: 'Quý 1/2024',
      soLuongDonHang: 8,
      tongDauTu: 12000000000,
      dauTuMayMoc: 8000000000,
      dauTuLamLanh: 3000000000,
      dauTuKhac: 1000000000,
      nhaCungCapChinh: 'Công ty TNHH Thiết bị Công nghiệp Việt Nam',
      thietBiDauTuLon: 'Dây chuyền chế biến tôm',
      tyLeTangTruong: 25.5,
      hieuQuaSuDung: 92.5,
      ghiChu: 'Đầu tư mở rộng dây chuyền sản xuất'
    },
    {
      id: 2,
      thang: 'Quý 4/2023',
      soLuongDonHang: 6,
      tongDauTu: 9600000000,
      dauTuMayMoc: 5000000000,
      dauTuLamLanh: 3600000000,
      dauTuKhac: 1000000000,
      nhaCungCapChinh: 'Tập đoàn Thiết bị Lạnh Đông Nam Á',
      thietBiDauTuLon: 'Hệ thống làm lạnh',
      tyLeTangTruong: 18.2,
      hieuQuaSuDung: 88.7,
      ghiChu: 'Nâng cấp hệ thống làm lạnh'
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
    { id: 'suppliers', name: 'Nhà cung cấp TB', icon: <Users className="w-4 h-4" />, count: supplierData.length },
    { id: 'orders', name: 'Đơn hàng mua TB', icon: <Package className="w-4 h-4" />, count: orderData.length },
    { id: 'contracts', name: 'Hợp đồng mua TB', icon: <FileText className="w-4 h-4" />, count: contractData.length },
    { id: 'reports', name: 'Báo cáo đầu tư', icon: <TrendingUp className="w-4 h-4" />, count: reportData.length }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Settings className="w-8 h-8 text-purple-600 mr-3" />
            Phòng mua Thiết bị
          </h1>
          <p className="text-gray-600">Quản lý nhà cung cấp, đơn hàng mua, hợp đồng và đầu tư thiết bị máy móc</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Tổng quan nhà cung cấp */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              Nhà cung cấp TB
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng NCC</span>
                <span className="text-lg font-bold text-blue-600">{supplierData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang hoạt động</span>
                <span className="text-lg font-bold text-green-600">
                  {supplierData.filter(item => item.trangThai === 'Hoạt động').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan đơn hàng */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Package className="w-5 h-5 text-green-600 mr-2" />
              Đơn hàng mua TB
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng đơn hàng</span>
                <span className="text-lg font-bold text-green-600">{orderData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đã giao</span>
                <span className="text-lg font-bold text-blue-600">
                  {orderData.filter(item => item.trangThai === 'Đã giao').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan hợp đồng */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 text-purple-600 mr-2" />
              Hợp đồng mua TB
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng hợp đồng</span>
                <span className="text-lg font-bold text-purple-600">{contractData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang thực hiện</span>
                <span className="text-lg font-bold text-green-600">
                  {contractData.filter(item => item.trangThai === 'Đang thực hiện').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan đầu tư */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 text-orange-600 mr-2" />
              Đầu tư thiết bị
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Quý này</span>
                <span className="text-lg font-bold text-orange-600">
                  {reportData.length > 0 ? `${(reportData[0].tongDauTu / 1000000000).toFixed(0)}B` : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Hiệu quả</span>
                <span className="text-lg font-bold text-green-600">
                  {reportData.length > 0 ? `${reportData[0].hieuQuaSuDung}%` : '0%'}
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
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.name}
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
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
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <Filter className="h-4 w-4" />
                Lọc
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Download className="h-4 w-4" />
                Xuất Excel
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                <Plus className="h-4 w-4" />
                Thêm mới
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* NHÀ CUNG CẤP THIẾT BỊ */}
          {activeTab === 'suppliers' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NCC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên công ty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người liên hệ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại thiết bị</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đánh giá</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng giá trị</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supplierData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maNhaCungCap}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">{item.tenCongTy}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.nguoiLienHe}</div>
                          <div className="text-xs text-gray-500 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {item.soDienThoai}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.loaiThietBi === 'Máy móc sản xuất' ? 'bg-blue-100 text-blue-800' :
                          item.loaiThietBi === 'Hệ thống làm lạnh' ? 'bg-cyan-100 text-cyan-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {item.loaiThietBi}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span className="font-medium">{item.danhGia}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-green-600">
                          {(item.tongGiaTriMua / 1000000000).toFixed(0)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Hoạt động' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
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

          {/* ĐƠN HÀNG MUA THIẾT BỊ */}
          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đơn hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhà cung cấp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên thiết bị</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày giao</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng giá trị</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bảo hành</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orderData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maDonHang}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{item.tenNhaCungCap}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                        <div>
                          <div className="font-medium">{item.tenThietBi}</div>
                          <div className="text-xs text-gray-500 flex items-center">
                            <Wrench className="w-3 h-3 mr-1" />
                            {(item.donGia / 1000000000).toFixed(1)}B VNĐ/{item.donVi}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium">{item.soLuong} {item.donVi}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          {item.ngayGiaoHang}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-bold text-green-600">
                          {(item.tongGiaTri / 1000000000).toFixed(1)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {item.baoHanh}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đã giao' ? 'bg-green-100 text-green-800' :
                          item.trangThai === 'Đang sản xuất' ? 'bg-blue-100 text-blue-800' :
                          item.trangThai === 'Chờ xử lý' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
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
                          <button className="text-purple-600 hover:text-purple-800" title="In đơn hàng">
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

          {/* HỢP ĐỒNG MUA THIẾT BỊ */}
          {activeTab === 'contracts' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã hợp đồng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên hợp đồng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhà cung cấp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời hạn</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại HĐ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bảo hành</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contractData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maHopDong}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">{item.tenHopDong}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{item.tenNhaCungCap}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {item.ngayBatDau}
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {item.ngayKetThuc}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-bold text-green-600">
                          {(item.giaTriHopDong / 1000000000).toFixed(0)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.loaiHopDong === 'Dài hạn' ? 'bg-blue-100 text-blue-800' :
                          item.loaiHopDong === 'Bảo trì' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.loaiHopDong}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          {item.baoHanh}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đang thực hiện' ? 'bg-green-100 text-green-800' :
                          item.trangThai === 'Hoàn thành' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
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
                          <button className="text-purple-600 hover:text-purple-800" title="In hợp đồng">
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

          {/* BÁO CÁO ĐẦU TƯ THIẾT BỊ */}
          {activeTab === 'reports' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số đơn hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng đầu tư</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đầu tư máy móc</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đầu tư làm lạnh</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NCC chính</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tăng trưởng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hiệu quả</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.thang}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium">{item.soLuongDonHang}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-bold text-red-600">
                          {(item.tongDauTu / 1000000000).toFixed(0)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-blue-600">
                          {(item.dauTuMayMoc / 1000000000).toFixed(0)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-cyan-600">
                          {(item.dauTuLamLanh / 1000000000).toFixed(0)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{item.nhaCungCapChinh}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-bold ${item.tyLeTangTruong > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.tyLeTangTruong > 0 ? '+' : ''}{item.tyLeTangTruong}%
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Zap className="w-4 h-4 text-green-400 mr-1" />
                          <span className="font-bold text-green-600">{item.hieuQuaSuDung}%</span>
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
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
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

export default PurchasingEquipment;
