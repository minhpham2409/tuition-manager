-- DropIndex
DROP INDEX "Invoice_studentId_month_year_key";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "lessonsCounted" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_studentId_month_year_idx" ON "Invoice"("studentId", "month", "year");
