import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, Search, X } from 'lucide-react';
import internalInspectionService from '@services/internalInspectionService';
import type { InternalInspection } from '@services/internalInspectionService';

const InternalInspectionManagement = () => {
  const [inspections, setInspections] = useState<InternalInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectionPlanCode: '',
    violationCode: '',
    violationContent: '',
    violationLevel: '',
    violationCategory: '',
    violationDescription: '',
    inspectedBy: '',
    inspectedByCode: '',
    verifiedBy1: '',
    verifiedBy1Code: '',
    verifiedBy2: '',
    verifiedBy2Code: '',
    status: 'PENDING',
    notes: '',
  });

  useEffect(() => {
    loadInspections();
  }, [selectedMonth, selectedYear]);

  const loadInspections = async () => {
    try {
      setLoading(true);
      const data = await internalInspectionService.getAllInspections(selectedMonth, selectedYear);
      setInspections(data);
    } catch (error) {
      console.error('Error loading inspections:', error);
      alert('Lỗi khi tải danh sách kiểm tra');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadInspections();
      return;
    }
    try {
      setLoading(true);
      const data = await internalInspectionService.searchInspections(searchTerm);
      setInspections(data);
    } catch (error) {
      console.error('Error searching:', error);
      alert('Lỗi khi tìm kiếm');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      inspectionDate: new Date().toISOString().split('T')[0],
      inspectionPlanCode: '',
      violationCode: '',
      violationContent: '',
      violationLevel: '',
      violationCategory: '',
      violationDescription: '',
      inspectedBy: '',
      inspectedByCode: '',
      verifiedBy1: '',
      verifiedBy1Code: '',
      verifiedBy2: '',
      verifiedBy2Code: '',
      status: 'PENDING',
      notes: '',
    });
    setShowModal(true);
  };

  const handleEdit = async (inspection: InternalInspection) => {
    setEditingId(inspection.id);
    setFormData({
      inspectionDate: inspection.inspectionDate.split('T')[0],
      inspectionPlanCode: inspection.inspectionPlanCode,
      violationCode: inspection.violationCode,
      violationContent: inspection.violationContent,
      violationLevel: inspection.violationLevel,
      violationCategory: inspection.violationCategory,
      violationDescription: inspection.violationDescription,
      inspectedBy: inspection.inspectedBy,
      inspectedByCode: inspection.inspectedByCode,
      verifiedBy1: inspection.verifiedBy1,
      verifiedBy1Code: inspection.verifiedBy1Code,
      verifiedBy2: inspection.verifiedBy2,
      verifiedBy2Code: inspection.verifiedBy2Code,
      status: inspection.status,
      notes: inspection.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await internalInspectionService.updateInspection(editingId, formData);
        alert('Cập nhật thành công');
      } else {
        await internalInspectionService.createInspection(formData);
        alert('Tạo mới thành công');
      }
      setShowModal(false);
      loadInspections();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Lỗi khi lưu dữ liệu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa?')) return;
    try {
      await internalInspectionService.deleteInspection(id);
      alert('Xóa thành công');
      loadInspections();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Lỗi khi xóa');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Tháng</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border rounded px-3 py-2"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Năm</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border rounded px-3 py-2"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Tìm kiếm</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Mã kiểm tra, mã vi phạm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <Search size={18} />
              Tìm
            </button>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Thêm mới
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2 text-left">STT</th>
              <th className="px-4 py-2 text-left">Mã kiểm tra</th>
              <th className="px-4 py-2 text-left">Ngày kiểm tra</th>
              <th className="px-4 py-2 text-left">Mã vi phạm</th>
              <th className="px-4 py-2 text-left">Nội dung vi phạm</th>
              <th className="px-4 py-2 text-left">Mức độ</th>
              <th className="px-4 py-2 text-left">Người kiểm tra</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
              <th className="px-4 py-2 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center">
                  Đang tải...
                </td>
              </tr>
            ) : inspections.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              inspections.map((inspection) => (
                <tr key={inspection.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{inspection.stt}</td>
                  <td className="px-4 py-2">{inspection.inspectionCode}</td>
                  <td className="px-4 py-2">{new Date(inspection.inspectionDate).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-2">{inspection.violationCode}</td>
                  <td className="px-4 py-2 max-w-xs truncate">{inspection.violationContent}</td>
                  <td className="px-4 py-2">{inspection.violationLevel}</td>
                  <td className="px-4 py-2">{inspection.inspectedBy}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      inspection.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      inspection.status === 'VERIFIED' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {inspection.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEdit(inspection)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(inspection.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Xóa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingId ? 'Chỉnh sửa kiểm tra' : 'Thêm kiểm tra mới'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ngày kiểm tra</label>
                <input
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mã kế hoạch kiểm tra</label>
                <input
                  type="text"
                  value={formData.inspectionPlanCode}
                  onChange={(e) => setFormData({ ...formData, inspectionPlanCode: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mã vi phạm</label>
                <input
                  type="text"
                  value={formData.violationCode}
                  onChange={(e) => setFormData({ ...formData, violationCode: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mức độ vi phạm</label>
                <select
                  value={formData.violationLevel}
                  onChange={(e) => setFormData({ ...formData, violationLevel: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">-- Chọn --</option>
                  <option value="Quy định">Quy định</option>
                  <option value="Quy phạm quản lý">Quy phạm quản lý</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loại vi phạm</label>
                <input
                  type="text"
                  value={formData.violationCategory}
                  onChange={(e) => setFormData({ ...formData, violationCategory: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Người kiểm tra</label>
                <input
                  type="text"
                  value={formData.inspectedBy}
                  onChange={(e) => setFormData({ ...formData, inspectedBy: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Nội dung vi phạm</label>
                <textarea
                  value={formData.violationContent}
                  onChange={(e) => setFormData({ ...formData, violationContent: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Mô tả chi tiết</label>
                <textarea
                  value={formData.violationDescription}
                  onChange={(e) => setFormData({ ...formData, violationDescription: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="PENDING">Chờ xử lý</option>
                  <option value="VERIFIED">Đã xác nhận</option>
                  <option value="CLOSED">Đã đóng</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Lưu
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalInspectionManagement;

