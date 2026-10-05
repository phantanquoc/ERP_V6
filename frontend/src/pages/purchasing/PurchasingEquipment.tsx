import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Settings,
  Users,
  ShoppingCart,
  ClipboardList,
  List,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
// chuaPhanLoai badge reserved
void (() => HelpCircle)();
void (() => CheckCircle)();
void (() => labelForPurchaseRequest)();
import PageHeader from '../../design-system/PageHeader';
import OrderManagement from '../../components/OrderManagement';
import PurchaseRequestSubTabs from '../../components/purchasing/PurchaseRequestSubTabs';
import SupplierTabPanel from '../../components/purchasing/SupplierTabPanel';
import purchaseRequestService from '../../services/purchaseRequestService';
import { supplierService, Supplier } from '../../services/supplierService';
import { can, isCachedPermissionsLoaded } from '../../utils/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';
import { labelForPurchaseRequest } from '../../utils/purchaseRequestLabel';
import ReplenishmentList from '../../components/ReplenishmentList';
import ReplenishmentDetailModal from '../../components/ReplenishmentDetailModal';
import ConfirmActualPriceModal from '../../components/ConfirmActualPriceModal';
import { useQueryClient } from '@tanstack/react-query';
import { replenishmentRequestKeys } from '../../hooks/useReplenishmentRequests';
import { supplyRequestKeys } from '../../hooks/useSupplyRequests';
import CancelWithReasonModal from '../../components/common/CancelWithReasonModal';
import PurchaseRequestDetailModal from '../../components/purchasing/PurchaseRequestDetailModal';
import SupplyRequestDetailModal from '../../components/purchasing/SupplyRequestDetailModal';
import PurchaseRequestEditModal from '../../components/purchasing/PurchaseRequestEditModal';
import PurchaseRequestQuickUpdateModal from '../../components/purchasing/PurchaseRequestQuickUpdateModal';
import { useSupplierOptions } from '../../hooks/useSuppliers';
import type { ReplenishmentRequest } from '../../services/replenishmentRequestService';
import replenishmentRequestService from '../../services/replenishmentRequestService';
import { useUrlTab, useUrlDetailId } from '../../hooks/useUrlState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { getApiErrorMessage } from '../../utils/getApiError';

type PurchaseRequest = import('../../types/purchaseRequest').PurchaseRequest;

const VALID_TABS = ['purchaseRequestList', 'replenishment', 'suppliers', 'orderList'] as const;
type TabType = typeof VALID_TABS[number];

/**
 * Query params OWNED by each tab.
 *
 * Every tab body below renders conditionally, so when the user switches away the
 * component holding a detail param unmounts and nothing is left to clean it up.
 * Declaring the owner here lets `useUrlTab` drop the param on the way out instead
 * of leaking it across tabs (`?tab=suppliers&purchaseRequestId=…`, which then
 * silently reopens that request when the user comes back to the list tab).
 *
 * `replenishmentRequestId` and `orderId` are declared up front: those lists are not
 * deep-linked yet, but the cleanup has to already cover them the moment they are,
 * and an undeclared key is never touched.
 *
 * Params NOT listed are page-level and must survive a tab switch — the month/year
 * period filter that drives the stat cards and chart above the tabs.
 */
const TAB_SCOPED_PARAMS: Record<TabType, readonly string[]> = {
  purchaseRequestList: ['purchaseRequestId'],
  replenishment: ['replenishmentRequestId'],
  suppliers: [],
  orderList: ['orderId'],
};

