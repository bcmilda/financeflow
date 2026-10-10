// FinanceFlow · v11.41 · taxonomie.js · 2026-10-07
// ══════════════════════════════════════════════════════
//  S24 (T2, PLAN-mapa-produktu): TAXONOMIE VÝROBKŮ
//  Zdroj: data/taxonomie.json (13 oblastí · 139 podkategorií · ~900 obecných názvů).
//
//  Model: raw z účtenky → výrobek (community/productMap) → OBECNÝ NÁZEV →
//         podkategorie → oblast → COICOP (+ výchozí rozpočtová kategorie).
//  Záznam mapy ukazuje jen na obecný název (`obecnyId` = normName názvu).
//  Podkategorie, oblast, COICOP a rozpočet se dohledávají TADY – jedno místo,
//  takže přesun „jogurtu" do jiné podkategorie nevyžaduje přepis mapy.
//
//  Taxonomie je statický soubor v repu (mění se výjimečně, verzuje se s kódem).
//  Když se nenačte, všechny funkce vrací null / [] a appka se chová jako dřív.
// ══════════════════════════════════════════════════════

const TAX_URL = 'data/taxonomie.json?v=1.2-20261007';   // S24 v11.16: rozpočet Osobní péče → cat47, Zvířata → cat44
let _tax = null, _taxIndex = null, _taxNacitani = null, _taxSlova = null;

function _taxNorm(t) {
  return (typeof normName === 'function') ? normName(t) : String(t || '').toLowerCase().trim();
}

//  Z načteného JSONu postaví index obecnyId → plná informace. Čistá funkce
//  (testuje tools/smoke_taxonomie_t2.js bez fetch).
function taxPostavIndex(T) {
  const idx = {};
  (T && T.oblasti || []).forEach(o => (o.podkategorie || []).forEach(p => (p.nazvy || []).forEach(x => {
    const n = typeof x === 'string' ? x : x.n;
    const id = _taxNorm(n);
    if (!id || idx[id]) return;
    idx[id] = {
      id, nazev: n,
      podId: p.id, podNazev: p.nazev,
      oblastId: o.id, oblastNazev: o.nazev, ikona: o.ikona || '',
      coicop: (typeof x === 'object' && x.coicop) || p.coicop || '',
      //  S25: 5. úroveň CZ-COICOP (příloha potravin ČSÚ) – jen karta a Statistika položek;
      //  „coicop“ (4. úroveň) zůstává pro Srovnání ČR a inflaci.
      coicop5: (p.c5 && p.c5[n]) || '',
      rozpocet: p.rozpocet || o.rozpocet || '',
    };
  })));
  return idx;
}

function taxNastav(T) {
  _tax = T || null;
  _taxIndex = T ? taxPostavIndex(T) : null;
  _taxSlova = _taxIndex ? Object.values(_taxIndex).map(z => ({ z, slova: z.id.split(' ') }))
    .sort((a, b) => b.slova.length - a.slova.length || b.z.id.length - a.z.id.length) : null;
  return _taxIndex;
}

function loadTaxonomie() {
  if (_taxIndex) return Promise.resolve(_taxIndex);
  if (_taxNacitani) return _taxNacitani;
  _taxNacitani = fetch(TAX_URL)
    .then(r => r.ok ? r.json() : null)
    .then(j => taxNastav(j))
    .catch(e => { console.warn('taxonomie: načtení selhalo', e && e.message); _taxNacitani = null; return null; });
  return _taxNacitani;
}

//  Informace k obecnému názvu podle id (nebo textu).
function taxInfo(idNeboText) {
  if (!_taxIndex || !idNeboText) return null;
  return _taxIndex[idNeboText] || _taxIndex[_taxNorm(idNeboText)] || null;
}

