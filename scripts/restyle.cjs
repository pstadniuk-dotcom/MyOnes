const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'client', 'src', 'pages', 'admin', 'UgcStudioPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');
const origLen = content.length;

// Ordered replacements: more specific patterns first to avoid partial matches
const replacements = [
  // Emerald → ONES sage green (#054700)
  ['bg-emerald-900/40', 'bg-[#054700]/10'],
  ['bg-emerald-900/30', 'bg-emerald-50'],
  ['bg-emerald-900/20', 'bg-[#054700]/5'],
  ['bg-emerald-900/10', 'bg-[#054700]/5'],
  ['bg-emerald-700', 'bg-[#054700]'],
  ['bg-emerald-600', 'bg-[#043d00]'],
  ['bg-emerald-500', 'bg-[#054700]'],
  ['hover:bg-emerald-900/50', 'hover:bg-emerald-50'],
  ['hover:bg-emerald-600', 'hover:bg-[#043d00]'],
  ['hover:bg-emerald-500', 'hover:bg-[#043d00]'],
  ['text-emerald-500', 'text-[#054700]'],
  ['text-emerald-400', 'text-[#054700]'],
  ['text-emerald-300/70', 'text-[#054700]/70'],
  ['text-emerald-300', 'text-[#054700]'],
  ['border-emerald-800/30', 'border-[#054700]/20'],
  ['border-emerald-500', 'border-[#054700]'],
  ['border-emerald-700', 'border-[#054700]'],
  ['hover:text-emerald-400', 'hover:text-[#054700]'],
  ['hover:border-emerald-700', 'hover:border-[#054700]'],
  ['focus:bg-emerald-900/30', 'focus:bg-[#054700]/5'],
  ['data-[state=active]:bg-emerald-900/40', 'data-[state=active]:bg-white data-[state=active]:shadow-sm'],
  ['data-[state=active]:text-emerald-400', 'data-[state=active]:text-[#054700]'],

  // Dark backgrounds → light/white
  ['bg-[#111]', 'bg-white'],
  ['bg-[#0a0a0a]', 'bg-white'],
  ['bg-[#1a1a1a]', 'bg-white'],
  ['bg-black/70', 'bg-gray-900/70'],
  ['bg-black/60', 'bg-white/90'],
  ['bg-black/50', 'bg-white/90'],
  ['bg-black', 'bg-white'],

  // Dark borders → light
  ['border-gray-800', 'border-gray-200'],
  ['border-gray-700', 'border-gray-200'],

  // Gray backgrounds
  ['bg-gray-800', 'bg-gray-200'],
  ['bg-gray-900/50', 'bg-gray-50'],
  ['bg-gray-900', 'bg-gray-50'],

  // Text hierarchy: dark-theme grays → light-theme
  ['text-gray-100', 'text-gray-800'],
  ['text-gray-200', 'text-gray-700'],
  ['text-gray-300', 'text-gray-600'],
  ['text-gray-400', 'text-gray-500'],

  // Status: red
  ['bg-red-900/30', 'bg-red-50'],
  ['text-red-300', 'text-red-600'],
  ['text-red-400', 'text-red-500'],
  ['border-red-800', 'border-red-300'],
  ['hover:bg-red-900/50', 'hover:bg-red-50'],
  ['hover:bg-red-900/30', 'hover:bg-red-50'],

  // Status: blue
  ['bg-blue-900/30', 'bg-blue-50'],
  ['text-blue-300', 'text-blue-700'],
  ['text-blue-400', 'text-blue-600'],
  ['bg-blue-700', 'bg-blue-600'],
  ['hover:bg-blue-600', 'hover:bg-blue-500'],
  ['hover:bg-blue-900/50', 'hover:bg-blue-50'],

  // Status: yellow/amber
  ['bg-yellow-900/30', 'bg-amber-50'],
  ['text-yellow-300', 'text-amber-700'],
  ['text-yellow-400', 'text-amber-500'],
  ['fill-yellow-400', 'fill-amber-500'],
  ['bg-yellow-600', 'bg-amber-500'],
  ['hover:bg-yellow-500', 'hover:bg-amber-400'],

  // Purple / orange
  ['text-purple-400', 'text-purple-600'],
  ['text-orange-400', 'text-orange-600'],

  // Hover states
  ['hover:bg-white/20', 'hover:bg-gray-100'],
  ['hover:bg-gray-800', 'hover:bg-gray-100'],
  ['hover:border-gray-700', 'hover:border-gray-300'],
  ['hover:border-gray-600', 'hover:border-gray-400'],
];

