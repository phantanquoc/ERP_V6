import React from 'react';
import { X, Plus, Trash2, PlusCircle, Users, Package, FileText, Printer } from 'lucide-react';
import DatePicker from '../DatePicker';
import { QuotationRequest } from '../../services/quotationRequestService';
import { parseNumberInputStr } from '../../utils/numberInput';
import Modal from '../Modal';
import { useQuotationCalculator } from '../../hooks/useQuotationCalculator';
import { formatNumberWithDots, parseNumberFromDots, handleNumericInput } from './utils';
import InventoryCheckPopup from './InventoryCheckPopup';
import CreateQuotationSubModal from './CreateQuotationSubModal';
import ProductSelectionModal from './ProductSelectionModal';
import { SERVER_BASE_URL } from '../../config/api';

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
  const {
    loading,
    materialStandards,
    productionProcesses,
    availableGeneralCosts,
    availableExportCosts,
    availableProducts,
    selectedExportCosts,
    generalCostGroups,
    showProductSelectionModal,
    editingGeneralCostGroupId,
    phanTramThue, setPhanTramThue,
    phanTramQuy, setPhanTramQuy,
    inventoryCheckResult, setInventoryCheckResult,
    showCreateQuotationModal, setShowCreateQuotationModal,
    quotationFormData, setQuotationFormData,
    activeTab, setActiveTab,
    tabsData, setTabsData,
    additionalCostTabs, setAdditionalCostTabs,
    showAddCostModal, setShowAddCostModal,
    newCostName, setNewCostName,
    flowchartInputValues, setFlowchartInputValues,
    additionalFlowchartInputValues, setAdditionalFlowchartInputValues,
    setShowProductSelectionModal, setEditingGeneralCostGroupId,
    selectedGeneralCosts,
    items, isOrderSummaryTab, isRevenueTab, isAdditionalCostTab,
    currentAdditionalTab, currentTab, currentItem,
    calculateGiaHoaVonChinhPham, calculateGiaHoaVonChinhPhamThucTe,
    calculateSoKgChinhPham, calculateSoKgChinhPhamThucTe,
    getTotalGeneralCosts, getTotalExportCosts,
    updateFormData, handleStandardChange, handleProcessChange, handleFlowchartCostChange,
    handleOutputProductChange, handleInventoryChange, handleInventoryThucTeChange,
    handleTiLeThuHoiChange, handleMaterialInventoryChange, handleCheckInventory,
    updateAdditionalTabFormData, handleAdditionalTabStandardChange, handleAdditionalTabProcessChange,
    handleAdditionalTabProductTypeChange, handleAdditionalTabProductChange, handleAdditionalTabFlowchartCostChange,
    handleAdditionalTabOutputProductChange, handleAdditionalTabInventoryChange, handleAdditionalTabTiLeThuHoiChange,
    handleAdditionalTabMaterialInventoryChange, handleAddAdditionalCost, handleRemoveAdditionalCost,
    addGeneralCostGroup, removeGeneralCostGroup, updateGeneralCostGroupName, addGeneralCost, removeGeneralCost,
    updateGeneralCostSelection, updateGeneralCostValue, updateGeneralCostGroupProducts,
    addExportCost, removeExportCost, updateExportCostSelection, updateExportCostValue,
    updateExportCostUSDValue, updateExportCostExchangeRate,
    handleSubmit, handleSaveOrderSummaryData, clearSavedData, handleCreateQuotation,
    getItems,
  } = useQuotationCalculator(isOpen, quotationRequest, onClose, onSuccess);

  const [previewFileUrl, setPreviewFileUrl] = React.useState<string | null>(null);

  const getFullFileUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${SERVER_BASE_URL}${url}`;
  };

  const getFileName = (url: string) => {
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

  if (!isOpen || !quotationRequest || tabsData.length === 0) return null;

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-blue-600 shrink-0">
          <h3 className="text-base font-bold text-white">BẢNG TÍNH CHI PHÍ</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSavedData}
              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
              title="Xóa dữ liệu đã lưu và khởi tạo lại"
            >
              Xóa dữ liệu đã lưu
            </button>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto shrink-0">
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
                onClick={(e) => { e.stopPropagation(); handleRemoveAdditionalCost(tab.id); }}
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
          {/* Tab Tổng chi phí đơn hàng */}
          <button
            type="button"
            onClick={() => setActiveTab(items.length + additionalCostTabs.length)}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === items.length + additionalCostTabs.length
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Tổng chi phí đơn hàng
          </button>
          {/* Tab Doanh thu & lợi nhuận */}
          <button
            type="button"
            onClick={() => setActiveTab(items.length + additionalCostTabs.length + 1)}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === items.length + additionalCostTabs.length + 1
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Doanh thu & lợi nhuận
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          {/* ── Tab: Tổng chi phí đơn hàng ── */}
          {isOrderSummaryTab ? (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h4 className="text-xl font-semibold text-gray-900">Chi phí đơn hàng</h4>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Chi phí</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-48">Kế hoạch (VNĐ)</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-48">Thực tế (VNĐ)</th>
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
                              totalKeHoach += (cost.soLuongKeHoach || 0) * (cost.giaKeHoach || 0);
                              totalThucTe += (cost.soLuongThucTe || 0) * (cost.giaThucTe || 0);
                            });
                          });
                        }
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm text-gray-900">
                              <div className="flex items-center gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center">{index + 1}</span>
                                <span>{item.tenSanPham}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">
                              {(totalKeHoach * (parseFloat(tab?.formData?.thoiGianChoPhepToiDa || '1') || 1)).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">{totalThucTe.toLocaleString('vi-VN')}</td>
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
                              totalKeHoach += (cost.soLuongKeHoach || 0) * (cost.giaKeHoach || 0);
                              totalThucTe += (cost.soLuongThucTe || 0) * (cost.giaThucTe || 0);
                            });
                          });
                        }
                        return (
                          <tr key={`additional-${tab.id}`} className="hover:bg-green-50 bg-green-50/30">
                            <td className="px-6 py-3 text-sm text-gray-900">
                              <div className="flex items-center gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded bg-green-100 text-green-600 text-xs font-medium flex items-center justify-center">BS{index + 1}</span>
                                <span className="text-green-700">{tab.tenChiPhiBoSung}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-right font-medium text-green-700">
                              {(totalKeHoach * (parseFloat(tab?.formData?.thoiGianChoPhepToiDa || '1') || 1)).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-3 text-sm text-right font-medium text-green-700">{totalThucTe.toLocaleString('vi-VN')}</td>
                            <td className="px-6 py-3"></td>
                          </tr>
                        );
                      })}

                      {/* Divider - Chi phí chung */}
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="px-6 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 uppercase">Chi phí chung ({generalCostGroups.length} bảng)</span>
                            <button type="button" onClick={addGeneralCostGroup} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors border border-purple-300">
                              <PlusCircle className="w-3 h-3" />
                              Thêm bảng chi phí chung
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Render each general cost group */}
                      {generalCostGroups.map((group) => (
                        <React.Fragment key={group.id}>
                          <tr className="bg-purple-50">
                            <td colSpan={4} className="px-6 py-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <input type="text" value={group.tenBangChiPhi} onChange={(e) => updateGeneralCostGroupName(group.id, e.target.value)} className="px-2 py-1 text-sm font-medium text-purple-800 bg-transparent border-b border-purple-300 focus:border-purple-500 focus:outline-none" placeholder="Tên bảng chi phí" />
                                  <button type="button" onClick={() => { setEditingGeneralCostGroupId(group.id); setShowProductSelectionModal(true); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors border border-green-300" title="Chọn sản phẩm cho bảng chi phí này">
                                    <Users className="w-3 h-3" />
                                    Chọn SP ({group.selectedProducts.length > 0 ? group.selectedProducts.length : 'Tất cả'})
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => addGeneralCost(group.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors">
                                    <Plus className="w-3 h-3" />
                                    Thêm chi phí
                                  </button>
                                  {generalCostGroups.length > 1 && (
                                    <button type="button" onClick={() => removeGeneralCostGroup(group.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors" title="Xóa bảng chi phí này">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                          {group.selectedCosts.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3">
                                <select value={item.costId} onChange={(e) => updateGeneralCostSelection(group.id, item.id, e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                  <option value="">-- Chọn chi phí --</option>
                                  <option value="ALL" className="font-semibold">-- Tất cả --</option>
                                  {availableGeneralCosts.map((cost) => (<option key={cost.id} value={cost.id}>{cost.tenChiPhi}</option>))}
                                </select>
                              </td>
                              <td className="px-6 py-3">
                                <input type="text" value={formatNumberWithDots(item.keHoach)} onChange={(e) => updateGeneralCostValue(group.id, item.id, 'keHoach', parseNumberFromDots(e.target.value))} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
                              </td>
                              <td className="px-6 py-3">
                                <input type="text" value={formatNumberWithDots(item.thucTe)} onChange={(e) => updateGeneralCostValue(group.id, item.id, 'thucTe', parseNumberFromDots(e.target.value))} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
                              </td>
                              <td className="px-6 py-3 text-center">
                                <button type="button" onClick={() => removeGeneralCost(group.id, item.id)} className="text-gray-400 hover:text-red-600 p-1" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          ))}
                          {group.selectedCosts.length > 0 && (
                            <tr className="bg-purple-50/50">
                              <td className="px-6 py-2 text-sm font-medium text-purple-800 text-right">Tổng {group.tenBangChiPhi}</td>
                              <td className="px-6 py-2 text-sm font-bold text-purple-800 text-right">{group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0).toLocaleString('vi-VN')}</td>
                              <td className="px-6 py-2 text-sm font-bold text-purple-800 text-right">{group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0).toLocaleString('vi-VN')}</td>
                              <td className="px-6 py-2"></td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}

                      {/* Tổng tất cả chi phí chung */}
                      {selectedGeneralCosts.length > 0 && (
                        <tr className="bg-blue-50">
                          <td className="px-6 py-2.5 text-sm font-semibold text-gray-900 text-right">Tổng tất cả chi phí chung</td>
                          <td className="px-6 py-2.5 text-sm font-bold text-gray-900 text-right">{selectedGeneralCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0).toLocaleString('vi-VN')}</td>
                          <td className="px-6 py-2.5 text-sm font-bold text-gray-900 text-right">{selectedGeneralCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0).toLocaleString('vi-VN')}</td>
                          <td className="px-6 py-2.5"></td>
                        </tr>
                      )}

                      {/* Divider - Chi phí xuất khẩu */}
                      <tr className="bg-gray-100">
                        <td colSpan={4} className="px-6 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 uppercase">Chi phí xuất khẩu</span>
                            <button type="button" onClick={addExportCost} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors">
                              <Plus className="w-3 h-3" />
                              Thêm
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Chi phí xuất khẩu rows */}
                      {selectedExportCosts.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <select value={item.costId} onChange={(e) => updateExportCostSelection(item.id, e.target.value)} className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              <option value="">-- Chọn chi phí --</option>
                              <option value="ALL" className="font-semibold">-- Tất cả --</option>
                              {availableExportCosts.map((cost) => (<option key={cost.id} value={cost.id}>{cost.tenChiPhi}</option>))}
                            </select>
                          </td>
                          <td className="px-6 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <input type="text" value={formatNumberWithDots(item.keHoachUSD)} onChange={(e) => updateExportCostUSDValue(item.id, 'keHoachUSD', parseNumberFromDots(e.target.value))} className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="USD" />
                                <span className="text-xs text-gray-500">×</span>
                                <input type="text" value={formatNumberWithDots(item.tiGiaKeHoach)} onChange={(e) => updateExportCostExchangeRate(item.id, 'tiGiaKeHoach', parseNumberFromDots(e.target.value))} className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Tỉ giá" />
                              </div>
                              <input type="text" value={formatNumberWithDots(item.keHoach)} onChange={(e) => updateExportCostValue(item.id, 'keHoach', parseNumberFromDots(e.target.value))} className="w-full px-3 py-1.5 text-sm border border-blue-300 rounded-md text-right font-medium text-blue-700 bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="VNĐ" />
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <input type="text" value={formatNumberWithDots(item.thucTeUSD)} onChange={(e) => updateExportCostUSDValue(item.id, 'thucTeUSD', parseNumberFromDots(e.target.value))} className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="USD" />
                                <span className="text-xs text-gray-500">×</span>
                                <input type="text" value={formatNumberWithDots(item.tiGiaThucTe)} onChange={(e) => updateExportCostExchangeRate(item.id, 'tiGiaThucTe', parseNumberFromDots(e.target.value))} className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Tỉ giá" />
                              </div>
                              <input type="text" value={formatNumberWithDots(item.thucTe)} onChange={(e) => updateExportCostValue(item.id, 'thucTe', parseNumberFromDots(e.target.value))} className="w-full px-3 py-1.5 text-sm border border-green-300 rounded-md text-right font-medium text-green-700 bg-green-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="VNĐ" />
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <button type="button" onClick={() => removeExportCost(item.id)} className="text-gray-400 hover:text-red-600 p-1" title="Xóa"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}

                      {/* Tổng chi phí xuất khẩu */}
                      {selectedExportCosts.length > 0 && (
                        <tr className="bg-blue-50">
                          <td className="px-6 py-2.5 text-sm font-semibold text-gray-900 text-right">Tổng chi phí xuất khẩu</td>
                          <td className="px-6 py-2.5 text-sm font-bold text-gray-900 text-right">{selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0).toLocaleString('vi-VN')}</td>
                          <td className="px-6 py-2.5 text-sm font-bold text-gray-900 text-right">{selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0).toLocaleString('vi-VN')}</td>
                          <td className="px-6 py-2.5"></td>
                        </tr>
                      )}

                      {/* TỔNG CHI PHÍ ĐƠN HÀNG */}
                      <tr className="bg-gray-700">
                        <td className="px-6 py-3 text-sm font-bold text-white uppercase">Tổng chi phí đơn hàng</td>
                        <td className="px-6 py-3 text-base font-bold text-white text-right">
                          {(() => {
                            let total = 0;
                            tabsData.forEach(tab => { if (tab?.selectedProcess?.flowchart?.sections) { let pt = 0; tab.selectedProcess.flowchart.sections.forEach(s => s.costs?.forEach(c => { pt += (c.soLuongKeHoach||0)*(c.giaKeHoach||0); })); total += pt*(parseFloat(tab?.formData?.thoiGianChoPhepToiDa||'1')||1); } });
                            additionalCostTabs.forEach(tab => { if (tab?.selectedProcess?.flowchart?.sections) { let pt = 0; tab.selectedProcess.flowchart.sections.forEach(s => s.costs?.forEach(c => { pt += (c.soLuongKeHoach||0)*(c.giaKeHoach||0); })); total += pt*(parseFloat(tab?.formData?.thoiGianChoPhepToiDa||'1')||1); } });
                            total += getTotalGeneralCosts().keHoach + getTotalExportCosts().keHoach;
                            return total.toLocaleString('vi-VN');
                          })()} VNĐ
                        </td>
                        <td className="px-6 py-3 text-base font-bold text-white text-right">
                          {(() => {
                            let total = 0;
                            tabsData.forEach(tab => { if (tab?.selectedProcess?.flowchart?.sections) { tab.selectedProcess.flowchart.sections.forEach(s => s.costs?.forEach(c => { total += (c.soLuongThucTe||0)*(c.giaThucTe||0); })); } });
                            additionalCostTabs.forEach(tab => { if (tab?.selectedProcess?.flowchart?.sections) { tab.selectedProcess.flowchart.sections.forEach(s => s.costs?.forEach(c => { total += (c.soLuongThucTe||0)*(c.giaThucTe||0); })); } });
                            total += getTotalGeneralCosts().thucTe + getTotalExportCosts().thucTe;
                            return total.toLocaleString('vi-VN');
                          })()} VNĐ
                        </td>
                        <td className="px-6 py-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : isRevenueTab ? (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-3">
                  <h4 className="text-base font-semibold text-white uppercase tracking-wide">Tính toán doanh thu &amp; lợi nhuận</h4>
                </div>
                <div className="p-6 space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Doanh thu dự kiến</span>
                    </div>
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-blue-400">
                      <span className="text-xs text-gray-600">Kế hoạch</span>
                      <span className="text-lg font-bold text-gray-900">
                        {(() => {
                          let doanhThuDuKien = 0;
                          tabsData.forEach((tab, index) => {
                            const soKgChinhPham = calculateSoKgChinhPham(index);
                            const giaHoaVon = calculateGiaHoaVonChinhPham(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThem || '0');
                            doanhThuDuKien += (giaHoaVon + loiNhuan) * soKgChinhPham;
                          });
                          return doanhThuDuKien.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-green-400 mt-1">
                      <span className="text-xs text-gray-600">Thực tế</span>
                      <span className="text-lg font-bold text-green-700">
                        {(() => {
                          let doanhThuThucTe = 0;
                          tabsData.forEach((tab, index) => {
                            const soKg = calculateSoKgChinhPhamThucTe(index);
                            const giaHV = calculateGiaHoaVonChinhPhamThucTe(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThemThucTe || '0');
                            doanhThuThucTe += (giaHV + loiNhuan) * soKg;
                          });
                          return doanhThuThucTe.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">= Σ (giá báo khách × số KG sản phẩm chính)</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Lợi nhuận trước thuế</span>
                    </div>
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-blue-400">
                      <span className="text-xs text-gray-600">Kế hoạch</span>
                      <span className="text-lg font-bold text-gray-900">
                        {(() => {
                          let loiNhuanTruocThue = 0;
                          tabsData.forEach((tab, index) => {
                            const soKg = calculateSoKgChinhPham(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThem || '0');
                            loiNhuanTruocThue += loiNhuan * soKg;
                          });
                          return loiNhuanTruocThue.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-green-400 mt-1">
                      <span className="text-xs text-gray-600">Thực tế</span>
                      <span className="text-lg font-bold text-green-700">
                        {(() => {
                          let loiNhuanTruocThueThucTe = 0;
                          tabsData.forEach((tab, index) => {
                            const soKg = calculateSoKgChinhPhamThucTe(index);
                            const loiNhuan = parseFloat(tab.formData.loiNhuanCongThemThucTe || '0');
                            loiNhuanTruocThueThucTe += loiNhuan * soKg;
                          });
                          return loiNhuanTruocThueThucTe.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">= Σ (lợi nhuận cộng thêm × số kg thành phẩm chính)</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-300">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Phần trăm thuế (%)</label>
                      <input type="number" step="0.01" min="0" max="100" value={phanTramThue} onChange={(e) => setPhanTramThue(parseNumberInputStr(e.target.value))} className="w-32 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-semibold text-right" placeholder="0.00" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Nhập phần trăm thuế (0-100)</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Lợi nhuận sau thuế</span>
                    </div>
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-blue-400">
                      <span className="text-xs text-gray-600">Kế hoạch</span>
                      <span className="text-lg font-bold text-gray-900">
                        {(() => {
                          let lnt = 0;
                          tabsData.forEach((tab, index) => { lnt += parseFloat(tab.formData.loiNhuanCongThem || '0') * calculateSoKgChinhPham(index); });
                          const thue = parseFloat(phanTramThue || '0');
                          return (lnt - lnt * thue / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-green-400 mt-1">
                      <span className="text-xs text-gray-600">Thực tế</span>
                      <span className="text-lg font-bold text-green-700">
                        {(() => {
                          let lnt = 0;
                          tabsData.forEach((tab, index) => { lnt += parseFloat(tab.formData.loiNhuanCongThemThucTe || '0') * calculateSoKgChinhPhamThucTe(index); });
                          const thue = parseFloat(phanTramThue || '0');
                          return (lnt - lnt * thue / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">= lợi nhuận trước thuế - (lợi nhuận trước thuế × % thuế)</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-300">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-700">Phần trăm quỹ (%)</label>
                      <input type="number" step="0.01" min="0" max="100" value={phanTramQuy} onChange={(e) => setPhanTramQuy(parseNumberInputStr(e.target.value))} className="w-32 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-semibold text-right" placeholder="0.00" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Nhập phần trăm quỹ (0-100)</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Trích các quỹ</span>
                    </div>
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-blue-400">
                      <span className="text-xs text-gray-600">Kế hoạch</span>
                      <span className="text-lg font-bold text-gray-900">
                        {(() => {
                          let lnt = 0;
                          tabsData.forEach((tab, index) => { lnt += parseFloat(tab.formData.loiNhuanCongThem || '0') * calculateSoKgChinhPham(index); });
                          const thue = parseFloat(phanTramThue || '0');
                          const lst = lnt - lnt * thue / 100;
                          return (lst * parseFloat(phanTramQuy || '0') / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-green-400 mt-1">
                      <span className="text-xs text-gray-600">Thực tế</span>
                      <span className="text-lg font-bold text-green-700">
                        {(() => {
                          let lnt = 0;
                          tabsData.forEach((tab, index) => { lnt += parseFloat(tab.formData.loiNhuanCongThemThucTe || '0') * calculateSoKgChinhPhamThucTe(index); });
                          const thue = parseFloat(phanTramThue || '0');
                          const lst = lnt - lnt * thue / 100;
                          return (lst * parseFloat(phanTramQuy || '0') / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">= lợi nhuận sau thuế × % quỹ</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-300 hover:bg-blue-100 hover:shadow-md hover:scale-[1.02] transition-all duration-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Lợi nhuận thực nhận</span>
                    </div>
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-blue-400">
                      <span className="text-xs text-gray-600">Kế hoạch</span>
                      <span className="text-xl font-bold text-blue-700">
                        {(() => {
                          let lnt = 0;
                          tabsData.forEach((tab, index) => { lnt += parseFloat(tab.formData.loiNhuanCongThem || '0') * calculateSoKgChinhPham(index); });
                          const thue = parseFloat(phanTramThue || '0');
                          const lst = lnt - lnt * thue / 100;
                          const quy = parseFloat(phanTramQuy || '0');
                          return (lst - lst * quy / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pl-4 py-1 border-l-2 border-green-400 mt-1">
                      <span className="text-xs text-gray-600">Thực tế</span>
                      <span className="text-xl font-bold text-green-700">
                        {(() => {
                          let lnt = 0;
                          tabsData.forEach((tab, index) => { lnt += parseFloat(tab.formData.loiNhuanCongThemThucTe || '0') * calculateSoKgChinhPhamThucTe(index); });
                          const thue = parseFloat(phanTramThue || '0');
                          const lst = lnt - lnt * thue / 100;
                          const quy = parseFloat(phanTramQuy || '0');
                          return (lst - lst * quy / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">= lợi nhuận sau thuế - trích các quỹ</p>
                  </div>
                </div>
              </div>
            </div>
          ) : isAdditionalCostTab && currentAdditionalTab ? (
            <div className="space-y-5">
              {/* ========== SECTION 1: THÔNG TIN SẢN PHẨM BỔ SUNG ========== */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-gray-200">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  <h4 className="text-sm font-semibold text-slate-800">Thông tin sản phẩm</h4>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Tên chi phí bổ sung</label>
                      <input type="text" value={currentAdditionalTab.tenChiPhiBoSung} disabled className="w-full px-3 py-2 text-sm border border-orange-200 rounded-md bg-orange-50 font-semibold text-gray-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Loại sản phẩm <span className="text-red-500">*</span></label>
                      <select value={currentAdditionalTab.selectedProductType || ''} onChange={(e) => handleAdditionalTabProductTypeChange(currentAdditionalTab.id, e.target.value)} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">-- Chọn loại SP --</option>
                        {Array.from(new Set(availableProducts.map((p) => p.loaiSanPham).filter(Boolean))).map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Tên sản phẩm <span className="text-red-500">*</span></label>
                      <select value={currentAdditionalTab.selectedProduct?.id || ''} onChange={(e) => handleAdditionalTabProductChange(currentAdditionalTab.id, e.target.value)} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" disabled={!currentAdditionalTab.selectedProductType}>
                        <option value="">-- Chọn SP --</option>
                        {availableProducts.filter((p) => p.loaiSanPham === currentAdditionalTab.selectedProductType).map((product) => (
                          <option key={product.id} value={product.id}>{product.tenSanPham}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Khối lượng</label>
                        <input type="number" value={currentAdditionalTab.formData.soLuong || ''} onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'soLuong', parseNumberInputStr(e.target.value))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500" placeholder="Nhập" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Đơn vị</label>
                        <input type="text" value={currentAdditionalTab.formData.donViTinh || ''} onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'donViTinh', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500" placeholder="Nhập" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Mã định mức NVL</label>
                      <select value={currentAdditionalTab.selectedStandard?.id || ''} onChange={(e) => handleAdditionalTabStandardChange(currentAdditionalTab.id, e.target.value)} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">-- Chọn định mức --</option>
                        {materialStandards.map((standard) => (
                          <option key={standard.id} value={standard.id}>{standard.maDinhMuc} : {standard.tenDinhMuc}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ========== SECTION 2+3: NGUYÊN LIỆU, TỒN KHO & SẢN XUẤT ========== */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <h4 className="text-sm font-semibold text-slate-800">Nguyên liệu, Tồn kho &amp; Sản xuất</h4>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Cột trái: Nguyên liệu & Tồn kho */}
                    <div className="overflow-x-auto">
                      <div className="flex gap-2 items-end mb-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-500 mb-1">NL đầu vào</label>
                          <select value={currentAdditionalTab.formData.nguyenLieuDauVao} onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'nguyenLieuDauVao', e.target.value)} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Chọn NL --</option>
                            {currentAdditionalTab.selectedStandard?.inputItems?.map((item) => (
                              <option key={item.tenNguyenLieu} value={item.tenNguyenLieu}>{item.tenNguyenLieu}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-500 mb-1">SP đầu ra</label>
                          <select value={currentAdditionalTab.formData.sanPhamDauRa} onChange={(e) => handleAdditionalTabOutputProductChange(currentAdditionalTab.id, e.target.value)} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Chọn SP --</option>
                            {currentAdditionalTab.selectedStandard?.items?.map((item) => (
                              <option key={item.tenThanhPham} value={item.tenThanhPham}>{item.tenThanhPham}</option>
                            ))}
                          </select>
                        </div>
                        <button type="button" onClick={() => handleCheckInventory(currentAdditionalTab.formData.sanPhamDauRa, currentAdditionalTab.formData.nguyenLieuDauVao)} disabled={!currentAdditionalTab.formData.sanPhamDauRa && !currentAdditionalTab.formData.nguyenLieuDauVao} className="px-2.5 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1 transition-colors flex-shrink-0" title="Kiểm tra tồn kho">
                          <Package className="w-3.5 h-3.5" />
                          Tồn kho
                        </button>
                      </div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Nguyên liệu &amp; Tồn kho
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Chỉ tiêu</th>
                            <th className="text-center py-1.5 px-2 text-xs font-semibold text-blue-600 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>KH</span></th>
                            <th className="text-center py-1.5 px-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>TT</span></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          <tr className="hover:bg-gray-50/50">
                            <td className="py-1.5 px-2 text-sm text-gray-700">Thành phẩm tồn kho</td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.thanhPhamTonKho} onChange={(e) => handleAdditionalTabInventoryChange(currentAdditionalTab.id, parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Nhập" /></td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.thanhPhamTonKho || ''} onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'thanhPhamTonKho', parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white" placeholder="Nhập" /></td>
                          </tr>
                          <tr className="hover:bg-gray-50/50">
                            <td className="py-1.5 px-2 text-sm text-gray-700"><span className="flex items-center gap-1">Tổng TP cần SX thêm <span className="text-[10px] text-gray-400 italic">fx</span></span></td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.tongThanhPhamCanSxThem} disabled className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-blue-700 font-medium" /></td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.tongThanhPhamCanSxThem || ''} disabled className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-emerald-700 font-medium" /></td>
                          </tr>
                          <tr className="hover:bg-gray-50/50">
                            <td className="py-1.5 px-2 text-sm text-gray-700"><span className="flex items-center gap-1">Tổng NL cần SX <span className="text-[10px] text-gray-400 italic">fx</span></span></td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.tongNguyenLieuCanSanXuat} disabled className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-blue-700 font-medium" /></td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.tongNguyenLieuCanSanXuat || ''} onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'tongNguyenLieuCanSanXuat', parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white" placeholder="Nhập" /></td>
                          </tr>
                          <tr className="hover:bg-gray-50/50">
                            <td className="py-1.5 px-2 text-sm text-gray-700">NL tồn kho</td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.nguyenLieuTonKho} onChange={(e) => handleAdditionalTabMaterialInventoryChange(currentAdditionalTab.id, parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Nhập" /></td>
                            <td className="py-1.5 px-2"><span className="block text-center text-xs text-gray-400">-</span></td>
                          </tr>
                          <tr className="hover:bg-gray-50/50">
                            <td className="py-1.5 px-2 text-sm text-gray-700"><span className="flex items-center gap-1">NL cần nhập thêm <span className="text-[10px] text-gray-400 italic">fx</span></span></td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.nguyenLieuCanNhapThem} disabled className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-blue-700 font-medium" /></td>
                            <td className="py-1.5 px-2"><span className="block text-center text-xs text-gray-400">-</span></td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
                        <textarea value={currentAdditionalTab.formData.ghiChu || ''} onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'ghiChu', e.target.value)} rows={2} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Nhập ghi chú (nếu có)" />
                      </div>
                    </div>

                    {/* Cột phải: Sản xuất & Thời gian */}
                    <div className="overflow-x-auto">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Sản xuất &amp; Thời gian
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Chỉ tiêu</th>
                            <th className="text-center py-1.5 px-2 text-xs font-semibold text-blue-600 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>KH</span></th>
                            <th className="text-center py-1.5 px-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>TT</span></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          <tr className="hover:bg-gray-50/50">
                            <td className="py-1.5 px-2 text-sm text-gray-700">Tỉ lệ thu hồi (%)</td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.tiLeThuHoi} onChange={(e) => handleAdditionalTabTiLeThuHoiChange(currentAdditionalTab.id, parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Nhập" /></td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.tongKhoiLuongThanhPhamThucTe && currentAdditionalTab.formData.tongNguyenLieuCanSanXuat ? ((parseFloat(currentAdditionalTab.formData.tongKhoiLuongThanhPhamThucTe) / parseFloat(currentAdditionalTab.formData.tongNguyenLieuCanSanXuat)) * 100).toFixed(2) : ''} disabled className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-emerald-700 font-medium" placeholder="Tự động" /></td>
                          </tr>
                          <tr className="hover:bg-gray-50/50">
                            <td className="py-1.5 px-2 text-sm text-gray-700"><span className="flex items-center gap-1">Tổng KL TP đầu ra (kg) <span className="text-[10px] text-gray-400 italic">fx</span></span></td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.tongNguyenLieuCanSanXuat && currentAdditionalTab.formData.tiLeThuHoi ? (parseFloat(currentAdditionalTab.formData.tongNguyenLieuCanSanXuat) * parseFloat(currentAdditionalTab.formData.tiLeThuHoi) / 100).toFixed(2) : '0'} readOnly className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-blue-700 font-medium" /></td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentAdditionalTab.formData.tongKhoiLuongThanhPhamThucTe || ''} onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'tongKhoiLuongThanhPhamThucTe', parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white" placeholder="Nhập" /></td>
                          </tr>
                          <tr className="hover:bg-gray-50/50">
                            <td className="py-1.5 px-2 text-sm text-gray-700">Ngày bắt đầu SX</td>
                            <td className="py-1.5 px-2"><DatePicker value={currentAdditionalTab.formData.ngayBatDauSanXuat} onChange={(date) => updateAdditionalTabFormData(currentAdditionalTab.id, 'ngayBatDauSanXuat', date)} placeholder="Chọn ngày" allowClear /></td>
                            <td className="py-1.5 px-2"><DatePicker value={currentAdditionalTab.formData.ngayBatDauSanXuatThucTe} onChange={(date) => updateAdditionalTabFormData(currentAdditionalTab.id, 'ngayBatDauSanXuatThucTe', date)} placeholder="Chọn ngày" allowClear /></td>
                          </tr>
                          <tr className="hover:bg-gray-50/50">
                            <td className="py-1.5 px-2 text-sm text-gray-700">Số ngày hoàn thành</td>
                            <td className="py-1.5 px-2"><input type="number" min="0" step="0.01" value={currentAdditionalTab.formData.thoiGianChoPhepToiDa} onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'thoiGianChoPhepToiDa', parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Nhập" /></td>
                            <td className="py-1.5 px-2"><input type="number" step="0.01" min="0" value={currentAdditionalTab.formData.ngayHoanThanhThucTe} onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'ngayHoanThanhThucTe', parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white" placeholder="Nhập" /></td>
                          </tr>
                        </tbody>
                      </table>
                      {/* Tổng hợp chi phí */}
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tổng hợp chi phí</div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>
                              <th className="text-center py-1.5 px-2 text-xs font-semibold text-blue-600 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>KH</span></th>
                              <th className="text-center py-1.5 px-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>TT</span></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            <tr className="hover:bg-gray-50/50">
                              <td className="py-1.5 px-2 text-sm text-gray-700">CP sản xuất</td>
                              <td className="py-1.5 px-2 text-center text-sm font-medium text-blue-700">
                                {(() => {
                                  if (!currentAdditionalTab.selectedProcess?.flowchart?.sections) return '0';
                                  const total = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => sum + section.costs.reduce((costSum, cost) => costSum + ((cost.giaKeHoach || 0) * (cost.soLuongKeHoach || 0)), 0), 0);
                                  const days = parseFloat(currentAdditionalTab.formData.thoiGianChoPhepToiDa) || 1;
                                  return (total * days).toLocaleString('vi-VN');
                                })()}
                              </td>
                              <td className="py-1.5 px-2 text-center text-sm font-medium text-emerald-700">
                                {(() => {
                                  if (!currentAdditionalTab.selectedProcess?.flowchart?.sections) return '0';
                                  const total = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => sum + section.costs.reduce((costSum, cost) => costSum + ((cost.giaThucTe || 0) * (cost.soLuongThucTe || 0)), 0), 0);
                                  const days = parseFloat(currentAdditionalTab.formData.ngayHoanThanhThucTe) || 1;
                                  return (total * days).toLocaleString('vi-VN');
                                })()}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50/50">
                              <td className="py-1.5 px-2 text-sm text-gray-700">CP chung</td>
                              <td className="py-1.5 px-2 text-center text-sm font-medium text-blue-700">
                                {(() => {
                                  const currentProductId = `additional-${currentAdditionalTab.id}`;
                                  const currentKhoiLuong = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                                  let chiPhiChung = 0;
                                  generalCostGroups.forEach(group => {
                                    const groupTotal = group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
                                    if (!(group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId))) return;
                                    const mainItems = getItems();
                                    const selMain = mainItems.filter((_: any, i: number) => group.selectedProducts.includes(`tab-${i}`));
                                    const selAdd = additionalCostTabs.filter(t => group.selectedProducts.includes(`additional-${t.id}`));
                                    const totalKL = selMain.reduce((s: number, it: any) => s + parseFloat(it.soLuong?.toString() || '0'), 0) + selAdd.reduce((s: number, t: any) => s + parseFloat(t.formData?.soLuong?.toString() || '0'), 0);
                                    if (totalKL === 0) return;
                                    chiPhiChung += (selMain.length + selAdd.length) === 1 ? groupTotal : (groupTotal * currentKhoiLuong) / totalKL;
                                  });
                                  return chiPhiChung.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                                })()}
                              </td>
                              <td className="py-1.5 px-2 text-center text-sm font-medium text-emerald-700">
                                {(() => {
                                  const currentProductId = `additional-${currentAdditionalTab.id}`;
                                  const currentKhoiLuong = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                                  let chiPhiChung = 0;
                                  generalCostGroups.forEach(group => {
                                    const groupTotal = group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);
                                    if (!(group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId))) return;
                                    const mainItems = getItems();
                                    const selMain = mainItems.filter((_: any, i: number) => group.selectedProducts.includes(`tab-${i}`));
                                    const selAdd = additionalCostTabs.filter(t => group.selectedProducts.includes(`additional-${t.id}`));
                                    const totalKL = selMain.reduce((s: number, it: any) => s + parseFloat(it.soLuong?.toString() || '0'), 0) + selAdd.reduce((s: number, t: any) => s + parseFloat(t.formData?.soLuong?.toString() || '0'), 0);
                                    if (totalKL === 0) return;
                                    chiPhiChung += (selMain.length + selAdd.length) === 1 ? groupTotal : (groupTotal * currentKhoiLuong) / totalKL;
                                  });
                                  return chiPhiChung.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                                })()}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50/50">
                              <td className="py-1.5 px-2 text-sm text-gray-700">CP xuất khẩu</td>
                              <td className="py-1.5 px-2 text-center text-sm font-medium text-blue-700">
                                {(() => {
                                  const totalExport = selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0);
                                  const curTP = parseFloat(currentAdditionalTab.formData.tongThanhPhamCanSxThem || '0');
                                  const mainItems = getItems();
                                  const totTP = tabsData.reduce((s: number, t: any) => s + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0) + additionalCostTabs.reduce((s: number, t: any) => s + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0);
                                  const totPC = mainItems.length + additionalCostTabs.length;
                                  const curKL = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                                  const xk = totPC === 1 ? totalExport : totTP > 0 ? (totalExport * curTP) / totTP : (() => { const tKL = mainItems.reduce((s: number, it: any) => s + parseFloat(it.soLuong?.toString() || '0'), 0) + additionalCostTabs.reduce((s: number, t: any) => s + parseFloat(t.formData?.soLuong || '0'), 0); return tKL > 0 ? (totalExport * curKL) / tKL : 0; })();
                                  return xk.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                                })()}
                              </td>
                              <td className="py-1.5 px-2 text-center text-sm font-medium text-emerald-700">
                                {(() => {
                                  const totalExport = selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0);
                                  const curTP = parseFloat(currentAdditionalTab.formData.tongThanhPhamCanSxThem || '0');
                                  const mainItems = getItems();
                                  const totTP = tabsData.reduce((s: number, t: any) => s + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0) + additionalCostTabs.reduce((s: number, t: any) => s + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0);
                                  const totPC = mainItems.length + additionalCostTabs.length;
                                  const curKL = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                                  const xk = totPC === 1 ? totalExport : totTP > 0 ? (totalExport * curTP) / totTP : (() => { const tKL = mainItems.reduce((s: number, it: any) => s + parseFloat(it.soLuong?.toString() || '0'), 0) + additionalCostTabs.reduce((s: number, t: any) => s + parseFloat(t.formData?.soLuong || '0'), 0); return tKL > 0 ? (totalExport * curKL) / tKL : 0; })();
                                  return xk.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                                })()}
                              </td>
                            </tr>
                            <tr className="bg-green-50/80 border-t-2 border-green-200">
                              <td className="py-2 px-2 text-sm font-bold text-gray-800">Tổng chi phí</td>
                              <td className="py-2 px-2 text-center text-sm font-bold text-blue-700">
                                {(() => {
                                  let cpsx = 0;
                                  if (currentAdditionalTab.selectedProcess?.flowchart?.sections) {
                                    const perDay = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => sum + section.costs.reduce((cs, cost) => cs + ((cost.giaKeHoach || 0) * (cost.soLuongKeHoach || 0)), 0), 0);
                                    cpsx = perDay * (parseFloat(currentAdditionalTab.formData.thoiGianChoPhepToiDa) || 1);
                                  }
                                  const currentProductId = `additional-${currentAdditionalTab.id}`;
                                  const curKL = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                                  let cpc = 0;
                                  generalCostGroups.forEach(group => {
                                    const gt = group.selectedCosts.reduce((s, i) => s + (i.keHoach || 0), 0);
                                    if (!(group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId))) return;
                                    const mi = getItems(); const sm = mi.filter((_: any, i: number) => group.selectedProducts.includes(`tab-${i}`)); const sa = additionalCostTabs.filter(t => group.selectedProducts.includes(`additional-${t.id}`));
                                    const tKL = sm.reduce((s: number, it: any) => s + parseFloat(it.soLuong?.toString() || '0'), 0) + sa.reduce((s: number, t: any) => s + parseFloat(t.formData?.soLuong?.toString() || '0'), 0);
                                    if (tKL === 0) return;
                                    cpc += (sm.length + sa.length) === 1 ? gt : (gt * curKL) / tKL;
                                  });
                                  const te = selectedExportCosts.reduce((s, i) => s + (i.keHoach || 0), 0);
                                  const mi = getItems(); const curTP = parseFloat(currentAdditionalTab.formData.tongThanhPhamCanSxThem || '0');
                                  const totTP = tabsData.reduce((s: number, t: any) => s + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0) + additionalCostTabs.reduce((s: number, t: any) => s + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0);
                                  const tPC = mi.length + additionalCostTabs.length;
                                  const xk = tPC === 1 ? te : totTP > 0 ? (te * curTP) / totTP : (() => { const tKL = mi.reduce((s: number, it: any) => s + parseFloat(it.soLuong?.toString() || '0'), 0) + additionalCostTabs.reduce((s: number, t: any) => s + parseFloat(t.formData?.soLuong || '0'), 0); return tKL > 0 ? (te * curKL) / tKL : 0; })();
                                  return (cpsx + cpc + xk).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                                })()}
                              </td>
                              <td className="py-2 px-2 text-center text-sm font-bold text-emerald-700">
                                {(() => {
                                  let cpsx = 0;
                                  if (currentAdditionalTab.selectedProcess?.flowchart?.sections) {
                                    const perDay = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => sum + section.costs.reduce((cs, cost) => cs + ((cost.giaThucTe || 0) * (cost.soLuongThucTe || 0)), 0), 0);
                                    cpsx = perDay * (parseFloat(currentAdditionalTab.formData.ngayHoanThanhThucTe) || 1);
                                  }
                                  const currentProductId = `additional-${currentAdditionalTab.id}`;
                                  const curKL = parseFloat(currentAdditionalTab.formData.soLuong || '0');
                                  let cpc = 0;
                                  generalCostGroups.forEach(group => {
                                    const gt = group.selectedCosts.reduce((s, i) => s + (i.thucTe || 0), 0);
                                    if (!(group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId))) return;
                                    const mi = getItems(); const sm = mi.filter((_: any, i: number) => group.selectedProducts.includes(`tab-${i}`)); const sa = additionalCostTabs.filter(t => group.selectedProducts.includes(`additional-${t.id}`));
                                    const tKL = sm.reduce((s: number, it: any) => s + parseFloat(it.soLuong?.toString() || '0'), 0) + sa.reduce((s: number, t: any) => s + parseFloat(t.formData?.soLuong?.toString() || '0'), 0);
                                    if (tKL === 0) return;
                                    cpc += (sm.length + sa.length) === 1 ? gt : (gt * curKL) / tKL;
                                  });
                                  const te = selectedExportCosts.reduce((s, i) => s + (i.thucTe || 0), 0);
                                  const mi = getItems(); const curTP = parseFloat(currentAdditionalTab.formData.tongThanhPhamCanSxThem || '0');
                                  const totTP = tabsData.reduce((s: number, t: any) => s + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0) + additionalCostTabs.reduce((s: number, t: any) => s + parseFloat(t.formData?.tongThanhPhamCanSxThem || '0'), 0);
                                  const tPC = mi.length + additionalCostTabs.length;
                                  const xk = tPC === 1 ? te : totTP > 0 ? (te * curTP) / totTP : (() => { const tKL = mi.reduce((s: number, it: any) => s + parseFloat(it.soLuong?.toString() || '0'), 0) + additionalCostTabs.reduce((s: number, t: any) => s + parseFloat(t.formData?.soLuong || '0'), 0); return tKL > 0 ? (te * curKL) / tKL : 0; })();
                                  return (cpsx + cpc + xk).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
                                })()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danh sách sản phẩm trong định mức */}
              {currentAdditionalTab.selectedStandard?.items && currentAdditionalTab.selectedStandard.items.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">Thành phẩm đầu ra</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 bg-gray-200 border border-gray-300 text-left text-sm font-medium text-gray-700">Thành phẩm đầu ra</th>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            return (
                              <th key={index} className={`px-4 py-2 border border-gray-300 text-center text-sm font-medium ${isSelected ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                {item.tenThanhPham}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">tỉ lệ thu hồi</td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            return (
                              <td key={index} className={`px-4 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                <span className="font-medium">{item.tiLe} %</span>
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">số kg thành phẩm</td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            const soKg = currentAdditionalTab.formData.tongNguyenLieuCanSanXuat && currentAdditionalTab.formData.tiLeThuHoi
                              ? (parseFloat(currentAdditionalTab.formData.tongNguyenLieuCanSanXuat) * parseFloat(currentAdditionalTab.formData.tiLeThuHoi) / 100 * item.tiLe / 100).toFixed(3)
                              : '0';
                            return (
                              <td key={index} className={`px-4 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                <span className="font-medium text-blue-600">{soKg} kg</span>
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">giá hòa vốn (VNĐ/KG)</td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            const giaHoaVonValue = isSelected ? '0' : formatNumberWithDots(currentAdditionalTab.formData.giaHoaVonSanPhamPhu[item.tenThanhPham]);
                            return (
                              <td key={index} className={`px-4 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                <input type="text" value={giaHoaVonValue} onChange={(e) => { if (!isSelected) { setAdditionalCostTabs(prev => { const newTabs = [...prev]; const ti = newTabs.findIndex(t => t.id === currentAdditionalTab.id); if (ti !== -1) { newTabs[ti].formData.giaHoaVonSanPhamPhu = { ...newTabs[ti].formData.giaHoaVonSanPhamPhu, [item.tenThanhPham]: String(parseNumberFromDots(e.target.value)) }; } return newTabs; }); } }} disabled={isSelected} className={`w-full px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 ${isSelected ? 'bg-yellow-50 border-yellow-400 font-bold' : 'bg-white border-gray-300'}`} placeholder="0" />
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm text-gray-700">lợi nhuận cộng thêm (VNĐ/KG)</td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            return (
                              <td key={index} className={`px-4 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                {isSelected ? (
                                  <input type="text" value={formatNumberWithDots(currentAdditionalTab.formData.loiNhuanCongThem)} onChange={(e) => { setAdditionalCostTabs(prev => { const newTabs = [...prev]; const ti = newTabs.findIndex(t => t.id === currentAdditionalTab.id); if (ti !== -1) { newTabs[ti].formData.loiNhuanCongThem = String(parseNumberFromDots(e.target.value)); } return newTabs; }); }} className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white" placeholder="0" />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm font-medium text-gray-700">giá báo khách (VNĐ/KG)</td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            const giaBaoKhachValue = isSelected ? formatNumberWithDots(parseFloat(currentAdditionalTab.formData.loiNhuanCongThem || '0')) : '';
                            return (
                              <td key={index} className={`px-4 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                {isSelected ? (
                                  <input type="text" value={giaBaoKhachValue} disabled className="w-full px-2 py-1 text-center border border-blue-400 rounded bg-yellow-50 font-bold text-lg" placeholder="0" />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm font-medium text-gray-700">
                            <div className="flex flex-col">
                              <span>giá báo khách (USD/KG)</span>
                              <div className="flex items-center mt-1">
                                <span className="text-xs text-gray-500 mr-1">Tỉ giá:</span>
                                <input type="text" value={currentAdditionalTab.formData.tiGiaUSD} onChange={(e) => { const rawValue = handleNumericInput(e.target.value); setAdditionalCostTabs(prev => { const newTabs = [...prev]; const ti = newTabs.findIndex(t => t.id === currentAdditionalTab.id); if (ti !== -1) { newTabs[ti].formData.tiGiaUSD = rawValue; } return newTabs; }); }} onBlur={(e) => { const numValue = parseNumberFromDots(e.target.value); if (numValue > 0) { setAdditionalCostTabs(prev => { const newTabs = [...prev]; const ti = newTabs.findIndex(t => t.id === currentAdditionalTab.id); if (ti !== -1) { newTabs[ti].formData.tiGiaUSD = formatNumberWithDots(numValue); } return newTabs; }); } }} className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500" placeholder="VD: 25000" />
                              </div>
                            </div>
                          </td>
                          {currentAdditionalTab.selectedStandard.items.map((item, index) => {
                            const isSelected = currentAdditionalTab.formData.sanPhamDauRa === item.tenThanhPham;
                            const tiGiaUSD = parseNumberFromDots(currentAdditionalTab.formData.tiGiaUSD || '0');
                            const loiNhuan = parseFloat(currentAdditionalTab.formData.loiNhuanCongThem || '0');
                            const giaBaoKhachUSD = isSelected && tiGiaUSD > 0 ? formatNumberWithDots(loiNhuan / tiGiaUSD) : '';
                            return (
                              <td key={index} className={`px-4 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                {isSelected ? (
                                  <input type="text" value={giaBaoKhachUSD} disabled className="w-full px-2 py-1 text-center border border-blue-400 rounded bg-yellow-50 font-bold text-lg" placeholder="0" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea value={currentAdditionalTab.formData.ghiChu} onChange={(e) => updateAdditionalTabFormData(currentAdditionalTab.id, 'ghiChu', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Nhập ghi chú (nếu có)" />
              </div>

              {/* Chọn quy trình sản xuất */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn quy trình sản xuất</label>
                <select value={currentAdditionalTab.selectedProcess?.id || ''} onChange={(e) => handleAdditionalTabProcessChange(currentAdditionalTab.id, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Chọn quy trình --</option>
                  {productionProcesses.map((process) => (
                    <option key={process.id} value={process.id}>{process.maQuyTrinhSanXuat} - {process.tenQuyTrinhSanXuat || process.tenQuyTrinh}</option>
                  ))}
                </select>
              </div>

              {currentAdditionalTab.selectedProcess && !currentAdditionalTab.selectedProcess.flowchart && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">⚠️</span>
                  <p className="text-sm text-yellow-700">Quy trình <strong>{currentAdditionalTab.selectedProcess.tenQuyTrinhSanXuat || currentAdditionalTab.selectedProcess.tenQuyTrinh || currentAdditionalTab.selectedProcess.maQuyTrinhSanXuat}</strong> chưa có lưu đồ. Vui lòng tạo lưu đồ trong module <strong>Quy trình sản xuất</strong> trước khi sử dụng.</p>
                </div>
              )}
              {currentAdditionalTab && currentAdditionalTab.selectedProcess && currentAdditionalTab.selectedProcess.flowchart && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">Lưu đồ quy trình</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-400">
                      <thead>
                        <tr className="bg-blue-100">
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>STT</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>PHÂN ĐOẠN</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>NỘI DUNG CÔNG VIỆC</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>BIỂU MẪU</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>LOẠI CHI PHÍ</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>TÊN CHI PHÍ</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐVT</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐỊNH MỨC THỰC HIỆN</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐƠN VỊ</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>KHỐI LƯỢNG CẦN THỰC HIỆN (Kg)</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>SỐ PHÚT CẦN THỰC HIỆN XONG</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ CẦN DÙNG</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>KẾ HOẠCH</th>
                          <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>THỰC TẾ</th>
                        </tr>
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
                                  <td className="border border-gray-400 px-3 py-2 text-center font-medium" rowSpan={sectionRowSpan}>{sectionIndex + 1}</td>
                                  <td className="border border-gray-400 px-3 py-2 text-center" rowSpan={sectionRowSpan}>{section.phanDoan}</td>
                                  <td className="border border-gray-400 px-3 py-2" rowSpan={sectionRowSpan}>{section.noiDungCongViec}</td>
                                  <td className="border border-gray-400 px-3 py-2 text-center" rowSpan={sectionRowSpan}>
                                    {((section as any).files && (section as any).files.length > 0) ? (
                                      <div className="flex flex-col items-center gap-1">
                                        {(section as any).files.map((file: any, fileIdx: number) => (
                                          <div key={fileIdx} className="flex flex-col items-center gap-0.5">
                                            <span className="text-xs text-gray-500">{fileIdx + 1}.</span>
                                            <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(file.url))} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"><FileText className="w-3 h-3" />Xem</button>
                                            <button type="button" onClick={() => handlePrintFile(getFullFileUrl(file.url))} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100"><Printer className="w-3 h-3" />In</button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : section.fileUrl ? (
                                      <div className="flex flex-col items-center gap-1">
                                        <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(section.fileUrl!))} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"><FileText className="w-3 h-3" />Xem</button>
                                        <button type="button" onClick={() => handlePrintFile(getFullFileUrl(section.fileUrl!))} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100"><Printer className="w-3 h-3" />In</button>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </td>
                                </>
                              )}
                              <td className="border border-gray-400 px-3 py-2 text-center">{cost.loaiChiPhi}</td>
                              <td className="border border-gray-400 px-3 py-2">{cost.tenChiPhi || '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center">{cost.donVi || '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">{cost.dinhMucLaoDong !== undefined && cost.dinhMucLaoDong !== null ? cost.dinhMucLaoDong : '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">{cost.donViDinhMucLaoDong || '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">{cost.soLuongNguyenLieu !== undefined && cost.soLuongNguyenLieu !== null ? cost.soLuongNguyenLieu : '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">{cost.soPhutThucHien !== undefined && cost.soPhutThucHien !== null ? cost.soPhutThucHien : '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">{cost.soLuongKeHoach !== undefined && cost.soLuongKeHoach !== null ? cost.soLuongKeHoach.toFixed(2) : '-'}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                                <input type="text" value={additionalFlowchartInputValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-soLuongThucTe`] ?? formatNumberWithDots(cost.soLuongThucTe)} onChange={(e) => { const rawValue = handleNumericInput(e.target.value); setAdditionalFlowchartInputValues(prev => ({ ...prev, [`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-soLuongThucTe`]: rawValue })); }} onBlur={(e) => { const numValue = parseNumberFromDots(e.target.value); handleAdditionalTabFlowchartCostChange(currentAdditionalTab.id, sectionIndex, costIndex, 'soLuongThucTe', String(numValue)); setAdditionalFlowchartInputValues(prev => { const newValues = { ...prev }; delete newValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-soLuongThucTe`]; return newValues; }); }} className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right" placeholder="0" />
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                                <input type="text" value={additionalFlowchartInputValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaKeHoach`] ?? formatNumberWithDots(cost.giaKeHoach)} onChange={(e) => { const rawValue = handleNumericInput(e.target.value); setAdditionalFlowchartInputValues(prev => ({ ...prev, [`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaKeHoach`]: rawValue })); }} onBlur={(e) => { const numValue = parseNumberFromDots(e.target.value); handleAdditionalTabFlowchartCostChange(currentAdditionalTab.id, sectionIndex, costIndex, 'giaKeHoach', String(numValue)); setAdditionalFlowchartInputValues(prev => { const newValues = { ...prev }; delete newValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaKeHoach`]; return newValues; }); }} className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right" placeholder="0" />
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">{(() => { const gia = cost.giaKeHoach || 0; const soLuong = cost.soLuongKeHoach || 0; const thanhTien = gia * soLuong; return thanhTien > 0 ? formatNumberWithDots(thanhTien) : '0'; })()}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                                <input type="text" value={additionalFlowchartInputValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaThucTe`] ?? formatNumberWithDots(cost.giaThucTe)} onChange={(e) => { const rawValue = handleNumericInput(e.target.value); setAdditionalFlowchartInputValues(prev => ({ ...prev, [`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaThucTe`]: rawValue })); }} onBlur={(e) => { const numValue = parseNumberFromDots(e.target.value); handleAdditionalTabFlowchartCostChange(currentAdditionalTab.id, sectionIndex, costIndex, 'giaThucTe', String(numValue)); setAdditionalFlowchartInputValues(prev => { const newValues = { ...prev }; delete newValues[`${currentAdditionalTab.id}-${sectionIndex}-${costIndex}-giaThucTe`]; return newValues; }); }} className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right" placeholder="0" />
                              </td>
                              <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">{(() => { const gia = cost.giaThucTe || 0; const soLuong = cost.soLuongThucTe || 0; const thanhTien = gia * soLuong; return thanhTien > 0 ? formatNumberWithDots(thanhTien) : '0'; })()}</td>
                            </tr>
                          ));
                        })}
                        <tr className="bg-blue-100 font-bold">
                          <td colSpan={14} className="border border-gray-400 px-3 py-3 text-right text-sm">Tổng cộng</td>
                          <td className="border border-gray-400 px-3 py-3 text-center text-sm">{(() => { const total = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => { return sum + section.costs.reduce((costSum, cost) => { const gia = cost.giaKeHoach || 0; const soLuong = cost.soLuongKeHoach || 0; return costSum + (gia * soLuong); }, 0); }, 0); return total.toLocaleString('vi-VN') + ' VNĐ'; })()}</td>
                          <td className="border border-gray-400 px-3 py-3 bg-gray-100"></td>
                          <td className="border border-gray-400 px-3 py-3 text-center text-sm">{(() => { const total = currentAdditionalTab.selectedProcess.flowchart.sections.reduce((sum, section) => { return sum + section.costs.reduce((costSum, cost) => { const gia = cost.giaThucTe || 0; const soLuong = cost.soLuongThucTe || 0; return costSum + (gia * soLuong); }, 0); }, 0); return total.toLocaleString('vi-VN') + ' VNĐ'; })()}</td>
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
            <div className="space-y-5">

            {/* ========== SECTION 1: THÔNG TIN SẢN PHẨM ========== */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-gray-200">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                <h4 className="text-sm font-semibold text-slate-800">Thông tin sản phẩm</h4>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Người thực hiện</label>
                    <input type="text" value={quotationRequest.tenNhanVien || ''} disabled className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tên sản phẩm</label>
                    <input type="text" value={currentItem?.tenSanPham || ''} disabled className="w-full px-3 py-2 text-sm border border-orange-200 rounded-md bg-orange-50 font-semibold text-gray-900" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Khối lượng</label>
                      <input type="number" value={currentItem?.soLuong || ''} disabled className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Đơn vị</label>
                      <input type="text" value={currentItem?.donViTinh || ''} disabled className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-700" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mã định mức NVL</label>
                    <select value={currentTab.selectedStandard?.id || ''} onChange={(e) => handleStandardChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-blue-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">-- Chọn định mức --</option>
                      {materialStandards.map((standard) => (
                        <option key={standard.id} value={standard.id}>{standard.maDinhMuc} : {standard.tenDinhMuc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ========== SECTION 2+3: NGUYÊN LIỆU, TỒN KHO & SẢN XUẤT ========== */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  <h4 className="text-sm font-semibold text-slate-800">Nguyên liệu, Tồn kho &amp; Sản xuất</h4>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Cột trái: Nguyên liệu & Tồn kho */}
                  <div className="overflow-x-auto">
                    <div className="flex gap-2 items-end mb-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">NL đầu vào</label>
                        <select value={currentTab.formData.nguyenLieuDauVao} onChange={(e) => updateFormData('nguyenLieuDauVao', e.target.value)} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500" disabled={!currentTab.selectedStandard}>
                          <option value="">-- Chọn NL --</option>
                          {currentTab.selectedStandard?.inputItems?.map((item, index) => (
                            <option key={index} value={item.tenNguyenLieu}>{item.tenNguyenLieu}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">SP đầu ra</label>
                        <select value={currentTab.formData.sanPhamDauRa} onChange={(e) => handleOutputProductChange(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500" disabled={!currentTab.selectedStandard}>
                          <option value="">-- Chọn SP --</option>
                          {currentTab.selectedStandard?.items?.map((item, index) => (
                            <option key={index} value={item.tenThanhPham}>{item.tenThanhPham}</option>
                          ))}
                        </select>
                      </div>
                      <button type="button" onClick={() => handleCheckInventory(currentTab.formData.sanPhamDauRa, currentTab.formData.nguyenLieuDauVao)} disabled={!currentTab.formData.sanPhamDauRa && !currentTab.formData.nguyenLieuDauVao} className="px-2.5 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1 transition-colors flex-shrink-0" title="Kiểm tra tồn kho">
                        <Package className="w-3.5 h-3.5" />
                        Tồn kho
                      </button>
                    </div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      Nguyên liệu &amp; Tồn kho
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Chỉ tiêu</th>
                          <th className="text-center py-1.5 px-2 text-xs font-semibold text-blue-600 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>KH</span></th>
                          <th className="text-center py-1.5 px-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>TT</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700">Thành phẩm tồn kho</td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.thanhPhamTonKho} onChange={(e) => handleInventoryChange(parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Nhập" /></td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.thanhPhamTonKhoThucTe || ''} onChange={(e) => handleInventoryThucTeChange(parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white" placeholder="Nhập" /></td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700"><span className="flex items-center gap-1">Tổng TP cần SX thêm <span className="text-[10px] text-gray-400 italic">fx</span></span></td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.tongThanhPhamCanSxThem} disabled className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-blue-700 font-medium" /></td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.tongThanhPhamCanSxThemThucTe || ''} disabled className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-emerald-700 font-medium" /></td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700"><span className="flex items-center gap-1">Tổng NL cần SX <span className="text-[10px] text-gray-400 italic">fx</span></span></td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.tongNguyenLieuCanSanXuat} disabled className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-blue-700 font-medium" /></td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.tongNguyenLieuCanSanXuatThucTe || ''} onChange={(e) => updateFormData('tongNguyenLieuCanSanXuatThucTe', parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white" placeholder="Nhập" /></td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700">NL tồn kho</td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.nguyenLieuTonKho} onChange={(e) => handleMaterialInventoryChange(parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Nhập" /></td>
                          <td className="py-1.5 px-2"><span className="block text-center text-xs text-gray-400">-</span></td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700"><span className="flex items-center gap-1">NL cần nhập thêm <span className="text-[10px] text-gray-400 italic">fx</span></span></td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.nguyenLieuCanNhapThem} disabled className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-blue-700 font-medium" /></td>
                          <td className="py-1.5 px-2"><span className="block text-center text-xs text-gray-400">-</span></td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
                      <textarea value={currentTab.formData.ghiChu} onChange={(e) => updateFormData('ghiChu', e.target.value)} rows={2} className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Nhập ghi chú (nếu có)" />
                    </div>
                  </div>

                  {/* Cột phải: Sản xuất & Thời gian */}
                  <div className="overflow-x-auto">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Sản xuất &amp; Thời gian
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1.5 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Chỉ tiêu</th>
                          <th className="text-center py-1.5 px-2 text-xs font-semibold text-blue-600 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>KH</span></th>
                          <th className="text-center py-1.5 px-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider"><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>TT</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700">Tỉ lệ thu hồi (%)</td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.tiLeThuHoi} onChange={(e) => handleTiLeThuHoiChange(parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Nhập" /></td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.tongKhoiLuongThanhPhamThucTe && currentTab.formData.tongNguyenLieuCanSanXuatThucTe ? ((parseFloat(currentTab.formData.tongKhoiLuongThanhPhamThucTe) / parseFloat(currentTab.formData.tongNguyenLieuCanSanXuatThucTe)) * 100).toFixed(2) : ''} disabled className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-emerald-700 font-medium" placeholder="Tự động" /></td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700"><span className="flex items-center gap-1">Tổng KL TP đầu ra (kg) <span className="text-[10px] text-gray-400 italic">fx</span></span></td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.tongNguyenLieuCanSanXuat && currentTab.formData.tiLeThuHoi ? (parseFloat(currentTab.formData.tongNguyenLieuCanSanXuat) * parseFloat(currentTab.formData.tiLeThuHoi) / 100).toFixed(2) : '0'} readOnly className="w-full px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-md text-center bg-slate-50 text-blue-700 font-medium" /></td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" value={currentTab.formData.tongKhoiLuongThanhPhamThucTe || ''} onChange={(e) => updateFormData('tongKhoiLuongThanhPhamThucTe', parseNumberInputStr(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white" placeholder="Nhập" /></td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700">Ngày bắt đầu SX</td>
                          <td className="py-1.5 px-2"><DatePicker value={currentTab.formData.ngayBatDauSanXuat} onChange={(date) => { setTabsData(prev => { const newTabs = [...prev]; newTabs[activeTab].formData.ngayBatDauSanXuat = date; return newTabs; }); }} placeholder="Chọn ngày" allowClear /></td>
                          <td className="py-1.5 px-2"><DatePicker value={currentTab.formData.ngayBatDauSanXuatThucTe} onChange={(date) => { setTabsData(prev => { const newTabs = [...prev]; newTabs[activeTab].formData.ngayBatDauSanXuatThucTe = date; return newTabs; }); }} placeholder="Chọn ngày" allowClear /></td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700">Số ngày hoàn thành</td>
                          <td className="py-1.5 px-2">
                            <input type="number" min="0" step="0.01" value={currentTab.formData.thoiGianChoPhepToiDa} onChange={(e) => {
                              setTabsData(prev => {
                                const newTabs = [...prev];
                                newTabs[activeTab].formData.thoiGianChoPhepToiDa = parseNumberInputStr(e.target.value);
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
                                } catch (e) { /* ignore */ }
                                return newTabs;
                              });
                            }} className="w-full px-2 py-1.5 text-sm border border-blue-200 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Nhập" />
                          </td>
                          <td className="py-1.5 px-2"><input type="number" step="0.01" min="0" value={currentTab.formData.ngayHoanThanhThucTe} onChange={(e) => { setTabsData(prev => { const newTabs = [...prev]; newTabs[activeTab].formData.ngayHoanThanhThucTe = parseNumberInputStr(e.target.value); return newTabs; }); }} className="w-full px-2 py-1.5 text-sm border border-emerald-200 rounded-md text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white" placeholder="Nhập" /></td>
                        </tr>
                        <tr><td colSpan={3} className="py-3"></td></tr>
                        <tr className="bg-gray-50"><td colSpan={3} className="py-1 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng hợp chi phí</td></tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700">CP sản xuất</td>
                          <td className="py-1.5 px-2 text-sm text-right font-medium text-gray-900">{(() => { if (!currentTab.selectedProcess?.flowchart?.sections) return '0'; const total = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => { return sum + section.costs.reduce((costSum, cost) => costSum + ((cost.giaKeHoach || 0) * (cost.soLuongKeHoach || 0)), 0); }, 0); return (total * (parseFloat(currentTab.formData.thoiGianChoPhepToiDa) || 1)).toLocaleString('vi-VN'); })()}</td>
                          <td className="py-1.5 px-2 text-sm text-right font-medium text-gray-900">{(() => { if (!currentTab.selectedProcess?.flowchart?.sections) return '0'; const total = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => { return sum + section.costs.reduce((costSum, cost) => costSum + ((cost.giaThucTe || 0) * (cost.soLuongThucTe || 0)), 0); }, 0); return (total * (parseFloat(currentTab.formData.ngayHoanThanhThucTe) || 1)).toLocaleString('vi-VN'); })()}</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700">CP chung</td>
                          <td className="py-1.5 px-2 text-sm text-right font-medium text-gray-900">{(() => { const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0'); const currentProductId = `tab-${activeTab}`; let chiPhiChung = 0; generalCostGroups.forEach((group) => { const groupTotalKeHoach = group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0); const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId); if (!isProductSelected) return; const selectedMainItems = items.filter((_: any, index: number) => group.selectedProducts.includes(`tab-${index}`)); const selectedAdditionalItems = additionalCostTabs.filter(tab => group.selectedProducts.includes(`additional-${tab.id}`)); const totalKhoiLuong = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) + selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0); const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length; if (totalKhoiLuong === 0) return; chiPhiChung += totalSelectedCount === 1 ? groupTotalKeHoach : (groupTotalKeHoach * currentKhoiLuong) / totalKhoiLuong; }); return chiPhiChung.toLocaleString('vi-VN', { maximumFractionDigits: 2 }); })()}</td>
                          <td className="py-1.5 px-2 text-sm text-right font-medium text-gray-900">{(() => { const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0'); const currentProductId = `tab-${activeTab}`; let chiPhiChung = 0; generalCostGroups.forEach(group => { const groupTotalThucTe = group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0); const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId); if (!isProductSelected) return; const selectedMainItems = items.filter((_: any, index: number) => group.selectedProducts.includes(`tab-${index}`)); const selectedAdditionalItems = additionalCostTabs.filter(tab => group.selectedProducts.includes(`additional-${tab.id}`)); const totalKhoiLuong = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) + selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0); const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length; if (totalKhoiLuong === 0) return; chiPhiChung += totalSelectedCount === 1 ? groupTotalThucTe : (groupTotalThucTe * currentKhoiLuong) / totalKhoiLuong; }); return chiPhiChung.toLocaleString('vi-VN', { maximumFractionDigits: 2 }); })()}</td>
                        </tr>
                        <tr className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2 text-sm text-gray-700">CP xuất khẩu</td>
                          <td className="py-1.5 px-2 text-sm text-right font-medium text-gray-900">{(() => { const totalExportCostKeHoach = selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0); const currentTongThanhPham = parseFloat(currentTab.formData.tongThanhPhamCanSxThem || '0'); const totalTongThanhPham = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0) + additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0); const totalProductCount = items.length + additionalCostTabs.length; const currentKhoiLuongExport = parseFloat(currentItem?.soLuong?.toString() || '0'); const chiPhiXuatKhau = totalProductCount === 1 ? totalExportCostKeHoach : totalTongThanhPham > 0 ? (totalExportCostKeHoach * currentTongThanhPham) / totalTongThanhPham : (() => { const totalKL = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) + additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0); return totalKL > 0 ? (totalExportCostKeHoach * currentKhoiLuongExport) / totalKL : 0; })(); return chiPhiXuatKhau.toLocaleString('vi-VN', { maximumFractionDigits: 2 }); })()}</td>
                          <td className="py-1.5 px-2 text-sm text-right font-medium text-gray-900">{(() => { const totalExportCostThucTe = selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0); const currentTongThanhPham = parseFloat(currentTab.formData.tongThanhPhamCanSxThem || '0'); const totalTongThanhPham = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0) + additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0); const totalProductCount = items.length + additionalCostTabs.length; const currentKhoiLuongExport = parseFloat(currentItem?.soLuong?.toString() || '0'); const chiPhiXuatKhau = totalProductCount === 1 ? totalExportCostThucTe : totalTongThanhPham > 0 ? (totalExportCostThucTe * currentTongThanhPham) / totalTongThanhPham : (() => { const totalKL = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) + additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0); return totalKL > 0 ? (totalExportCostThucTe * currentKhoiLuongExport) / totalKL : 0; })(); return chiPhiXuatKhau.toLocaleString('vi-VN', { maximumFractionDigits: 2 }); })()}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="bg-gradient-to-r from-blue-50 to-emerald-50 border-t-2 border-gray-300">
                          <td className="py-2 px-2 text-xs font-bold text-gray-900 uppercase">Tổng chi phí</td>
                          <td className="py-2 px-2 text-right"><span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-sm rounded">{(() => { let chiPhiSanXuat = 0; if (currentTab.selectedProcess?.flowchart?.sections) { const perDay = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => { return sum + section.costs.reduce((costSum, cost) => costSum + ((cost.giaKeHoach || 0) * (cost.soLuongKeHoach || 0)), 0); }, 0); chiPhiSanXuat = perDay * (parseFloat(currentTab.formData.thoiGianChoPhepToiDa) || 1); } const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0'); const currentProductId = `tab-${activeTab}`; let chiPhiChung = 0; generalCostGroups.forEach(group => { const groupTotalKeHoach = group.selectedCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0); const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId); if (!isProductSelected) return; const selectedMainItems = items.filter((_: any, index: number) => group.selectedProducts.includes(`tab-${index}`)); const selectedAdditionalItems = additionalCostTabs.filter(tab => group.selectedProducts.includes(`additional-${tab.id}`)); const totalKhoiLuong = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) + selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0); const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length; if (totalKhoiLuong === 0) return; chiPhiChung += totalSelectedCount === 1 ? groupTotalKeHoach : (groupTotalKeHoach * currentKhoiLuong) / totalKhoiLuong; }); const totalExportCostKeHoach = selectedExportCosts.reduce((sum, item) => sum + (item.keHoach || 0), 0); const currentTongThanhPhamExport = parseFloat(currentTab.formData.tongThanhPhamCanSxThem || '0'); const totalTongThanhPhamExport = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0) + additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0); const totalProductCountExport = items.length + additionalCostTabs.length; const chiPhiXuatKhau = totalProductCountExport === 1 ? totalExportCostKeHoach : totalTongThanhPhamExport > 0 ? (totalExportCostKeHoach * currentTongThanhPhamExport) / totalTongThanhPhamExport : (() => { const curKL = parseFloat(currentItem?.soLuong?.toString() || '0'); const totalKL = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) + additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0); return totalKL > 0 ? (totalExportCostKeHoach * curKL) / totalKL : 0; })(); return (chiPhiSanXuat + chiPhiChung + chiPhiXuatKhau).toLocaleString('vi-VN', { maximumFractionDigits: 2 }); })()}</span></td>
                          <td className="py-2 px-2 text-right"><span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-sm rounded">{(() => { let chiPhiSanXuat = 0; if (currentTab.selectedProcess?.flowchart?.sections) { const perDay = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => { return sum + section.costs.reduce((costSum, cost) => costSum + ((cost.giaThucTe || 0) * (cost.soLuongThucTe || 0)), 0); }, 0); chiPhiSanXuat = perDay * (parseFloat(currentTab.formData.ngayHoanThanhThucTe) || 1); } const currentKhoiLuong = parseFloat(currentItem?.soLuong?.toString() || '0'); const currentProductId = `tab-${activeTab}`; let chiPhiChung = 0; generalCostGroups.forEach(group => { const groupTotalThucTe = group.selectedCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0); const isProductSelected = group.selectedProducts.length > 0 && group.selectedProducts.includes(currentProductId); if (!isProductSelected) return; const selectedMainItems = items.filter((_: any, index: number) => group.selectedProducts.includes(`tab-${index}`)); const selectedAdditionalItems = additionalCostTabs.filter(tab => group.selectedProducts.includes(`additional-${tab.id}`)); const totalKhoiLuong = selectedMainItems.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) + selectedAdditionalItems.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.soLuong?.toString() || '0'), 0); const totalSelectedCount = selectedMainItems.length + selectedAdditionalItems.length; if (totalKhoiLuong === 0) return; chiPhiChung += totalSelectedCount === 1 ? groupTotalThucTe : (groupTotalThucTe * currentKhoiLuong) / totalKhoiLuong; }); const totalExportCostThucTe = selectedExportCosts.reduce((sum, item) => sum + (item.thucTe || 0), 0); const currentTongThanhPhamExport = parseFloat(currentTab.formData.tongThanhPhamCanSxThem || '0'); const totalTongThanhPhamExport = tabsData.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0) + additionalCostTabs.reduce((sum: number, tab: any) => sum + parseFloat(tab.formData?.tongThanhPhamCanSxThem || '0'), 0); const totalProductCountExport = items.length + additionalCostTabs.length; const chiPhiXuatKhau = totalProductCountExport === 1 ? totalExportCostThucTe : totalTongThanhPhamExport > 0 ? (totalExportCostThucTe * currentTongThanhPhamExport) / totalTongThanhPhamExport : (() => { const curKL = parseFloat(currentItem?.soLuong?.toString() || '0'); const totalKL = items.reduce((sum: number, item: any) => sum + parseFloat(item.soLuong?.toString() || '0'), 0) + additionalCostTabs.reduce((sum: number, t: any) => sum + parseFloat(t.formData?.soLuong || '0'), 0); return totalKL > 0 ? (totalExportCostThucTe * curKL) / totalKL : 0; })(); return (chiPhiSanXuat + chiPhiChung + chiPhiXuatKhau).toLocaleString('vi-VN', { maximumFractionDigits: 2 }); })()}</span></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>

          {/* Danh sách sản phẩm trong định mức - Table Layout */}
          {currentTab && currentTab.selectedStandard && currentTab.selectedStandard.items && currentTab.selectedStandard.items.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">Thành phẩm đầu ra</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="px-4 py-2 bg-gray-200 border border-gray-300 text-left text-sm font-medium text-gray-700">Thành phẩm đầu ra</th>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        return (
                          <th key={index} colSpan={2} className={`px-4 py-2 border border-gray-300 text-center text-sm font-medium ${isSelected ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-700'}`}>
                            {item.tenThanhPham}
                          </th>
                        );
                      })}
                    </tr>
                    <tr>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        return (
                          <React.Fragment key={index}>
                            <th className={`px-3 py-1 border border-gray-300 text-center text-xs font-medium ${isSelected ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>Kế hoạch</th>
                            <th className={`px-3 py-1 border border-gray-300 text-center text-xs font-medium ${isSelected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>Thực tế</th>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">tỉ lệ thu hồi (%)</td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        const tiLeThuHoiThucTeObj = typeof currentTab.formData.tiLeThuHoiThucTe === 'object' && currentTab.formData.tiLeThuHoiThucTe !== null ? currentTab.formData.tiLeThuHoiThucTe : {};
                        const tiLeThucTe = tiLeThuHoiThucTeObj[item.tenThanhPham] || '';
                        return (
                          <React.Fragment key={index}>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}><span className="font-medium">{item.tiLe} %</span></td>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-green-50' : 'bg-gray-50'}`}>
                              <input type="number" step="0.01" min="0" value={tiLeThucTe} onChange={(e) => { setTabsData(prev => { const newTabs = [...prev]; const currentTiLe = typeof newTabs[activeTab].formData.tiLeThuHoiThucTe === 'object' && newTabs[activeTab].formData.tiLeThuHoiThucTe !== null ? newTabs[activeTab].formData.tiLeThuHoiThucTe : {}; newTabs[activeTab].formData.tiLeThuHoiThucTe = { ...currentTiLe, [item.tenThanhPham]: parseNumberInputStr(e.target.value) }; return newTabs; }); }} className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 bg-white text-sm" placeholder={item.tiLe.toString()} />
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">số kg thành phẩm</td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        const tiLeThuHoiK3 = parseFloat(currentTab.formData.tiLeThuHoi) || 0;
                        const soKgKeHoach = currentTab.formData.tongNguyenLieuCanSanXuat && tiLeThuHoiK3 ? (parseFloat(currentTab.formData.tongNguyenLieuCanSanXuat) * tiLeThuHoiK3 / 100 * item.tiLe / 100).toFixed(3) : '0';
                        const tiLeThuHoiThucTeObj = typeof currentTab.formData.tiLeThuHoiThucTe === 'object' && currentTab.formData.tiLeThuHoiThucTe !== null ? currentTab.formData.tiLeThuHoiThucTe : {};
                        const tiLeThucTe = tiLeThuHoiThucTeObj[item.tenThanhPham];
                        const tongNguyenLieuThucTe = parseFloat(currentTab.formData.tongNguyenLieuCanSanXuatThucTe || '0');
                        const tongKhoiLuongThanhPhamThucTe = parseFloat(currentTab.formData.tongKhoiLuongThanhPhamThucTe || '0');
                        const tiLeThuHoiK3ThucTe = tongNguyenLieuThucTe > 0 ? (tongKhoiLuongThanhPhamThucTe / tongNguyenLieuThucTe * 100) : 0;
                        const soKgThucTe = tongNguyenLieuThucTe && tiLeThuHoiK3ThucTe && tiLeThucTe ? (tongNguyenLieuThucTe * tiLeThuHoiK3ThucTe / 100 * parseFloat(tiLeThucTe) / 100).toFixed(3) : '';
                        return (
                          <React.Fragment key={index}>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}><span className="font-medium text-blue-600">{soKgKeHoach} kg</span></td>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-green-50' : 'bg-gray-50'}`}><span className="font-medium text-green-600">{soKgThucTe ? `${soKgThucTe} kg` : '-'}</span></td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="px-4 py-2 bg-gray-100 border border-gray-300 text-sm text-gray-700">giá hòa vốn (VNĐ/KG)</td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        const giaHoaVonKeHoach = isSelected ? formatNumberWithDots(calculateGiaHoaVonChinhPham(activeTab)) : formatNumberWithDots(currentTab.formData.giaHoaVonSanPhamPhu[item.tenThanhPham]);
                        const giaHoaVonThucTe = isSelected ? formatNumberWithDots(calculateGiaHoaVonChinhPhamThucTe(activeTab)) : formatNumberWithDots(currentTab.formData.giaHoaVonSanPhamPhuThucTe?.[item.tenThanhPham]);
                        return (
                          <React.Fragment key={index}>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>
                              <input type="text" value={giaHoaVonKeHoach} onChange={(e) => { if (!isSelected) { setTabsData(prev => { const newTabs = [...prev]; newTabs[activeTab].formData.giaHoaVonSanPhamPhu = { ...newTabs[activeTab].formData.giaHoaVonSanPhamPhu, [item.tenThanhPham]: String(parseNumberFromDots(e.target.value)) }; return newTabs; }); } }} disabled={isSelected} className={`w-full px-2 py-1 text-center border rounded focus:ring-2 focus:ring-blue-500 text-sm ${isSelected ? 'bg-yellow-50 border-yellow-400 font-bold' : 'bg-white border-gray-300'}`} placeholder="0" />
                            </td>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-green-50' : 'bg-gray-50'}`}>
                              {isSelected ? (
                                <input type="text" value={giaHoaVonThucTe} disabled className="w-full px-2 py-1 text-center border border-green-400 rounded bg-green-50 font-bold text-sm" placeholder="0" />
                              ) : (
                                <input type="text" value={formatNumberWithDots(currentTab.formData.giaHoaVonSanPhamPhuThucTe?.[item.tenThanhPham])} onChange={(e) => { setTabsData(prev => { const newTabs = [...prev]; newTabs[activeTab].formData.giaHoaVonSanPhamPhuThucTe = { ...newTabs[activeTab].formData.giaHoaVonSanPhamPhuThucTe, [item.tenThanhPham]: String(parseNumberFromDots(e.target.value)) }; return newTabs; }); }} className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 bg-white text-sm" placeholder="0" />
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm text-gray-700">lợi nhuận cộng thêm (VNĐ/KG)</td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        return (
                          <React.Fragment key={index}>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>
                              {isSelected ? (<input type="text" value={formatNumberWithDots(currentTab.formData.loiNhuanCongThem)} onChange={(e) => { setTabsData(prev => { const newTabs = [...prev]; newTabs[activeTab].formData.loiNhuanCongThem = String(parseNumberFromDots(e.target.value)); return newTabs; }); }} className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white text-sm" placeholder="0" />) : (<span className="text-gray-400">-</span>)}
                            </td>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-green-50' : 'bg-gray-50'}`}>
                              {isSelected ? (<input type="text" value={formatNumberWithDots(currentTab.formData.loiNhuanCongThemThucTe)} onChange={(e) => { setTabsData(prev => { const newTabs = [...prev]; newTabs[activeTab].formData.loiNhuanCongThemThucTe = String(parseNumberFromDots(e.target.value)); return newTabs; }); }} className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 bg-white text-sm" placeholder="0" />) : (<span className="text-gray-400">-</span>)}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm font-medium text-gray-700">giá báo khách (VNĐ/KG)</td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        const giaBaoKhachKeHoach = isSelected ? (() => { const giaHoaVon = calculateGiaHoaVonChinhPham(activeTab); const loiNhuan = parseFloat(currentTab.formData.loiNhuanCongThem || '0'); return formatNumberWithDots(giaHoaVon + loiNhuan); })() : '';
                        const giaBaoKhachThucTe = isSelected ? (() => { const giaHoaVon = calculateGiaHoaVonChinhPhamThucTe(activeTab); const loiNhuan = parseFloat(currentTab.formData.loiNhuanCongThemThucTe || '0'); return formatNumberWithDots(giaHoaVon + loiNhuan); })() : '';
                        return (
                          <React.Fragment key={index}>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>{isSelected ? (<input type="text" value={giaBaoKhachKeHoach} disabled className="w-full px-2 py-1 text-center border border-blue-400 rounded bg-yellow-50 font-bold text-sm" placeholder="0" />) : (<span className="text-gray-400">-</span>)}</td>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-green-50' : 'bg-gray-50'}`}>{isSelected ? (<input type="text" value={giaBaoKhachThucTe} disabled className="w-full px-2 py-1 text-center border border-green-400 rounded bg-green-50 font-bold text-sm" placeholder="0" />) : (<span className="text-gray-400">-</span>)}</td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="px-4 py-2 bg-blue-100 border border-gray-300 text-sm font-medium text-gray-700">
                        <div className="flex flex-col">
                          <span>giá báo khách (USD/KG)</span>
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-500 mr-1">Tỉ giá:</span>
                            <input type="text" value={currentTab.formData.tiGiaUSD} onChange={(e) => { const rawValue = handleNumericInput(e.target.value); setTabsData(prev => { const newTabs = [...prev]; newTabs[activeTab].formData.tiGiaUSD = rawValue; return newTabs; }); }} onBlur={(e) => { const numValue = parseNumberFromDots(e.target.value); if (numValue > 0) { setTabsData(prev => { const newTabs = [...prev]; newTabs[activeTab].formData.tiGiaUSD = formatNumberWithDots(numValue); return newTabs; }); } }} className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500" placeholder="VD: 25000" />
                          </div>
                        </div>
                      </td>
                      {currentTab.selectedStandard.items.map((item, index) => {
                        const isSelected = currentTab.formData.sanPhamDauRa === item.tenThanhPham;
                        const tiGiaUSD = parseNumberFromDots(currentTab.formData.tiGiaUSD || '0');
                        const giaBaoKhachKeHoachVND = isSelected ? calculateGiaHoaVonChinhPham(activeTab) + parseFloat(currentTab.formData.loiNhuanCongThem || '0') : 0;
                        const giaBaoKhachUSDKeHoach = isSelected && tiGiaUSD > 0 ? formatNumberWithDots(giaBaoKhachKeHoachVND / tiGiaUSD) : '';
                        const giaBaoKhachThucTeVND = isSelected ? calculateGiaHoaVonChinhPhamThucTe(activeTab) + parseFloat(currentTab.formData.loiNhuanCongThemThucTe || '0') : 0;
                        const giaBaoKhachUSDThucTe = isSelected && tiGiaUSD > 0 ? formatNumberWithDots(giaBaoKhachThucTeVND / tiGiaUSD) : '';
                        return (
                          <React.Fragment key={index}>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>{isSelected ? (<input type="text" value={giaBaoKhachUSDKeHoach} disabled className="w-full px-2 py-1 text-center border border-blue-400 rounded bg-yellow-50 font-bold text-sm" placeholder="0" />) : (<span className="text-gray-400">-</span>)}</td>
                            <td className={`px-3 py-2 border border-gray-300 text-center ${isSelected ? 'bg-green-50' : 'bg-gray-50'}`}>{isSelected ? (<input type="text" value={giaBaoKhachUSDThucTe} disabled className="w-full px-2 py-1 text-center border border-green-400 rounded bg-green-50 font-bold text-sm" placeholder="0" />) : (<span className="text-gray-400">-</span>)}</td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Chọn quy trình sản xuất */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn quy trình sản xuất</label>
            <select value={currentTab.selectedProcess?.id || ''} onChange={(e) => handleProcessChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">-- Chọn quy trình --</option>
              {productionProcesses.map((process) => (
                <option key={process.id} value={process.id}>{process.maQuyTrinhSanXuat} - {process.tenQuyTrinhSanXuat || process.tenQuyTrinh}</option>
              ))}
            </select>
          </div>

          {currentTab && currentTab.selectedProcess && !currentTab.selectedProcess.flowchart && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md flex items-start gap-2">
              <span className="text-yellow-500 mt-0.5">⚠️</span>
              <p className="text-sm text-yellow-700">Quy trình <strong>{currentTab.selectedProcess.tenQuyTrinhSanXuat || currentTab.selectedProcess.tenQuyTrinh || currentTab.selectedProcess.maQuyTrinhSanXuat}</strong> chưa có lưu đồ. Vui lòng tạo lưu đồ trong module <strong>Quy trình sản xuất</strong> trước khi sử dụng.</p>
            </div>
          )}
          {currentTab && currentTab.selectedProcess && currentTab.selectedProcess.flowchart && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-800 mb-3 border-b pb-2">Lưu đồ quy trình</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>STT</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>PHÂN ĐOẠN</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>NỘI DUNG CÔNG VIỆC</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>BIỂU MẪU</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>LOẠI CHI PHÍ</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>TÊN CHI PHÍ</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐVT</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐỊNH MỨC THỰC HIỆN</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>ĐƠN VỊ</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>KHỐI LƯỢNG CẦN THỰC HIỆN (Kg)</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" rowSpan={2}>SỐ PHÚT CẦN THỰC HIỆN XONG</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>SỐ LƯỢNG NHÂN CÔNG/VẬT TƯ CẦN DÙNG</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>KẾ HOẠCH</th>
                      <th className="border border-gray-400 px-3 py-3 text-center text-sm font-bold" colSpan={2}>THỰC TẾ</th>
                    </tr>
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
                              <td className="border border-gray-400 px-3 py-2 text-center font-medium" rowSpan={sectionRowSpan}>{sectionIndex + 1}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center" rowSpan={sectionRowSpan}>{section.phanDoan}</td>
                              <td className="border border-gray-400 px-3 py-2" rowSpan={sectionRowSpan}>{section.noiDungCongViec}</td>
                              <td className="border border-gray-400 px-3 py-2 text-center" rowSpan={sectionRowSpan}>
                                {((section as any).files && (section as any).files.length > 0) ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {(section as any).files.map((file: any, fileIdx: number) => (
                                      <div key={fileIdx} className="flex flex-col items-center gap-0.5">
                                        <span className="text-xs text-gray-500">{fileIdx + 1}.</span>
                                        <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(file.url))} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"><FileText className="w-3 h-3" />Xem</button>
                                        <button type="button" onClick={() => handlePrintFile(getFullFileUrl(file.url))} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100"><Printer className="w-3 h-3" />In</button>
                                      </div>
                                    ))}
                                  </div>
                                ) : section.fileUrl ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <button type="button" onClick={() => setPreviewFileUrl(getFullFileUrl(section.fileUrl!))} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"><FileText className="w-3 h-3" />Xem</button>
                                    <button type="button" onClick={() => handlePrintFile(getFullFileUrl(section.fileUrl!))} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100"><Printer className="w-3 h-3" />In</button>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                            </>
                          )}
                          <td className="border border-gray-400 px-3 py-2 text-center">{cost.loaiChiPhi}</td>
                          <td className="border border-gray-400 px-3 py-2">{cost.tenChiPhi || '-'}</td>
                          <td className="border border-gray-400 px-3 py-2 text-center">{cost.donVi || '-'}</td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">{cost.dinhMucLaoDong !== undefined && cost.dinhMucLaoDong !== null ? cost.dinhMucLaoDong : '-'}</td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">{cost.donViDinhMucLaoDong || '-'}</td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">{cost.soLuongNguyenLieu !== undefined && cost.soLuongNguyenLieu !== null ? cost.soLuongNguyenLieu : '-'}</td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-gray-100">{cost.soPhutThucHien !== undefined && cost.soPhutThucHien !== null ? cost.soPhutThucHien : '-'}</td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">{cost.soLuongKeHoach !== undefined && cost.soLuongKeHoach !== null ? cost.soLuongKeHoach.toFixed(2) : '-'}</td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                            <input type="text" value={flowchartInputValues[`${activeTab}-${sectionIndex}-${costIndex}-soLuongThucTe`] ?? formatNumberWithDots(cost.soLuongThucTe)} onChange={(e) => { const rawValue = handleNumericInput(e.target.value); setFlowchartInputValues(prev => ({ ...prev, [`${activeTab}-${sectionIndex}-${costIndex}-soLuongThucTe`]: rawValue })); }} onBlur={(e) => { const numValue = parseNumberFromDots(e.target.value); handleFlowchartCostChange(sectionIndex, costIndex, 'soLuongThucTe', String(numValue)); setFlowchartInputValues(prev => { const newValues = { ...prev }; delete newValues[`${activeTab}-${sectionIndex}-${costIndex}-soLuongThucTe`]; return newValues; }); }} className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right" placeholder="0" />
                          </td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                            <input type="text" value={flowchartInputValues[`${activeTab}-${sectionIndex}-${costIndex}-giaKeHoach`] ?? formatNumberWithDots(cost.giaKeHoach)} onChange={(e) => { const rawValue = handleNumericInput(e.target.value); setFlowchartInputValues(prev => ({ ...prev, [`${activeTab}-${sectionIndex}-${costIndex}-giaKeHoach`]: rawValue })); }} onBlur={(e) => { const numValue = parseNumberFromDots(e.target.value); handleFlowchartCostChange(sectionIndex, costIndex, 'giaKeHoach', String(numValue)); setFlowchartInputValues(prev => { const newValues = { ...prev }; delete newValues[`${activeTab}-${sectionIndex}-${costIndex}-giaKeHoach`]; return newValues; }); }} className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right" placeholder="0" />
                          </td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">{(() => { const gia = cost.giaKeHoach || 0; const soLuong = cost.soLuongKeHoach || 0; const thanhTien = gia * soLuong; return thanhTien > 0 ? formatNumberWithDots(thanhTien) : '0'; })()}</td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-green-50">
                            <input type="text" value={flowchartInputValues[`${activeTab}-${sectionIndex}-${costIndex}-giaThucTe`] ?? formatNumberWithDots(cost.giaThucTe)} onChange={(e) => { const rawValue = handleNumericInput(e.target.value); setFlowchartInputValues(prev => ({ ...prev, [`${activeTab}-${sectionIndex}-${costIndex}-giaThucTe`]: rawValue })); }} onBlur={(e) => { const numValue = parseNumberFromDots(e.target.value); handleFlowchartCostChange(sectionIndex, costIndex, 'giaThucTe', String(numValue)); setFlowchartInputValues(prev => { const newValues = { ...prev }; delete newValues[`${activeTab}-${sectionIndex}-${costIndex}-giaThucTe`]; return newValues; }); }} className="w-full min-w-[100px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-right" placeholder="0" />
                          </td>
                          <td className="border border-gray-400 px-3 py-2 text-center bg-blue-50 font-medium">{(() => { const gia = cost.giaThucTe || 0; const soLuong = cost.soLuongThucTe || 0; const thanhTien = gia * soLuong; return thanhTien > 0 ? formatNumberWithDots(thanhTien) : '0'; })()}</td>
                        </tr>
                      ));
                    })}
                    <tr className="bg-blue-100 font-bold">
                      <td colSpan={14} className="border border-gray-400 px-3 py-3 text-right text-sm">Tổng cộng</td>
                      <td className="border border-gray-400 px-3 py-3 text-center text-sm">{(() => { const total = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => { return sum + section.costs.reduce((costSum, cost) => { const gia = cost.giaKeHoach || 0; const soLuong = cost.soLuongKeHoach || 0; return costSum + (gia * soLuong); }, 0); }, 0); return total.toLocaleString('vi-VN') + ' VNĐ'; })()}</td>
                      <td className="border border-gray-400 px-3 py-3 bg-gray-100"></td>
                      <td className="border border-gray-400 px-3 py-3 text-center text-sm">{(() => { const total = currentTab.selectedProcess.flowchart.sections.reduce((sum, section) => { return sum + section.costs.reduce((costSum, cost) => { const gia = cost.giaThucTe || 0; const soLuong = cost.soLuongThucTe || 0; return costSum + (gia * soLuong); }, 0); }, 0); return total.toLocaleString('vi-VN') + ' VNĐ'; })()}</td>
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
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors" disabled={loading}>Hủy</button>
            {(isOrderSummaryTab || isRevenueTab) ? (
              <>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400" disabled={loading} onClick={(e) => { e.preventDefault(); handleSaveOrderSummaryData(); }}>
                  {loading ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400" disabled={loading}>
                  {loading ? 'Đang tạo...' : 'Tạo báo giá'}
                </button>
              </>
            ) : (
              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu'}
              </button>
            )}
          </div>
        </form>
      </div>
    </Modal>

    {/* Modal Tạo Báo Giá */}
    <CreateQuotationSubModal
      isOpen={showCreateQuotationModal}
      loading={loading}
      quotationFormData={quotationFormData}
      setQuotationFormData={setQuotationFormData}
      onClose={() => setShowCreateQuotationModal(false)}
      onSubmit={handleCreateQuotation}
    />

    {/* Modal thêm chi phí bổ sung */}
    <Modal isOpen={showAddCostModal} onClose={() => {}} showBackdrop>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Thêm chi phí bổ sung</h3>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên chi phí bổ sung <span className="text-red-500">*</span></label>
            <input type="text" value={newCostName} onChange={(e) => setNewCostName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500" placeholder="Nhập tên chi phí bổ sung" autoFocus />
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => { setShowAddCostModal(false); setNewCostName(''); }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
            <button type="button" onClick={handleAddAdditionalCost} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Thêm</button>
          </div>
        </div>
      </div>
    </Modal>

    {/* Modal chọn sản phẩm cho chi phí chung */}
    <ProductSelectionModal
      isOpen={showProductSelectionModal}
      editingGeneralCostGroupId={editingGeneralCostGroupId}
      generalCostGroups={generalCostGroups}
      tabsData={tabsData}
      additionalCostTabs={additionalCostTabs}
      updateGeneralCostGroupProducts={updateGeneralCostGroupProducts}
      onClose={() => { setShowProductSelectionModal(false); setEditingGeneralCostGroupId(null); }}
    />

    {/* Popup kiểm tra tồn kho */}
    <InventoryCheckPopup
      inventoryCheckResult={inventoryCheckResult}
      onClose={() => setInventoryCheckResult(prev => ({ ...prev, show: false }))}
    />

    {/* File Preview Modal */}
    <Modal isOpen={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} showBackdrop closeOnBackdrop={true}>
      {previewFileUrl && (
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
            <h3 className="text-sm font-medium text-gray-700 truncate flex-1">{getFileName(previewFileUrl)}</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePrintFile(previewFileUrl)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Printer className="w-4 h-4" />In
              </button>
              <button
                type="button"
                onClick={() => setPreviewFileUrl(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {previewFileUrl.toLowerCase().endsWith('.pdf') ? (
              <iframe src={`${getFullFileUrl(previewFileUrl)}#toolbar=0`} className="w-full h-full border-0" title="PDF Preview" />
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
        </div>
      )}
    </Modal>
  </>
  );
};

export default QuotationCalculatorModal;
