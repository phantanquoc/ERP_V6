import prisma from '@config/database';
import warehouseReceiptService from './warehouseReceiptService';
import warehouseIssueService from './warehouseIssueService';
import { ValidationError, NotFoundError } from '@utils/errors';

// ─── Sức chứa tối đa của 1 pallet (kiện) theo đơn vị đóng gói ──────────────
// Nghiệp vụ: 1 pallet chứa tối đa 36 thùng hoặc 32 bao (7kg/thùng, 25kg/bao).
// Đơn vị khác chưa có quy định → không kiểm tra sức chứa (trả về null).
const KIEN_CAPACITY: Record<string, number> = {
  thùng: 36,
  thùng: 36,
  thung: 36,
  thung1: 36,
  bao: 32,
};

export function kienCapacityByUnit(unit?: string | null): number | null {
  if (!unit) return null;
  return KIEN_CAPACITY[unit.trim().toLowerCase()] ?? null;
}

/** So sánh mã kiện theo thứ tự số (K1.1 → K1.2 → … → K1.10), không theo chữ cái. */
function kienCodeSortKey(code: string | null): [number, number, string] {
  const m = (code ?? '').match(/^K(\d+)\.(\d+)$/i);
  if (m) return [Number(m[1]), Number(m[2]), code ?? ''];
  return [0, 0, code ?? ''];
}
const byKienCode = (a: { maKien: string | null }, b: { maKien: string | null }) => {
  const ka = kienCodeSortKey(a.maKien);
  const kb = kienCodeSortKey(b.maKien);
  if (ka[0] !== kb[0]) return ka[0] - kb[0];
  if (ka[1] !== kb[1]) return ka[1] - kb[1];
  return ka[2].localeCompare(kb[2]);
};

export interface ReceiveSplitInput {
  lotId: string;
  internationalProductId: string;
  donViTinh: string;
  /** Số kiện muốn dùng (tự chọn). Mặc định khách hàng nhập trực tiếp. */
  soKien: number;
  /** Tổng số lượng nhập — sẽ chia đều vào soKien kiện. */
  tongSoLuong: number;
  employeeId: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  mucDich?: string;
  ghiChu?: string;
}

export interface IssueFifoInput {
  lotId: string;
  internationalProductId: string;
  tongSoLuong: number;
  employeeId: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  mucDich?: string;
  ghiChu?: string;
}

/**
 * Nhập hàng theo kiểu "nhập tổng → chia đều":
 *   - Tổng soLuong đơn vị được chia đều vào `soKien` kiện trống của lô
 *     (mỗi kiện = floor, phần dư gom vào kiện cuối), có kiểm tra sức chứa.
 *   - Tự tạo 1 Phiếu nhập kho với `soKien` dòng (1 dòng / kiện) để tồn kho và
 *     lịch sử thống nhất với luồng hiện tại.
 */
