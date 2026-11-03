import { BadRequestException, Injectable } from '@nestjs/common';
import { LlmExecutionContext, LlmRequest, LlmResponse } from '../../domain/llm-provider';
import { GuardedTransport, LlmClient } from '../../application/ports';
import { redact } from '../../application/use-cases/test-provider.use-case';

/**
 * One adapter covers every OpenAI-compatible endpoint: OpenAI, 9Router,
 * OpenRouter, DeepSeek, Qwen, self-hosted gateways. Everything that differs
 * between them — URL, headers, model, params — arrives as configuration.
 */
@Injectable()
export class OpenAiCompatibleAdapter implements LlmClient {
  constructor(private readonly transport: GuardedTransport) {}

  async generate(
    context: LlmExecutionContext,
    request: LlmRequest,
  ): Promise<LlmResponse> {
    const content: Array<Record<string, unknown>> = [];

    if (request.prompt) {
      content.push({ type: 'text', text: request.prompt });
    }

    if (request.image) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${request.image.mimeType};base64,${request.image.buffer.toString('base64')}`,
        },
      });
    }

    const params = (request.model.params ?? {}) as Record<string, unknown>;
    const { temperature, max_tokens, top_p, ...rest } = params;

    const payload: Record<string, unknown> = {
      model: request.model.id,
      messages: [{ role: 'user', content }],
      ...rest,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(max_tokens !== undefined ? { max_tokens } : {}),
      ...(top_p !== undefined ? { top_p } : {}),
      // ponytail: many gateways ignore this; the prompt asks for JSON too.
      ...(request.json ? { response_format: { type: 'json_object' } } : {}),
    };

    const response = await this.transport.send({
      url: joinUrl(context.baseUrl, 'chat/completions'),
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(context.apiKey
          ? { authorization: `Bearer ${context.apiKey}` }
          : {}),
        ...context.headers,
      },
      body: JSON.stringify(payload),
      timeoutMs: context.timeoutMs,
      allowInsecure: context.allowInsecure,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new LlmHttpError(response.status, response.text, context.apiKey);
    }

    const parsed = safeJson(response.text) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return { text: parsed?.choices?.[0]?.message?.content ?? '' };
  }
}

export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Carries the upstream HTTP status so use cases can tell auth/404/5xx apart. */
export class LlmHttpError extends BadRequestException {
  readonly httpStatus: number;

  constructor(status: number, body: string, apiKey: string | null) {
    super(redact(body || `HTTP ${status}`, apiKey).slice(0, 300));
    this.httpStatus = status;
  }
}
