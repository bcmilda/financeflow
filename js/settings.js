// ══════════════════════════════════════════════════════
//  NASTAVENÍ – FinanceFlow v6.39
//  Wallet-style sekce, PIN, Dark/Light mode,
//  Vymazat data, Nápověda
// ══════════════════════════════════════════════════════

// ── State ──
let _pin = null;          // null = není nastaven
let _pinAttempts = 0;
let _themeMode = 'dark';  // 'dark' | 'light' | 'auto'

// ══════════════════════════════════════════════════════
//  TÉMA – světlý / tmavý režim
// ══════════════════════════════════════════════════════
function initTheme() {
  try {
    const saved = localStorage.getItem('ff_theme') || 'dark';
    applyTheme(saved, false);
  } catch(e) { applyTheme('dark', false); }
}

function applyTheme(mode, save = true) {
  _themeMode = mode;
  const root = document.documentElement;

  if (mode === 'light') {
    root.style.setProperty('--bg',       '#f0f2f7');
    root.style.setProperty('--surface',  '#ffffff');
    root.style.setProperty('--surface2', '#f5f7fc');
    root.style.setProperty('--surface3', '#e8ecf5');
    root.style.setProperty('--text',     '#111827');
    root.style.setProperty('--text2',    '#374151');
    root.style.setProperty('--text3',    '#6b7280');
    root.style.setProperty('--border',   'rgba(0,0,0,.1)');
    root.style.setProperty('--border2',  'rgba(0,0,0,.18)');
    root.style.setProperty('--income-bg',  'rgba(22,163,74,.12)');
    root.style.setProperty('--expense-bg', 'rgba(220,38,38,.1)');
    root.style.setProperty('--debt-bg',    'rgba(217,119,6,.1)');
    root.style.setProperty('--bank-bg',    'rgba(37,99,235,.1)');
    root.setAttribute('data-theme', 'light');
  } else if (mode === 'auto') {
    // Zjisti systémové téma a aplikuj barvy – ale _themeMode zůstane 'auto'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      // Tmavé – odstraň overrides (CSS výchozí jsou dark)
      ['--bg','--surface','--surface2','--surface3','--text','--text2','--text3',
       '--border','--border2','--income-bg','--expense-bg','--debt-bg','--bank-bg'
      ].forEach(v => root.style.removeProperty(v));
      root.setAttribute('data-theme', 'dark');
    } else {
      // Světlé
      root.style.setProperty('--bg',       '#f0f2f7');
      root.style.setProperty('--surface',  '#ffffff');
      root.style.setProperty('--surface2', '#f5f7fc');
      root.style.setProperty('--surface3', '#e8ecf5');
      root.style.setProperty('--text',     '#111827');
      root.style.setProperty('--text2',    '#374151');
      root.style.setProperty('--text3',    '#6b7280');
      root.style.setProperty('--border',   'rgba(0,0,0,.1)');
      root.style.setProperty('--border2',  'rgba(0,0,0,.18)');
      root.style.setProperty('--income-bg',  'rgba(22,163,74,.12)');
      root.style.setProperty('--expense-bg', 'rgba(220,38,38,.1)');
      root.style.setProperty('--debt-bg',    'rgba(217,119,6,.1)');
      root.style.setProperty('--bank-bg',    'rgba(37,99,235,.1)');
      root.setAttribute('data-theme', 'light');
    }
    // _themeMode zůstane 'auto' – neměníme ho
    _themeMode = 'auto';
  } else {
    // dark (výchozí – odstraň override, CSS proměnné jsou definovány pro dark)
    ['--bg','--surface','--surface2','--surface3','--text','--text2','--text3',
     '--border','--border2','--income-bg','--expense-bg','--debt-bg','--bank-bg'
    ].forEach(v => root.style.removeProperty(v));
    root.setAttribute('data-theme', 'dark');
  }

  if (save) {
    try { localStorage.setItem('ff_theme', mode); } catch(e) {}
    if (_settings) _settings.theme = mode;
  }

  // Aktualizuj UI přepínač pokud je viditelný
  updateThemeUI();
}

function updateThemeUI() {
  ['dark','light','auto'].forEach(m => {
    const btn = document.getElementById('theme-btn-' + m);
    if (btn) {
      btn.classList.toggle('sel', _themeMode === m || (m === 'dark' && !_themeMode));
    }
  });
}

