-- DropIndex
DROP INDEX "common"."attendances_employeeId_attendanceDate_isOvertime_key";

-- CreateIndex
CREATE INDEX "attendances_employeeId_attendanceDate_isOvertime_idx" ON "common"."attendances"("employeeId", "attendanceDate", "isOvertime");
