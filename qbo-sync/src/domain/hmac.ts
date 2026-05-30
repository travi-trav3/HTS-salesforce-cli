import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify an Intuit/QBO webhook signature.
 *
 * QBO signs the raw request body with HMAC-SHA256 using the app's webhook
 * verifier token and sends the result, base64-encoded, in the
 * `intuit-signature` header. We recompute it over the *raw* body bytes and
 * compare in constant time.
 *
 * IMPORTANT: pass the raw body exactly as received (a Buffer or the original
 * string). Re-serializing parsed JSON will change byte-for-byte content and
 * the signature will not match.
 */
export function verifyQboSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  verifierToken: string,
): boolean {
  if (!signatureHeader || !verifierToken) return false;

  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  const expected = createHmac('sha256', verifierToken).update(body).digest();

  let provided: Buffer;
  try {
    provided = Buffer.from(signatureHeader, 'base64');
  } catch {
    return false;
  }

  // timingSafeEqual throws if lengths differ; guard first.
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
