// FinanceFlow · v11.18 · meridla.js · 2026-10-01
// ══════════════════════════════════════════════════════
//  S24 (E2, Milan): ENERGIE A VODA – MĚŘIDLA A VYÚČTOVÁNÍ
//  cesta: Majetek → 📟 Energie a voda
//
//  Proč: dodavatel ví z odečtů dřív než ty, jestli budeš doplácet. Tady to
//  víš taky – z odečtů měřidla nebo z čísel na vyúčtování.
//
//  PRINCIP (žádné dvojí započítání ani zapisování):
//   • Peníze = transakce záloh, jak je zapisuješ/importuješ dnes
//     (výchozí Bydlení › Energie / Plyn / Voda). Tady se jen ČTOU.
//   • Odečty a vyúčtování NEJSOU transakce – nesou spotřebu (kWh, m³),
//     ne peníze. Nic se nepřičítá do výdajů.
//   • Spotřebu jde zadat dvojím způsobem: stav měřidla kdykoli, nebo
//     spotřebu za období opsanou z vyúčtování (k měřidlu chodit nemusíš).
//
//  Uložení: users/{uid}/meridla/{id} = {…, odecty:{id:{datum,stav}},
//  vyuctovani:{id:{od,do,spotreba,castka,zalohy}}} – vlastní uzel jako
//  vozidla (bez registrace v diff-write, pravidla kryje kaskáda users/$uid).
// ══════════════════════════════════════════════════════

const MER_DRUHY = {
  elektrina: { n: 'Elektřina', ikona: '⚡', jed: 'kWh', sub: ['Elektřina', 'Energie'] },
  plyn:      { n: 'Plyn',      ikona: '🔥', jed: 'kWh', sub: ['Plyn'] },
  voda:      { n: 'Voda',      ikona: '💧', jed: 'm³',  sub: ['Voda'] },
  teplo:     { n: 'Teplo',     ikona: '♨️', jed: 'GJ',  sub: ['Teplo', 'Energie'] },
  jine:      { n: 'Jiné',      ikona: '📟', jed: '',    sub: [] },
};
const MER_JEDNOTKY = ['kWh', 'm³', 'GJ', 'MWh', 'l'];
const MER_OBDOBI = { mesic: ['měsíčně', 1], ctvrtleti: ['čtvrtletně', 3], pololeti: ['pololetně', 6], rok: ['ročně', 12] };
const _MER_URL = uid => `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users/${uid}/meridla`;
let _meridla = null;

// ── úložiště ──
async function loadMeridla(vynutit) {
  if (_meridla !== null && !vynutit) return _meridla;
  if (typeof _isLocalMode !== 'undefined' && _isLocalMode) {
    try { _meridla = JSON.parse(localStorage.getItem('ff_meridla') || '{}') || {}; } catch (e) { _meridla = {}; }
    return _meridla;
  }
  try {
    const uid = window._currentUser?.uid; const t = await window._currentUser?.getIdToken?.();
    if (!uid || !t) return _meridla || {};
    const r = await fetch(`${_MER_URL(uid)}.json?auth=${t}`);
    _meridla = (r.ok ? await r.json() : null) || {};
  } catch (e) { _meridla = _meridla || {}; }
  return _meridla;
}
async function _merUloz(m, smazat) {
  _meridla = _meridla || {};
  if (smazat) delete _meridla[m.id]; else _meridla[m.id] = m;
  if (typeof _isLocalMode !== 'undefined' && _isLocalMode) {
    try { localStorage.setItem('ff_meridla', JSON.stringify(_meridla)); } catch (e) {} return true;
  }
  try {
    const uid = window._currentUser?.uid; const t = await window._currentUser?.getIdToken?.();
    if (!uid || !t) return false;
    const r = await fetch(`${_MER_URL(uid)}/${m.id}.json?auth=${t}`, smazat ? { method: 'DELETE' }
      : { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m) });
    return r.ok;
  } catch (e) { return false; }
}
const meridlaSeznam = () => Object.values(_meridla || {}).filter(m => m && m.id).sort((a, b) => (a.kdy || 0) - (b.kdy || 0));
const _merEsc = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const _merCislo = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/\s/g, '')); return isFinite(n) ? n : null; };
const _merKc = v => (v == null ? '—' : Math.round(v).toLocaleString('cs-CZ') + ' Kč');
const _merDes = (v, d) => v == null ? '—' : (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('cs-CZ');
const _merDatumCz = d => { const [y, m, dd] = String(d || '').split('-'); return y ? `${+dd}. ${+m}. ${y}` : '—'; };

// ── datumy (UTC, bez posunů času) ──
const _merD = s => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d); };
const _merS = t => new Date(t).toISOString().slice(0, 10);
const _merDni = (a, b) => Math.round((_merD(b) - _merD(a)) / 86400000);
function _merPlusMesice(s, n) {
  const d = new Date(_merD(s)); const den = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
  const max = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(den, max)); return _merS(d.getTime());
}

// ── výpočty (čisté funkce – testuje tools/smoke_meridla.js) ──
//  Intervaly spotřeby. Odečty mají přednost před vyúčtováním (přesnější),
//  pokles stavu = výměna měřidla → interval se přeskočí.
//  S24 (v11.14): dvoutarif – odečet {datum, vt, nt}; celkový stav = vt + nt.
const merStav = o => (o && o.stav != null) ? Number(o.stav) : ((o && (o.vt != null || o.nt != null)) ? (Number(o.vt) || 0) + (Number(o.nt) || 0) : null);
window.merStav = merStav;
function merIntervaly(m) {
  const vy = Object.values(m.vyuctovani || {}).filter(v => v && v.od && v.do && v.spotreba > 0 && v.do > v.od)
    .map(v => ({ od: v.od, do: v.do, spotreba: v.spotreba, zdroj: 'vyuctovani' }));
  const od = Object.values(m.odecty || {}).filter(o => o && o.datum && merStav(o) != null).sort((a, b) => a.datum.localeCompare(b.datum));
  const oi = [];
  for (let i = 1; i < od.length; i++) {
    const s = merStav(od[i]) - merStav(od[i - 1]);
    if (s >= 0 && od[i].datum > od[i - 1].datum) oi.push({ od: od[i - 1].datum, do: od[i].datum, spotreba: s, zdroj: 'odecet' });
  }
  return { vyuctovani: vy, odecty: oi };
}
//  Denní spotřeba: každý interval se rozprostře rovnoměrně po dnech [od, do).
function merDenne(m) {
  const { vyuctovani, odecty } = merIntervaly(m);
  const den = {};
  [...vyuctovani, ...odecty].forEach(iv => {       // odečty až druhé → přepíší
    const n = _merDni(iv.od, iv.do); if (n <= 0) return;
    const r = iv.spotreba / n;
    for (let t = _merD(iv.od); t < _merD(iv.do); t += 86400000) den[_merS(t)] = r;
  });
  return den;
}
function merMesicne(den) {
  const o = {};
  Object.entries(den).forEach(([d, v]) => { const k = d.slice(0, 7); o[k] = (o[k] || 0) + v; });
  return o;
}
//  Průměr za posledních max. 90 pokrytých dní.
function merPrumerDenni(den) {
  const dny = Object.keys(den).sort().slice(-90);
  return dny.length ? dny.reduce((a, d) => a + den[d], 0) / dny.length : null;
}
//  Cena za jednotku: z posledního vyúčtování (celková cena / spotřeba – obsahuje
//  i stálé platby a DPH), jinak zadaný tarif.
function merCena(m) {
  const v = Object.values(m.vyuctovani || {}).filter(x => x && x.castka > 0 && x.spotreba > 0).sort((a, b) => (b.do || '').localeCompare(a.do || ''))[0];
  if (v) return { cena: v.castka / v.spotreba, zdroj: 'vyuctovani' };
  if (m.cena > 0) return { cena: m.cena, zdroj: 'tarif' };
  return null;
}
//  Zálohy = transakce v napojené kategorii/podkategorii od data (včetně).
function merZalohy(D, m, odData, doData) {
  //  S24 (v11.17): doplatek z vyúčtování NENÍ záloha – jinak by se započítal dvakrát
  //  (jednou ve vyúčtování, podruhé jako „zaplacená záloha" dalšího období).
  //  S24 (v11.18): vazba z transakce (t.energie) má přednost – záloha patří vybranému
  //  měřidlu bez ohledu na podkategorii (Bydlení › Zálohy). Transakce bez vazby se
  //  dál počítají podle napojené kategorie/podkategorie (starší zápisy).
  const tx = (D.transactions || []).filter(t => t && t.type === 'expense'
    && (t.energie ? (t.energie.meridloId === m.id && t.energie.typ === 'zaloha')
                  : (m.catId && (t.catId || t.category) === m.catId && (!m.subcat || (t.subcat || '') === m.subcat)))
    && (!odData || (t.date || '') > odData) && (!doData || (t.date || '') <= doData));
  const kc = t => (typeof txCZK === 'function') ? txCZK(t, D) : (parseFloat(t.amount || t.amt) || 0);
  return { soucet: tx.reduce((a, t) => a + kc(t), 0), pocet: tx.length, posledni: tx.map(kc) };
}
//  Průměrná měsíční záloha: zadaná, jinak průměr plateb za posledních 6 měsíců.
function merMesicniZaloha(D, m, dnes) {
  if (m.zaloha > 0) return m.zaloha;
  const z = merZalohy(D, m, _merPlusMesice(dnes, -6), dnes);
  return z.pocet ? z.soucet / 6 : null;
}

