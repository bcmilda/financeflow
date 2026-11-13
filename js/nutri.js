// FinanceFlow · v12.47 · nutri.js · 2026-11-13
// ══════════════════════════════════════════════════════
//  S29 (v12.47, Milan): 🥕 NUTRIDATABÁZE (ÚZEI) – živiny nebalených potravin
//  „Zkusíš teď napojit Nutridatabase s párovací tabulkou a pak s kartou Moje výrobky a Mapa položek?“
//  Plán: claude/PLAN-NUTRIDATABAZE.md. Rozhodnutí Milana (S29): ÚZEI se nepíše; žádné odhady – balený výrobek
//  s čárovým kódem bez dat z Open Food Facts hodnoty z NutriDatabáze NEDOSTANE; na kartě hodnoty na 100 g
//  přímo z tabulky.
//
//  KDE DATA LEŽÍ (licence čl. 5 – soubor se nesmí postoupit dál ani zčásti):
//   • hodnoty: jen ve workeru (R2 nutri/data.json). Appka si řekne o potraviny, které potřebuje (max 60
//     na požadavek) a drží je v localStorage. Celý soubor do prohlížeče nikdy nejde.
//   • párovací tabulka obecný název → kód: data/nutri-mapa.json (jen kódy) = výchozí návrh, který se při
//     nahrání CSV uloží do workeru; opravy dělá admin v Admin → 🥕 NutriDatabáze. Uživatelé dostanou jen
//     páry „jistá“ nebo „potvrzená adminem“ – „návrh“ se nepoužije, dokud ho admin nepotvrdí.
//   • citace čl. 6 u každé hodnoty: „Na základě dat z NutriDatabaze.cz, verze 11.26, ÚZEI, Praha“.
//
//  KDY SE POUŽIJE (pořadí zdrojů živin): 1) fotka / ruční zápis (karta výrobku nebo osobní karta),
//  2) Open Food Facts podle čárového kódu, 3) NutriDatabáze – JEN u položky bez čárového kódu nebo s kódem
//  obchodu (začíná 2: vážené zboží, pečivo), jejíž obecný název (taxonomie) má potvrzený pár.
//  Hodnoty jsou na 100 g JEDLÉHO podílu: Živiny v nákupu násobí koupenou váhu podílem jedlé části
//  (1 kg banánů = 640 g), karta výrobku ukazuje hodnoty na 100 g přímo z tabulky.
// ══════════════════════════════════════════════════════
const NUTRI_CITACE = 'Na základě dat z NutriDatabaze.cz, verze 11.26, ÚZEI, Praha';
const NUTRI_UZEI_URL = 'https://www.uzei.cz';
const NUTRI_LS_MAPA = 'ff_nutriMapa', NUTRI_LS_HODN = 'ff_nutriHodnoty';
const NUTRI_TTL_MAPA = 24 * 3600 * 1000, NUTRI_TTL_HODN = 30 * 24 * 3600 * 1000, NUTRI_DAVKA = 60;
const NUTRI_POLE = ['kcal', 'tuky', 'nasycene', 'sacharidy', 'cukry', 'vlaknina', 'bilkoviny', 'sul'];
let _nutriMapa = null, _nutriHodnoty = null, _nutriCitace = NUTRI_CITACE, _nutriChybi = new Set(), _nutriNacitani = null;

function _nutriLs(klic, ttl) {
  try { const v = JSON.parse(localStorage.getItem(klic) || 'null'); return v && v.t && Date.now() - v.t < ttl ? v : null; } catch (e) { return null; }
}
function _nutriLsUloz(klic, v) { try { localStorage.setItem(klic, JSON.stringify(Object.assign({ t: Date.now() }, v))); } catch (e) {} }
function _nutriPriprav() {
  if (_nutriMapa === null) { const v = _nutriLs(NUTRI_LS_MAPA, NUTRI_TTL_MAPA); if (v) _nutriMapa = v.mapa || {}; }
  if (_nutriHodnoty === null) { const v = _nutriLs(NUTRI_LS_HODN, NUTRI_TTL_HODN); _nutriHodnoty = (v && v.h) || {}; if (v && v.c) _nutriCitace = v.c; }
}

