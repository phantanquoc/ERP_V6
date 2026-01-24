import React, { useState, useEffect } from 'react';
import { Plus, FileText, Eye } from 'lucide-react';
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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<WarehouseIssue | null>(null);
  const [loading, setLoading] = useState(false);

  const handleViewDetail = (issue: WarehouseIssue) => {
    setSelectedIssue(issue);
    setShowDetailModal(true);
  };

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {issues.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Chưa có phiếu xuất kho nào
                </td>
              </tr>
            ) : (
              issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleViewDetail(issue)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Chi tiết phiếu xuất kho</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-800 font-semibold text-lg">
                <FileText className="h-5 w-5" />
                {selectedIssue.maPhieuXuat}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Ngày xuất</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {new Date(selectedIssue.ngayXuat).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Nhân viên thực hiện</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedIssue.tenNhanVien}</p>
                  <p className="text-xs text-gray-500">{selectedIssue.maNhanVien}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Kho</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedIssue.tenKho}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase font-medium">Lô hàng</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedIssue.tenLo}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="text-xs text-gray-500 uppercase font-medium">Sản phẩm</label>
                <p className="text-sm font-semibold text-gray-900 mt-1">{selectedIssue.tenSanPham}</p>
              </div>

              {/* Lịch sử biến động số lượng */}
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-sm font-semibold text-orange-800">Lịch sử biến động số lượng</span>
                </div>
                <div className="flex items-center justify-between">
                  {/* Số lượng trước */}
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-500 uppercase mb-1">Trước khi xuất</p>
                    <p className="text-xl font-bold text-gray-700">
                      {selectedIssue.soLuongTruoc || 0} <span className="text-sm">{selectedIssue.donViTinh}</span>
                    </p>
                  </div>

                  {/* Mũi tên + Số lượng xuất */}
                  <div className="flex flex-col items-center px-4">
                    <div className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded-full">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20V4m0 0l-4 4m4-4l4 4" />
                      </svg>
                      <span className="text-red-700 font-bold">-{selectedIssue.soLuongXuat}</span>
                    </div>
                    <svg className="w-6 h-6 text-red-500 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>

                  {/* Số lượng sau */}
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-500 uppercase mb-1">Sau khi xuất</p>
                    <p className="text-xl font-bold text-red-600">
                      {selectedIssue.soLuongSau || 0} <span className="text-sm">{selectedIssue.donViTinh}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <label className="text-xs text-red-600 uppercase font-medium">Số lượng xuất</label>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  {selectedIssue.soLuongXuat} <span className="text-lg">{selectedIssue.donViTinh}</span>
                </p>
              </div>

              {selectedIssue.ghiChu && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <label className="text-xs text-yellow-600 uppercase font-medium">Ghi chú</label>
                  <p className="text-sm text-gray-700 mt-1">{selectedIssue.ghiChu}</p>
                </div>
              )}

              <div className="text-xs text-gray-400 text-right">
                Tạo lúc: {new Date(selectedIssue.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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
                  onChange={(e) => setFormData({ ...formData, soLuongXuat: parseFloat(e.target.value) || 0 })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Nhập số lượng"
                />
                {/* Chú thích lịch sử thay đổi số lượng */}
                {formData.lotProductId && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-red-800">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Thông tin thay đổi số lượng:</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between items-center bg-white px-2 py-1 rounded">
                        <span className="text-gray-600">Số lượng hiện tại:</span>
                        <span className="font-semibold text-gray-900">
                          {lotProducts.find(lp => lp.id === formData.lotProductId)?.soLuong || 0} {lotProducts.find(lp => lp.id === formData.lotProductId)?.donViTinh || ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-white px-2 py-1 rounded">
                        <span className="text-gray-600">Sau khi xuất:</span>
                        <span className={`font-semibold ${((lotProducts.find(lp => lp.id === formData.lotProductId)?.soLuong || 0) - (formData.soLuongXuat || 0)) < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          {((lotProducts.find(lp => lp.id === formData.lotProductId)?.soLuong || 0) - (formData.soLuongXuat || 0)).toFixed(2)} {lotProducts.find(lp => lp.id === formData.lotProductId)?.donViTinh || ''}
                        </span>
                      </div>
                    </div>
                    {formData.soLuongXuat > 0 && (
                      <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                        </svg>
                        Giảm đi: -{formData.soLuongXuat} {lotProducts.find(lp => lp.id === formData.lotProductId)?.donViTinh || ''}
                      </div>
                    )}
                    {((lotProducts.find(lp => lp.id === formData.lotProductId)?.soLuong || 0) - (formData.soLuongXuat || 0)) < 0 && (
                      <div className="mt-2 text-xs text-red-700 font-semibold flex items-center gap-1 bg-red-100 px-2 py-1 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Cảnh báo: Số lượng xuất vượt quá tồn kho!
                      </div>
                    )}
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

