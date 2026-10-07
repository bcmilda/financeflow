// FinanceFlow · v11.39 · ceny-kraje.js · 2026-10-07
// ══════════════════════════════════════════════════════════════════════
//  S25 (Milan, katalog krok 4): SDÍLENÉ CENY PO KRAJÍCH
//  Při uložení nové účtenky se u potravin, nápojů, alkoholu, tabáku a drogerie
//  (CZ-COICOP 01, 02, 05.6.1, 13.1.2 – nikdy zdraví/lékárna) pošle workeru jen:
//  výrobek, cena, řetězec, kraj, měsíc. Žádné jméno, e-mail ani účtenka.
//  Worker drží jen SOUHRN (počet, součet, min, max, počet lidí) a od jednoho
//  člověka bere jeden údaj na výrobek, obchod, kraj a měsíc. Zobrazí se až od 3 lidí.
//  Zapnuto všem, vypnutí: Nastavení → Data & Soukromí (uiCfg.sdiletCeny = false).
// ══════════════════════════════════════════════════════════════════════

const CENY_POVOLENE = ['01', '02', '05.6.1', '13.1.2'];
const CENY_MIN_LIDI = 3;

function cenyKlicTxt(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
}
function cenyZapnuto(D) { return ((D || S).uiCfg || {}).sdiletCeny !== false; }

//  Kód CZ-COICOP položky (koš ČSÚ podle názvu, jinak taxonomie)
function cenyKodPolozky(name) {
  const pg = (typeof productGroupLookup === 'function') ? productGroupLookup(name) : null;
  if (pg && pg.code) return (typeof coicopNorm === 'function') ? coicopNorm(pg.code) : pg.code;
  const n = (typeof taxNavrh === 'function') ? taxNavrh(name) : null;
  if (n && n.info && n.info.coicop) return (typeof coicopNorm === 'function') ? coicopNorm(n.info.coicop) : n.info.coicop;
  return '';
}
function cenyPovoleno(kod) { return !!kod && CENY_POVOLENE.some(p => kod === p || kod.startsWith(p + '.')); }

//  Klíč výrobku: čárový kód (srovnatelné napříč obchody), jinak název z účtenky + balení
function cenyKlicVyrobku(it) {
  if (it.ean && /^\d{8,14}$/.test(it.ean)) return 'e' + it.ean;
  const n = cenyKlicTxt(typeof normName === 'function' ? normName(it.name) : it.name);
  if (!n) return '';
  const b = it.baleni || (typeof baleniZNazvu === 'function' ? baleniZNazvu(it.name) : null);
  return ('n_' + n + (b ? '_' + String(b.m).replace('.', '_') + b.j : '')).slice(0, 80);
}

//  Čistá funkce: co se z účtenky pošle (nic osobního).
function cenyPozorovani(r) {
  if (!r || !r.storeRegion || !/^\d{4}-\d{2}/.test(r.date || '')) return null;
  const kraj = cenyKlicTxt(r.storeRegion); const obchod = cenyKlicTxt(typeof normalizeStoreName === 'function' ? normalizeStoreName(r.store) : r.store);
  if (!kraj || !obchod) return null;
  const amt = (typeof lineAmt === 'function') ? lineAmt : (it => (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 1));
  const vaz = (typeof rpVazene === 'function') ? rpVazene : (() => false);
  const vid = new Set(), obs = [];
  (r.items || []).forEach(it => {
    if (!it || !it.name) return;
    if (!cenyPovoleno(cenyKodPolozky(it.name))) return;
    const k = cenyKlicVyrobku(it); if (!k || vid.has(k)) return;
    const q = parseFloat(it.qty) || 1; const castka = amt(it);
    const c = Math.round((q ? castka / q : castka) * 100) / 100;
    if (!(c > 0 && c < 100000)) return;
    vid.add(k);
    obs.push({ k, c, j: vaz(it) ? (it.unit === 'l' ? 'l' : 'kg') : 'ks' });
  });
  return obs.length ? { kraj, obchod, mesic: r.date.slice(0, 7), obs } : null;
}

async function cenyOdeslat(r) {
  try {
    if (!cenyZapnuto() || !window._currentUser || !window._currentUser.getIdToken) return;
    const p = cenyPozorovani(r); if (!p) return;
    const token = await window._currentUser.getIdToken();
    const wu = (typeof WORKER_URL !== 'undefined' && WORKER_URL) || 'https://misty-limit-0523.bc-milda.workers.dev';
    for (let i = 0; i < p.obs.length; i += 20) {
      await fetch(`${wu}/ceny`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ kraj: p.kraj, obchod: p.obchod, mesic: p.mesic, obs: p.obs.slice(i, i + 20) }) });
    }
  } catch (e) { console.warn('Sdílené ceny:', e.message); }   // nikdy nic nezastaví
}

function cenyNastav(on) {
  S.uiCfg = S.uiCfg || {}; S.uiCfg.sdiletCeny = !!on; S.uiCfg.cenyInfo = true; save();
  if (typeof showToast === 'function') showToast(on ? '📊 Sdílení cen zapnuto – děkujeme' : 'Sdílení cen vypnuto – tvoje nákupy se nikam neposílají');
}
function cenyInfoRozumim() { S.uiCfg = S.uiCfg || {}; S.uiCfg.cenyInfo = true; save(); const b = document.getElementById('cenyInfoBanner'); if (b) b.remove(); }
function cenyInfoBannerHTML() {
  if (((typeof S !== 'undefined' && S.uiCfg) || {}).cenyInfo) return '';
  return `<div id="cenyInfoBanner" style="display:flex;gap:10px;align-items:flex-start;background:#60a5fa14;border:1px solid #60a5fa44;border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:.76rem;line-height:1.5">
    <span>📊</span><span style="flex:1"><b>Nově: ceny v tvém kraji.</b> Z účtenek se anonymně sdílí jen výrobek, cena, řetězec, kraj a měsíc (potraviny, nápoje, alkohol, tabák, drogerie – nikdy lékárna). Žádné jméno ani účet; ceny se ukážou až od 3 lidí. Vypnout jde v Nastavení → Data & Soukromí.</span>
    <button class="btn btn-sm" style="font-size:.7rem" onclick="cenyInfoRozumim()">Rozumím</button></div>`;
}

