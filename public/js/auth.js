'use strict';
/* Sign-in: State A (who are you?), State B (student), State C (teacher / parent) */
function langSwitch() {
  return `<div class="lang" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="${SET.lang === 'en'}">EN</button><span aria-hidden="true">|</span><button type="button" data-lang="de" aria-pressed="${SET.lang === 'de'}">DE</button></div>`;
}
function bindLang(el) { $$('[data-lang]', el).forEach((b) => b.addEventListener('click', () => { SET.lang = b.dataset.lang; saveSettings(); refresh(); })); }

route('/', null, () => ({
  title: 'Sign in',
  html: `<div class="auth"><div class="auth-card">
    <div class="auth-top"><span class="brand"><span class="logo">${icon('check', 18)}</span><span class="brand-name">GradeBuddy</span></span>${langSwitch()}</div>
    <h1 class="auth-q">${esc(t('Who is using GradeBuddy?'))}</h1>
    <div class="who-list">
      ${[['student', 'smile', 'I’m a student', 'Send exams, see results, play games'], ['teacher', 'book', 'I’m a teacher', 'Check AI grades and help your class'], ['parent', 'users', 'I’m a parent', 'Follow your child’s progress']].map(([r, ic, l, d]) =>
        `<a class="who" href="#/signin/${r}"><span class="who-ic">${icon(ic, 26)}</span><span><strong>${esc(t(l))}</strong><span class="muted">${esc(t(d))}</span></span>${icon('right', 20)}</a>`).join('')}
    </div>
  </div></div>`,
  mount: bindLang,
}));

route('/signin/:role', null, ({ role }) => {
  if (!ROLE[role]) return go('/');
  const email = { student: S.student.email, teacher: S.teacher.email, parent: S.parent.email }[role];
  const title = { student: 'Student sign in', teacher: 'Teacher sign-in', parent: 'Parent sign-in' }[role];
  return {
    title,
    html: `<div class="auth"><form class="auth-card" novalidate>
      <div class="auth-top"><a class="btn ghost sm" href="#/">${icon('arrowL', 16)}${esc(t('Back'))}</a>${langSwitch()}</div>
      <h1>${esc(t(title))}</h1>
      <label class="field"><span>${esc(t('School email'))}</span><input type="email" name="email" value="${esc(email)}" autocomplete="username" required></label>
      <label class="field"><span>${esc(t('Password'))}</span>
        <span class="pw"><input type="password" name="pw" value="gradebuddy" autocomplete="current-password" required><button type="button" class="icon-btn" data-eye aria-label="${esc(t('Show password'))}">${icon('eye', 20)}</button></span>
      </label>
      <p class="err" role="alert" hidden></p>
      <div class="row between"><label class="check"><input type="checkbox" name="keep"> ${esc(t('Keep me signed in'))}</label><button type="button" class="link" data-forgot>${esc(t('Forgot password?'))}</button></div>
      <button class="btn primary block lg" type="submit">${esc(t('Sign in'))}</button>
      ${role !== 'student' ? `<p class="muted small">${esc(t('Parents sign in with the email the school invited.'))}</p>` : ''}
    </form></div>`,
    mount(el) {
      bindLang(el);
      const f = $('form', el), err = $('.err', el);
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
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const em = f.email.value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { err.textContent = t('Please enter a valid email address.'); err.hidden = false; f.email.focus(); return; }
        if (!f.pw.value) { err.textContent = t('Please enter your password.'); err.hidden = false; f.pw.focus(); return; }
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
    html: `<h1 class="page">${esc(t('Settings'))}</h1>${settingsCard()}
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
  $$('[data-set-lang]', el).forEach((b) => b.addEventListener('click', () => { SET.lang = b.dataset.setLang; saveSettings(); refresh(); }));
  $$('[data-size]', el).forEach((b) => b.addEventListener('click', () => { SET.size = b.dataset.size; saveSettings(); refresh(); }));
  $$('[data-sound]', el).forEach((b) => b.addEventListener('click', () => { SET.sounds = b.dataset.sound === '1'; saveSettings(); if (SET.sounds) beep(); refresh(); }));
  const r = $('[data-reset]', el);
  r && r.addEventListener('click', () => modal({
    title: esc(t('Reset demo data?')), body: `<p>${esc(t('Everything goes back to the start: grades, messages, points and settings. You will be signed out.'))}</p>`,
    actions: [{ label: esc(t('Cancel')) }, { label: esc(t('Reset')), primary: true, onClick: resetDemo }],
  }));
}
route('/teacher/settings', 'teacher', () => settingsView('teacher'));
route('/parent/settings', 'parent', () => settingsView('parent'));
