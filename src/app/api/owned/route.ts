const CONTRACT = "0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763";
const MC3 = "0xcA11bde05977b3631167028862bE2a173976CA11";
const ENDPOINTS = ["https://rpc2.monad.xyz", "https://rpc.monad.xyz"];
const BATCH = 200;
const BATCH_GAP = 250;
const MC_CHUNK = 1000;
const MAX_SUPPLY = 5000;
const MAX_ATTEMPTS = 5;
const POSITIVE_TTL = 600_000;
const NEGATIVE_TTL = 60_000;
const CACHE_MAX = 500;

const cache = new Map<
  string,
  { ids: number[]; balance: number; supply: number; at: number; neg: boolean }
>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (attempt: number) => Math.min(1200 * 2 ** attempt, 7000);

const balanceOf = (addr: string) =>
  "0x70a08231" + addr.slice(2).toLowerCase().padStart(64, "0");
const TOTAL_SUPPLY = "0x18160ddd";
const ownerOfData = (id: number) =>
  "0x6352211e" + id.toString(16).padStart(64, "0");

type RpcResp = { id?: number; result?: string; error?: { message?: string } };

const REVERTISH =
  /revert|execution|not exist|nonexistent|non-existent|out of bounds|owner query/i;

async function rpc(body: unknown): Promise<RpcResp | RpcResp[]> {
  let lastErr: unknown = new Error("rpc unavailable");
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (r.status === 429 || r.status >= 500) {
        lastErr = new Error(r.status === 429 ? "rate limited" : `rpc http ${r.status}`);
        await sleep(backoff(attempt));
        continue;
      }
      if (!r.ok) {
        lastErr = new Error(`rpc http ${r.status}`);
        await sleep(backoff(attempt));
        continue;
      }
      const j = (await r.json()) as RpcResp | RpcResp[] | null;
      if (j === null || j === undefined) {
        lastErr = new Error("bad rpc response");
        await sleep(backoff(attempt));
        continue;
      }
      if (!Array.isArray(j) && j.error) {
        if (REVERTISH.test(j.error.message || "")) throw new Error(j.error.message || "reverted");
        lastErr = new Error(j.error.message || "rpc error");
        await sleep(backoff(attempt));
        continue;
      }
      if (Array.isArray(body) && !Array.isArray(j)) {
        lastErr = new Error("bad batch response");
        await sleep(backoff(attempt));
        continue;
      }
      return j;
    } catch (e) {
      if (e instanceof Error && REVERTISH.test(e.message)) throw e;
      lastErr = e;
      await sleep(backoff(attempt));
    }
  }
  throw lastErr;
}

async function single(method: string, params: unknown[]): Promise<string> {
  const j = await rpc({ jsonrpc: "2.0", id: 1, method, params });
  if (!j || Array.isArray(j) || !j.result) {
    throw new Error(
      (!Array.isArray(j) && j?.error?.message) || "bad rpc result",
    );
  }
  return j.result;
}

const encodeTryAggregate = (items: [string, string][]): string => {
  const n = items.length;
  const tails = items.map(([a, d]) => {
    const dataHex = d.replace(/^0x/, "");
    const dataLen = dataHex.length / 2;
    const padded = dataHex + "0".repeat((64 - (dataHex.length % 64)) % 64);
    return (
      a.slice(2).toLowerCase().padStart(64, "0") +
      (0x40).toString(16).padStart(64, "0") +
      dataLen.toString(16).padStart(64, "0") +
      padded
    );
  });
  let acc = n * 32;
  const heads = tails.map((t) => {
    const h = acc;
    acc += t.length / 2;
    return h.toString(16).padStart(64, "0");
  });
  return (
    "0xbce38bd7" +
    (0).toString(16).padStart(64, "0") +
    (0x40).toString(16).padStart(64, "0") +
    n.toString(16).padStart(64, "0") +
    heads.join("") +
    tails.join("")
  );
};

const decodeTryAggregate = (hex: string): { success: boolean; data: string }[] => {
  const w = (k: number) => hex.slice(k * 64, k * 64 + 64);
  const arrW = parseInt(w(0), 16) / 32;
  const len = parseInt(w(arrW), 16);
  const heads = arrW + 1;
  const out: { success: boolean; data: string }[] = [];
  for (let i = 0; i < len; i++) {
    const elem = heads + parseInt(w(heads + i), 16) / 32;
    const success = parseInt(w(elem), 16) === 1;
    const bytesOff = parseInt(w(elem + 1), 16) / 32;
    const lenW = elem + bytesOff;
    const retLen = parseInt(w(lenW), 16);
    const data = retLen
      ? hex.slice((lenW + 1) * 64, (lenW + 1) * 64 + retLen * 2)
      : "";
    out.push({ success, data });
  }
  return out;
};

