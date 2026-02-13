-- AlterTable
ALTER TABLE "User"
ADD COLUMN "whatsappOptIn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "quietHoursStart" TEXT,
ADD COLUMN "quietHoursEnd" TEXT;

-- AlterTable
ALTER TABLE "GradeEntry"
ADD COLUMN "assessmentWeights" JSONB,
ADD COLUMN "assessmentComponents" JSONB,
ADD COLUMN "gradingMode" TEXT NOT NULL DEFAULT 'RAW';

-- CreateTable
CREATE TABLE "SchoolHoliday" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "pauseNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyShareLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "permissions" TEXT NOT NULL DEFAULT 'READ_ONLY',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileRefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolHoliday_userId_startDate_endDate_idx" ON "SchoolHoliday"("userId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyShareLink_tokenHash_key" ON "FamilyShareLink"("tokenHash");

-- CreateIndex
CREATE INDEX "FamilyShareLink_userId_revokedAt_idx" ON "FamilyShareLink"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MobileRefreshToken_tokenHash_key" ON "MobileRefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MobileRefreshToken_userId_deviceId_idx" ON "MobileRefreshToken"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "MobileRefreshToken_userId_revokedAt_idx" ON "MobileRefreshToken"("userId", "revokedAt");

-- AddForeignKey
ALTER TABLE "SchoolHoliday" ADD CONSTRAINT "SchoolHoliday_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyShareLink" ADD CONSTRAINT "FamilyShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileRefreshToken" ADD CONSTRAINT "MobileRefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
