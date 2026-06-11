import React from 'react';
import { X } from 'lucide-react';
import Modal from '../Modal';
import { GeneralCostGroup, MainTab, AdditionalCostTab } from './types';

interface ProductSelectionModalProps {
  isOpen: boolean;
  editingGeneralCostGroupId: string | null;
  generalCostGroups: GeneralCostGroup[];
  tabsData: MainTab[];
  additionalCostTabs: AdditionalCostTab[];
  updateGeneralCostGroupProducts: (groupId: string, productIds: string[]) => void;
  onClose: () => void;
}

const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
  isOpen,
  editingGeneralCostGroupId,
  generalCostGroups,
  tabsData,
  additionalCostTabs,
  updateGeneralCostGroupProducts,
  onClose,
}) => {
  const currentGroup = generalCostGroups.find((g) => g.id === editingGeneralCostGroupId);

  const handleSelectAll = () => {
    if (!editingGeneralCostGroupId) return;
    const allProductIds = [
      ...tabsData.map((_, index) => `tab-${index}`),
      ...additionalCostTabs.map((tab) => `additional-${tab.id}`),
    ];
    updateGeneralCostGroupProducts(editingGeneralCostGroupId, allProductIds);
  };

  const handleDeselectAll = () => {
    if (!editingGeneralCostGroupId) return;
    updateGeneralCostGroupProducts(editingGeneralCostGroupId, []);
  };

  return (
    <Modal
      isOpen={isOpen && !!editingGeneralCostGroupId}
      onClose={onClose}
      showBackdrop
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[calc(100vh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-semibold text-white">
            Chọn sản phẩm cho:{' '}
            {currentGroup?.tenBangChiPhi || 'Chi phí chung'}
          </h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Chọn các sản phẩm mà chi phí chung sẽ được phân bổ cho. Nếu không chọn sản phẩm nào,
              chi phí sẽ được phân bổ cho tất cả sản phẩm.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-blue-300"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
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
                    const isSelected = currentGroup?.selectedProducts.includes(productId) || false;
                    const productName =
                      tab.formData.tenDinhMuc ||
                      tab.selectedStandard?.tenDinhMuc ||
                      `Sản phẩm ${index + 1}`;

                    return (
                      <label
                        key={productId}
                        className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-green-50 border-2 border-green-300'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (editingGeneralCostGroupId && currentGroup) {
                              if (e.target.checked) {
                                updateGeneralCostGroupProducts(editingGeneralCostGroupId, [
                                  ...currentGroup.selectedProducts,
                                  productId,
                                ]);
                              } else {
                                updateGeneralCostGroupProducts(
                                  editingGeneralCostGroupId,
                                  currentGroup.selectedProducts.filter((id) => id !== productId),
                                );
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
                    const isSelected = currentGroup?.selectedProducts.includes(productId) || false;
                    const productName = tab.formData.tenDinhMuc || `Chi phí bổ sung ${index + 1}`;

                    return (
                      <label
                        key={productId}
                        className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-green-50 border-2 border-green-300'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (editingGeneralCostGroupId && currentGroup) {
                              if (e.target.checked) {
                                updateGeneralCostGroupProducts(editingGeneralCostGroupId, [
                                  ...currentGroup.selectedProducts,
                                  productId,
                                ]);
                              } else {
                                updateGeneralCostGroupProducts(
                                  editingGeneralCostGroupId,
                                  currentGroup.selectedProducts.filter((id) => id !== productId),
                                );
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
            Đã chọn:{' '}
            <span className="font-semibold">
              {currentGroup?.selectedProducts.length || 0}
            </span>{' '}
            / {tabsData.length + additionalCostTabs.length} sản phẩm
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ProductSelectionModal;
