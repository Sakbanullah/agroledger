import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';

@Injectable()
export class FarmsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.farm.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        owners: {
          include: {
            person: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.farm.findUnique({
      where: {
        id,
      },
      include: {
        owners: {
          include: {
            person: true,
          },
        },
        harvests: true,
        sales: true,
      },
    });
  }

  async create(createFarmDto: CreateFarmDto) {
    return this.prisma.farm.create({
      data: createFarmDto,
    });
  }

  async update(id: number, updateFarmDto: UpdateFarmDto) {
    return this.prisma.farm.update({
      where: {
        id,
      },
      data: updateFarmDto,
    });
  }
  async remove(id: number) {
    const farm = await this.prisma.farm.findUnique({
      where: { id },
      include: {
        harvests: true,
        sales: true,
      },
    });

    if (!farm) {
      return null;
    }

    const hasRelatedData = farm.harvests.length > 0 || farm.sales.length > 0;

    if (hasRelatedData) {
      throw new ConflictException(
        'Farm tidak dapat dihapus karena masih memiliki data harvest atau sale',
      );
    }

    return this.prisma.farm.delete({
      where: { id },
    });
  }
}
