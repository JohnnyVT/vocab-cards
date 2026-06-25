'use strict';

// ---------- State ----------
// One language setting drives the whole app (UI + card translation).
// 'en' = English-only interface (cards show just the English word, no translation).
const LANGS = ['en', 'zh', 'ja', 'vi', 'bg'];
let lang = localStorage.getItem('lang') || 'en';
let decksData = null;   // cached decks.json so the home list can re-render on language change
let deck = null;        // { base, title, cards }
let index = 0;
let playToken = 0;      // cancels an in-flight play sequence when card changes

// Flag + native name for each language (used by the switch button and replay labels).
const LANG_FLAG = { en: '🇬🇧', zh: '🇹🇼', ja: '🇯🇵', vi: '🇻🇳', bg: '🇧🇬' };
const LANG_NAME = { en: 'English', zh: '中文', ja: '日本語', vi: 'Tiếng Việt', bg: 'Български' };

// UI strings per interface language.
const I18N = {
  en: { homeTitle: '📚 My Flashcards', homeHint: 'Pick a set to start learning!', soon: 'Coming soon', sheet: 'Language', close: 'Close' },
  zh: { homeTitle: '📚 我的單字卡', homeHint: '挑一組開始學英文吧！', soon: '即將推出', sheet: '選擇語言', close: '關閉' },
  ja: { homeTitle: '📚 たんごカード', homeHint: 'カードを えらんで はじめよう！', soon: 'もうすぐ', sheet: '言語', close: 'とじる' },
  vi: { homeTitle: '📚 Thẻ từ vựng', homeHint: 'Chọn một bộ để bắt đầu học!', soon: 'Sắp ra mắt', sheet: 'Ngôn ngữ', close: 'Đóng' },
  bg: { homeTitle: '📚 Моите карти', homeHint: 'Избери комплект, за да започнеш!', soon: 'Очаквайте скоро', sheet: 'Език', close: 'Затвори' },
};
const t = () => I18N[lang] || I18N.en;
const titleOf = (obj) => (obj && (obj[lang] || obj.en)) || '';

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const homeEl = $('home');
const playerEl = $('player');
const deckListEl = $('deckList');
const mediaEl = $('media');
const enTextEl = $('enText');
const trTextEl = $('trText');
const deckNameEl = $('deckName');
const progressFillEl = $('progressFill');
const playBtn = $('playBtn');
const prevBtn = $('prevBtn');
const nextBtn = $('nextBtn');

// ---------- Home ----------
async function initHome() {
  decksData = await fetch('decks.json').then(r => r.json());
  applyLang();
}

function renderHome() {
  if (!decksData) return;
  deckListEl.innerHTML = '';
  for (const d of decksData.decks) {
    const btn = document.createElement('button');
    btn.className = 'deck-card';
    btn.innerHTML = `<span class="deck-emoji">${d.emoji}</span><span>${titleOf(d.title)}</span>`;
    btn.onclick = () => openDeck(d);
    deckListEl.appendChild(btn);
  }
  for (const d of (decksData.comingSoon || [])) {
    const btn = document.createElement('button');
    btn.className = 'deck-card soon';
    btn.disabled = true;
    btn.innerHTML = `<span class="deck-emoji">${d.emoji}</span><span>${titleOf(d.title)}</span><span class="badge">${t().soon}</span>`;
    deckListEl.appendChild(btn);
  }
}

async function openDeck(d) {
  const cards = await fetch(d.path).then(r => r.json());
  deck = {
    base: d.path.replace(/[^/]+$/, ''), // content/animals/
    title: cards.title,
    cards: cards.cards,
  };
  index = 0;
  deckNameEl.textContent = titleOf(cards.title);
  homeEl.classList.add('hidden');
  playerEl.classList.remove('hidden');
  render();
  playSequence();   // auto-play the first card on entering a deck
}

// ---------- Render a card ----------
function render() {
  playToken++; // cancel any running sequence
  stopAllAudio();
  const card = deck.cards[index];
  progressFillEl.style.width = `${((index + 1) / deck.cards.length) * 100}%`;
  enTextEl.textContent = card.text.en;
  trTextEl.textContent = lang === 'en' ? '' : (card.text[lang] || '');
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === deck.cards.length - 1;
  buildMedia(card);
  setPlaying(false);
}

function buildMedia(card) {
  mediaEl.innerHTML = '';
  const showEmoji = () => {
    mediaEl.innerHTML = `<div class="emoji-fallback">${card.emoji || '❓'}</div>`;
  };
  if (card.type === 'video') {
    const v = document.createElement('video');
    v.src = deck.base + card.media;
    if (card.poster) v.poster = deck.base + card.poster;
    v.playsInline = true;
    v.muted = true;          // English audio is layered separately
    v.loop = true;           // gently loop the short clip while narration plays
    v.preload = 'metadata';
    v.onerror = showEmoji;    // no video yet -> emoji placeholder
    mediaEl.appendChild(v);
    // If the source never loads, fall back to emoji.
    v.addEventListener('stalled', showEmoji, { once: true });
  } else {
    const img = new Image();
    img.src = deck.base + card.media;
    img.alt = card.text.en;
    img.onerror = showEmoji;  // no image yet -> emoji placeholder
    mediaEl.appendChild(img);
  }
}

