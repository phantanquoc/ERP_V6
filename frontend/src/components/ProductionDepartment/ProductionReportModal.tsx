import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import productionReportService, { ProductionReport } from '../../services/productionReportService';
import materialStandardService, { MaterialStandard } from '../../services/materialStandardService';
import Modal from '../Modal';
import DatePicker from '../DatePicker';

interface ProductionReportModalProps {
  isOpen: boolean;
  report: ProductionReport | null;
  viewMode?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ProductionReportModal: React.FC<ProductionReportModalProps> = ({
  isOpen,
  report,
  viewMode = false,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [materialStandards, setMaterialStandards] = useState<MaterialStandard[]>([]);
  const [selectedMaterialStandard, setSelectedMaterialStandard] = useState<MaterialStandard | null>(null);
  const [chenhLechValue, setChenhLechValue] = useState<number>(0);
  const [formData, setFormData] = useState({
    ngayThang: '',
    tongSoTuaSanXuat: 0,
    soMeTua: 0,
    tongSoMeKeHoach: 0,
    soMeThucTe: 0,
    maDinhMuc: '',
    tongKhoiLuongNguyenLieu: 0,
    tongKhoiLuongThanhPhamDinhMuc: 0,
    khoiLuongThanhPhamThucTe: 0,
    danhGiaChenhLech: '',
    nguyenNhanChenhLech: '',
    deXuatDieuChinh: '',
    nguoiThucHien: '',
  });

  // Load material standards when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMaterialStandards();
    }
  }, [isOpen]);

  // Load form data when report changes
  useEffect(() => {
    if (isOpen && report) {
      setFormData({
        ngayThang: report.ngayThang,
        tongSoTuaSanXuat: report.tongSoTuaSanXuat,
        soMeTua: report.soMeTua,
        tongSoMeKeHoach: report.tongSoMeKeHoach,
        soMeThucTe: report.soMeThucTe,
        maDinhMuc: report.maDinhMuc,
        tongKhoiLuongNguyenLieu: report.tongKhoiLuongNguyenLieu,
        tongKhoiLuongThanhPhamDinhMuc: report.tongKhoiLuongThanhPhamDinhMuc,
        khoiLuongThanhPhamThucTe: report.khoiLuongThanhPhamThucTe,
        danhGiaChenhLech: report.danhGiaChenhLech,
        nguyenNhanChenhLech: report.nguyenNhanChenhLech,
        deXuatDieuChinh: report.deXuatDieuChinh,
        nguoiThucHien: report.nguoiThucHien,
      });
      // Tính chênh lệch từ dữ liệu cũ
      const chenhLech = report.khoiLuongThanhPhamThucTe - report.tongKhoiLuongThanhPhamDinhMuc;
      setChenhLechValue(chenhLech);
    } else if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        ngayThang: today,
        tongSoTuaSanXuat: 0,
        soMeTua: 0,
        tongSoMeKeHoach: 0,
        soMeThucTe: 0,
        maDinhMuc: '',
        tongKhoiLuongNguyenLieu: 0,
        tongKhoiLuongThanhPhamDinhMuc: 0,
        khoiLuongThanhPhamThucTe: 0,
        danhGiaChenhLech: '',
        nguyenNhanChenhLech: '',
        deXuatDieuChinh: '',
        nguoiThucHien: '',
      });
      setSelectedMaterialStandard(null);
      setChenhLechValue(0);
    }
    setError('');
  }, [isOpen, report]);

  // Set selectedMaterialStandard khi materialStandards loaded và có report
  useEffect(() => {
    if (report && materialStandards.length > 0) {
      const found = materialStandards.find(ms => ms.maDinhMuc === report.maDinhMuc);
      if (found) {
        setSelectedMaterialStandard(found);
      }
    }
  }, [report, materialStandards]);

  const loadMaterialStandards = async () => {
    try {
      const response = await materialStandardService.getAllMaterialStandards(1, 100);
      setMaterialStandards(response.data);
    } catch (error) {
      console.error('Error loading material standards:', error);
    }
  };

  // Hàm tính toán tự động
  const calculateAutoValues = (soMeThucTe: number, khoiLuongThanhPhamThucTe: number, tiLeThuHoi: number) => {
    const tongKL_NL = soMeThucTe * 50;
    const tongKL_TP_DM = tongKL_NL * (tiLeThuHoi / 100);
    const chenhLech = khoiLuongThanhPhamThucTe - tongKL_TP_DM;

    setChenhLechValue(chenhLech);
    return {
      tongKhoiLuongNguyenLieu: tongKL_NL,
      tongKhoiLuongThanhPhamDinhMuc: tongKL_TP_DM,
      danhGiaChenhLech: chenhLech.toFixed(2),
    };
  };

  const handleMaterialStandardChange = (materialStandardId: string) => {
    const selected = materialStandards.find(ms => ms.id === materialStandardId);
    if (selected) {
      setSelectedMaterialStandard(selected);

      // Tính toán lại khi thay đổi định mức
      const tiLeThuHoi = selected.tiLeThuHoi || 0;
      const autoValues = calculateAutoValues(formData.soMeThucTe, formData.khoiLuongThanhPhamThucTe, tiLeThuHoi);

      setFormData(prev => ({
        ...prev,
        maDinhMuc: selected.maDinhMuc,
        ...autoValues,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (report) {
        await productionReportService.update(report.id, formData);
      } else {
        await productionReportService.create(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">
            {viewMode ? 'Xem chi tiết báo cáo sản lượng' : report ? 'Chỉnh sửa báo cáo sản lượng' : 'Tạo báo cáo sản lượng'}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <DatePicker
              label="Ngày tháng"
              value={formData.ngayThang}
              onChange={(date) => setFormData({ ...formData, ngayThang: date })}
              required
              placeholder="Chọn ngày tháng"
              allowClear
              disabled={viewMode}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chọn Định mức NVL
            </label>
            <select
              value={materialStandards.find(ms => ms.maDinhMuc === formData.maDinhMuc)?.id || ''}
              onChange={(e) => handleMaterialStandardChange(e.target.value)}
              disabled={viewMode}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">-- Chọn định mức --</option>
              {materialStandards.map((standard) => (
                <option key={standard.id} value={standard.id}>
                  {standard.maDinhMuc} - {standard.tenDinhMuc}
                  {standard.tiLeThuHoi ? ` (Tỉ lệ thu hồi: ${standard.tiLeThuHoi}%)` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tổng số tua SX/ngày
            </label>
            <input
              type="number"
              value={formData.tongSoTuaSanXuat}
              onChange={(e) => {
                const tongSoTua = Number(e.target.value);
                const tongSoMeKeHoach = tongSoTua * formData.soMeTua;
                setFormData({
                  ...formData,
                  tongSoTuaSanXuat: tongSoTua,
                  tongSoMeKeHoach: tongSoMeKeHoach
                });
              }}
              disabled={viewMode}
              min="0"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số mẻ/tua
            </label>
            <input
              type="number"
              value={formData.soMeTua}
              onChange={(e) => {
                const soMeTua = Number(e.target.value);
                const tongSoMeKeHoach = formData.tongSoTuaSanXuat * soMeTua;
                setFormData({
                  ...formData,
                  soMeTua: soMeTua,
                  tongSoMeKeHoach: tongSoMeKeHoach
                });
              }}
              disabled={viewMode}
              min="0"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tổng số mẻ kế hoạch
            </label>
            <input
              type="number"
              value={formData.tongSoMeKeHoach}
              onChange={(e) => setFormData({ ...formData, tongSoMeKeHoach: Number(e.target.value) })}
              disabled={viewMode}
              min="0"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số mẻ thực tế
            </label>
            <input
              type="number"
              value={formData.soMeThucTe}
              onChange={(e) => {
                const soMeThucTe = Number(e.target.value);
                const tiLeThuHoi = selectedMaterialStandard?.tiLeThuHoi || 0;
                const autoValues = calculateAutoValues(soMeThucTe, formData.khoiLuongThanhPhamThucTe, tiLeThuHoi);
                setFormData({
                  ...formData,
                  soMeThucTe,
                  ...autoValues
                });
              }}
              disabled={viewMode}
              min="0"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tổng KL nguyên liệu (kg)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.tongKhoiLuongNguyenLieu}
              disabled={true}
              min="0"
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tổng KL thành phẩm định mức (kg)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.tongKhoiLuongThanhPhamDinhMuc}
              disabled={true}
              min="0"
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              KL thành phẩm thực tế (kg)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.khoiLuongThanhPhamThucTe}
              onChange={(e) => {
                const khoiLuongThanhPhamThucTe = Number(e.target.value);
                const tiLeThuHoi = selectedMaterialStandard?.tiLeThuHoi || 0;
                const autoValues = calculateAutoValues(formData.soMeThucTe, khoiLuongThanhPhamThucTe, tiLeThuHoi);
                setFormData({
                  ...formData,
                  khoiLuongThanhPhamThucTe,
                  ...autoValues
                });
              }}
              disabled={viewMode}
              min="0"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đánh giá chênh lệch
            </label>
            <input
              type="text"
              value={formData.danhGiaChenhLech}
              disabled={true}
              placeholder="Tự động tính"
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold ${
                chenhLechValue > 0
                  ? 'bg-green-50 text-green-600'
                  : chenhLechValue < 0
                    ? 'bg-red-50 text-red-600'
                    : 'bg-gray-100 text-gray-600'
              }`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nguyên nhân chênh lệch
          </label>
          <textarea
            value={formData.nguyenNhanChenhLech}
            onChange={(e) => setFormData({ ...formData, nguyenNhanChenhLech: e.target.value })}
            disabled={viewMode}
            rows={3}
            placeholder="Nhập nguyên nhân chênh lệch"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Đề xuất điều chỉnh, cải tiến
          </label>
          <textarea
            value={formData.deXuatDieuChinh}
            onChange={(e) => setFormData({ ...formData, deXuatDieuChinh: e.target.value })}
            disabled={viewMode}
            rows={3}
            placeholder="Nhập đề xuất điều chỉnh, cải tiến"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Người thực hiện
          </label>
          <input
            type="text"
            value={formData.nguoiThucHien}
            onChange={(e) => setFormData({ ...formData, nguoiThucHien: e.target.value })}
            disabled={viewMode}
            placeholder="Tự động điền từ tài khoản đăng nhập"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>

        {!viewMode && (
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : report ? 'Cập nhật' : 'Tạo'}
            </button>
          </div>
        )}
      </form>
      </div>
    </Modal>
  );
};

export default ProductionReportModal;

