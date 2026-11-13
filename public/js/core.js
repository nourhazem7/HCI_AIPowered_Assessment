'use strict';
/* ============ helpers ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const store = {
  get(k, area = localStorage) { try { return JSON.parse(area.getItem(k)); } catch (e) { return null; } },
  set(k, v, area = localStorage) { try { area.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  del(k, area = localStorage) { try { area.removeItem(k); } catch (e) { /* ignore */ } },
};

/* ============ state ============ */
let S = (() => { const s = store.get('gb.state'); return s && s.v === SEED.v ? s : clone(SEED); })();
function save() { store.set('gb.state', S); }
/* Clean start for recording the demo: remove every GradeBuddy key (state, settings, sign-in, chosen child) and reload */
function resetDemo() {
  try { Object.keys(localStorage).filter((k) => k.startsWith('gb.')).forEach((k) => localStorage.removeItem(k)); sessionStorage.clear(); } catch (e) { /* storage blocked */ }
  history.replaceState(null, '', location.pathname + location.search);
  location.reload();
}

const SET = Object.assign({ lang: 'en', size: 'm', sounds: true }, store.get('gb.settings') || {});
function saveSettings() { store.set('gb.settings', SET); applySettings(); }
function applySettings() {
  document.documentElement.lang = SET.lang;
  document.documentElement.dataset.size = SET.size;
}

/* ============ i18n ============ */
/* translate the values put into a message, e.g. an exam title */
function tvars(v) { return v && Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === 'string' ? t(x) : x])); }
function t(s, vars) {
  let out = (SET.lang === 'de' && typeof DE !== 'undefined' && DE[s]) || s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return out;
}

/* ============ session ============ */
function getSession() { return store.get('gb.session'); }
function signIn(role, keep) { store.set('gb.session', { role, keep: !!keep }); }
function signOut() { store.del('gb.session'); Buddy.reset && Buddy.reset(); go('/'); }

/* ============ router ============ */
const ROUTES = [];
function route(path, role, fn) {
  const keys = [];
  const re = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  ROUTES.push({ re, keys, role, fn });
}
function go(p) { if (location.hash === '#' + p) render(); else location.hash = p; }
function refresh() { render(true); }
let CUR = { path: '/', view: null, role: null };

function render(keep) {
  const path = location.hash.slice(1) || '/';
  const y = window.scrollY;
  const sess = getSession();
  for (const r of ROUTES) {
    const m = path.match(r.re);
    if (!m) continue;
    if (r.role && (!sess || sess.role !== r.role)) return go(sess ? ROLE[sess.role].home : '/');
    if (!r.role && sess && path === '/') return go(ROLE[sess.role].home);
    const params = {};
    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
    const view = r.fn(params) || {};
    CUR = { path, view, role: r.role };
    draw(r.role, view);
    if (keep) window.scrollTo(0, y); else window.scrollTo(0, 0);
    return;
  }
  go(sess ? ROLE[sess.role].home : '/');
}
window.addEventListener('hashchange', () => { closeMenus(); render(); });

