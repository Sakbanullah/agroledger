import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.person.findMany({
      where: {
        type: 'WORKER',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const worker = await this.prisma.person.findFirst({
      where: {
        id,
        type: 'WORKER',
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker tidak ditemukan');
    }

    return worker;
  }

  async create(name: string, phone?: string) {
    const existingWorker = await this.prisma.person.findFirst({
      where: {
        type: 'WORKER',
        name: {
          equals: name,
        },
      },
    });

    if (existingWorker) {
      throw new BadRequestException(
        'Worker dengan nama tersebut sudah ada',
      );
    }

    return this.prisma.person.create({
      data: {
        name,
        phone,
        type: 'WORKER',
      },
    });
  }

  async update(id: number, name: string, phone?: string) {
    const worker = await this.findOne(id);

    const existingWorker = await this.prisma.person.findFirst({
      where: {
        type: 'WORKER',
        name: {
          equals: name,
        },
        NOT: {
          id: worker.id,
        },
      },
    });

    if (existingWorker) {
      throw new BadRequestException(
        'Worker dengan nama tersebut sudah ada',
      );
    }

    return this.prisma.person.update({
      where: {
        id,
      },
      data: {
        name,
        phone,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const rubberSaleWorker = await this.prisma.rubberSaleWorker.findFirst({
      where: {
        workerId: id,
      },
    });

    if (rubberSaleWorker) {
      throw new BadRequestException(
        'Worker tidak dapat dihapus karena sudah memiliki riwayat penjualan karet',
      );
    }

    const creditAccount = await this.prisma.creditAccount.findUnique({
      where: {
        personId: id,
      },
    });

    if (creditAccount) {
      throw new BadRequestException(
        'Worker tidak dapat dihapus karena sudah memiliki akun kasbon',
      );
    }

    return this.prisma.person.delete({
      where: {
        id,
      },
    });
  }
}