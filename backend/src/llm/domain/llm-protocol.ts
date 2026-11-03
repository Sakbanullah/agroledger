export const LLM_PROTOCOLS = ['openai', 'gemini'] as const;

export type LlmProtocol = (typeof LLM_PROTOCOLS)[number];

export function isLlmProtocol(value: string): value is LlmProtocol {
  return (LLM_PROTOCOLS as readonly string[]).includes(value);
}
