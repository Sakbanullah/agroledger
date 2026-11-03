import { Injectable } from '@nestjs/common';
import { LlmExecutionContext } from '../../domain/llm-provider';
import { LlmClient, ProviderTestResult } from '../ports';

const TEST_PROMPT = 'Reply with exactly: AgroLedger AI connected';

@Injectable()
export class TestProviderUseCase {
  async execute(
    context: LlmExecutionContext,
    client: LlmClient,
    modelIds: string[],
  ): Promise<ProviderTestResult[]> {
    const results: ProviderTestResult[] = [];

    for (const modelId of modelIds) {
      try {
        await client.generate(context, {
          prompt: TEST_PROMPT,
          model: { id: modelId },
        });

        results.push({
          ok: true,
          modelId,
          message: 'Terhubung',
        });
      } catch (error) {
        results.push({
          ok: false,
          modelId,
          message: describeFailure(error, context.apiKey),
        });
      }
    }

    return results;
  }
}

/** Turns a transport/SDK failure into something an operator can act on. */
function describeFailure(error: unknown, apiKey: string | null): string {
  const status =
    typeof error === 'object' && error !== null && 'httpStatus' in error
      ? Number((error as { httpStatus?: unknown }).httpStatus)
      : undefined;

  if (status === 401 || status === 403) {
    return apiKey
      ? `API key ditolak oleh endpoint (HTTP ${status})`
      : `Endpoint meminta autentikasi tetapi provider ini tidak memiliki API key (HTTP ${status})`;
  }

  if (status === 404) {
    return 'Endpoint atau model tidak ditemukan (HTTP 404). Periksa Base URL dan Model ID.';
  }

  if (status) {
    return `Endpoint menolak request (HTTP ${status})`;
  }

  const message = error instanceof Error ? error.message : String(error);

  return redact(message, apiKey).slice(0, 300);
}

/** Last line of defence: a key must never reach a log line or a response body. */
export function redact(text: string, apiKey: string | null): string {
  let output = text;

  if (apiKey) {
    output = output.split(apiKey).join('***');
  }

  return output
    .replace(/(authorization\s*[:=]\s*)(\S+)/gi, '$1***')
    .replace(/(x-api-key\s*[:=]\s*)(\S+)/gi, '$1***')
    .replace(/(api[_-]?key["'\s:=]+)([A-Za-z0-9_\-.]{8,})/gi, '$1***')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '***');
}
