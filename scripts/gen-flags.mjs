#!/usr/bin/env node
// Generate round flag icons (SVG) for the replay buttons.
//   node scripts/gen-flags.mjs
// Output: assets/flags/<lang>.svg  (100x100, clipped to a circle)

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'flags');

// star path: n points, alternating outer/inner radius, first tip pointing up
function star(cx, cy, outer, inner, n, rotDeg = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (rotDeg + (180 / n) * i) * Math.PI / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

const wrap = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs>
  <g clip-path="url(#c)">${body}</g>
</svg>`;

const flags = {
  // Japan: white field, red disc
  ja: `<rect width="100" height="100" fill="#fff"/><circle cx="50" cy="50" r="25" fill="#BC002D"/>`,

  // Bulgaria: white / green / red stripes
  bg: `<rect width="100" height="100" fill="#fff"/>
       <rect y="33.33" width="100" height="33.34" fill="#00966E"/>
       <rect y="66.67" width="100" height="33.33" fill="#D62612"/>`,

  // Vietnam: red field, yellow five-point star
  vi: `<rect width="100" height="100" fill="#DA251D"/>
       <path d="${star(50, 50, 31, 12.5, 5)}" fill="#FFFF00"/>`,

  // Taiwan: red field, blue canton, white 12-ray sun
  zh: `<rect width="100" height="100" fill="#FE0000"/>
       <rect width="50" height="50" fill="#000095"/>
       <path d="${star(25, 25, 15, 8, 12)}" fill="#fff"/>
       <circle cx="25" cy="25" r="6.4" fill="#000095"/>
       <circle cx="25" cy="25" r="3.4" fill="#fff"/>`,

  // United Kingdom: Union Jack (simplified, symmetric)
  en: `<rect width="100" height="100" fill="#012169"/>
       <g stroke="#fff" stroke-width="20"><line x1="0" y1="0" x2="100" y2="100"/><line x1="100" y1="0" x2="0" y2="100"/></g>
       <g stroke="#C8102E" stroke-width="8"><line x1="0" y1="0" x2="100" y2="100"/><line x1="100" y1="0" x2="0" y2="100"/></g>
       <g stroke="#fff" stroke-width="30"><line x1="50" y1="0" x2="50" y2="100"/><line x1="0" y1="50" x2="100" y2="50"/></g>
       <g stroke="#C8102E" stroke-width="18"><line x1="50" y1="0" x2="50" y2="100"/><line x1="0" y1="50" x2="100" y2="50"/></g>`,
};

mkdirSync(OUT, { recursive: true });
for (const [id, body] of Object.entries(flags)) {
  writeFileSync(join(OUT, `${id}.svg`), wrap(body) + '\n');
  console.log(`✓ ${id}.svg`);
}
console.log(`\nDone → ${OUT}`);
