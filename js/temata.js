// FinanceFlow · v12.20 · temata.js · 2026-10-28
// ══════════════════════════════════════════════════════════════════════
//  S28 (v12.20, Milan): ⭐ SLEDOVANÁ TÉMATA – káva, pivo, Mac, kebab…
//  „Hlavní je označit položku a přiřadit ji k tématu“ · „AI paměť by se hodila“ ·
//  automatická slova NE („už takhle je to komplikované“) · štítky NE.
//
//  cesta: Statistiky → ⭐ Sledovaná témata (přehled + rozklik) · označení:
//    Analýza účtenek → editor účtenky → ⭐ u položky
//    Transakce → Upravit → ⭐ Téma (celá platba) / ⭐ u položek účtenky
//
//  PRINCIP (nic se nemíchá, nic dvakrát):
//   • Téma je jen ZNAČKA. Položka i platba zůstávají ve své kategorii a COICOP;
//     rozpočty, report, srovnání s ČSÚ se nemění. Témata se nikdy nesčítají do výdajů.
//   • Celá platba v tématu (hospoda, kavárna) se počítá celá; jinak jen označené
//     položky účtenky (pivo z Lidlu). Obojí najednou pro stejné téma nikdy.
//   • Počítá se z transakcí (t.receiptItems), ne z S.receipts – jeden zdroj.
//   • AI PAMĚŤ: označím-li „Pilsner 0,5 l“ jako 🍺 Pivo, příště se položka stejného
//     názvu označí sama (i ve starých účtenkách). ✕ u jedné položky ji vyřadí a paměť
//     pro ten název zapomene. Totéž pro název platby (McDonald's → 🍔).
//
//  Data (S.uiCfg, synchronizuje se): temata {id:{id,nazev,ikona,kdy}},
//  temataPamet {klíč názvu položky: [id]}, temataPametTx {klíč názvu platby: [id]}.
//  Na položce / transakci: temata [id] (ručně ano), temataNe [id] (ručně ne).
// ══════════════════════════════════════════════════════════════════════

