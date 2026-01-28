-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "recurringSeriesId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "recurringIndex" INTEGER;

-- CreateIndex
CREATE INDEX "Appointment_recurringSeriesId_idx" ON "Appointment"("recurringSeriesId");

