import { Prisma, RepairRequestStatus, FaultRecordStatus } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import ExcelJS from 'exceljs';
import { advanceRepairRequestStatus } from '@utils/statusTransitions';
import { NotificationEvent } from '@types';
import notificationService from './notificationService';
import logger from '@config/logger';

interface AcceptanceHandoverItemRequest {
  repairRequestItemId: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  ghiChu?: string;
}

interface CreateAcceptanceHandoverRequest {
  repairRequestId: number;
  maYeuCauSuaChua: string;
  tenHeThongThietBi: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  nguoiBanGiao: string;
  nguoiNhan: string;
  nguoiNhanId?: string;
  fileDinhKem?: string;
  ghiChu?: string;
  items?: AcceptanceHandoverItemRequest[];
  userId?: string;
  /** Role of the user performing the action — used for ADMIN bypass on status guard */
  actorRole?: string;
}

interface UpdateAcceptanceHandoverRequest {
  repairRequestId?: number;
  maYeuCauSuaChua?: string;
  tenHeThongThietBi?: string;
  tinhTrangTruocSuaChua?: string;
  tinhTrangSauSuaChua?: string;
  nguoiBanGiao?: string;
  nguoiNhan?: string;
  nguoiNhanId?: string;
  fileDinhKem?: string;
  ghiChu?: string;
  items?: AcceptanceHandoverItemRequest[];
  /** Role of the user performing the action — used for ADMIN bypass on status guard */
  actorRole?: string;
  actorId?: string;
}

