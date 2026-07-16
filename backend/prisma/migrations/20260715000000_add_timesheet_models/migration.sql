-- CreateTable
CREATE TABLE "common"."holidays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."attendance_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."timesheet_cells" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "note" TEXT,
    "workHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timesheet_cells_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_codes_code_key" ON "common"."attendance_codes"("code");

-- CreateIndex
CREATE INDEX "timesheet_cells_employeeId_idx" ON "common"."timesheet_cells"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "timesheet_cells_employeeId_date_key" ON "common"."timesheet_cells"("employeeId", "date");

-- AlterTable
ALTER TABLE "common"."payroll_settings"
ADD COLUMN     "mealAllowancePerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "overtimeMealAllowance" DOUBLE PRECISION NOT NULL DEFAULT 25000,
ADD COLUMN     "sundayMealAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "fuelPricePerKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "otRateWeekday" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
ADD COLUMN     "otRateWeekdayExtra" DOUBLE PRECISION NOT NULL DEFAULT 2.1,
ADD COLUMN     "otRateSunday" DOUBLE PRECISION NOT NULL DEFAULT 2,
ADD COLUMN     "otRateSundayExtra" DOUBLE PRECISION NOT NULL DEFAULT 2.7,
ADD COLUMN     "otRateHoliday" DOUBLE PRECISION NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "common"."employees"
ADD COLUMN     "kmDistance" DOUBLE PRECISION,
ADD COLUMN     "leaveBalanceCarryOver" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "common"."timesheet_cells" ADD CONSTRAINT "timesheet_cells_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
