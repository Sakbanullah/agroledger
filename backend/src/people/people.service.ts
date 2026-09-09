import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.person.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.person.findUnique({
      where: {
        id,
      },
    });
  }

  async create(createPersonDto: CreatePersonDto) {
    return this.prisma.person.create({
      data: createPersonDto,
    });
  }

  async update(id: number, updatePersonDto: UpdatePersonDto) {
  return this.prisma.person.update({
    where: {
      id,
    },
    data: updatePersonDto,
  });
}

  async remove(id: number) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: {
        farmOwners: true,
        rubberWorkers: true,
        settlements: true,
        creditAccount: true,
      },
    });

    if (!person) {
      return null;
    }

    const hasRelatedData =
      person.farmOwners.length > 0 ||
      person.rubberWorkers.length > 0 ||
      person.settlements.length > 0 ||
      person.creditAccount !== null;

    if (hasRelatedData) {
      throw new ConflictException(
        'Person tidak dapat dihapus karena masih memiliki data terkait',
      );
    }

    return this.prisma.person.delete({
      where: { id },
    });
  }
}