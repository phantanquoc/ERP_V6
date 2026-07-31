import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, RefreshCw, Download, FileText, Printer } from 'lucide-react';
import Modal from './Modal';
import FileUpload from './FileUpload';
import productionProcessService, { ProductionProcess, CreateProductionProcessData, ProductionFlowchartCost, ProductionFlowchartSection } from '../services/productionProcessService';
import processService, { Process } from '../services/processService';
import materialStandardService, { MaterialStandard } from '../services/materialStandardService';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { parseNumberInput } from '../utils/numberInput';
import TableFilter, { FilterField } from './TableFilter';
import { SERVER_BASE_URL } from '../config/api';

type ProductionCostColumn = {
  key: keyof ProductionFlowchartCost;
  label: string;
  subLabel?: string;
  group?: 'laborQuantity';
  className?: string;
};

const hasDisplayValue = (value: unknown) => value !== undefined && value !== null && value !== '';

const formatCostCellValue = (value: unknown) => hasDisplayValue(value) ? String(value) : '-';

const productionCostColumns: ProductionCostColumn[] = [
  { key: 'loaiChiPhi', label: 'LOẠI CHI PHÍ', className: 'text-center' },
  { key: 'tenChiPhi', label: 'TÊN CHI PHÍ' },
  { key: 'donVi', label: 'ĐVT', className: 'text-center' },
  { key: 'dinhMucLaoDong', label: 'ĐỊNH MỨC THỰC HIỆN', className: 'text-center' },
  { key: 'donViDinhMucLaoDong', label: 'ĐƠN VỊ', className: 'text-center' },
  { key: 'soLuongNguyenLieu', label: 'KHỐI LƯỢNG CẦN THỰC HIỆN (Kg)', className: 'text-center' },
  { key: 'soPhutThucHien', label: 'SỐ PHÚT THỰC HIỆN', className: 'text-center' },
  { key: 'soLuongKeHoach', label: 'SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ', subLabel: 'KẾ HOẠCH', group: 'laborQuantity', className: 'text-center bg-blue-50 font-medium' },
  { key: 'soLuongThucTe', label: 'SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ', subLabel: 'THỰC TẾ', group: 'laborQuantity', className: 'text-center' },
];

const getVisibleProductionCostColumns = (sections: ProductionFlowchartSection[]) => {
  const costs = sections.flatMap(section => section.costs || []);
  return productionCostColumns.filter(column => costs.some(cost => hasDisplayValue(cost[column.key])));
};