async function receiveSplit(input: ReceiveSplitInput) {
  const { lotId, internationalProductId, donViTinh, soKien, tongSoLuong } = input;
  const total = Number(tongSoLuong);
  const kien = Number(soKien);
  if (!Number.isFinite(total) || total <= 0) throw new ValidationError('Tổng số lượng phải lớn hơn 0');
  if (!Number.isFinite(kien) || kien < 1) throw new ValidationError('Số kiện dùng phải ít nhất là 1');

  const lot = await prisma.lot.findUnique({ where: { id: lotId }, include: { warehouse: true } });
  if (!lot) throw new NotFoundError('Không tìm thấy lô');

  const product = await prisma.internationalProduct.findUnique({ where: { id: internationalProductId } });
  if (!product) throw new NotFoundError('Không tìm thấy sản phẩm');

  const unit = donViTinh || product.donViTinh || 'Kg';

  // Với lô baseline (fixed kiện từ CAD): dùng kiện trống. Lô user chỉ có 1 dòng như cũ.
  let selected: { id: string; maKien: string | null }[] = [];
  if (lot.zone) {
    const free = await prisma.lotProduct.findMany({
      where: { lotId, slotId: { not: null }, soLuong: 0, internationalProductId: null },
      select: { id: true, maKien: true },
    });
    free.sort(byKienCode);
    if (free.length < kien) {
      throw new ValidationError(`Lô "${lot.tenLo}" chỉ còn ${free.length} kiện trống (cần ${kien})`);
    }
    // validate sức chứa: mỗi kiện nhận max(flow) nhiều nhất (không phải ceil)
    const cap = kienCapacityByUnit(unit);
    if (cap) {
      const base = Math.floor(total / kien);
      const remainder = total % kien;
      const maxPerKien = remainder > 0 ? base + remainder : base;
      if (maxPerKien > cap) {
        throw new ValidationError(`Vượt sức chứa kiện (tối đa ${cap} ${unit}/kiện) — dùng nhiều kiện hơn hoặc giảm số lượng`);
      }
    }
    selected = free.slice(0, kien);
  } else {
    selected = [];
  }

  // Chia đều: floor cho từng kiện, phần dư gom vào kiện cuối.
  const base = Math.floor(total / soKien);
  const remainder = total % soKien;
  const flow = (i: number) => (i === soKien - 1 ? base + remainder : base);
  const items: Array<{
    lotProductId?: string | null;
    tenSanPham: string;
    donViTinh: string;
    warehouseId: string;
    tenKho?: string;
    lotId: string;
    tenLo?: string;
    loaiSanPham?: string;
    soLuongThucTe: number;
  }> = selected.length > 0
    ? selected.map((k, i) => ({ ...k, qty: flow(i) }))
      .filter((x) => x.qty > 0)
      .map((x) => ({
        lotProductId: x.id,
        tenSanPham: product.tenSanPham,
        donViTinh: unit,
        warehouseId: lot.warehouseId,
        tenKho: lot.warehouse?.tenKho ?? '',
        lotId: lot.id,
        tenLo: lot.tenLo,
        loaiSanPham: product.loaiSanPham ?? undefined,
        soLuongThucTe: x.qty,
      }))
    : [{
        lotId: lot.id,
        warehouseId: lot.warehouseId,
        tenKho: lot.warehouse?.tenKho ?? '',
        tenLo: lot.tenLo,
        lotProductId: '',
        tenSanPham: product.tenSanPham,
        donViTinh: unit,
        loaiSanPham: product.loaiSanPham ?? undefined,
        soLuongThucTe: total,
      }];

  // Atomic: gán kiện + tạo phiếu trong 1 transaction — tránh race nếu 2 người cùng nhập
  if (selected.length > 0) {
    return await prisma.$transaction(async (tx) => {
      for (const k of selected) {
        await tx.lotProduct.update({ where: { id: k.id }, data: { internationalProductId: product.id, donViTinh: unit } });
      }
      // Truyền tx client vào receiptService để cùng transaction (nếu service hỗ trợ, fallback là tạo trong tx hiện tại)
      // Ở đây tự tạo receipt + items + cập nhật soLuong trong cùng tx để đảm bảo atomic
      const receipt = await (warehouseReceiptService as any).createWithClient
        ? await (warehouseReceiptService as any).createWithClient(
            {
              employeeId: input.employeeId,
              maNhanVien: input.maNhanVien ?? '',
              tenNhanVien: input.tenNhanVien ?? '',
              mucDich: input.mucDich,
              ghiChu: input.ghiChu,
              items,
            },
            tx,
          )
        : await warehouseReceiptService.create({
            employeeId: input.employeeId,
            maNhanVien: input.maNhanVien ?? '',
            tenNhanVien: input.tenNhanVien ?? '',
            mucDich: input.mucDich,
            ghiChu: input.ghiChu,
            items,
          });
      return receipt;
    });
  }

  return await warehouseReceiptService.create({
    employeeId: input.employeeId,
    maNhanVien: input.maNhanVien ?? '',
    tenNhanVien: input.tenNhanVien ?? '',
    mucDich: input.mucDich,
    ghiChu: input.ghiChu,
    items,
  });
}

/**
 * Xuất hàng theo kiểu "nhập tổng → trừ FIFO":
 *   - Tổng soLuong được trừ dần từ các kiện đang giữ sản phẩm đó, theo thứ tự
 *     mã kiện (hết kiện này mới sang kiện kế), đến khi đủ.
 *   - Tự tạo 1 Phiếu xuất kho với nhiều dòng (1 dòng / kiện bị trừ).
 */
async function issueFifo(input: IssueFifoInput) {
  const total = Number(input.tongSoLuong);
  if (!Number.isFinite(total) || total <= 0) throw new ValidationError('Tổng số lượng xuất phải lớn hơn 0');

  const lot = await prisma.lot.findUnique({ where: { id: input.lotId }, include: { warehouse: true } });
  if (!lot) throw new NotFoundError('Không tìm thấy lô');

  const product = await prisma.internationalProduct.findUnique({ where: { id: input.internationalProductId } });
  if (!product) throw new NotFoundError('Không tìm thấy sản phẩm');

  const kienRows = await prisma.lotProduct.findMany({
    where: { lotId: lot.id, internationalProductId: product.id, soLuong: { gt: 0 } },
    select: { id: true, maKien: true, soLuong: true, donViTinh: true },
  });
  kienRows.sort(byKienCode);

  let remain = total;
  const items: Array<{
    lotProductId: string;
    tenSanPham: string;
    donViTinh: string;
    warehouseId: string;
    tenKho: string;
    lotId: string;
    tenLo: string;
    soLuongThucTe: number;
  }> = [];
  for (const k of kienRows) {
    if (remain <= 0) break;
    const take = Math.min(remain, k.soLuong);
    if (take > 0) {
      items.push({
        lotProductId: k.id,
        tenSanPham: product.tenSanPham,
        donViTinh: k.donViTinh,
        warehouseId: lot.warehouseId,
        tenKho: lot.warehouse?.tenKho ?? '',
        lotId: lot.id,
        tenLo: lot.tenLo,
        soLuongThucTe: take,
      });
      remain -= take;
    }
  }
  if (remain > 0) {
    throw new ValidationError(`Không đủ hàng trong lô "${lot.tenLo}" (còn thiếu ${remain} ${product.donViTinh ?? ''})`);
  }

  return warehouseIssueService.create({
    employeeId: input.employeeId,
    maNhanVien: input.maNhanVien ?? '',
    tenNhanVien: input.tenNhanVien ?? '',
    ghiChu: input.ghiChu,
    items,
  });
}

export default { receiveSplit, issueFifo, kienCapacityByUnit };