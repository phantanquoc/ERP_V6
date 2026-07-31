import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, Download } from 'lucide-react';
import qualityEvaluationService, { QualityEvaluation } from '../services/qualityEvaluationService';
import { useAuth } from '../contexts/AuthContext';
import QualityEvaluationModal from './QualityEvaluationModal';
import TableFilter, { FilterField } from './TableFilter';
import { useActiveFryerMachineSystems } from '../hooks/useMachineSystemDetails';
import { productionDayRange } from '../utils/productionDay';

interface QualityEvaluationManagementProps {
  productionDay?: string;
}

const QualityEvaluationManagement: React.FC<QualityEvaluationManagementProps> = ({ productionDay }) => {
  const { user } = useAuth();
  const machineSystemsQuery = useActiveFryerMachineSystems();
  const machineSystems = machineSystemsQuery.data?.data ?? [];
  const [evaluations, setEvaluations] = useState<QualityEvaluation[]>([]);
  const [selectedMachineSystemId, setSelectedMachineSystemId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<QualityEvaluation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', maChien: '', tenHangHoa: '' });

  const productFilterFields: FilterField[] = [
    { key: 'maChien', label: 'Mã chiên', type: 'text' },
    { key: 'tenHangHoa', label: 'Mã hàng hóa', type: 'text' },
  ];

  // Get current user's full name
  const currentUserName = user ? `${user.lastName} ${user.firstName}`.trim() : '';

  const [formData, setFormData] = useState({
    maChien: '',
    thoiGianChien: '',
    tenHangHoa: '',
    mauSac: '',
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
    danhGiaTongQuan: '',
    deXuatDieuChinh: '',
    fileDinhKem: '',
    nguoiThucHien: '',
  });

  useEffect(() => {
    loadEvaluations();
    setCurrentPage(1);
  }, [selectedMachineSystemId, productionDay]);

  useEffect(() => {
    loadEvaluations();
  }, [currentPage]);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      setError('');
      // Compute production day range (06:30 to 06:30 next day)
      let dateRange: { thoiGianChienFrom?: string; thoiGianChienTo?: string } | undefined;
      if (productionDay) {
        const range = productionDayRange(productionDay);
        dateRange = { thoiGianChienFrom: range.from, thoiGianChienTo: range.to };
      }
      const result = await qualityEvaluationService.getAllQualityEvaluations(currentPage, 1000, selectedMachineSystemId || undefined, dateRange);
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
    if (!datetime) return '-';
    try {
      // Handle different datetime formats
      let date: Date;

      // Check if it's an ISO string (contains 'T' and possibly 'Z' or timezone)
      if (datetime.includes('T')) {
        date = new Date(datetime);
      } else if (datetime.includes('/')) {
        // Handle DD/MM/YYYY or DD/MM/YYYY HH:mm format
        const parts = datetime.split(' ');
        const dateParts = parts[0].split('/');
        if (dateParts.length === 3) {
          const [day, month, year] = dateParts;
          const timePart = parts[1] || '00:00';
          date = new Date(`${year}-${month}-${day}T${timePart}`);
        } else {
          return datetime;
        }
      } else {
        date = new Date(datetime);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return datetime || '-';
      }

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return datetime || '-';
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenModal = (evaluation?: QualityEvaluation) => {
    if (evaluation) {
      setIsEditing(true);
      setSelectedEvaluation(evaluation);

      // Convert datetime to datetime-local format for display
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
        maChien: evaluation.maChien,
        thoiGianChien: thoiGianChienLocal,
        tenHangHoa: evaluation.tenHangHoa,
        mauSac: evaluation.mauSac,
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
        danhGiaTongQuan: evaluation.danhGiaTongQuan || '',
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
        mauSac: '',
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
        danhGiaTongQuan: '',
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

      if (isEditing && selectedEvaluation) {
        await qualityEvaluationService.updateQualityEvaluation(selectedEvaluation.id, formData);
      } else {
        await qualityEvaluationService.createQualityEvaluation(formData);
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

  const handleExportExcel = async () => {
    try {
      await qualityEvaluationService.exportToExcel();
      alert('Đã xuất file Excel thành công');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Không thể xuất file Excel');
    }
  };

  const filteredEvaluations = evaluations.filter(evaluation => {
    const search = filterValues._search.toLowerCase();
    const matchSearch = !search || (evaluation.maChien || '').toLowerCase().includes(search) || (evaluation.tenHangHoa || '').toLowerCase().includes(search) || (evaluation.nguoiThucHien || '').toLowerCase().includes(search);
    const matchMaChien = !filterValues.maChien || (evaluation.maChien || '').toLowerCase().includes(filterValues.maChien.toLowerCase());
    const matchTenHangHoa = !filterValues.tenHangHoa || (evaluation.tenHangHoa || '').toLowerCase().includes(filterValues.tenHangHoa.toLowerCase());
    return matchSearch && matchMaChien && matchTenHangHoa;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Đánh giá chất lượng</h2>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={18} />
          Xuất Excel
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Machine Selector */}
      <div className="mb-6 bg-white rounded-lg shadow">
        {/* Mobile: dropdown */}
        <div className="sm:hidden px-4 py-3">
          <select
            value={selectedMachineSystemId}
            onChange={(e) => setSelectedMachineSystemId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">Tổng các máy</option>
            {machineSystems.map((ms) => (
              <option key={ms.id} value={ms.id}>
                {ms.tenHeThong} ({ms.maHeThong})
              </option>
            ))}
          </select>
        </div>
        {/* Desktop: tabs */}
        <div className="hidden sm:block border-b border-gray-200">
          <nav className="flex space-x-4 px-4 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setSelectedMachineSystemId('')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                !selectedMachineSystemId
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tổng các máy
            </button>
            {machineSystems.map((ms) => (
              <button
                key={ms.id}
                onClick={() => setSelectedMachineSystemId(ms.id)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  selectedMachineSystemId === ms.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {ms.tenHeThong}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <TableFilter
        filters={productFilterFields}
        values={filterValues}
        onChange={(newValues) => { setFilterValues(newValues); setCurrentPage(1); }}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                <th className="px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã chiên</th>
                <th className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Thời gian chiên</th>
                <th className="px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã hàng hóa</th>
                <th className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Màu sắc</th>
                <th className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Mùi hương</th>
                <th className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Vị</th>
                <th className="hidden lg:table-cell px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Độ ngọt</th>
                <th className="hidden lg:table-cell px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Độ giòn</th>
                <th className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã NV thực hiện</th>
                <th className="px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-3 py-4 sm:px-6 sm:py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-4 sm:px-6 sm:py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                filteredEvaluations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((evaluation, index) => (
                  <tr
                    key={evaluation.id}
                    onClick={() => handleView(evaluation)}
                    className={`border-b border-gray-200 hover:bg-blue-100 border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {evaluation.maChien}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-700 border-r border-gray-200">
                      {formatDateTime(evaluation.thoiGianChien)}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {evaluation.tenHangHoa}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {evaluation.mauSac || '-'}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {evaluation.muiHuong || '-'}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {evaluation.huongVi || '-'}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {evaluation.doNgot || '-'}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {evaluation.doGion || '-'}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {evaluation.nguoiThucHien}
                    </td>
                    <td className="px-3 py-2 sm:px-6 sm:py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(evaluation); }}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(evaluation.id); }}
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

      {(() => {
        const totalItems = filteredEvaluations.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        return totalPages > 1 ? (
          <div className="flex items-center justify-between mt-4 px-2">
            <span className="text-sm text-gray-600">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
            </span>
            <div className="flex items-center gap-2">
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
                      className={`px-3 py-1.5 text-sm rounded-md ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
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
        ) : null;
      })()}

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
