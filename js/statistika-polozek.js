// FinanceFlow · v11.35 · statistika-polozek.js · 2026-10-06
// ══════════════════════════════════════════════════════════════════════
//  S25 (Milan): STATISTIKA POLOŽEK – statistický nástroj nad Mapou položek
//  cesta: Analýza účtenek → 📐 Statistika položek
//  Každý řádek = jedna položka z účtenky. Filtry: období, COICOP / skupina ČSÚ,
//  oblast a podkategorie taxonomie, obchod, štítek, kategorie rozpočtu, jen
//  s čárovým kódem, hledání. Seskupení podle libovolné dimenze, vývoj po
//  měsících a tabulka položek (klik = karta výrobku z Mapy položek).
//  Čisté funkce spRadky / spFiltruj / spSeskup jsou testované (smoke_statistika_polozek.js).
// ══════════════════════════════════════════════════════════════════════

let _spFiltr = { obdobi: '12', coicop: '', oblast: '', pod: '', obchod: '', stitek: '', kat: '', kod: false, q: '', podle: 'csu' };

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
    const kat = kats[(m && m.z.catId) || it.itemCatId || ''];
    out.push({
      datum: r.date || '', mesic: String(r.date || '').slice(0, 7), obchod: obch(r.store || '') || '—',
      nazev: (m && m.z.nazev) || it.name, klic, mapaI: m ? m.i : -1,
      castka, mnozstvi: q, vazene: vaz(it), cenaJed: q ? castka / q : castka,
      coicop: pg ? kodCsu(pg.code) : '', csu: pg ? pg.group : '', oddil: pg ? String(pg.code).slice(0, 2) : '',
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
    (!f.coicop || x.coicop === f.coicop || x.coicop.startsWith(f.coicop + '.') || x.oddil === f.coicop) &&
    (!f.oblast || x.oblast === f.oblast) && (!f.pod || x.pod === f.pod) &&
    (!f.obchod || x.obchod === f.obchod) && (!f.stitek || x.stitek === f.stitek) && (!f.kat || x.kat === f.kat) &&
    (!f.kod || !!x.ean) && (!q || x.nazev.toLowerCase().includes(q) || x.obecny.toLowerCase().includes(q)));
}

const SP_PODLE = {
  csu: { n: 'Skupina ČSÚ', k: x => x.coicop ? x.coicop + ' · ' + x.csu : '— mimo koš ČSÚ' },
  oddil: { n: 'Oddíl COICOP', k: x => x.oddil ? spOddilNazev(x.oddil) : '— nezařazeno' },
  oblast: { n: 'Oblast', k: x => x.oblast || '— mimo taxonomii' },
  pod: { n: 'Podkategorie', k: x => x.pod || '— mimo taxonomii' },
  obecny: { n: 'Obecný název', k: x => x.obecny || '— mimo taxonomii' },
  obchod: { n: 'Obchod', k: x => x.obchod },
  stitek: { n: 'Štítek', k: x => x.stitek || '— bez štítku' },
  kat: { n: 'Kategorie rozpočtu', k: x => x.kat || '— nezařazeno' },
  polozka: { n: 'Položka', k: x => x.nazev },
  mesic: { n: 'Měsíc', k: x => x.mesic || '—' },
};
function spOddilNazev(o) {
  const g = (typeof COICOP_GROUPS_DEF !== 'undefined') ? COICOP_GROUPS_DEF.find(c => String(c.id).padStart(2, '0') === o) : null;
  return o + (g ? ' · ' + g.name : '');
}

function spSeskup(radky, podle) {
  const fn = (SP_PODLE[podle] || SP_PODLE.csu).k; const g = {};
  radky.forEach(x => { const k = fn(x); const s = g[k] || (g[k] = { klic: k, castka: 0, pocet: 0, polozky: new Set() }); s.castka += x.castka; s.pocet++; s.polozky.add(x.klic); });
  return Object.values(g).map(s => ({ ...s, castka: Math.round(s.castka * 100) / 100, polozek: s.polozky.size })).sort((a, b) => b.castka - a.castka);
}

