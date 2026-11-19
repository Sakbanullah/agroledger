-- CreateTable
CREATE TABLE `SaleCancellation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `commodity` VARCHAR(191) NOT NULL,
    `farmName` VARCHAR(191) NOT NULL,
    `saleDate` DATETIME(3) NOT NULL,
    `totalWeightKg` DECIMAL(12, 2) NULL,
    `pricePerKg` DECIMAL(12, 2) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'CANCELLED',
    `cancelledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SaleCancellation_saleId_key`(`saleId`),
    INDEX `SaleCancellation_saleId_idx`(`saleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SaleCancellation` ADD CONSTRAINT `SaleCancellation_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
