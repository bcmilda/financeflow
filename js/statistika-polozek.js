// FinanceFlow · v11.38 · statistika-polozek.js · 2026-10-06
// ══════════════════════════════════════════════════════════════════════
//  S25 (Milan): STATISTIKA POLOŽEK – statistický nástroj nad Mapou položek
//  cesta: Analýza účtenek → 📐 Statistika položek
//  Každý řádek = jedna položka z účtenky. Filtry: období, COICOP / skupina ČSÚ,
//  oblast a podkategorie taxonomie, obchod, štítek, kategorie rozpočtu, jen
//  s čárovým kódem, hledání. Seskupení podle libovolné dimenze, vývoj po
//  měsících a tabulka položek (klik = karta výrobku z Mapy položek).
//  Čisté funkce spRadky / spFiltruj / spSeskup jsou testované (smoke_statistika_polozek.js).
// ══════════════════════════════════════════════════════════════════════

let _spFiltr = { obdobi: '12', coicop: '', oblast: '', pod: '', obchod: '', kraj: '', mesto: '', stitek: '', kat: '', kod: false, q: '', podle: 'csu' };

//  Řádky položek obohacené o zařazení (COICOP z modelu ČSÚ, taxonomie z Mapy položek).
function spRadky(receipts, mapa, D) {
  const nn = (typeof normName === 'function') ? normName : (t => String(t || '').toLowerCase());
  const obch = (typeof normalizeStoreName === 'function') ? normalizeStoreName : (s => s);
  const amt = (typeof lineAmt === 'function') ? lineAmt : (it => (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 1));
  const vaz = (typeof rpVazene === 'function') ? rpVazene : (() => false);
  const kodCsu = (typeof pgKodCsu === 'function') ? pgKodCsu : (c => c);
  const podleKlice = {}; (mapa || []).forEach((z, i) => { podleKlice[z.klic] = { z, i }; });
  const kats = {}; ((D && D.categories) || []).forEach(c => { kats[c.id] = c; });
  const out = [];
  (receipts || []).forEach(r => (r.items || []).forEach(it => {
    if (!it || !it.name) return;
    const klic = nn(it.name); const m = podleKlice[klic];
    const castka = Math.round(amt(it) * 100) / 100;
    const q = parseFloat(it.qty) || 1;
    const pg = (typeof productGroupLookup === 'function') ? productGroupLookup(it.name) : null;
    const tax = m && m.z.tax;
    //  S25: kód z taxonomie (bývá hlubší, až 5. úroveň přílohy potravin), jinak z koše ČSÚ
    const kod = tax && tax.coicop ? (typeof coicopNorm === 'function' ? coicopNorm(tax.coicop) : tax.coicop) : (pg ? kodCsu(pg.code) : '');
    const kat = kats[(m && m.z.catId) || it.itemCatId || ''];
    //  S25: cena za kg / l – vážené zboží přímo, balené z gramáže (samostatné pole nebo z názvu)
    const bal = it.baleni || (typeof baleniZNazvu === 'function' ? baleniZNazvu(it.name) : null);
    let zaJed = null, jed = '';
    if (vaz(it)) { zaJed = q ? castka / q : null; jed = (it.unit === 'l' ? 'l' : 'kg'); }
    else if (bal && (bal.j === 'g' || bal.j === 'ml') && bal.m > 0) { zaJed = castka / (q * bal.m / 1000); jed = bal.j === 'g' ? 'kg' : 'l'; }
    out.push({
      zaJed, jed, baleni: bal,
      mesto: r.storeCity || '', kraj: r.storeRegion || '',   // S25: pobočka z hlavičky účtenky
      datum: r.date || '', mesic: String(r.date || '').slice(0, 7), obchod: obch(r.store || '') || '—',
      nazev: (m && m.z.nazev) || it.name, klic, mapaI: m ? m.i : -1,
      castka, mnozstvi: q, vazene: vaz(it), cenaJed: q ? castka / q : castka,
      coicop: kod, csu: spNazevKodu(kod) || (pg ? pg.group : ''), oddil: kod ? kod.slice(0, 2) : '',
      oblast: tax ? tax.oblastNazev : '', pod: tax ? tax.podNazev : '', obecny: tax ? tax.nazev : '',
      stitek: it.tag || '', kat: kat ? ((kat.icon || '') + ' ' + kat.name).trim() : '', ean: (m && m.z.ean) || it.ean || '',
    });
  }));
  return out;
}

