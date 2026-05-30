import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyQboSignature } from '../src/domain/hmac.js';

const TOKEN = 'test-verifier-token';

function sign(body: string, token = TOKEN): string {
  return createHmac('sha256', token).update(Buffer.from(body, 'utf8')).digest('base64');
}

describe('verifyQboSignature', () => {
  const body = JSON.stringify({ eventNotifications: [{ realmId: '123' }] });

  it('accepts a correctly signed payload', () => {
    expect(verifyQboSignature(body, sign(body), TOKEN)).toBe(true);
  });

  it('accepts when body is passed as a Buffer', () => {
    expect(verifyQboSignature(Buffer.from(body), sign(body), TOKEN)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const tampered = body.replace('123', '999');
    expect(verifyQboSignature(tampered, sign(body), TOKEN)).toBe(false);
  });

  it('rejects a signature made with the wrong token', () => {
    expect(verifyQboSignature(body, sign(body, 'wrong-token'), TOKEN)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    expect(verifyQboSignature(body, undefined, TOKEN)).toBe(false);
  });

  it('rejects when verifier token is empty', () => {
    expect(verifyQboSignature(body, sign(body), '')).toBe(false);
  });

  it('rejects garbage that decodes to the wrong length', () => {
    expect(verifyQboSignature(body, 'not-a-real-signature', TOKEN)).toBe(false);
  });
});
