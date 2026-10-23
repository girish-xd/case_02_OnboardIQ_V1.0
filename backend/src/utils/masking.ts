/**
 * Privacy and PII Masking Utilities
 * Follows Deccan Digital Bank Compliance Policy & Section 6.1.2 Data Protection rules.
 */

/**
 * Mask PAN: "PAN is masked as ZZKXXXXX4Q in lists and exports"
 * Preserves first 3 characters and last 2 characters, masks middle 5 characters with 'X'
 */
export function maskPan(pan: string | undefined | null): string {
  if (!pan) return '';
  const clean = pan.trim().toUpperCase();
  if (clean.length === 10) {
    return `${clean.substring(0, 3)}XXXXX${clean.substring(8)}`;
  }
  return clean.replace(/.(?=.{2})/g, 'X');
}

/**
 * Mask Aadhaar: Only last 4 digits are stored or displayed
 */
export function maskAadhaar(aadhaarLast4: string | undefined | null): string {
  if (!aadhaarLast4) return '';
  const clean = aadhaarLast4.trim();
  if (clean.length === 4) {
    return `XXXX XXXX ${clean}`;
  }
  if (clean.length > 4) {
    return `XXXX XXXX ${clean.slice(-4)}`;
  }
  return `XXXX ${clean}`;
}

/**
 * Mask Mobile Number: Shows last 4 digits
 */
export function maskMobile(mobile: string | undefined | null): string {
  if (!mobile) return '';
  const clean = mobile.trim();
  if (clean.length === 10) {
    return `XXXXXX${clean.substring(6)}`;
  }
  return clean.replace(/.(?=.{4})/g, 'X');
}

/**
 * Mask Email Address: e.g. "ravi.sharma@example.com" -> "r***a@example.com"
 */
export function maskEmail(email: string | undefined | null): string {
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.trim().split('@');
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Redact sensitive fields from any object for privacy-safe logging or exports
 */
export function redactPii<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  const cloned: Record<string, any> = { ...obj };
  
  if ('pan_number' in cloned) cloned.pan_number = maskPan(cloned.pan_number);
  if ('panNumber' in cloned) cloned.panNumber = maskPan(cloned.panNumber);
  if ('pan' in cloned) cloned.pan = maskPan(cloned.pan);
  
  if ('aadhaar_last4' in cloned) cloned.aadhaar_last4 = maskAadhaar(cloned.aadhaar_last4);
  if ('aadhaarLast4' in cloned) cloned.aadhaarLast4 = maskAadhaar(cloned.aadhaarLast4);
  
  if ('mobile' in cloned) cloned.mobile = maskMobile(cloned.mobile);
  if ('email' in cloned) cloned.email = maskEmail(cloned.email);
  
  return cloned;
}
