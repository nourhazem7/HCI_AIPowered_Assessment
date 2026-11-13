'use strict';
/* ===================== Parent views ===================== */
let PCH = store.get('gb.child') || 's1';
function child() {
  if (PCH === 'k2') {
    const a = S.parent.adam;
    return { id: 'k2', name: 'Adam', exams: a.exams, history: a.history, strong: a.strong, needs: a.needs, mistakes: a.mistakes, details: {}, teacherOf: (e) => e.teacher };
  }
  return {
    id: 's1', name: 'Younis', exams: S.exams.map((e) => ({ ...e, teacher: subj(e.subject).teacher })), history: S.history,
    strong: ['multiplication', 'reading'], needs: ['comparing fractions', 'German spelling'], mistakes: S.mistakes, details: S.details, teacherOf: (e) => subj(e.subject).teacher,
  };
}
function childTabs() {
  return `<div class="child-tabs" role="tablist">${S.parent.children.map((c) => `<button type="button" role="tab" data-child="${c.id}" aria-selected="${PCH === c.id}">${PCH === c.id ? avatarSVG(c.id === 's1' ? S.student.avatar : { face: 1, hair: 0, clothes: 1, hats: 2, background: 0 }, 26) : `<span class="dot-av"></span>`} ${esc(c.name)} · <b>${esc(t(c.grade))}</b></button>`).join('')}</div>`;
}
function tIni(n) { return n === 'Ms. Mona' ? 'MA' : n.split(' ').pop().slice(0, 2).toUpperCase(); }
function bindChild(el) { $$('[data-child]', el).forEach((b) => b.addEventListener('click', () => { PCH = b.dataset.child; store.set('gb.child', PCH); refresh(); })); }
function parentMessageTeacher(teacher, text) {
  const T = S.teacher;
  if (teacher === T.name) {
    let c = T.conversations.find((x) => x.kind === 'parent' && x.title === S.parent.name);
    if (!c) { c = { id: 'c' + Date.now(), title: S.parent.name, sub: '(parent)', kind: 'parent', to: ['s1'], thread: [], unread: 0, preview: '' }; T.conversations.unshift(c); }
    c.thread.push({ me: false, text, time: 'now' }); c.unread = (c.unread || 0) + 1; c.preview = text.slice(0, 30) + '…';
    T.notifs.unshift({ id: 't' + Date.now(), text: `${S.parent.name} sent you a message`, unread: true, href: '/teacher/messages/' + c.id });
  }
  save();
}

/* ---------- Overview ---------- */
route('/parent/overview', 'parent', () => {
  const c = child();
  const done = c.exams.filter((e) => e.status === 'graded').sort((a, b) => dnum(b.checked) - dnum(a.checked));
  const latest = (sid) => { const h = c.history[sid]; return h && h.length ? h[h.length - 1].v : null; };
  const alerts = S.parent.alerts.filter((a) => a.child === c.id);
  const fb = S.parent.notes.filter((n) => n.child === c.id && n.type === 'Feedback')[0] || S.parent.notes.filter((n) => n.child === c.id)[0];
  return {
    title: 'Overview', nav: 'overview',
    html: `${introCard('parent')}${childTabs()}${pageHead(t('{n} at a glance', { n: c.name }), { desc: t('Grades, subjects and what to practise, checked by the teachers.') })}
      ${alerts.map((a) => `<section class="card flag-card row gap center wrap">${icon("flag", 20)}<span class="grow"><b>${esc(t(a.title))}</b><span class="block">${esc(t(a.text))}</span></span><a class="btn sm" href="#/parent/progress">${esc(t('See details'))}</a></section>`).join('')}
      <div class="grid-3">
        <section class="card"><h2>${icon('doc', 20)} ${esc(t('Recent grades'))}</h2>${done.slice(0, 3).map((e) => `<a class="row between center line plain" href="#/parent/exams/${e.id}"><span>${esc(t(subj(e.subject).name))} · ${esc(t(e.title))}</span><b>${e.score}% ${e.change > 0 ? icon('arrowUp', 14) : e.change < 0 ? icon('arrowDown', 14) : ''}</b></a>`).join('')}</section>
        <section class="card"><h2>${icon('chart', 20)} ${esc(t('By subject'))}</h2>${S.subjects.map((s) => `<div class="subj-bar static"><span>${esc(t(s.name))}</span>${bar(latest(s.id) || 0)}<span>${latest(s.id) != null ? latest(s.id) + '%' : '–'}</span></div>`).join('')}</section>
        <section class="card"><h2>${icon('target', 20)} ${esc(t('Strong / Needs practice'))}</h2><p><b>${esc(t('Strong:'))}</b> ${c.strong.map((x) => esc(t(x))).join(', ')}</p><p><b>${esc(t('Needs practice:'))}</b> ${c.needs.map((x) => esc(t(x))).join(', ')}</p></section>
      </div>
      ${fb ? `<section class="card"><h2>${icon('chat', 20)} ${esc(t('Latest teacher feedback'))}</h2><div class="row gap top-start">${initials(tIni(fb.teacher))}<div><b>${esc(fb.teacher)} · ${esc(t(subj(fb.subject).name))} · ${esc(td(fb.date))}</b><p>“${esc(t(fb.text))}”</p><a class="link" href="#/parent/notes">${esc(t('All notes'))} ${icon('arrowR', 14)}</a></div></div></section>` : ''}`,
    mount: bindChild,
  };
});