let changeCount = 0;
for (const [from, to] of replacements) {
  const parts = content.split(from);
  if (parts.length > 1) {
    changeCount += parts.length - 1;
    content = parts.join(to);
  }
}

// Now fix text-white → text-gray-900 EXCEPT on elements that need white text
// Process line by line for precision
const lines = content.split('\n');
const fixedLines = lines.map(line => {
  if (!line.includes('text-white')) return line;
  
  // Keep text-white ONLY on primary sage-green buttons  
  if (line.includes('bg-[#054700]') || line.includes('bg-[#043d00]')) return line;
  
  // Keep text-white on blue action buttons (Regenerate, etc.)
  if (line.includes('bg-blue-600') || line.includes('bg-blue-700')) return line;
  
  // Keep text-white on amber/yellow buttons (favorites filter)
  if (line.includes('bg-amber-500') && line.includes('Button')) return line;
  
  // Keep text-white on dark overlays (image hover overlays, video overlays)
  if (line.includes('bg-gray-900/70')) return line;
  
  // Keep text-white in ternary strings for button variants
  // e.g. className={favOnly ? 'bg-amber-500 hover:bg-amber-400 text-white' : '...'}
  if (line.includes("'bg-amber-500")) return line;
  if (line.includes("'bg-[#054700]")) return line;
  
  // Everything else: replace text-white with text-gray-900
  return line.replace(/text-white/g, 'text-gray-900');
});
content = fixedLines.join('\n');

// Fix the TabsList bg-white → bg-gray-100
content = content.replace(
  /TabsList className="bg-white border/g,
  'TabsList className="bg-gray-100 border'
);

// Fix border-dashed visibility: ensure border-dashed cards have visible borders
content = content.replace(
  /border-gray-200 border-dashed/g,
  'border-gray-300 border-dashed'
);

fs.writeFileSync(filePath, content, 'utf-8');

// Verification
const verify = fs.readFileSync(filePath, 'utf-8');
console.log('=== Restyle Complete ===');
console.log('Original size:', origLen, '-> New size:', verify.length);
console.log('Total class replacements:', changeCount);
console.log('');
console.log('=== Verification ===');
console.log('bg-[#111]:', (verify.match(/bg-\[#111\]/g) || []).length);
console.log('bg-[#1a1a1a]:', (verify.match(/bg-\[#1a1a1a\]/g) || []).length);
console.log('bg-emerald-:', (verify.match(/bg-emerald-/g) || []).length, '(should be ~5 for bg-emerald-50)');
console.log('border-gray-700:', (verify.match(/border-gray-700/g) || []).length);
console.log('border-gray-800:', (verify.match(/border-gray-800/g) || []).length);
console.log('text-emerald-:', (verify.match(/text-emerald-/g) || []).length);
console.log('text-gray-200:', (verify.match(/text-gray-200/g) || []).length);
console.log('text-gray-300:', (verify.match(/text-gray-300/g) || []).length);
console.log('text-gray-400:', (verify.match(/text-gray-400/g) || []).length);
console.log('text-white:', (verify.match(/text-white/g) || []).length, '(should be on primary buttons only)');
console.log('text-gray-900:', (verify.match(/text-gray-900/g) || []).length);
console.log('bg-[#054700]:', (verify.match(/bg-\[#054700\]/g) || []).length);
console.log('bg-white:', (verify.match(/bg-white/g) || []).length);