// Reaguj na systémovou změnu tématu v auto režimu
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (_themeMode === 'auto') applyTheme('auto', false);
});

// ══════════════════════════════════════════════════════
//  PIN – nastavení a ověření
// ══════════════════════════════════════════════════════
function loadPin() {
  try {
    const saved = localStorage.getItem('ff_pin');
    _pin = saved || null;
  } catch(e) {}
}

function savePin(pin) {
  _pin = pin;
  try {
    if (pin) localStorage.setItem('ff_pin', pin);
    else localStorage.removeItem('ff_pin');
  } catch(e) {}
}

function openPinSetup() {
  const modal = document.getElementById('modalPinSetup'); if (!modal) return;
  document.getElementById('pinSetupStep1').style.display = 'block';
  document.getElementById('pinSetupStep2').style.display = 'none';
  document.getElementById('pinInput1').value = '';
  document.getElementById('pinInput2').value = '';
  document.getElementById('pinSetupError').textContent = '';
  modal.classList.add('open');
}

function pinSetupNext() {
  const p1 = document.getElementById('pinInput1').value;
  if (p1.length < 4) {
    document.getElementById('pinSetupError').textContent = 'PIN musí mít alespoň 4 číslice';
    return;
  }
  document.getElementById('pinSetupStep1').style.display = 'none';
  document.getElementById('pinSetupStep2').style.display = 'block';
  document.getElementById('pinSetupError').textContent = '';
}

function pinSetupConfirm() {
  const p1 = document.getElementById('pinInput1').value;
  const p2 = document.getElementById('pinInput2').value;
  if (p1 !== p2) {
    document.getElementById('pinSetupError').textContent = 'PINy se neshodují, zkus znovu';
    document.getElementById('pinInput2').value = '';
    return;
  }
  savePin(p1);
  closeModal('modalPinSetup');
  renderSettingsPage();
  if (typeof showToast === 'function') showToast('🔒 PIN nastaven');
}

function pinRemove() {
  if (!confirm('Opravdu odebrat PIN? Aplikace nebude chráněna.')) return;
  savePin(null);
  renderSettingsPage();
  if (typeof showToast === 'function') showToast('PIN odstraněn');
}

// Ověření PINu při startu (volá se z firebase.js po auth)
function checkPinOnStart() {
  if (!_pin) return; // Bez PINu – přímý přístup
  openPinVerify();
}

function openPinVerify() {
  const modal = document.getElementById('modalPinVerify'); if (!modal) return;
  document.getElementById('pinVerifyInput').value = '';
  document.getElementById('pinVerifyError').textContent = '';
  _pinAttempts = 0;
  modal.classList.add('open');
}

function pinVerifySubmit() {
  const entered = document.getElementById('pinVerifyInput').value;
  if (entered === _pin) {
    _pinAttempts = 0;
    closeModal('modalPinVerify');
    return;
  }
  _pinAttempts++;
  document.getElementById('pinVerifyInput').value = '';
  const errEl = document.getElementById('pinVerifyError');
  if (_pinAttempts >= 5) {
    errEl.textContent = '5 nesprávných pokusů – přihlaste se znovu';
    setTimeout(() => {
      closeModal('modalPinVerify');
      if (typeof signOut === 'function') signOut();
    }, 2000);
  } else {
    errEl.textContent = `Nesprávný PIN (${_pinAttempts}/5)`;
  }
}

// ══════════════════════════════════════════════════════
//  VYMAZAT DATA
// ══════════════════════════════════════════════════════
function openDeleteDataModal() {
  const modal = document.getElementById('modalDeleteData'); if (!modal) return;
  document.getElementById('deleteStep1').style.display = 'block';
  document.getElementById('deleteStep2').style.display = 'none';
  document.getElementById('deleteStep3').style.display = 'none';
  document.getElementById('deleteConfirmInput').value = '';
  modal.classList.add('open');
}

function deleteDataStep2() {
  document.getElementById('deleteStep1').style.display = 'none';
  document.getElementById('deleteStep2').style.display = 'block';
}

function deleteDataStep3() {
  document.getElementById('deleteStep2').style.display = 'none';
  document.getElementById('deleteStep3').style.display = 'block';
}