//  Souhrny z databáze pro výrobek v kraji (čte každý přihlášený, zapisuje jen worker)
async function cenyNacti(klic, kraj) {
  if (!window._currentUser || !window._currentUser.getIdToken) return null;
  const token = await window._currentUser.getIdToken();
  const db = 'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app';
  const r = await fetch(`${db}/community/ceny/${encodeURIComponent(klic)}/${encodeURIComponent(kraj)}.json?auth=${token}`);
  return r.ok ? r.json() : null;
}

//  Čistá funkce: nejnovější měsíc s daty → řádky po obchodech (průměr), pod prahem skryté
function cenySouhrn(data, jeAdmin) {
  if (!data) return null;
  const mes = Object.keys(data).filter(m => /^\d{4}-\d{2}$/.test(m)).sort().pop(); if (!mes) return null;
  const radky = Object.entries(data[mes] || {}).map(([o, x]) => ({ obchod: o, prum: x.n ? x.s / x.n : 0, min: x.min, max: x.max, lidi: x.u || 0, n: x.n || 0, j: x.j || 'ks' }))
    .filter(x => x.n > 0).sort((a, b) => a.prum - b.prum);
  const viditelne = radky.filter(x => x.lidi >= CENY_MIN_LIDI || jeAdmin);
  return { mesic: mes, radky: viditelne, skryto: radky.length - viditelne.length, celkemLidi: radky.reduce((a, x) => a + x.lidi, 0) };
}

//  Doplní sekci „Ceny v kraji“ do otevřené karty výrobku (Mapa položek).
async function cenyDoKarty(i) {
  const el = document.getElementById('mkCeny'); if (!el) return;
  const z = (typeof _mapaUziv !== 'undefined') ? _mapaUziv[i] : null; if (!z) return;
  const posl = (z.nakupy || []).find(n => n.kraj);
  if (!posl) { el.innerHTML = '<span style="color:#a8aec8">U účtenek chybí kraj pobočky – doplníš ho v editoru účtenky (📍).</span>'; return; }
  const klic = cenyKlicVyrobku({ name: posl.raw, ean: z.ean, baleni: posl.baleni });
  const kraj = cenyKlicTxt(posl.kraj);
  try {
    const admin = !!(window._currentUser && window._currentUser.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1');
    const s = cenySouhrn(await cenyNacti(klic, kraj), admin);
    const kc = v => (typeof _mapaKc === 'function') ? _mapaKc(v) : Math.round(v) + ' Kč';
    if (!s || !s.radky.length) {
      el.innerHTML = `<span style="color:#a8aec8">${escHtml(posl.kraj)}: zatím málo dat${s && s.skryto ? ` (${s.celkemLidi} z ${CENY_MIN_LIDI} potřebných lidí)` : ''}. Ceny se ukážou, až výrobek koupí aspoň ${CENY_MIN_LIDI} lidé v kraji.</span>`;
      return;
    }
    const moje = posl.cena;
    el.innerHTML = `<div style="font-size:.7rem;color:#a8aec8;margin-bottom:4px">${escHtml(posl.kraj)} · ${escHtml(s.mesic.split('-').reverse().join('/'))}${admin && s.radky.some(x => x.lidi < CENY_MIN_LIDI) ? ' · <span style="color:#fbbf24">admin vidí i pod prahem</span>' : ''}</div>`
      + s.radky.map((x, k) => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:.78rem;padding:3px 0;border-top:1px solid var(--border)">
          <span>${k === 0 && s.radky.length > 1 ? '🏆 ' : ''}${escHtml(x.obchod.replace(/_/g, ' '))} <span style="color:#a8aec8;font-size:.68rem">${x.lidi} ${x.lidi === 1 ? 'člověk' : x.lidi < 5 ? 'lidé' : 'lidí'}</span></span>
          <span style="white-space:nowrap"><b>${kc(x.prum)}</b>${x.j !== 'ks' ? '/' + x.j : ''} <span style="color:#a8aec8;font-size:.68rem">${x.min !== x.max ? kc(x.min) + '–' + kc(x.max) : ''}</span></span></div>`).join('')
      + (moje && s.radky[0] && moje > s.radky[0].prum * 1.02 ? `<div style="font-size:.72rem;color:#fbbf24;margin-top:4px">Ty jsi naposledy platil ${kc(moje)} – o ${kc(moje - s.radky[0].prum)} víc než nejlevněji v kraji.</div>` : '');
  } catch (e) { el.innerHTML = '<span style="color:#a8aec8">Ceny se teď nepodařilo načíst.</span>'; }
}

Object.assign(window, { cenyKlicTxt, cenyZapnuto, cenyKodPolozky, cenyPovoleno, cenyKlicVyrobku, cenyPozorovani, cenyOdeslat,
  cenyNastav, cenyInfoRozumim, cenyInfoBannerHTML, cenyNacti, cenySouhrn, cenyDoKarty, CENY_POVOLENE, CENY_MIN_LIDI });
