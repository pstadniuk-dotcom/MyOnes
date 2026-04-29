// Dump all user messages from a given VS Code Copilot session for human evaluation.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const id = process.argv[2];
if (!id) { console.error('Usage: node scripts/preview-vscode-session.mjs <prefix>'); process.exit(1); }

const dir = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'workspaceStorage', 'a792a92aa4c9cbe5acc0d3f1cc1c792a', 'chatSessions');
const file = fs.readdirSync(dir).find(f => f.startsWith(id));
if (!file) { console.error('Not found'); process.exit(1); }
const full = path.join(dir, file);
const stat = fs.statSync(full);

let text;
if (stat.size > 200 * 1024 * 1024) {
  const fd = fs.openSync(full, 'r');
  const buf = Buffer.alloc(150 * 1024 * 1024);
  const n = fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  text = buf.slice(0, n).toString('utf8');
} else {
  text = fs.readFileSync(full, 'utf8');
}

const msgs = [];
let i = 0;
while (true) {
  const idx = text.indexOf('"message":{"text":"', i);
  if (idx === -1) break;
  const start = idx + '"message":{"text":"'.length;
  let end = start;
  while (end < text.length) {
    if (text[end] === '\\') { end += 2; continue; }
    if (text[end] === '"') break;
    end++;
  }
  const raw = text.slice(start, end);
  const unescaped = raw.replace(/\\r/g,'').replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\\/g,'\\').replace(/\\t/g,'  ');
  msgs.push(unescaped);
  i = end + 1;
}

console.log(`File: ${file}  (${(stat.size/1024/1024).toFixed(1)} MB, ${msgs.length} user messages)\n`);
msgs.forEach((m, idx) => {
  // Skip pure pastes (very long with little non-paste content)
  const isPaste = m.length > 1500 && (m.match(/\n/g) || []).length / m.length > 0.02;
  const tag = isPaste ? '[PASTE]' : '';
  const preview = m.length > 600 ? m.slice(0, 600) + ` …(+${m.length - 600}c)` : m;
  console.log(`\n--- [${idx + 1}] ${m.length}c ${tag} ---\n${preview}`);
});
