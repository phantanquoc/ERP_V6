import React, { useEffect, useState } from 'react';
import { X, PackagePlus, Check, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import warehouseReceiptService from '../services/warehouseReceiptService';
import warehouseService, { Warehouse, Lot, LotProduct } from '../services/warehouseService';
import { warehouseKeys } from '../hooks/useWarehouses';
import { useAuth } from '../contexts/AuthContext';
import { SupplyRequest } from '../services/supplyRequestService';
import { parseNumberInput } from '../utils/numberInput';
import Modal from './Modal';
import ProductCombobox from './common/ProductCombobox';
import EmployeeCombobox from './common/EmployeeCombobox';
import MultiKienPicker from './common/MultiKienPicker';
import UnitSelect from './common/UnitSelect';
import { useProducts } from '../hooks';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import { TINH_TRANG_OPTIONS } from '../constants/warehouseCatalogs';
import { kienCapacityByUnit } from '../utils/kienCapacity';
import { can } from '../utils/permissions';

import type { InboundPlan } from '../services/inboundPlanService';

interface CreateWarehouseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyRequest?: SupplyRequest | null;
  inboundPlan?: InboundPlan | null;
  onSuccess?: () => void;
}

interface ReceiptRow {
  tenSanPham: string;
  soLuong: number;
  /** Kế hoạch riêng — optional, mặc định = soLuong (thực tế) khi bỏ trống */
  soLuongYeuCau?: number;
  donViTinh: string;
  phanLoai: string;
  warehouseId: string;
  lotId: string;
  lotProductId: string;
  internationalProductId: string;
  ghiChu: string;
  tinhTrang: string;
  tinhTrangCustom: string;
  quyCach: string;
  selected: boolean;
  lots: Lot[];
  lotProducts: LotProduct[];
  selectedKienIds: string[];
  perKienQty: number[];
  perKienYeuCau: number[];
  /** Snapshot KH khi có inboundPlan / supplyRequest — để render cột KH disabled */
  warehouseKeHoach?: string;
  lotKeHoach?: string;
  donGiaKeHoach?: number | null;
  soKienKeHoach?: string;
}

const MUC_DICH_PRESETS = [
  'Nhập từ thu mua',
  'Nhập thành phẩm sản xuất',
  'Nhập trả lại từ bộ phận',
  'Nhập điều chuyển kho',
  'Kiểm kê điều chỉnh',
];

const emptyRow = (): ReceiptRow => ({
  tenSanPham: '', soLuong: 0, soLuongYeuCau: undefined, donViTinh: '', phanLoai: '', warehouseId: '', lotId: '',
  lotProductId: '', internationalProductId: '', ghiChu: '', tinhTrang: 'Bình thường', tinhTrangCustom: '', quyCach: '', selected: true, lots: [], lotProducts: [], selectedKienIds: [], perKienQty: [], perKienYeuCau: [],
});

