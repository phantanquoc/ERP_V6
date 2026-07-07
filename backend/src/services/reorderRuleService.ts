import prisma from '@config/database';
import { NotFoundError, ValidationError, ConflictError } from '@utils/errors';
import { getPaginationParams } from '@utils/helpers';
import notificationService from './notificationService';
import { NotificationEvent } from '@types';

interface CreateReorderRuleInput {
  internationalProductId: string;
  minStock: number;
  reorderQty: number;
  preferredSupplierId?: string;
  active?: boolean;
  cooldownHours?: number;
}

interface UpdateReorderRuleInput {
  minStock?: number;
  reorderQty?: number;
  preferredSupplierId?: string | null;
  active?: boolean;
  cooldownHours?: number;
}

class ReorderRuleService {
  async getAllRules(page: number = 1, limit: number = 20, search?: string, activeOnly?: boolean) {
    const { skip } = getPaginationParams(page, limit);

    const where: any = {};
    if (activeOnly) {
      where.active = true;
    }
    if (search) {
      where.internationalProduct = {
        OR: [
          { tenSanPham: { contains: search, mode: 'insensitive' as const } },
          { maSanPham: { contains: search, mode: 'insensitive' as const } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      prisma.productReorderRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          internationalProduct: {
            select: { id: true, maSanPham: true, tenSanPham: true, donViTinh: true },
          },
        },
      }),
      prisma.productReorderRule.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRuleById(id: string) {
    const rule = await prisma.productReorderRule.findUnique({
      where: { id },
      include: {
        internationalProduct: {
          select: { id: true, maSanPham: true, tenSanPham: true, donViTinh: true },
        },
      },
    });
    if (!rule) {
      throw new NotFoundError('Không tìm thấy quy tắc bổ sung hàng');
    }
    return rule;
  }

  async getRuleByProductId(internationalProductId: string) {
    return prisma.productReorderRule.findUnique({
      where: { internationalProductId },
      include: {
        internationalProduct: {
          select: { id: true, maSanPham: true, tenSanPham: true, donViTinh: true },
        },
      },
    });
  }

  async createRule(input: CreateReorderRuleInput) {
    if (!input.internationalProductId) {
      throw new ValidationError('Thiếu mã sản phẩm');
    }
    if (input.minStock < 0 || input.reorderQty < 0) {
      throw new ValidationError('Giá trị tồn kho tối thiểu và số lượng đặt lại phải lớn hơn hoặc bằng 0');
    }

    const product = await prisma.internationalProduct.findUnique({
      where: { id: input.internationalProductId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundError('Không tìm thấy sản phẩm');
    }

    const existing = await prisma.productReorderRule.findUnique({
      where: { internationalProductId: input.internationalProductId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError('Sản phẩm này đã có quy tắc bổ sung hàng');
    }

    return prisma.productReorderRule.create({
      data: {
        internationalProductId: input.internationalProductId,
        minStock: input.minStock,
        reorderQty: input.reorderQty,
        preferredSupplierId: input.preferredSupplierId || null,
        active: input.active ?? true,
        cooldownHours: input.cooldownHours ?? 24,
      },
      include: {
        internationalProduct: {
          select: { id: true, maSanPham: true, tenSanPham: true, donViTinh: true },
        },
      },
    });
  }

  async updateRule(id: string, input: UpdateReorderRuleInput) {
    const existing = await prisma.productReorderRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy quy tắc bổ sung hàng');
    }
    if (input.minStock !== undefined && input.minStock < 0) {
      throw new ValidationError('Tồn kho tối thiểu phải lớn hơn hoặc bằng 0');
    }
    if (input.reorderQty !== undefined && input.reorderQty < 0) {
      throw new ValidationError('Số lượng đặt lại phải lớn hơn hoặc bằng 0');
    }

    return prisma.productReorderRule.update({
      where: { id },
      data: {
        ...(input.minStock !== undefined ? { minStock: input.minStock } : {}),
        ...(input.reorderQty !== undefined ? { reorderQty: input.reorderQty } : {}),
        ...(input.preferredSupplierId !== undefined
          ? { preferredSupplierId: input.preferredSupplierId || null }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.cooldownHours !== undefined ? { cooldownHours: input.cooldownHours } : {}),
      },
      include: {
        internationalProduct: {
          select: { id: true, maSanPham: true, tenSanPham: true, donViTinh: true },
        },
      },
    });
  }

  async deleteRule(id: string) {
    const existing = await prisma.productReorderRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy quy tắc bổ sung hàng');
    }
    await prisma.productReorderRule.delete({ where: { id } });
    return { message: 'Đã xóa quy tắc bổ sung hàng' };
  }

  /**
   * Compute total on-hand stock for an international product across all warehouses/lots.
   */
  private async getTotalStock(internationalProductId: string): Promise<number> {
    const agg = await prisma.lotProduct.aggregate({
      where: { internationalProductId },
      _sum: { soLuong: true },
    });
    return agg._sum.soLuong ?? 0;
  }

  /**
   * Called after any warehouse issue on a product.
   * If active reorder rule exists and stock has crossed the minStock threshold, notify + optionally auto-create a purchase request.
   * Cooldown protects against duplicate alerts within `cooldownHours`.
   * Never throws — logs errors and swallows them so the caller (issue creation) does not fail.
   */
  async checkAndNotify(internationalProductId: string): Promise<void> {
    try {
      const rule = await prisma.productReorderRule.findUnique({
        where: { internationalProductId },
        include: {
          internationalProduct: {
            select: { id: true, maSanPham: true, tenSanPham: true, donViTinh: true },
          },
        },
      });

      if (!rule || !rule.active) {
        return;
      }

      const currentStock = await this.getTotalStock(internationalProductId);
      if (currentStock > rule.minStock) {
        return;
      }

      // Cooldown check
      if (rule.lastAlertedAt && rule.cooldownHours > 0) {
        const cooldownMs = rule.cooldownHours * 60 * 60 * 1000;
        const elapsed = Date.now() - rule.lastAlertedAt.getTime();
        if (elapsed < cooldownMs) {
          return;
        }
      }

      // Update lastAlertedAt first (idempotency guard for concurrent issues)
      await prisma.productReorderRule.update({
        where: { id: rule.id },
        data: { lastAlertedAt: new Date() },
      });

      const productName = rule.internationalProduct?.tenSanPham ?? 'Sản phẩm';
      const productCode = rule.internationalProduct?.maSanPham ?? '';
      const donViTinh = rule.internationalProduct?.donViTinh ?? '';

      // Fire notification
      try {
        await notificationService.notify(NotificationEvent.LOW_STOCK_ALERT, {
          entityId: rule.id,
          metadata: {
            productId: rule.internationalProductId,
            productName,
            productCode,
            currentStock,
            minStock: rule.minStock,
            reorderQty: rule.reorderQty,
            donViTinh,
          },
        });
      } catch (notifErr) {
        console.error('Error sending LOW_STOCK_ALERT notification:', notifErr);
      }

      // Optionally auto-create a purchase request (sourceType='REORDER') if reorderQty > 0
      if (rule.reorderQty > 0) {
        try {
          const { default: purchaseRequestService } = await import('./purchaseRequestService');

          // Find a system employee to attribute the PR to (first ADMIN)
          const systemEmployee = await prisma.employee.findFirst({
            where: { user: { role: 'ADMIN' } },
            select: {
              id: true,
              employeeCode: true,
              user: { select: { firstName: true, lastName: true } },
            },
          });

          if (!systemEmployee) {
            console.warn('No ADMIN employee available to attribute auto-reorder PR');
            return;
          }

          const fullName = [systemEmployee.user?.firstName, systemEmployee.user?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Hệ thống';

          await purchaseRequestService.createPurchaseRequest({
            employeeId: systemEmployee.id,
            maNhanVien: systemEmployee.employeeCode ?? '',
            tenNhanVien: fullName,
            mucDichYeuCau: `Tự động bổ sung tồn kho: ${productName} (tồn: ${currentStock} ${donViTinh}, tối thiểu: ${rule.minStock})`,
            mucDoUuTien: 'Cao',
            ghiChu: `Được tạo tự động bởi quy tắc bổ sung hàng`,
            nhaCungCapId: rule.preferredSupplierId ?? undefined,
            sourceType: 'REORDER',
            items: [
              {
                phanLoai: 'Nguyên liệu',
                tenHangHoa: productName,
                soLuong: rule.reorderQty,
                donViTinh,
                nhaCungCapId: rule.preferredSupplierId ?? undefined,
              },
            ],
          });
        } catch (prErr) {
          console.error('Error auto-creating reorder purchase request:', prErr);
        }
      }
    } catch (err) {
      console.error('Error in reorderRuleService.checkAndNotify:', err);
    }
  }
}

export default new ReorderRuleService();
