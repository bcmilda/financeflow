// FinanceFlow · v10.34 · ui.js · 2026-09-03
//  RENDER ROUTER
// ══════════════════════════════════════════════════════
// TODO-093 (Session 10): stav pro centrální debounce (deklarováno před renderPage
// kvůli TDZ – renderPage na konci čte _lastRenderSig).
let _renderPageTimer = null;
let _lastRenderSig = null;
let _renderForce = true; // true = příští renderPage proběhne vždy (uživatelská akce)
// Vynutí plný render (přepnutí stránky, změna měsíce, save) – obejde anti-flicker guard.
function forceRender(){ _renderForce = true; renderPage(); }
function renderPage(){
  // Session 10: anti-flicker guard. renderPage se volá i z Firebase listeneru při
  // každé synchronizaci; pokud se stránka ani data nezměnily, plný re-render (vč.
  // async fetchů na admin/komunita) způsoboval problikávání při scrollu. Přeskočíme.
  if(typeof _dataSig==='function' && typeof _renderForce!=='undefined'){
    const _sig=_dataSig();
    if(!_renderForce && _sig===_lastRenderSig){ return; }
    _lastRenderSig=_sig; _renderForce=false;
  }
  if(typeof rebuildTransferCatIds==='function') rebuildTransferCatIds();
  renderSummaryCards();
  if(curPage==='prehled')renderDashboard();
  if(curPage==='souhrn')renderSouhrn();
  if(curPage==='transakce')renderTxPage();
  if(curPage==='bank')renderBank();
  if(curPage==='predikce')renderPredikce();
  if(curPage==='dluhy')renderDebts();
  if(curPage==='grafy')renderGrafy();
  if(curPage==='narozeniny')renderNarozeniny();
  if(curPage==='statistiky')renderStats();
  if(curPage==='kategorie')renderCatPage();
  if(curPage==='kurzy'&&typeof renderKurzy==='function')renderKurzy();
  if(curPage==='ai')renderAiPage();
  if(curPage==='rodina')renderFamilySummary();
  if(curPage==='penezenky')renderWalletList();
  if(curPage==='typy')renderPayTypeList();
  if(curPage==='sablony')renderSablonaList();
  if(curPage==='nastaveni'){
    if(typeof renderSettingsPage==='function') renderSettingsPage();
    else if(typeof applySettings==='function') applySettings();
  }
  if(curPage==='sdileni')renderSdileni();
  if(curPage==='projekty')renderProjectGrid();
  if(curPage==='projektDetail'&&_currentProjectId)renderProjectDetail(_currentProjectId);
  if(curPage==='prehled'){renderNetWorth();renderDashboard();}
  if(curPage==='report')renderReport();
  if(curPage==='report2'&&typeof renderReport2Page==='function')renderReport2Page();
  if(curPage==='inflace'&&typeof renderInflace==='function')renderInflace();  // S17.11 TODO-185
  if(curPage==='radar')renderRadar();
  if(curPage==='obraz')renderObraz();
  if(curPage==='detektor')renderDetektor();
  if(curPage==='simulace')renderSimulace();
  if(curPage==='uctenky')renderUctenky();
  if(curPage==='nakup')renderNakup();
  if(curPage==='budouci')renderBudouci();
  if(curPage==='pristi'&&typeof renderPristiPage==='function')renderPristiPage();  // v9.79 TODO-211
  if(curPage==='aktiva')renderAssets();
  if(curPage==='smsimport')renderSmsImport();
  if(curPage==='admin')renderAdmin();
  if(curPage==='tagy')renderTagy();
  if(curPage==='import')renderImport();
  if(curPage==='kalendar')renderKalendar();
  if(curPage==='denik')renderDenik();
  if(curPage==='komunita')renderKomunita();
  if(curPage==='oAplikaci') {
    // Inicializuj share link bar
    if(typeof initShareLinkBar === 'function') initShareLinkBar();
    if(typeof initPartnerLinkBar === 'function') initPartnerLinkBar();
    // Poznámky k vydání z VERZE_LOG
    if(typeof renderReleaseNotes === 'function') renderReleaseNotes();
    // Rozbal shareSection (referral stats)
    if(typeof renderShareSection === 'function') renderShareSection();
    // Oznámení od admina (Session 11) – badge teď, panel se renderuje po rozkliknutí
    if(typeof initAnnouncementsBadge === 'function') initAnnouncementsBadge();
  }
  updateReadonlyUI();
  // TODO-015: Aktualizuj notifikační badge po každém renderu
  updateNotificationBadge();
  // S17.3 (TODO-186): automatický snímek predikce pro nový měsíc (základ trackingu Přesnost).
  // Jednorázově per session (guard uvnitř), ne při prohlížení partnera.
  if(typeof denikAutoSnapshot==='function') denikAutoSnapshot();
  // TODO-093: synchronizuj podpis i po přímém renderu (showPage, changeMonth, save),
  // aby následný debounce zbytečně nepřekresloval.
  if(typeof _dataSig === 'function') _lastRenderSig = _dataSig();
}

// ══════════════════════════════════════════════════════
//  TODO-093 (Session 10): CENTRÁLNÍ DEBOUNCE renderPage
//  renderPage() se volá z Firebase onValue listeneru (app.js) při KAŽDÉ
//  synchronizaci dat. To způsobovalo problikávání (zejména na stránce Poradce,
//  ale i jinde) – celý DOM se přegeneroval i když se nic relevantního nezměnilo.
//  renderPageDebounced() slučuje rychlá volání do jednoho timeout a navíc
//  přeskočí render, pokud se podpis dat (S) nezměnil oproti minulému renderu.
//  (_renderPageTimer / _lastRenderSig deklarovány výše, před renderPage.)
// ══════════════════════════════════════════════════════
function _dataSig(){
  // Lehký podpis stavu – mění se jen při skutečné změně relevantních dat.
  try {
    return JSON.stringify({
      p: typeof curPage !== 'undefined' ? curPage : '',
      v: typeof viewingUid !== 'undefined' ? viewingUid : null,
      m: S.curMonth, y: S.curYear,
      tx: (S.transactions||[]).length,
      d:  (S.debts||[]).length,
      w:  (S.wallets||[]).length,
      a:  (S.assets||[]).length,
      c:  (S.categories||[]).length,
      // hrubý kontrolní součet částek (zachytí editaci bez změny počtu)
      sum: (S.transactions||[]).reduce((s,t)=>s+(t.amount||t.amt||0),0),
      asum: (S.assets||[]).reduce((s,a)=>s+(a.value||0),0),
      dsum: (S.debts||[]).reduce((s,x)=>s+(x.remaining||0),0),
      // FIX (S11): wallet balances + virtuální cíle + tagy/subcat (jinak se změny neprojeví)
      wsum: (S.wallets||[]).reduce((s,w)=>s+(w.balance||0),0),
      gsum: (S.goals||[]).reduce((s,g)=>s+(g.saved||0)+(g.target||0),0),
      tsum: (S.transactions||[]).reduce((s,t)=>s+((Array.isArray(t.tags)?t.tags.join():t.tags||'')+(t.subcat||'')).length,0),
    });
  } catch { return String(Date.now()); }
}

// force=true vždy překreslí (pro uživatelské akce: změna stránky, save, editace)
function renderPageDebounced(force){
  if (force) { _lastRenderSig = _dataSig(); renderPage(); return; }
  if (_renderPageTimer) clearTimeout(_renderPageTimer);
  _renderPageTimer = setTimeout(() => {
    _renderPageTimer = null;
    const sig = _dataSig();
    if (sig === _lastRenderSig) return; // nic se nezměnilo → neblikej
    _lastRenderSig = sig;
    renderPage();
  }, 120);
}


// ══════════════════════════════════════════════════════
//  TODO-015: IN-APP NOTIFIKACE NADCHÁZEJÍCÍCH PLATEB
// ══════════════════════════════════════════════════════
let _notifShownThisSession = false; // zobraz panel jen jednou za sezení

function getUpcomingNotifications(horizonDays = 7) {
  if(typeof budouciGetAll !== 'function') return [];
  const D = getData();
  const items = budouciGetAll(D, horizonDays);
  const today = new Date(); today.setHours(0,0,0,0);

  return items
    .filter(item => {
      const d = new Date(item.date); d.setHours(0,0,0,0);
      const daysTo = Math.round((d - today) / 86400000);
      return daysTo >= 0 && daysTo <= horizonDays && item.amount > 0;
    })
    .map(item => {
      const d = new Date(item.date); d.setHours(0,0,0,0);
      const daysTo = Math.round((d - today) / 86400000);
      return {...item, daysTo};
    })
    .sort((a,b) => a.daysTo - b.daysTo);
}

function updateNotificationBadge() {
  // Najdi nav položku Budoucí platby a přidej/odeber badge
  const navBudouci = document.querySelector('.nav-item[onclick*="budouci"]');
  if(!navBudouci) return;

  const items3 = getUpcomingNotifications(3);
  const items7 = getUpcomingNotifications(7);

  // Odstraň starý badge
  const oldBadge = navBudouci.querySelector('.notif-badge');
  if(oldBadge) oldBadge.remove();

  if(items7.length > 0) {
    const badge = document.createElement('span');
    badge.className = 'notif-badge';
    badge.style.cssText = `
      display:inline-flex;align-items:center;justify-content:center;
      min-width:18px;height:18px;border-radius:9px;
      background:${items3.length > 0 ? 'var(--expense)' : 'var(--debt)'};
      color:#fff;font-size:.66rem;font-weight:700;
      padding:0 4px;margin-left:auto;flex-shrink:0;
    `;
    badge.textContent = items7.length;
    navBudouci.appendChild(badge);
  }

  // Zobraz notifikační panel jednou za sezení při přihlášení
  if(!_notifShownThisSession && items3.length > 0 && curPage !== 'budouci') {
    _notifShownThisSession = true;
    setTimeout(() => showNotificationPanel(items3), 1500);
  }
}

