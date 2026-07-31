import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Download
} from 'lucide-react';
import Modal from './Modal';
import TableFilter, { FilterField } from './TableFilter';
import { useQueryClient } from '@tanstack/react-query';
import customerFeedbackService, { CustomerFeedback } from '../services/customerFeedbackService';
import internationalCustomerService, { InternationalCustomer } from '../services/internationalCustomerService';
import { useCustomerFeedbacks, customerFeedbackKeys } from '../hooks';

interface CustomerFeedbackManagementProps {
  customerType?: 'Quốc tế' | 'Nội địa';
}

const CustomerFeedbackManagement: React.FC<CustomerFeedbackManagementProps> = ({ customerType = 'Quốc tế' }) => {
  const queryClient = useQueryClient();
  const [customers, setCustomers] = useState<InternationalCustomer[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    _search: '',
    trangThaiXuLy: '',
    loaiPhanHoi: '',
    mucDoNghiemTrong: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<CustomerFeedback | null>(null);
  const [formData, setFormData] = useState<Partial<CustomerFeedback>>({
    customerId: '',
    loaiPhanHoi: 'Góp ý',
    noiDungPhanHoi: '',
    mucDoNghiemTrong: 'Trung bình',
    trangThaiXuLy: 'Chưa xử lý',
  });

  // Use React Query hook for feedbacks
  const { data: feedbacksData, isLoading: loading } = useCustomerFeedbacks({
    trangThaiXuLy: filterValues.trangThaiXuLy,
    loaiPhanHoi: filterValues.loaiPhanHoi,
    mucDoNghiemTrong: filterValues.mucDoNghiemTrong,
    search: filterValues._search,
    customerType: customerType,
  });
  const feedbacks = feedbacksData || [];

  const feedbackFilterFields: FilterField[] = [
    {
      key: 'trangThaiXuLy', label: 'Trạng thái', type: 'select',
      options: [
        { value: 'Chưa xử lý', label: 'Chưa xử lý' },
        { value: 'Đang xử lý', label: 'Đang xử lý' },
        { value: 'Đã xử lý', label: 'Đã xử lý' },
        { value: 'Đã đóng', label: 'Đã đóng' },
      ],
    },
    {
      key: 'loaiPhanHoi', label: 'Loại phản hồi', type: 'select',
      options: [
        { value: 'Khiếu nại', label: 'Khiếu nại' },
        { value: 'Góp ý', label: 'Góp ý' },
        { value: 'Khen ngợi', label: 'Khen ngợi' },
        { value: 'Yêu cầu hỗ trợ', label: 'Yêu cầu hỗ trợ' },
        { value: 'Khác', label: 'Khác' },
      ],
    },
    {
      key: 'mucDoNghiemTrong', label: 'Mức độ', type: 'select',
      options: [
        { value: 'Thấp', label: 'Thấp' },
        { value: 'Trung bình', label: 'Trung bình' },
        { value: 'Cao', label: 'Cao' },
        { value: 'Khẩn cấp', label: 'Khẩn cấp' },
      ],
    },
  ];

  const handleFilterChange = (newValues: Record<string, string>) => {
    setFilterValues(newValues);
    setCurrentPage(1);
  };

  const totalItems = feedbacks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedFeedbacks = feedbacks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Fetch customers on mount and when customerType changes
  React.useEffect(() => {
    fetchCustomers();
  }, [customerType]);

  const fetchCustomers = async () => {
    try {
      const response = await internationalCustomerService.getAllCustomers(1, 1000, '', customerType);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCreate = () => {
    setSelectedFeedback(null);
    setFormData({
      customerId: '',
      loaiPhanHoi: 'Góp ý',
      noiDungPhanHoi: '',
      mucDoNghiemTrong: 'Trung bình',
      trangThaiXuLy: 'Chưa xử lý',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (feedback: CustomerFeedback) => {
    setSelectedFeedback(feedback);
    setFormData(feedback);
    setIsModalOpen(true);
  };

  const handleView = (feedback: CustomerFeedback) => {
    setSelectedFeedback(feedback);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) {
      try {
        await customerFeedbackService.deleteFeedback(id);
        queryClient.invalidateQueries({ queryKey: customerFeedbackKeys.lists() });
      } catch (error) {
        console.error('Error deleting feedback:', error);
        alert('Có lỗi xảy ra khi xóa phản hồi');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedFeedback) {
        await customerFeedbackService.updateFeedback(selectedFeedback.id, formData);
      } else {
        await customerFeedbackService.createFeedback(formData as any);
      }
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: customerFeedbackKeys.lists() });
    } catch (error) {
      console.error('Error saving feedback:', error);
      alert('Có lỗi xảy ra khi lưu phản hồi');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      'Chưa xử lý': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      'Đang xử lý': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      'Đã xử lý': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      'Đã đóng': { bg: 'bg-gray-100', text: 'text-gray-800', icon: X },
    };
    const badge = badges[status] || badges['Chưa xử lý'];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      'Thấp': 'bg-gray-100 text-gray-800',
      'Trung bình': 'bg-blue-100 text-blue-800',
      'Cao': 'bg-orange-100 text-orange-800',
      'Khẩn cấp': 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority] || colors['Trung bình']}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Danh sách phản hồi từ khách hàng</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <button
            onClick={async () => {
              try {
                await customerFeedbackService.exportToExcel({ search: filterValues._search || undefined, customerType });
              } catch (error) {
                console.error('Error exporting to Excel:', error);
                alert('Lỗi khi xuất Excel');
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
          <button
            onClick={handleCreate}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm phản hồi
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <TableFilter
        filters={feedbackFilterFields}
        values={filterValues}
        onChange={handleFilterChange}
        searchPlaceholder="Tìm kiếm nội dung, sản phẩm, khách hàng..."
      />

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : !feedbacks || feedbacks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có dữ liệu</div>
        ) : (
              <table className="w-full min-w-[1000px] border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Khách hàng</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Loại</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Nội dung</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Mức độ</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFeedbacks.map((feedback, index) => (
                    <tr
                      key={feedback.id}
                      onClick={() => handleView(feedback)}
                      className={`border-b border-gray-200 hover:bg-blue-100 border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 border-r border-gray-200">
                        <div className="text-sm font-medium text-gray-900">
                          {feedback.customer?.tenCongTy || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {feedback.customer?.quocGia || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">{feedback.loaiPhanHoi}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate border-r border-gray-200">{feedback.noiDungPhanHoi}</td>
                      <td className="px-6 py-4 text-center border-r border-gray-200">{getPriorityBadge(feedback.mucDoNghiemTrong)}</td>
                      <td className="px-6 py-4 text-center border-r border-gray-200">{getStatusBadge(feedback.trangThaiXuLy)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                        {new Date(feedback.ngayPhanHoi).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(feedback.id); }}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedFeedback ? 'Cập nhật phản hồi' : 'Thêm phản hồi mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khách hàng <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.tenCongTy} ({customer.maKhachHang}) - {customer.quocGia}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại phản hồi <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.loaiPhanHoi}
                    onChange={(e) => setFormData({ ...formData, loaiPhanHoi: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Khiếu nại">Khiếu nại</option>
                    <option value="Góp ý">Góp ý</option>
                    <option value="Khen ngợi">Khen ngợi</option>
                    <option value="Yêu cầu hỗ trợ">Yêu cầu hỗ trợ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mức độ nghiêm trọng <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.mucDoNghiemTrong}
                    onChange={(e) => setFormData({ ...formData, mucDoNghiemTrong: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Thấp">Thấp</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Cao">Cao</option>
                    <option value="Khẩn cấp">Khẩn cấp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nội dung phản hồi <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.noiDungPhanHoi}
                  onChange={(e) => setFormData({ ...formData, noiDungPhanHoi: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm liên quan</label>
                  <input
                    type="text"
                    value={formData.sanPhamLienQuan || ''}
                    onChange={(e) => setFormData({ ...formData, sanPhamLienQuan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn hàng liên quan</label>
                  <input
                    type="text"
                    value={formData.donHangLienQuan || ''}
                    onChange={(e) => setFormData({ ...formData, donHangLienQuan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người tiếp nhận</label>
                  <input
                    type="text"
                    value={formData.nguoiTiepNhan || ''}
                    onChange={(e) => setFormData({ ...formData, nguoiTiepNhan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái xử lý <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.trangThaiXuLy}
                    onChange={(e) => setFormData({ ...formData, trangThaiXuLy: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Chưa xử lý">Chưa xử lý</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Đã xử lý">Đã xử lý</option>
                    <option value="Đã đóng">Đã đóng</option>
                  </select>
                </div>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Biện pháp xử lý</label>
                <textarea
                  rows={3}
                  value={formData.bienPhapXuLy || ''}
                  onChange={(e) => setFormData({ ...formData, bienPhapXuLy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kết quả xử lý</label>
                <textarea
                  rows={3}
                  value={formData.ketQuaXuLy || ''}
                  onChange={(e) => setFormData({ ...formData, ketQuaXuLy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ hài lòng</label>
                  <select
                    value={formData.mucDoHaiLong || ''}
                    onChange={(e) => setFormData({ ...formData, mucDoHaiLong: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Chưa đánh giá</option>
                    <option value="Rất không hài lòng">Rất không hài lòng</option>
                    <option value="Không hài lòng">Không hài lòng</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Hài lòng">Hài lòng</option>
                    <option value="Rất hài lòng">Rất hài lòng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={formData.ghiChu || ''}
                  onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {selectedFeedback ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen && !!selectedFeedback} onClose={() => setIsViewModalOpen(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Chi tiết phản hồi</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {selectedFeedback && (<>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Khách hàng</label>
                  <p className="text-gray-900 font-medium">{selectedFeedback.customer?.tenCongTy || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{selectedFeedback.customer?.quocGia || ''}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Loại phản hồi</label>
                  <p className="text-gray-900">{selectedFeedback.loaiPhanHoi}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Nội dung phản hồi</label>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{selectedFeedback.noiDungPhanHoi}</p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Mức độ nghiêm trọng</label>
                  <div>{getPriorityBadge(selectedFeedback.mucDoNghiemTrong)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Trạng thái</label>
                  <div>{getStatusBadge(selectedFeedback.trangThaiXuLy)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ngày phản hồi</label>
                  <p className="text-gray-900">{new Date(selectedFeedback.ngayPhanHoi).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              {selectedFeedback.sanPhamLienQuan && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Sản phẩm liên quan</label>
                  <p className="text-gray-900">{selectedFeedback.sanPhamLienQuan}</p>
                </div>
              )}

              {selectedFeedback.donHangLienQuan && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Đơn hàng liên quan</label>
                  <p className="text-gray-900">{selectedFeedback.donHangLienQuan}</p>
                </div>
              )}

              {selectedFeedback.nguoiTiepNhan && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Người tiếp nhận</label>
                  <p className="text-gray-900">{selectedFeedback.nguoiTiepNhan}</p>
                </div>
              )}

              {selectedFeedback.bienPhapXuLy && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Biện pháp xử lý</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-blue-50 p-4 rounded-lg">{selectedFeedback.bienPhapXuLy}</p>
                </div>
              )}

              {selectedFeedback.ketQuaXuLy && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Kết quả xử lý</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-green-50 p-4 rounded-lg">{selectedFeedback.ketQuaXuLy}</p>
                </div>
              )}

              {selectedFeedback.mucDoHaiLong && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Mức độ hài lòng</label>
                  <p className="text-gray-900">{selectedFeedback.mucDoHaiLong}</p>
                </div>
              )}

              {selectedFeedback.ghiChu && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ghi chú</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{selectedFeedback.ghiChu}</p>
                </div>
              )}

              </>)}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0 flex justify-end gap-3">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
              {selectedFeedback && (
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleEdit(selectedFeedback);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              )}
            </div>
          </div>
        </Modal>
    </div>
  );
};

export default CustomerFeedbackManagement;