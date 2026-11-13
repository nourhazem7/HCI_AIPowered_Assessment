'use strict';
/* Sign-in: State A (who are you?), State B (student), State C (teacher / parent) */
function langSwitch() {
  return `<div class="lang" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="${SET.lang === 'en'}">EN</button><span aria-hidden="true">|</span><button type="button" data-lang="de" aria-pressed="${SET.lang === 'de'}">DE</button></div>`;
}
function bindLang(el) { $$('[data-lang]', el).forEach((b) => b.addEventListener('click', () => { SET.lang = b.dataset.lang; saveSettings(); refresh(); })); }

/* Split screen (wireframe p.16): green panel with tagline + drawing on the left, choose role -> sign-in form on the right */
const PAPER_SVG = `<svg class="signin-paper" viewBox="0 0 260 300" aria-hidden="true" focusable="false">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M28 14h204a6 6 0 0 1 6 6v262a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z" fill="#fff" stroke="#2b3a67" stroke-width="2"/>
    <path d="M46 44h96" stroke="#2b3a67" stroke-width="3"/><path d="M46 60h58" stroke="#2b3a67" stroke-width="2" opacity=".45"/>
    <path d="M46 112h170M46 172h170M46 232h170" stroke="#c9d6e6" stroke-width="1.5"/>
    <path d="M48 100l3-6M62 104q5-12 10 0t10 0t10 0q4-8 9-2t8 1" stroke="#2b3a67" stroke-width="2.2"/>
    <path d="M48 160l3-6M62 164q6-11 12 0t12 0q5-9 10-1t11 0t9 0" stroke="#2b3a67" stroke-width="2.2"/>
    <path d="M48 220l3-6M62 224q5-10 10 0t10 0t10 0t10 0" stroke="#2b3a67" stroke-width="2.2"/>
    <path d="M182 94l9 10 18-22" stroke="#1f6f5c" stroke-width="3.2"/>
    <path d="M184 160q6-8 12 0t12 0" stroke="#1f6f5c" stroke-width="3"/>
  </g>
</svg>`;
function signinShell(right) {
  return `<div class="signin">
    <section class="signin-art">
      <span class="brand"><span class="logo">${icon('check', 18)}</span><span>GradeBuddy</span></span>
      <div class="signin-art-mid"><p class="tagline">${esc(t('Exams checked by your teacher, explained for you.'))}</p>${PAPER_SVG}</div>
    </section>
    <main class="signin-main" id="main" tabindex="-1">${langSwitch()}<div class="signin-box">${right}</div></main>
  </div>`;
}

route('/', null, () => ({
  title: 'Sign in',
  html: signinShell(`<h1 class="signin-h">${esc(t('Who is using GradeBuddy?'))}</h1>
    <div class="who-list">
      ${[['student', 'smile', 'I’m a student', 'Upload exams, see results, play games'], ['teacher', 'book', 'I’m a teacher', 'Check AI grades and help your class'], ['parent', 'users', 'I’m a parent', 'Follow your child’s progress']].map(([r, ic, l, d]) =>
        `<a class="who" href="#/signin/${r}"><span class="who-ic">${icon(ic, 24)}</span><span><strong>${esc(t(l))}</strong><span class="muted">${esc(t(d))}</span></span>${icon('right', 20)}</a>`).join('')}
    </div>
    <p class="muted small signin-note">${esc(t('Parents sign in with the email the school invited.'))}</p>`),
  mount: bindLang,
}));

