import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { getLlmConfig } from '../../../ai/llm.config';
import { isLlmProtocol, LlmProtocol } from '../../domain/llm-protocol';
import { LlmExecutionContext } from '../../domain/llm-provider';
import { LlmClient } from '../ports';
import { LlmProviderRepository } from '../ports';
import { LLM_ALLOW_INSECURE, LLM_CLIENTS } from '../tokens';

export interface ResolvedLlm {
  client: LlmClient;
  context: LlmExecutionContext;
  modelId: string;
  params: Record<string, unknown> | null;
  source: 'database' | 'environment';
  providerName: string | null;
}

/**
 * Decides which LLM a feature call uses.
 *
 * When an active provider exists it is authoritative: a broken one fails loudly
 * rather than silently falling back to environment configuration, which would
 * send traffic somewhere the operator did not choose.
 */
@Injectable()
export class ResolveActiveLlmUseCase {
  constructor(
    private readonly repository: LlmProviderRepository,
    @Inject(LLM_CLIENTS) private readonly clients: Record<LlmProtocol, LlmClient>,
    @Inject(LLM_ALLOW_INSECURE) private readonly allowInsecure: boolean,
  ) {}

  async execute(): Promise<ResolvedLlm> {
    const provider = await this.repository.findActive();

    if (!provider) {
      return this.fromEnvironment();
    }

    if (!provider.enabled) {
      throw new BadRequestException(
        `Provider aktif "${provider.name}" dalam keadaan disabled. Aktifkan atau pilih provider lain.`,
      );
    }

    if (!isLlmProtocol(provider.protocol)) {
      throw new BadRequestException(
        `Provider "${provider.name}" memakai protocol tidak dikenal: ${provider.protocol}.`,
      );
    }

    if (provider.apiKeyError) {
      throw new BadRequestException(
        `Provider "${provider.name}": ${provider.apiKeyError}`,
      );
    }

    const model = provider.models.find((m) => m.isDefault) ?? provider.models[0];

    if (!model) {
      throw new BadRequestException(
        `Provider "${provider.name}" tidak memiliki model yang dikonfigurasi.`,
      );
    }

    return {
      client: this.clients[provider.protocol],
      context: {
        protocol: provider.protocol,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        headers: provider.customHeaders ?? {},
        timeoutMs: provider.timeoutMs,
        allowInsecure: this.allowInsecure,
      },
      modelId: model.id,
      params: model.params ?? null,
      source: 'database',
      providerName: provider.name,
    };
  }

  private fromEnvironment(): ResolvedLlm {
    const config = getLlmConfig();

    const protocol: LlmProtocol =
      config.provider === 'gemini' ? 'gemini' : 'openai';

    return {
      client: this.clients[protocol],
      context: {
        protocol,
        baseUrl: config.baseURL,
        apiKey: config.apiKey || null,
        headers: {},
        timeoutMs: 60000,
        allowInsecure: this.allowInsecure,
      },
      modelId: config.model,
      params: null,
      source: 'environment',
      providerName: null,
    };
  }
}
