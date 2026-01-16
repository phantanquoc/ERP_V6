import React, { useState, useEffect } from 'react';
import { X, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { processService, Process } from '../services/processService';

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

  useEffect(() => {
    if (isOpen) {
      fetchProcesses();
    }
  }, [isOpen, currentPage, searchTerm]);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const response = await processService.getAllProcesses(currentPage, 10, searchTerm);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
          <h2 className="text-2xl font-bold text-white">Danh sách quy trình</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã, tên quy trình, nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Đang tải...</div>
            </div>
          ) : processes.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Không có dữ liệu</div>
            </div>
          ) : (
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold text-gray-800">STT</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold text-gray-800">Mã quy trình</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold text-gray-800">Tên quy trình</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold text-gray-800">Loại quy trình</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold text-gray-800">Người tạo</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold text-gray-800">Ngày tạo</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-bold text-gray-800">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((process, index) => (
                  <tr key={process.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">
                      {(currentPage - 1) * 10 + index + 1}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-blue-600">
                      {process.maQuyTrinh}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">{process.tenQuyTrinh}</td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">{process.loaiQuyTrinh}</td>
                    <td className="border border-gray-300 px-4 py-3 text-sm">{process.tenNhanVien}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm">
                      {new Date(process.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetails(process)}
                        className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && processes.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Trang {currentPage} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Process Details Modal */}
      {selectedProcess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Details Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-teal-600">
              <h3 className="text-xl font-bold text-white">Chi tiết quy trình</h3>
              <button
                onClick={() => setSelectedProcess(null)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Details Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã quy trình</label>
                    <div className="text-base font-semibold text-blue-600">{selectedProcess.maQuyTrinh}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại quy trình</label>
                    <div className="text-base">{selectedProcess.loaiQuyTrinh}</div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên quy trình</label>
                    <div className="text-base">{selectedProcess.tenQuyTrinh}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Người tạo</label>
                    <div className="text-base">{selectedProcess.tenNhanVien} ({selectedProcess.msnv})</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tạo</label>
                    <div className="text-base">{new Date(selectedProcess.createdAt).toLocaleString('vi-VN')}</div>
                  </div>
                </div>

                {/* Flowchart Information */}
                {selectedProcess.flowchart && selectedProcess.flowchart.sections && selectedProcess.flowchart.sections.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Sơ đồ quy trình</h4>
                    <div className="space-y-4">
                      {selectedProcess.flowchart.sections.map((section, idx) => (
                        <div key={section.id || idx} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                          <div className="font-medium text-gray-800 mb-2">
                            Phân đoạn {section.stt || idx + 1}: {section.phanDoan}
                          </div>
                          {section.tenPhanDoan && (
                            <div className="text-sm text-gray-600 mb-1">
                              <span className="font-medium">Tên phân đoạn:</span> {section.tenPhanDoan}
                            </div>
                          )}
                          {section.noiDungCongViec && (
                            <div className="text-sm text-gray-600 mb-1">
                              <span className="font-medium">Nội dung công việc:</span> {section.noiDungCongViec}
                            </div>
                          )}
                          {section.costs && section.costs.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm font-medium text-gray-700 mb-1">Chi phí:</div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs border border-gray-300">
                                  <thead className="bg-gray-200">
                                    <tr>
                                      <th className="border border-gray-300 px-2 py-1">Loại chi phí</th>
                                      <th className="border border-gray-300 px-2 py-1">Tên chi phí</th>
                                      <th className="border border-gray-300 px-2 py-1">Đơn vị</th>
                                      <th className="border border-gray-300 px-2 py-1">Định mức</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {section.costs.map((cost, costIdx) => (
                                      <tr key={cost.id || costIdx} className="bg-white">
                                        <td className="border border-gray-300 px-2 py-1">{cost.loaiChiPhi}</td>
                                        <td className="border border-gray-300 px-2 py-1">{cost.tenChiPhi || '-'}</td>
                                        <td className="border border-gray-300 px-2 py-1">{cost.donVi || '-'}</td>
                                        <td className="border border-gray-300 px-2 py-1">
                                          {cost.dinhMucLaoDong ? `${cost.dinhMucLaoDong} ${cost.donViDinhMucLaoDong || ''}` : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Details Footer */}
            <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedProcess(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessListModal;

