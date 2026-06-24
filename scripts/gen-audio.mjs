#!/usr/bin/env node
// Generate per-language MP3 voice clips for a deck using ElevenLabs.
//
// Usage:
//   ELEVENLABS_API_KEY=sk_... node scripts/gen-audio.mjs content/animals/cards.json
//
// Writes: <deckDir>/assets/audio/<lang>/<cardId>.mp3
// Skips files that already exist (delete a file to regenerate it).

import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';

// Per-language config. Chinese uses turbo_v2_5 with an explicit language_code
// so single shared CJK characters (e.g. 鳥) aren't misread as Japanese; the
// other languages stay on multilingual_v2 (already approved).
const ML = 'eleven_multilingual_v2';
const LANGS = {
  en: { voice: '2OEeJcYw2f3bWMzzjVMU', model: ML },
  zh: { voice: 'APSIkVZudNbPAwyPoeVO', model: 'eleven_turbo_v2_5', languageCode: 'zh',
        settings: { stability: 0.75, similarity_boost: 0.8 } },
  ja: { voice: '3321Alera3fXjEWjjbAX', model: ML },
  vi: { voice: 'IovBBFnLZ6QzJhFLLroy', model: ML },
  bg: { voice: 'M1ydWt7KnBCiuv4CnEDC', model: ML },
};
// Higher stability => more consistent prosody and fewer mispronunciations.
const DEFAULT_SETTINGS = { stability: 0.75, similarity_boost: 0.8, style: 0.3 };

const API_KEY = process.env.ELEVENLABS_API_KEY;
const cardsPath = process.argv[2] || 'content/animals/cards.json';

if (!API_KEY) {
  console.error('✗ Missing ELEVENLABS_API_KEY environment variable.');
  process.exit(1);
}

const exists = (p) => access(p).then(() => true, () => false);

async function tts(text, cfg) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${cfg.voice}?output_format=mp3_44100_128`;
  const body = {
    text,
    model_id: cfg.model,
    voice_settings: cfg.settings || DEFAULT_SETTINGS,
  };
  if (cfg.languageCode) body.language_code = cfg.languageCode;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const deckDir = dirname(resolve(cardsPath));
  const deck = JSON.parse(await readFile(cardsPath, 'utf8'));
  const langs = Object.keys(LANGS);
  let made = 0, skipped = 0;

  for (const card of deck.cards) {
    for (const lang of langs) {
      const text = card.text[lang];
      if (!text) continue;
      const outDir = join(deckDir, 'assets', 'audio', lang);
      const outFile = join(outDir, `${card.id}.mp3`);
      if (await exists(outFile)) { skipped++; continue; }
      await mkdir(outDir, { recursive: true });
      process.stdout.write(`→ ${lang}/${card.id}.mp3  "${text}" ... `);
      const mp3 = await tts(text, LANGS[lang]);
      await writeFile(outFile, mp3);
      made++;
      console.log('ok');
    }
  }
  console.log(`\nDone. Generated ${made}, skipped ${skipped} (already existed).`);
}

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
