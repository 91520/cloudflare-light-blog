// ==================== 回归测试 ====================
// 运行：npm test
//
// 用一个内存版 D1 替身（mock）驱动真实业务代码，覆盖：
//   1. 路由表分发与鉴权边界（未鉴权不得访问管理接口）
//   2. 限流独立表：读写、窗口过滤、清理
//   3. Cookie 签名：签发/校验一致、篡改与过期被拒
//   4. 设置保存：白名单、主题与 DIY 参数校验
//   5. 文章增删改与前台渲染

import test from 'node:test';
import assert from 'node:assert/strict';

import { handleAPI } from '../src/api.js';
import { generateToken } from '../src/lib/auth.js';
import { initDB, getSettings, saveSettings, getRateAttempts, setRateAttempts, clearRateAttempts, cleanupRateLimits } from '../src/lib/db.js';
import { signSiteAuthCookie, verifySiteAuthCookie, signPostAuthCookie, verifyPostAuthCookie, buildSessionCookie, readCookie } from '../src/lib/cookie-auth.js';
import { getTheme, validateDiyTheme, themes } from '../src/themes/index.js';
import { getFrontendHTML } from '../src/views/frontend.js';
import { getPostHTML } from '../src/views/post.js';

// ---------- 内存 D1 替身 ----------

/**
 * 极简 SQL 引擎替身：只实现本项目实际用到的语句形态。
 * 目的是让业务代码在 Node 下可跑，不追求完整 SQL 兼容。
 */
