// Relative imports (not path aliases) so prisma/seed-business.ts can import this service
// under plain ts-node, which does not resolve @config/* / @/* aliases.
import prisma from '../config/database';
import { WAREHOUSE_BASELINES, getBaseline } from '../constants/warehouseLayouts';

/**
 * Reconcile the DB with the CAD floor-plan baselines so each mapped warehouse has its
 * default lots (one per zone) and physical slots (one per pallet cell), with the codes
 * drawn on the plan (K1.1, K2.3...). Idempotent: re-running only fills in what is missing
 * and never deletes existing rows — user-created lots (zone = null) and entered goods are
 * left untouched. Source of truth for zones/slots/codes is backend/src/constants/warehouseLayouts.ts
 * (auto-generated from the frontend layout constants).
 */

export interface SyncStats {
  warehousesUpserted: number;
  lotsCreated: number;
  lotsExisting: number;
  slotsCreated: number;
  slotsExisting: number;
  kienCreated: number;
  kienExisting: number;
}

const emptyStats = (): SyncStats => ({
  warehousesUpserted: 0,
  lotsCreated: 0,
  lotsExisting: 0,
  slotsCreated: 0,
  slotsExisting: 0,
  kienCreated: 0,
  kienExisting: 0,
});

const slotId = (maKho: string, zone: string, code: string) => `WS-${maKho}-${zone}-${code}`;

async function syncOne(maKho: string): Promise<SyncStats> {
  const baseline = getBaseline(maKho);
  if (!baseline) return emptyStats();
  const stats = emptyStats();

  await prisma.$transaction(async (tx) => {
    // 1. Ensure the warehouse exists (id = maKho). Keep any existing tenKho/fields —
    //    update only tenKho so a renamed baseline propagates without clobbering user data.
    await tx.warehouses.upsert({
      where: { maKho },
      create: { id: maKho, maKho, tenKho: baseline.tenKho, trangThai: 'active', updatedAt: new Date() },
      update: { tenKho: baseline.tenKho },
    });
    stats.warehousesUpserted = 1;

    // 2. One baseline lot per zone. The partial unique index (warehouseId, zone) WHERE
    //    zone IS NOT NULL guarantees a single baseline lot per zone; user lots (zone null)
    //    are never matched or touched. Existence check first — a thrown unique violation
    //    would abort the whole Postgres transaction.
    for (const z of baseline.zones) {
      const existing = await tx.lot.findFirst({ where: { warehouseId: maKho, zone: z.zone } });
      if (existing) {
        stats.lotsExisting += 1;
        continue;
      }
      await tx.lot.create({ data: { tenLo: z.tenLo, zone: z.zone, warehouseId: maKho } });
      stats.lotsCreated += 1;
    }

    // 3. Physical slots. Deterministic id makes the existence check a clean no-op on
    //    re-run; we never overwrite an existing slot row.
    for (const s of baseline.slots) {
      const id = slotId(maKho, s.zone, s.code);
      const existing = await tx.warehouseSlot.findUnique({ where: { id } });
      if (existing) {
        stats.slotsExisting += 1;
        continue;
      }
      await tx.warehouseSlot.create({
        data: { id, warehouseId: maKho, zone: s.zone, code: s.code },
      });
      stats.slotsCreated += 1;
    }

    // 4. Fixed kiện (packages) — one per physical slot, in the zone's baseline lot.
    //    Each kiện gets maKien = the slot code printed on the CAD plan (K1.1…) and is
    //    pre-linked to its slot (slotId) with soLuong = 0 and no product yet. Receipts
    //    fill these kiện instead of creating ad-hoc rows. Idempotent: skip if the lot
    //    already has a kiện for this slot.
    for (const z of baseline.zones) {
      const lot = await tx.lot.findFirst({ where: { warehouseId: maKho, zone: z.zone } });
      if (!lot) continue; // zone lot missing (shouldn't happen after step 2)
      const zoneSlots = baseline.slots.filter((s) => s.zone === z.zone);
      for (const s of zoneSlots) {
        const slotDb = await tx.warehouseSlot.findUnique({ where: { id: slotId(maKho, s.zone, s.code) } });
        if (!slotDb) continue;
        const existing = await tx.lotProduct.findFirst({
          where: { lotId: lot.id, slotId: slotDb.id },
        });
        if (existing) {
          stats.kienExisting += 1;
          continue;
        }
        await tx.lotProduct.create({
          data: {
            lotId: lot.id,
            slotId: slotDb.id,
            maKien: s.code,
            soLuong: 0,
            donViTinh: '',
          },
        });
        stats.kienCreated += 1;
      }
    }
  });

  return stats;
}

/** Sync a single warehouse's baseline. Returns zeros if maKho has no CAD layout. */
export async function syncWarehouseLayout(maKho: string): Promise<SyncStats> {
  return syncOne(maKho);
}

/** Sync every warehouse that has a CAD floor plan. Aggregates per-warehouse stats. */
export async function syncAllWarehouseLayouts(): Promise<SyncStats> {
  const total = emptyStats();
  for (const b of WAREHOUSE_BASELINES) {
    const s = await syncOne(b.maKho);
    total.warehousesUpserted += s.warehousesUpserted;
    total.lotsCreated += s.lotsCreated;
    total.lotsExisting += s.lotsExisting;
    total.slotsCreated += s.slotsCreated;
    total.slotsExisting += s.slotsExisting;
  }
  return total;
}
