import { BadRequestException, Injectable } from '@nestjs/common';
import { LlmExecutionContext, LlmRequest, LlmResponse } from '../../domain/llm-provider';
import { GuardedTransport, LlmClient } from '../../application/ports';
import { ModelOption, parseModelList } from '../../domain/model-list';
import { readChatText } from '../../domain/chat-body';
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

    const text = readChatText(response.text);

    // 9Router answers 200 with an error frame in the body instead of a failing
    // status; an empty message would surface as a useless error.
    if (typeof text !== 'string' || text.trim() === '') {
      throw new BadRequestException(
        `Endpoint mengembalikan balasan kosong${describeUpstreamError(response.text, context.apiKey)}`,
      );
    }

    return { text };
  }

  async listModels(context: LlmExecutionContext): Promise<ModelOption[]> {
    const response = await this.transport.send({
      url: joinUrl(context.baseUrl, 'models'),
      method: 'GET',
      headers: {
        ...(context.apiKey
          ? { authorization: `Bearer ${context.apiKey}` }
          : {}),
        ...context.headers,
      },
      timeoutMs: context.timeoutMs,
      allowInsecure: context.allowInsecure,
    });

    if (response.status === 404) {
      throw new LlmDiscoveryUnsupportedError();
    }

    if (response.status < 200 || response.status >= 300) {
      throw new LlmHttpError(response.status, response.text, context.apiKey);
    }

    const parsed = parseModelList(safeJson(response.text));

    if (!parsed.ok) {
      throw new BadRequestException(
        'Provider membalas format yang tidak dikenali untuk /models. Periksa Base URL atau isi Model ID secara manual.',
      );
    }

    return parsed.models;
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

/** Pulls the first `{error:{message}}` out of a body that may be SSE-framed. */
function describeUpstreamError(body: string, apiKey: string | null): string {
  const line = body
    .split('\n')
    .map((part) => part.replace(/^data:\s*/, '').trim())
    .find((part) => part.startsWith('{'));

  const message = (safeJson(line ?? '') as { error?: { message?: unknown } })
    ?.error?.message;

  return typeof message === 'string' && message
    ? `: ${redact(message, apiKey).slice(0, 300)}`
    : '';
}

/** The endpoint has no /models route at all. */
export class LlmDiscoveryUnsupportedError extends BadRequestException {
  constructor() {
    super(
      'Provider tidak memiliki endpoint /models (HTTP 404). Isi Model ID secara manual.',
    );
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
