import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Generate a cryptographically secure random string.
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Create an HMAC-SHA256 signature for webhook verification.
 */
export function createHmacSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Constant-time comparison to prevent timing attacks.
 * Uses Node.js built-in timingSafeEqual for actual constant-time behavior.
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
