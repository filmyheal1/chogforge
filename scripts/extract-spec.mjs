import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const base = path.join(os.homedir(), '.local', 'share', 'opencode');
const b = fs.readFileSync(path.join(base, 'opencode.db'));
const s = b.toString('latin1');
const hit = 406362650;
const mk = ',"text":"';
const st = s.lastIndexOf(mk, hit);
if (st < 0) { console.error('no start'); process.exit(1); }
let out = '';
for (let i = st + mk.length; i < s.length; i++) {
  const c = s[i];
  if (c === '\\') {
    const n = s[i + 1];
    out += n === 'n' ? '\n' : n === 'r' ? '\r' : n === 't' ? '\t' : n;
    i++;
  } else if (c === '"') break;
  else out += c;
}
const dest = path.join(os.tmpdir(), 'opencode', 'spec.txt');
fs.writeFileSync(dest, out);
console.log('len', out.length, 'start@', st, '->', dest);
