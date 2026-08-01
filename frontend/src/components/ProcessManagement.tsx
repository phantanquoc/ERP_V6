import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, FileText, Download, Upload, Printer, Settings, History, ChevronUp, ChevronDown } from 'lucide-react';
import Modal from './Modal';
import AuditTimeline from './quotation/AuditTimeline';
import { auditLogService, AuditLog } from '../services/auditLogService';
import FileUpload from './FileUpload';
import processService, { Process, CreateProcessData, ProcessFlowchartSection, ProcessFlowchartCost } from '../services/processService';
import { useAuth } from '../contexts/AuthContext';
import { useProcessTypes } from '../hooks/useProcessTypes';
import { parseNumberInput } from '../utils/numberInput';
import TableFilter, { FilterField } from './TableFilter';
import { SERVER_BASE_URL } from '../config/api';
import UnitSelect from './common/UnitSelect';

interface ProcessManagementProps {
  mode?: 'full' | 'standard-only' | 'production';
  showToggleHienThi?: boolean;
  onOpenTypeSettings?: () => void;
}

type ProcessCostColumn = {
  key: keyof ProcessFlowchartCost;
  label: string;
  subLabel?: string;
  modes?: Array<NonNullable<ProcessManagementProps['mode']>>;
  group?: 'laborQuantity';
  className?: string;
};

const hasDisplayValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const formatCostCellValue = (value: unknown) => hasDisplayValue(value) ? String(value) : '-';

const processCostColumns: ProcessCostColumn[] = [
  { key: 'loaiChiPhi', label: 'LOẠI CHI PHÍ', className: 'text-center' },
  { key: 'tenChiPhi', label: 'TÊN CHI PHÍ' },
  { key: 'donVi', label: 'ĐVT', className: 'text-center' },
  { key: 'dinhMucLaoDong', label: 'ĐỊNH MỨC THỰC HIỆN', modes: ['standard-only', 'production'], className: 'text-center' },
  { key: 'donViDinhMucLaoDong', label: 'ĐƠN VỊ', modes: ['standard-only', 'production'], className: 'text-center' },
  { key: 'soLuongNguyenLieu', label: 'KHỐI LƯỢNG CẦN THỰC HIỆN (Kg)', modes: ['production'], className: 'text-center' },
  { key: 'soPhutThucHien', label: 'SỐ PHÚT CẦN THỰC HIỆN XONG', modes: ['production'], className: 'text-center' },
  { key: 'soLuongKeHoach', label: 'SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ CẦN DÙNG', subLabel: 'SỐ LƯỢNG', modes: ['production'], group: 'laborQuantity', className: 'text-center' },
  { key: 'soLuongThucTe', label: 'SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ CẦN DÙNG', subLabel: 'THỰC TẾ', modes: ['production'], group: 'laborQuantity', className: 'text-center' },
];

const getVisibleProcessCostColumns = (
  sections: ProcessFlowchartSection[],
  mode: NonNullable<ProcessManagementProps['mode']>,
) => {
  const costs = sections.flatMap(section => section.costs || []);
  return processCostColumns
    .filter(column => !column.modes || column.modes.includes(mode))
    .filter(column => costs.some(cost => hasDisplayValue(cost[column.key])));
};

