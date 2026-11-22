import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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
  // BD-18: the evidence proves nothing was handed over; the settlement goes
  // back to PENDING + RESOLVED and may be paid through the normal endpoint.
  'REVIEWED_UNSETTLED',
] as const;

export type ReconciliationChoice = (typeof RECONCILIATION_CHOICES)[number];

export class ReconcileSettlementDto {
  @IsIn(RECONCILIATION_CHOICES as unknown as string[])
  choice: ReconciliationChoice;

  @IsOptional()
  @IsIn(['PAID_OUT', 'SETTLED_BY_OFFSET'])
  decision?: 'PAID_OUT' | 'SETTLED_BY_OFFSET';

  // BD-18 confirmations. Both are required for REVIEWED_UNSETTLED and are
  // verified against the ledger by the service before anything changes.
  @IsOptional()
  @IsBoolean()
  verifiedNoCashPayment?: boolean;

  @IsOptional()
  @IsBoolean()
  verifiedKasbonDeductionNotRecorded?: boolean;

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
