-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "icon" TEXT;

-- CreateTable
CREATE TABLE "RotationPattern" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pattern" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "cycleLengthDays" INTEGER NOT NULL DEFAULT 7,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RotationPattern_userId_name_key" ON "RotationPattern"("userId", "name");

-- AddForeignKey
ALTER TABLE "RotationPattern" ADD CONSTRAINT "RotationPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