const ProcessManagement: React.FC<ProcessManagementProps> = ({ mode = 'full', showToggleHienThi = false, onOpenTypeSettings }) => {
  const { user } = useAuth(); // Get current logged-in user
  const { data: processTypesResponse, isLoading: processTypesLoading } = useProcessTypes({ kichHoat: true });
  const activeProcessTypes = processTypesResponse?.data ?? [];
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    _search: '',
    tenQuyTrinh: '',
    loaiQuyTrinh: '',
    tenNhanVien: '',
  });
  const loaiQuyTrinhOptions = processTypesLoading
    ? [{ value: '', label: 'Đang tải…' }]
    : activeProcessTypes.map(pt => ({ value: pt.name, label: pt.name }));
  const filterFields: FilterField[] = [
    { key: 'tenQuyTrinh', label: 'Tên quy trình', type: 'text', placeholder: 'Lọc tên quy trình...' },
    {
      key: 'loaiQuyTrinh',
      label: 'Loại quy trình',
      type: 'select',
      options: loaiQuyTrinhOptions,
    },
    { key: 'tenNhanVien', label: 'Tên nhân viên', type: 'text', placeholder: 'Lọc tên nhân viên...' },
  ];
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
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [processFiles, setProcessFiles] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);

  // Update-history (audit) modal state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyProcess, setHistoryProcess] = useState<Process | null>(null);
  const [historyLogs, setHistoryLogs] = useState<AuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Open the update-history timeline for a process (audit log, entityType=Process)
  const handleOpenHistory = async (process: Process) => {
    setHistoryProcess(process);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await auditLogService.listAudit({
        entityType: 'Process',
        entityId: process.id,
        limit: 100,
      });
      setHistoryLogs(res.data ?? []);
    } catch (err) {
      console.error('Error loading process history:', err);
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseHistory = () => {
    setIsHistoryOpen(false);
    setHistoryProcess(null);
    setHistoryLogs([]);
  };

  // Flowchart sections state
  const [flowchartSections, setFlowchartSections] = useState<ProcessFlowchartSection[]>([]);

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const response = await processService.getAllProcesses(1, 1000);
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
    files: [],
  });

  const createEmptyCost = (): ProcessFlowchartCost => ({
    loaiChiPhi: '',
    tenChiPhi: '',
    donVi: '',
  });

  const handleOpenModal = () => {
    setEditingProcess(null);

    const msnv = user?.employeeCode || '';
    const tenNhanVien = user ? `${user.lastName} ${user.firstName}`.trim() : '';

    setFormData({
      msnv,
      tenNhanVien,
      tenQuyTrinh: '',
      loaiQuyTrinh: '',
    });
    setProcessFiles([]);
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
    setProcessFiles(process.files || []);

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
    setFormErrors({});
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
    const numValue = value === '' ? undefined : parseNumberInput(value);
    updatedSections[sectionIndex].costs[costIndex].dinhMucLaoDong = numValue;

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
    const numValue = value === '' ? undefined : parseNumberInput(value);
    (updatedSections[sectionIndex].costs[costIndex] as any)[field] = numValue;

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

  // Move a section up (-1) or down (+1). Swaps whole section objects so their
  // costs/files travel with them, then re-numbers stt + default "Phân đoạn N" labels.
  const handleMoveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= flowchartSections.length) return;
    const newSections = [...flowchartSections];
    [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
    newSections.forEach((section, i) => {
      // Only refresh the auto label if it still matches the default pattern,
      // so a custom-named section keeps its name after reordering.
      if (/^Phân đoạn \d+$/.test(section.phanDoan)) {
        section.phanDoan = `Phân đoạn ${i + 1}`;
      }
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

  const handleSectionFileUpload = async (sectionIndex: number, files: File[]) => {
    try {
      const uploadResults = await Promise.all(
        files.map(file => processService.uploadSectionFile(file).then(res => ({ res, file })))
      );
      setFlowchartSections(prev => {
        const newSections = [...prev];
        const section = { ...newSections[sectionIndex] };
        const currentFiles = [...(section.files || [])];
        for (const { res, file } of uploadResults) {
          if (res.success) {
            const { fileUrl, fileName } = res.data;
            currentFiles.push({ url: fileUrl, fileName: fileName || file.name, order: currentFiles.length, description: '' });
          }
        }
        section.files = currentFiles;
        // Backward compat: set fileUrl to first file
        if (currentFiles.length > 0 && !section.fileUrl) {
          section.fileUrl = currentFiles[0].url;
        }
        newSections[sectionIndex] = section;
        return newSections;
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Lỗi khi tải file lên');
    }
  };

  const handleProcessFilesUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadingFiles(true);
    try {
      const response = await processService.uploadFiles(files);
      if (response.success) {
        setProcessFiles(prev => [...prev, ...response.data.map(f => f.fileUrl)]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Lỗi khi tải files lên');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveProcessFile = (index: number) => {
    setProcessFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileName = (url: string) => {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return decodeURIComponent(filename.replace(/-\d+-\d+(?=\.)/, ''));
  };

  const getFullFileUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${SERVER_BASE_URL}${url}`;
  };

  const handlePrintFile = (url: string) => {
    const printWindow = window.open(getFullFileUrl(url), '_blank');
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const errors: Record<string, boolean> = {};
    if (!formData.tenQuyTrinh) errors.tenQuyTrinh = true;
    if (!formData.loaiQuyTrinh) errors.loaiQuyTrinh = true;
    if (!formData.msnv) errors.msnv = true;
    if (!formData.tenNhanVien) errors.tenNhanVien = true;

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      let processId: string;

      // Step 1: Save Process
      const dataWithFiles = { ...formData, files: processFiles };
      if (editingProcess) {
        await processService.updateProcess(editingProcess.id, dataWithFiles);
        processId = editingProcess.id;
      } else {
        const response = await processService.createProcess(dataWithFiles);
        processId = response.data.id;
      }

      // Step 2: Save Flowchart (if has sections with data)
      const hasFlowchartData = flowchartSections.some(
        section => section.tenPhanDoan || section.noiDungCongViec || section.costs.length > 0
      );

      if (hasFlowchartData) {
        if (editingProcess) {
          try {
            await processService.updateFlowchart(processId, flowchartSections);
          } catch {
            await processService.createFlowchart(processId, flowchartSections);
          }
        } else {
          await processService.createFlowchart(processId, flowchartSections);
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

  const handleExportExcel = async () => {
    try {
      await processService.exportToExcel();
      alert('Đã xuất file Excel thành công');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Không thể xuất file Excel');
    }
  };

  const handleToggleHienThi = async (process: Process) => {
    try {
      const response = await processService.toggleHienThiTrongChung(process.id);
      setProcesses(prev => prev.map(p => p.id === process.id ? { ...p, hienThiTrongChung: response.data.hienThiTrongChung } : p));
    } catch (error) {
      console.error('Error toggling hienThiTrongChung:', error);
      alert('Lỗi khi cập nhật trạng thái hiển thị');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý quy trình</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
          {onOpenTypeSettings && (
            <button
              onClick={onOpenTypeSettings}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Cài đặt loại quy trình"
              aria-label="Cài đặt loại quy trình"
            >
              <Settings className="w-4 h-4" />
              Cài đặt
            </button>
          )}
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

      {/* Search & Filter */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm mã, tên, loại quy trình..."
      />

      {/* Table Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Files</th>
                {showToggleHienThi && (
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Công khai</th>
                )}
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const search = (filterValues._search || '').toLowerCase();
                const filteredProcesses = processes.filter(process => {
                  if (search && !(
                    (process.maQuyTrinh || '').toLowerCase().includes(search) ||
                    (process.tenQuyTrinh || '').toLowerCase().includes(search) ||
                    (process.loaiQuyTrinh || '').toLowerCase().includes(search) ||
                    (process.tenNhanVien || '').toLowerCase().includes(search)
                  )) return false;
                  if (filterValues.tenQuyTrinh && !(process.tenQuyTrinh || '').toLowerCase().includes(filterValues.tenQuyTrinh.toLowerCase())) return false;
                  if (filterValues.loaiQuyTrinh && (process.loaiQuyTrinh || '') !== filterValues.loaiQuyTrinh) return false;
                  if (filterValues.tenNhanVien && !(process.tenNhanVien || '').toLowerCase().includes(filterValues.tenNhanVien.toLowerCase())) return false;
                  return true;
                });
                if (loading) {
                  return (
                    <tr>
                      <td colSpan={showToggleHienThi ? 9 : 8} className="px-6 py-8 text-center text-gray-500">
                        Đang tải...
                      </td>
                    </tr>
                  );
                }
                if (filteredProcesses.length === 0) {
                  return (
                    <tr>
                      <td colSpan={showToggleHienThi ? 9 : 8} className="px-6 py-8 text-center text-gray-500">
                        Không có dữ liệu
                      </td>
                    </tr>
                  );
                }
                return filteredProcesses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((process, index) => (
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
                    <td className="px-6 py-4 text-center border-r border-gray-200">
                      {process.files && process.files.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {process.files.map((fileUrl, fIdx) => (
                            <button
                              key={fIdx}
                              onClick={() => setPreviewFileUrl(fileUrl)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
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
                    {showToggleHienThi && (
                      <td className="px-6 py-4 text-center border-r border-gray-200">
                        <input
                          type="checkbox"
                          checked={!!process.hienThiTrongChung}
                          onChange={() => handleToggleHienThi(process)}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                          title={process.hienThiTrongChung ? 'Bỏ hiển thị trong tab Chung' : 'Hiển thị trong tab Chung'}
                        />
                      </td>
                    )}
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
                              title="Cập nhật"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleOpenHistory(process)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
                              title="Lịch sử cập nhật"
                            >
                              <History className="w-5 h-5" />
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
                ));
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(() => {
          const search = (filterValues._search || '').toLowerCase();
          const filteredProcesses = processes.filter(process => {
            if (search && !(
              (process.maQuyTrinh || '').toLowerCase().includes(search) ||
              (process.tenQuyTrinh || '').toLowerCase().includes(search) ||
              (process.loaiQuyTrinh || '').toLowerCase().includes(search) ||
              (process.tenNhanVien || '').toLowerCase().includes(search)
            )) return false;
            if (filterValues.tenQuyTrinh && !(process.tenQuyTrinh || '').toLowerCase().includes(filterValues.tenQuyTrinh.toLowerCase())) return false;
            if (filterValues.loaiQuyTrinh && (process.loaiQuyTrinh || '') !== filterValues.loaiQuyTrinh) return false;
            if (filterValues.tenNhanVien && !(process.tenNhanVien || '').toLowerCase().includes(filterValues.tenNhanVien.toLowerCase())) return false;
            return true;
          });
          const totalItems = filteredProcesses.length;
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
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProcess ? 'Cập nhật quy trình' : 'Tạo quy trình mới'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6">
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.tenQuyTrinh ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    required
                  />
                  {formErrors.tenQuyTrinh && <p className="text-red-500 text-xs mt-1">Tên quy trình là bắt buộc</p>}
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.loaiQuyTrinh ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    required
                  >
                    <option value="">-- Chọn loại quy trình --</option>
                    {processTypesLoading ? (
                      <option value="" disabled>Đang tải…</option>
                    ) : (
                      <>
                        {activeProcessTypes.map(pt => (
                          <option key={pt.id} value={pt.name}>{pt.name}</option>
                        ))}
                        {formData.loaiQuyTrinh &&
                          !activeProcessTypes.some(pt => pt.name === formData.loaiQuyTrinh) && (
                            <option value={formData.loaiQuyTrinh}>
                              {formData.loaiQuyTrinh} (không còn kích hoạt)
                            </option>
                          )}
                      </>
                    )}
                  </select>
                  {formErrors.loaiQuyTrinh && <p className="text-red-500 text-xs mt-1">Loại quy trình là bắt buộc</p>}
                </div>

                {/* FILE ĐÍNH KÈM */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File đính kèm (PDF, DOC, XLS, hình ảnh...)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleProcessFilesUpload(Array.from(e.target.files));
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                      id="process-files-input"
                    />
                    <label
                      htmlFor="process-files-input"
                      className="flex items-center justify-center gap-2 cursor-pointer text-blue-600 hover:text-blue-800"
                    >
                      <Upload className="w-5 h-5" />
                      {uploadingFiles ? 'Đang tải lên...' : 'Chọn files để upload'}
                    </label>
                  </div>
                  {processFiles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {processFiles.map((fileUrl, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate flex-1">{getFileName(fileUrl)}</span>
                          <button
                            type="button"
                            onClick={() => setPreviewFileUrl(fileUrl)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintFile(fileUrl)}
                            className="text-green-600 hover:text-green-800 text-xs font-medium"
                          >
                            In
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveProcessFile(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                      <div className="bg-gray-100 p-3 flex items-center justify-between border-b border-gray-300 gap-2">
                        <input
                          type="text"
                          value={section.phanDoan}
                          onChange={(e) => handleSectionChange(sectionIndex, 'phanDoan', e.target.value)}
                          className="flex-1 min-w-0 font-semibold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2"
                          placeholder="Tên phân đoạn"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Reorder: move up / down */}
                          <button
                            type="button"
                            onClick={() => handleMoveSection(sectionIndex, -1)}
                            disabled={sectionIndex === 0}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Di chuyển lên"
                          >
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSection(sectionIndex, 1)}
                            disabled={sectionIndex === flowchartSections.length - 1}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Di chuyển xuống"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                          {flowchartSections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(sectionIndex)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded ml-1"
                              title="Xóa phân đoạn"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
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

                        {/* Biểu mẫu (multi-file) */}
                        <div className="grid grid-cols-4 gap-4">
                          <div className="col-span-1 font-medium text-gray-700">Biểu mẫu</div>
                          <div className="col-span-3 space-y-2">
                            <FileUpload
                              files={[]}
                              onChange={(selectedFiles) => {
                                if (selectedFiles.length > 0) handleSectionFileUpload(sectionIndex, selectedFiles);
                              }}
                              multiple
                              compact
                            />
                            {(section.files || []).map((file: any, fileIndex: number) => (
                              <div key={fileIndex} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
                                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span className="text-sm text-gray-700 truncate flex-1">{file.fileName || getFileName(file.url)}</span>
                                <input
                                  type="text"
                                  placeholder="Mô tả..."
                                  value={file.description || ''}
                                  onChange={(e) => {
                                    const newFiles = [...(section.files || [])];
                                    newFiles[fileIndex] = { ...newFiles[fileIndex], description: e.target.value };
                                    handleSectionChange(sectionIndex, 'files', JSON.parse(JSON.stringify(newFiles)));
                                  }}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 w-32"
                                />
                                <button
                                  type="button"
                                  onClick={() => setPreviewFileUrl(getFullFileUrl(file.url))}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                >
                                  Xem
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintFile(getFullFileUrl(file.url))}
                                  className="text-green-600 hover:text-green-800 text-xs font-medium"
                                >
                                  In
                                </button>
                                {fileIndex > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newFiles = [...(section.files || [])];
                                      [newFiles[fileIndex - 1], newFiles[fileIndex]] = [newFiles[fileIndex], newFiles[fileIndex - 1]];
                                      handleSectionChange(sectionIndex, 'files', JSON.parse(JSON.stringify(newFiles.map((f: any, i: number) => ({ ...f, order: i })))));
                                    }}
                                    className="text-gray-500 hover:text-gray-700 text-xs"
                                  >
                                    ↑
                                  </button>
                                )}
                                {fileIndex < (section.files || []).length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newFiles = [...(section.files || [])];
                                      [newFiles[fileIndex], newFiles[fileIndex + 1]] = [newFiles[fileIndex + 1], newFiles[fileIndex]];
                                      handleSectionChange(sectionIndex, 'files', JSON.parse(JSON.stringify(newFiles.map((f: any, i: number) => ({ ...f, order: i })))));
                                    }}
                                    className="text-gray-500 hover:text-gray-700 text-xs"
                                  >
                                    ↓
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newFiles = (section.files || []).filter((_: any, i: number) => i !== fileIndex);
                                    handleSectionChange(sectionIndex, 'files', JSON.parse(JSON.stringify(newFiles.map((f: any, i: number) => ({ ...f, order: i })))));
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {/* Legacy single file display */}
                            {section.fileUrl && !(section.files || []).some((f: any) => f.url === section.fileUrl) && (
                              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md">
                                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span className="text-sm text-gray-700 truncate flex-1">{getFileName(section.fileUrl)}</span>
                                <button
                                  type="button"
                                  onClick={() => setPreviewFileUrl(getFullFileUrl(section.fileUrl!))}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                >
                                  Xem
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintFile(getFullFileUrl(section.fileUrl!))}
                                  className="text-green-600 hover:text-green-800 text-xs font-medium"
                                >
                                  In
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSectionChange(sectionIndex, 'fileUrl', '')}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
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
                                        <UnitSelect
                                          value={cost.donVi || ''}
                                          onChange={(val) => handleCostChange(sectionIndex, costIndex, 'donVi', val)}
                                          className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
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

              <div className="flex justify-end space-x-3 mt-6 shrink-0">
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
        </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen && !!viewingProcess} onClose={handleCloseViewModal} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Chi tiết quy trình - {viewingProcess?.maQuyTrinh}
              </h3>
              <button
                onClick={handleCloseViewModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {viewingProcess && (<>
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

              {/* Files đính kèm */}
              {viewingProcess.files && viewingProcess.files.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-500 mb-2">File đính kèm:</label>
                  <div className="space-y-2">
                    {viewingProcess.files.map((fileUrl, idx) => (
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

              {/* Flowchart Data - Table Format */}
              {viewingProcess.flowchart && viewingProcess.flowchart.sections && viewingProcess.flowchart.sections.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Lưu đồ quy trình</h4>

                  {(() => {
                    const visibleCostColumns = getVisibleProcessCostColumns(viewingProcess.flowchart!.sections, mode);
                    const regularCostColumns = visibleCostColumns.filter(column => column.group !== 'laborQuantity');
                    const laborQuantityColumns = visibleCostColumns.filter(column => column.group === 'laborQuantity');
                    const baseColumnCount = 4;

                    return (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-400">
                      <thead>
                        <tr className="bg-blue-200 border-b-2 border-gray-400">
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-12">STT</th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-32">PHÂN ĐOẠN</th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400">NỘI DUNG CÔNG VIỆC</th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-28">BIỂU MẪU</th>
                          {regularCostColumns.map(column => (
                            <th key={column.key} className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">{column.label}</th>
                          ))}
                          {laborQuantityColumns.length > 0 && (
                            <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={laborQuantityColumns.length}>
                              SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ CẦN DÙNG
                            </th>
                          )}
                        </tr>
                        {laborQuantityColumns.length > 0 && (
                          <tr className="bg-blue-50">
                            <th className="border border-gray-400 px-3 py-2" colSpan={baseColumnCount + regularCostColumns.length}></th>
                            {laborQuantityColumns.map(column => (
                              <th key={column.key} className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">
                                {column.subLabel}
                              </th>
                            ))}
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
                                  </td>
                                )}
                                {/* NỘI DUNG CÔNG VIỆC - chỉ hiển thị ở row đầu tiên */}
                                {costIndex === 0 && (
                                  <td className="border border-gray-400 px-3 py-2 align-top whitespace-pre-wrap" rowSpan={costsCount}>
                                    {section.noiDungCongViec || '-'}
                                  </td>
                                )}
                                {/* BIỂU MẪU - section-level, chỉ hiển thị ở row đầu tiên */}
                                {costIndex === 0 && (
                                  <td className="border border-gray-400 px-3 py-2 align-top text-center" rowSpan={costsCount}>
                                    {(section.files && section.files.length > 0) ? (
                                      <div className="flex flex-col items-center gap-1">
                                        {section.files.map((file: any, fileIdx: number) => (
                                          <div key={fileIdx} className="flex items-center gap-1">
                                            <span className="text-xs text-gray-600">{fileIdx + 1}.</span>
                                            <button
                                              type="button"
                                              onClick={() => setPreviewFileUrl(getFullFileUrl(file.url))}
                                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                            >
                                              Xem
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handlePrintFile(getFullFileUrl(file.url))}
                                              className="text-green-600 hover:text-green-800 text-xs font-medium"
                                            >
                                              In
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : section.fileUrl ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setPreviewFileUrl(getFullFileUrl(section.fileUrl!))}
                                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                        >
                                          Xem
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handlePrintFile(getFullFileUrl(section.fileUrl!))}
                                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                                        >
                                          In
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </td>
                                )}
                                {visibleCostColumns.map(column => (
                                  <td key={column.key} className={`border border-gray-400 px-3 py-2 ${column.className || ''}`}>
                                    {formatCostCellValue(cost[column.key])}
                                  </td>
                                ))}
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
                              </td>
                              <td className="border border-gray-400 px-3 py-2 whitespace-pre-wrap">
                                {section.noiDungCongViec || '-'}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center">
                                {(section.files && section.files.length > 0) ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {section.files.map((file: any, fileIdx: number) => (
                                      <div key={fileIdx} className="flex items-center gap-1">
                                        <span className="text-xs text-gray-600">{fileIdx + 1}.</span>
                                        <button
                                          type="button"
                                          onClick={() => setPreviewFileUrl(getFullFileUrl(file.url))}
                                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                        >
                                          Xem
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handlePrintFile(getFullFileUrl(file.url))}
                                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                                        >
                                          In
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : section.fileUrl ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewFileUrl(getFullFileUrl(section.fileUrl!))}
                                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                    >
                                      Xem
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePrintFile(getFullFileUrl(section.fileUrl!))}
                                      className="text-green-600 hover:text-green-800 text-xs font-medium"
                                    >
                                      In
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                              {visibleCostColumns.length > 0 && (
                                <td className="border border-gray-400 px-3 py-2 text-center text-gray-400" colSpan={visibleCostColumns.length}>
                                  Không có chi phí
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                    );
                  })()}
                </div>
              )}
              </>)}
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 shrink-0">
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
                    if (viewingProcess) handleEditProcess(viewingProcess);
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
                    if (viewingProcess) handleCreateStandard(viewingProcess);
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
                    if (viewingProcess) handleCreateStandard(viewingProcess);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Nhập dữ liệu sản xuất
                </button>
              )}
            </div>
          </div>
        </Modal>

      {/* Standard Modal - Tạo định mức */}
      {isStandardModalOpen && standardProcess && standardProcess.flowchart && (
      <Modal isOpen onClose={handleCloseStandardModal} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-800">
                {mode === 'production' ? 'Nhập dữ liệu sản xuất' : 'Tạo định mức lao động'} - {standardProcess?.tenQuyTrinh}
              </h2>
              <button
                onClick={handleCloseStandardModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
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
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-28">BIỂU MẪU</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-32">LOẠI CHI PHÍ</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-40">TÊN CHI PHÍ</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 w-20">ĐVT</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 bg-green-100 w-32">ĐỊNH MỨC THỰC HIỆN</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-r border-gray-400 bg-green-100 w-24">ĐƠN VỊ</th>
                      {mode === 'production' && (
                        <>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold bg-green-100">KHỐI LƯỢNG CẦN THỰC HIỆN (Kg)</th>
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
                            {costIndex === 0 && (
                              <td className="border border-gray-400 px-3 py-2 align-top text-center bg-gray-100" rowSpan={costsCount}>
                                {(section.files && section.files.length > 0) ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {section.files.map((file: any, fileIdx: number) => (
                                      <div key={fileIdx} className="flex items-center gap-1">
                                        <span className="text-xs text-gray-600">{fileIdx + 1}.</span>
                                        <button
                                          type="button"
                                          onClick={() => setPreviewFileUrl(getFullFileUrl(file.url))}
                                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                        >
                                          Xem
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handlePrintFile(getFullFileUrl(file.url))}
                                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                                        >
                                          In
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : section.fileUrl ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewFileUrl(getFullFileUrl(section.fileUrl!))}
                                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                    >
                                      Xem
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePrintFile(getFullFileUrl(section.fileUrl!))}
                                      className="text-green-600 hover:text-green-800 text-xs font-medium"
                                    >
                                      In
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
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
                            {/* ĐƠN VỊ ĐỊNH MỨC THỰC HIỆN */}
                            <td className={`border border-gray-400 px-3 py-2 text-center ${mode === 'production' ? 'bg-gray-100' : 'bg-green-50'}`}>
                              {mode === 'production' ? (
                                // Mode production - chỉ hiển thị, không cho sửa
                                <div className="px-2 py-1 text-center">
                                  {cost.donViDinhMucLaoDong || '-'}
                                </div>
                              ) : (
                                // Mode standard-only - cho phép sửa
                                <UnitSelect
                                  value={cost.donViDinhMucLaoDong || ''}
                                  onChange={(val) => handleDonViDinhMucChange(sectionIndex, costIndex, val)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              )}
                            </td>
                            {mode === 'production' && (
                              <>
                                {/* KHỐI LƯỢNG CẦN THỰC HIỆN */}
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
                          <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                            {(section.files && section.files.length > 0) ? (
                              <div className="flex flex-col items-center gap-1">
                                {section.files.map((file: any, fileIdx: number) => (
                                  <div key={fileIdx} className="flex items-center gap-1">
                                    <span className="text-xs text-gray-600">{fileIdx + 1}.</span>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewFileUrl(getFullFileUrl(file.url))}
                                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                    >
                                      Xem
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePrintFile(getFullFileUrl(file.url))}
                                      className="text-green-600 hover:text-green-800 text-xs font-medium"
                                    >
                                      In
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : section.fileUrl ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewFileUrl(getFullFileUrl(section.fileUrl!))}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                >
                                  Xem
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintFile(getFullFileUrl(section.fileUrl!))}
                                  className="text-green-600 hover:text-green-800 text-xs font-medium"
                                >
                                  In
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
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

            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 shrink-0">
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
        </Modal>
      )}
      {/* PDF Preview Modal */}
      <Modal isOpen={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          {previewFileUrl && (<>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 truncate flex-1">
                {getFileName(previewFileUrl)}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintFile(previewFileUrl)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Printer className="w-4 h-4" />
                  In
                </button>
                <button
                  onClick={() => setPreviewFileUrl(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {previewFileUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={`${getFullFileUrl(previewFileUrl)}#toolbar=0`}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
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
          </>)}
          </div>
      </Modal>

      {/* Update-history timeline modal (who / when / what changed) */}
      <Modal isOpen={isHistoryOpen} onClose={handleCloseHistory} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 min-w-0">
              <History className="w-5 h-5 text-indigo-600 shrink-0" />
              <span className="shrink-0">Lịch sử cập nhật</span>
              {historyProcess && (
                <span className="text-sm font-normal text-gray-500 truncate">— {historyProcess.tenQuyTrinh}</span>
              )}
            </h3>
            <button onClick={handleCloseHistory} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-6 bg-gray-50">
            {historyLoading ? (
              <div className="flex items-center justify-center py-10 gap-3 text-gray-500">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Đang tải lịch sử...</span>
              </div>
            ) : (
              <AuditTimeline entries={historyLogs} />
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProcessManagement;
