'use strict';

// ---------- State ----------
const LANGS = ['zh', 'ja', 'vi', 'bg'];
let lang = localStorage.getItem('lang') || 'zh';
let deck = null;        // { base, title, cards }
let index = 0;
let playToken = 0;      // cancels an in-flight play sequence when card changes

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const homeEl = $('home');
const playerEl = $('player');
const deckListEl = $('deckList');
const mediaEl = $('media');
const enTextEl = $('enText');
const trTextEl = $('trText');
const deckNameEl = $('deckName');
const progressEl = $('progress');
const playBtn = $('playBtn');
const prevBtn = $('prevBtn');
const nextBtn = $('nextBtn');

// ---------- Home ----------
async function initHome() {
  const data = await fetch('decks.json').then(r => r.json());
  deckListEl.innerHTML = '';
  for (const d of data.decks) {
    const btn = document.createElement('button');
    btn.className = 'deck-card';
    btn.innerHTML = `<span class="deck-emoji">${d.emoji}</span><span>${d.title.zh}</span>`;
    btn.onclick = () => openDeck(d);
    deckListEl.appendChild(btn);
  }
  for (const d of (data.comingSoon || [])) {
    const btn = document.createElement('button');
    btn.className = 'deck-card soon';
    btn.disabled = true;
    btn.innerHTML = `<span class="deck-emoji">${d.emoji}</span><span>${d.title.zh}</span><span class="badge">即將推出</span>`;
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
  deckNameEl.textContent = cards.title.zh;
  homeEl.classList.add('hidden');
  playerEl.classList.remove('hidden');
  render();
}

// ---------- Render a card ----------
function render() {
  playToken++; // cancel any running sequence
  stopAllAudio();
  const card = deck.cards[index];
  progressEl.textContent = `${index + 1} / ${deck.cards.length}`;
  enTextEl.textContent = card.text.en;
  trTextEl.textContent = card.text[lang] || '';
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

async function playSequence() {
  const token = ++playToken;
  stopAllAudio();
  setPlaying(true);
  const card = deck.cards[index];

  // Start video (muted) alongside the English audio
  const v = mediaEl.querySelector('video');
  if (v) { try { v.currentTime = 0; await v.play().catch(() => {}); } catch (e) {} }

  const en = audioPath(card, 'en');
  await playClip(en, 0.9, token);   // 1st: slightly slow
  if (token !== playToken) return;
  await playClip(en, 0.7, token);   // 2nd: slower, clearer
  if (token !== playToken) return;
  await playClip(audioPath(card, lang), 1.0, token); // translation
  if (token !== playToken) return;

  if (v) { try { v.pause(); } catch (e) {} }
  setPlaying(false);
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
  const token = ++playToken; stopAllAudio();
  const en = audioPath(deck.cards[index], 'en');
  await playClip(en, 0.9, token);
  if (token === playToken) await playClip(en, 0.7, token);
};
$('replayTr').onclick = () => {
  const token = ++playToken; stopAllAudio();
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

// Language sheet
const langSheet = $('langSheet');
function refreshLangButtons() {
  document.querySelectorAll('.lang-opt').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang));
}
$('langBtn').onclick = () => { refreshLangButtons(); langSheet.classList.remove('hidden'); };
$('langClose').onclick = () => langSheet.classList.add('hidden');
document.querySelectorAll('.lang-opt').forEach(b => {
  b.onclick = () => {
    lang = b.dataset.lang;
    localStorage.setItem('lang', lang);
    refreshLangButtons();
    langSheet.classList.add('hidden');
    if (deck) { trTextEl.textContent = deck.cards[index].text[lang] || ''; }
  };
});

// ---------- Service worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

initHome();
