import crypto from 'node:crypto';

export const COOKIE = 'kk_admin';

export function getSecret() {
  return process.env.SESSION_SECRET || `kk-${process.env.ADMIN_PASSWORD || 'admin123'}-dev-secret`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest();
}

export function checkPassword(input) {
  const expected = sha256(process.env.ADMIN_PASSWORD || 'admin123');
  const received = sha256(String(input ?? ''));
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export function signSession() {
  return crypto.createHmac('sha256', getSecret()).update('authenticated').digest('hex');
}

export function isAuthenticated(value) {
  if (!value) return false;
  const expected = Buffer.from(signSession());
  const received = Buffer.from(String(value));
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
