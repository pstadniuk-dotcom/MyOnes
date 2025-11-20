import { jsonrepair } from 'jsonrepair';

/**
 * Normalize AI JSON output by stripping markdown fences and repairing minor formatting issues.
 */
export function parseAiJson(rawText: string) {
  if (!rawText) {
    throw new Error('Empty AI response');
  }

  let text = rawText.trim();

  // Remove fenced code block wrappers if present (```json ... ```)
  if (text.startsWith('```')) {
    const fenceEnd = text.lastIndexOf('```');
    if (fenceEnd > 0) {
      text = text.slice(text.indexOf('\n') + 1, fenceEnd).trim();
    }
  }

  // Anthropic occasionally streams partial unicode quotes; normalize smart quotes.
  text = text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  try {
    return JSON.parse(text);
  } catch (error) {
    // Attempt repair and retry
    const repaired = jsonrepair(text);
    return JSON.parse(repaired);
  }
}
