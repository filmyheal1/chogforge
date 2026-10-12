const HOSTS = new Set(["ipfs.filebase.io", "gateway.pinata.cloud", "ipfs.io"]);

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src") ?? "";
  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return Response.json({ error: "bad src" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || !HOSTS.has(parsed.hostname)) {
    return Response.json({ error: "host not allowed" }, { status: 403 });
  }
  try {
    const r = await fetch(parsed, { cache: "force-cache" });
    if (!r.ok) return Response.json({ error: "upstream failed" }, { status: 502 });
    const buf = await r.arrayBuffer();
    return new Response(buf, {
      headers: {
        "content-type": r.headers.get("content-type") ?? "image/webp",
        "cache-control": "public, max-age=86400",
      },
    });
  } catch {
    return Response.json({ error: "fetch failed" }, { status: 502 });
  }
}