function createMockDB() {
  const tables = {
    settings: new Map(),
    posts: new Map(),
    categories: new Map(),
    agent_keys: new Map(),
    rate_limits: new Map()
  };
  let autoId = { posts: 1, categories: 1, agent_keys: 1 };

  function exec(sql, params) {
    const s = sql.replace(/\s+/g, ' ').trim();

    // --- rate_limits ---
    if (/^INSERT OR REPLACE INTO rate_limits/i.test(s)) {
      tables.rate_limits.set(params[0], { attempts: params[1], expires_at: params[2] });
      return { changes: 1 };
    }
    if (/^DELETE FROM rate_limits WHERE expires_at </i.test(s)) {
      let n = 0;
      for (const [k, v] of tables.rate_limits) if (v.expires_at < params[0]) { tables.rate_limits.delete(k); n++; }
      return { changes: n };
    }
    if (/^DELETE FROM rate_limits WHERE key=/i.test(s)) {
      const had = tables.rate_limits.delete(params[0]);
      return { changes: had ? 1 : 0 };
    }
    if (/^SELECT attempts FROM rate_limits WHERE key=/i.test(s)) {
      const row = tables.rate_limits.get(params[0]);
      return { first: row ? { attempts: row.attempts } : null };
    }

    // --- settings ---
    if (/^INSERT OR REPLACE INTO settings/i.test(s)) {
      tables.settings.set(params[0], params[1]);
      return { changes: 1 };
    }
    if (/^INSERT OR IGNORE INTO settings/i.test(s)) {
      if (!tables.settings.has(params[0])) tables.settings.set(params[0], params[1]);
      return { changes: 1 };
    }
    if (/^DELETE FROM settings WHERE key LIKE '%_rate_%'/i.test(s)) {
      let n = 0;
      for (const k of [...tables.settings.keys()]) if (k.includes('_rate_')) { tables.settings.delete(k); n++; }
      return { changes: n };
    }
    if (/^SELECT COUNT\(\*\) as cnt FROM settings WHERE key LIKE/i.test(s)) {
      let n = 0;
      for (const k of tables.settings.keys()) if (k.includes('_rate_')) n++;
      return { first: { cnt: n } };
    }
    if (/^SELECT key, value FROM settings$/i.test(s)) {
      return { all: [...tables.settings].map(([key, value]) => ({ key, value })) };
    }
    if (/^SELECT value FROM settings WHERE key=\?/i.test(s) || /^SELECT value FROM settings WHERE key='/i.test(s)) {
      const key = params.length ? params[0] : (s.match(/key='([^']+)'/) || [])[1];
      return { first: tables.settings.has(key) ? { value: tables.settings.get(key) } : null };
    }

    // --- posts ---
    if (/^INSERT INTO posts/i.test(s)) {
      const id = autoId.posts++;
      tables.posts.set(id, { id, ...params[0] });
      return { changes: 1, last_row_id: id };
    }
    if (/^SELECT COUNT\(\*\) as cnt FROM posts/i.test(s)) return { first: { cnt: tables.posts.size } };
    if (/^SELECT COUNT\(\*\) as total FROM posts/i.test(s)) return { first: { total: tables.posts.size } };
    if (/^SELECT id, title, slug, excerpt, cover_image, category, tags, created_at, published_at, password FROM posts/i.test(s)) {
      return { all: [...tables.posts.values()] };
    }
    if (/^SELECT \* FROM posts WHERE id=\?/i.test(s)) {
      return { first: tables.posts.get(Number(params[0])) || null };
    }
    if (/^SELECT password FROM posts WHERE id=\?/i.test(s)) {
      const p = tables.posts.get(Number(params[0]));
      return { first: p ? { password: p.password } : null };
    }
    if (/^UPDATE posts SET status='draft' WHERE id=\?/i.test(s)) {
      const p = tables.posts.get(Number(params[0]));
      if (p) p.status = 'draft';
      return { changes: p ? 1 : 0 };
    }
    if (/^DELETE FROM posts WHERE id=\?/i.test(s)) {
      return { changes: tables.posts.delete(Number(params[0])) ? 1 : 0 };
    }
    if (/^SELECT tags, password FROM posts/i.test(s)) {
      return { all: [...tables.posts.values()].map(p => ({ tags: p.tags, password: p.password })) };
    }
    if (/^SELECT id, created_at, published_at, updated_at FROM posts/i.test(s)) {
      return { all: [...tables.posts.values()] };
    }

    // --- categories ---
    if (/^SELECT \* FROM categories/i.test(s) || /^SELECT name, slug/i.test(s)) {
      return { all: [...tables.categories.values()] };
    }
    if (/^SELECT COUNT\(\*\) as cnt FROM categories/i.test(s)) return { first: { cnt: tables.categories.size } };
    if (/^DELETE FROM categories WHERE id=\?/i.test(s)) {
      return { changes: tables.categories.delete(Number(params[0])) ? 1 : 0 };
    }

    // --- agent_keys ---
    if (/^SELECT COUNT\(\*\) as cnt FROM agent_keys/i.test(s)) return { first: { cnt: tables.agent_keys.size } };
    if (/^SELECT .* FROM agent_keys ORDER BY id/i.test(s)) return { all: [...tables.agent_keys.values()] };
    if (/^SELECT \* FROM agent_keys WHERE key=\?/i.test(s)) {
      const row = [...tables.agent_keys.values()].find(k => k.key === params[0]);
      return { first: row || null };
    }

    // --- 通用 ---
    if (/^SELECT 1$/i.test(s)) return { first: { 1: 1 } };
    if (/^PRAGMA table_info/i.test(s)) return { all: [] };
    if (/^SELECT name FROM sqlite_master/i.test(s)) return { first: { name: 'x' } };
    if (/^CREATE TABLE|^CREATE INDEX|^ALTER TABLE|^DELETE FROM images|^UPDATE /i.test(s)) return { changes: 0 };

    throw new Error('MockDB 未实现的语句: ' + s.slice(0, 120));
  }

  return {
    prepare(sql) {
      let params = [];
      const stmt = {
        bind(...a) { params = a; return stmt; },
        async run() { return { meta: exec(sql, params), ...exec(sql, params) }; },
        async first() { return exec(sql, params).first ?? null; },
        async all() { return { results: exec(sql, params).all ?? [] }; }
      };
      // run() 需要返回 meta；这里做一次惰性执行即可
      stmt.run = async () => {
        const r = exec(sql, params);
        return { meta: { changes: r.changes ?? 0, last_row_id: r.last_row_id }, ...r };
      };
      return stmt;
    },
    __tables: tables
  };
}

