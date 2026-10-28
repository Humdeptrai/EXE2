/** Generate a color-only dark layer from existing CSS and Tailwind utilities.
 * Original styles, breakpoints, geometry and image assets remain untouched.
 * Regenerated before build so new screen colors are included automatically. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scope = ':root[data-theme="dark"]';
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]).sort();
}
function hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  let h = 0;
  if (d) { h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [(h + 360) % 360, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
}
function color(value, role) {
  let r, g, b, a = 1;
  if (value === 'white') value = '#ffffff';
  if (value === 'black') value = '#000000';
  if (value.startsWith('#')) {
    let v = value.slice(1);
    if (v.length <= 4) v = [...v].map(c => c + c).join('');
    [r, g, b] = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
    if (v.length === 8) a = parseInt(v.slice(6), 16) / 255;
  } else {
    const parts = value.match(/[\d.]+/g).map(Number);
    [r, g, b] = parts; a = parts[3] ?? 1;
  }
  const [h, s, l] = hsl(r, g, b);
  if (role === 'shadow') return `rgb(0 0 0 / ${Math.min(0.6, a * 1.8).toFixed(3)})`;
  if (role === 'text') {
    if (l > .86) return value; // White labels on brand buttons and photos.
    const neutral = s < .28 || (l < .3 && (s < .5 || (h >= 180 && h <= 260 && s < .85)));
    return `hsl(${neutral ? 204 : h.toFixed(1)} ${neutral ? 24 : Math.min(75, s * 100).toFixed(1)}% ${neutral ? (l < .3 ? 90 : 73) : 73}% / ${a.toFixed(3)})`;
  }
  if (role === 'border') return `hsl(${s < .28 ? 204 : h.toFixed(1)} ${s < .28 ? 20 : Math.min(45, s * 100).toFixed(1)}% ${l > .65 ? 27 : 40}% / ${a.toFixed(3)})`;
  if (l < .58) return value; // Retain solid brand/actions and dark photo overlays.
  return `hsl(${s < .2 ? 208 : h.toFixed(1)} ${s < .2 ? 28 : Math.min(45, s * 100).toFixed(1)}% ${(l > .96 ? 13 : l > .85 ? 17 : 23)}% / ${a.toFixed(3)})`;
}
const colors = /#[\da-f]{3,8}\b|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)|\bwhite\b|\bblack\b/gi;
function role(prop) {
  if (/shadow/.test(prop)) return 'shadow';
  if (/border|outline|line/.test(prop)) return 'border';
  if (prop === 'color' || /fill|stroke|ink|muted|text/.test(prop)) return 'text';
  return 'surface';
}
function scoped(selector) {
  return selector.replace(/^(:root|html)(?=[\s.:#[>+~]|$)/, scope) === selector ? `${scope} ${selector}` : selector.replace(/^(:root|html)/, scope);
}
const output = postcss.root();
for (const file of files(path.join(root, 'src')).filter(f => f.endsWith('.css') && !f.includes('/theme/'))) {
  const ast = postcss.parse(fs.readFileSync(file, 'utf8'));
  function visit(container, target) {
    for (const node of container.nodes ?? []) {
      if (node.type === 'atrule' && ['media', 'supports', 'container'].includes(node.name)) {
        const clone = postcss.atRule({ name: node.name, params: node.params });
        visit(node, clone); if (clone.nodes?.length) target.append(clone);
      } else if (node.type === 'rule') {
        const clone = postcss.rule({ selector: node.selectors.map(scoped).join(',') });
        for (const decl of node.nodes ?? []) {
          if (decl.type !== 'decl' || !/^(color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|(?:box|text)-shadow|fill|stroke|accent-color|--[\w-]+)$/.test(decl.prop)) continue;
          const value = decl.value.replace(colors, c => color(c.toLowerCase(), role(decl.prop)));
          if (value !== decl.value) clone.append(decl.clone({ value }));
        }
        if (clone.nodes?.length) target.append(clone);
      }
    }
  }
  visit(ast, output);
}
// Tailwind arbitrary colors and semantic colors use the same dark palette.
// Keep the original responsive/state variants; only emit color declarations.
const tokens = new Set();
for (const file of files(path.join(root, 'src')).filter(f => /\.[tj]sx?$/.test(f))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const m of source.matchAll(/(?:(?:[\w-]+):)*(?:bg|text|border|divide|ring|outline|placeholder|accent|from|via|to)-(?:\[#[\da-fA-F]{3,8}\]|[a-z]+-\d{2,3}|white|black)(?:\/\d+)?/g)) tokens.add(m[0]);
}
const breakpoints = { sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem', '2xl': '96rem' };
for (const token of [...tokens].sort()) {
  const parts = token.split(':'), utility = parts.pop();
  const match = utility.match(/^(bg|text|border|divide|ring|outline|placeholder|accent|from|via|to)-(.+?)(?:\/(\d+))?$/);
  if (!match) continue;
  const [, kind, source, opacity] = match;
  const r = kind === 'text' || kind === 'placeholder' ? 'text' : ['border', 'divide', 'ring', 'outline'].includes(kind) ? 'border' : 'surface';
  let value;
  if (source.startsWith('[') || ['white', 'black'].includes(source)) value = color(source.replace(/[\[\]]/g, ''), r);
  else {
    const [, family, shadeText] = source.match(/^([a-z]+)-(\d+)$/) ?? [];
    const shade = Number(shadeText);
    const neutral = ['slate', 'gray', 'zinc', 'neutral', 'stone'].includes(family);
    let next = shade;
    if (r === 'text') next = neutral ? (shade >= 700 ? 100 : shade >= 400 ? 300 : shade) : (shade >= 500 ? 300 : shade);
    else if (r === 'border') next = shade <= 300 ? 700 : shade;
    else next = shade <= 300 ? (neutral ? (shade <= 50 ? 900 : 800) : 950) : shade;
    value = `var(--color-${family}-${next})`;
  }
  if (opacity) value = `color-mix(in srgb, ${value} ${opacity}%, transparent)`;
  const property = { bg: 'background-color', text: 'color', border: 'border-color', divide: 'border-color', ring: '--tw-ring-color', outline: 'outline-color', placeholder: 'color', accent: 'accent-color', from: '--tw-gradient-from', via: '--tw-gradient-via', to: '--tw-gradient-to' }[kind];
  let selector = `${scope} .${token.replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c)}`;
  for (const state of parts) if (['hover', 'focus', 'focus-visible', 'active', 'disabled', 'checked'].includes(state)) selector += `:${state}`;
  if (kind === 'placeholder') selector += '::placeholder';
  if (kind === 'divide') selector += ' > :not(:last-child)';
  const rule = postcss.rule({ selector }); rule.append({ prop: property, value });
  let parent = output;
  for (const variant of parts) if (breakpoints[variant]) { const media = postcss.atRule({ name: 'media', params: `(width >= ${breakpoints[variant]})` }); parent.append(media); parent = media; }
  parent.append(rule);
}
fs.writeFileSync(path.join(root, 'src/theme/dark.generated.css'), `/* Generated by scripts/generate-dark-theme.mjs. Color overrides only; do not edit. */\n${output.toString()}\n`);
