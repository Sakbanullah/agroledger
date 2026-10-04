import {
  Controller,
  Get,
  Patch,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    const defaultCommission = await this.settingsService.getDefaultCommission();
    return { defaultSawitRelativeCommission: defaultCommission };
  }

  @Patch('defaultSawitRelativeCommission')
  async updateDefaultCommission(@Body() body: { value?: unknown }) {
    const val = body?.value;
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
      throw new BadRequestException(
        'value harus berupa angka lebih besar atau sama dengan 0',
      );
    }
    await this.settingsService.setDefaultCommission(val);
    return { defaultSawitRelativeCommission: val };
  }
}
