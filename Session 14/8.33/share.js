//  FinanceFlow · v8.33 · share.js · 2026-06-25
// ══════════════════════════════════════════════════════
//  SDÍLENÍ & REFERRAL SYSTÉM – FinanceFlow v6.37
// ══════════════════════════════════════════════════════
// Firebase struktura:
//   /referrals/{refCode}  → {uid, createdAt, clicks, conversions}
//   /referral_clicks/{id} → {refCode, ip(hash), date, converted}
//   /users/{uid}/referral → {code, clicks, conversions, earned}

const SHARE_BASE_URL = 'https://financeflow.cz/app';
const SHARE_REWARDS = {
  click:      0,    // body za klik (0 = žádné)
  signup:    50,    // body za registraci přes odkaz
  month1:   100,    // body za první měsíc aktivního užívání
  premium:  300,    // body za upgrade na Premium
};

// Kolik bodů = 1 měsíc Premium zdarma (Session 11)
// ⚙️ ZMĚNA POMĚRU: stačí upravit toto jediné číslo.
const POINTS_PER_PREMIUM_MONTH = 500;

let _myRefCode = null;
let _refStats = { clicks: 0, conversions: 0, earned: 0, referrals: [] };

// ══════════════════════════════════════════════════════
//  INICIALIZACE – načtení/vytvoření referral kódu
// ══════════════════════════════════════════════════════
async function initReferral() {
  if (!window._currentUser || _isLocalMode) return;
  const uid = window._currentUser.uid;
  await trackDailyLogin();

  try {
    // Načti existující referral data
    const snap = await _get(_ref(_db, `users/${uid}/referral`));
    if (snap.exists()) {
      const data = snap.val();
      _myRefCode = data.code;
      _refStats = {
        clicks:      data.clicks      || 0,
        conversions: data.conversions || 0,
        earned:      data.earned      || 0,
        referrals:   data.referrals   || [],
      };
    } else {
      // První spuštění – vygeneruj unikátní kód
      _myRefCode = await generateRefCode(uid);
      await _set(_ref(_db, `users/${uid}/referral`), {
        code:        _myRefCode,
        clicks:      0,
        conversions: 0,
        earned:      0,
        createdAt:   Date.now(),
      });
      // Zaregistruj kód v globálním indexu
      await _set(_ref(_db, `referrals/${_myRefCode}`), {
        uid,
        createdAt: Date.now(),
        clicks:    0,
        conversions: 0,
      });
    }
  } catch(e) { console.log('initReferral error:', e); }

  // S14: nárokuj body z konverzí (referrals/{myCode}/conversions) do vlastního earned.
  // Referovaní zapisují konverze do referrals/* (mají právo), ale do cizího users/{uid}
  // zapisovat nesmí – proto si je majitel kódu přepočítá a uloží sám.
  if (_myRefCode && window._db) {
    try {
      const convSnap = await _get(_ref(_db, `referrals/${_myRefCode}/conversions`));
      if (convSnap.exists()) {
        const conv = convSnap.val() || {};
        const cv = Object.values(conv);
        const totalEarned = cv.reduce((a,c)=>a+((c&&c.confirmed!==false&&c.points)||0),0);
        const convCount = cv.filter(c=>c&&c.confirmed!==false).length;
        if (totalEarned !== _refStats.earned || convCount !== _refStats.conversions) {
          _refStats.earned = totalEarned;
          _refStats.conversions = convCount;
          await _update(_ref(_db, `users/${uid}/referral`), { earned: totalEarned, conversions: convCount });
        }
      }
    } catch(e) { console.warn('claim conversions:', e); }
  }

  // S14: nacti, kym jsem byl pozvan (pro profil – zadani 1x) a po prodleve potvrd konverzi dle aktivity
  try {
    const rbSnap = await _get(_ref(_db, `users/${uid}/referredBy`));
    window._myReferredBy = rbSnap.exists() ? rbSnap.val() : null;
  } catch(e) { window._myReferredBy = null; }
  setTimeout(() => { if (typeof confirmReferralIfEligible === 'function') confirmReferralIfEligible(); }, 3000);

  // Zkontroluj příchozí referral kód z URL
  checkIncomingRef();
  // Zkontroluj příchozí partner odkaz (?partnerOf=UID)
  if(typeof checkIncomingPartner === 'function') checkIncomingPartner();
}