route('/signin/:role', null, ({ role }) => {
  if (!ROLE[role]) return go('/');
  const email = { student: S.student.email, teacher: S.teacher.email, parent: S.parent.email }[role];
  const title = { student: 'Student sign in', teacher: 'Teacher sign-in', parent: 'Parent sign-in' }[role];
  return {
    title,
    html: signinShell(`<form novalidate>
      <a class="link back-link" href="#/" data-nav-back>${icon('arrowL', 16)} ${esc(t('Back'))}</a>
      <h1 class="signin-h">${esc(t(title))}</h1>
      <label class="field"><span>${esc(t('School email'))}</span><input type="email" name="email" value="${esc(email)}" autocomplete="username" required></label>
      <label class="field"><span>${esc(t('Password'))}</span>
        <span class="pw"><input type="password" name="pw" value="gradebuddy" autocomplete="current-password" required><button type="button" class="icon-btn" data-eye aria-label="${esc(t('Show password'))}">${icon('eye', 20)}</button></span>
      </label>
      <div class="row between wrap signin-row"><label class="check"><input type="checkbox" name="keep"> ${esc(t('Keep me signed in'))}</label><button type="button" class="link" data-forgot>${esc(t('Forgot password?'))}</button></div>
      <button class="btn primary block lg" type="submit">${esc(t('Sign in'))}</button>
      <p class="muted small signin-note">${esc(t('Demo account: details are filled in for you.'))}</p>
    </form>`),
    mount(el) {
      bindLang(el);
      const f = $('form', el);
      setTimeout(() => f.email.focus(), 0);   // keyboard users can press Enter straight away
      $('[data-eye]', el).addEventListener('click', (e) => {
        const i = f.pw; const show = i.type === 'password'; i.type = show ? 'text' : 'password';
        e.currentTarget.innerHTML = icon(show ? 'eyeOff' : 'eye', 20);
        e.currentTarget.setAttribute('aria-label', t(show ? 'Hide password' : 'Show password'));
      });
      $('[data-forgot]', el).addEventListener('click', () => modal({
        title: esc(t('Forgot password?')),
        body: `<p>${esc(t('We will email a reset link to:'))}</p><label class="field"><span>${esc(t('School email'))}</span><input type="email" id="fp" value="${esc(f.email.value)}"></label>`,
        actions: [{ label: esc(t('Cancel')) }, { label: esc(t('Send link')), primary: true, onClick: (m) => { toast(esc(t('Reset link sent to {e}', { e: $('#fp', m).value }))); } }],
      }));
      // 3.9 errors next to the field: what happened + what to do
      f.email.addEventListener('input', () => fieldError(f.email, ''));
      f.pw.addEventListener('input', () => fieldError(f.pw, ''));
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const em = f.email.value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return fieldError(f.email, t('This email address is not complete. Check it, e.g. name@school.edu.'));
        if (!f.pw.value) return fieldError(f.pw, t('Type your password to sign in.'));
        signIn(role, f.keep.checked);
        go(ROLE[role].home);
      });
    },
  };
});

/* Shared settings page (teacher / parent). Students have their own Help & settings page. */
function settingsView(role) {
  return {
    title: 'Settings', nav: 'settings',
    html: `${pageHead(t('Settings'), { crumbs: [[ROLE[role].home, t(role === 'teacher' ? 'Dashboard' : 'Overview')], [null, t('Settings')]], desc: t('Language, text size and sounds. Changes are saved straight away.') })}${settingsCard()}
      <div class="row gap"><button type="button" class="btn ghost" data-signout>${icon('arrowL', 18)}${esc(t('Sign out'))}</button><button type="button" class="btn ghost" data-reset>${icon('refresh', 18)}${esc(t('Reset demo data'))}</button></div>`,
    mount: bindSettings,
  };
}
function settingsCard() {
  return `<section class="card settings">
    <h2>${icon('pen', 20)} ${esc(t('My settings'))}</h2>
    <div class="set-row"><span>${esc(t('Language'))}</span><div class="seg" role="group"><button type="button" data-set-lang="en" aria-pressed="${SET.lang === 'en'}">English</button><button type="button" data-set-lang="de" aria-pressed="${SET.lang === 'de'}">Deutsch</button></div></div>
    <div class="set-row"><span>${esc(t('Text size'))}</span><div class="sizes" role="group">${['s', 'm', 'l'].map((z) => `<button type="button" class="size size-${z}" data-size="${z}" aria-pressed="${SET.size === z}" aria-label="${esc(t({ s: 'Small text', m: 'Normal text', l: 'Large text' }[z]))}">A</button>`).join('')}</div></div>
    <div class="set-row"><span>${esc(t('Sounds'))}</span><div class="seg" role="group"><button type="button" data-sound="1" aria-pressed="${SET.sounds}">${esc(t('On'))}</button><button type="button" data-sound="0" aria-pressed="${!SET.sounds}">${esc(t('Off'))}</button></div></div>
  </section>`;
}
function bindSettings(el) {
  const saved = () => { saveSettings(); refresh(); toast(esc(t('Settings saved.'))); };
  $$('[data-set-lang]', el).forEach((b) => b.addEventListener('click', () => { SET.lang = b.dataset.setLang; saved(); }));
  $$('[data-size]', el).forEach((b) => b.addEventListener('click', () => { SET.size = b.dataset.size; saved(); }));
  $$('[data-sound]', el).forEach((b) => b.addEventListener('click', () => { SET.sounds = b.dataset.sound === '1'; if (SET.sounds) beep(); saved(); }));
  const r = $('[data-reset]', el);
  r && r.addEventListener('click', () => modal({
    title: esc(t('Reset demo data?')), body: `<p>${esc(t('Everything goes back to the start: grades, messages, points and settings. You will be signed out.'))}</p>`,
    actions: [{ label: esc(t('Cancel')) }, { label: esc(t('Reset')), primary: true, onClick: resetDemo }],
  }));
}
route('/teacher/settings', 'teacher', () => settingsView('teacher'));
route('/parent/settings', 'parent', () => settingsView('parent'));
