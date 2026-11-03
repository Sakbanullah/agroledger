-- CreateTable
CREATE TABLE `LlmProvider` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `protocol` VARCHAR(191) NOT NULL,
    `baseUrl` VARCHAR(191) NOT NULL,
    `apiKeyEnc` TEXT NULL,
    `customHeaders` JSON NULL,
    `timeoutMs` INTEGER NOT NULL DEFAULT 60000,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `lastTestStatus` VARCHAR(191) NULL,
    `lastTestAt` DATETIME(3) NULL,
    `lastTestMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LlmProvider_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LlmModel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerId` INTEGER NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `params` JSON NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LlmModel_providerId_modelId_key`(`providerId`, `modelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LlmModel` ADD CONSTRAINT `LlmModel_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `LlmProvider`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
