-- Add isNewProduct flag to supply_request_items
ALTER TABLE "business"."supply_request_items" ADD COLUMN "isNewProduct" BOOLEAN NOT NULL DEFAULT false;
