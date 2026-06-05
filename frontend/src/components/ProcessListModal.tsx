import React, { useState, useEffect } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight, FileText, Printer, X } from 'lucide-react';
import { processService, Process } from '../services/processService';
import { ModalForm } from './ModalForm';
import Modal from './Modal';
import { SERVER_BASE_URL } from '../config/api';

interface ProcessListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProcessListModal: React.FC<ProcessListModalProps> = ({ isOpen, onClose }) => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);

  const getFullFileUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${SERVER_BASE_URL}${url}`;
  };

  const getFileName = (url: string) => {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return decodeURIComponent(filename.replace(/-\d+-\d+(?=\.)/, ''));
  };

  const hasDisplayValue = (value: unknown) => value !== undefined && value !== null && value !== '';
  const formatDisplayValue = (value: unknown) => hasDisplayValue(value) ? String(value) : '-';

  const flowchartCostColumns = [
    {
      key: 'loaiChiPhi',
      label: 'Loại chi phí',
      render: (cost: NonNullable<Process['flowchart']>['sections'][number]['costs'][number]) => formatDisplayValue(cost.loaiChiPhi),
    },
    {
      key: 'tenChiPhi',
      label: 'Tên chi phí',
      render: (cost: NonNullable<Process['flowchart']>['sections'][number]['costs'][number]) => formatDisplayValue(cost.tenChiPhi),
    },
    {
      key: 'donVi',
      label: 'Đơn vị',
      render: (cost: NonNullable<Process['flowchart']>['sections'][number]['costs'][number]) => formatDisplayValue(cost.donVi),
    },
    {
      key: 'dinhMucLaoDong',
      label: 'Định mức',
      hasValue: (cost: NonNullable<Process['flowchart']>['sections'][number]['costs'][number]) => hasDisplayValue(cost.dinhMucLaoDong),
      render: (cost: NonNullable<Process['flowchart']>['sections'][number]['costs'][number]) => hasDisplayValue(cost.dinhMucLaoDong) ? `${cost.dinhMucLaoDong} ${cost.donViDinhMucLaoDong || ''}`.trim() : '-',
    },
  ];

  const handlePrintFile = (url: string) => {
    const printWindow = window.open(getFullFileUrl(url), '_blank');
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProcesses();
    }
  }, [isOpen, currentPage, searchTerm]);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const response = await processService.getAllProcesses(currentPage, 10, searchTerm, true);
      setProcesses(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching processes:', error);
      alert('Lỗi khi tải danh sách quy trình');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProcesses();
  };

  const handleViewDetails = async (process: Process) => {
    try {
      const response = await processService.getProcessById(process.id);
      setSelectedProcess(response.data);
    } catch (error) {
      console.error('Error fetching process details:', error);
      alert('Lỗi khi tải chi tiết quy trình');
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <ModalForm isOpen={isOpen} onClose={onClose} title="Danh sách quy trình" maxWidth="6xl">
      {/* Search Bar */}
      <div className="-mx-6 -mt-5 px-6 py-3 border-b border-gray-200 bg-gray-50 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên quy trình, nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Tìm kiếm
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Đang tải...</div>
      ) : processes.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Không có dữ liệu</div>
      ) : (
        <table className="min-w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-blue-50">
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">STT</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Mã quy trình</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Tên quy trình</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Loại quy trình</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Người tạo</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Ngày tạo</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Files</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((process, index) => (
              <tr key={process.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                <td className="border border-gray-300 px-4 py-3 text-center">{(currentPage - 1) * 10 + index + 1}</td>
                <td className="border border-gray-300 px-4 py-3 text-center font-medium text-blue-600">{process.maQuyTrinh}</td>
                <td className="border border-gray-300 px-4 py-3">{process.tenQuyTrinh}</td>
                <td className="border border-gray-300 px-4 py-3">{process.loaiQuyTrinh}</td>
                <td className="border border-gray-300 px-4 py-3">{process.tenNhanVien}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{new Date(process.createdAt).toLocaleDateString('vi-VN')}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  {process.files && process.files.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {process.files.map((fileUrl, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => setPreviewFileUrl(fileUrl)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
                          title={getFileName(fileUrl)}
                        >
                          <FileText className="w-3 h-3" />
                          {fIdx + 1}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center">
                  <button onClick={() => handleViewDetails(process)}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs">
                    <Eye className="h-3.5 w-3.5 mr-1" />Xem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {!loading && processes.length > 0 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-600">Trang {currentPage} / {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </ModalForm>

    {/* Process Details sub-modal */}
    <ModalForm
      isOpen={!!selectedProcess}
      onClose={() => setSelectedProcess(null)}
      title="Chi tiết quy trình"
      maxWidth="4xl"
      footer={
        <div className="flex justify-end">
          <button onClick={() => setSelectedProcess(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Đóng
          </button>
        </div>
      }
    >
      {selectedProcess && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mã quy trình</label>
              <div className="text-sm font-semibold text-blue-600">{selectedProcess.maQuyTrinh}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Loại quy trình</label>
              <div className="text-sm">{selectedProcess.loaiQuyTrinh}</div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Tên quy trình</label>
              <div className="text-sm">{selectedProcess.tenQuyTrinh}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Người tạo</label>
              <div className="text-sm">{selectedProcess.tenNhanVien} ({selectedProcess.msnv})</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ngày tạo</label>
              <div className="text-sm">{new Date(selectedProcess.createdAt).toLocaleString('vi-VN')}</div>
            </div>
          </div>

          {/* Files đính kèm */}
          {selectedProcess.files && selectedProcess.files.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">File đính kèm</h4>
              <div className="space-y-2">
                {selectedProcess.files.map((fileUrl, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate flex-1">{getFileName(fileUrl)}</span>
                    <button
                      onClick={() => setPreviewFileUrl(fileUrl)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Xem
                    </button>
                    <button
                      onClick={() => handlePrintFile(fileUrl)}
                      className="text-green-600 hover:text-green-800 text-xs font-medium"
                    >
                      In
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedProcess.flowchart?.sections && selectedProcess.flowchart.sections.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Sơ đồ quy trình</h4>
              <div className="space-y-3">
                {selectedProcess.flowchart.sections.map((section, idx) => (
                  <div key={section.id || idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="font-medium text-sm text-gray-800 mb-2">
                      Phân đoạn {section.stt || idx + 1}: {section.phanDoan}
                    </div>
                    {section.tenPhanDoan && <div className="text-xs text-gray-600 mb-1"><span className="font-medium">Tên phân đoạn:</span> {section.tenPhanDoan}</div>}
                    {section.noiDungCongViec && <div className="text-xs text-gray-600 mb-2"><span className="font-medium">Nội dung công việc:</span> {section.noiDungCongViec}</div>}
                    {section.costs && section.costs.length > 0 && (() => {
                      const visibleColumns = flowchartCostColumns.filter(column =>
                        section.costs.some(cost => column.hasValue ? column.hasValue(cost) : hasDisplayValue(cost[column.key as keyof typeof cost]))
                      );
                      if (visibleColumns.length === 0) return null;

                      return (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-700 mb-1">Chi phí:</div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-xs border border-gray-300">
                              <thead className="bg-gray-200">
                                <tr>
                                  {visibleColumns.map(column => (
                                    <th key={column.key} className="border border-gray-300 px-2 py-1">{column.label}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {section.costs.map((cost, costIdx) => (
                                  <tr key={cost.id || costIdx} className="bg-white">
                                    {visibleColumns.map(column => (
                                      <td key={column.key} className="border border-gray-300 px-2 py-1">
                                        {column.render(cost)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ModalForm>

    {/* File Preview Modal */}
    <Modal isOpen={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} showBackdrop closeOnBackdrop={true}>
      {previewFileUrl && (
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
            <h3 className="text-sm font-medium text-gray-700 truncate flex-1">{getFileName(previewFileUrl)}</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => handlePrintFile(previewFileUrl)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                <Printer className="w-4 h-4" />In
              </button>
              <button onClick={() => setPreviewFileUrl(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {previewFileUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe src={`${getFullFileUrl(previewFileUrl)}#toolbar=0`} className="w-full h-full border-0" title="PDF Preview" />
            ) : previewFileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
              <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                <img src={getFullFileUrl(previewFileUrl)} alt="Preview" className="max-w-full max-h-full object-contain" onContextMenu={(e) => e.preventDefault()} draggable={false} />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Không thể xem trước file này</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
    </>
  );
};

export default ProcessListModal;
