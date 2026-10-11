import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3000/footer', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const boxes = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  };
  return {
    jobs: pick('.jobs'), tag: pick('.tag'), headline: pick('.headline'),
    nav: pick('.footer-nav'), logo: pick('.logo'), contact: pick('.contact'),
    note: pick('.note'), socials: pick('.socials'), bg: pick('.bg'),
    tagText: document.querySelector('.tag')?.textContent,
    headlineFont: getComputedStyle(document.querySelector('.headline')).fontFamily,
    noteSize: getComputedStyle(document.querySelector('.note')).fontSize,
  };
});
console.log('boxes', JSON.stringify(boxes, null, 1));

async function whiteCentroid(file, eye) {
  // visible white ring centroid: neutral-bright pixels near the eye.
  // Pupil covers part of the ring when offset, so white shifts opposite the pupil.
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, C = info.channels;
  let sx = 0, sy = 0, n = 0;
  for (let y = eye[1] - 80; y <= eye[1] + 80; y++) {
    for (let x = eye[0] - 80; x <= eye[0] + 80; x++) {
      if (x < 0 || y < 0 || x >= W || y >= info.height) continue;
      const i = (y * W + x) * C;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mn > 185 && mx - mn < 14) { sx += x; sy += y; n++; }
    }
  }
  return n ? [Math.round(sx / n), Math.round(sy / n), n] : null;
}

const LEFT = [Math.round(414 * 1.44), Math.round(349.5 * 1.44 - 270)];
const RIGHT = [Math.round(824.5 * 1.44), Math.round(501 * 1.44 - 270)];
console.log('expected eye screen centers L', LEFT, 'R', RIGHT);
for (const f of ['f1-desktop', 'f2-gaze-downleft', 'f3-gaze-upright']) {
  const L = await whiteCentroid('refs/shots/' + f + '.png', LEFT);
  const R = await whiteCentroid('refs/shots/' + f + '.png', RIGHT);
  console.log(f, 'L', L, 'R', R);
}
await browser.close();
