'use strict';
/* ===================== Practice games ===================== */
function pie(num, den, size = 150) {
  const r = size / 2 - 6, c = size / 2;
  let s = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${r + 3}" fill="#e7b46a"/>`;
  for (let i = 0; i < den; i++) {
    const a0 = (i / den) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / den) * 2 * Math.PI - Math.PI / 2;
    const x0 = c + r * Math.cos(a0), y0 = c + r * Math.sin(a0), x1 = c + r * Math.cos(a1), y1 = c + r * Math.sin(a1);
    const big = a1 - a0 > Math.PI ? 1 : 0;
    s += `<path d="M${c},${c} L${x0},${y0} A${r},${r} 0 ${big} 1 ${x1},${y1} Z" fill="${i < num ? '#d9533b' : '#fbe7c6'}" stroke="#a9692a" stroke-width="2"/>`;
    if (i < num) s += `<circle cx="${c + r * 0.55 * Math.cos((a0 + a1) / 2)}" cy="${c + r * 0.55 * Math.sin((a0 + a1) / 2)}" r="${Math.max(3, r / 9)}" fill="#8e2a1c"/>`;
  }
  return s + '</svg>';
}
function gameArt(id, size = 100) {
  const w = size, h = Math.round(size * 0.7);
  const box = (inner, bg) => `<svg width="${w}" height="${h}" viewBox="0 0 100 70" aria-hidden="true" class="game-art"><rect width="100" height="70" rx="8" fill="${bg}"/>${inner}</svg>`;
  switch (id) {
    case 'fraction-pizza': return box('<circle cx="50" cy="35" r="24" fill="#e7b46a"/><path d="M50 35V13a22 22 0 0 1 22 22z M50 35h22a22 22 0 0 1-22 22z M50 35v22a22 22 0 0 1-22-22z" fill="#d9533b"/><path d="M50 13v44M28 35h44" stroke="#a9692a" stroke-width="1.5"/>', '#fbeee0');
    case 'times-race': return box('<text x="50" y="44" font-size="26" font-weight="800" text-anchor="middle" fill="#1f6f5c">7×8</text><path d="M14 56h72" stroke="#1f6f5c" stroke-width="3" stroke-dasharray="6 5"/>', '#e3efe9');
    case 'word-builder': return box(['W', 'O', 'R', 'D'].map((l, i) => `<rect x="${12 + i * 20}" y="22" width="16" height="22" rx="3" fill="#fff" stroke="#3d5a99" stroke-width="1.5"/><text x="${20 + i * 20}" y="39" font-size="13" font-weight="700" text-anchor="middle" fill="#3d5a99">${l}</text>`).join(''), '#e4ebf7');
    case 'woerter-memo': return box('<rect x="16" y="14" width="30" height="40" rx="4" fill="#b5651d"/><rect x="54" y="14" width="30" height="40" rx="4" fill="#fff" stroke="#b5651d" stroke-width="1.5"/><text x="69" y="38" font-size="10" font-weight="700" text-anchor="middle" fill="#b5651d">Biene</text>', '#f7ead9');
    case 'plant-parts': return box('<path d="M50 60V26" stroke="#3c7d3a" stroke-width="3"/><path d="M50 44c-12 0-16-8-16-8s8-4 16 4M50 38c10-2 14-10 14-10s-10 0-14 6" fill="#5aa357"/><circle cx="50" cy="20" r="7" fill="#f4c542"/><path d="M42 62h16" stroke="#8a5a2b" stroke-width="3"/>', '#e6f1e0');
    default: return box('', '#eee');
  }
}

