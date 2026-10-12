"use client";

import { motion } from "framer-motion";
import PixelChog from "@/components/PixelChog";
import type { EnrichedChog } from "@/lib/chog";

const DEFAULT_IMAGE =
  "https://ipfs.filebase.io/ipfs/bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/100.webp";
const DEFAULT_FALLBACK =
  "https://gateway.pinata.cloud/ipfs/bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e/100.webp";

const STATS = [
  { k: "Supply", v: "1,969" },
  { k: "Owners", v: "1,012" },
  { k: "Chain", v: "Monad" },
  { k: "Traits", v: "14" },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const rise = {
  hidden: { y: "110%" },
  show: (i: number) => ({
    y: "0%",
    transition: { delay: 0.35 + i * 0.08, duration: 0.9, ease: EASE },
  }),
};

export default function Hero({
  ready,
  chogs,
}: {
  ready: boolean;
  chogs: EnrichedChog[] | null;
}) {
  const hero =
    chogs?.find((c) => c.Head === "Crown" && c.Tier && c.Tier !== "Common") ??
    chogs?.find((c) => c.Head === "Crown") ??
    chogs?.[99] ??
    null;

  const image = hero?.image ?? DEFAULT_IMAGE;
  const fallback = hero?.imageFallback ?? DEFAULT_FALLBACK;

  const lines = ["EVERY SINGLE", "CHOG", "ever forged"];

  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col justify-between overflow-hidden border-b border-line px-4 pb-6 pt-24 md:px-8 md:pt-28"
    >
      {/* vertical hairlines */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="absolute inset-y-0 left-1/4 w-px bg-line" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
        <div className="absolute inset-y-0 left-3/4 w-px bg-line" />
      </div>

      <div className="relative grid flex-1 items-center gap-10 md:grid-cols-2 md:gap-8">
        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={ready ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-ash md:text-[11px]"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-flame" />
            Exhibit Nº01 — the entire collection
          </motion.div>

          <h1 className="select-none text-[15vw] font-semibold leading-[0.86] tracking-[-0.04em] md:text-[7.2vw]">
            {lines.map((line, i) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  custom={i}
                  variants={rise}
                  initial="hidden"
                  animate={ready ? "show" : "hidden"}
                  className={
                    i === 1
                      ? "block text-purple"
                      : i === 2
                        ? "block font-serif text-[0.62em] font-normal italic tracking-normal text-ink"
                        : "block"
                  }
                >
                  {i === 1 ? (
                    <>
                      CHOG<span className="text-flame">.</span>
                    </>
                  ) : (
                    line
                  )}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.85, duration: 0.7 }}
            className="max-w-md font-mono text-[12px] leading-relaxed text-ash md:text-[13px]"
          >
            1,969 unique Chogs live on Monad. This exhibition pulls every
            image, every trait and every tier straight from the chain — the
            NFTs are the website.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1, duration: 0.7 }}
            className="flex flex-wrap items-center gap-3"
          >
            <a
              href="#wall"
              className="rounded-full bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-bone transition-colors hover:bg-purple"
            >
              Enter the wall ↓
            </a>
            <a
              href="https://opensea.io/collection/chog-genesis"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-ink/30 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-ink"
            >
              View collection ↗
            </a>
          </motion.div>

          <motion.a
            initial={{ opacity: 0, y: 16 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.15, duration: 0.7 }}
            href="https://opensea.io/token/monad/0x350035555e10d9afaf1566aaebfced5ba6c27777"
            target="_blank"
            rel="noreferrer"
            title="Open $CHOG on OpenSea"
            className="w-fit font-mono text-[11px] tracking-wide text-ash transition-colors hover:text-purple"
          >
            <span className="font-semibold text-purple">$CHOG</span>
            <span className="mx-1.5 text-ash/50">ca</span>
            <span className="break-all tabular-nums">
              0x350035555e10d9afaf1566aaebfced5ba6c27777
            </span>
            <span className="ml-1.5">↗</span>
          </motion.a>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={ready ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto w-full max-w-[520px]"
        >
          <div className="relative border border-line bg-bone-2/50 p-3">
            <div className="pointer-events-none absolute -top-2.5 left-3 bg-bone px-2 font-mono text-[10px] uppercase tracking-widest text-ash">
              {hero?.name ?? "CHOG #100"}
            </div>
            <div className="pointer-events-none absolute -top-2.5 right-3 bg-bone px-2 font-mono text-[10px] uppercase tracking-widest text-purple">
              live from chain
            </div>
            <PixelChog src={image} fallback={fallback} alt="Chog pixel dissolve" />
            <div className="pointer-events-none absolute -bottom-2.5 left-3 bg-bone px-2 font-mono text-[10px] uppercase tracking-widest text-ash">
              {hero?.Head ?? "Crown"} · {hero?.Tier ?? "—"}
            </div>
            <div className="pointer-events-none absolute -bottom-2.5 right-3 bg-bone px-2 font-mono text-[10px] uppercase tracking-widest text-ash">
              move cursor ✦
            </div>
          </div>
        </motion.div>
      </div>

      <div className="relative mt-8 grid grid-cols-2 gap-px border-t border-line pt-4 md:grid-cols-4">
        {STATS.map((s, i) => (
          <motion.div
            key={s.k}
            initial={{ opacity: 0, y: 10 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.1 + i * 0.07 }}
            className="flex items-baseline justify-between px-2 md:px-4"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ash">
              {s.k}
            </span>
            <span className="font-sans text-xl font-semibold tabular-nums md:text-2xl">
              {s.v}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
