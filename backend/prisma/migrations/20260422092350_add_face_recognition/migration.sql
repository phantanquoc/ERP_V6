-- CreateTable
CREATE TABLE "common"."face_profiles" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."face_images" (
    "id" TEXT NOT NULL,
    "faceProfileId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "embedding" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."face_attendance_logs" (
    "id" TEXT NOT NULL,
    "faceProfileId" TEXT,
    "employeeId" TEXT,
    "action" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "snapshotPath" TEXT,
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "attendanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."attendance_devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "face_profiles_employeeId_key" ON "common"."face_profiles"("employeeId");

-- CreateIndex
CREATE INDEX "face_images_faceProfileId_idx" ON "common"."face_images"("faceProfileId");

-- CreateIndex
CREATE INDEX "face_attendance_logs_employeeId_createdAt_idx" ON "common"."face_attendance_logs"("employeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_devices_apiKey_key" ON "common"."attendance_devices"("apiKey");

-- AddForeignKey
ALTER TABLE "common"."face_profiles" ADD CONSTRAINT "face_profiles_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."face_images" ADD CONSTRAINT "face_images_faceProfileId_fkey" FOREIGN KEY ("faceProfileId") REFERENCES "common"."face_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."face_attendance_logs" ADD CONSTRAINT "face_attendance_logs_faceProfileId_fkey" FOREIGN KEY ("faceProfileId") REFERENCES "common"."face_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
