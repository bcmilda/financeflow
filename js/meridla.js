// FinanceFlow · v11.12 · meridla.js · 2026-09-29
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
function merIntervaly(m) {
  const vy = Object.values(m.vyuctovani || {}).filter(v => v && v.od && v.do && v.spotreba > 0 && v.do > v.od)
    .map(v => ({ od: v.od, do: v.do, spotreba: v.spotreba, zdroj: 'vyuctovani' }));
  const od = Object.values(m.odecty || {}).filter(o => o && o.datum && o.stav != null).sort((a, b) => a.datum.localeCompare(b.datum));
  const oi = [];
  for (let i = 1; i < od.length; i++) {
    const s = od[i].stav - od[i - 1].stav;
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
  if (!m.catId) return { soucet: 0, pocet: 0, posledni: [] };
  const tx = (D.transactions || []).filter(t => t && t.type === 'expense' && (t.catId || t.category) === m.catId
    && (!m.subcat || (t.subcat || '') === m.subcat) && (!odData || (t.date || '') > odData) && (!doData || (t.date || '') <= doData));
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
    ...Object.entries(m.odecty || {}).map(([id, x]) => ({ id, typ: 'odecet', d: x.datum, t: `📟 Odečet ${_merDes(x.stav, 2)} ${_merEsc(jed)}` })),
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
      <button class="btn btn-sm" onclick="merFormVyuctovani('${_merEsc(m.id)}')">🧾 Zapsat vyúčtování</button></div>
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
    ${_merPole('Stav měřidla (' + _merEsc(m.jednotka) + ')', `<input class="fi" id="merOdStav" inputmode="decimal" placeholder="${posl ? _merEsc(posl.stav) : '12480'}">`,
      posl ? 'Minule ' + _merDes(posl.stav, 2) + ' (' + _merDatumCz(posl.datum) + ')' : 'Stačí jednou za čas – každý odečet zpřesní odhad.')}
    <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="merUlozOdecet('${_merEsc(id)}')">💾 Uložit odečet</button>`);
}
async function merUlozOdecet(id) {
  const m = (_meridla || {})[id]; if (!m) return;
  const datum = document.getElementById('merOdDatum').value, stav = _merCislo(document.getElementById('merOdStav').value);
  if (!datum || stav == null || stav < 0) { if (typeof showToast === 'function') showToast('Vyplň datum a stav'); return; }
  const posl = Object.values(m.odecty || {}).filter(o => o.datum < datum).sort((a, b) => b.datum.localeCompare(a.datum))[0];
  if (posl && stav < posl.stav && !confirm('Stav je nižší než minule (' + posl.stav + '). Vyměnili ti měřidlo? Uložit i tak.')) return;
  m.odecty = Object.assign({}, m.odecty, { ['o' + Date.now().toString(36)]: { datum, stav } });
  await _merUloz(m); merZavri(); renderEnergiePage();
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
  await _merUloz(m); merZavri(); renderEnergiePage();
}
async function merSmazZaznam(id, typ, zid) {
  const m = (_meridla || {})[id]; if (!m) return;
  if (!confirm('Smazat záznam?')) return;
  const k = typ === 'odecet' ? 'odecty' : 'vyuctovani';
  m[k] = Object.assign({}, m[k]); delete m[k][zid];
  await _merUloz(m); renderEnergiePage();
}
Object.assign(window, { loadMeridla, merFormMeridlo, merZmenDruh, merZmenKat, merUlozMeridlo, merSmazMeridlo, merFormOdecet, merUlozOdecet,
  merFormVyuctovani, merVySaldo, merUlozVyuctovani, merSmazZaznam, merZavri, merKartaHTML });