//  Návrh obecného názvu pro zkratku z účtenky nebo volný text.
//   1) přesná shoda („mleko" → mléko)
//   2) všechna slova názvu jsou v textu („polotucne mleko 1l" → polotučné mléko,
//      delší a specifičtější název vyhrává nad „mléko")
//   3) zkratky z pokladny: každé slovo názvu začíná některým slovem textu
//      o délce aspoň 3 („jog ovoc" → ovocný jogurt, „k exo vlock" → ovesné vločky? ne –
//      „exo" nesedí, a to je správně: raději nic než nesmysl)
//  Vrací {info, jistota: 'presne'|'slova'|'tvar'|'zkratka'} nebo null.
function taxNavrh(text) {
  if (!_taxIndex || !text) return null;
  const q = _taxNorm(text);
  if (!q) return null;
  if (_taxIndex[q]) return { info: _taxIndex[q], jistota: 'presne' };
  const tokeny = q.split(' ').filter(Boolean);
  const mnozina = new Set(tokeny);
  for (const { z, slova } of _taxSlova) {
    if (slova.every(s => mnozina.has(s))) return { info: z, jistota: 'slova' };
  }
  //  S24 (v11.09): jiný tvar slova – účtenky píšou „Banány", „Jablka", „Sýry".
  //  Shoda, když token = slovo + max. 2 znaky koncovky, nebo mají stejný kmen
  //  (bez koncových samohlásek, jen u slov delších než 4 znaky).
  const kmen = w => w.length > 4 ? w.replace(/[aeiouy]+$/, '') : w;
  const tvar = (s, t) => (t.startsWith(s) && t.length - s.length <= 2) || (s.length > 4 && t.length > 4 && kmen(s) === kmen(t));
  for (const { z, slova } of _taxSlova) {
    if (slova.every(s => tokeny.some(t => tvar(s, t)))) return { info: z, jistota: 'tvar' };
  }
  const kratke = tokeny.filter(t => t.length >= 3);
  if (!kratke.length) return null;
  for (const { z, slova } of _taxSlova) {
    const pouzite = new Set();
    const ok = slova.every(s => {
      const t = kratke.find(t => !pouzite.has(t) && s.startsWith(t));
      if (t) { pouzite.add(t); return true; }
      return false;
    });
    //  Víceslovný název: stačí shoda všech slov. Jednoslovný jen když zkratka
    //  pokryje aspoň polovinu slova a je jednoznačná („jog" → jogurt ano).
    if (!ok) continue;
    if (slova.length > 1) return { info: z, jistota: 'zkratka' };
    //  Jednoslovný název: zkratka musí být jednoznačná („sal" = salát i salám → nic).
    const t = [...pouzite][0];
    const vic = _taxSlova.filter(x => x.slova.length === 1 && x.slova[0].startsWith(t)).length;
    if (vic === 1 && t.length * 2 >= slova[0].length) return { info: z, jistota: 'zkratka' };
  }
  return null;
}

//  Hledání pro našeptávač: začátek názvu > kdekoli v názvu > název podkategorie.
function taxHledej(text, limit) {
  if (!_taxIndex) return [];
  const q = _taxNorm(text);
  if (!q) return [];
  const v = Object.values(_taxIndex), a = [], b = [], c = [];
  v.forEach(z => {
    if (z.id.startsWith(q)) a.push(z);
    else if (z.id.includes(q)) b.push(z);
    else if (_taxNorm(z.podNazev).includes(q)) c.push(z);
  });
  return [...a, ...b, ...c].slice(0, limit || 12);
}

//  Hotová data pro záznam mapy z vybraného obecného názvu. catId = výchozí
//  rozpočtová kategorie (id výchozí sady, takže ji mají všichni uživatelé –
//  řeší ADR-172), coicop = oddíl (číslo 1–13, jak ho čekají pravidla a appka).
function taxDoMapy(info) {
  if (!info) return null;
  const oddil = parseInt(String(info.coicop).slice(0, 2), 10);
  return {
    obecnyId: info.id,
    obecny: info.nazev.slice(0, 40),
    catId: info.rozpocet || '',
    ...(oddil >= 1 && oddil <= 13 ? { coicop: oddil } : {}),
  };
}

function taxSeznam() { return _taxIndex ? Object.values(_taxIndex) : []; }
function taxData() { return _tax; }

Object.assign(window, { loadTaxonomie, taxNastav, taxPostavIndex, taxInfo, taxNavrh, taxHledej, taxDoMapy, taxSeznam, taxData });
