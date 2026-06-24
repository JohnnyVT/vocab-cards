#!/usr/bin/env node
// Generate the 3 animal video cards as seamless-looping SVG animations,
// render frames with headless Chrome, and encode to H.264 .mp4 (iPad-safe).
// Also writes a poster .webp (first frame) for each.
//
//   node scripts/gen-videos.mjs
//
// Output: content/animals/assets/video/<id>.mp4  +  assets/img/<id>.webp (poster)
// Hand-authored placeholders (offline, zero-cost). Replace the same-named .mp4
// with a real Grok clip later — no code change needed.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO_DIR = join(ROOT, 'content/animals/assets/video');
const IMG_DIR = join(ROOT, 'content/animals/assets/img');
const SIZE = 512;
const FPS = 18;
const FRAMES = 36;            // 2.0s seamless loop
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const TAU = Math.PI * 2;
const eye = (cx, cy, r = 16) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>
   <circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="#2b2b3a"/>`;
const closedEye = (cx, cy, w = 22) =>
  `<path d="M${cx - w} ${cy} q${w} ${w * 0.7} ${w * 2} 0" stroke="#3a2a1d" stroke-width="6" fill="none" stroke-linecap="round"/>`;
const frame = (bg, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="${bg}"/>${body}</svg>`;

// ---- scenes (t = loop phase in [0,1)) --------------------------------------
const scenes = {
  // A bird flapping across a blue sky.
  'bird-fly'(t) {
    const a = TAU * t;
    const bob = Math.sin(a) * 22;
    const drift = Math.sin(a) * 40;       // gentle left-right glide
    const flap = Math.sin(a * 3) * 32;    // wings beat ~3x per loop
    const cx = 256 + drift, cy = 250 + bob;
    const wing = (dir) => `
      <g transform="translate(${cx} ${cy - 8}) rotate(${dir * flap})">
        <path d="M0 0 q${dir * 90} -54 ${dir * 130} -8 q${dir * -60} 30 ${dir * -130} 8 Z" fill="#3a8fc9"/>
      </g>`;
    return frame('#bfe8ff', `
      <rect width="512" height="512" fill="url(#sky)"/>
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#bfe8ff"/><stop offset="1" stop-color="#eef9ff"/></linearGradient></defs>
      <ellipse cx="${(120 + drift * 0.3)}" cy="120" rx="64" ry="30" fill="#ffffff" opacity=".85"/>
      <ellipse cx="${(400 - drift * 0.3)}" cy="180" rx="78" ry="34" fill="#ffffff" opacity=".8"/>
      ${wing(-1)}
      <ellipse cx="${cx}" cy="${cy}" rx="96" ry="82" fill="#4aa3df"/>
      <ellipse cx="${cx - 6}" cy="${cy + 16}" rx="58" ry="58" fill="#eaf6ff"/>
      <circle cx="${cx + 64}" cy="${cy - 36}" r="58" fill="#4aa3df"/>
      <path d="M${cx + 112} ${cy - 40} l48 -12 l-40 34 Z" fill="#f6a623"/>
      ${eye(cx + 78, cy - 44, 14)}
      ${wing(1)}`);
  },

  // A cat curled up asleep, breathing, with rising Z's.
  'cat-sleep'(t) {
    const a = TAU * t;
    const breathe = 1 + Math.sin(a) * 0.035;
    const z = (i) => {
      const p = (t + i / 3) % 1;          // each Z staggered across the loop
      const y = 150 - p * 90;
      const op = Math.max(0, 1 - p) * (p < 0.12 ? p / 0.12 : 1);
      const s = 18 + i * 8;
      return `<text x="${330 + p * 30}" y="${y}" font-family="sans-serif" font-size="${s}"
        font-weight="800" fill="#9a86b8" opacity="${op.toFixed(2)}">Z</text>`;
    };
    return frame('#f3ecff', `
      <rect width="512" height="512" fill="#f3ecff"/>
      <ellipse cx="256" cy="430" rx="210" ry="44" fill="#e3d7f7"/>
      <g transform="translate(256 360) scale(${breathe.toFixed(3)}) translate(-256 -360)">
        <ellipse cx="256" cy="356" rx="180" ry="104" fill="#f4a14a"/>
        <path d="M96 356 q-70 -30 -40 -86 q40 -16 56 26" fill="none" stroke="#f4a14a" stroke-width="34" stroke-linecap="round"/>
        <circle cx="350" cy="316" r="84" fill="#f4a14a"/>
        <path d="M300 250 l-14 -50 l46 26 Z" fill="#f4a14a"/>
        <path d="M392 250 l16 -48 l-44 28 Z" fill="#f4a14a"/>
        ${closedEye(322, 312, 18)}
        ${closedEye(380, 312, 16)}
        <path d="M352 338 l-12 12 h22 Z" fill="#d97e2a"/>
        <path d="M214 330 h-70 M214 348 h-64" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>
      </g>
      ${z(0)}${z(1)}${z(2)}`);
  },

  // A dog running to the right, legs cycling, ground streaking past.
  'dog-run'(t) {
    const a = TAU * t;
    const bob = Math.abs(Math.sin(a * 2)) * -14;       // bounce
    const ear = Math.sin(a * 2) * 14;
    const swing = (ph) => Math.sin(a * 2 + ph) * 26;   // leg swing
    const cy = 300 + bob;
    const leg = (x, ph, back) => `
      <g transform="translate(${x} ${cy + 70}) rotate(${swing(ph)})">
        <rect x="-9" y="0" width="18" height="78" rx="9" fill="${back ? '#8a5e38' : '#a9774a'}"/>
      </g>`;
    // moving ground dashes (seamless: offset wraps over one dash period)
    const period = 90, off = (t * period);
    let dashes = '';
    for (let i = -1; i < 7; i++) dashes += `<rect x="${i * period + off}" y="452" width="46" height="9" rx="4" fill="#cdbb9a"/>`;
    return frame('#eef4dc', `
      <rect width="512" height="512" fill="#eef4dc"/>
      <rect y="448" width="512" height="64" fill="#dfe7c2"/>
      ${dashes}
      ${leg(190, 0, true)}${leg(320, Math.PI, true)}
      <ellipse cx="256" cy="${cy}" rx="150" ry="92" fill="#a9774a"/>
      ${leg(210, Math.PI, false)}${leg(300, 0, false)}
      <ellipse cx="256" cy="${cy + 18}" rx="100" ry="64" fill="#e8d3b8"/>
      <circle cx="392" cy="${cy - 30}" r="74" fill="#a9774a"/>
      <path d="M356 ${cy - 92} q-44 ${ear} -30 70 q26 -8 44 -44 Z" fill="#7d5230"/>
      <ellipse cx="442" cy="${cy - 18}" rx="22" ry="17" fill="#3a2a1d"/>
      ${eye(404, cy - 44, 14)}
      <path d="M132 ${cy - 26} q-40 -6 -58 18 q34 14 60 -2 Z" fill="#a9774a"/>`);
  },
};

