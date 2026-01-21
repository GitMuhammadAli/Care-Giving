-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'PROCESSING',
ALTER COLUMN "s3Key" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");
