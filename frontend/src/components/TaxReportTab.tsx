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
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày đặt hàng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Đơn Hàng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên hàng hoá</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn vị</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị đơn hàng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số tiền đóng thuế</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chí</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File đính kèm</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {taxReports.map((report, index) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                    {formatDate(report.ngayDatHang)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{report.maDonHang}</td>
                <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{report.tenHangHoa}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{report.soLuong.toLocaleString()}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{report.donVi}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                    {formatCurrency(report.giaTriDonHang)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.soTienDongThue ? formatCurrency(report.soTienDongThue) : '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(report.trangThai)}`}>
                    {getStatusLabel(report.trangThai)}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{report.ghiChi || '-'}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.fileDinhKem ? (
                    <a href={report.fileDinhKem} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Xem file
                    </a>
                  ) : '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-2">
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

