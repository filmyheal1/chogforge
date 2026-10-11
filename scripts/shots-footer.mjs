import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:3000';
const out = 'refs/shots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(base + '/footer', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/f1-desktop.png` });

await page.mouse.move(180, 780, { steps: 8 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/f2-gaze-downleft.png` });

await page.mouse.move(1260, 160, { steps: 8 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/f3-gaze-upright.png` });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/f4-mobile-390.png`, fullPage: true });

await page.setViewportSize({ width: 320, height: 700 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/f5-mobile-320.png`, fullPage: true });

const dims = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  innerW: window.innerWidth,
  title: document.title,
  lang: document.documentElement.lang,
  fonts: [...document.fonts].map((f) => f.family + ' ' + f.weight + ' ' + f.status),
}));
console.log(JSON.stringify(dims, null, 1));
console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
