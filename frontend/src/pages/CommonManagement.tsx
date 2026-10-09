import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { can, isCachedPermissionsLoaded } from '../utils/permissions';
import { UserRole } from '../types/auth';
import { ModalForm, ModalFooter, FormField, inputCls, selectCls, textareaCls, readonlyCls, FileDropZone } from '../components/ModalForm';
import RepairRequestFormModal from '../components/RepairRequestFormModal';
import SupplyRequestModal from '../components/SupplyRequestModal';
import ProcessListModal from '../components/ProcessListModal';
import CreateTaskModal from '../components/CreateTaskModal';
import CreateWorkPlanModal from '../components/CreateWorkPlanModal';
import OvertimePlanListModal from '../components/OvertimePlanListModal';
import PrivateFeedbackModal from '../components/PrivateFeedbackModal';
import ChungInspectionListModal from '../components/ChungInspectionListModal';
import ChungRepairListModal from '../components/ChungRepairListModal';

import {
  FileText, Settings, Users, Briefcase, MessageSquare, AlertTriangle, Plus, ClipboardList, Search, Wrench,
} from 'lucide-react';
import PageHeader from '../design-system/PageHeader';
import { LoadingState } from '../design-system/States';
import toast from 'react-hot-toast';
import {
  generalRequestSchema,
  GeneralRequestFormData,
} from '../schemas/requestSchemas';
import { FeedbackType } from '../services/privateFeedbackService';

type RequestType =
  | 'yeu_cau_sua_chua' | 'yeu_cau_bo_sung' | 'de_nghi_dieu_chinh'
  | 'ke_hoach_tang_ca' | 'nhiem_vu' | 'ke_hoach' | 'gop_y' | 'neu_kho_khan';

