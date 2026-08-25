import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import warehouseIssueService from '../services/warehouseIssueService';
import warehouseService, { Warehouse, Lot, LotProduct } from '../services/warehouseService';
import { warehouseKeys } from '../hooks/useWarehouses';
import { useAuth } from '../contexts/AuthContext';
import supplyRequestService, { SupplyRequest, BatchFulfillLine, BatchFulfillResult } from '../services/supplyRequestService';
import { parseNumberInput } from '../utils/numberInput';
import Modal from './Modal';
import LotProductCombobox from './common/LotProductCombobox';
import EmployeeCombobox from './common/EmployeeCombobox';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import { TINH_TRANG_OPTIONS, LY_DO_XUAT_KHO_PRESETS } from '../constants/warehouseCatalogs';
import { can } from '../utils/permissions';

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
  tinhTrang: string;
  tinhTrangCustom: string;
  quyCach: string;
  // Cached display data
  lots: Lot[];
  lotProducts: LotProduct[];
  // Source item info
  tenGoi: string;
  donViTinh: string;
  // Fulfillment accounting — links this line back to the supply request item so
  // fulfilledQty/fulfillmentStatus are updated via batch-fulfill (see P0-1).
  supplyRequestItemId?: string;
  // Original request vs already-issued so the default is remaining, not full.
  yeuCau?: number;
  daCap?: number;
}

