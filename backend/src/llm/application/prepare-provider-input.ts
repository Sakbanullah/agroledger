import { BadRequestException } from '@nestjs/common';
import {
  allowInsecureFromEnv,
  validateBaseUrlSyntax,
} from '../domain/base-url.rules';
import { isLlmProtocol } from '../domain/llm-protocol';
import { LlmProviderInput } from './models';

/** Validates everything an operator can get wrong, before anything is persisted. */
export function validateProviderInput(input: LlmProviderInput): void {
  if (!input.name?.trim()) {
    throw new BadRequestException('Nama provider wajib diisi');
  }

  if (!isLlmProtocol(input.protocol)) {
    throw new BadRequestException(
      `Protocol tidak dikenal: ${input.protocol}. Gunakan "openai" atau "gemini".`,
    );
  }

  const baseUrlError = validateBaseUrlSyntax(input.baseUrl ?? '', {
    allowInsecure: allowInsecureFromEnv(process.env.LLM_ALLOW_INSECURE_URLS),
  });

  if (baseUrlError) {
    throw new BadRequestException(baseUrlError);
  }

  if (!Array.isArray(input.models) || input.models.length === 0) {
    throw new BadRequestException('Provider harus memiliki minimal satu model');
  }

  const ids = input.models.map((model) => model.id?.trim());

  if (ids.some((id) => !id)) {
    throw new BadRequestException('Model ID wajib diisi');
  }

  if (new Set(ids).size !== ids.length) {
    throw new BadRequestException('Model ID tidak boleh duplikat');
  }

  if (input.defaultModelId && !ids.includes(input.defaultModelId)) {
    throw new BadRequestException(
      'Model default harus termasuk dalam daftar model provider',
    );
  }

  if (input.timeoutMs !== undefined && input.timeoutMs <= 0) {
    throw new BadRequestException('Timeout harus lebih besar dari 0');
  }
}
