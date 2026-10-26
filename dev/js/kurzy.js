// FinanceFlow · v12.11 · kurzy.js · 2026-10-25
// Kurzy měn (denní kurzovní lístek ČNB) + možnost připnout oblíbené měny pro rychlý přehled.
// Data: proxy přes Cloudflare Worker (endpoint /cnb, cache 1×/den + CORS).
// Fallback: poslední načtené kurzy v paměti → uložené orientační průměry (_FX_RATES z debts.js).

const CNB_URL = (typeof WORKER_URL !== 'undefined' ? WORKER_URL : 'https://misty-limit-0523.bc-milda.workers.dev') + '/cnb';
let _fxData = null;     // {date, rates:{EUR:25.3,...}, source}
let _fxLoading = false;

// Název + vlajka pro hezčí výpis (kódy mimo seznam se zobrazí jen kódem)
const FX_INFO = {
  EUR:['Euro','🇪🇺'], USD:['Americký dolar','🇺🇸'], GBP:['Britská libra','🇬🇧'],
  CHF:['Švýcarský frank','🇨🇭'], PLN:['Polský zlotý','🇵🇱'], HUF:['Maďarský forint','🇭🇺'],
  JPY:['Japonský jen','🇯🇵'], CAD:['Kanadský dolar','🇨🇦'], AUD:['Australský dolar','🇦🇺'],
  DKK:['Dánská koruna','🇩🇰'], NOK:['Norská koruna','🇳🇴'], SEK:['Švédská koruna','🇸🇪'],
  CNY:['Čínský jüan','🇨🇳'], RON:['Rumunský leu','🇷🇴'], BGN:['Bulharský lev','🇧🇬'],
  TRY:['Turecká lira','🇹🇷'], INR:['Indická rupie','🇮🇳'], BRL:['Brazilský real','🇧🇷'],
  ZAR:['Jihoafrický rand','🇿🇦'], MXN:['Mexické peso','🇲🇽'], ILS:['Izraelský šekel','🇮🇱'],
  KRW:['Jihokorejský won','🇰🇷'], SGD:['Singapurský dolar','🇸🇬'], HKD:['Hongkongský dolar','🇭🇰'],
  NZD:['Novozélandský dolar','🇳🇿'], THB:['Thajský baht','🇹🇭'], PHP:['Filipínské peso','🇵🇭'],
  MYR:['Malajsijský ringgit','🇲🇾'], IDR:['Indonéská rupie','🇮🇩'], ISK:['Islandská koruna','🇮🇸'],
  XDR:['Zvláštní práva čerpání (MMF)','🏦']
};

// ══════════════════════════════════════════════════════════════════════
//  FIX-322 (S21, nahlásil Milan): PŘIPNUTÉ MĚNY NEBYLY PER UŽIVATEL
//  Klíč `ff_pinnedFx` byl v localStorage BEZ uid. localStorage patří doméně,
//  ne účtu – takže na jednom prohlížeči sdíleli seznam připnutých měn všichni,
//  kdo se kdy přihlásili. Milan připnul měnu u sebe a objevila se i na
//  testovacím účtu; vypadalo to, jako by se to měnilo „globálně".
//
//  Zápis do Firebase to nikdy nedělalo, takže cizím lidem se nic neměnilo –
//  ale mezi účty na jednom zařízení ano, a to stačí. Changelog v8.36 přitom
//  tvrdil „ukládá se do účtu", což nebyla pravda ani tehdy.
//
//  Nově má klíč uid. Starý společný seznam se při prvním použití převezme
//  (aby o připnuté měny nikdo nepřišel) a smaže, ať se nešíří dál.
// ══════════════════════════════════════════════════════════════════════
function _pinnedFxKey(){
  const uid = window._currentUser?.uid;
  return uid ? `ff_pinnedFx_${uid}` : 'ff_pinnedFx_local';
}

function getPinnedFx(){
  const key = _pinnedFxKey();
  try {
    const vlastni = localStorage.getItem(key);
    if (vlastni !== null) return JSON.parse(vlastni || '[]');
    // Jednorázový přenos ze starého společného klíče
    const stary = localStorage.getItem('ff_pinnedFx');
    if (stary !== null) {
      localStorage.setItem(key, stary);
      localStorage.removeItem('ff_pinnedFx');
      return JSON.parse(stary || '[]');
    }
    return [];
  } catch(e){ return []; }
}

