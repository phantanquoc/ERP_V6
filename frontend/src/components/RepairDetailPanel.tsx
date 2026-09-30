import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight, Crown, ExternalLink, Link2, Package, Plus, Trash2, User, Users, X,
  AlertTriangle, Calendar, DollarSign, FileText,
} from 'lucide-react';
import {
  useRepairRequest,
  useRepairStatusHistory,
  repairRequestKeys,
  useRepairCostSummary,
  useRepairIncidentalCosts,
  useCreateIncidentalCost,
  useUpdateIncidentalCost,
  useDeleteIncidentalCost,
} from '../hooks/useRepairRequests';
import repairRequestService, {
  STATUS_LABELS, REQUEST_TYPE_LABELS, SupplyChainEntry,
  RepairRequest, RepairRequestStatus, RepairRequestItemInput,
} from '../services/repairRequestService';
import supplyRequestService from '../services/supplyRequestService';
import RepairRequestFormModal from './RepairRequestFormModal';
import { getFileUrl } from '../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import StatusBadge from './shared/StatusBadge';
import { CollapsibleSection } from './shared';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import inspectionRequestService from '../services/inspectionRequestService';
import { useInspectionStatusHistory } from '../hooks/useInspectionRequests';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import { can } from '../utils/permissions';

const formatDate = (v?: string | null) => v ? new Date(v).toLocaleDateString('vi-VN') : '—';
const formatDateTime = (v?: string | null) => v ? new Date(v).toLocaleString('vi-VN') : '—';
const statusBadgeTone = (s: string) => (STATUS_LABELS[s as keyof typeof STATUS_LABELS]?.tone ?? 'gray') as 'gray'|'blue'|'green'|'red'|'yellow';
function useSupplyChain(repairId: number | string | null) {
  return useQuery({
    queryKey: repairRequestKeys.supplyChain(repairId as string),
    queryFn: () => repairRequestService.getSupplyChain(repairId!),
    enabled: !!repairId,
  });
}
interface Props {
  repairId: number | string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (r: RepairRequest) => void;
}
export default function RepairDetailPanel({ repairId, open, onClose, onEdit }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const employeesQ = useEmployeesForAssignment();
  const employeesCatalog = employeesQ.data ?? [];
  const detailQ = useRepairRequest(repairId ?? undefined);
  const statusQ = useRepairStatusHistory(repairId ?? null);
  const supplyQ = useSupplyChain(repairId);
  const costQ = useRepairCostSummary(repairId);
  const incidentalQ = useRepairIncidentalCosts(repairId);
  const createIncidental = useCreateIncidentalCost();
  const updateIncidental = useUpdateIncidentalCost();
  const deleteIncidental = useDeleteIncidentalCost();
  const formatVND2 = (n: number | null | undefined) => n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' ₫';
  const r = detailQ.data?.data ?? null;
  const isSuaChua = r?.requestType === 'SUA_CHUA';
  const isKiemTra = r?.requestType === 'KIEM_TRA';
  const roleUpper = String((user as unknown as { role?: string })?.role ?? '').toUpperCase();
  const deptCode = String((user as unknown as { department?: string; departmentCode?: string })?.department ?? (user as unknown as { departmentCode?: string })?.departmentCode ?? '').toLowerCase();
  const isToBT = roleUpper === 'ADMIN' || roleUpper === 'DEPARTMENT_HEAD' || roleUpper === 'TEAM_LEAD' || deptCode === 'technical';
  const inspectionId = isKiemTra ? (r?.id ?? repairId) : null;
  const inspectionQ = useInspectionStatusHistory(inspectionId as never);
  void inspectionQ;
  const canInspectionWrite = (() => {
    try { return can('inspection-requests','UPDATE', roleUpper) || can('repair-requests','UPDATE', roleUpper) || isToBT; } catch { return isToBT; }
  })();
  // footer modals
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelMode, setCancelMode] = useState<'cancel'|'reject'>('cancel');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const isAdmin = roleUpper === 'ADMIN';
  const isOwner = r ? String((r as unknown as { createdById?: string }).createdById ?? '') === String((user as unknown as { id?: string })?.id ?? '') : false;
  const [insForm, setInsForm] = useState({ ketQuaKiemTra: '', mucDoHuHong: '', deXuatXuLy: '', thoiGianKiemTra: '', nguoiKiemTra: '', ketLuan: '', anhKiemTra: '' });
  const [insFile, setInsFile] = useState<File | null>(null);
  const _rAny = r as unknown as Record<string, unknown> | null;
  const insStatus = (r?.trangThai ?? '') as string;
  const ketLuanVal = String((_rAny as Record<string, unknown> | null)?.ketLuan ?? insForm.ketLuan ?? '');
  const canSubmitInspection = !!(insForm.ketQuaKiemTra.trim() && insForm.ketLuan.trim());
  const [addAssigneeOpen, setAddAssigneeOpen] = useState(false);
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeRole, setAssigneeRole] = useState<'CHINH'|'PHU'>('PHU');
  const [assigneeLead, setAssigneeLead] = useState(false);
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [matForm, setMatForm] = useState({ repairRequestItemId: '', tenVatTu: '', donVi: '', soLuongDuKien: '', ghiChu: '' });
  const [editMatId, setEditMatId] = useState<string | null>(null);
  const [editMatQty, setEditMatQty] = useState({ soLuongDuKien: '', soLuongThucTe: '' });
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [supplySearch, setSupplySearch] = useState('');
  const supplyPickerQ = useQuery({
    queryKey: ['supplyRequests','picker', supplySearch],
    queryFn: async () => {
      const res = await supplyRequestService.getAllSupplyRequests(1, 20, { search: supplySearch || undefined, trangThai: 'Chưa cung cấp' } as never);
      return res as unknown as { data: { id: string; maYeuCau: string; trangThai: string }[] };
    },
    enabled: linkPickerOpen,
  });
  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ keHoachChiTiet: '', phuongAn: '', bienPhapAnToan: '', ngayBatDauKeHoach: '', ngayHoanThienDuKien: '', chiPhiDuKien: '', canNgungMay: false, phongBanId: '' });
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({ warehouseIssueId: '', chiPhiThucTe: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmForm, setConfirmForm] = useState({ ketQua: '' as '' | 'DAT' | 'KHONG_DAT', lyDo: '', chiPhiThucTe: '' });
  const [editCostOpen, setEditCostOpen] = useState(false);
  const [costForm, setCostForm] = useState({ chiPhiThucTe: '', gioCongThucTe: '', noiDungThucHien: '', ngayHoanThanhThucTe: '' });
  const [incForm2, setIncForm2] = useState({ tenKhoan: '', soTien: '', lyDo: '', fileMinhChung: '' });
  const [incEditId2, setIncEditId2] = useState<string | null>(null);
  const [incEdit2, setIncEdit2] = useState({ tenKhoan: '', soTien: '', lyDo: '', fileMinhChung: '' });
  useEffect(() => {
    if (r) setCostForm({ chiPhiThucTe: r.chiPhiThucTe != null ? String(r.chiPhiThucTe) : '', gioCongThucTe: r.gioCongThucTe != null ? String(r.gioCongThucTe) : '', noiDungThucHien: (r as unknown as { noiDungThucHien?: string }).noiDungThucHien ?? '', ngayHoanThanhThucTe: (r as unknown as { ngayHoanThanhThucTe?: string }).ngayHoanThanhThucTe ? String((r as unknown as {ngayHoanThanhThucTe:string}).ngayHoanThanhThucTe).slice(0,10) : '' });
  }, [r?.id]);
  useEffect(() => {
    if (r?.items?.[0]?.id && !matForm.repairRequestItemId) setMatForm(f => ({ ...f, repairRequestItemId: r.items![0]!.id }));
  }, [r]);
  useEffect(() => {
    if (!r || !isKiemTra) return;
    const a = _rAny as Record<string, string | null | undefined>;
    setInsForm({
      ketQuaKiemTra: String(a.ketQuaKiemTra ?? ''),
      mucDoHuHong: String(a.mucDoHuHong ?? ''),
      deXuatXuLy: String(a.deXuatXuLy ?? ''),
      thoiGianKiemTra: a.thoiGianKiemTra ? String(a.thoiGianKiemTra).slice(0,10) : '',
      nguoiKiemTra: String(a.nguoiKiemTra ?? ''),
      ketLuan: String(a.ketLuan ?? ''),
      anhKiemTra: String(a.anhKiemTra ?? ''),
    });
  }, [r?.id, isKiemTra]);
  const materialNeeds = useMemo(() => {
    if (!r) return [];
    const topLevel = (r as unknown as { materialNeeds?: { id: string; tenVatTu: string; donVi: string | null; soLuongDuKien: number; soLuongThucTe: number | null }[] }).materialNeeds ?? [];
    const fromItems = (r.items ?? []).flatMap((it: unknown) => {
      const withNeeds = it as { materialNeeds?: typeof topLevel; tenHeThong: string };
      return (withNeeds.materialNeeds ?? []).map((m: typeof topLevel[number]) => ({ ...m, _itemLabel: withNeeds.tenHeThong }));
    });
    const merged = [...fromItems];
    for (const m of topLevel) if (!merged.some(f => f.id === m.id)) merged.push(m as typeof merged[number]);
    return merged;
  }, [r]);
  const supplyLinks = r?.supplyLinks ?? [];
  const hasMaterialWithoutLink = materialNeeds.length > 0 && supplyLinks.length === 0;
  const invDetail = () => queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId as string) });
  const invInspection = () => { try { queryClient.invalidateQueries({ queryKey: ['inspectionRequests'] as unknown as never }); } catch {} };
  const handleAcceptInspection = async () => {
    if (!r || !repairId) return;
    const id = (r as unknown as { id: number }).id ?? repairId;
    try {
      try { await inspectionRequestService.accept(id); } catch { await repairRequestService.accept(id as never); }
      toast.success('Đã tiếp nhận'); invDetail(); invInspection();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Không tiếp nhận được'); }
  };
  const handleStartInspection = async () => {
    if (!r || !repairId) return;
    if (!confirm('Bắt đầu kiểm tra cho yêu cầu này?')) return;
    const id = (r as unknown as { id: number }).id ?? repairId;
    try { await inspectionRequestService.startInspection(id); toast.success('Đã bắt đầu kiểm tra'); invDetail(); invInspection(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Không bắt đầu được'); }
  };
  const handleSaveInspectionDraft = async () => {
    if (!r || !repairId) return;
    const id = (r as unknown as { id: number }).id ?? repairId;
    try {
      await inspectionRequestService.updateDetails(id, { ketQuaKiemTra: insForm.ketQuaKiemTra || null, mucDoHuHong: insForm.mucDoHuHong || null, deXuatXuLy: insForm.deXuatXuLy || null, thoiGianKiemTra: insForm.thoiGianKiemTra || null, nguoiKiemTra: insForm.nguoiKiemTra || null, ketLuan: insForm.ketLuan || null } as never, insFile ?? undefined);
      toast.success('Đã lưu nháp'); invDetail();
    } catch (e) { toast.error(e instanceof Error ? (e as Error).message : 'Không lưu được'); }
  };
  const handleSubmitInspection = async () => {
    if (!r || !repairId) return;
    const id = (r as unknown as { id: number }).id ?? repairId;
    try {
      await inspectionRequestService.updateDetails(id, { ketQuaKiemTra: insForm.ketQuaKiemTra || null, mucDoHuHong: insForm.mucDoHuHong || null, deXuatXuLy: insForm.deXuatXuLy || null, thoiGianKiemTra: insForm.thoiGianKiemTra || null, nguoiKiemTra: insForm.nguoiKiemTra || null, ketLuan: insForm.ketLuan || null } as never, insFile ?? undefined);
      await inspectionRequestService.submitInspection(id);
      toast.success('Đã gửi kết quả'); invDetail(); invInspection();
    } catch (e) { toast.error(e instanceof Error ? (e as Error).message : 'Không gửi được — kiểm tra kết quả/kết luận'); }
  };
  const [createRepairFromInspection, setCreateRepairFromInspection] = useState<{
    sourceInspectionRequestId: string;
    items: RepairRequestItemInput[];
    ghiChu: string;
  } | null>(null);
  const handleCreateRepairFromInspection = () => {
    if (!r) return;
    const items: RepairRequestItemInput[] = (r.items ?? []).map(it => ({
      tenHeThong: it.tenHeThong,
      tinhTrangThietBi: it.tinhTrangThietBi,
      loaiLoi: it.loaiLoi,
      noiDungLoi: it.noiDungLoi,
      machineSystemId: (it as unknown as { machineSystemId?: string }).machineSystemId ?? undefined,
      machineSystemDetailId: (it as unknown as { machineSystemDetailId?: string }).machineSystemDetailId ?? undefined,
    }));
    setCreateRepairFromInspection({
      sourceInspectionRequestId: String(r.id),
      items,
      ghiChu: 'Tạo từ YCKT ' + r.maYeuCau,
    });
  };
  const handleCompleteInspection = async () => {
    if (!r || !repairId) return;
    const id = (r as unknown as { id: number }).id ?? repairId;
    try { await inspectionRequestService.complete(id); toast.success('Đã hoàn thành'); invDetail(); invInspection(); }
    catch (e) { toast.error(e instanceof Error ? (e as Error).message : 'Không hoàn thành được'); }
  };
  const handleAcceptRepair = async () => {
    if (!repairId) return;
    try { await repairRequestService.accept(repairId); toast.success('Đã tiếp nhận'); invDetail(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Không tiếp nhận được'); }
  };
  const openPlanModal = () => {
    if (!r) return;
    setPlanForm({
      keHoachChiTiet: (r as unknown as { keHoachChiTiet?: string }).keHoachChiTiet ?? '',
      phuongAn: (r as unknown as { phuongAn?: string }).phuongAn ?? '',
      bienPhapAnToan: (r as unknown as { bienPhapAnToan?: string }).bienPhapAnToan ?? '',
      ngayBatDauKeHoach: (r as unknown as { ngayBatDauKeHoach?: string }).ngayBatDauKeHoach ? String((r as unknown as { ngayBatDauKeHoach: string }).ngayBatDauKeHoach).slice(0,10) : '',
      ngayHoanThienDuKien: (r as unknown as { ngayHoanThienDuKien?: string }).ngayHoanThienDuKien ? String((r as unknown as { ngayHoanThienDuKien: string }).ngayHoanThienDuKien).slice(0,10) : '',
      chiPhiDuKien: (r as unknown as { chiPhiDuKien?: number }).chiPhiDuKien != null ? String((r as unknown as { chiPhiDuKien: number }).chiPhiDuKien) : '',
      canNgungMay: !!(r as unknown as { canNgungMay?: boolean }).canNgungMay,
      phongBanId: (r as unknown as { phongBanId?: string }).phongBanId ?? '',
    });
    setPlanOpen(true);
  };
  const handlePlanRepair = openPlanModal;
  const handleConfirmPlan = async () => {
    if (!repairId) return;
    if (planForm.ngayBatDauKeHoach && planForm.ngayHoanThienDuKien) {
      if (new Date(planForm.ngayHoanThienDuKien).getTime() <= new Date(planForm.ngayBatDauKeHoach).getTime()) {
        toast.error('Ngày hoàn thiện dự kiến phải sau ngày bắt đầu kế hoạch'); return;
      }
    }
    const payload: Record<string, unknown> = {};
    if (planForm.keHoachChiTiet.trim()) payload.keHoachChiTiet = planForm.keHoachChiTiet.trim();
    if (planForm.phuongAn.trim()) payload.phuongAn = planForm.phuongAn.trim();
    if (planForm.bienPhapAnToan.trim()) payload.bienPhapAnToan = planForm.bienPhapAnToan.trim();
    if (planForm.ngayBatDauKeHoach) payload.ngayBatDauKeHoach = planForm.ngayBatDauKeHoach;
    if (planForm.ngayHoanThienDuKien) payload.ngayHoanThienDuKien = planForm.ngayHoanThienDuKien;
    if (planForm.chiPhiDuKien !== '') { const n = Number(planForm.chiPhiDuKien); if (!Number.isFinite(n) || n < 0) { toast.error('Chi phí dự kiến phải >= 0'); return; } payload.chiPhiDuKien = n; }
    payload.canNgungMay = planForm.canNgungMay;
    if (planForm.phongBanId.trim()) payload.phongBanId = planForm.phongBanId.trim();
    try { await repairRequestService.plan(repairId, payload as never); toast.success('Đã lên kế hoạch'); setPlanOpen(false); invDetail(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Không lên kế hoạch được'); }
  };
  const handleStartRepair = async () => {
    if (!repairId) return;
    try { await repairRequestService.start(repairId); toast.success('Đã bắt đầu sửa chữa'); invDetail(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Không bắt đầu được'); }
  };
  const openSubmitModal = () => { setSubmitForm({ warehouseIssueId: '', chiPhiThucTe: '' }); setSubmitOpen(true); };
  const handleConfirmSubmitAcceptance = async () => {
    if (!repairId) return;
    if (submitForm.warehouseIssueId.trim()) {
      try {
        await apiClient.post('/acceptance-handovers', {
          repairRequestId: Number(repairId), warehouseIssueId: submitForm.warehouseIssueId.trim(),
          ...(submitForm.chiPhiThucTe ? { chiPhiThucTe: Number(submitForm.chiPhiThucTe) } : {}),
        } as never);
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Không tạo được phiếu bàn giao, vẫn đề nghị nghiệm thu'); }
    }
    if (submitForm.chiPhiThucTe && !submitForm.warehouseIssueId.trim()) {
      const n = Number(submitForm.chiPhiThucTe); if (!Number.isFinite(n) || n < 0) { toast.error('Chi phí thực tế phải >= 0'); return; }
      try { await apiClient.put(`/repair-requests/${repairId}`, { chiPhiThucTe: n } as never); } catch { /* ignore */ }
    }
    try { await repairRequestService.submitAcceptance(repairId); toast.success('Đã đề nghị nghiệm thu'); setSubmitOpen(false); invDetail(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Không đề nghị được'); }
  };
  const handleConfirmAcceptance = async (ketQua: 'DAT'|'KHONG_DAT') => {
    // kept for inline buttons before modal refactor — now opens modal
    setConfirmForm({ ketQua, lyDo: '', chiPhiThucTe: '' }); setConfirmOpen(true);
  };
  const openConfirmModal = (ketQua: 'DAT'|'KHONG_DAT') => { setConfirmForm({ ketQua, lyDo: '', chiPhiThucTe: '' }); setConfirmOpen(true); };
  const handleConfirmAcceptanceSubmit = async () => {
    if (!repairId) return;
    if (!confirmForm.ketQua) { toast.error('Vui lòng chọn kết quả'); return; }
    if (!confirmForm.lyDo.trim()) { toast.error('Vui lòng nhập lý do'); return; }
    let chiPhi: number | undefined;
    if (confirmForm.chiPhiThucTe !== '') { const n = Number(confirmForm.chiPhiThucTe); if (!Number.isFinite(n) || n < 0) { toast.error('Chi phí thực tế phải >= 0'); return; } chiPhi = n; }
    try {
      await repairRequestService.confirmAcceptance(repairId, { ketQua: confirmForm.ketQua, ...(chiPhi !== undefined ? { chiPhiThucTe: chiPhi } : {}), lyDo: confirmForm.lyDo.trim() } as unknown as never);
      toast.success(confirmForm.ketQua === 'DAT' ? 'Nghiệm thu đạt' : 'Đã ghi KHÔNG ĐẠT — quay lại sửa');
      setConfirmOpen(false); invDetail();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Lỗi nghiệm thu'); }
  };
  void handleConfirmAcceptance;
  const handleCompleteRepair = async () => {
    if (!repairId) return;
    try { await repairRequestService.complete(repairId); toast.success('Đã hoàn thành'); invDetail(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Không hoàn thành được'); }
  };
  // body helpers for assignee/material/supply
  const handleAddAssignee = async () => {
    if (!repairId) return;
    try {
      await repairRequestService.assignUser(repairId, { userId: assigneeUserId || undefined, userName: assigneeName || undefined, vaiTro: assigneeRole, isLead: assigneeLead });
      toast.success('Đã phân công');
      setAddAssigneeOpen(false); setAssigneeUserId(''); setAssigneeName('');
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Lỗi phân công'); }
  };
  const handleRemoveAssignee = async (aid: string) => {
    if (!repairId) return;
    if (!confirm('Gỡ phân công này?')) return;
    try { await repairRequestService.unassignUser(repairId, aid); toast.success('Đã gỡ'); queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) }); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Lỗi'); }
  };
  const handleAddMaterial = async () => {
    if (!repairId) return;
    try {
      await repairRequestService.createMaterialNeed(repairId, {
        repairRequestItemId: matForm.repairRequestItemId, tenVatTu: matForm.tenVatTu,
        donVi: matForm.donVi || null, soLuongDuKien: Number(matForm.soLuongDuKien), ghiChu: matForm.ghiChu || null,
      } as never);
      toast.success('Đã thêm vật tư'); setAddMaterialOpen(false);
      setMatForm(f => ({ ...f, tenVatTu: '', donVi: '', soLuongDuKien: '', ghiChu: '' }));
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Lỗi'); }
  };
  const handleUpdateMaterial = async (needId: string) => {
    if (!repairId) return;
    try {
      await repairRequestService.updateMaterialNeed(repairId, needId, {
        soLuongDuKien: editMatQty.soLuongDuKien ? Number(editMatQty.soLuongDuKien) : undefined,
        soLuongThucTe: editMatQty.soLuongThucTe ? Number(editMatQty.soLuongThucTe) : null,
      } as never);
      toast.success('Đã cập nhật'); setEditMatId(null);
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Lỗi'); }
  };
  const handleDeleteMaterial = async (needId: string) => {
    if (!repairId || !confirm('Xóa vật tư này?')) return;
    try { await repairRequestService.deleteMaterialNeed(repairId, needId); toast.success('Đã xóa'); queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) }); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Lỗi'); }
  };
  const handleCreateSupplyFromNeeds = async () => {
    if (!repairId || !r) return;
    if (materialNeeds.length === 0) { toast.error('Chưa có vật tư dự kiến'); return; }
    try {
      const items = materialNeeds.map(m => ({ phanLoai: 'Vật tư', tenGoi: m.tenVatTu, soLuong: Number(m.soLuongDuKien), donViTinh: m.donVi ?? 'cái' }));
      // Resolve Employee.id (BE expects Employee.id, not User.id) — same logic as RepairRequestFormModal
      type EmpOpt = { id: string; userId?: string; name: string; employeeCode: string; department?: string };
      const catalog = employeesCatalog as EmpOpt[];
      const assigneesList = (r as unknown as { assignees?: { userId?: string; userName?: string; isLead?: boolean; vaiTro?: string }[] }).assignees ?? [];
      const leadRaw = assigneesList.find(a => a.isLead) ?? assigneesList.find(a => a.vaiTro === 'CHINH') ?? assigneesList[0] ?? null;
      let leadEmp: EmpOpt | null = null;
      if (leadRaw) {
        const aid = String(leadRaw.userId ?? '').trim();
        const aname = String(leadRaw.userName ?? '').trim();
        leadEmp = catalog.find(e => {
          if (aid && (e.id === aid || e.userId === aid)) return true;
          if (aname && e.name && e.name.trim() === aname) return true;
          if (aname && e.name && e.name.trim().toLowerCase() === aname.toLowerCase()) return true;
          return false;
        }) ?? null;
      }
      const u = user as unknown as Record<string, unknown> | null;
      const userId = String((u?.id as string) ?? (u?._id as string) ?? '').trim();
      const userFullName = String((u?.fullName as string) ?? (u?.name as string) ?? ([u?.firstName, u?.lastName].filter(Boolean).join(' ').trim()) ?? '').trim();
      let viewerEmp: EmpOpt | null = null;
      if (!leadEmp && (userId || userFullName)) {
        viewerEmp = catalog.find(e => {
          if (userId && e.userId === userId) return true;
          if (userFullName && e.name && e.name.trim() === userFullName) return true;
          if (userFullName && e.name && e.name.trim().toLowerCase() === userFullName.toLowerCase()) return true;
          return false;
        }) ?? null;
      }
      const resolvedEmployee: EmpOpt | null = leadEmp ?? viewerEmp;
      if (!resolvedEmployee) {
        toast.error('Không tạo được YCCC: không tìm thấy hồ sơ nhân viên của người phụ trách — vui lòng phân công người phụ trách trước');
        return;
      }
      const resolvedEmployeeId = resolvedEmployee.id;
      const resolvedMaNhanVien = resolvedEmployee.employeeCode || resolvedEmployee.id;
      const resolvedTenNhanVien = resolvedEmployee.name || userFullName || leadRaw?.userName || '';
      let resolvedBoPhan = (resolvedEmployee.department ?? '').trim();
      if (!resolvedBoPhan) {
        resolvedBoPhan = String((u?.subDepartmentName as string) ?? (u?.departmentName as string) ?? (u?.department as string) ?? '').trim() || 'Kỹ thuật';
      }
      if (!resolvedTenNhanVien) {
        toast.error('Không tạo được YCCC: thiếu tên nhân viên — vui lòng kiểm tra hồ sơ nhân viên');
        return;
      }
      const createRes = await supplyRequestService.createSupplyRequest({
        employeeId: resolvedEmployeeId,
        maNhanVien: resolvedMaNhanVien,
        tenNhanVien: resolvedTenNhanVien,
        boPhan: resolvedBoPhan,
        mucDichYeuCau: 'Phục vụ sửa chữa ' + r.maYeuCau,
        mucDoUuTien: r.mucDoUuTien,
        loaiYeuCau: 'Thường',
        items,
      } as never);
      const raw = createRes as unknown as { data?: { id?: string; data?: { id?: string } } | string } & { id?: string };
      const supplyId = String(
        (raw as { data?: { id?: string } })?.data && typeof (raw as { data?: unknown }).data === 'object' ? ((raw as { data: { id?: string; data?: { id?: string } } }).data.id ?? (raw as { data: { data?: { id?: string } } }).data.data?.id ?? '') : ''
      ).trim() || String((raw as { id?: string })?.id ?? '').trim() || String((raw as { data?: string })?.data ?? '').trim();
      // Fallback: try api response shape variations
      const fallbackId = supplyId || String(((createRes as unknown as { data?: { data?: { id?: string } } })?.data as unknown as { data?: { id?: string } })?.data?.id ?? '').trim();
      const finalSupplyId = fallbackId || supplyId;
      if (finalSupplyId) {
        await repairRequestService.linkSupplyRequest(repairId, { supplyRequestId: finalSupplyId });
        toast.success('Đã tạo YCCC và liên kết');
        queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
        queryClient.invalidateQueries({ queryKey: repairRequestKeys.supplyChain(repairId) });
      } else {
        toast.success('Đã tạo YCCC');
        queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) });
        queryClient.invalidateQueries({ queryKey: repairRequestKeys.supplyChain(repairId) });
      }
    } catch (e: unknown) {
      const axiosMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(axiosMsg?.trim() || (e instanceof Error ? e.message : 'Không tạo được YCCC'));
    }
  };
  const handleLinkExisting = async (supplyRequestId: string) => {
    if (!repairId) return;
    try { await repairRequestService.linkSupplyRequest(repairId, { supplyRequestId }); toast.success('Đã liên kết'); setLinkPickerOpen(false); queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) }); queryClient.invalidateQueries({ queryKey: repairRequestKeys.supplyChain(repairId) }); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Lỗi liên kết'); }
  };
  const handleUnlink = async (linkId: string) => {
    if (!repairId || !confirm('Gỡ liên kết này?')) return;
    try { await repairRequestService.unlinkSupplyRequest(repairId, linkId); toast.success('Đã gỡ liên kết'); queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(repairId) }); queryClient.invalidateQueries({ queryKey: repairRequestKeys.supplyChain(repairId) }); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Lỗi'); }
  };
  const handleOpenCancel = (mode: 'cancel'|'reject' = 'cancel') => { setCancelMode(mode); setCancelReason(''); setCancelOpen(true); };
  const handleConfirmCancel = async () => {
    if (!r || !repairId) return;
    const id = (r as unknown as { id: number }).id ?? repairId;
    const reason = cancelReason.trim() || undefined;
    if (cancelMode === 'reject' && !reason) { toast.error('Vui lòng nhập lý do từ chối'); return; }
    try {
      if (isKiemTra) {
        if (cancelMode === 'reject') {
          try { await inspectionRequestService.reject(id, reason); } catch { await repairRequestService.reject(id as never, reason); }
        } else {
          try { await inspectionRequestService.cancel(id, reason); } catch { await repairRequestService.cancel(id as never, reason); }
        }
      } else {
        if (cancelMode === 'reject') await repairRequestService.reject(id as never, reason);
        else await repairRequestService.cancel(id as never, reason);
      }
      toast.success(cancelMode === 'reject' ? 'Đã từ chối' : 'Đã hủy phiếu');
      setCancelOpen(false); invDetail(); invInspection();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Không thực hiện được'); }
  };
  const handleDelete = async () => {
    if (!r || !repairId || !isAdmin) return;
    const id = (r as unknown as { id: number }).id ?? repairId;
    try {
      if (isKiemTra) await inspectionRequestService.delete(id);
      else await repairRequestService.delete(id as never);
      toast.success('Đã xóa'); setDeleteConfirmOpen(false); onClose();
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: ['inspectionRequests'] as unknown as never });
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Không xóa được'); }
  };
  if (!open) return null;
  const renderFooterActions = () => {
    if (!r) return null;
    const s = r.trangThai as string;
    const canShowCancel = s === 'CHO_XU_LY' || s === 'DA_TIEP_NHAN';
    const canShowDelete = isAdmin && (s === 'CHO_XU_LY' || s === 'DA_TIEP_NHAN');
    // allow owner to cancel own CHO_XU_LY even if not isToBT
    const allowOwnerCancel = !isToBT && isOwner && s === 'CHO_XU_LY';
    const leftGroup = (
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setHistoryOpen(true)} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">Lịch sử</button>
        {(canShowCancel || allowOwnerCancel) && (
          <button onClick={() => handleOpenCancel('cancel')} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">Hủy phiếu</button>
        )}
        {canShowDelete && (
          <button onClick={() => setDeleteConfirmOpen(true)} className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100">Xóa</button>
        )}
        {(s === 'HOAN_THANH' || s === 'DA_HUY' || s === 'TU_CHOI') && (
          <button onClick={onClose} className="rounded border px-3 py-2 text-sm hover:bg-gray-50">Đóng</button>
        )}
      </div>
    );
    // Right CTA — gated by isToBT (except owner cancel already handled)
    const rightCta = (() => {
      if (!isToBT && !allowOwnerCancel) {
        // non-ToBT: no transition CTA; for terminal states leftGroup already has Đóng
        if (s === 'HOAN_THANH' || s === 'DA_HUY' || s === 'TU_CHOI') return null;
        return null;
      }
      if (isKiemTra) {
        if (s === 'CHO_XU_LY') return (
          <div className="flex items-center gap-2">
            <button onClick={() => handleOpenCancel('reject')} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Từ chối</button>
            <button onClick={handleAcceptInspection} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Tiếp nhận</button>
          </div>
        );
        if (s === 'DA_TIEP_NHAN') return (
          <div className="flex items-center gap-2">
            <button onClick={() => handleOpenCancel('reject')} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Từ chối</button>
            <button onClick={handleStartInspection} className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">Bắt đầu kiểm tra</button>
          </div>
        );
        if (s === 'DANG_KIEM_TRA') return (
          <div className="flex items-center gap-2">
            <button onClick={handleSaveInspectionDraft} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Lưu nháp</button>
            <button onClick={handleSubmitInspection} disabled={!canSubmitInspection} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Gửi kết quả</button>
          </div>
        );
        if (s === 'DA_KIEM_TRA') {
          if (ketLuanVal === 'CAN_SUA_CHUA') return (<button onClick={handleCreateRepairFromInspection} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Tạo yêu cầu sửa chữa <ArrowRight className="h-4 w-4" /></button>);
          if (ketLuanVal === 'KHONG_CAN' || ketLuanVal === 'THEO_DOI') return (<button onClick={handleCompleteInspection} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Hoàn thành kiểm tra</button>);
          return null;
        }
        if (s === 'HOAN_THANH' || s === 'DA_HUY' || s === 'TU_CHOI') return null;
      }
      if (isSuaChua) {
        if (s === 'CHO_XU_LY') return <button onClick={handleAcceptRepair} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Tiếp nhận</button>;
        if (s === 'DA_TIEP_NHAN') return <button onClick={openPlanModal} className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">Lên kế hoạch</button>;
        if (s === 'LEN_KE_HOACH') return <button onClick={handleStartRepair} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Bắt đầu</button>;
        if (s === 'DANG_SUA_CHUA') return <button onClick={openSubmitModal} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Đề nghị nghiệm thu</button>;
        if (s === 'CHO_NGHIEM_THU') return (<div className="flex gap-2">
          <button onClick={() => openConfirmModal('KHONG_DAT')} className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">KHÔNG ĐẠT</button>
          <button onClick={() => openConfirmModal('DAT')} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">ĐẠT</button>
        </div>);
        if (s === 'DA_NGHIEM_THU') { const cs3 = (costQ.data as unknown as { data?: { itemsWithNullPrice: unknown[] } })?.data; const hasNull3 = (cs3?.itemsWithNullPrice?.length ?? 0) > 0; return <span title={hasNull3 ? 'Có món chưa có giá thành' : undefined}><button onClick={handleCompleteRepair} disabled={hasNull3} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">Hoàn thành</button></span>; }
        if (s === 'HOAN_THANH' || s === 'DA_HUY' || s === 'TU_CHOI') return null;
      }
      return null;
    })();
    return (
      <div className="flex w-full items-center justify-between gap-2 flex-wrap">
        {leftGroup}
        {rightCta && <div className="flex items-center gap-2 ml-auto">{rightCta}</div>}
      </div>
    );
  };
  void handlePlanRepair;
  return (
    <>
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-gray-900">{r?.maYeuCau ?? '#' + repairId}</span>
            {r && <StatusBadge label={REQUEST_TYPE_LABELS[r.requestType]?.label ?? r.requestType} tone={REQUEST_TYPE_LABELS[r.requestType]?.tone ?? 'gray'} size="sm" />}
            {r && <StatusBadge label={STATUS_LABELS[r.trangThai]?.label ?? r.trangThai} tone={statusBadgeTone(r.trangThai)} size="sm" />}
            {r?.sourceInspectionRequestId && (
              <button onClick={() => navigate('/technical/quality?tab=repairAndFault&repairId=' + r.sourceInspectionRequestId)}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                <Link2 className="h-3 w-3" /> Nguồn: {r.sourceInspectionRequestId}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {r && onEdit && <button onClick={() => onEdit(r)} className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50">Sửa</button>}
            <button onClick={onClose} className="rounded p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {detailQ.isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
          {detailQ.isError && <p className="text-sm text-red-600">Không tải được chi tiết.</p>}
          {r && (
            <>
              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm space-y-1">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span>Ngày: <b className="text-gray-900">{formatDate(r.ngayThang)}</b></span>
                  <span>Ưu tiên: <b className="text-gray-900">{r.mucDoUuTien}</b></span>
                  {r.createdByName && <span>Người tạo: <b className="text-gray-900">{r.createdByName}</b></span>}
                  {r.fileDinhKem && <a href={getFileUrl(r.fileDinhKem)} target="_blank" rel="noreferrer" className="text-blue-600 underline">File đính kèm</a>}
                </div>
                {r.ghiChu && <p className="text-sm text-gray-700">Ghi chú: {r.ghiChu}</p>}
                <div className="pt-1">
                  <p className="text-xs font-medium text-gray-600">Hạng mục ({r.items?.length ?? 0})</p>
                  <ul className="mt-1 space-y-1">
                    {(r.items ?? []).map(it => (
                      <li key={it.id} className="rounded border bg-white px-2 py-1 text-xs flex items-center justify-between">
                        <span>{it.tenHeThong} — {it.tinhTrangThietBi} — {it.loaiLoi}
                          {it.faultRecord && <button onClick={() => navigate('/technical/quality?tab=repairAndFault&sub=fault&faultId=' + it.faultRecord!.id)} className="ml-1 text-blue-600 underline">{it.faultRecord.maLoi}</button>}
                        </span>
                        {it.faultRecordId && <span className="ml-2 rounded-full bg-blue-50 border border-blue-200 px-1.5 py-0.5">SC</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <CollapsibleSection title="Lịch sử trạng thái" defaultOpen>
                {statusQ.isLoading ? <p className="text-xs text-gray-400">Đang tải...</p> :
                  (statusQ.data?.data?.length ?? 0) === 0 ? <p className="text-xs text-gray-400">Chưa có.</p> :
                    <ol className="space-y-2">
                      {statusQ.data!.data!.map(log => (
                        <li key={log.id} className="flex gap-2 text-xs">
                          <span className={'mt-1 h-2 w-2 rounded-full shrink-0 ' + (statusBadgeTone(log.newStatus)==='green'?'bg-green-500':statusBadgeTone(log.newStatus)==='blue'?'bg-blue-500':statusBadgeTone(log.newStatus)==='red'?'bg-red-500':'bg-gray-400')} />
                          <div>
                            <p className="font-medium">{STATUS_LABELS[log.oldStatus as RepairRequestStatus]?.label ?? log.oldStatus} → {STATUS_LABELS[log.newStatus as RepairRequestStatus]?.label ?? log.newStatus}</p>
                            {(log as { reason?: string }).reason && <p className="text-gray-500">Lý do: {(log as { reason?: string }).reason}</p>}
                            {(log as { actorName?: string }).actorName && <p className="text-gray-500">Bởi: {(log as { actorName?: string }).actorName} ({(log as { actorRole?: string }).actorRole})</p>}
                            <p className="text-gray-400">{formatDateTime((log as { createdAt: string }).createdAt)}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                }
              </CollapsibleSection>
              {isKiemTra && insStatus === 'DANG_KIEM_TRA' && (
                <div className="rounded-lg border p-3 space-y-3">
                  <h4 className="text-sm font-semibold">Kết quả kiểm tra thực tế</h4>
                  {canInspectionWrite ? (
                    <div className="space-y-2 text-sm">
                      <label className="block space-y-1"><span className="text-xs text-gray-600">Kết quả kiểm tra *</span><textarea rows={3} value={insForm.ketQuaKiemTra} onChange={e=>setInsForm(f=>({...f,ketQuaKiemTra:e.target.value}))} className="w-full rounded border px-2 py-1.5" placeholder="Mô tả kết quả thực tế" /></label>
                      <label className="block space-y-1"><span className="text-xs text-gray-600">Mức độ hư hỏng</span><select value={insForm.mucDoHuHong} onChange={e=>setInsForm(f=>({...f,mucDoHuHong:e.target.value}))} className="w-full rounded border px-2 py-1.5"><option value="">— Chọn —</option><option value="nhe">Nhẹ</option><option value="trung_binh">Trung bình</option><option value="nang">Nặng</option><option value="nguy_hiem">Nguy hiểm</option></select></label>
                      <label className="block space-y-1"><span className="text-xs text-gray-600">Đề xuất xử lý</span><textarea rows={2} value={insForm.deXuatXuLy} onChange={e=>setInsForm(f=>({...f,deXuatXuLy:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1"><span className="text-xs text-gray-600">Thời gian kiểm tra</span><input type="date" value={insForm.thoiGianKiemTra} onChange={e=>setInsForm(f=>({...f,thoiGianKiemTra:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
                        <label className="space-y-1"><span className="text-xs text-gray-600">Người kiểm tra</span><input value={insForm.nguoiKiemTra} onChange={e=>setInsForm(f=>({...f,nguoiKiemTra:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
                      </div>
                      <label className="block space-y-1"><span className="text-xs text-gray-600">Kết luận *</span><select value={insForm.ketLuan} onChange={e=>setInsForm(f=>({...f,ketLuan:e.target.value}))} className="w-full rounded border px-2 py-1.5"><option value="">— Chọn —</option><option value="CAN_SUA_CHUA">Cần sửa chữa</option><option value="KHONG_CAN">Không cần</option><option value="THEO_DOI">Theo dõi</option></select></label>
                      <label className="block space-y-1"><span className="text-xs text-gray-600">Ảnh kiểm tra</span><input type="file" accept="image/*" onChange={e=>setInsFile(e.target.files?.[0] ?? null)} className="w-full text-xs" />{insForm.anhKiemTra && !insFile && <a href={getFileUrl(insForm.anhKiemTra)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Xem ảnh hiện tại</a>}</label>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs text-gray-700">
                      <p><b>Kết quả:</b> {insForm.ketQuaKiemTra || '—'}</p>
                      <p><b>Mức độ:</b> {insForm.mucDoHuHong || '—'}</p>
                      <p><b>Đề xuất:</b> {insForm.deXuatXuLy || '—'}</p>
                      <p><b>Thời gian:</b> {insForm.thoiGianKiemTra || '—'} — <b>Người KT:</b> {insForm.nguoiKiemTra || '—'}</p>
                      <p><b>Kết luận:</b> {insForm.ketLuan || '—'}</p>
                    </div>
                  )}
                </div>
              )}
              {isKiemTra && insStatus === 'DA_KIEM_TRA' && (
                <div className="rounded-lg border p-3 space-y-1">
                  <h4 className="text-sm font-semibold">Kết quả đã điền</h4>
                  <div className="space-y-1 text-xs text-gray-700">
                    <p><b>Kết quả:</b> {String((_rAny as Record<string,unknown>)?.ketQuaKiemTra ?? '—')}</p>
                    <p><b>Mức độ:</b> {String((_rAny as Record<string,unknown>)?.mucDoHuHong ?? '—')}</p>
                    <p><b>Đề xuất:</b> {String((_rAny as Record<string,unknown>)?.deXuatXuLy ?? '—')}</p>
                    <p><b>Thời gian:</b> {String((_rAny as Record<string,unknown>)?.thoiGianKiemTra ?? '—')} — <b>Người KT:</b> {String((_rAny as Record<string,unknown>)?.nguoiKiemTra ?? '—')}</p>
                    <p><b>Kết luận:</b> {String((_rAny as Record<string,unknown>)?.ketLuan ?? '—')}</p>
                    {String((_rAny as Record<string,unknown>)?.anhKiemTra ?? '') && <a href={getFileUrl(String((_rAny as Record<string,unknown>).anhKiemTra))} target="_blank" rel="noreferrer" className="text-blue-600 underline">Ảnh kiểm tra</a>}
                  </div>
                </div>
              )}
              {isSuaChua && (
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1"><Calendar className="h-4 w-4" /> Kế hoạch</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Ngày BĐKH: <b>{formatDate(r.ngayBatDauKeHoach)}</b></div>
                    <div>Ngày HTDK: <b>{formatDate(r.ngayHoanThienDuKien)}</b></div>
                    <div className="col-span-2">Kế hoạch: <span className="text-gray-700">{r.keHoachChiTiet || '—'}</span></div>
                    <div className="col-span-2">Phương án: <span className="text-gray-700">{r.phuongAn || '—'}</span></div>
                    <div className="col-span-2">Biện pháp AT: <span className="text-gray-700">{r.bienPhapAnToan || '—'}</span></div>
                    <div>Cần ngừng máy: <b>{r.canNgungMay ? 'Có' : 'Không'}</b></div>
                    <div>Phòng ban: <b>{r.phongBanId || '—'}</b></div>
                  </div>
                </div>
              )}
              {isSuaChua && (
                <div className="rounded-lg border p-3">
                  <h4 className="text-sm font-semibold">Chi phí dự kiến (từ YCCC đầu)</h4>
                  <p className="mt-1 text-sm">{r.chiPhiDuKien != null ? <span className="font-semibold">{formatVND2(Number(r.chiPhiDuKien))}</span> : <span className="text-gray-400">Chưa có YCCC</span>}</p>
                </div>
              )}
              {isSuaChua && (
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between"><h4 className="text-sm font-semibold flex items-center gap-1"><DollarSign className="h-4 w-4" /> Chi phí & thực hiện</h4>{(r.trangThai==='DA_NGHIEM_THU' || r.trangThai==='HOAN_THANH' || r.trangThai==='CHO_NGHIEM_THU') && <button onClick={()=>setEditCostOpen(v=>!v)} className="rounded border px-2 py-1 text-xs">{editCostOpen?'Đóng':'Sửa thực tế'}</button>}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Dự kiến: <b>{r.chiPhiDuKien != null ? Number(r.chiPhiDuKien).toLocaleString('vi-VN') : '—'}</b></div>
                    <div>Thực tế: <b>{r.chiPhiThucTe != null ? Number(r.chiPhiThucTe).toLocaleString('vi-VN') : '—'}</b></div>
                    <div>Giờ công: <b>{r.gioCongThucTe ?? '—'}</b></div>
                    <div>Kết quả NT: <b>{r.ketQuaNghiemThu ?? '—'}</b></div>
                    <div className="col-span-2">Nội dung TH: <span className="text-gray-700">{r.noiDungThucHien || '—'}</span></div>
                    {(r as unknown as { ngayHoanThanhThucTe?: string }).ngayHoanThanhThucTe && <div className="col-span-2">Ngày HT thực tế: <b>{formatDate((r as unknown as { ngayHoanThanhThucTe: string }).ngayHoanThanhThucTe)}</b></div>}
                  </div>
                  {(r.trangThai==='DA_NGHIEM_THU' || r.trangThai==='HOAN_THANH' || r.trangThai==='CHO_NGHIEM_THU') && editCostOpen && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs border-t pt-2">
                      <label className="space-y-1"><span>Chi phí thực tế</span><input type="number" min={0} value={costForm.chiPhiThucTe} onChange={e=>setCostForm(f=>({...f,chiPhiThucTe:e.target.value}))} className="w-full rounded border px-2 py-1"/></label>
                      <label className="space-y-1"><span>Giờ công thực tế</span><input type="number" min={0} step={0.5} value={costForm.gioCongThucTe} onChange={e=>setCostForm(f=>({...f,gioCongThucTe:e.target.value}))} className="w-full rounded border px-2 py-1"/></label>
                      <label className="col-span-2 space-y-1"><span>Nội dung thực hiện</span><textarea rows={2} value={costForm.noiDungThucHien} onChange={e=>setCostForm(f=>({...f,noiDungThucHien:e.target.value}))} className="w-full rounded border px-2 py-1"/></label>
                      <label className="space-y-1"><span>Ngày hoàn thành thực tế</span><input type="date" value={costForm.ngayHoanThanhThucTe} onChange={e=>setCostForm(f=>({...f,ngayHoanThanhThucTe:e.target.value}))} className="w-full rounded border px-2 py-1"/></label>
                      <div className="col-span-2 flex justify-end"><button onClick={async()=>{ try{ await apiClient.put('/repair-requests/' + repairId, { chiPhiThucTe: costForm.chiPhiThucTe?Number(costForm.chiPhiThucTe):null, gioCongThucTe: costForm.gioCongThucTe?Number(costForm.gioCongThucTe):null, noiDungThucHien: costForm.noiDungThucHien||null, ngayHoanThanhThucTe: costForm.ngayHoanThanhThucTe||null } as never); toast.success('Đã cập nhật thực tế'); queryClient.invalidateQueries({queryKey: repairRequestKeys.detail(repairId as string)}); setEditCostOpen(false);}catch(e){ toast.error(e instanceof Error?(e as Error).message:'Lỗi cập nhật'); } }} className="rounded bg-blue-600 px-3 py-1 text-white">Lưu</button></div>
                    </div>
                  )}
                </div>
              )}
              {isSuaChua && (<div className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1"><Users className="h-4 w-4" /> Người phụ trách</h4>
                  <button onClick={() => setAddAssigneeOpen(true)} className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white"><Plus className="h-3 w-3" /> Thêm</button>
                </div>
                {(r.assignees?.length ?? 0) === 0 ? <p className="text-xs text-gray-400">Chưa phân công.</p> :
                  <ul className="space-y-1">
                    {(r.assignees ?? []).map(a => (
                      <li key={a.id} className="flex items-center justify-between rounded border bg-gray-50 px-2 py-1.5 text-xs">
                        <span className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700"><User className="h-3 w-3" /></span>
                          {a.userName ?? a.userId ?? '—'}
                          <span className={'rounded px-1.5 py-0.5 border text-[10px] ' + (a.vaiTro==='CHINH'?'bg-amber-100 border-amber-200 text-amber-700':'bg-gray-100 border-gray-200')}>{a.vaiTro}</span>
                          {a.isLead && <Crown className="h-3 w-3 text-amber-500" />}
                        </span>
                        <button onClick={() => handleRemoveAssignee(a.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-3 w-3" /></button>
                      </li>
                    ))}
                  </ul>
                }
                {addAssigneeOpen && (
                  <div className="mt-2 rounded border bg-white p-2 space-y-2">
                    <input placeholder="userId (optional)" value={assigneeUserId} onChange={e=>setAssigneeUserId(e.target.value)} className="w-full rounded border px-2 py-1 text-xs" />
                    <input placeholder="Tên hiển thị" value={assigneeName} onChange={e=>setAssigneeName(e.target.value)} className="w-full rounded border px-2 py-1 text-xs" />
                    <div className="flex gap-2">
                      <select value={assigneeRole} onChange={e=>setAssigneeRole(e.target.value as never)} className="rounded border px-2 py-1 text-xs"><option value="PHU">PHU</option><option value="CHINH">CHINH</option></select>
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={assigneeLead} onChange={e=>setAssigneeLead(e.target.checked)} /> Lead</label>
                    </div>
                    <div className="flex gap-1 justify-end"><button onClick={()=>setAddAssigneeOpen(false)} className="rounded border px-2 py-1 text-xs">Hủy</button><button onClick={handleAddAssignee} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Lưu</button></div>
                  </div>
                )}
              </div>)}
              {isSuaChua && (<div className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1"><Package className="h-4 w-4" /> Vật tư dự kiến</h4>
                  <button onClick={() => setAddMaterialOpen(v=>!v)} className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs text-white"><Plus className="h-3 w-3" /> Thêm</button>
                </div>
                {hasMaterialWithoutLink && (
                  <div className="mb-2 rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-xs text-amber-800 flex gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> Đã dự trù {materialNeeds.length} vật tư nhưng chưa tạo YC cung cấp (R1)</div>
                )}
                {addMaterialOpen && (
                  <div className="mb-2 rounded border bg-gray-50 p-2 grid grid-cols-2 gap-2 text-xs">
                    <select value={matForm.repairRequestItemId} onChange={e=>setMatForm(f=>({...f,repairRequestItemId:e.target.value}))} className="col-span-2 rounded border px-2 py-1">
                      <option value="">Chọn hạng mục</option>
                      {(r.items ?? []).map(it=><option key={it.id} value={it.id}>{it.tenHeThong}</option>)}
                    </select>
                    <input placeholder="Tên vật tư" value={matForm.tenVatTu} onChange={e=>setMatForm(f=>({...f,tenVatTu:e.target.value}))} className="rounded border px-2 py-1" />
                    <input placeholder="Đơn vị" value={matForm.donVi} onChange={e=>setMatForm(f=>({...f,donVi:e.target.value}))} className="rounded border px-2 py-1" />
                    <input placeholder="SL dự kiến" type="number" value={matForm.soLuongDuKien} onChange={e=>setMatForm(f=>({...f,soLuongDuKien:e.target.value}))} className="rounded border px-2 py-1" />
                    <input placeholder="Ghi chú" value={matForm.ghiChu} onChange={e=>setMatForm(f=>({...f,ghiChu:e.target.value}))} className="rounded border px-2 py-1" />
                    <div className="col-span-2 flex justify-end gap-1"><button onClick={()=>setAddMaterialOpen(false)} className="rounded border px-2 py-1">Hủy</button><button onClick={handleAddMaterial} className="rounded bg-blue-600 px-2 py-1 text-white">Lưu</button></div>
                  </div>
                )}
                {materialNeeds.length===0 ? <p className="text-xs text-gray-400">Chưa có vật tư.</p> :
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[400px]">
                      <thead className="text-gray-500"><tr><th className="text-left py-1">Tên vật tư</th><th className="text-left">ĐVT</th><th className="text-right">Dự kiến</th><th className="text-right">Thực tế</th><th></th></tr></thead>
                      <tbody>
                        {materialNeeds.map(m=>(
                          <tr key={m.id} className="border-t">
                            <td className="py-1">{m.tenVatTu}</td><td>{m.donVi ?? '—'}</td>
                            <td className="text-right">{editMatId===m.id ? <input value={editMatQty.soLuongDuKien} onChange={e=>setEditMatQty(v=>({...v,soLuongDuKien:e.target.value}))} className="w-16 rounded border px-1 py-0.5 text-right" /> : Number(m.soLuongDuKien)}</td>
                            <td className="text-right">{editMatId===m.id ? <input value={editMatQty.soLuongThucTe} onChange={e=>setEditMatQty(v=>({...v,soLuongThucTe:e.target.value}))} className="w-16 rounded border px-1 py-0.5 text-right" /> : (m.soLuongThucTe ?? '—')}</td>
                            <td className="text-right">
                              {editMatId===m.id ? <><button onClick={()=>handleUpdateMaterial(m.id)} className="text-blue-600 mr-1">Lưu</button><button onClick={()=>setEditMatId(null)} className="text-gray-500">Hủy</button></>
                                : <><button onClick={()=>{setEditMatId(m.id); setEditMatQty({soLuongDuKien:String(m.soLuongDuKien), soLuongThucTe: m.soLuongThucTe!=null?String(m.soLuongThucTe):''});}} className="text-blue-600 mr-1">Sửa</button><button onClick={()=>handleDeleteMaterial(m.id)} className="text-red-500">Xóa</button></>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
              </div>)}
              {isSuaChua && (<div className="rounded-lg border p-3">
                <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><Link2 className="h-4 w-4" /> Yêu cầu cung cấp (YCCC)</h4>
                <div className="flex gap-2 mb-2">
                  <button onClick={handleCreateSupplyFromNeeds} className="rounded bg-green-600 px-2 py-1 text-xs text-white">Tạo YC mới (pre-fill R2)</button>
                  <button onClick={()=>setLinkPickerOpen(true)} className="rounded border px-2 py-1 text-xs">Chọn YC có sẵn (R3)</button>
                </div>
                {supplyLinks.length===0 ? <p className="text-xs text-gray-400">Chưa liên kết YCCC.</p> :
                  <div className="space-y-2">
                    {supplyLinks.map(l=>(
                      <div key={l.id} className="rounded border bg-gray-50 px-2 py-1.5 flex items-center justify-between text-xs">
                        <button onClick={()=>navigate('/supply-chain?supplyId=' + l.supplyRequestId)} className="text-blue-600 hover:underline flex items-center gap-1">{l.supplyRequestId.slice(0,8)} <ExternalLink className="h-3 w-3" /></button>
                        <button onClick={()=>handleUnlink(l.id)} className="text-red-500"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                }
                {supplyQ.data?.data && supplyQ.data.data.length>0 && (
                  <div className="mt-3 space-y-1">
                    {(supplyQ.data.data as SupplyChainEntry[]).map((ch, i)=>(
                      <div key={i} className="rounded border bg-white px-2 py-1.5 text-xs flex flex-wrap items-center gap-1">
                        {ch.supplyRequest ? <span className="rounded-full border bg-blue-50 px-1.5 py-0.5">YCCC {ch.supplyRequest.maYeuCau} [{ch.supplyRequest.trangThai}]</span> : <span className="text-gray-400">YCCC —</span>}
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        {ch.replenishmentRequest ? <button onClick={()=>navigate('/replenishment?replenishmentId=' + ch.replenishmentRequest!.id)} className="rounded-full border bg-amber-50 px-1.5 py-0.5 hover:underline">YCBS {ch.replenishmentRequest.maYeuCau} [{ch.replenishmentRequest.trangThai}]</button> : <span className="text-gray-400">Chưa phát sinh bổ sung</span>}
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        {ch.purchaseRequest ? <button onClick={()=>navigate('/purchasing?purchaseId=' + ch.purchaseRequest!.id)} className="rounded-full border bg-green-50 px-1.5 py-0.5 hover:underline">YCMH {ch.purchaseRequest.maYeuCau} [{ch.purchaseRequest.trangThai}]</button> : <span className="text-gray-400">—</span>}
                        {ch.decisionsMeta?.reason && <span className="text-gray-500">({ch.decisionsMeta.reason})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>)}
              {isSuaChua && (() => {
                const cs = (costQ.data as unknown as { data?: { duKien: number | null; thucTe: number; chenhLech: number | null; itemsWithNullPrice: { tenGoi: string }[] } })?.data ?? null;
                const duKien = cs?.duKien ?? (r.chiPhiDuKien as number | null) ?? null;
                const thucTe = cs?.thucTe ?? 0;
                const chenh = cs?.chenhLech ?? (duKien != null ? thucTe - Number(duKien) : null);
                const hasNull = (cs?.itemsWithNullPrice?.length ?? 0) > 0;
                return (
                  <div className="rounded-lg border p-3 space-y-2">
                    <h4 className="text-sm font-semibold">Tổng hợp chi phí</h4>
                    {hasNull && <div className="rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">Có món chưa có giá thành: {cs!.itemsWithNullPrice.map(x=>x.tenGoi).join(', ')} — <a href="/master-data?tab=products" className="underline">InternationalProduct</a></div>}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded border bg-gray-50 px-1 py-1"><p className="text-gray-500">Dự kiến</p><p className="font-semibold">{duKien != null ? formatVND2(Number(duKien)) : '—'}</p></div>
                      <div className="rounded border bg-blue-50 px-1 py-1"><p className="text-gray-500">Thực tế</p><p className="font-semibold">{formatVND2(thucTe)}</p></div>
                      <div className="rounded border bg-gray-50 px-1 py-1"><p className="text-gray-500">Chênh lệch</p><p className="font-semibold">{chenh != null ? (chenh>0?'+':'')+formatVND2(chenh):'—'}</p></div>
                    </div>
                  </div>
                );
              })()}
              {isSuaChua && (() => {
                const rows: { id: string; tenKhoan: string; soTien: number | string; lyDo: string; fileMinhChung?: string | null }[] = ((incidentalQ.data as unknown as { data?: unknown[] })?.data ?? []) as never;
                return (
                  <div className="rounded-lg border p-3 space-y-2">
                    <h4 className="text-sm font-semibold">Chi phí phát sinh</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs"><thead className="text-gray-500"><tr><th className="text-left py-1">Tên khoản</th><th className="text-right">Số tiền</th><th className="text-left">Lý do *</th><th>File</th><th></th></tr></thead>
                      <tbody>
                        {rows.map(row=>(
                          <tr key={row.id} className="border-t">
                            {incEditId2===row.id ? (
                              <>
                                <td><input value={incEdit2.tenKhoan} onChange={e=>setIncEdit2(s=>({...s, tenKhoan:e.target.value}))} className="w-full rounded border px-1 py-0.5" /></td>
                                <td><input type="number" min={0} value={incEdit2.soTien} onChange={e=>setIncEdit2(s=>({...s, soTien:e.target.value}))} className="w-full rounded border px-1 py-0.5 text-right" /></td>
                                <td><input value={incEdit2.lyDo} onChange={e=>setIncEdit2(s=>({...s, lyDo:e.target.value}))} className="w-full rounded border px-1 py-0.5" /></td>
                                <td><input value={incEdit2.fileMinhChung ?? ''} onChange={e=>setIncEdit2(s=>({...s, fileMinhChung:e.target.value}))} className="w-full rounded border px-1 py-0.5" placeholder="URL" /></td>
                                <td className="text-right"><button onClick={async()=>{ const soTien=Number(incEdit2.soTien); if(!Number.isFinite(soTien)||soTien<0){ toast.error('Số tiền phải >=0'); return; } if(!incEdit2.lyDo.trim()){ toast.error('Lý do bắt buộc'); return; } try{ await updateIncidental.mutateAsync({ id: repairId as string, costId: row.id, payload: { tenKhoan: incEdit2.tenKhoan.trim()||row.tenKhoan, soTien, lyDo: incEdit2.lyDo.trim(), fileMinhChung: incEdit2.fileMinhChung||null } as never }); toast.success('Đã cập nhật'); setIncEditId2(null);}catch(e){ toast.error(e instanceof Error?e.message:'Lỗi'); } }} className="text-blue-600 mr-1">Lưu</button><button onClick={()=>setIncEditId2(null)} className="text-gray-500">Hủy</button></td>
                              </>
                            ) : (
                              <>
                                <td className="py-1">{row.tenKhoan}</td>
                                <td className="text-right">{formatVND2(Number(row.soTien))}</td>
                                <td>{row.lyDo}</td>
                                <td>{row.fileMinhChung ? <a href={row.fileMinhChung} target="_blank" rel="noreferrer" className="text-blue-600 underline">Xem</a> : '—'}</td>
                                <td className="text-right"><button onClick={()=>{ setIncEditId2(row.id); setIncEdit2({ tenKhoan: row.tenKhoan, soTien: String(row.soTien), lyDo: row.lyDo, fileMinhChung: row.fileMinhChung ?? '' }); }} className="text-blue-600 mr-1">Sửa</button><button onClick={async()=>{ if(!confirm('Xóa?')) return; try{ await deleteIncidental.mutateAsync({ id: repairId as string, costId: row.id }); toast.success('Đã xóa'); }catch(e){ toast.error(e instanceof Error?e.message:'Lỗi'); } }} className="text-red-500">Xóa</button></td>
                              </>
                            )}
                          </tr>
                        ))}
                        <tr className="border-t bg-gray-50/50">
                          <td><input placeholder="Tên khoản" value={incForm2.tenKhoan} onChange={e=>setIncForm2(s=>({...s, tenKhoan:e.target.value}))} className="w-full rounded border px-1 py-1 text-xs" /></td>
                          <td><input type="number" min={0} value={incForm2.soTien} onChange={e=>setIncForm2(s=>({...s, soTien:e.target.value}))} className="w-full rounded border px-1 py-1 text-xs text-right" placeholder="0" /></td>
                          <td><input placeholder="Lý do *" value={incForm2.lyDo} onChange={e=>setIncForm2(s=>({...s, lyDo:e.target.value}))} className="w-full rounded border px-1 py-1 text-xs" /></td>
                          <td><input placeholder="File URL" value={incForm2.fileMinhChung} onChange={e=>setIncForm2(s=>({...s, fileMinhChung:e.target.value}))} className="w-full rounded border px-1 py-1 text-xs" /></td>
                          <td><button onClick={async()=>{ const soTien=Number(incForm2.soTien); if(!incForm2.tenKhoan.trim()){ toast.error('Tên khoản bắt buộc'); return; } if(!Number.isFinite(soTien)||soTien<0){ toast.error('Số tiền phải >=0'); return; } if(!incForm2.lyDo.trim()){ toast.error('Lý do bắt buộc'); return; } try{ await createIncidental.mutateAsync({ id: repairId as string, payload: { tenKhoan: incForm2.tenKhoan.trim(), soTien, lyDo: incForm2.lyDo.trim(), fileMinhChung: incForm2.fileMinhChung||null } as never }); toast.success('Đã thêm'); setIncForm2({ tenKhoan:'', soTien:'', lyDo:'', fileMinhChung:'' }); }catch(e){ toast.error(e instanceof Error?e.message:'Lỗi'); } }} className="rounded bg-blue-600 px-2 py-1 text-white">Thêm</button></td>
                        </tr>
                      </tbody></table>
                    </div>
                  </div>
                );
              })()}
              {isSuaChua && (<div className="rounded-lg border p-3">
                <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><FileText className="h-4 w-4" /> Nghiệm thu</h4>
                {(r.acceptanceHandovers?.length ?? 0)===0 ? <p className="text-xs text-gray-400">Chưa có nghiệm thu.</p> :
                  <div className="space-y-1">
                    {r.acceptanceHandovers!.map(h=>(
                      <div key={h.id} className="rounded border bg-gray-50 px-2 py-1.5 text-xs flex items-center justify-between">
                        <span className="font-mono">{h.maNghiemThu} — {formatDate(h.ngayNghiemThu)}</span>
                        <span className={'rounded-full border px-1.5 py-0.5 ' + (h.ketQua==='DAT'?'bg-green-50 border-green-200 text-green-700':h.ketQua==='KHONG_DAT'?'bg-red-50 border-red-200 text-red-700':'bg-gray-100')}>{h.ketQua ?? '—'}</span>
                        {h.warehouseIssueId && <button onClick={()=>navigate('/warehouse?issueId=' + h.warehouseIssueId)} className="text-blue-600 underline">{h.warehouseIssueId.slice(0,8)}</button>}
                      </div>
                    ))}
                  </div>
                }
              </div>)}
            </>
          )}
        </div>
        <div className="shrink-0 sticky bottom-0 border-t bg-white px-4 py-3 flex items-center">
          {r ? renderFooterActions() : <button onClick={onClose} className="rounded border px-4 py-2 text-sm hover:bg-gray-50 ml-auto">Đóng</button>}
        </div>
        {/* Lich su modal */}
        {historyOpen && (
          <Modal isOpen onClose={() => setHistoryOpen(false)} showBackdrop>
            <div className="bg-white rounded-lg w-full max-w-lg p-4 space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Lịch sử trạng thái</h4><button onClick={() => setHistoryOpen(false)}><X className="h-4 w-4" /></button></div>
              {(() => {
                const q = isKiemTra ? inspectionQ : statusQ;
                if (q.isLoading) return <p className="text-xs text-gray-400">Đang tải...</p>;
                const list = (q.data as unknown as { data?: unknown[] })?.data ?? [];
                if (list.length === 0) return <p className="text-xs text-gray-400">Chưa có.</p>;
                return (
                  <ol className="space-y-2 max-h-80 overflow-y-auto">
                    {(list as { id: string; oldStatus: string; newStatus: string; reason?: string; actorName?: string; actorRole?: string; createdAt: string }[]).map(log => (
                      <li key={log.id} className="flex gap-2 text-xs">
                        <span className={'mt-1 h-2 w-2 rounded-full shrink-0 ' + (statusBadgeTone(log.newStatus)==='green'?'bg-green-500':statusBadgeTone(log.newStatus)==='blue'?'bg-blue-500':statusBadgeTone(log.newStatus)==='red'?'bg-red-500':'bg-gray-400')} />
                        <div>
                          <p className="font-medium">{STATUS_LABELS[log.oldStatus as RepairRequestStatus]?.label ?? log.oldStatus} → {STATUS_LABELS[log.newStatus as RepairRequestStatus]?.label ?? log.newStatus}</p>
                          {log.reason && <p className="text-gray-500">Lý do: {log.reason}</p>}
                          {log.actorName && <p className="text-gray-500">Bởi: {log.actorName} ({log.actorRole})</p>}
                          <p className="text-gray-400">{formatDateTime(log.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                );
              })()}
              <div className="flex justify-end"><button onClick={() => setHistoryOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Đóng</button></div>
            </div>
          </Modal>
        )}
        {cancelOpen && (
          <Modal isOpen onClose={() => setCancelOpen(false)} showBackdrop>
            <div className="bg-white rounded-lg w-full max-w-md p-4 space-y-3" onClick={e => e.stopPropagation()}>
              <h4 className="font-semibold text-sm">{cancelMode === 'reject' ? 'Từ chối phiếu' : 'Hủy phiếu'}</h4>
              <label className="block space-y-1 text-sm"><span className="text-xs text-gray-600">Lý do {cancelMode === 'reject' ? '*' : '(tuỳ chọn)'}</span><textarea rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder={cancelMode === 'reject' ? 'Nhập lý do từ chối...' : 'Nhập lý do hủy...'} className="w-full rounded border px-2 py-1.5" /></label>
              <div className="flex justify-end gap-2"><button onClick={() => setCancelOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Đóng</button><button onClick={handleConfirmCancel} className={'rounded px-4 py-2 text-sm font-medium text-white ' + (cancelMode==='reject'?'bg-red-600 hover:bg-red-700':'bg-amber-600 hover:bg-amber-700')}>{cancelMode==='reject'?'Từ chối':'Hủy phiếu'}</button></div>
            </div>
          </Modal>
        )}
        {deleteConfirmOpen && (
          <Modal isOpen onClose={() => setDeleteConfirmOpen(false)} showBackdrop>
            <div className="bg-white rounded-lg w-full max-w-md p-4 space-y-3" onClick={e => e.stopPropagation()}>
              <h4 className="font-semibold text-sm text-red-600">Xóa phiếu?</h4>
              <p className="text-sm text-gray-600">Hành động này không thể hoàn tác. Chỉ ADMIN mới được xóa.</p>
              <div className="flex justify-end gap-2"><button onClick={() => setDeleteConfirmOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Hủy</button><button onClick={handleDelete} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Xóa</button></div>
            </div>
          </Modal>
        )}
        {linkPickerOpen && (
          <Modal isOpen onClose={()=>setLinkPickerOpen(false)} showBackdrop>
            <div className="bg-white rounded-lg w-full max-w-md p-4 space-y-3" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Chọn YCCC có sẵn</h4><button onClick={()=>setLinkPickerOpen(false)}><X className="h-4 w-4" /></button></div>
              <input placeholder="Tìm mã YCCC..." value={supplySearch} onChange={e=>setSupplySearch(e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm" />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {((supplyPickerQ.data as unknown as { data: unknown[] })?.data as { id:string;maYeuCau:string;trangThai:string }[] ?? []).map(s=>(
                  <button key={s.id} onClick={()=>handleLinkExisting(s.id)} className="w-full text-left rounded border px-2 py-1.5 text-xs hover:bg-blue-50 flex justify-between"><span>{s.maYeuCau}</span><span className="text-gray-500">{s.trangThai}</span></button>
                ))}
                {supplyPickerQ.isLoading && <p className="text-xs text-gray-400">Đang tải...</p>}
              </div>
            </div>
          </Modal>
        )}
        {/* ── YCSC transition modals (giữ màu icon, thêm form nhập) ── */}
        {planOpen && (
          <Modal isOpen onClose={() => setPlanOpen(false)} showBackdrop>
            <div className="bg-white rounded-lg w-full max-w-lg p-4 space-y-3" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Lên kế hoạch — {r?.maYeuCau}</h4><button onClick={()=>setPlanOpen(false)}><X className="h-4 w-4" /></button></div>
              <div className="space-y-3 text-sm">
                <label className="block space-y-1"><span className="font-medium text-gray-700">Kế hoạch chi tiết</span><textarea rows={2} value={planForm.keHoachChiTiet} onChange={e=>setPlanForm(f=>({...f, keHoachChiTiet:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
                <label className="block space-y-1"><span className="font-medium text-gray-700">Phương án</span><input value={planForm.phuongAn} onChange={e=>setPlanForm(f=>({...f, phuongAn:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
                <label className="block space-y-1"><span className="font-medium text-gray-700">Biện pháp an toàn</span><input value={planForm.bienPhapAnToan} onChange={e=>setPlanForm(f=>({...f, bienPhapAnToan:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1"><span className="font-medium text-gray-700">Ngày BĐKH</span><input type="date" value={planForm.ngayBatDauKeHoach} onChange={e=>setPlanForm(f=>({...f, ngayBatDauKeHoach:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
                  <label className="space-y-1"><span className="font-medium text-gray-700">Ngày HTDK</span><input type="date" value={planForm.ngayHoanThienDuKien} onChange={e=>setPlanForm(f=>({...f, ngayHoanThienDuKien:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
                </div>
                <label className="block space-y-1"><span className="font-medium text-gray-700">Chi phí dự kiến</span><input type="number" min={0} value={planForm.chiPhiDuKien} onChange={e=>setPlanForm(f=>({...f, chiPhiDuKien:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={planForm.canNgungMay} onChange={e=>setPlanForm(f=>({...f, canNgungMay:e.target.checked}))} /><span>Cần ngừng máy</span></label>
                <label className="block space-y-1"><span className="font-medium text-gray-700">Phòng ban ID</span><input value={planForm.phongBanId} onChange={e=>setPlanForm(f=>({...f, phongBanId:e.target.value}))} placeholder="Để trống nếu không đổi" className="w-full rounded border px-2 py-1.5" /></label>
              </div>
              <div className="flex justify-end gap-2"><button onClick={()=>setPlanOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Hủy</button><button onClick={handleConfirmPlan} className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">Xác nhận kế hoạch</button></div>
            </div>
          </Modal>
        )}
        {submitOpen && (
          <Modal isOpen onClose={()=>setSubmitOpen(false)} showBackdrop>
            <div className="bg-white rounded-lg w-full max-w-md p-4 space-y-3" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Đề nghị nghiệm thu — {r?.maYeuCau}</h4><button onClick={()=>setSubmitOpen(false)}><X className="h-4 w-4" /></button></div>
              <div className="space-y-3 text-sm">
                <label className="block space-y-1"><span className="font-medium text-gray-700">Phiếu xuất kho (warehouseIssueId) — tùy chọn</span><input value={submitForm.warehouseIssueId} onChange={e=>setSubmitForm(f=>({...f, warehouseIssueId:e.target.value}))} placeholder="Nhập ID nếu có" className="w-full rounded border px-2 py-1.5" /></label>
                <label className="block space-y-1"><span className="font-medium text-gray-700">Chi phí thực tế — tùy chọn</span><input type="number" min={0} value={submitForm.chiPhiThucTe} onChange={e=>setSubmitForm(f=>({...f, chiPhiThucTe:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
              </div>
              <div className="flex justify-end gap-2"><button onClick={()=>setSubmitOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Hủy</button><button onClick={handleConfirmSubmitAcceptance} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Đề nghị nghiệm thu</button></div>
            </div>
          </Modal>
        )}
        {confirmOpen && (
          <Modal isOpen onClose={()=>setConfirmOpen(false)} showBackdrop>
            <div className="bg-white rounded-lg w-full max-w-md p-4 space-y-3" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Xác nhận nghiệm thu — {r?.maYeuCau}</h4><button onClick={()=>setConfirmOpen(false)}><X className="h-4 w-4" /></button></div>
              <div className="space-y-3 text-sm">
                <label className="block space-y-1"><span className="font-medium text-gray-700">Kết quả <span className="text-red-500">*</span></span><select value={confirmForm.ketQua} onChange={e=>setConfirmForm(f=>({...f, ketQua:e.target.value as never}))} className="w-full rounded border px-2 py-1.5"><option value="">-- Chọn --</option><option value="DAT">ĐẠT</option><option value="KHONG_DAT">KHÔNG ĐẠT</option></select></label>
                <label className="block space-y-1"><span className="font-medium text-gray-700">Lý do <span className="text-red-500">*</span></span><textarea rows={3} value={confirmForm.lyDo} onChange={e=>setConfirmForm(f=>({...f, lyDo:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
                <label className="block space-y-1"><span className="font-medium text-gray-700">Chi phí thực tế</span><input type="number" min={0} value={confirmForm.chiPhiThucTe} onChange={e=>setConfirmForm(f=>({...f, chiPhiThucTe:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
              </div>
              <div className="flex justify-end gap-2"><button onClick={()=>setConfirmOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Hủy</button><button onClick={handleConfirmAcceptanceSubmit} className={`rounded px-4 py-2 text-sm font-medium text-white ${confirmForm.ketQua==='KHONG_DAT'?'bg-red-600 hover:bg-red-700':'bg-green-600 hover:bg-green-700'}`}>Xác nhận</button></div>
            </div>
          </Modal>
        )}
      </div>
      {createRepairFromInspection && (
        <RepairRequestFormModal
          isOpen={!!createRepairFromInspection}
          mode="create"
          lockedRequestType="SUA_CHUA"
          initialData={createRepairFromInspection}
          onClose={() => setCreateRepairFromInspection(null)}
          onSaved={() => {
            const saved = createRepairFromInspection;
            setCreateRepairFromInspection(null);
            queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
            queryClient.invalidateQueries({ queryKey: repairRequestKeys.lists() });
            queryClient.invalidateQueries({ queryKey: ['inspectionRequests'] as unknown as never });
            void saved;
            navigate('/technical/quality?tab=repairAndFault&sub=repair&type=sua_chua');
          }}
        />
      )}
    </div>
    </>
  );
}
