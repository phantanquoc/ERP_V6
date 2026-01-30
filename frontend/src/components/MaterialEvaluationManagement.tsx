import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, Upload, Settings, Save } from 'lucide-react';
import materialEvaluationService, { MaterialEvaluation } from '../services/materialEvaluationService';
import materialEvaluationCriteriaService, { MaterialEvaluationCriteria } from '../services/materialEvaluationCriteriaService';
import systemOperationService from '../services/systemOperationService';
import DateTimePicker from './DateTimePicker';

interface MaterialEvaluationManagementProps {
  onCreateSystemOperation?: (maChien: string, thoiGianChien: string) => void;
}

const MaterialEvaluationManagement: React.FC<MaterialEvaluationManagementProps> = ({ onCreateSystemOperation }) => {
  const [evaluations, setEvaluations] = useState<MaterialEvaluation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<MaterialEvaluation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Criteria states
  const [criteria, setCriteria] = useState<MaterialEvaluationCriteria[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<MaterialEvaluationCriteria | null>(null);
  const [newCriteriaCode, setNewCriteriaCode] = useState<number>(0);
  const [newCriteriaDescription, setNewCriteriaDescription] = useState<string>('');

  const [formData, setFormData] = useState<Partial<MaterialEvaluation>>({
    maChien: '',
    thoiGianChien: '',
    tenHangHoa: '',
    soLoKien: '',
    khoiLuong: 0,
    soLanNgam: 0,
    nhietDoNuocTruocNgam: 0,
    nhietDoNuocSauVot: 0,
    thoiGianNgam: 0,
    brixNuocNgam: 0,
    danhGiaTruocNgam: '',
    danhGiaSauNgam: '',
    nguoiThucHien: '',
  });

  useEffect(() => {
    loadEvaluations();
    loadCriteria();
  }, []);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await materialEvaluationService.getAllMaterialEvaluations(1, 1000);
      setEvaluations(result.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCriteria = async () => {
    try {
      setCriteriaLoading(true);
      const data = await materialEvaluationCriteriaService.getAllCriteria();
      setCriteria(data);
      // Set next code number
      if (data.length > 0) {
        const maxCode = Math.max(...data.map(c => c.code));
        setNewCriteriaCode(maxCode + 1);
      } else {
        setNewCriteriaCode(1);
      }
    } catch (err: any) {
      console.error('Error loading criteria:', err);
    } finally {
      setCriteriaLoading(false);
    }
  };

  const handleSeedDefaultCriteria = async () => {
    try {
      setCriteriaLoading(true);
      await materialEvaluationCriteriaService.seedDefaultCriteria();
      await loadCriteria();
      alert('Đã tạo tiêu chí mặc định thành công!');
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể tạo tiêu chí mặc định'));
    } finally {
      setCriteriaLoading(false);
    }
  };

  const handleAddCriteria = async () => {
    if (!newCriteriaDescription.trim()) {
      alert('Vui lòng nhập mô tả tiêu chí');
      return;
    }
    try {
      setCriteriaLoading(true);
      await materialEvaluationCriteriaService.createCriteria({
        code: newCriteriaCode,
        description: newCriteriaDescription.trim()
      });
      setNewCriteriaDescription('');
      await loadCriteria();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể thêm tiêu chí'));
    } finally {
      setCriteriaLoading(false);
    }
  };

  const handleUpdateCriteria = async (id: string, description: string) => {
    try {
      setCriteriaLoading(true);
      await materialEvaluationCriteriaService.updateCriteria(id, { description });
      setEditingCriteria(null);
      await loadCriteria();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể cập nhật tiêu chí'));
    } finally {
      setCriteriaLoading(false);
    }
  };

  const handleDeleteCriteria = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tiêu chí này?')) return;
    try {
      setCriteriaLoading(true);
      await materialEvaluationCriteriaService.deleteCriteria(id);
      await loadCriteria();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể xóa tiêu chí'));
    } finally {
      setCriteriaLoading(false);
    }
  };

  // Convert criteria codes to text descriptions
  const getCriteriaText = (codes: string): string => {
    if (!codes) return '';
    const codeArray = codes.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c));
    return codeArray.map(code => {
      const criterion = criteria.find(c => c.code === code);
      return criterion ? `${code}. ${criterion.description}` : `${code}. (Không tìm thấy)`;
    }).join('; ');
  };

  const formatDateTime = (datetime: string) => {
    if (!datetime) return '';
    try {
      const date = new Date(datetime);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return datetime;
    }
  };



  const handleOpenModal = async (evaluation?: MaterialEvaluation) => {
    if (evaluation) {
      setIsEditing(true);
      setSelectedEvaluation(evaluation);

      // Convert datetime to datetime-local format without timezone conversion
      let thoiGianChienLocal = '';
      if (evaluation.thoiGianChien) {
        const date = new Date(evaluation.thoiGianChien);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        thoiGianChienLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
      }

      setFormData({
        ...evaluation,
        thoiGianChien: thoiGianChienLocal,
      });
    } else {
      setIsEditing(false);
      setSelectedEvaluation(null);

      // Generate ma chien from API
      try {
        const maChien = await materialEvaluationService.generateMaChien();
        setFormData({
          maChien,
          thoiGianChien: '',
          tenHangHoa: '',
          soLoKien: '',
          khoiLuong: 0,
          soLanNgam: 0,
          nhietDoNuocTruocNgam: 0,
          nhietDoNuocSauVot: 0,
          thoiGianNgam: 0,
          brixNuocNgam: 0,
          danhGiaTruocNgam: '',
          danhGiaSauNgam: '',
          nguoiThucHien: '',
        });
      } catch (err: any) {
        setError(err.message || 'Lỗi tạo mã chiên');
      }
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvaluation(null);
    setIsEditing(false);
  };

  const handleViewDetail = (evaluation: MaterialEvaluation) => {
    setSelectedEvaluation(evaluation);
    setIsViewModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['khoiLuong', 'soLanNgam', 'nhietDoNuocTruocNgam', 'nhietDoNuocSauVot', 'thoiGianNgam', 'brixNuocNgam'].includes(name)
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      // Convert datetime-local to ISO string for consistent timezone handling
      // Frontend datetime-local format: "2026-01-17T03:30"
      // We need to send it as ISO string so backend can parse it correctly
      const submitData = {
        ...formData,
        thoiGianChien: formData.thoiGianChien
          ? new Date(formData.thoiGianChien).toISOString()
          : '',
      };

      if (isEditing && selectedEvaluation) {
        // Update existing evaluation
        await materialEvaluationService.updateMaterialEvaluation(selectedEvaluation.id, submitData);
      } else {
        // Create new evaluation
        await materialEvaluationService.createMaterialEvaluation(submitData);
      }

      await loadEvaluations();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) {
      try {
        setLoading(true);
        setError('');
        await materialEvaluationService.deleteMaterialEvaluation(id);
        await loadEvaluations();
      } catch (err: any) {
        setError(err.message || 'Lỗi xóa dữ liệu');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateSystemOperation = async (evaluation: MaterialEvaluation) => {
    try {
      setLoading(true);
      setError('');

      // Tạo thông số vận hành cho tất cả 8 máy
      await systemOperationService.createBulkSystemOperations(
        evaluation.maChien,
        evaluation.thoiGianChien
      );

      // Chuyển sang tab thông số vận hành
      if (onCreateSystemOperation) {
        onCreateSystemOperation(evaluation.maChien, evaluation.thoiGianChien);
      }

      // Hiển thị thông báo thành công
      alert('Đã tạo thông số vận hành cho tất cả 8 máy thành công!');
    } catch (err: any) {
      setError(err.message || 'Lỗi tạo thông số vận hành');
      console.error(err);
      alert('Lỗi: ' + (err.message || 'Không thể tạo thông số vận hành'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Đánh giá nguyên liệu</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            Thêm đánh giá
          </button>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            disabled={loading}
          >
            <Settings className="w-4 h-4" />
            Cài đặt đánh giá
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Đang tải...</p>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã chiên</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Thời gian chiên</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên hàng hóa</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Khối lượng (Kg)</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Thời gian ngâm (Phút)</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation, index) => (
                  <tr
                    key={evaluation.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">{evaluation.maChien}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{formatDateTime(evaluation.thoiGianChien)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">{evaluation.tenHangHoa}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">{evaluation.khoiLuong}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">{evaluation.thoiGianNgam}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleViewDetail(evaluation)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(evaluation)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(evaluation.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        {onCreateSystemOperation && (
                          <button
                            onClick={() => handleCreateSystemOperation(evaluation)}
                            className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-md transition-colors"
                            title="Tạo thông số vận hành"
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        {evaluations.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            Chưa có dữ liệu
          </div>
        )}
      </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Chỉnh sửa đánh giá' : 'Thêm đánh giá mới'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã chiên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="maChien"
                    value={formData.maChien}
                    onChange={handleInputChange}
                    required
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <DateTimePicker
                    label="Thời gian chiên"
                    value={formData.thoiGianChien || ''}
                    onChange={(datetime) => setFormData(prev => ({ ...prev, thoiGianChien: datetime }))}
                    required
                    placeholder="Chọn ngày và giờ chiên"
                    allowClear
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên hàng hóa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tenHangHoa"
                    value={formData.tenHangHoa}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lô, Kiện <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="soLoKien"
                    value={formData.soLoKien}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khối lượng (Kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="khoiLuong"
                    value={formData.khoiLuong}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lần ngâm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="soLanNgam"
                    value={formData.soLanNgam}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhiệt độ nước trước ngâm (°C) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="nhietDoNuocTruocNgam"
                    value={formData.nhietDoNuocTruocNgam}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhiệt độ nước sau vớt (°C) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="nhietDoNuocSauVot"
                    value={formData.nhietDoNuocSauVot}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thời gian ngâm (Phút) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="thoiGianNgam"
                    value={formData.thoiGianNgam}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brix nước ngâm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="brixNuocNgam"
                    value={formData.brixNuocNgam}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đánh giá trước ngâm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="danhGiaTruocNgam"
                    value={formData.danhGiaTruocNgam}
                    onChange={handleInputChange}
                    required
                    placeholder="Nhập mã số (VD: 1,2,3)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formData.danhGiaTruocNgam && (
                    <p className="mt-1 text-sm text-green-600">
                      {getCriteriaText(formData.danhGiaTruocNgam)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Nhập các mã số cách nhau bởi dấu phẩy. Xem danh sách mã trong "Cài đặt đánh giá"
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đánh giá sau ngâm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="danhGiaSauNgam"
                    value={formData.danhGiaSauNgam}
                    onChange={handleInputChange}
                    required
                    placeholder="Nhập mã số (VD: 1,2,3)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formData.danhGiaSauNgam && (
                    <p className="mt-1 text-sm text-green-600">
                      {getCriteriaText(formData.danhGiaSauNgam)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Nhập các mã số cách nhau bởi dấu phẩy. Xem danh sách mã trong "Cài đặt đánh giá"
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Người thực hiện <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nguoiThucHien"
                    value={formData.nguoiThucHien}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File đính kèm
                  </label>
                  <input
                    type="file"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {isEditing ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {isViewModalOpen && selectedEvaluation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Chi tiết đánh giá nguyên liệu</h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã chiên</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.maChien}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian chiên</label>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedEvaluation.thoiGianChien)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên hàng hóa</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.tenHangHoa}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lô, Kiện</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.soLoKien}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khối lượng (Kg)</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.khoiLuong}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lần ngâm</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.soLanNgam}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ nước trước ngâm</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.nhietDoNuocTruocNgam}°C</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ nước sau vớt</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.nhietDoNuocSauVot}°C</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian ngâm (Phút)</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.thoiGianNgam}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brix nước ngâm</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.brixNuocNgam}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đánh giá trước ngâm</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.danhGiaTruocNgam}</p>
                  {selectedEvaluation.danhGiaTruocNgam && (
                    <p className="text-sm text-green-600 mt-1">{getCriteriaText(selectedEvaluation.danhGiaTruocNgam)}</p>
                  )}
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đánh giá sau ngâm</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.danhGiaSauNgam}</p>
                  {selectedEvaluation.danhGiaSauNgam && (
                    <p className="text-sm text-green-600 mt-1">{getCriteriaText(selectedEvaluation.danhGiaSauNgam)}</p>
                  )}
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
                  <p className="text-sm text-gray-900">{selectedEvaluation.nguoiThucHien}</p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Cài đặt tiêu chí đánh giá nguyên liệu</h2>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Seed default button */}
              {criteria.length === 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-3">
                    Chưa có tiêu chí đánh giá nào. Bạn có thể tạo tiêu chí mặc định hoặc thêm tiêu chí mới.
                  </p>
                  <button
                    onClick={handleSeedDefaultCriteria}
                    disabled={criteriaLoading}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Tạo tiêu chí mặc định
                  </button>
                </div>
              )}

              {/* Add new criteria form */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Thêm tiêu chí mới</h3>
                <div className="flex gap-3">
                  <div className="w-24">
                    <label className="block text-xs text-gray-600 mb-1">Mã số</label>
                    <input
                      type="number"
                      value={newCriteriaCode}
                      onChange={(e) => setNewCriteriaCode(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Mô tả</label>
                    <input
                      type="text"
                      value={newCriteriaDescription}
                      onChange={(e) => setNewCriteriaDescription(e.target.value)}
                      placeholder="Nhập mô tả tiêu chí..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddCriteria}
                      disabled={criteriaLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Criteria list */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Danh sách tiêu chí ({criteria.length})</h3>
                {criteriaLoading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : criteria.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Chưa có tiêu chí nào</p>
                ) : (
                  <div className="space-y-2">
                    {criteria.map((criterion) => (
                      <div
                        key={criterion.id}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <span className="w-12 text-center font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {criterion.code}
                        </span>
                        {editingCriteria?.id === criterion.id ? (
                          <input
                            type="text"
                            value={editingCriteria.description}
                            onChange={(e) => setEditingCriteria({ ...editingCriteria, description: e.target.value })}
                            className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className="flex-1 text-sm text-gray-700">{criterion.description}</span>
                        )}
                        <div className="flex gap-2">
                          {editingCriteria?.id === criterion.id ? (
                            <>
                              <button
                                onClick={() => handleUpdateCriteria(criterion.id, editingCriteria.description)}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-md"
                                title="Lưu"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingCriteria(null)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md"
                                title="Hủy"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingCriteria(criterion)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"
                                title="Sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCriteria(criterion.id)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialEvaluationManagement;

