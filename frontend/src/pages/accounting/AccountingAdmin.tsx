import React, { useState } from 'react';
import {
  Calculator,
  FileText,
  Receipt,
  TrendingUp,
  Building,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  CreditCard,
  Archive,
  Package,
  AlertCircle
} from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import DebtManagement from '../../components/DebtManagement';
import AssetManagement from '../../components/AssetManagement';

const AccountingAdmin = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'documents' | 'reports' | 'assets' | 'orders' | 'debts'>('invoices');

  // Dữ liệu mẫu cho HÓA ĐƠN
  const invoiceData = [
    {
      id: 1,
      soHoaDon: 'HD-001/2024',
      ngayLap: '2024-03-15',
      khachHang: 'Công ty TNHH ABC',
      maSoThue: '0123456789',
      tongTien: 125000000,
      thueVAT: 12500000,
      thanhTien: 137500000,
      trangThai: 'Đã thanh toán',
      loaiHoaDon: 'Bán hàng',
      phuongThucThanhToan: 'Chuyển khoản',
      ngayThanhToan: '2024-03-20',
      nhanVienLap: 'Nguyễn Văn An',
      ghiChu: 'Hóa đơn bán thực phẩm tươi sống'
    },
    {
      id: 2,
      soHoaDon: 'HD-002/2024',
      ngayLap: '2024-03-18',
      khachHang: 'Siêu thị BigC',
      maSoThue: '0987654321',
      tongTien: 89000000,
      thueVAT: 8900000,
      thanhTien: 97900000,
      trangThai: 'Chưa thanh toán',
      loaiHoaDon: 'Bán hàng',
      phuongThucThanhToan: 'Tiền mặt',
      ngayThanhToan: null,
      nhanVienLap: 'Trần Thị Bình',
      ghiChu: 'Hóa đơn bán hải sản đông lạnh'
    }
  ];

  // Dữ liệu mẫu cho CHỨNG TỪ KẾ TOÁN
  const documentData = [
    {
      id: 1,
      soChungTu: 'CT-001/2024',
      ngayLap: '2024-03-15',
      loaiChungTu: 'Phiếu thu',
      noiDung: 'Thu tiền bán hàng từ khách hàng ABC',
      soTien: 137500000,
      taiKhoanNo: '111 - Tiền mặt',
      taiKhoanCo: '511 - Doanh thu bán hàng',
      nguoiLap: 'Nguyễn Văn An',
      nguoiDuyet: 'Lê Văn Cường',
      trangThai: 'Đã duyệt',
      ghiChu: 'Chứng từ thu tiền bán hàng'
    },
    {
      id: 2,
      soChungTu: 'CT-002/2024',
      ngayLap: '2024-03-18',
      loaiChungTu: 'Phiếu chi',
      noiDung: 'Chi phí mua nguyên liệu sản xuất',
      soTien: 45000000,
      taiKhoanNo: '621 - Chi phí nguyên liệu',
      taiKhoanCo: '111 - Tiền mặt',
      nguoiLap: 'Trần Thị Bình',
      nguoiDuyet: 'Lê Văn Cường',
      trangThai: 'Chờ duyệt',
      ghiChu: 'Chi phí mua tôm sú tươi'
    }
  ];

  // Dữ liệu mẫu cho BÁO CÁO TÀI CHÍNH
  const reportData = [
    {
      id: 1,
      tenBaoCao: 'Báo cáo kết quả kinh doanh tháng 3/2024',
      loaiBaoCao: 'Kết quả kinh doanh',
      kyBaoCao: 'Tháng 3/2024',
      ngayLap: '2024-03-31',
      doanhThu: 2800000000,
      giaBan: 2100000000,
      loiNhuanGop: 700000000,
      chiPhiQuanLy: 150000000,
      chiPhiBanHang: 100000000,
      loiNhuanRong: 450000000,
      nguoiLap: 'Phạm Thị Dung',
      trangThai: 'Hoàn thành',
      ghiChu: 'Báo cáo tháng 3 đạt kế hoạch'
    },
    {
      id: 2,
      tenBaoCao: 'Bảng cân đối kế toán Q1/2024',
      loaiBaoCao: 'Cân đối kế toán',
      kyBaoCao: 'Quý 1/2024',
      ngayLap: '2024-03-31',
      tongTaiSan: 15000000000,
      taiSanNganHan: 8000000000,
      taiSanDaiHan: 7000000000,
      tongNguonVon: 15000000000,
      noNganHan: 3000000000,
      vonChuSoHuu: 12000000000,
      nguoiLap: 'Lê Văn Cường',
      trangThai: 'Đang xử lý',
      ghiChu: 'Báo cáo quý 1 năm 2024'
    }
  ];

  // CLEARED - Dữ liệu mẫu cho TÀI SẢN đã được xóa
  const assetData: any[] = [];

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
    { id: 'invoices', name: 'Hóa đơn', icon: <Receipt className="w-4 h-4" /> },
    { id: 'documents', name: 'Chứng từ kế toán', icon: <FileText className="w-4 h-4" /> },
    { id: 'reports', name: 'Báo cáo tài chính', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'assets', name: 'Quản lý tài sản', icon: <Building className="w-4 h-4" /> },
    { id: 'debts', name: 'Danh sách công nợ', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'orders', name: 'Danh sách đơn hàng', icon: <Package className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Calculator className="w-8 h-8 text-orange-600 mr-3" />
            Phòng KT Hành chính
          </h1>
          <p className="text-gray-600">Quản lý hóa đơn, chứng từ kế toán, báo cáo tài chính và tài sản</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Tổng quan hóa đơn */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Receipt className="w-5 h-5 text-blue-600 mr-2" />
              Hóa đơn
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng hóa đơn</span>
                <span className="text-lg font-bold text-blue-600">{invoiceData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đã thanh toán</span>
                <span className="text-lg font-bold text-green-600">
                  {invoiceData.filter(item => item.trangThai === 'Đã thanh toán').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan chứng từ */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 text-green-600 mr-2" />
              Chứng từ kế toán
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng chứng từ</span>
                <span className="text-lg font-bold text-green-600">{documentData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đã duyệt</span>
                <span className="text-lg font-bold text-blue-600">
                  {documentData.filter(item => item.trangThai === 'Đã duyệt').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan báo cáo */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
              Báo cáo tài chính
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng báo cáo</span>
                <span className="text-lg font-bold text-purple-600">{reportData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Hoàn thành</span>
                <span className="text-lg font-bold text-green-600">
                  {reportData.filter(item => item.trangThai === 'Hoàn thành').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan tài sản */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Building className="w-5 h-5 text-orange-600 mr-2" />
              Tài sản
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng tài sản</span>
                <span className="text-lg font-bold text-orange-600">{assetData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đang sử dụng</span>
                <span className="text-lg font-bold text-green-600">
                  {assetData.filter(item => item.trangThai === 'Đang sử dụng').length}
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
                      ? 'border-orange-500 text-orange-600'
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

        {/* Action Bar - Hide for orders and debts tab */}
        {activeTab !== 'orders' && activeTab !== 'debts' && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 w-64"
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
                <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
                  <Plus className="h-4 w-4" />
                  Thêm mới
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* HÓA ĐƠN */}
          {activeTab === 'invoices' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số hóa đơn</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày lập</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại hóa đơn</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoiceData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.soHoaDon}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          {item.ngayLap}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.khachHang}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.loaiHoaDon}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-blue-600">
                          {(item.tongTien / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-bold text-green-600">
                          {(item.thanhTien / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đã thanh toán' ? 'bg-green-100 text-green-800' :
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

          {/* CHỨNG TỪ KẾ TOÁN */}
          {activeTab === 'documents' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số chứng từ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày lập</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại chứng từ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người lập</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documentData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.soChungTu}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          {item.ngayLap}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.loaiChungTu === 'Phiếu thu' ? 'bg-green-100 text-green-800' :
                          item.loaiChungTu === 'Phiếu chi' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {item.loaiChungTu}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{item.noiDung}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-purple-600">
                          {(item.soTien / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.nguoiLap}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đã duyệt' ? 'bg-green-100 text-green-800' :
                          item.trangThai === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-800' :
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

          {/* BÁO CÁO TÀI CHÍNH */}
          {activeTab === 'reports' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên báo cáo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại báo cáo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kỳ báo cáo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày lập</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lợi nhuận</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-blue-600 max-w-xs">{item.tenBaoCao}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.loaiBaoCao}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.kyBaoCao}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          {item.ngayLap}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-green-600">
                          {item.doanhThu ? `${(item.doanhThu / 1000000000).toFixed(1)}B VNĐ` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-purple-600">
                          {item.loiNhuanRong ? `${(item.loiNhuanRong / 1000000).toFixed(0)}M VNĐ` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Hoàn thành' ? 'bg-green-100 text-green-800' :
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

          {/* QUẢN LÝ TÀI SẢN */}
          {activeTab === 'assets' && (
            <AssetManagement hideHeader={true} />
          )}

          {/* QUẢN LÝ TÀI SẢN - OLD MOCKDATA (COMMENTED OUT) */}
          {false && activeTab === 'assets' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã tài sản</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên tài sản</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại tài sản</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị mua</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị hiện tại</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vị trí</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assetData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maTaiSan}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">{item.tenTaiSan}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.loaiTaiSan}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-blue-600">
                          {(item.giaTriMua / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-green-600">
                          {(item.giaTriHienTai / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.viTri}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đang sử dụng' ? 'bg-green-100 text-green-800' :
                          item.trangThai === 'Bảo trì' ? 'bg-yellow-100 text-yellow-800' :
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
                          <button className="text-orange-600 hover:text-orange-800" title="Khấu hao">
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* DANH SÁCH CÔNG NỢ */}
          {activeTab === 'debts' && (
            <div className="p-6">
              <DebtManagement />
            </div>
          )}

          {/* DANH SÁCH ĐƠN HÀNG */}
          {activeTab === 'orders' && (
            <div className="p-6">
              <OrderManagement hideHeader={true} />
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
                  <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
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

export default AccountingAdmin;
