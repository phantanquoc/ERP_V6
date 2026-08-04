-- AlterTable
ALTER TABLE "common"."attendances" ADD COLUMN     "shift" INTEGER;

-- CreateIndex
CREATE INDEX "attendances_attendanceDate_shift_idx" ON "common"."attendances"("attendanceDate", "shift");

-- Backfill from notes, where the shift has been recorded as free text since the
-- check-in flow started writing it. Prefer this over re-deriving from checkInTime:
-- the shift check-in windows were changed on 2026-07-06, so re-deriving would score
-- older scans against windows that did not exist when they happened.
--
-- The pattern anchors "Ca N" at the start of the note or after the "·" separator
-- ("⚠ Quên chấm ra · Ca 2"), and requires a boundary after the digit so a trailing
-- comment survives ("Ca 1 - Phúc cập nhật - lỗi mạng"). Case-sensitive on purpose:
-- lowercase "ca 3" appears inside prose about overtime plans
-- ("Tăng ca theo kế hoạch: lựa hàng ca 3 các ngày 23,24,25/6") and is NOT a shift.
--
-- Idempotent via the IS NULL guard.
UPDATE "common"."attendances"
SET "shift" = (regexp_match("notes", '(?:^|· )Ca ([123])(?: |$|-)'))[1]::int
WHERE "shift" IS NULL
  AND "notes" ~ '(?:^|· )Ca [123](?: |$|-)';