//  Položka smí dostat hodnoty z NutriDatabáze: bez čárového kódu, nebo kód obchodu (EAN začínající 2).
function nutriBezKodu(ean) { const e = String(ean || '').replace(/\D/g, ''); return !e || /^2/.test(e); }
function nutriKodPro(taxId) { _nutriPriprav(); return (taxId && _nutriMapa && _nutriMapa[taxId]) || null; }
//  Hodnoty pro obecný název (id z taxonomie). Chybějící kód si poznamená k dotažení (nutriNacti).
function nutriProTax(taxId) {
  const k = nutriKodPro(taxId); if (!k) return null;
  const v = _nutriHodnoty && _nutriHodnoty[k];
  if (!v) { _nutriChybi.add(k); return null; }
  const n = { na: 'g', zdroj: 'nutri', kod: k, nazev: v.n || '', jedle: v.e > 0 && v.e <= 1 ? v.e : 1 };
  NUTRI_POLE.forEach(p => { if (typeof v[p] === 'number') n[p] = v[p]; });
  return n;
}
//  Obecný název položky účtenky: Mapa položek → odhad podle názvu (stejná cesta jako zařazení do kategorie).
function nutriTaxPolozky(it, D) {
  const m = typeof rpMapaNavrh === 'function' ? rpMapaNavrh(it.name || '', D, it.ean) : null;
  return m && m.tax ? m.tax.id : null;
}
function nutriProPolozku(it, D) {
  if (!it || !nutriBezKodu(it.ean)) return null;
  return nutriProTax(nutriTaxPolozky(it, D));
}

//  Dotáhne párovací tabulku a chybějící hodnoty z workeru. Vrací true, když přibylo něco nového
//  (volající pak překreslí). Bez přihlášení nebo bez workeru tiše nic (žádná smyčka).
async function nutriNacti() {
  if (_nutriNacitani) return _nutriNacitani;
  _nutriNacitani = (async () => {
    _nutriPriprav();
    let nove = false;
    try {
      const t = await window._currentUser?.getIdToken?.();
      if (!t || typeof WORKER_URL === 'undefined') return false;
      const post = (cesta, telo) => fetch(WORKER_URL + cesta, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(telo) }).then(r => r.ok ? r.json() : null);
      if (_nutriMapa === null) {
        const r = await post('/nutri-mapa', {});
        _nutriMapa = (r && r.mapa) || {};
        _nutriLsUloz(NUTRI_LS_MAPA, { mapa: _nutriMapa });
        nove = Object.keys(_nutriMapa).length > 0;
      }
      const kody = [..._nutriChybi].filter(k => !_nutriHodnoty[k]);
      _nutriChybi = new Set();
      for (let i = 0; i < kody.length; i += NUTRI_DAVKA) {
        const r = await post('/nutri', { kody: kody.slice(i, i + NUTRI_DAVKA) });
        if (r && r.potraviny) { Object.assign(_nutriHodnoty, r.potraviny); if (r.citace) _nutriCitace = r.citace; if (Object.keys(r.potraviny).length) nove = true; }
      }
      if (kody.length) _nutriLsUloz(NUTRI_LS_HODN, { h: _nutriHodnoty, c: _nutriCitace });
    } catch (e) { console.warn('[nutri]', e); }
    return nove;
  })();
  try { return await _nutriNacitani; } finally { _nutriNacitani = null; }
}
//  Dvoukolové načtení: 1) mapa, překreslení zaregistruje potřebné kódy, 2) hodnoty, překreslení.
async function nutriNactiAKresli(kresli) {
  if (await nutriNacti()) { try { kresli(); } catch (e) {} if (await nutriNacti()) { try { kresli(); } catch (e) {} } }
}
function nutriCitaceHTML() {
  return `${escHtml(_nutriCitace)} · <a href="${NUTRI_UZEI_URL}" target="_blank" rel="noopener" style="color:#93c5fd">ÚZEI</a>`;
}
function nutriZdrojHTML(n) {
  return `🥕 NutriDatabáze · orientační hodnoty na 100 g jedlého podílu${n.nazev ? ' · „' + escHtml(n.nazev) + '“' : ''}${n.jedle < 1 ? ` · jedlý podíl ${Math.round(n.jedle * 100)} %` : ''}<br>${nutriCitaceHTML()}`;
}
//  Po změně páru v adminu: zapomenout mapu, ať ji appka načte znovu.
function nutriZapomenMapu() { _nutriMapa = null; try { localStorage.removeItem(NUTRI_LS_MAPA); } catch (e) {} }