//  ODHAD VYÚČTOVÁNÍ. Běžné období začíná koncem posledního vyúčtování
//  (jinak prvním odečtem) a trvá podle cyklu (čtvrtletí = 3 měsíce).
//  saldo > 0 = přeplatek (dostaneš zpět), < 0 = nedoplatek (doplatíš).
function merOdhad(m, D, dnes) {
  D = D || (typeof getData === 'function' ? getData() : { transactions: [] });
  dnes = dnes || _merS(Date.now());
  const den = merDenne(m);
  const pokryte = Object.keys(den).sort();
  const vy = Object.values(m.vyuctovani || {}).filter(v => v && v.do).sort((a, b) => b.do.localeCompare(a.do));
  const od = Object.values(m.odecty || {}).filter(o => o && o.datum).sort((a, b) => a.datum.localeCompare(b.datum));
  let start = vy[0] ? vy[0].do : (od[0] ? od[0].datum : null);
  if (!start) return null;
  const mesicu = (MER_OBDOBI[m.obdobi] || MER_OBDOBI.ctvrtleti)[1];
  let konec = _merPlusMesice(start, mesicu);
  while (konec <= dnes) { start = konec; konec = _merPlusMesice(start, mesicu); }   // vyúčtování chybí → další období
  const prumer = merPrumerDenni(den);
  //  Změřeno od začátku období do posledního pokrytého dne, zbytek do dneška odhadem.
  let zmereno = 0, dnyZm = 0;
  pokryte.forEach(d => { if (d >= start && d < dnes) { zmereno += den[d]; dnyZm++; } });
  const dnyDosud = Math.max(0, _merDni(start, dnes));
  const dnyObdobi = _merDni(start, konec);
  const odhadDosud = prumer != null ? zmereno + (dnyDosud - dnyZm) * prumer : (dnyZm ? zmereno : null);
  const odhadObdobi = prumer != null ? zmereno + (dnyObdobi - dnyZm) * prumer : null;
  const c = merCena(m);
  const zal = merZalohy(D, m, start, dnes);
  const mz = merMesicniZaloha(D, m, dnes);
  const zbyvaMesicu = Math.max(0, Math.round(_merDni(dnes, konec) / 30.44));
  const zalohyObdobi = zal.soucet + (mz != null ? mz * zbyvaMesicu : 0);
  const kcDosud = (c && odhadDosud != null) ? odhadDosud * c.cena : null;
  const kcObdobi = (c && odhadObdobi != null) ? odhadObdobi * c.cena : null;
  return {
    start, konec, dnyDosud, dnyObdobi, prumerDenni: prumer, zmerenoDni: dnyZm,
    spotrebaDosud: odhadDosud, spotrebaObdobi: odhadObdobi, cena: c,
    zalohyDosud: zal.soucet, zalohyPocet: zal.pocet, mesicniZaloha: mz, zalohyObdobi,
    kcDosud, kcObdobi,
    saldoDosud: kcDosud != null ? zal.soucet - kcDosud : null,
    saldoObdobi: kcObdobi != null ? zalohyObdobi - kcObdobi : null,
    //  Doporučená záloha, aby období vyšlo nula (zaokrouhleno na 50 Kč).
    doporucenaZaloha: kcObdobi != null ? Math.ceil(kcObdobi / mesicu / 50) * 50 : null,
  };
}
Object.assign(window, { merIntervaly, merDenne, merMesicne, merPrumerDenni, merCena, merZalohy, merOdhad, _merPlusMesice });

// ── stránka 📟 Energie a voda ──
function renderEnergiePage() {
  const el = document.getElementById('energieContent'); if (!el) return;
  if (_meridla === null) { el.innerHTML = '<div class="empty"><div class="ei">📟</div><div class="et">Načítám…</div></div>'; loadMeridla().then(renderEnergiePage); return; }
  const D = getData();
  const mer = meridlaSeznam();
  const intro = (typeof tabIntro === 'function') ? tabIntro('energie', '📟', 'Energie a voda',
    'Spotřeba elektřiny, plynu, vody a tepla a <strong>odhad vyúčtování dopředu</strong> – jestli budeš doplácet, nebo dostaneš přeplatek. Zadáváš jen spotřebu (odečet měřidla nebo čísla z vyúčtování); zálohy appka čte z tvých transakcí, nic se nezapisuje dvakrát.') : '';
  el.innerHTML = intro + `<div style="margin-bottom:12px"><button class="btn btn-primary" onclick="merFormMeridlo()">➕ Přidat měřidlo</button></div>`
    + (mer.length ? mer.map(m => merKartaHTML(m, D)).join('') : `<div class="empty"><div class="ei">📟</div><div class="et">Zatím žádné měřidlo</div>
       <div style="font-size:.78rem;color:#a8aec8;margin-top:6px;line-height:1.5">Přidej elektřinu, plyn nebo vodu a zapiš poslední vyúčtování nebo stav měřidla.</div></div>`);
}
window.renderEnergiePage = renderEnergiePage;

