// FinanceFlow · v11.36 · product-db.js · 2026-10-06
//  PRODUKTOVÁ DB – ČSÚ spotřební koš 2026 (Session 12.1)
//  Mapuje názvy položek z účtenek na produktové skupiny
//  (CZ-COICOP třídy) a krátké tagy. Zdroj: data/product-groups.json
//  (402 skupin, 427 reprezentantů ČSÚ, 1000+ klíčových slov).
//  Použití: lokální klasifikace položek PŘED/MÍSTO AI → méně
//  AI volání (synergie s rate limitingem ADR-041) a konzistentní
//  tagy kompatibilní s community/itemTags.
// ══════════════════════════════════════════════════════

let _productDB = null;
let _productDBLoading = null;
let _pgKeysSorted = null; // klíče seřazené od nejdelších (specifičtější vyhrává)

function loadProductDB(){
  if(_productDB) return Promise.resolve(_productDB);
  if(_productDBLoading) return _productDBLoading;
  _productDBLoading = fetch('data/product-groups.json?v=20260610')
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      _productDB = j;
      if(j && j.keywords){
        _pgKeysSorted = Object.keys(j.keywords).sort((a,b)=>b.length-a.length);
      }
      return j;
    })
    .catch(e => { console.warn('product-db: načtení selhalo', e?.message); return null; });
  return _productDBLoading;
}

// Normalizace shodná s saveItemTagMapping v receipts.js (NFD, bez diakritiky)
function _pgNorm(s){
  //  S23 (PLAN F1): jednotná normalizace z helpers.js.
  if (typeof normName === 'function') return normName(s);
  return String(s||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\d+\s*(g|kg|ml|l|ks|x)\b/g,' ')   // gramáže pryč ("JOG.BILY 150G" → "jog.bily")
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ').trim();
}

// Lookup: název položky → {code, tag, group} | null
// Delší klíče mají přednost (specifičtější shoda vyhrává);
// krátké klíče (≤4 znaky) musí sedět na začátek slova, ne uvnitř.
function productGroupLookup(name){
  if(!_productDB || !_pgKeysSorted) return null;
  const n = ' ' + _pgNorm(name) + ' ';
  if(n.trim().length < 2) return null;
  for(const k of _pgKeysSorted){
    const hit = k.length > 4 ? n.includes(k) : n.includes(' ' + k);
    if(hit){
      const code = _productDB.keywords[k];
      const g = _productDB.groups[code];
      return {
        code,
        tag: (_productDB.tags && _productDB.tags[code]) || (g ? g.n : ''),
        group: g ? g.n : '',
        w: g && g.w ? g.w : 0   // S25: váha ve spotřebním koši ČSÚ (‰)
      };
    }
  }
  return null;
}

