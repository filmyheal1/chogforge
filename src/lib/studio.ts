import { CONTRACT } from "@/lib/chog";

export function isAddress(s: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(s.trim());
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  let lastErr: unknown = new Error("rpc request failed");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch("/api/rpc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, params }),
      });
      if (!r.ok) throw new Error(`rpc request failed (${r.status})`);
      const j = (await r.json()) as { result?: unknown; error?: { message?: string } };
      if (j.error) throw new Error(j.error.message || "rpc error");
      return j.result;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await sleep(500 * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function findOwnedChogs(address: string): Promise<number[]> {
  const r = await fetch("/api/owned", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: address.trim() }),
  });
  if (!r.ok) throw new Error("wallet lookup failed");
  const j = (await r.json()) as { ids?: number[] };
  if (!Array.isArray(j.ids)) throw new Error("bad lookup response");
  return j.ids;
}

export async function verifyOwner(id: number, address: string): Promise<boolean> {
  const data =
    "0x6352211e" + BigInt(id).toString(16).padStart(64, "0");
  const res = (await rpcCall("eth_call", [{ to: CONTRACT, data }, "latest"])) as string;
  if (!res || res.length < 66) return false;
  return res.slice(26).toLowerCase() === address.trim().slice(2).toLowerCase();
}
