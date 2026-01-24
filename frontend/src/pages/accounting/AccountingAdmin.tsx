import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Receipt,
  Building,
  Edit,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  CreditCard,
  Archive,
  Package,
  AlertCircle,
  TrendingUp,
  Wallet
} from 'lucide-react';
import OrderManagement from '../../components/OrderManagement';
import DebtManagement from '../../components/DebtManagement';
import AssetManagement from '../../components/AssetManagement';
import InvoiceManagement from '../../components/InvoiceManagement';
import warehouseService from '../../services/warehouseService';
import debtService from '../../services/debtService';
import invoiceService from '../../services/invoiceService';
import internationalCustomerService from '../../services/internationalCustomerService';

// Interface for overview data
interface AssetOverview {
  tongTaiSan: number;
  tongCongNo: number;
  daThanhToan: number;
  chuaThanhToan: number;
}

interface RevenueOverview {
  tongDoanhThu: number;
  quocTe: number;
  noiDia: number;
}

const AccountingAdmin = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'assets' | 'orders' | 'debts'>('invoices');

  // Overview states
  const [assetOverview, setAssetOverview] = useState<AssetOverview>({
    tongTaiSan: 0,
    tongCongNo: 0,
    daThanhToan: 0,
    chuaThanhToan: 0,
  });

  const [revenueOverview, setRevenueOverview] = useState<RevenueOverview>({
    tongDoanhThu: 0,
    quocTe: 0,
    noiDia: 0,
  });

  const [loadingOverview, setLoadingOverview] = useState(true);

  // Fetch overview data
  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoadingOverview(true);

        // Fetch all data in parallel
        const [warehousesRes, debtSummaryRes, invoicesRes, internationalCustomersRes, domesticCustomersRes] = await Promise.all([
          warehouseService.getAllWarehouses(),
          debtService.getDebtSummary(),
          invoiceService.getAllInvoices(1, 1000),
          internationalCustomerService.getAllCustomers(1, 1000, '', 'Quốc tế'),
          internationalCustomerService.getAllCustomers(1, 1000, '', 'Nội địa'),
        ]);

        // Calculate total asset value from warehouses
        const warehouses = warehousesRes.data?.data || warehousesRes.data || [];
        let tongTaiSan = 0;
        warehouses.forEach((warehouse: any) => {
          warehouse.lots?.forEach((lot: any) => {
            lot.lotProducts?.forEach((product: any) => {
              const giaThanh = product.giaThanh || 100000;
              tongTaiSan += (product.soLuong || 0) * giaThanh;
            });
          });
        });

        // Get debt summary
        const debtSummary = debtSummaryRes.data?.data || debtSummaryRes.data || {};

        setAssetOverview({
          tongTaiSan,
          tongCongNo: debtSummary.tongPhaiTra || 0,
          daThanhToan: debtSummary.daThanhToan || 0,
          chuaThanhToan: debtSummary.conNo || 0,
        });

        // Calculate revenue from invoices
        const invoices = invoicesRes.data || [];
        const internationalCustomers = internationalCustomersRes.data || [];
        const domesticCustomers = domesticCustomersRes.data || [];

        // Create customer name sets for lookup
        const internationalNames = new Set(internationalCustomers.map((c: any) => c.tenCongTy));
        const domesticNames = new Set(domesticCustomers.map((c: any) => c.tenCongTy));

        let tongDoanhThu = 0;
        let quocTe = 0;
        let noiDia = 0;

        invoices.forEach((invoice: any) => {
          const thanhTien = invoice.thanhTien || 0;
          tongDoanhThu += thanhTien;

          // Classify by customer name
          if (internationalNames.has(invoice.khachHang)) {
            quocTe += thanhTien;
          } else if (domesticNames.has(invoice.khachHang)) {
            noiDia += thanhTien;
          } else {
            // Default to domestic if unknown
            noiDia += thanhTien;
          }
        });

        setRevenueOverview({
          tongDoanhThu,
          quocTe,
          noiDia,
        });

      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoadingOverview(false);
      }
    };

    fetchOverviewData();
  }, []);

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
          <p className="text-gray-600">Quản lý hóa đơn, tài sản, công nợ và đơn hàng</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Card 1: Tổng quan tài sản */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Building className="w-5 h-5 mr-2 text-blue-600" />
                Tổng quan tài sản
              </h3>
            </div>
            {loadingOverview ? (
              <div className="animate-pulse space-y-3">
                <div className="h-14 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">Tổng tài sản</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(assetOverview.tongTaiSan)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                    <div className="text-xl font-bold text-red-600">
                      {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(assetOverview.tongCongNo)}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">Tổng công nợ</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                    <div className="text-xl font-bold text-green-600">
                      {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(assetOverview.daThanhToan)}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">Đã thanh toán</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                    <div className="text-xl font-bold text-yellow-600">
                      {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(assetOverview.chuaThanhToan)}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">Chưa thanh toán</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Tổng quan doanh thu */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-green-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Tổng quan doanh thu
              </h3>
            </div>
            {loadingOverview ? (
              <div className="animate-pulse space-y-3">
                <div className="h-14 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                  <div className="h-16 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-green-50 rounded-lg p-3 hover:bg-green-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">Tổng doanh thu</span>
                    <span className="text-2xl font-bold text-green-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(revenueOverview.tongDoanhThu)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                    <div className="text-xl font-bold text-blue-600">
                      {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(revenueOverview.quocTe)}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">Quốc tế</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                    <div className="text-xl font-bold text-green-600">
                      {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(revenueOverview.noiDia)}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">Nội địa</div>
                  </div>
                </div>
              </div>
            )}
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

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-300">
          {/* HÓA ĐƠN */}
          {/* HÓA ĐƠN */}
          {activeTab === 'invoices' && (
            <div className="p-6">
              <InvoiceManagement />
            </div>
          )}

          {/* QUẢN LÝ TÀI SẢN */}
          {activeTab === 'assets' && (
            <AssetManagement hideHeader={true} />
          )}

          {/* QUẢN LÝ TÀI SẢN - OLD MOCKDATA (COMMENTED OUT) */}
          {false && activeTab === 'assets' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-orange-200 border-b-2 border-gray-400">
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400">Mã tài sản</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400">Tên tài sản</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400">Loại tài sản</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400">Giá trị mua</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400">Giá trị hiện tại</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400">Vị trí</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400">Trạng thái</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-gray-800">Hoạt động</th>
                  </tr>
                </thead>
                <tbody>
                  {assetData.map((item) => (
                    <tr key={item.id} className="border-b border-gray-400 bg-white hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center font-medium text-blue-600">{item.maTaiSan}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400">{item.tenTaiSan}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">{item.loaiTaiSan}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right">
                        <span className="font-medium text-blue-600">
                          {(item.giaTriMua / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-right">
                        <span className="font-medium text-green-600">
                          {(item.giaTriHienTai / 1000000).toFixed(0)}M VNĐ
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">{item.viTri}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-400 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.trangThai === 'Đang sử dụng' ? 'bg-green-100 text-green-800' :
                          item.trangThai === 'Bảo trì' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.trangThai}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center justify-center gap-2">
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
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border-2 border-gray-300">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Chi tiết thông tin</h2>
                  <button
                    onClick={closeDetailModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(selectedItem).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all duration-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </label>
                      <p className="text-sm text-gray-900 font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={closeDetailModal}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  >
                    Đóng
                  </button>
                  <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 border-2 border-orange-600 hover:border-orange-700 transition-colors">
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
