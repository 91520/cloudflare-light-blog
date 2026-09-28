import test from 'node:test';
import assert from 'node:assert/strict';

import { handleAPI } from '../src/api.js';
import { generateToken } from '../src/lib/auth.js';
import { getSettings } from '../src/lib/db.js';
import { getFrontendHTML, THEME_PREVIEW_CSP } from '../src/views/frontend.js';
import { themes } from '../src/themes/index.js';

const path = '/api/admin/theme-preview';
const stored = {
  site_name: '预览测试站点',
  site_description: '已保存的站点描述',
  site_author: '测试作者',
  site_bio: '测试简介',
  site_theme: 'animal-forest',
  diy_theme: JSON.stringify({ btnBg: '#123456' }),
  profile_position: 'left',
  tag_cloud_position: 'left',
  custom_js: '<script>window.savedInjection=true</script>',
  iconfont_css: 'https://untrusted.test/site.css',
  site_footer: '<img src=x onerror="window.footerInjection=true">',
  ad_content: '<iframe src="https://untrusted.test/ad"></iframe>',
  ad_position: 'left',
  site_links: '私有友链,https://untrusted.test/private',
  site_password: 'private-password-hash',
  agent_key: 'private-agent-key'
};
const queries = [];
const env = {
  ADMIN_PASSWORD: 'theme-preview-admin-password',
  DB: {
    prepare(sql) {
      queries.push(sql);
      assert.equal(sql, 'SELECT key, value FROM settings', '预览只允许读取设置，不能查询真实文章或写入数据');
      return { async all() { return { results: Object.entries(stored).map(([key, value]) => ({ key, value })) }; } };
    }
  }
};
globalThis.caches = {
  default: {
    async match() { assert.fail('预览不得读取公开页面缓存'); },
    async put() { assert.fail('预览不得写入公开页面缓存'); },
    async delete() { assert.fail('预览不得清理公开页面缓存'); }
  }
};

async function preview(body, { token, method = 'POST', raw, url = 'https://blog.test' + path } = {}) {
  const bearer = token === undefined ? await generateToken(env.ADMIN_PASSWORD) : token;
  const headers = { 'Content-Type': 'application/json' };
  if (bearer) headers.Authorization = 'Bearer ' + bearer;
  const req = new Request(url, {
    method, headers,
    body: method === 'GET' ? undefined : raw === undefined ? JSON.stringify(body) : raw
  });
  return handleAPI(req, env, new URL(req.url).pathname);
}

