import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { SETTLEMENT_STATUS } from './settlement-status';
import { SettlementsService } from './settlements.service';

/**
 * Calculation and payment are separate steps. These tests drive the service
 * through a mocked Prisma client, so they prove the writes it issues and how
 * they are guarded; they do not prove database locking or concurrency.
 */
describe('SettlementsService (calculation vs payment)', () => {
  let service: SettlementsService;
  let prisma: Record<string, any>;

  const workerRow = (overrides: Record<string, unknown> = {}) => ({
    id: 7,
    saleId: 10,
    workerId: 101,
    pieces: 10,
    weightKg: 10,
    worker: { id: 101, name: 'Ahmad' },
    sale: {
      id: 10,
      farmId: 3,
      status: 'CONFIRMED',
      pricePerKg: 2000,
    },
    ...overrides,
  });

  const settlementRow = (overrides: Record<string, unknown> = {}) => ({
    id: 50,
    saleId: 10,
    workerId: 101,
    grossShare: 10000,
    kasbonAmount: 4000,
    deductionAmount: 4000,
    netAmount: 6000,
    status: SETTLEMENT_STATUS.PENDING,
    worker: { id: 101, name: 'Ahmad' },
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      sale: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      rubberSaleWorker: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      settlement: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      creditAccount: {
        findUnique: jest.fn(),
      },
      creditTransaction: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      moneyTransaction: {
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      settlementReconciliation: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(prisma)),
    };

    service = new SettlementsService(prisma as unknown as PrismaService);
  });

  describe('confirmSaleSettlements (calculation only)', () => {
    it('creates PENDING settlements and writes no cash or kasbon rows', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 10,
        status: 'CONFIRMED',
        pricePerKg: 2000,
      });
      prisma.rubberSaleWorker.findMany.mockResolvedValue([workerRow()]);
      prisma.settlement.findMany.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([{ id: 1, personId: 101, status: 'ACTIVE' }]);
      prisma.creditTransaction.findMany.mockResolvedValue([
        { type: 'DEBT', amount: 4000 },
      ]);
      prisma.settlement.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 50,
        ...data,
      }));

      const result = await service.confirmSaleSettlements(10);

      expect(prisma.settlement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: SETTLEMENT_STATUS.PENDING,
          grossShare: 10000,
          kasbonAmount: 4000,
          deductionAmount: 4000,
          netAmount: 6000,
        }),
      });
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'COMPLETED' },
      });
      expect(result[0].netAmount).toBe(6000);
      expect(result[0].remainingKasbon).toBe(0);
    });

    it('marks a zero-net settlement as pending, not paid', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 10,
        status: 'CONFIRMED',
        pricePerKg: 2000,
      });
      prisma.rubberSaleWorker.findMany.mockResolvedValue([workerRow()]);
      prisma.settlement.findMany.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([{ id: 1, personId: 101, status: 'ACTIVE' }]);
      prisma.creditTransaction.findMany.mockResolvedValue([
        { type: 'DEBT', amount: 50000 },
      ]);
      prisma.settlement.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 51,
        ...data,
      }));

      await service.confirmSaleSettlements(10);

      expect(prisma.settlement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: SETTLEMENT_STATUS.PENDING,
          deductionAmount: 10000,
          netAmount: 0,
        }),
      });
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('paySettlement', () => {
    const arrangePay = (overrides: {
      sale?: Record<string, unknown>;
      settlement?: Record<string, unknown>;
      credit?: { type: string; amount: number }[];
      appliedReference?: { id: number }[];
    }) => {
      // Every lock query answers with a sale row; the worker's credit account
      // lock is separately recognised by its personId column so the sweep can
      // still ask for "no account" with an empty array.
      prisma.$queryRaw.mockImplementation(
        async (_template: unknown, ...values: number[]) =>
          values.length > 0
            ? [{ id: 1, personId: values[0], status: 'ACTIVE' }]
            : [{ saleId: 10 }],
      );
      prisma.sale.findUnique.mockResolvedValue({
        id: 10,
        status: 'COMPLETED',
        farmId: 3,
        ...overrides.sale,
      });
      prisma.settlement.findUnique.mockResolvedValue(
        settlementRow(overrides.settlement),
      );
      // The completion state reads every settlement of the sale; the mocked
      // delegate has to answer that read too.
      prisma.settlement.findMany.mockResolvedValue([]);
      prisma.creditTransaction.findMany.mockImplementation(
        async (args: { where: { reference?: string } }) =>
          args?.where?.reference !== undefined
            ? (overrides.appliedReference ?? [])
            : (overrides.credit ?? [{ type: 'DEBT', amount: 4000 }]),
      );
      prisma.moneyTransaction.create.mockResolvedValue({ id: 900 });
      prisma.creditTransaction.create.mockResolvedValue({ id: 800 });
      prisma.settlement.updateMany.mockResolvedValue({ count: 1 });
    };

    it('cash payment writes exactly one OUT and marks PAID_OUT', async () => {
      arrangePay({});

      const result = await service.paySettlement(50);

      expect(prisma.moneyTransaction.create).toHaveBeenCalledTimes(1);
      expect(prisma.moneyTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'OUT',
          category: 'RUBBER_WORKER_SETTLEMENT',
          amount: 6000,
          referenceType: 'SETTLEMENT',
          referenceId: 50,
          farmId: 3,
        }),
      });
      expect(prisma.creditTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'PAYMENT',
          amount: 4000,
          reference: 'SETTLEMENT-50',
        }),
      });
      expect(prisma.settlement.updateMany).toHaveBeenCalledWith({
          where: { id: 50, status: SETTLEMENT_STATUS.PENDING },
        data: expect.objectContaining({
          status: SETTLEMENT_STATUS.PAID_OUT,
          settlementMethod: 'CASH',
          cashTransactionId: 900,
          creditTransactionId: 800,
        }),
      });
      expect(result.status).toBe(SETTLEMENT_STATUS.PAID_OUT);
    });

    it('refuses a settlement whose figures do not add up', async () => {
      arrangePay({ settlement: { grossShare: 10000, deductionAmount: 4000, netAmount: 5000 } });

      await expect(service.paySettlement(50)).rejects.toThrow(
        /tidak konsisten/,
      );
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
    });

    it('BD-17: closes a zero-balance settlement as NO_BALANCE without any transaction', async () => {
      arrangePay({
        settlement: { grossShare: 0, deductionAmount: 0, netAmount: 0 },
        credit: [],
      });

      const result = await service.paySettlement(50);

      expect(result.status).toBe(SETTLEMENT_STATUS.NO_BALANCE);
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
      expect(prisma.settlement.updateMany).toHaveBeenCalledWith({
        where: { id: 50, status: SETTLEMENT_STATUS.PENDING },
        data: expect.objectContaining({
          status: SETTLEMENT_STATUS.NO_BALANCE,
          settlementMethod: 'NO_BALANCE',
          cashTransactionId: null,
          creditTransactionId: null,
        }),
      });
    });

    it('BD-17: refuses gross 0 when a deduction exists', async () => {
      arrangePay({
        settlement: { grossShare: 0, deductionAmount: 500, netAmount: 0 },
        credit: [{ type: 'DEBT', amount: 500 }],
      });

      await expect(service.paySettlement(50)).rejects.toThrow(
        /tidak konsisten/,
      );
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
      expect(prisma.settlement.updateMany).not.toHaveBeenCalled();
    });

    it('refuses a settlement flagged for reconciliation', async () => {
      arrangePay({ settlement: { reconciliationStatus: 'REQUIRED' } });

      await expect(service.paySettlement(50)).rejects.toThrow(
        /rekonsiliasi/,
      );
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
    });

    it('accepts a deduction below the current debt when the stored figures add up', async () => {
      arrangePay({
        settlement: { grossShare: 11000, deductionAmount: 4000, netAmount: 7000 },
        credit: [{ type: 'DEBT', amount: 9000 }],
      });

      const result = await service.paySettlement(50);

      expect(result.status).toBe(SETTLEMENT_STATUS.PAID_OUT);
      expect(prisma.creditTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ amount: 4000 }),
      });
      expect(prisma.moneyTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ amount: 7000 }),
      });
    });

    it('refuses a zero net that the deduction does not fully cover', async () => {
      arrangePay({
        settlement: { grossShare: 10000, deductionAmount: 4000, netAmount: 0 },
      });

      await expect(service.paySettlement(50)).rejects.toThrow(
        /tidak konsisten/,
      );
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });

    it('refuses when the kasbon deduction was already recorded, avoiding a double offset', async () => {
      arrangePay({ appliedReference: [{ id: 700 }] });

      await expect(service.paySettlement(50)).rejects.toThrow(
        /sudah pernah dicatat/,
      );
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });

    it('zero net is settled by offset with no cash row', async () => {
      arrangePay({
        settlement: { grossShare: 10000, netAmount: 0, deductionAmount: 10000 },
        credit: [{ type: 'DEBT', amount: 10000 }],
      });

      const result = await service.paySettlement(50);

      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'PAYMENT', amount: 10000 }),
      });
      expect(prisma.settlement.updateMany).toHaveBeenCalledWith({
        where: { id: 50, status: SETTLEMENT_STATUS.PENDING },
        data: expect.objectContaining({
          status: SETTLEMENT_STATUS.SETTLED_BY_OFFSET,
          settlementMethod: 'OFFSET',
          cashTransactionId: null,
        }),
      });
      expect(result.status).toBe(SETTLEMENT_STATUS.SETTLED_BY_OFFSET);
    });

    it('retry on a settled settlement returns it without a second payment', async () => {
      arrangePay({
        settlement: {
          status: SETTLEMENT_STATUS.PAID_OUT,
          settledAt: new Date('2026-11-21T10:00:00Z'),
          cashTransactionId: 900,
        },
      });

      const result = await service.paySettlement(50);

      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
      expect(prisma.settlement.updateMany).not.toHaveBeenCalled();
      expect(result.alreadySettled).toBe(true);
      expect(result.status).toBe(SETTLEMENT_STATUS.PAID_OUT);
    });

    it('retry on an offset settlement returns it without a second payment', async () => {
      arrangePay({
        settlement: {
          status: SETTLEMENT_STATUS.SETTLED_BY_OFFSET,
          netAmount: 0,
          deductionAmount: 10000,
        },
      });

      const result = await service.paySettlement(50);

      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
      expect(result.alreadySettled).toBe(true);
    });

    it('refuses a deduction larger than the outstanding kasbon', async () => {
      arrangePay({ credit: [{ type: 'DEBT', amount: 1000 }] });

      await expect(service.paySettlement(50)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });

    it('refuses to pay when the sale was cancelled', async () => {
      arrangePay({ sale: { status: 'CANCELLED' } });

      await expect(service.paySettlement(50)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });

    it('refuses when a concurrent payment claimed the row first', async () => {
      arrangePay({});
      prisma.settlement.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.paySettlement(50)).rejects.toThrow(
        /proses lain/,
      );
    });

    it('refuses settleSale when any pending settlement awaits reconciliation', async () => {
      prisma.$queryRaw.mockImplementation(
        async (_template: unknown, ...values: number[]) =>
          values.length > 0 ? [{ id: 1, personId: values[0], status: 'ACTIVE' }] : [{ saleId: 10 }],
      );
      prisma.sale.findUnique.mockResolvedValue({
        id: 10,
        status: 'COMPLETED',
        farmId: 3,
      });
      prisma.settlement.findMany.mockResolvedValue([
        settlementRow({ reconciliationStatus: 'REQUIRED' }),
      ]);

      await expect(service.settleSale(10)).rejects.toThrow(/rekonsiliasi/);
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });

    it('refuses a settlement that does not exist', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(service.paySettlement(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('settleSale (pay every pending worker)', () => {
    // Every lock query answers with a sale row; the worker's credit account
    // lock is the only one carrying a personId, so it answers with the
    // account that holds the kasbon being deducted.
    beforeEach(() => {
      prisma.$queryRaw.mockImplementation(
        async (_template: unknown, ...values: number[]) =>
          values.length > 0 ? [{ id: 1, personId: values[0], status: 'ACTIVE' }] : [{ saleId: 10 }],
      );
    });

    it('reports the computed payment state after paying', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 10,
        status: 'COMPLETED',
        farmId: 3,
      });
      prisma.settlement.findMany
        .mockResolvedValueOnce([
          settlementRow({ id: 50 }),
          settlementRow({ id: 51, workerId: 102, worker: { id: 102, name: 'Siti' } }),
        ])
        .mockResolvedValueOnce([
          settlementRow({ id: 50 }),
          settlementRow({ id: 51, workerId: 102, worker: { id: 102, name: 'Siti' } }),
        ])
        .mockResolvedValueOnce([
          { status: SETTLEMENT_STATUS.PAID_OUT },
          { status: SETTLEMENT_STATUS.PAID_OUT },
        ]);
      prisma.settlement.updateMany.mockResolvedValue({ count: 1 });
      prisma.moneyTransaction.create
        .mockResolvedValueOnce({ id: 900 })
        .mockResolvedValueOnce({ id: 901 });
      // The debt lookup and the once-only deduction check share one delegate:
      // answer the former with the debt and the latter with "not recorded".
      prisma.creditTransaction.findMany.mockImplementation(
        async (args: { where: { reference?: string } }) =>
          args?.where?.reference !== undefined
            ? []
            : [{ type: 'DEBT', amount: 4000 }],
      );
      prisma.creditTransaction.create
        .mockResolvedValueOnce({ id: 800 })
        .mockResolvedValueOnce({ id: 801 });

      const result = await service.settleSale(10);

      expect(result.paidCash).toBe(2);
      expect(result.settledByOffset).toBe(0);
      expect(prisma.moneyTransaction.create).toHaveBeenCalledTimes(2);
      expect(result.completionState).toBe('FULLY_SETTLED');
    });

    it('refuses to pay a sale whose calculation is not complete', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 10,
        status: 'CONFIRMED',
        farmId: 3,
      });

      await expect(service.settleSale(10)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('reconcileSettlement', () => {
    const arrange = (overrides: {
      settlement?: Record<string, unknown>;
      money?: unknown;
      credit?: unknown;
      cashRows?: number;
      deductionRows?: number;
    } = {}) => {
      prisma.$queryRaw.mockResolvedValue([{ id: 50 }]);
      prisma.settlement.findUnique.mockResolvedValue(
        settlementRow({
          status: SETTLEMENT_STATUS.PENDING,
          reconciliationStatus: 'REQUIRED',
          ...overrides.settlement,
        }),
      );
      prisma.moneyTransaction.findUnique.mockResolvedValue(overrides.money ?? null);
      prisma.moneyTransaction.count.mockResolvedValue(overrides.cashRows ?? 0);
      prisma.creditTransaction.count = jest
        .fn()
        .mockResolvedValue(overrides.deductionRows ?? 0);
      prisma.creditTransaction.findFirst = jest
        .fn()
        .mockResolvedValue(overrides.credit ?? null);
      prisma.settlement.updateMany.mockResolvedValue({ count: 1 });
      prisma.settlementReconciliation.create.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data }),
      );
    };

    it('refuses to reconcile a settlement whose sale is cancelled', async () => {
      arrange();
      prisma.sale.findUnique.mockResolvedValue({ status: 'CANCELLED' });

      await expect(
        service.reconcileSettlement(50, {
          choice: 'REVIEWED_UNSETTLED',
          verifiedNoCashPayment: true,
          verifiedKasbonDeductionNotRecorded: true,
          reason: 'Tidak ada pembayaran tunai; potongan kasbon belum tercatat',
        }),
      ).rejects.toThrow(/dibatalkan/);

      expect(prisma.settlement.updateMany).not.toHaveBeenCalled();
      expect(prisma.settlementReconciliation.create).not.toHaveBeenCalled();
    });

    it('refuses a settlement that is not flagged for reconciliation', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: 50 }]);
      prisma.settlement.findUnique.mockResolvedValue(
        settlementRow({ reconciliationStatus: null }),
      );

      await expect(
        service.reconcileSettlement(50, {
          choice: 'REVIEWED_UNSETTLED',
          reason: 'Tidak ada bukti transaksi yang ditemukan',
        }),
      ).rejects.toThrow(/tidak menunggu rekonsiliasi/);
    });

    it('records a PAID_OUT decision backed by an existing OUT and writes no new financial row', async () => {
      arrange({
        money: {
          id: 900,
          type: 'OUT',
          amount: 6000,
          referenceType: 'SETTLEMENT',
          referenceId: 50,
          transactionDate: new Date('2026-01-02T10:00:00Z'),
        },
      });

      const result = await service.reconcileSettlement(
        50,
        {
          choice: 'USE_EXISTING_PAYMENT',
          decision: 'PAID_OUT',
          reviewedMoneyTransactionId: 900,
          reason: 'Bukti transfer pembayaran ditemukan dan cocok',
        },
        { userId: 7 },
      );

      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
      expect(prisma.settlement.updateMany).toHaveBeenCalledWith({
        where: {
          id: 50,
          status: SETTLEMENT_STATUS.PENDING,
          reconciliationStatus: 'REQUIRED',
        },
        data: expect.objectContaining({
          status: SETTLEMENT_STATUS.PAID_OUT,
          cashTransactionId: 900,
          reconciliationStatus: 'RESOLVED',
        }),
      });
      expect(prisma.settlementReconciliation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          settlementId: 50,
          decision: 'USE_EXISTING_PAYMENT',
          statusBefore: SETTLEMENT_STATUS.PENDING,
          statusAfter: SETTLEMENT_STATUS.PAID_OUT,
          reviewedMoneyTransactionId: 900,
          decidedById: 7,
        }),
      });
      expect(result.reconciliation.decision).toBe('USE_EXISTING_PAYMENT');
    });

    it('records an offset decision backed by an existing PAYMENT', async () => {
      arrange({
        settlement: { grossShare: 10000, deductionAmount: 10000, netAmount: 0 },
        credit: {
          id: 800,
          type: 'PAYMENT',
          reference: 'SETTLEMENT-50',
          amount: 10000,
          transactionDate: new Date('2026-01-02T10:00:00Z'),
        },
      });

      await service.reconcileSettlement(50, {
        choice: 'USE_EXISTING_PAYMENT',
        decision: 'SETTLED_BY_OFFSET',
        reviewedCreditTransactionId: 800,
        reason: 'Potongan kasbon penuh tercatat untuk settlement ini',
      });

      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
      expect(prisma.settlement.updateMany).toHaveBeenCalledWith({
        where: {
          id: 50,
          reconciliationStatus: 'REQUIRED',
          status: SETTLEMENT_STATUS.PENDING,
        },
        data: expect.objectContaining({
          status: SETTLEMENT_STATUS.SETTLED_BY_OFFSET,
          creditTransactionId: 800,
        }),
      });
    });

    it('refuses evidence that belongs to another settlement', async () => {
      arrange({
        money: {
          id: 901,
          type: 'OUT',
          amount: 6000,
          referenceType: 'SETTLEMENT',
          referenceId: 51,
          transactionDate: new Date(),
        },
      });

      await expect(
        service.reconcileSettlement(50, {
          choice: 'USE_EXISTING_PAYMENT',
          decision: 'PAID_OUT',
          reviewedMoneyTransactionId: 901,
          reason: 'Mencoba memakai transaksi settlement lain',
        }),
      ).rejects.toThrow(/tidak terkait/);
      expect(prisma.settlementReconciliation.create).not.toHaveBeenCalled();
    });

    it('refuses a decision the stored figures do not allow', async () => {
      arrange({
        settlement: { grossShare: 10000, deductionAmount: 10000, netAmount: 0 },
      });

      await expect(
        service.reconcileSettlement(50, {
          choice: 'USE_EXISTING_PAYMENT',
          decision: 'PAID_OUT',
          reason: 'Mencoba mencatat pembayaran tunai yang tidak ada',
        }),
      ).rejects.toThrow(/net pembayaran/);
    });

    it('BD-18: UNSETTLED with proof of non-payment -> PENDING + RESOLVED, audited, no financial row', async () => {
      arrange();

      await service.reconcileSettlement(50, {
        choice: 'REVIEWED_UNSETTLED',
        verifiedNoCashPayment: true,
        verifiedKasbonDeductionNotRecorded: true,
        reason: 'Sudah dicek, kas dan kasbon tidak tercatat untuk worker ini',
      });

      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
      expect(prisma.creditTransaction.create).not.toHaveBeenCalled();
      expect(prisma.settlement.updateMany).toHaveBeenCalledWith({
        where: {
          id: 50,
          status: SETTLEMENT_STATUS.PENDING,
          reconciliationStatus: 'REQUIRED',
        },
        data: {
          status: SETTLEMENT_STATUS.PENDING,
          reconciliationStatus: 'RESOLVED',
        },
      });
      expect(prisma.settlementReconciliation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          decision: 'REVIEWED_UNSETTLED',
          statusBefore: SETTLEMENT_STATUS.PENDING,
          statusAfter: SETTLEMENT_STATUS.PENDING,
          verifiedNoCashPayment: true,
          verifiedKasbonDeductionNotRecorded: true,
          decidedById: null,
        }),
      });
    });

    it('records the assertions even when only UNSETTLED can carry them', async () => {
      arrange({
        money: {
          id: 900,
          type: 'OUT',
          amount: 6000,
          referenceType: 'SETTLEMENT',
          referenceId: 50,
          transactionDate: new Date(),
        },
      });

      await service.reconcileSettlement(50, {
        choice: 'USE_EXISTING_PAYMENT',
        decision: 'PAID_OUT',
        reviewedMoneyTransactionId: 900,
        verifiedNoCashPayment: true,
        reason: 'Bukti transfer ditemukan dan cocok',
      });

      expect(prisma.settlementReconciliation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          decision: 'USE_EXISTING_PAYMENT',
          verifiedNoCashPayment: null,
          verifiedKasbonDeductionNotRecorded: null,
        }),
      });
    });

    it('BD-18: UNSETTLED refused without both confirmations', async () => {
      arrange();

      await expect(
        service.reconcileSettlement(50, {
          choice: 'REVIEWED_UNSETTLED',
          verifiedNoCashPayment: true,
          reason: 'Hanya satu bukti yang dipastikan',
        }),
      ).rejects.toThrow(/keduanya/);
      expect(prisma.settlement.updateMany).not.toHaveBeenCalled();
      expect(prisma.settlementReconciliation.create).not.toHaveBeenCalled();
    });

    it('BD-18: UNSETTLED refused when the ledger shows a cash payment', async () => {
      arrange({ cashRows: 1 });

      await expect(
        service.reconcileSettlement(50, {
          choice: 'REVIEWED_UNSETTLED',
          verifiedNoCashPayment: true,
          verifiedKasbonDeductionNotRecorded: true,
          reason: 'Menganggap belum dibayar padahal ada kas keluar',
        }),
      ).rejects.toThrow(/pembayaran kas/);
      expect(prisma.settlement.updateMany).not.toHaveBeenCalled();
    });

    it('BD-18: UNSETTLED refused when a kasbon deduction is recorded', async () => {
      arrange({ deductionRows: 1 });

      await expect(
        service.reconcileSettlement(50, {
          choice: 'REVIEWED_UNSETTLED',
          verifiedNoCashPayment: true,
          verifiedKasbonDeductionNotRecorded: true,
          reason: 'Menganggap belum dibayar padahal kasbon sudah dipotong',
        }),
      ).rejects.toThrow(/Potongan kasbon/);
      expect(prisma.settlement.updateMany).not.toHaveBeenCalled();
    });

    it('BD-18: an UNSETTLED settlement is payable through the normal endpoint, once', async () => {
      // After reconciliation the row is PENDING and no longer REQUIRED.
      // The credit account lock is the query carrying a personId.
      prisma.$queryRaw.mockImplementation(
        async (_template: unknown, ...values: number[]) =>
          values.length > 0 ? [{ id: 1, personId: values[0], status: 'ACTIVE' }] : [{ saleId: 10 }],
      );
      prisma.sale.findUnique.mockResolvedValue({
        id: 10,
        status: 'COMPLETED',
        farmId: 3,
      });
      prisma.settlement.findUnique.mockResolvedValue(
        settlementRow({ reconciliationStatus: 'RESOLVED' }),
      );
      prisma.settlement.findMany.mockResolvedValue([]);
      prisma.creditTransaction.findMany.mockImplementation(
        async (args: { where: { reference?: string } }) =>
          args?.where?.reference !== undefined
            ? []
            : [{ type: 'DEBT', amount: 4000 }],
      );
      prisma.moneyTransaction.create.mockResolvedValue({ id: 900 });
      prisma.creditTransaction.create.mockResolvedValue({ id: 800 });
      prisma.settlement.updateMany.mockResolvedValue({ count: 1 });

      await service.paySettlement(50);

      expect(prisma.moneyTransaction.create).toHaveBeenCalledTimes(1);

      // A second payment on the now settled row is a no-op: no new OUT.
      prisma.settlement.findUnique.mockResolvedValue(
        settlementRow({
          reconciliationStatus: 'RESOLVED',
          status: SETTLEMENT_STATUS.PAID_OUT,
        }),
      );

      const retry = await service.paySettlement(50);

      expect(retry.alreadySettled).toBe(true);
      expect(prisma.moneyTransaction.create).toHaveBeenCalledTimes(1);
    });

    it('takes the actor from the authenticated session, not from the payload', async () => {
      arrange();
      const dto: Record<string, unknown> = {
        choice: 'REVIEWED_UNSETTLED',
        verifiedNoCashPayment: true,
        verifiedKasbonDeductionNotRecorded: true,
        reason: 'Dicek ulang, tidak ada bukti pembayaran sama sekali',
      };
      dto.decidedById = 999;

      await service.reconcileSettlement(50, dto as never, { userId: 7 });

      expect(prisma.settlementReconciliation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          decidedById: 7,
          verifiedNoCashPayment: true,
          verifiedKasbonDeductionNotRecorded: true,
        }),
      });
    });

    it('appends history instead of replacing it', async () => {
      prisma.settlement.findUnique.mockResolvedValue({ id: 50 });
      prisma.settlementReconciliation.findMany = jest
        .fn()
        .mockResolvedValue([{ id: 2 }, { id: 1 }]);

      const history = await service.findReconciliations(50);

      expect(history).toEqual([{ id: 2 }, { id: 1 }]);
      expect(prisma.settlementReconciliation.findMany).toHaveBeenCalledWith({
        where: { settlementId: 50 },
        orderBy: { decidedAt: 'desc' },
      });
    });
  });
});
