import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { GoogleGenAI } from '@google/genai';

import { rubberNoteSchema } from './schemas/rubber-note.schema';

import { RubberWorkersService } from '../rubber-workers/rubber-workers.service';

@Injectable()
export class AiService {
  private readonly ai: GoogleGenAI;

  constructor(
    private readonly rubberWorkersService: RubberWorkersService,
  ) {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  async testConnection() {
    const response =
      await this.ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents:
          'Reply with exactly: AgroLedger AI connected',
      });

    return response.text;
  }

  async scanRubberNote(
    imageBuffer: Buffer,
    mimeType: string,
  ) {
    console.log('[AI] Scan request received');

    console.log(
      '[AI] Image size:',
      imageBuffer.length,
    );

    console.log(
      '[AI] MIME type:',
      mimeType,
    );

    const base64Image =
      imageBuffer.toString('base64');

    console.log(
      '[AI] Sending request to Gemini...',
    );

    const response =
      await this.generateGeminiContent(
        [
          {
            role: 'user',

            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },

              {
                text: `
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
15. If a row exists but one of its values is unclear, still return the worker with null for the unclear value.
16. Return only the requested structured data.
                `,
              },
            ],
          },
        ],
        {
          responseMimeType: 'application/json',
          responseSchema: rubberNoteSchema,
        },
      );

    console.log(
      '[AI] Gemini response received',
    );

    console.log(
      '[AI] Response:',
      response.text,
    );

    const parsedResult =
      this.parseRubberNoteResult(
        response.text,
      );

    const validatedResult =
      this.validateRubberNoteResult(
        parsedResult,
      );

    return this.attachWorkerMatches(
      validatedResult,
    );
  }

  private async generateGeminiContent(
    contents: any,
    config: any,
  ) {
    const maxAttempts = 3;

    const delays = [
      2000,
      4000,
    ];

    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt++
    ) {
      try {
        console.log(
          `[AI] Gemini attempt ${attempt}/${maxAttempts}`,
        );

        const response =
          await this.ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents,
            config,
          });

        return response;
      } catch (error) {
        const status =
          typeof error === 'object' &&
          error !== null &&
          'status' in error
            ? Number(
                (
                  error as {
                    status?: unknown;
                  }
                ).status,
              )
            : undefined;

        console.error(
          `[AI] Gemini attempt ${attempt} failed with status ${status}`,
        );

        if (
          status !== 503 ||
          attempt === maxAttempts
        ) {
          throw error;
        }

        console.log(
          `[AI] Gemini unavailable. Retrying in ${
            delays[attempt - 1]
          }ms...`,
        );

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              delays[attempt - 1],
            ),
        );
      }
    }

    throw new BadRequestException(
      'Gemini gagal memproses request',
    );
  }

  private parseRubberNoteResult(
    responseText: string | undefined,
  ) {
    if (!responseText) {
      throw new BadRequestException(
        'Gemini tidak mengembalikan hasil extraction',
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(
        responseText,
      );
    } catch {
      throw new BadRequestException(
        'Hasil extraction Gemini bukan JSON yang valid',
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
        'Format hasil extraction Gemini tidak valid',
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
        'Hasil extraction Gemini tidak memiliki format workers yang valid',
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