// ---- render + encode --------------------------------------------------------
mkdirSync(VIDEO_DIR, { recursive: true });
mkdirSync(IMG_DIR, { recursive: true });

for (const [id, sceneFn] of Object.entries(scenes)) {
  const tmp = mkdtempSync(join(tmpdir(), `kva-${id}-`));
  for (let f = 0; f < FRAMES; f++) {
    const svgPath = join(tmp, `f${String(f).padStart(3, '0')}.svg`);
    const pngPath = join(tmp, `f${String(f).padStart(3, '0')}.png`);
    writeFileSync(svgPath, sceneFn(f / FRAMES));
    execFileSync(CHROME, [
      '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--screenshot=${pngPath}`, `--window-size=${SIZE},${SIZE}`, svgPath,
    ], { stdio: 'ignore' });
  }
  const mp4 = join(VIDEO_DIR, `${id}.mp4`);
  execFileSync('ffmpeg', [
    '-y', '-framerate', String(FPS), '-i', join(tmp, 'f%03d.png'),
    '-c:v', 'libx264', '-profile:v', 'baseline', '-pix_fmt', 'yuv420p',
    '-crf', '26', '-movflags', '+faststart', '-an', mp4,
  ], { stdio: 'ignore' });
  execFileSync('cwebp', ['-quiet', '-q', '88', join(tmp, 'f000.png'),
    '-o', join(IMG_DIR, `${id}.webp`)]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`✓ ${id}.mp4 (+ poster ${id}.webp)`);
}
console.log(`\nDone: ${Object.keys(scenes).length} videos → ${VIDEO_DIR}`);
