import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign } from 'lucide-react';
import { quotationService, CreateQuotationRequest, QuotationItem } from '../services/quotationService';
import materialStandardService, { MaterialStandard } from '../services/materialStandardService';
import { QuotationRequest } from '../services/quotationRequestService';
// warehouseInventoryService đã được xóa - tồn kho sẽ được nhập thủ công
import productionProcessService, { ProductionProcess } from '../services/productionProcessService';
import generalCostService, { GeneralCost } from '../services/generalCostService';
import exportCostService, { ExportCost } from '../services/exportCostService';
import quotationCalculatorService from '../services/quotationCalculatorService';

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
  const [selectedGeneralCosts, setSelectedGeneralCosts] = useState<SelectedCostItem[]>([]);
  const [selectedExportCosts, setSelectedExportCosts] = useState<SelectedCostItem[]>([]);

  // State for profit calculation in order summary
  const [phanTramThue, setPhanTramThue] = useState<string>('');
  const [phanTramQuy, setPhanTramQuy] = useState<string>('');

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
      thanhPhamTonKho: string;
      tongThanhPhamCanSxThem: string;
      tongNguyenLieuCanSanXuat: string;
      nguyenLieuTonKho: string;
      nguyenLieuCanNhapThem: string;
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
      giaHoaVonSanPhamPhu: { [tenSanPham: string]: string }; // Giá hòa vốn của các sản phẩm phụ (user input)
    };
  }[]>([]);

  useEffect(() => {
    if (isOpen && quotationRequest) {
      loadMaterialStandards();
      loadProductionProcesses();
      loadAvailableCosts();
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

        // Create a map of saved products by maBaoGia for quick lookup
        const savedProductsMap = new Map();
        calculator.products.forEach((product: any) => {
          savedProductsMap.set(product.maBaoGia, product);
        });

        // Generate base code for new products
        const codeResponse = await quotationService.generateQuotationCode();
        const baseCode = codeResponse.data.code;

        // Load full MaterialStandard and ProductionProcess data for each item
        // Merge saved data with items from quotation request
        const loadedTabs = await Promise.all(items.map(async (item: any, index: number) => {
          const maBaoGia = `${baseCode}-${index + 1}`;
          const savedProduct = savedProductsMap.get(maBaoGia);

          // If this product was saved before, load its data
          if (savedProduct) {
            const product = savedProduct;
            console.log('🔍 Processing saved product:', product);
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
                thanhPhamTonKho: product.thanhPhamTonKho?.toString() || '',
                tongThanhPhamCanSxThem: product.tongThanhPhamCanSxThem?.toString() || '',
                tongNguyenLieuCanSanXuat: product.tongNguyenLieuCanSanXuat?.toString() || '',
                nguyenLieuTonKho: product.nguyenLieuTonKho?.toString() || '',
                nguyenLieuCanNhapThem: product.nguyenLieuCanNhapThem?.toString() || '',
                ghiChu: product.ghiChu || '',
                thoiGianChoPhepToiDa: product.thoiGianChoPhepToiDa?.toString() || '',
                ngayBatDauSanXuat: product.ngayBatDauSanXuat ? new Date(product.ngayBatDauSanXuat).toISOString().split('T')[0] : '',
                ngayHoanThanhThucTe: product.ngayHoanThanhThucTe ? new Date(product.ngayHoanThanhThucTe).toISOString().split('T')[0] : '',
                chiPhiSanXuatKeHoach: product.chiPhiSanXuatKeHoach?.toString() || '',
                chiPhiSanXuatThucTe: product.chiPhiSanXuatThucTe?.toString() || '',
                chiPhiChungKeHoach: product.chiPhiChungKeHoach?.toString() || '',
                chiPhiChungThucTe: product.chiPhiChungThucTe?.toString() || '',
                chiPhiXuatKhauKeHoach: product.chiPhiXuatKhauKeHoach?.toString() || '',
                chiPhiXuatKhauThucTe: product.chiPhiXuatKhauThucTe?.toString() || '',
                giaHoaVon: product.giaHoaVon?.toString() || '',
                loiNhuanCongThem: product.loiNhuanCongThem?.toString() || '',
                giaHoaVonSanPhamPhu: product.byProducts?.reduce((acc: any, bp: any) => {
                  acc[bp.tenSanPham] = bp.giaHoaVon.toString();
                  return acc;
                }, {}) || {},
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
              },
            };
          }
        }));

        setTabsData(loadedTabs);

        // Load general costs
        const loadedGeneralCosts = calculator.generalCosts.map((cost: any) => ({
          id: cost.id,
          costId: cost.generalCostId,
          tenChiPhi: cost.tenChiPhi,
          donViTinh: cost.donViTinh,
          keHoach: cost.keHoach,
          thucTe: cost.thucTe,
        }));
        setSelectedGeneralCosts(loadedGeneralCosts);

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
          thanhPhamTonKho: '',
          tongThanhPhamCanSxThem: '',
          tongNguyenLieuCanSanXuat: '',
          nguyenLieuTonKho: '',
          nguyenLieuCanNhapThem: '',
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
          thanhPhamTonKho: '',
          tongThanhPhamCanSxThem: '',
          tongNguyenLieuCanSanXuat: '',
          nguyenLieuTonKho: '',
          nguyenLieuCanNhapThem: '',
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
          const maxDays = parseInt(newTabs[activeTab].formData.thoiGianChoPhepToiDa) || 1;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quotationRequest) {
      alert('Không tìm thấy thông tin yêu cầu báo giá');
      return;
    }

    const items = getItems();
    const isOrderSummaryTab = activeTab === items.length;

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
          products: tabsData.map((tab, index) => {
            console.log(`🔍 Tab ${index} - selectedProcess:`, tab.selectedProcess);
            console.log(`🔍 Tab ${index} - flowchart:`, tab.selectedProcess?.flowchart);
            const item = items[index];
            const byProducts = tab.formData.giaHoaVonSanPhamPhu
              ? Object.entries(tab.formData.giaHoaVonSanPhamPhu).map(([tenSanPham, giaHoaVon]) => ({
                  tenSanPham,
                  giaHoaVon: parseFloat(giaHoaVon as string) || 0,
                }))
              : [];

            // Tính giá hòa vốn tự động
            const giaHoaVonCalculated = calculateGiaHoaVonChinhPham(index);

            return {
              quotationRequestItemId: (item as any).id || quotationRequest.id, // Fallback to quotationRequest.id if no item.id
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
              productionProcessId: tab.selectedProcess?.id,
              maQuyTrinhSanXuat: tab.selectedProcess?.maQuyTrinhSanXuat,
              tenQuyTrinhSanXuat: tab.selectedProcess?.tenQuyTrinhSanXuat,
              flowchartData: tab.selectedProcess?.flowchart || undefined, // Lưu flowchart đã chỉnh sửa
              thoiGianChoPhepToiDa: tab.formData.thoiGianChoPhepToiDa ? parseInt(tab.formData.thoiGianChoPhepToiDa) : undefined,
              ngayBatDauSanXuat: tab.formData.ngayBatDauSanXuat || undefined,
              ngayHoanThanhThucTe: tab.formData.ngayHoanThanhThucTe || undefined,
              chiPhiSanXuatKeHoach: (() => { const v = calculateChiPhiSanXuatKeHoach(index); return v ? v : undefined; })(),
              chiPhiSanXuatThucTe: tab.formData.chiPhiSanXuatThucTe ? parseFloat(tab.formData.chiPhiSanXuatThucTe) : undefined,
              chiPhiChungKeHoach: tab.formData.chiPhiChungKeHoach ? parseFloat(tab.formData.chiPhiChungKeHoach) : undefined,
              chiPhiChungThucTe: tab.formData.chiPhiChungThucTe ? parseFloat(tab.formData.chiPhiChungThucTe) : undefined,
              chiPhiXuatKhauKeHoach: tab.formData.chiPhiXuatKhauKeHoach ? parseFloat(tab.formData.chiPhiXuatKhauKeHoach) : undefined,
              chiPhiXuatKhauThucTe: tab.formData.chiPhiXuatKhauThucTe ? parseFloat(tab.formData.chiPhiXuatKhauThucTe) : undefined,
              giaHoaVon: giaHoaVonCalculated || undefined, // Sử dụng giá hòa vốn đã tính
              loiNhuanCongThem: tab.formData.loiNhuanCongThem ? parseFloat(tab.formData.loiNhuanCongThem) : undefined,
              ghiChu: tab.formData.ghiChu,
              byProducts,
            };
          }),
          generalCosts: selectedGeneralCosts.map(cost => ({
            costId: cost.costId,
            maChiPhi: cost.costId, // Will be denormalized from GeneralCost
            tenChiPhi: cost.tenChiPhi,
            donViTinh: cost.donViTinh,
            keHoach: cost.keHoach,
            thucTe: cost.thucTe,
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

      const calculatorData = {
        quotationRequestId: quotationRequest.id,
        maYeuCauBaoGia: quotationRequest.maYeuCauBaoGia,
        phanTramThue: phanTramThue ? parseFloat(phanTramThue) : undefined,
        phanTramQuy: phanTramQuy ? parseFloat(phanTramQuy) : undefined,
        products: tabsData.map((tab, index) => {
          console.log(`🔍 Tab ${index} - selectedProcess:`, tab.selectedProcess);
          console.log(`🔍 Tab ${index} - flowchart:`, tab.selectedProcess?.flowchart);
          const item = items[index];
          const byProducts = tab.formData.giaHoaVonSanPhamPhu
            ? Object.entries(tab.formData.giaHoaVonSanPhamPhu).map(([tenSanPham, giaHoaVon]) => ({
                tenSanPham,
                giaHoaVon: parseFloat(giaHoaVon as string) || 0,
              }))
            : [];

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
            productionProcessId: tab.selectedProcess?.id,
            maQuyTrinhSanXuat: tab.selectedProcess?.maQuyTrinhSanXuat,
            tenQuyTrinhSanXuat: tab.selectedProcess?.tenQuyTrinhSanXuat,
            flowchartData: tab.selectedProcess?.flowchart || undefined,
            thoiGianChoPhepToiDa: tab.formData.thoiGianChoPhepToiDa ? parseInt(tab.formData.thoiGianChoPhepToiDa) : undefined,
            ngayBatDauSanXuat: tab.formData.ngayBatDauSanXuat || undefined,
            ngayHoanThanhThucTe: tab.formData.ngayHoanThanhThucTe || undefined,
            chiPhiSanXuatKeHoach: (() => { const v = calculateChiPhiSanXuatKeHoach(index); return v ? v : undefined; })(),
            chiPhiSanXuatThucTe: tab.formData.chiPhiSanXuatThucTe ? parseFloat(tab.formData.chiPhiSanXuatThucTe) : undefined,
            chiPhiChungKeHoach: tab.formData.chiPhiChungKeHoach ? parseFloat(tab.formData.chiPhiChungKeHoach) : undefined,
            chiPhiChungThucTe: tab.formData.chiPhiChungThucTe ? parseFloat(tab.formData.chiPhiChungThucTe) : undefined,
            chiPhiXuatKhauKeHoach: tab.formData.chiPhiXuatKhauKeHoach ? parseFloat(tab.formData.chiPhiXuatKhauKeHoach) : undefined,
            chiPhiXuatKhauThucTe: tab.formData.chiPhiXuatKhauThucTe ? parseFloat(tab.formData.chiPhiXuatKhauThucTe) : undefined,
            giaHoaVon: giaHoaVonCalculated || undefined,
            loiNhuanCongThem: tab.formData.loiNhuanCongThem ? parseFloat(tab.formData.loiNhuanCongThem) : undefined,
            ghiChu: tab.formData.ghiChu,
            byProducts,
          };
        }),
        generalCosts: selectedGeneralCosts.map(cost => ({
          costId: cost.costId,
          maChiPhi: cost.costId,
          tenChiPhi: cost.tenChiPhi,
          donViTinh: cost.donViTinh,
          keHoach: cost.keHoach,
          thucTe: cost.thucTe,
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
    setSelectedGeneralCosts([]);
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

  // Add a general cost item
  const addGeneralCost = () => {
    const newItem: SelectedCostItem = {
      id: `gc-${Date.now()}`,
      costId: '',
      tenChiPhi: '',
      donViTinh: '',
      keHoach: 0,
      thucTe: 0
    };
    setSelectedGeneralCosts([...selectedGeneralCosts, newItem]);
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

  // Remove a general cost item
  const removeGeneralCost = (id: string) => {
    setSelectedGeneralCosts(selectedGeneralCosts.filter(item => item.id !== id));
  };

  // Remove an export cost item
  const removeExportCost = (id: string) => {
    setSelectedExportCosts(selectedExportCosts.filter(item => item.id !== id));
  };

  // Update general cost selection
  const updateGeneralCostSelection = (itemId: string, costId: string) => {
    // Nếu chọn "ALL", thêm tất cả chi phí chung
    if (costId === 'ALL') {
      // Xóa dòng hiện tại
      const filteredCosts = selectedGeneralCosts.filter(item => item.id !== itemId);

      // Thêm tất cả chi phí chung chưa được chọn
      const newCosts = availableGeneralCosts.map(cost => ({
        id: `${Date.now()}-${cost.id}`,
        costId: cost.id,
        tenChiPhi: cost.tenChiPhi,
        donViTinh: cost.donViTinh || '',
        keHoach: 0,
        thucTe: 0,
      }));

      setSelectedGeneralCosts([...filteredCosts, ...newCosts]);
      return;
    }

    const selectedCost = availableGeneralCosts.find(c => c.id === costId);
    setSelectedGeneralCosts(selectedGeneralCosts.map(item =>
      item.id === itemId
        ? { ...item, costId, tenChiPhi: selectedCost?.tenChiPhi || '', donViTinh: selectedCost?.donViTinh || '' }
        : item
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

  // Update general cost value
  const updateGeneralCostValue = (itemId: string, field: 'keHoach' | 'thucTe', value: number) => {
    setSelectedGeneralCosts(selectedGeneralCosts.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
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
    const maxDays = parseInt(tab.formData.thoiGianChoPhepToiDa) || 1;
    const chiPhiSanXuat = chiPhiSanXuatPerDay * maxDays;

    // 2. Tính chi phí chung (phân bổ theo khối lượng)
    const totalGeneralCostKeHoach = selectedGeneralCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
    const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
    const totalKhoiLuong = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);
    const chiPhiChung = totalKhoiLuong === 0 ? 0 : (totalGeneralCostKeHoach * currentKhoiLuong) / totalKhoiLuong;

    // 3. Tính chi phí xuất khẩu (phân bổ theo khối lượng)
    const totalExportCostKeHoach = selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
    const chiPhiXuatKhau = totalKhoiLuong === 0 ? 0 : (totalExportCostKeHoach * currentKhoiLuong) / totalKhoiLuong;

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
    const maxDays = parseInt(tab.formData.thoiGianChoPhepToiDa) || 1;
    return chiPhiSanXuatPerDay * maxDays;
  };

  const items = getItems();
  const isOrderSummaryTab = activeTab === items.length;
  const currentTab = isOrderSummaryTab ? null : (tabsData[activeTab] || null);
  const currentItem = isOrderSummaryTab ? null : items[activeTab];

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-blue-600">
          <h3 className="text-xl font-bold text-white">BẢNG TÍNH CHI PHÍ</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={clearSavedData}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
              title="Xóa dữ liệu đã lưu và khởi tạo lại"
            >
              Xóa dữ liệu đã lưu
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
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
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === index
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Sản phẩm {index + 1}: {item.tenSanPham}
            </button>
          ))}
          {/* Tab Báo giá đơn hàng */}
          <button
            type="button"
            onClick={() => setActiveTab(items.length)}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === items.length
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
                              {(totalKeHoach * (parseInt(tab?.formData?.thoiGianChoPhepToiDa || '1') || 1)).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">
                              {totalThucTe.toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-3"></td>
                          </tr>
                        );
                      })}

                      {/* Divider - Chi phí chung */}
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="px-6 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 uppercase">Chi phí chung</span>
                            <button
                              type="button"
                              onClick={addGeneralCost}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              Thêm
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Chi phí chung */}
                      {selectedGeneralCosts.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <select
                              value={item.costId}
                              onChange={(e) => updateGeneralCostSelection(item.id, e.target.value)}
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
                              type="number"
                              step="1"
                              min="0"
                              value={item.keHoach || ''}
                              onChange={(e) => updateGeneralCostValue(item.id, 'keHoach', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={item.thucTe || ''}
                              onChange={(e) => updateGeneralCostValue(item.id, 'thucTe', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-6 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeGeneralCost(item.id)}
                              className="text-gray-400 hover:text-red-600 p-1"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Tổng chi phí chung */}
                      {selectedGeneralCosts.length > 0 && (
                        <tr className="bg-blue-50">
                          <td className="px-6 py-2.5 text-sm font-semibold text-gray-900 text-right">
                            Tổng chi phí chung
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
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.keHoachUSD || ''}
                                  onChange={(e) => updateExportCostUSDValue(item.id, 'keHoachUSD', parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="USD"
                                />
                                <span className="text-xs text-gray-500">×</span>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={item.tiGiaKeHoach || ''}
                                  onChange={(e) => updateExportCostExchangeRate(item.id, 'tiGiaKeHoach', parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Tỉ giá"
                                />
                              </div>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={item.keHoach || ''}
                                onChange={(e) => updateExportCostValue(item.id, 'keHoach', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-1.5 text-sm border border-blue-300 rounded-md text-right font-medium text-blue-700 bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="VNĐ"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.thucTeUSD || ''}
                                  onChange={(e) => updateExportCostUSDValue(item.id, 'thucTeUSD', parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="USD"
                                />
                                <span className="text-xs text-gray-500">×</span>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  value={item.tiGiaThucTe || ''}
                                  onChange={(e) => updateExportCostExchangeRate(item.id, 'tiGiaThucTe', parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Tỉ giá"
                                />
                              </div>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={item.thucTe || ''}
                                onChange={(e) => updateExportCostValue(item.id, 'thucTe', parseFloat(e.target.value) || 0)}
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
                                const multiplier = parseInt(tab?.formData?.thoiGianChoPhepToiDa || '1') || 1;
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

                <div className="p-6 space-y-4">
                  {/* Row 1: Doanh thu trước thuế và % thuế */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Doanh thu trước thuế */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Doanh thu trước thuế
                      </label>
                      <input
                        type="text"
                        value={(() => {
                          // Lợi nhuận trước thuế = Tổng (giá báo khách * số lượng) của tất cả sản phẩm
                          // Giá báo khách = Giá hòa vốn + Lợi nhuận cộng thêm
                          const items = getItems();
                          let loiNhuanTruocThue = 0;
                          tabsData.forEach((tab, index) => {
                            const item = items[index];
                            const soLuong = parseFloat(item?.soLuong?.toString() || '0');
                            // Tính giá báo khách = giá hòa vốn + lợi nhuận cộng thêm
                            const giaHoaVon = calculateGiaHoaVonChinhPham(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThem || '0');
                            const giaBaoKhach = giaHoaVon + loiNhuan;
                            loiNhuanTruocThue += giaBaoKhach * soLuong;
                          });
                          return loiNhuanTruocThue.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-lg font-semibold text-gray-900 text-right"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        = Σ (giá báo khách × số lượng)
                      </p>
                    </div>

                    {/* % thuế (input) */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Phần trăm thuế (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={phanTramThue}
                        onChange={(e) => setPhanTramThue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold text-right"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Nhập phần trăm thuế (0-100)
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Doanh thu sau thuế và % quỹ */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Doanh thu sau thuế */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Doanh thu sau thuế
                      </label>
                      <input
                        type="text"
                        value={(() => {
                          // Lợi nhuận sau thuế = lợi nhuận trước thuế - (lợi nhuận trước thuế * % thuế / 100)
                          const items = getItems();
                          let loiNhuanTruocThue = 0;
                          tabsData.forEach((tab, index) => {
                            const item = items[index];
                            const soLuong = parseFloat(item?.soLuong?.toString() || '0');
                            // Tính giá báo khách = giá hòa vốn + lợi nhuận cộng thêm
                            const giaHoaVon = calculateGiaHoaVonChinhPham(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThem || '0');
                            const giaBaoKhach = giaHoaVon + loiNhuan;
                            loiNhuanTruocThue += giaBaoKhach * soLuong;
                          });
                          const thue = parseFloat(phanTramThue || '0');
                          const loiNhuanSauThue = loiNhuanTruocThue - (loiNhuanTruocThue * thue / 100);
                          return loiNhuanSauThue.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-lg font-semibold text-gray-900 text-right"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        = doanh thu trước thuế - (doanh thu trước thuế × % thuế)
                      </p>
                    </div>

                    {/* % quỹ (input) */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Phần trăm quỹ (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={phanTramQuy}
                        onChange={(e) => setPhanTramQuy(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold text-right"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Nhập phần trăm quỹ (0-100)
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Trích các quỹ và Doanh thu thực nhận */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Trích các quỹ */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Trích các quỹ
                      </label>
                      <input
                        type="text"
                        value={(() => {
                          // Trích các quỹ = lợi nhuận sau thuế * % quỹ / 100
                          const items = getItems();
                          let loiNhuanTruocThue = 0;
                          tabsData.forEach((tab, index) => {
                            const item = items[index];
                            const soLuong = parseFloat(item?.soLuong?.toString() || '0');
                            // Tính giá báo khách = giá hòa vốn + lợi nhuận cộng thêm
                            const giaHoaVon = calculateGiaHoaVonChinhPham(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThem || '0');
                            const giaBaoKhach = giaHoaVon + loiNhuan;
                            loiNhuanTruocThue += giaBaoKhach * soLuong;
                          });
                          const thue = parseFloat(phanTramThue || '0');
                          const loiNhuanSauThue = loiNhuanTruocThue - (loiNhuanTruocThue * thue / 100);
                          const quy = parseFloat(phanTramQuy || '0');
                          const trichCacQuy = loiNhuanSauThue * quy / 100;
                          return trichCacQuy.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-lg font-semibold text-gray-900 text-right"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        = doanh thu sau thuế × % quỹ
                      </p>
                    </div>

                    {/* Doanh thu thực nhận */}
                    <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Doanh thu thực nhận
                      </label>
                      <input
                        type="text"
                        value={(() => {
                          // Lợi nhuận thực nhận = lợi nhuận sau thuế - trích các quỹ
                          const items = getItems();
                          let loiNhuanTruocThue = 0;
                          tabsData.forEach((tab, index) => {
                            const item = items[index];
                            const soLuong = parseFloat(item?.soLuong?.toString() || '0');
                            // Tính giá báo khách = giá hòa vốn + lợi nhuận cộng thêm
                            const giaHoaVon = calculateGiaHoaVonChinhPham(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThem || '0');
                            const giaBaoKhach = giaHoaVon + loiNhuan;
                            loiNhuanTruocThue += giaBaoKhach * soLuong;
                          });
                          const thue = parseFloat(phanTramThue || '0');
                          const loiNhuanSauThue = loiNhuanTruocThue - (loiNhuanTruocThue * thue / 100);
                          const quy = parseFloat(phanTramQuy || '0');
                          const trichCacQuy = loiNhuanSauThue * quy / 100;
                          const loiNhuanThucNhan = loiNhuanSauThue - trichCacQuy;
                          return loiNhuanThucNhan.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                        disabled
                        className="w-full px-3 py-2 border-0 rounded-md bg-white text-xl font-bold text-blue-700 text-right"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        = doanh thu sau thuế - trích các quỹ
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : !currentTab ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Tên người thực hiện */}
              <div className="bg-gray-50 p-3 rounded">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên người thực hiện
                </label>
                <input
                  type="text"
                  value={quotationRequest.tenNhanVien || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                />
              </div>

              {/* Tên sản phẩm */}
              <div className="bg-orange-100 p-3 rounded">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên sản phẩm
                </label>
                <input
                  type="text"
                  value={currentItem?.tenSanPham || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-orange-50 font-medium"
                />
              </div>

              {/* Khối lượng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khối lượng
                  </label>
                  <input
                    type="number"
                    value={currentItem?.soLuong || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị
                  </label>
                  <input
                    type="text"
                    value={currentItem?.donViTinh || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  />
                </div>
              </div>

              {/* Mã định mức NVL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã định mức NVL
                </label>
                <select
                  value={currentTab.selectedStandard?.id || ''}
                  onChange={(e) => handleStandardChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn định mức --</option>
                  {materialStandards.map((standard) => (
                    <option key={standard.id} value={standard.id}>
                      {standard.maDinhMuc} : {standard.tenDinhMuc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tỉ lệ thu hồi thành phẩm (%) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tỉ lệ thu hồi thành phẩm (%) K3
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentTab.formData.tiLeThuHoi}
                  onChange={(e) => handleTiLeThuHoiChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tỉ lệ thu hồi"
                />
              </div>

              {/* Tổng khối lượng thành phẩm đầu ra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tổng khối lượng thành phẩm đầu ra (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={
                    currentTab.formData.tongNguyenLieuCanSanXuat && currentTab.formData.tiLeThuHoi
                      ? (parseFloat(currentTab.formData.tongNguyenLieuCanSanXuat) * parseFloat(currentTab.formData.tiLeThuHoi) / 100).toFixed(2)
                      : '0'
                  }
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-green-600 font-medium"
                  placeholder="Tự động tính"
                />
              </div>
            </div> {/* End Left Column */}

            {/* Right Column */}
            <div className="space-y-4">
              {/* Chọn sản phẩm đầu ra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chọn sản phẩm đầu ra
                </label>
                <select
                  value={currentTab.formData.sanPhamDauRa}
                  onChange={(e) => handleOutputProductChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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

              {/* Thành phẩm tồn kho */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thành phẩm tồn kho
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={currentTab.formData.thanhPhamTonKho}
                  onChange={(e) => handleInventoryChange(e.target.value)}
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
                  value={currentTab.formData.tongThanhPhamCanSxThem}
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
                  value={currentTab.formData.tongNguyenLieuCanSanXuat}
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
                  value={currentTab.formData.nguyenLieuTonKho}
                  onChange={(e) => handleMaterialInventoryChange(e.target.value)}
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
                  value={currentTab.formData.nguyenLieuCanNhapThem}
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
              {/* Thời gian cho phép tối đa (số ngày) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  thời gian cho phép tối đa (số ngày)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={currentTab.formData.thoiGianChoPhepToiDa}
                  onChange={(e) => {
                    setTabsData(prev => {
                      const newTabs = [...prev];
                      newTabs[activeTab].formData.thoiGianChoPhepToiDa = e.target.value;

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
                        const maxDays = parseInt(newTabs[activeTab].formData.thoiGianChoPhepToiDa) || 1;
                        newTabs[activeTab].formData.chiPhiSanXuatKeHoach = (chiPhiSanXuatPerDay * maxDays).toString();
                      } catch (e) {
                        // ignore
                      }

                      return newTabs;
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập số ngày"
                />
              </div>

              {/* Ngày bắt đầu sản xuất */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ngày bắt đầu sản xuất
                </label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ngày hoàn thành (thực tế) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ngày hoàn thành ( thực tế )
                </label>
                <input
                  type="date"
                  value={currentTab.formData.ngayHoanThanhThucTe}
                  onChange={(e) => {
                    setTabsData(prev => {
                      const newTabs = [...prev];
                      newTabs[activeTab].formData.ngayHoanThanhThucTe = e.target.value;
                      return newTabs;
                    });
                  }}
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
                        if (!currentTab.selectedProcess?.flowchart?.sections) return '0';
                        const total = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                          return sum + section.costs.reduce((costSum, cost) => {
                            const gia = cost.giaKeHoach || 0;
                            const soLuong = cost.soLuongKeHoach || 0;
                            return costSum + (gia * soLuong);
                          }, 0);
                        }, 0);
                        const days = parseInt(currentTab.formData.thoiGianChoPhepToiDa) || 1;
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
                        if (!currentTab.selectedProcess?.flowchart?.sections) return '0';
                        const total = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                          return sum + section.costs.reduce((costSum, cost) => {
                            const gia = cost.giaThucTe || 0;
                            const soLuong = cost.soLuongThucTe || 0;
                            return costSum + (gia * soLuong);
                          }, 0);
                        }, 0);
                        return total.toLocaleString('vi-VN');
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
                        // Tính tổng chi phí chung kế hoạch từ tab "Báo giá đơn hàng"
                        const totalGeneralCostKeHoach = selectedGeneralCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);

                        // Lấy khối lượng sản phẩm hiện tại
                        const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');

                        // Tính tổng khối lượng tất cả sản phẩm
                        const totalKhoiLuong = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);

                        // Tính chi phí chung cho sản phẩm hiện tại
                        if (totalKhoiLuong === 0) return '0';
                        const chiPhiChung = (totalGeneralCostKeHoach * currentKhoiLuong) / totalKhoiLuong;

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
                        // Tính tổng chi phí chung thực tế từ tab "Báo giá đơn hàng"
                        const totalGeneralCostThucTe = selectedGeneralCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);

                        // Lấy khối lượng sản phẩm hiện tại
                        const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');

                        // Tính tổng khối lượng tất cả sản phẩm
                        const totalKhoiLuong = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);

                        // Tính chi phí chung cho sản phẩm hiện tại
                        if (totalKhoiLuong === 0) return '0';
                        const chiPhiChung = (totalGeneralCostThucTe * currentKhoiLuong) / totalKhoiLuong;

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

                        // Lấy khối lượng sản phẩm hiện tại
                        const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');

                        // Tính tổng khối lượng tất cả sản phẩm
                        const totalKhoiLuong = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);

                        // Tính chi phí xuất khẩu cho sản phẩm hiện tại
                        if (totalKhoiLuong === 0) return '0';
                        const chiPhiXuatKhau = (totalExportCostKeHoach * currentKhoiLuong) / totalKhoiLuong;

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

                        // Lấy khối lượng sản phẩm hiện tại
                        const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');

                        // Tính tổng khối lượng tất cả sản phẩm
                        const totalKhoiLuong = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);

                        // Tính chi phí xuất khẩu cho sản phẩm hiện tại
                        if (totalKhoiLuong === 0) return '0';
                        const chiPhiXuatKhau = (totalExportCostThucTe * currentKhoiLuong) / totalKhoiLuong;

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
                          const maxDays = parseInt(currentTab.formData.thoiGianChoPhepToiDa) || 1;
                          chiPhiSanXuat = perDay * maxDays;
                        }

                        // 2. Chi phí chung kế hoạch
                        const totalGeneralCostKeHoach = selectedGeneralCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
                        const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
                        const totalKhoiLuong = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);
                        const chiPhiChung = totalKhoiLuong === 0 ? 0 : (totalGeneralCostKeHoach * currentKhoiLuong) / totalKhoiLuong;

                        // 3. Chi phí xuất khẩu kế hoạch
                        const totalExportCostKeHoach = selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
                        const chiPhiXuatKhau = totalKhoiLuong === 0 ? 0 : (totalExportCostKeHoach * currentKhoiLuong) / totalKhoiLuong;

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
                        // 1. Chi phí sản xuất thực tế
                        let chiPhiSanXuat = 0;
                        if (currentTab.selectedProcess?.flowchart?.sections) {
                          chiPhiSanXuat = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => {
                            return sum + section.costs.reduce((costSum, cost) => {
                              const gia = cost.giaThucTe || 0;
                              const soLuong = cost.soLuongThucTe || 0;
                              return costSum + (gia * soLuong);
                            }, 0);
                          }, 0);
                        }

                        // 2. Chi phí chung thực tế
                        const totalGeneralCostThucTe = selectedGeneralCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);
                        const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
                        const totalKhoiLuong = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0);
                        const chiPhiChung = totalKhoiLuong === 0 ? 0 : (totalGeneralCostThucTe * currentKhoiLuong) / totalKhoiLuong;

                        // 3. Chi phí xuất khẩu thực tế
                        const totalExportCostThucTe = selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);
                        const chiPhiXuatKhau = totalKhoiLuong === 0 ? 0 : (totalExportCostThucTe * currentKhoiLuong) / totalKhoiLuong;

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
                    <tr>
                      <th className="px-4 py-2 bg-gray-200 border border-gray-300 text-left text-sm font-medium text-gray-700">
                        Thành phẩm đầu ra
                      </th>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
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
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
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

                    {/* Tổng khối lượng thành phẩm đầu ra */}
                    <tr>
                      <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">
                        tổng khối lượng thành phẩm đầu ra
                      </td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        // Tổng khối lượng thành phẩm đầu ra = Tổng nguyên liệu cần sản xuất × Tỉ lệ thu hồi thành phẩm K3 / 100
                        const tongKhoiLuongDauRa = currentTab.formData.tongNguyenLieuCanSanXuat && currentTab.formData.tiLeThuHoi
                          ? (parseFloat(currentTab.formData.tongNguyenLieuCanSanXuat) * parseFloat(currentTab.formData.tiLeThuHoi) / 100).toFixed(2)
                          : '0';
                        return (
                          <td
                            key={index}
                            className={`px-4 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-blue-50' : 'bg-gray-50'
                            }`}
                          >
                            <span className="font-medium text-green-600">{tongKhoiLuongDauRa} kg</span>
                          </td>
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
                        const soKg = currentTab.formData.tongNguyenLieuCanSanXuat && currentTab.formData.tiLeThuHoi
                          ? (parseFloat(currentTab.formData.tongNguyenLieuCanSanXuat) * parseFloat(currentTab.formData.tiLeThuHoi) / 100 * item.tiLe / 100).toFixed(3)
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
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;

                        // Tính giá hòa vốn cho sản phẩm đầu ra chính (auto-calculated)
                        const giaHoaVonValue = isSelected
                          ? calculateGiaHoaVonChinhPham(activeTab).toFixed(2)
                          : (currentTab.formData.giaHoaVonSanPhamPhu[item.tenThanhPham] || '');

                        return (
                          <td
                            key={index}
                            className={`px-4 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-blue-50' : 'bg-gray-50'
                            }`}
                          >
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={giaHoaVonValue}
                              onChange={(e) => {
                                if (!isSelected) {
                                  // Cho phép nhập giá hòa vốn cho sản phẩm phụ
                                  setTabsData(prev => {
                                    const newTabs = [...prev];
                                    newTabs[activeTab].formData.giaHoaVonSanPhamPhu = {
                                      ...newTabs[activeTab].formData.giaHoaVonSanPhamPhu,
                                      [item.tenThanhPham]: e.target.value,
                                    };
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
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        return (
                          <td
                            key={index}
                            className={`px-4 py-2 border border-gray-300 text-center ${
                              isSelected ? 'bg-blue-50' : 'bg-gray-50'
                            }`}
                          >
                            {isSelected ? (
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={currentTab.formData.loiNhuanCongThem}
                                onChange={(e) => {
                                  setTabsData(prev => {
                                    const newTabs = [...prev];
                                    newTabs[activeTab].formData.loiNhuanCongThem = e.target.value;
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
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;

                        // Tính giá báo khách = Giá hòa vốn + Lợi nhuận cộng thêm
                        const giaBaoKhachValue = isSelected
                          ? (() => {
                              const giaHoaVon = calculateGiaHoaVonChinhPham(activeTab);
                              const loiNhuan = parseFloat(currentTab.formData.loiNhuanCongThem || '0');
                              return (giaHoaVon + loiNhuan).toFixed(2);
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
                              type="number"
                              step="0.01"
                              min="0"
                              value={cost.soLuongThucTe !== undefined && cost.soLuongThucTe !== null ? cost.soLuongThucTe : ''}
                              onChange={(e) => handleFlowchartCostChange(sectionIndex, costIndex, 'soLuongThucTe', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                              placeholder="0"
                            />
                          </td>
                          {/* Cột GIÁ (KẾ HOẠCH) - Editable */}
                          <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={cost.giaKeHoach !== undefined && cost.giaKeHoach !== null ? cost.giaKeHoach : ''}
                              onChange={(e) => handleFlowchartCostChange(sectionIndex, costIndex, 'giaKeHoach', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                              placeholder="0"
                            />
                          </td>
                          {/* Cột THÀNH TIỀN (KẾ HOẠCH) - Tính toán tự động */}
                          <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">
                            {(() => {
                              const gia = cost.giaKeHoach || 0;
                              const soLuong = cost.soLuongKeHoach || 0;
                              const thanhTien = gia * soLuong;
                              return thanhTien > 0 ? thanhTien.toLocaleString('vi-VN') : '0';
                            })()}
                          </td>
                          {/* Cột GIÁ (THỰC TẾ) - Editable */}
                          <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={cost.giaThucTe !== undefined && cost.giaThucTe !== null ? cost.giaThucTe : ''}
                              onChange={(e) => handleFlowchartCostChange(sectionIndex, costIndex, 'giaThucTe', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                              placeholder="0"
                            />
                          </td>
                          {/* Cột THÀNH TIỀN (THỰC TẾ) - Tính toán tự động */}
                          <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">
                            {(() => {
                              const gia = cost.giaThucTe || 0;
                              const soLuong = cost.soLuongThucTe || 0;
                              const thanhTien = gia * soLuong;
                              return thanhTien > 0 ? thanhTien.toLocaleString('vi-VN') : '0';
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
                  onChange={(e) => setQuotationFormData(prev => ({ ...prev, hieuLucBaoGia: e.target.value }))}
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
    </>
  );
};

export default QuotationCalculatorModal;