/* ============ shell ============ */
const unreadStudent = () => S.inbox.filter((n) => n.unread).length;
const newResults = () => S.exams.filter((e) => e.status === 'graded' && e.isNew).length;
const ROLE = {
  student: {
    home: '/student/home', label: 'Student',
    who: () => `${S.student.name} · ${t(S.student.grade)}`,
    avatar: () => avatarSVG(S.student.avatar, 34),
    bell: unreadStudent,
    nav: () => [
      ['home', '/student/home', 'home', 'Home'],
      ['subjects', '/student/subjects', 'books', 'My Subjects'],
      ['results', '/student/results', 'star', 'My Results', newResults()],
      ['progress', '/student/progress', 'trend', 'My Progress'],
      ['rewards', '/student/rewards', 'trophy', 'Rewards'],
      ['games', '/student/games', 'game', 'Games'],
    ],
    foot: [['help', '/student/help', 'help', 'Help']],
    menu: [['/student/avatar', 'smile', 'My avatar'], ['/student/help', 'settings', 'Help & settings']],
  },
  teacher: {
    home: '/teacher/dashboard', label: 'Teacher',
    who: () => S.teacher.name,
    avatar: () => initials('MA'),
    bell: () => S.teacher.notifs.filter((n) => n.unread).length,
    nav: () => [
      ['dashboard', '/teacher/dashboard', 'grid', 'Dashboard'],
      ['exams', '/teacher/exams', 'doc', 'Exams & mark schemes'],
      ['verify', '/teacher/verify', 'eye', 'To verify', S.teacher.verify.filter((v) => v.status === 'verify').length],
      ['review', '/teacher/review', 'check', 'To review', S.teacher.review.filter((r) => r.status === 'review').length],
      ['students', '/teacher/students', 'users', 'Students & gaps'],
      ['flags', '/teacher/flags', 'flag', 'Red flags', S.teacher.flags.filter((f) => f.status === 'pending').length],
      ['messages', '/teacher/messages', 'chat', 'Messages', S.teacher.conversations.reduce((a, c) => a + (c.unread || 0), 0)],
      ['posts', '/teacher/posts', 'megaphone', 'Class posts'],
    ],
    foot: [['settings', '/teacher/settings', 'settings', 'Settings']],
    menu: [['/teacher/settings', 'settings', 'Settings']],
    search: true,
  },
  parent: {
    home: '/parent/overview', label: 'Parent',
    who: () => S.parent.name,
    avatar: () => initials('MM'),
    bell: () => S.parent.notifs.filter((n) => n.unread).length,
    nav: () => [
      ['overview', '/parent/overview', 'home', 'Overview'],
      ['exams', '/parent/exams', 'doc', 'Exams'],
      ['progress', '/parent/progress', 'trend', 'Progress'],
      ['notes', '/parent/notes', 'note', 'Notes & posts'],
    ],
    foot: [['settings', '/parent/settings', 'settings', 'Settings']],
    menu: [['/parent/settings', 'settings', 'Settings']],
  },
};

function initials(s) { return `<span class="initials">${esc(s)}</span>`; }

function topbar(role) {
  const R = ROLE[role];
  const bell = R.bell();
  return `<header class="top">
    <a class="brand" href="#${R.home}" title="${esc(t('Home'))}"><span class="logo">${icon('check', 18)}</span><span class="brand-name">GradeBuddy</span></a>
    <span class="role-pill">${esc(t(R.label))}</span>
    ${R.search ? `<div class="search" id="search"><span class="search-ic">${icon('search', 18)}</span><input type="search" placeholder="${esc(t('Search student or exam'))}" aria-label="${esc(t('Search student or exam'))}" autocomplete="off"><div class="search-results" hidden></div></div>` : ''}
    <span class="grow"></span>
    <div class="lang" role="group" aria-label="Language">
      <button type="button" data-lang="en" aria-pressed="${SET.lang === 'en'}">EN</button><span aria-hidden="true">|</span><button type="button" data-lang="de" aria-pressed="${SET.lang === 'de'}">DE</button>
    </div>
    ${role === 'student' ? '' : `<button type="button" class="bell help-btn" id="help" aria-label="${esc(t('Help'))}" title="${esc(t('Help'))}">${icon('help', 20)}</button>`}
    <div class="pop-wrap">
      <button type="button" class="bell" id="bell" aria-label="${esc(t('Notifications'))}${bell ? ` (${bell})` : ''}">${icon('bell', 20)}${bell ? `<span class="count">${bell}</span>` : ''}</button>
      <div class="pop" id="bell-pop" hidden></div>
    </div>
    <div class="pop-wrap">
      <button type="button" class="me" id="me" aria-haspopup="true"><span class="me-av">${R.avatar()}</span><span class="me-name">${esc(R.who())}</span>${icon('down', 16)}</button>
      <div class="pop menu" id="me-pop" hidden>
        ${R.menu.map(([h, ic, l]) => `<a href="#${h}">${icon(ic, 18)}${esc(t(l))}</a>`).join('')}
        <button type="button" data-signout>${icon('logout', 18)}${esc(t('Sign out'))}</button>
      </div>
    </div>
  </header>`;
}

function sidebar(role, active) {
  const R = ROLE[role];
  const item = ([k, h, ic, l, n]) => `<a href="#${h}" class="nav-item" ${k === active ? 'aria-current="page"' : ''} data-nav="${k}">${icon(ic, 20)}<span>${esc(t(l))}</span>${n ? `<span class="n">${n}</span>` : ''}</a>`;
  return `<nav class="side" aria-label="${esc(t('Main'))}"><div class="side-main">${R.nav().map(item).join('')}</div><div class="side-foot">${R.foot.map(item).join('')}</div></nav>`;
}

function bottomNav(active) {
  const items = [['home', '/student/home', 'home', 'Home'], ['subjects', '/student/subjects', 'books', 'Subjects'], ['results', '/student/results', 'star', 'Results'], ['progress', '/student/progress', 'trend', 'Progress']];
  return `<nav class="bottom-nav" aria-label="${esc(t('Main'))}">${items.map(([k, h, ic, l]) => `<a href="#${h}" ${k === active ? 'aria-current="page"' : ''}>${icon(ic, 20)}<span>${esc(t(l))}</span></a>`).join('')}<button type="button" data-buddy>${icon('chat', 20)}<span>Buddy</span></button></nav>`;
}

function draw(role, v) {
  document.title = (v.title ? t(v.title) + ' · ' : '') + 'GradeBuddy';
  const app = $('#app');
  if (!role) { app.innerHTML = v.html; v.mount && v.mount(app); return; }
  const focus = v.layout === 'focus';
  app.innerHTML = `<div class="shell ${focus ? 'is-focus' : ''} role-${role}">
    ${topbar(role)}
    ${focus ? '' : sidebar(role, v.nav)}
    <main class="main" id="main" tabindex="-1">${v.html}</main>
  </div>
  ${role === 'student' && !v.noBuddy ? `<button type="button" class="fab" data-buddy>${icon('chat', 20)}<span>${esc(t('Ask Buddy'))}</span></button>` : ''}
  ${role === 'student' && !focus ? bottomNav(v.nav) : ''}`;
  bindShell(role);
  v.mount && v.mount($('#main'));
  if (role === 'student' && Buddy.isOpen()) Buddy.mountPanel();
}

function closeMenus() { $$('.pop').forEach((p) => { p.hidden = true; }); }

function bindShell(role) {
  $$('[data-lang]').forEach((b) => b.addEventListener('click', () => { SET.lang = b.dataset.lang; saveSettings(); refresh(); }));
  $('#me').addEventListener('click', (e) => { e.stopPropagation(); const p = $('#me-pop'); const h = p.hidden; closeMenus(); p.hidden = !h; });
  $('#bell').addEventListener('click', (e) => {
    e.stopPropagation();
    if (role === 'student') return go('/student/messages');
    const p = $('#bell-pop'); const h = p.hidden; closeMenus();
    const list = role === 'teacher' ? S.teacher.notifs : S.parent.notifs;
    p.innerHTML = `<div class="pop-head"><strong>${esc(t('Notifications'))}</strong><button type="button" class="link" data-readall>${esc(t('Mark all as read'))}</button></div>` +
      (list.length ? list.map((n) => `<a href="#${n.href}" data-notif="${n.id}" class="notif ${n.unread ? 'unread' : ''}"><span class="dot"></span>${esc(t(n.text, tvars(n.vars)))}</a>`).join('') : `<p class="muted pad">${esc(t('Nothing new.'))}</p>`);
    p.hidden = !h;
    p.querySelector('[data-readall]').addEventListener('click', (ev) => { ev.stopPropagation(); list.forEach((n) => { n.unread = false; }); save(); refresh(); });
    $$('[data-notif]', p).forEach((a) => a.addEventListener('click', () => { const n = list.find((x) => x.id === a.dataset.notif); n.unread = false; save(); }));
  });
  $$('.pop').forEach((p) => p.addEventListener('click', (e) => e.stopPropagation()));
  $$('[data-signout]').forEach((b) => b.addEventListener('click', signOut));
  const hb = $('#help'); if (hb) hb.addEventListener('click', (e) => { e.stopPropagation(); helpModal(role); });
  $$('[data-buddy]').forEach((b) => b.addEventListener('click', () => Buddy.open()));
  const sr = $('#search');
  if (sr) bindSearch(sr);
}
document.addEventListener('click', closeMenus);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenus(); closeModal(); Buddy.close && Buddy.isOpen() && Buddy.close(); } });

function bindSearch(box) {
  const input = $('input', box), out = $('.search-results', box);
  const items = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return [];
    const st = S.teacher.roster.filter((s) => s.short.toLowerCase().includes(q)).map((s) => ({ label: s.short, sub: t('Student') + ' · ' + t('Class') + ' 4B', href: '/teacher/student/' + s.id }));
    const ex = S.teacher.schemes.filter((x) => (x.subject + ' ' + x.title).toLowerCase().includes(q)).map((x) => ({ label: x.subject + ' · ' + x.title, sub: t('Exam') + ' · ' + x.cls, href: '/teacher/exams/' + x.id }));
    return [...st, ...ex].slice(0, 8);
  };
  const draw = () => {
    const list = items();
    out.hidden = !input.value.trim();
    out.innerHTML = list.length ? list.map((r, i) => `<a href="#${r.href}" ${i === 0 ? 'class="first"' : ''}><strong>${esc(r.label)}</strong><span class="muted">${esc(r.sub)}</span></a>`).join('') : `<p class="muted pad">${esc(t('No matches'))}</p>`;
  };
  input.addEventListener('input', draw);
  input.addEventListener('focus', draw);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = items()[0]; if (f) go(f.href); } });
  box.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => { out.hidden = true; }, { once: true });
}

/* ============ small UI bits ============ */
function chips(opts, active, attr = 'data-f') {
  return `<div class="pills" role="group">${opts.map(([v, l]) => `<button type="button" class="pill" ${attr}="${esc(v)}" aria-pressed="${v === active}">${esc(t(l))}</button>`).join('')}</div>`;
}
const SUBJECT_FILTER = () => [['all', 'All'], ...S.subjects.map((s) => [s.id, s.name])];
function subj(id) { return S.subjects.find((s) => s.id === id) || { name: id, icon: 'book', teacher: '' }; }
const SUBJ_COLORS = { math: '#1f6f5c', english: '#3d5a99', deutsch: '#b5651d', science: '#7a5aa6' };
function subjIcon(id, size = 20) { const c = SUBJ_COLORS[id]; return `<span class="sq-ic" ${c ? `style="color:${c};background:${c}1a;border-color:${c}55"` : ''}>${icon(subj(id).icon, size)}</span>`; }
/* Same back button + breadcrumb on every inner page. crumbs = [[href, label], ..., [null, current]] */
function backBar(href, crumbs) {
  return `<div class="backbar"><a class="btn ghost sm" href="#${href}">${icon('arrowL', 16)} ${esc(t('Back'))}</a>${crumbs ? `<nav class="crumbs" aria-label="${esc(t('You are here'))}">${crumbs.map(([h, l]) => h ? `<a href="#${h}">${esc(l)}</a>` : `<span aria-current="page">${esc(l)}</span>`).join(' › ')}</nav>` : ''}</div>`;
}
/* Dates in German: Mon -> Mo, Oct -> Okt */
function td(s) {
  if (SET.lang !== 'de' || !s) return s;
  const W = { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' }, M = { Mar: 'Mär', May: 'Mai', Oct: 'Okt', Dec: 'Dez' };
  return String(s).replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g, (d) => W[d]).replace(/\b(Mar|May|Oct|Dec)\b/g, (m) => M[m]);
}
const HELP = {
  teacher: [['How do I grade a new exam?', 'Students upload photos. Open <b>To verify</b>, fix the words the AI could not read, then send the papers to AI grading.'],
    ['How do I publish a grade?', 'Open <b>To review</b>, accept or change each AI score, then press <b>Publish</b>. Nothing reaches students or parents before you publish.'],
    ['What is a red flag?', 'The AI raises a red flag when a student repeats the same mistake. You confirm or dismiss it in <b>Red flags</b>.'],
    ['Shortcuts', 'In <b>To verify</b>: <b>Tab</b> jumps to the next unclear word, <b>Enter</b> accepts it. Use the search box to find a student or exam.']],
  parent: [['Where are my child’s grades?', '<b>Exams → Completed</b> shows every grade your child’s teacher confirmed.'],
    ['How do I talk to a teacher?', 'Open <b>Notes & posts</b> and press <b>Reply</b>, or use <b>Ask the teacher</b> on an upcoming exam.'],
    ['I have two children', 'Switch between them with the tabs at the top of every page.'],
    ['Change language or text size', 'Open <b>Settings</b> from the menu on the left.']],
};
function helpModal(role) {
  modal({ title: esc(t('Help')), body: `<div class="faq">${HELP[role].map(([q, a]) => `<details><summary>${esc(t(q))}</summary><p>${t(a)}</p></details>`).join('')}</div>`, actions: [{ label: esc(t('Close')), primary: true }] });
}
function bar(pct, cls = '') { return `<span class="bar ${cls}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></span>`; }
function starsFor(pct) {
  const n = Math.floor(pct / 20);
  return `<span class="stars" aria-label="${n} ${t('of 5 stars')}">${[0, 1, 2, 3, 4].map((i) => `<span class="${i < n ? 'on' : ''}">${icon('star', 18)}</span>`).join('')}</span>`;
}
function change(n) {
  if (!n) return '<span class="chg">–</span>';
  return `<span class="chg ${n > 0 ? 'up' : 'down'}">${icon(n > 0 ? 'arrowUp' : 'arrowDown', 14)}${Math.abs(n)}</span>`;
}

let toastTimer;
function toast(msg) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function modal({ title, body, actions = [], wide, onMount }) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'modal-back'; wrap.id = 'modal';
  wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-t">
    <div class="modal-head"><h2 id="modal-t">${title}</h2><button type="button" class="icon-btn" data-close aria-label="${esc(t('Close'))}">${icon('x', 20)}</button></div>
    <div class="modal-body">${body}</div>
    ${actions.length ? `<div class="modal-actions">${actions.map((a, i) => `<button type="button" class="btn ${a.primary ? 'primary' : ''}" data-act="${i}">${a.label}</button>`).join('')}</div>` : ''}
  </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) closeModal(); });
  actions.forEach((a, i) => wrap.querySelector(`[data-act="${i}"]`).addEventListener('click', () => { if (a.onClick && a.onClick(wrap) === false) return; closeModal(); }));
  onMount && onMount(wrap);
  const f = wrap.querySelector('input,textarea,button.primary') || wrap.querySelector('button');
  f && f.focus();
  return wrap;
}
function closeModal() { const m = $('#modal'); if (m) { m.remove(); stopSpeaking(); } }
function stopSpeaking() { try { speechSynthesis.cancel(); } catch (e) { /* no speech */ } }
window.addEventListener('hashchange', () => { closeModal(); stopSpeaking(); });

/* ============ sound ============ */
let audioCtx;
function beep(kind = 'ok') {
  if (!SET.sounds) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === 'ok' ? [660, 880] : kind === 'win' ? [523, 659, 784, 1047] : [300, 220];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.08, audioCtx.currentTime + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.09 + 0.18);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(audioCtx.currentTime + i * 0.09); o.stop(audioCtx.currentTime + i * 0.09 + 0.2);
    });
  } catch (e) { /* no audio */ }
}
function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ''));
    u.lang = SET.lang === 'de' ? 'de-DE' : 'en-GB'; u.rate = 0.95;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) { toast(t('Reading aloud is not supported in this browser.')); }
}

/* ============ points ============ */
function addPoints(n, text) {
  S.student.points += n;
  S.student.pointsLog.unshift({ pts: n, text });
  S.inbox.unshift({ id: 'n' + Date.now(), kind: 'reward', icon: 'star', html: 'You got <b>+{n} points</b>: {x}!', vars: { n, x: text }, day: 'today', unread: true });
  save(); beep('win');
}

/* ============ calendar file ============ */
function downloadICS(title, isoDate, details) {
  const d = isoDate.replace(/-/g, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GradeBuddy//EN', 'BEGIN:VEVENT', `UID:${d}-${Math.random().toString(36).slice(2)}@gradebuddy`,
    `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${title}`, `DESCRIPTION:${(details || '').replace(/\n/g, '\\n')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = title.replace(/[^\w]+/g, '-') + '.ics';
  document.body.appendChild(a); a.click(); a.remove();
  toast(t('Added. Open the downloaded file to save it to your calendar.'));
}

/* ============ charts ============ */
function lineChart(pts, o = {}) {
  const W = 560, H = o.h || 230, pl = 40, pr = 30, pt = 28, pb = 34;
  const n = pts.length;
  const x = (i) => pl + (n === 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (n - 1));
  const y = (v) => pt + (H - pt - pb) * (1 - v / 100);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || '')}">`;
  s += `<line class="axis" x1="${pl}" y1="${pt - 8}" x2="${pl}" y2="${H - pb}"/><line class="axis" x1="${pl}" y1="${H - pb}" x2="${W - pr + 10}" y2="${H - pb}"/>`;
  [50, 100].forEach((v) => { s += `<line class="grid" x1="${pl}" x2="${W - pr + 10}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; });
  if (o.avg != null) s += `<line class="avg" x1="${pl}" x2="${W - pr + 10}" y1="${y(o.avg)}" y2="${y(o.avg)}"/><text class="ax" x="${W - pr}" y="${y(o.avg) - 6}" text-anchor="end">${esc(t('class avg'))}</text>`;
  if (n > 1 && !o.noLine) s += `<polyline class="line" points="${pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')}"/>`;
  pts.forEach((p, i) => {
    const last = i === n - 1;
    s += `<g><title>${esc(t(p.label))}${p.date ? ' · ' + esc(p.date) : ''}: ${p.v}%</title><circle class="pt ${last ? 'last' : ''}" cx="${x(i)}" cy="${y(p.v)}" r="${last ? 8 : 6.5}" ${p.color ? `style="fill:${p.color};stroke:${p.color}"` : ''}/></g>`;
    if (last || o.allValues) s += `<text class="val" x="${x(i)}" y="${y(p.v) - 14}" text-anchor="middle">${p.v}%</text>`;
    s += `<text class="ax" x="${x(i)}" y="${H - pb + 20}" text-anchor="middle">${esc(o.xKey === 'date' ? td(p.date) : t(p.label))}</text>`;
  });
  return s + '</svg>';
}
function barChart(bars, o = {}) {
  const W = 360, H = o.h || 150, pb = 24, gap = 14;
  const bw = (W - gap * (bars.length + 1)) / bars.length;
  const min = Math.min(...bars.map((b) => b.v));
  let s = `<svg class="chart bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || '')}">`;
  bars.forEach((b, i) => {
    const h = ((H - pb - 16) * b.v) / 100, xx = gap + i * (bw + gap);
    s += `<g><title>${esc(t(b.label))}: ${b.v}%</title><rect class="${b.v === min ? 'low' : ''}" x="${xx}" y="${H - pb - h}" width="${bw}" height="${h}" rx="3"/></g>`;
    s += `<text class="ax" x="${xx + bw / 2}" y="${H - pb - h - 5}" text-anchor="middle">${b.v}</text><text class="ax" x="${xx + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(t(b.label))}</text>`;
  });
  return s + '</svg>';
}

/* ============ avatar ============ */
const AV = {
  face: { opts: ['#f3d2b3', '#deaa80', '#b47a50', '#7b4b2c'], cost: [0, 0, 0, 150] },
  hair: { opts: ['short', 'long', 'curly', 'spiky'], cost: [0, 0, 0, 150] },
  clothes: { opts: ['#2f6f5e', '#3d5a99', '#c45a3c', 'stripes'], cost: [0, 0, 0, 150] },
  hats: { opts: ['none', 'cap', 'beanie', 'crown'], cost: [0, 0, 0, 150] },
  background: { opts: ['#dcebe4', '#dde5f3', '#f5e6cc', 'stars'], cost: [0, 0, 0, 150] },
};
function avatarSVG(a, size = 120) {
  const skin = AV.face.opts[a.face] || AV.face.opts[0];
  const hair = AV.hair.opts[a.hair], cl = AV.clothes.opts[a.clothes], hat = AV.hats.opts[a.hats], bg = AV.background.opts[a.background];
  const hc = '#3b2a20';
  let s = `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="avc"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#avc)">`;
  s += bg === 'stars' ? '<rect width="100" height="100" fill="#26315a"/><g fill="#f4c542"><circle cx="18" cy="20" r="2"/><circle cx="80" cy="16" r="2.5"/><circle cx="86" cy="52" r="1.6"/><circle cx="12" cy="58" r="1.6"/><circle cx="64" cy="10" r="1.3"/></g>' : `<rect width="100" height="100" fill="${bg}"/>`;
  if (hair === 'long') s += `<path d="M27 44c0-20 46-20 46 0v34H27z" fill="${hc}"/>`;
  s += cl === 'stripes'
    ? '<path d="M18 100c0-20 14-30 32-30s32 10 32 30z" fill="#f4c542"/><path d="M20 88h60M23 80h54M18 96h64" stroke="#c4532f" stroke-width="4"/>'
    : `<path d="M18 100c0-20 14-30 32-30s32 10 32 30z" fill="${cl}"/>`;
  s += `<rect x="44" y="60" width="12" height="12" fill="${skin}"/><circle cx="50" cy="46" r="20" fill="${skin}"/>`;
  s += '<circle cx="43" cy="46" r="2.2" fill="#2a2a2a"/><circle cx="57" cy="46" r="2.2" fill="#2a2a2a"/><path d="M44 54q6 5 12 0" stroke="#2a2a2a" stroke-width="2" fill="none" stroke-linecap="round"/>';
  if (hair === 'short') s += `<path d="M30 42c0-16 40-16 40 0-6-6-14-8-20-8s-14 2-20 8z" fill="${hc}"/>`;
  if (hair === 'long') s += `<path d="M30 44c0-18 40-18 40 0-8-8-32-8-40 0z" fill="${hc}"/>`;
  if (hair === 'curly') s += `<g fill="${hc}"><circle cx="34" cy="34" r="7"/><circle cx="43" cy="28" r="7"/><circle cx="53" cy="27" r="7"/><circle cx="62" cy="30" r="7"/><circle cx="68" cy="38" r="6"/><circle cx="31" cy="42" r="5"/></g>`;
  if (hair === 'spiky') s += `<path d="M30 40l4-14 6 8 5-12 5 11 6-11 4 12 6-8 4 14c-12-4-28-4-40 0z" fill="#d9822b"/>`;
  if (hat === 'cap') s += '<path d="M29 37c0-15 42-15 42 0z" fill="#c0392b"/><path d="M60 36h22v4H60z" fill="#a93226"/>';
  if (hat === 'beanie') s += '<path d="M29 39c0-20 42-20 42 0z" fill="#3d5a99"/><rect x="28" y="35" width="44" height="7" rx="3" fill="#2c4373"/><circle cx="50" cy="19" r="4" fill="#2c4373"/>';
  if (hat === 'crown') s += '<path d="M33 34 35 18l8 8 7-11 7 11 8-8 2 16z" fill="#f4c542" stroke="#c99a1b" stroke-width="1.2"/>';
  return s + '</g></svg>';
}

/* ============ fake scanned paper ============ */
function scanSVG(lines, o = {}) {
  if (o.mini) {
    const l = lines[0];
    return `<svg class="scan" viewBox="0 0 360 96" role="img" aria-label="${esc(t('Photo of the answer'))}"><rect width="360" height="96" fill="#fbfaf6"/><line x1="10" x2="350" y1="40" y2="40" stroke="#d8e2ee"/><line x1="10" x2="350" y1="76" y2="76" stroke="#d8e2ee"/><line x1="36" x2="36" y1="0" y2="96" stroke="#efc4c4"/><text x="44" y="30" class="scan-q">${esc(l.q)}</text><text x="50" y="68" class="scan-a">${esc(l.a)}</text></svg>`;
  }
  const H = 60 + lines.length * 74;
  let s = `<svg class="scan" viewBox="0 0 520 ${Math.max(H, o.minH || 640)}" role="img" aria-label="${esc(t('Scanned exam page'))}"><rect width="520" height="${Math.max(H, o.minH || 640)}" fill="#fbfaf6"/>`;
  for (let yy = 70; yy < Math.max(H, o.minH || 640); yy += 30) s += `<line x1="30" x2="500" y1="${yy}" y2="${yy}" stroke="#d8e2ee" stroke-width="1"/>`;
  s += '<line x1="62" x2="62" y1="0" y2="2000" stroke="#efc4c4" stroke-width="1.2"/>';
  lines.forEach((l, i) => {
    const yy = 60 + i * 74;
    s += `<text x="72" y="${yy}" class="scan-q">${esc(l.q)}</text><text x="84" y="${yy + 32}" class="scan-a">${esc(l.a)}</text>`;
    if (l.drawing) s += `<g transform="translate(330 ${yy - 6})"><circle cx="34" cy="20" r="26" fill="none" stroke="#2b3a67" stroke-width="2"/><path d="M34 -6v52M8 20h52" stroke="#2b3a67" stroke-width="1.6"/><path d="M34 20V-6A26 26 0 0 0 8 20z M34 20h26a26 26 0 0 1-26 26z" fill="#2b3a67" opacity=".35"/></g>`;
  });
  if (o.dark) s += `<rect width="520" height="${Math.max(H, o.minH || 640)}" fill="#000" opacity=".55"/>`;
  return s + '</svg>';
}
function pageThumb(n, o = {}) {
  const lines = [{ q: `${n}.`, a: '~~~ ~~ ~~~~' }, { q: `${n + 1}.`, a: '~~ ~~~~ ~' }, { q: `${n + 2}.`, a: '~~~~ ~~' }];
  return `<div class="thumb ${o.cls || ''}">${o.src ? `<img src="${esc(o.src)}" alt="">` : scanSVG(lines, { minH: 680, dark: o.dark })}</div>`;
}
