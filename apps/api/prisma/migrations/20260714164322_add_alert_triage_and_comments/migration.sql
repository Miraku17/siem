-- CreateEnum
CREATE TYPE "AlertDisposition" AS ENUM ('BENIGN', 'FALSE_POSITIVE', 'TRUE_POSITIVE_NO_IMPACT', 'TRUE_POSITIVE');

-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "disposition" "AlertDisposition";

-- CreateTable
CREATE TABLE "alert_comments" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_comments_alertId_idx" ON "alert_comments"("alertId");

-- AddForeignKey
ALTER TABLE "alert_comments" ADD CONSTRAINT "alert_comments_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
