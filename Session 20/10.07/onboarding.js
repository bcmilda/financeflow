// FinanceFlow · v10.07 · onboarding.js · 2026-08-28
//  TODO-234: ONBOARDING KROK 1
// ══════════════════════════════════════════════════════
// Jediná stránka pro nového uživatele: jazyk, výchozí měna, typ peněženky
// (první účet ze seedData/ensureBaseData), výchozí typ platby, formát data,
// frekvence výplaty + den, dotaz na půjčku/hypotéku (odemyká S2 ve skóre –
// viz premium.js computeFinancialScore, _settings.hasDebts, ADR-... TODO-227).
//
// Vše volitelné – "Přeskočit" ukládá jen _settings.onboardingDone=true a nic
// dalšího nemění. Znovu se modal NEUKÁŽE, hodnoty lze kdykoli doladit
// v Nastavení (stejná pole, stejný _settings objekt).
//
// SKILL 31 (absence dat není informace): nespoléháme na "_settings.onboardingDone
// chybí" jako signál "je to nový uživatel" – volající (app.js/onUserSignedIn)
// nám řekne explicitně, jestli šlo o čerstvý seed (!snap.exists()), a jen TOHLE
// otevře modal. Existující uživatelé bez příznaku dostanou příznak potichu
// doplněný na pozadí, bez vyskočení dialogu.

function maybeShowOnboarding(isNewSignup) {
  if (viewingUid) return;                    // nikdy při prohlížení dat partnera
  if (typeof _settings === 'undefined' || !_settings) return;
  if (_settings.onboardingDone) return;       // už řešeno (dokončeno i přeskočeno)
  if (!isNewSignup) {
    // Existující uživatel, u kterého příznak jen ještě nikdy nevznikl (appka
    // ho zavedla až teď) – NENÍ to nový uživatel, modal se neukazuje.
    _settings.onboardingDone = true;
    _persistOnboardingSettings();
    return;
  }
  openOnboardingModal();
}

function openOnboardingModal() {
  renderOnboardingModal();
  const m = document.getElementById('modalOnboarding');
  if (m) m.classList.add('open');
}

