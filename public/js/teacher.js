'use strict';
/* ===================== Teacher views ===================== */
const TS = () => S.teacher;
const stu = (sid) => TS().roster.find((s) => s.id === sid) || { short: '?', parent: '' };
const pct = (a, b) => Math.round((a / b) * 100);
const QMAX = FRACTIONS_QS.reduce((a, q) => a + q.max, 0);
const DEMO_TODAY = '10 Oct';
/* "Math · Fractions Test" for a verify / review item, translated */
const itemLabel = (x) => `${t((x && x.subject) || 'Math')} · ${t((x && x.exam) || 'Fractions Test')}`;

/* ---- OCR token helpers: text like "The answer is [[2/3|7/3|2/5]]" ---- */
function parseTok(text) {
  const out = []; let last = 0;
  text.replace(/\[\[([^\]]+)\]\]/g, (m, inner, i) => { if (i > last) out.push({ t: 'txt', v: text.slice(last, i) }); const a = inner.split('|'); out.push({ t: 'tok', v: a[0], alts: a }); last = i + m.length; return m; });
  if (last < text.length) out.push({ t: 'txt', v: text.slice(last) });
  return out;
}
const unclearIn = (text) => (text.match(/\[\[/g) || []).length;
const plainText = (text) => text.replace(/\[\[([^|\]]+)[^\]]*\]\]/g, '$1');
const itemUnclear = (v) => v.pages.reduce((a, p) => a + p.qs.reduce((b, q) => b + unclearIn(q.text), 0), 0);
function replaceTok(text, k, val) { let i = -1; return text.replace(/\[\[[^\]]+\]\]/g, (m) => (++i === k ? val : m)); }

/* ---- grading simulation: verified papers are "graded" after a few seconds ---- */
function startGrading(item) {
  TS().grading.push({ id: item.id, sid: item.sid, sent: item.sent, started: Date.now() });
  item.status = 'grading';
  save();
  setTimeout(() => {
    const g = TS().grading.find((x) => x.id === item.id); if (!g) return;
    TS().grading = TS().grading.filter((x) => x.id !== item.id);
    const younis = item.sid === 's1';
    const scores = younis ? [2, 3, 1, 2, 1] : item.sid === 's2' ? [2, 3, 1, 2, 2] : [2, 2, 2, 2, 1];
    const conf = younis ? ['high', 'high', 'medium', 'high', 'medium'] : item.sid === 's2' ? ['high', 'high', 'medium', 'high', 'high'] : ['high', 'medium', 'high', 'high', 'high'];
    TS().review = TS().review.filter((r) => r.id !== 'r-' + item.id);
    const r = reviewItem('r-' + item.id, item.sid, item.sent, scores, conf, younis ? 'Fractions' : null);
    Object.assign(r, { examId: item.examId || null, exam: item.exam || 'Fractions Test', subject: item.subject || 'Math' });
    TS().review.push(r);
    item.status = 'graded';
    TS().notifs.unshift({ id: 't' + Date.now(), text: 'Grading finished: {n} · {x}', vars: { n: stu(item.sid).short, x: r.exam }, unread: true, href: '/teacher/review/' + r.id });
    if (younis && !TS().flags.some((f) => f.id === YOUNIS_FLAG.id)) {
      TS().flags.unshift(clone(YOUNIS_FLAG));
      TS().notifs.unshift({ id: 't' + Date.now() + 'f', text: 'New red flag: {n} · {x}', vars: { n: stu(item.sid).short, x: 'Fractions' }, unread: true, href: '/teacher/flags/' + YOUNIS_FLAG.id });
    }
    save();
    if (CUR.role === 'teacher') refresh();
  }, 6000);
}

function stageChip(kind, extra) {
  return {
    review: `<span class="chip">${icon('chip', 15)} ${esc(t('AI graded'))}</span>`,
    verify: `<span class="chip dashed">${icon('eye', 15)} ${esc(t('Verify text'))}${extra ? ' · ' + esc(t('{n} unclear', { n: extra })) : ''}</span>`,
    grading: `<span class="chip">${icon('clock', 15)} ${esc(t('AI grading…'))}</span>`,
    published: `<span class="chip dark">${icon('check', 15)} ${esc(t('Published'))}</span>`,
  }[kind];
}

/* ---------- Dashboard ---------- */
let DASH = { cls: '4B', exam: 'all' };
route('/teacher/dashboard', 'teacher', () => {
  const T = TS();
  const nV = T.verify.filter((v) => v.status === 'verify').length, nR = T.review.filter((r) => r.status === 'review').length, nF = T.flags.filter((f) => f.status === 'pending').length;
  const rows = DASH.cls !== '4B' ? [] : [
    ...T.review.filter((r) => r.status === 'review').map((r) => ({ sid: r.sid, sent: r.sent, chip: stageChip('review'), act: `<a class="btn primary sm" href="#/teacher/review/${r.id}">${esc(t('Review'))}</a>` })),
    ...T.verify.filter((v) => v.status === 'verify').map((v) => ({ sid: v.sid, sent: v.sent, chip: stageChip('verify', itemUnclear(v)), act: `<a class="btn sm" href="#/teacher/verify/${v.id}">${esc(t('Verify'))}</a>` })),
    ...T.grading.map((g) => ({ sid: g.sid, sent: g.sent, chip: stageChip('grading'), act: `<span class="muted small">${esc(t('wait'))}</span>` })),
    ...T.published.map((p) => ({ sid: p.sid, sent: p.sent, chip: stageChip('published'), act: `<a class="btn ghost sm" href="#/teacher/student/${p.sid}">${esc(t('View'))}</a>` })),
  ];
  const pend = T.flags.filter((f) => f.status === 'pending');
  const hour = new Date().getHours();
  return {
    title: 'Dashboard', nav: 'dashboard',
    html: `<div class="row between wrap head-row"><h1 class="page inline">${esc(t(hour < 12 ? 'Good morning, {n}' : hour < 18 ? 'Good afternoon, {n}' : 'Good evening, {n}', { n: T.name }))}</h1>
      <div class="row gap"><label class="sr" for="cls">${esc(t('Class'))}</label><select id="cls" class="select">${['4B', '4A'].map((c) => `<option value="${c}" ${DASH.cls === c ? 'selected' : ''}>${esc(t('Class'))} ${c}</option>`).join('')}</select></div></div>
      <div class="stats">
        <div class="card stat"><span>${icon('eye', 18)} ${esc(t('Text to verify'))}</span><div class="row between center"><b>${nV}</b><a class="btn primary sm" href="#/teacher/verify${T.verify.find((v) => v.status === 'verify') ? '/' + T.verify.find((v) => v.status === 'verify').id : ''}">${esc(t('Start verifying'))}</a></div></div>
        <div class="card stat"><span>${icon('chip', 18)} ${esc(t('AI graded · to review'))}</span><div class="row between center"><b>${nR}</b><a class="btn sm" href="#/teacher/review">${esc(t('Review'))}</a></div></div>
        <div class="card stat"><span>${icon('flag', 18)} ${esc(t('New red flags'))}</span><div class="row between center"><b>${nF}</b><a class="btn sm" href="#/teacher/flags">${esc(t('See flags'))}</a></div></div>
        <div class="card stat soft"><span>${icon('check', 18)} ${esc(t('Published this week'))}</span><div class="row gap center"><b>${T.publishedWeek}</b><span class="muted small">${esc(t('of {n} exams', { n: T.examsWeek }))}</span></div></div>
      </div>
      <div class="cols-3-2">
        <section class="card"><div class="row between center"><h2>${esc(t('Work queue'))}</h2><label class="row gap center small">${icon('filter', 16)}<select class="select sm" id="qexam"><option value="all">${esc(t('All exams'))}</option><option value="frac" ${DASH.exam === 'frac' ? 'selected' : ''}>${esc(itemLabel())}</option></select></label></div>
          ${rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>${esc(t('Student'))}</th><th>${esc(t('Stage'))}</th><th>${esc(t('Sent'))}</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr><td><a class="plain" href="#/teacher/student/${r.sid}">${esc(stu(r.sid).short)}</a></td><td>${r.chip}</td><td>${esc(r.sent)}</td><td class="right">${r.act}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(t('Nothing waiting for class {c}.', { c: DASH.cls }))}</p>`}</section>
        <div class="stack">
          <section class="card"><h2>${icon('flag', 20)} ${esc(t('Red flags to decide'))}</h2>${pend.length ? pend.map((f) => `<div class="row between center line"><span><b>${esc(stu(f.sid).short)}</b> · ${esc(f.topic)}<span class="block small">${esc(t(f.reason.charAt(0).toUpperCase() + f.reason.slice(1)))}</span></span><a class="btn sm" href="#/teacher/flags/${f.id}">${esc(t('Open'))}</a></div>`).join('') : `<p class="muted">${esc(t('No red flags to decide.'))}</p>`}</section>
          <section class="card soft"><h2>${icon('chart', 20)} ${esc(t('Class {c} · Math average', { c: DASH.cls }))}</h2>${barChart(T.termAvg, { label: t('Class average per exam') })}<p class="muted small">${esc(t('Fractions Test is the lowest this term.'))}</p></section>
        </div>
      </div>`,
    mount(el) {
      $('#cls', el).addEventListener('change', (e) => { DASH.cls = e.target.value; refresh(); });
      $('#qexam', el).addEventListener('change', (e) => { DASH.exam = e.target.value; refresh(); });
    },
  };
});

/* ---------- Exams & mark schemes ---------- */
route('/teacher/exams', 'teacher', () => ({
  title: 'Exams & mark schemes', nav: 'exams',
  html: `<div class="row between head-row"><h1 class="page inline">${esc(t('Exams & mark schemes'))}</h1><a class="btn primary" href="#/teacher/exams/new">${icon('plus', 18)} ${esc(t('New exam'))}</a></div>
    <div class="table-wrap card flush"><table class="table"><thead><tr><th>${esc(t('Exam'))}</th><th>${esc(t('Class'))}</th><th>${esc(t('Language'))}</th><th>${esc(t('Questions'))}</th><th>${esc(t('Students send by'))}</th><th>${esc(t('Status'))}</th><th></th></tr></thead><tbody>
    ${TS().schemes.map((x) => `<tr><td><b>${esc(x.subject)} · ${esc(x.title)}</b></td><td>${esc(x.cls)}</td><td>${esc(t(x.lang))}</td><td>${x.qs.length}</td><td>${esc(fmtDate(x.sendBy))}</td><td>${x.status === 'open' ? `<span class="chip dark">${esc(t('Open for upload'))}</span>` : x.status === 'draft' ? `<span class="chip dashed">${esc(t('Draft'))}</span>` : `<span class="chip">${esc(t('Closed'))}</span>`}</td><td class="right"><a class="btn sm" href="#/teacher/exams/${x.id}">${esc(t('Edit'))}</a></td></tr>`).join('')}
    </tbody></table></div>`,
}));
function fmtDate(iso) { if (!iso) return '–'; const d = new Date(iso + 'T12:00'); return d.toLocaleDateString(SET.lang === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }

let EX = null;
route('/teacher/exams/:id', 'teacher', ({ id }) => {
  if (!EX || EX.id !== id) {
    const src = id === 'new' ? { id: 'new', subject: 'Math', cls: '4B', lang: 'English', title: '', pages: 4, sendBy: '2025-10-17', status: 'draft', qs: [{ n: 1, marks: 2, criteria: '', topic: '' }] } : TS().schemes.find((x) => x.id === id);
    if (!src) return go('/teacher/exams');
    EX = { ...clone(src), aiRead: false, reading: false };
  }
  const topics = ['Multiplication', 'Word problems', 'Fractions: compare', 'Fractions: order', 'Fractions: halves', 'Decimals', 'Shapes'];
  return {
    title: id === 'new' ? 'New exam' : EX.title, nav: 'exams',
    html: `${backBar('/teacher/exams', [['/teacher/dashboard', t('Dashboard')], ['/teacher/exams', t('Exams & mark schemes')], [null, id === 'new' ? t('New exam') : EX.title]])}
      <form class="exam-form" novalidate>
        <div class="form-grid">
          <label class="field"><span>${esc(t('Subject'))}</span><select class="select" name="subject">${['Math', 'English', 'Deutsch', 'Science'].map((s) => `<option ${EX.subject === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <label class="field"><span>${esc(t('Class'))}</span><select class="select" name="cls">${['4B', '4A'].map((s) => `<option ${EX.cls === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
          <div class="field"><span>${esc(t('Language'))}</span><div class="seg" role="group">${['English', 'Deutsch'].map((l) => `<button type="button" data-lang-ex="${l}" aria-pressed="${EX.lang === l}">${l}</button>`).join('')}</div></div>
          <label class="field"><span>${esc(t('Pages'))}</span><input type="number" min="1" max="20" name="pages" value="${EX.pages}"></label>
          <label class="field span3"><span>${esc(t('Exam title'))}</span><input name="title" value="${esc(EX.title)}" placeholder="${esc(t('e.g. Fractions Test'))}" required></label>
          <label class="field"><span>${esc(t('Students send by'))}</span><input type="date" name="sendBy" value="${esc(EX.sendBy)}"></label>
        </div>
        <section class="card">
          <div class="row between wrap center"><h2>${esc(t('Questions & mark scheme'))}</h2><div class="row gap wrap"><label class="btn sm">${icon('upload', 16)} ${esc(t('Upload mark scheme (PDF)'))}<input type="file" accept="application/pdf,image/*" hidden data-pdf></label><button type="button" class="btn ghost sm" data-template>${esc(t('Use a template'))}</button></div></div>
          ${EX.reading ? `<p class="muted">${icon('clock', 16)} ${esc(t('Reading your PDF…'))}</p>` : ''}
          <div class="table-wrap"><table class="table qtable"><thead><tr><th>Q</th><th>${esc(t('Marks'))}</th><th>${esc(t('Criteria (what earns a mark)'))}</th><th>${esc(t('Topic'))}</th><th></th></tr></thead><tbody>
            ${EX.qs.map((q, i) => `<tr><td><input class="qn" name="n" data-i="${i}" value="${q.n}" aria-label="Q"></td><td><input class="qm" type="number" min="0" name="marks" data-i="${i}" value="${q.marks}" aria-label="${esc(t('Marks'))}"></td><td><input name="criteria" data-i="${i}" value="${esc(q.criteria)}" placeholder="${esc(t('e.g. Correct product 42 (2)'))}" aria-label="${esc(t('Criteria'))}"></td><td><input class="topic-in" list="topics" name="topic" data-i="${i}" value="${esc(q.topic)}" aria-label="${esc(t('Topic'))}"></td><td><button type="button" class="icon-btn" data-rmq="${i}" aria-label="${esc(t('Remove question'))}">${icon('x', 16)}</button></td></tr>`).join('')}
          </tbody></table></div><datalist id="topics">${topics.map((x) => `<option value="${x}">`).join('')}</datalist>
          <div class="row gap center wrap"><button type="button" class="btn ghost sm" data-addq>${icon('plus', 16)} ${esc(t('Add question'))}</button>${EX.aiRead ? `<span class="muted small">${icon('chip', 15)} ${esc(t('AI read {n} questions from your PDF. Please check them.', { n: EX.qs.length }))}</span>` : ''}<span class="grow"></span><span class="small muted">${esc(t('Total'))}: <b>${EX.qs.reduce((a, q) => a + (+q.marks || 0), 0)}</b> ${esc(t('marks'))}</span></div>
        </section>
        <p class="err" role="alert" hidden></p>
        <div class="row between wrap center"><span class="muted">${esc(t('Students can upload once you open it.'))}</span><div class="row gap"><button type="button" class="btn lg" data-draft>${esc(t('Save draft'))}</button><button type="submit" class="btn primary lg">${esc(t('Open for upload'))} ${icon('arrowR', 18)}</button></div></div>
      </form>`,
    mount(el) {
      const f = $('form', el), err = $('.err', el);
      const sync = () => {
        ['subject', 'cls', 'title', 'sendBy'].forEach((k) => { EX[k] = f[k].value; });
        EX.pages = +f.pages.value || 1;
        $$('[data-i]', el).forEach((inp) => { const q = EX.qs[+inp.dataset.i]; q[inp.name] = inp.name === 'marks' ? +inp.value : inp.value; });
      };
      f.addEventListener('input', sync);
      f.addEventListener('change', sync);
      $$('[data-lang-ex]', el).forEach((b) => b.addEventListener('click', () => { sync(); EX.lang = b.dataset.langEx; refresh(); }));
      $('[data-addq]', el).addEventListener('click', () => { sync(); const n = EX.qs.length ? +EX.qs[EX.qs.length - 1].n + 1 : 1; EX.qs.push({ n, marks: 1, criteria: '', topic: '' }); refresh(); });
      $$('[data-rmq]', el).forEach((b) => b.addEventListener('click', () => { sync(); EX.qs.splice(+b.dataset.rmq, 1); refresh(); }));
      $('[data-pdf]', el).addEventListener('change', (e) => {
        if (!e.target.files.length) return;
        sync(); EX.reading = true; refresh();
        setTimeout(() => { if (!EX) return; EX.reading = false; EX.aiRead = true; EX.qs = FRACTIONS_QS.map((q) => ({ n: q.n, marks: q.max, criteria: q.scheme.join(' · '), topic: q.topic })); if (!EX.title) EX.title = 'Fractions Test'; refresh(); }, 1400);
      });
      $('[data-template]', el).addEventListener('click', () => {
        sync();
        const tpl = { frac: ['Fractions Test (5 questions)', FRACTIONS_QS.map((q) => ({ n: q.n, marks: q.max, criteria: q.scheme.join(' · '), topic: q.topic }))],
          times: ['Times tables quiz (10 × 1 mark)', Array.from({ length: 10 }, (_, i) => ({ n: i + 1, marks: 1, criteria: 'Correct product (1)', topic: 'Multiplication' }))],
          words: ['Word problems (3 × 3 marks)', [1, 2, 3].map((n) => ({ n, marks: 3, criteria: 'Correct operation (1) · working (1) · answer with unit (1)', topic: 'Word problems' }))] };
        modal({ title: esc(t('Use a template')), body: `<div class="radio-list">${Object.entries(tpl).map(([k, [l]], i) => `<label class="radio-card"><input type="radio" name="tpl" value="${k}" ${i === 0 ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`,
          actions: [{ label: esc(t('Cancel')) }, { label: esc(t('Use template')), primary: true, onClick: (m) => { EX.qs = clone(tpl[$('input[name=tpl]:checked', m).value][1]); EX.aiRead = false; refresh(); } }] });
      });
      const store_ = (status) => {
        const rec = { id: EX.id === 'new' ? 'ex' + Date.now() : EX.id, subject: EX.subject, cls: EX.cls, lang: EX.lang, title: EX.title, pages: EX.pages, sendBy: EX.sendBy, status, qs: EX.qs };
        const i = TS().schemes.findIndex((x) => x.id === rec.id);
        if (i > -1) TS().schemes[i] = rec; else TS().schemes.unshift(rec);
        save(); EX = null; return rec;
      };
      $('[data-draft]', el).addEventListener('click', () => { sync(); if (!EX.title.trim()) { err.textContent = t('Please give the exam a title.'); err.hidden = false; return; } store_('draft'); toast(esc(t('Draft saved.'))); go('/teacher/exams'); });
      f.addEventListener('submit', (e) => {
        e.preventDefault(); sync();
        const bad = !EX.title.trim() ? t('Please give the exam a title.') : !EX.qs.length ? t('Add at least one question.') : EX.qs.some((q) => !String(q.criteria).trim()) ? t('Every question needs criteria (what earns a mark).') : '';
        if (bad) { err.textContent = bad; err.hidden = false; return; }
        const rec = store_('open'); toast(esc(t('{x} is open. Students can upload now.', { x: rec.title }))); go('/teacher/exams');
      });
    },
  };
});
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/teacher/exams/')) EX = null; });

/* ---------- To verify (list) ---------- */
route('/teacher/verify', 'teacher', () => {
  const list = TS().verify.filter((v) => v.status === 'verify');
  return {
    title: 'To verify', nav: 'verify',
    html: `<div class="row between head-row"><h1 class="page inline">${esc(t('To verify'))}</h1></div>
      <p class="muted">${esc(t('Check the text that OCR read from each scan before it goes to AI grading.'))}</p>
      ${list.length ? `<div class="table-wrap card flush"><table class="table"><thead><tr><th>${esc(t('Student'))}</th><th>${esc(t('Exam'))}</th><th>${esc(t('Sent'))}</th><th>${esc(t('Unclear words'))}</th><th>${esc(t('Pages verified'))}</th><th></th></tr></thead><tbody>
        ${list.map((v) => `<tr><td><b>${esc(stu(v.sid).short)}</b></td><td>${esc(itemLabel(v))}</td><td>${esc(v.sent)}</td><td>${itemUnclear(v) ? `<span class="chip dashed">${itemUnclear(v)}</span>` : '0'}</td><td>${v.pages.filter((p) => p.verified).length} / ${v.pages.length}</td><td class="right"><a class="btn primary sm" href="#/teacher/verify/${v.id}">${esc(t('Verify'))}</a></td></tr>`).join('')}
      </tbody></table></div>` : `<section class="card"><p>${esc(t('Nothing to verify right now.'))}</p><a class="btn" href="#/teacher/dashboard">${esc(t('Dashboard'))}</a></section>`}`,
  };
});

/* ---------- Verify one paper ---------- */
let VU = null;
route('/teacher/verify/:id', 'teacher', ({ id }) => {
  const v = TS().verify.find((x) => x.id === id);
  if (!v || v.status !== 'verify') return go('/teacher/verify');
  if (!v.orig) { v.orig = clone(v.pages); save(); }
  if (!VU || VU.id !== id) VU = { id, page: (v.pages.find((p) => !p.verified) || v.pages[0]).n, hist: [], zoom: 1, rot: 0, fit: 'fit', cur: 0, typing: null, lang: 'English' };
  const page = v.pages.find((p) => p.n === VU.page);
  const pageUnclear = page.qs.reduce((a, q) => a + unclearIn(q.text), 0);
  const done = v.pages.filter((p) => p.verified).length, all = done === v.pages.length;
  let tokIdx = 0;
  const qHTML = (q, qi) => {
    const parts = parseTok(q.text); let k = -1;
    const field = parts.map((p) => (p.t === 'txt' ? esc(p.v) : `<mark class="unclear" data-tok="${++k}" contenteditable="false">${esc(p.v)}</mark>`)).join('');
    const boxes = parts.filter((p) => p.t === 'tok').map((p, j) => {
      const my = tokIdx++;
      return `<div class="unsure ${VU.cur === my ? 'cur' : ''}" data-unsure="${my}"><p>${esc(t('OCR is'))} <b>${esc(t('not sure'))}</b> ${esc(t('about'))} “${esc(p.v)}”. ${esc(t('Did the student write:'))}</p>
        <div class="row gap wrap">${p.alts.map((a, ai) => `<button type="button" class="pill ${ai === 0 ? 'best' : ''}" data-pickt="${qi}:${j}" data-val="${esc(a)}" aria-pressed="${ai === 0}">${esc(a)}</button>`).join('')}
        ${VU.typing === `${qi}:${j}` ? `<input class="type-in" data-typein="${qi}:${j}" placeholder="${esc(t('Type it'))}" aria-label="${esc(t('Type it'))}">` : `<button type="button" class="pill dashed" data-type="${qi}:${j}">${icon('pen', 14)} ${esc(t('Type it'))}</button>`}</div></div>`;
    }).join('');
    return `<div class="vq"><label class="small muted">Q${q.n} · ${esc(q.prompt)}</label>
      <div class="ocr-field ${unclearIn(q.text) ? 'has-unclear' : ''}" contenteditable="true" spellcheck="false" data-qi="${qi}" role="textbox" aria-label="Q${q.n}">${field}</div>
      ${q.drawing ? `<span class="chip small">${icon('image', 14)} ${esc(t('image kept'))}</span>` : ''}${boxes}</div>`;
  };
  const scanLines = (page.n === 1 ? v.orig[0] : v.orig.find((p) => p.n === page.n)).qs.map((q) => ({ q: `Q${q.n}. ${q.prompt}`, a: plainText(q.text), drawing: q.drawing }));
  return {
    title: 'Verify text', layout: 'focus',
    html: `${backBar('/teacher/verify', [['/teacher/dashboard', t('Dashboard')], ['/teacher/verify', t('To verify')], [null, stu(v.sid).short]])}<div class="focus-head"><h1>${esc(stu(v.sid).short)} · ${esc(itemLabel(v))}</h1>
        <label class="row gap center small"><span>${esc(t('Language:'))}</span><select class="select sm" data-ocrlang><option ${VU.lang === 'English' ? 'selected' : ''}>English</option><option ${VU.lang === 'Deutsch' ? 'selected' : ''}>Deutsch</option></select></label>
        <span class="grow"></span><span class="row gap center small">${esc(t('Page'))} ${v.pages.map((p) => `<button type="button" class="pg ${p.n === VU.page ? 'cur' : ''} ${p.verified ? 'ok' : ''}" data-page="${p.n}" aria-label="${esc(t('Page'))} ${p.n}${p.verified ? ' ' + esc(t('verified')) : ''}">${p.n}${p.verified ? ' ' + icon('check', 12) : ''}</button>`).join('')}</span></div>
      <div class="verify">
        <section class="card scan-card"><div class="row between center"><h2>${esc(t('Original scan'))}</h2><div class="row gap center"><button type="button" class="icon-btn" data-zoom="1" aria-label="${esc(t('Zoom in'))}">${icon('zoomIn', 18)}</button><button type="button" class="icon-btn" data-zoom="-1" aria-label="${esc(t('Zoom out'))}">${icon('zoomOut', 18)}</button><button type="button" class="icon-btn" data-rot aria-label="${esc(t('Rotate'))}">${icon('rotate', 18)}</button><select class="select sm" data-fit aria-label="${esc(t('Fit'))}"><option value="fit" ${VU.fit === 'fit' ? 'selected' : ''}>${esc(t('Fit'))}</option><option value="actual" ${VU.fit === 'actual' ? 'selected' : ''}>100%</option></select></div></div>
          <div class="scan-view ${VU.fit}"><div class="scan-inner" style="transform:scale(${VU.zoom}) rotate(${VU.rot}deg)">${scanSVG(scanLines)}</div></div></section>
        <section class="vtext"><div class="row between center wrap"><h2>${esc(t('Extracted text'))}</h2><div class="row gap"><span class="chip dashed">${esc(t('{n} unclear words', { n: pageUnclear }))}</span><button type="button" class="btn ghost sm" data-nextu ${pageUnclear ? '' : 'disabled'}>${esc(t('Next unclear'))} ${icon('arrowDown', 14)}</button></div></div>
          ${page.qs.map(qHTML).join('')}
          <div class="row between center"><div class="row gap"><button type="button" class="btn ghost sm" data-undo ${VU.hist.length ? '' : 'disabled'}>${icon('undo', 16)} ${esc(t('Undo'))}</button><button type="button" class="btn ghost sm" data-restore>${esc(t('Restore OCR text'))}</button></div><span class="muted small right">${esc(t('Tab = next unclear · Enter = accept'))}</span></div>
        </section>
      </div>
      <div class="flow-foot sticky"><div class="row gap"><button type="button" class="btn" data-draft>${esc(t('Save draft'))}</button><button type="button" class="btn" data-rescan>${icon('camera', 16)} ${esc(t('Ask for a new photo'))}</button>${VU.page > 1 ? `<button type="button" class="btn" data-page="${VU.page - 1}">${icon('arrowL', 16)} ${esc(t('Page'))} ${VU.page - 1}</button>` : ''}</div>
        <div class="row gap center wrap"><span class="muted small">${esc(t('Pages verified: {a} of {b}', { a: done, b: v.pages.length }))}</span>
        ${page.verified ? '' : `<button type="button" class="btn primary" data-confirm ${pageUnclear ? 'disabled title="' + esc(t('Fix the unclear words first')) + '"' : ''}>${esc(t('Confirm page {n}', { n: page.n }))} ${icon('arrowR', 16)}</button>`}
        <button type="button" class="btn ${all ? 'primary' : ''}" data-send ${all ? '' : 'disabled'}>${icon('chip', 16)} ${esc(t('Send to AI grading'))}</button></div></div>`,
    mount(el) {
      const snap = () => { VU.hist.push(clone(page.qs)); };
      const pick = (qi, j, val) => { snap(); page.qs[qi].text = replaceTok(page.qs[qi].text, globalTok(qi, j), val); VU.typing = null; save(); refresh(); };
      const globalTok = (qi, j) => j; // token index within that question
      $$('[data-page]', el).forEach((b) => b.addEventListener('click', () => { VU.page = +b.dataset.page; VU.hist = []; VU.cur = 0; refresh(); }));
      $$('[data-pickt]', el).forEach((b) => b.addEventListener('click', () => { const [qi, j] = b.dataset.pickt.split(':').map(Number); pick(qi, j, b.dataset.val); }));
      $$('[data-type]', el).forEach((b) => b.addEventListener('click', () => { VU.typing = b.dataset.type; refresh(); setTimeout(() => { const i = $('[data-typein]'); i && i.focus(); }, 0); }));
      $$('[data-typein]', el).forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter' && i.value.trim()) { e.preventDefault(); const [qi, j] = i.dataset.typein.split(':').map(Number); pick(qi, j, i.value.trim()); } if (e.key === 'Escape') { VU.typing = null; refresh(); } }));
      // free editing of the answer text: keep unclear tokens intact
      $$('.ocr-field', el).forEach((f) => f.addEventListener('blur', () => {
        const q = page.qs[+f.dataset.qi]; const toks = parseTok(q.text).filter((p) => p.t === 'tok');
        let out = '';
        f.childNodes.forEach((n) => { if (n.nodeType === 1 && n.dataset && n.dataset.tok != null) { const tk = toks[+n.dataset.tok]; out += `[[${tk.alts.join('|')}]]`; } else out += n.textContent; });
        out = out.replace(/ /g, ' ');
        if (out !== q.text) { snap(); q.text = out; save(); refresh(); }
      }));
      $('[data-undo]', el).addEventListener('click', () => { if (VU.hist.length) { page.qs = VU.hist.pop(); save(); refresh(); } });
      $('[data-restore]', el).addEventListener('click', () => { snap(); page.qs = clone(v.orig.find((p) => p.n === page.n).qs); save(); refresh(); });
      $('[data-ocrlang]', el).addEventListener('change', (e) => { VU.lang = e.target.value; toast(esc(t('OCR language set to {l}.', { l: VU.lang }))); });
      $$('[data-zoom]', el).forEach((b) => b.addEventListener('click', () => { VU.zoom = Math.max(0.6, Math.min(2.4, VU.zoom + 0.2 * +b.dataset.zoom)); VU.fit = 'actual'; refresh(); }));
      $('[data-rot]', el).addEventListener('click', () => { VU.rot = (VU.rot + 90) % 360; refresh(); });
      $('[data-fit]', el).addEventListener('change', (e) => { VU.fit = e.target.value; if (VU.fit === 'fit') { VU.zoom = 1; VU.rot = 0; } refresh(); });
      const boxes = $$('[data-unsure]', el);
      const focusCur = () => { const b = boxes[VU.cur]; if (b) { boxes.forEach((x) => x.classList.remove('cur')); b.classList.add('cur'); b.scrollIntoView({ block: 'center', behavior: 'smooth' }); const p = $('.pill', b); p && p.focus(); } };
      $('[data-nextu]', el).addEventListener('click', () => { VU.cur = boxes.length ? (VU.cur + 1) % boxes.length : 0; focusCur(); });
      el.onkeydown = (e) => {
        if (e.target.closest('.ocr-field') || e.target.matches('input,select')) return;
        if (e.key === 'Tab' && boxes.length) { e.preventDefault(); VU.cur = (VU.cur + (e.shiftKey ? boxes.length - 1 : 1)) % boxes.length; focusCur(); }
        if (e.key === 'Enter' && boxes.length && !e.target.closest('button')) { e.preventDefault(); const p = $('.pill.best', boxes[VU.cur]); p && p.click(); }
      };
      $('[data-draft]', el).addEventListener('click', () => { save(); toast(esc(t('Draft saved.'))); });
      const c = $('[data-confirm]', el);
      c && c.addEventListener('click', () => {
        page.qs.forEach((q) => { q.text = q.text.replace(/ /g, ' '); });
        page.verified = true; save(); beep();
        const nxt = v.pages.find((p) => !p.verified);
        if (nxt) { VU.page = nxt.n; VU.hist = []; VU.cur = 0; }
        refresh();
      });
      $('[data-send]', el).addEventListener('click', () => {
        v.status = 'grading'; startGrading(v); VU = null; go('/teacher/verified/' + v.id);
      });
      $('[data-rescan]', el).addEventListener('click', () => askNewPhoto(v, page.n));
    },
  };
});
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/teacher/verify/')) VU = null; });

/* Ask the student to retake one page: choose page + reason, then confirm before it is sent */
const RESCAN_REASONS = ['The page is too dark.', 'The photo is blurry.', 'Part of the page is cut off.', 'This is the wrong page.'];
function rescanNote(n) { return [t('Please take a new photo of page {n}.', { n: n.page }), t(n.reason), n.extra || ''].filter(Boolean).join(' '); }
function askNewPhoto(v, pageN) {
  const name = stu(v.sid).short.split(' ')[0];
  modal({
    title: esc(t('Ask for a new photo')),
    body: `<p class="muted">${esc(stu(v.sid).short)} · ${esc(itemLabel(v))}</p>
      <div class="field"><span>${esc(t('Which page?'))}</span><div class="pills" role="radiogroup">${v.pages.map((p) => `<label class="pill"><input type="radio" name="rpage" value="${p.n}" ${p.n === pageN ? 'checked' : ''}> ${esc(t('Page'))} ${p.n}</label>`).join('')}</div></div>
      <div class="field"><span>${esc(t('Why?'))}</span><div class="radio-list">${RESCAN_REASONS.map((r, i) => `<label class="radio-card"><input type="radio" name="rwhy" value="${i}" ${i === 0 ? 'checked' : ''}><span>${esc(t(r))}</span></label>`).join('')}</div></div>
      <label class="field"><span>${esc(t('Message (optional)'))}</span><textarea rows="2" id="rextra"></textarea></label>`,
    actions: [{ label: esc(t('Cancel')) }, { label: esc(t('Next')), primary: true, onClick: (m) => {
      const note = { page: +$('input[name=rpage]:checked', m).value, reason: RESCAN_REASONS[+$('input[name=rwhy]:checked', m).value], extra: $('#rextra', m).value.trim() };
      setTimeout(() => modal({
        title: esc(t('Send this to {n}?', { n: name })),
        body: `<div class="card sub"><p>“${esc(rescanNote(note))}”</p></div><p class="muted small">${esc(t('{n} will see this on the exam page and get a message. The paper leaves your To verify list until the new photo arrives.', { n: name }))}</p>`,
        actions: [{ label: esc(t('Go back')), onClick: () => { setTimeout(() => askNewPhoto(v, note.page), 0); } }, { label: esc(t('Send request')), primary: true, onClick: () => sendRescan(v, note) }],
      }), 0);
    } }],
  });
}
function sendRescan(v, note) {
  v.status = 'rescan';
  const pg = v.pages.find((p) => p.n === note.page); if (pg) pg.verified = false;
  const e = v.sid === 's1' && v.examId && S.exams.find((x) => x.id === v.examId);
  if (e) {
    e.status = 'rescan'; e.rescanPage = note.page; e.note = note;
    S.inbox = S.inbox.filter((n) => n.id !== 'rescan-' + e.id);
    S.inbox.unshift({ id: 'rescan-' + e.id, kind: 'teacher', icon: 'camera', html: '<b>Ms. Mona</b> needs a new photo of page {n} of your <b>{x}</b>.', short: 'Please retake page {n}: {x}', vars: { n: note.page, x: e.title }, time: 'now', day: 'today', when: 'Today', unread: true, action: { label: 'Take photo', href: '/student/exam/' + e.id, primary: true } });
  }
  save(); VU = null;
  toast(esc(t('Sent to {tc}.', { tc: stu(v.sid).short })));
  go('/teacher/verify');
}

/* ---------- After verifying: grading progress ---------- */
let gradeTick = null;
route('/teacher/verified/:id', 'teacher', ({ id }) => {
  const v = TS().verify.find((x) => x.id === id); if (!v) return go('/teacher/dashboard');
  const T = TS();
  const gradedL = T.review.filter((r) => r.status === 'review').map((r) => ({ sid: r.sid, st: 'graded', href: '/teacher/review/' + r.id }));
  const gradingL = T.grading.map((g) => ({ sid: g.sid, st: 'grading' }));
  const waitL = T.verify.filter((x) => x.status === 'verify').map((x) => ({ sid: x.sid, st: 'wait', id: x.id }));
  const total = gradedL.length + gradingL.length + waitL.length, doneN = gradedL.length;
  const next = waitL[0];
  clearInterval(gradeTick);
  return {
    title: 'AI grading', nav: 'verify',
    html: `${backBar('/teacher/verify', [['/teacher/dashboard', t('Dashboard')], ['/teacher/verify', t('To verify')], [null, stu(v.sid).short]])}<div class="banner ok">${icon('check', 20)}<strong>${esc(t('{n}’s text is verified and sent to AI grading', { n: stu(v.sid).short.split(' ')[0] }))}</strong></div>
      <section class="card"><h2>${esc(t('AI grading'))} · ${esc(itemLabel(v))}</h2>${bar(pct(doneN, total || 1), 'lg')}
        <p class="muted small">${esc(t('{a} of {b} graded', { a: doneN, b: total }))}${gradingL.length ? ' · ' + esc(t('about {n} min left', { n: Math.max(1, gradingL.length) })) : ''}</p>
        <div class="grade-list">${[...gradedL.map((r) => `<div class="row between center line"><span>${icon('check', 16)} ${esc(stu(r.sid).short)} · ${esc(t('graded'))}</span><a class="btn sm" href="#${r.href}">${esc(t('Review'))}</a></div>`),
          ...gradingL.map((r) => `<div class="row center gap line"><span class="spinner" aria-hidden="true"></span> ${esc(stu(r.sid).short)} · ${esc(t('grading…'))}</div>`),
          ...waitL.map((r) => `<div class="row center gap line muted">○ ${esc(stu(r.sid).short)} · ${esc(t('waiting for you to verify'))}</div>`)].join('')}</div></section>
      <p class="muted">${esc(t('You’ll get a notification when grading is finished. You can leave this page.'))}</p>
      <div class="row gap"><a class="btn lg" href="#/teacher/dashboard">${esc(t('Dashboard'))}</a>${next ? `<a class="btn primary lg" href="#/teacher/verify/${next.id}">${esc(t('Verify next: {n}', { n: stu(next.sid).short }))} ${icon('arrowR', 18)}</a>` : ''}</div>`,
  };
});

/* ---------- To review (list + bulk publish) ---------- */
let RVL = { sort: 'attention', sel: null };
const reviewTotal = (r) => r.qs.reduce((a, q) => a + (q.score ?? q.ai), 0);
const toCheck = (r) => r.qs.filter((q) => q.conf !== 'high' && q.score == null).length;
const confOf = (r) => (r.qs.some((q) => q.conf === 'low') ? 'Low' : r.qs.some((q) => q.conf === 'medium') ? 'Medium' : 'High');
const eligible = (r) => toCheck(r) === 0 && confOf(r) === 'High' && !r.flag;
route('/teacher/review', 'teacher', () => {
  let list = TS().review.filter((r) => r.status === 'review');
  if (!RVL.sel) RVL.sel = list.filter(eligible).map((r) => r.id);
  RVL.sel = RVL.sel.filter((id) => list.some((r) => r.id === id));
  const sorters = { attention: (a, b) => (toCheck(b) + (b.flag ? 5 : 0)) - (toCheck(a) + (a.flag ? 5 : 0)), score: (a, b) => reviewTotal(a) - reviewTotal(b), name: (a, b) => stu(a.sid).short.localeCompare(stu(b.sid).short) };
  list = list.slice().sort(sorters[RVL.sort]);
  return {
    title: 'To review', nav: 'review',
    html: `<div class="row between wrap head-row"><h1 class="page inline">${esc(t('To review'))}</h1><div class="row gap"><select class="select dark" data-sort aria-label="${esc(t('Sort'))}">${[['attention', 'Needs attention first'], ['score', 'Lowest score first'], ['name', 'By name']].map(([k, l]) => `<option value="${k}" ${RVL.sort === k ? 'selected' : ''}>${esc(t(l))}</option>`).join('')}</select></div></div>
      ${list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th class="cb"></th><th>${esc(t('Student'))}</th><th>${esc(t('AI total'))}</th><th>${esc(t('Questions to check'))}</th><th>${esc(t('AI confidence'))}</th><th>${esc(t('Red flag'))}</th><th></th></tr></thead><tbody>
        ${list.map((r) => { const ok = eligible(r), c = confOf(r); return `<tr class="${RVL.sel.includes(r.id) ? 'selrow' : ''}"><td class="cb"><input type="checkbox" data-sel="${r.id}" ${RVL.sel.includes(r.id) ? 'checked' : ''} ${ok ? '' : 'disabled'} aria-label="${esc(t('Select {n}', { n: stu(r.sid).short }))}" title="${ok ? '' : esc(t('Open this one to review it'))}"></td><td>${esc(stu(r.sid).short)}</td><td>${pct(reviewTotal(r), QMAX)}%</td><td>${toCheck(r)}</td><td><span class="chip ${c === 'High' ? '' : 'dashed'}">${esc(t(c))}</span></td><td>${r.flag ? `${icon('flag', 15)} ${esc(r.flag)}` : '–'}</td><td class="right"><a class="btn ${ok ? '' : 'primary'} sm" href="#/teacher/review/${r.id}">${esc(t('Review'))}</a></td></tr>`; }).join('')}
      </tbody></table></div>
      ${RVL.sel.length ? `<div class="bulk">${icon('check', 18)}<b>${esc(t('{n} selected', { n: RVL.sel.length }))}</b><span class="muted">· ${esc(t('high confidence, nothing to check, no red flags'))}</span><span class="grow"></span><button type="button" class="btn ghost sm" data-clear>${esc(t('Clear'))}</button><button type="button" class="btn primary sm" data-bulk>${esc(t('Accept & publish…'))}</button></div>` : ''}
      <p class="muted small">${esc(t('Exams with questions to check or red flags can’t be bulk-published. Open them one by one.'))}</p>` : `<section class="card"><p>${esc(t('Nothing to review right now.'))}</p><a class="btn" href="#/teacher/dashboard">${esc(t('Dashboard'))}</a></section>`}`,
    mount(el) {
      const s = $('[data-sort]', el); s && s.addEventListener('change', () => { RVL.sort = s.value; refresh(); });
      $$('[data-sel]', el).forEach((c) => c.addEventListener('change', () => { RVL.sel = c.checked ? [...RVL.sel, c.dataset.sel] : RVL.sel.filter((x) => x !== c.dataset.sel); refresh(); }));
      const cl = $('[data-clear]', el); cl && cl.addEventListener('click', () => { RVL.sel = []; refresh(); });
      const bk = $('[data-bulk]', el);
      bk && bk.addEventListener('click', () => modal({
        title: esc(t('Publish {n} results?', { n: RVL.sel.length })),
        body: `<ul class="plain-list">${RVL.sel.map((id) => { const r = TS().review.find((x) => x.id === id); return `<li>${icon('check', 14)} ${esc(stu(r.sid).short)} · ${pct(reviewTotal(r), QMAX)}%</li>`; }).join('')}</ul><p class="muted">${esc(t('AI grades are accepted as they are. Students and parents will be notified.'))}</p>`,
        actions: [{ label: esc(t('Go back')) }, { label: esc(t('Yes, publish')), primary: true, onClick: () => { RVL.sel.forEach((id) => { const r = TS().review.find((x) => x.id === id); r.qs.forEach((q) => { if (q.score == null) q.score = q.ai; }); publish(r); }); toast(esc(t('{n} results published.', { n: RVL.sel.length }))); RVL.sel = []; save(); refresh(); } }],
      }));
    },
  };
});

function publish(r) {
  const T = TS();
  if (r.status === 'published') return;
  r.status = 'published';
  const total = reviewTotal(r), p = pct(total, QMAX);
  T.published.unshift({ sid: r.sid, sent: r.sent, score: p });
  T.publishedWeek++;
  if (r.flagDecision === 'confirm') { const f = T.flags.find((x) => x.sid === r.sid && x.status === 'pending'); if (f) confirmFlag(f); }
  if (r.flagDecision === 'dismiss') { const f = T.flags.find((x) => x.sid === r.sid && x.status === 'pending'); if (f) { f.status = 'dismissed'; f.date = '10 Oct'; f.note = 'Dismissed while reviewing'; } }
  if (r.sid === 's1') publishToYounis(r, total, p);
  save();
}
function publishToYounis(r, total, p) {
  const T = TS(), id = r.examId || 'math-fractions';
  const e = S.exams.find((x) => x.id === id); if (!e) return;
  const sid = e.subject;
  // result details (one set of questions per exam; the Fractions Test has its own texts)
  const d = S.details[id] || (S.details[id] = { auto: true, total: QMAX, got: 0, next: { text: 'Play Fraction Pizza (5 min)', game: 'fraction-pizza' }, questions: FRACTIONS_QS.map((q) => ({ q: q.n, text: q.text, got: 0, max: q.max, your: '', right: q.ans[q.max] })) });
  r.qs.forEach((q, i) => { const dq = d.questions[i]; if (dq) { dq.got = q.score ?? q.ai; if (d.auto && FRACTIONS_QS[i]) dq.your = dq.got === dq.max ? FRACTIONS_QS[i].ans[dq.max].replace(/^\[drawing\] /, '') : dq.your || FRACTIONS_QS[i].ans[dq.got]; } });
  d.got = total; d.total = QMAX;
  d.headline = p >= 90 ? 'Great job!' : p >= 70 ? 'Good effort!' : 'Keep going!';
  if (r.feedback) { d.teacherSays = r.feedback; d.improveParent = d.improveParent || 'Comparing fractions with different denominators'; }
  // exam + one new history point
  const hist = S.history[sid] || (S.history[sid] = []);
  const prev = hist.filter((h) => h.id !== id).slice(-1)[0];
  const pt = { id, label: e.title.replace(/ (Test|Quiz)$/, ''), date: 'Oct 10', v: p };
  const at = hist.findIndex((h) => h.id === id);
  if (at > -1) hist[at] = pt; else hist.push(pt);
  Object.assign(e, { status: 'graded', score: p, checked: DEMO_TODAY, isNew: true, change: prev ? p - prev.v : 0 });
  delete e.note; delete e.rescanPage;
  // the repeated mistake is counted once
  const q3 = d.questions.find((q) => q.q === 3), m1 = S.mistakes.find((m) => m.id === 'm1');
  if (id === 'math-fractions' && q3 && q3.got < q3.max && m1 && !d.counted) { m1.times++; m1.where = 'Fractions Test · ' + m1.where; d.counted = true; }
  // one message for the student, one in the teacher's thread with Younis, one for the parent (replaced, never duplicated)
  S.inbox = S.inbox.filter((n) => n.id !== 'pub-' + id && n.id !== 'rescan-' + id);
  S.inbox.unshift({ id: 'pub-' + id, kind: 'teacher', icon: 'avatar', html: '<b>Ms. Mona</b> checked your <b>{s} {x}</b>.', short: 'Ms. Mona checked your {s} test.', vars: { s: subj(sid).name, x: e.title }, time: 'now', day: 'today', when: 'Today', unread: true, action: { label: 'See my result', href: '/student/result/' + id, primary: true } });
  const conv = T.conversations.find((c) => c.kind === 'student' && c.to.length === 1 && c.to[0] === 's1');
  if (conv && !conv.thread.some((m) => m.pub === id)) { conv.thread.push({ me: true, pub: id, type: 'Result', text: 'Your {x} is checked: {p}%. Open GradeBuddy to see what to practise next.', vars: { x: e.title, p }, time: 'Today' }); conv.preview = t('Result sent'); }
  S.parent.notifs = S.parent.notifs.filter((n) => n.id !== 'pub-' + id);
  S.parent.notifs.unshift({ id: 'pub-' + id, text: 'Ms. Mona published Younis’s {s} {x} result ({p}%)', vars: { s: subj(sid).name, x: e.title, p }, unread: true, href: '/parent/exams/' + id });
  S.parent.notes = S.parent.notes.filter((n) => n.id !== 'pub-' + id);
  S.parent.notes.unshift({ id: 'pub-' + id, child: 's1', teacher: T.name, subject: sid, date: DEMO_TODAY, exam: e.title, type: 'Feedback', text: d.teacherSays || r.feedback, improve: 'comparing fractions', replies: [] });
}
function confirmFlag(f) {
  f.status = 'confirmed'; f.date = '10 Oct'; f.isNew = false;
  const done = [];
  if (f.also.practice) { done.push('practice sent'); if (f.sid === 's1' && !S.inbox.some((n) => n.id === 'flag-' + f.id)) S.inbox.unshift({ id: 'flag-' + f.id, kind: 'teacher', icon: 'target', html: '<b>Ms. Mona</b> sent you practice: <b>Comparing fractions</b>', short: 'New practice: Comparing fractions', time: 'now', day: 'today', when: 'Today', unread: true, action: { label: 'Practise', href: '/student/play/fraction-pizza' } }); }
  if (f.also.parent) { done.push('parent notified'); if (f.sid === 's1') {
    S.parent.notifs = S.parent.notifs.filter((n) => n.id !== 'flag-' + f.id);
    S.parent.notifs.unshift({ id: 'flag-' + f.id, text: 'Ms. Mona suggests extra practice in fractions for Younis', unread: true, href: '/parent/overview' });
    S.parent.alerts = S.parent.alerts.filter((a) => a.id !== f.id);
    S.parent.alerts.unshift({ id: f.id, child: 's1', title: 'Ms. Mona suggests extra practice in fractions.', text: 'Younis made the same mistake in 3 of 4 tests. Practice has been added to his app.' });
  } }
  if (f.also.support) done.push('added to after-school support');
  f.note = done.join(' · ') || 'confirmed';
  save();
}

/* ---------- Review one paper ---------- */
let RV = null;
route('/teacher/review/:id', 'teacher', ({ id }) => {
  const r = TS().review.find((x) => x.id === id);
  if (!r || r.status !== 'review') return go('/teacher/review');
  const s = stu(r.sid), first = s.short.split(' ')[0];
  if (!r.feedbackDraft) {
    const weak = r.qs.filter((q) => q.ai < FRACTIONS_QS[q.n - 1].max).map((q) => FRACTIONS_QS[q.n - 1].topic.toLowerCase());
    r.feedbackDraft = weak.length ? `Great work on multiplication! Next, practise ${weak[0].includes('compare') ? 'comparing fractions with different denominators' : weak[0]}.` : 'Excellent work, every answer was correct!';
    r.feedback = r.feedbackDraft;
  }
  if (!RV || RV.id !== id) RV = { id, q: (r.qs.find((q) => q.conf !== 'high' && q.score == null) || r.qs[0]).n, needs: false, step: null };
  const q = r.qs.find((x) => x.n === RV.q), Q = FRACTIONS_QS[q.n - 1];
  if (RV.step == null || RV.stepFor !== q.n) { RV.step = q.score ?? q.ai; RV.stepFor = q.n; }
  const reviewed = r.qs.filter((x) => x.score != null).length;
  const changed = r.qs.filter((x) => x.score != null && x.score !== x.ai).length;
  const total = reviewTotal(r);
  const sure = r.qs.filter((x) => x.conf === 'high' && x.score == null);
  const list = r.qs.filter((x) => !RV.needs || x.conf !== 'high');
  const pend = TS().flags.find((f) => f.sid === r.sid && f.status === 'pending');
  const lowTopic = (r.qs.filter((x) => x.ai < FRACTIONS_QS[x.n - 1].max).map((x) => FRACTIONS_QS[x.n - 1].topic)[0]) || null;
  return {
    title: 'Review AI grade', layout: 'focus',
    html: `${backBar('/teacher/review', [['/teacher/dashboard', t('Dashboard')], ['/teacher/review', t('To review')], [null, s.short]])}<div class="focus-head"><h1>${esc(s.short)} · ${esc(itemLabel(r))}</h1><span class="chip">${icon('chip', 15)} ${esc(t('AI graded · waiting for you'))}</span><span class="grow"></span><button type="button" class="btn ghost sm" data-scheme>${icon('doc', 16)} ${esc(t('Mark scheme'))}</button></div>
      <div class="review">
        <aside class="card qlist"><h2>${esc(t('Questions'))}</h2><button type="button" class="pill ${RV.needs ? '' : ''}" aria-pressed="${RV.needs}" data-needs>${icon('filter', 14)} ${esc(t('Needs me'))} (${r.qs.filter((x) => x.conf !== 'high').length})</button>
          <ul>${list.map((x) => { const st = x.score != null ? 'ok' : x.conf !== 'high' ? 'need' : ''; return `<li><button type="button" class="${x.n === RV.q ? 'cur' : ''} ${st}" data-q="${x.n}"><span>${st === 'ok' ? icon('check', 15) : st === 'need' ? icon('warn', 15) : '<span class="ring"></span>'}</span>Q${x.n}<b>${x.score ?? x.ai}/${FRACTIONS_QS[x.n - 1].max}</b></button></li>`; }).join('')}</ul>
          <button type="button" class="btn sm block" data-sure ${sure.length ? '' : 'disabled'}>${esc(t('Accept all sure ones ({n})', { n: sure.length }))}</button></aside>
        <section class="card qpanel"><div class="row between center wrap"><h2>Q${q.n} · ${esc(Q.text)} (${Q.max} ${esc(t('marks'))})</h2><span class="chip ${q.conf === 'high' ? '' : 'dashed'}">${esc(t('AI confidence: {c}', { c: t(q.conf) }))}</span></div>
          <div class="cols-1-1 tight"><div class="card sub"><h3>${esc(t('Student answer'))} <span class="muted">(${esc(t('verified'))})</span></h3><div class="mini-scan">${scanSVG([{ q: 'Q' + q.n, a: q.answer, drawing: Q.n === 4 }], { mini: true })}</div><p>“${esc(q.answer)}”</p></div>
            <div class="card sub"><h3>${esc(t('Mark scheme'))}</h3>${Q.scheme.map((l) => `<p>${esc(l)}</p>`).join('')}</div></div>
          <div class="ai-box"><h3>${icon('chip', 16)} ${esc(t('AI suggests {a} / {b}', { a: q.ai, b: Q.max }))}</h3><p><b>${esc(t('Why:'))}</b> ${esc(q.why)}</p></div>
          <div class="row gap wrap center">
            <button type="button" class="btn primary" data-accept>${icon('check', 16)} ${esc(t('Accept {a}/{b}', { a: q.ai, b: Q.max }))}</button>
            <span class="stepper"><button type="button" data-step="-1" aria-label="${esc(t('Less'))}">${icon('minus', 16)}</button><b>${RV.step}/${Q.max}</b><button type="button" data-step="1" aria-label="${esc(t('More'))}">${icon('plus', 16)}</button></span>
            <button type="button" class="btn" data-change ${RV.step === (q.score ?? q.ai) && q.score != null ? 'disabled' : ''}>${esc(t('Change score'))}</button>
            <span class="grow"></span><button type="button" class="btn ghost sm" data-back ${q.score == null ? 'disabled' : ''}>${icon('undo', 16)} ${esc(t('Back to AI score'))}</button></div>
          ${q.score != null ? `<p class="small ${q.score === q.ai ? 'muted' : 'warn-text'}">${q.score === q.ai ? esc(t('You accepted the AI score.')) : esc(t('You changed the score from {a} to {b}.', { a: q.ai, b: q.score }))}</p>` : ''}
        </section>
        <aside class="stack">
          <section class="card"><div class="row between center"><h2>${esc(t('Total'))}</h2><b class="big-num">${pct(total, QMAX)}%</b></div><div class="row between center small"><span class="muted">${total}/${QMAX} · ${esc(t(changed === 1 ? '1 question changed by you' : '{n} questions changed by you', { n: changed }))}</span>${changed || r.feedback !== r.feedbackDraft ? `<span class="chip tiny">${esc(t('edited'))}</span>` : ''}</div></section>
          <section class="card"><h3>${esc(t('Feedback to student'))} ${icon('pen', 15)}</h3><textarea rows="4" data-fb aria-label="${esc(t('Feedback to student'))}">${esc(r.feedback)}</textarea><p class="muted small">${esc(t('AI draft · edit freely'))}</p></section>
          ${lowTopic ? `<section class="card"><h3>${esc(t('Weakness found'))}</h3><p><span class="chip">${esc(lowTopic)}</span></p>${r.sid === 's1' ? `<h3>${esc(t('Recurring error'))}</h3><p>${esc(t('Compares numerators only (3rd time)'))}</p>` : ''}</section>` : ''}
          ${pend ? `<section class="card dashed"><h3>${icon('flag', 16)} ${esc(t('Red flag'))}</h3><p>${esc(t('Needs extra support in {t}. Seen in {r}.', { t: pend.topic.split(':')[0].toLowerCase(), r: pend.reason.replace('same mistake in ', '') }))}</p>
            ${r.flagDecision ? `<p class="small"><b>${esc(t(r.flagDecision === 'confirm' ? 'Will be confirmed when you publish.' : 'Will be dismissed when you publish.'))}</b> <button type="button" class="link" data-flag="">${esc(t('Undo'))}</button></p>` : `<div class="row gap"><button type="button" class="btn primary sm" data-flag="confirm">${esc(t('Confirm'))}</button><button type="button" class="btn sm" data-flag="dismiss">${esc(t('Dismiss'))}</button></div>`}</section>` : ''}
        </aside>
      </div>
      <div class="flow-foot sticky"><span class="row gap center small">${esc(t('Reviewed {a} of {b} questions', { a: reviewed, b: r.qs.length }))} ${bar(pct(reviewed, r.qs.length), 'sm')}</span>
        <div class="row gap center"><button type="button" class="btn" data-draft>${esc(t('Save draft'))}</button><button type="button" class="btn primary lg" data-publish ${reviewed === r.qs.length ? '' : 'disabled'} title="${reviewed === r.qs.length ? '' : esc(t('Review every question first'))}">${icon('send', 18)} ${esc(t('Publish to student'))}</button></div></div>`,
    mount(el) {
      const on = (sel, fn) => $$(sel, el).forEach((b) => b.addEventListener('click', fn));
      on('[data-q]', (e) => { RV.q = +e.currentTarget.dataset.q; refresh(); });
      on('[data-needs]', () => { RV.needs = !RV.needs; refresh(); });
      on('[data-sure]', () => { sure.forEach((x) => { x.score = x.ai; }); save(); refresh(); });
      const nextOpen = () => { const n = r.qs.find((x) => x.score == null); if (n) RV.q = n.n; };
      on('[data-accept]', () => { q.score = q.ai; save(); nextOpen(); refresh(); });
      on('[data-step]', (e) => { RV.step = Math.max(0, Math.min(Q.max, RV.step + +e.currentTarget.dataset.step)); refresh(); });
      on('[data-change]', () => { q.score = RV.step; r.edited = true; save(); refresh(); });
      on('[data-back]', () => { q.score = null; RV.step = q.ai; save(); refresh(); });
      const fb = $('[data-fb]', el); fb.addEventListener('input', () => { r.feedback = fb.value; save(); });
      fb.addEventListener('change', refresh);
      on('[data-flag]', (e) => { r.flagDecision = e.currentTarget.dataset.flag || null; save(); refresh(); });
      on('[data-draft]', () => { save(); toast(esc(t('Draft saved.'))); });
      on('[data-scheme]', () => modal({ title: esc(t('Mark scheme')) + ' · ' + esc(t(r.exam || 'Fractions Test')), wide: true,
        body: `<div class="table-wrap"><table class="table"><thead><tr><th>Q</th><th>${esc(t('Marks'))}</th><th>${esc(t('Criteria (what earns a mark)'))}</th><th>${esc(t('Topic'))}</th></tr></thead><tbody>${FRACTIONS_QS.map((x) => `<tr><td>${x.n}</td><td>${x.max}</td><td>${esc(x.scheme.join(' · '))}</td><td><span class="chip">${esc(x.topic)}</span></td></tr>`).join('')}</tbody></table></div>` }));
      on('[data-publish]', () => modal({
        title: esc(t('Publish {n}’s result?', { n: first })),
        body: `<ul class="plain-list"><li>${icon('check', 14)} ${esc(t('Grade'))} ${pct(total, QMAX)}% · ${esc(t(changed === 1 ? '1 question changed' : '{n} questions changed', { n: changed }))}</li><li>${icon('check', 14)} ${esc(t(r.feedback !== r.feedbackDraft ? 'Feedback edited' : 'Feedback (AI draft)'))}</li>${pend && r.flagDecision ? `<li>${icon('flag', 14)} ${esc(t(r.flagDecision === 'confirm' ? '1 red flag confirmed' : '1 red flag dismissed'))}</li>` : ''}<li class="muted">${esc(t('{n} and the parent will be notified', { n: first }))}</li></ul>`,
        actions: [{ label: esc(t('Go back')) }, { label: esc(t('Yes, publish')), primary: true, onClick: () => { publish(r); RV = null; beep('win'); toast(esc(t('{n}’s result is published.', { n: first }))); go('/teacher/review'); } }],
      }));
    },
  };
});
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/teacher/review/')) RV = null; });

/* ---------- Students & gaps (class view) ---------- */
let CV = { mode: 'topics', term: 'This term', group: 0, type: 'Practice', text: null, parents: false };
function classGroups() {
  const R = TS().roster;
  return [
    { n: 'Compare numerators only', sub: 'Fractions', ids: R.filter((s) => s.m[1] <= 60).map((s) => s.id), text: 'Practice: Fraction Pizza + worksheet 3' },
    { n: 'Skip units in word problems', sub: 'Word problems', ids: R.filter((s) => s.m[2] <= 70).map((s) => s.id), text: 'Practice: word problems with units, worksheet 5' },
  ];
}
route('/teacher/students', 'teacher', () => {
  const T = TS(), R = T.roster;
  const avg = (k) => Math.round(R.reduce((a, s) => a + s.m[k], 0) / R.length);
  const shade = (v) => (v < 50 ? 'h4' : v < 62 ? 'h3' : v < 80 ? 'h2' : v < 90 ? 'h1' : 'h0');
  const groups = classGroups(), g = groups[CV.group];
  const defaults = { Practice: g.text, Comment: `Let’s keep working on ${g.sub.toLowerCase()} together!`, Reminder: 'Don’t forget to finish your practice by Friday.' };
  const text = CV.text ?? defaults[CV.type];
  const flagged = (sid) => T.flags.some((f) => f.sid === sid && f.status !== 'dismissed');
  const confirmed = T.flags.filter((f) => f.status === 'confirmed').slice(0, 2);
  const studentsMode = `<div class="grid-3">${R.map((s) => { const a = Math.round(s.m.reduce((x, y) => x + y, 0) / 4); const low = T.topics.filter((_, k) => s.m[k] < 62); return `<a class="card stu-card" href="#/teacher/student/${s.id}"><div class="row gap center">${initials(s.short.split(' ').map((w) => w[0]).join(''))}<b>${esc(s.short)}</b>${flagged(s.id) ? icon('flag', 16) : ''}</div><div class="row gap center">${bar(a)}<b>${a}%</b></div><span class="small muted">${low.length ? esc(t('Gaps:')) + ' ' + low.map(esc).join(', ') : esc(t('No gaps found'))}</span></a>`; }).join('')}</div>`;
  return {
    title: 'Students & gaps', nav: 'students',
    html: `<div class="row between wrap head-row"><h1 class="page inline">${esc(t('Class'))} 4B · Math</h1><div class="row gap"><div class="pills">${[['topics', 'Topics'], ['students', 'Students']].map(([k, l]) => `<button type="button" class="pill" data-mode="${k}" aria-pressed="${CV.mode === k}">${esc(t(l))}</button>`).join('')}</div><select class="select" data-term aria-label="${esc(t('Time'))}">${['This term', 'Last 4 weeks', 'This year'].map((x) => `<option ${CV.term === x ? 'selected' : ''}>${esc(t(x))}</option>`).join('')}</select></div></div>
      ${CV.mode === 'students' ? studentsMode : `<div class="cols-3-2">
        <section class="card"><h2>${icon('chart', 20)} ${esc(t('Topic mastery (% correct)'))}</h2><div class="table-wrap"><table class="table heat"><thead><tr><th>${esc(t('Student'))}</th>${T.topics.map((x) => `<th>${esc(t(x))}</th>`).join('')}</tr></thead><tbody>
          ${R.map((s) => `<tr><td><a class="plain" href="#/teacher/student/${s.id}">${esc(s.short)}</a> ${flagged(s.id) ? icon('flag', 14) : ''}</td>${s.m.map((v) => `<td class="${shade(v)}">${v}</td>`).join('')}</tr>`).join('')}
          <tr class="total"><td>${esc(t('Class'))}</td>${T.topics.map((_, k) => `<td class="${shade(avg(k))}">${avg(k)}</td>`).join('')}</tr></tbody></table></div><p class="muted small">${esc(t('Darker = lower score. The number is always shown.'))}</p></section>
        <div class="stack">
          <section class="card"><h2>${icon('refresh', 18)} ${esc(t('Common recurring mistakes'))}</h2>${groups.map((x, i) => `<div class="row between center line"><span><b>${x.ids.length}</b> ${esc(t(x.n))}<span class="block small muted">${esc(t(x.sub))} · ${esc(t('{n} students', { n: x.ids.length }))}</span></span><button type="button" class="btn sm" data-group="${i}" aria-pressed="${CV.group === i}">${esc(t('Group'))}</button></div>`).join('')}</section>
          <section class="card"><h2>${icon('send', 18)} ${esc(t('Send to {n} students', { n: g.ids.length }))}</h2><p class="small muted">${g.ids.map((id) => esc(stu(id).short)).join(', ')}</p>
            <div class="pills">${['Practice', 'Comment', 'Reminder'].map((k) => `<button type="button" class="pill" data-type="${k}" aria-pressed="${CV.type === k}">${esc(t(k))}</button>`).join('')}</div>
            <input class="input" data-text value="${esc(text)}" aria-label="${esc(t('Message'))}">
            <div class="row between center"><label class="check"><input type="checkbox" data-par ${CV.parents ? 'checked' : ''}> ${esc(t('Also notify parents'))}</label><button type="button" class="btn primary sm" data-send>${esc(t('Send'))}</button></div></section>
        </div></div>
        ${confirmed.map((f) => `<section class="card soft row gap center wrap">${initials(stu(f.sid).short.split(' ').map((w) => w[0]).join(''))}<span class="grow"><b>${esc(stu(f.sid).short)}</b> · ${esc(f.topic)} ${esc(t('red flag'))} <b>${esc(t('confirmed'))}</b> ${esc(f.date)} · ${esc(f.note)}</span><a class="btn sm" href="#/teacher/student/${f.sid}">${esc(t('Open profile'))}</a><button type="button" class="btn ghost sm" data-unflag="${f.id}">${esc(t('Remove flag'))}</button></section>`).join('')}`}`,
    mount(el) {
      $$('[data-mode]', el).forEach((b) => b.addEventListener('click', () => { CV.mode = b.dataset.mode; refresh(); }));
      $('[data-term]', el).addEventListener('change', (e) => { CV.term = e.target.value; toast(esc(t('Showing: {x}', { x: t(CV.term) }))); });
      $$('[data-group]', el).forEach((b) => b.addEventListener('click', () => { CV.group = +b.dataset.group; CV.text = null; refresh(); }));
      $$('[data-type]', el).forEach((b) => b.addEventListener('click', () => { CV.type = b.dataset.type; CV.text = null; refresh(); }));
      const ti = $('[data-text]', el); ti && ti.addEventListener('input', () => { CV.text = ti.value; });
      const pa = $('[data-par]', el); pa && pa.addEventListener('change', () => { CV.parents = pa.checked; });
      const sd = $('[data-send]', el);
      sd && sd.addEventListener('click', () => {
        const msg = (CV.text ?? defaults[CV.type]).trim(); if (!msg) return toast(esc(t('Write a message first.')));
        T.conversations.unshift({ id: 'c' + Date.now(), title: g.n.split(' ').slice(0, 2).join(' ') + ' group', kind: 'group', count: g.ids.length, to: g.ids, preview: CV.type + ' sent', unread: 0, thread: [{ me: true, type: CV.type, text: msg, time: 'now', parents: CV.parents }] });
        if (g.ids.includes('s1')) S.inbox.unshift({ id: 'n' + Date.now(), kind: 'teacher', icon: CV.type === 'Practice' ? 'target' : 'chat', html: `<b>Ms. Mona</b>: ${esc(msg)}`, short: msg, time: 'now', day: 'today', when: 'Today', unread: true, action: CV.type === 'Practice' ? { label: 'Practise', href: '/student/play/fraction-pizza' } : null });
        save(); CV.text = null; toast(esc(t('Sent to {n} students', { n: g.ids.length })) + (CV.parents ? ' ' + esc(t('and their parents')) : '') + '.'); refresh();
      });
      $$('[data-unflag]', el).forEach((b) => b.addEventListener('click', () => { const f = T.flags.find((x) => x.id === b.dataset.unflag); f.status = 'dismissed'; f.note = 'Removed by you'; save(); toast(esc(t('Flag removed.'))); refresh(); }));
    },
  };
});

/* ---------- One student profile ---------- */
let SP = { tab: 'overview', series: 'math' };
function studentHistory(sid, series) {
  if (sid === 's1' && series === 'math') return S.history.math;
  const s = stu(sid), base = Math.round(s.m.reduce((a, b) => a + b, 0) / 4);
  const labels = TS().termAvg.map((x) => x.label);
  if (series === 'math') return labels.map((l, i) => ({ label: l, v: i === 4 ? s.m[1] : Math.max(30, Math.min(100, base + [-8, -3, 6, -2, 0][i])) }));
  return [{ label: 'Math', v: sid === 's1' ? 72 : base }, { label: 'English', v: sid === 's1' ? 88 : Math.min(100, base + 5) }, { label: 'Deutsch', v: sid === 's1' ? 64 : Math.max(30, base - 6) }, { label: 'Science', v: sid === 's1' ? 80 : base }];
}
route('/teacher/student/:sid', 'teacher', ({ sid }) => {
  const T = TS(), s = T.roster.find((x) => x.id === sid); if (!s) return go('/teacher/students');
  const strengths = sid === 's1' ? ['Multiplication', 'Word problems'] : T.topics.filter((_, k) => s.m[k] >= 85).map((x) => x.replace('prob.', 'problems'));
  if (!T.gaps[sid]) T.gaps[sid] = T.topics.filter((_, k) => s.m[k] < 62).map((x) => ({ topic: x === 'Fractions' ? 'Fractions: compare' : x, status: 'suggested' }));
  const gaps = T.gaps[sid];
  const hist = T.flags.filter((f) => f.sid === sid && f.status !== 'pending');
  const convs = T.conversations.filter((c) => c.to.includes(sid));
  const classAvg = Math.round(T.termAvg.reduce((a, b) => a + b.v, 0) / T.termAvg.length);
  const exams = sid === 's1' ? S.exams.filter((e) => e.status === 'graded').map((e) => ({ name: examName(e), date: e.checked, score: e.score })) : studentHistory(sid, 'math').map((h) => ({ name: 'Math · ' + h.label, date: '', score: h.v }));
  const ini = s.short.split(' ').map((w) => w[0]).join('');
  let body = '';
  if (SP.tab === 'overview') {
    body = `<div class="cols-3-2">
      <section class="card"><div class="row between center"><h2>${icon('trend', 20)} ${esc(t('Progress across exams'))}</h2><div class="pills">${[['math', 'Math'], ['all', 'All']].map(([k, l]) => `<button type="button" class="pill" data-series="${k}" aria-pressed="${SP.series === k}">${esc(t(l))}</button>`).join('')}</div></div>${lineChart(studentHistory(sid, SP.series), { avg: classAvg, label: t('Progress across exams') })}</section>
      <div class="stack">
        <section class="card"><h3>${esc(t('Strengths'))}</h3><div class="row gap wrap">${strengths.map((x) => `<span class="chip">${esc(x)}</span>`).join('') || `<span class="muted">–</span>`}</div></section>
        <section class="card"><h3>${esc(t('Learning gaps'))}</h3>${gaps.map((g, i) => `<div class="row between center line"><span class="chip ${g.status === 'suggested' ? 'dashed' : ''}">${esc(g.topic)}</span>${g.status === 'confirmed' ? `<span class="small">${icon('check', 14)} ${esc(t('You confirmed'))}</span>` : g.status === 'dismissed' ? `<span class="small muted">${esc(t('Dismissed'))}</span>` : `<span class="row gap center"><span class="muted small">${esc(t('AI suggested'))}</span><button type="button" class="btn sm" data-gap="${i}:confirmed">${esc(t('Confirm'))}</button><button type="button" class="btn ghost sm" data-gap="${i}:dismissed">${esc(t('Dismiss'))}</button></span>`}</div>`).join('') || `<p class="muted">${esc(t('No gaps found'))}</p>`}</section>
      </div></div>
      <div class="cols-3-2">
        <section class="card"><p><b>${esc(t('Recurring mistake'))}</b> · ${esc(sid === 's1' ? t('compares numerators only') : gaps[0] ? t('low scores in {x}', { x: gaps[0].topic }) : t('none found'))}</p><div class="row gap wrap">${(sid === 's1' ? ['Fractions Test Q3', 'Unit 1 Q4', 'Quiz 1 Q2'] : gaps[0] ? ['Fractions Test Q3'] : []).map((x) => `<button type="button" class="pill" data-evi="${esc(x)}">${esc(x)} ${icon('arrowR', 14)}</button>`).join('')}</div></section>
        <section class="card"><h3>${esc(t('Red flag history'))}</h3>${hist.length ? hist.map((f) => `<p>${icon('flag', 14)} ${esc(f.topic)} · ${esc(t(f.status))} ${esc(f.date)} · ${esc(f.note)}</p>`).join('') : `<p class="muted">${esc(t('No red flags yet.'))}</p>`}${T.flags.some((f) => f.sid === sid && f.status === 'pending') ? `<a class="btn sm" href="#/teacher/flags">${esc(t('1 flag to decide'))}</a>` : ''}</section>
      </div>`;
  } else if (SP.tab === 'exams') {
    body = `<div class="table-wrap card flush"><table class="table"><thead><tr><th>${esc(t('Exam'))}</th><th>${esc(t('Checked'))}</th><th>${esc(t('Score'))}</th></tr></thead><tbody>${exams.map((e) => `<tr><td>${esc(e.name)}</td><td>${esc(e.date || '–')}</td><td><b>${e.score}%</b></td></tr>`).join('')}</tbody></table></div>`;
  } else if (SP.tab === 'messages') {
    body = convs.length ? convs.map((c) => `<a class="card row between center" href="#/teacher/messages/${c.id}"><span><b>${esc(c.title)}</b> ${c.sub ? esc(t(c.sub)) : ''}<span class="block small muted">${esc(c.thread[c.thread.length - 1].text)}</span></span>${icon('right', 18)}</a>`).join('') : `<p class="muted">${esc(t('No messages yet.'))}</p>`;
  } else {
    body = `<section class="card"><label class="field"><span>${esc(t('Private notes'))} <span class="muted small">· ${esc(t('Only you can see these notes.'))}</span></span><textarea rows="8" data-notes>${esc(T.notes[sid] || '')}</textarea></label><p class="muted small" data-saved>&nbsp;</p></section>`;
  }
  return {
    title: s.short, nav: 'students',
    html: `${backBar('/teacher/students', [['/teacher/dashboard', t('Dashboard')], ['/teacher/students', t('Students & gaps')], [null, s.short]])}<div class="row between wrap head-row"><div class="row gap center"><span class="av-lg">${sid === 's1' ? avatarSVG(S.student.avatar, 72) : initials(ini)}</span><div><h1 class="page inline">${esc(s.short)}</h1><span class="block muted">${esc(t('Class'))} 4B · ${esc(t('{n} exams this term', { n: s.exams }))}</span></div></div>
      <div class="row gap"><button type="button" class="btn" data-msg="student">${icon('chat', 16)} ${esc(t('Message {n}', { n: s.short.split(' ')[0] }))}</button><button type="button" class="btn" data-msg="parent">${icon('users', 16)} ${esc(t('Message parent'))}</button></div></div>
      <div class="tabs" role="tablist">${[['overview', 'Overview'], ['exams', `${t('Exams')} (${exams.length})`], ['messages', 'Messages'], ['notes', 'Private notes']].map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${SP.tab === k}">${esc(t(l))}</button>`).join('')}</div>
      ${body}`,
    mount(el) {
      $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => { SP.tab = b.dataset.tab; refresh(); }));
      $$('[data-series]', el).forEach((b) => b.addEventListener('click', () => { SP.series = b.dataset.series; refresh(); }));
      $$('[data-gap]', el).forEach((b) => b.addEventListener('click', () => { const [i, st] = b.dataset.gap.split(':'); gaps[+i].status = st; save(); refresh(); }));
      $$('[data-evi]', el).forEach((b) => b.addEventListener('click', () => modal({ title: esc(b.dataset.evi), body: `<div class="mini-scan">${scanSVG([{ q: b.dataset.evi.split(' ').pop(), a: sid === 's1' ? 'The bigger one is 2/3 because 3 > 2' : 'answer unclear' }], { mini: true })}</div><p class="muted">${esc(t('Same mistake: compared the top numbers only.'))}</p>` })));
      $$('[data-msg]', el).forEach((b) => b.addEventListener('click', () => { COMPOSE = { to: [sid], parent: b.dataset.msg === 'parent', type: 'Comment', text: '', attach: null }; go('/teacher/messages/new'); }));
      const n = $('[data-notes]', el);
      if (n) { let h; n.addEventListener('input', () => { clearTimeout(h); h = setTimeout(() => { T.notes[sid] = n.value; save(); $('[data-saved]', el).textContent = t('Saved'); }, 400); }); }
    },
  };
});
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/teacher/student/')) SP = { tab: 'overview', series: 'math' }; });

/* ---------- Red flags ---------- */
let FL = { tab: 'pending', open: null };
route('/teacher/flags', 'teacher', () => flagsView());
route('/teacher/flags/:id', 'teacher', ({ id }) => { FL.open = id; FL.tab = 'pending'; return flagsView(); });
function flagsView() {
  const T = TS(), by = (st) => T.flags.filter((f) => f.status === st);
  const list = by(FL.tab);
  if (FL.tab === 'pending' && (!FL.open || !list.some((f) => f.id === FL.open))) FL.open = list[0] && list[0].id;
  const card = (f) => {
    const s = stu(f.sid);
    if (FL.tab !== 'pending') return `<section class="card row between center wrap"><span>${icon('flag', 16)} <b>${esc(s.short)}</b> · ${esc(f.topic)}<span class="block small muted">${esc(f.date)} · ${esc(f.note)}</span></span><span class="row gap"><a class="btn sm" href="#/teacher/student/${f.sid}">${esc(t('Open profile'))}</a>${FL.tab === 'dismissed' ? `<button type="button" class="btn ghost sm" data-restore="${f.id}">${esc(t('Restore'))}</button>` : `<button type="button" class="btn ghost sm" data-remove="${f.id}">${esc(t('Remove flag'))}</button>`}</span></section>`;
    if (FL.open !== f.id) return `<section class="card row between center">${icon('flag', 16)}<span class="grow"><b>${esc(s.short)}</b> · ${esc(f.topic)} · <span class="muted">${esc(f.reason)}</span></span><button type="button" class="btn sm" data-open="${f.id}">${esc(t('Open'))}</button></section>`;
    return `<section class="card flag-open"><div class="row between center"><h2>${icon('flag', 18)} <b>${esc(s.short)}</b> · ${esc(f.topic)}</h2>${f.isNew ? `<span class="chip dark tiny">${esc(t('New'))}</span>` : ''}</div>
      <p class="muted">${esc(t('AI:'))} ${esc(f.reason)}</p>
      <div class="row gap wrap center"><b>${esc(t('Evidence:'))}</b>${f.evidence.map((x) => `<button type="button" class="pill" data-evi="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <p><b>${esc(t('If you confirm, also:'))}</b></p>
      <div class="row gap wrap">${[['practice', f.sid === 's1' ? 'Send practice Fraction Pizza' : 'Send practice'], ['parent', 'Notify parent'], ['support', 'Add to after-school support']].map(([k, l]) => `<button type="button" class="pill toggle" data-also="${f.id}:${k}" aria-pressed="${!!f.also[k]}">${icon(f.also[k] ? 'check' : 'plus', 14)} ${esc(t(l))}</button>`).join('')}</div>
      <div class="row gap"><button type="button" class="btn primary" data-confirm="${f.id}">${esc(t('Confirm flag'))}</button><button type="button" class="btn ghost" data-dismiss="${f.id}">${esc(t('Dismiss…'))}</button><a class="btn ghost" href="#/teacher/student/${f.sid}">${esc(t('Open profile'))}</a></div></section>`;
  };
  return {
    title: 'Red flags', nav: 'flags',
    html: `<h1 class="page">${esc(t('Red flags'))}</h1>
      <div class="tabs" role="tablist">${[['pending', 'To decide'], ['confirmed', 'Confirmed'], ['dismissed', 'Dismissed']].map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${FL.tab === k}">${esc(t(l))} (${by(k).length})</button>`).join('')}</div>
      ${list.map(card).join('') || `<p class="muted">${esc(t('Nothing here.'))}</p>`}`,
    mount(el) {
      const on = (sel, fn) => $$(sel, el).forEach((b) => b.addEventListener('click', fn));
      on('[data-tab]', (e) => { FL.tab = e.currentTarget.dataset.tab; FL.open = null; if (location.hash !== '#/teacher/flags') go('/teacher/flags'); else refresh(); });
      on('[data-open]', (e) => { FL.open = e.currentTarget.dataset.open; refresh(); });
      on('[data-also]', (e) => { const [id, k] = e.currentTarget.dataset.also.split(':'); const f = T.flags.find((x) => x.id === id); f.also[k] = !f.also[k]; save(); refresh(); });
      on('[data-evi]', (e) => modal({ title: esc(e.currentTarget.dataset.evi), body: `<div class="mini-scan">${scanSVG([{ q: e.currentTarget.dataset.evi.split(' ').pop(), a: 'The bigger one is 2/3 because 3 > 2' }], { mini: true })}</div>` }));
      on('[data-confirm]', (e) => { const f = T.flags.find((x) => x.id === e.currentTarget.dataset.confirm); confirmFlag(f); FL.open = null; toast(esc(t('Flag confirmed: {x}', { x: f.note }))); refresh(); });
      on('[data-dismiss]', (e) => {
        const f = T.flags.find((x) => x.id === e.currentTarget.dataset.dismiss);
        let reason = null;
        modal({ title: esc(t('Why dismiss? (helps the AI learn)')),
          body: `<div class="row gap wrap">${['Careless mistake, not a gap', 'Already supporting', 'AI is wrong', 'Other…'].map((r) => `<button type="button" class="pill" data-r="${esc(r)}">${esc(t(r))}</button>`).join('')}</div><input class="input" data-other placeholder="${esc(t('Tell us why'))}" hidden>`,
          onMount(m) { $$('[data-r]', m).forEach((b) => b.addEventListener('click', () => { reason = b.dataset.r; $$('[data-r]', m).forEach((x) => x.setAttribute('aria-pressed', x === b)); const o = $('[data-other]', m); o.hidden = reason !== 'Other…'; if (!o.hidden) o.focus(); })); },
          actions: [{ label: esc(t('Cancel')) }, { label: esc(t('Dismiss flag')), primary: true, onClick: (m) => {
            if (!reason) { toast(esc(t('Pick a reason first.'))); return false; }
            f.status = 'dismissed'; f.date = '10 Oct'; f.isNew = false; f.note = reason === 'Other…' ? ($('[data-other]', m).value || 'Other') : reason; save(); FL.open = null; toast(esc(t('Flag dismissed.'))); refresh();
          } }] });
      });
      on('[data-remove]', (e) => { const f = T.flags.find((x) => x.id === e.currentTarget.dataset.remove); f.status = 'dismissed'; f.note = 'Removed by you'; save(); refresh(); });
      on('[data-restore]', (e) => { const f = T.flags.find((x) => x.id === e.currentTarget.dataset.restore); f.status = 'pending'; f.also = f.also || { practice: true, parent: false, support: false }; save(); refresh(); });
    },
  };
}

/* ---------- Messages ---------- */
let COMPOSE = null, MQ = '';
const TEMPLATES = { 'Great work on…': 'Great work on multiplication! Keep it up.', 'Let’s practise…': 'Let’s practise comparing fractions! Try Fraction Pizza before Friday.', 'Don’t forget…': 'Don’t forget to send your exam photos by Friday!' };
route('/teacher/messages', 'teacher', () => { const c = TS().conversations[0]; return go('/teacher/messages/' + (c ? c.id : 'new')); });
route('/teacher/messages/:id', 'teacher', ({ id }) => {
  const T = TS();
  const conv = T.conversations.find((c) => c.id === id);
  if (conv && conv.unread) { conv.unread = 0; T.notifs.forEach((n) => { if (n.href === '/teacher/messages/' + id) n.unread = false; }); save(); }
  if (!COMPOSE || COMPOSE.for !== id) COMPOSE = Object.assign({ to: conv ? conv.to.slice() : [], parent: conv ? conv.kind === 'parent' : false, type: 'Practice', text: '', attach: null }, COMPOSE && id === 'new' ? COMPOSE : {}, { for: id });
  const list = T.conversations.filter((c) => !MQ || c.title.toLowerCase().includes(MQ.toLowerCase()));
  const toChips = COMPOSE.to.map((sid) => `<span class="chip">${esc(stu(sid).short)}<button type="button" class="x-in" data-rmto="${sid}" aria-label="${esc(t('Remove'))}">${icon('x', 12)}</button></span>`).join('');
  return {
    title: 'Messages', nav: 'messages',
    html: `<div class="messages">
      <aside class="card conv-list"><div class="row between center"><h2>${esc(t('Conversations'))}</h2><a class="btn primary sm" href="#/teacher/messages/new" data-new>${icon('plus', 14)} ${esc(t('New'))}</a></div>
        <label class="search in"><span class="search-ic">${icon('search', 16)}</span><input type="search" data-mq value="${esc(MQ)}" placeholder="${esc(t('Search'))}" aria-label="${esc(t('Search'))}"></label>
        ${list.map((c) => `<a class="conv ${c.id === id ? 'cur' : ''}" href="#/teacher/messages/${c.id}">${c.kind === 'group' ? `<span class="sq-ic">${icon('users', 16)}</span>` : initials(c.title.split(' ').map((w) => w[0]).join('').slice(0, 2))}<span class="grow"><b>${esc(c.title)}</b> ${c.sub ? `<span class="muted">${esc(t(c.sub))}</span>` : ''}${c.count ? ` (${c.count})` : ''}${c.unread ? ` <span class="n">${c.unread}</span>` : ''}<span class="block small muted">${esc(c.preview)}</span></span></a>`).join('')}</aside>
      <section class="conv-main">
        ${conv ? `<div class="thread">${conv.thread.map((m) => `<div class="tmsg ${m.me ? 'me' : ''}">${m.type ? `<span class="chip tiny">${esc(t(m.type))}</span> ` : ''}${esc(t(m.text, m.vars && tvars(m.vars)))}${m.attach ? `<span class="chip tiny">${icon('clip', 12)} ${esc(m.attach)}</span>` : ''}<span class="small muted block">${esc(m.time)}</span></div>`).join('')}</div>` : `<h2>${esc(t('New message'))}</h2>`}
        <div class="compose">
          <div class="row between center wrap"><div class="row gap center wrap"><span class="muted">${esc(t('To:'))}</span>${toChips}<span class="pop-wrap"><button type="button" class="pill dashed" data-addto>${icon('plus', 14)} ${esc(t('Add'))}</button><div class="pop" id="to-pop" hidden>${T.roster.filter((s) => !COMPOSE.to.includes(s.id)).map((s) => `<button type="button" class="pop-item" data-addsid="${s.id}">${esc(s.short)}</button>`).join('')}</div></span></div>
            <label class="check"><input type="checkbox" data-parent ${COMPOSE.parent ? 'checked' : ''}> ${esc(t('Also send to parent'))}</label></div>
          <div class="row gap center wrap"><span class="muted">${esc(t('Type:'))}</span>${['Practice', 'Comment', 'Reminder', 'Praise'].map((k) => `<button type="button" class="pill" data-mtype="${k}" aria-pressed="${COMPOSE.type === k}">${k === 'Practice' ? icon('target', 14) + ' ' : ''}${esc(t(k))}</button>`).join('')}</div>
          <div class="row gap center wrap"><span class="muted">${esc(t('Templates:'))}</span>${Object.keys(TEMPLATES).map((k) => `<button type="button" class="pill dashed" data-tpl="${esc(k)}">${esc(t(k))}</button>`).join('')}</div>
          <textarea rows="4" data-mtext aria-label="${esc(t('Message'))}" placeholder="${esc(t('Write your message…'))}">${esc(COMPOSE.text)}</textarea>
          <div class="row gap center wrap"><span class="pop-wrap"><button type="button" class="pill dashed" data-attach>${icon('plus', 14)} ${esc(t('Attach practice or game'))}</button><div class="pop" id="att-pop" hidden>${[...S.games.map((g) => g.title), 'Worksheet 3: Fractions', 'Worksheet 5: Word problems'].map((x) => `<button type="button" class="pop-item" data-att="${esc(x)}">${esc(x)}</button>`).join('')}</div></span>${COMPOSE.attach ? `<span class="chip">${esc(COMPOSE.attach)}<button type="button" class="x-in" data-rmatt aria-label="${esc(t('Remove'))}">${icon('x', 12)}</button></span>` : ''}<span class="grow"></span><button type="button" class="btn primary" data-send>${icon('send', 16)} ${esc(t('Send'))}</button></div>
        </div>
      </section></div>`,
    mount(el) {
      const txt = $('[data-mtext]', el);
      txt.addEventListener('input', () => { COMPOSE.text = txt.value; });
      const mq = $('[data-mq]', el); mq.addEventListener('input', () => { MQ = mq.value; refresh(); setTimeout(() => { const i = $('[data-mq]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 0); });
      $('[data-new]', el).addEventListener('click', () => { COMPOSE = null; });
      $$('[data-rmto]', el).forEach((b) => b.addEventListener('click', () => { COMPOSE.to = COMPOSE.to.filter((x) => x !== b.dataset.rmto); refresh(); }));
      $('[data-addto]', el).addEventListener('click', (e) => { e.stopPropagation(); const p = $('#to-pop'); const h = p.hidden; closeMenus(); p.hidden = !h; });
      $('[data-attach]', el).addEventListener('click', (e) => { e.stopPropagation(); const p = $('#att-pop'); const h = p.hidden; closeMenus(); p.hidden = !h; });
      $$('[data-addsid]', el).forEach((b) => b.addEventListener('click', () => { COMPOSE.to.push(b.dataset.addsid); refresh(); }));
      $$('[data-att]', el).forEach((b) => b.addEventListener('click', () => { COMPOSE.attach = b.dataset.att; refresh(); }));
      const ra = $('[data-rmatt]', el); ra && ra.addEventListener('click', () => { COMPOSE.attach = null; refresh(); });
      $('[data-parent]', el).addEventListener('change', (e) => { COMPOSE.parent = e.target.checked; });
      $$('[data-mtype]', el).forEach((b) => b.addEventListener('click', () => { COMPOSE.type = b.dataset.mtype; refresh(); }));
      $$('[data-tpl]', el).forEach((b) => b.addEventListener('click', () => { COMPOSE.text = TEMPLATES[b.dataset.tpl]; if (/Fraction Pizza/.test(COMPOSE.text) && !COMPOSE.attach) COMPOSE.attach = 'Fraction Pizza'; refresh(); }));
      $('[data-send]', el).addEventListener('click', () => {
        if (!COMPOSE.to.length) return toast(esc(t('Add at least one person.')));
        if (!COMPOSE.text.trim()) { txt.focus(); return toast(esc(t('Write a message first.'))); }
        const m = { me: true, type: COMPOSE.type, text: COMPOSE.text.trim(), attach: COMPOSE.attach, time: 'now', parents: COMPOSE.parent };
        let c = conv && COMPOSE.to.join() === conv.to.join() ? conv : null;
        if (!c) {
          c = { id: 'c' + Date.now(), title: COMPOSE.to.length > 1 ? `${t('Group')} (${COMPOSE.to.length})` : (COMPOSE.parent && COMPOSE.to.length === 1 ? stu(COMPOSE.to[0]).parent : stu(COMPOSE.to[0]).short), kind: COMPOSE.to.length > 1 ? 'group' : COMPOSE.parent ? 'parent' : 'student', sub: COMPOSE.parent && COMPOSE.to.length === 1 ? '(parent)' : '', count: COMPOSE.to.length > 1 ? COMPOSE.to.length : 0, to: COMPOSE.to.slice(), thread: [], unread: 0 };
          T.conversations.unshift(c);
        }
        c.thread.push(m); c.preview = `${COMPOSE.type} sent`;
        if (COMPOSE.to.includes('s1')) S.inbox.unshift({ id: 'n' + Date.now(), kind: 'teacher', icon: COMPOSE.type === 'Practice' ? 'target' : COMPOSE.type === 'Praise' ? 'star' : 'chat', html: `<b>Ms. Mona</b> ${COMPOSE.type === 'Practice' ? 'sent you practice' : 'sent you a message'}: ${esc(m.text)}`, short: m.text, time: 'now', day: 'today', when: 'Today', unread: true, action: m.attach && S.games.find((g) => g.title === m.attach) ? { label: 'Practise', href: '/student/play/' + S.games.find((g) => g.title === m.attach).id } : null });
        if (COMPOSE.parent && COMPOSE.to.includes('s1')) S.parent.notes.unshift({ id: 'pn' + Date.now(), child: 's1', teacher: 'Ms. Mona', subject: 'math', date: '10 Oct', type: COMPOSE.type === 'Praise' ? 'Comment' : 'Feedback', text: m.text, replies: [] });
        save(); COMPOSE = null; toast(esc(t('Message sent.'))); go('/teacher/messages/' + c.id);
      });
    },
  };
});

/* ---------- Class posts ---------- */
let PC = { text: '', photo: null, star: null, aud: 'Students + parents', editing: null, open: {} };
route('/teacher/posts', 'teacher', () => {
  const T = TS();
  const post = (p) => `<article class="card post">
    <div class="row between center"><div class="row gap center">${initials('MA')}<div><b>${esc(p.author)}</b><span class="block small muted">${esc(t(p.when))}${p.date ? ', ' + esc(td(p.date)) : ''} · ${esc(t(p.audience))}</span></div></div>
      <span class="pop-wrap"><button type="button" class="btn ghost sm" data-pmenu="${p.id}">${icon('dots', 16)} ${esc(t('Edit / delete'))}</button><div class="pop menu" id="pm-${p.id}" hidden><button type="button" data-edit="${p.id}">${icon('pen', 16)} ${esc(t('Edit'))}</button><button type="button" data-del="${p.id}">${icon('x', 16)} ${esc(t('Delete'))}</button></div></span></div>
    ${PC.editing === p.id ? `<textarea rows="3" data-edtext>${esc(p.text)}</textarea><div class="row gap"><button type="button" class="btn primary sm" data-edsave="${p.id}">${esc(t('Save'))}</button><button type="button" class="btn sm" data-edcancel>${esc(t('Cancel'))}</button></div>` : `<p>${esc(p.text)}</p>`}
    ${p.star ? `<div class="star-strip">${icon('trophy', 18)} ${esc(t('Star of the Week'))}: <b>${esc(p.star)}</b><span class="muted small">· ${esc(t('Week of {d}', { d: td(p.week || S.star.week) }))}</span></div>` : ''}
    ${p.photo === 'garden' ? `<div class="post-img">${gardenSVG()}</div>` : p.photo ? `<div class="post-img"><img src="${esc(p.photo)}" alt=""></div>` : ''}
    <div class="row gap center small"><span>${icon('heart', 15)} ${p.likes}</span><button type="button" class="link" data-cm="${p.id}">${esc(t('{n} comments', { n: p.comments.length }))}</button></div>
    ${PC.open[p.id] ? `<div class="comments">${p.comments.map((c) => `<p><b>${esc(c.who)}</b> ${esc(c.text)}</p>`).join('')}<form class="row gap" data-cform="${p.id}"><input class="input" placeholder="${esc(t('Write a comment…'))}" aria-label="${esc(t('Write a comment…'))}"><button class="btn sm">${esc(t('Send'))}</button></form></div>` : ''}
  </article>`;
  return {
    title: 'Class posts', nav: 'posts',
    html: `<h1 class="page">${esc(t('Class {c} posts', { c: '4B' }))}</h1>
      <div class="posts">
        <section class="card composer" id="composer"><textarea rows="2" data-ptext placeholder="${esc(t('Share an update with the class…'))}" aria-label="${esc(t('Share an update with the class…'))}">${esc(PC.text)}</textarea>
          ${PC.photo ? `<div class="post-img sm"><img src="${esc(PC.photo)}" alt=""><button type="button" class="x-btn" data-rmphoto aria-label="${esc(t('Remove'))}">${icon('x', 14)}</button></div>` : ''}
          ${PC.star ? `<div class="star-strip">${icon('trophy', 18)} ${esc(t('Star of the Week'))}: <b>${esc(PC.star)}</b> <button type="button" class="x-in" data-rmstar aria-label="${esc(t('Remove'))}">${icon('x', 12)}</button></div>` : ''}
          <div class="row between center wrap"><div class="row gap"><label class="pill dashed">${icon('image', 14)} ${esc(t('Photo'))}<input type="file" accept="image/*" hidden data-photo></label><button type="button" class="pill dashed" data-star>${icon('trophy', 14)} ${esc(t('Star of the Week'))}</button></div>
            <div class="row gap center"><span class="small muted">${esc(t('Who sees it:'))}</span><select class="select dark sm" data-aud>${['Students + parents', 'Only parents', 'Only students'].map((a) => `<option ${PC.aud === a ? 'selected' : ''} value="${a}">${esc(t(a))}</option>`).join('')}</select><button type="button" class="btn primary sm" data-post>${esc(t('Post'))}</button></div></div></section>
        ${T.posts.map(post).join('')}
        <div class="row end"><button type="button" class="btn lg" data-create>${icon('plus', 18)} ${esc(t('Create post'))}</button></div>
      </div>`,
    mount(el) {
      const on = (sel, fn) => $$(sel, el).forEach((b) => b.addEventListener('click', fn));
      const ta = $('[data-ptext]', el); ta.addEventListener('input', () => { PC.text = ta.value; });
      $('[data-aud]', el).addEventListener('change', (e) => { PC.aud = e.target.value; });
      $('[data-photo]', el).addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) { PC.photo = await shrink(f, 900); refresh(); } });
      on('[data-rmphoto]', () => { PC.photo = null; refresh(); });
      on('[data-rmstar]', () => { PC.star = null; refresh(); });
      on('[data-star]', () => modal({ title: esc(t('Star of the Week')), body: `<label class="field"><span>${esc(t('Student'))}</span><select class="select" id="starpick">${T.roster.map((s) => `<option>${esc(s.short.split(' ')[0])}</option>`).join('')}</select></label>`,
        actions: [{ label: esc(t('Cancel')) }, { label: esc(t('Add')), primary: true, onClick: (m) => { PC.star = $('#starpick', m).value; if (!PC.text) PC.text = `Star of the Week: ${PC.star}!`; refresh(); } }] }));
      on('[data-post]', () => {
        if (!PC.text.trim() && !PC.photo) { ta.focus(); return toast(esc(t('Write something first.'))); }
        T.posts.unshift({ id: 'p' + Date.now(), author: T.name, when: 'Just now', date: '10 Oct', audience: PC.aud, text: PC.text.trim(), photo: PC.photo, star: PC.star, likes: 0, comments: [] });
        if (PC.star) S.star = { name: PC.star, reason: 'Chosen by Ms. Mona' };
        PC = { text: '', photo: null, star: null, aud: 'Students + parents', editing: null, open: {} }; save(); toast(esc(t('Posted.'))); refresh();
      });
      on('[data-create]', () => { $('#composer').scrollIntoView({ behavior: 'smooth', block: 'center' }); ta.focus(); });
      on('[data-pmenu]', (e) => { e.stopPropagation(); const p = $('#pm-' + e.currentTarget.dataset.pmenu); const h = p.hidden; closeMenus(); p.hidden = !h; });
      on('[data-edit]', (e) => { PC.editing = e.currentTarget.dataset.edit; refresh(); });
      on('[data-edcancel]', () => { PC.editing = null; refresh(); });
      on('[data-edsave]', (e) => { const p = T.posts.find((x) => x.id === e.currentTarget.dataset.edsave); p.text = $('[data-edtext]', el).value; PC.editing = null; save(); refresh(); });
      on('[data-del]', (e) => { const id = e.currentTarget.dataset.del; modal({ title: esc(t('Delete this post?')), body: `<p>${esc(t('Students and parents will no longer see it.'))}</p>`, actions: [{ label: esc(t('Cancel')) }, { label: esc(t('Delete')), primary: true, onClick: () => { T.posts = T.posts.filter((x) => x.id !== id); save(); refresh(); } }] }); });
      on('[data-cm]', (e) => { const id = e.currentTarget.dataset.cm; PC.open[id] = !PC.open[id]; refresh(); });
      $$('[data-cform]', el).forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); const v = $('input', f).value.trim(); if (!v) return; T.posts.find((x) => x.id === f.dataset.cform).comments.push({ who: T.name, text: v }); save(); refresh(); }));
    },
  };
});
function gardenSVG() {
  return `<svg viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(t('School garden'))}"><rect width="600" height="200" fill="#cfe6f5"/><circle cx="520" cy="45" r="26" fill="#f4c542"/><rect y="130" width="600" height="70" fill="#7fb069"/>
    ${[60, 150, 240, 330, 420].map((x, i) => `<g transform="translate(${x} 0)"><path d="M20 135V95" stroke="#3c7d3a" stroke-width="4"/><circle cx="20" cy="88" r="12" fill="${['#e57373', '#f4c542', '#ba68c8', '#ff8a65', '#e57373'][i]}"/><circle cx="20" cy="88" r="4" fill="#fff3c4"/><path d="M20 118c-12 0-16-8-16-8s10-4 16 4" fill="#5aa357"/></g>`).join('')}
    <rect x="480" y="100" width="70" height="40" fill="#a1683a"/><path d="M475 100l40-26 40 26z" fill="#8a5a2b"/></svg>`;
}

/* Resume grading that was in progress when the page was reloaded */
(function resumeGrading() {
  const pending = (S.teacher.grading || []).slice();
  S.teacher.grading = [];
  pending.forEach((g) => { const v = S.teacher.verify.find((x) => x.id === g.id); if (v) startGrading(v); });
})();