function merKartaHTML(m, D) {
  const dr = MER_DRUHY[m.druh] || MER_DRUHY.jine;
  const jed = m.jednotka || dr.jed;
  const o = merOdhad(m, D);
  const den = merDenne(m);
  const mes = merMesicne(den);
  const klice = Object.keys(mes).sort().slice(-12);
  const max = Math.max(1e-9, ...klice.map(k => mes[k]));
  const graf = klice.length ? `<div style="display:flex;align-items:flex-end;gap:4px;height:74px;margin-top:10px">${klice.map(k => {
      const lon = mes[(+k.slice(0, 4) - 1) + k.slice(4)];
      return `<div title="${k}: ${_merDes(mes[k], 1)} ${_merEsc(jed)}${lon != null ? ' (loni ' + _merDes(lon, 1) + ')' : ''}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="width:100%;height:${Math.max(3, mes[k] / max * 60)}px;background:linear-gradient(180deg,#fbbf24,#f59e0b);border-radius:3px 3px 0 0"></div>
        <div style="font-size:.52rem;color:#8b93ad">${k.slice(5)}</div></div>`; }).join('')}</div>` : '';
  const dl = (l, v, p) => `<div style="background:var(--bg);border-radius:10px;padding:9px 11px">
      <div style="font-size:.66rem;color:#a8aec8">${l}</div><div style="font-size:1rem;font-weight:800;color:var(--text)">${v}</div>
      ${p ? `<div style="font-size:.62rem;color:#8b93ad">${p}</div>` : ''}</div>`;
  let hero = '';
  if (!o) hero = `<div style="font-size:.78rem;color:#a8aec8;line-height:1.5">Zapiš poslední vyúčtování nebo dva stavy měřidla – pak spočítám spotřebu a odhad dalšího vyúčtování.</div>`;
  else if (o.saldoObdobi == null) hero = `<div style="font-size:.78rem;color:#a8aec8;line-height:1.5">${o.cena ? 'Na odhad potřebuju aspoň dva stavy měřidla nebo jedno vyúčtování se spotřebou.' : 'Chybí cena za ' + _merEsc(jed) + ' – zapiš vyúčtování s celkovou cenou, nebo zadej cenu v nastavení měřidla.'}</div>`;
  else {
    const s = o.saldoObdobi, plus = s >= 0;
    hero = `<div style="font-size:.7rem;color:#a8aec8">Odhad za období ${_merDatumCz(o.start)} – ${_merDatumCz(o.konec)}</div>
      <div style="font-size:1.25rem;font-weight:800;color:${plus ? 'var(--income)' : '#f87171'};margin:2px 0">${plus ? 'přeplatek ≈ ' : 'doplatek ≈ '}${_merKc(Math.abs(s))}</div>
      <div style="font-size:.74rem;color:#c3c8dc;line-height:1.5">Spotřeba ≈ ${_merDes(o.spotrebaObdobi, 0)} ${_merEsc(jed)} × ${_merDes(o.cena.cena, 2)} Kč = ${_merKc(o.kcObdobi)} · zálohy ${_merKc(o.zalohyObdobi)}
        ${o.zalohyPocet ? `<span style="color:#8b93ad">(zaplaceno ${_merKc(o.zalohyDosud)} + zbývající)</span>` : ''}</div>
      ${!plus && o.doporucenaZaloha ? `<div style="font-size:.72rem;color:#fbbf24;margin-top:4px">💡 Aby období vyšlo nula, záloha by měla být asi ${_merKc(o.doporucenaZaloha)} měsíčně.</div>` : ''}
      ${o.zmerenoDni < o.dnyDosud ? `<div style="font-size:.66rem;color:#8b93ad;margin-top:4px">Od posledního odečtu odhaduji podle průměru ${_merDes(o.prumerDenni, 2)} ${_merEsc(jed)}/den – přesnější bude nový odečet.</div>` : ''}`;
  }
  const hist = [
    ...Object.entries(m.odecty || {}).map(([id, x]) => ({ id, typ: 'odecet', d: x.datum, t: `📟 Odečet ${x.vt != null ? 'VT ' + _merDes(x.vt, 2) + ' · NT ' + _merDes(x.nt, 2) : _merDes(merStav(x), 2)} ${_merEsc(jed)}` })),
    ...Object.entries(m.vyuctovani || {}).map(([id, x]) => ({ id, typ: 'vyuctovani', d: x.do,
      t: `🧾 Vyúčtování ${_merDatumCz(x.od)} – ${_merDatumCz(x.do)}: ${_merDes(x.spotreba, 1)} ${_merEsc(jed)}${x.castka ? ' · ' + _merKc(x.castka) : ''}${x.zalohy != null && x.castka ? ' · ' + (x.zalohy - x.castka >= 0 ? 'přeplatek ' : 'doplatek ') + _merKc(Math.abs(x.zalohy - x.castka)) : ''}` })),
  ].sort((a, b) => (b.d || '').localeCompare(a.d || '')).slice(0, 8);
  const cat = (D.categories || []).find(c => c.id === m.catId);
  return `<div class="card" style="margin-bottom:12px"><div class="card-body">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <span style="font-size:1.6rem">${dr.ikona}</span>
      <div style="flex:1"><div style="font-weight:800;font-size:1rem;color:var(--text)">${_merEsc(m.nazev || dr.n)}</div>
        <div style="font-size:.7rem;color:#a8aec8">${_merEsc((MER_OBDOBI[m.obdobi] || MER_OBDOBI.ctvrtleti)[0])} vyúčtování${cat ? ' · zálohy z ' + _merEsc((cat.icon || '') + ' ' + cat.name + (m.subcat ? ' › ' + m.subcat : '')) : ' · zálohy nenapojené'}</div></div>
      <button class="btn btn-sm" style="font-size:.7rem" onclick="merFormMeridlo('${_merEsc(m.id)}')">⚙️</button></div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:10px">${hero}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:8px">
      ${dl('Průměr denně', o && o.prumerDenni != null ? _merDes(o.prumerDenni, 2) + ' ' + _merEsc(jed) : '—', '')}
      ${dl('Za měsíc', o && o.prumerDenni != null ? _merDes(o.prumerDenni * 30.44, 0) + ' ' + _merEsc(jed) : '—', 'podle průměru')}
      ${dl('Cena za ' + _merEsc(jed), o && o.cena ? _merDes(o.cena.cena, 2) + ' Kč' : '—', o && o.cena ? (o.cena.zdroj === 'vyuctovani' ? 'z vyúčtování vč. stálých plateb' : 'zadaný tarif') : '')}
      ${dl('Měsíční záloha', o && o.mesicniZaloha != null ? _merKc(o.mesicniZaloha) : '—', m.zaloha > 0 ? 'zadaná' : 'průměr plateb')}
    </div>
    ${graf}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <button class="btn btn-sm" onclick="merFormOdecet('${_merEsc(m.id)}')">📟 Zapsat odečet</button>
      <button class="btn btn-sm" onclick="merFormVyuctovani('${_merEsc(m.id)}')">🧾 Zapsat vyúčtování</button>
      <button class="btn btn-sm btn-primary" onclick="merDetail('${_merEsc(m.id)}')">📊 Detail spotřeby</button></div>
    ${hist.length ? `<details style="margin-top:10px"><summary style="cursor:pointer;font-size:.74rem;color:#a8aec8">Historie (${hist.length})</summary>
      ${hist.map(h => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:.74rem;padding:5px 0;border-top:1px solid var(--border)">
        <span><span style="color:#8b93ad">${_merDatumCz(h.d)}</span> · ${h.t}</span>
        <button onclick="merSmazZaznam('${_merEsc(m.id)}','${h.typ}','${_merEsc(h.id)}')" style="background:none;border:none;color:#f87171;cursor:pointer">✕</button></div>`).join('')}</details>` : ''}
  </div></div>`;
}

// ── formuláře ──
function _merOkno(html) {
  let o = document.getElementById('merOkno');
  if (!o) {
    o = document.createElement('div'); o.id = 'merOkno';
    o.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgba(8,10,20,.85);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:16px 12px';
    o.addEventListener('click', e => { if (e.target === o) merZavri(); });
    document.body.appendChild(o);
  }
  o.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;width:100%;max-width:440px">${html}</div>`;
}
function merZavri() { const o = document.getElementById('merOkno'); if (o) o.remove(); }
const _merPole = (l, inner, hint) => `<div style="margin-top:10px"><div style="font-size:.7rem;color:#a8aec8;margin-bottom:3px">${l}</div>${inner}${hint ? `<div style="font-size:.64rem;color:#8b93ad;margin-top:3px">${hint}</div>` : ''}</div>`;
const _merHlava = t => `<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:800;font-size:1rem;color:var(--text)">${t}</div>
  <button onclick="merZavri()" style="background:none;border:none;color:#a8aec8;font-size:1.3rem;cursor:pointer">✕</button></div>`;

//  Výchozí napojení záloh: Bydlení (cat3) + podkategorie podle druhu.
function merVychoziKategorie(druh, D) {
  D = D || getData();
  const cats = D.categories || [];
  const byd = cats.find(c => c.id === 'cat3') || cats.find(c => /bydlen/i.test(c.name || ''));
  if (!byd) return { catId: '', subcat: '' };
  const subs = byd.subs || [];
  const sub = ((MER_DRUHY[druh] || {}).sub || []).find(s => subs.includes(s)) || '';
  return { catId: byd.id, subcat: sub };
}
window.merVychoziKategorie = merVychoziKategorie;

function merFormMeridlo(id) {
  const D = getData();
  const m = id ? (_meridla || {})[id] : null;
  const druh = m ? m.druh : 'elektrina';
  const vych = m ? { catId: m.catId, subcat: m.subcat } : merVychoziKategorie(druh, D);
  const cats = (D.categories || []).filter(c => c.type === 'expense' || c.type === 'both' || !c.type);
  const cat = cats.find(c => c.id === vych.catId);
  _merOkno(`${_merHlava(m ? '⚙️ Upravit měřidlo' : '➕ Přidat měřidlo')}
    ${_merPole('Druh', `<select class="fi" id="merDruh" onchange="merZmenDruh()" ${m ? 'disabled' : ''}>${Object.entries(MER_DRUHY).map(([k, v]) => `<option value="${k}"${k === druh ? ' selected' : ''}>${v.ikona} ${v.n}</option>`).join('')}</select>`)}
    ${_merPole('Název', `<input class="fi" id="merNazev" maxlength="40" value="${_merEsc(m ? m.nazev : MER_DRUHY[druh].n)}">`, 'např. Elektřina – byt, Voda – chata')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${_merPole('Jednotka', `<select class="fi" id="merJed">${MER_JEDNOTKY.map(j => `<option${j === (m ? m.jednotka : MER_DRUHY[druh].jed) ? ' selected' : ''}>${j}</option>`).join('')}</select>`)}
      ${_merPole('Vyúčtování', `<select class="fi" id="merObdobi">${Object.entries(MER_OBDOBI).map(([k, v]) => `<option value="${k}"${k === (m ? m.obdobi : 'ctvrtleti') ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>`)}
    </div>
    <label style="display:flex;align-items:center;gap:6px;font-size:.76rem;color:#a8aec8;margin-top:10px;cursor:pointer">
      <input type="checkbox" id="merDvou" ${m && m.dvoutarif ? 'checked' : ''}> Dvoutarif – odečítám zvlášť denní (VT) a noční (NT) proud</label>
    ${_merPole('Zálohy platím z kategorie', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <select class="fi" id="merCat" onchange="merZmenKat()"><option value="">— nenapojovat —</option>${cats.map(c => `<option value="${_merEsc(c.id)}"${c.id === vych.catId ? ' selected' : ''}>${_merEsc((c.icon || '') + ' ' + c.name)}</option>`).join('')}</select>
        <select class="fi" id="merSub"><option value="">všechny podkategorie</option>${(cat?.subs || []).map(s => `<option${s === vych.subcat ? ' selected' : ''}>${_merEsc(s)}</option>`).join('')}</select></div>`,
      'Odsud appka čte zaplacené zálohy. Nic se nepřepisuje.')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${_merPole('Cena za jednotku (Kč)', `<input class="fi" id="merCena" inputmode="decimal" placeholder="nepovinné" value="${m && m.cena ? _merEsc(m.cena) : ''}">`, 'jen než zapíšeš vyúčtování')}
      ${_merPole('Měsíční záloha (Kč)', `<input class="fi" id="merZaloha" inputmode="decimal" placeholder="z transakcí" value="${m && m.zaloha ? _merEsc(m.zaloha) : ''}">`, 'prázdné = průměr plateb')}
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="merUlozMeridlo('${m ? _merEsc(m.id) : ''}')">💾 Uložit</button>
    ${m ? `<button class="btn" style="width:100%;margin-top:8px;color:var(--expense)" onclick="merSmazMeridlo('${_merEsc(m.id)}')">Smazat měřidlo</button>` : ''}`);
}
function merZmenDruh() {
  const d = document.getElementById('merDruh').value;
  document.getElementById('merNazev').value = MER_DRUHY[d].n;
  document.getElementById('merJed').value = MER_DRUHY[d].jed || 'kWh';
  const v = merVychoziKategorie(d);
  document.getElementById('merCat').value = v.catId; merZmenKat(); document.getElementById('merSub').value = v.subcat;
}
function merZmenKat() {
  const c = (getData().categories || []).find(x => x.id === document.getElementById('merCat').value);
  document.getElementById('merSub').innerHTML = '<option value="">všechny podkategorie</option>' + (c?.subs || []).map(s => `<option>${_merEsc(s)}</option>`).join('');
}
async function merUlozMeridlo(id) {
  const stary = id ? (_meridla || {})[id] : null;
  const m = Object.assign({}, stary || { id: 'm' + Date.now().toString(36), kdy: Date.now(), druh: document.getElementById('merDruh').value });
  m.nazev = (document.getElementById('merNazev').value || '').trim().slice(0, 40) || (MER_DRUHY[m.druh] || MER_DRUHY.jine).n;
  m.jednotka = document.getElementById('merJed').value;
  m.obdobi = document.getElementById('merObdobi').value;
  m.catId = document.getElementById('merCat').value || '';
  m.subcat = document.getElementById('merSub').value || '';
  if (document.getElementById('merDvou')?.checked) m.dvoutarif = true; else delete m.dvoutarif;
  const c = _merCislo(document.getElementById('merCena').value), z = _merCislo(document.getElementById('merZaloha').value);
  if (c > 0) m.cena = c; else delete m.cena;
  if (z > 0) m.zaloha = z; else delete m.zaloha;
  const ok = await _merUloz(m);
  if (typeof showToast === 'function') showToast(ok ? '📟 Uloženo' : '⚠️ Uložení se nepovedlo');
  merZavri(); renderEnergiePage();
}
async function merSmazMeridlo(id) {
  if (!confirm('Smazat měřidlo i s odečty a vyúčtováními? Transakce záloh zůstanou.')) return;
  await _merUloz({ id }, true); merZavri(); renderEnergiePage();
}

function merFormOdecet(id) {
  const m = (_meridla || {})[id]; if (!m) return;
  const posl = Object.values(m.odecty || {}).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))[0];
  _merOkno(`${_merHlava('📟 Odečet – ' + _merEsc(m.nazev))}
    ${_merPole('Datum', `<input class="fi" id="merOdDatum" type="date" value="${_merS(Date.now())}">`)}
    ${m.dvoutarif ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${_merPole('☀️ Denní proud VT (' + _merEsc(m.jednotka) + ')', `<input class="fi" id="merOdVt" inputmode="decimal" placeholder="${posl && posl.vt != null ? _merEsc(posl.vt) : ''}">`, posl && posl.vt != null ? 'minule ' + _merDes(posl.vt, 2) : '')}
        ${_merPole('🌙 Noční proud NT (' + _merEsc(m.jednotka) + ')', `<input class="fi" id="merOdNt" inputmode="decimal" placeholder="${posl && posl.nt != null ? _merEsc(posl.nt) : ''}">`, posl && posl.nt != null ? 'minule ' + _merDes(posl.nt, 2) : '')}
      </div>`
    : _merPole('Stav měřidla (' + _merEsc(m.jednotka) + ')', `<input class="fi" id="merOdStav" inputmode="decimal" placeholder="${posl ? _merEsc(merStav(posl)) : '12480'}">`,
      posl ? 'Minule ' + _merDes(merStav(posl), 2) + ' (' + _merDatumCz(posl.datum) + ')' : 'Stačí jednou za čas – každý odečet zpřesní odhad.')}
    <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="merUlozOdecet('${_merEsc(id)}')">💾 Uložit odečet</button>`);
}
async function merUlozOdecet(id) {
  const m = (_meridla || {})[id]; if (!m) return;
  const datum = document.getElementById('merOdDatum').value;
  let zaznam;
  if (m.dvoutarif) {
    const vt = _merCislo(document.getElementById('merOdVt')?.value), nt = _merCislo(document.getElementById('merOdNt')?.value);
    if (!datum || vt == null || nt == null || vt < 0 || nt < 0) { if (typeof showToast === 'function') showToast('Vyplň datum, VT i NT'); return; }
    zaznam = { datum, vt, nt };
  } else {
    const stav = _merCislo(document.getElementById('merOdStav').value);
    if (!datum || stav == null || stav < 0) { if (typeof showToast === 'function') showToast('Vyplň datum a stav'); return; }
    zaznam = { datum, stav };
  }
  const posl = Object.values(m.odecty || {}).filter(o => o.datum < datum).sort((a, b) => b.datum.localeCompare(a.datum))[0];
  if (posl && merStav(zaznam) < merStav(posl) && !confirm('Stav je nižší než minule (' + merStav(posl) + '). Vyměnili ti měřidlo? Uložit i tak.')) return;
  m.odecty = Object.assign({}, m.odecty, { ['o' + Date.now().toString(36)]: zaznam });
  await _merUloz(m); merZavri(); renderEnergiePage(); if (_merDetailId === id) merDetail(id);
}

function merFormVyuctovani(id) {
  const m = (_meridla || {})[id]; if (!m) return;
  const posl = Object.values(m.vyuctovani || {}).sort((a, b) => (b.do || '').localeCompare(a.do || ''))[0];
  const od = posl ? posl.do : _merPlusMesice(_merS(Date.now()), -((MER_OBDOBI[m.obdobi] || MER_OBDOBI.ctvrtleti)[1]));
  _merOkno(`${_merHlava('🧾 Vyúčtování – ' + _merEsc(m.nazev))}
    <div style="font-size:.72rem;color:#a8aec8;margin-top:6px;line-height:1.5">Opiš čísla z vyúčtování. Je to jen evidence spotřeby – nevzniká žádná transakce, takže se nic nezapočítá dvakrát.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${_merPole('Období od', `<input class="fi" id="merVyOd" type="date" value="${_merEsc(od)}">`)}
      ${_merPole('do', `<input class="fi" id="merVyDo" type="date" value="${_merEsc(_merPlusMesice(od, (MER_OBDOBI[m.obdobi] || MER_OBDOBI.ctvrtleti)[1]))}">`)}
    </div>
    ${_merPole('Spotřeba za období (' + _merEsc(m.jednotka) + ')', `<input class="fi" id="merVySpot" inputmode="decimal" placeholder="620">`)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${_merPole('Celková cena (Kč)', `<input class="fi" id="merVyCena" inputmode="decimal" placeholder="vč. DPH" oninput="merVySaldo()">`, 'za období, vč. stálých plateb')}
      ${_merPole('Zaplacené zálohy (Kč)', `<input class="fi" id="merVyZal" inputmode="decimal" placeholder="z vyúčtování" oninput="merVySaldo()">`)}
    </div>
    <div id="merVySaldo" style="font-size:.8rem;margin-top:8px"></div>
    <div style="font-size:.66rem;color:#8b93ad;margin-top:6px;line-height:1.5">💡 Doplatek zapiš jako běžný výdaj do kategorie záloh. Vrácený přeplatek jsou tvoje vlastní peníze zpět, ne nový příjem – výsledek období vidíš tady u vyúčtování.</div>
    <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="merUlozVyuctovani('${_merEsc(id)}')">💾 Uložit vyúčtování</button>`);
}
function merVySaldo() {
  const c = _merCislo(document.getElementById('merVyCena')?.value), z = _merCislo(document.getElementById('merVyZal')?.value);
  const el = document.getElementById('merVySaldo'); if (!el) return;
  if (!(c > 0) || z == null) { el.innerHTML = ''; return; }
  const s = z - c;
  el.innerHTML = s >= 0 ? `<span style="color:var(--income)">Přeplatek ${_merKc(s)} – dostaneš zpět</span>` : `<span style="color:#f87171">Doplatek ${_merKc(-s)}</span>`;
}
async function merUlozVyuctovani(id) {
  const m = (_meridla || {})[id]; if (!m) return;
  const od = document.getElementById('merVyOd').value, doo = document.getElementById('merVyDo').value;
  const sp = _merCislo(document.getElementById('merVySpot').value);
  const c = _merCislo(document.getElementById('merVyCena').value), z = _merCislo(document.getElementById('merVyZal').value);
  if (!od || !doo || doo <= od) { if (typeof showToast === 'function') showToast('Zkontroluj období'); return; }
  if (!(sp > 0)) { if (typeof showToast === 'function') showToast('Vyplň spotřebu za období'); return; }
  const v = { od, do: doo, spotreba: sp };
  if (c > 0) v.castka = c; if (z != null && z >= 0) v.zalohy = z;
  m.vyuctovani = Object.assign({}, m.vyuctovani, { ['v' + Date.now().toString(36)]: v });
  await _merUloz(m); merZavri(); renderEnergiePage(); if (_merDetailId === id) merDetail(id);
}
async function merSmazZaznam(id, typ, zid) {
  const m = (_meridla || {})[id]; if (!m) return;
  if (!confirm('Smazat záznam?')) return;
  const k = typ === 'odecet' ? 'odecty' : 'vyuctovani';
  m[k] = Object.assign({}, m[k]); delete m[k][zid];
  await _merUloz(m); renderEnergiePage(); if (_merDetailId === id) merDetail(id);
}
Object.assign(window, { loadMeridla, merFormMeridlo, merZmenDruh, merZmenKat, merUlozMeridlo, merSmazMeridlo, merFormOdecet, merUlozOdecet,
  merFormVyuctovani, merVySaldo, merUlozVyuctovani, merSmazZaznam, merZavri, merKartaHTML });

// ══════════════════════════════════════════════════════
//  S24 (v11.14, Milan): DETAIL SPOTŘEBY
//  cesta: Majetek → 📟 Energie a voda → karta → „📊 Detail spotřeby"
//  Nahoře hrubá statistika, graf vývoje (u dvoutarifu VT/NT), tabulka – po
//  každém odečtu přibude řádek, zálohy od zvoleného data (měřený rok) a dole
//  vyhodnocení po čtvrtletích / pololetích / letech + skutečná vyúčtování.
// ══════════════════════════════════════════════════════
const _merPlusDni = (s, n) => _merS(_merD(s) + n * 86400000);

//  Řádky tabulky: jeden na odečet (čistá funkce).
function merUseky(m) {
  const od = Object.values(m.odecty || {}).filter(o => o && o.datum && merStav(o) != null).sort((a, b) => a.datum.localeCompare(b.datum));
  return od.map((o, i) => {
    const p = i ? od[i - 1] : null;
    const r = { datum: o.datum, stav: merStav(o), vt: o.vt != null ? Number(o.vt) : null, nt: o.nt != null ? Number(o.nt) : null };
    if (p) {
      r.dni = _merDni(p.datum, o.datum);
      const sp = r.stav - merStav(p);
      r.spotreba = sp >= 0 ? sp : null;             // pokles = výměna měřidla
      if (r.vt != null && p.vt != null) { r.spVt = r.vt - Number(p.vt); r.spNt = r.nt - Number(p.nt); if (r.spVt < 0 || r.spNt < 0) r.spVt = r.spNt = null; }
      r.naDen = (r.spotreba != null && r.dni > 0) ? r.spotreba / r.dni : null;
    }
    return r;
  });
}
window.merUseky = merUseky;

//  Denní spotřeba zvlášť VT a NT (jen z odečtů s oběma údaji).
function merDenneTarif(m) {
  const vt = {}, nt = {};
  merUseky(m).forEach((r, i, a) => {
    if (!i || r.spVt == null || !(r.dni > 0)) return;
    for (let t = _merD(a[i - 1].datum); t < _merD(r.datum); t += 86400000) { const d = _merS(t); vt[d] = r.spVt / r.dni; nt[d] = r.spNt / r.dni; }
  });
  return { vt, nt };
}

//  Spotřeba od data do dneška (změřeno + zbytek podle průměru).
function merSpotrebaOd(m, od, dnes) {
  const den = merDenne(m), pr = merPrumerDenni(den);
  let sum = 0, dny = 0;
  Object.keys(den).forEach(d => { if (d >= od && d < dnes) { sum += den[d]; dny++; } });
  const vse = Math.max(0, _merDni(od, dnes));
  return { spotreba: pr != null ? sum + (vse - dny) * pr : sum, zmereno: dny, dni: vse };
}

//  Zálohy za „měřený rok": od zvoleného data (včetně) do dneška.
function merZalohyOd(m, D, od, dnes) {
  dnes = dnes || _merS(Date.now());
  const z = merZalohy(D, m, _merPlusDni(od, -1), dnes);
  const s = merSpotrebaOd(m, od, dnes);
  const c = merCena(m);
  const naklad = c ? s.spotreba * c.cena : null;
  return { od, zaplaceno: z.soucet, pocet: z.pocet, spotreba: s.spotreba, zmereno: s.zmereno, dni: s.dni, cena: c, naklad, saldo: naklad != null ? z.soucet - naklad : null };
}
window.merZalohyOd = merZalohyOd;

//  Vyhodnocení po obdobích (čtvrtletí 3 / pololetí 6 / rok 12 měsíců).
function merObdobiSouhrn(m, D, mesicu, dnes) {
  dnes = dnes || _merS(Date.now());
  const den = merDenne(m), tar = m.dvoutarif ? merDenneTarif(m) : null;
  const dny = Object.keys(den).sort(); if (!dny.length) return [];
  const c = merCena(m);
  const y0 = +dny[0].slice(0, 4), y1 = +dnes.slice(0, 4);
  const out = [];
  for (let y = y0; y <= y1; y++) for (let k = 0; k < 12; k += mesicu) {
    const od = `${y}-${String(k + 1).padStart(2, '0')}-01`, doo = _merPlusMesice(od, mesicu);
    if (doo <= dny[0] || od > dnes) continue;
    let sp = 0, n = 0, vt = 0, nt = 0;
    dny.forEach(d => { if (d >= od && d < doo) { sp += den[d]; n++; if (tar) { vt += tar.vt[d] || 0; nt += tar.nt[d] || 0; } } });
    if (!n) continue;
    const z = merZalohy(D, m, _merPlusDni(od, -1), _merPlusDni(doo, -1));
    const popis = mesicu === 12 ? String(y) : mesicu === 6 ? `${k ? 2 : 1}. pololetí ${y}` : `Q${k / 3 + 1} ${y}`;
    out.push({ popis, od, do: doo, spotreba: sp, vt: tar ? vt : null, nt: tar ? nt : null, pokryto: n, dni: _merDni(od, doo),
      naklad: c ? sp * c.cena : null, zalohy: z.soucet });
  }
  return out;
}
window.merObdobiSouhrn = merObdobiSouhrn;

let _merDetailId = null, _merDetailObdobi = null;
function merDetail(id) {
  const m = (_meridla || {})[id]; if (!m) return;
  _merDetailId = id;
  const D = getData(); const dnes = _merS(Date.now());
  const dr = MER_DRUHY[m.druh] || MER_DRUHY.jine, jed = m.jednotka || dr.jed;
  const us = merUseky(m), o = merOdhad(m, D, dnes), den = merDenne(m), c = merCena(m);
  const posl = us[us.length - 1];
  const rok = dnes.slice(0, 4); let letos = 0; Object.keys(den).forEach(d => { if (d.startsWith(rok)) letos += den[d]; });
  const pr = merPrumerDenni(den);
  const vyu = Object.values(m.vyuctovani || {}).filter(v => v && v.do).sort((a, b) => b.do.localeCompare(a.do));
  const zalOd = m.zalohyOd || (vyu[0] ? vyu[0].do : rok + '-01-01');
  const zo = merZalohyOd(m, D, zalOd, dnes);
  const mesicu = _merDetailObdobi || (MER_OBDOBI[m.obdobi] || MER_OBDOBI.ctvrtleti)[1];
  const obd = merObdobiSouhrn(m, D, mesicu, dnes).reverse();
  const dl = (l, h, p) => `<div style="background:var(--bg);border-radius:10px;padding:9px 11px"><div style="font-size:.66rem;color:#a8aec8">${l}</div>
      <div style="font-size:1rem;font-weight:800;color:var(--text)">${h}</div>${p ? `<div style="font-size:.62rem;color:#8b93ad">${p}</div>` : ''}</div>`;
  const nad = t => `<div style="margin-top:16px;margin-bottom:6px;font-size:.72rem;color:#8b93ad;text-transform:uppercase;letter-spacing:.04em">${t}</div>`;
  const th = (t, l) => `<th style="text-align:${l ? 'left' : 'right'};padding:6px 8px;font-size:.66rem;color:#a8aec8;font-weight:600;white-space:nowrap">${t}</th>`;
  const td = (t, l, x) => `<td style="text-align:${l ? 'left' : 'right'};padding:6px 8px;font-size:.76rem;white-space:nowrap;${x || ''}">${t}</td>`;
  const J = _merEsc(jed), dvou = !!m.dvoutarif;

  // graf po měsících (u dvoutarifu VT + NT nad sebou)
  const mes = merMesicne(den), tar = dvou ? merDenneTarif(m) : null;
  const mVt = tar ? merMesicne(tar.vt) : null, mNt = tar ? merMesicne(tar.nt) : null;
  const kl = Object.keys(mes).sort().slice(-24);
  const graf = kl.length && typeof ffGrafSloupce === 'function' ? ffGrafSloupce(kl.map(k => {
    const a = tar && mVt[k] != null ? mVt[k] : mes[k], b = tar && mNt[k] != null ? mNt[k] : 0;
    return { popis: k.slice(5) + '/' + k.slice(2, 4), a, b, titul: `${k}: ${_merDes(mes[k], 1)} ${jed}${tar && mVt[k] != null ? ` (VT ${_merDes(mVt[k], 1)} · NT ${_merDes(mNt[k], 1)})` : ''}` };
  }), { barva: '#fbbf24', barvaB: '#818cf8' }) : '';

  // tabulka vývoje – nejnovější nahoře
  const tab = us.length ? `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
    <thead><tr style="border-bottom:1px solid var(--border)">${th('Datum', 1)}${dvou ? th('Stav VT') + th('Stav NT') : th('Stav')}${dvou ? th('VT') + th('NT') : ''}${th('Spotřeba')}${th('Dní')}${th(J + '/den')}${c ? th('≈ Kč') : ''}</tr></thead>
    <tbody>${us.slice().reverse().map(r => `<tr style="border-bottom:1px solid var(--border)">
      ${td(_merDatumCz(r.datum), 1)}
      ${dvou ? td(r.vt != null ? _merDes(r.vt, 1) : '—') + td(r.nt != null ? _merDes(r.nt, 1) : '—') : td(_merDes(r.stav, 1))}
      ${dvou ? td(r.spVt != null ? _merDes(r.spVt, 1) : '—', 0, 'color:#fbbf24') + td(r.spNt != null ? _merDes(r.spNt, 1) : '—', 0, 'color:#818cf8') : ''}
      ${td(r.spotreba != null ? '<b>' + _merDes(r.spotreba, 1) + '</b> ' + J : (r.dni ? '<span style="color:#f87171">výměna?</span>' : 'první odečet'))}
      ${td(r.dni || '—')}${td(r.naDen != null ? _merDes(r.naDen, 2) : '—')}
      ${c ? td(r.spotreba != null ? _merKc(r.spotreba * c.cena) : '—') : ''}</tr>`).join('')}</tbody></table></div>`
    : '<div style="font-size:.78rem;color:#a8aec8">Zatím žádný odečet. Každý odečet tu přidá řádek.</div>';

  // zálohy od data
  const zal = `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 12px">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:.78rem">
      Zálohy počítat od <input type="date" class="fi" id="merZalOd" value="${_merEsc(zalOd)}" style="width:auto;font-size:.78rem">
      <button class="btn btn-sm" onclick="merUlozZalohyOd('${_merEsc(id)}')">Použít</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:8px">
      ${dl('Zaplaceno na zálohách', _merKc(zo.zaplaceno), zo.pocet + ' plateb' + (m.catId ? '' : ' · zálohy nenapojené'))}
      ${dl('Spotřeba od ' + _merDatumCz(zalOd), _merDes(zo.spotreba, 0) + ' ' + J, zo.zmereno < zo.dni ? 'část odhadem' : 'změřeno')}
      ${dl('Náklad podle spotřeby', zo.naklad != null ? _merKc(zo.naklad) : '—', c ? _merDes(c.cena, 2) + ' Kč/' + J : 'chybí cena')}
      ${zo.saldo != null ? dl('Zatím', `<span style="color:${zo.saldo >= 0 ? 'var(--income)' : '#f87171'}">${zo.saldo >= 0 ? 'přeplatek ' : 'doplatek '}${_merKc(Math.abs(zo.saldo))}</span>`, '') : ''}
    </div></div>`;

  // vyhodnocení po obdobích
  const volba = [[3, 'Čtvrtletí'], [6, 'Pololetí'], [12, 'Rok']].map(([n, t]) =>
    `<button class="tx-filt-btn${mesicu === n ? ' active' : ''}" onclick="merDetailObdobi(${n})">${t}</button>`).join('');
  const obdTab = obd.length ? `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
    <thead><tr style="border-bottom:1px solid var(--border)">${th('Období', 1)}${th('Spotřeba')}${dvou ? th('VT') + th('NT') : ''}${c ? th('≈ Náklad') : ''}${th('Zálohy')}${c ? th('Rozdíl') : ''}</tr></thead>
    <tbody>${obd.map(p => { const r = p.naklad != null ? p.zalohy - p.naklad : null;
      return `<tr style="border-bottom:1px solid var(--border)">${td(_merEsc(p.popis) + (p.pokryto < p.dni ? ' <span style="font-size:.6rem;color:#8b93ad">(část)</span>' : ''), 1)}
        ${td(_merDes(p.spotreba, 0) + ' ' + J)}${dvou ? td(p.vt ? _merDes(p.vt, 0) : '—') + td(p.nt ? _merDes(p.nt, 0) : '—') : ''}
        ${c ? td(_merKc(p.naklad)) : ''}${td(_merKc(p.zalohy))}
        ${c ? td(r != null ? `<span style="color:${r >= 0 ? 'var(--income)' : '#f87171'}">${r >= 0 ? '+' : '−'}${_merKc(Math.abs(r))}</span>` : '—') : ''}</tr>`; }).join('')}</tbody></table></div>
    <div style="font-size:.64rem;color:#8b93ad;margin-top:4px">Náklad = spotřeba × cena z posledního vyúčtování. Rozdíl + = přeplatek, − = doplatek.</div>`
    : '<div style="font-size:.78rem;color:#a8aec8">Zatím málo dat.</div>';
  const vyuIds = Object.fromEntries(Object.entries(m.vyuctovani || {}).map(([k, v]) => [v.od + '|' + v.do, k]));
  const vyuTab = vyu.length ? vyu.map(v => { const s = (v.castka && v.zalohy != null) ? v.zalohy - v.castka : null;
    const vid = vyuIds[v.od + '|' + v.do];
    const zapl = (D.transactions || []).find(t => t && t.energie && t.energie.vyuctovaniId === vid);
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:.76rem;padding:6px 0;border-top:1px solid var(--border)">
      <span>🧾 ${_merDatumCz(v.od)} – ${_merDatumCz(v.do)} · <b>${_merDes(v.spotreba, 1)} ${J}</b>${v.castka ? ' · ' + _merKc(v.castka) : ''}</span>
      <span style="display:flex;gap:6px;align-items:center">${s != null ? `<span style="color:${s >= 0 ? 'var(--income)' : '#f87171'}">${s >= 0 ? 'přeplatek ' : 'doplatek '}${_merKc(Math.abs(s))}</span>` : ''}
      ${s ? (zapl ? `<span style="color:#8b93ad;font-size:.68rem">✓ zapsáno ${_merDatumCz(zapl.date)}</span>`
        : `<button class="btn btn-sm" style="font-size:.66rem" onclick="merPlatbaForm('${_merEsc(id)}','${_merEsc(vid)}')">➕ ${s > 0 ? 'Přeplatek přišel' : 'Doplatek zaplacen'}</button>`) : ''}</span></div>`; }).join('') : '';

  let w = document.getElementById('merDetailOkno');
  if (!w) {
    w = document.createElement('div'); w.id = 'merDetailOkno';
    w.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(8,10,20,.85);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:16px 10px calc(16px + env(safe-area-inset-bottom))';
    w.addEventListener('click', e => { if (e.target === w) merDetailZavri(); });
    document.body.appendChild(w);
  }
  w.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;width:100%;max-width:780px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-weight:800;font-size:1.05rem;color:var(--text)">${dr.ikona} ${_merEsc(m.nazev || dr.n)} · detail spotřeby</div>
      <button onclick="merDetailZavri()" style="background:none;border:none;color:#a8aec8;font-size:1.3rem;cursor:pointer">✕</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px">
      ${dl('Poslední odečet', posl ? (dvou && posl.vt != null ? 'VT ' + _merDes(posl.vt, 0) + ' · NT ' + _merDes(posl.nt, 0) : _merDes(posl.stav, 1)) : '—', posl ? _merDatumCz(posl.datum) : '')}
      ${dl('Průměr denně', pr != null ? _merDes(pr, 2) + ' ' + J : '—', pr != null ? '≈ ' + _merDes(pr * 30.44, 0) + ' ' + J + ' měsíčně' : '')}
      ${dl('Letos', _merDes(letos, 0) + ' ' + J, c ? '≈ ' + _merKc(letos * c.cena) : '')}
      ${dl('Cena za ' + J, c ? _merDes(c.cena, 2) + ' Kč' : '—', c ? (c.zdroj === 'vyuctovani' ? 'z vyúčtování' : 'tarif') : 'zapiš vyúčtování')}
      ${o && o.saldoObdobi != null ? dl('Odhad období', `<span style="color:${o.saldoObdobi >= 0 ? 'var(--income)' : '#f87171'}">${o.saldoObdobi >= 0 ? 'přeplatek ' : 'doplatek '}${_merKc(Math.abs(o.saldoObdobi))}</span>`, 'do ' + _merDatumCz(o.konec)) : ''}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <button class="btn btn-sm btn-primary" onclick="merFormOdecet('${_merEsc(id)}')">📟 Zapsat odečet</button>
      <button class="btn btn-sm" onclick="merFormVyuctovani('${_merEsc(id)}')">🧾 Zapsat vyúčtování</button></div>
    ${graf ? nad('Vývoj spotřeby po měsících' + (dvou ? ' · <span style="color:#fbbf24">■ VT</span> <span style="color:#818cf8">■ NT</span>' : '')) + graf : ''}
    ${nad('Odečty')}${tab}
    ${nad('Zaplaceno na zálohách (měřený rok)')}${zal}
    ${nad('Vyhodnocení')}<div style="display:flex;gap:6px;margin-bottom:8px">${volba}</div>${obdTab}
    ${vyuTab ? nad('Vyúčtování od dodavatele') + vyuTab : ''}
    ${merPlatbyHTML(m, D)}
  </div>`;
}
function merDetailZavri() { _merDetailId = null; const w = document.getElementById('merDetailOkno'); if (w) w.remove(); }
function merDetailObdobi(n) { _merDetailObdobi = n; if (_merDetailId) merDetail(_merDetailId); }
async function merUlozZalohyOd(id) {
  const m = (_meridla || {})[id]; if (!m) return;
  const v = document.getElementById('merZalOd')?.value;
  if (v) m.zalohyOd = v; else delete m.zalohyOd;
  await _merUloz(m); merDetail(id);
}
Object.assign(window, { merDetail, merDetailZavri, merDetailObdobi, merUlozZalohyOd });


// ══════════════════════════════════════════════════════
//  S24 (v11.17, Milan): DOPLATKY A PŘEPLATKY – PROPOJENÍ S TRANSAKCEMI
//  t.energie = {meridloId, typ:'doplatek'|'preplatek', vyuctovaniId?}
//   • doplatek = výdaj v kategorii záloh, ale NEPOČÍTÁ se jako záloha,
//   • přeplatek = příjem (peníze opravdu přišly na účet), vlastní podkategorie.
//  Oboustranně: z detailu měřidla („➕ Doplatek zaplacen / Přeplatek přišel")
//  i z běžného formuláře transakce (blok 📟 u kategorie záloh nebo u příjmu
//  s podkategorií „Přeplatek…/Vyúčtování…").
// ══════════════════════════════════════════════════════
const MER_PREPLATEK_RE = /p[řr]eplat|vy[úu][čc]tov|vratka/i;
function merPlatbyZaznamy(D, meridloId) {
  return ((D || getData()).transactions || []).filter(t => t && t.energie && t.energie.meridloId === meridloId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
window.merPlatbyZaznamy = merPlatbyZaznamy;
function merPlatbyHTML(m, D) {
  const p = merPlatbyZaznamy(D, m.id);
  if (!p.length) return '';
  const kc = t => (typeof txCZK === 'function') ? txCZK(t, D) : (parseFloat(t.amount || t.amt) || 0);
  return `<div style="margin-top:16px;margin-bottom:6px;font-size:.72rem;color:#8b93ad;text-transform:uppercase;letter-spacing:.04em">Doplatky a přeplatky</div>
    ${p.map(t => `<div style="display:flex;justify-content:space-between;font-size:.76rem;padding:5px 0;border-top:1px solid var(--border)">
      <span>${_merDatumCz(t.date)} · ${t.energie.typ === 'doplatek' ? '💸 doplatek' : '💰 přeplatek'}</span>
      <span style="color:${t.energie.typ === 'doplatek' ? '#f87171' : 'var(--income)'}">${t.energie.typ === 'doplatek' ? '−' : '+'}${_merKc(kc(t))}</span></div>`).join('')}
    <div style="font-size:.64rem;color:#8b93ad;margin-top:4px">Doplatky se nezapočítávají jako zálohy, přeplatky jsou vrácené vlastní peníze.</div>`;
}

//  Zápis z detailu měřidla (předvyplněno z vyúčtování).
function merPlatbaForm(id, vid) {
  const m = (_meridla || {})[id]; if (!m) return;
  const v = (m.vyuctovani || {})[vid] || null;
  const s = v && v.castka && v.zalohy != null ? v.zalohy - v.castka : 0;
  const typ = s > 0 ? 'preplatek' : 'doplatek';
  _merOkno(`${_merHlava(typ === 'doplatek' ? '💸 Doplatek zaplacen' : '💰 Přeplatek přišel')}
    <div style="font-size:.72rem;color:#a8aec8;margin-top:6px;line-height:1.5">${typ === 'doplatek'
      ? 'Zapíše se jako výdaj do kategorie záloh, ale nepočítá se jako záloha – nezapočítá se dvakrát.'
      : 'Zapíše se jako příjem (peníze opravdu přišly). Je to vrácená vlastní záloha, ne mzda.'}<br>⚠️ Pokud platbu importuješ z banky, nezapisuj ji tady – v importované transakci vyber typ v bloku 📟.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${_merPole('Částka (Kč)', `<input class="fi" id="merPlCastka" inputmode="decimal" value="${Math.abs(Math.round(s)) || ''}">`)}
      ${_merPole('Datum', `<input class="fi" id="merPlDatum" type="date" value="${_merS(Date.now())}">`)}</div>
    ${_merPole(typ === 'doplatek' ? 'Zaplaceno z' : 'Přišlo na', typeof ffPenezenkaSelect === 'function' ? ffPenezenkaSelect('merPlWal') : '<select class="fi" id="merPlWal"></select>')}
    <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="merPlatbaUloz('${_merEsc(id)}','${_merEsc(vid || '')}','${typ}')">💾 Uložit</button>`);
}
function merPlatbaUloz(id, vid, typ) {
  const m = (_meridla || {})[id]; if (!m) return;
  const castka = _merCislo(document.getElementById('merPlCastka')?.value);
  const datum = document.getElementById('merPlDatum')?.value;
  const wallet = document.getElementById('merPlWal')?.value || '';
  if (!(castka > 0) || !datum) { if (typeof showToast === 'function') showToast('Vyplň částku a datum'); return; }
  const D = S;
  let catId = m.catId, sub = m.subcat || '';
  if (typ === 'preplatek') {
    const inc = (D.categories || []).filter(c => c.type === 'income' || c.type === 'both');
    const c = inc.find(x => x.id === 'cat8') || inc[0];
    catId = c ? c.id : ''; sub = 'Přeplatek z vyúčtování';
    if (catId && typeof ensureSubcat === 'function') ensureSubcat(catId, sub);
  }
  const tx = { id: (typeof uid === 'function') ? uid() : 'id' + Date.now(), type: typ === 'doplatek' ? 'expense' : 'income',
    name: (typ === 'doplatek' ? 'Doplatek – ' : 'Přeplatek – ') + (m.nazev || 'energie'), amount: castka, amt: castka,
    catId, category: catId, subcat: sub, date: datum, note: 'Vyúčtování', energie: { meridloId: id, typ, ...(vid ? { vyuctovaniId: vid } : {}) } };
  if (wallet) tx.wallet = wallet;
  S.transactions = S.transactions || []; S.transactions.push(tx);
  if (typeof save === 'function') save();
  if (typeof showToast === 'function') showToast(typ === 'doplatek' ? '💸 Doplatek zapsán' : '💰 Přeplatek zapsán');
  merZavri(); merDetail(id);
}

// ── blok 📟 v běžném formuláři transakce (S24 v11.18 – jako ⛽ Tankování) ──
//  Milan: „mám Bydlení › Energie (→ Elektřina) a chci podkategorie Zálohy, Doplatky;
//  elegantní by byla tabulka v transakcích jako u paliva". Vazba je proto EXPLICITNÍ:
//  v transakci vybereš měřidlo a typ platby, nezáleží na názvu podkategorie.
//  Blok se ukáže u Bydlení, u kategorie napojené na měřidlo a u podkategorií
//  typu energie/plyn/voda/teplo/zálohy/doplatky/přeplatky. Volitelně jde rovnou
//  zapsat i stav měřidla k datu platby.
const MER_ENERGIE_RE = /energ|elekt|plyn|vod[ay]|tepl|z[áa]loh|doplat|p[řr]eplat|vy[úu][čc]tov|vratk/i;
const MER_PREPLATEK_RE2 = /p[řr]eplat|vy[úu][čc]tov|vratk|energ|elekt|plyn|vod[ay]|tepl/i;
function merJeBydleni(catId) {
  const c = ((typeof getData === 'function' ? getData() : S).categories || []).find(x => x.id === catId);
  return !!c && (c.id === 'cat3' || /bydlen/i.test(c.name || ''));
}
//  Má se blok ukázat? A které měřidlo předvybrat ('' = nepropojovat).
function merPlatbaKontext(typ, catId, sub) {
  const mer = meridlaSeznam();
  if (!mer.length || (typ !== 'expense' && typ !== 'income')) return null;
  const vazba = mer.filter(m => m.catId && m.catId === catId && (!m.subcat || m.subcat === sub));
  const energ = MER_ENERGIE_RE.test(sub || '');
  if (typ === 'income' && !(MER_PREPLATEK_RE2.test(sub || '') || vazba.length)) return null;
  if (typ === 'expense' && !(vazba.length || energ || merJeBydleni(catId))) return null;
  let tip = vazba[0] || null;
  if (!tip && energ) {
    const t = (sub || '').toLowerCase();
    const druh = /elekt|energ/.test(t) ? 'elektrina' : /plyn/.test(t) ? 'plyn' : /vod/.test(t) ? 'voda' : /tepl/.test(t) ? 'teplo' : '';
    tip = mer.find(m => m.druh === druh) || (mer.length === 1 ? mer[0] : null);
  }
  const typTip = typ === 'income' ? 'preplatek' : (/doplat/i.test(sub || '') ? 'doplatek' : 'zaloha');
  return { meridla: mer, tip: tip ? tip.id : '', typTip };
}
window.merPlatbaKontext = merPlatbaKontext;
//  Zachováno kvůli zpětné kompatibilitě testů / volání (v11.17).
function merPlatbaKandidati(typ, catId, sub) { const k = merPlatbaKontext(typ, catId, sub); return k ? k.meridla : []; }
window.merPlatbaKandidati = merPlatbaKandidati;

let _merPlatbaForm = null;
function merPlatbaNaplnFormular(e) { _merPlatbaForm = e ? Object.assign({ _z: true }, e) : null; }
function merPlatbaObnov() {
  const el = document.getElementById('txEnergieBlock'); if (!el) return;
  const typ = (typeof curTxType !== 'undefined') ? curTxType : 'expense';
  const catId = (typeof selCatId !== 'undefined') ? selCatId : '';
  const sub = (document.getElementById('customSubInput')?.value || '').trim() || ((typeof selSub !== 'undefined') ? selSub : '');
  if (_meridla === null) { el.style.display = 'none'; loadMeridla().then(merPlatbaObnov); return; }
  const k = merPlatbaKontext(typ, catId, sub);
  if (!k) { el.style.display = 'none'; el.innerHTML = ''; return; }
  const f = _merPlatbaForm = _merPlatbaForm || {};
  //  Předvyplnit jen u nového zápisu; uložená vazba (editace) se drží.
  if (!f._z && !f._dotknuto) { f.meridloId = k.tip; f.typ = k.typTip; }
  if (f.meridloId && !k.meridla.some(m => m.id === f.meridloId)) f.meridloId = '';
  if (typ === 'income') f.typ = 'preplatek'; else if (f.typ !== 'doplatek') f.typ = 'zaloha';
  const m = k.meridla.find(x => x.id === f.meridloId);
  const jed = m ? _merEsc(m.jednotka || (MER_DRUHY[m.druh] || MER_DRUHY.jine).jed) : '';
  const inp = (id, pole, ph) => `<input class="fi" id="${id}" inputmode="decimal" placeholder="${ph}" value="${f[pole] != null ? _merEsc(f[pole]) : ''}" oninput="merPlatbaPole('${pole}',this.value,1)" style="font-size:.82rem">`;
  el.style.display = 'block';
  el.innerHTML = `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:700;font-size:.82rem;color:var(--text)">📟 Energie a voda <span style="font-weight:400;color:#a8aec8;font-size:.7rem">· nepovinné</span></div>
      <button type="button" onclick="if(typeof showPage==='function'){closeModal&&closeModal('txModal');showPage('energie')}" style="background:none;border:none;color:#60a5fa;font-size:.72rem;cursor:pointer">Měřidla</button></div>
    <select class="fi" style="font-size:.82rem" onchange="merPlatbaPole('meridloId',this.value)">
      <option value="">— nepropojovat —</option>
      ${k.meridla.map(x => `<option value="${_merEsc(x.id)}"${x.id === f.meridloId ? ' selected' : ''}>${(MER_DRUHY[x.druh] || MER_DRUHY.jine).ikona} ${_merEsc(x.nazev)}</option>`).join('')}
    </select>
    ${m ? `${typ === 'expense' ? `<div style="display:flex;gap:6px;margin-top:8px">
        <button type="button" class="tx-filt-btn${f.typ === 'zaloha' ? ' active' : ''}" onclick="merPlatbaPole('typ','zaloha')">Záloha</button>
        <button type="button" class="tx-filt-btn${f.typ === 'doplatek' ? ' active' : ''}" onclick="merPlatbaPole('typ','doplatek')">Doplatek z vyúčtování</button></div>`
        : '<div style="font-size:.7rem;color:#a8aec8;margin-top:6px">💰 Přeplatek z vyúčtování – vrácené vlastní peníze ze záloh.</div>'}
      <label style="display:flex;align-items:center;gap:6px;font-size:.74rem;color:#a8aec8;margin-top:8px;cursor:pointer">
        <input type="checkbox" ${f.odecet ? 'checked' : ''} onchange="merPlatbaPole('odecet',this.checked)"> 📟 Zapsat i stav měřidla k datu platby</label>
      ${f.odecet ? (m.dvoutarif ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
          <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">☀️ VT (${jed})</div>${inp('merPlVt', 'vt', '')}</div>
          <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">🌙 NT (${jed})</div>${inp('merPlNt', 'nt', '')}</div></div>`
        : `<div style="margin-top:6px"><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">Stav (${jed})</div>${inp('merPlStav', 'stav', '')}</div>`) : ''}`
      : `<div style="font-size:.68rem;color:#8b93ad;margin-top:6px">Vyber měřidlo, pokud je to platba za energie/vodu – započte se do zálohy, doplatku nebo přeplatku.</div>`}
  </div>`;
}
function merPlatbaPole(k, v, bezPrekresleni) {
  _merPlatbaForm = _merPlatbaForm || {}; _merPlatbaForm[k] = v; _merPlatbaForm._dotknuto = true;
  if (!bezPrekresleni) merPlatbaObnov();
}
//  Pro saveTx: {meridloId, typ:'zaloha'|'doplatek'|'preplatek'} nebo null.
function merPlatbaZFormulare(typ, catId, sub) {
  const k = merPlatbaKontext(typ, catId, sub); if (!k) return null;
  const f = _merPlatbaForm || {};
  const mid = f.meridloId != null && (f._z || f._dotknuto) ? f.meridloId : k.tip;
  if (!mid || !k.meridla.some(m => m.id === mid)) return null;
  const t = typ === 'income' ? 'preplatek' : ((f._z || f._dotknuto) ? (f.typ === 'doplatek' ? 'doplatek' : 'zaloha') : k.typTip);
  return { meridloId: mid, typ: t, ...(f.vyuctovaniId ? { vyuctovaniId: f.vyuctovaniId } : {}) };
}
//  Po uložení transakce: volitelný odečet k datu platby (bez druhé transakce).
async function merPlatbaOdecet(datum) {
  const f = _merPlatbaForm; if (!f || !f.odecet || !f.meridloId || !datum) return false;
  const m = (_meridla || {})[f.meridloId]; if (!m) return false;
  let z;
  if (m.dvoutarif) { const vt = _merCislo(f.vt), nt = _merCislo(f.nt); if (vt == null || nt == null) return false; z = { datum, vt, nt }; }
  else { const st = _merCislo(f.stav); if (st == null) return false; z = { datum, stav: st }; }
  m.odecty = Object.assign({}, m.odecty, { ['o' + Date.now().toString(36)]: z });
  f.odecet = false;
  return _merUloz(m);
}
Object.assign(window, { merPlatbaForm, merPlatbaUloz, merPlatbaNaplnFormular, merPlatbaObnov, merPlatbaPole, merPlatbaZFormulare, merPlatbaOdecet });

