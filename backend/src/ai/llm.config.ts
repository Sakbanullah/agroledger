import { BadRequestException } from '@nestjs/common';

export type LlmProvider = 'openai' | 'gemini';

export interface LlmConfig {
  provider: LlmProvider;
  baseURL: string;
  apiKey: string;
  model: string;
}

const ENV_KEYS: Record<LlmProvider, string[]> = {
  openai: ['LLM_API_KEY', 'OPENAI_API_KEY'],
  gemini: ['LLM_API_KEY', 'GEMINI_API_KEY'],
};

// ponytail: env-only, no DB/UI. Move to SettingsService when a settings UI exists.
export function getLlmConfig(override?: Partial<LlmConfig>): LlmConfig {
  const provider =
    override?.provider ??
    ((process.env.LLM_PROVIDER || 'openai').toLowerCase() as LlmProvider);

  if (provider !== 'openai' && provider !== 'gemini') {
    throw new BadRequestException(
      `LLM_PROVIDER tidak dikenal: ${provider}. Gunakan "openai" atau "gemini".`,
    );
  }

  const apiKey =
    override?.apiKey ||
    ENV_KEYS[provider]
      .map((key) => process.env[key])
      .find((value) => !!value) ||
    '';

  if (!apiKey) {
    throw new BadRequestException(
      `API key LLM belum dikonfigurasi untuk provider "${provider}"`,
    );
  }

  return {
    provider,
    apiKey,
    baseURL:
      override?.baseURL ||
      process.env.LLM_BASE_URL ||
      'https://api.openai.com/v1',
    model:
      override?.model ||
      process.env.LLM_MODEL ||
      (provider === 'gemini' ? 'gemini-3.6-flash' : 'gpt-5.5'),
  };
}
