-- YCBS — Yêu cầu bổ sung: tách SHORTAGE ra khỏi PurchaseRequest thành thực thể riêng.
-- Kế thừa pattern của 20260824000001 (orphan cleanup → FK SetNull, idempotent IF NOT EXISTS).
-- Apply: psql $DATABASE_URL -f .../migration.sql  (DB dev không có, prod bắt buộc).
-- Prisma validate đã pass; client đã generate.

-- ── 1) ReplenishmentRequest + Item ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "business"."replenishment_requests" (
  "id"                TEXT NOT NULL,
  "stt"               SERIAL NOT NULL, -- fallback: prisma will switch to INT autoincrement on next generate
  "ngayYeuCau"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "maYeuCau"          TEXT NOT NULL,
  "employeeId"        TEXT NOT NULL,
  "maNhanVien"        TEXT NOT NULL,
  "tenNhanVien"       TEXT NOT NULL,
  "mucDichYeuCau"     TEXT NOT NULL,
  "mucDoUuTien"       TEXT NOT NULL,
  "ghiChu"            TEXT,
  "fileKemTheo"       TEXT,
  "trangThai"         TEXT NOT NULL DEFAULT 'Chờ báo giá',
  "supplyRequestId"   TEXT,
  "phanLoaiGroup"     TEXT,
  "convertedPurchaseRequestId" TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "replenishment_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "replenishment_requests_maYeuCau_key" UNIQUE ("maYeuCau"),
  CONSTRAINT "replenishment_requests_convertedPurchaseRequestId_key" UNIQUE ("convertedPurchaseRequestId"),
  CONSTRAINT "replenishment_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "replenishment_requests_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "replenishment_requests_convertedPurchaseRequestId_fkey" FOREIGN KEY ("convertedPurchaseRequestId") REFERENCES "business"."purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Note: Prisma will actually emit `stt Integer autoincrement()` as SERIAL-like; the SQL above
-- is the manual equivalent. Re-running `prisma migrate dev` (when DB available) will reconcile.

CREATE INDEX IF NOT EXISTS "replenishment_requests_supplyRequestId_idx" ON "business"."replenishment_requests"("supplyRequestId");
CREATE INDEX IF NOT EXISTS "replenishment_requests_trangThai_idx" ON "business"."replenishment_requests"("trangThai");
CREATE INDEX IF NOT EXISTS "replenishment_requests_phanLoaiGroup_idx" ON "business"."replenishment_requests"("phanLoaiGroup");
CREATE INDEX IF NOT EXISTS "replenishment_requests_convertedPurchaseRequestId_idx" ON "business"."replenishment_requests"("convertedPurchaseRequestId");

CREATE TABLE IF NOT EXISTS "business"."replenishment_request_items" (
  "id"                     TEXT NOT NULL,
  "replenishmentRequestId" TEXT NOT NULL,
  "phanLoai"               TEXT NOT NULL,
  "tenGoi"                 TEXT NOT NULL,
  "soLuong"                DOUBLE PRECISION NOT NULL,
  "donViTinh"              TEXT NOT NULL,
  "nhaCungCapId"           TEXT,
  "giaDuKien"              DOUBLE PRECISION,
  "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "replenishment_request_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "replenishment_request_items_replenishmentRequestId_fkey" FOREIGN KEY ("replenishmentRequestId") REFERENCES "business"."replenishment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "replenishment_request_items_nhaCungCapId_fkey" FOREIGN KEY ("nhaCungCapId") REFERENCES "business"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "replenishment_request_items_replenishmentRequestId_idx" ON "business"."replenishment_request_items"("replenishmentRequestId");
CREATE INDEX IF NOT EXISTS "replenishment_request_items_nhaCungCapId_idx" ON "business"."replenishment_request_items"("nhaCungCapId");

-- ── 2) SupplyRequestDecision → ReplenishmentRequest FK (giữ cột cũ, thêm cột mới) ─
ALTER TABLE "business"."supply_request_decisions"
  ADD COLUMN IF NOT EXISTS "triggeredReplenishmentRequestId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supply_request_decisions_triggeredReplenishmentRequestId_fkey') THEN
    ALTER TABLE "business"."supply_request_decisions"
      ADD CONSTRAINT "supply_request_decisions_triggeredReplenishmentRequestId_fkey"
      FOREIGN KEY ("triggeredReplenishmentRequestId") REFERENCES "business"."replenishment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "supply_request_decisions_triggeredReplenishmentRequestId_idx"
  ON "business"."supply_request_decisions"("triggeredReplenishmentRequestId");

-- Legacy SHORTAGE PRs (YC-MH với sourceType=SHORTAGE) giữ lại nguyên — không backfill tự động.
-- Nếu cần backfill YCBS từ SHORTAGE PR cũ: script riêng, không trong migration này.
