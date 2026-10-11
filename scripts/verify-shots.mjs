import sharp from "sharp";

const S = "refs/shots";

async function load(name) {
  const { data, info } = await sharp(`${S}/${name}`)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  return { px, w: info.width, h: info.height, px2: px };
}

const isBone = (p) =>
  Math.abs(p[0] - 239) < 10 && Math.abs(p[1] - 233) < 10 && Math.abs(p[2] - 225) < 10;

// wall paint fraction (bone-based)
for (const file of ["2-wall.png", "3-wall-scrolled.png"]) {
  const { px, w } = await load(file);
  const cell = Math.floor(w / 9);
  let painted = 0;
  let total = 0;
  const rows = [];
  for (let row = 0; row < 5; row++) {
    let rp = 0;
    for (let col = 0; col < 9; col++) {
      const x0 = col * cell + cell / 2;
      const y0 = 177 + row * cell + cell / 2;
      let bone = 0;
      let n = 0;
      for (let dx = -30; dx <= 30; dx += 10)
        for (let dy = -30; dy <= 30; dy += 10) {
          n++;
          if (isBone(px(Math.round(x0 + dx), Math.round(y0 + dy)))) bone++;
        }
      total++;
      if (bone / n < 0.9) {
        painted++;
        rp++;
      }
    }
    rows.push(rp);
  }
  console.log(`${file}: painted ${painted}/${total}  per-row [${rows}]`);
}

// mobile bar: major transitions only
{
  const { px } = await load("8-mobile-rarity.png");
  const y = 239;
  const majors = [];
  let base = px(20, y);
  majors.push([20, base.join(",")]);
  for (let x = 21; x <= 374; x++) {
    const c = px(x, y);
    const d = Math.abs(c[0] - base[0]) + Math.abs(c[1] - base[1]) + Math.abs(c[2] - base[2]);
    if (d > 60) {
      majors.push([x, c.join(",")]);
      base = c;
    }
  }
  console.log("mobile bar major transitions:", JSON.stringify(majors));
}
