'use client';

import { useEffect, useRef } from 'react';

const IMG = 1000;
const MAX_OFF = 12;
const ORBIT_PERIOD = 7041.667;

const EYES = [
  { cx: 414, cy: 349.5, frx: 62, fry: 74.5, drx: 50, dry: 62.5 },
  { cx: 824.5, cy: 501, frx: 92.5, fry: 96, drx: 80.5, dry: 84 },
];

const MID_X = (EYES[0].cx + EYES[1].cx) / 2;
const MID_Y = (EYES[0].cy + EYES[1].cy) / 2;

export default function ChogCharacter() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    let frame = 0;
    let disposed = false;
    let pointer: { x: number; y: number } | null = null;
    const mobile = window.matchMedia('(max-width: 700px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const draw = (ox: number, oy: number) => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.max(1, Math.round(rect.width * dpr));
      const H = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const k = Math.max(W / IMG, H / IMG);
      // Balance: contact column must clear the right eye's outline (top ~0.193W+8),
      // while the mouth/chin stay visible (image bottom >= 660).
      const contactMin = 0.193 * W + 8 - 388 * k;
      const mouthMax = H - 660 * k;
      const offY = Math.min(Math.max((contactMin + mouthMax) / 2, H - IMG * k), 0);
      const offX = (W - IMG * k) / 2;
      ctx.setTransform(k, 0, 0, k, offX, offY);
      ctx.drawImage(img, 0, 0);
      for (const e of EYES) {
        ctx.fillStyle = '#f2f2f2';
        ctx.beginPath();
        ctx.ellipse(e.cx, e.cy, e.frx, e.fry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.ellipse(e.cx + ox, e.cy + oy, e.drx, e.dry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    const drawPointer = () => {
      if (!pointer) {
        draw(0, 0);
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const scale = Math.max(rect.width / IMG, rect.height / IMG);
      const eyeX = rect.left + rect.width / 2 + (MID_X - IMG / 2) * scale;
      const eyeY = rect.top + rect.height / 2 + (MID_Y - IMG / 2) * scale;
      const dx = pointer.x - eyeX;
      const dy = pointer.y - eyeY;
      if (Math.hypot(dx, dy) <= 8) return;
      const angle = Math.atan2(dy, dx);
      draw(Math.cos(angle) * MAX_OFF, Math.sin(angle) * MAX_OFF);
    };

    const tick = () => {
      frame = 0;
      if (disposed) return;
      if (mobile.matches) {
        if (reduced.matches) {
          draw(0, 0);
          return;
        }
        const angle = ((performance.now() % ORBIT_PERIOD) / ORBIT_PERIOD) * Math.PI * 2;
        draw(Math.cos(angle) * MAX_OFF, Math.sin(angle) * MAX_OFF);
        schedule();
      } else {
        drawPointer();
      }
    };

    const schedule = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(tick);
    };

    const onPointer = (event: PointerEvent) => {
      if (mobile.matches) return;
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const onUpdate = () => {
      if (mobile.matches) return;
      schedule();
    };
    const onMedia = () => {
      schedule();
    };
    const ready = () => {
      schedule();
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('resize', onUpdate);
    window.addEventListener('scroll', onUpdate, { passive: true });
    mobile.addEventListener('change', onMedia);
    reduced.addEventListener('change', onMedia);
    img.addEventListener('load', ready);
    img.src = '/footer-chog.webp';
    if (img.complete && img.naturalWidth > 0) ready();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', onUpdate);
      window.removeEventListener('scroll', onUpdate);
      mobile.removeEventListener('change', onMedia);
      reduced.removeEventListener('change', onMedia);
      img.removeEventListener('load', ready);
    };
  }, []);

  return (
    <div className="bg" aria-hidden="true" ref={wrapRef}>
      <canvas ref={canvasRef} />
    </div>
  );
}