function assertIsolated(html) {
  assert.doesNotMatch(html, /<script\b|<iframe\b|<[^>]+\son\w+\s*=|<a\b[^>]*\bhref\s*=|<link\b|fetch\(/i);
  assert.doesNotMatch(html, /savedInjection|footerInjection|untrusted\.test|private-password-hash|private-agent-key/);
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /script-src &#39;none&#39;/);
  assert.match(html, /connect-src &#39;none&#39;/);
  assert.match(html, /form-action &#39;none&#39;/);
  assert.match(html, /让文字拥有自己的颜色/);
  assert.equal((html.match(/<article class="post-card">/g) || []).length, 3);
  assert.doesNotMatch(html, /加载中\.\.\./);
}

test('主题预览：必须管理员鉴权，错误 token 和未配置密码都被拒绝', async () => {
  const before = queries.length;
  for (const token of ['', '1.badbeef']) {
    const res = await preview({ site_theme: 'simple' }, { token });
    assert.equal(res.status, 401);
  }
  const req = new Request('https://blog.test' + path, { method: 'POST', headers: { Authorization: 'Bearer 1.aa' } });
  assert.equal((await handleAPI(req, { ...env, ADMIN_PASSWORD: '' }, path)).status, 401);
  assert.equal(queries.length, before, '鉴权失败不应读取设置');
});

test('主题预览：只允许 POST，兼容路径末尾斜杠', async () => {
  assert.equal((await preview(undefined, { method: 'GET' })).status, 405);
  assert.equal((await preview({ site_theme: 'simple' }, { url: 'https://blog.test' + path + '/' })).status, 200);
});

test('主题预览：参数格式和主题注册白名单严格验证', async () => {
  for (const body of [null, [], 'simple', {}, { site_theme: null }, { site_theme: {} }, { site_theme: 'missing' }, { site_theme: '__proto__' }, { site_theme: 'constructor' }]) {
    assert.equal((await preview(body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await preview(undefined, { raw: '{' })).status, 400);
});

test('主题预览：所有已注册主题使用真实样式并提供无脚本的静态示例', async () => {
  for (const [name, theme] of Object.entries(themes)) {
    const res = await preview({ site_theme: name });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.equal(res.headers.get('Referrer-Policy'), 'no-referrer');
    assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(res.headers.get('Content-Security-Policy'), THEME_PREVIEW_CSP + "; sandbox; frame-ancestors 'self'");
    const html = await res.text();
    assertIsolated(html);
    assert.match(html, /预览测试站点/);
    assert.ok(html.includes('--body-bg: ' + theme.bodyBg));
    if (name === 'simple') {
      assert.match(html, /class="simple-header"/);
      assert.match(html, /\.post-card \{ border:0; border-bottom:1px solid #eee/);
    } else {
      assert.doesNotMatch(html, /class="simple-header"/);
    }
  }
});

test('主题预览：接受字符串或对象 DIY 覆盖但不请求外部字体', async () => {
  const diy = { bodyBg: '#112233', btnBg: '#abcdef', fontFamily: "'Microsoft YaHei', sans-serif", fontUrl: 'https://untrusted.test/font.css' };
  for (const diy_theme of [diy, JSON.stringify(diy)]) {
    const res = await preview({ site_theme: 'diy-themes', diy_theme });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /--body-bg: #112233/);
    assert.match(html, /--btn-bg: #abcdef/);
    assertIsolated(html);
  }
});

test('主题预览：拒绝 CSS、HTML、JS 和非法 DIY 参数', async () => {
  for (const diy_theme of ['{', null, [], { layout: 'simple' }, { bodyBg: '#fff; background:url(https://untrusted.test)' }, { headerBg: '</style><script>alert(1)</script>' }, { fontFamily: 'Arial; color:red' }, { fontUrl: 'javascript:alert(1)' }, { btnBg: 123 }]) {
    assert.equal((await preview({ site_theme: 'diy-themes', diy_theme })).status, 400, JSON.stringify(diy_theme));
  }
});

test('主题预览：忽略额外设置和 token，不修改设置对象、D1 或公开缓存', async () => {
  const saved = await getSettings(env);
  const snapshot = JSON.stringify(saved);
  const databaseSnapshot = JSON.stringify(stored);
  const token = await generateToken(env.ADMIN_PASSWORD);
  const res = await preview({ site_theme: 'ocean-breeze', diy_theme: '{}', custom_js: '<script>extraInjection()</script>', site_footer: '<img onerror="extraInjection()">', site_name: '不应覆盖站点名', token }, { token });
  const html = await res.text();
  assert.equal(res.status, 200);
  assertIsolated(html);
  assert.doesNotMatch(html, /extraInjection|不应覆盖站点名/);
  assert.ok(!html.includes(token), '认证 token 不得进入 iframe HTML');
  assert.equal(JSON.stringify(await getSettings(env)), snapshot, '不得修改共享内存设置缓存');
  assert.equal(JSON.stringify(stored), databaseSnapshot);
  assert.ok(queries.every(sql => sql === 'SELECT key, value FROM settings'));
});

test('主题预览渲染器：转义站点文本并禁用脚本注入、页脚 HTML、导航和外部资源', () => {
  const settings = { ...stored, site_name: '</title><script>textInjection()</script>', site_bio: '<img onerror="bioInjection()">', site_description: '<script>descriptionInjection()</script>' };
  const snapshot = JSON.stringify(settings);
  const html = getFrontendHTML(settings, 'https://blog.test/', { preview: true });
  assertIsolated(html);
  assert.match(html, /&lt;script&gt;textInjection\(\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img onerror=&quot;bioInjection\(\)&quot;&gt;/);
  assert.equal(JSON.stringify(settings), snapshot);
  const right = getFrontendHTML({ ...settings, profile_position: 'right', tag_cloud_position: 'right' }, '/', { preview: true });
  assert.match(right, /class="sidebar-right"/);
  assert.match(right, /id="category-list" class="category-list"><a>全部/);
});

test('正常前台渲染保持原行为：API 加载、站点注入、外部资源和导航不受影响', () => {
  const html = getFrontendHTML(stored, 'https://blog.test/');
  assert.match(html, /fetch\('\/api\/page-meta'\)/);
  assert.match(html, /savedInjection/);
  assert.match(html, /footerInjection/);
  assert.match(html, /<a href="\/">/);
  assert.match(html, /href="https:\/\/untrusted.test\/site.css"/);
  assert.doesNotMatch(html, /http-equiv="Content-Security-Policy"/);
});
