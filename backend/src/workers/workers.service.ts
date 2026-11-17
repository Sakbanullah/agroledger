import { Injectable, NotFoundException } from '@nestjs/common';

import { PeopleService } from '../people/people.service';
import { PERSON_TYPE_WORKER } from '../people/person-type.constants';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly people: PeopleService,
  ) {}

  async findAll() {
    return this.prisma.person.findMany({
      where: {
        type: PERSON_TYPE_WORKER,
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
        type: PERSON_TYPE_WORKER,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker tidak ditemukan');
    }

    return worker;
  }

  /** Delegates so worker names obey the same Person uniqueness rule. */
  async create(name: string, phone?: string) {
    return this.people.create({
      name,
      phone,
      type: PERSON_TYPE_WORKER,
    });
  }

  async update(id: number, name: string, phone?: string) {
    await this.findOne(id);

    return this.people.update(id, {
      name,
      phone,
      type: PERSON_TYPE_WORKER,
    });
  }

  /** Same guard as /people/:id, restricted to workers. */
  async remove(id: number) {
    await this.findOne(id);
    return this.people.remove(id);
  }
}