async function confirmDeleteAllData() {
  const input = document.getElementById('deleteConfirmInput').value.trim();
  if (input !== 'SMAZAT') {
    alert('Zadej přesně slovo SMAZAT (velkými písmeny)');
    return;
  }
  closeModal('modalDeleteData');

  // Smaž Firebase data
  if (window._currentUser && !_isLocalMode) {
    try {
      await _set(_ref(_db, `users/${window._currentUser.uid}/data`), null);
      await _set(_ref(_db, `users/${window._currentUser.uid}/referral`), null);
    } catch(e) { console.error('Delete Firebase error:', e); }
  }

  // Smaž lokální storage
  try {
    localStorage.removeItem('ff_v43_local');
    localStorage.removeItem('ff_pin');
    localStorage.removeItem('ff_theme');
    localStorage.removeItem('ff_v43_settings');
  } catch(e) {}

  // Reset stavu
  S = { transactions:[], debts:[], categories:[], bank:{startBalance:0},
        birthdays:[], wishes:[], wallets:[], payTypes:[], sablony:[],
        projects:[], nakupList:[], curMonth:new Date().getMonth(),
        curYear:new Date().getFullYear() };
  _pin = null;

  if (typeof showToast === 'function') showToast('🗑 Všechna data smazána');

  // Odhlásit
  setTimeout(() => {
    if (typeof signOut === 'function') {
      if (window._signOut) window._signOut();
    }
    location.reload();
  }, 1500);
}

