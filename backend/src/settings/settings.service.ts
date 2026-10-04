import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultCommission(): Promise<number> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'defaultSawitRelativeCommission' },
    });
    if (!setting) return 200;
    const num = Number(setting.value);
    return isNaN(num) ? 200 : num;
  }

  async setDefaultCommission(value: number) {
    return this.prisma.setting.upsert({
      where: { key: 'defaultSawitRelativeCommission' },
      update: { value: value.toString() },
      create: {
        key: 'defaultSawitRelativeCommission',
        value: value.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
