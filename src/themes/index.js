// 主题注册中心：新增主题在此注册，其专属页面样式放在 themes/ 下。
import animalForest from './animal-forest.js';
import oceanBreeze from './ocean-breeze.js';
import diyThemes from './diy-themes.js';
import simple from './simple.js';

export const themes = {
  'animal-forest': animalForest,
  'ocean-breeze': oceanBreeze,
  'diy-themes': diyThemes,
  'simple': simple
};

export const DIY_FIELDS = ['fontFamily', 'fontUrl', 'headerBg', 'sidebarBg', 'btnBg', 'btnShadow', 'dangerBg', 'dangerShadow', 'cardBg', 'cardBorder', 'bodyBg', 'textPrimary', 'textBody', 'textSecondary', 'inputBorder', 'inputShadow'];
const COLOR = /^(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|(?:rgb|rgba|hsl|hsla)\([\d.,%\s]+\))$/;
const GRADIENT = /^linear-gradient\([\d.,%\s#a-zA-Z-]+\)$/;
const SAFE_URL = /^https:\/\/[^\s"'<>\\)]+$/i;

export function validateDiyTheme(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, input]) => {
    if (!DIY_FIELDS.includes(key) || typeof input !== 'string' || input.length > 300) return false;
    if (key === 'fontUrl') return input === '' || (SAFE_URL.test(input) && (() => { try { return Boolean(new URL(input).hostname); } catch { return false; } })());
    if (key === 'fontFamily') return /^[\w\s,'"-]+$/.test(input) && input.length > 0;
    if (COLOR.test(input)) return true;
    if (key !== 'headerBg' || !GRADIENT.test(input)) return false;
    const colors = input.match(/#[0-9a-fA-F]+/g) || [];
    return colors.length >= 2 && colors.every(color => COLOR.test(color));
  });
}

export function getTheme(themeName, settings = {}) {
  const theme = Object.hasOwn(themes, themeName) ? themes[themeName] : themes['animal-forest'];
  if (themeName !== 'diy-themes') return theme;
  let overrides;
  try { overrides = JSON.parse(settings.diy_theme || '{}'); } catch { return theme; }
  return validateDiyTheme(overrides) ? { ...theme, ...overrides } : theme;
}

export function getThemeList() {
  return Object.entries(themes).map(([key, theme]) => ({ value: key, name: theme.name }));
}
