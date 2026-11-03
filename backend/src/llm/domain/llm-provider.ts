import { LlmProtocol } from './llm-protocol';

export interface LlmModelConfig {
  id: string;
  displayName?: string | null;
  params?: Record<string, unknown> | null;
  isDefault?: boolean;
}

export interface LlmProviderConfig {
  id: number;
  name: string;
  protocol: LlmProtocol;
  baseUrl: string;
  apiKey: string | null;
  /** Set when a stored key exists but cannot be decrypted: a loud config error. */
  apiKeyError: string | null;
  customHeaders: Record<string, string> | null;
  timeoutMs: number;
  enabled: boolean;
  isActive: boolean;
  models: LlmModelConfig[];
  lastTestStatus: string | null;
  lastTestAt: Date | null;
  lastTestMessage: string | null;
}
export interface LlmRequest {
  prompt?: string;
  image?: { buffer: Buffer; mimeType: string };
  json?: boolean;
  /** Optional JSON schema for protocols that support structured output. */
  schema?: unknown;
  model: { id: string; params?: Record<string, unknown> | null };
}

export interface LlmResponse {
  text: string;
}

export interface LlmExecutionContext {
  protocol: LlmProtocol;
  baseUrl: string;
  apiKey: string | null;
  headers: Record<string, string>;
  timeoutMs: number;
  allowInsecure: boolean;
}
