-- AlterTable
ALTER TABLE `JobOpening`
  ADD COLUMN `closureDeadline` DATETIME(3) NULL,
  ADD COLUMN `interviewDeadline` DATETIME(3) NULL;
