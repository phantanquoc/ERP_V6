import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  ArrowUp,
  ArrowDown,
  FileText,
  ClipboardList,
  Warehouse
} from 'lucide-react';
import SupplyRequestManagement from '../../components/SupplyRequestManagement';
import WarehouseUnifiedView from '../../components/WarehouseUnifiedView';
import FactoryOverview from '../../components/FactoryOverview';
import WarehouseReceiptTab from '../../components/WarehouseReceiptTab';
import WarehouseIssueTab from '../../components/WarehouseIssueTab';
import InternationalProductManagement from '../../components/InternationalProductManagement';
import InventoryOverview from '../../components/InventoryOverview';
import warehouseService, { Warehouse as WarehouseType } from '../../services/warehouseService';
import warehouseReceiptService from '../../services/warehouseReceiptService';
import warehouseIssueService from '../../services/warehouseIssueService';
import supplyRequestService from '../../services/supplyRequestService';
import { useWarehouses } from '../../hooks';

type TabType = 'inbound' | 'outbound' | 'supplyRequest' | 'warehouseManagement' | 'products';
const VALID_TABS: TabType[] = ['inbound', 'outbound', 'supplyRequest', 'warehouseManagement', 'products'];

type WarehouseSubTab = 'overview' | 'management' | 'inventory';

