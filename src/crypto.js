// Crypto helpers. Web Crypto only, so the same code runs in Workers and Node.
const enc = new TextEncoder();

export function b64(bytes) {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
export function unb64(str) {
  const s = atob(str); const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
export function hex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, '0')).join(''); }
export function randomHex(n = 32) { return hex(crypto.getRandomValues(new Uint8Array(n))); }
export async function sha256hex(str) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(str))));
}
export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Password hashing: PBKDF2-SHA256, 100,000 iterations (the Workers maximum), random salt.
// Whether this fits the free-plan CPU limit is UNVERIFIED. Test on the real account (Gate 1).
export const ITERATIONS = 100000;
export function newSalt() { return b64(crypto.getRandomValues(new Uint8Array(16))); }
export async function hashPassword(password, saltB64, iterations = ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations }, key, 256);
  return b64(new Uint8Array(bits));
}

// AES-GCM for the two-factor secret. Key comes from the TOTP_KEY secret (32 bytes, base64).
async function aesKey(keyB64) {
  return crypto.subtle.importKey('raw', unb64(keyB64), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptSecret(plain, keyB64) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(keyB64), enc.encode(plain)));
  return b64(iv) + '.' + b64(ct);
}
export async function decryptSecret(blob, keyB64) {
  const [iv, ct] = blob.split('.');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await aesKey(keyB64), unb64(ct));
  return new TextDecoder().decode(pt);
}

// TOTP (RFC 6238): SHA-1, 6 digits, 30 second step. Compatible with authenticator apps.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function newTotpSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = '', out = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
function b32decode(s) {
  let bits = '';
  for (const c of s.replace(/=+$/, '')) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return out;
}
async function hotp(secretB32, counter) {
  const key = await crypto.subtle.importKey('raw', b32decode(secretB32), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new Uint8Array(8);
  let c = counter; for (let i = 7; i >= 0; i--) { msg[i] = c & 0xff; c = Math.floor(c / 256); }
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const o = h[19] & 0xf;
  const code = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(code % 1000000).padStart(6, '0');
}
export async function totpNow(secretB32, atMs = Date.now()) { return hotp(secretB32, Math.floor(atMs / 30000)); }
export async function verifyTotp(secretB32, code, atMs = Date.now()) {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  const step = Math.floor(atMs / 30000);
  for (const d of [-1, 0, 1]) if (safeEqual(await hotp(secretB32, step + d), c)) return true;
  return false;
}
