import { chromium } from "playwright";

const base = process.env.BASE || "http://localhost:3100";
const browser = await chromium.launch();
const out = { errors: [] };

function pageErrors(p) {
  p.on("console", (m) => {
    if (m.type() === "error") out.errors.push(m.text());
  });
  p.on("pageerror", (e) => out.errors.push(String(e)));
}

const stats = (page) =>
  page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return { missing: true };
    try {
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let clear = 0, opaque = 0, sum = 0;
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3];
        if (a < 10) clear++;
        else if (a > 245) opaque++;
        if ((i / 4) % 250 === 0) sum = (sum + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 1000000007;
      }
      return { w: c.width, h: c.height, clear, opaque, sum, tainted: false };
    } catch (e) {
      return { tainted: true, err: String(e) };
    }
  });

// ---------- API sanity ----------
{
  const p = await browser.newPage();
  pageErrors(p);
  await p.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  const rpc = await p.evaluate(() =>
    fetch("/api/rpc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: "eth_chainId", params: [] }),
    }).then((r) => r.json()),
  );
  out.apiRpcChainId = rpc.result;
  const manifest = await p.evaluate(() => fetch("/data/manifest.json").then((r) => r.json()));
  out.manifestCount = manifest.length;
  out.apiImg = await p.evaluate(
    (s) =>
      fetch(`/api/img?src=${encodeURIComponent(s)}`).then((r) => ({
        ok: r.ok,
        type: r.headers.get("content-type"),
      })),
    manifest[0].imageFallback,
  );
  out.apiOwned = await p.evaluate(() =>
    fetch("/api/owned", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: "0x3d38fee3e1a4c43d8fcf715aa6c9ff025074e7e0" }),
    }).then((r) => r.json()),
  );
  await p.close();
}

// ---------- home entries ----------
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  pageErrors(p);
  await p.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(3500);
  out.navStudio = await p.locator('header a[href="/studio"]:visible').isVisible().catch(() => false);
  out.footerStudio = await p.locator('footer a[href="/studio"]').count();
  await p.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector("#wall")?.scrollIntoView();
    window.scrollBy(0, 500);
  });
  await p.waitForTimeout(900);
  await p.locator(".cell").nth(20).click();
  await p.waitForTimeout(700);
  const edit = p.locator('a[href^="/studio?chog="]');
  out.modalEdit = await edit.count();
  out.modalEditHref = out.modalEdit ? await edit.getAttribute("href") : null;
  await p.screenshot({ path: "refs/shots/st-entry-modal.png" });
  await p.close();
}

