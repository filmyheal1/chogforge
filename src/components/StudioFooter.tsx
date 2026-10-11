import ChogCharacter from "./ChogCharacter";

const CHART =
  "https://dexscreener.com/monad/0x350035555e10d9afaf1566aaebfced5ba6c27777";

export default function StudioFooter() {
  return (
    <footer className="footer studio-footer-page" aria-label="Footer">
      <ChogCharacter />
      <div className="logo">
        <a
          href={CHART}
          target="_blank"
          rel="noreferrer"
          aria-label="View $CHOG on DexScreener"
        >
          <img src="/chog-token.webp" alt="" />
        </a>
      </div>
      <div className="contact">
        <div className="socials">
          <span aria-label="LinkedIn">
            <img src="/linkedin.svg" alt="" width="35" height="35" />
          </span>
        </div>
      </div>
    </footer>
  );
}
