import TokenCA from "./TokenCA";

const LINKS = [
  { label: "pfp studio", href: "/studio" },
  { label: "chog.xyz", href: "https://www.chog.xyz/" },
  { label: "X", href: "https://x.com/ChogNFT" },
  { label: "Discord", href: "https://discord.gg/chog" },
  { label: "OpenSea", href: "https://opensea.io/collection/chog-genesis" },
  { label: "Monad", href: "https://monad.xyz/" },
];

export default function Footer() {
  return (
    <footer className="px-4 py-8 md:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-5xl font-semibold tracking-tighter md:text-7xl">
            CHOG<span className="text-purple">forge</span>
          </div>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ash">
            an exhibition built for chogathon 2026 · exhibit nº01
          </p>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {LINKS.map((l) => {
              const internal = l.href.startsWith("/");
              return (
                <a
                  key={l.label}
                  href={l.href}
                  target={internal ? undefined : "_blank"}
                  rel={internal ? undefined : "noreferrer"}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-ash transition-colors hover:text-purple"
                >
                  {l.label}
                  {internal ? "" : " ↗"}
                </a>
              );
            })}
          </div>
          <TokenCA />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ash/70">
            nft contract 0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763 · data read
            live from monad
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ash/70">
            © 2026 chog world order — fan-made exhibition, not financial advice
          </span>
        </div>
      </div>
    </footer>
  );
}
