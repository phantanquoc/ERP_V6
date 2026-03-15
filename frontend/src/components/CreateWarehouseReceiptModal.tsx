import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import warehouseReceiptService from '../services/warehouseReceiptService';
import warehouseService, { Warehouse, Lot } from '../services/warehouseService';
import { useAuth } from '../contexts/AuthContext';
import { SupplyRequest } from '../services/supplyRequestService';
import { parseNumberInput } from '../utils/numberInput';

interface CreateWarehouseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyRequest?: SupplyRequest | null;
  onSuccess?: () => void;
}

const CreateWarehouseReceiptModal: React.FC<CreateWarehouseReceiptModalProps> = ({
  isOpen,
  onClose,
  supplyRequest,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    maPhieuNhap: '',
    warehouseId: '',
    lotId: '',
    soLuongNhap: 0,
    ghiChu: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
      generateCode();

      if (supplyRequest) {
        setFormData(prev => ({
          ...prev,
          soLuongNhap: supplyRequest.soLuong,
          ghiChu: `Nhập kho cho yêu cầu cung cấp ${supplyRequest.maYeuCau} - ${supplyRequest.tenGoi}`,
        }));
      }
    }
  }, [isOpen, supplyRequest]);

  const generateCode = async () => {
    try {
      const response = await warehouseReceiptService.generateReceiptCode();
      setFormData(prev => ({ ...prev, maPhieuNhap: response.data.code }));
    } catch (error) {
      console.error('Error generating receipt code:', error);
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

  const handleWarehouseChange = (warehouseId: string) => {
    setFormData({ ...formData, warehouseId, lotId: '' });
    const warehouse = warehouses.find(w => w.id === warehouseId);
    setLots(warehouse?.lots || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.warehouseId || !formData.lotId) {
      alert('Vui lòng chọn kho và lô');
      return;
    }

    if (!supplyRequest?.tenGoi) {
      alert('Không có thông tin sản phẩm từ yêu cầu cung cấp');
      return;
    }

    setLoading(true);
    try {
      const warehouse = warehouses.find(w => w.id === formData.warehouseId);
      const lot = lots.find(l => l.id === formData.lotId);

      await warehouseReceiptService.createWarehouseReceipt({
        maPhieuNhap: formData.maPhieuNhap,
        employeeId: user?.employeeId || '',
        maNhanVien: user?.employeeCode || '',
        tenNhanVien: `${user?.firstName} ${user?.lastName}`,
        warehouseId: formData.warehouseId,
        tenKho: warehouse?.tenKho || '',
        lotId: formData.lotId,
        tenLo: lot?.tenLo || '',
        tenSanPham: supplyRequest.tenGoi,
        soLuongNhap: formData.soLuongNhap,
        donViTinh: supplyRequest.donViTinh,
        ghiChu: formData.ghiChu,
        supplyRequestId: supplyRequest?.id,
      });

      alert('Tạo phiếu nhập kho thành công!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Tạo phiếu nhập kho</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Supply Request Info (if available) */}
          {supplyRequest && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Thông tin yêu cầu cung cấp</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Mã yêu cầu:</span>
                  <span className="ml-2 font-medium">{supplyRequest.maYeuCau}</span>
                </div>
                <div>
                  <span className="text-gray-600">Tên gọi:</span>
                  <span className="ml-2 font-medium">{supplyRequest.tenGoi}</span>
                </div>
                <div>
                  <span className="text-gray-600">Số lượng yêu cầu:</span>
                  <span className="ml-2 font-medium">{supplyRequest.soLuong} {supplyRequest.donViTinh}</span>
                </div>
                <div>
                  <span className="text-gray-600">Người yêu cầu:</span>
                  <span className="ml-2 font-medium">{supplyRequest.tenNhanVien}</span>
                </div>
              </div>
            </div>
          )}

          {/* Mã phiếu nhập */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã phiếu nhập
            </label>
            <input
              type="text"
              value={formData.maPhieuNhap}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>

          {/* Tên nhân viên */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên nhân viên
            </label>
            <input
              type="text"
              value={`${user?.firstName} ${user?.lastName}`}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>

          {/* Kho */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kho <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.warehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Chọn kho</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.tenKho}
                </option>
              ))}
            </select>
          </div>

          {/* Lô */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lô <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.lotId}
              onChange={(e) => setFormData({ ...formData, lotId: e.target.value })}
              required
              disabled={!formData.warehouseId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
            >
              <option value="">Chọn lô</option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.tenLo}
                </option>
              ))}
            </select>
          </div>

          {/* Sản phẩm (auto-fill từ yêu cầu cung cấp) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sản phẩm
            </label>
            <input
              type="text"
              value={supplyRequest?.tenGoi || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tự động lấy từ tên gọi yêu cầu cung cấp. Nếu sản phẩm đã có trong lô sẽ cộng dồn, nếu chưa có sẽ tạo mới.
            </p>
          </div>

          {/* Số lượng nhập */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số lượng nhập kho <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.soLuongNhap}
              onChange={(e) => setFormData({ ...formData, soLuongNhap: parseNumberInput(e.target.value) })}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="Nhập số lượng"
            />
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ghi chú
            </label>
            <textarea
              value={formData.ghiChu}
              onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="Nhập ghi chú (nếu có)"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Tạo phiếu nhập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWarehouseReceiptModal;

