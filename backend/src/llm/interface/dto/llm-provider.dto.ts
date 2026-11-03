import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LLM_PROTOCOLS } from '../../domain/llm-protocol';

export class LlmModelDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  displayName?: string | null;

  @IsOptional()
  @IsObject()
  params?: Record<string, unknown> | null;
}

export class CreateLlmProviderDto {
  @IsString()
  name: string;

  @IsIn(LLM_PROTOCOLS as unknown as string[])
  protocol: string;

  @IsString()
  baseUrl: string;

  @IsOptional()
  @IsString()
  apiKey?: string | null;

  @IsOptional()
  @IsObject()
  customHeaders?: Record<string, string> | null;

  @IsOptional()
  @IsInt()
  @Min(1000)
  timeoutMs?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LlmModelDto)
  models: LlmModelDto[];

  @IsOptional()
  @IsString()
  defaultModelId?: string | null;
}

export class UpdateLlmProviderDto extends CreateLlmProviderDto {}

/** Tests an unsaved form configuration. Nothing is persisted. */
export class TestUnsavedProviderDto {
  @IsIn(LLM_PROTOCOLS as unknown as string[])
  protocol: string;

  @IsString()
  baseUrl: string;

  @IsOptional()
  @IsString()
  apiKey?: string | null;

  @IsOptional()
  @IsObject()
  customHeaders?: Record<string, string> | null;

  @IsOptional()
  @IsInt()
  @Min(1000)
  timeoutMs?: number;

  @IsArray()
  @IsString({ each: true })
  modelIds: string[];
}

export class TestSavedProviderDto {
  @IsOptional()
  @IsString()
  modelId?: string;
}

export class DeleteLlmProviderDto {
  @IsOptional()
  @IsInt()
  replacementProviderId?: number | null;
}

export class ActivateLlmProviderDto {
  @IsOptional()
  @IsString()
  modelId?: string | null;
}

export class TestResultDto {
  ok: boolean;
  modelId: string | null;
  message: string;
}
