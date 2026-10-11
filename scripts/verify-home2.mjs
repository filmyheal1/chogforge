import { chromium } from 'playwright';

const base = 'http://localhost:3000';
const out = 'refs/shots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
});

// settle layout: overshoot-scroll to true max, twice
await page.evaluate(() => window.scrollTo(0, 1e9));
await page.waitForTimeout(600);
await page.evaluate(() => window.scrollTo(0, 1e9));
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/h5-studio-footer.png` });

const seam = await page.evaluate(() => {
  const max = document.documentElement.scrollHeight - innerHeight;
  window.scrollTo(0, Math.max(0, max - 830));
  return { max, y: Math.round(scrollY) };
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/h4-footer-seam.png` });

console.log(JSON.stringify({ seam, errors }, null, 1));
await browser.close();
