import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OwnerSettlementsService } from './owner-settlements.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OwnerSettlementsService (Phase 2B-2)', () => {
  let service: OwnerSettlementsService;
  let prisma: Record<string, unknown>;

  beforeEach(() => {
    prisma = {
      ownerSettlement: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      moneyTransaction: {
        create: jest.fn(),
      },
      sale: {
        update: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    service = new OwnerSettlementsService(prisma as unknown as PrismaService);
  });

  const createMockSettlement = (overrides = {}) => ({
    id: 1,
    saleId: 10,
    ownerId: 101,
    ownerShareAmount: 5600000,
    settledAmount: 0,
    outstandingAmount: 5600000,
    status: 'PENDING',
    owner: { id: 101, name: 'Budi' },
    sale: {
      id: 10,
      farmId: 3,
      pricePerKg: 3000,
      totalWeightKg: 2000,
      commissionAmount: 400000,
      ownerShareAmount: 5600000,
    },
    ...overrides,
  });

  describe('payOwnerSettlement', () => {
    it('processes FULL payment: PENDING -> COMPLETED, 1 MoneyTransaction OUT', async () => {
      const settlement = createMockSettlement();
      prisma.ownerSettlement.findUnique
        .mockResolvedValueOnce(settlement)
        .mockResolvedValueOnce({
          ...settlement,
          settledAmount: 5600000,
          outstandingAmount: 0,
          status: 'COMPLETED',
        });
      prisma.ownerSettlement.update.mockResolvedValue({});
      prisma.moneyTransaction.create.mockResolvedValue({});

      await service.payOwnerSettlement(1, { amount: 5600000 });

      // Update settlement correctly
      expect(prisma.ownerSettlement.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          settledAmount: 5600000,
          outstandingAmount: 0,
          status: 'COMPLETED',
        },
      });

      // EXACTLY ONE MoneyTransaction OUT with source farmId
      expect(prisma.moneyTransaction.create).toHaveBeenCalledTimes(1);
      expect(prisma.moneyTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'OUT',
          category: 'OWNER_SETTLEMENT',
          amount: 5600000,
          referenceType: 'OWNER_SETTLEMENT',
          referenceId: 1,
          farmId: 3,
        }),
      });

      // NO SALE MODIFICATION
      expect(prisma.sale.update).not.toHaveBeenCalled();
    });

    it('processes PARTIAL payment: PENDING -> PARTIAL', async () => {
      const settlement = createMockSettlement();
      prisma.ownerSettlement.findUnique
        .mockResolvedValueOnce(settlement)
        .mockResolvedValueOnce({
          ...settlement,
          settledAmount: 3000000,
          outstandingAmount: 2600000,
          status: 'PARTIAL',
        });
      prisma.ownerSettlement.update.mockResolvedValue({});
      prisma.moneyTransaction.create.mockResolvedValue({});

      await service.payOwnerSettlement(1, { amount: 3000000 });

      expect(prisma.ownerSettlement.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          settledAmount: 3000000,
          outstandingAmount: 2600000,
          status: 'PARTIAL',
        },
      });

      // MoneyTransaction OUT = actual payment amount (3.000.000, not 5.600.000)
      expect(prisma.moneyTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'OUT',
          amount: 3000000,
        }),
      });
    });

    it('processes SUBSEQUENT payment on PARTIAL: PARTIAL -> COMPLETED', async () => {
      // Prior payment of 3.000.000 already happened
      const partialSettlement = createMockSettlement({
        settledAmount: 3000000,
        outstandingAmount: 2600000,
        status: 'PARTIAL',
      });

      prisma.ownerSettlement.findUnique
        .mockResolvedValueOnce(partialSettlement)
        .mockResolvedValueOnce({
          ...partialSettlement,
          settledAmount: 5600000,
          outstandingAmount: 0,
          status: 'COMPLETED',
        });
      prisma.ownerSettlement.update.mockResolvedValue({});
      prisma.moneyTransaction.create.mockResolvedValue({});

      // Pay remaining 2.600.000
      await service.payOwnerSettlement(1, { amount: 2600000 });

      expect(prisma.ownerSettlement.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          settledAmount: 5600000,
          outstandingAmount: 0,
          status: 'COMPLETED',
        },
      });

      expect(prisma.moneyTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'OUT',
          amount: 2600000,
        }),
      });
    });

    it('rejects OVERPAYMENT exceeding outstandingAmount', async () => {
      const settlement = createMockSettlement();
      prisma.ownerSettlement.findUnique.mockResolvedValue(settlement);

      // Attempting to pay 6.000.000 when outstanding is 5.600.000
      await expect(
        service.payOwnerSettlement(1, { amount: 6000000 }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.ownerSettlement.update).not.toHaveBeenCalled();
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });

    it('rejects OVERPAYMENT on subsequent payment', async () => {
      const partialSettlement = createMockSettlement({
        settledAmount: 3000000,
        outstandingAmount: 2600000,
        status: 'PARTIAL',
      });
      prisma.ownerSettlement.findUnique.mockResolvedValue(partialSettlement);

      // Attempting to pay 3.000.000 when remaining is 2.600.000
      await expect(
        service.payOwnerSettlement(1, { amount: 3000000 }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.ownerSettlement.update).not.toHaveBeenCalled();
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });

    it('rejects payment with amount 0 or negative', async () => {
      await expect(
        service.payOwnerSettlement(1, { amount: 0 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.payOwnerSettlement(1, { amount: -500000 }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.ownerSettlement.findUnique).not.toHaveBeenCalled();
    });

    it('rejects payment on COMPLETED settlement', async () => {
      const completedSettlement = createMockSettlement({
        settledAmount: 5600000,
        outstandingAmount: 0,
        status: 'COMPLETED',
      });
      prisma.ownerSettlement.findUnique.mockResolvedValue(completedSettlement);

      await expect(
        service.payOwnerSettlement(1, { amount: 100000 }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.ownerSettlement.update).not.toHaveBeenCalled();
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if settlement does not exist', async () => {
      prisma.ownerSettlement.findUnique.mockResolvedValue(null);

      await expect(
        service.payOwnerSettlement(999, { amount: 100000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('NEVER creates MoneyTransaction IN during payment', async () => {
      const settlement = createMockSettlement();
      prisma.ownerSettlement.findUnique
        .mockResolvedValueOnce(settlement)
        .mockResolvedValueOnce({ ...settlement });
      prisma.ownerSettlement.update.mockResolvedValue({});
      prisma.moneyTransaction.create.mockResolvedValue({});

      await service.payOwnerSettlement(1, { amount: 1000000 });

      // Inspect every money transaction created
      const calls = prisma.moneyTransaction.create.mock.calls;
      for (const call of calls) {
        expect(call[0].data.type).toBe('OUT');
        expect(call[0].data.type).not.toBe('IN');
      }
    });

    it('preserves historical grossSale and commission values on Sale', async () => {
      const settlement = createMockSettlement();
      prisma.ownerSettlement.findUnique
        .mockResolvedValueOnce(settlement)
        .mockResolvedValueOnce({ ...settlement });
      prisma.ownerSettlement.update.mockResolvedValue({});
      prisma.moneyTransaction.create.mockResolvedValue({});

      await service.payOwnerSettlement(1, { amount: 2000000 });

      // Sale must remain completely untouched
      expect(prisma.sale.update).not.toHaveBeenCalled();
    });

    it('locks the settlement row with FOR UPDATE before reading outstanding', async () => {
      const settlement = createMockSettlement();
      prisma.ownerSettlement.findUnique
        .mockResolvedValueOnce(settlement)
        .mockResolvedValueOnce({ ...settlement });
      prisma.ownerSettlement.update.mockResolvedValue({});
      prisma.moneyTransaction.create.mockResolvedValue({});

      await service.payOwnerSettlement(1, { amount: 1000000 });

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const rawTag = prisma.$queryRaw.mock.calls[0][0];
      expect(String.raw({ raw: rawTag })).toContain('FOR UPDATE');

      // Lock must be taken BEFORE the settlement is read
      const lockOrder = prisma.$queryRaw.mock.invocationCallOrder[0];
      const readOrder = prisma.ownerSettlement.findUnique.mock.invocationCallOrder[0];
      expect(lockOrder).toBeLessThan(readOrder);
    });

    it('throws NotFoundException when FOR UPDATE locks no row', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);

      await expect(
        service.payOwnerSettlement(999, { amount: 100000 }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.ownerSettlement.findUnique).not.toHaveBeenCalled();
      expect(prisma.ownerSettlement.update).not.toHaveBeenCalled();
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });
  });
});
