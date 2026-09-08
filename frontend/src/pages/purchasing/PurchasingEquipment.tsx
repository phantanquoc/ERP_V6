import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings,
  Users,
  Plus,
  Search,
  Download,
  Edit,
  Eye,
  Trash2,
  Phone,
  ClipboardList,
  List,
  X,
  Globe,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
// chuaPhanLoai badge reserved
void (() => HelpCircle)();
import PageHeader from '../../design-system/PageHeader';
import FileUpload from '../../components/FileUpload';
import OrderManagement from '../../components/OrderManagement';
import purchaseRequestService from '../../services/purchaseRequestService';
import { supplierService, Supplier, CreateSupplierData, UpdateSupplierData } from '../../services/supplierService';
import { parseNumberInput } from '../../utils/numberInput';
import { can } from '../../utils/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { labelForPurchaseRequest } from '../../utils/purchaseRequestLabel';
import ReplenishmentList from '../../components/ReplenishmentList';
import { useUrlTab, useUrlDetailId } from '../../hooks/useUrlState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

interface PurchaseRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  maYeuCau: string;
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  ghiChuMuaHang?: string;
  fileKemTheo?: string;
  trangThai: string;
  nguoiDuyet?: string;
  ngayDuyet?: string;
  supplyRequestId?: string;
  sourceType?: string;
  createdAt: string;
  updatedAt: string;
  items?: { id: string; tenHangHoa: string; soLuong: number; donViTinh: string; phanLoai: string; giaDuKien?: number; nhaCungCapId?: string | null }[];
}

const VALID_TABS = ['purchaseRequestList', 'replenishment', 'suppliers', 'orderList'] as const;
type TabType = typeof VALID_TABS[number];

