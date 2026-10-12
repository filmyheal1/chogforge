const OS_URL = "https://opensea.io/collection/chog-genesis";
const TOKEN = "0x350035555e10d9afaf1566aaebfced5ba6c27777";
const DEX_URL = `https://api.dexscreener.com/latest/dex/tokens/${TOKEN}`;
const GT_POOL = "0x116e7d070f1888b81e1e0324f56d6746b2d7d8f1";
const GT_OHLCV = `https://api.geckoterminal.com/api/v2/networks/monad/pools/${GT_POOL}/ohlcv/hour?limit=48`;
const NFT_TTL = 300_000;
const CHOG_TTL = 60_000;
const CHART_TTL = 300_000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

type NftStats = {
  floorMon: number | null;
  floorUsd: number | null;
  change24h: number | null;
  vol24hUsd: number | null;
  totalVolUsd: number | null;
  supply: number | null;
};
type ChogStats = {
  priceUsd: number | null;
  change24h: number | null;
  vol24hUsd: number | null;
  mcapUsd: number | null;
};
type MarketSnapshot = {
  nft: NftStats | null;
  chog: ChogStats | null;
  chart: { points: [number, number][] } | null;
};

let nftCache: { data: NftStats; at: number } | null = null;
let chogCache: { data: ChogStats; at: number } | null = null;
let chartCache: { data: { points: [number, number][] }; at: number } | null = null;

const fresh = (at: number, ttl: number) => Date.now() - at < ttl;

async function fetchText(url: string, headers: Record<string, string>): Promise<string> {
  let lastErr: unknown = new Error("fetch failed");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, {
        headers,
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
      });
      if (!r.ok) throw new Error(`http ${r.status}`);
      return await r.text();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

const num = (v: string | undefined | null): number | null => {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function parseNft(html: string): NftStats {
  const floorMon = num(
    html.match(/"floorPrice":\{"pricePerItem":\{"token":\{"unit":(-?[\d.eE+]+)/)?.[1],
  );
  const floorUsd = num(
    html.match(/"floorPrice":\{"pricePerItem"[\s\S]{0,320}?"usd":(-?[\d.eE+]+)/)?.[1],
  );
  const change24h = num(html.match(/"oneDay":\{"floorPriceChange":(-?[\d.eE+]+)/)?.[1]);
  const vol24hUsd = num(
    html.match(/"oneDay":[\s\S]{0,420}?"volume":\{"usd":(-?[\d.eE+]+)/)?.[1],
  );
  const totalVolUsd = num(
    html.match(
      /"volume":\{"native":\{"unit":-?[\d.eE+]+,"__typename":"TokenPrice","symbol":"MON"\},"usd":(-?[\d.eE+]+)/,
    )?.[1],
  );
  const supply = num(html.match(/"totalSupply":(\d+)/)?.[1]);
  if (floorMon === null && floorUsd === null && totalVolUsd === null) {
    throw new Error("opensea stats not found");
  }
  return { floorMon, floorUsd, change24h, vol24hUsd, totalVolUsd, supply };
}

function parseChog(text: string): ChogStats {
  const j = JSON.parse(text) as {
    pairs?: {
      priceUsd?: string;
      priceChange?: { h24?: string };
      volume?: { h24?: number };
      marketCap?: number;
      fdv?: number;
      liquidity?: { usd?: number };
    }[];
  };
  const pairs = j.pairs || [];
  if (!pairs.length) throw new Error("no pairs");
  const main =
    [...pairs].sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0] || pairs[0];
  return {
    priceUsd: num(main.priceUsd),
    change24h: num(main.priceChange?.h24),
    vol24hUsd: main.volume?.h24 ?? null,
    mcapUsd: main.marketCap ?? main.fdv ?? null,
  };
}

function parseChart(text: string): { points: [number, number][] } {
  const j = JSON.parse(text) as {
    data?: { attributes?: { ohlcv_list?: [number, number, number, number, number, number][] } };
  };
  const list = j.data?.attributes?.ohlcv_list;
  if (!Array.isArray(list) || !list.length) throw new Error("no ohlcv");
  const points = list
    .map((c) => [c[0], c[4]] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  return { points };
}

async function getNft(): Promise<NftStats> {
  if (nftCache && fresh(nftCache.at, NFT_TTL)) return nftCache.data;
  const html = await fetchText(OS_URL, {
    "user-agent": UA,
    accept: "text/html,application/xhtml+xml",
  });
  const data = parseNft(html);
  nftCache = { data, at: Date.now() };
  return data;
}

async function getChog(): Promise<ChogStats> {
  if (chogCache && fresh(chogCache.at, CHOG_TTL)) return chogCache.data;
  const data = parseChog(await fetchText(DEX_URL, { accept: "application/json" }));
  chogCache = { data, at: Date.now() };
  return data;
}

async function getChart(): Promise<{ points: [number, number][] }> {
  if (chartCache && fresh(chartCache.at, CHART_TTL)) return chartCache.data;
  const data = parseChart(await fetchText(GT_OHLCV, { accept: "application/json", "user-agent": UA }));
  chartCache = { data, at: Date.now() };
  return data;
}

const safe = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
  try {
    return await fn();
  } catch {
    return null;
  }
};

export async function GET() {
  const [nft, chog, chart] = await Promise.all([
    safe(getNft),
    safe(getChog),
    safe(getChart),
  ]);
  const snap: MarketSnapshot = { nft, chog, chart };
  return Response.json(snap);
}

export const maxDuration = 30;
