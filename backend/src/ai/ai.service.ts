const RUBBER_NOTE_PROMPT = `
You are the document extraction system for AgroLedger.

Analyze the uploaded image of a handwritten rubber sale record.

Extract every identifiable worker row.

For each worker, extract:
- name
- pieces
- weightKg

Important rules:

1. Read the handwriting carefully.
2. Do not invent, estimate, or guess values.
3. If a value cannot be reliably read, return null.
4. Keep the worker name as close as possible to the handwriting.
5. "pieces" means the number of rubber pieces/keping.
6. "weightKg" means the worker's total rubber weight in kilograms.
7. The note may contain numbers without labels such as "pieces" or "kg".
8. Use the spatial structure of the handwritten row to determine which number is pieces and which is weight.
9. Do not calculate prices.
10. Do not calculate worker shares.
11. Do not calculate kasbon.
12. Do not create or identify database worker IDs.
13. Do not merge different workers.
14. Extract all identifiable worker rows.
15. Return only the requested structured data.
`;


import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

import { getLlmConfig } from './llm.config';
import { rubberNoteSchema } from './schemas/rubber-note.schema';

import { RubberWorkersService } from '../rubber-workers/rubber-workers.service';

interface GenerateOptions {
  image?: { buffer: Buffer; mimeType: string };
  prompt?: string;
  json?: boolean;
  retries?: boolean;
}

@Injectable()
export class AiService {
  constructor(
    private readonly rubberWorkersService: RubberWorkersService,
  ) {}

  async testConnection() {
    const text = await this.generateText({
      prompt: 'Reply with exactly: AgroLedger AI connected',
      retries: false,
    });

    return text;
  }

  private async generateText(options: GenerateOptions) {
    const config = getLlmConfig();

    if (config.provider === 'gemini') {
      return this.generateGemini(config, options);
    }

    return this.generateOpenAi(config, options);
  }

