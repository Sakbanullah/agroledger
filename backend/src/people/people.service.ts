import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { PersonName, PERSON_NAME_COLLATION } from './person-name.rules';
import {
  PERSON_TYPE_RELATIVE_OWNER,
  PERSON_TYPE_WORKER,
} from './person-type.constants';

export { PERSON_TYPE_RELATIVE_OWNER, PERSON_TYPE_WORKER };

export const PERSON_DUPLICATE_MESSAGE =
  'Nama person sudah terdaftar. Gunakan nama lain.';

const PERSON_TYPE_LABELS: Record<string, string> = {
  [PERSON_TYPE_WORKER]: 'Worker',
  [PERSON_TYPE_RELATIVE_OWNER]: 'Pemilik Saudara',
};

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
    const name = this.parseName(createPersonDto.name);
    const type = this.parseType(createPersonDto.type);

    await this.assertNameAvailable(name);

    try {
      return await this.prisma.person.create({
        data: {
          ...createPersonDto,
          name: name.value,
          type,
        },
      });
    } catch (error) {
      throw this.asDuplicateError(createPersonDto.name, error);
    }
  }

  async update(id: number, updatePersonDto: UpdatePersonDto) {
    const name =
      updatePersonDto.name === undefined
        ? undefined
        : this.parseName(updatePersonDto.name);
    const type =
      updatePersonDto.type === undefined
        ? undefined
        : this.parseType(updatePersonDto.type);

    if (name) {
      await this.assertNameAvailable(name, id);
    }

    try {
      return await this.prisma.person.update({
        where: {
          id,
        },
        data: {
          ...updatePersonDto,
          ...(name && { name: name.value }),
          ...(type && { type }),
        },
      });
    } catch (error) {
      throw this.asDuplicateError(updatePersonDto.name, error);
    }
  }

  async remove(id: number) {
    const person = await this.prisma.person.findUnique({
      where: { id },
      include: {
        farmOwners: true,
        rubberWorkers: true,
        settlements: true,
        ownerSettlements: true,
        creditAccount: {
          include: { transactions: true },
        },
      },
    });

    if (!person) {
      return null;
    }

    const blockers: string[] = [];

    if (person.farmOwners.length > 0) blockers.push('kebun');
    if (person.rubberWorkers.length > 0) blockers.push('penjualan karet');
    if (person.settlements.length > 0) blockers.push('settlement worker');
    if (person.ownerSettlements.length > 0) blockers.push('settlement pemilik');
    if (person.creditAccount) {
      blockers.push(
        person.creditAccount.transactions.length > 0
          ? 'transaksi kasbon'
          : 'akun kasbon (hapus lewat menu Kasbon)',
      );
    }

    if (blockers.length > 0) {
      throw new ConflictException(
        `Person tidak dapat dihapus karena masih memiliki data terkait: ${blockers.join(', ')}`,
      );
    }

    return this.prisma.person.delete({
      where: { id },
    });
  }

  private parseName(raw: string): PersonName {
    try {
      return PersonName.create(raw);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  private parseType(raw?: string | null): string | null {
    const type = raw?.trim().toUpperCase();
    if (!type) return null;

    if (!PERSON_TYPE_LABELS[type]) {
      throw new BadRequestException(
        `Tipe person tidak valid. Gunakan: ${Object.entries(PERSON_TYPE_LABELS)
          .map(([value, label]) => `${value} (${label})`)
          .join(' atau ')}`,
      );
    }

    return type;
  }

  /**
   * Same rule the duplicate index enforces: names equal under CMS (case
   * insensitive, trailing spaces ignored). Explicit trim keeps it independent
   * of whether the active collation is NO PAD.
   */
  private async assertNameAvailable(name: PersonName, excludeId?: number) {
    const duplicates = await this.prisma.$queryRawUnsafe<Array<{ id: number }>>(
      `SELECT id FROM Person
       WHERE (LOWER(TRIM(name)) COLLATE ${PERSON_NAME_COLLATION}) =
             (LOWER(TRIM(?) COLLATE ${PERSON_NAME_COLLATION}))
       ${excludeId === undefined ? '' : 'AND id <> ?'}
       LIMIT 1`,
      name.value,
      ...(excludeId === undefined ? [] : [excludeId]),
    );

    if (duplicates.length > 0) {
      throw new ConflictException(PERSON_DUPLICATE_MESSAGE);
    }
  }

  /**
   * Race-condition backstop: the unique index rejects the other request.
   * A P2002 is only translated when a name was submitted and Person has no
   * other unique constraint, so an unexpected constraint still surfaces raw.
   */
  private asDuplicateError(submittedName: unknown, error: unknown): unknown {
    const code = (error as { code?: string }).code;

    if (code === 'P2002' && typeof submittedName === 'string') {
      return new ConflictException(PERSON_DUPLICATE_MESSAGE);
    }

    return error;
  }
}