const PurchasingEquipment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // ?purchaseRequestId= — written when a row is opened, cleared when closed, so a
  // reload or a shared link reopens the same record instead of losing it.
  const { id: urlPrId, open: pushPrId, close: popPrId, syncingRef: prSyncing } = useUrlDetailId('purchaseRequestId');
  // ?replenishmentRequestId= — the YCBS queue (YC-BS-…) that replaced the old SHORTAGE-PR list.
  const { id: urlYbsId, open: pushYbsId, close: popYbsId, syncingRef: ybsSyncing } = useUrlDetailId('replenishmentRequestId');
  const [selectedYbs, setSelectedYbs] = useState<ReplenishmentRequest | null>(null);
  const [ybsModalOpen, setYbsModalOpen] = useState(false);
  const [supplyDetailId, setSupplyDetailId] = useState<string | null>(null);
  // RBAC gates via Rule Matrix with baseline fallback inside can() (mirror NVL page).
  const _roleEditBase = (user?.role as string) === UserRole.ADMIN || (user?.role as string) === UserRole.DEPARTMENT_HEAD || (user?.role as string) === UserRole.TEAM_LEAD;
  const canEditPR = isCachedPermissionsLoaded() ? can('purchase-requests', 'UPDATE', user?.role as string) : _roleEditBase;
  const canDeletePR = isCachedPermissionsLoaded() ? can('purchase-requests', 'DELETE', user?.role as string) : (user?.role as string) === UserRole.ADMIN;
  const canUpdatePR = isCachedPermissionsLoaded() ? can('purchase-requests', 'UPDATE', user?.role as string) : _roleEditBase;
  // Same fix as the NVL page: pricing table must load NCC independently of the
  // suppliers tab (the page-level `suppliers` is empty while on the PR list).
  const {
    data: pricingSuppliers,
    isLoading: pricingSuppliersLoading,
    isError: pricingSuppliersError,
    refetch: refetchPricingSuppliers,
  } = useSupplierOptions('Thiết bị');
  const { value: activeTab, set: setActiveTab } = useUrlTab<TabType>(
    'tab',
    (v): v is TabType => !!v && (VALID_TABS as readonly string[]).includes(v),
    'purchaseRequestList',
    TAB_SCOPED_PARAMS,
  );

  // Month/Year filter for stat cards
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Card stats state
  const [cardSupplierStats, setCardSupplierStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [cardPRStats, setCardPRStats] = useState({ total: 0, choBaoGia: 0, choDuyet: 0, daDuyet: 0, hoanThanh: 0, chuaPhanLoai: 0 });
  const [monthlyCounts, setMonthlyCounts] = useState<number[]>(Array(12).fill(0));
  const [trendPct, setTrendPct] = useState<number | null>(null);
  const [yearSpend, setYearSpend] = useState(0);
  const [replenishmentPending, setReplenishmentPending] = useState(0);
  const [purchaseSubTotal, setPurchaseSubTotal] = useState(0);
  const [purchaseRefreshKey, setPurchaseRefreshKey] = useState(0);
  const purchasePending = purchaseSubTotal || (cardPRStats.choBaoGia ?? 0) + (cardPRStats.choDuyet ?? 0);

  // Fetch supplier stats (all-time, no month/year filter)
  useEffect(() => {
    const fetchSupplierStats = async () => {
      try {
        const response = await supplierService.getAllSuppliers(1, 1000, undefined, 'Thiết bị') as any;
        const allSuppliers = response.data || [];
        setCardSupplierStats({
          total: allSuppliers.length,
          active: allSuppliers.filter((s: Supplier) => s.trangThai === 'Đang cung cấp').length,
          inactive: allSuppliers.filter((s: Supplier) => s.trangThai === 'Ngừng cung cấp').length,
        });
      } catch (error) {
        console.error('Error fetching supplier stats:', error);
      }
    };
    fetchSupplierStats();
  }, []);

  // Fetch purchase request stats (server-filtered by Thiết bị category + pagination.total)
  useEffect(() => {
    const fetchPRStats = async () => {
      try {
        const yearPage: any = await purchaseRequestService.getAllPurchaseRequests(1, 10000, undefined, undefined, selectedYear, { phanLoaiNCC: 'Thiết bị' });
        const yearList: any[] = yearPage?.data ?? [];
        const counts = Array(12).fill(0);
        for (const pr of yearList) {
          const m = new Date((pr as any).ngayYeuCau ?? (pr as any).createdAt).getMonth();
          if (m >= 0 && m < 12) counts[m]++;
        }
        setMonthlyCounts(counts);
        const cur = counts[selectedMonth - 1] ?? 0;
        const prev = counts[selectedMonth - 2] ?? 0;
        if (prev > 0) setTrendPct(Math.round(((cur - prev) / prev) * 100));
        else if (cur > 0) setTrendPct(null);
        else setTrendPct(0);
        setYearSpend(yearList.reduce((s: number, pr: any) => { const items = (pr as any).items ?? []; return s + items.reduce((a: number, it: any) => a + (Number(it.soLuong) || 0) * (Number(it.giaDuKien) || 0), 0); }, 0));
        const nvlList = yearList.filter((pr: any) => new Date(pr.ngayYeuCau ?? pr.createdAt).getMonth() + 1 === selectedMonth);
        const nvlRes: any = await purchaseRequestService.getAllPurchaseRequests(1, 1, undefined, selectedMonth, selectedYear, { phanLoaiNCC: 'Thiết bị' });
        const nvlTotal = nvlRes?.pagination?.total;
        setCardPRStats({
          total: typeof nvlTotal === 'number' ? nvlTotal : nvlList.length,
          choBaoGia: nvlList.filter((pr: any) => pr.trangThai === 'Chờ báo giá').length,
          choDuyet: nvlList.filter((pr: any) => pr.trangThai === 'Chờ duyệt').length,
          daDuyet: nvlList.filter((pr: any) => pr.trangThai === 'Đã duyệt').length,
          hoanThanh: nvlList.filter((pr: any) => pr.trangThai === 'Hoàn thành').length,
          chuaPhanLoai: 0,
        });
      } catch (error) {
        console.error('Error fetching PR stats:', error);
      }
    };
    fetchPRStats();
  }, [selectedMonth, selectedYear]);

  // Pending YCBS for tab badge — matches ReplenishmentList's active filter
  useEffect(() => {
    let cancelled = false;
    replenishmentRequestService.getAllReplenishmentRequests(1, 1, undefined, undefined, undefined, { trangThai: 'Chờ báo giá' } as any)
      .then((res: any) => {
        const total = res?.pagination?.total ?? res?.data?.pagination?.total ?? 0;
        if (!cancelled) setReplenishmentPending(Number(total) || 0);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ybsModalOpen]);

  useEffect(() => {
    if (prSyncing.current) { prSyncing.current = false; return; }
    if (!urlPrId) return;
    let cancelled = false;
    setActiveTab('purchaseRequestList');
    purchaseRequestService.getPurchaseRequestById(urlPrId).then((res) => {
      if (!cancelled && (res as any).data) setSelectedPurchaseRequest((res as any).data as PurchaseRequest);
    }).catch((err) => { console.error('Error loading purchase request from URL:', err); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPrId]);

  // Open a specific YCBS from ?replenishmentRequestId= (notification deep-link or
  // reload). Lands on the replenishment tab and opens the pricing/convert modal.
  useEffect(() => {
    if (ybsSyncing.current) { ybsSyncing.current = false; return; }
    if (!urlYbsId) return;
    let cancelled = false;
    setActiveTab('replenishment');
    replenishmentRequestService.getReplenishmentRequestById(urlYbsId).then((res: any) => {
      const row = (res?.data?.data ?? res?.data) as ReplenishmentRequest | undefined;
      if (!cancelled && row) { setSelectedYbs(row); setYbsModalOpen(true); }
    }).catch((err) => {
      console.error('Error loading replenishment request from URL:', err);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlYbsId]);

  // State for purchase requests — replaced by PurchaseRequestSubTabs
  void (() => PurchaseRequestSubTabs)();
  void (() => setPurchaseRefreshKey)();
  // keep name for legacy call sites
  const fetchPurchaseRequests: () => Promise<void> = async () => { setPurchaseRefreshKey((k) => k + 1); };

  // State for modals
  // kept: selectedPurchaseRequest etc below
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [cancelPrTarget, setCancelPrTarget] = useState<PurchaseRequest | null>(null);
  const [showCancelPrModal, setShowCancelPrModal] = useState(false);
  const [cancellingPr, setCancellingPr] = useState(false);
  const [editingPurchaseRequest, setEditingPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [quickUpdateTarget, setQuickUpdateTarget] = useState<PurchaseRequest | null>(null);
  // Giá thực tế: mở từ chi tiết YCMH ở trạng thái Đã duyệt, hoặc từ nút
  // "Đã mua xong" khi còn dòng chưa chốt (setCompleteAfterPriceConfirm=true).
  const [showConfirmActualPrice, setShowConfirmActualPrice] = useState(false);
  const [completeAfterPriceConfirm, setCompleteAfterPriceConfirm] = useState(false);
  const [confirmActualPriceTarget, setConfirmActualPriceTarget] = useState<import('../../components/ConfirmActualPriceModal').ConfirmPriceTarget | null>(null);
  // Per-item pricing state — required so a "Chờ báo giá" replenishment PR can be
  // quoted (NCC + đơn giá per line) and submitted for approval from this page.
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
    variant?: 'primary' | 'warning' | 'danger' | 'info';
    confirmLabel?: string;
    hideCancel?: boolean;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const openPurchaseRequestDetail = useCallback((item: PurchaseRequest) => {
    pushPrId(item.id);
    setSelectedPurchaseRequest(item);
  }, [pushPrId]);

  const closePurchaseRequestDetail = useCallback(() => {
    setSelectedPurchaseRequest(null);
    popPrId();
  }, [popPrId]);

  const handleCancelPurchaseRequest = useCallback((item: PurchaseRequest) => {
    setCancelPrTarget(item);
    setShowCancelPrModal(true);
  }, []);

  const confirmCancelPurchaseRequest = useCallback(async (lyDoHuy: string) => {
    if (!cancelPrTarget) return;
    setCancellingPr(true);
    try {
      await purchaseRequestService.cancelPurchaseRequest(cancelPrTarget.id, lyDoHuy);
      toast.success('Đã hủy yêu cầu mua hàng');
      setShowCancelPrModal(false);
      setCancelPrTarget(null);
      fetchPurchaseRequests();
      // A cancelled YCMH was born from a YCBS (and that one from a YCCB shortage):
      // the upstream queues still show the ticket as pending until their caches drop.
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: supplyRequestKeys.all });
      if (selectedPurchaseRequest?.id === cancelPrTarget.id) {
        setSelectedPurchaseRequest(null);
      }
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'Lỗi khi hủy yêu cầu mua hàng'));
      throw error;
    } finally {
      setCancellingPr(false);
    }
  }, [cancelPrTarget, selectedPurchaseRequest, fetchPurchaseRequests, queryClient]);

  // True when every line of an approved YCMH already carries an actual price.
  // Mirror of the NVL page — drives the "chưa chốt giá" hint.
  const isActualPriceConfirmed = (item: any): boolean => {
    const lines = (item?.items ?? []) as Array<{ giaThucTe?: number | null }>;
    return lines.length > 0 && lines.every((l) => l.giaThucTe != null && Number(l.giaThucTe) > 0);
  };

  const openEditPurchaseRequest = useCallback((item: PurchaseRequest) => {
    setEditingPurchaseRequest(item);
  }, []);

  const closeEditPurchaseRequest = useCallback(() => {
    setEditingPurchaseRequest(null);
  }, []);

  const openQuickUpdate = useCallback((item: PurchaseRequest) => {
    setQuickUpdateTarget(item);
  }, []);




  // Validate every line has NCC + đơn giá, then flip "Chờ báo giá" → "Chờ duyệt".
  const handleSubmitForApproval = useCallback((item: any) => {
    const missing = (item.items || []).filter(
      (it: any) => !it.nhaCungCapId || it.giaDuKien === null || it.giaDuKien === undefined || Number(it.giaDuKien) <= 0
    );
    if (missing.length > 0) {
      setConfirmAction({
        title: 'Chưa thể gửi duyệt',
        message:
          `Còn ${missing.length} hàng hóa chưa có nhà cung cấp hoặc đơn giá:\n` +
          missing.map((it: any) => `• ${it.tenHangHoa}`).join('\n') +
          `\n\nVui lòng mở "Chỉnh sửa" để bổ sung.`,
        hideCancel: true,
        confirmLabel: 'Đã hiểu',
        variant: 'warning',
        onConfirm: () => setConfirmAction(null),
      });
      return;
    }
    const tongTien = (item.items || []).reduce(
      (sum: number, it: any) => sum + (Number(it.soLuong) || 0) * (Number(it.giaDuKien) || 0),
      0
    );
    setConfirmAction({
      title: 'Gửi duyệt yêu cầu mua hàng',
      message: `Gửi yêu cầu ${item.maYeuCau} lên admin phê duyệt?\nTổng tiền dự kiến: ${tongTien.toLocaleString('vi-VN')}đ`,
      variant: 'warning',
      confirmLabel: 'Gửi duyệt',
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await purchaseRequestService.submitForApproval(item.id);
          setConfirmAction(null);
          fetchPurchaseRequests();
        } catch (error: any) {
          alert(getApiErrorMessage(error, 'Lỗi khi gửi duyệt'));
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }, [fetchPurchaseRequests]);

  const handleDeletePurchaseRequest = useCallback((id: string) => {
    setConfirmAction({
      title: 'Xóa yêu cầu mua hàng',
      message: 'Bạn có chắc muốn xóa yêu cầu mua hàng này? Hành động không thể hoàn tác.',
      variant: 'danger',
      confirmLabel: 'Xóa',
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await purchaseRequestService.deletePurchaseRequest(id);
          setConfirmAction(null);
          fetchPurchaseRequests();
        } catch (error: any) {
          alert(getApiErrorMessage(error, 'Lỗi khi xóa'));
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }, [fetchPurchaseRequests]);

  const handleCompletePurchaseRequest = useCallback((item: any) => {
    if (item.trangThai === 'Hoàn thành') {
      setConfirmAction({
        title: 'Đã hoàn thành',
        message: 'Yêu cầu mua hàng này đã hoàn thành.',
        hideCancel: true,
        confirmLabel: 'OK',
        variant: 'info',
        onConfirm: () => setConfirmAction(null),
      });
      return;
    }
    // "Đã mua xong" IS the actual-price confirmation now: when any line still
    // lacks giaThucTe, open ConfirmActualPriceModal and flip to Hoàn thành only
    // inside its onSuccess (after the price write succeeds). When every line
    // already carries a price, keep the plain one-click completion.
    const priceReady = isActualPriceConfirmed(item);
    if (!priceReady) {
      setConfirmActualPriceTarget(item);
      setShowConfirmActualPrice(true);
      setCompleteAfterPriceConfirm(true);
      return;
    }
    setConfirmAction({
      title: 'Xác nhận đã mua xong',
      message: 'Giá thực tế đã chốt đủ. Đóng phiếu (Hoàn thành) và thông báo cho kho chuẩn bị nhập hàng?',
      variant: 'primary',
      confirmLabel: 'Đã mua xong',
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await purchaseRequestService.updatePurchaseRequest(item.id, { trangThai: 'Hoàn thành' });
          setConfirmAction(null);
          fetchPurchaseRequests();
        } catch (error: any) {
          alert(getApiErrorMessage(error, 'Lỗi khi cập nhật trạng thái'));
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }, [fetchPurchaseRequests]);

    const tabs = useMemo(() => [
    { id: 'purchaseRequestList', name: 'Danh sách mua hàng', icon: <List className="w-4 h-4" />, count: purchasePending },
    { id: 'replenishment', name: 'Yêu cầu bổ sung', icon: <ShoppingCart className="w-4 h-4" />, count: replenishmentPending },
    { id: 'suppliers', name: 'Nhà cung cấp Thiết bị', icon: <Users className="w-4 h-4" /> },
    { id: 'orderList', name: 'Danh sách đơn hàng', icon: <ClipboardList className="w-4 h-4" /> },
  ], [purchasePending, replenishmentPending]);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Phòng mua Thiết bị"
        description="Quản lý nhà cung cấp, đơn hàng mua, hợp đồng và đầu tư thiết bị máy móc"
        icon={<Settings className="w-6 h-6 text-blue-600" />}
        actions={
          <div className="flex items-center gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>T{i + 1}</option>))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Array.from({ length: 4 }, (_, i) => { const y = 2023 + i; return (<option key={y} value={y}>{y}</option>); })}
            </select>
          </div>
        }
      />

      {/* ── Dashboard: 2-stat-row (NCC + Danh sách mua hàng KPI) + Bar chart 12 tháng ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card NCC */}
        <div
          onClick={() => setActiveTab('suppliers')}
          className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Nhà cung cấp · Thiết bị</h3>
                <div className="text-2xl font-bold text-gray-900 tabular-nums">{cardSupplierStats.total}</div>
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">Đang cung cấp {cardSupplierStats.active}</div>
              <div className="text-gray-400">Ngừng {cardSupplierStats.inactive}</div>
            </div>
          </div>
        </div>

        {/* Card YC mua hàng — KPI bar (pending / completed / tổng) */}
        <div
          onClick={() => setActiveTab('purchaseRequestList')}
          className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all cursor-pointer p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <List className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Yêu cầu mua hàng · Thiết bị · <span className="text-gray-900">{cardPRStats.total} trong năm {selectedYear}</span>
                </h3>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-medium">Chờ báo giá {cardPRStats.choBaoGia}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">Chờ duyệt {cardPRStats.choDuyet}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">Đã duyệt {cardPRStats.daDuyet}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">Hoàn thành {cardPRStats.hoanThanh}</span>
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <span className="text-xs text-gray-400">T{selectedMonth} so với T{selectedMonth - 1 || 12}</span>
              {trendPct === null ? (
                <span className="text-xs font-medium text-gray-500">Mới phát sinh</span>
              ) : trendPct === 0 ? (
                <span className="text-xs font-medium text-gray-500">— Không đổi</span>
              ) : (
                <span className={`inline-flex items-center gap-0.5 text-sm font-bold ${trendPct > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trendPct > 0 ? '▲' : '▼'} {Math.abs(trendPct)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart — số YC theo 12 tháng trong năm (một trục Y, một series) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-800">Số yêu cầu theo tháng — {selectedYear} · Thiết bị</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Tổng trong năm: <span className="font-semibold text-gray-700 tabular-nums">{cardPRStats.total}</span> YC
              {yearSpend > 0 && (
                <> · Tổng chi dự kiến: <span className="font-semibold text-gray-700 tabular-nums">{yearSpend.toLocaleString('vi-VN')}đ</span></>
              )}
              {' · '}Tháng đã chọn: <span className="font-semibold text-gray-700 tabular-nums">{monthlyCounts[selectedMonth - 1] ?? 0}</span> YC
            </p>
          </div>
          <span className="text-[11px] px-2 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">Một trục Y · Một series</span>
        </div>
        {cardPRStats.total === 0 && monthlyCounts.every((v) => v === 0) ? (
          <div className="text-center py-8 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">Chưa có yêu cầu mua hàng nào trong năm {selectedYear}.</div>
        ) : (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Array.from({ length: 12 }, (_, i) => ({ month: `T${i + 1}`, count: monthlyCounts[i] ?? 0 }))}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                barCategoryGap="22%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: 12 }}
                  formatter={(value: any) => [`${value} YC`, 'Số lượng']}
                  labelFormatter={(label: string) => `${label}/${selectedYear}`}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <Cell key={i} fill={i + 1 === selectedMonth ? '#7c3aed' : '#c4b5fd'} stroke={i + 1 === selectedMonth ? '#5b21b6' : 'transparent'} strokeWidth={i + 1 === selectedMonth ? 1 : 0} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#7c3aed' }} /> Tháng đã chọn</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#c4b5fd' }} /> Tháng khác</span>
          <span className="text-slate-400">· Màu theo thực thể (tháng), không theo thứ hạng</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex w-max min-w-full gap-1 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
              }`}
            >
              {tab.icon}
              {tab.name}
              {(tab as { count?: number }).count != null && (tab as { count?: number }).count! > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white min-w-[18px]">{(tab as { count?: number }).count}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
          {activeTab === 'suppliers' && <SupplierTabPanel phanLoaiNCC="Thiết bị" accent="purple" />}

          {/* DANH SÁCH ĐƠN HÀNG */}
          {activeTab === 'orderList' && <OrderManagement hideHeader={true} />}

          {/* DANH SÁCH MUA HÀNG — sub tabs requests/purchased */}
          {activeTab === 'purchaseRequestList' && (
            <PurchaseRequestSubTabs
              phanLoaiNCC="Thiết bị"
              canEditPR={canEditPR}
              canDeletePR={canDeletePR}
              canUpdatePR={canUpdatePR}
              onOpenDetail={openPurchaseRequestDetail as any}
              onEdit={openEditPurchaseRequest as any}
              onDelete={handleDeletePurchaseRequest as any}
              onSubmitForApproval={handleSubmitForApproval as any}
              onComplete={handleCompletePurchaseRequest as any}
              onQuickUpdate={openQuickUpdate as any}
              refreshKey={purchaseRefreshKey}
              onCountsChange={setPurchaseSubTotal}
            />
          )}

          {activeTab === 'replenishment' && (
            <ReplenishmentList
              onOpenDetail={(ybs) => { setSelectedYbs(ybs); pushYbsId(ybs.id); setYbsModalOpen(true); }}
              onOpenSupplyRequest={(id) => setSupplyDetailId(id)}
            />
          )}

        {/* YCBS detail — purchasing fills giá/NCC then converts to YCMH */}
        <ReplenishmentDetailModal
          isOpen={ybsModalOpen}
          onClose={() => { setYbsModalOpen(false); setSelectedYbs(null); popYbsId(); }}
          ybs={selectedYbs}
          onOpenSupplyRequest={(id) => setSupplyDetailId(id)}
          onConverted={() => {
            popYbsId();
            // The new YCMH belongs to the purchase-request list; refresh it when visible.
            if (activeTab === 'purchaseRequestList') fetchPurchaseRequests();
          }}
        />
        <SupplyRequestDetailModal supplyRequestId={supplyDetailId} isOpen={!!supplyDetailId} onClose={() => setSupplyDetailId(null)} />

        <PurchaseRequestDetailModal
          isOpen={!!selectedPurchaseRequest}
          onClose={closePurchaseRequestDetail}
          purchaseRequest={selectedPurchaseRequest}
          canEdit={canEditPR}
          canUpdate={canUpdatePR}
          isActualPriceConfirmed={isActualPriceConfirmed}
          onEdit={(pr) => { closePurchaseRequestDetail(); openEditPurchaseRequest(pr); }}
          onCancel={(pr) => { closePurchaseRequestDetail(); handleCancelPurchaseRequest(pr); }}
          onConfirmPrice={(pr) => { setConfirmActualPriceTarget(pr); setCompleteAfterPriceConfirm(true); setShowConfirmActualPrice(true); }}
          onQuickUpdate={(pr) => { closePurchaseRequestDetail(); openQuickUpdate(pr); }}
          onViewInboundPlan={(pr) => {
            const kh = pr.inboundPlan?.maKeHoach;
            toast(kh ? `Kế hoạch nhập kho: ${kh}` : 'Chưa có kế hoạch nhập kho', { icon: '📦' });
          }}
        />

        {/* Xác nhận giá thực tế cho YCMH đã duyệt (hàng về). Khi bật từ nút
            "Đã mua xong" (completeAfterPriceConfirm), đóng phiếu sau khi giá được lưu. */}
        <ConfirmActualPriceModal
          isOpen={showConfirmActualPrice}
          thenComplete={completeAfterPriceConfirm}
          onClose={() => { setShowConfirmActualPrice(false); setConfirmActualPriceTarget(null); setCompleteAfterPriceConfirm(false); }}
          purchaseRequest={confirmActualPriceTarget}
          onSuccess={() => {
            setCompleteAfterPriceConfirm(false);
            setConfirmActualPriceTarget(null);
            setShowConfirmActualPrice(false);
            fetchPurchaseRequests();
            closePurchaseRequestDetail();
          }}
        />

        <CancelWithReasonModal
          isOpen={showCancelPrModal}
          onClose={() => { if (!cancellingPr) { setShowCancelPrModal(false); setCancelPrTarget(null); } }}
          onConfirm={confirmCancelPurchaseRequest}
          loading={cancellingPr}
          ticketLabel={cancelPrTarget?.maYeuCau ?? ''}
          description="Hủy yêu cầu mua hàng này sẽ chuyển trạng thái sang Đã hủy và thông báo tới người tạo. Nếu phiếu sinh từ YCBS, YCBS cha sẽ quay lại Chờ báo giá."
        />

        <PurchaseRequestQuickUpdateModal
          isOpen={!!quickUpdateTarget}
          onClose={() => setQuickUpdateTarget(null)}
          purchaseRequest={quickUpdateTarget}
          onSubmit={async (id, { formData, file }) => {
            await purchaseRequestService.updatePurchaseRequest(id, { ...formData as any, file: file || undefined } as any);
            fetchPurchaseRequests();
            if (selectedPurchaseRequest?.id === id) {
              try {
                const res: any = await purchaseRequestService.getPurchaseRequestById(id);
                if (res?.data) setSelectedPurchaseRequest(res.data as PurchaseRequest);
              } catch {}
            }
          }}
        />

        <PurchaseRequestEditModal
          isOpen={!!editingPurchaseRequest}
          onClose={closeEditPurchaseRequest}
          purchaseRequest={editingPurchaseRequest}
          pricingSuppliers={pricingSuppliers as any}
          pricingSuppliersLoading={pricingSuppliersLoading}
          pricingSuppliersError={pricingSuppliersError}
          onRetryPricingSuppliers={() => refetchPricingSuppliers()}
          user={user as any}
          onSubmit={async (id, { items, formData, file }) => {
            const cleanedItems = items.map((it: any) => ({
              ...(it.id ? { id: it.id } : {}),
              phanLoai: it.phanLoai, tenHangHoa: it.tenHangHoa,
              soLuong: typeof it.soLuong === 'number' ? it.soLuong : parseFloat(String(it.soLuong)) || 0,
              donViTinh: it.donViTinh, nhaCungCapId: it.nhaCungCapId || null,
              giaDuKien: it.giaDuKien === null || it.giaDuKien === undefined || String(it.giaDuKien).trim() === '' ? null : typeof it.giaDuKien === 'number' ? it.giaDuKien : parseFloat(String(it.giaDuKien)) || null,
            }));
            const dataToSend: any = { ...formData, items: cleanedItems, file: file || undefined };
            await purchaseRequestService.updatePurchaseRequest(id, dataToSend);
            fetchPurchaseRequests();
          }}
          onSubmitForApproval={async (id, { items, formData, file }) => {
            const cleanedItems = items.map((it: any) => ({
              ...(it.id ? { id: it.id } : {}),
              phanLoai: it.phanLoai, tenHangHoa: it.tenHangHoa,
              soLuong: typeof it.soLuong === 'number' ? it.soLuong : parseFloat(String(it.soLuong)) || 0,
              donViTinh: it.donViTinh, nhaCungCapId: it.nhaCungCapId || null,
              giaDuKien: typeof it.giaDuKien === 'number' ? it.giaDuKien : parseFloat(String(it.giaDuKien ?? 0)) || null,
            }));
            await purchaseRequestService.updatePurchaseRequest(id, { ...formData, items: cleanedItems, file: file || undefined });
            await purchaseRequestService.submitForApproval(id);
            fetchPurchaseRequests();
          }}
        />

        {/* Generic confirm modal — replaces window.confirm across the page */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-sm max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{confirmAction.title}</h3>
              <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{confirmAction.message}</p>
              <div className="flex justify-end gap-3">
                {!confirmAction.hideCancel && (
                  <button
                    onClick={() => { if (!confirmLoading) setConfirmAction(null); }}
                    disabled={confirmLoading}
                    className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Hủy
                  </button>
                )}
                <button
                  onClick={() => confirmAction.onConfirm()}
                  disabled={confirmLoading}
                  className={`px-4 py-2 text-white rounded-md disabled:opacity-60 disabled:cursor-not-allowed ${
                    confirmAction.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                    confirmAction.variant === 'warning' ? 'bg-orange-600 hover:bg-orange-700' :
                    confirmAction.variant === 'info' ? 'bg-blue-600 hover:bg-blue-700' :
                    'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {confirmLoading ? 'Đang xử lý...' : (confirmAction.confirmLabel ?? 'Xác nhận')}
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
};

export default PurchasingEquipment;