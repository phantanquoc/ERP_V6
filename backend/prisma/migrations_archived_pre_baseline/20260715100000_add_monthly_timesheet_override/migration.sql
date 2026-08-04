-- CreateTable
CREATE TABLE "common"."monthly_timesheet_overrides" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_timesheet_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_timesheet_overrides_employeeId_month_year_idx" ON "common"."monthly_timesheet_overrides"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_timesheet_overrides_employeeId_month_year_fieldKey_key" ON "common"."monthly_timesheet_overrides"("employeeId", "month", "year", "fieldKey");

-- AddForeignKey
ALTER TABLE "common"."monthly_timesheet_overrides" ADD CONSTRAINT "monthly_timesheet_overrides_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
