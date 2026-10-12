import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:3100';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3200);
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, document.body.scrollHeight);
});
await page.waitForTimeout(1500);
const home = await page.evaluate(() => {
  const f = document.querySelector('.studio-footer-page');
  return {
    footerText: f ? f.innerText.trim() : 'MISSING',
    linkedin: Boolean(document.querySelector('img[src*="linkedin"]')),
  };
});
await page.screenshot({ path: 'refs/shots/f-clean-home.png' });

await page.goto(base + '/footer', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const route = await page.evaluate(() => {
  const f = document.querySelector('.studio-footer-page');
  return {
    footerText: f ? f.innerText.trim() : 'MISSING',
    linkedin: Boolean(document.querySelector('img[src*="linkedin"]')),
  };
});
await page.screenshot({ path: 'refs/shots/f-clean-route.png' });

console.log(JSON.stringify({ home, route, errors }, null, 1));
await browser.close();
