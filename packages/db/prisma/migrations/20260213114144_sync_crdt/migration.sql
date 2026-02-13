/*
  Warnings:

  - You are about to drop the column `assessmentComponents` on the `GradeEntry` table. All the data in the column will be lost.
  - You are about to drop the column `assessmentWeights` on the `GradeEntry` table. All the data in the column will be lost.
  - You are about to drop the column `gradingMode` on the `GradeEntry` table. All the data in the column will be lost.
  - You are about to drop the column `quietHoursEnd` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `quietHoursStart` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappOptIn` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `FamilyShareLink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MobileRefreshToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SchoolHoliday` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('FREE', 'PRO', 'INSTITUTION');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- DropForeignKey
ALTER TABLE "FamilyShareLink" DROP CONSTRAINT "FamilyShareLink_userId_fkey";

-- DropForeignKey
ALTER TABLE "MobileRefreshToken" DROP CONSTRAINT "MobileRefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "SchoolHoliday" DROP CONSTRAINT "SchoolHoliday_userId_fkey";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "syncLamportTs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "syncVectorClock" TEXT;

-- AlterTable
ALTER TABLE "GradeEntry" DROP COLUMN "assessmentComponents",
DROP COLUMN "assessmentWeights",
DROP COLUMN "gradingMode";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "syncLamportTs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "syncVectorClock" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "quietHoursEnd",
DROP COLUMN "quietHoursStart",
DROP COLUMN "whatsappOptIn",
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "paymentRef" TEXT,
ADD COLUMN     "plan" "BillingPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "planStatus" "BillingStatus" NOT NULL DEFAULT 'INACTIVE',
ADD COLUMN     "renewalAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "FamilyShareLink";

-- DropTable
DROP TABLE "MobileRefreshToken";

-- DropTable
DROP TABLE "SchoolHoliday";

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intentId" TEXT NOT NULL,
    "paymentRef" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "plan" "BillingPlan" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "upiId" TEXT,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncOperation" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" TEXT,
    "lamportTs" INTEGER NOT NULL,
    "vectorClock" TEXT,
    "tombstone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_intentId_key" ON "PaymentEvent"("intentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_paymentRef_key" ON "PaymentEvent"("paymentRef");

-- CreateIndex
CREATE INDEX "PaymentEvent_userId_createdAt_idx" ON "PaymentEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_status_createdAt_idx" ON "PaymentEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SyncOperation_userId_id_idx" ON "SyncOperation"("userId", "id");

-- CreateIndex
CREATE INDEX "SyncOperation_userId_entityType_entityId_lamportTs_idx" ON "SyncOperation"("userId", "entityType", "entityId", "lamportTs");

-- CreateIndex
CREATE UNIQUE INDEX "SyncOperation_userId_opId_key" ON "SyncOperation"("userId", "opId");

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
