import { BadRequestException, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { SecretCipher } from '../application/ports';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

function parseMasterKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  const buffer = /^[0-9a-fA-F]{64}$/.test(trimmed)
    ? Buffer.from(trimmed, 'hex')
    : Buffer.from(trimmed, 'base64');

  return buffer.length === 32 ? buffer : null;
}

/**
 * AES-256-GCM with a master key from LLM_ENCRYPTION_KEY. node:crypto only.
 *
 * The stored payload is "v1:<iv>:<tag>:<ciphertext>", all base64. A wrong key
 * or a tampered payload fails the auth tag, which surfaces as a configuration
 * error rather than a silently empty credential.
 */
@Injectable()
export class AesGcmSecretCipher implements SecretCipher {
  private readonly key = parseMasterKey(process.env.LLM_ENCRYPTION_KEY);

  get available(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): string {
    if (!this.key) {
      throw new BadRequestException(
        'LLM_ENCRYPTION_KEY belum diatur (32 byte hex/base64). Tidak bisa menyimpan API key tanpa itu.',
      );
    }

    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return [
      VERSION,
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  decrypt(payload: string): string {
    if (!this.key) {
      throw new BadRequestException(
        'LLM_ENCRYPTION_KEY belum diatur sehingga API key tersimpan tidak bisa dibuka.',
      );
    }

    const [version, iv, tag, ciphertext] = payload.split(':');

    if (version !== VERSION || !iv || !tag || !ciphertext) {
      throw new BadRequestException('Format API key tersimpan tidak dikenali');
    }

    try {
      const decipher = createDecipheriv(
        ALGORITHM,
        this.key,
        Buffer.from(iv, 'base64'),
      );

      decipher.setAuthTag(Buffer.from(tag, 'base64'));

      return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      // Never echo the payload or the key in the error.
      throw new BadRequestException(
        'API key tersimpan tidak dapat dibuka (kunci enkripsi berubah atau data rusak)',
      );
    }
  }
}
