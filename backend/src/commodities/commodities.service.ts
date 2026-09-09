import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommodityDto } from './dto/create-commodity.dto';
import { UpdateCommodityDto } from './dto/update-commodity.dto';

@Injectable()
export class CommoditiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.commodity.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.commodity.findUnique({
      where: {
        id,
      },
      include: {
        harvests: true,
        sales: true,
      },
    });
  }
  async create(createCommodityDto: CreateCommodityDto) {
    return this.prisma.commodity.create({
      data: {
        name: createCommodityDto.name,
        unit: createCommodityDto.unit ?? 'KG',
      },
    });
  }
  async update(id: number, updateCommodityDto: UpdateCommodityDto) {
    return this.prisma.commodity.update({
      where: {
        id,
      },
      data: updateCommodityDto,
    });
  }
  async remove(id: number) {
    const commodity = await this.prisma.commodity.findUnique({
      where: { id },
      include: {
        harvests: true,
        sales: true,
      },
    });

    if (!commodity) {
      return null;
    }

    const hasRelatedData =
      commodity.harvests.length > 0 || commodity.sales.length > 0;

    if (hasRelatedData) {
      throw new ConflictException(
        'Commodity tidak dapat dihapus karena masih memiliki data harvest atau sale',
      );
    }

    return this.prisma.commodity.delete({
      where: { id },
    });
  }
}