function renderOnboardingModal() {
  const el = document.getElementById('modalOnboardingBody'); if (!el) return;
  const w = (Array.isArray(S.wallets) && S.wallets.length) ? S.wallets[0] : null;

  el.innerHTML = `
    <div style="font-size:.84rem;color:var(--text2);line-height:1.55;margin-bottom:16px">
      Pár rychlých otázek, ať se appka od začátku chová podle tebe. Cokoliv
      přeskočíš, doladíš kdykoli později v <strong>Nastavení</strong>.
    </div>

    <div class="frow">
      <div class="fg"><label>🌍 Jazyk</label>
        <select class="fs" id="onbLang">
          <option value="cs" ${(_settings?.lang||'cs')==='cs'?'selected':''}>🇨🇿 Čeština</option>
          <option value="sk" ${_settings?.lang==='sk'?'selected':''}>🇸🇰 Slovenčina</option>
          <option value="en" ${_settings?.lang==='en'?'selected':''}>🇬🇧 English</option>
        </select>
      </div>
      <div class="fg"><label>💱 Výchozí měna</label>
        <select class="fs" id="onbCurrency">
          <option value="CZK" ${(_settings?.currency||'CZK')==='CZK'?'selected':''}>🇨🇿 CZK – Koruna</option>
          <option value="EUR" ${_settings?.currency==='EUR'?'selected':''}>🇪🇺 EUR – Euro</option>
          <option value="USD" ${_settings?.currency==='USD'?'selected':''}>🇺🇸 USD – Dolar</option>
          <option value="GBP" ${_settings?.currency==='GBP'?'selected':''}>🇬🇧 GBP – Libra</option>
          <option value="PLN" ${_settings?.currency==='PLN'?'selected':''}>🇵🇱 PLN – Zlotý</option>
        </select>
      </div>
    </div>

    ${w ? `
    <div class="frow">
      <div class="fg"><label>👛 Typ tvého účtu</label>
        <select class="fs" id="onbWalletType">
          <option value="cash" ${w.type==='cash'?'selected':''}>💵 Hotovost</option>
          <option value="account" ${(!w.type||w.type==='account')?'selected':''}>🏦 Běžný účet</option>
          <option value="savings" ${w.type==='savings'?'selected':''}>🐷 Spořicí účet</option>
          <option value="investment" ${w.type==='investment'?'selected':''}>📈 Investice</option>
          <option value="card" ${w.type==='card'?'selected':''}>💳 Kreditní karta</option>
          <option value="other" ${w.type==='other'?'selected':''}>📦 Jiné</option>
        </select>
      </div>
      <div class="fg"><label>Název účtu</label>
        <input class="fi" id="onbWalletName" placeholder="např. Běžný účet" value="${(w.name||'').replace(/"/g,'&quot;')}">
      </div>
    </div>` : ''}

    <div class="frow">
      <div class="fg"><label>💳 Výchozí typ platby</label>
        <select class="fs" id="onbPayType">
          <option value="" ${!_settings?.defPayType?'selected':''}>– žádný –</option>
          ${((typeof getPayTypes==='function')?getPayTypes():[]).map(t=>`<option value="${t.id}" ${_settings?.defPayType===t.id?'selected':''}>${t.icon||'💳'} ${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label>📅 Formát data</label>
        <select class="fs" id="onbDateFmt">
          <option value="cs"  ${(_settings?.dateFmt||'cs')==='cs'?'selected':''}>DD.MM.YYYY (česky)</option>
          <option value="iso" ${_settings?.dateFmt==='iso'?'selected':''}>YYYY-MM-DD (ISO)</option>
          <option value="us"  ${_settings?.dateFmt==='us'?'selected':''}>MM/DD/YYYY (US)</option>
        </select>
      </div>
    </div>

    <div class="frow">
      <div class="fg"><label>🔁 Frekvence výplaty</label>
        <select class="fs" id="onbPayFreq">
          <option value="monthly"   ${(!_settings?.payFreq||_settings?.payFreq==='monthly')?'selected':''}>📅 Měsíčně</option>
          <option value="biweekly"  ${_settings?.payFreq==='biweekly'?'selected':''}>📆 Každých 14 dní</option>
          <option value="weekly"    ${_settings?.payFreq==='weekly'?'selected':''}>🗓️ Týdně</option>
          <option value="semimonthly" ${_settings?.payFreq==='semimonthly'?'selected':''}>🔂 2× měsíčně</option>
          <option value="irregular" ${_settings?.payFreq==='irregular'?'selected':''}>🎲 Nepravidelně</option>
        </select>
      </div>
      <div class="fg"><label>📆 Den výplaty</label>
        <select class="fs" id="onbFirstDay">
          <option value="0" ${!(_settings?.firstDay>0)?'selected':''}>🤖 Automaticky</option>
          ${Array.from({length:28},(_,i)=>i+1).map(d=>`<option value="${d}" ${(_settings?.firstDay||0)==d?'selected':''}>${d}. den v měsíci</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="fg">
      <label>🏦 Máš aktivní půjčku nebo hypotéku?</label>
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:6px;line-height:1.5">
        Ovlivňuje jen to, jestli Finanční skóre umí spočítat zadluženost –
        appka to jinak nikde nehodnotí.
      </div>
      <div class="type-toggle" style="grid-template-columns:1fr 1fr 1fr">
        <div class="tt" id="onbDebtYes" onclick="onbSetHasDebts('true')">Ano</div>
        <div class="tt" id="onbDebtNo" onclick="onbSetHasDebts('false')">Ne</div>
        <div class="tt" id="onbDebtUnknown" onclick="onbSetHasDebts('')">Zatím nevím</div>
      </div>
      <input type="hidden" id="onbHasDebts" value="${_settings?.hasDebts===false?'false':(_settings?.hasDebts===true?'true':'')}">
    </div>
  `;
  // Obarvit už zvolenou možnost dluhu (hodnota už je v hidden poli z výše)
  onbSetHasDebts(document.getElementById('onbHasDebts').value);
}

function onbSetHasDebts(val) {
  const hid = document.getElementById('onbHasDebts');
  if (hid) hid.value = val;
  ['onbDebtYes', 'onbDebtNo', 'onbDebtUnknown'].forEach(id => {
    const e = document.getElementById(id); if (e) e.classList.remove('sel-transfer');
  });
  const map = { 'true': 'onbDebtYes', 'false': 'onbDebtNo', '': 'onbDebtUnknown' };
  const target = document.getElementById(map[val]);
  if (target) target.classList.add('sel-transfer');
}

function onboardingSave() {
  _settings.lang = document.getElementById('onbLang')?.value || 'cs';
  _settings.currency = document.getElementById('onbCurrency')?.value || 'CZK';
  _settings.defPayType = document.getElementById('onbPayType')?.value || '';
  _settings.dateFmt = document.getElementById('onbDateFmt')?.value || 'cs';
  _settings.payFreq = document.getElementById('onbPayFreq')?.value || 'monthly';
  _settings.firstDay = parseInt(document.getElementById('onbFirstDay')?.value) || 0;

  const hd = document.getElementById('onbHasDebts')?.value;
  if (hd === 'true') _settings.hasDebts = true;
  else if (hd === 'false') _settings.hasDebts = false;
  // "Zatím nevím" → hd==='' → necháme _settings.hasDebts nedotčené (appka
  // nesmí předstírat, že ví – TODO-227 gating v premium.js na tom stojí).

  // První peněženka: typ + volitelný název (jen pokud existuje – vždy díky ensureBaseData/FIX-264)
  if (Array.isArray(S.wallets) && S.wallets.length) {
    const wt = document.getElementById('onbWalletType')?.value;
    const wn = document.getElementById('onbWalletName')?.value?.trim();
    if (wt) S.wallets[0].type = wt;
    if (wn) S.wallets[0].name = wn;
    S.wallets[0].currency = _settings.currency || S.wallets[0].currency || 'CZK';
  }

  _settings.onboardingDone = true;
  _persistOnboardingSettings();
  if (typeof save === 'function') save();   // uloží změněnou peněženku (Firebase/local)
  if (typeof applyLanguage === 'function') applyLanguage();
  closeModal('modalOnboarding');
  if (typeof showToast === 'function') showToast('✅ Nastaveno – kdykoli to změníš v Nastavení');
  if (typeof renderPage === 'function') renderPage();
}

function onboardingSkip() {
  _settings.onboardingDone = true;
  _persistOnboardingSettings();
  closeModal('modalOnboarding');
}

function _persistOnboardingSettings() {
  if (window._currentUser && !_isLocalMode) {
    _set(_ref(_db, `users/${window._currentUser.uid}/settings`), _settings)
      .catch(e => console.error('Onboarding settings save error:', e));
  } else if (_isLocalMode) {
    try { localStorage.setItem('ff_v43_settings', JSON.stringify(_settings)); } catch (e) {}
  }
}

// Dočasná pomůcka pro ruční test (S20): existující účet uvidí modal automaticky
// jen jako opravdu nový uživatel (ADR-116) – jinak ho nezobrazí NIKDY, ani po
// smazání _settings.onboardingDone. Pro náhled na vlastním účtu otevři konzoli
// prohlížeče (F12 → Konzole) a napiš: previewOnboarding()
window.previewOnboarding = openOnboardingModal;
