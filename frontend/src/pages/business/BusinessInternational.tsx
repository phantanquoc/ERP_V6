import React, { useState } from 'react';
import {
  Globe,
  Users,
  FileText,
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
  MessageCircle
} from 'lucide-react';
import InternationalCustomerManagement from '../../components/InternationalCustomerManagement';
import QuotationRequestManagement from '../../components/QuotationRequestManagement';
import QuotationManagement from '../../components/QuotationManagement';
import OrderManagement from '../../components/OrderManagement';
import CustomerFeedbackManagement from '../../components/CustomerFeedbackManagement';

const BusinessInternational = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'quotations' | 'quotationRequests' | 'customers' | 'feedback'>('quotationRequests');

  // Dữ liệu mẫu cho ĐỚN HÀNG XUẤT KHẨU
  const orderData = [
    {
      id: 1,
      maDonHang: 'EX-2024001',
      maKhachHang: 'KH-INT001',
      tenKhachHang: 'ABC Trading Co., Ltd',
      quocGia: 'United States',
      ngayDatHang: '2024-03-15',
      ngayGiaoHang: '2024-04-15',
      trangThai: 'Đang xử lý',
      tongGiaTri: 125000,
      donViTienTe: 'USD',
      phuongThucThanhToan: 'L/C',
      incoterms: 'FOB',
      cangXuatKhau: 'Cảng Sài Gòn',
      cangNhapKhau: 'Port of New York',
      soContainer: 2,
      trongLuong: 25000,
      sanPham: 'Tôm đông lạnh',
      ghiChu: 'Yêu cầu giao hàng đúng hạn'
    },
    {
      id: 2,
      maDonHang: 'EX-2024002',
      maKhachHang: 'KH-INT002',
      tenKhachHang: 'European Food Import GmbH',
      quocGia: 'Germany',
      ngayDatHang: '2024-03-10',
      ngayGiaoHang: '2024-04-10',
      trangThai: 'Đã xuất hàng',
      tongGiaTri: 89000,
      donViTienTe: 'EUR',
      phuongThucThanhToan: 'T/T',
      incoterms: 'CIF',
      cangXuatKhau: 'Cảng Hải Phòng',
      cangNhapKhau: 'Port of Hamburg',
      soContainer: 1,
      trongLuong: 18000,
      sanPham: 'Cá tra fillet',
      ghiChu: 'Đã có chứng nhận EU'
    }
  ];

  // Dữ liệu mẫu cho HỢP ĐỒNG QUỐC TẾ
  const contractData = [
    {
      id: 1,
      maHopDong: 'HD-INT001',
      tenHopDong: 'Hợp đồng cung cấp tôm đông lạnh 2024',
      maKhachHang: 'KH-INT001',
      tenKhachHang: 'ABC Trading Co., Ltd',
      quocGia: 'United States',
      ngayKyKet: '2024-01-01',
      ngayBatDau: '2024-01-15',
      ngayKetThuc: '2024-12-31',
      giaTriHopDong: 3000000,
      donViTienTe: 'USD',
      trangThai: 'Đang thực hiện',
      loaiHopDong: 'Dài hạn',
      dieuKienThanhToan: 'L/C 90 ngày',
      sanPhamChinh: 'Tôm đông lạnh các loại',
      soLuongCamKet: 500000,
      donVi: 'kg',
      ghiChu: 'Hợp đồng khung năm 2024'
    },
    {
      id: 2,
      maHopDong: 'HD-INT002',
      tenHopDong: 'Hợp đồng xuất khẩu cá tra Q1/2024',
      maKhachHang: 'KH-INT002',
      tenKhachHang: 'European Food Import GmbH',
      quocGia: 'Germany',
      ngayKyKet: '2024-02-15',
      ngayBatDau: '2024-03-01',
      ngayKetThuc: '2024-05-31',
      giaTriHopDong: 450000,
      donViTienTe: 'EUR',
      trangThai: 'Đang thực hiện',
      loaiHopDong: 'Ngắn hạn',
      dieuKienThanhToan: 'T/T 30 ngày',
      sanPhamChinh: 'Cá tra fillet',
      soLuongCamKet: 90000,
      donVi: 'kg',
      ghiChu: 'Yêu cầu chứng nhận EU'
    }
  ];

  // Dữ liệu mẫu cho BÁO CÁO DOANH THU
  const revenueData = [
    {
      id: 1,
      thang: 'Tháng 1/2024',
      soLuongDonHang: 8,
      doanhThuUSD: 450000,
      doanhThuEUR: 320000,
      doanhThuJPY: 15000000,
      tongDoanhThuVND: 12500000000,
      khachHangMoi: 2,
      khachHangQuayLai: 6,
      sanPhamBanChay: 'Tôm đông lạnh',
      quocGiaLonNhat: 'United States',
      tyLeTangTruong: 15.5,
      ghiChu: 'Tăng trưởng tốt so với cùng kỳ'
    },
    {
      id: 2,
      thang: 'Tháng 2/2024',
      soLuongDonHang: 12,
      doanhThuUSD: 680000,
      doanhThuEUR: 420000,
      doanhThuJPY: 22000000,
      tongDoanhThuVND: 18200000000,
      khachHangMoi: 1,
      khachHangQuayLai: 11,
      sanPhamBanChay: 'Cá tra fillet',
      quocGiaLonNhat: 'Germany',
      tyLeTangTruong: 22.3,
      ghiChu: 'Đạt kế hoạch tháng'
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
    { id: 'quotationRequests', name: 'Danh sách yêu cầu BG', icon: <FileText className="w-4 h-4" /> },
    { id: 'quotations', name: 'Danh sách BG', icon: <FileText className="w-4 h-4" /> },
    { id: 'orders', name: 'Đơn hàng quốc tế', icon: <Package className="w-4 h-4" /> },
    { id: 'customers', name: 'Danh sách khách hàng quốc tế', icon: <Users className="w-4 h-4" /> },
    { id: 'feedback', name: 'Danh sách phản hồi từ KH', icon: <MessageCircle className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Globe className="w-8 h-8 text-blue-600 mr-3" />
            Phòng KD Quốc Tế
          </h1>
          <p className="text-gray-600">Quản lý khách hàng quốc tế, đơn hàng xuất khẩu và hợp đồng thương mại</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Đơn hàng quốc tế */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Package className="w-5 h-5 text-blue-600 mr-2" />
              Đơn hàng quốc tế
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col p-3">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-gray-700">Tổng đơn</span>
                  <span className="text-lg font-bold text-gray-900">789</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">+1 hôm nay</span>
                    <span className="text-xs font-medium text-red-500">▼ 3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">+4 hôm qua</span>
                  </div>
                </div>
                <div>------------------------</div>
                  <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">+1 tháng này</span>
                    <span className="text-xs font-medium text-red-500">▼ 3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">+4 tháng trước</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Yêu cầu báo giá */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 text-green-600 mr-2" />
              Yêu cầu báo giá
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng yêu cầu</span>
                <span className="text-lg font-bold text-green-600">40</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đã báo giá</span>
                <span className="text-lg font-bold text-blue-600">30</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Chưa báo giá</span>
                <span className="text-lg font-bold text-red-600">10</span>
              </div>
            </div>
          </div>

          {/* Báo giá */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 text-yellow-600 mr-2" />
              Báo giá
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng báo giá</span>
                <span className="text-lg font-bold text-yellow-600">40</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đã đặt hàng</span>
                <span className="text-lg font-bold text-green-600">30</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Không đặt hàng</span>
                <span className="text-lg font-bold text-red-600">10</span>
              </div>
            </div>
          </div>

          {/* Phản hồi từ khách hàng */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <MessageCircle className="w-5 h-5 text-purple-600 mr-2" />
              Phản hồi từ khách hàng
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Số phản hồi</span>
                <span className="text-lg font-bold text-purple-600">40</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đặc biệt nghiêm trọng</span>
                <span className="text-lg font-bold text-purple-600">20</span>
              </div>
                <div className="flex justify-between items-center p-3 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Nghiêm trọng</span>
                <span className="text-lg font-bold text-purple-600">20</span>
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
          {/* KHÁCH HÀNG QUỐC TẾ */}
          {activeTab === 'customers' && (
            <div className="p-6">
              <InternationalCustomerManagement />
            </div>
          )}

          {/* DANH SÁCH BÁO GIÁ */}
          {activeTab === 'quotations' && (
            <div className="p-6">
              <QuotationManagement />
            </div>
          )}

          {/* DANH SÁCH YÊU CẦU BÁO GIÁ */}
          {activeTab === 'quotationRequests' && (
            <div className="p-6">
              <QuotationRequestManagement />
            </div>
          )}

          {/* ĐỚN HÀNG QUỐC TẾ */}
          {activeTab === 'orders' && (
            <div className="p-6">
              <OrderManagement hideHeader={true} />
            </div>
          )}

          {/* PHẢN HỒI TỪ KHÁCH HÀNG */}
          {activeTab === 'feedback' && (
            <div className="p-6">
              <CustomerFeedbackManagement />
            </div>
          )}

          {/* HỢP ĐỒNG QUỐC TẾ */}
          {activeTab === 'contracts' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã hợp đồng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên hợp đồng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quốc gia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời hạn</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contractData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maHopDong}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.tenHopDong}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.tenKhachHang}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                          {item.quocGia}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-green-600">
                          {item.giaTriHopDong.toLocaleString()} {item.donViTienTe}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="text-xs">
                          <div>{item.ngayBatDau}</div>
                          <div className="text-gray-500">đến {item.ngayKetThuc}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đang thực hiện' ? 'bg-blue-100 text-blue-800' :
                          item.trangThai === 'Hoàn thành' ? 'bg-green-100 text-green-800' :
                          item.trangThai === 'Tạm dừng' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
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

          {/* BÁO CÁO DOANH THU */}
          {activeTab === 'reports' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số đơn hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu USD</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu EUR</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng DT (VNĐ)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tăng trưởng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quốc gia lớn nhất</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {revenueData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.thang}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.soLuongDonHang}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-green-600">
                          ${item.doanhThuUSD.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-blue-600">
                          €{item.doanhThuEUR.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-bold text-purple-600">
                          {(item.tongDoanhThuVND / 1000000000).toFixed(1)}B VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.tyLeTangTruong > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.tyLeTangTruong > 0 ? '+' : ''}{item.tyLeTangTruong}%
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                          {item.quocGiaLonNhat}
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
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
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

export default BusinessInternational;