function togglePinFx(code){
  const list = getPinnedFx();
  const i = list.indexOf(code);
  if (i >= 0) list.splice(i, 1); else list.push(code);
  try { localStorage.setItem(_pinnedFxKey(), JSON.stringify(list)); } catch(e){}
  renderKurzy(); // vizuál hned, nezávisle na Firebase
}
window.getPinnedFx = getPinnedFx;
window.togglePinFx = togglePinFx;

async function fetchFxRates(force){
  if (_fxLoading) return _fxData;
  _fxLoading = true;
  try {
    const r = await fetch(CNB_URL, { cache: 'no-store' }); // vždy čerstvé z Workeru (ČNB mění kurz v pracovní dny ~14:30)
    if (r.ok) {
      const d = await r.json();
      if (d && d.rates && Object.keys(d.rates).length) { _fxData = d; return d; }
    }
  } catch (e) { console.warn('ČNB kurzy nedostupné:', e); }
  finally { _fxLoading = false; }
  // fallback: orientační průměry (appka je má v _FX_RATES)
  if (!_fxData) _fxData = { date: null, rates: (typeof _FX_RATES !== 'undefined' ? Object.assign({}, _FX_RATES) : {}), source: 'fallback' };
  return _fxData;
}
window.fetchFxRates = fetchFxRates;

function fmtRate(r){ return (typeof r === 'number') ? r.toFixed(r < 1 ? 4 : 3) : '–'; }

function fxRow(code, rate, isPinned){
  const info = FX_INFO[code] || [code, '🏳️'];
  const flag = info[1] || '🏳️', nm = info[0] || code;
  return '<div style="display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.05)">'
    + '<span style="font-size:1.35rem">' + flag + '</span>'
    + '<div style="flex:1;min-width:0"><div style="font-weight:700;color:var(--text)">' + code + '</div>'
    + '<div style="font-size:.72rem;color:#a8aec8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + nm + '</div></div>'
    + '<div style="text-align:right;font-weight:700;color:var(--text);white-space:nowrap">' + fmtRate(rate) + ' Kč</div>'
    + '<button onclick="togglePinFx(\'' + code + '\')" title="Připnout pro rychlý přehled" '
    + 'style="background:none;border:none;cursor:pointer;font-size:1.25rem;padding:4px;line-height:1;color:' + (isPinned ? '#fbbf24' : '#566') + '">'
    + (isPinned ? '★' : '☆') + '</button></div>';
}

// ══════════════════════════════════════════════════════
//  HISTORICKÝ KURZ ČNB (TODO-215, v9.97)
//  Milan trefně namítl: když se transakce zapisuje se zpožděním nebo se později
//  upraví částka, „dnešní" kurz ČNB k ní nepatří. Referenční kurz proto bereme
//  k DATU TRANSAKCE, ne k datu zápisu.
//  Výsledky se drží v paměti – historický lístek se už nezmění, takže se pro
//  jedno datum stahuje nejvýš jednou za sezení.
// ══════════════════════════════════════════════════════
const _fxHistCache = {};

async function fxRatesForDate(isoDate){
  if(!isoDate) return null;
  const d = new Date(String(isoDate).slice(0,10) + 'T12:00:00');
  if(isNaN(d)) return null;
  const dnes = new Date(); dnes.setHours(12,0,0,0);
  // Dnešní a budoucí datum → běžný lístek, žádné volání navíc
  if(d >= dnes){
    const cur = (typeof _fxData !== 'undefined' && _fxData && _fxData.source !== 'fallback') ? _fxData : null;
    return cur ? { rates: cur.rates, date: cur.date } : null;
  }
  const key = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  if(_fxHistCache[key] !== undefined) return _fxHistCache[key];
  try{
    const r = await fetch(`${CNB_URL}?date=${encodeURIComponent(key)}`, { cache:'no-store' });
    if(!r.ok) throw new Error('HTTP '+r.status);
    const j = await r.json();
    const ok = (j && j.rates && Object.keys(j.rates).length) ? { rates:j.rates, date:j.date || key } : null;
    _fxHistCache[key] = ok;
    return ok;
  }catch(e){ _fxHistCache[key] = null; return null; }
}
window.fxRatesForDate = fxRatesForDate;

