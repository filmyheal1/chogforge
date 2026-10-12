import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:3100';
const variant = process.env.VARIANT || 'as-is';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

if (variant === 'no-filter') {
  await page.addStyleTag({ content: '*{filter:none!important;}' });
} else if (variant === 'no-motion') {
  await page.addStyleTag({
    content:
      '.grain::after,.marquee-track,.shimmer{animation:none!important;} *{transition:none!important;}',
  });
} else if (variant === 'no-both') {
  await page.addStyleTag({
    content:
      '*{filter:none!important;} .grain::after,.marquee-track{animation:none!important;} *{transition:none!important;}',
  });
}

await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
  document.querySelector('#wall')?.scrollIntoView();
});
await page.waitForTimeout(600);

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
        });
      }, 4000);
    }),
);
console.log(variant, JSON.stringify(stats));
await browser.close();
