import { randomInt, createHash } from "crypto";

const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
export function generateOTP(): string {
  const min = Math.pow(10, OTP_LENGTH - 1); // 100000
  const max = Math.pow(10, OTP_LENGTH) - 1; // 999999
  return String(randomInt(min, max + 1));
}

/**
 * Hash an OTP for secure database storage.
 * Uses SHA-256 — OTPs are short-lived and brute-force is mitigated by attempt limits.
 */
export function hashOTP(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

/**
 * Verify a plaintext OTP against a stored hash.
 */
export function verifyOTP(otp: string, storedHash: string): boolean {
  const inputHash = hashOTP(otp);
  // Constant-time comparison to prevent timing attacks
  if (inputHash.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < inputHash.length; i++) {
    result |= inputHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}
