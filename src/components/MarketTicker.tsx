"use client";

import { useEffect, useState } from "react";

type MarketSnapshot = {
  nft: {
    floorMon: number | null;
    floorUsd: number | null;
    change24h: number | null;
    vol24hUsd: number | null;
    totalVolUsd: number | null;
    supply: number | null;
  } | null;
  chog: {
    priceUsd: number | null;
    change24h: number | null;
    vol24hUsd: number | null;
    mcapUsd: number | null;
  } | null;
  chart: { points: [number, number][] } | null;
};

const fmtUsd = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}m`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(0)}k`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
};

const fmtPrice = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return "—";
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(5)}`;
};

const fmtNum = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : Math.round(n).toLocaleString("en-US");

const Change = ({ v }: { v: number | null | undefined }) => {
  if (v === null || v === undefined) return null;
  const up = v >= 0;
  return (
    <span className={up ? "text-purple" : "text-flame"}>
      {up ? "▲" : "▼"}
      {Math.abs(v).toFixed(1)}%
    </span>
  );
};

function Sparkline({ points }: { points: [number, number][] }) {
  if (points.length < 2) return null;
  const W = 132;
  const H = 22;
  const vals = points.map(([, v]) => v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const coords = points.map(([, v], i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - 2 - ((v - min) / span) * (H - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const up = vals[vals.length - 1] >= vals[0];
  const stroke = up ? "#7856ff" : "#ff5c1a";
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="shrink-0"
      aria-label="chog 48h price chart"
    >
      <polygon
        points={`0,${H} ${coords.join(" ")} ${W},${H}`}
        fill={stroke}
        opacity="0.12"
      />
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={coords.join(" ")} />
    </svg>
  );
}

export default function MarketTicker() {
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [navH, setNavH] = useState(76);

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("[data-nav]");
    if (!nav) return;
    const measure = () => setNavH(Math.ceil(nav.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/market")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (alive && j) setData(j as MarketSnapshot);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const nft = data?.nft;
  const chog = data?.chog;
  const chart = data?.chart;

  return (
    <div style={{ paddingTop: navH }}>
      <div className="border-b border-line bg-bone-2/40 font-mono text-[10px] uppercase tracking-widest text-ash">
        <div className="mx-auto flex max-w-7xl items-center gap-x-4 gap-y-1 overflow-x-auto whitespace-nowrap px-4 py-2 md:px-8">
        <span className="flex shrink-0 items-center gap-1.5 text-purple">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple" />
          live
        </span>

        <span className="shrink-0">
          floor{" "}
          <span className="text-ink">
            {nft ? `${fmtNum(nft.floorMon)} mon` : "—"}
          </span>
          {nft?.floorUsd !== null && nft?.floorUsd !== undefined && (
            <span className="text-ash"> · {fmtUsd(nft.floorUsd)}</span>
          )}
        </span>
        <Change v={nft?.change24h} />

        <span className="hidden shrink-0 sm:inline">
          24h vol <span className="text-ink">{fmtUsd(nft?.vol24hUsd)}</span>
        </span>
        <span className="hidden shrink-0 md:inline">
          total vol <span className="text-ink">{fmtUsd(nft?.totalVolUsd)}</span>
        </span>

        <span className="text-ash/50">|</span>

        <span className="shrink-0">
          $chog <span className="text-ink">{fmtPrice(chog?.priceUsd)}</span>
        </span>
        <Change v={chog?.change24h} />
        <span className="hidden shrink-0 sm:inline">
          vol <span className="text-ink">{fmtUsd(chog?.vol24hUsd)}</span>
        </span>
        <span className="hidden shrink-0 lg:inline">
          mcap <span className="text-ink">{fmtUsd(chog?.mcapUsd)}</span>
        </span>

        {chart && <Sparkline points={chart.points} />}
        </div>
      </div>
    </div>
  );
}
