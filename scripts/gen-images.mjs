#!/usr/bin/env node
// Generate the 7 animal flashcard images as flat-illustration SVGs,
// rasterize them with headless Chrome (transparent), and convert to .webp.
//
//   node scripts/gen-images.mjs
//
// Output: content/animals/assets/img/<id>.webp
// These are hand-authored placeholders (consistent, offline, zero-cost).
// Drop a nicer same-named .webp in later to override — no code change needed.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'content/animals/assets/img');
const SIZE = 512;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ---- shared illustration helpers -------------------------------------------
const SVG = (bg, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 512 512">
    <defs>
      <radialGradient id="spot" cx="50%" cy="42%" r="62%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".55"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="512" height="512" rx="72" fill="${bg}"/>
    <rect x="0" y="0" width="512" height="512" rx="72" fill="url(#spot)"/>
    ${body}
  </svg>`;

const eye = (cx, cy, r = 17) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>
   <circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="#2b2b3a"/>
   <circle cx="${cx + r * 0.28}" cy="${cy - r * 0.32}" r="${r * 0.22}" fill="#fff"/>`;

// ---- the 7 animals ----------------------------------------------------------
const animals = {
  bird: SVG('#cdeffd', `
    <ellipse cx="256" cy="318" rx="120" ry="104" fill="#4aa3df"/>
    <ellipse cx="248" cy="338" rx="74" ry="78" fill="#eaf6ff"/>
    <path d="M150 300 q-44 6 -64 44 q44 8 78 -10 Z" fill="#3a8fc9"/>
    <circle cx="312" cy="232" r="78" fill="#4aa3df"/>
    <path d="M376 230 l58 -16 l-48 40 Z" fill="#f6a623"/>
    ${eye(330, 222, 18)}
    <path d="M232 420 l-14 36 M268 420 l-2 40" stroke="#f6a623" stroke-width="12" stroke-linecap="round"/>
  `),

  cat: SVG('#ffe2c2', `
    <path d="M168 168 l-22 -78 l78 44 Z" fill="#f4a14a"/>
    <path d="M344 168 l22 -78 l-78 44 Z" fill="#f4a14a"/>
    <path d="M178 150 l-8 -42 l40 28 Z" fill="#ffd0a8"/>
    <path d="M334 150 l8 -42 l-40 28 Z" fill="#ffd0a8"/>
    <circle cx="256" cy="262" r="138" fill="#f4a14a"/>
    <path d="M150 232 q14 -20 40 -14 M362 232 q-14 -20 -40 -14" stroke="#d97e2a" stroke-width="9" fill="none" stroke-linecap="round"/>
    ${eye(212, 256, 22)}
    ${eye(300, 256, 22)}
    <path d="M256 296 l-16 14 h32 Z" fill="#d97e2a"/>
    <path d="M256 310 v16 M256 326 q-14 8 -26 2 M256 326 q14 8 26 2" stroke="#a85c1c" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M150 300 h-72 M150 318 h-64 M362 300 h72 M362 318 h64" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>
  `),

  dog: SVG('#e7dcc6', `
    <ellipse cx="150" cy="300" rx="52" ry="94" fill="#7d5230"/>
    <ellipse cx="362" cy="300" rx="52" ry="94" fill="#7d5230"/>
    <circle cx="256" cy="262" r="142" fill="#a9774a"/>
    <ellipse cx="256" cy="320" rx="96" ry="86" fill="#e8d3b8"/>
    ${eye(214, 240, 21)}
    ${eye(298, 240, 21)}
    <ellipse cx="256" cy="306" rx="26" ry="20" fill="#3a2a1d"/>
    <path d="M256 326 v22 M256 348 q-18 10 -34 0 M256 348 q18 10 34 0" stroke="#3a2a1d" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M256 360 q24 26 52 14" stroke="#e8607a" stroke-width="16" fill="none" stroke-linecap="round"/>
  `),

  fish: SVG('#c7f0ec', `
    <path d="M150 256 l-72 -56 v112 Z" fill="#f08a3c"/>
    <ellipse cx="278" cy="256" rx="150" ry="108" fill="#ff9e4f"/>
    <path d="M278 148 q40 -34 70 -20 q-6 34 -34 52 Z" fill="#f08a3c"/>
    <path d="M278 364 q40 34 70 20 q-6 -34 -34 -52 Z" fill="#f08a3c"/>
    <path d="M210 200 q-6 56 0 112 M260 188 q-6 68 0 136" stroke="#f08a3c" stroke-width="8" fill="none" opacity=".55"/>
    ${eye(360, 232, 20)}
    <path d="M396 286 q-20 18 -44 8" stroke="#c96a22" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="430" cy="150" r="12" fill="#bfeee9"/>
    <circle cx="458" cy="118" r="8" fill="#bfeee9"/>
  `),

  rabbit: SVG('#ffe0ea', `
    <ellipse cx="214" cy="150" rx="34" ry="104" fill="#f2f2f7" transform="rotate(-12 214 150)"/>
    <ellipse cx="298" cy="150" rx="34" ry="104" fill="#f2f2f7" transform="rotate(12 298 150)"/>
    <ellipse cx="214" cy="150" rx="16" ry="74" fill="#ffc2d6" transform="rotate(-12 214 150)"/>
    <ellipse cx="298" cy="150" rx="16" ry="74" fill="#ffc2d6" transform="rotate(12 298 150)"/>
    <circle cx="256" cy="312" r="132" fill="#f2f2f7"/>
    ${eye(214, 300, 20)}
    ${eye(298, 300, 20)}
    <path d="M256 340 l-14 14 h28 Z" fill="#ff8fb0"/>
    <path d="M256 354 v12 M256 366 q-16 8 -28 0 M256 366 q16 8 28 0" stroke="#d98aa0" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="190" cy="356" r="20" fill="#ffd1de" opacity=".8"/>
    <circle cx="322" cy="356" r="20" fill="#ffd1de" opacity=".8"/>
  `),

  elephant: SVG('#dfe6ec', `
    <ellipse cx="150" cy="262" rx="86" ry="100" fill="#9aa7b4"/>
    <ellipse cx="150" cy="262" rx="54" ry="66" fill="#bcc6d1"/>
    <circle cx="300" cy="262" r="150" fill="#9aa7b4"/>
    <path d="M286 360 q-30 60 -6 110 q34 6 40 -34" fill="#9aa7b4"/>
    <path d="M286 360 q-26 54 -8 98" stroke="#7d8a98" stroke-width="6" fill="none" opacity=".5"/>
    ${eye(286, 236, 18)}
    ${eye(370, 236, 18)}
    <path d="M300 396 q-14 22 6 30 M360 396 q14 22 -6 30" stroke="#f2f2f0" stroke-width="14" fill="none" stroke-linecap="round"/>
  `),

  duck: SVG('#d8f1d0', `
    <ellipse cx="262" cy="320" rx="138" ry="100" fill="#ffd23f"/>
    <path d="M150 318 q-30 8 -42 34 q40 10 70 -8 Z" fill="#f4be22"/>
    <circle cx="338" cy="220" r="84" fill="#ffd23f"/>
    <path d="M404 206 l72 6 l-66 34 q-14 -22 -6 -40 Z" fill="#f4942a"/>
    <path d="M404 240 l60 2" stroke="#d97b1c" stroke-width="5" fill="none"/>
    ${eye(348, 206, 17)}
    <path d="M230 416 l-10 28 M286 416 l-2 30" stroke="#f4942a" stroke-width="11" stroke-linecap="round"/>
  `),
};

// ---- render -----------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'kva-img-'));
let ok = 0;
for (const [id, svg] of Object.entries(animals)) {
  const svgPath = join(tmp, `${id}.svg`);
  const pngPath = join(tmp, `${id}.png`);
  const outPath = join(OUT_DIR, `${id}.webp`);
  writeFileSync(svgPath, svg);
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--default-background-color=00000000',
    `--screenshot=${pngPath}`, `--window-size=${SIZE},${SIZE}`, svgPath,
  ], { stdio: 'ignore' });
  execFileSync('cwebp', ['-quiet', '-q', '90', pngPath, '-o', outPath]);
  console.log(`✓ ${id}.webp`);
  ok++;
}
rmSync(tmp, { recursive: true, force: true });
console.log(`\nDone: ${ok}/${Object.keys(animals).length} images → ${OUT_DIR}`);
