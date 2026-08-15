-- Add physical-zone link to lots so baseline lots mirror the CAD floor plan
-- (one baseline lot per zone, e.g. 'LO3', 'DAUCHIEN-LO1'). User-created lots
-- ("Thêm lô") keep zone = NULL.

-- AlterTable
ALTER TABLE "business"."lots" ADD COLUMN "zone" TEXT;

-- Partial unique index: at most one baseline lot per (warehouse, zone), while any
-- number of user lots with zone = NULL can coexist. Prisma cannot express partial
-- indexes, so this is hand-written; the schema only declares `zone String?`.
CREATE UNIQUE INDEX "lots_warehouseId_zone_key" ON "business"."lots"("warehouseId", "zone") WHERE "zone" IS NOT NULL;
