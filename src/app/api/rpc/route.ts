const ALLOWED = new Set(["eth_call", "eth_chainId"]);
const ENDPOINTS = ["https://rpc.monad.xyz", "https://rpc2.monad.xyz"];

export async function POST(request: Request) {
  let body: { method?: string; params?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const { method, params } = body;
  if (typeof method !== "string" || !ALLOWED.has(method) || !Array.isArray(params)) {
    return Response.json({ error: "method not allowed" }, { status: 400 });
  }

  let lastErr = "rpc unreachable";
  for (let attempt = 0; attempt < ENDPOINTS.length * 2; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (r.status === 429 || r.status >= 500) {
        lastErr = `rpc http ${r.status}`;
        continue;
      }
      if (!r.ok) return Response.json({ error: `rpc http ${r.status}` }, { status: 502 });
      const j = await r.json();
      if (j && typeof j === "object" && j.error) {
        lastErr = j.error.message || "rpc error";
        continue;
      }
      return Response.json(j);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "rpc unreachable";
    }
  }
  return Response.json({ error: lastErr }, { status: 502 });
}
