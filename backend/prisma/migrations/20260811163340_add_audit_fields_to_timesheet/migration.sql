-- Add audit fields to timesheet tables
-- Track who updated each cell and override record

-- AlterTable: TimesheetCell
ALTER TABLE "common"."timesheet_cells"
ADD COLUMN "updatedBy" TEXT,
ADD COLUMN "updatedByName" TEXT;

-- AlterTable: MonthlyTimesheetOverride
ALTER TABLE "common"."monthly_timesheet_overrides"
ADD COLUMN "updatedBy" TEXT,
ADD COLUMN "updatedByName" TEXT;
