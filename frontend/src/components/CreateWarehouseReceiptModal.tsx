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
import { getApiErrorMessage, getApiFieldErrors } from '../utils/getApiError';
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
  /** Already-received qty per normalized name for the active PR — for cumulative guard + inline còn lại */
  const [alreadyByItem, setAlreadyByItem] = useState<Record<string, number>>({});
  /** Remaining qty per YCMH id — null = chưa tính, 0 = đã nhập đủ */
  const [remainingByPrId, setRemainingByPrId] = useState<Record<string, number | null>>({});
  const [remainingLoading, setRemainingLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

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
      bought[key] = (bought[key] ?? 0) + (Number((it as any).soLuongThucTe ?? (it as any).soLuong) || 0);
    }
    setPurchasedByItem(bought);
    setLyDoChenhLech((pr as any)?.lyDoChenhLech ?? '');
    setLyDoChenhLechError(null);
    setRows(
      (pr?.items ?? []).map((it) => {
        const kh = Number((it as any).soLuong) || 0;
        const tt = Number((it as any).soLuongThucTe ?? (it as any).soLuong) || 0;
        return {
          ...emptyRow(),
          tenSanPham: it.tenHangHoa,
          soLuong: tt,
          soLuongYeuCau: kh,
          warehouseKeHoach: '',
          lotKeHoach: '',
          donGiaKeHoach: (it as any).giaDuKien ?? null,
          soKienKeHoach: '',
          donViTinh: it.donViTinh || (supplyRequest?.items ?? []).find((i) => nameKeyOf(i.tenGoi) === nameKeyOf(it.tenHangHoa))?.donViTinh || '',
          phanLoai: (supplyRequest?.items ?? []).find((i) => nameKeyOf(i.tenGoi) === nameKeyOf(it.tenHangHoa))?.phanLoai || '',
          ghiChu: `Nhập kho theo ${pr?.maYeuCau ?? ''} - ${it.tenHangHoa}`,
        };
      }),
    );
  };

  /** Switching batch rebuilds the lines, so previously picked lots no longer apply. */
  const handlePurchasePrChange = (prId: string) => {
    setLinkedPurchaseRequestId(prId || null);
    applyPurchasePr(prId || null);
    if (prId) {
      warehouseReceiptService.getAllWarehouseReceipts({ purchaseRequestId: prId, limit: 100 } as any).then((res: any) => {
        const list: any[] = (res as any)?.data?.data ?? (res as any)?.data ?? [];
        const already: Record<string, number> = {};
        for (const r of list) {
          if ((r as any).isVoided) continue;
          for (const it of (r as any).items ?? []) {
            const k = nameKeyOf(it.tenSanPham);
            if (!k) continue;
            already[k] = (already[k] ?? 0) + Number(it.soLuongThucTe ?? 0);
          }
        }
        setAlreadyByItem(already);
      }).catch(() => setAlreadyByItem({}));
    } else setAlreadyByItem({});
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
      const prForPrefill = inboundPlan?.purchaseRequest as any;
      setLyDoChenhLech(prForPrefill?.lyDoChenhLech ?? '');
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
        // Populate purchasedByItem for InboundPlan too — so cumulative guard + inline còn lại work
        {
          const bought: Record<string, number> = {};
          for (const it of prItems) {
            const key = nameKeyOf((it as any).tenHangHoa);
            if (!key) continue;
            bought[key] = (bought[key] ?? 0) + (Number((it as any).soLuongThucTe ?? (it as any).soLuong) || 0);
          }
          setPurchasedByItem(bought);
        }
        // Fetch already for active PR so inline còn lại is populated
        if (pr?.id) {
          setRemainingLoading(true);
          warehouseReceiptService.getAllWarehouseReceipts({ purchaseRequestId: pr.id, limit: 100 } as any).then((res: any) => {
            if (cancelled) return;
            const list: any[] = (res as any)?.data?.data ?? (res as any)?.data ?? [];
            const already: Record<string, number> = {};
            for (const r of list) {
              if ((r as any).isVoided) continue;
              for (const it of (r as any).items ?? []) {
                const k = nameKeyOf(it.tenSanPham);
                if (!k) continue;
                already[k] = (already[k] ?? 0) + Number(it.soLuongThucTe ?? 0);
              }
            }
            if (!cancelled) {
              setAlreadyByItem(already);
              let rem = Infinity;
              for (const it of prItems) {
                const k = nameKeyOf((it as any).tenHangHoa);
                const bought = Number((it as any).soLuongThucTe ?? (it as any).soLuong ?? 0);
                rem = Math.min(rem, bought - (already[k] ?? 0));
              }
              if (!isFinite(rem)) rem = 0;
              setRemainingByPrId({ [pr.id]: Math.max(0, rem) });
              setRemainingLoading(false);
            }
          }).catch(() => { if (!cancelled) setRemainingLoading(false); });
        } else {
          setAlreadyByItem({});
          setRemainingByPrId({});
        }
        setLinkedPurchaseRequestId(pr?.id ?? null);
        const prefRows: ReceiptRow[] = prItems.map((it: any) => {
          const kh = Number(it.soLuong) || 0;
          const tt = Number(it.soLuongThucTe ?? it.soLuong) || 0;
          return {
            ...emptyRow(),
            tenSanPham: it.tenHangHoa,
            soLuong: tt,
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
      // Async: fetch remaining per PR to disable fully-received options
      if (completedPrs.length > 0) {
        setRemainingLoading(true);
        const nameKey = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
        Promise.all(completedPrs.map(async (pr) => {
          try {
            const res: any = await warehouseReceiptService.getAllWarehouseReceipts({ purchaseRequestId: pr.id, limit: 100 } as any);
            const list: any[] = res?.data?.data ?? res?.data ?? [];
            const already: Record<string, number> = {};
            for (const r of list) {
              if ((r as any).isVoided) continue;
              for (const it of (r as any).items ?? []) {
                const k = nameKey(it.tenSanPham);
                if (!k) continue;
                already[k] = (already[k] ?? 0) + Number(it.soLuongThucTe ?? 0);
              }
            }
            let remaining = Infinity;
            for (const it of (pr.items ?? [])) {
              const k = nameKey((it as any).tenHangHoa);
              const bought = Number((it as any).soLuongThucTe ?? (it as any).soLuong ?? 0);
              const got = already[k] ?? 0;
              remaining = Math.min(remaining, bought - got);
            }
            if (!isFinite(remaining)) remaining = 0;
            return { id: pr.id, remaining: Math.max(0, remaining) };
          } catch { return { id: pr.id, remaining: null as number | null }; }
        })).then((pairs) => {
          if (cancelled) return;
          const map: Record<string, number | null> = {};
          for (const p of pairs) map[p.id] = p.remaining;
          setRemainingByPrId(map);
          // Populate alreadyByItem for active PR (for cumulative guard + inline)
          {
            const activeId = linkedPurchaseRequestId ?? primary?.id;
            if (activeId) {
              const pr = completedPrs.find((x) => x.id === activeId);
              if (pr) {
                warehouseReceiptService.getAllWarehouseReceipts({ purchaseRequestId: pr.id, limit: 100 } as any).then((res: any) => {
                  if (cancelled) return;
                  const list: any[] = (res as any)?.data?.data ?? (res as any)?.data ?? [];
                  const already: Record<string, number> = {};
                  const nk = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
                  for (const r of list) {
                    if ((r as any).isVoided) continue;
                    for (const it of (r as any).items ?? []) {
                      const k = nk(it.tenSanPham);
                      if (!k) continue;
                      already[k] = (already[k] ?? 0) + Number(it.soLuongThucTe ?? 0);
                    }
                  }
                  if (!cancelled) setAlreadyByItem(already);
                }).catch(() => {});
              }
            }
          }
          setRemainingLoading(false);
        });
      } else {
        setRemainingByPrId({});
        setRemainingLoading(false);
      }
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
        // If selected PR is already fully received, keep it selected but submit will be blocked by BE guard
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
      setInlineError('Bạn không có quyền tạo phiếu nhập kho');
      return;
    }

    const submittedRows = isSupplyBatch ? selectedRows : rows;
    if (submittedRows.length === 0) {
      setInlineError('Vui lòng chọn ít nhất một hàng hóa');
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
      setInlineError(`Dòng ${rowNumber}: Vui lòng chọn kho, lô, hàng hóa/kiện, đơn vị tính và số lượng lớn hơn 0`);
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
      setInlineError(`Dòng ${rowNumber}: Kiện được chọn đang trống — hãy nhập/tên hàng hóa để gắn hàng hóa vào kiện`);
      return;
    }

    // Fully received YCMH — block client-side with clear message (BE also blocks)
    if (linkedPurchaseRequestId && remainingByPrId[linkedPurchaseRequestId] === 0) {
      setInlineError('Yêu cầu mua hàng này đã nhập đủ — không thể tạo thêm phiếu. Tạo YCMH mới nếu cần nhập thêm.');
      return;
    }

    if (hasKeHoachColumn) {
      const hasDiff = submittedRows.some((r) => {
        const kh = r.soLuongYeuCau;
        if (kh == null) return false;
        return Math.abs(Number(kh) - Number(r.soLuong)) > 1e-9;
      });
      if (hasDiff && !lyDoChenhLech.trim()) {
        setLyDoChenhLechError('Vui lòng nhập lý do chênh lệch khi thực tế khác kế hoạch.');
        return;
      }
      setLyDoChenhLechError(null);
    }

    // Client-side mirror of the backend reconciliation (cumulative: already + this slip > bought)
    if (linkedPurchaseRequestId && Object.keys(purchasedByItem).length > 0) {
      const receivedByItem: Record<string, { label: string; qty: number }> = {};
      for (const row of submittedRows) {
        const lotProduct = row.lotProducts.find((candidate) => candidate.id === row.lotProductId);
        const label = lotProduct?.internationalProduct?.tenSanPham || row.tenSanPham;
        const key = nameKeyOf(label);
        if (!key) continue;
        receivedByItem[key] = { label, qty: (receivedByItem[key]?.qty ?? 0) + (Number(row.soLuong) || 0) };
      }
      const problems: string[] = [];
      for (const [key, { label, qty }] of Object.entries(receivedByItem)) {
        const bought = purchasedByItem[key];
        const already = alreadyByItem[key] ?? 0;
        const remaining = bought !== undefined ? bought - already : undefined;
        if (bought === undefined) problems.push(`"${label}" không có trong yêu cầu mua hàng`);
        else if (already + qty - bought > 1e-9) {
          const over = (already + qty - bought).toFixed(2).replace(/\.00$/, '');
          const remStr = Math.max(0, remaining ?? 0).toFixed(2).replace(/\.00$/, '');
          problems.push(`"${label}": đã nhập ${already}, còn lại ${remStr} — bạn nhập ${qty} vượt ${over}`);
        }
      }
      if (problems.length > 0) {
        setInlineError(`Không khớp với yêu cầu mua hàng đã hoàn thành: ${problems.join('\n- ')}`);
        return;
      }
    }

    // Open confirm modal instead of calling API directly
    setConfirmOpen(true);
    return;
  };

  const doCreateReceipt = async () => {
    const submittedRows = isSupplyBatch ? selectedRows : rows;
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
            const tenLoResolved = (warehouses.find((w) => w.id === row.warehouseId)?.lots?.find((l) => l.id === (lp?.lotId ?? row.lotId))?.tenLo) ?? lot?.tenLo ?? '';
            const maKienResolved = lp?.maKien ?? '';
            return {
              lotProductId: kid,
              tenSanPham: lp?.internationalProduct?.tenSanPham || row.tenSanPham,
              warehouseId: row.warehouseId, tenKho: warehouse?.tenKho || '', lotId: lp?.lotId ?? row.lotId,
              tenLo: tenLoResolved, soLoKeHoach: tenLoResolved, soLoThucTe: tenLoResolved,
              soKienKeHoach: maKienResolved, soKienThucTe: maKienResolved,
              soLuongYeuCau: perKienKH[i], soLuongThucTe: perKien[i],
              donViTinh: lp?.donViTinh || row.donViTinh, ghiChu: row.ghiChu,
              tinhTrang: tinhTrangVal || undefined, quyCach: row.quyCach || undefined,
            };
          });
        }
        const lotProduct = row.lotProducts.find((candidate) => candidate.id === row.lotProductId);
        const tenLoResolved = lot?.tenLo ?? '';
        const singleMaKien = lotProduct?.maKien ?? (row.selectedKienIds[0] ? (row.lotProducts.find((p) => p.id === row.selectedKienIds[0])?.maKien ?? '') : '');
        return [{
          lotProductId: row.lotProductId || undefined,
          tenSanPham: lotProduct?.internationalProduct?.tenSanPham || row.tenSanPham,
          warehouseId: row.warehouseId, tenKho: warehouse?.tenKho || '', lotId: row.lotId,
          tenLo: tenLoResolved, soLoKeHoach: tenLoResolved, soLoThucTe: tenLoResolved,
          soKienKeHoach: singleMaKien, soKienThucTe: singleMaKien,
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
        lyDoChenhLech: lyDoChenhLech.trim() || undefined,
        nguoiDeNghi: nguoiDeNghi || undefined, maNguoiDeNghi: maNguoiDeNghi || undefined, boPhan: boPhan || undefined,
        items,
      });
      // success — parent list refreshes via invalidate, no alert needed
      onSuccess?.();
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: warehouseKeys.lotProducts() });
      onClose();
    } catch (error: any) {
      const msg = getApiErrorMessage(error, 'Lỗi khi tạo phiếu nhập kho');
      const errs = getApiFieldErrors(error);
      const detail = errs ? `\n${Object.entries(errs).map(([k,v])=>`• ${k}: ${v}`).join('\n')}` : '';
      setConfirmOpen(false);
      setInlineError(msg + detail);
      console.error('[CreateReceipt] validation errors', errs, (error as any)?.body ?? (error as any)?.response?.data);
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
          {inlineError && (
            <div className="flex items-start justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <span className="whitespace-pre-wrap flex-1">{inlineError}</span>
              <button type="button" onClick={() => setInlineError(null)} className="shrink-0 text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
            </div>
          )}
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
                {(completedPurchaseRequests ?? []).map((pr) => {
                  const rem = remainingByPrId[pr.id];
                  const isFull = rem !== null && rem !== undefined && rem <= 0;
                  return <option key={pr.id} value={pr.id} disabled={isFull}>{pr.maYeuCau} — {pr.items?.length ?? 0} dòng{rem !== null && rem !== undefined ? (isFull ? ' — đã nhập đủ ✓' : ` — còn ${rem}`) : ''}</option>;
                })}
              </select>
              <p className="mt-1 text-xs text-indigo-800">
                Yêu cầu này được mua thành {completedPurchaseRequests?.length} đợt đã hoàn thành — mỗi phiếu nhập tương ứng một yêu cầu mua hàng. Đổi đợt sẽ nạp lại danh sách dòng.
              </p>
              {remainingLoading && <p className="mt-1 text-xs text-gray-500">Đang kiểm tra số lượng đã nhập...</p>}
              {(() => {
                const allFull = completedPurchaseRequests.length > 0 && completedPurchaseRequests.every((pr) => remainingByPrId[pr.id] === 0);
                return allFull ? <p className="mt-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">Tất cả đợt đã nhập đủ — không thể tạo thêm phiếu cho yêu cầu này. Tạo YCMH mới nếu cần nhập thêm.</p> : null;
              })()}
            </div>
          )}
          {/* Single completed PR that is already fully received */}
          {completedPurchaseRequests.length === 1 && remainingByPrId[completedPurchaseRequests[0].id] === 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
              Yêu cầu mua hàng {completedPurchaseRequests[0].maYeuCau} đã nhập đủ — không thể tạo thêm phiếu. Tạo YCMH mới nếu cần nhập thêm.
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

                  {/* SL TT (editable) — Đã mua: vàng khi thu mua đổi soLuongThucTe khác KH */}
                  {(() => {
                    const bought = linkedPurchaseRequestId ? (purchasedByItem[nameKeyOf(row.tenSanPham)] ?? null) : null;
                    const already = alreadyByItem[nameKeyOf(row.tenSanPham)] ?? 0;
                    const remaining = bought !== null ? bought - already : null;
                    const over = remaining !== null && row.soLuong - remaining > 1e-9;
                    const isPurchasedDiff = linkedPurchaseRequestId !== null && row.soLuongYeuCau != null && Math.abs(Number(row.soLuongYeuCau) - Number(row.soLuong)) > 1e-9;
                    const borderCls = over ? 'border-red-400 bg-red-50' : isPurchasedDiff ? 'border-amber-400 bg-amber-50' : 'border-gray-300';
                    return (
                  <div className={hasKeHoachColumn ? 'col-span-4 sm:col-span-1 flex flex-col' : 'col-span-4 sm:col-span-1 flex flex-col'}>
                    <label className="block text-xs font-medium text-gray-600 min-h-[16px] h-4 leading-4 mb-1">SL TT <span className="text-red-500">*</span>{isPurchasedDiff && <span className="ml-1 inline-flex px-1 py-0 rounded bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">Đã mua đổi</span>}</label>
                    <input type="number" value={row.soLuong === 0 ? '' : row.soLuong} onChange={(event) => handleTotalChange(index, parseNumberInput(event.target.value))} min="0.01" step="0.01" required disabled={isSupplyBatch && !row.selected} title={isPurchasedDiff ? `Thu mua đổi: KH ${row.soLuongYeuCau} → đã mua ${row.soLuong}` : undefined} className={`w-full h-[32px] px-2 py-1.5 border rounded text-sm bg-white disabled:bg-gray-100 text-center ${borderCls}`} />
                    <div className="mt-1 min-h-[16px] text-[11px] leading-none">
                      {remaining !== null ? (
                        over ? <span className="text-red-600 font-medium">Còn lại {remaining} — vượt {(row.soLuong - remaining).toFixed(2).replace(/\.00$/,'')}</span>
                        : isPurchasedDiff ? <span className="text-amber-700">KH {row.soLuongYeuCau} → đã mua {bought} · Còn lại {remaining}</span>
                        : <span className="text-gray-500">Còn lại {remaining} / đã mua {bought}</span>
                      ) : null}
                    </div>
                  </div>
                    );})()}
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
          {hasKeHoachColumn && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lý do chênh lệch (bắt buộc khi thực tế khác kế hoạch)</label>
              <textarea value={lyDoChenhLech} onChange={(e) => { setLyDoChenhLech(e.target.value); if (e.target.value.trim()) setLyDoChenhLechError(null); }} rows={2} placeholder="Nhập lý do nếu số lượng thực tế khác kế hoạch..." className={`w-full px-3 py-2 border rounded-lg text-sm ${lyDoChenhLechError ? 'border-red-300 focus:ring-red-400' : 'border-gray-300'}`} />
              {lyDoChenhLechError && <p className="text-xs text-red-600 mt-1">{lyDoChenhLechError}</p>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button><button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">{loading ? 'Đang xử lý...' : <><Check className="w-4 h-4" />Nhập kho {isSupplyBatch ? selectedRows.length : rows.length} dòng</>}</button></div>
        </form>
      </div>
      {/* Confirm modal — đối chiếu YCMH trước khi gọi API */}
      {confirmOpen && (() => {
        const cRows = isSupplyBatch ? selectedRows : rows;
        const prCode = inboundPlan?.purchaseRequest?.maYeuCau ?? (supplyRequest?.purchaseRequests ?? []).find(p=>p.id===linkedPurchaseRequestId)?.maYeuCau ?? '—';
        const hasOver = linkedPurchaseRequestId ? cRows.some(r => {
          const b = purchasedByItem[nameKeyOf(r.tenSanPham)];
          if (b === undefined) return true;
          const a = alreadyByItem[nameKeyOf(r.tenSanPham)] ?? 0;
          return a + Number(r.soLuong) - b > 1e-9;
        }) : false;
        return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={()=>!loading && setConfirmOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[900px] max-h-[85vh] flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
              <h3 className="font-bold text-gray-900">Xác nhận nhập kho — đối chiếu thu mua</h3>
              <button type="button" onClick={()=> setConfirmOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-5 py-3 overflow-y-auto space-y-3 flex-1">
              <div className="flex flex-wrap gap-3 text-xs bg-blue-50 border border-blue-200 rounded-lg p-3">
                <span><span className="text-gray-500">YCMH:</span> <strong className="text-blue-700">{prCode}</strong></span>
                {inboundPlan && <span><span className="text-gray-500">KH:</span> <strong>{inboundPlan.maKeHoach}</strong></span>}
                <span><span className="text-gray-500">Kho:</span> <strong>{cRows[0]?.warehouseId ? (warehouses.find(w=>w.id===cRows[0].warehouseId)?.tenKho ?? cRows[0].warehouseId) : '—'}</strong></span>
                <span><span className="text-gray-500">Tổng dòng:</span> <strong>{cRows.length}</strong></span>
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr><th className="px-2 py-1.5 text-left">#</th><th className="px-2 py-1.5 text-left">Hàng hóa</th><th className="px-2 py-1.5 text-center">ĐVT</th><th className="px-2 py-1.5 text-right">Đã mua</th><th className="px-2 py-1.5 text-right">Đã nhập</th><th className="px-2 py-1.5 text-right">Còn lại</th><th className="px-2 py-1.5 text-right">Sẽ nhập</th><th className="px-2 py-1.5 text-center">Lệch</th></tr>
                  </thead>
                  <tbody>
                    {cRows.map((r, i) => {
                      const key = nameKeyOf(r.tenSanPham);
                      const bought = linkedPurchaseRequestId ? (purchasedByItem[key] ?? null) : null;
                      const already = alreadyByItem[key] ?? 0;
                      const remaining = bought !== null ? bought - already : null;
                      const qty = Number(r.soLuong) || 0;
                      const over = remaining !== null && qty - remaining > 1e-9;
                      const under = remaining !== null && remaining - qty > 1e-9;
                      const isDiff = r.soLuongYeuCau != null && Math.abs(Number(r.soLuongYeuCau) - Number(r.soLuong)) > 1e-9;
                      const boughtDisp = isDiff ? qty : bought;
                      return (
                        <tr key={i} className={`border-t ${over ? 'bg-red-50' : isDiff ? 'bg-amber-50' : ''}`}>
                          <td className="px-2 py-1.5">{i+1}</td>
                          <td className="px-2 py-1.5 font-medium">{r.tenSanPham || '—'}{isDiff && <span className="ml-1 text-[10px] px-1 py-0 rounded bg-amber-100 text-amber-700 border border-amber-200">KH {r.soLuongYeuCau}→{qty}</span>}</td>
                          <td className="px-2 py-1.5 text-center">{r.donViTinh || '—'}</td>
                          <td className={`px-2 py-1.5 text-right ${isDiff ? 'bg-amber-50 font-semibold text-amber-800' : ''}`}>{bought !== null ? boughtDisp : '—'}</td>
                          <td className="px-2 py-1.5 text-right">{bought !== null ? already : '—'}</td>
                          <td className={`px-2 py-1.5 text-right font-semibold ${over ? 'text-red-600' : ''}`}>{remaining !== null ? Math.max(0, remaining) : '—'}</td>
                          <td className={`px-2 py-1.5 text-right font-semibold ${over ? 'text-red-600' : ''}`}>{qty}</td>
                          <td className="px-2 py-1.5 text-center">
                            {bought === null ? <span className="text-gray-400">—</span>
                              : over ? <span className="inline-flex px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Vượt {(qty - (remaining ?? 0)).toFixed(2).replace(/\.00$/,'')}</span>
                              : under ? <span className="inline-flex px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Thiếu {((remaining ?? 0)-qty).toFixed(2).replace(/\.00$/,'')}</span>
                              : <span className="inline-flex px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Khớp</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {hasOver && <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">Có dòng vượt số còn lại — hãy quay lại sửa số lượng (giảm về ≤ còn lại) hoặc tạo YCMH bổ sung trước khi xác nhận.</div>}
              {hasKeHoachColumn && (() => {
                const hasDiff = cRows.some(r => r.soLuongYeuCau != null && Math.abs(Number(r.soLuongYeuCau)-Number(r.soLuong)) > 1e-9);
                return hasDiff && !lyDoChenhLech.trim() ? <div className="text-xs text-red-600">Thiếu lý do chênh lệch KH/TT — quay lại nhập lý do.</div> : null;
              })()}
              {lyDoChenhLech.trim() && <div className="text-xs bg-gray-50 border rounded p-2"><span className="text-gray-500">Lý do chênh lệch:</span> {lyDoChenhLech}</div>}
              {ghiChu.trim() && <div className="text-xs bg-gray-50 border rounded p-2"><span className="text-gray-500">Ghi chú:</span> {ghiChu}</div>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50 rounded-b-lg shrink-0">
              <button type="button" onClick={()=> setConfirmOpen(false)} disabled={loading} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50">Quay lại sửa</button>
              <button type="button" onClick={doCreateReceipt} disabled={loading || hasOver} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">{loading ? 'Đang tạo...' : <><Check className="w-4 h-4" />Xác nhận nhập</>}</button>
            </div>
          </div>
        </div>
        );
      })()}
    </Modal>
  );
};

export default CreateWarehouseReceiptModal;
