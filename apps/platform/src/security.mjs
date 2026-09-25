import { createHash, randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(derive);
export const digest = value => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function requireThat(condition, message, status = 400) {
  if (!condition) throw new HttpError(status, message);
}
export async function passwordHash(password) {
  requireThat(typeof password === 'string' && password.length >= 12 && password.length <= 256,
    'A senha deve ter entre 12 e 256 caracteres.');
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${Buffer.from(await scrypt(password, salt, 64)).toString('hex')}`;
}
export async function passwordMatches(password, hash) {
  if (typeof password !== 'string' || password.length > 256) return false;
  const [salt, key] = hash.split(':');
  const actual = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(key, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function allow(user, roles) {
  requireThat(user && roles.includes(user.role), 'Você não tem permissão para esta ação.', 403);
}
export function emailAddress(value) {
  const email = String(value || '').trim().toLowerCase();
  requireThat(email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'E-mail inválido.');
  return email;
}
export const cleanText = (value, max = 200) => String(value || '').trim().slice(0, max);

// Per-process bounded limiter; use an upstream rate limit for multi-instance deployments.
export function rateLimiter(limit = 30, windowMs = 60_000) {
  const entries = new Map();
  return key => {
    const now = Date.now();
    for (const [k, v] of entries) if (v.until <= now) entries.delete(k);
    if (!entries.has(key)) {
      requireThat(entries.size < 10_000, 'Serviço ocupado. Tente novamente.', 429);
      entries.set(key, { count: 0, until: now + windowMs });
    }
    const entry = entries.get(key);
    requireThat(++entry.count <= limit, 'Muitas tentativas. Aguarde um minuto.', 429);
  };
}
