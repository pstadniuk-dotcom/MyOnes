// Rank VS Code Copilot chat sessions for this workspace by user-input volume + substantive prompts.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

const dir = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'workspaceStorage', 'a792a92aa4c9cbe5acc0d3f1cc1c792a', 'chatSessions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));

const results = [];

function extractUserMessages(text) {
  // Find all "message":{"text":"..."} occurrences (top-level user prompts only).
  // Approximate: scan for `"message":{"text":"` then read until unescaped `"`.
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
    // Unescape minimally for length/preview purposes.
    const unescaped = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    msgs.push(unescaped);
    i = end + 1;
  }
  return msgs;
}

for (const f of files) {
  const full = path.join(dir, f);
  const stat = fs.statSync(full);
  // Skip massive files that won't fit in memory; we'll handle them streaming-wise differently.
  let text;
  try {
    if (stat.size > 200 * 1024 * 1024) {
      // For very large files, read first 50MB only for ranking.
      const fd = fs.openSync(full, 'r');
      const buf = Buffer.alloc(50 * 1024 * 1024);
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      fs.closeSync(fd);
      text = buf.slice(0, n).toString('utf8');
    } else {
      text = fs.readFileSync(full, 'utf8');
    }
  } catch (e) {
    continue;
  }
  const msgs = extractUserMessages(text);
  const totalChars = msgs.reduce((s, m) => s + m.length, 0);
  const longCount = msgs.filter(m => m.length > 200).length;
  const veryLongCount = msgs.filter(m => m.length > 500).length;
  const firstMsg = msgs[0]?.slice(0, 200).replace(/\n/g, ' | ') || '';
  results.push({
    file: f.slice(0, 8),
    sizeMB: +(stat.size / 1024 / 1024).toFixed(1),
    mtime: stat.mtime.toISOString().slice(0, 10),
    msgs: msgs.length,
    totalKB: +(totalChars / 1024).toFixed(1),
    long: longCount,
    veryLong: veryLongCount,
    first: firstMsg,
  });
}

// Sort by substantive content score: prioritize many long messages and high total user input.
results.sort((a, b) => (b.veryLong * 10 + b.long * 3 + b.totalKB / 10) - (a.veryLong * 10 + a.long * 3 + a.totalKB / 10));

console.log('Rank | File     | Date       | SizeMB | Msgs | UserKB | Long(>200) | VeryLong(>500) | First message');
console.log('-----|----------|------------|--------|------|--------|------------|-----------------|---------------');
results.forEach((r, i) => {
  console.log(`${String(i + 1).padStart(4)} | ${r.file} | ${r.mtime} | ${String(r.sizeMB).padStart(6)} | ${String(r.msgs).padStart(4)} | ${String(r.totalKB).padStart(6)} | ${String(r.long).padStart(10)} | ${String(r.veryLong).padStart(15)} | ${r.first.slice(0, 90)}`);
});
