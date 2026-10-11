import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const base = path.join(os.homedir(), '.local', 'share', 'opencode');
const db = new DatabaseSync(path.join(base, 'opencode.db'), { readOnly: true });

const rows = db.prepare("SELECT id, message_id, data FROM part WHERE data LIKE '%motionsites%' OR (data LIKE '%Epilogue%' AND data LIKE '%footer%')").all();
console.log('matching parts:', rows.length);

const dir = path.join(os.tmpdir(), 'opencode');
fs.mkdirSync(dir, { recursive: true });

const parts = [];
for (const r of rows) {
  let d;
  try { d = JSON.parse(r.data); } catch { d = { raw: r.data }; }
  const text = typeof d.text === 'string' ? d.text : (typeof d.raw === 'string' ? d.raw : JSON.stringify(d));
  parts.push({ id: r.id, message_id: r.message_id, len: text.length, text });
}

parts.sort((a, b) => (a.message_id + a.id).localeCompare(b.message_id + b.id));
for (const p of parts) console.log(p.id, p.message_id, p.len, JSON.stringify(p.text.slice(0, 70)));

const combined = parts.map(p => p.text).join('\n\n---PART-BREAK---\n\n');
const dest = path.join(dir, 'spec-full.txt');
fs.writeFileSync(dest, combined);
console.log('total', combined.length, '->', dest);
