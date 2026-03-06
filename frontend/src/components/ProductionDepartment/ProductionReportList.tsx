import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import productionReportService, { ProductionReport } from '../../services/productionReportService';
import ProductionReportModal from './ProductionReportModal';

const ProductionReportList: React.FC = () => {
  const [reports, setReports] = useState<ProductionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ProductionReport | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await productionReportService.getAll(1, 1000);
      setReports(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách báo cáo sản lượng');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedReport(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (report: ProductionReport) => {
    setSelectedReport(report);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (report: ProductionReport) => {
    setSelectedReport(report);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) {
      return;
    }

    try {
      await productionReportService.delete(id);
      setSuccess('Đã xóa báo cáo sản lượng thành công');
      setTimeout(() => setSuccess(''), 3000);
      fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xóa báo cáo sản lượng');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
    setIsViewMode(false);
  };

  const handleModalSuccess = () => {
    fetchReports();
    handleModalClose();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Báo cáo sản lượng</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo báo cáo
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">
                  Ngày tháng
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">
                  Tổng số tua SX
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">
                  Số mẻ thực tế
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                  Mã định mức
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">
                  Chênh lệch KL (kg)
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                  Người thực hiện
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  Hoạt động
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Chưa có báo cáo sản lượng nào
                  </td>
                </tr>
              ) : (
                reports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((report, index) => (
                  <tr
                    key={report.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {new Date(report.ngayThang).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {report.tongSoTuaSanXuat}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {report.soMeThucTe}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {report.maDinhMuc || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold border-r border-gray-200 text-center">
                      <span className={report.chenhLechKhoiLuong >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {report.chenhLechKhoiLuong >= 0 ? '+' : ''}{report.chenhLechKhoiLuong.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {report.nguoiThucHien || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleView(report)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(() => {
          const totalItems = reports.length;
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
      </div>

      {/* Modal */}
      <ProductionReportModal
        isOpen={isModalOpen}
        report={selectedReport}
        viewMode={isViewMode}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default ProductionReportList;