// ══════════════════════════════════════════════════════
//  S24 (v11.21, Milan): ODEČTY V MĚSÍČNÍM CHECKLISTU + ZÁLOHA PŘED VYMAZÁNÍM
// ══════════════════════════════════════════════════════
//  Úkol „📟 Zapiš stav měřidel" v Dashboard → Tento měsíc (od 1. dne měsíce).
//  Hotovo, když má každé měřidlo v daném měsíci aspoň jeden odečet.
//  Vrací null, když uživatel měřidla nemá (úkol se vůbec neukáže).
let _merChkNacitam = false;
function merChecklistUkol(rok, mesic) {
  if (_meridla === null) {
    if (!_merChkNacitam) { _merChkNacitam = true; loadMeridla().then(() => { if (typeof renderMonthlyChecklist === 'function' && typeof getData === 'function') renderMonthlyChecklist(getData()); }); }
    return null;
  }
  const mer = meridlaSeznam(); if (!mer.length) return null;
  const k = `${rok}-${String(mesic + 1).padStart(2, '0')}`;
  const chybi = mer.filter(m => !Object.values(m.odecty || {}).some(o => o && (o.datum || '').startsWith(k)));
  return { celkem: mer.length, hotovo: mer.length - chybi.length, chybi: chybi.map(m => m.nazev || (MER_DRUHY[m.druh] || MER_DRUHY.jine).n) };
}
window.merChecklistUkol = merChecklistUkol;

