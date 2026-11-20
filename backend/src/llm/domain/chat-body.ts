// Framework-free reading of a chat completion body. 9Router sometimes answers
// a non-stream request with the reply wrapped in `data: {...}` SSE frames, so a
// fresh parse of the JSON shape alone would throw away a perfectly good answer.

export interface ChatFrame {
  choices?: Array<{ message?: { content?: string } }>;
}

export function readChatText(body: string): string | undefined {
  const direct = readContent(parseJson(body));

  if (direct !== undefined) return direct;

  const joined = body
    .split('\n')
    .map((part) => part.replace(/^data:\s*/, '').trim())
    .filter((part) => part.startsWith('{'))
    .map((part) => readContent(parseJson(part)))
    .filter((content): content is string => content !== undefined)
    .join('');

  return joined || undefined;
}

function readContent(frame: unknown): string | undefined {
  const content = (frame as ChatFrame | null)?.choices?.[0]?.message?.content;

  return typeof content === 'string' && content ? content : undefined;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
