import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { PayOwnerSettlementDto } from './dto/pay-owner-settlement.dto';

// =========================================================
// OWNER SETTLEMENT (Sawit RELATIVE owner share payment)
//
// Domain TERPISAH dari rubber worker Settlement
// (src/settlements). Workflow Karet tidak diubah di sini.
// =========================================================

@Injectable()
export class OwnerSettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // FIND ALL
  // =========================================================

  async findAll() {
    return this.prisma.ownerSettlement.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        owner: true,
        sale: {
          include: {
            farm: true,
            commodity: true,
          },
        },
      },
    });
  }

  // =========================================================
  // FIND ONE
  // =========================================================

  async findOne(id: number) {
    const settlement = await this.prisma.ownerSettlement.findUnique({
      where: {
        id,
      },
      include: {
        owner: true,
        sale: {
          include: {
            farm: true,
            commodity: true,
          },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException('Owner settlement tidak ditemukan');
    }

    return settlement;
  }

  // =========================================================
  // PAY OWNER SETTLEMENT
  //
  // Aturan cashflow (docs/CASHFLOW-RULES.md):
  // - Owner share yang belum dibayar = kewajiban kepada
  //   pemilik kebun RELATIVE.
  // - Setiap pembayaran = SATU MoneyTransaction OUT
  //   sebesar pembayaran aktual (bukan outstanding total).
  // - TIDAK membuat MoneyTransaction IN.
  // - Gross sale, commission, dan ownerShare di Sale TIDAK
  //   diubah oleh pembayaran.
  // =========================================================

  async payOwnerSettlement(
    id: number,
    payOwnerSettlementDto: PayOwnerSettlementDto,
  ) {
    const payment = payOwnerSettlementDto.amount;

    if (payment <= 0) {
      throw new BadRequestException('Nominal pembayaran harus lebih dari 0');
    }

    return this.prisma.$transaction(
      async (tx) => {
        // -------------------------------------------------
        // GET SETTLEMENT + SALE (row-locked)
        //
        // FOR UPDATE memastikan dua concurrent payment
        // tidak membaca outstanding yang sama (stale read).
        // Request kedua menunggu lock sampai request pertama
        // commit, lalu membaca outstanding terbaru.
        // -------------------------------------------------

        const locked = await tx.$queryRaw<
          Array<{ id: number }>
        >`SELECT id FROM OwnerSettlement WHERE id = ${id} FOR UPDATE`;

        if (locked.length === 0) {
          throw new NotFoundException('Owner settlement tidak ditemukan');
        }

        const settlement = await tx.ownerSettlement.findUnique({
          where: {
            id,
          },
          include: {
            owner: true,
            sale: true,
          },
        });

        if (!settlement) {
          throw new NotFoundException('Owner settlement tidak ditemukan');
        }

        // -------------------------------------------------
        // TIDAK BOLEH BAYAR YANG SUDAH LUNAS
        // -------------------------------------------------

        if (settlement.status === 'COMPLETED') {
          throw new BadRequestException(
            'Owner settlement sudah lunas dan tidak dapat dibayar lagi',
          );
        }

        const ownerShareAmount = Number(settlement.ownerShareAmount);
        const settledAmount = Number(settlement.settledAmount);
        const outstandingAmount = Number(settlement.outstandingAmount);

        // -------------------------------------------------
        // VALIDATE PAYMENT <= OUTSTANDING
        // (outstanding terbaru dari pembayaran sebelumnya)
        // -------------------------------------------------

        if (payment > outstandingAmount) {
          throw new BadRequestException(
            `Pembayaran (${payment}) melebihi sisa kewajiban (${outstandingAmount})`,
          );
        }

        // -------------------------------------------------
        // HITUNG TOTAL BARU
        // -------------------------------------------------

        const newSettledAmount = settledAmount + payment;
        const newOutstandingAmount = ownerShareAmount - newSettledAmount;

        const isLunas = newOutstandingAmount <= 0;
        const newStatus = isLunas ? 'COMPLETED' : 'PARTIAL';

        // -------------------------------------------------
        // UPDATE SETTLEMENT
        // Tidak mengubah ownerShareAmount (invariant).
        // -------------------------------------------------

        await tx.ownerSettlement.update({
          where: {
            id,
          },
          data: {
            settledAmount: newSettledAmount,
            outstandingAmount: newOutstandingAmount,
            status: newStatus,
          },
        });

        // -------------------------------------------------
        // CREATE MONEY OUT (cash keluar dari kas user)
        // farmId = source/origin farm dari Sale.
        // Tidak membuat MoneyTransaction IN.
        // -------------------------------------------------

        await tx.moneyTransaction.create({
          data: {
            type: 'OUT',
            category: 'OWNER_SETTLEMENT',
            amount: payment,
            transactionDate: new Date(),
            description: `Pembayaran owner share ${settlement.owner.name} (Sale #${settlement.saleId})`,
            referenceType: 'OWNER_SETTLEMENT',
            referenceId: settlement.id,
            farmId: settlement.sale.farmId,
          },
        });

        // -------------------------------------------------
        // RETURN SETTLEMENT TERBARU
        // -------------------------------------------------

        return tx.ownerSettlement.findUnique({
          where: {
            id,
          },
          include: {
            owner: true,
            sale: {
              include: {
                farm: true,
                commodity: true,
              },
            },
          },
        });
      },
      {
        isolationLevel: 'ReadCommitted',
      },
    );
  }
}