function spFiltruj(radky, f, dnes = new Date()) {
  const q = String(f.q || '').toLowerCase();
  let od = '';
  if (f.obdobi && f.obdobi !== 'vse') {
    const d = new Date(dnes.getFullYear(), dnes.getMonth() - (parseInt(f.obdobi, 10) - 1), 1);
    od = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return radky.filter(x =>
    (!od || x.mesic >= od) &&
    (!f.coicop || x.coicop === f.coicop || x.coicop.startsWith(f.coicop + '.')) &&
    (!f.oblast || x.oblast === f.oblast) && (!f.pod || x.pod === f.pod) &&
    (!f.obchod || x.obchod === f.obchod) && (!f.kraj || x.kraj === f.kraj) && (!f.mesto || x.mesto === f.mesto) && (!f.stitek || x.stitek === f.stitek) && (!f.kat || x.kat === f.kat) &&
    (!f.kod || !!x.ean) && (!q || x.nazev.toLowerCase().includes(q) || x.obecny.toLowerCase().includes(q)));
}

//  Úroveň číselníku CZ-COICOP: 1 oddíl, 2 skupina, 3 třída, 4 podtřída, 5 položka přílohy potravin
function spUroven(x, n) {
  if (!x.coicop) return '— nezařazeno v COICOP';
  const p = x.coicop.split('.'); if (p.length < n) return '— bez ' + n + '. úrovně';
  const k = p.slice(0, n).join('.'); const nz = spNazevKodu(k);
  return k + (nz ? ' · ' + nz : '');
}
function spNazevKodu(k) {
  if (!k) return '';
  const n = typeof coicopNazev === 'function' ? coicopNazev(k) : '';
  if (n) return n;
  if (k.length === 2 && typeof COICOP_GROUPS_DEF !== 'undefined') { const g = COICOP_GROUPS_DEF.find(c => String(c.id).padStart(2, '0') === k); if (g) return g.name; }
  return '';
}
const SP_PODLE = {
  csu: { n: 'COICOP · podtřída (koš ČSÚ)', k: x => spUroven(x, 4) },
  oddil: { n: 'COICOP · oddíl', k: x => spUroven(x, 1) },
  skupina: { n: 'COICOP · skupina', k: x => spUroven(x, 2) },
  trida: { n: 'COICOP · třída', k: x => spUroven(x, 3) },
  pol5: { n: 'COICOP · položka přílohy potravin', k: x => spUroven(x, 5) },
  oblast: { n: 'Oblast', k: x => x.oblast || '— mimo taxonomii' },
  pod: { n: 'Podkategorie', k: x => x.pod || '— mimo taxonomii' },
  obecny: { n: 'Obecný název', k: x => x.obecny || '— mimo taxonomii' },
  obchod: { n: 'Obchod', k: x => x.obchod },
  kraj: { n: 'Kraj', k: x => x.kraj || '— kraj neznámý' },
  mesto: { n: 'Město pobočky', k: x => x.mesto ? x.mesto + (x.kraj ? ' (' + x.kraj + ')' : '') : '— město neznámé' },
  pobocka: { n: 'Obchod + město', k: x => x.obchod + (x.mesto ? ' · ' + x.mesto : '') },
  stitek: { n: 'Štítek', k: x => x.stitek || '— bez štítku' },
  kat: { n: 'Kategorie rozpočtu', k: x => x.kat || '— nezařazeno' },
  polozka: { n: 'Položka', k: x => x.nazev },
  mesic: { n: 'Měsíc', k: x => x.mesic || '—' },
};
function spOddilNazev(o) { const n = spNazevKodu(o); return o + (n ? ' · ' + n : ''); }

function spSeskup(radky, podle) {
  const fn = (SP_PODLE[podle] || SP_PODLE.csu).k; const g = {};
  radky.forEach(x => { const k = fn(x); const s = g[k] || (g[k] = { klic: k, castka: 0, pocet: 0, polozky: new Set() }); s.castka += x.castka; s.pocet++; s.polozky.add(x.klic); });
  return Object.values(g).map(s => ({ ...s, castka: Math.round(s.castka * 100) / 100, polozek: s.polozky.size })).sort((a, b) => b.castka - a.castka);
}

//  Tabulka položek: útrata, počet, průměrná cena, nejlevnější obchod.
function spPolozky(radky) {
  const g = {};
  radky.forEach(x => {
    const s = g[x.klic] || (g[x.klic] = { klic: x.klic, nazev: x.nazev, mapaI: x.mapaI, castka: 0, pocet: 0, ceny: {}, vazene: x.vazene, ean: x.ean, zaJed: [], jed: x.jed, baleni: x.baleni });
    s.castka += x.castka; s.pocet++;
    if (x.zaJed != null && isFinite(x.zaJed)) { s.zaJed.push(x.zaJed); s.jed = x.jed; }
    const c = s.ceny[x.obchod] || (s.ceny[x.obchod] = []); c.push(x.cenaJed);
  });
  return Object.values(g).map(s => {
    const prum = Object.entries(s.ceny).map(([o, a]) => ({ o, c: a.reduce((p, v) => p + v, 0) / a.length })).sort((a, b) => a.c - b.c);
    const vse = [].concat(...Object.values(s.ceny));
    return { ...s, castka: Math.round(s.castka * 100) / 100, prumCena: vse.reduce((p, v) => p + v, 0) / vse.length,
      prumZaJed: s.zaJed.length ? s.zaJed.reduce((p, v) => p + v, 0) / s.zaJed.length : null,
      nejlevneji: prum.length > 1 ? prum[0] : null, obchodu: prum.length };
  }).sort((a, b) => b.castka - a.castka);
}

function spNastav(k, v) {
  _spFiltr[k] = v;
  if (k === 'oblast') _spFiltr.pod = '';
  if (k === 'kraj') _spFiltr.mesto = '';
  spRender();
}
function spReset() { _spFiltr = { obdobi: '12', coicop: '', oblast: '', pod: '', obchod: '', kraj: '', mesto: '', stitek: '', kat: '', kod: false, q: '', podle: _spFiltr.podle }; spRender(); }

function spRender() {
  const el = document.getElementById('utab-polstat-content'); if (!el) return;
  const D = getData();
  const rec = (typeof _mapaUzivReceipts !== 'undefined' && _mapaUzivReceipts.length) ? _mapaUzivReceipts : (D.receipts || []);
  const mapa = (typeof _mapaUziv !== 'undefined') ? _mapaUziv : [];
  const vse = spRadky(rec, mapa, D);
  const f = _spFiltr;
  const r = spFiltruj(vse, f);
  const kc = v => (typeof _mapaKc === 'function') ? _mapaKc(v) : (Math.round(v) + ' Kč');
  const e = s => escHtml(String(s == null ? '' : s));
  const uniq = (fn, base) => [...new Set((base || vse).map(fn).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'cs'));
  const sel = (k, label, opts, fmt) => `<label style="display:flex;flex-direction:column;gap:3px;font-size:.66rem;color:#a8aec8;min-width:0">${label}
    <select class="fi" style="font-size:.76rem;padding:6px" onchange="spNastav('${k}',this.value)"><option value="">Vše</option>${opts.map(o => `<option value="${e(o)}" ${f[k] === o ? 'selected' : ''}>${e(fmt ? fmt(o) : o)}</option>`).join('')}</select></label>`;
  //  COICOP volby: všechny úrovně číselníku, které se v datech vyskytují (oddíl … 5. úroveň)
  const pref = new Set(); vse.forEach(x => { if (!x.coicop) return; const p = x.coicop.split('.'); for (let i = 1; i <= p.length; i++) pref.add(p.slice(0, i).join('.')); });
  const coicopOpts = [...pref].sort((a, b) => a.localeCompare(b, 'cs', { numeric: true }));
  const fmtCoicop = o => '\u00a0'.repeat((o.split('.').length - 1) * 2) + o + (spNazevKodu(o) ? ' · ' + spNazevKodu(o) : '');

  const celkem = r.reduce((a, x) => a + x.castka, 0);
  const uctenek = new Set(r.map(x => x.datum + '|' + x.obchod)).size;
  const sk = spSeskup(r, f.podle); const max = sk.length ? sk[0].castka : 1;
  const mes = spSeskup(r, 'mesic').sort((a, b) => a.klic.localeCompare(b.klic)); const maxM = Math.max(1, ...mes.map(m => m.castka));
  const pol = spPolozky(r).slice(0, 40);
  const kpi = (l, v) => `<div style="background:var(--bg);border-radius:10px;padding:9px 11px"><div style="font-size:.66rem;color:#a8aec8">${l}</div><div style="font-size:1.02rem;font-weight:800">${v}</div></div>`;

  el.innerHTML = `<div class="card"><div class="card-body">
    <div style="font-weight:700;font-size:.95rem;margin-bottom:4px">📐 Statistika položek</div>
    <div style="font-size:.74rem;color:#a8aec8;line-height:1.5;margin-bottom:10px">Každá položka z tvých účtenek, zařazená podle číselníku ČSÚ (CZ-COICOP), taxonomie Mapy položek, obchodu a štítku. Klikni na položku v tabulce a otevře se její karta.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:8px">
      <label style="display:flex;flex-direction:column;gap:3px;font-size:.66rem;color:#a8aec8">Období
        <select class="fi" style="font-size:.76rem;padding:6px" onchange="spNastav('obdobi',this.value)">${[['1', 'Tento měsíc'], ['3', '3 měsíce'], ['6', '6 měsíců'], ['12', '12 měsíců'], ['vse', 'Vše']].map(([v, l]) => `<option value="${v}" ${f.obdobi === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${sel('coicop', 'COICOP / skupina ČSÚ', coicopOpts, fmtCoicop)}
      ${sel('oblast', 'Oblast', uniq(x => x.oblast))}
      ${sel('pod', 'Podkategorie', uniq(x => x.pod, f.oblast ? vse.filter(x => x.oblast === f.oblast) : vse))}
      ${sel('obchod', 'Obchod', uniq(x => x.obchod))}
      ${sel('kraj', 'Kraj', uniq(x => x.kraj))}
      ${sel('mesto', 'Město pobočky', uniq(x => x.mesto, f.kraj ? vse.filter(x => x.kraj === f.kraj) : vse))}
      ${sel('stitek', 'Štítek', uniq(x => x.stitek))}
      ${sel('kat', 'Kategorie rozpočtu', uniq(x => x.kat))}
      <label style="display:flex;flex-direction:column;gap:3px;font-size:.66rem;color:#a8aec8">Hledat
        <input class="fi" style="font-size:.76rem;padding:6px" value="${e(f.q)}" placeholder="název…" onchange="spNastav('q',this.value)"></label>
    </div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px;font-size:.74rem;color:#a8aec8">
      <label style="display:flex;gap:5px;align-items:center;cursor:pointer"><input type="checkbox" ${f.kod ? 'checked' : ''} onchange="spNastav('kod',this.checked)"> jen s čárovým kódem</label>
      <button class="btn btn-sm" style="font-size:.7rem" onclick="spReset()">✕ Zrušit filtry</button>
      <span style="margin-left:auto">${r.length} z ${vse.length} řádků</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:14px">
      ${kpi('Útrata', kc(celkem))}${kpi('Položek na účtenkách', r.length)}${kpi('Různých výrobků', new Set(r.map(x => x.klic)).size)}${kpi('Nákupů', uctenek)}${kpi('Průměr na nákup', uctenek ? kc(celkem / uctenek) : '—')}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
      <div style="font-weight:700;font-size:.84rem">Útrata podle</div>
      <select class="fi" style="font-size:.76rem;padding:5px;max-width:200px" onchange="spNastav('podle',this.value)">${Object.entries(SP_PODLE).map(([k, v]) => `<option value="${k}" ${f.podle === k ? 'selected' : ''}>${v.n}</option>`).join('')}</select>
    </div>
    ${sk.length ? sk.slice(0, 25).map(s => `<div style="margin:5px 0">
        <div style="display:flex;justify-content:space-between;gap:8px;font-size:.76rem"><span style="overflow-wrap:anywhere">${e(s.klic)}</span><span style="white-space:nowrap"><b>${kc(s.castka)}</b> <span style="color:#a8aec8">· ${celkem ? Math.round(s.castka / celkem * 100) : 0} % · ${s.pocet}×</span></span></div>
        <div style="height:6px;border-radius:4px;background:var(--surface2);margin-top:3px"><div style="height:100%;width:${Math.max(2, s.castka / max * 100)}%;border-radius:4px;background:#60a5fa"></div></div></div>`).join('')
      : '<div style="font-size:.76rem;color:#a8aec8">Pro zvolené filtry nejsou žádné položky.</div>'}
    ${mes.length > 1 ? `<div style="font-weight:700;font-size:.84rem;margin:16px 0 6px">Vývoj po měsících</div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:110px;overflow-x:auto">${mes.map(m => `<div style="flex:1;min-width:26px;max-width:60px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%" title="${e(m.klic)}: ${kc(m.castka)}">
        <div style="font-size:.6rem;color:#a8aec8;margin-bottom:2px">${Math.round(m.castka)}</div>
        <div style="width:100%;height:${Math.max(2, m.castka / maxM * 80)}px;background:#4ade80;border-radius:4px 4px 0 0"></div>
        <div style="font-size:.62rem;color:#a8aec8;margin-top:3px">${e(m.klic.slice(5, 7) + '/' + m.klic.slice(2, 4))}</div></div>`).join('')}</div>` : ''}
    <div style="font-weight:700;font-size:.84rem;margin:16px 0 6px">Položky</div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.74rem;min-width:420px">
      <tr style="color:#a8aec8;text-align:left"><th style="padding:5px 4px">Položka</th><th style="padding:5px 4px;text-align:right">Útrata</th><th style="padding:5px 4px;text-align:right">Ks</th><th style="padding:5px 4px;text-align:right">Ø cena</th><th style="padding:5px 4px;text-align:right">Ø za kg/l</th><th style="padding:5px 4px">Nejlevněji</th></tr>
      ${pol.map(p => `<tr style="border-top:1px solid var(--border);${p.mapaI >= 0 ? 'cursor:pointer' : ''}" ${p.mapaI >= 0 ? `onclick="mapaUzivDetail(${p.mapaI})"` : ''}>
        <td style="padding:6px 4px;overflow-wrap:anywhere">${p.ean ? '▮▮ ' : ''}${e(typeof nazevBezGramaze === 'function' ? nazevBezGramaze(p.nazev) : p.nazev)}${p.baleni && typeof baleniText === 'function' ? ` <span style="color:#a8aec8">${e(baleniText(p.baleni))}</span>` : ''}</td><td style="padding:6px 4px;text-align:right;font-weight:700;white-space:nowrap">${kc(p.castka)}</td>
        <td style="padding:6px 4px;text-align:right">${p.pocet}</td><td style="padding:6px 4px;text-align:right;white-space:nowrap">${p.vazene ? '—' : kc(p.prumCena)}</td>
        <td style="padding:6px 4px;text-align:right;white-space:nowrap">${p.prumZaJed != null ? kc(p.prumZaJed) + '/' + e(p.jed) : '<span style="color:#a8aec8">—</span>'}</td>
        <td style="padding:6px 4px;color:var(--income)">${p.nejlevneji ? e(p.nejlevneji.o) : '<span style="color:#a8aec8">—</span>'}</td></tr>`).join('')}
    </table></div>
    ${spPolozky(r).length > 40 ? `<div style="font-size:.7rem;color:#a8aec8;margin-top:6px">Zobrazeno 40 položek s nejvyšší útratou – zužte filtry.</div>` : ''}
  </div></div>`;
}

function spTabHTML() { return '<div id="utab-polstat-content" style="display:none"></div>'; }

Object.assign(window, { spRadky, spFiltruj, spSeskup, spPolozky, spNastav, spReset, spRender, spTabHTML });
