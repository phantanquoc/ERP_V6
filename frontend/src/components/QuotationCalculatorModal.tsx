import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign, PlusCircle, Users, Package } from 'lucide-react';
import { quotationService, CreateQuotationRequest, QuotationItem } from '../services/quotationService';
import materialStandardService, { MaterialStandard } from '../services/materialStandardService';
import { QuotationRequest } from '../services/quotationRequestService';
// warehouseInventoryService đã được xóa - tồn kho sẽ được nhập thủ công
import warehouseService from '../services/warehouseService';
import productionProcessService, { ProductionProcess } from '../services/productionProcessService';
import generalCostService, { GeneralCost } from '../services/generalCostService';
import exportCostService, { ExportCost } from '../services/exportCostService';
import quotationCalculatorService from '../services/quotationCalculatorService';
import internationalProductService, { InternationalProduct } from '../services/internationalProductService';
import { parseNumberInputStr } from '../utils/numberInput';

// Helper functions để format số với dấu chấm phân cách hàng ngàn
const formatNumberWithDots = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
};

const parseNumberFromDots = (value: string): number => {
  if (!value || value === '') return 0;
  // Xóa tất cả dấu chấm (phân cách hàng ngàn) và thay dấu phẩy thành dấu chấm (phần thập phân)
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Helper để xử lý input số - chỉ cho phép nhập số và dấu phân cách
const handleNumericInput = (value: string): string => {
  // Cho phép nhập số, dấu chấm và dấu phẩy
  // Loại bỏ các ký tự không hợp lệ
  return value.replace(/[^0-9.,]/g, '');
};

// Interface for selected cost item with values
interface SelectedCostItem {
  id: string;
  costId: string;
  tenChiPhi: string;
  donViTinh?: string;
  keHoach: number;
  thucTe: number;
  // Thêm các trường cho USD và tỉ giá (chỉ dùng cho chi phí xuất khẩu)
  keHoachUSD?: number;
  thucTeUSD?: number;
  tiGiaKeHoach?: number;
  tiGiaThucTe?: number;
}

interface QuotationCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationRequest: QuotationRequest | null;
  onSuccess: () => void;
}

