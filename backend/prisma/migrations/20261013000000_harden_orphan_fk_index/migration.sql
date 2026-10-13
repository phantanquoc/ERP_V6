-- Phase 2: Harden orphan FK + unique (audit prod 0 orphan/0 duplicate)
-- Strategy: NOT VALID so migration passes instantly; VALIDATE manually after.
-- Cross-schema FKs added via schema @relation — Prisma generates them on migrate dev.
-- This migration adds the FK/unique that Prisma would generate for NOT VALID case.

-- FK: repair_supply_links.supply_request_id -> business.supply_requests(id)
ALTER TABLE "common"."repair_supply_links"
  ADD CONSTRAINT "repair_supply_links_supply_request_id_fkey"
  FOREIGN KEY ("supply_request_id") REFERENCES "business"."supply_requests"("id") ON DELETE CASCADE NOT VALID;

-- FK: acceptance_handovers.warehouse_issue_id -> business.warehouse_issues(id)
ALTER TABLE "common"."acceptance_handovers"
  ADD CONSTRAINT "acceptance_handovers_warehouse_issue_id_fkey"
  FOREIGN KEY ("warehouse_issue_id") REFERENCES "business"."warehouse_issues"("id") ON DELETE SET NULL NOT VALID;

-- Unique: one supply_request at most once per repair_request
ALTER TABLE "common"."repair_supply_links"
  ADD CONSTRAINT "repair_supply_links_repair_request_supply_unique"
  UNIQUE ("repair_request_id", "supply_request_id") NOT VALID;

-- Post-deploy on prod (manual, outside Prisma migrate):
--   ALTER TABLE "common"."repair_supply_links" VALIDATE CONSTRAINT "repair_supply_links_supply_request_id_fkey";
--   ALTER TABLE "common"."acceptance_handovers" VALIDATE CONSTRAINT "acceptance_handovers_warehouse_issue_id_fkey";
--   ALTER TABLE "common"."repair_supply_links" VALIDATE CONSTRAINT "repair_supply_links_repair_request_supply_unique";
