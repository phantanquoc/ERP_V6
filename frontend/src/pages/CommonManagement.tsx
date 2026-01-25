import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import SupplyRequestModal from '../components/SupplyRequestModal';
import ProcessListModal from '../components/ProcessListModal';
import CreateTaskModal from '../components/CreateTaskModal';
import PrivateFeedbackModal from '../components/PrivateFeedbackModal';
import {
  FileText,
  Settings,
  Users,
  Briefcase,
  MessageSquare,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  X,
  Upload
} from 'lucide-react';
import {
  repairRequestSchema,
  generalRequestSchema,
  RepairRequestFormData,
  GeneralRequestFormData
} from '../schemas/requestSchemas';
import { FeedbackType } from '../services/privateFeedbackService';

// Types for different request types
type RequestType = 'yeu_cau_sua_chua' | 'yeu_cau_bo_sung' | 'de_nghi_dieu_chinh' | 'de_nghi_mua_hang' | 'nhiem_vu' | 'ke_hoach' | 'gop_y' | 'neu_kho_khan';

const CommonManagement = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<RequestType | ''>('');
  const [isProcessListOpen, setIsProcessListOpen] = useState<boolean>(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);

  // Private Feedback Modal states
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('GOP_Y');

  // React Hook Form for repair requests
  const repairForm = useForm<RepairRequestFormData>({
    resolver: zodResolver(repairRequestSchema),
    defaultValues: {
      employeeName: `${user?.firstName || ''} ${user?.lastName || ''}`,
      systemName: '',
      usageArea: '',
      errorContent: '',
      errorType: undefined,
      priority: undefined,
      notes: '',
    }
  });

  // React Hook Form for general requests
  const generalForm = useForm<GeneralRequestFormData>({
    resolver: zodResolver(generalRequestSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: undefined,
      department: user?.department || '',
    }
  });

  if (!user) return <div>Loading...</div>;

  const categories = [
        {
      title: 'Đã ban hành',
      items: [
        {
          id: 'ds_gop_y',
          title: 'Danh sách quy trình',
          icon: <MessageSquare className="h-6 w-6" />,
          color: 'bg-pink-500',
          description: 'Gửi góp ý, đề xuất cải tiến'
        },
        {
          id: 'ds_cuoc_hop',
          title: 'Danh sách các cuộc họp',
          icon: <AlertTriangle className="h-6 w-6" />,
          color: 'bg-red-500',
          description: 'Báo cáo khó khăn trong công việc'
        }
      ]
    },
    {
      title: 'Tạo yêu cầu',
      items: [
        {
          id: 'yeu_cau_sua_chua',
          title: 'Tạo phiếu yêu cầu sửa chữa kiểm tra',
          icon: <Settings className="h-6 w-6" />,
          color: 'bg-blue-500',
          description: 'Yêu cầu sửa chữa thiết bị, máy móc hoặc cơ sở vật chất'
        },
        {
          id: 'yeu_cau_bo_sung',
          title: 'Tạo yêu cầu bổ sung/cung cấp',
          icon: <Plus className="h-6 w-6" />,
          color: 'bg-green-500',
          description: 'Yêu cầu bổ sung vật tư, thiết bị hoặc nhân lực'
        },
        {
          id: 'de_nghi_dieu_chinh',
          title: 'Tạo đề nghị điều chỉnh, bổ sung quy trình',
          icon: <FileText className="h-6 w-6" />,
          color: 'bg-purple-500',
          description: 'Đề xuất thay đổi hoặc cải tiến quy trình làm việc'
        },
        {
          id: 'de_nghi_mua_hang',
          title: 'Tạo kế hoạch cuộc họp',
          icon: <Briefcase className="h-6 w-6" />,
          color: 'bg-orange-500',
          description: 'Lập kế hoạch và tổ chức cuộc họp'
        }
      ]
    },
    {
      title: 'Tạo Nhiệm vụ và kế hoạch công việc',
      items: [
        {
          id: 'nhiem_vu',
          title: 'Tạo nhiệm vụ',
          icon: <Users className="h-6 w-6" />,
          color: 'bg-indigo-500',
          description: 'Tạo và phân công nhiệm vụ cho nhân viên'
        },
        {
          id: 'ke_hoach',
          title: 'Tạo kế hoạch công việc',
          icon: <FileText className="h-6 w-6" />,
          color: 'bg-teal-500',
          description: 'Lập kế hoạch công việc theo thời gian'
        }
      ]
    },
    {
      title: 'Góp ý riêng',
      items: [
        {
          id: 'gop_y',
          title: 'Góp ý riêng',
          icon: <MessageSquare className="h-6 w-6" />,
          color: 'bg-pink-500',
          description: 'Gửi góp ý, đề xuất cải tiến'
        },
        {
          id: 'neu_kho_khan',
          title: 'Nêu khó khăn',
          icon: <AlertTriangle className="h-6 w-6" />,
          color: 'bg-red-500',
          description: 'Báo cáo khó khăn trong công việc'
        }
      ]
    }
  ];

  const handleCategorySelect = (categoryId: string) => {
    // Xử lý "Danh sách quy trình"
    if (categoryId === 'ds_gop_y') {
      setIsProcessListOpen(true);
      return;
    }

    // "Danh sách các cuộc họp" - chưa implement
    if (categoryId === 'ds_cuoc_hop') {
      return;
    }

    // Xử lý "Tạo nhiệm vụ"
    if (categoryId === 'nhiem_vu') {
      setIsTaskModalOpen(true);
      return;
    }

    // Xử lý "Góp ý riêng"
    if (categoryId === 'gop_y') {
      setFeedbackType('GOP_Y');
      setIsFeedbackModalOpen(true);
      return;
    }

    // Xử lý "Nêu khó khăn"
    if (categoryId === 'neu_kho_khan') {
      setFeedbackType('NEU_KHO_KHAN');
      setIsFeedbackModalOpen(true);
      return;
    }

    setSelectedCategory(categoryId as RequestType);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory('');
    repairForm.reset();
    generalForm.reset({
      title: '',
      description: '',
      priority: undefined,
      department: user?.department || '',
    });
  };

  const onSubmitRepair = async (data: RepairRequestFormData) => {
    try {
      const formDataToSend = new FormData();

      // Map form data to API format
      formDataToSend.append('ngayThang', new Date().toISOString().split('T')[0]);
      formDataToSend.append('maYeuCau', `YC-${Date.now()}`); // Auto generate code
      formDataToSend.append('tenHeThong', data.systemName);
      formDataToSend.append('tinhTrangThietBi', data.usageArea);
      formDataToSend.append('loaiLoi', data.errorType === 'loi_moi' ? 'Lỗi mới' : 'Lỗi lặp lại');
      formDataToSend.append('mucDoUuTien',
        data.priority === 'khan_cap' ? 'Khẩn cấp' :
        data.priority === 'cao' ? 'Cao' :
        data.priority === 'trung_binh' ? 'Trung bình' : 'Thấp'
      );
      formDataToSend.append('noiDungLoi', data.errorContent);
      formDataToSend.append('ghiChu', data.notes || '');
      formDataToSend.append('trangThai', 'Chờ xử lý');

      // Add file if exists
      if (data.files && data.files.length > 0) {
        formDataToSend.append('file', data.files[0]);
      }

      const token = localStorage.getItem('accessToken');
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/repair-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (response.ok) {
        alert('Đã tạo yêu cầu sửa chữa thành công!');
        handleCloseModal();
      } else {
        const errorData = await response.json();
        alert(`Lỗi: ${errorData.message || 'Không thể tạo yêu cầu'}`);
      }
    } catch (error) {
      console.error('Error creating repair request:', error);
      alert('Có lỗi xảy ra khi tạo yêu cầu sửa chữa');
    }
  };

  const onSubmitGeneral = (data: GeneralRequestFormData) => {
    console.log('General request data:', data);
    alert(`Đã tạo ${getCategoryTitle(selectedCategory)} thành công!`);
    handleCloseModal();
  };

  const getCategoryTitle = (type: string) => {
    const allItems = categories.flatMap(cat => cat.items);
    return allItems.find(item => item.id === type)?.title || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Chung</h1>
        <p className="text-blue-100 mt-2">
          Tạo yêu cầu, nhiệm vụ và quản lý công việc chung - {user.firstName} {user.lastName}
        </p>
      </div>

      {/* Content */}
      <div className="space-y-8">
        <div className="space-y-8">
          {/* Categories */}
          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">{category.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleCategorySelect(item.id)}
                    className="p-4 rounded-lg border-2 border-gray-200 bg-white text-left transition-all hover:shadow-md hover:border-gray-300"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg text-white ${item.color}`}>
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}


        </div>

      {/* Modal - Hide when supply request is selected */}
      <Modal isOpen={isModalOpen && selectedCategory !== 'yeu_cau_bo_sung'} onClose={handleCloseModal} showBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {getCategoryTitle(selectedCategory)}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Header with company logo - only for repair request */}
              {selectedCategory === 'yeu_cau_sua_chua' && (
                <div className="flex items-center justify-center mb-6 p-4 border-2 border-gray-300 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 flex items-center justify-center">
                      <img src="/logo.png" alt="Company Logo" className="w-16 h-16 object-contain" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-800 border-2 border-gray-400 px-6 py-2">
                        BÁO LỖI HỆ THỐNG/ THIẾT BỊ
                      </h2>
                    </div>
                  </div>
                </div>
              )}

              {/* Form fields for repair request */}
              {selectedCategory === 'yeu_cau_sua_chua' ? (
                <form onSubmit={repairForm.handleSubmit(onSubmitRepair)} className="space-y-0">
                  {/* Employee Name */}
                  <div className="grid grid-cols-4 gap-0 border border-gray-300">
                    <div className="bg-gray-100 p-3 border-r border-gray-300 font-medium">
                      Tên nhân viên:
                    </div>
                    <div className="col-span-3 p-3 bg-blue-50">
                      {user?.firstName} {user?.lastName}
                    </div>
                  </div>

                  {/* System/Equipment Name */}
                  <div className="grid grid-cols-4 gap-0 border border-gray-300 border-t-0">
                    <div className="bg-gray-100 p-3 border-r border-gray-300 font-medium">
                      Tên hệ thống/ thiết bị <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-3 p-3 bg-blue-50">
                      <input
                        type="text"
                        {...repairForm.register('systemName')}
                        className={`w-full bg-transparent border-none outline-none ${
                          repairForm.formState.errors.systemName ? 'text-red-600' : ''
                        }`}
                        placeholder="Nhập tên hệ thống/thiết bị..."
                      />
                      {repairForm.formState.errors.systemName && (
                        <p className="text-red-500 text-xs mt-1">{repairForm.formState.errors.systemName.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Usage Area */}
                  <div className="grid grid-cols-4 gap-0 border border-gray-300 border-t-0">
                    <div className="bg-gray-100 p-3 border-r border-gray-300 font-medium">
                      Khu vực sử dụng <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-3 p-3 bg-blue-50">
                      <input
                        type="text"
                        {...repairForm.register('usageArea')}
                        className={`w-full bg-transparent border-none outline-none ${
                          repairForm.formState.errors.usageArea ? 'text-red-600' : ''
                        }`}
                        placeholder="Nhập khu vực sử dụng..."
                      />
                      {repairForm.formState.errors.usageArea && (
                        <p className="text-red-500 text-xs mt-1">{repairForm.formState.errors.usageArea.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Error Content */}
                  <div className="grid grid-cols-4 gap-0 border border-gray-300 border-t-0">
                    <div className="bg-yellow-100 p-3 border-r border-gray-300 font-medium">
                      Nội dung lỗi <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-3 p-3 bg-yellow-50">
                      <textarea
                        rows={3}
                        {...repairForm.register('errorContent')}
                        className={`w-full bg-transparent border-none outline-none resize-none ${
                          repairForm.formState.errors.errorContent ? 'text-red-600' : ''
                        }`}
                        placeholder="Mô tả chi tiết lỗi..."
                      />
                      {repairForm.formState.errors.errorContent && (
                        <p className="text-red-500 text-xs mt-1">{repairForm.formState.errors.errorContent.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Error Type */}
                  <div className="grid grid-cols-4 gap-0 border border-gray-300 border-t-0">
                    <div className="bg-yellow-100 p-3 border-r border-gray-300 font-medium">
                      Loại lỗi <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-3 p-3 bg-yellow-50">
                      <select
                        {...repairForm.register('errorType')}
                        className={`w-full bg-transparent border-none outline-none ${
                          repairForm.formState.errors.errorType ? 'text-red-600' : ''
                        }`}
                      >
                        <option value="">Chọn loại lỗi</option>
                        <option value="loi_moi">Lỗi mới</option>
                        <option value="loi_lap_lai">Lỗi lặp lại</option>
                        {/* <option value="loi_he_thong">Lỗi hệ thống</option>
                        <option value="loi_phan_cung">Lỗi phần cứng</option>
                        <option value="loi_phan_mem">Lỗi phần mềm</option> */}
                      </select>
                      {repairForm.formState.errors.errorType && (
                        <p className="text-red-500 text-xs mt-1">{repairForm.formState.errors.errorType.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Priority Level */}
                  <div className="grid grid-cols-4 gap-0 border border-gray-300 border-t-0">
                    <div className="bg-yellow-100 p-3 border-r border-gray-300 font-medium">
                      Mức độ ưu tiên <span className="text-red-500">*</span>
                    </div>
                    <div className="col-span-3 p-3 bg-yellow-50">
                      <select
                        {...repairForm.register('priority')}
                        className={`w-full bg-transparent border-none outline-none ${
                          repairForm.formState.errors.priority ? 'text-red-600' : ''
                        }`}
                      >
                        <option value="">Chọn mức độ ưu tiên</option>
                        <option value="khan_cap">Khẩn cấp</option>
                        <option value="cao">Cao</option>
                        <option value="trung_binh">Trung bình</option>
                        <option value="thap">Thấp</option>
                       
                      </select>
                      {repairForm.formState.errors.priority && (
                        <p className="text-red-500 text-xs mt-1">{repairForm.formState.errors.priority.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="grid grid-cols-4 gap-0 border border-gray-300 border-t-0">
                    <div className="bg-gray-100 p-3 border-r border-gray-300 font-medium">
                      Ghi chú:
                    </div>
                    <div className="col-span-3 p-3 bg-gray-50">
                      <textarea
                        rows={2}
                        {...repairForm.register('notes')}
                        className="w-full bg-transparent border-none outline-none resize-none"
                        placeholder="Ghi chú thêm..."
                      />
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="grid grid-cols-4 gap-0 border border-gray-300 border-t-0">
                    <div className="bg-gray-100 p-3 border-r border-gray-300 font-medium">
                      File:
                    </div>
                    <div className="col-span-3 p-3 bg-gray-50">
                      <input
                        type="file"
                        multiple
                        {...repairForm.register('files')}
                        className="w-full text-sm text-gray-600"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end mt-6">
                    <button
                      type="submit"
                      className="px-8 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium mt-2"
                    >
                      Tạo yêu cầu sửa chữa
                    </button>
                  </div>
                </form>
              ) : (
                /* Form for other request types */
                <form onSubmit={generalForm.handleSubmit(onSubmitGeneral)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tiêu đề <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...generalForm.register('title')}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        generalForm.formState.errors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nhập tiêu đề..."
                    />
                    {generalForm.formState.errors.title && (
                      <p className="mt-1 text-sm text-red-600">{generalForm.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mô tả chi tiết <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      {...generalForm.register('description')}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        generalForm.formState.errors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Mô tả chi tiết yêu cầu..."
                    />
                    {generalForm.formState.errors.description && (
                      <p className="mt-1 text-sm text-red-600">{generalForm.formState.errors.description.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mức độ ưu tiên <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...generalForm.register('priority')}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          generalForm.formState.errors.priority ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Chọn mức độ ưu tiên</option>
                        <option value="low">Thấp</option>
                        <option value="medium">Trung bình</option>
                        <option value="high">Cao</option>
                      </select>
                      {generalForm.formState.errors.priority && (
                        <p className="mt-1 text-sm text-red-600">{generalForm.formState.errors.priority.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phòng ban
                      </label>
                      <input
                        type="text"
                        {...generalForm.register('department')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                        placeholder="Phòng ban..."
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tệp đính kèm
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <input
                        type="file"
                        multiple
                        {...generalForm.register('attachments')}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <p className="text-sm text-gray-600">
                          Kéo thả tệp vào đây hoặc{' '}
                          <span className="text-blue-500 hover:text-blue-700">chọn tệp</span>
                        </p>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Hỗ trợ: PDF, DOC, DOCX, JPG, PNG (Tối đa 10MB)
                      </p>
                    </div>
                  </div>

                  {/* Submit Button for general forms */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                      Tạo yêu cầu
                    </button>
                  </div>
                </form>
              )}

            </div>
        </div>
      </Modal>

      {/* Supply Request Modal */}
      <SupplyRequestModal
        isOpen={isModalOpen && selectedCategory === 'yeu_cau_bo_sung'}
        onClose={handleCloseModal}
      />

      {/* Process List Modal */}
      <ProcessListModal
        isOpen={isProcessListOpen}
        onClose={() => setIsProcessListOpen(false)}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => {
          // Có thể refresh danh sách nhiệm vụ ở đây nếu cần
          console.log('Task created successfully');
        }}
      />

      {/* Private Feedback Modal (Góp ý riêng / Nêu khó khăn) */}
      <PrivateFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        type={feedbackType}
        onSuccess={() => {
          console.log('Feedback submitted successfully');
          // Có thể refresh danh sách feedback ở đây nếu cần
        }}
      />
      </div>

    </div>
  );
};

export default CommonManagement;
