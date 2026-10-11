const ROW_A = [
  "CHOG GENESIS",
  "1,969 PIECES",
  "MONAD",
  "CHOG WORLD ORDER",
  "ON-CHAIN TRAITS",
  "EVERY SINGLE CHOG",
];

const ROW_B = [
  "BACKGROUND",
  "AURA",
  "SKIN",
  "BODY",
  "EYES",
  "HEAD",
  "ACCESSORY",
  "TIER",
];

function Track({
  words,
  reverse,
  big,
}: {
  words: string[];
  reverse?: boolean;
  big?: boolean;
}) {
  const doubled = [...words, ...words, ...words, ...words];
  return (
    <div className={`marquee-track ${reverse ? "rev" : ""}`}>
      {doubled.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className={
            big
              ? "whitespace-nowrap px-6 font-sans text-[7vw] font-semibold uppercase leading-none tracking-tight md:text-[3.4vw]"
              : "whitespace-nowrap px-5 font-mono text-[11px] uppercase tracking-[0.25em] text-ash md:text-xs"
          }
        >
          {w}
          <span className="ml-6 text-purple">✦</span>
        </span>
      ))}
    </div>
  );
}

export default function Marquee() {
  return (
    <div className="border-b border-line bg-bone-2/40 py-4">
      <div className="overflow-hidden py-2">
        <Track words={ROW_A} big />
      </div>
      <div className="overflow-hidden border-t border-line pt-3">
        <Track words={ROW_B} reverse />
      </div>
    </div>
  );
}
