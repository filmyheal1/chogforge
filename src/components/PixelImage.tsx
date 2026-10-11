"use client";

import { useEffect, useRef } from "react";

type Particle = {
  tx: number;
  ty: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
};

export default function PixelImage({
  src,
  fallback,
  alt,
  className,
  wrapperClassName = "relative aspect-square w-full",
}: {
  src?: string | null;
  fallback?: string | null;
  alt: string;
  className?: string;
  wrapperClassName?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !img || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let particles: Particle[] = [];
    let raf = 0;
    let running = false;
    let built = false;
    let w = 0;
    let h = 0;
    let cellX = 0;
    let cellY = 0;
    const ptr = { x: -9999, y: -9999, active: false };

    const build = () => {
      built = false;
      particles = [];
      if (!img.complete || !img.naturalWidth) return false;
      const rect = wrap.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (w < 4 || h < 4) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.max(12, Math.min(40, Math.round(w / 6)));
      const rows = Math.max(1, Math.round((h * cols) / w));
      cellX = w / cols;
      cellY = h / rows;
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return false;
      octx.drawImage(img, 0, 0, cols, rows);
      let data: Uint8ClampedArray;
      try {
        data = octx.getImageData(0, 0, cols, rows).data;
      } catch {
        return false;
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = (r * cols + c) * 4;
          if (data[i + 3] < 38) continue;
          particles.push({
            tx: c * cellX,
            ty: r * cellY,
            x: c * cellX,
            y: r * cellY,
            vx: 0,
            vy: 0,
            color: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
          });
        }
      }
      built = true;
      return true;
    };

    const frame = () => {
      if (!running) return;
      const radius = Math.max(30, cellX * 4.5);
      let settled = true;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.vx += (p.tx - p.x) * 0.055;
        p.vy += (p.ty - p.y) * 0.055;
        if (ptr.active) {
          const dx = p.x - ptr.x;
          const dy = p.y - ptr.y;
          const d = Math.hypot(dx, dy);
          if (d < radius && d > 0.01) {
            const f = (1 - d / radius) * 4.4;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }
        p.vx *= 0.84;
        p.vy *= 0.84;
        p.x += p.vx;
        p.y += p.vy;
        if (
          Math.abs(p.x - p.tx) > 0.35 ||
          Math.abs(p.y - p.ty) > 0.35 ||
          Math.abs(p.vx) > 0.06 ||
          Math.abs(p.vy) > 0.06
        ) {
          settled = false;
        }
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, cellX + 0.6, cellY + 0.6);
      }
      if (!ptr.active && settled) {
        running = false;
        ctx.clearRect(0, 0, w, h);
        canvas.style.opacity = "0";
        img.style.opacity = "";
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (reduced.matches) return;
      if (built) {
        const rect = wrap.getBoundingClientRect();
        if (Math.abs(rect.width - w) > 1 || Math.abs(rect.height - h) > 1) {
          if (!build()) return;
        }
      } else if (!build()) {
        return;
      }
      if (!running) {
        running = true;
        img.style.opacity = "0";
        canvas.style.opacity = "1";
        raf = requestAnimationFrame(frame);
      }
    };

    const track = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      ptr.x = e.clientX - rect.left;
      ptr.y = e.clientY - rect.top;
    };
    const onEnter = (e: PointerEvent) => {
      ptr.active = true;
      track(e);
      start();
    };
    const onMove = (e: PointerEvent) => {
      ptr.active = true;
      track(e);
    };
    const onDown = (e: PointerEvent) => {
      ptr.active = true;
      track(e);
      start();
    };
    const release = () => {
      ptr.active = false;
      ptr.x = -9999;
      ptr.y = -9999;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") release();
    };
    const onImgLoad = () => {
      built = false;
    };
    const ro = new ResizeObserver(() => {
      if (!running) built = false;
    });

    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointerleave", release);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", release);
    img.addEventListener("load", onImgLoad);
    ro.observe(wrap);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointerleave", release);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", release);
      img.removeEventListener("load", onImgLoad);
    };
  }, [src, fallback]);

  return (
    <div ref={wrapRef} className={wrapperClassName}>
      <img
        ref={imgRef}
        src={src ?? undefined}
        alt={alt}
        decoding="sync"
        className={className}
        onError={(e) => {
          const el = e.currentTarget;
          if (fallback && el.src !== fallback) {
            el.src = fallback;
          }
        }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ opacity: 0 }}
      />
    </div>
  );
}
