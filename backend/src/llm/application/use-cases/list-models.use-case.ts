import { Injectable } from '@nestjs/common';
import { LlmExecutionContext } from '../../domain/llm-provider';
import { ModelOption } from '../../domain/model-list';
import { LlmClient } from '../ports';

/**
 * Asks a provider what models it serves so the form can offer them in a
 * dropdown. Discovery failures are returned, not thrown: a failed fetch must
 * never look like "this provider has no models".
 */
@Injectable()
export class ListModelsUseCase {
  async execute(
    context: LlmExecutionContext,
    client: LlmClient,
  ): Promise<ListModelsResult> {
    try {
      const models = await client.listModels(context);

      return { models, error: null };
    } catch (error) {
      return {
        models: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export interface ListModelsResult {
  models: ModelOption[];
  error: string | null;
}
