import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supplierService } from '../services/supplierService';
import { useAuth } from '../contexts/AuthContext';
import { can } from '../utils/permissions';
import { supplierKeys } from '../hooks/useSuppliers';
import { ModalForm, ModalFooter, FormField, inputCls } from './ModalForm';

interface QuickCreateSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called with the created supplier. The caller sets it as the selected NCC
   * (e.g. fills the row's nhaCungCapId) without a manual refresh.
   */
  onCreated?: (supplier: { id: string; tenNhaCungCap: string; maNhaCungCap: string }) => void;
  /** Prefill for phanLoaiNCC + loaiCungCap (e.g. the row's phanLoai being quoted). */
  defaultPhanLoaiNCC?: string;
  defaultLoaiCungCap?: string;
}

/**
 * Minimal inline supplier creation for quoting flows (YCBS detail, YCMH edit).
 * Only the fields purchasing needs to pick a supplier for a quote: name, supply
 * type, contact, phone, address. The full profile stays editable in the supplier
 * tab. Closes over the purchasing pages so quoting never leaves the modal.
 */
const QuickCreateSupplierModal: React.FC<QuickCreateSupplierModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  defaultPhanLoaiNCC,
  defaultLoaiCungCap,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canCreate = can('suppliers', 'CREATE', user?.role);

  const [tenNhaCungCap, setTenNhaCungCap] = useState('');
  const [loaiCungCap, setLoaiCungCap] = useState(defaultLoaiCungCap ?? '');
  const [nguoiLienHe, setNguoiLienHe] = useState('');
  const [soDienThoai, setSoDienThoai] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset each time the modal opens. useEffect stays above the early return —
  // hooks must run in the same order on every render.
  React.useEffect(() => {
    if (!isOpen) return;
    setTenNhaCungCap('');
    setLoaiCungCap(defaultLoaiCungCap ?? '');
    setNguoiLienHe('');
    setSoDienThoai('');
    setDiaChi('');
  }, [isOpen, defaultLoaiCungCap]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canCreate) { toast.error('Bạn không có quyền tạo nhà cung cấp'); return; }
    if (!user?.employeeId) { toast.error('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.'); return; }
    if (!tenNhaCungCap.trim()) { toast.error('Vui lòng nhập tên nhà cung cấp'); return; }
    if (!loaiCungCap.trim()) { toast.error('Vui lòng nhập loại cung cấp'); return; }
    if (!nguoiLienHe.trim()) { toast.error('Vui lòng nhập người liên hệ'); return; }
    if (!soDienThoai.trim()) { toast.error('Vui lòng nhập số điện thoại'); return; }
    if (!diaChi.trim()) { toast.error('Vui lòng nhập địa chỉ'); return; }

    setSaving(true);
    try {
      const res: any = await supplierService.createSupplier({
        tenNhaCungCap: tenNhaCungCap.trim(),
        loaiCungCap: loaiCungCap.trim(),
        nguoiLienHe: nguoiLienHe.trim(),
        soDienThoai: soDienThoai.trim(),
        diaChi: diaChi.trim(),
        quocGia: 'Việt Nam',
        loaiHinh: 'Thương mại',
        trangThai: 'Đang cung cấp',
        phanLoaiNCC: defaultPhanLoaiNCC ?? 'NVL',
        employeeId: user.employeeId,
      });
      const created = (res?.data?.data ?? res?.data) as { id: string; tenNhaCungCap: string; maNhaCungCap: string } | undefined;
      // The supplier dropdown reads useSupplierOptions (staleTime 5m) — invalidate
      // so the new NCC appears without waiting for the cache to expire.
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success(`Đã tạo nhà cung cấp ${created?.maNhaCungCap ?? ''}`.trim());
      if (created?.id) onCreated?.(created);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Tạo nhà cung cấp thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm nhà cung cấp mới"
      maxWidth="lg"
      footer={
        <ModalFooter
          onClose={onClose}
          onSubmit={handleSubmit as any}
          submitLabel="Tạo nhà cung cấp"
          isLoading={saving}
          submitDisabled={!canCreate}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Tên nhà cung cấp" required>
          <input
            type="text"
            value={tenNhaCungCap}
            onChange={(e) => setTenNhaCungCap(e.target.value)}
            required
            autoFocus
            className={inputCls()}
            placeholder="VD: Công ty TNHH …"
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Loại cung cấp" required>
            <input
              type="text"
              value={loaiCungCap}
              onChange={(e) => setLoaiCungCap(e.target.value)}
              required
              className={inputCls()}
              placeholder="VD: Thủy sản, Rau củ, Gia vị…"
            />
          </FormField>
          <FormField label="Số điện thoại" required>
            <input
              type="tel"
              inputMode="tel"
              value={soDienThoai}
              onChange={(e) => setSoDienThoai(e.target.value)}
              required
              className={inputCls()}
              placeholder="0901234567"
            />
          </FormField>
        </div>
        <FormField label="Người liên hệ" required>
          <input
            type="text"
            value={nguoiLienHe}
            onChange={(e) => setNguoiLienHe(e.target.value)}
            required
            className={inputCls()}
          />
        </FormField>
        <FormField label="Địa chỉ" required>
          <input
            type="text"
            value={diaChi}
            onChange={(e) => setDiaChi(e.target.value)}
            required
            className={inputCls()}
          />
        </FormField>
        <p className="text-xs text-gray-400">
          Chỉ các trường cần để báo giá — hồ sơ đầy đủ bổ sung sau ở tab Nhà cung cấp.
        </p>
        {!canCreate && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Bạn không có quyền tạo nhà cung cấp.
          </p>
        )}
      </form>
    </ModalForm>
  );
};

export default QuickCreateSupplierModal;
