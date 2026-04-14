-- AlterTable
ALTER TABLE "auth"."users" ADD COLUMN     "secondaryDepartmentId" TEXT;
ALTER TABLE "auth"."users" ADD COLUMN     "secondarySubDepartmentId" TEXT;
ALTER TABLE "auth"."users" ADD COLUMN     "secondaryRole" "auth"."UserRole";
