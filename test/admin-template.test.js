import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { getAdminHTML } from '../src/views/admin.js';
import { getFrontendHTML } from '../src/views/frontend.js';

const html = getAdminHTML();

test('普通首页内联脚本在加入预览模式后仍能解析', () => {
  const page = getFrontendHTML({ site_name: '测试', site_theme: 'simple' }, 'https://example.test/');
  for (const [, attrs, code] of page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=|application\/ld\+json/.test(attrs) && code.trim()) new vm.Script(code);
  }
});

test('后台所有内联脚本均能独立解析（覆盖模板字符串转义）', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attrs, code]) => !/\bsrc\s*=/.test(attrs) && code.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach(([, , code]) => new vm.Script(code));
});

test('后台有独立主题页、惰性隔离 iframe 与明暗偏好', () => {
  assert.match(html, /adminColorMode/);
  assert.match(html, /currentPage\s*===\s*['"]themes['"]/);
  assert.match(html, /\/api\/admin\/theme-preview/);
  assert.equal((html.match(/<iframe\b/g) || []).length, 1);
  assert.match(html, /sandbox=""/);
  assert.match(html, /srcdoc/);
  assert.doesNotMatch(html, /root\.style\.setProperty\('--header-bg'/);
});

test('确认弹窗不以 HTML 渲染用户内容，关闭遮罩会结束确认', () => {
  assert.doesNotMatch(html, /v-html="confirmModal\.message"/);
  assert.match(html, /@click\.self="confirmModal\.onCancel/);
});

test('个性设置保存不混入主题草稿', () => {
  const save = html.match(/const savePersonalSettings = async \(\) => \{([\s\S]*?)\n\s*\};/);
  assert.ok(save);
  assert.doesNotMatch(save[1], /site_theme|diy_theme/);
});

test('后台输出体积受控，不随重构引入重量级资源', () => {
  assert.ok(Buffer.byteLength(html) < 120000, '后台 HTML 超过 120 KB 预算');
  assert.equal(getAdminHTML(), html, '静态后台输出不依赖单个用户请求');
  assert.doesNotMatch(html, /react(?:\.production)?\.min|tailwind|bootstrap\.min/);
});
