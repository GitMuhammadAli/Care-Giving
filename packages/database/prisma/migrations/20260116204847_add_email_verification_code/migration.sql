-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerificationCode" TEXT,
ADD COLUMN     "emailVerificationExpiresAt" TIMESTAMP(3);