const QuotationCalculatorModal: React.FC<QuotationCalculatorModalProps> = ({
  isOpen,
  onClose,
  quotationRequest,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [materialStandards, setMaterialStandards] = useState<MaterialStandard[]>([]);
  const [productionProcesses, setProductionProcesses] = useState<ProductionProcess[]>([]);

  // State for create quotation modal
  const [showCreateQuotationModal, setShowCreateQuotationModal] = useState(false);
  const [quotationFormData, setQuotationFormData] = useState({
    hieuLucBaoGia: '',
    tinhTrang: 'DANG_CHO_PHAN_HOI',
    ghiChu: '',
  });
  const [activeTab, setActiveTab] = useState(0);

  // State for available costs from database
  const [availableGeneralCosts, setAvailableGeneralCosts] = useState<GeneralCost[]>([]);
  const [availableExportCosts, setAvailableExportCosts] = useState<ExportCost[]>([]);

  // State for selected costs in order summary
  const [selectedExportCosts, setSelectedExportCosts] = useState<SelectedCostItem[]>([]);

  // Interface for general cost group (bảng chi phí chung)
  interface GeneralCostGroup {
    id: string; // Unique ID for the group
    tenBangChiPhi: string; // Tên bảng chi phí chung
    selectedCosts: SelectedCostItem[]; // Danh sách chi phí được chọn
    selectedProducts: string[]; // Danh sách sản phẩm được chọn cho bảng này
  }

  // State for multiple general cost groups
  const [generalCostGroups, setGeneralCostGroups] = useState<GeneralCostGroup[]>([
    {
      id: `gcg-${Date.now()}`,
      tenBangChiPhi: 'Chi phí chung 1',
      selectedCosts: [],
      selectedProducts: [],
    }
  ]);

  // State for product selection modal - now tracks which group is being edited
  const [showProductSelectionModal, setShowProductSelectionModal] = useState(false);
  const [editingGeneralCostGroupId, setEditingGeneralCostGroupId] = useState<string | null>(null);

  // State for profit calculation in order summary
  const [phanTramThue, setPhanTramThue] = useState<string>('');
  const [phanTramQuy, setPhanTramQuy] = useState<string>('');

  // State for inventory check popup
  const [inventoryCheckResult, setInventoryCheckResult] = useState<{
    show: boolean;
    loading: boolean;
    productName: string;
    materialName: string;
    items: { tenKho: string; tenLo: string; soLuong: number; giaThanh: number; donViTinh: string }[];
    materialItems: { tenKho: string; tenLo: string; soLuong: number; giaThanh: number; donViTinh: string }[];
  }>({ show: false, loading: false, productName: '', materialName: '', items: [], materialItems: [] });
  // Computed: Get all selected general costs from all groups (for backward compatibility)
  const selectedGeneralCosts = generalCostGroups.flatMap(group => group.selectedCosts);

  // Computed: Get all selected products for general costs from all groups (for backward compatibility)
  const selectedProductsForGeneralCosts = [...new Set(generalCostGroups.flatMap(group => group.selectedProducts))];

  // State for each product tab
  const [tabsData, setTabsData] = useState<{
    selectedStandard: MaterialStandard | null;
    selectedProcess: ProductionProcess | null;
    formData: {
      maBaoGia: string;
      maDinhMuc: string;
      tenDinhMuc: string;
      tiLeThuHoi: string;
      sanPhamDauRa: string;
      nguyenLieuDauVao: string;
      thanhPhamTonKho: string;
      tongThanhPhamCanSxThem: string;
      tongNguyenLieuCanSanXuat: string;
      nguyenLieuTonKho: string;
      nguyenLieuCanNhapThem: string;
      // Các trường thực tế mới
      tongKhoiLuongThanhPhamThucTe: string;
      thanhPhamTonKhoThucTe: string;
      tongThanhPhamCanSxThemThucTe: string;
      tongNguyenLieuCanSanXuatThucTe: string;
      ghiChu: string;
      // Các trường mới
      thoiGianChoPhepToiDa: string;
      ngayBatDauSanXuat: string;
      ngayHoanThanhThucTe: string;
      chiPhiSanXuatKeHoach: string;
      chiPhiSanXuatThucTe: string;
      chiPhiChungKeHoach: string;
      chiPhiChungThucTe: string;
      chiPhiXuatKhauKeHoach: string;
      chiPhiXuatKhauThucTe: string;
      giaHoaVon: string; // Giá hòa vốn cho sản phẩm đầu ra chính (auto-calculated)
      loiNhuanCongThem: string; // Lợi nhuận cộng thêm cho sản phẩm đầu ra chính
      loiNhuanCongThemThucTe: string; // Lợi nhuận cộng thêm thực tế
      giaHoaVonSanPhamPhu: { [tenSanPham: string]: string }; // Giá hòa vốn của các sản phẩm phụ (user input)
      // Các trường thực tế cho thành phẩm đầu ra
      tiLeThuHoiThucTe: { [tenSanPham: string]: string }; // Tỉ lệ thu hồi thực tế cho từng sản phẩm
      giaHoaVonSanPhamPhuThucTe: { [tenSanPham: string]: string }; // Giá hòa vốn thực tế của các sản phẩm phụ
      // Tỉ giá USD cho giá báo khách
      tiGiaUSD: string;
    };
  }[]>([]);

  // State for additional cost tabs (chi phí bổ sung)
  interface AdditionalCostTab {
    id: string; // Unique ID for the tab
    tenChiPhiBoSung: string; // Tên chi phí bổ sung (user input)
    selectedProduct: InternationalProduct | null; // Sản phẩm được chọn từ danh sách
    selectedProductType: string; // Loại sản phẩm đã chọn (để lọc)
    selectedStandard: MaterialStandard | null;
    selectedProcess: ProductionProcess | null;
    formData: {
      maBaoGia: string;
      maDinhMuc: string;
      tenDinhMuc: string;
      tiLeThuHoi: string;
      sanPhamDauRa: string;
      nguyenLieuDauVao: string;
      thanhPhamTonKho: string;
      tongThanhPhamCanSxThem: string;
      tongNguyenLieuCanSanXuat: string;
      nguyenLieuTonKho: string;
      nguyenLieuCanNhapThem: string;
      ghiChu: string;
      thoiGianChoPhepToiDa: string;
      ngayBatDauSanXuat: string;
      ngayHoanThanhThucTe: string;
      chiPhiSanXuatKeHoach: string;
      chiPhiSanXuatThucTe: string;
      chiPhiChungKeHoach: string;
      chiPhiChungThucTe: string;
      chiPhiXuatKhauKeHoach: string;
      chiPhiXuatKhauThucTe: string;
      giaHoaVon: string;
      loiNhuanCongThem: string;
      giaHoaVonSanPhamPhu: { [tenSanPham: string]: string };
      soLuong: string; // Số lượng (user input)
      donViTinh: string; // Đơn vị tính (user input)
      // Tỉ giá USD cho giá báo khách
      tiGiaUSD: string;
    };
  }
  const [additionalCostTabs, setAdditionalCostTabs] = useState<AdditionalCostTab[]>([]);
  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [newCostName, setNewCostName] = useState('');
  const [availableProducts, setAvailableProducts] = useState<InternationalProduct[]>([]);

  // State để track raw input values cho flowchart costs (tránh lỗi duplicate khi gõ tiếng Việt)
  const [flowchartInputValues, setFlowchartInputValues] = useState<Record<string, string>>({});
  const [additionalFlowchartInputValues, setAdditionalFlowchartInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && quotationRequest) {
      loadMaterialStandards();
      loadProductionProcesses();
      loadAvailableCosts();
      loadAvailableProducts();
      initializeTabs();
    }
  }, [isOpen, quotationRequest]);

  // Load available costs from database
  const loadAvailableCosts = async () => {
    try {
      const [generalResponse, exportResponse] = await Promise.all([
        generalCostService.getAllGeneralCosts(1, 100),
        exportCostService.getAllExportCosts(1, 100)
      ]);
      setAvailableGeneralCosts(generalResponse.data);
      setAvailableExportCosts(exportResponse.data);
    } catch (error) {
      console.error('Error loading available costs:', error);
    }
  };

  // Load available products for additional cost tabs
  const loadAvailableProducts = async () => {
    try {
      const response = await internationalProductService.getAllProducts(1, 1000);
      setAvailableProducts(response.data);
    } catch (error) {
      console.error('Error loading available products:', error);
    }
  };

  // Helper: Get items array (support both single product and multiple products)
  const getItems = () => {
    if (!quotationRequest) return [];
    if ((quotationRequest as any).items) {
      return (quotationRequest as any).items;
    }
    // Fallback: Create array with single product
    return [{
      tenSanPham: quotationRequest.tenSanPham,
      soLuong: quotationRequest.soLuong,
      donViTinh: quotationRequest.donViTinh,
    }];
  };

  // Auto-update general costs in all tabs when generalCostGroups changes
  useEffect(() => {
    if (!quotationRequest || tabsData.length === 0) return;

    const items = getItems();

    // Helper function to calculate general cost for a product from all groups
    const calculateGeneralCostForProduct = (productId: string, productKhoiLuong: number) => {
      let totalKeHoach = 0;
      let totalThucTe = 0;

      generalCostGroups.forEach(group => {
        const groupTotalKeHoach = group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
        const groupTotalThucTe = group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);

        // Check if this product is selected for this group
        // CHỈ khi selectedProducts có phần tử mới kiểm tra
        const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(productId);
        if (!isProductSelected) return;

        // Get all selected products for this group
        const selectedMainItems = items.filter((_: any, index: number) => {
          const pid = `tab-${index}`;
          return group.selectedProducts.includes(pid);
        });

        const selectedAdditionalItems = additionalCostTabs.filter(tab => {
          const pid = `additional-${tab.id}`;
          return group.selectedProducts.includes(pid);
        });

        const totalKhoiLuong = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
          selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData.soLuong || '0'), 0);

        if (totalKhoiLuong === 0) return;

        const totalSelectedProducts = selectedMainItems.length + selectedAdditionalItems.length;
        if (totalSelectedProducts === 1) {
          totalKeHoach += groupTotalKeHoach;
          totalThucTe += groupTotalThucTe;
        } else {
          totalKeHoach += (groupTotalKeHoach * productKhoiLuong) / totalKhoiLuong;
          totalThucTe += (groupTotalThucTe * productKhoiLuong) / totalKhoiLuong;
        }
      });

      return { keHoach: totalKeHoach, thucTe: totalThucTe };
    };

    // Update main product tabs
    const updatedTabsData = tabsData.map((tab, tabIndex) => {
      const currentItem = items[tabIndex];
      const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
      const currentProductId = `tab-${tabIndex}`;

      const { keHoach, thucTe } = calculateGeneralCostForProduct(currentProductId, currentKhoiLuong);

      return {
        ...tab,
        formData: {
          ...tab.formData,
          chiPhiChungKeHoach: keHoach.toString(),
          chiPhiChungThucTe: thucTe.toString(),
        }
      };
    });

    setTabsData(updatedTabsData);

    // Update additional cost tabs
    const updatedAdditionalTabs = additionalCostTabs.map((tab) => {
      const currentKhoiLuong = parseFloat(tab.formData.soLuong || '0');
      const currentProductId = `additional-${tab.id}`;

      const { keHoach, thucTe } = calculateGeneralCostForProduct(currentProductId, currentKhoiLuong);

      return {
        ...tab,
        formData: {
          ...tab.formData,
          chiPhiChungKeHoach: keHoach.toString(),
          chiPhiChungThucTe: thucTe.toString(),
        }
      };
    });

    setAdditionalCostTabs(updatedAdditionalTabs);
  }, [generalCostGroups]);

  const initializeTabs = async () => {
    if (!quotationRequest) return;

    // Get all items from quotation request
    const items = getItems();

    // Try to load saved data from database first
    try {
      const response = await quotationCalculatorService.getByQuotationRequestId(quotationRequest.id);

      if (response.success && response.data) {
        const calculator = response.data;
        console.log('📦 Loaded calculator from database:', calculator);
        console.log('📦 All products from DB:', calculator.products);
        console.log('📦 Number of products:', calculator.products?.length);

        // Filter out additional cost products and get regular products
        const regularProducts = calculator.products.filter((p: any) => !p.isAdditionalCost);
        const additionalCostProducts = calculator.products.filter((p: any) => p.isAdditionalCost);
        console.log('📦 Regular products count:', regularProducts.length);
        console.log('📦 Additional cost products count:', additionalCostProducts.length);

        // Generate base code for new products (only used if no saved data)
        const codeResponse = await quotationService.generateQuotationCode();
        const baseCode = codeResponse.data.code;

        // Load full MaterialStandard and ProductionProcess data for each item
        // Match saved products by index (order) instead of maBaoGia
        const loadedTabs = await Promise.all(items.map(async (item: any, index: number) => {
          // Try to find saved product by index
          const savedProduct = regularProducts[index];
          const maBaoGia = savedProduct?.maBaoGia || `${baseCode}-${index + 1}`;

          // If this product was saved before, load its data
          if (savedProduct) {
            const product = savedProduct;
            console.log('🔍 Processing saved product:', product);
            // Debug các trường thực tế mới từ database
            console.log('🔍 Các trường thực tế mới từ DB:', {
              tongKhoiLuongThanhPhamThucTe: product.tongKhoiLuongThanhPhamThucTe,
              thanhPhamTonKhoThucTe: product.thanhPhamTonKhoThucTe,
              tongThanhPhamCanSxThemThucTe: product.tongThanhPhamCanSxThemThucTe,
              tongNguyenLieuCanSanXuatThucTe: product.tongNguyenLieuCanSanXuatThucTe,
              loiNhuanCongThemThucTe: product.loiNhuanCongThemThucTe,
            });
            let selectedStandard = null;
            let selectedProcess = null;

            // Load full MaterialStandard if exists
            if (product.materialStandardId) {
              try {
                // getMaterialStandardById returns MaterialStandard directly (not wrapped in ApiResponse)
                selectedStandard = await materialStandardService.getMaterialStandardById(product.materialStandardId);
                console.log('Loaded material standard:', selectedStandard);
              } catch (error) {
                console.error('Error loading material standard:', error);
                // Fallback to partial data
                selectedStandard = {
                  id: product.materialStandardId,
                  maDinhMuc: product.maDinhMuc || '',
                  tenDinhMuc: product.tenDinhMuc || '',
                } as any;
              }
            }

            // Load full ProductionProcess if exists
            if (product.productionProcessId) {
              try {
                const response = await productionProcessService.getProductionProcessById(product.productionProcessId);

                // Extract process data from response
                selectedProcess = {
                  ...response.data,
                  flowchart: product.flowchartData || response.flowchart, // Prioritize saved flowchart
                };

                console.log('Loaded production process:', selectedProcess);
              } catch (error) {
                console.error('Error loading production process:', error);
                // Fallback to partial data
                selectedProcess = {
                  id: product.productionProcessId,
                  maQuyTrinhSanXuat: product.maQuyTrinhSanXuat || '',
                  tenQuyTrinhSanXuat: product.tenQuyTrinhSanXuat || '',
                  flowchart: product.flowchartData || undefined,
                } as any;
              }
            }

            return {
              selectedStandard,
              selectedProcess,
              formData: {
                maBaoGia: product.maBaoGia || '',
                maDinhMuc: product.maDinhMuc || '',
                tenDinhMuc: product.tenDinhMuc || '',
                tiLeThuHoi: product.tiLeThuHoi?.toString() || '',
                sanPhamDauRa: product.sanPhamDauRa || '',
                nguyenLieuDauVao: product.nguyenLieuDauVao || '',
                thanhPhamTonKho: product.thanhPhamTonKho?.toString() || '',
                tongThanhPhamCanSxThem: product.tongThanhPhamCanSxThem?.toString() || '',
                tongNguyenLieuCanSanXuat: product.tongNguyenLieuCanSanXuat?.toString() || '',
                nguyenLieuTonKho: product.nguyenLieuTonKho?.toString() || '',
                nguyenLieuCanNhapThem: product.nguyenLieuCanNhapThem?.toString() || '',
                // Các trường thực tế mới
                tongKhoiLuongThanhPhamThucTe: product.tongKhoiLuongThanhPhamThucTe?.toString() || '',
                thanhPhamTonKhoThucTe: product.thanhPhamTonKhoThucTe?.toString() || '',
                tongThanhPhamCanSxThemThucTe: product.tongThanhPhamCanSxThemThucTe?.toString() || '',
                tongNguyenLieuCanSanXuatThucTe: product.tongNguyenLieuCanSanXuatThucTe?.toString() || '',
                ghiChu: product.ghiChu || '',
                thoiGianChoPhepToiDa: product.thoiGianChoPhepToiDa?.toString() || '',
                ngayBatDauSanXuat: product.ngayBatDauSanXuat ? new Date(product.ngayBatDauSanXuat).toISOString().split('T')[0] : '',
                ngayHoanThanhThucTe: product.ngayHoanThanhThucTe?.toString() || '',
                chiPhiSanXuatKeHoach: product.chiPhiSanXuatKeHoach?.toString() || '',
                chiPhiSanXuatThucTe: product.chiPhiSanXuatThucTe?.toString() || '',
                chiPhiChungKeHoach: product.chiPhiChungKeHoach?.toString() || '',
                chiPhiChungThucTe: product.chiPhiChungThucTe?.toString() || '',
                chiPhiXuatKhauKeHoach: product.chiPhiXuatKhauKeHoach?.toString() || '',
                chiPhiXuatKhauThucTe: product.chiPhiXuatKhauThucTe?.toString() || '',
                giaHoaVon: product.giaHoaVon?.toString() || '',
                loiNhuanCongThem: product.loiNhuanCongThem?.toString() || '',
                giaHoaVonSanPhamPhu: product.byProducts?.reduce((acc: any, bp: any) => {
                  acc[bp.tenSanPham] = bp.giaHoaVon?.toString() || '0';
                  return acc;
                }, {}) || {},
                // Load các trường thực tế từ byProducts
                tiLeThuHoiThucTe: product.byProducts?.reduce((acc: any, bp: any) => {
                  if (bp.tiLeThuHoiThucTe !== null && bp.tiLeThuHoiThucTe !== undefined) {
                    acc[bp.tenSanPham] = bp.tiLeThuHoiThucTe.toString();
                  }
                  return acc;
                }, {}) || {},
                loiNhuanCongThemThucTe: product.loiNhuanCongThemThucTe?.toString() || '',
                giaHoaVonSanPhamPhuThucTe: product.byProducts?.reduce((acc: any, bp: any) => {
                  if (bp.giaHoaVonThucTe !== null && bp.giaHoaVonThucTe !== undefined) {
                    acc[bp.tenSanPham] = bp.giaHoaVonThucTe.toString();
                  }
                  return acc;
                }, {}) || {},
                tiGiaUSD: product.tiGiaUSD ? formatNumberWithDots(product.tiGiaUSD) : '',
              },
            };
          } else {
            // This is a new product, initialize with empty data
            console.log('🆕 Initializing new product at index:', index);
            return {
              selectedStandard: null,
              selectedProcess: null,
              formData: {
                maBaoGia: maBaoGia,
                maDinhMuc: '',
                tenDinhMuc: '',
                tiLeThuHoi: '',
                sanPhamDauRa: '',
                nguyenLieuDauVao: '',
                thanhPhamTonKho: '',
                tongThanhPhamCanSxThem: '',
                tongNguyenLieuCanSanXuat: '',
                nguyenLieuTonKho: '',
                nguyenLieuCanNhapThem: '',
                // Các trường thực tế mới
                tongKhoiLuongThanhPhamThucTe: '',
                thanhPhamTonKhoThucTe: '',
                tongThanhPhamCanSxThemThucTe: '',
                tongNguyenLieuCanSanXuatThucTe: '',
                ghiChu: '',
                thoiGianChoPhepToiDa: '',
                ngayBatDauSanXuat: '',
                ngayHoanThanhThucTe: '',
                chiPhiSanXuatKeHoach: '',
                chiPhiSanXuatThucTe: '',
                chiPhiChungKeHoach: '',
                chiPhiChungThucTe: '',
                chiPhiXuatKhauKeHoach: '',
                chiPhiXuatKhauThucTe: '',
                giaHoaVon: '',
                loiNhuanCongThem: '',
                loiNhuanCongThemThucTe: '',
                giaHoaVonSanPhamPhu: {},
                tiLeThuHoiThucTe: {},
                giaHoaVonSanPhamPhuThucTe: {},
              },
            };
          }
        }));

        setTabsData(loadedTabs);

        // Load general costs into the first general cost group
        const loadedGeneralCosts = calculator.generalCosts.map((cost: any) => ({
          id: cost.id,
          costId: cost.generalCostId,
          tenChiPhi: cost.tenChiPhi,
          donViTinh: cost.donViTinh,
          keHoach: cost.keHoach,
          thucTe: cost.thucTe,
        }));

        // Load general cost groups if saved, otherwise use default with loaded costs
        console.log('🔍 [Load] Raw generalCostGroupsData from DB:', calculator.generalCostGroupsData);
        console.log('🔍 [Load] Type of generalCostGroupsData:', typeof calculator.generalCostGroupsData);
        console.log('🔍 [Load] Is Array:', Array.isArray(calculator.generalCostGroupsData));

        if (calculator.generalCostGroupsData && Array.isArray(calculator.generalCostGroupsData) && calculator.generalCostGroupsData.length > 0) {
          const loadedGroups = calculator.generalCostGroupsData.map((group: any) => {
            console.log('🔍 [Load] Processing group:', group);
            console.log('🔍 [Load] Group selectedProducts:', group.selectedProducts);
            return {
              id: group.id,
              tenBangChiPhi: group.tenBangChiPhi,
              selectedCosts: group.selectedCosts || [],
              selectedProducts: group.selectedProducts || [],
            };
          });
          console.log('✅ [Load] Final loadedGroups:', loadedGroups);
          setGeneralCostGroups(loadedGroups);
        } else {
          // Backward compatibility: put all costs in first group
          console.log('⚠️ [Load] No generalCostGroupsData found, using default with loadedGeneralCosts');
          setGeneralCostGroups([{
            id: `gcg-${Date.now()}`,
            tenBangChiPhi: 'Chi phí chung 1',
            selectedCosts: loadedGeneralCosts,
            selectedProducts: [],
          }]);
        }

        // Load export costs
        const loadedExportCosts = calculator.exportCosts.map((cost: any) => ({
          id: cost.id,
          costId: cost.exportCostId,
          tenChiPhi: cost.tenChiPhi,
          donViTinh: cost.donViTinh,
          keHoach: cost.keHoach,
          thucTe: cost.thucTe,
        }));
        setSelectedExportCosts(loadedExportCosts);

        setPhanTramThue(calculator.phanTramThue?.toString() || '');
        setPhanTramQuy(calculator.phanTramQuy?.toString() || '');
        setActiveTab(0);

        // Load additional cost tabs (products with isAdditionalCost flag)
        const additionalProducts = calculator.products.filter((p: any) => p.isAdditionalCost);
        if (additionalProducts.length > 0) {
          const loadedAdditionalTabs = await Promise.all(additionalProducts.map(async (product: any) => {
            let selectedStandard = null;
            let selectedProcess = null;

            // Load full MaterialStandard if exists
            if (product.materialStandardId) {
              try {
                selectedStandard = await materialStandardService.getMaterialStandardById(product.materialStandardId);
              } catch (error) {
                console.error('Error loading material standard for additional cost:', error);
              }
            }

            // Load full ProductionProcess if exists
            if (product.productionProcessId) {
              try {
                const response = await productionProcessService.getProductionProcessById(product.productionProcessId);
                selectedProcess = {
                  ...response.data,
                  flowchart: product.flowchartData || response.flowchart,
                };
              } catch (error) {
                console.error('Error loading production process for additional cost:', error);
              }
            }

            return {
              // Sử dụng originalTabId nếu có, nếu không thì dùng product.id hoặc tạo mới
              id: product.originalTabId || product.id || `additional-${Date.now()}-${Math.random()}`,
              tenChiPhiBoSung: product.tenChiPhiBoSung || product.tenSanPham || '',
              selectedProduct: product.productId ? { id: product.productId, tenSanPham: product.tenSanPham } as any : null,
              selectedProductType: '', // Will be set when product is loaded
              selectedStandard,
              selectedProcess,
              formData: {
                maBaoGia: product.maBaoGia || '',
                maDinhMuc: product.maDinhMuc || '',
                tenDinhMuc: product.tenDinhMuc || '',
                tiLeThuHoi: product.tiLeThuHoi?.toString() || '',
                sanPhamDauRa: product.sanPhamDauRa || '',
                nguyenLieuDauVao: product.nguyenLieuDauVao || '',
                thanhPhamTonKho: product.thanhPhamTonKho?.toString() || '',
                tongThanhPhamCanSxThem: product.tongThanhPhamCanSxThem?.toString() || '',
                tongNguyenLieuCanSanXuat: product.tongNguyenLieuCanSanXuat?.toString() || '',
                nguyenLieuTonKho: product.nguyenLieuTonKho?.toString() || '',
                nguyenLieuCanNhapThem: product.nguyenLieuCanNhapThem?.toString() || '',
                ghiChu: product.ghiChu || '',
                thoiGianChoPhepToiDa: product.thoiGianChoPhepToiDa?.toString() || '',
                ngayBatDauSanXuat: product.ngayBatDauSanXuat ? new Date(product.ngayBatDauSanXuat).toISOString().split('T')[0] : '',
                ngayHoanThanhThucTe: product.ngayHoanThanhThucTe?.toString() || '',
                chiPhiSanXuatKeHoach: product.chiPhiSanXuatKeHoach?.toString() || '',
                chiPhiSanXuatThucTe: product.chiPhiSanXuatThucTe?.toString() || '',
                chiPhiChungKeHoach: product.chiPhiChungKeHoach?.toString() || '',
                chiPhiChungThucTe: product.chiPhiChungThucTe?.toString() || '',
                chiPhiXuatKhauKeHoach: product.chiPhiXuatKhauKeHoach?.toString() || '',
                chiPhiXuatKhauThucTe: product.chiPhiXuatKhauThucTe?.toString() || '',
                giaHoaVon: product.giaHoaVon?.toString() || '',
                loiNhuanCongThem: product.loiNhuanCongThem?.toString() || '',
                giaHoaVonSanPhamPhu: product.byProducts?.reduce((acc: any, bp: any) => {
                  acc[bp.tenSanPham] = bp.giaHoaVon?.toString() || '0';
                  return acc;
                }, {}) || {},
                soLuong: product.soLuong?.toString() || '',
                donViTinh: product.donViTinh || '',
                tiGiaUSD: product.tiGiaUSD ? formatNumberWithDots(product.tiGiaUSD) : '',
              },
            };
          }));
          setAdditionalCostTabs(loadedAdditionalTabs);
        }

        console.log('✅ Loaded and merged quotation calculator data from database');
        return;
      }
    } catch (error) {
      console.error('Error loading saved calculator data:', error);
      // Continue to initialize new tabs if loading fails
    }

    // No saved data, initialize new tabs
    try {
      const response = await quotationService.generateQuotationCode();
      const baseCode = response.data.code;

      // Initialize one tab per product
      const initialTabs = items.map((_: any, index: number) => ({
        selectedStandard: null,
        selectedProcess: null,
        formData: {
          maBaoGia: `${baseCode}-${index + 1}`,
          maDinhMuc: '',
          tenDinhMuc: '',
          tiLeThuHoi: '',
          sanPhamDauRa: '',
          nguyenLieuDauVao: '',
          thanhPhamTonKho: '',
          tongThanhPhamCanSxThem: '',
          tongNguyenLieuCanSanXuat: '',
          nguyenLieuTonKho: '',
          nguyenLieuCanNhapThem: '',
          // Các trường thực tế mới
          tongKhoiLuongThanhPhamThucTe: '',
          thanhPhamTonKhoThucTe: '',
          tongThanhPhamCanSxThemThucTe: '',
          tongNguyenLieuCanSanXuatThucTe: '',
          ghiChu: '',
          // Các trường mới
          thoiGianChoPhepToiDa: '',
          ngayBatDauSanXuat: '',
          ngayHoanThanhThucTe: '',
          chiPhiSanXuatKeHoach: '',
          chiPhiSanXuatThucTe: '',
          chiPhiChungKeHoach: '',
          chiPhiChungThucTe: '',
          chiPhiXuatKhauKeHoach: '',
          chiPhiXuatKhauThucTe: '',
          giaHoaVon: '',
          loiNhuanCongThem: '',
          giaHoaVonSanPhamPhu: {},
          // Các trường thực tế cho thành phẩm đầu ra
          tiLeThuHoiThucTe: {},
          loiNhuanCongThemThucTe: '',
          giaHoaVonSanPhamPhuThucTe: {},
          // Tỉ giá USD cho giá báo khách
          tiGiaUSD: '',
        },
      }));

      setTabsData(initialTabs);
      setActiveTab(0);
    } catch (error: any) {
      console.error('Error initializing tabs:', error);

      // Fallback: Initialize tabs with temporary codes if API fails
      const initialTabs = items.map((_: any, index: number) => ({
        selectedStandard: null,
        selectedProcess: null,
        formData: {
          maBaoGia: `BG-TEMP-${index + 1}`,
          maDinhMuc: '',
          tenDinhMuc: '',
          tiLeThuHoi: '',
          sanPhamDauRa: '',
          nguyenLieuDauVao: '',
          thanhPhamTonKho: '',
          tongThanhPhamCanSxThem: '',
          tongNguyenLieuCanSanXuat: '',
          nguyenLieuTonKho: '',
          nguyenLieuCanNhapThem: '',
          // Các trường thực tế mới
          tongKhoiLuongThanhPhamThucTe: '',
          thanhPhamTonKhoThucTe: '',
          tongThanhPhamCanSxThemThucTe: '',
          tongNguyenLieuCanSanXuatThucTe: '',
          ghiChu: '',
          // Các trường mới
          thoiGianChoPhepToiDa: '',
          ngayBatDauSanXuat: '',
          ngayHoanThanhThucTe: '',
          chiPhiSanXuatKeHoach: '',
          chiPhiSanXuatThucTe: '',
          chiPhiChungKeHoach: '',
          chiPhiChungThucTe: '',
          chiPhiXuatKhauKeHoach: '',
          chiPhiXuatKhauThucTe: '',
          giaHoaVon: '',
          loiNhuanCongThem: '',
          giaHoaVonSanPhamPhu: {},
          // Các trường thực tế cho thành phẩm đầu ra
          tiLeThuHoiThucTe: {},
          loiNhuanCongThemThucTe: '',
          giaHoaVonSanPhamPhuThucTe: {},
          // Tỉ giá USD cho giá báo khách
          tiGiaUSD: '',
        },
      }));

      setTabsData(initialTabs);
      setActiveTab(0);

      // Show error to user
      if (error.response?.status === 401) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
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

  const loadProductionProcesses = async () => {
    try {
      const response = await productionProcessService.getAllProductionProcesses(1, 100);
      console.log('QuotationCalculatorModal - Production Processes loaded:', response.data);
      setProductionProcesses(response.data);
    } catch (error) {
      console.error('Error loading production processes:', error);
    }
  };

  // Functions for additional cost tabs
  const handleAddAdditionalCost = async () => {
    if (!newCostName.trim()) {
      alert('Vui lòng nhập tên chi phí bổ sung');
      return;
    }

    try {
      const codeResponse = await quotationService.generateQuotationCode();
      const baseCode = codeResponse.data.code;
      const items = getItems();
      const additionalIndex = items.length + additionalCostTabs.length + 1;

      const newTab: typeof additionalCostTabs[0] = {
        id: `additional-${Date.now()}`,
        tenChiPhiBoSung: newCostName.trim(),
        selectedProduct: null,
        selectedProductType: '', // Empty initially
        selectedStandard: null,
        selectedProcess: null,
        formData: {
          maBaoGia: `${baseCode}-BS-${additionalCostTabs.length + 1}`,
          maDinhMuc: '',
          tenDinhMuc: '',
          tiLeThuHoi: '',
          sanPhamDauRa: '',
          nguyenLieuDauVao: '',
          thanhPhamTonKho: '',
          tongThanhPhamCanSxThem: '',
          tongNguyenLieuCanSanXuat: '',
          nguyenLieuTonKho: '',
          nguyenLieuCanNhapThem: '',
          ghiChu: '',
          thoiGianChoPhepToiDa: '',
          ngayBatDauSanXuat: '',
          ngayHoanThanhThucTe: '',
          chiPhiSanXuatKeHoach: '',
          chiPhiSanXuatThucTe: '',
          chiPhiChungKeHoach: '',
          chiPhiChungThucTe: '',
          chiPhiXuatKhauKeHoach: '',
          chiPhiXuatKhauThucTe: '',
          giaHoaVon: '',
          loiNhuanCongThem: '',
          giaHoaVonSanPhamPhu: {},
          soLuong: '',
          donViTinh: '',
          // Tỉ giá USD cho giá báo khách
          tiGiaUSD: '',
        },
      };

      setAdditionalCostTabs(prev => [...prev, newTab]);
      setShowAddCostModal(false);
      setNewCostName('');
      // Switch to the new tab
      setActiveTab(items.length + additionalCostTabs.length);
    } catch (error) {
      console.error('Error adding additional cost tab:', error);
      alert('Lỗi khi thêm chi phí bổ sung');
    }
  };

  const handleRemoveAdditionalCost = (tabId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chi phí bổ sung này?')) return;

    setAdditionalCostTabs(prev => prev.filter(tab => tab.id !== tabId));
    const items = getItems();
    if (activeTab >= items.length + additionalCostTabs.length - 1) {
      setActiveTab(Math.max(0, items.length + additionalCostTabs.length - 2));
    }
  };

  const updateAdditionalTabFormData = (tabId: string, field: string, value: string) => {
    setAdditionalCostTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        return {
          ...tab,
          formData: {
            ...tab.formData,
            [field]: value,
          },
        };
      }
      return tab;
    }));
  };

  const handleAdditionalTabStandardChange = (tabId: string, standardId: string) => {
    const standard = materialStandards.find(s => s.id === standardId);
    if (standard) {
      setAdditionalCostTabs(prev => prev.map(tab => {
        if (tab.id === tabId) {
          return {
            ...tab,
            selectedStandard: standard,
            formData: {
              ...tab.formData,
              maDinhMuc: standard.maDinhMuc,
              tenDinhMuc: standard.tenDinhMuc,
              tiLeThuHoi: standard.tiLeThuHoi?.toString() || '',
              sanPhamDauRa: '',
              nguyenLieuDauVao: '',
            },
          };
        }
        return tab;
      }));
    }
  };

  const handleAdditionalTabProcessChange = async (tabId: string, processId: string) => {
    if (!processId) {
      setAdditionalCostTabs(prev => prev.map(tab => {
        if (tab.id === tabId) {
          return { ...tab, selectedProcess: null };
        }
        return tab;
      }));
      return;
    }

    try {
      const response = await productionProcessService.getProductionProcessById(processId);
      const processData = {
        ...response.data,
        flowchart: response.flowchart || response.data?.flowchart,
      };

      setAdditionalCostTabs(prev => prev.map(tab => {
        if (tab.id === tabId) {
          return { ...tab, selectedProcess: processData };
        }
        return tab;
      }));
    } catch (error) {
      console.error('Error loading production process for additional tab:', error);
    }
  };

  // Handle product type change for additional cost tab
  const handleAdditionalTabProductTypeChange = (tabId: string, productType: string) => {
    setAdditionalCostTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        return {
          ...tab,
          selectedProductType: productType,
          selectedProduct: null, // Reset selected product when type changes
        };
      }
      return tab;
    }));
  };

  const handleAdditionalTabProductChange = (tabId: string, productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    setAdditionalCostTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        return {
          ...tab,
          selectedProduct: product || null,
        };
      }
      return tab;
    }));
  };

  const handleAdditionalTabFlowchartCostChange = (tabId: string, sectionIndex: number, costIndex: number, field: string, value: string) => {
    setAdditionalCostTabs(prev => prev.map(tab => {
      if (tab.id === tabId && tab.selectedProcess?.flowchart) {
        const updatedSections = [...tab.selectedProcess.flowchart.sections];
        const numValue = parseFloat(value);
        (updatedSections[sectionIndex].costs[costIndex] as any)[field] = isNaN(numValue) ? undefined : numValue;

        return {
          ...tab,
          selectedProcess: {
            ...tab.selectedProcess,
            flowchart: {
              ...tab.selectedProcess.flowchart,
              sections: updatedSections,
            },
          },
        };
      }
      return tab;
    }));
  };

  const handleStandardChange = (standardId: string) => {
    const standard = materialStandards.find(s => s.id === standardId);
    if (standard) {
      setTabsData(prev => {
        const newTabs = [...prev];
        newTabs[activeTab] = {
          ...newTabs[activeTab],
          selectedStandard: standard,
          formData: {
            ...newTabs[activeTab].formData,
            maDinhMuc: standard.maDinhMuc,
            tenDinhMuc: standard.tenDinhMuc,
            tiLeThuHoi: standard.tiLeThuHoi?.toString() || '', // Auto-fill from MaterialStandard
            sanPhamDauRa: '', // Reset selected product
            nguyenLieuDauVao: '', // Reset selected input material
          },
        };
        return newTabs;
      });
    }
  };

  const handleProcessChange = async (processId: string) => {
    if (!processId) {
      setTabsData(prev => {
        const newTabs = [...prev];
        newTabs[activeTab] = {
          ...newTabs[activeTab],
          selectedProcess: null,
        };
        return newTabs;
      });
      return;
    }

    try {
      const response = await productionProcessService.getProductionProcessById(processId);
      console.log('Loaded production process - Full response:', response);
      console.log('🔍 response.success:', response.success);
      console.log('🔍 response.data:', response.data);
      console.log('🔍 response.flowchart:', response.flowchart);
      console.log('🔍 response.data.flowchart:', response.data?.flowchart);

      // Extract the actual process data
      // API returns {success: true, data: {...}, flowchart: {...}}
      const processData = {
        ...response.data,
        flowchart: response.flowchart || response.data?.flowchart, // Try both locations
      };

      console.log('🔍 Extracted processData:', processData);
      console.log('🔍 processData.flowchart:', processData.flowchart);

      setTabsData(prev => {
        const newTabs = [...prev];
        newTabs[activeTab] = {
          ...newTabs[activeTab],
          selectedProcess: processData,
        };

        // Recalculate planned production cost and update form field so UI reflects change
        try {
          let chiPhiSanXuatPerDay = 0;
          if (processData.flowchart?.sections) {
            chiPhiSanXuatPerDay = processData.flowchart.sections.reduce((sum: number, section: any) => {
              return sum + (section.costs || []).reduce((costSum: number, cost: any) => {
                const gia = cost.giaKeHoach || 0;
                const soLuong = cost.soLuongKeHoach || 0;
                return costSum + (gia * soLuong);
              }, 0);
            }, 0);
          }
          const maxDays = parseFloat(newTabs[activeTab].formData.thoiGianChoPhepToiDa) || 1;
          newTabs[activeTab].formData.chiPhiSanXuatKeHoach = (chiPhiSanXuatPerDay * maxDays).toString();
        } catch (e) {
          // ignore
        }

        console.log('✅ Updated tab with selectedProcess:', newTabs[activeTab]);
        return newTabs;
      });
    } catch (error) {
      console.error('Error loading production process details:', error);
      alert('Lỗi khi tải chi tiết quy trình sản xuất');
    }
  };

  const updateFormData = (field: string, value: string) => {
    // Debug log khi cập nhật các trường thực tế
    if (field.includes('ThucTe')) {
      console.log(`📝 [updateFormData] Updating field: ${field} = ${value}`);
    }
    setTabsData(prev => {
      const newTabs = [...prev];
      newTabs[activeTab] = {
        ...newTabs[activeTab],
        formData: {
          ...newTabs[activeTab].formData,
          [field]: value,
        },
      };
      return newTabs;
    });
  };

  const handleFlowchartCostChange = (sectionIndex: number, costIndex: number, field: string, value: string) => {
    setTabsData(prev => {
      const newTabs = [...prev];
      const currentProcess = newTabs[activeTab].selectedProcess;

      if (!currentProcess || !currentProcess.flowchart) return prev;

      const updatedSections = [...currentProcess.flowchart.sections];
      const numValue = parseFloat(value);
      (updatedSections[sectionIndex].costs[costIndex] as any)[field] = isNaN(numValue) ? undefined : numValue;

      newTabs[activeTab] = {
        ...newTabs[activeTab],
        selectedProcess: {
          ...currentProcess,
          flowchart: {
            ...currentProcess.flowchart,
            sections: updatedSections,
          },
        },
      };

      return newTabs;
    });
  };

  // Tính toán "Tổng Thành phẩm cần sx thêm"
  const calculateTotalNeeded = (orderQuantity: number, inventory: number): number => {
    const total = orderQuantity - inventory;
    return total > 0 ? total : 0; // Không cho phép số âm
  };

  // Tính toán "Tổng nguyên liệu cần sản xuất"
  // Công thức: ((100 × Tổng Thành phẩm cần sx thêm) / Tỉ lệ thu hồi của sp đầu ra) / (Tỉ lệ thu hồi thành phẩm K3 / 100)
  const calculateTotalMaterialNeeded = (
    tongThanhPhamCanSxThem: number,
    tiLeThuHoiSanPham: number, // Tỉ lệ thu hồi của sp đầu ra (ví dụ: 40)
    tiLeThuHoiThanhPham: number // Tỉ lệ thu hồi thành phẩm K3 (ví dụ: 15)
  ): number => {
    if (tiLeThuHoiSanPham === 0 || tiLeThuHoiThanhPham === 0) {
      return 0;
    }
    const result = ((100 * tongThanhPhamCanSxThem) / tiLeThuHoiSanPham) / (tiLeThuHoiThanhPham / 100);
    return result;
  };

  // Tính toán "Nguyên liệu cần nhập thêm"
  // Công thức: Tổng nguyên liệu cần sản xuất - Nguyên liệu tồn kho
  const calculateMaterialToImport = (totalMaterialNeeded: number, materialInventory: number): number => {
    const result = totalMaterialNeeded - materialInventory;
    return result > 0 ? result : 0; // Không cho phép số âm
  };

  // Kiểm tra tồn kho sản phẩm đầu ra + nguyên liệu đầu vào
  const handleCheckInventory = async (productName: string, materialName?: string) => {
    if (!productName && !materialName) {
      alert('Vui lòng chọn sản phẩm đầu ra hoặc nguyên liệu đầu vào trước');
      return;
    }

    setInventoryCheckResult({ show: true, loading: true, productName: productName || '', materialName: materialName || '', items: [], materialItems: [] });

    try {
      const response = await warehouseService.getAllLotProducts();
      const lotProducts = response.data?.data || response.data || [];

      // Lọc tồn kho sản phẩm đầu ra
      const matchedProducts = productName ? lotProducts.filter(
        (lp: any) => lp.internationalProduct?.tenSanPham === productName
      ) : [];

      const items = matchedProducts.map((lp: any) => ({
        tenKho: lp.lot?.warehouse?.tenKho || 'N/A',
        tenLo: lp.lot?.tenLo || 'N/A',
        soLuong: lp.soLuong || 0,
        giaThanh: lp.giaThanh || 0,
        donViTinh: lp.donViTinh || 'KG',
      }));

      // Lọc tồn kho nguyên liệu đầu vào
      const matchedMaterials = materialName ? lotProducts.filter(
        (lp: any) => lp.internationalProduct?.tenSanPham === materialName
      ) : [];

      const materialItems = matchedMaterials.map((lp: any) => ({
        tenKho: lp.lot?.warehouse?.tenKho || 'N/A',
        tenLo: lp.lot?.tenLo || 'N/A',
        soLuong: lp.soLuong || 0,
        giaThanh: lp.giaThanh || 0,
        donViTinh: lp.donViTinh || 'KG',
      }));

      setInventoryCheckResult({ show: true, loading: false, productName: productName || '', materialName: materialName || '', items, materialItems });
    } catch (error) {
      console.error('Lỗi kiểm tra tồn kho:', error);
      setInventoryCheckResult({ show: true, loading: false, productName: productName || '', materialName: materialName || '', items: [], materialItems: [] });
    }
  };

  // Auto-fill tồn kho khi chọn sản phẩm đầu ra
  const handleOutputProductChange = async (productName: string) => {
    updateFormData('sanPhamDauRa', productName);

    if (productName) {
      try {
        const response = await warehouseInventoryService.getInventoryByProductName(productName);

        if (response.success && response.data) {
          // Auto-fill số lượng tồn kho
          const inventory = response.data.soLuongTon;
          const orderQuantity = quotationRequest.items?.[activeTab]?.soLuong || 0;
          const totalNeeded = calculateTotalNeeded(orderQuantity, inventory);

          // Tính tổng nguyên liệu cần sản xuất
          const currentTab = tabsData[activeTab];
          const tiLeThuHoiThanhPham = parseFloat(currentTab.formData.tiLeThuHoi) || 0;
          const tiLeThuHoiSanPham = currentTab.selectedStandard?.items?.find(
            item => item.tenThanhPham === productName
          )?.tiLe || 0;
          const totalMaterialNeeded = calculateTotalMaterialNeeded(totalNeeded, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);

          // Tính nguyên liệu cần nhập thêm
          const materialInventory = parseFloat(currentTab.formData.nguyenLieuTonKho) || 0;
          const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

          setTabsData(prev => {
            const newTabs = [...prev];
            newTabs[activeTab] = {
              ...newTabs[activeTab],
              formData: {
                ...newTabs[activeTab].formData,
                thanhPhamTonKho: inventory.toString(),
                tongThanhPhamCanSxThem: totalNeeded.toString(),
                tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '',
                nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
              },
            };
            return newTabs;
          });
        } else {
          // Không tìm thấy tồn kho, reset về 0
          const orderQuantity = quotationRequest.items?.[activeTab]?.soLuong || 0;
          const totalNeeded = calculateTotalNeeded(orderQuantity, 0);

          // Tính tổng nguyên liệu cần sản xuất
          const currentTab = tabsData[activeTab];
          const tiLeThuHoiThanhPham = parseFloat(currentTab.formData.tiLeThuHoi) || 0;
          const tiLeThuHoiSanPham = currentTab.selectedStandard?.items?.find(
            item => item.tenThanhPham === productName
          )?.tiLe || 0;
          const totalMaterialNeeded = calculateTotalMaterialNeeded(totalNeeded, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);

          // Tính nguyên liệu cần nhập thêm
          const materialInventory = parseFloat(currentTab.formData.nguyenLieuTonKho) || 0;
          const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

          setTabsData(prev => {
            const newTabs = [...prev];
            newTabs[activeTab] = {
              ...newTabs[activeTab],
              formData: {
                ...newTabs[activeTab].formData,
                thanhPhamTonKho: '0',
                tongThanhPhamCanSxThem: totalNeeded.toString(),
                tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '',
                nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
              },
            };
            return newTabs;
          });
        }
      } catch (error) {
        // Nếu lỗi, reset về 0
        const orderQuantity = quotationRequest.items?.[activeTab]?.soLuong || 0;
        const totalNeeded = calculateTotalNeeded(orderQuantity, 0);

        // Tính tổng nguyên liệu cần sản xuất
        const currentTab = tabsData[activeTab];
        const tiLeThuHoiThanhPham = parseFloat(currentTab.formData.tiLeThuHoi) || 0;
        const tiLeThuHoiSanPham = currentTab.selectedStandard?.items?.find(
          item => item.tenThanhPham === productName
        )?.tiLe || 0;
        const totalMaterialNeeded = calculateTotalMaterialNeeded(totalNeeded, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);

        // Tính nguyên liệu cần nhập thêm
        const materialInventory = parseFloat(currentTab.formData.nguyenLieuTonKho) || 0;
        const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

        setTabsData(prev => {
          const newTabs = [...prev];
          newTabs[activeTab] = {
            ...newTabs[activeTab],
            formData: {
              ...newTabs[activeTab].formData,
              thanhPhamTonKho: '0',
              tongThanhPhamCanSxThem: totalNeeded.toString(),
              tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '',
              nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
            },
          };
          return newTabs;
        });
      }
    } else {
      // Nếu không chọn sản phẩm, reset về rỗng
      setTabsData(prev => {
        const newTabs = [...prev];
        newTabs[activeTab] = {
          ...newTabs[activeTab],
          formData: {
            ...newTabs[activeTab].formData,
            thanhPhamTonKho: '',
            tongThanhPhamCanSxThem: '',
            tongNguyenLieuCanSanXuat: '',
          },
        };
        return newTabs;
      });
    }
  };

  // Handle thay đổi "Thành phẩm tồn kho" thủ công
  const handleInventoryChange = (value: string) => {
    const inventory = parseFloat(value) || 0;
    const orderQuantity = quotationRequest.items?.[activeTab]?.soLuong || 0;
    const totalNeeded = calculateTotalNeeded(orderQuantity, inventory);

    // Tính tổng nguyên liệu cần sản xuất
    const currentTab = tabsData[activeTab];
    const tiLeThuHoiThanhPham = parseFloat(currentTab.formData.tiLeThuHoi) || 0;
    const tiLeThuHoiSanPham = currentTab.selectedStandard?.items?.find(
      item => item.tenThanhPham === currentTab.formData.sanPhamDauRa
    )?.tiLe || 0;
    const totalMaterialNeeded = calculateTotalMaterialNeeded(totalNeeded, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);

    // Tính nguyên liệu cần nhập thêm
    const materialInventory = parseFloat(currentTab.formData.nguyenLieuTonKho) || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

    setTabsData(prev => {
      const newTabs = [...prev];
      newTabs[activeTab] = {
        ...newTabs[activeTab],
        formData: {
          ...newTabs[activeTab].formData,
          thanhPhamTonKho: value,
          tongThanhPhamCanSxThem: totalNeeded.toString(),
          tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '',
          nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
        },
      };
      return newTabs;
    });
  };

  // Handle thay đổi "Thành phẩm tồn kho Thực tế" - auto tính Tổng Thành phẩm cần sx thêm Thực tế
  const handleInventoryThucTeChange = (value: string) => {
    const inventoryThucTe = parseFloat(value) || 0;
    const orderQuantity = quotationRequest.items?.[activeTab]?.soLuong || 0;
    const tongThanhPhamCanSxThemThucTe = calculateTotalNeeded(orderQuantity, inventoryThucTe);

    setTabsData(prev => {
      const newTabs = [...prev];
      newTabs[activeTab] = {
        ...newTabs[activeTab],
        formData: {
          ...newTabs[activeTab].formData,
          thanhPhamTonKhoThucTe: value,
          tongThanhPhamCanSxThemThucTe: tongThanhPhamCanSxThemThucTe.toString(),
        },
      };
      return newTabs;
    });
  };

  // Handle thay đổi "Tỉ lệ thu hồi thành phẩm K3"
  const handleTiLeThuHoiChange = (value: string) => {
    updateFormData('tiLeThuHoi', value);

    // Tính lại tổng nguyên liệu cần sản xuất
    const currentTab = tabsData[activeTab];
    const tongThanhPhamCanSxThem = parseFloat(currentTab.formData.tongThanhPhamCanSxThem) || 0;
    const tiLeThuHoiThanhPham = parseFloat(value) || 0;
    const tiLeThuHoiSanPham = currentTab.selectedStandard?.items?.find(
      item => item.tenThanhPham === currentTab.formData.sanPhamDauRa
    )?.tiLe || 0;
    const totalMaterialNeeded = calculateTotalMaterialNeeded(tongThanhPhamCanSxThem, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);

    // Tính nguyên liệu cần nhập thêm
    const materialInventory = parseFloat(currentTab.formData.nguyenLieuTonKho) || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

    setTabsData(prev => {
      const newTabs = [...prev];
      newTabs[activeTab] = {
        ...newTabs[activeTab],
        formData: {
          ...newTabs[activeTab].formData,
          tiLeThuHoi: value,
          tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '',
          nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
        },
      };
      return newTabs;
    });
  };

  // Handle thay đổi "Nguyên liệu tồn kho"
  const handleMaterialInventoryChange = (value: string) => {
    const materialInventory = parseFloat(value) || 0;
    const currentTab = tabsData[activeTab];
    const totalMaterialNeeded = parseFloat(currentTab.formData.tongNguyenLieuCanSanXuat) || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

    setTabsData(prev => {
      const newTabs = [...prev];
      newTabs[activeTab] = {
        ...newTabs[activeTab],
        formData: {
          ...newTabs[activeTab].formData,
          nguyenLieuTonKho: value,
          nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
        },
      };
      return newTabs;
    });
  };

  // ==================== ADDITIONAL TAB CALCULATION HANDLERS ====================

  // Auto-fill tồn kho khi chọn sản phẩm đầu ra cho tab Chi phí bổ sung
  const handleAdditionalTabOutputProductChange = async (tabId: string, productName: string) => {
    updateAdditionalTabFormData(tabId, 'sanPhamDauRa', productName);

    if (productName) {
      try {
        const response = await warehouseInventoryService.getInventoryByProductName(productName);

        if (response.success && response.data) {
          // Auto-fill số lượng tồn kho
          const inventory = response.data.soLuongTon;
          const currentTab = additionalCostTabs.find(tab => tab.id === tabId);
          const orderQuantity = parseFloat(currentTab?.formData.soLuong || '0') || 0;
          const totalNeeded = calculateTotalNeeded(orderQuantity, inventory);

          // Tính tổng nguyên liệu cần sản xuất
          const tiLeThuHoiThanhPham = parseFloat(currentTab?.formData.tiLeThuHoi || '0') || 0;
          const tiLeThuHoiSanPham = currentTab?.selectedStandard?.items?.find(
            item => item.tenThanhPham === productName
          )?.tiLe || 0;
          const totalMaterialNeeded = calculateTotalMaterialNeeded(totalNeeded, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);

          // Tính nguyên liệu cần nhập thêm
          const materialInventory = parseFloat(currentTab?.formData.nguyenLieuTonKho || '0') || 0;
          const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

          setAdditionalCostTabs(prev => {
            return prev.map(tab => {
              if (tab.id === tabId) {
                return {
                  ...tab,
                  formData: {
                    ...tab.formData,
                    thanhPhamTonKho: inventory.toString(),
                    tongThanhPhamCanSxThem: totalNeeded.toString(),
                    tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '',
                    nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
                  },
                };
              }
              return tab;
            });
          });
        } else {
          // Không tìm thấy tồn kho, reset về 0
          const currentTab = additionalCostTabs.find(tab => tab.id === tabId);
          const orderQuantity = parseFloat(currentTab?.formData.soLuong || '0') || 0;
          const totalNeeded = calculateTotalNeeded(orderQuantity, 0);

          // Tính tổng nguyên liệu cần sản xuất
          const tiLeThuHoiThanhPham = parseFloat(currentTab?.formData.tiLeThuHoi || '0') || 0;
          const tiLeThuHoiSanPham = currentTab?.selectedStandard?.items?.find(
            item => item.tenThanhPham === productName
          )?.tiLe || 0;
          const totalMaterialNeeded = calculateTotalMaterialNeeded(totalNeeded, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);

          // Tính nguyên liệu cần nhập thêm
          const materialInventory = parseFloat(currentTab?.formData.nguyenLieuTonKho || '0') || 0;
          const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

          setAdditionalCostTabs(prev => {
            return prev.map(tab => {
              if (tab.id === tabId) {
                return {
                  ...tab,
                  formData: {
                    ...tab.formData,
                    thanhPhamTonKho: '0',
                    tongThanhPhamCanSxThem: totalNeeded.toString(),
                    tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '',
                    nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
                  },
                };
              }
              return tab;
            });
          });
        }
      } catch (error) {
        // Nếu lỗi, reset về 0
        const currentTab = additionalCostTabs.find(tab => tab.id === tabId);
        const orderQuantity = parseFloat(currentTab?.formData.soLuong || '0') || 0;
        const totalNeeded = calculateTotalNeeded(orderQuantity, 0);

        // Tính tổng nguyên liệu cần sản xuất
        const tiLeThuHoiThanhPham = parseFloat(currentTab?.formData.tiLeThuHoi || '0') || 0;
        const tiLeThuHoiSanPham = currentTab?.selectedStandard?.items?.find(
          item => item.tenThanhPham === productName
        )?.tiLe || 0;
        const totalMaterialNeeded = calculateTotalMaterialNeeded(totalNeeded, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);

        // Tính nguyên liệu cần nhập thêm
        const materialInventory = parseFloat(currentTab?.formData.nguyenLieuTonKho || '0') || 0;
        const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

        setAdditionalCostTabs(prev => {
          return prev.map(tab => {
            if (tab.id === tabId) {
              return {
                ...tab,
                formData: {
                  ...tab.formData,
                  thanhPhamTonKho: '0',
                  tongThanhPhamCanSxThem: totalNeeded.toString(),
                  tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '',
                  nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
                },
              };
            }
            return tab;
          });
        });
      }
    } else {
      // Nếu không chọn sản phẩm, reset về rỗng
      setAdditionalCostTabs(prev => {
        return prev.map(tab => {
          if (tab.id === tabId) {
            return {
              ...tab,
              formData: {
                ...tab.formData,
                thanhPhamTonKho: '',
                tongThanhPhamCanSxThem: '',
                tongNguyenLieuCanSanXuat: '',
                nguyenLieuCanNhapThem: '',
              },
            };
          }
          return tab;
        });
      });
    }
  };

  // Handle thay đổi "Thành phẩm tồn kho" thủ công cho tab Chi phí bổ sung
  const handleAdditionalTabInventoryChange = (tabId: string, value: string) => {
    const currentTab = additionalCostTabs.find(tab => tab.id === tabId);
    const inventory = parseFloat(value) || 0;
    const orderQuantity = parseFloat(currentTab?.formData.soLuong || '0') || 0;
    const totalNeeded = calculateTotalNeeded(orderQuantity, inventory);

    // Tính tổng nguyên liệu cần sản xuất
    const tiLeThuHoiThanhPham = parseFloat(currentTab?.formData.tiLeThuHoi || '0') || 0;
    const tiLeThuHoiSanPham = currentTab?.selectedStandard?.items?.find(
      item => item.tenThanhPham === currentTab.formData.sanPhamDauRa
    )?.tiLe || 0;
    const totalMaterialNeeded = calculateTotalMaterialNeeded(totalNeeded, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);

    // Tính nguyên liệu cần nhập thêm
    const materialInventory = parseFloat(currentTab?.formData.nguyenLieuTonKho || '0') || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

    setAdditionalCostTabs(prev => {
      return prev.map(tab => {
        if (tab.id === tabId) {
          return {
            ...tab,
            formData: {
              ...tab.formData,
              thanhPhamTonKho: value,
              tongThanhPhamCanSxThem: totalNeeded.toString(),
              tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '',
              nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
            },
          };
        }
        return tab;
      });
    });
  };

  // Handle thay đổi "Tỉ lệ thu hồi thành phẩm K3" cho tab Chi phí bổ sung
  const handleAdditionalTabTiLeThuHoiChange = (tabId: string, value: string) => {
    updateAdditionalTabFormData(tabId, 'tiLeThuHoi', value);

    // Tính lại tổng nguyên liệu cần sản xuất
    const currentTab = additionalCostTabs.find(tab => tab.id === tabId);
    const tongThanhPhamCanSxThem = parseFloat(currentTab?.formData.tongThanhPhamCanSxThem || '0') || 0;
    const tiLeThuHoiThanhPham = parseFloat(value) || 0;
    const tiLeThuHoiSanPham = currentTab?.selectedStandard?.items?.find(
      item => item.tenThanhPham === currentTab.formData.sanPhamDauRa
    )?.tiLe || 0;
    const totalMaterialNeeded = calculateTotalMaterialNeeded(tongThanhPhamCanSxThem, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);

    // Tính nguyên liệu cần nhập thêm
    const materialInventory = parseFloat(currentTab?.formData.nguyenLieuTonKho || '0') || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

    setAdditionalCostTabs(prev => {
      return prev.map(tab => {
        if (tab.id === tabId) {
          return {
            ...tab,
            formData: {
              ...tab.formData,
              tiLeThuHoi: value,
              tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '',
              nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
            },
          };
        }
        return tab;
      });
    });
  };

  // Handle thay đổi "Nguyên liệu tồn kho" cho tab Chi phí bổ sung
  const handleAdditionalTabMaterialInventoryChange = (tabId: string, value: string) => {
    const currentTab = additionalCostTabs.find(tab => tab.id === tabId);
    const materialInventory = parseFloat(value) || 0;
    const totalMaterialNeeded = parseFloat(currentTab?.formData.tongNguyenLieuCanSanXuat || '0') || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);

    setAdditionalCostTabs(prev => {
      return prev.map(tab => {
        if (tab.id === tabId) {
          return {
            ...tab,
            formData: {
              ...tab.formData,
              nguyenLieuTonKho: value,
              nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '',
            },
          };
        }
        return tab;
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quotationRequest) {
      alert('Không tìm thấy thông tin yêu cầu báo giá');
      return;
    }

    const items = getItems();
    const isOrderSummaryTab = activeTab === items.length + additionalCostTabs.length;

    setLoading(true);

    try {
      if (isOrderSummaryTab) {
        // Tab "Báo giá đơn hàng" - Mở modal tạo báo giá
        setLoading(false);
        setShowCreateQuotationModal(true);
        return;
      } else {
        // Tab "Các sản phẩm" - Lưu toàn bộ dữ liệu vào database
        const items = getItems();

        // Prepare calculator data
        console.log('💾 Preparing to save calculator data...');
        console.log('📊 Tabs data:', tabsData);

        const calculatorData = {
          quotationRequestId: quotationRequest.id,
          maYeuCauBaoGia: quotationRequest.maYeuCauBaoGia,
          phanTramThue: phanTramThue ? parseFloat(phanTramThue) : undefined,
          phanTramQuy: phanTramQuy ? parseFloat(phanTramQuy) : undefined,
          products: [
            // Regular products from quotation request
            ...tabsData.map((tab, index) => {
              console.log(`🔍 Tab ${index} - selectedProcess:`, tab.selectedProcess);
              console.log(`🔍 Tab ${index} - flowchart:`, tab.selectedProcess?.flowchart);
              const item = items[index];
              // Tạo byProducts từ selectedStandard.items để đảm bảo tất cả sản phẩm đều được lưu
              const byProducts = tab.selectedStandard?.items?.map(item => {
                const tenSanPham = item.tenThanhPham;
                const tiLe = item.tiLe || 0;
                // Lấy giá hòa vốn kế hoạch từ formData
                const giaHoaVon = tab.formData.giaHoaVonSanPhamPhu?.[tenSanPham]
                  ? parseFloat(tab.formData.giaHoaVonSanPhamPhu[tenSanPham])
                  : 0;
                // Lấy tiLeThuHoiThucTe và giaHoaVonThucTe từ formData
                const tiLeThuHoiThucTe = tab.formData.tiLeThuHoiThucTe?.[tenSanPham]
                  ? parseFloat(tab.formData.tiLeThuHoiThucTe[tenSanPham])
                  : undefined;
                const giaHoaVonThucTe = tab.formData.giaHoaVonSanPhamPhuThucTe?.[tenSanPham]
                  ? parseFloat(tab.formData.giaHoaVonSanPhamPhuThucTe[tenSanPham])
                  : undefined;
                return {
                  tenSanPham,
                  tiLe,
                  tiLeThuHoiThucTe,
                  giaHoaVon,
                  giaHoaVonThucTe,
                };
              }) || [];

              // Debug log byProducts
              console.log(`💾 [Save] Tab ${index} byProducts:`, byProducts);

              // Tính giá hòa vốn tự động
              const giaHoaVonCalculated = calculateGiaHoaVonChinhPham(index);

              return {
                quotationRequestItemId: (item as any).id || quotationRequest.id,
                productId: (item as any).productId || quotationRequest.productId,
                tenSanPham: (item as any).tenSanPham || quotationRequest.tenSanPham,
                soLuong: (item as any).soLuong || quotationRequest.soLuong,
                donViTinh: (item as any).donViTinh || quotationRequest.donViTinh,
                maBaoGia: tab.formData.maBaoGia,
                materialStandardId: tab.selectedStandard?.id,
                maDinhMuc: tab.formData.maDinhMuc,
                tenDinhMuc: tab.formData.tenDinhMuc,
                tiLeThuHoi: tab.formData.tiLeThuHoi ? parseFloat(tab.formData.tiLeThuHoi) : undefined,
                sanPhamDauRa: tab.formData.sanPhamDauRa,
                thanhPhamTonKho: tab.formData.thanhPhamTonKho ? parseFloat(tab.formData.thanhPhamTonKho) : undefined,
                tongThanhPhamCanSxThem: tab.formData.tongThanhPhamCanSxThem ? parseFloat(tab.formData.tongThanhPhamCanSxThem) : undefined,
                tongNguyenLieuCanSanXuat: tab.formData.tongNguyenLieuCanSanXuat ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) : undefined,
                nguyenLieuTonKho: tab.formData.nguyenLieuTonKho ? parseFloat(tab.formData.nguyenLieuTonKho) : undefined,
                nguyenLieuCanNhapThem: tab.formData.nguyenLieuCanNhapThem ? parseFloat(tab.formData.nguyenLieuCanNhapThem) : undefined,
                // Các trường thực tế mới
                tongKhoiLuongThanhPhamThucTe: tab.formData.tongKhoiLuongThanhPhamThucTe ? parseFloat(tab.formData.tongKhoiLuongThanhPhamThucTe) : undefined,
                thanhPhamTonKhoThucTe: tab.formData.thanhPhamTonKhoThucTe ? parseFloat(tab.formData.thanhPhamTonKhoThucTe) : undefined,
                tongThanhPhamCanSxThemThucTe: tab.formData.tongThanhPhamCanSxThemThucTe ? parseFloat(tab.formData.tongThanhPhamCanSxThemThucTe) : undefined,
                tongNguyenLieuCanSanXuatThucTe: tab.formData.tongNguyenLieuCanSanXuatThucTe ? parseFloat(tab.formData.tongNguyenLieuCanSanXuatThucTe) : undefined,
                loiNhuanCongThemThucTe: tab.formData.loiNhuanCongThemThucTe ? parseFloat(tab.formData.loiNhuanCongThemThucTe) : undefined,
                productionProcessId: tab.selectedProcess?.id,
                maQuyTrinhSanXuat: tab.selectedProcess?.maQuyTrinhSanXuat,
                tenQuyTrinhSanXuat: tab.selectedProcess?.tenQuyTrinhSanXuat,
                flowchartData: tab.selectedProcess?.flowchart || undefined,
                thoiGianChoPhepToiDa: tab.formData.thoiGianChoPhepToiDa ? parseFloat(tab.formData.thoiGianChoPhepToiDa) : undefined,
                ngayBatDauSanXuat: tab.formData.ngayBatDauSanXuat || undefined,
                ngayHoanThanhThucTe: tab.formData.ngayHoanThanhThucTe ? parseFloat(tab.formData.ngayHoanThanhThucTe) : undefined,
                chiPhiSanXuatKeHoach: (() => { const v = calculateChiPhiSanXuatKeHoach(index); return v ? v : undefined; })(),
                chiPhiSanXuatThucTe: tab.formData.chiPhiSanXuatThucTe ? parseFloat(tab.formData.chiPhiSanXuatThucTe) : undefined,
                chiPhiChungKeHoach: tab.formData.chiPhiChungKeHoach ? parseFloat(tab.formData.chiPhiChungKeHoach) : undefined,
                chiPhiChungThucTe: tab.formData.chiPhiChungThucTe ? parseFloat(tab.formData.chiPhiChungThucTe) : undefined,
                chiPhiXuatKhauKeHoach: tab.formData.chiPhiXuatKhauKeHoach ? parseFloat(tab.formData.chiPhiXuatKhauKeHoach) : undefined,
                chiPhiXuatKhauThucTe: tab.formData.chiPhiXuatKhauThucTe ? parseFloat(tab.formData.chiPhiXuatKhauThucTe) : undefined,
                giaHoaVon: giaHoaVonCalculated || undefined,
                loiNhuanCongThem: tab.formData.loiNhuanCongThem ? parseFloat(tab.formData.loiNhuanCongThem) : undefined,
                tiGiaUSD: tab.formData.tiGiaUSD ? parseNumberFromDots(tab.formData.tiGiaUSD) : undefined,
                ghiChu: tab.formData.ghiChu,
                byProducts,
                isAdditionalCost: false,
              };
            }),
            // Additional cost tabs
            ...additionalCostTabs.map((tab) => {
              // Tạo byProducts từ selectedStandard.items để đảm bảo tất cả sản phẩm đều được lưu
              const byProducts = tab.selectedStandard?.items?.map(item => {
                const tenSanPham = item.tenThanhPham;
                const tiLe = item.tiLe || 0;
                // Lấy giá hòa vốn kế hoạch từ formData
                const giaHoaVon = tab.formData.giaHoaVonSanPhamPhu?.[tenSanPham]
                  ? parseFloat(tab.formData.giaHoaVonSanPhamPhu[tenSanPham])
                  : 0;
                // Lấy tiLeThuHoiThucTe và giaHoaVonThucTe từ formData
                const tiLeThuHoiThucTe = tab.formData.tiLeThuHoiThucTe?.[tenSanPham]
                  ? parseFloat(tab.formData.tiLeThuHoiThucTe[tenSanPham])
                  : undefined;
                const giaHoaVonThucTe = tab.formData.giaHoaVonSanPhamPhuThucTe?.[tenSanPham]
                  ? parseFloat(tab.formData.giaHoaVonSanPhamPhuThucTe[tenSanPham])
                  : undefined;
                return {
                  tenSanPham,
                  tiLe,
                  tiLeThuHoiThucTe,
                  giaHoaVon,
                  giaHoaVonThucTe,
                };
              }) || [];

              return {
                quotationRequestItemId: quotationRequest.id,
                productId: tab.selectedProduct?.id || '',
                tenSanPham: tab.selectedProduct?.tenSanPham || tab.tenChiPhiBoSung,
                tenChiPhiBoSung: tab.tenChiPhiBoSung,
                originalTabId: tab.id, // Lưu ID gốc của tab để sử dụng khi load lại
                soLuong: tab.formData.soLuong ? parseFloat(tab.formData.soLuong) : 0,
                donViTinh: tab.formData.donViTinh || '',
                maBaoGia: tab.formData.maBaoGia,
                materialStandardId: tab.selectedStandard?.id,
                maDinhMuc: tab.formData.maDinhMuc,
                tenDinhMuc: tab.formData.tenDinhMuc,
                tiLeThuHoi: tab.formData.tiLeThuHoi ? parseFloat(tab.formData.tiLeThuHoi) : undefined,
                sanPhamDauRa: tab.formData.sanPhamDauRa,
                thanhPhamTonKho: tab.formData.thanhPhamTonKho ? parseFloat(tab.formData.thanhPhamTonKho) : undefined,
                tongThanhPhamCanSxThem: tab.formData.tongThanhPhamCanSxThem ? parseFloat(tab.formData.tongThanhPhamCanSxThem) : undefined,
                tongNguyenLieuCanSanXuat: tab.formData.tongNguyenLieuCanSanXuat ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) : undefined,
                nguyenLieuTonKho: tab.formData.nguyenLieuTonKho ? parseFloat(tab.formData.nguyenLieuTonKho) : undefined,
                nguyenLieuCanNhapThem: tab.formData.nguyenLieuCanNhapThem ? parseFloat(tab.formData.nguyenLieuCanNhapThem) : undefined,
                productionProcessId: tab.selectedProcess?.id,
                maQuyTrinhSanXuat: tab.selectedProcess?.maQuyTrinhSanXuat,
                tenQuyTrinhSanXuat: tab.selectedProcess?.tenQuyTrinhSanXuat,
                flowchartData: tab.selectedProcess?.flowchart || undefined,
                thoiGianChoPhepToiDa: tab.formData.thoiGianChoPhepToiDa ? parseFloat(tab.formData.thoiGianChoPhepToiDa) : undefined,
                ngayBatDauSanXuat: tab.formData.ngayBatDauSanXuat || undefined,
                ngayHoanThanhThucTe: tab.formData.ngayHoanThanhThucTe ? parseFloat(tab.formData.ngayHoanThanhThucTe) : undefined,
                chiPhiSanXuatKeHoach: tab.formData.chiPhiSanXuatKeHoach ? parseFloat(tab.formData.chiPhiSanXuatKeHoach) : undefined,
                chiPhiSanXuatThucTe: tab.formData.chiPhiSanXuatThucTe ? parseFloat(tab.formData.chiPhiSanXuatThucTe) : undefined,
                chiPhiChungKeHoach: tab.formData.chiPhiChungKeHoach ? parseFloat(tab.formData.chiPhiChungKeHoach) : undefined,
                chiPhiChungThucTe: tab.formData.chiPhiChungThucTe ? parseFloat(tab.formData.chiPhiChungThucTe) : undefined,
                chiPhiXuatKhauKeHoach: tab.formData.chiPhiXuatKhauKeHoach ? parseFloat(tab.formData.chiPhiXuatKhauKeHoach) : undefined,
                chiPhiXuatKhauThucTe: tab.formData.chiPhiXuatKhauThucTe ? parseFloat(tab.formData.chiPhiXuatKhauThucTe) : undefined,
                giaHoaVon: tab.formData.giaHoaVon ? parseFloat(tab.formData.giaHoaVon) : undefined,
                loiNhuanCongThem: tab.formData.loiNhuanCongThem ? parseFloat(tab.formData.loiNhuanCongThem) : undefined,
                tiGiaUSD: tab.formData.tiGiaUSD ? parseNumberFromDots(tab.formData.tiGiaUSD) : undefined,
                ghiChu: tab.formData.ghiChu,
                byProducts,
                isAdditionalCost: true,
              };
            }),
          ],
          generalCosts: selectedGeneralCosts.map(cost => ({
            costId: cost.costId,
            maChiPhi: cost.costId, // Will be denormalized from GeneralCost
            tenChiPhi: cost.tenChiPhi,
            donViTinh: cost.donViTinh,
            keHoach: cost.keHoach,
            thucTe: cost.thucTe,
          })),
          generalCostGroups: generalCostGroups.map(group => ({
            id: group.id,
            tenBangChiPhi: group.tenBangChiPhi,
            selectedCosts: group.selectedCosts,
            selectedProducts: group.selectedProducts,
          })),
          exportCosts: selectedExportCosts.map(cost => ({
            costId: cost.costId,
            maChiPhi: cost.costId, // Will be denormalized from ExportCost
            tenChiPhi: cost.tenChiPhi,
            donViTinh: cost.donViTinh,
            keHoach: cost.keHoach,
            thucTe: cost.thucTe,
          })),
        };

        // Debug log before saving
        console.log('💾 [Save] generalCostGroups being saved:', calculatorData.generalCostGroups);
        // Debug các trường thực tế trong products
        calculatorData.products.forEach((p: any, i: number) => {
          console.log(`💾 [Save] Product ${i} thực tế fields:`, {
            tongKhoiLuongThanhPhamThucTe: p.tongKhoiLuongThanhPhamThucTe,
            thanhPhamTonKhoThucTe: p.thanhPhamTonKhoThucTe,
            tongThanhPhamCanSxThemThucTe: p.tongThanhPhamCanSxThemThucTe,
            tongNguyenLieuCanSanXuatThucTe: p.tongNguyenLieuCanSanXuatThucTe,
            loiNhuanCongThemThucTe: p.loiNhuanCongThemThucTe,
          });
        });

        // Save to database
        await quotationCalculatorService.upsertCalculator(calculatorData);

        console.log('Đã lưu toàn bộ bảng tính chi phí vào database');
        alert('Lưu dữ liệu thành công!');
      }
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      alert(error.response?.data?.message || 'Lỗi khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrderSummaryData = async () => {
    if (!quotationRequest) {
      alert('Không tìm thấy thông tin yêu cầu báo giá');
      return;
    }

    setLoading(true);

    try {
      const items = getItems();

      // Prepare calculator data (same as in handleSubmit for product tabs)
      console.log('💾 Preparing to save order summary data...');
      console.log('📊 Tabs data:', tabsData);
      // Debug các trường thực tế mới
      tabsData.forEach((tab, index) => {
        console.log(`🔍 Tab ${index} - Các trường thực tế mới:`, {
          tongKhoiLuongThanhPhamThucTe: tab.formData.tongKhoiLuongThanhPhamThucTe,
          thanhPhamTonKhoThucTe: tab.formData.thanhPhamTonKhoThucTe,
          tongThanhPhamCanSxThemThucTe: tab.formData.tongThanhPhamCanSxThemThucTe,
          tongNguyenLieuCanSanXuatThucTe: tab.formData.tongNguyenLieuCanSanXuatThucTe,
          loiNhuanCongThemThucTe: tab.formData.loiNhuanCongThemThucTe,
        });
      });

      const calculatorData = {
        quotationRequestId: quotationRequest.id,
        maYeuCauBaoGia: quotationRequest.maYeuCauBaoGia,
        phanTramThue: phanTramThue ? parseFloat(phanTramThue) : undefined,
        phanTramQuy: phanTramQuy ? parseFloat(phanTramQuy) : undefined,
        products: [
          // Regular products from quotation request
          ...tabsData.map((tab, index) => {
            console.log(`🔍 Tab ${index} - selectedProcess:`, tab.selectedProcess);
            console.log(`🔍 Tab ${index} - flowchart:`, tab.selectedProcess?.flowchart);
            const item = items[index];
            // Tạo byProducts từ selectedStandard.items để đảm bảo tất cả sản phẩm đều được lưu
            const byProducts = tab.selectedStandard?.items?.map(item => {
              const tenSanPham = item.tenThanhPham;
              const tiLe = item.tiLe || 0;
              // Lấy giá hòa vốn kế hoạch từ formData
              const giaHoaVon = tab.formData.giaHoaVonSanPhamPhu?.[tenSanPham]
                ? parseFloat(tab.formData.giaHoaVonSanPhamPhu[tenSanPham])
                : 0;
              // Lấy tiLeThuHoiThucTe và giaHoaVonThucTe từ formData
              const tiLeThuHoiThucTe = tab.formData.tiLeThuHoiThucTe?.[tenSanPham]
                ? parseFloat(tab.formData.tiLeThuHoiThucTe[tenSanPham])
                : undefined;
              const giaHoaVonThucTe = tab.formData.giaHoaVonSanPhamPhuThucTe?.[tenSanPham]
                ? parseFloat(tab.formData.giaHoaVonSanPhamPhuThucTe[tenSanPham])
                : undefined;
              return {
                tenSanPham,
                tiLe,
                tiLeThuHoiThucTe,
                giaHoaVon,
                giaHoaVonThucTe,
              };
            }) || [];

            // Tính giá hòa vốn tự động
            const giaHoaVonCalculated = calculateGiaHoaVonChinhPham(index);

            return {
              quotationRequestItemId: (item as any).id || quotationRequest.id,
              productId: (item as any).productId || quotationRequest.productId,
              tenSanPham: (item as any).tenSanPham || quotationRequest.tenSanPham,
              soLuong: (item as any).soLuong || quotationRequest.soLuong,
              donViTinh: (item as any).donViTinh || quotationRequest.donViTinh,
              maBaoGia: tab.formData.maBaoGia,
              materialStandardId: tab.selectedStandard?.id,
              maDinhMuc: tab.formData.maDinhMuc,
              tenDinhMuc: tab.formData.tenDinhMuc,
              tiLeThuHoi: tab.formData.tiLeThuHoi ? parseFloat(tab.formData.tiLeThuHoi) : undefined,
              sanPhamDauRa: tab.formData.sanPhamDauRa,
              thanhPhamTonKho: tab.formData.thanhPhamTonKho ? parseFloat(tab.formData.thanhPhamTonKho) : undefined,
              tongThanhPhamCanSxThem: tab.formData.tongThanhPhamCanSxThem ? parseFloat(tab.formData.tongThanhPhamCanSxThem) : undefined,
              tongNguyenLieuCanSanXuat: tab.formData.tongNguyenLieuCanSanXuat ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) : undefined,
              nguyenLieuTonKho: tab.formData.nguyenLieuTonKho ? parseFloat(tab.formData.nguyenLieuTonKho) : undefined,
              nguyenLieuCanNhapThem: tab.formData.nguyenLieuCanNhapThem ? parseFloat(tab.formData.nguyenLieuCanNhapThem) : undefined,
              // Các trường thực tế mới
              tongKhoiLuongThanhPhamThucTe: tab.formData.tongKhoiLuongThanhPhamThucTe ? parseFloat(tab.formData.tongKhoiLuongThanhPhamThucTe) : undefined,
              thanhPhamTonKhoThucTe: tab.formData.thanhPhamTonKhoThucTe ? parseFloat(tab.formData.thanhPhamTonKhoThucTe) : undefined,
              tongThanhPhamCanSxThemThucTe: tab.formData.tongThanhPhamCanSxThemThucTe ? parseFloat(tab.formData.tongThanhPhamCanSxThemThucTe) : undefined,
              tongNguyenLieuCanSanXuatThucTe: tab.formData.tongNguyenLieuCanSanXuatThucTe ? parseFloat(tab.formData.tongNguyenLieuCanSanXuatThucTe) : undefined,
              loiNhuanCongThemThucTe: tab.formData.loiNhuanCongThemThucTe ? parseFloat(tab.formData.loiNhuanCongThemThucTe) : undefined,
              productionProcessId: tab.selectedProcess?.id,
              maQuyTrinhSanXuat: tab.selectedProcess?.maQuyTrinhSanXuat,
              tenQuyTrinhSanXuat: tab.selectedProcess?.tenQuyTrinhSanXuat,
              flowchartData: tab.selectedProcess?.flowchart || undefined,
              thoiGianChoPhepToiDa: tab.formData.thoiGianChoPhepToiDa ? parseFloat(tab.formData.thoiGianChoPhepToiDa) : undefined,
              ngayBatDauSanXuat: tab.formData.ngayBatDauSanXuat || undefined,
              ngayHoanThanhThucTe: tab.formData.ngayHoanThanhThucTe ? parseFloat(tab.formData.ngayHoanThanhThucTe) : undefined,
              chiPhiSanXuatKeHoach: (() => { const v = calculateChiPhiSanXuatKeHoach(index); return v ? v : undefined; })(),
              chiPhiSanXuatThucTe: tab.formData.chiPhiSanXuatThucTe ? parseFloat(tab.formData.chiPhiSanXuatThucTe) : undefined,
              chiPhiChungKeHoach: tab.formData.chiPhiChungKeHoach ? parseFloat(tab.formData.chiPhiChungKeHoach) : undefined,
              chiPhiChungThucTe: tab.formData.chiPhiChungThucTe ? parseFloat(tab.formData.chiPhiChungThucTe) : undefined,
              chiPhiXuatKhauKeHoach: tab.formData.chiPhiXuatKhauKeHoach ? parseFloat(tab.formData.chiPhiXuatKhauKeHoach) : undefined,
              chiPhiXuatKhauThucTe: tab.formData.chiPhiXuatKhauThucTe ? parseFloat(tab.formData.chiPhiXuatKhauThucTe) : undefined,
              giaHoaVon: giaHoaVonCalculated || undefined,
              loiNhuanCongThem: tab.formData.loiNhuanCongThem ? parseFloat(tab.formData.loiNhuanCongThem) : undefined,
              tiGiaUSD: tab.formData.tiGiaUSD ? parseNumberFromDots(tab.formData.tiGiaUSD) : undefined,
              ghiChu: tab.formData.ghiChu,
              byProducts,
              isAdditionalCost: false,
            };
          }),
          // Additional cost tabs
          ...additionalCostTabs.map((tab) => {
            const byProducts = tab.formData.giaHoaVonSanPhamPhu
              ? Object.entries(tab.formData.giaHoaVonSanPhamPhu).map(([tenSanPham, giaHoaVon]) => {
                  // Tìm tiLe từ selectedStandard.items
                  const matchedItem = tab.selectedStandard?.items?.find(item => item.tenThanhPham === tenSanPham);
                  const tiLe = matchedItem?.tiLe || 0;
                  return {
                    tenSanPham,
                    tiLe,
                    giaHoaVon: parseFloat(giaHoaVon as string) || 0,
                  };
                })
              : [];

            return {
              quotationRequestItemId: quotationRequest.id,
              productId: tab.selectedProduct?.id || '',
              tenSanPham: tab.selectedProduct?.tenSanPham || tab.tenChiPhiBoSung,
              tenChiPhiBoSung: tab.tenChiPhiBoSung,
              originalTabId: tab.id, // Lưu ID gốc của tab để sử dụng khi load lại
              soLuong: tab.formData.soLuong ? parseFloat(tab.formData.soLuong) : 0,
              donViTinh: tab.formData.donViTinh || '',
              maBaoGia: tab.formData.maBaoGia,
              materialStandardId: tab.selectedStandard?.id,
              maDinhMuc: tab.formData.maDinhMuc,
              tenDinhMuc: tab.formData.tenDinhMuc,
              tiLeThuHoi: tab.formData.tiLeThuHoi ? parseFloat(tab.formData.tiLeThuHoi) : undefined,
              sanPhamDauRa: tab.formData.sanPhamDauRa,
              thanhPhamTonKho: tab.formData.thanhPhamTonKho ? parseFloat(tab.formData.thanhPhamTonKho) : undefined,
              tongThanhPhamCanSxThem: tab.formData.tongThanhPhamCanSxThem ? parseFloat(tab.formData.tongThanhPhamCanSxThem) : undefined,
              tongNguyenLieuCanSanXuat: tab.formData.tongNguyenLieuCanSanXuat ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) : undefined,
              nguyenLieuTonKho: tab.formData.nguyenLieuTonKho ? parseFloat(tab.formData.nguyenLieuTonKho) : undefined,
              nguyenLieuCanNhapThem: tab.formData.nguyenLieuCanNhapThem ? parseFloat(tab.formData.nguyenLieuCanNhapThem) : undefined,
              productionProcessId: tab.selectedProcess?.id,
              maQuyTrinhSanXuat: tab.selectedProcess?.maQuyTrinhSanXuat,
              tenQuyTrinhSanXuat: tab.selectedProcess?.tenQuyTrinhSanXuat,
              flowchartData: tab.selectedProcess?.flowchart || undefined,
              thoiGianChoPhepToiDa: tab.formData.thoiGianChoPhepToiDa ? parseFloat(tab.formData.thoiGianChoPhepToiDa) : undefined,
              ngayBatDauSanXuat: tab.formData.ngayBatDauSanXuat || undefined,
              ngayHoanThanhThucTe: tab.formData.ngayHoanThanhThucTe ? parseFloat(tab.formData.ngayHoanThanhThucTe) : undefined,
              chiPhiSanXuatKeHoach: tab.formData.chiPhiSanXuatKeHoach ? parseFloat(tab.formData.chiPhiSanXuatKeHoach) : undefined,
              chiPhiSanXuatThucTe: tab.formData.chiPhiSanXuatThucTe ? parseFloat(tab.formData.chiPhiSanXuatThucTe) : undefined,
              chiPhiChungKeHoach: tab.formData.chiPhiChungKeHoach ? parseFloat(tab.formData.chiPhiChungKeHoach) : undefined,
              chiPhiChungThucTe: tab.formData.chiPhiChungThucTe ? parseFloat(tab.formData.chiPhiChungThucTe) : undefined,
              chiPhiXuatKhauKeHoach: tab.formData.chiPhiXuatKhauKeHoach ? parseFloat(tab.formData.chiPhiXuatKhauKeHoach) : undefined,
              chiPhiXuatKhauThucTe: tab.formData.chiPhiXuatKhauThucTe ? parseFloat(tab.formData.chiPhiXuatKhauThucTe) : undefined,
              giaHoaVon: tab.formData.giaHoaVon ? parseFloat(tab.formData.giaHoaVon) : undefined,
              loiNhuanCongThem: tab.formData.loiNhuanCongThem ? parseFloat(tab.formData.loiNhuanCongThem) : undefined,
              tiGiaUSD: tab.formData.tiGiaUSD ? parseNumberFromDots(tab.formData.tiGiaUSD) : undefined,
              ghiChu: tab.formData.ghiChu,
              byProducts,
              isAdditionalCost: true,
            };
          }),
        ],
        generalCosts: selectedGeneralCosts.map(cost => ({
          costId: cost.costId,
          maChiPhi: cost.costId,
          tenChiPhi: cost.tenChiPhi,
          donViTinh: cost.donViTinh,
          keHoach: cost.keHoach,
          thucTe: cost.thucTe,
        })),
        generalCostGroups: generalCostGroups.map(group => ({
          id: group.id,
          tenBangChiPhi: group.tenBangChiPhi,
          selectedCosts: group.selectedCosts,
          selectedProducts: group.selectedProducts,
        })),
        exportCosts: selectedExportCosts.map(cost => ({
          costId: cost.costId,
          maChiPhi: cost.costId,
          tenChiPhi: cost.tenChiPhi,
          donViTinh: cost.donViTinh,
          keHoach: cost.keHoach,
          thucTe: cost.thucTe,
        })),
      };

      // Debug log before saving
      console.log('💾 [Save OrderSummary] generalCostGroups being saved:', calculatorData.generalCostGroups);
      console.log('💾 [Save OrderSummary] products being saved:', calculatorData.products);
      // Debug các trường thực tế trong products
      calculatorData.products.forEach((p: any, i: number) => {
        console.log(`💾 [Save] Product ${i} thực tế fields:`, {
          tongKhoiLuongThanhPhamThucTe: p.tongKhoiLuongThanhPhamThucTe,
          thanhPhamTonKhoThucTe: p.thanhPhamTonKhoThucTe,
          tongThanhPhamCanSxThemThucTe: p.tongThanhPhamCanSxThemThucTe,
          tongNguyenLieuCanSanXuatThucTe: p.tongNguyenLieuCanSanXuatThucTe,
          loiNhuanCongThemThucTe: p.loiNhuanCongThemThucTe,
        });
      });

      // Save to database
      await quotationCalculatorService.upsertCalculator(calculatorData);

      console.log('Đã lưu toàn bộ dữ liệu báo giá đơn hàng vào database');
      alert('Lưu dữ liệu thành công!');
    } catch (error: any) {
      console.error('Error in handleSaveOrderSummaryData:', error);
      alert(error.response?.data?.message || 'Lỗi khi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTabsData([]);
    setActiveTab(0);
    setGeneralCostGroups([{
      id: `gcg-${Date.now()}`,
      tenBangChiPhi: 'Chi phí chung 1',
      selectedCosts: [],
      selectedProducts: [],
    }]);
    setSelectedExportCosts([]);
    setPhanTramThue('');
    setPhanTramQuy('');
  };

  const clearSavedData = async () => {
    if (!quotationRequest) return;

    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu đã lưu?')) {
      return;
    }

    try {
      await quotationCalculatorService.deleteCalculator(quotationRequest.id);

      // Reinitialize tabs
      await initializeTabs();

      alert('Đã xóa dữ liệu đã lưu và khởi tạo lại!');
    } catch (error: any) {
      console.error('Error clearing saved data:', error);
      alert(error.response?.data?.message || 'Lỗi khi xóa dữ liệu');
    }
  };

  // Handle create quotation
  const handleCreateQuotation = async () => {
    if (!quotationRequest) return;

    // Validate
    if (!quotationFormData.hieuLucBaoGia) {
      alert('Vui lòng nhập hiệu lực báo giá');
      return;
    }

    setLoading(true);

    try {
      // Get current user info from localStorage
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      console.log('🔍 User from localStorage:', user);

      // Get employee name from user object
      const tenNhanVien = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.name || user?.email || 'Unknown';

      const data = {
        hieuLucBaoGia: parseInt(quotationFormData.hieuLucBaoGia),
        tinhTrang: quotationFormData.tinhTrang,
        ghiChu: quotationFormData.ghiChu || undefined,
        employeeId: user?.id || undefined,
        tenNhanVien,
      };

      console.log('🔍 Data to send:', data);

      const response = await quotationCalculatorService.createQuotationFromCalculator(
        quotationRequest.id,
        data
      );

      console.log('🔍 Response from API:', response);

      alert('Tạo báo giá thành công!');
      setShowCreateQuotationModal(false);

      // Reset form
      setQuotationFormData({
        hieuLucBaoGia: '',
        tinhTrang: 'DANG_CHO_PHAN_HOI',
        ghiChu: '',
      });

      // Close main modal and refresh
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating quotation:', error);
      alert(error.response?.data?.message || 'Lỗi khi tạo báo giá');
    } finally {
      setLoading(false);
    }
  };

  // Add a new general cost group (bảng chi phí chung mới)
  const addGeneralCostGroup = () => {
    const newGroup: GeneralCostGroup = {
      id: `gcg-${Date.now()}`,
      tenBangChiPhi: `Chi phí chung ${generalCostGroups.length + 1}`,
      selectedCosts: [],
      selectedProducts: [],
    };
    setGeneralCostGroups([...generalCostGroups, newGroup]);
  };

  // Remove a general cost group
  const removeGeneralCostGroup = (groupId: string) => {
    if (generalCostGroups.length <= 1) {
      alert('Phải có ít nhất 1 bảng chi phí chung!');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa bảng chi phí chung này?')) {
      return;
    }
    setGeneralCostGroups(generalCostGroups.filter(g => g.id !== groupId));
  };

  // Update general cost group name
  const updateGeneralCostGroupName = (groupId: string, name: string) => {
    setGeneralCostGroups(generalCostGroups.map(g =>
      g.id === groupId ? { ...g, tenBangChiPhi: name } : g
    ));
  };

  // Add a general cost item to a specific group
  const addGeneralCost = (groupId: string) => {
    const newItem: SelectedCostItem = {
      id: `gc-${Date.now()}`,
      costId: '',
      tenChiPhi: '',
      donViTinh: '',
      keHoach: 0,
      thucTe: 0
    };
    setGeneralCostGroups(generalCostGroups.map(g =>
      g.id === groupId ? { ...g, selectedCosts: [...g.selectedCosts, newItem] } : g
    ));
  };

  // Add an export cost item
  const addExportCost = () => {
    const newItem: SelectedCostItem = {
      id: `ec-${Date.now()}`,
      costId: '',
      tenChiPhi: '',
      donViTinh: '',
      keHoach: 0,
      thucTe: 0,
      keHoachUSD: 0,
      thucTeUSD: 0,
      tiGiaKeHoach: 0,
      tiGiaThucTe: 0
    };
    setSelectedExportCosts([...selectedExportCosts, newItem]);
  };

  // Remove a general cost item from a specific group
  const removeGeneralCost = (groupId: string, itemId: string) => {
    setGeneralCostGroups(generalCostGroups.map(g =>
      g.id === groupId ? { ...g, selectedCosts: g.selectedCosts.filter(item => item.id !== itemId) } : g
    ));
  };

  // Remove an export cost item
  const removeExportCost = (id: string) => {
    setSelectedExportCosts(selectedExportCosts.filter(item => item.id !== id));
  };

  // Update general cost selection in a specific group
  const updateGeneralCostSelection = (groupId: string, itemId: string, costId: string) => {
    // Nếu chọn "ALL", thêm tất cả chi phí chung
    if (costId === 'ALL') {
      setGeneralCostGroups(generalCostGroups.map(g => {
        if (g.id !== groupId) return g;

        // Xóa dòng hiện tại
        const filteredCosts = g.selectedCosts.filter(item => item.id !== itemId);

        // Thêm tất cả chi phí chung chưa được chọn
        const newCosts = availableGeneralCosts.map(cost => ({
          id: `${Date.now()}-${cost.id}`,
          costId: cost.id,
          tenChiPhi: cost.tenChiPhi,
          donViTinh: cost.donViTinh || '',
          keHoach: 0,
          thucTe: 0,
        }));

        return { ...g, selectedCosts: [...filteredCosts, ...newCosts] };
      }));
      return;
    }

    const selectedCost = availableGeneralCosts.find(c => c.id === costId);
    setGeneralCostGroups(generalCostGroups.map(g =>
      g.id === groupId
        ? {
            ...g,
            selectedCosts: g.selectedCosts.map(item =>
              item.id === itemId
                ? { ...item, costId, tenChiPhi: selectedCost?.tenChiPhi || '', donViTinh: selectedCost?.donViTinh || '' }
                : item
            )
          }
        : g
    ));
  };

  // Update export cost selection
  const updateExportCostSelection = (itemId: string, costId: string) => {
    // Nếu chọn "ALL", thêm tất cả chi phí xuất khẩu
    if (costId === 'ALL') {
      // Xóa dòng hiện tại
      const filteredCosts = selectedExportCosts.filter(item => item.id !== itemId);

      // Thêm tất cả chi phí xuất khẩu chưa được chọn
      const newCosts = availableExportCosts.map(cost => ({
        id: `${Date.now()}-${cost.id}`,
        costId: cost.id,
        tenChiPhi: cost.tenChiPhi,
        donViTinh: cost.donViTinh || '',
        keHoach: 0,
        thucTe: 0,
      }));

      setSelectedExportCosts([...filteredCosts, ...newCosts]);
      return;
    }

    const selectedCost = availableExportCosts.find(c => c.id === costId);
    setSelectedExportCosts(selectedExportCosts.map(item =>
      item.id === itemId
        ? { ...item, costId, tenChiPhi: selectedCost?.tenChiPhi || '', donViTinh: selectedCost?.donViTinh || '' }
        : item
    ));
  };

  // Update general cost value in a specific group
  const updateGeneralCostValue = (groupId: string, itemId: string, field: 'keHoach' | 'thucTe', value: number) => {
    setGeneralCostGroups(generalCostGroups.map(g =>
      g.id === groupId
        ? {
            ...g,
            selectedCosts: g.selectedCosts.map(item =>
              item.id === itemId ? { ...item, [field]: value } : item
            )
          }
        : g
    ));
  };

  // Update selected products for a specific general cost group
  const updateGeneralCostGroupProducts = (groupId: string, productIds: string[]) => {
    console.log('🔄 [Update] selectedProducts for group', groupId, ':', productIds);
    setGeneralCostGroups(generalCostGroups.map(g =>
      g.id === groupId ? { ...g, selectedProducts: productIds } : g
    ));
  };

  // Update export cost value
  const updateExportCostValue = (itemId: string, field: 'keHoach' | 'thucTe', value: number) => {
    setSelectedExportCosts(selectedExportCosts.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  // Update export cost USD value
  const updateExportCostUSDValue = (itemId: string, field: 'keHoachUSD' | 'thucTeUSD', value: number) => {
    setSelectedExportCosts(selectedExportCosts.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        // Tự động tính VND khi thay đổi USD
        if (field === 'keHoachUSD') {
          updatedItem.keHoach = value * (item.tiGiaKeHoach || 0);
        } else if (field === 'thucTeUSD') {
          updatedItem.thucTe = value * (item.tiGiaThucTe || 0);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // Update export cost exchange rate
  const updateExportCostExchangeRate = (itemId: string, field: 'tiGiaKeHoach' | 'tiGiaThucTe', value: number) => {
    setSelectedExportCosts(selectedExportCosts.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        // Tự động tính VND khi thay đổi tỉ giá
        if (field === 'tiGiaKeHoach') {
          updatedItem.keHoach = (item.keHoachUSD || 0) * value;
        } else if (field === 'tiGiaThucTe') {
          updatedItem.thucTe = (item.thucTeUSD || 0) * value;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // Calculate total general costs
  const getTotalGeneralCosts = () => {
    return selectedGeneralCosts.reduce((acc, item) => ({
      keHoach: acc.keHoach + item.keHoach,
      thucTe: acc.thucTe + item.thucTe
    }), { keHoach: 0, thucTe: 0 });
  };

  // Calculate total export costs
  const getTotalExportCosts = () => {
    return selectedExportCosts.reduce((acc, item) => ({
      keHoach: acc.keHoach + item.keHoach,
      thucTe: acc.thucTe + item.thucTe
    }), { keHoach: 0, thucTe: 0 });
  };

  if (!isOpen || !quotationRequest || tabsData.length === 0) return null;

  // Helper function: Tính giá hòa vốn cho sản phẩm đầu ra chính
  const calculateGiaHoaVonChinhPham = (tabIndex: number) => {
    const tab = tabsData[tabIndex];
    if (!tab || !tab.selectedStandard || !tab.formData.sanPhamDauRa) return 0;

    const items = getItems();
    const currentItem = items[tabIndex];

    // 1. Tính tổng chi phí sản xuất (kế hoạch) - per-day from flowchart
    let chiPhiSanXuatPerDay = 0;
    if (tab.selectedProcess?.flowchart?.sections) {
      chiPhiSanXuatPerDay = tab.selectedProcess.flowchart.sections.reduce((sum, section) => {
        return sum + section.costs.reduce((costSum, cost) => {
          const gia = cost.giaKeHoach || 0;
          const soLuong = cost.soLuongKeHoach || 0;
          return costSum + (gia * soLuong);
        }, 0);
      }, 0);
    }

    // Multiply per-day cost by allowed max days (thoiGianChoPhepToiDa)
    const maxDays = parseFloat(tab.formData.thoiGianChoPhepToiDa) || 1;
    const chiPhiSanXuat = chiPhiSanXuatPerDay * maxDays;

    // 2. Tính chi phí chung từ tất cả các bảng chi phí chung (generalCostGroups)
    const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
    const currentProductId = `tab-${tabIndex}`;

    let chiPhiChung = 0;
    // Duyệt qua từng bảng chi phí chung và tính tổng chi phí được phân bổ cho sản phẩm này
    generalCostGroups.forEach(group => {
      const groupTotalKeHoach = group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);

      // Kiểm tra xem sản phẩm hiện tại có được chọn cho bảng chi phí chung này không
      // CHỈ khi selectedProducts có phần tử mới kiểm tra
      const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId);
      if (!isProductSelected) return;

      // Lọc các sản phẩm chính được chọn cho bảng này
      const selectedMainItems = items.filter((_: any, index: number) => {
        const pid = `tab-${index}`;
        return group.selectedProducts.includes(pid);
      });

      // Lọc các chi phí bổ sung được chọn cho bảng này
      const selectedAdditionalItems = additionalCostTabs.filter(tab => {
        const pid = `additional-${tab.id}`;
        return group.selectedProducts.includes(pid);
      });

      // Tính tổng khối lượng của các sản phẩm được chọn
      const totalKhoiLuong = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
        selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData.soLuong || '0'), 0);

      if (totalKhoiLuong === 0) return;

      // Tổng số sản phẩm được chọn
      const totalSelectedProducts = selectedMainItems.length + selectedAdditionalItems.length;

      // Nếu chỉ có 1 sản phẩm được chọn → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo khối lượng
      if (totalSelectedProducts === 1) {
        chiPhiChung += groupTotalKeHoach;
      } else {
        chiPhiChung += (groupTotalKeHoach * currentKhoiLuong) / totalKhoiLuong;
      }
    });

    // 3. Tính chi phí xuất khẩu (bao gồm cả sản phẩm chính và chi phí bổ sung)
    const totalExportCostKeHoach = selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
    // Tính tổng "Tổng Thành phẩm cần sx thêm" từ cả tabsData và additionalCostTabs
    const currentTongThanhPham = parseFloat(tab.formData.tongThanhPhamCanSxThem || '0');
    const totalTongThanhPhamMain = tabsData.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0);
    const totalTongThanhPhamAdditional = additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0);
    const totalTongThanhPhamAll = totalTongThanhPhamMain + totalTongThanhPhamAdditional;
    const totalProductCount = items.length + additionalCostTabs.length;
    // Nếu chỉ có 1 sản phẩm → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo "Tổng Thành phẩm cần sx thêm", fallback theo khối lượng
    const chiPhiXuatKhau = totalProductCount === 1
      ? totalExportCostKeHoach
      : totalTongThanhPhamAll > 0
        ? (totalExportCostKeHoach * currentTongThanhPham) / totalTongThanhPhamAll
        : (() => {
            const totalKhoiLuongAll = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
              additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0);
            return totalKhoiLuongAll > 0 ? (totalExportCostKeHoach * currentKhoiLuong) / totalKhoiLuongAll : 0;
          })();

    // Tổng chi phí
    const tongChiPhi = chiPhiSanXuat + chiPhiChung + chiPhiXuatKhau;

    // 4. Tính tổng giá trị sản phẩm phụ
    let tongGiaTriSanPhamPhu = 0;
    if (tab.selectedStandard.items) {
      tab.selectedStandard.items.forEach(sp => {
        if (sp.tenThanhPham !== tab.formData.sanPhamDauRa) {
          const giaHoaVonPhu = parseFloat(tab.formData.giaHoaVonSanPhamPhu[sp.tenThanhPham] || '0');
          const soKgPhu = tab.formData.tongNguyenLieuCanSanXuat && tab.formData.tiLeThuHoi
            ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * parseFloat(tab.formData.tiLeThuHoi) / 100 * sp.tiLe / 100
            : 0;
          tongGiaTriSanPhamPhu += giaHoaVonPhu * soKgPhu;
        }
      });
    }

    // 5. Tính số kg sản phẩm chính
    const sanPhamChinhItem = tab.selectedStandard.items?.find(sp => sp.tenThanhPham === tab.formData.sanPhamDauRa);
    const soKgChinhPham = tab.formData.tongNguyenLieuCanSanXuat && tab.formData.tiLeThuHoi && sanPhamChinhItem
      ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * parseFloat(tab.formData.tiLeThuHoi) / 100 * sanPhamChinhItem.tiLe / 100
      : 0;

    if (soKgChinhPham === 0) return 0;

    // 6. Giá hòa vốn sản phẩm chính = (Tổng chi phí - Tổng giá trị sản phẩm phụ) / Số kg sản phẩm chính
    const giaHoaVonChinhPham = (tongChiPhi - tongGiaTriSanPhamPhu) / soKgChinhPham;
    return giaHoaVonChinhPham;
  };

  // Helper function: Tính giá hòa vốn THỰC TẾ cho sản phẩm đầu ra chính
  const calculateGiaHoaVonChinhPhamThucTe = (tabIndex: number) => {
    const tab = tabsData[tabIndex];
    if (!tab || !tab.selectedStandard || !tab.formData.sanPhamDauRa) return 0;

    const items = getItems();
    const currentItem = items[tabIndex];

    // 1. Tính tổng chi phí sản xuất (thực tế) - per-day from flowchart
    let chiPhiSanXuatPerDay = 0;
    if (tab.selectedProcess?.flowchart?.sections) {
      chiPhiSanXuatPerDay = tab.selectedProcess.flowchart.sections.reduce((sum, section) => {
        return sum + section.costs.reduce((costSum, cost) => {
          const gia = cost.giaThucTe || 0;
          const soLuong = cost.soLuongThucTe || 0;
          return costSum + (gia * soLuong);
        }, 0);
      }, 0);
    }

    // Multiply per-day cost by allowed max days (thoiGianChoPhepToiDa)
    const maxDays = parseFloat(tab.formData.thoiGianChoPhepToiDa) || 1;
    const chiPhiSanXuat = chiPhiSanXuatPerDay * maxDays;

    // 2. Tính chi phí chung THỰC TẾ từ tất cả các bảng chi phí chung (generalCostGroups)
    const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
    const currentProductId = `tab-${tabIndex}`;

    let chiPhiChung = 0;
    generalCostGroups.forEach(group => {
      const groupTotalThucTe = group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);

      const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId);
      if (!isProductSelected) return;

      const selectedMainItems = items.filter((_: any, index: number) => {
        const pid = `tab-${index}`;
        return group.selectedProducts.includes(pid);
      });

      const selectedAdditionalItems = additionalCostTabs.filter(tab => {
        const pid = `additional-${tab.id}`;
        return group.selectedProducts.includes(pid);
      });

      const totalKhoiLuong = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
        selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData.soLuong || '0'), 0);

      if (totalKhoiLuong === 0) return;

      const totalSelectedProducts = selectedMainItems.length + selectedAdditionalItems.length;

      if (totalSelectedProducts === 1) {
        chiPhiChung += groupTotalThucTe;
      } else {
        chiPhiChung += (groupTotalThucTe * currentKhoiLuong) / totalKhoiLuong;
      }
    });

    // 3. Tính chi phí xuất khẩu THỰC TẾ
    const totalExportCostThucTe = selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);
    const currentTongThanhPham = parseFloat(tab.formData.tongThanhPhamCanSxThem || '0');
    const totalTongThanhPhamMain = tabsData.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0);
    const totalTongThanhPhamAdditional = additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0);
    const totalTongThanhPhamAll = totalTongThanhPhamMain + totalTongThanhPhamAdditional;
    const totalProductCount = items.length + additionalCostTabs.length;
    const chiPhiXuatKhau = totalProductCount === 1
      ? totalExportCostThucTe
      : totalTongThanhPhamAll > 0
        ? (totalExportCostThucTe * currentTongThanhPham) / totalTongThanhPhamAll
        : (() => {
            const totalKhoiLuongAll = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
              additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0);
            return totalKhoiLuongAll > 0 ? (totalExportCostThucTe * currentKhoiLuong) / totalKhoiLuongAll : 0;
          })();

    // Tổng chi phí thực tế
    const tongChiPhi = chiPhiSanXuat + chiPhiChung + chiPhiXuatKhau;

    // 4. Tính tổng giá trị sản phẩm phụ THỰC TẾ
    let tongGiaTriSanPhamPhu = 0;
    // Kiểm tra an toàn tiLeThuHoiThucTe là object
    const tiLeThuHoiThucTeObj = typeof tab.formData.tiLeThuHoiThucTe === 'object' && tab.formData.tiLeThuHoiThucTe !== null
      ? tab.formData.tiLeThuHoiThucTe
      : {};
    // Lấy tỉ lệ thu hồi thành phẩm K3 (dùng giá trị kế hoạch vì tongNguyenLieuCanSanXuat được tính từ kế hoạch)
    const tiLeThuHoiK3 = parseFloat(tab.formData.tiLeThuHoi) || 0;
    if (tab.selectedStandard.items) {
      tab.selectedStandard.items.forEach(sp => {
        if (sp.tenThanhPham !== tab.formData.sanPhamDauRa) {
          const giaHoaVonPhuThucTe = parseFloat(tab.formData.giaHoaVonSanPhamPhuThucTe?.[sp.tenThanhPham] || '0');
          // Dùng tiLeThuHoiThucTe của từng sản phẩm nếu có, nếu không dùng tiLe kế hoạch
          const tiLeThuHoiSanPham = parseFloat(tiLeThuHoiThucTeObj[sp.tenThanhPham] || sp.tiLe.toString());
          // Công thức đúng: tongNguyenLieuCanSanXuat × tiLeThuHoiK3 / 100 × tiLeSanPham / 100
          const soKgPhu = tab.formData.tongNguyenLieuCanSanXuat && tiLeThuHoiK3
            ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * tiLeThuHoiK3 / 100 * tiLeThuHoiSanPham / 100
            : 0;
          tongGiaTriSanPhamPhu += giaHoaVonPhuThucTe * soKgPhu;
        }
      });
    }

    // 5. Tính số kg sản phẩm chính THỰC TẾ (dùng tiLeThuHoiThucTe của sản phẩm chính)
    const sanPhamChinhItem = tab.selectedStandard.items?.find(sp => sp.tenThanhPham === tab.formData.sanPhamDauRa);
    const tiLeThuHoiChinhThucTe = sanPhamChinhItem
      ? parseFloat(tiLeThuHoiThucTeObj[sanPhamChinhItem.tenThanhPham] || sanPhamChinhItem.tiLe.toString())
      : 0;
    // Công thức đúng: tongNguyenLieuCanSanXuat × tiLeThuHoiK3 / 100 × tiLeSanPhamChinh / 100
    const soKgChinhPham = tab.formData.tongNguyenLieuCanSanXuat && tiLeThuHoiK3 && sanPhamChinhItem
      ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * tiLeThuHoiK3 / 100 * tiLeThuHoiChinhThucTe / 100
      : 0;

    if (soKgChinhPham === 0) return 0;

    // 6. Giá hòa vốn thực tế sản phẩm chính = (Tổng chi phí thực tế - Tổng giá trị sản phẩm phụ thực tế) / Số kg sản phẩm chính thực tế
    const giaHoaVonChinhPham = (tongChiPhi - tongGiaTriSanPhamPhu) / soKgChinhPham;
    return giaHoaVonChinhPham;
  };

  // Helper: Tính số KG sản phẩm chính từ định mức
  const calculateSoKgChinhPham = (tabIndex: number) => {
    const tab = tabsData[tabIndex];
    if (!tab || !tab.selectedStandard || !tab.formData.sanPhamDauRa) return 0;

    const sanPhamChinhItem = tab.selectedStandard.items?.find(sp => sp.tenThanhPham === tab.formData.sanPhamDauRa);
    const soKgChinhPham = tab.formData.tongNguyenLieuCanSanXuat && tab.formData.tiLeThuHoi && sanPhamChinhItem
      ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * parseFloat(tab.formData.tiLeThuHoi) / 100 * sanPhamChinhItem.tiLe / 100
      : 0;
    return soKgChinhPham;
  };

  // Helper: Tính số KG sản phẩm chính THỰC TẾ từ định mức
  const calculateSoKgChinhPhamThucTe = (tabIndex: number) => {
    const tab = tabsData[tabIndex];
    if (!tab || !tab.selectedStandard || !tab.formData.sanPhamDauRa) return 0;

    const sanPhamChinhItem = tab.selectedStandard.items?.find(sp => sp.tenThanhPham === tab.formData.sanPhamDauRa);
    // Kiểm tra an toàn tiLeThuHoiThucTe là object
    const tiLeThuHoiThucTeObj = typeof tab.formData.tiLeThuHoiThucTe === 'object' && tab.formData.tiLeThuHoiThucTe !== null
      ? tab.formData.tiLeThuHoiThucTe
      : {};
    // Lấy tỉ lệ thu hồi thành phẩm K3 (dùng giá trị kế hoạch)
    const tiLeThuHoiK3 = parseFloat(tab.formData.tiLeThuHoi) || 0;
    // Lấy tỉ lệ thu hồi thực tế của sản phẩm chính
    const tiLeThuHoiChinhThucTe = sanPhamChinhItem
      ? parseFloat(tiLeThuHoiThucTeObj[sanPhamChinhItem.tenThanhPham] || sanPhamChinhItem.tiLe.toString())
      : 0;
    // Công thức: tongNguyenLieuCanSanXuat × tiLeThuHoiK3 / 100 × tiLeSanPhamChinh / 100
    const soKgChinhPham = tab.formData.tongNguyenLieuCanSanXuat && tiLeThuHoiK3 && sanPhamChinhItem
      ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * tiLeThuHoiK3 / 100 * tiLeThuHoiChinhThucTe / 100
      : 0;
    return soKgChinhPham;
  };

  // Helper: compute planned production cost (keHoach) = maxDays * per-day flowchart cost
  const calculateChiPhiSanXuatKeHoach = (tabIndex: number) => {
    const tab = tabsData[tabIndex];
    if (!tab) return 0;
    let chiPhiSanXuatPerDay = 0;
    if (tab.selectedProcess?.flowchart?.sections) {
      chiPhiSanXuatPerDay = tab.selectedProcess.flowchart.sections.reduce((sum, section) => {
        return sum + section.costs.reduce((costSum, cost) => {
          const gia = cost.giaKeHoach || 0;
          const soLuong = cost.soLuongKeHoach || 0;
          return costSum + (gia * soLuong);
        }, 0);
      }, 0);
    }
    const maxDays = parseFloat(tab.formData.thoiGianChoPhepToiDa) || 1;
    return chiPhiSanXuatPerDay * maxDays;
  };

  const items = getItems();
  const isOrderSummaryTab = activeTab === items.length + additionalCostTabs.length;
  const isAdditionalCostTab = activeTab >= items.length && activeTab < items.length + additionalCostTabs.length;
  const currentAdditionalTabIndex = isAdditionalCostTab ? activeTab - items.length : -1;
  const currentAdditionalTab = isAdditionalCostTab ? additionalCostTabs[currentAdditionalTabIndex] : null;
  const currentTab = isOrderSummaryTab || isAdditionalCostTab ? null : (tabsData[activeTab] || null);
  const currentItem = isOrderSummaryTab || isAdditionalCostTab ? null : items[activeTab];

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-blue-600">
          <h3 className="text-base font-bold text-white">BẢNG TÍNH CHI PHÍ</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSavedData}
              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
              title="Xóa dữ liệu đã lưu và khởi tạo lại"
            >
              Xóa dữ liệu đã lưu
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
          {items.map((item: any, index: number) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveTab(index)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === index
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Sản phẩm {index + 1}: {item.tenSanPham}
            </button>
          ))}
          {/* Tabs Chi phí bổ sung */}
          {additionalCostTabs.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(items.length + index)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === items.length + index
                  ? 'bg-white text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <span>CP bổ sung {index + 1}: {tab.tenChiPhiBoSung}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveAdditionalCost(tab.id);
                }}
                className="text-red-500 hover:text-red-700 ml-1"
                title="Xóa chi phí bổ sung"
              >
                ×
              </span>
            </button>
          ))}
          {/* Icon thêm chi phí bổ sung */}
          <button
            type="button"
            onClick={() => setShowAddCostModal(true)}
            className="px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap text-green-600 hover:text-green-800 hover:bg-green-50 flex items-center gap-1"
            title="Thêm chi phí bổ sung"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Chi phí bổ sung</span>
          </button>
          {/* Tab Báo giá đơn hàng */}
          <button
            type="button"
            onClick={() => setActiveTab(items.length + additionalCostTabs.length)}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === items.length + additionalCostTabs.length
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Báo giá đơn hàng
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Hiển thị tab Báo giá đơn hàng */}
          {isOrderSummaryTab ? (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-xl font-semibold text-gray-900">Chi phí đơn hàng</h4>
              </div>

              {/* Bảng tổng hợp tất cả chi phí */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Chi phí
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-48">
                          Kế hoạch (VNĐ)
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-48">
                          Thực tế (VNĐ)
                        </th>
                        <th className="px-6 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {/* Chi phí từng sản phẩm */}
                      {quotationRequest.items?.map((item, index) => {
                        const tab = tabsData[index];
                        let totalKeHoach = 0;
                        let totalThucTe = 0;

                        if (tab?.selectedProcess?.flowchart?.sections) {
                          tab.selectedProcess.flowchart.sections.forEach(section => {
                            section.costs?.forEach(cost => {
                              const keHoach = (cost.soLuongKeHoach || 0) * (cost.giaKeHoach || 0);
                              const thucTe = (cost.soLuongThucTe || 0) * (cost.giaThucTe || 0);
                              totalKeHoach += keHoach;
                              totalThucTe += thucTe;
                            });
                          });
                        }

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm text-gray-900">
                              <div className="flex items-center gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center">
                                  {index + 1}
                                </span>
                                <span>{item.tenSanPham}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">
                              {(totalKeHoach * (parseFloat(tab?.formData?.thoiGianChoPhepToiDa || '1') || 1)).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">
                              {totalThucTe.toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-3"></td>
                          </tr>
                        );
                      })}

                      {/* Chi phí bổ sung */}
                      {additionalCostTabs.map((tab, index) => {
                        let totalKeHoach = 0;
                        let totalThucTe = 0;

                        if (tab?.selectedProcess?.flowchart?.sections) {
                          tab.selectedProcess.flowchart.sections.forEach(section => {
                            section.costs?.forEach(cost => {
                              const keHoach = (cost.soLuongKeHoach || 0) * (cost.giaKeHoach || 0);
                              const thucTe = (cost.soLuongThucTe || 0) * (cost.giaThucTe || 0);
                              totalKeHoach += keHoach;
                              totalThucTe += thucTe;
                            });
                          });
                        }

                        return (
                          <tr key={`additional-${tab.id}`} className="hover:bg-green-50 bg-green-50/30">
                            <td className="px-6 py-3 text-sm text-gray-900">
                              <div className="flex items-center gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded bg-green-100 text-green-600 text-xs font-medium flex items-center justify-center">
                                  BS{index + 1}
                                </span>
                                <span className="text-green-700">{tab.tenChiPhiBoSung}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-right font-medium text-green-700">
                              {(totalKeHoach * (parseFloat(tab?.formData?.thoiGianChoPhepToiDa || '1') || 1)).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-3 text-sm text-right font-medium text-green-700">
                              {totalThucTe.toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-3"></td>
                          </tr>
                        );
                      })}

                      {/* Divider - Chi phí chung với nút thêm bảng mới */}
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="px-6 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 uppercase">Chi phí chung ({generalCostGroups.length} bảng)</span>
                            <button
                              type="button"
                              onClick={addGeneralCostGroup}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors border border-purple-300"
                            >
                              <PlusCircle className="w-3 h-3" />
                              Thêm bảng chi phí chung
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Render each general cost group */}
                      {generalCostGroups.map((group, groupIndex) => (
                        <React.Fragment key={group.id}>
                          {/* Group header */}
                          <tr className="bg-purple-50">
                            <td colSpan={4} className="px-6 py-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="text"
                                    value={group.tenBangChiPhi}
                                    onChange={(e) => updateGeneralCostGroupName(group.id, e.target.value)}
                                    className="px-2 py-1 text-sm font-medium text-purple-800 bg-transparent border-b border-purple-300 focus:border-purple-500 focus:outline-none"
                                    placeholder="Tên bảng chi phí"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingGeneralCostGroupId(group.id);
                                      setShowProductSelectionModal(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors border border-green-300"
                                    title="Chọn sản phẩm cho bảng chi phí này"
                                  >
                                    <Users className="w-3 h-3" />
                                    Chọn SP ({group.selectedProducts.length > 0 ? group.selectedProducts.length : 'Tất cả'})
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => addGeneralCost(group.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Thêm chi phí
                                  </button>
                                  {generalCostGroups.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeGeneralCostGroup(group.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                      title="Xóa bảng chi phí này"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Group costs */}
                          {group.selectedCosts.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3">
                                <select
                                  value={item.costId}
                                  onChange={(e) => updateGeneralCostSelection(group.id, item.id, e.target.value)}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">-- Chọn chi phí --</option>
                                  <option value="ALL" className="font-semibold">-- Tất cả --</option>
                                  {availableGeneralCosts.map((cost) => (
                                    <option key={cost.id} value={cost.id}>
                                      {cost.tenChiPhi}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-6 py-3">
                                <input
                                  type="text"
                                  value={formatNumberWithDots(item.keHoach)}
                                  onChange={(e) => updateGeneralCostValue(group.id, item.id, 'keHoach', parseNumberFromDots(e.target.value))}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-6 py-3">
                                <input
                                  type="text"
                                  value={formatNumberWithDots(item.thucTe)}
                                  onChange={(e) => updateGeneralCostValue(group.id, item.id, 'thucTe', parseNumberFromDots(e.target.value))}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-6 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeGeneralCost(group.id, item.id)}
                                  className="text-gray-400 hover:text-red-600 p-1"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}

                          {/* Group subtotal */}
                          {group.selectedCosts.length > 0 && (
                            <tr className="bg-purple-50/50">
                              <td className="px-6 py-2 text-sm font-medium text-purple-800 text-right">
                                Tổng {group.tenBangChiPhi}
                              </td>
                              <td className="px-6 py-2 text-sm font-bold text-purple-800 text-right">
                                {group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0).toLocaleString('vi-VN')}
                              </td>
                              <td className="px-6 py-2 text-sm font-bold text-purple-800 text-right">
                                {group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0).toLocaleString('vi-VN')}
                              </td>
                              <td className="px-6 py-2"></td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}

                      {/* Tổng tất cả chi phí chung */}
                      {selectedGeneralCosts.length > 0 && (
                        <tr className="bg-blue-50">
                          <td className="px-6 py-2.5 text-sm font-semibold text-gray-900 text-right">
                            Tổng tất cả chi phí chung
                          </td>
                          <td className="px-6 py-2.5 text-sm font-bold text-gray-900 text-right">
                            {selectedGeneralCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-6 py-2.5 text-sm font-bold text-gray-900 text-right">
                            {selectedGeneralCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-6 py-2.5"></td>
                        </tr>
                      )}

                      {/* Divider - Chi phí xuất khẩu */}
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="px-6 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 uppercase">Chi phí xuất khẩu</span>
                            <button
                              type="button"
                              onClick={addExportCost}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Thêm
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Chi phí xuất khẩu */}
                      {selectedExportCosts.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <select
                              value={item.costId}
                              onChange={(e) => updateExportCostSelection(item.id, e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">-- Chọn chi phí --</option>
                              <option value="ALL" className="font-semibold">-- Tất cả --</option>
                              {availableExportCosts.map((cost) => (
                                <option key={cost.id} value={cost.id}>
                                  {cost.tenChiPhi}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={formatNumberWithDots(item.keHoachUSD)}
                                  onChange={(e) => updateExportCostUSDValue(item.id, 'keHoachUSD', parseNumberFromDots(e.target.value))}
                                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="USD"
                                />
                                <span className="text-xs text-gray-500">×</span>
                                <input
                                  type="text"
                                  value={formatNumberWithDots(item.tiGiaKeHoach)}
                                  onChange={(e) => updateExportCostExchangeRate(item.id, 'tiGiaKeHoach', parseNumberFromDots(e.target.value))}
                                  className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Tỉ giá"
                                />
                              </div>
                              <input
                                type="text"
                                value={formatNumberWithDots(item.keHoach)}
                                onChange={(e) => updateExportCostValue(item.id, 'keHoach', parseNumberFromDots(e.target.value))}
                                className="w-full px-3 py-1.5 text-sm border border-blue-300 rounded-md text-right font-medium text-blue-700 bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="VNĐ"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={formatNumberWithDots(item.thucTeUSD)}
                                  onChange={(e) => updateExportCostUSDValue(item.id, 'thucTeUSD', parseNumberFromDots(e.target.value))}
                                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="USD"
                                />
                                <span className="text-xs text-gray-500">×</span>
                                <input
                                  type="text"
                                  value={formatNumberWithDots(item.tiGiaThucTe)}
                                  onChange={(e) => updateExportCostExchangeRate(item.id, 'tiGiaThucTe', parseNumberFromDots(e.target.value))}
                                  className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Tỉ giá"
                                />
                              </div>
                              <input
                                type="text"
                                value={formatNumberWithDots(item.thucTe)}
                                onChange={(e) => updateExportCostValue(item.id, 'thucTe', parseNumberFromDots(e.target.value))}
                                className="w-full px-3 py-1.5 text-sm border border-green-300 rounded-md text-right font-medium text-green-700 bg-green-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="VNĐ"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeExportCost(item.id)}
                              className="text-gray-400 hover:text-red-600 p-1"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Tổng chi phí xuất khẩu */}
                      {selectedExportCosts.length > 0 && (
                        <tr className="bg-blue-50">
                          <td className="px-6 py-2.5 text-sm font-semibold text-gray-900 text-right">
                            Tổng chi phí xuất khẩu
                          </td>
                          <td className="px-6 py-2.5 text-sm font-bold text-gray-900 text-right">
                            {selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-6 py-2.5 text-sm font-bold text-gray-900 text-right">
                            {selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-6 py-2.5"></td>
                        </tr>
                      )}

                      {/* TỔNG CHI PHÍ ĐƠN HÀNG */}
                      <tr className="bg-gray-700">
                        <td className="px-6 py-3 text-sm font-bold text-white uppercase">
                          Tổng chi phí đơn hàng
                        </td>
                        <td className="px-6 py-3 text-base font-bold text-white text-right">
                          {(() => {
                            let total = 0;
                            // Chi phí sản phẩm (giống cách tính ở bảng chi phí sản phẩm)
                            tabsData.forEach(tab => {
                              if (tab?.selectedProcess?.flowchart?.sections) {
                                let productTotal = 0;
                                tab.selectedProcess.flowchart.sections.forEach(section => {
                                  section.costs?.forEach(cost => {
                                    productTotal += (cost.soLuongKeHoach || 0) * (cost.giaKeHoach || 0);
                                  });
                                });
                                // Nhân với thời gian cho phép tối đa (giống như hiển thị ở bảng chi phí sản phẩm)
                                const multiplier = parseFloat(tab?.formData?.thoiGianChoPhepToiDa || '1') || 1;
                                total += productTotal * multiplier;
                              }
                            });
                            // Chi phí bổ sung
                            additionalCostTabs.forEach(tab => {
                              if (tab?.selectedProcess?.flowchart?.sections) {
                                let productTotal = 0;
                                tab.selectedProcess.flowchart.sections.forEach(section => {
                                  section.costs?.forEach(cost => {
                                    productTotal += (cost.soLuongKeHoach || 0) * (cost.giaKeHoach || 0);
                                  });
                                });
                                const multiplier = parseFloat(tab?.formData?.thoiGianChoPhepToiDa || '1') || 1;
                                total += productTotal * multiplier;
                              }
                            });
                            // Chi phí chung
                            total += getTotalGeneralCosts().keHoach;
                            // Chi phí xuất khẩu
                            total += getTotalExportCosts().keHoach;
                            return total.toLocaleString('vi-VN');
                          })()} VNĐ
                        </td>
                        <td className="px-6 py-3 text-base font-bold text-white text-right">
                          {(() => {
                            let total = 0;
                            // Chi phí sản phẩm thực tế
                            tabsData.forEach(tab => {
                              if (tab?.selectedProcess?.flowchart?.sections) {
                                tab.selectedProcess.flowchart.sections.forEach(section => {
                                  section.costs?.forEach(cost => {
                                    total += (cost.soLuongThucTe || 0) * (cost.giaThucTe || 0);
                                  });
                                });
                              }
                            });
                            // Chi phí bổ sung thực tế
                            additionalCostTabs.forEach(tab => {
                              if (tab?.selectedProcess?.flowchart?.sections) {
                                tab.selectedProcess.flowchart.sections.forEach(section => {
                                  section.costs?.forEach(cost => {
                                    total += (cost.soLuongThucTe || 0) * (cost.giaThucTe || 0);
                                  });
                                });
                              }
                            });
                            // Chi phí chung
                            total += getTotalGeneralCosts().thucTe;
                            // Chi phí xuất khẩu
                            total += getTotalExportCosts().thucTe;
                            return total.toLocaleString('vi-VN');
                          })()} VNĐ
                        </td>
                        <td className="px-6 py-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Phần tính lợi nhuận */}
              <div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-3">
                  <h4 className="text-base font-semibold text-white uppercase tracking-wide">Tính toán doanh thu & lợi nhuận</h4>
                </div>

                <div className="p-6 space-y-3">
                  {/* Doanh thu dự kiến */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Doanh thu dự kiến</span>
                    </div>
                    {/* Kế hoạch */}
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-blue-400">
                      <span className="text-xs text-gray-600">Kế hoạch</span>
                      <span className="text-lg font-bold text-gray-900">
                        {(() => {
                          let doanhThuDuKien = 0;
                          tabsData.forEach((tab, index) => {
                            const soKgChinhPham = calculateSoKgChinhPham(index);
                            const giaHoaVon = calculateGiaHoaVonChinhPham(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThem || '0');
                            const giaBaoKhach = giaHoaVon + loiNhuan;
                            doanhThuDuKien += giaBaoKhach * soKgChinhPham;
                          });
                          return doanhThuDuKien.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    {/* Thực tế */}
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-green-400 mt-1">
                      <span className="text-xs text-gray-600">Thực tế</span>
                      <span className="text-lg font-bold text-green-700">
                        {(() => {
                          let doanhThuThucTe = 0;
                          tabsData.forEach((tab, index) => {
                            const soKgChinhPhamThucTe = calculateSoKgChinhPhamThucTe(index);
                            const giaHoaVonThucTe = calculateGiaHoaVonChinhPhamThucTe(index);
                            const loiNhuanThucTe = parseFloat(tab.formData.loiNhuanCongThemThucTe || '0');
                            const giaBaoKhachThucTe = giaHoaVonThucTe + loiNhuanThucTe;
                            doanhThuThucTe += giaBaoKhachThucTe * soKgChinhPhamThucTe;
                          });
                          return doanhThuThucTe.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">= Σ (giá báo khách × số KG sản phẩm chính)</p>
                  </div>

                  {/* Lợi nhuận trước thuế */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Lợi nhuận trước thuế</span>
                    </div>
                    {/* Kế hoạch */}
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-blue-400">
                      <span className="text-xs text-gray-600">Kế hoạch</span>
                      <span className="text-lg font-bold text-gray-900">
                        {(() => {
                          let loiNhuanTruocThue = 0;
                          tabsData.forEach((tab, index) => {
                            const soKgChinhPham = calculateSoKgChinhPham(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThem || '0');
                            loiNhuanTruocThue += loiNhuan * soKgChinhPham;
                          });
                          return loiNhuanTruocThue.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    {/* Thực tế */}
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-green-400 mt-1">
                      <span className="text-xs text-gray-600">Thực tế</span>
                      <span className="text-lg font-bold text-green-700">
                        {(() => {
                          let loiNhuanTruocThueThucTe = 0;
                          tabsData.forEach((tab, index) => {
                            const soKgChinhPhamThucTe = calculateSoKgChinhPhamThucTe(index);
                            const loiNhuanThucTe = parseFloat(tab.formData.loiNhuanCongThemThucTe || '0');
                            loiNhuanTruocThueThucTe += loiNhuanThucTe * soKgChinhPhamThucTe;
                          });
                          return loiNhuanTruocThueThucTe.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">= Σ (lợi nhuận cộng thêm × số kg thành phẩm chính)</p>
                  </div>

                  {/* Phần trăm thuế */}
                  <div className="bg-white rounded-lg p-3 border border-gray-300">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Phần trăm thuế (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={phanTramThue}
                        onChange={(e) => setPhanTramThue(parseNumberInputStr(e.target.value))}
                        className="w-32 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-semibold text-right"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Nhập phần trăm thuế (0-100)</p>
                  </div>

                  {/* Lợi nhuận sau thuế */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Lợi nhuận sau thuế</span>
                    </div>
                    {/* Kế hoạch */}
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-blue-400">
                      <span className="text-xs text-gray-600">Kế hoạch</span>
                      <span className="text-lg font-bold text-gray-900">
                        {(() => {
                          let loiNhuanTruocThue = 0;
                          tabsData.forEach((tab, index) => {
                            const soKgChinhPham = calculateSoKgChinhPham(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThem || '0');
                            loiNhuanTruocThue += loiNhuan * soKgChinhPham;
                          });
                          const thue = parseFloat(phanTramThue || '0');
                          const loiNhuanSauThue = loiNhuanTruocThue - (loiNhuanTruocThue * thue / 100);
                          return loiNhuanSauThue.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    {/* Thực tế */}
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-green-400 mt-1">
                      <span className="text-xs text-gray-600">Thực tế</span>
                      <span className="text-lg font-bold text-green-700">
                        {(() => {
                          let loiNhuanTruocThueThucTe = 0;
                          tabsData.forEach((tab, index) => {
                            const soKgChinhPhamThucTe = calculateSoKgChinhPhamThucTe(index);
                            const loiNhuanThucTe = parseFloat(tab.formData.loiNhuanCongThemThucTe || '0');
                            loiNhuanTruocThueThucTe += loiNhuanThucTe * soKgChinhPhamThucTe;
                          });
                          const thue = parseFloat(phanTramThue || '0');
                          const loiNhuanSauThueThucTe = loiNhuanTruocThueThucTe - (loiNhuanTruocThueThucTe * thue / 100);
                          return loiNhuanSauThueThucTe.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">= lợi nhuận trước thuế - (lợi nhuận trước thuế × % thuế)</p>
                  </div>

                  {/* Phần trăm quỹ */}
                  <div className="bg-white rounded-lg p-3 border border-gray-300">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Phần trăm quỹ (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={phanTramQuy}
                        onChange={(e) => setPhanTramQuy(parseNumberInputStr(e.target.value))}
                        className="w-32 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-semibold text-right"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Nhập phần trăm quỹ (0-100)</p>
                  </div>

                  {/* Trích các quỹ */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Trích các quỹ</span>
                    </div>
                    {/* Kế hoạch */}
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-blue-400">
                      <span className="text-xs text-gray-600">Kế hoạch</span>
                      <span className="text-lg font-bold text-gray-900">
                        {(() => {
                          let loiNhuanTruocThue = 0;
                          tabsData.forEach((tab, index) => {
                            const soKgChinhPham = calculateSoKgChinhPham(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThem || '0');
                            loiNhuanTruocThue += loiNhuan * soKgChinhPham;
                          });
                          const thue = parseFloat(phanTramThue || '0');
                          const loiNhuanSauThue = loiNhuanTruocThue - (loiNhuanTruocThue * thue / 100);
                          const quy = parseFloat(phanTramQuy || '0');
                          const trichCacQuy = loiNhuanSauThue * quy / 100;
                          return trichCacQuy.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    {/* Thực tế */}
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-green-400 mt-1">
                      <span className="text-xs text-gray-600">Thực tế</span>
                      <span className="text-lg font-bold text-green-700">
                        {(() => {
                          let loiNhuanTruocThueThucTe = 0;
                          tabsData.forEach((tab, index) => {
                            const soKgChinhPhamThucTe = calculateSoKgChinhPhamThucTe(index);
                            const loiNhuanThucTe = parseFloat(tab.formData.loiNhuanCongThemThucTe || '0');
                            loiNhuanTruocThueThucTe += loiNhuanThucTe * soKgChinhPhamThucTe;
                          });
                          const thue = parseFloat(phanTramThue || '0');
                          const loiNhuanSauThueThucTe = loiNhuanTruocThueThucTe - (loiNhuanTruocThueThucTe * thue / 100);
                          const quy = parseFloat(phanTramQuy || '0');
                          const trichCacQuyThucTe = loiNhuanSauThueThucTe * quy / 100;
                          return trichCacQuyThucTe.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">= lợi nhuận sau thuế × % quỹ</p>
                  </div>

                  {/* Lợi nhuận thực nhận */}
                  <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-300 hover:bg-blue-100 hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Lợi nhuận thực nhận</span>
                    </div>
                    {/* Kế hoạch */}
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-blue-400">
                      <span className="text-xs text-gray-600">Kế hoạch</span>
                      <span className="text-xl font-bold text-blue-700">
                        {(() => {
                          let loiNhuanTruocThue = 0;
                          tabsData.forEach((tab, index) => {
                            const soKgChinhPham = calculateSoKgChinhPham(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThem || '0');
                            loiNhuanTruocThue += loiNhuan * soKgChinhPham;
                          });
                          const thue = parseFloat(phanTramThue || '0');
                          const loiNhuanSauThue = loiNhuanTruocThue - (loiNhuanTruocThue * thue / 100);
                          const quy = parseFloat(phanTramQuy || '0');
                          const trichCacQuy = loiNhuanSauThue * quy / 100;
                          const loiNhuanThucNhan = loiNhuanSauThue - trichCacQuy;
                          return loiNhuanThucNhan.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    {/* Thực tế */}
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-green-400 mt-1">
                      <span className="text-xs text-gray-600">Thực tế</span>
                      <span className="text-xl font-bold text-green-700">
                        {(() => {
                          let loiNhuanTruocThueThucTe = 0;
                          tabsData.forEach((tab, index) => {
                            const soKgChinhPhamThucTe = calculateSoKgChinhPhamThucTe(index);
                            const loiNhuanThucTe = parseFloat(tab.formData.loiNhuanCongThemThucTe || '0');
                            loiNhuanTruocThueThucTe += loiNhuanThucTe * soKgChinhPhamThucTe;
                          });
                          const thue = parseFloat(phanTramThue || '0');
                          const loiNhuanSauThueThucTe = loiNhuanTruocThueThucTe - (loiNhuanTruocThueThucTe * thue / 100);
                          const quy = parseFloat(phanTramQuy || '0');
                          const trichCacQuyThucTe = loiNhuanSauThueThucTe * quy / 100;
                          const loiNhuanThucNhanThucTe = loiNhuanSauThueThucTe - trichCacQuyThucTe;
                          return loiNhuanThucNhanThucTe.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">= lợi nhuận sau thuế - trích các quỹ</p>
                  </div>
                </div>
              </div>
            </div>
          ) : isAdditionalCostTab && currentAdditionalTab ? (
            /* Render tab chi phí bổ sung */
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Tên chi phí bổ sung */}
                  <div className="bg-green-100 p-3 rounded">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên chi phí bổ sung
                    </label>
                    <input
                      type="text"
                      value={currentAdditionalTab.tenChiPhiBoSung}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-green-50 font-medium"
                    />
                  </div>

                  {/* Chọn loại sản phẩm và sản phẩm */}
                  <div className="bg-orange-100 p-3 rounded space-y-3">
                    {/* Loại sản phẩm */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loại sản phẩm <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={currentAdditionalTab.selectedProductType || ''}
                        onChange={(e) => handleAdditionalTabProductTypeChange(currentAdditionalTab.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Chọn loại sản phẩm --</option>
                        {Array.from(new Set(availableProducts.map((p) => p.loaiSanPham).filter(Boolean))).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tên sản phẩm */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tên sản phẩm <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={currentAdditionalTab.selectedProduct?.id || ''}
                        onChange={(e) => handleAdditionalTabProductChange(currentAdditionalTab.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                        disabled={!currentAdditionalTab.selectedProductType}
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {availableProducts
                          .filter((p) => p.loaiSanPham === currentAdditionalTab.selectedProductType)
                          .map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.tenSanPham}
                            </option>
                          ))}
                      </select>
                      {!currentAdditionalTab.selectedProductType && (
                        <p className="text-xs text-gray-500 mt-1">Vui lòng chọn loại sản phẩm trước</p>
                      )}
                    </div>
                  </div>

                  {/* Khối lượng và đơn vị */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Khối lượng
                      </label>
                      <input
                        type="number"
                        value={currentAdditionalTab.formData.soLuong || ''}
                        onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'soLuong', parseNumberInputStr(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Nhập khối lượng"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Đơn vị
                      </label>
                      <input
                        type="text"
                        value={currentAdditionalTab.formData.donViTinh || ''}
                        onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'donViTinh', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Nhập đơn vị"
                      />
                    </div>
                  </div>

                  {/* Mã báo giá */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã báo giá
                    </label>
                    <input
                      type="text"
                      value={currentAdditionalTab.formData.maBaoGia}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    />
                  </div>

                  {/* Định mức NVL */}
                  <div className="bg-blue-50 p-3 rounded">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Định mức NVL
                    </label>
                    <select
                      value={currentAdditionalTab.selectedStandard?.id || ''}
                      onChange={(e) => handleAdditionalTabStandardChange(currentAdditionalTab.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="">-- Chọn định mức --</option>
                      {materialStandards.map((standard) => (
                        <option key={standard.id} value={standard.id}>
                          {standard.maDinhMuc} - {standard.tenDinhMuc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tỉ lệ thu hồi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tỉ lệ thu hồi thành phẩm K3 (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentAdditionalTab.formData.tiLeThuHoi}
                      onChange={(e) => handleAdditionalTabTiLeThuHoiChange(currentAdditionalTab.id, parseNumberInputStr(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Nhập tỉ lệ thu hồi"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Chọn nguyên liệu đầu vào + Chọn sản phẩm đầu ra */}
                  <div className="flex gap-4">
                    {/* Chọn nguyên liệu đầu vào */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chọn nguyên liệu đầu vào
                      </label>
                      <select
                        value={currentAdditionalTab.formData.nguyenLieuDauVao}
                        onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'nguyenLieuDauVao', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Chọn nguyên liệu --</option>
                        {currentAdditionalTab.selectedStandard?.inputItems?.map((item) => (
                          <option key={item.tenNguyenLieu} value={item.tenNguyenLieu}>
                            {item.tenNguyenLieu}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Chọn sản phẩm đầu ra */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chọn sản phẩm đầu ra
                      </label>
                      <select
                        value={currentAdditionalTab.formData.sanPhamDauRa}
                        onChange={(e) => handleAdditionalTabOutputProductChange(currentAdditionalTab.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {currentAdditionalTab.selectedStandard?.items?.map((item) => (
                          <option key={item.tenThanhPham} value={item.tenThanhPham}>
                            {item.tenThanhPham}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nút kiểm tra tồn kho */}
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => handleCheckInventory(currentAdditionalTab.formData.sanPhamDauRa, currentAdditionalTab.formData.nguyenLieuDauVao)}
                        disabled={!currentAdditionalTab.formData.sanPhamDauRa && !currentAdditionalTab.formData.nguyenLieuDauVao}
                        className="px-3 py-2 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
                        title="Kiểm tra tồn kho"
                      >
                        <Package className="w-3.5 h-3.5" />
                        Kiểm tra tồn kho
                      </button>
                    </div>
                  </div>

                  {/* Thành phẩm tồn kho */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thành phẩm tồn kho
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentAdditionalTab.formData.thanhPhamTonKho}
                      onChange={(e) => handleAdditionalTabInventoryChange(currentAdditionalTab.id, parseNumberInputStr(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập số lượng tồn kho"
                    />
                  </div>

                  {/* Tổng Thành phẩm cần sx thêm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tổng Thành phẩm cần sx thêm
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentAdditionalTab.formData.tongThanhPhamCanSxThem}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      placeholder="Tự động tính"
                    />
                  </div>

                  {/* Tổng nguyên liệu cần sản xuất */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tổng nguyên liệu cần sản xuất
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentAdditionalTab.formData.tongNguyenLieuCanSanXuat}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      placeholder="Tự động tính"
                    />
                  </div>

                  {/* Nguyên liệu tồn kho */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nguyên liệu tồn kho
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentAdditionalTab.formData.nguyenLieuTonKho}
                      onChange={(e) => handleAdditionalTabMaterialInventoryChange(currentAdditionalTab.id, parseNumberInputStr(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập nguyên liệu tồn kho"
                    />
                  </div>

                  {/* Nguyên liệu cần nhập thêm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nguyên liệu cần nhập thêm
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentAdditionalTab.formData.nguyenLieuCanNhapThem}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      placeholder="Tự động tính"
                    />
                  </div>
                </div> {/* End Right Column */}
              </div> {/* End grid 2 columns */}

              {/* Các trường mới - Thời gian và Chi phí */}
              <div className="mt-6 space-y-4">
                {/* Hàng 1: Các trường thời gian */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Ngày bắt đầu sản xuất */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ngày bắt đầu sản xuất
                    </label>
                    <input
                      type="date"
                      value={currentAdditionalTab.formData.ngayBatDauSanXuat}
                      onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'ngayBatDauSanXuat', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Số ngày hoàn thành (kế hoạch) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số ngày hoàn thành ( kế hoạch )
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentAdditionalTab.formData.thoiGianChoPhepToiDa}
                      onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'thoiGianChoPhepToiDa', parseNumberInputStr(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập số ngày"
                    />
                  </div>

                  {/* Số ngày hoàn thành (thực tế) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số ngày hoàn thành ( thực tế )
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Nhập số ngày"
                      value={currentAdditionalTab.formData.ngayHoanThanhThucTe}
                      onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'ngayHoanThanhThucTe', parseNumberInputStr(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Hàng 2: Các trường chi phí */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Chi phí sản xuất */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 text-center bg-gray-100 py-2 rounded-t-md">
                      Chi phí sản xuất
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">kế hoạch</label>
                        <input
                          type="text"
                          value={(() => {
                            if (!currentAdditionalTab.selectedProcess?.flowchart?.sections) return '0';
                            const total = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                              return sum + section.costs.reduce((costSum, cost) => {
                                const gia = cost.giaKeHoach || 0;
                                const soLuong = cost.soLuongKeHoach || 0;
                                return costSum + (gia * soLuong);
                              }, 0);
                            }, 0);
                            const days = parseFloat(currentAdditionalTab.formData.thoiGianChoPhepToiDa) || 1;
                            return (total * days).toLocaleString('vi-VN');
                          })()}
                          disabled
                          className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 text-sm font-medium text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">thực tế</label>
                        <input
                          type="text"
                          value={(() => {
                            if (!currentAdditionalTab.selectedProcess?.flowchart?.sections) return '0';
                            const total = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                              return sum + section.costs.reduce((costSum, cost) => {
                                const gia = cost.giaThucTe || 0;
                                const soLuong = cost.soLuongThucTe || 0;
                                return costSum + (gia * soLuong);
                              }, 0);
                            }, 0);
                            const days = parseFloat(currentAdditionalTab.formData.ngayHoanThanhThucTe) || 1;
                            return (total * days).toLocaleString('vi-VN');
                          })()}
                          disabled
                          className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 text-sm font-medium text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Chi phí chung */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 text-center bg-gray-100 py-2 rounded-t-md">
                      Chi phí chung
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">kế hoạch</label>
                        <input
                          type="text"
                          value={(() => {
                            // Tính chi phí chung kế hoạch từ TẤT CẢ các bảng chi phí chung mà sản phẩm này được chọn
                            const currentProductId = `additional-${currentAdditionalTab.id}`;
                            const currentKhoiLuong = parseFloat(currentAdditionalTab.formData.soLuong || '0');

                            let chiPhiChung = 0;
                            // Duyệt qua từng bảng chi phí chung
                            generalCostGroups.forEach(group => {
                              const groupTotalKeHoach = group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);

                              // Kiểm tra xem sản phẩm hiện tại có được chọn cho bảng này không
                              const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId);
                              if (!isProductSelected) return;

                              // Lọc các sản phẩm chính được chọn cho bảng này
                              const items = getItems();
                              const selectedMainItems = items.filter((_: any, index: number) => {
                                const pid = `tab-${index}`;
                                return group.selectedProducts.includes(pid);
                              });

                              // Lọc các chi phí bổ sung được chọn cho bảng này
                              const selectedAdditionalItems = additionalCostTabs.filter(tab => {
                                const pid = `additional-${tab.id}`;
                                return group.selectedProducts.includes(pid);
                              });

                              // Tính tổng khối lượng của các sản phẩm được chọn cho bảng này
                              const totalKhoiLuongMain = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);
                              const totalKhoiLuongAdditional = selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0);
                              const totalKhoiLuong = totalKhoiLuongMain + totalKhoiLuongAdditional;
                              const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length;

                              if (totalKhoiLuong === 0) return;

                              // Nếu chỉ có 1 sản phẩm được chọn → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo khối lượng
                              if (totalSelectedCount === 1) {
                                chiPhiChung += groupTotalKeHoach;
                              } else {
                                chiPhiChung += (groupTotalKeHoach * currentKhoiLuong) / totalKhoiLuong;
                              }
                            });

                            return chiPhiChung.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                          })()}
                          disabled
                          className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 text-sm font-medium text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">thực tế</label>
                        <input
                          type="text"
                          value={(() => {
                            // Tính chi phí chung thực tế từ TẤT CẢ các bảng chi phí chung mà sản phẩm này được chọn
                            const currentProductId = `additional-${currentAdditionalTab.id}`;
                            const currentKhoiLuong = parseFloat(currentAdditionalTab.formData.soLuong || '0');

                            let chiPhiChung = 0;
                            // Duyệt qua từng bảng chi phí chung
                            generalCostGroups.forEach(group => {
                              const groupTotalThucTe = group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);

                              // Kiểm tra xem sản phẩm hiện tại có được chọn cho bảng này không
                              const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId);
                              if (!isProductSelected) return;

                              // Lọc các sản phẩm chính được chọn cho bảng này
                              const items = getItems();
                              const selectedMainItems = items.filter((_: any, index: number) => {
                                const pid = `tab-${index}`;
                                return group.selectedProducts.includes(pid);
                              });

                              // Lọc các chi phí bổ sung được chọn cho bảng này
                              const selectedAdditionalItems = additionalCostTabs.filter(tab => {
                                const pid = `additional-${tab.id}`;
                                return group.selectedProducts.includes(pid);
                              });

                              // Tính tổng khối lượng của các sản phẩm được chọn cho bảng này
                              const totalKhoiLuongMain = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);
                              const totalKhoiLuongAdditional = selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0);
                              const totalKhoiLuong = totalKhoiLuongMain + totalKhoiLuongAdditional;
                              const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length;

                              if (totalKhoiLuong === 0) return;

                              // Nếu chỉ có 1 sản phẩm được chọn → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo khối lượng
                              if (totalSelectedCount === 1) {
                                chiPhiChung += groupTotalThucTe;
                              } else {
                                chiPhiChung += (groupTotalThucTe * currentKhoiLuong) / totalKhoiLuong;
                              }
                            });

                            return chiPhiChung.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                          })()}
                          disabled
                          className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 text-sm font-medium text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Chi phí xuất khẩu */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 text-center bg-gray-100 py-2 rounded-t-md">
                      Chi phí xuất khẩu
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">kế hoạch</label>
                        <input
                          type="text"
                          value={(() => {
                            // Tính tổng chi phí xuất khẩu kế hoạch
                            const totalExportCostKeHoach = selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
                            const currentTongThanhPham = parseFloat(currentAdditionalTab.formData.tongThanhPhamCanSxThem || '0');

                            // Tính tổng "Tổng Thành phẩm cần sx thêm" tất cả sản phẩm (cả chính và bổ sung)
                            const mainItems = getItems();
                            const totalTongThanhPhamMain = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                            const totalTongThanhPhamAdditional = additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                            const totalTongThanhPham = totalTongThanhPhamMain + totalTongThanhPhamAdditional;
                            const totalProductCount = mainItems.length + additionalCostTabs.length;

                            // Nếu chỉ có 1 sản phẩm → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo "Tổng Thành phẩm cần sx thêm", fallback theo khối lượng
                            const currentKhoiLuongExport = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                            const chiPhiXuatKhau = totalProductCount === 1
                              ? totalExportCostKeHoach
                              : totalTongThanhPham > 0
                                ? (totalExportCostKeHoach * currentTongThanhPham) / totalTongThanhPham
                                : (() => {
                                    const totalKhoiLuongAll = mainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
                                      additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0);
                                    return totalKhoiLuongAll > 0 ? (totalExportCostKeHoach * currentKhoiLuongExport) / totalKhoiLuongAll : 0;
                                  })();
                            return chiPhiXuatKhau.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                          })()}
                          disabled
                          className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 text-sm font-medium text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">thực tế</label>
                        <input
                          type="text"
                          value={(() => {
                            // Tính tổng chi phí xuất khẩu thực tế
                            const totalExportCostThucTe = selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);
                            const currentTongThanhPham = parseFloat(currentAdditionalTab.formData.tongThanhPhamCanSxThem || '0');

                            // Tính tổng "Tổng Thành phẩm cần sx thêm" tất cả sản phẩm (cả chính và bổ sung)
                            const mainItems = getItems();
                            const totalTongThanhPhamMain = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                            const totalTongThanhPhamAdditional = additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                            const totalTongThanhPham = totalTongThanhPhamMain + totalTongThanhPhamAdditional;
                            const totalProductCount = mainItems.length + additionalCostTabs.length;

                            // Nếu chỉ có 1 sản phẩm → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo "Tổng Thành phẩm cần sx thêm", fallback theo khối lượng
                            const currentKhoiLuongExport = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                            const chiPhiXuatKhau = totalProductCount === 1
                              ? totalExportCostThucTe
                              : totalTongThanhPham > 0
                                ? (totalExportCostThucTe * currentTongThanhPham) / totalTongThanhPham
                                : (() => {
                                    const totalKhoiLuongAll = mainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
                                      additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0);
                                    return totalKhoiLuongAll > 0 ? (totalExportCostThucTe * currentKhoiLuongExport) / totalKhoiLuongAll : 0;
                                  })();
                            return chiPhiXuatKhau.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                          })()}
                          disabled
                          className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 text-sm font-medium text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tổng chi phí */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 text-center bg-green-100 py-2 rounded-t-md">
                      Tổng chi phí
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">kế hoạch</label>
                        <input
                          type="text"
                          value={(() => {
                            // 1. Chi phí sản xuất kế hoạch
                            let chiPhiSanXuat = 0;
                            if (currentAdditionalTab.selectedProcess?.flowchart?.sections) {
                              const perDay = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                                return sum + section.costs.reduce((costSum, cost) => {
                                  const gia = cost.giaKeHoach || 0;
                                  const soLuong = cost.soLuongKeHoach || 0;
                                  return costSum + (gia * soLuong);
                                }, 0);
                              }, 0);
                              const maxDays = parseFloat(currentAdditionalTab.formData.thoiGianChoPhepToiDa) || 1;
                              chiPhiSanXuat = perDay * maxDays;
                            }

                            // 2. Chi phí chung kế hoạch - tính từ TẤT CẢ các bảng chi phí chung mà sản phẩm này được chọn
                            const currentKhoiLuong = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                            const currentProductId = `additional-${currentAdditionalTab.id}`;

                            let chiPhiChung = 0;
                            generalCostGroups.forEach(group => {
                              const groupTotalKeHoach = group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);

                              // Kiểm tra xem sản phẩm hiện tại có được chọn cho bảng này không
                              const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId);
                              if (!isProductSelected) return;

                              // Lọc các sản phẩm chính được chọn cho bảng này
                              const items = getItems();
                              const selectedMainItems = items.filter((_: any, index: number) => {
                                const pid = `tab-${index}`;
                                return group.selectedProducts.includes(pid);
                              });

                              // Lọc các chi phí bổ sung được chọn cho bảng này
                              const selectedAdditionalItems = additionalCostTabs.filter(tab => {
                                const pid = `additional-${tab.id}`;
                                return group.selectedProducts.includes(pid);
                              });

                              // Tính tổng khối lượng của các sản phẩm được chọn cho bảng này
                              const totalKhoiLuongMain = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);
                              const totalKhoiLuongAdditional = selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0);
                              const totalKhoiLuong = totalKhoiLuongMain + totalKhoiLuongAdditional;
                              const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length;

                              if (totalKhoiLuong === 0) return;

                              // Nếu chỉ có 1 sản phẩm được chọn → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo khối lượng
                              if (totalSelectedCount === 1) {
                                chiPhiChung += groupTotalKeHoach;
                              } else {
                                chiPhiChung += (groupTotalKeHoach * currentKhoiLuong) / totalKhoiLuong;
                              }
                            });

                            // 3. Chi phí xuất khẩu kế hoạch
                            const totalExportCostKeHoach = selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
                            const mainItems = getItems();
                            const currentTongThanhPhamExport = parseFloat(currentAdditionalTab.formData.tongThanhPhamCanSxThem || '0');
                            const totalTongThanhPhamMainExport = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                            const totalTongThanhPhamAdditionalExport = additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                            const totalTongThanhPhamExport = totalTongThanhPhamMainExport + totalTongThanhPhamAdditionalExport;
                            const totalProductCountExport = mainItems.length + additionalCostTabs.length;
                            const chiPhiXuatKhau = totalProductCountExport === 1
                              ? totalExportCostKeHoach
                              : totalTongThanhPhamExport > 0
                                ? (totalExportCostKeHoach * currentTongThanhPhamExport) / totalTongThanhPhamExport
                                : (() => {
                                    const curKL = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                                    const totalKL = mainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
                                      additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0);
                                    return totalKL > 0 ? (totalExportCostKeHoach * curKL) / totalKL : 0;
                                  })();

                            const tongChiPhi = chiPhiSanXuat + chiPhiChung + chiPhiXuatKhau;
                            return tongChiPhi.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                          })()}
                          disabled
                          className="w-full px-2 py-1 border border-green-400 rounded bg-green-50 text-sm font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">thực tế</label>
                        <input
                          type="text"
                          value={(() => {
                            // 1. Chi phí sản xuất thực tế (per-day * số ngày hoàn thành thực tế)
                            let chiPhiSanXuat = 0;
                            if (currentAdditionalTab.selectedProcess?.flowchart?.sections) {
                              const perDay = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                                return sum + section.costs.reduce((costSum, cost) => {
                                  const gia = cost.giaThucTe || 0;
                                  const soLuong = cost.soLuongThucTe || 0;
                                  return costSum + (gia * soLuong);
                                }, 0);
                              }, 0);
                              // Nhân với số ngày hoàn thành thực tế (tương tự kế hoạch)
                              const actualDays = parseFloat(currentAdditionalTab.formData.ngayHoanThanhThucTe) || 1;
                              chiPhiSanXuat = perDay * actualDays;
                            }

                            // 2. Chi phí chung thực tế - tính từ TẤT CẢ các bảng chi phí chung mà sản phẩm này được chọn
                            const currentKhoiLuong = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                            const currentProductId = `additional-${currentAdditionalTab.id}`;

                            let chiPhiChung = 0;
                            generalCostGroups.forEach(group => {
                              const groupTotalThucTe = group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);

                              // Kiểm tra xem sản phẩm hiện tại có được chọn cho bảng này không
                              const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId);
                              if (!isProductSelected) return;

                              // Lọc các sản phẩm chính được chọn cho bảng này
                              const items = getItems();
                              const selectedMainItems = items.filter((_: any, index: number) => {
                                const pid = `tab-${index}`;
                                return group.selectedProducts.includes(pid);
                              });

                              // Lọc các chi phí bổ sung được chọn cho bảng này
                              const selectedAdditionalItems = additionalCostTabs.filter(tab => {
                                const pid = `additional-${tab.id}`;
                                return group.selectedProducts.includes(pid);
                              });

                              // Tính tổng khối lượng của các sản phẩm được chọn cho bảng này
                              const totalKhoiLuongMain = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);
                              const totalKhoiLuongAdditional = selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0);
                              const totalKhoiLuong = totalKhoiLuongMain + totalKhoiLuongAdditional;
                              const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length;

                              if (totalKhoiLuong === 0) return;

                              // Nếu chỉ có 1 sản phẩm được chọn → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo khối lượng
                              if (totalSelectedCount === 1) {
                                chiPhiChung += groupTotalThucTe;
                              } else {
                                chiPhiChung += (groupTotalThucTe * currentKhoiLuong) / totalKhoiLuong;
                              }
                            });

                            // 3. Chi phí xuất khẩu thực tế
                            const totalExportCostThucTe = selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);
                            const mainItems = getItems();
                            const currentTongThanhPhamExport = parseFloat(currentAdditionalTab.formData.tongThanhPhamCanSxThem || '0');
                            const totalTongThanhPhamMainExport = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                            const totalTongThanhPhamAdditionalExport = additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                            const totalTongThanhPhamExport = totalTongThanhPhamMainExport + totalTongThanhPhamAdditionalExport;
                            const totalProductCountExport = mainItems.length + additionalCostTabs.length;
                            const chiPhiXuatKhau = totalProductCountExport === 1
                              ? totalExportCostThucTe
                              : totalTongThanhPhamExport > 0
                                ? (totalExportCostThucTe * currentTongThanhPhamExport) / totalTongThanhPhamExport
                                : (() => {
                                    const curKL = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                                    const totalKL = mainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
                                      additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0);
                                    return totalKL > 0 ? (totalExportCostThucTe * curKL) / totalKL : 0;
                                  })();

                            const tongChiPhi = chiPhiSanXuat + chiPhiChung + chiPhiXuatKhau;
                            return tongChiPhi.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                          })()}
                          disabled
                          className="w-full px-2 py-1 border border-green-400 rounded bg-green-50 text-sm font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danh sách sản phẩm trong định mức - Table Layout */}
              {currentAdditionalTab && currentAdditionalTab.selectedStandard && currentAdditionalTab.selectedStandard.items && currentAdditionalTab.selectedStandard.items.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">
                    Thành phẩm đầu ra
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 bg-gray-200 border border-gray-300 text-left text-sm font-medium text-gray-700">
                            Thành phẩm đầu ra
                          </th>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            return (
                              <th
                                key={index}
                                className={`px-4 py-2 border border-gray-300 text-center text-sm font-medium ${
                                  isSelected ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {item.tenThanhPham}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Tỉ lệ thu hồi */}
                        <tr>
                          <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">
                            tỉ lệ thu hồi
                          </td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            return (
                              <td
                                key={index}
                                className={`px-4 py-2 border border-gray-300 text-center ${
                                  isSelected ? 'bg-blue-50' : 'bg-gray-50'
                                }`}
                              >
                                <span className="font-medium">{item.tiLe} %</span>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Số kg thành phẩm */}
                        <tr>
                          <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">
                            số kg thành phẩm
                          </td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            const soKg = currentAdditionalTab.formData.tongNguyenLieuCanSanXuat && currentAdditionalTab.formData.tiLeThuHoi
                              ? (parseFloat(currentAdditionalTab.formData.tongNguyenLieuCanSanXuat) * parseFloat(currentAdditionalTab.formData.tiLeThuHoi) / 100 * item.tiLe / 100).toFixed(3)
                              : '0';
                            return (
                              <td
                                key={index}
                                className={`px-4 py-2 border border-gray-300 text-center ${
                                  isSelected ? 'bg-blue-50' : 'bg-gray-50'
                                }`}
                              >
                                <span className="font-medium text-blue-600">{soKg} kg</span>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Giá hòa vốn (VNĐ/KG) */}
                        <tr>
                          <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">
                            giá hòa vốn (VNĐ/KG)
                          </td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            const giaHoaVonValue = isSelected
                              ? '0'
                              : formatNumberWithDots(currentAdditionalTab.formData.giaHoaVonSanPhamPhu[item.tenThanhPham]);

                            return (
                              <td
                                key={index}
                                className={`px-4 py-2 border border-gray-300 text-center ${
                                  isSelected ? 'bg-blue-50' : 'bg-gray-50'
                                }`}
                              >
                                <input
                                  type="text"
                                  value={giaHoaVonValue}
                                  onChange={(e) => {
                                    if (!isSelected) {
                                      setAdditionalCostTabs(prev => {
                                        const newTabs = [...prev];
                                        const tabIndex = newTabs.findIndex(t => t.id === currentAdditionalTab.id);
                                        if (tabIndex !== -1) {
                                          newTabs[tabIndex].formData.giaHoaVonSanPhamPhu = {
                                            ...newTabs[tabIndex].formData.giaHoaVonSanPhamPhu,
                                            [item.tenThanhPham]: String(parseNumberFromDots(e.target.value)),
                                          };
                                        }
                                        return newTabs;
                                      });
                                    }
                                  }}
                                  disabled={isSelected}
                                  className={`w-full px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 ${
                                    isSelected ? 'bg-yellow-50 border-yellow-400 font-bold' : 'bg-white border-gray-300'
                                  }`}
                                  placeholder="0"
                                />
                              </td>
                            );
                          })}
                        </tr>

                        {/* Lợi nhuận cộng thêm (VNĐ/KG) */}
                        <tr>
                          <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm text-gray-700">
                            lợi nhuận cộng thêm (VNĐ/KG)
                          </td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            return (
                              <td
                                key={index}
                                className={`px-4 py-2 border border-gray-300 text-center ${
                                  isSelected ? 'bg-blue-50' : 'bg-gray-50'
                                }`}
                              >
                                {isSelected ? (
                                  <input
                                    type="text"
                                    value={formatNumberWithDots(currentAdditionalTab.formData.loiNhuanCongThem)}
                                    onChange={(e) => {
                                      setAdditionalCostTabs(prev => {
                                        const newTabs = [...prev];
                                        const tabIndex = newTabs.findIndex(t => t.id === currentAdditionalTab.id);
                                        if (tabIndex !== -1) {
                                          newTabs[tabIndex].formData.loiNhuanCongThem = String(parseNumberFromDots(e.target.value));
                                        }
                                        return newTabs;
                                      });
                                    }}
                                    className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white"
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Giá báo khách */}
                        <tr>
                          <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm font-medium text-gray-700">
                            giá báo khách (VNĐ/KG)
                          </td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            const giaBaoKhachValue = isSelected
                              ? (() => {
                                  const giaHoaVon = 0;
                                  const loiNhuan = parseFloat(currentAdditionalTab.formData.loiNhuanCongThem || '0');
                                  return formatNumberWithDots(giaHoaVon + loiNhuan);
                                })()
                              : '';

                            return (
                              <td
                                key={index}
                                className={`px-4 py-2 border border-gray-300 text-center ${
                                  isSelected ? 'bg-blue-50' : 'bg-gray-50'
                                }`}
                              >
                                {isSelected ? (
                                  <input
                                    type="text"
                                    value={giaBaoKhachValue}
                                    disabled
                                    className="w-full px-2 py-1 text-center border border-blue-400 rounded bg-yellow-50 font-bold text-lg"
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Giá báo khách USD/KG */}
                        <tr>
                          <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm font-medium text-gray-700">
                            <div className="flex flex-col">
                              <span>giá báo khách (USD/KG)</span>
                              <div className="flex items-center mt-1">
                                <span className="text-xs text-gray-500 mr-1">Tỉ giá:</span>
                                <input
                                  type="text"
                                  value={currentAdditionalTab.formData.tiGiaUSD}
                                  onChange={(e) => {
                                    const rawValue = handleNumericInput(e.target.value);
                                    setAdditionalCostTabs(prev => {
                                      const newTabs = [...prev];
                                      const tabIndex = newTabs.findIndex(t => t.id === currentAdditionalTab.id);
                                      if (tabIndex !== -1) {
                                        newTabs[tabIndex].formData.tiGiaUSD = rawValue;
                                      }
                                      return newTabs;
                                    });
                                  }}
                                  onBlur={(e) => {
                                    const numValue = parseNumberFromDots(e.target.value);
                                    if (numValue > 0) {
                                      setAdditionalCostTabs(prev => {
                                        const newTabs = [...prev];
                                        const tabIndex = newTabs.findIndex(t => t.id === currentAdditionalTab.id);
                                        if (tabIndex !== -1) {
                                          newTabs[tabIndex].formData.tiGiaUSD = formatNumberWithDots(numValue);
                                        }
                                        return newTabs;
                                      });
                                    }
                                  }}
                                  className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500"
                                  placeholder="VD: 25000"
                                />
                              </div>
                            </div>
                          </td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            const tiGiaUSD = parseNumberFromDots(currentAdditionalTab.formData.tiGiaUSD || '0');

                            // Tính giá báo khách USD/KG = Giá báo khách VNĐ / Tỉ giá
                            const giaHoaVon = 0;
                            const loiNhuan = parseFloat(currentAdditionalTab.formData.loiNhuanCongThem || '0');
                            const giaBaoKhachVND = giaHoaVon + loiNhuan;
                            const giaBaoKhachUSD = isSelected && tiGiaUSD > 0
                              ? formatNumberWithDots(giaBaoKhachVND / tiGiaUSD)
                              : '';

                            return (
                              <td
                                key={index}
                                className={`px-4 py-2 border border-gray-300 text-center ${
                                  isSelected ? 'bg-blue-50' : 'bg-gray-50'
                                }`}
                              >
                                {isSelected ? (
                                  <input
                                    type="text"
                                    value={giaBaoKhachUSD}
                                    disabled
                                    className="w-full px-2 py-1 text-center border border-blue-400 rounded bg-yellow-50 font-bold text-lg"
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={currentAdditionalTab.formData.ghiChu}
                  onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'ghiChu', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập ghi chú (nếu có)"
                />
              </div>

              {/* Chọn quy trình sản xuất */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chọn quy trình sản xuất
                </label>
                <select
                  value={currentAdditionalTab.selectedProcess?.id || ''}
                  onChange={(e) => handleAdditionalTabProcessChange(currentAdditionalTab.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn quy trình --</option>
                  {productionProcesses.map((process) => (
                    <option key={process.id} value={process.id}>
                      {process.maQuyTrinhSanXuat} - {process.tenQuyTrinhSanXuat || process.tenQuyTrinh}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bảng lưu đồ quy trình cho chi phí bổ sung */}
              {currentAdditionalTab && currentAdditionalTab.selectedProcess && currentAdditionalTab.selectedProcess.flowchart && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">
                    Lưu đồ quy trình
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-400">
                      <thead>
                        {/* Main header row */}
                        <tr className="bg-blue-100">
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>STT</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>PHÂN ĐOẠN</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>NỘI DUNG CÔNG VIỆC</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>LOẠI CHI PHÍ</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>TÊN CHI PHÍ</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐVT</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐỊNH MỨC LAO ĐỘNG</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐƠN VỊ</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>SỐ LƯỢNG NGUYÊN LIỆU CẦN HOÀN THÀNH (Kg)</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>SỐ PHÚT CẦN THỰC HIỆN XONG</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ CẦN DÙNG</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>KẾ HOẠCH</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>THỰC TẾ</th>
                        </tr>
                        {/* Sub-header row */}
                        <tr className="bg-blue-50">
                          <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">KẾ HOẠCH</th>
                          <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">THỰC TẾ</th>
                          <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">GIÁ (VNĐ)</th>
                          <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">THÀNH TIỀN (VNĐ)</th>
                          <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">GIÁ (VNĐ)</th>
                          <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">THÀNH TIỀN (VNĐ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentAdditionalTab.selectedProcess.flowchart.sections.map((section, sectionIndex) => {
                          const sectionRowSpan = section.costs.length;
                          return section.costs.map((cost, costIndex) => (
                            <tr key={`${sectionIndex}-${costIndex}`} className={costIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {costIndex === 0 && (
                                <>
                                  <td className="border border-gray-400 px-3 py-2 text-center font-medium" rowSpan={sectionRowSpan}>
                                    {sectionIndex + 1}
                                  </td>
                                  <td className="border border-gray-400 px-3 py-2 text-center" rowSpan={sectionRowSpan}>
                                    {section.phanDoan}
                                  </td>
                                  <td className="border border-gray-400 px-3 py-2" rowSpan={sectionRowSpan}>
                                    {section.noiDungCongViec}
                                  </td>
                                </>
                              )}
                              <td className="border border-gray-400 px-3 py-2 text-center">{cost.loaiChiPhi}</td>
                              <td className="border border-gray-400 px-3 py-2">{cost.tenChiPhi || '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center">{cost.donVi || '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                                {cost.dinhMucLaoDong !== undefined && cost.dinhMucLaoDong !== null ? cost.dinhMucLaoDong : '-'}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                                {cost.donViDinhMucLaoDong || '-'}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                                {cost.soLuongNguyenLieu !== undefined && cost.soLuongNguyenLieu !== null ? cost.soLuongNguyenLieu : '-'}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                                {cost.soPhutThucHien !== undefined && cost.soPhutThucHien !== null ? cost.soPhutThucHien : '-'}
                              </td>
                              {/* Cột KẾ HOẠCH - Hiển thị từ database */}
                              <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">
                                {cost.soLuongKeHoach !== undefined && cost.soLuongKeHoach !== null ? cost.soLuongKeHoach.toFixed(2) : '-'}
                              </td>
                              {/* Cột THỰC TẾ - Editable */}
                              <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                                <input
                                  type="text"
                                  value={additionalFlowchartInputValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-soLuongThucTe`] ?? formatNumberWithDots(cost.soLuongThucTe)}
                                  onChange={(e) => {
                                    const rawValue = handleNumericInput(e.target.value);
                                    setAdditionalFlowchartInputValues(prev => ({
                                      ...prev,
                                      [`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-soLuongThucTe`]: rawValue
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    const numValue = parseNumberFromDots(e.target.value);
                                    handleAdditionalTabFlowchartCostChange(currentAdditionalTab.id, sectionIndex, costIndex, 'soLuongThucTe', String(numValue));
                                    setAdditionalFlowchartInputValues(prev => {
                                      const newValues = { ...prev };
                                      delete newValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-soLuongThucTe`];
                                      return newValues;
                                    });
                                  }}
                                  className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right"
                                  placeholder="0"
                                />
                              </td>
                              {/* Cột GIÁ (KẾ HOẠCH) - Editable */}
                              <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                                <input
                                  type="text"
                                  value={additionalFlowchartInputValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaKeHoach`] ?? formatNumberWithDots(cost.giaKeHoach)}
                                  onChange={(e) => {
                                    const rawValue = handleNumericInput(e.target.value);
                                    setAdditionalFlowchartInputValues(prev => ({
                                      ...prev,
                                      [`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaKeHoach`]: rawValue
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    const numValue = parseNumberFromDots(e.target.value);
                                    handleAdditionalTabFlowchartCostChange(currentAdditionalTab.id, sectionIndex, costIndex, 'giaKeHoach', String(numValue));
                                    setAdditionalFlowchartInputValues(prev => {
                                      const newValues = { ...prev };
                                      delete newValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaKeHoach`];
                                      return newValues;
                                    });
                                  }}
                                  className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right"
                                  placeholder="0"
                                />
                              </td>
                              {/* Cột THÀNH TIỀN (KẾ HOẠCH) - Tính toán tự động */}
                              <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">
                                {(() => {
                                  const gia = cost.giaKeHoach || 0;
                                  const soLuong = cost.soLuongKeHoach || 0;
                                  const thanhTien = gia * soLuong;
                                  return thanhTien > 0 ? formatNumberWithDots(thanhTien) : '0';
                                })()}
                              </td>
                              {/* Cột GIÁ (THỰC TẾ) - Editable */}
                              <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                                <input
                                  type="text"
                                  value={additionalFlowchartInputValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaThucTe`] ?? formatNumberWithDots(cost.giaThucTe)}
                                  onChange={(e) => {
                                    const rawValue = handleNumericInput(e.target.value);
                                    setAdditionalFlowchartInputValues(prev => ({
                                      ...prev,
                                      [`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaThucTe`]: rawValue
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    const numValue = parseNumberFromDots(e.target.value);
                                    handleAdditionalTabFlowchartCostChange(currentAdditionalTab.id, sectionIndex, costIndex, 'giaThucTe', String(numValue));
                                    setAdditionalFlowchartInputValues(prev => {
                                      const newValues = { ...prev };
                                      delete newValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaThucTe`];
                                      return newValues;
                                    });
                                  }}
                                  className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right"
                                  placeholder="0"
                                />
                              </td>
                              {/* Cột THÀNH TIỀN (THỰC TẾ) - Tính toán tự động */}
                              <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">
                                {(() => {
                                  const gia = cost.giaThucTe || 0;
                                  const soLuong = cost.soLuongThucTe || 0;
                                  const thanhTien = gia * soLuong;
                                  return thanhTien > 0 ? formatNumberWithDots(thanhTien) : '0';
                                })()}
                              </td>
                            </tr>
                          ));
                        })}
                        {/* Hàng Tổng cộng */}
                        <tr className="bg-blue-100 font-bold">
                          <td colSpan={13} className="border border-gray-400 px-3 py-3 text-right text-sm">
                            Tổng cộng
                          </td>
                          {/* Tổng THÀNH TIỀN (KẾ HOẠCH) */}
                          <td className="border border-gray-400 px-3 py-3 text-center text-sm">
                            {(() => {
                              const total = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                                return sum + section.costs.reduce((costSum, cost) => {
                                  const gia = cost.giaKeHoach || 0;
                                  const soLuong = cost.soLuongKeHoach || 0;
                                  return costSum + (gia * soLuong);
                                }, 0);
                              }, 0);
                              return total.toLocaleString('vi-VN') + ' VNĐ';
                            })()}
                          </td>
                          {/* Cột trống (GIÁ THỰC TẾ) */}
                          <td className="border border-gray-400 px-3 py-3 bg-gray-100"></td>
                          {/* Tổng THÀNH TIỀN (THỰC TẾ) */}
                          <td className="border border-gray-400 px-3 py-3 text-center text-sm">
                            {(() => {
                              const total = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                                return sum + section.costs.reduce((costSum, cost) => {
                                  const gia = cost.giaThucTe || 0;
                                  const soLuong = cost.soLuongThucTe || 0;
                                  return costSum + (gia * soLuong);
                                }, 0);
                              }, 0);
                              return total.toLocaleString('vi-VN') + ' VNĐ';
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : !currentTab ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-2.5">
              {/* Tên người thực hiện */}
              <div className="bg-gray-50 px-2.5 py-2 rounded">
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Tên người thực hiện</label>
                <input
                  type="text"
                  value={quotationRequest.tenNhanVien || ''}
                  disabled
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                />
              </div>

              {/* Tên sản phẩm */}
              <div className="bg-orange-100 px-2.5 py-2 rounded">
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Tên sản phẩm</label>
                <input
                  type="text"
                  value={currentItem?.tenSanPham || ''}
                  disabled
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-orange-50 font-medium"
                />
              </div>

              {/* Khối lượng + Đơn vị */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Khối lượng</label>
                  <input
                    type="number"
                    value={currentItem?.soLuong || ''}
                    disabled
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Đơn vị</label>
                  <input
                    type="text"
                    value={currentItem?.donViTinh || ''}
                    disabled
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
                  />
                </div>
              </div>

              {/* Mã định mức NVL */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Mã định mức NVL</label>
                <select
                  value={currentTab.selectedStandard?.id || ''}
                  onChange={(e) => handleStandardChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn định mức --</option>
                  {materialStandards.map((standard) => (
                    <option key={standard.id} value={standard.id}>
                      {standard.maDinhMuc} : {standard.tenDinhMuc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tỉ lệ thu hồi thành phẩm (%) K3 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Tỉ lệ thu hồi thành phẩm (%) K3</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[11px] text-blue-600 mb-0.5">Kế hoạch</span>
                    <input
                      type="number"
                      step="0.01"
                      value={currentTab.formData.tiLeThuHoi}
                      onChange={(e) => handleTiLeThuHoiChange(parseNumberInputStr(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập tỉ lệ thu hồi"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-green-600 mb-0.5">Thực tế</span>
                    <input
                      type="number"
                      step="0.01"
                      value={
                        currentTab.formData.tongKhoiLuongThanhPhamThucTe && currentTab.formData.tongNguyenLieuCanSanXuatThucTe
                          ? ((parseFloat(currentTab.formData.tongKhoiLuongThanhPhamThucTe) / parseFloat(currentTab.formData.tongNguyenLieuCanSanXuatThucTe)) * 100).toFixed(2)
                          : ''
                      }
                      disabled
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-100 text-green-600 font-medium"
                      placeholder="Tự động tính"
                    />
                  </div>
                </div>
              </div>

              {/* Tổng khối lượng thành phẩm đầu ra */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Tổng khối lượng thành phẩm đầu ra (kg)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[11px] text-blue-600 mb-0.5">Kế hoạch</span>
                    <input
                      type="number"
                      step="0.01"
                      value={
                        currentTab.formData.tongNguyenLieuCanSanXuat && currentTab.formData.tiLeThuHoi
                          ? (parseFloat(currentTab.formData.tongNguyenLieuCanSanXuat) * parseFloat(currentTab.formData.tiLeThuHoi) / 100).toFixed(2)
                          : '0'
                      }
                      readOnly
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-100 text-blue-600 font-medium"
                      placeholder="Tự động tính"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-green-600 mb-0.5">Thực tế</span>
                    <input
                      type="number"
                      step="0.01"
                      value={currentTab.formData.tongKhoiLuongThanhPhamThucTe || ''}
                      onChange={(e) => updateFormData('tongKhoiLuongThanhPhamThucTe', parseNumberInputStr(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      placeholder="Nhập thực tế"
                    />
                  </div>
                </div>
              </div>
            </div> {/* End Left Column */}

            {/* Right Column */}
            <div className="space-y-2.5">
              {/* Chọn nguyên liệu đầu vào + Chọn sản phẩm đầu ra */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Chọn nguyên liệu đầu vào</label>
                  <select
                    value={currentTab.formData.nguyenLieuDauVao}
                    onChange={(e) => updateFormData('nguyenLieuDauVao', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    disabled={!currentTab.selectedStandard}
                  >
                    <option value="">-- Chọn nguyên liệu --</option>
                    {currentTab.selectedStandard?.inputItems?.map((item, index) => (
                      <option key={index} value={item.tenNguyenLieu}>
                        {item.tenNguyenLieu}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Chọn sản phẩm đầu ra</label>
                  <select
                    value={currentTab.formData.sanPhamDauRa}
                    onChange={(e) => handleOutputProductChange(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    disabled={!currentTab.selectedStandard}
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {currentTab.selectedStandard?.items?.map((item, index) => (
                      <option key={index} value={item.tenThanhPham}>
                        {item.tenThanhPham}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheckInventory(currentTab.formData.sanPhamDauRa, currentTab.formData.nguyenLieuDauVao)}
                  disabled={!currentTab.formData.sanPhamDauRa && !currentTab.formData.nguyenLieuDauVao}
                  className="px-2.5 py-1.5 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
                  title="Kiểm tra tồn kho"
                >
                  <Package className="w-3 h-3" />
                  Kiểm tra tồn kho
                </button>
              </div>

              {/* Thành phẩm tồn kho */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Thành phẩm tồn kho</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[11px] text-blue-600 mb-0.5">Kế hoạch</span>
                    <input
                      type="number"
                      step="0.01"
                      value={currentTab.formData.thanhPhamTonKho}
                      onChange={(e) => handleInventoryChange(parseNumberInputStr(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập tồn kho"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-green-600 mb-0.5">Thực tế</span>
                    <input
                      type="number"
                      step="0.01"
                      value={currentTab.formData.thanhPhamTonKhoThucTe || ''}
                      onChange={(e) => handleInventoryThucTeChange(parseNumberInputStr(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      placeholder="Nhập thực tế"
                    />
                  </div>
                </div>
              </div>

              {/* Tổng Thành phẩm cần sx thêm */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Tổng Thành phẩm cần sx thêm</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[11px] text-blue-600 mb-0.5">Kế hoạch</span>
                    <input
                      type="number"
                      step="0.01"
                      value={currentTab.formData.tongThanhPhamCanSxThem}
                      disabled
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-100 text-blue-600 font-medium"
                      placeholder="Tự động tính"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-green-600 mb-0.5">Thực tế</span>
                    <input
                      type="number"
                      step="0.01"
                      value={currentTab.formData.tongThanhPhamCanSxThemThucTe || ''}
                      disabled
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-100 text-green-600 font-medium"
                      placeholder="Tự động tính"
                    />
                  </div>
                </div>
              </div>

              {/* Tổng nguyên liệu cần sản xuất */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Tổng nguyên liệu cần sản xuất</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[11px] text-blue-600 mb-0.5">Kế hoạch</span>
                    <input
                      type="number"
                      step="0.01"
                      value={currentTab.formData.tongNguyenLieuCanSanXuat}
                      disabled
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-100 text-blue-600 font-medium"
                      placeholder="Tự động tính"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] text-green-600 mb-0.5">Thực tế</span>
                    <input
                      type="number"
                      step="0.01"
                      value={currentTab.formData.tongNguyenLieuCanSanXuatThucTe || ''}
                      onChange={(e) => updateFormData('tongNguyenLieuCanSanXuatThucTe', parseNumberInputStr(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                      placeholder="Nhập thực tế"
                    />
                  </div>
                </div>
              </div>

              {/* Nguyên liệu tồn kho + Nguyên liệu cần nhập thêm - gộp 1 hàng */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Nguyên liệu tồn kho</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentTab.formData.nguyenLieuTonKho}
                    onChange={(e) => handleMaterialInventoryChange(parseNumberInputStr(e.target.value))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập NL tồn kho"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Nguyên liệu cần nhập thêm</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentTab.formData.nguyenLieuCanNhapThem}
                    disabled
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-100 text-blue-600 font-medium"
                    placeholder="Tự động tính"
                  />
                </div>
              </div>
            </div> {/* End Right Column */}
          </div> {/* End grid 2 columns */}

          {/* Các trường mới - Thời gian và Chi phí */}
          <div className="mt-4 space-y-3">
            {/* Hàng 1: Các trường thời gian */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Ngày bắt đầu sản xuất */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Ngày bắt đầu sản xuất</label>
                <input
                  type="date"
                  value={currentTab.formData.ngayBatDauSanXuat}
                  onChange={(e) => {
                    setTabsData(prev => {
                      const newTabs = [...prev];
                      newTabs[activeTab].formData.ngayBatDauSanXuat = e.target.value;
                      return newTabs;
                    });
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Số ngày hoàn thành (kế hoạch) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Số ngày hoàn thành (kế hoạch)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentTab.formData.thoiGianChoPhepToiDa}
                  onChange={(e) => {
                    setTabsData(prev => {
                      const newTabs = [...prev];
                      newTabs[activeTab].formData.thoiGianChoPhepToiDa = parseNumberInputStr(e.target.value);

                      // Recalculate planned production cost using updated days and existing flowchart
                      try {
                        let chiPhiSanXuatPerDay = 0;
                        const proc = newTabs[activeTab].selectedProcess;
                        if (proc?.flowchart?.sections) {
                          chiPhiSanXuatPerDay = proc.flowchart.sections.reduce((sum: number, section: any) => {
                            return sum + (section.costs || []).reduce((costSum: number, cost: any) => {
                              const gia = cost.giaKeHoach || 0;
                              const soLuong = cost.soLuongKeHoach || 0;
                              return costSum + (gia * soLuong);
                            }, 0);
                          }, 0);
                        }
                        const maxDays = parseFloat(newTabs[activeTab].formData.thoiGianChoPhepToiDa) || 1;
                        newTabs[activeTab].formData.chiPhiSanXuatKeHoach = (chiPhiSanXuatPerDay * maxDays).toString();
                      } catch (e) {
                        // ignore
                      }

                      return newTabs;
                    });
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập số ngày"
                />
              </div>

              {/* Số ngày hoàn thành (thực tế) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">Số ngày hoàn thành (thực tế)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Nhập số ngày"
                  value={currentTab.formData.ngayHoanThanhThucTe}
                  onChange={(e) => {
                    setTabsData(prev => {
                      const newTabs = [...prev];
                      newTabs[activeTab].formData.ngayHoanThanhThucTe = parseNumberInputStr(e.target.value);
                      return newTabs;
                    });
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Hàng 2: Các trường chi phí */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Chi phí sản xuất */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 text-center bg-gray-100 py-1.5 rounded-t">
                  Chi phí sản xuất
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">kế hoạch</label>
                    <input
                      type="text"
                      value={(() => {
                        if (!currentTab.selectedProcess?.flowchart?.sections) return '0';
                        const total = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                          return sum + section.costs.reduce((costSum, cost) => {
                            const gia = cost.giaKeHoach || 0;
                            const soLuong = cost.soLuongKeHoach || 0;
                            return costSum + (gia * soLuong);
                          }, 0);
                        }, 0);
                        const days = parseFloat(currentTab.formData.thoiGianChoPhepToiDa) || 1;
                        return (total * days).toLocaleString('vi-VN');
                      })()}
                      disabled
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 text-sm font-medium text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">thực tế</label>
                    <input
                      type="text"
                      value={(() => {
                        if (!currentTab.selectedProcess?.flowchart?.sections) return '0';
                        const total = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                          return sum + section.costs.reduce((costSum, cost) => {
                            const gia = cost.giaThucTe || 0;
                            const soLuong = cost.soLuongThucTe || 0;
                            return costSum + (gia * soLuong);
                          }, 0);
                        }, 0);
                        // Nhân với số ngày hoàn thành thực tế (tương tự kế hoạch)
                        const days = parseFloat(currentTab.formData.ngayHoanThanhThucTe) || 1;
                        return (total * days).toLocaleString('vi-VN');
                      })()}
                      disabled
                      className="w-full px-1.5 py-1 border border-gray-300 rounded bg-blue-50 text-xs font-medium text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Chi phí chung */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700 text-center bg-gray-100 py-1.5 rounded-t">
                  Chi phí chung
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">kế hoạch</label>
                    <input
                      type="text"
                      value={(() => {
                        // Tính chi phí chung kế hoạch từ TẤT CẢ các bảng chi phí chung mà sản phẩm này được chọn
                        const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
                        const currentProductId = `tab-${activeTab}`;

                        console.log('🧮 [Calc Chi phí chung KH] currentProductId:', currentProductId);
                        console.log('🧮 [Calc Chi phí chung KH] generalCostGroups:', JSON.stringify(generalCostGroups, null, 2));

                        let chiPhiChung = 0;
                        // Duyệt qua từng bảng chi phí chung
                        generalCostGroups.forEach((group, groupIndex) => {
                          const groupTotalKeHoach = group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);

                          console.log(`🧮 [Group ${groupIndex}] id: ${group.id}, selectedProducts:`, group.selectedProducts, 'length:', group.selectedProducts.length);

                          // Kiểm tra xem sản phẩm hiện tại có được chọn cho bảng này không
                          // CHỈ khi selectedProducts có phần tử mới kiểm tra, nếu rỗng thì KHÔNG áp dụng cho sản phẩm nào
                          const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId);
                          console.log(`🧮 [Group ${groupIndex}] isProductSelected for ${currentProductId}:`, isProductSelected);
                          if (!isProductSelected) return;

                          // Lọc các sản phẩm chính được chọn cho bảng này
                          const selectedMainItems = items.filter((_: any, index: number) => {
                            const pid = `tab-${index}`;
                            return group.selectedProducts.includes(pid);
                          });

                          // Lọc các chi phí bổ sung được chọn cho bảng này
                          const selectedAdditionalItems = additionalCostTabs.filter(tab => {
                            const pid = `additional-${tab.id}`;
                            return group.selectedProducts.includes(pid);
                          });

                          // Tính tổng khối lượng của các sản phẩm được chọn cho bảng này
                          const totalKhoiLuongMain = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);
                          const totalKhoiLuongAdditional = selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0);
                          const totalKhoiLuong = totalKhoiLuongMain + totalKhoiLuongAdditional;
                          const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length;

                          if (totalKhoiLuong === 0) return;

                          // Nếu chỉ có 1 sản phẩm được chọn → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo khối lượng
                          if (totalSelectedCount === 1) {
                            chiPhiChung += groupTotalKeHoach;
                          } else {
                            chiPhiChung += (groupTotalKeHoach * currentKhoiLuong) / totalKhoiLuong;
                          }
                        });

                        return chiPhiChung.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                      })()}
                      disabled
                      className="w-full px-1.5 py-1 border border-gray-300 rounded bg-blue-50 text-xs font-medium text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-0.5">thực tế</label>
                    <input
                      type="text"
                      value={(() => {
                        // Tính chi phí chung thực tế từ TẤT CẢ các bảng chi phí chung mà sản phẩm này được chọn
                        const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
                        const currentProductId = `tab-${activeTab}`;

                        let chiPhiChung = 0;
                        // Duyệt qua từng bảng chi phí chung
                        generalCostGroups.forEach(group => {
                          const groupTotalThucTe = group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);

                          // Kiểm tra xem sản phẩm hiện tại có được chọn cho bảng này không
                          // CHỈ khi selectedProducts có phần tử mới kiểm tra
                          const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId);
                          if (!isProductSelected) return;

                          // Lọc các sản phẩm chính được chọn cho bảng này
                          const selectedMainItems = items.filter((_: any, index: number) => {
                            const pid = `tab-${index}`;
                            return group.selectedProducts.includes(pid);
                          });

                          // Lọc các chi phí bổ sung được chọn cho bảng này
                          const selectedAdditionalItems = additionalCostTabs.filter(tab => {
                            const pid = `additional-${tab.id}`;
                            return group.selectedProducts.includes(pid);
                          });

                          // Tính tổng khối lượng của các sản phẩm được chọn cho bảng này
                          const totalKhoiLuongMain = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);
                          const totalKhoiLuongAdditional = selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0);
                          const totalKhoiLuong = totalKhoiLuongMain + totalKhoiLuongAdditional;
                          const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length;

                          if (totalKhoiLuong === 0) return;

                          // Nếu chỉ có 1 sản phẩm được chọn → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo khối lượng
                          if (totalSelectedCount === 1) {
                            chiPhiChung += groupTotalThucTe;
                          } else {
                            chiPhiChung += (groupTotalThucTe * currentKhoiLuong) / totalKhoiLuong;
                          }
                        });

                        return chiPhiChung.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                      })()}
                      disabled
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 text-sm font-medium text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Chi phí xuất khẩu */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-center bg-gray-100 py-2 rounded-t-md">
                  Chi phí xuất khẩu
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">kế hoạch</label>
                    <input
                      type="text"
                      value={(() => {
                        // Tính tổng chi phí xuất khẩu kế hoạch từ tab "Báo giá đơn hàng"
                        const totalExportCostKeHoach = selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);

                        // Lấy "Tổng Thành phẩm cần sx thêm" của sản phẩm hiện tại
                        const currentTongThanhPham = parseFloat(currentTab.formData.tongThanhPhamCanSxThem || '0');

                        // Tính tổng "Tổng Thành phẩm cần sx thêm" tất cả sản phẩm (cả chính và bổ sung)
                        const totalTongThanhPhamMain = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                        const totalTongThanhPhamAdditional = additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                        const totalTongThanhPham = totalTongThanhPhamMain + totalTongThanhPhamAdditional;
                        const totalProductCount = items.length + additionalCostTabs.length;

                        // Tính chi phí xuất khẩu cho sản phẩm hiện tại
                        // Nếu chỉ có 1 sản phẩm → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo "Tổng Thành phẩm cần sx thêm", fallback theo khối lượng
                        const currentKhoiLuongExport = parseFloat(currentItem?.soLuong?.toString() || '0');
                        const chiPhiXuatKhau = totalProductCount === 1
                          ? totalExportCostKeHoach
                          : totalTongThanhPham > 0
                            ? (totalExportCostKeHoach * currentTongThanhPham) / totalTongThanhPham
                            : (() => {
                                const totalKhoiLuongAll = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
                                  additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0);
                                return totalKhoiLuongAll > 0 ? (totalExportCostKeHoach * currentKhoiLuongExport) / totalKhoiLuongAll : 0;
                              })();

                        return chiPhiXuatKhau.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                      })()}
                      disabled
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 text-sm font-medium text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">thực tế</label>
                    <input
                      type="text"
                      value={(() => {
                        // Tính tổng chi phí xuất khẩu thực tế từ tab "Báo giá đơn hàng"
                        const totalExportCostThucTe = selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);

                        // Lấy "Tổng Thành phẩm cần sx thêm" của sản phẩm hiện tại
                        const currentTongThanhPham = parseFloat(currentTab.formData.tongThanhPhamCanSxThem || '0');

                        // Tính tổng "Tổng Thành phẩm cần sx thêm" tất cả sản phẩm (cả chính và bổ sung)
                        const totalTongThanhPhamMain = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                        const totalTongThanhPhamAdditional = additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                        const totalTongThanhPham = totalTongThanhPhamMain + totalTongThanhPhamAdditional;
                        const totalProductCount = items.length + additionalCostTabs.length;

                        // Tính chi phí xuất khẩu cho sản phẩm hiện tại
                        // Nếu chỉ có 1 sản phẩm → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo "Tổng Thành phẩm cần sx thêm", fallback theo khối lượng
                        const currentKhoiLuongExport = parseFloat(currentItem?.soLuong?.toString() || '0');
                        const chiPhiXuatKhau = totalProductCount === 1
                          ? totalExportCostThucTe
                          : totalTongThanhPham > 0
                            ? (totalExportCostThucTe * currentTongThanhPham) / totalTongThanhPham
                            : (() => {
                                const totalKhoiLuongAll = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
                                  additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0);
                                return totalKhoiLuongAll > 0 ? (totalExportCostThucTe * currentKhoiLuongExport) / totalKhoiLuongAll : 0;
                              })();

                        return chiPhiXuatKhau.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                      })()}
                      disabled
                      className="w-full px-2 py-1 border border-gray-300 rounded bg-blue-50 text-sm font-medium text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Tổng chi phí */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 text-center bg-green-100 py-2 rounded-t-md">
                  Tổng chi phí
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">kế hoạch</label>
                    <input
                      type="text"
                      value={(() => {
                        // 1. Chi phí sản xuất kế hoạch (per-day * allowed days)
                        let chiPhiSanXuat = 0;
                        if (currentTab.selectedProcess?.flowchart?.sections) {
                          const perDay = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                            return sum + section.costs.reduce((costSum, cost) => {
                              const gia = cost.giaKeHoach || 0;
                              const soLuong = cost.soLuongKeHoach || 0;
                              return costSum + (gia * soLuong);
                            }, 0);
                          }, 0);
                          const maxDays = parseFloat(currentTab.formData.thoiGianChoPhepToiDa) || 1;
                          chiPhiSanXuat = perDay * maxDays;
                        }

                        // 2. Chi phí chung kế hoạch - tính từ TẤT CẢ các bảng chi phí chung mà sản phẩm này được chọn
                        const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
                        const currentProductId = `tab-${activeTab}`;

                        let chiPhiChung = 0;
                        generalCostGroups.forEach(group => {
                          const groupTotalKeHoach = group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);

                          // Kiểm tra xem sản phẩm hiện tại có được chọn cho bảng này không
                          // CHỈ khi selectedProducts có phần tử mới kiểm tra
                          const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId);
                          if (!isProductSelected) return;

                          // Lọc các sản phẩm chính được chọn cho bảng này
                          const selectedMainItems = items.filter((_: any, index: number) => {
                            const pid = `tab-${index}`;
                            return group.selectedProducts.includes(pid);
                          });

                          // Lọc các chi phí bổ sung được chọn cho bảng này
                          const selectedAdditionalItems = additionalCostTabs.filter(tab => {
                            const pid = `additional-${tab.id}`;
                            return group.selectedProducts.includes(pid);
                          });

                          // Tính tổng khối lượng của các sản phẩm được chọn cho bảng này
                          const totalKhoiLuongMain = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);
                          const totalKhoiLuongAdditional = selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0);
                          const totalKhoiLuong = totalKhoiLuongMain + totalKhoiLuongAdditional;
                          const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length;

                          if (totalKhoiLuong === 0) return;

                          // Nếu chỉ có 1 sản phẩm được chọn → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo khối lượng
                          if (totalSelectedCount === 1) {
                            chiPhiChung += groupTotalKeHoach;
                          } else {
                            chiPhiChung += (groupTotalKeHoach * currentKhoiLuong) / totalKhoiLuong;
                          }
                        });

                        // 3. Chi phí xuất khẩu kế hoạch (bao gồm cả sản phẩm chính và bổ sung)
                        const totalExportCostKeHoach = selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
                        const currentTongThanhPhamExport = parseFloat(currentTab.formData.tongThanhPhamCanSxThem || '0');
                        const totalTongThanhPhamMainExport = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                        const totalTongThanhPhamAdditionalExport = additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                        const totalTongThanhPhamExport = totalTongThanhPhamMainExport + totalTongThanhPhamAdditionalExport;
                        const totalProductCountExport = items.length + additionalCostTabs.length;
                        const chiPhiXuatKhau = totalProductCountExport === 1
                          ? totalExportCostKeHoach
                          : totalTongThanhPhamExport > 0
                            ? (totalExportCostKeHoach * currentTongThanhPhamExport) / totalTongThanhPhamExport
                            : (() => {
                                const curKL = parseFloat(currentItem?.soLuong?.toString() || '0');
                                const totalKL = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
                                  additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0);
                                return totalKL > 0 ? (totalExportCostKeHoach * curKL) / totalKL : 0;
                              })();

                        // Tổng
                        const tongChiPhi = chiPhiSanXuat + chiPhiChung + chiPhiXuatKhau;
                        return tongChiPhi.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                      })()}
                      disabled
                      className="w-full px-2 py-1 border border-green-400 rounded bg-green-50 text-sm font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">thực tế</label>
                    <input
                      type="text"
                      value={(() => {
                        // 1. Chi phí sản xuất thực tế (per-day * số ngày hoàn thành thực tế)
                        let chiPhiSanXuat = 0;
                        if (currentTab.selectedProcess?.flowchart?.sections) {
                          const perDay = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                            return sum + section.costs.reduce((costSum, cost) => {
                              const gia = cost.giaThucTe || 0;
                              const soLuong = cost.soLuongThucTe || 0;
                              return costSum + (gia * soLuong);
                            }, 0);
                          }, 0);
                          // Nhân với số ngày hoàn thành thực tế (tương tự kế hoạch)
                          const actualDays = parseFloat(currentTab.formData.ngayHoanThanhThucTe) || 1;
                          chiPhiSanXuat = perDay * actualDays;
                        }

                        // 2. Chi phí chung thực tế - tính từ TẤT CẢ các bảng chi phí chung mà sản phẩm này được chọn
                        const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
                        const currentProductId = `tab-${activeTab}`;

                        let chiPhiChung = 0;
                        generalCostGroups.forEach(group => {
                          const groupTotalThucTe = group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);

                          // Kiểm tra xem sản phẩm hiện tại có được chọn cho bảng này không
                          // CHỈ khi selectedProducts có phần tử mới kiểm tra
                          const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId);
                          if (!isProductSelected) return;

                          // Lọc các sản phẩm chính được chọn cho bảng này
                          const selectedMainItems = items.filter((_: any, index: number) => {
                            const pid = `tab-${index}`;
                            return group.selectedProducts.includes(pid);
                          });

                          // Lọc các chi phí bổ sung được chọn cho bảng này
                          const selectedAdditionalItems = additionalCostTabs.filter(tab => {
                            const pid = `additional-${tab.id}`;
                            return group.selectedProducts.includes(pid);
                          });

                          // Tính tổng khối lượng của các sản phẩm được chọn cho bảng này
                          const totalKhoiLuongMain = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);
                          const totalKhoiLuongAdditional = selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0);
                          const totalKhoiLuong = totalKhoiLuongMain + totalKhoiLuongAdditional;
                          const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length;

                          if (totalKhoiLuong === 0) return;

                          // Nếu chỉ có 1 sản phẩm được chọn → dùng TOÀN BỘ chi phí, nếu 2+ sản phẩm → phân bổ theo khối lượng
                          if (totalSelectedCount === 1) {
                            chiPhiChung += groupTotalThucTe;
                          } else {
                            chiPhiChung += (groupTotalThucTe * currentKhoiLuong) / totalKhoiLuong;
                          }
                        });

                        // 3. Chi phí xuất khẩu thực tế (bao gồm cả sản phẩm chính và bổ sung)
                        const totalExportCostThucTe = selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);
                        const currentTongThanhPhamExport = parseFloat(currentTab.formData.tongThanhPhamCanSxThem || '0');
                        const totalTongThanhPhamMainExport = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                        const totalTongThanhPhamAdditionalExport = additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0);
                        const totalTongThanhPhamExport = totalTongThanhPhamMainExport + totalTongThanhPhamAdditionalExport;
                        const totalProductCountExport = items.length + additionalCostTabs.length;
                        const chiPhiXuatKhau = totalProductCountExport === 1
                          ? totalExportCostThucTe
                          : totalTongThanhPhamExport > 0
                            ? (totalExportCostThucTe * currentTongThanhPhamExport) / totalTongThanhPhamExport
                            : (() => {
                                const curKL = parseFloat(currentItem?.soLuong?.toString() || '0');
                                const totalKL = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
                                  additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0);
                                return totalKL > 0 ? (totalExportCostThucTe * curKL) / totalKL : 0;
                              })();

                        // Tổng
                        const tongChiPhi = chiPhiSanXuat + chiPhiChung + chiPhiXuatKhau;
                        return tongChiPhi.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                      })()}
                      disabled
                      className="w-full px-2 py-1 border border-green-400 rounded bg-green-50 text-sm font-bold text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Danh sách sản phẩm trong định mức - Table Layout */}
          {currentTab && currentTab.selectedStandard && currentTab.selectedStandard.items && currentTab.selectedStandard.items.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">
                Thành phẩm đầu ra
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    {/* Main header row - Product names */}
                    <tr>
                      <th rowSpan={2} className="px-4 py-2 bg-gray-200 border border-gray-300 text-left text-sm font-medium text-gray-700">
                        Thành phẩm đầu ra
                      </th>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        return (
                          <th
                            key={index}
                            colSpan={2}
                            className={`px-4 py-2 border border-gray-300 text-center text-sm font-medium ${
                              isSelected ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {item.tenThanhPham}
                          </th>
                        );
                      })}
                    </tr>
                    {/* Sub-header row - Kế hoạch / Thực tế */}
                    <tr>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        return (
                          <React.Fragment key={index}>
                            <th className={`px-3 py-1 border border-gray-300 text-center text-xs font-medium ${
                              isSelected ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              Kế hoạch
                            </th>
                            <th className={`px-3 py-1 border border-gray-300 text-center text-xs font-medium ${
                              isSelected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              Thực tế
                            </th>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Tỉ lệ thu hồi */}
                    <tr>
                      <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">
                        tỉ lệ thu hồi (%)
                      </td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        // Lấy tỉ lệ thu hồi thực tế của sản phẩm này (kiểm tra an toàn nếu là object)
                        const tiLeThuHoiThucTeObj = typeof currentTab.formData.tiLeThuHoiThucTe === 'object' && currentTab.formData.tiLeThuHoiThucTe !== null
                          ? currentTab.formData.tiLeThuHoiThucTe
                          : {};
                        const tiLeThucTe = tiLeThuHoiThucTeObj[item.tenThanhPham] || '';
                        return (
                          <React.Fragment key={index}>
                            {/* Kế hoạch */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-blue-50' : 'bg-gray-50'
                            }`}>
                              <span className="font-medium">{item.tiLe} %</span>
                            </td>
                            {/* Thực tế - input riêng cho từng sản phẩm */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-green-50' : 'bg-gray-50'
                            }`}>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tiLeThucTe}
                                onChange={(e) => {
                                  setTabsData(prev => {
                                    const newTabs = [...prev];
                                    const currentTiLe = typeof newTabs[activeTab].formData.tiLeThuHoiThucTe === 'object' && newTabs[activeTab].formData.tiLeThuHoiThucTe !== null
                                      ? newTabs[activeTab].formData.tiLeThuHoiThucTe
                                      : {};
                                    newTabs[activeTab].formData.tiLeThuHoiThucTe = {
                                      ...currentTiLe,
                                      [item.tenThanhPham]: parseNumberInputStr(e.target.value)
                                    };
                                    return newTabs;
                                  });
                                }}
                                className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 bg-white text-sm"
                                placeholder={item.tiLe.toString()}
                              />
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>

                    {/* Số kg thành phẩm */}
                    <tr>
                      <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">
                        số kg thành phẩm
                      </td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        // Lấy tỉ lệ thu hồi K3 (tỉ lệ thu hồi thành phẩm) - Kế hoạch
                        const tiLeThuHoiK3 = parseFloat(currentTab.formData.tiLeThuHoi) || 0;
                        // Kế hoạch: Số kg = Tổng nguyên liệu KH × tỉ lệ thu hồi K3 / 100 × tỉ lệ sản phẩm / 100
                        const soKgKeHoach = currentTab.formData.tongNguyenLieuCanSanXuat && tiLeThuHoiK3
                          ? (parseFloat(currentTab.formData.tongNguyenLieuCanSanXuat) * tiLeThuHoiK3 / 100 * item.tiLe / 100).toFixed(3)
                          : '0';

                        // Thực tế: dùng tiLeThuHoiThucTe của từng sản phẩm nếu có (kiểm tra an toàn)
                        const tiLeThuHoiThucTeObj = typeof currentTab.formData.tiLeThuHoiThucTe === 'object' && currentTab.formData.tiLeThuHoiThucTe !== null
                          ? currentTab.formData.tiLeThuHoiThucTe
                          : {};
                        const tiLeThucTe = tiLeThuHoiThucTeObj[item.tenThanhPham];
                        // Lấy Tổng nguyên liệu cần sản xuất Thực tế
                        const tongNguyenLieuThucTe = parseFloat(currentTab.formData.tongNguyenLieuCanSanXuatThucTe || '0');
                        // Tính Tỉ lệ thu hồi K3 Thực tế = Tổng khối lượng thành phẩm đầu ra Thực tế / Tổng nguyên liệu Thực tế * 100
                        const tongKhoiLuongThanhPhamThucTe = parseFloat(currentTab.formData.tongKhoiLuongThanhPhamThucTe || '0');
                        const tiLeThuHoiK3ThucTe = tongNguyenLieuThucTe > 0 ? (tongKhoiLuongThanhPhamThucTe / tongNguyenLieuThucTe * 100) : 0;
                        // Thực tế: Số kg = Tổng nguyên liệu Thực tế × tỉ lệ thu hồi K3 Thực tế / 100 × tỉ lệ thu hồi thực tế sản phẩm / 100
                        const soKgThucTe = tongNguyenLieuThucTe && tiLeThuHoiK3ThucTe && tiLeThucTe
                          ? (tongNguyenLieuThucTe * tiLeThuHoiK3ThucTe / 100 * parseFloat(tiLeThucTe) / 100).toFixed(3)
                          : '';
                        return (
                          <React.Fragment key={index}>
                            {/* Kế hoạch */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-blue-50' : 'bg-gray-50'
                            }`}>
                              <span className="font-medium text-blue-600">{soKgKeHoach} kg</span>
                            </td>
                            {/* Thực tế */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-green-50' : 'bg-gray-50'
                            }`}>
                              <span className="font-medium text-green-600">{soKgThucTe ? `${soKgThucTe} kg` : '-'}</span>
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>

                    {/* Giá hòa vốn (VNĐ/KG) */}
                    <tr>
                      <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">
                        giá hòa vốn (VNĐ/KG)
                      </td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;

                        // Tính giá hòa vốn KẾ HOẠCH cho sản phẩm đầu ra chính (auto-calculated)
                        const giaHoaVonKeHoach = isSelected
                          ? formatNumberWithDots(calculateGiaHoaVonChinhPham(activeTab))
                          : formatNumberWithDots(currentTab.formData.giaHoaVonSanPhamPhu[item.tenThanhPham]);

                        // Tính giá hòa vốn THỰC TẾ cho sản phẩm đầu ra chính (auto-calculated)
                        const giaHoaVonThucTe = isSelected
                          ? formatNumberWithDots(calculateGiaHoaVonChinhPhamThucTe(activeTab))
                          : formatNumberWithDots(currentTab.formData.giaHoaVonSanPhamPhuThucTe?.[item.tenThanhPham]);

                        return (
                          <React.Fragment key={index}>
                            {/* Kế hoạch */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-blue-50' : 'bg-gray-50'
                            }`}>
                              <input
                                type="text"
                                value={giaHoaVonKeHoach}
                                onChange={(e) => {
                                  if (!isSelected) {
                                    setTabsData(prev => {
                                      const newTabs = [...prev];
                                      newTabs[activeTab].formData.giaHoaVonSanPhamPhu = {
                                        ...newTabs[activeTab].formData.giaHoaVonSanPhamPhu,
                                        [item.tenThanhPham]: String(parseNumberFromDots(e.target.value)),
                                      };
                                      return newTabs;
                                    });
                                  }
                                }}
                                disabled={isSelected}
                                className={`w-full px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 text-sm ${
                                  isSelected ? 'bg-yellow-50 border-yellow-400 font-bold' : 'bg-white border-gray-300'
                                }`}
                                placeholder="0"
                              />
                            </td>
                            {/* Thực tế */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-green-50' : 'bg-gray-50'
                            }`}>
                              {isSelected ? (
                                <input
                                  type="text"
                                  value={giaHoaVonThucTe}
                                  disabled
                                  className="w-full px-2 py-1 text-center border border-green-400 rounded bg-green-50 font-bold text-sm"
                                  placeholder="0"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={formatNumberWithDots(currentTab.formData.giaHoaVonSanPhamPhuThucTe?.[item.tenThanhPham])}
                                  onChange={(e) => {
                                    setTabsData(prev => {
                                      const newTabs = [...prev];
                                      newTabs[activeTab].formData.giaHoaVonSanPhamPhuThucTe = {
                                        ...newTabs[activeTab].formData.giaHoaVonSanPhamPhuThucTe,
                                        [item.tenThanhPham]: String(parseNumberFromDots(e.target.value)),
                                      };
                                      return newTabs;
                                    });
                                  }}
                                  className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 bg-white text-sm"
                                  placeholder="0"
                                />
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>

                    {/* Lợi nhuận cộng thêm (VNĐ/KG) */}
                    <tr>
                      <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm text-gray-700">
                        lợi nhuận cộng thêm (VNĐ/KG)
                      </td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        return (
                          <React.Fragment key={index}>
                            {/* Kế hoạch */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-blue-50' : 'bg-gray-50'
                            }`}>
                              {isSelected ? (
                                <input
                                  type="text"
                                  value={formatNumberWithDots(currentTab.formData.loiNhuanCongThem)}
                                  onChange={(e) => {
                                    setTabsData(prev => {
                                      const newTabs = [...prev];
                                      newTabs[activeTab].formData.loiNhuanCongThem = String(parseNumberFromDots(e.target.value));
                                      return newTabs;
                                    });
                                  }}
                                  className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                                  placeholder="0"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            {/* Thực tế */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-green-50' : 'bg-gray-50'
                            }`}>
                              {isSelected ? (
                                <input
                                  type="text"
                                  value={formatNumberWithDots(currentTab.formData.loiNhuanCongThemThucTe)}
                                  onChange={(e) => {
                                    setTabsData(prev => {
                                      const newTabs = [...prev];
                                      newTabs[activeTab].formData.loiNhuanCongThemThucTe = String(parseNumberFromDots(e.target.value));
                                      return newTabs;
                                    });
                                  }}
                                  className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 bg-white text-sm"
                                  placeholder="0"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>

                    {/* Giá báo khách */}
                    <tr>
                      <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm font-medium text-gray-700">
                        giá báo khách (VNĐ/KG)
                      </td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;

                        // Tính giá báo khách KẾ HOẠCH = Giá hòa vốn + Lợi nhuận cộng thêm
                        const giaBaoKhachKeHoach = isSelected
                          ? (() => {
                              const giaHoaVon = calculateGiaHoaVonChinhPham(activeTab);
                              const loiNhuan = parseFloat(currentTab.formData.loiNhuanCongThem || '0');
                              return formatNumberWithDots(giaHoaVon + loiNhuan);
                            })()
                          : '';

                        // Tính giá báo khách THỰC TẾ = Giá hòa vốn thực tế + Lợi nhuận cộng thêm thực tế
                        const giaBaoKhachThucTe = isSelected
                          ? (() => {
                              const giaHoaVon = calculateGiaHoaVonChinhPhamThucTe(activeTab);
                              const loiNhuan = parseFloat(currentTab.formData.loiNhuanCongThemThucTe || '0');
                              return formatNumberWithDots(giaHoaVon + loiNhuan);
                            })()
                          : '';

                        return (
                          <React.Fragment key={index}>
                            {/* Kế hoạch */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-blue-50' : 'bg-gray-50'
                            }`}>
                              {isSelected ? (
                                <input
                                  type="text"
                                  value={giaBaoKhachKeHoach}
                                  disabled
                                  className="w-full px-2 py-1 text-center border border-blue-400 rounded bg-yellow-50 font-bold text-sm"
                                  placeholder="0"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            {/* Thực tế */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-green-50' : 'bg-gray-50'
                            }`}>
                              {isSelected ? (
                                <input
                                  type="text"
                                  value={giaBaoKhachThucTe}
                                  disabled
                                  className="w-full px-2 py-1 text-center border border-green-400 rounded bg-green-50 font-bold text-sm"
                                  placeholder="0"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>

                    {/* Giá báo khách USD/KG */}
                    <tr>
                      <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm font-medium text-gray-700">
                        <div className="flex flex-col">
                          <span>giá báo khách (USD/KG)</span>
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-500 mr-1">Tỉ giá:</span>
                            <input
                              type="text"
                              value={currentTab.formData.tiGiaUSD}
                              onChange={(e) => {
                                const rawValue = handleNumericInput(e.target.value);
                                setTabsData(prev => {
                                  const newTabs = [...prev];
                                  newTabs[activeTab].formData.tiGiaUSD = rawValue;
                                  return newTabs;
                                });
                              }}
                              onBlur={(e) => {
                                const numValue = parseNumberFromDots(e.target.value);
                                if (numValue > 0) {
                                  setTabsData(prev => {
                                    const newTabs = [...prev];
                                    newTabs[activeTab].formData.tiGiaUSD = formatNumberWithDots(numValue);
                                    return newTabs;
                                  });
                                }
                              }}
                              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500"
                              placeholder="VD: 25000"
                            />
                          </div>
                        </div>
                      </td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        const tiGiaUSD = parseNumberFromDots(currentTab.formData.tiGiaUSD || '0');

                        // Tính giá báo khách USD/KG KẾ HOẠCH = Giá báo khách VNĐ / Tỉ giá
                        const giaBaoKhachKeHoachVND = isSelected
                          ? calculateGiaHoaVonChinhPham(activeTab) + parseFloat(currentTab.formData.loiNhuanCongThem || '0')
                          : 0;
                        const giaBaoKhachUSDKeHoach = isSelected && tiGiaUSD > 0
                          ? formatNumberWithDots(giaBaoKhachKeHoachVND / tiGiaUSD)
                          : '';

                        // Tính giá báo khách USD/KG THỰC TẾ = Giá báo khách VNĐ thực tế / Tỉ giá
                        const giaBaoKhachThucTeVND = isSelected
                          ? calculateGiaHoaVonChinhPhamThucTe(activeTab) + parseFloat(currentTab.formData.loiNhuanCongThemThucTe || '0')
                          : 0;
                        const giaBaoKhachUSDThucTe = isSelected && tiGiaUSD > 0
                          ? formatNumberWithDots(giaBaoKhachThucTeVND / tiGiaUSD)
                          : '';

                        return (
                          <React.Fragment key={index}>
                            {/* Kế hoạch */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-blue-50' : 'bg-gray-50'
                            }`}>
                              {isSelected ? (
                                <input
                                  type="text"
                                  value={giaBaoKhachUSDKeHoach}
                                  disabled
                                  className="w-full px-2 py-1 text-center border border-blue-400 rounded bg-yellow-50 font-bold text-sm"
                                  placeholder="0"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            {/* Thực tế */}
                            <td className={`px-3 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-green-50' : 'bg-gray-50'
                            }`}>
                              {isSelected ? (
                                <input
                                  type="text"
                                  value={giaBaoKhachUSDThucTe}
                                  disabled
                                  className="w-full px-2 py-1 text-center border border-green-400 rounded bg-green-50 font-bold text-sm"
                                  placeholder="0"
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ghi chú */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú
            </label>
            <textarea
              value={currentTab.formData.ghiChu}
              onChange={(e) => updateFormData('ghiChu', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập ghi chú (nếu có)"
            />
          </div>

          {/* Chọn quy trình sản xuất */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chọn quy trình sản xuất
            </label>
            <select
              value={currentTab.selectedProcess?.id || ''}
              onChange={(e) => handleProcessChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chọn quy trình --</option>
              {productionProcesses.map((process) => (
                <option key={process.id} value={process.id}>
                  {process.maQuyTrinhSanXuat} - {process.tenQuyTrinhSanXuat || process.tenQuyTrinh}
                </option>
              ))}
            </select>
          </div>

          {/* Bảng lưu đồ quy trình */}
          {(() => {
            console.log('🔍 Render check - currentTab:', currentTab);
            console.log('🔍 Render check - selectedProcess:', currentTab?.selectedProcess);
            console.log('🔍 Render check - flowchart:', currentTab?.selectedProcess?.flowchart);
            return null;
          })()}
          {currentTab && currentTab.selectedProcess && currentTab.selectedProcess.flowchart && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">
                Lưu đồ quy trình
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    {/* Main header row */}
                    <tr className="bg-blue-100">
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>STT</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>PHÂN ĐOẠN</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>NỘI DUNG CÔNG VIỆC</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>LOẠI CHI PHÍ</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>TÊN CHI PHÍ</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐVT</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐỊNH MỨC LAO ĐỘNG</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐƠN VỊ</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>SỐ LƯỢNG NGUYÊN LIỆU CẦN HOÀN THÀNH (Kg)</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>SỐ PHÚT CẦN THỰC HIỆN XONG</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ CẦN DÙNG</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>KẾ HOẠCH</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>THỰC TẾ</th>
                    </tr>
                    {/* Sub-header row */}
                    <tr className="bg-blue-50">
                      <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">KẾ HOẠCH</th>
                      <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">THỰC TẾ</th>
                      <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">GIÁ (VNĐ)</th>
                      <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">THÀNH TIỀN (VNĐ)</th>
                      <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">GIÁ (VNĐ)</th>
                      <th className="border border-gray-400 px-3 py-2 text-center text-xs font-bold">THÀNH TIỀN (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTab.selectedProcess.flowchart.sections.map((section, sectionIndex) => {
                      const sectionRowSpan = section.costs.length;
                      return section.costs.map((cost, costIndex) => (
                        <tr key={`${sectionIndex}-${costIndex}`} className={costIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {costIndex === 0 && (
                            <>
                              <td className="border border-gray-400 px-3 py-2 text-center font-medium" rowSpan={sectionRowSpan}>
                                {sectionIndex + 1}
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center" rowSpan={sectionRowSpan}>
                                {section.phanDoan}
                              </td>
                              <td className="border border-gray-400 px-3 py-2" rowSpan={sectionRowSpan}>
                                {section.noiDungCongViec}
                              </td>
                            </>
                          )}
                          <td className="border border-gray-400 px-3 py-2 text-center">{cost.loaiChiPhi}</td>
                          <td className="border border-gray-400 px-3 py-2">{cost.tenChiPhi || '-'}</td>
                          <td className="border border-gray-400 px-3 py-2 text-center">{cost.donVi || '-'}</td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                            {cost.dinhMucLaoDong !== undefined && cost.dinhMucLaoDong !== null ? cost.dinhMucLaoDong : '-'}
                          </td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                            {cost.donViDinhMucLaoDong || '-'}
                          </td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                            {cost.soLuongNguyenLieu !== undefined && cost.soLuongNguyenLieu !== null ? cost.soLuongNguyenLieu : '-'}
                          </td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">
                            {cost.soPhutThucHien !== undefined && cost.soPhutThucHien !== null ? cost.soPhutThucHien : '-'}
                          </td>
                          {/* Cột KẾ HOẠCH - Hiển thị từ database */}
                          <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">
                            {cost.soLuongKeHoach !== undefined && cost.soLuongKeHoach !== null ? cost.soLuongKeHoach.toFixed(2) : '-'}
                          </td>
                          {/* Cột THỰC TẾ - Editable */}
                          <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                            <input
                              type="text"
                              value={flowchartInputValues[`${activeTab}-${sectionIndex}-${costIndex}-soLuongThucTe`] ?? formatNumberWithDots(cost.soLuongThucTe)}
                              onChange={(e) => {
                                const rawValue = handleNumericInput(e.target.value);
                                setFlowchartInputValues(prev => ({
                                  ...prev,
                                  [`${activeTab}-${sectionIndex}-${costIndex}-soLuongThucTe`]: rawValue
                                }));
                              }}
                              onBlur={(e) => {
                                const numValue = parseNumberFromDots(e.target.value);
                                handleFlowchartCostChange(sectionIndex, costIndex, 'soLuongThucTe', String(numValue));
                                setFlowchartInputValues(prev => {
                                  const newValues = { ...prev };
                                  delete newValues[`${activeTab}-${sectionIndex}-${costIndex}-soLuongThucTe`];
                                  return newValues;
                                });
                              }}
                              className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right"
                              placeholder="0"
                            />
                          </td>
                          {/* Cột GIÁ (KẾ HOẠCH) - Editable */}
                          <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                            <input
                              type="text"
                              value={flowchartInputValues[`${activeTab}-${sectionIndex}-${costIndex}-giaKeHoach`] ?? formatNumberWithDots(cost.giaKeHoach)}
                              onChange={(e) => {
                                const rawValue = handleNumericInput(e.target.value);
                                setFlowchartInputValues(prev => ({
                                  ...prev,
                                  [`${activeTab}-${sectionIndex}-${costIndex}-giaKeHoach`]: rawValue
                                }));
                              }}
                              onBlur={(e) => {
                                const numValue = parseNumberFromDots(e.target.value);
                                handleFlowchartCostChange(sectionIndex, costIndex, 'giaKeHoach', String(numValue));
                                setFlowchartInputValues(prev => {
                                  const newValues = { ...prev };
                                  delete newValues[`${activeTab}-${sectionIndex}-${costIndex}-giaKeHoach`];
                                  return newValues;
                                });
                              }}
                              className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right"
                              placeholder="0"
                            />
                          </td>
                          {/* Cột THÀNH TIỀN (KẾ HOẠCH) - Tính toán tự động */}
                          <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">
                            {(() => {
                              const gia = cost.giaKeHoach || 0;
                              const soLuong = cost.soLuongKeHoach || 0;
                              const thanhTien = gia * soLuong;
                              return thanhTien > 0 ? formatNumberWithDots(thanhTien) : '0';
                            })()}
                          </td>
                          {/* Cột GIÁ (THỰC TẾ) - Editable */}
                          <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                            <input
                              type="text"
                              value={flowchartInputValues[`${activeTab}-${sectionIndex}-${costIndex}-giaThucTe`] ?? formatNumberWithDots(cost.giaThucTe)}
                              onChange={(e) => {
                                const rawValue = handleNumericInput(e.target.value);
                                setFlowchartInputValues(prev => ({
                                  ...prev,
                                  [`${activeTab}-${sectionIndex}-${costIndex}-giaThucTe`]: rawValue
                                }));
                              }}
                              onBlur={(e) => {
                                const numValue = parseNumberFromDots(e.target.value);
                                handleFlowchartCostChange(sectionIndex, costIndex, 'giaThucTe', String(numValue));
                                setFlowchartInputValues(prev => {
                                  const newValues = { ...prev };
                                  delete newValues[`${activeTab}-${sectionIndex}-${costIndex}-giaThucTe`];
                                  return newValues;
                                });
                              }}
                              className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right"
                              placeholder="0"
                            />
                          </td>
                          {/* Cột THÀNH TIỀN (THỰC TẾ) - Tính toán tự động */}
                          <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">
                            {(() => {
                              const gia = cost.giaThucTe || 0;
                              const soLuong = cost.soLuongThucTe || 0;
                              const thanhTien = gia * soLuong;
                              return thanhTien > 0 ? formatNumberWithDots(thanhTien) : '0';
                            })()}
                          </td>
                        </tr>
                      ));
                    })}
                    {/* Hàng Tổng cộng */}
                    <tr className="bg-blue-100 font-bold">
                      <td colSpan={13} className="border border-gray-400 px-3 py-3 text-right text-sm">
                        Tổng cộng
                      </td>
                      {/* Tổng THÀNH TIỀN (KẾ HOẠCH) */}
                      <td className="border border-gray-400 px-3 py-3 text-center text-sm">
                        {(() => {
                          const total = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                            return sum + section.costs.reduce((costSum, cost) => {
                              const gia = cost.giaKeHoach || 0;
                              const soLuong = cost.soLuongKeHoach || 0;
                              return costSum + (gia * soLuong);
                            }, 0);
                          }, 0);
                          return total.toLocaleString('vi-VN') + ' VNĐ';
                        })()}
                      </td>
                      {/* Cột trống (GIÁ THỰC TẾ) */}
                      <td className="border border-gray-400 px-3 py-3 bg-gray-100"></td>
                      {/* Tổng THÀNH TIỀN (THỰC TẾ) */}
                      <td className="border border-gray-400 px-3 py-3 text-center text-sm">
                        {(() => {
                          const total = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                            return sum + section.costs.reduce((costSum, cost) => {
                              const gia = cost.giaThucTe || 0;
                              const soLuong = cost.soLuongThucTe || 0;
                              return costSum + (gia * soLuong);
                            }, 0);
                          }, 0);
                          return total.toLocaleString('vi-VN') + ' VNĐ';
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
          )}

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Hủy
            </button>
            {isOrderSummaryTab ? (
              <>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  disabled={loading}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSaveOrderSummaryData();
                  }}
                >
                  {loading ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  disabled={loading}
                >
                  {loading ? 'Đang tạo...' : 'Tạo báo giá'}
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? 'Đang lưu...' : 'Lưu'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>

    {/* Modal Tạo Báo Giá */}
    {showCreateQuotationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Tạo Báo Giá</h3>
              <button
                onClick={() => setShowCreateQuotationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Hiệu lực báo giá */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hiệu lực báo giá (ngày) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={quotationFormData.hieuLucBaoGia}
                  onChange={(e) => setQuotationFormData(prev => ({ ...prev, hieuLucBaoGia: parseNumberInputStr(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập số ngày"
                  required
                />
              </div>

              {/* Trạng thái */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái <span className="text-red-500">*</span>
                </label>
                <select
                  value={quotationFormData.tinhTrang}
                  onChange={(e) => setQuotationFormData(prev => ({ ...prev, tinhTrang: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DANG_CHO_PHAN_HOI">Đang chờ phản hồi</option>
                  <option value="DANG_CHO_GUI_DON_HANG">Đang chờ gửi đơn hàng</option>
                  <option value="DA_DAT_HANG">Đã đặt hàng</option>
                  <option value="KHONG_DAT_HANG">Không đặt hàng</option>
                </select>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={quotationFormData.ghiChu}
                  onChange={(e) => setQuotationFormData(prev => ({ ...prev, ghiChu: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập ghi chú (nếu có)"
                  rows={3}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateQuotationModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateQuotation}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? 'Đang tạo...' : 'Tạo báo giá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm chi phí bổ sung */}
      {showAddCostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thêm chi phí bổ sung</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên chi phí bổ sung <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newCostName}
                onChange={(e) => setNewCostName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Nhập tên chi phí bổ sung"
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddCostModal(false);
                  setNewCostName('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddAdditionalCost}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chọn sản phẩm cho chi phí chung */}
      {showProductSelectionModal && editingGeneralCostGroupId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">
                Chọn sản phẩm cho: {generalCostGroups.find(g => g.id === editingGeneralCostGroupId)?.tenBangChiPhi || 'Chi phí chung'}
              </h3>
              <button
                onClick={() => {
                  setShowProductSelectionModal(false);
                  setEditingGeneralCostGroupId(null);
                }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="mb-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Chọn các sản phẩm mà chi phí chung sẽ được phân bổ cho. Nếu không chọn sản phẩm nào, chi phí sẽ được phân bổ cho tất cả sản phẩm.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allProductIds = [
                        ...tabsData.map((_, index) => `tab-${index}`),
                        ...additionalCostTabs.map(tab => `additional-${tab.id}`)
                      ];
                      if (editingGeneralCostGroupId) {
                        updateGeneralCostGroupProducts(editingGeneralCostGroupId, allProductIds);
                      }
                    }}
                    className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-blue-300"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingGeneralCostGroupId) {
                        updateGeneralCostGroupProducts(editingGeneralCostGroupId, []);
                      }
                    }}
                    className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded border border-gray-300"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {/* Sản phẩm chính */}
                {tabsData.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Sản phẩm chính</h4>
                    <div className="space-y-2">
                      {tabsData.map((tab, index) => {
                        const productId = `tab-${index}`;
                        const currentGroup = generalCostGroups.find(g => g.id === editingGeneralCostGroupId);
                        const isSelected = currentGroup?.selectedProducts.includes(productId) || false;
                        const productName = tab.formData.tenDinhMuc || tab.selectedStandard?.tenDinhMuc || `Sản phẩm ${index + 1}`;

                        return (
                          <label
                            key={productId}
                            className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                              isSelected ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (editingGeneralCostGroupId && currentGroup) {
                                  if (e.target.checked) {
                                    updateGeneralCostGroupProducts(editingGeneralCostGroupId, [...currentGroup.selectedProducts, productId]);
                                  } else {
                                    updateGeneralCostGroupProducts(editingGeneralCostGroupId, currentGroup.selectedProducts.filter(id => id !== productId));
                                  }
                                }
                              }}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                Sản phẩm {index + 1}: {productName}
                              </div>
                              {tab.formData.sanPhamDauRa && (
                                <div className="text-xs text-gray-500">
                                  Sản phẩm đầu ra: {tab.formData.sanPhamDauRa}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Chi phí bổ sung */}
                {additionalCostTabs.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Chi phí bổ sung</h4>
                    <div className="space-y-2">
                      {additionalCostTabs.map((tab, index) => {
                        const productId = `additional-${tab.id}`;
                        const currentGroup = generalCostGroups.find(g => g.id === editingGeneralCostGroupId);
                        const isSelected = currentGroup?.selectedProducts.includes(productId) || false;
                        const productName = tab.formData.tenChiPhi || `Chi phí bổ sung ${index + 1}`;

                        return (
                          <label
                            key={productId}
                            className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                              isSelected ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (editingGeneralCostGroupId && currentGroup) {
                                  if (e.target.checked) {
                                    updateGeneralCostGroupProducts(editingGeneralCostGroupId, [...currentGroup.selectedProducts, productId]);
                                  } else {
                                    updateGeneralCostGroupProducts(editingGeneralCostGroupId, currentGroup.selectedProducts.filter(id => id !== productId));
                                  }
                                }
                              }}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                Chi phí bổ sung {index + 1}: {productName}
                              </div>
                              {tab.formData.sanPhamDauRa && (
                                <div className="text-xs text-gray-500">
                                  Sản phẩm đầu ra: {tab.formData.sanPhamDauRa}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {tabsData.length === 0 && additionalCostTabs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có sản phẩm nào. Vui lòng thêm sản phẩm trước.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
              <div className="text-sm text-gray-600">
                Đã chọn: <span className="font-semibold">{generalCostGroups.find(g => g.id === editingGeneralCostGroupId)?.selectedProducts.length || 0}</span> / {tabsData.length + additionalCostTabs.length} sản phẩm
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductSelectionModal(false);
                    setEditingGeneralCostGroupId(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProductSelectionModal(false);
                    setEditingGeneralCostGroupId(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup kiểm tra tồn kho */}
      {inventoryCheckResult.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[700px] max-w-[90vw] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600" />
                Kiểm tra tồn kho
              </h3>
              <button
                onClick={() => setInventoryCheckResult(prev => ({ ...prev, show: false }))}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inventoryCheckResult.loading ? (
              <div className="text-center py-6 text-gray-500">Đang tải...</div>
            ) : (
              <div className="overflow-auto flex-1 space-y-4">
                {/* Bảng tồn kho nguyên liệu đầu vào */}
                {inventoryCheckResult.materialName && (
                  <div>
                    <div className="bg-orange-50 rounded-lg p-3 mb-2">
                      <span className="text-xs text-gray-500">Nguyên liệu đầu vào</span>
                      <p className="text-sm font-medium text-gray-800">{inventoryCheckResult.materialName}</p>
                    </div>
                    {inventoryCheckResult.materialItems.length === 0 ? (
                      <p className="text-sm text-orange-600 text-center py-2">Không tìm thấy tồn kho cho nguyên liệu này</p>
                    ) : (
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-orange-100">
                            <th className="px-3 py-2 text-left border border-gray-200 font-medium text-gray-700">Kho</th>
                            <th className="px-3 py-2 text-left border border-gray-200 font-medium text-gray-700">Lô</th>
                            <th className="px-3 py-2 text-right border border-gray-200 font-medium text-gray-700">Số lượng</th>
                            <th className="px-3 py-2 text-right border border-gray-200 font-medium text-gray-700">Giá thành</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryCheckResult.materialItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-orange-50">
                              <td className="px-3 py-2 border border-gray-200">{item.tenKho}</td>
                              <td className="px-3 py-2 border border-gray-200">{item.tenLo}</td>
                              <td className="px-3 py-2 border border-gray-200 text-right font-medium text-blue-700">
                                {item.soLuong.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} {item.donViTinh}
                              </td>
                              <td className="px-3 py-2 border border-gray-200 text-right font-medium text-green-700">
                                {item.giaThanh > 0
                                  ? `${item.giaThanh.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ`
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-orange-50 font-semibold">
                            <td colSpan={2} className="px-3 py-2 border border-gray-200 text-right">Tổng cộng</td>
                            <td className="px-3 py-2 border border-gray-200 text-right text-blue-800">
                              {inventoryCheckResult.materialItems.reduce((s, i) => s + i.soLuong, 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} {inventoryCheckResult.materialItems[0]?.donViTinh || ''}
                            </td>
                            <td className="px-3 py-2 border border-gray-200 text-right text-green-800">
                              {(() => {
                                const withPrice = inventoryCheckResult.materialItems.filter(i => i.giaThanh > 0);
                                if (withPrice.length === 0) return '-';
                                const avg = withPrice.reduce((s, i) => s + i.giaThanh, 0) / withPrice.length;
                                return `${avg.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ (TB)`;
                              })()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Bảng tồn kho sản phẩm đầu ra */}
                {inventoryCheckResult.productName && (
                  <div>
                    <div className="bg-gray-50 rounded-lg p-3 mb-2">
                      <span className="text-xs text-gray-500">Sản phẩm đầu ra</span>
                      <p className="text-sm font-medium text-gray-800">{inventoryCheckResult.productName}</p>
                    </div>
                    {inventoryCheckResult.items.length === 0 ? (
                      <p className="text-sm text-orange-600 text-center py-2">Không tìm thấy tồn kho cho sản phẩm này</p>
                    ) : (
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-3 py-2 text-left border border-gray-200 font-medium text-gray-700">Kho</th>
                            <th className="px-3 py-2 text-left border border-gray-200 font-medium text-gray-700">Lô</th>
                            <th className="px-3 py-2 text-right border border-gray-200 font-medium text-gray-700">Số lượng</th>
                            <th className="px-3 py-2 text-right border border-gray-200 font-medium text-gray-700">Giá thành</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryCheckResult.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 border border-gray-200">{item.tenKho}</td>
                              <td className="px-3 py-2 border border-gray-200">{item.tenLo}</td>
                              <td className="px-3 py-2 border border-gray-200 text-right font-medium text-blue-700">
                                {item.soLuong.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} {item.donViTinh}
                              </td>
                              <td className="px-3 py-2 border border-gray-200 text-right font-medium text-green-700">
                                {item.giaThanh > 0
                                  ? `${item.giaThanh.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ`
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-teal-50 font-semibold">
                            <td colSpan={2} className="px-3 py-2 border border-gray-200 text-right">Tổng cộng</td>
                            <td className="px-3 py-2 border border-gray-200 text-right text-blue-800">
                              {inventoryCheckResult.items.reduce((s, i) => s + i.soLuong, 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} {inventoryCheckResult.items[0]?.donViTinh || ''}
                            </td>
                            <td className="px-3 py-2 border border-gray-200 text-right text-green-800">
                              {(() => {
                                const withPrice = inventoryCheckResult.items.filter(i => i.giaThanh > 0);
                                if (withPrice.length === 0) return '-';
                                const avg = withPrice.reduce((s, i) => s + i.giaThanh, 0) / withPrice.length;
                                return `${avg.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ (TB)`;
                              })()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Trường hợp không có cả 2 */}
                {!inventoryCheckResult.productName && !inventoryCheckResult.materialName && (
                  <p className="text-sm text-orange-600 text-center py-4">Không có dữ liệu tồn kho</p>
                )}
              </div>
            )}

            <div className="mt-4 text-right">
              <button
                onClick={() => setInventoryCheckResult(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuotationCalculatorModal;