const handoverInclude = {
  repairRequest: {
    include: {
      items: {
        include: {
          machineSystem: true,
          machineSystemDetail: true,
        },
      },
    },
  },
  items: {
    include: {
      repairRequestItem: true,
      machineSystem: true,
      machineSystemDetail: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.AcceptanceHandoverInclude;

class AcceptanceHandoverService {
  /**
   * Generate acceptance handover code
   * Format: NT-{SEQUENCE}
   * Example: NT-001, NT-002
   */
  async generateAcceptanceHandoverCode(): Promise<string> {
    const lastHandover = await prisma.acceptanceHandover.findFirst({
      where: {
        maNghiemThu: {
          startsWith: 'NT-',
        },
      },
      orderBy: {
        maNghiemThu: 'desc',
      },
    });

    let sequence = 1;
    if (lastHandover) {
      const lastCode = lastHandover.maNghiemThu;
      const sequenceStr = lastCode.replace('NT-', '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `NT-${String(sequence).padStart(3, '0')}`;
  }

  async getAllAcceptanceHandovers(page: number = 1, limit: number = 10, search?: string) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { maNghiemThu: { contains: search, mode: 'insensitive' } },
        { maYeuCauSuaChua: { contains: search, mode: 'insensitive' } },
        { tenHeThongThietBi: { contains: search, mode: 'insensitive' } },
        { nguoiBanGiao: { contains: search, mode: 'insensitive' } },
        { nguoiNhan: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [handovers, total] = await Promise.all([
      prisma.acceptanceHandover.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: handoverInclude,
      }),
      prisma.acceptanceHandover.count({ where }),
    ]);

    return {
      data: handovers,
      pagination: {
        page,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getAcceptanceHandoverById(id: string) {
    const handover = await prisma.acceptanceHandover.findUnique({
      where: { id },
      include: handoverInclude,
    });

    if (!handover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    return handover;
  }

  private async resolveHandoverItems(
    repairRequestId: number,
    items: AcceptanceHandoverItemRequest[] = [],
    tx: Prisma.TransactionClient,
  ) {
    if (items.length === 0) return [];

    const repairRequestItems = await tx.repairRequestItem.findMany({
      where: { id: { in: items.map((item) => item.repairRequestItemId) } },
      include: {
        machineSystem: true,
        machineSystemDetail: true,
      },
    });

    const itemById = new Map(repairRequestItems.map((item) => [item.id, item]));

    return items.map((item) => {
      const repairItem = itemById.get(item.repairRequestItemId);
      if (!repairItem) {
        throw new ValidationError('Hạng mục yêu cầu sửa chữa không hợp lệ');
      }
      if (repairItem.repairRequestId !== repairRequestId) {
        throw new ValidationError('Hạng mục nghiệm thu phải thuộc cùng yêu cầu sửa chữa');
      }

      return {
        repairRequestItemId: repairItem.id,
        machineSystemId: repairItem.machineSystemId,
        machineSystemDetailId: repairItem.machineSystemDetailId,
        tenHeThong: repairItem.tenHeThong,
        tenChiTiet: repairItem.machineSystemDetail?.tenChiTiet ?? null,
        tinhTrangTruocSuaChua: item.tinhTrangTruocSuaChua,
        tinhTrangSauSuaChua: item.tinhTrangSauSuaChua,
        ghiChu: item.ghiChu,
      };
    });
  }

  async createAcceptanceHandover(data: CreateAcceptanceHandoverRequest) {
    const maNghiemThu = await this.generateAcceptanceHandoverCode();
    const isAdmin = data.actorRole === 'ADMIN';

    const { handover, autoCompleted, repairRequestId: completedRepairId, maYeuCau: completedMaYeuCau } =
      await prisma.$transaction(async (tx) => {
        // 6.1 Load parent and guard status
        const repairRequest = await tx.repairRequest.findUnique({
          where: { id: data.repairRequestId },
          select: { id: true, maYeuCau: true, trangThai: true },
        });
        if (!repairRequest) throw new ValidationError('Yêu cầu sửa chữa không hợp lệ');

        if (repairRequest.trangThai !== RepairRequestStatus.DANG_SUA_CHUA && !isAdmin) {
          throw new ValidationError(
            `Chỉ có thể tạo nghiệm thu bàn giao khi yêu cầu sửa chữa đang ở trạng thái Đang sửa chữa`
          );
        }

        const resolvedItems = await this.resolveHandoverItems(data.repairRequestId, data.items, tx);
        const created = await tx.acceptanceHandover.create({
          data: {
            maNghiemThu,
            repairRequestId: repairRequest.id,
            maYeuCauSuaChua: data.maYeuCauSuaChua || repairRequest.maYeuCau,
            tenHeThongThietBi: data.tenHeThongThietBi,
            tinhTrangTruocSuaChua: data.tinhTrangTruocSuaChua,
            tinhTrangSauSuaChua: data.tinhTrangSauSuaChua,
            nguoiBanGiao: data.nguoiBanGiao,
            nguoiNhan: data.nguoiNhan,
            nguoiNhanId: data.nguoiNhanId,
            fileDinhKem: data.fileDinhKem,
            ghiChu: data.ghiChu,
            createdById: data.userId ?? null,
          },
        });

        if (resolvedItems.length > 0) {
          await tx.acceptanceHandoverItem.createMany({
            data: resolvedItems.map((item) => ({
              acceptanceHandoverId: created.id,
              ...item,
            })),
          });
        }

        // 6.2 Coverage computation: total items on parent vs covered across all handovers
        const total = await tx.repairRequestItem.count({
          where: { repairRequestId: data.repairRequestId },
        });

        let autoCompleted = false;
        if (total > 0 && repairRequest.trangThai === RepairRequestStatus.DANG_SUA_CHUA) {
          // Collect all distinct repairRequestItemIds covered across every handover of this parent
          // Filter to only items that have a repairRequestItemId (non-null)
          const allHandoverItems = await tx.acceptanceHandoverItem.findMany({
            where: {
              acceptanceHandover: { repairRequestId: data.repairRequestId },
            },
            select: { repairRequestItemId: true },
          });
          const coveredSet = new Set(allHandoverItems.map((i) => i.repairRequestItemId).filter(Boolean));
          const covered = coveredSet.size;

          // 6.3 Auto-complete when full coverage
          if (covered >= total) {
            const nextStatus = advanceRepairRequestStatus(
              repairRequest.trangThai,
              RepairRequestStatus.HOAN_THANH,
              { bypass: isAdmin }
            );
            await tx.repairRequest.update({
              where: { id: data.repairRequestId },
              data: { trangThai: nextStatus },
            });
            await tx.repairRequestStatusLog.create({
              data: {
                repairRequestId: data.repairRequestId,
                oldStatus: repairRequest.trangThai,
                newStatus: nextStatus,
                actorId: data.userId ?? null,
                actorRole: data.actorRole ?? null,
                reason: 'auto_complete_full_coverage',
              },
            });

            // 5.1–5.3 Cascade-close linked FaultRecords (D2: inside same transaction, per-item try/catch)
            const linkedItems = await tx.repairRequestItem.findMany({
              where: { repairRequestId: data.repairRequestId, faultRecordId: { not: null } },
              select: { faultRecordId: true },
            });

            for (const item of linkedItems) {
              if (!item.faultRecordId) continue;
              try {
                const fr = await tx.faultRecord.findUnique({
                  where: { id: item.faultRecordId },
                  select: { id: true, trangThai: true },
                });
                if (!fr || fr.trangThai === FaultRecordStatus.DA_XU_LY) continue;

                await tx.faultRecord.update({
                  where: { id: fr.id },
                  data: { trangThai: FaultRecordStatus.DA_XU_LY, ngayXuLy: new Date() },
                });
                await tx.faultRecordStatusLog.create({
                  data: {
                    faultRecordId: fr.id,
                    oldStatus: fr.trangThai,
                    newStatus: FaultRecordStatus.DA_XU_LY,
                    actorId: data.userId ?? null,
                    reason: `Tự động từ yêu cầu sửa chữa: ${repairRequest.maYeuCau}`,
                    source: 'auto_from_repair',
                  },
                });
              } catch (cascadeErr) {
                logger.error(`[AcceptanceHandoverService] cascade FaultRecord close failed for id=${item.faultRecordId}`, cascadeErr);
              }
            }

            autoCompleted = true;
          }
        }

        const handoverWithItems = await tx.acceptanceHandover.findUnique({
          where: { id: created.id },
          include: handoverInclude,
        });
        if (!handoverWithItems) throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');

        return {
          handover: handoverWithItems,
          autoCompleted,
          repairRequestId: repairRequest.id,
          maYeuCau: repairRequest.maYeuCau,
        };
      });

    // 6.4 Post-commit notifications (both wrapped in try/catch — errors must not bubble)
    notificationService.notify(NotificationEvent.ACCEPTANCE_HANDOVER_CREATED, {
      entityId: handover.id,
      metadata: { maNghiemThu: handover.maNghiemThu, maYeuCauSuaChua: handover.maYeuCauSuaChua },
    }).catch(() => {});

    if (autoCompleted) {
      notificationService.notify(NotificationEvent.REPAIR_REQUEST_COMPLETED, {
        entityId: String(completedRepairId),
        metadata: { maYeuCau: completedMaYeuCau },
      }).catch(() => {});
    }

    return handover;
  }

  async getGeneratedCode() {
    return this.generateAcceptanceHandoverCode();
  }

  async updateAcceptanceHandover(id: string, data: UpdateAcceptanceHandoverRequest) {
    const existingHandover = await prisma.acceptanceHandover.findUnique({
      where: { id },
      include: { repairRequest: { select: { id: true, trangThai: true, maYeuCau: true } } },
    });

    if (!existingHandover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    const isAdmin = data.actorRole === 'ADMIN';

    // 6.5 Guard: block edits when parent is HOAN_THANH, unless ADMIN
    if (existingHandover.repairRequest?.trangThai === RepairRequestStatus.HOAN_THANH && !isAdmin) {
      throw new ValidationError('Không thể chỉnh sửa nghiệm thu bàn giao khi yêu cầu sửa chữa đã hoàn thành');
    }

    const { items, actorRole: _actorRole, actorId, ...scalarData } = data;

    const handover = await prisma.$transaction(async (tx) => {
      const repairRequestId = scalarData.repairRequestId ?? existingHandover.repairRequestId;
      if (scalarData.repairRequestId) {
        const repairRequest = await tx.repairRequest.findUnique({
          where: { id: scalarData.repairRequestId },
          select: { id: true },
        });
        if (!repairRequest) throw new ValidationError('Yêu cầu sửa chữa không hợp lệ');
      }

      if (items !== undefined) {
        const resolvedItems = await this.resolveHandoverItems(repairRequestId, items, tx);
        await tx.acceptanceHandoverItem.deleteMany({ where: { acceptanceHandoverId: id } });
        if (resolvedItems.length > 0) {
          await tx.acceptanceHandoverItem.createMany({
            data: resolvedItems.map((item) => ({
              acceptanceHandoverId: id,
              ...item,
            })),
          });
        }
      }

      // ADMIN override audit log
      if (isAdmin && existingHandover.repairRequest?.trangThai === RepairRequestStatus.HOAN_THANH) {
        await tx.repairRequestStatusLog.create({
          data: {
            repairRequestId: existingHandover.repairRequestId,
            oldStatus: RepairRequestStatus.HOAN_THANH,
            newStatus: RepairRequestStatus.HOAN_THANH,
            actorId: actorId ?? null,
            actorRole: 'ADMIN',
            reason: 'admin_override:edit',
          },
        });
      }

      return tx.acceptanceHandover.update({
        where: { id },
        data: scalarData,
        include: handoverInclude,
      });
    });

    return handover;
  }

  async deleteAcceptanceHandover(id: string, actorRole?: string, actorId?: string) {
    const existingHandover = await prisma.acceptanceHandover.findUnique({
      where: { id },
      include: { repairRequest: { select: { id: true, trangThai: true, maYeuCau: true } } },
    });

    if (!existingHandover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    const isAdmin = actorRole === 'ADMIN';

    // 6.5 Guard: block deletes when parent is HOAN_THANH, unless ADMIN
    if (existingHandover.repairRequest?.trangThai === RepairRequestStatus.HOAN_THANH && !isAdmin) {
      throw new ValidationError('Không thể xóa nghiệm thu bàn giao khi yêu cầu sửa chữa đã hoàn thành');
    }

    await prisma.$transaction(async (tx) => {
      // ADMIN override audit log
      if (isAdmin && existingHandover.repairRequest?.trangThai === RepairRequestStatus.HOAN_THANH) {
        await tx.repairRequestStatusLog.create({
          data: {
            repairRequestId: existingHandover.repairRequestId,
            oldStatus: RepairRequestStatus.HOAN_THANH,
            newStatus: RepairRequestStatus.HOAN_THANH,
            actorId: actorId ?? null,
            actorRole: 'ADMIN',
            reason: 'admin_override:delete',
          },
        });
      }

      await tx.acceptanceHandover.delete({ where: { id } });
    });

    return { message: 'Xóa nghiệm thu bàn giao thành công' };
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { maNghiemThu: { contains: filters.search, mode: 'insensitive' } },
        { maYeuCauSuaChua: { contains: filters.search, mode: 'insensitive' } },
        { tenHeThongThietBi: { contains: filters.search, mode: 'insensitive' } },
        { nguoiBanGiao: { contains: filters.search, mode: 'insensitive' } },
        { nguoiNhan: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.acceptanceHandover.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách nghiệm thu bàn giao');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã nghiệm thu', key: 'maNghiemThu', width: 18 },
      { header: 'Mã yêu cầu sửa chữa', key: 'maYeuCauSuaChua', width: 22 },
      { header: 'Tên hệ thống/thiết bị', key: 'tenHeThongThietBi', width: 25 },
      { header: 'Tình trạng trước sửa chữa', key: 'tinhTrangTruocSuaChua', width: 25 },
      { header: 'Tình trạng sau sửa chữa', key: 'tinhTrangSauSuaChua', width: 25 },
      { header: 'Người bàn giao', key: 'nguoiBanGiao', width: 20 },
      { header: 'Người nhận', key: 'nguoiNhan', width: 20 },
      { header: 'Ghi chú', key: 'ghiChu', width: 25 },
      { header: 'Ngày tạo', key: 'createdAt', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        maNghiemThu: item.maNghiemThu,
        maYeuCauSuaChua: item.maYeuCauSuaChua,
        tenHeThongThietBi: item.tenHeThongThietBi,
        tinhTrangTruocSuaChua: item.tinhTrangTruocSuaChua,
        tinhTrangSauSuaChua: item.tinhTrangSauSuaChua,
        nguoiBanGiao: item.nguoiBanGiao,
        nguoiNhan: item.nguoiNhan,
        ghiChu: item.ghiChu || '',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new AcceptanceHandoverService();