const rnd = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const GAMES = {
  'fraction-pizza': {
    intro: 'Tap the pizza that has MORE. Tip: make the bottom numbers the same!',
    make() {
      const pool = [[3, 4, 2, 3], [1, 2, 2, 5], [2, 3, 3, 5], [3, 8, 1, 2], [5, 6, 3, 4], [1, 3, 1, 4], [2, 5, 1, 3], [3, 5, 2, 3], [4, 6, 3, 4]];
      return shuffle(pool).slice(0, 6).map(([a, b, c, d]) => (Math.random() < 0.5 ? { l: [a, b], r: [c, d] } : { l: [c, d], r: [a, b] }));
    },
  },
  'times-race': {
    intro: 'Answer as many as you can in 60 seconds!', timer: 60,
    make() {
      return Array.from({ length: 12 }, () => {
        const a = 2 + rnd(8), b = 2 + rnd(8), ans = a * b;
        const opts = new Set([ans]); while (opts.size < 4) opts.add(Math.max(4, ans + (rnd(9) - 4) * (rnd(2) ? 1 : a)));
        return { q: `${a} × ${b} = ?`, opts: shuffle([...opts]), ans };
      });
    },
  },
  'word-builder': {
    intro: 'Tap the letters in the right order to spell the word.',
    make() { return shuffle([['garden', 'a place where plants grow'], ['planet', 'Earth is one'], ['friend', 'someone you like to play with'], ['school', 'where you learn'], ['apple', 'a red or green fruit']]).slice(0, 4).map(([w, hint]) => ({ w, hint, letters: shuffle(w.split('')) })); },
  },
  'woerter-memo': {
    intro: 'Find the pairs: German word and English word. Watch out for “ie” and “ei”!',
    make() {
      const pairs = [['Biene', 'bee'], ['Bein', 'leg'], ['Eis', 'ice'], ['Wiese', 'meadow'], ['Brief', 'letter'], ['Seite', 'page']];
      return [{ cards: shuffle(pairs.flatMap(([de, en], i) => [{ k: i, txt: de, de: true }, { k: i, txt: en }])) }];
    },
  },
  'plant-parts': {
    intro: 'Which part of the plant is shown in yellow?',
    make() {
      const parts = ['roots', 'stem', 'leaf', 'flower'];
      return shuffle(parts).map((p) => ({ part: p, opts: shuffle(parts) }));
    },
  },
};

function plantSVG(hi) {
  const c = (p) => (p === hi ? '#f2c230' : null);
  return `<svg width="220" height="240" viewBox="0 0 220 240" aria-hidden="true">
    <rect x="0" y="180" width="220" height="60" fill="#c9a77c"/>
    <g stroke="${c('roots') || '#8a5a2b'}" stroke-width="${hi === 'roots' ? 5 : 3}" fill="none" stroke-linecap="round"><path d="M110 185v30M110 195l-22 22M110 195l22 22M110 205l-12 24M110 205l12 24"/></g>
    <path d="M110 185V80" stroke="${c('stem') || '#3c7d3a'}" stroke-width="${hi === 'stem' ? 9 : 6}"/>
    <path d="M110 140c-30 0-44-20-44-20s22-12 44 10z" fill="${c('leaf') || '#5aa357'}"/><path d="M110 120c28-4 40-26 40-26s-26-2-40 14z" fill="#5aa357"/>
    <g fill="${c('flower') || '#e57373'}"><circle cx="110" cy="52" r="14"/><circle cx="92" cy="66" r="14"/><circle cx="128" cy="66" r="14"/><circle cx="98" cy="86" r="13"/><circle cx="122" cy="86" r="13"/></g><circle cx="110" cy="72" r="11" fill="#f4c542" stroke="#c99a1b"/>
  </svg>`;
}

