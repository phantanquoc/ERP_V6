-- AlterTable: purchase_requests — add quick-purchase flag + source classification
ALTER TABLE "business"."purchase_requests"
  ADD COLUMN "isQuickPurchase" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'MANUAL';

-- AlterTable: supply_request_items — track per-item fulfillment
ALTER TABLE "business"."supply_request_items"
  ADD COLUMN "fulfilledQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "fulfillmentStatus" TEXT NOT NULL DEFAULT 'Chờ xử lý';

-- CreateTable: product_reorder_rules — auto-alert when stock drops below minStock
CREATE TABLE "business"."product_reorder_rules" (
    "id" TEXT NOT NULL,
    "internationalProductId" TEXT NOT NULL,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preferredSupplierId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "cooldownHours" INTEGER NOT NULL DEFAULT 24,
    "lastAlertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reorder_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: supply_request_decisions — audit trail for warehouse fulfillment decisions
CREATE TABLE "business"."supply_request_decisions" (
    "id" TEXT NOT NULL,
    "supplyRequestItemId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "fulfilledQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shortageQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "decidedByEmployeeId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredPurchaseRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_request_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_reorder_rules_internationalProductId_key" ON "business"."product_reorder_rules"("internationalProductId");
CREATE INDEX "product_reorder_rules_active_idx" ON "business"."product_reorder_rules"("active");
CREATE INDEX "supply_request_decisions_supplyRequestItemId_idx" ON "business"."supply_request_decisions"("supplyRequestItemId");
CREATE INDEX "supply_request_decisions_decidedByEmployeeId_idx" ON "business"."supply_request_decisions"("decidedByEmployeeId");

-- AddForeignKey
ALTER TABLE "business"."product_reorder_rules"
  ADD CONSTRAINT "product_reorder_rules_internationalProductId_fkey"
  FOREIGN KEY ("internationalProductId") REFERENCES "business"."international_products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "business"."supply_request_decisions"
  ADD CONSTRAINT "supply_request_decisions_supplyRequestItemId_fkey"
  FOREIGN KEY ("supplyRequestItemId") REFERENCES "business"."supply_request_items"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