const PurchasingEquipment = () => {
  const { user } = useAuth();
  // ?purchaseRequestId= — written when a row is opened, cleared when closed, so a
  // reload or a shared link reopens the same record instead of losing it.
  const { id: urlPrId, open: pushPrId, close: popPrId, syncingRef: prSyncing } = useUrlDetailId('purchaseRequestId');
  const { value: activeTab, set: setActiveTab } = useUrlTab<TabType>(
    'tab',
    (v): v is TabType => !!v && (VALID_TABS as readonly string[]).includes(v),
    'purchaseRequestList',
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

  // State for purchase requests
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [purchaseRequestLoading, setPurchaseRequestLoading] = useState(false);
  const [purchaseRequestSearch, setPurchaseRequestSearch] = useState('');
  const [purchaseRequestPage, setPage] = useState(1);
  const [purchaseRequestTotalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (activeTab === 'purchaseRequestList') {
      fetchPurchaseRequests();
    }
  }, [activeTab, purchaseRequestPage, purchaseRequestSearch]);

  const fetchPurchaseRequests = async () => {
    try {
      setPurchaseRequestLoading(true);
      const response: any = await purchaseRequestService.getAllPurchaseRequests(purchaseRequestPage, 10, purchaseRequestSearch || undefined, undefined, undefined, { phanLoaiNCC: 'Thiết bị' });
      setPurchaseRequests(response.data as PurchaseRequest[] || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching purchase requests:', error);
    } finally {
      setPurchaseRequestLoading(false);
    }
  };

  // State for suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierTotalPages, setSupplierTotalPages] = useState(1);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isEditSupplierModalOpen, setIsEditSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  // Two isolated form states so Add's temporary maNhaCungCap / phanLoaiNCC
  // never leaks into an Edit PUT and trips a unique-constraint error.
  const [addSupplierForm, setAddSupplierForm] = useState<Partial<CreateSupplierData>>({});
  const [editSupplierForm, setEditSupplierForm] = useState<Partial<CreateSupplierData>>({});
  const [supplierFormLoading, setSupplierFormLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'suppliers') {
      fetchSuppliers();
    }
  }, [activeTab, supplierPage]);

  const fetchSuppliers = async () => {
    try {
      setSupplierLoading(true);
      const response = await supplierService.getAllSuppliers(supplierPage, 10, supplierSearch || undefined, 'Thiết bị');
      setSuppliers(response.data as Supplier[] || []);
      setSupplierTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setSupplierLoading(false);
    }
  };

  const handleSearchSuppliers = () => {
    setSupplierPage(1);
    // fetchSuppliers runs via useEffect([activeTab, supplierPage]) — don't call directly to avoid double fetch
  };

  const openAddSupplierModal = async () => {
    // Resolve the creator from AuthContext (single source of truth) — reading
    // localStorage with the wrong path silently produced employeeId='' and a FK failure.
    if (!user?.employeeId) {
      alert('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.');
      return;
    }
    try {
      const codeRes = await supplierService.generateCode('Thiết bị') as any;
      const code = codeRes.data?.code || codeRes.code;
      setAddSupplierForm({
        maNhaCungCap: code,
        tenNhaCungCap: '',
        loaiCungCap: '',
        quocGia: 'Việt Nam',
        website: '',
        nguoiLienHe: '',
        soDienThoai: '',
        emailLienHe: '',
        diaChi: '',
        khaNang: '',
        loaiHinh: 'Sản xuất',
        trangThai: 'Đang cung cấp',
        phanLoaiNCC: 'Thiết bị',
        doanhChi: 0,
        employeeId: user.employeeId,
      });
      setIsAddSupplierModalOpen(true);
    } catch (error) {
      console.error('Error generating supplier code:', error);
    }
  };

  const openEditSupplierModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setAddSupplierForm({
      tenNhaCungCap: supplier.tenNhaCungCap,
      loaiCungCap: supplier.loaiCungCap,
      quocGia: supplier.quocGia,
      website: supplier.website || '',
      nguoiLienHe: supplier.nguoiLienHe,
      soDienThoai: supplier.soDienThoai,
      emailLienHe: supplier.emailLienHe,
      diaChi: supplier.diaChi,
      khaNang: supplier.khaNang || '',
      loaiHinh: supplier.loaiHinh,
      trangThai: supplier.trangThai,
      doanhChi: supplier.doanhChi || 0,
    });
    setIsEditSupplierModalOpen(true);
  };

  const handleAddSupplier = async () => {
    try {
      setSupplierFormLoading(true);
      await supplierService.createSupplier(addSupplierForm as CreateSupplierData);
      setIsAddSupplierModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('Error creating supplier:', error);
      alert((error as Error).message || 'Đã xảy ra lỗi');
    } finally {
      setSupplierFormLoading(false);
    }
  };

  const handleEditSupplier = async () => {
    if (!editingSupplier) return;
    try {
      setSupplierFormLoading(true);
      await supplierService.updateSupplier(editingSupplier.id, editSupplierForm as UpdateSupplierData);
      setIsEditSupplierModalOpen(false);
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (error) {
      console.error('Error updating supplier:', error);
      alert((error as Error).message || 'Đã xảy ra lỗi');
    } finally {
      setSupplierFormLoading(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await supplierService.deleteSupplier(id);
      setDeleteConfirmId(null);
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Lỗi khi xóa nhà cung cấp');
    }
  };

  // State for modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [editingPurchaseRequest, setEditingPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PurchaseRequest>>({});
  // Per-item pricing state — required so a "Chờ báo giá" replenishment PR can be
  // quoted (NCC + đơn giá per line) and submitted for approval from this page.
  const [editItems, setEditItems] = useState<Array<{
    id?: string;
    phanLoai: string;
    tenHangHoa: string;
    soLuong: number;
    donViTinh: string;
    nhaCungCapId: string | null;
    giaDuKien: number | null;
  }>>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState<{ api?: string }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
    variant?: 'primary' | 'warning' | 'danger' | 'info';
    confirmLabel?: string;
    hideCancel?: boolean;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const openDetailModal = useCallback((item: any) => { setSelectedItem(item); setIsDetailModalOpen(true); }, []);
  const closeDetailModal = useCallback(() => { setIsDetailModalOpen(false); setSelectedItem(null); }, []);
  // Per-supplier purchase history (loaded on detail open)
  const [historyStats, setHistoryStats] = useState<{ totalOrders: number; totalSpend: number; pendingOrders: number; lastOrderAt: string | null } | null>(null);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDetailTab, setHistoryDetailTab] = useState<'info' | 'history'>('info');

  useEffect(() => {
    if (isDetailModalOpen && selectedItem?.id) {
      setHistoryDetailTab('info');
      setHistoryLoading(true);
      setHistoryStats(null);
      setHistoryOrders([]);
      Promise.all([
        supplierService.getPurchaseStats(selectedItem.id).then((r: any) => r?.data ?? r).catch(() => null),
        supplierService.getPurchaseRequestsBySupplier(selectedItem.id, 1, 5).then((r: any) => r?.data ?? r?.data ?? []).catch(() => []),
      ]).then(([stats, orders]) => {
        if (stats) setHistoryStats({ totalOrders: stats.totalOrders ?? 0, totalSpend: stats.totalSpend ?? 0, pendingOrders: stats.pendingOrders ?? 0, lastOrderAt: stats.lastOrderAt ?? null });
        if (Array.isArray(orders)) setHistoryOrders(orders);
      }).finally(() => setHistoryLoading(false));
    }
  }, [isDetailModalOpen, selectedItem?.id]);

  const openPurchaseRequestDetail = useCallback((item: PurchaseRequest) => {
    pushPrId(item.id);
    setSelectedPurchaseRequest(item);
  }, [pushPrId]);

  const closePurchaseRequestDetail = useCallback(() => {
    setSelectedPurchaseRequest(null);
    popPrId();
  }, [popPrId]);

  const openEditPurchaseRequest = useCallback((item: PurchaseRequest) => {
    const currentUserName = user ? `${user.lastName} ${user.firstName}`.trim() : '';
    const today = new Date().toISOString();
    setEditingPurchaseRequest(item);
    setSelectedFile(null);
    setEditFormErrors({});
    setEditFormData({
      trangThai: item.trangThai,
      ghiChuMuaHang: (item as any).ghiChuMuaHang || '',
      fileKemTheo: item.fileKemTheo || '',
      nguoiDuyet: item.nguoiDuyet || currentUserName,
      ngayDuyet: item.ngayDuyet || today,
    });
    // Load per-item pricing state (fallback to legacy single-row if no items)
    if (item.items && item.items.length > 0) {
      setEditItems(item.items.map((it) => ({
        id: it.id,
        phanLoai: it.phanLoai,
        tenHangHoa: it.tenHangHoa,
        soLuong: it.soLuong,
        donViTinh: it.donViTinh,
        nhaCungCapId: it.nhaCungCapId || null,
        giaDuKien: it.giaDuKien ?? null,
      })));
    } else {
      setEditItems([{
        phanLoai: item.phanLoai || '',
        tenHangHoa: item.tenHangHoa || '',
        soLuong: item.soLuong || 0,
        donViTinh: item.donViTinh || '',
        nhaCungCapId: null,
        giaDuKien: null,
      }]);
    }
  }, [user]);

  const closeEditPurchaseRequest = useCallback(() => {
    setEditingPurchaseRequest(null);
    setEditFormData({});
    setEditItems([]);
    setSelectedFile(null);
    setEditFormErrors({});
  }, []);

  const updateEditItem = useCallback((index: number, patch: Partial<typeof editItems[number]>) => {
    setEditItems((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }, []);

  const tongTienEdit = useMemo(() => {
    return editItems.reduce((sum, it) => {
      const qty = typeof it.soLuong === 'number' ? it.soLuong : parseFloat(String(it.soLuong)) || 0;
      const gia = typeof it.giaDuKien === 'number' ? it.giaDuKien : parseFloat(String(it.giaDuKien ?? 0)) || 0;
      return sum + qty * gia;
    }, 0);
  }, [editItems]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchaseRequest) return;
    setEditFormErrors({});
    setEditLoading(true);
    try {
      const cleanedItems = editItems.map((it) => ({
        ...(it.id ? { id: it.id } : {}),
        phanLoai: it.phanLoai,
        tenHangHoa: it.tenHangHoa,
        soLuong: typeof it.soLuong === 'number' ? it.soLuong : parseFloat(String(it.soLuong)) || 0,
        donViTinh: it.donViTinh,
        nhaCungCapId: it.nhaCungCapId || null,
        giaDuKien:
          it.giaDuKien === null || it.giaDuKien === undefined || String(it.giaDuKien).trim() === ''
            ? null
            : typeof it.giaDuKien === 'number'
              ? it.giaDuKien
              : parseFloat(String(it.giaDuKien)) || null,
      }));
      await purchaseRequestService.updatePurchaseRequest(editingPurchaseRequest.id, {
        ...editFormData,
        items: cleanedItems,
        file: selectedFile || undefined,
      } as any);
      alert('Cập nhật thành công!');
      closeEditPurchaseRequest();
      fetchPurchaseRequests();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Lỗi hệ thống, vui lòng thử lại';
      setEditFormErrors({ api: message });
    } finally {
      setEditLoading(false);
    }
  };

  // Validate every line has NCC + đơn giá, then flip "Chờ báo giá" → "Chờ duyệt".
  const handleSubmitForApproval = useCallback((item: any) => {
    const missing = (item.items || []).filter(
      (it: any) => !it.nhaCungCapId || it.giaDuKien === null || it.giaDuKien === undefined || Number(it.giaDuKien) <= 0
    );
    if (missing.length > 0) {
      setConfirmAction({
        title: 'Chưa thể gửi duyệt',
        message:
          `Còn ${missing.length} sản phẩm chưa có nhà cung cấp hoặc đơn giá:\n` +
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
          alert(error.response?.data?.message || 'Lỗi khi gửi duyệt');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }, [purchaseRequestPage, purchaseRequestSearch]);

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
          alert(error.response?.data?.message || 'Lỗi khi xóa');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }, [purchaseRequestPage, purchaseRequestSearch]);

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
    setConfirmAction({
      title: 'Xác nhận đã mua xong',
      message: 'Đã mua hàng xong? Hệ thống sẽ thông báo cho kho chuẩn bị nhập hàng.',
      variant: 'primary',
      confirmLabel: 'Xác nhận',
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          await purchaseRequestService.updatePurchaseRequest(item.id, { trangThai: 'Hoàn thành' });
          setConfirmAction(null);
          fetchPurchaseRequests();
        } catch (error: any) {
          alert(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  }, [purchaseRequestPage, purchaseRequestSearch]);

    const tabs = useMemo(() => [
    { id: 'purchaseRequestList', name: 'Danh sách mua hàng', icon: <List className="w-4 h-4" /> },
    { id: 'replenishment', name: 'Yêu cầu bổ sung', icon: <List className="w-4 h-4" /> },
    { id: 'suppliers', name: 'Nhà cung cấp Thiết bị', icon: <Users className="w-4 h-4" /> },
    { id: 'orderList', name: 'Danh sách đơn hàng', icon: <ClipboardList className="w-4 h-4" /> },
  ], []);


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
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
          {/* NHÀ CUNG CẤP THIẾT BỊ */}
          {activeTab === 'suppliers' && (
            <div>
              <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <form onSubmit={(e) => { e.preventDefault(); handleSearchSuppliers(); }} className="relative w-full sm:w-auto flex items-center gap-2">
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm nhà cung cấp..."
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-64"
                      />
                    </div>
                    <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                      <Search className="h-4 w-4" /> Tìm kiếm
                    </button>
                  </form>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={async () => {
                      try { await supplierService.exportToExcel({ search: supplierSearch || undefined, phanLoaiNCC: 'Thiết bị' }); }
                      catch (error) { console.error('Error exporting to Excel:', error); alert('Lỗi khi xuất Excel'); }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Download className="h-4 w-4" /> Xuất Excel
                  </button>
                  <button onClick={openAddSupplierModal} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                    <Plus className="h-4 w-4" /> Thêm nhà cung cấp
                  </button>
                </div>
              </div>

              {/* Table */}
              {supplierLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
                </div>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-8"><p className="text-gray-500">Chưa có nhà cung cấp nào</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NCC</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên NCC</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại cung cấp</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quốc gia</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Liên hệ</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại hình</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh chi</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NV tạo</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {suppliers.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{(supplierPage - 1) * 10 + index + 1}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-purple-600">{item.maNhaCungCap}</td>
                          <td className="px-3 py-3 text-sm text-gray-900 max-w-xs truncate" title={item.tenNhaCungCap}>{item.tenNhaCungCap}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{item.loaiCungCap}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center"><Globe className="w-3 h-3 mr-1 text-gray-400" />{item.quocGia}</div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{item.nguoiLienHe}</div>
                              <div className="text-xs text-gray-500 flex items-center"><Phone className="w-3 h-3 mr-1" />{item.soDienThoai}</div>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.loaiHinh === 'Sản xuất' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'}`}>
                              {item.loaiHinh}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.trangThai === 'Đang cung cấp' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {item.trangThai}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{item.doanhChi ? `${(item.doanhChi / 1000000).toFixed(0)}M` : '-'}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{item.employee?.user ? `${item.employee.user.lastName} ${item.employee.user.firstName}` : '-'}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                              <button onClick={() => openDetailModal(item)} className="text-purple-600 hover:text-purple-800" title="Xem chi tiết"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => openEditSupplierModal(item)} className="text-green-600 hover:text-green-800" title="Chỉnh sửa"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => setDeleteConfirmId(item.id)} className="text-red-600 hover:text-red-800" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {supplierTotalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4 pb-4">
                  <button onClick={() => setSupplierPage(p => Math.max(1, p - 1))} disabled={supplierPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">Trước</button>
                  <span className="text-sm text-gray-600">Trang {supplierPage} / {supplierTotalPages}</span>
                  <button onClick={() => setSupplierPage(p => Math.min(supplierTotalPages, p + 1))} disabled={supplierPage === supplierTotalPages} className="px-3 py-1 border rounded disabled:opacity-50">Sau</button>
                </div>
              )}
            </div>
          )}

          {/* DANH SÁCH ĐƠN HÀNG */}
          {activeTab === 'orderList' && <OrderManagement hideHeader={true} />}

          {/* DANH SÁCH MUA HÀNG */}
          {activeTab === 'purchaseRequestList' && (
            <div>
              <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input type="text" placeholder="Tìm kiếm yêu cầu mua hàng..." value={purchaseRequestSearch}
                      onChange={(e) => setPurchaseRequestSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-64"
                    />
                  </div>
                  <button onClick={fetchPurchaseRequests} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                    <Search className="h-4 w-4" /> Tìm kiếm
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={async () => {
                      try { await purchaseRequestService.exportToExcel({ search: purchaseRequestSearch || undefined }); }
                      catch (error) { console.error('Error exporting to Excel:', error); alert('Lỗi khi xuất Excel'); }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Download className="h-4 w-4" /> Xuất Excel
                  </button>
                </div>
              </div>

              {/* Table */}
              {purchaseRequestLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
                </div>
              ) : purchaseRequests.length === 0 ? (
                <div className="text-center py-8"><p className="text-gray-500">Chưa có yêu cầu mua hàng nào</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã yêu cầu</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày yêu cầu</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mức độ ưu tiên</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchaseRequests.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{(purchaseRequestPage - 1) * 10 + index + 1}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                            {item.maYeuCau}
                            {item.sourceType === 'SHORTAGE' && item.trangThai === 'Chờ báo giá' && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 align-middle">
                                {labelForPurchaseRequest(item)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.ngayYeuCau).toLocaleDateString('vi-VN')}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.tenNhanVien}</td>
                          <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                            {item.items && item.items.length > 0 ? (
                              <div className="space-y-0.5">
                                {item.items.map((subItem: any, i: number) => (
                                  <div key={i} className="text-xs">
                                    <span className="font-medium">{subItem.tenHangHoa}</span>
                                    <span className="text-gray-400 ml-1">x{subItem.soLuong} {subItem.donViTinh}</span>
                                    {subItem.giaDuKien && <span className="text-green-600 ml-1">{Number(subItem.giaDuKien).toLocaleString('vi-VN')}đ</span>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">{item.tenHangHoa || '-'}</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.mucDoUuTien === 'Cao' ? 'bg-red-100 text-red-800' :
                              item.mucDoUuTien === 'Trung bình' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>{item.mucDoUuTien}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.trangThai === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-800' :
                              item.trangThai === 'Đã duyệt' ? 'bg-green-100 text-green-800' :
                              item.trangThai === 'Từ chối' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>{item.trangThai}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                              <button onClick={() => openPurchaseRequestDetail(item)} className="text-purple-600 hover:text-purple-800" title="Xem chi tiết"><Eye className="w-4 h-4" /></button>
                              {can('purchase-requests','UPDATE', user?.role) && (
                                <button onClick={() => openEditPurchaseRequest(item)} className="text-green-600 hover:text-green-800" title="Chỉnh sửa"><Edit className="w-4 h-4" /></button>
                              )}
                              {can('purchase-requests','DELETE', user?.role) && (
                                <button onClick={() => handleDeletePurchaseRequest(item.id)} className="text-red-600 hover:text-red-800" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                              )}
                              {item.trangThai === 'Chờ báo giá' && (
                                <button
                                  onClick={() => handleSubmitForApproval(item)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded hover:bg-orange-100 border border-orange-200 text-xs font-medium"
                                  title="Gửi admin phê duyệt (phải điền NCC + đơn giá trước)"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Gửi duyệt
                                </button>
                              )}
                              {item.trangThai === 'Đã duyệt' && (
                                <button
                                  onClick={() => handleCompletePurchaseRequest(item)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 border border-emerald-200 text-xs font-medium"
                                  title="Đã mua hàng xong - Thông báo kho nhập hàng"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Đã mua xong
                                </button>
                              )}
                              {item.trangThai === 'Hoàn thành' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Đã hoàn thành
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {purchaseRequestTotalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button onClick={() => setPage(prev => Math.max(prev - 1, 1))} disabled={purchaseRequestPage === 1}
                    className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Trước</button>
                  <span className="text-sm text-gray-600">Trang {purchaseRequestPage} / {purchaseRequestTotalPages}</span>
                  <button onClick={() => setPage(prev => Math.min(prev + 1, purchaseRequestTotalPages))} disabled={purchaseRequestPage === purchaseRequestTotalPages}
                    className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Sau</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'replenishment' && (
            <ReplenishmentList
              onOpenDetail={(pr) => setSelectedPurchaseRequest(pr)}
              onOpenSupplyRequest={(id) => window.open(`/supply-requests?supplyRequestId=${id}`, '_blank')}
            />
          )}

        {/* Supplier Detail Modal */}
        {isDetailModalOpen && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-sm w-full max-w-2xl md:max-w-4xl lg:max-w-6xl mx-2 sm:mx-4 max-h-[calc(100vh-1rem)] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Chi tiết nhà cung cấp</h2>
                  <button onClick={closeDetailModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Mã NCC</label><p className="text-sm font-semibold text-purple-600">{selectedItem.maNhaCungCap}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Tên NCC</label><p className="text-sm text-gray-900">{selectedItem.tenNhaCungCap}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Loại cung cấp</label><p className="text-sm text-gray-900">{selectedItem.loaiCungCap}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Quốc gia</label><p className="text-sm text-gray-900">{selectedItem.quocGia}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Người liên hệ</label><p className="text-sm text-gray-900">{selectedItem.nguoiLienHe}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">SĐT</label><p className="text-sm text-gray-900">{selectedItem.soDienThoai}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Email</label><p className="text-sm text-gray-900">{selectedItem.emailLienHe}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Loại hình</label><p className="text-sm text-gray-900">{selectedItem.loaiHinh}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2"><label className="block text-sm font-medium text-gray-500 mb-1">Địa chỉ</label><p className="text-sm text-gray-900">{selectedItem.diaChi}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Trạng thái</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedItem.trangThai === 'Đang cung cấp' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{selectedItem.trangThai}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Doanh chi</label><p className="text-sm text-gray-900">{selectedItem.doanhChi ? `${(selectedItem.doanhChi).toLocaleString('vi-VN')} VNĐ` : '-'}</p></div>
                  {selectedItem.website && <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2"><label className="block text-sm font-medium text-gray-500 mb-1">Website</label><a href={selectedItem.website} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline">{selectedItem.website}</a></div>}
                  {selectedItem.khaNang && <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2"><label className="block text-sm font-medium text-gray-500 mb-1">Khả năng cung cấp</label><p className="text-sm text-gray-900">{selectedItem.khaNang}</p></div>}
                </div>
                {/* Audit trail */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Người tạo: <span className="font-medium text-gray-800">{selectedItem.employee?.user ? `${selectedItem.employee.user.lastName} ${selectedItem.employee.user.firstName}`.trim() : selectedItem.employeeId ? `#${String(selectedItem.employeeId).slice(0,8)}` : '—'}</span></span>
                  <span>Ngày tạo: <span className="font-medium text-gray-800">{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString('vi-VN') : '—'}</span></span>
                  <span>Cập nhật: <span className="font-medium text-gray-800">{selectedItem.updatedAt ? new Date(selectedItem.updatedAt).toLocaleDateString('vi-VN') : '—'}</span></span>
                  <span>Phân loại NCC: <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${selectedItem.phanLoaiNCC === 'Thiết bị' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>{selectedItem.phanLoaiNCC ?? 'NVL'}</span></span>
                </div>

                {/* Detail tab switch: Thông tin / Lịch sử mua hàng */}
                <div className="mt-4 flex gap-2 border-b border-gray-200">
                  <button onClick={() => setHistoryDetailTab('info' as const)} className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${historyDetailTab === 'info' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Thông tin</button>
                  <button onClick={() => setHistoryDetailTab('history' as const)} className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${historyDetailTab === 'history' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Lịch sử mua hàng</button>
                </div>

                {historyDetailTab === 'history' && (
                  <div className="mt-4 space-y-3">
                    {historyLoading ? (
                      <div className="text-center py-4 text-sm text-gray-500">Đang tải lịch sử...</div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div className="bg-gray-50 p-3 rounded-lg"><div className="text-xs text-gray-500">Tổng đơn hàng</div><div className="text-lg font-bold text-gray-800">{historyStats?.totalOrders ?? 0}</div></div>
                          <div className="bg-gray-50 p-3 rounded-lg"><div className="text-xs text-gray-500">Tổng chi (dự toán)</div><div className="text-lg font-bold text-green-700">{historyStats?.totalSpend ? `${Number(historyStats.totalSpend).toLocaleString('vi-VN')}đ` : '0đ'}</div></div>
                          <div className="bg-gray-50 p-3 rounded-lg"><div className="text-xs text-gray-500">Chưa xong</div><div className="text-lg font-bold text-orange-600">{historyStats?.pendingOrders ?? 0}</div></div>
                          <div className="bg-gray-50 p-3 rounded-lg"><div className="text-xs text-gray-500">Đơn gần nhất</div><div className="text-xs font-medium text-gray-800">{historyStats?.lastOrderAt ? new Date(historyStats.lastOrderAt).toLocaleDateString('vi-VN') : '—'}</div></div>
                        </div>
                        {historyOrders.length > 0 ? (
                          <div className="border border-gray-200 rounded-md overflow-x-auto">
                            <table className="w-full min-w-[520px] text-sm">
                              <thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="px-3 py-1.5 text-left">Mã</th><th className="px-3 py-1.5 text-left">Ngày</th><th className="px-3 py-1.5 text-left">Trạng thái</th><th className="px-3 py-1.5 text-right">Mục đích</th></tr></thead>
                              <tbody>
                                {historyOrders.map((pr: any) => (
                                  <tr key={pr.id} className="border-t border-gray-100 hover:bg-gray-50 text-xs">
                                    <td className="px-3 py-2 font-medium text-purple-600">{pr.maYeuCau}</td>
                                    <td className="px-3 py-2">{pr.ngayYeuCau ? new Date(pr.ngayYeuCau).toLocaleDateString('vi-VN') : '—'}</td>
                                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${pr.trangThai === 'Hoàn thành' ? 'bg-green-100 text-green-800' : pr.trangThai === 'Đã duyệt' ? 'bg-green-100 text-green-800' : pr.trangThai === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'}`}>{pr.trangThai}</span></td>
                                    <td className="px-3 py-2 text-right text-gray-600 truncate max-w-[180px]" title={pr.mucDichYeuCau}>{pr.mucDichYeuCau ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-3 text-sm text-gray-400">Chưa có đơn hàng nào cho nhà cung cấp này.</div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-4 mt-6">
                  <button onClick={closeDetailModal} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Đóng</button>
                  <button onClick={() => { closeDetailModal(); openEditSupplierModal(selectedItem); }} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">Chỉnh sửa</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Request Detail Modal */}
        {selectedPurchaseRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-sm max-w-4xl w-full mx-2 sm:mx-4 max-h-[calc(100vh-1rem)] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Chi tiết {labelForPurchaseRequest(selectedPurchaseRequest)}</h2>
                  <button onClick={closePurchaseRequestDetail} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Mã yêu cầu</label><p className="text-sm font-semibold text-purple-600">{selectedPurchaseRequest.maYeuCau}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Ngày yêu cầu</label><p className="text-sm text-gray-900">{new Date(selectedPurchaseRequest.ngayYeuCau).toLocaleDateString('vi-VN')}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Nhân viên yêu cầu</label><p className="text-sm text-gray-900">{selectedPurchaseRequest.tenNhanVien}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Mã nhân viên</label><p className="text-sm text-gray-900">{selectedPurchaseRequest.maNhanVien}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Phân loại</label><p className="text-sm text-gray-900">{selectedPurchaseRequest.phanLoai || '-'}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Mức độ ưu tiên</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedPurchaseRequest.mucDoUuTien === 'Cao' ? 'bg-red-100 text-red-800' : selectedPurchaseRequest.mucDoUuTien === 'Trung bình' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{selectedPurchaseRequest.mucDoUuTien}</span>
                  </div>

                  {/* Items table */}
                  {selectedPurchaseRequest.items && selectedPurchaseRequest.items.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-2">Danh sách sản phẩm</label>
                      <div className="overflow-x-auto">
	                      <table className="w-full min-w-[760px] text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-2 font-medium text-gray-600">STT</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Phân loại</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Tên hàng hoá</th>
                            <th className="text-right py-2 px-2 font-medium text-gray-600">Số lượng</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">ĐVT</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-600">Nhà cung cấp</th>
                            <th className="text-right py-2 px-2 font-medium text-gray-600">Giá dự kiến</th>
                            <th className="text-right py-2 px-2 font-medium text-gray-600">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPurchaseRequest.items.map((item: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-2 px-2">{i + 1}</td>
                              <td className="py-2 px-2">{item.phanLoai}</td>
                              <td className="py-2 px-2 font-medium">{item.tenHangHoa}</td>
                              <td className="py-2 px-2 text-right">{item.soLuong}</td>
                              <td className="py-2 px-2">{item.donViTinh}</td>
                              <td className="py-2 px-2 text-purple-600">{item.supplier?.tenNhaCungCap || '-'}</td>
                              <td className="py-2 px-2 text-right">{item.giaDuKien ? Number(item.giaDuKien).toLocaleString('vi-VN') + 'đ' : '-'}</td>
                              <td className="py-2 px-2 text-right font-medium">{item.giaDuKien ? (Number(item.giaDuKien) * item.soLuong).toLocaleString('vi-VN') + 'đ' : '-'}</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-100 font-bold">
                            <td colSpan={7} className="py-2 px-2 text-right">Tổng cộng:</td>
                            <td className="py-2 px-2 text-right text-green-700">
                              {selectedPurchaseRequest.items.reduce((sum: number, item: any) => sum + (item.giaDuKien ? Number(item.giaDuKien) * item.soLuong : 0), 0).toLocaleString('vi-VN')}đ
                            </td>
                          </tr>
                        </tbody>
                      </table>
	                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2"><label className="block text-sm font-medium text-gray-500 mb-1">Mục đích yêu cầu</label><p className="text-sm text-gray-900">{selectedPurchaseRequest.mucDichYeuCau}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Trạng thái</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedPurchaseRequest.trangThai === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-800' : selectedPurchaseRequest.trangThai === 'Đã duyệt' ? 'bg-green-100 text-green-800' : selectedPurchaseRequest.trangThai === 'Từ chối' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{selectedPurchaseRequest.trangThai}</span>
                  </div>
                  {selectedPurchaseRequest.ghiChu && <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2"><label className="block text-sm font-medium text-gray-500 mb-1">Ghi chú</label><p className="text-sm text-gray-900">{selectedPurchaseRequest.ghiChu}</p></div>}
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Người duyệt</label><p className="text-sm text-gray-900">{selectedPurchaseRequest.nguoiDuyet || <span className="text-gray-400 italic">Chưa có</span>}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><label className="block text-sm font-medium text-gray-500 mb-1">Ngày duyệt</label><p className="text-sm text-gray-900">{selectedPurchaseRequest.ngayDuyet ? new Date(selectedPurchaseRequest.ngayDuyet).toLocaleDateString('vi-VN') : <span className="text-gray-400 italic">Chưa duyệt</span>}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2"><label className="block text-sm font-medium text-gray-500 mb-1">File đính kèm</label>
                    {selectedPurchaseRequest.fileKemTheo ? <a href={selectedPurchaseRequest.fileKemTheo} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:underline">{selectedPurchaseRequest.fileKemTheo}</a> : <p className="text-sm text-gray-400 italic">Không có file đính kèm</p>}
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button onClick={closePurchaseRequestDetail} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Đóng</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Purchase Request Modal */}
        {editingPurchaseRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-sm w-full max-w-2xl md:max-w-4xl lg:max-w-6xl mx-2 sm:mx-4 max-h-[calc(100vh-1rem)] sm:max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleEditSubmit} className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Chỉnh sửa yêu cầu mua hàng</h2>
                  <button type="button" onClick={closeEditPurchaseRequest} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                </div>
                {/* API error banner */}
                {editFormErrors.api && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700">{editFormErrors.api}</p>
                  </div>
                )}

                {/* Section 1: Thông tin yêu cầu (read-only) */}
                <div className="bg-gray-50 rounded-lg p-4 mb-5">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Thông tin yêu cầu</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex gap-2"><span className="text-gray-500 flex-shrink-0">Người yêu cầu:</span><span className="font-medium text-gray-800">{editingPurchaseRequest.tenNhanVien}{editingPurchaseRequest.maNhanVien && <span className="text-gray-400 ml-1">({editingPurchaseRequest.maNhanVien})</span>}</span></div>
                    <div className="flex gap-2"><span className="text-gray-500 flex-shrink-0">Ngày yêu cầu:</span><span className="font-medium text-gray-800">{new Date(editingPurchaseRequest.ngayYeuCau).toLocaleDateString('vi-VN')}</span></div>
                    <div className="flex gap-2"><span className="text-gray-500 flex-shrink-0">Mức độ ưu tiên:</span><span className={`font-medium ${editingPurchaseRequest.mucDoUuTien === 'Cao' ? 'text-red-600' : editingPurchaseRequest.mucDoUuTien === 'Trung bình' ? 'text-yellow-600' : 'text-green-600'}`}>{editingPurchaseRequest.mucDoUuTien}</span></div>
                    <div className="flex gap-2"><span className="text-gray-500 flex-shrink-0">Phân loại:</span><span className="font-medium text-gray-800">{editingPurchaseRequest.phanLoai || '—'}</span></div>
                    {editingPurchaseRequest.items && editingPurchaseRequest.items.length > 0 ? (
                      <div className="col-span-1 sm:col-span-2"><span className="text-gray-500">Danh sách hàng hóa:</span><div className="mt-1 space-y-1">{editingPurchaseRequest.items.map((item: any, i: number) => (<div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-3 py-1.5 text-xs"><span className="font-medium text-gray-800">{item.tenHangHoa}</span><span className="text-gray-400">·</span><span className="text-gray-600">{item.soLuong} {item.donViTinh}</span>{item.phanLoai && <><span className="text-gray-400">·</span><span className="text-gray-500">{item.phanLoai}</span></>}{item.giaDuKien && <><span className="text-gray-400">·</span><span className="text-green-700">{Number(item.giaDuKien).toLocaleString('vi-VN')}đ</span></>}</div>))}</div></div>
                    ) : (<><div className="col-span-1 sm:col-span-2 flex gap-2"><span className="text-gray-500 flex-shrink-0">Hàng hóa:</span><span className="font-medium text-gray-800">{editingPurchaseRequest.tenHangHoa || '—'}</span></div>{(editingPurchaseRequest.soLuong || editingPurchaseRequest.donViTinh) && (<div className="flex gap-2"><span className="text-gray-500 flex-shrink-0">Số lượng:</span><span className="font-medium text-gray-800">{editingPurchaseRequest.soLuong} {editingPurchaseRequest.donViTinh}</span></div>)} </> )}
                    {editingPurchaseRequest.mucDichYeuCau && (<div className="col-span-1 sm:col-span-2 flex gap-2"><span className="text-gray-500 flex-shrink-0">Mục đích:</span><span className="text-gray-700">{editingPurchaseRequest.mucDichYeuCau}</span></div>)}
                    {editingPurchaseRequest.ghiChu && (<div className="col-span-1 sm:col-span-2 flex gap-2"><span className="text-gray-500 flex-shrink-0">Ghi chú YC:</span><span className="text-gray-700 italic">{editingPurchaseRequest.ghiChu}</span></div>)}
                    {(editingPurchaseRequest as any).ghiChuMuaHang && (<div className="col-span-1 sm:col-span-2 flex gap-2"><span className="text-gray-500 flex-shrink-0">Ghi chú MH:</span><span className="text-gray-700 italic">{(editingPurchaseRequest as any).ghiChuMuaHang}</span></div>)}
                    {editingPurchaseRequest.fileKemTheo && (<div className="col-span-1 sm:col-span-2 flex gap-2"><span className="text-gray-500 flex-shrink-0">File đính kèm:</span><a href={editingPurchaseRequest.fileKemTheo} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline truncate text-xs">{editingPurchaseRequest.fileKemTheo.split('/').pop()}</a></div>)}
                  </div>
                </div>

                {/* Section 2: Xử lý thu mua (editable) */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Xử lý thu mua</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={editFormData.trangThai || ''}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        const currentUserName = user ? `${user.lastName} ${user.firstName}`.trim() : '';
                        setEditFormData((prev) => ({
                          ...prev,
                          trangThai: newStatus,
                          nguoiDuyet: newStatus === 'Đã duyệt' ? prev.nguoiDuyet || currentUserName : prev.nguoiDuyet,
                          ngayDuyet: newStatus === 'Đã duyệt' ? prev.ngayDuyet || new Date().toISOString() : prev.ngayDuyet,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Chờ duyệt">Chờ duyệt</option>
                      <option value="Đã duyệt">Đã duyệt</option>
                      <option value="Từ chối">Từ chối</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                    </select>
                  </div>

                  {editFormData.trangThai === 'Đã duyệt' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-green-50 border border-green-200 rounded-md p-3">
                      <div><label className="block text-xs font-medium text-green-800 mb-1">Người duyệt</label><input type="text" value={editFormData.nguoiDuyet || ''} readOnly className="w-full px-3 py-2 border border-green-200 rounded-md bg-white text-sm text-gray-700 cursor-default" /></div>
                      <div><label className="block text-xs font-medium text-green-800 mb-1">Ngày duyệt</label><input type="date" value={editFormData.ngayDuyet ? new Date(editFormData.ngayDuyet).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} onChange={(e) => setEditFormData((prev) => ({ ...prev, ngayDuyet: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() }))} className="w-full px-3 py-2 border border-green-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400" /></div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Báo giá cho từng hàng hóa</label>
                    <div className="border border-gray-200 rounded-md overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-gray-50">
                          <tr><th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8">#</th><th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hàng hóa</th><th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-20">SL</th><th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">ĐVT</th><th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-52">Nhà cung cấp</th><th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Đơn giá (đ)</th><th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Thành tiền</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {editItems.map((it, idx) => {
                            const qty = typeof it.soLuong === 'number' ? it.soLuong : parseFloat(String(it.soLuong)) || 0;
                            const gia = typeof it.giaDuKien === 'number' ? it.giaDuKien : parseFloat(String(it.giaDuKien ?? 0)) || 0;
                            const thanhTien = qty * gia;
                            return (
                              <tr key={it.id ?? idx} className="align-top">
                                <td className="px-2 py-2 text-gray-500 text-center">{idx + 1}</td>
                                <td className="px-2 py-2"><div className="font-medium text-gray-800">{it.tenHangHoa}</div>{it.phanLoai && <div className="text-xs text-gray-500">{it.phanLoai}</div>}</td>
                                <td className="px-2 py-2 text-right">{qty.toLocaleString('vi-VN')}</td>
                                <td className="px-2 py-2">{it.donViTinh}</td>
                                <td className="px-2 py-2"><select value={it.nhaCungCapId || ''} onChange={(e) => updateEditItem(idx, { nhaCungCapId: e.target.value || null })} className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"><option value="">— Chọn NCC —</option>{suppliers.map((s) => (<option key={s.id} value={s.id}>{s.tenNhaCungCap}</option>))}</select></td>
                                <td className="px-2 py-2"><input type="number" min={0} step="any" value={it.giaDuKien ?? ''} onChange={(e) => updateEditItem(idx, { giaDuKien: e.target.value ? parseFloat(e.target.value) : null })} placeholder="0" className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-purple-500" /></td>
                                <td className="px-2 py-2 text-right font-medium text-green-700">{thanhTien > 0 ? thanhTien.toLocaleString('vi-VN') + 'đ' : '—'}</td>
                              </tr>
                            );
                          })}
                          {editItems.length === 0 && (<tr><td colSpan={7} className="px-3 py-4 text-center text-gray-400 italic">Không có hàng hóa</td></tr>)}
                        </tbody>
                        {editItems.length > 0 && (<tfoot className="bg-green-50"><tr><td colSpan={6} className="px-2 py-2 text-right font-semibold text-gray-700">Tổng cộng:</td><td className="px-2 py-2 text-right font-bold text-green-800">{tongTienEdit > 0 ? tongTienEdit.toLocaleString('vi-VN') + 'đ' : '—'}</td></tr></tfoot>)}
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Chọn nhà cung cấp và đơn giá cho từng dòng. Thành tiền sẽ được tính tự động.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú mua hàng</label>
                    <textarea value={(editFormData as any).ghiChuMuaHang || ''} onChange={(e) => setEditFormData({ ...editFormData, ghiChuMuaHang: e.target.value } as any)} rows={3} placeholder="Ghi chú nội bộ của phòng thu mua..." className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>

                  <FileUpload label="File đính kèm" files={selectedFile ? [selectedFile] : []} onChange={(files) => setSelectedFile(files[0] || null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" existingFileName={!selectedFile && editFormData.fileKemTheo ? editFormData.fileKemTheo : undefined} existingFileUrl={!selectedFile && editFormData.fileKemTheo ? editFormData.fileKemTheo : undefined} onRemoveExisting={() => setEditFormData({ ...editFormData, fileKemTheo: '' })} />
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button type="button" onClick={closeEditPurchaseRequest} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                  <button type="submit" disabled={editLoading} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">{editLoading ? 'Đang lưu...' : 'Lưu cập nhật'}</button>
                  {editingPurchaseRequest.trangThai === 'Chờ báo giá' && (
                    <button
                      type="button"
                      disabled={editLoading}
                      onClick={() => {
                        const missing = editItems.filter((it) => !it.nhaCungCapId || it.giaDuKien === null || it.giaDuKien === undefined || Number(it.giaDuKien) <= 0);
                        if (missing.length > 0) {
                          setConfirmAction({
                            title: 'Chưa thể gửi duyệt',
                            message: `Còn ${missing.length} sản phẩm chưa có nhà cung cấp hoặc đơn giá:\n` + missing.map((it) => `• ${it.tenHangHoa}`).join('\n') + `\n\nVui lòng bổ sung trước khi gửi duyệt.`,
                            hideCancel: true,
                            confirmLabel: 'Đã hiểu',
                            variant: 'warning',
                            onConfirm: () => setConfirmAction(null),
                          });
                          return;
                        }
                        const editPrId = editingPurchaseRequest.id;
                        const editPrCode = editingPurchaseRequest.maYeuCau;
                        setConfirmAction({
                          title: 'Lưu & gửi duyệt',
                          message: `Lưu báo giá cho yêu cầu ${editPrCode} và gửi lên admin phê duyệt?\nTổng tiền dự kiến: ${tongTienEdit.toLocaleString('vi-VN')}đ`,
                          variant: 'warning',
                          confirmLabel: 'Gửi duyệt',
                          onConfirm: async () => {
                            try {
                              setConfirmLoading(true);
                              const cleanedItems = editItems.map((it) => ({
                                ...(it.id ? { id: it.id } : {}),
                                phanLoai: it.phanLoai,
                                tenHangHoa: it.tenHangHoa,
                                soLuong: typeof it.soLuong === 'number' ? it.soLuong : parseFloat(String(it.soLuong)) || 0,
                                donViTinh: it.donViTinh,
                                nhaCungCapId: it.nhaCungCapId || null,
                                giaDuKien: typeof it.giaDuKien === 'number' ? it.giaDuKien : parseFloat(String(it.giaDuKien ?? 0)) || null,
                              }));
                              await purchaseRequestService.updatePurchaseRequest(editPrId, { ...editFormData, items: cleanedItems, file: selectedFile || undefined } as any);
                              await purchaseRequestService.submitForApproval(editPrId);
                              setConfirmAction(null);
                              closeEditPurchaseRequest();
                              fetchPurchaseRequests();
                            } catch (error: any) {
                              alert(error.response?.data?.message || 'Lỗi khi gửi duyệt');
                            } finally {
                              setConfirmLoading(false);
                            }
                          },
                        });
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" /> Lưu & Gửi duyệt
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Thêm nhà cung cấp */}
        {isAddSupplierModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-sm max-w-3xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-xl font-semibold">Thêm nhà cung cấp mới</h2>
                <button onClick={() => setIsAddSupplierModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleAddSupplier(); }} className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Mã NCC</label><input type="text" value={addSupplierForm.maNhaCungCap || ''} disabled className="w-full border rounded-md px-3 py-2 bg-gray-100" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên nhà cung cấp *</label><input type="text" value={addSupplierForm.tenNhaCungCap || ''} onChange={(e) => setAddSupplierForm({...addSupplierForm, tenNhaCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Loại cung cấp *</label><input type="text" placeholder="VD: Máy móc, Thiết bị điện..." value={addSupplierForm.loaiCungCap || ''} onChange={(e) => setAddSupplierForm({...addSupplierForm, loaiCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Quốc gia</label><input type="text" value={addSupplierForm.quocGia || 'Việt Nam'} onChange={(e) => setAddSupplierForm({...addSupplierForm, quocGia: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Website</label><input type="text" value={addSupplierForm.website || ''} onChange={(e) => setAddSupplierForm({...addSupplierForm, website: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Người liên hệ *</label><input type="text" value={addSupplierForm.nguoiLienHe || ''} onChange={(e) => setAddSupplierForm({...addSupplierForm, nguoiLienHe: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label><input type="text" value={addSupplierForm.soDienThoai || ''} onChange={(e) => setAddSupplierForm({...addSupplierForm, soDienThoai: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Email liên hệ</label><input type="email" value={addSupplierForm.emailLienHe || ''} onChange={(e) => setAddSupplierForm({...addSupplierForm, emailLienHe: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                  <div className="col-span-1 sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ *</label><input type="text" value={addSupplierForm.diaChi || ''} onChange={(e) => setAddSupplierForm({...addSupplierForm, diaChi: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Khả năng cung cấp</label><input type="text" value={addSupplierForm.khaNang || ''} onChange={(e) => setAddSupplierForm({...addSupplierForm, khaNang: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Loại hình *</label><select value={addSupplierForm.loaiHinh || 'Sản xuất'} onChange={(e) => setAddSupplierForm({...addSupplierForm, loaiHinh: e.target.value})} className="w-full border rounded-md px-3 py-2"><option value="Sản xuất">Sản xuất</option><option value="Thương mại">Thương mại</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label><select value={addSupplierForm.trangThai || 'Đang cung cấp'} onChange={(e) => setAddSupplierForm({...addSupplierForm, trangThai: e.target.value})} className="w-full border rounded-md px-3 py-2"><option value="Đang cung cấp">Đang cung cấp</option><option value="Ngừng cung cấp">Ngừng cung cấp</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Doanh chi (VNĐ)</label><input type="number" value={addSupplierForm.doanhChi || 0} onChange={(e) => setAddSupplierForm({...addSupplierForm, doanhChi: parseNumberInput(e.target.value)})} className="w-full border rounded-md px-3 py-2" /></div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button type="button" onClick={() => setIsAddSupplierModalOpen(false)} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                  <button type="submit" disabled={supplierFormLoading} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">{supplierFormLoading ? 'Đang lưu...' : 'Thêm mới'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Sửa nhà cung cấp */}
        {isEditSupplierModalOpen && editingSupplier && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-sm max-w-3xl w-full max-h-[calc(100vh-1rem)] sm:max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-xl font-semibold">Sửa nhà cung cấp - {editingSupplier.maNhaCungCap}</h2>
                <button onClick={() => { setIsEditSupplierModalOpen(false); setEditingSupplier(null); }} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleEditSupplier(); }} className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên nhà cung cấp *</label><input type="text" value={editSupplierForm.tenNhaCungCap || ''} onChange={(e) => setEditSupplierForm({...editSupplierForm, tenNhaCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Loại cung cấp *</label><input type="text" value={editSupplierForm.loaiCungCap || ''} onChange={(e) => setEditSupplierForm({...editSupplierForm, loaiCungCap: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Quốc gia</label><input type="text" value={editSupplierForm.quocGia || 'Việt Nam'} onChange={(e) => setEditSupplierForm({...editSupplierForm, quocGia: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Website</label><input type="text" value={editSupplierForm.website || ''} onChange={(e) => setEditSupplierForm({...editSupplierForm, website: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Người liên hệ *</label><input type="text" value={editSupplierForm.nguoiLienHe || ''} onChange={(e) => setEditSupplierForm({...editSupplierForm, nguoiLienHe: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại *</label><input type="text" value={editSupplierForm.soDienThoai || ''} onChange={(e) => setEditSupplierForm({...editSupplierForm, soDienThoai: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Email liên hệ</label><input type="email" value={editSupplierForm.emailLienHe || ''} onChange={(e) => setEditSupplierForm({...editSupplierForm, emailLienHe: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ *</label><input type="text" value={editSupplierForm.diaChi || ''} onChange={(e) => setEditSupplierForm({...editSupplierForm, diaChi: e.target.value})} required className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Khả năng cung cấp</label><input type="text" value={editSupplierForm.khaNang || ''} onChange={(e) => setEditSupplierForm({...editSupplierForm, khaNang: e.target.value})} className="w-full border rounded-md px-3 py-2" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Loại hình *</label><select value={editSupplierForm.loaiHinh || 'Sản xuất'} onChange={(e) => setEditSupplierForm({...editSupplierForm, loaiHinh: e.target.value})} className="w-full border rounded-md px-3 py-2"><option value="Sản xuất">Sản xuất</option><option value="Thương mại">Thương mại</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label><select value={editSupplierForm.trangThai || 'Đang cung cấp'} onChange={(e) => setEditSupplierForm({...editSupplierForm, trangThai: e.target.value})} className="w-full border rounded-md px-3 py-2"><option value="Đang cung cấp">Đang cung cấp</option><option value="Ngừng cung cấp">Ngừng cung cấp</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Doanh chi (VNĐ)</label><input type="number" value={editSupplierForm.doanhChi || 0} onChange={(e) => setEditSupplierForm({...editSupplierForm, doanhChi: parseNumberInput(e.target.value)})} className="w-full border rounded-md px-3 py-2" /></div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button type="button" onClick={() => { setIsEditSupplierModalOpen(false); setEditingSupplier(null); }} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                  <button type="submit" disabled={supplierFormLoading} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">{supplierFormLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

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

        {/* Modal xác nhận xóa */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-sm max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Xác nhận xóa</h3>
              <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa nhà cung cấp này? Hành động này không thể hoàn tác.</p>
              <div className="flex justify-end gap-4">
                <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
                <button onClick={() => handleDeleteSupplier(deleteConfirmId)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Xóa</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default PurchasingEquipment;