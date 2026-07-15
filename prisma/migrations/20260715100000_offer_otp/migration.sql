-- AlterTable
ALTER TABLE `candidate` ADD COLUMN `offerOtpAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `offerOtpExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `offerOtpHash` VARCHAR(191) NULL;
