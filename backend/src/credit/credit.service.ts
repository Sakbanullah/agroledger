import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditAccountDto } from './dto/create-credit-account.dto';
import { CreateCreditTransactionDto } from './dto/create-credit-transaction.dto';
import { CreateDebtDto } from './dto/create-debt.dto';

@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllAccounts() {
    return this.prisma.creditAccount.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        person: true,
        transactions: {
          orderBy: {
            transactionDate: 'desc',
          },
        },
      },
    });
  }

  async findAccount(id: number) {
    return this.prisma.creditAccount.findUnique({
      where: {
        id,
      },
      include: {
        person: true,
        transactions: {
          orderBy: {
            transactionDate: 'desc',
          },
        },
      },
    });
  }

  async createAccount(createCreditAccountDto: CreateCreditAccountDto) {
    const person = await this.prisma.person.findUnique({
      where: {
        id: createCreditAccountDto.personId,
      },
    });

    if (!person) {
      throw new NotFoundException('Person tidak ditemukan');
    }

    const existingAccount = await this.prisma.creditAccount.findUnique({
      where: {
        personId: createCreditAccountDto.personId,
      },
    });

    if (existingAccount) {
      throw new BadRequestException('Person sudah memiliki akun kasbon');
    }

    return this.prisma.creditAccount.create({
      data: {
        personId: createCreditAccountDto.personId,
      },
      include: {
        person: true,
      },
    });
  }

  async createDebt(createDebtDto: CreateDebtDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Pastikan person/worker ada
      const person = await tx.person.findUnique({
        where: {
          id: createDebtDto.personId,
        },
      });

      if (!person) {
        throw new NotFoundException('Person tidak ditemukan');
      }

      // 2. Cari credit account worker
      let creditAccount = await tx.creditAccount.findUnique({
        where: {
          personId: createDebtDto.personId,
        },
      });

      // 3. Kalau belum punya akun kasbon, buat otomatis
      if (!creditAccount) {
        creditAccount = await tx.creditAccount.create({
          data: {
            personId: createDebtDto.personId,
          },
        });
      }

      // 4. Pastikan account aktif
      if (creditAccount.status !== 'ACTIVE') {
        throw new BadRequestException('Credit account tidak aktif');
      }

      // 5. Buat transaksi DEBT
      const transaction = await tx.creditTransaction.create({
        data: {
          creditAccountId: creditAccount.id,
          type: 'DEBT',
          amount: createDebtDto.amount,
          transactionDate: new Date(createDebtDto.transactionDate),
          description: createDebtDto.description,
          reference: createDebtDto.reference,
        },
      });

      // 6. Ambil outstanding terbaru
      const transactions = await tx.creditTransaction.findMany({
        where: {
          creditAccountId: creditAccount.id,
        },
      });

      let outstandingBalance = 0;

      for (const item of transactions) {
        if (item.type === 'DEBT') {
          outstandingBalance += Number(item.amount);
        }

        if (item.type === 'PAYMENT') {
          outstandingBalance -= Number(item.amount);
        }
      }

      return {
        person,
        creditAccount,
        transaction,
        outstandingBalance,
      };
    });
  }

  async createTransaction(
    createCreditTransactionDto: CreateCreditTransactionDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        let creditAccount;

        if (createCreditTransactionDto.type === 'PAYMENT') {
          const lockedAccounts = await tx.$queryRaw<
            Array<{
              id: number;
              personId: number;
              status: string;
            }>
          >`
          SELECT id, personId, status
          FROM CreditAccount
          WHERE id = ${createCreditTransactionDto.creditAccountId}
          FOR UPDATE
        `;

          creditAccount = lockedAccounts[0];

          if (!creditAccount) {
            throw new NotFoundException('Credit account tidak ditemukan');
          }
        } else {
          creditAccount = await tx.creditAccount.findUnique({
            where: {
              id: createCreditTransactionDto.creditAccountId,
            },
          });

          if (!creditAccount) {
            throw new NotFoundException('Credit account tidak ditemukan');
          }
        }

        if (creditAccount.status !== 'ACTIVE') {
          throw new BadRequestException('Credit account tidak aktif');
        }

        if (createCreditTransactionDto.type === 'PAYMENT') {
          const transactions = await tx.creditTransaction.findMany({
            where: {
              creditAccountId: createCreditTransactionDto.creditAccountId,
            },
          });

          let outstandingBalance = 0;

          for (const transaction of transactions) {
            if (transaction.type === 'DEBT') {
              outstandingBalance += Number(transaction.amount);
            }

            if (transaction.type === 'PAYMENT') {
              outstandingBalance -= Number(transaction.amount);
            }
          }

          if (createCreditTransactionDto.amount > outstandingBalance) {
            throw new BadRequestException(
              'Jumlah pembayaran melebihi outstanding kasbon',
            );
          }
        }

        return tx.creditTransaction.create({
          data: {
            creditAccountId: createCreditTransactionDto.creditAccountId,
            type: createCreditTransactionDto.type,
            amount: createCreditTransactionDto.amount,
            transactionDate: new Date(
              createCreditTransactionDto.transactionDate,
            ),
            description: createCreditTransactionDto.description,
            reference: createCreditTransactionDto.reference,
          },
          include: {
            creditAccount: {
              include: {
                person: true,
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

  async getOutstandingBalance(creditAccountId: number) {
    const creditAccount = await this.prisma.creditAccount.findUnique({
      where: {
        id: creditAccountId,
      },
    });

    const transactions = await this.prisma.creditTransaction.findMany({
      where: {
        creditAccountId,
      },
    });

    let balance = 0;

    for (const transaction of transactions) {
      if (transaction.type === 'DEBT') {
        balance += Number(transaction.amount);
      }

      if (transaction.type === 'PAYMENT') {
        balance -= Number(transaction.amount);
      }
    }

    return {
      creditAccountId,
      outstandingBalance: balance,
    };
  }
}
