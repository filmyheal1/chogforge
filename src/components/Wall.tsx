"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TRAIT_KEYS,
  openseaUrl,
  tierDistribution,
  type EnrichedChog,
} from "@/lib/chog";

import PixelImage from "@/components/PixelImage";

type SortMode = "id" | "rare";

function CellImage({
  chog,
  className,
  wrapperClassName,
}: {
  chog: EnrichedChog;
  className?: string;
  wrapperClassName?: string;
}) {
  return (
    <PixelImage
      src={chog.image}
      fallback={chog.imageFallback}
      alt={chog.name}
      className={className}
      wrapperClassName={wrapperClassName ?? "absolute inset-0"}
    />
  );
}

export default function Wall({ list }: { list: EnrichedChog[] | null }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("All");
  const [sort, setSort] = useState<SortMode>("id");
  const [selected, setSelected] = useState<EnrichedChog | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({
    width: 0,
    top: 0,
    scroll: 0,
    viewport: 900,
  });

  const tiers = useMemo(
    () => (list ? tierDistribution(list).map(([t]) => t) : []),
    [list],
  );

  const filtered = useMemo(() => {
    if (!list) return [];
    let out = list;
    if (tier !== "All") out = out.filter((c) => c.Tier === tier);
    const q = query.trim().toLowerCase();
    if (q) {
      const num = Number(q.replace(/\D/g, ""));
      out = out.filter((c) => {
        if (q && c.name.toLowerCase().includes(q)) return true;
        if (!Number.isNaN(num) && num > 0 && c.id === num) return true;
        return false;
      });
    }
    out =
      sort === "id"
        ? [...out].sort((a, b) => a.id - b.id)
        : [...out].sort((a, b) => a.rank - b.rank);
    return out;
  }, [list, query, tier, sort]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const measure = () => {
      const rect = wrap.getBoundingClientRect();
      setMetrics((m) => ({
        ...m,
        width: rect.width,
        top: rect.top + window.scrollY,
        viewport: window.innerHeight,
      }));
    };
    measure();

    const onScroll = () => {
      const rect = wrap.getBoundingClientRect();
      setMetrics((m) => ({
        ...m,
        scroll: window.scrollY,
        top: rect.top + window.scrollY,
        viewport: window.innerHeight,
      }));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => {
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  const cols = Math.max(2, Math.min(28, Math.floor(metrics.width / 75) || 6));
  const cell = metrics.width > 0 ? metrics.width / cols : 0;
  const rowCount = Math.ceil(filtered.length / cols);
  const totalHeight = rowCount * cell;

  const pad = cell * 3;
  const startRow = Math.max(
    0,
    Math.floor((metrics.scroll - metrics.top - pad) / (cell || 1)),
  );
  const endRow = Math.min(
    rowCount,
    Math.ceil(
      (metrics.scroll - metrics.top + metrics.viewport + pad) / (cell || 1),
    ),
  );
  const visible = filtered.slice(startRow * cols, endRow * cols);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <section id="wall" className="relative border-b border-line">
      <div className="sticky top-[59px] z-30 border-b border-line bg-bone/92 backdrop-blur-md">
        <div className="flex flex-col gap-3 px-4 py-4 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-baseline gap-4">
              <span className="font-serif text-3xl italic text-purple">I</span>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                The Wall
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-widest text-ash tabular-nums">
                {list
                  ? `${filtered.length} / ${list.length} shown`
                  : "loading…"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search id / name"
                className="w-40 rounded-full border border-line bg-transparent px-4 py-2 font-mono text-[11px] uppercase tracking-wider outline-none placeholder:text-ash focus:border-purple md:w-52"
              />
              <div className="flex overflow-hidden rounded-full border border-line">
                {(["id", "rare"] as SortMode[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                      sort === s
                        ? "bg-ink text-bone"
                        : "text-ash hover:text-ink"
                    }`}
                  >
                    {s === "id" ? "ID ↑" : "Rarest"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="no-bar flex gap-2 overflow-x-auto pb-1">
            {["All", ...tiers].map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  tier === t
                    ? "border-purple bg-purple text-white"
                    : "border-line text-ash hover:border-ink hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={wrapRef} className="relative w-full px-0">
        {!list && (
          <div className="grid grid-cols-3 gap-px bg-line p-px md:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="shimmer aspect-square animate-pulse bg-bone-2"
                style={{ animationDelay: `${(i % 6) * 0.1}s` }}
              />
            ))}
          </div>
        )}

        {list && (
          <div style={{ height: totalHeight }} className="relative">
            <div
              style={{
                position: "absolute",
                top: startRow * cell,
                left: 0,
                right: 0,
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {visible.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cell shimmer group relative cursor-crosshair overflow-hidden border-r border-b border-line outline-none"
                  style={{ height: cell }}
                  aria-label={`Open ${c.name}`}
                >
                  <CellImage
                    chog={c}
                    className="duotone absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-x-0 bottom-0 translate-y-full bg-ink/85 px-2 py-1.5 text-left backdrop-blur-sm transition-transform duration-300 group-hover:translate-y-0">
                    <div className="truncate font-mono text-[9px] uppercase tracking-widest text-bone">
                      {c.name}
                    </div>
                    <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-purple">
                      <span>{c.Tier}</span>
                      <span>#{c.rank}</span>
                    </div>
                  </div>
                  <span className="absolute left-1.5 top-1.5 font-mono text-[8px] tabular-nums text-ink/35 opacity-0 transition-opacity group-hover:opacity-100">
                    {c.id}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {list && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-24 text-center">
            <span className="font-serif text-5xl italic text-ash">404</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-ash">
              no chogs match that filter
            </span>
            <button
              onClick={() => {
                setQuery("");
                setTier("All");
              }}
              className="mt-2 rounded-full border border-ink/30 px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:border-ink"
            >
              reset filters
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="grid max-h-[90vh] w-full max-w-3xl grid-cols-1 overflow-y-auto border border-line bg-bone md:grid-cols-2"
            >
              <div className="relative border-b border-line md:border-b-0 md:border-r">
                <CellImage
                  chog={selected}
                  wrapperClassName="relative aspect-square w-full"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 bg-bone px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-purple">
                  rarity #{selected.rank}
                </span>
              </div>

              <div className="flex flex-col gap-4 p-5 md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight">
                      {selected.name}
                    </h3>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-ash">
                      {selected.Tier} · score {Math.round(selected.score)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ash hover:border-ink hover:text-ink"
                  >
                    esc ✕
                  </button>
                </div>

                <div className="border-t border-line">
                  {TRAIT_KEYS.filter((k) => selected[k]).map((k) => (
                    <div
                      key={k}
                      className="flex items-center justify-between border-b border-line py-2.5"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-widest text-ash">
                        {k}
                      </span>
                      <span className="text-right text-sm font-medium">
                        {String(selected[k])}
                      </span>
                    </div>
                  ))}
                </div>

                <a
                  href={openseaUrl(selected.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto block rounded-full bg-ink py-3 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-bone transition-colors hover:bg-purple"
                >
                  view on OpenSea ↗
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
