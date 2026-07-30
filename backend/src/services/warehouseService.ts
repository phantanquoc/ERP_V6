import prisma from '@config/database';
import { NotFoundError, ConflictError } from '@utils/errors';

interface CreateWarehouseInput {
  tenKho: string;
  maKho?: string;
  loaiKho?: string;
  diaChi?: string;
  dienTich?: number | string | null;
  sucChua?: number | string | null;
  nguoiQuanLy?: string;
  soDienThoai?: string;
  trangThai?: string;
  ghiChu?: string;
}

interface UpdateWarehouseInput {
  maKho?: string;
  tenKho?: string;
  loaiKho?: string;
  diaChi?: string;
  dienTich?: number | string | null;
  sucChua?: number | string | null;
  nguoiQuanLy?: string;
  soDienThoai?: string;
  trangThai?: string;
  ghiChu?: string;
  [key: string]: unknown;
}

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

class WarehouseService {
  async getAll() {
    return prisma.warehouses.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        lots: {
          include: {
            lotProducts: {
              select: {
                id: true,
                soLuong: true,
                donViTinh: true,
                giaThanh: true,
                internationalProductId: true,
                internationalProduct: { select: { id: true, tenSanPham: true, maSanPham: true } },
              },
            },
          },
        },
      },
    });
  }

  async generateCode(): Promise<string> {
    const lastWarehouse = await prisma.warehouses.findFirst({ orderBy: { maKho: 'desc' } });
    if (lastWarehouse?.maKho) {
      const lastNumber = parseInt(lastWarehouse.maKho.replace('KHO', ''));
      return `KHO${String(lastNumber + 1).padStart(3, '0')}`;
    }
    return 'KHO001';
  }

  async create(input: CreateWarehouseInput) {
    const { tenKho, maKho, loaiKho, diaChi, dienTich, sucChua, nguoiQuanLy, soDienThoai, trangThai, ghiChu } = input;
    const warehouseCode = maKho || await this.generateCode();
    return prisma.warehouses.create({
      data: {
        id: warehouseCode,
        maKho: warehouseCode,
        tenKho,
        loaiKho: loaiKho || null,
        diaChi: diaChi || null,
        dienTich: coerceNumber(dienTich),
        sucChua: coerceNumber(sucChua),
        nguoiQuanLy: nguoiQuanLy || null,
        soDienThoai: soDienThoai || null,
        trangThai: trangThai || 'active',
        ghiChu: ghiChu || null,
        updatedAt: new Date(),
      },
    });
  }

  async update(id: string, data: UpdateWarehouseInput) {
    const existing = await prisma.warehouses.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy kho');
    }

    // Strip id — never updatable (it's the primary key)
    const { id: _id, ...rest } = data as Record<string, unknown>;

    // Build partial update payload from provided fields only
    const updateData: Record<string, unknown> = {};

    // maKho is now updatable — check uniqueness
    if ('maKho' in rest && rest.maKho !== undefined) {
      const maKhoStr = String(rest.maKho || '').trim();
      if (maKhoStr && maKhoStr !== existing.maKho) {
        const duplicate = await prisma.warehouses.findFirst({ where: { maKho: maKhoStr } });
        if (duplicate) {
          throw new ConflictError('Mã kho đã tồn tại');
        }
        updateData.maKho = maKhoStr;
      }
    }

    if ('tenKho' in rest && rest.tenKho !== undefined) updateData.tenKho = rest.tenKho;
    if ('loaiKho' in rest && rest.loaiKho !== undefined) updateData.loaiKho = rest.loaiKho || null;
    if ('diaChi' in rest && rest.diaChi !== undefined) updateData.diaChi = rest.diaChi || null;
    if ('dienTich' in rest) updateData.dienTich = coerceNumber(rest.dienTich);
    if ('sucChua' in rest) updateData.sucChua = coerceNumber(rest.sucChua);
    if ('nguoiQuanLy' in rest && rest.nguoiQuanLy !== undefined) updateData.nguoiQuanLy = rest.nguoiQuanLy || null;
    if ('soDienThoai' in rest && rest.soDienThoai !== undefined) updateData.soDienThoai = rest.soDienThoai || null;
    if ('trangThai' in rest && rest.trangThai !== undefined) updateData.trangThai = rest.trangThai;
    if ('ghiChu' in rest && rest.ghiChu !== undefined) updateData.ghiChu = rest.ghiChu || null;

    updateData.updatedAt = new Date();

    return prisma.warehouses.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    await prisma.warehouses.delete({ where: { id } });
  }
}

export default new WarehouseService();
