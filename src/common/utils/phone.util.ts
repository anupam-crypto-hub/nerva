/**
 * Normalizes a phone number to E.164 format.
 * Handles Indian numbers with/without country code.
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Indian number: 10 digits → prefix with 91
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // Already has country code (91 + 10 digits)
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  // Has + prefix already stripped
  if (digits.length > 10) {
    return digits;
  }

  // Return as-is if we can't normalize
  return digits;
}
