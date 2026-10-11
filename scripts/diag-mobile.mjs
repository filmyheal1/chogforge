import { chromium } from "playwright";

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4000);
await p.evaluate(() => document.getElementById("wall")?.scrollIntoView());
await p.waitForTimeout(2500);
const info = await p.evaluate(() => {
  const wrap = document.querySelector("#wall .relative.w-full");
  const grid = [...document.querySelectorAll("#wall div")].find((d) =>
    d.style.gridTemplateColumns,
  );
  const btns = [...document.querySelectorAll("#wall button")]
    .slice(0, 8)
    .map((b) => {
      const r = b.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.width)];
    });
  return {
    wrapW: Math.round(wrap.getBoundingClientRect().width),
    gridCols: grid?.style.gridTemplateColumns,
    gridW: grid ? Math.round(grid.getBoundingClientRect().width) : null,
    btns,
    docScrollW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
  };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
