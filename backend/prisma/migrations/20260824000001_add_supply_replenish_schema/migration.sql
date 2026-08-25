-- Batch A — supply replenishment and purchase flow schema fixes (tasks 1.1–1.5)
-- Offline-safe: migration.sql is checked in, but `prisma migrate dev` cannot auto-apply
-- against the dev DB until the shadow-DB/baseline drift is resolved (baseline history vs
-- live schema diverge). Apply manually: `psql $DATABASE_URL -f .../migration.sql` or
-- re-baseline the shadow. `npx prisma validate` passes; the diff below is idempotent
-- (all ADD COLUMN/INDEX use IF NOT EXISTS semantics or catch duplicate_object).

-- ── 1.1 Supplier: normalize dirty phanLoaiNCC, add CHECK + index ───────────────
-- Normalize: trim whitespace, 'nvl'/'Nvl' → 'NVL', empty → 'NVL' (default)
UPDATE "business"."suppliers"
SET "phanLoaiNCC" = CASE
  WHEN btrim("phanLoaiNCC") ILIKE 'nvl' THEN 'NVL'
  WHEN btrim("phanLoaiNCC") ILIKE 'thiết bị' OR btrim("phanLoaiNCC") ILIKE 'thiet bi' THEN 'Thiết bị'
  WHEN btrim("phanLoaiNCC") = '' OR "phanLoaiNCC" IS NULL THEN 'NVL'
  ELSE btrim("phanLoaiNCC")
END
WHERE "phanLoaiNCC" IS DISTINCT FROM btrim("phanLoaiNCC")
   OR "phanLoaiNCC" ILIKE 'nvl'
   OR "phanLoaiNCC" ILIKE 'thiet bi'
   OR btrim("phanLoaiNCC") = '';

-- Remove any rows that still don't satisfy the CHECK before adding the constraint
-- (should be zero after the UPDATE above; this DELETE is a safety net and logs).
-- Uncomment if you prefer to fail instead of silently fixing:
-- SELECT * FROM "business"."suppliers" WHERE "phanLoaiNCC" NOT IN ('NVL','Thiết bị');
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "business"."suppliers" WHERE "phanLoaiNCC" NOT IN ('NVL','Thiết bị')) THEN
    RAISE WARNING 'suppliers.phanLoaiNCC has % rows outside (NVL, Thiết bị) — normalizing to NVL before CHECK', (SELECT COUNT(*) FROM "business"."suppliers" WHERE "phanLoaiNCC" NOT IN ('NVL','Thiết bị'));
    UPDATE "business"."suppliers" SET "phanLoaiNCC" = 'NVL' WHERE "phanLoaiNCC" NOT IN ('NVL','Thiết bị');
  END IF;
END $$;

-- CHECK constraint (business.suppliers_phanLoaiNCC_check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'suppliers_phanLoaiNCC_check'
      AND conrelid = 'business.suppliers'::regclass
  ) THEN
    ALTER TABLE "business"."suppliers"
      ADD CONSTRAINT "suppliers_phanLoaiNCC_check"
      CHECK ("phanLoaiNCC" IN ('NVL','Thiết bị'));
  END IF;
END $$;

-- @@index([phanLoaiNCC]) on Supplier
CREATE INDEX IF NOT EXISTS "suppliers_phanLoaiNCC_idx" ON "business"."suppliers"("phanLoaiNCC");

-- ── 1.2 Missing indexes + warehouses.updatedAt fix ─────────────────────────────
-- SupplyRequestItem.supplyRequestId
CREATE INDEX IF NOT EXISTS "supply_request_items_supplyRequestId_idx" ON "business"."supply_request_items"("supplyRequestId");

-- PurchaseRequest: employeeId, supplyRequestId, nhaCungCapId, trangThai, sourceType
CREATE INDEX IF NOT EXISTS "purchase_requests_employeeId_idx"      ON "business"."purchase_requests"("employeeId");
CREATE INDEX IF NOT EXISTS "purchase_requests_supplyRequestId_idx" ON "business"."purchase_requests"("supplyRequestId");
CREATE INDEX IF NOT EXISTS "purchase_requests_nhaCungCapId_idx"    ON "business"."purchase_requests"("nhaCungCapId");
CREATE INDEX IF NOT EXISTS "purchase_requests_trangThai_idx"       ON "business"."purchase_requests"("trangThai");
CREATE INDEX IF NOT EXISTS "purchase_requests_sourceType_idx"      ON "business"."purchase_requests"("sourceType");

-- PurchaseRequestItem: purchaseRequestId, nhaCungCapId
CREATE INDEX IF NOT EXISTS "purchase_request_items_purchaseRequestId_idx" ON "business"."purchase_request_items"("purchaseRequestId");
CREATE INDEX IF NOT EXISTS "purchase_request_items_nhaCungCapId_idx"      ON "business"."purchase_request_items"("nhaCungCapId");

-- LotProduct: lotId, internationalProductId
CREATE INDEX IF NOT EXISTS "lot_products_lotId_idx"                   ON "business"."lot_products"("lotId");
CREATE INDEX IF NOT EXISTS "lot_products_internationalProductId_idx"  ON "business"."lot_products"("internationalProductId");

-- WarehouseReceipt/Issue supplyRequestId
CREATE INDEX IF NOT EXISTS "warehouse_receipts_supplyRequestId_idx" ON "business"."warehouse_receipts"("supplyRequestId");
CREATE INDEX IF NOT EXISTS "warehouse_issues_supplyRequestId_idx"  ON "business"."warehouse_issues"("supplyRequestId");

-- SupplyRequestDecision.triggeredPurchaseRequestId (also covers 1.3)
CREATE INDEX IF NOT EXISTS "supply_request_decisions_triggeredPurchaseRequestId_idx" ON "business"."supply_request_decisions"("triggeredPurchaseRequestId");

