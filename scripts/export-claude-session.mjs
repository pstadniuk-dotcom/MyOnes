// Export a Claude Code .jsonl session to a clean Markdown transcript suitable for YC upload.
// Usage: node scripts/export-claude-session.mjs <sessionId> [outputPath]

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: node scripts/export-claude-session.mjs <sessionId> [outputPath]');
  process.exit(1);
}

const projectDir = path.join(os.homedir(), '.claude', 'projects', 'c--Users-Pete-Documents-ones-backup');
const inputPath = path.join(projectDir, `${sessionId}.jsonl`);
const outputPath = process.argv[3] || path.join(process.cwd(), `claude-session-${sessionId.slice(0, 8)}.md`);

if (!fs.existsSync(inputPath)) {
  console.error(`Session not found: ${inputPath}`);
  process.exit(1);
}

const out = fs.createWriteStream(outputPath, { encoding: 'utf8' });

out.write(`# Claude Code Session — ONES AI\n\n`);
out.write(`**Topic:** Refining the AI practitioner consultation prompt — clinical safety, ingredient validation, medication interactions, model selection, and the "consolidate your stack into one supplement" product philosophy.\n\n`);
out.write(`**Session ID:** \`${sessionId}\`\n\n`);
out.write(`---\n\n`);

const truncate = (s, n) => (s.length > n ? s.slice(0, n) + `\n\n_…[truncated, ${s.length - n} more characters]_` : s);

const rl = readline.createInterface({ input: fs.createReadStream(inputPath), crlfDelay: Infinity });

let userIdx = 0;
let assistantIdx = 0;
const toolCounts = {};

for await (const line of rl) {
  if (!line.trim()) continue;
  let o;
  try { o = JSON.parse(line); } catch { continue; }

  if (o.type === 'user' && Array.isArray(o.message?.content)) {
    for (const part of o.message.content) {
      if (part.type === 'text' && part.text && !part.text.startsWith('<') && !part.text.startsWith('[Request')) {
        userIdx++;
        out.write(`## 👤 User [${userIdx}]\n\n`);
        out.write(truncate(part.text.trim(), 6000));
        out.write(`\n\n`);
      }
      if (part.type === 'tool_result' && part.content) {
        // skip tool results; they're noise for a transcript
      }
    }
  }

  if (o.type === 'assistant' && Array.isArray(o.message?.content)) {
    let textBuf = '';
    const toolsUsed = [];
    for (const part of o.message.content) {
      if (part.type === 'text' && part.text) textBuf += part.text + '\n';
      if (part.type === 'tool_use' && part.name) {
        toolsUsed.push(part.name);
        toolCounts[part.name] = (toolCounts[part.name] || 0) + 1;
      }
    }
    if (textBuf.trim() || toolsUsed.length) {
      assistantIdx++;
      out.write(`### 🤖 Claude [${assistantIdx}]\n\n`);
      if (textBuf.trim()) out.write(truncate(textBuf.trim(), 4000) + '\n\n');
      if (toolsUsed.length) {
        const summary = Object.entries(
          toolsUsed.reduce((m, t) => ((m[t] = (m[t] || 0) + 1), m), {}),
        )
          .map(([t, n]) => `\`${t}\`×${n}`)
          .join(', ');
        out.write(`> _tools: ${summary}_\n\n`);
      }
    }
  }
}

out.write(`\n---\n\n`);
out.write(`## Session summary\n\n`);
out.write(`- **User turns:** ${userIdx}\n`);
out.write(`- **Assistant turns:** ${assistantIdx}\n`);
out.write(`- **Tool usage:** ${Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}=${n}`).join(', ')}\n`);
out.end();

await new Promise((r) => out.on('finish', r));
const sizeKB = Math.round(fs.statSync(outputPath).size / 1024);
console.log(`Wrote ${outputPath} (${sizeKB} KB, ${userIdx} user turns, ${assistantIdx} assistant turns)`);
