-- CreateEnum
CREATE TYPE "common"."MeetingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "common"."notifications" ADD COLUMN     "meetingId" TEXT,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "overtimePlanId" TEXT,
ADD COLUMN     "payrollId" TEXT,
ADD COLUMN     "supplyAdjustmentId" TEXT,
ADD COLUMN     "supplyRequestId" TEXT,
ADD COLUMN     "warehouseReceiptId" TEXT;

-- CreateTable
CREATE TABLE "common"."meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agenda" TEXT,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "notes" TEXT,
    "status" "common"."MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "departmentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."meeting_participants" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meeting_participants_meetingId_employeeId_key" ON "common"."meeting_participants"("meetingId", "employeeId");

-- AddForeignKey
ALTER TABLE "common"."meeting_participants" ADD CONSTRAINT "meeting_participants_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "common"."meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."meeting_participants" ADD CONSTRAINT "meeting_participants_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