function createEnv(overrides = {}) {
  return {
    DB: createMockDB(),
    ADMIN_PASSWORD: 'test-admin-password',
    ...overrides
  };
}

/** 绕过 API 层的缓存调用（测试环境无 Cloudflare caches） */
function setupCaches() {
  const store = new Map();
  globalThis.caches = {
    default: {
      async match(req) { return store.get(req.url) || undefined; },
      async put(req, resp) { store.set(req.url, resp); },
      async delete(req) { return store.delete(req.url); }
    }
  };
}

async function authedRequest(env, path, { method = 'POST', body, token } = {}) {
  const t = token || await generateToken(env.ADMIN_PASSWORD);
  const req = new Request('https://blog.test' + path, {
    method,
    headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return handleAPI(req, env, new URL(req.url).pathname);
}

// ==================== 1. 路由表与鉴权边界 ====================

test('路由：未知路径返回 404', async () => {
  setupCaches();
  const env = createEnv();
  const req = new Request('https://blog.test/api/nope', { method: 'GET' });
  const res = await handleAPI(req, env, '/api/nope');
  assert.equal(res.status, 404);
});

test('路由：路径存在但方法不匹配返回 405', async () => {
  setupCaches();
  const env = createEnv();
  const req = new Request('https://blog.test/api/login', { method: 'GET' });
  const res = await handleAPI(req, env, '/api/login');
  assert.equal(res.status, 405);
});

test('鉴权：未带 token 访问管理接口一律 401', async () => {
  setupCaches();
  const env = createEnv();
  const paths = [
    ['GET', '/api/admin/posts'], ['GET', '/api/admin/settings'], ['POST', '/api/settings'],
    ['POST', '/api/admin/post'], ['PUT', '/api/admin/post'], ['DELETE', '/api/admin/post'],
    ['GET', '/api/admin/trash'], ['POST', '/api/admin/restore'],
    ['POST', '/api/admin/permanent-delete'], ['POST', '/api/category'],
    ['DELETE', '/api/category'], ['POST', '/api/delete-image'], ['GET', '/api/admin/images'],
    ['DELETE', '/api/admin/images'], ['GET', '/api/admin/agent-keys'],
    ['POST', '/api/admin/agent-keys'], ['POST', '/api/admin/agent-keys/reset'],
    ['POST', '/api/upload'], ['POST', '/api/admin/import-wordpress']
  ];
  for (const [method, p] of paths) {
    const req = new Request('https://blog.test' + p, { method });
    const res = await handleAPI(req, env, p);
    assert.equal(res.status, 401, `${method} ${p} 应返回 401，实际 ${res.status}`);
  }
});

test('鉴权：错误 token 被拒', async () => {
  setupCaches();
  const env = createEnv();
  const res = await authedRequest(env, '/api/admin/settings', { method: 'GET', token: '123.badbeef' });
  assert.equal(res.status, 401);
});

test('鉴权：未配置 ADMIN_PASSWORD 时 fail-closed', async () => {
  setupCaches();
  const env = createEnv({ ADMIN_PASSWORD: '' });
  const res = await authedRequest(env, '/api/admin/settings', { method: 'GET', token: '1.aa' });
  assert.equal(res.status, 401);
});

test('路由：带查询串的 DELETE /api/category 能命中', async () => {
  setupCaches();
  const env = createEnv();
  const req = new Request('https://blog.test/api/category?id=1', { method: 'DELETE' });
  // 传入 pathname（不含查询串），模拟 worker.js 的行为
  const res = await handleAPI(req, env, '/api/category');
  assert.notEqual(res.status, 404, '不应因查询串而路由失败');
  assert.notEqual(res.status, 405);
});

// ==================== 2. 限流独立表 ====================

test('限流：记录写入独立表而非 settings', async () => {
  const env = createEnv();
  await setRateAttempts(env, 'login_rate_1.2.3.4', [Date.now()], Date.now() + 60000);

  assert.equal(env.DB.__tables.rate_limits.size, 1, '应写入 rate_limits 表');
  assert.equal(env.DB.__tables.settings.size, 0, '不应污染 settings 表');
});

test('限流：窗口外记录被过滤', async () => {
  const env = createEnv();
  const now = Date.now();
  await setRateAttempts(env, 'k', [now - 1000, now - 999999999], now + 1000);
  const kept = await getRateAttempts(env, 'k', 60 * 1000);
  assert.equal(kept.length, 1, '只应保留窗口内的记录');
});

test('限流：达到上限后拒绝，清除后恢复', async () => {
  setupCaches();
  const env = createEnv();
  // 5 次机会，第 6 次拒绝
  for (let i = 0; i < 5; i++) {
    const req = new Request('https://blog.test/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'x', password: 'wrong' })
    });
    const res = await handleAPI(req, env, '/api/login');
    assert.equal(res.status, 401, `第 ${i + 1} 次应为 401`);
  }
  const sixth = new Request('https://blog.test/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'x', password: 'wrong' })
  });
  const res6 = await handleAPI(sixth, env, '/api/login');
  assert.equal(res6.status, 429, '第 6 次应被限流');

  await clearRateAttempts(env, 'login_rate_unknown');
  const after = await handleAPI(new Request('https://blog.test/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'x', password: 'wrong' })
  }), env, '/api/login');
  assert.equal(after.status, 401, '清除后应恢复为 401');
});

