import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { ModalForm, ModalFooter, FormField, inputCls, selectCls, textareaCls, readonlyCls, FileDropZone } from '../components/ModalForm';
import RepairRequestFormModal from '../components/RepairRequestFormModal';
import SupplyRequestModal from '../components/SupplyRequestModal';
import ProcessListModal from '../components/ProcessListModal';
import CreateTaskModal from '../components/CreateTaskModal';
import CreateWorkPlanModal from '../components/CreateWorkPlanModal';
import OvertimePlanListModal from '../components/OvertimePlanListModal';
import PrivateFeedbackModal from '../components/PrivateFeedbackModal';
import {
  FileText, Settings, Users, Briefcase, MessageSquare, AlertTriangle, Plus,
} from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RequestType | ''>('');
  const [isProcessListOpen, setIsProcessListOpen]       = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen]           = useState(false);
  const [isWorkPlanModalOpen, setIsWorkPlanModalOpen]   = useState(false);
  const [isOvertimePlanListOpen, setIsOvertimePlanListOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen]   = useState(false);
  const [feedbackType, setFeedbackType]                 = useState<FeedbackType>('GOP_Y');

  const generalForm = useForm<GeneralRequestFormData>({
    resolver: zodResolver(generalRequestSchema),
    defaultValues: { title: '', description: '', priority: undefined, department: user?.department || '' },
  });

  if (!user) return <div>Loading...</div>;

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'department_head';

  const categories = [
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
        { id: 'yeu_cau_sua_chua',   title: 'Tạo phiếu yêu cầu sửa chữa kiểm tra',    icon: <Settings   className="h-6 w-6" />, color: 'bg-blue-500',   description: 'Yêu cầu sửa chữa thiết bị, máy móc hoặc cơ sở vật chất' },
        { id: 'yeu_cau_bo_sung',    title: 'Tạo yêu cầu bổ sung/cung cấp',            icon: <Plus       className="h-6 w-6" />, color: 'bg-green-500',  description: 'Yêu cầu bổ sung vật tư, thiết bị hoặc nhân lực' },
        { id: 'de_nghi_dieu_chinh', title: 'Tạo đề nghị điều chỉnh, bổ sung quy trình', icon: <FileText className="h-6 w-6" />, color: 'bg-purple-500', description: 'Đề xuất thay đổi hoặc cải tiến quy trình làm việc' },
        { id: 'ke_hoach_tang_ca',   title: 'Danh sách kế hoạch tăng ca',               icon: <Briefcase className="h-6 w-6" />, color: 'bg-orange-500', description: 'Xem và quản lý kế hoạch tăng ca' },
      ],
    },
    {
      title: 'Tạo nhiệm vụ và kế hoạch công việc',
      items: [
        { id: 'nhiem_vu', title: 'Tạo nhiệm vụ',          icon: <Users    className="h-6 w-6" />, color: 'bg-indigo-500', description: 'Tạo và phân công nhiệm vụ cho nhân viên' },
        { id: 'ke_hoach', title: 'Tạo kế hoạch công việc', icon: <FileText className="h-6 w-6" />, color: 'bg-teal-500',   description: 'Lập kế hoạch công việc theo thời gian' },
      ],
    },
    {
      title: 'Góp ý riêng',
      items: [
        { id: 'gop_y',       title: 'Góp ý riêng', icon: <MessageSquare className="h-6 w-6" />, color: 'bg-pink-500', description: 'Gửi góp ý, đề xuất cải tiến' },
        { id: 'neu_kho_khan', title: 'Nêu khó khăn', icon: <AlertTriangle className="h-6 w-6" />, color: 'bg-red-500',  description: 'Báo cáo khó khăn trong công việc' },
      ],
    },
  ];

  const getCategoryTitle = (type: string) =>
    categories.flatMap(c => c.items).find(i => i.id === type)?.title || '';

  const handleCategorySelect = (id: string) => {
    if (id === 'ds_gop_y')          { setIsProcessListOpen(true); return; }
    if (id === 'ds_cuoc_hop')        { alert('Chức năng đang bảo trì, vui lòng quay lại sau!'); return; }
    if (id === 'de_nghi_dieu_chinh') { alert('Chức năng đang bảo trì, vui lòng quay lại sau!'); return; }
    if (id === 'nhiem_vu')           { setIsTaskModalOpen(true); return; }
    if (id === 'ke_hoach_tang_ca')   { setIsOvertimePlanListOpen(true); return; }
    if (id === 'ke_hoach')           { setIsWorkPlanModalOpen(true); return; }
    if (id === 'gop_y')              { setFeedbackType('GOP_Y'); setIsFeedbackModalOpen(true); return; }
    if (id === 'neu_kho_khan')       { setFeedbackType('NEU_KHO_KHAN'); setIsFeedbackModalOpen(true); return; }
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
    alert(`Đã tạo ${getCategoryTitle(selectedCategory)} thành công!`);
    handleCloseModal();
  });

  const ge = generalForm;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-6 rounded-lg">
        <h1 className="text-xl sm:text-2xl font-bold">Chung</h1>
        <p className="text-blue-100 text-sm sm:text-base mt-1 sm:mt-2">
          Tạo yêu cầu, nhiệm vụ và quản lý công việc chung — {user.lastName} {user.firstName}
        </p>
      </div>

      {/* Category grid */}
      <div className="space-y-6 sm:space-y-8">
        {categories.map((cat, i) => (
          <div key={i} className="space-y-2 sm:space-y-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{cat.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleCategorySelect(item.id)}
                  className="p-3 sm:p-4 rounded-lg border-2 border-gray-200 bg-white text-left transition-all hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 active:scale-[0.98] min-h-[72px] sm:min-h-0"
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

      {/* ── Phiếu yêu cầu sửa chữa ── */}
      <RepairRequestFormModal
        isOpen={isModalOpen && selectedCategory === 'yeu_cau_sua_chua'}
        onClose={handleCloseModal}
        mode="create"
        hideCodeField
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
        onClose={() => setIsOvertimePlanListOpen(false)}
        isAdmin={user?.role === 'admin'}
        canViewAll={user?.role === 'admin' || user?.role === 'department_head' || user?.department === 'general' || user?.department === 'quality'}
        canCreate={isManagerOrAdmin}
      />
      <PrivateFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        type={feedbackType}
        onSuccess={() => {}}
      />
    </div>
  );
};

export default CommonManagement;
