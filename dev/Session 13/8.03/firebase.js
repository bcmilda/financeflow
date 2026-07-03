
// ══════════════════════════════════════════════════════
//  S12.1e: EMAIL + HESLO PŘIHLÁŠENÍ
// ══════════════════════════════════════════════════════
let _emailAuthMode = 'login';

function switchEmailTab(mode){
  _emailAuthMode = mode;
  const isReg = mode === 'register';
  const baseBtn = 'flex:1;padding:8px;border:none;border-radius:8px;font-size:.8rem;font-weight:600;cursor:pointer;';
  document.getElementById('tabLogin').style.cssText    = baseBtn + (isReg ? 'background:transparent;color:var(--text3)' : 'background:var(--surface);color:var(--text)');
  document.getElementById('tabRegister').style.cssText = baseBtn + (isReg ? 'background:var(--surface);color:var(--text)' : 'background:transparent;color:var(--text3)');
  document.getElementById('registerExtra').style.display = isReg ? 'block' : 'none';
  document.getElementById('emailAuthBtn').textContent = isReg ? 'Vytvořit účet' : 'Přihlásit se';
  document.getElementById('passwordInput').autocomplete = isReg ? 'new-password' : 'current-password';
  const rl = document.getElementById('resetPwLink'); if(rl) rl.style.display = isReg ? 'none' : 'block';
  setEmailAuthError('');
}

