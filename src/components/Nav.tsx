"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const LINKS = [
  { id: "wall", label: "Collection" },
  { id: "rarity", label: "Rarity" },
  { id: "manifesto", label: "Manifesto" },
];

const NUMERALS = [
  { id: "wall", n: "I" },
  { id: "rarity", n: "II" },
  { id: "manifesto", n: "III" },
];

export default function Nav({ ready }: { ready: boolean }) {
  const [active, setActive] = useState("wall");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    NUMERALS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ready]);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={ready ? { y: 0, opacity: 1 } : {}}
        transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-line bg-bone/85 px-4 py-4 backdrop-blur-md md:px-8"
      >
        <a
          href="#top"
          className="font-mono text-[11px] uppercase tracking-[0.2em] hover:text-purple"
        >
          Chog<span className="text-purple">forge</span>
        </a>

        <nav className="flex items-center gap-1 rounded-full border border-line bg-bone/70 px-2 py-1.5 backdrop-blur-md">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors md:text-[11px] ${
                active === l.id
                  ? "bg-ink text-bone"
                  : "text-ash hover:text-ink"
              }`}
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://opensea.io/collection/chog-genesis"
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-full bg-purple px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-85 md:block"
          >
            OpenSea ↗
          </a>
        </nav>

        <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-ash md:block">
          Monad · 1969
        </span>
      </motion.header>

      <div className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-6 md:flex">
        {NUMERALS.map(({ id, n }) => (
          <a
            key={id}
            href={`#${id}`}
            className={`font-serif text-2xl italic transition-all ${
              active === id
                ? "text-purple"
                : "text-ash/50 hover:text-ink"
            }`}
          >
            {n}
          </a>
        ))}
        <span className="h-16 w-px bg-line" />
      </div>
    </>
  );
}