// ══════════════════════════════════════════════════════
//  v12.11 (Milan: „do kurzů měn mi můžeš přidat převodník?“): 💱 PŘEVODNÍK
//  Částka × kurz „z“ ÷ kurz „do“ (kurzy = Kč za 1 jednotku, CZK = 1). Stav převodníku si pamatuje
//  prohlížeč (jen pohodlí – poslední měny a částka).
// ══════════════════════════════════════════════════════
function fxPrevod(castka, z, na, rates) {
  const r = Object.assign({ CZK: 1 }, rates || {});
  const v = parseFloat(String(castka == null ? '' : castka).replace(/\s/g, '').replace(',', '.'));
  if (!isFinite(v) || !r[z] || !r[na]) return null;
  return v * r[z] / r[na];
}
function _fxPrevodStav() {
  if (!window._fxPrevod) { let v = null; try { v = JSON.parse(localStorage.getItem('ff_fxPrevod') || 'null'); } catch (e) {}
    window._fxPrevod = Object.assign({ castka: '100', z: 'EUR', na: 'CZK' }, v || {}); }
  return window._fxPrevod;
}
function _fxPrevodUloz() { try { localStorage.setItem('ff_fxPrevod', JSON.stringify(window._fxPrevod)); } catch (e) {} }
function _fxFmt(v, kod) {
  if (v == null) return '–';
  const des = Math.abs(v) >= 1000 ? 2 : Math.abs(v) >= 1 ? 2 : 4;
  return v.toLocaleString('cs-CZ', { minimumFractionDigits: des === 4 ? 2 : 2, maximumFractionDigits: des }) + ' ' + kod;
}
function fxPrevodHTML(rates, poradi) {
  const st = _fxPrevodStav(), r = Object.assign({ CZK: 1 }, rates || {});
  if (!r[st.z]) st.z = 'EUR'; if (!r[st.na]) st.na = 'CZK';
  const kody = ['CZK'].concat(poradi.filter(c => c !== 'CZK'));
  const opt = sel => kody.map(c => `<option value="${c}"${c === sel ? ' selected' : ''}>${(FX_INFO[c] || [c, ''])[1] || ''} ${c}</option>`).join('');
  const vys = fxPrevod(st.castka, st.z, st.na, r);
  const sSel = 'background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 6px;color:var(--text);font-size:.86rem;min-width:0';
  return `<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">💱 Převodník</span></div><div class="card-body">
    <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center">
      <input id="fxPrCastka" class="fi" inputmode="decimal" value="${String(st.castka).replace(/"/g, '')}" oninput="fxPrevodZmen('castka',this.value)" style="font-size:1rem;font-weight:700;min-width:0">
      <select id="fxPrZ" onchange="fxPrevodZmen('z',this.value)" style="${sSel}">${opt(st.z)}</select>
    </div>
    <div style="display:flex;justify-content:center;margin:6px 0"><button class="btn btn-ghost btn-sm" onclick="fxPrevodOtoc()" title="Prohodit měny" aria-label="Prohodit měny">⇅ Prohodit</button></div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center">
      <div id="fxPrVysledek" style="font-size:1.15rem;font-weight:800;color:var(--income);overflow-wrap:anywhere">${_fxFmt(vys, st.na)}</div>
      <select id="fxPrNa" onchange="fxPrevodZmen('na',this.value)" style="${sSel}">${opt(st.na)}</select>
    </div>
    <div id="fxPrKurz" style="font-size:.7rem;color:#a8aec8;margin-top:8px">${_fxPrevodKurzText(st, r)}</div>
  </div></div>`;
}
function _fxPrevodKurzText(st, r) {
  const k = fxPrevod(1, st.z, st.na, r);
  const zdroj = (!_fxData || _fxData.source === 'fallback' || !_fxData.date) ? 'orientační kurz (ČNB teď nedostupné)' : 'kurz ČNB ' + _fxData.date;
  return k == null ? '' : `1 ${st.z} = ${_fxFmt(k, st.na)} · ${zdroj}`;
}
//  Změna pole: překreslí jen výsledek (psaní v poli se nepřeruší)
function fxPrevodZmen(k, v) {
  const st = _fxPrevodStav(); st[k] = v; _fxPrevodUloz();
  const r = Object.assign({ CZK: 1 }, (_fxData && _fxData.rates) || {});
  const out = document.getElementById('fxPrVysledek'); if (out) out.textContent = _fxFmt(fxPrevod(st.castka, st.z, st.na, r), st.na);
  const kz = document.getElementById('fxPrKurz'); if (kz) kz.textContent = _fxPrevodKurzText(st, r);
}
function fxPrevodOtoc() {
  const st = _fxPrevodStav(); const t = st.z; st.z = st.na; st.na = t; _fxPrevodUloz();
  const a = document.getElementById('fxPrZ'), b = document.getElementById('fxPrNa');
  if (a) a.value = st.z; if (b) b.value = st.na;
  fxPrevodZmen('z', st.z);
}
Object.assign(window, { fxPrevod, fxPrevodHTML, fxPrevodZmen, fxPrevodOtoc });

