-- CreateEnum
CREATE TYPE "common"."PositionCategory" AS ENUM ('PRODUCTION', 'OFFICE', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "common"."EvaluationMode" AS ENUM ('QUICK', 'FULL');

-- CreateEnum
CREATE TYPE "common"."EvaluationAuditAction" AS ENUM ('SCORE_UPDATE', 'COMMENT_UPDATE', 'STATUS_TRANSITION', 'NA_TOGGLE', 'APPEAL_SUBMIT', 'APPEAL_REPLY', 'EVIDENCE_ADD', 'EVIDENCE_DELETE', 'GOAL_UPDATE', 'IDP_UPDATE', 'PEER_INVITE', 'PEER_SUBMIT');

-- CreateEnum
CREATE TYPE "common"."PeerInviteStatus" AS ENUM ('PENDING', 'SUBMITTED', 'DECLINED', 'EXPIRED');

-- AlterTable
ALTER TABLE "common"."evaluation_details" DROP COLUMN "comment",
ADD COLUMN     "commentEmployee" TEXT,
ADD COLUMN     "commentSup1" TEXT,
ADD COLUMN     "commentSup2" TEXT,
ADD COLUMN     "notApplicable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "common"."evaluations" ADD COLUMN     "appealComment" TEXT,
ADD COLUMN     "appealRespondedAt" TIMESTAMP(3),
ADD COLUMN     "appealResponderId" VARCHAR(30),
ADD COLUMN     "appealResponse" TEXT,
ADD COLUMN     "appealedAt" TIMESTAMP(3),
ADD COLUMN     "commentEmployee" TEXT,
ADD COLUMN     "commentSup1" TEXT,
ADD COLUMN     "commentSup2" TEXT,
ADD COLUMN     "mode" "common"."EvaluationMode" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "selfScorePercentage" DOUBLE PRECISION,
ADD COLUMN     "sup1Percentage" DOUBLE PRECISION,
ADD COLUMN     "sup2Percentage" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "common"."positions" ADD COLUMN     "category" "common"."PositionCategory" NOT NULL DEFAULT 'OFFICE';

-- CreateTable
CREATE TABLE "common"."evaluation_evidences" (
    "id" TEXT NOT NULL,
    "evaluationDetailId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."evaluation_goals" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetPeriod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."evaluation_idp_items" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "skill" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_idp_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."evaluation_audit_logs" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "evaluationDetailId" TEXT,
    "changedByUserId" TEXT,
    "action" "common"."EvaluationAuditAction" NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."peer_feedback_invites" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "inviteeUserId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "status" "common"."PeerInviteStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "peer_feedback_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."evaluation_peer_feedbacks" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "weakness" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_peer_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evaluation_evidences_evaluationDetailId_idx" ON "common"."evaluation_evidences"("evaluationDetailId");

-- CreateIndex
CREATE INDEX "evaluation_goals_evaluationId_orderIndex_idx" ON "common"."evaluation_goals"("evaluationId", "orderIndex");

-- CreateIndex
CREATE INDEX "evaluation_idp_items_evaluationId_orderIndex_idx" ON "common"."evaluation_idp_items"("evaluationId", "orderIndex");

-- CreateIndex
CREATE INDEX "evaluation_audit_logs_evaluationId_createdAt_idx" ON "common"."evaluation_audit_logs"("evaluationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "evaluation_audit_logs_evaluationDetailId_idx" ON "common"."evaluation_audit_logs"("evaluationDetailId");

-- CreateIndex
CREATE UNIQUE INDEX "peer_feedback_invites_token_key" ON "common"."peer_feedback_invites"("token");

-- CreateIndex
CREATE INDEX "peer_feedback_invites_token_idx" ON "common"."peer_feedback_invites"("token");

-- CreateIndex
CREATE INDEX "peer_feedback_invites_evaluationId_idx" ON "common"."peer_feedback_invites"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "peer_feedback_invites_evaluationId_inviteeUserId_key" ON "common"."peer_feedback_invites"("evaluationId", "inviteeUserId");

-- CreateIndex
CREATE INDEX "evaluation_peer_feedbacks_evaluationId_idx" ON "common"."evaluation_peer_feedbacks"("evaluationId");

-- AddForeignKey
ALTER TABLE "common"."evaluation_evidences" ADD CONSTRAINT "evaluation_evidences_evaluationDetailId_fkey" FOREIGN KEY ("evaluationDetailId") REFERENCES "common"."evaluation_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_goals" ADD CONSTRAINT "evaluation_goals_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "common"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_idp_items" ADD CONSTRAINT "evaluation_idp_items_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "common"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_audit_logs" ADD CONSTRAINT "evaluation_audit_logs_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "common"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_audit_logs" ADD CONSTRAINT "evaluation_audit_logs_evaluationDetailId_fkey" FOREIGN KEY ("evaluationDetailId") REFERENCES "common"."evaluation_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."peer_feedback_invites" ADD CONSTRAINT "peer_feedback_invites_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "common"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_peer_feedbacks" ADD CONSTRAINT "evaluation_peer_feedbacks_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "common"."evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
