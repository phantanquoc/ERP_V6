import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calculator,
  FileText,
  ShoppingCart,
  DollarSign,
  Calendar,
  Clock,
  PackageCheck,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import QuotationRequestManagement from '../../components/QuotationRequestManagement';
import QuotationManagement from '../../components/QuotationManagement';
import OrderManagement from '../../components/OrderManagement';
import ExportCostManagement from '../../components/ExportCostManagement';
import OvertimePlanReviewTab from '../../components/general/pricing/OvertimePlanReviewTab';
import PurchaseRequestReviewTab from '../../components/general/pricing/PurchaseRequestReviewTab';
import { usePricingOverview } from '../../hooks/usePricingOverview';

const VALID_TABS = ['requests', 'quotes', 'orders', 'costs', 'overtime-review', 'purchase-review'] as const;
type TabType = typeof VALID_TABS[number];

const fmtInt = (n: number) => n.toLocaleString('vi-VN');
const fmtVND = (n: number) => `${n.toLocaleString('vi-VN')} VND`;

function sumKeys(map: Record<string, number> | undefined, keys: string[]): number {
  if (!map) return 0;
  return keys.reduce((acc, k) => acc + (map[k] ?? 0), 0);
}

const GeneralPricing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabParam = searchParams.get('tab') as TabType;
    return VALID_TABS.includes(tabParam) ? tabParam : 'requests';
  });

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

  const { data: overview, isLoading, isError, refetch, isFetching } = usePricingOverview(selectedMonth, selectedYear);

  // Derived
  const reqByStatus = overview?.requests.byStatus;
  const quoByStatus = overview?.quotations.byStatus;
  const ordProd = overview?.orders.byStatus.production;
  const ordPay = overview?.orders.byStatus.payment;

  // Quotation 5-group presentation (D6)
  const quoGroups = overview
    ? [
        { label: 'Nháp', short: 'Nháp', count: sumKeys(quoByStatus, ['DRAFT']), tone: 'gray' as const },
        { label: 'Chờ phản hồi', short: 'Chờ P.hồi', count: sumKeys(quoByStatus, ['DANG_CHO_PHAN_HOI', 'SENT']), tone: 'yellow' as const },
        { label: 'Chờ gửi ĐH', short: 'Chờ gửi ĐH', count: sumKeys(quoByStatus, ['DANG_CHO_GUI_DON_HANG', 'APPROVED']), tone: 'yellow' as const },
        { label: 'Đã đặt', short: 'Đã đặt', count: sumKeys(quoByStatus, ['DA_DAT_HANG']), tone: 'green' as const },
        { label: 'Không đặt/Hủy/Hết hạn', short: 'K.đặt/Hủy/HH', count: sumKeys(quoByStatus, ['KHONG_DAT_HANG', 'REJECTED', 'EXPIRED']), tone: 'red' as const },
      ]
    : [];

  // Order production grouping -> 3 pills
  const ordProdGroups = overview
    ? [
        { label: 'Chờ SX', count: sumKeys(ordProd, ['CHO_LEN_KE_HOACH', 'CHO_SAN_XUAT']), tone: 'yellow' as const },
        { label: 'Đang SX', count: sumKeys(ordProd, ['DANG_SAN_XUAT']), tone: 'blue' as const },
        { label: 'Đã giao', count: sumKeys(ordProd, ['CHO_GIAO_HANG', 'DA_LEN_CONTAINER', 'DANG_VAN_CHUYEN', 'DA_GIAO_CHO_KHACH_HANG']), tone: 'green' as const },
      ]
    : [];

  const ordPayChuaTT = sumKeys(ordPay, ['CHUA_THANH_TOAN', 'CHO_THANH_TOAN_DOT_2', 'DA_THANH_TOAN_DOT_1']);
  const ordPayDaTT = sumKeys(ordPay, ['DA_THANH_TOAN_DU']);

  const tabs = [
    { id: 'requests', name: 'Danh sách YCBG', icon: <FileText className="w-4 h-4" /> },
    { id: 'quotes', name: 'Danh sách báo giá', icon: <Calculator className="w-4 h-4" /> },
    { id: 'orders', name: 'Danh sách đơn hàng', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'costs', name: 'Chi phí', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'overtime-review', name: 'Duyệt tăng ca', icon: <Clock className="w-4 h-4" /> },
    { id: 'purchase-review', name: 'Duyệt mua hàng', icon: <PackageCheck className="w-4 h-4" /> },
  ];

  const priceLockedCount = overview?.quotations.priceLockedCount ?? 0;
  const overtimePending = overview?.approvals.overtimePending ?? 0;
  const purchasePending = overview?.approvals.purchasePending ?? 0;
  const agingYellow = overview?.warnings.agingYellow ?? 0;
  const agingRed = overview?.warnings.agingRed ?? 0;

  const pillTone: Record<string, string> = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  const Skeleton = () => (
    <div className="animate-pulse space-y-3">
      <div className="h-14 bg-gray-100 rounded-lg" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-16 bg-gray-100 rounded-lg" />
        <div className="h-16 bg-gray-100 rounded-lg" />
      </div>
      <div className="h-10 bg-gray-100 rounded-lg" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
            <Calculator className="w-8 h-8 text-blue-600 mr-3" />
            Phòng giá thành
          </h1>
          <p className="text-gray-600">Quản lý yêu cầu báo giá, báo giá và đơn hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 4 }, (_, i) => {
              const y = new Date().getFullYear() - 3 + i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          {isFetching && !isLoading && (
            <span className="text-xs text-gray-400 ml-1">Đang cập nhật…</span>
          )}
        </div>
      </div>

      {/* Overview — 2 rows: 3 funnel + 2 ops */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-red-700">Không tải được tổng quan. Thử lại.</span>
          <button
            onClick={() => refetch()}
            className="text-sm font-medium text-red-700 hover:text-red-800 underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Row 1: YCBG | BaoGia | DonHang — compact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Card 1: YCBG funnel */}
        <div
          onClick={() => setActiveTab('requests')}
          className="bg-white rounded-lg shadow p-3 border border-gray-200 hover:shadow-md hover:border-blue-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center text-gray-800">
              <FileText className="w-4 h-4 mr-1.5 text-blue-600" />
              YCBG
            </h3>
            <span className="text-xl font-bold text-blue-600">{fmtInt(overview?.requests.total ?? 0)}</span>
          </div>

          {isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-2">
              {/* 4 status pills */}
              <div className="grid grid-cols-4 gap-1.5">
                <div className={`rounded px-1.5 py-1 text-center border ${pillTone.yellow}`}>
                  <div className="text-sm font-bold leading-none">{fmtInt(reqByStatus?.['CHO_XU_LY'] ?? 0)}</div>
                  <div className="text-[10px] font-medium mt-0.5 leading-tight">Chờ</div>
                </div>
                <div className={`rounded px-1.5 py-1 text-center border ${pillTone.blue}`}>
                  <div className="text-sm font-bold leading-none">{fmtInt(reqByStatus?.['DANG_BAO_GIA'] ?? 0)}</div>
                  <div className="text-[10px] font-medium mt-0.5 leading-tight">Đang</div>
                </div>
                <div className={`rounded px-1.5 py-1 text-center border ${pillTone.green}`}>
                  <div className="text-sm font-bold leading-none">{fmtInt(reqByStatus?.['DA_BAO_GIA'] ?? 0)}</div>
                  <div className="text-[10px] font-medium mt-0.5 leading-tight">Xong</div>
                </div>
                <div className={`rounded px-1.5 py-1 text-center border ${pillTone.gray}`}>
                  <div className="text-sm font-bold leading-none">{fmtInt(reqByStatus?.['HUY'] ?? 0)}</div>
                  <div className="text-[10px] font-medium mt-0.5 leading-tight">Hủy</div>
                </div>
              </div>

              {/* QuocTe / NoiDia mini row */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-gray-50 rounded px-2 py-1 text-center border border-gray-200">
                  <span className="text-sm font-bold text-blue-600">{fmtInt(overview?.requests.byCustomerType.quocTe ?? 0)}</span>
                  <span className="text-[10px] text-gray-600 ml-1">QT</span>
                </div>
                <div className="bg-gray-50 rounded px-2 py-1 text-center border border-gray-200">
                  <span className="text-sm font-bold text-green-600">{fmtInt(overview?.requests.byCustomerType.noiDia ?? 0)}</span>
                  <span className="text-[10px] text-gray-600 ml-1">NĐ</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: BaoGia grouped */}
        <div
          onClick={() => setActiveTab('quotes')}
          className="bg-white rounded-lg shadow p-3 border border-gray-200 hover:shadow-md hover:border-green-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center text-gray-800">
              <Calculator className="w-4 h-4 mr-1.5 text-green-600" />
              Báo giá
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold text-green-600">{fmtInt(overview?.quotations.total ?? 0)}</span>
              {priceLockedCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5" title="Khóa giá">
                  <Lock className="w-2.5 h-2.5" />
                  {fmtInt(priceLockedCount)}
                </span>
              )}
            </div>
          </div>

          {isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-2">
              {/* 5 grouped pills */}
              <div className="grid grid-cols-5 gap-1.5">
                {quoGroups.map((g) => (
                  <div key={g.label} className={`rounded px-1 py-1 text-center border ${pillTone[g.tone]}`} title={g.label}>
                    <div className="text-sm font-bold leading-none">{fmtInt(g.count)}</div>
                    <div className="text-[10px] font-medium mt-0.5 leading-tight truncate">{g.short.split('/')[0]}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-gray-50 rounded px-2 py-1 text-center border border-gray-200">
                  <span className="text-sm font-bold text-blue-600">{fmtInt(overview?.quotations.byCustomerType.quocTe ?? 0)}</span>
                  <span className="text-[10px] text-gray-600 ml-1">QT</span>
                </div>
                <div className="bg-gray-50 rounded px-2 py-1 text-center border border-gray-200">
                  <span className="text-sm font-bold text-green-600">{fmtInt(overview?.quotations.byCustomerType.noiDia ?? 0)}</span>
                  <span className="text-[10px] text-gray-600 ml-1">NĐ</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: DonHang — total + VND + prod/pay */}
        <div
          onClick={() => setActiveTab('orders')}
          className="bg-white rounded-lg shadow p-3 border border-gray-200 hover:shadow-md hover:border-purple-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center text-gray-800">
              <ShoppingCart className="w-4 h-4 mr-1.5 text-purple-600" />
              Đơn hàng
            </h3>
            <div className="text-right">
              <div className="text-xl font-bold text-purple-600">{fmtInt(overview?.orders.total ?? 0)}</div>
              <div className="text-[10px] font-semibold text-gray-600 leading-tight">
                {(overview?.orders.totalValueVND ?? 0) > 0 ? fmtVND(Math.round(overview?.orders.totalValueVND ?? 0)) : '—'}
              </div>
            </div>
          </div>

          {isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-2">
              {/* Production pills */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 mb-1">SX</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {ordProdGroups.map((g) => (
                    <div key={g.label} className={`rounded px-1 py-1 text-center border ${pillTone[g.tone]}`}>
                      <div className="text-sm font-bold leading-none">{fmtInt(g.count)}</div>
                      <div className="text-[10px] font-medium mt-0.5 leading-tight">{g.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment pills */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 mb-1">TT</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className={`rounded px-1 py-1 text-center border ${pillTone.orange}`}>
                    <div className="text-sm font-bold leading-none">{fmtInt(ordPayChuaTT)}</div>
                    <div className="text-[10px] font-medium mt-0.5 leading-tight">Chưa đủ</div>
                  </div>
                  <div className={`rounded px-1 py-1 text-center border ${pillTone.green}`}>
                    <div className="text-sm font-bold leading-none">{fmtInt(ordPayDaTT)}</div>
                    <div className="text-[10px] font-medium mt-0.5 leading-tight">Đã đủ</div>
                  </div>
                </div>
              </div>

              {/* QuocTe/NoiDia */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-gray-50 rounded px-2 py-1 text-center border border-gray-200">
                  <span className="text-sm font-bold text-blue-600">{fmtInt(overview?.orders.byCustomerType.quocTe ?? 0)}</span>
                  <span className="text-[10px] text-gray-600 ml-1">QT</span>
                </div>
                <div className="bg-gray-50 rounded px-2 py-1 text-center border border-gray-200">
                  <span className="text-sm font-bold text-green-600">{fmtInt(overview?.orders.byCustomerType.noiDia ?? 0)}</span>
                  <span className="text-[10px] text-gray-600 ml-1">NĐ</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: ChiPhi (span 2) | ChoDuyet & CanhBao (span 1) — compact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Card 4: ChiPhi */}
        <div
          onClick={() => setActiveTab('costs')}
          className="bg-white rounded-lg shadow p-3 border border-gray-200 hover:shadow-md hover:border-orange-400 transition-all cursor-pointer lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center text-gray-800">
              <DollarSign className="w-4 h-4 mr-1.5 text-orange-600" />
              Chi phí
            </h3>
          </div>

          {isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-orange-50 rounded p-2 text-center border border-orange-200">
                  <div className="text-lg font-bold text-orange-600">{fmtInt(overview?.costs.generalTotal ?? 0)}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">CP chung</div>
                </div>
                <div className="bg-red-50 rounded p-2 text-center border border-red-200">
                  <div className="text-lg font-bold text-red-500">{fmtInt(overview?.costs.exportTotal ?? 0)}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">CP XK</div>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center border border-gray-200">
                  <div className="text-xs font-bold text-gray-800 leading-tight">
                    {overview?.costs.avgGiaThanhNgay != null ? fmtVND(Math.round(overview.costs.avgGiaThanhNgay)) : '—'}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-0.5">TB giá/ngày</div>
                </div>
              </div>

              {/* Top 2 loaiChiPhi */}
              {(overview?.costs.topLoaiChiPhi?.length ?? 0) > 0 ? (
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 mb-1">Top loại</div>
                  <div className="grid grid-cols-2 gap-2">
                    {overview!.costs.topLoaiChiPhi.map((it) => (
                      <div key={it.loaiChiPhi} className="bg-white rounded px-2 py-1.5 border border-gray-200 flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-gray-700 truncate" title={it.loaiChiPhi}>{it.loaiChiPhi}</span>
                        <span className="text-[10px] font-bold text-orange-600 whitespace-nowrap">{fmtInt(it.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-gray-400 text-center py-1.5 border border-dashed border-gray-200 rounded">Chưa có dữ liệu</div>
              )}
            </div>
          )}
        </div>

        {/* Card 5: ChoDuyet & CanhBao */}
        <div className="bg-white rounded-lg shadow p-3 border border-gray-200 hover:shadow-md hover:border-red-300 transition-all lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center text-gray-800">
              <AlertTriangle className="w-4 h-4 mr-1.5 text-red-500" />
              Duyệt & Cảnh báo
            </h3>
          </div>

          {isLoading ? (
            <Skeleton />
          ) : (
            <div className="space-y-2">
              {/* Cho duyet */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 mb-1">CHỜ DUYỆT</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveTab('overtime-review')}
                    className="bg-white rounded p-2 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-gray-700 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> Tăng ca
                      </span>
                      {overtimePending > 0 && (
                        <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">{overtimePending}</span>
                      )}
                    </div>
                    <div className={`text-base font-bold ${overtimePending > 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmtInt(overtimePending)}</div>
                  </button>
                  <button
                    onClick={() => setActiveTab('purchase-review')}
                    className="bg-white rounded p-2 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-gray-700 flex items-center gap-0.5">
                        <PackageCheck className="w-2.5 h-2.5" /> Mua hàng
                      </span>
                      {purchasePending > 0 && (
                        <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">{purchasePending}</span>
                      )}
                    </div>
                    <div className={`text-base font-bold ${purchasePending > 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmtInt(purchasePending)}</div>
                  </button>
                </div>
              </div>

              {/* Canh bao */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 mb-1">QUÁ HẠN</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-yellow-50 rounded p-2 text-center border border-yellow-200">
                    <div className="text-base font-bold text-yellow-600">{fmtInt(agingYellow)}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">Vàng ≥7d</div>
                  </div>
                  <div className="bg-red-50 rounded p-2 text-center border border-red-200">
                    <div className="text-base font-bold text-red-600">{fmtInt(agingRed)}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5">Đỏ ≥14d</div>
                  </div>
                </div>
              </div>

              <div
                className="text-[10px] text-gray-400 text-center border-t border-gray-100 pt-2"
                title="Số chờ duyệt và cảnh báo là tồn hiện tại, không áp dụng bộ lọc tháng/năm"
              >
                Tồn chờ — Không lọc tháng/năm
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
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                {tab.icon}
                {tab.name}
                {tab.id === 'overtime-review' && overtimePending > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">{overtimePending}</span>
                )}
                {tab.id === 'purchase-review' && purchasePending > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">{purchasePending}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === 'requests' && (
          <div className="p-6">
            <QuotationRequestManagement mode="pricing" />
          </div>
        )}
        {activeTab === 'quotes' && (
          <div className="p-6">
            <QuotationManagement />
          </div>
        )}
        {activeTab === 'orders' && (
          <div className="p-6">
            <OrderManagement />
          </div>
        )}
        {activeTab === 'costs' && (
          <div className="p-6">
            <ExportCostManagement />
          </div>
        )}
        {activeTab === 'overtime-review' && <OvertimePlanReviewTab />}
        {activeTab === 'purchase-review' && <PurchaseRequestReviewTab />}
      </div>
    </div>
  );
};

export default GeneralPricing;