const TEMA_IKONY = ['☕', '🍺', '🍔', '🥙', '🍕', '🌭', '🍟', '🍰', '🍫', '🍷', '🥃', '🥤', '🚬', '🍦', '🥐', '🎮', '🐶', '⭐'];
const _temaCfg = () => { if (typeof S === 'undefined') return {}; S.uiCfg = S.uiCfg || {}; return S.uiCfg; };
const _temaEsc = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const _temaKc = v => Math.round(v || 0).toLocaleString('cs-CZ') + ' Kč';
//  Klíč paměti: sjednocený název (normName) bez znaků, které Firebase v klíči nesnese (FIX-315).
function temaKlic(nazev) {
  const n = (typeof normName === 'function') ? normName(nazev) : String(nazev || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return String(n || '').replace(/[.#$\[\]\/]/g, '_').slice(0, 120);
}
function temataSeznam(D) {
  const t = ((D && D.uiCfg) || (typeof S !== 'undefined' && S.uiCfg) || {}).temata || {};
  return Object.values(t).filter(x => x && x.id && x.nazev).sort((a, b) => (a.kdy || 0) - (b.kdy || 0));
}
const _temaArr = v => Array.isArray(v) ? v : [];
//  Témata položky / platby: ručně ano ∪ paměť − ručně ne (jen existující témata).
function temataPolozky(it, D) {
  const cfg = (D && D.uiCfg) || _temaCfg(), ex = new Set(temataSeznam(D).map(x => x.id));
  const ne = new Set(_temaArr(it && it.temataNe));
  const s = new Set([..._temaArr(it && it.temata), ..._temaArr(((cfg.temataPamet || {})[temaKlic(it && it.name)]))]);
  return [...s].filter(id => ex.has(id) && !ne.has(id));
}
function temataTx(t, D) {
  const cfg = (D && D.uiCfg) || _temaCfg(), ex = new Set(temataSeznam(D).map(x => x.id));
  const ne = new Set(_temaArr(t && t.temataNe));
  const s = new Set([..._temaArr(t && t.temata), ..._temaArr(((cfg.temataPametTx || {})[temaKlic(t && t.name)]))]);
  return [...s].filter(id => ex.has(id) && !ne.has(id));
}
const _temaPlatna = t => t && t.type === 'expense' && !t.splitParent && !t.isBalancing && !(typeof isTransferTx === 'function' && isTransferTx(t));
const _temaItKc = it => (it.lineTotal != null ? parseFloat(it.lineTotal) : (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 1)) || 0;
//  Všechny započítané záznamy tématu: {druh:'platba'|'polozka', t, i, kc, datum, nazev, obchod}
function temaZaznamy(D, id) {
  const out = [];
  (D.transactions || []).forEach(t => {
    if (!_temaPlatna(t)) return;
    if (temataTx(t, D).includes(id)) {
      out.push({ druh: 'platba', t, kc: (typeof txCZK === 'function') ? txCZK(t, D) : (parseFloat(t.amount || t.amt) || 0), datum: String(t.date || ''), nazev: t.name || t.note || '–', obchod: t.receiptStore || '' });
      return;   // celá platba – položky téhož tématu už ne (nic dvakrát)
    }
    (t.receiptItems || []).forEach((it, i) => {
      if (it && temataPolozky(it, D).includes(id)) out.push({ druh: 'polozka', t, i, kc: _temaItKc(it), datum: String(t.date || ''), nazev: it.name || '–', obchod: t.receiptStore || t.name || '' });
    });
  });
  return out.sort((a, b) => b.datum.localeCompare(a.datum));
}
const _temaYm = (y, m) => y + '-' + String(m + 1).padStart(2, '0');
//  Souhrn tématu pro měsíc (y, m): 12 měsíců končících jím, Ø od prvního měsíce s daty, kategorie měsíce.
function temaSouhrn(D, id, y, m) {
  const z = temaZaznamy(D, id), ym = _temaYm(y, m);
  const rada = [];
  for (let k = 11; k >= 0; k--) { let mm = m - k, yy = y; while (mm < 0) { mm += 12; yy--; } rada.push({ ym: _temaYm(yy, mm), kc: 0, pocet: 0 }); }
  const idx = {}; rada.forEach((r, k) => idx[r.ym] = k);
  z.forEach(x => { const k = idx[x.datum.slice(0, 7)]; if (k != null) { rada[k].kc += x.kc; rada[k].pocet++; } });
  const prvniData = (D.transactions || []).filter(_temaPlatna).map(t => String(t.date || '').slice(0, 7)).filter(Boolean).sort()[0] || ym;
  const zapoc = rada.filter(r => r.ym >= prvniData);
  const mesic = z.filter(x => x.datum.slice(0, 7) === ym);
  const kat = {};
  mesic.forEach(x => {
    const cid = x.druh === 'polozka' ? ((x.t.receiptItems[x.i] || {}).itemCatId || x.t.catId || x.t.category) : (x.t.catId || x.t.category);
    const c = (D.categories || []).find(q => q.id === cid);
    const sub = x.druh === 'polozka' ? ((x.t.receiptItems[x.i] || {}).itemSubcat || '') : (x.t.subcat || '');
    const n = c ? ((c.icon ? c.icon + ' ' : '') + c.name + (sub ? ' › ' + sub : '')) : 'Bez kategorie';
    kat[n] = (kat[n] || 0) + x.kc;
  });
  return { rada, kc: rada[11].kc, pocet: rada[11].pocet, prumer: zapoc.length ? zapoc.reduce((a, r) => a + r.kc, 0) / zapoc.length : 0,
    mesic, kategorie: Object.entries(kat).sort((a, b) => b[1] - a[1]) };
}

// ── správa témat ──
function temaUloz(id, nazev, ikona) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return null;
  nazev = String(nazev || '').trim().slice(0, 40); if (!nazev) return null;
  const cfg = _temaCfg(); cfg.temata = Object.assign({}, cfg.temata);
  id = id || ('t' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));   // i dvě témata v jedné ms mají různé id
  cfg.temata[id] = Object.assign({}, cfg.temata[id], { id, nazev, ikona: ikona || '⭐', kdy: (cfg.temata[id] && cfg.temata[id].kdy) || Date.now() });
  if (typeof save === 'function') save();
  return id;
}
function temaSmaz(id) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const cfg = _temaCfg(); const t = Object.assign({}, cfg.temata); delete t[id]; cfg.temata = t;
  ['temataPamet', 'temataPametTx'].forEach(k => { const p = Object.assign({}, cfg[k]);
    Object.keys(p).forEach(kl => { p[kl] = _temaArr(p[kl]).filter(x => x !== id); if (!p[kl].length) delete p[kl]; }); cfg[k] = p; });
  if (typeof save === 'function') save();   // značky na položkách bez definice se ignorují
}
//  Přepnutí značky na objektu (položka / platba) + paměť pro jeho název.
function _temaPrepni(obj, id, pametKlic) {
  const cfg = _temaCfg(), pam = Object.assign({}, cfg[pametKlic]), kl = temaKlic(obj.name);
  const aktivni = (pametKlic === 'temataPamet' ? temataPolozky(obj) : temataTx(obj)).includes(id);
  if (aktivni) {
    obj.temata = _temaArr(obj.temata).filter(x => x !== id); if (!obj.temata.length) delete obj.temata;
    if (kl && pam[kl]) { pam[kl] = _temaArr(pam[kl]).filter(x => x !== id); if (!pam[kl].length) delete pam[kl]; }
    obj.temataNe = [...new Set([..._temaArr(obj.temataNe), id])];
  } else {
    obj.temata = [...new Set([..._temaArr(obj.temata), id])];
    obj.temataNe = _temaArr(obj.temataNe).filter(x => x !== id); if (!obj.temataNe.length) delete obj.temataNe;
    if (kl) pam[kl] = [...new Set([..._temaArr(pam[kl]), id])];
  }
  cfg[pametKlic] = pam;
  return !aktivni;
}
//  Položka účtenky v transakci (+ stejná položka v S.receipts, ať editor účtenky ukazuje totéž).
function temaPrepniPolozku(txId, i, id) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const t = (S.transactions || []).find(x => x.id == txId); const it = t && (t.receiptItems || [])[i]; if (!it) return;
  const zap = _temaPrepni(it, id, 'temataPamet');
  const r = (S.receipts || []).find(x => x && x.date === t.receiptDate && (x.store || '').toLowerCase() === (t.receiptStore || '').toLowerCase());
  const ri = r && (r.items || [])[i];
  if (ri && ri.name === it.name) { if (it.temata) ri.temata = it.temata.slice(); else delete ri.temata; if (it.temataNe) ri.temataNe = it.temataNe.slice(); else delete ri.temataNe; }
  if (typeof save === 'function') save();
  return zap;
}
function temaPrepniTx(txId, id) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const t = (S.transactions || []).find(x => x.id == txId); if (!t) return;
  const zap = _temaPrepni(t, id, 'temataPametTx');
  if (typeof save === 'function') save();
  return zap;
}
//  Editor účtenky (rozpracovaná účtenka): značka se uloží s účtenkou, paměť hned.
function temaPrepniVEditoru(i, id) {
  const r = (typeof rpEditor === 'function') ? rpEditor() : null; const it = r && (r.items || [])[i]; if (!it) return;
  _temaPrepni(it, id, 'temataPamet');
  if (typeof save === 'function') save();
  if (typeof rpRender === 'function') rpRender();
}

