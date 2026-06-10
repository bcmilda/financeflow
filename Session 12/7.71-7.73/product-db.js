// ══════════════════════════════════════════════════════
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
        group: g ? g.n : ''
      };
    }
  }
  return null;
}

// Předvyplnění tagů položek účtenky (jen tam, kde tag chybí) – volá buildReceiptPreviewHTML
function productGroupPrefill(receipt){
  if(!receipt || !Array.isArray(receipt.items)) return 0;
  if(!_productDB){ loadProductDB(); return 0; } // DB se dotáhne pro příští analýzu
  let filled = 0;
  receipt.items.forEach(it => {
    if(it && it.name && !it.tag){
      const hit = productGroupLookup(it.name);
      if(hit && hit.tag){ it.tag = hit.tag; filled++; }
    }
  });
  return filled;
}

// Začni načítat hned po startu (114 kB, cachuje SW)
loadProductDB();
