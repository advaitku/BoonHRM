-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `image` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'hr',
    `banned` BOOLEAN NOT NULL DEFAULT false,
    `banReason` TEXT NULL,
    `banExpires` DATETIME(3) NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session` (
    `id` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `ipAddress` TEXT NULL,
    `userAgent` TEXT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `impersonatedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `session_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    `idToken` TEXT NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `scope` TEXT NULL,
    `password` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    INDEX `verification_identifier_idx`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobOpening` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `location` VARCHAR(191) NULL,
    `positions` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `onlineInterviewUrl` TEXT NULL,
    `inPersonInterviewUrl` TEXT NULL,
    `autoNotify` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JobOpening_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Candidate` (
    `id` VARCHAR(191) NOT NULL,
    `jobOpeningId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `workHistory` TEXT NULL,
    `education` TEXT NULL,
    `resumeFilePath` TEXT NULL,
    `resumeMime` VARCHAR(191) NULL,
    `resumeOriginalName` VARCHAR(191) NULL,
    `extractedResumeText` LONGTEXT NULL,
    `parsedEmail` VARCHAR(191) NULL,
    `parsedPhone` VARCHAR(191) NULL,
    `stage` ENUM('POOL', 'INTERVIEW', 'SHORTLIST', 'REJECTED', 'APPROVED') NOT NULL DEFAULT 'POOL',
    `stageEnteredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rejectionType` ENUM('CANDIDATE_DECLINED', 'COMPANY_REJECTED') NULL,
    `rejectionReason` TEXT NULL,
    `rejectedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `ctcDetails` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Candidate_jobOpeningId_stage_idx`(`jobOpeningId`, `stage`),
    INDEX `Candidate_email_idx`(`email`),
    INDEX `Candidate_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateStageHistory` (
    `id` VARCHAR(191) NOT NULL,
    `candidateId` VARCHAR(191) NOT NULL,
    `fromStage` ENUM('POOL', 'INTERVIEW', 'SHORTLIST', 'REJECTED', 'APPROVED') NULL,
    `toStage` ENUM('POOL', 'INTERVIEW', 'SHORTLIST', 'REJECTED', 'APPROVED') NOT NULL,
    `movedById` VARCHAR(191) NULL,
    `rejectionType` ENUM('CANDIDATE_DECLINED', 'COMPANY_REJECTED') NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CandidateStageHistory_candidateId_createdAt_idx`(`candidateId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailThread` (
    `id` VARCHAR(191) NOT NULL,
    `candidateId` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmailThread_candidateId_key`(`candidateId`),
    UNIQUE INDEX `EmailThread_conversationId_key`(`conversationId`),
    INDEX `EmailThread_conversationId_idx`(`conversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailMessage` (
    `id` VARCHAR(191) NOT NULL,
    `emailThreadId` VARCHAR(191) NOT NULL,
    `direction` ENUM('OUTBOUND', 'INBOUND') NOT NULL DEFAULT 'OUTBOUND',
    `mailType` ENUM('OTP', 'INTERVIEW_INVITE', 'REJECTION', 'APPROVAL', 'OTHER') NOT NULL,
    `graphMessageId` VARCHAR(191) NULL,
    `conversationId` VARCHAR(191) NULL,
    `internetMessageId` VARCHAR(191) NULL,
    `toAddresses` TEXT NULL,
    `subject` VARCHAR(191) NULL,
    `bodyHtml` LONGTEXT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmailMessage_graphMessageId_key`(`graphMessageId`),
    INDEX `EmailMessage_conversationId_idx`(`conversationId`),
    INDEX `EmailMessage_emailThreadId_occurredAt_idx`(`emailThreadId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Candidate` ADD CONSTRAINT `Candidate_jobOpeningId_fkey` FOREIGN KEY (`jobOpeningId`) REFERENCES `JobOpening`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateStageHistory` ADD CONSTRAINT `CandidateStageHistory_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailThread` ADD CONSTRAINT `EmailThread_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailMessage` ADD CONSTRAINT `EmailMessage_emailThreadId_fkey` FOREIGN KEY (`emailThreadId`) REFERENCES `EmailThread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
