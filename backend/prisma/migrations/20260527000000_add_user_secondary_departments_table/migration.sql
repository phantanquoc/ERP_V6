-- Migration: Add user_secondary_departments table
-- Replaces single secondary dept fields with a relation table supporting N entries.
-- Old fields (secondaryDepartmentId, secondarySubDepartmentId, secondaryRole) are kept
-- for backward compat and will be removed in a follow-up migration.

-- 1. Create new table
CREATE TABLE "auth"."user_secondary_departments" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "departmentId"    TEXT NOT NULL,
    "subDepartmentId" TEXT,
    "role"            "auth"."UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_secondary_departments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "auth"."user_secondary_departments"
    ADD CONSTRAINT "user_secondary_departments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "auth"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint: one entry per (userId, departmentId, subDepartmentId)
-- NULL subDepartmentId is treated as a distinct value via COALESCE
CREATE UNIQUE INDEX "user_secondary_departments_userId_departmentId_subDepartmentId_key"
    ON "auth"."user_secondary_departments"("userId", "departmentId", COALESCE("subDepartmentId", ''));

-- 2. Migrate existing single secondary dept data into the new table
INSERT INTO "auth"."user_secondary_departments"
    ("id", "userId", "departmentId", "subDepartmentId", "role", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    u.id,
    u."secondaryDepartmentId",
    u."secondarySubDepartmentId",
    COALESCE(u."secondaryRole", 'EMPLOYEE'),
    NOW(),
    NOW()
FROM "auth"."users" u
WHERE u."secondaryDepartmentId" IS NOT NULL
ON CONFLICT DO NOTHING;
