import {
  isLoopbackHost,
  validateBaseUrlSyntax,
} from './base-url.rules';

const strict = { allowInsecure: false };
const optIn = { allowInsecure: true };

describe('isLoopbackHost', () => {
  it.each(['localhost', 'LOCALHOST', '127.0.0.1', '127.1.2.3', '::1', '[::1]', 'app.localhost'])(
    'treats %s as loopback',
    (host) => expect(isLoopbackHost(host)).toBe(true),
  );

  it.each(['0.0.0.0', '10.0.0.5', '192.168.1.9', '172.20.0.1', 'api.example.com'])(
    'does not treat %s as loopback',
    (host) => expect(isLoopbackHost(host)).toBe(false),
  );
});

describe('validateBaseUrlSyntax', () => {
  it('accepts https to any public host', () => {
    expect(validateBaseUrlSyntax('https://api.example.com/v1', strict)).toBeNull();
  });

  it.each([
    'http://localhost:11434/v1',
    'http://127.0.0.1:11434/v1',
    'http://[::1]:8080/v1',
  ])('accepts %s without an opt-in', (url) => {
    expect(validateBaseUrlSyntax(url, strict)).toBeNull();
  });

  it('rejects http to a public host even with the opt-in', () => {
    expect(validateBaseUrlSyntax('http://api.example.com/v1', optIn)).toMatch(
      /hanya diizinkan untuk host loopback atau privat/,
    );
  });

  it('rejects http to a private LAN host without the opt-in', () => {
    expect(validateBaseUrlSyntax('http://192.168.1.10:8080/v1', strict)).toMatch(
      /LLM_ALLOW_INSECURE_URLS=true/,
    );
  });

  it('accepts http to a private LAN host when the opt-in is set', () => {
    expect(validateBaseUrlSyntax('http://192.168.1.10:8080/v1', optIn)).toBeNull();
  });

  it('mentions where to set the variable', () => {
    expect(validateBaseUrlSyntax('http://10.1.1.1/v1', strict)).toContain(
      'backend/.env',
    );
  });

  it.each([
    'not a url',
    'ftp://localhost/v1',
    'file:///etc/passwd',
    'http://user:secret@localhost/v1',
    'http://169.254.169.254/latest/meta-data',
    'http://0.0.0.0:11434/v1',
  ])('rejects %s', (url) => {
    expect(validateBaseUrlSyntax(url, optIn)).not.toBeNull();
  });

  it('reports a blocked address as blocked, not as a missing opt-in', () => {
    expect(validateBaseUrlSyntax('http://169.254.169.254/v1', strict)).toMatch(
      /tidak diizinkan/,
    );
  });

  it('explains an unparseable URL in the app language', () => {
    expect(validateBaseUrlSyntax('not a url', strict)).toBe('Base URL tidak valid');
  });

  it('never echoes credentials back in the error', () => {
    const message = validateBaseUrlSyntax('http://user:hunter2@localhost/v1', optIn);

    expect(message).toBeTruthy();
    expect(message).not.toContain('hunter2');
  });
});
