import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateSaleDto } from './dto/create-sale.dto';

describe('SalesService (Phase 2A-2)', () => {
  let service: SalesService;
  let prisma: any;
  let settingsService: SettingsService;

  beforeEach(() => {
    prisma = {
      farm: {
        findUnique: jest.fn(),
      },
      sale: {
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      ownerSettlement: {
        create: jest.fn(),
      },
      moneyTransaction: {
        create: jest.fn(),
      },
      rubberSaleWorker: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    settingsService = {
      getDefaultCommission: jest.fn().mockResolvedValue(200),
    } as unknown as SettingsService;

    service = new SalesService(
      prisma as unknown as PrismaService,
      settingsService,
    );
  });

  describe('create - ownership snapshot', () => {
    it('snapshots Farm.ownershipType=OWN to Sale', async () => {
      prisma.farm.findUnique.mockResolvedValue({
        id: 1,
        name: 'Kebun Sendiri',
        ownershipType: 'OWN',
      });

      prisma.sale.create.mockResolvedValue({
        id: 10,
        farmId: 1,
        ownershipType: 'OWN',
      });

      const dto: CreateSaleDto = {
        farmId: 1,
        commodityId: 1,
        saleDate: '2026-10-01',
      };

      await service.create(dto);

      expect(prisma.farm.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });

      expect(prisma.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownershipType: 'OWN',
          }),
        }),
      );
    });

    it('snapshots Farm.ownershipType=RELATIVE to Sale', async () => {
      prisma.farm.findUnique.mockResolvedValue({
        id: 2,
        name: 'Kebun Saudara',
        ownershipType: 'RELATIVE',
      });

      prisma.sale.create.mockResolvedValue({
        id: 11,
        farmId: 2,
        ownershipType: 'RELATIVE',
      });

      const dto: CreateSaleDto = {
        farmId: 2,
        commodityId: 1,
        saleDate: '2026-10-01',
      };

      await service.create(dto);

      expect(prisma.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownershipType: 'RELATIVE',
          }),
        }),
      );
    });

    it('snapshots Farm.ownershipType=NULL to Sale for legacy farms', async () => {
      prisma.farm.findUnique.mockResolvedValue({
        id: 3,
        name: 'Kebun Lama',
        ownershipType: null,
      });

      prisma.sale.create.mockResolvedValue({
        id: 12,
        farmId: 3,
        ownershipType: null,
      });

      const dto: CreateSaleDto = {
        farmId: 3,
        commodityId: 1,
        saleDate: '2026-10-01',
      };

      await service.create(dto);

      expect(prisma.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownershipType: null,
          }),
        }),
      );
    });

    it('throws NotFoundException when Farm does not exist', async () => {
      prisma.farm.findUnique.mockResolvedValue(null);

      const dto: CreateSaleDto = {
        farmId: 999,
        commodityId: 1,
        saleDate: '2026-10-01',
      };

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(prisma.sale.create).not.toHaveBeenCalled();
    });

    it('does not set commission fields on create', async () => {
      prisma.farm.findUnique.mockResolvedValue({
        id: 2,
        name: 'Kebun Saudara',
        ownershipType: 'RELATIVE',
      });

      prisma.sale.create.mockResolvedValue({
        id: 13,
        farmId: 2,
        ownershipType: 'RELATIVE',
        commissionRatePerKg: null,
        commissionAmount: null,
        ownerShareAmount: null,
      });

      const dto: CreateSaleDto = {
        farmId: 2,
        commodityId: 1,
        saleDate: '2026-10-01',
      };

      await service.create(dto);

      const createCall = prisma.sale.create.mock.calls[0][0];
      expect(createCall.data.commissionRatePerKg).toBeUndefined();
      expect(createCall.data.commissionAmount).toBeUndefined();
      expect(createCall.data.ownerShareAmount).toBeUndefined();
    });
  });

  describe('confirmSale - single cash-in with farmId', () => {
    it('creates exactly one HARVEST_SALE IN with farmId', async () => {
      const saleRow = {
        id: 20,
        farmId: 5,
        commodityId: 1,
        status: 'PENDING',
        pricePerKg: 3000,
        totalWeightKg: 2000,
        commodity: { id: 1, name: 'Sawit' },
      };

      prisma.sale.findUnique.mockResolvedValue(saleRow);
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });
      prisma.moneyTransaction.create.mockResolvedValue({});
      prisma.rubberSaleWorker.findMany.mockResolvedValue([]);

      await service.confirmSale(20, {});

      expect(prisma.moneyTransaction.create).toHaveBeenCalledTimes(1);
      expect(prisma.moneyTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'IN',
          category: 'HARVEST_SALE',
          amount: 6000000,
          referenceType: 'SALE',
          referenceId: 20,
          farmId: 5,
        }),
      });
    });

    it('does not create COMMISSION_INCOME for RELATIVE Sawit', async () => {
      const saleRow = {
        id: 21,
        farmId: 6,
        commodityId: 1,
        status: 'PENDING',
        pricePerKg: 3000,
        totalWeightKg: 2000,
        commodity: { id: 1, name: 'Sawit' },
      };

      prisma.sale.findUnique.mockResolvedValue(saleRow);
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });
      prisma.moneyTransaction.create.mockResolvedValue({});
      prisma.rubberSaleWorker.findMany.mockResolvedValue([]);

      await service.confirmSale(21, {});

      const callArgs = prisma.moneyTransaction.create.mock.calls[0][0];
      expect(callArgs.data.category).toBe('HARVEST_SALE');
      expect(callArgs.data.category).not.toBe('COMMISSION_INCOME');
    });

    it('does not create OwnerSettlement on confirmSale', async () => {
      const saleRow = {
        id: 22,
        farmId: 7,
        commodityId: 1,
        status: 'PENDING',
        pricePerKg: 3000,
        totalWeightKg: 2000,
        commodity: { id: 1, name: 'Sawit' },
      };

      prisma.sale.findUnique.mockResolvedValue(saleRow);
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });
      prisma.moneyTransaction.create.mockResolvedValue({});
      prisma.rubberSaleWorker.findMany.mockResolvedValue([]);

      await service.confirmSale(22, {});

      expect(prisma.ownerSettlement).toBeUndefined();
    });

    it('commission fields remain NULL for RELATIVE Sawit after confirm', async () => {
      const saleRow = {
        id: 23,
        farmId: 8,
        commodityId: 1,
        status: 'PENDING',
        pricePerKg: 3000,
        totalWeightKg: 2000,
        commodity: { id: 1, name: 'Sawit' },
      };

      prisma.sale.findUnique.mockResolvedValue(saleRow);
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });
      prisma.moneyTransaction.create.mockResolvedValue({});
      prisma.rubberSaleWorker.findMany.mockResolvedValue([]);

      await service.confirmSale(23, {});

      const updatePayload = prisma.sale.updateMany.mock.calls[0][0].data;
      expect(updatePayload).not.toHaveProperty('commissionRatePerKg');
      expect(updatePayload).not.toHaveProperty('commissionAmount');
      expect(updatePayload).not.toHaveProperty('ownerShareAmount');
    });

    it('rejects confirm when price is missing', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 24,
        farmId: 9,
        status: 'PENDING',
        pricePerKg: null,
        totalWeightKg: 2000,
        commodity: { id: 1, name: 'Sawit' },
      });

      await expect(service.confirmSale(24, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });

    it('rejects confirm when already confirmed', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 25,
        farmId: 10,
        status: 'CONFIRMED',
        pricePerKg: 3000,
        totalWeightKg: 2000,
        commodity: { id: 1, name: 'Sawit' },
      });

      await expect(service.confirmSale(25, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('setCommission (Phase 2B)', () => {
    it('sets default commission (Rp200/kg) for Sawit RELATIVE and creates OwnerSettlement', async () => {
      const confirmedSale = {
        id: 30,
        status: 'CONFIRMED',
        ownershipType: 'RELATIVE',
        totalWeightKg: 2000,
        pricePerKg: 3000,
        farm: {
          id: 5,
          owners: [
            {
              personId: 101,
              person: { id: 101, name: 'Budi' },
            },
          ],
        },
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [],
      };

      prisma.sale.findUnique
        .mockResolvedValueOnce(confirmedSale)
        .mockResolvedValueOnce({
          ...confirmedSale,
          commissionRatePerKg: 200,
          commissionAmount: 400000,
          ownerShareAmount: 5600000,
          ownerSettlements: [{ id: 1, ownerShareAmount: 5600000 }],
        });

      prisma.sale.update.mockResolvedValue({});
      prisma.ownerSettlement.create.mockResolvedValue({});

      const _result = await service.setCommission(30, {});

      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 30 },
        data: {
          commissionRatePerKg: 200,
          commissionAmount: 400000,
          ownerShareAmount: 5600000,
        },
      });

      expect(prisma.ownerSettlement.create).toHaveBeenCalledWith({
        data: {
          saleId: 30,
          ownerId: 101,
          ownerShareAmount: 5600000,
          settledAmount: 0,
          outstandingAmount: 5600000,
          status: 'PENDING',
        },
      });

      expect(prisma.moneyTransaction.create).not.toHaveBeenCalled();
    });

    it('sets overridden commission rate (e.g. Rp250/kg)', async () => {
      const confirmedSale = {
        id: 31,
        status: 'CONFIRMED',
        ownershipType: 'RELATIVE',
        totalWeightKg: 2000,
        pricePerKg: 3000,
        farm: {
          id: 5,
          owners: [{ personId: 101, person: { id: 101, name: 'Budi' } }],
        },
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [],
      };

      prisma.sale.findUnique
        .mockResolvedValueOnce(confirmedSale)
        .mockResolvedValueOnce({ ...confirmedSale });

      prisma.sale.update.mockResolvedValue({});
      prisma.ownerSettlement.create.mockResolvedValue({});

      await service.setCommission(31, { commissionRatePerKg: 250 });

      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 31 },
        data: {
          commissionRatePerKg: 250,
          commissionAmount: 500000,
          ownerShareAmount: 5500000,
        },
      });
    });

    it('sets commission rate = 0 successfully', async () => {
      const confirmedSale = {
        id: 32,
        status: 'CONFIRMED',
        ownershipType: 'RELATIVE',
        totalWeightKg: 2000,
        pricePerKg: 3000,
        farm: {
          id: 5,
          owners: [{ personId: 101, person: { id: 101, name: 'Budi' } }],
        },
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [],
      };

      prisma.sale.findUnique
        .mockResolvedValueOnce(confirmedSale)
        .mockResolvedValueOnce({ ...confirmedSale });

      prisma.sale.update.mockResolvedValue({});
      prisma.ownerSettlement.create.mockResolvedValue({});

      await service.setCommission(32, { commissionRatePerKg: 0 });

      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 32 },
        data: {
          commissionRatePerKg: 0,
          commissionAmount: 0,
          ownerShareAmount: 6000000,
        },
      });
    });

    it('rejects Sawit OWN farm', async () => {
      const ownSale = {
        id: 33,
        status: 'CONFIRMED',
        ownershipType: 'OWN',
        totalWeightKg: 2000,
        pricePerKg: 3000,
        farm: { id: 6, owners: [] },
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [],
      };

      prisma.sale.findUnique.mockResolvedValue(ownSale);

      await expect(service.setCommission(33, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.ownerSettlement.create).not.toHaveBeenCalled();
    });

    it('rejects Karet commodity', async () => {
      const karetSale = {
        id: 34,
        status: 'CONFIRMED',
        ownershipType: 'RELATIVE',
        totalWeightKg: 100,
        pricePerKg: 10000,
        farm: { id: 7, owners: [{ personId: 1, person: { id: 1, name: 'Ali' } }] },
        commodity: { id: 2, name: 'Karet' },
        ownerSettlements: [],
      };

      prisma.sale.findUnique.mockResolvedValue(karetSale);

      await expect(service.setCommission(34, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects Sale not yet CONFIRMED (PENDING)', async () => {
      const pendingSale = {
        id: 35,
        status: 'PENDING',
        ownershipType: 'RELATIVE',
        totalWeightKg: 2000,
        pricePerKg: 3000,
        farm: { id: 5, owners: [{ personId: 101, person: { id: 101, name: 'Budi' } }] },
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [],
      };

      prisma.sale.findUnique.mockResolvedValue(pendingSale);

      await expect(service.setCommission(35, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('prevents duplicate OwnerSettlement creation', async () => {
      const alreadySettled = {
        id: 36,
        status: 'CONFIRMED',
        ownershipType: 'RELATIVE',
        totalWeightKg: 2000,
        pricePerKg: 3000,
        farm: {
          id: 5,
          owners: [{ personId: 101, person: { id: 101, name: 'Budi' } }],
        },
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [{ id: 10, ownerId: 101 }],
      };

      prisma.sale.findUnique.mockResolvedValue(alreadySettled);

      await expect(service.setCommission(36, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.ownerSettlement.create).not.toHaveBeenCalled();
    });

    it('rejects second commission attempt (immutability)', async () => {
      const alreadyWithCommission = {
        id: 37,
        status: 'CONFIRMED',
        ownershipType: 'RELATIVE',
        totalWeightKg: 2000,
        pricePerKg: 3000,
        commissionRatePerKg: 200,
        commissionAmount: 400000,
        ownerShareAmount: 5600000,
        farm: {
          id: 5,
          owners: [{ personId: 101, person: { id: 101, name: 'Budi' } }],
        },
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [{ id: 11, ownerId: 101, ownerShareAmount: 5600000 }],
      };

      prisma.sale.findUnique.mockResolvedValue(alreadyWithCommission);

      await expect(service.setCommission(37, { commissionRatePerKg: 250 }))
        .rejects.toThrow(BadRequestException);

      expect(prisma.sale.update).not.toHaveBeenCalled();
      expect(prisma.ownerSettlement.create).not.toHaveBeenCalled();
    });

    it('first commission set succeeds, second attempt fails without modifying OwnerSettlement', async () => {
      const saleAfterFirstSet = {
        id: 38,
        status: 'CONFIRMED',
        ownershipType: 'RELATIVE',
        totalWeightKg: 2000,
        pricePerKg: 3000,
        commissionRatePerKg: 200,
        commissionAmount: 400000,
        ownerShareAmount: 5600000,
        farm: {
          id: 5,
          owners: [{ personId: 101, person: { id: 101, name: 'Budi' } }],
        },
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [{ id: 12, ownerId: 101, ownerShareAmount: 5600000 }],
      };

      prisma.sale.findUnique.mockResolvedValue(saleAfterFirstSet);

      await expect(service.setCommission(38, { commissionRatePerKg: 300 }))
        .rejects.toThrow(BadRequestException);

      expect(prisma.ownerSettlement.create).not.toHaveBeenCalled();
    });
  });

  describe('completeSale (Sawit completion workflow)', () => {
    it('completes Sawit OWN: CONFIRMED -> COMPLETED', async () => {
      const ownSale = {
        id: 40,
        status: 'CONFIRMED',
        ownershipType: 'OWN',
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [],
      };

      prisma.sale.findUnique
        .mockResolvedValueOnce(ownSale)
        .mockResolvedValueOnce({ ...ownSale, status: 'COMPLETED' });
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });

      await service.completeSale(40);

      expect(prisma.sale.updateMany).toHaveBeenCalledWith({
        where: { id: 40, status: 'CONFIRMED' },
        data: { status: 'COMPLETED' },
      });
    });

    it('rejects completion for Karet (uses worker settlement flow)', async () => {
      const karetSale = {
        id: 41,
        status: 'CONFIRMED',
        ownershipType: 'OWN',
        commodity: { id: 2, name: 'Karet' },
        ownerSettlements: [],
      };

      prisma.sale.findUnique.mockResolvedValue(karetSale);

      await expect(service.completeSale(41)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.sale.updateMany).not.toHaveBeenCalled();
    });

    it('rejects completion for Sawit RELATIVE without commission', async () => {
      const relativeNoCom = {
        id: 42,
        status: 'CONFIRMED',
        ownershipType: 'RELATIVE',
        commissionRatePerKg: null,
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [],
      };

      prisma.sale.findUnique.mockResolvedValue(relativeNoCom);

      await expect(service.completeSale(42)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.sale.updateMany).not.toHaveBeenCalled();
    });

    it('rejects completion for Sawit RELATIVE with commission but OwnerSettlement not created', async () => {
      const relativeNoSettlement = {
        id: 43,
        status: 'CONFIRMED',
        ownershipType: 'RELATIVE',
        commissionRatePerKg: 200,
        commissionAmount: 400000,
        ownerShareAmount: 5600000,
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [],
      };

      prisma.sale.findUnique.mockResolvedValue(relativeNoSettlement);

      await expect(service.completeSale(43)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.sale.updateMany).not.toHaveBeenCalled();
    });

    it('rejects completion for Sawit RELATIVE with commission but OwnerSettlement pending (not lunas)', async () => {
      const relativeNotSettled = {
        id: 44,
        status: 'CONFIRMED',
        ownershipType: 'RELATIVE',
        commissionRatePerKg: 200,
        commissionAmount: 400000,
        ownerShareAmount: 5600000,
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [
          {
            id: 50,
            ownerId: 101,
            status: 'PARTIAL',
            outstandingAmount: 2600000,
            ownerShareAmount: 5600000,
            settledAmount: 3000000,
          },
        ],
      };

      prisma.sale.findUnique.mockResolvedValue(relativeNotSettled);

      await expect(service.completeSale(44)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.sale.updateMany).not.toHaveBeenCalled();
    });

    it('completes Sawit RELATIVE when commission set AND OwnerSettlement lunas (COMPLETED)', async () => {
      const relativeSettled = {
        id: 45,
        status: 'CONFIRMED',
        ownershipType: 'RELATIVE',
        commissionRatePerKg: 200,
        commissionAmount: 400000,
        ownerShareAmount: 5600000,
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [
          {
            id: 51,
            ownerId: 101,
            status: 'COMPLETED',
            outstandingAmount: 0,
            ownerShareAmount: 5600000,
            settledAmount: 5600000,
          },
        ],
      };

      prisma.sale.findUnique
        .mockResolvedValueOnce(relativeSettled)
        .mockResolvedValueOnce({ ...relativeSettled, status: 'COMPLETED' });
      prisma.sale.updateMany.mockResolvedValue({ count: 1 });

      await service.completeSale(45);

      expect(prisma.sale.updateMany).toHaveBeenCalledWith({
        where: { id: 45, status: 'CONFIRMED' },
        data: { status: 'COMPLETED' },
      });
    });

    it('rejects completion when Sale not found', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);

      await expect(service.completeSale(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects completion when Sale not CONFIRMED', async () => {
      const pendingSale = {
        id: 46,
        status: 'PENDING',
        commodity: { id: 1, name: 'Sawit' },
        ownerSettlements: [],
      };

      prisma.sale.findUnique.mockResolvedValue(pendingSale);

      await expect(service.completeSale(46)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
