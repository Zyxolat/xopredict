import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt (salt rounds = 12).
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}

/**
 * Validate password strength.
 * Returns null if valid, or an error message string.
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (password.length > 128) {
    return "Password must be at most 128 characters";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  return null;
}