async function renderKurzy(){
  const el = document.getElementById('kurzyContent'); if (!el) return;
  if (!_fxData) {
    el.innerHTML = '<div class="card"><div class="card-body" style="text-align:center;color:#a8aec8;padding:34px">💱 Načítám kurzovní lístek ČNB…</div></div>';
    await fetchFxRates(false);
  }
  const data = _fxData || { rates: {} };
  const rates = data.rates || {};
  const codes = Object.keys(rates).filter(c => c !== 'CZK').sort();
  const pinnedList = getPinnedFx();
  const pinned = pinnedList.filter(c => rates[c] != null);

  const isFallback = (data.source === 'fallback' || !data.date);
  const statusTxt = data.date
    ? ('Kurzovní lístek ČNB · ' + data.date)
    : (isFallback ? '⚠️ ČNB nedostupné – zobrazeny orientační průměry' : 'Kurzy měn');

  let html = '';
  // hlavička (ČNB se aktualizuje 1×/den – ruční obnovení je zbytečné)
  html += '<div class="card" style="margin-bottom:14px"><div class="card-body">'
    + '<div style="font-weight:800;font-size:1.1rem">💱 Kurzy měn</div>'
    + '<div style="font-size:.78rem;color:' + (isFallback ? '#fbbf24' : '#a8aec8') + ';margin-top:2px">' + statusTxt + '</div>'
    + '<div style="font-size:.72rem;color:#a8aec8;margin-top:3px">Kolik Kč stojí 1 jednotka měny. Hvězdičkou připneš měnu nahoru. Kurzy ČNB se aktualizují jednou denně.</div>'
    + '</div></div>';

  // v12.11: převodník (připnuté měny první v nabídce)
  html += fxPrevodHTML(rates, pinned.concat(codes.filter(c => !pinned.includes(c))));

  // připnuté
  if (pinned.length) {
    html += '<div class="card" style="margin-bottom:14px;border:1px solid rgba(251,191,36,.25)"><div class="card-header"><span class="card-title">📌 Připnuté měny</span></div><div class="card-body" style="padding-top:4px">';
    pinned.forEach(c => { html += fxRow(c, rates[c], true); });
    html += '</div></div>';
  }

  // všechny
  html += '<div class="card"><div class="card-header"><span class="card-title">Všechny měny' + (codes.length ? ' (' + codes.length + ')' : '') + '</span></div><div class="card-body" style="padding-top:4px">';
  if (!codes.length) {
    html += '<div style="color:#a8aec8;text-align:center;padding:18px">Žádná data ke zobrazení.</div>';
  } else {
    codes.forEach(c => { html += fxRow(c, rates[c], pinnedList.includes(c)); });
  }
  html += '</div></div>';

  el.innerHTML = html;
}
window.renderKurzy = renderKurzy;

// v8.36: při startu jednou stáhni živé ČNB kurzy a přepiš jimi orientační _FX_RATES (debts.js),
// aby je používal i převodník v poli částky (updateTxConverter) a přepočty cílů (premium.js).
async function initFxRates(){
  try {
    const d = await fetchFxRates(false);
    if (d && d.rates && d.source !== 'fallback' && typeof _FX_RATES !== 'undefined') {
      Object.assign(_FX_RATES, d.rates); // přepíše EUR/USD/PLN/GBP/CHF/HUF… živými kurzy (SKK ČNB nevede → zůstává)
      if (typeof updateTxConverter === 'function') { try { updateTxConverter(); } catch(_){} }
    }
  } catch (e) { /* při neúspěchu necháváme orientační _FX_RATES */ }
}
window.initFxRates = initFxRates;
// Worker cachuje ČNB 1×/den, takže je to levné. Spustíme krátce po startu appky.
if (typeof window !== 'undefined') {
  setTimeout(() => { try { initFxRates(); } catch(e){} }, 4000);
}