//  Tabulka položek: útrata, počet, průměrná cena, nejlevnější obchod.
function spPolozky(radky) {
  const g = {};
  radky.forEach(x => {
    const s = g[x.klic] || (g[x.klic] = { klic: x.klic, nazev: x.nazev, mapaI: x.mapaI, castka: 0, pocet: 0, ceny: {}, vazene: x.vazene, ean: x.ean });
    s.castka += x.castka; s.pocet++;
    const c = s.ceny[x.obchod] || (s.ceny[x.obchod] = []); c.push(x.cenaJed);
  });
  return Object.values(g).map(s => {
    const prum = Object.entries(s.ceny).map(([o, a]) => ({ o, c: a.reduce((p, v) => p + v, 0) / a.length })).sort((a, b) => a.c - b.c);
    const vse = [].concat(...Object.values(s.ceny));
    return { ...s, castka: Math.round(s.castka * 100) / 100, prumCena: vse.reduce((p, v) => p + v, 0) / vse.length,
      nejlevneji: prum.length > 1 ? prum[0] : null, obchodu: prum.length };
  }).sort((a, b) => b.castka - a.castka);
}

function spNastav(k, v) {
  _spFiltr[k] = v;
  if (k === 'oblast') _spFiltr.pod = '';
  spRender();
}
function spReset() { _spFiltr = { obdobi: '12', coicop: '', oblast: '', pod: '', obchod: '', stitek: '', kat: '', kod: false, q: '', podle: _spFiltr.podle }; spRender(); }

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
  //  COICOP volby: oddíly + třídy, které se v datech vyskytují
  const coicopOpts = uniq(x => x.oddil).concat(uniq(x => x.coicop));
  const csuNazev = {}; vse.forEach(x => { if (x.coicop) csuNazev[x.coicop] = x.csu; });
  const fmtCoicop = o => o.length === 2 ? spOddilNazev(o) : o + ' · ' + (csuNazev[o] || '');

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
      <tr style="color:#a8aec8;text-align:left"><th style="padding:5px 4px">Položka</th><th style="padding:5px 4px;text-align:right">Útrata</th><th style="padding:5px 4px;text-align:right">Ks</th><th style="padding:5px 4px;text-align:right">Ø cena</th><th style="padding:5px 4px">Nejlevněji</th></tr>
      ${pol.map(p => `<tr style="border-top:1px solid var(--border);${p.mapaI >= 0 ? 'cursor:pointer' : ''}" ${p.mapaI >= 0 ? `onclick="mapaUzivDetail(${p.mapaI})"` : ''}>
        <td style="padding:6px 4px;overflow-wrap:anywhere">${p.ean ? '▮▮ ' : ''}${e(p.nazev)}</td><td style="padding:6px 4px;text-align:right;font-weight:700;white-space:nowrap">${kc(p.castka)}</td>
        <td style="padding:6px 4px;text-align:right">${p.pocet}</td><td style="padding:6px 4px;text-align:right;white-space:nowrap">${kc(p.prumCena)}${p.vazene ? '/kg' : ''}</td>
        <td style="padding:6px 4px;color:var(--income)">${p.nejlevneji ? e(p.nejlevneji.o) : '<span style="color:#a8aec8">—</span>'}</td></tr>`).join('')}
    </table></div>
    ${spPolozky(r).length > 40 ? `<div style="font-size:.7rem;color:#a8aec8;margin-top:6px">Zobrazeno 40 položek s nejvyšší útratou – zužte filtry.</div>` : ''}
  </div></div>`;
}

function spTabHTML() { return '<div id="utab-polstat-content" style="display:none"></div>'; }

Object.assign(window, { spRadky, spFiltruj, spSeskup, spPolozky, spNastav, spReset, spRender, spTabHTML });
