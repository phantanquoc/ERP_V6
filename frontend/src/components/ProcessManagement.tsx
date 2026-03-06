import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, X, FileText, Upload, Download } from 'lucide-react';
import processService, { Process, CreateProcessData, ProcessFlowchartSection, ProcessFlowchartCost } from '../services/processService';
import { useAuth } from '../contexts/AuthContext';

interface ProcessManagementProps {
  mode?: 'full' | 'standard-only' | 'production';
  // 'full' = đầy đủ CRUD (Quality Process)
  // 'standard-only' = chỉ xem và tạo định mức (Production Management - tab 1)
  // 'production' = xem và nhập dữ liệu sản xuất (Production Management - tab 2)
}

const ProcessManagement: React.FC<ProcessManagementProps> = ({ mode = 'full' }) => {
  const { user } = useAuth(); // Get current logged-in user
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStandardModalOpen, setIsStandardModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [viewingProcess, setViewingProcess] = useState<Process | null>(null);
  const [standardProcess, setStandardProcess] = useState<Process | null>(null);

  const [formData, setFormData] = useState<CreateProcessData>({
    msnv: '',
    tenNhanVien: '',
    tenQuyTrinh: '',
    loaiQuyTrinh: '',
  });

  // Flowchart sections state
  const [flowchartSections, setFlowchartSections] = useState<ProcessFlowchartSection[]>([]);

  useEffect(() => {
    fetchProcesses();
  }, [searchTerm]);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const response = await processService.getAllProcesses(1, 1000, searchTerm);
      setProcesses(response.data);
    } catch (error) {
      console.error('Error fetching processes:', error);
      alert('Lỗi khi tải danh sách quy trình');
    } finally {
      setLoading(false);
    }
  };

  const createEmptySection = (stt: number): ProcessFlowchartSection => ({
    phanDoan: `Phân đoạn ${stt}`,
    tenPhanDoan: '',
    noiDungCongViec: '',
    fileUrl: '',
    stt,
    costs: [],
  });

  const createEmptyCost = (): ProcessFlowchartCost => ({
    loaiChiPhi: '',
    tenChiPhi: '',
    donVi: '',
  });

  const handleOpenModal = () => {
    setEditingProcess(null);

    // Auto-fill employee info from logged-in user
    const msnv = user?.employeeCode || '';
    const tenNhanVien = user ? `${user.firstName} ${user.lastName}`.trim() : '';

    setFormData({
      msnv,
      tenNhanVien,
      tenQuyTrinh: '',
      loaiQuyTrinh: '',
    });
    setFlowchartSections([createEmptySection(1)]);
    setIsModalOpen(true);
  };

  const handleEditProcess = async (process: Process) => {
    setEditingProcess(process);
    setFormData({
      msnv: process.msnv,
      tenNhanVien: process.tenNhanVien,
      tenQuyTrinh: process.tenQuyTrinh,
      loaiQuyTrinh: process.loaiQuyTrinh,
    });

    // Load flowchart if exists
    try {
      const flowchartResponse = await processService.getFlowchart(process.id);
      if (flowchartResponse.data && flowchartResponse.data.sections) {
        setFlowchartSections(flowchartResponse.data.sections);
      } else {
        setFlowchartSections([createEmptySection(1)]);
      }
    } catch (error) {
      // No flowchart exists, start with empty section
      setFlowchartSections([createEmptySection(1)]);
    }

    setIsModalOpen(true);
  };

  const handleViewProcess = async (process: Process) => {
    setViewingProcess(process);
    setIsViewModalOpen(true);

    // Fetch flowchart data
    try {
      const flowchartResponse = await processService.getFlowchart(process.id);
      if (flowchartResponse.success && flowchartResponse.data) {
        // Update viewingProcess with flowchart data
        setViewingProcess({
          ...process,
          flowchart: flowchartResponse.data
        });
      }
    } catch (error) {
      console.error('Error fetching flowchart:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProcess(null);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingProcess(null);
  };

  const handleCreateStandard = async (process: Process) => {
    setStandardProcess(process);

    // Fetch flowchart data
    try {
      const flowchartResponse = await processService.getFlowchart(process.id);
      if (flowchartResponse.success && flowchartResponse.data) {
        setStandardProcess({
          ...process,
          flowchart: flowchartResponse.data
        });
        setIsStandardModalOpen(true);
      } else {
        alert('Quy trình này chưa có lưu đồ. Vui lòng tạo lưu đồ trước!');
      }
    } catch (error) {
      console.error('Error fetching flowchart:', error);
      alert('Lỗi khi tải lưu đồ quy trình');
    }
  };

  const handleCloseStandardModal = () => {
    setIsStandardModalOpen(false);
    setStandardProcess(null);
  };

  const handleStandardChange = (sectionIndex: number, costIndex: number, value: string) => {
    if (!standardProcess || !standardProcess.flowchart) return;

    const updatedSections = [...standardProcess.flowchart.sections];
    const numValue = parseFloat(value);
    updatedSections[sectionIndex].costs[costIndex].dinhMucLaoDong = isNaN(numValue) ? undefined : numValue;

    setStandardProcess({
      ...standardProcess,
      flowchart: {
        ...standardProcess.flowchart,
        sections: updatedSections
      }
    });
  };

  const handleDonViDinhMucChange = (sectionIndex: number, costIndex: number, value: string) => {
    if (!standardProcess || !standardProcess.flowchart) return;

    const updatedSections = [...standardProcess.flowchart.sections];
    updatedSections[sectionIndex].costs[costIndex].donViDinhMucLaoDong = value || undefined;

    setStandardProcess({
      ...standardProcess,
      flowchart: {
        ...standardProcess.flowchart,
        sections: updatedSections
      }
    });
  };

  const handleProductionDataChange = (sectionIndex: number, costIndex: number, field: string, value: string) => {
    if (!standardProcess || !standardProcess.flowchart) return;

    const updatedSections = [...standardProcess.flowchart.sections];
    const numValue = parseFloat(value);
    (updatedSections[sectionIndex].costs[costIndex] as any)[field] = isNaN(numValue) ? undefined : numValue;

    setStandardProcess({
      ...standardProcess,
      flowchart: {
        ...standardProcess.flowchart,
        sections: updatedSections
      }
    });
  };

  const handleSaveStandard = async () => {
    if (!standardProcess || !standardProcess.flowchart) return;

    try {
      // Update flowchart with new dinhMucLaoDong values
      await processService.updateFlowchart(standardProcess.id, standardProcess.flowchart.sections);

      alert('Lưu định mức lao động thành công!');
      handleCloseStandardModal();
      fetchProcesses(); // Refresh list
    } catch (error) {
      console.error('Error saving standard:', error);
      alert('Lỗi khi lưu định mức lao động');
    }
  };

  // Flowchart section handlers
  const handleAddSection = () => {
    const newSection = createEmptySection(flowchartSections.length + 1);
    setFlowchartSections([...flowchartSections, newSection]);
  };

  // Insert section at specific position (after the given index)
  const handleInsertSectionAfter = (afterIndex: number) => {
    const newSections = [...flowchartSections];
    const newSection = createEmptySection(afterIndex + 2); // Temporary stt
    newSections.splice(afterIndex + 1, 0, newSection);
    // Re-number all sections
    newSections.forEach((section, i) => {
      section.phanDoan = `Phân đoạn ${i + 1}`;
      section.stt = i + 1;
    });
    setFlowchartSections(newSections);
  };

  const handleRemoveSection = (index: number) => {
    if (flowchartSections.length === 1) {
      alert('Phải có ít nhất 1 phân đoạn!');
      return;
    }
    const newSections = flowchartSections.filter((_, i) => i !== index);
    // Re-number sections
    newSections.forEach((section, i) => {
      section.phanDoan = `Phân đoạn ${i + 1}`;
      section.stt = i + 1;
    });
    setFlowchartSections(newSections);
  };

  const handleSectionChange = (index: number, field: keyof ProcessFlowchartSection, value: string) => {
    const newSections = [...flowchartSections];
    (newSections[index] as any)[field] = value;
    setFlowchartSections(newSections);
  };

  const handleAddCost = (sectionIndex: number) => {
    const newSections = [...flowchartSections];
    newSections[sectionIndex].costs.push(createEmptyCost());
    setFlowchartSections(newSections);
  };

  const handleRemoveCost = (sectionIndex: number, costIndex: number) => {
    const newSections = [...flowchartSections];
    newSections[sectionIndex].costs = newSections[sectionIndex].costs.filter((_, i) => i !== costIndex);
    setFlowchartSections(newSections);
  };

  const handleCostChange = (sectionIndex: number, costIndex: number, field: keyof ProcessFlowchartCost, value: string) => {
    const newSections = [...flowchartSections];
    (newSections[sectionIndex].costs[costIndex] as any)[field] = value;
    setFlowchartSections(newSections);
  };

  const handleSectionFileUpload = async (sectionIndex: number, file: File) => {
    // TODO: Implement file upload to server
    const fileUrl = `/uploads/${file.name}`;
    handleSectionChange(sectionIndex, 'fileUrl', fileUrl);
    alert(`File "${file.name}" đã được chọn (chức năng upload sẽ được implement sau)`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.msnv || !formData.tenNhanVien || !formData.tenQuyTrinh || !formData.loaiQuyTrinh) {
      alert('Vui lòng điền đầy đủ các trường bắt buộc!');
      return;
    }

    try {
      let processId: string;

      // Step 1: Save Process
      if (editingProcess) {
        await processService.updateProcess(editingProcess.id, formData);
        processId = editingProcess.id;
      } else {
        const response = await processService.createProcess(formData);
        processId = response.data.id;
      }

      // Step 2: Save Flowchart (if has sections with data)
      const hasFlowchartData = flowchartSections.some(
        section => section.tenPhanDoan || section.noiDungCongViec || section.costs.length > 0
      );

      if (hasFlowchartData) {
        try {
          // Check if flowchart exists
          const existingFlowchart = await processService.getFlowchart(processId);
          if (existingFlowchart.data) {
            // Update existing flowchart
            await processService.updateFlowchart(processId, flowchartSections);
          } else {
            // Create new flowchart
            await processService.createFlowchart(processId, flowchartSections);
          }
        } catch (error: any) {
          if (error.response?.status === 404) {
            // Flowchart doesn't exist, create new
            await processService.createFlowchart(processId, flowchartSections);
          } else {
            throw error;
          }
        }
      }

      alert(editingProcess ? 'Cập nhật quy trình thành công!' : 'Tạo quy trình mới thành công!');
      handleCloseModal();
      fetchProcesses();
    } catch (error: any) {
      console.error('Error saving process:', error);
      alert(error.response?.data?.message || 'Lỗi khi lưu quy trình');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa quy trình này?')) {
      return;
    }

    try {
      await processService.deleteProcess(id);
      alert('Xóa quy trình thành công!');
      fetchProcesses();
    } catch (error: any) {
      console.error('Error deleting process:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa quy trình');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleExportExcel = async () => {
    try {
      await processService.exportToExcel();
      alert('Đã xuất file Excel thành công');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Không thể xuất file Excel');
    }
  };

  return (
    <div>
      {/* Table Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Action Bar */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã quy trình, tên quy trình..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
            {mode === 'full' && (
              <button
                onClick={handleOpenModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tạo quy trình mới
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã quy trình</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">MSNV</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên nhân viên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên quy trình</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Loại quy trình</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : processes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                processes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((process, index) => (
                  <tr
                    key={process.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {process.maQuyTrinh}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">{process.msnv}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">{process.tenNhanVien}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{process.tenQuyTrinh}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{process.loaiQuyTrinh}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleViewProcess(process)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {mode === 'full' && (
                          <>
                            <button
                              onClick={() => handleEditProcess(process)}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(process.id)}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {mode === 'standard-only' && (
                          <button
                            onClick={() => handleCreateStandard(process)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                            title="Tạo định mức"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                        {mode === 'production' && (
                          <button
                            onClick={() => handleCreateStandard(process)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                            title="Nhập dữ liệu sản xuất"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
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
          const totalItems = processes.length;
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

      {/* Create/Edit Modal - TÍCH HỢP LƯU ĐỒ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProcess ? 'Chỉnh sửa quy trình' : 'Tạo quy trình mới'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Thông tin nhân viên (auto-filled từ user đang login) */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm font-medium text-blue-800 mb-2">
                    📋 Thông tin nhân viên (tự động từ tài khoản đang đăng nhập)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        MSNV <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.msnv}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-gray-700"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên nhân viên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.tenNhanVien}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed text-gray-700"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Tên quy trình */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên quy trình <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tenQuyTrinh"
                    value={formData.tenQuyTrinh}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Loại quy trình */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại quy trình <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="loaiQuyTrinh"
                    value={formData.loaiQuyTrinh}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Chọn loại quy trình --</option>
                    <option value="Sản xuất">Sản xuất</option>
                    <option value="Kiểm tra chất lượng">Kiểm tra chất lượng</option>
                    <option value="Đóng gói">Đóng gói</option>
                    <option value="Vận chuyển">Vận chuyển</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {/* LƯU ĐỒ SECTION */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="bg-green-100 border border-green-300 p-3 mb-4">
                    <h4 className="text-lg font-bold text-gray-800">Lưu đồ</h4>
                  </div>

                  {/* Flowchart Sections */}
                  {flowchartSections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
                      {/* Section Header */}
                      <div className="bg-gray-100 p-3 flex items-center justify-between border-b border-gray-300">
                        <input
                          type="text"
                          value={section.phanDoan}
                          onChange={(e) => handleSectionChange(sectionIndex, 'phanDoan', e.target.value)}
                          className="font-semibold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                          placeholder="Tên phân đoạn"
                        />
                        {flowchartSections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(sectionIndex)}
                            className="text-red-600 hover:text-red-800"
                            title="Xóa phân đoạn"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {/* Section Content */}
                      <div className="p-4 space-y-4">
                        {/* Tên phân đoạn */}
                        <div className="grid grid-cols-4 gap-4">
                          <div className="col-span-1 font-medium text-gray-700">Tên phân đoạn</div>
                          <div className="col-span-3">
                            <textarea
                              value={section.tenPhanDoan || ''}
                              onChange={(e) => handleSectionChange(sectionIndex, 'tenPhanDoan', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={2}
                              placeholder="Nhập tên phân đoạn..."
                            />
                          </div>
                        </div>

                        {/* Nội dung công việc */}
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="col-span-1 font-medium text-gray-700">Nội dung công việc</div>
                          <div className="col-span-3">
                            <textarea
                              value={section.noiDungCongViec || ''}
                              onChange={(e) => handleSectionChange(sectionIndex, 'noiDungCongViec', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={2}
                              placeholder="Nhập nội dung công việc..."
                            />
                          </div>
                        </div>

                        {/* File đính kèm */}
                        <div className="grid grid-cols-4 gap-4">
                          <div className="col-span-1 font-medium text-gray-700">File đính kèm</div>
                          <div className="col-span-3">
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded cursor-pointer hover:bg-gray-200 border border-gray-300">
                                <Upload className="w-4 h-4" />
                                <span>Chọn file</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleSectionFileUpload(sectionIndex, file);
                                  }}
                                />
                              </label>
                              {section.fileUrl && (
                                <span className="text-sm text-blue-600 truncate max-w-[200px]" title={section.fileUrl}>
                                  {section.fileUrl.split('/').pop()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Chi phí list */}
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-gray-700">+ Thêm (Nhân công/ phụ liệu/ vật tư)</span>
                            <button
                              type="button"
                              onClick={() => handleAddCost(sectionIndex)}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              <Plus className="w-4 h-4" />
                              Thêm chi phí
                            </button>
                          </div>

                          {/* Costs table */}
                          {section.costs.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium w-40">Loại chi phí</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Tên chi phí</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium w-32">Đơn vị</th>
                                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium w-16">Xóa</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {section.costs.map((cost, costIndex) => (
                                    <tr key={costIndex}>
                                      <td className="border border-gray-300 px-2 py-1">
                                        <select
                                          value={cost.loaiChiPhi}
                                          onChange={(e) => handleCostChange(sectionIndex, costIndex, 'loaiChiPhi', e.target.value)}
                                          className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                          <option value="">-- Chọn loại chi phí --</option>
                                          <option value="Nhân công">Nhân công</option>
                                          <option value="Vật tư">Vật tư</option>
                                          <option value="Phụ liệu">Phụ liệu</option>
                                        </select>
                                      </td>
                                      <td className="border border-gray-300 px-2 py-1">
                                        <input
                                          type="text"
                                          value={cost.tenChiPhi || ''}
                                          onChange={(e) => handleCostChange(sectionIndex, costIndex, 'tenChiPhi', e.target.value)}
                                          placeholder="Nhập tên chi phí..."
                                          className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                      </td>
                                      <td className="border border-gray-300 px-2 py-1">
                                        <select
                                          value={cost.donVi || ''}
                                          onChange={(e) => handleCostChange(sectionIndex, costIndex, 'donVi', e.target.value)}
                                          className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                          <option value="">-- Chọn đơn vị --</option>
                                          <option value="Người">Người</option>
                                          <option value="Kg">Kg</option>
                                          <option value="Cái">Cái</option>
                                        </select>
                                      </td>
                                      <td className="border border-gray-300 px-2 py-1 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCost(sectionIndex, costIndex)}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Insert Section After Button */}
                      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => handleInsertSectionAfter(sectionIndex)}
                          className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Chèn phân đoạn bên dưới
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Section Button */}
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    + THÊM PHÂN ĐOẠN
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingProcess ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewingProcess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Chi tiết quy trình - {viewingProcess.maQuyTrinh}
              </h3>
              <button
                onClick={handleCloseViewModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Process Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Mã quy trình:</label>
                  <p className="text-sm text-gray-900 font-medium text-blue-600">{viewingProcess.maQuyTrinh}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">MSNV:</label>
                  <p className="text-sm text-gray-900">{viewingProcess.msnv}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tên nhân viên:</label>
                  <p className="text-sm text-gray-900">{viewingProcess.tenNhanVien}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tên quy trình:</label>
                  <p className="text-sm text-gray-900">{viewingProcess.tenQuyTrinh}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Loại quy trình:</label>
                  <p className="text-sm text-gray-900">{viewingProcess.loaiQuyTrinh}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ngày tạo:</label>
                  <p className="text-sm text-gray-900">{new Date(viewingProcess.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ngày cập nhật:</label>
                  <p className="text-sm text-gray-900">{new Date(viewingProcess.updatedAt).toLocaleString('vi-VN')}</p>
                </div>
              </div>

              {/* Flowchart Data - Table Format */}
              {viewingProcess.flowchart && viewingProcess.flowchart.sections && viewingProcess.flowchart.sections.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Lưu đồ quy trình</h4>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-400">
                      <thead>
                        <tr className="bg-blue-200 border-b-2 border-gray-400">
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-12">STT</th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-32">PHÂN ĐOẠN</th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400">NỘI DUNG CÔNG VIỆC</th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-32">LOẠI CHI PHÍ</th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-40">TÊN CHI PHÍ</th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-20">ĐVT</th>
                          {(mode === 'standard-only' || mode === 'production') && (
                            <>
                              <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">ĐỊNH MỨC LAO ĐỘNG</th>
                              <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">ĐƠN VỊ</th>
                            </>
                          )}
                          {mode === 'production' && (
                            <>
                              <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">SỐ LƯỢNG NGUYÊN LIỆU CẦN HOÀN THÀNH (Kg)</th>
                              <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">SỐ PHÚT CẦN THỰC HIỆN XONG</th>
                              <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ CẦN DÙNG</th>
                            </>
                          )}
                        </tr>
                        {mode === 'production' && (
                          <tr className="bg-blue-50">
                            <th className="border border-gray-400 px-3 py-2"></th>
                            <th className="border border-gray-400 px-3 py-2"></th>
                            <th className="border border-gray-400 px-3 py-2"></th>
                            <th className="border border-gray-400 px-3 py-2"></th>
                            <th className="border border-gray-400 px-3 py-2"></th>
                            <th className="border border-gray-400 px-3 py-2"></th>
                            <th className="border border-gray-400 px-3 py-2"></th>
                            <th className="border border-gray-400 px-3 py-2"></th>
                            <th className="border border-gray-400 px-3 py-2"></th>
                            <th className="border border-gray-400 px-3 py-2"></th>
                            <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">SỐ LƯỢNG</th>
                            <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">THỰC TẾ</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {viewingProcess.flowchart.sections.map((section, sectionIndex) => {
                          const costsCount = section.costs && section.costs.length > 0 ? section.costs.length : 1;

                          return section.costs && section.costs.length > 0 ? (
                            // Section có chi phí - mỗi cost là 1 row
                            section.costs.map((cost, costIndex) => (
                              <tr key={`${section.id}-${cost.id || costIndex}`} className={costIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {/* STT - chỉ hiển thị ở row đầu tiên */}
                                {costIndex === 0 && (
                                  <td className="border border-gray-400 px-3 py-2 text-center align-top" rowSpan={costsCount}>
                                    {sectionIndex + 1}
                                  </td>
                                )}
                                {/* PHÂN ĐOẠN - chỉ hiển thị ở row đầu tiên */}
                                {costIndex === 0 && (
                                  <td className="border border-gray-400 px-3 py-2 align-top" rowSpan={costsCount}>
                                    {section.tenPhanDoan && (
                                      <div className="text-sm">{section.tenPhanDoan}</div>
                                    )}
                                    {section.fileUrl && (
                                      <div className="mt-2">
                                        <a
                                          href={section.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline text-xs"
                                        >
                                          📎 Xem file
                                        </a>
                                      </div>
                                    )}
                                  </td>
                                )}
                                {/* NỘI DUNG CÔNG VIỆC - chỉ hiển thị ở row đầu tiên */}
                                {costIndex === 0 && (
                                  <td className="border border-gray-400 px-3 py-2 align-top whitespace-pre-wrap" rowSpan={costsCount}>
                                    {section.noiDungCongViec || '-'}
                                  </td>
                                )}
                                {/* LOẠI CHI PHÍ */}
                                <td className="border border-gray-400 px-3 py-2 text-center">
                                  {cost.loaiChiPhi || '-'}
                                </td>
                                {/* TÊN CHI PHÍ */}
                                <td className="border border-gray-400 px-3 py-2">
                                  {cost.tenChiPhi || '-'}
                                </td>
                                {/* ĐVT */}
                                <td className="border border-gray-400 px-3 py-2 text-center">
                                  {cost.donVi || '-'}
                                </td>
                                {/* ĐỊNH MỨC LAO ĐỘNG - Hiển thị ở mode standard-only và production */}
                                {(mode === 'standard-only' || mode === 'production') && (
                                  <>
                                    <td className="border border-gray-400 px-3 py-2 text-center">
                                      {cost.dinhMucLaoDong !== undefined && cost.dinhMucLaoDong !== null ? cost.dinhMucLaoDong : '-'}
                                    </td>
                                    {/* ĐƠN VỊ ĐỊNH MỨC LAO ĐỘNG */}
                                    <td className="border border-gray-400 px-3 py-2 text-center">
                                      {cost.donViDinhMucLaoDong || '-'}
                                    </td>
                                  </>
                                )}
                                {/* 8 CỘT MỚI - Chỉ hiển thị ở mode production */}
                                {mode === 'production' && (
                                  <>
                                    {/* SỐ LƯỢNG NGUYÊN LIỆU */}
                                    <td className="border border-gray-400 px-3 py-2 text-center">
                                      {cost.soLuongNguyenLieu !== undefined && cost.soLuongNguyenLieu !== null ? cost.soLuongNguyenLieu : '-'}
                                    </td>
                                    {/* SỐ PHÚT THỰC HIỆN */}
                                    <td className="border border-gray-400 px-3 py-2 text-center">
                                      {cost.soPhutThucHien !== undefined && cost.soPhutThucHien !== null ? cost.soPhutThucHien : '-'}
                                    </td>
                                    {/* SỐ LƯỢNG KẾ HOẠCH */}
                                    <td className="border border-gray-400 px-3 py-2 text-center">
                                      {cost.soLuongKeHoach !== undefined && cost.soLuongKeHoach !== null ? cost.soLuongKeHoach : '-'}
                                    </td>
                                    {/* SỐ LƯỢNG THỰC TẾ */}
                                    <td className="border border-gray-400 px-3 py-2 text-center">
                                      {cost.soLuongThucTe !== undefined && cost.soLuongThucTe !== null ? cost.soLuongThucTe : '-'}
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))
                          ) : (
                            // Section không có chi phí - hiển thị 1 row với các cột chi phí trống
                            <tr key={section.id || sectionIndex} className="bg-white">
                              <td className="border border-gray-400 px-3 py-2 text-center">
                                {sectionIndex + 1}
                              </td>
                              <td className="border border-gray-400 px-3 py-2">
                                {section.tenPhanDoan && (
                                  <div className="text-sm">{section.tenPhanDoan}</div>
                                )}
                                {section.fileUrl && (
                                  <div className="mt-2">
                                    <a
                                      href={section.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline text-xs"
                                    >
                                      📎 Xem file
                                    </a>
                                  </div>
                                )}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 whitespace-pre-wrap">
                                {section.noiDungCongViec || '-'}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center text-gray-400">-</td>
                              <td className="border border-gray-400 px-3 py-2 text-gray-400">-</td>
                              <td className="border border-gray-400 px-3 py-2 text-center text-gray-400">-</td>
                              <td className="border border-gray-400 px-3 py-2 text-center text-gray-400">-</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseViewModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              {mode === 'full' && (
                <button
                  onClick={() => {
                    handleCloseViewModal();
                    handleEditProcess(viewingProcess);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Chỉnh sửa
                </button>
              )}
              {mode === 'standard-only' && (
                <button
                  onClick={() => {
                    handleCloseViewModal();
                    handleCreateStandard(viewingProcess);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Chỉnh sửa định mức
                </button>
              )}
              {mode === 'production' && (
                <button
                  onClick={() => {
                    handleCloseViewModal();
                    handleCreateStandard(viewingProcess);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Nhập dữ liệu sản xuất
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Standard Modal - Tạo định mức */}
      {isStandardModalOpen && standardProcess && standardProcess.flowchart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-800">
                {mode === 'production' ? 'Nhập dữ liệu sản xuất' : 'Tạo định mức lao động'} - {standardProcess.tenQuyTrinh}
              </h2>
              <button
                onClick={handleCloseStandardModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Hướng dẫn:</strong> {mode === 'production'
                    ? 'Nhập dữ liệu sản xuất cho từng chi phí. Các trường có nền xanh lá nhạt có thể chỉnh sửa.'
                    : 'Nhập định mức lao động cho từng chi phí. Các trường khác chỉ hiển thị (không thể chỉnh sửa).'}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-blue-200 border-b-2 border-gray-400">
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-12">STT</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-32">PHÂN ĐOẠN</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400">NỘI DUNG CÔNG VIỆC</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-32">LOẠI CHI PHÍ</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-40">TÊN CHI PHÍ</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-20">ĐVT</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 bg-green-100 w-32">ĐỊNH MỨC LAO ĐỘNG</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 bg-green-100 w-24">ĐƠN VỊ</th>
                      {mode === 'production' && (
                        <>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold bg-green-100">SỐ LƯỢNG NGUYÊN LIỆU (Kg)</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold bg-green-100">SỐ PHÚT THỰC HIỆN</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold bg-green-100" colSpan={2}>SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ</th>
                        </>
                      )}
                    </tr>
                    {mode === 'production' && (
                      <tr className="bg-blue-50">
                        <th className="border border-gray-400 px-3 py-2"></th>
                        <th className="border border-gray-400 px-3 py-2"></th>
                        <th className="border border-gray-400 px-3 py-2"></th>
                        <th className="border border-gray-400 px-3 py-2"></th>
                        <th className="border border-gray-400 px-3 py-2"></th>
                        <th className="border border-gray-400 px-3 py-2"></th>
                        <th className="border border-gray-400 px-3 py-2"></th>
                        <th className="border border-gray-400 px-3 py-2"></th>
                        <th className="border border-gray-400 px-3 py-2"></th>
                        <th className="border border-gray-400 px-3 py-2"></th>
                        <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold bg-green-100">SỐ LƯỢNG</th>
                        <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold bg-green-100">THỰC TẾ</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {standardProcess.flowchart.sections.map((section, sectionIndex) => {
                      const costsCount = section.costs && section.costs.length > 0 ? section.costs.length : 1;

                      return section.costs && section.costs.length > 0 ? (
                        section.costs.map((cost, costIndex) => (
                          <tr key={`${section.id}-${cost.id || costIndex}`} className={costIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {costIndex === 0 && (
                              <td className="border border-gray-400 px-3 py-2 text-center align-top bg-gray-100" rowSpan={costsCount}>
                                {sectionIndex + 1}
                              </td>
                            )}
                            {costIndex === 0 && (
                              <td className="border border-gray-400 px-3 py-2 align-top bg-gray-100" rowSpan={costsCount}>
                                {section.tenPhanDoan && (
                                  <div className="text-sm">{section.tenPhanDoan}</div>
                                )}
                              </td>
                            )}
                            {costIndex === 0 && (
                              <td className="border border-gray-400 px-3 py-2 align-top whitespace-pre-wrap bg-gray-100" rowSpan={costsCount}>
                                {section.noiDungCongViec || '-'}
                              </td>
                            )}
                            <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                              {cost.loaiChiPhi || '-'}
                            </td>
                            <td className="border border-gray-400 px-3 py-2 bg-gray-100">
                              {cost.tenChiPhi || '-'}
                            </td>
                            <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                              {cost.donVi || '-'}
                            </td>
                            <td className={`border border-gray-400 px-3 py-2 text-center ${mode === 'production' ? 'bg-gray-100' : 'bg-green-50'}`}>
                              {mode === 'production' ? (
                                // Mode production - chỉ hiển thị, không cho sửa
                                <div className="px-2 py-1 text-center">
                                  {cost.dinhMucLaoDong !== undefined && cost.dinhMucLaoDong !== null ? cost.dinhMucLaoDong : '-'}
                                </div>
                              ) : (
                                // Mode standard-only - cho phép sửa
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cost.dinhMucLaoDong !== undefined && cost.dinhMucLaoDong !== null ? cost.dinhMucLaoDong : ''}
                                  onChange={(e) => handleStandardChange(sectionIndex, costIndex, e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                  placeholder="Nhập định mức"
                                />
                              )}
                            </td>
                            {/* ĐƠN VỊ ĐỊNH MỨC LAO ĐỘNG */}
                            <td className={`border border-gray-400 px-3 py-2 text-center ${mode === 'production' ? 'bg-gray-100' : 'bg-green-50'}`}>
                              {mode === 'production' ? (
                                // Mode production - chỉ hiển thị, không cho sửa
                                <div className="px-2 py-1 text-center">
                                  {cost.donViDinhMucLaoDong || '-'}
                                </div>
                              ) : (
                                // Mode standard-only - cho phép sửa
                                <input
                                  type="text"
                                  value={cost.donViDinhMucLaoDong || ''}
                                  onChange={(e) => handleDonViDinhMucChange(sectionIndex, costIndex, e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                  placeholder="Nhập đơn vị"
                                />
                              )}
                            </td>
                            {mode === 'production' && (
                              <>
                                {/* SỐ LƯỢNG NGUYÊN LIỆU */}
                                <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={cost.soLuongNguyenLieu !== undefined && cost.soLuongNguyenLieu !== null ? cost.soLuongNguyenLieu : ''}
                                    onChange={(e) => handleProductionDataChange(sectionIndex, costIndex, 'soLuongNguyenLieu', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                    placeholder="0"
                                  />
                                </td>
                                {/* SỐ PHÚT THỰC HIỆN */}
                                <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={cost.soPhutThucHien !== undefined && cost.soPhutThucHien !== null ? cost.soPhutThucHien : ''}
                                    onChange={(e) => handleProductionDataChange(sectionIndex, costIndex, 'soPhutThucHien', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                    placeholder="0"
                                  />
                                </td>
                                {/* SỐ LƯỢNG KẾ HOẠCH */}
                                <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={cost.soLuongKeHoach !== undefined && cost.soLuongKeHoach !== null ? cost.soLuongKeHoach : ''}
                                    onChange={(e) => handleProductionDataChange(sectionIndex, costIndex, 'soLuongKeHoach', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                    placeholder="0"
                                  />
                                </td>
                                {/* SỐ LƯỢNG THỰC TẾ */}
                                <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={cost.soLuongThucTe !== undefined && cost.soLuongThucTe !== null ? cost.soLuongThucTe : ''}
                                    onChange={(e) => handleProductionDataChange(sectionIndex, costIndex, 'soLuongThucTe', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                    placeholder="0"
                                  />
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr key={section.id || sectionIndex} className="bg-white">
                          <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                            {sectionIndex + 1}
                          </td>
                          <td className="border border-gray-400 px-3 py-2 bg-gray-100">
                            {section.tenPhanDoan && (
                              <div className="text-sm">{section.tenPhanDoan}</div>
                            )}
                          </td>
                          <td className="border border-gray-400 px-3 py-2 whitespace-pre-wrap bg-gray-100">
                            {section.noiDungCongViec || '-'}
                          </td>
                          <td className="border border-gray-400 px-3 py-2 text-center text-gray-400 bg-gray-100">-</td>
                          <td className="border border-gray-400 px-3 py-2 text-gray-400 bg-gray-100">-</td>
                          <td className="border border-gray-400 px-3 py-2 text-center text-gray-400 bg-gray-100">-</td>
                          <td className="border border-gray-400 px-3 py-2 text-center text-gray-400 bg-gray-100">-</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseStandardModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveStandard}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Lưu định mức
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessManagement;

