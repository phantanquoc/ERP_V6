import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import replenishmentRequestService from '../services/replenishmentRequestService';
import { useAuth } from '../contexts/AuthContext';
import { getDepartmentDisplayName } from '../utils/permissions';
import { parseNumberInput } from '../utils/numberInput';
import { SupplyRequest } from '../services/supplyRequestService';
import { internationalProductService, InternationalProduct } from '../services/internationalProductService';
import { ModalForm, ModalFooter, FormField, textareaCls, readonlyCls, inputCls, selectCls } from './ModalForm';
import UnitSelect from './common/UnitSelect';
import ProductCombobox from './common/ProductCombobox';
import { can } from '../utils/permissions';

interface CreateReplenishmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyRequest: SupplyRequest | null;
  onSuccess?: () => void;
}

interface ItemRow {
  id: string; // stable React key
  /**
   * True when the line restates a shortage from the source supply request: its
   * identity (phân loại / tên hàng / ĐVT) is locked and the quantity is capped at
   * what is still owed. False for a line the warehouse adds by hand, which is
   * picked from the product catalogue via ProductCombobox — never typed freely.
   */
  fromSupplyRequest: boolean;
  internationalProductId: string | null;
  phanLoai: string;
  tenGoi: string;
  donViTinh: string;
  /** Ceiling for supply-request lines; null (no ceiling) for hand-added lines. */
  remaining: number | null;
  soLuong: number;
}

const emptyRow = (): ItemRow => ({
  id: Math.random().toString(36).substring(2, 11),
  fromSupplyRequest: false,
  internationalProductId: null,
  phanLoai: '',
  tenGoi: '',
  donViTinh: 'Kg',
  remaining: null,
  soLuong: 0,
});

/**
 * Warehouse-only modal: "Tạo yêu cầu bổ sung" (YCBS).
 *
 * Header fields (người tạo, bộ phận, thời gian tạo, mã yêu cầu) are derived from the
 * signed-in user and the server — read-only, never typed. The goods list starts from
 * the supply request's still-unfulfilled lines (identity locked, only quantity
 * editable, capped at what remains); the warehouse may also add lines by hand, picked
 * from the product catalogue exactly like the supply-request form does.
 *
 * No price or supplier is collected here — purchasing fills those on the YCBS before
 * converting it into a YCMH.
 */
