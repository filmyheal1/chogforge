import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:3100';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3200);
const link = await page.evaluate(() => {
  const a = document.querySelector('a[title="Open $CHOG on OpenSea"]');
  return a ? { href: a.href, text: a.innerText.replace(/\s+/g, ' ') } : null;
});
await page.screenshot({ path: 'refs/shots/hero-ca-link.png' });
console.log(JSON.stringify(link));
await browser.close();