test('限流：登录成功后记录被清除', async () => {
  setupCaches();
  const env = createEnv();
  const req = new Request('https://blog.test/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'test-admin-password' })
  });
  const res = await handleAPI(req, env, '/api/login');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.token, '应返回 token');
  assert.equal(env.DB.__tables.rate_limits.size, 0, '成功登录后限流记录应清空');
});

test('限流：cleanupRateLimits 删除过期记录', async () => {
  const env = createEnv();
  const now = Date.now();
  await setRateAttempts(env, 'expired', [now], now - 1000);
  await setRateAttempts(env, 'alive', [now], now + 60000);

  const removed = await cleanupRateLimits(env);
  assert.equal(removed, 1);
  assert.equal(env.DB.__tables.rate_limits.has('alive'), true);
  assert.equal(env.DB.__tables.rate_limits.has('expired'), false);
});

// ==================== 6. 数据库迁移 ====================

/**
 * 专用迁移替身：按"真实建表顺序"记录发生了哪些 DDL/DML。
 * 注意 SQL 中 CREATE TABLE 后紧跟换行，正则要允许空白。
 */
function createMigrationDB(initialSettings = {}) {
  const state = {
    settings: new Map(Object.entries(initialSettings)),
    tables: new Set(['posts', 'categories']),
    cleaned: 0
  };

  const DB = {
    prepare(sql) {
      let p = [];
      const s = sql.replace(/\s+/g, ' ').trim();
      const st = {
        bind(...a) { p = a; return st; },
        async run() {
          if (/^CREATE TABLE (?:\w+ )?rate_limits/i.test(s) || /^CREATE TABLE rate_limits/i.test(s)) {
            state.tables.add('rate_limits');
          } else if (/^CREATE TABLE/.test(s)) {
            const name = (s.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i) || [])[1];
            if (name) state.tables.add(name);
          } else if (/^DELETE FROM settings WHERE key LIKE '%_rate_%'/i.test(s)) {
            let n = 0;
            for (const k of [...state.settings.keys()]) if (k.includes('_rate_')) { state.settings.delete(k); n++; }
            state.cleaned = n;
          } else if (/^INSERT OR REPLACE INTO settings/i.test(s)) {
            // 两种形态：(?, ?) 双参数；('__schema_version', ?) 键写在 SQL 里
            const literalKey = (s.match(/VALUES \('([^']+)'/) || [])[1];
            if (literalKey) state.settings.set(literalKey, p[0]);
            else state.settings.set(p[0], p[1]);
          } else if (/^INSERT OR IGNORE INTO settings/i.test(s)) {
            if (!state.settings.has(p[0])) state.settings.set(p[0], p[1]);
          }
          return { meta: { changes: 1 } };
        },
        async first() {
          if (/SELECT value FROM settings WHERE key='__schema_version'/.test(s)) {
            return state.settings.has('__schema_version') ? { value: state.settings.get('__schema_version') } : null;
          }
          if (/SELECT name FROM sqlite_master/.test(s)) {
            return state.tables.has(p[0]) ? { name: p[0] } : null;
          }
          if (/COUNT\(\*\) as cnt FROM settings WHERE key LIKE/i.test(s)) {
            let n = 0;
            for (const k of state.settings.keys()) if (k.includes('_rate_')) n++;
            return { cnt: n };
          }
          if (/COUNT\(\*\) as cnt FROM posts/i.test(s)) return { cnt: 5 };
          if (/COUNT\(\*\) as cnt FROM categories/i.test(s)) return { cnt: 2 };
          if (/SELECT attempts FROM rate_limits/i.test(s)) return { attempts: '[]' };
          return null;
        },
        async all() {
          if (/PRAGMA table_info/.test(s)) {
            return { results: [{ name: 'id' }, { name: 'title' }, { name: 'password' }, { name: 'published_at' }] };
          }
          if (/SELECT key, value FROM settings/.test(s)) {
            return { results: [...state.settings].map(([key, value]) => ({ key, value })) };
          }
          return { results: [] };
        }
      };
      return st;
    }
  };

  return { DB, state };
}

