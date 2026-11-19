-- DropForeignKey
ALTER TABLE `salecancellation` DROP FOREIGN KEY `SaleCancellation_saleId_fkey`;

-- AlterTable
ALTER TABLE `salecancellation` MODIFY `saleId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `SaleCancellation` ADD CONSTRAINT `SaleCancellation_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