// ---------- Audio ----------
let activeAudio = [];
function stopAllAudio() {
  activeAudio.forEach(a => { try { a.pause(); } catch (e) {} });
  activeAudio = [];
  const v = mediaEl.querySelector('video');
  if (v) { try { v.pause(); v.currentTime = 0; } catch (e) {} }
}

function playClip(src, rate, token) {
  return new Promise((resolve) => {
    if (token !== playToken) return resolve();
    const a = new Audio(src);
    a.playbackRate = rate;
    if ('preservesPitch' in a) a.preservesPitch = true;
    activeAudio.push(a);
    const done = () => resolve();
    a.onended = done;
    a.onerror = done;          // missing audio file -> skip gracefully
    a.play().catch(done);
  });
}

function audioPath(card, l) {
  return `${deck.base}assets/audio/${l}/${card.id}.mp3`;
}
function sfxPath(card) {
  return `${deck.base}assets/audio/sfx/${card.id}.mp3`;
}

async function playSequence() {
  const token = ++playToken;
  stopAllAudio();
  setPlaying(true);
  const card = deck.cards[index];

  // Start video (muted) alongside the audio
  const v = mediaEl.querySelector('video');
  if (v) { try { v.currentTime = 0; await v.play().catch(() => {}); } catch (e) {} }

  // Animal sound effect first (skips gracefully if the file doesn't exist).
  await playClip(sfxPath(card), 1.0, token);
  if (token !== playToken) return;

  const en = audioPath(card, 'en');
  await playClip(en, 0.9, token);   // 1st: slightly slow
  if (token === playToken) await playClip(en, 0.7, token);   // 2nd: slower, clearer
  if (token === playToken && lang !== 'en') {                // English-only mode: no translation clip
    await playClip(audioPath(card, lang), 1.0, token);       // translation
  }

  // Only the still-current sequence resets the UI; an interrupting action
  // (replay / re-tap / card change) owns the state instead.
  if (token === playToken) {
    if (v) { try { v.pause(); } catch (e) {} }
    setPlaying(false);
  }
}

function setPlaying(on) {
  playBtn.classList.toggle('playing', on);
  playBtn.textContent = on ? '❚❚' : '▶';
}

// ---------- Navigation ----------
function go(delta) {
  const next = index + delta;
  if (next < 0 || next >= deck.cards.length) return;
  index = next;
  render();
  playSequence();   // auto-play the new card
}

// ---------- Events ----------
playBtn.onclick = () => {
  if (playBtn.classList.contains('playing')) {
    playToken++; stopAllAudio(); setPlaying(false);
  } else {
    playSequence();
  }
};
prevBtn.onclick = () => go(-1);
nextBtn.onclick = () => go(1);

$('replayEn').onclick = async () => {
  const token = ++playToken; stopAllAudio(); setPlaying(false);
  const en = audioPath(deck.cards[index], 'en');
  await playClip(en, 0.9, token);
  if (token === playToken) await playClip(en, 0.7, token);
};
$('replayTr').onclick = () => {
  if (lang === 'en') return;       // no translation in English-only mode
  const token = ++playToken; stopAllAudio(); setPlaying(false);
  playClip(audioPath(deck.cards[index], lang), 1.0, token);
};

$('backBtn').onclick = () => {
  playToken++; stopAllAudio();
  playerEl.classList.add('hidden');
  homeEl.classList.remove('hidden');
};

// Swipe
let touchX = null;
$('player').addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
$('player').addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
  touchX = null;
}, { passive: true });

// Language sheet (shared by the home and player 🌐 buttons)
const langSheet = $('langSheet');

// Apply the current language across the whole UI.
function applyLang() {
  const s = t();
  $('homeTitle').textContent = s.homeTitle;
  $('homeHint').textContent = s.homeHint;
  $('langSheetTitle').textContent = s.sheet;
  $('langClose').textContent = s.close;
  // Language switch buttons: flag + name (home + player).
  const switchHtml = `<span class="flag">${LANG_FLAG[lang]}</span><span>${LANG_NAME[lang]}</span>`;
  $('langBtn').innerHTML = switchHtml;
  $('homeLangBtn').innerHTML = switchHtml;
  // Replay buttons: round flag icons (left = English, right = translation).
  const en = $('replayEn'), tr = $('replayTr');
  en.style.backgroundImage = 'url(assets/flags/en.svg)';
  en.setAttribute('aria-label', `Play ${LANG_NAME.en}`);
  tr.style.backgroundImage = `url(assets/flags/${lang}.svg)`;
  tr.setAttribute('aria-label', `Play ${LANG_NAME[lang]}`);
  tr.hidden = (lang === 'en');   // no translation in English-only mode
  document.documentElement.lang = lang;
  document.querySelectorAll('.lang-opt').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang));
  renderHome();
  if (deck) {
    deckNameEl.textContent = titleOf(deck.title);
    trTextEl.textContent = lang === 'en' ? '' : (deck.cards[index].text[lang] || '');
  }
}

const openLangSheet = () => langSheet.classList.remove('hidden');
$('langBtn').onclick = openLangSheet;
$('homeLangBtn').onclick = openLangSheet;
$('langClose').onclick = () => langSheet.classList.add('hidden');
document.querySelectorAll('.lang-opt').forEach(b => {
  b.onclick = () => {
    lang = b.dataset.lang;
    localStorage.setItem('lang', lang);
    langSheet.classList.add('hidden');
    applyLang();
  };
});

// ---------- Service worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

initHome();
