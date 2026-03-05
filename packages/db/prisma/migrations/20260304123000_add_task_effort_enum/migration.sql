-- CreateEnum
CREATE TYPE "Effort" AS ENUM ('M30', 'H1', 'H2', 'H4_PLUS');

-- Add new enum column (temporary)
ALTER TABLE "Task" ADD COLUMN "effort_new" "Effort";

-- Backfill from existing text values
UPDATE "Task"
SET "effort_new" = CASE
  WHEN lower(trim("effort")) = '30m' THEN 'M30'::"Effort"
  WHEN lower(trim("effort")) = '1h' THEN 'H1'::"Effort"
  WHEN lower(trim("effort")) = '2h' THEN 'H2'::"Effort"
  WHEN lower(trim("effort")) = '4h+' THEN 'H4_PLUS'::"Effort"
  ELSE NULL
END;

-- Replace old column
ALTER TABLE "Task" DROP COLUMN "effort";
ALTER TABLE "Task" RENAME COLUMN "effort_new" TO "effort";
