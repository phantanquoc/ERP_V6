-- CreateEnum
CREATE TYPE "auth"."BlockReason" AS ENUM ('TOO_MANY_FAILED_ATTEMPTS', 'MANUAL', 'OTHER');

-- CreateTable
CREATE TABLE "auth"."login_attempts" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "email" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."blocked_ips" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "reason" "auth"."BlockReason" NOT NULL DEFAULT 'TOO_MANY_FAILED_ATTEMPTS',
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "unblockedAt" TIMESTAMP(3),
    "unblockedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "blocked_ips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_attempts_ipAddress_idx" ON "auth"."login_attempts"("ipAddress");

-- CreateIndex
CREATE INDEX "login_attempts_expiresAt_idx" ON "auth"."login_attempts"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_ips_ipAddress_key" ON "auth"."blocked_ips"("ipAddress");

-- CreateIndex
CREATE INDEX "blocked_ips_ipAddress_idx" ON "auth"."blocked_ips"("ipAddress");

-- CreateIndex
CREATE INDEX "blocked_ips_expiresAt_idx" ON "auth"."blocked_ips"("expiresAt");
