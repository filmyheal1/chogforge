"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Boot from "@/components/Boot";
import Nav from "@/components/Nav";
import MarketTicker from "@/components/MarketTicker";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Wall from "@/components/Wall";
import Rarity from "@/components/Rarity";
import Manifesto from "@/components/Manifesto";
import Footer from "@/components/Footer";
import StudioFooter from "@/components/StudioFooter";
import { enrich, type Chog, type EnrichedChog } from "@/lib/chog";
import "@/app/footer/footer.css";

export default function Site() {
  const [progress, setProgress] = useState(0);
  const [list, setList] = useState<EnrichedChog[] | null>(null);
  const [booted, setBooted] = useState(false);
  const started = useRef(0);

  useEffect(() => {
    let cancelled = false;
    started.current = Date.now();

    async function load() {
      const res = await fetch("/data/manifest.json");
      if (!res.ok || !res.body) throw new Error("manifest missing");
      const total = Number(res.headers.get("content-length")) || 1_400_000;
      const reader = res.body.getReader();
      let received = 0;
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (!cancelled) {
            setProgress(Math.min(0.97, received / total));
          }
        }
      }
      const combined = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      const raw = new TextDecoder().decode(combined);
      const parsed = JSON.parse(raw) as Chog[];
      if (cancelled) return;
      setProgress(1);
      setList(enrich(parsed));
    }

    load().catch((err) => {
      console.error(err);
      if (!cancelled) {
        setProgress(1);
        setList([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (progress >= 1 && list) {
      const elapsed = Date.now() - started.current;
      const wait = Math.max(0, 1400 - elapsed);
      const t = setTimeout(() => setBooted(true), wait);
      return () => clearTimeout(t);
    }
  }, [progress, list]);

  useEffect(() => {
    document.body.style.overflow = booted ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [booted]);

  return (
    <div className="grain relative">
      <AnimatePresence>
        {!booted && <Boot key="boot" progress={progress} ready={Boolean(list)} />}
      </AnimatePresence>
      <Nav ready={booted} />
      <MarketTicker />
      <main>
        <Hero ready={booted} chogs={list} />
        <Marquee />
        <Wall list={list} />
        <Rarity list={list} />
        <Manifesto />
      </main>
      <Footer />
      <StudioFooter />
    </div>
  );
}
