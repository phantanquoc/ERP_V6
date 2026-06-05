import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Download, DollarSign, Plane } from 'lucide-react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import exportCostService, { ExportCost, CreateExportCostInput, UpdateExportCostInput } from '../services/exportCostService';
import generalCostService, { GeneralCost, CreateGeneralCostInput, UpdateGeneralCostInput } from '../services/generalCostService';
import { parseNumberInput } from '../utils/numberInput';
import TableFilter, { FilterField } from './TableFilter';

type CostType = 'export' | 'general';
type AnyCost = ExportCost | GeneralCost;

const ExportCostManagement: React.FC = () => {
  const { user } = useAuth();
  const [costType, setCostType] = useState<CostType>('export');
  const [costs, setCosts] = useState<AnyCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', tenChiPhi: '', loaiChiPhi: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filterFields: FilterField[] = [
    { key: 'tenChiPhi', label: 'Tên chi phí', type: 'text', placeholder: 'Lọc tên chi phí...' },
    { key: 'loaiChiPhi', label: 'Loại chi phí', type: 'text', placeholder: 'Lọc loại chi phí...' },
  ];
  const [showModal, setShowModal] = useState(false);
  const [editingCost, setEditingCost] = useState<AnyCost | null>(null);
  const [formData, setFormData] = useState<CreateExportCostInput>({
    tenChiPhi: '',
    loaiChiPhi: '',
    noiDung: '',
    donViTinh: '',
    giaThanhNgay: undefined,
    donViTien: 'VND',
    msnv: user?.employeeCode || '',
    tenNhanVien: user?.firstName && user?.lastName ? `${user.lastName} ${user.firstName}` : '',
  });

  useEffect(() => {
    loadCosts();
  }, [filterValues._search, costType]);

  const isExport = costType === 'export';
  const label = isExport ? 'chi phí xuất khẩu' : 'chi phí chung';
  const Label = isExport ? 'Chi phí Xuất khẩu' : 'Chi phí Chung';

  const loadCosts = async () => {
    try {
      setLoading(true);
      if (isExport) {
        const response = await exportCostService.getAllExportCosts(1, 1000, filterValues._search || '');
        setCosts(response.data);
      } else {
        const response = await generalCostService.getAllGeneralCosts(1, 1000, filterValues._search || '');
        setCosts(response.data);
      }
    } catch (error) {
      console.error(`Error loading ${label}:`, error);
      alert(`Lỗi khi tải danh sách ${label}`);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering for additional filter fields
  const filteredCosts = costs.filter((cost) => {
    if (filterValues.tenChiPhi && !cost.tenChiPhi.toLowerCase().includes(filterValues.tenChiPhi.toLowerCase())) return false;
    if (filterValues.loaiChiPhi && !cost.loaiChiPhi.toLowerCase().includes(filterValues.loaiChiPhi.toLowerCase())) return false;
    return true;
  });

  const handleOpenModal = (cost?: AnyCost) => {
    if (cost) {
      setEditingCost(cost);
      setFormData({
        tenChiPhi: cost.tenChiPhi,
        loaiChiPhi: cost.loaiChiPhi,
        noiDung: cost.noiDung || '',
        donViTinh: cost.donViTinh || '',
        giaThanhNgay: cost.giaThanhNgay || 0,
        donViTien: cost.donViTien || 'VND',
      });
    } else {
      setEditingCost(null);
      setFormData({
        tenChiPhi: '',
        loaiChiPhi: '',
        noiDung: '',
        donViTinh: '',
        giaThanhNgay: 0,
        donViTien: 'VND',
        msnv: user?.employeeCode || '',
        tenNhanVien: user?.firstName && user?.lastName ? `${user.lastName} ${user.firstName}` : '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCost(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenChiPhi || !formData.loaiChiPhi) {
      alert('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      if (isExport) {
        if (editingCost) {
          await exportCostService.updateExportCost(editingCost.id, formData as UpdateExportCostInput);
        } else {
          await exportCostService.createExportCost(formData);
        }
      } else {
        if (editingCost) {
          await generalCostService.updateGeneralCost(editingCost.id, formData as UpdateGeneralCostInput);
        } else {
          await generalCostService.createGeneralCost(formData as CreateGeneralCostInput);
        }
      }
      alert(editingCost ? `Cập nhật ${label} thành công!` : `Tạo ${label} thành công!`);
      handleCloseModal();
      loadCosts();
    } catch (error) {
      console.error(`Error saving ${label}:`, error);
      alert(`Lỗi khi lưu ${label}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa chi phí này?')) {
      return;
    }

    try {
      if (isExport) {
        await exportCostService.deleteExportCost(id);
      } else {
        await generalCostService.deleteGeneralCost(id);
      }
      alert(`Xóa ${label} thành công!`);
      loadCosts();
    } catch (error) {
      console.error(`Error deleting ${label}:`, error);
      alert(`Lỗi khi xóa ${label}`);
    }
  };

  const handleExportExcel = async () => {
    try {
      if (isExport) {
        await exportCostService.exportToExcel();
      } else {
        await generalCostService.exportToExcel();
      }
      alert('Xuất file Excel thành công!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Lỗi khi xuất file Excel');
    }
  };

  const handleSwitchCostType = (type: CostType) => {
    setCostType(type);
    setCurrentPage(1);
    setFilterValues({ _search: '', tenChiPhi: '', loaiChiPhi: '' });
  };

  return (
    <div className="space-y-4">
      {/* Cost Type Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => handleSwitchCostType('export')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors ${
            costType === 'export'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Plane className="w-4 h-4" />
          Chi phí Xuất khẩu
        </button>
        <button
          onClick={() => handleSwitchCostType('general')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors ${
            costType === 'general'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Chi phí Chung
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý {Label}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tạo {label}
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm mã, tên, loại chi phí..."
      />

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mã chi phí</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tên chi phí</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Loại chi phí</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Đơn vị tính</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Giá thành/ngày</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Người tạo</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : filteredCosts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              filteredCosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((cost) => (
                <tr key={cost.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-700">
                    {cost.maChiPhi}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {cost.tenChiPhi}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {cost.loaiChiPhi}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {cost.donViTinh || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {cost.giaThanhNgay ? `${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cost.giaThanhNgay)} ${cost.donViTien || 'VND'}` : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {cost.tenNhanVien || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenModal(cost)}
                        className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cost.id)}
                        className="p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(() => {
        const totalItems = filteredCosts.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        return totalPages > 1 ? (
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-sm text-gray-600">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
            </span>
            <div className="flex items-center gap-1">
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
      <Modal isOpen={showModal} onClose={handleCloseModal} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
            <h3 className="text-xl font-bold text-gray-800">
              {editingCost ? `Chỉnh sửa ${label}` : `Tạo ${label}`}
            </h3>
            <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên chi phí <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tenChiPhi}
                    onChange={(e) => setFormData({ ...formData, tenChiPhi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại chi phí <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.loaiChiPhi}
                    onChange={(e) => setFormData({ ...formData, loaiChiPhi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị tính
                  </label>
                  <input
                    type="text"
                    value={formData.donViTinh}
                    onChange={(e) => setFormData({ ...formData, donViTinh: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá thành/ngày
                  </label>
                  <div className="grid grid-cols-[70%_30%] gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.giaThanhNgay || ''}
                      onChange={(e) => setFormData({ ...formData, giaThanhNgay: e.target.value ? parseNumberInput(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập giá thành/ngày"
                    />
                    <select
                      value={formData.donViTien || 'VND'}
                      onChange={(e) => setFormData({ ...formData, donViTien: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="VND">VND</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nội dung
                  </label>
                  <textarea
                    value={formData.noiDung}
                    onChange={(e) => setFormData({ ...formData, noiDung: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCost ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default ExportCostManagement;

