// Export a VS Code Copilot session to a clean markdown transcript.
// - Keeps user prompts (trims pasted terminal/log dumps)
// - Keeps Claude's text replies (markdown content)
// - Drops thinking blocks, tool call serializations, and terminal output
// Usage: node scripts/export-vscode-session.mjs <prefix> [outputPath]

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const id = process.argv[2];
if (!id) { console.error('Usage: node scripts/export-vscode-session.mjs <prefix> [outputPath]'); process.exit(1); }

const dir = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'workspaceStorage', 'a792a92aa4c9cbe5acc0d3f1cc1c792a', 'chatSessions');
const file = fs.readdirSync(dir).find(f => f.startsWith(id));
if (!file) { console.error('Not found'); process.exit(1); }
const full = path.join(dir, file);
const stat = fs.statSync(full);
const out = process.argv[3] || path.join(process.cwd(), `coding-session-${id.slice(0, 8)}.md`);

console.log(`Reading ${file} (${(stat.size / 1024 / 1024).toFixed(1)} MB)...`);

let text;
if (stat.size > 500 * 1024 * 1024) {
  const fd = fs.openSync(full, 'r');
  const buf = Buffer.alloc(500 * 1024 * 1024);
  const n = fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  text = buf.slice(0, n).toString('utf8');
} else {
  text = fs.readFileSync(full, 'utf8');
}

// Try to parse as JSON; if it fails, treat as JSONL (each line is {kind, v:{...}} or a request).
let session;
try {
  session = JSON.parse(text);
} catch {
  const requests = [];
  let header = null;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      // VS Code Copilot JSONL: first line is {kind:0, v:{... requests:[...]}} (header/whole session)
      // subsequent lines are {kind:N, v:{... single request ...}}
      const payload = o.v || o;
      if (Array.isArray(payload.requests)) {
        if (!header) header = payload;
        for (const r of payload.requests) requests.push(r);
      } else if (payload.requestId || payload.message) {
        requests.push(payload);
      }
    } catch { /* ignore */ }
  }
  session = { ...(header || {}), requests };
}

const requests = session.requests || [];

// Heuristic: a "paste" is a long block with terminal-like markers we want to summarize.
function summarizePaste(s) {
  if (s.length < 500) return s;
  const looksLikeTerminal = /\[Terminal [a-f0-9-]+|PS C:\\|exit code|stderr|\.\.\.\s*PREVIOUS OUTPUT TRUNCATED/i.test(s);
  const looksLikeJsonDump = /^\s*[\{\[]/.test(s) && s.length > 1500;
  const looksLikeWebDump = /https?:\/\/[^\s]{30,}|\bAWS4-HMAC-SHA256\b|X-Amz-Signature/.test(s);
  if (looksLikeTerminal || looksLikeJsonDump || looksLikeWebDump) {
    const firstLine = s.split('\n').find(l => l.trim().length > 0) || '';
    return `_[pasted ~${s.length.toLocaleString()} characters of context — first line: "${firstLine.slice(0, 120)}..."]_`;
  }
  // Otherwise truncate gently
  if (s.length > 2000) return s.slice(0, 2000) + `\n\n_[…truncated ${(s.length - 2000).toLocaleString()} more characters]_`;
  return s;
}

function getUserText(req) {
  // VS Code Copilot stores user message in either req.message.text or req.message.parts[*].text
  const parts = [];
  if (req.message?.text) parts.push(req.message.text);
  else if (Array.isArray(req.message?.parts)) {
    for (const p of req.message.parts) {
      if (p.kind === 'text' && p.text) parts.push(p.text);
    }
  }
  return parts.join('\n').trim();
}

function getAssistantText(req) {
  // Concatenate all "kind":"markdownContent" or "kind":"textEditGroup" text replies
  if (!Array.isArray(req.response)) return '';
  const out = [];
  for (const r of req.response) {
    if (r.kind === 'markdownContent' && r.content?.value) {
      out.push(r.content.value);
    } else if (r.kind === 'markdownVuln' && r.content?.value) {
      out.push(r.content.value);
    } else if (r.value && typeof r.value === 'string' && r.kind !== 'thinking') {
      // Some shapes inline `value` as markdown
      out.push(r.value);
    }
  }
  return out.join('\n').trim();
}

// Cleanup helpers
function redact(s) {
  return s
    .replace(/pdstadniuk@yahoo\.com/gi, '[personal-email-redacted]')
    .replace(/SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, '[sendgrid-key-redacted]')
    .replace(/\bsk-[A-Za-z0-9_-]{20,}/g, '[api-key-redacted]')
    // soften profanity
    .replace(/\bwhat the fuck\b/gi, 'what happened')
    .replace(/\bfuck(ing|ed)?\b/gi, '')
    .replace(/\bshit\b/gi, '');
}
function isFiller(s) {
  const t = s.trim().toLowerCase();
  if (!t) return true;
  if (/^@agent continue/.test(t)) return true;
  if (/^(yes|no|ok|okay|sure|cool|proceed|continue|go|do it|let'?s do it|let'?s go|move forward|great|thanks|thank you|nice|awesome|got it|👍|y|n)[!.\s]*$/.test(t)) return true;
  return false;
}

let md = '';
md += `# Coding Session — ONES AI\n\n`;
md += `**Topic:** Building the wearables layer of ONES — pulling Oura/Whoop/Fitbit metrics into the platform, designing an AI "Health Pulse" overview, correlating wearable data with lab results into a personalized game plan, and figuring out how to deliver real value to users at a glance instead of just regurgitating numbers their device already shows them.\n\n`;
md += `**Tools:** GitHub Copilot Chat (Claude Sonnet 4.5) inside VS Code.\n\n`;
md += `**Session ID:** \`${file}\`\n\n`;
md += `---\n\n`;

let userIdx = 0;
let asstIdx = 0;

for (const req of requests) {
  const u = getUserText(req);
  const a = getAssistantText(req);
  if (u && !isFiller(u)) {
    userIdx++;
    md += `## 👤 Pete [${userIdx}]\n\n`;
    md += redact(summarizePaste(u)) + '\n\n';
    if (a) {
      asstIdx++;
      md += `### 🤖 Claude [${asstIdx}]\n\n`;
      md += redact(summarizePaste(a)) + '\n\n';
    }
  }
}

md += `\n---\n\n`;
md += `## Session summary\n\n`;
md += `- **User turns:** ${userIdx}\n`;
md += `- **Assistant turns:** ${asstIdx}\n`;

fs.writeFileSync(out, md, 'utf8');
const sz = fs.statSync(out).size;
console.log(`Wrote ${out} (${(sz / 1024).toFixed(1)} KB, ${userIdx} user turns, ${asstIdx} assistant turns)`);
