import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, Eye, FileText, X } from 'lucide-react';
import finishedProductService, { FinishedProduct } from '../services/finishedProductService';
import machineService, { Machine } from '../services/machineService';
import FinishedProductModal from './FinishedProductModal';
import FinishedProductViewModal from './FinishedProductViewModal';
import { useAuth } from '../contexts/AuthContext';

// Special constant for "Tổng các máy" tab
const TOTAL_ALL_MACHINES = '__TOTAL_ALL_MACHINES__';

const FinishedProductManagement: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<FinishedProduct[]>([]); // All products from all machines
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

  // Load all products when "Tổng các máy" tab is selected
  useEffect(() => {
    if (selectedMachine === TOTAL_ALL_MACHINES) {
      loadAllProducts();
    }
  }, [selectedMachine]);

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
    if (selectedMachine === TOTAL_ALL_MACHINES) {
      return; // Skip loading for total tab, handled separately
    }
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

  // Load all products from all machines for "Tổng các máy" tab
  const loadAllProducts = async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch all products without machine filter
      const result = await finishedProductService.getAllFinishedProducts(1, 10000);
      setAllProducts(result.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu tổng hợp');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Interface for machine evaluation (min/max rate)
  interface MachineEvaluation {
    tenMay: string;
    tiLe: number;
  }

  // Interface for product type evaluation
  interface ProductTypeEvaluation {
    min: MachineEvaluation | null;
    max: MachineEvaluation | null;
  }

  // Interface for all evaluations
  interface AllEvaluations {
    a: ProductTypeEvaluation;
    b: ProductTypeEvaluation;
    bDau: ProductTypeEvaluation;
    c: ProductTypeEvaluation;
    vunLon: ProductTypeEvaluation;
    vunNho: ProductTypeEvaluation;
    phePham: ProductTypeEvaluation;
    uot: ProductTypeEvaluation;
  }

  // Interface for aggregated product by maChien
  interface AggregatedProduct {
    maChien: string;
    thoiGianChien: string;
    tenHangHoa: string;
    khoiLuong: number;
    nguoiThucHien: string;
    aKhoiLuong: number;
    bKhoiLuong: number;
    bDauKhoiLuong: number;
    cKhoiLuong: number;
    vunLonKhoiLuong: number;
    vunNhoKhoiLuong: number;
    phePhamKhoiLuong: number;
    uotKhoiLuong: number;
    tongKhoiLuong: number;
    aTiLe: number;
    bTiLe: number;
    bDauTiLe: number;
    cTiLe: number;
    vunLonTiLe: number;
    vunNhoTiLe: number;
    phePhamTiLe: number;
    uotTiLe: number;
    machineCount: number;
    evaluations: AllEvaluations;
  }

  // Aggregate products by maChien for "Tổng các máy" tab
  const aggregatedByMaChien = useMemo((): AggregatedProduct[] => {
    if (selectedMachine !== TOTAL_ALL_MACHINES || allProducts.length === 0) {
      return [];
    }

    // Group products by maChien
    const groupedMap = new Map<string, FinishedProduct[]>();
    allProducts.forEach((product) => {
      const existing = groupedMap.get(product.maChien) || [];
      existing.push(product);
      groupedMap.set(product.maChien, existing);
    });

    // Helper function to find min/max machine for a specific rate type
    const findMinMaxMachine = (
      products: FinishedProduct[],
      getRateValue: (p: FinishedProduct) => number
    ): ProductTypeEvaluation => {
      if (products.length === 0) return { min: null, max: null };

      let minMachine: MachineEvaluation | null = null;
      let maxMachine: MachineEvaluation | null = null;

      products.forEach((p) => {
        const tiLe = getRateValue(p);
        const tenMay = p.tenMay || 'Không xác định';

        if (minMachine === null || tiLe < minMachine.tiLe) {
          minMachine = { tenMay, tiLe };
        }
        if (maxMachine === null || tiLe > maxMachine.tiLe) {
          maxMachine = { tenMay, tiLe };
        }
      });

      return { min: minMachine, max: maxMachine };
    };

    // Calculate aggregated values for each maChien
    const result: AggregatedProduct[] = [];
    groupedMap.forEach((products, maChien) => {
      const totals = {
        khoiLuong: 0,
        aKhoiLuong: 0,
        bKhoiLuong: 0,
        bDauKhoiLuong: 0,
        cKhoiLuong: 0,
        vunLonKhoiLuong: 0,
        vunNhoKhoiLuong: 0,
        phePhamKhoiLuong: 0,
        uotKhoiLuong: 0,
      };

      products.forEach((p) => {
        totals.khoiLuong += p.khoiLuong || 0;
        totals.aKhoiLuong += p.aKhoiLuong || 0;
        totals.bKhoiLuong += p.bKhoiLuong || 0;
        totals.bDauKhoiLuong += p.bDauKhoiLuong || 0;
        totals.cKhoiLuong += p.cKhoiLuong || 0;
        totals.vunLonKhoiLuong += p.vunLonKhoiLuong || 0;
        totals.vunNhoKhoiLuong += p.vunNhoKhoiLuong || 0;
        totals.phePhamKhoiLuong += p.phePhamKhoiLuong || 0;
        totals.uotKhoiLuong += p.uotKhoiLuong || 0;
      });

      const tongKhoiLuong =
        totals.aKhoiLuong +
        totals.bKhoiLuong +
        totals.bDauKhoiLuong +
        totals.cKhoiLuong +
        totals.vunLonKhoiLuong +
        totals.vunNhoKhoiLuong +
        totals.phePhamKhoiLuong +
        totals.uotKhoiLuong;

      const calculatePercentage = (value: number) => {
        if (tongKhoiLuong === 0) return 0;
        return Number(((value / tongKhoiLuong) * 100).toFixed(2));
      };

      // Calculate evaluations for each product type
      const evaluations: AllEvaluations = {
        a: findMinMaxMachine(products, (p) => p.aTiLe || 0),
        b: findMinMaxMachine(products, (p) => p.bTiLe || 0),
        bDau: findMinMaxMachine(products, (p) => p.bDauTiLe || 0),
        c: findMinMaxMachine(products, (p) => p.cTiLe || 0),
        vunLon: findMinMaxMachine(products, (p) => p.vunLonTiLe || 0),
        vunNho: findMinMaxMachine(products, (p) => p.vunNhoTiLe || 0),
        phePham: findMinMaxMachine(products, (p) => p.phePhamTiLe || 0),
        uot: findMinMaxMachine(products, (p) => p.uotTiLe || 0),
      };

      // Use first product's info for display
      const firstProduct = products[0];
      result.push({
        maChien,
        thoiGianChien: firstProduct.thoiGianChien,
        tenHangHoa: firstProduct.tenHangHoa,
        nguoiThucHien: firstProduct.nguoiThucHien,
        khoiLuong: totals.khoiLuong,
        aKhoiLuong: totals.aKhoiLuong,
        bKhoiLuong: totals.bKhoiLuong,
        bDauKhoiLuong: totals.bDauKhoiLuong,
        cKhoiLuong: totals.cKhoiLuong,
        vunLonKhoiLuong: totals.vunLonKhoiLuong,
        vunNhoKhoiLuong: totals.vunNhoKhoiLuong,
        phePhamKhoiLuong: totals.phePhamKhoiLuong,
        uotKhoiLuong: totals.uotKhoiLuong,
        tongKhoiLuong,
        aTiLe: calculatePercentage(totals.aKhoiLuong),
        bTiLe: calculatePercentage(totals.bKhoiLuong),
        bDauTiLe: calculatePercentage(totals.bDauKhoiLuong),
        cTiLe: calculatePercentage(totals.cKhoiLuong),
        vunLonTiLe: calculatePercentage(totals.vunLonKhoiLuong),
        vunNhoTiLe: calculatePercentage(totals.vunNhoKhoiLuong),
        phePhamTiLe: calculatePercentage(totals.phePhamKhoiLuong),
        uotTiLe: calculatePercentage(totals.uotKhoiLuong),
        machineCount: products.length,
        evaluations,
      });
    });

    // Sort by thoiGianChien descending
    result.sort((a, b) => new Date(b.thoiGianChien).getTime() - new Date(a.thoiGianChien).getTime());
    return result;
  }, [selectedMachine, allProducts]);

  // State for viewing aggregated product detail
  const [selectedAggregatedProduct, setSelectedAggregatedProduct] = useState<AggregatedProduct | null>(null);
  const [isAggregatedViewModalOpen, setIsAggregatedViewModalOpen] = useState(false);

  const handleViewAggregated = (product: AggregatedProduct) => {
    setSelectedAggregatedProduct(product);
    setIsAggregatedViewModalOpen(true);
  };

  const formatDateTime = (datetime: string) => {
    if (!datetime) return '-';
    try {
      // Handle different datetime formats
      let date: Date;

      // Check if it's an ISO string (contains 'T' and possibly 'Z' or timezone)
      if (datetime.includes('T')) {
        date = new Date(datetime);
      } else if (datetime.includes('/')) {
        // Handle DD/MM/YYYY or DD/MM/YYYY HH:mm format
        const parts = datetime.split(' ');
        const dateParts = parts[0].split('/');
        if (dateParts.length === 3) {
          const [day, month, year] = dateParts;
          const timePart = parts[1] || '00:00';
          date = new Date(`${year}-${month}-${day}T${timePart}`);
        } else {
          return datetime;
        }
      } else {
        date = new Date(datetime);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return datetime || '-';
      }

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    } catch {
      return datetime || '-';
    }
  };

  const handleOpenModal = (product?: FinishedProduct) => {
    if (product) {
      setIsEditing(true);
      setSelectedProduct(product);

      // Convert datetime to datetime-local format (YYYY-MM-DDTHH:mm) for DateTimePicker
      let thoiGianChienFormatted = '';
      if (product.thoiGianChien) {
        try {
          const date = new Date(product.thoiGianChien);
          // Check if date is valid
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            thoiGianChienFormatted = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        } catch {
          thoiGianChienFormatted = '';
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
      const { nguoiThucHien, ...restData } = formData;

      // Convert datetime-local to ISO string for consistent storage
      const dataToSubmit = {
        ...restData,
        thoiGianChien: restData.thoiGianChien
          ? new Date(restData.thoiGianChien).toISOString()
          : '',
      };

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
          <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
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
            {/* Tab Tổng các máy */}
            <button
              onClick={() => setSelectedMachine(TOTAL_ALL_MACHINES)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${selectedMachine === TOTAL_ALL_MACHINES
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Tổng các máy
            </button>
          </nav>
        </div>
      </div>

      {/* Aggregated Table View for "Tổng các máy" tab - Display by maChien */}
      {selectedMachine === TOTAL_ALL_MACHINES && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-green-50 to-green-100 border-b-2 border-green-300">
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã chiên</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Thời gian chiên</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên hàng hóa</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Tổng KL (kg)</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Người thực hiện</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Số máy</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Đánh giá</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        <span className="ml-2">Đang tải...</span>
                      </div>
                    </td>
                  </tr>
                ) : aggregatedByMaChien.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      Chưa có dữ liệu
                    </td>
                  </tr>
                ) : (
                  aggregatedByMaChien.map((product, index) => (
                    <tr
                      key={product.maChien}
                      className={`border-b border-gray-200 hover:bg-green-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600 border-r border-gray-200">
                        {product.maChien}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                        {formatDateTime(product.thoiGianChien)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                        {product.tenHangHoa}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center font-semibold">
                        {product.khoiLuong.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                        {product.nguoiThucHien}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {product.machineCount} máy
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900 border-r border-gray-200">
                        {product.machineCount > 1 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="text-red-600 font-medium">▼</span>
                              <span className="text-gray-500">Thấp nhất:</span>
                              <span className="font-medium text-red-700">
                                {product.evaluations.a.min?.tenMay} ({product.evaluations.a.min?.tiLe}% A)
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-green-600 font-medium">▲</span>
                              <span className="text-gray-500">Cao nhất:</span>
                              <span className="font-medium text-green-700">
                                {product.evaluations.a.max?.tenMay} ({product.evaluations.a.max?.tiLe}% A)
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Chỉ có 1 máy</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleViewAggregated(product)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                            title="Xem chi tiết tổng hợp"
                          >
                            <Eye className="w-5 h-5" />
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
      )}

      {/* Table for individual machines */}
      {selectedMachine !== TOTAL_ALL_MACHINES && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã chiên</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Thời gian chiên</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên hàng hóa</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">KL đầu vào (kg)</th>
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
      )}

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

      {/* Aggregated Product View Modal */}
      {isAggregatedViewModalOpen && selectedAggregatedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Chi tiết tổng hợp - Mã chiên: {selectedAggregatedProduct.maChien}
                </h3>
                <button
                  onClick={() => setIsAggregatedViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {/* Info Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Thời gian chiên</p>
                  <p className="text-sm font-medium">{formatDateTime(selectedAggregatedProduct.thoiGianChien)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Tên hàng hóa</p>
                  <p className="text-sm font-medium">{selectedAggregatedProduct.tenHangHoa}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Người thực hiện</p>
                  <p className="text-sm font-medium">{selectedAggregatedProduct.nguoiThucHien}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-600">Số máy tổng hợp</p>
                  <p className="text-sm font-bold text-green-700">{selectedAggregatedProduct.machineCount} máy</p>
                </div>
              </div>

              {/* Main Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-700 mb-1">Tổng khối lượng đầu vào</h4>
                  <p className="text-2xl font-bold text-blue-900">{selectedAggregatedProduct.khoiLuong.toFixed(2)} kg</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-700 mb-1">Tổng khối lượng thành phẩm</h4>
                  <p className="text-2xl font-bold text-green-900">{selectedAggregatedProduct.tongKhoiLuong.toFixed(2)} kg</p>
                </div>
              </div>

              {/* Product Types Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border border-gray-200">Loại thành phẩm</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border border-gray-200">Khối lượng (kg)</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border border-gray-200">Tỉ lệ (%)</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border border-gray-200" colSpan={2}>Đánh giá</th>
                    </tr>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200"></th>
                      <th className="border border-gray-200"></th>
                      <th className="border border-gray-200"></th>
                      <th className="px-2 py-1 text-xs font-medium text-red-600 border border-gray-200 text-center">Thấp nhất</th>
                      <th className="px-2 py-1 text-xs font-medium text-green-600 border border-gray-200 text-center">Cao nhất</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-blue-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200">Thành phẩm A</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.aKhoiLuong.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.aTiLe}%</td>
                      <td className="px-2 py-2 text-xs text-red-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.a.min ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.a.min.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.a.min.tiLe}%)</div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs text-green-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.a.max ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.a.max.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.a.max.tiLe}%)</div>
                        ) : '-'}
                      </td>
                    </tr>
                    <tr className="bg-gray-50 hover:bg-blue-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200">Thành phẩm B</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.bKhoiLuong.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.bTiLe}%</td>
                      <td className="px-2 py-2 text-xs text-red-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.b.min ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.b.min.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.b.min.tiLe}%)</div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs text-green-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.b.max ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.b.max.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.b.max.tiLe}%)</div>
                        ) : '-'}
                      </td>
                    </tr>
                    <tr className="hover:bg-blue-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200">Thành phẩm B Dầu</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.bDauKhoiLuong.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.bDauTiLe}%</td>
                      <td className="px-2 py-2 text-xs text-red-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.bDau.min ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.bDau.min.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.bDau.min.tiLe}%)</div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs text-green-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.bDau.max ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.bDau.max.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.bDau.max.tiLe}%)</div>
                        ) : '-'}
                      </td>
                    </tr>
                    <tr className="bg-gray-50 hover:bg-blue-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200">Thành phẩm C</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.cKhoiLuong.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.cTiLe}%</td>
                      <td className="px-2 py-2 text-xs text-red-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.c.min ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.c.min.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.c.min.tiLe}%)</div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs text-green-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.c.max ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.c.max.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.c.max.tiLe}%)</div>
                        ) : '-'}
                      </td>
                    </tr>
                    <tr className="hover:bg-blue-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200">Vụn lớn</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.vunLonKhoiLuong.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.vunLonTiLe}%</td>
                      <td className="px-2 py-2 text-xs text-red-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.vunLon.min ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.vunLon.min.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.vunLon.min.tiLe}%)</div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs text-green-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.vunLon.max ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.vunLon.max.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.vunLon.max.tiLe}%)</div>
                        ) : '-'}
                      </td>
                    </tr>
                    <tr className="bg-gray-50 hover:bg-blue-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200">Vụn nhỏ</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.vunNhoKhoiLuong.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.vunNhoTiLe}%</td>
                      <td className="px-2 py-2 text-xs text-red-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.vunNho.min ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.vunNho.min.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.vunNho.min.tiLe}%)</div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs text-green-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.vunNho.max ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.vunNho.max.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.vunNho.max.tiLe}%)</div>
                        ) : '-'}
                      </td>
                    </tr>
                    <tr className="hover:bg-blue-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200">Phế phẩm</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.phePhamKhoiLuong.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.phePhamTiLe}%</td>
                      <td className="px-2 py-2 text-xs text-red-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.phePham.min ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.phePham.min.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.phePham.min.tiLe}%)</div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs text-green-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.phePham.max ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.phePham.max.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.phePham.max.tiLe}%)</div>
                        ) : '-'}
                      </td>
                    </tr>
                    <tr className="bg-gray-50 hover:bg-blue-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 border border-gray-200">Ướt</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.uotKhoiLuong.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.uotTiLe}%</td>
                      <td className="px-2 py-2 text-xs text-red-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.uot.min ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.uot.min.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.uot.min.tiLe}%)</div>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs text-green-700 border border-gray-200 text-center">
                        {selectedAggregatedProduct.evaluations.uot.max ? (
                          <div><span className="font-medium">{selectedAggregatedProduct.evaluations.uot.max.tenMay}</span><br/>({selectedAggregatedProduct.evaluations.uot.max.tiLe}%)</div>
                        ) : '-'}
                      </td>
                    </tr>
                    <tr className="bg-green-100 font-bold">
                      <td className="px-4 py-2 text-sm font-bold text-gray-900 border border-gray-200">TỔNG CỘNG</td>
                      <td className="px-4 py-2 text-sm font-bold text-gray-900 border border-gray-200 text-center">{selectedAggregatedProduct.tongKhoiLuong.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm font-bold text-gray-900 border border-gray-200 text-center">100%</td>
                      <td className="px-4 py-2 border border-gray-200" colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsAggregatedViewModalOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
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

export default FinishedProductManagement;

