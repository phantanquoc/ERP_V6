-- CreateEnum
CREATE TYPE "common"."FeedbackType" AS ENUM ('GOP_Y', 'NEU_KHO_KHAN');

-- CreateEnum
CREATE TYPE "common"."FeedbackStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "common"."private_feedbacks" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "common"."FeedbackType" NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "notes" TEXT,
    "purpose" TEXT,
    "solution" TEXT,
    "attachments" TEXT[],
    "status" "common"."FeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "respondedBy" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "private_feedbacks_code_key" ON "common"."private_feedbacks"("code");

-- AddForeignKey
ALTER TABLE "common"."private_feedbacks" ADD CONSTRAINT "private_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

