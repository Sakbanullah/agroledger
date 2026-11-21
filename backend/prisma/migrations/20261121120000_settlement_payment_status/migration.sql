-- ============================================================================
-- Stage 1: settle calculation and worker payment are separate steps
--
-- Settlement.status values after this migration:
--   PENDING            calculated; nothing handed over, kasbon not deducted
--   PAID_OUT           net cash handed to the worker
--   SETTLED_BY_OFFSET  the whole share was covered by the kasbon deduction
--   CANCELLED          cancelled through the sale's deletion
--
-- Settlement.reconciliationStatus (orthogonal to status):
--   NULL      normal settlement
--   REQUIRED  an old settlement whose record cannot be proven either way; the
--             normal payment path refuses it until an admin resolves it
--   RESOLVED  decided with evidence, see SettlementReconciliation
--
-- Zero-balance settlements (gross 0) are NOT given a closing status: whether a
-- zero share counts as settled is still an open Product Owner decision, so they
-- are left alone and require recalculation.
-- ============================================================================

-- AlterTable: idempotency pointers, completion stamp and the reconciliation
-- flag, plus the column default for newly created rows.
ALTER TABLE `Settlement`
    ADD COLUMN `settledAt` DATETIME(3) NULL,
    ADD COLUMN `settlementMethod` VARCHAR(191) NULL,
    ADD COLUMN `cashTransactionId` INTEGER NULL,
    ADD COLUMN `creditTransactionId` INTEGER NULL,
    ADD COLUMN `reconciliationStatus` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';
-- Deliberately no FK on the two transaction ids: a money row can be repointed
-- on sale cancellation and a CreditTransaction row can be removed with its
-- person. A dangling id means "not settled", which the payment step handles.

CREATE UNIQUE INDEX `Settlement_cashTransactionId_key` ON `Settlement`(`cashTransactionId`);
CREATE UNIQUE INDEX `Settlement_creditTransactionId_key` ON `Settlement`(`creditTransactionId`);
CREATE INDEX `Settlement_reconciliationStatus_idx` ON `Settlement`(`reconciliationStatus`);

