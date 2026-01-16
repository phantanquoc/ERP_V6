import React, { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import warehouseIssueService, { WarehouseIssue } from '../services/warehouseIssueService';
import warehouseService, { Warehouse, Lot, LotProduct } from '../services/warehouseService';
import { useAuth } from '../contexts/AuthContext';

const WarehouseIssueTab: React.FC = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<WarehouseIssue[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [lotProducts, setLotProducts] = useState<LotProduct[]>([]);
  const [showModal, setShowModal] = useState(false);
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
    fetchIssues();
    fetchWarehouses();
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await warehouseIssueService.getAllWarehouseIssues();
      console.log('Issues response:', response);
      // Kiểm tra nếu response.data là object có property data
      if (response.data && Array.isArray(response.data.data)) {
        setIssues(response.data.data);
      } else if (Array.isArray(response.data)) {
        setIssues(response.data);
      } else {
        console.error('Unexpected issues response format:', response.data);
        setIssues([]);
      }
    } catch (error: any) {
      console.error('Error fetching issues:', error);
      setIssues([]);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseService.getAllWarehouses();
      console.log('Warehouses response:', response);
      // Kiểm tra nếu response.data là object có property data
      if (response.data && Array.isArray(response.data.data)) {
        setWarehouses(response.data.data);
      } else if (Array.isArray(response.data)) {
        setWarehouses(response.data);
      } else {
        console.error('Unexpected warehouses response format:', response.data);
        setWarehouses([]);
      }
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      setWarehouses([]);
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

  const handleOpenModal = async () => {
    try {
      const response = await warehouseIssueService.generateIssueCode();
      setFormData({
        maPhieuXuat: response.data.maPhieuXuat,
        warehouseId: '',
        lotId: '',
        lotProductId: '',
        soLuongXuat: 0,
        ghiChu: '',
      });
      setShowModal(true);
    } catch (error: any) {
      alert('Lỗi khi tạo mã phiếu xuất');
    }
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
      setShowModal(false);
      fetchIssues();
      fetchWarehouses(); // Refresh to get updated quantities
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo phiếu xuất kho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Phiếu xuất kho</h2>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Tạo phiếu xuất
        </button>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã phiếu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày xuất</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nhân viên</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kho</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lô</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số lượng xuất</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {issues.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Chưa có phiếu xuất kho nào
                </td>
              </tr>
            ) : (
              issues.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {issue.maPhieuXuat}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(issue.ngayXuat).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {issue.tenNhanVien}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {issue.tenKho}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {issue.tenLo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {issue.tenSanPham}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {issue.soLuongXuat} {issue.donViTinh}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Issue Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Phiếu xuất kho</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Mã nhân viên */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã nhân viên
                </label>
                <input
                  type="text"
                  value={user?.employeeCode || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>

              {/* Chọn kho */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chọn kho <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Chọn kho --</option>
                  {Array.isArray(warehouses) && warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.tenKho}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn số lô */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chọn số lô <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.lotId}
                  onChange={(e) => handleLotChange(e.target.value)}
                  required
                  disabled={!formData.warehouseId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                >
                  <option value="">-- Chọn lô --</option>
                  {Array.isArray(lots) && lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.tenLo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn hàng hóa nhập kho */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chọn hàng hóa nhập kho <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.lotProductId}
                  onChange={(e) => setFormData({ ...formData, lotProductId: e.target.value })}
                  required
                  disabled={!formData.lotId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {Array.isArray(lotProducts) && lotProducts.map((lotProduct) => (
                    <option key={lotProduct.id} value={lotProduct.id}>
                      {lotProduct.internationalProduct?.tenSanPham} (Tồn: {lotProduct.soLuong} {lotProduct.donViTinh})
                    </option>
                  ))}
                </select>
              </div>

              {/* Số lượng xuất kho */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số lượng xuất kho <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.soLuongXuat}
                  onChange={(e) => setFormData({ ...formData, soLuongXuat: parseFloat(e.target.value) })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Nhập ghi chú (nếu có)"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
      )}
    </div>
  );
};

export default WarehouseIssueTab;

