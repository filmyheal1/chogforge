export type Chog = {
  id: number;
  name: string;
  image: string | null;
  imageFallback?: string | null;
  Tier?: string;
  [trait: string]: string | number | null | undefined;
};

export type EnrichedChog = Chog & {
  score: number;
  rank: number;
};

export const TRAIT_KEYS = [
  "Background",
  "Aura",
  "Base",
  "Skin",
  "Side",
  "Body",
  "Mouth",
  "Eyes",
  "Head",
  "Accessory",
  "Form",
  "Tier",
  "Naked",
] as const;

export const CONTRACT = "0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763";

export function openseaUrl(id: number) {
  return `https://opensea.io/assets/monad/${CONTRACT}/${id}`;
}

export function traitCounts(list: Chog[]) {
  const counts: Record<string, Map<string, number>> = {};
  for (const key of TRAIT_KEYS) {
    const map = new Map<string, number>();
    for (const c of list) {
      const v = c[key];
      if (typeof v === "string") map.set(v, (map.get(v) ?? 0) + 1);
    }
    counts[key] = map;
  }
  return counts;
}

export function enrich(list: Chog[]): EnrichedChog[] {
  const counts = traitCounts(list);
  const liveKeys = TRAIT_KEYS.filter((k) => counts[k].size > 1);
  const scored = list.map((c) => {
    let score = 0;
    for (const key of liveKeys) {
      const v = c[key];
      if (typeof v !== "string") continue;
      const n = counts[key].get(v) ?? 1;
      score += list.length / n;
    }
    return { ...c, score, rank: 0 };
  });
  const order = [...scored].sort((a, b) => b.score - a.score || a.id - b.id);
  order.forEach((c, i) => {
    c.rank = i + 1;
  });
  const byId = new Map(order.map((c) => [c.id, c]));
  return list.map((c) => byId.get(c.id)!);
}

export function tierDistribution(list: Chog[]) {
  const map = new Map<string, number>();
  for (const c of list) {
    const t = (c.Tier as string) ?? "Unknown";
    map.set(t, (map.get(t) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function scarcestTrait(list: Chog[]) {
  const counts = traitCounts(list);
  let best: { trait: string; value: string; n: number } | null = null;
  for (const key of TRAIT_KEYS) {
    for (const [value, n] of counts[key]) {
      if (!best || n < best.n) best = { trait: key, value, n };
    }
  }
  return best;
}