function showNotificationPanel(items) {
  // Odstraň existující panel
  const old = document.getElementById('notifPanel');
  if(old) old.remove();

  const urgentCount = items.filter(i=>i.daysTo<=1).length;
  const totalAmt = items.reduce((a,i)=>a+i.amount,0);

  const panel = document.createElement('div');
  panel.id = 'notifPanel';
  panel.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    width:min(380px,calc(100vw - 24px));
    background:var(--surface);border:1px solid ${urgentCount > 0 ? 'var(--expense)' : 'var(--debt)'};
    border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.4);
    z-index:9000;overflow:hidden;
    animation:slideUp .3s ease-out;
  `;

  panel.innerHTML = `
    <style>
      @keyframes slideUp { from { transform:translateX(-50%) translateY(20px); opacity:0; } to { transform:translateX(-50%) translateY(0); opacity:1; } }
    </style>
    <div style="padding:12px 14px;background:${urgentCount > 0 ? 'var(--expense-bg)' : 'var(--debt-bg)'};display:flex;align-items:center;gap:10px">
      <span style="font-size:1.3rem">${urgentCount > 0 ? '🚨' : '🗓️'}</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:.88rem;color:var(--text)">${urgentCount > 0 ? 'Platby do 24 hodin!' : 'Nadcházející platby'}</div>
        <div style="font-size:.72rem;color:var(--text2)">${items.length} plateb · celkem ${fmtB(Math.round(totalAmt))}</div>
      </div>
      <button onclick="document.getElementById('notifPanel').remove()" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:1.1rem;padding:0;line-height:1">✕</button>
    </div>
    <div style="padding:10px 14px;max-height:200px;overflow-y:auto">
      ${items.slice(0,5).map(item => {
        const urgColor = item.daysTo === 0 ? 'var(--expense)' : item.daysTo <= 2 ? 'var(--debt)' : 'var(--text2)';
        const dayLabel = item.daysTo === 0 ? '⚡ Dnes' : item.daysTo === 1 ? '⚡ Zítra' : `za ${item.daysTo} dní`;
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:1rem;flex-shrink:0">${item.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.82rem;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.name}</div>
            <div style="font-size:.7rem;color:${urgColor}">${dayLabel}</div>
          </div>
          <span style="font-weight:700;font-size:.85rem;color:var(--expense);flex-shrink:0">${fmtB(item.amount)}</span>
        </div>`;
      }).join('')}
      ${items.length > 5 ? `<div style="font-size:.72rem;color:var(--text3);text-align:center;padding-top:6px">+${items.length-5} dalších</div>` : ''}
    </div>
    <div style="padding:8px 14px;display:flex;gap:8px;border-top:1px solid var(--border)">
      <button class="btn btn-accent btn-sm" style="flex:1" onclick="showPage('budouci');document.getElementById('notifPanel').remove()">Zobrazit vše</button>
      <button class="btn btn-ghost btn-sm" onclick="snoozeNotifications();document.getElementById('notifPanel').remove()">🔕 Odložit na 1 den</button>
    </div>
  `;

  document.body.appendChild(panel);

  // Auto-zavři po 12 sekundách
  setTimeout(() => { const p = document.getElementById('notifPanel'); if(p) p.remove(); }, 12000);
}

function snoozeNotifications() {
  // Ulož snooze do localStorage – nezobrazovat znovu dnes
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  localStorage.setItem('ff_notif_snooze', tomorrow.toISOString().slice(0,10));
  _notifShownThisSession = true;
}

function checkNotifSnooze() {
  const snoozeDate = localStorage.getItem('ff_notif_snooze');
  if(!snoozeDate) return false;
  const today = new Date().toISOString().slice(0,10);
  if(snoozeDate > today) { _notifShownThisSession = true; return true; }
  localStorage.removeItem('ff_notif_snooze');
  return false;
}

// Zavolej checkNotifSnooze při startu
if(typeof window !== 'undefined') { try { checkNotifSnooze(); } catch(e){} }

// ══════════════════════════════════════════════════════
//  SUMMARY CARDS
// ══════════════════════════════════════════════════════
function renderSummaryCards(){
  const el=document.getElementById('summaryCards');if(!el)return;
  const D=getData();
  const txs=getTx(S.curMonth,S.curYear,D);
  const inc=incSum(txs),exp=expSum(txs),bal=inc-exp;
  let pm=S.curMonth-1,py=S.curYear;if(pm<0){pm=11;py--;}
  const prevTxs=getTx(pm,py,D),prevExp=expSum(prevTxs),prevInc=incSum(prevTxs);
  const expDiff=prevExp>0?Math.round((exp-prevExp)/prevExp*100):null;
  const bankBal=computeBank(D);
  const totalDebt=(D.debts||[]).reduce((a,d)=>a+d.remaining,0);
  // Prázdný měsíc banner - pokud nemáme transakce ale minulý měsíc ano
  const emptyBanner = document.getElementById('emptyMonthBanner');
  if(emptyBanner) {
    if(!txs.length && prevTxs.length) {
      emptyBanner.style.display = 'block';
      emptyBanner.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:10px;margin-bottom:10px">
        <span style="font-size:1.1rem">💡</span>
        <div style="flex:1;font-size:.82rem;color:var(--text2)">V <strong>${CZ_M[S.curMonth]}</strong> zatím žádné transakce. Poslední aktivita byla v ${CZ_M[pm]}.</div>
        <button class="btn btn-ghost btn-sm" onclick="changeMonth(-1)" style="flex-shrink:0">← ${CZ_M[pm]}</button>
      </div>`;
    } else {
      emptyBanner.style.display = 'none';
    }
  }
  el.innerHTML=`
    <div class="stat-card income"><div class="stat-label">Příjmy</div><div class="stat-value up">${fmt(czkToBase(inc))}</div><div class="stat-sub">${prevInc?fmt(czkToBase(prevInc))+' minulý m.':''}</div></div>
    <div class="stat-card expense"><div class="stat-label">Výdaje</div><div class="stat-value down">${fmt(czkToBase(exp))}</div><div class="stat-sub">${expDiff!==null?`<span style="color:${expDiff>0?'var(--expense)':'var(--income)'}">${expDiff>0?'↑':'↓'}${Math.abs(expDiff)}% vs minulý m.</span>`:''}</div></div>
    <div class="stat-card balance"><div class="stat-label">Zůstatek</div><div class="stat-value ${bal>=0?'up':'down'}">${fmt(czkToBase(bal))}</div><div class="stat-sub">${bal>=0?'přebytek':'schodek'}</div></div>
    <div class="stat-card bank"><div class="stat-label">Úspory (Bank)</div><div class="stat-value bankc">${fmt(czkToBase(bankBal))}</div><div class="stat-sub">kumulované</div></div>
    <div class="stat-card debt"><div class="stat-label">Celkový dluh</div><div class="stat-value warn">${fmt(czkToBase(totalDebt))}</div><div class="stat-sub">${(D.debts||[]).length} závazků</div></div>`;
}

// ══════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  TODO-234: ONBOARDING KROK 1 – uvítací nastavení (S20)
//  Jednorázový modal pro NOVÉHO uživatele. Krok 2 je karta „Dokonči nastavení"
//  níže, krok 3 bude tutoriál v uživatelském menu (TODO-233).
//
//  Proč to vzniklo (FIX-264 + TODO-227):
//   · nový uživatel měl prázdné rozbalovátko peněženek a nevěděl proč
//   · `_settings.hasDebts` čte Finanční skóre (premium.js), ale NEBYLO KDE HO ZADAT –
//     „nemám dluh" a „ještě jsem ho nezadal" vypadá v datech stejně, takže se
//     uživateli bez dluhu složka S2 do skóre vůbec nezapočítala
//
//  ⚠️ Zobrazuje se jen tomu, kdo ho opravdu nevidel. Absence `onboarded` u
//  STÁVAJÍCÍHO uživatele neznamená „nový uživatel" (SKILL 31) – proto se
//  kontroluje i to, že nemá žádné transakce, a stávajícím se příznak tiše dopíše.
// ══════════════════════════════════════════════════════
function maybeShowOnboarding(D){
  if(viewingUid) return;                      // prohlížím cizí účet, nic nenastavuju
  const st = (typeof _settings!=='undefined' && _settings) ? _settings : null;
  if(!st) return;                             // nastavení ještě nedoběhlo z Firebase
  if(st.onboarded) return;
  const hasData = ((D&&D.transactions)||[]).length > 0;
  if(hasData){
    // Stávající uživatel bez příznaku – NEotravovat, jen si tiše poznamenat.
    st.onboarded = true;
    if(typeof persistSettings==='function') persistSettings();
    return;
  }
  obFillDefaults();
  const el = document.getElementById('modalOnboard');
  if(el) el.classList.add('open');
}
// Naplní rozbalovátka aktuálními hodnotami (a dny 1–28 pro den výplaty).
function obFillDefaults(){
  const st = (typeof _settings!=='undefined' && _settings) ? _settings : {};
  const fd = document.getElementById('obFirstDay');
  if(fd && !fd.options.length){
    let html = '<option value="0">🤖 Automaticky (z transakcí)</option>';
    for(let d=1; d<=28; d++) html += `<option value="${d}">${d}. den</option>`;
    fd.innerHTML = html;
  }
  const set = (id,val)=>{ const e=document.getElementById(id); if(e && val!=null) e.value=val; };
  set('obLang', st.lang||'cs');
  set('obCurrency', st.currency||'CZK');
  set('obDateFmt', st.dateFmt||'cs');
  set('obPayFreq', st.payFreq||'monthly');
  set('obFirstDay', st.firstDay||0);
  obToggleFirstDay();
  obSetDebts(null);
}
// Den v měsíci dává smysl jen u měsíční a půlměsíční výplaty.
function obToggleFirstDay(){
  const f = document.getElementById('obPayFreq');
  const w = document.getElementById('obFirstDayWrap');
  if(!f || !w) return;
  const show = (f.value==='monthly' || f.value==='semimonthly');
  w.style.display = show ? '' : 'none';
}
// null = nezodpovězeno (výchozí). Vědomé „ne" je jiná informace než ticho.
let _obHasDebts = null;
function obSetDebts(v){
  _obHasDebts = v;
  const y=document.getElementById('obDebtYes'), n=document.getElementById('obDebtNo');
  if(!y||!n) return;
  y.className = (v===true)  ? 'btn btn-accent' : 'btn btn-ghost';
  n.className = (v===false) ? 'btn btn-accent' : 'btn btn-ghost';
}
function skipOnboarding(){
  const st = (typeof _settings!=='undefined' && _settings) ? _settings : null;
  if(st){ st.onboarded = true; if(typeof persistSettings==='function') persistSettings(); }
  const el=document.getElementById('modalOnboard'); if(el) el.classList.remove('open');
  if(typeof showToast==='function') showToast('Nastavení najdeš kdykoliv v ⚙️ Nastavení');
}
function saveOnboarding(){
  const st = (typeof _settings!=='undefined' && _settings) ? _settings : null;
  if(!st){ skipOnboarding(); return; }
  const val = id => (document.getElementById(id)||{}).value;

  st.lang     = val('obLang')     || 'cs';
  st.currency = val('obCurrency') || 'CZK';
  st.dateFmt  = val('obDateFmt')  || 'cs';
  st.payFreq  = val('obPayFreq')  || 'monthly';
  st.firstDay = parseInt(val('obFirstDay')) || 0;
  // Nezodpovězeno se NEUKLÁDÁ jako false – to by skóre přiznalo body za bezdlužnost,
  // kterou uživatel nepotvrdil (TODO-227).
  if(_obHasDebts !== null) st.hasDebts = _obHasDebts;
  st.onboarded = true;

  // Peněženka: přejmenovat tu, kterou založila ensureBaseData, ne zakládat druhou.
  const wName = (val('obWalletName')||'').trim();
  if(wName && Array.isArray(S.wallets) && S.wallets.length === 1) S.wallets[0].name = wName;

  // Typ platby: nový uživatel má S.payTypes prázdné, takže se založí ten vybraný
  // a rovnou se nastaví jako výchozí pro novou transakci.
  const ptName = (val('obPayType')||'').trim();
  if(ptName){
    if(!Array.isArray(S.payTypes)) S.payTypes = [];
    let pt = S.payTypes.find(p => p && p.name === ptName);
    if(!pt){
      const icons = {'Karta':'💳','Hotovost':'💵','Převod':'🏦'};
      pt = { id:(typeof uid==='function'?uid():'pt'+Date.now().toString(36)), name:ptName, icon:icons[ptName]||'💳' };
      S.payTypes.push(pt);
    }
    st.defPayType = pt.id;
  }
  if(Array.isArray(S.wallets) && S.wallets.length === 1) st.defWallet = S.wallets[0].id;

  if(typeof persistSettings==='function') persistSettings();
  if(typeof save==='function') save();
  if(typeof applySettings==='function') applySettings();
  if(typeof applyLanguage==='function') applyLanguage();

  const el=document.getElementById('modalOnboard'); if(el) el.classList.remove('open');
  if(typeof showToast==='function') showToast('✅ Hotovo – můžeš zapsat první transakci');
  if(typeof forceRender==='function') forceRender();
}

// ══════════════════════════════════════════════════════
//  S12.1b: ONBOARDING PRŮVODCE (Dokonči nastavení X/5)
//  Karta na vrchu Přehledu pro nové uživatele. Každý krok
//  vede přímo na správné místo. Zmizí po dokončení všech
//  kroků nebo ručním zavřením (localStorage ff_onboardHide).
//  Kvalitní vstupní data = přesný radar, runway i COICOP.
// ══════════════════════════════════════════════════════
function renderOnboardingCard(D){
  const el = document.getElementById('onboardCard'); if(!el) return;
  let hidden = false;
  try { hidden = localStorage.getItem('ff_onboardHide2') === '1'; } catch(e){}
  if(hidden || viewingUid){ el.innerHTML=''; return; }

  const st = (typeof _settings !== 'undefined' && _settings) ? _settings : {};
  const steps = [
    { icon:'➕', label:'Zapiš první transakci', sub:'ručně, z účtenky nebo importem výpisu',
      done: (D.transactions||[]).length > 0, go:"showPage('transakce')" },
    { icon:'📆', label:'Nastav den výplaty', sub:'pohání Runway do výplaty a týdenní tempo',
      done: (parseInt(st.firstDay)||0) > 0 || (typeof radarDetectPaydayDay==='function' && !!radarDetectPaydayDay(D)),
      go:"showPage('nastaveni')" },
    { icon:'🛡️', label:'Urči nedotknutelnou rezervu', sub:'denní limit ji nepustí k utracení',
      done: (parseInt(st.minReserve)||0) > 0, go:"showPage('nastaveni')" },
    { icon:'🏷️', label:'Nastav charakter výdajů u kategorií', sub:'fixní vs variabilní – aspoň u 3 kategorií',
      done: (D.categories||[]).filter(c=>c && c.expenseChar).length >= 3, go:"showPage('kategorie')" },
    { icon:'🎯', label:'Nastav limity kategorií', sub:'automatické % rozdělení podle tvých výdajů',
      done: (D.categories||[]).filter(c=>c && (c.type==='expense'||c.type==='both') && (c.healthPct>0 || c.healthAmt>0)).length >= 3,
      go:"openAutoLimitsModal()" },
    { icon:'👨‍👩‍👧', label:'Vyplň složení domácnosti', sub:'pro srovnání s průměry ČSÚ',
      done: (parseInt(st.household_adults)||0) > 0, go:"showPage('nastaveni')" },
    // TODO-236 (S21, Milan): co se v onboardingu přeskočí, má skončit tady.
    //   Pro uživatele, kteří onboardingem nikdy neprošli, je `onboardingSkipped`
    //   undefined → krok je rovnou hotový a nikoho neotravuje (SKILL 31:
    //   chybějící příznak neznamená „přeskočeno").
    { icon:'👋', label:'Dokonči úvodní nastavení', sub:'jazyk, měna, formát data, frekvence výplaty',
      done: st.onboardingSkipped !== true, go:"openOnboardingModal()" },
    // Odpověď na otázku po půjčce odemyká S2 (zadluženost) ve Finančním skóre.
    //   Podmínka je ZÁMĚRNĚ stejná jako `_debtsKnown` v premium.js – checklist
    //   nesmí tvrdit něco jiného než skóre, které na tomtéž stojí.
    { icon:'🏦', label:'Řekni, jestli máš půjčku nebo hypotéku', sub:'bez toho skóre nezná zadluženost a vynechá ji',
      done: (D.debts||[]).length > 0 || st.hasDebts === false || st.hasDebts === true,
      go:"openOnboardingModal()" },
  ];
  const doneCount = steps.filter(s=>s.done).length;
  if(doneCount === steps.length){ el.innerHTML=''; return; }
  const pct = Math.round(doneCount/steps.length*100);

  el.innerHTML = `
  <div class="card" style="margin-bottom:14px;border:1px solid rgba(96,165,250,.35)">
    <div class="card-header">
      <span class="card-title">🚀 Dokonči nastavení (${doneCount}/${steps.length})</span>
      <button onclick="dismissOnboarding()" style="background:none;border:1px solid var(--border);border-radius:8px;color:#a8aec8;font-size:.7rem;font-weight:600;cursor:pointer;padding:4px 10px" title="Skrýt průvodce (trvale)">Skrýt</button>
    </div>
    <div class="card-body">
      <div style="height:7px;background:var(--surface3);border-radius:5px;overflow:hidden;margin-bottom:12px">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#60a5fa,#4ade80);transition:width .3s"></div>
      </div>
      ${steps.map(s=>`
      <div onclick="${s.done?'':s.go}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;margin-bottom:5px;min-width:0;${s.done?'opacity:.5':'background:var(--surface2);cursor:pointer'}">
        <span style="font-size:1rem;flex-shrink:0">${s.done?'✅':s.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:.82rem;font-weight:600;${s.done?'text-decoration:line-through;color:#a8aec8':''}">${s.label}</div>
          ${s.done?'':`<div style="font-size:.68rem;color:#a8aec8">${s.sub}</div>`}
        </div>
        ${s.done?'':'<span style="color:var(--text3);flex-shrink:0">›</span>'}
      </div>`).join('')}
    </div>
  </div>`;
}
function dismissOnboarding(){
  try { localStorage.setItem('ff_onboardHide2','1'); } catch(e){}
  const el = document.getElementById('onboardCard'); if(el) el.innerHTML='';
}

// Měsíční checklist – opakuje se každý měsíc (výplata, počet transakcí). Resetuje se změnou měsíce.
function renderMonthlyChecklist(D){
  const el = document.getElementById('monthlyChecklistCard'); if(!el) return;
  if(viewingUid){ el.innerHTML=''; return; }
  // Skrytí na aktuální měsíc (uloženo per měsíc)
  const mKey = `${S.curYear}-${String(S.curMonth+1).padStart(2,'0')}`;
  let hidden = false;
  try { hidden = localStorage.getItem('ff_mChkHide_'+mKey) === '1'; } catch(e){}
  if(hidden){ el.innerHTML=''; return; }

  const monthTxs = (typeof getTx==='function') ? getTx(S.curMonth, S.curYear, D).filter(t=>!t.splitParent) : [];
  // Výplata tento měsíc = příjem v kategorii "Výplata" (nebo jakýkoli příjem typu stable income)
  const salaryCat = (D.categories||[]).find(c=>c.name==='Výplata');
  const hasSalary = monthTxs.some(t=> t.type==='income' && ( (salaryCat && (t.catId||t.category)===salaryCat.id) || /výplat|mzda|plat/i.test(t.name||'') ));
  const txCount = monthTxs.length;
  const has20 = txCount >= 20;

  const tasks = [
    { icon:'💰', label:'Přidej výplatu / hlavní příjem', sub:'tento měsíc', done:hasSalary, go:"showPage('transakce')" },
    { icon:'📝', label:`Zapiš aspoň 20 transakcí (${txCount}/20)`, sub:'pro přesné statistiky a skóre', done:has20, go:"showPage('transakce')" },
  ];
  const doneCount = tasks.filter(t=>t.done).length;
  if(doneCount === tasks.length){ el.innerHTML=''; return; }  // vše hotovo → skryj
  const pct = Math.round(doneCount/tasks.length*100);
  const monthName = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'][S.curMonth];

  el.innerHTML = `
  <div class="card" style="margin-bottom:14px;border:1px solid rgba(74,222,128,.3)">
    <div class="card-header">
      <span class="card-title">📅 Tento měsíc (${monthName}) – ${doneCount}/${tasks.length}</span>
      <button onclick="dismissMonthlyChecklist()" style="background:none;border:1px solid var(--border);border-radius:8px;color:#a8aec8;font-size:.7rem;font-weight:600;cursor:pointer;padding:4px 10px" title="Skrýt pro tento měsíc">Skrýt</button>
    </div>
    <div class="card-body">
      <div style="height:7px;background:var(--surface3);border-radius:5px;overflow:hidden;margin-bottom:12px">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#4ade80,#22c55e);transition:width .3s"></div>
      </div>
      ${tasks.map(t=>`
      <div onclick="${t.done?'':t.go}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;margin-bottom:5px;min-width:0;${t.done?'opacity:.5':'background:var(--surface2);cursor:pointer'}">
        <span style="font-size:1rem;flex-shrink:0">${t.done?'✅':t.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:.82rem;font-weight:600;${t.done?'text-decoration:line-through;color:#a8aec8':''}">${t.label}</div>
          ${t.done?'':`<div style="font-size:.68rem;color:#a8aec8">${t.sub}</div>`}
        </div>
        ${t.done?'':'<span style="color:var(--text3);flex-shrink:0">›</span>'}
      </div>`).join('')}
    </div>
  </div>`;
}
function dismissMonthlyChecklist(){
  const mKey = `${S.curYear}-${String(S.curMonth+1).padStart(2,'0')}`;
  try { localStorage.setItem('ff_mChkHide_'+mKey,'1'); } catch(e){}
  const el = document.getElementById('monthlyChecklistCard'); if(el) el.innerHTML='';
}

// Dashboard karta: přehled přesunů (kam jdou peníze – investice, rezerva, spoření).
// Hodnoty počítány z transfer-transakcí (computeTransferTotals), nemutuje data.
function renderTransferOverview(D){
  const el = document.getElementById('transferOverviewCard'); if(!el) return;
  if(typeof computeTransferTotals!=='function'){ el.innerHTML=''; return; }
  const T = computeTransferTotals(D);
  // FIX-286 (Milan): virtuální přesuny sem nepatří – nejsou to úspory ani investice,
  //   jen si člověk odložil vlastní peníze na cíl. Zobrazují se v kartě Čistý majetek.
  const active = T.perCat.filter(p=>p.group!=='virtual' && (Math.abs(p.total)>0.01 || Math.abs(p.month)>0.01));
  if(!active.length){ el.innerHTML=''; return; }  // nic nasměrováno → kartu neukazuj

  const fmtK = v => (typeof fmt==='function'?fmt(Math.round(czkToBase(v))):Math.round(v)); // v8.60 (TODO-150): v základní měně
  const _CS = curSym();
  // Skupinové součty (investice vs rezerva/spoření)
  const inv = T.byGroup.investment, sav = T.byGroup.savings;

  // Řádky per kategorie
  const rows = active.sort((a,b)=>Math.abs(b.total)-Math.abs(a.total)).map(p=>{
    const isOut = p.total<0;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:1.1rem;width:26px;text-align:center">${p.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:.86rem;font-weight:600;color:var(--text)">${p.name}</div>
        ${Math.abs(p.month)>0.01?`<div style="font-size:.66rem;color:#a8aec8">tento měsíc ${p.month>=0?'+':''}${fmtK(p.month)}${_CS}</div>`:''}
      </div>
      <div style="text-align:right">
        <div style="font-size:.95rem;font-weight:700;color:${isOut?'#fbbf24':p.color}">${fmtK(p.total)}${_CS}</div>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
  <div class="card" style="margin-bottom:14px">
    <div class="card-header">
      <span class="card-title">💎 Moje úspory a investice</span>
      <span style="font-size:.64rem;color:#a8aec8;cursor:pointer" onclick="showPage('aktiva')">Aktiva ›</span>
    </div>
    <div class="card-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:11px;padding:12px;text-align:center">
          <div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">📈 Investice</div>
          <div style="font-size:1.25rem;font-weight:800;color:#34d399;font-family:Syne">${fmtK(inv.total)}${_CS}</div>
          ${Math.abs(inv.month)>0.01?`<div style="font-size:.62rem;color:#86efac">tento měsíc +${fmtK(inv.month)}</div>`:''}
        </div>
        <div style="background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.3);border-radius:11px;padding:12px;text-align:center">
          <div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">🛟 Rezerva &amp; spoření</div>
          <div style="font-size:1.25rem;font-weight:800;color:#22d3ee;font-family:Syne">${fmtK(sav.total)}${_CS}</div>
          ${Math.abs(sav.month)>0.01?`<div style="font-size:.62rem;color:#67e8f9">tento měsíc +${fmtK(sav.month)}</div>`:''}
        </div>
      </div>
      <div style="font-size:.7rem;color:#a8aec8;margin-bottom:6px">Rozpad podle kategorie:</div>
      ${rows}
      <div style="font-size:.64rem;color:#a8aec8;margin-top:10px;line-height:1.4">💡 Hodnoty jsou součtem tvých přesunů (peníze nasměrované do investic/rezervy). Nepočítají se jako výdaj. Záporná hodnota = víc vybráno než vloženo.</div>
    </div>
  </div>`;
}

function renderDashboard(){
  const D=getData();
  // S12.1b: Onboarding průvodce pro nové uživatele
  renderOnboardingCard(D);
  // Měsíční checklist (výplata, 20 transakcí)
  renderMonthlyChecklist(D);
  // S17.38 (Milan): připomenutí konce trialu – banner v sidebaru se snadno přehlédne
  if(typeof renderTrialReminder==='function') renderTrialReminder();
  // Přehled přesunů (investice, rezerva, spoření)
  renderTransferOverview(D);
  // Financial score card
  renderFinancialScore(D);
  // Bday alert
  const bEl=document.getElementById('bdayAlert');
  if(bEl){
    const bdays=(D.birthdays||[]).filter(b=>daysUntilBday(b)<=7);
    bEl.innerHTML=bdays.length?bdays.map(b=>`<div class="insight-item warn" style="margin-bottom:10px"><div class="insight-icon">🎂</div><div class="insight-text"><strong>${b.name}</strong> – narozeniny za ${daysUntilBday(b)} dní${b.gift?` · Dárek: <strong>${fmt(b.gift)}</strong>`:''}</div></div>`).join(''):'';
  }
  // Recent tx
  const rEl=document.getElementById('recentTxList');
  if(rEl){
    const txs=getTx(S.curMonth,S.curYear,D).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
    if(!txs.length)rEl.innerHTML='<div class="empty"><div class="et">Žádné transakce</div></div>';
    else rEl.innerHTML=txs.map(t=>{const cat=getCat(t.catId,D.categories);return`<div class="tx-row"><div style="font-size:.9rem">${cat.icon}</div><div class="tx-info"><div class="tx-name">${t.name}</div><div class="tx-meta">${fmtD(t.date)} · ${cat.name}</div></div><div class="tx-amt ${t.type==='income'?'inc':'exp'}">${t.type==='income'?'+':'-'}${fmtP(t.amount||t.amt||0)}</div></div>`;}).join('');
  }
  // Treemap nahoře (kompaktní)
  renderDashTreemap(D);
  // Bubble chart dole (více prostoru)
  renderBubbleChart(D);
  renderBarChart(D);
}

// ══ TREEMAP – kompaktní verze pro dashboard (horní karta) ══
function renderDashTreemap(D){
  const el=document.getElementById('bubbleTreemapWrap');if(!el)return;
  D=D||getData();
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  const cats=expCats.map(c=>{
    const total=getActual(c.id,null,S.curMonth,S.curYear,D);
    return {id:c.id,name:c.name,color:c.color||'#60a5fa',icon:c.icon||'📦',total};
  }).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);

  // FIX-073 (Session 8): Přidat "Ostatní" bucket pro transakce bez kategorie (catId='', null, '?')
  const knownCatIds=new Set(expCats.map(c=>c.id));
  const othersTotal=(D.transactions||[])
    .filter(t=>t.type==='expense'&&!t.isBalancing&&!knownCatIds.has(t.catId)&&!knownCatIds.has(t.category))
    .filter(t=>{const d=new Date(t.date);return d.getMonth()===S.curMonth&&d.getFullYear()===S.curYear;})
    .reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
  if(othersTotal>0) cats.push({id:'_others',name:'Ostatní',color:'#94a3b8',icon:'❓',total:othersTotal});

  if(!cats.length){
    el.innerHTML='<div class="empty" style="padding:16px"><div class="ei">📊</div><div class="et">Žádné výdaje</div></div>';
    return;
  }

  const totalAll=cats.reduce((s,c)=>s+c.total,0);
  const sorted=cats;
  // S12.1r: tři vrstvy podle podílu → víc kategorií se vejde čitelně
  const big=sorted.filter(c=>c.total/totalAll>0.15);
  const mid=sorted.filter(c=>c.total/totalAll<=0.15 && c.total/totalAll>0.05);
  const small=sorted.filter(c=>c.total/totalAll<=0.05);

  const cell=(cat,minH)=>{
    const pct=Math.round(cat.total/totalAll*100);
    const pctExact=(cat.total/totalAll*100).toFixed(1);
    const tip=`${cat.icon} ${cat.name}: ${fmtB(cat.total)} (${pctExact} % výdajů měsíce)`;
    return `<div title="${tip.replace(/"/g,'&quot;')}"
      onclick="event.stopPropagation();showTreemapTip('${cat.id}','${(cat.icon+' '+cat.name).replace(/'/g,'')}',${cat.total},'${pctExact}','${cat.color}')"
      style="flex:${Math.max(1,Math.round(cat.total/totalAll*100))};min-width:${minH>60?64:44}px;min-height:${minH}px;
      border-radius:9px;padding:8px 10px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;
      background:${cat.color}18;border:1px solid ${cat.color}44;cursor:pointer;transition:background .15s,border-color .15s"
      onmouseover="this.style.background='${cat.color}30';this.style.borderColor='${cat.color}88'"
      onmouseout="this.style.background='${cat.color}18';this.style.borderColor='${cat.color}44'">
      <div style="font-size:.68rem;font-weight:600;color:${cat.color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cat.icon} ${cat.name}</div>
      <div style="font-size:.82rem;font-weight:800;color:${cat.color}">${fmt(cat.total)}</div>
      <div style="font-size:.66rem;opacity:.6;color:${cat.color}">${pct}%</div>
    </div>`;
  };

  el.innerHTML=
    `<div style="display:flex;flex-direction:column;gap:4px">`+
    (big.length?`<div style="display:flex;gap:4px">${big.map(c=>cell(c,82)).join('')}</div>`:'')+
    (mid.length?`<div style="display:flex;gap:4px;flex-wrap:wrap">${mid.map(c=>cell(c,60)).join('')}</div>`:'')+
    (small.length?`<div style="display:flex;gap:4px;flex-wrap:wrap">${small.map(c=>cell(c,46)).join('')}</div>`:'')+
    `<div id="treemapTip" style="display:none;margin-top:6px;padding:9px 12px;border-radius:9px;background:var(--surface3);border:1px solid var(--border);font-size:.8rem"></div>`+
    `</div>`;
}

// S12.1r: kontextové pole treemapu (tap na dlaždici)
function showTreemapTip(id, label, total, pct, color){
  const el=document.getElementById('treemapTip'); if(!el) return;
  el.style.display='block';
  el.style.borderColor=color+'66';
  el.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
    <span style="font-weight:700;color:${color}">${label}</span>
    <span style="font-weight:800;font-family:Syne,sans-serif">${fmtB(total)}</span>
  </div>
  <div style="font-size:.7rem;color:#a8aec8;margin-top:3px">${pct} % výdajů tohoto měsíce · klikni na jinou dlaždici pro detail</div>`;
}

// ══ BUBBLE CHART – 3 varianty (TODO-076) – Cluster / Drill / Gradient ══
// Session 10: Treemap (D) odebrána (duplikát samostatné Treemap karty v dashboardu).
// Cluster přepsán na relativní souřadnice (řeší OPEN-031 přetékání), přidány tooltipy.
let _bv='A', _bl1=null, _bl2=null, _bl2prev=null;

function renderBubbleChart(D) {
  const el=document.getElementById('bubbleChartWrap'); if(!el) return;
  if(typeof bTipHide==='function') bTipHide(); // skryj zaseknutý tooltip při překreslení
  if(_bv!=='A'&&_bv!=='B'&&_bv!=='C')_bv='A'; // guard: odebraná 'D' Treemap
  D=D||getData();
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  const cats=expCats.map(c=>{
    const total=getActual(c.id,null,S.curMonth,S.curYear,D);
    const subs=(c.subs||[]).map(sub=>({name:sub,val:getActual(c.id,sub,S.curMonth,S.curYear,D),catId:c.id})).filter(s=>s.val>0);
    return {id:c.id,name:c.name,color:c.color||'#60a5fa',icon:c.icon||'📦',total,subs};
  }).filter(c=>c.total>0).sort((a,b)=>b.total-a.total).slice(0,8);

  if(!cats.length){
    el.innerHTML='<div class="empty" style="padding:16px"><div class="ei">📊</div><div class="et">Žádné výdaje</div></div>';
    return;
  }

  // Sdílené prvky (existují ve 2+ kategoriích). Session 10: sdílení nyní detekuje
  // tři zdroje – (1) shodné PODKATEGORIE, (2) shodné TAGY transakcí napříč kat.,
  // (3) tagy podkategorií. Vše se sloučí do subMap pod názvem prvku.
  const subMap={};
  const addShared=(name,catId,catName,catColor,val)=>{
    if(!name) return;
    if(!subMap[name]) subMap[name]=[];
    const ex=subMap[name].find(x=>x.catId===catId);
    if(ex) ex.val+=val; else subMap[name].push({catId,catName,catColor,val});
  };
  // (1) podkategorie
  cats.forEach(c=>c.subs.forEach(s=>addShared(s.name,c.id,c.name,c.color,s.val)));
  // (2) tagy transakcí napříč kategoriemi
  const catById={}; cats.forEach(c=>catById[c.id]=c);
  (D.transactions||[]).forEach(t=>{
    if(t.type!=='expense'||t.isBalancing) return;
    const d=new Date(t.date); if(d.getMonth()!==S.curMonth||d.getFullYear()!==S.curYear) return;
    const c=catById[t.catId]; if(!c) return;
    const amt=t.amount||t.amt||0;
    parseTxTags(t).forEach(tag=>addShared('#'+tag,c.id,c.name,c.color,amt));
  });
  const SHARED_NAMES=new Set(Object.keys(subMap).filter(n=>subMap[n].length>=2));
  const totalAll=cats.reduce((s,c)=>s+c.total,0);

  // Session 10: doplň sdílené prvky (tagy + tagy podkat.), které nejsou klasickou
  // podkategorií, jako satelity do příslušných kategorií – ať se zobrazí v grafu.
  SHARED_NAMES.forEach(name=>{
    subMap[name].forEach(entry=>{
      const c=cats.find(cc=>cc.id===entry.catId); if(!c) return;
      if(!c.subs.some(s=>s.name===name)){
        c.subs.push({name, val:entry.val, catId:c.id, _fromTag:name.startsWith('#')});
      }
    });
  });

  const tabs=`<div style="display:flex;gap:3px;margin-bottom:14px;background:var(--surface3);border-radius:11px;padding:3px">
    ${[['A','⬤ Cluster'],['B','◎ Drill'],['C','◑ Gradient']].map(([k,v])=>`<button onclick="bubbleTab('${k}')"
      style="flex:1;padding:7px 0;border:none;border-radius:8px;font-size:.7rem;font-weight:${_bv===k?700:500};cursor:pointer;transition:all .18s;font-family:inherit;
        background:${_bv===k?'var(--surface2)':'transparent'};
        color:${_bv===k?'var(--text)':'var(--text3)'};
        ${_bv===k?'box-shadow:0 1px 6px rgba(0,0,0,.3)':''}">${v}</button>`).join('')}
  </div>`;

  // Wrap div pro každou variantu — kvůli offsetWidth pro responsive
  el.innerHTML=tabs+`<div id="bubbleBody"></div>`;
  const body=document.getElementById('bubbleBody');
  const W=Math.max(body.offsetWidth||el.offsetWidth||280, 240);

  if(_bv==='A')      bCluster(cats,totalAll,SHARED_NAMES,W,body);
  else if(_bv==='B'){
    if(!_bl1)      bDrillL1(cats,W,body);
    else if(!_bl2) bDrillL2(cats,SHARED_NAMES,W,body);
    else           bDrillL3(cats,W,body);
  }
  else               bGradient(cats,totalAll,subMap,W,body);
}

function bubbleTab(v){_bv=v;_bl1=null;_bl2=null;_bl2prev=null;renderBubbleChart(getData());}
function bubbleDrillL2(id){_bl1=id;_bl2=null;renderBubbleChart(getData());}
function bubbleDrillL3(sub,prevId){_bl2=sub;_bl2prev=prevId;renderBubbleChart(getData());}
function bubbleBack(l){if(l===0){_bl1=null;_bl2=null;}else _bl2=null;renderBubbleChart(getData());}
function bRgba(hex,a){const r=parseInt(hex.slice(1,3),16)||96,g=parseInt(hex.slice(3,5),16)||165,b=parseInt(hex.slice(5,7),16)||250;return `rgba(${r},${g},${b},${a})`;}

// ── Bubble tooltip (Session 10) ──
function bEsc(s){return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
function _bubbleTipEl(){
  let el=document.getElementById('_bubbleTip');
  if(!el){
    el=document.createElement('div');
    el.id='_bubbleTip';
    el.style.cssText='position:fixed;background:#1a2035;border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:8px 12px;font-size:.76rem;line-height:1.55;pointer-events:none;z-index:9999;display:none;max-width:200px;color:var(--text);box-shadow:0 4px 20px rgba(0,0,0,.5)';
    document.body.appendChild(el);
    window.addEventListener('scroll',()=>{el.style.display='none';},true);
  }
  return el;
}
let _bTipTimer=null;
function bTip(node,html){
  const el=_bubbleTipEl();
  if(_bTipTimer){clearTimeout(_bTipTimer);_bTipTimer=null;}
  if(!html){el.style.display='none';return;}
  el.innerHTML=html; el.style.display='block';
  const r=node.getBoundingClientRect();
  const tx=Math.min(r.left+r.width/2-el.offsetWidth/2, window.innerWidth-el.offsetWidth-8);
  el.style.left=Math.max(8,tx)+'px';
  el.style.top=Math.max(8,r.top-el.offsetHeight-10)+'px';
  // Auto-hide: pokud mouseleave nepřijde (např. SVG překreslení), schovej po 2,5 s
  _bTipTimer=setTimeout(()=>{el.style.display='none';},2500);
}
function bTipHide(){const el=document.getElementById('_bubbleTip');if(el)el.style.display='none';if(_bTipTimer){clearTimeout(_bTipTimer);_bTipTimer=null;}}

// ── A) CLUSTER – velké kruhy + satelity ──
// Session 10: přepsáno dle ff-grafy-final.html – relativní souřadnice (žádné
// absolutní px+padding) → bubliny nepřetékají z viewBoxu (řeší OPEN-031).
// Přidány tooltipy (hover) + 📎 sponka uvnitř kategorie, která obsahuje sdílenou subkat.
function bCluster(cats,totalAll,SHARED,W,body){
  const H=420, maxV=cats[0].total;
  // Relativní pozice 0–1; pak dopočítáme skutečný bounding box vč. satelitů a
  // roztáhneme viewBox, aby nic nepřetékalo (řeší trvalý problém přetékání).
  const POS=[{x:.20,y:.28},{x:.52,y:.18},{x:.82,y:.30},{x:.16,y:.70},{x:.50,y:.76},{x:.84,y:.68},{x:.34,y:.50},{x:.67,y:.50}];

  let defs='<defs>';
  cats.forEach((c,i)=>defs+=`<radialGradient id="cg${i}" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="${c.color}" stop-opacity="0.32"/><stop offset="100%" stop-color="${c.color}" stop-opacity="0.07"/></radialGradient>`);
  defs+='</defs>';

  let lines='', circles='';
  let minX=0,minY=0,maxX=W,maxY=H; // sledujeme bbox
  const track=(x,y,r)=>{ if(x-r<minX)minX=x-r; if(y-r<minY)minY=y-r; if(x+r>maxX)maxX=x+r; if(y+r>maxY)maxY=y+r; };

  cats.forEach((cat,i)=>{
    const p=POS[i]||{x:.5,y:.5};
    const cx=Math.round(p.x*W), cy=Math.round(p.y*H);
    const cr=Math.max(34,Math.min(60,Math.round(34+(cat.total/maxV)*26)));
    const maxSub=Math.max(...cat.subs.map(s=>s.val),1);
    const hasShared=cat.subs.some(s=>SHARED.has(s.name));
    const catTip=`<b>${cat.icon||''} ${cat.name}</b><br>${fmtB(cat.total)}<br><span style='color:${cat.color}'>${Math.round(cat.total/totalAll*100)} % výdajů</span>${hasShared?'<br>📎 obsahuje sdílený prvek':''}`;
    track(cx,cy,cr+8);

    cat.subs.forEach((sub,j)=>{
      const sr=Math.max(16,Math.min(26,Math.round(16+(sub.val/maxSub)*10)));
      const a=(cat.subs.length===1)?-Math.PI/2:((j/cat.subs.length)*Math.PI*2-Math.PI/2);
      const dist=cr+sr+10;
      const sx=Math.round(cx+Math.cos(a)*dist), sy=Math.round(cy+Math.sin(a)*dist);
      const isS=SHARED.has(sub.name);
      track(sx,sy,sr+4);
      const subTip=`<b>${sub.name}</b><br>${fmtB(sub.val)}<br><span style='color:${cat.color}'>${cat.name}</span>${isS?' · 🔗 sdílené':''}`;
      lines+=`<line x1="${Math.round(cx+Math.cos(a)*cr)}" y1="${Math.round(cy+Math.sin(a)*cr)}" x2="${Math.round(sx-Math.cos(a)*sr)}" y2="${Math.round(sy-Math.sin(a)*sr)}" stroke="${cat.color}" stroke-width="1" stroke-dasharray="3 2" opacity=".3"/>`;
      circles+=`<circle cx="${sx}" cy="${sy}" r="${sr}" fill="${bRgba(isS?'#8b9bc0':cat.color,.18)}" stroke="${isS?'#8b9bc0':cat.color}" stroke-width="${isS?2:1.2}" ${isS?'stroke-dasharray="4,2"':''} style="cursor:pointer" onmouseenter="bTip(this,'${bEsc(subTip)}')" onmouseleave="bTip(this,'')"/>`;
      if(isS) circles+=`<text x="${sx}" y="${sy-sr-2}" text-anchor="middle" font-size="12" pointer-events="none">📎</text>`;
      circles+=`<text x="${sx}" y="${sy+3}" text-anchor="middle" font-size="8" fill="${isS?'#c2c7dc':bRgba(cat.color,.9)}" pointer-events="none">${sub.name.slice(0,10)}</text>`;
    });

    circles+=`<circle cx="${cx}" cy="${cy}" r="${cr}" fill="url(#cg${i})" stroke="${cat.color}" stroke-width="2.5" style="cursor:pointer" onclick="bubbleDrillL2('${cat.id}');bubbleTab('B')" onmouseenter="bTip(this,'${bEsc(catTip)}')" onmouseleave="bTip(this,'')"/>`;
    circles+=`<text x="${cx}" y="${cy-5}" text-anchor="middle" font-size="${Math.max(8,Math.round(cr*.22))}" font-weight="700" fill="${cat.color}" pointer-events="none">${cat.name.slice(0,9)}</text>`;
    circles+=`<text x="${cx}" y="${cy+9}" text-anchor="middle" font-size="${Math.max(7,Math.round(cr*.19))}" fill="${bRgba(cat.color,.9)}" pointer-events="none">${(cat.total/1000).toFixed(1)}k</text>`;
    // 📎 sponka uvnitř kategorie obsahující sdílený prvek
    if(hasShared) circles+=`<text x="${cx+cr-7}" y="${cy-cr+12}" text-anchor="middle" font-size="13" pointer-events="none">📎</text>`;
  });

  // Roztáhni viewBox o bbox + malý okraj → nic nepřetéká
  const pad=6;
  const vbX=Math.floor(minX-pad), vbY=Math.floor(minY-pad);
  const vbW=Math.ceil(maxX-minX+pad*2), vbH=Math.ceil(maxY-minY+pad*2);

  const leg=cats.map(c=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:.65rem;margin:1px 5px 1px 0"><span style="width:7px;height:7px;border-radius:50%;background:${c.color};display:inline-block"></span>${c.name}</span>`).join('');
  body.innerHTML=`<svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" style="display:block;width:100%;height:auto">${defs}${lines}${circles}</svg>
    <div style="margin-top:8px;display:flex;flex-wrap:wrap">${leg}</div>
    ${SHARED.size?'<div style="font-size:.65rem;color:#a8aec8;margin-top:6px">Hover pro detail · klikni na kategorii pro drill · 📎 = sdílený prvek (podkat./tag ve 2+ kat.)</div>':'<div style="font-size:.65rem;color:#a8aec8;margin-top:6px">Hover pro detail · klikni na kategorii pro detail</div>'}`;
}

// ── B) DRILL L1 ──
//  v9.73 (FIX-246): sdílený výpočet viewBoxu podle SKUTEČNÉHO obsahu.
//  Cluster si bbox hlídal, Drill i Gradient měly viewBox natvrdo „0 0 W H",
//  takže cokoli u okraje se oříznulo. Tenhle helper posbírá krajní body
//  a viewBox roztáhne – graf se pak vejde vždy, ať vyjdou poloměry jakkoli.
function bViewBox(pts, W, H, padding){
  const p = padding == null ? 10 : padding;
  let minX = 0, minY = 0, maxX = W, maxY = H;
  (pts || []).forEach(o => {
    const r = (o.r || 0) + p;
    if (o.x - r < minX) minX = o.x - r;
    if (o.y - r < minY) minY = o.y - r;
    if (o.x + r > maxX) maxX = o.x + r;
    if (o.y + r > maxY) maxY = o.y + r;
  });
  return `${minX.toFixed(0)} ${minY.toFixed(0)} ${(maxX-minX).toFixed(0)} ${(maxY-minY).toFixed(0)}`;
}

function bDrillL1(cats,W,body){
  //  v9.73: vyšší plocha (380 px) a pozice blíž okrajům – plocha byla využitá
  //  jen zčásti a bubliny se mačkaly uprostřed.
  const H=380, maxV=cats[0].total;
  const POS=[{x:.18,y:.24},{x:.50,y:.15},{x:.82,y:.25},{x:.15,y:.62},{x:.50,y:.72},{x:.85,y:.62},{x:.32,y:.44},{x:.68,y:.44}];
  const _pts=[];
  let html='';
  cats.forEach((cat,i)=>{
    const R=Math.round(30+(cat.total/maxV)*46);
    const px=Math.round((POS[i]||{x:.5,y:.5}).x*W), py=Math.round((POS[i]||{x:.5,y:.5}).y*H);
    _pts.push({x:px,y:py,r:R});
    const tipTxt=`<b>${cat.icon||''} ${cat.name}</b><br>${fmtB(cat.total)}<br><span style='color:var(--text3)'>Klikni pro detail</span>`;
    html+=`<circle cx="${px}" cy="${py}" r="${R}" fill="${bRgba(cat.color,.14)}" stroke="${cat.color}" stroke-width="2" style="cursor:pointer;transition:fill .15s" onclick="bubbleDrillL2('${cat.id}')" onmouseover="this.style.fill='${bRgba(cat.color,.3)}';bTip(this,'${bEsc(tipTxt)}')" onmouseout="this.style.fill='${bRgba(cat.color,.14)}';bTip(this,'')"/>`;
    html+=`<text x="${px}" y="${py-5}" text-anchor="middle" fill="${cat.color}" font-size="${Math.max(9,Math.round(R*.22))}" font-weight="700" pointer-events="none">${cat.name}</text>`;
    html+=`<text x="${px}" y="${py+9}" text-anchor="middle" fill="${bRgba(cat.color,.8)}" font-size="${Math.max(8,Math.round(R*.18))}" pointer-events="none">${(cat.total/1000).toFixed(1)}k</text>`;
  });
  body.innerHTML=`<div style="font-size:.72rem;color:#a8aec8;margin-bottom:6px">📍 Přehled kategorií – klikni pro detail</div>
    <svg viewBox="${bViewBox(_pts,W,H,16)}" preserveAspectRatio="xMidYMid meet" style="display:block;width:100%">${html}</svg>`;
}

// ── B) DRILL L2 ──
function bDrillL2(cats,SHARED,W,body){
  const cat=cats.find(c=>c.id===_bl1); if(!cat){_bl1=null;return bDrillL1(cats,W,body);}
  const H=300, cx=W/2, cy=H/2+5, R=62;
  const _pts=[];
  let html='';
  const n=Math.max(cat.subs.length,1);
  cat.subs.forEach((sub,si)=>{
    const a=(si/n)*Math.PI*2-Math.PI/2;
    const subR=Math.max(20,Math.min(30,Math.round(18+(sub.val/cat.total)*38)));
    const dist=R+subR+12;
    const sx=Math.round(cx+Math.cos(a)*dist), sy=Math.round(cy+Math.sin(a)*dist);
    _pts.push({x:sx,y:sy,r:subR});
    const isS=SHARED.has(sub.name);
    const pct=Math.round(sub.val/cat.total*100);
    const tipTxt=`<b>${sub.name}</b><br>${fmtB(sub.val)} · ${pct} %<br><span style='color:${cat.color}'>${cat.name}</span>${isS?'<br>🔗 sdílená s více kat.':''}`;
    html+=`<line x1="${Math.round(cx+Math.cos(a)*R)}" y1="${Math.round(cy+Math.sin(a)*R)}" x2="${Math.round(sx-Math.cos(a)*subR*.6)}" y2="${Math.round(sy-Math.sin(a)*subR*.6)}" stroke="${cat.color}" stroke-width="1" stroke-dasharray="3 2" opacity=".4"/>`;
    if(isS){
      html+=`<circle cx="${sx}" cy="${sy}" r="${subR}" fill="${bRgba(cat.color,.2)}" stroke="${cat.color}" stroke-width="2" stroke-dasharray="4 2" style="cursor:pointer" onclick="bubbleDrillL3('${sub.name.replace(/'/g,"\\'")}','${cat.id}')" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
      html+=`<text x="${sx}" y="${sy-5}" text-anchor="middle" fill="${cat.color}" font-size="8" font-weight="700" pointer-events="none">${sub.name.slice(0,11)}</text>`;
      html+=`<text x="${sx}" y="${sy+6}" text-anchor="middle" fill="${bRgba(cat.color,.7)}" font-size="7" pointer-events="none">🔗 sdílené</text>`;
    } else {
      html+=`<circle cx="${sx}" cy="${sy}" r="${subR}" fill="${bRgba(cat.color,.13)}" stroke="${cat.color}" stroke-width="1.5" style="cursor:pointer" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
      html+=`<text x="${sx}" y="${sy}" text-anchor="middle" dominant-baseline="middle" fill="${cat.color}" font-size="8" pointer-events="none">${sub.name.slice(0,11)}</text>`;
    }
  });
  if(!cat.subs.length) html+=`<text x="${cx}" y="${cy+R+24}" text-anchor="middle" fill="rgba(255,255,255,.3)" font-size="9">Žádné podkategorie</text>`;
  html+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${bRgba(cat.color,.18)}" stroke="${cat.color}" stroke-width="2.5"/>`;
  html+=`<text x="${cx}" y="${cy-8}" text-anchor="middle" fill="${cat.color}" font-size="13" font-weight="700" pointer-events="none">${cat.name}</text>`;
  html+=`<text x="${cx}" y="${cy+10}" text-anchor="middle" fill="${bRgba(cat.color,.8)}" font-size="10" pointer-events="none">${fmtB(cat.total)}</text>`;
  const hint=cat.subs.some(s=>SHARED.has(s.name))?'<div style="font-size:.65rem;color:#a8aec8;margin-top:6px">🔗 přerušovaný okraj = sdílená, klikni pro detail</div>':'';
  body.innerHTML=`<div style="font-size:.72rem;color:var(--text3);margin-bottom:6px">📍 <span style="color:var(--bank);cursor:pointer" onclick="bubbleBack(0)">Kategorie</span> › <b style="color:${cat.color}">${cat.name}</b></div>
    <svg viewBox="${typeof _pts!=='undefined'?bViewBox(_pts,W,H,16):`0 0 ${W} ${H}`}" preserveAspectRatio="xMidYMid meet" style="display:block;width:100%">${html}</svg>${hint}`;
}

// ── B) DRILL L3 ──
function bDrillL3(cats,W,body){
  const subName=_bl2, prevCatId=_bl2prev;
  const entries=cats.filter(c=>c.subs.some(s=>s.name===subName)).map(c=>({cat:c,val:c.subs.find(s=>s.name===subName).val}));
  if(!entries.length){_bl2=null;return bDrillL2(cats,new Set(),W,body);}
  const H=340, cx=W/2, cy=H/2;
  const _pts=[];
  const tot=entries.reduce((s,e)=>s+e.val,0);
  const prevCat=cats.find(c=>c.id===prevCatId);
  let html='';
  entries.forEach((e,ci)=>{
    const a=(ci/entries.length)*Math.PI*2-Math.PI/2, dist=110, R=36;
    const px=Math.round(cx+Math.cos(a)*dist), py=Math.round(cy+Math.sin(a)*dist);
    const tipTxt=`<b>${e.cat.icon||''} ${e.cat.name}</b><br>${fmtB(e.val)} v této kat.<br><span style='color:var(--text3)'>Klikni pro detail</span>`;
    html+=`<line x1="${Math.round(cx+Math.cos(a)*42)}" y1="${Math.round(cy+Math.sin(a)*42)}" x2="${Math.round(px-Math.cos(a)*R*.7)}" y2="${Math.round(py-Math.sin(a)*R*.7)}" stroke="${e.cat.color}" stroke-width="1.5" stroke-dasharray="5 3" opacity=".45"/>`;
    html+=`<circle cx="${px}" cy="${py}" r="${R}" fill="${bRgba(e.cat.color,.18)}" stroke="${e.cat.color}" stroke-width="2" style="cursor:pointer" onclick="bubbleDrillL2('${e.cat.id}')" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
    html+=`<text x="${px}" y="${py-5}" text-anchor="middle" fill="${e.cat.color}" font-size="10" font-weight="700" pointer-events="none">${e.cat.name}</text>`;
    html+=`<text x="${px}" y="${py+8}" text-anchor="middle" fill="${bRgba(e.cat.color,.7)}" font-size="8" pointer-events="none">${fmtB(e.val)}</text>`;
  });
  html+=`<circle cx="${cx}" cy="${cy}" r="40" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.25)" stroke-width="2"/>`;
  html+=`<text x="${cx}" y="${cy-6}" text-anchor="middle" fill="white" font-size="11" font-weight="700" pointer-events="none">🔗 ${subName}</text>`;
  html+=`<text x="${cx}" y="${cy+8}" text-anchor="middle" fill="rgba(255,255,255,.65)" font-size="9" pointer-events="none">${fmt(tot)} celkem</text>`;
  body.innerHTML=`<div style="font-size:.72rem;color:var(--text3);margin-bottom:6px;display:flex;gap:4px;flex-wrap:wrap">📍 <span style="color:var(--bank);cursor:pointer" onclick="bubbleBack(0)">Kategorie</span> › <span style="color:var(--bank);cursor:pointer" onclick="bubbleBack(1)">${prevCat?.name||'Zpět'}</span> › <b style="color:#a8adc4">🔗 ${subName}</b></div>
    <svg viewBox="${typeof _pts!=='undefined'?bViewBox(_pts,W,H,16):`0 0 ${W} ${H}`}" preserveAspectRatio="xMidYMid meet" style="display:block;width:100%">${html}</svg>`;
}

// ── C) GRADIENT – sdílené na ose dole ──
function bGradient(cats,totalAll,subMap,W,body){
  const H=330, n=Math.min(cats.length,6);
  const _pts=[];

  // Pozice kategorií – kruh nahoře
  const catPos=cats.slice(0,n).map((cat,i)=>{
    const a=(i/n)*Math.PI*2-Math.PI/2;
    return {x:Math.round(W/2+Math.cos(a)*W*.29), y:Math.round(H*.44+Math.sin(a)*H*.26), cat};
  });

  // Sdílené subkategorie – sebrat všechny které jsou ve 2+ kategoriích
  const sharedArr=Object.entries(subMap).filter(([,arr])=>arr.length>=2).slice(0,5);
  if(!sharedArr.length){
    // Žádné sdílené – ukaž jen kategorie
    let defs='<defs>';
    cats.slice(0,n).forEach((c,i)=>defs+=`<radialGradient id="gg${i}" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="${c.color}" stop-opacity="0.28"/><stop offset="100%" stop-color="${c.color}" stop-opacity="0.06"/></radialGradient>`);
    defs+='</defs>';
    let html=defs;
    catPos.forEach((cp,i)=>{
      const tipTxt=`<b>${cp.cat.icon||''} ${cp.cat.name}</b><br>${fmtB(cp.cat.total)}<br><span style='color:${cp.cat.color}'>${Math.round(cp.cat.total/totalAll*100)} %</span>`;
      html+=`<circle cx="${cp.x}" cy="${cp.y}" r="36" fill="url(#gg${i})" stroke="${cp.cat.color}" stroke-width="2.5" style="cursor:pointer" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
      html+=`<text x="${cp.x}" y="${cp.y-6}" text-anchor="middle" fill="${cp.cat.color}" font-size="11" font-weight="700" pointer-events="none">${cp.cat.name}</text>`;
      html+=`<text x="${cp.x}" y="${cp.y+8}" text-anchor="middle" fill="${bRgba(cp.cat.color,.8)}" font-size="9" pointer-events="none">${(cp.cat.total/1000).toFixed(1)}k</text>`;
    });
    body.innerHTML=`<svg viewBox="${typeof _pts!=='undefined'?bViewBox(_pts,W,H,16):`0 0 ${W} ${H}`}" preserveAspectRatio="xMidYMid meet" style="display:block;width:100%">${html}</svg>
      <div style="font-size:.65rem;color:#a8aec8;margin-top:8px;text-align:center">Žádné sdílené podkategorie mezi kategoriemi<br>Sdílené (přes tagy/podkat. ve 2+ kategoriích) se zde zvýrazní gradientem barev.</div>`;
    return;
  }

  // Pozice sdílených na horizontální ose dole
  const axisY=H-30;
  const shPos=sharedArr.map(([name,arr],i)=>{
    const c1=arr[0].catColor, c2=arr[1].catColor;
    const total=arr.reduce((s,a)=>s+a.val,0);
    return {
      x:Math.round(W*(0.18+i*(0.64/(sharedArr.length-1||1)))),
      y:axisY, name, arr, color1:c1, color2:c2, total, i
    };
  });

  let defs='<defs>';
  cats.slice(0,n).forEach((c,i)=>{
    defs+=`<radialGradient id="gg${i}" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="${c.color}" stop-opacity="0.28"/><stop offset="100%" stop-color="${c.color}" stop-opacity="0.06"/></radialGradient>`;
  });
  shPos.forEach((sp,i)=>{
    defs+=`<linearGradient id="sg${i}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${sp.color1}"/><stop offset="100%" stop-color="${sp.color2}"/></linearGradient>`;
    defs+=`<radialGradient id="sgg${i}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${sp.color1}" stop-opacity="0.3"/><stop offset="100%" stop-color="${sp.color2}" stop-opacity="0"/></radialGradient>`;
  });
  defs+=`<linearGradient id="axisGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(255,255,255,0.03)"/><stop offset="50%" stop-color="rgba(255,255,255,0.18)"/><stop offset="100%" stop-color="rgba(255,255,255,0.03)"/></linearGradient>`;
  defs+=`<filter id="gglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

  let html=defs;
  const CR=36;

  // Osa SDÍLENÉ VÝDAJE
  html+=`<line x1="${W*.05}" y1="${axisY}" x2="${W*.95}" y2="${axisY}" stroke="url(#axisGrad)" stroke-width="6" stroke-linecap="round" opacity=".5"/>`;
  html+=`<line x1="${W*.05}" y1="${axisY}" x2="${W*.95}" y2="${axisY}" stroke="url(#axisGrad)" stroke-width="1.5" stroke-linecap="round"/>`;
  html+=`<text x="${W/2}" y="${axisY-13}" text-anchor="middle" fill="rgba(255,255,255,.22)" font-size="7" letter-spacing="2">SDÍLENÉ VÝDAJE</text>`;

  // Linky kategorie → sdílená
  shPos.forEach(sp=>{
    sp.arr.forEach(en=>{
      const cp=catPos.find(p=>p.cat.id===en.catId);if(!cp)return;
      const cat=cp.cat;
      const dx=cp.x-sp.x, dy=cp.y-sp.y, dist=Math.sqrt(dx*dx+dy*dy)||1;
      const ex=Math.round(sp.x+(dx/dist)*20), ey=Math.round(sp.y+(dy/dist)*20);
      const sx2=Math.round(cp.x-(dx/dist)*CR), sy2=Math.round(cp.y-(dy/dist)*CR);
      html+=`<line x1="${sx2}" y1="${sy2}" x2="${ex}" y2="${ey}" stroke="${cat.color}" stroke-width="1.5" stroke-dasharray="5 3" opacity=".4"/>`;
      html+=`<circle cx="${ex}" cy="${ey}" r="2.5" fill="${cat.color}" opacity=".65"/>`;
    });
  });

  // Kategorie bubliny
  // Session 10: sdílené subkat se zvýrazňují gradientem barev (linearGradient mezi
  // barvami obou kategorií) na ose dole; kategorie obsahující sdílenou subkat dostane 📎.
  const sharedNamesSet=new Set(sharedArr.map(([name])=>name));
  catPos.forEach((cp,i)=>{
    const hasShared=cp.cat.subs.some(s=>sharedNamesSet.has(s.name));
    const tipTxt=`<b>${cp.cat.icon||''} ${cp.cat.name}</b><br>${fmtB(cp.cat.total)}<br><span style='color:${cp.cat.color}'>${Math.round(cp.cat.total/totalAll*100)} %</span>${hasShared?'<br>📎 obsahuje sdílenou podkat.':''}`;
    html+=`<circle cx="${cp.x}" cy="${cp.y}" r="${CR}" fill="url(#gg${i})" stroke="${cp.cat.color}" stroke-width="2.5" style="cursor:pointer" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
    html+=`<text x="${cp.x}" y="${cp.y-6}" text-anchor="middle" fill="${cp.cat.color}" font-size="11" font-weight="700" pointer-events="none">${cp.cat.name}</text>`;
    html+=`<text x="${cp.x}" y="${cp.y+8}" text-anchor="middle" fill="${bRgba(cp.cat.color,.8)}" font-size="9" pointer-events="none">${(cp.cat.total/1000).toFixed(1)}k</text>`;
    if(hasShared) html+=`<text x="${cp.x+CR-8}" y="${cp.y-CR+12}" text-anchor="middle" font-size="11" pointer-events="none">📎</text>`;
  });

  // Sdílené bubliny na ose
  shPos.forEach(sp=>{
    const SR=20;
    const tipTxt=`<b>🔗 ${sp.name}</b><br>${fmtB(sp.total)}<br><span style='color:var(--text3)'>${sp.arr.map(a=>a.catName).join(' + ')}</span>`;
    html+=`<circle cx="${sp.x-SR}" cy="${sp.y}" r="3.5" fill="url(#sg${sp.i})" opacity=".8"/>`;
    html+=`<circle cx="${sp.x+SR}" cy="${sp.y}" r="3.5" fill="url(#sg${sp.i})" opacity=".8"/>`;
    html+=`<circle cx="${sp.x}" cy="${sp.y}" r="${SR+12}" fill="url(#sgg${sp.i})" pointer-events="none"/>`;
    html+=`<circle cx="${sp.x}" cy="${sp.y}" r="${SR}" fill="rgba(255,255,255,.05)" stroke="url(#sg${sp.i})" stroke-width="2.5" filter="url(#gglow)" style="cursor:pointer" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
    html+=`<circle cx="${sp.x}" cy="${sp.y}" r="${SR*.5}" fill="url(#sg${sp.i})" opacity=".22" pointer-events="none"/>`;
    html+=`<text x="${sp.x}" y="${sp.y-5}" text-anchor="middle" fill="white" font-size="7.5" font-weight="700" pointer-events="none">${sp.name.slice(0,9)}</text>`;
    html+=`<text x="${sp.x}" y="${sp.y+6}" text-anchor="middle" fill="rgba(255,255,255,.6)" font-size="7" pointer-events="none">${(sp.total/1000).toFixed(1)}k</text>`;
  });

  const legCats=cats.slice(0,n).map(c=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:.65rem;margin:1px 5px 1px 0"><span style="width:7px;height:7px;border-radius:50%;background:${c.color};display:inline-block"></span>${c.name}</span>`).join('');
  const legShared=shPos.map(sp=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:.65rem;margin:1px 5px 1px 0"><span style="width:16px;height:7px;border-radius:4px;background:linear-gradient(90deg,${sp.color1},${sp.color2});display:inline-block"></span>${sp.name}</span>`).join('');
  body.innerHTML=`<svg viewBox="${typeof _pts!=='undefined'?bViewBox(_pts,W,H,16):`0 0 ${W} ${H}`}" preserveAspectRatio="xMidYMid meet" style="display:block;width:100%">${html}</svg>
    <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:2px 10px">${legCats}${legShared}</div>`;
}

// Session 10: bTreemap() odebrána – Treemap je nyní samostatná karta v dashboardu
// (renderDashTreemap → #bubbleTreemapWrap). Záložka D v bublinovém grafu zrušena.


function renderBarChart(D){
  const canvas=document.getElementById('barCanvas');if(!canvas)return;
  let W=canvas.parentElement.getBoundingClientRect().width||canvas.parentElement.clientWidth||500;
  if(W<50)W=500;
  canvas.width=W;canvas.height=180;
  const H=180;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  const n=12;
  const data=[];
  // FIX-060 (Session 8): Graf zobrazuje LEDEN–PROSINEC AKTUÁLNÍHO ROKU (kalendářní rok),
  // ne rolling 12 měsíců zpět. Předchozí implementace zobrazovala např. Dub 2025–Bře 2026
  // při Březen 2026, což matelo uživatele. Pokud uživatel je v dřívějším měsíci roku,
  // budoucí měsíce zůstanou prázdné (žádné transakce) – to je správné chování.
  const year = S.curYear;
  for(let m=0;m<n;m++){
    const txs=getTx(m,year,D);
    data.push({label:CZ_M[m].slice(0,3),inc:incSum(txs),exp:expSum(txs)});
  }
  const rawMax = Math.max(...data.flatMap(d=>[d.inc,d.exp]).filter(v=>!isNaN(v)&&isFinite(v)), 1);
  const maxV = isNaN(rawMax) || rawMax <= 0 ? 1 : rawMax;
  const padL=48,padR=8,padT=14,padB=28;
  const cW=W-padL-padR;
  const cH=H-padT-padB;
  const gap=cW/n;
  const bw=Math.max(5,Math.floor(gap*0.38));

  // Y grid + labels
  ctx.setLineDash([3,4]);
  [0.25,0.5,0.75,1].forEach(f=>{
    const y2=padT+cH*(1-f);
    ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(padL,y2);ctx.lineTo(W-padR,y2);ctx.stroke();
    const v=maxV*f;
    ctx.fillStyle='rgba(139,144,168,.7)';ctx.font='9px Instrument Sans';ctx.textAlign='right';
    ctx.fillText(v>=1000?Math.round(v/1000)+'k':Math.round(v),padL-4,y2+3);
  });
  ctx.setLineDash([]);

  // Bars + X labels
  data.forEach((d,i)=>{
    const cx=padL+i*gap+gap/2;
    const x0=cx-bw-1;
    const x1=cx+1;
    const ih=Math.max(2,((d.inc||0)/maxV*cH)||0);
    const eh=Math.max(2,((d.exp||0)/maxV*cH)||0);

    // Příjmy (zelená)
    if(d.inc>0){
      ctx.fillStyle='rgba(74,222,128,.75)';
      ctx.beginPath();ctx.roundRect(x0,padT+cH-ih,bw,ih,[3,3,0,0]);ctx.fill();
    }
    // Výdaje (červená)
    if(d.exp>0){
      ctx.fillStyle='rgba(248,113,113,.75)';
      ctx.beginPath();ctx.roundRect(x1,padT+cH-eh,bw,eh,[3,3,0,0]);ctx.fill();
    }

    // X label – měsíc
    ctx.fillStyle='rgba(139,144,168,.8)';ctx.font='9px Instrument Sans';ctx.textAlign='center';
    ctx.fillText(d.label,cx,H-6);
  });

  // Legenda vpravo nahoře
  ctx.font='9px Instrument Sans';ctx.textAlign='left';
  ctx.fillStyle='rgba(74,222,128,.85)';ctx.fillRect(padL+4,padT+2,10,6);
  ctx.fillStyle='rgba(139,144,168,.8)';ctx.fillText('Příjmy',padL+16,padT+8);
  ctx.fillStyle='rgba(248,113,113,.85)';ctx.fillRect(padL+68,padT+2,10,6);
  ctx.fillStyle='rgba(139,144,168,.8)';ctx.fillText('Výdaje',padL+80,padT+8);
}

// ══════════════════════════════════════════════════════
//  SOUHRN
// ══════════════════════════════════════════════════════
// S16.13 (Milan): tabulku souhrnu lze vykreslit do libovolného kontejneru
//   → používá stránka „Souhrn výdajů" i „Měsíční report" (kam patří obsahově).
//  v9.65 (FIX-239): buňka sloupce „Změna".
//  Dřív: když v minulém měsíci nebyla data, ukázala se jen pomlčka – i u výdaje
//  za 20 000 Kč. Nyní se v takovém případě zobrazí ČÁSTKA (+20 000), protože
//  procenta z nuly spočítat nejde, ale informace je důležitá.
//  Barvy podle velikosti změny, ne jen podle znaménka:
//  zelená = pokles · modrá = beze změny · žlutá = mírný růst · červená = výrazný růst
function _pctCell(pct, cur, prev){
  if(pct===null || pct===undefined){
    if(!prev && cur>0) return `<span class="pct-pill pct-up" title="V minulém období bez výdaje – procenta nelze spočítat">+${fmt(Math.round(cur))}</span>`;
    return '–';
  }
  const cls = pct <= -5 ? 'pct-dn' : pct < 5 ? 'pct-neu' : 'pct-up';
  const col = pct <= -5 ? 'var(--income)' : pct < 5 ? '#60a5fa' : pct < 30 ? 'var(--debt)' : 'var(--expense)';
  return `<span class="pct-pill ${cls}" style="color:${col}">${pct>0?'+':''}${pct}%</span>`;
}

//  v9.67: druhý parametr `opts` zapíná REPORTOVÝ režim (řazení podle útraty,
//  podbarvení, sbalení málo významných řádků). Bez něj se funkce chová PŘESNĚ
//  jako dosud – záložka „Souhrn výdajů" v BETA sekci zůstává nedotčená.
let _souhrnExpanded = false;
function souhrnToggleRest(){ _souhrnExpanded = !_souhrnExpanded;
  if(typeof renderReport==='function') renderReport(); }
function renderSouhrnInto(targetId, opts){
  const el=document.getElementById(targetId); if(!el) return;
  const prevTarget=window._suhrnTarget; window._suhrnTarget=targetId;
  //  v9.67: režim se předává přes globální příznak, protože renderSouhrn()
  //  volá i UI záložka BETA (bez parametrů) – ta má zůstat beze změny.
  const prevRep=window._suhrnReport; window._suhrnReport=!!(opts&&opts.report);
  try{ renderSouhrn(true); } finally { window._suhrnTarget=prevTarget; window._suhrnReport=prevRep; }
}

function renderSouhrn(tableOnly){
  const _rep = !!window._suhrnReport;
  const D=getData();
  const mEl=document.getElementById('suhrnMonth');
  if(mEl) mEl.textContent=`${CZ_M[S.curMonth]} ${S.curYear}`;
  let pm=S.curMonth-1,py=S.curYear;if(pm<0){pm=11;py--;}
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  // FIX-076 (Session 8): totalCur/totalPrev zahrnují VŠECHNY výdajové transakce (včetně nekategorizovaných).
  // Původně se počítalo jen přes getActual() per kategorie → transakce bez catId (PDF import) chyběly.
  const allExpTxs = m => (D.transactions||[]).filter(t=>{
    if(t.type!=='expense'||t.isBalancing||t.splitParent) return false;
    if(typeof isTransferTx==='function' && isTransferTx(t)) return false;  // S16.13: přesuny nejsou výdaj
    const d=new Date(t.date);
    return d.getMonth()===m[0]&&d.getFullYear()===m[1];
  }).reduce((a,t)=>a+txCZK(t,D),0);  // S16.13: txCZK (cizí měny) místo raw amount
  const totalCur=allExpTxs([S.curMonth,S.curYear]);
  const totalPrev=allExpTxs([pm,py]);
  const el=document.getElementById(window._suhrnTarget||'suhrnTable');if(!el)return;
  // S16.13 (Milan): + sloupec PREDIKCE (očekávaný výdaj dle historie a sezónnosti)
  const pred = (cid,sub)=> (typeof predictCat==='function') ? Math.round(predictCat(cid,sub,S.curMonth,S.curYear,D)||0) : 0;
  const predCell = (p2,cur)=>{
    if(!p2) return '<td style="color:#5a6078">–</td>';
    const d2 = cur>0 ? Math.round((cur-p2)/p2*100) : null;
    const col = d2===null?'#a8aec8':d2>10?'var(--expense)':d2<-10?'var(--income)':'#a8aec8';
    return `<td style="color:#a8aec8" title="Očekávaný výdaj dle historie">${fmt(p2)}${d2!==null?`<br><span style="font-size:.68rem;font-weight:700;color:${col}">${d2>0?'+':''}${d2} %</span>`:''}</td>`;
  };
  let totalPred=0;
  //  v9.68: na mobilu se šest sloupců nevejde a tabulka se rozlítá. Obalíme ji
  //  vodorovným posuvníkem a prvnímu sloupci dáme pevnou šířku + sticky, aby
  //  bylo při posouvání pořád vidět, o kterou kategorii jde.
  let html=`<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
    <table class="stat-table souhrn-table" style="min-width:640px;width:100%">
    <thead><tr><th style="position:sticky;left:0;background:var(--surface2);z-index:2;min-width:132px">Kategorie</th><th>Minulý měsíc</th><th>Tento měsíc</th><th>🔮 Predikce</th><th>Změna</th><th>Podíl</th></tr></thead><tbody>`;  // S16.14 (Milan): minulý PRVNÍ (čtení zleva doprava v čase)
  //  v9.67 (report): seřadit od největší letošní útraty. V BETA záložce zůstává
  //  původní pořadí podle číselníku kategorií.
  const _list = _rep
    ? expCats.slice().sort((a,b)=>getActual(b.id,null,S.curMonth,S.curYear,D)-getActual(a.id,null,S.curMonth,S.curYear,D))
    : expCats;
  //  Významné = tvoří aspoň 3 % výdajů nebo se výrazně pohnuly. Zbytek se sbalí.
  let _shown=0, _hidden=0;
  _list.forEach(cat=>{
    const cur=getActual(cat.id,null,S.curMonth,S.curYear,D);
    const prev=getActual(cat.id,null,pm,py,D);
    if(!cur&&!prev)return;
    const pct=prev>0?Math.round((cur-prev)/prev*100):null;
    const pctCelku=totalCur>0?Math.round(cur/totalCur*100):0;
    const pc=pred(cat.id,null); totalPred+=pc;
    //  v9.67 (report): podbarvení řádku podle závažnosti změny
    const _bg = !_rep ? '' :
      (pct!==null && pct>30) ? 'background:rgba(248,113,113,.08);' :
      (pct!==null && pct>5)  ? 'background:rgba(251,191,36,.06);' :
      (pct!==null && pct<-5) ? 'background:rgba(74,222,128,.05);' : '';
    //  v9.67 (report): drobné položky schovat pod tlačítko
    if(_rep && !_souhrnExpanded){
      const share = totalCur>0 ? cur/totalCur : 0;
      const moved = pct!==null && Math.abs(pct)>25;
      if(share<0.03 && !moved && _shown>=6){ _hidden++; return; }
      _shown++;
    }
    html+=`<tr style="${_bg}"><td style="position:sticky;left:0;background:${_bg?'var(--surface2)':'var(--surface)'};z-index:1;white-space:nowrap"><span style="margin-right:5px">${cat.icon}</span>${cat.name}</td><td style="color:#a8aec8">${prev?fmt(prev):'–'}</td><td>${cur?fmt(cur):'–'}</td>${predCell(pc,cur)}<td>${_pctCell(pct,cur,prev)}</td><td>${pctCelku}%</td></tr>`;
    (cat.subs||[]).forEach(sub=>{
      const sc=getActual(cat.id,sub,S.curMonth,S.curYear,D);const sp=getActual(cat.id,sub,pm,py,D);
      if(!sc&&!sp)return;
      const spct=sp>0?Math.round((sc-sp)/sp*100):null;
      const sPc=pred(cat.id,sub);
      html+=`<tr style="font-size:.78rem;color:var(--text2)"><td style="padding-left:20px">↳ ${sub}</td><td style="color:#a8aec8">${sp?fmt(sp):'–'}</td><td>${sc?fmt(sc):'–'}</td>${predCell(sPc,sc)}<td>${_pctCell(spct,sc,sp)}</td><td></td></tr>`;
    });
  });
  const totPredDiff = totalPred>0 ? Math.round((totalCur-totalPred)/totalPred*100) : null;
  html+=`<tr style="font-weight:700;border-top:2px solid var(--border2)"><td>💰 CELKEM VÝDAJE</td><td style="color:#a8aec8">${fmt(totalPrev)}</td><td style="color:var(--expense)">${fmt(totalCur)}</td><td style="color:#a8aec8">${totalPred?fmt(totalPred):'–'}${totPredDiff!==null?`<br><span style="font-size:.68rem;color:${totPredDiff>10?'var(--expense)':totPredDiff<-10?'var(--income)':'#a8aec8'}">${totPredDiff>0?'+':''}${totPredDiff} %</span>`:''}</td><td>${totalPrev>0?`<span class="pct-pill ${totalCur>totalPrev?'pct-up':'pct-dn'}">${totalCur>=totalPrev?'+':''}${Math.round((totalCur-totalPrev)/totalPrev*100)}%</span>`:'–'}</td><td>100%</td></tr>`;
  html+=`</tbody></table></div>`;
  //  v9.67 (report): tlačítko pro rozbalení schovaných drobností
  if(_rep && (_hidden>0 || _souhrnExpanded)){
    html+=`<div style="text-align:center;margin-top:8px">
      <button onclick="souhrnToggleRest()" style="padding:6px 14px;border-radius:9px;cursor:pointer;font-size:.76rem;font-weight:700;font-family:inherit;border:1px solid var(--border);background:var(--surface2);color:#a8aec8">
        ${_souhrnExpanded ? '▲ Skrýt drobné položky' : `▼ Zobrazit dalších ${_hidden} ${_hidden===1?'kategorii':_hidden<5?'kategorie':'kategorií'}`}
      </button></div>`;
  }
  html+=`<div style="font-size:.72rem;color:#a8aec8;margin-top:8px">🔮 <strong>Predikce</strong> = očekávaný výdaj tohoto měsíce dle tvé historie a sezónnosti (stejný model jako v Předpovědi). Procento pod ní = o kolik jsi nad/pod očekáváním.</div>`;
  el.innerHTML=html;
  // S16.15 (Milan): slovní vyhodnocení (co se povedlo/nepovedlo) i v Měsíčním reportu
  renderSuhrnReport(expCats,totalCur,totalPrev,pm,py,D, tableOnly?'reportSuhrnInsights':'suhrnReport');
}

function renderSuhrnReport(expCats,totalCur,totalPrev,pm,py,D,targetId){
  const rEl=document.getElementById(targetId||'suhrnReport');if(!rEl)return;
  //  v9.65: bez minulého měsíce sice nejde spočítat procenta, ale výdaje
  //  aktuálního měsíce se ukázat mají – dřív se celá karta tiše schovala.
  if(!totalPrev && !totalCur){rEl.innerHTML='';return;}
  const totalDiff=totalPrev?Math.round((totalCur-totalPrev)/totalPrev*100):null;
  const totalSaved=totalPrev-totalCur;
  const good=[],bad=[],ok=[];
  expCats.forEach(cat=>{
    const cur=getActual(cat.id,null,S.curMonth,S.curYear,D);
    const prev=getActual(cat.id,null,pm,py,D);
    if(!cur&&!prev)return;
    //  v9.65 (FIX-238): dřív tu stálo `||!prev`, takže kategorie BEZ VÝDAJE
    //  V MINULÉM MĚSÍCI vypadla úplně. Výdaj 20 000 Kč za jídlo se tak neobjevil
    //  ani v „co se nepovedlo" – přitom je to ten největší nárůst vůbec.
    //  Nyní: bez loňské základny nelze počítat procenta, ale částka je platná.
    if(!prev){
      if(cur>0) bad.push({name:cat.name,icon:cat.icon,pct:null,cur,prev:0,over:cur,isNew:true});
      return;
    }
    const pct=Math.round((cur-prev)/prev*100);
    if(pct<-5)good.push({name:cat.name,icon:cat.icon,pct,cur,prev,saved:prev-cur});
    else if(pct>5)bad.push({name:cat.name,icon:cat.icon,pct,cur,prev,over:cur-prev});
    else ok.push({name:cat.name,icon:cat.icon,pct});
  });
  bad.sort((a,b)=>b.over-a.over);good.sort((a,b)=>b.saved-a.saved);
  let html=`<div class="card" style="border-left:4px solid ${totalDiff===null?'var(--bank)':totalDiff<=-5?'var(--income)':totalDiff>5?'var(--expense)':'var(--debt)'}">
    <div class="card-header" style="background:${totalDiff===null?'transparent':totalDiff<=-5?'var(--income-bg)':totalDiff>5?'var(--expense-bg)':'var(--debt-bg)'}">
      <span class="card-title">${totalDiff===null?'📊 Přehled měsíce':totalDiff<=-5?'✅ Skvělý výsledek!':totalDiff>5?'⚠️ Výdaje vzrostly':'✔️ Výdaje stabilní'} – ${CZ_M[S.curMonth]} ${S.curYear}</span>
      <span style="font-weight:700;color:${totalDiff<=0?'var(--income)':totalDiff<=5?'var(--debt)':'var(--expense)'}">${totalDiff>0?'+':''}${totalDiff}% vs ${CZ_M[pm]}</span>
    </div>
    <div class="card-body">`;
  if(totalDiff<=-5)html+=`<div class="insight-item good"><div class="insight-icon">🎉</div><div class="insight-text">Celkové výdaje klesly o <strong>${Math.abs(totalDiff)}%</strong> – ušetřeno <strong>${fmt(Math.abs(totalSaved))}</strong> oproti ${CZ_M[pm]}.</div></div>`;
  else if(totalDiff<=5)html+=`<div class="insight-item warn"><div class="insight-icon">↔️</div><div class="insight-text"><strong>Výdaje stabilní.</strong> Odchylka ${totalDiff>0?'+':''}${totalDiff}% – v pásmu ±5%.</div></div>`;
  else html+=`<div class="insight-item bad"><div class="insight-icon">📈</div><div class="insight-text"><strong>Výdaje vzrostly o ${totalDiff}%</strong> (+${fmt(totalCur-totalPrev)} oproti ${CZ_M[pm]}).</div></div>`;
  // S17 (Milan): kompaktní grid místo celořádkových karet – 1 kategorie = malá dlaždice,
  //   2-4 vedle sebe dle šířky. Řádek 1: ikona + název + %, řádek 2: částky menším písmem.
  const tile=(x,goodTile)=>{
    const accCol=goodTile?'var(--income)':'var(--expense)';
    const accBg=goodTile?'var(--income-bg)':'var(--expense-bg)';
    const brd=goodTile?'rgba(74,222,128,.28)':'rgba(248,113,113,.28)';
    //  v9.68 (FIX-242): kategorie bez výdaje v minulém měsíci má pct null –
    //  dřív se vypsalo „+null%". Procenta z nuly spočítat nejde, takže se
    //  místo nich ukáže „nové".
    const pctTxt = (x.pct===null||x.pct===undefined) ? 'nové'
                 : goodTile ? `−${Math.abs(x.pct)}%` : `+${x.pct}%`;
    const amtTxt = goodTile
      ? `ušetřeno <strong style="color:${accCol}">${fmt(x.saved)}</strong>`
      : (x.isNew ? `<strong style="color:${accCol}">${fmt(x.over)}</strong> – minulý měsíc nic`
                 : `navíc <strong style="color:${accCol}">${fmt(x.over)}</strong>`);
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;background:${accBg};border:1px solid ${brd};min-width:0">
      <span style="font-size:1.05rem;flex-shrink:0">${x.icon}</span>
      <div style="min-width:0;flex:1">
        <div style="display:flex;justify-content:space-between;gap:6px;align-items:baseline">
          <strong style="font-size:.82rem;color:#dfe3f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${x.name}</strong>
          <span style="font-weight:800;color:${accCol};font-size:.82rem;white-space:nowrap">${pctTxt}</span>
        </div>
        <div style="font-size:.72rem;color:#a8aec8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${amtTxt} · ${fmt(x.cur)} vs ${fmt(x.prev)}</div>
      </div>
    </div>`;
  };
  if(good.length){
    html+=`<div style="margin-top:12px;margin-bottom:6px;font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--income)">✅ Co se povedlo (výdaje nižší o &gt;5%)</div>`;
    html+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:8px">${good.map(g=>tile(g,true)).join('')}</div>`;
  }
  if(bad.length){
    html+=`<div style="margin-top:12px;margin-bottom:6px;font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--expense)">❌ Co se nepovedlo (výdaje vyšší o &gt;5%)</div>`;
    html+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:8px">${bad.map(b=>tile(b,false)).join('')}</div>`;
  }
  if(ok.length){
    html+=`<div style="margin-top:12px;margin-bottom:5px;font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text3)">✔️ Splnilo očekávání (±5%)</div>`;
    html+=`<div style="display:flex;flex-wrap:wrap;gap:6px">`;
    ok.forEach(o=>html+=`<div style="padding:4px 10px;border-radius:6px;background:var(--surface3);font-size:.78rem;color:var(--text2)">${o.icon} ${o.name} <span style="color:var(--text3)">${o.pct>0?'+':''}${o.pct}%</span></div>`);
    html+=`</div>`;
  }
  html+=`</div></div>`;
  rEl.innerHTML=html;
}

// ══════════════════════════════════════════════════════
//  TRANSAKCE
// ══════════════════════════════════════════════════════
let _txTypeFilter = 'all';
let _txSort = 'date';
let _txSortDir = 'desc';

// ══════════════════════════════════════════════════════════════════════
//  S21 (Milan): TABULKA – SOUHRN MĚSÍC PO MĚSÍCI
//  Seznam transakcí ukazuje vždycky jen jeden měsíc, takže odpověď na otázku
//  „kolik toho vlastně zapisuju a jak to šlo v čase?\" v appce nebyla nikde.
//  Tabulka jde napříč VŠEMI daty, ne jen aktuálním měsícem.
//
//  Počítá se přes txCZK (cizí měny) a bez přesunů, splitů a vyrovnání –
//  stejná pravidla jako souhrnný odznak nad seznamem, ať si čísla nesedí
//  jenom náhodou (SKILL: agregace jednou, ne dvakrát různě).
//  Sloupec „Záznamů\" ale počítá VŠECHNY transakce včetně přesunů, protože
//  odpovídá na jinou otázku: kolik jsem toho zapsal, ne kolik jsem protočil.
// ══════════════════════════════════════════════════════════════════════
let _txTableOpen = false;
let _txTableDir = 'desc';          // desc = nejnovější měsíc nahoře

function txMonthlySummary(D){
  const _statTx = t => !isTransferTx(t) && !t.splitParent && !t.isBalancing;
  const mapa = new Map();
  (D.transactions||[]).forEach(t=>{
    if(!t || !t.date) return;
    const d = new Date(t.date);
    if(isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
    let r = mapa.get(key);
    if(!r){ r = {y:d.getFullYear(), m:d.getMonth(), n:0, inc:0, exp:0}; mapa.set(key,r); }
    r.n++;
    if(!_statTx(t)) return;
    if(t.type==='income')  r.inc += txCZK(t,D);
    if(t.type==='expense') r.exp += txCZK(t,D);
  });
  return [...mapa.values()];
}

function toggleTxTable(btn){
  _txTableOpen = !_txTableOpen;
  if(btn) btn.classList.toggle('active', _txTableOpen);
  renderTxMonthTable();
}
function setTxTableDir(){
  _txTableDir = _txTableDir === 'desc' ? 'asc' : 'desc';
  renderTxMonthTable();
}

function renderTxMonthTable(){
  const box = document.getElementById('txMonthTable');
  const head = document.getElementById('txTableHead');
  const list = document.getElementById('txList');
  if(!box) return;
  box.style.display = _txTableOpen ? 'block' : 'none';
  if(head) head.style.display = _txTableOpen ? 'none' : '';
  if(list) list.style.display = _txTableOpen ? 'none' : '';
  if(!_txTableOpen){ box.innerHTML=''; return; }

  const D = getData();
  const rows = txMonthlySummary(D);
  if(!rows.length){
    box.innerHTML = '<div class="empty" style="padding:32px"><div class="ei">📭</div><div class="et">Zatím žádné transakce</div></div>';
    return;
  }
  rows.sort((a,b)=> _txTableDir==='desc'
    ? (b.y-a.y) || (b.m-a.m)
    : (a.y-b.y) || (a.m-b.m));

  const celkemN   = rows.reduce((a,r)=>a+r.n,0);
  const celkemInc = rows.reduce((a,r)=>a+r.inc,0);
  const celkemExp = rows.reduce((a,r)=>a+r.exp,0);
  const prumerN   = Math.round(celkemN/rows.length*10)/10;
  const maxN      = Math.max(...rows.map(r=>r.n), 1);

  const bunka = (obsah, styl='') =>
    `<div style="padding:8px 10px;font-size:.78rem;${styl}">${obsah}</div>`;

  box.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
      <div style="flex:1;min-width:120px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px">
        <div style="font-size:.68rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.05em">Celkem záznamů</div>
        <div style="font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800">${celkemN}</div>
      </div>
      <div style="flex:1;min-width:120px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px">
        <div style="font-size:.68rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.05em">Měsíců s daty</div>
        <div style="font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800">${rows.length}</div>
      </div>
      <div style="flex:1;min-width:120px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px">
        <div style="font-size:.68rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.05em">Průměr / měsíc</div>
        <div style="font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800">${String(prumerN).replace('.',',')}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:minmax(96px,1.3fr) minmax(70px,1fr) minmax(84px,1fr) minmax(84px,1fr) minmax(84px,1fr);
                background:var(--surface2);border-radius:9px 9px 0 0;border:1px solid var(--border);border-bottom:none;font-weight:700;font-size:.72rem;color:#c9cede">
      ${bunka(`<span onclick="setTxTableDir()" style="cursor:pointer;user-select:none" title="Přepnout řazení">📅 Měsíc ${_txTableDir==='desc'?'↓':'↑'}</span>`)}
      ${bunka('Záznamů', 'text-align:right')}
      ${bunka('Příjmy', 'text-align:right')}
      ${bunka('Výdaje', 'text-align:right')}
      ${bunka('Saldo', 'text-align:right')}
    </div>
    <div style="border:1px solid var(--border);border-radius:0 0 9px 9px;overflow:hidden">
      ${rows.map((r,i)=>{
        const saldo = r.inc - r.exp;
        const podil = Math.round(r.n/maxN*100);
        return `<div style="display:grid;grid-template-columns:minmax(96px,1.3fr) minmax(70px,1fr) minmax(84px,1fr) minmax(84px,1fr) minmax(84px,1fr);
                     align-items:center;background:${i%2?'transparent':'rgba(255,255,255,.02)'}">
          ${bunka(`<span style="font-weight:600">${CZ_M[r.m]} ${r.y}</span>`)}
          ${bunka(`<span style="display:inline-block;min-width:26px;text-align:right;font-weight:700">${r.n}</span>
                   <span style="display:inline-block;width:${Math.max(3,podil*0.34)}px;height:5px;border-radius:3px;background:#60a5fa;margin-left:6px;vertical-align:middle"
                         title="${r.n} z nejsilnějšího měsíce (${maxN})"></span>`, 'text-align:right')}
          ${bunka(`<span style="color:var(--income)">${r.inc?fmtB(r.inc):'—'}</span>`, 'text-align:right')}
          ${bunka(`<span style="color:var(--expense)">${r.exp?fmtB(r.exp):'—'}</span>`, 'text-align:right')}
          ${bunka(`<span style="font-weight:700;color:${saldo>=0?'var(--income)':'var(--expense)'}">${fmtB(saldo)}</span>`, 'text-align:right')}
        </div>`;
      }).join('')}
      <div style="display:grid;grid-template-columns:minmax(96px,1.3fr) minmax(70px,1fr) minmax(84px,1fr) minmax(84px,1fr) minmax(84px,1fr);
                  align-items:center;background:var(--surface2);border-top:1px solid var(--border);font-weight:700">
        ${bunka('Celkem')}
        ${bunka(String(celkemN), 'text-align:right')}
        ${bunka(`<span style="color:var(--income)">${fmtB(celkemInc)}</span>`, 'text-align:right')}
        ${bunka(`<span style="color:var(--expense)">${fmtB(celkemExp)}</span>`, 'text-align:right')}
        ${bunka(`<span style="color:${celkemInc-celkemExp>=0?'var(--income)':'var(--expense)'}">${fmtB(celkemInc-celkemExp)}</span>`, 'text-align:right')}
      </div>
    </div>
    <div style="font-size:.7rem;color:#a8aec8;margin-top:8px;line-height:1.5">
      Jde napříč všemi daty, ne jen zobrazeným měsícem. Příjmy a výdaje jsou bez přesunů,
      rozpadů a vyrovnání; sloupec <strong>Záznamů</strong> naopak počítá všechno, co jsi zapsal.
    </div>`;
}
window.toggleTxTable = toggleTxTable;
window.setTxTableDir = setTxTableDir;
window.txMonthlySummary = txMonthlySummary;

function setTxTypeFilter(type, btn) {
  _txTypeFilter = type;
  document.querySelectorAll('.tx-filt-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  if(_txTableOpen){ _txTableOpen = false; renderTxMonthTable(); }   // S21: filtr typu se seznamu, ne tabulky
  renderTx();
}

function setTxSort(col) {
  if(_txSort === col) { _txSortDir = _txSortDir === 'desc' ? 'asc' : 'desc'; }
  else { _txSort = col; _txSortDir = col === 'amt' ? 'desc' : 'asc'; }
  document.querySelectorAll('.tx-sort-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('sort-'+col);
  if(btn) btn.classList.add('active');
  // Update arrows
  ['date','cat','sub','name','project','amt'].forEach(c => {
    const a = document.getElementById('sort-'+c+'-arrow');
    if(a) a.textContent = '';
  });
  const arrow = document.getElementById('sort-'+col+'-arrow');
  if(arrow) arrow.textContent = _txSortDir === 'desc' ? ' ↓' : ' ↑';
  renderTx();
}

// ───── 📅 Filtr období (multi-měsíc / napříč roky) — jen pro Transakce ─────
let _txDateFilter = { active:false, year:'all', months:new Set() };
const _CZ_MON_SHORT = ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];
function _txDatePass(dateStr){
  if(!_txDateFilter.active) return true;
  const d = new Date(dateStr); if(isNaN(d)) return false;
  if(_txDateFilter.year !== 'all' && d.getFullYear() !== _txDateFilter.year) return false;
  if(_txDateFilter.months.size && !_txDateFilter.months.has(d.getMonth())) return false;
  return true;
}
function toggleTxDateFilter(){
  const p = document.getElementById('txDatePanel'); if(!p) return;
  if(p.style.display === 'none' || !p.style.display){ buildTxDatePanel(); p.style.display='block'; }
  else p.style.display='none';
}
function buildTxDatePanel(){
  const D = getData();
  const years = [...new Set((D.transactions||[]).filter(t=>!t.splitParent).map(t=>new Date(t.date).getFullYear()).filter(y=>y>2000&&y<2100))].sort((a,b)=>b-a);
  if(!years.includes(S.curYear)) years.unshift(S.curYear);
  const ySel = document.getElementById('txDateYear');
  if(ySel){
    const cur = _txDateFilter.active ? _txDateFilter.year : S.curYear;
    ySel.innerHTML = '<option value="all">📆 Všechny roky</option>' + years.map(y=>'<option value="'+y+'"'+(String(cur)===String(y)?' selected':'')+'>'+y+'</option>').join('');
  }
  const mc = document.getElementById('txDateMonths');
  if(mc){
    const checked = _txDateFilter.active ? _txDateFilter.months : new Set([S.curMonth]);
    mc.innerHTML = _CZ_MON_SHORT.map((m,i)=>'<label style="display:flex;align-items:center;gap:5px;font-size:.76rem;color:var(--text2);cursor:pointer;padding:5px 6px;border:1px solid var(--border);border-radius:7px"><input type="checkbox" class="txDateMonthCb" value="'+i+'"'+(checked.has(i)?' checked':'')+' style="cursor:pointer;width:15px;height:15px">'+m+'</label>').join('');
  }
}
function txDateMonthsAll(on){ document.querySelectorAll('.txDateMonthCb').forEach(cb=>{cb.checked=on;}); }
function applyTxDateFilter(){
  const ySel = document.getElementById('txDateYear');
  const year = (ySel && ySel.value!=='all') ? parseInt(ySel.value,10) : 'all';
  const months = new Set([...document.querySelectorAll('.txDateMonthCb:checked')].map(cb=>parseInt(cb.value,10)));
  _txDateFilter = { active:true, year, months };
  const p = document.getElementById('txDatePanel'); if(p) p.style.display='none';
  updateTxDateChip();
  renderTx();
}
function clearTxDateFilter(){
  _txDateFilter = { active:false, year:'all', months:new Set() };
  const p = document.getElementById('txDatePanel'); if(p) p.style.display='none';
  updateTxDateChip();
  renderTx();
}
function updateTxDateChip(){
  const lbl = document.getElementById('txMonthLabel');
  const chip = document.getElementById('txDateChip');
  const btn = document.getElementById('filt-date');
  if(!_txDateFilter.active){
    if(lbl && typeof CZ_M!=='undefined') lbl.textContent = CZ_M[S.curMonth]+' '+S.curYear;
    if(chip) chip.innerHTML='';
    if(btn) btn.classList.remove('active');
    return;
  }
  if(btn) btn.classList.add('active');
  if(lbl) lbl.textContent = '';
  const ms = [..._txDateFilter.months].sort((a,b)=>a-b);
  const mLabel = (ms.length===0 || ms.length===12) ? 'celý rok' : ms.map(i=>_CZ_MON_SHORT[i]).join(', ');
  const yLabel = _txDateFilter.year==='all' ? 'všechny roky' : _txDateFilter.year;
  if(chip) chip.innerHTML = '<span style="display:inline-flex;align-items:center;gap:7px;background:rgba(74,222,128,.15);color:var(--income);padding:3px 10px;border-radius:12px;font-size:.74rem;font-weight:600">📅 '+mLabel+' · '+yLabel+' <span onclick="clearTxDateFilter()" style="cursor:pointer;font-weight:800" title="Zrušit filtr">✕</span></span>';
}
window.toggleTxDateFilter=toggleTxDateFilter; window.applyTxDateFilter=applyTxDateFilter; window.clearTxDateFilter=clearTxDateFilter; window.txDateMonthsAll=txDateMonthsAll;

// ── Swipe-to-edit pro účtenkové karty (mobil) – registruje se jednou ──
(function(){
  if (window._txSwipeInit) return; window._txSwipeInit = true;
  const OPEN = -84, THRESH = -36;
  let el=null, x0=0, y0=0, dx=0, openEl=null;
  function reset(e){ if(e){ e.style.transition='transform .2s'; e.style.transform='translateX(0)'; } }
  document.addEventListener('touchstart', function(ev){
    const fg = ev.target.closest && ev.target.closest('.tx-swipe-fg[data-swipe="1"]');
    if (openEl && openEl!==fg) { reset(openEl); openEl=null; }
    if (!fg) return;
    el=fg; x0=ev.touches[0].clientX; y0=ev.touches[0].clientY; dx=0;
    fg.style.transition='none';
  }, {passive:true});
  document.addEventListener('touchmove', function(ev){
    if(!el) return;
    const cx=ev.touches[0].clientX, cy=ev.touches[0].clientY;
    if(Math.abs(cy-y0) > Math.abs(cx-x0)) return; // vertikální scroll – neotáčet
    dx = cx - x0;
    el.style.transform = 'translateX(' + Math.min(0, Math.max(OPEN, dx)) + 'px)';
  }, {passive:true});
  document.addEventListener('touchend', function(){
    if(!el) return;
    el.style.transition='transform .2s';
    if(dx < THRESH){ el.style.transform='translateX('+OPEN+'px)'; openEl=el; }
    else { el.style.transform='translateX(0)'; if(openEl===el) openEl=null; }
    el=null;
  }, {passive:true});
})();

function renderTxPage(){
  const D = getData();
  document.getElementById('txMonthLabel').textContent = `${CZ_M[S.curMonth]} ${S.curYear}`;
  if(typeof updateTxDateChip === 'function') updateTxDateChip();
  // S16.14 (FIX-204, Milan): přestavba <option> resetovala .value → filtr se ztratil při
  //   každém přepnutí měsíce (a návratu na stránku). Nyní hodnoty zachytíme a VRÁTÍME.
  const _keep = id => document.getElementById(id)?.value || '';
  const _restore = (sel,val)=>{ if(sel && val && [...sel.options].some(o=>o.value===val)) sel.value=val; };
  const kCat=_keep('txCatFilter'), kSub=_keep('txSubFilter'), kProj=_keep('txProjectFilter'),
        kWal=_keep('txWalletFilter'), kPay=_keep('txPayTypeFilter');

  const buildSubs = (catId)=>{
    const cat=(D.categories||[]).find(c=>c.id===catId);
    return '<option value="">📁 Podkategorie: Vše</option>' +
      (cat?.subs||[]).map(s2=>`<option value="${s2}">${s2}</option>`).join('');
  };
  const catSel = document.getElementById('txCatFilter');
  if(catSel) {
    catSel.innerHTML = '<option value="">📂 Kategorie: Vše</option>' +
      (D.categories||[]).map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    _restore(catSel,kCat);
    catSel.onchange = () => {
      const subSel = document.getElementById('txSubFilter');
      if(subSel) subSel.innerHTML = buildSubs(catSel.value);
      renderTx();
    };
  }
  const subSel0 = document.getElementById('txSubFilter');
  if(subSel0){ subSel0.innerHTML = buildSubs(kCat); _restore(subSel0,kSub); }
  const projSel = document.getElementById('txProjectFilter');
  if(projSel){ projSel.innerHTML = '<option value="">📋 Projekt: Vše</option>' +
    (D.projects||[]).map(p=>`<option value="${p.id}">📁 ${p.name}</option>`).join(''); _restore(projSel,kProj); }
  const walletSel = document.getElementById('txWalletFilter');
  if(walletSel){ walletSel.innerHTML = '<option value="">👛 Peněženka: Vše</option>' +
    (D.wallets||[]).map(w=>`<option value="${w.id}">${w.icon||'👛'} ${w.name}</option>`).join(''); _restore(walletSel,kWal); }
  // v9.86 (TODO-214): filtr měn – nabídne JEN měny, které se v datech opravdu vyskytují
  const curSel = document.getElementById('txCurFilter');
  if(curSel){
    const kCur=_keep('txCurFilter');
    const used=[...new Set((D.transactions||[]).filter(t=>!t.splitParent).map(t=>txCurOf(t,D)))].sort();
    curSel.innerHTML='<option value="">💱 Měna: Vše</option>'+
      used.map(c=>`<option value="${c}">${(typeof curSym==='function')?curSym(c):c} ${c}</option>`).join('');
    curSel.style.display = used.length>1 ? '' : 'none';   // jedna měna → filtr nemá co filtrovat
    _restore(curSel,kCur);
  }
  const payTypeSel = document.getElementById('txPayTypeFilter');
  if(payTypeSel) {
    const _pt = (typeof getPayTypes==='function') ? getPayTypes(D) : (D.payTypes||[]);
    payTypeSel.innerHTML = '<option value="">💳 Typ platby: Vše</option>' +
      _pt.map(p=>`<option value="${p.id}">${p.icon||'💳'} ${p.name}</option>`).join('');
    _restore(payTypeSel,kPay);
  }
  renderTx();
}

// v9.86 (TODO-214): měna transakce. Uložená v t.currency má přednost; u starších
//   záznamů se odvodí z peněženky – stejně jako to dělal zbytek aplikace před v9.86,
//   takže se nic nemigruje.
function txCurOf(t, D){
  if(t && t.currency) return t.currency;
  const w=((D||getData()).wallets||[]).find(x=>x.id===(t&&t.wallet));
  return (w&&w.currency)?w.currency:'CZK';
}

function renderTx(){
  const D = getData();
  const el = document.getElementById('txList'); if(!el) return;
  const allMonthTxs = getTx(S.curMonth, S.curYear, D);
  if(typeof detectDuplicates === 'function') {
    _dupMap = detectDuplicates(allMonthTxs);
  }
  renderDupBanner(_dupMap||{});
  const catFilter = document.getElementById('txCatFilter')?.value || '';
  const subFilter = document.getElementById('txSubFilter')?.value || '';
  const projectFilter = document.getElementById('txProjectFilter')?.value || '';
  const walletFilter = document.getElementById('txWalletFilter')?.value || '';
  const payTypeFilter = document.getElementById('txPayTypeFilter')?.value || '';
  const curFilter = document.getElementById('txCurFilter')?.value || '';   // v9.86 (TODO-214)
  const tagFilter = document.getElementById('txTagFilter')?.value.replace(/^#+/,'').trim().toLowerCase() || '';
  const searchFilter = document.getElementById('txSearchFilter')?.value.trim().toLowerCase() || '';
  const searchAllMonths = document.getElementById('txSearchAllMonths')?.checked || false;

  // S16.8: postupné vykreslování – velké seznamy nezamrazí mobil (chunk 120 řádků,
  // další se přinačtou při doscrollování; při změně měsíce/filtru/řazení se resetuje)
  const _txKey = [S.curMonth,S.curYear,catFilter,subFilter,projectFilter,walletFilter,payTypeFilter,curFilter,tagFilter,searchFilter,searchAllMonths,_txTypeFilter,_txSort,_txSortDir,(_txDateFilter&&_txDateFilter.active)?'D':''].join('|');
  if(window._txChunkKey !== _txKey){ window._txChunkKey = _txKey; window._txShown = 120; }

  // S16.15 (FIX-206, Milan): checkbox sliboval „ignoruje zvolený měsíc", ale fungoval JEN
  //   se zadaným textem/tagem (searchFilter||tagFilter). Nyní platí samostatně – zaškrtnutí
  //   = zdroj VŠECHNY transakce, ostatní filtry (kategorie, projekt…) se aplikují normálně.
  let txs;
  if (_txDateFilter && _txDateFilter.active) {
    txs = (D.transactions||[]).filter(t=>!t.splitParent && _txDatePass(t.date));
  } else if (searchAllMonths) {
    txs = (D.transactions||[]).filter(t=>!t.splitParent);
  } else {
    txs = getTx(S.curMonth, S.curYear, D);
  }

  // Apply filters
  if(_txTypeFilter === 'income') txs = txs.filter(t => t.type==='income');
  else if(_txTypeFilter === 'expense') txs = txs.filter(t => t.type==='expense');
  else if(_txTypeFilter === 'transfer') txs = txs.filter(t => t.catId==='transfer'||t.category==='transfer');
  if(catFilter) txs = txs.filter(t => (t.catId||t.category)===catFilter);
  if(subFilter) txs = txs.filter(t => t.subcat===subFilter);
  if(projectFilter) txs = txs.filter(t => t.projectId===projectFilter);
  if(walletFilter) txs = txs.filter(t => t.wallet===walletFilter);
  if(payTypeFilter) txs = txs.filter(t => t.payType===payTypeFilter);
  if(curFilter) txs = txs.filter(t => txCurOf(t,D)===curFilter);   // v9.86 (TODO-214)
  if(tagFilter) txs = txs.filter(t => parseTxTags(t).some(tag => tag.includes(tagFilter)));
  if(searchFilter) txs = txs.filter(t =>
    (t.name||'').toLowerCase().includes(searchFilter) ||
    (t.note||'').toLowerCase().includes(searchFilter)
  );
  if(typeof getDupFilterActive === 'function' && getDupFilterActive()) {
    txs = txs.filter(t => (_dupMap||{})[t.id]?.length > 0);
  }

  // Sort
  txs.sort((a,b) => {
    let va, vb;
    if(_txSort==='date'){ va=a.date; vb=b.date; }
    else if(_txSort==='cat'){ const ca=getCat(a.catId||a.category,D.categories); const cb=getCat(b.catId||b.category,D.categories); va=ca.name; vb=cb.name; }
    else if(_txSort==='sub'){ va=a.subcat||''; vb=b.subcat||''; }
    else if(_txSort==='name'){ va=a.name||''; vb=b.name||''; }
    else if(_txSort==='project'){ va=(D.projects||[]).find(p=>p.id===a.projectId)?.name||''; vb=(D.projects||[]).find(p=>p.id===b.projectId)?.name||''; }
    else if(_txSort==='amt'){ va=a.amount||a.amt||0; vb=b.amount||b.amt||0; }
    else { va=a.date; vb=b.date; }
    if(typeof va === 'number') return _txSortDir==='desc' ? vb-va : va-vb;
    return _txSortDir==='desc' ? vb.localeCompare(va,'cs') : va.localeCompare(vb,'cs');
  });

  // Summary badge — v8.58 (TODO-146): součty v základní měně (txCZK)
  // v8.65 (FIX-178): bez PŘESUNŮ (převody peněženek i vklady do investic), split rodičů a vyrovnání
  const _statTx = t => !isTransferTx(t) && !t.splitParent && !t.isBalancing;
  const totalInc = txs.filter(t=>t.type==='income'&&_statTx(t)).reduce((a,t)=>a+txCZK(t,D),0);
  const totalExp = txs.filter(t=>t.type==='expense'&&_statTx(t)).reduce((a,t)=>a+txCZK(t,D),0);
  const badge = document.getElementById('txSummaryBadge');
  if(badge) badge.innerHTML = txs.length ?
    `<span style="color:var(--income)">+${fmtB(totalInc)}</span> <span style="color:var(--text3)">·</span> <span style="color:var(--expense)">−${fmtB(totalExp)}</span> <span style="color:var(--text3)">· ${txs.length} záznamů</span>` : '';
  // S21: tabulka si drží stav i po překreslení seznamu (přepnutí měsíce apod.)
  if(typeof renderTxMonthTable === 'function' && _txTableOpen) renderTxMonthTable();

  if(!txs.length){
    el.innerHTML='<div class="empty" style="padding:32px"><div class="ei">📭</div><div class="et">Žádné transakce</div></div>';
    return;
  }

  const _txAll = txs;
  const _txMore = _txAll.length > window._txShown;
  txs = _txMore ? _txAll.slice(0, window._txShown) : _txAll;

  const ro = viewingUid !== null;
  const CZ_D = ['Ne','Po','Út','St','Čt','Pá','So'];

  // S12.1j: průběžný zůstatek peněženky po každé transakci (Wallet styl „(644 035 Kč)")
  // Počítá se chronologicky pro KAŽDOU peněženku zvlášť; tx bez peněženky zůstatek nemají.
  window._txBalMap = {};
  (D.wallets||[]).forEach(w=>{
    let bal = w.balance||0;
    (D.transactions||[]).filter(t=>t.wallet===w.id && !t.splitParent)
      .sort((a,b)=> a.date===b.date ? String(a.id).localeCompare(String(b.id)) : new Date(a.date)-new Date(b.date))
      .forEach(t=>{
        const a=(t.amount||t.amt||0);
        if(t.type==='income') bal+=a; else if(t.type==='expense') bal-=a;
        window._txBalMap[t.id]=Math.round(bal*100)/100;
      });
  });

  // When sorting by date – group by day; otherwise show flat table
  const groupByDate = _txSort === 'date';

  let html = '';

  if(groupByDate) {
    const byDate = {};
    txs.forEach(t => { if(!byDate[t.date]) byDate[t.date]=[]; byDate[t.date].push(t); });
    const dates = Object.keys(byDate).sort((a,b) => _txSortDir==='desc' ? new Date(b)-new Date(a) : new Date(a)-new Date(b));
    dates.forEach(date => {
      const d = new Date(date+'T12:00:00');
      const dayTxs = byDate[date];
      // v8.58 (TODO-146): denní sumář v základní měně · v8.65 (FIX-178): bez přesunů
      const dayInc = dayTxs.filter(t=>t.type==='income'&&_statTx(t)).reduce((a,t)=>a+txCZK(t,D),0);
      const dayExp = dayTxs.filter(t=>t.type==='expense'&&_statTx(t)).reduce((a,t)=>a+txCZK(t,D),0);
      const daySaldo = dayInc - dayExp;
      html += `<div class="tx-day-group">${CZ_D[d.getDay()]} ${d.getDate()}. ${CZ_M[d.getMonth()]}
        <span style="color:${daySaldo>=0?'var(--income)':'var(--expense)'};font-size:.76rem">${daySaldo>=0?'+':''}${fmtB(daySaldo)}</span>
      </div>`;
      // Split children se zobrazují uvnitř parent řádku – nezobrazuj je samostatně
      dayTxs.filter(t=>!t.splitId||t.splitParent).forEach(t => { html += buildTxRow(t, D, ro, _dupMap||{}); });
    });
  } else {
    txs.filter(t=>!t.splitId||t.splitParent).forEach(t => { html += buildTxRow(t, D, ro, _dupMap||{}); });
  }

  if(_txMore) html += `<div id="txMoreSentinel" style="padding:16px;text-align:center;color:#a8aec8;font-size:.76rem">⏳ Načítám další… (zbývá ${_txAll.length - window._txShown})</div>`;
  el.innerHTML = html;
  if(_txMore){
    const sen = document.getElementById('txMoreSentinel');
    if(sen && 'IntersectionObserver' in window){
      if(window._txIO) window._txIO.disconnect();
      window._txIO = new IntersectionObserver((es)=>{
        if(es.some(x=>x.isIntersecting)){ window._txIO.disconnect(); window._txShown += 120; renderTx(); }
      }, {rootMargin:'600px'});
      window._txIO.observe(sen);
    } else if(sen){
      sen.innerHTML = '<button class="btn btn-ghost btn-sm" onclick="window._txShown+=120;renderTx()">Načíst dalších 120</button>';
    }
  }
}

// S12.1o: překreslit transakce při překročení mobilního breakpointu (rotace/resize okna)
if (!window._txResizeBound) {
  window._txResizeBound = true;
  let _txWasMobile = window.innerWidth <= 820;
  window.addEventListener('resize', () => {
    const isM = window.innerWidth <= 820;
    if (isM !== _txWasMobile) {
      _txWasMobile = isM;
      if (typeof curPage !== 'undefined' && curPage === 'transakce' && typeof renderTx === 'function') renderTx();
    }
  });
}

function buildTxRow(t, D, ro, dupMap={}) {
  const cat = getCat(t.catId||t.category, D.categories);
  const amt = t.amount || t.amt || 0;
  const isTransfer = t.catId==='transfer'||t.category==='transfer';
  const isVirtualTransfer = cat && cat.name === 'Virtuální přesun';
  // Měna transakce dle peněženky (eurová peněženka → EUR, ne Kč)
  const _txWallet = t.wallet ? (D.wallets||[]).find(w=>w.id===t.wallet) : null;
  // v9.90: uložená t.currency má přednost – česká karta může platit v eurech (TODO-214)
  const txCur = t.currency || _txWallet?.currency || 'CZK';
  const curLabel = txCur==='CZK' ? 'Kč' : txCur;
  // v8.58 (TODO-144) + v8.60 (TODO-150): u měny odlišné od základní ukaž hodnotu v ZÁKLADNÍ měně (z t.amtCZK; bez fixace orientačně živým kurzem)
  const czkNote = txCur!==baseCur() ? `<div style="font-size:.64rem;color:#a8aec8;white-space:nowrap">≈ ${fmtBP(txCZK(t,D))}${(t.amtCZK!=null||txCur==='CZK')?'':' (orient.)'}</div>` : '';
  // TODO-215 fáze 2: co si banka nechala navíc oproti kurzu ČNB
  const _fxL = (typeof fxLossOf==='function') ? fxLossOf(t) : null;
  const fxNote = (_fxL && Math.abs(_fxL.loss)>=1)
    ? `<div style="font-size:.64rem;white-space:nowrap;color:${_fxL.loss>0?'var(--debt)':'var(--income)'}" title="Kurz banky ${_fxL.bankRate.toFixed(2)} · ČNB ${_fxL.refRate.toFixed(2)}${_fxL.refDate?' ('+_fxL.refDate+')':''}">${_fxL.loss>0?'kurz +':'kurz −'}${fmtBP(Math.abs(_fxL.loss))} (${_fxL.pct>0?'+':''}${_fxL.pct.toFixed(1)} %)</div>`
    : '';
  const amtColor = isTransfer?'var(--bank)':t.type==='income'?'var(--income)':'var(--expense)';
  const amtSign = isTransfer?'↔':t.type==='income'?'+':'−';
  const project = t.projectId ? (D.projects||[]).find(p=>p.id===t.projectId) : null;
  const customName = t.name && t.name!==cat.name && !t.name.startsWith(cat.name) ? t.name : '';
  const d = new Date(t.date+'T12:00:00');
  const CZ_D = ['Ne','Po','Út','St','Čt','Pá','So'];

  // Split logika
  const isSplitParent = t.splitId && t.splitParent;
  const isSplitChild  = t.splitId && !t.splitParent;
  const splitChildren = isSplitParent ? (D.transactions||[]).filter(x=>x.splitId===t.splitId&&!x.splitParent) : [];
  const rowClass = isSplitParent ? 'tx-table-row split-parent-row' : isSplitChild ? 'tx-table-row split-child-row' : 'tx-table-row';

  // Parent row – zobraz accordion s dětmi
  let childRows = '';
  if(isSplitParent && splitChildren.length) {
    childRows = `<div id="split-children-${t.splitId}" style="display:none">` +
      splitChildren.map(ch => buildTxRow(ch, D, ro)).join('') +
      '</div>';
  }

  // Pokud je child, zobraz zjednodušeně
  if(isSplitChild) {
    return `<div class="${rowClass}" style="opacity:.92">
      <div class="tx-table-cell" style="color:var(--text3);font-size:.7rem;padding-left:8px">└</div>
      <div class="tx-table-cell">
        <div style="display:flex;align-items:center;gap:5px">
          <span style="font-size:.85rem">${cat.icon}</span>
          <span style="font-weight:600;font-size:.78rem">${cat.name}</span>
        </div>
      </div>
      <div class="tx-table-cell tx-col-subcat" style="font-size:.74rem;color:var(--text3)">${t.subcat||'–'}</div>
      <div class="tx-table-cell"><span style="font-size:.78rem;color:var(--text2)">${t.name||''}</span></div>
      <div class="tx-table-cell tx-col-project"></div>
      <div class="tx-table-cell tx-col-paytype"></div>
      <div class="tx-table-cell tx-col-wallet"></div>
      <div class="tx-table-cell" style="text-align:right;font-weight:700;color:${amtColor};font-size:.82rem">${amtSign}${fmtP(amt)} ${curLabel}</div>
      <div class="tx-table-cell" style="display:flex;gap:3px;justify-content:flex-end">
        ${!ro?`<button class="btn btn-danger btn-icon btn-sm" onclick="deleteSplitChild('${t.id}')">✕</button>`:''}
      </div>
    </div>`;
  }

  // Receipt items accordion – pokud transakce vznikla ze skenované účtenky
  // Pro split parent NEVYKRESLUJ receipt expand – split children tvoří rozpad (konflikt kliků)
  const hasReceiptItems = t.receiptItems && t.receiptItems.length > 0 && !isSplitParent;
  const receiptItemsHtml = hasReceiptItems ? (() => {
    const rows = t.receiptItems.map(it => {
      const itTotal = it.lineTotal!=null ? parseFloat(it.lineTotal) : (parseFloat(it.price)||0)*(parseFloat(it.qty)||1);
      const qtyStr = (it.qty&&it.qty!==1) ? `${it.qty}\u00a0${it.unit||'ks'}` : '';
      return `<div style="display:grid;grid-template-columns:1fr 72px 52px;gap:4px 8px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="font-size:.78rem;color:var(--text)">${it.name||'–'}</span><span style="text-align:right;font-size:.78rem;font-weight:700;color:var(--expense)">${fmtP(itTotal)}\u00a0Kč</span><span style="text-align:right;font-size:.68rem;color:#a8aec8">${qtyStr}</span></div>`;
    }).join('');
    return `<div id="rcpt-items-${t.id}" style="display:none;background:var(--surface2);border-top:1px solid var(--border);padding:8px 16px 10px"><div style="display:grid;grid-template-columns:1fr 72px 52px;gap:4px 8px;padding:2px 0 4px;font-size:.62rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid var(--border)"><span>Položka</span><span style="text-align:right">Kč</span><span style="text-align:right">Mn.</span></div>${rows}</div>`;
  })() : '';

  const rcptExpandAttr = hasReceiptItems && !isSplitParent ? `onclick="event.stopPropagation();const el=document.getElementById('rcpt-items-${t.id}');if(el)el.style.display=el.style.display==='none'?'block':'none'" style="cursor:pointer"` : '';

  // ══ S12.1o: MOBILNÍ KARTA (≤820px) – Wallet styl, tap otevře editaci ══
  if (window.innerWidth <= 820) {
    const tapAttr = isSplitParent
      ? `onclick="toggleSplitChildren('${t.splitId}')"`
      : hasReceiptItems
        ? `onclick="const el=document.getElementById('rcpt-items-${t.id}');if(el)el.style.display=el.style.display==='none'?'block':'none'"`
        : (!ro && !isVirtualTransfer ? `onclick="editTx('${t.id}')"` : '');
    const tagsHtmlM =
      (Array.isArray(t.tags)&&t.tags.length) ? `<div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:3px">${t.tags.map(tag=>`<span style="background:rgba(30,58,138,.7);border:1px solid rgba(59,130,246,.5);color:#fff;padding:1px 7px;border-radius:8px;font-size:.62rem;font-weight:700">#${tag}</span>`).join('')}</div>`
      : (typeof t.tags==='string'&&t.tags) ? `<div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:3px">${t.tags.split(/[\s,]+/).filter(Boolean).map(tag=>`<span style="background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);color:var(--income);padding:1px 5px;border-radius:8px;font-size:.62rem;font-weight:600">🏷️ ${tag}</span>`).join('')}</div>`
      : '';
    const badgeM = isSplitParent ? ` <span style="font-size:.66rem;color:var(--bank)">✂️ ${splitChildren.length}× ▾</span>`
                : hasReceiptItems ? ` <span style="font-size:.66rem;color:#a8aec8">📷 ${t.receiptItems.length} ▾</span>` : '';
    const subM = t.subcat ? `<span style="font-size:.72rem;color:var(--text3)"> · ${t.subcat}</span>` : '';
    const balM = (window._txBalMap&&window._txBalMap[t.id]!==undefined) ? `<div style="font-size:.64rem;color:var(--income);opacity:.85">(${fmtP(window._txBalMap[t.id])} ${curLabel})</div>` : '';
    const descM = customName || t.name || t.note || (t.receiptStore||'') || '–';
    const _mobCard = `<div class="tx-mob-row ${rowClass}${(!ro && hasReceiptItems)?' tx-swipe-fg':''}" ${tapAttr}${(!ro && hasReceiptItems)?' data-swipe="1"':''} style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border);cursor:${(isSplitParent||hasReceiptItems||!ro)?'pointer':'default'}${(!ro && hasReceiptItems)?';background:var(--surface,#1a1d27);position:relative;z-index:1':''}">
      <div style="flex-shrink:0;width:34px;text-align:center">
        <div style="font-size:1.15rem;line-height:1">${cat.icon}</div>
        <div style="font-size:.66rem;color:#a8aec8;margin-top:2px">${d.getDate()}.${d.getMonth()+1}.</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cat.name}${subM}</div>
        <div style="font-size:.72rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${descM}${badgeM}</div>
        ${tagsHtmlM}
      </div>
      <div style="flex-shrink:0;text-align:right">
        <div style="font-weight:800;font-size:.92rem;color:${amtColor};white-space:nowrap">${amtSign}${fmtP(amt)} ${curLabel}</div>
        ${czkNote}${fxNote}
        ${balM}
      </div>
    </div>`;
    // Účtenková karta: swipe doleva odkryje „Upravit" (otevře naskenovanou účtenku)
    const _mobOut = (!ro && hasReceiptItems)
      ? `<div class="tx-swipe-wrap" style="position:relative;overflow:hidden">
          <div class="tx-swipe-action" style="position:absolute;top:0;right:0;bottom:0;width:84px;display:flex;align-items:center;justify-content:center;background:var(--bank,#3b82f6)">
            <button onclick="event.stopPropagation();openReceiptInHistory('${t.receiptDate||''}','${(t.receiptStore||'').replace(/'/g,'')}')" style="background:none;border:none;color:#fff;font-weight:700;font-size:.7rem;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;line-height:1.1"><span style="font-size:1.15rem">✎</span>Upravit</button>
          </div>
          ${_mobCard}
        </div>`
      : _mobCard;
    return `${_mobOut}
    ${receiptItemsHtml}
    ${childRows}`;
  }

  const _coarse = !!(typeof window!=='undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches); // dotyk (mobil/tablet) vs web s myší
  const _swipeRow = _coarse && !ro && hasReceiptItems;            // jen dotyk: účtenka → swipe na „Upravit"
  const _normalEditable = _coarse && !ro && !isSplitParent && !isVirtualTransfer && !hasReceiptItems; // jen dotyk: normální → tap edituje
  const _expandJs = (hasReceiptItems && !isSplitParent) ? `event.stopPropagation();const el=document.getElementById('rcpt-items-${t.id}');if(el)el.style.display=el.style.display==='none'?'block':'none'` : '';
  const _rowAttrs = isSplitParent ? `onclick="toggleSplitChildren('${t.splitId}')" style="cursor:pointer"`
    : _swipeRow ? `onclick="${_expandJs}" style="cursor:pointer;background:var(--surface);position:relative;z-index:1"`
    : _normalEditable ? `onclick="editTx('${t.id}')" style="cursor:pointer"`
    : (hasReceiptItems && !isSplitParent) ? `onclick="${_expandJs}" style="cursor:pointer"`
    : '';
  // Landscape: tagy jako pruh přes celou šířku pod řádkem (v úzké buňce „Název" se orezavaly na 1 písmeno)
  const _tagsArr = Array.isArray(t.tags) ? t.tags : (typeof t.tags==='string'&&t.tags ? t.tags.split(/[\s,]+/).filter(Boolean) : []);
  const _tagsRow = _tagsArr.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;padding:0 12px 7px 82px">${_tagsArr.map(tag=>Array.isArray(t.tags)?`<span style="background:rgba(30,58,138,.7);border:1px solid rgba(59,130,246,.5);color:#fff;padding:2px 8px;border-radius:8px;font-size:.66rem;font-weight:700">#${tag}</span>`:`<span style="background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);color:var(--income);padding:2px 8px;border-radius:8px;font-size:.66rem;font-weight:600">🏷️ ${tag}</span>`).join('')}</div>` : '';
  const _rowHTML = `<div class="${rowClass}${_swipeRow?' tx-swipe-fg':''}"${_swipeRow?' data-swipe="1"':''} ${_rowAttrs}>
    <div class="tx-table-cell" style="color:var(--text3);font-size:.76rem">
      <div style="font-weight:600;color:var(--text2)">${d.getDate()}. ${CZ_M[d.getMonth()].slice(0,3)}</div>
      <div style="font-size:.68rem">${CZ_D[d.getDay()]}</div>
    </div>
    <div class="tx-table-cell">
      <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
        <span style="font-size:.9rem">${cat.icon}</span>
        <span style="font-weight:600;font-size:.82rem">${cat.name}</span>
        ${typeof buildDupBadge==='function' ? buildDupBadge(t, dupMap) : ''}
      </div>
    </div>
    <div class="tx-table-cell tx-col-subcat" style="color:var(--text3);font-size:.78rem">${t.subcat||'–'}</div>
    <div class="tx-table-cell">
      ${customName?`<div style="font-size:.82rem;color:var(--text2)">${customName}</div>`:''}
      ${t.note?`<div style="font-size:.74rem;color:var(--text3)">📝 ${t.note}</div>`:''}
      ${!customName&&!t.note?`<span style="color:var(--text3);font-size:.76rem">–</span>`:''}
      ${typeof buildDupActions==='function' ? buildDupActions(t, dupMap, ro) : ''}
    </div>
    <div class="tx-table-cell tx-col-project">
      ${project?`<span onclick="event.stopPropagation();openProjectDetail('${project.id}')" style="font-size:.74rem;background:var(--project-bg);color:var(--project);padding:2px 7px;border-radius:6px;border:1px solid var(--project-border);cursor:pointer" title="Otevřít projekt">📁 ${project.name}</span>`:`<span style="color:var(--text3);font-size:.76rem">–</span>`}
    </div>
    <div class="tx-table-cell tx-col-paytype" style="font-size:.74rem;color:var(--text3)">
      ${(()=>{ if(!t.payType) return '–'; const _pts=(typeof getPayTypes==='function')?getPayTypes(D):(D.payTypes||[]); const _pt=_pts.find(p=>p.id===t.payType); return _pt?`${_pt.icon||'💳'} ${_pt.name}`:'–'; })()}
    </div>
    <div class="tx-table-cell tx-col-wallet" style="font-size:.74rem;color:var(--text3)">
      ${(()=>{ if(!t.wallet) return '–'; const _w=(D.wallets||[]).find(w=>w.id===t.wallet); return _w?`${_w.icon||'👛'} ${_w.name}`:'–'; })()}
    </div>
    <div class="tx-table-cell" style="text-align:right">
      <div style="font-weight:700;color:${amtColor}">${amtSign}${fmtP(amt)} ${curLabel}</div>
      ${czkNote}${fxNote}
      ${(window._txBalMap&&window._txBalMap[t.id]!==undefined)?`<div style="font-size:.66rem;color:var(--income);opacity:.85;white-space:nowrap">(${fmtP(window._txBalMap[t.id])} ${curLabel})</div>`:''}
      ${isSplitParent?`<span class="split-badge" style="margin-left:0;margin-top:3px;display:inline-block">✂️ SPLIT · ${splitChildren.length}×</span>`:''}
      ${hasReceiptItems?`<span style="font-size:.62rem;color:#a8aec8;display:block;margin-top:2px">📷 ${t.receiptItems.length} pol. ▾</span>`:''}
    </div>
    <div class="tx-table-cell" style="display:flex;gap:3px;justify-content:flex-end;align-items:center">
      ${isVirtualTransfer?`<span style="font-size:.66rem;color:#a8aec8" title="Spravuj v sekci Cíle">🎯 cíl</span>`:(_coarse
        ? (_swipeRow?`<span style="font-size:.66rem;color:#a8aec8" title="Potáhni doleva pro úpravu účtenky">‹ swipe</span>`:'')
        : `${!ro&&!isSplitParent&&!hasReceiptItems?`<button class="btn btn-ghost btn-icon btn-sm" title="Rozdělit" onclick="event.stopPropagation();openSplitModal('${t.id}')">✂️</button>`:''}${hasReceiptItems&&!isSplitParent?`<button class="btn btn-ghost btn-icon btn-sm" title="Zobrazit účtenku v Historii" onclick="event.stopPropagation();openReceiptInHistory('${t.receiptDate||''}','${(t.receiptStore||'').replace(/'/g,'')}')" style="font-size:.8rem">📷</button>`:''}${!ro?`<button class="btn btn-edit btn-icon btn-sm" onclick="event.stopPropagation();editTx('${t.id}')">✎</button><button class="btn btn-danger btn-icon btn-sm" onclick="event.stopPropagation();deleteTx('${t.id}')">✕</button>`:''}`)}
    </div>
  </div>`;
  const _wrapped = _swipeRow
    ? `<div class="tx-swipe-wrap" style="position:relative;overflow:hidden"><div class="tx-swipe-action" style="position:absolute;top:0;right:0;bottom:0;width:84px;display:flex;align-items:center;justify-content:center;background:var(--bank,#3b82f6);z-index:0"><button onclick="event.stopPropagation();openReceiptInHistory('${t.receiptDate||''}','${(t.receiptStore||'').replace(/'/g,'')}')" style="background:none;border:none;color:#fff;font-weight:700;font-size:.72rem;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;line-height:1.1"><span style="font-size:1.1rem">✎</span>Upravit</button></div>${_rowHTML}</div>`
    : _rowHTML;
  return `${_wrapped}${_tagsRow}
  ${receiptItemsHtml}
  ${childRows}`;
}
function deleteTx(id){
  if(viewingUid)return;
  if(!confirm('Smazat transakci?'))return;
  // Pokud je to vklad do cíle (transfer s párovým vkladem) → smaž i vklad v cíli
  if(typeof reverseGoalDepositForTx==='function') reverseGoalDepositForTx(id);
  S.transactions=S.transactions.filter(t=>t.id!=id);
  save();renderPage();
}
function editTx(id){
  if(viewingUid)return;
  const D=getData();
  const t=(D.transactions||[]).find(x=>x.id==id);if(!t)return;
  document.getElementById('editTxId').value=id;
  document.getElementById('txName').value=t.name||'';
  document.getElementById('txAmt').value=t.amount||t.amt||'';
  document.getElementById('txDate').value=t.date;
  document.getElementById('txNote').value=t.note||'';
  // TODO-231: zavřít případně otevřené našeptávače z předchozí editace
  { const ns=document.getElementById('txNameSuggest'); if(ns) ns.style.display='none'; }
  { const ts=document.getElementById('txNoteSuggest'); if(ts) ts.style.display='none'; }
  // Tagy
  const tagsEl=document.getElementById('txTags');
  if(tagsEl) { tagsEl.value=parseTxTags(t).map(g=>'#'+g).join(' '); updateTagsPreview(); }
  document.getElementById('modalAddTitle').textContent='Upravit transakci';
  populateTxProjectSelect();
  populateTxTransferWallets();
  if(document.getElementById('txProject'))document.getElementById('txProject').value=t.projectId||'';
  // S14: chytré otevření editace podle druhu transakce
  const _isDebtTx = !!t.debtId;
  const _isAssetTx = t.type==='expense' && window._transferCatIds && window._transferCatIds.has(t.catId||t.category);
  if(_isDebtTx && typeof renderDebtSubPicker==='function'){
    // splátka půjčky → režim Dluh/Splátka s vybranou půjčkou a druhem splátky
    setTxType('debt');
    const _ds=document.getElementById('txDebtId'); if(_ds) _ds.value=t.debtId;
    _debtSub=t.subcat||''; renderDebtSubPicker();
  } else if(_isAssetTx && typeof setTransferMode==='function'){
    // vklad do investic/spoření → režim Přesun → Do aktiv
    setTxType('transfer');
    _assetCatId=t.catId||t.category||''; _assetSub=t.subcat||'';
    setTransferMode('assets');
    const af=document.getElementById('txAssetFrom'); if(af) af.value=t.wallet||'';
    const cs=document.getElementById('assetCustomSub'); if(cs) cs.value='';
  } else {
    setTxType(t.type==='transfer'?'transfer':t.type);
    selCatId=t.catId||t.category||'';
    selSub=t.subcat||'';
    renderCatPicker();
  }
  // v8.58 (FIX): editace vyplní i PENĚŽENKU a TYP PLATBY – dřív selecty zůstaly na „– výchozí –"
  if(typeof populateTxWalletSelect==='function') populateTxWalletSelect();
  if(typeof populateTxPayTypeSelect==='function') populateTxPayTypeSelect();
  { const _wSel=document.getElementById('txWalletId'); if(_wSel) _wSel.value=t.wallet||'';
    const _pSel=document.getElementById('txPayTypeId'); if(_pSel) _pSel.value=t.payType||''; }
  // v8.68 (FIX-180): editace spustí převodník (dřív zůstala hodnota z minulého modalu / „≈ 0 Kč")
  // v9.86 (TODO-214): obnov měnu zadávání z uložené transakce
  if(typeof _txCurBase==='function'){
    const _wc=_txCurBase();
    _txCurOverride = (t.currency && t.currency!==_wc) ? t.currency : null;
  }
  if(typeof updateTxCurrency==='function') updateTxCurrency();
  // v8.58 (TODO-144): pole „Skutečně v Kč" – zafixovaná hodnota; u staré cizoměnové tx předvyplní kurz ČNB (zafixuje se uložením)
  _czkTouched = (t.amtCZK!=null);
  // FIX-261: uživatel v TÉTO editaci do pole zatím nesáhl a kurz se nemá razit znovu
  if(typeof _czkUserTyped!=='undefined') _czkUserTyped = false;
  if(typeof _fxRestamp!=='undefined') _fxRestamp = false;
  { const _cf=document.getElementById('txAmtCZK'); if(_cf) _cf.value=(t.amtCZK!=null)?t.amtCZK:''; }
  if(typeof updateTxCzkField==='function') updateTxCzkField();
  // v8.62 (TODO-150): tx BEZ peněženky + základní měna ≠ CZK → částka se edituje v základní měně,
  // pole „Skutečně v Kč" nese přesnou uloženou Kč hodnotu (žádný kurzovní drift při přeuložení)
  if(!t.wallet && typeof baseCur==='function' && baseCur()!=='CZK' && t.type!=='transfer'){
    const _a=t.amount||t.amt||0;
    const _af=document.getElementById('txAmt'); if(_af) _af.value=Math.round(czkToBase(_a)*100)/100;
    const _cf2=document.getElementById('txAmtCZK'); if(_cf2) _cf2.value=_a;
    _czkTouched=true;
    if(typeof updateTxCzkField==='function') updateTxCzkField();
  }
  // S12.1i: akční tlačítka v editaci (mobil i PC) – Smazat vždy, Rozdělit jen kde dává smysl
  const _bd=document.getElementById('btnTxDelete');
  if(_bd) _bd.style.display='inline-flex';
  const _bs=document.getElementById('btnTxSplit');
  if(_bs) _bs.style.display=(!t.splitId && !(t.receiptItems&&t.receiptItems.length)) ? 'inline-flex' : 'none';
  window._modalTxId=id;
  document.getElementById('modalAdd').classList.add('open');
}

// ══════════════════════════════════════════════════════
//  TODO-231: NAŠEPTÁVAČ NÁZEV / POZNÁMKA (vzor: nakupShowCatalogSuggest, tagsInputHandler)
//  Zdroj: vlastní historie transakcí uživatele, ne katalog – řazeno podle četnosti použití.
// ══════════════════════════════════════════════════════
function _txFieldFreqList(field){
  const D=getData();
  const map={};
  (D.transactions||[]).forEach(t=>{
    const v=(t[field]||'').trim();
    if(!v) return;
    const key=v.toLowerCase();
    if(!map[key]) map[key]={val:v,count:0};
    map[key].count++;
  });
  return Object.values(map).sort((a,b)=>b.count-a.count);
}
function txShowNameSuggest(val){
  const el=document.getElementById('txNameSuggest'); if(!el) return;
  const q=(val||'').toLowerCase().trim();
  if(q.length<2){ el.style.display='none'; return; }
  const matches=_txFieldFreqList('name').filter(c=>c.val.toLowerCase().includes(q)).slice(0,8);
  if(!matches.length){ el.style.display='none'; return; }
  el.style.display='block';
  el.innerHTML=matches.map(c=>`
    <div onclick="txSelectNameSuggest('${c.val.replace(/'/g,"&#39;")}')"
      style="padding:8px 12px;cursor:pointer;font-size:.82rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"
      onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">
      <span>${c.val}</span>
      <span style="color:var(--text3);font-size:.7rem">${c.count}×</span>
    </div>`).join('');
}
function txHideNameSuggest(){ setTimeout(()=>{ const el=document.getElementById('txNameSuggest'); if(el) el.style.display='none'; },200); }
function txSelectNameSuggest(name){
  const inp=document.getElementById('txName'); if(!inp) return;
  inp.value=name;
  const el=document.getElementById('txNameSuggest'); if(el) el.style.display='none';
  inp.focus();
}
function txShowNoteSuggest(val){
  const el=document.getElementById('txNoteSuggest'); if(!el) return;
  const q=(val||'').toLowerCase().trim();
  if(q.length<2){ el.style.display='none'; return; }
  const matches=_txFieldFreqList('note').filter(c=>c.val.toLowerCase().includes(q)).slice(0,8);
  if(!matches.length){ el.style.display='none'; return; }
  el.style.display='block';
  el.innerHTML=matches.map(c=>`
    <div onclick="txSelectNoteSuggest('${c.val.replace(/'/g,"&#39;")}')"
      style="padding:8px 12px;cursor:pointer;font-size:.82rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"
      onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">
      <span>${c.val}</span>
      <span style="color:var(--text3);font-size:.7rem">${c.count}×</span>
    </div>`).join('');
}
function txHideNoteSuggest(){ setTimeout(()=>{ const el=document.getElementById('txNoteSuggest'); if(el) el.style.display='none'; },200); }
function txSelectNoteSuggest(note){
  const inp=document.getElementById('txNote'); if(!inp) return;
  inp.value=note;
  const el=document.getElementById('txNoteSuggest'); if(el) el.style.display='none';
  inp.focus();
}

// S12.1i: akce z editačního modalu
function deleteTxFromModal(){
  const id=window._modalTxId; if(!id) return;
  closeModal('modalAdd');
  deleteTx(id);
}
function splitTxFromModal(){
  const id=window._modalTxId; if(!id) return;
  closeModal('modalAdd');
  if(typeof openSplitModal==='function') openSplitModal(id);
}

// ══════════════════════════════════════════════════════
