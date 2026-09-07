-- Relax unnecessary NOT NULL constraints on supplier fields
-- quocGia and emailLienHe are not always known at creation time (small vendors, domestic only).
-- Existing rows already have values, so no data fix needed — just allow future NULL.
ALTER TABLE "business"."suppliers" ALTER COLUMN "quocGia" DROP NOT NULL;
ALTER TABLE "business"."suppliers" ALTER COLUMN "emailLienHe" DROP NOT NULL;
