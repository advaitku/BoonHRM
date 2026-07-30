-- AlterTable
ALTER TABLE `JobOpening` ADD COLUMN `assignedToId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `JobOpening_assignedToId_idx` ON `JobOpening`(`assignedToId`);
