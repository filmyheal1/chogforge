import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const s = fs.readFileSync(path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db')).toString('latin1');
const win = s.slice(406359200, 406362700);
for (const needle of ['"text"', 'text', '"type"', 'prt_', 'msg_', 'sessionID']) {
  const idx = [];
  let p = 0;
  while ((p = win.indexOf(needle, p)) >= 0 && idx.length < 20) { idx.push(406359200 + p); p += needle.length; }
  console.log(needle, '->', idx.join(', '));
}
console.log('=== 406359600-406360400 ===');
console.log(JSON.stringify(s.slice(406359600, 406360400)));
console.log('=== 406361800-406362700 ===');
console.log(JSON.stringify(s.slice(406361800, 406362700)));
