-- Add machineId and tenMay columns to finished_products table
ALTER TABLE "business"."finished_products" 
ADD COLUMN IF NOT EXISTS "machineId" TEXT,
ADD COLUMN IF NOT EXISTS "tenMay" TEXT;

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'finished_products_machineId_fkey'
    ) THEN
        ALTER TABLE "business"."finished_products" 
        ADD CONSTRAINT "finished_products_machineId_fkey" 
        FOREIGN KEY ("machineId") 
        REFERENCES "business"."machines"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Add unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'finished_products_maChien_machineId_key'
    ) THEN
        ALTER TABLE "business"."finished_products" 
        ADD CONSTRAINT "finished_products_maChien_machineId_key" 
        UNIQUE ("maChien", "machineId");
    END IF;
END $$;

-- Verify changes
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'business' 
  AND table_name = 'finished_products'
  AND column_name IN ('machineId', 'tenMay');

