import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';
import { NotificationEvent } from '@types';
import notificationService from '@services/notificationService';

interface SupplyRequestItemInput {
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
}

interface CreateSupplyRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  items: SupplyRequestItemInput[];
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  loaiYeuCau?: string;
  soTien?: number;
}

interface UpdateSupplyRequestRequest {
  items?: SupplyRequestItemInput[];
  mucDichYeuCau?: string;
  mucDoUuTien?: string;
  ghiChu?: string;
  fileKemTheo?: string;
}

interface PartialFulfillRequest {
  fulfilledQty: number;
  reason?: string;
  decidedByEmployeeId: string;
  routeShortageToPurchase?: boolean;
  lotProductId?: string;
  warehouseId?: string;
  lotId?: string;
  autoCreateProduct?: boolean;
}

// Status sequence for advancement checks
const STATUS_SEQUENCE = ['Chưa cung cấp', 'Đang xử lý', 'Đã duyệt mua', 'Đã mua hàng', 'Đã cung cấp'];
// Mua nhanh skips to Đã mua hàng directly
const MUAN_HANH_STATUS_SEQUENCE = ['Chưa cung cấp', 'Đã mua hàng', 'Đã cung cấp'];

class SupplyRequestService {
  async getAllSupplyRequests(page: number = 1, limit: number = 10, search?: string) {
    const { skip } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { maYeuCau: { contains: search, mode: 'insensitive' as const } },
            { tenNhanVien: { contains: search, mode: 'insensitive' as const } },
            { maNhanVien: { contains: search, mode: 'insensitive' as const } },
            {
              items: {
                some: {
                  OR: [
                    { tenGoi: { contains: search, mode: 'insensitive' as const } },
                    { phanLoai: { contains: search, mode: 'insensitive' as const } },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.supplyRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
              position: { select: { name: true } },
            },
          },
          items: true,
          purchaseRequests: { select: { id: true, maYeuCau: true, trangThai: true } },
          warehouseReceipts: { select: { id: true, maPhieuNhap: true } },
        },
      }),
      prisma.supplyRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async getSupplyRequestById(id: string) {
    const supplyRequest = await prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
        purchaseRequests: true,
        warehouseReceipts: true,
      },
    });

    if (!supplyRequest) {
      throw new NotFoundError('Supply request not found');
    }

    return supplyRequest;
  }

  async createSupplyRequest(data: CreateSupplyRequestRequest) {
    // Validate employeeId exists
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });
    if (!employee) {
      throw new ValidationError('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.');
    }

    if (!data.items || data.items.length === 0) {
      throw new ValidationError('Phải có ít nhất một sản phẩm trong yêu cầu cung cấp.');
    }

    // Use transaction to prevent race condition on code generation
    const supplyRequest = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const lastRequest = await tx.supplyRequest.findFirst({
        where: { maYeuCau: yearlyCodeWhere('YC-CC', year) },
        orderBy: { maYeuCau: 'desc' },
        select: { maYeuCau: true },
      });
      const maYeuCau = nextYearlyCode(lastRequest?.maYeuCau ?? null, 'YC-CC', year);

      const created = await tx.supplyRequest.create({
        data: {
          maYeuCau,
          employeeId: data.employeeId,
          maNhanVien: data.maNhanVien,
          tenNhanVien: data.tenNhanVien,
          boPhan: data.boPhan,
          mucDichYeuCau: data.mucDichYeuCau,
          mucDoUuTien: data.mucDoUuTien,
          ghiChu: data.ghiChu,
          trangThai: 'Chưa cung cấp',
          fileKemTheo: data.fileKemTheo,
          loaiYeuCau: data.loaiYeuCau || 'Thường',
          soTien: data.soTien,
        },
      });

      await tx.supplyRequestItem.createMany({
        data: data.items.map((item) => ({
          supplyRequestId: created.id,
          phanLoai: item.phanLoai,
          tenGoi: item.tenGoi,
          soLuong: item.soLuong,
          donViTinh: item.donViTinh,
        })),
      });

      return tx.supplyRequest.findUnique({
        where: { id: created.id },
        include: {
          employee: {
            include: {
              user: true,
              position: true,
            },
          },
          items: true,
          purchaseRequests: true,
        },
      });
    });

    // Send notification to warehouse employees
    try {
      const warehouseEmployees = await prisma.employee.findMany({
        where: {
          subDepartment: {
            code: 'SUBDEPT_PRODUCTION_WAREHOUSE',
          },
        },
        select: { id: true },
      });

      if (warehouseEmployees.length > 0) {
        const itemNames = data.items.map((i) => i.tenGoi).join(', ');
        await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_CREATED, {
          entityId: supplyRequest?.id,
          metadata: { employeeName: data.tenNhanVien, department: data.boPhan, itemNames, maYeuCau: supplyRequest?.maYeuCau, supplyRequestId: supplyRequest?.id },
        });
      }
    } catch (error) {
      console.error('Error sending supply request notifications:', error);
    }

    // Auto-create hidden purchase request when SR is "Mua nhanh"
    // (bypasses warehouse — SR requester bought outside and warehouse just records)
    if (data.loaiYeuCau === 'Mua nhanh' && supplyRequest) {
      try {
        // Lazy require to avoid circular dependency
        const purchaseRequestService = (await import('./purchaseRequestService')).default;
        await purchaseRequestService.createPurchaseRequest({
          employeeId: data.employeeId,
          maNhanVien: data.maNhanVien,
          tenNhanVien: data.tenNhanVien,
          mucDichYeuCau: `Mua nhanh — tự động tạo từ yêu cầu ${supplyRequest.maYeuCau}`,
          mucDoUuTien: data.mucDoUuTien,
          ghiChu: data.ghiChu,
          fileKemTheo: data.fileKemTheo,
          supplyRequestId: supplyRequest.id,
          giaDuKien: data.soTien,
          isQuickPurchase: true,
          sourceType: 'QUICK',
          items: data.items.map((item) => ({
            phanLoai: item.phanLoai,
            tenHangHoa: item.tenGoi,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
          })),
        });
      } catch (autoPRError) {
        console.error('Error auto-creating quick purchase request:', autoPRError);
      }
    }

    return supplyRequest;
  }

  /**
   * Warehouse decides fulfillment for a single supply request item.
   * - Records SupplyRequestDecision (audit trail).
   * - Updates item fulfilledQty + fulfillmentStatus.
   * - If shortage and `routeShortageToPurchase` is true, auto-creates a purchase request
   *   for the shortage (linked back to the parent SupplyRequest).
   * - Advances parent SR status and notifies requester.
   */
  async partialFulfill(itemId: string, req: PartialFulfillRequest) {
    if (req.fulfilledQty < 0) {
      throw new ValidationError('Số lượng cấp không thể âm.');
    }

    const item = await prisma.supplyRequestItem.findUnique({
      where: { id: itemId },
      include: { supplyRequest: true },
    });

    if (!item) {
      throw new NotFoundError('Không tìm thấy dòng yêu cầu cung cấp.');
    }

    const alreadyFulfilled = item.fulfilledQty ?? 0;
    const remaining = Math.max(0, item.soLuong - alreadyFulfilled);
    if (req.fulfilledQty > remaining) {
      throw new ValidationError(
        `Số lượng cấp (${req.fulfilledQty}) vượt phần còn lại (${remaining}).`
      );
    }

    const newFulfilled = alreadyFulfilled + req.fulfilledQty;
    const shortage = Math.max(0, item.soLuong - newFulfilled);
    let fulfillmentStatus: string;
    let decision: string;
    if (newFulfilled === 0) {
      fulfillmentStatus = 'Không cấp';
      decision = 'Không cấp';
    } else if (shortage === 0) {
      fulfillmentStatus = 'Đã cấp đủ';
      decision = 'Cấp đủ';
    } else {
      fulfillmentStatus = 'Đã cấp một phần';
      decision = 'Cấp một phần';
    }

    // Auto-create shortage PR (outside transaction to avoid nested $transaction complexity)
    let shortagePRId: string | null = null;
    if (shortage > 0 && req.routeShortageToPurchase !== false) {
      try {
        const purchaseRequestService = (await import('./purchaseRequestService')).default;
        const createdPR = await purchaseRequestService.createPurchaseRequest({
          employeeId: req.decidedByEmployeeId,
          maNhanVien: '',
          tenNhanVien: 'Kho (Tự động)',
          mucDichYeuCau: `Bổ sung tồn kho từ yêu cầu ${item.supplyRequest.maYeuCau}`,
          mucDoUuTien: item.supplyRequest.mucDoUuTien,
          ghiChu: req.reason ?? undefined,
          supplyRequestId: item.supplyRequestId,
          sourceType: 'SHORTAGE',
          isQuickPurchase: false,
          items: [
            {
              phanLoai: item.phanLoai,
              tenHangHoa: item.tenGoi,
              soLuong: shortage,
              donViTinh: item.donViTinh,
            },
          ],
        });
        shortagePRId = (createdPR as { id?: string })?.id ?? null;
      } catch (prError) {
        console.error('Error creating shortage purchase request:', prError);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.supplyRequestItem.update({
        where: { id: itemId },
        data: {
          fulfilledQty: newFulfilled,
          fulfillmentStatus,
        },
      });

      await tx.supplyRequestDecision.create({
        data: {
          supplyRequestItemId: itemId,
          decision: shortagePRId ? 'Chuyển thu mua' : decision,
          fulfilledQty: req.fulfilledQty,
          shortageQty: shortage,
          reason: req.reason,
          decidedByEmployeeId: req.decidedByEmployeeId,
          triggeredPurchaseRequestId: shortagePRId,
        },
      });
    });

    // Auto-create warehouse issue when qty > 0 and warehouse/lot are provided
    // Task 8.3: use nested items shape for header+lines
    if (req.fulfilledQty > 0 && req.warehouseId && req.lotId) {
      try {
        const warehouseIssueService = (await import('./warehouseIssueService')).default;

        // Resolve lotProductId: prefer client-selected, else auto-create if flag set
        let resolvedLotProductId = req.lotProductId;
        if (!resolvedLotProductId && req.autoCreateProduct) {
          const warehouseReceiptService = (await import('./warehouseReceiptService')).default;
          const created = await warehouseReceiptService.resolveOrCreateLotProduct(
            req.lotId,
            item.tenGoi,
            item.donViTinh,
            item.phanLoai
          );
          resolvedLotProductId = created.id;
        }

        if (resolvedLotProductId) {
          // Fetch employee, warehouse, lot info for complete issue record
          const [employee, warehouse, lot] = await Promise.all([
            prisma.employee.findUnique({ where: { id: req.decidedByEmployeeId }, select: { employeeCode: true, user: { select: { firstName: true, lastName: true } } } }),
            prisma.warehouses.findUnique({ where: { id: req.warehouseId }, select: { tenKho: true } }),
            prisma.lot.findUnique({ where: { id: req.lotId }, select: { tenLo: true } }),
          ]);

          await warehouseIssueService.create({
            employeeId: req.decidedByEmployeeId,
            maNhanVien: employee?.employeeCode ?? '',
            tenNhanVien: employee?.user ? `${employee.user.lastName} ${employee.user.firstName}` : '',
            ghiChu: `Xuất kho tự động từ cấp phát YC ${item.supplyRequest.maYeuCau}`,
            supplyRequestId: item.supplyRequestId,
            items: [{
              lotProductId: resolvedLotProductId,
              tenSanPham: item.tenGoi,
              donViTinh: item.donViTinh,
              warehouseId: req.warehouseId,
              tenKho: warehouse?.tenKho ?? '',
              lotId: req.lotId,
              tenLo: lot?.tenLo ?? '',
              soLuongThucTe: req.fulfilledQty,
              ghiChu: `Xuất kho tự động từ cấp phát YC ${item.supplyRequest.maYeuCau}`,
            }],
          });
        }
      } catch (issueErr) {
        console.error('Auto warehouse issue creation failed:', issueErr);
      }
    }

    // Recompute parent SR aggregate status
    const siblings = await prisma.supplyRequestItem.findMany({
      where: { supplyRequestId: item.supplyRequestId },
      select: { soLuong: true, fulfilledQty: true, fulfillmentStatus: true },
    });

    const allDone = siblings.every((s) => (s.fulfilledQty ?? 0) >= s.soLuong);
    const anyFulfilled = siblings.some((s) => (s.fulfilledQty ?? 0) > 0);

    try {
      if (allDone) {
        await this.onWarehouseDocumentCreated(item.supplyRequestId);
      } else if (anyFulfilled) {
        // Notify requester about partial fulfillment
        await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_PARTIAL_FULFILLED, {
          targetEmployeeIds: [item.supplyRequest.employeeId],
          entityId: item.supplyRequestId,
          metadata: {
            maYeuCau: item.supplyRequest.maYeuCau,
            tenGoi: item.tenGoi,
            supplyRequestId: item.supplyRequestId,
          },
        });
      }
    } catch (notifError) {
      console.error('Error in partialFulfill notification:', notifError);
    }

    return prisma.supplyRequestItem.findUnique({
      where: { id: itemId },
      include: { decisions: { orderBy: { decidedAt: 'desc' } } },
    });
  }

  /**
   * Task 8.1-8.4 — Batch fulfillment: decide multiple supply-request lines at once.
   *
   * All lines with fulfilledQty > 0 share one warehouse issue slip (one PX code).
   * Stock is validated per-package across the entire batch before any write.
   * A shortfall on any package aborts the whole batch — no decisions recorded,
   * no issue slip created.
   */
  async batchFulfill(
    lines: Array<{
      itemId: string;
      fulfilledQty: number;
      reason?: string;
      decidedByEmployeeId: string;
      routeShortageToPurchase?: boolean;
      lotProductId?: string;
      warehouseId?: string;
      lotId?: string;
      autoCreateProduct?: boolean;
    }>,
  ) {
    if (!lines || lines.length === 0) {
      throw new ValidationError('Danh sách cấp phát không được để trống');
    }

    // 1. Load all items and validate basic constraints
    const itemIds = lines.map((l) => l.itemId);
    const items = await prisma.supplyRequestItem.findMany({
      where: { id: { in: itemIds } },
      include: { supplyRequest: true },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    for (const line of lines) {
      const item = itemMap.get(line.itemId);
      if (!item) {
        throw new NotFoundError(`Không tìm thấy dòng yêu cầu cung cấp: ${line.itemId}`);
      }
      if (line.fulfilledQty < 0) {
        throw new ValidationError('Số lượng cấp không thể âm.');
      }
      const alreadyFulfilled = item.fulfilledQty ?? 0;
      const remaining = Math.max(0, item.soLuong - alreadyFulfilled);
      if (line.fulfilledQty > remaining) {
        throw new ValidationError(
          `Số lượng cấp (${line.fulfilledQty}) vượt phần còn lại (${remaining}) cho "${item.tenGoi}".`
        );
      }
    }

    // 2. Resolve lot products for lines with fulfilledQty > 0 and warehouse info
    const warehouseIssueService = (await import('./warehouseIssueService')).default;
    const warehouseReceiptService = (await import('./warehouseReceiptService')).default;

    const issueLineInputs: Array<{
      lotProductId: string;
      tenSanPham: string;
      donViTinh: string;
      warehouseId: string;
      tenKho: string;
      lotId: string;
      tenLo: string;
      soLuongThucTe: number;
      ghiChu: string;
      supplyRequestId: string;
    }> = [];

    for (const line of lines) {
      if (line.fulfilledQty <= 0 || !line.warehouseId || !line.lotId) continue;
      const item = itemMap.get(line.itemId)!;

      let resolvedLotProductId = line.lotProductId;
      if (!resolvedLotProductId && line.autoCreateProduct) {
        const created = await warehouseReceiptService.resolveOrCreateLotProduct(
          line.lotId,
          item.tenGoi,
          item.donViTinh,
          item.phanLoai,
        );
        resolvedLotProductId = created.id;
      }
      if (!resolvedLotProductId) continue;

      const warehouse = await prisma.warehouses.findUnique({
        where: { id: line.warehouseId },
        select: { tenKho: true },
      });
      const lot = await prisma.lot.findUnique({
        where: { id: line.lotId },
        select: { tenLo: true },
      });

      issueLineInputs.push({
        lotProductId: resolvedLotProductId,
        tenSanPham: item.tenGoi,
        donViTinh: item.donViTinh,
        warehouseId: line.warehouseId,
        tenKho: warehouse?.tenKho ?? '',
        lotId: line.lotId,
        tenLo: lot?.tenLo ?? '',
        soLuongThucTe: line.fulfilledQty,
        ghiChu: `Xuất kho từ cấp phát hàng loạt YC ${item.supplyRequest.maYeuCau}`,
        supplyRequestId: item.supplyRequestId,
      });
    }

    // 3. Task 8.2 — Aggregate stock validation BEFORE any write.
    // Group by lotProductId and check each package's aggregate against balance.
    if (issueLineInputs.length > 0) {
      const aggregateByPackage = new Map<string, number>();
      for (const line of issueLineInputs) {
        aggregateByPackage.set(
          line.lotProductId,
          (aggregateByPackage.get(line.lotProductId) ?? 0) + line.soLuongThucTe,
        );
      }

      const lotProductIds = [...aggregateByPackage.keys()];
      const lotProducts = await prisma.lotProduct.findMany({
        where: { id: { in: lotProductIds } },
        select: { id: true, soLuong: true },
      });

      for (const lp of lotProducts) {
        const required = aggregateByPackage.get(lp.id) ?? 0;
        if (required > lp.soLuong) {
          const firstLine = issueLineInputs.find((l) => l.lotProductId === lp.id);
          throw new ValidationError(
            `Tồn kho không đủ cho kiện hàng "${firstLine?.tenSanPham ?? lp.id}". Cần: ${required}, Tồn: ${lp.soLuong}`
          );
        }
      }
    }

    // 4. Record decisions and update fulfillment status
    const purchaseRequestService = (await import('./purchaseRequestService')).default;
    const decisionRecords: Array<{
      itemId: string;
      decision: string;
      fulfilledQty: number;
      shortageQty: number;
      shortagePRId: string | null;
    }> = [];

    for (const line of lines) {
      const item = itemMap.get(line.itemId)!;
      const alreadyFulfilled = item.fulfilledQty ?? 0;
      const newFulfilled = alreadyFulfilled + line.fulfilledQty;
      const shortage = Math.max(0, item.soLuong - newFulfilled);

      let decision: string;
      if (newFulfilled === 0) {
        decision = 'Không cấp';
      } else if (shortage === 0) {
        decision = 'Cấp đủ';
      } else {
        decision = 'Cấp một phần';
      }

      let shortagePRId: string | null = null;
      if (shortage > 0 && line.routeShortageToPurchase !== false) {
        try {
          const createdPR = await purchaseRequestService.createPurchaseRequest({
            employeeId: line.decidedByEmployeeId,
            maNhanVien: '',
            tenNhanVien: 'Kho (Tự động)',
            mucDichYeuCau: `Bổ sung tồn kho từ yêu cầu ${item.supplyRequest.maYeuCau}`,
            mucDoUuTien: item.supplyRequest.mucDoUuTien,
            ghiChu: line.reason ?? undefined,
            supplyRequestId: item.supplyRequestId,
            sourceType: 'SHORTAGE',
            isQuickPurchase: false,
            items: [{
              phanLoai: item.phanLoai,
              tenHangHoa: item.tenGoi,
              soLuong: shortage,
              donViTinh: item.donViTinh,
            }],
          });
          shortagePRId = (createdPR as { id?: string })?.id ?? null;
        } catch (prError) {
          console.error('Error creating shortage purchase request:', prError);
        }
      }

      decisionRecords.push({
        itemId: line.itemId,
        decision: shortagePRId ? 'Chuyển thu mua' : decision,
        fulfilledQty: line.fulfilledQty,
        shortageQty: shortage,
        shortagePRId,
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const item = itemMap.get(line.itemId)!;
        const alreadyFulfilled = item.fulfilledQty ?? 0;
        const newFulfilled = alreadyFulfilled + line.fulfilledQty;
        const shortage = Math.max(0, item.soLuong - newFulfilled);

        let fulfillmentStatus: string;
        if (newFulfilled === 0) fulfillmentStatus = 'Không cấp';
        else if (shortage === 0) fulfillmentStatus = 'Đã cấp đủ';
        else fulfillmentStatus = 'Đã cấp một phần';

        await tx.supplyRequestItem.update({
          where: { id: line.itemId },
          data: { fulfilledQty: newFulfilled, fulfillmentStatus },
        });
      }

      for (const rec of decisionRecords) {
        const matchingLine = lines.find((l) => l.itemId === rec.itemId);
        await tx.supplyRequestDecision.create({
          data: {
            supplyRequestItemId: rec.itemId,
            decision: rec.decision,
            fulfilledQty: rec.fulfilledQty,
            shortageQty: rec.shortageQty,
            reason: matchingLine?.reason,
            decidedByEmployeeId: matchingLine?.decidedByEmployeeId ?? '',
            triggeredPurchaseRequestId: rec.shortagePRId,
          },
        });
      }
    });

    // 5. Create one multi-line issue slip for all lines with fulfilledQty > 0
    if (issueLineInputs.length > 0) {
      try {
        const firstLine = issueLineInputs[0];
        const supplyRequestId = firstLine.supplyRequestId;
        const employeeId = lines.find((l) => {
          const item = itemMap.get(l.itemId);
          return item?.supplyRequestId === supplyRequestId;
        })?.decidedByEmployeeId ?? lines[0].decidedByEmployeeId;

        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
          select: { employeeCode: true, user: { select: { firstName: true, lastName: true } } },
        });

        // All lines belong to the same supply request (batch is per-SR)
        const sr = itemMap.get(lines[0].itemId)?.supplyRequest;

        await warehouseIssueService.create({
          employeeId,
          maNhanVien: employee?.employeeCode ?? '',
          tenNhanVien: employee?.user ? `${employee.user.lastName} ${employee.user.firstName}` : '',
          ghiChu: `Xuất kho từ cấp phát hàng loạt YC ${sr?.maYeuCau ?? ''}`,
          supplyRequestId,
          items: issueLineInputs.map((l) => ({
            lotProductId: l.lotProductId,
            tenSanPham: l.tenSanPham,
            donViTinh: l.donViTinh,
            warehouseId: l.warehouseId,
            tenKho: l.tenKho,
            lotId: l.lotId,
            tenLo: l.tenLo,
            soLuongThucTe: l.soLuongThucTe,
            ghiChu: l.ghiChu,
          })),
        });
      } catch (issueErr) {
        console.error('Batch warehouse issue creation failed:', issueErr);
      }
    }

    // 6. Task 8.4 — Recompute parent SR status
    const supplyRequestId = itemMap.get(lines[0].itemId)?.supplyRequestId;
    if (supplyRequestId) {
      const siblings = await prisma.supplyRequestItem.findMany({
        where: { supplyRequestId },
        select: { soLuong: true, fulfilledQty: true, fulfillmentStatus: true },
      });
      const allDone = siblings.every((s) => (s.fulfilledQty ?? 0) >= s.soLuong);
      const anyFulfilled = siblings.some((s) => (s.fulfilledQty ?? 0) > 0);

      try {
        if (allDone) {
          await this.onWarehouseDocumentCreated(supplyRequestId);
        } else if (anyFulfilled) {
          const sr = await prisma.supplyRequest.findUnique({
            where: { id: supplyRequestId },
            select: { employeeId: true, maYeuCau: true },
          });
          if (sr) {
            await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_PARTIAL_FULFILLED, {
              targetEmployeeIds: [sr.employeeId],
              entityId: supplyRequestId,
              metadata: {
                maYeuCau: sr.maYeuCau,
                tenGoi: `${lines.length} mặt hàng`,
                supplyRequestId,
              },
            });
          }
        }
      } catch (notifError) {
        console.error('Error in batchFulfill notification:', notifError);
      }
    }

    return { success: true, decisionsCount: decisionRecords.length };
  }

  /**
   * List decisions for a supply request (all items).
   */
  async getDecisionHistory(supplyRequestId: string) {
    const request = await prisma.supplyRequest.findUnique({
      where: { id: supplyRequestId },
      select: { id: true },
    });
    if (!request) {
      throw new NotFoundError('Supply request not found');
    }
    return prisma.supplyRequestDecision.findMany({
      where: { supplyRequestItem: { supplyRequestId } },
      orderBy: { decidedAt: 'desc' },
      include: {
        supplyRequestItem: {
          select: { id: true, tenGoi: true, phanLoai: true, soLuong: true, donViTinh: true },
        },
      },
    });
  }

  async updateSupplyRequest(id: string, data: UpdateSupplyRequestRequest) {
    // Check record exists
    const existing = await prisma.supplyRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Supply request not found');
    }

    // Strip trangThai from incoming data — status is server-managed only
    const { items, ...headerData } = data as any;
    delete headerData.trangThai;

    if (items && Array.isArray(items)) {
      // Replace items within a transaction
      await prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.supplyRequestItem.deleteMany({ where: { supplyRequestId: id } });
        // Create new items
        await tx.supplyRequestItem.createMany({
          data: items.map((item: SupplyRequestItemInput) => ({
            supplyRequestId: id,
            phanLoai: item.phanLoai,
            tenGoi: item.tenGoi,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
          })),
        });
        // Update header
        if (Object.keys(headerData).length > 0) {
          await tx.supplyRequest.update({
            where: { id },
            data: headerData,
          });
        }
      });
    } else if (Object.keys(headerData).length > 0) {
      await prisma.supplyRequest.update({
        where: { id },
        data: headerData,
      });
    }

    return prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
      },
    });
  }

  async deleteSupplyRequest(id: string) {
    await prisma.supplyRequest.delete({
      where: { id },
    });
  }

  /**
   * Mark a "Mua nhanh" supply request as purchased.
   * Advances status directly to "Đã mua hàng", optionally recording soTien.
   */
  async markMuaNhanhAsPurchased(id: string, soTien?: number): Promise<void> {
    const request = await prisma.supplyRequest.findUnique({
      where: { id },
      select: { trangThai: true, loaiYeuCau: true },
    });

    if (!request) {
      throw new NotFoundError('Supply request not found');
    }

    const sequence = request.loaiYeuCau === 'Mua nhanh' ? MUAN_HANH_STATUS_SEQUENCE : STATUS_SEQUENCE;
    const currentIndex = sequence.indexOf(request.trangThai);
    const newIndex = sequence.indexOf('Đã mua hàng');

    if (newIndex > currentIndex) {
      await prisma.supplyRequest.update({
        where: { id },
        data: {
          trangThai: 'Đã mua hàng',
          ...(soTien !== undefined ? { soTien } : {}),
        },
      });
    }
  }

  /**
   * Advance status only if newStatus comes later in the ordered sequence.
   * Prevents out-of-order transitions.
   */
  private async advanceStatus(supplyRequestId: string, newStatus: string): Promise<void> {
    const request = await prisma.supplyRequest.findUnique({
      where: { id: supplyRequestId },
      select: { trangThai: true },
    });

    if (!request) return;

    const currentIndex = STATUS_SEQUENCE.indexOf(request.trangThai);
    const newIndex = STATUS_SEQUENCE.indexOf(newStatus);

    if (newIndex > currentIndex) {
      await prisma.supplyRequest.update({
        where: { id: supplyRequestId },
        data: { trangThai: newStatus },
      });
    }
  }

  /**
   * Called when a PurchaseRequest is created for this supply request.
   * Advances status to "Đang xử lý" and notifies original requester.
   */
  async onPurchaseRequestCreated(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đang xử lý');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (request) {
        await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_PROCESSING, {
          targetEmployeeIds: [request.employeeId],
          entityId: supplyRequestId,
          metadata: { maYeuCau: request.maYeuCau, supplyRequestId },
        });
      }
    } catch (error) {
      console.error('Error in onPurchaseRequestCreated notification:', error);
    }
  }

  /**
   * Called when the linked PurchaseRequest is approved.
   * Advances status to "Đã duyệt mua" and notifies warehouse + purchasing staff.
   */
  async onPurchaseRequestApproved(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đã duyệt mua');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (!request) return;

      // Notify warehouse employees
      const warehouseEmployees = await prisma.employee.findMany({
        where: {
          subDepartment: {
            code: 'SUBDEPT_PRODUCTION_WAREHOUSE',
          },
        },
        select: { id: true },
      });

      // Notify purchasing employees
      const purchasingEmployees = await prisma.employee.findMany({
        where: {
          subDepartment: {
            department: {
              code: 'DEPT_PURCHASING',
            },
          },
        },
        select: { id: true },
      });

      const allRecipientIds = [
        ...new Set([
          ...warehouseEmployees.map((emp) => emp.id),
          ...purchasingEmployees.map((emp) => emp.id),
        ]),
      ];

      if (allRecipientIds.length > 0) {
        await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_APPROVED, {
          targetEmployeeIds: allRecipientIds,
          entityId: supplyRequestId,
          metadata: { maYeuCau: request.maYeuCau, supplyRequestId },
        });
      }
    } catch (error) {
      console.error('Error in onPurchaseRequestApproved notification:', error);
    }
  }

  /**
   * Called when the linked PurchaseRequest is marked as "Hoàn thành" (goods purchased).
   * Advances status to "Đã mua hàng" and notifies warehouse employees.
   */
  async onPurchaseRequestCompleted(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đã mua hàng');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (request) {
        const warehouseEmployees = await prisma.employee.findMany({
          where: {
            subDepartment: {
              code: 'SUBDEPT_PRODUCTION_WAREHOUSE',
            },
          },
          select: { id: true },
        });

        if (warehouseEmployees.length > 0) {
          await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_APPROVED, {
            targetEmployeeIds: warehouseEmployees.map((emp) => emp.id),
            entityId: supplyRequestId,
            metadata: { maYeuCau: request.maYeuCau, supplyRequestId },
          });
        }
      }
    } catch (error) {
      console.error('Error in onPurchaseRequestCompleted notification:', error);
    }
  }

  /**
   * Called when a WarehouseReceipt or WarehouseIssue is created for this supply request.
   * Advances status to "Đã cung cấp" and notifies the original requester.
   */
  async onWarehouseDocumentCreated(supplyRequestId: string): Promise<void> {
    try {
      await this.advanceStatus(supplyRequestId, 'Đã cung cấp');

      const request = await prisma.supplyRequest.findUnique({
        where: { id: supplyRequestId },
        select: { employeeId: true, maYeuCau: true },
      });

      if (request) {
        await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_FULFILLED, {
          targetEmployeeIds: [request.employeeId],
          entityId: supplyRequestId,
          metadata: { maYeuCau: request.maYeuCau, supplyRequestId },
        });
      }
    } catch (error) {
      console.error('Error in onWarehouseDocumentCreated notification:', error);
    }
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' as const } },
        { tenNhanVien: { contains: filters.search, mode: 'insensitive' as const } },
        { maNhanVien: { contains: filters.search, mode: 'insensitive' as const } },
        {
          items: {
            some: {
              OR: [
                { tenGoi: { contains: filters.search, mode: 'insensitive' as const } },
                { phanLoai: { contains: filters.search, mode: 'insensitive' as const } },
              ],
            },
          },
        },
      ];
    }

    const data = await prisma.supplyRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        items: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách yêu cầu cung cấp');

    worksheet.columns = [
      { header: 'Ngày yêu cầu', key: 'ngayYeuCau', width: 15 },
      { header: 'Mã yêu cầu', key: 'maYeuCau', width: 15 },
      { header: 'Nhân viên', key: 'tenNhanVien', width: 25 },
      { header: 'Bộ phận', key: 'boPhan', width: 20 },
      { header: 'Phân loại', key: 'phanLoai', width: 15 },
      { header: 'Tên gọi', key: 'tenGoi', width: 25 },
      { header: 'Số lượng', key: 'soLuong', width: 12 },
      { header: 'Đơn vị tính', key: 'donViTinh', width: 12 },
      { header: 'Mức độ ưu tiên', key: 'mucDoUuTien', width: 15 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Emit one row per item
    data.forEach((request) => {
      if (request.items && request.items.length > 0) {
        request.items.forEach((item) => {
          worksheet.addRow({
            ngayYeuCau: new Date(request.ngayYeuCau).toLocaleDateString('vi-VN'),
            maYeuCau: request.maYeuCau,
            tenNhanVien: request.tenNhanVien,
            boPhan: request.boPhan,
            phanLoai: item.phanLoai,
            tenGoi: item.tenGoi,
            soLuong: item.soLuong,
            donViTinh: item.donViTinh,
            mucDoUuTien: request.mucDoUuTien,
            trangThai: request.trangThai,
          });
        });
      } else {
        // Legacy row with no items
        worksheet.addRow({
          ngayYeuCau: new Date(request.createdAt).toLocaleDateString('vi-VN'),
          maYeuCau: request.maYeuCau,
          tenNhanVien: request.tenNhanVien,
          boPhan: request.boPhan,
          phanLoai: '',
          tenGoi: '',
          soLuong: '',
          donViTinh: '',
          mucDoUuTien: request.mucDoUuTien,
          trangThai: request.trangThai,
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new SupplyRequestService();
