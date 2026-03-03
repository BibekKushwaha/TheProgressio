-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fraudRisk" TEXT NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "FraudFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "details" TEXT,
    "paymentRef" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDLQ" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "rawBody" TEXT NOT NULL,
    "signature" TEXT,
    "reason" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDLQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationReport" (
    "id" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rzpTotalCount" INTEGER NOT NULL DEFAULT 0,
    "dbTotalCount" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "missingInDb" TEXT,
    "missingInRzp" TEXT,
    "amountMismatches" TEXT,
    "totalRevenuePaise" INTEGER NOT NULL DEFAULT 0,
    "refundedPaise" INTEGER NOT NULL DEFAULT 0,
    "netRevenuePaise" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FraudFlag_userId_createdAt_idx" ON "FraudFlag"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudFlag_type_risk_resolved_idx" ON "FraudFlag"("type", "risk", "resolved");

-- CreateIndex
CREATE INDEX "FraudFlag_resolved_createdAt_idx" ON "FraudFlag"("resolved", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDLQ_event_resolved_idx" ON "WebhookDLQ"("event", "resolved");

-- CreateIndex
CREATE INDEX "WebhookDLQ_resolved_nextRetryAt_idx" ON "WebhookDLQ"("resolved", "nextRetryAt");

-- CreateIndex
CREATE INDEX "WebhookDLQ_createdAt_idx" ON "WebhookDLQ"("createdAt");

-- CreateIndex
CREATE INDEX "ReconciliationReport_status_reportDate_idx" ON "ReconciliationReport"("status", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationReport_reportDate_key" ON "ReconciliationReport"("reportDate");

-- AddForeignKey
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