  private async generateOpenAi(
    config: ReturnType<typeof getLlmConfig>,
    options: GenerateOptions,
  ) {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    const content: OpenAI.Chat.ChatCompletionContentPart[] = [];

    if (options.prompt) {
      content.push({ type: 'text', text: options.prompt });
    }

    if (options.image) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${options.image.mimeType};base64,${options.image.buffer.toString('base64')}`,
        },
      });
    }

    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content }],
      // ponytail: many OpenAI-compatible gateways ignore this; prompt forces JSON too.
      ...(options.json ? { response_format: { type: 'json_object' as const } } : {}),
    });

    return response.choices[0]?.message?.content || '';
  }

  private async generateGemini(
    config: ReturnType<typeof getLlmConfig>,
    options: GenerateOptions,
  ) {
    const client = new GoogleGenAI({ apiKey: config.apiKey });

    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [];

    if (options.image) {
      parts.push({
        inlineData: {
          mimeType: options.image.mimeType,
          data: options.image.buffer.toString('base64'),
        },
      });
    }

    if (options.prompt) {
      parts.push({ text: options.prompt });
    }

    const run = () =>
      client.models.generateContent({
        model: config.model,
        contents: [{ role: 'user', parts }],
        config: options.json
          ? { responseMimeType: 'application/json', responseSchema: rubberNoteSchema }
          : undefined,
      });

    const response = options.retries ? await this.withRetry(run) : await run();

    return response.text || '';
  }

  private async withRetry<T>(run: () => Promise<T>): Promise<T> {
    const delays = [2000, 4000];

    for (let attempt = 1; attempt <= delays.length + 1; attempt++) {
      try {
        return await run();
      } catch (error) {
        const status =
          typeof error === 'object' && error !== null && 'status' in error
            ? Number((error as { status?: unknown }).status)
            : undefined;

        console.error(`[AI] attempt ${attempt} failed with status ${status}`);

        if (status !== 503 || attempt === delays.length + 1) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1]));
      }
    }

    throw new BadRequestException('LLM gagal memproses request');
  }

  async scanRubberNote(
    imageBuffer: Buffer,
    mimeType: string,
  ) {
    console.log('[AI] Scan request received');

    const text = await this.generateText({
      image: { buffer: imageBuffer, mimeType },
      prompt: `${RUBBER_NOTE_PROMPT}

Return a JSON object with this exact shape:
{"workers":[{"name":string|null,"pieces":integer|null,"weightKg":number|null}]}`,
      json: true,
      retries: true,
    });

    console.log('[AI] Response:', text);

    return this.attachWorkerMatches(
      this.validateRubberNoteResult(this.parseRubberNoteResult(text)),
    );
  }


  private parseRubberNoteResult(
    responseText: string | undefined,
  ) {
    if (!responseText) {
      throw new BadRequestException(
        'LLM tidak mengembalikan hasil extraction',
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(
        responseText,
      );
    } catch {
      throw new BadRequestException(
        'Hasil extraction LLM bukan JSON yang valid',
      );
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('workers' in parsed) ||
      !Array.isArray(
        parsed.workers,
      )
    ) {
      throw new BadRequestException(
        'Format hasil extraction LLM tidak valid',
      );
    }

    return parsed;
  }

  private validateRubberNoteResult(
    result: unknown,
  ): {
    workers: Array<{
      name: string | null;
      pieces: number | null;
      weightKg: number | null;
    }>;
  } {
    if (
      typeof result !== 'object' ||
      result === null ||
      !('workers' in result) ||
      !Array.isArray(
        result.workers,
      )
    ) {
      throw new BadRequestException(
        'Hasil extraction LLM tidak memiliki format workers yang valid',
      );
    }

    result.workers.forEach(
      (worker, index) => {
        if (
          typeof worker !== 'object' ||
          worker === null
        ) {
          throw new BadRequestException(
            `Data worker ke-${index + 1} tidak valid`,
          );
        }

        const workerData =
          worker as {
            name?: unknown;
            pieces?: unknown;
            weightKg?: unknown;
          };

        if (
          workerData.name !== null &&
          typeof workerData.name !==
            'string'
        ) {
          throw new BadRequestException(
            `Nama worker ke-${index + 1} tidak valid`,
          );
        }

        if (
          workerData.pieces !== null &&
          (
            typeof workerData.pieces !==
              'number' ||
            !Number.isInteger(
              workerData.pieces,
            ) ||
            workerData.pieces < 0
          )
        ) {
          throw new BadRequestException(
            `Jumlah pieces worker ke-${index + 1} tidak valid`,
          );
        }

        if (
          workerData.weightKg !== null &&
          (
            typeof workerData.weightKg !==
              'number' ||
            !Number.isFinite(
              workerData.weightKg,
            ) ||
            workerData.weightKg < 0
          )
        ) {
          throw new BadRequestException(
            `Berat worker ke-${index + 1} tidak valid`,
          );
        }

        if (
          workerData.name === null &&
          workerData.pieces === null &&
          workerData.weightKg === null
        ) {
          throw new BadRequestException(
            `Worker ke-${index + 1} tidak memiliki data yang dapat digunakan`,
          );
        }
      },
    );

    return result as {
      workers: Array<{
        name: string | null;
        pieces: number | null;
        weightKg: number | null;
      }>;
    };
  }

  private async attachWorkerMatches(
    result: {
      workers: Array<{
        name: string | null;
        pieces: number | null;
        weightKg: number | null;
      }>;
    },
  ) {
    const workersWithMatches =
      await Promise.all(
        result.workers.map(
          async (worker) => {
            if (!worker.name) {
              return {
                ...worker,
                matches: [],
              };
            }

            const matches =
              await this.rubberWorkersService.fuzzyMatch(
                worker.name,
              );

            return {
              ...worker,
              matches,
            };
          },
        ),
      );

    return {
      workers:
        workersWithMatches,
    };
  }
}