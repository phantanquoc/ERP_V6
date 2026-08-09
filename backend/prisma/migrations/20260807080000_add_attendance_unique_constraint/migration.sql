-- CreateIndex
CREATE UNIQUE INDEX "attendances_employeeId_attendanceDate_isOvertime_key" ON "common"."attendances"("employeeId", "attendanceDate", "isOvertime");