// ---------- studio desktop ----------
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: "light" });
  pageErrors(p);
  await p.goto(base + "/studio", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(3000);
  out.studioCells = await p.locator("button.relative.aspect-square").count();
  await p.screenshot({ path: "refs/shots/st-light.png" });

  await p.locator("button.relative.aspect-square").first().click();
  await p.waitForFunction(() => document.body.textContent?.includes("· rank"), null, { timeout: 30000 });
  await p.waitForTimeout(1200);
  out.sourceLine = await p.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((x) => x.textContent.includes("· rank"));
    return el ? el.textContent.trim() : null;
  });
  out.canvasBase = await stats(p);

  // text on
  await p.evaluate(() => {
    const rows = [...document.querySelectorAll("div.flex.items-center.justify-between")];
    rows.find((r) => r.querySelector("span")?.textContent?.trim() === "text")
      ?.querySelector("button")
      ?.click();
  });
  await p.waitForTimeout(300);
  await p.locator('input[placeholder="your text"]').fill("CHOG FOREVER");
  await p.waitForTimeout(700);
  out.canvasText = await stats(p);
  out.textChanged = out.canvasText.sum !== out.canvasBase.sum;

  // ring on
  await p.evaluate(() => {
    const rows = [...document.querySelectorAll("div.flex.items-center.justify-between")];
    rows.find((r) => r.querySelector("span")?.textContent?.trim() === "ring frame")
      ?.querySelector("button")
      ?.click();
  });
  await p.waitForTimeout(700);
  out.canvasRing = await stats(p);
  out.ringChanged = out.canvasRing.sum !== out.canvasText.sum;

  // preset header
  await p.getByRole("button", { name: /x header/i }).click();
  await p.waitForTimeout(500);
  out.headerCanvas = await stats(p);
  await p.screenshot({ path: "refs/shots/st-header.png" });

  // back to pfp + download
  await p.getByRole("button", { name: /pfp 1080/i }).click();
  await p.waitForTimeout(500);
  const [dl] = await Promise.all([
    p.waitForEvent("download", { timeout: 20000 }),
    p.getByRole("button", { name: /download png/i }).click(),
  ]);
  out.downloadName = dl.suggestedFilename();
  await dl.cancel();

  // stickers
  out.stickerButtons = await p.locator('button[aria-label^="add sticker"]').count();
  await p.locator('button[aria-label="add sticker 🔥"]').click();
  await p.waitForTimeout(600);
  const stickerBase = await stats(p);
  out.stickerChanged = stickerBase.sum !== out.canvasBase.sum;
  const cbox = await p.locator("canvas").boundingBox();
  await p.mouse.move(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2);
  await p.mouse.down();
  await p.mouse.move(cbox.x + cbox.width / 2 + 50, cbox.y + cbox.height / 2 - 40, { steps: 6 });
  await p.mouse.up();
  await p.waitForTimeout(600);
  const stickerDrag = await stats(p);
  out.stickerDragChanged = stickerDrag.sum !== stickerBase.sum;
  await p.locator('input[aria-label="sticker size"]').fill("30");
  await p.waitForTimeout(600);
  const stickerBig = await stats(p);
  out.stickerResizeChanged = stickerBig.sum !== stickerDrag.sum;
  await p.screenshot({ path: "refs/shots/st-sticker.png" });
  const preRemove = await stats(p);
  out.removeBtnVisible = await p.getByRole("button", { name: /remove selected/i }).isVisible().catch(() => false);
  await p.getByRole("button", { name: /remove selected/i }).click();
  await p.waitForTimeout(600);
  const postRemove = await stats(p);
  out.stickerCleared = postRemove.sum !== preRemove.sum;
  out.preRemoveSum = preRemove.sum;
  out.postRemoveSum = postRemove.sum;
  out.removeBtnGone = await p
    .getByRole("button", { name: /remove selected/i })
    .isVisible()
    .then((v) => !v)
    .catch(() => true);

  // draw tool
  const drawRow = p
    .locator("div.flex.items-center.justify-between")
    .filter({ hasText: "draw" });
  const drawBtn = drawRow.locator("button");
  out.drawLabelOff = (await drawBtn.textContent())?.trim() === "off";
  const preToggle = await stats(p);
  await drawBtn.click();
  await p.waitForTimeout(300);
  out.drawSwatches = await p.locator('button[aria-label^="draw color"]').count();
  out.drawSlider = await p.locator('input[aria-label="draw size"]').isVisible().catch(() => false);
  const preDraw = await stats(p);
  out.drawToggleNoChange = preDraw.sum === preToggle.sum;
  await p.locator("canvas").scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  const cbox2 = await p.locator("canvas").boundingBox();
  await p.mouse.move(cbox2.x + 60, cbox2.y + 60);
  await p.mouse.down();
  await p.mouse.move(cbox2.x + 120, cbox2.y + 90, { steps: 8 });
  await p.mouse.move(cbox2.x + 190, cbox2.y + 55, { steps: 8 });
  await p.mouse.up();
  await p.waitForTimeout(600);
  const drawn = await stats(p);
  out.drawChanged = drawn.sum !== preDraw.sum;
  out.drawClearEnabled = await p
    .getByRole("button", { name: /clear strokes/i })
    .isEnabled()
    .catch(() => false);
  if (out.drawClearEnabled) {
    await p.getByRole("button", { name: /clear strokes/i }).click();
    await p.waitForTimeout(600);
    out.drawCleared = (await stats(p)).sum === preDraw.sum;
    await p.mouse.move(cbox2.x + 90, cbox2.y + 220);
    await p.mouse.down();
    await p.mouse.move(cbox2.x + 230, cbox2.y + 260, { steps: 10 });
    await p.mouse.up();
    await p.waitForTimeout(500);
    out.drawUndoEnabled = await p.getByRole("button", { name: /undo stroke/i }).isEnabled().catch(() => false);
    await p.getByRole("button", { name: /undo stroke/i }).click();
    await p.waitForTimeout(600);
    out.drawUndoRestored = (await stats(p)).sum === preDraw.sum;
  } else {
    out.errors.push("draw: stroke was not registered by pointer gesture");
  }
  out.drawStillOn = (await drawBtn.textContent())?.trim() === "on";
  await p.screenshot({ path: "refs/shots/st-draw.png" });
  await drawBtn.click();
  await p.waitForTimeout(200);
  out.drawOffLabel = (await drawBtn.textContent())?.trim() === "off";

  // remove bg at default tolerance
  await p.getByRole("button", { name: /remove bg/i }).click();
  await p.waitForTimeout(3000);
  out.removeDefault = await stats(p);
  out.removeDefaultClear = out.removeDefault.clear;

  // pixel mode
  const pxRow = p
    .locator("div.flex.items-center.justify-between")
    .filter({ hasText: "pixel mode" });
  const pxBtn = pxRow.locator("button");
  out.pixelLabelOff = (await pxBtn.textContent())?.trim() === "off";
  await pxBtn.click();
  await p.waitForTimeout(800);
  const pixelOn = await stats(p);
  out.pixelChanged = pixelOn.sum !== out.removeDefault.sum;
  out.pixelLabelOn = (await pxBtn.textContent())?.trim() === "on";
  out.pixelSlider = await p.locator('input[aria-label="pixel size"]').isVisible().catch(() => false);
  await p.screenshot({ path: "refs/shots/st-pixel.png" });
  await pxBtn.click();
  await p.waitForTimeout(600);
  out.pixelOffRestored = (await stats(p)).sum === out.removeDefault.sum;

  // print button present + popup opens
  out.printBtn = await p
    .getByRole("button", { name: /print/i })
    .isVisible()
    .catch(() => false);
  const [popup] = await Promise.all([
    p.waitForEvent("popup", { timeout: 8000 }).catch(() => null),
    p.getByRole("button", { name: /print/i }).click(),
  ]);
  out.printPopup = Boolean(popup);
  if (popup) await popup.close();
  if (out.removeDefaultClear < 500) {
    await p.locator('input[aria-label="background removal tolerance"]').evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, 140);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
    });
    await p.waitForTimeout(3500);
    out.removeHigh = await stats(p);
    out.removeHighClear = out.removeHigh.clear;
  }
  await p.screenshot({ path: "refs/shots/st-removed-bg.png" });

  // wallet tab (textContent — CSS uppercase affects innerText)
  await p.getByRole("button", { name: "my wallet" }).click();
  await p.locator('input[placeholder="0x… wallet address"]').fill("0x3d38fee3e1a4c43d8fcf715aa6c9ff025074e7e0");
  await p.getByRole("button", { name: /find my chogs/i }).click();
  await p.waitForFunction(
    () => /chog(s)? in this wallet|no chog genesis|couldn't read the chain/i.test(document.body.textContent || ""),
    null,
    { timeout: 60000 },
  );
  out.walletMsg = await p.evaluate(() => {
    const m = (document.body.textContent || "").match(/.{0,4}chog(s)? in this wallet|no chog genesis[^A-Z]*|couldn't read the chain/i);
    return m ? m[0].trim() : null;
  });
  out.walletCells = await p.locator("button.relative.aspect-square").count();
  if (out.walletCells > 0) {
    await p.locator("button.relative.aspect-square").first().click();
    await p.waitForFunction(
      () => (document.body.textContent || "").includes("yours"),
      null,
      { timeout: 30000 },
    );
    out.yoursBadge = await p.evaluate(() => (document.body.textContent || "").includes("yours"));
  }
  await p.screenshot({ path: "refs/shots/st-wallet.png" });

  // token id tab
  await p.getByRole("button", { name: "token id" }).click();
  await p.locator('input[placeholder*="token id"]').fill("1");
  await p.getByRole("button", { name: "load", exact: true }).click();
  await p.waitForFunction(
    () =>
      [...document.querySelectorAll("p")].some((x) => x.textContent.includes("#1 ·")),
    null,
    { timeout: 15000 },
  ).catch(() => {});
  out.idSource = await p.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((x) => x.textContent.includes("· rank"));
    return el ? el.textContent.trim() : null;
  });
  await p.close();
}

