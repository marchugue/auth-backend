import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

export const hashPassword = (plain: string): Promise<string> => {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

export const comparePassword = (plain: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

/**
 * Generates a URL-safe random token. Returns both:
 *  - raw: sent to the user (email link, response body, etc.) — never stored
 *  - hashed: SHA-256 digest, safe to store in the database
 *
 * This means a stolen database dump never contains a token an attacker can use directly.
 */
export const generateSecureToken = (): { raw: string; hashed: string } => {
  const raw = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
};

export const hashToken = (raw: string): string => {
  return crypto.createHash('sha256').update(raw).digest('hex');
};
