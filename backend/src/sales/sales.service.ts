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

  async create(createSaleDto: CreateSaleDto) {
    return this.prisma.sale.create({
      data: {
        farmId: createSaleDto.farmId,
        commodityId: createSaleDto.commodityId,
        saleDate: new Date(createSaleDto.saleDate),
        pricePerKg: createSaleDto.pricePerKg,
        totalWeightKg: createSaleDto.totalWeightKg,
        buyerName: createSaleDto.buyerName,
        status: createSaleDto.status ?? 'PENDING',
        notes: createSaleDto.notes,
      },
      include: {
        farm: true,
        commodity: true,
      },
    });
  }

  async updatePrice(id: number, updateSalePriceDto: UpdateSalePriceDto) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
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
      where: { id },
      data: {
        pricePerKg: updateSalePriceDto.pricePerKg,
      },
      include: {
        farm: true,
        commodity: true,
      },
    });
  }
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

      if (sale.status !== 'PENDING') {
        throw new BadRequestException('Sale sudah dikonfirmasi');
      }

      if (sale.pricePerKg === null) {
        throw new BadRequestException('Harga penjualan belum tersedia');
      }

      if (Number(sale.totalWeightKg) <= 0) {
        throw new BadRequestException('Berat penjualan harus lebih dari 0');
      }

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
            `Total berat worker (${totalWorkerWeight} kg) tidak sama dengan total berat sale (${Number(sale.totalWeightKg)} kg)`,
          );
        }
      }

      const totalAmount = Number(sale.totalWeightKg) * Number(sale.pricePerKg);

      const updateResult = await tx.sale.updateMany({
        where: {
          id,
          status: 'PENDING',
        },
        data: {
          status: 'COMPLETED',
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
}
