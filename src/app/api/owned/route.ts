const CONTRACT = "0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763";
const ENDPOINTS = ["https://rpc.monad.xyz", "https://rpc2.monad.xyz"];
const BATCH = 200;
const CONCURRENCY = 3;
const MAX_SUPPLY = 5000;
const MAX_ATTEMPTS = 6;
const CACHE_TTL = 120_000;

const cache = new Map<string, { ids: number[]; balance: number; supply: number; at: number }>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const balanceOf = (addr: string) =>
  "0x70a08231" + addr.slice(2).toLowerCase().padStart(64, "0");
const TOTAL_SUPPLY = "0x18160ddd";
const ownerOfData = (id: number) =>
  "0x6352211e" + id.toString(16).padStart(64, "0");

type RpcResp = { id?: number; result?: string; error?: { message?: string } };

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
      if (r.status === 429) {
        lastErr = new Error("rate limited");
        await sleep(400 * (attempt + 1));
        continue;
      }
      if (!r.ok) {
        lastErr = new Error(`rpc http ${r.status}`);
        await sleep(300);
        continue;
      }
      const j = (await r.json()) as RpcResp | RpcResp[] | null;
      if (j === null || j === undefined) {
        lastErr = new Error("bad rpc response");
        await sleep(300);
        continue;
      }
      if (!Array.isArray(j) && j.error) {
        lastErr = new Error(j.error.message || "rpc error");
        await sleep(300);
        continue;
      }
      if (Array.isArray(body) && !Array.isArray(j)) {
        lastErr = new Error("bad batch response");
        await sleep(300);
        continue;
      }
      return j;
    } catch (e) {
      lastErr = e;
      await sleep(300);
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
    if (hit && Date.now() - hit.at < CACHE_TTL) {
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
      if (cache.size > 500) cache.clear();
      cache.set(addr, { ids: [], balance: 0, supply: 0, at: Date.now() });
      return Response.json({ ids: [], balance: 0 });
    }

    const supply = Math.min(
      decodeUint(await single("eth_call", [{ to: CONTRACT, data: TOTAL_SUPPLY }, "latest"])),
      MAX_SUPPLY,
    );

    const ranges: [number, number][] = [];
    for (let s = 1; s <= supply; s += BATCH) {
      ranges.push([s, Math.min(s + BATCH - 1, supply)]);
    }

    const ids: number[] = [];
    let next = 0;
    let stop = false;

    const worker = async () => {
      while (!stop && next < ranges.length) {
        const [a, b] = ranges[next++];
        const batch = [] as {
          jsonrpc: string;
          id: number;
          method: string;
          params: unknown[];
        }[];
        for (let i = a; i <= b; i++) {
          batch.push({
            jsonrpc: "2.0",
            id: i,
            method: "eth_call",
            params: [{ to: CONTRACT, data: ownerOfData(i) }, "latest"],
          });
        }
        const res = await rpc(batch);
        if (!Array.isArray(res)) {
          throw new Error(res?.error?.message || "bad batch response");
        }
        for (const item of res) {
          if (item?.error || !item?.result || item.result === "0x") continue;
          if (decodeAddr(item.result) === addr) ids.push(Number(item.id));
        }
        if (ids.length >= balance) stop = true;
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    ids.sort((a, b) => a - b);
    if (cache.size > 500) cache.clear();
    cache.set(addr, { ids, balance, supply, at: Date.now() });
    return Response.json({ ids, balance, supply });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "lookup failed" },
      { status: 502 },
    );
  }
}

export const maxDuration = 30;
