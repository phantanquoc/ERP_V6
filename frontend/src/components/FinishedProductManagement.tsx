import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, Eye, FileText, X, Download, Warehouse, SlidersHorizontal } from 'lucide-react';
import finishedProductService, { FinishedProduct } from '../services/finishedProductService';
import FinishedProductModal from './FinishedProductModal';
import FinishedProductViewModal from './FinishedProductViewModal';
import FinishedProductWarehouseReceiptModal from './FinishedProductWarehouseReceiptModal';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import TableFilter, { FilterField } from './TableFilter';
import { useActiveFryerMachineSystems } from '../hooks/useMachineSystemDetails';
import { useQueryClient } from '@tanstack/react-query';
import { finishedProductKeys } from '../hooks/useFinishedProducts';
import { productionDayRange } from '../utils/productionDay';

// Special constant for "Tổng các máy" tab
const TOTAL_ALL_MACHINES = '__TOTAL_ALL_MACHINES__';

// Grade field definitions for per-machine adjust modal
const GRADE_FIELDS: Array<{ key: keyof FinishedProduct; label: string }> = [
  { key: 'aKhoiLuong', label: 'Thành phẩm A (kg)' },
  { key: 'bKhoiLuong', label: 'Thành phẩm B (kg)' },
  { key: 'bDauKhoiLuong', label: 'Thành phẩm B Dầu (kg)' },
  { key: 'cKhoiLuong', label: 'Thành phẩm C (kg)' },
  { key: 'vunLonKhoiLuong', label: 'Vụn lớn (kg)' },
  { key: 'vunNhoKhoiLuong', label: 'Vụn nhỏ (kg)' },
  { key: 'phePhamKhoiLuong', label: 'Phế phẩm (kg)' },
  { key: 'uotKhoiLuong', label: 'Ướt (kg)' },
];

// ─── Per-machine Adjust Modal ─────────────────────────────────────────────────

interface AdjustMachinesModalProps {
  maChien: string;
  products: FinishedProduct[];
  onClose: () => void;
  onSuccess: () => void;
}

