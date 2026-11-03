import { Module } from '@nestjs/common';
import { GuardedTransport, LlmClient, SecretCipher } from './application/ports';
import { LlmProviderRepository } from './application/ports';
import { LLM_ALLOW_INSECURE, LLM_CLIENTS } from './application/tokens';
import { ActivateProviderUseCase } from './application/use-cases/activate-provider.use-case';
import { CreateProviderUseCase } from './application/use-cases/create-provider.use-case';
import { DeleteProviderUseCase } from './application/use-cases/delete-provider.use-case';
import { ListProvidersUseCase } from './application/use-cases/list-providers.use-case';
import { ResolveActiveLlmUseCase } from './application/use-cases/resolve-active-llm.use-case';
import { TestProviderUseCase } from './application/use-cases/test-provider.use-case';
import { UpdateProviderUseCase } from './application/use-cases/update-provider.use-case';
import { allowInsecureFromEnv } from './domain/base-url.rules';
import { LlmProtocol } from './domain/llm-protocol';
import { GeminiAdapter } from './infrastructure/adapters/gemini.adapter';
import { OpenAiCompatibleAdapter } from './infrastructure/adapters/openai-compatible.adapter';
import { AesGcmSecretCipher } from './infrastructure/aes-gcm-secret.cipher';
import { GuardedTransportService } from './infrastructure/guarded-transport';
import { PrismaLlmProviderRepository } from './infrastructure/prisma-llm-provider.repository';
import { LlmProvidersController } from './interface/llm-providers.controller';

/**
 * Composition root: the only module that names concrete adapters, cipher and
 * repository. Everything inward depends on the interfaces in application/ports.
 */
@Module({
  controllers: [LlmProvidersController],
  providers: [
    GuardedTransportService,
    AesGcmSecretCipher,
    PrismaLlmProviderRepository,
    OpenAiCompatibleAdapter,
    GeminiAdapter,
    {
      provide: LLM_ALLOW_INSECURE,
      useFactory: () => allowInsecureFromEnv(process.env.LLM_ALLOW_INSECURE_URLS),
    },
    {
      provide: LLM_CLIENTS,
      useFactory: (
        openai: OpenAiCompatibleAdapter,
        gemini: GeminiAdapter,
      ): Record<LlmProtocol, LlmClient> => ({ openai, gemini }),
      inject: [OpenAiCompatibleAdapter, GeminiAdapter],
    },
    { provide: GuardedTransport, useExisting: GuardedTransportService },
    { provide: SecretCipher, useExisting: AesGcmSecretCipher },
    { provide: LlmProviderRepository, useExisting: PrismaLlmProviderRepository },
    TestProviderUseCase,
    ListProvidersUseCase,
    CreateProviderUseCase,
    UpdateProviderUseCase,
    DeleteProviderUseCase,
    ActivateProviderUseCase,
    ResolveActiveLlmUseCase,
  ],
  exports: [ResolveActiveLlmUseCase, LlmProviderRepository, SecretCipher, LLM_CLIENTS],
})
export class LlmModule {}
