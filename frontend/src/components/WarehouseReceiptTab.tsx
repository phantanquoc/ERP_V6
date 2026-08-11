import React, { useCallback, useEffect, useState } from 'react';
import { Plus, FileText, Eye, Pencil, Trash2, Printer } from 'lucide-react';
import Modal from './Modal';
import WarehouseSlipPrintView from './WarehouseSlipPrintView';
import { formatActualTotalByUnit } from '../utils/warehouseSlipTotals';
import EditWarehouseReceiptModal from './EditWarehouseReceiptModal';
import CreateWarehouseReceiptModal from './CreateWarehouseReceiptModal';
import { useQueryClient } from '@tanstack/react-query';
import warehouseReceiptService, { WarehouseReceipt } from '../services/warehouseReceiptService';
import TableFilter, { FilterField } from './TableFilter';
import { warehouseKeys } from '../hooks';
import { getWarehouseSlipLines, normalizeWarehouseListResponse } from '../utils/warehouseSlipLines';

interface WarehouseReceiptTabProps {
  month?: number;
  year?: number;
}

/** Case-insensitive substring test that tolerates undefined haystacks. */
function contains(haystack: string | undefined | null, needle: string): boolean {
  return (haystack || '').toLowerCase().includes(needle);
}

const WarehouseReceiptTab: React.FC<WarehouseReceiptTabProps> = ({ month, year }) => {
  const queryClient = useQueryClient();
  const [receipts, setReceipts] = useState<WarehouseReceipt[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<WarehouseReceipt | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<WarehouseReceipt | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<WarehouseReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', maPhieuNhap: '', tenNhanVien: '', tenKho: '', tenSanPham: '' });
  const receiptFilterFields: FilterField[] = [
    { key: 'maPhieuNhap', label: 'Mã phiếu', type: 'text' },
    { key: 'tenNhanVien', label: 'Nhân viên', type: 'text' },
    { key: 'tenKho', label: 'Kho', type: 'text' },
    { key: 'tenSanPham', label: 'Sản phẩm', type: 'text' },
  ];

  const handleViewDetail = (receipt: WarehouseReceipt) => {
    setSelectedReceipt(receipt);
    setShowDetailModal(true);
  };

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await warehouseReceiptService.getAllWarehouseReceipts() as any;
      setReceipts(normalizeWarehouseListResponse<WarehouseReceipt>(response?.data));
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      setLoadError(error.response?.data?.message || 'Không thể tải danh sách phiếu nhập kho');
      // Keep the previous rows: a failed refresh must not look like an empty warehouse.
    } finally {
      setLoading(false);
    }
  }, []);

  /** Stock figures live in React Query; invalidating is enough to refresh them. */
  const refreshInventoryCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
    queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
    queryClient.invalidateQueries({ queryKey: warehouseKeys.receiptHistories() });
  }, [queryClient]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [month, year, filterValues]);

  const handleDelete = async (receipt: WarehouseReceipt) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phiếu nhập kho này?')) return;
    try {
      await warehouseReceiptService.deleteWarehouseReceipt(receipt.id);
      alert('Xóa phiếu nhập kho thành công!');
      fetchReceipts();
      refreshInventoryCaches();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa phiếu nhập kho');
    }
  };

  const filteredReceipts = receipts.filter((r) => {
    // Period filter
    if (month || year) {
      const date = new Date(r.ngayNhap);
      if (month && (date.getMonth() + 1) !== month) return false;
      if (year && date.getFullYear() !== year) return false;
    }
    const lines = getWarehouseSlipLines(r);
    // Line-level matching: a slip is found when ANY of its lines carries the
    // value — the deprecated header mirror only holds line 1, so filtering on
    // it alone makes every other line unfindable.
    const lineMatch = (needle: string) =>
      lines.some((l) =>
        contains(l.tenSanPham, needle) || contains(l.tenKho, needle) || contains(l.tenLo, needle)
      );
    const search = (filterValues._search || '').toLowerCase().trim();
    if (search) {
      const matchSearch =
        contains(r.maPhieuNhap, search) ||
        contains(r.tenNhanVien, search) ||
        contains(r.maNhanVien, search) ||
        lineMatch(search);
      if (!matchSearch) return false;
    }
    if (filterValues.maPhieuNhap && !contains(r.maPhieuNhap, filterValues.maPhieuNhap.toLowerCase())) return false;
    if (filterValues.tenNhanVien && !contains(r.tenNhanVien, filterValues.tenNhanVien.toLowerCase())) return false;
    if (filterValues.tenKho && !lines.some((l) => contains(l.tenKho, filterValues.tenKho.toLowerCase()))) return false;
    if (filterValues.tenSanPham && !lines.some((l) => contains(l.tenSanPham, filterValues.tenSanPham.toLowerCase()))) return false;
    return true;
  });

  // Pagination counts SLIPS, not table rows — a two-line slip must never be
  // split across pages. Pages with multi-line slips simply show extra rows.
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
  const paginatedReceipts = filteredReceipts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const selectedReceiptLines = selectedReceipt ? getWarehouseSlipLines(selectedReceipt) : [];

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), Math.max(1, totalPages)));
  }, [totalPages]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Phiếu nhập kho</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          Tạo phiếu nhập
        </button>
      </div>

      <TableFilter
        filters={receiptFilterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm phiếu nhập..."
      />

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={fetchReceipts} disabled={loading} className="rounded-md border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100 disabled:opacity-50">
            {loading ? 'Đang tải...' : 'Thử lại'}
          </button>
        </div>
      )}
      {loading && receipts.length === 0 && <p className="mb-4 text-sm text-gray-500">Đang tải danh sách phiếu nhập kho...</p>}

      {/* Receipts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
          <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã phiếu</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày nhập</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Nhân viên</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Kho</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Lô</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Sản phẩm</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số lượng nhập</th>
              <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Chưa có phiếu nhập kho nào
                </td>
              </tr>
            ) : (
              paginatedReceipts.map((receipt, receiptIndex) => {
                const lines = getWarehouseSlipLines(receipt);
                const slipBg = receiptIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                const slipBorder = receiptIndex < paginatedReceipts.length - 1 ? 'border-b-2 border-gray-300' : '';
                return (
                  <React.Fragment key={receipt.id}>
                    {lines.map((line, lineIndex) => (
                      <tr key={line.id ?? lineIndex} className={`${slipBg} hover:bg-blue-50 transition-colors`}>
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-6 py-4 whitespace-nowrap align-top text-sm font-medium text-gray-900 border-r border-gray-200 ${slipBorder}`}>
                            {receipt.maPhieuNhap}
                            {lines.length > 1 && (
                              <span className="ml-1 text-xs font-normal text-gray-400">({lines.length} dòng)</span>
                            )}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-6 py-4 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {new Date(receipt.ngayNhap).toLocaleDateString('vi-VN')}
                          </td>
                        )}
                        {lineIndex === 0 && (
                          <td rowSpan={lines.length} className={`px-6 py-4 whitespace-nowrap align-top text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                            {receipt.tenNhanVien}
                          </td>
                        )}
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.tenKho || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200 ${slipBorder}`}>
                          {line.tenLo || '-'}
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
                                onClick={() => handleViewDetail(receipt)}
                                aria-label="Xem chi tiết"
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => { setPrintReceipt(receipt); setShowPrintView(true); }}
                                aria-label="In phiếu"
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                                title="In phiếu"
                              >
                                <Printer className="w-5 h-5" />
                              </button>
                              {!receipt.isLocked && (
                                <>
                                  <button
                                    onClick={() => setEditingReceipt(receipt)}
                                    aria-label="Chỉnh sửa"
                                    className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors"
                                    title="Chỉnh sửa"
                                  >
                                    <Pencil className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(receipt)}
                                    aria-label="Xóa"
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              {receipt.isLocked && (
                                <span className="ml-1 inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600" title="Phiếu đã khóa, không thể chỉnh sửa hoặc xóa">
                                  Đã khóa
                                </span>
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
            Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredReceipts.length)} / {filteredReceipts.length} mục
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
      <Modal isOpen={showDetailModal && !!selectedReceipt} onClose={() => setShowDetailModal(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-[1100px] flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Chi tiết phiếu nhập kho</h2>
              <button
                type="button"
                aria-label="Đóng chi tiết phiếu nhập"
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          <div className="overflow-y-auto flex-1 p-6">
            {selectedReceipt && (<>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800 font-semibold text-lg">
                <FileText className="h-5 w-5" />
                {selectedReceipt.maPhieuNhap}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Ngày nhập</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {new Date(selectedReceipt.ngayNhap).toLocaleDateString('vi-VN', {
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
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReceipt.tenNhanVien}</p>
                  <p className="text-xs text-gray-500">{selectedReceipt.maNhanVien}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Kho</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {[...new Set(selectedReceiptLines.map((item) => item.tenKho).filter(Boolean))].join(', ') || '-'}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Lô hàng</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {[...new Set(selectedReceiptLines.map((item) => item.tenLo).filter(Boolean))].join(', ') || '-'}
                  </p>
                </div>
              </div>

                    {selectedReceiptLines.length > 0 ? (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium mb-2 block">
                    Chi tiết hàng hóa ({selectedReceiptLines.length} dòng)
                  </label>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">STT</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Sản phẩm</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Kho</th>
                          <th scope="col" className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border">Lô</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">SL nhập</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">Tồn trước</th>
                          <th scope="col" className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border">Tồn sau</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReceiptLines.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-gray-100">
                            <td className="px-2 py-1.5 border text-center">{item.stt || idx + 1}</td>
                            <td className="px-2 py-1.5 border">{item.tenSanPham || '-'}</td>
                            <td className="px-2 py-1.5 border">{item.tenKho || '-'}</td>
                            <td className="px-2 py-1.5 border">{item.tenLo || '-'}</td>
                            <td className="px-2 py-1.5 border text-right font-semibold text-green-600">{item.soLuongThucTe} {item.donViTinh || ''}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongTruoc ?? '-'}</td>
                            <td className="px-2 py-1.5 border text-right">{item.soLuongSau ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan={4} className="px-2 py-1.5 border text-right">Tổng cộng:</td>
                          <td className="px-2 py-1.5 border text-right text-green-700">
                            {formatActualTotalByUnit(selectedReceiptLines)}
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
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReceipt.tenSanPham ?? 'N/A'}</p>
                </div>
              )}

              {selectedReceipt.mucDich && (
                <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                  <label className="text-xs text-purple-600 uppercase font-medium">Mục đích</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedReceipt.mucDich}</p>
                </div>
              )}

              {selectedReceipt.ghiChu && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <label className="text-xs text-yellow-600 uppercase font-medium">Ghi chú</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedReceipt.ghiChu}</p>
                </div>
              )}

              <div className="text-xs text-gray-400 text-right">
                Tạo lúc: {new Date(selectedReceipt.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>
            </>)}
          </div>
        </div>
      </Modal>

      {/* Create receipt uses the standalone multi-line modal. */}
      <CreateWarehouseReceiptModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          fetchReceipts();
          refreshInventoryCaches();
        }}
      />

      {showPrintView && printReceipt && (
        <WarehouseSlipPrintView
          type="receipt"
          maPhieu={printReceipt.maPhieuNhap}
          ngay={new Date(printReceipt.ngayNhap).toLocaleDateString('vi-VN')}
          tenNhanVien={printReceipt.tenNhanVien}
          maNhanVien={printReceipt.maNhanVien}
          ghiChu={printReceipt.ghiChu}
          mucDich={printReceipt.mucDich ?? undefined}
          items={getWarehouseSlipLines(printReceipt)}
          onClose={() => { setShowPrintView(false); setPrintReceipt(null); }}
        />
      )}

      <EditWarehouseReceiptModal
        isOpen={!!editingReceipt}
        receipt={editingReceipt}
        onClose={() => setEditingReceipt(null)}
        onSuccess={() => {
          fetchReceipts();
          refreshInventoryCaches();
        }}
      />
    </div>
  );
};

export default WarehouseReceiptTab;

