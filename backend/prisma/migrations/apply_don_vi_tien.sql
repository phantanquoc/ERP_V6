ALTER TABLE business.general_costs ADD COLUMN IF NOT EXISTS "donViTien" TEXT DEFAULT 'VND';
ALTER TABLE business.export_costs ADD COLUMN IF NOT EXISTS "donViTien" TEXT DEFAULT 'VND';

