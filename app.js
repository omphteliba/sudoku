'use strict';
/* Sudoku – werbefrei, offline, alle Daten bleiben lokal. */

// ================= Hilfsfunktionen =================
const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function dayKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function keyToDate(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function daysBetween(a, b) { return Math.round((keyToDate(b) - keyToDate(a)) / 86400000); }
function fmtTime(s) { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`; }
function starStr(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }

// ================= Sudoku-Logik =================
const PEERS = [], UNITS = [];
for (let r = 0; r < 9; r++) UNITS.push([...Array(9)].map((_, c) => r * 9 + c));
for (let c = 0; c < 9; c++) UNITS.push([...Array(9)].map((_, r) => r * 9 + c));
for (let b = 0; b < 9; b++) { const br = Math.floor(b / 3) * 3, bc = (b % 3) * 3; UNITS.push([...Array(9)].map((_, k) => (br + Math.floor(k / 3)) * 9 + bc + (k % 3))); }
const UNITS_OF = [...Array(81)].map((_, i) => UNITS.filter((u) => u.includes(i)));
for (let i = 0; i < 81; i++) { const s = new Set(); UNITS_OF[i].forEach((u) => u.forEach((j) => j !== i && s.add(j))); PEERS.push([...s]); }

function cands(g, i) { let used = 0; for (const p of PEERS[i]) used |= 1 << g[p]; return ~used & 0x3FE; }
function popcnt(m) { let c = 0; while (m) { m &= m - 1; c++; } return c; }

function countSolutions(grid, limit = 2) {
  const g = grid.slice(); let count = 0;
  (function rec() {
    let best = -1, bestM = 0, bestC = 10;
    for (let i = 0; i < 81; i++) if (!g[i]) {
      const m = cands(g, i), c = popcnt(m);
      if (!c) return false;
      if (c < bestC) { best = i; bestM = m; bestC = c; if (c === 1) break; }
    }
    if (best < 0) { count++; return count >= limit; }
    for (let d = 1; d <= 9; d++) if (bestM & (1 << d)) { g[best] = d; if (rec()) return true; }
    g[best] = 0; return false;
  })();
  return count;
}

function fullGrid(rnd) {
  const g = new Array(81).fill(0);
  (function rec(i) {
    if (i === 81) return true;
    const m = cands(g, i);
    for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd)) if (m & (1 << d)) { g[i] = d; if (rec(i + 1)) return true; }
    g[i] = 0; return false;
  })(0);
  return g;
}

// Löst nur mit einfachen Techniken (Single / Hidden Single) – Maß für "leicht".
function solvableBySingles(grid) {
  const g = grid.slice(); let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < 81; i++) if (!g[i]) {
      const m = cands(g, i); if (!m) return false;
      if (!(m & (m - 1))) { g[i] = 31 - Math.clz32(m); progress = true; }
    }
    if (progress) continue;
    for (const u of UNITS) for (let d = 1; d <= 9; d++) {
      let pos = -1, cnt = 0, present = false;
      for (const i of u) { if (g[i] === d) { present = true; break; } if (!g[i] && (cands(g, i) & (1 << d))) { cnt++; pos = i; } }
      if (!present && cnt === 1) { g[pos] = d; progress = true; }
    }
  }
  return g.every(Boolean);
}

const LEVELS = {
  leicht:  { name: 'Leicht',  givens: 40, singles: true,  points: 10 },
  mittel:  { name: 'Mittel',  givens: 32, singles: true,  points: 20 },
  schwer:  { name: 'Schwer',  givens: 27, singles: null,  points: 35 },
  experte: { name: 'Experte', givens: 24, singles: false, points: 50 },
};

function generate(level, rnd) {
  const cfg = LEVELS[level]; let last = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const sol = fullGrid(rnd), puz = sol.slice();
    let givens = 81;
    // symmetrisch entfernen – sieht aus wie in der Zeitung
    for (const i of shuffle([...Array(41).keys()], rnd)) {
      if (givens <= cfg.givens) break;
      const j = 80 - i, a = puz[i], b = puz[j];
      puz[i] = 0; puz[j] = 0;
      if (countSolutions(puz) !== 1 || (cfg.singles === true && !solvableBySingles(puz))) { puz[i] = a; puz[j] = b; }
      else givens -= i === j ? 1 : 2;
    }
    last = { puzzle: puz, solution: sol };
    if (cfg.singles === false && solvableBySingles(puz)) continue;
    if (givens > cfg.givens + 4) continue;
    return last;
  }
  return last;
}

// Tagesrätsel: für jeden Tag gleich, Schwierigkeit wie in der Zeitung über die Woche steigend
const DAILY_LEVEL = ['mittel', 'leicht', 'leicht', 'mittel', 'mittel', 'schwer', 'schwer']; // So..Sa
function dailyLevel(key) { return DAILY_LEVEL[keyToDate(key).getDay()]; }

// ================= Ränge & Orden =================
const RANKS = [
  [0, 'Anfänger', '🌱'], [30, 'Lehrling', '📘'], [100, 'Geselle', '🔨'], [250, 'Meister', '🎓'],
  [500, 'Großmeister', '👑'], [1000, 'Sudoku-Professor', '🏛️'], [2000, 'Sudoku-Legende', '🌟'],
  [4000, 'Sudoku-Kaiser', '🏆'], [8000, 'Unsterblicher', '💎'],
];
function rankFor(p) { let i = 0; while (i + 1 < RANKS.length && p >= RANKS[i + 1][0]) i++; return i; }

const MEDALS = [
  { id: 'first',   icon: '🎉', name: 'Der Anfang',        desc: 'Das erste Rätsel gelöst',                 test: (d) => d.solved >= 1 },
  { id: 'ten',     icon: '🔟', name: 'Zehn Stück',        desc: '10 Rätsel gelöst',                         test: (d) => d.solved >= 10 },
  { id: 'fifty',   icon: '📚', name: 'Bücherwurm',        desc: '50 Rätsel gelöst',                         test: (d) => d.solved >= 50 },
  { id: 'hundred', icon: '💯', name: 'Hundert!',          desc: '100 Rätsel gelöst',                        test: (d) => d.solved >= 100 },
  { id: 'k500',    icon: '🗻', name: 'Gipfelstürmer',     desc: '500 Rätsel gelöst',                        test: (d) => d.solved >= 500 },
  { id: 'perfect', icon: '✨', name: 'Fehlerfrei',         desc: 'Ein Rätsel ohne Fehler und ohne Tipp',     test: (d) => d.perfect >= 1 },
  { id: 'perf25',  icon: '💎', name: 'Präzision',         desc: '25 Rätsel ohne Fehler und ohne Tipp',      test: (d) => d.perfect >= 25 },
  { id: 'daily',   icon: '☀️', name: 'Tagesmeister',      desc: 'Ein Tagesrätsel mit 3 Sternen',            test: (d, g) => g && g.mode === 'daily' && g.stars === 3 },
  { id: 'streak3', icon: '🔥', name: 'Dranbleiber',       desc: '3 Tage in Folge das Tagesrätsel',          test: (d) => d.streak.best >= 3 },
  { id: 'streak7', icon: '📅', name: 'Eine ganze Woche',  desc: '7 Tage in Folge',                          test: (d) => d.streak.best >= 7 },
  { id: 'streak30',icon: '🗓️', name: 'Monatsmeister',     desc: '30 Tage in Folge',                         test: (d) => d.streak.best >= 30 },
  { id: 'streak100',icon:'🏅', name: 'Eiserner Wille',    desc: '100 Tage in Folge',                        test: (d) => d.streak.best >= 100 },
  { id: 'hard',    icon: '🧗', name: 'Mutig',             desc: 'Ein schweres Rätsel gelöst',               test: (d) => d.byLevel.schwer >= 1 },
  { id: 'expert',  icon: '🧠', name: 'Experte',           desc: 'Ein Experten-Rätsel gelöst',               test: (d) => d.byLevel.experte >= 1 },
  { id: 'expert10',icon: '🦉', name: 'Weiser Kopf',       desc: '10 Experten-Rätsel gelöst',                test: (d) => d.byLevel.experte >= 10 },
  { id: 'clean',   icon: '🎯', name: 'Meisterschuss',     desc: 'Schwer oder Experte mit 3 Sternen',        test: (d, g) => g && (g.level === 'schwer' || g.level === 'experte') && g.stars === 3 },
  { id: 'fast',    icon: '⚡', name: 'Blitzschnell',      desc: 'Leicht unter 5 Min. oder Mittel unter 10 Min.', test: (d, g) => g && ((g.level === 'leicht' && g.seconds < 300) || (g.level === 'mittel' && g.seconds < 600)) },
  { id: 'early',   icon: '🐓', name: 'Frühaufsteher',     desc: 'Ein Rätsel vor 7 Uhr morgens gelöst',      test: (d, g) => g && new Date().getHours() < 7 },
  { id: 'owl',     icon: '🌙', name: 'Nachteule',         desc: 'Ein Rätsel nach 22 Uhr gelöst',            test: (d, g) => g && new Date().getHours() >= 22 },
  { id: 'goal',    icon: '🎯', name: 'Tagesziel',         desc: 'An einem Tag 3 Rätsel gelöst',             test: (d) => d.today.count >= 3 },
  { id: 'goal10',  icon: '🏃', name: 'Fleißig',           desc: 'An einem Tag 10 Rätsel gelöst',            test: (d) => d.today.count >= 10 },
  { id: 'nohelp',  icon: '🦁', name: 'Ganz allein',       desc: '10 Rätsel ohne einen einzigen Tipp',       test: (d) => d.noHint >= 10 },
];

// ================= Speicher =================
const STORE = 'sudoku-v1';
const DEFAULT = () => ({
  name: '', points: 0, solved: 0, perfect: 0, noHint: 0,
  byLevel: { leicht: 0, mittel: 0, schwer: 0, experte: 0 },
  best: { leicht: null, mittel: null, schwer: null, experte: null },
  daily: {}, streak: { current: 0, best: 0, last: null, jokers: 1 },
  today: { date: dayKey(), count: 0 }, medals: {},
  settings: { mistakes: true, same: true, timer: true, sound: true, big: false },
  games: { daily: null, free: null },
});
let D;
function load() {
  try { const raw = localStorage.getItem(STORE); if (raw) { const def = DEFAULT(), v = JSON.parse(raw); return { ...def, ...v, settings: { ...def.settings, ...v.settings }, streak: { ...def.streak, ...v.streak } }; } } catch (e) { /* ignore */ }
  return DEFAULT();
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) { /* ignore */ } }
function rollToday() { const k = dayKey(); if (D.today.date !== k) D.today = { date: k, count: 0 }; }

// ================= Töne =================
let actx = null;
function tone(freqs, dur = 0.12, gap = 0.09) {
  if (!D.settings.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, k) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + k * gap;
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    });
  } catch (e) { /* ignore */ }
}

// ================= Bildschirme =================
function show(id, push = true) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  if (id !== 'home' && push) history.pushState({ s: id }, '');
  window.scrollTo(0, 0);
  if (id === 'home') renderHome();
}
window.addEventListener('popstate', () => { closeModal(); stopTimer(); show('home', false); });
function goHome() { if (history.state && history.state.s) history.back(); else show('home', false); }

// ================= Startseite =================
function streakAlive() {
  const s = D.streak; if (!s.last) return 0;
  const gap = daysBetween(s.last, dayKey());
  return gap <= 1 + s.jokers ? s.current : 0;
}
function renderHome() {
  rollToday(); stopTimer();
  const h = new Date().getHours();
  const hello = h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
  $('#greeting').textContent = D.name ? `${hello}, ${D.name}!` : `${hello}!`;

  const ri = rankFor(D.points), r = RANKS[ri], next = RANKS[ri + 1];
  $('#rankEmoji').textContent = r[2]; $('#rankName').textContent = r[1];
  if (next) {
    $('#rankBar').style.width = Math.round(((D.points - r[0]) / (next[0] - r[0])) * 100) + '%';
    $('#rankNext').textContent = `${D.points} Punkte · noch ${next[0] - D.points} bis ${next[2]} ${next[1]}`;
  } else { $('#rankBar').style.width = '100%'; $('#rankNext').textContent = `${D.points} Punkte · höchster Rang!`; }

  const st = streakAlive();
  $('#streakText').textContent = '🔥 ' + st;
  $('#streakLabel').textContent = (st === 1 ? 'Tag' : 'Tage') + ' in Folge' + (D.streak.jokers ? ` · 🛡️${D.streak.jokers}` : '');
  $('#goalText').textContent = D.today.count >= 3 ? `✅ ${D.today.count}` : `${D.today.count} / 3`;

  const k = dayKey(), done = D.daily[k], lvl = LEVELS[dailyLevel(k)].name;
  const b = $('#btnDaily');
  b.classList.toggle('done', !!done);
  if (done) { $('#dailyTitle').textContent = `✅ Tagesrätsel geschafft`; $('#dailySub').textContent = `${starStr(done.stars)} · ${fmtTime(done.seconds)} · morgen gibt's ein neues oder machen Sie unten weiter`; }
  else { const g = D.games.daily; $('#dailyTitle').textContent = g && g.date === k ? '☀️ Tagesrätsel fortsetzen' : '☀️ Tagesrätsel'; $('#dailySub').textContent = `${keyToDate(k).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })} · ${lvl}`; }

  const f = D.games.free;
  $('#btnContinue').classList.toggle('hidden', !f);
  if (f) $('#btnContinue').textContent = `▶ Weiterspielen (${LEVELS[f.level].name}, ${fmtTime(f.seconds)})`;
}

// ================= Spiel =================
let G = null, selected = -1, notesMode = false, timerId = null, cells = [], numBtns = [];

function newGame(mode, level) {
  const k = dayKey();
  const rnd = mode === 'daily' ? mulberry32(hashStr('sudoku/' + k)) : mulberry32((Math.random() * 2 ** 32) >>> 0);
  const { puzzle, solution } = generate(level, rnd);
  return { mode, level, date: k, puzzle, solution, values: puzzle.slice(), notes: new Array(81).fill(0),
    hinted: [], seconds: 0, mistakes: 0, hints: 0, history: [] };
}

function startDaily() {
  const k = dayKey();
  if (D.daily[k]) { modal(`<div class="win-emoji">✅</div><h2>Schon geschafft!</h2><p>Das heutige Tagesrätsel ist gelöst (${starStr(D.daily[k].stars)}).<br>Morgen wartet ein neues.</p>`, [{ t: 'Ein freies Rätsel spielen', primary: true, f: () => pickLevel() }, { t: 'Schließen' }]); return; }
  if (!D.games.daily || D.games.daily.date !== k) D.games.daily = newGame('daily', dailyLevel(k));
  openGame(D.games.daily);
}
function startFree(level) {
  const go = () => { D.games.free = newGame('free', level); openGame(D.games.free); };
  if (D.games.free) modal(`<h2>Neues Rätsel?</h2><p>Das angefangene Rätsel (${LEVELS[D.games.free.level].name}) wird dann verworfen.</p>`, [{ t: 'Ja, neues Rätsel', primary: true, f: go }, { t: 'Lieber weiterspielen', f: () => openGame(D.games.free) }]);
  else go();
}
function pickLevel() {
  modal('<h2>Welche Stufe?</h2>', Object.keys(LEVELS).map((l) => ({ t: LEVELS[l].name, f: () => startFree(l) })).concat([{ t: 'Abbrechen' }]));
}

function openGame(g) {
  G = g; selected = -1; notesMode = false;
  $('#gameTitle').textContent = (g.mode === 'daily' ? '☀️ Tagesrätsel · ' : '') + LEVELS[g.level].name;
  buildBoard(); show('game'); renderGame(); startTimer(); save();
}

function buildBoard() {
  const board = $('#board'); board.innerHTML = ''; cells = [];
  for (let i = 0; i < 81; i++) {
    const c = el('div', 'cell'); c.setAttribute('role', 'gridcell');
    c.addEventListener('pointerdown', (e) => { e.preventDefault(); select(i); });
    board.appendChild(c); cells.push(c);
  }
  const pad = $('#numpad'); pad.innerHTML = ''; numBtns = [];
  for (let d = 1; d <= 9; d++) {
    const b = el('button', 'btn num'); b.append(String(d), el('small'));
    b.addEventListener('click', () => input(d)); pad.appendChild(b); numBtns[d] = b;
  }
  const er = el('button', 'btn num erase', '⌫'); er.setAttribute('aria-label', 'Löschen');
  er.addEventListener('click', () => input(0)); pad.appendChild(er);
}

function select(i) { selected = i; renderGame(); }

function isError(i) { return G.values[i] && G.values[i] !== G.solution[i]; }

function renderGame() {
  const g = G, s = D.settings, selV = selected >= 0 ? g.values[selected] : 0;
  const selPeers = selected >= 0 ? new Set(PEERS[selected]) : new Set();
  for (let i = 0; i < 81; i++) {
    const c = cells[i], v = g.values[i];
    c.className = 'cell';
    if (g.puzzle[i]) c.classList.add('given'); else if (g.hinted.includes(i)) c.classList.add('hinted');
    if (i === selected) c.classList.add('sel');
    else if (s.same && selV && v === selV) c.classList.add('same');
    else if (selPeers.has(i)) c.classList.add('peer');
    if (s.mistakes && !g.puzzle[i] && isError(i)) c.classList.add('error');
    c.textContent = '';
    if (v) c.textContent = v;
    else if (g.notes[i]) {
      const n = el('div', 'notes');
      for (let d = 1; d <= 9; d++) n.appendChild(el('span', null, g.notes[i] & (1 << d) ? d : ''));
      c.appendChild(n);
    }
  }
  const counts = new Array(10).fill(0);
  g.values.forEach((v, i) => { if (v && v === g.solution[i]) counts[v]++; });
  for (let d = 1; d <= 9; d++) { numBtns[d].classList.toggle('done', counts[d] >= 9); numBtns[d].querySelector('small').textContent = 9 - counts[d] || ''; }
  $('#btnNotes').classList.toggle('on', notesMode);
  $('#notesLabel').textContent = notesMode ? 'Notizen an' : 'Notizen aus';
  $('#timer').classList.toggle('hidden', !s.timer);
  $('#timer').textContent = fmtTime(g.seconds);
  $('#mistakes').textContent = g.mistakes ? `Fehler: ${g.mistakes}` : '';
}

function input(d) {
  const g = G, i = selected;
  if (i < 0) { flashMsg('Bitte zuerst ein Feld antippen'); return; }
  if (g.puzzle[i] || (g.values[i] && g.values[i] === g.solution[i] && D.settings.mistakes)) return; // fest
  const step = [];
  const remember = (j) => step.push({ i: j, v: g.values[j], n: g.notes[j] });

  if (d === 0) { if (!g.values[i] && !g.notes[i]) return; remember(i); g.values[i] = 0; g.notes[i] = 0; }
  else if (notesMode && !g.values[i]) { remember(i); g.notes[i] ^= 1 << d; }
  else {
    if (g.values[i] === d) return;
    remember(i); g.values[i] = d; g.notes[i] = 0;
    if (d === g.solution[i]) {
      for (const p of PEERS[i]) if (g.notes[p] & (1 << d)) { remember(p); g.notes[p] &= ~(1 << d); }
      tone([660], 0.08);
      celebrateUnits(i);
    } else { g.mistakes++; if (D.settings.mistakes) tone([220], 0.18); }
  }
  g.history.push(step); if (g.history.length > 300) g.history.shift();
  renderGame(); save(); checkWin();
}

function celebrateUnits(i) {
  let any = false;
  for (const u of UNITS_OF[i]) if (u.every((j) => G.values[j] === G.solution[j])) {
    any = true; u.forEach((j, k) => setTimeout(() => { cells[j].classList.remove('flash'); void cells[j].offsetWidth; cells[j].classList.add('flash'); }, k * 35));
  }
  if (any) tone([523, 659, 784], 0.15, 0.08);
}

function undo() {
  const step = G.history.pop(); if (!step) return;
  for (let k = step.length - 1; k >= 0; k--) { const c = step[k]; G.values[c.i] = c.v; G.notes[c.i] = c.n; }
  renderGame(); save();
}

function hint() {
  const g = G; let i = selected;
  if (i < 0 || g.values[i] === g.solution[i]) {
    // ein Feld finden, das am wenigsten Möglichkeiten hat
    let best = -1, bc = 10;
    for (let j = 0; j < 81; j++) if (g.values[j] !== g.solution[j]) { const c = popcnt(cands(g.values.map((v, k) => (v === g.solution[k] ? v : 0)), j)); if (c < bc) { bc = c; best = j; } }
    i = best;
  }
  if (i < 0) return;
  const step = [{ i, v: g.values[i], n: g.notes[i] }];
  g.values[i] = g.solution[i]; g.notes[i] = 0; g.hints++; if (!g.hinted.includes(i)) g.hinted.push(i);
  for (const p of PEERS[i]) if (g.notes[p] & (1 << g.solution[i])) { step.push({ i: p, v: g.values[p], n: g.notes[p] }); g.notes[p] &= ~(1 << g.solution[i]); }
  g.history.push(step); selected = i;
  renderGame(); celebrateUnits(i); save(); checkWin();
}

function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    if (document.hidden || !G || !$('#game').classList.contains('active') || !$('#modal').classList.contains('hidden')) return;
    G.seconds++; if (D.settings.timer) $('#timer').textContent = fmtTime(G.seconds);
    if (G.seconds % 10 === 0) save();
  }, 1000);
}
function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }

// ================= Gewinnen =================
function checkWin() {
  const g = G; if (!g.values.every((v, i) => v === g.solution[i])) return;
  stopTimer(); rollToday();
  const slips = g.mistakes + g.hints;
  const stars = slips === 0 ? 3 : slips <= 2 ? 2 : 1;
  g.stars = stars;
  const rankBefore = rankFor(D.points);
  const lines = [];
  let pts = Math.round(LEVELS[g.level].points * [0, 1, 1.5, 2][stars]);
  lines.push(`${LEVELS[g.level].name} mit ${stars} ${stars === 1 ? 'Stern' : 'Sternen'}: +${pts}`);

  if (g.mode === 'daily') {
    const k = g.date, s = D.streak;
    if (!D.daily[k]) {
      const gap = s.last ? daysBetween(s.last, k) : null;
      if (gap === null) s.current = 1;
      else if (gap === 1) s.current++;
      else if (gap > 1 && gap - 1 <= s.jokers) { s.jokers -= gap - 1; s.current++; lines.push(`🛡️ Ein Schutzschild hat Ihre Serie gerettet`); }
      else if (gap !== 0) s.current = 1;
      s.last = k; s.best = Math.max(s.best, s.current);
      if (s.current % 7 === 0 && s.jokers < 2) { s.jokers++; lines.push(`🛡️ Neues Schutzschild für die Serie verdient`); }
      D.daily[k] = { stars, seconds: g.seconds };
      const bonus = 10 + Math.min(s.current, 10) * 2;
      pts += bonus; lines.push(`☀️ Tagesrätsel & 🔥 ${s.current} ${s.current === 1 ? 'Tag' : 'Tage'} Serie: +${bonus}`);
    }
    D.games.daily = null;
  } else D.games.free = null;

  D.today.count++;
  if (D.today.count === 3) { pts += 20; lines.push(`🎯 Tagesziel erreicht (3 Rätsel): +20`); }
  D.solved++; D.byLevel[g.level]++;
  if (stars === 3) D.perfect++;
  if (!g.hints) D.noHint++;
  let record = false;
  if (D.best[g.level] == null || g.seconds < D.best[g.level]) { if (D.best[g.level] != null) record = true; D.best[g.level] = g.seconds; }
  D.points += pts;

  const newMedals = MEDALS.filter((m) => !D.medals[m.id] && m.test(D, g));
  newMedals.forEach((m) => (D.medals[m.id] = dayKey()));
  const rankAfter = rankFor(D.points);
  save();

  const titles = { 3: ['Meisterhaft!', 'Großartig!', 'Perfekt gelöst!'], 2: ['Sehr gut!', 'Prima gemacht!'], 1: ['Geschafft!', 'Gelöst!'] };
  const title = g.mode === 'daily' && stars === 3 ? 'Meister des Tages!' : titles[stars][Math.floor(Math.random() * titles[stars].length)];
  const emoji = stars === 3 ? '🏆' : stars === 2 ? '🎉' : '👍';

  let html = `<div class="win-emoji">${emoji}</div><h2>${title}</h2>
    <div class="stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(3 - stars)}</span></div>
    <p>Zeit: <b>${fmtTime(g.seconds)}</b>${record ? ' – <b>neuer Rekord!</b>' : ''}</p><div class="win-lines">`;
  lines.forEach((l) => (html += `<div>${l}</div>`));
  html += `<div class="plus">+${pts} Punkte</div>`;
  if (rankAfter > rankBefore) html += `<div class="new">${RANKS[rankAfter][2]} Aufgestiegen zum ${RANKS[rankAfter][1]}!</div>`;
  newMedals.forEach((m) => (html += `<div class="new">${m.icon} Neuer Orden: ${m.name}</div>`));
  html += '</div>';

  setTimeout(() => {
    confetti(stars === 3 || rankAfter > rankBefore ? 160 : 80);
    tone([523, 659, 784, 1047], 0.25, 0.13);
    modal(html, [
      { t: 'Noch ein Rätsel', primary: true, f: () => { D.games.free = newGame('free', g.level === 'experte' && stars < 2 ? 'schwer' : g.level); openGame(D.games.free); } },
      { t: 'Andere Stufe wählen', f: () => { goHome(); setTimeout(pickLevel, 50); } },
      { t: 'Zum Menü', f: goHome },
    ]);
  }, 700);
}

