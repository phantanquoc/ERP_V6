// One-off data migration: fold legacy ad-hoc kiện ("chưa xếp vị trí") of baseline
// (CAD) lots into their physical slots, giving them the slot code (K1.1…) as maKien.
// Empty legacy kiện (soLuong = 0, no slot) are left untouched (may be referenced by
// slips). User-created lots (zone = null) are ignored.
//
// Run: npx ts-node --transpile-only prisma/scripts/migrate-fixed-kien.ts
import { PrismaClient } from '@prisma/client';
import { WAREHOUSE_BASELINES } from '../src/constants/warehouseLayouts';

const prisma = new PrismaClient();

async function main() {
  let folded = 0;
  for (const baseline of WAREHOUSE_BASELINES) {
    const lots = await prisma.lot.findMany({ where: { warehouseId: baseline.maKho, zone: { not: null } } });
    const lotByZone = new Map<string, (typeof lots)[number]>();
    lots.forEach((l) => { if (l.zone) lotByZone.set(l.zone, l); });

    for (const z of baseline.zones) {
      const lot = lotByZone.get(z.zone);
      if (!lot) continue;
      const slots = await prisma.warehouseSlot.findMany({
        where: { warehouseId: baseline.maKho, zone: z.zone },
        orderBy: { code: 'asc' },
      });
      // slots already claimed by any kiện of this lot
      const claimed = new Set<string>();
      const existing = await prisma.lotProduct.findMany({ where: { lotId: lot.id } });
      existing.forEach((lp) => { if (lp.slotId) claimed.add(lp.slotId); });

      const free = slots.filter((s) => !claimed.has(s.id));
      const legacy = existing.filter((lp) => lp.slotId === null && lp.soLuong > 0);
      for (const lp of legacy) {
        const s = free.shift();
        if (!s) break;
        await prisma.lotProduct.update({ where: { id: lp.id }, data: { slotId: s.id, maKien: s.code } });
        claimed.add(s.id);
        folded++;
      }
    }
  }
  console.log(`Folded ${folded} legacy kiện into slots.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
