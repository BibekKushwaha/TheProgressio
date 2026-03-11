-- Add a read-optimized lookup index for task -> syllabus topic link queries
CREATE INDEX "TaskSyllabusTopic_userId_taskId_idx" ON "TaskSyllabusTopic"("userId", "taskId");
