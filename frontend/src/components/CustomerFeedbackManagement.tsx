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
  customerType?: 'Qu?c t?' | 'N?i d?a';
}

const CustomerFeedbackManagement: React.FC<CustomerFeedbackManagementProps> = ({ customerType = 'Qu?c t?' }) => {
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
    trangThaiXuLy: 'Chua x? lý',
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
      trangThaiXuLy: 'Chua x? lý',
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
    if (window.confirm('B?n có ch?c ch?n mu?n xóa ph?n h?i này?')) {
      try {
        await customerFeedbackService.deleteFeedback(id);
        fetchFeedbacks();
      } catch (error) {
        console.error('Error deleting feedback:', error);
        alert('Có l?i x?y ra khi xóa ph?n h?i');
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
      alert('Có l?i x?y ra khi luu ph?n h?i');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      'Chua x? lý': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      'Ðang x? lý': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      'Ðã x? lý': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      'Ðã dóng': { bg: 'bg-gray-100', text: 'text-gray-800', icon: X },
    };
    const badge = badges[status] || badges['Chua x? lý'];
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
      'Th?p': 'bg-gray-100 text-gray-800',
      'Trung bình': 'bg-blue-100 text-blue-800',
      'Cao': 'bg-orange-100 text-orange-800',
      'Kh?n c?p': 'bg-red-100 text-red-800',
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
          Qu?n lý ph?n h?i t? khách hàng qu?c t?
        </h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm ph?n h?i
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm ki?m..."
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
            <option value="">T?t c? tr?ng thái</option>
            <option value="Chua x? lý">Chua x? lý</option>
            <option value="Ðang x? lý">Ðang x? lý</option>
            <option value="Ðã x? lý">Ðã x? lý</option>
            <option value="Ðã dóng">Ðã dóng</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">T?t c? lo?i</option>
            <option value="Khi?u n?i">Khi?u n?i</option>
            <option value="Góp ý">Góp ý</option>
            <option value="Khen ng?i">Khen ng?i</option>
            <option value="Yêu c?u h? tr?">Yêu c?u h? tr?</option>
            <option value="Khác">Khác</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">T?t c? m?c d?</option>
            <option value="Th?p">Th?p</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Cao">Cao</option>
            <option value="Kh?n c?p">Kh?n c?p</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Ðang t?i...</div>
        ) : !feedbacks || feedbacks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có d? li?u</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Khách hàng</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Lo?i</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">N?i dung</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">M?c d?</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Tr?ng thái</th>
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
                            title="Xem chi ti?t"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(feedback)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                            title="Ch?nh s?a"
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
                {selectedFeedback ? 'C?p nh?t ph?n h?i' : 'Thêm ph?n h?i m?i'}
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
                  <option value="">-- Ch?n khách hàng --</option>
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
                    Lo?i ph?n h?i <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.loaiPhanHoi}
                    onChange={(e) => setFormData({ ...formData, loaiPhanHoi: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Khi?u n?i">Khi?u n?i</option>
                    <option value="Góp ý">Góp ý</option>
                    <option value="Khen ng?i">Khen ng?i</option>
                    <option value="Yêu c?u h? tr?">Yêu c?u h? tr?</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    M?c d? nghiêm tr?ng <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.mucDoNghiemTrong}
                    onChange={(e) => setFormData({ ...formData, mucDoNghiemTrong: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Th?p">Th?p</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Cao">Cao</option>
                    <option value="Kh?n c?p">Kh?n c?p</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N?i dung ph?n h?i <span className="text-red-500">*</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">S?n ph?m liên quan</label>
                  <input
                    type="text"
                    value={formData.sanPhamLienQuan || ''}
                    onChange={(e) => setFormData({ ...formData, sanPhamLienQuan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ðon hàng liên quan</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngu?i ti?p nh?n</label>
                  <input
                    type="text"
                    value={formData.nguoiTiepNhan || ''}
                    onChange={(e) => setFormData({ ...formData, nguoiTiepNhan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tr?ng thái x? lý <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.trangThaiXuLy}
                    onChange={(e) => setFormData({ ...formData, trangThaiXuLy: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Chua x? lý">Chua x? lý</option>
                    <option value="Ðang x? lý">Ðang x? lý</option>
                    <option value="Ðã x? lý">Ðã x? lý</option>
                    <option value="Ðã dóng">Ðã dóng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bi?n pháp x? lý</label>
                <textarea
                  rows={3}
                  value={formData.bienPhapXuLy || ''}
                  onChange={(e) => setFormData({ ...formData, bienPhapXuLy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">K?t qu? x? lý</label>
                <textarea
                  rows={3}
                  value={formData.ketQuaXuLy || ''}
                  onChange={(e) => setFormData({ ...formData, ketQuaXuLy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">M?c d? hài lòng</label>
                  <select
                    value={formData.mucDoHaiLong || ''}
                    onChange={(e) => setFormData({ ...formData, mucDoHaiLong: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Chua dánh giá</option>
                    <option value="R?t không hài lòng">R?t không hài lòng</option>
                    <option value="Không hài lòng">Không hài lòng</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Hài lòng">Hài lòng</option>
                    <option value="R?t hài lòng">R?t hài lòng</option>
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
                  H?y
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {selectedFeedback ? 'C?p nh?t' : 'Thêm m?i'}
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
              <h3 className="text-lg font-semibold text-gray-900">Chi ti?t ph?n h?i</h3>
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
                  <label className="block text-sm font-medium text-gray-500 mb-1">Lo?i ph?n h?i</label>
                  <p className="text-gray-900">{selectedFeedback.loaiPhanHoi}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">N?i dung ph?n h?i</label>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{selectedFeedback.noiDungPhanHoi}</p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">M?c d? nghiêm tr?ng</label>
                  <div>{getPriorityBadge(selectedFeedback.mucDoNghiemTrong)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tr?ng thái</label>
                  <div>{getStatusBadge(selectedFeedback.trangThaiXuLy)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ngày ph?n h?i</label>
                  <p className="text-gray-900">{new Date(selectedFeedback.ngayPhanHoi).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              {selectedFeedback.sanPhamLienQuan && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">S?n ph?m liên quan</label>
                  <p className="text-gray-900">{selectedFeedback.sanPhamLienQuan}</p>
                </div>
              )}

              {selectedFeedback.donHangLienQuan && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ðon hàng liên quan</label>
                  <p className="text-gray-900">{selectedFeedback.donHangLienQuan}</p>
                </div>
              )}

              {selectedFeedback.nguoiTiepNhan && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ngu?i ti?p nh?n</label>
                  <p className="text-gray-900">{selectedFeedback.nguoiTiepNhan}</p>
                </div>
              )}

              {selectedFeedback.bienPhapXuLy && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Bi?n pháp x? lý</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-blue-50 p-4 rounded-lg">{selectedFeedback.bienPhapXuLy}</p>
                </div>
              )}

              {selectedFeedback.ketQuaXuLy && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">K?t qu? x? lý</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-green-50 p-4 rounded-lg">{selectedFeedback.ketQuaXuLy}</p>
                </div>
              )}

              {selectedFeedback.mucDoHaiLong && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">M?c d? hài lòng</label>
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
                  Ðóng
                </button>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleEdit(selectedFeedback);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ch?nh s?a
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