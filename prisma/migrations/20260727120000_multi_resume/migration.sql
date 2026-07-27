-- CreateTable
CREATE TABLE `Resume` (
    `id` VARCHAR(191) NOT NULL,
    `candidateId` VARCHAR(191) NOT NULL,
    `filePath` TEXT NOT NULL,
    `mime` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `extractedText` LONGTEXT NULL,
    `parsedEmail` VARCHAR(191) NULL,
    `parsedPhone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Resume_candidateId_createdAt_idx`(`candidateId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Resume` ADD CONSTRAINT `Resume_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single-resume data into the new table before dropping the old columns.
INSERT INTO `Resume` (`id`, `candidateId`, `filePath`, `mime`, `originalName`, `extractedText`, `parsedEmail`, `parsedPhone`, `createdAt`)
SELECT
    CONCAT('legacy_', `id`),
    `id`,
    `resumeFilePath`,
    COALESCE(`resumeMime`, 'application/octet-stream'),
    COALESCE(`resumeOriginalName`, 'resume'),
    `extractedResumeText`,
    `parsedEmail`,
    `parsedPhone`,
    `createdAt`
FROM `Candidate`
WHERE `resumeFilePath` IS NOT NULL;

-- AlterTable
ALTER TABLE `Candidate` DROP COLUMN `extractedResumeText`,
    DROP COLUMN `parsedEmail`,
    DROP COLUMN `parsedPhone`,
    DROP COLUMN `resumeFilePath`,
    DROP COLUMN `resumeMime`,
    DROP COLUMN `resumeOriginalName`;
