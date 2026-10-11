import { chromium } from 'playwright';

const base = 'http://localhost:3000';
const out = 'refs/shots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);

const tokenLink = await page.evaluate(() => {
  const a = document.querySelector('a[aria-label*="DexScreener"]');
  return a ? a.href : 'missing';
});

await page.evaluate(() => document.querySelector('#wall')?.scrollIntoView());
await page.waitForTimeout(900);
const cell = page.locator('button.cell').first();
const box = await cell.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  await page.waitForTimeout(140);
  await page.screenshot({ path: `${out}/h1-pixel-hover.png` });
  await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2 - 18, { steps: 4 });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${out}/h2-pixel-stir.png` });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(900);
}

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1400);
await page.screenshot({ path: `${out}/h3-studio-footer.png` });

const info = await page.evaluate(() => {
  const sf = document.querySelector('.studio-footer-page');
  const logoA = document.querySelector('.studio-footer-page .logo a');
  const r = sf?.getBoundingClientRect();
  return {
    studioFooter: sf ? { top: Math.round(r.top + scrollY), h: Math.round(r.height), bg: getComputedStyle(sf).backgroundColor } : 'missing',
    logoHref: logoA ? logoA.href : 'missing',
    bodyBg: getComputedStyle(document.body).backgroundColor,
    scrollH: document.body.scrollHeight,
  };
});

const resp = await page.goto(base + '/footer');
const standalone = await page.evaluate(() => ({
  hasRouteWrap: Boolean(document.querySelector('.footer-route')),
  bodyBg: getComputedStyle(document.body).backgroundColor,
}));

console.log(JSON.stringify({ tokenLink, info, standalone, status: resp.status(), errors }, null, 1));
await browser.close();
