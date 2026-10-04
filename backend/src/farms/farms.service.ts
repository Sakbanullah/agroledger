import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    const ownershipType = createFarmDto.ownershipType ?? 'OWN';

    // Business rules
    // OWN      → ownerId optional (ignored if provided).
    // RELATIVE → ownerId required; must reference a valid Person.
    if (ownershipType === 'RELATIVE') {
      if (!createFarmDto.ownerId) {
        throw new BadRequestException('ownerId wajib diisi untuk ladang RELATIVE');
      }

      const person = await this.prisma.person.findUnique({
        where: { id: createFarmDto.ownerId },
      });

      if (!person) {
        throw new NotFoundException(`Person ${createFarmDto.ownerId} tidak ditemukan`);
      }
    }

    // Create farm + FarmOwner atomically when needed.
    // No owner settlement or MoneyTransaction is created here.
    return this.prisma.$transaction(async (tx) => {
      const farm = await tx.farm.create({
        data: {
          name: createFarmDto.name,
          ...(createFarmDto.location !== undefined && {
            location: createFarmDto.location,
          }),
          ownershipType,
        },
      });

      if (ownershipType === 'RELATIVE' && createFarmDto.ownerId) {
        await tx.farmOwner.create({
          data: {
            farmId: farm.id,
            personId: createFarmDto.ownerId,
          },
        });
      }

      // Return with owners relation (same shape as findOne/findAll).
      return tx.farm.findUnique({
        where: { id: farm.id },
        include: {
          owners: {
            include: {
              person: true,
            },
          },
        },
      });
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
