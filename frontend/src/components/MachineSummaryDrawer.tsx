import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, ClipboardCheck, Edit, Eye, FileText, History, Info, LayoutGrid, Plus, Power, RefreshCw, Trash2, Wrench, X } from 'lucide-react';
import Portal from './Portal';
import { useDeactivateMachineSystemDetail, useDeleteMachineSystemDetail, useDetailTree, useMachineSystemDetail, useMachineSystemSummary, useMachineSystems } from '../hooks/useMachineSystemDetails';
import { useTemplateCountsBySystem, faultTemplateKeys } from '../hooks/useFaultTemplates';
import faultTemplateService from '../services/faultTemplateService';
import { useQueryClient } from '@tanstack/react-query';
import { machineSystemDetailKeys } from '../hooks/useMachineSystemDetails';
import type { MachineStatus, MachineSystem, MachineSystemDetail, MachineSystemCategory } from '../services/machineSystemService';
import MachineStatusLogList from './MachineStatusLogList';
import MachineStatusUpdateDialog from './MachineStatusUpdateDialog';
import FaultRecordList from './FaultRecordList';
import InspectionRequestList from './InspectionRequestList';
import RepairRequestList from './RepairRequestList';
import MaintenanceTab from './MaintenanceTab';
import SystemOperationManagement from './SystemOperationManagement';
import MachineSystemDetailFormModal from './MachineSystemDetailFormModal';
import ResponsiveRowActions, { type RowAction } from './ResponsiveRowActions';
import { CollapsibleSection } from './shared';

interface MachineSummaryDrawerProps {
  machineSystemId: string | null;
  onClose: () => void;
}

type ProfileTab = 'status' | 'faults' | 'maintenance' | 'operations' | 'system';
type SystemSubTab = 'overview' | 'tree';
type TreeNode = MachineSystemDetail & { depth: number; children: string[] };

const OPERATION_CATEGORIES: MachineSystemCategory[] = ['SAN_XUAT', 'DONG_GOI', 'BAO_QUAN'];

const PROFILE_TABS: { key: ProfileTab; label: string; icon: typeof Info }[] = [
  { key: 'status', label: 'Trạng thái hệ thống/thiết bị', icon: History },
  { key: 'faults', label: 'Danh sách lỗi', icon: AlertTriangle },
  { key: 'maintenance', label: 'Kế hoạch bảo dưỡng', icon: Wrench },
  { key: 'operations', label: 'Thông tin vận hành', icon: ClipboardCheck },
  { key: 'system', label: 'Thông tin hệ thống', icon: Info },
];

const SYSTEM_SUB_TABS: { key: SystemSubTab; label: string; icon: typeof Info }[] = [
  { key: 'overview', label: 'Tổng quan', icon: FileText },
  { key: 'tree', label: 'Cây linh kiện', icon: LayoutGrid },
];

const DETAIL_TYPE_LABELS: Record<string, string> = {
  THIET_BI: 'Thiết bị',
  CUM: 'Cụm',
  LINH_KIEN: 'Linh kiện',
  DIEM_KIEM_TRA: 'Điểm kiểm tra',
};

const MACHINE_STATUS_MAP: Record<MachineStatus, { label: string; cls: string }> = {
  HOAT_DONG: { label: 'Hoạt động', cls: 'bg-green-100 text-green-700 border-green-200' },
  BAO_TRI: { label: 'Bảo trì', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  NGUNG_HOAT_DONG: { label: 'Ngừng HĐ', cls: 'bg-red-100 text-red-700 border-red-200' },
};

const CATEGORY_LABELS: Record<MachineSystemCategory, string> = {
  SAN_XUAT: 'Sản xuất',
  DONG_GOI: 'Đóng gói',
  BAO_QUAN: 'Bảo quản',
  DIEN: 'Điện',
  NUOC: 'Nước',
  HOI: 'Hơi',
  KHI_NEN: 'Khí nén',
  LAM_NONG: 'Làm nóng',
  VAN_CHUYEN: 'Vận chuyển',
  PCCC: 'PCCC',
  CHAT_THAI: 'Chất thải',
  KIEM_TRA_CL: 'Kiểm tra CL',
  AN_TOAN: 'An toàn',
  KHAC: 'Khác',
};

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const statusBadge = (status?: MachineStatus | string | null) => {
  const cfg = status ? MACHINE_STATUS_MAP[status as MachineStatus] : undefined;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cfg?.cls ?? 'border-gray-200 bg-gray-100 text-gray-600'}`}>
      {cfg?.label ?? status ?? '—'}
    </span>
  );
};

const detailTypeLabel = (value?: string | null) =>
  value ? DETAIL_TYPE_LABELS[value] ?? value : '—';

const SummaryMetric = ({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warning' | 'success' }) => {
  const toneClass = tone === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-blue-200 bg-blue-50 text-blue-700';

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <div className={`mb-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${toneClass}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
};

