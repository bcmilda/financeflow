// FinanceFlow · v11.02 · premium.js · 2026-09-25
//  PREMIUM SYSTEM
// ══════════════════════════════════════════════════════
// S21 (Milan): „rodina" a „sdileni" ze seznamu VEN. Zamykala se celá stránka,
//   takže Free uživatel neviděl ani vlastní sdílecí ID a nemohl se s nikým spojit
//   – přitom sdílení je čtení z Firebase, ne AI volání, a nic nás nestojí.
//   Za diamantem zůstává to, co stojí peníze (AI) nebo je skutečná prémie.
const PREMIUM_PAGES = ['predikce','grafy','ai','narozeniny','uctenky','nakup','report2','inflace'];
const TRIAL_DAYS = 30;

// ══════════════════════════════════════════════════════
//  S12.1p: TIER SYSTÉM free / premium / pro (trial = premium)
//  ADMIN_UID má vždy plný přístup (pro).
// ══════════════════════════════════════════════════════
const TIER_PRICES = { premium: 149, pro: 299 }; // Kč/měsíc

// Funkce vyžadující AI volání – Free je NEMÁ (kromě 1× CSV import řešeného bez AI).
// Hodnota = minimální tier. 'admin' = jen administrátor (skrýt ostatním).
const FEATURE_TIERS = {
  aiRadce:        'premium',  // AI Rádce (advisor + měsíční report poradce)
  bankImport:     'premium',  // Import z PDF výpisu – Premium (CSV/Excel zdarma)
  receiptAnalyze: 'premium',  // Analýza účtenek (foto → AI)
  shoppingList:   'premium',  // Nákupní seznam
  // S21: sdílení a rodinný souhrn jsou nově zdarma (viz PREMIUM_PAGES výš).
  //   Klíč zůstává kvůli případnému limitu počtu partnerů – dnes nic nezamyká.
  sharing:        'free',     // Sdílení s partnerem / rodinný souhrn
  reportAdvisor:  'premium',  // Poradce v měsíčním reportu
};

// Vrátí efektivní tier uživatele: 'free' | 'premium' | 'pro'
function getUserTier() {
  if (typeof isAdmin === 'function' && isAdmin()) return 'pro';
  if (!_premiumStatus) return 'premium'; // během načítání nezamykej (UX)
  const t = _premiumStatus.type;
  if (t === 'pro') return 'pro';
  if (t === 'premium' || t === 'trial') return 'premium'; // trial = premium
  return 'free';
}

// Má uživatel aspoň daný tier? (pořadí free < premium < pro)
function hasTier(min) {
  const order = { free: 0, premium: 1, pro: 2 };
  return (order[getUserTier()] || 0) >= (order[min] || 0);
}

// Centrální brána funkce: smí uživatel použít danou funkci?
function canUseFeature(key) {
  const need = FEATURE_TIERS[key];
  if (!need) return true;
  if (need === 'admin') return (typeof isAdmin === 'function' && isAdmin());
  return hasTier(need);
}

// Zamítnutí + výzva k upgradu (zobrazí paywall / hlášku)
function gateFeature(key, label) {
  if (canUseFeature(key)) return true;
  const need = FEATURE_TIERS[key];
  if (need === 'admin') {
    alert('🔒 Tato funkce je zatím dostupná jen pro administrátora.');
  } else {
    if (typeof showPaywall === 'function') showPaywall();
    else alert(`🔒 ${label||'Tato funkce'} je součástí Premium.\n\nPremium ${TIER_PRICES.premium} Kč/měsíc · Pro ${TIER_PRICES.pro} Kč/měsíc.`);
  }
  return false;
}

let _premiumStatus = null; // null=loading, {type:'free'|'trial'|'premium', daysLeft, until}

