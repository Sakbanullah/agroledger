-- ============================================================================
-- Verification of the settlement backfill: no row carries a status the old SQL
-- wrote without the row actually proving that shape.
--
-- 20261121120000_settlement_payment_status proves cash-only and offset rows
-- with NOT EXISTS on CreditTransaction, and cash + kasbon rows by counting only
-- the PAYMENT that equals the deduction. So a PAYMENT of another amount on the
-- same reference never disqualified a row: it could be written PAID_OUT or
-- SETTLED_BY_OFFSET even though the reference holds a second credit row.
--
-- The TypeScript classifier (src/settlements/migration-classifier.ts) is
-- stricter: cash-only needs no credit row at all, cash + kasbon needs exactly
-- one credit row and it must be a PAYMENT of exactly the deduction, offset
-- needs exactly one exact PAYMENT and no cash row, NO_BALANCE needs no credit
-- row. This migration refuses to pass when a row the first backfill wrote does
-- not meet that shape, so preview and backfill stay comparable.
--
-- Nothing is repaired here. Such a row keeps the status the old SQL chose;
-- moving it back is a reconciliation decision and is not taken without one.
-- SIGNAL aborts the migration, leaving the database untouched.
--
-- The four checks live in one procedure so they are created, called and
-- dropped by the runner in that order, without a DELIMITER for the client.
-- ============================================================================

CREATE PROCEDURE `assert_settlement_backfill_verified`()
BEGIN
    -- 1. PAID_OUT, cash + kasbon: exactly one credit row, a PAYMENT equal to
    --    the deduction. A second PAYMENT of another amount fails both checks.
    IF EXISTS (
        SELECT 1 FROM `Settlement` s
        WHERE s.status = 'PAID_OUT'
          AND s.deductionAmount > 0
          AND (
              (
                  SELECT COUNT(*) FROM `CreditTransaction` c
                  WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
                    AND c.type = 'PAYMENT' AND c.amount = s.deductionAmount
              ) <> 1
              OR (
                  SELECT COUNT(*) FROM `CreditTransaction` c
                  WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
              ) <> 1
          )
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'backfill divergence: PAID_OUT cash+kasbon needs one exact PAYMENT';
    END IF;

    -- 2. PAID_OUT, cash-only: no credit row of any type (NOT EXISTS in the SQL).
    IF EXISTS (
        SELECT 1 FROM `Settlement` s
        WHERE s.status = 'PAID_OUT'
          AND s.deductionAmount = 0
          AND EXISTS (
              SELECT 1 FROM `CreditTransaction` c
              WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
          )
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'backfill divergence: PAID_OUT cash-only has a credit row';
    END IF;

    -- 3. SETTLED_BY_OFFSET: exactly one credit row, an exact PAYMENT, and
    --    no cash row.
    IF EXISTS (
        SELECT 1 FROM `Settlement` s
        WHERE s.status = 'SETTLED_BY_OFFSET'
          AND (
              (
                  SELECT COUNT(*) FROM `CreditTransaction` c
                  WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
                    AND c.type = 'PAYMENT' AND c.amount = s.deductionAmount
              ) <> 1
              OR (
                  SELECT COUNT(*) FROM `CreditTransaction` c
                  WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
              ) <> 1
              OR EXISTS (
                  SELECT 1 FROM `MoneyTransaction` mt
                  WHERE mt.referenceType = 'SETTLEMENT' AND mt.referenceId = s.id
              )
          )
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'backfill divergence: SETTLED_BY_OFFSET needs one exact PAYMENT and no cash';
    END IF;

    -- 4. NO_BALANCE: nothing was ever owed, so no credit row of any type.
    IF EXISTS (
        SELECT 1 FROM `Settlement` s
        WHERE s.status = 'NO_BALANCE'
          AND EXISTS (
              SELECT 1 FROM `CreditTransaction` c
              WHERE c.reference = CONCAT('SETTLEMENT-', s.id)
          )
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'backfill divergence: NO_BALANCE has a credit row';
    END IF;
END;

CALL `assert_settlement_backfill_verified`();

DROP PROCEDURE `assert_settlement_backfill_verified`;