const buildTreeData = (items: MachineSystemDetail[] | undefined, expandedIds: Set<string>): TreeNode[] | null => {
  if (!items || items.length === 0) return null;

  const map = new Map<string, TreeNode>();
  items.forEach((item) => map.set(item.id, { ...item, depth: 0, children: [] }));

  const roots: string[] = [];
  items.forEach((item) => {
    if (item.parentDetailId && map.has(item.parentDetailId)) {
      map.get(item.parentDetailId)!.children.push(item.id);
    } else {
      roots.push(item.id);
    }
  });

  const setDepth = (id: string, depth: number) => {
    const node = map.get(id);
    if (!node) return;
    node.depth = depth;
    node.children.forEach((childId) => setDepth(childId, depth + 1));
  };
  roots.forEach((id) => setDepth(id, 0));

  const flatten = (ids: string[]): TreeNode[] => ids.flatMap((id) => {
    const node = map.get(id);
    if (!node) return [];
    return expandedIds.has(id) ? [node, ...flatten(node.children)] : [node];
  });

  return flatten(roots);
};

const isProfileTab = (v: string | null): v is ProfileTab =>
  (PROFILE_TABS as readonly { key: ProfileTab }[]).some((t) => t.key === v);

const MachineSummaryDrawer = ({ machineSystemId, onClose }: MachineSummaryDrawerProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
    const p = searchParams.get('drawerTab');
    return isProfileTab(p) ? p : 'status';
  });
  const [systemSubTab, setSystemSubTab] = useState<SystemSubTab>(() => {
    const v = searchParams.get('systemView');
    return v === 'tree' ? 'tree' : 'overview';
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<{ mode: 'create' | 'edit' | 'view'; record?: MachineSystemDetail } | null>(null);
  const detailIdParam = searchParams.get('detailId');
  const detailModeParam = searchParams.get('detailMode');
  const detailIdQuery = useMachineSystemDetail(detailIdParam ?? '');
  const { data: summaryResp, isLoading } = useMachineSystemSummary(machineSystemId ?? '', 10);
  const detailTreeQuery = useDetailTree(machineSystemId ?? undefined);
  const countsQuery = useTemplateCountsBySystem(machineSystemId ?? undefined);
  const queryClient = useQueryClient();
  const countsMap = useMemo(() => new Map((countsQuery.data?.data ?? []).map((c) => [c.detailId, c])), [countsQuery.data]);
  const deactivateDetail = useDeactivateMachineSystemDetail();
  const deleteDetail = useDeleteMachineSystemDetail();
  const [expandedTemplateNode, setExpandedTemplateNode] = useState<string | null>(null);
  const [templateNodeItems, setTemplateNodeItems] = useState<Record<string, any[]>>({});
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ record: MachineSystemDetail; count: number } | null>(null);
  const [tplNode, setTplNode] = useState<MachineSystemDetail | null>(null);
  const [tplForm, setTplForm] = useState({ tenMauLoi: '', moTa: '', mucDo: 'TRUNG_BINH' });
  const [tplSaving, setTplSaving] = useState(false);
  const { data: systemsResp } = useMachineSystems({ page: 1, limit: 200, hoatDong: true });
  const allSystemsForModal: MachineSystem[] = systemsResp?.data ?? [];
  const summary = summaryResp?.data;
  const isOpen = !!machineSystemId;
  const treeItems = detailTreeQuery.data?.data;
  const treeData = useMemo(() => buildTreeData(treeItems, expandedIds), [treeItems, expandedIds]);

  const canShowOperations = useMemo(() => {
    const cat = summary?.machine?.loaiHeThong as MachineSystemCategory | undefined;
    return !!cat && (OPERATION_CATEGORIES as string[]).includes(cat);
  }, [summary?.machine?.loaiHeThong]);
  const visibleTabs = useMemo(() => PROFILE_TABS.filter((t) => t.key !== 'operations' || canShowOperations), [canShowOperations]);

  const faultCount = summary?.faultRecords?.length ?? 0;
  const repairCount = summary?.repairItems?.length ?? 0;
  const maintenanceCount = summary?.maintenanceRecords?.length ?? 0;
  const operationCount = summary?.systemOperations?.length ?? 0;
  const statusLogCount = summary?.statusLogs?.length ?? 0;
  const handoverCount = summary?.handoverItems?.length ?? 0;

  const pushDrawerTab = useCallback((tab: ProfileTab) => {
    syncingRef.current = true;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('drawer', 'open');
      next.set('drawerTab', tab);
      // Preserve systemId / detailId already in URL; ensure systemId present when drawer open
      if (machineSystemId && !next.get('systemId')) next.set('systemId', machineSystemId);
      return next;
    }, { replace: true });
  }, [machineSystemId, setSearchParams]);

  const handleDrawerClose = useCallback(() => {
    syncingRef.current = true;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      next.delete('drawerTab');
      next.delete('systemId');
      next.delete('detailId');
      next.delete('detailMode');
      return next;
    }, { replace: true });
    onClose();
  }, [setSearchParams, onClose]);

  const handleTabChange = useCallback((tab: ProfileTab) => {
    setActiveTab(tab);
    pushDrawerTab(tab);
  }, [pushDrawerTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleDrawerClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleDrawerClose]);

  // When a new system is opened, seed tab from URL if present, else reset.
  useEffect(() => {
    if (!isOpen) return;
    const urlTab = searchParams.get('drawerTab');
    if (isProfileTab(urlTab)) setActiveTab(urlTab);
    else if (!searchParams.has('drawerTab')) setActiveTab('status');
    setExpandedIds(new Set());
  }, [machineSystemId, isOpen]);

  // URL → state: back/forward restores drawer tab + system sub-tab
  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const urlTab = searchParams.get('drawerTab');
    if (isProfileTab(urlTab)) setActiveTab((prev) => prev === urlTab ? prev : urlTab);
    const sv = searchParams.get('systemView');
    if (sv === 'tree' || sv === null) {
      const expected: SystemSubTab = sv === 'tree' ? 'tree' : 'overview';
      setSystemSubTab((prev) => prev === expected ? prev : expected);
    }
  }, [searchParams]);

  // state → URL: keep ?drawer & ?drawerTab in sync while drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const curDrawer = searchParams.get('drawer');
    const curTab = searchParams.get('drawerTab');
    const curSysView = searchParams.get('systemView');
    const expectedSysView = activeTab === 'system' ? systemSubTab : null;
    if (curDrawer === 'open' && curTab === activeTab && (expectedSysView === null || curSysView === expectedSysView || (expectedSysView === 'overview' && !curSysView))) return;
    // sync drawerTab
    if (curDrawer !== 'open' || curTab !== activeTab) pushDrawerTab(activeTab);
    // sync systemView when on system tab
    if (activeTab === 'system') {
      syncingRef.current = true;
      setSearchParams((prev) => {
        const n = new URLSearchParams(prev);
        if (systemSubTab === 'tree') n.set('systemView', 'tree');
        else n.delete('systemView');
        return n;
      }, { replace: true });
    }
  }, [activeTab, systemSubTab, isOpen]);

  // Redirect away from operations when category doesn't allow it
  useEffect(() => {
    if (activeTab === 'operations' && !canShowOperations && summary?.machine) {
      setActiveTab('status');
      pushDrawerTab('status');
    }
  }, [activeTab, canShowOperations, summary?.machine, pushDrawerTab]);

  const toggleExpand = (id: string) => {    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!treeItems) return;
    setExpandedIds(new Set(treeItems.filter((item) => item.childDetails?.length).map((item) => item.id)));
  };

  const openDetailModal = (mode: 'create' | 'edit' | 'view', record?: MachineSystemDetail) => {
    if ((mode === 'view' || mode === 'edit') && record?.id) {
      syncingRef.current = true;
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('detailId', record.id);
        p.set('detailMode', mode);
        return p;
      }, { replace: true });
    }
    setDetailModal({ mode, record });
  };

  const closeDetailModal = useCallback(() => {
    setDetailModal(null);
    syncingRef.current = true;
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.delete('detailId');
      p.delete('detailMode');
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  // Hydrate detail modal from URL (reload / shared link) — expand ancestors after tree loads
  const detailHydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !treeItems) return;
    if (syncingRef.current) { syncingRef.current = false; return; }
    if (!detailIdParam) {
      if (detailModal?.record?.id) setDetailModal(null);
      detailHydratedRef.current = null;
      return;
    }
    if (detailModal?.record?.id === detailIdParam || detailHydratedRef.current === detailIdParam) return;
    // Try resolve from tree first (no fetch needed)
    const fromTree = treeItems.find((t) => t.id === detailIdParam);
    const mode = detailModeParam === 'edit' ? 'edit' as const : 'view' as const;
    if (fromTree) {
      const parentMap = new Map<string, string | null>();
      treeItems.forEach((t) => parentMap.set(t.id, t.parentDetailId ?? null));
      const ancestors: string[] = [];
      let cur: string | null = fromTree.parentDetailId ?? null;
      while (cur) { ancestors.push(cur); cur = parentMap.get(cur) ?? null; }
      if (ancestors.length) setExpandedIds((prev) => { const n = new Set(prev); ancestors.forEach((a) => n.add(a)); return n; });
      setActiveTab('system');
      setSystemSubTab('tree');
      setDetailModal({ mode, record: fromTree });
      detailHydratedRef.current = detailIdParam;
      return;
    }
    if (detailIdQuery.isLoading) return;
    const fetched = detailIdQuery.data?.data;
    if (fetched && fetched.id === detailIdParam) {
      const parentMap = new Map<string, string | null>();
      treeItems.forEach((t) => parentMap.set(t.id, t.parentDetailId ?? null));
      const ancestors: string[] = [];
      let cur: string | null = (fetched as any).parentDetailId ?? null;
      while (cur) { ancestors.push(cur); cur = parentMap.get(cur) ?? null; }
      if (ancestors.length) setExpandedIds((prev) => { const n = new Set(prev); ancestors.forEach((a) => n.add(a)); return n; });
      setActiveTab('system');
      setSystemSubTab('tree');
      setDetailModal({ mode, record: fetched as any });
      detailHydratedRef.current = detailIdParam;
      return;
    }
    if (detailIdQuery.isError && detailHydratedRef.current !== detailIdParam) {
      detailHydratedRef.current = detailIdParam;
      toast.error('Không tìm thấy chi tiết yêu cầu');
    }
  }, [isOpen, treeItems, detailIdParam, detailModeParam, detailModal, detailIdQuery.data, detailIdQuery.isLoading, detailIdQuery.isError]);

  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    if (!detailIdParam && detailModal) setDetailModal(null);
  }, [detailIdParam]);

  const removeDetail = async (record: MachineSystemDetail) => {
    if (!confirm(`Xóa chi tiết ${record.maChiTiet}? Nếu đã phát sinh dữ liệu, hãy dừng hoạt động thay vì xóa.`)) return;
    try {
      await deleteDetail.mutateAsync(record.id);
      toast.success('Đã xóa chi tiết');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không xóa được chi tiết máy');
    }
  };

  const handleDeactivateConfirm = async (includeTemplates: boolean) => {
    if (!deactivateConfirm) return;
    const { record, count } = deactivateConfirm;
    const shouldInclude = includeTemplates && count > 0;
    setDeactivateConfirm(null);
    try {
      await deactivateDetail.mutateAsync(record.id);
      if (shouldInclude) {
        try { await faultTemplateService.deactivateTemplatesForDetail(record.id); } catch (_) {}
        queryClient.invalidateQueries({ queryKey: faultTemplateKeys.all });
      }
      queryClient.invalidateQueries({ queryKey: faultTemplateKeys.counts(machineSystemId ?? '') });
      queryClient.invalidateQueries({ queryKey: machineSystemDetailKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...machineSystemDetailKeys.all, 'tree', machineSystemId ?? ''] });
      toast.success(shouldInclude ? `Đã dừng chi tiết và ${count} mẫu lỗi liên quan` : 'Đã dừng hoạt động chi tiết');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không dừng được chi tiết máy');
    }
  };

  const deactivateDetailRow = async (record: MachineSystemDetail) => {
    // Use cached subtree count; fall back to live query if missing
    let count = countsMap.get(record.id)?.subtreeCount;
    if (count === undefined) {
      try {
        const res = await faultTemplateService.getAll({ machineSystemDetailId: record.id, includeSubtree: true, limit: 1, page: 1 } as any);
        count = res.pagination?.total ?? 0;
      } catch { count = 0; }
    }
    if (count > 0) {
      setDeactivateConfirm({ record, count });
      return;
    }
    if (!confirm(`Dừng hoạt động chi tiết ${record.maChiTiet}?`)) return;
    try {
      await deactivateDetail.mutateAsync(record.id);
      queryClient.invalidateQueries({ queryKey: faultTemplateKeys.counts(machineSystemId ?? '') });
      queryClient.invalidateQueries({ queryKey: machineSystemDetailKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...machineSystemDetailKeys.all, 'tree', machineSystemId ?? ''] });
      toast.success('Đã dừng hoạt động chi tiết');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không dừng được chi tiết máy');
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999]" onClick={handleDrawerClose}>
        <div className="absolute inset-0 bg-black/30" />
        <div
          className="absolute inset-y-0 right-0 left-0 md:left-64 bg-white shadow-xl overflow-hidden flex flex-col"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Hồ sơ máy</p>
                  <h2 className="mt-1 text-lg font-semibold text-gray-900">
                    {summary?.machine ? `${summary.machine.maHeThong} — ${summary.machine.tenHeThong}` : 'Đang tải hồ sơ máy'}
                  </h2>
                  {summary?.machine && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {statusBadge(summary.machine.trangThai)}
                      <span>{summary.machine.khuVuc || 'Chưa có khu vực'}</span>
                      <span>•</span>
                      <span>{summary.machine.viTri || 'Chưa có vị trí'}</span>
                    </div>
                  )}
                </div>
                <button type="button" onClick={handleDrawerClose} className="rounded p-1.5 text-gray-500 hover:bg-gray-100" title="Đóng">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
                <SummaryMetric label="Chi tiết" value={treeItems?.length ?? 0} />
                <SummaryMetric label="Nhật ký trạng thái" value={statusLogCount} />
                <SummaryMetric label="Lỗi" value={faultCount} tone="warning" />
                <SummaryMetric label="Sửa chữa" value={repairCount} tone="warning" />
                <SummaryMetric label="Bảo dưỡng" value={maintenanceCount} tone="success" />
                <SummaryMetric label="Vận hành" value={operationCount} />
                <SummaryMetric label="Nghiệm thu" value={handoverCount} tone="success" />
              </div>

              <div className={`mt-4 grid grid-cols-2 gap-2 ${visibleTabs.length === 4 ? 'sm:grid-cols-4 lg:grid-cols-4' : 'sm:grid-cols-3 lg:grid-cols-5'}`}>
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => handleTabChange(tab.key)}
                      className={`flex min-h-[58px] items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        activeTab === tab.key
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isLoading ? (
                <div className="py-8 text-center text-gray-500">Đang tải...</div>
              ) : !summary?.machine ? (
                <div className="py-8 text-center text-gray-500">Không tìm thấy dữ liệu</div>
              ) : (
                <>
                  {activeTab === 'status' && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">Trạng thái hệ thống/thiết bị</h2>
                        <p className="text-xs text-gray-500">Theo dõi trạng thái vận hành, nhật ký và lịch sử yêu cầu kiểm tra — sửa chữa.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(summary.machine.trangThai)}
                        <span className="text-sm text-gray-600">{CATEGORY_LABELS[summary.machine.loaiHeThong] ?? summary.machine.loaiHeThong}</span>
                        <button
                          type="button"
                          onClick={() => setStatusDialogOpen(true)}
                          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          <RefreshCw className="h-4 w-4" /> Cập nhật trạng thái
                        </button>
                      </div>
                      <CollapsibleSection title="Nhật ký trạng thái" defaultOpen>
                        <MachineStatusLogList lockedMachineSystemId={machineSystemId ?? undefined} hideHeader />
                      </CollapsibleSection>
                      <CollapsibleSection title="Yêu cầu kiểm tra" defaultOpen={false}>
                        <InspectionRequestList lockedMachineSystemId={machineSystemId ?? undefined} />
                      </CollapsibleSection>
                      <CollapsibleSection title="Yêu cầu sửa chữa" defaultOpen={false}>
                        <RepairRequestList lockedMachineSystemId={machineSystemId ?? undefined} />
                      </CollapsibleSection>
                    </div>
                  )}

                  {activeTab === 'faults' && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">Danh sách lỗi</h2>
                        <p className="text-xs text-gray-500">Bản ghi lỗi, mẫu lỗi, tài liệu sửa chữa và nghiệm thu sau sửa chữa.</p>
                      </div>
                      <FaultRecordList lockedMachineSystemId={machineSystemId ?? undefined} />
                      <section className="rounded-lg border border-gray-200 bg-white">
                        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
                          <h3 className="text-sm font-semibold text-gray-900">Tài liệu sửa chữa</h3>
                          <p className="text-xs text-gray-500">Hướng dẫn chi tiết (RepairStep) cho từng lỗi — xem trong chi tiết lỗi.</p>
                        </div>
                        {!summary?.handoverItems || summary.handoverItems.length === 0 ? (
                          <p className="px-3 py-8 text-center text-sm text-gray-500">Chưa có nghiệm thu</p>
                        ) : (
                          <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
                            {summary.handoverItems.map((item: any) => (
                              <li key={item.id} className="px-3 py-3 text-sm">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="font-mono text-xs font-medium text-blue-700">
                                    {item.acceptanceHandover?.maNghiemThu ?? '—'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(item.acceptanceHandover?.ngayNghiemThu)}
                                  </span>
                                </div>
                                <div className="mt-1 grid gap-1 text-xs text-gray-600 sm:grid-cols-2">
                                  <div>
                                    <span className="font-medium text-gray-500">Trước: </span>
                                    {item.tinhTrangTruocSuaChua}
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-500">Sau: </span>
                                    {item.tinhTrangSauSuaChua}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    </div>
                  )}

                  {activeTab === 'maintenance' && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">Kế hoạch bảo dưỡng</h2>
                        <p className="text-xs text-gray-500">Kế hoạch định kỳ và biên bản thực hiện bảo dưỡng/sửa chữa.</p>
                      </div>
                      <MaintenanceTab lockedMachineSystemId={machineSystemId ?? undefined} />
                    </div>
                  )}

                  {activeTab === 'operations' && (
                    canShowOperations ? (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-base font-semibold text-gray-900">Thông tin vận hành</h2>
                          <p className="text-xs text-gray-500">Thông số vận hành theo ca, khối lượng, nhiệt độ và áp suất các giai đoạn.</p>
                        </div>
                        <SystemOperationManagement lockedMachineSystemId={machineSystemId ?? undefined} />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-base font-semibold text-gray-900">Thông tin vận hành</h2>
                          <p className="text-xs text-gray-500">Thông số vận hành theo ca, khối lượng, nhiệt độ và áp suất các giai đoạn.</p>
                        </div>
                        <div className="py-8 text-center text-sm text-gray-500">Tab vận hành chỉ áp dụng cho hệ thống Sản xuất / Đóng gói / Bảo quản.</div>
                      </div>
                    )
                  )}

                  {activeTab === 'system' && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-semibold text-gray-900">Thông tin hệ thống</h2>
                        <p className="text-xs text-gray-500">Thông tin chung và cây linh kiện/thiết bị thuộc hệ thống.</p>
                      </div>
                      <div className="inline-flex gap-1 rounded-lg bg-gray-100 p-1">
                        {SYSTEM_SUB_TABS.map(({ key, label, icon: Icon }) => {
                          const active = systemSubTab === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setSystemSubTab(key);
                                syncingRef.current = true;
                                setSearchParams((prev) => {
                                  const n = new URLSearchParams(prev);
                                  if (key === 'tree') n.set('systemView', 'tree');
                                  else n.delete('systemView');
                                  return n;
                                }, { replace: true });
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${active ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                              <Icon className="h-3.5 w-3.5" /> {label}
                            </button>
                          );
                        })}
                      </div>
                      {systemSubTab === 'overview' && (
                        <div className="grid gap-3 md:grid-cols-2">
                          <section className="rounded-lg border border-gray-200 bg-white p-3">
                            <h3 className="mb-3 text-sm font-semibold text-gray-900">Thông tin chung</h3>
                            <dl className="grid grid-cols-1 gap-x-3 gap-y-2 text-sm sm:grid-cols-[120px_1fr]">
                              <dt className="text-gray-500">Mã hệ thống</dt>
                              <dd className="font-mono text-xs font-medium text-blue-700">{summary.machine.maHeThong}</dd>
                              <dt className="text-gray-500">Tên hệ thống</dt>
                              <dd className="font-medium text-gray-900">{summary.machine.tenHeThong}</dd>
                              <dt className="text-gray-500">Loại hệ thống</dt>
                              <dd className="text-gray-700">{CATEGORY_LABELS[summary.machine.loaiHeThong] ?? summary.machine.loaiHeThong}</dd>
                              <dt className="text-gray-500">Trạng thái</dt>
                              <dd>{statusBadge(summary.machine.trangThai)}</dd>
                              <dt className="text-gray-500">Hoạt động</dt>
                              <dd className="text-gray-700">{summary.machine.hoatDong ? 'Đang hoạt động' : 'Dừng'}</dd>
                              <dt className="text-gray-500">Khu vực</dt>
                              <dd className="text-gray-700">{summary.machine.khuVuc || '—'}</dd>
                              <dt className="text-gray-500">Vị trí</dt>
                              <dd className="text-gray-700">{summary.machine.viTri || '—'}</dd>
                              <dt className="text-gray-500">Người TH</dt>
                              <dd className="text-gray-700">{summary.machine.nguoiThucHien || '—'}</dd>
                              {summary.machine.maThietBi && (
                                <>
                                  <dt className="text-gray-500">Mã thiết bị</dt>
                                  <dd className="font-mono text-xs text-gray-700">{summary.machine.maThietBi}</dd>
                                </>
                              )}
                              {summary.machine.tenThietBi && (
                                <>
                                  <dt className="text-gray-500">Tên thiết bị</dt>
                                  <dd className="text-gray-700">{summary.machine.tenThietBi}</dd>
                                </>
                              )}
                              {summary.machine.fileDinhKem && (
                                <>
                                  <dt className="text-gray-500">File đính kèm</dt>
                                  <dd>
                                    <a href={summary.machine.fileDinhKem} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800 break-all">
                                      {summary.machine.fileDinhKem.split('/').pop() ?? 'Tải xuống'}
                                    </a>
                                  </dd>
                                </>
                              )}
                              <dt className="text-gray-500">Ngày tạo</dt>
                              <dd className="text-gray-700">{formatDate(summary.machine.createdAt)}</dd>
                              <dt className="text-gray-500">Cập nhật</dt>
                              <dd className="text-gray-700">{formatDate(summary.machine.updatedAt)}</dd>
                            </dl>
                            {(summary.parentSystem || (summary.clonedSystemsCount ?? 0) > 0) && (
                              <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
                                <p className="mb-1 text-xs font-semibold text-blue-700">Dòng hệ thống</p>
                                {summary.parentSystem && (
                                  <p className="text-gray-700">
                                    Hệ thống gốc: <span className="font-medium text-blue-700">{summary.parentSystem.tenHeThong} ({summary.parentSystem.maHeThong})</span>
                                  </p>
                                )}
                                {(summary.clonedSystemsCount ?? 0) > 0 && (
                                  <p className="text-gray-700">Số bản sao: <span className="font-medium">{summary.clonedSystemsCount}</span></p>
                                )}
                              </div>
                            )}
                          </section>
                          <section className="rounded-lg border border-gray-200 bg-white p-3">
                            <h3 className="mb-3 text-sm font-semibold text-gray-900">Mô tả vận hành</h3>
                            <dl className="space-y-3 text-sm">
                              <div>
                                <dt className="text-xs font-medium text-gray-500">Chức năng</dt>
                                <dd className="mt-1 text-gray-700">{summary.machine.chucNang || '—'}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-medium text-gray-500">Nhiệm vụ</dt>
                                <dd className="mt-1 text-gray-700">{summary.machine.nhiemVu || '—'}</dd>
                              </div>
                            </dl>
                          </section>
                        </div>
                      )}
                      {systemSubTab === 'tree' && (
                        <section className="rounded-lg border border-gray-200 bg-white">
                          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
                            <button type="button" onClick={expandAll} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200" title="Mở tất cả">
                              <ChevronsUpDown className="h-3.5 w-3.5" /> Mở
                            </button>
                            <button type="button" onClick={() => setExpandedIds(new Set())} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200" title="Thu gọn">
                              <ChevronsDownUp className="h-3.5 w-3.5" /> Gọn
                            </button>
                            <span className="ml-auto text-xs text-gray-400">{treeItems?.length ?? 0} chi tiết</span>
                            <button type="button" onClick={() => openDetailModal('create')} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                              <Plus className="h-3.5 w-3.5" /> Thêm chi tiết
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] border-collapse text-sm">
                              <thead className="bg-gray-50 text-xs font-medium text-gray-500">
                                <tr>
                                  <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[220px]">Tên chi tiết</th>
                                  <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[90px]">Mã</th>
                                  <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[100px]">Loại</th>
                                  <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[80px]">Mẫu lỗi</th>
                                  <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[100px]">Vị trí</th>
                                  <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[120px]">Phụ trách</th>
                                  <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[110px]">Trạng thái</th>
                                  <th className="border-b border-gray-200 px-3 py-2.5 text-right min-w-[110px]">Thao tác</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {detailTreeQuery.isLoading ? (
                                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
                                ) : !treeData || treeData.length === 0 ? (
                                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Chưa có chi tiết/cây linh kiện.</td></tr>
                                ) : treeData.map((node) => {
                                  const actions: RowAction[] = [
                                    { key: 'view', label: 'Xem chi tiết', icon: <Eye className="h-4 w-4" />, onClick: () => openDetailModal('view', node), tone: 'primary' },
                                    { key: 'edit', label: 'Sửa chi tiết', icon: <Edit className="h-4 w-4" />, onClick: () => openDetailModal('edit', node), tone: 'success' },
                                    ...(node.hoatDong ? [{ key: 'deactivate', label: 'Dừng hoạt động', icon: <Power className="h-4 w-4" />, onClick: () => deactivateDetailRow(node), tone: 'warning' } satisfies RowAction] : []),
                                    { key: 'delete', label: 'Xóa chi tiết', icon: <Trash2 className="h-4 w-4" />, onClick: () => removeDetail(node), tone: 'danger' },
                                  ];
                                  return (
                                    <tr key={node.id} className="hover:bg-gray-50">
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-center" style={{ paddingLeft: `${node.depth * 24}px` }}>
                                          {node.children.length > 0 ? (
                                            <button type="button" onClick={() => toggleExpand(node.id)} className="mr-1 rounded p-0.5 text-gray-400 hover:text-gray-700">
                                              {expandedIds.has(node.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </button>
                                          ) : <span className="mr-1 inline-block w-5" />}
                                          <span className="font-medium text-gray-900">{node.tenChiTiet}</span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 font-mono text-xs font-medium text-blue-700">{node.maChiTiet}</td>
                                      <td className="px-3 py-2.5 text-xs text-gray-600">{detailTypeLabel(node.loaiChiTiet)}</td>
                                      <td className="px-3 py-2.5 text-xs">
                                        {(() => { const c = countsMap.get(node.id); return c ? <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">{c.directCount} / {c.subtreeCount}</span> : <span className="text-gray-400">0 / 0</span>; })()}
                                        <button type="button" onClick={async () => {
                                          if (expandedTemplateNode === node.id) { setExpandedTemplateNode(null); return; }
                                          setExpandedTemplateNode(node.id);
                                          try { const r = await faultTemplateService.getAll({ machineSystemDetailId: node.id, limit: 20 }); setTemplateNodeItems((p) => ({ ...p, [node.id]: (r as any).data ?? [] })); } catch {}
                                        }} className="ml-1 text-[10px] text-blue-600 hover:underline">{expandedTemplateNode===node.id ? 'Ẩn' : 'Xem'}</button>
                                      </td>
                                      <td className="px-3 py-2.5 text-xs text-gray-600">
                                        <button type="button" onClick={() => { setTplNode(node); setTplForm({ tenMauLoi: '', moTa: '', mucDo: 'TRUNG_BINH' }); }} className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700">+ Mẫu</button>
                                        {expandedTemplateNode===node.id && (templateNodeItems[node.id] ?? []).length > 0 && (
                                          <div className="mt-1 rounded border bg-gray-50 p-1 text-[11px]">
                                            {(templateNodeItems[node.id] ?? []).map((t: any) => (
                                              <div key={t.id} className="flex items-center justify-between py-0.5">
                                                <span className="truncate">{t.tenMauLoi} — {t.mucDo}</span>
                                                <span className="ml-2 shrink-0 text-gray-400">{t.trangThai}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 text-xs text-gray-600">{node.viTri || '—'}</td>
                                      <td className="px-3 py-2.5 text-xs text-gray-600">{node.nguoiPhuTrach || '—'}</td>
                                      <td className="px-3 py-2.5">
                                        {node.hoatDong ? statusBadge(node.trangThai) : <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Dừng</span>}
                                      </td>
                                      <td className="px-3 py-2.5 text-right">
                                        <ResponsiveRowActions actions={actions} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <MachineSystemDetailFormModal
        isOpen={!!detailModal}
        mode={detailModal?.mode ?? 'create'}
        record={detailModal?.record}
        lockedMachineSystemId={machineSystemId ?? undefined}
        allSystems={allSystemsForModal}
        onClose={closeDetailModal}
      />
      <MachineStatusUpdateDialog
        machineSystemId={statusDialogOpen ? machineSystemId : null}
        machineName={summary?.machine?.tenHeThong}
        onClose={() => setStatusDialogOpen(false)}
      />
      {tplNode && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setTplNode(null)} />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Thêm mẫu lỗi — {tplNode.tenChiTiet}</h3>
            <p className="mt-1 text-xs text-gray-500">{tplNode.maChiTiet} • {tplNode.machineSystemId}</p>
            <div className="mt-4 space-y-3">
              <div><label className="text-xs font-medium text-gray-700">Tên mẫu</label><input value={tplForm.tenMauLoi} onChange={(e)=>setTplForm(p=>({...p,tenMauLoi:e.target.value}))} placeholder="VD: Rò rỉ dầu" className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-700">Mô tả</label><textarea value={tplForm.moTa} onChange={(e)=>setTplForm(p=>({...p,moTa:e.target.value}))} rows={3} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-700">Mức độ</label><select value={tplForm.mucDo} onChange={(e)=>setTplForm(p=>({...p,mucDo:e.target.value}))} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"><option value="NHE">Nhẹ</option><option value="TRUNG_BINH">Trung bình</option><option value="NANG">Nặng</option><option value="NGHIEM_TRONG">Nghiêm trọng</option></select></div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setTplNode(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Hủy</button>
              <button type="button" disabled={tplSaving || !tplForm.tenMauLoi.trim() || !tplForm.moTa.trim()} onClick={async()=>{ if(!tplNode) return; setTplSaving(true); try{ await faultTemplateService.create({ tenMauLoi: tplForm.tenMauLoi.trim(), moTa: tplForm.moTa.trim(), mucDo: tplForm.mucDo, machineSystemId: tplNode.machineSystemId, machineSystemDetailId: tplNode.id }); queryClient.invalidateQueries({ queryKey: faultTemplateKeys.lists() }); queryClient.invalidateQueries({ queryKey: faultTemplateKeys.counts(tplNode.machineSystemId) }); toast.success("Đã tạo mẫu lỗi"); setTplNode(null);}catch(e:any){ toast.error(e?.response?.data?.message || e?.message || "Không tạo được mẫu"); } finally{ setTplSaving(false);} }} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{tplSaving?"Đang lưu...":"Tạo mẫu"}</button>
            </div>
          </div>
        </div>
      )}
      {deactivateConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeactivateConfirm(null)} />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Dừng chi tiết</h3>
            <p className="mt-2 text-sm text-gray-600">
              Chi tiết này có {deactivateConfirm.count} mẫu lỗi liên quan trong cây con. Dừng luôn các mẫu lỗi đó?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDeactivateConfirm(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Hủy</button>
              <button type="button" onClick={() => handleDeactivateConfirm(false)} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Không, chỉ dừng chi tiết</button>
              <button type="button" onClick={() => handleDeactivateConfirm(true)} className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">Có, dừng luôn</button>
            </div>
          </div>
        </div>
      )}
    </Portal>
  );
};

export default MachineSummaryDrawer;
