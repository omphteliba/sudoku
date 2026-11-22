'use strict';
/* Hilfe: füllt Tabellen aus den Spieldaten und zeichnet die Beispiel-Sudokus der Strategien. */

// Zellen: 'Zeile,Spalte' -> { v: Zahl, g: vorgegeben, c: Farbe, n: Notizen, del: gestrichene Notizen }
// Farben: t = gelb (gesuchtes Feld), k = grün (Schlüssel), r = hellblau (Bezug), x = rot (gesperrt)
const HELP_EX = {
  fullhouse: {
    rows: 1,
    cells: { '0,0': 5, '0,1': 3, '0,2': 4, '0,3': 6, '0,4': 7, '0,5': 8, '0,6': 9, '0,7': 1, '0,8': { v: 2, c: 't' } },
  },
  crosshatch: {
    rows: 9,
    shade: [['row', 1, 'x'], ['row', 2, 'x'], ['col', 0, 'x'], ['col', 1, 'x']],
    cells: {
      '1,4': { v: 5, g: 1, c: 'k' }, '2,7': { v: 5, g: 1, c: 'k' }, '5,0': { v: 5, g: 1, c: 'k' }, '7,1': { v: 5, g: 1, c: 'k' },
      '0,1': 9, '1,1': 2, '2,0': 7, '2,2': 1,
      '0,2': { v: 5, c: 't' },
    },
  },
  nakedsingle: {
    rows: 9,
    shade: [['row', 4, 'r'], ['col', 4, 'r'], ['box', 4, 'r']],
    cells: {
      '4,0': 1, '4,2': 2, '4,7': 7, '0,4': 3, '7,4': 9, '8,4': 4, '3,3': 5, '5,5': 8,
      '4,4': { v: 6, c: 't' },
    },
  },
  notes: {
    rows: 3,
    cells: {
      '0,0': 4, '0,1': 9, '1,1': 1, '1,2': 6, '2,0': 8, '2,2': 3,
      '0,6': { v: 5, g: 1, c: 'k' }, '1,4': { v: 7, g: 1, c: 'k' }, '2,7': { v: 2, g: 1, c: 'k' },
      '0,2': { n: [2, 7], c: 't' }, '1,0': { n: [2, 5], c: 't' }, '2,1': { n: [5, 7], c: 't' },
    },
  },
  nakedpair: {
    rows: 1,
    cells: {
      '0,0': 1, '0,2': 3, '0,4': 5, '0,6': 6, '0,8': 9,
      '0,1': { n: [2, 7], c: 'k' }, '0,5': { n: [2, 7], c: 'k' },
      '0,3': { n: [2, 4, 7], del: [2, 7], c: 't' }, '0,7': { n: [4, 8] },
    },
  },
  pointing: {
    rows: 3,
    shade: [['row', 1, 'r']],
    cells: {
      '0,0': 1, '0,2': 6, '1,1': 2, '2,0': 8, '2,2': 3,
      '0,7': { v: 4, g: 1, c: 'k' }, '2,4': { v: 4, g: 1, c: 'k' },
      '0,1': { n: [5, 9] }, '2,1': { n: [5, 7] },
      '1,0': { n: [4, 7], c: 't' }, '1,2': { n: [4, 9], c: 't' },
      '1,5': { n: [4, 6], del: [4], c: 'x' },
    },
  },
  xwing: {
    rows: 9, bigNotes: true, // nur eine Notiz je Feld: groß und mittig zeigen
    shade: [['row', 1, 'r'], ['row', 5, 'r']],
    cells: {
      '1,2': { n: [7], c: 'k' }, '1,6': { n: [7], c: 'k' }, '5,2': { n: [7], c: 'k' }, '5,6': { n: [7], c: 'k' },
      '3,2': { n: [7], del: [7], c: 'x' }, '7,2': { n: [7], del: [7], c: 'x' }, '8,6': { n: [7], del: [7], c: 'x' },
      '0,4': { n: [7] }, '3,8': { n: [7] }, '7,0': { n: [7] },
    },
  },
};

function renderExample(spec) {
  const shade = {};
  (spec.shade || []).forEach(([kind, k, cls]) => {
    for (let r = 0; r < spec.rows; r++) for (let c = 0; c < 9; c++) {
      const hit = kind === 'row' ? r === k : kind === 'col' ? c === k : Math.floor(r / 3) * 3 + Math.floor(c / 3) === k;
      if (hit) shade[r + ',' + c] = cls;
    }
  });
  const box = el('div', 'mb');
  box.setAttribute('role', 'img');
  for (let r = 0; r < spec.rows; r++) for (let c = 0; c < 9; c++) {
    const key = r + ',' + c;
    let s = spec.cells[key];
    if (typeof s === 'number') s = { v: s, g: 1 };
    s = s || {};
    const cls = [s.c || shade[key] || '', s.g ? 'g' : '',
      c % 3 === 2 && c < 8 ? 'bR' : '', c === 8 ? 'lc' : '',
      r % 3 === 2 && r < spec.rows - 1 ? 'bB' : '', r === spec.rows - 1 ? 'lr' : ''].filter(Boolean).join(' ');
    const d = el('div', cls);
    if (s.v) d.textContent = s.v;
    else if (s.n && spec.bigNotes) d.appendChild(el('span', 'pn' + ((s.del || []).length ? ' del' : ''), s.n.join('')));
    else if (s.n) {
      const nt = el('div', 'nt');
      for (let k = 1; k <= 9; k++) nt.appendChild(el('span', (s.del || []).includes(k) ? 'del' : null, s.n.includes(k) ? String(k) : ''));
      d.appendChild(nt);
    }
    box.appendChild(d);
  }
  return box;
}

function fillHelp() {
  document.querySelectorAll('.mb-slot').forEach((slot) => {
    const spec = HELP_EX[slot.dataset.ex];
    if (spec) slot.replaceWith(renderExample(spec));
  });

  // Wochenplan Tagesrätsel (Mo zuerst)
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  $('#weekPlan').textContent = [1, 2, 3, 4, 5, 6, 0].map((i) => `${days[i]} ${LEVELS[DAILY_LEVEL[i]].name}`).join(' · ');

  // Punkte je Stufe und Sterne
  const t = $('#ptsTable'), hr = el('tr');
  ['Stufe', '★', '★★', '★★★'].forEach((h) => hr.appendChild(el('th', null, h)));
  t.appendChild(hr);
  Object.keys(LEVELS).forEach((l) => {
    const tr = el('tr'); tr.appendChild(el('td', null, LEVELS[l].name));
    [1, 1.5, 2].forEach((f) => tr.appendChild(el('td', null, '+' + Math.round(LEVELS[l].points * f))));
    t.appendChild(tr);
  });

  // Ränge
  const ul = $('#rankList');
  RANKS.forEach(([p, name, icon]) => {
    const li = el('li'); li.append(el('span', 'r-icon', icon), el('b', null, name), el('span', 'muted', p ? ` ab ${p} Punkten` : ' – zum Start'));
    ul.appendChild(li);
  });
  $('#medalTotal').textContent = MEDALS.length;
}
fillHelp();
