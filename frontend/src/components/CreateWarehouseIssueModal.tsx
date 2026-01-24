import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import warehouseIssueService from '../services/warehouseIssueService';
import warehouseService, { Warehouse, Lot, LotProduct } from '../services/warehouseService';
import { useAuth } from '../contexts/AuthContext';
import { SupplyRequest } from '../services/supplyRequestService';

interface CreateWarehouseIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyRequest?: SupplyRequest | null;
  onSuccess?: () => void;
}

const CreateWarehouseIssueModal: React.FC<CreateWarehouseIssueModalProps> = ({
  isOpen,
  onClose,
  supplyRequest,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotProducts, setLotProducts] = useState<LotProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    maPhieuXuat: '',
    warehouseId: '',
    lotId: '',
    lotProductId: '',
    soLuongXuat: 0,
    ghiChu: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
      generateCode();
      
      // Pre-fill data from supply request if available
      if (supplyRequest) {
        setFormData(prev => ({
          ...prev,
          soLuongXuat: supplyRequest.soLuong,
          ghiChu: `Xuất kho cho yêu cầu cung cấp ${supplyRequest.maYeuCau} - ${supplyRequest.tenGoi}`,
        }));
      }
    }
  }, [isOpen, supplyRequest]);

  const generateCode = async () => {
    try {
      const response = await warehouseIssueService.generateIssueCode();
      setFormData(prev => ({ ...prev, maPhieuXuat: response.data.maPhieuXuat }));
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

  const handleWarehouseChange = (warehouseId: string) => {
    setFormData({ ...formData, warehouseId, lotId: '', lotProductId: '' });
    const warehouse = warehouses.find(w => w.id === warehouseId);
    setLots(warehouse?.lots || []);
    setLotProducts([]);
  };

  const handleLotChange = (lotId: string) => {
    setFormData({ ...formData, lotId, lotProductId: '' });
    const lot = lots.find(l => l.id === lotId);
    setLotProducts(lot?.lotProducts || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.warehouseId || !formData.lotId || !formData.lotProductId) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      const warehouse = warehouses.find(w => w.id === formData.warehouseId);
      const lot = lots.find(l => l.id === formData.lotId);
      const lotProduct = lotProducts.find(lp => lp.id === formData.lotProductId);

      await warehouseIssueService.createWarehouseIssue({
        maPhieuXuat: formData.maPhieuXuat,
        employeeId: user?.id || '',
        maNhanVien: user?.employeeCode || '',
        tenNhanVien: `${user?.firstName} ${user?.lastName}`,
        warehouseId: formData.warehouseId,
        tenKho: warehouse?.tenKho || '',
        lotId: formData.lotId,
        tenLo: lot?.tenLo || '',
        lotProductId: formData.lotProductId,
        tenSanPham: lotProduct?.internationalProduct?.tenSanPham || '',
        soLuongXuat: formData.soLuongXuat,
        donViTinh: lotProduct?.donViTinh || '',
        ghiChu: formData.ghiChu,
      });

      alert('Tạo phiếu xuất kho thành công!');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Tạo phiếu xuất kho</h2>
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

          {/* Mã phiếu xuất */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã phiếu xuất
            </label>
            <input
              type="text"
              value={formData.maPhieuXuat}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
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
              onChange={(e) => handleLotChange(e.target.value)}
              required
              disabled={!formData.warehouseId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
            >
              <option value="">Chọn lô</option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.tenLo}
                </option>
              ))}
            </select>
          </div>

          {/* Sản phẩm */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sản phẩm <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.lotProductId}
              onChange={(e) => setFormData({ ...formData, lotProductId: e.target.value })}
              required
              disabled={!formData.lotId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
            >
              <option value="">Chọn sản phẩm</option>
              {lotProducts.map((lotProduct) => (
                <option key={lotProduct.id} value={lotProduct.id}>
                  {lotProduct.internationalProduct?.tenSanPham} - Tồn kho: {lotProduct.soLuong} {lotProduct.donViTinh}
                </option>
              ))}
            </select>
          </div>

          {/* Số lượng xuất */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số lượng xuất kho <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.soLuongXuat}
              onChange={(e) => setFormData({ ...formData, soLuongXuat: parseFloat(e.target.value) || 0 })}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="Nhập số lượng"
            />
            {formData.lotProductId && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-red-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">
                    Tồn kho hiện tại: {lotProducts.find(lp => lp.id === formData.lotProductId)?.soLuong || 0}{' '}
                    {lotProducts.find(lp => lp.id === formData.lotProductId)?.donViTinh}
                  </span>
                </div>
                <p className="text-xs text-red-700 mt-1">
                  Sau khi xuất: {((lotProducts.find(lp => lp.id === formData.lotProductId)?.soLuong || 0) - formData.soLuongXuat).toFixed(2)}{' '}
                  {lotProducts.find(lp => lp.id === formData.lotProductId)?.donViTinh}
                </p>
              </div>
            )}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
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
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Tạo phiếu xuất'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWarehouseIssueModal;

