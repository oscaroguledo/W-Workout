// Renders the Recomp icon set from assets/brand/mark.svg with headless Chrome.
// Usage: node assets/brand/render-icons.mjs  (needs playwright-core and Google Chrome)
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const outDir = process.argv[2] ?? root;
const markSvg = readFileSync(`${root}/brand/mark.svg`, 'utf8');
const inner = markSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const BG = `<defs><radialGradient id="glow" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#26351B"/><stop offset="0.55" stop-color="#121710"/><stop offset="1" stop-color="#0A0B0D"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#glow)"/>`;
const svg = (body, { scale = 1 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${body.bg ?? ''}<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${body.mark}</g></svg>`;
const white = inner.replace(/#C5F06A/g, '#FFFFFF');
const variants = {
  'icon.png': { size: 1024, svg: svg({ bg: BG, mark: inner }, { scale: 1.12 }) },
  'android-icon-foreground.png': { size: 512, svg: svg({ mark: inner }, { scale: 0.9 }), transparent: true },
  'android-icon-background.png': { size: 512, svg: svg({ bg: BG, mark: '' }) },
  'android-icon-monochrome.png': { size: 432, svg: svg({ mark: white }, { scale: 0.9 }), transparent: true },
  'splash-icon.png': { size: 1024, svg: svg({ mark: inner }, { scale: 1.0 }), transparent: true },
  'favicon.png': { size: 48, svg: svg({ bg: BG, mark: inner }, { scale: 1.25 }) },
};
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
for (const [name, v] of Object.entries(variants)) {
  const page = await (await b.newContext({ viewport: { width: v.size, height: v.size }, deviceScaleFactor: 1 })).newPage();
  await page.setContent(`<html><body style="margin:0;background:transparent">${v.svg.replace('width="1024" height="1024"', `width="${v.size}" height="${v.size}"`)}</body></html>`);
  await page.screenshot({ path: `${outDir}/${name}`, omitBackground: !!v.transparent });
  await page.close();
}
// Preview sheet: the icon at phone sizes, a round Android mask, and the splash.
const prev = await (await b.newContext({ viewport: { width: 900, height: 420 }, deviceScaleFactor: 1 })).newPage();
const img = (f) => 'data:image/png;base64,' + readFileSync(`${outDir}/${f}`).toString('base64');
await prev.setContent(`<html><body style="margin:0;background:#2b2f36;display:flex;gap:28px;align-items:center;padding:30px;font:14px system-ui;color:#ddd">
  <div><img src="${img('icon.png')}" width="220" style="border-radius:48px"><div>iOS 220</div></div>
  <div><div style="width:200px;height:200px;border-radius:50%;overflow:hidden;position:relative"><img src="${img('android-icon-background.png')}" width="200" style="position:absolute"><img src="${img('android-icon-foreground.png')}" width="200" style="position:absolute"></div><div>Android round</div></div>
  <div><img src="${img('icon.png')}" width="60" style="border-radius:14px"><div>60</div></div>
  <div style="background:#fff;padding:8px"><img src="${img('android-icon-monochrome.png')}" width="80" style="filter:invert(1)"><div style="color:#333">mono</div></div>
  <div><img src="${img('favicon.png')}" width="48"><div>48</div></div>
</body></html>`);
await prev.screenshot({ path: `${process.argv[3] ?? `${root}/brand`}/logo-preview.png` });
await b.close();
console.log('rendered', Object.keys(variants).join(', '));
