import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LlmProviderRepository } from '../ports';

@Injectable()
export class DeleteProviderUseCase {
  constructor(private readonly repository: LlmProviderRepository) {}

  async execute(id: number, replacementProviderId?: number | null) {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundException('Provider tidak ditemukan');
    }

    if (existing.isActive) {
      if (replacementProviderId) {
        const replacement = await this.repository.findById(replacementProviderId);
        if (!replacement || !replacement.enabled) {
          throw new BadRequestException(
            'Provider pengganti harus ada dan dalam keadaan aktif/ter-enable',
          );
        }
        const modelId = replacement.models[0]?.id;
        if (!modelId) {
          throw new BadRequestException(
            'Provider pengganti tidak memiliki model',
          );
        }
        await this.repository.setActive(replacementProviderId, modelId);
      } else {
        // No replacement named: clear active rather than leaving it dangling.
        await this.repository.clearActive();
      }
    }

    await this.repository.delete(id);

    return { deleted: true };
  }
}
