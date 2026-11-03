import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ActivateProviderUseCase } from '../application/use-cases/activate-provider.use-case';
import { CreateProviderUseCase } from '../application/use-cases/create-provider.use-case';
import { DeleteProviderUseCase } from '../application/use-cases/delete-provider.use-case';
import {
  ListProvidersUseCase,
  toView,
} from '../application/use-cases/list-providers.use-case';
import { TestProviderUseCase } from '../application/use-cases/test-provider.use-case';
import { UpdateProviderUseCase } from '../application/use-cases/update-provider.use-case';
import { LlmProviderView } from '../application/models';
import { LlmClient } from '../application/ports';
import { LlmProviderRepository } from '../application/ports';
import { allowInsecureFromEnv } from '../domain/base-url.rules';
import { isLlmProtocol, LlmProtocol } from '../domain/llm-protocol';
import { LlmExecutionContext } from '../domain/llm-provider';
import { LLM_CLIENTS } from '../application/tokens';
import {
  ActivateLlmProviderDto,
  CreateLlmProviderDto,
  TestSavedProviderDto,
  TestUnsavedProviderDto,
} from './dto/llm-provider.dto';

@Controller('llm/providers')
export class LlmProvidersController {
  constructor(
    private readonly listProviders: ListProvidersUseCase,
    private readonly createProvider: CreateProviderUseCase,
    private readonly updateProvider: UpdateProviderUseCase,
    private readonly deleteProvider: DeleteProviderUseCase,
    private readonly activateProvider: ActivateProviderUseCase,
    private readonly testProvider: TestProviderUseCase,
    private readonly repository: LlmProviderRepository,
    @Inject(LLM_CLIENTS)
    private readonly clients: Record<LlmProtocol, LlmClient>,
  ) {}

  @Get()
  findAll(): Promise<LlmProviderView[]> {
    return this.listProviders.execute();
  }

  @Post()
  async create(@Body() dto: CreateLlmProviderDto): Promise<LlmProviderView> {
    return toView(await this.createProvider.execute(dto));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: CreateLlmProviderDto,
  ): Promise<LlmProviderView> {
    return toView(await this.updateProvider.execute(Number(id), dto));
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('replacementProviderId') replacement?: string,
  ) {
    return this.deleteProvider.execute(
      Number(id),
      replacement ? Number(replacement) : null,
    );
  }

  @Post(':id/activate')
  activate(@Param('id') id: string, @Body() dto: ActivateLlmProviderDto) {
    return this.activateProvider.execute(Number(id), dto?.modelId ?? null);
  }

  /** Tests a saved provider (optionally one model). Never returns key material. */
  @Post(':id/test')
  async testSaved(@Param('id') id: string, @Body() dto: TestSavedProviderDto) {
    const provider = await this.repository.findById(Number(id));

    if (!provider) throw new NotFoundException('Provider tidak ditemukan');

    const context = this.savedContext(provider);
    const modelIds = dto?.modelId
      ? [dto.modelId]
      : provider.models.map((model) => model.id);

    if (modelIds.length === 0) {
      throw new BadRequestException('Provider tidak memiliki model untuk diuji');
    }

    const results = await this.testProvider.execute(
      context,
      this.clients[context.protocol],
      modelIds,
    );

    await this.repository.recordTestResult(Number(id), {
      status: results[0]?.ok ? 'OK' : 'FAILED',
      message: results[0]?.message ?? null,
    });

    const reloaded = await this.repository.findById(Number(id));

    return { results, provider: reloaded ? toView(reloaded) : null };
  }

  /** Tests an unsaved configuration from the form. Persists nothing. */
  @Post('test')
  async testUnsaved(@Body() dto: TestUnsavedProviderDto) {
    if (!isLlmProtocol(dto.protocol)) {
      throw new BadRequestException(
        `Protocol tidak dikenal: ${dto.protocol}. Gunakan "openai" atau "gemini".`,
      );
    }

    const context: LlmExecutionContext = {
      protocol: dto.protocol,
      baseUrl: dto.baseUrl,
      apiKey: dto.apiKey ?? null,
      headers: dto.customHeaders ?? {},
      timeoutMs: dto.timeoutMs ?? 60000,
      allowInsecure: allowInsecureFromEnv(process.env.LLM_ALLOW_INSECURE_URLS),
    };

    return {
      results: await this.testProvider.execute(
        context,
        this.clients[context.protocol],
        dto.modelIds,
      ),
    };
  }

  private savedContext(provider: {
    protocol: string;
    baseUrl: string;
    apiKey: string | null;
    apiKeyError: string | null;
    customHeaders: Record<string, string> | null;
    timeoutMs: number;
  }): LlmExecutionContext {
    if (!isLlmProtocol(provider.protocol)) {
      throw new BadRequestException(`Protocol tidak dikenal: ${provider.protocol}`);
    }

    // A stored key that cannot be decrypted is reported, never silently ignored.
    if (provider.apiKeyError) {
      throw new BadRequestException(provider.apiKeyError);
    }

    return {
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      headers: provider.customHeaders ?? {},
      timeoutMs: provider.timeoutMs,
      allowInsecure: allowInsecureFromEnv(process.env.LLM_ALLOW_INSECURE_URLS),
    };
  }
}
