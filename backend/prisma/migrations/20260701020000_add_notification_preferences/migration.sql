-- CreateTable
CREATE TABLE "common"."notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "common"."notification_preferences"("userId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "notification_preferences_userId_notificationType_key" ON "common"."notification_preferences"("userId", "notificationType");

-- AddForeignKey
ALTER TABLE "common"."notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
