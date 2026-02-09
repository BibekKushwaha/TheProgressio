-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "linkedCategoryId" TEXT,
ADD COLUMN     "mercyDaysAllowed" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "mercyDaysUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Nudge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nudge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGrade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "credits" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "gradePoint" DOUBLE PRECISION,
    "grade" TEXT,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "chapter" TEXT,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "obtainedMarks" DOUBLE PRECISION NOT NULL,
    "examType" TEXT NOT NULL,
    "timeTakenMins" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Nudge_userId_isRead_idx" ON "Nudge"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Nudge_userId_scheduledAt_idx" ON "Nudge"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "CourseGrade_userId_semester_idx" ON "CourseGrade"("userId", "semester");

-- CreateIndex
CREATE INDEX "GradeEntry_userId_subjectName_idx" ON "GradeEntry"("userId", "subjectName");

-- CreateIndex
CREATE INDEX "GradeEntry_userId_examType_idx" ON "GradeEntry"("userId", "examType");

-- AddForeignKey
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGrade" ADD CONSTRAINT "CourseGrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeEntry" ADD CONSTRAINT "GradeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
