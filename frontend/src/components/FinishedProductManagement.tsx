import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, FileText } from 'lucide-react';
import finishedProductService, { FinishedProduct } from '../services/finishedProductService';
import machineService, { Machine } from '../services/machineService';
import FinishedProductModal from './FinishedProductModal';
import FinishedProductViewModal from './FinishedProductViewModal';
import { useAuth } from '../contexts/AuthContext';

const FinishedProductManagement: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Get current user's full name
  const currentUserName = user ? `${user.firstName} ${user.lastName}`.trim() : '';

  const [formData, setFormData] = useState({
    maChien: '',
    thoiGianChien: '',
    tenHangHoa: '',
    khoiLuong: 0,
    aKhoiLuong: 0,
    aTiLe: 0,
    bKhoiLuong: 0,
    bTiLe: 0,
    bDauKhoiLuong: 0,
    bDauTiLe: 0,
    cKhoiLuong: 0,
    cTiLe: 0,
    vunLonKhoiLuong: 0,
    vunLonTiLe: 0,
    vunNhoKhoiLuong: 0,
    vunNhoTiLe: 0,
    phePhamKhoiLuong: 0,
    phePhamTiLe: 0,
    uotKhoiLuong: 0,
    uotTiLe: 0,
    fileDinhKem: '',
    nguoiThucHien: '',
  });

  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    if (selectedMachine) {
      loadProducts();
    }
  }, [selectedMachine, currentPage]);

  const loadMachines = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await machineService.getAllMachines(1, 100);
      setMachines(result.data);

      // Set first machine as selected if available
      if (result.data.length > 0 && !selectedMachine) {
        setSelectedMachine(result.data[0].tenMay);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách máy');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await finishedProductService.getAllFinishedProducts(currentPage, 1000, selectedMachine);
      setProducts(result.data);
      setTotalPages(result.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (datetime: string) => {
    if (!datetime) return '';
    try {
      const date = new Date(datetime);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return datetime;
    }
  };

  const handleOpenModal = (product?: FinishedProduct) => {
    if (product) {
      setIsEditing(true);
      setSelectedProduct(product);

      // Convert datetime to display format for edit modal
      let thoiGianChienFormatted = product.thoiGianChien;
      if (product.thoiGianChien) {
        try {
          const date = new Date(product.thoiGianChien);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          thoiGianChienFormatted = `${hours}:${minutes} ${day}/${month}/${year}`;
        } catch {
          thoiGianChienFormatted = product.thoiGianChien;
        }
      }

      setFormData({
        maChien: product.maChien,
        thoiGianChien: thoiGianChienFormatted,
        tenHangHoa: product.tenHangHoa,
        khoiLuong: product.khoiLuong,
        aKhoiLuong: product.aKhoiLuong,
        aTiLe: product.aTiLe,
        bKhoiLuong: product.bKhoiLuong,
        bTiLe: product.bTiLe,
        bDauKhoiLuong: product.bDauKhoiLuong,
        bDauTiLe: product.bDauTiLe,
        cKhoiLuong: product.cKhoiLuong,
        cTiLe: product.cTiLe,
        vunLonKhoiLuong: product.vunLonKhoiLuong,
        vunLonTiLe: product.vunLonTiLe,
        vunNhoKhoiLuong: product.vunNhoKhoiLuong,
        vunNhoTiLe: product.vunNhoTiLe,
        phePhamKhoiLuong: product.phePhamKhoiLuong,
        phePhamTiLe: product.phePhamTiLe,
        uotKhoiLuong: product.uotKhoiLuong,
        uotTiLe: product.uotTiLe,
        fileDinhKem: product.fileDinhKem || '',
        nguoiThucHien: product.nguoiThucHien || currentUserName,
      });
    } else {
      setIsEditing(false);
      setSelectedProduct(null);
      setFormData({
        maChien: '',
        thoiGianChien: '',
        tenHangHoa: '',
        khoiLuong: 0,
        aKhoiLuong: 0,
        aTiLe: 0,
        bKhoiLuong: 0,
        bTiLe: 0,
        bDauKhoiLuong: 0,
        bDauTiLe: 0,
        cKhoiLuong: 0,
        cTiLe: 0,
        vunLonKhoiLuong: 0,
        vunLonTiLe: 0,
        vunNhoKhoiLuong: 0,
        vunNhoTiLe: 0,
        phePhamKhoiLuong: 0,
        phePhamTiLe: 0,
        uotKhoiLuong: 0,
        uotTiLe: 0,
        fileDinhKem: '',
        nguoiThucHien: currentUserName,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setSelectedProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      // Remove nguoiThucHien from formData to let backend auto-fill from logged-in user
      const { nguoiThucHien, ...dataToSubmit } = formData;

      if (isEditing && selectedProduct) {
        await finishedProductService.updateFinishedProduct(selectedProduct.id, dataToSubmit);
      } else {
        await finishedProductService.createFinishedProduct(dataToSubmit);
      }

      await loadProducts();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thành phẩm này?')) {
      try {
        setLoading(true);
        setError('');
        await finishedProductService.deleteFinishedProduct(id);
        await loadProducts();
      } catch (err: any) {
        setError(err.message || 'Lỗi xóa dữ liệu');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleView = (product: FinishedProduct) => {
    setSelectedProduct(product);
    setIsViewModalOpen(true);
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Quản lý Thành phẩm đầu ra</h2>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Machine Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {machines.map((machine) => (
              <button
                key={machine.id}
                onClick={() => setSelectedMachine(machine.tenMay)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${selectedMachine === machine.tenMay
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {machine.tenMay}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã chiên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Thời gian chiên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên hàng hóa</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Khối lượng (kg)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Người thực hiện</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Chưa có dữ liệu
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                  <tr
                    key={product.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {(currentPage - 1) * 10 + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {product.maChien}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {formatDateTime(product.thoiGianChien)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {product.tenHangHoa}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                      {product.khoiLuong}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {product.nguoiThucHien}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleView(product)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Sửa"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
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
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <span className="text-sm text-gray-700">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <FinishedProductModal
        isOpen={isModalOpen}
        isEditing={isEditing}
        formData={formData}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onChange={handleFormChange}
      />

      <FinishedProductViewModal
        isOpen={isViewModalOpen}
        product={selectedProduct}
        onClose={() => setIsViewModalOpen(false)}
      />
    </div>
  );
};

export default FinishedProductManagement;

