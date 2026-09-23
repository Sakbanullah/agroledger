import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ConfirmSaleDto } from './dto/confirm-sale.dto';
import { UpdateSalePriceDto } from './dto/update-sale-price.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // GET ALL SALES
  // ==========================================

  async findAll() {
    return this.prisma.sale.findMany({
      orderBy: {
        saleDate: 'desc',
      },
      include: {
        farm: true,
        commodity: true,
      },
    });
  }

  // ==========================================
  // GET SINGLE SALE
  // ==========================================

  async findOne(id: number) {
    return this.prisma.sale.findUnique({
      where: {
        id,
      },
      include: {
        farm: true,
        commodity: true,
        rubberWorkers: {
          include: {
            worker: true,
          },
        },
        settlements: {
          include: {
            worker: true,
          },
        },
      },
    });
  }

  // ==========================================
  // CREATE SALE
  // ==========================================

  async create(createSaleDto: CreateSaleDto) {
    return this.prisma.sale.create({
      data: {
        farmId: createSaleDto.farmId,
        commodityId: createSaleDto.commodityId,
        saleDate: new Date(createSaleDto.saleDate),

        ...(createSaleDto.pricePerKg !== undefined && {
          pricePerKg: createSaleDto.pricePerKg,
        }),

        ...(createSaleDto.totalWeightKg !== undefined && {
          totalWeightKg: createSaleDto.totalWeightKg,
        }),

        ...(createSaleDto.buyerName !== undefined && {
          buyerName: createSaleDto.buyerName,
        }),

        status: createSaleDto.status ?? 'PENDING',

        ...(createSaleDto.notes !== undefined && {
          notes: createSaleDto.notes,
        }),
      },

      include: {
        farm: true,
        commodity: true,
      },
    });
  }

  // ==========================================
  // UPDATE SALE PRICE
  // ==========================================

  async updatePrice(id: number, updateSalePriceDto: UpdateSalePriceDto) {
    const sale = await this.prisma.sale.findUnique({
      where: {
        id,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale tidak ditemukan');
    }

    if (sale.status !== 'PENDING') {
      throw new BadRequestException(
        'Harga hanya dapat diubah untuk Sale yang masih PENDING',
      );
    }

    return this.prisma.sale.update({
      where: {
        id,
      },
      data: {
        pricePerKg: updateSalePriceDto.pricePerKg,
      },
      include: {
        farm: true,
        commodity: true,
      },
    });
  }

  // ==========================================
  // CONFIRM SALE
  // PENDING → CONFIRMED
  // ==========================================

  async confirmSale(id: number, confirmSaleDto: ConfirmSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: {
          id,
        },
        include: {
          commodity: true,
        },
      });

      if (!sale) {
        throw new NotFoundException('Sale tidak ditemukan');
      }

      // ==========================================
      // ONLY PENDING CAN BE CONFIRMED
      // ==========================================

      if (sale.status !== 'PENDING') {
        throw new BadRequestException('Sale sudah dikonfirmasi');
      }

      // ==========================================
      // VALIDATE PRICE
      // ==========================================

      if (sale.pricePerKg === null) {
        throw new BadRequestException('Harga penjualan belum tersedia');
      }

      // ==========================================
      // VALIDATE WEIGHT
      // ==========================================

      if (Number(sale.totalWeightKg) <= 0) {
        throw new BadRequestException('Berat penjualan harus lebih dari 0');
      }

      // ==========================================
      // VALIDATE RUBBER WORKERS
      // ==========================================

      if (sale.commodity.name === 'Karet') {
        const rubberWorkers = await tx.rubberSaleWorker.findMany({
          where: {
            saleId: id,
          },
        });

        if (rubberWorkers.length === 0) {
          throw new BadRequestException(
            'Sale karet harus memiliki minimal satu worker',
          );
        }

        const totalWorkerWeight = rubberWorkers.reduce(
          (total, worker) => total + Number(worker.weightKg),
          0,
        );

        if (totalWorkerWeight !== Number(sale.totalWeightKg)) {
          throw new BadRequestException(
            `Total berat worker (${totalWorkerWeight} kg) tidak sama dengan total berat sale (${Number(
              sale.totalWeightKg,
            )} kg)`,
          );
        }
      }

      // ==========================================
      // CALCULATE TOTAL
      // ==========================================

      const totalAmount = Number(sale.totalWeightKg) * Number(sale.pricePerKg);

      // ==========================================
      // UPDATE SALE STATUS
      // PENDING → CONFIRMED
      // ==========================================

      const updateResult = await tx.sale.updateMany({
        where: {
          id,
          status: 'PENDING',
        },
        data: {
          status: 'CONFIRMED',

          ...(confirmSaleDto.buyerName !== undefined && {
            buyerName: confirmSaleDto.buyerName,
          }),
        },
      });

      if (updateResult.count !== 1) {
        throw new BadRequestException(
          'Sale sudah dikonfirmasi oleh proses lain',
        );
      }

      // ==========================================
      // CREATE MONEY IN
      // ==========================================
      //
      // Uang hasil penjualan masuk pada saat
      // penjualan dikonfirmasi.
      //
      // Ini TIDAK berarti sale sudah COMPLETED.
      // COMPLETED baru diberikan setelah settlement
      // seluruh worker selesai.
      // ==========================================

      await tx.moneyTransaction.create({
        data: {
          type: 'IN',
          category: 'HARVEST_SALE',
          amount: totalAmount,
          transactionDate: new Date(),
          description: `Penerimaan penjualan ${sale.commodity.name}`,
          referenceType: 'SALE',
          referenceId: sale.id,
        },
      });

      // ==========================================
      // RETURN UPDATED SALE
      // ==========================================

      return tx.sale.findUnique({
        where: {
          id: sale.id,
        },
        include: {
          farm: true,
          commodity: true,
        },
      });
    });
  }

  // ==========================================
  // DELETE DRAFT SALE
  // ==========================================

  async deleteDraftSale(id: number) {
    return this.prisma.$transaction(async (tx) => {
      // ==========================================
      // GET SALE
      // ==========================================

      const sale = await tx.sale.findUnique({
        where: {
          id,
        },
      });

      if (!sale) {
        throw new NotFoundException('Sale tidak ditemukan');
      }

      // ==========================================
      // ONLY PENDING CAN BE DELETED
      // ==========================================

      if (sale.status !== 'PENDING') {
        throw new BadRequestException(
          'Sale yang sudah dikonfirmasi tidak dapat dihapus',
        );
      }

      // ==========================================
      // DELETE RUBBER SALE WORKERS
      // ==========================================

      await tx.rubberSaleWorker.deleteMany({
        where: {
          saleId: id,
        },
      });

      // ==========================================
      // DELETE SALE
      // ==========================================

      await tx.sale.delete({
        where: {
          id,
        },
      });

      // ==========================================
      // RESULT
      // ==========================================

      return {
        message: 'Draft penjualan berhasil dihapus',
        saleId: id,
      };
    });
  }
}
