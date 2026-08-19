import React, { useCallback, useEffect, useState } from 'react';
import { Plus, FileText, Eye, Pencil, Trash2, Printer } from 'lucide-react';
import TableFilter, { FilterField } from './TableFilter';
import Modal from './Modal';
import WarehouseSlipPrintView from './WarehouseSlipPrintView';
import { formatActualTotalByUnit } from '../utils/warehouseSlipTotals';
import CreateWarehouseIssueModal from './CreateWarehouseIssueModal';
import EditWarehouseIssueModal from './EditWarehouseIssueModal';
import { useQueryClient } from '@tanstack/react-query';
import warehouseIssueService, { WarehouseIssue } from '../services/warehouseIssueService';
import { getUniqueSlipField, getWarehouseSlipLines, normalizeWarehouseListResponse } from '../utils/warehouseSlipLines';
import { warehouseKeys } from '../hooks';

interface WarehouseIssueTabProps {
  month?: number;
  year?: number;
}

/** Case-insensitive substring test that tolerates undefined haystacks. */
function contains(haystack: string | undefined | null, needle: string): boolean {
  return (haystack || '').toLowerCase().includes(needle);
}

const WarehouseIssueTab: React.FC<WarehouseIssueTabProps> = ({ month, year }) => {
  const queryClient = useQueryClient();
  const [issues, setIssues] = useState<WarehouseIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<WarehouseIssue | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [printIssue, setPrintIssue] = useState<WarehouseIssue | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState<WarehouseIssue | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', maPhieuXuat: '', tenNhanVien: '', tenKho: '', tenSanPham: '' });
  const issueFilterFields: FilterField[] = [
    { key: 'maPhieuXuat', label: 'Mã phiếu', type: 'text' },
    { key: 'tenNhanVien', label: 'Nhân viên', type: 'text' },
    { key: 'tenKho', label: 'Kho', type: 'text' },
    { key: 'tenSanPham', label: 'Sản phẩm', type: 'text' },
  ];

  const handleViewDetail = (issue: WarehouseIssue) => {
    setSelectedIssue(issue);
    setShowDetailModal(true);
  };

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await warehouseIssueService.getAllWarehouseIssues() as any;
      setIssues(normalizeWarehouseListResponse<WarehouseIssue>(response?.data));
    } catch (error: any) {
      console.error('Error fetching issues:', error);
      setLoadError(error.response?.data?.message || 'Không thể tải danh sách phiếu xuất kho');
      // Preserve existing data so a transient refresh failure does not blank the table.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleDelete = async (issue: WarehouseIssue) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phiếu xuất kho này?')) return;
    try {
      await warehouseIssueService.deleteWarehouseIssue(issue.id);
      alert('Xóa phiếu xuất kho thành công!');
      fetchIssues();
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.receiptHistories() });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa phiếu xuất kho');
    }
  };

  const filteredIssues = issues.filter((issue) => {
    // Period filter
    if (month || year) {
      const date = new Date(issue.ngayXuat);
      if (month && (date.getMonth() + 1) !== month) return false;
      if (year && date.getFullYear() !== year) return false;
    }
    const lines = getWarehouseSlipLines(issue);
    // value — the deprecated header mirror only holds line 1, so filtering on
    // it alone makes every other line unfindable.
    const lineMatch = (needle: string) =>
      lines.some((l) =>
        contains(l.tenSanPham, needle) || contains(l.tenKho, needle) || contains(l.tenLo, needle)
      );
    const search = (filterValues._search || '').toLowerCase().trim();
    if (search) {
      const matchSearch =
        contains(issue.maPhieuXuat, search) ||
        contains(issue.tenNhanVien, search) ||
        lineMatch(search);
      if (!matchSearch) return false;
    }
    if (filterValues.maPhieuXuat && !contains(issue.maPhieuXuat, filterValues.maPhieuXuat.toLowerCase())) return false;
    if (filterValues.tenNhanVien && !contains(issue.tenNhanVien, filterValues.tenNhanVien.toLowerCase())) return false;
    if (filterValues.tenKho && !lines.some((l) => contains(l.tenKho, filterValues.tenKho.toLowerCase()))) return false;
    if (filterValues.tenSanPham && !lines.some((l) => contains(l.tenSanPham, filterValues.tenSanPham.toLowerCase()))) return false;
    return true;
  });
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const paginatedIssues = filteredIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [month, year, filterValues]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), Math.max(1, totalPages)));
  }, [totalPages]);

  const selectedIssueLines = selectedIssue ? getWarehouseSlipLines(selectedIssue) : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Phiếu xuất kho</h2>
        <button
          aria-label="Tạo phiếu xuất kho"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          Tạo phiếu xuất
        </button>
      </div>

      <TableFilter
        filters={issueFilterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm phiếu xuất..."
      />

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={fetchIssues} disabled={loading} className="rounded-md border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100 disabled:opacity-50">
            {loading ? 'Đang tải...' : 'Thử lại'}
          </button>
        </div>
      )}
      {loading && issues.length === 0 && <p className="mb-4 text-sm text-gray-500">Đang tải danh sách phiếu xuất kho...</p>}

      {/* Issues Table — one table row per commodity line; slip-level columns
          are merged vertically with rowSpan, and zebra striping follows the
          slip so all of its lines share one background. Quantities are NEVER
          summed across lines: each line shows its own amount and unit. */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã phiếu</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày xuất</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Nhân viên</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Kho</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Lô</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã kiện</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Sản phẩm</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số lượng xuất</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Chưa có phiếu xuất kho nào
                </td>
              </tr>
            ) : (
              paginatedIssues.map((issue, issueIndex) => {
                const lines = getWarehouseSlipLines(issue);
                const slipBg = issueIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                const slipBorder = issueIndex < paginatedIssues.length - 1 ? 'border-b-2 border-gray-300' : '';
                return (
                  <React.Fragment key={issue.id}>
                    {lines.map((line, lineIndex) => (
                      <tr key={line.id ?? lineIndex} className={`${slipBg} hover:bg-blue-50 transition-colors`}>
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-6 py-4 whitespace-nowrap align-top text-sm font-medium text-gray-900 border-r border-gray-200 ${slipBorder}`}>
                            {issue.maPhieuXuat}
                            {issue.isLocked && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700" title={issue.supplyRequestId ? 'Phiếu liên kết yêu cầu cấp vật tư' : 'Phiếu đã khóa, không thể chỉnh sửa hoặc xóa'}>
                                {issue.supplyRequestId ? 'Đã khóa — yêu cầu cấp vật tư' : 'Đã khóa — chỉ xem/in'}
                              </span>
                            )}
                            {lines.length > 1 && (
                              <span className="ml-1 text-xs font-normal text-gray-400">({lines.length} dòng)</span>
                            )}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-6 py-4 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {new Date(issue.ngayXuat).toLocaleDateString('vi-VN')}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-6 py-4 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {issue.tenNhanVien}
                          </td>
                        )}
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.tenKho || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.tenLo || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          <span className="font-mono font-medium text-blue-700">{line.maKien || '-'}</span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.tenSanPham || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.soLuongThucTe} {line.donViTinh || ''}
                        </td>
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-6 py-4 whitespace-nowrap align-top text-sm text-gray-500 ${slipBorder}`}>
                            <div className="flex items-center gap-1">
              <button
                aria-label="Xem chi tiết phiếu xuất"
                onClick={() => handleViewDetail(issue)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                aria-label="In phiếu xuất"
                                onClick={() => { setPrintIssue(issue); setShowPrintView(true); }}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                                title="In phiếu"
                              >
                                <Printer className="w-5 h-5" />
                              </button>
                              <button
                                onClick={async () => { try { await warehouseIssueService.exportXlsx(issue.id); } catch (e: any) { alert(e.message || 'Lỗi xuất Excel'); } }}
                                aria-label="Xuất Excel"
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                title="Xuất Excel (BM03)"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                              </button>
                              {(issue as any).daIn && (
                                <span className="ml-1 inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-700" title="Đã in/xuất">Đã in</span>
                              )}
                              {!issue.isLocked && (
                                <>
                                  <button
                                    aria-label="Chỉnh sửa phiếu xuất"
                                    onClick={() => setEditingIssue(issue)}
                                    className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors"
                                    title="Chỉnh sửa"
                                  >
                                    <Pencil className="w-5 h-5" />
                                  </button>
                                  <button
                                    aria-label="Xóa phiếu xuất"
                                    onClick={() => handleDelete(issue)}
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredIssues.length)} / {filteredIssues.length} phiếu
            <span className="ml-2 text-xs text-gray-400">({paginatedIssues.reduce((count, issue) => count + getWarehouseSlipLines(issue).length, 0)} dòng)</span>
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
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

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal && !!selectedIssue} onClose={() => setShowDetailModal(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-[1100px] flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <h2 className="text-xl font-bold text-gray-900">Chi tiết phiếu xuất kho</h2>
            <button
              aria-label="Đóng chi tiết phiếu xuất"
              onClick={() => setShowDetailModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {selectedIssue && (
            <div className="overflow-y-auto flex-1 p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-800 font-semibold text-lg">
                <FileText className="h-5 w-5" />
                {selectedIssue.maPhieuXuat}
                {selectedIssue.isLocked && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700" title={selectedIssue.supplyRequestId ? 'Phiếu liên kết yêu cầu cấp vật tư' : 'Phiếu đã khóa bởi quy trình kho'}>
                    Đã khóa — chỉ xem/in
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Ngày xuất</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {new Date(selectedIssue.ngayXuat).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Nhân viên thực hiện</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedIssue.tenNhanVien}</p>
                  <p className="text-xs text-gray-500">{selectedIssue.maNhanVien}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Kho</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{getUniqueSlipField(selectedIssueLines, 'tenKho')}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Lô hàng</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{getUniqueSlipField(selectedIssueLines, 'tenLo')}</p>
                </div>
              </div>

              {selectedIssueLines.length > 0 ? (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium mb-2 block">
                    Chi tiết hàng hóa ({selectedIssueLines.length} dòng)
                  </label>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">STT</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Sản phẩm</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Kho</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Lô</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Mã kiện</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">SL xuất</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">Tồn trước</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">Tồn sau</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedIssueLines.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-gray-100">
                            <td className="px-2 py-1.5 border text-center">{item.stt || idx + 1}</td>
                            <td className="px-2 py-1.5 border">{item.tenSanPham || '-'}</td>
                            <td className="px-2 py-1.5 border">{item.tenKho || '-'}</td>
                            <td className="px-2 py-1.5 border">{item.tenLo || '-'}</td>
                            <td className="px-2 py-1.5 border"><span className="font-mono text-blue-700">{item.maKien || '-'}</span></td>
                            <td className="px-2 py-1.5 border text-right font-semibold text-red-600">{item.soLuongThucTe} {item.donViTinh || ''}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongTruoc ?? '-'}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongSau ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan={5} className="px-2 py-1.5 border text-right">Tổng cộng:</td>
                          <td className="px-2 py-1.5 border text-right text-red-700">
                            {formatActualTotalByUnit(selectedIssueLines)}
                          </td>
                          <td colSpan={2} className="px-2 py-1.5 border"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Sản phẩm</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedIssue.tenSanPham ?? 'N/A'}</p>
                </div>
              )}

              {selectedIssue.ghiChu && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <label className="text-xs text-yellow-600 uppercase font-medium">Ghi chú</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedIssue.ghiChu}</p>
                </div>
              )}

              <div className="text-xs text-gray-400 text-right">
                Tạo lúc: {new Date(selectedIssue.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>
            </div>
          )}

          <div className="flex justify-end px-6 py-4 border-t border-gray-200 shrink-0">
            <button
              aria-label="Đóng chi tiết phiếu xuất"
              onClick={() => setShowDetailModal(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {showPrintView && printIssue && (
        <WarehouseSlipPrintView
          type="issue"
          maPhieu={printIssue.maPhieuXuat}
          ngay={new Date(printIssue.ngayXuat).toLocaleDateString('vi-VN')}
          tenNhanVien={printIssue.tenNhanVien}
          maNhanVien={printIssue.maNhanVien}
          ghiChu={printIssue.ghiChu ?? undefined}
          lyDoXuatKho={(printIssue as any).lyDoXuatKho ?? undefined}
          nguoiDeNghi={(printIssue as any).nguoiDeNghi ?? undefined}
          boPhan={(printIssue as any).boPhan ?? undefined}
          items={getWarehouseSlipLines(printIssue)}
          onClose={() => { setShowPrintView(false); setPrintIssue(null); }}
          onMarkPrinted={() => { warehouseIssueService.markPrinted(printIssue.id).catch(()=>{}); }}
        />
      )}

      <CreateWarehouseIssueModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchIssues();
          queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
        }}
      />

      <EditWarehouseIssueModal
        isOpen={!!editingIssue}
        issue={editingIssue}
        onClose={() => setEditingIssue(null)}
        onSuccess={() => {
          fetchIssues();
          queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
        }}
      />
    </div>
  );
};

export default WarehouseIssueTab;