//  Záloha Výplatnice, Tankování (vozidla + tankování + příspěvky) a Energie
//  (měřidla + propojené platby) do jednoho JSON souboru – nabízí se před
//  „Vymazat data" (Můj účet). Data jsou čitelná i bez appky.
async function ffZalohaModuly() {
  const D = (typeof S !== 'undefined') ? S : getData();
  try { if (typeof loadVozidla === 'function') await loadVozidla(); } catch (e) {}
  try { await loadMeridla(); } catch (e) {}
  const tx = (D.transactions || []);
  const vybrat = t => ({ datum: t.date, nazev: t.name, castka: t.amount != null ? t.amount : t.amt, kategorie: t.catId || t.category, podkategorie: t.subcat || '', poznamka: t.note || '' });
  const z = {
    aplikace: 'FinanceFlow', typ: 'záloha modulů', vytvoreno: new Date().toISOString(),
    vyplatnice: D.payslips || [],
    tankovani: {
      vozidla: (typeof vozidlaSeznam === 'function') ? vozidlaSeznam() : [],
      tankovani: tx.filter(t => t && t.tank).map(t => Object.assign(vybrat(t), { tank: t.tank })),
      prispevky: tx.filter(t => t && t.vozPrispevek).map(t => Object.assign(vybrat(t), { prispevek: t.vozPrispevek })),
    },
    energie: {
      meridla: meridlaSeznam(),
      platby: tx.filter(t => t && t.energie).map(t => Object.assign(vybrat(t), { energie: t.energie })),
    },
  };
  const pocet = z.vyplatnice.length + z.tankovani.tankovani.length + z.energie.meridla.length;
  const blob = new Blob([JSON.stringify(z, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `FinanceFlow-zaloha-vyplatnice-tankovani-energie-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  if (typeof showToast === 'function') showToast(pocet ? '💾 Záloha stažena' : '💾 Záloha stažena (moduly jsou prázdné)');
  return z;
}
window.ffZalohaModuly = ffZalohaModuly;
