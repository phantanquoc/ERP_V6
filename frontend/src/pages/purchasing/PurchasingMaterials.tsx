import React, { useState } from 'react';
import {
  ShoppingCart,
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
  ClipboardList
} from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';

const PurchasingMaterials = () => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'purchaseOrders' | 'orderList' | 'contracts' | 'reports'>('suppliers');

  // Dữ liệu mẫu cho NHÀ CUNG CẤP NVL
  const supplierData = [
    {
      id: 1,
      maNhaCungCap: 'NCC-NVL001',
      tenCongTy: 'Công ty TNHH Thủy sản Miền Nam',
      nguoiLienHe: 'Nguyễn Văn An',
      chucVu: 'Giám đốc kinh doanh',
      soDienThoai: '028-3822-1234',
      email: 'sales@thuysanmiennam.com',
      diaChi: '123 Nguyễn Văn Linh, Q.7, TP.HCM',
      maSoThue: '0123456789',
      loaiNguyenLieu: 'Thủy sản tươi sống',
      danhGia: 4.5,
      trangThai: 'Hoạt động',
      ngayHopTac: '2022-01-15',
      tongGiaTriMua: 2500000000,
      soLuongDonHang: 48,
      ghiChu: 'Nhà cung cấp uy tín, chất lượng tốt'
    },
    {
      id: 2,
      maNhaCungCap: 'NCC-NVL002',
      tenCongTy: 'Trang trại Organic Đà Lạt',
      nguoiLienHe: 'Trần Thị Bình',
      chucVu: 'Trưởng phòng kinh doanh',
      soDienThoai: '0263-3512-789',
      email: 'info@organicdalat.vn',
      diaChi: '456 Trần Hưng Đạo, Đà Lạt, Lâm Đồng',
      maSoThue: '0987654321',
      loaiNguyenLieu: 'Rau củ quả organic',
      danhGia: 4.8,
      trangThai: 'Hoạt động',
      ngayHopTac: '2021-08-20',
      tongGiaTriMua: 1800000000,
      soLuongDonHang: 36,
      ghiChu: 'Sản phẩm organic chất lượng cao'
    }
  ];

  // Dữ liệu mẫu cho ĐỚN HÀNG MUA NVL
  const orderData = [
    {
      id: 1,
      maDonHang: 'DH-NVL2024001',
      maNhaCungCap: 'NCC-NVL001',
      tenNhaCungCap: 'Công ty TNHH Thủy sản Miền Nam',
      ngayDatHang: '2024-03-15',
      ngayGiaoHang: '2024-03-17',
      trangThai: 'Đã giao',
      tongGiaTri: 125000000,
      phuongThucThanhToan: 'Chuyển khoản',
      dieuKienThanhToan: '30 ngày',
      sanPham: 'Tôm sú tươi size 20-30',
      soLuong: 2500,
      donVi: 'kg',
      donGia: 50000,
      nhanVienPhuTrach: 'Lê Văn Cường',
      ghiChu: 'Giao hàng đúng hạn, chất lượng tốt'
    },
    {
      id: 2,
      maDonHang: 'DH-NVL2024002',
      maNhaCungCap: 'NCC-NVL002',
      tenNhaCungCap: 'Trang trại Organic Đà Lạt',
      ngayDatHang: '2024-03-18',
      ngayGiaoHang: '2024-03-20',
      trangThai: 'Đang vận chuyển',
      tongGiaTri: 89000000,
      phuongThucThanhToan: 'Tiền mặt',
      dieuKienThanhToan: 'Thanh toán khi giao',
      sanPham: 'Rau củ quả organic hỗn hợp',
      soLuong: 1800,
      donVi: 'kg',
      donGia: 49444,
      nhanVienPhuTrach: 'Phạm Thị Dung',
      ghiChu: 'Yêu cầu kiểm tra chất lượng kỹ'
    }
  ];

  // Dữ liệu mẫu cho HỢP ĐỒNG MUA NVL
  const contractData = [
    {
      id: 1,
      maHopDong: 'HD-NVL001',
      tenHopDong: 'Hợp đồng cung cấp thủy sản tươi sống 2024',
      maNhaCungCap: 'NCC-NVL001',
      tenNhaCungCap: 'Công ty TNHH Thủy sản Miền Nam',
      ngayKyKet: '2024-01-01',
      ngayBatDau: '2024-01-15',
      ngayKetThuc: '2024-12-31',
      giaTriHopDong: 3000000000,
      trangThai: 'Đang thực hiện',
      loaiHopDong: 'Dài hạn',
      dieuKienThanhToan: 'Chuyển khoản 30 ngày',
      sanPhamChinh: 'Thủy sản tươi sống các loại',
      soLuongCamKet: 60000,
      donVi: 'kg/năm',
      ghiChu: 'Hợp đồng khung năm 2024'
    },
    {
      id: 2,
      maHopDong: 'HD-NVL002',
      tenHopDong: 'Hợp đồng cung cấp rau củ organic Q1/2024',
      maNhaCungCap: 'NCC-NVL002',
      tenNhaCungCap: 'Trang trại Organic Đà Lạt',
      ngayKyKet: '2024-02-15',
      ngayBatDau: '2024-03-01',
      ngayKetThuc: '2024-05-31',
      giaTriHopDong: 450000000,
      trangThai: 'Đang thực hiện',
      loaiHopDong: 'Ngắn hạn',
      dieuKienThanhToan: 'Tiền mặt khi giao',
      sanPhamChinh: 'Rau củ quả organic',
      soLuongCamKet: 9000,
      donVi: 'kg/quý',
      ghiChu: 'Ưu tiên sản phẩm organic'
    }
  ];

  // Dữ liệu mẫu cho BÁO CÁO CHI PHÍ NVL
  const reportData = [
    {
      id: 1,
      thang: 'Tháng 1/2024',
      soLuongDonHang: 12,
      tongChiPhi: 1800000000,
      chiPhiThuysan: 1200000000,
      chiPhiRauCu: 400000000,
      chiPhiKhac: 200000000,
      nhaCungCapChinh: 'Công ty TNHH Thủy sản Miền Nam',
      sanPhamChiPhiCao: 'Tôm sú tươi',
      tyLeTangTruong: 15.5,
      tiLeTietKiem: 8.2,
      ghiChu: 'Chi phí tăng do giá thủy sản tăng'
    },
    {
      id: 2,
      thang: 'Tháng 2/2024',
      soLuongDonHang: 18,
      tongChiPhi: 2200000000,
      chiPhiThuysan: 1500000000,
      chiPhiRauCu: 500000000,
      chiPhiKhac: 200000000,
      nhaCungCapChinh: 'Trang trại Organic Đà Lạt',
      sanPhamChiPhiCao: 'Rau củ organic',
      tyLeTangTruong: 22.2,
      tiLeTietKiem: 5.8,
      ghiChu: 'Tăng mua rau củ organic'
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
    { id: 'suppliers', name: 'Nhà cung cấp NVL', icon: <Users className="w-4 h-4" /> },
    { id: 'purchaseOrders', name: 'Đơn hàng mua NVL', icon: <Package className="w-4 h-4" /> },
    { id: 'orderList', name: 'Danh sách đơn hàng', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'contracts', name: 'Hợp đồng mua NVL', icon: <FileText className="w-4 h-4" /> },
    { id: 'reports', name: 'Báo cáo chi phí', icon: <TrendingUp className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <ShoppingCart className="w-8 h-8 text-green-600 mr-3" />
            Phòng thu mua NVL
          </h1>
          <p className="text-gray-600">Quản lý nhà cung cấp, đơn hàng mua, hợp đồng và chi phí nguyên vật liệu</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Tổng quan nhà cung cấp */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              Nhà cung cấp NVL
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
              Đơn hàng mua NVL
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
              Hợp đồng mua NVL
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

          {/* Tổng quan chi phí */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 text-orange-600 mr-2" />
              Chi phí NVL
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tháng này</span>
                <span className="text-lg font-bold text-orange-600">
                  {reportData.length > 0 ? `${(reportData[reportData.length - 1].tongChiPhi / 1000000000).toFixed(1)}B` : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tăng trưởng</span>
                <span className="text-lg font-bold text-green-600">
                  {reportData.length > 0 ? `+${reportData[reportData.length - 1].tyLeTangTruong}%` : '0%'}
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

        {/* Action Bar - Hide for orderList tab */}
        {activeTab !== 'orderList' && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
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
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                  <Plus className="h-4 w-4" />
                  Thêm mới
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* NHÀ CUNG CẤP NVL */}
          {activeTab === 'suppliers' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NCC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên công ty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người liên hệ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại NVL</th>
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
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.loaiNguyenLieu}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-1" />
                          <span className="font-medium">{item.danhGia}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-green-600">
                          {(item.tongGiaTriMua / 1000000000).toFixed(1)}B VNĐ
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

          {/* ĐƠN HÀNG MUA NVL */}
          {activeTab === 'purchaseOrders' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đơn hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhà cung cấp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày giao</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng giá trị</th>
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
                          <div className="font-medium">{item.sanPham}</div>
                          <div className="text-xs text-gray-500">
                            {(item.donGia / 1000).toFixed(0)}K VNĐ/{item.donVi}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium">{item.soLuong.toLocaleString()} {item.donVi}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          {item.ngayGiaoHang}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-bold text-green-600">
                          {(item.tongGiaTri / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đã giao' ? 'bg-green-100 text-green-800' :
                          item.trangThai === 'Đang vận chuyển' ? 'bg-blue-100 text-blue-800' :
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

          {/* DANH SÁCH ĐƠN HÀNG */}
          {activeTab === 'orderList' && (
            <div className="p-6">
              <OrderManagement hideHeader={true} />
            </div>
          )}

          {/* HỢP ĐỒNG MUA NVL */}
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
                          {(item.giaTriHopDong / 1000000000).toFixed(1)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.loaiHopDong === 'Dài hạn' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.loaiHopDong}
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

          {/* BÁO CÁO CHI PHÍ NVL */}
          {activeTab === 'reports' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số đơn hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng chi phí</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chi phí thủy sản</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chi phí rau củ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NCC chính</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tăng trưởng</th>
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
                          {(item.tongChiPhi / 1000000000).toFixed(1)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-blue-600">
                          {(item.chiPhiThuysan / 1000000000).toFixed(1)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-green-600">
                          {(item.chiPhiRauCu / 1000000000).toFixed(1)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{item.nhaCungCapChinh}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-bold ${item.tyLeTangTruong > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.tyLeTangTruong > 0 ? '+' : ''}{item.tyLeTangTruong}%
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
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
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

export default PurchasingMaterials;