const CommonManagement = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const syncingRef = useRef(false);
  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RequestType | ''>('');
  const [isProcessListOpen, setIsProcessListOpen]       = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen]           = useState(false);
  const [isWorkPlanModalOpen, setIsWorkPlanModalOpen]   = useState(false);
  const [isOvertimePlanListOpen, setIsOvertimePlanListOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen]   = useState(false);
  const [feedbackType, setFeedbackType]                 = useState<FeedbackType>('GOP_Y');
  const [isChungInspectionOpen, setIsChungInspectionOpen] = useState(false);
  const [isChungRepairOpen, setIsChungRepairOpen]       = useState(false);

  const generalForm = useForm<GeneralRequestFormData>({
    resolver: zodResolver(generalRequestSchema),
    defaultValues: { title: '', description: '', priority: undefined, department: user?.department || '' },
  });

  // --- Deep-link URL sync for Chung modals ---
  // Route: /common?chung=inspection|repair|overtime&inspectionId=123&repairId=456&overtimePlanId=abc
  // `chung` owns the list modal, inspectionId/repairId/overtimePlanId owns the detail view.
  // Reuses inspectionId/repairId so notification links can target /common directly.
  // Also accepts `chungId` as generic alias for either detail id.
  const OVERTIME_CHUNG_VALUES = new Set(['overtime', 'tangca', 'overtimeplan', 'overtime_plan', 'ke_hoach_tang_ca', 'ke-hoach-tang-ca']);
  const isOvertimeChung = (v: string | null) => !!v && OVERTIME_CHUNG_VALUES.has(v.toLowerCase());
  const chungParam = searchParams.get('chung');
  const urlInspectionId = (() => { const v = searchParams.get('inspectionId') ?? searchParams.get('chungId'); const n = v ? Number(v) : NaN; return Number.isFinite(n) ? n : null; })();
  const urlRepairId = (() => { const v = searchParams.get('repairId') ?? (chungParam === 'repair' || chungParam === 'repairs' ? searchParams.get('chungId') : null); const n = v ? Number(v) : NaN; return Number.isFinite(n) ? n : null; })();
  const urlOvertimePlanId = (() => {
    const v = searchParams.get('overtimePlanId') ?? searchParams.get('planId') ?? searchParams.get('overtimeId');
    return v || null;
  })();

  const pushChung = useCallback((value: 'inspection' | 'repair' | 'overtime') => {
    const next = new URLSearchParams(searchParams);
    next.set('chung', value);
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const clearChung = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('chung');
    next.delete('inspectionId');
    next.delete('repairId');
    next.delete('chungId');
    next.delete('overtimePlanId');
    next.delete('planId');
    next.delete('overtimeId');
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const setDetailParam = useCallback((key: 'inspectionId' | 'repairId', id: number | null) => {
    const next = new URLSearchParams(searchParams);
    if (id != null) next.set(key, String(id));
    else { next.delete(key); next.delete('chungId'); }
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // overtimePlanId là CUID string; xóa cả alias khi đóng detail
  const setOvertimeDetailParam = useCallback((id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id != null) next.set('overtimePlanId', id);
    else { next.delete('overtimePlanId'); next.delete('planId'); next.delete('overtimeId'); }
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // URL -> state: F5 / share link auto-opens modals
  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const chung = searchParams.get('chung');
    // overtime detail alone should also open the list (has a place to show)
    const hasOvertimeDetail = !!(searchParams.get('overtimePlanId') ?? searchParams.get('planId') ?? searchParams.get('overtimeId'));
    if (chung === 'inspection' || chung === 'inspections') {
      if (!isChungInspectionOpen) setIsChungInspectionOpen(true);
    } else if (chung === 'repair' || chung === 'repairs') {
      if (!isChungRepairOpen) setIsChungRepairOpen(true);
    } else if (isOvertimeChung(chung) || hasOvertimeDetail) {
      if (!isOvertimePlanListOpen) setIsOvertimePlanListOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chungParam, urlOvertimePlanId]);

  if (!user) return <LoadingState message="Đang tải thông tin người dùng..." />;

  // noDepartment is only used to gate overtime plan creation (TEAM_LEAD+ only).
  // All Chung cards are visible to every authenticated user — backend requireRule denials are the source of truth.
  const hasAnyDepartment =
    !!user.department ||
    !!user.departmentCode ||
    !!user.departmentName ||
    (user.secondaryDepartments?.length ?? 0) > 0;
  const noDepartment = !hasAnyDepartment;

  // Rule Matrix: tasks/work-plans/approvals — fallback to legacy until loaded
  const _roleMgr = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD;
  const isManagerOrAdmin = isCachedPermissionsLoaded() ? can('tasks', 'APPROVE', user?.role as string) || can('work-plans', 'APPROVE', user?.role as string) : _roleMgr;

  const categories: Array<{
    title: string;
    items: Array<{ id: string; title: string; icon: React.ReactElement; color: string; description: string; create?: boolean }>;
  }> = [
    {
      title: 'Đã ban hành',
      items: [
        { id: 'ds_gop_y',    title: 'Danh sách quy trình',       icon: <MessageSquare className="h-6 w-6" />, color: 'bg-pink-500',   description: 'Xem danh sách quy trình đã ban hành' },
        { id: 'ds_cuoc_hop', title: 'Danh sách các cuộc họp',    icon: <AlertTriangle  className="h-6 w-6" />, color: 'bg-red-500',    description: 'Xem lịch sử và kết quả các cuộc họp' },
      ],
    },
    {
      title: 'Tạo yêu cầu',
      items: [
        { id: 'yeu_cau_sua_chua',   title: 'Tạo yêu cầu kiểm tra',                    icon: <Settings   className="h-6 w-6" />, color: 'bg-blue-500',   description: 'Báo lỗi thiết bị để tổ bảo trì kiểm tra', create: true },
        { id: 'yeu_cau_bo_sung',    title: 'Tạo yêu cầu cung cấp',                    icon: <Plus       className="h-6 w-6" />, color: 'bg-green-500',  description: 'Yêu cầu kho cung cấp vật tư, thiết bị hoặc nhân lực', create: true },
        { id: 'de_nghi_dieu_chinh', title: 'Tạo đề nghị điều chỉnh, bổ sung quy trình', icon: <FileText className="h-6 w-6" />, color: 'bg-purple-500', description: 'Đề xuất thay đổi hoặc cải tiến quy trình làm việc', create: true },
        { id: 'ke_hoach_tang_ca',   title: 'Danh sách kế hoạch tăng ca',               icon: <Briefcase className="h-6 w-6" />, color: 'bg-orange-500', description: 'Xem và quản lý kế hoạch tăng ca' },
      ],
    },
    {
      title: 'Tạo nhiệm vụ và kế hoạch công việc',
      items: [
        { id: 'nhiem_vu', title: 'Tạo nhiệm vụ',          icon: <Users    className="h-6 w-6" />, color: 'bg-indigo-500', description: 'Tạo và phân công nhiệm vụ cho nhân viên', create: true },
        { id: 'ke_hoach', title: 'Tạo kế hoạch công việc', icon: <FileText className="h-6 w-6" />, color: 'bg-teal-500',   description: 'Lập kế hoạch công việc theo thời gian', create: true },
      ],
    },
    {
      title: 'Theo dõi',
      items: [
        { id: 'theo_doi_kiem_tra', title: 'Theo dõi yêu cầu kiểm tra', icon: <Search className="h-6 w-6" />, color: 'bg-sky-500', description: 'Xem danh sách yêu cầu kiểm tra (chỉ xem)' },
        { id: 'theo_doi_sua_chua',  title: 'Theo dõi yêu cầu sửa chữa', icon: <Wrench className="h-6 w-6" />, color: 'bg-amber-500', description: 'Xem danh sách yêu cầu sửa chữa (chỉ xem)' },
      ],
    },
    {
      title: 'Góp ý riêng',
      items: [
        { id: 'gop_y',       title: 'Góp ý riêng', icon: <MessageSquare className="h-6 w-6" />, color: 'bg-pink-500', description: 'Gửi góp ý, đề xuất cải tiến', create: true },
        { id: 'neu_kho_khan', title: 'Nêu khó khăn', icon: <AlertTriangle className="h-6 w-6" />, color: 'bg-red-500',  description: 'Báo cáo khó khăn trong công việc', create: true },
      ],
    },
  ];

  // Chung is visible to every authenticated user; only overtime creation is gated by department + role.
  const visibleCategories = categories;

  const getCategoryTitle = (type: string) =>
    categories.flatMap(c => c.items).find(i => i.id === type)?.title || '';

  const handleCategorySelect = (id: string) => {
    if (id === 'ds_gop_y')          { setIsProcessListOpen(true); return; }
    if (id === 'ds_cuoc_hop')        { toast.error('Chức năng đang bảo trì, vui lòng quay lại sau!'); return; }
    if (id === 'de_nghi_dieu_chinh') { toast.error('Chức năng đang bảo trì, vui lòng quay lại sau!'); return; }
    if (id === 'nhiem_vu')           { setIsTaskModalOpen(true); return; }
    if (id === 'ke_hoach_tang_ca')   { setIsOvertimePlanListOpen(true); pushChung('overtime'); return; }
    if (id === 'ke_hoach')           { setIsWorkPlanModalOpen(true); return; }
    if (id === 'gop_y')              { setFeedbackType('GOP_Y'); setIsFeedbackModalOpen(true); return; }
    if (id === 'neu_kho_khan')       { setFeedbackType('NEU_KHO_KHAN'); setIsFeedbackModalOpen(true); return; }
    if (id === 'theo_doi_kiem_tra')  { setIsChungInspectionOpen(true); pushChung('inspection'); return; }
    if (id === 'theo_doi_sua_chua')  { setIsChungRepairOpen(true); pushChung('repair'); return; }
    setSelectedCategory(id as RequestType);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory('');
    generalForm.reset({ title: '', description: '', priority: undefined, department: user?.department || '' });
  };

  const onSubmitGeneral = generalForm.handleSubmit((data) => {
    console.log('General request data:', data);
    toast.success(`Đã tạo ${getCategoryTitle(selectedCategory)} thành công!`);
    handleCloseModal();
  });

  const ge = generalForm;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chung"
        description={`Tạo yêu cầu, nhiệm vụ và quản lý công việc chung — ${`${user.lastName} ${user.firstName}`.slice(0, 32)}`}
        icon={<ClipboardList className="h-5 w-5 text-blue-500" />}
      />

      {/* Category grid */}
      <div className="space-y-5">
        {visibleCategories.map((cat, i) => (
          <div key={i} className="space-y-2.5">
            <h2 className="text-sm font-semibold text-gray-700">{cat.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.title}
                  onClick={() => handleCategorySelect(item.id)}
                  className="p-3 sm:p-4 rounded-lg border border-gray-200 bg-white text-left hover:border-gray-300 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg text-white shrink-0 ${item.color}`}>
                      {React.cloneElement(item.icon, { className: 'h-5 w-5 sm:h-6 sm:w-6' })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base leading-tight">{item.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Phiếu yêu cầu kiểm tra — Chung chỉ tạo KIEM_TRA, khoa requestType ── */}
      <RepairRequestFormModal
        isOpen={isModalOpen && selectedCategory === 'yeu_cau_sua_chua'}
        onClose={handleCloseModal}
        mode="create"
        hideCodeField
        lockedRequestType="KIEM_TRA"
        onSaved={handleCloseModal}
      />

      {/* ── Yêu cầu chung (de_nghi_dieu_chinh, v.v.) ── */}
      <ModalForm
        isOpen={isModalOpen && selectedCategory !== 'yeu_cau_sua_chua' && selectedCategory !== 'yeu_cau_bo_sung'}
        onClose={handleCloseModal}
        title={getCategoryTitle(selectedCategory)}
        footer={<ModalFooter onClose={handleCloseModal} onSubmit={() => onSubmitGeneral()} submitLabel="Tạo yêu cầu" />}
      >
        <div className="space-y-4">
          <FormField label="Tiêu đề" required error={ge.formState.errors.title?.message}>
            <input {...ge.register('title')} className={inputCls(!!ge.formState.errors.title)}
              placeholder="Nhập tiêu đề yêu cầu..." />
          </FormField>

          <FormField label="Mô tả chi tiết" required error={ge.formState.errors.description?.message}>
            <textarea rows={4} {...ge.register('description')} className={textareaCls(!!ge.formState.errors.description)}
              placeholder="Mô tả chi tiết nội dung yêu cầu..." />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Mức độ ưu tiên" required error={ge.formState.errors.priority?.message}>
              <select {...ge.register('priority')} className={selectCls(!!ge.formState.errors.priority)}>
                <option value="">Chọn mức độ ưu tiên</option>
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
              </select>
            </FormField>
            <FormField label="Phòng ban">
              <input {...ge.register('department')} readOnly className={readonlyCls} />
            </FormField>
          </div>

          <FormField label="Tệp đính kèm">
            <FileDropZone id="general-file-upload" inputProps={{ ...ge.register('attachments') }} />
          </FormField>
        </div>
      </ModalForm>

      {/* ── Các modal riêng ── */}
      <SupplyRequestModal
        isOpen={isModalOpen && selectedCategory === 'yeu_cau_bo_sung'}
        onClose={handleCloseModal}
      />
      <ProcessListModal isOpen={isProcessListOpen} onClose={() => setIsProcessListOpen(false)} />
      <CreateTaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onSuccess={() => {}} />
      <CreateWorkPlanModal isOpen={isWorkPlanModalOpen} onClose={() => setIsWorkPlanModalOpen(false)} onSuccess={() => {}} />
      <OvertimePlanListModal
        isOpen={isOvertimePlanListOpen}
        onClose={() => { setIsOvertimePlanListOpen(false); clearChung(); }}
        isAdmin={isCachedPermissionsLoaded() ? can('overtime-plans', 'APPROVE', user?.role as string) : user?.role === UserRole.ADMIN}
        canViewAll={isCachedPermissionsLoaded() ? can('overtime-plans', 'READ', user?.role as string) : (user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD || user?.department === 'general' || user?.department === 'quality')}
        canCreate={!noDepartment && isManagerOrAdmin}
        highlightPlanId={urlOvertimePlanId ?? undefined}
        onPlanIdChange={setOvertimeDetailParam}
      />
      <PrivateFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        type={feedbackType}
        onSuccess={() => {}}
      />
      <ChungInspectionListModal
        isOpen={isChungInspectionOpen}
        onClose={() => { setIsChungInspectionOpen(false); clearChung(); }}
        initialViewId={urlInspectionId}
        onViewIdChange={(id) => setDetailParam('inspectionId', id)}
      />
      <ChungRepairListModal
        isOpen={isChungRepairOpen}
        onClose={() => { setIsChungRepairOpen(false); clearChung(); }}
        initialViewId={urlRepairId}
        onViewIdChange={(id) => setDetailParam('repairId', id)}
      />
    </div>
  );
};

export default CommonManagement;
