import { Injectable } from '@nestjs/common';
import { LlmExecutionContext, LlmRequest, LlmResponse } from '../../domain/llm-provider';
import { BadRequestException } from '@nestjs/common';
import { GuardedTransport, LlmClient } from '../../application/ports';
import { ModelOption, parseModelList } from '../../domain/model-list';
import { joinUrl, LlmHttpError, safeJson } from './openai-compatible.adapter';

/**
 * Gemini speaks its own protocol (parts / inlineData / generateContent), so it
 * gets its own adapter rather than being bent into the OpenAI shape.
 */
@Injectable()
export class GeminiAdapter implements LlmClient {
  constructor(private readonly transport: GuardedTransport) {}

  async generate(
    context: LlmExecutionContext,
    request: LlmRequest,
  ): Promise<LlmResponse> {
    const parts: Array<Record<string, unknown>> = [];

    if (request.image) {
      parts.push({
        inlineData: {
          mimeType: request.image.mimeType,
          data: request.image.buffer.toString('base64'),
        },
      });
    }

    if (request.prompt) {
      parts.push({ text: request.prompt });
    }

    const params = (request.model.params ?? {}) as Record<string, unknown>;
    const { temperature, maxTokens, topP, ...rest } = params;

    const generationConfig: Record<string, unknown> = {
      ...rest,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { maxOutputTokens: maxTokens } : {}),
      ...(topP !== undefined ? { topP } : {}),
      ...(request.json ? { responseMimeType: 'application/json' } : {}),
      ...(request.json && request.schema
        ? { responseSchema: toResponseSchema(request.schema) }
        : {}),
    };

    const url = `${joinUrl(context.baseUrl, `models/${encodeURIComponent(request.model.id)}:generateContent`)}`;

    const response = await this.transport.send({
      url,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(context.apiKey ? { 'x-goog-api-key': context.apiKey } : {}),
        ...context.headers,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        ...(Object.keys(generationConfig).length
          ? { generationConfig }
          : {}),
      }),
      timeoutMs: context.timeoutMs,
      allowInsecure: context.allowInsecure,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new LlmHttpError(response.status, response.text, context.apiKey);
    }

    const parsed = safeJson(response.text) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text =
      parsed?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('') ?? '';

    return { text };
  }

  /** Gemini lists with `GET /models?key=...`; the key goes in a header instead. */
  async listModels(context: LlmExecutionContext): Promise<ModelOption[]> {
    const response = await this.transport.send({
      url: joinUrl(context.baseUrl, 'models'),
      method: 'GET',
      headers: {
        ...(context.apiKey ? { 'x-goog-api-key': context.apiKey } : {}),
        ...context.headers,
      },
      timeoutMs: context.timeoutMs,
      allowInsecure: context.allowInsecure,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new LlmHttpError(response.status, response.text, context.apiKey);
    }

    const parsed = parseModelList(safeJson(response.text));

    if (!parsed.ok) {
      throw new BadRequestException(
        'Format respons /models tidak dikenali. Periksa Base URL atau isi Model ID secara manual.',
      );
    }

    return parsed.models;
  }
}

/**
 * Gemini's proto Schema has no `nullable`. JSON-schema `type: ['x','null']`
 * (used by the extraction schemas) is rewritten as `x` + `nullable: true`;
 * passing the list through is rejected with HTTP 400.
 */
function toResponseSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toResponseSchema);
  if (typeof schema !== 'object' || schema === null) return schema;

  const source = schema as Record<string, unknown>;
  const { type, ...rest } = source;

  const nullable = Array.isArray(type) && type.includes('null');
  const plainType = Array.isArray(type)
    ? type.find((entry) => entry !== 'null')
    : type;

  return {
    ...rest,
    ...(plainType === undefined ? {} : { type: plainType }),
    ...(nullable ? { nullable: true } : {}),
    ...(rest.properties
      ? {
          properties: Object.fromEntries(
            Object.entries(rest.properties as Record<string, unknown>).map(
              ([key, value]) => [key, toResponseSchema(value)],
            ),
          ),
        }
      : {}),
    ...(rest.items ? { items: toResponseSchema(rest.items) } : {}),
  };
}
