"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { enrich, type Chog, type EnrichedChog } from "@/lib/chog";
import { findOwnedChogs, isAddress, verifyOwner } from "@/lib/studio";

const BG_SWATCHES = [
  "transparent",
  "#efe9e1",
  "#131110",
  "#7856ff",
  "#ff5c1a",
  "#ff7ab6",
  "#ffffff",
];
const RING_SWATCHES = ["#131110", "#efe9e1", "#7856ff", "#ff5c1a", "#ffffff"];
const TEXT_SWATCHES = ["#ffffff", "#131110", "#7856ff", "#ff7ab6", "#ff5c1a"];

type Preset = "pfp" | "header";
type Tab = "pick" | "wallet" | "id";

type EditorState = {
  removeBg: boolean;
  tolerance: number;
  bg: string;
  textOn: boolean;
  text: string;
  textSize: number;
  textColor: string;
  textPos: "top" | "bottom";
  ringOn: boolean;
  ringColor: string;
  ringW: number;
};

const DEFAULT_EDITOR: EditorState = {
  removeBg: false,
  tolerance: 45,
  bg: "transparent",
  textOn: false,
  text: "MY CHOG",
  textSize: 8,
  textColor: "#ffffff",
  textPos: "bottom",
  ringOn: false,
  ringColor: "#7856ff",
  ringW: 18,
};

function loadImage(src: string, fallback?: string | null): Promise<HTMLImageElement> {
  const attempt = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("load failed"));
      i.src = url;
    });
  return attempt(src).catch(() =>
    attempt(`/api/img?src=${encodeURIComponent(src)}`).catch(() => {
      if (!fallback) throw new Error("load failed");
      return attempt(fallback);
    }),
  );
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  sw: number,
  sh: number,
  W: number,
  H: number,
) {
  const scale = Math.max(W / sw, H / sh);
  const w = sw * scale;
  const h = sh * scale;
  ctx.drawImage(src, (W - w) / 2, (H - h) / 2, w, h);
}