const WarehouseManagementWithSubTabs: React.FC<{ initialWarehouseId?: string }> = ({ initialWarehouseId }) => {
  const [subTab, setSubTab] = useState<WarehouseSubTab>('overview');
  const [pickedWarehouseId, setPickedWarehouseId] = useState<string | undefined>(initialWarehouseId);
  const { data: warehousesData } = useWarehouses();
  const warehouses = (warehousesData as WarehouseType[] | undefined) ?? [];

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setSubTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Sơ đồ tổng thể
        </button>
        <button
          onClick={() => setSubTab('management')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'management'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Quản lý & Bản đồ
        </button>
        <button
          onClick={() => setSubTab('inventory')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tồn kho
        </button>
      </div>
      {subTab === 'overview' && (
        <FactoryOverview
          warehouses={warehouses}
          selectedWarehouseId={pickedWarehouseId ?? null}
          onSelectWarehouse={(id) => {
            setPickedWarehouseId(id);
            setSubTab('management');
          }}
        />
      )}
      {subTab === 'management' && <WarehouseUnifiedView initialWarehouseId={pickedWarehouseId ?? initialWarehouseId} />}
      {subTab === 'inventory' && <InventoryOverview />}
    </div>
  );
};

const ProductionWarehouse = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabParam = searchParams.get('tab');
    return VALID_TABS.includes(tabParam as TabType) ? tabParam as TabType : 'warehouseManagement';
  });

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab]);

  // Overview data states
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [supplyRequests, setSupplyRequests] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Period filter state
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);

  // Fetch overview data — resilient: each call independent via Promise.allSettled
  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoadingOverview(true);
      try {
        const [warehouseRes, receiptRes, issueRes, supplyRes] = await Promise.allSettled([
          warehouseService.getAllWarehouses(),
          warehouseReceiptService.getAllWarehouseReceipts(),
          warehouseIssueService.getAllWarehouseIssues(),
          supplyRequestService.getAllSupplyRequests(1, 1000)
        ]);

        if (warehouseRes.status === 'fulfilled') {
          setWarehouses((warehouseRes.value as any).data?.data || (warehouseRes.value as any).data || []);
        } else {
          console.error('Error fetching warehouses:', warehouseRes.reason);
        }

        if (receiptRes.status === 'fulfilled') {
          setReceipts((receiptRes.value as any).data?.data || (receiptRes.value as any).data || []);
        } else {
          console.error('Error fetching receipts:', receiptRes.reason);
        }

        if (issueRes.status === 'fulfilled') {
          setIssues((issueRes.value as any).data?.data || (issueRes.value as any).data || []);
        } else {
          console.error('Error fetching issues:', issueRes.reason);
        }

        if (supplyRes.status === 'fulfilled') {
          setSupplyRequests((supplyRes.value as any).data?.data || (supplyRes.value as any).data || []);
        } else {
          console.error('Error fetching supply requests:', supplyRes.reason);
        }
      } catch (error) {
        console.error('Error in overview fetch:', error);
      } finally {
        setLoadingOverview(false);
      }
    };
    fetchOverviewData();
  }, []);

  // Calculate overview stats
  const totalWarehouses = warehouses.length;
  const emptyWarehouses = warehouses.filter(w => !w.lots || w.lots.length === 0).length;
  const emptyLots = warehouses.reduce((acc, w) => {
    if (!w.lots) return acc;
    return acc + w.lots.filter(lot => !lot.lotProducts || lot.lotProducts.length === 0).length;
  }, 0);

  // Distinct in-stock item count: lotProduct rows with soLuong > 0
  const inStockItemCount = warehouses.reduce((acc, w) => {
    if (!w.lots) return acc;
    return acc + w.lots.reduce((lotAcc, lot) => {
      if (!lot.lotProducts) return lotAcc;
      return lotAcc + lot.lotProducts.filter((lp: any) => lp.soLuong > 0).length;
    }, 0);
  }, 0);

  // Total inventory value: sum of (soLuong * giaThanh) across all lotProducts
  const totalInventoryValue = warehouses.reduce((acc, w) => {
    if (!w.lots) return acc;
    return acc + w.lots.reduce((lotAcc, lot) => {
      if (!lot.lotProducts) return lotAcc;
      return lotAcc + lot.lotProducts.reduce((lpAcc: number, lp: any) => {
        return lpAcc + ((lp.soLuong || 0) * (lp.giaThanh || 0));
      }, 0);
    }, 0);
  }, 0);

  const formattedInventoryValue = new Intl.NumberFormat('vi-VN').format(totalInventoryValue) + ' đ';

  // Period-filtered receipt/issue counts for cards
  const filteredReceiptsForCards = receipts.filter((r) => {
    if (filterMonth || filterYear) {
      const date = new Date(r.ngayNhap || r.createdAt);
      if (filterMonth && (date.getMonth() + 1) !== filterMonth) return false;
      if (filterYear && date.getFullYear() !== filterYear) return false;
    }
    return true;
  });
  const filteredIssuesForCards = issues.filter((r) => {
    if (filterMonth || filterYear) {
      const date = new Date(r.ngayXuat || r.createdAt);
      if (filterMonth && (date.getMonth() + 1) !== filterMonth) return false;
      if (filterYear && date.getFullYear() !== filterYear) return false;
    }
    return true;
  });

  const totalReceipts = filteredReceiptsForCards.length;
  const totalIssues = filteredIssuesForCards.length;

  // Top products by slip count (period-filtered)
  const topReceiptProducts = useMemo(() => {
    const countMap: Record<string, number> = {};
    filteredReceiptsForCards.forEach((r) => {
      const name = r.tenSanPham || r.productName;
      if (name) countMap[name] = (countMap[name] || 0) + 1;
    });
    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [filteredReceiptsForCards]);

  const topIssueProducts = useMemo(() => {
    const countMap: Record<string, number> = {};
    filteredIssuesForCards.forEach((r) => {
      const name = r.tenSanPham || r.productName;
      if (name) countMap[name] = (countMap[name] || 0) + 1;
    });
    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [filteredIssuesForCards]);

  const totalSupplyRequests = supplyRequests.length;

  // Funnel groups for supply requests (not period-scoped)
  const supplyFunnel = useMemo(() => {
    const pendingStatuses = new Set(['Chờ xử lý', 'Chưa cung cấp', 'Đã duyệt mua', 'Chờ duyệt', 'Đã duyệt']);
    const inTransitStatuses = new Set(['Đã mua hàng']);
    const fulfilledStatuses = new Set(['Đã cung cấp', 'Đã cấp đủ', 'Đã cấp một phần']);

    let pending = 0;
    let inTransit = 0;
    let fulfilled = 0;
    let highPriorityPending = 0;

    supplyRequests.forEach((r) => {
      const status = r.trangThai || '';
      if (pendingStatuses.has(status)) {
        pending++;
        if (r.mucDoUuTien === 'Cao') highPriorityPending++;
      } else if (inTransitStatuses.has(status)) {
        inTransit++;
        if (r.mucDoUuTien === 'Cao') highPriorityPending++;
      } else if (fulfilledStatuses.has(status)) {
        fulfilled++;
      }
      // Unknown statuses are silently skipped
    });

    return { pending, inTransit, fulfilled, highPriorityPending };
  }, [supplyRequests]);

  // Top in-stock items per warehouse (not merged across warehouses)
  const topInStockItems = useMemo(() => {
    const stockMap: Record<string, { warehouseId: string; warehouseName: string; name: string; qty: number; unit: string }> = {};

    warehouses.forEach((w) => {
      if (!w.lots) return;
      w.lots.forEach((lot: any) => {
        if (!lot.lotProducts) return;
        lot.lotProducts.forEach((lp: any) => {
          const name = lp.internationalProduct?.tenSanPham;
          const qty = lp.soLuong || 0;
          const unit = lp.donViTinh || '';
          if (!name || qty <= 0) return;
          const key = `${w.id}|||${name}|||${unit}`;
          if (!stockMap[key]) {
            stockMap[key] = { warehouseId: w.id, warehouseName: w.tenKho, name, qty: 0, unit };
          }
          stockMap[key].qty += qty;
        });
      });
    });

    return Object.values(stockMap)
      .filter((item) => item.qty > 0)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [warehouses]);

  // State for navigating to a specific warehouse in WarehouseManagement
  const [initialWarehouseId, setInitialWarehouseId] = useState<string | undefined>(undefined);

  const openWarehouse = (warehouseId: string) => {
    setInitialWarehouseId(warehouseId);
    goToTab('warehouseManagement');
  };

  // State for modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);



  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedItem(null);
  };

  const pendingWarehouseCount = supplyRequests.filter(r => r.trangThai === 'Đã mua hàng').length;

  // Derive available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    receipts.forEach((r) => {
      const y = new Date(r.ngayNhap || r.createdAt).getFullYear();
      if (y) years.add(y);
    });
    issues.forEach((r) => {
      const y = new Date(r.ngayXuat || r.createdAt).getFullYear();
      if (y) years.add(y);
    });
    // Fallback: current + last year
    const now = new Date().getFullYear();
    years.add(now);
    years.add(now - 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [receipts, issues]);

  const tabs = [
    { id: 'warehouseManagement', name: 'Quản lý kho', icon: <Package className="w-4 h-4" /> },
    { id: 'products', name: 'Danh sách hàng hóa', icon: <Package className="w-4 h-4" /> },
    { id: 'inbound', name: 'Nhập kho', icon: <ArrowDown className="w-4 h-4" /> },
    { id: 'outbound', name: 'Xuất kho', icon: <ArrowUp className="w-4 h-4" /> },
    {
      id: 'supplyRequest',
      name: 'Yêu cầu cung cấp',
      icon: <FileText className="w-4 h-4" />,
      badge: pendingWarehouseCount > 0 ? pendingWarehouseCount : null,
    }
  ];

  const tabStripRef = useRef<HTMLDivElement>(null);

  const goToTab = (tab: TabType) => {
    setActiveTab(tab);
    requestAnimationFrame(() => tabStripRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const clickableProps = (tab: TabType) => ({
    role: 'button' as const,
    tabIndex: 0,
    onClick: () => goToTab(tab),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goToTab(tab);
      }
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Warehouse className="w-6 h-6 text-blue-600" />
          Quản lý kho
        </h1>
        <p className="text-sm text-gray-500 mt-1">Quản lý kho, nhập xuất kho và yêu cầu cung cấp</p>
      </div>

        {/* Period Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-gray-700">Lọc theo:</label>
          <select
            value={filterMonth ?? ''}
            onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả tháng</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select
            value={filterYear ?? ''}
            onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả năm</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Card 1: Tổng quan tồn kho */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Package className="w-5 h-5 mr-2 text-blue-600" />
                Tổng quan tồn kho
              </h3>
            </div>
            <div className="space-y-3">
              <div {...clickableProps('warehouseManagement')} className="bg-blue-50 rounded-lg p-3 hover:bg-blue-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-blue-300 cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Số lượng kho</span>
                  <span className="text-2xl font-bold text-blue-600">{loadingOverview ? '...' : totalWarehouses}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div {...clickableProps('warehouseManagement')} className="bg-yellow-50 rounded-lg p-2 text-center hover:bg-yellow-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-yellow-300 cursor-pointer">
                  <div className="text-xl font-bold text-yellow-600">{loadingOverview ? '...' : emptyWarehouses}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Kho trống</div>
                </div>
                <div {...clickableProps('warehouseManagement')} className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-gray-300 cursor-pointer">
                  <div className="text-xl font-bold text-gray-600">{loadingOverview ? '...' : emptyLots}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Lô trống</div>
                </div>
                <div {...clickableProps('warehouseManagement')} className="bg-green-50 rounded-lg p-2 text-center hover:bg-green-100 hover:shadow-md hover:scale-110 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="text-xl font-bold text-green-600">{loadingOverview ? '...' : inStockItemCount}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Có hàng</div>
                </div>
              </div>
              <div {...clickableProps('warehouseManagement')} className="bg-indigo-50 rounded-lg p-3 border-2 border-indigo-200 cursor-pointer hover:bg-indigo-100 hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng giá trị tồn</span>
                  <span className="text-lg font-bold text-indigo-700">{loadingOverview ? '...' : formattedInventoryValue}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Tổng quan nhập xuất kho */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-green-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <ArrowDown className="w-5 h-5 mr-2 text-green-600" />
                Tổng quan nhập xuất kho
              </h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div {...clickableProps('inbound')} className="bg-green-50 rounded-lg p-3 hover:bg-green-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-green-300 cursor-pointer">
                  <div className="flex flex-col items-center">
                    <ArrowDown className="w-5 h-5 text-green-600 mb-1" />
                    <span className="text-2xl font-bold text-green-600">{loadingOverview ? '...' : totalReceipts}</span>
                    <span className="text-xs text-gray-600 mt-0.5">Phiếu nhập</span>
                  </div>
                </div>
                <div {...clickableProps('outbound')} className="bg-red-50 rounded-lg p-3 hover:bg-red-100 hover:shadow-md hover:scale-105 transition-all duration-200 border-2 border-red-300 cursor-pointer">
                  <div className="flex flex-col items-center">
                    <ArrowUp className="w-5 h-5 text-red-600 mb-1" />
                    <span className="text-2xl font-bold text-red-600">{loadingOverview ? '...' : totalIssues}</span>
                    <span className="text-xs text-gray-600 mt-0.5">Phiếu xuất</span>
                  </div>
                </div>
              </div>
              {!loadingOverview && (totalReceipts > 0 || totalIssues > 0) ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div {...clickableProps('inbound')} className="space-y-1 cursor-pointer rounded-lg p-1 hover:bg-green-50 transition-all duration-200">
                    <div className="font-medium text-gray-600">Top nhập:</div>
                    {topReceiptProducts.length > 0 ? topReceiptProducts.map(([name, count]) => (
                      <div key={name} className="text-gray-700 truncate" title={name}>{name} · {count} phiếu</div>
                    )) : <div className="text-gray-400 italic">Không có phiếu trong kỳ</div>}
                  </div>
                  <div {...clickableProps('outbound')} className="space-y-1 cursor-pointer rounded-lg p-1 hover:bg-red-50 transition-all duration-200">
                    <div className="font-medium text-gray-600">Top xuất:</div>
                    {topIssueProducts.length > 0 ? topIssueProducts.map(([name, count]) => (
                      <div key={name} className="text-gray-700 truncate" title={name}>{name} · {count} phiếu</div>
                    )) : <div className="text-gray-400 italic">Không có phiếu trong kỳ</div>}
                  </div>
                </div>
              ) : !loadingOverview ? (
                <div className="text-xs text-gray-400 italic text-center">Không có phiếu trong kỳ</div>
              ) : null}
            </div>
          </div>

          {/* Card 3: Tổng quan yêu cầu cung cấp — funnel */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <ClipboardList className="w-5 h-5 mr-2 text-purple-600" />
                Yêu cầu cung cấp
              </h3>
            </div>
            <div className="space-y-3">
              <div {...clickableProps('supplyRequest')} className="bg-purple-50 rounded-lg p-3 border-2 border-purple-300 cursor-pointer hover:bg-purple-100 hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-700">Tổng yêu cầu</span>
                  <span className="text-2xl font-bold text-purple-600">{loadingOverview ? '...' : totalSupplyRequests}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div {...clickableProps('supplyRequest')} className="bg-orange-50 rounded-lg p-2 text-center border-2 border-orange-300 cursor-pointer hover:bg-orange-100 hover:shadow-md transition-all duration-200">
                  <div className="text-xl font-bold text-orange-600">{loadingOverview ? '...' : supplyFunnel.pending}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Chờ xử lý</div>
                </div>
                <div {...clickableProps('supplyRequest')} className="bg-amber-50 rounded-lg p-2 text-center border-2 border-amber-300 cursor-pointer hover:bg-amber-100 hover:shadow-md transition-all duration-200">
                  <div className="text-xl font-bold text-amber-600">{loadingOverview ? '...' : supplyFunnel.inTransit}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đang mua</div>
                </div>
                <div {...clickableProps('supplyRequest')} className="bg-green-50 rounded-lg p-2 text-center border-2 border-green-300 cursor-pointer hover:bg-green-100 hover:shadow-md transition-all duration-200">
                  <div className="text-xl font-bold text-green-600">{loadingOverview ? '...' : supplyFunnel.fulfilled}</div>
                  <div className="text-xs text-gray-600 mt-0.5">Đã cung cấp</div>
                </div>
              </div>
              {!loadingOverview && supplyFunnel.highPriorityPending > 0 && (
                <div {...clickableProps('supplyRequest')} className="bg-red-50 rounded-lg px-3 py-2 border border-red-200 flex items-center gap-2 cursor-pointer hover:bg-red-100 hover:shadow-md transition-all duration-200">
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white min-w-[18px]">
                    {supplyFunnel.highPriorityPending}
                  </span>
                  <span className="text-xs font-medium text-red-700">ưu tiên cao đang chờ</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Hàng hóa còn tồn */}
          <div className="bg-white rounded-xl shadow-lg p-5 border-2 border-gray-300 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-emerald-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center text-gray-800">
                <Package className="w-5 h-5 mr-2 text-emerald-600" />
                Hàng hóa còn tồn
              </h3>
            </div>
            <div className="space-y-2">
              {loadingOverview ? (
                <div className="text-sm text-gray-400">Đang tải...</div>
              ) : topInStockItems.length > 0 ? (
                topInStockItems.map((item, idx) => (
                  <div
                    key={`${item.warehouseId}-${item.name}-${item.unit}-${idx}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openWarehouse(item.warehouseId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openWarehouse(item.warehouseId);
                      }
                    }}
                    className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200 cursor-pointer hover:bg-emerald-100 hover:shadow-md transition-all duration-200"
                  >
                    <div className="min-w-0 mr-2">
                      <span className="text-xs font-medium text-gray-700 truncate block" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-[10px] text-gray-500">Kho: {item.warehouseName}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 whitespace-nowrap">
                      {new Intl.NumberFormat('vi-VN').format(item.qty)} {item.unit}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 italic text-center py-4">Chưa có hàng tồn</div>
              )}
            </div>
          </div>
        </div>

      {/* Tabs */}
      <div ref={tabStripRef} className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.name}
              {tab.badge && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white min-w-[18px]">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'warehouseManagement' && (
        <WarehouseManagementWithSubTabs initialWarehouseId={initialWarehouseId} />
      )}
      {activeTab === 'products' && <InternationalProductManagement />}
      {activeTab === 'inbound' && <WarehouseReceiptTab month={filterMonth} year={filterYear} />}
      {activeTab === 'outbound' && <WarehouseIssueTab month={filterMonth} year={filterYear} />}
      {activeTab === 'supplyRequest' && <SupplyRequestManagement />}

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
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ProductionWarehouse;
