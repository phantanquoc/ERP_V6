import React, { useState } from 'react';
import {
  Calculator,
  FileText,
  Receipt,
  TrendingUp,
  AlertTriangle,
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
  CheckCircle,
  Clock
} from 'lucide-react';
import TaxReportTab from '../../components/TaxReportTab';

const AccountingTax = () => {
  const [activeTab, setActiveTab] = useState<'declarations' | 'vat' | 'reports' | 'debts'>('declarations');

  // Dữ liệu mẫu cho KHAI BÁO THUẾ
  const declarationData = [
    {
      id: 1,
      maKhaiBao: 'KB-001/2024',
      loaiThue: 'Thuế GTGT',
      kyKhaiBao: 'Tháng 3/2024',
      ngayNop: '2024-04-20',
      hanNop: '2024-04-20',
      soTienThue: 125000000,
      trangThai: 'Đã nộp',
      phuongThucNop: 'Nộp điện tử',
      nguoiLap: 'Nguyễn Văn An',
      nguoiDuyet: 'Lê Văn Cường',
      ngayDuyet: '2024-04-18',
      ghiChu: 'Khai báo thuế GTGT tháng 3'
    },
    {
      id: 2,
      maKhaiBao: 'KB-002/2024',
      loaiThue: 'Thuế TNDN',
      kyKhaiBao: 'Quý 1/2024',
      ngayNop: null,
      hanNop: '2024-03-30',
      soTienThue: 450000000,
      trangThai: 'Chưa nộp',
      phuongThucNop: 'Nộp điện tử',
      nguoiLap: 'Trần Thị Bình',
      nguoiDuyet: null,
      ngayDuyet: null,
      ghiChu: 'Khai báo thuế TNDN quý 1'
    }
  ];

  // Dữ liệu mẫu cho HÓA ĐƠN VAT
  const vatData = [
    {
      id: 1,
      soHoaDon: 'VAT-001/2024',
      ngayLap: '2024-03-15',
      khachHang: 'Công ty TNHH ABC',
      maSoThue: '0123456789',
      tienHang: 125000000,
      thueVAT: 12500000,
      tongCong: 137500000,
      suatThue: '10%',
      trangThai: 'Đã xuất',
      loaiHoaDon: 'Hóa đơn bán hàng',
      kyHieu: 'C22TBT',
      soSeri: 'AA/22E',
      ghiChu: 'Hóa đơn VAT bán thực phẩm'
    },
    {
      id: 2,
      soHoaDon: 'VAT-002/2024',
      ngayLap: '2024-03-18',
      khachHang: 'Siêu thị BigC',
      maSoThue: '0987654321',
      tienHang: 89000000,
      thueVAT: 8900000,
      tongCong: 97900000,
      suatThue: '10%',
      trangThai: 'Chờ xuất',
      loaiHoaDon: 'Hóa đơn bán hàng',
      kyHieu: 'C22TBT',
      soSeri: 'AA/22E',
      ghiChu: 'Hóa đơn VAT bán hải sản'
    }
  ];

  // Dữ liệu mẫu cho BÁO CÁO THUẾ
  const taxReportData = [
    {
      id: 1,
      tenBaoCao: 'Báo cáo tình hình sử dụng hóa đơn tháng 3/2024',
      loaiBaoCao: 'Báo cáo hóa đơn',
      kyBaoCao: 'Tháng 3/2024',
      ngayLap: '2024-03-31',
      soHoaDonPhatHanh: 156,
      soHoaDonSuDung: 142,
      soHoaDonHuy: 3,
      soHoaDonMat: 0,
      tongTienThue: 125000000,
      nguoiLap: 'Phạm Thị Dung',
      trangThai: 'Đã nộp',
      ghiChu: 'Báo cáo tháng 3 đã nộp cơ quan thuế'
    },
    {
      id: 2,
      tenBaoCao: 'Tờ khai thuế GTGT tháng 3/2024',
      loaiBaoCao: 'Tờ khai thuế GTGT',
      kyBaoCao: 'Tháng 3/2024',
      ngayLap: '2024-04-15',
      thueDauVao: 45000000,
      thueDauRa: 125000000,
      thuePhaiNop: 80000000,
      thueKhauTru: 5000000,
      thueConPhaiNop: 75000000,
      nguoiLap: 'Lê Văn Cường',
      trangThai: 'Chờ nộp',
      ghiChu: 'Tờ khai thuế GTGT tháng 3'
    }
  ];

  // Dữ liệu mẫu cho CÔNG NỢ THUẾ
  const taxDebtData = [
    {
      id: 1,
      maGiaoDich: 'GD-001/2024',
      loaiThue: 'Thuế GTGT',
      kyThue: 'Tháng 2/2024',
      soTienPhaiNop: 95000000,
      soTienDaNop: 95000000,
      soTienConLai: 0,
      ngayDaoHan: '2024-03-20',
      ngayThanhToan: '2024-03-18',
      trangThai: 'Đã thanh toán',
      phuongThucThanhToan: 'Chuyển khoản',
      nganHang: 'Vietcombank',
      soTaiKhoan: '0123456789',
      ghiChu: 'Thanh toán đúng hạn'
    },
    {
      id: 2,
      maGiaoDich: 'GD-002/2024',
      loaiThue: 'Thuế TNDN',
      kyThue: 'Quý 4/2023',
      soTienPhaiNop: 450000000,
      soTienDaNop: 300000000,
      soTienConLai: 150000000,
      ngayDaoHan: '2024-03-30',
      ngayThanhToan: null,
      trangThai: 'Chưa thanh toán',
      phuongThucThanhToan: null,
      nganHang: null,
      soTaiKhoan: null,
      ghiChu: 'Còn nợ 150M, cần thanh toán'
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
    { id: 'declarations', name: 'Khai báo thuế', icon: <FileText className="w-4 h-4" /> },
    { id: 'vat', name: 'Hóa đơn VAT', icon: <Receipt className="w-4 h-4" /> },
    { id: 'reports', name: 'Báo cáo thuế', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'debts', name: 'Công nợ thuế', icon: <CreditCard className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <Calculator className="w-8 h-8 text-red-600 mr-3" />
            Phòng KT thuế
          </h1>
          <p className="text-gray-600">Quản lý khai báo thuế, hóa đơn VAT, báo cáo thuế và công nợ thuế</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Tổng quan khai báo thuế */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 text-blue-600 mr-2" />
              Khai báo thuế
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng khai báo</span>
                <span className="text-lg font-bold text-blue-600">{declarationData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đã nộp</span>
                <span className="text-lg font-bold text-green-600">
                  {declarationData.filter(item => item.trangThai === 'Đã nộp').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan hóa đơn VAT */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Receipt className="w-5 h-5 text-green-600 mr-2" />
              Hóa đơn VAT
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng hóa đơn</span>
                <span className="text-lg font-bold text-green-600">{vatData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đã xuất</span>
                <span className="text-lg font-bold text-blue-600">
                  {vatData.filter(item => item.trangThai === 'Đã xuất').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan báo cáo thuế */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
              Báo cáo thuế
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng báo cáo</span>
                <span className="text-lg font-bold text-purple-600">{taxReportData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Đã nộp</span>
                <span className="text-lg font-bold text-green-600">
                  {taxReportData.filter(item => item.trangThai === 'Đã nộp').length}
                </span>
              </div>
            </div>
          </div>

          {/* Tổng quan công nợ thuế */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 text-red-600 mr-2" />
              Công nợ thuế
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Tổng công nợ</span>
                <span className="text-lg font-bold text-red-600">{taxDebtData.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Chưa thanh toán</span>
                <span className="text-lg font-bold text-yellow-600">
                  {taxDebtData.filter(item => item.trangThai === 'Chưa thanh toán').length}
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
                      ? 'border-red-500 text-red-600'
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
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
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
              <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                <Plus className="h-4 w-4" />
                Thêm mới
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* KHAI BÁO THUẾ */}
          {activeTab === 'declarations' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã khai báo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại thuế</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kỳ khai báo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạn nộp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền thuế</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người lập</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {declarationData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maKhaiBao}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.loaiThue === 'Thuế GTGT' ? 'bg-blue-100 text-blue-800' :
                          item.loaiThue === 'Thuế TNDN' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {item.loaiThue}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.kyKhaiBao}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          {item.hanNop}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-red-600">
                          {(item.soTienThue / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.nguoiLap}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đã nộp' ? 'bg-green-100 text-green-800' :
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

          {/* HÓA ĐƠN VAT */}
          {activeTab === 'vat' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số hóa đơn</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày lập</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiền hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thuế VAT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng cộng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vatData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.soHoaDon}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          {item.ngayLap}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{item.khachHang}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-blue-600">
                          {(item.tienHang / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-red-600">
                          {(item.thueVAT / 1000000).toFixed(1)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-bold text-green-600">
                          {(item.tongCong / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đã xuất' ? 'bg-green-100 text-green-800' :
                          item.trangThai === 'Chờ xuất' ? 'bg-yellow-100 text-yellow-800' :
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
                          <button className="text-purple-600 hover:text-purple-800" title="In hóa đơn">
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

          {/* BÁO CÁO THUẾ */}
          {activeTab === 'reports' && <TaxReportTab />}

          {/* CÔNG NỢ THUẾ */}
          {activeTab === 'debts' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã giao dịch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại thuế</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kỳ thuế</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phải nộp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đã nộp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Còn lại</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạn nộp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {taxDebtData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{item.maGiaoDich}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.loaiThue === 'Thuế GTGT' ? 'bg-blue-100 text-blue-800' :
                          item.loaiThue === 'Thuế TNDN' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {item.loaiThue}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.kyThue}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-red-600">
                          {(item.soTienPhaiNop / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-green-600">
                          {(item.soTienDaNop / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-bold ${item.soTienConLai > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {(item.soTienConLai / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                          {item.ngayDaoHan}
                        </div>
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
                          {item.trangThai === 'Chưa thanh toán' && (
                            <button className="text-green-600 hover:text-green-800" title="Thanh toán">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button className="text-purple-600 hover:text-purple-800" title="Lịch sử">
                            <Clock className="w-4 h-4" />
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
                  <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
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

export default AccountingTax;
