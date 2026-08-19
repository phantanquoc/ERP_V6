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
import { TINH_TRANG_OPTIONS } from '../constants/warehouseCatalogs';

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
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', maPhieuXuat: '', tenNhanVien: '', nguoiDeNghi: '', boPhan: '', tenKho: '', tenSanPham: '', tinhTrang: '', daIn: '', fromNgay: '', toNgay: '' });
  const [sortKey, setSortKey] = useState<'ngayXuat' | 'maPhieuXuat'>('ngayXuat');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const issueFilterFields: FilterField[] = [
    { key: 'maPhieuXuat', label: 'Mã phiếu', type: 'text' },
    { key: 'tenNhanVien', label: 'Nhân viên', type: 'text' },
    { key: 'nguoiDeNghi', label: 'Người đề nghị', type: 'text' },
    { key: 'boPhan', label: 'Bộ phận', type: 'text' },
    { key: 'tenKho', label: 'Kho', type: 'text' },
    { key: 'tenSanPham', label: 'Sản phẩm', type: 'text' },
    { key: 'tinhTrang', label: 'Tình trạng', type: 'select', options: [{ value: '', label: 'Tất cả' }, ...[...TINH_TRANG_OPTIONS].map((o) => ({ value: o.value, label: o.label })) ] },
    { key: 'daIn', label: 'Đã in', type: 'select', options: [{ value: '', label: 'Tất cả' }, { value: 'true', label: 'Đã in' }, { value: 'false', label: 'Chưa in' }] },
    { key: 'fromNgay', label: 'Từ ngày', type: 'text', placeholder: 'YYYY-MM-DD' },
    { key: 'toNgay', label: 'Đến ngày', type: 'text', placeholder: 'YYYY-MM-DD' },
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
    const lines = getWarehouseSlipLines(issue) as any[];
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
        contains((issue as any).nguoiDeNghi, search) ||
        contains((issue as any).boPhan, search) ||
        lineMatch(search);
      if (!matchSearch) return false;
    }
    if (filterValues.maPhieuXuat && !contains(issue.maPhieuXuat, filterValues.maPhieuXuat.toLowerCase())) return false;
    if (filterValues.tenNhanVien && !contains(issue.tenNhanVien, filterValues.tenNhanVien.toLowerCase())) return false;
    if (filterValues.nguoiDeNghi && !contains((issue as any).nguoiDeNghi, filterValues.nguoiDeNghi.toLowerCase())) return false;
    if (filterValues.boPhan && !contains((issue as any).boPhan, filterValues.boPhan.toLowerCase())) return false;
    if (filterValues.tenKho && !lines.some((l) => contains(l.tenKho, filterValues.tenKho.toLowerCase()))) return false;
    if (filterValues.tenSanPham && !lines.some((l) => contains(l.tenSanPham, filterValues.tenSanPham.toLowerCase()))) return false;
    if (filterValues.tinhTrang && !lines.some((l) => contains((l as any).tinhTrang, filterValues.tinhTrang.toLowerCase()))) return false;
    if (filterValues.daIn) {
      const isPrinted = !!(issue as any).daIn;
      if (filterValues.daIn === 'true' && !isPrinted) return false;
      if (filterValues.daIn === 'false' && isPrinted) return false;
    }
    if (filterValues.fromNgay) {
      const from = new Date(filterValues.fromNgay); from.setHours(0,0,0,0);
      if (new Date(issue.ngayXuat) < from) return false;
    }
    if (filterValues.toNgay) {
      const to = new Date(filterValues.toNgay); to.setHours(23,59,59,999);
      if (new Date(issue.ngayXuat) > to) return false;
    }
    return true;
  });
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'maPhieuXuat') return dir * (a.maPhieuXuat.localeCompare(b.maPhieuXuat));
    return dir * (new Date(a.ngayXuat).getTime() - new Date(b.ngayXuat).getTime());
  });
  const totalPages = Math.ceil(sortedIssues.length / itemsPerPage);
  const paginatedIssues = sortedIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-gray-500">Sắp xếp:</span>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)} className="px-2 py-1 border border-gray-300 rounded text-xs">
          <option value="ngayXuat">Ngày xuất</option>
          <option value="maPhieuXuat">Mã phiếu</option>
        </select>
        <button type="button" onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')} className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50">{sortDir === 'asc' ? '↑ Tăng' : '↓ Giảm'}</button>
        <span className="text-xs text-gray-400 ml-2">{sortedIssues.length} phiếu {filteredIssues.length !== issues.length && `· lọc từ ${issues.length}`}</span>
        <button type="button" onClick={async () => {
          const ids = sortedIssues.map((r) => r.id);
          if (ids.length === 0) { alert('Không có phiếu để xuất'); return; }
          if (!confirm(`Xuất tổng hợp ${ids.length} phiếu đang lọc?`)) return;
          for (const id of ids) { try { await warehouseIssueService.exportXlsx(id); } catch {} }
        }} className="ml-auto px-3 py-1.5 text-xs border border-blue-300 text-blue-700 rounded hover:bg-blue-50">Xuất tổng hợp (đang lọc)</button>
      </div>

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
        <table className="w-full min-w-[1050px] border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã phiếu</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày xuất</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Nhân viên</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Người đề nghị</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Kho</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Lô</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã kiện</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Sản phẩm</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số lượng</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
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
                    {lines.map((line: any, lineIndex) => {
                      const isOver = line.soLuongYeuCau != null && line.soLuongThucTe != null && line.soLuongYeuCau !== line.soLuongThucTe && (() => { const p = Number(line.soLuongYeuCau), a = Number(line.soLuongThucTe); if (!p) return a !== 0; return Math.abs(a-p)/Math.abs(p) > 0.1; })();
                      const rowHl = isOver ? 'bg-amber-50 hover:bg-amber-100' : `${slipBg} hover:bg-blue-50`;
                      return (
                      <tr key={line.id ?? lineIndex} className={`${rowHl} transition-colors`}>
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm font-medium text-gray-900 border-r border-gray-200 ${slipBorder}`}>
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
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {new Date(issue.ngayXuat).toLocaleDateString('vi-VN')}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {issue.tenNhanVien}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {(issue as any).nguoiDeNghi || '—'}
                          </td>
                        )}
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.tenKho || '-'}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.tenLo || '-'}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          <span className="font-mono font-medium text-blue-700">{line.maKien || '-'}</span>
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.tenSanPham || '-'}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          <span>{line.soLuongThucTe} {line.donViTinh || ''}</span>
                          {isOver && <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700" title={`KH ${line.soLuongYeuCau} → TT ${line.soLuongThucTe}`}>⚠ KH {line.soLuongYeuCau} → TT {line.soLuongThucTe}</span>}
                        </td>
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-4 py-3 whitespace-nowrap align-top text-sm text-gray-500 ${slipBorder}`}>
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
                    );})}
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
                  <label className="text-xs text-gray-500 uppercase font-medium">Người đề nghị</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{(selectedIssue as any).nguoiDeNghi || '—'}</p>
                  {(selectedIssue as any).boPhan && <p className="text-xs text-gray-500">{(selectedIssue as any).boPhan}</p>}
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Bộ phận</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{(selectedIssue as any).boPhan || '—'}</p>
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
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                  <label className="text-xs text-orange-600 uppercase font-medium">Lý do xuất</label>
                  <p className="text-sm text-gray-700 mt-1">{(selectedIssue as any).lyDoXuatKho || '—'}</p>
                </div>
              </div>

              {selectedIssueLines.length > 0 ? (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium mb-2 block">
                    Chi tiết hàng hóa ({selectedIssueLines.length} dòng) — 14 cột BM03
                  </label>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">TT</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Mã hàng</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Loại Kho</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Tên hàng</th>
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">Số lô KH</th>
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">Số lô TT</th>
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">Số kiện KH</th>
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">Số kiện TT</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Tình trạng</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Quy cách</th>
                          <th scope="col" className="px-2 py-1.5 text-center text-xs font-medium text-gray-600 border">ĐV</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">SL KH</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">SL TT</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Ghi chú</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">Tồn trước</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">Tồn sau</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedIssueLines.map((item: any, idx) => (
                          <tr key={item.id || idx} className="hover:bg-gray-100">
                            <td className="px-2 py-1.5 border text-center">{item.stt || idx + 1}</td>
                            <td className="px-2 py-1.5 border font-mono text-xs">{item.maKien || item.lotProductId?.slice(-6) || '-'}</td>
                            <td className="px-2 py-1.5 border">{item.tenKho || '-'}</td>
                            <td className="px-2 py-1.5 border">{item.tenSanPham || '-'}</td>
                            <td className="px-2 py-1.5 border text-center">{item.soLoKeHoach ?? '-'}</td>
                            <td className="px-2 py-1.5 border text-center">{item.soLoThucTe ?? item.tenLo ?? '-'}</td>
                            <td className="px-2 py-1.5 border font-mono text-xs">{(() => { try { const a = JSON.parse(item.soKienKeHoach); if (Array.isArray(a)) return a.join(', '); } catch {} return item.soKienKeHoach ?? '-'; })()}</td>
                            <td className="px-2 py-1.5 border font-mono text-xs">{(() => { try { const a = JSON.parse(item.soKienThucTe); if (Array.isArray(a)) return a.join(', '); } catch {} return item.soKienThucTe ?? item.maKien ?? '-'; })()}</td>
                            <td className="px-2 py-1.5 border">{item.tinhTrang ?? '-'}</td>
                            <td className="px-2 py-1.5 border">{item.quyCach ?? '-'}</td>
                            <td className="px-2 py-1.5 border text-center">{item.donViTinh || '-'}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongYeuCau ?? item.soLuongThucTe}</td>
                            <td className="px-2 py-1.5 border text-right font-semibold text-red-600">{item.soLuongThucTe} {item.donViTinh || ''}</td>
                            <td className="px-2 py-1.5 border">{item.ghiChu || '-'}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongTruoc ?? '-'}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongSau ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan={11} className="px-2 py-1.5 border text-right">Tổng cộng:</td>
                          <td className="px-2 py-1.5 border text-right text-red-700">
                            {formatActualTotalByUnit(selectedIssueLines)}
                          </td>
                          <td colSpan={3} className="px-2 py-1.5 border"></td>
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
                  <label className="text-xs text-yellow-600 uppercase font-medium">Ghi chú phiếu</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedIssue.ghiChu}</p>
                </div>
              )}

              <div className="text-xs text-gray-400 text-right">
                Tạo lúc: {new Date(selectedIssue.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>
            </div>
          )}

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 shrink-0">
            <button
              onClick={() => { setPrintIssue(selectedIssue); setShowPrintView(true); }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              In phiếu
            </button>
            <button
              onClick={async () => { try { await warehouseIssueService.exportXlsx(selectedIssue!.id); } catch (e: any) { alert(e.message || 'Lỗi xuất Excel'); } }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Xuất Excel
            </button>
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
