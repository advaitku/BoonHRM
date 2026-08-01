-- CreateTable
CREATE TABLE `OfferAcceptance` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `jobTitle` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `candidateName` VARCHAR(191) NOT NULL,
    `candidateEmail` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `ctcDetails` TEXT NULL,
    `dateOfJoining` DATE NULL,
    `agreementText` TEXT NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OfferAcceptance_applicationId_idx`(`applicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OfferAcceptance` ADD CONSTRAINT `OfferAcceptance_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
