#!/usr/bin/env node
// Generate per-card animal SOUND EFFECTS with ElevenLabs (text-to-sound-effects).
//   node --env-file=.env scripts/gen-sounds.mjs
//
// Writes: content/animals/assets/audio/sfx/<id>.mp3
// Skips files that already exist (delete one to regenerate it).
//
// NOTE: the ElevenLabs API key must have the `sound_generation` permission
// (Dashboard -> API Keys -> edit key -> enable Sound Generation), otherwise
// the API returns 401 missing_permissions.

import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'content/animals/assets/audio/sfx');

// Per-card sound-effect prompts. Animals without an obvious voice (fish, rabbit)
// get a gentle ambient cue instead. Sentence cards reuse the base animal sound.
const SOUNDS = {
  bird:      'a small songbird chirping cheerfully, a few clear tweets',
  cat:       'a cute cat meowing softly twice',
  dog:       'a friendly small dog barking happily, woof woof',
  fish:      'gentle underwater water bubbles, soft and calm',
  rabbit:    'a soft cute rabbit squeak and sniffing',
  elephant:  'an elephant trumpeting once, clear and friendly',
  duck:      'a duck quacking a few times, cheerful',
  'bird-fly':  'a bird flapping wings and chirping while flying',
  'cat-sleep': 'a cat purring softly and gently, sleepy',
  'dog-run':   'a happy dog panting and running, light footsteps',
};

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) { console.error('✗ Missing ELEVENLABS_API_KEY'); process.exit(1); }
const exists = (p) => access(p).then(() => true, () => false);

async function sfx(text) {
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, duration_seconds: 2.5, prompt_influence: 0.6 }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

await mkdir(OUT_DIR, { recursive: true });
let made = 0, skipped = 0;
for (const [id, prompt] of Object.entries(SOUNDS)) {
  const out = join(OUT_DIR, `${id}.mp3`);
  if (await exists(out)) { skipped++; continue; }
  process.stdout.write(`→ sfx/${id}.mp3  "${prompt.slice(0, 32)}…" ... `);
  await writeFile(out, await sfx(prompt));
  made++; console.log('ok');
}
console.log(`\nDone. Generated ${made}, skipped ${skipped}.`);
