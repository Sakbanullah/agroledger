import { readChatText } from './chat-body';

describe('readChatText', () => {
  const content = '{"workers":[{"name":"Budi","pieces":12,"weightKg":25.5}]}';

  it('reads a plain JSON chat completion', () => {
    const body = JSON.stringify({ choices: [{ message: { content } }] });

    expect(readChatText(body)).toBe(content);
  });

  it('reads one reply wrapped in an SSE frame (9Router)', () => {
    const body =
      'data: {"choices":[{"message":{"content":' +
      JSON.stringify(content) +
      '}}]}\ndata: [DONE]\n';

    expect(readChatText(body)).toBe(content);
  });

  it('joins a reply split across SSE frames', () => {
    const frame = (part: string) =>
      `data: {"choices":[{"message":{"content":${JSON.stringify(part)}}}]}`;

    expect(readChatText([frame('{"workers":'), frame('[]}')].join('\n'))).toBe(
      '{"workers":[]}',
    );
  });

  it('returns nothing for an SSE-framed error', () => {
    const body =
      '  {"error":{"code":503,"message":"Upstream capacity is busy"}}data: [DONE]\n';

    expect(readChatText(body)).toBeUndefined();
  });

  it('returns nothing for an empty message', () => {
    expect(readChatText(JSON.stringify({ choices: [{ message: {} }] }))).toBe(
      undefined,
    );
  });
});
