import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import Modal from '../components/Modal';
import { ModalForm, ModalFooter, FormField, inputCls, selectCls, textareaCls, readonlyCls, FileDropZone } from '../components/ModalForm';
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
  repairRequestSchema, generalRequestSchema,
  RepairRequestFormData, GeneralRequestFormData,
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
  const [isSubmitting, setIsSubmitting]                 = useState(false);

  const repairForm = useForm<RepairRequestFormData>({
    resolver: zodResolver(repairRequestSchema),
    defaultValues: {
      employeeName: `${user?.firstName || ''} ${user?.lastName || ''}`,
      systemName: '', usageArea: '', errorContent: '',
      errorType: undefined, priority: undefined, notes: '',
    },
  });

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
    repairForm.reset();
    generalForm.reset({ title: '', description: '', priority: undefined, department: user?.department || '' });
  };

  const onSubmitRepair = repairForm.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      let maYeuCau = '';
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(API_BASE_URL + '/repair-requests/generate-code', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        maYeuCau = result?.data?.code ?? '';
      } catch { /* backend sẽ reject nếu thiếu mã */ }

      formDataToSend.append('ngayThang', new Date().toISOString().split('T')[0]);
      formDataToSend.append('maYeuCau', maYeuCau);
      formDataToSend.append('tenHeThong', data.systemName);
      formDataToSend.append('tinhTrangThietBi', data.usageArea);
      formDataToSend.append('loaiLoi', data.errorType === 'loi_moi' ? 'Lỗi mới' : 'Lỗi lặp lại');
      formDataToSend.append('mucDoUuTien',
        data.priority === 'khan_cap' ? 'Khẩn cấp' :
        data.priority === 'cao'      ? 'Cao' :
        data.priority === 'trung_binh' ? 'Trung bình' : 'Thấp'
      );
      formDataToSend.append('noiDungLoi', data.errorContent);
      formDataToSend.append('ghiChu', data.notes || '');
      formDataToSend.append('trangThai', 'Chờ xử lý');
      if (data.files?.[0]) formDataToSend.append('file', data.files[0]);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(API_BASE_URL + '/repair-requests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataToSend,
      });

      if (response.ok) {
        alert('Đã tạo yêu cầu sửa chữa thành công!');
        handleCloseModal();
      } else {
        const err = await response.json();
        alert(`Lỗi: ${err.message || 'Không thể tạo yêu cầu'}`);
      }
    } catch {
      alert('Có lỗi xảy ra khi tạo yêu cầu sửa chữa');
    } finally {
      setIsSubmitting(false);
    }
  });

  const onSubmitGeneral = generalForm.handleSubmit((data) => {
    console.log('General request data:', data);
    alert(`Đã tạo ${getCategoryTitle(selectedCategory)} thành công!`);
    handleCloseModal();
  });

  const re = repairForm;
  const ge = generalForm;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Chung</h1>
        <p className="text-blue-100 mt-2">
          Tạo yêu cầu, nhiệm vụ và quản lý công việc chung — {user.firstName} {user.lastName}
        </p>
      </div>

      {/* Category grid */}
      <div className="space-y-8">
        {categories.map((cat, i) => (
          <div key={i} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">{cat.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleCategorySelect(item.id)}
                  className="p-4 rounded-lg border-2 border-gray-200 bg-white text-left transition-all hover:shadow-md hover:border-gray-300"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg text-white shrink-0 ${item.color}`}>{item.icon}</div>
                    <div>
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Phiếu yêu cầu sửa chữa ── */}
      <ModalForm
        isOpen={isModalOpen && selectedCategory === 'yeu_cau_sua_chua'}
        onClose={handleCloseModal}
        title="Tạo phiếu yêu cầu sửa chữa kiểm tra"
        isLoading={isSubmitting}
        footer={<ModalFooter onClose={handleCloseModal} onSubmit={() => onSubmitRepair()} submitLabel="Tạo yêu cầu sửa chữa" isLoading={isSubmitting} />}
      >
        <div className="space-y-4">
          <FormField label="Tên nhân viên">
            <input type="text" readOnly value={`${user?.firstName || ''} ${user?.lastName || ''}`} className={readonlyCls} />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Tên hệ thống / thiết bị" required error={re.formState.errors.systemName?.message}>
              <input {...re.register('systemName')} className={inputCls(!!re.formState.errors.systemName)}
                placeholder="VD: Máy sấy MS-01, Băng tải đóng gói, Nồi chiên VF-003" />
            </FormField>
            <FormField label="Khu vực sử dụng" required error={re.formState.errors.usageArea?.message}>
              <input {...re.register('usageArea')} className={inputCls(!!re.formState.errors.usageArea)}
                placeholder="VD: Xưởng sản xuất, Kho nguyên liệu, Phòng kỹ thuật" />
            </FormField>
          </div>

          <FormField label="Nội dung lỗi" required error={re.formState.errors.errorContent?.message}>
            <textarea rows={3} {...re.register('errorContent')} className={textareaCls(!!re.formState.errors.errorContent)}
              placeholder="Mô tả chi tiết triệu chứng lỗi, thời điểm phát sinh, ảnh hưởng đến sản xuất..." />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Loại lỗi" required error={re.formState.errors.errorType?.message}>
              <select {...re.register('errorType')} className={selectCls(!!re.formState.errors.errorType)}>
                <option value="">Chọn loại lỗi</option>
                <option value="loi_moi">Lỗi mới</option>
                <option value="loi_lap_lai">Lỗi lặp lại</option>
              </select>
            </FormField>
            <FormField label="Mức độ ưu tiên" required error={re.formState.errors.priority?.message}>
              <select {...re.register('priority')} className={selectCls(!!re.formState.errors.priority)}>
                <option value="">Chọn mức độ ưu tiên</option>
                <option value="khan_cap">Khẩn cấp</option>
                <option value="cao">Cao</option>
                <option value="trung_binh">Trung bình</option>
                <option value="thap">Thấp</option>
              </select>
            </FormField>
          </div>

          <FormField label="Ghi chú">
            <textarea rows={2} {...re.register('notes')} className={textareaCls()}
              placeholder="Ghi chú thêm nếu có..." />
          </FormField>

          <FormField label="Tệp đính kèm">
            <FileDropZone id="repair-file-upload" inputProps={{ ...re.register('files') }} />
          </FormField>
        </div>
      </ModalForm>

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
        canViewAll={user?.role === 'admin'}
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