-- warehouses.updatedAt — must be @updatedAt (auto-set). Data fix: backfill nulls first,
-- then add DEFAULT now() so Prisma's @updatedAt has a backing default.
UPDATE "business"."warehouses" SET "updatedAt" = COALESCE("updatedAt", "createdAt", NOW()) WHERE "updatedAt" IS NULL;
ALTER TABLE "business"."warehouses" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
-- Keep column NOT NULL semantics consistent with other tables (warehouses is the only one without @updatedAt default)
-- No NOT NULL enforcement change here — just ensure future writes get a timestamp even if client omits it.

-- ── 1.3 SupplyRequestDecision.triggeredPurchaseRequestId → real FK ────────────
-- Orphan cleanup: null out dangling references before adding FK
UPDATE "business"."supply_request_decisions" d
SET "triggeredPurchaseRequestId" = NULL
WHERE d."triggeredPurchaseRequestId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "business"."purchase_requests" p
    WHERE p.id = d."triggeredPurchaseRequestId"
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supply_request_decisions_triggeredPurchaseRequestId_fkey'
      AND conrelid = 'business.supply_request_decisions'::regclass
  ) THEN
    ALTER TABLE "business"."supply_request_decisions"
      ADD CONSTRAINT "supply_request_decisions_triggeredPurchaseRequestId_fkey"
      FOREIGN KEY ("triggeredPurchaseRequestId")
      REFERENCES "business"."purchase_requests"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 1.4 Unique + CHECK guards ─────────────────────────────────────────────────
-- @@unique([receiptId, stt]) — one stt per receipt
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'warehouse_receipt_items_receiptId_stt_key'
      AND conrelid = 'business.warehouse_receipt_items'::regclass
  ) THEN
    -- Pre-check duplicates before creating unique constraint
    IF EXISTS (
      SELECT 1 FROM (
        SELECT "receiptId", stt, COUNT(*) AS c
        FROM "business"."warehouse_receipt_items"
        GROUP BY "receiptId", stt HAVING COUNT(*) > 1
      ) t
    ) THEN
      RAISE EXCEPTION 'Duplicate (receiptId,stt) rows exist in warehouse_receipt_items — resolve before migration';
    END IF;
    ALTER TABLE "business"."warehouse_receipt_items"
      ADD CONSTRAINT "warehouse_receipt_items_receiptId_stt_key" UNIQUE ("receiptId", stt);
  END IF;
END $$;

-- @@unique([issueId, stt]) — one stt per issue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'warehouse_issue_items_issueId_stt_key'
      AND conrelid = 'business.warehouse_issue_items'::regclass
  ) THEN
    IF EXISTS (
      SELECT 1 FROM (
        SELECT "issueId", stt, COUNT(*) AS c
        FROM "business"."warehouse_issue_items"
        GROUP BY "issueId", stt HAVING COUNT(*) > 1
      ) t
    ) THEN
      RAISE EXCEPTION 'Duplicate (issueId,stt) rows exist in warehouse_issue_items — resolve before migration';
    END IF;
    ALTER TABLE "business"."warehouse_issue_items"
      ADD CONSTRAINT "warehouse_issue_items_issueId_stt_key" UNIQUE ("issueId", stt);
  END IF;
END $$;

-- LotProduct.soLuong >= 0 — CHECK guard (design choice: DB-level CHECK, chosen over
-- Prisma-only guard so concurrent raw updates cannot bypass it; see design D7).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lot_products_soLuong_non_negative'
      AND conrelid = 'business.lot_products'::regclass
  ) THEN
    IF EXISTS (SELECT 1 FROM "business"."lot_products" WHERE "soLuong" < 0) THEN
      RAISE EXCEPTION 'lot_products.soLuong has negative rows — fix data before adding CHECK';
    END IF;
    ALTER TABLE "business"."lot_products"
      ADD CONSTRAINT "lot_products_soLuong_non_negative" CHECK ("soLuong" >= 0);
  END IF;
END $$;

-- LotProduct @@unique([lotId, internationalProductId]) WHERE internationalProductId IS NOT NULL
-- Prisma's @@unique is unconditional and would block the intentional per-slot duplicates
-- on fixed kiện (same lot+product across many pallet slots with distinct maKien/slotId).
-- So keep NO Prisma-level @@unique; enforce idempotence only for ad-hoc overflow kiện
-- (slotId IS NULL) via a partial unique index, matching resolveOrCreateLotProduct intent.
-- Existing fixed-kiện duplicates (e.g. KHOTP LO1 with 12 kiện of one product) are legitimate
-- and must NOT be blocked.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'lot_products_lotId_internationalProductId_ad_hoc_key'
      AND n.nspname = 'business'
  ) THEN
    -- Verify no ad-hoc duplicates exist (slotId IS NULL) before creating the index
    IF EXISTS (
      SELECT 1 FROM (
        SELECT "lotId", "internationalProductId", COUNT(*) AS c
        FROM "business"."lot_products"
        WHERE "internationalProductId" IS NOT NULL AND "slotId" IS NULL
        GROUP BY "lotId", "internationalProductId" HAVING COUNT(*) > 1
      ) t
    ) THEN
      RAISE EXCEPTION 'Duplicate ad-hoc (lotId,internationalProductId) with slotId IS NULL exists — resolve before migration';
    END IF;
    CREATE UNIQUE INDEX "lot_products_lotId_internationalProductId_ad_hoc_key"
      ON "business"."lot_products"("lotId", "internationalProductId")
      WHERE "internationalProductId" IS NOT NULL AND "slotId" IS NULL;
  END IF;
END $$;

-- ── 1.5 — no schema change (status sequence is app-level: backend/src/services/supplyRequestService.ts) ──