const CreateWarehouseIssueModal: React.FC<CreateWarehouseIssueModalProps> = ({
  isOpen,
  onClose,
  supplyRequest,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { data: employeesData } = useEmployeesForAssignment();
  const employees = employeesData ?? [];
  const queryClient = useQueryClient();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [maPhieuXuatBase, setMaPhieuXuatBase] = useState('');
  const [rows, setRows] = useState<IssueRow[]>([]);
  const [nguoiDeNghi, setNguoiDeNghi] = useState('');
  const [maNguoiDeNghi, setMaNguoiDeNghi] = useState('');
  const [boPhan, setBoPhan] = useState('');
  const [lyDoXuatKho, setLyDoXuatKho] = useState('');
  // Mặc định bật: phần thiếu (không đủ tồn kho để xuất) tự sinh "Yêu cầu bổ sung" sang Thu mua
  const [routeShortage, setRouteShortage] = useState(true);

  const handleNguoiDeNghiChange = (name: string) => {
    setNguoiDeNghi(name);
    const emp = employees.find((e) => e.name === name);
    if (emp) { setMaNguoiDeNghi(emp.id); setBoPhan(emp.department ?? ''); }
    else if (!name) { setMaNguoiDeNghi(''); setBoPhan(''); }
  };

  // Chế độ "xuất tổng → trừ FIFO": chọn lô + sản phẩm + tổng số lượng, backend
  // tự trừ dần từng kiện (theo thứ tự mã) và tạo 1 phiếu xuất nhiều dòng.
  const [fifoMode, setFifoMode] = useState(false);
  const [fifoLotId, setFifoLotId] = useState('');
  const [fifoProductId, setFifoProductId] = useState('');
  const [fifoTongSoLuong, setFifoTongSoLuong] = useState('');
  const fifoLot = warehouses.flatMap((w) => w.lots ?? []).find((l) => l.id === fifoLotId) ?? null;
  const fifoProducts = fifoLot ? (fifoLot.lotProducts ?? []).filter((lp) => lp.internationalProduct && lp.soLuong > 0) : [];

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
      generateCode();

      setNguoiDeNghi(supplyRequest?.tenNhanVien ?? '');
      setBoPhan(supplyRequest?.boPhan ?? '');
      setMaNguoiDeNghi('');
      setLyDoXuatKho('');

      // Init rows from supply request items — only pending items, default =
      // remaining (soLuong − fulfilledQty), not the full request. Already
      // finished items are hidden; an all-finished YC disables creation.
      if (supplyRequest?.items && supplyRequest.items.length > 0) {
        const pendingItems = supplyRequest.items.filter((item: any) => {
          const status = item.fulfillmentStatus;
          if (status === 'Đã cấp đủ' || status === 'Chuyển thu mua') return false;
          const remaining = (item.soLuong ?? 0) - (item.fulfilledQty ?? 0);
          return remaining > 1e-9;
        });
        if (pendingItems.length > 0) {
          setRows(pendingItems.map((item: any): IssueRow => {
            const soLuong: number = item.soLuong ?? 0;
            const daCap: number = item.fulfilledQty ?? 0;
            const remaining = Math.max(0, soLuong - daCap);
            return {
              warehouseId: '',
              lotId: '',
              lotProductId: '',
              soLuongXuat: remaining,
              ghiChu: `Xuất kho cho ${supplyRequest.maYeuCau} - ${item.tenGoi}`,
              tinhTrang: 'Bình thường', tinhTrangCustom: '', quyCach: '',
              lots: [],
              lotProducts: [],
              tenGoi: item.tenGoi,
              donViTinh: item.donViTinh,
              supplyRequestItemId: item.id,
              yeuCau: soLuong,
              daCap,
            };
          }));
        } else {
          // Everything is already fulfilled — keep an empty placeholder so the
          // modal renders "all done" without crashing, creation is blocked in handleSubmit.
          setRows([{
            warehouseId: '', lotId: '', lotProductId: '',
            soLuongXuat: 0, ghiChu: '', tinhTrang: 'Bình thường', tinhTrangCustom: '', quyCach: '', lots: [], lotProducts: [],
            tenGoi: '', donViTinh: '',
          }]);
        }
      } else {
        setRows([{
          warehouseId: '', lotId: '', lotProductId: '',
          soLuongXuat: 0, ghiChu: '', tinhTrang: 'Bình thường', tinhTrangCustom: '', quyCach: '', lots: [], lotProducts: [],
          tenGoi: '', donViTinh: '',
        }]);
      }
    }
  }, [isOpen, supplyRequest]);

  const generateCode = async () => {
    try {
      const response = await warehouseIssueService.generateIssueCode();
      setMaPhieuXuatBase((response.data as { maPhieuXuat: string }).maPhieuXuat);
    } catch (error) {
      console.error('Error generating issue code:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehouseService.getAllWarehouses() as any;
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

  // ── Product-aware stock helpers (kho nào thật sự có món của dòng này) ──────
  // Match diacritic-insensitive, substring cả 2 chiều vì tenGoi trong YC có thể
  // không khớp tuyệt đối tenSanPham trong danh mục kho.
  const normalizeName = (s: string) =>
    (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

  const productMatches = (tenGoi: string, lp: LotProduct): boolean => {
    const name = normalizeName(tenGoi);
    const pname = normalizeName(lp.internationalProduct?.tenSanPham ?? '');
    if (!name || !pname) return false;
    return pname.includes(name) || name.includes(pname);
  };

  /** Tất cả lô của 1 kho chứa kiện khớp món của dòng. */
  const matchingLotsInWarehouse = (row: IssueRow, warehouse: Warehouse): Lot[] => {
    if (!row.tenGoi) return warehouse.lots ?? [];
    return (warehouse.lots ?? []).filter((l) => (l.lotProducts ?? []).some((lp) => productMatches(row.tenGoi, lp)));
  };

  /** Các kiện khớp món trong lô đã chọn (cả kiện còn hàng và hết hàng). */
  const matchingLotProductsInLot = (row: IssueRow, lot: Lot | undefined): LotProduct[] => {
    if (!row.tenGoi || !lot) return lot?.lotProducts ?? [];
    return (lot.lotProducts ?? []).filter((lp) => productMatches(row.tenGoi, lp));
  };

  /** Tổng tồn của món này trên TẤT CẢ kho (để cảnh báo hết hàng toàn cục). */
  const totalStockForName = (tenGoi: string): number =>
    warehouses.reduce((acc, w) =>
      acc + (w.lots ?? []).reduce((a, l) =>
        a + (l.lotProducts ?? []).reduce((s, lp) => s + (productMatches(tenGoi, lp) ? lp.soLuong : 0), 0), 0), 0);

  const addRow = () => {
    setRows(prev => [...prev, {
      warehouseId: '', lotId: '', lotProductId: '',
      soLuongXuat: 0, ghiChu: '', tinhTrang: 'Bình thường', tinhTrangCustom: '', quyCach: '', lots: [], lotProducts: [],
      tenGoi: '', donViTinh: '',
    }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isFromSupplyRequest = !!supplyRequest?.id;

    // Rule Matrix gate — split per path: fulfillment mutates the supply request,
    // a standalone slip mutates warehouse issues.
    const allowed = isFromSupplyRequest
      ? can('supply-requests', 'UPDATE', user?.role)
      : can('warehouse-issues', 'CREATE', user?.role);
    if (!allowed) {
      alert('Bạn không có quyền tạo phiếu xuất kho');
      return;
    }

    if (!user?.employeeId) {
      alert('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.');
      return;
    }

    // FIFO mode bypasses the row-based flow — standalone slips only: it does not
    // touch fulfillment accounting, so it is unavailable when opened from a YC.
    if (fifoMode && !isFromSupplyRequest) {
      const total = parseFloat(fifoTongSoLuong);
      if (!fifoLotId || !fifoProductId || !(total > 0)) {
        alert('Vui lòng chọn đủ lô, sản phẩm và nhập tổng số lượng');
        return;
      }
      setLoading(true);
      try {
        const lot = warehouses.flatMap((w) => w.lots ?? []).find((l) => l.id === fifoLotId);
        const lp = (lot?.lotProducts ?? []).find((p) => p.id === fifoProductId);
        await warehouseService.issueFifo({
          lotId: fifoLotId,
          internationalProductId: lp?.internationalProductId ?? '',
          tongSoLuong: total,
          employeeId: (user as any)?.employeeId || user?.id || '',
          maNhanVien: (user as any)?.employeeCode || '',
          tenNhanVien: `${user?.lastName ?? ''} ${user?.firstName ?? ''}`.trim(),
          ghiChu: 'Xuất tổng trừ FIFO theo kiện',
        });
        alert('Tạo phiếu xuất (trừ FIFO) thành công!');
        onSuccess?.();
        queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
        queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
        onClose();
      } catch (error: any) {
        alert(error.response?.data?.message || error.message || 'Lỗi khi tạo phiếu xuất kho');
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Path A: opened from a supply request → batchFulfill (accounting-correct) ──
    // One transaction on the backend: fulfilledQty/fulfillmentStatus per line,
    // decisions, shortage PRs bucketed by phanLoai, ONE issue slip, header status.
    if (isFromSupplyRequest) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const remaining = (row.yeuCau ?? row.soLuongXuat) - (row.daCap ?? 0);
        if (row.soLuongXuat > remaining) {
          alert(`Dòng ${i + 1}: Số lượng xuất (${row.soLuongXuat}) vượt phần còn lại của yêu cầu (${remaining} ${row.donViTinh})`);
          return;
        }
        if (row.soLuongXuat > 0 && (!row.warehouseId || !row.lotId || !row.lotProductId)) {
          alert(`Dòng ${i + 1}: Vui lòng chọn đầy đủ kho, lô và kiện hàng, hoặc đặt số lượng về 0 để chuyển phần này sang thu mua`);
          return;
        }
        const lp = row.lotProducts.find((p) => p.id === row.lotProductId);
        if (row.soLuongXuat > 0 && lp && row.soLuongXuat > lp.soLuong) {
          alert(
            `Dòng ${i + 1}: Số lượng xuất (${row.soLuongXuat}) vượt tồn kho của kiện ` +
            `${lp.maKien ?? ''} (còn ${lp.soLuong} ${lp.donViTinh})`
          );
          return;
        }
      }

      const lines: BatchFulfillLine[] = rows.map((row) => ({
        itemId: row.supplyRequestItemId ?? '',
        fulfilledQty: row.soLuongXuat,
        decidedByEmployeeId: user.employeeId ?? '',
        routeShortageToPurchase: routeShortage,
        warehouseId: row.warehouseId || undefined,
        lotId: row.lotId || undefined,
        lotProductId: row.lotProductId || undefined,
      }));

      setLoading(true);
      try {
        const response = await supplyRequestService.batchFulfill(lines);
        const result = (response.data as { data?: BatchFulfillResult } | undefined)?.data;
        const createdPRs = result?.createdPurchaseRequests ?? [];
        let msg = `Đã cấp phát ${result?.decisionsCount ?? rows.length} dòng thành công!`;
        if (createdPRs.length > 0) {
          msg += `\nĐã tạo ${createdPRs.length} yêu cầu bổ sung: ${createdPRs.map((p) => p.maYeuCau).join(', ')}`;
        }
        alert(msg);
        onSuccess?.();
        queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
        queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
        onClose();
      } catch (error: any) {
        alert(error.response?.data?.message || 'Lỗi khi cấp phát yêu cầu cung cấp');
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Path B: standalone issue slip (không gắn yêu cầu cung cấp) ──
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
      const items = rows.map(row => {
        const warehouse = warehouses.find(w => w.id === row.warehouseId);
        const lot = row.lots.find(l => l.id === row.lotId);
        const lotProduct = row.lotProducts.find(lp => lp.id === row.lotProductId);
        const tinhTrangVal = row.tinhTrang === 'Khác' ? (row.tinhTrangCustom || 'Khác') : (row.tinhTrang || undefined);
        return {
          lotProductId: row.lotProductId,
          tenSanPham: lotProduct?.internationalProduct?.tenSanPham || row.tenGoi || '',
          warehouseId: row.warehouseId,
          tenKho: warehouse?.tenKho || '',
          lotId: row.lotId,
          tenLo: lot?.tenLo || '',
          soLuongThucTe: row.soLuongXuat,
          donViTinh: lotProduct?.donViTinh || row.donViTinh || '',
          ghiChu: row.ghiChu,
          tinhTrang: tinhTrangVal,
          quyCach: row.quyCach || undefined,
        };
      });

      await warehouseIssueService.createWarehouseIssue({
        employeeId: user?.employeeId || '',
        maNhanVien: user?.employeeCode || '',
        tenNhanVien: `${user?.lastName} ${user?.firstName}`,
        supplyRequestId: supplyRequest?.id,
        nguoiDeNghi: nguoiDeNghi || undefined,
        maNguoiDeNghi: maNguoiDeNghi || undefined,
        boPhan: boPhan || undefined,
        lyDoXuatKho: lyDoXuatKho || undefined,
        items,
      });

      alert(`Tạo phiếu xuất kho ${rows.length} dòng thành công!`);
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[900px] flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã phiếu xuất</label>
              <input type="text" value={maPhieuXuatBase} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
              {rows.length > 1 && (
                <p className="text-xs text-gray-500 mt-1">Phiếu {maPhieuXuatBase} gồm {rows.length} dòng hàng hóa</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhân viên lập phiếu</label>
              <input type="text" value={`${user?.lastName} ${user?.firstName}`} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Người đề nghị</label><EmployeeCombobox employees={employees} value={nguoiDeNghi} onChange={handleNguoiDeNghiChange} placeholder="" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận</label><input value={boPhan} onChange={(e) => setBoPhan(e.target.value)} placeholder="" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Lý do xuất kho</label><input type="text" list="ly-do-xuat-create" value={lyDoXuatKho} onChange={(e) => setLyDoXuatKho(e.target.value)} placeholder="" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /><datalist id="ly-do-xuat-create">{LY_DO_XUAT_KHO_PRESETS.map((p) => <option key={p} value={p} />)}</datalist></div>

          {/* Chế độ xuất — FIFO không khả dụng khi mở từ YC (không đụng hạch toán cấp phát) */}
          {!supplyRequest && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Chế độ:</span>
            <button
              type="button"
              onClick={() => setFifoMode(false)}
              className={`px-3 py-1.5 text-sm rounded-md border ${!fifoMode ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              Nhập từng kiện
            </button>
            <button
              type="button"
              onClick={() => setFifoMode(true)}
              className={`px-3 py-1.5 text-sm rounded-md border ${fifoMode ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              Nhập tổng (trừ FIFO)
            </button>
          </div>
          )}

          {fifoMode && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lô <span className="text-red-500">*</span></label>
                  <select
                    value={fifoLotId}
                    onChange={(e) => { setFifoLotId(e.target.value); setFifoProductId(''); }}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Chọn lô</option>
                    {warehouses.flatMap((w) => (w.lots ?? []).map((l) => ({ ...l, tenKho: w.tenKho })))
                      .map((l) => <option key={l.id} value={l.id}>{l.tenKho} — {l.tenLo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sản phẩm <span className="text-red-500">*</span></label>
                  <select
                    value={fifoProductId}
                    onChange={(e) => setFifoProductId(e.target.value)}
                    disabled={!fifoLotId}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                  >
                    <option value="">Chọn sản phẩm</option>
                    {fifoProducts.map((lp) => (
                      <option key={lp.id} value={lp.id}>
                        {lp.internationalProduct?.tenSanPham} ({lp.maKien ?? ''}) — còn {lp.soLuong} {lp.donViTinh}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tổng số lượng xuất <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={fifoTongSoLuong}
                    onChange={(e) => setFifoTongSoLuong(String(parseNumberInput(e.target.value)))}
                    min="0"
                    step="0.01"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Hệ thống trừ dần từng kiện theo thứ tự mã (hết kiện này mới sang kiện kế) cho đến đủ tổng số lượng,
                rồi tự tạo 1 phiếu xuất nhiều dòng (1 dòng/kiện).
              </p>
            </div>
          )}

          {!fifoMode && (
          /* Items */
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Danh sách sản phẩm xuất kho <span className="text-red-500">*</span>
              </label>
              {supplyRequest ? (
                <span className="text-xs text-gray-500">{rows.length} dòng yêu cầu — mặc định xuất phần còn thiếu</span>
              ) : (
                <button type="button" onClick={addRow}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                  <Plus className="h-4 w-4" />
                  Thêm dòng
                </button>
              )}
            </div>

            {supplyRequest && (
              <label className="flex items-center gap-2 mb-3 px-3 py-2 border border-violet-200 bg-violet-50 rounded-md text-sm">
                <input type="checkbox" checked={routeShortage} onChange={(e) => setRouteShortage(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-violet-300 text-violet-600 focus:ring-violet-500" />
                <span className="text-violet-900">Chuyển phần thiếu sang Thu mua</span>
                <span className="text-gray-500">— đặt 0 thì phần còn lại sẽ thành "Yêu cầu bổ sung"</span>
              </label>
            )}

            <div className="space-y-4">
              {rows.map((row, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      Sản phẩm {index + 1}{row.tenGoi ? `: ${row.tenGoi}` : ''}
                      {row.supplyRequestItemId != null && row.yeuCau != null && row.daCap != null && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          Đã cấp {row.daCap} / {row.yeuCau} {row.donViTinh} — còn thiếu {(row.yeuCau - row.daCap).toLocaleString('vi-VN')} {row.donViTinh}
                        </span>
                      )}
                    </span>
                    <button type="button" onClick={() => removeRow(index)} disabled={rows.length === 1}
                      className="text-red-500 hover:text-red-700 disabled:text-gray-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Kho */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kho <span className="text-red-500">*</span></label>
                      {(() => {
                        const candidates = row.tenGoi
                          ? warehouses.filter((w) => matchingLotsInWarehouse(row, w).length > 0)
                          : warehouses;
                        if (row.tenGoi && candidates.length === 0) {
                          return <p className="text-xs text-amber-700 py-1">Không có kho nào còn món này</p>;
                        }
                        return (
                      <select value={row.warehouseId} onChange={(e) => handleWarehouseChange(index, e.target.value)}
                        required className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500">
                        <option value="">Chọn kho</option>
                        {(row.tenGoi ? candidates : warehouses).map(w => <option key={w.id} value={w.id}>{w.tenKho}</option>)}
                      </select>
                        );
                      })()}
                      {row.tenGoi && row.tenGoi.trim() && (() => {
                        const stock = totalStockForName(row.tenGoi);
                        if (stock <= 0) return (
                          <p className="text-xs text-amber-700 mt-1">
                            Hết hàng toàn kho — lượng tồn = 0. Đặt 0 để chuyển phần này sang <strong>Yêu cầu bổ sung</strong>.
                          </p>
                        );
                        return <p className="text-xs text-gray-500 mt-1">Tồn toàn kho cho "{row.tenGoi}": {stock} {row.donViTinh}</p>;
                      })()}
                    </div>

                    {/* Lô */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Lô <span className="text-red-500">*</span></label>
                      {row.warehouseId ? (() => {
                        const w = warehouses.find((x) => x.id === row.warehouseId);
                        const lots = row.tenGoi ? matchingLotsInWarehouse(row, w as Warehouse) : (row.lots ?? []);
                        if (lots.length === 0) return (
                          <p className="text-xs text-gray-500 py-1">Không có lô chứa món này trong kho đã chọn</p>
                        );
                        return (
                      <select value={row.lotId} onChange={(e) => handleLotChange(index, e.target.value)}
                        required
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 disabled:bg-gray-100">
                        <option value="">Chọn lô</option>
                        {lots.map(l => <option key={l.id} value={l.id}>{l.tenLo}</option>)}
                      </select>
                        );
                      })() : (
                      <select value={row.lotId} disabled
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 disabled:bg-gray-100">
                        <option value="">Chọn lô</option>
                      </select>
                      )}
                    </div>

                    {/* Sản phẩm — searchable, chỉ hiện kiện còn tồn */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kiện hàng <span className="text-red-500">*</span></label>
                      {row.lotId ? (
                      <LotProductCombobox
                        lotProducts={(() => {
                          const lot = row.lots.find((l) => l.id === row.lotId);
                          const m = matchingLotProductsInLot(row, lot);
                          // If nothing matched tenGoi, fall back to all kiện in lot (defensive)
                          return m.length > 0 ? m : (lot?.lotProducts ?? []);
                        })()}
                        value={row.lotProductId || null}
                        disabled={!row.lotId}
                        hideEmpty={false}
                        showEmptyDisabled
                        onChange={(lotProductId) => updateRow(index, { lotProductId: lotProductId ?? '' })}
                      />
                      ) : (
                      <LotProductCombobox
                        lotProducts={[]}
                        value={null}
                        disabled
                        onChange={() => {}}
                      />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
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
                        placeholder="" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Tình trạng</label><select value={row.tinhTrang} onChange={(e) => updateRow(index, { tinhTrang: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"><option value="">—</option>{TINH_TRANG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{row.tinhTrang === 'Khác' && <input value={row.tinhTrangCustom} onChange={(e) => updateRow(index, { tinhTrangCustom: e.target.value })} placeholder="" className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />}</div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Quy cách</label><input value={row.quyCach} onChange={(e) => updateRow(index, { quyCach: e.target.value })} placeholder="" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" /></div>
                    <div />
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Đang xử lý...' : fifoMode ? 'Tạo phiếu xuất (trừ FIFO)' : `Tạo phiếu xuất kho${rows.length > 1 ? ` (${rows.length} dòng)` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateWarehouseIssueModal;
