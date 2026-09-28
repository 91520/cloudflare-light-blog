// ==================== Cookie 签名模块 ====================
// 站点访问密码与文章密码共用同一套 "时间戳.HMAC签名" cookie 格式。
// 早期该逻辑分散在 worker.js（校验）与 api.js（签发）两处，容易改漏，
// 现统一到本模块，两边共用。

import { deriveHMACKey } from './utils.js';

// Cookie 有效期 24 小时
export const COOKIE_MAX_AGE = 86400;
const COOKIE_TTL_MS = COOKIE_MAX_AGE * 1000;

/**
 * 生成签名 cookie 值
 * @param {string} secret - 密钥材料（站点密码哈希 / 文章密码哈希）
 * @param {string} scope - 作用域，用于隔离不同用途的签名（如 'site-auth'、'post-auth-3'）
 * @returns {Promise<string>} 格式：timestamp.hexSignature
 */
export async function signCookie(secret, scope) {
  const timestamp = Date.now();
  const key = await deriveHMACKey(secret, scope);
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(scope + ':' + timestamp)
  );
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return timestamp + '.' + sigHex;
}

/**
 * 校验签名 cookie
 * @returns {Promise<boolean>}
 */
export async function verifyCookie(cookieValue, secret, scope) {
  if (!cookieValue || !secret) return false;
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 2) return false;
    const timestamp = parseInt(parts[0], 10);
    if (isNaN(timestamp)) return false;
    if (Date.now() - timestamp > COOKIE_TTL_MS) return false;
    const expected = await signCookieAt(secret, scope, timestamp);
    return expected.split('.')[1] === parts[1];
  } catch {
    return false;
  }
}

/**
 * 按指定时间戳生成签名（校验时复用，避免使用新的时间戳）
 */
async function signCookieAt(secret, scope, timestamp) {
  const key = await deriveHMACKey(secret, scope);
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(scope + ':' + timestamp)
  );
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return timestamp + '.' + sigHex;
}

// ==================== 便捷封装 ====================

/** 站点访问密码 cookie 的作用域与 cookie 名 */
const SITE_SCOPE = 'site-auth';
export const SITE_COOKIE = 'site_auth';

/** 文章密码 cookie 的作用域与 cookie 名 */
function postScope(postId) { return 'post-auth-' + postId; }
function postCookieName(postId) { return 'post_auth_' + postId; }

export async function signSiteAuthCookie(passwordHash) {
  return signCookie(passwordHash, SITE_SCOPE);
}

export async function verifySiteAuthCookie(value, passwordHash) {
  return verifyCookie(value, passwordHash, SITE_SCOPE);
}

export async function signPostAuthCookie(postId, passwordHash) {
  return signCookie(passwordHash, postScope(postId));
}

export async function verifyPostAuthCookie(value, passwordHash, postId) {
  return verifyCookie(value, passwordHash, postScope(postId));
}

/** 构造 Set-Cookie 响应头值 */
export function buildSessionCookie(name, value) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}

/**
 * 从请求 Cookie 头中读取指定名称的值
 */
export function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? match[1] : '';
}

export { postCookieName };