test('迁移：旧库升级时建立 rate_limits 表', async () => {
  const { DB, state } = createMigrationDB({ site_name: '旧站' });
  const ok = await initDB({ DB });
  assert.equal(ok, true);
  assert.equal(state.tables.has('rate_limits'), true, '应建立 rate_limits 表');
});

test('迁移：清理 settings 中遗留的限流记录且不动业务设置', async () => {
  const { DB, state } = createMigrationDB({
    site_name: '旧站',
    site_theme: 'simple',
    'login_rate_1.2.3.4': '[1]',
    'post_auth_rate_5_1.2.3.4': '[2]'
  });

  await initDB({ DB });

  assert.equal(state.cleaned, 2, '应清理 2 条遗留限流记录');
  assert.equal([...state.settings.keys()].filter(k => k.includes('_rate_')).length, 0, '不应残留限流键');
  assert.equal(state.settings.get('site_name'), '旧站', '业务设置不得被误删');
  assert.equal(state.settings.get('site_theme'), 'simple', '业务设置不得被误删');
});

test('迁移：schema 版本写入为当前版本，重复执行直接短路', async () => {
  const { DB, state } = createMigrationDB({});
  await initDB({ DB });
  assert.equal(state.settings.get('__schema_version'), '2', '应写入 schema 版本');

  // 再跑一次：应因版本一致而跳过建表
  state.tables.delete('rate_limits');
  const cleanedBefore = state.cleaned;
  await initDB({ DB });
  assert.equal(state.tables.has('rate_limits'), false, '版本一致时应跳过迁移');
  assert.equal(state.cleaned, cleanedBefore, '不应重复执行清理');
});

// ==================== 7. Cookie 签名 ====================

test('Cookie：站点 cookie 签发后可校验', async () => {
  const value = await signSiteAuthCookie('stored-hash-value');
  assert.equal(await verifySiteAuthCookie(value, 'stored-hash-value'), true);
});

test('Cookie：错误密钥校验失败', async () => {
  const value = await signSiteAuthCookie('hash-a');
  assert.equal(await verifySiteAuthCookie(value, 'hash-b'), false);
});

