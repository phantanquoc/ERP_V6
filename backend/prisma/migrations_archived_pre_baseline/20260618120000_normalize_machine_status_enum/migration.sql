-- Migration: Normalize MachineStatus enum values to ASCII
--
-- BEFORE: HOAT_DONG, BẢO_TRÌ, NGỪNG_HOẠT_ĐỘNG  (Vietnamese diacritics)
-- AFTER:  HOAT_DONG, BAO_TRI, NGUNG_HOAT_DONG    (ASCII)
--
-- Reason: Frontend type definitions, AI registry filters, and external API
-- clients all use ASCII keys. The diacritic enum values caused a 400
-- "Trạng thái máy không hợp lệ" rejection on POST /api/machine-systems/:id/status.
--
-- ALTER TYPE ... RENAME VALUE preserves all existing rows and indexes —
-- this is a metadata-only rename, no row scan required.

BEGIN;

ALTER TYPE "business"."MachineStatus" RENAME VALUE 'BẢO_TRÌ' TO 'BAO_TRI';
ALTER TYPE "business"."MachineStatus" RENAME VALUE 'NGỪNG_HOẠT_ĐỘNG' TO 'NGUNG_HOAT_DONG';

COMMIT;
