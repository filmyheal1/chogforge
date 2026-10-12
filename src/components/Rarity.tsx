"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import PixelImage from "@/components/PixelImage";
import { scarcestTrait, tierDistribution, type EnrichedChog } from "@/lib/chog";

const PALETTE = [
  "var(--color-ash)",
  "#7856ff",
  "#ff5c1a",
  "#ff7ab6",
  "var(--color-ink)",
  "#7ab6ff",
];

export default function Rarity({ list }: { list: EnrichedChog[] | null }) {
  const tiers = useMemo(
    () => (list ? tierDistribution(list) : []),
    [list],
  );
  const scarcest = useMemo(() => (list ? scarcestTrait(list) : null), [list]);
  const top = useMemo(
    () => (list ? [...list].sort((a, b) => a.rank - b.rank).slice(0, 12) : []),
    [list],
  );
  const total = list?.length ?? 1;

  const parts = useMemo(() => {
    const before = (i: number) =>
      tiers.slice(0, i).reduce((s, [, n]) => s + n, 0);
    return tiers.map(([t, n], i) => {
      const from = (before(i) / total) * 100;
      const to = (before(i + 1) / total) * 100;
      return { t, n, from, to, color: PALETTE[i % PALETTE.length] };
    });
  }, [tiers, total]);

  const gradient = `linear-gradient(90deg, ${parts
    .map((p) => `${p.color} ${p.from}% ${p.to}%`)
    .join(", ")})`;

  return (
    <section id="rarity" className="border-b border-line px-4 py-16 md:px-8 md:py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <span className="font-serif text-3xl italic text-purple">II</span>
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Rarity <span className="font-serif italic font-normal">&amp; tiers</span>
          </h2>
        </div>
        <p className="max-w-sm font-mono text-[11px] uppercase leading-relaxed tracking-widest text-ash">
          computed live from the 1,969 on-chain metadata files — every score
          recalculated in your browser.
        </p>
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-14">
        <div className="flex min-w-0 flex-col gap-6">
          <motion.div
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            whileInView={{ clipPath: "inset(0 0% 0 0)" }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-14 w-full overflow-hidden rounded-full border border-line"
            style={{ backgroundImage: gradient }}
          >
            {parts
              .filter((p) => p.to - p.from >= 9)
              .map((p) => (
                <span
                  key={p.t}
                  className="absolute top-1/2 font-mono text-[10px] uppercase tracking-widest text-white mix-blend-difference"
                  style={{
                    left: `${(p.from + p.to) / 2}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {p.t} {((p.n / total) * 100).toFixed(0)}%
                </span>
              ))}
          </motion.div>

          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
            {tiers.map(([t, n], i) => (
              <div
                key={t}
                className="flex min-w-0 items-center justify-between gap-2 bg-bone px-3 py-3"
              >
                <span className="flex min-w-0 items-center gap-2 truncate font-mono text-[10px] uppercase tracking-widest text-ash">
                  <i
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  {t}
                </span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums">
                  {n.toLocaleString()}
                </span>
              </div>
            ))}
            <div aria-hidden className="bg-bone" />
          </div>

          {scarcest && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="border border-line bg-bone-2/40 p-6"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">
                scarcest trait in the collection
              </span>
              <p className="mt-2 font-serif text-4xl italic leading-none text-purple md:text-5xl">
                {scarcest.value}
              </p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-ash">
                {scarcest.trait} — only {scarcest.n} of 1,969 chogs have it
              </p>
            </motion.div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ash">
            top 12 rarest
          </span>
          <div className="no-bar flex gap-3 overflow-x-auto pb-2">
            {top.map((c, i) => (
              <motion.a
                key={c.id}
                href={`#wall`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="group relative w-32 shrink-0 md:w-36"
              >
                <div className="relative overflow-hidden border border-line bg-bone-2">
                  <PixelImage
                    src={c.image}
                    fallback={c.imageFallback}
                    alt={c.name}
                    wrapperClassName="relative aspect-square w-full"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-1.5 top-1.5 bg-ink px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-bone">
                    #{c.rank}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-ash">
                  <span className="truncate">{c.name}</span>
                  <span className="text-purple">{c.Tier?.slice(0, 3)}</span>
                </div>
              </motion.a>
            ))}
          </div>

          <div className="mt-2 border-t border-line pt-4 font-mono text-[11px] leading-relaxed text-ash">
            rarity = Σ (1,969 ÷ trait frequency) across every trait your chog
            carries. low frequency → high score → rank #1.
          </div>
        </div>
      </div>
    </section>
  );
}
