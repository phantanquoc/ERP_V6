import { useState, useEffect } from 'react';
import { quotationService } from '../services/quotationService';
import materialStandardService, { MaterialStandard } from '../services/materialStandardService';
import { QuotationRequest } from '../services/quotationRequestService';
import warehouseService from '../services/warehouseService';
import productionProcessService, { ProductionProcess } from '../services/productionProcessService';
import generalCostService, { GeneralCost } from '../services/generalCostService';
import exportCostService, { ExportCost } from '../services/exportCostService';
import quotationCalculatorService from '../services/quotationCalculatorService';
import internationalProductService, { InternationalProduct } from '../services/internationalProductService';
import {
  SelectedCostItem,
  GeneralCostGroup,
  MainTab,
  AdditionalCostTab,
  InventoryCheckResult,
  QuotationFormData,
} from '../components/quotation-calculator/types';
import { formatNumberWithDots, parseNumberFromDots } from '../components/quotation-calculator/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export type {
  SelectedCostItem,
  GeneralCostGroup,
  MainTab,
  AdditionalCostTab,
  InventoryCheckResult,
  QuotationFormData,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useQuotationCalculator(
  isOpen: boolean,
  quotationRequest: QuotationRequest | null,
  onClose: () => void,
  onSuccess: () => void,
) {
  const [loading, setLoading] = useState(false);
  const [materialStandards, setMaterialStandards] = useState<MaterialStandard[]>([]);
  const [productionProcesses, setProductionProcesses] = useState<any[]>([]);
  const [availableGeneralCosts, setAvailableGeneralCosts] = useState<GeneralCost[]>([]);
  const [availableExportCosts, setAvailableExportCosts] = useState<ExportCost[]>([]);
  const [availableProducts, setAvailableProducts] = useState<InternationalProduct[]>([]);
  const [selectedExportCosts, setSelectedExportCosts] = useState<SelectedCostItem[]>([]);
  const [generalCostGroups, setGeneralCostGroups] = useState<GeneralCostGroup[]>([
    { id: `gcg-${Date.now()}`, tenBangChiPhi: 'Chi phí chung 1', selectedCosts: [], selectedProducts: [] }
  ]);
  const [showProductSelectionModal, setShowProductSelectionModal] = useState(false);
  const [editingGeneralCostGroupId, setEditingGeneralCostGroupId] = useState<string | null>(null);
  const [phanTramThue, setPhanTramThue] = useState<string>('');
  const [phanTramQuy, setPhanTramQuy] = useState<string>('');
  const [inventoryCheckResult, setInventoryCheckResult] = useState<InventoryCheckResult>({
    show: false, loading: false, productName: '', materialName: '', items: [], materialItems: [],
  });
  const [showCreateQuotationModal, setShowCreateQuotationModal] = useState(false);
  const [quotationFormData, setQuotationFormData] = useState<QuotationFormData>({
    hieuLucBaoGia: '', tinhTrang: 'DANG_CHO_PHAN_HOI', ghiChu: '',
  });
  const [activeTab, setActiveTab] = useState(0);
  const [tabsData, setTabsData] = useState<MainTab[]>([]);
  const [additionalCostTabs, setAdditionalCostTabs] = useState<AdditionalCostTab[]>([]);
  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [newCostName, setNewCostName] = useState('');
  const [flowchartInputValues, setFlowchartInputValues] = useState<Record<string, string>>({});
  const [additionalFlowchartInputValues, setAdditionalFlowchartInputValues] = useState<Record<string, string>>({});

  // ── Computed ──────────────────────────────────────────────────────────────

  const selectedGeneralCosts = generalCostGroups.flatMap(g => g.selectedCosts);
  const selectedProductsForGeneralCosts = [...new Set(generalCostGroups.flatMap(g => g.selectedProducts))];

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && quotationRequest) {
      loadMaterialStandards();
      loadProductionProcesses();
      loadAvailableCosts();
      loadAvailableProducts();
      initializeTabs();
    }
  }, [isOpen, quotationRequest]);

  // Auto-update general costs in all tabs when generalCostGroups changes
  useEffect(() => {
    if (!quotationRequest || tabsData.length === 0) return;
    const items = getItems();

    const calculateGeneralCostForProduct = (productId: string, productKhoiLuong: number) => {
      let totalKeHoach = 0;
      let totalThucTe = 0;
      generalCostGroups.forEach(group => {
        const groupTotalKeHoach = group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
        const groupTotalThucTe = group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);
        const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(productId);
        if (!isProductSelected) return;
        const selectedMainItems = items.filter((_: any, index: number) => group.selectedProducts.includes(`tab-${index}`));
        const selectedAdditionalItems = additionalCostTabs.filter(tab => group.selectedProducts.includes(`additional-${tab.id}`));
        const totalKhoiLuong =
          selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
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

    const updatedTabsData = tabsData.map((tab, tabIndex) => {
      const currentItem = items[tabIndex];
      const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
      const { keHoach, thucTe } = calculateGeneralCostForProduct(`tab-${tabIndex}`, currentKhoiLuong);
      return { ...tab, formData: { ...tab.formData, chiPhiChungKeHoach: keHoach.toString(), chiPhiChungThucTe: thucTe.toString() } };
    });
    setTabsData(updatedTabsData);

    const updatedAdditionalTabs = additionalCostTabs.map((tab) => {
      const currentKhoiLuong = parseFloat(tab.formData.soLuong || '0');
      const { keHoach, thucTe } = calculateGeneralCostForProduct(`additional-${tab.id}`, currentKhoiLuong);
      return { ...tab, formData: { ...tab.formData, chiPhiChungKeHoach: keHoach.toString(), chiPhiChungThucTe: thucTe.toString() } };
    });
    setAdditionalCostTabs(updatedAdditionalTabs);
  }, [generalCostGroups]);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadAvailableCosts = async () => {
    try {
      const [generalResponse, exportResponse] = await Promise.all([
        generalCostService.getAllGeneralCosts(1, 100),
        exportCostService.getAllExportCosts(1, 100),
      ]);
      setAvailableGeneralCosts(generalResponse.data);
      setAvailableExportCosts(exportResponse.data);
    } catch (error) {
      console.error('Error loading available costs:', error);
    }
  };

  const loadAvailableProducts = async () => {
    try {
      const response = await internationalProductService.getAllProducts(1, 1000);
      setAvailableProducts(response.data);
    } catch (error) {
      console.error('Error loading available products:', error);
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
      const response = await productionProcessService.getAllProductionProcesses(1, 1000);
      setProductionProcesses(response.data as any[]);
    } catch (error) {
      console.error('Error loading production processes:', error);
    }
  };

  // ── getItems helper ───────────────────────────────────────────────────────

  const getItems = () => {
    if (!quotationRequest) return [];
    if ((quotationRequest as any).items) return (quotationRequest as any).items;
    return [{ tenSanPham: quotationRequest.tenSanPham, soLuong: quotationRequest.soLuong, donViTinh: quotationRequest.donViTinh }];
  };

  // ── initializeTabs ────────────────────────────────────────────────────────

  const emptyTabFormData = (maBaoGia: string) => ({
    maBaoGia, maDinhMuc: '', tenDinhMuc: '', tiLeThuHoi: '', sanPhamDauRa: '', nguyenLieuDauVao: '',
    thanhPhamTonKho: '', tongThanhPhamCanSxThem: '', tongNguyenLieuCanSanXuat: '', nguyenLieuTonKho: '', nguyenLieuCanNhapThem: '',
    tongKhoiLuongThanhPhamThucTe: '', thanhPhamTonKhoThucTe: '', tongThanhPhamCanSxThemThucTe: '', tongNguyenLieuCanSanXuatThucTe: '',
    ghiChu: '', thoiGianChoPhepToiDa: '', ngayBatDauSanXuat: '', ngayBatDauSanXuatThucTe: '', ngayHoanThanhThucTe: '',
    chiPhiSanXuatKeHoach: '', chiPhiSanXuatThucTe: '', chiPhiChungKeHoach: '', chiPhiChungThucTe: '',
    chiPhiXuatKhauKeHoach: '', chiPhiXuatKhauThucTe: '', giaHoaVon: '', loiNhuanCongThem: '', loiNhuanCongThemThucTe: '',
    giaHoaVonSanPhamPhu: {}, tiLeThuHoiThucTe: {}, giaHoaVonSanPhamPhuThucTe: {}, tiGiaUSD: '',
  });

  const emptyAdditionalFormData = (maBaoGia: string) => ({
    maBaoGia, maDinhMuc: '', tenDinhMuc: '', tiLeThuHoi: '', sanPhamDauRa: '', nguyenLieuDauVao: '',
    thanhPhamTonKho: '', tongThanhPhamCanSxThem: '', tongNguyenLieuCanSanXuat: '', nguyenLieuTonKho: '', nguyenLieuCanNhapThem: '',
    ghiChu: '', thoiGianChoPhepToiDa: '', ngayBatDauSanXuat: '', ngayBatDauSanXuatThucTe: '', ngayHoanThanhThucTe: '',
    chiPhiSanXuatKeHoach: '', chiPhiSanXuatThucTe: '', chiPhiChungKeHoach: '', chiPhiChungThucTe: '',
    chiPhiXuatKhauKeHoach: '', chiPhiXuatKhauThucTe: '', giaHoaVon: '', loiNhuanCongThem: '',
    giaHoaVonSanPhamPhu: {}, soLuong: '', donViTinh: '', tiGiaUSD: '',
  });

  const initializeTabs = async () => {
    if (!quotationRequest) return;
    const items = getItems();

    try {
      const response = await quotationCalculatorService.getByQuotationRequestId(quotationRequest.id) as any;
      if (response.success && response.data) {
        const calculator = response.data;
        const regularProducts = calculator.products.filter((p: any) => !p.isAdditionalCost);
        const additionalCostProducts = calculator.products.filter((p: any) => p.isAdditionalCost);
        const codeResponse = await quotationService.generateQuotationCode();
        const baseCode = codeResponse.data.code;

        const loadedTabs = await Promise.all(items.map(async (_item: any, index: number) => {
          const savedProduct = regularProducts[index];
          const maBaoGia = savedProduct?.maBaoGia || `${baseCode}-${index + 1}`;
          if (savedProduct) {
            const product = savedProduct;
            let selectedStandard = null;
            let selectedProcess = null;
            if (product.materialStandardId) {
              try { selectedStandard = await materialStandardService.getMaterialStandardById(product.materialStandardId); }
              catch { selectedStandard = { id: product.materialStandardId, maDinhMuc: product.maDinhMuc || '', tenDinhMuc: product.tenDinhMuc || '' } as any; }
            }
            if (product.productionProcessId) {
              try {
                const res = await productionProcessService.getProductionProcessById(product.productionProcessId);
                const resData = res.data as ProductionProcess;
                selectedProcess = { ...resData, flowchart: product.flowchartData || resData?.flowchart || null };
              } catch { selectedProcess = { id: product.productionProcessId, maQuyTrinhSanXuat: product.maQuyTrinhSanXuat || '', tenQuyTrinhSanXuat: product.tenQuyTrinhSanXuat || '', tenQuyTrinh: product.tenQuyTrinhSanXuat || '', flowchart: product.flowchartData || null } as any; }
            }
            return {
              selectedStandard, selectedProcess,
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
                tongKhoiLuongThanhPhamThucTe: product.tongKhoiLuongThanhPhamThucTe?.toString() || '',
                thanhPhamTonKhoThucTe: product.thanhPhamTonKhoThucTe?.toString() || '',
                tongThanhPhamCanSxThemThucTe: product.tongThanhPhamCanSxThemThucTe?.toString() || '',
                tongNguyenLieuCanSanXuatThucTe: product.tongNguyenLieuCanSanXuatThucTe?.toString() || '',
                ghiChu: product.ghiChu || '',
                thoiGianChoPhepToiDa: product.thoiGianChoPhepToiDa?.toString() || '',
                ngayBatDauSanXuat: product.ngayBatDauSanXuat ? new Date(product.ngayBatDauSanXuat).toISOString().split('T')[0] : '',
                ngayBatDauSanXuatThucTe: product.ngayBatDauSanXuatThucTe ? new Date(product.ngayBatDauSanXuatThucTe).toISOString().split('T')[0] : '',
                ngayHoanThanhThucTe: product.ngayHoanThanhThucTe?.toString() || '',
                chiPhiSanXuatKeHoach: product.chiPhiSanXuatKeHoach?.toString() || '',
                chiPhiSanXuatThucTe: product.chiPhiSanXuatThucTe?.toString() || '',
                chiPhiChungKeHoach: product.chiPhiChungKeHoach?.toString() || '',
                chiPhiChungThucTe: product.chiPhiChungThucTe?.toString() || '',
                chiPhiXuatKhauKeHoach: product.chiPhiXuatKhauKeHoach?.toString() || '',
                chiPhiXuatKhauThucTe: product.chiPhiXuatKhauThucTe?.toString() || '',
                giaHoaVon: product.giaHoaVon?.toString() || '',
                loiNhuanCongThem: product.loiNhuanCongThem?.toString() || '',
                giaHoaVonSanPhamPhu: product.byProducts?.reduce((acc: any, bp: any) => { acc[bp.tenSanPham] = bp.giaHoaVon?.toString() || '0'; return acc; }, {}) || {},
                tiLeThuHoiThucTe: product.byProducts?.reduce((acc: any, bp: any) => { if (bp.tiLeThuHoiThucTe != null) acc[bp.tenSanPham] = bp.tiLeThuHoiThucTe.toString(); return acc; }, {}) || {},
                loiNhuanCongThemThucTe: product.loiNhuanCongThemThucTe?.toString() || '',
                giaHoaVonSanPhamPhuThucTe: product.byProducts?.reduce((acc: any, bp: any) => { if (bp.giaHoaVonThucTe != null) acc[bp.tenSanPham] = bp.giaHoaVonThucTe.toString(); return acc; }, {}) || {},
                tiGiaUSD: product.tiGiaUSD ? formatNumberWithDots(product.tiGiaUSD) : '',
              },
            };
          } else {
            return { selectedStandard: null, selectedProcess: null, formData: emptyTabFormData(maBaoGia) };
          }
        }));
        setTabsData(loadedTabs);

        // Load general cost groups
        if (calculator.generalCostGroupsData && Array.isArray(calculator.generalCostGroupsData) && calculator.generalCostGroupsData.length > 0) {
          setGeneralCostGroups(calculator.generalCostGroupsData.map((g: any) => ({ id: g.id, tenBangChiPhi: g.tenBangChiPhi, selectedCosts: g.selectedCosts || [], selectedProducts: g.selectedProducts || [] })));
        } else {
          const loadedGeneralCosts = calculator.generalCosts.map((cost: any) => ({ id: cost.id, costId: cost.generalCostId, tenChiPhi: cost.tenChiPhi, donViTinh: cost.donViTinh, keHoach: cost.keHoach, thucTe: cost.thucTe }));
          setGeneralCostGroups([{ id: `gcg-${Date.now()}`, tenBangChiPhi: 'Chi phí chung 1', selectedCosts: loadedGeneralCosts, selectedProducts: [] }]);
        }

        const loadedExportCosts = calculator.exportCosts.map((cost: any) => ({ id: cost.id, costId: cost.exportCostId, tenChiPhi: cost.tenChiPhi, donViTinh: cost.donViTinh, keHoach: cost.keHoach, thucTe: cost.thucTe }));
        setSelectedExportCosts(loadedExportCosts);
        setPhanTramThue(calculator.phanTramThue?.toString() || '');
        setPhanTramQuy(calculator.phanTramQuy?.toString() || '');
        setActiveTab(0);

        if (additionalCostProducts.length > 0) {
          const loadedAdditionalTabs = await Promise.all(additionalCostProducts.map(async (product: any) => {
            let selectedStandard = null;
            let selectedProcess = null;
            if (product.materialStandardId) { try { selectedStandard = await materialStandardService.getMaterialStandardById(product.materialStandardId); } catch { /* ignore */ } }
            if (product.productionProcessId) {
              try {
                const res = await productionProcessService.getProductionProcessById(product.productionProcessId);
                const resData = res.data as ProductionProcess;
                selectedProcess = { ...resData, flowchart: product.flowchartData || resData?.flowchart || null };
              } catch { /* ignore */ }
            }
            return {
              id: product.originalTabId || product.id || `additional-${Date.now()}-${Math.random()}`,
              tenChiPhiBoSung: product.tenChiPhiBoSung || product.tenSanPham || '',
              selectedProduct: product.productId ? { id: product.productId, tenSanPham: product.tenSanPham } as any : null,
              selectedProductType: '',
              selectedStandard, selectedProcess,
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
                ngayBatDauSanXuatThucTe: product.ngayBatDauSanXuatThucTe ? new Date(product.ngayBatDauSanXuatThucTe).toISOString().split('T')[0] : '',
                ngayHoanThanhThucTe: product.ngayHoanThanhThucTe?.toString() || '',
                chiPhiSanXuatKeHoach: product.chiPhiSanXuatKeHoach?.toString() || '',
                chiPhiSanXuatThucTe: product.chiPhiSanXuatThucTe?.toString() || '',
                chiPhiChungKeHoach: product.chiPhiChungKeHoach?.toString() || '',
                chiPhiChungThucTe: product.chiPhiChungThucTe?.toString() || '',
                chiPhiXuatKhauKeHoach: product.chiPhiXuatKhauKeHoach?.toString() || '',
                chiPhiXuatKhauThucTe: product.chiPhiXuatKhauThucTe?.toString() || '',
                giaHoaVon: product.giaHoaVon?.toString() || '',
                loiNhuanCongThem: product.loiNhuanCongThem?.toString() || '',
                giaHoaVonSanPhamPhu: product.byProducts?.reduce((acc: any, bp: any) => { acc[bp.tenSanPham] = bp.giaHoaVon?.toString() || '0'; return acc; }, {}) || {},
                soLuong: product.soLuong?.toString() || '',
                donViTinh: product.donViTinh || '',
                tiGiaUSD: product.tiGiaUSD ? formatNumberWithDots(product.tiGiaUSD) : '',
              },
            };
          }));
          setAdditionalCostTabs(loadedAdditionalTabs);
        }
        return;
      }
    } catch (error) { console.error('Error loading saved calculator data:', error); }

    // No saved data — initialize fresh
    try {
      const codeResponse = await quotationService.generateQuotationCode();
      const baseCode = codeResponse.data.code;
      setTabsData(items.map((_: any, index: number) => ({ selectedStandard: null, selectedProcess: null, formData: emptyTabFormData(`${baseCode}-${index + 1}`) })));
      setActiveTab(0);
    } catch (error: any) {
      setTabsData(items.map((_: any, index: number) => ({ selectedStandard: null, selectedProcess: null, formData: emptyTabFormData(`BG-TEMP-${index + 1}`) })));
      setActiveTab(0);
      if (error.response?.status === 401) alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
  };

  // ── Calculation helpers ───────────────────────────────────────────────────

  const calculateTotalNeeded = (orderQuantity: number, inventory: number): number => {
    const total = orderQuantity - inventory;
    return total > 0 ? total : 0;
  };

  const calculateTotalMaterialNeeded = (tongThanhPhamCanSxThem: number, tiLeThuHoiSanPham: number, tiLeThuHoiThanhPham: number): number => {
    if (tiLeThuHoiSanPham === 0 || tiLeThuHoiThanhPham === 0) return 0;
    return ((100 * tongThanhPhamCanSxThem) / tiLeThuHoiSanPham) / (tiLeThuHoiThanhPham / 100);
  };

  const calculateMaterialToImport = (totalMaterialNeeded: number, materialInventory: number): number => {
    const result = totalMaterialNeeded - materialInventory;
    return result > 0 ? result : 0;
  };

  const calculateChiPhiSanXuatKeHoach = (tabIndex: number) => {
    const tab = tabsData[tabIndex];
    if (!tab) return 0;
    let chiPhiSanXuatPerDay = 0;
    if (tab.selectedProcess?.flowchart?.sections) {
      chiPhiSanXuatPerDay = tab.selectedProcess.flowchart.sections.reduce((sum: number, section: any) => {
        return sum + section.costs.reduce((costSum: number, cost: any) => costSum + (cost.giaKeHoach || 0) * (cost.soLuongKeHoach || 0), 0);
      }, 0);
    }
    return chiPhiSanXuatPerDay * (parseFloat(tab.formData.thoiGianChoPhepToiDa) || 1);
  };

  const calculateGiaHoaVonChinhPham = (tabIndex: number) => {
    const tab = tabsData[tabIndex];
    if (!tab || !tab.selectedStandard || !tab.formData.sanPhamDauRa) return 0;
    const items = getItems();
    const currentItem = items[tabIndex];
    let chiPhiSanXuatPerDay = 0;
    if (tab.selectedProcess?.flowchart?.sections) {
      chiPhiSanXuatPerDay = tab.selectedProcess.flowchart.sections.reduce((sum: number, section: any) => {
        return sum + section.costs.reduce((costSum: number, cost: any) => costSum + (cost.giaKeHoach || 0) * (cost.soLuongKeHoach || 0), 0);
      }, 0);
    }
    const maxDays = parseFloat(tab.formData.thoiGianChoPhepToiDa) || 1;
    const chiPhiSanXuat = chiPhiSanXuatPerDay * maxDays;
    const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
    const currentProductId = `tab-${tabIndex}`;
    let chiPhiChung = 0;
    generalCostGroups.forEach(group => {
      const groupTotalKeHoach = group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
      if (!(group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId))) return;
      const selectedMainItems = items.filter((_: any, index: number) => group.selectedProducts.includes(`tab-${index}`));
      const selectedAdditionalItems = additionalCostTabs.filter(t => group.selectedProducts.includes(`additional-${t.id}`));
      const totalKhoiLuong = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
        selectedAdditionalItems.reduce((sum: number, t: any) => sum + parseFloat(t.formData.soLuong || '0'), 0);
      if (totalKhoiLuong === 0) return;
      const totalSelectedProducts = selectedMainItems.length + selectedAdditionalItems.length;
      chiPhiChung += totalSelectedProducts === 1 ? groupTotalKeHoach : (groupTotalKeHoach * currentKhoiLuong) / totalKhoiLuong;
    });
    const totalExportCostKeHoach = selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
    const currentTongThanhPham = parseFloat(tab.formData.tongThanhPhamCanSxThem || '0');
    const totalTongThanhPhamAll =
      tabsData.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0) +
      additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0);
    const totalProductCount = items.length + additionalCostTabs.length;
    const chiPhiXuatKhau = totalProductCount === 1
      ? totalExportCostKeHoach
      : totalTongThanhPhamAll > 0
        ? (totalExportCostKeHoach * currentTongThanhPham) / totalTongThanhPhamAll
        : (() => {
            const totalKhoiLuongAll = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
              additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0);
            return totalKhoiLuongAll > 0 ? (totalExportCostKeHoach * currentKhoiLuong) / totalKhoiLuongAll : 0;
          })();
    const tongChiPhi = chiPhiSanXuat + chiPhiChung + chiPhiXuatKhau;
    let tongGiaTriSanPhamPhu = 0;
    if (tab.selectedStandard.items) {
      tab.selectedStandard.items.forEach((sp: any) => {
        if (sp.tenThanhPham !== tab.formData.sanPhamDauRa) {
          const giaHoaVonPhu = parseFloat(tab.formData.giaHoaVonSanPhamPhu[sp.tenThanhPham] || '0');
          const soKgPhu = tab.formData.tongNguyenLieuCanSanXuat && tab.formData.tiLeThuHoi
            ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * parseFloat(tab.formData.tiLeThuHoi) / 100 * sp.tiLe / 100 : 0;
          tongGiaTriSanPhamPhu += giaHoaVonPhu * soKgPhu;
        }
      });
    }
    const sanPhamChinhItem = tab.selectedStandard.items?.find((sp: any) => sp.tenThanhPham === tab.formData.sanPhamDauRa);
    const soKgChinhPham = tab.formData.tongNguyenLieuCanSanXuat && tab.formData.tiLeThuHoi && sanPhamChinhItem
      ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * parseFloat(tab.formData.tiLeThuHoi) / 100 * sanPhamChinhItem.tiLe / 100 : 0;
    if (soKgChinhPham === 0) return 0;
    return (tongChiPhi - tongGiaTriSanPhamPhu) / soKgChinhPham;
  };

  const calculateGiaHoaVonChinhPhamThucTe = (tabIndex: number) => {
    const tab = tabsData[tabIndex];
    if (!tab || !tab.selectedStandard || !tab.formData.sanPhamDauRa) return 0;
    const items = getItems();
    const currentItem = items[tabIndex];
    let chiPhiSanXuatPerDay = 0;
    if (tab.selectedProcess?.flowchart?.sections) {
      chiPhiSanXuatPerDay = tab.selectedProcess.flowchart.sections.reduce((sum: number, section: any) => {
        return sum + section.costs.reduce((costSum: number, cost: any) => costSum + (cost.giaThucTe || 0) * (cost.soLuongThucTe || 0), 0);
      }, 0);
    }
    const maxDays = parseFloat(tab.formData.thoiGianChoPhepToiDa) || 1;
    const chiPhiSanXuat = chiPhiSanXuatPerDay * maxDays;
    const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0');
    const currentProductId = `tab-${tabIndex}`;
    let chiPhiChung = 0;
    generalCostGroups.forEach(group => {
      const groupTotalThucTe = group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);
      if (!(group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId))) return;
      const selectedMainItems = items.filter((_: any, index: number) => group.selectedProducts.includes(`tab-${index}`));
      const selectedAdditionalItems = additionalCostTabs.filter(t => group.selectedProducts.includes(`additional-${t.id}`));
      const totalKhoiLuong = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) +
        selectedAdditionalItems.reduce((sum: number, t: any) => sum + parseFloat(t.formData.soLuong || '0'), 0);
      if (totalKhoiLuong === 0) return;
      const totalSelectedProducts = selectedMainItems.length + selectedAdditionalItems.length;
      chiPhiChung += totalSelectedProducts === 1 ? groupTotalThucTe : (groupTotalThucTe * currentKhoiLuong) / totalKhoiLuong;
    });
    const totalExportCostThucTe = selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);
    const currentTongThanhPham = parseFloat(tab.formData.tongThanhPhamCanSxThem || '0');
    const totalTongThanhPhamAll =
      tabsData.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0) +
      additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0);
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
    const tongChiPhi = chiPhiSanXuat + chiPhiChung + chiPhiXuatKhau;
    let tongGiaTriSanPhamPhu = 0;
    const tiLeThuHoiThucTeObj = typeof tab.formData.tiLeThuHoiThucTe === 'object' && tab.formData.tiLeThuHoiThucTe !== null ? tab.formData.tiLeThuHoiThucTe : {};
    const tiLeThuHoiK3 = parseFloat(tab.formData.tiLeThuHoi) || 0;
    if (tab.selectedStandard.items) {
      tab.selectedStandard.items.forEach((sp: any) => {
        if (sp.tenThanhPham !== tab.formData.sanPhamDauRa) {
          const giaHoaVonPhuThucTe = parseFloat(tab.formData.giaHoaVonSanPhamPhuThucTe?.[sp.tenThanhPham] || '0');
          const tiLeThuHoiSanPham = parseFloat((tiLeThuHoiThucTeObj as any)[sp.tenThanhPham] || sp.tiLe.toString());
          const soKgPhu = tab.formData.tongNguyenLieuCanSanXuat && tiLeThuHoiK3
            ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * tiLeThuHoiK3 / 100 * tiLeThuHoiSanPham / 100 : 0;
          tongGiaTriSanPhamPhu += giaHoaVonPhuThucTe * soKgPhu;
        }
      });
    }
    const sanPhamChinhItem = tab.selectedStandard.items?.find((sp: any) => sp.tenThanhPham === tab.formData.sanPhamDauRa);
    const tiLeThuHoiChinhThucTe = sanPhamChinhItem ? parseFloat((tiLeThuHoiThucTeObj as any)[sanPhamChinhItem.tenThanhPham] || sanPhamChinhItem.tiLe.toString()) : 0;
    const soKgChinhPham = tab.formData.tongNguyenLieuCanSanXuat && tiLeThuHoiK3 && sanPhamChinhItem
      ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * tiLeThuHoiK3 / 100 * tiLeThuHoiChinhThucTe / 100 : 0;
    if (soKgChinhPham === 0) return 0;
    return (tongChiPhi - tongGiaTriSanPhamPhu) / soKgChinhPham;
  };

  const calculateSoKgChinhPham = (tabIndex: number) => {
    const tab = tabsData[tabIndex];
    if (!tab || !tab.selectedStandard || !tab.formData.sanPhamDauRa) return 0;
    const sanPhamChinhItem = tab.selectedStandard.items?.find((sp: any) => sp.tenThanhPham === tab.formData.sanPhamDauRa);
    return tab.formData.tongNguyenLieuCanSanXuat && tab.formData.tiLeThuHoi && sanPhamChinhItem
      ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * parseFloat(tab.formData.tiLeThuHoi) / 100 * sanPhamChinhItem.tiLe / 100 : 0;
  };

  const calculateSoKgChinhPhamThucTe = (tabIndex: number) => {
    const tab = tabsData[tabIndex];
    if (!tab || !tab.selectedStandard || !tab.formData.sanPhamDauRa) return 0;
    const sanPhamChinhItem = tab.selectedStandard.items?.find((sp: any) => sp.tenThanhPham === tab.formData.sanPhamDauRa);
    const tiLeThuHoiThucTeObj = typeof tab.formData.tiLeThuHoiThucTe === 'object' && tab.formData.tiLeThuHoiThucTe !== null ? tab.formData.tiLeThuHoiThucTe : {};
    const tiLeThuHoiK3 = parseFloat(tab.formData.tiLeThuHoi) || 0;
    const tiLeThuHoiChinhThucTe = sanPhamChinhItem ? parseFloat((tiLeThuHoiThucTeObj as any)[sanPhamChinhItem.tenThanhPham] || sanPhamChinhItem.tiLe.toString()) : 0;
    return tab.formData.tongNguyenLieuCanSanXuat && tiLeThuHoiK3 && sanPhamChinhItem
      ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) * tiLeThuHoiK3 / 100 * tiLeThuHoiChinhThucTe / 100 : 0;
  };

  const getTotalGeneralCosts = () => selectedGeneralCosts.reduce((acc, item) => ({ keHoach: acc.keHoach + item.keHoach, thucTe: acc.thucTe + item.thucTe }), { keHoach: 0, thucTe: 0 });
  const getTotalExportCosts = () => selectedExportCosts.reduce((acc, item) => ({ keHoach: acc.keHoach + item.keHoach, thucTe: acc.thucTe + item.thucTe }), { keHoach: 0, thucTe: 0 });

  // ── Handlers — main tab ───────────────────────────────────────────────────

  const updateFormData = (field: string, value: string) => {
    setTabsData(prev => { const n = [...prev]; n[activeTab] = { ...n[activeTab], formData: { ...n[activeTab].formData, [field]: value } }; return n; });
  };

  const handleStandardChange = (standardId: string) => {
    const standard = materialStandards.find(s => s.id === standardId);
    if (standard) {
      setTabsData(prev => {
        const n = [...prev];
        n[activeTab] = { ...n[activeTab], selectedStandard: standard, formData: { ...n[activeTab].formData, maDinhMuc: standard.maDinhMuc, tenDinhMuc: standard.tenDinhMuc,
          // Báo giá vẫn dùng % — đổi ngược từ "kgNL/1kgTP" về %: 100 / kgNguyenLieuTren1KgThanhPham
          tiLeThuHoi: standard.kgNguyenLieuTren1KgThanhPham ? (100 / standard.kgNguyenLieuTren1KgThanhPham).toFixed(4) : '',
          sanPhamDauRa: '', nguyenLieuDauVao: '' } };
        return n;
      });
    }
  };

  const handleProcessChange = async (processId: string) => {
    if (!processId) {
      setTabsData(prev => { const n = [...prev]; n[activeTab] = { ...n[activeTab], selectedProcess: null }; return n; });
      return;
    }
    try {
      const response = await productionProcessService.getProductionProcessById(processId);
      const resData = response.data as ProductionProcess;
      const processData = { ...resData, flowchart: resData?.flowchart ?? null };
      setTabsData(prev => {
        const n = [...prev];
        n[activeTab] = { ...n[activeTab], selectedProcess: processData };
        // Auto-fill thoiGianChoPhepToiDa from production process thoiGian
        if (processData.thoiGian) {
          n[activeTab].formData.thoiGianChoPhepToiDa = String(processData.thoiGian);
        }
        try {
          let chiPhiSanXuatPerDay = 0;
          if (processData.flowchart?.sections) {
            chiPhiSanXuatPerDay = processData.flowchart.sections.reduce((sum: number, section: any) => sum + (section.costs || []).reduce((costSum: number, cost: any) => costSum + (cost.giaKeHoach || 0) * (cost.soLuongKeHoach || 0), 0), 0);
          }
          const maxDays = parseFloat(n[activeTab].formData.thoiGianChoPhepToiDa) || 1;
          n[activeTab].formData.chiPhiSanXuatKeHoach = (chiPhiSanXuatPerDay * maxDays).toString();
        } catch { /* ignore */ }
        return n;
      });
    } catch (error) { console.error('Error loading production process details:', error); alert('Lỗi khi tải chi tiết quy trình sản xuất'); }
  };

  const handleFlowchartCostChange = (sectionIndex: number, costIndex: number, field: string, value: string) => {
    setTabsData(prev => {
      const n = [...prev];
      const currentProcess = n[activeTab].selectedProcess;
      if (!currentProcess || !currentProcess.flowchart) return prev;
      const updatedSections = [...currentProcess.flowchart.sections];
      const numValue = parseFloat(value);
      (updatedSections[sectionIndex].costs[costIndex] as any)[field] = isNaN(numValue) ? undefined : numValue;
      n[activeTab] = { ...n[activeTab], selectedProcess: { ...currentProcess, flowchart: { ...currentProcess.flowchart, sections: updatedSections } } };
      return n;
    });
  };

  const handleOutputProductChange = (productName: string) => {
    updateFormData('sanPhamDauRa', productName);
    if (!productName) {
      setTabsData(prev => { const n = [...prev]; n[activeTab] = { ...n[activeTab], formData: { ...n[activeTab].formData, thanhPhamTonKho: '', tongThanhPhamCanSxThem: '', tongNguyenLieuCanSanXuat: '' } }; return n; });
    }
  };

  const handleInventoryChange = (value: string) => {
    if (!quotationRequest) return;
    const inventory = parseFloat(value) || 0;
    const orderQuantity = (quotationRequest as any).items?.[activeTab]?.soLuong || 0;
    const totalNeeded = calculateTotalNeeded(orderQuantity, inventory);
    const currentTab = tabsData[activeTab];
    const tiLeThuHoiThanhPham = parseFloat(currentTab.formData.tiLeThuHoi) || 0;
    const tiLeThuHoiSanPham = currentTab.selectedStandard?.items?.find((item: any) => item.tenThanhPham === currentTab.formData.sanPhamDauRa)?.tiLe || 0;
    const totalMaterialNeeded = calculateTotalMaterialNeeded(totalNeeded, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);
    const materialInventory = parseFloat(currentTab.formData.nguyenLieuTonKho) || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);
    setTabsData(prev => {
      const n = [...prev];
      n[activeTab] = { ...n[activeTab], formData: { ...n[activeTab].formData, thanhPhamTonKho: value, tongThanhPhamCanSxThem: totalNeeded.toString(), tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '', nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '' } };
      return n;
    });
  };

  const handleInventoryThucTeChange = (value: string) => {
    if (!quotationRequest) return;
    const inventoryThucTe = parseFloat(value) || 0;
    const orderQuantity = (quotationRequest as any).items?.[activeTab]?.soLuong || 0;
    const tongThanhPhamCanSxThemThucTe = calculateTotalNeeded(orderQuantity, inventoryThucTe);
    setTabsData(prev => { const n = [...prev]; n[activeTab] = { ...n[activeTab], formData: { ...n[activeTab].formData, thanhPhamTonKhoThucTe: value, tongThanhPhamCanSxThemThucTe: tongThanhPhamCanSxThemThucTe.toString() } }; return n; });
  };

  const handleTiLeThuHoiChange = (value: string) => {
    updateFormData('tiLeThuHoi', value);
    const currentTab = tabsData[activeTab];
    const tongThanhPhamCanSxThem = parseFloat(currentTab.formData.tongThanhPhamCanSxThem) || 0;
    const tiLeThuHoiThanhPham = parseFloat(value) || 0;
    const tiLeThuHoiSanPham = currentTab.selectedStandard?.items?.find((item: any) => item.tenThanhPham === currentTab.formData.sanPhamDauRa)?.tiLe || 0;
    const totalMaterialNeeded = calculateTotalMaterialNeeded(tongThanhPhamCanSxThem, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);
    const materialInventory = parseFloat(currentTab.formData.nguyenLieuTonKho) || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);
    setTabsData(prev => { const n = [...prev]; n[activeTab] = { ...n[activeTab], formData: { ...n[activeTab].formData, tiLeThuHoi: value, tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '', nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '' } }; return n; });
  };

  const handleMaterialInventoryChange = (value: string) => {
    const materialInventory = parseFloat(value) || 0;
    const currentTab = tabsData[activeTab];
    const totalMaterialNeeded = parseFloat(currentTab.formData.tongNguyenLieuCanSanXuat) || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);
    setTabsData(prev => { const n = [...prev]; n[activeTab] = { ...n[activeTab], formData: { ...n[activeTab].formData, nguyenLieuTonKho: value, nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '' } }; return n; });
  };

  // ── Handlers — additional cost tab ───────────────────────────────────────

  const updateAdditionalTabFormData = (tabId: string, field: string, value: string) => {
    setAdditionalCostTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, formData: { ...tab.formData, [field]: value } } : tab));
  };

  const handleAdditionalTabStandardChange = (tabId: string, standardId: string) => {
    const standard = materialStandards.find(s => s.id === standardId);
    if (standard) {
      setAdditionalCostTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, selectedStandard: standard, formData: { ...tab.formData, maDinhMuc: standard.maDinhMuc, tenDinhMuc: standard.tenDinhMuc,
          tiLeThuHoi: standard.kgNguyenLieuTren1KgThanhPham ? (100 / standard.kgNguyenLieuTren1KgThanhPham).toFixed(4) : '',
          sanPhamDauRa: '', nguyenLieuDauVao: '' } } : tab));
    }
  };

  const handleAdditionalTabProcessChange = async (tabId: string, processId: string) => {
    if (!processId) { setAdditionalCostTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, selectedProcess: null } : tab)); return; }
    try {
      const response = await productionProcessService.getProductionProcessById(processId);
      const resData = response.data as ProductionProcess;
      const processData = { ...resData, flowchart: resData?.flowchart ?? null };
      setAdditionalCostTabs(prev => prev.map(tab => {
        if (tab.id !== tabId) return tab;
        const updated = { ...tab, selectedProcess: processData };
        // Auto-fill thoiGianChoPhepToiDa from production process thoiGian
        if (processData.thoiGian) {
          updated.formData = { ...updated.formData, thoiGianChoPhepToiDa: String(processData.thoiGian) };
        }
        return updated;
      }));
    } catch (error) { console.error('Error loading production process for additional tab:', error); }
  };

  const handleAdditionalTabProductTypeChange = (tabId: string, productType: string) => {
    setAdditionalCostTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, selectedProductType: productType, selectedProduct: null } : tab));
  };

  const handleAdditionalTabProductChange = (tabId: string, productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    setAdditionalCostTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, selectedProduct: product || null } : tab));
  };

  const handleAdditionalTabFlowchartCostChange = (tabId: string, sectionIndex: number, costIndex: number, field: string, value: string) => {
    setAdditionalCostTabs(prev => prev.map(tab => {
      if (tab.id === tabId && tab.selectedProcess?.flowchart) {
        const updatedSections = [...tab.selectedProcess.flowchart.sections];
        const numValue = parseFloat(value);
        (updatedSections[sectionIndex].costs[costIndex] as any)[field] = isNaN(numValue) ? undefined : numValue;
        return { ...tab, selectedProcess: { ...tab.selectedProcess, flowchart: { ...tab.selectedProcess.flowchart, sections: updatedSections } } };
      }
      return tab;
    }));
  };

  const handleAdditionalTabOutputProductChange = (tabId: string, productName: string) => {
    updateAdditionalTabFormData(tabId, 'sanPhamDauRa', productName);
    if (!productName) {
      setAdditionalCostTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, formData: { ...tab.formData, thanhPhamTonKho: '', tongThanhPhamCanSxThem: '', tongNguyenLieuCanSanXuat: '', nguyenLieuCanNhapThem: '' } } : tab));
    }
  };

  const handleAdditionalTabInventoryChange = (tabId: string, value: string) => {
    const currentTab = additionalCostTabs.find(tab => tab.id === tabId);
    const inventory = parseFloat(value) || 0;
    const orderQuantity = parseFloat(currentTab?.formData.soLuong || '0') || 0;
    const totalNeeded = calculateTotalNeeded(orderQuantity, inventory);
    const tiLeThuHoiThanhPham = parseFloat(currentTab?.formData.tiLeThuHoi || '0') || 0;
    const tiLeThuHoiSanPham = currentTab?.selectedStandard?.items?.find((item: any) => item.tenThanhPham === currentTab?.formData.sanPhamDauRa)?.tiLe || 0;
    const totalMaterialNeeded = calculateTotalMaterialNeeded(totalNeeded, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);
    const materialInventory = parseFloat(currentTab?.formData.nguyenLieuTonKho || '0') || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);
    setAdditionalCostTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, formData: { ...tab.formData, thanhPhamTonKho: value, tongThanhPhamCanSxThem: totalNeeded.toString(), tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '', nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '' } } : tab));
  };

  const handleAdditionalTabTiLeThuHoiChange = (tabId: string, value: string) => {
    updateAdditionalTabFormData(tabId, 'tiLeThuHoi', value);
    const currentTab = additionalCostTabs.find(tab => tab.id === tabId);
    const tongThanhPhamCanSxThem = parseFloat(currentTab?.formData.tongThanhPhamCanSxThem || '0') || 0;
    const tiLeThuHoiThanhPham = parseFloat(value) || 0;
    const tiLeThuHoiSanPham = currentTab?.selectedStandard?.items?.find((item: any) => item.tenThanhPham === currentTab?.formData.sanPhamDauRa)?.tiLe || 0;
    const totalMaterialNeeded = calculateTotalMaterialNeeded(tongThanhPhamCanSxThem, tiLeThuHoiSanPham, tiLeThuHoiThanhPham);
    const materialInventory = parseFloat(currentTab?.formData.nguyenLieuTonKho || '0') || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);
    setAdditionalCostTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, formData: { ...tab.formData, tiLeThuHoi: value, tongNguyenLieuCanSanXuat: totalMaterialNeeded > 0 ? totalMaterialNeeded.toFixed(2) : '', nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '' } } : tab));
  };

  const handleAdditionalTabMaterialInventoryChange = (tabId: string, value: string) => {
    const currentTab = additionalCostTabs.find(tab => tab.id === tabId);
    const materialInventory = parseFloat(value) || 0;
    const totalMaterialNeeded = parseFloat(currentTab?.formData.tongNguyenLieuCanSanXuat || '0') || 0;
    const materialToImport = calculateMaterialToImport(totalMaterialNeeded, materialInventory);
    setAdditionalCostTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, formData: { ...tab.formData, nguyenLieuTonKho: value, nguyenLieuCanNhapThem: materialToImport > 0 ? materialToImport.toFixed(2) : '' } } : tab));
  };

  const handleAddAdditionalCost = async () => {
    if (!newCostName.trim()) { alert('Vui lòng nhập tên chi phí bổ sung'); return; }
    try {
      const codeResponse = await quotationService.generateQuotationCode();
      const baseCode = codeResponse.data.code;
      const items = getItems();
      const newTab: AdditionalCostTab = {
        id: `additional-${Date.now()}`, tenChiPhiBoSung: newCostName.trim(), selectedProduct: null, selectedProductType: '', selectedStandard: null, selectedProcess: null,
        formData: emptyAdditionalFormData(`${baseCode}-BS-${additionalCostTabs.length + 1}`) as any,
      };
      setAdditionalCostTabs(prev => [...prev, newTab]);
      setShowAddCostModal(false);
      setNewCostName('');
      setActiveTab(items.length + additionalCostTabs.length);
    } catch (error) { console.error('Error adding additional cost tab:', error); alert('Lỗi khi thêm chi phí bổ sung'); }
  };

  const handleRemoveAdditionalCost = (tabId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chi phí bổ sung này?')) return;
    setAdditionalCostTabs(prev => prev.filter(tab => tab.id !== tabId));
    const items = getItems();
    if (activeTab >= items.length + additionalCostTabs.length - 1) {
      setActiveTab(Math.max(0, items.length + additionalCostTabs.length - 2));
    }
  };

  // ── Handlers — general cost groups ───────────────────────────────────────

  const addGeneralCostGroup = () => {
    setGeneralCostGroups([...generalCostGroups, { id: `gcg-${Date.now()}`, tenBangChiPhi: `Chi phí chung ${generalCostGroups.length + 1}`, selectedCosts: [], selectedProducts: [] }]);
  };

  const removeGeneralCostGroup = (groupId: string) => {
    if (generalCostGroups.length <= 1) { alert('Phải có ít nhất 1 bảng chi phí chung!'); return; }
    if (!confirm('Bạn có chắc chắn muốn xóa bảng chi phí chung này?')) return;
    setGeneralCostGroups(generalCostGroups.filter(g => g.id !== groupId));
  };

  const updateGeneralCostGroupName = (groupId: string, name: string) => {
    setGeneralCostGroups(generalCostGroups.map(g => g.id === groupId ? { ...g, tenBangChiPhi: name } : g));
  };

  const addGeneralCost = (groupId: string) => {
    const newItem: SelectedCostItem = { id: `gc-${Date.now()}`, costId: '', tenChiPhi: '', donViTinh: '', keHoach: 0, thucTe: 0 };
    setGeneralCostGroups(generalCostGroups.map(g => g.id === groupId ? { ...g, selectedCosts: [...g.selectedCosts, newItem] } : g));
  };

  const removeGeneralCost = (groupId: string, itemId: string) => {
    setGeneralCostGroups(generalCostGroups.map(g => g.id === groupId ? { ...g, selectedCosts: g.selectedCosts.filter(item => item.id !== itemId) } : g));
  };

  const updateGeneralCostSelection = (groupId: string, itemId: string, costId: string) => {
    if (costId === 'ALL') {
      setGeneralCostGroups(generalCostGroups.map(g => {
        if (g.id !== groupId) return g;
        const filteredCosts = g.selectedCosts.filter(item => item.id !== itemId);
        const newCosts = availableGeneralCosts.map(cost => ({ id: `${Date.now()}-${cost.id}`, costId: cost.id, tenChiPhi: cost.tenChiPhi, donViTinh: cost.donViTinh || '', keHoach: 0, thucTe: 0 }));
        return { ...g, selectedCosts: [...filteredCosts, ...newCosts] };
      }));
      return;
    }
    const selectedCost = availableGeneralCosts.find(c => c.id === costId);
    setGeneralCostGroups(generalCostGroups.map(g => g.id === groupId ? { ...g, selectedCosts: g.selectedCosts.map(item => item.id === itemId ? { ...item, costId, tenChiPhi: selectedCost?.tenChiPhi || '', donViTinh: selectedCost?.donViTinh || '' } : item) } : g));
  };

  const updateGeneralCostValue = (groupId: string, itemId: string, field: 'keHoach' | 'thucTe', value: number) => {
    setGeneralCostGroups(generalCostGroups.map(g => g.id === groupId ? { ...g, selectedCosts: g.selectedCosts.map(item => item.id === itemId ? { ...item, [field]: value } : item) } : g));
  };

  const updateGeneralCostGroupProducts = (groupId: string, productIds: string[]) => {
    setGeneralCostGroups(generalCostGroups.map(g => g.id === groupId ? { ...g, selectedProducts: productIds } : g));
  };

  // ── Handlers — export costs ───────────────────────────────────────────────

  const addExportCost = () => {
    setSelectedExportCosts([...selectedExportCosts, { id: `ec-${Date.now()}`, costId: '', tenChiPhi: '', donViTinh: '', keHoach: 0, thucTe: 0, keHoachUSD: 0, thucTeUSD: 0, tiGiaKeHoach: 0, tiGiaThucTe: 0 }]);
  };

  const removeExportCost = (id: string) => { setSelectedExportCosts(selectedExportCosts.filter(item => item.id !== id)); };

  const updateExportCostSelection = (itemId: string, costId: string) => {
    if (costId === 'ALL') {
      const filteredCosts = selectedExportCosts.filter(item => item.id !== itemId);
      const newCosts = availableExportCosts.map(cost => ({ id: `${Date.now()}-${cost.id}`, costId: cost.id, tenChiPhi: cost.tenChiPhi, donViTinh: cost.donViTinh || '', keHoach: 0, thucTe: 0 }));
      setSelectedExportCosts([...filteredCosts, ...newCosts]);
      return;
    }
    const selectedCost = availableExportCosts.find(c => c.id === costId);
    setSelectedExportCosts(selectedExportCosts.map(item => item.id === itemId ? { ...item, costId, tenChiPhi: selectedCost?.tenChiPhi || '', donViTinh: selectedCost?.donViTinh || '' } : item));
  };

  const updateExportCostValue = (itemId: string, field: 'keHoach' | 'thucTe', value: number) => {
    setSelectedExportCosts(selectedExportCosts.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const updateExportCostUSDValue = (itemId: string, field: 'keHoachUSD' | 'thucTeUSD', value: number) => {
    setSelectedExportCosts(selectedExportCosts.map(item => {
      if (item.id !== itemId) return item;
      const updatedItem = { ...item, [field]: value };
      if (field === 'keHoachUSD') updatedItem.keHoach = value * (item.tiGiaKeHoach || 0);
      else if (field === 'thucTeUSD') updatedItem.thucTe = value * (item.tiGiaThucTe || 0);
      return updatedItem;
    }));
  };

  const updateExportCostExchangeRate = (itemId: string, field: 'tiGiaKeHoach' | 'tiGiaThucTe', value: number) => {
    setSelectedExportCosts(selectedExportCosts.map(item => {
      if (item.id !== itemId) return item;
      const updatedItem = { ...item, [field]: value };
      if (field === 'tiGiaKeHoach') updatedItem.keHoach = (item.keHoachUSD || 0) * value;
      else if (field === 'tiGiaThucTe') updatedItem.thucTe = (item.thucTeUSD || 0) * value;
      return updatedItem;
    }));
  };

  // ── Inventory check ───────────────────────────────────────────────────────

  const handleCheckInventory = async (productName: string, materialName?: string) => {
    if (!productName && !materialName) { alert('Vui lòng chọn sản phẩm đầu ra hoặc nguyên liệu đầu vào trước'); return; }
    setInventoryCheckResult({ show: true, loading: true, productName: productName || '', materialName: materialName || '', items: [], materialItems: [] });
    try {
      const response = await warehouseService.getAllLotProducts() as any;
      const lotProducts = response.data?.data || response.data || [];
      const matchedProducts = productName ? lotProducts.filter((lp: any) => lp.internationalProduct?.tenSanPham === productName) : [];
      const items = matchedProducts.map((lp: any) => ({ tenKho: lp.lot?.warehouse?.tenKho || 'N/A', tenLo: lp.lot?.tenLo || 'N/A', soLuong: lp.soLuong || 0, giaThanh: lp.giaThanh || 0, donViTinh: lp.donViTinh || 'KG' }));
      const matchedMaterials = materialName ? lotProducts.filter((lp: any) => lp.internationalProduct?.tenSanPham === materialName) : [];
      const materialItems = matchedMaterials.map((lp: any) => ({ tenKho: lp.lot?.warehouse?.tenKho || 'N/A', tenLo: lp.lot?.tenLo || 'N/A', soLuong: lp.soLuong || 0, giaThanh: lp.giaThanh || 0, donViTinh: lp.donViTinh || 'KG' }));
      setInventoryCheckResult({ show: true, loading: false, productName: productName || '', materialName: materialName || '', items, materialItems });
    } catch (error) {
      console.error('Lỗi kiểm tra tồn kho:', error);
      setInventoryCheckResult({ show: true, loading: false, productName: productName || '', materialName: materialName || '', items: [], materialItems: [] });
    }
  };

  // ── Save helpers ──────────────────────────────────────────────────────────

  const buildCalculatorData = () => {
    if (!quotationRequest) return null;
    const items = getItems();
    const buildByProducts = (tab: MainTab) =>
      tab.selectedStandard?.items?.map((item: any) => {
        const tenSanPham = item.tenThanhPham;
        return {
          tenSanPham, tiLe: item.tiLe || 0,
          giaHoaVon: tab.formData.giaHoaVonSanPhamPhu?.[tenSanPham] ? parseFloat(tab.formData.giaHoaVonSanPhamPhu[tenSanPham]) : 0,
          tiLeThuHoiThucTe: tab.formData.tiLeThuHoiThucTe?.[tenSanPham] ? parseFloat(tab.formData.tiLeThuHoiThucTe[tenSanPham]) : undefined,
          giaHoaVonThucTe: tab.formData.giaHoaVonSanPhamPhuThucTe?.[tenSanPham] ? parseFloat(tab.formData.giaHoaVonSanPhamPhuThucTe[tenSanPham]) : undefined,
        };
      }) || [];

    const buildAdditionalByProducts = (tab: AdditionalCostTab) =>
      tab.formData.giaHoaVonSanPhamPhu
        ? Object.entries(tab.formData.giaHoaVonSanPhamPhu).map(([tenSanPham, giaHoaVon]) => {
            const matchedItem = tab.selectedStandard?.items?.find((item: any) => item.tenThanhPham === tenSanPham);
            return { tenSanPham, tiLe: matchedItem?.tiLe || 0, giaHoaVon: parseFloat(giaHoaVon as string) || 0 };
          })
        : [];

    return {
      quotationRequestId: quotationRequest.id,
      maYeuCauBaoGia: quotationRequest.maYeuCauBaoGia,
      phanTramThue: phanTramThue ? parseFloat(phanTramThue) : undefined,
      phanTramQuy: phanTramQuy ? parseFloat(phanTramQuy) : undefined,
      products: [
        ...tabsData.map((tab, index) => {
          const item = items[index];
          const giaHoaVonCalculated = calculateGiaHoaVonChinhPham(index);
          return {
            quotationRequestItemId: (item as any).id || quotationRequest.id,
            productId: (item as any).productId || quotationRequest.productId,
            tenSanPham: (item as any).tenSanPham || quotationRequest.tenSanPham,
            soLuong: (item as any).soLuong || quotationRequest.soLuong,
            donViTinh: (item as any).donViTinh || quotationRequest.donViTinh,
            maBaoGia: tab.formData.maBaoGia,
            materialStandardId: tab.selectedStandard?.id,
            maDinhMuc: tab.formData.maDinhMuc, tenDinhMuc: tab.formData.tenDinhMuc,
            tiLeThuHoi: tab.formData.tiLeThuHoi ? parseFloat(tab.formData.tiLeThuHoi) : undefined,
            sanPhamDauRa: tab.formData.sanPhamDauRa,
            thanhPhamTonKho: tab.formData.thanhPhamTonKho ? parseFloat(tab.formData.thanhPhamTonKho) : undefined,
            tongThanhPhamCanSxThem: tab.formData.tongThanhPhamCanSxThem ? parseFloat(tab.formData.tongThanhPhamCanSxThem) : undefined,
            tongNguyenLieuCanSanXuat: tab.formData.tongNguyenLieuCanSanXuat ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) : undefined,
            nguyenLieuTonKho: tab.formData.nguyenLieuTonKho ? parseFloat(tab.formData.nguyenLieuTonKho) : undefined,
            nguyenLieuCanNhapThem: tab.formData.nguyenLieuCanNhapThem ? parseFloat(tab.formData.nguyenLieuCanNhapThem) : undefined,
            tongKhoiLuongThanhPhamThucTe: tab.formData.tongKhoiLuongThanhPhamThucTe ? parseFloat(tab.formData.tongKhoiLuongThanhPhamThucTe) : undefined,
            thanhPhamTonKhoThucTe: tab.formData.thanhPhamTonKhoThucTe ? parseFloat(tab.formData.thanhPhamTonKhoThucTe) : undefined,
            tongThanhPhamCanSxThemThucTe: tab.formData.tongThanhPhamCanSxThemThucTe ? parseFloat(tab.formData.tongThanhPhamCanSxThemThucTe) : undefined,
            tongNguyenLieuCanSanXuatThucTe: tab.formData.tongNguyenLieuCanSanXuatThucTe ? parseFloat(tab.formData.tongNguyenLieuCanSanXuatThucTe) : undefined,
            loiNhuanCongThemThucTe: tab.formData.loiNhuanCongThemThucTe ? parseFloat(tab.formData.loiNhuanCongThemThucTe) : undefined,
            productionProcessId: tab.selectedProcess?.id,
            maQuyTrinhSanXuat: tab.selectedProcess?.maQuyTrinhSanXuat,
            tenQuyTrinhSanXuat: tab.selectedProcess?.tenQuyTrinhSanXuat || tab.selectedProcess?.tenQuyTrinh,
            flowchartData: tab.selectedProcess?.flowchart || undefined,
            thoiGianChoPhepToiDa: tab.formData.thoiGianChoPhepToiDa ? parseFloat(tab.formData.thoiGianChoPhepToiDa) : undefined,
            ngayBatDauSanXuat: tab.formData.ngayBatDauSanXuat ? new Date(tab.formData.ngayBatDauSanXuat + 'T00:00:00.000Z').toISOString() : undefined,
            ngayBatDauSanXuatThucTe: tab.formData.ngayBatDauSanXuatThucTe ? new Date(tab.formData.ngayBatDauSanXuatThucTe + 'T00:00:00.000Z').toISOString() : undefined,
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
            byProducts: buildByProducts(tab),
            isAdditionalCost: false,
          };
        }),
        ...additionalCostTabs.map((tab) => ({
          quotationRequestItemId: quotationRequest.id,
          productId: tab.selectedProduct?.id || '',
          tenSanPham: tab.selectedProduct?.tenSanPham || tab.tenChiPhiBoSung,
          tenChiPhiBoSung: tab.tenChiPhiBoSung,
          originalTabId: tab.id,
          soLuong: tab.formData.soLuong ? parseFloat(tab.formData.soLuong) : 0,
          donViTinh: tab.formData.donViTinh || '',
          maBaoGia: tab.formData.maBaoGia,
          materialStandardId: tab.selectedStandard?.id,
          maDinhMuc: tab.formData.maDinhMuc, tenDinhMuc: tab.formData.tenDinhMuc,
          tiLeThuHoi: tab.formData.tiLeThuHoi ? parseFloat(tab.formData.tiLeThuHoi) : undefined,
          sanPhamDauRa: tab.formData.sanPhamDauRa,
          thanhPhamTonKho: tab.formData.thanhPhamTonKho ? parseFloat(tab.formData.thanhPhamTonKho) : undefined,
          tongThanhPhamCanSxThem: tab.formData.tongThanhPhamCanSxThem ? parseFloat(tab.formData.tongThanhPhamCanSxThem) : undefined,
          tongNguyenLieuCanSanXuat: tab.formData.tongNguyenLieuCanSanXuat ? parseFloat(tab.formData.tongNguyenLieuCanSanXuat) : undefined,
          nguyenLieuTonKho: tab.formData.nguyenLieuTonKho ? parseFloat(tab.formData.nguyenLieuTonKho) : undefined,
          nguyenLieuCanNhapThem: tab.formData.nguyenLieuCanNhapThem ? parseFloat(tab.formData.nguyenLieuCanNhapThem) : undefined,
          productionProcessId: tab.selectedProcess?.id,
          maQuyTrinhSanXuat: tab.selectedProcess?.maQuyTrinhSanXuat,
          tenQuyTrinhSanXuat: tab.selectedProcess?.tenQuyTrinhSanXuat || tab.selectedProcess?.tenQuyTrinh,
          flowchartData: tab.selectedProcess?.flowchart || undefined,
          thoiGianChoPhepToiDa: tab.formData.thoiGianChoPhepToiDa ? parseFloat(tab.formData.thoiGianChoPhepToiDa) : undefined,
          ngayBatDauSanXuat: tab.formData.ngayBatDauSanXuat ? new Date(tab.formData.ngayBatDauSanXuat + 'T00:00:00.000Z').toISOString() : undefined,
          ngayBatDauSanXuatThucTe: tab.formData.ngayBatDauSanXuatThucTe ? new Date(tab.formData.ngayBatDauSanXuatThucTe + 'T00:00:00.000Z').toISOString() : undefined,
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
          byProducts: buildAdditionalByProducts(tab),
          isAdditionalCost: true,
        })),
      ],
      generalCosts: selectedGeneralCosts.map(cost => ({ costId: cost.costId, maChiPhi: cost.costId, tenChiPhi: cost.tenChiPhi, donViTinh: cost.donViTinh, keHoach: cost.keHoach, thucTe: cost.thucTe })),
      generalCostGroups: generalCostGroups.map(group => ({ id: group.id, tenBangChiPhi: group.tenBangChiPhi, selectedCosts: group.selectedCosts, selectedProducts: group.selectedProducts })),
      exportCosts: selectedExportCosts.map(cost => ({ costId: cost.costId, maChiPhi: cost.costId, tenChiPhi: cost.tenChiPhi, donViTinh: cost.donViTinh, keHoach: cost.keHoach, thucTe: cost.thucTe })),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotationRequest) { alert('Không tìm thấy thông tin yêu cầu báo giá'); return; }
    const items = getItems();
    const isOrderSummaryTab = activeTab === items.length + additionalCostTabs.length;
    const isRevenueTab = activeTab === items.length + additionalCostTabs.length + 1;
    setLoading(true);
    try {
      if (isOrderSummaryTab || isRevenueTab) { setLoading(false); setShowCreateQuotationModal(true); return; }
      const calculatorData = buildCalculatorData();
      if (calculatorData) await quotationCalculatorService.upsertCalculator(calculatorData);
      alert('Lưu dữ liệu thành công!');
    } catch (error: any) { console.error('Error in handleSubmit:', error); alert(error.response?.data?.message || 'Lỗi khi lưu dữ liệu'); }
    finally { setLoading(false); }
  };

  const handleSaveOrderSummaryData = async () => {
    if (!quotationRequest) { alert('Không tìm thấy thông tin yêu cầu báo giá'); return; }
    setLoading(true);
    try {
      const calculatorData = buildCalculatorData();
      if (calculatorData) await quotationCalculatorService.upsertCalculator(calculatorData);
      alert('Lưu dữ liệu thành công!');
    } catch (error: any) { console.error('Error in handleSaveOrderSummaryData:', error); alert(error.response?.data?.message || 'Lỗi khi lưu dữ liệu'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setTabsData([]);
    setActiveTab(0);
    setGeneralCostGroups([{ id: `gcg-${Date.now()}`, tenBangChiPhi: 'Chi phí chung 1', selectedCosts: [], selectedProducts: [] }]);
    setSelectedExportCosts([]);
    setPhanTramThue('');
    setPhanTramQuy('');
  };

  const clearSavedData = async () => {
    if (!quotationRequest) return;
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu đã lưu?')) return;
    try {
      await quotationCalculatorService.deleteCalculator(quotationRequest.id);
      await initializeTabs();
      alert('Đã xóa dữ liệu đã lưu và khởi tạo lại!');
    } catch (error: any) { console.error('Error clearing saved data:', error); alert(error.response?.data?.message || 'Lỗi khi xóa dữ liệu'); }
  };

  const handleCreateQuotation = async () => {
    if (!quotationRequest) return;
    if (!quotationFormData.hieuLucBaoGia) { alert('Vui lòng nhập hiệu lực báo giá'); return; }
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const tenNhanVien = user?.firstName && user?.lastName ? `${user.lastName} ${user.firstName}` : user?.name || user?.email || 'Unknown';
      const data = { hieuLucBaoGia: parseInt(quotationFormData.hieuLucBaoGia), tinhTrang: quotationFormData.tinhTrang, ghiChu: quotationFormData.ghiChu || undefined, employeeId: user?.id || undefined, tenNhanVien };
      await quotationCalculatorService.createQuotationFromCalculator(quotationRequest.id, data);
      alert('Tạo báo giá thành công!');
      setShowCreateQuotationModal(false);
      setQuotationFormData({ hieuLucBaoGia: '', tinhTrang: 'DANG_CHO_PHAN_HOI', ghiChu: '' });
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) { console.error('Error creating quotation:', error); alert(error.response?.data?.message || 'Lỗi khi tạo báo giá'); }
    finally { setLoading(false); }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const items = getItems();
  const isOrderSummaryTab = activeTab === items.length + additionalCostTabs.length;
  const isRevenueTab = activeTab === items.length + additionalCostTabs.length + 1;
  const isAdditionalCostTab = activeTab >= items.length && activeTab < items.length + additionalCostTabs.length;
  const currentAdditionalTabIndex = isAdditionalCostTab ? activeTab - items.length : -1;
  const currentAdditionalTab = isAdditionalCostTab ? additionalCostTabs[currentAdditionalTabIndex] : null;
  const currentTab = isOrderSummaryTab || isRevenueTab || isAdditionalCostTab ? null : (tabsData[activeTab] || null);
  const currentItem = isOrderSummaryTab || isRevenueTab || isAdditionalCostTab ? null : items[activeTab];

  return {
    // State
    loading, materialStandards, productionProcesses, availableGeneralCosts, availableExportCosts, availableProducts,
    selectedExportCosts, generalCostGroups, showProductSelectionModal, editingGeneralCostGroupId,
    phanTramThue, setPhanTramThue, phanTramQuy, setPhanTramQuy,
    inventoryCheckResult, setInventoryCheckResult,
    showCreateQuotationModal, setShowCreateQuotationModal,
    quotationFormData, setQuotationFormData,
    activeTab, setActiveTab, tabsData, setTabsData, additionalCostTabs, setAdditionalCostTabs,
    showAddCostModal, setShowAddCostModal, newCostName, setNewCostName,
    flowchartInputValues, setFlowchartInputValues,
    additionalFlowchartInputValues, setAdditionalFlowchartInputValues,
    setShowProductSelectionModal, setEditingGeneralCostGroupId,
    // Computed
    selectedGeneralCosts, selectedProductsForGeneralCosts,
    items, isOrderSummaryTab, isRevenueTab, isAdditionalCostTab,
    currentAdditionalTabIndex, currentAdditionalTab, currentTab, currentItem,
    // Calculation helpers
    calculateGiaHoaVonChinhPham, calculateGiaHoaVonChinhPhamThucTe,
    calculateSoKgChinhPham, calculateSoKgChinhPhamThucTe,
    calculateChiPhiSanXuatKeHoach, getTotalGeneralCosts, getTotalExportCosts,
    // Handlers — main tab
    updateFormData, handleStandardChange, handleProcessChange, handleFlowchartCostChange,
    handleOutputProductChange, handleInventoryChange, handleInventoryThucTeChange,
    handleTiLeThuHoiChange, handleMaterialInventoryChange, handleCheckInventory,
    // Handlers — additional cost tab
    updateAdditionalTabFormData, handleAdditionalTabStandardChange, handleAdditionalTabProcessChange,
    handleAdditionalTabProductTypeChange, handleAdditionalTabProductChange, handleAdditionalTabFlowchartCostChange,
    handleAdditionalTabOutputProductChange, handleAdditionalTabInventoryChange, handleAdditionalTabTiLeThuHoiChange,
    handleAdditionalTabMaterialInventoryChange, handleAddAdditionalCost, handleRemoveAdditionalCost,
    // Handlers — general cost groups
    addGeneralCostGroup, removeGeneralCostGroup, updateGeneralCostGroupName, addGeneralCost, removeGeneralCost,
    updateGeneralCostSelection, updateGeneralCostValue, updateGeneralCostGroupProducts,
    // Handlers — export costs
    addExportCost, removeExportCost, updateExportCostSelection, updateExportCostValue,
    updateExportCostUSDValue, updateExportCostExchangeRate,
    // Submit / save
    handleSubmit, handleSaveOrderSummaryData, resetForm, clearSavedData, handleCreateQuotation,
    getItems,
  };
}
