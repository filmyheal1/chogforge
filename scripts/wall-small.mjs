import { chromium } from 'playwright';

const base = 'http://localhost:3000';
const out = 'refs/shots';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
  document.querySelector('#wall')?.scrollIntoView();
});
await page.waitForTimeout(700);

const info = await page.evaluate(() => {
  const c = document.querySelector('button.cell')?.getBoundingClientRect();
  return {
    cell: c ? `${Math.round(c.width)}x${Math.round(c.height)}` : 'missing',
    cellsVisible: document.querySelectorAll('button.cell').length,
  };
});
await page.screenshot({ path: `${out}/w1-small-cells.png` });

const box = await page.locator('button.cell').nth(3).boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${out}/w2-small-hover.png` });
}
console.log(JSON.stringify({ info, errors }));
await browser.close();