// S17.29 (Milan): kontrola zablokovaného účtu. Čte se top-level banned/{uid} (uživatel má
// právo číst jen svůj vlastní záznam a nemůže do něj zapisovat). Při zablokování se překryje
// celá aplikace – data zůstávají v Firebase nedotčená, jen se k nim uživatel nedostane.
async function checkBanned(uid) {
  try {
    const snap = await _get(_ref(_db, `banned/${uid}`));
    if (!snap.exists() || !snap.val()) return false;
    const b = snap.val();
    const el = document.createElement('div');
    el.id = 'bannedOverlay';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:var(--bg,#0c101c);display:flex;align-items:center;justify-content:center;padding:24px;text-align:center';
    el.innerHTML = `<div style="max-width:420px">
      <div style="font-size:3rem;margin-bottom:14px">🚫</div>
      <div style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800;color:#e8eaf2;margin-bottom:10px">Účet je zablokovaný</div>
      <div style="font-size:.86rem;color:#a8aec8;line-height:1.6;margin-bottom:18px">${b.reason || 'Porušení podmínek použití'}</div>
      <div style="font-size:.76rem;color:#a8aec8;line-height:1.6">Tvoje data zůstávají uložená. Pokud jde o omyl, napiš na
        <a href="mailto:info@financeflow.cz" style="color:var(--bank)">info@financeflow.cz</a>.</div>
      <button onclick="window.signOut&&window.signOut()" style="margin-top:18px;padding:9px 18px;border-radius:9px;border:1px solid var(--border);background:transparent;color:#c9cede;cursor:pointer;font-size:.82rem">Odhlásit se</button>
    </div>`;
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    return true;
  } catch (e) { return false; }  // chyba čtení nesmí uzamknout legitimní uživatele
}

async function loadPremiumStatus(uid) {
  if (await checkBanned(uid)) { _premiumStatus = { type: 'free', daysLeft: 0, until: 0 }; return; }
  // S17.41: načti počet zakládajících míst dopředu, ať goPremium nemusí čekat na fetch
  // (jinak by window.open po awaitu spadl do popup blockeru)
  if (typeof preloadFounderSlots === 'function') preloadFounderSlots();
  try {
    const snap = await _get(_ref(_db, `users/${uid}/premium`));
    const now = Date.now();
    if (!snap.exists()) {
      // Nový uživatel = FREE (trial je opt-in přes tlačítko, ne automaticky)
      await _set(_ref(_db, `users/${uid}/premium`), {
        type: 'free',
        createdAt: now
      });
      _premiumStatus = { type: 'free', daysLeft: 0, until: 0, trialUsed: false };
    } else {
      const p = snap.val();
      const _tu = !!p.trialUsed;   // S17.37: rozliší nováčka od vyčerpaného trialu
      if (p.type === 'premium' || p.type === 'pro') {
        const until = p.premiumUntil || 0;
        if (until > now) {
          _premiumStatus = { type: p.type, daysLeft: null, until, trialUsed: _tu };
        } else {
          _premiumStatus = { type: 'free', daysLeft: 0, until: 0, trialUsed: _tu };
        }
      } else if (p.type === 'trial') {
        const daysLeft = Math.max(0, Math.ceil((p.trialUntil - now) / (24*60*60*1000)));
        if (daysLeft > 0) {
          _premiumStatus = { type: 'trial', daysLeft, until: p.trialUntil, trialUsed: true };
        } else {
          // Trial vypršel – přechod na FREE (žádné automatické prodlužování)
          await _update(_ref(_db, `users/${uid}/premium`), { type: 'free' });
          _premiumStatus = { type: 'free', daysLeft: 0, until: 0, trialUsed: true };
        }
      } else {
        _premiumStatus = { type: 'free', daysLeft: 0, until: 0, trialUsed: _tu };
      }
    }
  } catch(e) {
    console.error('Premium load error:', e);
    _premiumStatus = { type: 'trial', daysLeft: TRIAL_DAYS, until: Date.now() + TRIAL_DAYS*24*60*60*1000 };
  }
  updatePremiumUI();
}

function hasPremiumAccess() {
  // Premium přístup = trial nebo zaplacený premium/pro (NE free)
  if (!_premiumStatus) return true; // během načítání nezamykej (UX)
  const t = _premiumStatus.type;
  return t === 'premium' || t === 'pro' || t === 'trial';
}

function updatePremiumUI() {
  if (!_premiumStatus) return;
  // Dynamický tier label v sidebaru
  const tierEl = document.getElementById('sidebarTierLabel');
  if (tierEl) {
    const t = _premiumStatus.type;
    if (t === 'premium') tierEl.textContent = 'Premium';
    else if (t === 'pro') tierEl.textContent = 'Pro';
    else if (t === 'trial') tierEl.textContent = 'Trial';
    else tierEl.textContent = 'Free';
  }
  const banner = document.getElementById('premiumBanner');
  const locks = document.querySelectorAll('[id^="navlock-"]');

  if (_premiumStatus.type === 'premium') {
    if (banner) {
      banner.style.display = 'block';
      banner.innerHTML = `<div style="display:flex;align-items:center;gap:7px;padding:8px 12px;background:var(--premium-bg);border:1px solid var(--premium-border);border-radius:10px;cursor:pointer" onclick="showPaywall()">
        <span style="font-size:1rem">💎</span>
        <div style="flex:1"><div style="font-size:.75rem;font-weight:700;color:var(--premium)">PREMIUM AKTIVNÍ</div>
        <div style="font-size:.65rem;color:#a8aec8">Platné do ${new Date(_premiumStatus.until).toLocaleDateString('cs-CZ')}</div></div>
      </div>`;
    }
    locks.forEach(l => l.style.display = 'none');
  } else if (_premiumStatus.type === 'trial') {
    if (banner) {
      banner.style.display = 'block';
      const urgent = _premiumStatus.daysLeft <= 7;
      banner.innerHTML = `<div class="trial-banner" onclick="showPaywall()">
        <div class="trial-banner-days">${_premiumStatus.daysLeft}</div>
        <div style="flex:1"><div style="font-size:.76rem;font-weight:700;color:${urgent?'#f87171':'#60a5fa'}">${urgent?'⚠️ Trial brzy vyprší!':'🎁 Trial zdarma'}</div>
        <div style="font-size:.67rem;color:#a8aec8">dní zbývá · klikni pro upgrade</div></div>
        <span style="font-size:.7rem;color:var(--text3)">→</span>
      </div>`;
    }
    locks.forEach(l => l.style.display = 'none');
  } else {
    // Free – zobraz zámky
    // S17.37 (FIX-221, Milan): DŘÍV tu svítilo „Trial vypršel" VŠEM Free uživatelům – tedy
    // i nováčkům, kteří trial nikdy neměli. Odrazovalo to od vyzkoušení („už jsem o to přišel").
    // Nově se rozlišuje, jestli uživatel trial už vyčerpal (trialUsed), nebo ho teprve může vzít.
    if (banner) {
      const used = !!(_premiumStatus && _premiumStatus.trialUsed);
      banner.style.display = 'block';
      banner.innerHTML = used
        ? `<div style="padding:8px 12px;background:var(--expense-bg);border:1px solid rgba(248,113,113,.3);border-radius:10px;cursor:pointer;font-size:.76rem;color:var(--text2);text-align:center" onclick="showPaywall()">
            🔒 Trial vypršel · <strong style="color:var(--premium)">Upgradovat na Premium</strong>
          </div>`
        : `<div style="padding:8px 12px;background:rgba(139,124,246,.12);border:1px solid rgba(139,124,246,.35);border-radius:10px;cursor:pointer;font-size:.76rem;color:var(--text2);text-align:center" onclick="showPaywall()">
            ✨ <strong style="color:var(--premium)">30 dní Premium zdarma</strong> · bez karty
          </div>`;
    }
    locks.forEach(l => l.style.display = 'inline-flex');
  }
}

function showPagePremium(name, el) {
  // Block sharing features in local mode
  if(_isLocalMode && (name==='sdileni'||name==='rodina')) {
    alert('📱 Sdílení s partnerem není dostupné v režimu "Bez účtu".\n\nPro sdílení se přihlaste přes Google účet v Nastavení.');
    return;
  }
  // FIX-310 (S21): tahle funkce se jmenuje showPagePremium, ale PREMIUM_PAGES
  //   nikdy NEČETLA – zamykala všechno, co přes ni prošlo. Vyndat stránku ze
  //   seznamu (v10.34) proto nestačilo: diamant ze sidebaru zmizel, ale po
  //   kliknutí pořád vyskočil paywall a stránka byla nepoužitelná.
  //   Seznam je od téhle chvíle jediný zdroj pravdy o tom, co je placené.
  const jePlacena = Array.isArray(PREMIUM_PAGES) ? PREMIUM_PAGES.includes(name) : true;
  if (!jePlacena || hasPremiumAccess()) {
    showPage(name, el);
  } else {
    showPaywall();
  }
}

function showPaywall() {
  // Ulož aktuální sekci aby closePaywall věděl kam se vrátit
  window._paywallReturnPage = (typeof S !== 'undefined' && S.page) ? S.page : null;
  document.getElementById('paywallScreen').classList.add('open');
  // S17.39: přizpůsob tlačítka stavu uživatele (trial / platba / správa předplatného)
  if (typeof updatePaywallCtas === 'function') updatePaywallCtas();
  // Zastav scroll pod paywallem
  document.body.style.overflow = 'hidden';
}

function closePaywall() {
  document.getElementById('paywallScreen').classList.remove('open');
  document.body.style.overflow = '';
  // Nenaviguj nikam – zůstaň na stránce kde byl uživatel před otevřením paywallu
  // (žádný renderPage() call zde – to způsobovalo "pád" na dashboard)
}

// Normalizace e-mailu na Firebase klíč (tečka/$/#/[/]/ jsou zakázané v RTDB klíčích)
function _emailKey(email) {
  return (email||'').toLowerCase().trim().replace(/[.#$\[\]\/]/g, '_');
}

async function startTrial() {
  const user = window._currentUser;
  if (!user) { alert('Nejprve se přihlas.'); return; }

  if (_premiumStatus && (_premiumStatus.type === 'trial' || _premiumStatus.type === 'premium' || _premiumStatus.type === 'pro')) {
    closePaywall();
    alert('✅ Už máš aktivní přístup.');
    return;
  }

  const uid = user.uid;
  const eKey = _emailKey(user.email);
  try {
    const psnap = await _get(_ref(_db, `users/${uid}/premium`));
    if (psnap.exists() && psnap.val().trialUsed) {
      alert('⚠️ Trial už byl na tomto účtu využit. Pro další přístup si předplať Premium.');
      return;
    }
    if (eKey) {
      // S17.36 (FIX-220): čtení dedup uzlu obalené – dřív při chybějícím oprávnění vyhodilo
      // výjimku a uživatel dostal jen „Nepodařilo se aktivovat trial" bez vysvětlení.
      try {
        const esnap = await _get(_ref(_db, `trialsUsed/${eKey}`));
        if (esnap.exists()) {
          alert('⚠️ Trial už byl využit pro tento e-mail. Pro další přístup si předplať Premium.');
          return;
        }
      } catch(e2) { console.warn('trialsUsed čtení selhalo, pokračuji:', e2); }
    }
    const now = Date.now();
    const trialUntil = now + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    await _set(_ref(_db, `users/${uid}/premium`), {
      type: 'trial',
      trialUntil,
      trialUsed: true,
      createdAt: (psnap.exists() && psnap.val().createdAt) || now
    });
    // S17.36 (FIX-220): zápis do trialsUsed je jen DEDUPLIKACE napříč účty. Když selže
    // (pravidla, offline), NESMÍ shodit celou aktivaci – trial už je zapsaný v users/{uid}.
    if (eKey) {
      try { await _set(_ref(_db, `trialsUsed/${eKey}`), { uid, at: now }); }
      catch(e2) { console.warn('trialsUsed zápis selhal (trial přesto aktivní):', e2); }
    }
    _premiumStatus = { type: 'trial', daysLeft: TRIAL_DAYS, until: trialUntil };
    updatePremiumUI();
    closePaywall();
    alert('🎉 Trial aktivován! Máš 30 dní plného přístupu ke všem Premium funkcím zdarma.');
  } catch(e) {
    console.error('startTrial error:', e);
    // S17.36 (FIX-220, Milan): rozlišit příčinu – „zkus to znovu" u chyby oprávnění nepomůže
    // a uživatel klikal donekonečna. PERMISSION_DENIED = chyba na naší straně, ne uživatele.
    const msg = String(e && (e.code || e.message) || '');
    if (/permission|PERMISSION_DENIED/i.test(msg)) {
      alert('⚠️ Trial se nepodařilo aktivovat kvůli chybě nastavení na naší straně.\n\nNapiš prosím na info@financeflow.cz – opravíme to a přístup ti aktivujeme ručně.');
    } else if (/network|offline|unavailable/i.test(msg)) {
      alert('📡 Nejsi připojený k internetu. Zkus to znovu, až budeš online.');
    } else {
      alert('Nepodařilo se aktivovat trial. Zkus to prosím znovu, nebo napiš na info@financeflow.cz.');
    }
  }
}

// S17.41 (FIX-223, Milan): tři chyby najednou
//  1) POPUP BLOCKER: window.open se volal až PO `await` (zjišťování zakládajících míst),
//     takže ho Firefox nepovažoval za reakci na klik a zablokoval. Řešení: počet míst se
//     načítá DOPŘEDU při startu a drží v cache → checkout se otevře synchronně z kliku.
//  2) confirm() s textem „Storno = běžné ceny" – prohlížeč ale tlačítko pojmenuje „Zrušit“,
//     takže popis nesouhlasil s realitou. Nahrazeno vlastním modalem.
//  3) Ptát se „chceš levnější cenu napořád?" nemá smysl – nikdo neřekne ne. Zakládající
//     cena se teď nabízí rovnou jako výchozí volba, ne jako dotaz.
let _founderSlotsCache = null;
async function preloadFounderSlots() {
  if (typeof getFounderSlotsLeft !== 'function') return;
  try { _founderSlotsCache = await getFounderSlotsLeft(); } catch(e) { _founderSlotsCache = null; }
}

// ══════════════════════════════════════════════════════
//  S23 (TODO-294): PLAY REŽIM
//  Aplikace stažená z Google Play nesmí uživatele vést k nákupu mimo Google
//  (žádné klikací odkazy ani tlačítka na Stripe). Google ale výslovně dovoluje
//  NAPSAT, kde se předplatné koupí – bez odkazu. Na webu se nic nemění,
//  tlačítka tam fungují dál.
//
//  Jak se pozná: TWA otevírá web s document.referrer = „android-app://<balík>".
//  Referrer je jen u prvního načtení, proto se výsledek uloží a dál se čte
//  z úložiště. Ručně jde režim zapnout ?play=1 (test) a vypnout ?play=0.
const PLAY_BALIK = 'cz.financeflow.app';
//  S23 FIX (Milan): příznak NESMÍ do localStorage. TWA běží uvnitř Chromu
//  a sdílí s ním úložiště pro stejnou doménu — příznak zapsaný v appce z Play
//  si pak přečetl i obyčejný panel prohlížeče a na WEBU zmizelo tlačítko
//  k nákupu. sessionStorage je vázaný na jedno okno: appka z Play a panel
//  v prohlížeči ho mají každý svůj, a uvnitř appky vydrží i při přechodech
//  mezi stránkami (kde už referrer není).
function isPlayApp() {
  try {
    const q = new URLSearchParams(location.search).get('play');
    if (q === '1') { sessionStorage.setItem('ff_playApp', '1'); return true; }
    if (q === '0') { sessionStorage.removeItem('ff_playApp'); try { localStorage.removeItem('ff_playApp'); } catch (e) {} return false; }
    try { localStorage.removeItem('ff_playApp'); } catch (e) {}   // úklid po v10.98–10.99
    if (document.referrer && document.referrer.startsWith('android-app://')) {
      if (document.referrer.includes(PLAY_BALIK)) { sessionStorage.setItem('ff_playApp', '1'); return true; }
      return false;
    }
    return sessionStorage.getItem('ff_playApp') === '1';
  } catch (e) { return false; }
}
window.isPlayApp = isPlayApp;

//  Text místo nákupního tlačítka. ZÁMĚRNĚ bez odkazu a bez tlačítka –
//  klikací cesta k nákupu je to, co Google zakazuje.
function playInfoHTML(kompakt) {
  return `<div class="ff-play-info" style="border:1px dashed var(--border2);border-radius:12px;padding:${kompakt ? '10px 12px' : '14px 16px'};
      background:var(--surface2);font-size:${kompakt ? '.78rem' : '.84rem'};color:#c9cede;line-height:1.55">
      💎 <b>Premium si aktivuješ na webu financeflow.cz</b><br>
      <span style="color:#a8aec8">Přihlas se tam stejným účtem; tady se ti Premium odemkne samo.</span>
    </div>`;
}
window.playInfoHTML = playInfoHTML;

//  Projde stránku a v Play režimu vymění nákupní tlačítka za text.
//  Volá se po vykreslení (ceník v app.html je statický, paywall dynamický).
function applyPlayMode() {
  //  Na webu navíc uklidí text, který se tam mohl dostat kvůli sdílenému
  //  úložišti s TWA (v10.98–10.99).
  if (!isPlayApp()) { document.querySelectorAll('.ff-play-info').forEach(el => el.remove()); return; }
  //  Každý běh nejdřív smaže staré texty – paywall se překresluje a bez toho
  //  se hláška zdvojovala (Milan viděl tři pod sebou).
  document.querySelectorAll('.ff-play-info').forEach(el => el.remove());
  const vymen = el => {
    if (!el) return;
    el.insertAdjacentHTML('afterend', playInfoHTML(true));
    el.remove();
  };
  //  S23 (Milan): 30denní TRIÁL v Play verzi ZŮSTÁVÁ – je zdarma, žádná
  //  platba se u něj nekoná, takže pravidla Googlu ho nezakazují. Vymění se
  //  jen skutečný nákup. Pod tlačítko se přidá informace, kde koupit dál.
  const trial = document.getElementById('tierPremiumCta');
  if (trial) trial.insertAdjacentHTML('afterend', playInfoHTML(true));
  //  Cokoli, co vede na platbu – i kdyby přibylo nové tlačítko.
  document.querySelectorAll('[onclick*="startPremiumSubscription"],[onclick*="openDonateModal"],[onclick*="goPremium"]').forEach(el => {
    if (el.id === 'tierPremiumCta') return;
    if ((el.getAttribute('onclick') || '').includes('startTrial')) return;   // triál je zdarma
    if (el.closest('#planChoiceModal')) return;
    vymen(el);
  });
}
window.applyPlayMode = applyPlayMode;
document.addEventListener('DOMContentLoaded', () => { try { applyPlayMode(); } catch (e) {} });

function goPremium() {

  // FIX-305 (S21): nenabízet výběr tarifu někomu, kdo Premium už má – druhá platba
  //   by založila druhé předplatné. Kontrola je i v startPremiumSubscription()
  //   (poslední záchrana), tady jde o to, aby se modal vůbec neotevřel.
  if (_premiumStatus && (_premiumStatus.type === 'premium' || _premiumStatus.type === 'pro')
      && _premiumStatus.until > Date.now()) {
    if (typeof showToast === 'function') {
      showToast('💎 Předplatné je aktivní do ' + new Date(_premiumStatus.until).toLocaleDateString('cs-CZ'));
    }
    return;
  }
  //  S23: v aplikaci z Google Play místo výběru tarifu jen informace.
  //  typeof – kdyby se premium.js načetl dřív než definice (a v testech).
  if (typeof isPlayApp === 'function' && isPlayApp()) {
    const host = document.getElementById('planChoiceModal');
    if (host) {
      host.innerHTML = `<div class="modal-content" style="max-width:420px">
        <div class="modal-header"><span class="modal-title">💎 Premium</span>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="closePlanChoice()">✕</button></div>
        <div class="modal-body">${playInfoHTML()}</div></div>`;
      host.classList.add('active');
    } else if (typeof showToast === 'function') {
      showToast('💎 Premium si aktivuješ na webu financeflow.cz');
    }
    return;
  }

  if (typeof startPremiumSubscription !== 'function') {
    alert('💳 Platební brána bude brzy dostupná!\n\nZatím můžeš vyzkoušet Premium na 30 dní zdarma.');
    return;
  }
  const left = _founderSlotsCache;
  const founder = (left !== null && left > 0);
  const host = document.getElementById('planChoiceModal');
  if (!host) {  // fallback bez modalu – ať se dá zaplatit i kdyby chybělo HTML
    startPremiumSubscription(founder ? 'founder' : 'monthly');
    return;
  }

  const opt = (period, title, price, note, hi) => `
    <button onclick="closePlanChoice();startPremiumSubscription('${period}')"
      style="width:100%;text-align:left;padding:13px 15px;border-radius:12px;cursor:pointer;margin-bottom:9px;
      border:1px solid ${hi ? 'var(--premium)' : 'var(--border)'};
      background:${hi ? 'rgba(251,191,36,.10)' : 'var(--surface2)'}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">
        <span style="font-size:.86rem;font-weight:700;color:#e8eaf2">${title}</span>
        <span style="font-family:Syne,sans-serif;font-size:1.05rem;font-weight:800;color:${hi ? 'var(--premium)' : '#e8eaf2'}">${price}</span>
      </div>
      <div style="font-size:.72rem;color:#a8aec8;margin-top:3px">${note}</div>
    </button>`;

  host.innerHTML = `
    <div style="position:fixed;inset:0;z-index:9000;background:rgba(6,8,15,.78);display:flex;align-items:center;justify-content:center;padding:18px" onclick="if(event.target===this)closePlanChoice()">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;max-width:390px;width:100%;max-height:88vh;overflow-y:auto">
        <div style="font-family:Syne,sans-serif;font-size:1.05rem;font-weight:800;color:#e8eaf2;margin-bottom:4px">Vyber si předplatné</div>
        ${founder ? `<div style="font-size:.75rem;color:var(--premium);margin-bottom:12px">🎉 Zakládající cena – zbývá ${left} míst ze 100. Cenu si zamkneš napořád.</div>`
                  : `<div style="font-size:.75rem;color:#a8aec8;margin-bottom:12px">Zrušíš kdykoli, bez závazků.</div>`}
        ${founder ? opt('founder_yearly', 'Ročně – zakládající', '990 Kč', 'ušetříš 198 Kč oproti měsíčně · navždy', true) : ''}
        ${founder ? opt('founder', 'Měsíčně – zakládající', '99 Kč', 'běžná cena 149 Kč · navždy', true) : ''}
        ${founder ? `<div style="height:1px;background:var(--border);margin:12px 0"></div>
          <div style="font-size:.7rem;color:#a8aec8;margin-bottom:8px">Běžné ceny</div>` : ''}
        ${opt('yearly', 'Ročně', '1490 Kč', 'ušetříš 298 Kč oproti měsíčně', !founder)}
        ${opt('monthly', 'Měsíčně', '149 Kč', 'bez závazků', false)}
        <button onclick="closePlanChoice()" style="width:100%;padding:9px;border-radius:10px;border:1px solid var(--border);background:transparent;color:#a8aec8;font-size:.8rem;cursor:pointer;margin-top:4px">Zpět</button>
      </div>
    </div>`;
  host.style.display = 'block';
}
function closePlanChoice() {
  const h = document.getElementById('planChoiceModal');
  if (h) { h.style.display = 'none'; h.innerHTML = ''; }
}

// Dokup AI tokenů – placeholder dokud není Stripe (ADR-053). 1 token = 1 AI akce.
const CREDIT_PACKS = {
  small: { tokens: 10, price: 39 },
  big:   { tokens: 20, price: 69 },
};
function buyCredits(pack) {
  const p = CREDIT_PACKS[pack];
  if (!p) return;
  alert('⚡ Dokup ' + p.tokens + ' AI tokenů za ' + p.price + ' Kč bude brzy dostupný.\n\nPlatební brána Stripe se připravuje. Tokeny se po nákupu připíšou jen na tvůj účet a nepropadají s měsíční obnovou.');
}

// Pro testování – admin může ručně nastavit premium
async function activatePremiumManually(uid, months, tier) {
  tier = tier || 'premium';
  const until = Date.now() + months * 30 * 24 * 60 * 60 * 1000;
  await _set(_ref(_db, `users/${uid}/premium`), {
    type: tier,
    premiumUntil: until,
    activatedAt: Date.now(),
    activatedBy: 'manual'
  });
  await loadPremiumStatus(uid);
  alert(`✅ ${tier==='pro'?'Pro':'Premium'} aktivováno na ${months} měsíců!`);
}

// ══════════════════════════════════════════════════════
//  PENĚŽENKY
// ══════════════════════════════════════════════════════
const WALLET_TYPES = {cash:'💵 Hotovost',account:'🏦 Běžný účet',savings:'🐷 Spořicí',investment:'📈 Investice',card:'💳 Kreditní karta',other:'📦 Jiné'};

// ══════════════════════════════════════════════════════════════════════
//  TODO-241 (S21, Milan): SMAZANÁ PENĚŽENKA = ZTRACENÁ MĚNA
//  Peněženka nese MĚNU. Když zmizí, transakce sice zůstanou, ale ztratí
//  informaci, v čem byly – a txCZK je pak spočítá kurzem CZK. Nákup za 100 €
//  se sečte jako 100 Kč. Není to schovaná částka, ale ŠPATNÁ částka, a projeví
//  se všude: v součtech, grafech, rodinném souhrnu i ve skóre.
//  (Milanova Kontrola integrity hlásila 52 takových transakcí.)
//
//  Vrátit smazanou peněženku nejde, takže jediná spolehlivá cesta je NENECHAT
//  ji smazat: použitá peněženka se ARCHIVUJE. Zmizí z nabídek, ale zůstane
//  v datech, takže si transakce svou měnu podrží. Prázdnou peněženku, na
//  kterou nic neodkazuje, jde smazat úplně – tam není o co přijít.
// ══════════════════════════════════════════════════════════════════════
function getWallets(D, vcetneArchivu) {
  const all = (D||getData()).wallets || [];
  return vcetneArchivu ? all : all.filter(w => !w.archived);
}
// Vyhledání podle id musí najít I archivovanou – jinak by transakce zase
// ztratila měnu, jen jinou cestou.
function findWallet(id, D) {
  return ((D||getData()).wallets || []).find(w => w.id === id) || null;
}
window.findWallet = findWallet;

// Kolik transakcí na peněžence visí (včetně obou stran přesunů).
function walletUsageCount(id, D) {
  D = D || getData();
  return (D.transactions||[]).filter(t =>
    t && (t.walletId === id || t.wallet === id || t.fromWallet === id || t.toWallet === id)
  ).length;
}
window.walletUsageCount = walletUsageCount;

function renderWalletList() {
  const D = getData(); const ro = viewingUid !== null;
  const el = document.getElementById('walletList'); if(!el) return;
  const wallets = getWallets(D);
  const archiv = getWallets(D, true).filter(w => w.archived);
  if(!wallets.length && !archiv.length) { el.innerHTML='<div class="empty"><div class="ei">👛</div><div class="et">Žádné peněženky. Přidej první!</div></div>'; return; }
  el.innerHTML = wallets.map(w => {
    const bal = computeWalletBalance(w.id, D);
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="width:40px;height:40px;border-radius:12px;background:${w.color||'#4ade80'}22;border:2px solid ${w.color||'#4ade80'}44;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${WALLET_TYPES[w.type]?.split(' ')[0]||'👛'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.9rem">${w.name}</div>
        <div style="font-size:.74rem;color:var(--text3)">${WALLET_TYPES[w.type]||'Jiné'} · ${w.currency||'CZK'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;font-size:.95rem;color:${bal>=0?'var(--income)':'var(--expense)'}">${fmtB(bal)}</div>
        <div style="font-size:.7rem;color:var(--text3)">${w.currency||'CZK'}</div>
      </div>
      ${!ro?`<div style="display:flex;gap:4px"><button class="btn btn-edit btn-icon btn-sm" onclick="editWallet('${w.id}')">✎</button><button class="btn btn-danger btn-icon btn-sm" onclick="deleteWallet('${w.id}')" title="Smazat nebo archivovat">✕</button></div>`:''}
    </div>`;
  }).join('')
  // TODO-241: archivované se ukazují zvlášť a jde je vrátit. Kdyby zmizely
  //   úplně, uživatel by nevěděl, kam se poděly, a marně by je zakládal znovu.
  + (archiv.length ? `<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:#a8aec8;margin-bottom:4px">📦 Archivované</div>
      <div style="font-size:.72rem;color:#a8aec8;margin-bottom:8px;line-height:1.5">Nenabízejí se při zadávání, ale jejich transakce si drží měnu i historii.</div>
      ${archiv.map(w=>`<div style="display:flex;align-items:center;gap:12px;padding:8px 0;opacity:.7">
        <div style="width:32px;height:32px;border-radius:10px;background:var(--surface3);display:flex;align-items:center;justify-content:center;flex-shrink:0">${WALLET_TYPES[w.type]?.split(' ')[0]||'👛'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:.84rem;font-weight:600">${w.name}</div>
          <div style="font-size:.7rem;color:#a8aec8">${w.currency||'CZK'} · ${walletUsageCount(w.id,D)} transakcí</div>
        </div>
        ${!ro?`<button class="btn btn-ghost btn-sm" onclick="unarchiveWallet('${w.id}')">↩ Vrátit</button>`:''}
      </div>`).join('')}
    </div>` : '');
  // Refresh transfer dropdowns
  renderTransferDropdowns(wallets);
  // Virtuální peněženka – cíle spoření (TODO-056)
  if (typeof onPenezenkyRender === 'function') onPenezenkyRender();
}

function computeWalletBalance(walletId, D) {
  D = D || getData();
  const wallet = findWallet(walletId, D);
  const startBal = wallet?.balance || 0;
  const txs = (D.transactions||[]).filter(t => t.wallet === walletId);
  return startBal + txs.reduce((a,t) => {
    if(t.type==='income') return a + t.amount;
    if(t.type==='expense') return a - t.amount;
    return a;
  }, 0);
}

// Zůstatek peněženky přepočtený na CZK (pro sumarizaci majetku/dashboardu)
function walletBalanceCZK(walletId, D) {
  D = D || getData();
  const w = findWallet(walletId, D);
  const bal = computeWalletBalance(walletId, D);
  return (typeof toCZK==='function') ? toCZK(bal, w?.currency||'CZK') : bal;
}

function renderTransferDropdowns(wallets) {
  const D = getData();
  const goals = (D.wishes||[]).filter(w=>w.isGoal && w.done!==true);
  const walletOpts = wallets.map(w => `<option value="${w.id}">${WALLET_TYPES[w.type]?.split(' ')[0]||'👛'} ${w.name} (${w.currency||'CZK'})</option>`).join('');
  const goalOpts = goals.length ? `<optgroup label="🎯 Virtuální peněženka – cíle">`
        + goals.map(g=>`<option value="goal:${g.id}">🎯 ${g.name}</option>`).join('')
        + `</optgroup>` : '';
  // transferFrom: peněženky + virtuální cíle (lze převést i Z cíle zpět)
  const sel0 = document.getElementById('transferFrom');
  if(sel0) sel0.innerHTML = walletOpts + goalOpts;
  // transferTo: peněženky + virtuální cíle
  const selTo = document.getElementById('transferTo');
  if(selTo) selTo.innerHTML = walletOpts + goalOpts;
  const d = document.getElementById('transferDate');
  if(d && !d.value) d.value = new Date().toISOString().slice(0,10);
}

function openWalletModal() {
  ['editWalletId','walletName','walletBalance'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('walletType').value='account';
  document.getElementById('walletCurrency').value='CZK';
  document.getElementById('walletColor').value='#4ade80';
  document.getElementById('walletModalTitle').textContent='Přidat peněženku';
  document.getElementById('modalWallet').classList.add('open');
}
function editWallet(id) {
  const w = findWallet(id); if(!w) return;
  document.getElementById('editWalletId').value=id;
  document.getElementById('walletName').value=w.name;
  document.getElementById('walletType').value=w.type||'account';
  document.getElementById('walletCurrency').value=w.currency||'CZK';
  document.getElementById('walletBalance').value=w.balance||0;
  document.getElementById('walletColor').value=w.color||'#4ade80';
  document.getElementById('walletModalTitle').textContent='Upravit peněženku';
  document.getElementById('modalWallet').classList.add('open');
}
function saveWallet() {
  const eid=document.getElementById('editWalletId').value;
  const name=document.getElementById('walletName').value.trim();
  if(!name){alert('Zadej název');return;}
  const w={id:eid||uid(),name,type:document.getElementById('walletType').value,currency:document.getElementById('walletCurrency').value,balance:parseFloat(document.getElementById('walletBalance').value)||0,color:document.getElementById('walletColor').value};
  if(!S.wallets) S.wallets=[];
  if(eid){const i=S.wallets.findIndex(x=>x.id===eid);if(i>=0)S.wallets[i]=w;}
  else S.wallets.push(w);
  save(); closeModal('modalWallet'); renderWalletList();
}
function deleteWallet(id) {
  if(viewingUid) return;
  const w = findWallet(id, S);
  if(!w) return;
  const pocet = walletUsageCount(id, S);
  const mena = w.currency || 'CZK';

  if(pocet === 0){
    // Na nic neodkazuje → smazat je bezpečné, není o co přijít.
    if(!confirm(`Smazat peněženku „${w.name}"?\n\nŽádná transakce ji nepoužívá, takže se nic neztratí.`)) return;
    S.wallets = (S.wallets||[]).filter(x => x.id !== id);
    save(); renderWalletList();
    if(typeof showToast==='function') showToast('Peněženka smazána');
    return;
  }

  // TODO-241: použitou peněženku NELZE smazat, jen archivovat. Kdyby zmizela,
  //   ztratí se měna a částky by se přepočítaly kurzem CZK – tiše a špatně.
  const varovani = mena !== 'CZK'
    ? `\n\n⚠️ Peněženka je v ${mena}. Kdyby zmizela, appka by u těch transakcí nevěděla, v jaké měně byly, a spočítala by je jako koruny – částky by byly řádově jinde.`
    : '';
  if(!confirm(
      `Peněženku „${w.name}" používá ${pocet} ${pocet===1?'transakce':(pocet<5?'transakce':'transakcí')}.`
    + `${varovani}\n\nProto ji nelze smazat, ale můžeme ji ARCHIVOVAT:`
    + `\n· zmizí z nabídek při zadávání`
    + `\n· transakce si podrží měnu i historii`
    + `\n· kdykoli ji můžeš vrátit zpět`
    + `\n\nArchivovat?`)) return;

  w.archived = true;
  save(); renderWalletList();
  if(typeof showToast==='function') showToast(`📦 „${w.name}" archivována`);
}

function unarchiveWallet(id) {
  if(viewingUid) return;
  const w = findWallet(id, S); if(!w) return;
  delete w.archived;
  save(); renderWalletList();
  if(typeof showToast==='function') showToast(`„${w.name}" vrácena mezi aktivní`);
}
window.unarchiveWallet = unarchiveWallet;
// Najdi ID kategorie podle jména v reálných datech uživatele (žádné vymyšlené ID)
function findCatIdByName(name){
  const D = getData();
  const cat = (D.categories||[]).find(c => c.name === name);
  return cat ? cat.id : undefined;
}

// ── Měnový přepočet do CZK (sdílí kurzy s debts.js _FX_RATES) ──
function toCZK(amount, currency){
  if(!currency || currency==='CZK') return amount;
  const rates = (typeof _FX_RATES!=='undefined') ? _FX_RATES : {EUR:25.3,USD:23.1,PLN:5.7,GBP:29.5,CHF:26.8,HUF:0.062,SKK:1.0};
  const r = rates[currency] || 1;
  return amount * r;
}
function doTransfer() {
  const from=document.getElementById('transferFrom').value;
  const to=document.getElementById('transferTo').value;
  let amt=parseFloat(document.getElementById('transferAmt').value)||0;
  const date=document.getElementById('transferDate').value||new Date().toISOString().slice(0,10);
  const note=document.getElementById('transferNote').value.trim();
  if(!from||!to){alert('Vyber obě peněženky');return;}
  if(from===to){alert('Peněženky musí být různé');return;}
  if(amt<=0){alert('Zadej částku');return;}

  // PŘEVOD Z VIRTUÁLNÍHO CÍLE ZPĚT NA PENĚŽENKU (from = goal:ID)
  if(from.startsWith('goal:')) {
    const goalId = from.slice(5);
    const D = getData();
    const goal = (D.wishes||[]).find(w=>w.id===goalId);
    if(!goal){alert('Cíl nenalezen');return;}
    if(to.startsWith('goal:')){alert('Převod mezi cíli není podporován');return;}
    const wDest = findWallet(to);
    const destCur = wDest?.currency || 'CZK';
    // Z cíle (CZK) na peněženku v její měně
    const savedNow = (typeof goalGetSaved==='function')?goalGetSaved(goalId):0;
    if(amt > savedNow){ alert(`V cíli je naspořeno jen ${fmtB(savedNow)}. Nelze vybrat víc.`); return; }
    // Přepočet CZK → měna cílové peněženky
    const rate = (destCur==='CZK')?1:((typeof _FX_RATES!=='undefined'?_FX_RATES[destCur]:1)||1);
    const amtDest = parseFloat((amt/rate).toFixed(2));
    // Příjem na peněženku
    const _vtCatId=findCatIdByName('Virtuální přesun');
    const txIn={id:uid(),name:`Výběr z cíle ← ${goal.name}`,amount:amtDest,type:'income',date,wallet:to,note:note||`Cíl: ${goal.name} · výběr na ${wDest?.name||'peněženku'}`,transferId:uid(),category:'transfer',catId:_vtCatId,subcat:'Reverz'};
    if(!S.transactions)S.transactions=[];
    S.transactions.push(txIn);
    // Záporný vklad do cíle (sníží naspořeno)
    const dep={id:uid(),goalId,amount:-parseFloat(amt.toFixed(2)),date,note:note||`Výběr na ${wDest?.name||'peněženku'}`,createdAt:Date.now(),txOutId:txIn.id};
    if(typeof _goalDeposits!=='undefined'){ if(!_goalDeposits[goalId])_goalDeposits[goalId]=[]; _goalDeposits[goalId].push(dep); }
    if(window._currentUser && window._db){ _set(_ref(_db, `users/${window._currentUser.uid}/goal_deposits/${dep.id}`), dep).catch(()=>{}); }
    save();
    document.getElementById('transferAmt').value='';
    document.getElementById('transferNote').value='';
    document.getElementById('transferResult').innerHTML=`<div class="insight-item good"><div class="insight-icon">↩️</div><div class="insight-text">Výběr <strong>${fmtB(amt)}</strong> z cíle <strong>${goal.name}</strong> na <strong>${wDest?.name}</strong> proveden!</div></div>`;
    setTimeout(()=>{const r=document.getElementById('transferResult');if(r)r.innerHTML='';},4000);
    return;
  }

  const wFrom=findWallet(from);

  // PŘEVOD DO VIRTUÁLNÍHO CÍLE (goal:ID)
  if(to.startsWith('goal:')) {
    const goalId = to.slice(5);
    const D = getData();
    const goal = (D.wishes||[]).find(w=>w.id===goalId);
    if(!goal){alert('Cíl nenalezen');return;}
    const fromCur = wFrom?.currency || 'CZK';
    // Měnový přepočet: částka v měně peněženky → CZK (cíle jsou v CZK)
    let amtCZK = parseFloat(toCZK(amt, fromCur).toFixed(2));
    // HLÍDÁNÍ CÍLOVÉ ČÁSTKY: nelze překročit cíl
    const savedNow = (typeof goalGetSaved==='function') ? goalGetSaved(goalId) : 0;
    const remainingCZK = Math.max(0, (goal.targetAmount||0) - savedNow);
    if (remainingCZK <= 0) {
      alert(`Cíl „${goal.name}" je už naplněný. Vklad není potřeba.`);
      return;
    }
    if (amtCZK > remainingCZK) {
      const remInCur = (fromCur==='CZK') ? remainingCZK : (remainingCZK / ((typeof _FX_RATES!=='undefined'?_FX_RATES[fromCur]:1)||1));
      if (!confirm(`Vklad ${fmtB(amtCZK)} překračuje zbývající částku do cíle (${fmtB(remainingCZK)}).\n\nVložit jen zbývající částku ${fmtB(remainingCZK)}?`)) return;
      // Vlož jen zbývající (přepočti zpět do měny peněženky pro výdaj)
      amtCZK = remainingCZK;
      amt = parseFloat(remInCur.toFixed(2));
    }
    // 1) Výdaj z peněženky (v měně peněženky) + odečet ze zůstatku
    const transferId=uid();
    const _vtCat=findCatIdByName('Virtuální přesun');
    const txOut={id:uid(),name:`Vklad do cíle → ${goal.name}`,amount:amt,type:'expense',date,wallet:from,note:note||`Cíl: ${goal.name} · převod z ${wFrom?.name||'peněženky'}`,transferId,category:'transfer',catId:_vtCat,subcat:'Vklad do cíle'};
    if(!S.transactions)S.transactions=[];
    S.transactions.push(txOut);
    // 2) Vklad do cíle (goal_deposits) – amount v CZK, originál uložen pro reverz
    const dep={id:uid(),goalId,amount:amtCZK,date,note:note||`Převod z ${wFrom?.name||'peněženky'}`,createdAt:Date.now(),
               transferId,walletId:from,walletAmount:amt,walletCurrency:fromCur,txOutId:txOut.id};
    if(typeof _goalDeposits!=='undefined'){ if(!_goalDeposits[goalId])_goalDeposits[goalId]=[]; _goalDeposits[goalId].push(dep); }
    if(window._currentUser && window._db){
      _set(_ref(_db, `users/${window._currentUser.uid}/goal_deposits/${dep.id}`), dep).catch(()=>{});
    }
    save();
    document.getElementById('transferAmt').value='';
    document.getElementById('transferNote').value='';
    document.getElementById('transferResult').innerHTML=`<div class="insight-item good"><div class="insight-icon">🎯</div><div class="insight-text">Vklad <strong>${fmtB(amt)}</strong> z <strong>${wFrom?.name}</strong> do cíle <strong>${goal.name}</strong> proveden!</div></div>`;
    setTimeout(()=>{const r=document.getElementById('transferResult');if(r)r.innerHTML='';},4000);
    return;
  }

  const wTo=findWallet(to);
  // Create two linked transactions
  const transferId=uid();
  const txOut={id:uid(),name:`Převod → ${wTo?.name||''}`,amount:amt,type:'expense',date,wallet:from,note:note||'Převod mezi peněženkami',transferId,category:'transfer'};
  const txIn={id:uid(),name:`Převod ← ${wFrom?.name||''}`,amount:amt,type:'income',date,wallet:to,note:note||'Převod mezi peněženkami',transferId,category:'transfer'};
  if(!S.transactions)S.transactions=[];
  S.transactions.push(txOut,txIn);
  save();
  document.getElementById('transferAmt').value='';
  document.getElementById('transferNote').value='';
  document.getElementById('transferResult').innerHTML=`<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text">Převod <strong>${fmtB(amt)}</strong> z <strong>${wFrom?.name}</strong> do <strong>${wTo?.name}</strong> proveden!</div></div>`;
  setTimeout(()=>{const r=document.getElementById('transferResult');if(r)r.innerHTML='';},4000);
}

// ══════════════════════════════════════════════════════
//  TYPY PLATEB
// ══════════════════════════════════════════════════════
const DEFAULT_PAY_TYPES = [
  {id:'cash',name:'Hotovost',icon:'💵',color:'#4ade80',builtin:true},
  {id:'card',name:'Platební karta',icon:'💳',color:'#60a5fa',builtin:true},
  {id:'transfer',name:'Bankovní převod',icon:'🏦',color:'#a78bfa',builtin:true},
  {id:'edenred',name:'Edenred / Stravenky',icon:'🍽️',color:'#fbbf24',builtin:true},
];
function getPayTypes(D) {
  D = D || getData();
  const custom = D.payTypes || [];
  return [...DEFAULT_PAY_TYPES, ...custom];
}
function renderPayTypeList() {
  const D=getData(); const ro=viewingUid!==null;
  const el=document.getElementById('payTypeList'); if(!el) return;
  const types=getPayTypes(D);
  el.innerHTML=types.map(t=>{
    const btns = t.builtin
      ? '<span style="font-size:.7rem;color:var(--text3)">výchozí</span>'
      : (!ro ? `<div style="display:flex;gap:4px"><button class="btn btn-edit btn-icon btn-sm" onclick="editPayType('${t.id}')">✎</button><button class="btn btn-danger btn-icon btn-sm" onclick="deletePayType('${t.id}')">✕</button></div>` : '');
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:36px;height:36px;border-radius:10px;background:${t.color}22;display:flex;align-items:center;justify-content:center;font-size:1.1rem">${t.icon}</div>
      <div style="flex:1;font-weight:600;font-size:.88rem">${t.name}</div>
      ${btns}
    </div>`;
  }).join('');
}
function openPayTypeModal() {
  ['editPayTypeId','payTypeName','payTypeIcon'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('payTypeColor').value='#60a5fa';
  document.getElementById('payTypeModalTitle').textContent='Přidat typ platby';
  document.getElementById('modalPayType').classList.add('open');
}
function editPayType(id) {
  const t=(S.payTypes||[]).find(x=>x.id===id); if(!t) return;
  document.getElementById('editPayTypeId').value=id;
  document.getElementById('payTypeName').value=t.name;
  document.getElementById('payTypeIcon').value=t.icon||'💳';
  document.getElementById('payTypeColor').value=t.color||'#60a5fa';
  document.getElementById('payTypeModalTitle').textContent='Upravit typ platby';
  document.getElementById('modalPayType').classList.add('open');
}
function savePayType() {
  const eid=document.getElementById('editPayTypeId').value;
  const name=document.getElementById('payTypeName').value.trim();
  const icon=document.getElementById('payTypeIcon').value.trim()||'💳';
  const color=document.getElementById('payTypeColor').value;
  if(!name){alert('Zadej název');return;}
  if(!S.payTypes)S.payTypes=[];
  if(eid){const i=S.payTypes.findIndex(x=>x.id===eid);if(i>=0)S.payTypes[i]={...S.payTypes[i],name,icon,color};}
  else S.payTypes.push({id:uid(),name,icon,color});
  save(); closeModal('modalPayType'); renderPayTypeList();
}
function deletePayType(id) {
  if(!confirm('Smazat typ platby?'))return;
  S.payTypes=(S.payTypes||[]).filter(t=>t.id!==id);
  save(); renderPayTypeList();
}

// ══════════════════════════════════════════════════════
//  OPAKOVANÉ ŠABLONY
// ══════════════════════════════════════════════════════
const FREQ_LABELS={weekly:'Týdně',biweekly:'Každé 2 týdny',monthly:'Měsíčně',quarterly:'Čtvrtletně',yearly:'Ročně',once:'1× jednorázově'};
let _sablonaType='expense';

function setSablonaType(t) {
  _sablonaType=t;
  // S12.1i: typ Přesun – skrýt kategorii, zobrazit cílovou peněženku
  const stTr=document.getElementById('stt-transfer');
  if(stTr) stTr.className = t==='transfer' ? 'tt sel-transfer' : 'tt';
  // S17.7 (Milan): typ Dluh/Splátka – místo kategorie výběr konkrétního dluhu
  const isDebt = t==='debt';
  const catSec=document.getElementById('sablonaCatSection');
  if(catSec) catSec.style.display = (t==='transfer'||isDebt) ? 'none' : 'block';
  const toSec=document.getElementById('sablonaWalletToSection');
  if(toSec) toSec.style.display = t==='transfer' ? 'block' : 'none';
  const debtSec=document.getElementById('sablonaDebtSection');
  if(debtSec) debtSec.style.display = isDebt ? 'block' : 'none';
  if(isDebt && typeof renderSablonaDebts==='function') renderSablonaDebts();
  const wl=document.getElementById('sablonaWalletLabel');
  if(wl) wl.textContent = t==='transfer' ? 'Z peněženky' : 'Peněženka';
  if(t==='transfer' && typeof renderSablonaWalletTo==='function') renderSablonaWalletTo();
  document.getElementById('stt-income').className='tt'+(t==='income'?' sel-income':'');
  document.getElementById('stt-expense').className='tt'+(t==='expense'?' sel-expense':'');
  const stDebt=document.getElementById('stt-debt');
  if(stDebt) stDebt.className='tt'+(isDebt?' sel-expense':'');
  //  S23 (Milan): PŘEPNUTÍ VÝDAJ → PŘÍJEM NECHÁVALO VÝDAJOVÉ KATEGORIE.
  //  setSablonaType přepnul jen _sablonaType a zobrazení sekcí, ale seznam
  //  kategorií nikdo nepřekreslil – změnil se až při kliknutí na kategorii,
  //  protože teprve ten onclick volá renderSablonaCatPicker(). Vybraná
  //  kategorie se navíc musí zahodit: příjmová šablona nesmí zůstat viset
  //  na kategorii Nájem jen proto, že byla vybraná před přepnutím.
  if(!(t==='transfer'||isDebt)){
    const _sel=(S.categories||[]).find(c=>c.id===selCatId);
    if(_sel && _sel.type!==t && _sel.type!=='both') selCatId='';
    if(typeof renderSablonaCatPicker==='function') renderSablonaCatPicker();
  }
}

//  S23: u jednorázové platby se místo „den v měsíci" ptáme na celé datum.
function sablonaFreqChange(){
  const f=document.getElementById('sablonaFreq')?.value;
  const den=document.getElementById('sablonaDenWrap');
  const once=document.getElementById('sablonaOnceWrap');
  if(den)  den.style.display  = f==='once' ? 'none'  : 'block';
  if(once) once.style.display = f==='once' ? 'block' : 'none';
  const auto=document.getElementById('sablonaAuto');
  //  Jednorázová platba bez automatického vytvoření by jen visela v seznamu
  //  a v den D se nic nestalo – to by byla stejná past jako „vlastní položky"
  //  v Příštím měsíci. Proto se zaškrtne a zamkne.
  if(auto && f==='once'){ auto.checked=true; auto.disabled=true; }
  else if(auto){ auto.disabled=false; }
}
window.sablonaFreqChange = sablonaFreqChange;
// S17.7: naplnit select dluhů v šablonovém modalu
function renderSablonaDebts() {
  const sel=document.getElementById('sablonaDebtId'); if(!sel) return;
  const debts=(S.debts||[]).filter(d=>(d.remaining||0)>0);
  sel.innerHTML = debts.length
    ? debts.map(d=>`<option value="${d.id}">${d.name} (zbývá ${fmtB(Math.round(d.remaining||0))})</option>`).join('')
    : '<option value="">– žádný aktivní dluh –</option>';
}
function renderSablonaList() {
  const D=getData(); const ro=viewingUid!==null;
  const el=document.getElementById('sablonaList'); if(!el) return;
  const sablony=D.sablony||[];
  if(!sablony.length){el.innerHTML='<div class="empty"><div class="ei">🔄</div><div class="et">Žádné šablony</div></div>';return;}
  el.innerHTML=sablony.map(s=>{
    const cat=(D.categories||[]).find(c=>c.id===s.catId);
    const nextDate=getNextSablonaDate(s);
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:1.2rem">${s.type==='income'?'💰':'💸'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.88rem">${s.name}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
          <span style="font-size:.78rem;font-weight:700;color:${s.type==='income'?'var(--income)':'var(--expense)'}">${s.type==='income'?'+':'−'}${fmtB(s.amount)}</span>
          <span style="font-size:.74rem;color:var(--text3)">${FREQ_LABELS[s.freq]||s.freq}${s.freq==='once'&&s.done?' · ✅ provedeno':''}</span>
          ${cat?`<span style="font-size:.74rem;color:var(--text3)">${cat.icon} ${cat.name}</span>`:''}
          ${s.auto?'<span style="font-size:.7rem;background:var(--income-bg);color:var(--income);padding:1px 6px;border-radius:5px">auto</span>':''}
        </div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:3px">Příště: ${nextDate}</div>
      </div>
      ${!ro?`<div style="display:flex;flex-direction:column;gap:4px">
        <button class="btn btn-accent btn-sm" style="font-size:.7rem;padding:3px 8px" onclick="useSablonaId('${s.id}')">⚡</button>
        <button class="btn btn-edit btn-icon btn-sm" onclick="editSablona('${s.id}')">✎</button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteSablona('${s.id}')">✕</button>
      </div>`:''}
    </div>`;
  }).join('');
}
function getNextSablonaDate(s) {
  const today=new Date();
  const day=s.den||1;
  let next=new Date(today.getFullYear(),today.getMonth(),day);
  if(next<=today){
    //  S23: jednorázová platba má datum uložené, nic se nedopočítává.
    if(s.freq==='once') return s.onceDate ? new Date(s.onceDate).toLocaleDateString('cs-CZ') : '—';
    if(s.freq==='weekly')next=new Date(today.getTime()+7*86400000);
    else if(s.freq==='biweekly')next=new Date(today.getTime()+14*86400000);
    else if(s.freq==='monthly')next=new Date(today.getFullYear(),today.getMonth()+1,day);
    else if(s.freq==='quarterly')next=new Date(today.getFullYear(),today.getMonth()+3,day);
    else if(s.freq==='yearly')next=new Date(today.getFullYear()+1,today.getMonth(),day);
  }
  return next.toLocaleDateString('cs-CZ');
}
function renderSablonaCatPicker() {
  const el=document.getElementById('sablonaCatPicker'); if(!el) return;
  const cats=(S.categories||[]).filter(c=>c.type===_sablonaType||c.type==='both');
  el.innerHTML=cats.map(c=>`<div class="cat-chip ${c.id===selCatId?'selected':''}" onclick="selCatId='${c.id}';renderSablonaCatPicker()" style="background:${c.color}22;border-color:${c.id===selCatId?c.color:'transparent'}">${c.icon} ${c.name}</div>`).join('');
}
function renderSablonaWalletTo() {
  const sel=document.getElementById('sablonaWalletTo'); if(!sel) return;
  sel.innerHTML='<option value="">– vyber –</option>'+(S.wallets||[]).filter(w=>!w.archived).map(w=>`<option value="${w.id}">${w.icon||'💼'} ${w.name}</option>`).join('');   // TODO-241
}
function renderSablonaWallets() {
  const sel=document.getElementById('sablonaWallet'); if(!sel) return;
  const wallets=getWallets();
  sel.innerHTML='<option value="">– bez peněženky –</option>'+wallets.map(w=>`<option value="${w.id}">${WALLET_TYPES[w.type]?.split(' ')[0]||'👛'} ${w.name}</option>`).join('');
}
function openSablonaModal(prefill) {
  _sablonaType='expense'; setSablonaType('expense');
  ['editSablonaId','sablonaName','sablonaEnd','sablonaNote'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('sablonaAmt').value='';
  document.getElementById('sablonaFreq').value='monthly';
  document.getElementById('sablonaDen').value='1';
  document.getElementById('sablonaAuto').checked=true;
  selCatId='';
  renderSablonaCatPicker();
  renderSablonaWallets();
  if(prefill){
    document.getElementById('sablonaName').value=prefill.name||'';
    moneyInFill('sablonaAmt', prefill.amount);   // TODO-216
    if(prefill.type)setSablonaType(prefill.type);
  }
  document.getElementById('sablonaModalTitle').textContent='Přidat šablonu';
  document.getElementById('modalSablona').classList.add('open');
}
function editSablona(id) {
  const s=(S.sablony||[]).find(x=>x.id===id); if(!s) return;
  // S17.7: šablona s debtId je Dluh/Splátka (uložená jako type:expense + debtId)
  setSablonaType(s.debtId ? 'debt' : (s.type||'expense'));
  document.getElementById('editSablonaId').value=id;
  document.getElementById('sablonaName').value=s.name;
  moneyInFill('sablonaAmt', s.amount);   // TODO-216
  document.getElementById('sablonaFreq').value=s.freq||'monthly';
  const _od=document.getElementById('sablonaOnceDate'); if(_od) _od.value=s.onceDate||'';
  if(typeof sablonaFreqChange==='function') sablonaFreqChange();
  document.getElementById('sablonaDen').value=s.den||1;
  document.getElementById('sablonaAuto').checked=!!s.auto;
  document.getElementById('sablonaEnd').value=s.endDate||'';
  document.getElementById('sablonaNote').value=s.note||'';
  selCatId=s.catId||'';
  renderSablonaCatPicker();
  renderSablonaWallets();
  document.getElementById('sablonaWallet').value=s.wallet||'';
  if(document.getElementById('sablonaWalletTo')) document.getElementById('sablonaWalletTo').value=s.walletTo||'';
  if(s.debtId){ renderSablonaDebts(); const ds=document.getElementById('sablonaDebtId'); if(ds) ds.value=s.debtId; }  // S17.7
  document.getElementById('sablonaModalTitle').textContent='Upravit šablonu';
  document.getElementById('modalSablona').classList.add('open');
}
function saveSablona() {
  const eid=document.getElementById('editSablonaId').value;
  const name=document.getElementById('sablonaName').value.trim();
  const amount=moneyInRead('sablonaAmt');   // TODO-216
  if(!name){alert('Zadej název');return;}
  if(!amount){alert('Zadej částku');return;}
  //  S23: jednorázová platba bez data by se nikdy neprovedla.
  const _freq=document.getElementById('sablonaFreq').value;
  const _onceDate=(document.getElementById('sablonaOnceDate')?.value)||'';
  if(_freq==='once' && !_onceDate){alert('U jednorázové platby vyber datum');return;}
  const s={id:eid||uid(),name,amount,type:_sablonaType,catId:selCatId,freq:document.getElementById('sablonaFreq').value,den:parseInt(document.getElementById('sablonaDen').value)||1,auto:document.getElementById('sablonaAuto').checked,endDate:document.getElementById('sablonaEnd').value||null,wallet:document.getElementById('sablonaWallet').value||null,walletTo:document.getElementById('sablonaWalletTo')?.value||null,note:document.getElementById('sablonaNote').value.trim()};
  if(_sablonaType==='transfer'){
    if(!s.wallet||!s.walletTo){alert('U přesunu vyber obě peněženky');return;}
    if(s.wallet===s.walletTo){alert('Peněženky musí být různé');return;}
    s.catId='transfer';
  }
  // S17.7 (Milan): typ Dluh/Splátka – ukládá se debtId, transakce se sváže s dluhem
  if(_sablonaType==='debt'){
    const did=document.getElementById('sablonaDebtId')?.value||'';
    if(!did){alert('Vyber dluh, který se splácí');return;}
    s.debtId=did; s.type='expense'; s.catId='';   // splátka = výdaj vázaný na debtId
  }
  if(!S.sablony)S.sablony=[];
  if(_freq==='once'){ s.onceDate=_onceDate; s.auto=true; s.den=parseInt(_onceDate.slice(8,10))||1; }
  if(eid){const i=S.sablony.findIndex(x=>x.id===eid);if(i>=0)S.sablony[i]=s;}
  else S.sablony.push(s);
  save(); closeModal('modalSablona'); renderSablonaList();
}
function deleteSablona(id) {
  if(!confirm('Smazat šablonu?'))return;
  S.sablony=(S.sablony||[]).filter(s=>s.id!==id);
  save(); renderSablonaList();
}
function useSablonaId(id) {
  const s=(S.sablony||[]).find(x=>x.id===id); if(!s) return;
  const _dateStr=new Date().toISOString().slice(0,10);
  if(!S.transactions)S.transactions=[];
  if(s.type==='transfer'){
    // S12.1i: opakovaný PŘESUN – pár transakcí s transferId (statistiky ho ignorují, peněženky započítají)
    const transferId=uid();
    const txName=s.name||'Převod (šablona)';
    S.transactions.push(
      {id:uid(),name:txName,amount:s.amount,amt:s.amount,type:'expense',date:_dateStr,wallet:s.wallet||null,note:s.note||'Z šablony: '+s.name,transferId,category:'transfer',catId:'transfer'},
      {id:uid(),name:txName,amount:s.amount,amt:s.amount,type:'income', date:_dateStr,wallet:s.walletTo||null,note:s.note||'Z šablony: '+s.name,transferId,category:'transfer',catId:'transfer'}
    );
  } else {
    S.transactions.push({id:uid(),name:s.name,amount:s.amount,type:s.type,date:_dateStr,category:s.catId||'',note:s.note||'Z šablony: '+s.name,wallet:s.wallet||null});
  }
  save();
  showPageByName('transakce');
  setTimeout(()=>renderPage(),200);
  alert(`✅ Transakce "${s.name}" přidána!`);
}
function useSablonaNow() {
  // Save first, then use
  saveSablona();
  const last=S.sablony?.[S.sablony.length-1];
  if(last)useSablonaId(last.id);
}
// Auto-process templates on login
// S17.8 (FIX-210 v2, Milan): žádné dohánění na 35 dní zpět. Jediné pravidlo: když je den
// splatnosti v TOMTO měsíci a už nastal (≤ dnes), a transakce ještě není, doplň ji. Pokrývá
// přesně případ „přidám opakování s datem před dneškem → zapiš i na aktuální měsíc".
function processAutoSablony() {
  if(typeof viewingUid!=='undefined' && viewingUid) return;   // ne při prohlížení partnera
  //  S23: transakce z účtenek vznikaly BEZ peněženky → zůstatek je neviděl.
  //  Doplní se jen při jediné peněžence (viz rpFixReceiptTxWallets v receipts.js).
  try{ if(typeof rpFixReceiptTxWallets==='function'){ const _n=rpFixReceiptTxWallets(); if(_n){ save(); if(typeof renderPage==='function') renderPage(); console.log('[S23] doplněna peněženka u',_n,'transakcí z účtenek'); } } }catch(e){ console.warn(e); }
  if(!S.sablony)return;
  const today=new Date(); today.setHours(0,0,0,0);
  const iso=d=>d.toISOString().slice(0,10);
  S.transactions=S.transactions||[];
  let added=0;

  S.sablony.filter(s=>s.auto).forEach(s=>{
    // jen měsíční šablony mají „den v měsíci" – u týdenních/dalších řeší výskyty Budoucí platby
    const freq=s.freq||'monthly';
    //  S23 (Milan): JEDNORÁZOVÁ PLATBA. Vytvoří se v den D a šablona se pak
    //  označí jako vyřízená (done), aby nezůstala viset v seznamu opakovaných.
    //  Do té doby je vidět v Budoucích platbách i v Příštím měsíci – přesně
    //  proto Milan tuhle volbu chtěl: zviditelnit budoucí jednorázový výdaj.
    if(freq==='once'){
      if(s.done || !s.onceDate) return;
      const iso_today=iso(today);
      if(s.onceDate > iso_today) return;                       // ještě nenastalo
      if(S.transactions.some(t=>t.date===s.onceDate && t.name===s.name && t.note && t.note.includes('Auto-šablona'))) { s.done=true; return; }
      const tx1={id:uid(),name:s.name,amount:s.amount,amt:s.amount,type:s.type,date:s.onceDate,category:s.catId||'',catId:s.catId||'',note:'Auto-šablona: '+s.name,wallet:s.wallet||null};
      if(s.debtId) tx1.debtId=s.debtId;
      if(s.type==='transfer'){
        const trid=uid();
        S.transactions.push(
          {id:uid(),name:s.name,amount:s.amount,amt:s.amount,type:'expense',date:s.onceDate,wallet:s.wallet||null,note:'Auto-šablona: '+s.name,transferId:trid,category:'transfer',catId:'transfer'},
          {id:uid(),name:s.name,amount:s.amount,amt:s.amount,type:'income', date:s.onceDate,wallet:s.walletTo||null,note:'Auto-šablona: '+s.name,transferId:trid,category:'transfer',catId:'transfer'}
        );
      } else S.transactions.push(tx1);
      s.done=true; added++;
      return;
    }
    if(freq!=='monthly') return;
    const den=Math.min(31, Math.max(1, s.den||1));
    const dueDay=Math.min(den, new Date(today.getFullYear(), today.getMonth()+1, 0).getDate()); // ošetři krátké měsíce
    const due=new Date(today.getFullYear(), today.getMonth(), dueDay); due.setHours(0,0,0,0);
    // S17.9 (FIX-210 v4, Milan): NE ZPĚTNĚ. Výskyt tohoto měsíce se doplní jen když den splatnosti
    // ještě NENASTAL (due >= dnes) – proaktivně, ať je vidět. Když den už BYL (šablona přidaná
    // pozdě), nepropisuje se zpětně, jen se přenese na další měsíc (řeší projekce v Budoucích platbách).
    if(due<today) return;
    const dateStr=iso(due);
    if(s.endDate && s.endDate < dateStr) return;
    // idempotence: existuje už auto-transakce téže šablony k tomuto datu?
    if(S.transactions.some(t=>t.date===dateStr && t.name===s.name && t.note && t.note.includes('Auto-šablona'))) return;
    if(s.type==='transfer'){
      const transferId=uid();
      S.transactions.push(
        {id:uid(),name:s.name,amount:s.amount,amt:s.amount,type:'expense',date:dateStr,wallet:s.wallet||null,note:'Auto-šablona: '+s.name,transferId,category:'transfer',catId:'transfer'},
        {id:uid(),name:s.name,amount:s.amount,amt:s.amount,type:'income', date:dateStr,wallet:s.walletTo||null,note:'Auto-šablona: '+s.name,transferId,category:'transfer',catId:'transfer'}
      );
    } else {
      const tx={id:uid(),name:s.name,amount:s.amount,amt:s.amount,type:s.type,date:dateStr,category:s.catId||'',catId:s.catId||'',note:'Auto-šablona: '+s.name,wallet:s.wallet||null};
      if(s.debtId) tx.debtId=s.debtId;
      S.transactions.push(tx);
    }
    added++;
  });
  if(added>0){ save(); if(typeof renderPage==='function') renderPage(); }
}

// ══════════════════════════════════════════════════════
//  NASTAVENÍ
// ══════════════════════════════════════════════════════
let _settings = {lang:'cs', currency:'CZK', dateFmt:'cs'};

async function loadSettings(uid) {
  try {
    const snap = await _get(_ref(_db, `users/${uid}/settings`));
    if(snap.exists()) _settings = Object.assign(_settings, snap.val());
  } catch(e) {}
  applySettings();
  applyLanguage();
}
// TODO-234 (S20): zápis nastavení vytažen z saveSettingsBtn do sdíleného helperu –
// onboarding krok 1 (ui.js) ukládá tatáž data a nesmí duplikovat cestu k Firebase.
function persistSettings() {
  if(window._currentUser && !_isLocalMode) {
    _set(_ref(_db, `users/${window._currentUser.uid}/settings`), _settings)
      .catch(e => console.error('Settings save error:', e));
  } else if(_isLocalMode) {
    try { localStorage.setItem('ff_v43_settings', JSON.stringify(_settings)); } catch(e) {}
  }
}
function saveSettingsBtn() {
  _settings.lang = document.getElementById('settingLang')?.value || 'cs';
  _settings.currency = document.getElementById('settingCurrency')?.value || 'CZK';
  _settings.convCur = document.getElementById('settingConvCur')?.value || ''; // v8.72: preferovaná převodní měna
  // S17.5 (Milan): výchozí peněženka + typ platby pro novou transakci
  _settings.defWallet = document.getElementById('settingDefWallet')?.value || '';
  _settings.defPayType = document.getElementById('settingDefPayType')?.value || '';
  _settings.dateFmt = document.getElementById('settingDateFmt')?.value || 'cs';
  _settings.household_adults = parseInt(document.getElementById('settingAdults')?.value) || 2;
  _settings.household_ch013 = parseInt(document.getElementById('settingChildren013')?.value) || 0;
  _settings.household_ch14  = parseInt(document.getElementById('settingChildren14')?.value) || 0;
  // FIX (S12.1): Den výplaty (settingFirstDay) se dosud vůbec neukládal. 0 = automaticky z transakcí.
  const _fdEl = document.getElementById('settingFirstDay');
  if(_fdEl) _settings.firstDay = parseInt(_fdEl.value) || 0;
  // S13: frekvence výplaty (Runway cyklus) – monthly/biweekly/weekly/semimonthly/irregular
  const _pfEl = document.getElementById('settingPayFreq');
  if(_pfEl) _settings.payFreq = _pfEl.value || 'monthly';
  const _mrEl = document.getElementById('settingMinReserve');
  if(_mrEl) _settings.minReserve = Math.max(0, parseInt(_mrEl.value) || 0);   // S12.1: nedotknutelná rezerva pro Runway
  _settings.household = calcOECD(_settings.household_adults, _settings.household_ch013, _settings.household_ch14);
  // Save settings separately from data
  if(window._currentUser && !_isLocalMode) {
    _set(_ref(_db, `users/${window._currentUser.uid}/settings`), _settings)
      .catch(e => console.error('Settings save error:', e));
  } else if(_isLocalMode) {
    try { localStorage.setItem('ff_v43_settings', JSON.stringify(_settings)); } catch(e) {}
  }
  // Apply language to UI
  applyLanguage();
  // Session 10: stavové tlačítko – po uložení zešedne + banner „Máte uloženo"
  if(typeof markSettingsSaved === 'function') markSettingsSaved();
  const bar = document.getElementById('settingsSaveBar');
  if(bar) bar.style.display = 'none';
  // Toast zpráva
  if(typeof showToast === 'function') {
    showToast(_settings.lang==='en'?'✅ Settings saved!':_settings.lang==='sk'?'✅ Nastavenia uložené!':'✅ Nastavení uloženo!');
  }
  // v8.60 (TODO-150): změna základní měny se projeví hned (překreslit aktuální stránku)
  if(typeof renderPage === 'function') { try { renderPage(); } catch(_){} }
}

const TRANSLATIONS = {
  cs: {
    dashboard:'Dashboard', expenses:'Souhrn výdajů', transactions:'Transakce', bank:'Bank',
    prediction:'Predikce', loans:'Půjčky', charts:'Grafy', birthdays:'Narozeniny a přání',
    stats:'Statistiky', categories:'Kategorie', ai:'AI Rádce', family:'Rodinný souhrn',
    sharing:'Sdílení & partneři', wallets:'Peněženky', payTypes:'Typy plateb',
    templates:'Opakované šablony', settings:'Nastavení', about:'O aplikaci',
    projects:'Projekty', report:'Měsíční report',
    income:'Příjmy', outcome:'Výdaje', balance:'Saldo', savings:'Úspory',
    addTx:'Přidat transakci', save:'Uložit', cancel:'Zrušit',
    overview:'Přehled', planning:'Plánování', management:'Správa',
    noTransactions:'Žádné transakce', currency:'Kč'
  },
  en: {
    dashboard:'Dashboard', expenses:'Expense Summary', transactions:'Transactions', bank:'Bank',
    prediction:'Prediction', loans:'Loans', charts:'Charts', birthdays:'Birthdays & Wishes',
    stats:'Statistics', categories:'Categories', ai:'AI Advisor', family:'Family Summary',
    sharing:'Sharing & Partners', wallets:'Wallets', payTypes:'Payment Types',
    templates:'Recurring Templates', settings:'Settings', about:'About',
    projects:'Projects', report:'Monthly Report',
    income:'Income', outcome:'Expenses', balance:'Balance', savings:'Savings',
    addTx:'Add Transaction', save:'Save', cancel:'Cancel',
    overview:'Overview', planning:'Planning', management:'Management',
    noTransactions:'No transactions', currency:'CZK'
  },
  sk: {
    dashboard:'Dashboard', expenses:'Prehľad výdavkov', transactions:'Transakcie', bank:'Banka',
    prediction:'Predikcia', loans:'Pôžičky', charts:'Grafy', birthdays:'Narodeniny a priania',
    stats:'Štatistiky', categories:'Kategórie', ai:'AI Radca', family:'Rodinný prehľad',
    sharing:'Zdieľanie & partneri', wallets:'Peňaženky', payTypes:'Typy platieb',
    templates:'Opakované šablóny', settings:'Nastavenia', about:'O aplikácii',
    projects:'Projekty', report:'Mesačný report',
    income:'Príjmy', outcome:'Výdavky', balance:'Zostatok', savings:'Úspory',
    addTx:'Pridať transakciu', save:'Uložiť', cancel:'Zrušiť',
    overview:'Prehľad', planning:'Plánovanie', management:'Správa',
    noTransactions:'Žiadne transakcie', currency:'Kč'
  }
};

function t(key) {
  const lang = _settings.lang || 'cs';
  return (TRANSLATIONS[lang] || TRANSLATIONS.cs)[key] || key;
}

function applyLanguage() {
  const lang = _settings.lang || 'cs';
  // Update nav labels
  const navMap = {
    'prehled': t('dashboard'), 'souhrn': t('expenses'), 'transakce': t('transactions'),
    'bank': t('bank'), 'predikce': t('prediction'), 'dluhy': t('loans'),
    'grafy': t('charts'), 'narozeniny': t('birthdays'), 'statistiky': t('stats'),
    'kategorie': t('categories'), 'ai': t('ai'), 'rodina': t('family'),
    'sdileni': t('sharing'), 'penezenky': t('wallets'), 'typy': t('payTypes'),
    'sablony': t('templates'), 'nastaveni': t('settings'), 'oAplikaci': t('about'),
    'projekty': t('projects'), 'report': t('report')
  };
  // Update PAGE_TITLES
  Object.assign(PAGE_TITLES, navMap);
  // Update current page title
  const titleEl = document.getElementById('pageTitle');
  if(titleEl && PAGE_TITLES[curPage]) titleEl.textContent = PAGE_TITLES[curPage];
  // Update nav items text
  document.querySelectorAll('.nav-item[onclick*="showPage"]').forEach(el => {
    const match = el.getAttribute('onclick')?.match(/showPage[^']*'([^']+)'/);
    if(match && navMap[match[1]]) {
      const icon = el.querySelector('.nav-icon');
      if(icon) el.innerHTML = el.innerHTML.replace(/(<\/span>\s*)([^<💎]+)/, `$1 ${navMap[match[1]]} `);
    }
  });
  // Update FAB tooltip
  const fab = document.getElementById('mainFab');
  if(fab) fab.title = t('addTx');
  // Update html lang attribute
  document.documentElement.lang = lang;
}

function saveSettings() {
  const l=document.getElementById('settingLang')?.value;
  const c=document.getElementById('settingCurrency')?.value;
  const d=document.getElementById('settingDateFmt')?.value;
  if(l) _settings.lang=l;
  if(c) _settings.currency=c;
  if(d) _settings.dateFmt=d;
}

function applySettings() {
  // TODO-216 (v9.91): popisky peněžních polí nesou v app.html natvrdo „(Kč)" –
  //   po načtení nastavení se přepíšou symbolem základní měny. Volá se odsud,
  //   protože applySettings() běží při startu i po každé změně měny.
  if(typeof refreshMoneyLabels==='function') refreshMoneyLabels();
  // Only updates UI to reflect current _settings – does NOT save
  const el1=document.getElementById('settingLang'); if(el1 && el1.value !== _settings.lang) el1.value=_settings.lang;
  const el2=document.getElementById('settingCurrency'); if(el2 && el2.value !== _settings.currency) el2.value=_settings.currency;
  const el3=document.getElementById('settingDateFmt'); if(el3 && el3.value !== _settings.dateFmt) el3.value=_settings.dateFmt;
  const el4=document.getElementById('settingAdults'); if(el4) el4.value=_settings.household_adults||2;
  const el5=document.getElementById('settingChildren013'); if(el5) el5.value=_settings.household_ch013||0;
  const el6=document.getElementById('settingChildren14'); if(el6) el6.value=_settings.household_ch14||0;
  updateHouseholdEquiv();
  // Set export date defaults
  const today=new Date().toISOString().slice(0,10);
  const firstOfMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10);
  const ef=document.getElementById('exportFrom');if(ef&&!ef.value)ef.value=firstOfMonth;
  const et=document.getElementById('exportTo');if(et&&!et.value)et.value=today;
  // Show/hide local mode card
  const lc=document.getElementById('localModeCard');
  if(lc)lc.style.display=_isLocalMode?'block':'none';
}

async function migrateToGoogle() {
  if(!_isLocalMode) return;
  // Save current local data to temp
  const localData = Object.assign({}, S);
  // Sign in with Google
  if(!window._signInGoogle) { alert('Firebase se načítá...'); return; }
  // Store data for after login
  window._pendingMigration = localData;
  window._signInGoogle();
}
function importDataPrompt() {
  const inp=document.createElement('input');inp.type='file';inp.accept='.json';
  inp.onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(!confirm('Přepsat všechna stávající data importovanými daty?'))return;
        S=Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[]},data);
        S.curMonth=new Date().getMonth();S.curYear=new Date().getFullYear();
        save();renderPage();alert('✅ Data úspěšně importována!');
      }catch(e){alert('Chyba: soubor není platný JSON');}
    };
    r.readAsText(f);
  };
  inp.click();
}
function confirmDeleteAllData() {
  if(!confirm('⚠️ Opravdu smazat VŠECHNA data? Tato akce je nevratná!'))return;
  if(!confirm('Jste si 100% jisti? Všechny transakce, dluhy a nastavení budou smazány.'))return;
  S={transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[]};
  S.curMonth=new Date().getMonth();S.curYear=new Date().getFullYear();
  save();renderPage();alert('✅ Všechna data smazána.');
}
function exportCSV() {
  const from=document.getElementById('exportFrom')?.value;
  const to=document.getElementById('exportTo')?.value;
  const type=document.getElementById('exportType')?.value||'all';
  const D=getData();
  let txs=(D.transactions||[]).filter(t=>!t.splitParent);
  if(from)txs=txs.filter(t=>t.date>=from);
  if(to)txs=txs.filter(t=>t.date<=to);
  if(type!=='all')txs=txs.filter(t=>t.type===type);
  txs=txs.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const esc=v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const header='Datum;Název;Částka;Měna;Typ;Kategorie;Podkategorie;Peněženka;Typ platby;Poznámka\n';
  const pts=(typeof getPayTypes==='function')?getPayTypes(D):(D.payTypes||[]);
  const rows=txs.map(t=>{
    const cat=(D.categories||[]).find(c=>c.id===(t.catId||t.category));
    const w=(D.wallets||[]).find(x=>x.id===t.wallet);
    const pt=pts.find(p=>p.id===t.payType);
    const amt=t.amount||t.amt||0;
    return [t.date, esc(t.name), amt, (t.currency||'CZK'),
      (t.type==='income'?'Příjem':t.type==='expense'?'Výdaj':'Převod'),
      esc(cat?.name||''), esc(t.subcat||''), esc(w?.name||''), esc(pt?.name||''), esc(t.note||'')
    ].join(';');
  }).join('\n');
  if(!txs.length){ if(typeof showToast==='function') showToast('⚠️ Žádné transakce k exportu'); return; }
  const blob=new Blob(['\uFEFF'+header+rows],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='financeflow-transakce-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  if(typeof showToast==='function') showToast(`📊 Exportováno ${txs.length} transakcí`);
  if(typeof closeModal==='function') closeModal('modalExportCsv');
}
function showPrivacyPolicy() { openPrivacyPolicy(); }
function showTerms() { openTerms(); }

// ══════════════════════════════════════════════════════
//  v9.75 (TODO-210): RECENZE PŘÍMO V APLIKACI
//
//  Dřív tu byla jen hláška „až budeme na Google Play". Zpětná vazba od prvních
//  uživatelů je přitom nejcennější právě teď – čekat na Play Store znamená
//  přijít o ni. Až aplikace na Play bude, uživatele tam odsud pošleme znovu.
//
//  ULOŽENÍ: reviews/{uid} – jedna recenze na uživatele, přepisovatelná.
//  Uzel je MIMO users/{uid}, takže kaskáda .write neplatí a pravidla jsou nutná
//  (poučení FIX-220: co není výslovně povoleno, je zakázáno).
// ══════════════════════════════════════════════════════
let _revStars = 0;
let _revStats = null;

function rateApp() {
  const uid = window._currentUser && window._currentUser.uid;
  if (!uid) { if (typeof showToast === 'function') showToast('Pro hodnocení se musíš přihlásit'); return; }
  _revStars = 0;
  _openReviewModal();
  _loadReviewStats();
  //  načíst vlastní předchozí recenzi, ať ji uživatel může upravit
  try {
    _get(_ref(_db, `reviews/${uid}`)).then(sn => {
      if (sn && sn.exists && sn.exists()) {
        const r = sn.val();
        _revStars = r.stars || 0;
        const ta = document.getElementById('revText'); if (ta) ta.value = r.text || '';
        _renderReviewStars();
        const t = document.getElementById('revTitle');
        if (t) t.textContent = 'Upravit hodnocení';
      }
    }).catch(() => {});
  } catch (e) {}
}

function _openReviewModal() {
  //  v9.76 (FIX-249): modal je staticky v app.html (stejně jako Privacy/Terms).
  //  Dřív se generoval v JS s třídami modal/modal-content, které aplikace nemá –
  //  chyběly centrovací styly a okno se zobrazilo mimo obrazovku.
  const m = document.getElementById('modalReview');
  if (!m) { console.warn('[review] modalReview není v app.html'); return; }
  _renderReviewStars();
  m.classList.add('open');
}

function closeReviewModal() {
  const m = document.getElementById('modalReview');
  if (m) m.classList.remove('open');
  const t = document.getElementById('revTitle');
  if (t) t.textContent = '⭐ Ohodnotit aplikaci';
}

function _renderReviewStars() {
  const el = document.getElementById('revStars'); if (!el) return;
  el.innerHTML = [1, 2, 3, 4, 5].map(n => `
    <button onclick="setReviewStars(${n})" title="${n} z 5"
      style="background:none;border:0;cursor:pointer;font-size:2rem;line-height:1;padding:0;
             filter:${n <= _revStars ? 'none' : 'grayscale(1)'};opacity:${n <= _revStars ? '1' : '.35'};transition:all .12s">⭐</button>`).join('');
}

function setReviewStars(n) { _revStars = n; _renderReviewStars(); }

async function submitReview() {
  const uid = window._currentUser && window._currentUser.uid;
  if (!uid) return;
  if (!_revStars) { if (typeof showToast === 'function') showToast('Vyber prosím počet hvězdiček'); return; }
  const txt = ((document.getElementById('revText') || {}).value || '').trim().slice(0, 600);
  try {
    await _set(_ref(_db, `reviews/${uid}`), {
      stars: _revStars,
      text: txt,
      at: Date.now(),
      ver: (document.title.match(/v[\d.]+/) || [''])[0],   // verze z titulku – APP_VERSION v appce není
      name: (window._userProfile && window._userProfile.displayName) || ''
    });
    //  v9.77: potvrzení se ukáže v okně a teprve pak se zavře – uživatel má
    //  vidět, že se akce povedla, i kdyby toast přehlédl.
    const box = document.getElementById('revStatsBox');
    if (box) box.innerHTML = `<div style="padding:9px 11px;background:rgba(74,222,128,.14);border-left:3px solid var(--income);border-radius:0 9px 9px 0;font-size:.8rem;color:#e8eaf2">✅ Uloženo, díky za hodnocení! 💚</div>`;
    if (typeof showToast === 'function') showToast('Díky za hodnocení! 💚');
    setTimeout(closeReviewModal, 900);
    _revStats = null;
    _loadReviewStats();
    if (typeof renderSettingsPage === 'function') renderSettingsPage();
  } catch (e) {
    //  v9.77: nejčastější příčina je PERMISSION_DENIED, když nejsou nasazená
    //  Firebase pravidla pro uzel reviews. Chybu ukážeme PŘÍMO V OKNĚ – toast
    //  se dá přehlédnout a uživatel by nevěděl, jestli se uložilo, nebo ne.
    console.warn('[review] uložení selhalo:', e);
    const box = document.getElementById('revStatsBox');
    const denied = /permission|denied/i.test(e && e.message || '');
    if (box) box.innerHTML = `<div style="padding:9px 11px;background:rgba(248,113,113,.12);border-left:3px solid var(--expense);border-radius:0 9px 9px 0;font-size:.76rem;color:#e8eaf2;line-height:1.5">
      Hodnocení se nepodařilo uložit.${denied ? ' Chybí oprávnění k zápisu — zkus to prosím později.' : ''}</div>`;
    if (typeof showToast === 'function') showToast('Hodnocení se nepodařilo uložit');
  }
}

//  Souhrn (průměr + počet). Načítá se jednou za relaci, výsledek se drží v paměti.
async function _loadReviewStats(force) {
  if (_revStats && !force) { _renderReviewStats(); return; }
  try {
    const sn = await _get(_ref(_db, 'reviews'));
    const val = (sn && sn.exists && sn.exists()) ? sn.val() : null;
    const arr = val ? Object.values(val).filter(r => r && r.stars) : [];
    _revStats = arr.length
      ? { count: arr.length, avg: arr.reduce((a, r) => a + r.stars, 0) / arr.length }
      : { count: 0, avg: null };
  } catch (e) {
    //  Čtení může být pravidly omezené – souhrn pak prostě nezobrazíme.
    _revStats = { count: 0, avg: null, err: 1 };
  }
  _renderReviewStats();
}

function _renderReviewStats() {
  const box = document.getElementById('revStatsBox');
  if (box) box.innerHTML = reviewStatsHTML();
  const sub = document.getElementById('rateAppSub');
  if (sub && _revStats && _revStats.count) {
    sub.textContent = `${_revStats.avg.toFixed(1).replace('.', ',')} ★ · ${_revStats.count} ${_revStats.count === 1 ? 'hodnocení' : _revStats.count < 5 ? 'hodnocení' : 'hodnocení'}`;
  }
}

function reviewStatsHTML() {
  if (!_revStats || _revStats.err) return '';
  if (!_revStats.count) return '<span style="color:#a8aec8">Zatím nikdo nehodnotil – můžeš být první.</span>';
  const a = _revStats.avg;
  return `<div style="display:flex;align-items:center;gap:9px;padding:9px 11px;background:var(--surface2);border-radius:9px">
    <span style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800;color:var(--debt)">${a.toFixed(1).replace('.', ',')}</span>
    <span style="font-size:1rem">${'⭐'.repeat(Math.round(a))}</span>
    <span style="margin-left:auto;font-size:.74rem;color:#a8aec8">${_revStats.count} ${_revStats.count === 1 ? 'hodnocení' : 'hodnocení'}</span>
  </div>`;
}

//  Až bude aplikace na Google Play, odsud se uživatel pošle i tam.
function openPlayStoreReview() {
  window.open('https://play.google.com/store/apps/details?id=cz.financeflow.app', '_blank');
}

function openPrivacyPolicy() {
  document.getElementById('modalPrivacy').classList.add('open');
}
function openTerms() {
  document.getElementById('modalTerms').classList.add('open');
}
function openContactForm() {
  document.getElementById('modalContact').classList.add('open');
  document.getElementById('contactStatus').innerHTML = '';
  // Vyčisti formulář
  document.getElementById('contactName').value = '';
  document.getElementById('contactEmail').value = '';
  document.getElementById('contactMessage').value = '';
}
function switchPrivacyLang(lang, btn) {
  document.getElementById('privacyCZ').style.display = lang==='cz' ? 'block' : 'none';
  document.getElementById('privacyEN').style.display = lang==='en' ? 'block' : 'none';
  document.querySelectorAll('#modalPrivacy .tx-filt-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
}
function switchTermsLang(lang, btn) {
  document.getElementById('termsCZ').style.display = lang==='cz' ? 'block' : 'none';
  document.getElementById('termsEN').style.display = lang==='en' ? 'block' : 'none';
  document.querySelectorAll('#modalTerms .tx-filt-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
}
async function sendContactForm() {
  const name    = (document.getElementById('contactName')?.value||'').trim();
  const email   = (document.getElementById('contactEmail')?.value||'').trim();
  const type    = document.getElementById('contactType')?.value||'other';
  const message = (document.getElementById('contactMessage')?.value||'').trim();
  const status  = document.getElementById('contactStatus');

  if(!email) {
    status.innerHTML='<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Prosím vyplňte email.</div></div>';
    return;
  }
  if(!message) {
    status.innerHTML='<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Prosím vyplňte zprávu.</div></div>';
    return;
  }

  status.innerHTML='<div class="insight-item warn"><div class="insight-icon">⏳</div><div class="insight-text">Odesílám...</div></div>';

  let saved = false;

  // 1. Ulož do Firebase
  try {
    if(window._db) {
      const key = Date.now()+'_'+Math.random().toString(36).slice(2,6);
      const uid = window._currentUser?.uid||'anon';
      await _set(_ref(_db,'support/'+key),{
        name,email,type,message,uid,
        date:new Date().toISOString(),version:'6.41',status:'new'
      });
      saved = true;
    }
  } catch(e) { console.log('Firebase save error:',e); }

  // 2. EmailJS - pošle email přímo (nevyžaduje doménu)
  try {
    const EMAILJS_SERVICE = 'service_financeflow';
    const EMAILJS_TEMPLATE = 'template_contact';
    const EMAILJS_KEY = 'YOUR_EMAILJS_PUBLIC_KEY'; // TODO: doplnit z emailjs.com
    
    if(EMAILJS_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY' && window.emailjs) {
      await window.emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        from_name: name||'Anonymní',
        from_email: email,
        msg_type: type,
        message,
        to_email: 'bc.milda@gmail.com'
      }, EMAILJS_KEY);
    } else {
      // Fallback: Worker s Resend
      const typeLabel = type==='bug'?'🐛 Chyba':type==='feature'?'💡 Návrh':type==='support'?'❓ Podpora':'📧 Zpráva';
      // Získej Firebase ID token pro autorizaci Workeru
      let idToken = '';
      try {
        if(window._currentUser) idToken = await window._currentUser.getIdToken();
      } catch(e) { console.log('Token error:', e); }
      const headers = {'Content-Type':'application/json'};
      if(idToken) headers['Authorization'] = 'Bearer ' + idToken;
      const workerRes = await fetch('https://misty-limit-0523.bc-milda.workers.dev',{
        method:'POST',
        headers,
        body:JSON.stringify({type:'contact_form',payload:{from_name:name,from_email:email,msg_type:type,message}})
      });
      const workerData = await workerRes.json().catch(()=>({}));
      console.log('Worker response:', workerData);
    }
  } catch(e) { console.log('Email send error:',e); }

  if(saved) {
    status.innerHTML='<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text"><strong>Děkujeme!</strong> Vaše zpráva byla přijata. Odpovíme na <strong>'+email+'</strong>.</div></div>';
    setTimeout(()=>{
      document.getElementById('contactName').value='';
      document.getElementById('contactEmail').value='';
      document.getElementById('contactMessage').value='';
      status.innerHTML='';
      closeModal('modalContact');
    },2500);
  } else {
    status.innerHTML='<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text">Nepodařilo se uložit. Napište přímo na <strong>bc.milda@gmail.com</strong>.</div></div>';
  }
}

function showEmailSuggest(val) {
  const el = document.getElementById('emailSuggest');
  if(!el) return;
  const atIdx = val.indexOf('@');
  if(atIdx < 0) { el.style.display='none'; return; }
  const prefix = val.slice(0, atIdx+1);
  const typed = val.slice(atIdx+1).toLowerCase();
  const domains = ['gmail.com','seznam.cz','email.cz','outlook.com','hotmail.com','icloud.com','yahoo.com','centrum.cz','volny.cz'];
  const matches = typed ? domains.filter(d => d.startsWith(typed)) : domains;
  if(!matches.length) { el.style.display='none'; return; }
  el.style.display = 'block';
  el.innerHTML = matches.map(d =>
    `<div style="padding:8px 12px;cursor:pointer;font-size:.84rem" onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''" onclick="document.getElementById('contactEmail').value='${prefix}${d}';hideEmailSuggest()">${prefix}<strong>${d}</strong></div>`
  ).join('');
}
function hideEmailSuggest() {
  const el = document.getElementById('emailSuggest');
  if(el) el.style.display = 'none';
}


// ══════════════════════════════════════════════════════
//  CELKOVÝ MAJETEK (NET WORTH)
// ══════════════════════════════════════════════════════
function computeNetWorth(D) {
  D = D || getData();
  const wallets = D.wallets || [];
  let total = 0;
  const rows = wallets.map(w => {
    const bal = computeWalletBalance(w.id, D);
    // Pro součet majetku přepočti na CZK; v řádku ukaž originál v měně peněženky
    const balCZK = (typeof toCZK==='function') ? toCZK(bal, w.currency||'CZK') : bal;
    total += balCZK;
    return { name: w.name, type: w.type, balance: bal, balanceCZK: balCZK, currency: w.currency||'CZK', color: w.color || '#4ade80' };
  });
  // Add bank savings if no wallets defined
  if(!rows.length) {
    const bankBal = computeBank(D);
    total = bankBal;
    rows.push({ name: 'Úspory (Bank)', type: 'savings', balance: bankBal, color: '#60a5fa' });
  }
  // Virtuální peněženka (naspořeno v aktivních cílech) jako řádek majetku
  if (typeof goalGetSaved === 'function') {
    // FIX-289 (S20, Milan): dřív `w.done !== true` – SPLNĚNÝ cíl vypadl z výpočtu
    //   a Virtuální peněženka z Čistého majetku zmizela. Jenže označit cíl za
    //   splněný NEZNAMENÁ vybrat z něj peníze – ty tam leží dál, dokud si je
    //   člověk nepřevede zpátky do peněženky. Do majetku patří vždy, když tam jsou.
    const goalsWithMoney = (D.wishes||[]).filter(w => w.isGoal);
    const vwSaved = goalsWithMoney.reduce((s,g) => s + goalGetSaved(g.id), 0);
    if (vwSaved > 0) {
      total += vwSaved;
      rows.push({ name: 'Virtuální peněženka', type: 'savings', balance: vwSaved, balanceCZK: vwSaved, currency: 'CZK', color: '#f59e0b', isVirtual: true });
    }
  }
  // FIX-287 (S20, Milan): FINANČNÍ AKTIVA do Čistého majetku. Dashboard počítal jen
  //   peněženky + cíle − dluhy, takže nemovitosti, investice ani rezerva se nezapočítaly –
  //   karta Aktiva pak ukazovala úplně jiné číslo než Dashboard.
  //   VYNECHÁVÁME tier 'virtual' („Vklad do cíle") – to jsou týtéž peníze, které už nese
  //   řádek Virtuální peněženka výše (viz FIX-285). Bez toho by se počítaly dvakrát.
  let totalAssets = 0;
  const assetRows = [];
  (D.assets||[]).forEach(a => {
    if (typeof assetTier === 'function' && assetTier(a) === 'virtual') return;
    const v = a.value || 0;
    if (!v) return;
    totalAssets += v;
    assetRows.push({ name: a.name, type: a.type, balance: v, balanceCZK: v, currency: 'CZK',
                     color: a.color || '#c9cede', isAsset: true, icon: a.icon });
  });
  // Subtract debts
  const totalDebt = (D.debts||[]).reduce((a,d) => a + d.remaining, 0);
  return { total: total + totalAssets - totalDebt, rows, totalDebt, assetRows, totalAssets,
           totalWithoutAssets: total - totalDebt };
}

let _networthShowDebt = true;
// FIX-287: zobrazovat finanční aktiva v Čistém majetku (výchozí ANO – patří do majetku).
let _networthShowAssets = (()=>{ try { return localStorage.getItem('ff_nw_assets') !== '0'; } catch(e){ return true; } })();

function toggleNetworthDebt() {
  _networthShowDebt = !_networthShowDebt;
  renderNetWorth();
}

// ══════════════════════════════════════════════════════
//  FINANČNÍ SKÓRE – Dashboard karta
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// FINANČNÍ SKÓRE v2 – computeFinancialScore()
// Session 8, FIX-078 — Přepracování dle ADR-042 (Option C)
//
// 4 NEZÁVISLÉ složky (bez dvojitého postihu za záporné saldo):
//   S1: Cash flow (0–25)   expRatio = výdaje/příjmy AKTUÁLNÍ měsíc
//   S2: Zadluženost (0–25) DTI (0–13) + DSTI (0–12) NEZÁVISLE
//   S3: Rezerva (0–25)     monthsReserve = úspory/baseIncome HISTORICKÁ
//   S4: Spoření (0–25)     activeSavingRate = isSaving kategorií/baseIncome
//
// + Konzistenční bonus (+2/+5/+9/+13/+15) za nepřetržité zlepšení
// Lookup tabulky s 1-bodovými rozestupy. Max 100 (cap).
// ══════════════════════════════════════════════════════
// v8.72: bodovací tabulky S1/S4 sdílené s Měsíčním reportem (3 složky zdraví)
const _FIN_S1_TABLE = [
  [0.50,25],[0.54,24],[0.58,23],[0.62,22],[0.66,21],[0.70,20],
  [0.73,19],[0.76,18],[0.79,17],[0.82,16],[0.85,15],[0.88,14],
  [0.91,13],[0.94,12],[0.97,11],[1.00,10],[1.04,9],[1.08,8],
  [1.12,7],[1.17,6],[1.22,5],[1.28,4],[1.35,3],[1.45,2],[1.60,1],
];
const _FIN_S4_TABLE = [
  [25,25],[23,24],[21,23],[19,22],[17,21],[15,20],
  [13,18],[11,16],[9,14],[7,12],[5,10],[4,8],[3,6],[2,4],[1,2],[0.1,1],
];
function finScoreS1(expRatio){ // výdaje/příjmy → 0–25 b (bodovací tabulka Cash flow)
  if(expRatio==null) return 12;
  for(const [t,p] of _FIN_S1_TABLE){ if(expRatio<=t) return p; }
  return 0;
}
function finScoreS4(rate){ // % základu odloženo do investic → 0–25 b (tabulka Spoření)
  if(rate==null) return 12;
  for(const [t,p] of _FIN_S4_TABLE){ if(rate>=t) return p; }
  return 0;
}

//  v9.58 (FIX-228): funkce nyní přijímá měsíc/rok. Bez toho počítala vždy
//  jen aktuální měsíc, takže graf vývoje nemohl ukázat skóre 0–310 za starší
//  měsíce a musel sahat po jiném (0–100) čísle – odtud rozpor 91 vs 140.
//  v10.60 (S22): volitelný 4. parametr `_cfg` = dočasná konfigurace vah/kotev.
//  Slouží ADMIN SIMULÁTORU (adminScoringSim) – ten jím počítá „co by se stalo,
//  kdyby" nad Milanovými skutečnými daty, aniž by sáhl na ostrou `_SCORING_V2`.
//  Funkce zůstává čistá: nic nemutuje, bez parametru se chová přesně jako dřív.
function computeFinancialScore(D, _m, _y, _cfg) {
  const _M = (_m == null) ? S.curMonth : _m;
  const _Y = (_y == null) ? S.curYear  : _y;
  const baseIncome = computeBaseIncome(D);
  const txs = getTx(_M, _Y, D);
  const totalInc = incSum(txs);
  const totalExp = expSum(txs);
  const debts = D.debts || [];

  // v8.72 (FIX-188): sjednocené splátky (installments + freq) a příjem – stejné jako
  // Bankovní hodnocení a Dluhový stres index (dřív DSTI 732 % vs 753 %).
  const monthlyPayments = computeMonthlyDebtPayments(D);
  // S16 (TODO-160): DTI = 12M klouzavý průměr, DSTI = 3–12M adaptivní (stabilní napříč měsíci)
  const incDTI  = computeEffectiveIncome(D, 12);
  const incDSTI = computeEffectiveIncome(D, 12);
  const totalDebt = debts.reduce((a,d)=>a+(d.remaining||0),0);
  const annualIncome = (incDTI||totalInc) * 12;

  // ══════════════════════════════════════════════════════
  //  v10.60 (TODO-228, S22): FINANČNÍ SKÓRE v2 – VÁHY + KOTVY
  //  Nahrazuje schodovité bodovací tabulky (76/60/41/50/31 řádků) lineární
  //  interpolací mezi kotvami (mscInterpV2, helpers.js). Důležitost složky
  //  řídí VÁHA v procentech (_SCORING_V2.vahy), ne velikost tabulky.
  //  Nezměřitelná složka NEDOSTANE ani 0 ani 100 – vypadne z výpočtu úplně,
  //  její váha se rozpustí mezi zbylé (nula lže stejně jako sto, jen opačně).
  //  Pod prahem pokrytí (50 % vah) appka NEUKÁŽE známku ani číslo – jinak by
  //  nový účet, co jen potvrdí „nemám dluh" (25 % pokrytí), dostal „Výborné".
  //  Podklad: NAVRH-skore-v2.md, scoring-config-v2.json (odsouhlaseno S22).
  //  Milanovo rozhodnutí S22: interně 0–100, zobrazení/historie ×3,1 (0–310) –
  //  stejná škála jako dřív, žádný přepočet ani svislá čára v grafu.
  // ══════════════════════════════════════════════════════
  const SV2 = _cfg || _SCORING_V2;

  // ── S1: Cash flow (výdaje/příjmy) ──
  let expRatio = null, s1sub = null;
  const s1avail = totalInc > 0 && txs.length > 0;
  if (s1avail) { expRatio = totalExp / totalInc; s1sub = mscInterpV2(SV2.S1, expRatio); }
  const s1label = !s1avail ? '⏳ Zatím nezměřeno' :
    s1sub>=80?'🟢 Cash flow OK':s1sub>=45?'🟡 Výdaje '+Math.round(expRatio*100)+'% příjmu':'🔴 Výdaje překračují příjmy';

  // ── S2: Zadluženost = DTI (60 %) + DSTI (40 %) ──
  const dti  = annualIncome > 0 ? totalDebt / annualIncome * 100 : 0;
  const dsti = (incDSTI||totalInc) > 0 ? monthlyPayments / (incDSTI||totalInc||1) * 100 : 0;
  // „nemám dluh" vs. „ještě jsem ho nezadal" vypadá v datech stejně – plný počet
  // se přizná JEN po potvrzení v onboardingu (_settings.hasDebts === false).
  const _debtsKnown = debts.length>0
    || (typeof _settings!=='undefined' && _settings && _settings.hasDebts === false);
  const s2avail = _debtsKnown;
  const dtiSub  = !s2avail ? null : (debts.length>0 ? mscInterpV2(SV2.DTI, dti)   : 100);
  const dstiSub = !s2avail ? null : (debts.length>0 ? mscInterpV2(SV2.DSTI, dsti) : 100);
  const s2sub = s2avail ? (dtiSub*SV2.podilDTI + dstiSub*SV2.podilDSTI)/100 : null;
  const s2label = !s2avail ? '⏳ Zatím nezměřeno' :
    s2sub>=80?'🟢 Nízké zadlužení':s2sub>=45?`🟡 DTI ${Math.round(dti)}% / DSTI ${Math.round(dsti)}%`:`🔴 Vysoké zadlužení – DSTI ${Math.round(dsti)}%`;

  // ── S3: Rezerva – v2 (Milan, S22): proti VÝDAJŮM, ne příjmu.
  //   „Jak dlouho vydržím bez příjmu" určuje to, kolik utrácím, ne kolik
  //   vydělávám. Dostupnost navíc vyžaduje aspoň jednu spořicí/rezervní
  //   peněženku nebo aktivum – jinak nula lže, že rezerva neexistuje, místo
  //   toho, že ji appka jen nevidí (stejná past jako dřív u S1/S4). ──
  const savWallets = (D.wallets||[]).filter(w=>w.type==='savings'||w.type==='investment');
  let savBalance = savWallets.reduce((a,w)=>a+(w.balance||0),0);
  let reserveAssetsCount = 0;
  if(typeof assetTier==='function'){
    const reserveAssets = (D.assets||[]).filter(a=>assetTier(a)==='reserve');
    reserveAssetsCount = reserveAssets.length;
    savBalance += reserveAssets.reduce((a2,x)=>a2+(x.value||0),0);
  }
  const s3avail = (savWallets.length>0 || reserveAssetsCount>0) && totalExp > 0;
  const monthsReserve = s3avail ? savBalance / totalExp : null;
  const s3sub = s3avail ? mscInterpV2(SV2.S3, monthsReserve) : null;
  const s3label = !s3avail ? '⏳ Zatím nezměřeno' :
    s3sub>=80?`🟢 Rezerva ${monthsReserve.toFixed(1)} měs. výdajů`:s3sub>=45?`🟡 Rezerva ${monthsReserve.toFixed(1)} měs.`:`🔴 Nízká rezerva`;

  // ── S4: Míra spoření (tok, ne stav) – 📈 isInvest/isSaving → % základu ──
  let savCats = (D.categories||[]).filter(c=>c.isInvest && c.name!=='Virtuální přesun');
  if(!savCats.length) savCats = (D.categories||[]).filter(c=>c.isSaving && c.name!=='Virtuální přesun');
  const s4avail = savCats.length > 0 && (baseIncome||0) > 0;
  let activeSavingRate = null, s4sub = null;
  if (s4avail) {
    const totalSaved = savCats.reduce((a,c)=>a+getActual(c.id,null,_M,_Y,D),0);
    activeSavingRate = totalSaved / (baseIncome||1) * 100;
    s4sub = mscInterpV2(SV2.S4, activeSavingRate);
  }
  const s4label = !s4avail ? '⏳ Zatím nezměřeno' :
    s4sub>=80?`🟢 Spoříš ${Math.round(activeSavingRate)}% příjmu`:s4sub>=45?`🟡 Spoříš ${Math.round(activeSavingRate)}%`:`🔴 Spoření nízké`;

  // ── S5: Dodržování rozpočtu – napojeno na Měsíční report (0–100) ──
  let budgetPct = null, s5sub = null;
  let s5avail = false;
  if (typeof computeHealthScores==='function') {
    try {
      const hs = computeHealthScores(D, _M, _Y);
      budgetPct = hs.budgetScore; // 0–100
      // hodnotí se jen tehdy, když má uživatel aspoň jednu kategorii s limitem
      s5avail = (D.categories||[]).some(c=>(c.healthPct>0)||(c.healthAmt>0));
      s5sub = s5avail ? mscInterpV2(SV2.S5, budgetPct) : null;
    } catch(e){}
  }
  const s5label = !s5avail ? '⏳ Zatím nezměřeno' :
    s5sub>=80?`🟢 Rozpočet drží (${budgetPct}/100)`:s5sub>=45?`🟡 Rozpočet ${budgetPct}/100`:`🔴 Limity překročeny (${budgetPct}/100)`;

  // ── KONZISTENČNÍ BONUS (max +5 na škále 0–100) ───────────────────────
  // Session 10 FIX: PŮVODNĚ se počítadlo `consistencyMonths` MUTOVALO do
  // D.scoreState při KAŽDÉM volání funkce (inkrement/reset). Protože se
  // computeFinancialScore() volá z mnoha míst (render, networth, ai.js) a při
  // každém přepnutí měsíce, počítadlo skákalo nepředvídatelně → skóre se měnilo
  // bez zjevného důvodu (např. 18 → 25 → 31 po překliknutí měsíců).
  // OPRAVA: bonus se počítá DETERMINISTICKY z historie dat – projdeme historii
  // zpět od aktuálního měsíce a spočítáme, kolik PO SOBĚ JDOUCÍCH měsíců se
  // výdaje meziměsíčně snižovaly. Žádná mutace stavu, čistá funkce.
  let pm=_M-1,py=_Y;if(pm<0){pm=11;py--;}
  const prevTxs=getTx(pm,py,D);
  const prevExp=expSum(prevTxs), prevInc=incSum(prevTxs);
  const prevSal=prevInc-prevExp, curSal=totalInc-totalExp;

  // Deterministický výpočet konzistence: kolik po sobě jdoucích měsíců (zpět od
  // aktuálního) měl uživatel meziměsíční pokles výdajů + nějaký příjem.
  // v2: strop 12 měsíců (dřív 6) – kotva bonusu jde až na 12 měsíců (viz níže).
  let cm=0;
  {
    let m=_M, y=_Y;
    for(let i=0;i<12;i++){
      let pmm=m-1,pyy=y;if(pmm<0){pmm=11;pyy--;}
      const curT=getTx(m,y,D), prvT=getTx(pmm,pyy,D);
      const curE=expSum(curT), prvE=expSum(prvT), prvI=incSum(prvT);
      // Trvá řetězec, jen pokud měl předchozí měsíc příjem a výdaje klesly
      if(prvI>0 && curE<prvE){ cm++; m=pmm; y=pyy; }
      else break;
    }
  }
  const consistencyBonus100 = mscInterpV2(SV2.bonus.kotvy, cm) ?? 0;   // 0–5, na škále 0–100

  // Trend label (pro dashboard kartu)
  const incImprove=totalInc>=prevInc, expImprove=totalExp<=prevExp, salImprove=curSal>=prevSal;
  const posCount=[incImprove,expImprove,salImprove].filter(Boolean).length;
  const trendScore = prevInc>0?[5,12,20,25][posCount]:17;
  const trendLabel = trendScore>=20?'🟢 Pozitivní trend':trendScore>=12?'🟡 Stabilní trend':'🔴 Zhoršující se trend';

  // ── VÁŽENÝ PRŮMĚR (TODO-228) ──────────────────────────────────────
  //   Nezměřitelná složka vypadne z čitatele I jmenovatele – váha se rozpustí
  //   mezi zbylé v jejich vzájemném poměru. Matematicky totéž jako vážený
  //   průměr počítaný jen přes dostupné složky (Σ vah vždy = 100 %).
  const _slozky = [
    { k:'S1', nazev:'cash flow',    avail:s1avail, sub:s1sub, w:SV2.vahy.S1 },
    { k:'S2', nazev:'zadluženost',  avail:s2avail, sub:s2sub, w:SV2.vahy.S2 },
    { k:'S3', nazev:'rezerva',      avail:s3avail, sub:s3sub, w:SV2.vahy.S3 },
    { k:'S4', nazev:'spoření',      avail:s4avail, sub:s4sub, w:SV2.vahy.S4 },
    { k:'S5', nazev:'rozpočet',     avail:s5avail, sub:s5sub, w:SV2.vahy.S5 },
  ];
  const _live = _slozky.filter(x=>x.avail);
  const availWeight = _live.reduce((a,x)=>a+x.w, 0);           // Σ vah = 100 → rovnou %
  const coverage = availWeight;                                 // z kolika % je skóre podložené
  const weightedSum = _live.reduce((a,x)=>a+x.w*x.sub, 0);
  const total100raw = availWeight>0 ? weightedSum/availWeight : null;   // 0–100, vážený průměr
  const total100 = total100raw===null ? null : Math.min(100, total100raw + consistencyBonus100);
  const missing = _slozky.filter(x=>!x.avail).map(x=>x.k);
  const missingNames = _slozky.filter(x=>!x.avail).map(x=>x.nazev);

  //   Práh pokrytí (TODO-228): pod ním appka NEUKÁŽE známku ani číslo – jinak
  //   dostane nový účet, co jen potvrdí „nemám dluh" (25 % pokrytí), „Výborné".
  const belowThreshold = coverage < SV2.prahPokryti;
  const total = (total100===null || belowThreshold) ? null : Math.round(total100);

  //   Milanovo rozhodnutí S22: zobrazení a historie zůstávají na staré škále
  //   0–310 (×3,1) – žádný přepočet starých snímků, žádná svislá čára v grafu.
  const SCALE = SV2.meritko310;
  const rawMax = 310;
  const rawTotal = total===null ? 0 : Math.round(total100 * SCALE);
  const availMax = Math.round(coverage/100 * rawMax);
  const consistencyBonus = Math.round(consistencyBonus100 * SCALE);   // pro UI text „+X bodů"

  const grade = total === null
    ? (belowThreshold && total100raw!==null
        ? {label:'Zatím nemám dost dat na hodnocení', emoji:'⏳', color:'#a8aec8',
           hint:'Doplň, co appka umí změřit, a skóre se objeví.'}
        : {label:'Zatím nelze určit', emoji:'⏳', color:'#a8aec8'})
    : (SV2.znamky.find(z=>total>=z.min) || SV2.znamky[SV2.znamky.length-1]);

  // Body do skóre 0–310 na displeji – pevně zaokrouhlená maxima (93/78/62/46/31,
  // součet přesně 310), viz _SCORING_V2.maxBody310.
  const _dm = SV2.maxBody310;

  //   baseTotal = výsledek PŘED konzistenčním bonusem, na téže škále 0–310
  //   jako rawTotal (dřív to byl vážený součet w×sub, tedy 0–10 000 – nikde se
  //   nezobrazoval, ale každý, kdo by ho vzal, by dostal nesmysl).
  const baseTotal = total===null ? 0 : Math.round((total100raw||0) * SCALE);

  return {
    total, baseTotal, consistencyBonus, grade, rawTotal, rawMax,
    availMax, coverage, missing, missingNames,   // TODO-228: z čeho je skóre podložené
    components: [
      {label:'💰 Cash flow',   score:Math.round((s1sub??0)*_dm.S1/100), max:_dm.S1, detail:s1label, avail:s1avail, hint:'Zapiš příjem a výdaje za tenhle měsíc.'},
      // FIX-309: „Ano, mám půjčku" bez zadané půjčky nechávalo uživatele bez kudy dál.
      {label:'🏦 Zadluženost', score:Math.round((s2sub??0)*_dm.S2/100), max:_dm.S2, detail:s2label, avail:s2avail,
       hint:'Appka ví, že dluh máš, ale nezná ho.', action:"showPage('dluhy');", actionLabel:'Zadat půjčku →',
       sub:[{label:'DTI',score:Math.round(dtiSub??0),max:100},{label:'DSTI',score:Math.round(dstiSub??0),max:100}]},
      {label:'🐷 Rezerva',     score:Math.round((s3sub??0)*_dm.S3/100), max:_dm.S3, detail:s3label, avail:s3avail, hint:'Založ spořicí peněženku nebo rezervní aktivum.'},
      {label:'💎 Spoření',     score:Math.round((s4sub??0)*_dm.S4/100), max:_dm.S4, detail:s4label, avail:s4avail, hint:'Označ kategorii jako investiční nebo spořicí.'},
      {label:'📊 Rozpočet',    score:Math.round((s5sub??0)*_dm.S5/100), max:_dm.S5, detail:s5label, avail:s5avail, hint:'Nastav limit aspoň u jedné kategorie.'},
    ],
    trend:{score:trendScore,label:trendLabel,consistencyMonths:cm,bonus:consistencyBonus},
  };
}

// ══════════════════════════════════════════════════════
//  v9.43 (TODO-200): Obloukový ukazatel finančního skóre
//  Nahrazuje kruhový prsten. Půlkruh 0–rawMax s barevnými pásmy
//  podle hranic známek (30/45/60/75/90 %) + ručička na aktuální hodnotě.
//  Pásma čtou POMĚR z rawMax (SKILL 9) – funguje i při změně škály.
//  Samostatná funkce – pokud vznikne druhý obloukový gauge,
//  přesunout do helpers.js jako sdílený helper (SKILL 7/17).
// ══════════════════════════════════════════════════════
const _FSCORE_ZONES = [
  [0,   .30, '#f87171', 'Kritické'],
  [.30, .45, '#fb923c', 'Rizikové'],
  [.45, .60, '#fbbf24', 'Průměrné'],
  [.60, .75, '#a78bfa', 'Dobré'],
  [.75, .90, '#60a5fa', 'Velmi dobré'],
  [.90, 1,   '#4ade80', 'Výborné'],
];

function _scoreArcGauge(rawTotal, rawMax, gradeColor) {
  const CX = 145, CY = 142, R = 104, SW = 18;
  // bod na oblouku: f=0 vlevo (180°), f=1 vpravo (0°)
  const pt = (f, r) => { const a = (180 - f*180) * Math.PI/180; return [CX + r*Math.cos(a), CY - r*Math.sin(a)]; };
  const arc = (f1, f2, r) => {
    const [x1,y1] = pt(f1,r), [x2,y2] = pt(f2,r);
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
  };

  const bands = _FSCORE_ZONES.map(([a,b,c,lbl]) =>
    `<path d="${arc(a,b,R)}" fill="none" stroke="${c}" stroke-width="${SW}" opacity=".92">`
    + `<title>${lbl}: ${Math.round(rawMax*a)}–${Math.round(rawMax*b)} bodů</title></path>`).join('');

  let ticks = '';
  for (let i = 0; i <= 5; i++) {
    const f = i/5, v = Math.round(rawMax*f);
    const [x1,y1] = pt(f, R+10), [x2,y2] = pt(f, R+15), [tx,ty] = pt(f, R+27);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#7e84a0" stroke-width="1.5"/>`;
    ticks += `<text x="${tx.toFixed(1)}" y="${(ty+4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#a8aec8" font-weight="600">${v}</text>`;
  }

  const fv  = Math.max(0, Math.min(1, rawMax>0 ? rawTotal/rawMax : 0));
  const deg = (fv*180 - 90).toFixed(2); // ručička kreslena vzhůru, rotace -90°…+90°

  return `<svg viewBox="0 0 290 200" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block">
    ${bands}${ticks}
    <g transform="rotate(${deg} ${CX} ${CY})" style="transition:transform .8s cubic-bezier(.34,1.56,.64,1)">
      <line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY-88}" stroke="#e8eaf2" stroke-width="5" stroke-linecap="round"/>
    </g>
    <circle cx="${CX}" cy="${CY}" r="8" fill="var(--surface3)" stroke="${gradeColor}" stroke-width="3"/>
    <text x="${CX}" y="176" text-anchor="middle"><tspan font-size="32" font-weight="800" font-family="Syne,sans-serif" fill="${gradeColor}">${rawTotal}</tspan><tspan font-size="13" fill="#a8aec8"> / ${rawMax}</tspan></text>
  </svg>`;
}

// Kolik bodů chybí do nejbližší lepší známky (null = už v nejvyšším pásmu)
function _scoreNextGrade(rawTotal, rawMax) {
  const NEXT = [[.30,'⚠️ Rizikové'],[.45,'📊 Průměrné'],[.60,'👍 Dobré'],[.75,'⭐ Velmi dobré'],[.90,'🏆 Výborné']];
  for (const [t,label] of NEXT) {
    const need = Math.round(rawMax*t) - rawTotal;
    if (need > 0) return {need, label};
  }
  return null;
}

//  S23 (Milan): JEDNO MÍSTO, KDE SE ROZHODUJE, JAKÁ ŠKÁLA SE UKAZUJE.
//  Dashboard to od v10.85 uměl (202 z 202 při 65% pokrytí), Měsíční report
//  ale ukazoval 310 z 310 a k tomu nedostupné složky jako nulu — dvě různá
//  čísla pod stejným názvem. Kdo potřebuje zobrazit skóre, volá tohle.
function scoreZobrazeni(sc) {
  if (!sc) return { tot: 0, max: 0, zuzeno: false };
  const zuzeno = (sc.total !== null && sc.coverage < 100 && sc.availMax > 0);
  const max = zuzeno ? sc.availMax : sc.rawMax;
  const tot = zuzeno ? Math.min(max, Math.round(sc.rawTotal * max / sc.rawMax)) : sc.rawTotal;
  return { tot, max, zuzeno, chybi: sc.rawMax - max };
}
window.scoreZobrazeni = scoreZobrazeni;

function renderFinancialScore(D) {
  const el = document.getElementById('financialScoreCard'); if(!el) return;
  const sc = computeFinancialScore(D);
  const {baseTotal, consistencyBonus, grade, components, trend} = sc; // v9.43: `total` (0–100) už není potřeba – gauge čte rawTotal/rawMax
  const borderColor = grade.color + '44';
  const bgColor = grade.color + '0d';

  const barColor = (score, max) => score/max>=0.8?'var(--income)':score/max>=0.5?'var(--debt)':'var(--expense)';

  //  S23 (Milan): „DASHBOARD KECÁ – ŘÍKÁ, ŽE REZERVU A SPOŘENÍ NEPOČÍTÁ, A PŘITOM
  //  UKAZUJE 310 / 310." Měl pravdu. V10.60 jsem půlkruhu vrátil pevných 310 kvůli
  //  nesmyslu „285 / 171" – jenže ten vznikl tím, že se ZÚŽIL JEN JMENOVATEL.
  //  Správně se musí na dosažitelnou škálu převést OBĚ čísla: při 65% pokrytí je
  //  ve hře 202 bodů a uživatel má 202 z nich. Poměr (a tím známka i ručička)
  //  zůstává stejný, jen číslo přestane tvrdit, že je plný počet. Zbylé body se
  //  „odemknou", až půjde změřit, co chybí. Navazuje na FIX-309.
  const _z = scoreZobrazeni(sc), _zuzeno = _z.zuzeno, gMax = _z.max, gTot = _z.tot;

  el.innerHTML = `<div class="fscore-card" style="background:linear-gradient(135deg,${bgColor},var(--surface));border-color:${borderColor}">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <!-- v9.43: obloukový ukazatel s pásmy známek -->
      <div class="fscore-gauge">
        <!-- v10.60 (TODO-228): gauge dostává VŽDY rawMax (310).
             V v1 byl rawTotal součtem bodů jen za dostupné složky, takže
             availMax byl správný jmenovatel. V v2 je rawTotal už
             znormalizovaný vážený průměr ×3,1 – leží vždy na plné škále.
             Podávat mu availMax znamenalo „285 / 171" a ručičku na dorazu. -->
        ${_scoreArcGauge(gTot, gMax, grade.color)}
        <div class="fscore-zones">
          ${_FSCORE_ZONES.map(([a,b,c,lbl])=>{
            const on = lbl===grade.label;
            return `<span style="color:${on?c:'#a8aec8'};font-weight:${on?'800':'600'}"><i style="background:${c}"></i>${lbl}</span>`;
          }).join('')}
        </div>
      </div>
      <!-- Info -->
      <div style="flex:1;min-width:140px">
        <div style="font-size:.72rem;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Finanční skóre</div>
        <div style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800;color:${grade.color}">${grade.emoji} ${grade.label}</div>
        <div style="font-size:.74rem;color:#a8aec8;margin-top:4px">Celkové hodnocení vaší finanční situace</div>
        ${sc.total===null ? '' : (()=>{ const nx=_scoreNextGrade(gTot, gMax);
          return nx ? `<div style="font-size:.72rem;margin-top:5px;color:#c9cede">Do známky <b style="color:var(--text)">${nx.label}</b> chybí <b style="color:var(--text)">${nx.need}</b> ${nx.need===1?'bod':nx.need<5?'body':'bodů'}</div>`
                    : `<div style="font-size:.72rem;margin-top:5px;color:var(--income)">🏆 Jsi v nejvyšším pásmu hodnocení${_zuzeno?' — z toho, co jde změřit':''}</div>`; })()}
        ${(sc.total!==null && consistencyBonus>0)?`<div style="font-size:.68rem;margin-top:4px;color:var(--income)">🎯 Konzistentní trend: +${consistencyBonus} bodů (${trend.consistencyMonths} měs.)</div>`:''}
        <!-- v10.60 (TODO-228): škála se už nezužuje (rawMax je vždy 310) –
             místo toho se říká, z KOLIKA PROCENT je skóre podložené. -->
        ${(()=>{
          const chybi = (sc.missingNames||[]).join(', ');
          if(sc.total===null && sc.coverage>0) return `<div style="font-size:.7rem;margin-top:6px;color:#a8aec8;line-height:1.5">
             Zatím umím změřit jen ${sc.coverage} % z toho, co do skóre patří — na hodnocení je potřeba aspoň 50 %.
             Chybí: ${chybi}. Doplň to a skóre se objeví.</div>`;
          if(sc.total===null) return `<div style="font-size:.7rem;margin-top:6px;color:#a8aec8;line-height:1.5">
             Zatím nemám co měřit. Začni tím, že zapíšeš příjem a výdaje za tenhle měsíc.</div>`;
          if(sc.coverage<100) return `<div style="font-size:.7rem;margin-top:6px;color:#a8aec8;line-height:1.5">
             Ve hře je zatím <b style="color:#c9cede">${gMax} z ${sc.rawMax} bodů</b> (${sc.coverage} %) — ${sc.missing.length===1?'složka':'složky'} <b style="color:#c9cede">${chybi}</b>
             se ${sc.missing.length===1?'zatím nedá':'zatím nedají'} změřit, takže ${sc.missing.length===1?'její':'jejich'} body (${sc.rawMax-gMax}) nejsou ani přičtené, ani stržené.
             Doplň, co chybí, a škála se rozšíří na plných ${sc.rawMax}.</div>`;
          return '';
        })()}
        <button class="btn btn-ghost btn-sm" style="margin-top:8px;font-size:.72rem" onclick="showPage('obraz',null)">📈 Podrobná analýza →</button>
      </div>
      <!-- 4 složky -->
      <div style="flex:2;min-width:200px">
        ${components.map(c => c.avail === false ? `
          <div class="fscore-row" style="opacity:.75">
            <div style="font-size:.74rem;color:var(--text2);min-width:130px">${c.label}</div>
            <div class="fscore-bar"><div class="fscore-bar-fill" style="width:0"></div></div>
            <div style="font-size:.72rem;font-weight:700;min-width:36px;text-align:right;color:#a8aec8">—</div>
          </div>
          <div style="font-size:.7rem;color:#a8aec8;padding:0 0 8px 16px;line-height:1.5">
            Zatím nezměřeno${c.hint?` · ${c.hint}`:''}${c.action?` <a href="#" onclick="${c.action}return false" style="color:#7dd34f;font-weight:700">${c.actionLabel}</a>`:''}
          </div>
        ` : `
          <div class="fscore-row">
            <div style="font-size:.74rem;color:var(--text2);min-width:130px">${c.label}</div>
            <div class="fscore-bar">
              <div class="fscore-bar-fill" style="width:${Math.round(c.score/c.max*100)}%;background:${barColor(c.score,c.max)}"></div>
            </div>
            <div style="font-size:.74rem;font-weight:700;min-width:36px;text-align:right;color:${barColor(c.score,c.max)}">${c.score}/${c.max}</div>
          </div>
          ${c.sub?c.sub.map(s=>`
            <div class="fscore-row" style="padding-left:16px">
              <div style="font-size:.72rem;color:#c9cede;font-weight:700;min-width:130px">↳ ${s.label}</div>
              <div class="fscore-bar" style="height:4px">
                <div class="fscore-bar-fill" style="width:${Math.round(s.score/s.max*100)}%;background:${barColor(s.score,s.max)}"></div>
              </div>
              <div style="font-size:.72rem;font-weight:700;min-width:40px;text-align:right;color:${barColor(s.score,s.max)}">${s.score}/${s.max}</div>
            </div>`).join(''):''}
        `).join('')}
      </div>
    </div>
    <!-- Detail labels -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:12px">
      ${components.map(c=>`<div style="font-size:.72rem;color:var(--text3);padding:5px 8px;background:var(--surface2);border-radius:7px">${c.detail}</div>`).join('')}
      <div style="font-size:.72rem;color:var(--text3);padding:5px 8px;background:var(--surface2);border-radius:7px">${trend.label}</div>
      ${consistencyBonus>0?`<div style="font-size:.72rem;color:var(--income);padding:5px 8px;background:var(--surface2);border-radius:7px">🎯 Bonus +${consistencyBonus} za ${trend.consistencyMonths} měs. bez zlomu</div>`:''}
    </div>
  </div>`;
}

function toggleNetworthAssets() {   // FIX-287
  _networthShowAssets = !_networthShowAssets;
  try { localStorage.setItem('ff_nw_assets', _networthShowAssets ? '1' : '0'); } catch(e){}
  renderNetWorth();
}
window.toggleNetworthAssets = toggleNetworthAssets;

function renderNetWorth() {
  const el = document.getElementById('networthCard'); if(!el) return;
  const D = getData();
  const nw = computeNetWorth(D);
  if(!nw.rows.length) { el.innerHTML = ''; return; }
  const typeIcons = {cash:'💵',account:'🏦',savings:'🐷',investment:'📈',card:'💳',other:'📦'};
  const hasAssets = (nw.assetRows||[]).length > 0;
  const assetsPart = (hasAssets && _networthShowAssets) ? (nw.totalAssets||0) : 0;
  const baseTotal = (nw.totalWithoutAssets||0) + assetsPart;
  const displayTotal = _networthShowDebt ? baseTotal : baseTotal + nw.totalDebt;
  const totalColor = displayTotal >= 0 ? 'var(--income)' : 'var(--expense)';
  const label = _networthShowDebt ? '💰 Čistý majetek (vč. dluhů)' : '💰 Hrubý majetek (bez dluhů)';
  el.innerHTML = `<div class="networth-card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="font-size:.75rem;color:var(--text3);font-weight:600;letter-spacing:.06em;text-transform:uppercase">${label}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${hasAssets?`<button onclick="toggleNetworthAssets()" style="background:none;border:1px solid var(--border);border-radius:8px;padding:3px 9px;font-size:.7rem;color:#a8aec8;cursor:pointer">${_networthShowAssets?'👁 Skrýt fin. aktiva':'👁 Zobrazit fin. aktiva'}</button>`:''}
        ${nw.totalDebt>0?`<button onclick="toggleNetworthDebt()" style="background:none;border:1px solid var(--border);border-radius:8px;padding:3px 9px;font-size:.7rem;color:#a8aec8;cursor:pointer">${_networthShowDebt?'👁 Skrýt dluhy':'👁 Zobrazit dluhy'}</button>`:''}
      </div>
    </div>
    <div class="networth-total" style="color:${totalColor}">${fmtB(displayTotal)}</div>
    <div style="display:flex;flex-direction:column;gap:0">
      ${nw.rows.map(r=>`<div class="networth-row">
        <div class="networth-dot" style="background:${r.color}"></div>
        <span style="flex:1;color:var(--text2)">${r.isVirtual?'🟡':(typeIcons[r.type]||'👛')} ${r.name}${r.currency&&r.currency!=='CZK'?` <span style="font-size:.7rem;color:var(--text3)">(${r.currency})</span>`:''}</span>
        <span style="font-weight:600;color:${r.balance>=0?'var(--text)':'var(--expense)'}">${r.currency&&r.currency!=='CZK'?fmtP(r.balanceCZK)+' Kč':fmtB(r.balance)}</span>
      </div>`).join('')}
      ${(hasAssets&&_networthShowAssets)?nw.assetRows.map(r=>`<div class="networth-row">
        <div class="networth-dot" style="background:${r.color}"></div>
        <span style="flex:1;color:var(--text2)">${r.icon||'💎'} ${r.name}</span>
        <span style="font-weight:600;color:var(--text)">${fmtB(r.balance)}</span>
      </div>`).join(''):''}
      ${(hasAssets&&!_networthShowAssets)?`<div class="networth-row">
        <div class="networth-dot" style="background:#c9cede"></div>
        <span style="flex:1;color:#a8aec8">💎 Fin. aktiva skryta (${nw.assetRows.length})</span>
        <span style="font-weight:600;color:#a8aec8">${fmtB(nw.totalAssets)}</span>
      </div>`:''}
      ${nw.totalDebt>0&&_networthShowDebt?`<div class="networth-row">
        <div class="networth-dot" style="background:var(--expense)"></div>
        <span style="flex:1;color:var(--text3)">💸 Celkový dluh</span>
        <span style="font-weight:600;color:var(--expense)">−${fmtB(nw.totalDebt)}</span>
      </div>`:''}
    </div>
    ${nw.totalDebt>0&&!_networthShowDebt?`<div style="font-size:.7rem;color:var(--text3);margin-top:6px;text-align:center">Dluhy skryty · celkový dluh: <span style="color:var(--expense)">${fmtB(nw.totalDebt)}</span></div>`:''}
  </div>`;
}

// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
//  S17.38 (Milan): PŘIPOMENUTÍ KONCE TRIALU
//  Trial bez karty se sám nepřeklopí na placený – uživatel se musí aktivně vrátit.
//  Proto v posledním týdnu upozorňujeme přímo na Dashboardu (banner v sidebaru je snadné
//  přehlédnout). Naléhavost roste, jak se blíží konec. Text mluví o tom, CO UŽIVATEL ZTRATÍ,
//  ne o tom, že má zaplatit – nabídka, ne výhrůžka.
// ══════════════════════════════════════════════════════
function renderTrialReminder() {
  const host = document.getElementById('trialReminderCard');
  if (!host) return;
  const st = _premiumStatus;
  if (!st || st.type !== 'trial' || st.daysLeft == null || st.daysLeft > 7) { host.innerHTML = ''; return; }
  // uživatel si smí připomínku na daný den odložit
  const key = 'ff_trialRemHide_' + new Date().toDateString();
  try { if (localStorage.getItem(key)) { host.innerHTML = ''; return; } } catch(e) {}

  const d = st.daysLeft;
  const last = d <= 2;
  const col = last ? 'var(--expense)' : d <= 4 ? 'var(--debt)' : 'var(--bank)';
  const bg  = last ? 'var(--expense-bg)' : d <= 4 ? 'var(--debt-bg)' : 'rgba(96,165,250,.1)';
  const head = d === 0 ? 'Trial dnes končí'
             : d === 1 ? 'Trial končí zítra'
             : `Trial končí za ${d} dní`;

  host.innerHTML = `
    <div class="card" style="margin-bottom:14px;background:${bg};border-color:${col}55">
      <div class="card-body" style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
        <div style="font-family:Syne,sans-serif;font-size:1.9rem;font-weight:800;color:${col};line-height:1;min-width:38px;text-align:center">${d}</div>
        <div style="flex:1;min-width:190px">
          <div style="font-family:Syne,sans-serif;font-size:.98rem;font-weight:800;color:#e8eaf2;margin-bottom:4px">${head}</div>
          <div style="font-size:.78rem;color:#c9cede;line-height:1.55">
            Pak se ti zamkne <strong>AI Rádce, analýza účtenek, predikce, pokročilé grafy</strong> a sdílení s partnerem.
            Tvoje data zůstanou, jen se k některým přehledům nedostaneš.
          </div>
          <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px">
            <button onclick="showPaywall()" style="padding:7px 15px;border-radius:9px;border:none;background:${col};color:#fff;font-weight:700;font-size:.8rem;cursor:pointer">Zachovat Premium</button>
            <button onclick="hideTrialReminder()" style="padding:7px 13px;border-radius:9px;border:1px solid var(--border);background:transparent;color:#a8aec8;font-size:.78rem;cursor:pointer">Připomenout zítra</button>
          </div>
        </div>
      </div>
    </div>`;
}
function hideTrialReminder() {
  try { localStorage.setItem('ff_trialRemHide_' + new Date().toDateString(), '1'); } catch(e) {}
  const h = document.getElementById('trialReminderCard'); if (h) h.innerHTML = '';
}

// ══════════════════════════════════════════════════════
//  S17.39 (FIX-222, Milan): PAYWALL neodpovídal stavu uživatele
//  Problémy: (1) tlačítko vždy spouštělo TRIAL, takže kdo chtěl rovnou zaplatit, neměl jak;
//  (2) u Free karty svítilo „Aktuální plán" i uživateli s aktivním trialem/Premiem.
//  Nově se obsah přizpůsobí: trial jen když ho ještě nevyčerpal, jinak rovnou platba.
// ══════════════════════════════════════════════════════
function updatePaywallCtas() {
  const st = _premiumStatus || {};
  const freeCta = document.getElementById('tierFreeCta');
  const cta     = document.getElementById('tierPremiumCta');
  const sub     = document.getElementById('tierPremiumSub');
  const buy     = document.getElementById('tierPremiumBuy');
  if (!cta) return;

  const isPaid  = st.type === 'premium' || st.type === 'pro';
  const isTrial = st.type === 'trial';
  const canTrial = !isPaid && !isTrial && !st.trialUsed;

  // Free karta – „Aktuální plán" jen když uživatel opravdu na Free je
  if (freeCta) {
    freeCta.textContent = (!isPaid && !isTrial) ? 'Aktuální plán' : 'Přejít na Free';
    freeCta.style.opacity = (!isPaid && !isTrial) ? '1' : '.6';
  }

  if (isPaid) {
    cta.textContent = 'Spravovat předplatné';
    cta.onclick = () => { if (typeof openStripeCustomerPortal === 'function') openStripeCustomerPortal(); };
    if (sub) sub.textContent = `✓ Aktivní${st.until ? ' do ' + new Date(st.until).toLocaleDateString('cs-CZ') : ''}`;
    if (buy) buy.style.display = 'none';
    return;
  }
  if (canTrial) {
    // S17.40 (Milan): trial je ZÁMĚRNĚ jediná nabídka pro nováčka – nikoho netlačíme platit
    // dřív, než si appku vyzkouší. Nabídka platby se objeví až po skončení trialu.
    cta.textContent = 'Vyzkoušet 30 dní zdarma';
    cta.onclick = () => startTrial();
    if (sub) sub.textContent = '✓ Bez karty · bez závazků';
    if (buy) buy.style.display = 'none';
  } else {
    // trial běží nebo je vyčerpaný → jediná smysluplná akce je platba
    cta.textContent = isTrial ? 'Pokračovat v Premium' : 'Získat Premium';
    cta.onclick = () => goPremium();
    //  S23 (Play režim): tlačítko „Odemknout" nahradí text bez odkazu.
    if (typeof isPlayApp === 'function' && isPlayApp()) {
      const box = cta.parentElement;
      if (box && !box.querySelector('.ff-play-info')) { cta.remove(); box.insertAdjacentHTML('beforeend', playInfoHTML(true)); }
    }
    if (sub) sub.textContent = isTrial
      ? `✓ Trial běží ještě ${st.daysLeft} dní – teď platit nemusíš`
      : '✓ Data ti zůstala · zrušíš kdykoli';
    if (buy) buy.style.display = 'none';
  }
}