function setEmailAuthError(msg){
  const el = document.getElementById('emailAuthError');
  if(!el) return;
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function emailAuthErrorCZ(code){
  const map = {
    'auth/invalid-email':         'Neplatná e-mailová adresa.',
    'auth/user-not-found':        'Účet s tímto e-mailem neexistuje.',
    'auth/wrong-password':        'Špatné heslo.',
    'auth/invalid-credential':    'Nesprávný e-mail nebo heslo.',
    'auth/email-already-in-use':  'Tento e-mail je již použit – zkus se přihlásit.',
    'auth/weak-password':         'Heslo musí mít alespoň 8 znaků.',
    'auth/too-many-requests':     'Příliš mnoho pokusů. Zkus to za chvíli.',
    'auth/network-request-failed':'Chyba sítě. Zkontroluj připojení.',
    'auth/operation-not-allowed': 'Email přihlášení není povoleno. Kontaktuj podporu.',
    'auth/user-disabled':         'Tento účet byl zablokován.',
  };
  return map[code] || 'Chyba (' + code + '). Zkus to znovu.';
}

function togglePwVisible(){
  const inp = document.getElementById('passwordInput');
  if(inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

const ACTION_CODE_SETTINGS = {
  url: 'https://financeflow.cz/app',
  handleCodeInApp: false
};

async function submitEmailAuth(){
  const email = (document.getElementById('emailInput')?.value || '').trim();
  const pw    = document.getElementById('passwordInput')?.value || '';
  const btn   = document.getElementById('emailAuthBtn');
  setEmailAuthError('');
  if(!email){ setEmailAuthError('Zadej e-mailovou adresu.'); return; }
  if(pw.length < 8){ setEmailAuthError('Heslo musí mít alespoň 8 znaků.'); return; }
  if(_emailAuthMode === 'register'){
    const pw2 = document.getElementById('passwordConfirm')?.value || '';
    if(pw !== pw2){ setEmailAuthError('Hesla se neshodují.'); return; }
  }
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Moment\u2026'; }
  try {
    if(_emailAuthMode === 'register'){
      // Flag: během registrace NESMÍ onAuthStateChanged odhlásit uživatele dřív,
      // než stihneme odeslat ověřovací e-mail (jinak race → e-mail se neodešle).
      window._registeringFlow = true;
      const cred = await createUserWithEmailAndPassword(auth, email, pw);
      // Pošli ověřovací e-mail (chybu NEPOLYKEJ – musíme vědět když selže)
      await sendEmailVerification(cred.user, ACTION_CODE_SETTINGS);
      await fbSignOut(auth);
      window._registeringFlow = false;
      _emailAuthMode = 'login';
      if(typeof switchEmailTab === 'function') switchEmailTab('login');
      setEmailAuthError('');
      const okEl = document.getElementById('emailAuthError');
      if(okEl){
        okEl.style.display='block';
        okEl.style.color='var(--income)';
        okEl.innerHTML = '\u2705 Účet vytvořen! Poslali jsme ověřovací odkaz na <b>'+email+'</b>.<br>Zkontroluj i složku SPAM. Po kliknutí na odkaz se přihlas.';
      }
      if(btn){ btn.disabled = false; btn.textContent = 'Přihlásit se'; }
      return;
    } else {
      const cred = await signInWithEmailAndPassword(auth, email, pw);
      if(cred.user && !cred.user.emailVerified){
        // Neověřený e-mail – nepouštěj dovnitř, pošli nový odkaz
        window._registeringFlow = true;
        try { await sendEmailVerification(cred.user, ACTION_CODE_SETTINGS); } catch(sendErr){ console.error('sendEmailVerification (login) failed:', sendErr); }
        await fbSignOut(auth);
        window._registeringFlow = false;
        const el = document.getElementById('emailAuthError');
        if(el){
          el.style.display='block';
          el.style.color='var(--expense)';
          el.innerHTML = '\u26a0\ufe0f E-mail není ověřený. Poslali jsme nový odkaz na <b>'+email+'</b> (zkontroluj i SPAM) – klikni na něj a zkus to znovu.';
        }
        if(btn){ btn.disabled = false; btn.textContent = 'Přihlásit se'; }
        return;
      }
    }
  } catch(e){
    window._registeringFlow = false;
    // Chyba odeslání ověřovacího e-mailu má jiný kód než auth chyby
    if(e && e.code && String(e.code).indexOf('auth/') === 0){
      setEmailAuthError(emailAuthErrorCZ(e.code));
    } else {
      console.error('Email auth error:', e);
      setEmailAuthError('Účet vznikl, ale ověřovací e-mail se nepodařilo odeslat ('+(e&&e.message||e)+'). Zkus se přihlásit – pošleme odkaz znovu.');
    }
    if(btn){ btn.disabled = false; btn.textContent = _emailAuthMode === 'register' ? 'Vytvořit účet' : 'Přihlásit se'; }
  }
}

function showResetPassword(){
  const panel = document.getElementById('resetPwPanel'); if(!panel) return;
  const email = document.getElementById('emailInput')?.value || '';
  if(email){ const ri = document.getElementById('resetEmailInput'); if(ri) ri.value = email; }
  panel.style.display = 'block';
  const rl = document.getElementById('resetPwLink'); if(rl) rl.style.display = 'none';
}
function hideResetPassword(){
  const p = document.getElementById('resetPwPanel'); if(p) p.style.display = 'none';
  const rl = document.getElementById('resetPwLink'); if(rl) rl.style.display = 'block';
}
async function sendPasswordReset(){
  const email = (document.getElementById('resetEmailInput')?.value || '').trim();
  const msg = document.getElementById('resetMsg');
  if(!email){ if(msg){ msg.style.display='block'; msg.style.color='var(--expense)'; msg.textContent='Zadej e-mailovou adresu.'; } return; }
  try {
    await sendPasswordResetEmail(auth, email);
    if(msg){ msg.style.display='block'; msg.style.color='var(--income)'; msg.textContent='\u2705 Odkaz pro obnovu hesla odeslán na ' + email; }
  } catch(e){
    if(msg){ msg.style.display='block'; msg.style.color='var(--expense)'; msg.textContent = emailAuthErrorCZ(e.code); }
  }
}

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut as fbSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, applyActionCode } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, set, get, update, onValue, off } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const app = initializeApp({
  apiKey: "AIzaSyDtEdQw4WccmEzxXzMwPQlenqfnjoiVw4A",
  authDomain: "financeflow-a249c.firebaseapp.com",
  databaseURL: "https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "financeflow-a249c",
  storageBucket: "financeflow-a249c.firebasestorage.app",
  messagingSenderId: "399807761148",
  appId: "1:399807761148:web:a20b1d9ae78aec23e7a579"
});

const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// Wire up firebase functions to global wrappers
window._ref = (database, path) => ref(database, path);
window._set = (r, val) => set(r, val);
window._get = (r) => get(r).then(s => ({ exists: () => s.exists(), val: () => s.val() }));
window._update = (r, val) => update(r, val);
window._onValue = (r, cb) => {
  const wrapped = snap => cb({ exists: () => snap.exists(), val: () => snap.val() });
  onValue(r, wrapped);
  return wrapped;
};
window._off = (r, ev, cb) => off(r, 'value', cb);
window._db = db;
// Make _db, _ref etc available as direct globals for main script
window._db = db;

// Exponovat login funkce do globalnho window (potreba pro onclick v HTML modulu)
window.switchEmailTab     = switchEmailTab;
window.submitEmailAuth    = submitEmailAuth;
window.togglePwVisible    = togglePwVisible;
window.showResetPassword  = showResetPassword;
window.hideResetPassword  = hideResetPassword;
window.sendPasswordReset  = sendPasswordReset;

window.signInGoogle = async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch(e) {
    // Popup zavřen uživatelem - tiché ignorování
    if(e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    // Popup blokován - použij redirect
    if(e.code === 'auth/popup-blocked') {
      try {
        const { signInWithRedirect } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
        await signInWithRedirect(auth, provider);
      } catch(e2) { alert('Přihlášení selhalo. Zkuste obnovit stránku.'); }
      return;
    }
    alert('Přihlášení selhalo: ' + (e.message || e.code));
  }
};
window.signOut = () => { if(!confirm('Odhlásit se?')) return; fbSignOut(auth); };
window._signInGoogle = window.signInGoogle;
window._signOut = window.signOut;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Během registrace si flow řídí odhlášení sám (po odeslání ověřovacího e-mailu).
    // Bez tohoto by nás onAuthStateChanged odhlásil dřív, než stihneme e-mail poslat.
    if (window._registeringFlow) return;
    // Pojistka: neověřený e-mail (provider 'password') nepouštěj dovnitř.
    // Google/ostatní provideři mají emailVerified=true automaticky.
    const isPasswordProvider = (user.providerData || []).some(p => p && p.providerId === 'password');
    if (isPasswordProvider && !user.emailVerified) {
      try { await fbSignOut(auth); } catch(_) {}
      return;
    }
    window._currentUser = user;
    // FIX-063 (Session 8): Cache idToken pro sendBeacon při zavření tabu
    if (typeof refreshIdTokenCache === 'function') {
      await refreshIdTokenCache();
    }
    // FIX-075 (Session 8): Sentry user identification – pomáhá filtrovat errory per user
    // a vidět kolik unikátních uživatelů danou chybu zasáhla.
    try {
      if (typeof Sentry !== 'undefined' && Sentry.setUser) {
        Sentry.setUser({ id: user.uid, email: user.email || undefined });
      }
    } catch(e) { /* Sentry nemusí být k dispozici */ }
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appShell').style.display = 'flex';
    document.getElementById('mainFab').style.display = 'flex';
    // Načítej data postupně - nejdřív zobraz UI pak data
    if(typeof window.onUserSignedIn === 'function') {
      await window.onUserSignedIn(user);
    } else {
      // Počkej max 3s na načtení app.js
      let tries = 0;
      while(typeof window.onUserSignedIn !== 'function' && tries < 30) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
      }
      if(typeof window.onUserSignedIn === 'function') await window.onUserSignedIn(user);
    }
    if(typeof checkAdminNav === 'function') checkAdminNav();
    // S12.1n: uvítací hláška pro nové uživatele (jednou při prvním spuštění)
    if(typeof maybeShowWelcome === 'function') setTimeout(()=>maybeShowWelcome(), 1200);
  } else {
    window._currentUser = null;
    // FIX-075: Vymazat Sentry user při odhlášení
    try { if (typeof Sentry !== 'undefined' && Sentry.setUser) Sentry.setUser(null); } catch(e) {}
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appShell').style.display = 'none';
    document.getElementById('mainFab').style.display = 'none';
  }
});


