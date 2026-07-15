-- AlterTable
ALTER TABLE `candidate` ADD COLUMN `dateOfJoining` DATE NULL,
    ADD COLUMN `offerAcceptedAt` DATETIME(3) NULL,
    ADD COLUMN `offerDeclinedAt` DATETIME(3) NULL,
    ADD COLUMN `offerToken` VARCHAR(191) NULL,
    ADD COLUMN `offerTokenExpiresAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Candidate_offerToken_key` ON `Candidate`(`offerToken`);