//  Štítky, které uživatel položkám dal na dřívějších účtenkách (nejnovější vyhrává).
function pgMojeStitky(D) {
  const out = {};
  const R = ((D || (typeof S !== 'undefined' ? S : null) || {}).receipts || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  R.forEach(r => (r.items || []).forEach(it => { if (it && it.name && it.tag) { const k = _pgNorm(it.name); if (k) out[k] = it.tag; } }));
  return out;
}
window.pgMojeStitky = pgMojeStitky;
// ══════════════════════════════════════════════════════════════════════
//  S25 (Milan): ČÍSELNÍK CZ-COICOP 2018 (data/coicop2018.json z jeho XLSX)
//  oddíl 01 › skupina 01.1 › třída 01.1.1 › podtřída 01.1.1.1 › položka přílohy
//  potravin 01.1.1.1.2. Appka dřív psala kódy zkráceně (01.113 = 01.1.1.3,
//  01.122.1 = 01.1.2.2.1) – coicopNorm je převede na zápis ČSÚ.
// ══════════════════════════════════════════════════════════════════════
let _coicop = null, _coicopLoading = null;
function loadCoicop() {
  if (_coicop) return Promise.resolve(_coicop);
  if (_coicopLoading) return _coicopLoading;
  _coicopLoading = fetch('data/coicop2018.json?v=20261006')
    .then(r => r.ok ? r.json() : null).then(j => { _coicop = j && j.polozky ? j.polozky : null; return _coicop; })
    .catch(e => { console.warn('coicop: načtení selhalo', e?.message); return null; });
  return _coicopLoading;
}
function coicopNastav(polozky) { _coicop = polozky || null; }
//  „01.113“ → „01.1.1.3“, „01.122.1“ → „01.1.2.2.1“, „01.1.1.3“ zůstane, „1“ → „01“
function coicopNorm(code) {
  const s = String(code == null ? '' : code).trim(); if (!s) return '';
  const p = s.split('.');
  const odd = p[0].padStart(2, '0');
  if (p.length === 1) return odd;
  if (p[1].length > 1) return [odd, ...p[1].split(''), ...p.slice(2)].join('.');
  return [odd, ...p.slice(1)].join('.');
}
function _coicopHezky(n, u) { n = String(n || ''); return u <= 2 && n === n.toUpperCase() ? n.charAt(0) + n.slice(1).toLocaleLowerCase('cs') : n; }
function coicopNazev(code) {
  const k = coicopNorm(code); const x = _coicop && _coicop[k];
  return x ? _coicopHezky(x.n, x.u) : '';
}
//  Cesta od oddílu k nejhlubší známé úrovni: [{kod, nazev, uroven}]
function coicopCesta(code) {
  const k = coicopNorm(code); if (!k) return [];
  const p = k.split('.'); const out = [];
  for (let i = 1; i <= p.length; i++) {
    const c = p.slice(0, i).join('.'); const x = _coicop && _coicop[c];
    if (x) out.push({ kod: c, nazev: _coicopHezky(x.n, x.u), uroven: x.u, typ: x.t || '' });
  }
  return out;
}
window.loadCoicop = loadCoicop; window.coicopNastav = coicopNastav; window.coicopNorm = coicopNorm;
window.coicopNazev = coicopNazev; window.coicopCesta = coicopCesta;

function pgStitekZNazvu(n) { n = String(n || '').trim(); return n ? n.charAt(0).toUpperCase() + n.slice(1) : ''; }
// CZ-COICOP kód z produktové DB („01.113“) v zápisu ČSÚ („01.1.1.3“)
function pgKodCsu(code) { return coicopNorm(code); }
window.pgStitekZNazvu = pgStitekZNazvu; window.pgKodCsu = pgKodCsu;
// Předvyplnění tagů položek účtenky (jen tam, kde tag chybí) – volá buildReceiptPreviewHTML
function productGroupPrefill(receipt){
  if(!receipt || !Array.isArray(receipt.items)) return 0;
  if(!_productDB){ loadProductDB(); return 0; } // DB se dotáhne pro příští analýzu
  let filled = 0;
  //  S25 (Milan, v11.34): štítek podle modelu ČSÚ (skupina spotřebního koše). Pokus o „název
  //  v kategorii“ z taxonomie (v11.33) dělal chyby („RELAX JABL-ARONIE“ → Jablko místo džusu),
  //  proto zpět na ČSÚ. Nově ale nejdřív TVŮJ štítek, který jsi stejné položce dal dřív –
  //  co jednou opravíš, příště se nabídne samo.
  const moje = pgMojeStitky();
  receipt.items.forEach(it => {
    if(it && it.name && !it.tag){
      const k = _pgNorm(it.name);
      if (k && moje[k]) { it.tag = moje[k]; filled++; return; }
      const hit = productGroupLookup(it.name);
      if(hit && hit.tag){ it.tag = hit.tag; filled++; }
    }
  });
  return filled;
}

// Začni načítat hned po startu (114 kB, cachuje SW)
loadProductDB();
