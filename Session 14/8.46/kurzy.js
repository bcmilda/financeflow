// FinanceFlow · v8.46 · kurzy.js · 2026-06-27
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

function getPinnedFx(){
  try { return JSON.parse(localStorage.getItem('ff_pinnedFx') || '[]'); } catch(e){ return []; }
}

function togglePinFx(code){
  const list = getPinnedFx();
  const i = list.indexOf(code);
  if (i >= 0) list.splice(i, 1); else list.push(code);
  try { localStorage.setItem('ff_pinnedFx', JSON.stringify(list)); } catch(e){}
  renderKurzy(); // vizuál hned, nezávisle na Firebase
}
window.togglePinFx = togglePinFx;

async function fetchFxRates(force){
  if (_fxLoading) return _fxData;
  _fxLoading = true;
  try {
    const r = await fetch(CNB_URL, { cache: force ? 'no-store' : 'default' });
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
