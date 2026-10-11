import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "refs/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 200));
});

await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/0-boot.png` });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/1-hero.png` });

await page.evaluate(() => {
  document.getElementById("wall")?.scrollIntoView();
});
await page.waitForTimeout(3500);
await page.screenshot({ path: `${OUT}/2-wall.png` });

await page.mouse.wheel(0, 1600);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/3-wall-scrolled.png` });

await page.evaluate(() => {
  document.getElementById("rarity")?.scrollIntoView();
});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/4-rarity.png` });

await page.evaluate(() => {
  document.getElementById("manifesto")?.scrollIntoView();
});
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/5-manifesto.png` });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await mobile.waitForTimeout(4500);
await mobile.screenshot({ path: `${OUT}/6-mobile-hero.png` });
await mobile.evaluate(() => document.getElementById("wall")?.scrollIntoView());
await mobile.waitForTimeout(3000);
await mobile.screenshot({ path: `${OUT}/7-mobile-wall.png` });
await mobile.evaluate(() => document.getElementById("rarity")?.scrollIntoView());
await mobile.waitForTimeout(3000);
await mobile.screenshot({ path: `${OUT}/8-mobile-rarity.png` });

await browser.close();
console.log("done");
