import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "data", "manifest.json");
const RPC = "https://rpc.monad.xyz";
const CONTRACT = "0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763";
const TOTAL = 1969;

const GATEWAYS = [
  "https://ipfs.filebase.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
];

const SIG_TOKEN_URI = "0xc87b56dd";

function toHexId(id) {
  return id.toString(16).padStart(64, "0");
}

async function rpcBatch(calls) {
  const body = calls.map((data, i) => ({
    jsonrpc: "2.0",
    id: i,
    method: "eth_call",
    params: [{ to: CONTRACT, data }, "latest"],
  }));
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`rpc http ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error("rpc did not return batch array");
  return json;
}

function decodeString(hex) {
  if (!hex || hex === "0x") return "";
  try {
    const off = parseInt(hex.slice(2, 66), 16) * 2 + 2;
    const len = parseInt(hex.slice(off, off + 64), 16) * 2;
    const data = hex.slice(off + 64, off + 64 + len);
    let out = "";
    for (let i = 0; i < data.length; i += 2) {
      out += String.fromCharCode(parseInt(data.slice(i, i + 2), 16));
    }
    return out;
  } catch {
    return "";
  }
}

async function fetchText(url, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`http ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchWithFallback(path) {
  let lastErr;
  for (let round = 0; round < 4; round++) {
    for (const gw of GATEWAYS) {
      try {
        return await fetchText(gw + path);
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 400 + round * 600));
      }
    }
  }
  throw lastErr;
}

async function pool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  return results;
}

async function getTokenUris() {
  const cachePath = join(ROOT, "scripts", "tokenuris.json");
  if (existsSync(cachePath)) {
    const cached = JSON.parse(readFileSync(cachePath, "utf8"));
    if (cached.length === TOTAL) {
      console.log(`tokenURIs: cache hit (${cached.length})`);
      return cached;
    }
  }
  const ids = Array.from({ length: TOTAL }, (_, i) => i + 1);
  const uris = new Array(TOTAL);
  const batchSize = 50;
  for (let start = 0; start < ids.length; start += batchSize) {
    const batch = ids.slice(start, start + batchSize);
    const calls = batch.map((id) => SIG_TOKEN_URI + toHexId(id));
    let json;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        json = await rpcBatch(calls);
        break;
      } catch (e) {
        console.log(`  rpc retry ${attempt + 1}: ${e.message}`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    if (!json) throw new Error(`rpc batch failed at id ${batch[0]}`);
    json.sort((a, b) => a.id - b.id);
    json.forEach((item, i) => {
      uris[batch[i] - 1] = decodeString(item.result);
    });
    process.stdout.write(`\r tokenURIs: ${batch[batch.length - 1]}/${TOTAL}`);
  }
  console.log();
  writeFileSync(cachePath, JSON.stringify(uris));
  return uris;
}

function uriToPath(uri) {
  if (!uri) return null;
  const m = uri.match(/ipfs:\/\/(.+)$/);
  if (!m) return null;
  return m[1];
}

function parseMetadata(raw) {
  const meta = JSON.parse(raw);
  const attrs = {};
  for (const a of meta.attributes || []) {
    attrs[a.trait_type] = a.value;
  }
  const imageMatch = String(meta.image || "").match(/ipfs:\/\/(.+)$/);
  return {
    name: meta.name || "",
    imagePath: imageMatch ? imageMatch[1] : null,
    attrs,
  };
}

async function main() {
  console.log("1/3 fetching tokenURIs from Monad...");
  const uris = await getTokenUris();

  const jobs = [];
  uris.forEach((uri, i) => {
    const path = uriToPath(uri);
    if (path) jobs.push({ tokenId: i + 1, path });
    else jobs.push({ tokenId: i + 1, path: null });
  });

  console.log("2/3 fetching metadata (1969 files)...");
  const cachePath = join(ROOT, "scripts", "metacache.json");
  const cache = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, "utf8"))
    : {};
  console.log(`  resume cache: ${Object.keys(cache).length} entries`);
  let done = 0;
  let failed = 0;
  let cachedHits = 0;
  const flush = () => writeFileSync(cachePath, JSON.stringify(cache));
  process.on("SIGINT", () => {
    flush();
    process.exit(130);
  });

  const entries = await pool(jobs, 6, async (job) => {
    if (!job.path) return null;
    if (cache[job.tokenId]) {
      cachedHits++;
      return cache[job.tokenId];
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const raw = await fetchWithFallback(job.path);
        const meta = parseMetadata(raw);
        const entry = {
          id: job.tokenId,
          name: meta.name,
          image: meta.imagePath
            ? "https://ipfs.filebase.io/ipfs/" + meta.imagePath
            : null,
          imageFallback: meta.imagePath
            ? "https://gateway.pinata.cloud/ipfs/" + meta.imagePath
            : null,
          ...meta.attrs,
        };
        cache[job.tokenId] = entry;
        done++;
        if (done % 50 === 0) {
          flush();
          process.stdout.write(`\r meta: ${done} new (cache ${cachedHits}) / ${jobs.length}`);
        }
        return entry;
      } catch (e) {
        if (attempt === 2) {
          failed++;
          console.log(`\n  meta fail #${job.tokenId}: ${e.message}`);
          return null;
        }
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    return null;
  });
  flush();

  console.log(`\n3/3 writing manifest... (ok=${entries.filter(Boolean).length} failed=${failed})`);
  const clean = entries.filter(Boolean);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(clean));
  const size = readFileSync(OUT).length;
  console.log(`done: ${clean.length} entries, ${(size / 1024).toFixed(0)} KB -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
