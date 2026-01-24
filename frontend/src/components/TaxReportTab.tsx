import React, { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Calendar, DollarSign, FileText, Upload } from 'lucide-react';
import taxReportService, { TaxReport, TaxReportStatus, TaxReportInput } from '../services/taxReportService';

const TaxReportTab: React.FC = () => {
  const [taxReports, setTaxReports] = useState<TaxReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TaxReport | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState<TaxReportInput>({});

  useEffect(() => {
    loadTaxReports();
  }, []);

  const loadTaxReports = async () => {
    try {
      setLoading(true);
      const response = await taxReportService.getAllTaxReports(1, 100);
      setTaxReports(response.data);
    } catch (error) {
      console.error('Error loading tax reports:', error);
      alert('Lỗi khi tải danh sách báo cáo thuế');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (report: TaxReport) => {
    setSelectedReport(report);
    setFormData({
      soTienDongThue: report.soTienDongThue,
      trangThai: report.trangThai,
      ghiChi: report.ghiChi,
      fileDinhKem: report.fileDinhKem,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedReport) return;

    try {
      await taxReportService.updateTaxReport(selectedReport.id, formData);
      alert('Cập nhật báo cáo thuế thành công');
      setShowEditModal(false);
      loadTaxReports();
    } catch (error) {
      console.error('Error updating tax report:', error);
      alert('Lỗi khi cập nhật báo cáo thuế');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa báo cáo thuế này?')) return;

    try {
      await taxReportService.deleteTaxReport(id);
      alert('Xóa báo cáo thuế thành công');
      loadTaxReports();
    } catch (error) {
      console.error('Error deleting tax report:', error);
      alert('Lỗi khi xóa báo cáo thuế');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusLabel = (status: TaxReportStatus) => {
    const labels: Record<TaxReportStatus, string> = {
      CHUA_BAO_CAO: 'Chưa báo cáo',
      DANG_CAP_NHAT_HO_SO: 'Đang cập nhật hồ sơ',
      DA_DAY_DU_HO_SO: 'Đã đầy đủ hồ sơ để báo cáo',
      DA_BAO_CAO: 'Đã báo cáo',
      DA_QUYET_TOAN: 'Đã quyết toán',
    };
    return labels[status];
  };

  const getStatusColor = (status: TaxReportStatus) => {
    const colors: Record<TaxReportStatus, string> = {
      CHUA_BAO_CAO: 'bg-gray-100 text-gray-800',
      DANG_CAP_NHAT_HO_SO: 'bg-yellow-100 text-yellow-800',
      DA_DAY_DU_HO_SO: 'bg-blue-100 text-blue-800',
      DA_BAO_CAO: 'bg-green-100 text-green-800',
      DA_QUYET_TOAN: 'bg-purple-100 text-purple-800',
    };
    return colors[status];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày đặt hàng</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã Đơn Hàng</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên hàng hoá</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số lượng</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Đơn vị</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Giá trị đơn hàng</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số tiền đóng thuế</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ghi chú</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">File đính kèm</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
            </tr>
          </thead>
          <tbody>
            {taxReports.map((report, index) => (
              <tr
                key={report.id}
                className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">{index + 1}</td>
                <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                    {formatDate(report.ngayDatHang)}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">{report.maDonHang}</td>
                <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">{report.tenHangHoa}</td>
                <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">{report.soLuong.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">{report.donVi}</td>
                <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                  {formatCurrency(report.giaTriDonHang)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                  {report.soTienDongThue ? formatCurrency(report.soTienDongThue) : '-'}
                </td>
                <td className="px-6 py-4 text-center border-r border-gray-200">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(report.trangThai)}`}>
                    {getStatusLabel(report.trangThai)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">{report.ghiChi || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                  {report.fileDinhKem ? (
                    <a href={report.fileDinhKem} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Xem file
                    </a>
                  ) : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleEdit(report)}
                      className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
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

      {/* Edit Modal */}
      {showEditModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Chỉnh sửa báo cáo thuế</h2>

              {/* Auto-filled fields (read-only) */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Thông tin tự động (từ đơn hàng)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mã đơn hàng</label>
                    <p className="text-sm text-gray-900">{selectedReport.maDonHang}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ngày đặt hàng</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedReport.ngayDatHang)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tên hàng hóa</label>
                    <p className="text-sm text-gray-900">{selectedReport.tenHangHoa}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Số lượng</label>
                    <p className="text-sm text-gray-900">{selectedReport.soLuong.toLocaleString()} {selectedReport.donVi}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Giá trị đơn hàng</label>
                    <p className="text-sm text-gray-900">{formatCurrency(selectedReport.giaTriDonHang)}</p>
                  </div>
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số tiền đóng thuế</label>
                  <input
                    type="number"
                    value={formData.soTienDongThue || ''}
                    onChange={(e) => setFormData({ ...formData, soTienDongThue: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Nhập số tiền đóng thuế"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                  <select
                    value={formData.trangThai || ''}
                    onChange={(e) => setFormData({ ...formData, trangThai: e.target.value as TaxReportStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="CHUA_BAO_CAO">Chưa báo cáo</option>
                    <option value="DANG_CAP_NHAT_HO_SO">Đang cập nhật hồ sơ</option>
                    <option value="DA_DAY_DU_HO_SO">Đã đầy đủ hồ sơ để báo cáo</option>
                    <option value="DA_BAO_CAO">Đã báo cáo</option>
                    <option value="DA_QUYET_TOAN">Đã quyết toán</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chí</label>
                  <textarea
                    value={formData.ghiChi || ''}
                    onChange={(e) => setFormData({ ...formData, ghiChi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                    placeholder="Nhập ghi chú"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">File đính kèm (URL)</label>
                  <input
                    type="text"
                    value={formData.fileDinhKem || ''}
                    onChange={(e) => setFormData({ ...formData, fileDinhKem: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Nhập URL file đính kèm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReportTab;

