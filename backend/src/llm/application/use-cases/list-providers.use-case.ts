import { Injectable } from '@nestjs/common';
import { LlmProviderView } from '../models';
import { LlmProviderRepository } from '../ports';

@Injectable()
export class ListProvidersUseCase {
  constructor(private readonly repository: LlmProviderRepository) {}

  async execute(): Promise<LlmProviderView[]> {
    const providers = await this.repository.findAll();

    return providers.map((provider) => toView(provider));
  }
}

export function toView(provider: {
  id: number;
  name: string;
  protocol: string;
  baseUrl: string;
  apiKey: string | null;
  customHeaders: Record<string, string> | null;
  timeoutMs: number;
  enabled: boolean;
  isActive: boolean;
  models: Array<{
    id: string;
    displayName?: string | null;
    params?: Record<string, unknown> | null;
    isDefault?: boolean;
  }>;
  lastTestStatus: string | null;
  lastTestAt: Date | null;
  lastTestMessage: string | null;
}): LlmProviderView {
  return {
    id: provider.id,
    name: provider.name,
    protocol: provider.protocol,
    baseUrl: provider.baseUrl,
    // Key material never reaches a view model: only its presence.
    hasApiKey: !!provider.apiKey,
    customHeaders: provider.customHeaders,
    timeoutMs: provider.timeoutMs,
    enabled: provider.enabled,
    isActive: provider.isActive,
    models: provider.models.map((model) => ({
      id: model.id,
      displayName: model.displayName ?? null,
      params: model.params ?? null,
      isDefault: !!model.isDefault,
    })),
    lastTestStatus: provider.lastTestStatus,
    lastTestAt: provider.lastTestAt,
    lastTestMessage: provider.lastTestMessage,
  };
}
