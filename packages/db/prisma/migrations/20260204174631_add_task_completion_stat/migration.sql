-- CreateTable
CREATE TABLE "TaskCompletionStat" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalMinutes" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskCompletionStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskCompletionStat_taskId_key" ON "TaskCompletionStat"("taskId");

-- CreateIndex
CREATE INDEX "TaskCompletionStat_userId_completedAt_idx" ON "TaskCompletionStat"("userId", "completedAt");

-- AddForeignKey
ALTER TABLE "TaskCompletionStat" ADD CONSTRAINT "TaskCompletionStat_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletionStat" ADD CONSTRAINT "TaskCompletionStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
