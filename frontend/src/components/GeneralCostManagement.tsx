import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import generalCostService, { GeneralCost, CreateGeneralCostInput, UpdateGeneralCostInput } from '../services/generalCostService';

const GeneralCostManagement: React.FC = () => {
  const { user } = useAuth();
  const [costs, setCosts] = useState<GeneralCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCost, setEditingCost] = useState<GeneralCost | null>(null);
  const [formData, setFormData] = useState<CreateGeneralCostInput>({
    tenChiPhi: '',
    loaiChiPhi: '',
    noiDung: '',
    donViTinh: '',
    giaThanhNgay: undefined,
    donViTien: 'VND',
    msnv: user?.employeeCode || '',
    tenNhanVien: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
  });

  useEffect(() => {
    loadCosts();
  }, [currentPage, searchTerm]);

  const loadCosts = async () => {
    try {
      setLoading(true);
      const response = await generalCostService.getAllGeneralCosts(currentPage, 10, searchTerm);
      setCosts(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Error loading general costs:', error);
      alert('Lỗi khi tải danh sách chi phí chung');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cost?: GeneralCost) => {
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
        tenNhanVien: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
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
      if (editingCost) {
        await generalCostService.updateGeneralCost(editingCost.id, formData as UpdateGeneralCostInput);
        alert('Cập nhật chi phí chung thành công!');
      } else {
        await generalCostService.createGeneralCost(formData);
        alert('Tạo chi phí chung thành công!');
      }
      handleCloseModal();
      loadCosts();
    } catch (error) {
      console.error('Error saving general cost:', error);
      alert('Lỗi khi lưu chi phí chung');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa chi phí này?')) {
      return;
    }

    try {
      await generalCostService.deleteGeneralCost(id);
      alert('Xóa chi phí chung thành công!');
      loadCosts();
    } catch (error) {
      console.error('Error deleting general cost:', error);
      alert('Lỗi khi xóa chi phí chung');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Chi phí Chung</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tạo chi phí chung
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã, tên, loại chi phí..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã chi phí</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên chi phí</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại chi phí</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị tính</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá thành/ngày</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người tạo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : costs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              costs.map((cost) => (
                <tr key={cost.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cost.maChiPhi}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cost.tenChiPhi}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cost.loaiChiPhi}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cost.donViTinh || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cost.giaThanhNgay ? `${new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cost.giaThanhNgay)} ${cost.donViTien || 'VND'}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cost.tenNhanVien || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(cost)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cost.id)}
                        className="text-red-600 hover:text-red-800"
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
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Trước
          </button>
          <span className="px-4 py-2">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {editingCost ? 'Chỉnh sửa chi phí chung' : 'Tạo chi phí chung'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
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
                      onChange={(e) => setFormData({ ...formData, giaThanhNgay: e.target.value ? parseFloat(e.target.value) : undefined })}
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

              <div className="mt-6 flex justify-end gap-2">
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
        </div>
      )}
    </div>
  );
};

export default GeneralCostManagement;

