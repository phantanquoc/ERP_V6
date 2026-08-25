import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';
import { NotificationEvent } from '@types';
import notificationService from '@services/notificationService';

// 4.1 — shortage grouping helpers (family buckets for purchasing sub-teams)
function stripDiacritics(input: string): string {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');
}
function bucketPhanLoai(phanLoai: string): 'MATERIALS' | 'EQUIPMENT' | 'OTHER' {
  const raw = (phanLoai ?? '').trim();
  if (!raw) return 'OTHER';
  const n = stripDiacritics(raw).toLowerCase();
  if (n.includes('thiet bi') || n.includes('cong cu') || n.includes('dung cu')) return 'EQUIPMENT';
  if (
    n.includes('nguyen') ||
    n.includes('vat tu') ||
    n.includes('vat lieu') ||
    n.includes('phu lieu') ||
    n.includes('bao bi') ||
    n.includes('nhien lieu')
  )
    return 'MATERIALS';
  return 'OTHER';
}
async function generatePurchaseRequestCodeTx(tx: any): Promise<string> {
  const year = new Date().getFullYear();
  const last = await tx.purchaseRequest.findFirst({
    where: { maYeuCau: yearlyCodeWhere('YC-MH', year) },
    orderBy: { maYeuCau: 'desc' },
    select: { maYeuCau: true },
  });
  return nextYearlyCode(last?.maYeuCau ?? null, 'YC-MH', year);
}

