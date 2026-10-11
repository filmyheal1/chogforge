# Chogforge

**A live exhibition of all 1,969 Chog Genesis NFTs where every image, trait and rarity rank is pulled straight from the collection's own metadata.**

Chogforge is the Chog Genesis collection turned into an interactive museum — the NFTs aren't content on the site, they're the whole site.

## What it is

- **The Wall** — all 1,969 chogs, virtualized (only visible cells render, smooth at 1,969), searchable by id/name, filterable by tier, sortable by id or rarity
- **Live rarity** — ranks and tier distribution are computed in your browser from the collection's 1,969 on-chain metadata files; nothing is hardcoded
- **Pixel-scatter hover** — touch or hover any chog and its pixels repel from your cursor with spring physics, then snap back (canvas, per-cell, reduced-motion aware)
- **The eyes watch you** — the footer character's pupils track your cursor; on mobile they orbit on their own
- **$CHOG integration** — the token logo links straight to the live [DexScreener chart](https://dexscreener.com/monad/0x350035555e10d9afaf1566aaebfced5ba6c27777); the footer shows the contract with one-click copy
- Every chog links out to OpenSea — the exhibition is a front door to the real market

## Why the Chog NFT matters

Everything. The wall, the traits, the rarity rankings — all 1,969 cards are rendered from the collection's on-chain metadata the moment the page loads, with nothing hardcoded. Take the Chogs away and there's no artwork, no ranks, no exhibition — just an empty frame. The collection doesn't decorate the website; the website is what the collection looks like when you open a browser.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

The wall boots by streaming `/data/manifest.json` (image + traits + rarity inputs for all 1,969 chogs). Images load from `/chogs/*` with automatic IPFS gateway fallback.

## Under the hood

- **Next.js 16 (App Router) · React 19 · Tailwind 4** — no UI kit
- **Vanilla canvas 2D** for the pixel-scatter and eye-tracking (no WebGL/three.js needed)
- **framer-motion** for section reveals
- Windowed/virtualized grid: ~18 cells in the DOM regardless of scroll
- Fonts self-hosted (Epilogue Black, DM Sans)

## What's next

- Trait-based randomizer ("show me a chog with BTC Glass")
- Share cards: export any chog as an image with its rarity rank
- Holder spotlights and weekly community picks

## Links

- Collection: [Chog Genesis on OpenSea](https://opensea.io/collection/chog-genesis)
- NFT contract: `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763` (Monad)
- $CHOG token: `0x350035555e10d9afaf1566aaebfced5ba6c27777` — [chart](https://dexscreener.com/monad/0x350035555e10d9afaf1566aaebfced5ba6c27777)
- Built for [Chogathon 2026](https://chogathon.chog.xyz/)
