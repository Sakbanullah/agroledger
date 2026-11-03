import { Injectable, NotFoundException } from '@nestjs/common';
import { isLlmProtocol } from '../domain/llm-protocol';
import { LlmProviderConfig } from '../domain/llm-provider';
import { SecretCipher } from '../application/ports';
import {
  LlmProviderRepository,
  PersistedProviderInput,
} from '../application/ports';
import { PrismaService } from '../../prisma/prisma.service';

type ProviderRow = {
  id: number;
  name: string;
  protocol: string;
  baseUrl: string;
  apiKeyEnc: string | null;
  customHeaders: unknown;
  timeoutMs: number;
  enabled: boolean;
  isActive: boolean;
  lastTestStatus: string | null;
  lastTestAt: Date | null;
  lastTestMessage: string | null;
  models: Array<{
    modelId: string;
    displayName: string | null;
    params: unknown;
    isDefault: boolean;
  }>;
};

@Injectable()
export class PrismaLlmProviderRepository implements LlmProviderRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: SecretCipher,
  ) {}

  async findAll(): Promise<LlmProviderConfig[]> {
    const rows = await this.prisma.llmProvider.findMany({
      include: { models: true },
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: number): Promise<LlmProviderConfig | null> {
    const row = await this.prisma.llmProvider.findUnique({
      where: { id },
      include: { models: true },
    });

    return row ? this.toDomain(row) : null;
  }

  async findActive(): Promise<LlmProviderConfig | null> {
    const row = await this.prisma.llmProvider.findFirst({
      where: { isActive: true },
      include: { models: true },
    });

    return row ? this.toDomain(row) : null;
  }

  async create(data: PersistedProviderInput): Promise<LlmProviderConfig> {
    const row = await this.prisma.llmProvider.create({
      data: {
        name: data.name,
        protocol: data.protocol,
        baseUrl: data.baseUrl,
        apiKeyEnc: data.apiKeyEnc ?? null,
        customHeaders: (data.customHeaders ?? undefined) as never,
        timeoutMs: data.timeoutMs,
        enabled: data.enabled,
        models: {
          create: data.models.map((model) => ({
            modelId: model.id,
            displayName: model.displayName,
            params: (model.params ?? undefined) as never,
            isDefault: model.id === data.defaultModelId,
          })),
        },
      },
      include: { models: true },
    });

    return this.toDomain(row);
  }

  async update(
    id: number,
    data: PersistedProviderInput,
  ): Promise<LlmProviderConfig> {
    const row = await this.prisma.$transaction(async (tx) => {
      // Models are replaced wholesale: the payload is the source of truth.
      await tx.llmModel.deleteMany({ where: { providerId: id } });

      return tx.llmProvider.update({
        where: { id },
        data: {
          name: data.name,
          protocol: data.protocol,
          baseUrl: data.baseUrl,
          // undefined keeps the stored ciphertext; null clears it.
          ...(data.apiKeyEnc !== undefined
            ? { apiKeyEnc: data.apiKeyEnc }
            : {}),
          customHeaders: (data.customHeaders ?? undefined) as never,
          timeoutMs: data.timeoutMs,
          enabled: data.enabled,
          models: {
            create: data.models.map((model) => ({
              modelId: model.id,
              displayName: model.displayName,
              params: (model.params ?? undefined) as never,
              isDefault: model.id === data.defaultModelId,
            })),
          },
        },
        include: { models: true },
      });
    });

    return this.toDomain(row);
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.llmProvider.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Provider tidak ditemukan');
    }
  }

  async setActive(id: number, defaultModelId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.llmProvider.updateMany({
        where: { isActive: true, NOT: { id } },
        data: { isActive: false },
      });

      await tx.llmModel.updateMany({
        where: { providerId: { not: id }, isDefault: true },
        data: { isDefault: false },
      });

      await tx.llmModel.updateMany({
        where: { providerId: id },
        data: { isDefault: false },
      });

      await tx.llmModel.updateMany({
        where: { providerId: id, modelId: defaultModelId },
        data: { isDefault: true },
      });

      await tx.llmProvider.update({
        where: { id },
        data: { isActive: true },
      });
    });
  }

  async clearActive(): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.llmProvider.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      await tx.llmModel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    });
  }

  async recordTestResult(
    id: number,
    result: { status: string; message: string | null },
  ): Promise<void> {
    await this.prisma.llmProvider.update({
      where: { id },
      data: {
        lastTestStatus: result.status,
        lastTestAt: new Date(),
        lastTestMessage: result.message,
      },
    });
  }

  private toDomain(row: ProviderRow): LlmProviderConfig {
    let apiKey: string | null = null;
    let apiKeyError: string | null = null;

    if (row.apiKeyEnc) {
      try {
        apiKey = this.cipher.decrypt(row.apiKeyEnc);
      } catch (error) {
        apiKeyError =
          error instanceof Error
            ? error.message
            : 'API key tersimpan tidak dapat dibuka';
      }
    }

    return {
      id: row.id,
      name: row.name,
      // An unrecognised protocol stays a loud configuration error at resolve
      // time rather than being force-cast here.
      protocol: isLlmProtocol(row.protocol) ? row.protocol : (row.protocol as never),
      baseUrl: row.baseUrl,
      apiKey,
      apiKeyError,
      customHeaders: (row.customHeaders as Record<string, string> | null) ?? null,
      timeoutMs: row.timeoutMs,
      enabled: row.enabled,
      isActive: row.isActive,
      models: row.models.map((model) => ({
        id: model.modelId,
        displayName: model.displayName,
        params: (model.params as Record<string, unknown> | null) ?? null,
        isDefault: model.isDefault,
      })),
      lastTestStatus: row.lastTestStatus,
      lastTestAt: row.lastTestAt,
      lastTestMessage: row.lastTestMessage,
    };
  }
}