let G = null;
route('/student/play/:id', 'student', ({ id }) => {
  const meta = S.games.find((g) => g.id === id), def = GAMES[id];
  if (!meta || !def) return go('/student/games');
  if (!G || G.id !== id) G = { id, i: 0, score: 0, rounds: def.make(), done: false, started: false, fb: null, built: [], flipped: [], matched: [], tries: 0, left: def.timer || 0 };
  const total = id === 'woerter-memo' ? 6 : G.rounds.length;
  let stage = '';
  if (!G.started) {
    stage = `<div class="game-start">${gameArt(id, 220)}<p class="lg-text">${esc(t(def.intro))}</p><button type="button" class="btn primary lg" data-start>${icon('play', 18)} ${esc(t('Start'))}</button></div>`;
  } else if (G.done) {
    const stars = Math.round((G.score / total) * 5);
    stage = `<div class="game-start"><div class="big-check">${icon('trophy', 40)}</div><h2>${esc(t('Well done!'))}</h2><p class="lg-text">${esc(t('You got {a} of {b}.', { a: G.score, b: total }))}</p>${starsFor(stars * 20)}<span class="chip">${icon('star', 15)} +${meta.pts} ${esc(t('points'))}</span>
      <div class="row gap"><button type="button" class="btn lg" data-again>${icon('refresh', 18)} ${esc(t('Play again'))}</button><a class="btn primary lg" href="#/student/games">${esc(t('Back to games'))}</a></div></div>`;
  } else {
    const r = G.rounds[G.i];
    if (id === 'fraction-pizza') {
      stage = `<p class="q">${esc(t('Which is more?'))}</p><div class="pizzas">${['l', 'r'].map((k) => `<button type="button" class="pizza ${G.fb && G.fb.pick === k ? (G.fb.ok ? 'ok' : 'bad') : ''}" data-pick="${k}" ${G.fb ? 'disabled' : ''}>${pie(r[k][0], r[k][1])}<span class="frac">${r[k][0]}/${r[k][1]}</span></button>`).join('')}</div>`;
    } else if (id === 'times-race' || id === 'plant-parts') {
      stage = `${id === 'plant-parts' ? `<div class="plant">${plantSVG(r.part)}</div>` : `<p class="q huge">${esc(r.q)}</p>`}<div class="opts">${r.opts.map((o) => `<button type="button" class="btn lg opt ${G.fb && String(G.fb.pick) === String(o) ? (G.fb.ok ? 'ok' : 'bad') : ''}" data-pick="${o}" ${G.fb ? 'disabled' : ''}>${esc(id === 'plant-parts' ? t(o) : o)}</button>`).join('')}</div>`;
    } else if (id === 'word-builder') {
      stage = `<p class="q">${esc(t('Hint:'))} ${esc(r.hint)}</p><div class="built">${r.w.split('').map((_, k) => `<span class="slot">${esc(G.built[k] != null ? r.letters[G.built[k]] : '')}</span>`).join('')}</div>
        <div class="letters">${r.letters.map((l, k) => `<button type="button" class="letter" data-l="${k}" ${G.built.includes(k) || G.fb ? 'disabled' : ''}>${esc(l)}</button>`).join('')}</div>
        <div class="row gap center-x"><button type="button" class="btn ghost" data-undo ${G.built.length && !G.fb ? '' : 'disabled'}>${icon('undo', 16)} ${esc(t('Undo'))}</button><button type="button" class="btn ghost" data-clear ${G.built.length && !G.fb ? '' : 'disabled'}>${esc(t('Clear'))}</button></div>`;
    } else if (id === 'woerter-memo') {
      stage = `<div class="memo">${r.cards.map((c, k) => { const show = G.flipped.includes(k) || G.matched.includes(c.k); return `<button type="button" class="card-flip ${show ? 'up' : ''} ${G.matched.includes(c.k) ? 'done' : ''} ${c.de ? 'de' : ''}" data-card="${k}" ${show ? 'disabled' : ''}>${show ? esc(c.txt) : '?'}</button>`; }).join('')}</div><p class="muted center">${esc(t('Tries: {n}', { n: G.tries }))}</p>`;
    }
    if (G.fb) stage += `<div class="feedback ${G.fb.ok ? 'ok' : 'bad'}" role="status">${G.fb.html}</div><div class="row center-x"><button type="button" class="btn primary lg" data-next>${esc(G.i + 1 >= total ? t('See my score') : t('Next'))} ${icon('arrowR', 18)}</button></div>`;
  }
  const prog = id === 'woerter-memo' ? G.matched.length : G.i + (G.fb ? 1 : 0);
  return {
    title: meta.title, nav: 'games',
    html: `${backBar('/student/games', [['/student/home', t('Home')], ['/student/games', t('Games')], [null, meta.title]])}
      <section class="card game">
        <div class="row between center"><h1 class="page inline">${esc(meta.title)}</h1><span class="row gap center">${def.timer && G.started && !G.done ? `<span class="chip">${icon('clock', 15)} <b id="timer">${G.left}</b>s</span>` : ''}<span class="chip">${esc(t('Score'))}: ${G.score}</span></span></div>
        ${G.started && !G.done ? `<div class="row gap center small">${bar((prog / total) * 100)}<span>${prog}/${total}</span></div>` : ''}
        <div class="stage">${stage}</div>
      </section>`,
    mount(el) {
      const on = (sel, fn) => $$(sel, el).forEach((b) => b.addEventListener('click', fn));
      on('[data-start]', () => { G.started = true; startTimer(); refresh(); });
      on('[data-again]', () => { G = null; refresh(); });
      on('[data-next]', () => { G.fb = null; G.built = []; G.i++; if (G.i >= total) finish(meta); refresh(); });
      on('[data-pick]', (e) => {
        const v = e.currentTarget.dataset.pick, r = G.rounds[G.i];
        let ok, html;
        if (id === 'fraction-pizza') {
          const val = (f) => f[0] / f[1], big = val(r.l) > val(r.r) ? 'l' : 'r', [a, b] = r.l, [c, d] = r.r, L = b * d;
          ok = v === big;
          html = `${ok ? esc(t('Yes!')) : esc(t('Not quite.'))} ${a}/${b} = <b>${a * d}</b>/${L} ${esc(t('and'))} ${c}/${d} = <b>${c * b}</b>/${L}. ${esc(t('So {f} is more.', { f: big === 'l' ? `${a}/${b}` : `${c}/${d}` }))}`;
        } else if (id === 'times-race') { ok = +v === r.ans; html = ok ? esc(t('Yes!')) : `${esc(t('Not quite.'))} ${esc(r.q.replace('?', r.ans))}`; }
        else { ok = v === r.part; html = ok ? esc(t('Yes! That’s the {p}.', { p: t(r.part) })) : esc(t('Not quite. That’s the {p}.', { p: t(r.part) })); }
        if (ok) G.score++;
        G.fb = { ok, pick: v, html }; beep(ok ? 'ok' : 'bad');
        if (id === 'times-race' && !G.done) { G.fb = null; G.i++; if (G.i >= total) finish(meta); else if (!ok) toast(html); }
        refresh();
      });
      on('[data-l]', (e) => {
        const r = G.rounds[G.i]; G.built.push(+e.currentTarget.dataset.l);
        if (G.built.length === r.w.length) {
          const word = G.built.map((k) => r.letters[k]).join(''); const ok = word === r.w;
          if (ok) G.score++;
          G.fb = { ok, html: ok ? esc(t('Yes! “{w}” is right.', { w: r.w })) : esc(t('Not quite. The word is “{w}”.', { w: r.w })) }; beep(ok ? 'ok' : 'bad');
        }
        refresh();
      });
      on('[data-undo]', () => { G.built.pop(); refresh(); });
      on('[data-clear]', () => { G.built = []; refresh(); });
      on('[data-card]', (e) => {
        const k = +e.currentTarget.dataset.card, cards = G.rounds[0].cards;
        if (G.flipped.length === 2) return;
        G.flipped.push(k);
        if (G.flipped.length === 2) {
          G.tries++;
          const [a, b] = G.flipped;
          if (cards[a].k === cards[b].k) { G.matched.push(cards[a].k); G.flipped = []; G.score = G.matched.length; beep('ok'); if (G.matched.length === 6) { finish(meta); } }
          else setTimeout(() => { if (G) { G.flipped = []; refresh(); } }, 900);
        }
        refresh();
      });
    },
  };
});
let timerH = null;
function startTimer() {
  clearInterval(timerH);
  if (!G || !GAMES[G.id].timer) return;
  timerH = setInterval(() => {
    if (!G || G.done || !location.hash.startsWith('#/student/play/')) { clearInterval(timerH); return; }
    G.left--; const el = $('#timer'); if (el) el.textContent = G.left;
    if (G.left <= 0) { clearInterval(timerH); finish(S.games.find((g) => g.id === G.id)); refresh(); }
  }, 1000);
}
function finish(meta) {
  if (G.done) return;
  G.done = true; clearInterval(timerH);
  meta.played++;
  addPoints(meta.pts, `Finished ${meta.title}`);
}
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/student/play/')) { G = null; clearInterval(timerH); } });
