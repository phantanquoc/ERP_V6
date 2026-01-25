import { useState, useEffect } from 'react';
import { Edit, Eye, Trash2, X, Upload, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AcceptanceHandoverForm from './AcceptanceHandoverForm';

interface RepairRequest {
  id: number;
  ngayThang: string;
  maYeuCau: string;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  mucDoUuTien: string;
  noiDungLoi: string;
  ghiChu: string;
  trangThai: string;
  fileDinhKem?: string;
  ngayTao: string;
}

const RepairRequestList = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RepairRequest | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAcceptanceFormOpen, setIsAcceptanceFormOpen] = useState(false);
  const [selectedRequestForAcceptance, setSelectedRequestForAcceptance] = useState<RepairRequest | null>(null);
  
  const [formData, setFormData] = useState({
    ngayThang: new Date().toISOString().split('T')[0],
    maYeuCau: '',
    tenHeThong: '',
    tinhTrangThietBi: '',
    loaiLoi: '',
    mucDoUuTien: 'Thấp',
    noiDungLoi: '',
    ghiChu: '',
    trangThai: 'Chờ xử lý',
  });

  // Load data from API
  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/repair-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      // Handle new API response format with success and data
      const data = result.success ? result.data : result;
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]); // Set empty array on error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key as keyof typeof formData]);
    });

    if (selectedFile) {
      formDataToSend.append('file', selectedFile);
    }

    try {
      const token = localStorage.getItem('accessToken');
      const url = editingRequest
        ? `http://localhost:5000/api/repair-requests/${editingRequest.id}`
        : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/repair-requests';

      const method = editingRequest ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (response.ok) {
        fetchRequests();
        handleCloseModal();
      }
    } catch (error) {
      console.error('Error saving request:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa yêu cầu này?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:5000/api/repair-requests/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const handleEdit = (request: RepairRequest) => {
    setEditingRequest(request);
    setFormData({
      ngayThang: request.ngayThang.split('T')[0],
      maYeuCau: request.maYeuCau,
      tenHeThong: request.tenHeThong,
      tinhTrangThietBi: request.tinhTrangThietBi,
      loaiLoi: request.loaiLoi,
      mucDoUuTien: request.mucDoUuTien,
      noiDungLoi: request.noiDungLoi,
      ghiChu: request.ghiChu,
      trangThai: request.trangThai,
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (request: RepairRequest) => {
    setEditingRequest(request);
    setFormData({
      ngayThang: request.ngayThang.split('T')[0],
      maYeuCau: request.maYeuCau,
      tenHeThong: request.tenHeThong,
      tinhTrangThietBi: request.tinhTrangThietBi,
      loaiLoi: request.loaiLoi,
      mucDoUuTien: request.mucDoUuTien,
      noiDungLoi: request.noiDungLoi,
      ghiChu: request.ghiChu,
      trangThai: request.trangThai,
    });
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = async () => {
    try {
      // Generate new code from API
      const token = localStorage.getItem('accessToken');

      if (!token) {
        // No token, use timestamp-based code
        setFormData({
          ngayThang: new Date().toISOString().split('T')[0],
          maYeuCau: `YC-${Date.now()}`,
          tenHeThong: '',
          tinhTrangThietBi: '',
          loaiLoi: '',
          mucDoUuTien: 'Thấp',
          noiDungLoi: '',
          ghiChu: '',
          trangThai: 'Chờ xử lý',
        });
        setIsModalOpen(true);
        return;
      }

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/repair-requests/generate-code', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const code = result.success ? result.data.code : `YC-${Date.now()}`;
        setFormData({
          ngayThang: new Date().toISOString().split('T')[0],
          maYeuCau: code,
          tenHeThong: '',
          tinhTrangThietBi: '',
          loaiLoi: '',
          mucDoUuTien: 'Thấp',
          noiDungLoi: '',
          ghiChu: '',
          trangThai: 'Chờ xử lý',
        });
      } else {
        // API error, fallback to timestamp
        setFormData({
          ngayThang: new Date().toISOString().split('T')[0],
          maYeuCau: `YC-${Date.now()}`,
          tenHeThong: '',
          tinhTrangThietBi: '',
          loaiLoi: '',
          mucDoUuTien: 'Thấp',
          noiDungLoi: '',
          ghiChu: '',
          trangThai: 'Chờ xử lý',
        });
      }
    } catch (error) {
      console.error('Error generating code:', error);
      // Fallback to timestamp-based code
      setFormData({
        ngayThang: new Date().toISOString().split('T')[0],
        maYeuCau: `YC-${Date.now()}`,
        tenHeThong: '',
        tinhTrangThietBi: '',
        loaiLoi: '',
        mucDoUuTien: 'Thấp',
        noiDungLoi: '',
        ghiChu: '',
        trangThai: 'Chờ xử lý',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsViewMode(false);
    setEditingRequest(null);
    setSelectedFile(null);
    setFormData({
      ngayThang: new Date().toISOString().split('T')[0],
      maYeuCau: '',
      tenHeThong: '',
      tinhTrangThietBi: '',
      loaiLoi: '',
      mucDoUuTien: 'Thấp',
      noiDungLoi: '',
      ghiChu: '',
      trangThai: 'Chờ xử lý',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAcceptance = (request: RepairRequest) => {
    setSelectedRequestForAcceptance(request);
    setIsAcceptanceFormOpen(true);
  };

  const handleAcceptanceSuccess = () => {
    // Refresh the list or show success message
    fetchRequests();
  };

  const handleAddNew = async () => {
    setEditingRequest(null);
    setIsViewMode(false);
    await handleOpenCreateModal();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Khẩn cấp': return 'bg-red-100 text-red-800';
      case 'Cao': return 'bg-orange-100 text-orange-800';
      case 'Trung bình': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hoàn thành': return 'bg-green-100 text-green-800';
      case 'Đang sửa chữa': return 'bg-blue-100 text-blue-800';
      case 'Chờ xử lý': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Danh sách yêu cầu sửa chữa</h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">STT</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ngày tháng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mã yêu cầu</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Tên hệ thống/thiết bị</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mức độ ưu tiên</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Hoạt động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request, index) => (
              <tr key={request.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {new Date(request.ngayThang).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">{request.maYeuCau}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{request.tenHeThong}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.mucDoUuTien)}`}>
                    {request.mucDoUuTien}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.trangThai)}`}>
                    {request.trangThai}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleView(request)} className="text-blue-600 hover:text-blue-800" title="Xem">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(request)} className="text-green-600 hover:text-green-800" title="Sửa">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleAcceptance(request)} className="text-purple-600 hover:text-purple-800" title="Nghiệm thu bàn giao">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(request.id)} className="text-red-600 hover:text-red-800" title="Xóa">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">
                {isViewMode ? 'Chi tiết yêu cầu' : editingRequest ? 'Chỉnh sửa yêu cầu' : 'Thêm yêu cầu mới'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Ngày tháng */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày tháng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.ngayThang}
                    onChange={(e) => setFormData({ ...formData, ngayThang: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                  />
                </div>

                {/* Mã yêu cầu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mã yêu cầu sửa chữa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.maYeuCau}
                    onChange={(e) => setFormData({ ...formData, maYeuCau: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                    placeholder="VD: YC-001"
                  />
                </div>

                {/* Tên hệ thống/thiết bị */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên hệ thống/thiết bị <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tenHeThong}
                    onChange={(e) => setFormData({ ...formData, tenHeThong: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                    placeholder="VD: Nồi chiên VF-003"
                  />
                </div>

                {/* Tình trạng thiết bị */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tình trạng thiết bị <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tinhTrangThietBi}
                    onChange={(e) => setFormData({ ...formData, tinhTrangThietBi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                    placeholder="VD: Hỏng, Hoạt động không ổn định"
                  />
                </div>

                {/* Loại lỗi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại lỗi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.loaiLoi}
                    onChange={(e) => setFormData({ ...formData, loaiLoi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                    placeholder="VD: Lỗi cơ khí, Lỗi điện"
                  />
                </div>

                {/* Mức độ ưu tiên */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mức độ ưu tiên <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.mucDoUuTien}
                    onChange={(e) => setFormData({ ...formData, mucDoUuTien: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                  >
                    <option value="Thấp">Thấp</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Cao">Cao</option>
                    <option value="Khẩn cấp">Khẩn cấp</option>
                  </select>
                </div>

                {/* Trạng thái */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.trangThai}
                    onChange={(e) => setFormData({ ...formData, trangThai: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                  >
                    <option value="Chờ xử lý">Chờ xử lý</option>
                    <option value="Đang sửa chữa">Đang sửa chữa</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                  </select>
                </div>

                {/* Nội dung lỗi */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nội dung lỗi <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.noiDungLoi}
                    onChange={(e) => setFormData({ ...formData, noiDungLoi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                    rows={3}
                    placeholder="Mô tả chi tiết lỗi"
                  />
                </div>

                {/* Ghi chú */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ghi chú
                  </label>
                  <textarea
                    value={formData.ghiChu}
                    onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isViewMode}
                    rows={2}
                    placeholder="Ghi chú thêm (nếu có)"
                  />
                </div>

                {/* File đính kèm */}
                {!isViewMode && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File đính kèm
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                        <Upload className="w-4 h-4" />
                        <span>Chọn file</span>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        />
                      </label>
                      {selectedFile && (
                        <span className="text-sm text-gray-600">{selectedFile.name}</span>
                      )}
                      {editingRequest?.fileDinhKem && !selectedFile && (
                        <a
                          href={`http://localhost:5000${editingRequest.fileDinhKem}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          File hiện tại
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Hỗ trợ: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG (Tối đa 10MB)
                    </p>
                  </div>
                )}

                {/* View mode file */}
                {isViewMode && editingRequest?.fileDinhKem && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File đính kèm
                    </label>
                    <a
                      href={`http://localhost:5000${editingRequest.fileDinhKem}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Xem file đính kèm
                    </a>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  {isViewMode ? 'Đóng' : 'Hủy'}
                </button>
                {!isViewMode && (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingRequest ? 'Cập nhật' : 'Thêm mới'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Acceptance Handover Form */}
      {isAcceptanceFormOpen && selectedRequestForAcceptance && (
        <AcceptanceHandoverForm
          repairRequest={selectedRequestForAcceptance}
          onClose={() => {
            setIsAcceptanceFormOpen(false);
            setSelectedRequestForAcceptance(null);
          }}
          onSuccess={handleAcceptanceSuccess}
        />
      )}
    </div>
  );
};

export default RepairRequestList;