// ─── EMAIL ACTION HANDLER (verifyEmail / resetPassword z custom URL) ──────────
// Firebase přesměruje na financeflow.cz/app?mode=verifyEmail&oobCode=XXX
// Tato funkce to zpracuje hned při načtení stránky.
(async function handleEmailAction() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');
  if (!mode || !oobCode) return;

  if (mode === 'verifyEmail') {
    try {
      await applyActionCode(auth, oobCode);
      // Odstraň parametry z URL (čistá adresa)
      window.history.replaceState({}, document.title, window.location.pathname);
      // Ukaž zprávu uživateli
      setTimeout(() => {
        const el = document.getElementById('emailAuthError');
        if (el) {
          el.style.display = 'block';
          el.style.color = 'var(--income)';
          el.innerHTML = '✅ E-mail byl úspěšně ověřen! Nyní se můžeš přihlásit.';
        } else {
          alert('✅ E-mail byl úspěšně ověřen! Nyní se můžeš přihlásit.');
        }
      }, 800);
    } catch(e) {
      console.error('applyActionCode error:', e);
      setTimeout(() => {
        alert('⚠️ Odkaz pro ověření e-mailu je neplatný nebo vypršel. Zkus se přihlásit – pošleme nový.');
      }, 800);
    }
  }

  if (mode === 'resetPassword') {
    // Přesměruj na login screen se zobrazeným reset formulářem
    setTimeout(() => {
      if (typeof showResetPassword === 'function') showResetPassword();
    }, 800);
  }
})();
// ─────────────────────────────────────────────────────────────────────────────
