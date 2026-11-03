export interface LlmModelInput {
  id: string;
  displayName?: string | null;
  params?: Record<string, unknown> | null;
}

export interface LlmProviderInput {
  name: string;
  protocol: string;
  baseUrl: string;
  apiKey?: string | null; // omitted = unchanged on update
  customHeaders?: Record<string, string> | null;
  timeoutMs?: number;
  enabled?: boolean;
  models: LlmModelInput[];
  defaultModelId?: string | null;
}

export interface LlmProviderView {
  id: number;
  name: string;
  protocol: string;
  baseUrl: string;
  hasApiKey: boolean;
  customHeaders: Record<string, string> | null;
  timeoutMs: number;
  enabled: boolean;
  isActive: boolean;
  models: Array<{
    id: string;
    displayName: string | null;
    params: Record<string, unknown> | null;
    isDefault: boolean;
  }>;
  lastTestStatus: string | null;
  lastTestAt: Date | null;
  lastTestMessage: string | null;
}