function removeBackground(
  img: HTMLImageElement,
  tol: number,
): HTMLCanvasElement {
  const SIZE = 1024;
  const c = document.createElement("canvas");
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#00000000";
  drawCover(ctx, img, img.naturalWidth, img.naturalHeight, SIZE, SIZE);

  const { data, width: w, height: h } = ctx.getImageData(0, 0, SIZE, SIZE);
  const visited = new Uint8Array(w * h);
  const seed = [
    (data[0] + data[(w - 1) * 4] + data[(h - 1) * w * 4] + data[(h * w - 1) * 4]) / 4,
    (data[1] + data[(w - 1) * 4 + 1] + data[(h - 1) * w * 4 + 1] + data[(h * w - 1) * 4 + 1]) / 4,
    (data[2] + data[(w - 1) * 4 + 2] + data[(h - 1) * w * 4 + 2] + data[(h * w - 1) * 4 + 2]) / 4,
  ];
  const step = Math.max(6, tol * 0.35);
  const dist = (i: number, r: number, g: number, b: number) =>
    Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);

  const stack: number[] = [];
  const parents: number[] = [];
  const push = (x: number, y: number, pr: number, pg: number, pb: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (visited[i]) return;
    stack.push(i);
    parents.push(pr, pg, pb);
  };

  for (let x = 0; x < w; x++) {
    const t = x * 4;
    const b = ((h - 1) * w + x) * 4;
    push(x, 0, data[t], data[t + 1], data[t + 2]);
    push(x, h - 1, data[b], data[b + 1], data[b + 2]);
  }
  for (let y = 0; y < h; y++) {
    const l = y * w * 4;
    const r = (y * w + (w - 1)) * 4;
    push(0, y, data[l], data[l + 1], data[l + 2]);
    push(w - 1, y, data[r], data[r + 1], data[r + 2]);
  }

  while (stack.length) {
    const i = stack.pop()!;
    const pr = parents.pop()!;
    const pg = parents.pop()!;
    const pb = parents.pop()!;
    if (visited[i]) continue;
    visited[i] = 1;
    const toSeed = dist(i * 4, seed[0], seed[1], seed[2]);
    const toParent = dist(i * 4, pr, pg, pb);
    if (toSeed > tol && toParent > step) continue;
    data[i * 4 + 3] = 0;
    const x = i % w;
    const y = (i / w) | 0;
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    push(x + 1, y, r, g, b);
    push(x - 1, y, r, g, b);
    push(x, y + 1, r, g, b);
    push(x, y - 1, r, g, b);
  }

  ctx.putImageData(new ImageData(data, w, h), 0, 0);
  return c;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  preset: Preset,
  src: HTMLImageElement | HTMLCanvasElement,
  sw: number,
  sh: number,
  ed: EditorState,
) {
  ctx.clearRect(0, 0, W, H);
  if (ed.bg !== "transparent") {
    ctx.fillStyle = ed.bg;
    ctx.fillRect(0, 0, W, H);
  }
  const text = ed.text.trim() || "MY CHOG";

  if (preset === "pfp") {
    drawCover(ctx, src, sw, sh, W, H);
    if (ed.ringOn) {
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, W / 2 - 10 - ed.ringW / 2, 0, Math.PI * 2);
      ctx.lineWidth = ed.ringW;
      ctx.strokeStyle = ed.ringColor;
      ctx.stroke();
    }
    if (ed.textOn) {
      const font = Math.max(16, Math.round((ed.textSize / 100) * W));
      ctx.font = `700 ${font}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = font * 0.2;
      ctx.lineJoin = "round";
      ctx.lineWidth = font * 0.08;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.fillStyle = ed.textColor;
      ctx.strokeText(text, W / 2, ed.textPos === "top" ? H * 0.12 : H * 0.88, W * 0.9);
      ctx.fillText(text, W / 2, ed.textPos === "top" ? H * 0.12 : H * 0.88, W * 0.9);
      ctx.shadowBlur = 0;
    }
    return;
  }

  const s = H * 0.84;
  const x = W - s - 48;
  const y = (H - s) / 2;
  ctx.drawImage(src, x, y, s, s);
  if (ed.ringOn) {
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2 - 6 - ed.ringW / 2, 0, Math.PI * 2);
    ctx.lineWidth = ed.ringW;
    ctx.strokeStyle = ed.ringColor;
    ctx.stroke();
  }
  if (ed.textOn) {
    const font = Math.round((ed.textSize / 100) * H * 1.6);
    ctx.font = `700 ${font}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = font * 0.15;
    ctx.lineJoin = "round";
    ctx.lineWidth = font * 0.08;
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.fillStyle = ed.textColor;
    ctx.strokeText(text, 56, H / 2 - font * 0.1, W - s - 130);
    ctx.fillText(text, 56, H / 2 - font * 0.1, W - s - 130);
    ctx.shadowBlur = 0;
    ctx.font = `500 ${Math.round(font * 0.22)}px ui-monospace, monospace`;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = ed.textColor;
    ctx.fillText("CHOG GENESIS · MONAD", 58, H / 2 + font * 0.62);
    ctx.globalAlpha = 1;
  }
}