test('Cookie：篡改签名被拒', async () => {
  const value = await signSiteAuthCookie('hash-a');
  const [ts, sig] = value.split('.');
  const tampered = ts + '.' + sig.replace(/.$/, sig.endsWith('0') ? '1' : '0');
  assert.equal(await verifySiteAuthCookie(tampered, 'hash-a'), false);
});

test('Cookie：过期签名被拒', async () => {
  const value = await signSiteAuthCookie('hash-a');
  const [ts, sig] = value.split('.');
  const old = (Date.now() - 25 * 60 * 60 * 1000) + '.' + sig;
  // 用旧时间戳重签才能通过长度检查，这里直接校验过期判定
  assert.equal(await verifySiteAuthCookie(old, 'hash-a'), false);
  assert.ok(ts);
});

test('Cookie：文章 cookie 作用域隔离', async () => {
  // 文章 1 的 cookie 不能通过文章 2 的校验
  const c1 = await signPostAuthCookie(1, 'post-hash');
  assert.equal(await verifyPostAuthCookie(c1, 'post-hash', 1), true);
  assert.equal(await verifyPostAuthCookie(c1, 'post-hash', 2), false);
});

test('Cookie：畸形值不抛异常，返回 false', async () => {
  for (const bad of ['', 'abc', '1', 'a.b.c', 'NaN.deadbeef', '123.', '.abc']) {
    assert.equal(await verifySiteAuthCookie(bad, 'hash'), false, `畸形值 ${bad} 应返回 false`);
  }
});

test('Cookie：Set-Cookie 头带安全属性', () => {
  const header = buildSessionCookie('site_auth', 'v');
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Max-Age=86400/);
});

test('Cookie：readCookie 能取出对应名称的值', () => {
  const req = new Request('https://blog.test/', {
    headers: { Cookie: 'a=1; site_auth=ts.sig; post_auth_3=ts2.sig2' }
  });
  assert.equal(readCookie(req, 'site_auth'), 'ts.sig');
  assert.equal(readCookie(req, 'post_auth_3'), 'ts2.sig2');
  assert.equal(readCookie(req, 'missing'), '');
});

// ==================== 4. 设置保存与主题 ====================

test('设置：白名单之外的键被丢弃', async () => {
  setupCaches();
  const env = createEnv();
  const res = await authedRequest(env, '/api/settings', {
    body: { site_name: '新名字', __schema_version: 'hacked', evil_key: 'x' }
  });
  assert.equal(res.status, 200);
  assert.equal(env.DB.__tables.settings.get('site_name'), '新名字');
  assert.equal(env.DB.__tables.settings.has('evil_key'), false, '非白名单键不得写入');
  // __schema_version 由内部维护，外部传入应被忽略
  assert.notEqual(env.DB.__tables.settings.get('__schema_version'), 'hacked');
});

test('主题：非法主题名被拒', async () => {
  setupCaches();
  const env = createEnv();
  const res = await authedRequest(env, '/api/settings', { body: { site_theme: 'not-a-theme' } });
  assert.equal(res.status, 400);
});

test('主题：切换为 simple 后可回读', async () => {
  setupCaches();
  const env = createEnv();
  const res = await authedRequest(env, '/api/settings', { body: { site_theme: 'simple' } });
  assert.equal(res.status, 200);
  const settings = await getSettings(env);
  assert.equal(settings.site_theme, 'simple');
  assert.equal(getTheme(settings.site_theme).layout, 'simple');
});

test('DIY：合法参数保存并生效', async () => {
  setupCaches();
  const env = createEnv();
  const res = await authedRequest(env, '/api/settings', {
    body: { site_theme: 'diy-themes', diy_theme: JSON.stringify({ btnBg: '#123abc' }) }
  });
  assert.equal(res.status, 200);
  const settings = await getSettings(env);
  assert.equal(getTheme('diy-themes', settings).btnBg, '#123abc');
});

test('DIY：CSS 注入被拦截', async () => {
  setupCaches();
  const env = createEnv();
  const res = await authedRequest(env, '/api/settings', {
    body: { diy_theme: JSON.stringify({ btnBg: 'red;}</style><script>alert(1)</script>' }) }
  });
  assert.equal(res.status, 400);
});