const CreateReplenishmentRequestModal: React.FC<CreateReplenishmentRequestModalProps> = ({
  isOpen,
  onClose,
  supplyRequest,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const canCreate = can('replenishment-requests', 'CREATE', user?.role);

  const [maYeuCau, setMaYeuCau] = useState('');
  const [createdAt, setCreatedAt] = useState(() => new Date());
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [mucDichYeuCau, setMucDichYeuCau] = useState('');
  const [mucDoUuTien, setMucDoUuTien] = useState('Trung bình');
  const [ghiChu, setGhiChu] = useState('');
  const [ackOverQuota, setAckOverQuota] = useState(false);

  const creatorName = `${user?.lastName ?? ''} ${user?.firstName ?? ''}`.trim();
  const departmentName = user?.departmentName || getDepartmentDisplayName(user?.department);

  useEffect(() => {
    if (!isOpen) return;
    setCreatedAt(new Date());
    generateCode();
    fetchProducts();

    if (supplyRequest) {
      // Only lines that still owe something; skip ones already fully supplied or already
      // routed to purchasing, so the YCBS never duplicates an earlier one.
      const pending: ItemRow[] = (supplyRequest.items ?? [])
        .filter((item) => {
          const status = item.fulfillmentStatus;
          if (status === 'Đã cấp đủ' || status === 'Chuyển thu mua') return false;
          return (item.soLuong ?? 0) - (item.fulfilledQty ?? 0) > 1e-9;
        })
        .map((item) => {
          const remaining = Math.max(0, (item.soLuong ?? 0) - (item.fulfilledQty ?? 0));
          return {
            id: item.id ?? Math.random().toString(36).substring(2, 11),
            fromSupplyRequest: true,
            internationalProductId: null,
            phanLoai: item.phanLoai,
            tenGoi: item.tenGoi,
            donViTinh: item.donViTinh,
            remaining,
            soLuong: remaining,
          };
        });
      setItems(pending);
      setMucDichYeuCau(supplyRequest.mucDichYeuCau);
      setMucDoUuTien(supplyRequest.mucDoUuTien);
      setGhiChu('');
    } else {
      setItems([emptyRow()]);
      setMucDichYeuCau('');
      setMucDoUuTien('Trung bình');
      setGhiChu('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, supplyRequest]);

  const generateCode = async () => {
    try {
      const response = await replenishmentRequestService.generateCode();
      setMaYeuCau((response.data as { code: string }).code);
    } catch { /* cosmetic here — the server regenerates the code on create */ }
  };

  const fetchProducts = async () => {
    try {
      const response = await internationalProductService.getAllProducts(1, 10000);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const updateItem = (index: number, updates: Partial<ItemRow>) =>
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));

  // Hand-added lines only — supply-request lines keep their locked identity.
  const handleProductSelect = (index: number, _productId: string | null, product: InternationalProduct | null) => {
    if (!product) {
      updateItem(index, { internationalProductId: null, tenGoi: '', phanLoai: '', donViTinh: 'Kg' });
      return;
    }
    updateItem(index, {
      internationalProductId: product.id,
      tenGoi: product.tenSanPham,
      phanLoai: product.loaiSanPham || '',
      donViTinh: product.donViTinh || 'Kg',
    });
  };

  const handleCreateNew = (index: number, tenSanPham: string) => {
    updateItem(index, {
      internationalProductId: null,
      tenGoi: tenSanPham,
      phanLoai: '',
      donViTinh: 'Kg',
    });
  };

  const addRow = () => setItems((prev) => [...prev, emptyRow()]);

  const removeRow = (index: number) => {
    // Supply-request lines are the reason this modal exists — they cannot be dropped
    // here (cancel them by fulfilling the supply request instead).
    if (items[index]?.fromSupplyRequest) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const exceedsRemaining = (row: ItemRow) =>
    row.remaining != null && row.soLuong > row.remaining + 1e-9;

  const overQuota = items.some(exceedsRemaining);

  const validateForm = (): string | null => {
    if (items.length === 0) return 'Vui lòng thêm ít nhất một hàng hóa cần bổ sung';
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (!row.tenGoi?.trim()) return `Dòng ${i + 1}: Vui lòng chọn hàng hóa`;
      if (!row.soLuong || row.soLuong <= 0) return `Dòng ${i + 1}: Số lượng phải lớn hơn 0`;
      if (exceedsRemaining(row)) {
        if (!ackOverQuota) return `Dòng ${i + 1}: Số lượng vượt phần còn thiếu (${row.remaining} ${row.donViTinh}) — tích "Xác nhận mua ngoài kế hoạch" nếu cố ý đặt vượt`;
        if (!ghiChu.trim()) return `Dòng ${i + 1}: Mua vượt cần ghi rõ lý do ở Ghi chú`;
      }
    }
    const names = items.map((r) => r.tenGoi.trim().toLowerCase());
    const dup = names.find((name, idx) => names.indexOf(name) !== idx);
    if (dup) return `Hàng hóa "${items.find((r) => r.tenGoi.trim().toLowerCase() === dup)?.tenGoi}" bị trùng lặp`;
    if (!mucDichYeuCau.trim()) return 'Vui lòng nhập mục đích yêu cầu';
    return null;
  };

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canCreate) { toast.error('Bạn không có quyền tạo yêu cầu bổ sung'); return; }
    if (!user?.employeeId) { toast.error('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.'); return; }

    const validationError = validateForm();
    if (validationError) { toast.error(validationError); return; }

    setLoading(true);
    try {
      await replenishmentRequestService.createFromSupplyRequest({
        employeeId: user.employeeId,
        maNhanVien: user.employeeCode || '',
        tenNhanVien: creatorName || user.employeeCode || '',
        items: items.map((row) => ({
          phanLoai: row.phanLoai || products.find((p) => p.id === row.internationalProductId)?.loaiSanPham || 'Khác',
          tenGoi: row.tenGoi,
          soLuong: row.soLuong,
          donViTinh: row.donViTinh,
        })),
        mucDichYeuCau: mucDichYeuCau || `Bổ sung tồn kho từ yêu cầu ${supplyRequest?.maYeuCau ?? ''}`.trim(),
        mucDoUuTien,
        ghiChu: ghiChu || undefined,
        supplyRequestId: supplyRequest?.id ?? '',
        ackOverQuota: overQuota && ackOverQuota,
      });
      toast.success('Đã tạo yêu cầu bổ sung');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Lỗi khi tạo yêu cầu bổ sung');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo yêu cầu bổ sung"
      maxWidth="4xl"
      footer={
        <ModalFooter
          onClose={onClose}
          onSubmit={handleSubmit as any}
          submitLabel="Tạo yêu cầu"
          isLoading={loading}
          submitDisabled={!canCreate || (overQuota && !ackOverQuota) || items.length === 0}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header — everything here is derived, never typed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Người tạo">
            <input type="text" readOnly value={creatorName} className={readonlyCls} />
          </FormField>
          <FormField label="Mã nhân viên">
            <input type="text" readOnly value={user?.employeeCode ?? ''} className={readonlyCls} />
          </FormField>
          <FormField label="Bộ phận">
            <input type="text" readOnly value={departmentName} className={readonlyCls} />
          </FormField>
          <FormField label="Thời gian tạo">
            <input
              type="text"
              readOnly
              value={createdAt.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
              className={readonlyCls}
            />
          </FormField>
          <FormField label="Mã yêu cầu">
            <input type="text" readOnly value={maYeuCau} className={readonlyCls} />
          </FormField>
          <FormField label="Nguồn yêu cầu cung cấp">
            <input type="text" readOnly value={supplyRequest?.maYeuCau ?? '—'} className={readonlyCls} />
          </FormField>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Không nhập giá hay nhà cung cấp tại đây — thu mua sẽ báo giá trên yêu cầu mua hàng (YCMH) sau khi YCBS được chuyển qua.
        </div>

        {/* Hàng hóa cần bổ sung */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Hàng hóa cần bổ sung <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Thêm hàng hóa
            </button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Yêu cầu này không còn hàng hóa nào thiếu — bấm “Thêm hàng hóa” nếu cần bổ sung ngoài danh sách.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((row, index) => {
                const exceeds = exceedsRemaining(row);
                return (
                  <div
                    key={row.id}
                    className={`p-4 border rounded-lg transition-all ${
                      exceeds ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm shrink-0 mt-1">
                        {index + 1}
                      </div>

                      <div className="flex-1 space-y-3">
                        {row.fromSupplyRequest ? (
                          /* Identity comes from the supply-request line — locked, quantity only */
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FormField label="Phân loại">
                              <div className="relative">
                                <input type="text" readOnly value={row.phanLoai} className={`${readonlyCls} pr-8`} title="Khóa theo yêu cầu cung cấp nguồn" />
                                <Lock className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </FormField>
                            <FormField label="Tên hàng hóa">
                              <div className="relative">
                                <input type="text" readOnly value={row.tenGoi} className={`${readonlyCls} pr-8`} title="Khóa theo yêu cầu cung cấp nguồn" />
                                <Lock className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </FormField>
                            <FormField label="Đơn vị">
                              <div className="relative">
                                <input type="text" readOnly value={row.donViTinh} className={`${readonlyCls} pr-8`} title="Khóa theo yêu cầu cung cấp nguồn" />
                                <Lock className="h-3.5 w-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </FormField>
                          </div>
                        ) : (
                          /* Hand-added line — picked from the catalogue, like the supply-request form */
                          <div>
                            <FormField label="Hàng hóa" required>
                              <ProductCombobox
                                products={products}
                                value={row.internationalProductId}
                                onChange={(productId, product) => handleProductSelect(index, productId, product)}
                                onCreateNew={(name) => handleCreateNew(index, name)}
                                allowCreate
                                placeholder="Tìm theo mã, tên hoặc loại hàng hóa, hoặc nhập tên mới..."
                              />
                            </FormField>
                            {!row.internationalProductId && row.tenGoi && (
                              <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                Chưa có trong danh mục hàng hóa — thu mua sẽ xem xét khi báo giá
                              </p>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField label="Số lượng" required hint={row.fromSupplyRequest ? `Còn thiếu: ${row.remaining} ${row.donViTinh}` : undefined}>
                            <input
                              type="number"
                              value={row.soLuong || ''}
                              onChange={(e) => updateItem(index, { soLuong: parseNumberInput(e.target.value) })}
                              required
                              min="0.01"
                              step="0.01"
                              max={undefined}
                              className={`${inputCls()} ${exceeds ? '!border-amber-400 !bg-amber-50 focus:!ring-amber-500 focus:!border-amber-500' : ''}`}
                              placeholder="0.00"
                              aria-describedby={exceeds ? `overquota-${row.id}` : undefined}
                            />
                          </FormField>
                          {row.fromSupplyRequest ? null : (
                            <FormField label="Đơn vị" required>
                              <UnitSelect
                                value={row.donViTinh}
                                onChange={(val) => updateItem(index, { donViTinh: val })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </FormField>
                          )}
                        </div>

                        {exceeds && (
                          <p id={`overquota-${row.id}`} className="text-xs text-amber-700 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                            {ackOverQuota
                              ? <>Đã xác nhận mua ngoài kế hoạch — đặt {row.soLuong} {row.donViTinh} thay vì {row.remaining} {row.donViTinh} còn thiếu.</>
                              : <>Số lượng vượt phần còn thiếu ({row.remaining} {row.donViTinh}) — tích "Xác nhận mua ngoài kế hoạch" bên dưới nếu cố ý đặt vượt, cần ghi rõ lý do ở Ghi chú.</>}
                          </p>
                        )}
                      </div>

                      {/* Only hand-added lines can be removed */}
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        disabled={row.fromSupplyRequest}
                        title={row.fromSupplyRequest ? 'Dòng này thuộc yêu cầu cung cấp nguồn' : 'Xóa dòng'}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {overQuota && (
          <label className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 cursor-pointer">
            <input type="checkbox" checked={ackOverQuota} onChange={(e) => setAckOverQuota(e.target.checked)} className="rounded" />
            Xác nhận mua ngoài kế hoạch — số lượng vượt phần còn thiếu của yêu cầu cung cấp nguồn
          </label>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Mục đích yêu cầu" required>
            <input
              type="text"
              value={mucDichYeuCau}
              onChange={(e) => setMucDichYeuCau(e.target.value)}
              required
              className={inputCls()}
              placeholder="Bổ sung tồn kho cho…"
            />
          </FormField>
          <FormField label="Mức độ ưu tiên">
            <select value={mucDoUuTien} onChange={(e) => setMucDoUuTien(e.target.value)} className={selectCls()}>
              <option value="Thấp">Thấp</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Cao">Cao</option>
            </select>
          </FormField>
        </div>

        <FormField label="Ghi chú">
          <textarea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} rows={2} className={textareaCls()} />
        </FormField>
      </form>
    </ModalForm>
  );
};

export default CreateReplenishmentRequestModal;
