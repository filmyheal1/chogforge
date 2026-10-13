"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";

function subscribeDark(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("storage", onChange);
  return () => {
    obs.disconnect();
    window.removeEventListener("storage", onChange);
  };
}

const getDark = () => document.documentElement.classList.contains("dark");

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
  const [menu, setMenu] = useState(false);
  const dark = useSyncExternalStore(subscribeDark, getDark, () => false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSys = () => {
      if (localStorage.getItem("chog-theme")) return;
      document.documentElement.classList.toggle("dark", mq.matches);
    };
    mq.addEventListener("change", onSys);
    return () => mq.removeEventListener("change", onSys);
  }, []);

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("chog-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

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
        data-nav
        initial={{ y: -80, opacity: 0 }}
        animate={ready ? { y: 0, opacity: 1 } : {}}
        transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-line bg-bone px-4 py-4 md:px-8"
      >
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] hover:text-purple"
        >
          <img
            src="/chog-face.svg"
            alt=""
            aria-hidden="true"
            className="h-5 w-5 rounded-[5px]"
          />
          Chog<span className="text-purple">forge</span>
        </a>

        <nav className="hidden items-center gap-1 rounded-full border border-line bg-bone px-2 py-1.5 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={`rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
                active === l.id
                  ? "bg-ink text-bone"
                  : "text-ash hover:text-ink"
              }`}
            >
              {l.label}
            </a>
          ))}
          <a
            href="/studio"
            className="rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-purple transition-colors hover:bg-purple/10"
          >
            Your chog
          </a>
          <a
            href="https://opensea.io/collection/chog-genesis"
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-purple px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-85"
          >
            OpenSea ↗
          </a>
        </nav>

        <div className="flex items-center gap-1.5 md:gap-3">
          <a
            href="/studio"
            className="shrink-0 whitespace-nowrap rounded-full border border-purple/40 px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-purple transition-colors hover:bg-purple/10 md:hidden"
          >
            Your chog
          </a>
          <a
            href="https://opensea.io/collection/chog-genesis"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 whitespace-nowrap rounded-full bg-purple px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-white transition-opacity hover:opacity-85 md:hidden"
          >
            OpenSea ↗
          </a>
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ash transition-colors hover:border-ink hover:text-ink"
          >
            {dark ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setMenu((v) => !v)}
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ash transition-colors hover:border-ink hover:text-ink md:hidden"
          >
            {menu ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            )}
          </button>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-ash md:block">
            Monad · 1969
          </span>
        </div>
      </motion.header>

      {menu && (
        <div
          data-nav-menu
          className="fixed inset-x-0 top-[74px] z-40 border-b border-line bg-bone px-4 py-3 md:hidden"
        >
          <nav className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                onClick={() => setMenu(false)}
                className={`rounded-lg px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
                  active === l.id ? "bg-ink text-bone" : "text-ash hover:text-ink"
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      )}

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