-- Append-only audit trail for reconciliation decisions. Every decision keeps
-- the figures it was based on, the evidence rows it examined and the statuses
-- it moved between. No financial row is ever written or changed by a
-- reconciliation, so the reviewed ids are plain integers (no FK).
CREATE TABLE `SettlementReconciliation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settlementId` INTEGER NOT NULL,
    `decision` VARCHAR(191) NOT NULL,
    `grossShare` DECIMAL(12, 2) NOT NULL,
    `deductionAmount` DECIMAL(12, 2) NOT NULL,
    `netAmount` DECIMAL(12, 2) NOT NULL,
    `statusBefore` VARCHAR(191) NOT NULL,
    `statusAfter` VARCHAR(191) NOT NULL,
    `reviewedMoneyTransactionId` INTEGER NULL,
    `reviewedCreditTransactionId` INTEGER NULL,
    `reason` TEXT NOT NULL,
    `decidedById` INTEGER NULL,
    `decidedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SettlementReconciliation_settlementId_idx`(`settlementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SettlementReconciliation` ADD CONSTRAINT `SettlementReconciliation_settlementId_fkey` FOREIGN KEY (`settlementId`) REFERENCES `Settlement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- Data migration
--
-- What the old code wrote, from master before Stage 1
-- (backend/src/settlements/settlements.service.ts):
--   * settlement, cash OUT and kasbon PAYMENT were all written in ONE
--     transaction;
--   * the cash row was written only when netAmount > 0, with
--     referenceType = 'SETTLEMENT' and referenceId = settlement.id;
--   * the PAYMENT row was written only when deductionAmount > 0, with
--     reference = CONCAT('SETTLEMENT-', settlement.id) and amount = deduction;
--   * a cancellation adds new reversal rows and repoints referenceType to
--     'SALE_CANCELLATION' (it never edits amounts or transactionDate); a
--     deleted cancelled sale also cascades its settlements away, so those
--     rows never reach this backfill.
--
-- Every query below:
--   * filters by referenceType/reference type AND the settlement id, so rows
--     of another settlement can never match;
--   * counts rows instead of testing "exists", so a duplicate is ambiguous;
--   * compares the amount exactly, so a mismatched row is ambiguous;
--   * only migrates rows that still carry the old CONFIRMED status.
--
-- Anything that does not match exactly one of the proven shapes is left
-- PENDING and flagged REQUIRED for reconciliation. Nothing is guessed, no
-- financial row is created, edited or deleted, and no date is invented: the
-- timestamps copied below are the historical rows' own transactionDate.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 2. PAID_OUT, cash + kasbon: net > 0, deduction > 0
--    proof: exactly one OUT of exactly netAmount, and exactly one PAYMENT of
--    exactly deductionAmount, for this settlement.
-- ----------------------------------------------------------------------------
UPDATE `Settlement` s
SET s.status = 'PAID_OUT',
    s.settlementMethod = 'CASH',
    s.settledAt = (
        SELECT mt.transactionDate FROM `MoneyTransaction` mt
        WHERE mt.referenceType = 'SETTLEMENT' AND mt.referenceId = s.id
        LIMIT 1
    ),
    s.cashTransactionId = (
        SELECT mt.id FROM `MoneyTransaction` mt
        WHERE mt.referenceType = 'SETTLEMENT' AND mt.referenceId = s.id
        LIMIT 1
    ),
    s.creditTransactionId = (
        SELECT c.id FROM `CreditTransaction` c
        WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
        LIMIT 1
    )
WHERE s.status = 'CONFIRMED'
  AND s.netAmount > 0
  AND s.deductionAmount > 0
  AND (
      SELECT COUNT(*) FROM `MoneyTransaction` mt
      WHERE mt.referenceType = 'SETTLEMENT' AND mt.referenceId = s.id
  ) = 1
  AND (
      SELECT COUNT(*) FROM `MoneyTransaction` mt
      WHERE mt.referenceType = 'SETTLEMENT' AND mt.referenceId = s.id
        AND mt.type = 'OUT' AND mt.amount = s.netAmount
  ) = 1
  AND (
      SELECT COUNT(*) FROM `CreditTransaction` c
      WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
        AND c.type = 'PAYMENT' AND c.amount = s.deductionAmount
  ) = 1;

-- ----------------------------------------------------------------------------
-- 1. PAID_OUT, cash-only: net > 0, deduction = 0
--    The old code wrote no PAYMENT row when nothing was deducted, so the proof
--    is the single cash OUT; a PAYMENT row would contradict the figures.
-- ----------------------------------------------------------------------------
UPDATE `Settlement` s
SET s.status = 'PAID_OUT',
    s.settlementMethod = 'CASH',
    s.settledAt = (
        SELECT mt.transactionDate FROM `MoneyTransaction` mt
        WHERE mt.referenceType = 'SETTLEMENT' AND mt.referenceId = s.id
        LIMIT 1
    ),
    s.cashTransactionId = (
        SELECT mt.id FROM `MoneyTransaction` mt
        WHERE mt.referenceType = 'SETTLEMENT' AND mt.referenceId = s.id
        LIMIT 1
    )
WHERE s.status = 'CONFIRMED'
  AND s.netAmount > 0
  AND s.deductionAmount = 0
  AND (
      SELECT COUNT(*) FROM `MoneyTransaction` mt
      WHERE mt.referenceType = 'SETTLEMENT' AND mt.referenceId = s.id
  ) = 1
  AND (
      SELECT COUNT(*) FROM `MoneyTransaction` mt
      WHERE mt.referenceType = 'SETTLEMENT' AND mt.referenceId = s.id
        AND mt.type = 'OUT' AND mt.amount = s.netAmount
  ) = 1
  AND NOT EXISTS (
      SELECT 1 FROM `CreditTransaction` c
      WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
  );

-- ----------------------------------------------------------------------------
-- 3. SETTLED_BY_OFFSET: net = 0, gross > 0 and the deduction covers it all
--    proof: no cash row for this settlement (the old code wrote none at net 0)
--    and exactly one PAYMENT of exactly deductionAmount. An empty money row set
--    alone is not proof; the PAYMENT row is.
-- ----------------------------------------------------------------------------
UPDATE `Settlement` s
SET s.status = 'SETTLED_BY_OFFSET',
    s.settlementMethod = 'OFFSET',
    s.settledAt = (
        SELECT c.transactionDate FROM `CreditTransaction` c
        WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
        LIMIT 1
    ),
    s.creditTransactionId = (
        SELECT c.id FROM `CreditTransaction` c
        WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
        LIMIT 1
    )
WHERE s.status = 'CONFIRMED'
  AND s.netAmount = 0
  AND s.grossShare > 0
  AND s.deductionAmount = s.grossShare
  AND NOT EXISTS (
      SELECT 1 FROM `MoneyTransaction` mt
      WHERE mt.referenceType = 'SETTLEMENT' AND mt.referenceId = s.id
  )
  AND (
      SELECT COUNT(*) FROM `CreditTransaction` c
      WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
        AND c.type = 'PAYMENT' AND c.amount = s.deductionAmount
  ) = 1;

-- ----------------------------------------------------------------------------
-- 4 + 5. Everything else stays unproven on purpose:
--    * zero balance (gross 0, deduction 0, no rows) - open PO decision;
--    * missing cash row, missing PAYMENT row, duplicate rows, amount mismatch,
--      inconsistent reference.
--    Such a row keeps its amounts and becomes PENDING + REQUIRED; it can only
--    leave that state through a reconciliation decision backed by evidence.
-- ----------------------------------------------------------------------------
UPDATE `Settlement`
SET `status` = 'PENDING',
    `reconciliationStatus` = 'REQUIRED'
WHERE `status` = 'CONFIRMED';

-- Rows without the old CONFIRMED status are untouched, so this backfill is
-- safe to reason about: only rows that were never re-opened by Stage 1 code
-- receive a status here.
