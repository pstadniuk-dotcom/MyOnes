/**
 * Bulk restyle UgcStudioPage.tsx from dark theme to ONES brand.
 * Run once, then delete this script.
 */
import { readFileSync, writeFileSync } from 'fs';

const FILE = 'client/src/pages/admin/UgcStudioPage.tsx';
let c = readFileSync(FILE, 'utf-8');

// Order matters — more specific patterns FIRST to avoid partial matches

const R = [
  // ── Emerald → ONES sage green (#054700) ──
  ['bg-emerald-700', 'bg-[#054700]'],
  ['hover:bg-emerald-600', 'hover:bg-[#043d00]'],
  ['bg-emerald-500', 'bg-[#054700]'],
  ['bg-emerald-900/40', 'bg-[#054700]/10'],
  ['bg-emerald-900/30', 'bg-emerald-50'],
  ['bg-emerald-900/20', 'bg-[#054700]/5'],
  ['bg-emerald-900/10', 'bg-[#054700]/5'],
  ['text-emerald-300/70', 'text-[#054700]/70'],
  ['text-emerald-400', 'text-[#054700]'],
  ['text-emerald-300', 'text-[#054700]'],
  ['text-emerald-500', 'text-[#054700]'],
  ['border-emerald-800/30', 'border-[#054700]/20'],
  ['border-emerald-500', 'border-[#054700]'],
  ['border-emerald-700', 'border-[#054700]'],
  ['hover:bg-emerald-900/50', 'hover:bg-emerald-50'],
  ['hover:text-emerald-400', 'hover:text-[#054700]'],
  ['hover:border-emerald-700', 'hover:border-[#054700]'],
  ['focus:bg-emerald-900/30', 'focus:bg-[#054700]/5'],
  ['data-[state=active]:bg-emerald-900/40', 'data-[state=active]:bg-white data-[state=active]:shadow-sm'],
  ['data-[state=active]:text-emerald-400', 'data-[state=active]:text-[#054700]'],

  // ── Dark backgrounds → light ──
  ['bg-[#111]', 'bg-white'],
  ['bg-[#1a1a1a]', 'bg-white'],
  ['bg-[#0a0a0a]', 'bg-white'],
  ['bg-black/70', 'bg-gray-900/70'],   // keep for overlay labels
  ['bg-black/60', 'bg-white/90'],
  ['bg-black/50', 'bg-white/90'],
  ['bg-black', 'bg-white'],

  // ── Borders ──
  ['border-gray-800', 'border-gray-200'],
  ['border-gray-700', 'border-gray-200'],
  ['border-red-800', 'border-red-300'],
  ['border-red-500', 'border-red-300'],

  // ── Background surfaces ──
  ['bg-gray-900/50', 'bg-gray-50'],
  ['bg-gray-900', 'bg-gray-50'],
  ['bg-gray-800', 'bg-gray-100'],

  // ── Text: dark-on-light theme ──
  ['text-gray-100', 'text-gray-800'],
  ['text-gray-200', 'text-gray-700'],
  ['text-gray-300', 'text-gray-600'],
  // text-gray-400 → text-gray-500 (do after more specific patterns)
  ['text-gray-400', 'text-gray-500'],

  // ── Status: red ──
  ['bg-red-900/30', 'bg-red-50'],
  ['text-red-300', 'text-red-700'],
  ['text-red-400', 'text-red-500'],
  ['hover:bg-red-900/50', 'hover:bg-red-50'],
  ['hover:bg-red-900/30', 'hover:bg-red-50'],

  // ── Status: blue ──
  ['bg-blue-900/30', 'bg-blue-50'],
  ['text-blue-300', 'text-blue-700'],
  ['text-blue-400', 'text-blue-600'],
  ['bg-blue-700', 'bg-blue-600'],
  ['hover:bg-blue-600', 'hover:bg-blue-500'],
  ['hover:bg-blue-900/50', 'hover:bg-blue-50'],

  // ── Status: yellow/amber ──
  ['bg-yellow-900/30', 'bg-amber-50'],
  ['text-yellow-300', 'text-amber-700'],
  ['text-yellow-400', 'text-amber-500'],
  ['fill-yellow-400', 'fill-amber-500'],
  ['bg-yellow-600', 'bg-amber-500'],
  ['hover:bg-yellow-500', 'hover:bg-amber-400'],

  // ── Purple / Orange ──
  ['text-purple-400', 'text-purple-600'],
  ['text-orange-400', 'text-orange-500'],

  // ── Hover states ──
  ['hover:bg-white/20', 'hover:bg-gray-100'],
  ['hover:bg-gray-800', 'hover:bg-gray-100'],
  ['hover:border-gray-700', 'hover:border-gray-300'],
  ['hover:border-gray-600', 'hover:border-gray-400'],

  // ── text-white → text-gray-900 (bulk, then fix buttons) ──
  ['text-white', 'text-gray-900'],
];

for (const [from, to] of R) {
  c = c.split(from).join(to);
}

// ── Fix: buttons with bg-[#054700] need text-white, not text-gray-900 ──
// Pattern: any className containing bg-[#054700] and text-gray-900 on same element
c = c.replace(/bg-\[#054700\](.*?)text-gray-900/g, 'bg-[#054700]$1text-white');
// Also fix hover variant: hover:bg-[#043d00] text-gray-900 on same line
c = c.replace(/hover:bg-\[#043d00\](.*?)text-gray-900/g, 'hover:bg-[#043d00]$1text-white');

// ── Fix: TabsList should be bg-gray-100, not bg-white ──
// TabsList already has bg-white from the replacement, change it
c = c.replace(
  /(<TabsList\s+className="[^"]*?)bg-white/g,
  '$1bg-gray-100'
);

// ── Fix: border-dashed cards need visible borders ──
c = c.replace(/border-gray-200 border-dashed/g, 'border-gray-300 border-dashed');

writeFileSync(FILE, c);

// Count changes
const original = readFileSync(FILE, 'utf-8');
console.log(`✅ Restyled UgcStudioPage.tsx (${FILE})`);
console.log(`   File size: ${original.length} chars`);
