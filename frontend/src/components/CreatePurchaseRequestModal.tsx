import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import FileUpload from './FileUpload';
import purchaseRequestService from '../services/purchaseRequestService';
import supplierService, { Supplier } from '../services/supplierService';
import { useAuth } from '../contexts/AuthContext';
import { SupplyRequest } from '../services/supplyRequestService';
import { parseNumberInput } from '../utils/numberInput';

interface CreatePurchaseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyRequest?: SupplyRequest | null;
  onSuccess?: () => void;
}

interface ItemRow {
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  nhaCungCapId: string;
  giaDuKien: number | '';
}

const emptyRow = (): ItemRow => ({
  phanLoai: '',
  tenHangHoa: '',
  soLuong: 0,
  donViTinh: 'Kg',
  nhaCungCapId: '',
  giaDuKien: '',
});

const CreatePurchaseRequestModal: React.FC<CreatePurchaseRequestModalProps> = ({
  isOpen,
  onClose,
  supplyRequest,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [maYeuCau, setMaYeuCau] = useState('');
  const [ngayYeuCau] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [mucDichYeuCau, setMucDichYeuCau] = useState('');
  const [mucDoUuTien, setMucDoUuTien] = useState('Trung binh');
  const [ghiChu, setGhiChu] = useState('');
  const [ghiChuMuaHang, setGhiChuMuaHang] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen) {
      generateCode();
      fetchSuppliers();

      // Pre-fill items from supply request if available
      if (supplyRequest) {
        if (supplyRequest.items && supplyRequest.items.length > 0) {
          setItems(supplyRequest.items.map(item => ({
            phanLoai: item.phanLoai,
            tenHangHoa: item.tenGoi,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
            nhaCungCapId: '',
            giaDuKien: '',
          })));
        } else {
          setItems([emptyRow()]);
        }
        setMucDichYeuCau(supplyRequest.mucDichYeuCau);
        setMucDoUuTien(supplyRequest.mucDoUuTien);
        setGhiChu(`Yeu cau mua hang tu yeu cau cung cap ${supplyRequest.maYeuCau}`);
      }
    }
  }, [isOpen, supplyRequest]);

  const generateCode = async () => {
    try {
      const response = await purchaseRequestService.generateCode();
      setMaYeuCau(response.data.code);
    } catch (error) {
      console.error('Error generating code:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await supplierService.getAllSuppliers(1, 1000);
      const allSuppliers: Supplier[] = response.data?.data || response.data || [];
      setSuppliers(allSuppliers.filter(s => s.trangThai === 'Đang cung cấp'));
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const updateItem = (index: number, updates: Partial<ItemRow>) => {
    setItems(prev => prev.map((row, i) => i === index ? { ...row, ...updates } : row));
  };

  const addRow = () => {
    setItems(prev => [...prev, emptyRow()]);
  };

  const removeRow = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const tongCong = items.reduce((sum, row) => {
    const gia = typeof row.giaDuKien === 'number' ? row.giaDuKien : 0;
    return sum + gia * row.soLuong;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate items
    for (let i = 0; i < items.length; i++) {
      if (!items[i].tenHangHoa || !items[i].tenHangHoa.trim()) {
        alert(`Dong ${i + 1}: Vui long nhap ten hang hoa`);
        return;
      }
      if (!items[i].soLuong || items[i].soLuong <= 0) {
        alert(`Dong ${i + 1}: So luong phai lon hon 0`);
        return;
      }
    }

    if (!user?.employeeId) {
      alert('Khong tim thay thong tin nhan vien. Vui long dang nhap lai.');
      return;
    }

    setLoading(true);
    try {
      const file = selectedFiles.length > 0 ? selectedFiles[0] : undefined;
      await purchaseRequestService.createPurchaseRequest({
        employeeId: user.employeeId,
        maNhanVien: user.employeeCode || '',
        tenNhanVien: `${user.firstName} ${user.lastName}`,
        items: items.map(row => ({
          phanLoai: row.phanLoai,
          tenHangHoa: row.tenHangHoa,
          soLuong: row.soLuong,
          donViTinh: row.donViTinh,
          nhaCungCapId: row.nhaCungCapId || undefined,
          giaDuKien: row.giaDuKien !== '' ? Number(row.giaDuKien) : undefined,
        })),
        mucDichYeuCau,
        mucDoUuTien,
        ghiChu,
        supplyRequestId: supplyRequest?.id,
        ghiChuMuaHang: ghiChuMuaHang || undefined,
      }, file);

      alert('Tao yeu cau mua hang thanh cong!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Loi khi tao yeu cau mua hang');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[950px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Tạo yêu cầu mua hàng</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Ngày yêu cầu & Mã yêu cầu */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày yêu cầu</label>
              <input type="date" value={ngayYeuCau} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã yêu cầu</label>
              <input type="text" value={maYeuCau} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
          </div>

          {/* Row 2: Tên nhân viên */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhân viên yêu cầu</label>
            <input type="text" value={`${user?.firstName} ${user?.lastName}`} disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
          </div>

          {/* Items table with per-item supplier + price */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Danh sách hàng hóa <span className="text-red-500">*</span>
              </label>
              <button type="button" onClick={addRow}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Thêm dòng
              </button>
            </div>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8">#</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phân loại</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên hàng hóa</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">SL</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">ĐVT</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nhà cung cấp</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Giá dự kiến</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Thành tiền</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((row, index) => {
                    const thanhTien = (typeof row.giaDuKien === 'number' ? row.giaDuKien : 0) * row.soLuong;
                    return (
                      <tr key={index}>
                        <td className="px-2 py-2 text-gray-500 text-center">{index + 1}</td>
                        <td className="px-2 py-2">
                          <select value={row.phanLoai}
                            onChange={(e) => updateItem(index, { phanLoai: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">-- Chọn --</option>
                            <option value="Nguyên liệu">Nguyên liệu</option>
                            <option value="Vật tư">Vật tư</option>
                            <option value="Thiết bị">Thiết bị</option>
                            <option value="Dịch vụ">Dịch vụ</option>
                            <option value="Khác">Khác</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={row.tenHangHoa}
                            onChange={(e) => updateItem(index, { tenHangHoa: e.target.value })}
                            required
                            placeholder="Tên hàng hóa"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={row.soLuong}
                            onChange={(e) => updateItem(index, { soLuong: parseNumberInput(e.target.value) })}
                            required min="0.01" step="0.01"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="px-2 py-2">
                          <select value={row.donViTinh}
                            onChange={(e) => updateItem(index, { donViTinh: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="Kg">Kg</option>
                            <option value="Cái">Cái</option>
                            <option value="Hệ">Hệ</option>
                            <option value="Lít">Lít</option>
                            <option value="Thùng">Thùng</option>
                            <option value="Bộ">Bộ</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <select value={row.nhaCungCapId}
                            onChange={(e) => updateItem(index, { nhaCungCapId: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">-- Chọn --</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.tenNhaCungCap}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={row.giaDuKien}
                            onChange={(e) => updateItem(index, { giaDuKien: e.target.value === '' ? '' : parseNumberInput(e.target.value) })}
                            min="0" step="1000"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="VNĐ" />
                        </td>
                        <td className="px-2 py-2 text-right text-sm font-medium text-gray-700">
                          {thanhTien > 0 ? thanhTien.toLocaleString('vi-VN') : '-'}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => removeRow(index)} disabled={items.length === 1}
                            className="text-red-500 hover:text-red-700 disabled:text-gray-300">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Tổng cộng */}
                  <tr className="bg-blue-50 font-semibold">
                    <td colSpan={7} className="px-2 py-2 text-right text-sm text-gray-700">Tổng cộng:</td>
                    <td className="px-2 py-2 text-right text-sm text-blue-700">
                      {tongCong > 0 ? `${tongCong.toLocaleString('vi-VN')} VNĐ` : '-'}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Mục đích yêu cầu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích yêu cầu <span className="text-red-500">*</span></label>
            <input type="text" value={mucDichYeuCau}
              onChange={(e) => setMucDichYeuCau(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Mục đích yêu cầu mua hàng" />
          </div>

          {/* Mức độ ưu tiên */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ ưu tiên</label>
            <select value={mucDoUuTien} onChange={(e) => setMucDoUuTien(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="Cao">Cao</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Thấp">Thấp</option>
            </select>
          </div>

          {/* Ghi chú mua hàng */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú mua hàng</label>
            <textarea value={ghiChuMuaHang} onChange={(e) => setGhiChuMuaHang(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ghi chú cho bộ phận mua hàng (nếu có)" />
          </div>

          {/* Ghi chú chung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập ghi chú (nếu có)" />
          </div>

          {/* Row: File đính kèm */}
          <FileUpload
            label="File đính kèm"
            files={selectedFiles}
            onChange={setSelectedFiles}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          />

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Đang xử lý...' : 'Tạo yêu cầu mua hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePurchaseRequestModal;
