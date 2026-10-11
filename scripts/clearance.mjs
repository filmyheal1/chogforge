import { chromium } from 'playwright';
import sharp from 'sharp';

const base = process.env.BASE || 'http://localhost:3000';
const out = 'refs/shots';

async function check(browser, W, H, name) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(base + '/footer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const shot = `${out}/${name}.png`;
  await page.screenshot({ path: shot });
  const geo = await page.evaluate(() => {
    const c = document.querySelector('.contact').getBoundingClientRect();
    const note = document.querySelector('.note').getBoundingClientRect();
    const soc = document.querySelector('.socials').getBoundingClientRect();
    return { cb: c.bottom, nb: note.bottom, sb: soc.bottom, nx: note.x, nw: note.width };
  });
  await page.close();

  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  // right eye center on screen: img (823.7, 501), cover transform
  const k = Math.max(W, H) / 1000;
  const offX = (W - 1000 * k) / 2;
  const contactMin = 0.193 * W + 8 - 388 * k;
  const mouthMax = H - 660 * k;
  const offY = Math.min(Math.max((contactMin + mouthMax) / 2, H - 1000 * k), 0);
  const ex = Math.round(823.7 * k + offX);
  const ey = Math.round(501 * k + offY);
  // topmost dark pixel of eye outline near eye x-center, searching down from contact bottom
  let outlineTop = null;
  for (let y = Math.max(0, Math.floor(geo.cb) - 80); y < Math.min(info.height, ey + 300); y++) {
    let run = 0, best = 0;
    for (let dx = -30; dx <= 30; dx++) {
      const [r, g, b] = px(ex + dx, y);
      if (r < 60 && g < 60 && b < 60) { run++; if (run > best) best = run; } else run = 0;
    }
    if (best >= 35) { outlineTop = y; break; }
  }
  return { name, W, H, contactBottom: Math.round(geo.cb), noteBottom: Math.round(geo.nb), socialsBottom: Math.round(geo.sb), eyeCenter: [ex, ey], outlineTop, clearance: outlineTop === null ? 'no-outline-found' : outlineTop - Math.round(geo.sb) };
}

const browser = await chromium.launch();
for (const [W, H, name] of [[1920, 1080, 'f6-1920-v2'], [1440, 900, 'f7-1440-v2'], [1280, 800, 'f8-1280-v2']]) {
  console.log(JSON.stringify(await check(browser, W, H, name)));
}
await browser.close();
