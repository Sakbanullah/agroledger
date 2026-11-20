import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import {
  insecureHttpMessage,
  isBlockedAddress,
  isLoopbackHost,
} from '../domain/base-url.rules';
import {
  GuardedTransport,
  LlmHttpRequest,
  LlmHttpResponse,
} from '../application/ports';

@Injectable()
export class GuardedTransportService implements GuardedTransport {
  private readonly logger = new Logger(GuardedTransportService.name);

  async send(request: LlmHttpRequest): Promise<LlmHttpResponse> {
    const url = this.parse(request.url);

    // Resolve first, then judge each resolved address: a hostname that looks
    // innocent but points at link-local metadata is rejected here, and a
    // blocked target is reported as blocked rather than as a missing opt-in.
    const addresses = await this.resolve(url.hostname);

    const allowed = addresses.filter((address) => !isBlockedAddress(address));

    if (allowed.length === 0) {
      throw new BadRequestException(
        `Host ${url.hostname} mengarah ke alamat yang diblokir`,
      );
    }

    // Same rule as the form validator: loopback is fine, everything else
    // needs the explicit opt-in.
    if (
      url.protocol === 'http:' &&
      !isLoopbackHost(url.hostname) &&
      !request.allowInsecure
    ) {
      throw new BadRequestException(insecureHttpMessage(url.hostname));
    }

    // A dual-stack host (localhost -> ::1 and 127.0.0.1) often has only one
    // side listening; a refusal on the first is not a refusal by the provider.
    let lastRefusal: unknown = null;

    for (const address of allowed) {
      try {
        return await this.dispatch(request, url, address);
      } catch (error) {
        if (!isConnectionRefused(error)) throw error;
        lastRefusal = error;
      }
    }

    throw lastRefusal;
  }

  private dispatch(
    request: LlmHttpRequest,
    url: URL,
    address: string,
  ): Promise<LlmHttpResponse> {
    const body = request.body;

    return new Promise<LlmHttpResponse>((resolve, reject) => {
      const send = url.protocol === 'https:' ? httpsRequest : httpRequest;

      const req = send(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method: request.method,
          headers: {
            ...request.headers,
            ...(body ? { 'content-length': Buffer.byteLength(body) } : {}),
          },
          // Pin to the address we already validated so a second DNS answer
          // cannot swap the target between check and connect.
          // Node 24 asks with `all: true` (happy-eyeballs), which needs a list.
          lookup: (_hostname, options, callback) => {
            const family = address.includes(':') ? 6 : 4;

            if (options && (options as { all?: boolean }).all) {
              callback(null, [{ address, family }]);
              return;
            }

            callback(null, address, family);
          },
          timeout: request.timeoutMs,
        },
        (res) => {
          const status = res.statusCode ?? 0;

          // Redirects are refused outright, not followed.
          if (status >= 300 && status < 400) {
            res.resume();
            reject(
              new BadRequestException(
                `Endpoint mengembalikan redirect (HTTP ${status}); redirect tidak diikuti. Gunakan Base URL akhir secara langsung.`,
              ),
            );
            return;
          }

          const chunks: Buffer[] = [];

          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () =>
            resolve({ status, text: Buffer.concat(chunks).toString('utf8') }),
          );
          res.on('error', reject);
        },
      );

      req.on('timeout', () => {
        req.destroy(
          new BadRequestException(
            `Request timeout setelah ${request.timeoutMs}ms`,
          ),
        );
      });

      req.on('error', (error: Error & { code?: string }) => {
        // Surface a usable message instead of leaking a raw socket error.
        const reason =
          error.code === 'ECONNREFUSED'
            ? 'endpoint menolak koneksi'
            : error.code === 'ENOTFOUND'
              ? 'host tidak ditemukan'
              : error.message;

        const failure = new BadRequestException(
          `Gagal menghubungi endpoint (${reason})`,
        ) as BadRequestException & { code?: string };

        // Keep the socket code so the caller can try the next address.
        failure.code = error.code;

        reject(failure);
      });

      if (body) req.write(body);
      req.end();
    });
  }

  private parse(rawUrl: string): URL {
    let url: URL;

    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('URL tidak valid');
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new BadRequestException('Skema URL tidak diizinkan');
    }

    return url;
  }

  private async resolve(hostname: string): Promise<string[]> {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return [hostname];

    try {
      const results = await lookup(hostname, { all: true });

      return results.map((result) => result.address);
    } catch {
      this.logger.warn(`Gagal me-resolve host LLM: ${hostname}`);
      throw new BadRequestException(
        `Host ${hostname} tidak dapat di-resolve`,
      );
    }
  }
}

function isConnectionRefused(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'ECONNREFUSED'
  );
}
