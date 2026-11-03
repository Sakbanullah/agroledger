import { BadRequestException, Injectable } from '@nestjs/common';
import { LlmProviderConfig } from '../../domain/llm-provider';
import { LlmProviderInput } from '../models';
import { validateProviderInput } from '../prepare-provider-input';
import { SecretCipher } from '../ports';
import { LlmProviderRepository } from '../ports';

@Injectable()
export class CreateProviderUseCase {
  constructor(
    private readonly repository: LlmProviderRepository,
    private readonly cipher: SecretCipher,
  ) {}

  async execute(input: LlmProviderInput): Promise<LlmProviderConfig> {
    validateProviderInput(input);

    const hasKey = typeof input.apiKey === 'string' && input.apiKey.length > 0;

    return this.repository.create({
      name: input.name.trim(),
      protocol: input.protocol,
      baseUrl: input.baseUrl.trim(),
      apiKeyEnc: hasKey ? this.cipher.encrypt(input.apiKey as string) : null,
      customHeaders: normalizeHeaders(input.customHeaders),
      timeoutMs: input.timeoutMs ?? 60000,
      enabled: input.enabled ?? true,
      models: input.models.map((model) => ({
        id: model.id.trim(),
        displayName: model.displayName ?? null,
        params: model.params ?? null,
      })),
      defaultModelId: input.defaultModelId ?? input.models[0]?.id.trim() ?? null,
    });
  }
}

export function normalizeHeaders(
  headers: Record<string, string> | null | undefined,
): Record<string, string> | null {
  if (!headers) return null;

  const entries = Object.entries(headers).filter(
    ([key, value]) => key.trim() && typeof value === 'string',
  );

  if (entries.length === 0) return null;

  for (const [key] of entries) {
    if (/[^\w-]/.test(key.trim())) {
      throw new BadRequestException(`Nama header tidak valid: ${key}`);
    }
  }

  return Object.fromEntries(entries.map(([key, value]) => [key.trim(), value]));
}