const AdjustMachinesModal: React.FC<AdjustMachinesModalProps> = ({ maChien, products, onClose, onSuccess }) => {
  type GradeValues = Record<string, Record<string, number>>;

  const initValues = (): GradeValues => {
    const init: GradeValues = {};
    products.forEach((p) => {
      init[p.id] = {};
      GRADE_FIELDS.forEach(({ key }) => {
        init[p.id][key as string] = Number(p[key]) || 0;
      });
    });
    return init;
  };

  const [values, setValues] = React.useState<GradeValues>(initValues);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');

  const handleChange = (productId: string, field: string, raw: string) => {
    const num = parseFloat(raw);
    setValues((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: isNaN(num) ? 0 : num },
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await Promise.all(
        products.map((p) => {
          const gradeData: Partial<FinishedProduct> = {};
          GRADE_FIELDS.forEach(({ key }) => {
            (gradeData as any)[key] = values[p.id][key as string];
          });
          return finishedProductService.updateFinishedProduct(p.id, gradeData);
        }),
      );
      onSuccess();
    } catch (err: any) {
      setSaveError(err?.message || 'Lỗi cập nhật dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} showBackdrop closeOnBackdrop={false}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[calc(100vh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100 shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-orange-600" />
              Điều chỉnh từng máy
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">Mã chiên: <span className="font-semibold">{maChien}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {products.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Không có máy nào trong mẻ này.</p>
          ) : (
            products.map((p) => (
              <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-800">
                    {p.machineSystem?.tenHeThong ?? 'Máy không xác định'}
                    {p.machineSystem?.maHeThong ? ` (${p.machineSystem.maHeThong})` : ''}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
                  {GRADE_FIELDS.map(({ key, label }) => (
                    <div key={key as string}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={values[p.id]?.[key as string] ?? 0}
                        onChange={(e) => handleChange(p.id, key as string, e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {saveError}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || products.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang lưu…
              </>
            ) : (
              'Lưu điều chỉnh'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface FinishedProductManagementProps {
  productionDay?: string;
}

const FinishedProductManagement: React.FC<FinishedProductManagementProps> = ({ productionDay }) => {
  const { user } = useAuth();
  const machineSystemsQuery = useActiveFryerMachineSystems();
  const machineSystems = machineSystemsQuery.data?.data ?? [];
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<FinishedProduct[]>([]); // All products from all machines
  const [selectedMachineSystemId, setSelectedMachineSystemId] = useState<string>(TOTAL_ALL_MACHINES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedProductForReceipt, setSelectedProductForReceipt] = useState<FinishedProduct | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', maChien: '', tenHangHoa: '' });
  const itemsPerPage = 10;

  const productFilterFields: FilterField[] = [
    { key: 'maChien', label: 'Mã chiên', type: 'text' },
    { key: 'tenHangHoa', label: 'Tên hàng hóa', type: 'text' },
  ];

  // Get current user's full name
  const currentUserName = user ? `${user.lastName} ${user.firstName}`.trim() : '';

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
    if (selectedMachineSystemId && selectedMachineSystemId !== TOTAL_ALL_MACHINES) {
      setCurrentPage(1);
      loadProducts();
    }
  }, [selectedMachineSystemId, productionDay]);

  // Load all products when "Tổng các máy" tab is selected
  useEffect(() => {
    if (selectedMachineSystemId === TOTAL_ALL_MACHINES) {
      loadAllProducts();
    }
  }, [selectedMachineSystemId, productionDay]);

  // Auto-select "Tổng các máy" by default when list loads
  useEffect(() => {
    if (machineSystems.length > 0 && !selectedMachineSystemId) {
      setSelectedMachineSystemId(TOTAL_ALL_MACHINES);
    }
  }, [machineSystems]);

  const loadProducts = async () => {
    if (selectedMachineSystemId === TOTAL_ALL_MACHINES) {
      return; // Skip loading for total tab, handled separately
    }
    try {
      setLoading(true);
      setError('');
      // Compute production day range (06:30 to 06:30 next day)
      let dateRange: { thoiGianChienFrom?: string; thoiGianChienTo?: string } | undefined;
      if (productionDay) {
        const range = productionDayRange(productionDay);
        dateRange = { thoiGianChienFrom: range.from, thoiGianChienTo: range.to };
      }
      const result = await finishedProductService.getAllFinishedProducts(1, 1000, selectedMachineSystemId || undefined, dateRange);
      setProducts(result.data);
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
      // Compute production day range (06:30 to 06:30 next day)
      let dateRange: { thoiGianChienFrom?: string; thoiGianChienTo?: string } | undefined;
      if (productionDay) {
        const range = productionDayRange(productionDay);
        dateRange = { thoiGianChienFrom: range.from, thoiGianChienTo: range.to };
      }
      // Fetch all products without machine filter
      const result = await finishedProductService.getAllFinishedProducts(1, 10000, undefined, dateRange);
      setAllProducts(result.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu tổng hợp');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get machine status label (for FinishedProduct saved status)
  const getMachineStatusLabel = (status?: string): string => {
    switch (status) {
      case 'HOAT_DONG':
      case 'DANG_HOAT_DONG':
        return 'Đang hoạt động';
      case 'BAO_TRI':
        return 'Bảo trì';
      case 'NGUNG_HOAT_DONG':
        return 'Ngừng hoạt động';
      default:
        return 'Không xác định';
    }
  };

  // Helper function to get machine status color (same as SystemOperationManagement)
  const getMachineStatusColor = (status?: string): string => {
    switch (status) {
      case 'HOAT_DONG':
      case 'DANG_HOAT_DONG':
        return 'bg-green-100 text-green-800';
      case 'BAO_TRI':
        return 'bg-yellow-100 text-yellow-800';
      case 'NGUNG_HOAT_DONG':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get machine status badge from saved trangThai
  const getMachineStatusBadge = (trangThai?: string) => {
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getMachineStatusColor(trangThai)}`}>
        {getMachineStatusLabel(trangThai)}
      </span>
    );
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
    // true when every FinishedProduct in this batch has daNhapKho=true
    daNhapKho: boolean;
  }

  // Aggregate products by maChien for "Tổng các máy" tab
  const aggregatedByMaChien = useMemo((): AggregatedProduct[] => {
    if (selectedMachineSystemId !== TOTAL_ALL_MACHINES || allProducts.length === 0) {
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
        const tiLe = Number(getRateValue(p).toFixed(2)); // Round to 2 decimal places
        const tenMay = p.machineSystem?.tenHeThong || 'Không xác định';

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

      // Filter only active machines (DANG_HOAT_DONG) for evaluation
      const activeProducts = products.filter((p) => p.trangThai === 'DANG_HOAT_DONG');

      // Calculate evaluations for each product type (only from active machines)
      const evaluations: AllEvaluations = {
        a: findMinMaxMachine(activeProducts, (p) => p.aTiLe || 0),
        b: findMinMaxMachine(activeProducts, (p) => p.bTiLe || 0),
        bDau: findMinMaxMachine(activeProducts, (p) => p.bDauTiLe || 0),
        c: findMinMaxMachine(activeProducts, (p) => p.cTiLe || 0),
        vunLon: findMinMaxMachine(activeProducts, (p) => p.vunLonTiLe || 0),
        vunNho: findMinMaxMachine(activeProducts, (p) => p.vunNhoTiLe || 0),
        phePham: findMinMaxMachine(activeProducts, (p) => p.phePhamTiLe || 0),
        uot: findMinMaxMachine(activeProducts, (p) => p.uotTiLe || 0),
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
        daNhapKho: products.every((p) => p.daNhapKho === true),
      });
    });

    // Sort by thoiGianChien descending
    result.sort((a, b) => new Date(b.thoiGianChien).getTime() - new Date(a.thoiGianChien).getTime());
    return result;
  }, [selectedMachineSystemId, allProducts]);

  // Filtered aggregated data
  const filteredAggregated = aggregatedByMaChien.filter(item => {
    const search = filterValues._search.toLowerCase();
    const matchSearch = !search || (item.maChien || '').toLowerCase().includes(search) || (item.tenHangHoa || '').toLowerCase().includes(search) || (item.nguoiThucHien || '').toLowerCase().includes(search);
    const matchMaChien = !filterValues.maChien || (item.maChien || '').toLowerCase().includes(filterValues.maChien.toLowerCase());
    const matchTenHangHoa = !filterValues.tenHangHoa || (item.tenHangHoa || '').toLowerCase().includes(filterValues.tenHangHoa.toLowerCase());
    return matchSearch && matchMaChien && matchTenHangHoa;
  });

  // Filtered individual products
  const filteredProducts = products.filter(product => {
    const search = filterValues._search.toLowerCase();
    const matchSearch = !search || (product.maChien || '').toLowerCase().includes(search) || (product.tenHangHoa || '').toLowerCase().includes(search) || (product.nguoiThucHien || '').toLowerCase().includes(search);
    const matchMaChien = !filterValues.maChien || (product.maChien || '').toLowerCase().includes(filterValues.maChien.toLowerCase());
    const matchTenHangHoa = !filterValues.tenHangHoa || (product.tenHangHoa || '').toLowerCase().includes(filterValues.tenHangHoa.toLowerCase());
    return matchSearch && matchMaChien && matchTenHangHoa;
  });

  // State for viewing aggregated product detail
  const [selectedAggregatedProduct, setSelectedAggregatedProduct] = useState<AggregatedProduct | null>(null);
  const [isAggregatedViewModalOpen, setIsAggregatedViewModalOpen] = useState(false);

  // State for bulk warehouse receipt selection
  const [selectedMaChienSet, setSelectedMaChienSet] = useState<Set<string>>(new Set());
  const [isBulkReceiptModalOpen, setIsBulkReceiptModalOpen] = useState(false);

  // State for per-machine adjust modal
  const [adjustMaChien, setAdjustMaChien] = useState<string | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const handleViewAggregated = (product: AggregatedProduct) => {
    setSelectedAggregatedProduct(product);
    setIsAggregatedViewModalOpen(true);
  };

  // Initialise checkbox selection: tick rows not yet received when tab becomes active
  useEffect(() => {
    if (selectedMachineSystemId === TOTAL_ALL_MACHINES && filteredAggregated.length > 0) {
      setSelectedMaChienSet(
        new Set(filteredAggregated.filter((p) => !p.daNhapKho).map((p) => p.maChien)),
      );
    } else if (selectedMachineSystemId !== TOTAL_ALL_MACHINES) {
      setSelectedMaChienSet(new Set());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMachineSystemId, aggregatedByMaChien]);

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMaChienSet(
        new Set(filteredAggregated.filter((p) => !p.daNhapKho).map((p) => p.maChien)),
      );
    } else {
      setSelectedMaChienSet(new Set());
    }
  };

  const handleToggleRow = (maChien: string, checked: boolean) => {
    setSelectedMaChienSet((prev) => {
      const next = new Set(prev);
      if (checked) next.add(maChien);
      else next.delete(maChien);
      return next;
    });
  };

  const pendingRows = filteredAggregated.filter((p) => !p.daNhapKho);
  const allPendingSelected =
    pendingRows.length > 0 && pendingRows.every((p) => selectedMaChienSet.has(p.maChien));
  const selectedMaChienList = Array.from(selectedMaChienSet);

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

      // Convert datetime-local to ISO string for consistent storage
      const dataToSubmit = {
        ...formData,
        thoiGianChien: formData.thoiGianChien
          ? new Date(formData.thoiGianChien).toISOString()
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

  const handleFormChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExportExcel = async () => {
    try {
      await finishedProductService.exportToExcel({
        machineSystemId: selectedMachineSystemId !== TOTAL_ALL_MACHINES ? selectedMachineSystemId : undefined,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Quản lý Thành phẩm đầu ra</h2>
        </div>
        <div className="flex items-center gap-2">
          {selectedMachineSystemId === TOTAL_ALL_MACHINES && (
            <button
              onClick={() => setIsBulkReceiptModalOpen(true)}
              disabled={selectedMaChienList.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Warehouse size={18} />
              Nhập kho toàn bộ ({selectedMaChienList.length})
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={18} />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Machine System Selector */}
      <div className="bg-white rounded-lg shadow">
        {/* Mobile: dropdown */}
        <div className="sm:hidden px-4 py-3">
          <select
            value={selectedMachineSystemId}
            onChange={(e) => setSelectedMachineSystemId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value={TOTAL_ALL_MACHINES}>Tổng các máy</option>
            {machineSystems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.tenHeThong} ({system.maHeThong})
              </option>
            ))}
          </select>
        </div>
        {/* Desktop: tabs */}
        <div className="hidden sm:block border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            {/* Tab Tổng các máy */}
            <button
              onClick={() => setSelectedMachineSystemId(TOTAL_ALL_MACHINES)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${selectedMachineSystemId === TOTAL_ALL_MACHINES
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Tổng các máy
            </button>
            {machineSystems.map((system) => (
              <button
                key={system.id}
                onClick={() => setSelectedMachineSystemId(system.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                  ${selectedMachineSystemId === system.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {system.tenHeThong} ({system.maHeThong})
              </button>
            ))}
          </nav>
        </div>
      </div>

      <TableFilter
        filters={productFilterFields}
        values={filterValues}
        onChange={(newValues) => { setFilterValues(newValues); setCurrentPage(1); }}
      />

      {/* Aggregated Table View for "Tổng các máy" tab - Display by maChien */}
      {selectedMachineSystemId === TOTAL_ALL_MACHINES && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-3 py-2 sm:px-4 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      title="Chọn tất cả chưa nhập kho"
                    />
                  </th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã chiên</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Thời gian chiên</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên hàng hóa</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Tổng KL (kg)</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Người thực hiện</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Số máy</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Đánh giá</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-4 sm:px-6 sm:py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Đang tải...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAggregated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-4 sm:px-6 sm:py-8 text-center text-gray-500">
                      Chưa có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredAggregated.map((product, index) => (
                    <tr
                      key={product.maChien}
                      className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                        product.daNhapKho ? 'opacity-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      {/* Checkbox cell */}
                      <td className="px-3 py-2 sm:px-4 sm:py-4 text-center border-r border-gray-200">
                        <input
                          type="checkbox"
                          checked={selectedMaChienSet.has(product.maChien)}
                          disabled={product.daNhapKho}
                          onChange={(e) => handleToggleRow(product.maChien, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm font-semibold border-r border-gray-200">
                        <span className={product.daNhapKho ? 'text-gray-400' : 'text-green-600'}>
                          {product.maChien}
                        </span>
                        {product.daNhapKho && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            Đã nhập kho
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-700 border-r border-gray-200">
                        {formatDateTime(product.thoiGianChien)}
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                        {product.tenHangHoa}
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200 text-center font-semibold">
                        {product.tongKhoiLuong.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                        {product.nguoiThucHien}
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
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
                      <td className="px-3 py-2 sm:px-6 sm:py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleViewAggregated(product)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                            title="Xem chi tiết tổng hợp"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setAdjustMaChien(product.maChien);
                              setIsAdjustModalOpen(true);
                            }}
                            disabled={product.daNhapKho}
                            className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={product.daNhapKho ? 'Đã nhập kho, không thể điều chỉnh' : 'Điều chỉnh từng máy'}
                          >
                            <SlidersHorizontal className="w-5 h-5" />
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
      {selectedMachineSystemId !== TOTAL_ALL_MACHINES && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã chiên</th>
                  <th className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Thời gian chiên</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên hàng hóa</th>
                  <th className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">KL đầu vào (kg)</th>
                  <th className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Người thực hiện</th>
                  <th className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
                  <th className="px-3 py-2 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 sm:px-6 sm:py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Đang tải...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 sm:px-6 sm:py-8 text-center text-gray-500">
                      Chưa có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((product, index) => (
                    <tr
                      key={product.id}
                      onClick={() => handleView(product)}
                      className={`border-b border-gray-200 hover:bg-blue-100 border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                        {product.maChien}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-700 border-r border-gray-200">
                        {formatDateTime(product.thoiGianChien)}
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                        {product.tenHangHoa}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200 text-center">
                        {product.khoiLuong}
                      </td>
                      <td className="hidden md:table-cell px-3 py-2 sm:px-6 sm:py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                        {product.nguoiThucHien}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 border-r border-gray-200 text-center">
                        {getMachineStatusBadge(product.trangThai)}
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedProductForReceipt(product); setIsReceiptModalOpen(true); }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
                            title="Nhập kho"
                          >
                            <Warehouse className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
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
          {(() => {
            const totalItems = filteredProducts.length;
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
        onEdit={handleOpenModal}
      />

      <FinishedProductWarehouseReceiptModal
        isOpen={isReceiptModalOpen}
        product={selectedProductForReceipt}
        productionDay={productionDay}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedProductForReceipt(null);
        }}
        onSuccess={() => {
          setIsReceiptModalOpen(false);
          setSelectedProductForReceipt(null);
          loadProducts();
        }}
      />

      {/* Bulk warehouse receipt modal */}
      <FinishedProductWarehouseReceiptModal
        isOpen={isBulkReceiptModalOpen}
        product={null}
        maChienList={selectedMaChienList}
        productionDay={productionDay}
        onClose={() => setIsBulkReceiptModalOpen(false)}
        onSuccess={() => {
          setIsBulkReceiptModalOpen(false);
          setSelectedMaChienSet(new Set());
          loadAllProducts();
        }}
      />

      {/* Per-machine adjust modal */}
      {isAdjustModalOpen && adjustMaChien && (
        <AdjustMachinesModal
          maChien={adjustMaChien}
          products={allProducts.filter((p) => p.maChien === adjustMaChien)}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setAdjustMaChien(null);
          }}
          onSuccess={() => {
            setIsAdjustModalOpen(false);
            setAdjustMaChien(null);
            loadAllProducts();
            queryClient.invalidateQueries({ queryKey: finishedProductKeys.lists() });
          }}
        />
      )}

      {/* Aggregated Product View Modal */}
      <Modal isOpen={isAggregatedViewModalOpen && !!selectedAggregatedProduct} onClose={() => setIsAggregatedViewModalOpen(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            {selectedAggregatedProduct && (<>
            <div className="px-3 py-2 sm:px-6 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100 shrink-0">
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
            <div className="p-6 overflow-y-auto flex-1">
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
            <div className="px-3 py-2 sm:px-6 sm:py-4 border-t border-gray-200 bg-gray-50 flex justify-end shrink-0">
              <button
                onClick={() => setIsAggregatedViewModalOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </>)}
        </div>
      </Modal>
    </div>
  );
};

export default FinishedProductManagement;