async function multicallScan(supply: number, addr: string, balance: number): Promise<number[]> {
  const ids: number[] = [];
  let chunk = MC_CHUNK;
  let i = 1;
  while (i <= supply && ids.length < balance) {
    const part: number[] = [];
    for (let k = i; k <= supply && part.length < chunk; k++) part.push(k);
    try {
      const data = encodeTryAggregate(
        part.map((id) => [CONTRACT, ownerOfData(id)] as [string, string]),
      );
      const j = await rpc({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: MC3, data }, "latest"],
      });
      if (Array.isArray(j) || !j.result) throw new Error("bad multicall response");
      const parsed = decodeTryAggregate(j.result.slice(2));
      parsed.forEach((p, k) => {
        if (p.success && p.data.length >= 40) {
          const owner = ("0x" + p.data.slice(-40)).toLowerCase();
          if (owner === addr) ids.push(part[k]);
        }
      });
      i += part.length;
      if (i <= supply) await sleep(200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!REVERTISH.test(msg) || chunk <= 100) throw e;
      chunk = Math.max(100, Math.floor(chunk / 2));
    }
  }
  return ids;
}

async function ownerBatch(a: number, b: number): Promise<RpcResp[]> {
  const byId = new Map<number, RpcResp>();
  let pending: number[] = [];
  for (let i = a; i <= b; i++) pending.push(i);

  for (let round = 0; round < 6 && pending.length; round++) {
    const req = pending.map((id) => ({
      jsonrpc: "2.0",
      id,
      method: "eth_call",
      params: [{ to: CONTRACT, data: ownerOfData(id) }, "latest"],
    }));
    const res = await rpc(req);
    if (!Array.isArray(res)) throw new Error("bad batch response");
    const got = new Set(res.map((x) => x.id));
    const failed: number[] = [];
    for (const item of res) {
      if (item.error && !REVERTISH.test(item.error.message || "")) {
        failed.push(Number(item.id));
        continue;
      }
      if (!item.error && (!item.result || item.result === "0x")) {
        failed.push(Number(item.id));
        continue;
      }
      if (typeof item.id === "number") byId.set(item.id, item);
    }
    for (const id of pending) if (!got.has(id)) failed.push(id);
    pending = failed;
    if (pending.length) await sleep(1200);
  }
  if (pending.length) throw new Error("token scan incomplete — try again");

  const out: RpcResp[] = [];
  for (let i = a; i <= b; i++) {
    const item = byId.get(i);
    if (item) out.push(item);
  }
  return out;
}

async function legacyScan(supply: number, addr: string, balance: number): Promise<number[]> {
  const ids: number[] = [];
  for (let s = 1; s <= supply; s += BATCH) {
    const res = await ownerBatch(s, Math.min(s + BATCH - 1, supply));
    for (const item of res) {
      if (item.error || !item.result || item.result === "0x") continue;
      if (decodeAddr(item.result) === addr) ids.push(Number(item.id));
    }
    if (ids.length >= balance) break;
    await sleep(BATCH_GAP);
  }
  return ids;
}

const decodeUint = (hex: string) => Number(BigInt(hex));
const decodeAddr = (hex: string) => ("0x" + hex.slice(-40)).toLowerCase();

export async function POST(request: Request) {
  let address: string;
  try {
    address = (await request.json()).address;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return Response.json({ error: "bad address" }, { status: 400 });
  }
  const addr = address.toLowerCase();

  try {
    const hit = cache.get(addr);
    if (hit && Date.now() - hit.at < (hit.neg ? NEGATIVE_TTL : POSITIVE_TTL)) {
      return Response.json({
        ids: hit.ids,
        balance: hit.balance,
        supply: hit.supply,
        cached: true,
      });
    }

    const balance = decodeUint(
      await single("eth_call", [{ to: CONTRACT, data: balanceOf(addr) }, "latest"]),
    );
    if (balance === 0) {
      if (cache.size >= CACHE_MAX) cache.clear();
      cache.set(addr, {
        ids: [],
        balance: 0,
        supply: 0,
        at: Date.now(),
        neg: true,
      });
      return Response.json({ ids: [], balance: 0 });
    }

    const supply = Math.min(
      decodeUint(await single("eth_call", [{ to: CONTRACT, data: TOTAL_SUPPLY }, "latest"])),
      MAX_SUPPLY,
    );

    let ids: number[];
    try {
      ids = await multicallScan(supply, addr, balance);
    } catch {
      ids = await legacyScan(supply, addr, balance);
    }
    ids.sort((a, b) => a - b);

    if (ids.length === 0) throw new Error("scan found no tokens");

    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(addr, { ids, balance, supply, at: Date.now(), neg: false });
    return Response.json({ ids, balance, supply });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "lookup failed" },
      { status: 502 },
    );
  }
}

export const maxDuration = 60;