export default function Studio() {
  const [list, setList] = useState<EnrichedChog[] | null>(null);
  const [tab, setTab] = useState<Tab>("pick");
  const [query, setQuery] = useState("");
  const [address, setAddress] = useState("");
  const [owned, setOwned] = useState<number[] | null>(null);
  const [walletMsg, setWalletMsg] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const [idInput, setIdInput] = useState("");
  const [idMsg, setIdMsg] = useState("");
  const [owns, setOwns] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<EnrichedChog | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgMsg, setImgMsg] = useState("");
  const [ed, setEd] = useState<EditorState>(DEFAULT_EDITOR);
  const [preset, setPreset] = useState<Preset>("pfp");
  const [tolDraft, setTolDraft] = useState(DEFAULT_EDITOR.tolerance);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadToken = useRef(0);

  const pick = (c: EnrichedChog) => {
    const token = ++loadToken.current;
    if (c.id !== selected?.id) setOwns(null);
    setSelected(c);
    setImg(null);
    setImgMsg("loading image…");
    if (!c.image) {
      setImgMsg("this chog has no image");
      return;
    }
    loadImage(c.image, c.imageFallback ?? null)
      .then((i) => {
        if (loadToken.current !== token) return;
        setImg(i);
        setImgMsg("");
      })
      .catch(() => {
        if (loadToken.current !== token) setImgMsg("image failed to load");
      });
  };

  useEffect(() => {
    let dead = false;
    fetch("/data/manifest.json")
      .then((r) => r.json())
      .then((raw: Chog[]) => {
        if (dead) return;
        const l = enrich(raw);
        setList(l);
        const id = Number(new URLSearchParams(window.location.search).get("chog"));
        const c = id ? l.find((x) => x.id === id) : undefined;
        if (c) pick(c);
      })
      .catch(() => {
        if (!dead) setList([]);
      });
    return () => {
      dead = true;
    };
    // pick is intentionally captured once: the manifest (and url param) load exactly once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected || !isAddress(address)) return;
    let dead = false;
    verifyOwner(selected.id, address)
      .then((ok) => {
        if (!dead) setOwns(ok);
      })
      .catch(() => {
        if (!dead) setOwns(null);
      });
    return () => {
      dead = true;
    };
  }, [selected, address]);

  const masked = useMemo(() => {
    if (!img) return null;
    if (!ed.removeBg) return img;
    return removeBackground(img, ed.tolerance);
  }, [img, ed.removeBg, ed.tolerance]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const [W, H] = preset === "pfp" ? [1080, 1080] : [1500, 500];
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    if (!masked) {
      ctx.clearRect(0, 0, W, H);
      return;
    }
    const sw =
      masked instanceof HTMLImageElement ? masked.naturalWidth : masked.width;
    const sh =
      masked instanceof HTMLImageElement ? masked.naturalHeight : masked.height;
    drawScene(ctx, W, H, preset, masked, sw, sh, ed);
  }, [masked, preset, ed]);

  const results = useMemo(() => {
    if (!list) return [];
    const q = query.trim().toLowerCase();
    if (!q) return list.slice(0, 36);
    const num = Number(q.replace(/\D/g, ""));
    return list
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (!Number.isNaN(num) && num > 0 && c.id === num),
      )
      .slice(0, 36);
  }, [list, query]);

  const ownedItems = useMemo(() => {
    if (!owned || !list) return [];
    return owned
      .map((id) => list.find((c) => c.id === id))
      .filter((c): c is EnrichedChog => Boolean(c));
  }, [owned, list]);

  const findWallet = async () => {
    if (!isAddress(address)) {
      setWalletMsg("that doesn't look like a 0x address");
      return;
    }
    setWalletBusy(true);
    setWalletMsg("");
    try {
      const ids = await findOwnedChogs(address);
      setOwned(ids);
      setWalletMsg(
        ids.length
          ? `${ids.length} chog${ids.length > 1 ? "s" : ""} in this wallet`
          : "no chog genesis nfts found in this wallet",
      );
    } catch {
      setWalletMsg("couldn't read the chain — try again or use token id");
    } finally {
      setWalletBusy(false);
    }
  };

  const loadById = () => {
    const id = Number(idInput.replace(/\D/g, ""));
    if (!list || !id) {
      setIdMsg("enter a token id");
      return;
    }
    const c = list.find((x) => x.id === id);
    if (!c) {
      setIdMsg(`no chog #${id} in the collection`);
      return;
    }
    setIdMsg("");
    pick(c);
  };

  const download = async () => {
    const c = canvasRef.current;
    if (!c || !selected) return;
    setDownloading(true);
    try {
      const blob = await new Promise<Blob | null>((res) =>
        c.toBlob((b) => res(b), "image/png"),
      );
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chog-${selected.id}-${preset === "pfp" ? "pfp" : "x-header"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const set = <K extends keyof EditorState>(k: K, v: EditorState[K]) =>
    setEd((s) => ({ ...s, [k]: v }));

  const tabBtn = (t: Tab, label: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={`rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
        tab === t
          ? "border-purple bg-purple text-white"
          : "border-line text-ash hover:border-ink hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  const chogGrid = (items: EnrichedChog[], fit = false) => (
    <div
      className={
        fit
          ? "flex w-fit max-w-full flex-wrap"
          : "grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))]"
      }
    >
      {items.map((c) => (
        <button
          key={c.id}
          onClick={() => pick(c)}
          title={c.name}
          className={`relative aspect-square border border-line bg-bone outline-none transition-opacity hover:opacity-80 ${
            fit ? "w-16 shrink-0" : "min-w-16"
          } ${selected?.id === c.id ? "border-purple ring-1 ring-purple" : ""}`}
        >
          {c.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.image}
              alt={c.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
        </button>
      ))}
    </div>
  );

  const label = "font-mono text-[10px] uppercase tracking-widest text-ash";
  const inputCls =
    "rounded-full border border-line bg-transparent px-4 py-2 font-mono text-[11px] outline-none focus:border-purple";

  return (
    <div className="min-h-screen bg-bone text-ink">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bone px-4 py-3 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] hover:text-purple"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/chog-face.svg" alt="" className="h-5 w-5 rounded-[5px]" />
          Chog<span className="text-purple">forge</span>
        </Link>
        <Link
          href="/#wall"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-ash hover:text-purple"
        >
          the wall ↗
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <span className="font-serif text-3xl italic text-purple">✎</span>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Edit <span className="font-serif italic font-normal">your chog</span>
            </h1>
          </div>
          <p className="max-w-sm font-mono text-[11px] uppercase leading-relaxed tracking-widest text-ash">
            restyle any chog — drop the background, add text, frame it — then
            download a pfp or x header. read-only: paste an address, never
            connect a wallet.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {tabBtn("pick", "pick a chog")}
          {tabBtn("wallet", "my wallet")}
          {tabBtn("id", "token id")}
          {owns === true ? (
            <span className="rounded-full border border-purple px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-purple">
              yours ✓
            </span>
          ) : null}
        </div>

        <div className="mt-4 border border-line bg-bone-2/30 p-4">
          {tab === "pick" && (
            <div className="flex flex-col gap-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search id / name"
                className={inputCls + " w-full md:w-72"}
              />
              {list === null ? (
                <span className={label}>loading collection…</span>
              ) : (
                chogGrid(results)
              )}
            </div>
          )}

          {tab === "wallet" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setOwns(null);
                  }}
                  placeholder="0x… wallet address"
                  spellCheck={false}
                  className={inputCls + " min-w-0 flex-1 md:w-96"}
                />
                <button
                  onClick={findWallet}
                  disabled={walletBusy}
                  className="rounded-full bg-ink px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bone transition-colors hover:bg-purple disabled:opacity-50"
                >
                  {walletBusy ? "reading chain…" : "find my chogs"}
                </button>
              </div>
              {walletMsg && <span className={label}>{walletMsg}</span>}
              {ownedItems.length > 0 && chogGrid(ownedItems, true)}
            </div>
          )}

          {tab === "id" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadById()}
                placeholder="token id (1 – 1969)"
                inputMode="numeric"
                className={inputCls + " w-48"}
              />
              <button
                onClick={loadById}
                className="rounded-full bg-ink px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bone transition-colors hover:bg-purple"
              >
                load
              </button>
              {idMsg && <span className={label}>{idMsg}</span>}
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center justify-center overflow-hidden border border-line p-4"
              style={{
                background:
                  "repeating-conic-gradient(#00000012 0% 25%, transparent 0% 50%) 0 0 / 18px 18px",
              }}
            >
              <canvas
                ref={canvasRef}
                className={
                  preset === "pfp"
                    ? "h-[400px] w-[400px] max-w-full"
                    : "w-full max-w-[700px]"
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPreset("pfp")}
                className={`rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-widest ${
                  preset === "pfp"
                    ? "border-purple bg-purple text-white"
                    : "border-line text-ash hover:border-ink hover:text-ink"
                }`}
              >
                pfp 1080²
              </button>
              <button
                onClick={() => setPreset("header")}
                className={`rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-widest ${
                  preset === "header"
                    ? "border-purple bg-purple text-white"
                    : "border-line text-ash hover:border-ink hover:text-ink"
                }`}
              >
                x header 1500×500
              </button>
              <button
                onClick={download}
                disabled={!selected || !img || downloading}
                className="ml-auto rounded-full bg-ink px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bone transition-colors hover:bg-purple disabled:opacity-40"
              >
                {downloading ? "exporting…" : "download png ↓"}
              </button>
            </div>
            {!selected && (
              <span className={label}>
                pick a chog above to start editing
              </span>
            )}
            {selected && imgMsg && <span className={label}>{imgMsg}</span>}
          </div>

          <div className="flex flex-col gap-6 border border-line p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className={label}>background</span>
                <button
                  onClick={() => set("removeBg", !ed.removeBg)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
                    ed.removeBg
                      ? "border-purple bg-purple text-white"
                      : "border-line text-ash hover:border-ink hover:text-ink"
                  }`}
                >
                  remove bg
                </button>
              </div>
              {ed.removeBg && (
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={8}
                    max={160}
                    value={tolDraft}
                    onChange={(e) => setTolDraft(Number(e.target.value))}
                    onPointerUp={() => set("tolerance", tolDraft)}
                    onKeyUp={() => set("tolerance", tolDraft)}
                    className="w-full accent-purple"
                    aria-label="background removal tolerance"
                  />
                  <span className="font-mono text-[10px] tabular-nums text-ash">
                    {tolDraft}
                  </span>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                {BG_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => set("bg", c)}
                    aria-label={`background ${c}`}
                    className={`h-7 w-7 rounded-full border-2 ${
                      ed.bg === c ? "border-purple" : "border-line"
                    } ${
                      c === "transparent"
                        ? "bg-[repeating-conic-gradient(#00000022_0%_25%,transparent_0%_50%)]"
                        : ""
                    }`}
                    style={c === "transparent" ? undefined : { background: c }}
                  />
                ))}
                <input
                  type="color"
                  value={ed.bg === "transparent" ? "#efe9e1" : ed.bg}
                  onChange={(e) => set("bg", e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded-full border border-line"
                  aria-label="custom background color"
                />
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <span className={label}>text</span>
                <button
                  onClick={() => set("textOn", !ed.textOn)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
                    ed.textOn
                      ? "border-purple bg-purple text-white"
                      : "border-line text-ash hover:border-ink hover:text-ink"
                  }`}
                >
                  {ed.textOn ? "on" : "off"}
                </button>
              </div>
              {ed.textOn && (
                <div className="mt-3 flex flex-col gap-3">
                  <input
                    value={ed.text}
                    onChange={(e) => set("text", e.target.value)}
                    placeholder="your text"
                    maxLength={28}
                    className={inputCls + " w-full"}
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={4}
                      max={16}
                      value={ed.textSize}
                      onChange={(e) => set("textSize", Number(e.target.value))}
                      className="w-full accent-purple"
                      aria-label="text size"
                    />
                    <div className="flex gap-1.5">
                      {TEXT_SWATCHES.map((c) => (
                        <button
                          key={c}
                          onClick={() => set("textColor", c)}
                          aria-label={`text color ${c}`}
                          className={`h-6 w-6 rounded-full border-2 ${
                            ed.textColor === c ? "border-purple" : "border-line"
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                  {preset === "pfp" && (
                    <div className="flex gap-2">
                      {(["top", "bottom"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => set("textPos", p)}
                          className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
                            ed.textPos === p
                              ? "border-purple text-purple"
                              : "border-line text-ash"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <span className={label}>ring frame</span>
                <button
                  onClick={() => set("ringOn", !ed.ringOn)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
                    ed.ringOn
                      ? "border-purple bg-purple text-white"
                      : "border-line text-ash hover:border-ink hover:text-ink"
                  }`}
                >
                  {ed.ringOn ? "on" : "off"}
                </button>
              </div>
              {ed.ringOn && (
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={6}
                    max={48}
                    value={ed.ringW}
                    onChange={(e) => set("ringW", Number(e.target.value))}
                    className="w-full accent-purple"
                    aria-label="ring width"
                  />
                  <div className="flex gap-1.5">
                    {RING_SWATCHES.map((c) => (
                      <button
                        key={c}
                        onClick={() => set("ringColor", c)}
                        aria-label={`ring color ${c}`}
                        className={`h-6 w-6 rounded-full border-2 ${
                          ed.ringColor === c ? "border-purple" : "border-line"
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setEd(DEFAULT_EDITOR);
                setTolDraft(DEFAULT_EDITOR.tolerance);
              }}
              className="mt-1 self-start rounded-full border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-ash hover:border-ink hover:text-ink"
            >
              reset edits
            </button>

            <div className="border-t border-line pt-4">
              <span className={label}>source</span>
              <p className="mt-2 font-mono text-[11px] text-ash">
                {selected
                  ? `#${selected.id} · ${selected.name} · rank #${selected.rank}`
                  : "none selected"}
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-line px-4 py-6 text-center font-mono text-[10px] uppercase tracking-widest text-ash md:px-8">
        chogforge pfp studio · your edits stay in your browser · nothing is
        uploaded
      </footer>
    </div>
  );
}
