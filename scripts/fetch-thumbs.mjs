import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MANIFEST = join(ROOT, "public", "data", "manifest.json");
const OUT_DIR = join(ROOT, "public", "chogs");

const COOL_BACKUP = Date.now() + 600000;
const GATES = [
  { url: "https://ipfs.blockfrost.dev/ipfs/", coolUntil: 0 },
  { url: "https://gateway.pinata.cloud/ipfs/", coolUntil: COOL_BACKUP },
  { url: "https://ipfs.filebase.io/ipfs/", coolUntil: COOL_BACKUP },
];

mkdirSync(OUT_DIR, { recursive: true });

function remotePath(url) {
  const m = String(url).match(/\/ipfs\/(.+)$/);
  return m ? m[1] : null;
}

async function download(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.status === 429 || res.status === 403 || res.status === 520) {
      throw Object.assign(new Error(`http ${res.status}`), {
        rate: res.status === 429 || res.status === 403,
      });
    }
    if (!res.ok) throw new Error(`http ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(t);
  }
}

function pickGate() {
  const now = Date.now();
  const ready = GATES.filter((g) => g.coolUntil <= now);
  if (ready.length) return ready[Math.floor(Math.random() * ready.length)];
  return GATES.reduce((a, b) => (a.coolUntil <= b.coolUntil ? a : b));
}

async function fetchBuffer(path) {
  let err;
  for (let attempt = 0; attempt < 8; attempt++) {
    const gate = pickGate();
    try {
      return await download(gate.url + path);
    } catch (e) {
      err = e;
      if (e.rate) gate.coolUntil = Date.now() + 20000 + attempt * 5000;
      await new Promise((r) => setTimeout(r, 500 + attempt * 700));
    }
  }
  throw err;
}

async function pool(items, n, worker) {
  let i = 0;
  const runners = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const jobs = manifest.filter((c) => {
  const p = join(OUT_DIR, `${c.id}.webp`);
  return !(existsSync(p) && statSync(p).size > 1000);
});

console.log(`thumbs: ${jobs.length} to fetch (${manifest.length - jobs.length} cached)`);

let done = 0;
let failed = 0;
await pool(jobs, 8, async (c) => {
  const path = remotePath(c.image) ?? remotePath(c.imageFallback);
  if (!path) {
    failed++;
    return;
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const buf = await fetchBuffer(path);
      await sharp(buf)
        .resize(512, 512, { fit: "cover" })
        .webp({ quality: 72 })
        .toFile(join(OUT_DIR, `${c.id}.webp`));
      done++;
      if (done % 25 === 0) {
        console.log(` thumbs: ${done} / ${jobs.length} (failed ${failed})`);
      }
      return;
    } catch (e) {
      if (attempt === 2) {
        failed++;
        console.log(`\n  fail #${c.id}: ${e.message}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
});

console.log(`\nthumbs done: ok=${done} failed=${failed}`);

const rewritten = manifest.map((c) => {
  const local = join(OUT_DIR, `${c.id}.webp`);
  if (existsSync(local) && statSync(local).size > 1000) {
    return { ...c, image: `/chogs/${c.id}.webp` };
  }
  return c;
});
writeFileSync(MANIFEST, JSON.stringify(rewritten));
const localCount = rewritten.filter((c) => c.image.startsWith("/chogs/")).length;
console.log(`manifest rewritten: ${localCount}/${rewritten.length} local images`);
