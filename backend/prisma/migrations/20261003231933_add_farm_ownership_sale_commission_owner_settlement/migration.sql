-- AlterTable
ALTER TABLE `Farm` ADD COLUMN `ownershipType` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Sale` ADD COLUMN `commissionAmount` DECIMAL(12, 2) NULL,
    ADD COLUMN `commissionRatePerKg` DECIMAL(12, 2) NULL,
    ADD COLUMN `ownerShareAmount` DECIMAL(12, 2) NULL,
    ADD COLUMN `ownershipType` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `MoneyTransaction` ADD COLUMN `farmId` INTEGER NULL;

-- CreateTable
CREATE TABLE `OwnerSettlement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `ownerId` INTEGER NOT NULL,
    `ownerShareAmount` DECIMAL(12, 2) NOT NULL,
    `settledAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `outstandingAmount` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OwnerSettlement_saleId_idx`(`saleId`),
    INDEX `OwnerSettlement_ownerId_idx`(`ownerId`),
    UNIQUE INDEX `OwnerSettlement_saleId_ownerId_key`(`saleId`, `ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `MoneyTransaction_farmId_idx` ON `MoneyTransaction`(`farmId`);

-- AddForeignKey
ALTER TABLE `MoneyTransaction` ADD CONSTRAINT `MoneyTransaction_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OwnerSettlement` ADD CONSTRAINT `OwnerSettlement_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OwnerSettlement` ADD CONSTRAINT `OwnerSettlement_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `Person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