const CreateWarehouseReceiptModal: React.FC<CreateWarehouseReceiptModalProps> = ({
  isOpen, onClose, supplyRequest, inboundPlan, onSuccess,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: productsData } = useProducts({ page: 1, limit: 1000 });
  const products = productsData?.data || [];
  const { data: employeesData } = useEmployeesForAssignment();
  const employees = employeesData ?? [];
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [mucDich, setMucDich] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [nguoiDeNghi, setNguoiDeNghi] = useState('');
  const [boPhan, setBoPhan] = useState('');
  const [maNguoiDeNghi, setMaNguoiDeNghi] = useState('');
  const [lyDoChenhLech, setLyDoChenhLech] = useState('');
  const [lyDoChenhLechError, setLyDoChenhLechError] = useState<string | null>(null);
  /**
   * The YCMH this slip receives against. One slip = one YCMH, because the backend
   * reconciles quantities against a single `purchaseRequestId`. When a supply
   * request was bought in several completed batches, the warehouse picks which
   * batch this slip receives instead of the modal silently using only the first.
   */
  const [linkedPurchaseRequestId, setLinkedPurchaseRequestId] = useState<string | null>(null);
  /** Every `Hoàn thành` YCMH on this supply request that carries line items. */
  const [completedPurchaseRequests, setCompletedPurchaseRequests] = useState<NonNullable<SupplyRequest['purchaseRequests']>>([]);
  /** Purchased quantity keyed by normalized product name — drives the "đã mua" hint + client-side cap. */
  const [purchasedByItem, setPurchasedByItem] = useState<Record<string, number>>({});

  const handleNguoiDeNghiChange = (name: string) => {
    setNguoiDeNghi(name);
    const emp = employees.find((e) => e.name === name);
    if (emp) {
      setMaNguoiDeNghi(emp.id);
      setBoPhan(emp.department ?? '');
    } else if (!name) {
      setMaNguoiDeNghi('');
      setBoPhan('');
    }
  };

  const isSupplyBatch = !!supplyRequest?.items?.length;
  const selectedRows = rows.filter((row) => row.selected);
  const firstSelected = selectedRows.find((row) => row.warehouseId);

  const getLotsForWarehouse = (warehouseId: string): Lot[] =>
    warehouses.find((warehouse) => warehouse.id === warehouseId)?.lots ?? [];

  const nameKeyOf = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

  /** Rebuild rows from one `Hoàn thành` YCMH (the batch being received). */
  const applyPurchasePr = (prId: string | null) => {
    const pr = (supplyRequest?.purchaseRequests ?? []).find((p) => p.id === prId);
    const bought: Record<string, number> = {};
    for (const it of (pr?.items ?? [])) {
      const key = nameKeyOf(it.tenHangHoa);
      if (!key) continue;
      bought[key] = (bought[key] ?? 0) + (Number(it.soLuong) || 0);
    }
    setPurchasedByItem(bought);
    setRows(
      (pr?.items ?? []).map((it) => {
        const key = nameKeyOf(it.tenHangHoa);
        const srItem = (supplyRequest?.items ?? []).find((i) => nameKeyOf(i.tenGoi) === key);
        const kh = Number(srItem?.soLuong ?? it.soLuong) || 0;
        const tt = Number(it.soLuong) || 0;
        return {
          ...emptyRow(),
          tenSanPham: it.tenHangHoa,
          soLuong: tt,
          soLuongYeuCau: kh,
          warehouseKeHoach: '',
          lotKeHoach: '',
          donGiaKeHoach: (it as any).giaDuKien ?? null,
          soKienKeHoach: '',
          donViTinh: it.donViTinh || srItem?.donViTinh || '',
          phanLoai: srItem?.phanLoai || '',
          ghiChu: `Nhập kho theo ${pr?.maYeuCau ?? ''} - ${it.tenHangHoa}`,
        };
      }),
    );
  };

  /** Switching batch rebuilds the lines, so previously picked lots no longer apply. */
  const handlePurchasePrChange = (prId: string) => {
    setLinkedPurchaseRequestId(prId || null);
    applyPurchasePr(prId || null);
  };

  const isInboundPlanMode = !!inboundPlan;
  // KH column exists when inboundPlan OR supplyRequest (with items). Empty form -> no KH.
  const hasKeHoachColumn = isInboundPlanMode || isSupplyBatch;
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const initialize = async () => {
      const [warehouseResponse, codeResponse] = await Promise.all([
        warehouseService.getAllWarehouses() as any,
        warehouseReceiptService.generateReceiptCode(),
      ]);
      if (cancelled) return;
      const warehouseData = warehouseResponse.data?.data ?? warehouseResponse.data ?? [];
      setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);
      setCode((codeResponse.data as { code: string }).code);
      setLyDoChenhLech('');
      setLyDoChenhLechError(null);
      // InboundPlan prefill takes priority over supplyRequest
      if (inboundPlan) {
        const pr = inboundPlan.purchaseRequest;
        const prefWarehouseId = inboundPlan.warehouseId || (pr as any)?.warehouseId || '';
        const prefWarehouseName = inboundPlan.warehouse?.tenKho || (warehouseData as any[]).find((w: any) => w.id === prefWarehouseId)?.tenKho || '';
        const prItems: any[] = (pr?.items as any[]) ?? [];
        setMucDich('Nhập từ thu mua');
        setGhiChu('');
        // Bộ phận đề nghị = bộ phận đã tạo YCCB gốc (nếu YCMH có liên kết YCCB), KHÔNG
        // phải bộ phận của thủ kho đang lập phiếu. Khi YCMH không gắn YCCB (mua trực
        // tiếp / REORDER), không có nguồn để suy ra — để trống, không tự điền.
        setNguoiDeNghi(pr?.supplyRequest?.tenNhanVien ?? '');
        setBoPhan(pr?.supplyRequest?.boPhan ?? '');
        setMaNguoiDeNghi('');
        setCompletedPurchaseRequests([]);
        setPurchasedByItem({});
        setLinkedPurchaseRequestId(pr?.id ?? null);
        const prefRows: ReceiptRow[] = prItems.map((it: any) => {
          const kh = Number(it.soLuong) || 0;
          return {
            ...emptyRow(),
            tenSanPham: it.tenHangHoa,
            soLuong: kh,
            soLuongYeuCau: kh,
            donViTinh: it.donViTinh || '',
            phanLoai: it.phanLoai || '',
            warehouseId: prefWarehouseId,
            warehouseKeHoach: prefWarehouseName || prefWarehouseId,
            lotKeHoach: '',
            donGiaKeHoach: it.giaDuKien ?? null,
            soKienKeHoach: '',
            ghiChu: `Nhập theo ${inboundPlan.maKeHoach} - ${it.tenHangHoa}`,
            lots: prefWarehouseId ? (warehouseData as any[]).find((w: any) => w.id === prefWarehouseId)?.lots ?? [] : [],
          };
        });
        setRows(prefRows.length > 0 ? prefRows : [emptyRow()]);
        return;
      }
      setMucDich(isSupplyBatch ? 'Nhập từ thu mua' : '');
      setGhiChu('');
      setNguoiDeNghi(supplyRequest?.tenNhanVien ?? '');
      setBoPhan(supplyRequest?.boPhan ?? '');
      setMaNguoiDeNghi('');

      // ── What to receive ────────────────────────────────────────────────────
      // When one or more YCMH are `Hoàn thành` they are the AUTHORITY on what was
      // bought, not the supply request:
      //  - purchasing may have bought a different quantity than was requested;
      //  - the warehouse added hand-added lines to the YCBS that the supply request
      //    never mentioned (those exist only on the PR).
      // So we build the line list from a PR when one is available. When a supply
      // request was purchased in several completed batches the warehouse picks which
      // batch this slip receives instead of silently using only the first and then
      // rejecting the other products as "không có trong YCMH".
      const prs = supplyRequest?.purchaseRequests ?? [];
      const completedPrs = prs.filter((pr) => pr.trangThai === 'Hoàn thành' && pr.items?.length);
      setCompletedPurchaseRequests(completedPrs);
      const primary = completedPrs[0] as (typeof prs)[number] | undefined;
      let completedPr = primary;
      if (linkedPurchaseRequestId) {
        const keep = completedPrs.find((pr) => pr.id === linkedPurchaseRequestId);
        if (keep) completedPr = keep;
        else setLinkedPurchaseRequestId(primary?.id ?? null);
      } else {
        setLinkedPurchaseRequestId(primary?.id ?? null);
      }
      if (completedPr) {
        // Receive exactly what was bought on the selected batch. Hand-added lines
        // that the supply request never mentioned are covered because the PR has them.
        applyPurchasePr(completedPr.id);
        return;
      }
      setPurchasedByItem({});
      // No completed purchase: prefill each line's remaining shortage (the quantity
      // the warehouse still owes the requester).
      setRows(isSupplyBatch
        ? (supplyRequest?.items ?? []).map((item) => {
            const kh = Number(item.soLuong || 0);
            return {
              ...emptyRow(),
              tenSanPham: item.tenGoi,
              soLuong: kh,
              soLuongYeuCau: kh,
              warehouseKeHoach: '',
              lotKeHoach: '',
              donGiaKeHoach: null,
              soKienKeHoach: '',
              donViTinh: item.donViTinh,
              phanLoai: item.phanLoai || '',
              ghiChu: `Nhập kho cho ${supplyRequest?.maYeuCau} - ${item.tenGoi}`,
            };
          })
        : [emptyRow()]);
    };
    initialize().catch((error) => console.error('Error initializing receipt modal:', error));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, supplyRequest, isSupplyBatch, inboundPlan]);

  const updateRow = (index: number, updates: Partial<ReceiptRow>) => {
    setRows((previous) => previous.map((row, rowIndex) => rowIndex === index ? { ...row, ...updates } : row));
  };

  const handleWarehouseChange = (index: number, warehouseId: string) => {
    updateRow(index, { warehouseId, lotId: '', lotProductId: '', lots: getLotsForWarehouse(warehouseId), lotProducts: [] });
  };

  const handleLotChange = (index: number, lotId: string) => {
    const row = rows[index];
    const lot = row?.lots.find((candidate) => candidate.id === lotId);
    updateRow(index, { lotId, lotProductId: '', lotProducts: lot?.lotProducts ?? [], selectedKienIds: [], perKienQty: [] });
  };

  const applyToAll = (warehouseId: string, lotId: string) => {
    const lots = getLotsForWarehouse(warehouseId);
    const lot = lots.find((candidate) => candidate.id === lotId);
    setRows((previous) => previous.map((row) => row.selected
      ? { ...row, warehouseId, lotId, lots, lotProducts: lot?.lotProducts ?? [], lotProductId: '' }
      : row));
  };

  const handleKienMultiChange = (index: number, ids: string[]) => {
    const row = rows[index];
    const total = row?.soLuong ?? 0;
    const totalKH = row?.soLuongYeuCau ?? total;
    const n = ids.length;
    let perKienQty: number[] = [];
    let perKienYeuCau: number[] = [];
    if (n > 0 && total > 0) {
      const base = Math.floor(total / n);
      const rem = total % n;
      perKienQty = ids.map((_, i) => i === n - 1 ? base + rem : base);
    } else {
      perKienQty = ids.map(() => 0);
    }
    if (n > 0 && totalKH > 0) {
      const base = Math.floor(totalKH / n);
      const rem = totalKH % n;
      perKienYeuCau = ids.map((_, i) => i === n - 1 ? base + rem : base);
    } else {
      perKienYeuCau = ids.map(() => 0);
    }
    updateRow(index, { selectedKienIds: ids, perKienQty, perKienYeuCau });
  };

  const handleTotalChange = (index: number, total: number) => {
    const ids = rows[index]?.selectedKienIds ?? [];
    const n = ids.length;
    let perKienQty: number[] = [];
    let perKienYeuCau: number[] = [];
    if (n > 0 && total > 0) {
      const base = Math.floor(total / n);
      const rem = total % n;
      perKienQty = ids.map((_, i) => i === n - 1 ? base + rem : base);
    } else {
      perKienQty = ids.map(() => 0);
    }
    const kh = rows[index]?.soLuongYeuCau ?? total;
    if (n > 0 && kh > 0) {
      const base = Math.floor(kh / n);
      const rem = kh % n;
      perKienYeuCau = ids.map((_, i) => i === n - 1 ? base + rem : base);
    } else {
      perKienYeuCau = ids.map(() => 0);
    }
    updateRow(index, { soLuong: total, perKienQty, perKienYeuCau });
  };

  const addRow = () => setRows((previous) => [...previous, emptyRow()]);
  const removeRow = (index: number) => setRows((previous) => previous.length > 1 ? previous.filter((_, i) => i !== index) : previous);

  const handleProductChange = (index: number, productId: string | null, product?: any) => {
    const row = rows[index];
    const existing = row.lotProducts.find((candidate) => candidate.internationalProductId === productId);
    updateRow(index, {
      internationalProductId: productId ?? '', lotProductId: existing?.id ?? '',
      tenSanPham: product?.tenSanPham ?? row.tenSanPham,
      // ĐVT lấy trực tiếp từ hàng hóa/kiện — giá trị chuẩn nằm trong Lookup DON_VI_TINH,
      // thêm/sửa trong Cài đặt có hiệu lực ngay, không còn bị chặn bởi Set cứng.
      donViTinh: existing?.donViTinh ?? product?.donViTinh ?? row.donViTinh,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Rule Matrix gate — warehouse receipt from a supply request is a supply-side mutation
    if (!can('supply-requests', 'UPDATE', user?.role)) {
      alert('Bạn không có quyền tạo phiếu nhập kho');
      return;
    }

    const submittedRows = isSupplyBatch ? selectedRows : rows;
    if (submittedRows.length === 0) {
      alert('Vui lòng chọn ít nhất một hàng hóa');
      return;
    }
    const invalidIndex = submittedRows.findIndex((row) => {
      const hasKien = (row.selectedKienIds?.length ?? 0) > 0 || !!row.lotProductId;
      return !row.warehouseId || !row.lotId || (!hasKien && !row.tenSanPham) || row.soLuong <= 0
      || (!hasKien && !row.lotProductId && !row.donViTinh);
    });
    if (invalidIndex >= 0) {
      const row = submittedRows[invalidIndex];
      const rowNumber = rows.indexOf(row) + 1;
      alert(`Dòng ${rowNumber}: Vui lòng chọn kho, lô, hàng hóa/kiện, đơn vị tính và số lượng lớn hơn 0`);
      return;
    }

    // Receiving into a pre-created empty kiện still needs a commodity name so the
    // backend can link the product onto the pallet (otherwise it renders as "?").
    const emptyKienNoProductIndex = submittedRows.findIndex((row) => {
      const kienIds = row.selectedKienIds?.length ? row.selectedKienIds : (row.lotProductId ? [row.lotProductId] : []);
      const targetsEmptyKien = kienIds.some((kid) => {
        const lp = row.lotProducts.find((candidate) => candidate.id === kid);
        return lp ? !lp.internationalProductId : false;
      });
      return targetsEmptyKien && !row.tenSanPham.trim();
    });
    if (emptyKienNoProductIndex >= 0) {
      const rowNumber = rows.indexOf(submittedRows[emptyKienNoProductIndex]) + 1;
      alert(`Dòng ${rowNumber}: Kiện được chọn đang trống — hãy nhập/tên hàng hóa để gắn hàng hóa vào kiện`);
      return;
    }

    if (isInboundPlanMode) {
      const hasDiff = submittedRows.some((r) => {
        const kh = Number(r.soLuongYeuCau ?? r.soLuong);
        const tt = Number(r.soLuong);
        return Math.abs(kh - tt) > 1e-9;
      });
      if (hasDiff && !lyDoChenhLech.trim()) {
        setLyDoChenhLechError('Vui lòng nhập lý do chênh lệch khi thực tế khác kế hoạch.');
        return;
      }
      setLyDoChenhLechError(null);
    }

    // Client-side mirror of the backend reconciliation, so the operator sees which
    // line overflows instead of a generic 400. Only applies when receiving against
    // a specific YCMH — the server validates against that single purchaseRequestId.
    if (linkedPurchaseRequestId && Object.keys(purchasedByItem).length > 0) {
      const receivedByItem: Record<string, { label: string; qty: number }> = {};
      for (const row of submittedRows) {
        // Resolve the name exactly like the payload does, so this matches what the
        // server will compare.
        const lotProduct = row.lotProducts.find((candidate) => candidate.id === row.lotProductId);
        const label = lotProduct?.internationalProduct?.tenSanPham || row.tenSanPham;
        const key = nameKeyOf(label);
        if (!key) continue;
        receivedByItem[key] = { label, qty: (receivedByItem[key]?.qty ?? 0) + (Number(row.soLuong) || 0) };
      }
      const problems: string[] = [];
      for (const [key, { label, qty }] of Object.entries(receivedByItem)) {
        const bought = purchasedByItem[key];
        if (bought === undefined) problems.push(`"${label}" không có trong yêu cầu mua hàng`);
        else if (qty > bought + 1e-9) problems.push(`"${label}": nhập ${qty}, chỉ mua ${bought}`);
      }
      if (problems.length > 0) {
        alert(`Không khớp với yêu cầu mua hàng đã hoàn thành:\n- ${problems.join('\n- ')}`);
        return;
      }
    }

    setLoading(true);
    try {
      const items = submittedRows.flatMap((row) => {
        const warehouse = warehouses.find((candidate) => candidate.id === row.warehouseId);
        const lot = row.lots.find((candidate) => candidate.id === row.lotId);
        const tinhTrangVal = row.tinhTrang === 'Khác' ? (row.tinhTrangCustom || 'Khác') : row.tinhTrang;
        const kienIds = row.selectedKienIds?.length ? row.selectedKienIds : (row.lotProductId ? [row.lotProductId] : []);
        if (kienIds.length > 1) {
          const perKien = row.perKienQty?.length === kienIds.length ? row.perKienQty : (() => {
            const base = Math.floor(row.soLuong / kienIds.length);
            const rem = row.soLuong % kienIds.length;
            return kienIds.map((_, i) => i === kienIds.length - 1 ? base + rem : base);
          })();
          // capacity check
          const cap = kienCapacityByUnit(row.donViTinh);
          if (cap) {
            const maxPer = Math.max(...perKien);
            if (maxPer > cap) {
              throw new Error(`Vượt sức chứa kiện (tối đa ${cap} ${row.donViTinh}/kiện) — dùng nhiều kiện hơn hoặc giảm số lượng`);
            }
          }
          // KH riêng: mặc định = TT khi không nhập; chia đều theo kiện như TT
          const hasCustomKH = (row.soLuongYeuCau ?? 0) > 0;
          const totalKH = hasCustomKH ? (row.soLuongYeuCau ?? row.soLuong) : row.soLuong;
          const perKienKH = (hasCustomKH && row.perKienYeuCau?.length === kienIds.length)
            ? row.perKienYeuCau
            : (() => {
                const base = Math.floor(totalKH / kienIds.length);
                const rem = totalKH % kienIds.length;
                return kienIds.map((_, i) => i === kienIds.length - 1 ? base + rem : base);
              })();
          return kienIds.map((kid, i) => {
            const lp = row.lotProducts.find((p) => p.id === kid);
            return {
              lotProductId: kid,
              tenSanPham: lp?.internationalProduct?.tenSanPham || row.tenSanPham,
              warehouseId: row.warehouseId, tenKho: warehouse?.tenKho || '', lotId: lp?.lotId ?? row.lotId,
              tenLo: (warehouses.find((w) => w.id === row.warehouseId)?.lots?.find((l) => l.id === (lp?.lotId ?? row.lotId))?.tenLo) ?? lot?.tenLo ?? '',
              soLuongYeuCau: perKienKH[i], soLuongThucTe: perKien[i],
              donViTinh: lp?.donViTinh || row.donViTinh, ghiChu: row.ghiChu,
              tinhTrang: tinhTrangVal || undefined, quyCach: row.quyCach || undefined,
            };
          });
        }
        const lotProduct = row.lotProducts.find((candidate) => candidate.id === row.lotProductId);
        return [{
          lotProductId: row.lotProductId,
          tenSanPham: lotProduct?.internationalProduct?.tenSanPham || row.tenSanPham,
          warehouseId: row.warehouseId, tenKho: warehouse?.tenKho || '', lotId: row.lotId,
          tenLo: lot?.tenLo || '',
          soLuongYeuCau: (row.soLuongYeuCau ?? 0) > 0 ? row.soLuongYeuCau : row.soLuong,
          soLuongThucTe: row.soLuong,
          donViTinh: lotProduct?.donViTinh || row.donViTinh, ghiChu: row.ghiChu,
          tinhTrang: tinhTrangVal || undefined, quyCach: row.quyCach || undefined,
        }];
      });
      await warehouseReceiptService.createWarehouseReceipt({
        maPhieuNhap: code, employeeId: user?.employeeId || '', maNhanVien: user?.employeeCode || '',
        tenNhanVien: `${user?.lastName || ''} ${user?.firstName || ''}`.trim(), mucDich: mucDich || undefined,
        ghiChu: ghiChu || undefined, supplyRequestId: (isInboundPlanMode ? inboundPlan?.purchaseRequest?.supplyRequest?.id : supplyRequest?.id) || undefined,
        purchaseRequestId: (inboundPlan?.purchaseRequest?.id ?? linkedPurchaseRequestId) ?? undefined,
        inboundPlanId: inboundPlan?.id ?? undefined,
        lyDoChenhLech: isInboundPlanMode && lyDoChenhLech.trim() ? lyDoChenhLech.trim() : undefined,
        nguoiDeNghi: nguoiDeNghi || undefined, maNguoiDeNghi: maNguoiDeNghi || undefined, boPhan: boPhan || undefined,
        items,
      });
      alert(`Đã tạo phiếu nhập kho ${items.length} dòng thành công!`);
      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[1000px] flex flex-col modal-viewport-h" onClick={(event) => event.stopPropagation()}>
        <datalist id="muc-dich-presets-create">
          {MUC_DICH_PRESETS.map((preset) => <option key={preset} value={preset} />)}
        </datalist>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><PackagePlus className="w-5 h-5 text-green-600" />Tạo phiếu nhập kho</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {inboundPlan && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm flex flex-wrap gap-2">
              <span><span className="text-gray-600">Kế hoạch: </span><strong className="text-blue-700">{inboundPlan.maKeHoach}</strong></span>
              <span><span className="text-gray-600">YCMH: </span><strong>{inboundPlan.purchaseRequest?.maYeuCau ?? '—'}</strong></span>
              <span><span className="text-gray-600">Ngày DK: </span><strong>{inboundPlan.ngayDuKien ? new Date(inboundPlan.ngayDuKien).toLocaleDateString('vi-VN') : '—'}</strong></span>
              <span><span className="text-gray-600">Kho DK: </span><strong>{inboundPlan.warehouse?.tenKho ?? '—'}</strong></span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-white border">{inboundPlan.trangThai}</span>
            </div>
          )}
          {supplyRequest && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm"><span className="text-gray-600">Mã YC: </span><strong className="text-blue-700">{supplyRequest.maYeuCau}</strong><span className="ml-4 text-gray-600">Người yêu cầu: </span><strong>{supplyRequest.tenNhanVien}</strong></div>}
          {/* Purchased in several completed batches → the warehouse picks which one this
              slip receives. One slip per YCMH, because the backend reconciles the slip
              against a single purchaseRequestId. */}
          {(completedPurchaseRequests?.length ?? 0) > 1 && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <label htmlFor="receipt-pr-batch" className="block text-xs font-medium text-gray-700 mb-1">
                Nhập theo yêu cầu mua hàng <span className="text-red-500">*</span>
              </label>
              <select
                id="receipt-pr-batch"
                value={linkedPurchaseRequestId ?? ''}
                onChange={(event) => handlePurchasePrChange(event.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
              >
                {(completedPurchaseRequests ?? []).map((pr) => (
                  <option key={pr.id} value={pr.id}>{pr.maYeuCau} — {pr.items?.length ?? 0} dòng</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-indigo-800">
                Yêu cầu này được mua thành {completedPurchaseRequests?.length} đợt đã hoàn thành — mỗi phiếu nhập tương ứng một yêu cầu mua hàng. Đổi đợt sẽ nạp lại danh sách dòng.
              </p>
            </div>
          )}
          {/* What purchasing actually bought — the authority for this slip when a YCMH is completed. */}
          {linkedPurchaseRequestId ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-900">
              <div className="font-semibold mb-1">
                Nhập theo yêu cầu mua hàng đã hoàn thành — số lượng mặc định bằng số đã mua
                {(() => {
                  const pr = (supplyRequest?.purchaseRequests ?? []).find((p) => p.id === linkedPurchaseRequestId);
                  return pr ? ` (${pr.maYeuCau})` : '';
                })()}
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {Object.entries(purchasedByItem).map(([key, qty]) => (
                  <li key={key}>
                    {rows.find((r) => nameKeyOf(r.tenSanPham) === key)?.tenSanPham ?? key}: <strong>{qty}</strong>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-green-800">Có thể giảm nếu hàng thiếu/hư, nhưng không được nhập vượt số đã mua.</p>
            </div>
          ) : supplyRequest?.items?.length ? (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              {supplyRequest.items.map((it) => `${it.tenGoi}: yêu cầu ${it.soLuong}, đã cấp ${it.fulfilledQty ?? 0}, còn thiếu ${Math.max(0, it.soLuong - (it.fulfilledQty ?? 0))}`).join(' · ')}
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Mã phiếu nhập</label><input value={code} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên lập phiếu</label><input value={`${user?.lastName || ''} ${user?.firstName || ''}`.trim()} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Người đề nghị</label><EmployeeCombobox employees={employees} value={nguoiDeNghi} onChange={handleNguoiDeNghiChange} placeholder="" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận</label><input value={boPhan} onChange={(e) => setBoPhan(e.target.value)} placeholder="" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Mục đích nhập</label><input type="text" list="muc-dich-presets-create" value={mucDich} onChange={(event) => setMucDich(event.target.value)} placeholder="" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
          {isSupplyBatch && <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"><span className="text-xs font-medium text-gray-500 uppercase">Áp dụng cho tất cả:</span><select className="text-sm border border-gray-300 rounded px-2 py-1" value={firstSelected?.warehouseId || ''} onChange={(event) => { const warehouseId = event.target.value; const lots = getLotsForWarehouse(warehouseId); applyToAll(warehouseId, lots.length === 1 ? lots[0].id : ''); }}><option value="">Chọn kho</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.tenKho}</option>)}</select>{firstSelected?.warehouseId && <select className="text-sm border border-gray-300 rounded px-2 py-1" value={firstSelected.lotId} onChange={(event) => applyToAll(firstSelected.warehouseId, event.target.value)}><option value="">Chọn lô</option>{getLotsForWarehouse(firstSelected.warehouseId).map((lot) => <option key={lot.id} value={lot.id}>{lot.tenLo}</option>)}</select>}</div>}
          <div className="flex items-center justify-between"><label className="block text-sm font-medium text-gray-700">Danh sách hàng hóa nhập kho <span className="text-red-500">*</span></label>{!isSupplyBatch && <button type="button" onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"><Plus className="h-4 w-4" />Thêm dòng</button>}</div>
          <div className="space-y-3">
            {rows.map((row, index) => {
              const hasDiff = hasKeHoachColumn && Math.abs(Number(row.soLuong ?? 0) - Number(row.soLuongYeuCau ?? row.soLuong)) > 1e-9;
              return (
              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Dòng {index + 1}{row.tenSanPham ? `: ${row.tenSanPham}` : ''}</span>
                  <div className="flex items-center gap-2">
                    {hasDiff && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Lệch {Number((Number(row.soLuong) - Number(row.soLuongYeuCau ?? row.soLuong)).toFixed(2))}</span>}
                    {!isSupplyBatch && <button type="button" onClick={() => removeRow(index)} disabled={rows.length === 1} aria-label={`Xóa dòng ${index + 1}`} className="text-red-500 hover:text-red-700 disabled:text-gray-300"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
                {/* Hàng 1: Tên hàng | Kho | Lô | SL KH | SL TT | Đơn giá — 1 hàng grid cùng baseline */}
                <div className="grid grid-cols-12 gap-2 items-start">
                  {/* Tên hàng */}
                  <div className={hasKeHoachColumn ? 'col-span-12 sm:col-span-5 flex flex-col' : 'col-span-12 sm:col-span-6 flex flex-col'}>
                    {!hasKeHoachColumn && !row.tenSanPham ? (
                      <>
                        <label className="block text-xs font-medium text-gray-600 min-h-[16px] h-4 leading-4 mb-1">Hàng hóa <span className="text-red-500">*</span></label>
                        <div className="h-[32px] flex items-center">
                          <ProductCombobox products={products} value={row.internationalProductId || null} disabled={!row.lotId} lotProducts={row.lotProducts} allowCreate onChange={(productId, product) => handleProductChange(index, productId, product)} onCreateNew={(name) => updateRow(index, { internationalProductId: '', lotProductId: '', tenSanPham: name })} />
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="block text-xs font-medium text-gray-600 min-h-[16px] h-4 leading-4 mb-1">Tên hàng</label>
                        <input value={row.tenSanPham} onChange={(e) => !hasKeHoachColumn && updateRow(index, { tenSanPham: e.target.value })} disabled={hasKeHoachColumn} tabIndex={hasKeHoachColumn ? -1 : 0} placeholder={hasKeHoachColumn ? '' : 'Tên hàng'} title={row.tenSanPham} className={`w-full h-[32px] px-2 py-1.5 border rounded text-sm truncate ${hasKeHoachColumn ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300 bg-white'}`} />
                      </>
                    )}
                    <div className="mt-1 min-h-[16px]" />
                  </div>

                  {/* ĐVT */}
                  <div className="col-span-3 sm:col-span-1 flex flex-col">
                    <label className="block text-xs font-medium text-gray-600 min-h-[16px] h-4 leading-4 mb-1">ĐVT</label>
                    <UnitSelect
                      value={row.donViTinh}
                      onChange={(v) => updateRow(index, { donViTinh: v })}
                      className="w-full h-[32px] px-2 py-1.5 border border-gray-300 rounded text-sm bg-white text-center"
                      disabled={isSupplyBatch && !row.selected}
                    />
                    <div className="mt-1 min-h-[16px] flex items-center gap-1 text-xs text-gray-500">{row.lotProductId && <span className="text-blue-600 text-[11px]">• Kiện có sẵn</span>}</div>
                  </div>

                  {/* Kho (TT) */}
                  <div className="col-span-5 sm:col-span-2 flex flex-col">
                    <label className="block text-xs font-medium text-gray-600 min-h-[16px] h-4 leading-4 mb-1">Kho <span className="text-red-500">*</span></label>
                    <select value={row.warehouseId} onChange={(event) => handleWarehouseChange(index, event.target.value)} disabled={isSupplyBatch && !row.selected} required className="w-full h-[32px] px-2 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100">
                      <option value="">Chọn kho</option>
                      {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.tenKho}</option>)}
                    </select>
                    <div className="mt-1 min-h-[16px]" />
                  </div>

                  {/* Lô (TT) */}
                  <div className="col-span-4 sm:col-span-2 flex flex-col">
                    <label className="block text-xs font-medium text-gray-600 min-h-[16px] h-4 leading-4 mb-1">Lô <span className="text-red-500">*</span></label>
                    <select value={row.lotId} onChange={(event) => handleLotChange(index, event.target.value)} disabled={!row.warehouseId || (isSupplyBatch && !row.selected)} required className="w-full h-[32px] px-2 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100">
                      <option value="">Chọn lô</option>
                      {row.lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.tenLo}</option>)}
                    </select>
                    <div className="mt-1 min-h-[16px]" />
                  </div>

                  {/* SL KH (disabled) */}
                  {hasKeHoachColumn && (
                    <div className="col-span-4 sm:col-span-1 flex flex-col">
                      <label className="block text-xs font-medium text-gray-500 min-h-[16px] h-4 leading-4 mb-1">SL KH</label>
                      <input type="number" value={(row.soLuongYeuCau ?? 0) > 0 ? row.soLuongYeuCau : ''} placeholder="—" disabled tabIndex={-1} className="w-full h-[32px] px-2 py-1.5 border border-gray-200 rounded text-sm bg-gray-100 cursor-not-allowed text-gray-500 text-center" />
                      <div className="mt-1 min-h-[16px] flex flex-col">
                        {row.warehouseKeHoach && <span className="text-[11px] text-gray-400 truncate leading-tight" title={row.warehouseKeHoach}>Kho KH: {row.warehouseKeHoach}</span>}
                        {row.lotKeHoach && <span className="text-[11px] text-gray-400 truncate leading-tight" title={row.lotKeHoach}>Lô KH: {row.lotKeHoach}</span>}
                      </div>
                    </div>
                  )}

                  {/* SL TT (editable) */}
                  <div className={hasKeHoachColumn ? 'col-span-4 sm:col-span-1 flex flex-col' : 'col-span-4 sm:col-span-1 flex flex-col'}>
                    <label className="block text-xs font-medium text-gray-600 min-h-[16px] h-4 leading-4 mb-1">SL TT <span className="text-red-500">*</span></label>
                    <input type="number" value={row.soLuong === 0 ? '' : row.soLuong} onChange={(event) => handleTotalChange(index, parseNumberInput(event.target.value))} min="0.01" step="0.01" required disabled={isSupplyBatch && !row.selected} className="w-full h-[32px] px-2 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100 text-center" />
                    <div className="mt-1 min-h-[16px]" />
                  </div>
                </div>

                {/* Tình trạng / quy cách — ngay trên Ghi chú */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Tình trạng</label><select value={row.tinhTrang} onChange={(e) => updateRow(index, { tinhTrang: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"><option value="">— Chọn —</option>{TINH_TRANG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{row.tinhTrang === 'Khác' && <input value={row.tinhTrangCustom} onChange={(e) => updateRow(index, { tinhTrangCustom: e.target.value })} placeholder="Nhập tình trạng khác..." className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />}</div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Quy cách</label><input value={row.quyCach} onChange={(e) => updateRow(index, { quyCach: e.target.value })} placeholder="VD: 10kg/bao, 500g/hộp..." className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" /></div>
                </div>

                {/* Ghi chú + badge lệch */}
                <div className="mt-2 pt-2 border-t border-gray-200 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <div className="flex-1 w-full">
                    <input value={row.ghiChu} onChange={(event) => updateRow(index, { ghiChu: event.target.value })} placeholder="Ghi chú dòng..." className="w-full h-[32px] px-2 py-1.5 border border-gray-300 rounded text-sm bg-white" />
                  </div>
                  {hasDiff ? <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">Lệch {Number((Number(row.soLuong) - Number(row.soLuongYeuCau ?? row.soLuong)).toFixed(2))}</span> : <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">Khớp KH</span>}
                </div>

                {/* Multi-kiện picker + per-kiện */}
                {row.warehouseId && row.lotId && (
                  <div className="mt-2">
                    <MultiKienPicker lots={row.lots.filter((l) => l.id === row.lotId)} value={row.selectedKienIds} onChange={(ids) => handleKienMultiChange(index, ids)} disabled={isSupplyBatch && !row.selected} />
                    {row.selectedKienIds.length > 1 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">Chia đều {row.soLuong} {row.donViTinh || ''} vào {row.selectedKienIds.length} kiện:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {row.selectedKienIds.map((kid, ki) => {
                            const lp = row.lotProducts.find((p) => p.id === kid);
                            const max = kienCapacityByUnit(row.donViTinh || lp?.donViTinh || '');
                            const per = row.perKienQty[ki] ?? 0;
                            const over = max !== null && per > max;
                            return (
                              <div key={kid} className={`p-2 rounded border ${over ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                                <div className="text-xs font-mono text-gray-600">{lp?.maKien ?? kid.slice(-6)}</div>
                                <input type="number" value={row.perKienQty[ki] ?? 0} onChange={(e) => { const next = [...row.perKienQty]; next[ki] = parseNumberInput(e.target.value); updateRow(index, { perKienQty: next }); }} min={0} step={0.01} className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                                {over && <div className="text-xs text-red-600 mt-1">Vượt {max} {row.donViTinh}</div>}
                              </div>
                            );
                          })}
                        </div>
                        {(() => { const sum = row.perKienQty.reduce((a,b)=>a+b,0); const diff = row.soLuong - sum; return diff !== 0 ? <div className="text-xs mt-1 flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" />Tổng kiện ({sum}) lệch tổng phiếu ({row.soLuong}) — chênh {diff > 0 ? '+' : ''}{diff}</div> : null; })()}
                      </div>
                    )}
                  </div>
                )}
                {hasKeHoachColumn && isSupplyBatch && <label className="mt-2 flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={row.selected} onChange={(event) => updateRow(index, { selected: event.target.checked })} className="rounded" />Chọn dòng cấp phát</label>}
              </div>
              );
            })}
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú phiếu</label><textarea value={ghiChu} onChange={(event) => setGhiChu(event.target.value)} rows={2} placeholder="" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
          {isInboundPlanMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lý do chênh lệch (bắt buộc khi thực tế khác kế hoạch)</label>
              <textarea value={lyDoChenhLech} onChange={(e) => { setLyDoChenhLech(e.target.value); if (e.target.value.trim()) setLyDoChenhLechError(null); }} rows={2} placeholder="Nhập lý do nếu số lượng thực tế khác kế hoạch..." className={`w-full px-3 py-2 border rounded-lg text-sm ${lyDoChenhLechError ? 'border-red-300 focus:ring-red-400' : 'border-gray-300'}`} />
              {lyDoChenhLechError && <p className="text-xs text-red-600 mt-1">{lyDoChenhLechError}</p>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button><button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">{loading ? 'Đang xử lý...' : <><Check className="w-4 h-4" />Nhập kho {isSupplyBatch ? selectedRows.length : rows.length} dòng</>}</button></div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateWarehouseReceiptModal;
