import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LlmProviderRepository } from '../ports';

@Injectable()
export class ActivateProviderUseCase {
  constructor(private readonly repository: LlmProviderRepository) {}

  async execute(id: number, modelId?: string | null) {
    const provider = await this.repository.findById(id);

    if (!provider) {
      throw new NotFoundException('Provider tidak ditemukan');
    }

    if (!provider.enabled) {
      throw new BadRequestException(
        'Provider harus di-enable sebelum bisa dijadikan default',
      );
    }

    const target = modelId ?? provider.models.find((m) => m.isDefault)?.id
      ?? provider.models[0]?.id;

    if (!target || !provider.models.some((m) => m.id === target)) {
      throw new BadRequestException(
        'Model default harus termasuk dalam daftar model provider',
      );
    }

    await this.repository.setActive(id, target);

    return { id, isActive: true, defaultModelId: target };
  }
}