/* ---------- Exams ---------- */
let PX = { tab: 'upcoming' };
route('/parent/exams', 'parent', () => parentExams());
route('/parent/exams/:id', 'parent', ({ id }) => { PX.sel = id; const e = child().exams.find((x) => x.id === id); if (e) PX.tab = e.status === 'upcoming' ? 'upcoming' : 'completed'; return parentExams(); });
function parentExams() {
  const c = child();
  const up = c.exams.filter((e) => e.status === 'upcoming').sort((a, b) => a.days - b.days);
  const done = c.exams.filter((e) => e.status === 'graded').sort((a, b) => dnum(b.checked) - dnum(a.checked));
  const list = PX.tab === 'upcoming' ? up : done;
  let sel = list.find((e) => e.id === PX.sel) || list[0];
  const d = sel && c.details[sel.id];
  let detail = '';
  if (sel && PX.tab === 'upcoming') {
    detail = `<h2>${esc(t(subj(sel.subject).name))} · ${esc(t(sel.title))}</h2><p class="muted">${icon('calendar', 15)} ${esc(td(sel.date))} · ${esc(t('in class'))} · ${esc(sel.teacher)}</p><p><b>${esc(t('Topics:'))}</b> ${esc(t(sel.topics))}</p>
      <div class="card sub"><h3>${esc(t('How to prepare at home'))}</h3><ul>${sel.prep.map((p) => `<li>${esc(t(p))}</li>`).join('')}</ul></div>
      <div class="row gap wrap"><button type="button" class="btn" data-cal>${icon('calendar', 16)} ${esc(t('Add to my calendar'))}</button><button type="button" class="btn ghost" data-ask>${icon('chat', 16)} ${esc(t('Ask the teacher'))}</button></div>`;
  } else if (sel) {
    const marks = d ? `${d.got} ${t('of')} ${d.total} ${t('marks')}` : '';
    detail = `<div class="row between center"><h2>${esc(t(subj(sel.subject).name))} · ${esc(t(sel.title))}</h2><span class="chip good">${icon('check', 14)} ${esc(t('Teacher confirmed'))}</span></div>
      <div class="row gap center"><span class="big">${sel.score}%</span>${starsFor(sel.score)}<span><span class="block">${esc(marks)}</span><span class="muted small">${sel.change ? (sel.change > 0 ? icon('arrowUp', 13) : icon('arrowDown', 13)) + ' ' + esc(t('{n}% from last {s} test', { n: Math.abs(sel.change), s: t(subj(sel.subject).name) })) : ''}</span></span></div>
      <div class="card sub"><h3>${esc(t('Teacher feedback'))}</h3><p>${esc(t(d ? d.teacherSays : sel.feedback))}</p></div>
      <div class="card sub"><h3>${esc(t('Areas to improve'))}</h3><p>${esc(t(d ? d.improveParent : sel.improve))}</p></div>`;
  }
  const nxt = up[0];
  return {
    title: 'Exams', nav: 'exams',
    html: `${childTabs()}${crumbNav([['/parent/overview', t('Overview')], [null, t('Exams')]])}<div class="row between wrap head-row"><div><h1 class="page inline">${esc(t('{n}’s exams', { n: c.name }))}</h1><p class="page-desc">${esc(t('Upcoming exams, and grades the teacher has published.'))}</p></div><div class="tabs pill-tabs">${[['upcoming', `${t('Upcoming')} (${up.length})`], ['completed', t('Completed')]].map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${PX.tab === k}">${esc(l)}</button>`).join('')}</div></div>
      <div class="cols-1-1 start">
        <section class="card list-card">${list.map((e) => `<button type="button" class="ex-row ${sel && sel.id === e.id ? 'cur' : ''}" data-sel="${e.id}">${subjIcon(e.subject)}<span class="grow"><b>${esc(t(subj(e.subject).name))} · ${esc(t(e.title))}</b><span class="block small muted">${esc(td(PX.tab === 'upcoming' ? e.date : e.checked))}</span></span>${PX.tab === 'upcoming' ? `<span class="chip">${icon('calendar', 14)}${esc(t('in {n} days', { n: e.days }))}</span>` : `<span class="row gap center">${starsFor(e.score)}<b>${e.score}%</b></span>`}</button>`).join('') || `<div class="pad empty"><p class="muted">${esc(t(PX.tab === 'upcoming' ? 'No upcoming exams.' : 'No grades yet. They appear here once the teacher publishes them.'))}</p><button type="button" class="btn" data-tab="${PX.tab === 'upcoming' ? 'completed' : 'upcoming'}">${esc(t(PX.tab === 'upcoming' ? 'See completed exams' : 'See upcoming exams'))}</button></div>`}</section>
        <section class="card detail">${detail || `<p class="muted">${esc(t('Pick an exam to see details.'))}</p>`}</section>
      </div>
      ${PX.tab === 'completed' && nxt ? `<section class="card row gap center wrap">${icon('calendar', 18)}<span class="grow"><b>${esc(t('Next:'))}</b> ${esc(t(subj(nxt.subject).name))} ${esc(t('exam'))} · ${esc(td(nxt.date))} · ${esc(t('Topics:'))} ${esc(t(nxt.topics))}</span><button type="button" class="btn ghost sm" data-cal="${nxt.id}">${esc(t('Add to calendar'))}</button></section>` : ''}`,
    mount(el) {
      bindChild(el);
      $$('[data-tab]', el).forEach((b) => b.addEventListener('click', () => { PX.tab = b.dataset.tab; PX.sel = null; if (location.hash !== '#/parent/exams') go('/parent/exams'); else refresh(); }));
      $$('[data-sel]', el).forEach((b) => b.addEventListener('click', () => { PX.sel = b.dataset.sel; refresh(); }));
      $$('[data-cal]', el).forEach((b) => b.addEventListener('click', () => { const e = c.exams.find((x) => x.id === (b.dataset.cal || sel.id)); downloadICS(`${c.name}: ${t(subj(e.subject).name)} · ${t(e.title)}`, e.iso, `Topics: ${e.topics}`); }));
      const a = $('[data-ask]', el);
      a && a.addEventListener('click', () => modal({ title: esc(t('Ask {tc}', { tc: sel.teacher })), body: `<p class="muted">${esc(t(subj(sel.subject).name))} · ${esc(t(sel.title))} · ${esc(td(sel.date))}</p><textarea rows="4" id="askq" placeholder="${esc(t('Write your question…'))}"></textarea>`,
        actions: [{ label: esc(t('Cancel')) }, { label: esc(t('Send')), primary: true, onClick: (m) => { const v = $('#askq', m).value.trim(); if (!v) { toast(esc(t('Write a message first.'))); return false; } parentMessageTeacher(sel.teacher === 'Ms. Nada' || sel.teacher === 'Ms. Mona' ? 'Ms. Mona' : sel.teacher, v); toast(esc(t('Sent to {tc}.', { tc: sel.teacher }))); } }] }));
    },
  };
}
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/parent/exams')) PX = { tab: 'upcoming' }; });

/* ---------- Progress ---------- */
let PPF = 'math';
route('/parent/progress', 'parent', () => {
  const c = child();
  const all = PPF === 'all';
  const h = all ? Object.entries(c.history).flatMap(([k, a]) => a.map((p) => ({ ...p, color: SUBJ_COLORS[k] }))).sort((a, b) => dnum(a.date) - dnum(b.date)) : (c.history[PPF] || []);
  const diff = h.length > 1 ? h[h.length - 1].v - h[0].v : 0;
  const mist = c.mistakes.filter((m) => all || m.subject === PPF);
  const gapConfirmed = c.id === 's1' && (S.teacher.gaps.s1 || []).some((g) => g.status === 'confirmed');
  const needs = c.id === 's1' ? (all ? Object.values(S.practise).flat() : S.practise[PPF]) : c.needs;
  const good = c.id === 's1' ? (all ? Object.values(S.strengths).flat() : S.strengths[PPF]) : c.strong;
  return {
    title: 'Progress', nav: 'progress',
    html: `${childTabs()}${crumbNav([['/parent/overview', t('Overview')], [null, t('Progress')]])}<div class="row between wrap head-row"><div><h1 class="page inline">${esc(t('{n}’s progress', { n: c.name }))}</h1><p class="page-desc">${esc(t('How the scores change over the term, and how you can help at home.'))}</p></div>${chips(SUBJECT_FILTER(), PPF)}</div>
      <div class="cols-3-2">
        <section class="card"><h2>${icon('trend', 20)} ${esc(all ? t('All subjects over the term') : t('{s} over the term', { s: t(subj(PPF).name) }))}</h2>${h.length ? lineChart(h, { xKey: 'date', noLine: all, label: t('Scores over the term') }) : `<p class="muted">${esc(t('No exams yet.'))}</p>`}
          ${all ? `<div class="legend">${S.subjects.map((s) => `<span><i style="background:${SUBJ_COLORS[s.id]}"></i>${esc(t(s.name))}</span>`).join('')}</div>` : ''}
          ${h.length > 1 ? `<p>${diff >= 0 ? esc(t('Getting better overall:')) : esc(t('A little lower overall:'))} <b>${diff >= 0 ? '+' : ''}${diff}%</b> ${esc(t('since September.'))}</p>` : ''}</section>
        <div class="stack">
          <section class="card"><h3>${esc(t('Doing well in'))}</h3><p>${(good || []).map((x) => esc(t(x))).join(' · ') || '–'}</p></section>
          <section class="card note"><h3>${esc(t('Needs practice'))}</h3><p>${(needs || []).map((x) => esc(t(x))).join(', ') || '–'}</p>${gapConfirmed && (all || PPF === 'math') ? `<p class="small">${icon('check', 13)} ${esc(t('Confirmed by {tc}', { tc: 'Ms. Mona' }))}</p>` : ''}</section>
        </div>
      </div>
      <section class="card"><h2>${icon('refresh', 18)} ${esc(t('Mistakes that keep coming back'))}</h2>${mist.map((m, i) => `<div class="row between center line"><span><b>${m.times}×</b> ${esc(t(m.parentText))}</span><button type="button" class="btn sm" data-help="${i}">${esc(t('How can I help?'))}</button></div>`).join('') || `<p class="muted">${esc(t('No repeated mistakes in this subject.'))}</p>`}</section>`,
    mount(el) {
      bindChild(el);
      $$('[data-f]', el).forEach((b) => b.addEventListener('click', () => { PPF = b.dataset.f; refresh(); }));
      $$('[data-help]', el).forEach((b) => b.addEventListener('click', () => {
        const m = mist[+b.dataset.help];
        modal({ title: esc(t('How you can help at home')), body: `<p class="muted">${esc(t(m.parentText))}</p><ol>${m.help.map((x) => `<li>${esc(t(x))}</li>`).join('')}</ol>`, actions: [{ label: esc(t('Got it')), primary: true }] });
      }));
    },
  };
});

/* ---------- Notes & posts ---------- */
let PN = { f: 'all', reply: null };
route('/parent/notes', 'parent', () => {
  const c = child();
  const notes = S.parent.notes.filter((n) => n.child === c.id);
  const subs = [...new Set(notes.map((n) => n.subject))];
  const shown = notes.filter((n) => PN.f === 'all' || n.subject === PN.f);
  const posts = S.teacher.posts.filter((p) => p.audience !== 'Only students');
  return {
    title: 'Notes & posts', nav: 'notes',
    html: `${childTabs()}${crumbNav([['/parent/overview', t('Overview')], [null, t('Notes & posts')]])}<div class="cols-3-2 start">
      <div><div class="row between wrap head-row"><div><h1 class="page inline">${esc(t('Teacher notes'))}</h1><p class="page-desc">${esc(t('Notes about your child, and news from the class.'))}</p></div>${chips([['all', 'All subjects'], ...subs.map((s) => [s, subj(s).name])], PN.f)}</div>
        ${shown.map((n) => `<section class="card ${n.type === 'Feedback' ? '' : 'soft'}"><div class="row between top-start"><div class="row gap center">${initials(tIni(n.teacher))}<div><b>${esc(n.teacher)} · ${esc(t(subj(n.subject).name))}</b><span class="block small muted">${esc(td(n.date))}${n.exam ? ' · ' + esc(n.exam) : ''}</span></div></div><span class="chip">${esc(t(n.type))}</span></div>
          <p>“${esc(t(n.text))}”</p>${n.improve ? `<p><b>${esc(t('Area to improve:'))}</b> ${esc(t(n.improve))}</p>` : ''}
          ${n.replies.map((r) => `<p class="reply">${icon('arrowR', 13)} <b>${esc(t('You'))}:</b> ${esc(r)}</p>`).join('')}${n.meeting ? `<p class="small">${icon('calendar', 13)} ${esc(t('Meeting requested:'))} ${esc(td(n.meeting))}</p>` : ''}
          ${PN.reply === n.id ? `<form class="stack" data-rform="${n.id}"><textarea rows="3" placeholder="${esc(t('Write your reply…'))}" aria-label="${esc(t('Write your reply…'))}"></textarea><div class="row gap"><button class="btn primary sm">${esc(t('Send'))}</button><button type="button" class="btn sm" data-rcancel>${esc(t('Cancel'))}</button></div></form>`
            : `<div class="row gap"><button type="button" class="btn sm" data-reply="${n.id}">${icon('chat', 15)} ${esc(t('Reply'))}</button>${n.type === 'Feedback' ? `<button type="button" class="btn ghost sm" data-meet="${n.id}">${icon('calendar', 15)} ${esc(t('Request a meeting'))}</button>` : ''}</div>`}</section>`).join('') || `<p class="muted">${esc(t('No notes yet.'))}</p>`}</div>
      <div><h2 class="page-h2">${icon('image', 20)} ${esc(t('Class posts'))}</h2>
        ${posts.map((p) => p.star && !p.photo ? `<section class="card star-card row gap center">${icon('trophy', 22)}<span class="grow"><b>${esc(t('Star of the Week'))}: ${esc(p.star)}!</b><span class="block small muted">${esc(t('Week of {d}', { d: td(p.week || S.star.week) }))} · ${esc(t(S.star.reason))}</span></span></section>` : `<section class="card post"><div class="row gap center">${initials('MA')}<b>${esc(p.author)}</b><span class="muted small">· ${esc(t(p.when))}${p.date ? ', ' + esc(td(p.date)) : ''}</span></div><p>${esc(t(p.text))}</p>
          ${p.photo === 'garden' ? `<div class="post-img">${gardenSVG()}</div>` : p.photo ? `<div class="post-img"><img src="${esc(p.photo)}" alt=""></div>` : ''}
          <div class="row gap center small"><button type="button" class="link ${p.liked ? 'on' : ''}" data-like="${p.id}" aria-pressed="${!!p.liked}">${icon('heart', 15)} ${esc(t('Like'))} (${p.likes})</button><span>·</span><button type="button" class="link" data-pc="${p.id}">${icon('chat', 15)} ${esc(t('Comment'))} (${p.comments.length})</button></div>
          ${PN.post === p.id ? `<div class="comments">${p.comments.map((x) => `<p><b>${esc(x.who)}</b> ${esc(x.text)}</p>`).join('')}<form class="row gap" data-cform="${p.id}"><input class="input" placeholder="${esc(t('Write a comment…'))}" aria-label="${esc(t('Write a comment…'))}"><button class="btn sm">${esc(t('Send'))}</button></form></div>` : ''}</section>`).join('')}
        ${!posts.some((p) => p.star && !p.photo) ? `<section class="card star-card row gap center">${icon('trophy', 22)}<span class="grow"><b>${esc(t('Star of the Week'))}: ${esc(S.star.name)}!</b><span class="block small muted">${esc(t('Week of {d}', { d: td(S.star.week) }))} · ${esc(t(S.star.reason))}</span></span></section>` : ''}
      </div></div>`,
    mount(el) {
      bindChild(el);
      const on = (sel, fn) => $$(sel, el).forEach((b) => b.addEventListener('click', fn));
      $$('[data-f]', el).forEach((b) => b.addEventListener('click', () => { PN.f = b.dataset.f; refresh(); }));
      on('[data-reply]', (e) => { PN.reply = e.currentTarget.dataset.reply; refresh(); setTimeout(() => { const ta = $('[data-rform] textarea'); ta && ta.focus(); }, 0); });
      on('[data-rcancel]', () => { PN.reply = null; refresh(); });
      $$('[data-rform]', el).forEach((f) => f.addEventListener('submit', (e) => {
        e.preventDefault(); const v = $('textarea', f).value.trim(); if (!v) return toast(esc(t('Write a message first.')));
        const n = S.parent.notes.find((x) => x.id === f.dataset.rform); n.replies.push(v); parentMessageTeacher(n.teacher, v); PN.reply = null; toast(esc(t('Sent to {tc}.', { tc: n.teacher }))); refresh();
      }));
      on('[data-meet]', (e) => {
        const n = S.parent.notes.find((x) => x.id === e.currentTarget.dataset.meet);
        const slots = ['Tue 14 Oct · 15:00', 'Wed 15 Oct · 14:30', 'Thu 16 Oct · 15:30'];
        modal({ title: esc(t('Request a meeting with {tc}', { tc: n.teacher })), body: `<p class="muted">${esc(t('Pick a time that suits you. The teacher will confirm.'))}</p><div class="radio-list">${slots.map((s, i) => `<label class="radio-card"><input type="radio" name="slot" value="${esc(s)}" ${i === 0 ? 'checked' : ''}><span>${esc(td(s))}</span></label>`).join('')}</div><label class="field"><span>${esc(t('What would you like to talk about? (optional)'))}</span><textarea rows="2" id="mt"></textarea></label>`,
          actions: [{ label: esc(t('Cancel')) }, { label: esc(t('Send request')), primary: true, onClick: (m) => { n.meeting = $('input[name=slot]:checked', m).value; parentMessageTeacher(n.teacher, `Meeting request: ${n.meeting}. ${$('#mt', m).value}`); toast(esc(t('Meeting request sent.'))); refresh(); } }] });
      });
      on('[data-like]', (e) => { const p = S.teacher.posts.find((x) => x.id === e.currentTarget.dataset.like); p.liked = !p.liked; p.likes += p.liked ? 1 : -1; save(); refresh(); });
      on('[data-pc]', (e) => { const id = e.currentTarget.dataset.pc; PN.post = PN.post === id ? null : id; refresh(); });
      $$('[data-cform]', el).forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); const v = $('input', f).value.trim(); if (!v) return; S.teacher.posts.find((x) => x.id === f.dataset.cform).comments.push({ who: S.parent.name, text: v }); save(); refresh(); }));
    },
  };
});
