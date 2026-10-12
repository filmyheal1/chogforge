import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:3000';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
  document.querySelector('#wall')?.scrollIntoView();
});
await page.waitForTimeout(500);

const stats = await page.evaluate(
  () =>
    new Promise((res) => {
      const deltas = [];
      let last = performance.now();
      let stop = false;
      const f = (t) => {
        deltas.push(t - last);
        last = t;
        if (!stop) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
      let y = scrollY;
      const iv = setInterval(() => {
        y += 420;
        window.scrollTo(0, y);
        if (y > 24000) clearInterval(iv);
      }, 16);
      setTimeout(() => {
        stop = true;
        clearInterval(iv);
        const sorted = [...deltas].sort((a, b) => a - b);
        const q = (p) => Math.round(sorted[Math.floor(sorted.length * p)]);
        res({
          frames: sorted.length,
          median: q(0.5),
          p95: q(0.95),
          worst: Math.round(sorted[sorted.length - 1]),
          dropped: sorted.filter((d) => d > 34).length,
        });
      }, 4000);
    }),
);
console.log(JSON.stringify(stats));
await browser.close();
