import { Injectable } from '@nestjs/common';
import { LlmExecutionContext, LlmRequest, LlmResponse } from '../../domain/llm-provider';
import { GuardedTransport, LlmClient } from '../../application/ports';
import {
  joinUrl,
  LlmHttpError,
  safeJson,
} from './openai-compatible.adapter';

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
        ? { responseSchema: request.schema }
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
}
