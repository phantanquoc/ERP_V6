DROP INDEX IF EXISTS "common"."attendances_employeeId_attendanceDate_isOvertime_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "attendances_employeeId_attendanceDate_isOvertime_key" ON "common"."attendances"("employeeId", "attendanceDate", "isOvertime");

