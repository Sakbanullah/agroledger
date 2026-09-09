import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateRubberWorkerDto } from './dto/create-rubber-worker.dto';
import { UpdateRubberWorkerDto } from './dto/update-rubber-worker.dto';
import { CreateWorkerCandidateDto } from './dto/create-worker-candidate.dto';

@Injectable()
export class RubberWorkersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.rubberSaleWorker.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        worker: true,
        sale: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.rubberSaleWorker.findUnique({
      where: {
        id,
      },
      include: {
        worker: true,
        sale: true,
      },
    });
  }

  async match(name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Nama worker wajib diisi');
    }

    const searchName = this.normalizeName(name);

    const workers = await this.prisma.person.findMany({
      where: {
        type: 'WORKER',
      },
      orderBy: {
        name: 'asc',
      },
    });

    return workers.filter((worker) =>
      this.normalizeName(worker.name).includes(searchName),
    );
  }

  async fuzzyMatch(name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Nama worker wajib diisi');
    }

    const searchName = this.normalizeName(name);

    const workers = await this.prisma.person.findMany({
      where: {
        type: 'WORKER',
      },
      orderBy: {
        name: 'asc',
      },
    });

    const results = workers
      .map((worker) => {
        const workerName = this.normalizeName(worker.name);

        const score = this.calculateNameSimilarity(searchName, workerName);

        return {
          id: worker.id,
          name: worker.name,
          phone: worker.phone,
          type: worker.type,
          score: Number(score.toFixed(2)),
        };
      })
      .filter((worker) => worker.score >= 0.4)
      .sort((a, b) => b.score - a.score);

    return results;
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private calculateNameSimilarity(
    searchName: string,
    workerName: string,
  ): number {
    // 1. Exact match
    if (searchName === workerName) {
      return 1;
    }

    // 2. Full name contains search name
    if (workerName.includes(searchName)) {
      return 0.95;
    }

    // 3. Compare dengan setiap kata dalam nama worker
    const workerWords = workerName.split(' ');

    const wordScores = workerWords.map((word) =>
      this.calculateSimilarity(searchName, word),
    );

    const bestWordScore = Math.max(...wordScores);

    // 4. Compare dengan full name
    const fullNameScore = this.calculateSimilarity(searchName, workerName);

    // Ambil score terbaik
    return Math.max(bestWordScore, fullNameScore);
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) {
      return 1;
    }

    if (!a.length || !b.length) {
      return 0;
    }

    const matrix: number[][] = [];

    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    const distance = matrix[a.length][b.length];
    const maxLength = Math.max(a.length, b.length);

    return 1 - distance / maxLength;
  }

  async createFromCandidate(
    createWorkerCandidateDto: CreateWorkerCandidateDto,
  ) {
    const name = createWorkerCandidateDto.name.trim();

    const existingWorker = await this.prisma.person.findFirst({
      where: {
        type: 'WORKER',
        name: {
          equals: name,
        },
      },
    });

    if (existingWorker) {
      throw new BadRequestException('Worker dengan nama tersebut sudah ada');
    }

    return this.prisma.person.create({
      data: {
        name,
        type: 'WORKER',
      },
    });
  }
  async create(createRubberWorkerDto: CreateRubberWorkerDto) {
    const sale = await this.prisma.sale.findUnique({
      where: {
        id: createRubberWorkerDto.saleId,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale tidak ditemukan');
    }

    if (sale.status !== 'PENDING') {
      throw new BadRequestException(
        'Worker tidak dapat ditambahkan karena sale sudah selesai',
      );
    }

    const worker = await this.prisma.person.findUnique({
      where: {
        id: createRubberWorkerDto.workerId,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker tidak ditemukan');
    }

    if (worker.type !== 'WORKER') {
      throw new BadRequestException('Person yang dipilih bukan worker');
    }

    const existingWorker = await this.prisma.rubberSaleWorker.findUnique({
      where: {
        saleId_workerId: {
          saleId: createRubberWorkerDto.saleId,
          workerId: createRubberWorkerDto.workerId,
        },
      },
    });

    if (existingWorker) {
      throw new BadRequestException('Worker sudah terdaftar pada sale ini');
    }

    const existingWorkers = await this.prisma.rubberSaleWorker.findMany({
      where: {
        saleId: createRubberWorkerDto.saleId,
      },
    });

    const totalWorkerWeight = existingWorkers.reduce(
      (total, item) => total + Number(item.weightKg),
      0,
    );

    const newTotalWeight =
      totalWorkerWeight + Number(createRubberWorkerDto.weightKg);

    if (newTotalWeight > Number(sale.totalWeightKg)) {
      throw new BadRequestException(
        'Total berat worker melebihi total berat sale',
      );
    }

    return this.prisma.rubberSaleWorker.create({
      data: {
        saleId: createRubberWorkerDto.saleId,
        workerId: createRubberWorkerDto.workerId,
        pieces: createRubberWorkerDto.pieces,
        weightKg: createRubberWorkerDto.weightKg,
      },
      include: {
        worker: true,
        sale: true,
      },
    });
  }
  async update(id: number, updateRubberWorkerDto: UpdateRubberWorkerDto) {
    const rubberWorker = await this.prisma.rubberSaleWorker.findUnique({
      where: {
        id,
      },
      include: {
        sale: true,
      },
    });

    if (!rubberWorker) {
      throw new NotFoundException('Rubber worker tidak ditemukan');
    }

    if (rubberWorker.sale.status !== 'PENDING') {
      throw new BadRequestException(
        'Worker tidak dapat diubah karena sale sudah selesai',
      );
    }

    const confirmedSettlement = await this.prisma.settlement.findFirst({
      where: {
        saleId: rubberWorker.saleId,
        status: 'CONFIRMED',
      },
    });

    if (confirmedSettlement) {
      throw new BadRequestException(
        'Worker tidak dapat diubah karena sale sudah memiliki settlement yang dikonfirmasi',
      );
    }

    if (updateRubberWorkerDto.weightKg !== undefined) {
      const otherWorkers = await this.prisma.rubberSaleWorker.findMany({
        where: {
          saleId: rubberWorker.saleId,
          id: {
            not: id,
          },
        },
      });

      const otherWorkersWeight = otherWorkers.reduce(
        (total, item) => total + Number(item.weightKg),
        0,
      );

      const newTotalWeight =
        otherWorkersWeight + Number(updateRubberWorkerDto.weightKg);

      if (newTotalWeight > Number(rubberWorker.sale.totalWeightKg)) {
        throw new BadRequestException(
          'Total berat worker melebihi total berat sale',
        );
      }
    }

    return this.prisma.rubberSaleWorker.update({
      where: {
        id,
      },
      data: {
        ...(updateRubberWorkerDto.pieces !== undefined && {
          pieces: updateRubberWorkerDto.pieces,
        }),

        ...(updateRubberWorkerDto.weightKg !== undefined && {
          weightKg: updateRubberWorkerDto.weightKg,
        }),
      },
      include: {
        worker: true,
        sale: true,
      },
    });
  }

  async remove(id: number) {
    const rubberWorker = await this.prisma.rubberSaleWorker.findUnique({
      where: {
        id,
      },
    });

    if (!rubberWorker) {
      throw new NotFoundException('Rubber worker tidak ditemukan');
    }

    const sale = await this.prisma.sale.findUnique({
      where: {
        id: rubberWorker.saleId,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale tidak ditemukan');
    }

    if (sale.status !== 'PENDING') {
      throw new BadRequestException(
        'Worker tidak dapat dihapus karena sale sudah dikonfirmasi',
      );
    }

    const confirmedSettlement = await this.prisma.settlement.findFirst({
      where: {
        saleId: rubberWorker.saleId,
        status: 'CONFIRMED',
      },
    });

    if (confirmedSettlement) {
      throw new BadRequestException(
        'Worker tidak dapat dihapus karena sale sudah memiliki settlement yang dikonfirmasi',
      );
    }

    return this.prisma.rubberSaleWorker.delete({
      where: {
        id,
      },
    });
  }
}
