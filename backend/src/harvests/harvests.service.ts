import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';

@Injectable()
export class HarvestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.harvest.findMany({
      orderBy: {
        harvestDate: 'desc',
      },
      include: {
        farm: true,
        commodity: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.harvest.findUnique({
      where: {
        id,
      },
      include: {
        farm: true,
        commodity: true,
      },
    });
  }
  async create(createHarvestDto: CreateHarvestDto) {
    return this.prisma.harvest.create({
      data: {
        farmId: createHarvestDto.farmId,
        commodityId: createHarvestDto.commodityId,
        harvestDate: new Date(createHarvestDto.harvestDate),
        weightKg: createHarvestDto.weightKg,
      },
      include: {
        farm: true,
        commodity: true,
      },
    });
  }
  async update(id: number, updateHarvestDto: UpdateHarvestDto) {
    return this.prisma.harvest.update({
      where: {
        id,
      },
      data: {
        ...(updateHarvestDto.farmId !== undefined && {
          farmId: updateHarvestDto.farmId,
        }),
        ...(updateHarvestDto.commodityId !== undefined && {
          commodityId: updateHarvestDto.commodityId,
        }),
        ...(updateHarvestDto.harvestDate !== undefined && {
          harvestDate: new Date(updateHarvestDto.harvestDate),
        }),
        ...(updateHarvestDto.weightKg !== undefined && {
          weightKg: updateHarvestDto.weightKg,
        }),
      },
      include: {
        farm: true,
        commodity: true,
      },
    });
  }
  async remove(id: number) {
    const harvest = await this.prisma.harvest.findUnique({
      where: { id },
    });

    if (!harvest) {
      return null;
    }

    return this.prisma.harvest.delete({
      where: { id },
    });
  }
}
