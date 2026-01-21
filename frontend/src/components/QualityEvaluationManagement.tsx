import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye } from 'lucide-react';
import qualityEvaluationService, { QualityEvaluation } from '../services/qualityEvaluationService';
import machineService, { Machine } from '../services/machineService';
import { useAuth } from '../contexts/AuthContext';
import QualityEvaluationModal from './QualityEvaluationModal';

const QualityEvaluationManagement: React.FC = () => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<QualityEvaluation[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<QualityEvaluation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Get current user's full name
  const currentUserName = user ? `${user.firstName} ${user.lastName}`.trim() : '';

  const [formData, setFormData] = useState({
    maChien: '',
    thoiGianChien: '',
    tenHangHoa: '',
    aTiLe: 0,
    bTiLe: 0,
    bDauTiLe: 0,
    cTiLe: 0,
    vunLonTiLe: 0,
    vunNhoTiLe: 0,
    phePhamTiLe: 0,
    uotTiLe: 0,
    muiHuong: '',
    huongVi: '',
    doNgot: '',
    doGion: '',
    deXuatDieuChinh: '',
    fileDinhKem: '',
    nguoiThucHien: '',
  });

  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    // Auto-select first machine when machines are loaded
    if (machines.length > 0 && !selectedMachine) {
      setSelectedMachine(machines[0].tenMay);
    }
  }, [machines]);

  useEffect(() => {
    if (selectedMachine) {
      loadEvaluations();
      setCurrentPage(1); // Reset to page 1 when changing machine
    }
  }, [selectedMachine]);

  useEffect(() => {
    if (selectedMachine) {
      loadEvaluations();
    }
  }, [currentPage]);

  const loadMachines = async () => {
    try {
      const result = await machineService.getAllMachines(1, 100);
      setMachines(result.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách máy');
      console.error(err);
    }
  };

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await qualityEvaluationService.getAllQualityEvaluations(currentPage, 1000, selectedMachine);
      setEvaluations(result.data);
      setTotalPages(result.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
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

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenModal = (evaluation?: QualityEvaluation) => {
    if (evaluation) {
      setIsEditing(true);
      setSelectedEvaluation(evaluation);
      setFormData({
        maChien: evaluation.maChien,
        thoiGianChien: evaluation.thoiGianChien,
        tenHangHoa: evaluation.tenHangHoa,
        aTiLe: evaluation.aTiLe,
        bTiLe: evaluation.bTiLe,
        bDauTiLe: evaluation.bDauTiLe,
        cTiLe: evaluation.cTiLe,
        vunLonTiLe: evaluation.vunLonTiLe,
        vunNhoTiLe: evaluation.vunNhoTiLe,
        phePhamTiLe: evaluation.phePhamTiLe,
        uotTiLe: evaluation.uotTiLe,
        muiHuong: evaluation.muiHuong,
        huongVi: evaluation.huongVi,
        doNgot: evaluation.doNgot,
        doGion: evaluation.doGion,
        deXuatDieuChinh: evaluation.deXuatDieuChinh,
        fileDinhKem: evaluation.fileDinhKem || '',
        nguoiThucHien: evaluation.nguoiThucHien || currentUserName,
      });
    } else {
      setIsEditing(false);
      setSelectedEvaluation(null);
      setFormData({
        maChien: '',
        thoiGianChien: '',
        tenHangHoa: '',
        aTiLe: 0,
        bTiLe: 0,
        bDauTiLe: 0,
        cTiLe: 0,
        vunLonTiLe: 0,
        vunNhoTiLe: 0,
        phePhamTiLe: 0,
        uotTiLe: 0,
        muiHuong: '',
        huongVi: '',
        doNgot: '',
        doGion: '',
        deXuatDieuChinh: '',
        fileDinhKem: '',
        nguoiThucHien: currentUserName,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setSelectedEvaluation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      // Remove nguoiThucHien from formData to let backend auto-fill from logged-in user
      const { nguoiThucHien, ...dataToSubmit } = formData;

      if (isEditing && selectedEvaluation) {
        await qualityEvaluationService.updateQualityEvaluation(selectedEvaluation.id, dataToSubmit);
      } else {
        await qualityEvaluationService.createQualityEvaluation(dataToSubmit);
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
    if (window.confirm('Bạn có chắc chắn muốn xóa đánh giá chất lượng này?')) {
      try {
        setLoading(true);
        setError('');
        await qualityEvaluationService.deleteQualityEvaluation(id);
        await loadEvaluations();
      } catch (err: any) {
        setError(err.message || 'Lỗi xóa dữ liệu');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleView = (evaluation: QualityEvaluation) => {
    setSelectedEvaluation(evaluation);
    setIsViewModalOpen(true);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Quản lý Đánh giá Chất lượng</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Machine Tabs */}
      <div className="mb-6 bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-4 overflow-x-auto" aria-label="Tabs">
            {machines.map((machine) => (
              <button
                key={machine.id}
                onClick={() => setSelectedMachine(machine.tenMay)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  selectedMachine === machine.tenMay
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {machine.tenMay}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã chiên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Thời gian chiên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên hàng hóa</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Mùi hương</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Hương vị</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Độ ngọt</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Độ giòn</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Người thực hiện</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : evaluations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                evaluations.map((evaluation, index) => (
                  <tr
                    key={evaluation.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {evaluation.maChien}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {formatDateTime(evaluation.thoiGianChien)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {evaluation.tenHangHoa}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {evaluation.muiHuong || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {evaluation.huongVi || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {evaluation.doNgot || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {evaluation.doGion || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {evaluation.nguoiThucHien}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleView(evaluation)}
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <QualityEvaluationModal
        isOpen={isModalOpen}
        isEditing={isEditing}
        formData={formData}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onChange={handleFormChange}
      />
    </div>
  );
};

export default QualityEvaluationManagement;

