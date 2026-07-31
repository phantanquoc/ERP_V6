import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import warehouseIssueService from '../services/warehouseIssueService';
import warehouseService, { Warehouse, Lot, LotProduct } from '../services/warehouseService';
import { useAuth } from '../contexts/AuthContext';
import { SupplyRequest } from '../services/supplyRequestService';
import { parseNumberInput } from '../utils/numberInput';
import Modal from './Modal';
import LotProductCombobox from './common/LotProductCombobox';

interface CreateWarehouseIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyRequest?: SupplyRequest | null;
  onSuccess?: () => void;
}

interface IssueRow {
  warehouseId: string;
  lotId: string;
  lotProductId: string;
  soLuongXuat: number;
  ghiChu: string;
  // Cached display data
  lots: Lot[];
  lotProducts: LotProduct[];
  // Source item info
  tenGoi: string;
  donViTinh: string;
}

const CreateWarehouseIssueModal: React.FC<CreateWarehouseIssueModalProps> = ({
  isOpen,
  onClose,
  supplyRequest,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [maPhieuXuatBase, setMaPhieuXuatBase] = useState('');
  const [rows, setRows] = useState<IssueRow[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
      generateCode();

      // Init rows from supply request items
      if (supplyRequest?.items && supplyRequest.items.length > 0) {
        setRows(supplyRequest.items.map(item => ({
          warehouseId: '',
          lotId: '',
          lotProductId: '',
          soLuongXuat: item.soLuong,
          ghiChu: `Xuất kho cho ${supplyRequest.maYeuCau} - ${item.tenGoi}`,
          lots: [],
          lotProducts: [],
          tenGoi: item.tenGoi,
          donViTinh: item.donViTinh,
        })));
      } else {
        setRows([{
          warehouseId: '', lotId: '', lotProductId: '',
          soLuongXuat: 0, ghiChu: '', lots: [], lotProducts: [],
          tenGoi: '', donViTinh: '',
        }]);
      }
    }
  }, [isOpen, supplyRequest]);

  const generateCode = async () => {
    try {
      const response = await warehouseIssueService.generateIssueCode();
      setMaPhieuXuatBase(response.data.maPhieuXuat);
    } catch (error) {
      console.error('Error generating issue code:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseService.getAllWarehouses();
      if (response.data && Array.isArray(response.data.data)) {
        setWarehouses(response.data.data);
      } else if (Array.isArray(response.data)) {
        setWarehouses(response.data);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const updateRow = (index: number, updates: Partial<IssueRow>) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, ...updates } : row));
  };

  const handleWarehouseChange = (index: number, warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    updateRow(index, {
      warehouseId,
      lotId: '',
      lotProductId: '',
      lots: warehouse?.lots || [],
      lotProducts: [],
    });
  };

  const handleLotChange = (index: number, lotId: string) => {
    const lot = rows[index].lots.find(l => l.id === lotId);
    updateRow(index, {
      lotId,
      lotProductId: '',
      lotProducts: lot?.lotProducts || [],
    });
  };

  const addRow = () => {
    setRows(prev => [...prev, {
      warehouseId: '', lotId: '', lotProductId: '',
      soLuongXuat: 0, ghiChu: '', lots: [], lotProducts: [],
      tenGoi: '', donViTinh: '',
    }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.warehouseId || !row.lotId || !row.lotProductId) {
        alert(`Dòng ${i + 1}: Vui lòng chọn đầy đủ kho, lô và sản phẩm`);
        return;
      }
      if (row.soLuongXuat <= 0) {
        alert(`Dòng ${i + 1}: Số lượng xuất phải lớn hơn 0`);
        return;
      }
      // Guard against issuing more than what's in the kiện — backend would reject,
      // but catching it here saves a round trip and names the row that's wrong.
      const lp = row.lotProducts.find((p) => p.id === row.lotProductId);
      if (lp && row.soLuongXuat > lp.soLuong) {
        alert(
          `Dòng ${i + 1}: Số lượng xuất (${row.soLuongXuat}) vượt tồn kho của kiện ` +
          `${lp.maKien ?? ''} (còn ${lp.soLuong} ${lp.donViTinh})`
        );
        return;
      }
    }

    setLoading(true);
    try {
      // Submit each row as a separate warehouse issue
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const warehouse = warehouses.find(w => w.id === row.warehouseId);
        const lot = row.lots.find(l => l.id === row.lotId);
        const lotProduct = row.lotProducts.find(lp => lp.id === row.lotProductId);

        const maPhieuXuat = rows.length === 1
          ? maPhieuXuatBase
          : `${maPhieuXuatBase}-${String.fromCharCode(65 + i)}`;

        await warehouseIssueService.createWarehouseIssue({
          maPhieuXuat,
          employeeId: user?.id || '',
          maNhanVien: user?.employeeCode || '',
          tenNhanVien: `${user?.lastName} ${user?.firstName}`,
          warehouseId: row.warehouseId,
          tenKho: warehouse?.tenKho || '',
          lotId: row.lotId,
          tenLo: lot?.tenLo || '',
          lotProductId: row.lotProductId,
          tenSanPham: lotProduct?.internationalProduct?.tenSanPham || '',
          soLuongXuat: row.soLuongXuat,
          donViTinh: lotProduct?.donViTinh || '',
          ghiChu: row.ghiChu,
          supplyRequestId: supplyRequest?.id,
        });
      }

      alert(`Tạo ${rows.length} phiếu xuất kho thành công!`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo phiếu xuất kho');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[900px] flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Tạo phiếu xuất kho</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto flex-1">
          {/* Supply Request Info */}
          {supplyRequest && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Thông tin yêu cầu cung cấp</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Mã yêu cầu:</span>
                  <span className="ml-2 font-medium">{supplyRequest.maYeuCau}</span>
                </div>
                <div>
                  <span className="text-gray-600">Người yêu cầu:</span>
                  <span className="ml-2 font-medium">{supplyRequest.tenNhanVien}</span>
                </div>
              </div>
            </div>
          )}

          {/* Header info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã phiếu xuất</label>
              <input type="text" value={maPhieuXuatBase} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
              {rows.length > 1 && (
                <p className="text-xs text-gray-500 mt-1">Sẽ tạo {rows.length} phiếu: {rows.map((_, i) => `${maPhieuXuatBase}-${String.fromCharCode(65 + i)}`).join(', ')}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhân viên</label>
              <input type="text" value={`${user?.lastName} ${user?.firstName}`} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Danh sách sản phẩm xuất kho <span className="text-red-500">*</span>
              </label>
              <button type="button" onClick={addRow}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                <Plus className="h-4 w-4" />
                Thêm dòng
              </button>
            </div>

            <div className="space-y-4">
              {rows.map((row, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      Sản phẩm {index + 1}{row.tenGoi ? `: ${row.tenGoi}` : ''}
                    </span>
                    <button type="button" onClick={() => removeRow(index)} disabled={rows.length === 1}
                      className="text-red-500 hover:text-red-700 disabled:text-gray-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Kho */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kho <span className="text-red-500">*</span></label>
                      <select value={row.warehouseId} onChange={(e) => handleWarehouseChange(index, e.target.value)}
                        required className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500">
                        <option value="">Chọn kho</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.tenKho}</option>)}
                      </select>
                    </div>

                    {/* Lô */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Lô <span className="text-red-500">*</span></label>
                      <select value={row.lotId} onChange={(e) => handleLotChange(index, e.target.value)}
                        required disabled={!row.warehouseId}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 disabled:bg-gray-100">
                        <option value="">Chọn lô</option>
                        {row.lots.map(l => <option key={l.id} value={l.id}>{l.tenLo}</option>)}
                      </select>
                    </div>

                    {/* Sản phẩm — searchable, chỉ hiện kiện còn tồn */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kiện hàng <span className="text-red-500">*</span></label>
                      <LotProductCombobox
                        lotProducts={row.lotProducts}
                        value={row.lotProductId || null}
                        disabled={!row.lotId}
                        onChange={(lotProductId) => updateRow(index, { lotProductId: lotProductId ?? '' })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {/* Số lượng */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Số lượng xuất <span className="text-red-500">*</span></label>
                      <input type="number" value={row.soLuongXuat}
                        onChange={(e) => updateRow(index, { soLuongXuat: parseNumberInput(e.target.value) })}
                        required min="0" step="0.01"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500" />
                      {row.lotProductId && (() => {
                        const lp = row.lotProducts.find(lp => lp.id === row.lotProductId);
                        if (!lp) return null;
                        const isOver = row.soLuongXuat > lp.soLuong;
                        return (
                          <p className={`text-xs mt-1 ${isOver ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {isOver
                              ? `Vượt tồn kho — kiện chỉ còn ${lp.soLuong} ${lp.donViTinh}`
                              : `Tồn kho: ${lp.soLuong} ${lp.donViTinh} → Sau xuất: ${(lp.soLuong - row.soLuongXuat).toFixed(2)}`}
                          </p>
                        );
                      })()}
                    </div>

                    {/* Ghi chú */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
                      <input type="text" value={row.ghiChu}
                        onChange={(e) => updateRow(index, { ghiChu: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500"
                        placeholder="VD: theo đơn hàng nào? khách hàng nào? lẻ hay không?" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Đang xử lý...' : `Tạo ${rows.length > 1 ? rows.length + ' phiếu' : 'phiếu'} xuất kho`}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateWarehouseIssueModal;
