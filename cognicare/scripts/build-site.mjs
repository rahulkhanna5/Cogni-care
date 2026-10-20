/**
 * Builds the public web pages Google Play needs: the privacy policy, the terms,
 * and an account deletion page that works without the app. The text comes
 * straight from src/legal/content.ts, so the website can never say something
 * different from the app; the API address comes from eas.json's production
 * profile, the same one the store build uses.
 *
 *   node --experimental-strip-types scripts/build-site.mjs <out-dir>
 *
 * Published to GitHub Pages by .github/workflows/site.yml.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ?? join(root, 'site-dist');
const { TERMS, PRIVACY, LEGAL_UPDATED } = await import(join(root, 'src/legal/content.ts'));

const eas = JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8'));
const API = eas.build.production.env.EXPO_PUBLIC_API_URL;
if (!API) throw new Error('eas.json has no production EXPO_PUBLIC_API_URL');
// Optional: shown on the deletion page for people who cannot sign in.
const CONTACT = process.env.SITE_CONTACT_EMAIL?.trim() || '';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
:root { --bg:#F8FAFC; --card:#FFFFFF; --text:#172033; --muted:#475569; --accent:#1D4ED8; --brand:#2563EB;
        --edge:#94A3B8; --danger:#991B1B; --dangerSoft:#FEF2F2; --ok:#166534; --okSoft:#F0FDF4; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#0B1220; --card:#131C2E; --text:#F1F5F9; --muted:#CBD5E1; --accent:#93C5FD; --brand:#60A5FA;
          --edge:#64748B; --danger:#FCA5A5; --dangerSoft:#2A1215; --ok:#86EFAC; --okSoft:#0F2418; }
}
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--text);
       font: 19px/1.6 "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, sans-serif; }
main { max-width: 760px; margin: 0 auto; padding: 28px 16px 64px; }
header { display:flex; align-items:center; gap:14px; margin-bottom: 8px; }
header a { color: var(--text); text-decoration: none; font-weight: 700; font-size: 24px; }
h1 { font-size: 34px; line-height: 1.2; margin: 18px 0 4px; }
h2 { font-size: 23px; margin: 30px 0 6px; }
p, li { max-width: 68ch; }
.muted { color: var(--muted); }
a { color: var(--accent); }
.card { background: var(--card); border: 1px solid var(--edge); border-radius: 14px; padding: 20px; margin: 18px 0; }
label { display:block; font-weight:700; margin: 14px 0 6px; }
input[type=email], input[type=password] { width:100%; font: inherit; padding: 12px 14px; border-radius: 10px;
       border: 2px solid var(--edge); background: var(--bg); color: var(--text); min-height: 52px; }
input:focus { outline: 3px solid var(--brand); outline-offset: 1px; }
.check { display:flex; gap:12px; align-items:flex-start; font-weight: 400; }
.check input { width: 26px; height: 26px; margin-top: 3px; flex: none; }
button { font: inherit; font-weight: 700; color: #fff; background: var(--danger); border: 0; border-radius: 12px;
         min-height: 54px; padding: 0 24px; margin-top: 18px; cursor: pointer; }
@media (prefers-color-scheme: dark) { button { color: #0B1220; } }
button:disabled { opacity: .6; cursor: progress; }
.msg { border-radius: 10px; padding: 14px 16px; margin-top: 16px; }
.msg.err { background: var(--dangerSoft); color: var(--danger); }
.msg.ok { background: var(--okSoft); color: var(--ok); }
nav { display:flex; flex-wrap:wrap; gap: 8px 22px; margin-top: 40px; padding-top: 18px; border-top: 1px solid var(--edge); }
`;

const LOGO = `<svg width="44" height="44" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="24" fill="#2563EB"/><path d="M 69.8 30.2 A 28 28 0 1 0 69.8 69.8" stroke="#fff" stroke-width="13" stroke-linecap="round" fill="none"/><circle cx="73" cy="50" r="7.5" fill="#fff"/></svg>`;

function page(file, title, body) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · CogniCare</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head>
<body><main>
<header>${LOGO}<a href="./">CogniCare</a></header>
${body}
<nav><a href="privacy.html">Privacy policy</a><a href="terms.html">Terms of use</a><a href="delete-account.html">Delete your account</a></nav>
</main></body></html>
`;
  writeFileSync(join(out, file), html);
}

const sections = (list) =>
  list.map((s) => `<h2>${esc(s.heading)}</h2>\n${s.body.map((p) => `<p>${esc(p)}</p>`).join('\n')}`).join('\n');

mkdirSync(out, { recursive: true });

page('privacy.html', 'Privacy policy', `<h1>Privacy policy</h1>
<p class="muted">Last updated ${esc(LEGAL_UPDATED)}. This is the same text shown in the app.</p>
${sections(PRIVACY)}`);

page('terms.html', 'Terms of use', `<h1>Terms of use</h1>
<p class="muted">Last updated ${esc(LEGAL_UPDATED)}. This is the same text shown in the app.</p>
${sections(TERMS)}`);

page('index.html', 'CogniCare', `<h1>CogniCare</h1>
<p>Gentle brain exercises for adults with mild memory or thinking difficulties, with a weekly check-in you can share with your doctor if you choose.</p>
<p class="muted">CogniCare is not a medical device and does not diagnose or treat any illness.</p>`);

page('delete-account.html', 'Delete your account', `<h1>Delete your CogniCare account</h1>
<p>You can delete your account in the app: open <b>Profile</b>, then <b>Settings</b>, and choose <b>Delete my account</b>. If you no longer have the app, you can do it here instead.</p>

<h2>What is deleted</h2>
<ul>
<li><b>Patients:</b> your account, your shared check-ins and game results, and your connections to doctors are deleted for good.</li>
<li><b>Doctors:</b> your account is closed and every patient connection ends at once. Notes you wrote are kept, because they are part of patients’ medical records.</li>
<li>The record of who viewed a patient’s results is kept, so past access can still be checked.</li>
<li>Exercises played without an account were only ever on your phone. Uninstalling the app removes them.</li>
</ul>

<div class="card">
<form id="f" novalidate>
  <label for="email">Email address</label>
  <input id="email" type="email" autocomplete="username" required>
  <label for="password">Password</label>
  <input id="password" type="password" autocomplete="current-password" required>
  <label class="check"><input id="sure" type="checkbox"> I understand this cannot be undone.</label>
  <button id="go" type="submit">Delete my account</button>
  <div id="msg" role="status" aria-live="polite"></div>
</form>
</div>
${CONTACT ? `<p>Cannot sign in? Email <a href="mailto:${esc(CONTACT)}?subject=Delete%20my%20CogniCare%20account">${esc(CONTACT)}</a> from the address on your account and we will delete it.</p>` : ''}
<script>
const API = ${JSON.stringify(API)};
const f = document.getElementById('f'), go = document.getElementById('go'), msg = document.getElementById('msg');
function say(text, kind) { msg.className = 'msg ' + kind; msg.textContent = text; }
async function call(path, body, token) {
  const res = await fetch(API + path, { method: 'POST', body: JSON.stringify(body),
    headers: Object.assign({ 'content-type': 'application/json' }, token ? { authorization: 'Bearer ' + token } : {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || 'Something went wrong. Please try again.');
  return data;
}
f.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim(), password = document.getElementById('password').value;
  if (!email || !password) return say('Enter your email address and password.', 'err');
  if (!document.getElementById('sure').checked) return say('Tick the box to confirm.', 'err');
  go.disabled = true;
  say('Connecting… the first time this can take up to a minute.', 'ok');
  try {
    const session = await call('/auth/login', { email, password });
    const done = await call('/auth/delete-account', { password }, session.accessToken);
    f.reset();
    say(done.deleted ? 'Your account and your shared results have been deleted.'
                     : 'Your doctor account has been closed and every patient connection has ended.', 'ok');
  } catch (err) {
    say(err.message === 'Failed to fetch' ? 'Could not reach CogniCare. Check your connection and try again.' : err.message, 'err');
  } finally { go.disabled = false; }
});
</script>`);

console.log(`site written to ${out} (API ${API})`);
