"use client";

import { motion } from "framer-motion";

export default function Boot({
  progress,
  ready,
}: {
  progress: number;
  ready: boolean;
}) {
  const pct = Math.round(progress * 100);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-bone px-6 py-6 md:px-10 md:py-8"
      exit={{ y: "-100%" }}
      transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="flex items-start justify-between font-mono text-[11px] uppercase tracking-widest text-ash">
        <span>Chogforge / Exhibit Nº01</span>
        <span>Monad</span>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between">
          <h1 className="font-sans text-[16vw] font-semibold leading-[0.8] tracking-tighter md:text-[11vw]">
            CHOG<span className="text-purple">.</span>
          </h1>
          <span className="font-mono text-[13vw] leading-none tabular-nums text-ash md:text-[7vw]">
            {String(pct).padStart(3, "0")}
          </span>
        </div>

        <div className="h-px w-full bg-line">
          <motion.div
            className="h-px bg-purple"
            style={{ width: `${pct}%` }}
            transition={{ ease: "linear" }}
          />
        </div>

        <div className="flex justify-between font-mono text-[11px] uppercase tracking-widest text-ash">
          <span>
            {ready ? "forged — entering" : "forging 1,969 chogs"}
            <span className="ml-1 inline-block animate-pulse">▮</span>
          </span>
          <span>{pct}%</span>
        </div>
      </div>
    </motion.div>
  );
}
