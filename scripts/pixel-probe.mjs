import sharp from 'sharp';

const file = process.argv[2] || 'refs/shots/f1-desktop.png';
const pts = [
  [10, 10], [720, 40], [1400, 50], [50, 450], [400, 450],
  [720, 450], [1400, 500], [100, 850], [720, 850], [1350, 120],
  [90, 200], [640, 150], [1100, 300],
];
const m = await sharp(file).metadata();
console.log(file, m.width + 'x' + m.height);
for (const [x, y] of pts) {
  if (x >= m.width || y >= m.height) continue;
  const b = await sharp(file).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer();
  console.log('(' + x + ',' + y + ') = ' + b[0] + ',' + b[1] + ',' + b[2]);
}
