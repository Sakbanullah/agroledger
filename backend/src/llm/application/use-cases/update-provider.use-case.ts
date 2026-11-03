import { Injectable, NotFoundException } from '@nestjs/common';
import { LlmProviderConfig } from '../../domain/llm-provider';
import { LlmProviderInput } from '../models';
import { validateProviderInput } from '../prepare-provider-input';
import { SecretCipher } from '../ports';
import { LlmProviderRepository } from '../ports';
import { normalizeHeaders } from './create-provider.use-case';

@Injectable()
export class UpdateProviderUseCase {
  constructor(
    private readonly repository: LlmProviderRepository,
    private readonly cipher: SecretCipher,
  ) {}

  async execute(
    id: number,
    input: LlmProviderInput,
  ): Promise<LlmProviderConfig> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      throw new NotFoundException('Provider tidak ditemukan');
    }

    validateProviderInput(input);

    // apiKey omitted (undefined) = keep the stored key.
    // apiKey === null/'' = clear it. apiKey === string = replace it.
    let apiKeyEnc: string | null | undefined;
    if (input.apiKey === undefined) {
      apiKeyEnc = undefined;
    } else if (input.apiKey === null || input.apiKey === '') {
      apiKeyEnc = null;
    } else {
      apiKeyEnc = this.cipher.encrypt(input.apiKey);
    }

    return this.repository.update(id, {
      name: input.name.trim(),
      protocol: input.protocol,
      baseUrl: input.baseUrl.trim(),
      apiKeyEnc,
      customHeaders: normalizeHeaders(input.customHeaders),
      timeoutMs: input.timeoutMs ?? existing.timeoutMs,
      enabled: input.enabled ?? existing.enabled,
      models: input.models.map((model) => ({
        id: model.id.trim(),
        displayName: model.displayName ?? null,
        params: model.params ?? null,
      })),
      defaultModelId:
        input.defaultModelId ??
        input.models[0]?.id.trim() ??
        existing.models[0]?.id ??
        null,
    });
  }
}
