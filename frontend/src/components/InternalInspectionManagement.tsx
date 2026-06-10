import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, X, Download } from 'lucide-react';
import internalInspectionService from '@services/internalInspectionService';
import type { InternalInspection } from '@services/internalInspectionService';
import TableFilter, { FilterField } from './TableFilter';
import Modal from './Modal';
import { useAllEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';

const InternalInspectionManagement = () => {
  const [inspections, setInspections] = useState<InternalInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const { data: employeeData } = useAllEmployeesForAssignment();
  const employees = (employeeData?.employees ?? []).map(emp => ({
    id: emp._id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    employeeCode: emp.employeeCode,
  }));
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    _search: '',
    violationLevel: '',
    inspectedBy: '',
    violationCode: '',
  });
  const filterFields: FilterField[] = [
    {
      key: 'violationLevel',
      label: 'Mức độ vi phạm',
      type: 'select',
      options: [
        { value: 'Quy định', label: 'Quy định' },
        { value: 'Quy phạm quản lý', label: 'Quy phạm quản lý' },
        { value: 'Khác', label: 'Khác' },
      ],
    },
    { key: 'inspectedBy', label: 'Người kiểm tra', type: 'text', placeholder: 'Lọc người kiểm tra...' },
    { key: 'violationCode', label: 'Mã vi phạm', type: 'text', placeholder: 'Lọc mã vi phạm...' },
  ];
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
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

  const filteredInspections = inspections.filter(ins => {
    const search = (filterValues._search || '').toLowerCase();
    if (search && !(
      (ins.inspectionCode || '').toLowerCase().includes(search) ||
      (ins.violationCode || '').toLowerCase().includes(search) ||
      (ins.inspectedBy || '').toLowerCase().includes(search)
    )) return false;
    if (filterValues.violationLevel && (ins.violationLevel || '') !== filterValues.violationLevel) return false;
    if (filterValues.inspectedBy && !(ins.inspectedBy || '').toLowerCase().includes(filterValues.inspectedBy.toLowerCase())) return false;
    if (filterValues.violationCode && !(ins.violationCode || '').toLowerCase().includes(filterValues.violationCode.toLowerCase())) return false;
    return true;
  });

  const handleExportExcel = async () => {
    try {
      await internalInspectionService.exportToExcel();
      alert('Đã xuất file Excel thành công');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Không thể xuất file Excel');
    }
  };

  const totalItems = filteredInspections.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedInspections = filteredInspections.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Kiểm tra nội bộ</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download size={18} />
            Xuất Excel
          </button>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={18} />
            Thêm mới
          </button>
        </div>
      </div>

      {/* Month/Year selects */}
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
      </div>

      {/* Search & Filter */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm mã kiểm tra, mã vi phạm, người kiểm tra..."
      />

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
              paginatedInspections.map((inspection) => (
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

      {totalPages > 1 && (
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

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} showBackdrop>
        <div className="bg-white rounded-lg max-w-2xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 overflow-y-auto flex-1">
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
                <select
                  value={formData.violationCategory}
                  onChange={(e) => setFormData({ ...formData, violationCategory: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">-- Chọn --</option>
                  <option value="An toàn lao động">An toàn lao động</option>
                  <option value="Vệ sinh thực phẩm">Vệ sinh thực phẩm</option>
                  <option value="Quy trình sản xuất">Quy trình sản xuất</option>
                  <option value="Chất lượng sản phẩm">Chất lượng sản phẩm</option>
                  <option value="Môi trường">Môi trường</option>
                  <option value="Hành chính">Hành chính</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Người kiểm tra</label>
                <select
                  value={formData.inspectedBy}
                  onChange={(e) => {
                    const emp = employees.find(em => `${em.lastName} ${em.firstName}` === e.target.value);
                    setFormData({
                      ...formData,
                      inspectedBy: e.target.value,
                      inspectedByCode: emp?.employeeCode || '',
                    });
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">-- Chọn --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={`${emp.lastName} ${emp.firstName}`}>
                      {emp.lastName} {emp.firstName}
                    </option>
                  ))}
                </select>
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
              <div>
                <label className="block text-sm font-medium mb-1">Người xác nhận 1</label>
                <select
                  value={formData.verifiedBy1}
                  onChange={(e) => {
                    const emp = employees.find(em => `${em.lastName} ${em.firstName}` === e.target.value);
                    setFormData({
                      ...formData,
                      verifiedBy1: e.target.value,
                      verifiedBy1Code: emp?.employeeCode || '',
                    });
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">-- Chọn --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={`${emp.lastName} ${emp.firstName}`}>
                      {emp.lastName} {emp.firstName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Người xác nhận 2</label>
                <select
                  value={formData.verifiedBy2}
                  onChange={(e) => {
                    const emp = employees.find(em => `${em.lastName} ${em.firstName}` === e.target.value);
                    setFormData({
                      ...formData,
                      verifiedBy2: e.target.value,
                      verifiedBy2Code: emp?.employeeCode || '',
                    });
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">-- Chọn --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={`${emp.lastName} ${emp.firstName}`}>
                      {emp.lastName} {emp.firstName}
                    </option>
                  ))}
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
      </Modal>
    </div>
  );
};

export default InternalInspectionManagement;

