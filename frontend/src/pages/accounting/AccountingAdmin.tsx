import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calculator,
  Receipt,
  Building,
  Package,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import PageHeader from '../../design-system/PageHeader';
import OrderManagement from '../../components/OrderManagement';
import DebtManagement from '../../components/DebtManagement';
import AssetManagement from '../../components/AssetManagement';
import InvoiceManagement from '../../components/InvoiceManagement';
import warehouseService from '../../services/warehouseService';
import debtService from '../../services/debtService';
import invoiceService, { Invoice } from '../../services/invoiceService';
import { orderService } from '../../services/orderService';

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

interface InvoiceOverview {
  total: number;
  daThanhToan: number;
  chuaThanhToan: number;
  dangXuLy: number;
}

interface OrderOverview {
  total: number;
  dangSanXuat: number;
  choGiaoHang: number;
  daGiao: number;
}


const AccountingAdmin = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'invoices' | 'assets' | 'orders' | 'debts'>(() => {
    const tabParam = searchParams.get('tab');
    const validTabs = ['invoices', 'assets', 'orders', 'debts'];
    return validTabs.includes(tabParam || '') ? tabParam as any : 'invoices';
  });

  // Month/Year filter state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [activeTab]);

  // Overview states
  const [assetOverview, setAssetOverview] = useState<AssetOverview>({
    tongTaiSan: 0, tongCongNo: 0, daThanhToan: 0, chuaThanhToan: 0,
  });
  const [revenueOverview, setRevenueOverview] = useState<RevenueOverview>({
    tongDoanhThu: 0, quocTe: 0, noiDia: 0,
  });
  const [invoiceOverview, setInvoiceOverview] = useState<InvoiceOverview>({
    total: 0, daThanhToan: 0, chuaThanhToan: 0, dangXuLy: 0,
  });
  const [orderOverview, setOrderOverview] = useState<OrderOverview>({
    total: 0, dangSanXuat: 0, choGiaoHang: 0, daGiao: 0,
  });
  const [loadingOverview, setLoadingOverview] = useState(true);


  // Fetch overview data
  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoadingOverview(true);

        const [warehousesRes, debtSummaryRes, invoicesRes, ordersRes] = await Promise.all([
          warehouseService.getAllWarehouses(),
          debtService.getDebtSummary(selectedMonth, selectedYear),
          invoiceService.getAllInvoices(1, 1000, undefined, selectedMonth, selectedYear),
          orderService.getAllOrders(1, 1000, undefined, undefined, undefined, undefined, undefined, selectedMonth, selectedYear),
        ]);

        // Calculate total asset value from warehouses
        const warehouses = (warehousesRes as any).data?.data || (warehousesRes as any).data || [];
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
        const debtSummary = (debtSummaryRes as any).data?.data || (debtSummaryRes as any).data || {};
        setAssetOverview({
          tongTaiSan,
          tongCongNo: debtSummary.tongPhaiTra || 0,
          daThanhToan: debtSummary.daThanhToan || 0,
          chuaThanhToan: debtSummary.conNo || 0,
        });

        // Calculate revenue from invoices (classify by customer.quocGia)
        const invoices: Invoice[] = invoicesRes.data || [];
        let tongDoanhThu = 0;
        let quocTe = 0;
        let noiDia = 0;
        let invDaThanhToan = 0;
        let invChuaThanhToan = 0;
        let invDangXuLy = 0;

        invoices.forEach((invoice: any) => {
          const thanhTien = invoice.thanhTien || 0;
          tongDoanhThu += thanhTien;

          // Classify by customer.quocGia
          if (invoice.customer?.quocGia) {
            quocTe += thanhTien;
          } else {
            noiDia += thanhTien;
          }

          // Count by status
          if (invoice.trangThai === 'Đã thanh toán') invDaThanhToan++;
          else if (invoice.trangThai === 'Chưa thanh toán') invChuaThanhToan++;
          else invDangXuLy++;
        });

        setRevenueOverview({ tongDoanhThu, quocTe, noiDia });
        setInvoiceOverview({
          total: invoices.length,
          daThanhToan: invDaThanhToan,
          chuaThanhToan: invChuaThanhToan,
          dangXuLy: invDangXuLy,
        });

        // Orders overview
        const orders = (ordersRes as any).data || [];
        setOrderOverview({
          total: orders.length,
          dangSanXuat: orders.filter((o: any) => o.trangThaiSanXuat === 'DANG_SAN_XUAT').length,
          choGiaoHang: orders.filter((o: any) => o.trangThaiSanXuat === 'CHO_GIAO_HANG').length,
          daGiao: orders.filter((o: any) => o.trangThaiSanXuat === 'DA_GIAO_CHO_KHACH_HANG').length,
        });

      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoadingOverview(false);
      }
    };

    fetchOverviewData();
  }, [selectedMonth, selectedYear]);

  const tabs = [
    { id: 'invoices', name: 'Hóa đơn', icon: <Receipt className="w-4 h-4" /> },
    { id: 'assets', name: 'Quản lý tài sản', icon: <Building className="w-4 h-4" /> },
    { id: 'debts', name: 'Danh sách công nợ', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'orders', name: 'Danh sách đơn hàng', icon: <Package className="w-4 h-4" /> }
  ];

  const formatCompact = (value: number) =>
    new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value);


  return (
    <div>
      <div>
        <PageHeader
          title="Phòng KT Hành chính"
          description="Quản lý hóa đơn, tài sản, công nợ và đơn hàng"
          icon={<Calculator className="w-6 h-6 text-orange-500" />}
          actions={
            <>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          }
        />

        {/* Overview Cards - 2x2 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {/* Card 1: Tổng quan tài sản */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center text-gray-700">
                <Building className="w-4 h-4 mr-2 text-blue-600" />
                Tổng quan tài sản
              </h3>
            </div>
            {loadingOverview ? (
              <div className="animate-pulse space-y-3">
                <div className="h-14 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-3 gap-2"><div className="h-16 bg-gray-200 rounded-lg"></div><div className="h-16 bg-gray-200 rounded-lg"></div><div className="h-16 bg-gray-200 rounded-lg"></div></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div onClick={() => setActiveTab('assets')} className="bg-blue-50 rounded-lg p-3 border border-blue-200 cursor-pointer hover:shadow-sm hover:border-blue-300 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">Tổng tài sản</span>
                    <span className="text-2xl font-bold text-blue-600">{formatCurrency(assetOverview.tongTaiSan)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div onClick={() => setActiveTab('debts')} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 cursor-pointer hover:shadow-sm hover:border-blue-200 transition">
                    <div className="text-xl font-bold text-red-600">{formatCompact(assetOverview.tongCongNo)}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Tổng công nợ</div>
                  </div>
                  <div onClick={() => setActiveTab('debts')} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 cursor-pointer hover:shadow-sm hover:border-blue-200 transition">
                    <div className="text-xl font-bold text-green-600">{formatCompact(assetOverview.daThanhToan)}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đã thanh toán</div>
                  </div>
                  <div onClick={() => setActiveTab('debts')} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 cursor-pointer hover:shadow-sm hover:border-blue-200 transition">
                    <div className="text-xl font-bold text-yellow-600">{formatCompact(assetOverview.chuaThanhToan)}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Chưa thanh toán</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Tổng quan doanh thu */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center text-gray-700">
                <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                Tổng quan doanh thu
              </h3>
            </div>
            {loadingOverview ? (
              <div className="animate-pulse space-y-3">
                <div className="h-14 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-2 gap-2"><div className="h-16 bg-gray-200 rounded-lg"></div><div className="h-16 bg-gray-200 rounded-lg"></div></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div onClick={() => setActiveTab('orders')} className="bg-green-50 rounded-lg p-3 border border-green-200 cursor-pointer hover:shadow-sm hover:border-green-300 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">Tổng doanh thu</span>
                    <span className="text-2xl font-bold text-green-600">{formatCurrency(revenueOverview.tongDoanhThu)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div onClick={() => setActiveTab('orders')} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 cursor-pointer hover:shadow-sm hover:border-blue-200 transition">
                    <div className="text-xl font-bold text-blue-600">{formatCompact(revenueOverview.quocTe)}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Quốc tế</div>
                  </div>
                  <div onClick={() => setActiveTab('orders')} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 cursor-pointer hover:shadow-sm hover:border-blue-200 transition">
                    <div className="text-xl font-bold text-green-600">{formatCompact(revenueOverview.noiDia)}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Nội địa</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Hóa đơn */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center text-gray-700">
                <Receipt className="w-4 h-4 mr-2 text-orange-600" />
                Hóa đơn
              </h3>
            </div>
            {loadingOverview ? (
              <div className="animate-pulse space-y-3">
                <div className="h-14 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-3 gap-2"><div className="h-16 bg-gray-200 rounded-lg"></div><div className="h-16 bg-gray-200 rounded-lg"></div><div className="h-16 bg-gray-200 rounded-lg"></div></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div onClick={() => setActiveTab('invoices')} className="bg-orange-50 rounded-lg p-3 border border-orange-200 cursor-pointer hover:shadow-sm hover:border-orange-300 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">Tổng hóa đơn</span>
                    <span className="text-2xl font-bold text-orange-600">{invoiceOverview.total}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div onClick={() => setActiveTab('invoices')} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 cursor-pointer hover:shadow-sm hover:border-blue-200 transition">
                    <div className="text-xl font-bold text-green-600">{invoiceOverview.daThanhToan}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đã thanh toán</div>
                  </div>
                  <div onClick={() => setActiveTab('invoices')} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 cursor-pointer hover:shadow-sm hover:border-blue-200 transition">
                    <div className="text-xl font-bold text-red-600">{invoiceOverview.chuaThanhToan}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Chưa thanh toán</div>
                  </div>
                  <div onClick={() => setActiveTab('invoices')} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 cursor-pointer hover:shadow-sm hover:border-blue-200 transition">
                    <div className="text-xl font-bold text-yellow-600">{invoiceOverview.dangXuLy}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đang xử lý</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Đơn hàng */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center text-gray-700">
                <Package className="w-4 h-4 mr-2 text-purple-600" />
                Đơn hàng
              </h3>
            </div>
            {loadingOverview ? (
              <div className="animate-pulse space-y-3">
                <div className="h-14 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-3 gap-2"><div className="h-16 bg-gray-200 rounded-lg"></div><div className="h-16 bg-gray-200 rounded-lg"></div><div className="h-16 bg-gray-200 rounded-lg"></div></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div onClick={() => setActiveTab('orders')} className="bg-purple-50 rounded-lg p-3 border border-purple-200 cursor-pointer hover:shadow-sm hover:border-purple-300 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-700">Tổng đơn hàng</span>
                    <span className="text-2xl font-bold text-purple-600">{orderOverview.total}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div onClick={() => setActiveTab('orders')} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 cursor-pointer hover:shadow-sm hover:border-blue-200 transition">
                    <div className="text-xl font-bold text-blue-600">{orderOverview.dangSanXuat}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đang sản xuất</div>
                  </div>
                  <div onClick={() => setActiveTab('orders')} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 cursor-pointer hover:shadow-sm hover:border-blue-200 transition">
                    <div className="text-xl font-bold text-yellow-600">{orderOverview.choGiaoHang}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Chờ giao hàng</div>
                  </div>
                  <div onClick={() => setActiveTab('orders')} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200 cursor-pointer hover:shadow-sm hover:border-blue-200 transition">
                    <div className="text-xl font-bold text-green-600">{orderOverview.daGiao}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Đã giao</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
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
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          {activeTab === 'invoices' && (
            <div className="p-6">
              <InvoiceManagement month={selectedMonth} year={selectedYear} />
            </div>
          )}
          {activeTab === 'assets' && (
            <div className="p-6">
              <AssetManagement hideHeader={true} />
            </div>
          )}
          {activeTab === 'debts' && (
            <div className="p-6">
              <DebtManagement month={selectedMonth} year={selectedYear} />
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="p-6">
              <OrderManagement hideHeader={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountingAdmin;
