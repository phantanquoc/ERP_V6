import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, X, RefreshCw } from 'lucide-react';
import productionProcessService, { ProductionProcess, CreateProductionProcessData, ProductionFlowchartSection } from '../services/productionProcessService';
import processService, { Process } from '../services/processService';
import materialStandardService, { MaterialStandard } from '../services/materialStandardService';
import { useAuth } from '../contexts/AuthContext';

const ProductionProcessManagement: React.FC = () => {
  const { user } = useAuth();
  const [productionProcesses, setProductionProcesses] = useState<ProductionProcess[]>([]);
  const [templateProcesses, setTemplateProcesses] = useState<Process[]>([]);
  const [materialStandards, setMaterialStandards] = useState<MaterialStandard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  useEffect(() => {
    loadProductionProcesses();
    loadTemplateProcesses();
    loadMaterialStandards();
  }, [currentPage]);

  const loadProductionProcesses = async () => {
    setLoading(true);
    try {
      const response = await productionProcessService.getAllProductionProcesses(currentPage, 10);
      setProductionProcesses(response.data);
      setTotalPages(response.pagination.totalPages);
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
      tenNVSanXuat: user ? `${user.firstName} ${user.lastName}`.trim() : '',
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
  const calculateTongNguyenLieu = (khoiLuong: number, tiLeThuHoi: number, tiLeSanPham: number): number => {
    // Công thức: Tổng nguyên liệu = Khối lượng đầu ra sản phẩm / (Tỉ lệ thu hồi / 100) / (% sản phẩm đầu ra / 100)
    if (tiLeThuHoi > 0 && tiLeSanPham > 0) {
      return khoiLuong / (tiLeThuHoi / 100) / (tiLeSanPham / 100);
    }
    return 0;
  };

  const handleKhoiLuongChange = (khoiLuong: number) => {
    const tiLeThuHoi = selectedMaterialStandard?.tiLeThuHoi || 0;
    const tiLeSanPham = getTiLeSanPham(formData.sanPhamDauRa, selectedMaterialStandard);
    const tongNguyenLieu = calculateTongNguyenLieu(khoiLuong, tiLeThuHoi, tiLeSanPham);
    setFormData(prev => ({
      ...prev,
      khoiLuong,
      tongNguyenLieuCanSanXuat: tongNguyenLieu,
    }));
  };

  const handleSanPhamDauRaChange = (sanPhamDauRa: string) => {
    const tiLeThuHoi = selectedMaterialStandard?.tiLeThuHoi || 0;
    const tiLeSanPham = getTiLeSanPham(sanPhamDauRa, selectedMaterialStandard);
    const tongNguyenLieu = calculateTongNguyenLieu(formData.khoiLuong, tiLeThuHoi, tiLeSanPham);
    setFormData(prev => ({
      ...prev,
      sanPhamDauRa,
      tongNguyenLieuCanSanXuat: tongNguyenLieu,
    }));
  };

  const handleInputChange = (sectionIndex: number, costIndex: number, field: string, value: string) => {
    const newSections = [...flowchartSections];
    const numValue = parseFloat(value) || 0;
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
    const tenNhanVien = user ? `${user.firstName} ${user.lastName}`.trim() : '';

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
    if (!window.confirm('Bạn có chắc chắn muốn đồng bộ quy trình sản xuất này từ quy trình mẫu?\n\nLưu ý: Dữ liệu flowchart hiện tại sẽ được thay thế bằng dữ liệu mới nhất từ quy trình mẫu. Các trường số lượng nguyên liệu, số phút thực hiện, số lượng kế hoạch, số lượng thực tế sẽ được reset về 0.')) {
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

  const filteredProcesses = productionProcesses.filter(process =>
    process.maQuyTrinhSanXuat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    process.tenQuyTrinh.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Danh sách quy trình sản xuất</h2>
        <p className="text-gray-600 mt-1">Quản lý quy trình sản xuất thực tế</p>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã hoặc tên quy trình..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Tạo quy trình sản xuất
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã QTSX</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên quy trình sản xuất</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã NV</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên nhân viên</th>
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
                filteredProcesses.map((process, index) => (
                  <tr
                    key={process.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {(currentPage - 1) * 10 + index + 1}
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
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Trước
          </button>
          <span className="px-4 py-2">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Sau
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingProcess ? 'Chỉnh sửa quy trình sản xuất' : 'Tạo quy trình sản xuất mới'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
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
                  {templateProcesses.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.maQuyTrinh} - {template.tenQuyTrinh}
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Fields - Row 1 */}
              <div className="mb-6 grid grid-cols-5 gap-4">
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
                    onChange={(e) => handleKhoiLuongChange(parseFloat(e.target.value) || 0)}
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
                    onChange={(e) => setFormData({ ...formData, thoiGian: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Additional Fields - Row 2 (New Fields) */}
              <div className="mb-6 grid grid-cols-4 gap-4">
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
                        {standard.tiLeThuHoi ? ` (Tỉ lệ thu hồi: ${standard.tiLeThuHoi}%)` : ''}
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
                    onChange={(e) => setFormData({ ...formData, soGioLamTrong1Ngay: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Flowchart Table */}
              {flowchartSections.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-400">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">STT</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">PHÂN ĐOẠN</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">NỘI DUNG CÔNG VIỆC</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">LOẠI CHI PHÍ</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">TÊN CHI PHÍ</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">ĐVT</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">ĐỊNH MỨC LAO ĐỘNG</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">ĐƠN VỊ</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold bg-green-100">SỐ LƯỢNG NGUYÊN LIỆU (Kg)</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold bg-green-100">SỐ PHÚT THỰC HIỆN</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold bg-green-100" colSpan={2}>SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ</th>
                      </tr>
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
                        <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold bg-green-100">KẾ HOẠCH</th>
                        <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold bg-green-100">THỰC TẾ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flowchartSections.map((section, sectionIndex) =>
                        section.costs.length > 0 ? (
                          section.costs.map((cost, costIndex) => (
                            <tr key={`${sectionIndex}-${costIndex}`} className={costIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {costIndex === 0 && (
                                <>
                                  <td className="border border-gray-400 px-3 py-2 text-center font-medium" rowSpan={section.costs.length}>
                                    {section.stt}
                                  </td>
                                  <td className="border border-gray-400 px-3 py-2" rowSpan={section.costs.length}>
                                    <div className="font-semibold">{section.phanDoan}</div>
                                    {section.tenPhanDoan && <div className="text-sm text-gray-600">{section.tenPhanDoan}</div>}
                                  </td>
                                  <td className="border border-gray-400 px-3 py-2 text-sm" rowSpan={section.costs.length}>
                                    {section.noiDungCongViec || '-'}
                                  </td>
                                </>
                              )}
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">{cost.loaiChiPhi}</td>
                              <td className="border border-gray-400 px-3 py-2 bg-gray-100">{cost.tenChiPhi || '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">{cost.donVi || '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                                {cost.dinhMucLaoDong !== undefined && cost.dinhMucLaoDong !== null ? cost.dinhMucLaoDong : '-'}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                                {cost.donViDinhMucLaoDong || '-'}
                              </td>
                              {/* Editable fields */}
                              <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
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
                              <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
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
                              <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50">
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
                              <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
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
                            <td className="border border-gray-400 px-3 py-2 text-center">{section.stt}</td>
                            <td className="border border-gray-400 px-3 py-2">{section.phanDoan}</td>
                            <td className="border border-gray-400 px-3 py-2" colSpan={10}>Không có chi phí</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !selectedTemplateId || flowchartSections.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang lưu...' : editingProcess ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewingProcess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Chi tiết quy trình sản xuất</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Mã: <span className="font-semibold text-blue-600">{viewingProcess.maQuyTrinhSanXuat}</span> |
                  Tên: <span className="font-semibold">{viewingProcess.tenQuyTrinh}</span>
                </p>
              </div>
              <button onClick={handleCloseViewModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Thông tin tổng quan */}
              <div className="mb-6 grid grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
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
                    {viewingProcess.materialStandard?.tiLeThuHoi && (
                      <span className="text-gray-600"> (Tỉ lệ thu hồi: {viewingProcess.materialStandard.tiLeThuHoi}%)</span>
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
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-400">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">STT</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">PHÂN ĐOẠN</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">NỘI DUNG CÔNG VIỆC</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">LOẠI CHI PHÍ</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">TÊN CHI PHÍ</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">ĐVT</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">ĐỊNH MỨC LAO ĐỘNG</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">ĐƠN VỊ</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">SỐ LƯỢNG NGUYÊN LIỆU (Kg)</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold">SỐ PHÚT THỰC HIỆN</th>
                        <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ</th>
                      </tr>
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
                        <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">KẾ HOẠCH</th>
                        <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">THỰC TẾ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingProcess.flowchart.sections.map((section, sectionIndex) =>
                        section.costs.length > 0 ? (
                          section.costs.map((cost, costIndex) => (
                            <tr key={`${sectionIndex}-${costIndex}`} className={costIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {costIndex === 0 && (
                                <>
                                  <td className="border border-gray-400 px-3 py-2 text-center font-medium" rowSpan={section.costs.length}>
                                    {section.stt}
                                  </td>
                                  <td className="border border-gray-400 px-3 py-2" rowSpan={section.costs.length}>
                                    <div className="font-semibold">{section.phanDoan}</div>
                                    {section.tenPhanDoan && <div className="text-sm text-gray-600">{section.tenPhanDoan}</div>}
                                  </td>
                                  <td className="border border-gray-400 px-3 py-2 text-sm" rowSpan={section.costs.length}>
                                    {section.noiDungCongViec || '-'}
                                  </td>
                                </>
                              )}
                              <td className="border border-gray-400 px-3 py-2 text-center">{cost.loaiChiPhi}</td>
                              <td className="border border-gray-400 px-3 py-2">{cost.tenChiPhi || '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center">{cost.donVi || '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center">
                                {cost.dinhMucLaoDong !== undefined && cost.dinhMucLaoDong !== null ? cost.dinhMucLaoDong : '-'}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center">
                                {cost.donViDinhMucLaoDong || '-'}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center">
                                {cost.soLuongNguyenLieu !== undefined && cost.soLuongNguyenLieu !== null ? cost.soLuongNguyenLieu : '-'}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center">
                                {cost.soPhutThucHien !== undefined && cost.soPhutThucHien !== null ? cost.soPhutThucHien : '-'}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">
                                {cost.soLuongKeHoach !== undefined && cost.soLuongKeHoach !== null ? cost.soLuongKeHoach.toFixed(2) : '-'}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center">
                                {cost.soLuongThucTe !== undefined && cost.soLuongThucTe !== null ? cost.soLuongThucTe : '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr key={sectionIndex}>
                            <td className="border border-gray-400 px-3 py-2 text-center">{section.stt}</td>
                            <td className="border border-gray-400 px-3 py-2">{section.phanDoan}</td>
                            <td className="border border-gray-400 px-3 py-2" colSpan={10}>Không có chi phí</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Không có dữ liệu flowchart</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseViewModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  handleCloseViewModal();
                  handleEditProcess(viewingProcess);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionProcessManagement;

