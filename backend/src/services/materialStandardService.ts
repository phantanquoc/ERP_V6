import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import { nextStaticCode, staticCodeWhere } from '@utils/codeGenerator';
import type { PaginatedResponse } from '@types';

/** Include chuẩn cho MaterialStandard — cần internationalProduct để suy loaiDinhMuc và hiển thị loaiSanPham ở UI. */
const MATERIAL_STANDARD_INCLUDE = {
  items: { include: { internationalProduct: { select: { id: true, tenSanPham: true, loaiSanPham: true } } } },
  inputItems: { include: { internationalProduct: { select: { id: true, tenSanPham: true, loaiSanPham: true } } } },
} as const;

/** Item đầu vào/đầu ra kèm sản phẩm đã link — chỉ cần tiLe và loaiSanPham để suy loại định mức. */
type DerivableItem = {
  tiLe: number;
  internationalProduct?: { loaiSanPham: string | null } | null;
};

/**
 * Gom loaiSanPham phân biệt của một phía, sắp theo tiLe giảm dần.
 * Item chưa link sản phẩm hoặc sản phẩm không có loaiSanPham bị bỏ qua.
 */
function distinctTypesByShare(items: DerivableItem[]): string[] {
  const shareByType = new Map<string, number>();
  for (const it of items) {
    const loai = it.internationalProduct?.loaiSanPham;
    if (!loai) continue;
    shareByType.set(loai, (shareByType.get(loai) ?? 0) + (it.tiLe ?? 0));
  }
  return [...shareByType.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([loai]) => loai);
}

/**
 * Sinh nhãn loại định mức dạng "<loại đầu vào> → <loại đầu ra>".
 *
 * Trả null khi một phía không có item nào — định mức chưa đủ thông tin để phân loại.
 * Phía có item nhưng không item nào link được sản phẩm hiện "Chưa xác định", để phân
 * biệt với trường hợp chưa nhập item.
 */
export function deriveMaterialStandardType(
  inputItems: DerivableItem[],
  outputItems: DerivableItem[]
): string | null {
  if (inputItems.length === 0 || outputItems.length === 0) return null;

  const label = (items: DerivableItem[]): string => {
    const types = distinctTypesByShare(items);
    return types.length > 0 ? types.join(' + ') : 'Chưa xác định';
  };

  return `${label(inputItems)} → ${label(outputItems)}`;
}

export class MaterialStandardService {
  async generateMaterialStandardCode(): Promise<string> {
    const last = await prisma.materialStandard.findFirst({
      where: { maDinhMuc: staticCodeWhere('DM') },
      orderBy: { maDinhMuc: 'desc' },
      select: { maDinhMuc: true },
    });
    return nextStaticCode(last?.maDinhMuc ?? null, 'DM');
  }

  async getAllMaterialStandards(page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    const [standards, total] = await Promise.all([
      prisma.materialStandard.findMany({
        skip,
        take: limit,
        include: MATERIAL_STANDARD_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.materialStandard.count(),
    ]);

    return {
      data: standards,
      total,
      page,
      limit,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  async getMaterialStandardById(id: string): Promise<any> {
    const standard = await prisma.materialStandard.findUnique({
      where: { id },
      include: MATERIAL_STANDARD_INCLUDE,
    });

    if (!standard) {
      throw new NotFoundError('Material standard not found');
    }

    return standard;
  }

  async createMaterialStandard(data: any): Promise<any> {
    const standard = await prisma.materialStandard.create({
      data: {
        maDinhMuc: data.maDinhMuc,
        tenDinhMuc: data.tenDinhMuc,
        kgNguyenLieuTren1KgThanhPham: data.kgNguyenLieuTren1KgThanhPham
          ? parseFloat(data.kgNguyenLieuTren1KgThanhPham)
          : undefined,
        ghiChu: data.ghiChu,
        items: data.items ? {
          create: data.items.map((item: any) => ({
            tenThanhPham: item.tenThanhPham,
            tiLe: parseFloat(item.tiLe),
            internationalProductId: item.internationalProductId || null,
          })),
        } : undefined,
        inputItems: data.inputItems ? {
          create: data.inputItems.map((item: any) => ({
            tenNguyenLieu: item.tenNguyenLieu,
            tiLe: parseFloat(item.tiLe) || 0,
            internationalProductId: item.internationalProductId || null,
          })),
        } : undefined,
      },
      include: MATERIAL_STANDARD_INCLUDE,
    });

    // loaiDinhMuc sinh từ loaiSanPham của item vừa tạo, nên phải tính sau khi có bản ghi
    return this.refreshDerivedType(standard);
  }

  /**
   * Tính lại loaiDinhMuc từ item hiện tại và ghi vào cột cache.
   * Trả về bản ghi đã cập nhật để caller dùng luôn.
   */
  private async refreshDerivedType(standard: any): Promise<any> {
    const derived = deriveMaterialStandardType(standard.inputItems ?? [], standard.items ?? []);
    if (derived === standard.loaiDinhMuc) return standard;

    return prisma.materialStandard.update({
      where: { id: standard.id },
      data: { loaiDinhMuc: derived },
      include: MATERIAL_STANDARD_INCLUDE,
    });
  }

  async updateMaterialStandard(id: string, data: any): Promise<any> {
    const standard = await prisma.materialStandard.findUnique({
      where: { id },
      include: MATERIAL_STANDARD_INCLUDE,
    });

    if (!standard) {
      throw new NotFoundError('Material standard not found');
    }

    // Delete existing items if new items are provided
    if (data.items) {
      await prisma.materialStandardItem.deleteMany({
        where: { materialStandardId: id },
      });
    }

    if (data.inputItems) {
      await prisma.materialStandardInputItem.deleteMany({
        where: { materialStandardId: id },
      });
    }

    const updated = await prisma.materialStandard.update({
      where: { id },
      data: {
        ...(data.tenDinhMuc && { tenDinhMuc: data.tenDinhMuc }),
        ...(data.kgNguyenLieuTren1KgThanhPham !== undefined && {
          kgNguyenLieuTren1KgThanhPham: data.kgNguyenLieuTren1KgThanhPham
            ? parseFloat(data.kgNguyenLieuTren1KgThanhPham)
            : null,
        }),
        ...(data.ghiChu !== undefined && { ghiChu: data.ghiChu }),
        ...(data.items && {
          items: {
            create: data.items.map((item: any) => ({
              tenThanhPham: item.tenThanhPham,
              tiLe: parseFloat(item.tiLe),
              internationalProductId: item.internationalProductId || null,
            })),
          },
        }),
        ...(data.inputItems && {
          inputItems: {
            create: data.inputItems.map((item: any) => ({
              tenNguyenLieu: item.tenNguyenLieu,
              tiLe: parseFloat(item.tiLe) || 0,
              internationalProductId: item.internationalProductId || null,
            })),
          },
        }),
      },
      include: MATERIAL_STANDARD_INCLUDE,
    });

    // items/inputItems may have changed even when caller didn't touch loaiDinhMuc directly
    return this.refreshDerivedType(updated);
  }

  async deleteMaterialStandard(id: string): Promise<void> {
    const standard = await prisma.materialStandard.findUnique({ where: { id } });

    if (!standard) {
      throw new NotFoundError('Material standard not found');
    }

    await prisma.materialStandard.delete({ where: { id } });
  }
}

export default new MaterialStandardService();