// ── UI: chipy témat (sdílené – editor účtenky, úprava transakce) ──
function temaChipyHTML(aktivni, onclick) {
  const tem = temataSeznam();
  if (!tem.length) return `<span style="font-size:.7rem;color:#8b93ad">Nejdřív si založ téma: Statistiky → ⭐ Sledovaná témata → ＋ Téma</span>`;
  return tem.map(x => { const a = aktivni.includes(x.id);
    return `<button type="button" class="btn btn-sm" style="font-size:.72rem;padding:3px 9px;border-radius:14px;${a ? 'background:rgba(251,191,36,.18);border:1px solid #fbbf24;color:var(--text);font-weight:700' : 'opacity:.75'}" onclick="${onclick(x.id)}">${_temaEsc(x.ikona)} ${_temaEsc(x.nazev)}</button>`; }).join(' ');
}
//  Úprava transakce: ⭐ celá platba + ⭐ u položek účtenky (jen u úpravy výdaje).
function temaTxRender(txId) {
  const box = document.getElementById('txTemataBox'); if (!box) return;
  const t = (getData().transactions || []).find(x => x.id == txId);
  if (!t || !_temaPlatna(t) || (typeof viewingUid !== 'undefined' && viewingUid)) { box.style.display = 'none'; box.innerHTML = ''; return; }
  const idS = String(t.id).replace(/'/g, '');
  const pol = (t.receiptItems || []).map((it, i) => ({ it, i })).filter(x => x.it && x.it.name);
  const aktT = temataTx(t);
  box.innerHTML = `<div style="font-size:.7rem;color:#a8aec8;font-weight:700;letter-spacing:.04em;margin-bottom:4px">⭐ SLEDOVANÉ TÉMA <span style="font-weight:400">(jen značka – kategorie a statistiky se nemění)</span></div>
    <div style="display:flex;gap:4px;flex-wrap:wrap">${temaChipyHTML(aktT, id => `temaPrepniTx('${idS}','${id}');temaTxRender('${idS}')`)}</div>
    ${pol.length && temataSeznam().length ? `<details style="margin-top:6px"${pol.some(x => temataPolozky(x.it).length) ? ' open' : ''}><summary style="cursor:pointer;font-size:.74rem;color:#c2c7da">⭐ u položek účtenky (${pol.length})${aktT.length ? ' – platba je v tématu celá' : ''}</summary>
      ${pol.map(({ it, i }) => `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:5px 0;border-top:1px solid var(--border);font-size:.74rem">
        <span style="flex:1 1 120px;min-width:0">${_temaEsc(it.name)} <span style="color:#8b93ad">${_temaKc(_temaItKc(it))}</span></span>
        <span style="display:flex;gap:3px;flex-wrap:wrap">${temaChipyHTML(temataPolozky(it), id => `temaPrepniPolozku('${idS}',${i},'${id}');temaTxRender('${idS}')`)}</span></div>`).join('')}</details>` : ''}`;
  box.style.display = 'block';
}
//  Editor účtenky: ⭐ tlačítko u položky a chipy pod řádkem (otevřený jeden řádek).
let _rpTemaOtev = null;
function rpTemaTlacitko(it, i) {
  const akt = temataPolozky(it), tem = temataSeznam().filter(x => akt.includes(x.id));
  return `<button onclick="_rpTemaOtev=_rpTemaOtev===${i}?null:${i};rpRender()" title="⭐ Sledované téma (káva, pivo…)"
    style="background:${akt.length ? 'rgba(251,191,36,.18)' : 'var(--surface2)'};border:1px solid ${akt.length ? '#fbbf24' : 'var(--border)'};border-radius:7px;cursor:pointer;font-size:.8rem;padding:4px 0;width:32px;flex-shrink:0;color:var(--text)">${tem.length ? _temaEsc(tem[0].ikona) : '☆'}</button>`;
}
function rpTemaPodRadkem(it, i) {
  if (_rpTemaOtev !== i) return '';
  return `<div style="width:calc(100vw - 84px);max-width:370px;box-sizing:border-box;padding:4px 2px 8px;border-bottom:1px solid var(--border);display:flex;gap:4px;flex-wrap:wrap;align-items:center">
    <span style="font-size:.68rem;color:#a8aec8">⭐ téma:</span>${temaChipyHTML(temataPolozky(it), id => `temaPrepniVEditoru(${i},'${id}')`)}</div>`;
}

// ── UI: Statistiky → ⭐ Sledovaná témata ──
let _temaOtev = null, _temaForm = null;   // _temaForm = {id|null}
function temataRender() {
  const box = document.getElementById('temataBox'); if (!box) return;
  const D = getData(), tem = temataSeznam(D), y = S.curYear, m = S.curMonth;
  const ro = typeof viewingUid !== 'undefined' && viewingUid;
  const mesNazev = (typeof CZ_M !== 'undefined' ? CZ_M[m] : String(m + 1)).toLowerCase() + ' ' + y;
  const form = _temaForm ? (() => { const e = _temaForm.id ? ((D.uiCfg || {}).temata || {})[_temaForm.id] : null; const ik = _temaForm.ikona || (e && e.ikona) || '⭐';
    return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;margin:8px 0">
      <div style="font-size:.7rem;color:#a8aec8;font-weight:700;margin-bottom:4px">${e ? '✎ Upravit téma' : '⭐ Nové téma'}</div>
      <input class="fi" id="temaNazev" maxlength="40" placeholder="např. Káva, Pivo, McDonald's" value="${_temaEsc(e ? e.nazev : (_temaForm.nazev || ''))}" style="margin-bottom:6px">
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">${TEMA_IKONY.map(i => `<button type="button" onclick="_temaForm.nazev=document.getElementById('temaNazev').value;_temaForm.ikona='${i}';temataRender()" style="width:34px;height:34px;border-radius:9px;border:1px solid ${i === ik ? 'var(--income)' : 'var(--border)'};background:${i === ik ? 'rgba(74,222,128,.12)' : 'var(--surface)'};font-size:1.05rem;cursor:pointer">${i}</button>`).join('')}</div>
      <div style="display:flex;gap:6px"><button class="btn btn-sm btn-primary" onclick="temaUlozForm()">💾 Uložit téma</button><button class="btn btn-sm btn-ghost" onclick="_temaForm=null;temataRender()">Zrušit</button></div></div>`; })() : '';
  const rows = tem.map(x => {
    const s = temaSouhrn(D, x.id, y, m), zm = s.prumer > 0 ? Math.round((s.kc - s.prumer) / s.prumer * 100) : null;
    const mx = Math.max(1, s.kc, s.prumer);
    const otev = _temaOtev === x.id;
    return `<div style="padding:9px 0;border-top:1px solid var(--border)">
      <div style="display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:center;cursor:pointer" onclick="_temaOtev=_temaOtev==='${x.id}'?null:'${x.id}';temataRender()" role="button" aria-expanded="${otev}">
        <div style="font-size:1.3rem;text-align:center">${_temaEsc(x.ikona)}</div>
        <div style="min-width:0"><div style="font-weight:600;font-size:.88rem">${_temaEsc(x.nazev)} <span style="color:#8b93ad;font-size:.7rem">${otev ? '▴' : '▾'}</span></div>
          <div style="font-size:.7rem;color:#a8aec8;margin-top:2px">${s.pocet}× · Ø 12 měs. ${_temaKc(s.prumer)}</div>
          <div style="height:5px;background:var(--surface3);border-radius:3px;margin-top:5px;position:relative"><div style="height:5px;border-radius:3px;width:${(s.kc / mx * 100).toFixed(0)}%;background:#fbbf24"></div>${s.prumer > 0 ? `<div style="position:absolute;top:-3px;left:${(s.prumer / mx * 100).toFixed(0)}%;width:2px;height:11px;background:#e8eaf2;opacity:.8"></div>` : ''}</div></div>
        <div style="text-align:right"><div style="font-weight:800;font-size:.95rem;white-space:nowrap">${_temaKc(s.kc)}</div>
          ${zm != null && s.pocet ? `<div style="font-size:.68rem;white-space:nowrap;color:${zm > 0 ? '#f87171' : 'var(--income)'}">${zm > 0 ? '▲' : '▼'} ${Math.abs(zm)} % ${zm > 0 ? 'nad' : 'pod'} Ø</div>` : ''}</div></div>
      ${otev ? _temaDetailHTML(D, x, s, ro) : ''}</div>`;
  }).join('');
  box.innerHTML = `<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">⭐ Sledovaná témata · ${_temaEsc(mesNazev)}</span>${ro ? '' : `<button class="btn btn-sm" onclick="_temaForm={id:null};temataRender()">＋ Téma</button>`}</div>
    <div class="card-body">${form}
      ${tem.length ? rows : `<div style="font-size:.76rem;color:#a8aec8;line-height:1.55">Sleduj, kolik tě stojí třeba káva, pivo nebo McDonald – bez změny kategorií. Založ téma (＋ Téma) a pak u položky účtenky (editor účtenky → ⭐) nebo u platby (Transakce → Upravit → ⭐) vyber, kam patří. Stejný název appka příště označí sama.</div>`}
      ${tem.length ? `<div style="font-size:.68rem;color:#8b93ad;margin-top:8px;line-height:1.5">Témata jen ukazují, kolik tě stojí – kategorie, rozpočty, COICOP ani report nemění a nesčítají se (proto tu není součet). Bílá čárka = průměr 12 měsíců.</div>` : ''}
    </div></div>`;
}
function _temaDetailHTML(D, x, s, ro) {
  const W = 340, H = 140, L = 44, P = 10, B = 22, sw = (W - L - P) / 12, mx = Math.max(1, ...s.rada.map(r => r.kc), s.prumer);
  const Y = v => H - B - v / mx * (H - B - P);
  window._temaRada = s.rada;
  const bars = s.rada.map((r, k) => `<rect data-tsl="${k}" x="${(L + k * sw + 2).toFixed(1)}" y="${Y(r.kc).toFixed(1)}" width="${(sw - 4).toFixed(1)}" height="${Math.max(r.kc > 0 ? 1.5 : 0, H - B - Y(r.kc)).toFixed(1)}" rx="2" fill="${k === 11 ? '#fde68a' : '#f59e0b'}" stroke="${k === 11 ? '#e8eaf2' : 'none'}" stroke-width="1.5"/>
    <rect x="${(L + k * sw).toFixed(1)}" y="${P}" width="${sw.toFixed(1)}" height="${H - P}" fill="transparent" style="cursor:pointer" onclick="event.stopPropagation();temaSloupec(${k})"/>`).join('');
  const osa = s.rada.map((r, k) => { const mo = +r.ym.slice(5); return `<text x="${(L + k * sw + sw / 2).toFixed(1)}" y="${H - 8}" font-size="10" fill="#a8aec8" text-anchor="middle">${mo}</text>${k === 0 || mo === 1 ? `<text x="${(L + k * sw + sw / 2).toFixed(1)}" y="${H + 3}" font-size="8.5" fill="#7e84a0" text-anchor="middle">’${r.ym.slice(2, 4)}</text>` : ''}`; }).join('');
  const mriz = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - P}" y1="${Y(mx * f).toFixed(1)}" y2="${Y(mx * f).toFixed(1)}" stroke="rgba(148,163,184,.18)"/><text x="${L - 5}" y="${(Y(mx * f) + 3.5).toFixed(1)}" font-size="9.5" fill="#a8aec8" text-anchor="end">${Math.round(mx * f).toLocaleString('cs-CZ')}</text>`).join('');
  const avg = s.prumer > 0 ? `<line x1="${L}" x2="${W - P}" y1="${Y(s.prumer).toFixed(1)}" y2="${Y(s.prumer).toFixed(1)}" stroke="#e8eaf2" stroke-dasharray="4 3" stroke-width="1.2" opacity=".7"/>` : '';
  const dt = d => { const [yy, mm, dd] = d.split('-'); return `${+dd}. ${+mm}.`; };
  const seznam = s.mesic.map(z => { const idS = String(z.t.id).replace(/'/g, '');
    const zrus = z.druh === 'platba' ? `temaPrepniTx('${idS}','${x.id}');temataRender()` : `temaPrepniPolozku('${idS}',${z.i},'${x.id}');temataRender()`;
    return `<div style="display:grid;grid-template-columns:1fr auto 28px;gap:8px;align-items:center;padding:7px 0;border-top:1px solid var(--border);font-size:.78rem">
      <div style="min-width:0">${dt(z.datum)} · ${_temaEsc(z.druh === 'polozka' ? (z.obchod || '') : z.nazev)}<br><span style="color:#a8aec8">${_temaEsc(z.druh === 'polozka' ? z.nazev : 'celá platba')}</span>
        <span style="font-size:.62rem;padding:1px 6px;border-radius:5px;margin-left:4px;${z.druh === 'polozka' ? 'background:rgba(74,222,128,.15);color:#86efac">🧾 jen položka' : 'background:rgba(96,165,250,.15);color:#93c5fd">celá platba'}</span></div>
      <b style="white-space:nowrap">${_temaKc(z.kc)}</b>
      ${ro ? '<span></span>' : `<button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:2px 0" title="Sem nepatří (a zapomenout)" onclick="event.stopPropagation();${zrus}">✕</button>`}</div>`; }).join('');
  return `<div style="margin:8px 0 2px;padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:10px" onclick="event.stopPropagation()">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
      ${[['Tento měsíc', _temaKc(s.kc)], ['Ø 12 měsíců', _temaKc(s.prumer)], ['Nákupů', s.pocet + '×']].map(([l, v]) => `<div style="background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:7px 8px"><div style="font-size:.6rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.04em">${l}</div><div style="font-weight:800;font-size:.92rem">${v}</div></div>`).join('')}</div>
    <div style="font-size:.68rem;color:#a8aec8">Útrata po měsících · ┄ průměr · klepni na sloupec</div>
    <svg viewBox="0 0 ${W} ${H + 6}" style="width:100%;height:auto;display:block" role="img" aria-label="${_temaEsc(x.nazev)} po měsících">${mriz}${avg}${bars}${osa}</svg>
    <div id="temaBublina" style="font-size:.74rem;min-height:1.2em;margin:2px 0 6px"><b>${(typeof CZ_M !== 'undefined' ? CZ_M[S.curMonth] : '')} ${S.curYear}: ${_temaKc(s.kc)}</b> · ${s.pocet}×</div>
    <div style="font-weight:700;font-size:.8rem;margin-top:6px">Co jsem započítal (${s.mesic.length})</div>
    ${seznam || '<div style="font-size:.72rem;color:#8b93ad;padding:4px 0">Ve vybraném měsíci nic. Označ položku ⭐ v editoru účtenky nebo platbu v Transakce → Upravit.</div>'}
    ${s.kategorie.length ? `<div style="font-weight:700;font-size:.8rem;margin-top:10px">Kde to je v kategoriích</div>${s.kategorie.map(([n, v]) => `<div style="display:flex;justify-content:space-between;font-size:.74rem;padding:4px 0;color:#c2c7da"><span>${_temaEsc(n)}</span><b>${_temaKc(v)}</b></div>`).join('')}
      <div style="font-size:.66rem;color:#8b93ad;margin-top:2px">Položky zůstávají ve svých kategoriích. ✕ = sem nepatří (appka zapomene i název).</div>` : ''}
    ${ro ? '' : `<div style="display:flex;gap:6px;margin-top:10px"><button class="btn btn-sm" onclick="event.stopPropagation();_temaForm={id:'${x.id}'};temataRender()">✎ Upravit</button><button class="btn btn-sm btn-ghost" style="color:#f87171" onclick="event.stopPropagation();if(confirm('Smazat téma ${_temaEsc(x.nazev).replace(/'/g, '')}? Platby i položky zůstanou, jen zmizí značka.')){temaSmaz('${x.id}');_temaOtev=null;temataRender()}">🗑 Smazat téma</button></div>`}
  </div>`;
}
function temaSloupec(k) {
  const r = (window._temaRada || [])[k], el = document.getElementById('temaBublina'); if (!r || !el) return;
  el.innerHTML = `<b>${typeof CZ_M !== 'undefined' ? CZ_M[+r.ym.slice(5) - 1] : r.ym} ${r.ym.slice(0, 4)}: ${_temaKc(r.kc)}</b> · ${r.pocet}×`;
  document.querySelectorAll('#temataBox [data-tsl]').forEach(b => b.setAttribute('stroke', +b.getAttribute('data-tsl') === k ? '#e8eaf2' : 'none'));
}
function temaUlozForm() {
  const n = (document.getElementById('temaNazev')?.value || '').trim();
  if (!n) { if (typeof showToast === 'function') showToast('Napiš název tématu'); return; }
  const e = _temaForm && _temaForm.id ? ((getData().uiCfg || {}).temata || {})[_temaForm.id] : null;
  const id = temaUloz(_temaForm && _temaForm.id, n, (_temaForm && _temaForm.ikona) || (e && e.ikona) || '⭐');
  _temaForm = null; if (id) _temaOtev = id; temataRender();
  if (typeof showToast === 'function') showToast('⭐ Téma uloženo – označ položky ⭐ v účtence nebo platby v Transakcích');
}
Object.assign(window, { temaKlic, temataSeznam, temataPolozky, temataTx, temaZaznamy, temaSouhrn, temaUloz, temaSmaz,
  temaPrepniPolozku, temaPrepniTx, temaPrepniVEditoru, temaChipyHTML, temaTxRender, rpTemaTlacitko, rpTemaPodRadkem,
  temataRender, temaSloupec, temaUlozForm });