async function generateRefCode(uid) {
  // Kód = prvních 6 znaků uid + 4 náhodné znaky (čitelné, bez 0/O/I/l)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const base = uid.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  const code = (base + suffix).slice(0, 8);

  // Ověř unikátnost
  const check = await _get(_ref(_db, `referrals/${code}`));
  if (check.exists()) {
    // Konflikt – přidej extra znak
    return code.slice(0, 7) + chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function checkIncomingRef() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (!ref) return;

  // Ulož do Firebase (affiliate tabulka – existující logika)
  window._pendingAffiliateRef = ref;

  // Zaloguj klik
  if (window._db && ref !== _myRefCode) {
    _update(_ref(_db), {
      [`referrals/${ref}/clicks`]: (_refStats.clicks + 1),
      [`referral_clicks/${Date.now()}_${Math.random().toString(36).slice(2,6)}`]: {
        refCode: ref,
        date: new Date().toISOString().slice(0,10),
        converted: false,
      }
    }).catch(() => {});
  }

  // SJEDNOCENÍ (S11): jeden odkaz dělá i partnerské párování.
  // Resolve owner UID z referrals/{ref}/uid → spáruj jako partnery + bonus.
  if (window._db && window._currentUser && ref !== _myRefCode) {
    try {
      const ownerSnap = await _get(_ref(_db, `referrals/${ref}/uid`));
      const ownerUid = ownerSnap.exists() ? ownerSnap.val() : null;
      if (ownerUid && ownerUid !== window._currentUser.uid) {
        // S14: zapiš konverzi do referrals/{ref}/conversions/{myUid}. Tohle JDE (referrals/* smí
        // zapisovat každý přihlášený), zatímco zápis bodů přímo do users/{owner}/referral NE.
        // Majitel kódu si body nárokuje do svého earned při svém přihlášení (viz initReferral).
        const _myUid = window._currentUser.uid;
        try {
          const convRef = _ref(_db, `referrals/${ref}/conversions/${_myUid}`);
          const existing = await _get(convRef);
          if (!existing.exists()) {
            await _set(convRef, { points: SHARE_REWARDS.signup, type: 'signup', confirmed: false, addedAt: new Date().toISOString() });
          }
          // S14: uloz referredBy (1x) – at to mame i v profilu a jde potvrdit aktivitou
          try {
            const _rbSnap = await _get(_ref(_db, `users/${_myUid}/referredBy`));
            if (!_rbSnap.exists()) await _set(_ref(_db, `users/${_myUid}/referredBy`), { code: ref, via: 'link', enteredAt: new Date().toISOString() });
          } catch(_rbe) {}
        } catch(ce) { console.warn('conversion write:', ce); }
        await pairPartners(ownerUid, window._currentUser.uid);
      }
    } catch(e) { console.warn('ref→partner pairing:', e); }
  }
}

// Spáruj dva uživatele jako partnery + udělí bonus majiteli odkazu (dedup)
async function pairPartners(ownerUid, myUid) {
  const dedupeKey = `partner_bonus/${ownerUid}_${myUid}`;
  try {
    const snap = await _get(_ref(_db, dedupeKey));
    if (snap.exists()) return; // bonus už udělen
    await _update(_ref(_db), {
      [`users/${ownerUid}/partners/${myUid}`]: { addedAt: new Date().toISOString(), via: 'refLink' },
      [`users/${myUid}/partners/${ownerUid}`]: { addedAt: new Date().toISOString(), via: 'refLink' },
    });
    const earnedRef = _ref(_db, `users/${ownerUid}/referral/earned`);
    const earnedSnap = await _get(earnedRef);
    const current = earnedSnap.exists() ? (earnedSnap.val() || 0) : 0;
    await _set(earnedRef, current + PARTNER_BONUS_PTS);
    await _set(_ref(_db, dedupeKey), { partnerUid: myUid, addedAt: new Date().toISOString(), points: PARTNER_BONUS_PTS });
    window.history.replaceState({}, '', window.location.pathname);
    if (typeof showToast === 'function') showToast('✅ Byl/a jsi přidán/a jako partner!');
    if (typeof renderPage === 'function') setTimeout(renderPage, 500);
  } catch(e) { console.warn('pairPartners:', e); }
}
window.pairPartners = pairPartners;

// S14: ADMIN – ruční připsání referral bodů aktuálnímu účtu (ověření zobrazení + zpětné připsání).
// Zapíše „manuální" konverzi do vlastního referrals/{kód}/conversions a hned ji nárokuje do earned.
async function adminCreditReferralSelf(points){
  if(!window._db || !window._currentUser){ alert('Nejsi přihlášen.'); return; }
  if(!_myRefCode){ alert('Tvůj referral kód se ještě nenačetl – zkus to za pár sekund znovu.'); return; }
  let pts = points;
  if(pts==null){ const inp = prompt('Kolik referral bodů připsat? (test / zpětně za registraci)', '50'); if(inp==null) return; pts = parseInt(inp)||0; }
  if(pts<=0) return;
  const myUid = window._currentUser.uid;
  try {
    const key = 'manual_' + Date.now();
    await _set(_ref(_db, `referrals/${_myRefCode}/conversions/${key}`), { points: pts, type:'manual', confirmed: true, addedAt: new Date().toISOString() });
    const convSnap = await _get(_ref(_db, `referrals/${_myRefCode}/conversions`));
    const conv = convSnap.exists() ? (convSnap.val()||{}) : {};
    const cv = Object.values(conv);
    const totalEarned = cv.reduce((a,c)=>a+((c&&c.confirmed!==false&&c.points)||0),0);
    const cCount = cv.filter(c=>c&&c.confirmed!==false).length;
    await _update(_ref(_db, `users/${myUid}/referral`), { earned: totalEarned, conversions: cCount });
    _refStats.earned = totalEarned; _refStats.conversions = cCount;
    if(typeof showToast==='function') showToast('✅ Připsáno '+pts+' bodů (celkem '+totalEarned+')');
    if(typeof renderShareSection==='function') renderShareSection();
    if(typeof renderPage==='function') renderPage();
  } catch(e){ alert('Chyba při připisování: '+((e&&e.message)||e)); }
}
window.adminCreditReferralSelf = adminCreditReferralSelf;

// S14: minimalni aktivita (pocet transakci) referovaneho uctu, nez se body POTVRDI – brani
// zneuziti „smazu ucet, znovu se zaregistruji, kolegovi naskaci body". Realne ucty prah snadno splni.
const REFERRAL_MIN_TX = 5;

// Potvrdi konverzi (confirmed:true) jakmile ma referovany ucet dost aktivity. Vola referovany
// uzivatel ze sve session (smi zapisovat do referrals/*). Bez potvrzeni se body nezapocitaji.
async function confirmReferralIfEligible(){
  if(!window._db || !window._currentUser || !window._myReferredBy) return;
  const code = window._myReferredBy.code; if(!code) return;
  const myUid = window._currentUser.uid;
  try {
    const convRef = _ref(_db, `referrals/${code}/conversions/${myUid}`);
    const snap = await _get(convRef);
    if(!snap.exists()) return;
    const conv = snap.val();
    if(conv && conv.confirmed) return;
    if(referralEligible()){
      await _update(convRef, { confirmed: true, confirmedAt: new Date().toISOString() });
    }
  } catch(e){ console.warn('confirmReferral:', e); }
}
window.confirmReferralIfEligible = confirmReferralIfEligible;

// S14: kriteria potvrzeni referralu – brani zneuziti delete+reregister. Potvrdi se kdyz:
// ucet pouzivan >=14 dni, NEBO >=7 dni s prihlasenim (max 1/den) a >=5 transakci.
const REFERRAL_MIN_DAYS = 14;       // stari uctu (dny)
const REFERRAL_MIN_LOGINDAYS = 7;   // pocet dni s prihlasenim
function referralEligible(){
  const a = window._activity || {};
  const firstSeen = a.firstSeen ? new Date(a.firstSeen).getTime() : Date.now();
  const daysOld = (Date.now() - firstSeen) / 86400000;
  const loginDays = a.loginDays || 0;
  const txCount = (window.S && window.S.transactions) ? window.S.transactions.filter(t=>!t.splitParent).length : 0;
  return (daysOld >= REFERRAL_MIN_DAYS) || (loginDays >= REFERRAL_MIN_LOGINDAYS && txCount >= REFERRAL_MIN_TX);
}
window.referralEligible = referralEligible;

// S14: lehky tracker aktivity – pocita dny s prihlasenim (max 1/den) a stari uctu (firstSeen).
// Zapisuje do users/{uid}/activity (vlastni subtree – povoleno). Pouzito pro potvrzeni referralu.
async function trackDailyLogin(){
  if(!window._db || !window._currentUser) return;
  const uid = window._currentUser.uid;
  const today = new Date().toISOString().slice(0,10);
  try {
    const snap = await _get(_ref(_db, `users/${uid}/activity`));
    const a = snap.exists() ? (snap.val()||{}) : {};
    const firstSeen = a.firstSeen || today;
    let loginDays = a.loginDays || 0;
    let lastLoginDay = a.lastLoginDay || '';
    if(lastLoginDay !== today){ loginDays += 1; lastLoginDay = today; }
    await _update(_ref(_db, `users/${uid}/activity`), { firstSeen, lastLoginDay, loginDays });
    window._activity = { firstSeen, lastLoginDay, loginDays };
  } catch(e){ console.warn('trackDailyLogin:', e); }
}
window.trackDailyLogin = trackDailyLogin;

// Profil: zadani referral kodu (1x za ucet, nevratne). Body majiteli kodu az po REFERRAL_MIN_TX
// transakcich (confirmed), ne hned – kvuli zneuziti delete+reregister.
async function submitReferralCode(rawCode){
  if(!window._db || !window._currentUser){ alert('Nejsi přihlášen.'); return; }
  const code = (rawCode||'').trim().toUpperCase();
  const myUid = window._currentUser.uid;
  if(!code){ alert('Zadej referral kód.'); return; }
  if(code === _myRefCode){ alert('Nemůžeš zadat vlastní referral kód.'); return; }
  try {
    const rbSnap = await _get(_ref(_db, `users/${myUid}/referredBy`));
    if(rbSnap.exists()){ alert('Referral kód už máš zadaný – lze zadat jen jednou.'); return; }
    const ownerSnap = await _get(_ref(_db, `referrals/${code}/uid`));
    if(!ownerSnap.exists()){ alert('Tento referral kód neexistuje. Zkontroluj překlepy.'); return; }
    if(ownerSnap.val() === myUid){ alert('Nemůžeš zadat vlastní referral kód.'); return; }
    await _set(_ref(_db, `users/${myUid}/referredBy`), { code, via:'profile', enteredAt: new Date().toISOString() });
    window._myReferredBy = { code, via:'profile' };
    const convRef = _ref(_db, `referrals/${code}/conversions/${myUid}`);
    const ex = await _get(convRef);
    if(!ex.exists()){
      await _set(convRef, { points: SHARE_REWARDS.signup, type:'code', confirmed:false, addedAt: new Date().toISOString() });
    }
    if(typeof confirmReferralIfEligible==='function') await confirmReferralIfEligible();
    if(typeof showToast==='function') showToast('✅ Referral kód uložen. Body se pozvateli připíšou po 2 týdnech používání (nebo 7 dnech aktivity + 5 transakcích).');
    if(typeof renderReferralCodeRow==='function') renderReferralCodeRow();
  } catch(e){ alert('Chyba: '+((e&&e.message)||e)); }
}
window.submitReferralCode = submitReferralCode;

// Profil – radek pro zadani referral kodu (input nebo „uz zadano")
function renderReferralCodeRow(){
  const wrap = document.getElementById('profileRefRow'); if(!wrap) return;
  const rb = window._myReferredBy;
  if(rb && rb.code){
    wrap.innerHTML = '<label>Referral kód</label><div style="font-size:.82rem;color:var(--text);padding:6px 0">Pozván/a kódem <strong style="color:var(--premium)">' + rb.code + '</strong> &#10003;</div>';
  } else {
    wrap.innerHTML = '<label>Referral kód <span style="color:var(--text3);font-weight:400;font-size:.74rem">(od toho, kdo tě pozval &middot; jen 1&times;)</span></label>'
      + '<div style="display:flex;gap:8px"><input class="fi" id="profileRefInput" placeholder="např. ABCD1234" style="flex:1;text-transform:uppercase"><button class="btn btn-accent btn-sm" onclick="submitReferralCode(document.getElementById(\'profileRefInput\').value)">Uložit</button></div>'
      + '<div style="font-size:.7rem;color:#a8aec8;margin-top:5px;line-height:1.4">Body se pozvateli připíšou až po 2 týdnech používání (nebo 7 dnech aktivity + 5 transakcích) – ochrana proti zneužití.</div>';
  }
}
window.renderReferralCodeRow = renderReferralCodeRow;

// ══════════════════════════════════════════════════════
//  PARTNER LINK – sdílení s bonusovými body
// ══════════════════════════════════════════════════════
const PARTNER_BONUS_PTS = 50; // body za přidaného partnera

function getPartnerUrl() {
  const uid = window._currentUser?.uid;
  return uid ? `https://financeflow.cz/app?partnerOf=${uid}` : '';
}

function initPartnerLinkBar() {
  const el = document.getElementById('partnerLinkText'); if(!el) return;
  const url = getPartnerUrl();
  el.textContent = url || 'Přihlaste se pro zobrazení odkazu';
}

async function copyPartnerLink() {
  const url = getPartnerUrl(); if(!url) return;
  try {
    await navigator.clipboard.writeText(url);
    if(typeof showToast === 'function') showToast('📋 Partner odkaz zkopírován!');
  } catch(e) {}
}
window.copyPartnerLink = copyPartnerLink;

// Voláno po přihlášení – pokud URL obsahuje ?partnerOf=UID
async function checkIncomingPartner() {
  const params = new URLSearchParams(window.location.search);
  const partnerOfUid = params.get('partnerOf');
  if(!partnerOfUid || !window._currentUser || !window._db) return;
  if(partnerOfUid === window._currentUser.uid) return; // nesmí přidat sám sebe

  const myUid = window._currentUser.uid;
  const dedupeKey = `partner_bonus/${partnerOfUid}_${myUid}`;
  try {
    // Dedup – pokud již byl bonus udělen, skip
    const snap = await _get(_ref(_db, dedupeKey));
    if(snap.exists()) return;

    // Bidirektionální přidání jako partnerů
    await _update(_ref(_db), {
      [`users/${partnerOfUid}/partners/${myUid}`]: { addedAt: new Date().toISOString(), via: 'partnerLink' },
      [`users/${myUid}/partners/${partnerOfUid}`]: { addedAt: new Date().toISOString(), via: 'partnerLink' },
    });

    // Credit bonus bodů majiteli odkazu
    const earnedRef = _ref(_db, `users/${partnerOfUid}/referral/earned`);
    const earnedSnap = await _get(earnedRef);
    const current = earnedSnap.exists() ? (earnedSnap.val() || 0) : 0;
    await _set(earnedRef, current + PARTNER_BONUS_PTS);

    // Dedup záznam
    await _set(_ref(_db, dedupeKey), { partnerUid: myUid, addedAt: new Date().toISOString(), points: PARTNER_BONUS_PTS });

    // Vyčisti URL parametr
    window.history.replaceState({}, '', window.location.pathname);
    if(typeof showToast === 'function') showToast('✅ Byl/a jsi přidán/a jako partner!');
    if(typeof renderPage === 'function') setTimeout(renderPage, 500);
  } catch(e) { console.warn('checkIncomingPartner:', e); }
}
window.checkIncomingPartner = checkIncomingPartner;
function getShareUrl() {
  const base = SHARE_BASE_URL;
  const code = _myRefCode;
  return code ? `${base}?ref=${code}` : base;
}

// Inicializuj viditelný share link bar (vždy zobrazený, i bez načtení referral)
async function initShareLinkBar() {
  const el = document.getElementById('shareLinkText'); if(!el) return;
  if(!_myRefCode) await initReferral().catch(()=>{});
  const url = getShareUrl();
  el.textContent = url;
}

// Okamžité kopírování odkazu – pro tlačítko v top baru (vždy viditelné)
async function copyShareLinkDirect() {
  if(!_myRefCode) await initReferral().catch(()=>{});
  const url = getShareUrl();
  // Aktualizuj zobrazený text
  const el = document.getElementById('shareLinkText');
  if(el) el.textContent = url;
  try {
    await navigator.clipboard.writeText(url);
    const btn = document.querySelector('[onclick="copyShareLinkDirect()"]');
    if(btn) { const orig=btn.textContent; btn.textContent='✅ Zkopírováno!'; btn.style.color='var(--income)'; setTimeout(()=>{btn.textContent=orig;btn.style.color='';},2000); }
  } catch(e) {
    // Fallback pro starší prohlížeče
    const ta = document.createElement('textarea');
    ta.value = url; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

// Poznámky k vydání z VERZE_LOG (admin.js) – zobrazí v O aplikaci
function renderReleaseNotes() {
  const el = document.getElementById('releaseNotesBody'); if(!el) return;
  if(typeof VERZE_LOG === 'undefined' || !VERZE_LOG?.length) {
    el.innerHTML = '<div style="font-size:.78rem;color:var(--text3)">Poznámky k vydání nejsou dostupné.</div>';
    return;
  }
  el.innerHTML = VERZE_LOG.slice(0, 8).map((v, i) => `
    <div style="margin-bottom:${i<VERZE_LOG.length-1?'12px':'0'}">
      <div style="font-size:.8rem;font-weight:700;color:${i===0?'var(--income)':'var(--text2)'}">
        ${v.verze} ${i===0?'<span style="font-size:.7rem;color:var(--text3);font-weight:400">Aktuální</span>':''}
      </div>
      <div style="font-size:.74rem;color:var(--text3);margin-top:2px">${v.datum}</div>
      <ul style="margin:4px 0 0 14px;padding:0">
        ${(v.zmeny||[]).slice(0,3).map(z=>`<li style="font-size:.74rem;color:var(--text2);margin-bottom:2px">${z.replace(/^[✅✨🐛🗑️📋]+\s*/,'')}</li>`).join('')}
        ${v.zmeny?.length>3?`<li style="font-size:.7rem;color:var(--text3)">... a dalších ${v.zmeny.length-3} změn</li>`:''}
      </ul>
    </div>`).join('');
}

function getShareMessage(platform) {
  const url = getShareUrl();
  const name = window._userProfile?.displayName?.split(' ')[0] || 'Já';

  const messages = {
    whatsapp: `Ahoj! Používám FinanceFlow na sledování rodinných financí a je to super 💚\n\nMá to:\n✅ Přehled příjmů & výdajů\n📸 Skenování účtenek\n🤖 AI finanční poradce\n👨‍👩‍👧 Sdílení s partnerem\n\nZkus to zdarma: ${url}`,
    sms:      `Tip na appku: FinanceFlow – rodinné finance pod kontrolou. Zkus zdarma: ${url}`,
    signal:   `Ahoj! Tip na skvělou appku na rodinné finance 💚 FinanceFlow – příjmy, výdaje, AI poradce, sdílení s partnerem. Zkus zdarma: ${url}`,
    telegram: `Ahoj! Doporučuji FinanceFlow – chytrá správa rodinných financí 💚\n✅ Příjmy & výdaje s grafy\n📸 Skenování účtenek\n🤖 AI poradce\n👨‍👩‍👧 Sdílení s partnerem\n\nZkus zdarma: ${url}`,
    email_subject: 'Tip: FinanceFlow – správa rodinných financí',
    email_body: `Ahoj,\n\nchci ti doporučit aplikaci FinanceFlow, kterou používám pro správu rodinných financí.\n\nCo umí:\n• Přehled příjmů a výdajů s grafy\n• Skenování účtenek pomocí AI\n• AI finanční poradce\n• Sdílení s partnerem\n• Predikce výdajů na další měsíce\n• A mnoho dalšího...\n\nVyzkoušej zdarma (30 dní Premium): ${url}\n\nPozdravuje ${name}`,
    copy:     url,
    native:   {
      title: 'FinanceFlow – rodinné finance',
      text:  'Správa rodinných financí – příjmy, výdaje, AI poradce, sdílení s partnerem',
      url,
    },
  };
  return messages[platform] || url;
}

// ══════════════════════════════════════════════════════
//  AKCE – sdílení přes různé kanály
// ══════════════════════════════════════════════════════
async function shareVia(platform) {
  const url = getShareUrl();

  switch(platform) {
    case 'native':
      if (navigator.share) {
        try {
          await navigator.share(getShareMessage('native'));
          trackShareEvent('native');
          showShareToast('✅ Sdíleno!');
          return;
        } catch(e) { if (e.name === 'AbortError') return; }
      }
      // Fallback na kopírování
      copyShareLink();
      break;

    case 'whatsapp':
      trackShareEvent('whatsapp');
      window.open('https://wa.me/?text=' + encodeURIComponent(getShareMessage('whatsapp')), '_blank');
      break;

    case 'email':
      trackShareEvent('email');
      window.open(
        `mailto:?subject=${encodeURIComponent(getShareMessage('email_subject'))}&body=${encodeURIComponent(getShareMessage('email_body'))}`,
        '_blank'
      );
      break;

    case 'sms':
      trackShareEvent('sms');
      window.open('sms:?body=' + encodeURIComponent(getShareMessage('sms')), '_blank');
      break;

    case 'signal':
      trackShareEvent('signal');
      // Signal deep link – otevře Signal s předvyplněnou zprávou
      // Na mobilu funguje přes intent, na desktopu přes signal.me
      try {
        window.open('https://signal.me/#p/' + encodeURIComponent(getShareMessage('signal')), '_blank');
      } catch(e) {}
      // Fallback: kopíruj zprávu do schránky
      navigator.clipboard?.writeText(getShareMessage('signal')).catch(()=>{});
      showShareToast('📋 Zpráva zkopírována – otevři Signal a vlož');
      break;

    case 'telegram':
      trackShareEvent('telegram');
      window.open('https://t.me/share/url?url=' + encodeURIComponent(getShareUrl()) + '&text=' + encodeURIComponent(getShareMessage('telegram')), '_blank');
      break;
      window.open(`fb-messenger://share?link=${encodeURIComponent(url)}`, '_blank');
      // Fallback pro desktop
      setTimeout(() => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      }, 1500);
      break;

    case 'copy':
      copyShareLink();
      break;

    case 'qr':
      openQRModal();
      break;
  }
}

function copyShareLink() {
  const url = getShareUrl();
  navigator.clipboard.writeText(url).then(() => {
    trackShareEvent('copy');
    showShareToast('📋 Odkaz zkopírován!');
  }).catch(() => {
    // Fallback
    const inp = document.createElement('input');
    inp.value = url;
    document.body.appendChild(inp);
    inp.select();
    document.execCommand('copy');
    document.body.removeChild(inp);
    showShareToast('📋 Odkaz zkopírován!');
  });
}

function trackShareEvent(platform) {
  if (!window._currentUser || _isLocalMode) return;
  try {
    const uid = window._currentUser.uid;
    _update(_ref(_db), {
      [`users/${uid}/referral/shares/${platform}`]: Date.now(),
      [`users/${uid}/referral/lastShared`]: Date.now(),
    });
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
//  QR KÓD (generování bez externích závislostí)
// ══════════════════════════════════════════════════════
function openQRModal() {
  const modal = document.getElementById('modalShareQR');
  if (!modal) return;

  const url = getShareUrl();
  const canvas = document.getElementById('shareQRCanvas');

  // Generuj QR kód pomocí jednoduché knihovny přes CDN
  if (canvas) {
    canvas.width = 200; canvas.height = 200;
    drawSimpleQR(canvas, url);
  }

  document.getElementById('shareQRUrl').textContent = url;
  modal.classList.add('open');
}

function drawSimpleQR(canvas, text) {
  // Zjednodušený QR – pouze vizuální placeholder s URL
  // Pro produkci: použít qrcode.js knihovnu
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Bílé pozadí
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Načti qrcode.js z CDN dynamicky
  if (window.QRCode) {
    canvas.style.display = 'none';
    const div = document.getElementById('shareQRDiv');
    if (div) {
      div.innerHTML = '';
      new window.QRCode(div, {
        text,
        width: 180, height: 180,
        colorDark: '#0f1117',
        colorLight: '#ffffff',
      });
    }
    return;
  }

  // Fallback vizuál
  ctx.fillStyle = '#0f1117';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';

  // Finder patterns (rohy)
  [[10,10],[W-42,10],[10,H-42]].forEach(([x,y]) => {
    ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x+4, y+4, 24, 24);
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(x+8, y+8, 16, 16);
  });

  // Data placeholder (random dots)
  const seed = text.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  let s = seed;
  for (let i = 0; i < 200; i++) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const x = 48 + (Math.abs(s) % (W - 96));
    const y2 = 48 + (Math.abs(s * 2) % (H - 96));
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(x, y2, 4, 4);
  }

  ctx.fillStyle = '#333';
  ctx.font = '10px sans-serif';
  ctx.fillText('QR · ' + text.slice(0, 30) + (text.length > 30 ? '…' : ''), W/2, H - 8);

  // Async load real QR library
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
  script.onload = () => {
    canvas.style.display = 'none';
    const div = document.getElementById('shareQRDiv');
    if (div) {
      div.innerHTML = '';
      new window.QRCode(div, {
        text, width: 180, height: 180,
        colorDark: '#0f1117', colorLight: '#ffffff',
      });
    }
  };
  document.head.appendChild(script);
}

// ══════════════════════════════════════════════════════
//  STATS – načtení statistik referralu
// ══════════════════════════════════════════════════════
async function loadRefStats() {
  if (!window._currentUser || !_myRefCode) return;
  try {
    const snap = await _get(_ref(_db, `users/${window._currentUser.uid}/referral`));
    if (snap.exists()) {
      const d = snap.val();
      _refStats = {
        clicks:      d.clicks      || 0,
        conversions: d.conversions || 0,
        earned:      d.earned      || 0,
        referrals:   d.referrals   || [],
      };
    }
    // Načti také globální statistiky pro tento kód
    const gSnap = await _get(_ref(_db, `referrals/${_myRefCode}`));
    if (gSnap.exists()) {
      const g = gSnap.val();
      _refStats.clicks = g.clicks || _refStats.clicks;
      // S14: conversions je nyni ledger (objekt referrals/{code}/conversions/{uid}).
      // Drive to byl skalar (pocet) – odtud „[object Object]". Spocitej POTVRZENE.
      if (g.conversions && typeof g.conversions === 'object') {
        const _cv = Object.values(g.conversions);
        _refStats.conversions = _cv.filter(c => c && c.confirmed !== false).length;
        _refStats.earned = _cv.reduce((a,c) => a + ((c && c.confirmed !== false && c.points) || 0), 0);
      } else {
        _refStats.conversions = g.conversions || _refStats.conversions;
      }
    }
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
//  RENDER – stránka sdílení (vložena do oAplikaci)
// ══════════════════════════════════════════════════════
async function renderShareSection() {
  const el = document.getElementById('shareSection');
  if (!el) return;

  if (_isLocalMode || !window._currentUser) {
    el.innerHTML = `<div class="insight-item warn" style="margin-bottom:10px">
      <div class="insight-icon">⚠️</div>
      <div class="insight-text">Přihlaste se přes Google pro získání vlastního referral odkazu.</div>
    </div>`;
    return;
  }

  if (!_myRefCode) await initReferral();
  await loadRefStats();

  const url = getShareUrl();

  // Body → Premium (Session 11)
  const earned       = _refStats.earned || 0;
  const monthsEarned = Math.floor(earned / POINTS_PER_PREMIUM_MONTH);  // nárok na N měsíců
  const remainder    = earned % POINTS_PER_PREMIUM_MONTH;              // body navíc nad celé měsíce
  const toNext       = POINTS_PER_PREMIUM_MONTH - remainder;          // kolik chybí do dalšího měsíce
  const progressPct  = Math.round(remainder / POINTS_PER_PREMIUM_MONTH * 100);
  const canRedeem    = monthsEarned >= 1;
  const mWord = n => (n === 1 ? 'měsíc' : (n >= 2 && n <= 4 ? 'měsíce' : 'měsíců'));

  // Styl pro responzivní kanály – vložit jen jednou
  if (!document.getElementById('ffShareStyle')) {
    const st = document.createElement('style');
    st.id = 'ffShareStyle';
    st.textContent = `
      .ff-share-channels{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
      .ff-share-ch{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:12px 6px;border-radius:12px}
      .ff-share-ch .ff-ch-ico{font-size:1.6rem;line-height:1}
      .ff-share-ch .ff-ch-lbl{font-size:.72rem;font-weight:600}
      /* Desktop: kompaktní řada, skrýt SMS a QR (dávají smysl jen na mobilu) */
      @media(min-width:641px){
        .ff-share-channels{grid-template-columns:repeat(5,1fr);gap:6px}
        .ff-share-ch{padding:9px 4px;border-radius:10px}
        .ff-share-ch .ff-ch-ico{font-size:1.25rem}
        .ff-share-ch .ff-ch-lbl{font-size:.68rem}
        .ff-share-mobileonly{display:none!important}
      }`;
    document.head.appendChild(st);
  }

  el.innerHTML = `
    <!-- Referral stats (počítadlo – přes statGrid helper, Session 11) -->
    <div style="margin-bottom:14px">${statGrid([
      { value: _refStats.clicks,      label: 'Kliknutí',  color: 'var(--income)' },
      { value: _refStats.conversions, label: 'Registrací', color: 'var(--bank)' },
      { value: earned,                label: 'Bodů',       color: 'var(--premium)' },
    ], 3)}</div>

    <!-- Kód + odměna (odkaz a Kopírovat jsou už v horní liště – neduplikujeme, S11) -->
    <div style="background:var(--surface2);border-radius:10px;padding:10px 14px;border:1px solid var(--border);margin-bottom:14px">
      <div style="font-size:.78rem;color:#c2c7da">Tvůj kód: <strong style="color:var(--text);font-family:monospace;font-size:.86rem">${_myRefCode}</strong></div>
      <div style="font-size:.72rem;color:#a8aec8;margin-top:3px">Za každou registraci přes tvůj odkaz získáš ${SHARE_REWARDS.signup} bodů.</div>
    </div>

    <!-- Přímé kanály (responzivní – velké na mobilu, kompaktní na PC; SMS a QR jen mobil) -->
    <div style="font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#a8aec8;margin-bottom:8px">Vybrat kanál přímo</div>
    <div class="ff-share-channels" style="margin-bottom:18px">
      <button class="btn ff-share-ch" onclick="shareVia('whatsapp')"><span class="ff-ch-ico">💬</span><span class="ff-ch-lbl">WhatsApp</span></button>
      <button class="btn ff-share-ch" onclick="shareVia('signal')"><span class="ff-ch-ico">🔵</span><span class="ff-ch-lbl">Signal</span></button>
      <button class="btn ff-share-ch" onclick="shareVia('telegram')"><span class="ff-ch-ico">✈️</span><span class="ff-ch-lbl">Telegram</span></button>
      <button class="btn ff-share-ch" onclick="shareVia('messenger')"><span class="ff-ch-ico">💙</span><span class="ff-ch-lbl">Messenger</span></button>
      <button class="btn ff-share-ch" onclick="shareVia('email')"><span class="ff-ch-ico">📧</span><span class="ff-ch-lbl">Email</span></button>
      <button class="btn ff-share-ch ff-share-mobileonly" onclick="shareVia('sms')"><span class="ff-ch-ico">💬</span><span class="ff-ch-lbl">SMS</span></button>
      <button class="btn ff-share-ch ff-share-mobileonly" onclick="shareVia('qr')"><span class="ff-ch-ico">📱</span><span class="ff-ch-lbl">QR kód</span></button>
    </div>

    <!-- Body → Premium (Session 11) -->
    <div style="background:linear-gradient(135deg,var(--premium-bg,rgba(168,85,247,.08)) 0%,rgba(168,85,247,.03) 100%);border:1px solid var(--premium-border,rgba(168,85,247,.28));border-radius:12px;padding:14px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:.86rem;font-weight:700;color:var(--premium)">💎 Body → Premium zdarma</span>
        <span style="font-size:.74rem;color:#a8aec8"><strong style="color:var(--premium)">${POINTS_PER_PREMIUM_MONTH} bodů</strong> = 1 měsíc</span>
      </div>

      <!-- Celkový stav bodů -->
      <div style="font-size:.84rem;color:var(--text);margin-bottom:10px">
        Máš <strong style="color:var(--premium);font-size:1.05rem">${earned} bodů</strong>${canRedeem ? ` = nárok na <strong style="color:var(--premium)">${monthsEarned}&nbsp;${mWord(monthsEarned)}</strong> Premium zdarma 🎉` : ''}
      </div>

      ${canRedeem ? `
        <button class="btn btn-accent" onclick="redeemPointsForPremium()" style="width:100%;padding:12px;border-radius:10px;font-weight:700;margin-bottom:12px">💎 Aktivovat Premium (${monthsEarned}&nbsp;${mWord(monthsEarned)})</button>
      ` : ''}

      <!-- Postup k dalšímu měsíci (zbytek nad celé měsíce) -->
      <div style="font-size:.78rem;color:#c2c7da;margin-bottom:6px">
        ${canRedeem
          ? `Do dalšího měsíce zbývá <strong style="color:var(--premium)">${toNext} bodů</strong>.`
          : `Chybí ti <strong style="color:var(--premium)">${toNext} bodů</strong> do prvního měsíce zdarma.`}
      </div>
      <div style="height:8px;background:var(--surface2);border-radius:5px;overflow:hidden;border:1px solid var(--border)">
        <div style="height:100%;width:${progressPct}%;background:var(--premium);border-radius:5px;transition:width .4s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.68rem;color:#a8aec8;margin-top:5px"><span>${remainder} b.</span><span>${POINTS_PER_PREMIUM_MONTH} b. = 1 měsíc</span></div>
    </div>

    <!-- Odměny (ponecháno) -->
    <div style="background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.2);border-radius:10px;padding:12px 14px">
      <div style="font-size:.82rem;font-weight:700;color:var(--income);margin-bottom:8px">🎁 Referral program</div>
      <div style="display:flex;flex-direction:column;gap:5px">
        <div style="display:flex;justify-content:space-between;font-size:.78rem">
          <span style="color:var(--text2)">Za každou registraci přes tvůj odkaz</span>
          <span style="font-weight:700;color:var(--income)">+${SHARE_REWARDS.signup} bodů</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.78rem">
          <span style="color:var(--text2)">Přihlašuje se měsíc aktivně</span>
          <span style="font-weight:700;color:var(--income)">+${SHARE_REWARDS.month1} bodů</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.78rem">
          <span style="color:var(--text2)">Upgraduje na Premium</span>
          <span style="font-weight:700;color:var(--income)">+${SHARE_REWARDS.premium} bodů</span>
        </div>
      </div>
      <div style="font-size:.7rem;color:#a8aec8;margin-top:8px">${POINTS_PER_PREMIUM_MONTH} nasbíraných bodů = 1 měsíc Premium zdarma. Body uplatníš tlačítkem výše.</div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════
//  UPLATNĚNÍ BODŮ ZA PREMIUM (Session 11)
//  - Odečte uplatněné body z earned (zbytek se přenese, žádné dvojí uplatnění)
//  - Vytvoří požadavek do /support → admin aktivuje Premium ručně
//    (activatePremiumManually). Klient si Premium NEpřiděluje sám.
// ══════════════════════════════════════════════════════
async function redeemPointsForPremium() {
  if (!window._currentUser || _isLocalMode) { showShareToast('⚠️ Přihlas se přes Google'); return; }
  const earned = _refStats.earned || 0;
  const months = Math.floor(earned / POINTS_PER_PREMIUM_MONTH);
  if (months < 1) { showShareToast('Zatím nemáš dost bodů'); return; }

  const spent     = months * POINTS_PER_PREMIUM_MONTH; // uplatněné body
  const remaining = earned - spent;                    // zbytek se přenese

  const ok = confirm(`Aktivovat Premium na ${months} ${months===1?'měsíc':'měsíce/měsíců'} za ${spent} bodů?\n\nZbyde ti ${remaining} bodů. Požadavek odešleme a Premium ti aktivujeme.`);
  if (!ok) return;

  try {
    const uid = window._currentUser.uid;
    const email = window._currentUser.email || window._userProfile?.email || '';
    // 1) Požadavek pro admina
    await _set(_ref(_db, `support/redeem_${uid}_${Date.now()}`), {
      type: 'points_redeem',
      uid,
      email: email || 'neuvedeno',
      message: `Žádost o aktivaci Premium na ${months} měsíc(ů) za ${spent} bodů (uplatnění referral bodů)`,
      points: spent,
      months,
      date: new Date().toISOString(),
    });
    // 2) Odečti uplatněné body (zbytek zůstává)
    await _update(_ref(_db, `users/${uid}/referral`), { earned: remaining });
    _refStats.earned = remaining;

    showShareToast(`✅ Odesláno – Premium na ${months} měs. brzy aktivujeme · zbývá ${remaining} b.`);
    // 3) Překresli sekci (aktualizuje stav bodů a počítadlo)
    if (typeof renderShareSection === 'function') renderShareSection();
  } catch (e) {
    console.log('redeem error:', e);
    showShareToast('⚠️ Něco se pokazilo, zkus to znovu');
  }
}

// ══════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════
function showShareToast(msg) {
  if (typeof showToast === 'function') { showToast(msg); return; }
  let el = document.getElementById('shareToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'shareToast';
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);' +
      'background:var(--surface2);border:1px solid var(--border);border-radius:10px;' +
      'padding:10px 18px;font-size:.82rem;font-weight:600;color:var(--text);' +
      'z-index:9999;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;' +
      'box-shadow:0 4px 20px rgba(0,0,0,.3);white-space:nowrap';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}

// Spusť inicializaci po přihlášení
document.addEventListener('DOMContentLoaded', () => {
  // Hook do onUserSignedIn
  const _origInit = window.onUserSignedIn;
  if (_origInit) {
    window.onUserSignedIn = async function(user) {
      await _origInit(user);
      await initReferral();
    };
  }
});

