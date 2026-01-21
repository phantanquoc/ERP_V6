import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react';
import customerFeedbackService, { CustomerFeedback } from '../services/customerFeedbackService';
import internationalCustomerService, { InternationalCustomer } from '../services/internationalCustomerService';

interface CustomerFeedbackManagementProps {
  customerType?: 'Quốc tế' | 'Nội địa';
}

const CustomerFeedbackManagement: React.FC<CustomerFeedbackManagementProps> = ({ customerType = 'Quốc tế' }) => {
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([]);
  const [customers, setCustomers] = useState<InternationalCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
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

  useEffect(() => {
    fetchFeedbacks();
    fetchCustomers();
  }, [filterStatus, filterType, filterPriority, customerType]);

  const fetchCustomers = async () => {
    try {
      const response = await internationalCustomerService.getAllCustomers(1, 1000, '', customerType);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      console.log('Fetching feedbacks with filters:', {
        trangThaiXuLy: filterStatus,
        loaiPhanHoi: filterType,
        mucDoNghiemTrong: filterPriority,
        search: searchTerm,
        customerType: customerType,
      });
      const data = await customerFeedbackService.getAllFeedbacks({
        trangThaiXuLy: filterStatus,
        loaiPhanHoi: filterType,
        mucDoNghiemTrong: filterPriority,
        search: searchTerm,
        customerType: customerType,
      });
      console.log('Received feedbacks:', data);
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchFeedbacks();
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
        fetchFeedbacks();
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
      fetchFeedbacks();
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
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-blue-600" />
          Quản lý phản hồi từ khách hàng quốc tế
        </h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm phản hồi
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Chưa xử lý">Chưa xử lý</option>
            <option value="Đang xử lý">Đang xử lý</option>
            <option value="Đã xử lý">Đã xử lý</option>
            <option value="Đã đóng">Đã đóng</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tất cả loại</option>
            <option value="Khiếu nại">Khiếu nại</option>
            <option value="Góp ý">Góp ý</option>
            <option value="Khen ngợi">Khen ngợi</option>
            <option value="Yêu cầu hỗ trợ">Yêu cầu hỗ trợ</option>
            <option value="Khác">Khác</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tất cả mức độ</option>
            <option value="Thấp">Thấp</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Cao">Cao</option>
            <option value="Khẩn cấp">Khẩn cấp</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : !feedbacks || feedbacks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có dữ liệu</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Khách hàng</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Loại</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Nội dung</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Mức độ</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((feedback, index) => (
                    <tr
                      key={feedback.id}
                      className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
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
                            onClick={() => handleView(feedback)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(feedback)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(feedback.id)}
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
            </div>
          </div>
        )}
      </div>


      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedFeedback ? 'Cập nhật phản hồi' : 'Thêm phản hồi mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              <div className="flex justify-end gap-3 pt-4 border-t">
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
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Chi tiết phản hồi</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
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

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleEdit(selectedFeedback);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
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

export default CustomerFeedbackManagement;