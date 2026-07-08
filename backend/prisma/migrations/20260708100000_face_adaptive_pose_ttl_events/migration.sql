-- Add pose + rotation tracking to face_images
ALTER TABLE "common"."face_images"
  ADD COLUMN "poseYaw"      DOUBLE PRECISION,
  ADD COLUMN "posePitch"    DOUBLE PRECISION,
  ADD COLUMN "capturedHour" INTEGER,
  ADD COLUMN "rotatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "face_images_faceProfileId_rotatedAt_idx"
  ON "common"."face_images"("faceProfileId", "rotatedAt");

-- Event log for adaptive learning observability
CREATE TABLE "common"."face_adaptive_events" (
    "id"              TEXT NOT NULL,
    "faceProfileId"   TEXT NOT NULL,
    "eventType"       TEXT NOT NULL,
    "reason"          TEXT,
    "newQuality"      DOUBLE PRECISION,
    "replacedId"      TEXT,
    "replacedQuality" DOUBLE PRECISION,
    "distToCentroid"  DOUBLE PRECISION,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_adaptive_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "face_adaptive_events_faceProfileId_createdAt_idx"
  ON "common"."face_adaptive_events"("faceProfileId", "createdAt");
CREATE INDEX "face_adaptive_events_eventType_createdAt_idx"
  ON "common"."face_adaptive_events"("eventType", "createdAt");