// ================= Dialog & Effekte =================
function modal(html, buttons) {
  const box = $('#modalBox'); box.innerHTML = html;
  const wrap = el('div', 'modal-btns');
  buttons.forEach((b) => { const x = el('button', 'btn' + (b.primary ? ' primary' : ''), b.t); x.addEventListener('click', () => { closeModal(); b.f && b.f(); }); wrap.appendChild(x); });
  box.appendChild(wrap); $('#modal').classList.remove('hidden');
}
function closeModal() { $('#modal').classList.add('hidden'); }
let msgTimer;
function flashMsg(t) {
  let m = $('#toast'); if (!m) { m = el('div'); m.id = 'toast'; document.body.appendChild(m); }
  m.textContent = t; m.className = 'toast show'; clearTimeout(msgTimer); msgTimer = setTimeout(() => (m.className = 'toast'), 1800);
}

function confetti(n) {
  const cv = $('#confetti'), ctx = cv.getContext('2d'), W = (cv.width = innerWidth), H = (cv.height = innerHeight);
  const cols = ['#f2b632', '#e53935', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00'];
  const P = [...Array(n)].map(() => ({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, c: cols[(Math.random() * cols.length) | 0], s: 6 + Math.random() * 6 }));
  let t = 0;
  (function frame() {
    ctx.clearRect(0, 0, W, H);
    P.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
    if (++t < 260) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
  })();
}

// ================= Orden & Statistik =================
function renderMedals() {
  const list = $('#medalList'); list.innerHTML = '';
  const have = MEDALS.filter((m) => D.medals[m.id]).length;
  $('#medalCount').textContent = `${have} von ${MEDALS.length} Orden gesammelt`;
  [...MEDALS].sort((a, b) => !!D.medals[b.id] - !!D.medals[a.id]).forEach((m) => {
    const got = D.medals[m.id];
    const row = el('div', 'medal' + (got ? '' : ' locked'));
    const txt = el('div'); txt.append(el('div', 'm-name', m.name), el('div', 'm-desc', m.desc + (got ? ` · ${keyToDate(got).toLocaleDateString('de-DE')}` : '')));
    row.append(el('div', 'm-icon', m.icon), txt); list.appendChild(row);
  });
}

function renderStats() {
  const b = $('#statsBody'); b.innerHTML = '';
  const grid = el('div', 'stat-grid');
  [[D.solved, 'Rätsel gelöst'], [D.perfect, 'davon fehlerfrei'], ['🔥 ' + D.streak.best, 'längste Serie'], [D.points, 'Punkte']].forEach(([v, l]) => {
    const c = el('div', 'card mini'); c.append(el('div', 'mini-big', String(v)), el('div', 'mini-label', l)); grid.appendChild(c);
  });
  b.appendChild(grid);

  const t = el('table', 'stat-table'); const hr = el('tr');
  ['Stufe', 'Gelöst', 'Bestzeit'].forEach((h) => hr.appendChild(el('th', null, h))); t.appendChild(hr);
  Object.keys(LEVELS).forEach((l) => { const tr = el('tr'); tr.append(el('td', null, LEVELS[l].name), el('td', null, String(D.byLevel[l])), el('td', null, D.best[l] != null ? fmtTime(D.best[l]) : '–')); t.appendChild(tr); });
  b.appendChild(t);

  const now = new Date();
  b.appendChild(el('h2', null, 'Tagesrätsel ' + now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })));
  const cal = el('div', 'cal');
  ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].forEach((w) => cal.appendChild(el('div', 'wd', w)));
  const first = new Date(now.getFullYear(), now.getMonth(), 1), days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  for (let k = 0; k < (first.getDay() + 6) % 7; k++) cal.appendChild(el('div'));
  for (let d = 1; d <= days; d++) {
    const k = dayKey(new Date(now.getFullYear(), now.getMonth(), d)), r = D.daily[k];
    const c = el('div', (r ? 'done' : '') + (d === now.getDate() ? ' today' : ''), String(d));
    if (r) c.appendChild(el('span', 'st', '★'.repeat(r.stars)));
    cal.appendChild(c);
  }
  b.appendChild(cal);
}

