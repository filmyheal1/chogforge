import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3000/footer', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// midpoint-based cardinals around gaze origin (891,560) at 1440x900
const cardinals = [
  ['right', 1350, 560], ['down', 891, 880], ['left', 400, 560], ['up', 891, 60],
];
for (const [name, x, y] of cardinals) {
  await page.mouse.move(x, y, { steps: 6 });
  await page.waitForTimeout(450);
  const buf = await page.screenshot();
  const tmp = 'refs/shots/card-' + name + '.png';
  fs.writeFileSync(tmp, buf);
  const { data, info } = await sharp(tmp).raw().toBuffer({ resolveWithObject: true });
  // right eye pupil: box +-150 around (1186,560): contains pupil (~r118) but not outline
  let sx = 0, sy = 0, n = 0;
  for (let yy = 560 - 150; yy <= 560 + 150; yy++) {
    for (let xx = 1186 - 150; xx <= 1186 + 150; xx++) {
      const i = (yy * info.width + xx) * info.channels;
      if (data[i] < 60 && data[i + 1] < 60 && data[i + 2] < 60) { sx += xx; sy += yy; n++; }
    }
  }
  console.log(name, 'pupil@', Math.round(sx / n) + ',' + Math.round(sy / n), 'n=' + n);
}
console.log('neutral center is (1186,560); expect right:(>1186,560) down:(1186,>) left:(<1186,560) up:(1186,<560)');

// mobile geometry at 390
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(900);
const mob = await page.evaluate(() => {
  const order = ['.logo', '.jobs', '.contact', '.bg'].map((s) => {
    const el = document.querySelector(s);
    if (!el) return s + ':missing';
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return s + ' top=' + Math.round(r.top + scrollY) + ' w=' + Math.round(r.width) + ' order=' + cs.order + ' pos=' + cs.position;
  });
  const navs = [...document.querySelectorAll('.footer-nav span')].map((s) => {
    const r = s.getBoundingClientRect();
    return s.textContent + '@' + Math.round(r.left) + ',' + Math.round(r.top + scrollY);
  });
  return {
    order, navs,
    scrollW: document.documentElement.scrollWidth,
    bg: getComputedStyle(document.body).backgroundColor,
    bgBox: (() => { const r = document.querySelector('.bg').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; })(),
  };
});
console.log(JSON.stringify(mob, null, 1));
await browser.close();
