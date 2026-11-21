import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

/**
 * A reconciliation records what the admin concludes about an old settlement
 * after looking at the evidence. It never names the actor: identity must come
 * from authentication, so any such field is rejected by the global
 * forbidNonWhitelisted rule.
 */
export const RECONCILIATION_CHOICES = [
  // Record the payment that is already in the ledger as this settlement's.
  'USE_EXISTING_PAYMENT',
  // Explicitly put the settlement back to PENDING for recalculation.
  'RESET_CALCULATION',
  // Only note that nothing was handed over; the settlement stays REQUIRED.
  'REVIEWED_UNSETTLED',
] as const;

export type ReconciliationChoice = (typeof RECONCILIATION_CHOICES)[number];

export class ReconcileSettlementDto {
  @IsIn(RECONCILIATION_CHOICES as unknown as string[])
  choice: ReconciliationChoice;

  @IsOptional()
  @IsIn(['PAID_OUT', 'SETTLED_BY_OFFSET'])
  decision?: 'PAID_OUT' | 'SETTLED_BY_OFFSET';

  // Evidence rows the admin examined. Checked to belong to this settlement.
  @IsOptional()
  @IsInt()
  @Min(1)
  reviewedMoneyTransactionId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reviewedCreditTransactionId?: number;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;
}
