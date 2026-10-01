import { FaultRecordStatus, Prisma } from '@prisma/client';
import logger from '@config/logger';

/**
 * Close every FaultRecord linked to a repair request's items (→ DA_XU_LY).
 * Runs inside the caller's transaction; a failure on one record is logged and skipped
 * so it never rolls back the parent status change.
 */
export async function closeLinkedFaultRecords(
  tx: Prisma.TransactionClient,
  repairRequestId: number,
  maYeuCau: string,
  actorId: string | null,
): Promise<void> {
  const linkedItems = await tx.repairRequestItem.findMany({
    where: { repairRequestId, faultRecordId: { not: null } },
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
          actorId,
          reason: `Tự động từ yêu cầu sửa chữa: ${maYeuCau}`,
          source: 'auto_from_repair',
        },
      });
    } catch (cascadeErr) {
      logger.error(`[faultRecordCascade] close failed for id=${item.faultRecordId}`, cascadeErr);
    }
  }
}
