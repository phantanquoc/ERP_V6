import { useState, useEffect } from 'react';
import { Plus, Edit, Eye, Trash2, X, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface MachineActivityReport {
  id: number;
  viTri: string;
  tenHeThong: string;
  tongSoLuong: number;
  soLuongHoatDong: number;
  soLuongNgung: number;
  nguyenNhan: string;
  nguoiBaoCao: string;
  fileDinhKem?: string;
  ngayTao: string;
}

const MachineActivityReport = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<MachineActivityReport[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingReport, setEditingReport] = useState<MachineActivityReport | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Get current user's full name
  const getCurrentUserName = () => {
    if (!user) return '';
    return `${user.lastName} ${user.firstName}`.trim();
  };

  const [formData, setFormData] = useState({
    viTri: '',
    tenHeThong: '',
    tongSoLuong: 0,
    soLuongHoatDong: 0,
    soLuongNgung: 0,
    nguyenNhan: '',
    nguoiBaoCao: getCurrentUserName(),
  });

  // Load data from API
  useEffect(() => {
    fetchReports();
  }, []);

  // Update nguoiBaoCao when user is loaded
  useEffect(() => {
    if (user && !editingReport) {
      setFormData(prev => ({
        ...prev,
        nguoiBaoCao: getCurrentUserName()
      }));
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/machine-activity-reports');
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key as keyof typeof formData].toString());
    });

    if (selectedFile) {
      formDataToSend.append('file', selectedFile);
    }

    try {
      const url = editingReport
        ? `http://localhost:5000/api/machine-activity-reports/${editingReport.id}`
        : 'http://localhost:5000/api/machine-activity-reports';

      const method = editingReport ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend,
      });

      if (response.ok) {
        fetchReports();
        handleCloseModal();
      }
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/machine-activity-reports/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchReports();
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  const handleEdit = (report: MachineActivityReport) => {
    setEditingReport(report);
    setFormData({
      viTri: report.viTri,
      tenHeThong: report.tenHeThong,
      tongSoLuong: report.tongSoLuong,
      soLuongHoatDong: report.soLuongHoatDong,
      soLuongNgung: report.soLuongNgung,
      nguyenNhan: report.nguyenNhan,
      nguoiBaoCao: report.nguoiBaoCao,
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (report: MachineActivityReport) => {
    setEditingReport(report);
    setFormData({
      viTri: report.viTri,
      tenHeThong: report.tenHeThong,
      tongSoLuong: report.tongSoLuong,
      soLuongHoatDong: report.soLuongHoatDong,
      soLuongNgung: report.soLuongNgung,
      nguyenNhan: report.nguyenNhan,
      nguoiBaoCao: report.nguoiBaoCao,
    });
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsViewMode(false);
    setEditingReport(null);
    setSelectedFile(null);
    setFormData({
      viTri: '',
      tenHeThong: '',
      tongSoLuong: 0,
      soLuongHoatDong: 0,
      soLuongNgung: 0,
      nguyenNhan: '',
      nguoiBaoCao: getCurrentUserName(),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };



  const handleAddNew = () => {
    setEditingReport(null);
    setIsViewMode(false);
    setFormData({
      viTri: '',
      tenHeThong: '',
      tongSoLuong: 0,
      soLuongHoatDong: 0,
      soLuongNgung: 0,
      nguyenNhan: '',
      nguoiBaoCao: getCurrentUserName(),
    });
    setIsModalOpen(true);
  };

  return (
    <div>
      {/* Header with Add Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Thêm báo cáo
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vị trí</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên hệ thống/thiết bị</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng số lượng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL hoạt động</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL ngưng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nguyên nhân</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người báo cáo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report, index) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{report.viTri}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{report.tenHeThong}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{report.tongSoLuong}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="text-green-600 font-medium">{report.soLuongHoatDong}</span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="text-red-600 font-medium">{report.soLuongNgung}</span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{report.nguyenNhan}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{report.nguoiBaoCao}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(report.ngayTao).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(report)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(report)}
                      className="text-green-600 hover:text-green-800"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Xóa"
                    >
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {isViewMode ? 'Chi tiết báo cáo' : editingReport ? 'Chỉnh sửa báo cáo' : 'Thêm báo cáo mới'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Vị trí */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vị trí <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.viTri}
                    onChange={(e) => setFormData({ ...formData, viTri: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                    placeholder="Nhập vị trí"
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
                    placeholder="Nhập tên hệ thống/thiết bị"
                  />
                </div>

                {/* Tổng số lượng */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tổng số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.tongSoLuong}
                    onChange={(e) => setFormData({ ...formData, tongSoLuong: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                    min="0"
                    placeholder="0"
                  />
                </div>

                {/* Số lượng máy hoạt động */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số lượng máy hoạt động <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.soLuongHoatDong}
                    onChange={(e) => setFormData({ ...formData, soLuongHoatDong: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                    min="0"
                    placeholder="0"
                  />
                </div>


                {/* Số lượng máy ngưng hoạt động */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số lượng máy ngưng hoạt động <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.soLuongNgung}
                    onChange={(e) => setFormData({ ...formData, soLuongNgung: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                    min="0"
                    placeholder="0"
                  />
                </div>

                {/* Nguyên nhân */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nguyên nhân <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.nguyenNhan}
                    onChange={(e) => setFormData({ ...formData, nguyenNhan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isViewMode}
                    rows={3}
                    placeholder="Nhập nguyên nhân"
                  />
                </div>

                {/* Người báo cáo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Người báo cáo
                  </label>
                  <input
                    type="text"
                    value={formData.nguoiBaoCao}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    disabled
                  />
                </div>

                {/* File đính kèm */}
                {!isViewMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File đính kèm
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor="file-upload"
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Chọn file</span>
                      </label>
                      {selectedFile && (
                        <span className="text-sm text-gray-600">{selectedFile.name}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Show file in view mode */}
                {isViewMode && editingReport?.fileDinhKem && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File đính kèm
                    </label>
                    <a
                      href={editingReport.fileDinhKem}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Xem file đính kèm
                    </a>
                  </div>
                )}
              </div>

              {/* Buttons */}
              {!isViewMode && (
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
                    {editingReport ? 'Cập nhật' : 'Thêm mới'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineActivityReport;