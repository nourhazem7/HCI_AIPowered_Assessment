'use strict';
/* ===================== Student views ===================== */
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
function dnum(s) { const m = String(s || '').match(/(\d+)\s*([A-Z][a-z]{2})|([A-Z][a-z]{2})\s*(\d+)/); if (!m) return 0; return m[1] ? MONTHS[m[2]] * 100 + +m[1] : MONTHS[m[3]] * 100 + +m[4]; }
const exam = (id) => S.exams.find((e) => e.id === id);
const examName = (e) => `${t(subj(e.subject).name)} · ${t(e.title)}`;
/* Sending (or re-sending) an exam puts Younis's paper in the teacher's To verify list */
function sendToTeacher(e, page) {
  const T = S.teacher, id = 'v-younis-' + e.id;
  const old = T.verify.find((x) => x.id === id);
  if (old && old.status === 'rescan' && page) {
    old.status = 'verify'; old.sent = '10 Oct';
    T.notifs.unshift({ id: 't' + Date.now(), text: '{n} sent a new photo of page {p} ({x})', vars: { n: 'Younis H.', p: page, x: e.title }, unread: true, href: '/teacher/verify/' + id });
    return;
  }
  T.verify = T.verify.filter((x) => x.id !== id);
  T.review = T.review.filter((r) => !(r.id === 'r-' + id && r.status === 'review'));
  T.verify.unshift({ id, sid: 's1', sent: '10 Oct', examId: e.id, exam: e.title, subject: subj(e.subject).name, pages: verifyPages('Younis').slice(0, Math.max(1, Math.min(4, e.pages || 4))), status: 'verify' });
  T.notifs.unshift({ id: 't' + Date.now(), text: '{n} uploaded the {x}', vars: { n: 'Younis H.', x: e.title }, unread: true, href: '/teacher/verify/' + id });
}
/* The teacher's note when a page has to be retaken (seeded notes are plain text) */
function noteText(n) { return !n ? '' : typeof n === 'string' ? t(n) : rescanNote(n); }
/* Result texts. The Fractions Test builds them from the marks, so they match what the teacher published. */
function andList(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ' + t('and') + ' ' + a[a.length - 1]; }
function resultTexts(d) {
  if (!d.auto) return { happened: t(d.happened), why: t(d.why), improve: t(d.improve) };
  const right = d.questions.filter((q) => q.got === q.max).map((q) => q.q), wrong = d.questions.filter((q) => q.got < q.max);
  return {
    happened: t('You got {a} of {b} marks.', { a: d.got, b: d.total }) + (right.length ? ' ' + t(right.length === 1 ? 'Question {q} was great.' : 'Questions {q} were great.', { q: andList(right) }) : ''),
    why: wrong.length ? wrong.map((q) => t((FRAC_KID.why[q.q] || {})[q.got] || 'Question {n} was not fully right.', { n: q.q })).join(' ') : t('Every answer was right!'),
    improve: wrong.length ? t(FRAC_KID.improve[wrong[0].q] || 'Keep practising this topic.') : t('Keep practising, you got everything right!'),
  };
}
const graded = () => S.exams.filter((e) => e.status === 'graded');

function statusChip(e) {
  switch (e.status) {
    case 'upload': return `<span class="chip dashed">${icon('upload', 15)}${esc(t('Needs upload'))}</span>`;
    case 'checking': return `<span class="chip">${icon('clock', 15)}${esc(t('Teacher checking'))}</span>`;
    case 'rescan': return `<span class="chip dashed warn">${icon('camera', 15)}${esc(t('Needs a new photo'))}</span>`;
    case 'graded': return `<span class="chip dark">${icon('check', 15)}${esc(t('Grade ready'))} · ${e.score}%</span>`;
    case 'upcoming': return `<span class="chip">${icon('calendar', 15)}${esc(t('Coming soon'))}</span>`;
    default: return '';
  }
}
function examAction(e) {
  switch (e.status) {
    case 'upload': return `<a class="btn primary" href="#/student/upload/${e.id}">${esc(t('Upload'))} ${icon('upload', 16)}</a>`;
    case 'checking': return `<a class="btn ghost" href="#/student/exam/${e.id}">${esc(t('See pages'))}</a>`;
    case 'rescan': return `<a class="btn primary" href="#/student/exam/${e.id}">${icon('camera', 16)} ${esc(t('Take new photo'))}</a>`;
    case 'graded': return `<a class="btn" href="#/student/result/${e.id}">${esc(t('See result'))}</a>`;
    default: return '';
  }
}

/* ---------- Home ---------- */
route('/student/home', 'student', () => {
  const st = S.student;
  const starPts = Math.max(...S.classmates.map((c) => c.pts));
  const toStar = Math.max(0, starPts - st.points + 1);
  const nNew = newResults();
  const pick = S.games.find((g) => g.picked) || S.games[0];
  const now = S.exams.filter((e) => ['checking', 'rescan'].includes(e.status) || (e.status === 'graded' && e.isNew) || e.status === 'upload');
  const step = (on, cur, l) => `<span class="step ${on ? 'done' : ''} ${cur ? 'cur' : ''}">${esc(t(l))}</span>`;
  const row = (e) => {
    if (e.status === 'checking') return `<div class="now-row"><div><strong>${esc(examName(e))}</strong></div><div class="track">${step(true, false, 'Sent')}${icon('arrowR', 16)}${step(true, true, 'Teacher checking')}${icon('arrowR', 16)}${step(false, false, 'Grade ready')}</div></div>`;
    return `<div class="now-row line"><strong>${esc(examName(e))}</strong><span class="grow"></span>${statusChip(e)}${examAction(e).replace('class="btn"', 'class="btn primary"')}</div>`;
  };
  const msgs = S.inbox.filter((n) => n.kind === 'teacher').slice(0, 3);
  return {
    title: 'Home', nav: 'home',
    html: `<div class="head-row"><div><h1 class="hi">${esc(t('Hi {n}!', { n: st.name }))}</h1><p class="sub">${esc(t('What do you want to do today?'))}</p></div>
      <a class="card points-card" href="#/student/rewards"><strong>${st.points} ${esc(t('points'))}</strong><span>${toStar ? esc(t('{n} more to Star of the Week!', { n: toStar })) : esc(t('You are the Star of the Week!'))}</span></a></div>
      <div class="tiles">
        <a class="tile main-tile" href="#/student/upload">${icon('upload', 30)}<strong>${esc(t('Upload my exam'))}</strong><span>${esc(t('Take a photo of your paper'))}</span></a>
        <a class="tile" href="#/student/results">${icon('star', 30)}<strong>${esc(t('My results'))}</strong><span>${nNew ? esc(t('{n} new', { n: nNew })) : esc(t('All seen'))}</span></a>
        <a class="tile" href="#/student/progress">${icon('trend', 30)}<strong>${esc(t('My progress'))}</strong><span>${esc(t('See how I’m growing'))}</span></a>
        <a class="tile" href="#/student/games">${icon('game', 30)}<strong>${esc(t('Practice games'))}</strong><span>${esc(t('{g} is ready', { g: pick.title }))}</span></a>
      </div>
      <div class="cols-2-1">
        <section class="card"><h2>${esc(t('My exams right now'))}</h2>${now.length ? now.map(row).join('') : `<p class="muted">${esc(t('Nothing to do right now.'))}</p>`}</section>
        <section class="card"><div class="row between"><h2>${esc(t('Teacher messages'))}</h2><a class="link" href="#/student/messages">${esc(t('See all'))}</a></div>
          <ul class="plain-list">${msgs.map((m) => `<li><a href="#${m.action ? m.action.href : '/student/messages'}">${esc(t(m.short || m.html.replace(/<[^>]+>/g, ''), tvars(m.vars)))}</a><span class="muted"> (${esc(t(m.when || 'Today'))})</span></li>`).join('')}</ul></section>
      </div>`,
  };
});

/* ---------- My Subjects ---------- */
route('/student/subjects', 'student', () => {
  const card = (s) => {
    const ex = S.exams.filter((e) => e.subject === s.id);
    const last = ex.filter((e) => e.status === 'graded').sort((a, b) => dnum(b.checked) - dnum(a.checked))[0];
    const up = ex.filter((e) => e.status === 'upload').length, re = ex.filter((e) => e.status === 'rescan').length;
    const nw = ex.filter((e) => e.status === 'graded' && e.isNew).length, chk = ex.filter((e) => e.status === 'checking').length;
    const nxt = ex.find((e) => e.status === 'upcoming');
    const badge = re ? `<span class="chip dashed warn">${icon('camera', 15)}${esc(t('New photo needed'))}</span>`
      : up ? `<span class="chip dashed">${icon('upload', 15)}${esc(t('{n} to upload', { n: up }))}</span>`
        : nw ? `<span class="chip dark">${esc(t('{n} new grade', { n: nw }))}</span>`
          : chk ? `<span class="chip">${icon('clock', 15)}${esc(t('Teacher checking'))}</span>`
            : nxt ? `<span class="chip">${icon('calendar', 15)}${esc(t('Exam'))} ${esc(nxt.date.split(' ')[0])}</span>` : '';
    return `<a class="card subj-card" href="#/student/subjects/${s.id}"><div class="row between top-start"><div class="row gap">${subjIcon(s.id, 22)}<div><h2>${esc(t(s.name))}</h2><span class="muted">${esc(s.teacher)}</span></div></div>${badge}</div>
      <div class="row gap center">${bar(last ? last.score : 0)}<strong>${last ? last.score + '%' : '–'}</strong></div></a>`;
  };
  return {
    title: 'My Subjects', nav: 'subjects',
    html: `<h1 class="page">${esc(t('My Subjects'))}</h1><div class="grid-2">${S.subjects.map(card).join('')}</div><p class="muted">${esc(t('Tap a subject to see its exams and grades.'))}</p>`,
  };
});

route('/student/subjects/:id', 'student', ({ id }) => {
  const s = subj(id);
  const ex = S.exams.filter((e) => e.subject === id).sort((a, b) => (a.status === 'upcoming') - (b.status === 'upcoming') || dnum(b.written || b.date) - dnum(a.written || a.date));
  const meta = (e) => e.status === 'upcoming' ? `${t('Upcoming')} · ${e.date.replace(/^\w+ /, '')}` : `${e.pages} ${t('pages')} · ${e.status === 'upload' ? t('written') + ' ' + e.written : e.sent && e.status !== 'graded' ? t('sent') + ' ' + e.sent : e.written}`;
  return {
    title: s.name, nav: 'subjects',
    html: `${backBar('/student/subjects', [['/student/home', t('Home')], ['/student/subjects', t('My Subjects')], [null, t(s.name)]])}
      <div class="pills">${S.subjects.map((x) => `<a class="pill" href="#/student/subjects/${x.id}" aria-pressed="${x.id === id}">${esc(t(x.name))}</a>`).join('')}</div>
      <div class="row gap center title-row">${subjIcon(id, 24)}<h1 class="page inline">${esc(t(s.name))}</h1><span class="muted">${esc(s.teacher)}</span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>${esc(t('Exam'))}</th><th>${esc(t('Status'))}</th><th></th></tr></thead><tbody>
      ${ex.map((e) => `<tr><td><strong>${esc(t(e.title))}</strong><div class="muted small">${esc(meta(e))}</div></td><td>${statusChip(e)}</td><td class="right">${examAction(e)}</td></tr>`).join('')}
      </tbody></table></div>`,
  };
});

/* ---------- Exam pages (see pages / retake one page) ---------- */
function pagesOf(e) { S.uploads = S.uploads || {}; return S.uploads[e.id] || Array.from({ length: e.pages || 0 }, () => ({ sim: true })); }
route('/student/exam/:id', 'student', ({ id }) => {
  const e = exam(id); if (!e) return go('/student/subjects');
  const pages = pagesOf(e);
  const rescan = e.status === 'rescan';
  return {
    title: e.title, nav: 'subjects',
    html: `${backBar('/student/subjects/' + e.subject, [['/student/home', t('Home')], ['/student/subjects', t('My Subjects')], ['/student/subjects/' + e.subject, t(subj(e.subject).name)], [null, t(e.title)]])}
      <div class="row gap center title-row"><h1 class="page inline">${esc(t(e.title))}</h1>${statusChip(e)}</div>
      ${rescan ? `<section class="card note-card">${initials('MA')}<p><strong>${esc(subj(e.subject).teacher)} ${esc(t('says:'))}</strong> “${esc(noteText(e.note))}”</p></section>` : ''}
      ${e.status === 'checking' ? `<p class="muted">${esc(t('You can still change pages until your teacher starts checking.'))}</p>` : ''}
      <div class="pages-row">
        <div class="thumbs">${pages.map((p, i) => `<figure class="${rescan && i + 1 === e.rescanPage ? 'missing' : ''}">${rescan && i + 1 === e.rescanPage ? '<div class="thumb empty"></div>' : pageThumb(i * 2 + 1, { src: p.src })}<figcaption>${esc(t('Page'))} ${i + 1}</figcaption></figure>`).join('')}</div>
        ${rescan ? `<div class="retake"><button type="button" class="btn primary lg" data-retake>${icon('camera', 20)} ${esc(t('Take new photo of page {n}', { n: e.rescanPage }))}</button><p class="muted small">${esc(t('Pages {k} are kept.', { k: pages.map((_, i) => i + 1).filter((n) => n !== e.rescanPage).join(', ') }))}</p></div>` : ''}
        ${e.status === 'graded' ? `<div class="retake"><a class="btn primary" href="#/student/result/${e.id}">${esc(t('See result'))}</a></div>` : ''}
      </div>`,
    mount(el) {
      const b = $('[data-retake]', el);
      b && b.addEventListener('click', () => openCamera({ page: e.rescanPage, total: e.pages, onShot: (shot) => {
        const ps = pagesOf(e).slice(); ps[e.rescanPage - 1] = shot; S.uploads[e.id] = ps;
        e.status = 'checking'; e.sent = '10 Oct'; delete e.note;
        sendToTeacher(e, e.rescanPage);
        S.inbox.forEach((n) => { if (n.id === 'rescan-' + e.id) n.unread = false; });
        save(); toast(esc(t('New photo sent to your teacher. Thank you!'))); beep(); refresh();
      } }));
    },
  };
});

/* ---------- Upload flow ---------- */
let UP = null;
function upReset(examId) { UP = { step: 1, examId: examId || null, filter: 'all', pages: [], checked: false, sent: false, shots: 0 }; }
route('/student/upload', 'student', () => { if (!UP) upReset(); return uploadView(); });
route('/student/upload/:exam', 'student', ({ exam: id }) => { if (!UP || UP.examId !== id || (UP.sent && UP.urlExam !== id)) { upReset(id); UP.urlExam = id; if (exam(id) && exam(id).status === 'upload') UP.step = 2; } return uploadView(); });
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/student/upload')) UP = null; });

function uploadView() {
  const e = UP.examId && exam(UP.examId);
  const stepper = () => {
    const s = (n, l) => `<li class="${UP.step === n ? 'cur' : UP.step > n ? 'done' : ''}"><span class="num">${UP.step > n ? icon('check', 14) : n}</span>${esc(t(l))}</li>`;
    return `<ol class="steps">${s(1, 'Choose exam')}<li class="ln"></li>${s(2, 'Add pages')}<li class="ln"></li>${s(3, 'Check & send')}</ol>`;
  };
  const head = `<div class="flow-head"><button type="button" class="btn ghost" data-cancel>${icon('x', 16)} ${esc(t('Cancel'))}</button><h1>${esc(t('Upload my exam'))}</h1><span></span></div>`;
  let body = '';
  if (UP.sent) {
    body = `<section class="card sent-card"><div class="big-check">${icon('check', 40)}</div><h2>${esc(t('Sent! Well done'))}</h2>
      <p class="muted">${esc(t('Your {x} is with {tc}.', { x: t(subj(e.subject).name) + ' ' + t(e.title), tc: subj(e.subject).teacher }))}</p>
      <div class="next-box"><strong>${esc(t('What happens next?'))}</strong><ol><li>${esc(t('{tc} checks your answers', { tc: subj(e.subject).teacher }))}</li><li>${esc(t('She confirms your grade'))}</li><li>${esc(t('You get a message'))}</li></ol></div>
      <p class="muted small">${esc(t('You can still change pages until your teacher starts checking.'))}</p>
      <span class="chip">${icon('star', 15)} ${esc(t('+5 points for sending on time'))}</span>
      <div class="row gap two"><a class="btn lg" href="#/student/exam/${e.id}">${esc(t('See my pages'))}</a><a class="btn primary lg" href="#/student/home">${esc(t('Go home'))}</a></div></section>`;
    return { title: 'Upload my exam', layout: 'focus', html: `<div class="flow">${body}</div>` };
  }
  if (UP.step === 1) {
    const list = S.exams.filter((x) => ['upload', 'checking'].includes(x.status) && (UP.filter === 'all' || x.subject === UP.filter));
    body = `<div class="row between wrap"><h2>${esc(t('Which exam are you sending?'))}</h2>${chips(SUBJECT_FILTER(), UP.filter)}</div>
      <div class="radio-list" role="radiogroup">${list.map((x) => {
        const sent = x.status !== 'upload';
        return `<label class="radio-card ${UP.examId === x.id ? 'sel' : ''} ${sent ? 'off' : ''}"><input type="radio" name="ex" value="${x.id}" ${UP.examId === x.id ? 'checked' : ''} ${sent ? 'disabled' : ''}>${subjIcon(x.subject)}<span class="grow"><strong>${esc(examName(x))}</strong><span class="muted small">${sent ? esc(t('Already sent')) : `${esc(t('Written'))} ${esc(x.written)} · ${x.pages} ${esc(t('pages'))} · ${esc(subj(x.subject).teacher)}`}</span></span>${sent ? '' : `<span class="chip dashed">${esc(t('Send by {d}', { d: t(x.sendBy) }))}</span>`}</label>`;
      }).join('') || `<p class="muted">${esc(t('No exams to send in this subject.'))}</p>`}</div>
      <p class="row gap center help-line">${icon('help', 18)} ${esc(t('Can’t find your exam?'))} <button type="button" class="btn sm" data-buddy-ask="How do I upload?">${esc(t('Ask Buddy'))}</button> ${esc(t('or tell your teacher.'))}</p>
      <div class="flow-foot"><span></span><button type="button" class="btn primary lg" data-next ${UP.examId ? '' : 'disabled'}>${esc(t('Next: Add pages'))} ${icon('arrowR', 18)}</button></div>`;
  } else if (UP.step === 2) {
    const n = UP.pages.length, need = e.pages, diff = n && n !== need;
    const blurry = UP.pages.findIndex((p) => p.blurry);
    body = `<div class="banner">${subjIcon(e.subject)}<strong>${esc(examName(e))}</strong><span class="muted">· ${esc(t('your teacher says this test has'))} <b>${need} ${esc(t('pages'))}</b></span></div>
      <div class="cols-add">
        <div><div class="row between center"><h2>${esc(t('My pages'))}</h2><span class="row gap center small"><b>${esc(t('{a} of {b} pages', { a: n, b: need }))}</b>${bar(Math.min(100, (n / need) * 100), 'sm')}</span></div>
          <div class="thumbs">${UP.pages.map((p, i) => `<figure class="${p.blurry ? 'blurry' : ''}">${pageThumb(i * 2 + 1, { src: p.src })}<button type="button" class="x-btn" data-rm="${i}" aria-label="${esc(t('Remove page {n}', { n: i + 1 }))}">${icon('x', 14)}</button><figcaption>${esc(t('Page'))} ${i + 1}${p.pdf ? ` <span class="muted small">PDF</span>` : ''}</figcaption></figure>`).join('')}
            <figure><button type="button" class="thumb add" data-cam aria-label="${esc(t('Add page {n}', { n: n + 1 }))}">${icon('plus', 34)}</button><figcaption>${esc(t('Add page {n}', { n: n + 1 }))}</figcaption></figure></div>
          ${diff ? `<div class="info-box">${icon('help', 18)}<span>${esc(t(n < need ? 'Your teacher expects {b} pages. You added {a}.' : 'Your teacher expects {b} pages. You added {a}. Remove extra pages if they are not part of this exam.', { a: n, b: need }))}</span></div>` : ''}
          ${blurry > -1 ? `<div class="warn-box">${icon('warn', 18)}<span><b>${esc(t('Page {n} is blurry.', { n: blurry + 1 }))}</b> ${esc(t('Your teacher may not read it.'))}</span><button type="button" class="btn primary sm" data-again="${blurry}">${icon('camera', 16)} ${esc(t('Take again'))}</button></div>` : ''}
        </div>
        <div class="add-opts">
          <button type="button" class="opt-card main-tile" data-cam>${icon('camera', 24)}<span><strong>${esc(t('Take a photo'))}</strong><span>${esc(t('Use the camera'))}</span></span></button>
          <label class="opt-card">${icon('image', 24)}<span><strong>${esc(t('Choose a file'))}</strong><span>${esc(t('Photos or a PDF (all pages are added)'))}</span></span><input type="file" accept="image/*,application/pdf" multiple hidden data-file></label>
          <div class="opt-card tip">${icon('image', 24)}<span><b>${esc(t('Tip:'))}</b> ${esc(t('Put your paper flat in a bright place. Fit the whole page in the box.'))}</span></div>
        </div>
      </div>
      <div class="flow-foot"><button type="button" class="btn lg" data-back>${icon('arrowL', 18)} ${esc(t('Back'))}</button><span class="row gap center">${!n ? `<span class="muted small">${esc(t('Add at least one page to continue'))}</span>` : ''}<button type="button" class="btn primary lg" data-next ${n ? '' : 'disabled'}>${esc(t('Next: Check pages'))} ${icon('arrowR', 18)}</button></span></div>`;
  } else {
    body = `<section class="card check-card"><p class="muted small">${icon('check', 14)} ${esc(t('Exam'))} — ${icon('check', 14)} ${esc(t('Pages'))} — 3 ${esc(t('Check & send'))}</p><h2>${esc(t('Is everything here?'))}</h2>
      <div class="thumbs">${UP.pages.map((p, i) => `<figure>${pageThumb(i * 2 + 1, { src: p.src })}<figcaption>${esc(t('Page'))} ${i + 1}</figcaption></figure>`).join('')}</div>
      <dl class="summary"><div><dt>${esc(t('Subject'))}:</dt><dd>${esc(t(subj(e.subject).name))}</dd></div><div><dt>${esc(t('Exam'))}:</dt><dd>${esc(t(e.title))}</dd></div><div><dt>${esc(t('Pages'))}:</dt><dd>${UP.pages.length} ${esc(t('of'))} ${e.pages} ${UP.pages.length === e.pages ? icon('check', 14) : icon('warn', 14)}</dd></div></dl>
      <label class="check big"><input type="checkbox" data-ok ${UP.checked ? 'checked' : ''}> ${esc(t('I checked that all my pages are clear and in order'))}</label>
      <div class="row gap two"><button type="button" class="btn lg" data-back>${esc(t('Fix pages'))}</button><button type="button" class="btn primary lg" data-send ${UP.checked ? '' : 'disabled'}>${esc(t('Send to teacher'))} ${icon('arrowR', 18)}</button></div></section>`;
  }
  return {
    title: 'Upload my exam', layout: 'focus',
    html: `<div class="flow">${head}${stepper()}${body}</div>`,
    mount(el) {
      const on = (sel, fn) => $$(sel, el).forEach((b) => b.addEventListener('click', fn));
      on('[data-cancel]', () => {
        if (!UP.pages.length) { upReset(); return go('/student/home'); }
        modal({ title: esc(t('Stop uploading?')), body: `<p>${esc(t('The pages you added will not be sent.'))}</p>`,
          actions: [{ label: esc(t('Keep going')) }, { label: esc(t('Yes, cancel')), primary: true, onClick: () => { upReset(); go('/student/home'); } }] });
      });
      $$('[data-f]', el).forEach((b) => b.addEventListener('click', () => { UP.filter = b.dataset.f; refresh(); }));
      $$('input[name=ex]', el).forEach((r) => r.addEventListener('change', () => { UP.examId = r.value; UP.pages = []; refresh(); }));
      on('[data-buddy-ask]', (ev) => Buddy.open({ ask: ev.currentTarget.dataset.buddyAsk }));
      on('[data-next]', () => {
        if (UP.step === 2 && UP.pages.length !== e.pages) {
          return modal({ title: esc(t('Page count is different')), body: `<p>${esc(t('Your teacher expects {b} pages. You added {a}.', { a: UP.pages.length, b: e.pages }))}</p><p class="muted">${esc(t('Continue only if this is really the whole exam.'))}</p>`,
            actions: [{ label: esc(t('Add more pages')) }, { label: esc(t('Continue anyway')), primary: true, onClick: () => { UP.step++; refresh(); } }] });
        }
        UP.step++; refresh();
      });
      on('[data-back]', () => { UP.step--; refresh(); });
      on('[data-rm]', (ev) => { UP.pages.splice(+ev.currentTarget.dataset.rm, 1); refresh(); });
      on('[data-cam]', () => openCamera({ page: UP.pages.length + 1, total: Math.max(e.pages, UP.pages.length + 1), onShot: (shot) => {
        UP.shots++;
        if (!shot.src && UP.pages.length === 2 && UP.shots === 3) shot.blurry = true; // demo: 3rd simulated photo comes out blurry
        UP.pages.push(shot); refresh();
      } }));
      on('[data-again]', (ev) => { const i = +ev.currentTarget.dataset.again; openCamera({ page: i + 1, total: e.pages, onShot: (shot) => { UP.pages[i] = shot; refresh(); } }); });
      const fi = $('[data-file]', el);
      fi && fi.addEventListener('change', async () => {
        const unknown = [];
        let pdfPages = 0;
        for (const f of [...fi.files]) {
          if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
            const k = await pdfPageCount(f);
            if (!k) { unknown.push(f.name); continue; }
            pdfPages += k;
            for (let j = 0; j < k; j++) UP.pages.push({ sim: true, pdf: f.name });
          } else UP.pages.push({ src: await shrink(f) });
        }
        refresh();
        if (pdfPages) toast(esc(t('PDF added: {n} pages', { n: pdfPages })));
        // The page count could not be read from this PDF: ask instead of guessing
        unknown.forEach((name) => modal({
          title: esc(t('How many pages are in this PDF?')),
          body: `<p class="muted">${esc(name)}</p><label class="field"><span>${esc(t('Pages'))}</span><input type="number" id="pdfn" min="1" max="30" value="${Math.max(1, e.pages - UP.pages.length)}"></label>`,
          actions: [{ label: esc(t('Cancel')) }, { label: esc(t('Add pages')), primary: true, onClick: (m) => {
            const k = Math.min(30, Math.max(1, parseInt($('#pdfn', m).value, 10) || 1));
            for (let j = 0; j < k; j++) UP.pages.push({ sim: true, pdf: name });
            setTimeout(refresh, 0);
          } }],
        }));
      });
      const ok = $('[data-ok]', el);
      ok && ok.addEventListener('change', () => { UP.checked = ok.checked; $('[data-send]', el).disabled = !ok.checked; });
      on('[data-send]', () => {
        e.status = 'checking'; e.sent = '10 Oct';
        S.uploads = S.uploads || {}; S.uploads[e.id] = UP.pages.map((p) => ({ src: p.src || null }));
        sendToTeacher(e);
        addPoints(5, 'Sent exam on time');
        UP.sent = true; save(); refresh();
      });
    },
  };
}

/* Counts the pages in a PDF by reading its page objects. Returns 0 when it can't tell (compressed PDFs). */
function pdfPageCount(file) {
  return file.arrayBuffer().then((buf) => {
    const txt = new TextDecoder('latin1').decode(buf);
    const pages = (txt.match(/\/Type\s*\/Page(?!s)/g) || []).length;
    if (pages) return pages;
    const counts = [...txt.matchAll(/\/Count\s+(\d+)/g)].map((x) => +x[1]);
    return counts.length ? Math.max(...counts) : 0;
  }).catch(() => 0);
}

function shrink(file, max = 520) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => res(null);
    img.src = URL.createObjectURL(file);
  });
}

/* Camera: uses the real camera when allowed, otherwise a simulated viewfinder */
function openCamera({ page, total, onShot }) {
  let stream = null;
  const m = modal({
    title: esc(t('Take a photo')),
    body: `<div class="camera"><span class="cam-pill">${esc(t('Page {a} of {b}', { a: page, b: total }))}</span><video playsinline muted hidden></video><div class="cam-frame"></div><p>${esc(t('Fit the whole page inside the lines'))}</p></div>
      <div class="cam-foot"><button type="button" class="shutter" data-shot aria-label="${esc(t('Take photo'))}"></button></div>`,
    onMount(w) {
      const v = $('video', w);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then((s) => { stream = s; v.srcObject = s; v.hidden = false; v.play(); }).catch(() => {});
      }
      $('[data-shot]', w).addEventListener('click', () => {
        let shot = { sim: true };
        if (stream && v.videoWidth) {
          const c = document.createElement('canvas'), k = Math.min(1, 520 / Math.max(v.videoWidth, v.videoHeight));
          c.width = v.videoWidth * k; c.height = v.videoHeight * k; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          shot = { src: c.toDataURL('image/jpeg', 0.7) };
        }
        beep(); stop(); closeModal(); onShot(shot);
      });
    },
  });
  const stop = () => { stream && stream.getTracks().forEach((tr) => tr.stop()); stream = null; };
  const obs = new MutationObserver(() => { if (!document.body.contains(m)) { stop(); obs.disconnect(); } });
  obs.observe(document.body, { childList: true });
}

/* ---------- My Results ---------- */
let RF = { f: 'all', sort: 'newest' };
route('/student/results', 'student', () => {
  let list = graded().filter((e) => RF.f === 'all' || e.subject === RF.f);
  list.sort((a, b) => (RF.sort === 'newest' ? dnum(b.checked) - dnum(a.checked) : b.score - a.score));
  const pending = S.exams.filter((e) => ['checking', 'rescan'].includes(e.status) && (RF.f === 'all' || e.subject === RF.f));
  return {
    title: 'My Results', nav: 'results',
    html: `<div class="row between wrap head-row"><h1 class="page inline">${esc(t('My Results'))}</h1><div class="row gap wrap">${chips(SUBJECT_FILTER(), RF.f)}<button type="button" class="pill dashed" data-sort>${icon('filter', 15)} ${esc(t(RF.sort === 'newest' ? 'Newest' : 'Best score'))}</button></div></div>
      <section class="card list-card">${list.map((e) => `<a class="res-row ${e.isNew ? 'new' : ''}" href="#/student/result/${e.id}">${subjIcon(e.subject)}<span class="grow"><strong>${esc(examName(e))}</strong>${e.isNew ? `<span class="chip dark tiny">${esc(t('NEW'))}</span>` : ''}<span class="muted small block">${esc(t('Checked by {tc}', { tc: subj(e.subject).teacher }))} · ${esc(e.checked)}</span></span>${starsFor(e.score)}<strong class="pct">${e.score}%</strong>${change(e.change)}<span class="btn sm">${esc(t('Open'))}</span></a>`).join('') || `<p class="muted pad">${esc(t('No results yet.'))}</p>`}</section>
      ${pending.length ? `<section class="card dashed"><h2>${icon('clock', 18)} ${esc(t('Still being checked'))} (${pending.length})</h2>${pending.map((e) => `<div class="row between center line"><span class="row gap center">${subjIcon(e.subject, 16)}<span class="muted">${esc(examName(e))} · ${esc(t('sent'))} ${esc(e.sent)}</span></span>${statusChip(e)}</div>`).join('')}</section>` : ''}`,
    mount(el) {
      $$('[data-f]', el).forEach((b) => b.addEventListener('click', () => { RF.f = b.dataset.f; refresh(); }));
      $('[data-sort]', el).addEventListener('click', () => { RF.sort = RF.sort === 'newest' ? 'best' : 'newest'; refresh(); });
    },
  };
});

/* ---------- One result (explainable) ---------- */
let OPENQ = null;
route('/student/result/:id', 'student', ({ id }) => {
  const e = exam(id), d = S.details[id];
  if (!e || !d || e.status !== 'graded') return go('/student/results');
  if (e.isNew) { e.isNew = false; S.inbox.forEach((n) => { if (n.action && n.action.href === '/student/result/' + id) n.unread = false; }); save(); }
  const wrong = d.questions.filter((q) => q.got < q.max);
  if (OPENQ == null) OPENQ = wrong[0] ? wrong[0].q : null;
  const g = S.games.find((x) => x.id === d.next.game);
  const pct = e.score;
  const RT = resultTexts(d);
  return {
    title: e.title, nav: 'results', buddy: { examId: id },
    html: `${backBar('/student/results', [['/student/home', t('Home')], ['/student/results', t('My Results')], [null, examName(e)]])}
      <div class="res-top">
        <section class="card score-card"><div class="big">${pct}%</div>${starsFor(pct)}<h2>${esc(t(d.headline || 'Good effort!'))}</h2><p class="muted small">${e.change > 0 ? icon('arrowUp', 14) + ' ' + esc(t('{n}% better than last test', { n: e.change })) : e.change < 0 ? icon('arrowDown', 14) + ' ' + esc(t('{n}% lower than last test', { n: -e.change })) : ''}</p></section>
        <div class="explain"><span class="chip dark">${icon('check', 15)} ${esc(t('Checked by {tc}', { tc: subj(e.subject).teacher }))}</span>
          <div class="explain-cards">
            <div class="card ex"><h3>1. ${esc(t('What happened'))}</h3><p>${esc(RT.happened)}</p></div>
            <div class="card ex"><h3>2. ${esc(t('Why'))}</h3><p>${esc(RT.why)}</p></div>
            <div class="card ex"><h3>3. ${esc(t('What to improve'))}</h3><p>${esc(RT.improve)}</p></div>
            <div class="card ex strong"><h3>4. ${esc(t('What to do next'))}</h3><p>${esc(t(d.next.text))}</p><a class="btn primary sm" href="#/student/play/${d.next.game}">${esc(t('Practice'))}</a></div>
          </div></div>
      </div>
      <div class="cols-3-2">
        <section class="card"><h2>${icon('list', 20)} ${esc(t('My answers'))}</h2>
          <div class="answers">${d.questions.map((q) => {
            const ok = q.got === q.max, open = OPENQ === q.q;
            return `<div class="ans ${open ? 'open' : ''}"><button type="button" class="ans-row" data-q="${q.q}" aria-expanded="${open}"><span class="mark ${ok ? 'ok' : 'bad'}">${icon(ok ? 'check' : 'x', 16)}</span><span class="grow">Q${q.q} · ${esc(t(q.text))}</span><b>${q.got}/${q.max}</b>${icon(open ? 'down' : 'right', 16)}</button>
              ${open ? `<div class="ans-body"><div class="mini-scan">${scanSVG([{ q: 'Q' + q.q, a: q.your }], { mini: true })}</div><div><p><b>${esc(t('Your answer:'))}</b> ${esc(q.your)}</p><p><b>${esc(t('Right answer:'))}</b> ${esc(q.right)}</p>${q.explain ? `<p class="muted">${t(q.explain)}</p>` : ''}</div></div>` : ''}</div>`;
          }).join('')}</div></section>
        <div class="stack">
          <section class="card says">${initials('MA')}<div><h3>${esc(t('{tc} says', { tc: subj(e.subject).teacher }))}</h3><p>“${esc(t(d.teacherSays))}”</p></div></section>
          ${d.workOn ? `<section class="card dashed"><h3>${icon('flag', 18)} ${esc(t('Let’s work on'))}</h3><p>${esc(t(d.workOn.topic))}. ${esc(t('You made this mistake'))} <b>${d.workOn.times} ${esc(t('times'))}</b> ${esc(t('in your last tests.'))}</p></section>` : ''}
          ${wrong[0] ? `<button type="button" class="btn" data-ask="Why is Q${wrong[0].q} wrong?">${icon('chat', 18)} ${esc(t('Ask Buddy about Q{n}', { n: wrong[0].q }))}</button>` : ''}
          ${g ? `<div class="card game-mini">${gameArt(g.id, 70)}<span class="grow"><strong>${esc(g.title)}</strong><span class="muted small block">${g.mins} min · +${g.pts} ${esc(t('points'))}</span></span><a class="btn primary sm" href="#/student/play/${g.id}">${esc(t('Play'))}</a></div>` : ''}
        </div>
      </div>`,
    mount(el) {
      $$('[data-q]', el).forEach((b) => b.addEventListener('click', () => { const q = +b.dataset.q; OPENQ = OPENQ === q ? -1 : q; refresh(); }));
      const a = $('[data-ask]', el); a && a.addEventListener('click', () => Buddy.open({ ask: a.dataset.ask }));
    },
  };
});
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/student/result/')) OPENQ = null; });

/* ---------- My Progress ---------- */
let PF = 'math';
route('/student/progress', 'student', () => {
  const all = PF === 'all';
  let chart;
  if (all) {
    const pts = Object.entries(S.history).flatMap(([k, arr]) => arr.map((p) => ({ ...p, label: p.label, color: SUBJ_COLORS[k] }))).sort((a, b) => dnum(a.date) - dnum(b.date));
    chart = lineChart(pts, { xKey: 'date', noLine: true, label: t('All my tests') }) + `<div class="legend">${S.subjects.map((s) => `<span><i style="background:${SUBJ_COLORS[s.id]}"></i>${esc(t(s.name))}</span>`).join('')}</div>`;
  } else chart = lineChart(S.history[PF], { label: t('My {s} tests', { s: t(subj(PF).name) }) });
  const keys = all ? S.subjects.map((s) => s.id) : [PF];
  const great = keys.flatMap((k) => S.strengths[k]), prac = keys.flatMap((k) => S.practise[k]);
  const mist = S.mistakes.filter((m) => all || m.subject === PF);
  const latest = (id) => { const h = S.history[id]; return h[h.length - 1].v; };
  return {
    title: 'My Progress', nav: 'progress',
    html: `<div class="row between wrap head-row"><h1 class="page inline">${esc(t('My Progress'))}</h1>${chips(SUBJECT_FILTER(), PF)}</div>
      <div class="cols-3-2">
        <section class="card"><h2>${esc(all ? t('All my tests') : t('My {s} tests', { s: t(subj(PF).name) }))}</h2>${chart}</section>
        <div class="stack">
          <section class="card"><h3>${esc(t('I’m great at'))}</h3><p>${great.map((x) => esc(t(x))).join(' · ')}</p></section>
          <section class="card dashed"><h3>${esc(t('Let’s practise'))}</h3><div class="row gap wrap">${prac.map((p) => `<a class="chip link-chip" href="#/student/games">${esc(t(p))}</a>`).join('')}</div></section>
        </div>
      </div>
      <div class="cols-3-2">
        <section class="card"><h2>${esc(t('Mistakes I keep making'))}</h2>${mist.map((m, i) => `<div class="mistake ${i === 0 ? 'top' : ''}"><span class="times">${m.times}×</span><span class="grow"><strong>${esc(t(m.text))}</strong><span class="block small">${esc(m.where)}</span></span>${m.game ? `<a class="btn ${i === 0 ? 'primary' : ''} sm" href="#/student/play/${m.game}">${esc(t('Practise'))}</a>` : `<button type="button" class="btn sm" data-show="${m.id}">${esc(t('Show me'))}</button>`}</div>`).join('') || `<p class="muted">${esc(t('No repeated mistakes here. Great!'))}</p>`}</section>
        <section class="card"><h2>${esc(t('All my subjects'))}</h2>${S.subjects.map((s) => `<button type="button" class="subj-bar" data-f="${s.id}"><span>${esc(t(s.name))}</span>${bar(latest(s.id))}<span>${latest(s.id)}%</span></button>`).join('')}</section>
      </div>`,
    mount(el) {
      $$('[data-f]', el).forEach((b) => b.addEventListener('click', () => { PF = b.dataset.f; refresh(); }));
      $$('[data-show]', el).forEach((b) => b.addEventListener('click', () => {
        const m = S.mistakes.find((x) => x.id === b.dataset.show);
        modal({ title: esc(t(m.text)), body: `<p>${esc(t(m.explain))}</p><div class="carry"><pre>  ¹\n  27\n+ 15\n----\n  42</pre></div>`,
          actions: [{ label: icon('speaker', 16) + ' ' + esc(t('Read to me')), onClick: () => { speak(t(m.explain)); return false; } }, { label: esc(t('Got it')), primary: true }] });
      }));
    },
  };
});

/* ---------- Rewards ---------- */
function leaderboard() {
  return [...S.classmates, { name: t('You'), pts: S.student.points, me: true, avatar: S.student.avatar }].sort((a, b) => b.pts - a.pts);
}
route('/student/rewards', 'student', () => {
  const st = S.student, goal = 150;
  const lb = leaderboard();
  const star = S.classmates.find((c) => c.name === S.star.name);
  return {
    title: 'Rewards', nav: 'rewards',
    html: `<h1 class="page">${esc(t('My Rewards'))}</h1>
      <div class="cols-1-2">
        <section class="card center-col"><h2>${esc(t('My avatar'))}</h2>${avatarSVG(st.avatar, 130)}<a class="btn" href="#/student/avatar">${esc(t('Change look'))}</a></section>
        <section class="card"><h2>${esc(t('My points'))}</h2><div class="pts"><span class="big">${st.points}</span><span class="muted">/ ${goal}</span></div>${bar((st.points / goal) * 100, 'lg')}
          <p class="muted small">${st.points >= goal ? esc(t('You unlocked the special avatar items!')) : esc(t('{n} more points to unlock special avatar items', { n: goal - st.points }))}</p>
          <ul class="plain-list muted">${st.pointsLog.slice(0, 4).map((l) => `<li>+${l.pts} ${esc(t(l.text))}</li>`).join('')}</ul></section>
      </div>
      <div class="cols-1-1">
        <section class="card shade center-col"><h2 class="self-start">${icon('trophy', 20)} ${esc(t('Star of the Week'))}</h2>${avatarSVG(star.avatar, 110)}<strong class="lg-text">${esc(S.star.name)}</strong><span class="muted">${esc(t(S.star.reason))} · ${esc(t('Week of {d}', { d: td(S.star.week) }))}</span></section>
        <section class="card"><h2>${esc(t('Class leaderboard · this week'))}</h2><ol class="board">${lb.map((p, i) => `<li class="${p.me ? 'me' : ''}"><b>${i + 1}</b>${avatarSVG(p.avatar, 30)}<span class="grow">${esc(p.name)}</span><span>${p.pts} ${esc(t('pts'))}</span></li>`).join('')}</ol></section>
      </div>`,
  };
});

/* ---------- Avatar editor ---------- */
let AVD = null;
route('/student/avatar', 'student', () => {
  if (!AVD) AVD = { a: clone(S.student.avatar), hist: [], tab: 'face' };
  const cats = [['face', 'Face'], ['hair', 'Hair'], ['clothes', 'Clothes'], ['hats', 'Hats'], ['background', 'Background']];
  const cat = AV[AVD.tab];
  return {
    title: 'My avatar', nav: 'rewards',
    html: `${backBar('/student/rewards', [['/student/home', t('Home')], ['/student/rewards', t('Rewards')], [null, t('My avatar')]])}
      <div class="avatar-edit">
        <div class="center-col"><div class="preview">${avatarSVG(AVD.a, 220)}</div><div class="row gap"><button type="button" class="btn ghost sm" data-undo ${AVD.hist.length ? '' : 'disabled'}>${icon('undo', 16)} ${esc(t('Undo'))}</button><button type="button" class="btn ghost sm" data-random>${icon('shuffle', 16)} ${esc(t('Random'))}</button></div></div>
        <div class="grow">
          <div class="tabs" role="tablist">${cats.map(([k, l]) => `<button type="button" role="tab" aria-selected="${AVD.tab === k}" data-tab="${k}">${esc(t(l))}</button>`).join('')}</div>
          <div class="opt-grid">${cat.opts.map((o, i) => {
            const cost = cat.cost[i], locked = cost > S.student.points, wearing = AVD.a[AVD.tab] === i;
            const prev = { ...AVD.a, [AVD.tab]: i };
            return `<button type="button" class="av-opt ${wearing ? 'sel' : ''} ${locked ? 'locked' : ''}" data-opt="${i}" ${locked ? 'aria-disabled="true"' : ''}>${avatarSVG(prev, 76)}<span>${wearing ? icon('check', 14) + ' ' + esc(t('Wearing')) : locked ? icon('star', 14) + ' ' + cost + ' ' + esc(t('points')) : esc(t('Free'))}</span></button>`;
          }).join('')}</div>
          <div class="row gap end"><button type="button" class="btn lg" data-cancel>${esc(t('Cancel'))}</button><button type="button" class="btn primary lg" data-save>${esc(t('Save my avatar'))}</button></div>
        </div>
      </div>`,
    mount(el) {
      $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => { AVD.tab = b.dataset.tab; refresh(); }));
      $$('[data-opt]', el).forEach((b) => b.addEventListener('click', () => {
        const i = +b.dataset.opt;
        if (b.classList.contains('locked')) return toast(esc(t('Earn {n} points to unlock this.', { n: AV[AVD.tab].cost[i] })));
        AVD.hist.push(clone(AVD.a)); AVD.a[AVD.tab] = i; refresh();
      }));
      $('[data-undo]', el).addEventListener('click', () => { if (AVD.hist.length) { AVD.a = AVD.hist.pop(); refresh(); } });
      $('[data-random]', el).addEventListener('click', () => {
        AVD.hist.push(clone(AVD.a));
        Object.keys(AV).forEach((k) => { const ok = AV[k].cost.map((c, i) => (c <= S.student.points ? i : -1)).filter((i) => i > -1); AVD.a[k] = ok[Math.floor(Math.random() * ok.length)]; });
        refresh();
      });
      $('[data-cancel]', el).addEventListener('click', () => { AVD = null; go('/student/rewards'); });
      $('[data-save]', el).addEventListener('click', () => { S.student.avatar = AVD.a; AVD = null; save(); beep(); toast(esc(t('Avatar saved!'))); go('/student/rewards'); });
    },
  };
});
window.addEventListener('hashchange', () => { if (location.hash !== '#/student/avatar') AVD = null; });

/* ---------- Games list ---------- */
let GF = 'all';
route('/student/games', 'student', () => {
  const picked = S.games.find((g) => g.picked);
  const list = S.games.filter((g) => GF === 'all' || g.subject === GF);
  return {
    title: 'Games', nav: 'games',
    html: `<div class="row between wrap head-row"><h1 class="page inline">${esc(t('Games'))}</h1>${chips(SUBJECT_FILTER(), GF)}</div>
      ${picked && (GF === 'all' || picked.subject === GF) ? `<p class="label">${esc(t('Picked for you'))}</p><section class="card shade picked">${gameArt(picked.id, 120)}<span class="grow"><strong class="lg-text">${esc(picked.title)}</strong><span class="block">${esc(t('Helps with:'))} ${esc(picked.helps)} · ${picked.mins} min · +${picked.pts} ${esc(t('points'))}</span></span><a class="btn primary lg" href="#/student/play/${picked.id}">${icon('play', 18)} ${esc(t('Play'))}</a></section>` : ''}
      <div class="grid-4">${list.filter((g) => !(g.picked && (GF === 'all' || g.subject === GF))).map((g) => `<a class="card game-card" href="#/student/play/${g.id}"><div class="art">${gameArt(g.id, 110)}</div><strong>${esc(g.title)}</strong><span class="muted small">${esc(t(subj(g.subject).name))} · ${g.mins} min</span><span class="small right">${g.played ? esc(t('Played {n}×', { n: g.played })) : esc(t('New'))}</span></a>`).join('')}</div>`,
    mount(el) { $$('[data-f]', el).forEach((b) => b.addEventListener('click', () => { GF = b.dataset.f; refresh(); })); },
  };
});

/* ---------- Help & settings ---------- */
route('/student/help', 'student', () => ({
  title: 'Help & settings', nav: 'help',
  html: `<h1 class="page">${esc(t('Help & settings'))}</h1>
    <div class="cols-1-1 start">${settingsCard()}
      <section class="card"><h2>${icon('help', 20)} ${esc(t('Need help?'))}</h2><p class="muted">${esc(t('Buddy can show you around the app.'))}</p>
        <div class="row gap wrap">${['How do I upload?', 'Where are my stars?', 'How do I play games?', 'Show me my results'].map((q) => `<button type="button" class="btn sm" data-ask="${esc(q)}">${esc(t(q))}</button>`).join('')}</div></section></div>
    <div class="row gap"><button type="button" class="btn ghost lg" data-signout>${icon('arrowL', 18)} ${esc(t('Sign out'))}</button><button type="button" class="btn ghost" data-reset>${icon('refresh', 18)} ${esc(t('Reset demo data'))}</button></div>`,
  mount(el) { bindSettings(el); $$('[data-ask]', el).forEach((b) => b.addEventListener('click', () => Buddy.open({ ask: b.dataset.ask }))); },
}));

/* ---------- Messages ---------- */
let MT = 'all';
route('/student/messages', 'student', () => {
  const nNew = unreadStudent();
  const list = S.inbox.filter((n) => MT === 'all' || (MT === 'teacher' ? n.kind === 'teacher' : n.kind === 'reward'));
  const item = (n) => `<div class="msg ${n.unread ? 'unread' : ''}" data-id="${n.id}"><span class="dot" aria-label="${n.unread ? esc(t('New')) : ''}"></span>${n.icon === 'avatar' ? initials('MA') : `<span class="sq-ic">${icon(n.icon || 'mail', 18)}</span>`}<span class="grow"><span>${t(n.html, tvars(n.vars))}</span>${n.time || n.sub ? `<span class="small block muted">${esc(n.time || '')}${n.time && n.sub ? ' · ' : ''}${esc(t(n.sub || ''))}</span>` : ''}</span>${n.action ? `<a class="btn ${n.action.primary ? 'primary' : ''} sm" href="#${n.action.href}" data-read="${n.id}">${esc(t(n.action.label))}</a>` : ''}</div>`;
  const today = list.filter((n) => n.day === 'today'), earlier = list.filter((n) => n.day !== 'today');
  return {
    title: 'My messages', nav: '',
    html: `${backBar('/student/home', [['/student/home', t('Home')], [null, t('My messages')]])}<div class="row between head-row"><h1 class="page inline">${esc(t('My messages'))}</h1><button type="button" class="btn ghost sm" data-readall ${nNew ? '' : 'disabled'}>${icon('check', 16)} ${esc(t('Mark all as read'))}</button></div>
      <div class="tabs" role="tablist"><button type="button" role="tab" data-t="all" aria-selected="${MT === 'all'}">${esc(t('All'))}${nNew ? ` (${nNew} ${esc(t('new'))})` : ''}</button><button type="button" role="tab" data-t="teacher" aria-selected="${MT === 'teacher'}">${esc(t('From teachers'))}</button><button type="button" role="tab" data-t="reward" aria-selected="${MT === 'reward'}">${esc(t('Rewards'))}</button></div>
      ${today.length ? `<p class="label">${esc(t('Today'))}</p>${today.map(item).join('')}` : ''}
      ${earlier.length ? `<p class="label">${esc(t('Earlier'))}</p>${earlier.map(item).join('')}` : ''}
      ${!list.length ? `<p class="muted">${esc(t('No messages here.'))}</p>` : ''}`,
    mount(el) {
      $$('[data-t]', el).forEach((b) => b.addEventListener('click', () => { MT = b.dataset.t; refresh(); }));
      $('[data-readall]', el).addEventListener('click', () => { S.inbox.forEach((n) => { n.unread = false; }); save(); refresh(); });
      $$('.msg', el).forEach((m) => m.addEventListener('click', (ev) => { const n = S.inbox.find((x) => x.id === m.dataset.id); if (n.unread) { n.unread = false; save(); if (!ev.target.closest('a')) refresh(); } }));
    },
  };
});

/* ===================== Buddy (in-app helper) ===================== */
const Buddy = (() => {
  let open = false, msgs = [], panel = null;
  const ctxExam = () => (CUR.view && CUR.view.buddy && CUR.view.buddy.examId) || null;
  const chipsFor = () => ctxExam()
    ? [`Why is Q${(S.details[ctxExam()].questions.find((q) => q.got < q.max) || { q: 1 }).q} wrong?`, 'How do I upload?', 'Where are my stars?', 'Give me practice']
    : ['Where are my stars?', 'How do I upload?', 'Show me my results', 'How do I play games?'];
  function greet() {
    const e = ctxExam() && exam(ctxExam());
    msgs.push({ me: false, html: e ? esc(t('Hi {n}! I can see you’re on your', { n: S.student.name })) + ` <b>${esc(t(e.title))}</b>. ` + esc(t('What do you want to know?')) : esc(t('Hi {n}! What can I help you with?', { n: S.student.name })), chips: chipsFor() });
  }
  function highlight(nav) {
    setTimeout(() => { const a = $(`.side [data-nav="${nav}"]`); if (a) { a.classList.add('pulse'); setTimeout(() => a.classList.remove('pulse'), 4000); } }, 50);
  }
  function answer(q) {
    const s = q.toLowerCase();
    const newest = graded().filter((x) => S.details[x.id]).sort((a, b) => dnum(b.checked) - dnum(a.checked))[0];
    const examId = ctxExam() || (newest && newest.id);
    const d = S.details[examId];
    const qn = (s.match(/q\s?(\d+)/) || [])[1];
    if (/change|better grade|ändern|note ändern/.test(s) && /grade|note|mark/.test(s)) return [{ html: esc(t('I can’t change grades. Only your teacher can. If you think something is wrong, send your teacher a message.')) }];
    if (/star|point|reward|stern|punkt|belohn/.test(s)) { highlight('rewards'); return [{ html: t('They’re in <b>Rewards</b>. Look on the left side-bar!') }, { html: t('You have <b>{n} points!</b>', { n: S.student.points }), actions: [['go:/student/rewards', 'trophy', 'Open Rewards']] }]; }
    if ((qn || /why.*wrong|warum|falsch/.test(s)) && !d) return [{ html: esc(t('You have no checked results yet. Your teacher is still checking.')) }];
    if (qn || /why.*wrong|warum|falsch/.test(s)) {
      const qq = d.questions.find((x) => String(x.q) === qn) || d.questions.find((x) => x.got < x.max);
      if (!qq) return [{ html: esc(t('You got every question right on this test!')) }];
      if (qq.got === qq.max) return [{ html: esc(t('Q{n} was right! You got {a} of {b} marks.', { n: qq.q, a: qq.got, b: qq.max })) }];
      const text = qq.explain || `${t('Your answer:')} ${esc(qq.your)}. ${t('Right answer:')} ${esc(qq.right)}.`;
      const g = S.games.find((x) => x.id === d.next.game);
      return [{ html: text, actions: [[`showq:${examId}:${qq.q}`, 'eye', `Show me Q${qq.q}`], [`speak:${text}`, 'speaker', '']] }, ...(g ? [{ game: g.id }] : [])];
    }
    if (/upload|send|photo|scan|hochlad|foto/.test(s)) return [{ html: t('Press <b>Upload my exam</b> on Home. Then: 1. choose the exam, 2. take a photo of each page, 3. check and send.'), actions: [['go:/student/upload', 'upload', 'Upload my exam']] }];
    if (/practi|übung|üben|exercise/.test(s)) { const g = S.games.find((x) => d && x.id === d.next.game) || S.games.find((x) => x.picked) || S.games[0]; return [{ html: esc(t('This game was picked by your teacher for you:')) }, { game: g.id }]; }
    if (/game|play|spiel/.test(s)) { highlight('games'); return [{ html: t('Open <b>Games</b> on the left side-bar, pick a game and press <b>Play</b>. Every game you finish gives you points!'), actions: [['go:/student/games', 'game', 'Open Games']] }]; }
    if (/result|grade|score|ergebnis|note/.test(s)) {
      const last = graded().sort((a, b) => dnum(b.checked) - dnum(a.checked))[0];
      highlight('results');
      return [{ html: t('Your newest result is <b>{x}</b>: {p}%.', { x: esc(examName(last)), p: last.score }), actions: [['go:/student/results', 'star', 'Show me my results'], [`go:/student/result/${last.id}`, 'eye', 'Open it']] }];
    }
    if (/progress|improv|fortschritt|better/.test(s)) { highlight('progress'); const hm = S.history.math, dm = hm.length > 1 ? hm[hm.length - 1].v - hm[hm.length - 2].v : 0; return [{ html: esc(t(dm >= 0 ? 'Math went up {n}% on your last test. Keep practising comparing fractions!' : 'Math went down {n}% on your last test. Keep practising comparing fractions!', { n: Math.abs(dm) })), actions: [['go:/student/progress', 'trend', 'My Progress']] }]; }
    if (/^(hi|hello|hey|hallo)\b/.test(s)) return [{ html: esc(t('Hi {n}! What can I help you with?', { n: S.student.name })) }];
    return [{ html: esc(t('I can help with the app and your checked results. Try one of these:')), chips: chipsFor() }];
  }
  function ask(q) {
    msgs.push({ me: true, html: esc(t(q)) });
    const reps = answer(q);
    reps.forEach((r) => msgs.push({ me: false, ...r }));
    if (!reps.some((r) => r.chips)) msgs[msgs.length - 1].chipsAfter = chipsFor().filter((c) => c !== q).slice(0, 3);
    draw();
  }
  function msgHTML(m, i) {
    if (m.game) { const g = S.games.find((x) => x.id === m.game); return `<div class="b-game">${gameArt(g.id, 44)}<span class="grow"><b>${esc(g.title)}</b> · ${g.mins} min · ${esc(t('from {tc}’s list', { tc: subj(g.subject).teacher }))}</span><button type="button" class="btn primary sm" data-bact="go:/student/play/${g.id}">${esc(t('Play'))}</button></div>`; }
    const acts = (m.actions || []).map(([a, ic, l]) => `<button type="button" class="btn sm" data-bact="${esc(a)}" ${!l ? `aria-label="${esc(t('Read aloud'))}"` : ''}>${icon(ic, 16)}${l ? ' ' + esc(t(l)) : ''}</button>`).join('');
    const ch = (m.chips || m.chipsAfter || []).map((c) => `<button type="button" class="b-chip" data-bask="${esc(c)}">${esc(t(c))}</button>`).join('');
    return `<div class="b-msg ${m.me ? 'me' : ''}">${m.html}${acts ? `<div class="row gap wrap b-acts">${acts}</div>` : ''}</div>${ch && i === msgs.length - 1 ? `<div class="b-chips">${ch}</div>` : ''}`;
  }
  function draw() {
    if (!panel) return;
    const log = $('.b-log', panel);
    log.innerHTML = msgs.map(msgHTML).join('') + `<p class="b-note">${icon('help', 14)} ${esc(t('Buddy uses your teacher-checked results. Buddy can’t change grades.'))}</p>`;
    log.scrollTop = log.scrollHeight;
  }
  function mountPanel() {
    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.className = 'buddy-wrap';
    panel.innerHTML = `<div class="buddy-back" data-bclose></div><aside class="buddy" role="dialog" aria-label="Buddy">
      <header><span class="b-av">${icon('chat', 22)}</span><div><strong>Buddy</strong><span class="muted small block">${esc(t('Helps with the app and your results'))}</span></div><button type="button" class="icon-btn" data-bclose aria-label="${esc(t('Close'))}">${icon('x', 22)}</button></header>
      <div class="b-log" aria-live="polite"></div>
      <form class="b-input"><input type="text" placeholder="${esc(t('Ask Buddy…'))}" aria-label="${esc(t('Ask Buddy…'))}"><button class="send" type="submit" aria-label="${esc(t('Send'))}">${icon('send', 18)}</button></form></aside>`;
    document.body.appendChild(panel);
    panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-bclose]')) return close();
      const ask_ = e.target.closest('[data-bask]'); if (ask_) return ask(ask_.dataset.bask);
      const act = e.target.closest('[data-bact]');
      if (act) {
        const [k, ...rest] = act.dataset.bact.split(':'); const v = rest.join(':');
        if (k === 'go') { close(); go(v); }
        if (k === 'speak') speak(v);
        if (k === 'showq') { const [id, q] = v.split(':'); OPENQ = +q; close(); go('/student/result/' + id); refresh(); }
      }
    });
    $('form', panel).addEventListener('submit', (e) => { e.preventDefault(); const i = $('input', panel); if (i.value.trim()) { ask(i.value.trim()); i.value = ''; } });
    draw();
    setTimeout(() => $('input', panel).focus(), 30);
  }
  function openB(o = {}) {
    open = true;
    if (!msgs.length || o.fresh) { msgs = []; greet(); }
    mountPanel();
    if (o.ask) ask(o.ask);
  }
  function close() { open = false; if (panel) { panel.remove(); panel = null; } }
  return { open: openB, close, isOpen: () => open, mountPanel: () => { if (open && !panel) mountPanel(); }, reset: () => { msgs = []; close(); } };
})();
