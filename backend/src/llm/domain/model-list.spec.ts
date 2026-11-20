import { parseModelList } from './model-list';

describe('parseModelList', () => {
  it('reads the OpenAI-compatible {data:[{id}]} shape', () => {
    const result = parseModelList({
      object: 'list',
      data: [{ id: 'deepseek-v4.1-flash' }, { id: 'gpt-5.5', display_name: 'GPT 5.5' }],
    });

    expect(result).toEqual({
      ok: true,
      models: [
        { id: 'deepseek-v4.1-flash', displayName: null },
        { id: 'gpt-5.5', displayName: 'GPT 5.5' },
      ],
    });
  });

  it('reads the Ollama / native Gemini {models:[{name}]} shape', () => {
    const result = parseModelList({ models: [{ name: 'llama3:8b' }] });

    expect(result).toEqual({ ok: true, models: [{ id: 'llama3:8b', displayName: null }] });
  });

  it('strips the models/ prefix from native Gemini names', () => {
    const result = parseModelList({
      models: [{ name: 'models/gemini-3.6-flash', displayName: 'Gemini 3.6 Flash' }],
    });

    expect(result).toEqual({
      ok: true,
      models: [{ id: 'gemini-3.6-flash', displayName: 'Gemini 3.6 Flash' }],
    });
  });

  it('reads a bare array of ids and drops duplicates', () => {
    expect(parseModelList(['a', 'b', 'a'])).toEqual({
      ok: true,
      models: [
        { id: 'a', displayName: null },
        { id: 'b', displayName: null },
      ],
    });
  });

  it('returns an empty list when the provider genuinely has none', () => {
    expect(parseModelList({ data: [] })).toEqual({ ok: true, models: [] });
  });

  it('fails loudly on an unrecognised body', () => {
    expect(parseModelList('not json').ok).toBe(false);
    expect(parseModelList(null).ok).toBe(false);
    expect(parseModelList({ error: 'nope' }).ok).toBe(false);
  });

  it('skips entries without a usable id', () => {
    const result = parseModelList({ data: [{ id: '' }, { foo: 1 }, { id: 'ok' }] });

    expect(result).toEqual({ ok: true, models: [{ id: 'ok', displayName: null }] });
  });
});
