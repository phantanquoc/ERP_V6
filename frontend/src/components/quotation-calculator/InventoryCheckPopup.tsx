import React from 'react';
import { X, Package } from 'lucide-react';
import Modal from '../Modal';
import { InventoryCheckResult } from './types';

interface InventoryCheckPopupProps {
  inventoryCheckResult: InventoryCheckResult;
  onClose: () => void;
}

const InventoryCheckPopup: React.FC<InventoryCheckPopupProps> = ({
  inventoryCheckResult,
  onClose,
}) => {
  return (
    <Modal
      isOpen={inventoryCheckResult.show}
      onClose={onClose}
      showBackdrop
      closeOnBackdrop={true}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-[700px] max-w-[90vw] flex flex-col modal-viewport-h"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-600" />
            Kiểm tra tồn kho
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
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
                    <p className="text-sm text-orange-600 text-center py-2">
                      Không tìm thấy tồn kho cho nguyên liệu này
                    </p>
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
                            {inventoryCheckResult.materialItems
                              .reduce((s, i) => s + i.soLuong, 0)
                              .toLocaleString('vi-VN', { maximumFractionDigits: 2 })}{' '}
                            {inventoryCheckResult.materialItems[0]?.donViTinh || ''}
                          </td>
                          <td className="px-3 py-2 border border-gray-200 text-right text-green-800">
                            {(() => {
                              const withPrice = inventoryCheckResult.materialItems.filter((i) => i.giaThanh > 0);
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
                    <p className="text-sm text-orange-600 text-center py-2">
                      Không tìm thấy tồn kho cho sản phẩm này
                    </p>
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
                            {inventoryCheckResult.items
                              .reduce((s, i) => s + i.soLuong, 0)
                              .toLocaleString('vi-VN', { maximumFractionDigits: 2 })}{' '}
                            {inventoryCheckResult.items[0]?.donViTinh || ''}
                          </td>
                          <td className="px-3 py-2 border border-gray-200 text-right text-green-800">
                            {(() => {
                              const withPrice = inventoryCheckResult.items.filter((i) => i.giaThanh > 0);
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
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default InventoryCheckPopup;
