import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditAccountDto } from './dto/create-credit-account.dto';
import { CreateCreditTransactionDto } from './dto/create-credit-transaction.dto';
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

  async createTransaction(
    createCreditTransactionDto: CreateCreditTransactionDto,
  ) {
    const creditAccount = await this.prisma.creditAccount.findUnique({
      where: {
        id: createCreditTransactionDto.creditAccountId,
      },
    });

    if (!creditAccount) {
      throw new NotFoundException('Credit account tidak ditemukan');
    }

    if (creditAccount.status !== 'ACTIVE') {
      throw new BadRequestException('Credit account tidak aktif');
    }

    return this.prisma.creditTransaction.create({
      data: {
        creditAccountId: createCreditTransactionDto.creditAccountId,
        type: createCreditTransactionDto.type,
        amount: createCreditTransactionDto.amount,
        transactionDate: new Date(createCreditTransactionDto.transactionDate),
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
  }

  async getOutstandingBalance(creditAccountId: number) {
    const creditAccount = await this.prisma.creditAccount.findUnique({
      where: {
        id: creditAccountId,
      },
    });

    if (!creditAccount) {
      throw new NotFoundException('Credit account tidak ditemukan');
    }

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
