import { chromium } from 'playwright';

const base = process.env.BASE || 'http://localhost:3100';
const browser = await chromium.launch();
const out = { errors: [] };

async function boot(page) {
  await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4500);
}

// 1. desktop light — hero + wall
let page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
pageErrors(page, out);
await boot(page);
out.darkAtStart = await page.evaluate(() => document.documentElement.classList.contains('dark'));
await page.screenshot({ path: 'refs/shots/dm-hero-light.png' });
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
  document.querySelector('#wall')?.scrollIntoView();
});
await page.waitForTimeout(1200);
out.wall = await page.evaluate(() => {
  const cells = document.querySelectorAll('.cell');
  const glints = document.querySelectorAll('.cell-glint');
  const img = document.querySelector('.cell .duotone');
  return {
    cells: cells.length,
    glints: glints.length,
    filter: img ? getComputedStyle(img).filter : 'none',
    glintDelay: glints[0] ? getComputedStyle(glints[0], '::before').animationDelay : null,
  };
});
await page.waitForTimeout(4400); // catch a glint cycle (5s, delay 0..-3.6s)
await page.screenshot({ path: 'refs/shots/dm-wall-light.png' });
await page.close();

// 2. desktop dark via system preference (tests no-flash script)
page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
pageErrors(page, out);
await boot(page);
out.darkSystem = await page.evaluate(() => document.documentElement.classList.contains('dark'));
await page.screenshot({ path: 'refs/shots/dm-hero-dark.png' });
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
  document.querySelector('#wall')?.scrollIntoView();
});
await page.waitForTimeout(1500);
await page.screenshot({ path: 'refs/shots/dm-wall-dark.png' });

// 3. toggle click
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
const toggle = page.locator('button[aria-label="Toggle dark mode"]');
await toggle.click();
await page.waitForTimeout(600);
out.afterToggle = await page.evaluate(() => ({
  dark: document.documentElement.classList.contains('dark'),
  stored: localStorage.getItem('chog-theme'),
}));
await page.close();

// 4. phone 390 — footer logo hidden
page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'light', isMobile: true, hasTouch: true });
pageErrors(page, out);
await boot(page);
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
  document.querySelector('.studio-footer-page')?.scrollIntoView();
});
await page.waitForTimeout(1500);
out.phoneLogo = await page.evaluate(() => {
  const logo = document.querySelector('.studio-footer-page .logo');
  return logo ? getComputedStyle(logo).display : 'MISSING';
});
await page.screenshot({ path: 'refs/shots/dm-footer-phone.png' });
// phone landscape 844 — logo must also be hidden
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(800);
out.phoneLandscapeLogo = await page.evaluate(() => {
  const logo = document.querySelector('.studio-footer-page .logo');
  return logo ? getComputedStyle(logo).display : 'MISSING';
});
await page.close();

console.log(JSON.stringify(out, null, 1));
await browser.close();

function pageErrors(p, o) {
  p.on('console', (m) => {
    if (m.type() === 'error') o.errors.push(m.text());
  });
  p.on('pageerror', (e) => o.errors.push(String(e)));
}
