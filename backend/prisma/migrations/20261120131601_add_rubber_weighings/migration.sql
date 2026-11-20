-- CreateTable
CREATE TABLE `RubberSaleWorkerWeighing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rubberSaleWorkerId` INTEGER NOT NULL,
    `pieces` INTEGER NOT NULL,
    `weightKg` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RubberSaleWorkerWeighing_rubberSaleWorkerId_idx`(`rubberSaleWorkerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RubberSaleWorkerWeighing` ADD CONSTRAINT `RubberSaleWorkerWeighing_rubberSaleWorkerId_fkey` FOREIGN KEY (`rubberSaleWorkerId`) REFERENCES `RubberSaleWorker`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing worker row becomes its single weighing, so the
-- parent pieces/weightKg keep meaning the same sum they always did.
INSERT INTO `RubberSaleWorkerWeighing` (`rubberSaleWorkerId`, `pieces`, `weightKg`, `createdAt`)
SELECT `id`, `pieces`, `weightKg`, `createdAt` FROM `RubberSaleWorker`;
