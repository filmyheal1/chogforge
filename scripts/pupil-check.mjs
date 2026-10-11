import sharp from 'sharp';

async function pupil(file, eye) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, C = info.channels;
  let sx = 0, sy = 0, n = 0;
  for (let y = eye[1] - 105; y <= eye[1] + 105; y++) {
    for (let x = eye[0] - 105; x <= eye[0] + 105; x++) {
      if (x < 0 || y < 0 || x >= W || y >= info.height) continue;
      const i = (y * W + x) * C;
      if (data[i] < 60 && data[i + 1] < 60 && data[i + 2] < 60) { sx += x; sy += y; n++; }
    }
  }
  return n ? [Math.round(sx / n), Math.round(sy / n), n] : [0, 0, 0];
}

const L = [596, 233], R = [1187, 451];
for (const f of ['f1-desktop', 'f2-gaze-downleft', 'f3-gaze-upright']) {
  const p = 'refs/shots/' + f + '.png';
  console.log(f, 'L', await pupil(p, L), 'R', await pupil(p, R));
}
console.log('neutral expected ~ L[596,233] R[1187,451]; f2 gaze(180,780) => pupils shift left+down; f3 gaze(1260,160) => shift right+up');
