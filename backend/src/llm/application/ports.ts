import {
  LlmExecutionContext,
  LlmProviderConfig,
  LlmRequest,
  LlmResponse,
} from '../domain/llm-provider';
import { LlmProtocol } from '../domain/llm-protocol';

export interface LlmHttpRequest {
  url: string;
  method: 'POST' | 'GET';
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  allowInsecure: boolean;
}

export interface LlmHttpResponse {
  status: number;
  text: string;
}

/** Abstract class so it works as a NestJS injection token. */
export abstract class GuardedTransport {
  abstract send(request: LlmHttpRequest): Promise<LlmHttpResponse>;
}

export interface LlmClient {
  generate(
    context: LlmExecutionContext,
    request: LlmRequest,
  ): Promise<LlmResponse>;
}

export interface ProviderTestResult {
  ok: boolean;
  modelId: string | null;
  message: string;
}

/** Protocol -> client. Exhaustive by construction. */
export type LlmAdapterRegistry = Record<LlmProtocol, LlmClient>;

export interface PersistedProviderInput {
  name: string;
  protocol: string;
  baseUrl: string;
  /** Already encrypted. `undefined` on update means "keep what is stored". */
  apiKeyEnc?: string | null;
  customHeaders: Record<string, string> | null;
  timeoutMs: number;
  enabled: boolean;
  models: Array<{
    id: string;
    displayName: string | null;
    params: Record<string, unknown> | null;
  }>;
  defaultModelId: string | null;
}

/**
 * Abstract classes rather than interfaces: NestJS needs a runtime value to use
 * as an injection token, and these keep the port owned by the inner layer.
 */
export abstract class SecretCipher {
  /** False when no master key is configured; callers must then refuse to store keys. */
  abstract readonly available: boolean;
  abstract encrypt(plaintext: string): string;
  abstract decrypt(payload: string): string;
}

export abstract class LlmProviderRepository {
  abstract findAll(): Promise<LlmProviderConfig[]>;
  abstract findById(id: number): Promise<LlmProviderConfig | null>;
  abstract findActive(): Promise<LlmProviderConfig | null>;
  abstract create(data: PersistedProviderInput): Promise<LlmProviderConfig>;
  abstract update(
    id: number,
    data: PersistedProviderInput,
  ): Promise<LlmProviderConfig>;
  abstract delete(id: number): Promise<void>;
  abstract setActive(id: number, defaultModelId: string): Promise<void>;
  abstract clearActive(): Promise<void>;
  abstract recordTestResult(
    id: number,
    result: { status: string; message: string | null },
  ): Promise<void>;
}
