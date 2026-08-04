-- AlterTable: Add foreign key constraints from WarehouseReceipt and WarehouseIssue to LotProduct

-- Add FK for WarehouseReceipt.lotProductId -> LotProduct.id (onDelete: RESTRICT)
ALTER TABLE "business"."warehouse_receipts" 
ADD CONSTRAINT "warehouse_receipts_lotProductId_fkey" 
FOREIGN KEY ("lotProductId") REFERENCES "business"."lot_products"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add FK for WarehouseIssue.lotProductId -> LotProduct.id (onDelete: RESTRICT)
ALTER TABLE "business"."warehouse_issues" 
ADD CONSTRAINT "warehouse_issues_lotProductId_fkey" 
FOREIGN KEY ("lotProductId") REFERENCES "business"."lot_products"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;