// ================= Einstellungen =================
function applySettings() { document.documentElement.classList.toggle('big', D.settings.big); }
function bindSettings() {
  const map = { setMistakes: 'mistakes', setSame: 'same', setTimer: 'timer', setSound: 'sound', setBig: 'big' };
  Object.entries(map).forEach(([id, key]) => {
    const inp = $('#' + id); inp.checked = D.settings[key];
    inp.addEventListener('change', () => { D.settings[key] = inp.checked; applySettings(); save(); });
  });
  const n = $('#setName'); n.value = D.name;
  n.addEventListener('input', () => { D.name = n.value.trim(); save(); });
}

// ================= Start =================
function init() {
  D = load(); rollToday(); applySettings(); bindSettings();
  $('#btnDaily').addEventListener('click', startDaily);
  $('#btnContinue').addEventListener('click', () => D.games.free && openGame(D.games.free));
  document.querySelectorAll('.lvl').forEach((b) => b.addEventListener('click', () => startFree(b.dataset.level)));
  $('#btnMedals').addEventListener('click', () => { renderMedals(); show('medals'); });
  $('#btnStats').addEventListener('click', () => { renderStats(); show('stats'); });
  $('#btnSettings').addEventListener('click', () => show('settings'));
  document.querySelectorAll('[data-home]').forEach((b) => b.addEventListener('click', goHome));
  $('#btnBack').addEventListener('click', () => { save(); goHome(); });
  $('#btnUndo').addEventListener('click', undo);
  $('#btnNotes').addEventListener('click', () => { notesMode = !notesMode; renderGame(); });
  $('#btnHint').addEventListener('click', hint);
  document.addEventListener('keydown', (e) => {
    if (!$('#game').classList.contains('active')) return;
    if (e.key >= '1' && e.key <= '9') input(+e.key);
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') input(0);
    else if (e.key.startsWith('Arrow') && selected >= 0) {
      const r = Math.floor(selected / 9), c = selected % 9;
      const m = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      select(((r + m[0] + 9) % 9) * 9 + ((c + m[1] + 9) % 9));
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else if ($('#home').classList.contains('active')) renderHome(); });
  renderHome();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
init();