const ProductionProcessManagement: React.FC = () => {
  const { user } = useAuth();
  const canCreate =
    !!user?.role &&
    [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD].includes(user.role) &&
    (user.role === UserRole.ADMIN ||
      (!!user.departmentCode && ['DEPT_PRODUCTION'].includes(user.departmentCode)));
  const [productionProcesses, setProductionProcesses] = useState<ProductionProcess[]>([]);
  const [templateProcesses, setTemplateProcesses] = useState<Process[]>([]);
  const [materialStandards, setMaterialStandards] = useState<MaterialStandard[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    _search: '',
    maQuyTrinhSanXuat: '',
    tenQuyTrinhSanXuat: '',
    maNVSanXuat: '',
    tenNVSanXuat: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProductionProcess | null>(null);
  const [viewingProcess, setViewingProcess] = useState<ProductionProcess | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedMaterialStandard, setSelectedMaterialStandard] = useState<MaterialStandard | null>(null);
  const [flowchartSections, setFlowchartSections] = useState<ProductionFlowchartSection[]>([]);
  const [formData, setFormData] = useState({
    tenQuyTrinhSanXuat: '',
    maNVSanXuat: '',
    tenNVSanXuat: '',
    khoiLuong: 0,
    thoiGian: 0,
    materialStandardId: '',
    sanPhamDauRa: '',
    tongNguyenLieuCanSanXuat: 0,
    soGioLamTrong1Ngay: 0,
  });
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);

  const getFullFileUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${SERVER_BASE_URL}${url}`;
  };

  const getFileName = (url: string) => {
    if (!url) return '';
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return decodeURIComponent(filename.replace(/-\d+-\d+(?=\.)/, ''));
  };

  const handlePrintFile = (url: string) => {
    const printWindow = window.open(getFullFileUrl(url), '_blank');
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  const handleSectionFileUpload = async (sectionIndex: number, files: File[]) => {
    try {
      const uploadResults = await Promise.all(
        files.map(file => productionProcessService.uploadSectionFile(file).then(res => ({ res, file })))
      );
      setFlowchartSections(prev => {
        const next = [...prev];
        const section = { ...next[sectionIndex] } as any;
        const currentFiles = [...(section.files || [])];
        for (const { res, file } of uploadResults) {
          if (res.success) {
            const { fileUrl, fileName } = res.data;
            currentFiles.push({ url: fileUrl, fileName: fileName || file.name, order: currentFiles.length, description: '' });
          }
        }
        section.files = currentFiles;
        if (currentFiles.length > 0 && !section.fileUrl) {
          section.fileUrl = currentFiles[0].url;
        }
        next[sectionIndex] = section;
        return next;
      });
    } catch (error) {
      console.error('Error uploading section file:', error);
      alert('Lỗi khi tải file biểu mẫu');
    }
  };

  const handleSectionFileRemove = (sectionIndex: number, fileIndex?: number) => {
    setFlowchartSections(prev => {
      const next = [...prev];
      if (fileIndex !== undefined) {
        const currentFiles = [...((next[sectionIndex] as any).files || [])];
        currentFiles.splice(fileIndex, 1);
        next[sectionIndex] = { ...next[sectionIndex], files: currentFiles.map((f: any, i: number) => ({ ...f, order: i })) } as any;
      } else {
        next[sectionIndex] = { ...next[sectionIndex], fileUrl: '' };
      }
      return next;
    });
  };

  useEffect(() => {
    loadProductionProcesses();
    loadTemplateProcesses();
    loadMaterialStandards();
  }, []);

  const loadProductionProcesses = async () => {
    setLoading(true);
    try {
      const response = await productionProcessService.getAllProductionProcesses(1, 1000);
      setProductionProcesses(response.data);
    } catch (error) {
      console.error('Error loading production processes:', error);
      alert('Lỗi khi tải danh sách quy trình sản xuất');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateProcesses = async () => {
    try {
      const response = await processService.getAllProcesses(1, 100);
      setTemplateProcesses(response.data);
    } catch (error) {
      console.error('Error loading template processes:', error);
    }
  };

  const loadMaterialStandards = async () => {
    try {
      const response = await materialStandardService.getAllMaterialStandards(1, 100);
      setMaterialStandards(response.data);
    } catch (error) {
      console.error('Error loading material standards:', error);
    }
  };

  const handleOpenModal = () => {
    setEditingProcess(null);
    setSelectedTemplateId('');
    setSelectedMaterialStandard(null);
    setFlowchartSections([]);
    setFormData({
      tenQuyTrinhSanXuat: '',
      maNVSanXuat: user?.employeeCode || '',
      tenNVSanXuat: user ? `${user.lastName} ${user.firstName}`.trim() : '',
      khoiLuong: 0,
      thoiGian: 0,
      materialStandardId: '',
      sanPhamDauRa: '',
      tongNguyenLieuCanSanXuat: 0,
      soGioLamTrong1Ngay: 0,
    });
    setIsModalOpen(true);
  };

  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (!templateId) {
      setFlowchartSections([]);
      return;
    }

    try {
      const response = await processService.getProcessById(templateId);
      const templateProcess = response.data;
      
      if (templateProcess.flowchart && templateProcess.flowchart.sections) {
        // Copy flowchart from template, reset user input fields
        const copiedSections = templateProcess.flowchart.sections.map((section: any) => ({
          phanDoan: section.phanDoan,
          tenPhanDoan: section.tenPhanDoan,
          noiDungCongViec: section.noiDungCongViec,
          fileUrl: section.fileUrl,
          stt: section.stt,
          files: section.files || [],
          costs: section.costs.map((cost: any) => ({
            loaiChiPhi: cost.loaiChiPhi,
            tenChiPhi: cost.tenChiPhi,
            donVi: cost.donVi,
            dinhMucLaoDong: cost.dinhMucLaoDong,
            donViDinhMucLaoDong: cost.donViDinhMucLaoDong,
            soLuongNguyenLieu: 0,
            soPhutThucHien: 0,
            soLuongKeHoach: 0,
            soLuongThucTe: 0,
          })),
        }));
        setFlowchartSections(copiedSections);
      } else {
        alert('Template process không có flowchart. Vui lòng chọn template khác.');
        setFlowchartSections([]);
      }
    } catch (error) {
      console.error('Error loading template process:', error);
      alert('Lỗi khi tải template process');
    }
  };

  const handleMaterialStandardChange = (materialStandardId: string) => {
    const selected = materialStandards.find(ms => ms.id === materialStandardId);
    setSelectedMaterialStandard(selected || null);
    setFormData(prev => ({
      ...prev,
      materialStandardId,
      sanPhamDauRa: '', // Reset sản phẩm đầu ra khi đổi định mức
      tongNguyenLieuCanSanXuat: 0, // Reset tổng nguyên liệu
    }));
  };

  // Helper function để lấy tỉ lệ sản phẩm từ material standard
  const getTiLeSanPham = (sanPhamDauRa: string, materialStandard?: MaterialStandard | null): number => {
    const items = materialStandard?.items || selectedMaterialStandard?.items;
    const selectedProduct = items?.find(item => item.tenThanhPham === sanPhamDauRa);
    return selectedProduct?.tiLe || 0;
  };

  // Tính tổng nguyên liệu cần sản xuất
  // Công thức: Tổng NL = Khối lượng TP / (tiLe sản phẩm%) * kgNguyenLieuTren1KgThanhPham
  // (kgNguyenLieuTren1KgThanhPham = số kg NL cần để tạo 1kg TP)
  const calculateTongNguyenLieu = (khoiLuong: number, kgNguyenLieuTren1KgThanhPham: number, tiLeSanPham: number): number => {
    if (kgNguyenLieuTren1KgThanhPham > 0 && tiLeSanPham > 0) {
      return khoiLuong * kgNguyenLieuTren1KgThanhPham / (tiLeSanPham / 100);
    }
    return 0;
  };

  const handleKhoiLuongChange = (khoiLuong: number) => {
    const kgNguyenLieuTren1KgThanhPham = selectedMaterialStandard?.kgNguyenLieuTren1KgThanhPham || 0;
    const tiLeSanPham = getTiLeSanPham(formData.sanPhamDauRa, selectedMaterialStandard);
    const tongNguyenLieu = calculateTongNguyenLieu(khoiLuong, kgNguyenLieuTren1KgThanhPham, tiLeSanPham);
    setFormData(prev => ({
      ...prev,
      khoiLuong,
      tongNguyenLieuCanSanXuat: tongNguyenLieu,
    }));
  };

  const handleSanPhamDauRaChange = (sanPhamDauRa: string) => {
    const kgNguyenLieuTren1KgThanhPham = selectedMaterialStandard?.kgNguyenLieuTren1KgThanhPham || 0;
    const tiLeSanPham = getTiLeSanPham(sanPhamDauRa, selectedMaterialStandard);
    const tongNguyenLieu = calculateTongNguyenLieu(formData.khoiLuong, kgNguyenLieuTren1KgThanhPham, tiLeSanPham);
    setFormData(prev => ({
      ...prev,
      sanPhamDauRa,
      tongNguyenLieuCanSanXuat: tongNguyenLieu,
    }));
  };

  const handleInputChange = (sectionIndex: number, costIndex: number, field: string, value: string) => {
    const newSections = [...flowchartSections];
    const numValue = parseNumberInput(value);
    (newSections[sectionIndex].costs[costIndex] as any)[field] = numValue;

    // Tự động tính soLuongKeHoach khi thay đổi soLuongNguyenLieu hoặc soPhutThucHien
    if (field === 'soLuongNguyenLieu' || field === 'soPhutThucHien') {
      const cost = newSections[sectionIndex].costs[costIndex];
      const dinhMuc = cost.dinhMucLaoDong;
      const soLuong = cost.soLuongNguyenLieu;
      const soPhut = cost.soPhutThucHien;

      if (dinhMuc && soLuong && soPhut && dinhMuc > 0 && soPhut > 0) {
        const keHoach = soLuong / (dinhMuc * soPhut);
        (newSections[sectionIndex].costs[costIndex] as any).soLuongKeHoach = parseFloat(keHoach.toFixed(2));
      } else {
        (newSections[sectionIndex].costs[costIndex] as any).soLuongKeHoach = undefined;
      }
    }

    setFlowchartSections(newSections);
  };

  const handleSubmit = async () => {
    if (!selectedTemplateId) {
      alert('Vui lòng chọn quy trình mẫu');
      return;
    }

    if (flowchartSections.length === 0) {
      alert('Không có dữ liệu flowchart');
      return;
    }

    const msnv = user?.employeeCode || '';
    const tenNhanVien = user ? `${user.lastName} ${user.firstName}`.trim() : '';

    const data: CreateProductionProcessData = {
      processId: selectedTemplateId,
      msnv,
      tenNhanVien,
      tenQuyTrinhSanXuat: formData.tenQuyTrinhSanXuat,
      maNVSanXuat: formData.maNVSanXuat,
      tenNVSanXuat: formData.tenNVSanXuat,
      khoiLuong: formData.khoiLuong,
      thoiGian: formData.thoiGian,
      materialStandardId: formData.materialStandardId || undefined,
      sanPhamDauRa: formData.sanPhamDauRa || undefined,
      tongNguyenLieuCanSanXuat: formData.tongNguyenLieuCanSanXuat || undefined,
      soGioLamTrong1Ngay: formData.soGioLamTrong1Ngay || undefined,
      flowchart: {
        sections: flowchartSections,
      },
    };

    try {
      setLoading(true);
      if (editingProcess) {
        await productionProcessService.updateProductionProcess(editingProcess.id, data);
        alert('Cập nhật quy trình sản xuất thành công!');
      } else {
        await productionProcessService.createProductionProcess(data);
        alert('Tạo quy trình sản xuất thành công!');
      }
      setIsModalOpen(false);
      loadProductionProcesses();
    } catch (error: any) {
      console.error('Error saving production process:', error);
      alert(error.response?.data?.message || 'Lỗi khi lưu quy trình sản xuất');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProcess = async (process: ProductionProcess) => {
    try {
      const response = await productionProcessService.getProductionProcessById(process.id);
      setViewingProcess(response.data);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error loading process details:', error);
      alert('Lỗi khi tải chi tiết quy trình');
    }
  };

  const handleEditProcess = async (process: ProductionProcess) => {
    try {
      const response = await productionProcessService.getProductionProcessById(process.id);
      const fullProcess = response.data;

      setEditingProcess(fullProcess);
      setSelectedTemplateId(fullProcess.processId);

      // Load material standard nếu có
      if (fullProcess.materialStandardId) {
        const selected = materialStandards.find(ms => ms.id === fullProcess.materialStandardId);
        setSelectedMaterialStandard(selected || null);
      } else {
        setSelectedMaterialStandard(null);
      }

      // Load các trường
      setFormData({
        tenQuyTrinhSanXuat: fullProcess.tenQuyTrinhSanXuat || '',
        maNVSanXuat: fullProcess.maNVSanXuat || '',
        tenNVSanXuat: fullProcess.tenNVSanXuat || '',
        khoiLuong: fullProcess.khoiLuong || 0,
        thoiGian: fullProcess.thoiGian || 0,
        materialStandardId: fullProcess.materialStandardId || '',
        sanPhamDauRa: fullProcess.sanPhamDauRa || '',
        tongNguyenLieuCanSanXuat: fullProcess.tongNguyenLieuCanSanXuat || 0,
        soGioLamTrong1Ngay: fullProcess.soGioLamTrong1Ngay || 0,
      });

      if (fullProcess.flowchart && fullProcess.flowchart.sections) {
        setFlowchartSections(fullProcess.flowchart.sections);
      }

      setIsModalOpen(true);
    } catch (error) {
      console.error('Error loading process for edit:', error);
      alert('Lỗi khi tải quy trình để chỉnh sửa');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa quy trình sản xuất này?')) {
      return;
    }

    try {
      setLoading(true);
      await productionProcessService.deleteProductionProcess(id);
      alert('Xóa quy trình sản xuất thành công!');
      loadProductionProcesses();
    } catch (error: any) {
      console.error('Error deleting production process:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa quy trình sản xuất');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromTemplate = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn đồng bộ quy trình sản xuất này từ quy trình mẫu?\n\nLưu ý:\n- Cấu trúc flowchart (phân đoạn, chi phí, định mức lao động) sẽ được cập nhật từ quy trình mẫu mới nhất.\n- Dữ liệu sản xuất đã nhập (số lượng nguyên liệu, số phút thực hiện, số lượng kế hoạch, số lượng thực tế) sẽ được GIỮ LẠI nếu phân đoạn và loại chi phí vẫn còn trong quy trình mẫu.\n- Các phân đoạn/chi phí mới sẽ có giá trị mặc định là 0.')) {
      return;
    }

    try {
      setLoading(true);
      await productionProcessService.syncFromTemplate(id);
      alert('Đồng bộ quy trình sản xuất từ quy trình mẫu thành công!');
      loadProductionProcesses();
      // Nếu đang xem chi tiết, reload lại
      if (viewingProcess && viewingProcess.id === id) {
        const response = await productionProcessService.getProductionProcessById(id);
        setViewingProcess(response.data);
      }
    } catch (error: any) {
      console.error('Error syncing from template:', error);
      alert(error.response?.data?.message || 'Lỗi khi đồng bộ từ quy trình mẫu');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProcess(null);
    setSelectedTemplateId('');
    setFlowchartSections([]);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingProcess(null);
  };

  const filteredProcesses = productionProcesses.filter(process => {
    const search = filterValues._search.toLowerCase();
    const matchSearch = !search || [
      process.maQuyTrinhSanXuat,
      process.tenQuyTrinhSanXuat,
      process.tenQuyTrinh,
      process.maNVSanXuat,
      process.tenNVSanXuat,
    ].some(v => (v || '').toLowerCase().includes(search));
    const matchMaQTSX = !filterValues.maQuyTrinhSanXuat || (process.maQuyTrinhSanXuat || '').toLowerCase().includes(filterValues.maQuyTrinhSanXuat.toLowerCase());
    const matchTenQTSX = !filterValues.tenQuyTrinhSanXuat || (process.tenQuyTrinhSanXuat || process.tenQuyTrinh || '').toLowerCase().includes(filterValues.tenQuyTrinhSanXuat.toLowerCase());
    const matchMaNV = !filterValues.maNVSanXuat || (process.maNVSanXuat || '').toLowerCase().includes(filterValues.maNVSanXuat.toLowerCase());
    const matchTenNV = !filterValues.tenNVSanXuat || (process.tenNVSanXuat || '').toLowerCase().includes(filterValues.tenNVSanXuat.toLowerCase());
    return matchSearch && matchMaQTSX && matchTenQTSX && matchMaNV && matchTenNV;
  });

  const processFilterFields: FilterField[] = [
    { key: 'maQuyTrinhSanXuat', label: 'Mã QTSX', type: 'text' },
    { key: 'tenQuyTrinhSanXuat', label: 'Tên QTSX', type: 'text' },
    { key: 'maNVSanXuat', label: 'Mã NV', type: 'text' },
    { key: 'tenNVSanXuat', label: 'Mã NV', type: 'text' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Danh sách quy trình sản xuất</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Quản lý quy trình sản xuất thực tế</p>
      </div>

      {/* Action Bar */}
      {canCreate && (
        <div className="mb-4 sm:mb-6 flex justify-stretch sm:justify-end items-center">
          <button
            onClick={handleOpenModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tạo quy trình sản xuất
          </button>
        </div>
      )}

      {/* Filters */}
      <TableFilter
        filters={processFilterFields}
        values={filterValues}
        onChange={(newValues) => { setFilterValues(newValues); setCurrentPage(1); }}
      />

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã QTSX</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên quy trình sản xuất</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã NV</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã NV</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Định mức NVL</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Sản phẩm đầu ra</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Khối lượng (Kg)</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Thời gian (Ngày)</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                filteredProcesses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((process, index) => (
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
                      {process.maQuyTrinhSanXuat}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{process.tenQuyTrinhSanXuat || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">{process.maNVSanXuat || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">{process.tenNVSanXuat || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{process.materialStandard?.tenDinhMuc || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">{process.sanPhamDauRa || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">{process.khoiLuong || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">{process.thoiGian || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleViewProcess(process)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {canCreate && (
                          <>
                            <button
                              onClick={() => handleEditProcess(process)}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleSyncFromTemplate(process.id)}
                              className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-md transition-colors"
                              title="Đồng bộ từ quy trình mẫu"
                            >
                              <RefreshCw className="w-5 h-5" />
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {(() => {
        const totalItems = filteredProcesses.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        return totalPages > 1 ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
            <span className="text-sm text-gray-600">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
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

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-[95vw] sm:w-full flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-start sm:items-center gap-3 shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                {editingProcess ? 'Chỉnh sửa quy trình sản xuất' : 'Tạo quy trình sản xuất mới'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              {/* Template Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn quy trình mẫu <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  disabled={!!editingProcess}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">-- Chọn quy trình mẫu --</option>
                  {templateProcesses
                    .filter((template) => template.loaiQuyTrinh === 'Sản xuất')
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.maQuyTrinh} - {template.tenQuyTrinh}
                      </option>
                    ))}
                </select>
              </div>

              {/* Additional Fields - Row 1 */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên quy trình sản xuất
                  </label>
                  <input
                    type="text"
                    value={formData.tenQuyTrinhSanXuat || ''}
                    onChange={(e) => setFormData({ ...formData, tenQuyTrinhSanXuat: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên quy trình"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mã NV
                  </label>
                  <input
                    type="text"
                    value={formData.maNVSanXuat || ''}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên nhân viên
                  </label>
                  <input
                    type="text"
                    value={formData.tenNVSanXuat || ''}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Khối lượng (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.khoiLuong || ''}
                    onChange={(e) => handleKhoiLuongChange(parseNumberInput(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thời gian (Ngày)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.thoiGian || ''}
                    onChange={(e) => setFormData({ ...formData, thoiGian: parseNumberInput(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Additional Fields - Row 2 (New Fields) */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn Định mức NVL
                  </label>
                  <select
                    value={formData.materialStandardId || ''}
                    onChange={(e) => handleMaterialStandardChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn định mức --</option>
                    {materialStandards.map((standard) => (
                      <option key={standard.id} value={standard.id}>
                        {standard.maDinhMuc} - {standard.tenDinhMuc}
                        {standard.kgNguyenLieuTren1KgThanhPham ? ` (${standard.kgNguyenLieuTren1KgThanhPham} kg NL → 1kg TP)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn sản phẩm đầu ra
                  </label>
                  <select
                    value={formData.sanPhamDauRa || ''}
                    onChange={(e) => handleSanPhamDauRaChange(e.target.value)}
                    disabled={!selectedMaterialStandard}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {selectedMaterialStandard?.items?.map((item, index) => (
                      <option key={index} value={item.tenThanhPham}>
                        {item.tenThanhPham} ({item.tiLe}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tổng nguyên liệu cần sản xuất (Kg)
                  </label>
                  <input
                    type="text"
                    value={formData.tongNguyenLieuCanSanXuat ? formData.tongNguyenLieuCanSanXuat.toFixed(2) : ''}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    placeholder="Tự động tính"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số giờ làm trong 1 ngày
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.soGioLamTrong1Ngay || ''}
                    onChange={(e) => setFormData({ ...formData, soGioLamTrong1Ngay: parseNumberInput(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Flowchart Table */}
              {flowchartSections.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-[1200px] border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">STT</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">PHÂN ĐOẠN</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">NỘI DUNG CÔNG VIỆC</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900 w-40">BIỂU MẪU</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">LOẠI CHI PHÍ</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">TÊN CHI PHÍ</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">ĐVT</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">ĐỊNH MỨC THỰC HIỆN</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">ĐƠN VỊ</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900 bg-green-100">KHỐI LƯỢNG CẦN THỰC HIỆN (Kg)</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900 bg-green-100">SỐ PHÚT THỰC HIỆN</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900 bg-yellow-50">NĂNG SUẤT (ĐVT/phút)</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900 bg-green-100" colSpan={2}>SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ</th>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-3 py-2"></th>
                        <th className="border border-gray-200 px-3 py-2"></th>
                        <th className="border border-gray-200 px-3 py-2"></th>
                        <th className="border border-gray-200 px-3 py-2"></th>
                        <th className="border border-gray-200 px-3 py-2"></th>
                        <th className="border border-gray-200 px-3 py-2"></th>
                        <th className="border border-gray-200 px-3 py-2"></th>
                        <th className="border border-gray-200 px-3 py-2"></th>
                        <th className="border border-gray-200 px-3 py-2"></th>
                        <th className="border border-gray-200 px-3 py-2"></th>
                        <th className="border border-gray-200 px-3 py-2 text-center text-xs text-gray-400">ĐVT/phút</th>
                        <th className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-900 bg-green-50">KẾ HOẠCH</th>
                        <th className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-900 bg-green-50">THỰC TẾ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flowchartSections.map((section, sectionIndex) =>
                        section.costs.length > 0 ? (
                          section.costs.map((cost, costIndex) => (
                            <tr key={`${sectionIndex}-${costIndex}`} className={costIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {costIndex === 0 && (
                                <>
                                  <td className="border border-gray-200 px-3 py-2 text-center font-medium" rowSpan={section.costs.length}>
                                    {section.stt}
                                  </td>
                                  <td className="border border-gray-200 px-3 py-2" rowSpan={section.costs.length}>
                                    <div className="font-semibold">{section.phanDoan}</div>
                                    {section.tenPhanDoan && <div className="text-sm text-gray-600">{section.tenPhanDoan}</div>}
                                  </td>
                                  <td className="border border-gray-200 px-3 py-2 text-sm" rowSpan={section.costs.length}>
                                    {section.noiDungCongViec || '-'}
                                  </td>
                                  <td className="border border-gray-200 px-3 py-2 align-top" rowSpan={section.costs.length}>
                                    <div className="space-y-2">
                                      <FileUpload
                                        files={[]}
                                        onChange={(selectedFiles) => {
                                          if (selectedFiles.length > 0) handleSectionFileUpload(sectionIndex, selectedFiles);
                                        }}
                                        multiple
                                        compact
                                      />
                                      {((section as any).files || []).map((file: any, fileIdx: number) => (
                                        <div key={fileIdx} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                          <span className="text-xs text-gray-500">{fileIdx + 1}.</span>
                                          <span className="text-xs text-gray-700 truncate flex-1">{file.fileName || getFileName(file.url)}</span>
                                          <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(file.url))} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Xem</button>
                                          <button type="button" onClick={() => handlePrintFile(getFullFileUrl(file.url))} className="text-green-600 hover:text-green-800 text-xs font-medium">In</button>
                                          <button type="button" onClick={() => handleSectionFileRemove(sectionIndex, fileIdx)} className="text-red-500 hover:text-red-700 ml-auto"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                      ))}
                                      {section.fileUrl && !((section as any).files || []).some((f: any) => f.url === section.fileUrl) && (
                                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                          <span className="text-xs text-gray-700 truncate flex-1">{getFileName(section.fileUrl)}</span>
                                          <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(section.fileUrl!))} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Xem</button>
                                          <button type="button" onClick={() => handlePrintFile(getFullFileUrl(section.fileUrl!))} className="text-green-600 hover:text-green-800 text-xs font-medium">In</button>
                                          <button type="button" onClick={() => handleSectionFileRemove(sectionIndex)} className="text-red-500 hover:text-red-700 ml-auto"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </>
                              )}
                              <td className="border border-gray-200 px-3 py-2 text-center bg-gray-100">{cost.loaiChiPhi}</td>
                              <td className="border border-gray-200 px-3 py-2 bg-gray-100">{cost.tenChiPhi || '-'}</td>
                              <td className="border border-gray-200 px-3 py-2 text-center bg-gray-100">{cost.donVi || '-'}</td>
                              <td className="border border-gray-200 px-3 py-2 text-center bg-gray-100">
                                {cost.dinhMucLaoDong !== undefined && cost.dinhMucLaoDong !== null ? cost.dinhMucLaoDong : '-'}
                              </td>
                              <td className="border border-gray-200 px-3 py-2 text-center bg-gray-100">
                                {cost.donViDinhMucLaoDong || '-'}
                              </td>
                              {/* Editable fields */}
                              <td className="border border-gray-200 px-3 py-2 text-center bg-green-50">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cost.soLuongNguyenLieu || ''}
                                  onChange={(e) => handleInputChange(sectionIndex, costIndex, 'soLuongNguyenLieu', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                  placeholder="0"
                                />
                              </td>
                              <td className="border border-gray-200 px-3 py-2 text-center bg-green-50">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cost.soPhutThucHien || ''}
                                  onChange={(e) => handleInputChange(sectionIndex, costIndex, 'soPhutThucHien', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                  placeholder="0"
                                />
                              </td>
                              {/* Năng suất thực hiện theo phút — độc lập với dinhMucLaoDong */}
                              <td className="border border-gray-200 px-3 py-2 text-center bg-yellow-50">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={(cost as any).nangSuatTrenPhut || ''}
                                    onChange={(e) => handleInputChange(sectionIndex, costIndex, 'nangSuatTrenPhut', e.target.value)}
                                    className="w-16 px-1 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 text-center text-xs"
                                    placeholder="0"
                                  />
                                  <input
                                    type="text"
                                    list="nang-suat-don-vi-list"
                                    value={(cost as any).donViNangSuat || ''}
                                    onChange={(e) => handleInputChange(sectionIndex, costIndex, 'donViNangSuat', e.target.value)}
                                    className="w-12 px-1 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 text-xs"
                                    placeholder="đvt"
                                  />
                                  <datalist id="nang-suat-don-vi-list">
                                    <option value="kg" />
                                    <option value="cái" />
                                    <option value="lít" />
                                  </datalist>
                                  <span className="text-xs text-gray-400">/ph</span>
                                </div>
                              </td>
                              <td className="border border-gray-200 px-3 py-2 text-center bg-blue-50">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cost.soLuongKeHoach || ''}
                                  onChange={(e) => handleInputChange(sectionIndex, costIndex, 'soLuongKeHoach', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                  placeholder="0"
                                />
                              </td>
                              <td className="border border-gray-200 px-3 py-2 text-center bg-green-50">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cost.soLuongThucTe || ''}
                                  onChange={(e) => handleInputChange(sectionIndex, costIndex, 'soLuongThucTe', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                  placeholder="0"
                                />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr key={sectionIndex}>
                            <td className="border border-gray-200 px-3 py-2 text-center">{section.stt}</td>
                            <td className="border border-gray-200 px-3 py-2">{section.phanDoan}</td>
                            <td className="border border-gray-200 px-3 py-2">{section.noiDungCongViec || '-'}</td>
                            <td className="border border-gray-200 px-3 py-2 align-top">
                              <div className="space-y-2">
                                <FileUpload
                                  files={[]}
                                  onChange={(files) => {
                                    if (files[0]) handleSectionFileUpload(sectionIndex, files[0]);
                                  }}
                                  compact
                                />
                                {((section as any).files || []).map((file: any, fileIdx: number) => (
                                  <div key={fileIdx} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                    <span className="text-xs text-gray-500">{fileIdx + 1}.</span>
                                    <span className="text-xs text-gray-700 truncate flex-1">{file.fileName || getFileName(file.url)}</span>
                                    <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(file.url))} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Xem</button>
                                    <button type="button" onClick={() => handlePrintFile(getFullFileUrl(file.url))} className="text-green-600 hover:text-green-800 text-xs font-medium">In</button>
                                    <button type="button" onClick={() => handleSectionFileRemove(sectionIndex, fileIdx)} className="text-red-500 hover:text-red-700 ml-auto"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))}
                                {section.fileUrl && !((section as any).files || []).some((f: any) => f.url === section.fileUrl) && (
                                  <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                                    <span className="text-xs text-gray-700 truncate flex-1">{getFileName(section.fileUrl)}</span>
                                    <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(section.fileUrl!))} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Xem</button>
                                    <button type="button" onClick={() => handlePrintFile(getFullFileUrl(section.fileUrl!))} className="text-green-600 hover:text-green-800 text-xs font-medium">In</button>
                                    <button type="button" onClick={() => handleSectionFileRemove(sectionIndex)} className="text-red-500 hover:text-red-700 ml-auto"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-center text-gray-400" colSpan={9}>Không có chi phí</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 shrink-0">
              <button
                onClick={handleCloseModal}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !selectedTemplateId || flowchartSections.length === 0}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang lưu...' : editingProcess ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen && !!viewingProcess} onClose={handleCloseViewModal} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-[95vw] sm:w-full flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-start sm:items-center gap-3 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">Chi tiết quy trình sản xuất</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Mã: <span className="font-semibold text-blue-600">{viewingProcess?.maQuyTrinhSanXuat}</span> |
                  Tên: <span className="font-semibold">{viewingProcess?.tenQuyTrinh}</span>
                </p>
              </div>
              <button onClick={handleCloseViewModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            {/* Nút xuất Excel */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2 flex justify-stretch sm:justify-end shrink-0">
              <button
                onClick={async () => {
                  if (!viewingProcess) return;
                  try {
                    await productionProcessService.exportToExcel(viewingProcess.id);
                  } catch (error) {
                    console.error('Error exporting to Excel:', error);
                    alert('Lỗi khi xuất file Excel');
                  }
                }}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              {viewingProcess && (<>
              {/* Thông tin tổng quan */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên quy trình sản xuất</label>
                  <p className="text-sm text-gray-900">{viewingProcess.tenQuyTrinhSanXuat || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã NV</label>
                  <p className="text-sm text-gray-900">{viewingProcess.maNVSanXuat || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhân viên</label>
                  <p className="text-sm text-gray-900">{viewingProcess.tenNVSanXuat || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khối lượng (Kg)</label>
                  <p className="text-sm text-gray-900">{viewingProcess.khoiLuong || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Định mức NVL</label>
                  <p className="text-sm text-gray-900">
                    {viewingProcess.materialStandard?.tenDinhMuc || '-'}
                    {viewingProcess.materialStandard?.kgNguyenLieuTren1KgThanhPham && (
                      <span className="text-gray-600"> ({viewingProcess.materialStandard.kgNguyenLieuTren1KgThanhPham} kg NL → 1kg TP)</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm đầu ra</label>
                  <p className="text-sm text-gray-900">
                    {viewingProcess.sanPhamDauRa || '-'}
                    {viewingProcess.sanPhamDauRa && viewingProcess.materialStandard && (() => {
                      const tiLe = getTiLeSanPham(viewingProcess.sanPhamDauRa, viewingProcess.materialStandard);
                      return tiLe > 0 ? <span className="text-gray-600"> ({tiLe}%)</span> : null;
                    })()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tổng nguyên liệu cần sản xuất (Kg)</label>
                  <p className="text-sm text-gray-900">
                    {viewingProcess.tongNguyenLieuCanSanXuat
                      ? viewingProcess.tongNguyenLieuCanSanXuat.toFixed(2)
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số giờ làm trong 1 ngày</label>
                  <p className="text-sm text-gray-900">
                    {viewingProcess.soGioLamTrong1Ngay
                      ? viewingProcess.soGioLamTrong1Ngay.toFixed(2)
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (Ngày)</label>
                  <p className="text-sm text-gray-900">
                    {viewingProcess.thoiGian
                      ? viewingProcess.thoiGian.toFixed(2)
                      : '-'}
                  </p>
                </div>
              </div>

              {viewingProcess.flowchart && viewingProcess.flowchart.sections && viewingProcess.flowchart.sections.length > 0 ? (
                (() => {
                  const visibleCostColumns = getVisibleProductionCostColumns(viewingProcess.flowchart!.sections);
                  const regularCostColumns = visibleCostColumns.filter(column => column.group !== 'laborQuantity');
                  const laborQuantityColumns = visibleCostColumns.filter(column => column.group === 'laborQuantity');
                  const baseColumnCount = 4;

                  return (
                <div className="overflow-x-auto">
                  <table className="min-w-[1200px] border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">STT</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">PHÂN ĐOẠN</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">NỘI DUNG CÔNG VIỆC</th>
                        <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900 w-28">BIỂU MẪU</th>
                        {regularCostColumns.map(column => (
                          <th key={column.key} className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900">
                            {column.label}
                          </th>
                        ))}
                        {laborQuantityColumns.length > 0 && (
                          <th className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold text-gray-900" colSpan={laborQuantityColumns.length}>
                            SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ
                          </th>
                        )}
                      </tr>
                      {laborQuantityColumns.length > 0 && (
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-3 py-2" colSpan={baseColumnCount + regularCostColumns.length}></th>
                          {laborQuantityColumns.map(column => (
                            <th key={column.key} className="border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-900">
                              {column.subLabel}
                            </th>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {viewingProcess.flowchart.sections.map((section, sectionIndex) =>
                        section.costs.length > 0 ? (
                          section.costs.map((cost, costIndex) => (
                            <tr key={`${sectionIndex}-${costIndex}`} className={costIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {costIndex === 0 && (
                                <>
                                  <td className="border border-gray-200 px-3 py-2 text-center font-medium" rowSpan={section.costs.length}>
                                    {section.stt}
                                  </td>
                                  <td className="border border-gray-200 px-3 py-2" rowSpan={section.costs.length}>
                                    <div className="font-semibold">{section.phanDoan}</div>
                                    {section.tenPhanDoan && <div className="text-sm text-gray-600">{section.tenPhanDoan}</div>}
                                  </td>
                                  <td className="border border-gray-200 px-3 py-2 text-sm" rowSpan={section.costs.length}>
                                    {section.noiDungCongViec || '-'}
                                  </td>
                                  <td className="border border-gray-200 px-3 py-2 text-center align-top" rowSpan={section.costs.length}>
                                    {((section as any).files && (section as any).files.length > 0) ? (
                                      <div className="flex flex-col items-center gap-1">
                                        {(section as any).files.map((file: any, fileIdx: number) => (
                                          <div key={fileIdx} className="flex items-center gap-1">
                                            <span className="text-xs text-gray-600">{fileIdx + 1}.</span>
                                            <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(file.url))} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Xem</button>
                                            <button type="button" onClick={() => handlePrintFile(getFullFileUrl(file.url))} className="text-green-600 hover:text-green-800 text-xs font-medium">In</button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : section.fileUrl ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(section.fileUrl!))} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Xem</button>
                                        <button type="button" onClick={() => handlePrintFile(getFullFileUrl(section.fileUrl!))} className="text-green-600 hover:text-green-800 text-xs font-medium">In</button>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </td>
                                </>
                              )}
                              {visibleCostColumns.map(column => (
                                <td key={column.key} className={`border border-gray-200 px-3 py-2 ${column.className || ''}`}>
                                  {formatCostCellValue(cost[column.key])}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr key={sectionIndex}>
                            <td className="border border-gray-200 px-3 py-2 text-center">{section.stt}</td>
                            <td className="border border-gray-200 px-3 py-2">{section.phanDoan}</td>
                            <td className="border border-gray-200 px-3 py-2">{section.noiDungCongViec || '-'}</td>
                            <td className="border border-gray-200 px-3 py-2 text-center">
                              {((section as any).files && (section as any).files.length > 0) ? (
                                <div className="flex flex-col items-center gap-1">
                                  {(section as any).files.map((file: any, fileIdx: number) => (
                                    <div key={fileIdx} className="flex items-center gap-1">
                                      <span className="text-xs text-gray-600">{fileIdx + 1}.</span>
                                      <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(file.url))} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Xem</button>
                                      <button type="button" onClick={() => handlePrintFile(getFullFileUrl(file.url))} className="text-green-600 hover:text-green-800 text-xs font-medium">In</button>
                                    </div>
                                  ))}
                                </div>
                              ) : section.fileUrl ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(section.fileUrl!))} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Xem</button>
                                  <button type="button" onClick={() => handlePrintFile(getFullFileUrl(section.fileUrl!))} className="text-green-600 hover:text-green-800 text-xs font-medium">In</button>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            {visibleCostColumns.length > 0 && (
                              <td className="border border-gray-200 px-3 py-2 text-center text-gray-400" colSpan={visibleCostColumns.length}>
                                Không có chi phí
                              </td>
                            )}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
                  );
                })()
              ) : (
                <p className="text-center text-gray-500 py-8">Không có dữ liệu flowchart</p>
              )}
              </>)}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 shrink-0">
              <button
                onClick={handleCloseViewModal}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              {canCreate && (
                <button
                  onClick={() => {
                    handleCloseViewModal();
                    if (viewingProcess) handleEditProcess(viewingProcess);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Chỉnh sửa
                </button>
              )}
            </div>
          </div>
        </Modal>

        {/* File Preview Modal */}
        <Modal isOpen={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} showBackdrop closeOnBackdrop={true}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {previewFileUrl && (
              <>
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
              </>
            )}
          </div>
        </Modal>
    </div>
  );
};

export default ProductionProcessManagement;