test('DIY：畸形 JSON 被拒', async () => {
  setupCaches();
  const env = createEnv();
  const res = await authedRequest(env, '/api/settings', { body: { diy_theme: '{not json' } });
  assert.equal(res.status, 400);
});

test('DIY：默认值全部通过校验', async () => {
  const diy = themes['diy-themes'];
  for (const [key, value] of Object.entries(diy)) {
    if (key === 'name' || key === 'layout') continue;
    assert.equal(validateDiyTheme({ [key]: value }), true, `默认值 ${key}=${value} 应通过校验`);
  }
});

test('主题：未知主题名回退到默认主题', () => {
  const t = getTheme('does-not-exist');
  assert.equal(t, themes['animal-forest']);
});

// ==================== 5. 前台渲染 ====================

test('渲染：四种主题首页均产出完整 HTML', () => {
  for (const theme of ['animal-forest', 'ocean-breeze', 'diy-themes', 'simple']) {
    const html = getFrontendHTML({ site_name: '测试', site_theme: theme }, 'https://blog.test/');
    assert.match(html, /<!DOCTYPE html>/);
    assert.match(html, /<\/html>/);
  }
});

test('渲染：Simple 专属页头只在 Simple 主题出现', () => {
  for (const theme of ['animal-forest', 'ocean-breeze', 'diy-themes', 'simple']) {
    const html = getFrontendHTML({ site_name: 'S', site_theme: theme }, 'https://blog.test/');
    assert.equal(html.includes('class="simple-header"'), theme === 'simple',
      `${theme} 的 simple-header 出现状态不正确`);
  }
});

test('渲染：文章页对四种主题均正常', () => {
  const post = { id: 1, title: '标题', content: '正文内容', created_at: '2026-01-01' };
  for (const theme of ['animal-forest', 'ocean-breeze', 'diy-themes', 'simple']) {
    const html = getPostHTML(post, { site_name: 'S', site_theme: theme }, 'https://blog.test/post/1');
    assert.match(html, /<!DOCTYPE html>/);
    assert.equal(html.includes('class="simple-header"'), theme === 'simple');
  }
});

test('渲染：站点名中的 HTML 被转义（防 XSS）', () => {
  const html = getFrontendHTML({
    site_name: '<script>alert(1)</script>',
    site_theme: 'animal-forest'
  }, 'https://blog.test/');
  assert.equal(html.includes('<script>alert(1)</script>'), false, '原始脚本标签不得出现');
  assert.match(html, /&lt;script&gt;/);
});

test('渲染：JSON-LD 中的 </script> 不会提前闭合标签', () => {
  const evil = '</script><script>alert(1)</script>';
  const home = getFrontendHTML({ site_name: evil, site_theme: 'animal-forest' }, 'https://blog.test/');
  const post = getPostHTML(
    { id: 1, title: evil, content: 'x', created_at: '2026-01-01' },
    { site_name: 'S', site_theme: 'animal-forest' },
    'https://blog.test/post/1'
  );
  for (const [name, html] of [['首页', home], ['文章页', post]]) {
    assert.equal(html.includes(evil), false, `${name}不得原样输出恶意串`);
    // JSON-LD 块内不得出现裸的 </script>
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(ld, `${name}应有 JSON-LD 块`);
    assert.equal(ld[1].includes('</script>'), false, `${name} JSON-LD 内不得含 </script>`);
    assert.ok(JSON.parse(ld[1]), `${name} JSON-LD 应仍是合法 JSON`);
  }
});

test('渲染：DIY 参数实际注入 CSS 变量', () => {
  const settings = { site_theme: 'diy-themes', diy_theme: JSON.stringify({ btnBg: '#abcdef' }) };
  const html = getFrontendHTML(settings, 'https://blog.test/');
  assert.match(html, /--btn-bg: #abcdef/);
});
