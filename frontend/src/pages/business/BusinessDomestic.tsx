import React, { useState } from 'react';
import {
  Home,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  MapPin,
  Calendar,
  Package,
  Truck
} from 'lucide-react';
import DomesticCustomerManagement from '../../components/DomesticCustomerManagement';

const BusinessDomestic = () => {
  const [activeTab, setActiveTab] = useState<string>('customers');

  // Dữ liệu mẫu cho KHÁCH HÀNG NỘI ĐỊA
  const customerData = [
    {
      id: 1,
      maKhachHang: 'KH-ND001',
      tenCongTy: 'Công ty TNHH Thực phẩm Sài Gòn',
      nguoiLienHe: 'Nguyễn Văn An',
      tinhThanh: 'TP. Hồ Chí Minh',
      quanHuyen: 'Quận 1',
      diaChi: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      soDienThoai: '028-3822-1234',
      email: 'info@saigonfood.com.vn',
      website: 'www.saigonfood.com.vn',
      loaiKhachHang: 'Siêu thị',
      trangThai: 'Hoạt động',
      ngayHopTac: '2023-02-10',
      doanhThuNam: 8500000000,
      soLuongDonHang: 36,
      sanPhamChinh: 'Thực phẩm tươi sống',
      maSoThue: '0123456789',
      ghiChu: 'Khách hàng lớn, thanh toán đúng hạn'
    },
    {
      id: 2,
      maKhachHang: 'KH-ND002',
      tenCongTy: 'Chuỗi nhà hàng Hương Việt',
      nguoiLienHe: 'Trần Thị Bình',
      tinhThanh: 'Hà Nội',
      quanHuyen: 'Quận Hoàn Kiếm',
      diaChi: '456 Hoàng Kiếm, Quận Hoàn Kiếm, Hà Nội',
      soDienThoai: '024-3936-5678',
      email: 'contact@huongviet.vn',
      website: 'www.huongviet.vn',
      loaiKhachHang: 'Nhà hàng',
      trangThai: 'Hoạt động',
      ngayHopTac: '2022-11-15',
      doanhThuNam: 5200000000,
      soLuongDonHang: 48,
      sanPhamChinh: 'Hải sản tươi',
      maSoThue: '0987654321',
      ghiChu: 'Yêu cầu giao hàng sớm'
    }
  ];

  // Dữ liệu mẫu cho ĐỚN HÀNG NỘI ĐỊA
  const orderData = [
    {
      id: 1,
      maDonHang: 'DH-ND2024001',
      maKhachHang: 'KH-ND001',
      tenKhachHang: 'Công ty TNHH Thực phẩm Sài Gòn',
      tinhThanh: 'TP. Hồ Chí Minh',
      ngayDatHang: '2024-03-20',
      ngayGiaoHang: '2024-03-22',
      trangThai: 'Đang giao hàng',
      tongGiaTri: 125000000,
      phuongThucThanhToan: 'Chuyển khoản',
      hinhThucGiao: 'Giao tận nơi',
      diaChiGiao: '123 Nguyễn Huệ, Quận 1, TP.HCM',
      trongLuong: 2500,
      sanPham: 'Tôm sú tươi',
      nhanVienPhuTrach: 'Lê Văn Cường',
      phiVanChuyen: 500000,
      ghiChu: 'Giao hàng trong giờ hành chính'
    },
    {
      id: 2,
      maDonHang: 'DH-ND2024002',
      maKhachHang: 'KH-ND002',
      tenKhachHang: 'Chuỗi nhà hàng Hương Việt',
      tinhThanh: 'Hà Nội',
      ngayDatHang: '2024-03-18',
      ngayGiaoHang: '2024-03-20',
      trangThai: 'Đã giao',
      tongGiaTri: 89000000,
      phuongThucThanhToan: 'Tiền mặt',
      hinhThucGiao: 'Khách đến lấy',
      diaChiGiao: 'Kho An Bình Foods - KCN Thăng Long',
      trongLuong: 1800,
      sanPham: 'Cá tra fillet',
      nhanVienPhuTrach: 'Phạm Thị Dung',
      phiVanChuyen: 0,
      ghiChu: 'Khách tự đến lấy hàng'
    }
  ];

  // Dữ liệu mẫu cho HỢP ĐỒNG NỘI ĐỊA
  const contractData = [
    {
      id: 1,
      maHopDong: 'HD-ND001',
      tenHopDong: 'Hợp đồng cung cấp thực phẩm tươi sống 2024',
      maKhachHang: 'KH-ND001',
      tenKhachHang: 'Công ty TNHH Thực phẩm Sài Gòn',
      tinhThanh: 'TP. Hồ Chí Minh',
      ngayKyKet: '2024-01-05',
      ngayBatDau: '2024-01-15',
      ngayKetThuc: '2024-12-31',
      giaTriHopDong: 10000000000,
      trangThai: 'Đang thực hiện',
      loaiHopDong: 'Dài hạn',
      dieuKienThanhToan: 'Chuyển khoản 15 ngày',
      sanPhamChinh: 'Thực phẩm tươi sống các loại',
      soLuongCamKet: 50000,
      donVi: 'kg/tháng',
      maSoThue: '0123456789',
      ghiChu: 'Hợp đồng khung năm 2024'
    },
    {
      id: 2,
      maHopDong: 'HD-ND002',
      tenHopDong: 'Hợp đồng cung cấp hải sản Q1/2024',
      maKhachHang: 'KH-ND002',
      tenKhachHang: 'Chuỗi nhà hàng Hương Việt',
      tinhThanh: 'Hà Nội',
      ngayKyKet: '2024-02-20',
      ngayBatDau: '2024-03-01',
      ngayKetThuc: '2024-05-31',
      giaTriHopDong: 2500000000,
      trangThai: 'Đang thực hiện',
      loaiHopDong: 'Ngắn hạn',
      dieuKienThanhToan: 'Tiền mặt khi giao',
      sanPhamChinh: 'Hải sản tươi',
      soLuongCamKet: 5000,
      donVi: 'kg/tháng',
      maSoThue: '0987654321',
      ghiChu: 'Ưu tiên hải sản tươi sống'
    }
  ];

  // Dữ liệu mẫu cho BÁO CÁO DOANH THU
  const revenueData = [
    {
      id: 1,
      thang: 'Tháng 1/2024',
      soLuongDonHang: 15,
      doanhThuVND: 2800000000,
      khachHangMoi: 3,
      khachHangQuayLai: 12,
      sanPhamBanChay: 'Tôm sú tươi',
      tinhThanhLonNhat: 'TP. Hồ Chí Minh',
      tyLeTangTruong: 18.5,
      chiPhiVanChuyen: 45000000,
      loiNhuanGop: 420000000,
      ghiChu: 'Tăng trưởng mạnh trong tháng Tết'
    },
    {
      id: 2,
      thang: 'Tháng 2/2024',
      soLuongDonHang: 22,
      doanhThuVND: 3500000000,
      khachHangMoi: 2,
      khachHangQuayLai: 20,
      sanPhamBanChay: 'Cá tra fillet',
      tinhThanhLonNhat: 'Hà Nội',
      tyLeTangTruong: 25.0,
      chiPhiVanChuyen: 58000000,
      loiNhuanGop: 525000000,
      ghiChu: 'Vượt kế hoạch tháng'
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
    { id: 'customers', label: 'Khách hàng nội địa', icon: Users },
    { id: 'orders', label: 'Đơn hàng nội địa', icon: Package },
    { id: 'contracts', label: 'Hợp đồng', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Home className="w-8 h-8 text-green-600 mr-3" />
            Phòng KD Nội Địa
          </h1>
          <p className="text-gray-600">Quản lý khách hàng nội địa, đơn hàng trong nước và hợp đồng thương mại</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Tổng quan khách hàng */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              Khách hàng nội địa
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng khách hàng</span>
                <span className="text-lg font-bold text-blue-600">{customerData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang hoạt động</span>
                <span className="text-lg font-bold text-green-600">
                  {customerData.filter(item => item.trangThai === 'Hoạt động').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan đơn hàng */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Package className="w-5 h-5 text-green-600 mr-2" />
              Đơn hàng nội địa
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng đơn hàng</span>
                <span className="text-lg font-bold text-green-600">{orderData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang giao hàng</span>
                <span className="text-lg font-bold text-blue-600">
                  {orderData.filter(item => item.trangThai === 'Đang giao hàng').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan hợp đồng */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 text-yellow-600 mr-2" />
              Hợp đồng trong nước
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng hợp đồng</span>
                <span className="text-lg font-bold text-yellow-600">{contractData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang thực hiện</span>
                <span className="text-lg font-bold text-green-600">
                  {contractData.filter(item => item.trangThai === 'Đang thực hiện').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan doanh thu */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 text-purple-600 mr-2" />
              Doanh thu nội địa
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tháng này</span>
                <span className="text-lg font-bold text-purple-600">
                  {revenueData.length > 0 ? `${(revenueData[revenueData.length - 1].doanhThuVND / 1000000000).toFixed(1)}B` : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tăng trưởng</span>
                <span className="text-lg font-bold text-green-600">
                  {revenueData.length > 0 ? `+${revenueData[revenueData.length - 1].tyLeTangTruong}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs will be added here */}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* KHÁCH HÀNG NỘI ĐỊA */}
          {activeTab === 'customers' && (
            <div className="p-6">
              <DomesticCustomerManagement />
            </div>
          )}

          {/* ĐƠN HÀNG NỘI ĐỊA */}
          {activeTab === 'orders' && (
            <div className="p-6">
              <p className="text-gray-500">Quản lý đơn hàng nội địa (Coming soon...)</p>
            </div>
          )}

          {/* HỢP ĐỒNG */}
          {activeTab === 'contracts' && (
            <div className="p-6">
              <p className="text-gray-500">Quản lý hợp đồng (Coming soon...)</p>
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

export default BusinessDomestic;