// ══════════════════════════════════════════════════════
//  RENDER – Nastavení (Wallet-style)
// ══════════════════════════════════════════════════════
function renderSettingsPage() {
  const el = document.getElementById('settingsPageContent'); if (!el) return;

  const user = window._currentUser;
  const profile = window._userProfile || {};
  const name = profile.displayName || user?.displayName || 'Uživatel';
  const email = user?.email || '';
  const photo = profile.photoURL || user?.photoURL || null;

  const hasPremium = typeof hasPremiumAccess === 'function' && hasPremiumAccess();
  const premLabel = _premiumStatus?.type === 'premium' ? '💎 Premium aktivní'
                  : _premiumStatus?.type === 'trial'   ? `🎁 Trial – ${_premiumStatus.daysLeft} dní`
                  : '🔒 Základní verze';

  el.innerHTML = `

    <!-- ── PROFIL ── -->
    <div class="settings-section">
      <div class="settings-section-title">Profil</div>

      <div class="settings-item settings-profile-header" onclick="openProfileModal()">
        <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--surface3);display:flex;align-items:center;justify-content:center;font-size:1.4rem">
          ${photo ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">` : '👤'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.92rem">${name}</div>
          <div style="font-size:.76rem;color:var(--text3);margin-top:1px">${email || 'Lokální účet'}</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>

      <div class="settings-item" onclick="showPaywall()">
        <span class="settings-icon">⭐</span>
        <div class="settings-item-body">
          <div class="settings-item-title">Prémiový plán</div>
          <div class="settings-item-sub">${premLabel}</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>
    </div>

    <!-- ── OBECNÉ ── -->
    <div class="settings-section">
      <div class="settings-section-title">Obecné</div>

      <div class="settings-item" onclick="showPage('penezenky',null)">
        <span class="settings-icon">🏦</span>
        <div class="settings-item-body">
          <div class="settings-item-title">Účty & Peněženky</div>
          <div class="settings-item-sub">Spravuj bankovní účty a hotovost</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>

      <div class="settings-item" onclick="showPage('kategorie',null)">
        <span class="settings-icon">🏷️</span>
        <div class="settings-item-body">
          <div class="settings-item-title">Kategorie</div>
          <div class="settings-item-sub">Ikony, barvy, podkategorie</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>

      <div class="settings-item" onclick="showPage('typy',null)">
        <span class="settings-icon">💳</span>
        <div class="settings-item-body">
          <div class="settings-item-title">Typy plateb</div>
          <div class="settings-item-sub">Hotovost, karta, převod...</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>

      <div class="settings-item" onclick="showPage('sablony',null)">
        <span class="settings-icon">🔄</span>
        <div class="settings-item-body">
          <div class="settings-item-title">Šablony & opakované platby</div>
          <div class="settings-item-sub">Nájmy, předplatná, výplata</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>
    </div>

    <!-- ── VZHLED ── -->
    <div class="settings-section">
      <div class="settings-section-title">Vzhled</div>

      <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="settings-icon">🌓</span>
          <div class="settings-item-body">
            <div class="settings-item-title">Barevné téma</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding-left:38px">
          <button class="btn ${_themeMode==='dark'?'sel':''}" id="theme-btn-dark"
            onclick="applyTheme('dark')" style="font-size:.8rem;padding:8px;text-align:center">
            🌙 Tmavé
          </button>
          <button class="btn ${_themeMode==='light'?'sel':''}" id="theme-btn-light"
            onclick="applyTheme('light')" style="font-size:.8rem;padding:8px;text-align:center">
            ☀️ Světlé
          </button>
          <button class="btn ${_themeMode==='auto'?'sel':''}" id="theme-btn-auto"
            onclick="applyTheme('auto')" style="font-size:.8rem;padding:8px;text-align:center">
            ⚡ Auto
          </button>
        </div>
      </div>
    </div>

    <!-- ── LOKALIZACE ── -->
    <div class="settings-section">
      <div class="settings-section-title">Lokalizace</div>

      <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="settings-icon">🌍</span>
          <div class="settings-item-body"><div class="settings-item-title">Jazyk</div></div>
        </div>
        <select class="fs" id="settingLang" style="margin-left:38px"
          onchange="settingChanged()">
          <option value="cs" ${(_settings?.lang||'cs')==='cs'?'selected':''}>🇨🇿 Čeština</option>
          <option value="sk" ${_settings?.lang==='sk'?'selected':''}>🇸🇰 Slovenčina</option>
          <option value="en" ${_settings?.lang==='en'?'selected':''}>🇬🇧 English</option>
        </select>
      </div>

      <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="settings-icon">💱</span>
          <div class="settings-item-body"><div class="settings-item-title">Výchozí měna</div></div>
        </div>
        <select class="fs" id="settingCurrency" style="margin-left:38px"
          onchange="settingChanged()">
          <option value="CZK" ${(_settings?.currency||'CZK')==='CZK'?'selected':''}>🇨🇿 CZK – Koruna</option>
          <option value="EUR" ${_settings?.currency==='EUR'?'selected':''}>🇪🇺 EUR – Euro</option>
          <option value="USD" ${_settings?.currency==='USD'?'selected':''}>🇺🇸 USD – Dolar</option>
          <option value="GBP" ${_settings?.currency==='GBP'?'selected':''}>🇬🇧 GBP – Libra</option>
          <option value="PLN" ${_settings?.currency==='PLN'?'selected':''}>🇵🇱 PLN – Zlotý</option>
        </select>
      </div>

      <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="settings-icon">📅</span>
          <div class="settings-item-body"><div class="settings-item-title">Formát data</div></div>
        </div>
        <select class="fs" id="settingDateFmt" style="margin-left:38px"
          onchange="settingChanged()">
          <option value="cs"  ${(_settings?.dateFmt||'cs')==='cs'?'selected':''}>DD.MM.YYYY (česky)</option>
          <option value="iso" ${_settings?.dateFmt==='iso'?'selected':''}>YYYY-MM-DD (ISO)</option>
          <option value="us"  ${_settings?.dateFmt==='us'?'selected':''}>MM/DD/YYYY (US)</option>
        </select>
      </div>

      <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="settings-icon">📆</span>
          <div class="settings-item-body">
            <div class="settings-item-title">První den měsíce</div>
            <div class="settings-item-sub">Pro výpočet měsíčních přehledů</div>
          </div>
        </div>
        <select class="fs" id="settingFirstDay" style="margin-left:38px"
          onchange="settingChanged()">
          ${Array.from({length:28},(_,i)=>i+1).map(d =>
            `<option value="${d}" ${(_settings?.firstDay||1)==d?'selected':''}>${d}. den v měsíci</option>`
          ).join('')}
        </select>
      </div>
    </div>

    <!-- ── DOMÁCNOST ── -->
    <div class="settings-section">
      <div class="settings-section-title">Složení domácnosti</div>
      <div style="font-size:.76rem;color:var(--text3);padding:0 14px 10px;line-height:1.5">
        Používá se pro porovnání výdajů s průměry ČSÚ (OECD ekvivalent).
      </div>
      <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:8px">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <div>
            <div style="font-size:.74rem;color:var(--text3);margin-bottom:4px">Dospělí</div>
            <input class="fi" id="settingAdults" type="number" min="1" max="10"
              value="${_settings?.household_adults||2}" style="text-align:center" onchange="settingChanged()">
          </div>
          <div>
            <div style="font-size:.74rem;color:var(--text3);margin-bottom:4px">Děti 0–13</div>
            <input class="fi" id="settingChildren013" type="number" min="0" max="10"
              value="${_settings?.household_ch013||0}" style="text-align:center" onchange="settingChanged()">
          </div>
          <div>
            <div style="font-size:.74rem;color:var(--text3);margin-bottom:4px">Děti 14+</div>
            <input class="fi" id="settingChildren14" type="number" min="0" max="10"
              value="${_settings?.household_ch14||0}" style="text-align:center" onchange="settingChanged()">
          </div>
        </div>
      </div>
    </div>

    <!-- ── ZABEZPEČENÍ ── -->
    <div class="settings-section">
      <div class="settings-section-title">Zabezpečení</div>

      <div class="settings-item">
        <span class="settings-icon">🔒</span>
        <div class="settings-item-body">
          <div class="settings-item-title">PIN kód</div>
          <div class="settings-item-sub">${_pin ? '✅ Nastaven – aplikace je chráněna' : 'Nenastaven'}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="openPinSetup()">
            ${_pin ? '✎ Změnit' : '+ Nastavit'}
          </button>
          ${_pin ? `<button class="btn btn-ghost btn-sm" style="color:var(--expense)" onclick="pinRemove()">Odebrat</button>` : ''}
        </div>
      </div>
    </div>

    <!-- ── DATA & SOUKROMÍ ── -->
    <div class="settings-section">
      <div class="settings-section-title">Data & Soukromí</div>

      <div class="settings-item" onclick="showPage('import',null)">
        <span class="settings-icon">📥</span>
        <div class="settings-item-body">
          <div class="settings-item-title">Import dat</div>
          <div class="settings-item-sub">CSV, bankovní výpis, JSON</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>

      <div class="settings-item" onclick="exportUserData()">
        <span class="settings-icon">📤</span>
        <div class="settings-item-body">
          <div class="settings-item-title">Export dat</div>
          <div class="settings-item-sub">Stáhnout zálohu JSON</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>

      <div class="settings-item" onclick="openPrivacyPolicy()">
        <span class="settings-icon">🔐</span>
        <div class="settings-item-body">
          <div class="settings-item-title">Ochrana osobních údajů</div>
          <div class="settings-item-sub">GDPR, Privacy Policy</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>

      <div class="settings-item" onclick="openDeleteDataModal()" style="border-left:3px solid var(--expense)">
        <span class="settings-icon">🗑</span>
        <div class="settings-item-body">
          <div class="settings-item-title" style="color:var(--expense)">Vymazat všechna data</div>
          <div class="settings-item-sub">Nevratné smazání + odhlášení</div>
        </div>
        <span class="settings-chevron" style="color:var(--expense)">›</span>
      </div>
    </div>

    <!-- ── NÁPOVĚDA ── -->
    <div class="settings-section">
      <div class="settings-section-title">Podpora & Nápověda</div>

      <div class="settings-item" onclick="openHelpCenter()">
        <span class="settings-icon">❓</span>
        <div class="settings-item-body">
          <div class="settings-item-title">Nápověda & FAQ</div>
          <div class="settings-item-sub">Časté dotazy a návody</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>

      <div class="settings-item" onclick="openContactForm()">
        <span class="settings-icon">📧</span>
        <div class="settings-item-body">
          <div class="settings-item-title">Kontakt & podpora</div>
          <div class="settings-item-sub">Napiš nám dotaz nebo chybu</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>

      <div class="settings-item" onclick="showPage('oAplikaci',null)">
        <span class="settings-icon">ℹ️</span>
        <div class="settings-item-body">
          <div class="settings-item-title">O aplikaci</div>
          <div class="settings-item-sub">Verze, changelog, podmínky</div>
        </div>
        <span class="settings-chevron">›</span>
      </div>
    </div>

    <!-- ── ODHLÁŠENÍ ── -->
    <div class="settings-section" style="margin-bottom:24px">
      <button class="btn" onclick="signOut()"
        style="width:100%;text-align:center;color:var(--expense);border-color:rgba(248,113,113,.3);padding:13px">
        Odhlásit se
      </button>
    </div>

    <!-- Uložit tlačítko (skryté, auto-save) -->
    <div id="settingsSaveBar" style="display:none;position:sticky;bottom:70px;z-index:50;padding:0 0 8px">
      <button class="btn btn-accent" onclick="saveSettingsBtn()" style="width:100%;padding:13px;font-size:.9rem">
        💾 Uložit nastavení
      </button>
    </div>
  `;

  // Zobraz save bar po změně
  document.querySelectorAll('#settingsPageContent select, #settingsPageContent input[type=number]')
    .forEach(el => el.addEventListener('change', showSettingsSaveBar));
}

function showSettingsSaveBar() {
  const bar = document.getElementById('settingsSaveBar');
  if (bar) bar.style.display = 'block';
}

function settingChanged() { showSettingsSaveBar(); }

// ══════════════════════════════════════════════════════
//  NÁPOVĚDA – FAQ Modal
// ══════════════════════════════════════════════════════
const HELP_FAQ = [
  {
    q: 'Jak přidat transakci?',
    a: 'Klikni na zelené tlačítko + vpravo dole. Vyber typ (příjem/výdaj), zadej částku, kategorii a datum. Nebo naskenuj účtenku přes AI → Analýza účtenek.'
  },
  {
    q: 'Jak sdílet data s partnerem?',
    a: 'Jdi do Menu → Sdílení & Partneři. Zkopíruj své ID a pošli ho partnerovi. Partner zadá tvoje ID u sebe. Data jsou sdílena v reálném čase.'
  },
  {
    q: 'Co je PIN kód?',
    a: 'PIN chrání aplikaci při otevření. Nastav ho v Nastavení → Zabezpečení → PIN kód. Po 5 nesprávných pokusech dojde k odhlášení.'
  },
  {
    q: 'Jak funguje AI analýza účtenek?',
    a: 'Vyfot nebo nahraj účtenku v sekci Analýza účtenek. Claude AI rozpozná obchod, položky a ceny. Potvrď a transakce se přidá automaticky.'
  },
  {
    q: 'Jak importovat z banky?',
    a: 'Menu → Import z banky: vlož SMS nebo push notifikaci z Revoluctu, George, KB, ČSOB, Google Pay atd. Nebo použij Menu → Import dat pro CSV výpis.'
  },
  {
    q: 'Co je referral kód?',
    a: 'Tvůj unikátní odkaz pro sdílení. Za každého přítele, který se přihlásí přes tvůj odkaz, získáš body. Najdeš ho v O aplikaci → Sdílet FinanceFlow.'
  },
  {
    q: 'Jak vymazat data?',
    a: 'Nastavení → Vymazat všechna data. Jde o nevratnou akci – budeme tě žádat o trojité potvrzení. Data jsou smazána z Firebase i zařízení.'
  },
  {
    q: 'Kde jsou moje data uložena?',
    a: 'V Google Firebase (EU server – europe-west1). Přenos je šifrován HTTPS/TLS. Neprodáváme data třetím stranám. Více v Ochraně osobních údajů.'
  },
];

function openHelpCenter() {
  const modal = document.getElementById('modalHelp'); if (!modal) return;
  const list = document.getElementById('helpFaqList'); if (!list) return;

  list.innerHTML = HELP_FAQ.map((faq, i) => `
    <div class="help-faq-item" id="faq-${i}">
      <div class="help-faq-q" onclick="toggleFaq(${i})">
        <span>${faq.q}</span>
        <span class="help-faq-arrow" id="faq-arrow-${i}">›</span>
      </div>
      <div class="help-faq-a" id="faq-a-${i}" style="display:none">${faq.a}</div>
    </div>
  `).join('');

  modal.classList.add('open');
}

function toggleFaq(i) {
  const ans = document.getElementById('faq-a-' + i);
  const arrow = document.getElementById('faq-arrow-' + i);
  if (!ans) return;
  const open = ans.style.display !== 'none';
  ans.style.display = open ? 'none' : 'block';
  if (arrow) arrow.textContent = open ? '›' : '↓';
}

// Export dat jako JSON
function exportUserData() {
  const D = getData();
  const data = JSON.stringify(D, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financeflow-zaloha-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (typeof showToast === 'function') showToast('📤 Export stažen');
}

// Přepis applySettings z premium.js – zavolá renderSettingsPage
const _origApplySettings = typeof applySettings === 'function' ? applySettings : null;
function applySettings() {
  if (_origApplySettings) _origApplySettings();
  renderSettingsPage();
  loadPin();
  initTheme();
}

// Inicializace při startu
initTheme();
loadPin();