// ---------- deep link + dark ----------
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: "dark" });
  pageErrors(p);
  await p.goto(base + "/studio?chog=5", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForFunction(() => document.body.textContent?.includes("#5 ·"), null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  out.deepLink = await p.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((x) => x.textContent.includes("· rank"));
    return el ? el.textContent.trim() : null;
  });
  out.darkStudio = await p.evaluate(() => document.documentElement.classList.contains("dark"));
  out.canvasDeepLink = await stats(p);
  await p.screenshot({ path: "refs/shots/st-dark.png" });
  await p.close();
}

// ---------- phone ----------
{
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  pageErrors(p);
  await p.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(3000);
  out.phoneNavStudio = await p.locator('header a[href="/studio"]:visible').isVisible().catch(() => false);
  out.phoneNavOpenSea = await p
    .locator('header a[href*="opensea"]:visible')
    .first()
    .isVisible()
    .catch(() => false);
  out.phoneNavFits = await p.evaluate(() => {
    const h = document.querySelector("[data-nav]");
    if (!h) return false;
    const vis = [...h.querySelectorAll("a,button,nav")].filter((el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    });
    const allFit = vis.every((el) => {
      const b = el.getBoundingClientRect();
      return b.left >= -0.5 && b.right <= window.innerWidth + 0.5;
    });
    let ordered = true;
    for (let i = 1; i < vis.length; i++) {
      const prev = vis[i - 1].getBoundingClientRect();
      const cur = vis[i].getBoundingClientRect();
      if (prev.right > cur.left + 0.5) ordered = false;
    }
    return allFit && ordered && document.documentElement.scrollWidth <= window.innerWidth;
  });
  await p.getByRole("button", { name: "Open menu" }).click();
  out.phoneMenuOpen = await p.locator("[data-nav-menu]").isVisible().catch(() => false);
  out.phoneMenuLinks = await p.locator("[data-nav-menu] a").count();
  await p.screenshot({ path: "refs/shots/m-nav.png" });
  await p.getByRole("button", { name: "Close menu" }).click();
  out.phoneMenuClosed = (await p.locator("[data-nav-menu]").count()) === 0;
  out.phoneFooterHug = await p.evaluate(() => {
    const f = document.querySelector("footer.studio-footer-page");
    if (!f) return null;
    return Math.round(f.getBoundingClientRect().height) < window.innerHeight * 0.75;
  });
  await p.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, document.body.scrollHeight);
  });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: "refs/shots/m-bottom.png" });
  await p.goto(base + "/studio", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: "refs/shots/st-phone.png" });
  out.phoneOk = await p.locator("button.relative.aspect-square").count();
  await p.close();
}

console.log(JSON.stringify(out, null, 1));
await browser.close();
