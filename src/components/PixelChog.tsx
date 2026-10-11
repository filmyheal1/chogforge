"use client";

import { useEffect, useRef, useState } from "react";

type Particle = {
  tx: number;
  ty: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  delay: number;
  k: number;
};

const COLS = 64;

export default function PixelChog({
  src,
  fallback,
  alt,
}: {
  src: string;
  fallback?: string;
  alt: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let particles: Particle[] = [];
    let running = false;
    let start = 0;
    let width = 0;
    let height = 0;
    let cell = 0;
    const mouse = { x: -9999, y: -9999, active: false };

    function resize() {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = width / COLS;
    }

    function build(image: HTMLImageElement) {
      const cols = COLS;
      const rows = Math.max(1, Math.round(height / cell));
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(image, 0, 0, cols, rows);
      let data: Uint8ClampedArray;
      try {
        data = octx.getImageData(0, 0, cols, rows).data;
      } catch {
        return;
      }
      particles = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = (r * cols + c) * 4;
          const a = data[i + 3] / 255;
          if (a < 0.1) continue;
          const tx = c * cell;
          const ty = r * cell;
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.min(width, height) * (0.35 + Math.random() * 0.5);
          particles.push({
            tx,
            ty,
            x: tx + Math.cos(angle) * dist,
            y: ty + Math.sin(angle) * dist,
            vx: 0,
            vy: 0,
            color: `rgba(${data[i]},${data[i + 1]},${data[i + 2]},${a})`,
            delay: Math.random() * 0.55,
            k: 0.045 + Math.random() * 0.05,
          });
        }
      }
      if (reduced) {
        for (const p of particles) {
          p.x = p.tx;
          p.y = p.ty;
        }
      }
      start = performance.now();
      setLoaded(true);
    }

    function frame(now: number) {
      if (!running) return;
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);
      const radius = Math.max(48, cell * 7);
      for (const p of particles) {
        if (t < p.delay) continue;
        // spring toward target
        p.vx += (p.tx - p.x) * p.k;
        p.vy += (p.ty - p.y) * p.k;
        // cursor repulsion
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < radius && d > 0.01) {
            const f = (1 - d / radius) * 3.4;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, cell + 0.6, cell + 0.6);
      }
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      const rect = wrap.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    }
    function onLeave() {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function loadImage(url: string, isFallback = false) {
      const image = new Image();
      if (!isFallback) image.crossOrigin = "anonymous";
      image.onload = () => {
        resize();
        build(image);
        if (!running) {
          running = true;
          raf = requestAnimationFrame(frame);
        }
      };
      image.onerror = () => {
        if (!isFallback && fallback) loadImage(fallback, true);
      };
      image.src = url;
    }

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(wrap);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (particles.length && !running) {
            running = true;
            raf = requestAnimationFrame(frame);
          }
        } else {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.05 },
    );
    io.observe(wrap);

    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    loadImage(src);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, [src, fallback]);

  return (
    <div
      ref={wrapRef}
      className="relative aspect-square w-full cursor-crosshair"
      role="img"
      aria-label={alt}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="animate-pulse font-mono text-[10px] uppercase tracking-[0.3em] text-ash">
            forging pixels…
          </span>
        </div>
      )}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
