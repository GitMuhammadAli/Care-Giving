-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CARE_RECIPIENT_DELETED';
ALTER TYPE "NotificationType" ADD VALUE 'CARE_RECIPIENT_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'MEDICATION_DELETED';
ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_DELETED';
ALTER TYPE "NotificationType" ADD VALUE 'FAMILY_MEMBER_REMOVED';
ALTER TYPE "NotificationType" ADD VALUE 'FAMILY_MEMBER_ROLE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'FAMILY_DELETED';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "url" TEXT;
