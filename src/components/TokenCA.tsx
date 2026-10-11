"use client";

import { useState } from "react";

const CHART =
  "https://dexscreener.com/monad/0x350035555e10d9afaf1566aaebfced5ba6c27777";

export default function TokenCA() {
  const [copied, setCopied] = useState(false);
  const ca = "0x350035555e10d9afaf1566aaebfced5ba6c27777";

  return (
    <div className="group flex max-w-full items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ash/70 transition-colors hover:text-purple">
      <span className="shrink-0 text-flame">$chog</span>
      <a
        href={CHART}
        target="_blank"
        rel="noreferrer"
        aria-label="View $CHOG chart on DexScreener"
        className="truncate underline decoration-dotted underline-offset-2 transition-colors hover:text-purple"
      >
        {ca} ↗
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(ca);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            setCopied(false);
          }
        }}
        className="shrink-0 text-ash/50 transition-colors group-hover:text-purple"
        aria-label={`Copy $CHOG contract address ${ca}`}
      >
        {copied ? "copied ✓" : "copy"}
      </button>
    </div>
  );
}