interface SupplyRequestItemInput {
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  isNewProduct?: boolean;
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
// "Chờ bổ sung" bridges warehouse shortage → purchasing replenishment (SHORTAGE PR)
const STATUS_SEQUENCE = ['Chưa cung cấp', 'Đang xử lý', 'Chờ bổ sung', 'Đã duyệt mua', 'Đã mua hàng', 'Đã cung cấp', 'Đã hủy'];
// Mua nhanh skips to Đã mua hàng directly (unchanged)
const MUAN_HANH_STATUS_SEQUENCE = ['Chưa cung cấp', 'Đã mua hàng', 'Đã cung cấp'];

class SupplyRequestService {
  async getAllSupplyRequests(
    page: number = 1,
    limit: number = 10,
    search?: string,
    departmentIds?: string[],
    subDepartmentIds?: string[],
    phanLoai?: string,
  ) {
    const { skip } = getPaginationParams(page, limit);

    const deptFilter =
      departmentIds?.length
        ? { employee: { user: { OR: [{ departmentId: { in: departmentIds } }, { departmentId: null }] } } }
        : {};
    const subDeptFilter =
      subDepartmentIds?.length
        ? { employee: { subDepartmentId: { in: subDepartmentIds } } }
        : {};
    const phanLoaiFilter = phanLoai ? { items: { some: { phanLoai: { contains: phanLoai, mode: 'insensitive' as const } } } } : {};

    const where = search
      ? {
          AND: [
            deptFilter,
            subDeptFilter,
            phanLoaiFilter,
            {
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
        },
          ],
        }
      : { AND: [deptFilter, subDeptFilter, phanLoaiFilter] };

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

    // Check each item: if it doesn't exist in InternationalProduct, mark as new product
    const itemsWithFlag = await Promise.all(
      data.items.map(async (item) => {
        const existingProduct = await prisma.internationalProduct.findFirst({
          where: {
            OR: [
              { tenSanPham: { equals: item.tenGoi, mode: 'insensitive' } },
              { maSanPham: { equals: item.tenGoi, mode: 'insensitive' } },
            ],
          },
        });
        return {
          ...item,
          isNewProduct: !existingProduct, // flag nếu chưa có trong DB
        };
      })
    );
    data.items = itemsWithFlag;

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
          isNewProduct: item.isNewProduct ?? false,
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
        const newProductNames = data.items.filter((i) => i.isNewProduct).map((i) => i.tenGoi);
        await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_CREATED, {
          entityId: supplyRequest?.id,
          metadata: {
            employeeName: data.tenNhanVien,
            department: data.boPhan,
            itemNames,
            maYeuCau: supplyRequest?.maYeuCau,
            supplyRequestId: supplyRequest?.id,
            newProductCount: newProductNames.length,
            newProductNames: newProductNames.join(', '),
          },
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
  // 4.1/4.2 — shortage grouped by normalized phanLoai, one PR per bucket,
  // materialized inside a single transaction; ownership from SR.employeeId
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

    // Build shortage bucket list for the (up to) one shortage line
    let buckets: Map<string, Array<{ phanLoai: string; tenHangHoa: string; soLuong: number; donViTinh: string; itemId: string }>> | null = null;
    if (shortage > 0 && req.routeShortageToPurchase !== false) {
      buckets = new Map();
      const b = bucketPhanLoai(item.phanLoai);
      buckets.set(b, [
        { phanLoai: item.phanLoai, tenHangHoa: item.tenGoi, soLuong: shortage, donViTinh: item.donViTinh, itemId },
      ]);
    }

    // Transactionally: update item + decisions (+ per-bucket PRs) + status bridge
    let createdPRs: Array<{ id: string; maYeuCau: string; bucket: string }> = [];
    let shortagePRId: string | null = null;
    await prisma.$transaction(async (tx) => {
      await tx.supplyRequestItem.update({
        where: { id: itemId },
        data: { fulfilledQty: newFulfilled, fulfillmentStatus },
      });

      // Create shortage PRs from SR ownership (4.2), one per bucket
      if (buckets && buckets.size > 0) {
        const sr = item.supplyRequest as any;
        for (const [bucket, shortageItems] of buckets) {
          const maYeuCau = await generatePurchaseRequestCodeTx(tx);
          const pr = await tx.purchaseRequest.create({
            data: {
              maYeuCau,
              employeeId: sr.employeeId,
              maNhanVien: sr.maNhanVien ?? '',
              tenNhanVien: sr.tenNhanVien ?? '',
              mucDichYeuCau: `Bổ sung tồn kho từ yêu cầu ${sr.maYeuCau} — ${bucket}`,
              mucDoUuTien: sr.mucDoUuTien,
              ghiChu: req.reason ?? undefined,
              supplyRequestId: item.supplyRequestId,
              sourceType: 'SHORTAGE',
              isQuickPurchase: false,
              trangThai: 'Chờ báo giá',
            },
          });
          await tx.purchaseRequestItem.createMany({
            data: shortageItems.map((si) => ({
              purchaseRequestId: pr.id,
              phanLoai: si.phanLoai,
              tenHangHoa: si.tenHangHoa,
              soLuong: si.soLuong,
              donViTinh: si.donViTinh,
            })),
          });
          createdPRs.push({ id: pr.id, maYeuCau: pr.maYeuCau, bucket });
        }
        shortagePRId = createdPRs[0]?.id ?? null; // single-line path has at most one bucket
      }

      const decisionPRId = shortagePRId;
      await tx.supplyRequestDecision.create({
        data: {
          supplyRequestItemId: itemId,
          decision: decisionPRId ? 'Chuyển thu mua' : decision,
          fulfilledQty: req.fulfilledQty,
          shortageQty: shortage,
          reason: req.reason,
          decidedByEmployeeId: req.decidedByEmployeeId,
          triggeredPurchaseRequestId: decisionPRId,
        },
      });

      // Bridge SR status to Chờ bổ sung inside the same transaction when shortage was routed
      if (buckets && buckets.size > 0) {
        const cur = await tx.supplyRequest.findUnique({ where: { id: item.supplyRequestId }, select: { trangThai: true } });
        if (cur) {
          const curIdx = STATUS_SEQUENCE.indexOf(cur.trangThai);
          const tgtIdx = STATUS_SEQUENCE.indexOf('Chờ bổ sung');
          if (tgtIdx > curIdx) {
            await tx.supplyRequest.update({ where: { id: item.supplyRequestId }, data: { trangThai: 'Chờ bổ sung' } });
          }
        }
      }
    });

    // Post-tx: notify purchasing per bucket with phanLoai metadata (4.2)
    for (const pr of createdPRs) {
      try {
        const si = [...(buckets?.get(pr.bucket) ?? [])];
        await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_CREATED, {
          metadata: {
            maYeuCau: pr.maYeuCau,
            purchaseRequestId: pr.id,
            supplyRequestId: item.supplyRequestId,
            sourceType: 'SHORTAGE',
            employeeName: (item.supplyRequest as any).tenNhanVien ?? '',
            items: si.map((x) => ({ phanLoai: x.phanLoai })),
            phanLoaiGroup: pr.bucket,
          },
        });
        // SR status already bridged to Chờ bổ sung inside tx; legacy hook is idempotent and runs outside tx if needed, but self-import is circular — skip here.
      } catch (e) { console.error('post-partialFulfill notify/PR hook failed', e); }
    }

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

    // 4. — bucketed shortage PRs, one PR per phanLoai group (4.1/4.2)
    type ShortageEntry = { itemId: string; phanLoai: string; tenHangHoa: string; soLuong: number; donViTinh: string };
    const shortageBuckets = new Map<string, ShortageEntry[]>();
    const lineShortage = new Map<string, number>();
    const lineDecisionLabel = new Map<string, string>();
    let hasShortage = false;
    for (const line of lines) {
      const item = itemMap.get(line.itemId)!;
      const alreadyFulfilled = item.fulfilledQty ?? 0;
      const newFulfilled = alreadyFulfilled + line.fulfilledQty;
      const shortage = Math.max(0, item.soLuong - newFulfilled);
      lineShortage.set(line.itemId, shortage);
      let label: string;
      if (newFulfilled === 0) label = 'Không cấp';
      else if (shortage === 0) label = 'Cấp đủ';
      else label = 'Cấp một phần';
      lineDecisionLabel.set(line.itemId, label);
      if (shortage > 0 && line.routeShortageToPurchase !== false) {
        hasShortage = true;
        const b = bucketPhanLoai(item.phanLoai);
        const arr = shortageBuckets.get(b) ?? [];
        arr.push({ itemId: line.itemId, phanLoai: item.phanLoai, tenHangHoa: item.tenGoi, soLuong: shortage, donViTinh: item.donViTinh });
        shortageBuckets.set(b, arr);
      }
    }
    const batchSupplyRequestId = itemMap.get(lines[0].itemId)?.supplyRequestId ?? null;
    const batchSRMeta = itemMap.get(lines[0].itemId)?.supplyRequest as any;
    let bucketPRIdByItem = new Map<string, string>();
    let batchCreatedPRMeta: Array<{ id: string; maYeuCau: string; bucket: string; items: ShortageEntry[] }> = [];
    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const item = itemMap.get(line.itemId)!;
        const alreadyFulfilled = item.fulfilledQty ?? 0;
        const newFulfilled = alreadyFulfilled + line.fulfilledQty;
        const shortage = lineShortage.get(line.itemId) ?? 0;
        let fulfillmentStatus: string;
        if (newFulfilled === 0) fulfillmentStatus = 'Không cấp';
        else if (shortage === 0) fulfillmentStatus = 'Đã cấp đủ';
        else fulfillmentStatus = 'Đã cấp một phần';
        await tx.supplyRequestItem.update({
          where: { id: line.itemId },
          data: { fulfilledQty: newFulfilled, fulfillmentStatus },
        });
      }
      for (const [bucket, entries] of shortageBuckets) {
        const maYeuCau = await generatePurchaseRequestCodeTx(tx);
        const pr = await tx.purchaseRequest.create({
          data: {
            maYeuCau,
            employeeId: batchSRMeta?.employeeId ?? '',
            maNhanVien: batchSRMeta?.maNhanVien ?? '',
            tenNhanVien: batchSRMeta?.tenNhanVien ?? '',
            mucDichYeuCau: `Bổ sung tồn kho từ yêu cầu ${batchSRMeta?.maYeuCau ?? ''} — ${bucket}`,
            mucDoUuTien: batchSRMeta?.mucDoUuTien ?? 'Trung bình',
            ghiChu: undefined,
            supplyRequestId: batchSupplyRequestId ?? undefined,
            sourceType: 'SHORTAGE',
            isQuickPurchase: false,
            trangThai: 'Chờ báo giá',
          },
        });
        await tx.purchaseRequestItem.createMany({
          data: entries.map((e) => ({
            purchaseRequestId: pr.id,
            phanLoai: e.phanLoai,
            tenHangHoa: e.tenHangHoa,
            soLuong: e.soLuong,
            donViTinh: e.donViTinh,
          })),
        });
        for (const e of entries) bucketPRIdByItem.set(e.itemId, pr.id);
        batchCreatedPRMeta.push({ id: pr.id, maYeuCau, bucket, items: entries });
      }
      for (const line of lines) {
        const shortage = lineShortage.get(line.itemId) ?? 0;
        const label = lineDecisionLabel.get(line.itemId) ?? 'Không cấp';
        const prIdForItem = bucketPRIdByItem.get(line.itemId) ?? null;
        await tx.supplyRequestDecision.create({
          data: {
            supplyRequestItemId: line.itemId,
            decision: prIdForItem ? 'Chuyển thu mua' : label,
            fulfilledQty: line.fulfilledQty,
            shortageQty: shortage,
            reason: line.reason,
            decidedByEmployeeId: line.decidedByEmployeeId ?? '',
            triggeredPurchaseRequestId: prIdForItem,
          },
        });
      }
      if (hasShortage && batchSupplyRequestId) {
        const cur = await tx.supplyRequest.findUnique({ where: { id: batchSupplyRequestId }, select: { trangThai: true } });
        if (cur) {
          const curIdx = STATUS_SEQUENCE.indexOf(cur.trangThai);
          const tgtIdx = STATUS_SEQUENCE.indexOf('Chờ bổ sung');
          if (tgtIdx > curIdx) await tx.supplyRequest.update({ where: { id: batchSupplyRequestId }, data: { trangThai: 'Chờ bổ sung' } });
        }
      }
    });
    for (const pr of batchCreatedPRMeta) {
      try {
        await notificationService.notify(NotificationEvent.PURCHASE_REQUEST_CREATED, {
          metadata: {
            maYeuCau: pr.maYeuCau,
            purchaseRequestId: pr.id,
            supplyRequestId: batchSupplyRequestId ?? undefined,
            sourceType: 'SHORTAGE',
            employeeName: batchSRMeta?.tenNhanVien ?? '',
            items: pr.items.map((x) => ({ phanLoai: x.phanLoai })),
            phanLoaiGroup: pr.bucket,
          },
        });
      } catch (e) { console.error('batchFulfill post-notify failed', e); }
    }

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

    return { success: true, decisionsCount: lines.length };
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

  async cancelSupplyRequest(id: string): Promise<any> {
    const request = await this.getSupplyRequestById(id);

    // Only allow cancellation from initial states
    const cancellable = ['Chưa cung cấp', 'Đang xử lý'];
    if (!cancellable.includes(request.trangThai)) {
      throw new ValidationError(`Không thể hủy yêu cầu ở trạng thái "${request.trangThai}"`);
    }

    // Update status to "Đã hủy" and cancel unfulfilled items
    const updated = await prisma.supplyRequest.update({
      where: { id },
      data: {
        trangThai: 'Đã hủy',
        items: {
          updateMany: {
            where: { fulfillmentStatus: { notIn: ['Đã cấp đủ', 'Đã cấp một phần'] } },
            data: { fulfillmentStatus: 'Đã hủy' },
          },
        },
      },
      include: { items: true },
    });

    // Notify the requester (non-blocking)
    try {
      await notificationService.notify(NotificationEvent.SUPPLY_REQUEST_CANCELLED, {
        targetEmployeeIds: [request.employeeId],
        entityId: id,
        metadata: {
          maYeuCau: request.maYeuCau,
          supplyRequestId: id,
        },
      });
    } catch (e) {
      // Notifications must not fail the main operation
      console.error('Error sending cancel notification:', e);
    }

    return updated;
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