// ══════════════════════════════════════════════════════
//  CSV → objekt potravin (Admin → 🥕 NutriDatabáze → Nahrát CSV). Čistá funkce, testuje smoke_nutri.js.
//  Soubor z nutridatabaze.cz: kódování windows-1250, oddělovač „;“, chybějící hodnota „-“, desetinná tečka
//  (u jistoty i čárka). Sloupce podle názvu v hlavičce, ne podle pořadí.
// ══════════════════════════════════════════════════════
const NUTRI_CSV_SLOUPCE = { kcal: 'ENERC [kcal]', tuky: 'FAT [g]', nasycene: 'FASAT [g]', sacharidy: 'CHO [g]', cukry: 'SUGAR [g]', vlaknina: 'FIBT [g]', bilkoviny: 'PROT [g]', sul: 'NACL [g]' };
function nutriParseCSV(text) {
  const radky = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter(r => r.trim());
  if (radky.length < 2) return { potraviny: {}, chyba: 'Soubor je prázdný.' };
  const hl = radky[0].split(';').map(s => s.trim());
  const ix = n => hl.indexOf(n);
  const iKod = ix('OrigFdCd'), iNaz = ix('OrigFdNm'), iJed = ix('EDIBLE');
  if (iKod < 0 || iNaz < 0) return { potraviny: {}, chyba: 'Chybí sloupce OrigFdCd / OrigFdNm – je to export z NutriDatabáze?' };
  const cislo = s => { const t = String(s || '').trim().replace(',', '.'); if (!t || t === '-') return null; const x = Number(t); return isFinite(x) ? x : null; };
  const potraviny = {};
  radky.slice(1).forEach(r => {
    const c = r.split(';'); const kod = String(c[iKod] || '').trim(); if (!/^[0-9A-Za-z]{1,8}$/.test(kod)) return;
    const p = { n: String(c[iNaz] || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim(), e: iJed >= 0 ? (cislo(c[iJed]) ?? 1) : 1 };
    Object.entries(NUTRI_CSV_SLOUPCE).forEach(([k, sl]) => { const i = ix(sl); const v = i >= 0 ? cislo(c[i]) : null; if (v !== null) p[k] = v; });
    if (p.n) potraviny[kod] = p;
  });
  return { potraviny, chyba: Object.keys(potraviny).length ? '' : 'V souboru nejsou žádné potraviny.' };
}

// ══════════════════════════════════════════════════════
//  ADMIN → 🥕 NutriDatabáze: nahrání CSV a kontrola párů (obecný název → potravina)
// ══════════════════════════════════════════════════════
let _nutriAdmin = null, _nutriAdminFiltr = 'navrh', _nutriAdminHledat = '';
async function _nutriAdminPost(cesta, telo) {
  const t = await window._currentUser?.getIdToken?.(); if (!t) throw new Error('Nepřihlášený');
  const r = await fetch(WORKER_URL + cesta, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(telo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}
async function renderAdminNutri() {
  const el = document.getElementById('adminNutriBody'); if (!el) return;
  el.innerHTML = '<div style="color:#a8aec8;font-size:.82rem">Načítám…</div>';
  try { _nutriAdmin = await _nutriAdminPost('/nutri-mapa', { vse: true }); }
  catch (e) { el.innerHTML = `<div style="color:#f87171;font-size:.82rem">Worker neodpověděl: ${escHtml(e.message)}. Je nasazený worker v12.47?</div>`; return; }
  nutriAdminKresli();
}
function _nutriAdminRadky() {
  const A = _nutriAdmin || {}, mapa = A.mapa || {};
  const tax = (typeof taxSeznam === 'function' ? taxSeznam() : []).filter(t => ['potraviny', 'napoje', 'alkohol'].includes(t.oblastId) && !['cigarety', 'tabak', 'koureni-doplnky'].includes(t.podId));
  const vse = new Map(tax.map(t => [t.id, { id: t.id, nazev: t.nazev, pod: t.podNazev }]));
  Object.keys(mapa).forEach(id => { if (!vse.has(id)) vse.set(id, { id, nazev: id, pod: '' }); });
  return [...vse.values()].map(r => Object.assign(r, { p: mapa[r.id] || null }));
}
function nutriAdminKresli() {
  const el = document.getElementById('adminNutriBody'); if (!el || !_nutriAdmin) return;
  const A = _nutriAdmin, nazvy = A.nazvy || {}, e = s => escHtml(String(s == null ? '' : s));
  const radky = _nutriAdminRadky();
  const stav = r => !r.p ? 'bez' : r.p.j === 'ne' ? 'ne' : (r.p.j === 'navrh' ? 'navrh' : 'ok');
  const pocty = { navrh: 0, ok: 0, bez: 0, ne: 0 }; radky.forEach(r => pocty[stav(r)]++);
  const q = _prNormNutri(_nutriAdminHledat);
  const vyber = radky.filter(r => (q ? _prNormNutri(r.nazev + ' ' + (r.p && nazvy[r.p.k] || '')).includes(q) : stav(r) === _nutriAdminFiltr || (_nutriAdminFiltr === 'bez' && stav(r) === 'ne')))
    .sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs')).slice(0, 120);
  const tab = (k, t) => `<button class="tx-filt-btn${_nutriAdminFiltr === k && !q ? ' active' : ''}" onclick="_nutriAdminFiltr='${k}';_nutriAdminHledat='';nutriAdminKresli()">${t}</button>`;
  const moznosti = r => { const ks = [r.p && r.p.k, ...((r.p && r.p.a) || [])].filter(Boolean);
    return [...new Set(ks)].map(k => `<option value="${e(k)}"${r.p && r.p.k === k ? ' selected' : ''}>${e(nazvy[k] || k)}</option>`).join(''); };
  el.innerHTML = `
    <div style="font-size:.8rem;color:#c9cede;line-height:1.55;margin-bottom:10px">
      ${A.pocet ? `Nahráno <b>${A.pocet}</b> potravin, verze ${e(A.verze || '?')}${A.nahrano ? ' (' + new Date(A.nahrano).toLocaleDateString('cs-CZ') + ')' : ''}.` : '<b style="color:#fbbf24">Data zatím nejsou nahraná.</b>'}
      Uživatelé dostanou jen páry <b>jisté</b> a <b>potvrzené</b>; návrh se použije až po potvrzení.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
      <label class="btn btn-sm" style="font-size:.74rem;cursor:pointer">📤 Nahrát CSV z nutridatabaze.cz<input type="file" accept=".csv,text/csv" style="display:none" onchange="nutriAdminNahraj(this.files[0])"></label>
      <span id="adminNutriNahrani" style="font-size:.74rem;color:#a8aec8"></span>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
      ${tab('navrh', `Ke kontrole (${pocty.navrh})`)}${tab('ok', `Napojené (${pocty.ok})`)}${tab('bez', `Bez napojení (${pocty.bez + pocty.ne})`)}
    </div>
    <input class="fi" placeholder="Hledat obecný název nebo potravinu…" value="${e(_nutriAdminHledat)}" oninput="_nutriAdminHledat=this.value;nutriAdminKresli();var i=document.querySelector('#adminNutriBody input.fi');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}" style="margin-bottom:8px">
    <datalist id="nutriNazvy">${Object.entries(nazvy).map(([k, n]) => `<option value="${e(n)} · ${e(k)}">`).join('')}</datalist>
    <div style="display:flex;flex-direction:column;gap:6px">
    ${vyber.map(r => { const s = stav(r), id = e(r.id);
      return `<div style="background:var(--surface2);border:1px solid ${s === 'navrh' ? 'rgba(251,191,36,.45)' : 'var(--border)'};border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b style="font-size:.86rem">${e(r.nazev)}</b><span style="font-size:.68rem;color:#a8aec8">${e(r.pod)} · ${{ navrh: '🟡 návrh', ok: r.p.j === 'jista' ? '🟢 jistá' : '✅ potvrzeno', bez: '— bez páru', ne: '🚫 bez napojení' }[s]}</span></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          ${r.p && r.p.k ? `<select class="fi" id="nutriSel_${id}" style="flex:1 1 220px;min-width:0;font-size:.78rem">${moznosti(r)}</select>` : ''}
          <input class="fi" list="nutriNazvy" id="nutriJina_${id}" placeholder="jiná potravina…" style="flex:1 1 180px;min-width:0;font-size:.78rem">
          <button class="btn btn-sm" style="font-size:.72rem" onclick="nutriAdminUloz('${id}')">✓ Potvrdit</button>
          ${s !== 'ne' ? `<button class="btn btn-ghost btn-sm" style="font-size:.72rem" onclick="nutriAdminUloz('${id}',true)">🚫 Bez napojení</button>` : ''}
        </div></div>`; }).join('') || '<div style="font-size:.8rem;color:#a8aec8">Nic tu není.</div>'}
    </div>
    <div style="font-size:.68rem;color:#8b93ad;margin-top:10px">${e(NUTRI_CITACE)}. Data leží jen ve workeru (licence: soubor se nesmí šířit dál).</div>`;
}
function _prNormNutri(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
async function nutriAdminUloz(taxId, zrusit) {
  let k = null;
  if (!zrusit) {
    const jina = (document.getElementById('nutriJina_' + taxId) || {}).value || '';
    const m = /·\s*([0-9A-Za-z]{1,8})\s*$/.exec(jina);
    k = m ? m[1] : ((document.getElementById('nutriSel_' + taxId) || {}).value || null);
    if (!k) { if (typeof showToast === 'function') showToast('Vyber potravinu ze seznamu'); return; }
  }
  try {
    const r = await _nutriAdminPost('/nutri-mapa-uloz', { tax: taxId, k });
    _nutriAdmin.mapa[taxId] = r.polozka;
    nutriZapomenMapu();
    if (typeof showToast === 'function') showToast(zrusit ? '🚫 Bez napojení' : '✅ Potvrzeno');
    nutriAdminKresli();
  } catch (e) { alert('Uložení se nepovedlo: ' + e.message); }
}
async function nutriAdminNahraj(soubor) {
  const st = document.getElementById('adminNutriNahrani'); if (!soubor) return;
  const zprava = t => { if (st) st.textContent = t; };
  try {
    zprava('Čtu soubor…');
    const buf = await soubor.arrayBuffer();
    const text = new TextDecoder('windows-1250').decode(buf);
    const { potraviny, chyba } = nutriParseCSV(text);
    if (chyba) { zprava('⚠️ ' + chyba); return; }
    const verze = (/v(\d+\.\d+)/i.exec(soubor.name) || [])[1] || '11.26';
    let mapa = null;
    try { const r = await fetch('data/nutri-mapa.json?v=' + verze); if (r.ok) mapa = (await r.json()).mapa; } catch (e) {}
    zprava(`Nahrávám ${Object.keys(potraviny).length} potravin…`);
    const r = await _nutriAdminPost('/nutri-nahrat', { verze, potraviny, mapa });
    zprava(`✅ Nahráno ${r.potravin} potravin (verze ${r.verze})${r.mapaUlozena ? ', párovací tabulka uložena' : ', párovací tabulka zůstala (tvoje opravy)'}.`);
    nutriZapomenMapu();
    setTimeout(renderAdminNutri, 600);
  } catch (e) { zprava('⚠️ ' + e.message); }
}

Object.assign(window, { NUTRI_CITACE, nutriBezKodu, nutriKodPro, nutriProTax, nutriTaxPolozky, nutriProPolozku, nutriNacti, nutriNactiAKresli,
  nutriCitaceHTML, nutriZdrojHTML, nutriZapomenMapu, nutriParseCSV, renderAdminNutri, nutriAdminKresli, nutriAdminUloz, nutriAdminNahraj });
