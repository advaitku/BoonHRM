-- Split the flat Candidate row into Candidate (person, unique email) +
-- Application (per-opening pipeline: stage, rejection, offer).
--
-- Data-preserving trick: each Application reuses its source Candidate's id,
-- so CandidateStageHistory.candidateId and EmailThread.candidateId already
-- hold valid Application ids — repointing them is a pure column rename.

-- 1. New Application table
CREATE TABLE `Application` (
    `id` VARCHAR(191) NOT NULL,
    `candidateId` VARCHAR(191) NOT NULL,
    `jobOpeningId` VARCHAR(191) NOT NULL,
    `stage` ENUM('POOL', 'INTERVIEW', 'SHORTLIST', 'REJECTED', 'APPROVED') NOT NULL DEFAULT 'POOL',
    `stageEnteredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rejectionType` ENUM('CANDIDATE_DECLINED', 'COMPANY_REJECTED') NULL,
    `rejectionReason` TEXT NULL,
    `rejectedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `ctcDetails` TEXT NULL,
    `dateOfJoining` DATE NULL,
    `offerToken` VARCHAR(191) NULL,
    `offerTokenExpiresAt` DATETIME(3) NULL,
    `offerAcceptedAt` DATETIME(3) NULL,
    `offerDeclinedAt` DATETIME(3) NULL,
    `offerOtpHash` VARCHAR(191) NULL,
    `offerOtpExpiresAt` DATETIME(3) NULL,
    `offerOtpAttempts` INTEGER NOT NULL DEFAULT 0,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Application_offerToken_key`(`offerToken`),
    UNIQUE INDEX `Application_candidateId_jobOpeningId_key`(`candidateId`, `jobOpeningId`),
    INDEX `Application_jobOpeningId_stage_idx`(`jobOpeningId`, `stage`),
    INDEX `Application_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. One Application per existing Candidate row (id reused)
INSERT INTO `Application`
    (`id`, `candidateId`, `jobOpeningId`, `stage`, `stageEnteredAt`,
     `rejectionType`, `rejectionReason`, `rejectedAt`,
     `approvedAt`, `ctcDetails`, `dateOfJoining`,
     `offerToken`, `offerTokenExpiresAt`, `offerAcceptedAt`, `offerDeclinedAt`,
     `offerOtpHash`, `offerOtpExpiresAt`, `offerOtpAttempts`,
     `createdById`, `createdAt`, `updatedAt`)
SELECT
    `id`, `id`, `jobOpeningId`, `stage`, `stageEnteredAt`,
    `rejectionType`, `rejectionReason`, `rejectedAt`,
    `approvedAt`, `ctcDetails`, `dateOfJoining`,
    `offerToken`, `offerTokenExpiresAt`, `offerAcceptedAt`, `offerDeclinedAt`,
    `offerOtpHash`, `offerOtpExpiresAt`, `offerOtpAttempts`,
    `createdById`, `createdAt`, `updatedAt`
FROM `Candidate`;

ALTER TABLE `Application` ADD CONSTRAINT `Application_candidateId_fkey`
    FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Application` ADD CONSTRAINT `Application_jobOpeningId_fkey`
    FOREIGN KEY (`jobOpeningId`) REFERENCES `JobOpening`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Repoint stage history -> Application (values already match)
ALTER TABLE `CandidateStageHistory` DROP FOREIGN KEY `CandidateStageHistory_candidateId_fkey`;
ALTER TABLE `CandidateStageHistory` RENAME TO `ApplicationStageHistory`;
ALTER TABLE `ApplicationStageHistory` CHANGE COLUMN `candidateId` `applicationId` VARCHAR(191) NOT NULL;
ALTER TABLE `ApplicationStageHistory`
    RENAME INDEX `CandidateStageHistory_candidateId_createdAt_idx` TO `ApplicationStageHistory_applicationId_createdAt_idx`;
ALTER TABLE `ApplicationStageHistory` ADD CONSTRAINT `ApplicationStageHistory_applicationId_fkey`
    FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Repoint email thread -> Application
ALTER TABLE `EmailThread` DROP FOREIGN KEY `EmailThread_candidateId_fkey`;
ALTER TABLE `EmailThread` CHANGE COLUMN `candidateId` `applicationId` VARCHAR(191) NOT NULL;
ALTER TABLE `EmailThread` RENAME INDEX `EmailThread_candidateId_key` TO `EmailThread_applicationId_key`;
ALTER TABLE `EmailThread` ADD CONSTRAINT `EmailThread_applicationId_fkey`
    FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Strip moved columns + old indexes from Candidate
ALTER TABLE `Candidate` DROP FOREIGN KEY `Candidate_jobOpeningId_fkey`;
ALTER TABLE `Candidate` DROP INDEX `Candidate_jobOpeningId_stage_idx`;
ALTER TABLE `Candidate` DROP INDEX `Candidate_email_idx`;
ALTER TABLE `Candidate` DROP INDEX `Candidate_offerToken_key`;
ALTER TABLE `Candidate`
    DROP COLUMN `jobOpeningId`,
    DROP COLUMN `stage`,
    DROP COLUMN `stageEnteredAt`,
    DROP COLUMN `rejectionType`,
    DROP COLUMN `rejectionReason`,
    DROP COLUMN `rejectedAt`,
    DROP COLUMN `approvedAt`,
    DROP COLUMN `ctcDetails`,
    DROP COLUMN `dateOfJoining`,
    DROP COLUMN `offerToken`,
    DROP COLUMN `offerTokenExpiresAt`,
    DROP COLUMN `offerAcceptedAt`,
    DROP COLUMN `offerDeclinedAt`,
    DROP COLUMN `offerOtpHash`,
    DROP COLUMN `offerOtpExpiresAt`,
    DROP COLUMN `offerOtpAttempts`;

-- 6. Merge candidates that share an email into one person before the unique
-- index. Canonical row = oldest createdAt. Same-opening collisions keep the
-- newest application (its history/thread cascade away with the loser).
CREATE TABLE `_dedup_canon` AS
SELECT `c`.`email` AS `email`,
       (SELECT `c2`.`id` FROM `Candidate` `c2`
        WHERE `c2`.`email` = `c`.`email`
        ORDER BY `c2`.`createdAt` ASC, `c2`.`id` ASC LIMIT 1) AS `canonId`
FROM `Candidate` `c`
WHERE `c`.`email` IS NOT NULL
GROUP BY `c`.`email`
HAVING COUNT(*) > 1;

CREATE TABLE `_dedup_dupes` AS
SELECT `c`.`id` AS `dupeId`, `d`.`canonId` AS `canonId`
FROM `Candidate` `c`
JOIN `_dedup_canon` `d` ON `d`.`email` = `c`.`email`
WHERE `c`.`id` <> `d`.`canonId`;

-- Applications belonging to any merge group, keyed by their post-merge owner.
CREATE TABLE `_dedup_apps` AS
SELECT `a`.`id` AS `appId`,
       COALESCE(`d`.`canonId`, `a`.`candidateId`) AS `newCandidateId`,
       `a`.`jobOpeningId` AS `jobOpeningId`,
       `a`.`createdAt` AS `createdAt`
FROM `Application` `a`
LEFT JOIN `_dedup_dupes` `d` ON `d`.`dupeId` = `a`.`candidateId`
WHERE `d`.`dupeId` IS NOT NULL
   OR `a`.`candidateId` IN (SELECT `canonId` FROM `_dedup_canon`);

-- Drop all but the newest application per (person, opening).
DELETE FROM `Application` WHERE `id` IN (
    SELECT `appId` FROM `_dedup_apps` `da`
    WHERE EXISTS (
        SELECT 1 FROM `_dedup_apps` `da2`
        WHERE `da2`.`newCandidateId` = `da`.`newCandidateId`
          AND `da2`.`jobOpeningId` = `da`.`jobOpeningId`
          AND (`da2`.`createdAt` > `da`.`createdAt`
               OR (`da2`.`createdAt` = `da`.`createdAt` AND `da2`.`appId` > `da`.`appId`))
    )
);

-- Repoint surviving applications, resumes, comments, tags to the canonical row.
UPDATE `Application` `a` JOIN `_dedup_dupes` `d` ON `d`.`dupeId` = `a`.`candidateId`
    SET `a`.`candidateId` = `d`.`canonId`;
UPDATE `Resume` `r` JOIN `_dedup_dupes` `d` ON `d`.`dupeId` = `r`.`candidateId`
    SET `r`.`candidateId` = `d`.`canonId`;
UPDATE `CandidateComment` `cc` JOIN `_dedup_dupes` `d` ON `d`.`dupeId` = `cc`.`candidateId`
    SET `cc`.`candidateId` = `d`.`canonId`;
UPDATE IGNORE `CandidateTag` `ct` JOIN `_dedup_dupes` `d` ON `d`.`dupeId` = `ct`.`candidateId`
    SET `ct`.`candidateId` = `d`.`canonId`;
DELETE `ct` FROM `CandidateTag` `ct` JOIN `_dedup_dupes` `d` ON `d`.`dupeId` = `ct`.`candidateId`;

DELETE `c` FROM `Candidate` `c` JOIN `_dedup_dupes` `d` ON `d`.`dupeId` = `c`.`id`;

DROP TABLE `_dedup_apps`;
DROP TABLE `_dedup_dupes`;
DROP TABLE `_dedup_canon`;

-- 7. Unique email (non-null unique; multiple NULLs allowed)
CREATE UNIQUE INDEX `Candidate_email_key` ON `Candidate`(`email`);
