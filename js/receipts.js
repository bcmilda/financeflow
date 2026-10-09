// FinanceFlow · v11.60 · receipts.js · 2026-10-09

// S19 (TODO-219, Milan): „nemusíš do každé tabulky připisovat příznak Kč, stačí
//   někde do popisku, podstatné je aby se přepočítala částka. Důležité tam
//   nemíchat jiné jednotky (l, kg, g)."
//   receipts.js je jediný modul, kde se koruny potkávají s cenami za kus, za kilo
//   a s počty kusů. Proto se prošlo místo po místě:
//     _cNum(v)  → jen přepočet, BEZ symbolu   (osy grafů, popisky s vlastní jednotkou
//                 typu „Kč/ks", „Kč/měs", sloupce s jednotkou pod číslem)
//     fmtB(v)   → přepočet SE symbolem        (samostatné částky ve větách a kartách)
//   Počty kusů (metric==='qty', totalQty) se NEPŘEVÁDĚJÍ – nejsou to peníze.
const _cNum = v => fmt(Math.round(czkToBase(v)));
//  ANALÝZA ÚČTENEK
// ══════════════════════════════════════════════════════
// ── lineAmt helper: bezpečný výpočet celkové ceny položky ──
// Nové záznamy mají it.lineTotal (z opraveného AI promptu).
// Staré záznamy mají it.price = cena/ks → fallback na price × qty.
//  S25 (Milan): VÁŽENÉ ZBOŽÍ (0,192 kg × 289 Kč/kg). V editoru se ukazuje částka za položku
//  jako na účtence a jednotka kg/l; cena za kg je drobně pod ní (a v Zdražování / Mapě).
function rpVazene(it) {
  if (!it) return false;
  if (/^(kg|l)$/i.test(String(it.unit || ''))) return true;
  const q = parseFloat(it.qty);
  return isFinite(q) && q > 0 && Math.abs(q - Math.round(q)) > 1e-9;
}
function rpVazJed(it) { const u = String((it && it.unit) || '').toLowerCase(); return u === 'l' ? 'l' : 'kg'; }
window.rpVazene = rpVazene; window.rpVazJed = rpVazJed;
function lineAmt(it) {
  if(it && it.lineTotal != null) return parseFloat(it.lineTotal) || 0;
  return (parseFloat(it?.price) || 0) * (parseFloat(it?.qty) || 1);
}
// ══════════════════════════════════════════════════════
//  S23 (Milan): OBECNÝ NÁZEV POLOŽKY („Uzeniny", „Pečivo", „Zboží 21%")
//  Typické u řezníka, v trafice nebo na obecně nastaveném terminálu: na účtence
//  není výrobek, ale ODDĚLENÍ. Čtyři různé salámy pak vypadají jako jedna
//  položka „Uzeniny", která „zdražila o 35 %". Nejde z toho poznat výrobek,
//  gramáž ani cena za kilo – takže se to nesmí hodnotit ve zdražování, inflaci
//  ani v počtu kusů. Falešná shoda je horší než žádná (SKILL 33).
//  Útrata se počítá dál normálně; vyřazuje se jen POROVNÁVÁNÍ CEN.
//  Uživatel může název v editoru účtenky upřesnit – pak položka obecná není.
// ══════════════════════════════════════════════════════
const RP_GENERIC_NAMES = ['uzeniny','uzenina','maso','masne vyrobky','maso a uzeniny','pecivo','bezne pecivo','jemne pecivo','cukrovinky',
  'ovoce','zelenina','ovoce a zelenina','ovoce zelenina','lahudky','lahudka','mlecne vyrobky','mlecne','syry','napoje','nealko','alkohol',
  'potraviny','zbozi','ruzne','ruzne zbozi','ostatni','ostatni zbozi','prodej','prodej zbozi','polozka','sortiment','drogerie','tabak',
  'tabakove vyrobky','tisk','noviny','casopisy','kvetiny','darkove zbozi','textil','obuv','hracky','papirnictvi','domaci potreby','zelezarstvi',
  'obcerstveni','jidlo','hotova jidla','hotove jidlo','menu','obed','polevka','hlavni jidlo','sluzba','sluzby','oddeleni'];
function rpIsGenericName(name){
  let n = String(name||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  n = n.replace(/\b\d{1,2}\s*%/g,' ')                 // sazba DPH: „Zboží 21%"
       .replace(/\bdph\b|\bsazba\b|\bodd\.?\b|\bzakladni\b|\bsnizena\b/g,' ')
       .replace(/[^a-z ]+/g,' ').replace(/\s+/g,' ').trim();
  if(!n) return true;                                  // jen čísla/znaky = žádný název
  return RP_GENERIC_NAMES.includes(n);
}
window.rpIsGenericName = rpIsGenericName;

// ── COICOP globální konstanty a engine ──
// CZ-COICOP 2018 (platná od 1.1.2024) – 13 oddílů spotřebních výdajů domácností.
// avg_osoba = odhad Kč/osoba/měsíc (kalibrováno na ověřené kotvy ČSÚ 2024:
//   potraviny ~3000, alkohol+tabák ~310+, celkem ~20000/os/měs; struktura dle ČSÚ proporcí).
// avg_domacnost = avg_osoba × 2.4 (průměrná velikost domácnosti). Pro reálné srovnání
//   uživatele se použije OECD ekvivalent jeho domácnosti (calcOECD), ne tato hodnota.
// TODO: až bude k dispozici oficiální tabulka ČSÚ 2024 (Tab.1b), přepsat avg_osoba přesnými čísly.
const COICOP_GROUPS_DEF = [
  {id:1,  name:'Potraviny a nealkoholické nápoje',     icon:'🛒', color:'#4ade80', avg_osoba:3300, avg_domacnost:7920, groups:['01.1 Potraviny','01.2 Nealkoholické nápoje']},
  {id:2,  name:'Alkoholické nápoje, tabák',            icon:'🍺', color:'#f59e0b', avg_osoba:620,  avg_domacnost:1490, groups:['02.1 Alkoholické nápoje','02.2 Služby pro výrobu alkoholu','02.3 Tabákové výrobky','02.4 Narkotika']},
  {id:3,  name:'Odívání a obuv',                       icon:'👗', color:'#f472b6', avg_osoba:700,  avg_domacnost:1680, groups:['03.1 Oděvy','03.2 Obuv']},
  {id:4,  name:'Bydlení, voda, energie, paliva',       icon:'🏠', color:'#60a5fa', avg_osoba:5200, avg_domacnost:12480, groups:['04.1 Nájemné z bytu','04.3 Běžná údržba a opravy bytu','04.4 Dodávka vody a jiné služby','04.5 Elektřina, plyn a ostatní paliva']},
  {id:5,  name:'Vybavení domácnosti, údržba',          icon:'🛋️', color:'#a78bfa', avg_osoba:1100, avg_domacnost:2640, groups:['05.1 Nábytek a vybavení','05.2 Bytový textil','05.3 Domácí spotřebiče','05.4 Sklo, nádobí a potřeby','05.5 Nářadí pro dům a zahradu','05.6 Běžná údržba domácnosti']},
  {id:6,  name:'Zdraví',                               icon:'💊', color:'#f87171', avg_osoba:900,  avg_domacnost:2160, groups:['06.1 Léčiva a zdravotnické potřeby','06.2 Ambulantní služby','06.3 Nemocniční služby']},
  {id:7,  name:'Doprava',                              icon:'🚗', color:'#fb923c', avg_osoba:2400, avg_domacnost:5760, groups:['07.1 Nákup vozidel','07.2 Provoz osobní dopravy','07.3 Dopravní služby']},
  {id:8,  name:'Informace a komunikace',               icon:'📱', color:'#34d399', avg_osoba:750,  avg_domacnost:1800, groups:['08.1 Poštovní služby','08.2 Telefon a zařízení','08.3 Internet a informační služby']},
  {id:9,  name:'Rekreace, sport a kultura',            icon:'🎭', color:'#e879f9', avg_osoba:1900, avg_domacnost:4560, groups:['09.1 Audiovizuální a IT zařízení','09.2 Sport, zahrada, mazlíčci','09.3 Rekreační a kulturní služby','09.4 Tisk, knihy, papírnictví','09.5 Dovolené (balíčky)']},
  {id:10, name:'Vzdělávání',                           icon:'📚', color:'#2dd4bf', avg_osoba:250,  avg_domacnost:600,  groups:['10.x Vzdělávání (předškolní až vysokoškolské)']},
  {id:11, name:'Stravování a ubytování',               icon:'🍽️', color:'#facc15', avg_osoba:1500, avg_domacnost:3600, groups:['11.1 Stravovací služby','11.2 Ubytovací služby']},
  {id:12, name:'Pojištění a finanční služby',          icon:'🛡️', color:'#94a3b8', avg_osoba:900,  avg_domacnost:2160, groups:['12.1 Pojištění','12.2 Finanční služby']},
  {id:13, name:'Osobní péče, sociální ochrana, různé', icon:'🧴', color:'#cbd5e1', avg_osoba:1100, avg_domacnost:2640, groups:['13.1 Osobní péče','13.2 Sociální ochrana','13.3 Jiné zboží a služby']},
];
const COICOP_KEYWORDS = {
  'lidl':1,'tesco':1,'kaufland':1,'albert':1,'billa':1,'globus':1,'penny':1,'coop':1,
  'rohlik':1,'rohlík':1,'košík':1,'potraviny':1,'supermarket':1,'hypermarket':1,
  'pivo':2,'víno':2,'vino':2,'vodka':2,'rum':2,'whisky':2,'cigarety':2,'tabák':2,
  'zara':3,'h&m':3,'reserved':3,'deichmann':3,'boty':3,'oblečení':3,'tričko':3,
  'nájem':4,'najem':4,'elektřina':4,'plyn':4,'energie':4,'čez':4,'eon':4,'innogy':4,'fond oprav':4,'popelnice':4,
  'ikea':5,'hornbach':5,'obi':5,'alza':5,'pračka':5,'lednice':5,'myčka':5,'jar':5,'prací':5,'nábytek':5,
  'lékárna':6,'ibuprofen':6,'paralen':6,'vitamin':6,'doktor':6,'zubař':6,'brýle':6,'benu':6,'dr.max':6,
  'shell':7,'omv':7,'benzina':7,'mol':7,'benzín':7,'nafta':7,'benzin':7,'tramvaj':7,'metro':7,'mhd':7,
  'lítačka':7,'regiojet':7,'české dráhy':7,'bolt':7,'uber':7,'taxi':7,'autoservis':7,
  't-mobile':8,'o2':8,'vodafone':8,'mobil':8,'telefon':8,'internet':8,'wifi':8,
  'netflix':9,'spotify':9,'youtube':9,'hbo':9,'disney':9,'kino':9,'fitness':9,'hotel':9,'booking':9,'airbnb':9,
  'kurz':10,'školení':10,'angličtina':10,'škola':10,
  'mcdonald':11,'kfc':11,'burger':11,'pizza':11,'kebab':11,'restaurace':11,'bistro':11,'kavárna':11,'café':11,'sushi':11,
  'pojištění':12,'pojisteni':12,'banka':12,'poplatek':12,'holič':12,'kadeřník':12,
  'dar':13,'dárek':13,'půjčka':13,
};
const COICOP_CATEGORY_MAP = {
  'Jídlo & Nákupy':1,'Potraviny':1,'Alkohol':2,'Tabák':2,'Oblečení':3,'Obuv':3,
  'Bydlení':4,'Energie':4,'Nájem':4,'Domácnost':5,'Spotřebiče':5,'Drogerie/Chemie':5,
  'Zdraví':6,'Lékárna':6,'Doprava':7,'Benzín':7,'MHD':7,'Komunikace':8,'Mobil':8,'Internet':8,
  'Rekreace':9,'Zábava':9,'Sport':9,'Dovolená':9,'Vzdělávání':10,'Restaurace':11,'Ubytování':11,
  'Drogerie':12,'Pojištění':12,'Finance':12,'Ostatní':12,'Transfery':13,
};
function mapToCOICOP(tx) {
  const name = ((tx.name||'')+(tx.note||'')).toLowerCase();
  const cat  = tx.catId || tx.category || '';
  const sub  = tx.subcat || '';
  let coicopId = 12, confidence = 0;
  // Session 10: admin keyword_overrides mají PŘEDNOST (confidence 95). Bez nich se
  // přidané pravidlo neprojevilo a transakce zůstávala v Low confidence i po uložení.
  const ov = (typeof window!=='undefined' && window._kwOverrides) ? window._kwOverrides : null;
  if(ov){
    for(const kw of Object.keys(ov)){
      if(kw && name.includes(kw)){
        const o = ov[kw];
        return { coicopId: (o.coicopId!=null?o.coicopId:12), confidence: 95, source:'override' };
      }
    }
  }
  for(const [kw, id] of Object.entries(COICOP_KEYWORDS)) {
    if(name.includes(kw)) { coicopId = id; confidence = 70; break; }
  }
  if(confidence < 70) {
    const D2 = getData();
    const catObj = (D2.categories||[]).find(c=>c.id===cat);
    const catName = catObj?.name || cat;
    if(COICOP_CATEGORY_MAP[catName]) { coicopId = COICOP_CATEGORY_MAP[catName]; confidence = 50; }
  }
  if(confidence < 50 && COICOP_CATEGORY_MAP[sub]) { coicopId = COICOP_CATEGORY_MAP[sub]; confidence = 30; }
  return {coicopId, confidence};
}

// Normalizace názvů obchodů – sloučí varianty jako "PENNY", "PENNY MARKET s.r.o.", "Penny Market"
function normalizeStoreName(name) {
  if(!name) return 'Neznámý';
  let n = name.trim()
    .replace(/\s+(s\.r\.o\.|a\.s\.|spol\. s r\.o\.|s\.p\.|v\.o\.s\.)\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Diakritika → ASCII pro porovnání (ale zobraz originál)
  const lower = n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  // Sloučení nejčastějších variant
  if(lower.includes('penny')) return 'PENNY MARKET';
  if(lower.includes('albert')) return 'ALBERT';
  if(lower.includes('lidl')) return 'LIDL';
  if(lower.includes('kaufland')) return 'KAUFLAND';
  if(lower.includes('tesco')) return 'TESCO';
  if(lower.includes('billa')) return 'BILLA';
  if(lower.includes('globus')) return 'GLOBUS';
  if(lower.includes('cba')) return 'CBA';
  // Zkrácení příliš dlouhých názvů obchodů (max 40 znaků)
  return n.length > 40 ? n.slice(0,38)+'…' : n;
}

function renderUctenky() {
  const el = document.getElementById('uctenkyContent'); if(!el) return;
  // FIX: pokud je otevřený inline editor účtenky, NEPŘEKRESLUJ (Firebase sync by ho zničil).
  // Editor se zavře/uloží přes rpSave nebo toggle → flag se vyčistí.
  if(window._receiptEditorOpen) {
    let anyOpen = false;
    document.querySelectorAll('[id^="rcpt_hist_"]').forEach(s=>{ if(s.style.display==='block' && s.innerHTML.trim()) anyOpen=true; });
    if(anyOpen) return;
    // FIX (S12.1m): žádný otevřený slot (např. po přepnutí stránky/záložky slot zmizel z DOM)
    // → flag i osiřelý stav vyčisti, ať render i příští otevření fungují.
    window._receiptEditorOpen = false;
    window._editReceipt = null;
  }
  //  S25 (v11.48, Milan: „čárové kódy se nepřiřadily, štítek jsem přepisoval dvakrát“):
  //  ROZPRACOVANÁ NOVÁ ÚČTENKA. Chráněný byl jen editor z Historie. Každé save() (od v11.40
  //  i sken čárového kódu – seznam naskenovaných) spustí synchronizaci → renderUctenky →
  //  editor se znovu postavil z PŮVODNÍHO výsledku skenu (_lastReceiptResult.receipt) a všechny
  //  úpravy – kódy, štítky, názvy, kategorie – zmizely. Podle toho, jestli sync doběhl před
  //  přiřazením kódu, nebo po něm, se část kódů uložila a část ne.
  if (_lastReceiptResult && _lastReceiptResult.historyIndex === undefined && window._editReceipt) {
    const pv = document.getElementById('receiptPreview');
    if (pv && pv.style.display !== 'none' && pv.querySelector('#receiptEditForm')) return;
  }
  const receipts = S.receipts || [];

  // Deduplikace – identifikátor: obchod|datum|suma|počet položek
  const _seen = new Set();
  const uniqueReceipts = receipts.filter(r => {
    const key = `${normalizeStoreName(r.store)}|${r.date}|${Math.round((r.total||0)*100)}|${(r.items||[]).length}`;
    if(_seen.has(key)) return false;
    _seen.add(key); return true;
  });
  const dupCount = receipts.length - uniqueReceipts.length;
  const dupList = receipts.filter(r => !uniqueReceipts.includes(r));   // S25: ukázat, které to jsou

  const hasData = uniqueReceipts.length >= 3;
  const allItems = uniqueReceipts.flatMap(r => (r.items||[]).map(it => ({...it, store:normalizeStoreName(r.store), date:r.date})));
  const storeStats = {};
  uniqueReceipts.forEach(r => {
    const s = normalizeStoreName(r.store);
    if(!storeStats[s]) storeStats[s] = {total:0, count:0, visits:0};
    storeStats[s].total += r.total||0;
    storeStats[s].count += (r.items||[]).length;
    storeStats[s].visits++;
    if (r.storeCity) { (storeStats[s].mesta = storeStats[s].mesta || new Set()).add(r.storeCity); }   // S25: města poboček
  });
  const totalSpent = uniqueReceipts.reduce((a,r)=>a+(r.total||0),0);
  const avgReceipt = uniqueReceipts.length ? Math.round(totalSpent/uniqueReceipts.length) : 0;
  const catStats = {};
  uniqueReceipts.forEach(r => {
    const c = r.category||'Jiné';
    if(!catStats[c]) catStats[c] = 0;
    catStats[c] += r.total||0;
  });
  // ── Extrakce hmotnosti/objemu z názvu položky ──
  // Vrátí {value, unit, unitType:'weight'|'volume'|'count'} nebo null
  function extractUnit(name) {
    if(!name) return null;
    const n = name.toLowerCase();
    // Hmotnost: 1kg, 500g, 1.5 kg
    let m = n.match(/(\d+[.,]?\d*)\s*(kg)\b/);
    if(m) return {value: parseFloat(m[1].replace(',','.')), unit:'kg', unitType:'weight'};
    m = n.match(/(\d+[.,]?\d*)\s*(g)\b/);
    if(m) return {value: parseFloat(m[1].replace(',','.')) / 1000, unit:'kg', unitType:'weight', displayUnit:'g'};
    // Objem: 1l, 500ml, 1.5l
    m = n.match(/(\d+[.,]?\d*)\s*(l)\b/);
    if(m) return {value: parseFloat(m[1].replace(',','.')), unit:'l', unitType:'volume'};
    m = n.match(/(\d+[.,]?\d*)\s*(ml)\b/);
    if(m) return {value: parseFloat(m[1].replace(',','.')) / 1000, unit:'l', unitType:'volume', displayUnit:'ml'};
    return null;
  }

  const itemPrices = {};
  let _genericSkipped = 0; const _genericNames = new Set();
  allItems.forEach(it => {
    //  S23: obecný název (oddělení místo výrobku) se do sledování cen nepouští.
    if(rpIsGenericName(it.name)){ _genericSkipped++; _genericNames.add(it.name||'bez názvu'); return; }
    const rawName = (it.name||'').toLowerCase().trim();
    //  S23 (PLAN F1): jednotná normalizace z helpers.js. Množství se z klíče
    //  odstraní schválně (aby 100 g a 90 g téhož výrobku patřily k sobě a šla
    //  poznat shrinkflace), ale NEZAHAZUJE se – bere se vedle jako originalWeight.
    const key = normName(it.name);
    if(key.length < 3) return;

    const qty = Math.max(0.001, it.qty || 1);
    const rawPrice = it.price || 0;
    if(rawPrice <= 0) return;

    const unitPrice = parseFloat(rawPrice.toFixed(2));
    if(unitPrice <= 0) return;

    // Extrahuj hmotnost/objem z názvu → spočítej cenu za kg nebo litr
    const unitInfo = extractUnit(it.name||'');
    // Cena za kg/l:
    //  • vážená položka (unit kg/l): price je UŽ cena/kg → bereme přímo
    //  • kusová položka s hmotností v názvu (Rohlík 43g): cena/ks ÷ hmotnost 1 KS (NE × qty!)
    const _isWeighed = (it.unit === 'kg' || it.unit === 'l');
    let pricePerUnit = null, perUnitLabel = null, pkgWeight = null;
    if (_isWeighed) {
      pricePerUnit = unitPrice;
      perUnitLabel = 'Kč/' + it.unit;
    } else if (unitInfo) {
      pricePerUnit = parseFloat((unitPrice / unitInfo.value).toFixed(2));
      perUnitLabel = 'Kč/' + unitInfo.unit;
      pkgWeight = unitInfo.value; // velikost balení (shrinkflation jen u kusových)
    }

    if(!itemPrices[key]) itemPrices[key] = [];
    itemPrices[key].push({
      date: it.date || '',
      price: unitPrice,
      qty,
      store: it.store || '',
      originalName: it.name || '',
      // Nová pole pro cenu/kg a cenu/l
      unitInfo,
      pricePerUnit,           // Kč/kg nebo Kč/l
      unitLabel: perUnitLabel,
      originalWeight: pkgWeight,
    });
  });

  // Slouč podobné klíče – jen pokud se liší pouze o hmotnost/čísla (např. "rohlík" = "rohlík 43g")
  // NEZLUČUJ "rohlík" se "sladký rohlík" – to jsou různé produkty!
  //
  //  S23 (Milan): SOJOVÉ KOSTKY 100 g A 300 g SE SLILY DO JEDNÉ POLOŽKY a karta
  //  hlásila „↑ 201 %, 19,90 → 59,90 Kč/ks". Nic nezdražilo – jsou to dvě
  //  různá balení (Kč/kg vyšlo správně 0 %). Klíč odřezává gramáž, aby šla
  //  hlídat shrinkflace, jenže tím slil i balení, která spolu nesouvisí.
  //  Falešná shoda je horší než žádná (SKILL 33).
  //  Nově se skupina dělí podle VELIKOSTI BALENÍ: dohromady patří jen balení,
  //  která se liší nejvýš o 25 % (100 g → 90 g je shrinkflace, 100 g → 300 g
  //  je jiný výrobek). Záznam bez gramáže v názvu se přidá k první skupině
  //  téhož jména – tam rozlišit nejde a dosud to tak fungovalo.
  const PKG_TOL = 1.25;
  const _normK = x => x.replace(/\d+/g, '').replace(/\s+/g,' ').trim();
  const _skupiny = [];
  Object.entries(itemPrices).forEach(([key, vals]) => {
    const norm = _normK(key);
    vals.forEach(v => {
      const w = v.originalWeight || null;
      let g = _skupiny.find(x => x.norm === norm && (
        !w || !x.w || (Math.max(w, x.w) / Math.min(w, x.w) <= PKG_TOL)));
      if(!g){
        const stitek = w ? ' ' + (w >= 1 ? String(w).replace('.',',') + 'kg' : Math.round(w*1000) + 'g') : '';
        g = { name: key + stitek, norm, w, vals: [] };
        _skupiny.push(g);
      }
      if(!g.w && w) g.w = w;
      g.vals.push(v);
    });
  });
  const mergedPrices = {};
  _skupiny.forEach(g => {
    let n = g.name, i = 2;
    while(mergedPrices[n]) n = g.name + ' #' + (i++);
    mergedPrices[n] = g.vals;
  });

  window._rpGenericSkipped = { n:_genericSkipped, names:[..._genericNames].slice(0,6) };
  const priceChanges = Object.entries(mergedPrices)
    .filter(([,v]) => v.length >= 2)
    .map(([name, prices]) => {
      const sorted = [...prices].sort((a,b) => a.date.localeCompare(b.date));
      const deduped = sorted.filter((h, i) => {
        if(i === 0) return true;
        return h.price !== sorted[i-1].price;
      });
      if(deduped.length < 2) return null;
      const first = deduped[0].price;
      const last = deduped[deduped.length-1].price;
      const change = first > 0 ? Math.round((last-first)/first*100) : 0;
      const displayName = sorted[sorted.length-1].originalName || name;

      // Cena za jednotku (kg/l)
      const withUnit = sorted.filter(h => h.pricePerUnit !== null && h.pricePerUnit !== undefined);
      let perUnitData = null;
      if(withUnit.length >= 2) {
        const dedupedUnit = withUnit.filter((h,i) => {
          if(i===0) return true;
          return Math.abs(h.pricePerUnit - withUnit[i-1].pricePerUnit) > 0.5;
        });
        if(dedupedUnit.length >= 2) {
          const firstU = dedupedUnit[0].pricePerUnit;
          const lastU = dedupedUnit[dedupedUnit.length-1].pricePerUnit;
          const changeU = firstU > 0 ? Math.round((lastU-firstU)/firstU*100) : 0;
          perUnitData = {history:dedupedUnit, first:firstU, last:lastU, change:changeU, unit:withUnit[0].unitLabel||'Kč/kg'};
        }
      }

      // Shrinkflation: cena stejná, hmotnost klesla
      const shrinkflation = (() => {
        const withW = sorted.filter(h => h.originalWeight);
        if(withW.length < 2) return null;
        const firstW = withW[0].originalWeight;
        const lastW = withW[withW.length-1].originalWeight;
        const wChange = firstW > 0 ? Math.round((lastW-firstW)/firstW*100) : 0;
        if(wChange >= -2) return null;
        return {firstW, lastW, weightChange:wChange,
          label:`${Math.round(firstW*1000)}g → ${Math.round(lastW*1000)}g (${wChange}%)`};
      })();

      return {name, displayName, first, last, change, count:deduped.length,
              history:deduped, allHistory:sorted, perUnitData, shrinkflation};
    })
    .filter(p => p && (Math.abs(p.change) > 3 || p.perUnitData || p.shrinkflation))
    .sort((a,b) => {
      const aScore = (a.shrinkflation?100:0) + Math.abs(a.change);
      const bScore = (b.shrinkflation?100:0) + Math.abs(b.change);
      return bScore - aScore;
    })
    .slice(0, 15);
  // OECD ekvivalent z nastavení
  const householdEquiv = calcOECD(
    _settings?.household_adults || 2,
    _settings?.household_ch013  || 0,
    _settings?.household_ch14   || 0
  );
  const householdSize = householdEquiv;

  // Přepočet ČSÚ průměrů dle OECD ekvivalentu
  COICOP_GROUPS_DEF.forEach(g => { g.avg_domacnost = Math.round(g.avg_osoba * householdEquiv); });

  // Agreguj transakce do COICOP skupin (průměr + měsíční breakdown)
  const D2 = getData();
  const coicopUserTotals = {};
  // S17.13 (FIX-212, Milan): DŘÍV se sčítalo `tx.amount||tx.amt` bez txCZK a bez vyloučení
  // přesunů/splitů/vyrovnání → cizí měny se počítaly v nominálu a přesuny mezi peněženkami
  // se tvářily jako výdaj. Srovnání s ČSÚ tak bylo nadhodnocené.
  const allMonthTxs = (D2.transactions||[]).filter(t =>
    t.type==='expense' && !t.splitParent && !t.isBalancing &&
    !(typeof isTransferTx === 'function' && isTransferTx(t)));
  const txMonths = new Set(allMonthTxs.map(t=>(t.date||'').slice(0,7)));
  const numMonths = Math.max(txMonths.size, 1);
  allMonthTxs.forEach(tx => {
    const {coicopId} = mapToCOICOP(tx);
    coicopUserTotals[coicopId] = (coicopUserTotals[coicopId]||0) + (typeof txCZK==='function' ? txCZK(tx, D2) : (tx.amount||tx.amt||0));
  });
  Object.keys(coicopUserTotals).forEach(id => {
    coicopUserTotals[id] = Math.round(coicopUserTotals[id] / numMonths);
  });

  // Měsíční breakdown – posledních 6 měsíců per COICOP skupina
  const now = new Date();
  const last6Months = [];
  for(let i=5; i>=0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    last6Months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  const coicopMonthly = {}; // {coicopId: {month: total}}
  allMonthTxs.forEach(tx => {
    const month = (tx.date||'').slice(0,7);
    if(!last6Months.includes(month)) return;
    const {coicopId} = mapToCOICOP(tx);
    if(!coicopMonthly[coicopId]) coicopMonthly[coicopId] = {};
    coicopMonthly[coicopId][month] = (coicopMonthly[coicopId][month]||0) + (typeof txCZK==='function' ? txCZK(tx, D2) : (tx.amount||tx.amt||0));  // S17.13 FIX-212
  });

  // Kontrola kompletnosti se počítá přímo v buildCompareTab

  el.innerHTML = (typeof cenyInfoBannerHTML === 'function' ? cenyInfoBannerHTML() : '')   // S25: jednorázové oznámení o sdílení cen
    + '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'
    + '<button class="tx-filt-btn" id="utab-scan" onclick="switchUctenkyTab(\'scan\',this)">📸 Skenovat</button>'
    + '<button class="tx-filt-btn" id="utab-learn" onclick="switchUctenkyTab(\'learn\',this)">🧠 Učení</button>'
    + '<button class="tx-filt-btn" id="utab-mapa" onclick="switchUctenkyTab(\'mapa\',this)">🗺️ Mapa položek</button>'
    + '<button class="tx-filt-btn" id="utab-vyrobky" onclick="switchUctenkyTab(\'vyrobky\',this)">📦 Moje výrobky</button>'
    + '<button class="tx-filt-btn" id="utab-polstat" onclick="switchUctenkyTab(\'polstat\',this)">📐 Statistika položek'+_utDia()+'</button>'
    + '<button class="tx-filt-btn" id="utab-stats" onclick="switchUctenkyTab(\'stats\',this)\">📊 Statistiky'+_utDia()+'</button>'
    + '<button class="tx-filt-btn" id="utab-compare" onclick="switchUctenkyTab(\'compare\',this)\">🇨🇿 Srovnání ČR'+_utDia()+'</button>'
    + '<button class="tx-filt-btn" id="utab-trend" onclick="switchUctenkyTab(\'trend\',this)\">📈 Trend'+_utDia()+'</button>'
    + '<button class="tx-filt-btn" id="utab-prices" onclick="switchUctenkyTab(\'prices\',this)\">💹 Zdražování'+_utDia()+'</button>'
    + '<button class="tx-filt-btn" id="utab-discounts" onclick="switchUctenkyTab(\'discounts\',this)\">💸 Slevy'+_utDia()+'</button>'
    + '<button class="tx-filt-btn" id="utab-doklady" onclick="switchUctenkyTab(\'doklady\',this)\">📎 Doklady'+_utDia()+'</button>'
    + '<button class="tx-filt-btn" id="utab-stores" onclick="switchUctenkyTab(\'stores\',this)\">🏪 Obchody'+_utDia()+'</button>'
    + '<button class="tx-filt-btn" id="utab-history" onclick="switchUctenkyTab(\'history\',this)">📋 Historie</button>'
    + '</div>'
    + (dupCount > 0 ? `<div style="padding:10px 14px;margin-bottom:10px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span style="font-size:.8rem;color:var(--text2)">⚠️ Nalezen${dupCount === 1 ? 'a' : dupCount < 5 ? 'y' : 'o'} <strong>${dupCount} ${dupCount === 1 ? 'duplicitní účtenka' : dupCount < 5 ? 'duplicitní účtenky' : 'duplicitních účtenek'}</strong> (stejný obchod + datum + suma + počet položek) – v přehledech se počítá jen jednou.
          <details style="margin-top:6px"><summary style="cursor:pointer;color:var(--bank)">Zobrazit</summary>${dupList.map(r => `<div style="font-size:.76rem;margin-top:4px">🧾 <b>${escHtml(r.store || '—')}</b> · ${escHtml((r.date || '').split('-').reverse().join('. '))} · ${fmtB(Math.round(r.total || 0))} · ${(r.items || []).length} pol.</div>`).join('')}
            <div style="font-size:.72rem;color:var(--text3);margin-top:4px">Smazáním zmizí kopie účtenky i její transakce v Transakcích – originál zůstane.</div></details></span>
        <button class="btn btn-accent btn-sm" onclick="removeDuplicateReceipts()">🗑️ Smazat duplikáty</button>
      </div>` : '')
    + buildScanTab(uniqueReceipts, totalSpent)
    + buildLearnTab(uniqueReceipts, allItems, storeStats, totalSpent)
    + buildMapaTab(uniqueReceipts)
    //  S25 (v11.55, Milan: „samostatnou kartu“): 📦 Moje výrobky – vlastní záložka (dřív sekce v Mapě položek)
    + '<div id="utab-vyrobky-content" style="display:none"><div class="card"><div class="card-body"><div class="eanMojeBox" data-samostatne="1"></div></div></div></div>'
    + (typeof spTabHTML === 'function' ? spTabHTML() : '')   // S25: Statistika položek (statistika-polozek.js)
    + buildStatsTab(hasData, uniqueReceipts, totalSpent, allItems, catStats)
    + buildCompareTab(hasData, coicopUserTotals, COICOP_GROUPS_DEF, uniqueReceipts, catStats, householdSize)
    + buildTrendTab(coicopMonthly, COICOP_GROUPS_DEF, last6Months)
    + buildPricesTab(priceChanges, allItems)
    + buildDiscountsTab(uniqueReceipts)
    + buildDokladyTab(uniqueReceipts)
    + buildStoresTab(storeStats, totalSpent, uniqueReceipts)
    + buildHistoryTab(uniqueReceipts);

  // Obnov aktivní záložku (ne vždy scan)
  switchUctenkyTab(_activeUctenkyTab);

  // Obnov stav fronty a preview po překreslení
  updateReceiptQueue();
  if(_lastReceiptResult) {
    const preview = document.getElementById('receiptPreview');
    if(preview) {
      preview.style.display = 'block';
      preview.innerHTML = buildReceiptPreviewHTML(_lastReceiptResult.receipt, _lastReceiptResult.n); setTimeout(initReceiptEditor, 50);
    }
  }
}

function buildScanTab(receipts, totalSpent) {
  setTimeout(uctenkyKvotaObnov, 0);
  setTimeout(() => { if (typeof eanNaskenovaneKresli === 'function') eanNaskenovaneKresli(); }, 0);   // S25
  setTimeout(() => { if (typeof eanMojeVyrobkyKresli === 'function') eanMojeVyrobkyKresli(); }, 0);   // S25 v11.49
  return `<div id="utab-scan-content">
    <div id="uctenkyKvota"></div>
    <!-- S24 (v11.25, Milan): samostatné skenování čárového kódu výrobku -->
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:12px">
      <span style="font-size:1.4rem">▮▮</span>
      <span style="flex:1;min-width:200px;font-size:.78rem;line-height:1.45;color:var(--text)"><b>Čárový kód výrobku</b><br><span style="color:#a8aec8">Naskenuj obal kdykoli – uvidíš co to je, opravíš český název a přiřadíš ho k položce z účtenky.</span></span>
      <button class="btn btn-sm" onclick="if(typeof eanSkenujVolne==='function')eanSkenujVolne()">📷 Skenovat čárový kód</button>
    </div>
    <div class="eanNaskBox"></div>
    <div class="card" style="margin-bottom:14px"><div class="card-body">
      <div style="font-size:.8rem;color:var(--text2);margin-bottom:14px">
        Claude přečte účtenku, rozpozná obchod a položky. Jedním kliknutím přidáte transakci.<br>
        <span style="font-size:.74rem;color:var(--text2)">💡 Dlouhá účtenka? Přidejte více fotek (horní + dolní část) – sloučíme automaticky.</span>
      </div>

      <!-- Náhled nahraných fotek -->
      <div id="receiptPhotoQueue" style="display:none;margin-bottom:12px">
        <div style="font-size:.76rem;color:var(--text2);margin-bottom:6px">Fronty fotek ke sloučení:</div>
        <div id="receiptPhotoList" style="display:flex;gap:8px;flex-wrap:wrap"></div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('receiptInput').click()">➕ Přidat další foto</button>
          <button class="btn btn-accent" style="flex:1" onclick="analyzeMultiReceipt()">🧠 Analyzovat jako 1 účtenku</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--expense)" onclick="clearReceiptQueue()">✕ Zrušit</button>
        </div>
      </div>

      <!-- Tlačítka pro nahrání -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <button class="btn btn-accent" onclick="document.getElementById('receiptCameraInput').click()" style="gap:8px">
          📷 Fotoaparát
        </button>
        <button class="btn btn-ghost" onclick="document.getElementById('receiptFileInput').click()" style="gap:8px">
          🖼️ Ze souboru / screenshot
        </button>
      </div>

      <!-- Drop zone -->
      <div id="receiptDropZone"
        style="border:2px dashed var(--border);border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:border-color .2s;margin-bottom:12px"
        onclick="document.getElementById('receiptFileInput').click()"
        ondragover="event.preventDefault();this.style.borderColor='var(--income)'"
        ondragleave="this.style.borderColor='var(--border)'"
        ondrop="handleReceiptDrop(event)">
        <div style="font-size:2rem;margin-bottom:6px">📸</div>
        <div style="font-weight:600;margin-bottom:2px;font-size:.88rem">Přetáhněte účtenku sem</div>
        <div style="font-size:.74rem;color:var(--text2)">JPG, PNG, screenshot – nebo použijte tlačítka výše</div>
      </div>

      <!-- Skryté file inputy -->
      <input type="file" id="receiptCameraInput" accept="image/*" capture="environment" style="display:none" onchange="addReceiptPhoto(this.files[0]);this.value=''">
      <input type="file" id="receiptFileInput" accept="image/*,.pdf" style="display:none" onchange="addReceiptPhoto(this.files[0]);this.value=''">
      <!-- Starý input pro zpětnou kompatibilitu -->
      <input type="file" id="receiptInput" accept="image/*" style="display:none" onchange="addReceiptPhoto(this.files[0]);this.value=''">

      <div id="receiptStatus" style="display:none"></div>
      ${receipts.length>0 ? `<div style="text-align:center;font-size:.74rem;color:var(--text2);margin-top:8px">Celkem: <strong>${receipts.length} účtenek</strong> · <strong>${fmtB(Math.round(totalSpent))}</strong></div>` : ''}
    </div></div>

    <!-- Preview výsledku – STICKY, nekliknutelné přes overlay -->
    <div id="receiptPreview" style="display:none"></div>

    ${receipts.length===0 ? '<div class="insight-item warn"><div class="insight-icon">💡</div><div class="insight-text">Naskenujte alespoň 3 účtenky pro analýzy a statistiky.</div></div>' : ''}
  </div>`;
}

// ══════════════════════════════════════════════════════
//  S24 (v11.26, T4 krok 2): ÚTRATA PODLE PODKATEGORIÍ TAXONOMIE
//  cesta: Analýza účtenek → 📊 Statistiky → „🧭 Za co utrácíš"
//  Kolik za pečivo, maso, mléčné… celkem, průměrně za měsíc, podíl a 3 největší
//  obecné názvy. Položky mimo taxonomii zvlášť (ať je vidět pokrytí).
// ══════════════════════════════════════════════════════
function taxUtrataPodkategorie(items, D) {
  D = D || getData();
  const sk = {}, mes = new Set(); let celkem = 0, mimo = 0;
  (items || []).forEach(it => {
    const a = (it.lineTotal != null ? parseFloat(it.lineTotal) : (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 1)) || 0;
    if (a <= 0) return;
    celkem += a; if (it.date) mes.add(String(it.date).slice(0, 7));
    const m = (typeof rpMapaNavrh === 'function') ? rpMapaNavrh(it.name, D, it.ean) : null;
    if (!m || !m.tax) { mimo += a; return; }
    const g = sk[m.tax.podId] || (sk[m.tax.podId] = { id: m.tax.podId, podId: m.tax.podId, oblastId: m.tax.oblastId, nazev: m.tax.podNazev, ikona: m.tax.ikona, oblast: m.tax.oblastNazev, castka: 0, obec: {} });
    g.castka += a; g.obec[m.tax.nazev] = (g.obec[m.tax.nazev] || 0) + a;
  });
  const n = Math.max(1, mes.size);
  return { celkem, mimo, mesicu: mes.size, pods: Object.values(sk).map(g => ({ ...g, podil: celkem ? g.castka / celkem * 100 : 0, mesicne: g.castka / n,
    top: Object.entries(g.obec).sort((a, b) => b[1] - a[1]).slice(0, 3) })).sort((a, b) => b.castka - a.castka) };
}
window.taxUtrataPodkategorie = taxUtrataPodkategorie;
function taxUtrataHTML(items) {
  const v = taxUtrataPodkategorie(items);
  if (!v.pods.length) return '';
  const kc = x => Math.round(x).toLocaleString('cs-CZ') + ' Kč';
  const mx = Math.max(...v.pods.map(p => p.castka));
  return `<div class="card" style="margin-bottom:12px"><div class="card-body">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap"><div style="font-weight:700;font-size:.92rem">🧭 Za co utrácíš</div>
      <div style="font-size:.7rem;color:#a8aec8">${v.mesicu} měs. · taxonomie pokrývá ${v.celkem ? Math.round((1 - v.mimo / v.celkem) * 100) : 0} %</div></div>
    ${v.pods.slice(0, 12).map(p => `<div style="padding:7px 0;border-top:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;gap:8px;font-size:.8rem"><span>${typeof ffIkonaTax === 'function' ? rpIkTax(p, 16) + ' ' + escHtml(p.nazev) : escHtml(p.ikona + ' ' + p.nazev)}</span>
        <span><b>${kc(p.castka)}</b> <span style="color:#8b93ad;font-size:.7rem">· ${kc(p.mesicne)}/měs · ${Math.round(p.podil)} %</span></span></div>
      <div style="height:5px;border-radius:3px;background:var(--border);overflow:hidden;margin:4px 0"><div style="height:100%;width:${(p.castka / mx * 100).toFixed(0)}%;background:#60a5fa"></div></div>
      <div style="font-size:.66rem;color:#8b93ad">${p.top.map(([n, a]) => escHtml(n) + ' ' + kc(a)).join(' · ')}</div></div>`).join('')}
    ${v.mimo > 0 ? `<div style="font-size:.7rem;color:#8b93ad;padding-top:6px;border-top:1px solid var(--border)">📦 Mimo taxonomii ${kc(v.mimo)} – zařadíš je v Mapě položek.</div>` : ''}
  </div></div>`;
}

function buildStatsTab(hasData, receipts, totalSpent, allItems, catStats) {
  if(!hasData) return '<div id="utab-stats-content" style="display:none"><div class="card"><div class="card-body"><div class="empty"><div class="ei">📸</div><div class="et">Naskenujte alespoň 3 účtenky</div></div></div></div></div>';
  const avgReceipt = receipts.length ? Math.round(totalSpent/receipts.length) : 0;

  // Lokální item freq (z S.receipts) pro rychlé zobrazení
  const itemFreq = {};
  allItems.forEach(it=>{
    const k=(it.name||'').trim(); if(k.length<2)return;
    if(!itemFreq[k])itemFreq[k]={count:0,total:0,catId:it.itemCatId||''};
    itemFreq[k].count++; itemFreq[k].total+=lineAmt(it);
  });
  const topItems = Object.entries(itemFreq).sort((a,b)=>b[1].count-a[1].count).slice(0,12);

  // catStats přes catId místo string názvů
  const D = getData();
  const catStatsById = {};
  receipts.forEach(r=>{
    (r.items||[]).forEach(it=>{
      const cid = it.itemCatId||'';
      if(!catStatsById[cid]) catStatsById[cid]={total:0,count:0};
      catStatsById[cid].total += lineAmt(it);
      catStatsById[cid].count++;
    });
  });

  let html = `<div id="utab-stats-content" style="display:none">${(()=>{ try { return taxUtrataHTML(allItems); } catch(e) { return ''; } })()}
    <!-- Souhrn -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      <div class="stat-card expense"><div class="stat-label">Celkem utraceno</div><div class="stat-value down">${fmtB(Math.round(totalSpent))}</div><div class="stat-sub">${receipts.length} účtenek</div></div>
      <div class="stat-card bank"><div class="stat-label">Průměrný nákup</div><div class="stat-value bankc">${fmtB(avgReceipt)}</div></div>
      <div class="stat-card income"><div class="stat-label">Naskenováno položek</div><div class="stat-value up">${allItems.length}</div></div>
    </div>

    <!-- Kategorie výdajů z položek -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">🛒 Výdaje dle kategorie (položky)</span></div>
      <div class="card-body">
        ${Object.entries(catStatsById).filter(([k,v])=>v.total>0).sort((a,b)=>b[1].total-a[1].total).map(([cid,v])=>{
          const cat = (D.categories||[]).find(c=>c.id===cid);
          const name = cat?.name || (cid?'Neznámá':'Ostatní');
          const icon = cat?.icon||'📦';
          const color = cat?.color||'#6b7280';
          const pct = Math.round(v.total/totalSpent*100);
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:3px">
              <span style="font-weight:600">${icon} ${name} <span style="color:var(--text3);font-weight:400">${v.count}×</span></span>
              <span>${fmtB(Math.round(v.total))} <span style="color:var(--text3)">(${pct}%)</span></span>
            </div>
            <div class="trap-bar"><div class="trap-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          </div>`;
        }).join('') || '<div class="empty"><div class="et">Přiřaďte položkám kategorie</div></div>'}
      </div>
    </div>

    <!-- 🧬 Výdaje podle COICOP skupin (fáze 3) -->
    ${typeof coicopBreakdownCard === 'function' ? coicopBreakdownCard(
        (window._coicopPeriod||'all')==='month'
          ? allItems.filter(it => String(it.date||'').slice(0,7) === (S.curYear+'-'+String(S.curMonth+1).padStart(2,'0')))
          : allItems) : ''}

    <!-- Top položky (lokální) + tlačítko pro načtení z Firebase -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title">🧬 Nejčastěji nakupované položky</span>
        <button class="btn btn-ghost btn-sm" onclick="toggleItemStatsAll()">${window._itemStatsShowAll?'✕ Zpět na TOP 15':'📊 Vše od začátku'}</button>
      </div>
      <div class="card-body" id="itemStatsLocal">
        <!-- Filtr -->
        <div style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap">
          ${['1M','3M','6M','12M','vše'].map(p=>`<button onclick="filterItemStats('${p}',this)" class="btn btn-ghost btn-sm ${p==='3M'?'active':''}">${p}</button>`).join('')}
        </div>
        <div id="itemStatsBody">
          ${renderItemStatsList(topItems, allItems, D, '3M')}
        </div>
      </div>
    </div>

    <!-- Graf: Název/Tag/Období -->
    <div class="card" style="margin-top:14px">
      <div class="card-header">
        <span class="card-title">📈 Vývoj nákupů v čase</span>
      </div>
      <div class="card-body">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <select id="itemChartMode" onchange="renderItemChart()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:5px 8px;font-size:.76rem;color:#e8eaf2">
            <option value="name">📦 Dle názvu položky</option>
            <option value="tag">🏷️ Dle tagu</option>
          </select>
          <select id="itemChartMetric" onchange="renderItemChart()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:5px 8px;font-size:.76rem;color:#e8eaf2">
            <option value="qty">📦 Počet kusů</option>
            <option value="total">💰 Suma Kč</option>
          </select>
          <select id="itemChartCumul" onchange="renderItemChart()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:5px 8px;font-size:.76rem;color:#e8eaf2">
            <option value="month">📊 Měsíčně</option>
            <option value="cumul">📈 Kumulativně</option>
          </select>
          <select id="itemChartPeriod" onchange="renderItemChart()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:5px 8px;font-size:.76rem;color:#e8eaf2">
            <option value="1M">1 měsíc</option>
            <option value="3M">3 měsíce</option>
            <option value="6M">6 měsíců</option>
            <option value="12M" selected>12 měsíců</option>
          </select>
        </div>
        <div id="itemChartCanvas" style="min-height:180px;overflow-x:auto"></div>
      </div>
    </div>

    <!-- Firebase itemStats – načte se on-demand -->
    <div id="itemStatsFirebase" style="display:none">
      <div class="card">
        <div class="card-header"><span class="card-title">📈 Statistiky položek – celkem od začátku</span></div>
        <div class="card-body" id="itemStatsFirebaseBody">
          <div class="empty"><div class="et">⏳ Načítám...</div></div>
        </div>
      </div>
    </div>
  </div>`;
  return html;
}

function renderItemChart(){
  const el = document.getElementById('itemChartCanvas'); if(!el) return;
  const mode = document.getElementById('itemChartMode')?.value||'name';
  const metric = document.getElementById('itemChartMetric')?.value||'qty';
  const period = document.getElementById('itemChartPeriod')?.value||'12M';
  const cumul = document.getElementById('itemChartCumul')?.value === 'cumul';  // S17.15 (Milan)

  const receipts = S.receipts||[];
  const months = parseInt(period)||3;
  // S17.13: osa X = SOUVISLÁ řada měsíců (dřív se kreslily jen měsíce, kde byl nákup,
  // takže graf s jedním nákupem ukázal jediný sloupec s popiskem „03" a vypadal rozbitě).
  const now = new Date();
  const axisMonths = [];
  for(let i=months-1;i>=0;i--){
    const d=new Date(now.getFullYear(), now.getMonth()-i, 1);
    axisMonths.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  const cutoff = new Date(now.getFullYear(), now.getMonth()-(months-1), 1);

  const items = receipts.flatMap(r=>(r.items||[]).map(it=>({...it,date:r.date||''})))
    .filter(it => it.date && new Date(it.date) >= cutoff);

  // Seskup dle měsíce a klíče (název nebo tag)
  const monthlyData = {}, allKeys = new Set();
  items.forEach(it => {
    const month = (it.date||'').slice(0,7);
    if(!month || !axisMonths.includes(month)) return;
    const rawKeys = mode==='tag'
      ? (it.tag||'').split(/[\s,]+/).filter(Boolean)
      : [it.name?.trim().toLowerCase().slice(0,20)].filter(Boolean);
    rawKeys.forEach(k => {
      if(!k) return;
      allKeys.add(k);
      if(!monthlyData[k]) monthlyData[k]={};
      if(!monthlyData[k][month]) monthlyData[k][month]={qty:0,total:0};
      monthlyData[k][month].qty += it.qty||1;
      monthlyData[k][month].total += lineAmt(it);
    });
  });

  const sumOf = k => Object.values(monthlyData[k]||{}).reduce((s,v)=>s+(metric==='qty'?v.qty:v.total),0);
  const ranked = [...allKeys].sort((a,b)=>sumOf(b)-sumOf(a));
  // S17.13 (Milan): uživatelský výběr sledovaných položek – bez něj se ukáže top 5
  if(!Array.isArray(window._itemChartPick)) window._itemChartPick = [];
  const picked = window._itemChartPick.filter(k=>allKeys.has(k));
  const keys = picked.length ? picked.slice(0,8) : ranked.slice(0,5);

  // ── filtr položek: rozbalovací seznam (abecedně) – při desítkách položek chipy zamořily UI ──
  const alpha = [...ranked].sort((a,b)=>a.localeCompare(b,'cs'));
  const filterBar = `<div style="margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px">
      <select onchange="itemChartToggle(this.value);this.selectedIndex=0"
        style="flex:1;min-width:180px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 9px;color:#e8eaf2;font-size:.78rem">
        <option value="">➕ Přidat ${mode==='tag'?'značku':'položku'}…</option>
        ${alpha.filter(k=>!picked.includes(k)).map(k=>`<option value="${k.replace(/"/g,'&quot;')}">${k.slice(0,40)}</option>`).join('')}
      </select>
      ${picked.length?`<button onclick="itemChartClear()" style="padding:5px 10px;border-radius:8px;font-size:.72rem;cursor:pointer;border:1px solid var(--border);background:transparent;color:#c9cede">✕ Zrušit vše</button>`:''}
    </div>
    <div style="font-size:.72rem;color:#a8aec8;margin-bottom:${picked.length?'7':'0'}px">${picked.length?`Sleduješ ${picked.length} položek`:'Bez výběru se zobrazí top 5 dle objemu'}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">
      ${picked.map(k=>`<button onclick="itemChartToggle('${k.replace(/'/g,"\\'")}')" title="Odebrat" style="padding:3px 9px;border-radius:12px;font-size:.7rem;cursor:pointer;white-space:nowrap;border:1px solid var(--income);background:rgba(74,222,128,.16);color:#e8eaf2">${k.slice(0,22)} ✕</button>`).join('')}
    </div>
  </div>`;

  if(!keys.length){
    el.innerHTML = filterBar + '<div style="color:#a8aec8;font-size:.78rem;padding:20px;text-align:center">Žádná data pro zvolené parametry</div>';
    return;
  }

  // ── ČÁROVÝ GRAF (Milan): sledování počtu kusů / útraty po měsících ──
  const COLORS=['#60a5fa','#4ade80','#f87171','#fbbf24','#a78bfa','#34d399','#f472b6','#facc15'];
  const W=680,H=250,pad={l:52,r:14,t:14,b:42};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
  // S17.15 (Milan): kumulace – běžící součet od začátku zvoleného období (ks i Kč)
  const valOf = (k,i) => {
    if(!cumul) return monthlyData[k]?.[axisMonths[i]]?.[metric]||0;
    let s=0; for(let j=0;j<=i;j++) s += monthlyData[k]?.[axisMonths[j]]?.[metric]||0;
    return s;
  };
  const maxVal = Math.max(...keys.flatMap(k=>axisMonths.map((_,i)=>valOf(k,i))),1);
  const niceMax = Math.ceil(maxVal*1.15/5)*5 || 5;
  const x = i => pad.l + (axisMonths.length>1 ? cW*i/(axisMonths.length-1) : cW/2);
  const y = v => pad.t + cH*(1 - v/niceMax);
  const CZM=['Led','Úno','Bře','Dub','Kvě','Čer','Čvc','Srp','Zář','Říj','Lis','Pro'];
  const mLabel = ym => { const [yy,mm]=ym.split('-'); return CZM[parseInt(mm)-1]+' '+yy.slice(2); };

  let g='';
  // mřížka + osa Y (s jednotkou)
  for(let i=0;i<=4;i++){
    const v=niceMax*i/4, yy=y(v);
    g+=`<line x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}" stroke="rgba(255,255,255,.07)" stroke-width="1"${i?' stroke-dasharray="3,3"':''}/>`;
    g+=`<text x="${pad.l-7}" y="${yy+3.5}" font-size="10" text-anchor="end" fill="#a8aec8">${metric==='qty'?(Math.round(v*10)/10):_cNum(v)}</text>`;
  }
  g+=`<text x="12" y="${pad.t+cH/2}" font-size="10" fill="#a8aec8" transform="rotate(-90,12,${pad.t+cH/2})" text-anchor="middle">${metric==='qty'?'počet ks':'Kč'}</text>`;
  // osa X – čitelné popisky měsíců (dřív jen „03")
  const step = axisMonths.length>8 ? Math.ceil(axisMonths.length/6) : 1;
  axisMonths.forEach((m,i)=>{
    if(i%step===0 || i===axisMonths.length-1)
      g+=`<text x="${x(i)}" y="${H-pad.b+18}" font-size="10" text-anchor="middle" fill="#a8aec8">${mLabel(m)}</text>`;
  });
  g+=`<line x1="${pad.l}" y1="${pad.t+cH}" x2="${W-pad.r}" y2="${pad.t+cH}" stroke="var(--border)" stroke-width="1"/>`;

  // vykreslení: kumulativně = SLOUPCE (Milan), měsíčně = čáry s body
  if(cumul){
    const gw = cW/axisMonths.length;                 // šířka slotu měsíce
    const bw = Math.max(2, Math.min(16, gw/(keys.length+0.6)));
    axisMonths.forEach((m,i)=>{
      keys.forEach((k,ki)=>{
        const v=valOf(k,i); if(!v) return;
        const col=COLORS[ki%COLORS.length];
        const bx = pad.l + gw*i + gw/2 - (keys.length*bw)/2 + ki*bw;
        const by = y(v), bh = Math.max(1, (pad.t+cH) - by);
        g+=`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(bw-1.2).toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5" fill="${col}" opacity=".88">
          <title>${k} · ${mLabel(m)}: ${metric==='qty'?((Math.round(v*10)/10)+' ks celkem'):(fmtB(Math.round(v))+' celkem')}</title></rect>`;
      });
    });
  } else {
    keys.forEach((k,ki)=>{
      const col=COLORS[ki%COLORS.length];
      const pts=axisMonths.map((m,i)=>({x:x(i), y:y(valOf(k,i)), v:valOf(k,i), m}));
      g+=`<polyline points="${pts.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      pts.forEach(p=>{
        g+=`<circle cx="${p.x}" cy="${p.y}" r="${p.v>0?3.4:2}" fill="${p.v>0?col:'#2a2f42'}" stroke="${col}" stroke-width="1.4">
          <title>${k} · ${mLabel(p.m)}: ${metric==='qty'?((Math.round(p.v*10)/10)+' ks'):(fmtB(Math.round(p.v)))}</title></circle>`;
      });
    });
  }

  const legend = keys.map((k,ki)=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:.68rem;color:#c9cede"><span style="display:inline-block;width:12px;height:3px;border-radius:2px;background:${COLORS[ki%COLORS.length]}"></span>${k.slice(0,16)}</span>`).join('');

  el.innerHTML = filterBar
    + `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px">${legend}</div>
       <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:${W}px;height:auto;display:block">${g}</svg>
       <div style="font-size:.72rem;color:#a8aec8;margin-top:8px;line-height:1.5">${cumul
         ? `Sloupce = <strong>kumulativní součet od začátku období</strong> (${metric==='qty'?'kolik kusů jsi celkem nakoupil':'kolik jsi celkem utratil'}). Sloupec nikdy neklesá – roste jen v měsících, kdy jsi nakupoval. Dobré na otázku „kolik toho za rok padne".`
         : `Každá čára = jedna ${mode==='tag'?'značka':'položka'}; bod = ${metric==='qty'?'počet kusů':'útrata'} v daném měsíci. Měsíce bez nákupu jsou nulové – proto čára klesne na osu.`} Najetím na ${cumul?'sloupec':'bod'} zobrazíš hodnotu.</div>`;
}
function itemChartToggle(k){
  if(!Array.isArray(window._itemChartPick)) window._itemChartPick=[];
  const i=window._itemChartPick.indexOf(k);
  if(i>=0) window._itemChartPick.splice(i,1); else window._itemChartPick.push(k);
  renderItemChart();
}
function itemChartClear(){ window._itemChartPick=[]; renderItemChart(); }

let _itemStatsPeriod = '3M';
let _itemStatsTag = '';
function renderItemStatsList(topItems, allItems, D, period) {
  const today = new Date();
  let fromDate = new Date();
  if(period==='1M') fromDate.setMonth(fromDate.getMonth()-1);
  else if(period==='3M') fromDate.setMonth(fromDate.getMonth()-3);
  else if(period==='6M') fromDate.setMonth(fromDate.getMonth()-6);
  else if(period==='12M') fromDate.setFullYear(fromDate.getFullYear()-1);
  else fromDate = new Date('2000-01-01');

  // Filtruj allItems dle období
  const filtered = period==='vše' ? allItems : allItems.filter(it=>{
    if(!it.date) return false;
    return new Date(it.date) >= fromDate;
  });

  // FÁZE 4: filtr položek podle COICOP tagu (zelené tagy)
  const _allTags = [...new Set(filtered.flatMap(it=>(it.tag||'').split(/[\s,]+/).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,'cs'));
  const tagged = _itemStatsTag ? filtered.filter(it=>(it.tag||'').split(/[\s,]+/).includes(_itemStatsTag)) : filtered;
  const _tagChips = _allTags.length ? ('<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">'
    + '<button onclick="filterItemStatsTag(\'\')" class="coicop-chip" style="padding:4px 10px;border-radius:14px;font-size:.72rem;font-weight:600;cursor:pointer;border:1px solid '+(!_itemStatsTag?'var(--income)':'var(--border2)')+';background:'+(!_itemStatsTag?'rgba(74,222,128,.18)':'transparent')+';color:'+(!_itemStatsTag?'var(--income)':'var(--text2)')+'">Vše</button>'
    + _allTags.map(t=>'<button onclick="filterItemStatsTag(\''+t.replace(/'/g,"\\'")+'\')" class="coicop-chip" style="padding:4px 10px;border-radius:14px;font-size:.72rem;font-weight:600;cursor:pointer;border:1px solid '+(_itemStatsTag===t?'var(--income)':'var(--border2)')+';background:'+(_itemStatsTag===t?'rgba(74,222,128,.18)':'transparent')+';color:'+(_itemStatsTag===t?'var(--income)':'var(--text2)')+'">🏷️ '+t+'</button>').join('')
    + '</div>') : '';

  const freq = {};
  tagged.forEach(it=>{
    const k=(it.name||'').trim().toLowerCase(); // FIX: lowercase pro dedup ROHLÍK vs Rohlík
    if(k.length<2)return;
    if(!freq[k])freq[k]={count:0,total:0,catId:it.itemCatId||'',prices:[],tag:it.tag||'',displayName:it.name||''};
    freq[k].count++;
    freq[k].qty = (freq[k].qty||0) + (it.qty||1); // celkový počet kusů
    const lineTotal=lineAmt(it);
    freq[k].total+=lineTotal;
    if(it.price>0) freq[k].prices.push(it.price);
    if(it.tag && !freq[k].tag) freq[k].tag = it.tag;
    if(!freq[k].displayName || it.name?.length > freq[k].displayName.length) freq[k].displayName = it.name; // nejdelší verze názvu
  });

  // S17.16 (Milan): tlačítko „Vše od začátku" zobrazí KOMPLETNÍ seznam (dřív natvrdo top 15)
  const _all = Object.entries(freq).sort((a,b)=>b[1].count-a[1].count);
  const _showAll = !!window._itemStatsShowAll;
  const sorted = _showAll ? _all : _all.slice(0,15);
  const _hiddenCount = _all.length - sorted.length;
  if(!sorted.length) return _tagChips + '<div class="empty"><div class="et">Žádné položky'+(_itemStatsTag?' s tagem „'+_itemStatsTag+'"':' za toto období')+'</div></div>';

  const COLS = 'minmax(0,1fr) 44px 40px 74px 62px'; // Položka | Nákupů | Kusů | Celkem | Průměr
  return _tagChips + `<div style="display:grid;grid-template-columns:${COLS};gap:0;border-bottom:2px solid var(--border);padding:6px 0 8px;margin-bottom:2px">
    <div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Položka</div>
    <div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:center">Nák.</div>
    <div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:center">Ks</div>
    <div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:right;padding-right:4px">Celkem</div>
    <div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:right">Průměr</div>
  </div>` +
  sorted.map(([,v])=>{
    const name = v.displayName || v.catId;
    const cat = (D.categories||[]).find(c=>c.id===v.catId);
    const icon = cat?.icon||'';
    const color = cat?.color||'var(--text3)';
    const avgPrice = v.count>0?Math.round(v.total/v.count):0;
    const totalQty = v.qty||v.count;
    const priceTrend = v.prices.length>=2
      ? (v.prices[v.prices.length-1] > v.prices[0]
          ? `<span style="color:var(--expense);font-weight:700"> ↑</span>`
          : v.prices[v.prices.length-1] < v.prices[0]
            ? `<span style="color:var(--income);font-weight:700"> ↓</span>` : '')
      : '';
    // Více tagů – rozdělit mezerou/čárkou
    const tagArr = (v.tag||'').split(/[\s,]+/).filter(Boolean);
    const tagBadges = tagArr.map(t=>`<span style="font-size:.62rem;padding:1px 5px;background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.3);border-radius:6px;color:var(--income);font-weight:600">🏷️ ${t}</span>`).join('');
    return `<div style="display:grid;grid-template-columns:${COLS};gap:0;padding:10px 0;border-bottom:1px solid var(--border);align-items:center">
      <div style="min-width:0;padding-right:6px">
        <div style="font-size:.86rem;font-weight:700;color:var(--text);word-break:break-word;line-height:1.25">${icon} ${name}${priceTrend}</div>
        <div style="display:flex;align-items:center;gap:4px;margin-top:2px;flex-wrap:wrap">
          ${cat?`<span style="font-size:.7rem;font-weight:600;color:${color}">${cat.name}</span>`:''}
          ${tagBadges}
        </div>
      </div>
      <div style="text-align:center">
        <div style="font-family:Syne,sans-serif;font-size:1rem;font-weight:800;color:var(--text)">${v.count}</div>
        <div style="font-size:.58rem;color:var(--text3)">nák.</div>
      </div>
      <div style="text-align:center;min-width:0">
        <div style="font-family:Syne,sans-serif;font-size:clamp(.78rem,3vw,1rem);font-weight:800;color:#c9cede;white-space:nowrap" title="${Number.isInteger(totalQty)?'':'Součet obsahuje vážené zboží (kg/l) i kusy – proto desetinné číslo.'}">${Math.round((totalQty||0)*10)/10}</div>
        <div style="font-size:.58rem;color:#a8aec8">${Number.isInteger(totalQty)?'ks':'ks/kg'}</div>
      </div>
      <div style="text-align:right;padding-right:4px;min-width:0">
        <div style="font-family:Syne,sans-serif;font-size:clamp(.78rem,3.4vw,.95rem);font-weight:800;color:var(--expense);line-height:1.1;white-space:nowrap">${_cNum(v.total)}</div>
        <div style="font-size:.58rem;color:var(--text3)">Kč</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:.82rem;font-weight:600;color:#c9cede">ø&nbsp;${_cNum(avgPrice)}</div>
        <div style="font-size:.58rem;color:#a8aec8">Kč/ks</div>
      </div>
    </div>`;
  }).join('')
  // S17.16 (Milan): patička – kolik položek je skryto / potvrzení kompletního výpisu
  + (_hiddenCount > 0
      ? `<div style="text-align:center;padding:10px 0 2px"><button onclick="toggleItemStatsAll()" style="padding:5px 12px;border-radius:9px;font-size:.74rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:#c9cede">Zobrazit všech ${_all.length} položek (+${_hiddenCount})</button></div>`
      : (_showAll ? `<div style="text-align:center;font-size:.72rem;color:#a8aec8;padding:10px 0 2px">Kompletní seznam · ${_all.length} položek za období „${period}" · <a href="#" onclick="event.preventDefault();loadItemStatsFromFirebase()" style="color:#8b7cf6;text-decoration:underline">archiv z Firebase</a></div>` : ''));
}

function _itemStatsRerender() {
  const D = getData();
  const receipts = S.receipts||[];
  const allItems = receipts.flatMap(r=>(r.items||[]).map(it=>({...it,store:r.store,date:r.date})));
  const freq = {};
  allItems.forEach(it=>{const k=(it.name||'').trim();if(k.length<2)return;if(!freq[k])freq[k]={count:0,total:0,catId:it.itemCatId||''};freq[k].count++;freq[k].total+=lineAmt(it);});
  const topItems = Object.entries(freq).sort((a,b)=>b[1].count-a[1].count).slice(0,12);
  const el = document.getElementById('itemStatsBody');
  if(el) el.innerHTML = renderItemStatsList(topItems, allItems, D, _itemStatsPeriod);
}
function filterItemStats(period, btn) {
  document.querySelectorAll('#itemStatsLocal .btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  _itemStatsPeriod = period;
  _itemStatsRerender();
}
function filterItemStatsTag(tag) {
  _itemStatsTag = (_itemStatsTag === tag) ? '' : tag; // druhé kliknutí = zrušit filtr
  _itemStatsRerender();
}
window.filterItemStatsTag = filterItemStatsTag;

async function loadItemStatsFromFirebase() {
  const fbEl = document.getElementById('itemStatsFirebase');
  const bodyEl = document.getElementById('itemStatsFirebaseBody');
  if(!fbEl||!bodyEl) return;
  fbEl.style.display='block';
  bodyEl.innerHTML='<div class="empty"><div class="et">⏳ Načítám z Firebase...</div></div>';
  try {
    const uid = window._currentUser?.uid; if(!uid) throw new Error('Nepřihlášen');
    const idToken = await window._currentUser.getIdToken?.();
    const res = await fetch(`https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users/${uid}/itemStats.json?auth=${idToken}`);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    if(!data){ bodyEl.innerHTML='<div class="empty"><div class="et">Žádná data · naskenujte účtenky</div></div>'; return; }
    const D = getData();
    const items = Object.values(data).sort((a,b)=>b.count-a.count);
    bodyEl.innerHTML = `
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:10px">${items.length} unikátních položek · celkem ${items.reduce((a,i)=>a+i.count,0)} nákupů</div>
      ${items.slice(0,30).map(it=>{
        const cat=(D.categories||[]).find(c=>c.id===it.catId);
        const priceTrend = (it.history||[]).length>=2
          ? (it.history[it.history.length-1].price > it.history[0].price ? '↑' : it.history[it.history.length-1].price < it.history[0].price ? '↓' : '→') : '';
        const trendColor = priceTrend==='↑'?'var(--expense)':priceTrend==='↓'?'var(--income)':'var(--text3)';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
          <div style="flex:1;min-width:0">
            <div style="font-size:.82rem;font-weight:600">${cat?.icon||''} ${it.name}</div>
            <div style="font-size:.68rem;color:var(--text3)">${cat?.name||'Ostatní'} · ${it.count}× nakoupeno · naposledy ${it.lastDate}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:.8rem;font-weight:600">ø ${fmtB(it.avgPrice)} <span style="color:${trendColor};font-size:.75rem">${priceTrend}</span></div>
            <div style="font-size:.68rem;color:var(--text3)">celkem ${fmtB(Math.round(it.totalSpent))}</div>
          </div>
        </div>`;
      }).join('')}
      ${items.length>30?`<div style="font-size:.72rem;color:var(--text3);text-align:center;padding-top:8px">+${items.length-30} dalších položek</div>`:''}
    `;
  } catch(e) {
    bodyEl.innerHTML=`<div style="color:var(--expense);font-size:.8rem">Chyba: ${e.message}</div>`;
  }
}

function buildCompareTab(hasData, coicopUserTotals, coicopGroups, receipts, catStats, householdSize) {
  householdSize = householdSize || 2;

  // Kontrola kompletnosti – vypočítej přímo zde
  const D3 = getData();
  const {pct: compPct, covered, total: compTotal, missing} = calcDataCompleteness(coicopUserTotals, coicopGroups, D3);
  const compColor = compPct >= 80 ? 'var(--income)' : compPct >= 50 ? '#f59e0b' : 'var(--expense)';
  const compIcon  = compPct >= 80 ? '🟢' : compPct >= 50 ? '🟡' : '🔴';
  // Zobrazujeme vždy – COICOP data bereme z transakcí, ne jen z účtenek
  const maxVal = Math.max(...coicopGroups.map(g => Math.max(coicopUserTotals[g.id]||0, g.avg_domacnost)), 1);
  const totalUser = Object.values(coicopUserTotals).reduce((a,b)=>a+b, 0);
  const totalCzu  = coicopGroups.reduce((a,g)=>a+g.avg_domacnost, 0);
  const totalDiff = totalUser - totalCzu;
  const totalPct  = totalCzu > 0 ? Math.round(Math.abs(totalDiff)/totalCzu*100) : 0;

  let html = `<div id="utab-compare-content" style="display:none">
    <!-- Info hlavička -->
    <div style="background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:12px;border:1px solid var(--border)">
      <div style="font-size:.76rem;color:var(--text2);margin-bottom:6px">📊 <strong>ČSÚ 2024</strong> · Statistika rodinných účtů · přepočteno na <strong>${householdSize.toFixed(2).replace('.',',')} spotřební jednotky</strong></div>
      <div style="display:flex;gap:16px;font-size:.72rem;color:var(--text2)">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--income);margin-right:4px;vertical-align:middle"></span>Vy</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(139,144,168,.35);margin-right:4px;vertical-align:middle"></span>Průměr ČR</span>
      </div>
    </div>

    <!-- Completeness score -->
    <div style="background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:12px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:.8rem;font-weight:700">${compIcon} Přesnost dat: <span style="color:${compColor}">${compPct}%</span></span>
        <span style="font-size:.72rem;color:var(--text2)">${covered}/${compTotal} kategorií pokryto</span>
      </div>
      <div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden;margin-bottom:8px">
        <div style="height:100%;width:${compPct}%;background:${compColor};border-radius:3px;transition:width .4s"></div>
      </div>
      <div style="font-size:.72rem;color:var(--text2)">
        ${compPct >= 80 ? '✅ Srovnání je <strong>přesné</strong>' : compPct >= 50 ? '⚠️ Srovnání je <strong>orientační</strong>' : '❌ Srovnání je <strong>nepřesné</strong> – chybí klíčová data'}
      </div>
      ${missing.length ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
        <div style="font-size:.72rem;color:var(--text2);margin-bottom:4px;font-weight:600">Pravděpodobně chybí:</div>
        ${missing.map(m=>`<div style="font-size:.72rem;color:var(--expense);padding:2px 0">• ${m}</div>`).join('')}
        <div style="margin-top:6px"><span onclick="showPage('transakce',null)" style="font-size:.7rem;color:var(--bank);cursor:pointer;text-decoration:underline">➕ Přidat chybějící transakce</span></div>
      </div>` : ''}
    </div>

    <!-- Celkové srovnání -->
    ${totalUser > 0 ? `<div style="background:${totalDiff>0?'rgba(248,113,113,.1)':'rgba(74,222,128,.1)'};border:1px solid ${totalDiff>0?'rgba(248,113,113,.3)':'rgba(74,222,128,.3)'};border-radius:10px;padding:12px 14px;margin-bottom:14px;text-align:center">
      <div style="font-size:.82rem;font-weight:700;color:${totalDiff>0?'var(--expense)':'var(--income)'}">
        ${totalDiff>0?'⬆️':'⬇️'} Utrácíte o <strong>${totalPct}%</strong> ${totalDiff>0?'více':'méně'} než průměrná česká domácnost
      </div>
      <div style="font-size:.72rem;color:var(--text2);margin-top:4px">
        Vaše měsíční výdaje: <strong>${fmtB(totalUser)}</strong> · ČR průměr: <strong>${fmtB(totalCzu)}</strong>
      </div>
    </div>` : ''}

    <!-- Skupiny COICOP -->
    <div class="card"><div class="card-body">`;

  coicopGroups.forEach(g => {
    const myAmt = coicopUserTotals[g.id] || 0;
    const czAmt = g.avg_domacnost;
    const diff  = myAmt - czAmt;
    const pct   = czAmt > 0 ? Math.round(Math.abs(diff)/czAmt*100) : 0;
    const color = diff > 0 ? 'var(--expense)' : diff < 0 ? 'var(--income)' : 'var(--text2)';
    const myW   = Math.round(myAmt / maxVal * 100);
    const czW   = Math.round(czAmt / maxVal * 100);
    const hasData2 = myAmt > 0;

    html += `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:.82rem;font-weight:600;display:flex;align-items:center;gap:6px">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${g.color};flex-shrink:0;font-size:.65rem;font-weight:800;color:#0a0c12">${g.id}</span>
          ${g.name}
        </span>
        <span style="font-size:.72rem;font-weight:600;color:${hasData2?color:'var(--text3)'}">
          ${hasData2 ? (diff===0?'= průměr':(diff>0?'+':'')+fmtB(diff)+' ('+pct+'%)') : 'žádná data'}
        </span>
      </div>
      <div style="position:relative;height:16px;background:rgba(139,144,168,.15);border-radius:5px;overflow:hidden;margin-bottom:3px">
        <div style="position:absolute;left:0;top:0;height:100%;width:${czW}%;background:rgba(139,144,168,.3);border-radius:5px"></div>
        ${hasData2?`<div style="position:absolute;left:0;top:0;height:100%;width:${myW}%;background:${g.color};border-radius:5px;opacity:.85"></div>`:''}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.7rem">
        <span style="color:${hasData2?color:'var(--text3)'};font-weight:${hasData2?'700':'400'}">${hasData2?fmtB(myAmt):'–'}</span>
        <span style="color:var(--text2)">${fmtB(czAmt)} ČR</span>
      </div>
    </div>`;
  });

  html += `</div></div>
    <div style="font-size:.7rem;color:var(--text2);text-align:center;padding:8px 0">
      Zdroj: ČSÚ SRÚ 2024 · OECD ekvivalent ${householdSize.toFixed(2).replace('.',',')} · <span style="cursor:pointer;color:var(--bank)" onclick="showPage('nastaveni',null)">upravit složení domácnosti</span>
    </div>
  </div>`;
  return html;
}

function buildTrendTab(coicopMonthly, coicopGroups, last6Months) {
  const CZ_SHORT = ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];

  // Celkové výdaje per měsíc (všechny COICOP skupiny)
  const monthTotals = {};
  last6Months.forEach(m => { monthTotals[m] = 0; });
  Object.values(coicopMonthly).forEach(months => {
    Object.entries(months).forEach(([m, v]) => {
      if(monthTotals[m] !== undefined) monthTotals[m] += v;
    });
  });

  const hasAnyData = Object.values(monthTotals).some(v => v > 0);

  if(!hasAnyData) return `<div id="utab-trend-content" style="display:none">
    <div class="card"><div class="card-body"><div class="empty">
      <div class="ei">📈</div>
      <div class="et">Zatím málo dat</div>
      <div style="font-size:.76rem;color:var(--text2);margin-top:8px">Trend se zobrazí po zadání výdajů za alespoň 2 měsíce.</div>
    </div></div></div></div>`;

  const maxTotal = Math.max(...Object.values(monthTotals), 1);
  const monthLabels = last6Months.map(m => {
    const [y, mo] = m.split('-');
    return CZ_SHORT[parseInt(mo)-1] + ' ' + y.slice(2);
  });

  // Celkový trend – sloupcový graf
  let totalBars = last6Months.map((m, i) => {
    const val = monthTotals[m] || 0;
    const pct = Math.round(val / maxTotal * 100);
    const prev = i > 0 ? (monthTotals[last6Months[i-1]] || 0) : val;
    const diff = val - prev;
    const color = i === 0 ? 'var(--bank)' : diff > 0 ? 'var(--expense)' : diff < 0 ? 'var(--income)' : 'var(--bank)';
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px">
      <div style="font-size:.68rem;color:var(--text2);font-weight:600">${val > 0 ? fmt(Math.round(czkToBase(val)/1000))+'k' : '–'}</div>
      <div style="width:100%;display:flex;align-items:flex-end;height:60px">
        <div style="width:100%;height:${Math.max(pct,2)}%;background:${color};border-radius:4px 4px 0 0;min-height:${val>0?'4px':'0'};transition:height .3s"></div>
      </div>
      <div style="font-size:.66rem;color:var(--text2);text-align:center;white-space:nowrap">${monthLabels[i]}</div>
      ${i > 0 && diff !== 0 ? `<div style="font-size:.62rem;color:${diff>0?'var(--expense)':'var(--income)'}">${diff>0?'↑':'↓'}${Math.abs(Math.round(diff/1000))}k</div>` : '<div style="font-size:.62rem">　</div>'}
    </div>`;
  }).join('');

  // Top skupiny s trendem
  const groupTrends = coicopGroups.map(g => {
    const months = coicopMonthly[g.id] || {};
    const vals = last6Months.map(m => months[m] || 0);
    const hasData = vals.some(v => v > 0);
    if(!hasData) return null;

    // Trend: porovnej první a poslední měsíc s daty
    const nonZero = vals.filter(v => v > 0);
    const first = nonZero[0] || 0;
    const last  = nonZero[nonZero.length-1] || 0;
    const trendPct = first > 0 ? Math.round((last-first)/first*100) : 0;
    const avg = Math.round(vals.reduce((a,b)=>a+b,0) / Math.max(nonZero.length,1));
    const maxVal = Math.max(...vals, 1);

    return {g, vals, trendPct, avg, maxVal, first, last};
  }).filter(Boolean).sort((a,b) => b.avg - a.avg);

  const groupRows = groupTrends.map(({g, vals, trendPct, avg}) => {
    const maxV = Math.max(...vals, 1);
    const miniBar = vals.map((v, i) => {
      const h = Math.round(v/maxV*32);
      return `<div style="width:10px;height:${Math.max(h,v>0?2:0)}px;background:${g.color};border-radius:2px 2px 0 0;align-self:flex-end;opacity:${0.4 + (i/5)*0.6}"></div>`;
    }).join('');

    const trendColor = trendPct > 5 ? 'var(--expense)' : trendPct < -5 ? 'var(--income)' : 'var(--text2)';
    const trendLabel = trendPct > 5 ? `↑ ${trendPct}%` : trendPct < -5 ? `↓ ${Math.abs(trendPct)}%` : '→ stabilní';

    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${g.color};flex-shrink:0;font-size:.68rem;font-weight:800;color:#0a0c12">${g.id}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name}</div>
        <div style="font-size:.7rem;color:var(--text2)">ø ${_cNum(avg)} ${curSym()}/měs</div>
      </div>
      <div style="display:flex;align-items:flex-end;gap:2px;height:32px;flex-shrink:0">${miniBar}</div>
      <div style="font-size:.76rem;font-weight:700;color:${trendColor};min-width:56px;text-align:right">${trendLabel}</div>
    </div>`;
  }).join('');

  return `<div id="utab-trend-content" style="display:none">
    <!-- Celkový vývoj -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">📊 Celkové výdaje – posledních 6 měsíců</span></div>
      <div class="card-body">
        <div style="display:flex;gap:4px;align-items:flex-end;margin-bottom:4px">${totalBars}</div>
      </div>
    </div>

    <!-- Trend per kategorie -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📈 Trend dle skupin COICOP</span>
        <span style="font-size:.72rem;color:var(--text2)">${monthLabels[0]} → ${monthLabels[5]}</span>
      </div>
      <div class="card-body" style="padding:4px 14px">
        <div style="display:flex;justify-content:flex-end;gap:16px;font-size:.68rem;color:var(--text2);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)">
          ${monthLabels.map(l=>`<div style="width:10px;text-align:center;font-size:.6rem">${l.slice(0,3)}</div>`).join('')}
        </div>
        ${groupRows || '<div style="padding:12px 0;color:var(--text2);font-size:.8rem">Zatím žádná data pro zobrazení trendu.</div>'}
      </div>
    </div>
  </div>`;
}


// ══════════════════════════════════════════════════════
//  S23 (Milan): SAMOSTATNÁ ZÁLOŽKA 💸 SLEVY
//  Karta „Ušetřeno slevami" byla utopená uprostřed Statistik. Tady má vlastní
//  místo: souhrn měsíc / rok / celkem, rozpad podle obchodů a seznam položek,
//  na kterých se ušetřilo nejvíc.
// ══════════════════════════════════════════════════════
function buildDiscountsTab(receipts){
  receipts = receipts || [];
  let html = '<div id="utab-discounts-content" style="display:none">';
    const now = new Date();
    let savMonth=0, savYear=0, savTotal=0;
    const byMonth = {};
    //  S23 (Milan): „MÁME SLEDOVAT, KOLIK A KDE JSME UŠETŘILI – NIKDE TO NEVIDÍM."
    //  Karta existovala, ale při nule se mlčky schovala – a nula tam byla právě
    //  proto, že analyzér slevu přehlédl. Dvě chyby se navzájem kryly (SKILL 47).
    //  Nově je vidět vždy a přibyl rozpad PODLE OBCHODŮ.
    const byStore = {};
    const _stKey = x => String(x||'Neznámý').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    receipts.forEach(rr=>{
      const sk = _stKey(rr.store);
      if(!byStore[sk]) byStore[sk] = {store: rr.store||'Neznámý', sv:0, spent:0, n:0, nSlev:0, polozek:0};
      byStore[sk].spent += (parseFloat(rr.total)||0); byStore[sk].n++;
      const sv = receiptSavings(rr);
      if(sv>0){ byStore[sk].sv += sv; byStore[sk].nSlev++;
        byStore[sk].polozek += (rr.items||[]).filter(it=>(parseFloat(it&&it.discount)||0)>0).length; }
      if(sv<=0 || !rr.date) return;
      const d = new Date(rr.date+'T12:00:00');
      savTotal += sv;
      if(d.getFullYear()===now.getFullYear()){ savYear+=sv; if(d.getMonth()===now.getMonth()) savMonth+=sv; }
      const mk = d.getMonth()+'-'+d.getFullYear();
      byMonth[mk]=(byMonth[mk]||0)+sv;
    });
    if(savTotal<=0){
      html += '<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">💸 Ušetřeno slevami</span></div><div class="card-body">'
        + '<div style="font-size:.78rem;color:#c9cede;line-height:1.6">Zatím <b>0 Kč</b> — na žádné z ' + receipts.length + ' účtenek není zaznamenaná sleva.</div>'
        + '<div style="font-size:.72rem;color:#a8aec8;line-height:1.6;margin-top:6px">Slevu appka čte ze záporných řádků na účtence („Tvoje cena s Kaufland Card", „Sleva věrnosti"…). '
        + 'Když ji analyzér přehlédne, ukáže se u účtenky žluté upozornění, že součet položek přesahuje částku — tam jde rozdíl <b>jedním klikem přiřadit jako slevu</b> k položce a započítá se sem.</div>'
        + '</div></div>';
    } else {
      const bars=[];
      for(let i2=5;i2>=0;i2--){
        let m=now.getMonth()-i2, y=now.getFullYear(); while(m<0){m+=12;y--;}
        bars.push({label:(m+1)+'/'+String(y).slice(2), v:Math.round(byMonth[m+'-'+y]||0)});
      }
      const maxB=Math.max(...bars.map(b=>b.v),1);
      html += '<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">💸 Ušetřeno slevami</span></div><div class="card-body">'
        + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">'
        +   '<div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0"><div class="stat-value-h" style="color:var(--income)">'+_cNum(savMonth)+'</div><div class="stat-label-h">tento měsíc ('+curSym()+')</div></div>'
        +   '<div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0"><div class="stat-value-h" style="color:var(--income)">'+_cNum(savYear)+'</div><div class="stat-label-h">letos ('+curSym()+')</div></div>'
        +   '<div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0"><div class="stat-value-h" style="color:var(--income)">'+_cNum(savTotal)+'</div><div class="stat-label-h">celkem ('+curSym()+')</div></div>'
        + '</div>'
        + '<div style="display:flex;align-items:flex-end;gap:6px;height:58px">'
        +   bars.map(b=>'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0">'
              + '<div style="font-size:.6rem;color:var(--income);font-weight:700">'+(b.v?_cNum(b.v):'')+'</div>'
              + '<div style="width:100%;max-width:34px;height:'+Math.max(3,Math.round(b.v/maxB*30))+'px;background:linear-gradient(180deg,#4ade80,#22c55e);border-radius:4px 4px 0 0;opacity:'+(b.v?'1':'.25')+'"></div>'
              + '<div style="font-size:.6rem;color:#a8aec8">'+b.label+'</div>'
            + '</div>').join('')
        + '</div>'
        + (()=>{
            const rows = Object.values(byStore).filter(x=>x.sv>0).sort((a,b)=>b.sv-a.sv);
            if(!rows.length) return '';
            const th = 'padding:6px 8px;font-size:.64rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.04em;font-weight:700';
            const td = 'padding:7px 8px;font-size:.76rem;border-top:1px solid var(--border)';
            return '<div style="margin-top:14px;font-size:.72rem;font-weight:700;color:#c9cede">🏪 Kde jsi ušetřil</div>'
              + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin-top:4px"><thead><tr>'
              + '<th style="'+th+';text-align:left">Obchod</th><th style="'+th+';text-align:right">Ušetřeno</th>'
              + '<th style="'+th+';text-align:right">% z plné ceny</th><th style="'+th+';text-align:right">Položek ve slevě</th>'
              + '<th style="'+th+';text-align:right">Účtenek</th></tr></thead><tbody>'
              + rows.map(x=>{
                  const plna = x.spent + x.sv;
                  const pct = plna>0 ? (x.sv/plna*100) : 0;
                  return '<tr><td style="'+td+';color:#e8eaf2">'+x.store+'</td>'
                    + '<td style="'+td+';text-align:right;color:var(--income);font-weight:700">'+_cNum(x.sv)+'</td>'
                    + '<td style="'+td+';text-align:right;color:#c9cede">'+pct.toFixed(1).replace('.',',')+' %</td>'
                    + '<td style="'+td+';text-align:right;color:#c9cede">'+x.polozek+'</td>'
                    + '<td style="'+td+';text-align:right;color:#a8aec8">'+x.nSlev+' z '+x.n+'</td></tr>';
                }).join('')
              + '</tbody></table></div>'
              + '<div style="font-size:.66rem;color:#8b93ad;margin-top:6px;line-height:1.5">% z plné ceny = sleva ÷ (zaplaceno + sleva) za všechny účtenky z obchodu.</div>';
          })()
        + '</div></div>';
    }
  
  //  Položky se slevou – kde to bylo znát nejvíc.
  const pol = [];
  receipts.forEach(rr => (rr.items||[]).forEach(it => {
    const d = parseFloat(it && it.discount) || 0;
    if(d > 0) pol.push({ name: it.name||'—', d, zaplaceno: lineAmt(it), store: rr.store||'', date: rr.date||'', rucne: !!it._discountManual });
  }));
  if(pol.length){
    pol.sort((x,y) => (y.date||'').localeCompare(x.date||'') || y.d - x.d);
    html += '<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">🏷️ Položky ve slevě</span>'
      + '<span style="font-size:.68rem;color:#a8aec8">' + pol.length + ' položek</span></div><div class="card-body" style="padding:6px 14px">'
      + pol.slice(0,40).map(p => {
          const plna = p.zaplaceno + p.d, pct = plna>0 ? Math.round(p.d/plna*100) : 0;
          return '<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);min-width:0">'
            + '<div style="flex:1;min-width:0"><div style="font-size:.8rem;font-weight:600;color:#e8eaf2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(p.name) + '</div>'
            + '<div style="font-size:.68rem;color:#a8aec8">' + escHtml(p.store) + (p.date?' · '+p.date:'') + (p.rucne?' · doplněno ručně':'') + '</div></div>'
            + '<div style="text-align:right;flex-shrink:0;white-space:nowrap"><div style="font-size:.82rem;font-weight:700;color:var(--income)">−' + _cNum(p.d) + '</div>'
            + '<div style="font-size:.66rem;color:#a8aec8">−' + pct + ' % · zaplaceno ' + _cNum(p.zaplaceno) + '</div></div></div>';
        }).join('')
      + (pol.length>40 ? '<div style="font-size:.7rem;color:#a8aec8;padding:8px 0">… a dalších ' + (pol.length-40) + '</div>' : '')
      + '</div></div>';
  }
  return html + '</div>';
}

// ══════════════════════════════════════════════════════
//  S23 (TODO-304): ARCHIV DOKLADŮ
//  cesta: Analýza účtenek → 📎 Doklady
//  Seznam uschovaných fotek s náhledem, poznámkou a záruční lhůtou.
//  Milanův původní záměr: „hlídat stáří spotřebičů" – proto se u dokladu
//  nastavuje záruka a archiv upozorní, když se blíží konec.
// ══════════════════════════════════════════════════════
const DOKLAD_VAROVANI_DNI = 60;   // odkdy se hlásí „záruka brzy končí"

//  Konec záruky = datum účtenky + N měsíců. Vrací i stav pro barvu a řazení.
function dokladZaruka(rec, dnes) {
  const ted = dnes || Date.now();
  const mes = parseInt(rec && rec.warrantyMonths, 10);
  if (!mes || !rec.date) return { stav: 'bez', text: 'bez záruky' };
  const d = new Date(rec.date);
  if (isNaN(d)) return { stav: 'bez', text: 'bez záruky' };
  d.setMonth(d.getMonth() + mes);
  //  Počítáme celé DNY mezi daty, ne hodiny – jinak záruka končící zítra
  //  hlásí „za 2 dny" (dnes 00:00 vs zítra 23:59).
  d.setHours(0, 0, 0, 0);
  const dnes0 = new Date(ted); dnes0.setHours(0, 0, 0, 0);
  const dni = Math.round((d - dnes0) / 86400000);
  const datum = d.toLocaleDateString('cs-CZ');
  if (dni < 0) return { stav: 'propadla', dni, datum, mes, text: `záruka skončila ${datum}` };
  if (dni <= DOKLAD_VAROVANI_DNI) return { stav: 'konci', dni, datum, mes, text: `záruka končí za ${dni} ${dni === 1 ? 'den' : dni <= 4 ? 'dny' : 'dní'} (${datum})` };
  return { stav: 'plati', dni, datum, mes, text: `záruka do ${datum}` };
}

//  Doklady seřazené tak, aby nahoře bylo, co hoří.
function dokladySeznam(receipts, dnes) {
  const RADA = { konci: 0, plati: 1, bez: 2, propadla: 3 };
  return (receipts || [])
    .map((r, i) => ({ r, i, z: dokladZaruka(r, dnes) }))
    .filter(x => x.r && x.r.photoKey)
    .sort((a, b) => (RADA[a.z.stav] - RADA[b.z.stav])
      || (a.z.stav === 'konci' ? a.z.dni - b.z.dni : String(b.r.date || '').localeCompare(String(a.r.date || ''))));
}

//  S25 (TODO-309, Milan): upozornění na Dashboardu, že doklad má záruku ke konci (≤ 60 dní).
//  Dřív to bylo vidět jen v Analýza účtenek → 📎 Doklady, kam se člověk musel podívat sám.
//  Prošlá záruka se nehlásí (už se nedá nic dělat), jen ta, která ještě běží.
function dokladyUpozorneniHTML(receipts, dnes) {
  const konci = dokladySeznam(receipts, dnes).filter(x => x.z.stav === 'konci');
  if (!konci.length) return '';
  const nazev = x => escHtml(x.r.photoNote || x.r.store || 'doklad');
  const kdy = d => d === 0 ? 'dnes' : d === 1 ? 'zítra' : 'za ' + d + ' ' + (d <= 4 ? 'dny' : 'dní');
  const prvni = konci[0];
  const text = konci.length === 1
    ? `<strong>${nazev(prvni)}</strong> – záruka končí ${kdy(prvni.z.dni)} (${escHtml(prvni.z.datum)}). Pokud něco nefunguje, reklamuj ještě teď.`
    : `<strong>${konci.length} ${konci.length < 5 ? 'doklady' : 'dokladů'}</strong> ${konci.length < 5 ? 'mají' : 'má'} záruku ke konci: ${konci.slice(0, 3).map(x => `${nazev(x)} (${kdy(x.z.dni)})`).join(', ')}${konci.length > 3 ? ' a další' : ''}.`;
  return `<div class="insight-item warn" style="margin-bottom:10px;cursor:pointer" onclick="dokladyOtevriZDashboardu()" title="Otevřít Doklady">
    <div class="insight-icon">🛡️</div><div class="insight-text">${text} <span style="color:#60a5fa;white-space:nowrap">Otevřít doklady ›</span></div></div>`;
}
function dokladyOtevriZDashboardu() {
  if (typeof showPage === 'function') showPage('uctenky');
  if (typeof _activeUctenkyTab !== 'undefined') _activeUctenkyTab = 'doklady';
  setTimeout(() => { const b = document.getElementById('utab-doklady'); if (b) switchUctenkyTab('doklady', b); }, 60);
}
window.dokladyUpozorneniHTML = dokladyUpozorneniHTML;
window.dokladyOtevriZDashboardu = dokladyOtevriZDashboardu;

function buildDokladyTab(receipts) {
  const list = dokladySeznam(receipts);
  let html = '<div id="utab-doklady-content" style="display:none">';
  if (!list.length) {
    html += `<div class="card"><div class="card-body"><div class="empty">
      <div class="ei">📎</div><div class="et">Zatím žádný uschovaný doklad</div>
      <div style="font-size:.78rem;color:var(--text2);margin-top:8px;line-height:1.55">
        Po naskenování účtenky dej v editoru <b>📌 Uschovat fotku účtenky</b>, nebo zapni <b>uschovávat automaticky</b>.
        Ke starší účtence přidáš fotku v <b>Historii</b> (tužka) → <b>📌 Přidat fotku dokladu</b>.
        Hodí se u spotřebičů a nábytku – k dokladu si pak nastavíš záruku a appka ti řekne, než skončí.
      </div></div></div></div><div class="dokPocitadlo" style="margin-top:10px"></div>${dokladySirotciBlok()}`;
    return html + '</div>';
  }
  const konci = list.filter(x => x.z.stav === 'konci');
  const bajtu = list.reduce((a, x) => a + (x.r.photoBytes || 0), 0);
  if (konci.length) {
    html += `<div class="card" style="margin-bottom:12px;border-left:3px solid var(--debt)"><div class="card-body" style="padding:11px 14px;font-size:.82rem;color:#e8eaf2">
      ⏰ <b>${konci.length}</b> ${konci.length === 1 ? 'doklad má' : 'dokladů má'} záruku ke konci: ${konci.slice(0, 3).map(x => escHtml(x.r.store || 'účtenka') + ' (' + x.z.dni + ' dní)').join(', ')}</div></div>`;
  }
  html += `<div class="card"><div class="card-header"><span class="card-title">📎 Uschované doklady</span>
      <span style="font-size:.68rem;color:#a8aec8">${list.length} ${list.length === 1 ? 'doklad' : list.length < 5 ? 'doklady' : 'dokladů'} · ${Math.round(bajtu / 1024)} kB</span></div>
    <div class="dokPocitadlo" style="padding:0 14px"></div>
    <div class="card-body" style="padding:6px 14px">`;
  html += list.map(x => {
    const r = x.r, z = x.z;
    const barva = z.stav === 'konci' ? 'var(--debt)' : z.stav === 'propadla' ? 'var(--text3)' : z.stav === 'plati' ? 'var(--income)' : 'var(--text3)';
    return `<div style="display:flex;gap:11px;padding:11px 0;border-bottom:1px solid var(--border);align-items:flex-start">
      <div id="dok-nahled-${x.i}" data-key="${escHtml(r.photoKey)}" onclick="dokladOtevri(${x.i})"
           style="width:54px;height:54px;border-radius:9px;background:var(--surface2);flex-shrink:0;cursor:pointer;
                  display:grid;place-items:center;font-size:1.1rem;overflow:hidden">📄</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.86rem;font-weight:600;color:#e8eaf2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(r.store || 'Účtenka')}</div>
        <div style="font-size:.72rem;color:#a8aec8">${escHtml(r.date || '')}${r.total ? ' · ' + fmtP(r.total) + ' Kč' : ''}</div>
        <div style="font-size:.72rem;color:${barva};margin-top:2px">${z.stav === 'konci' ? '⏰ ' : ''}${escHtml(z.text)}</div>
        ${r.photoNote ? `<div style="font-size:.72rem;color:#c9cede;margin-top:3px">📝 ${escHtml(r.photoNote)}</div>` : ''}
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">
          <button class="btn btn-ghost btn-sm" style="font-size:.68rem" onclick="dokladOtevri(${x.i})">👁️ Otevřít</button>
          <button class="btn btn-ghost btn-sm" style="font-size:.68rem" onclick="dokladZaruku(${x.i})">🛡️ Záruka</button>
          <button class="btn btn-ghost btn-sm" style="font-size:.68rem" onclick="dokladPoznamka(${x.i})">📝 Poznámka</button>
          <button class="btn btn-ghost btn-sm" style="font-size:.68rem;color:var(--expense)" onclick="dokladSmaz(${x.i})">🗑️</button>
        </div>
      </div></div>`;
  }).join('');
  html += `</div><div style="font-size:.66rem;color:#8b93ad;padding:0 14px 12px;line-height:1.5">
      Fotky leží mimo appku v úložišti EU, u účtenky je jen odkaz. Smazáním účtenky nebo účtu zmizí i doklad.
    </div></div>${dokladySirotciBlok()}`;
  return html + '</div>';
}

//  S25 (v11.49, Milan: „jak obnovit účtenku, aby se zobrazila v uložených?“): FOTKY BEZ ÚČTENKY.
//  Do v11.47 se automaticky uschovaná fotka mohla nahrát, ale odkaz se k účtence neuložil.
//  Fotka pak ležela v úložišti, zabírala místo z 300 a v Dokladech nebyla. Tady se najde
//  (worker /archiv/list), doporučí se účtenka uložená nejblíž času nahrání a jedním klepnutím
//  se připojí – bez nového nahrávání. Nebo se smaže a uvolní místo.
function dokladySirotci(soubory, receipts) {
  const pouzite = new Set(); (receipts || []).forEach(r => rpFotky(r).forEach(k => pouzite.add(k)));
  return (soubory || []).filter(f => f && f.key && !pouzite.has(f.key)).map(f => {
    let ts = Date.parse(f.uploaded || '');
    if (!ts) { const m = /\/([0-9a-z]+)-[^/]*$/.exec(f.key); ts = m ? parseInt(m[1], 36) : 0; }
    let tip = -1, nej = Infinity;
    (receipts || []).forEach((r, i) => { if (!r || !r.addedAt) return; const d = Math.abs(r.addedAt - ts); if (d < nej && d < 30 * 60000) { nej = d; tip = i; } });
    return { key: f.key, size: f.size || 0, ts, tip };
  }).sort((a, b) => b.ts - a.ts);
}
window.dokladySirotci = dokladySirotci;
function dokladySirotciBlok() {
  return `<div style="margin-top:12px"><button class="btn btn-ghost btn-sm" style="font-size:.74rem" onclick="dokladySirotciNajdi()">🔎 Najít fotky bez účtenky</button>
    <span style="font-size:.66rem;color:#8b93ad;margin-left:6px">uschované fotky, které nejsou připojené k žádné účtence</span>
    <div id="dokSirotci" style="margin-top:8px"></div></div>`;
}
let _dokSirotci = [];
async function dokladySirotciNajdi() {
  const box = document.getElementById('dokSirotci'); if (!box) return;
  box.innerHTML = '<div style="font-size:.76rem;color:#a8aec8">⏳ Prohledávám úložiště…</div>';
  try {
    const d = await archivVolej('list', {});
    _dokSirotci = dokladySirotci(d.soubory, S.receipts || []);
    const misto = `<div style="font-size:.7rem;color:#8b93ad;margin-bottom:6px">Využito ${d.pocet} z ${d.limit} fotek (${Math.round((d.bajtu || 0) / 1024)} kB).</div>`;
    if (!_dokSirotci.length) { box.innerHTML = misto + '<div style="font-size:.76rem;color:var(--income)">✓ Žádná osiřelá fotka – všechny patří k účtenkám.</div>'; return; }
    const rec = (S.receipts || []).map((r, i) => ({ r, i })).filter(x => x.r && x.r.date).sort((a, b) => String(b.r.date).localeCompare(String(a.r.date))).slice(0, 60);
    const nazevR = r => escHtml((r.store || 'Účtenka') + ' · ' + (r.date || '') + (r.total ? ' · ' + fmtP(r.total) + ' Kč' : ''));
    box.innerHTML = misto + `<div class="card"><div class="card-body" style="padding:6px 14px">
      <div style="font-size:.78rem;font-weight:700;margin:6px 0">${_dokSirotci.length} ${_dokSirotci.length === 1 ? 'fotka bez účtenky' : _dokSirotci.length < 5 ? 'fotky bez účtenky' : 'fotek bez účtenky'}</div>
      ${_dokSirotci.map((x, j) => `<div style="display:flex;gap:11px;padding:10px 0;border-top:1px solid var(--border);align-items:flex-start">
        <div id="dok-sir-${j}" data-key="${escHtml(x.key)}" onclick="archivProhlizec(['${escHtml(x.key)}'])" style="width:54px;height:54px;border-radius:9px;background:var(--surface2);flex-shrink:0;cursor:pointer;display:grid;place-items:center;overflow:hidden">📄</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:.74rem;color:#a8aec8">nahráno ${x.ts ? new Date(x.ts).toLocaleString('cs-CZ') : '?'} · ${Math.round(x.size / 1024)} kB</div>
          ${x.tip >= 0 ? `<button class="btn btn-accent btn-sm" style="font-size:.72rem;margin-top:5px" onclick="dokladSirotekPripoj(${j},${x.tip})">📎 Připojit k ${nazevR(S.receipts[x.tip])}</button>` : ''}
          <div style="display:flex;gap:5px;margin-top:5px;flex-wrap:wrap">
            <select id="dok-sir-sel-${j}" class="fi" style="font-size:.72rem;padding:4px 6px;flex:1;min-width:150px">${rec.map(y => `<option value="${y.i}"${y.i === x.tip ? ' selected' : ''}>${nazevR(y.r)}</option>`).join('')}</select>
            <button class="btn btn-ghost btn-sm" style="font-size:.7rem" onclick="dokladSirotekPripoj(${j},+document.getElementById('dok-sir-sel-${j}').value)">Připojit</button>
            <button class="btn btn-ghost btn-sm" style="font-size:.7rem;color:var(--expense)" onclick="dokladSirotekSmaz(${j})">🗑️ Smazat</button>
          </div></div></div>`).join('')}
    </div></div>`;
    for (let j = 0; j < _dokSirotci.length; j++) {
      const b = document.getElementById('dok-sir-' + j); if (!b) continue;
      try { const blob = await archivVolej('get', { key: b.dataset.key }); b.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="" style="width:100%;height:100%;object-fit:cover">`; } catch (e) { b.textContent = '⚠️'; }
    }
  } catch (e) { box.innerHTML = `<div style="font-size:.76rem;color:var(--expense)">⚠️ ${escHtml(e.message)}</div>`; }
}
function dokladSirotekPripoj(j, recIdx) {
  const x = _dokSirotci[j], r = (S.receipts || [])[recIdx];
  if (!x || !r) return;
  rpPripojFotky(r, { keys: [x.key], bajtu: x.size });
  save();
  if (typeof showToast === 'function') showToast('📎 Fotka připojena k účtence ' + (r.store || ''));
  if (typeof renderUctenky === 'function') renderUctenky();
}
async function dokladSirotekSmaz(j) {
  const x = _dokSirotci[j]; if (!x) return;
  if (!confirm('Smazat tuhle fotku z úložiště? Uvolní se jedno místo z limitu.')) return;
  if (await archivSmaz(x.key)) dokladySirotciNajdi(); else alert('Fotku se nepodařilo smazat, zkus to znovu.');
}
Object.assign(window, { dokladySirotciNajdi, dokladSirotekPripoj, dokladSirotekSmaz });

//  Náhledy se tahají až při otevření záložky a každý jen jednou.
//  S25 (v11.50, Milan): POČITADLO ÚLOŽIŠTĚ – skutečný počet fotek z úložiště a limit podle tarifu
//  (Free 300, Premium 1 000). Dřív tu bylo natvrdo „z 300“ a počítaly se účtenky, ne fotky.
function dokladyPocitadloHTML(d) {
  if (!d || !d.limit) return '';
  const pct = Math.min(100, Math.round(d.pocet / d.limit * 100)), barva = pct >= 90 ? 'var(--expense)' : pct >= 75 ? '#fbbf24' : 'var(--income)';
  const mb = (d.bajtu || 0) / 1048576;
  return `<div style="font-size:.72rem;color:#c9cede;margin:4px 0 10px">
    <div style="display:flex;justify-content:space-between"><span>💾 Úložiště dokladů: <b>${d.pocet}</b> z ${d.limit.toLocaleString('cs-CZ')} fotek</span><span style="color:#a8aec8">${mb < 1 ? Math.round(mb * 1024) + ' kB' : mb.toFixed(1).replace('.', ',') + ' MB'} · zbývá ${Math.max(0, d.limit - d.pocet).toLocaleString('cs-CZ')}</span></div>
    <div style="height:6px;border-radius:3px;background:var(--border);overflow:hidden;margin-top:4px"><div style="width:${pct}%;height:100%;background:${barva}"></div></div>
    ${pct >= 75 && d.limit < 1000 ? '<div style="font-size:.66rem;color:#fbbf24;margin-top:3px">S Premium máš místo na 1 000 fotek.</div>' : ''}</div>`;
}
async function dokladyPocitadlo() {
  const boxy = document.querySelectorAll('.dokPocitadlo'); if (!boxy.length || !window._currentUser) return;
  try { const d = await archivVolej('list', { jenPocet: true }); boxy.forEach(b => { b.innerHTML = dokladyPocitadloHTML(d); }); } catch (e) {}
}
window.dokladyPocitadloHTML = dokladyPocitadloHTML;

async function dokladyNactiNahledy() {
  const boxy = document.querySelectorAll('[id^="dok-nahled-"]');
  for (const b of boxy) {
    if (b.dataset.nacteno) continue;
    b.dataset.nacteno = '1';
    try {
      const blob = await archivVolej('get', { key: b.dataset.key });
      const url = URL.createObjectURL(blob);
      b.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover">`;
    } catch (e) { b.textContent = '⚠️'; b.title = 'Náhled se nepodařilo načíst: ' + e.message; }
  }
}
window.dokladyNactiNahledy = dokladyNactiNahledy;

function _dokRec(i) { return (S.receipts || [])[i]; }

async function dokladOtevri(i) {
  const r = _dokRec(i); if (!r || !r.photoKey) return;
  archivProhlizec(rpFotky(r));   // S25: všechny fotky dokladu
}
window.dokladOtevri = dokladOtevri;

function dokladZaruku(i) {
  const r = _dokRec(i); if (!r) return;
  const nyni = r.warrantyMonths ? String(r.warrantyMonths) : '';
  const v = prompt('Záruka na kolik měsíců? (24 = běžná, 0 = bez záruky)\nPočítá se od data účtenky ' + (r.date || ''), nyni || '24');
  if (v === null) return;
  const m = parseInt(v, 10);
  if (isNaN(m) || m < 0 || m > 240) { alert('Zadej počet měsíců (0–240).'); return; }
  if (m === 0) delete r.warrantyMonths; else r.warrantyMonths = m;
  save(); renderUctenky();
  if (typeof showToast === 'function') showToast(m ? '🛡️ Záruka nastavena' : 'Záruka zrušena');
}
window.dokladZaruku = dokladZaruku;

function dokladPoznamka(i) {
  const r = _dokRec(i); if (!r) return;
  const v = prompt('Poznámka k dokladu (co to je, kde leží…)', r.photoNote || '');
  if (v === null) return;
  const t = v.trim();
  if (t) r.photoNote = t.slice(0, 120); else delete r.photoNote;
  save(); renderUctenky();
}
window.dokladPoznamka = dokladPoznamka;

async function dokladSmaz(i) {
  const r = _dokRec(i); if (!r || !r.photoKey) return;
  if (!confirm('Odstranit uschovaný doklad? Účtenka zůstane.')) return;
  await archivSmazVse(r);   // S25: všechny fotky
  save(); renderUctenky();
  if (typeof showToast === 'function') showToast('Doklad odstraněn');
}
window.dokladSmaz = dokladSmaz;

// ══════════════════════════════════════════════════════
//  S24 (v11.19, T4 krok 1, Milan): ZDRAŽOVÁNÍ A SHRINKFLACE PŘES TAXONOMII
//  cesta: Analýza účtenek → 💹 Zdražování → „🧭 Podle výrobků"
//  Dřív se cena sledovala podle zkratky z účtenky – „K EXO VLOCK" (Kaufland)
//  a „VLOCKY OVES." (Albert) byly dva výrobky s pár nákupy. Nově se položky
//  sdruží podle OBECNÉHO NÁZVU z taxonomie (ovesné vločky) a porovnává se
//  CENA ZA KG / L / KS – jde srovnat i různá balení, značky a obchody.
//  Shrinkflace napříč obchody: stejný KONKRÉTNÍ výrobek z Mapy položek
//  (různé zkratky → jeden výrobek), menší balení za stejnou cenu.
//  Položky mimo taxonomii zůstávají v původním přehledu „podle zkratek".
// ══════════════════════════════════════════════════════
//  Cena za jednotku jedné položky: vážené (kg/l) přímo, jinak z gramáže v názvu.
function taxJednotkovaCena(it) {
  const cena = parseFloat(it.price) || 0; if (cena <= 0) return null;
  if (it.unit === 'kg' || it.unit === 'l') return { cena, j: it.unit };
  const q = (typeof normQty === 'function') ? normQty(it.name) : null;
  if (!q || !(q.hodnota > 0)) return null;
  if (q.jednotka === 'g') return { cena: cena / q.hodnota * 1000, j: 'kg', baleni: q.hodnota, bj: 'g' };
  if (q.jednotka === 'ml') return { cena: cena / q.hodnota * 1000, j: 'l', baleni: q.hodnota, bj: 'ml' };
  if (q.jednotka === 'ks') return { cena: cena / q.hodnota, j: 'ks', baleni: q.hodnota, bj: 'ks' };
  return null;
}
window.taxJednotkovaCena = taxJednotkovaCena;
const _taxMedian = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

//  Vývoj cen podle obecného názvu (čistá funkce).
function taxCenyVyvoj(items, D) {
  D = D || getData();
  const skup = {}; let celkem = 0, pokryto = 0;
  (items || []).forEach(it => {
    const castka = (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 1);
    if (castka <= 0) return;
    celkem += castka;
    const m = (typeof rpMapaNavrh === 'function') ? rpMapaNavrh(it.name, D, it.ean) : null;
    if (!m || !m.tax) return;
    pokryto += castka;
    const jc = taxJednotkovaCena(it); if (!jc) return;
    const g = skup[m.tax.id] || (skup[m.tax.id] = { id: m.tax.id, nazev: m.tax.nazev, podNazev: m.tax.podNazev, podId: m.tax.podId, oblastId: m.tax.oblastId, ikona: m.tax.ikona, nakupy: [] });
    const vaz = it.unit === 'kg' || it.unit === 'l';   // S25: u kusového zboží i cena za kus
    g.nakupy.push({ datum: it.date || '', obchod: it.store || '', raw: it.name || '', cena: jc.cena, j: jc.j, cenaKs: vaz ? null : (parseFloat(it.price) || null), baleni: jc.baleni ? jc.baleni + ' ' + jc.bj : '' });
  });
  const vysl = Object.values(skup).map(g => {
    //  Jen převažující jednotka (kg × ks se nesčítá).
    const pocty = {}; g.nakupy.forEach(n => { pocty[n.j] = (pocty[n.j] || 0) + 1; });
    const j = Object.keys(pocty).sort((a, b) => pocty[b] - pocty[a])[0];
    const n = g.nakupy.filter(x => x.j === j && x.datum).sort((a, b) => a.datum.localeCompare(b.datum));
    if (n.length < 2) return null;
    const mes = {}; n.forEach(x => { (mes[x.datum.slice(0, 7)] = mes[x.datum.slice(0, 7)] || []).push(x.cena); });
    const mesice = Object.keys(mes).sort().map(k => ({ m: k, cena: _taxMedian(mes[k]) }));
    const prvni = mesice[0].cena, posledni = mesice[mesice.length - 1].cena;
    const ob = {}; n.forEach(x => { if (x.obchod) (ob[x.obchod] = ob[x.obchod] || []).push(x.cena); });
    const obchody = Object.entries(ob).map(([o, c]) => ({ obchod: o, cena: _taxMedian(c), pocet: c.length })).sort((a, b) => a.cena - b.cena);
    //  S25 (Milan): Kč/ks vedle Kč/kg – medián za první a poslední měsíc
    const mesKs = {}; n.forEach(x => { if (x.cenaKs) (mesKs[x.datum.slice(0, 7)] = mesKs[x.datum.slice(0, 7)] || []).push(x.cenaKs); });
    const kk = Object.keys(mesKs).sort();
    const prvniKs = kk.length ? _taxMedian(mesKs[kk[0]]) : null, posledniKs = kk.length ? _taxMedian(mesKs[kk[kk.length - 1]]) : null;
    return { ...g, nakupy: n, j, pocet: n.length, mesice, prvni, posledni, prvniKs, posledniKs,
      zmena: mesice.length >= 2 && prvni > 0 ? Math.round((posledni - prvni) / prvni * 100) : null,
      obchody, zkratek: new Set(n.map(x => (typeof normName === 'function') ? normName(x.raw) : x.raw)).size };
  }).filter(Boolean).sort((a, b) => (Math.abs(b.zmena || 0) - Math.abs(a.zmena || 0)) || b.pocet - a.pocet);
  return { polozky: vysl, pokryti: celkem ? Math.round(pokryto / celkem * 100) : 0 };
}
window.taxCenyVyvoj = taxCenyVyvoj;

//  Shrinkflace napříč obchody: stejný konkrétní výrobek z mapy, menší balení
//  a cena za kus skoro stejná (≤ +3 %) → skryté zdražení.
function taxShrinkflace(items, D) {
  D = D || getData();
  const sk = {};
  (items || []).forEach(it => {
    const m = (typeof rpMapaNavrh === 'function') ? rpMapaNavrh(it.name, D, it.ean) : null;
    if (!m || !m.konkretni) return;
    const jc = taxJednotkovaCena(it); if (!jc || !jc.baleni || !it.date) return;
    const k = (typeof normName === 'function') ? normName(m.konkretni) : m.konkretni.toLowerCase();
    (sk[k] = sk[k] || { nazev: m.konkretni, n: [] }).n.push({ datum: it.date, baleni: jc.baleni, bj: jc.bj, cenaKs: parseFloat(it.price) || 0, jc: jc.cena, j: jc.j, obchod: it.store || '', raw: it.name || '' });
  });
  return Object.values(sk).map(g => {
    const n = g.n.sort((a, b) => a.datum.localeCompare(b.datum));
    if (n.length < 2) return null;
    const a = n[0], b = n[n.length - 1];
    if (a.bj !== b.bj || !(b.baleni < a.baleni * 0.97)) return null;
    if (b.cenaKs > a.cenaKs * 1.03) return null;               // dražší balení = otevřené zdražení, ne shrinkflace
    return { nazev: g.nazev, pred: a, po: b, baleniZmena: Math.round((b.baleni - a.baleni) / a.baleni * 100),
      skryteZdrazeni: a.jc > 0 ? Math.round((b.jc - a.jc) / a.jc * 100) : null, zkratky: [...new Set(n.map(x => x.raw))] };
  }).filter(Boolean);
}
window.taxShrinkflace = taxShrinkflace;

function taxZdrazovaniHTML(items) {
  if (typeof taxInfo !== 'function' || (typeof taxSeznam === 'function' && !taxSeznam().length))
    return '<div class="card" style="margin-bottom:12px"><div class="card-body" style="font-size:.78rem;color:#a8aec8">🧭 Taxonomie se načítá – přehled podle výrobků se ukáže po obnovení.</div></div>';
  const D = getData();
  const v = taxCenyVyvoj(items, D), sh = taxShrinkflace(items, D);
  const fmtC = (c, j) => (c >= 100 ? Math.round(c).toLocaleString('cs-CZ') : c.toFixed(2).replace('.', ',')) + ' Kč/' + j;
  const spark = ms => { if (ms.length < 2) return ''; const mn = Math.min(...ms.map(x => x.cena)), mx = Math.max(...ms.map(x => x.cena)), r = (mx - mn) || 1;
    return `<svg viewBox="0 0 60 18" width="60" height="18" style="flex-shrink:0"><polyline fill="none" stroke="#60a5fa" stroke-width="1.6" points="${ms.map((x, i) => (i * 60 / (ms.length - 1)).toFixed(1) + ',' + (16 - (x.cena - mn) / r * 14).toFixed(1)).join(' ')}"/></svg>`; };
  const fmtKs = c => c.toFixed(2).replace('.', ',') + ' Kč/ks';
  const radky = v.polozky.slice(0, 20).map((p, pi) => {
    const nej = p.obchody.length > 1 ? p.obchody[0] : null, draz = p.obchody.length > 1 ? p.obchody[p.obchody.length - 1] : null;
    //  S25: klik = rozbalit nákupy (datum, obchod, zkratka, Kč/ks, Kč/kg) a ceny po obchodech
    const det = `<div id="taxDet${pi}" style="display:none;padding:4px 0 10px 32px">
      ${p.nakupy.slice().reverse().map(x => `<div style="display:flex;gap:8px;flex-wrap:wrap;font-size:.72rem;padding:3px 0;border-top:1px solid var(--border)">
        <span style="min-width:74px;color:#a8aec8">${escHtml(x.datum.split('-').reverse().join('. '))}</span>
        <span style="flex:1;min-width:120px;font-family:monospace;overflow-wrap:anywhere">${escHtml(x.raw)}</span>
        <span style="color:#a8aec8">${escHtml(x.obchod)}</span>
        ${x.cenaKs ? `<b style="white-space:nowrap">${fmtKs(x.cenaKs)}</b>` : ''}<span style="white-space:nowrap;color:#c9cede">${fmtC(x.cena, x.j)}</span></div>`).join('')}
      ${p.obchody.length > 1 ? `<div style="font-size:.7rem;color:#a8aec8;margin-top:5px">Medián po obchodech: ${p.obchody.map(o => escHtml(o.obchod) + ' ' + fmtC(o.cena, p.j)).join(' · ')}</div>` : ''}
    </div>`;
    return `<div onclick="var d=document.getElementById('taxDet${pi}');if(d)d.style.display=d.style.display==='none'?'block':'none'" style="cursor:pointer;display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
      ${typeof ffIkonaDlazdice === 'function' ? ffIkonaDlazdice(p, 34, 20) : `<span style="font-size:1.1rem">${escHtml(p.ikona)}</span>`}
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.86rem;color:var(--text)">${escHtml(p.nazev.charAt(0).toLocaleUpperCase('cs') + p.nazev.slice(1))} <span style="font-weight:400;font-size:.68rem;color:#fbbf24">${escHtml(p.podNazev)}</span></div>
        ${p.prvniKs != null && p.j !== 'ks' ? `<div style="font-size:.72rem;color:#a8aec8">${fmtKs(p.prvniKs)} → <b style="color:var(--text)">${fmtKs(p.posledniKs)}</b></div>` : ''}
        <div style="font-size:.72rem;color:#a8aec8">${fmtC(p.prvni, p.j)} → <b style="color:var(--text)">${fmtC(p.posledni, p.j)}</b> · ${p.pocet} nákupů${p.zkratek > 1 ? ' · ' + p.zkratek + ' různé zkratky' : ''} <span style="color:#60a5fa">▾</span></div>
        ${nej && draz && draz.cena > nej.cena * 1.02 ? `<div style="font-size:.68rem;color:var(--income)">Nejlevněji ${escHtml(nej.obchod)} (${fmtC(nej.cena, p.j)}), o ${Math.round((1 - nej.cena / draz.cena) * 100)} % levněji než ${escHtml(draz.obchod)}</div>` : ''}
      </div>
      ${spark(p.mesice)}
      <div title="${p.zmena == null ? 'Zatím nákupy jen z 1 měsíce – změna se spočítá s dalším měsícem' : 'Změna ceny za ' + p.j + ' mezi prvním a posledním měsícem'}" style="text-align:right;min-width:52px;font-weight:800;font-size:.86rem;color:${p.zmena == null ? '#8b93ad' : p.zmena > 2 ? 'var(--expense)' : p.zmena < -2 ? 'var(--income)' : '#a8aec8'}">${p.zmena == null ? '1 měs.' : (p.zmena > 0 ? '↑' : p.zmena < 0 ? '↓' : '') + Math.abs(p.zmena) + ' %'}</div>
    </div>${det}`;
  }).join('');
  const shHTML = sh.length ? `<div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3)">
      <div style="font-weight:700;font-size:.82rem;margin-bottom:4px">📉 Shrinkflace napříč obchody</div>
      ${sh.map(x => `<div style="font-size:.76rem;padding:4px 0;line-height:1.45">${escHtml(x.nazev)}: <b>${x.pred.baleni} ${x.pred.bj} → ${x.po.baleni} ${x.po.bj}</b> (${x.baleniZmena} %) za ${x.po.cenaKs.toFixed(2).replace('.', ',')} Kč
        ${x.skryteZdrazeni != null ? `– skryté zdražení <b style="color:var(--expense)">+${x.skryteZdrazeni} %</b>` : ''}
        ${x.zkratky.length > 1 ? `<div style="font-size:.66rem;color:#8b93ad">zkratky: ${x.zkratky.map(escHtml).join(', ')}</div>` : ''}</div>`).join('')}</div>` : '';
  return `<div class="card" style="margin-bottom:12px"><div class="card-body">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">
      <div style="font-weight:700;font-size:.92rem">🧭 Podle výrobků</div>
      <div style="font-size:.7rem;color:#a8aec8">taxonomie pokrývá <b style="color:${v.pokryti >= 70 ? 'var(--income)' : v.pokryti >= 40 ? '#fbbf24' : 'var(--expense)'}">${v.pokryti} %</b> útraty z účtenek</div></div>
    <div style="font-size:.72rem;color:#a8aec8;margin:4px 0 6px;line-height:1.45">Stejný výrobek z různých obchodů a pod různými zkratkami dohromady, srovnáno za kilo, litr nebo kus (u balených i cena za kus). Modrá křivka = vývoj ceny po měsících, vpravo změna mezi prvním a posledním měsícem („1 měs.“ = zatím data jen z jednoho měsíce). Klepni na výrobek pro jednotlivé nákupy. Zobrazí se výrobky aspoň se 2 nákupy, s gramáží v názvu nebo vážené, a zařazené v Mapě položek.</div>
    ${radky || '<div style="font-size:.78rem;color:#a8aec8;padding:6px 0">Zatím málo dat – potřeba aspoň 2 nákupy stejného výrobku s gramáží v názvu (nebo vážené zboží).</div>'}
    ${shHTML}
  </div></div>`;
}
window.taxZdrazovaniHTML = taxZdrazovaniHTML;

function buildPricesTab(priceChanges, allItems) {
  //  S23: řekni, co se do porovnání nedostalo a proč – ať to nevypadá, že appka položky ztratila.
  const _gs = window._rpGenericSkipped || {n:0,names:[]};
  const _genericNote = _gs.n ? '<div style="margin-bottom:12px;padding:9px 12px;border-radius:10px;background:var(--surface2);border-left:3px solid #60a5fa;font-size:.72rem;color:#a8aec8;line-height:1.55">'
    + 'ℹ️ <b style="color:#c9cede">' + _gs.n + ' položek s obecným názvem</b> (' + _gs.names.map(x=>escHtml(x)).join(', ') + ') tu není. '
    + 'Na účtence je jen oddělení, ne výrobek – nejde poznat gramáž ani cena za kilo, takže by porovnání cen lhalo. '
    + 'Do útraty se počítají dál. Když v Historii u účtenky přepíšeš název na konkrétní („Vysočina 100g"), začne se sledovat.</div>' : '';
  let html = '<div id="utab-prices-content" style="display:none">';
  //  S24 (v11.19, T4): nahoře přehled podle výrobků z taxonomie, níž původní podle zkratek.
  try { html += taxZdrazovaniHTML(allItems || []); } catch(e) { console.warn('taxZdrazovani', e); }
  html += '<div style="font-size:.72rem;color:#8b93ad;margin:4px 2px 8px">Podrobně podle zkratek z účtenek:</div>';
  html += _genericNote;
  if(!priceChanges.length) {
    html += `<div class="card"><div class="card-body"><div class="empty">
      <div class="ei">📈</div>
      <div class="et">Detektor zdražování</div>
      <div style="font-size:.76rem;color:var(--text2);margin-top:8px">
        Potřebuje stejnou položku se dvěma různými cenami/hmotnostmi na různých účtenkách.
      </div>
    </div></div></div>`;
  } else {
    // Rozdělení na kategorie
    // S17.13 (Milan): multifiltr sledovaných položek – při desítkách položek byl výpis nepřehledný
    if(!Array.isArray(window._pricePick)) window._pricePick = [];
    const _allNames = priceChanges.map(p=>p.name);
    const _pick = window._pricePick.filter(n=>_allNames.includes(n));
    const _filtered = _pick.length ? priceChanges.filter(p=>_pick.includes(p.name)) : priceChanges;

    const shrinkItems = _filtered.filter(p=>p.shrinkflation);
    const kgItems = _filtered.filter(p=>!p.shrinkflation && p.perUnitData);
    const stdItems = _filtered.filter(p=>!p.shrinkflation && !p.perUnitData);

    html += `<div style="background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.76rem;color:var(--text2);border:1px solid var(--border)">
      📊 Vývoj cen · <strong>${priceChanges.length} položek</strong> ·
      ${shrinkItems.length ? `<span style="color:var(--expense)">🔻 ${shrinkItems.length} shrinkflation</span> · ` : ''}
      ${kgItems.length ? `<span style="color:var(--debt)">⚖️ ${kgItems.length} sledovaných kg/l</span> · ` : ''}
      ${stdItems.length ? `<span style="color:var(--text2)">${stdItems.length} cenových změn</span>` : ''}
    </div>`;

    //  S25 (Milan): výběr sledovaných položek přímo nad kartami (dřív nahoře nad souhrnem + hledací pole)
    const _pickerHTML = `<div class="card" style="margin-bottom:12px"><div class="card-body">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <span style="font-size:.76rem;color:#c9cede;font-weight:600">🔍 Sledované položky</span>
        <select onchange="pricePickToggle(this.value);this.selectedIndex=0"
          style="flex:1;min-width:170px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 9px;color:#e8eaf2;font-size:.78rem">
          <option value="">➕ Přidat položku…</option>
          ${[...priceChanges].sort((a,b)=>String(a.displayName||a.name).localeCompare(String(b.displayName||b.name),'cs'))
            .filter(p=>!_pick.includes(p.name))
            .map(p=>`<option value="${String(p.name).replace(/"/g,'&quot;')}">${String(p.displayName||p.name).slice(0,40)} (${(p.change||0)>0?'+':''}${Math.round(p.change||0)} %)</option>`).join('')}
        </select>
        ${_pick.length?`<button onclick="pricePickClear()" style="padding:5px 10px;border-radius:8px;font-size:.72rem;cursor:pointer;border:1px solid var(--border);background:transparent;color:#c9cede">✕ Zrušit vše</button>`:''}
      </div>
      <div style="font-size:.72rem;color:#a8aec8;margin-bottom:${_pick.length?'7':'0'}px">${_pick.length?`Sleduješ ${_pick.length} položek – tabulka i graf níže zobrazují jen je.`:'Bez výběru se zobrazují všechny položky a v grafu top 5 dle změny.'}</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        ${_pick.map(n=>{
          const p=priceChanges.find(x=>x.name===n)||{};
          const up=(p.change||0)>0;
          return `<button onclick="pricePickToggle('${String(n).replace(/'/g,"\\'")}')" title="Odebrat ze sledování" style="padding:3px 9px;border-radius:12px;font-size:.7rem;cursor:pointer;white-space:nowrap;border:1px solid var(--income);background:rgba(74,222,128,.16);color:#e8eaf2">${String(p.displayName||n).slice(0,22)} <span style="color:${up?'var(--expense)':'var(--income)'}">${up?'↑':'↓'}${Math.abs(Math.round(p.change||0))}%</span> ✕</button>`;
        }).join('')}
      </div>
    </div></div>`;

    html += _pickerHTML;

    // ── Shrinkflation varování ──
    if(shrinkItems.length) {
      html += `<div style="padding:10px 14px;margin-bottom:14px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);border-radius:10px">
        <div style="font-weight:700;color:var(--expense);margin-bottom:6px;font-size:.85rem">🔻 Shrinkflation – zmenšené balení za stejnou cenu</div>
        <div style="font-size:.74rem;color:var(--text2)">Cena zůstala podobná, ale obsah se zmenšil → reálně zdražení na kg/l.</div>
      </div>`;
    }

    const renderItem = (p, pi, highlight) => {
      const color = p.change > 0 ? 'var(--expense)' : p.change < 0 ? 'var(--income)' : 'var(--text2)';
      const arrow = p.change > 0 ? '↑' : p.change < 0 ? '↓' : '→';
      const minP = Math.min(...p.history.map(h=>h.price));
      const maxP = Math.max(...p.history.map(h=>h.price));
      const range = maxP - minP || 1;
      const allDates = (p.allHistory||p.history).map(h=>h.date).filter(Boolean);
      const firstDate = allDates[0]||'';
      const lastDate = allDates[allDates.length-1]||'';

      const timeline = p.history.map((h, i) => {
        const prev = i > 0 ? p.history[i-1].price : null;
        const diff = prev !== null ? Math.round((h.price - prev) * 100) / 100 : 0;   // S25: bez „4,00“ vs „3“ z plovoucí čárky
        const diffStr = diff !== 0 ? `<span style="font-size:.7rem;color:${diff>0?'var(--expense)':'var(--income)'}">
          ${diff>0?'↑':'↓'} ${fmtP(Math.abs(diff))} Kč</span>` : '';
        const barW = range > 0 ? Math.round((h.price - minP) / range * 80) + 10 : 50;
        const isLast = i === p.history.length - 1;
        const barColor = i===0?'var(--bank)':diff>0?'var(--expense)':'var(--income)';
        const priceColor = diff>0?'var(--expense)':diff<0?'var(--income)':'var(--text)';
        return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:${isLast?'none':'1px solid var(--border)'}">
          <div style="min-width:76px;font-size:.72rem;color:var(--text2)">${h.date||'–'}</div>
          <div style="width:100px;flex-shrink:0">
            <div style="height:5px;background:var(--surface3);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${barW}%;background:${barColor};border-radius:3px"></div>
            </div>
          </div>
          <div style="min-width:54px;text-align:right;font-weight:700;font-size:.82rem;color:${priceColor}">${fmtP(h.price)} Kč</div>
          <div style="min-width:60px;font-size:.7rem">${diffStr}</div>
          ${h.store?`<div style="font-size:.68rem;color:var(--text3);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.store}</div>`:''}
        </div>`;
      }).join('');

      // Cena/kg nebo cena/l timeline
      let unitTimeline = '';
      if(p.perUnitData) {
        const ud = p.perUnitData;
        const uColor = ud.change > 0 ? 'var(--expense)' : ud.change < 0 ? 'var(--income)' : 'var(--text2)';
        const uArrow = ud.change > 0 ? '↑' : ud.change < 0 ? '↓' : '→';
        unitTimeline = `<div style="padding:8px 14px;border-top:1px solid var(--border);background:var(--surface2)">
          <div style="font-size:.72rem;font-weight:700;color:var(--text2);margin-bottom:6px">
            ⚖️ Vývoj ceny ${ud.unit}
            <span style="color:${uColor};margin-left:6px">${uArrow} ${Math.abs(ud.change)}%</span>
            <span style="color:var(--text3);font-weight:400;margin-left:4px">${fmtP(ud.first)} → ${fmtP(ud.last)} ${ud.unit}</span>
          </div>
          ${ud.history.map((h,i)=>{
            const prev = i>0?ud.history[i-1].pricePerUnit:null;
            const diff = prev!==null?Math.round((h.pricePerUnit-prev)*100)/100:0;
            return `<div style="display:flex;gap:8px;align-items:center;padding:3px 0;font-size:.76rem">
              <span style="min-width:76px;color:var(--text3)">${h.date||''}</span>
              <span style="font-weight:700;color:${diff>0?'var(--expense)':diff<0?'var(--income)':'var(--text)'}">${fmtP(h.pricePerUnit)} ${ud.unit}</span>
              ${diff!==0?`<span style="color:${diff>0?'var(--expense)':'var(--income)'};font-size:.68rem">${diff>0?'↑':'↓'} ${fmtP(Math.abs(diff))} ${ud.unit}</span>`:''}
              ${h.store?`<span style="color:var(--text3);font-size:.68rem;flex:1">${h.store}</span>`:''}
            </div>`;
          }).join('')}
        </div>`;
      }

      // Shrinkflation badge
      const shrinkBadge = p.shrinkflation ? `
        <div style="padding:6px 14px;background:rgba(248,113,113,.06);border-top:1px solid rgba(248,113,113,.2)">
          <div style="font-size:.74rem;color:var(--expense)">
            🔻 <strong>Shrinkflation:</strong> ${p.shrinkflation.label}
            ${p.perUnitData ? `· cena/kg: ${fmtP(p.perUnitData.first)} → ${fmtP(p.perUnitData.last)} Kč/kg (<strong style="color:var(--expense)">${p.perUnitData.change > 0 ? '+' : ''}${p.perUnitData.change}%</strong>)` : ''}
          </div>
        </div>` : '';

      return `<div class="card price-card" data-pn="${escHtml(String(p.displayName||p.name).toLowerCase())}" style="margin-bottom:10px;border:1px solid ${highlight?'rgba(248,113,113,.4)':'var(--border)'}">
        <div style="padding:11px 14px;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:700;font-size:.9rem;text-transform:capitalize">${p.displayName}</div>
              <div style="font-size:.72rem;color:var(--text2)">${p.count} cen · ${firstDate}–${lastDate}</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:Syne,sans-serif;font-size:1.25rem;font-weight:800;color:${color}">${arrow} ${Math.abs(p.change)}%</div>
              <div style="font-size:.7rem;color:var(--text2)">${fmtP(p.first)} → ${fmtP(p.last)} Kč/ks</div>
            </div>
          </div>
        </div>
        ${shrinkBadge}
        ${unitTimeline}
        <div style="padding:6px 14px">${timeline}</div>
      </div>`;
    };

    if(shrinkItems.length) {
      html += `<div style="font-size:.72rem;font-weight:700;color:var(--expense);text-transform:uppercase;letter-spacing:.06em;margin:12px 0 8px">🔻 Shrinkflation (${shrinkItems.length})</div>`;
      shrinkItems.forEach((p,i) => { html += renderItem(p, i, true); });
    }
    if(kgItems.length) {
      html += `<div style="font-size:.72rem;font-weight:700;color:var(--debt);text-transform:uppercase;letter-spacing:.06em;margin:12px 0 8px">⚖️ Sledování ceny/kg a ceny/l (${kgItems.length})</div>`;
      kgItems.forEach((p,i) => { html += renderItem(p, i+100, false); });
    }
    if(stdItems.length) {
      html += `<div style="font-size:.72rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin:12px 0 8px">📊 Cenové změny (${stdItems.length})</div>`;
      stdItems.forEach((p,i) => { html += renderItem(p, i+200, false); });
    }
    // v8.58 (TODO-147): interaktivní graf vývoje cen pod tabulkou Zdražování
    html += buildPricesTrendChart(priceChanges);
  }
  return html + '</div>';
}

function priceHledej(q) {   // S25: filtr karet Zdražování podle názvu
  q = String(q || '').toLowerCase().trim();
  document.querySelectorAll('#utab-prices-content .price-card').forEach(el => { el.style.display = !q || (el.dataset.pn || '').includes(q) ? '' : 'none'; });
}
window.priceHledej = priceHledej;

// ── v8.58 (TODO-147): Graf vývoje cen (SVG, osy + legenda + tooltip) ──
// Compute: vybere top 5 položek s největší |změnou| a připraví body (datum→x, cena→y).
function pricesTrendChartData(priceChanges){
  // S17.15 (Milan): graf nereagoval na multifiltr Zdražování – teď kreslí vybrané položky
  // (bez výběru zůstává top 5 dle |změny|).
  const _pick = Array.isArray(window._pricePick) ? window._pricePick : [];
  let pool = (priceChanges||[]).filter(p => (p.history||[]).filter(h=>h.date&&isFinite(h.price)).length >= 2);
  if(_pick.length) pool = pool.filter(p => _pick.includes(p.name));
  const items = pool
    .sort((a,b)=>Math.abs(b.change)-Math.abs(a.change))
    .slice(0, _pick.length ? 8 : 5);
  if(!items.length) return null;
  let minT=Infinity,maxT=-Infinity,minP=Infinity,maxP=-Infinity;
  const series = items.map(p=>{
    const pts = p.history.filter(h=>h.date&&isFinite(h.price))
      .map(h=>({t:Date.parse(h.date), price:h.price, date:h.date, store:h.store||''}))
      .filter(pt=>isFinite(pt.t)).sort((a,b)=>a.t-b.t);
    pts.forEach(pt=>{ if(pt.t<minT)minT=pt.t; if(pt.t>maxT)maxT=pt.t; if(pt.price<minP)minP=pt.price; if(pt.price>maxP)maxP=pt.price; });
    return { name:p.displayName, change:p.change, pts };
  }).filter(s=>s.pts.length>=2);
  if(!series.length || !isFinite(minT) || minT===maxT) return null;
  if(minP===maxP){ minP-=1; maxP+=1; }
  const pad=(maxP-minP)*0.12; minP=Math.max(0,minP-pad); maxP+=pad; // data nesmí přetéct osy
  return { series, minT, maxT, minP, maxP };
}
// Render: SVG s pevným viewBox (kreslí se korektně i ve skryté záložce), max-width + preserveAspectRatio.
function buildPricesTrendChart(priceChanges){
  const d = pricesTrendChartData(priceChanges);
  if(!d) return '';
  const COLS=['#60a5fa','#f472b6','#facc15','#34d399','#fb923c'];
  const W=640,H=300,L=56,R=14,T=16,B=44; // plocha grafu s paddingem, ať nic nepřetéká
  const X=t=>L+(t-d.minT)/(d.maxT-d.minT)*(W-L-R);
  const Y=p=>T+(1-(p-d.minP)/(d.maxP-d.minP))*(H-T-B);
  const fD=t=>{const x=new Date(t);return `${x.getDate()}.${x.getMonth()+1}.${String(x.getFullYear()).slice(2)}`;};
  // Osa Y: 4 gridliny s popisky v Kč
  let grid='';
  for(let i=0;i<=4;i++){
    const v=d.minP+(d.maxP-d.minP)*i/4, y=Y(v);
    grid+=`<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="rgba(168,174,200,.18)" stroke-width="1"/>`
        +`<text x="${L-7}" y="${y+3.5}" text-anchor="end" font-size="10.5" fill="#a8aec8">${Math.round(v)}</text>`;
  }
  // Osa X: max 5 datumových popisků
  let xt='';
  for(let i=0;i<=4;i++){
    const t=d.minT+(d.maxT-d.minT)*i/4, x=X(t);
    xt+=`<text x="${x}" y="${H-B+16}" text-anchor="middle" font-size="10.5" fill="#a8aec8">${fD(t)}</text>`;
  }
  // Čáry + body s tooltipem
  let lines='';
  d.series.forEach((s,si)=>{
    const col=COLS[si%COLS.length];
    lines+=`<polyline points="${s.pts.map(pt=>`${X(pt.t).toFixed(1)},${Y(pt.price).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>`;
    s.pts.forEach(pt=>{
      lines+=`<circle cx="${X(pt.t).toFixed(1)}" cy="${Y(pt.price).toFixed(1)}" r="4" fill="${col}" stroke="var(--surface,#111827)" stroke-width="1.5" style="cursor:pointer"
        onmouseenter="_pricesTip(event,'${(s.name||'').replace(/'/g,'')}','${pt.date}',${pt.price},'${(pt.store||'').replace(/'/g,'')}')" onmouseleave="_pricesTipHide()"
        ontouchstart="_pricesTip(event,'${(s.name||'').replace(/'/g,'')}','${pt.date}',${pt.price},'${(pt.store||'').replace(/'/g,'')}')"/>`;
    });
  });
  const legend=d.series.map((s,si)=>`<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px;font-size:.72rem;color:var(--text)"><span style="width:14px;height:3px;background:${COLS[si%COLS.length]};border-radius:2px;display:inline-block"></span>${s.name} <span style="color:${s.change>0?'var(--expense)':s.change<0?'var(--income)':'#a8aec8'}">${s.change>0?'+':''}${s.change}%</span></span>`).join('');
  return `<div class="card" style="margin-top:14px"><div class="card-body">
    <div style="font-weight:700;font-size:.9rem;margin-bottom:2px">📈 Vývoj cen v čase</div>
    <div style="font-size:.72rem;color:#a8aec8;margin-bottom:8px">${(Array.isArray(window._pricePick)&&window._pricePick.length)?`Vybrané položky (${d.series.length})`:`Top ${d.series.length} položek s největší změnou`} · cena za ks v Kč · najeď na bod pro detail</div>
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:${W}px;height:auto;display:block">
      <text x="14" y="${T+((H-T-B)/2)}" font-size="10.5" fill="#a8aec8" transform="rotate(-90 14 ${T+((H-T-B)/2)})" text-anchor="middle">Cena (Kč/ks)</text>
      <text x="${L+(W-L-R)/2}" y="${H-6}" font-size="10.5" fill="#a8aec8" text-anchor="middle">Datum nákupu</text>
      <line x1="${L}" y1="${T}" x2="${L}" y2="${H-B}" stroke="rgba(168,174,200,.4)" stroke-width="1"/>
      <line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" stroke="rgba(168,174,200,.4)" stroke-width="1"/>
      ${grid}${xt}${lines}
    </svg>
    <div style="margin-top:8px;line-height:1.9">${legend}</div>
    <div id="pricesTipEl" style="display:none;position:fixed;z-index:999;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-size:.74rem;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.4)"></div>
  </div></div>`;
}
function _pricesTip(evt, name, date, price, store){
  const el=document.getElementById('pricesTipEl'); if(!el) return;
  el.innerHTML=`<strong style="text-transform:capitalize">${name}</strong><br>${date} · <strong>${fmtP(price)} Kč</strong>${store?`<br><span style="color:#a8aec8">${store}</span>`:''}`;
  el.style.display='block';
  const e=evt.touches?evt.touches[0]:evt;
  const x=Math.min(e.clientX+12, window.innerWidth-180), y=Math.max(8, e.clientY-52);
  el.style.left=x+'px'; el.style.top=y+'px';
  if(evt.touches) setTimeout(_pricesTipHide, 2500);
}
function _pricesTipHide(){ const el=document.getElementById('pricesTipEl'); if(el) el.style.display='none'; }

function updatePriceSlider(pi, val, dates) {
  const label = document.getElementById('price-range-label-'+pi);
  if(!label) return;
  const idx = parseInt(val);
  label.textContent = dates[0] + ' – ' + dates[idx];
}

// Smaže duplikátní účtenky z S.receipts a uloží
//  S25 (Milan): účtenka a její transakce nemají přímou vazbu (starší data) → transakci
//  hledáme podle vazby receiptAddedAt (nové účtenky), jinak podle obchodu, data a částky.
function rcptNajdiTx(r, D, vynech) {
  const txs = (D || S).transactions || []; vynech = vynech || new Set();
  if (r && r.addedAt) { const t = txs.find(t => t.receiptAddedAt === r.addedAt && !vynech.has(t)); if (t) return t; }
  return txs.find(t => !vynech.has(t) && !t.receiptAddedAt && t.type === 'expense'
    && (t.receiptStore || '') === (r.store || '') && (t.receiptDate || t.date) === r.date
    && Math.abs((t.amount || 0) - (r.total || 0)) < 0.01 && String(t.note || '').startsWith('📸')) || null;
}
window.rcptNajdiTx = rcptNajdiTx;

function removeDuplicateReceipts() {
  if(!confirm('Smazat duplikátní účtenky i jejich transakce? Originál zůstane. Akce je nevratná.')) return;
  const seen = new Set(), odstr = [];
  const before = (S.receipts||[]).length;
  S.receipts = (S.receipts||[]).filter(r => {
    const key = `${normalizeStoreName(r.store)}|${r.date}|${Math.round((r.total||0)*100)}|${(r.items||[]).length}`;
    if(seen.has(key)) { odstr.push(r); return false; }
    seen.add(key); return true;
  });
  //  Transakce ponechaných účtenek si „rezervujeme“, smaže se jen ta navíc.
  const drz = new Set(); S.receipts.forEach(r => { const t = rcptNajdiTx(r, S, drz); if (t) drz.add(t); });
  let txN = 0;
  odstr.forEach(r => { const t = rcptNajdiTx(r, S, drz); if (t) { S.transactions = S.transactions.filter(x => x !== t); drz.add(t); txN++; }
    if (r.photoKey && typeof archivSmaz === 'function') rpFotky(r).forEach(k => archivSmaz(k)); });
  const removed = before - S.receipts.length;
  save();
  renderUctenky();
  alert(`✅ Odstraněno ${removed} duplikátů${txN ? ` a ${txN} ${txN === 1 ? 'transakce' : 'transakcí'}` : ''}. Zbývá ${S.receipts.length} účtenek.`);
}

function buildStoresTab(storeStats, totalSpent, receipts) {
  receipts = receipts || S.receipts || [];
  let html = '<div id="utab-stores-content" style="display:none">';
  if(!Object.keys(storeStats).length) {
    html += '<div class="card"><div class="card-body"><div class="empty"><div class="et">Žádné obchody zatím</div></div></div></div>';
    return html+'</div>';
  }

  // Seskup receipty dle NORMALIZOVANÉHO názvu
  const storeReceipts = {};
  receipts.forEach((r,i) => {
    const key = normalizeStoreName(r.store);
    if(!storeReceipts[key]) storeReceipts[key] = [];
    storeReceipts[key].push({...r, _idx:i});
  });

  const D = getData();
  Object.entries(storeStats).sort((a,b)=>b[1].total-a[1].total).forEach(([store,stats], sIdx) => {
    const pct = Math.round(stats.total/totalSpent*100);
    const avg = stats.visits > 1 ? Math.round(stats.total/stats.visits) : null;
    //  S25 (Milan): ID z pořadí – dřív se diakritika měnila na „_“, takže „Můj obchod…“ a
    //  „Môj obchod…“ měly STEJNÉ ID a klik na druhý rozbalil první.
    const storeId = 'store_'+sIdx+'_'+store.replace(/[^a-z0-9]/gi,'_');
    const rcts = storeReceipts[store]||[];

    html += `<div class="card" style="margin-bottom:8px;overflow:hidden">
      <!-- Řádek obchodu -->
      <div style="padding:13px 16px;cursor:pointer;display:flex;align-items:center;gap:12px" onclick="toggleHistGroup('${storeId}')">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:1rem;color:var(--text)">${store}</div>
          <div style="font-size:.78rem;color:var(--text2);margin-top:3px">${stats.visits} ${stats.visits===1?'návštěva':stats.visits<5?'návštěvy':'návštěv'} · ${stats.count} položek</div>
          ${stats.mesta && stats.mesta.size ? `<div style="font-size:.72rem;color:#a8aec8;margin-top:2px">📍 ${escHtml([...stats.mesta].join(', '))}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:Syne,sans-serif;font-size:1.25rem;font-weight:800;color:var(--expense)">${fmtB(Math.round(stats.total))}</div>
          ${avg !== null ? `<div style="font-size:.75rem;color:var(--text2)">ø ${_cNum(avg)} ${curSym()}/nákup</div>` : ''}
        </div>
        <span id="${storeId}_arrow" style="color:var(--text3);font-size:.85rem;flex-shrink:0;transition:transform .2s;margin-left:4px">▶</span>
      </div>
      <!-- Expand: progress bar + účtenky -->
      <div id="${storeId}" style="display:none">
        <div style="padding:0 16px 10px">
          <div class="trap-bar"><div class="trap-bar-fill" style="width:${pct}%;background:var(--bank)"></div></div>
          <div style="font-size:.72rem;color:var(--text3);margin-top:3px">${pct}% z celkových výdajů</div>
        </div>
        <div style="border-top:1px solid var(--border)">
          ${rcts.length === 0 ? `<div style="padding:12px 16px;font-size:.78rem;color:var(--text3)">Žádné účtenky (data ze starší verze)</div>` :
          rcts.map(r => {
            const rcptId = storeId+'_r'+r._idx;
            const catGroups = {};
            (r.items||[]).forEach(it=>{
              const cat=(D.categories||[]).find(c=>c.id===it.itemCatId);
              const k=cat?.name||'Ostatní';
              if(!catGroups[k])catGroups[k]={icon:cat?.icon||'📦',total:0};
              catGroups[k].total+=lineAmt(it);
            });
            const catParts = Object.entries(catGroups).slice(0,3).map(([n,v])=>`${v.icon} ${n} ${fmtB(Math.round(v.total))}`).join(' · ');
            return `<div style="border-bottom:1px solid var(--border)">
              <!-- Účtenka řádek (bez edit/delete - ty jsou v Historii) -->
              <div style="padding:10px 16px;display:flex;align-items:center;gap:8px;cursor:pointer"
                   onclick="toggleHistReceipt('${rcptId}')">
                <div style="flex:1;min-width:0">
                  <div style="font-size:.85rem;font-weight:600;color:var(--text)">${r.date||'–'}</div>
                  <div style="font-size:.72rem;color:var(--text2);margin-top:2px">${(r.items||[]).length} položek${catParts?' · '+catParts.slice(0,70):''}</div>
              ${(()=>{ const c=receiptCompleteness(r); if(!c||c.ok) return '';
                return `<div style="font-size:.7rem;color:var(--debt);margin-top:3px">
                  ⚠️ Součet položek ${fmtB(Math.round(c.sum))} ≠ suma na účtence ${fmtB(Math.round(c.total))}
                  (${c.chybi?'chybí':'přebývá'} ${fmtB(Math.abs(Math.round(c.diff)))})
                </div>`; })()}
                </div>
                <div style="font-weight:700;color:var(--expense);font-size:.95rem;flex-shrink:0">${fmtP(r.total||0)} Kč</div>
                <span id="${rcptId}_arrow" style="color:var(--text3);font-size:.72rem;flex-shrink:0">▶</span>
              </div>
              <!-- Položky - sloupce: Položka | Kč | Množství -->
              <div id="${rcptId}" style="display:none;padding:6px 16px 10px 32px;background:var(--surface2)">
                <div style="display:grid;grid-template-columns:1fr 80px 56px;gap:4px 8px;padding:3px 0 5px;border-bottom:1px solid var(--border);font-size:.65rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">
                  <span>Položka</span><span style="text-align:right">Celkem</span><span style="text-align:right">Mn.</span>
                </div>
                ${(r.items||[]).map(it=>{
                  const cat=(D.categories||[]).find(c=>c.id===it.itemCatId);
                  const total = it.lineTotal!=null ? parseFloat(it.lineTotal) : (parseFloat(it.price)||0)*(parseFloat(it.qty)||1);
                  const qtyStr = (it.qty&&it.qty!==1) ? `${it.qty}\u00a0${it.unit||'ks'}` : `1\u00a0${it.unit||'ks'}`;
                  return `<div style="display:grid;grid-template-columns:1fr 80px 56px;gap:4px 8px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)">
                    <div style="min-width:0">
                      <span style="font-size:.8rem;color:var(--text)">${it.name||'–'}</span>
                      ${cat?`<span style="font-size:.64rem;color:${cat.color||'var(--text3)'};margin-left:4px">${cat.icon}</span>`:''}
                      ${it.discount?`<span style="font-size:.64rem;color:var(--income);margin-left:4px">-${fmtP(it.discount)}Kč</span>`:''}
                    </div>
                    <div style="text-align:right;font-size:.8rem;font-weight:700;color:var(--expense);white-space:nowrap">${fmtP(total)}\u00a0Kč</div>
                    <div style="text-align:right;font-size:.72rem;color:var(--text3);white-space:nowrap">${qtyStr}</div>
                  </div>`;
                }).join('')||'<div style="color:var(--text3);font-size:.75rem">Žádné položky</div>'}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  });
  return html+'</div>';
}

// ── TODO-226 (S19, nahlásil Milan): KONTROLA ÚPLNOSTI ÚČTENKY ──
//  AI občas položku přehlédne (zmuchlaný nebo tmavý doklad, dva sloupce, slepený
//  řádek). Do teď to nikdo nezjistil: součet položek se nikde neporovnával
//  se sumou natištěnou na účtence, přestože OBĚ ČÍSLA jsme měli.
//  Důsledek: chybějící položka tiše vypadla z Inflace, z COICOP rozpadu
//  i z Nákupní DNA – a uživatel se to nedozvěděl.
//
//  Tolerance 1 Kč pokrývá zaokrouhlení hotovosti. Nad ni se rozdíl ukáže.
//  ⚠️ Rozdíl NEZNAMENÁ automaticky chybu AI – bývá to i vratná záloha,
//     poukázka nebo sleva na celý doklad. Proto se hlásí neutrálně
//     („chybí / přebývá"), ne jako „AI se spletla".
const RECEIPT_TOLERANCE = 1;

//  S22 (Milan): ÚČTENKA MÁ ČASTO DVĚ SPRÁVNÉ ČÁSTKY.
//    SOUČET 122,60  = součet položek
//    CELKEM 123,00  = co doopravdy odešlo z účtu (zaokrouhleno na koruny)
//  Obě jsou správně, jen odpovídají na jinou otázku. Transakce má být za to,
//  co bylo ZAPLACENO; položky sedí na SOUČET. Rozdíl do 1 Kč je zaokrouhlení
//  a NENÍ chyba – appka na něj nesmí křičet.
//  Porovnávat se proto musí proti `subtotal` (je-li natištěn), ne proti `total`.
function receiptCompleteness(r){
  //  Porovnává se proti tomu, co bylo NATIŠTĚNO (printedTotal), ne proti
  //  průběžnému r.total – ten se mění s každou úpravou položek, takže by se
  //  porovnávaly dvě čísla odvozená ze stejného zdroje a nikdy by nenesedla.
  const total = parseFloat(r && (r.printedTotal != null ? r.printedTotal : r.total)) || 0;
  const items = (r && r.items) || [];
  if(!total || !items.length) return null;          // bez jednoho z čísel nelze porovnat
  const sub = (r && r.subtotal != null && parseFloat(r.subtotal)) || null;
  const proti = sub || total;                       // s čím se porovnávají položky
  const sum = items.reduce((a,it)=>a + (typeof lineAmt==='function' ? lineAmt(it)
              : (it.lineTotal != null ? it.lineTotal : (it.price||0)*(it.qty||1))), 0);
  const diff = Math.round((proti - sum) * 100) / 100;
  const zaokrouhleni = sub ? Math.round((total - sub) * 100) / 100 : 0;
  if(Math.abs(diff) <= RECEIPT_TOLERANCE)
    return { ok:true, diff:0, sum, total, subtotal:sub, zaokrouhleni };
  return { ok:false, diff, sum, total, subtotal:sub, zaokrouhleni, chybi: diff > 0 };
}
window.receiptCompleteness = receiptCompleteness;

function buildHistoryTab(receipts) {
  receipts = receipts || S.receipts || [];
  let html = '<div id="utab-history-content" style="display:none">';

  if(!receipts.length) {
    html += '<div class="card"><div class="card-body"><div class="empty"><div class="ei">📋</div><div class="et">Žádné naskenované účtenky</div></div></div></div>';
    return html+'</div>';
  }

  // Seřadit dle data (nejnovější první)
  const sorted = [...receipts].map((r,i)=>({...r,_origIdx:i}))
    .sort((a,b)=>(b.date||'').localeCompare(a.date||''));

  // TODO-226: souhrn nekompletních účtenek – ať je uživatel nemusí hledat proklikáváním
  const _neuplne = sorted.map(r=>({r, c:receiptCompleteness(r)})).filter(x=>x.c && !x.c.ok);
  if(_neuplne.length){
    const _celk = _neuplne.reduce((a,x)=>a+Math.abs(x.c.diff),0);
    html += `<div style="background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.3);border-radius:10px;padding:11px 13px;margin-bottom:10px;font-size:.8rem;color:#c9cede;line-height:1.65">
      ⚠️ U <strong style="color:var(--debt)">${_neuplne.length}</strong> ${_neuplne.length===1?'účtenky':'účtenek'}
      nesedí součet položek se sumou na dokladu, dohromady o <strong style="color:var(--debt)">${fmtB(Math.round(_celk))}</strong>.
      <div style="font-size:.74rem;color:#a8aec8;margin-top:4px">
        Nejčastěji to znamená, že AI položku přehlédla — otevři účtenku tlačítkem <strong style="color:#c9cede">✎</strong> a chybějící řádek doplň.
        Může jít ale i o vratnou zálohu, poukázku nebo slevu na celý doklad; pak je rozdíl v pořádku.
      </div>
    </div>`;
  }

  // Unikátní názvy obchodů pro filtr
  const storeNames = [...new Set(sorted.map(r=>r.store||'Neznámý').filter(Boolean))].sort();

  html += `<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
    <!-- Filtr obchodu -->
    <select id="histStoreFilter" onchange="filterHistory()" style="flex:1;min-width:120px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:5px 8px;font-size:.76rem;color:var(--text2)">
      <option value="">🏪 Všechny obchody</option>
      ${storeNames.map(s=>`<option value="${s}">${s}</option>`).join('')}
    </select>
    <!-- Řazení -->
    <select id="histSortOrder" onchange="filterHistory()" style="flex:0 0 auto;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:5px 8px;font-size:.76rem;color:var(--text2)">
      <option value="date-desc">📅 Nejnovější</option>
      <option value="date-asc">📅 Nejstarší</option>
      <option value="total-desc">💰 Nejvyšší</option>
      <option value="total-asc">💰 Nejnižší</option>
    </select>
    <div style="font-size:.78rem;color:var(--text2);font-weight:500;flex-shrink:0">${receipts.length} účtenek</div>
    <div style="display:flex;gap:4px;flex-shrink:0">
      <button class="btn btn-ghost btn-sm" onclick="exportReceiptsCSV()">📊</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--expense)" onclick="deleteAllReceipts()">🗑️</button>
    </div>
  </div>
  <div id="histList">`;

  const D = getData();
  sorted.forEach(r => {
    const idx = r._origIdx;
    const catGroups = {};
    (r.items||[]).forEach(it=>{
      const cat=(D.categories||[]).find(c=>c.id===it.itemCatId);
      const k=cat?.name||'Ostatní';
      if(!catGroups[k])catGroups[k]={icon:cat?.icon||'📦',color:cat?.color||'#6b7280',total:0};
      catGroups[k].total+=lineAmt(it);
    });
    const catTags = Object.entries(catGroups).map(([n,v])=>
      `<span style="font-size:.66rem;padding:1px 6px;background:rgba(236,72,153,.12);border:1px solid rgba(236,72,153,.35);border-radius:8px;color:var(--text2);white-space:nowrap">${v.icon} ${n} ${Math.round(v.total)} Kč</span>`
    ).join('');

    html += `<div class="card hist-row" data-store="${(r.store||'').toLowerCase()}" data-date="${r.date||''}" data-total="${r.total||0}" style="margin-bottom:6px;overflow:hidden">
      <div style="padding:10px 12px">
        <!-- Horní řádek: datum + obchod + částka + akce -->
        <div style="display:flex;align-items:center;gap:8px">
          <div style="font-size:.72rem;font-weight:700;color:var(--bank);flex-shrink:0">${r.date||'–'}</div>
          <div style="font-size:.84rem;font-weight:700;color:var(--text);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.store||'Neznámý obchod'}</div>
          <div style="flex-shrink:0;text-align:right">
            <div style="font-family:Syne,sans-serif;font-size:.88rem;font-weight:800;color:var(--expense);white-space:nowrap">${(r.total||0).toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})} Kč</div>
            ${receiptSavings(r)>0?`<div style="font-size:.64rem;color:var(--income);white-space:nowrap">💸 ušetřeno ${fmtP(receiptSavings(r))} Kč</div>`:''}
          </div>
          <button class="btn btn-edit btn-icon btn-sm" style="flex-shrink:0" onclick="editReceiptFromHistory(${idx})" title="Upravit">✎</button>
          <button class="btn btn-danger btn-icon btn-sm" style="flex-shrink:0" onclick="deleteReceipt(${idx})">✕</button>
        </div>
        <!-- Dolní řádek: kategorie tagy přes celou šířku -->
        ${catTags?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">${catTags}</div>`:''}
      </div>
      <!-- Inline editor slot -->
      <div id="rcpt_hist_${idx}" style="display:none;border-top:2px solid var(--accent);padding:14px;background:var(--surface2)">
      </div>
    </div>`;
  });

  html += '</div></div>';
  return html;
}

// Filtrování a řazení v historii
function filterHistory() {
  const storeFilter = (document.getElementById('histStoreFilter')?.value||'').toLowerCase();
  const sortOrder = document.getElementById('histSortOrder')?.value||'date-desc';
  const rows = document.querySelectorAll('.hist-row');
  const arr = [...rows];

  // Skryj/zobraz dle filtru
  arr.forEach(row => {
    const store = row.dataset.store||'';
    row.style.display = (!storeFilter || store.includes(storeFilter)) ? '' : 'none';
  });

  // Řazení
  const list = document.getElementById('histList');
  if(!list) return;
  const visible = arr.filter(r=>r.style.display!=='none');
  visible.sort((a,b) => {
    const [field, dir] = sortOrder.split('-');
    const va = field==='date' ? (a.dataset.date||'') : parseFloat(a.dataset.total||0);
    const vb = field==='date' ? (b.dataset.date||'') : parseFloat(b.dataset.total||0);
    return dir==='desc' ? (vb>va?1:-1) : (va>vb?1:-1);
  });
  visible.forEach(r => list.appendChild(r));
}

// ── Analýza účtenek – stav záložky ──
let _activeUctenkyTab = 'scan'; // výchozí záložka

function toggleHistGroup(id) {
  const el = document.getElementById(id);
  const arrow = document.getElementById(id+'_arrow');
  const bar = document.getElementById(id+'_bar');
  if(!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  if(bar) bar.style.display = isOpen ? 'none' : 'block';
  if(arrow) arrow.style.transform = isOpen ? '' : 'rotate(90deg)';
}

function toggleHistReceipt(id) {
  const el = document.getElementById(id);
  const arrow = document.getElementById(id+'_arrow');
  if(!el) return;
  const isOpen = el.style.display !== 'none';
  el.style.display = isOpen ? 'none' : 'block';
  if(arrow) arrow.style.transform = isOpen ? '' : 'rotate(90deg)';
  // Zabrání scroll eventu aby zavřel expand na mobilu
  if(!isOpen && el.parentElement) {
    el.parentElement.style.scrollSnapStop = 'always';
  }
}

//  S24 (v11.16, Milan): Free = 3 skeny měsíčně + Skenovat / Učení / Mapa položek /
//  Historie. Nástroje nad účtenkami jsou Premium (💎). Limit skenů hlídá worker
//  (AI_LIMITS.free.receipt = 3), tady je jen zobrazení a brána záložek.
const UCTENKY_PREMIUM_TABS = ['stats','compare','trend','prices','discounts','doklady','stores','polstat'];
const UCTENKY_FREE_SKENY = 3;
function uctenkyMaPremium() { return typeof hasPremiumAccess !== 'function' || hasPremiumAccess(); }
function _utDia() { return uctenkyMaPremium() ? '' : ' <span style="font-size:.62rem" title="Premium">💎</span>'; }
window.uctenkyMaPremium = uctenkyMaPremium;

//  Kolik skenů zbývá (čte users/{uid}/aiUsage/{YYYY-MM}.receipt – zapisuje worker).
async function uctenkyKvotaObnov() {
  const el = document.getElementById('uctenkyKvota'); if (!el) return;
  if (uctenkyMaPremium()) { el.innerHTML = ''; return; }
  let pouzito = 0;
  try {
    const uid = window._currentUser?.uid; const t = await window._currentUser?.getIdToken?.();
    if (uid && t) {
      const r = await fetch(`https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users/${uid}/aiUsage/${new Date().toISOString().slice(0, 7)}/receipt.json?auth=${t}`);
      pouzito = (r.ok ? await r.json() : 0) || 0;
    }
  } catch (e) {}
  const zbyva = Math.max(0, UCTENKY_FREE_SKENY - pouzito);
  const d = new Date(); const reset = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  el.innerHTML = `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:${zbyva ? 'rgba(96,165,250,.08)' : 'rgba(248,113,113,.08)'};border:1px solid ${zbyva ? 'rgba(96,165,250,.3)' : 'rgba(248,113,113,.35)'};border-radius:10px;padding:9px 12px;margin-bottom:12px;font-size:.78rem;line-height:1.45">
      <span style="flex:1;min-width:200px">${zbyva ? `🆓 Zdarma ti tento měsíc zbývají <b>${zbyva} ze ${UCTENKY_FREE_SKENY}</b> skenů účtenek.` : `🆓 Tento měsíc máš <b>všechny ${UCTENKY_FREE_SKENY} skeny</b> zdarma vyčerpané – další od ${reset.getDate()}. ${reset.getMonth() + 1}.`}
        <span style="color:#a8aec8">S 💎 Premium neomezeně a se všemi nástroji (Zdražování, Srovnání s ČR, Trend…).</span></span>
      <button class="btn btn-sm" onclick="if(typeof showPaywall==='function')showPaywall()">💎 Premium</button></div>`;
}
window.uctenkyKvotaObnov = uctenkyKvotaObnov;

function switchUctenkyTab(tab, btn) {
  if (UCTENKY_PREMIUM_TABS.includes(tab) && !uctenkyMaPremium()) {
    if (btn) { if (typeof showPaywall === 'function') showPaywall(); return; }
    tab = 'scan';                        // obnovení po překreslení: zamčená záložka → Skenovat
  }
  _activeUctenkyTab = tab;
  // FIX (S12.1m): opouštíme záložku → zavři editor účtenky a vyčisti stav
  window._receiptEditorOpen = false;
  window._editReceipt = null;
  ['scan','learn','mapa','vyrobky','polstat','stats','compare','trend','prices','discounts','doklady','stores','history'].forEach(t=>{
    const c=document.getElementById('utab-'+t+'-content');
    const b=document.getElementById('utab-'+t);
    if(c)c.style.display='none';
    if(b)b.classList.remove('active');
  });
  const content=document.getElementById('utab-'+tab+'-content');
  if(content)content.style.display='block';
  //  S23 (TODO-304): náhledy dokladů se stahují z R2 až při otevření záložky,
  //  ne při každém vykreslení Analýzy účtenek.
  if(tab==='doklady' && typeof dokladyNactiNahledy==='function') dokladyNactiNahledy();
  if(tab==='doklady' && typeof dokladyPocitadlo==='function') dokladyPocitadlo();   // S25 v11.50
  //  S25 (v11.55): 📦 Moje výrobky – názvy, spojení se zkratkami a karty výrobků se dotáhnou při otevření
  if(tab==='vyrobky' && typeof eanMojeVyrobkyKresli==='function') {
    eanMojeVyrobkyKresli();
    Promise.all([
      typeof eanNactiMojeNazvy==='function' ? eanNactiMojeNazvy() : null,
      typeof eanNactiAliasy==='function' ? eanNactiAliasy() : null,
    ]).then(()=>eanMojeVyrobkyKresli()).catch(()=>{});
  }
  //  S24: komunitní mapa se dotáhne při otevření (když ještě není) a seznam se překreslí.
  if(tab==='mapa' && typeof loadProductMap==='function') Promise.all([
    loadProductMap(),
    typeof loadTaxonomie==='function' ? loadTaxonomie() : null,
    typeof loadTaxRozpocet==='function' ? loadTaxRozpocet() : null,
    typeof eanNactiAliasy==='function' ? eanNactiAliasy() : null,
    typeof eanNactiMojeNazvy==='function' ? eanNactiMojeNazvy() : null,
    typeof loadCoicop==='function' ? loadCoicop() : null,   // S25: číselník CZ-COICOP
    typeof loadProductDB==='function' ? loadProductDB() : null,   // S25: váhy koše ČSÚ na kartě
  ]).then(async ()=>{
    mapaUzivKresli();
    if (typeof eanNaskenovaneKresli === 'function') eanNaskenovaneKresli();   // S25
    //  v11.23: dotáhnout výrobky k čárovým kódům (český název + zařazení) a překreslit.
    if(typeof eanNactiVse==='function') { const n = await eanNactiVse(_mapaUziv.map(z=>z.ean)); if(n) mapaUzivKresli(); }
  }).catch(()=>mapaUzivKresli());
  //  S25: Statistika položek – zařazení potřebuje taxonomii, komunitní mapu a produktovou DB ČSÚ
  if(tab==='polstat' && typeof spRender==='function') {
    spRender();
    Promise.all([
      typeof loadProductMap==='function' ? loadProductMap() : null,
      typeof loadTaxonomie==='function' ? loadTaxonomie() : null,
      typeof loadProductDB==='function' ? loadProductDB() : null,
      typeof loadCoicop==='function' ? loadCoicop() : null,
    ]).then(()=>{ _mapaUziv = mapaUzivData(_mapaUzivReceipts); spRender(); }).catch(()=>spRender());
  }
  const button = btn || document.getElementById('utab-'+tab);
  if(button)button.classList.add('active');
}

// ══════════════════════════════════════════════════════
//  S24 (TODO-312 + TODO-313, PLAN-mapa-produktu F3): MAPA POLOŽEK PRO UŽIVATELE
//  cesta: Účtenky → 🗺️ Mapa položek
//  Jen uživatelovy položky (z jeho účtenek). U každé: co o ní ví komunitní
//  mapa (obecný → konkrétní název, návrh kategorie) a jak ji zařazuje on.
//  Změna tady = jeho volba (categoryMappings, zdroj 'uzivatel'), platí pro
//  DALŠÍ účtenky. Staré účtenky se nepřepisují (mapa je vyhledávací vrstva,
//  ne přepis dat – PLAN, „Dopad na stávající funkce").
// ══════════════════════════════════════════════════════
let _mapaUziv = [];                                 // agregované položky
let _mapaUzivReceipts = [];                         // účtenky bez duplicit (jako ostatní záložky)
let _mapaUzivFiltr = { stav:'vse', hledat:'', oblast:'' };
const MAPA_UZIV_LIMIT = 150;

//  Čistý výpočet (bez DOM) – testuje se zvlášť.
function mapaUzivData(receipts, D) {
  D = D || getData();
  const podle = {};
  (receipts||[]).forEach(r => (r.items||[]).forEach(it => {
    const nazev = String(it.name||'').trim();
    const k = (typeof normName==='function') ? normName(nazev) : nazev.toLowerCase();
    if(!k || k.length < 2) return;
    const d = r.date || '';
    const z = podle[k] || (podle[k] = { klic:k, nazev, pocet:0, datum:'', catId:'', subcat:'', nakupy:[], ean:'', _eanD:'' });
    z.pocet++;
    //  S24 (v11.09): nákupy pro kartu výrobku – obchod, cena, zkratka, kód.
    z.nakupy.push({ obchod: r.store||'', datum: d, cena: parseFloat(it.price)||0, qty: parseFloat(it.qty)||1,
                    unit: it.unit||'', raw: nazev, ean: it.ean||'', baleni: it.baleni || null,
                    mesto: r.storeCity || '', kraj: r.storeRegion || '' });   // S25: pobočka
    if(it.baleni && d >= (z._balD||'')) { z.baleni = it.baleni; z._balD = d; }   // S25: gramáž zvlášť
    if(it.ean && d >= z._eanD) { z.ean = it.ean; z._eanD = d; }
    if(d >= z.datum) { z.datum = d; z.nazev = nazev; z.catId = it.itemCatId||''; z.subcat = it.itemSubcat||''; }
  }));
  const nk = (typeof rpNakupCat==='function') ? rpNakupCat(D) : null;
  return Object.values(podle).map(z => {
    const osobniZaznam = (typeof lookupCategoryMapping==='function') ? lookupCategoryMapping(z.nazev) : null;
    const osobni = rpOsobniVolba(osobniZaznam, D);
    //  v11.23: kód z položky nebo z vlastního spojení obchod+zkratka → výrobek → taxonomie.
    let eanZ = z.ean;
    if(!eanZ && typeof eanAliasPro === 'function') { for(const n of z.nakupy) { eanZ = eanAliasPro(n.obchod, n.raw); if(eanZ) break; } }
    const mapa = rpMapaNavrh(z.nazev, D, eanZ);
    let catId, subcat, stav;
    if(osobni) {
      catId = osobni.id; stav = 'moje';
      subcat = (osobniZaznam.subcat && (osobni.subs||[]).includes(osobniZaznam.subcat)) ? osobniZaznam.subcat : '';
    } else if(mapa && mapa.catId) {
      catId = mapa.catId; subcat = mapa.subcat; stav = 'mapa';
    } else {
      catId = z.catId; subcat = z.subcat; stav = 'odhad';
    }
    if(stav !== 'moje' && (!catId || (nk && catId === nk.id))) stav = 'nezarazeno';
    const lisiSe = !!(osobni && mapa && mapa.catId && mapa.catId !== osobni.id);
    //  Kód: z položky účtenky, jinak z vlastního spojení „obchod + zkratka → EAN".
    const ean = eanZ;
    z.nakupy.sort((a,b) => (b.datum||'').localeCompare(a.datum||''));
    const baleni = z.baleni || (typeof baleniZNazvu === 'function' ? baleniZNazvu(z.nazev) : null);
    return { ...z, ean, baleni, catId, subcat, stav, mapa, lisiSe, maOsobni: !!osobniZaznam, tax: (mapa && mapa.tax) || null };
  }).sort((a,b) => b.pocet - a.pocet || a.nazev.localeCompare(b.nazev, 'cs'));
}
window.mapaUzivData = mapaUzivData;

//  Statistika taxonomie nad uživatelovými položkami (čistá funkce).
function mapaUzivStatistiky(seznam) {
  const s = seznam || [];
  const obl = {}, pod = new Set(), obec = new Set(), obch = new Set();
  let vTax = 0, sKodem = 0;
  s.forEach(z => {
    if(z.tax) {
      vTax++; pod.add(z.tax.podId); obec.add(z.tax.id);
      const o = obl[z.tax.oblastId] || (obl[z.tax.oblastId] = { id:z.tax.oblastId, nazev:z.tax.oblastNazev, ikona:z.tax.ikona, pocet:0 });
      o.pocet++;
    }
    if(z.ean) sKodem++;
    (z.nakupy||[]).forEach(n => { const o = (typeof normalizeStoreName==='function') ? normalizeStoreName(n.obchod) : n.obchod; if(o) obch.add(String(o).toLowerCase()); });
  });
  return { polozek: s.length, vTax, mimo: s.length - vTax, pct: s.length ? Math.round(vTax / s.length * 100) : 0,
    oblasti: Object.values(obl).sort((a,b) => b.pocet - a.pocet), podkategorii: pod.size, obecnych: obec.size,
    obchodu: obch.size, sKodem };
}
window.mapaUzivStatistiky = mapaUzivStatistiky;

function mapaUzivFiltruj(seznam, f) {
  const q = (typeof normName==='function') ? normName(f.hledat||'') : String(f.hledat||'').toLowerCase();
  return seznam.filter(z => {
    //  S24 (T3): 'tax' / 'mimo' = v taxonomii / mimo ni; ostatní = stav rozpočtové kategorie.
    if(f.stav === 'tax') { if(!z.tax) return false; }
    else if(f.stav === 'mimo') { if(z.tax) return false; }
    else if(f.stav === 'bezkodu') { if(z.ean) return false; }
    else if(f.stav !== 'vse' && z.stav !== f.stav) return false;
    if(f.oblast && (!z.tax || z.tax.oblastId !== f.oblast)) return false;
    if(!q) return true;
    const kde = [z.klic, z.mapa?.obecny, z.mapa?.konkretni, z.tax?.podNazev, z.tax?.oblastNazev].filter(Boolean)
      .map(t => (typeof normName==='function') ? normName(t) : String(t).toLowerCase()).join(' ');
    return kde.includes(q);
  });
}
window.mapaUzivFiltruj = mapaUzivFiltruj;

function mapaUzivPocty() {
  const p = { vse:_mapaUziv.length, tax:0, mimo:0, moje:0, bezkodu:0 };
  _mapaUziv.forEach(z => { if(z.tax) p.tax++; else p.mimo++; if(z.stav==='moje') p.moje++; if(!z.ean) p.bezkodu++; });
  return p;
}

const _mapaVelke = t => { t = String(t||''); return t.charAt(0).toLocaleUpperCase('cs') + t.slice(1); };
const _mapaKc = v => (Math.round(v*100)/100).toLocaleString('cs-CZ', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' Kč';

function buildMapaTab(receipts) {
  _mapaUzivReceipts = receipts || [];
  _mapaUziv = mapaUzivData(receipts);
  if(!['vse','tax','mimo','moje','bezkodu'].includes(_mapaUzivFiltr.stav)) _mapaUzivFiltr.stav = 'vse';
  return `<div id="utab-mapa-content" style="display:none">
    <div class="card"><div class="card-body">
      <div style="font-weight:700;font-size:.95rem;margin-bottom:4px">🗺️ Mapa položek</div>
      <div style="font-size:.76rem;color:#a8aec8;line-height:1.5;margin-bottom:12px">
        Co doopravdy kupuješ: každá položka z účtenek zařazená do <b style="color:var(--text)">taxonomie výrobků</b>. Podle ní se počítají statistiky, zdražování a inflace. Klepni na položku pro kartu s podrobnostmi.
      </div>
      ${_mapaUziv.length ? `
      <div id="mapaUzivStat">${mapaUzivStatHTML()}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 8px" id="mapaUzivFiltry">${mapaUzivFiltryHTML()}</div>
      <input id="mapaUzivHledat" type="search" placeholder="🔍 Hledat výrobek, obecný název nebo podkategorii…" value="${escHtml(_mapaUzivFiltr.hledat)}"
        oninput="mapaUzivHledej(this.value)" autocomplete="off"
        style="width:100%;box-sizing:border-box;background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-size:.82rem;margin-bottom:10px">
      <div id="mapaUzivSeznam">${mapaUzivSeznamHTML()}</div>
      <div id="mapaPrerazeni" style="margin-top:14px">${mapaPrerazeniTlacitko()}</div>
      <div id="mapaUzivPrevod" style="margin-top:14px"></div>`
      : `<div class="empty"><div class="ei">🗺️</div><div class="et">Zatím žádné položky</div>
         <div style="font-size:.76rem;color:#a8aec8;margin-top:6px">Naskenuj účtenku a položky se tu objeví.</div></div>`}
    </div></div></div>`;
}

function mapaUzivStatHTML() {
  const st = mapaUzivStatistiky(_mapaUziv);
  const tax = (typeof taxData === 'function' && taxData()) || null;
  const celkPod = tax ? tax.oblasti.reduce((a,o) => a + o.podkategorie.length, 0) : 0;
  const celkObec = (typeof taxSeznam === 'function') ? taxSeznam().length : 0;
  const dl = (l, v, p) => `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:9px 11px">
      <div style="font-size:.66rem;color:#a8aec8">${l}</div>
      <div style="font-size:1.15rem;font-weight:800;color:var(--text)">${v}</div>
      ${p ? `<div style="font-size:.62rem;color:#8b93ad">${p}</div>` : ''}</div>`;
  const chip = o => `<button class="tx-filt-btn${_mapaUzivFiltr.oblast===o.id?' active':''}" onclick="mapaUzivOblast('${escHtml(o.id)}')">${typeof ffIkonaOblasti === 'function' ? ffIkonaOblasti(o.id, 15) + ' ' + escHtml(o.nazev) : escHtml(o.ikona+' '+o.nazev)} <span style="opacity:.7">${o.pocet}</span></button>`;
  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:.8rem;margin-bottom:6px">
        <span style="color:var(--text);font-weight:700">🧭 V taxonomii ${st.vTax} z ${st.polozek}</span>
        <span style="color:${st.pct>=80?'var(--income)':st.pct>=50?'#fbbf24':'#f87171'};font-weight:700">${st.pct} %</span></div>
      <div style="height:8px;border-radius:4px;background:var(--border);overflow:hidden"><div style="width:${st.pct}%;height:100%;background:linear-gradient(90deg,#60a5fa,#34d399)"></div></div>
      <div style="font-size:.68rem;color:#a8aec8;margin-top:5px">${st.mimo ? st.mimo + ' položek zatím čeká na zařazení' : 'Všechno zařazeno 🎉'}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:8px;margin-bottom:10px">
      ${dl('Obecné názvy', st.obecnych, celkObec ? 'z ' + celkObec + ' v taxonomii' : '')}
      ${dl('Podkategorie', st.podkategorii, celkPod ? 'z ' + celkPod : '')}
      ${dl('Oblasti', st.oblasti.length, 'z 13')}
      ${dl('Obchody', st.obchodu, '')}
      ${dl('S čárovým kódem', st.sKodem, st.polozek ? Math.round(st.sKodem/st.polozek*100) + ' %' : '')}
    </div>
    ${st.oblasti.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${_mapaUzivFiltr.oblast ? `<button class="tx-filt-btn" onclick="mapaUzivOblast('')">✕ Všechny oblasti</button>` : ''}${st.oblasti.map(chip).join('')}</div>` : ''}`;
}

function mapaUzivFiltryHTML() {
  const p = mapaUzivPocty();
  return [['vse','Vše'],['tax','🧭 V taxonomii'],['mimo','📦 Mimo taxonomii'],['bezkodu','📷 Bez kódu'],['moje','✋ Moje volby']].map(([id,t]) =>
    `<button class="tx-filt-btn${_mapaUzivFiltr.stav===id?' active':''}" onclick="mapaUzivStav('${id}')">${t} <span style="opacity:.7">${p[id]}</span></button>`).join('');
}

//  Převodní tabulka: jen podkategorie, které se v uživatelových položkách
//  opravdu vyskytují (ne všech 139). Výchozí hodnota = kategorie z taxonomie.
function mapaUzivPrevodData(seznam, D) {
  D = D || getData();
  const pods = {};
  (seznam||[]).forEach(z => {
    if(!z.tax) return;
    const p = pods[z.tax.podId] || (pods[z.tax.podId] = { podId:z.tax.podId, nazev:z.tax.podNazev, ikona:z.tax.ikona, oblastId:z.tax.oblastId, oblast:z.tax.oblastNazev, vychozi:z.tax.rozpocet, polozek:0 });
    p.polozek++;
  });
  return Object.values(pods).map(p => ({ ...p,
    vlastni: (typeof taxRozpocetUzivatel === 'function') ? taxRozpocetUzivatel(p.podId) : '',
    vychoziKat: (D.categories||[]).find(c => c.id === p.vychozi) || null,
  })).sort((a,b) => a.oblast.localeCompare(b.oblast,'cs') || b.polozek - a.polozek);
}
window.mapaUzivPrevodData = mapaUzivPrevodData;

function mapaUzivPrevodHTML() {
  const D = getData();
  const radky = mapaUzivPrevodData(_mapaUziv, D);
  if(!radky.length) return '';
  const cats = (D.categories||[]).filter(c=>c.type==='expense'||c.type==='both'||!c.type);
  const upraveno = radky.filter(r => r.vlastni).length;
  return `<details style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:8px 10px">
    <summary style="cursor:pointer;font-size:.8rem;font-weight:600;color:var(--text)">💼 Podkategorie → rozpočet <span style="font-weight:400;color:#a8aec8">· ${radky.length} podkategorií${upraveno ? ' · ' + upraveno + ' upraveno' : ''}</span></summary>
    <div style="font-size:.7rem;color:#a8aec8;margin:6px 0 4px">Kam se položky z dané podkategorie započítají v rozpočtu. „Výchozí" = návrh taxonomie.</div>
    ${radky.map(r => `<div style="display:flex;gap:8px;align-items:center;padding:5px 0;border-top:1px solid var(--border);flex-wrap:wrap">
        <span style="flex:1;min-width:150px;font-size:.78rem;color:var(--text)">${typeof ffIkonaTax === 'function' ? rpIkTax(r, 16) + ' ' + escHtml(r.nazev) : escHtml(r.ikona+' '+r.nazev)} <span style="color:#a8aec8;font-size:.68rem">· ${r.polozek}×</span></span>
        <select data-pod="${escHtml(r.podId)}" onchange="mapaUzivPrevod(this.getAttribute('data-pod'),this.value)"
          style="background:var(--bg);border:1px solid ${r.vlastni?'var(--income)':'var(--border)'};border-radius:7px;padding:5px 4px;color:var(--text);font-size:.72rem;max-width:190px">
          <option value="">Výchozí: ${escHtml(r.vychoziKat ? (r.vychoziKat.icon||'')+' '+r.vychoziKat.name : '—')}</option>
          ${cats.map(c=>`<option value="${escHtml(c.id)}"${c.id===r.vlastni?' selected':''}>${escHtml((c.icon||'')+' '+c.name)}</option>`).join('')}
        </select>
      </div>`).join('')}
  </details>`;
}

//  Seznam: taxonomie je hlavní informace (velký titulek), rozpočet je v kartě.
function mapaUzivSeznamHTML() {
  const vyber = mapaUzivFiltruj(_mapaUziv, _mapaUzivFiltr);
  if(!vyber.length) return '<div style="font-size:.78rem;color:#a8aec8;padding:10px 0">Nic neodpovídá filtru.</div>';
  const radky = vyber.slice(0, MAPA_UZIV_LIMIT).map(z => {
    const i = _mapaUziv.indexOf(z);
    const _lk = mapaKartaLok(z);   // v11.60: název opsaný z obalu má přednost
    const titul = _lk.nazevPopisek || _lk.nazevObal || (z.tax ? _mapaVelke(z.tax.nazev) : z.nazev);
    const podtitul = z.tax
      ? escHtml(typeof ffIkonaDlazdice === 'function' ? [z.tax.oblastNazev, z.tax.podNazev, z.tax.nazev].join(' › ') : rpTaxRetez(z.mapa)) + (z.mapa.zdrojTax==='nazev' ? ' <span style="font-size:.64rem;color:#8b93ad">(podle názvu)</span>' : z.mapa.zdrojTax==='ean' ? ' <span style="font-size:.64rem;color:#8b93ad">(podle kódu)</span>' : '')
      : (z.mapa && (z.mapa.obecny || z.mapa.konkretni)) ? '🗺️ ' + escHtml([z.mapa.obecny, z.mapa.konkretni].filter(Boolean).join(' → '))
      : '<span style="color:#8b93ad">Zatím mimo taxonomii – zařadí ji admin v komunitní mapě.</span>';
    return `<div onclick="mapaUzivDetail(${i})" role="button" tabindex="0"
      style="display:flex;gap:10px;align-items:center;padding:10px 11px;border:1px solid var(--border);border-radius:11px;margin-bottom:6px;background:var(--surface2);cursor:pointer">
      ${rpIkDlazdice(z.tax, 38, 22, 'width:36px;height:36px;border-radius:10px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0')}
      <div style="flex:1;min-width:0">
        <div style="font-size:.95rem;font-weight:700;color:var(--text);overflow-wrap:anywhere">${escHtml(titul)}</div>
        <div style="font-size:.76rem;color:#c3c8dc;margin-top:1px">${podtitul}</div>
        ${z.tax ? `<div style="font-size:.68rem;color:#8b93ad;margin-top:1px;overflow-wrap:anywhere">${escHtml(z.nazev)}${z.mapa.konkretni ? ' · ' + escHtml(z.mapa.konkretni) : ''}</div>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:.72rem;color:#a8aec8">${z.pocet}×</div>
        ${z.ean ? '<div title="Má čárový kód" style="font-size:.68rem;color:var(--income)">▮▮ kód</div>' : ''}
      </div>
      <span style="color:#8b93ad">›</span>
    </div>`;
  }).join('');
  const zbytek = vyber.length > MAPA_UZIV_LIMIT
    ? `<div style="font-size:.74rem;color:#a8aec8;padding:10px 0">Zobrazeno ${MAPA_UZIV_LIMIT} z ${vyber.length} – zúž výběr hledáním.</div>` : '';
  return radky + zbytek;
}

// ── KARTA VÝROBKU (S24, v11.09) ──
//  Klepnutí na položku. Identita (fotka, název, značka, gramáž, kód), zdraví
//  (Nutri-Score, NOVA, éčka, semafor živin), zařazení v taxonomii, vlastní
//  nákupy napříč obchody a až na konci rozpočet. Data o výrobku jen když má kód.
function mapaUzivCenaZaJednotku(n) {
  if(!n || !n.cena) return null;
  if(n.unit === 'kg' || n.unit === 'l') return { cena: n.cena, j: n.unit };
  if(n.qty && Math.abs(n.qty - Math.round(n.qty)) > 1e-9) return { cena: n.cena, j: 'kg' };   // S25: vážené zboží – cena je za kg
  //  S25: gramáž ze samostatného pole, jinak z názvu
  const b = n.baleni || ((typeof normQty === 'function') ? (q => q ? { m: q.hodnota, j: q.jednotka } : null)(normQty(n.raw)) : null);
  if(!b || !b.m) return null;
  if(b.j === 'g') return { cena: n.cena / b.m * 1000, j: 'kg' };
  if(b.j === 'ml') return { cena: n.cena / b.m * 1000, j: 'l' };
  return null;
}
window.mapaUzivCenaZaJednotku = mapaUzivCenaZaJednotku;

//  Poslední nákup v každém obchodě (čistá funkce).
function mapaUzivObchody(z) {
  const po = {};
  (z.nakupy||[]).forEach(n => {
    const o = ((typeof normalizeStoreName==='function') ? normalizeStoreName(n.obchod) : n.obchod) || 'Neznámý obchod';
    if(!po[o] || (n.datum||'') > (po[o].datum||'')) po[o] = { ...n, obchodNazev: o, jednotka: mapaUzivCenaZaJednotku(n) };
  });
  const s = Object.values(po).sort((a,b) => (a.cena||1e9) - (b.cena||1e9));
  return s;
}
window.mapaUzivObchody = mapaUzivObchody;

//  S25: štítek položky = poslední štítek, který má položka se stejným názvem na účtenkách
//  (uživatelův přepis má přednost), jinak štítek skupiny ČSÚ.
function mapaStitek(nazev, D) {
  const nn = (typeof normName === 'function') ? normName : (t => String(t || '').toLowerCase());
  const k = nn(nazev); let tag = '';
  ((D || S).receipts || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).some(r => (r.items || []).some(it => {
    if (it && it.tag && nn(it.name) === k) { tag = it.tag; return true; } return false; }));
  if (!tag && typeof productGroupLookup === 'function') { const g = productGroupLookup(nazev); if (g && g.tag) tag = g.tag; }   // v11.34: model ČSÚ
  return tag;
}
window.mapaStitek = mapaStitek;

//  S25: části karty podle návrhu produktového katalogu (čistá funkce – jen z existujících dat).
function mapaKartaKatalog(z, p, produkt, radek, gram) {
  const e = s => escHtml(String(s == null ? '' : s));
  const JAZ = { cs:'čeština', sk:'slovenština', en:'angličtina', de:'němčina', pl:'polština', hu:'maďarština', fr:'francouzština', it:'italština', es:'španělština', nl:'nizozemština', at:'němčina' };
  const fmtD = d => d ? String(d).split('-').reverse().join('. ') : '';
  // Názvy a aliasy
  const moje = z.ean && typeof _eanMojeNazvy !== 'undefined' && _eanMojeNazvy && _eanMojeNazvy[z.ean] && _eanMojeNazvy[z.ean].nazev;
  const cesky = p ? (moje || (p.nazevCesky ? p.nazev : (p.nazevCs || ''))) : '';
  const zdrojCz = moje ? 'tvůj název' : p && p.nazevCesky ? 'z databáze' : p && p.nazevCs ? 'návrh AI' : '';
  const aliasy = {};
  (z.nakupy || []).forEach(n => { const k = (n.raw || '').trim(); if (!k) return;
    const a = aliasy[k] || (aliasy[k] = { raw: k, obchody: new Set(), pocet: 0 }); a.pocet++;
    if (n.obchod) a.obchody.add(n.obchod + (n.mesto ? ' (' + n.mesto + ')' : '')); });   // S25: + město pobočky
  const al = Object.values(aliasy).sort((a, b) => b.pocet - a.pocet);
  //  S25 (krok 2): názvy ZVLÁŠŤ – originál, na obalu, český z databáze, AI překlad, tvůj; nahoře ten, který appka používá
  let nazvy = '';
  const sed = t => ` <span style="color:#a8aec8">${t}</span>`;
  if (cesky) nazvy += radek('Používá se', '<b>' + e(cesky) + '</b>' + (zdrojCz ? sed('· ' + zdrojCz) : ''));
  if (p && p.nazev && !p.nazevCesky) nazvy += radek('Originální název', e(p.nazev) + (p.jazyk && JAZ[p.jazyk] ? sed('(' + JAZ[p.jazyk] + ')') : ''));
  if (p && p.nazevObal) nazvy += radek('Název na obalu', e(p.nazevObal) + sed('· 📸 fotka'));
  if (p && p.nazevCesky && p.nazev) nazvy += radek('Český z databáze', e(p.nazev));
  if (p && p.nazevCs) nazvy += radek('Překlad AI', e(p.nazevCs) + (p.nazevCsZdroj === 'foto' ? sed('· z fotky obalu') : p.nazevCsZdroj === 'admin' ? sed('· schválil admin') : ''));
  if (moje) nazvy += radek('Tvůj název', e(moje));
  if (p && (p.nazvyJine || []).length) nazvy += radek('Jiné názvy', e(p.nazvyJine.join(' · ')));
  if (al.length) nazvy += `<div style="font-size:.72rem;color:#a8aec8;margin:6px 0 3px">Názvy z účtenek (aliasy)</div>` + al.map(a =>
    `<div style="display:flex;justify-content:space-between;gap:8px;font-size:.74rem;padding:2px 0"><span style="font-family:monospace;overflow-wrap:anywhere">${e(a.raw)}</span><span style="color:#a8aec8;white-space:nowrap">${e([...a.obchody].join(', '))}${a.pocet > 1 ? ' · ' + a.pocet + '×' : ''}</span></div>`).join('');
  // Výrobek a balení
  let vyr = '';
  if (gram) vyr += radek('Množství', e(gram) + sed(p && p.mnozstvi ? '· databáze' : '· z účtenky'));
  if (p) {
    if (p.znacka) vyr += radek('Značka', e(p.znacka));
    if (p.vyrobce) vyr += radek('Výrobce', e(p.vyrobce));
    if (p.konkretni || p.obecny) vyr += radek('Druh výrobku', e(p.konkretni || p.obecny));

    if ((p.obal || []).length) vyr += radek('Obal', e(p.obal.join(', ')));
    if (p.puvod) vyr += radek('Země původu', e(p.puvod));
    if ((p.zeme || []).length) vyr += radek('Prodává se v', e(p.zeme.join(', ')));
    if ((p.kategorie || []).length) vyr += radek('Kategorie (OFF)', `<span style="font-size:.72rem">${e(p.kategorie.slice(-3).join(' › '))}</span>`);
  }
  // Identifikace a zdroje
  let zdr = '';
  if (z.ean) zdr += radek('Kód (GTIN)', `<span style="font-family:monospace">${e(z.ean)}</span> <span style="color:#a8aec8">GTIN-${String(z.ean).length}</span>`);
  if (p && p.zdroj) zdr += radek('Zdroj údajů', e(p.zdroj) + (p.kdy ? ` <span style="color:#a8aec8">· načteno ${new Date(p.kdy).toLocaleDateString('cs-CZ')}</span>` : ''));
  if (p && (p.nutriceObal || p.nutrice)) zdr += radek('Živiny', p.nutriceObal ? (typeof eanZivinyZdroj === 'function' ? eanZivinyZdroj(p.nutriceObal) : '📸 fotka obalu') : 'databáze');
  if (p && (p.slozeniObal || p.slozeni)) zdr += radek('Složení', p.slozeniObal ? '📸 fotka obalu' : (p.slozeniCesky ? 'databáze (česky)' : 'databáze (nečesky)'));
  if (z.tax) zdr += radek('Zařazení', z.mapa && z.mapa.zdrojTax === 'ean' ? 'podle čárového kódu' : z.mapa && z.mapa.zdrojTax === 'nazev' ? 'podle názvu (odhad)' : 'komunitní mapa');
  const data = (z.nakupy || []).map(n => n.datum).filter(Boolean).sort();
  if (data.length) zdr += radek('Poprvé / naposledy', `${fmtD(data[0])} · ${fmtD(data[data.length - 1])}`);
  if (produkt && produkt.stav === 'nenalezeno') zdr += radek('Databáze', '<span style="color:#fbbf24">výrobek zatím nezná</span>');
  return { nazvy, vyrobek: vyr, zdroje: zdr };
}
window.mapaKartaKatalog = mapaKartaKatalog;

//  S25: kód CZ-COICOP v zápisu ČSÚ + název nejhlubší úrovně + cesta číselníkem
function mapaCoicopHTML(code) {
  if (typeof coicopCesta !== 'function') return escHtml(String(code || ''));
  const c = coicopCesta(code); const k = coicopNorm(code);
  if (!c.length) return escHtml(k);
  const posl = c[c.length - 1];
  return `<b>${escHtml(posl.kod)}</b> ${escHtml(posl.nazev)}`
    + (c.length > 1 ? `<div style="font-size:.64rem;color:#8b93ad;line-height:1.4;margin-top:2px">${c.slice(0, -1).map(x => escHtml(x.kod + ' ' + x.nazev)).join(' › ')}</div>` : '');
}
window.mapaCoicopHTML = mapaCoicopHTML;

//  S25 (Milan): koš ČSÚ jen jednou. Stejný kód jako COICOP (nebo jeho nadřazená úroveň) →
//  jen řádek s váhou; jiný kód → celé zařazení koše. Váha ‰ = kolik z každých 1000 Kč
//  výdajů průměrné domácnosti připadá na tuto skupinu (podíl v indexu inflace).
//  S25 (Milan): v řádku COICOP oficiální váha podtřídy z koše ČSÚ + TVŮJ podíl z účtenek.
//  Váha ČSÚ (‰) je ze VŠECH výdajů domácnosti, účtenky jsou hlavně potraviny – proto se
//  srovnává uvnitř stejného oddílu: kolik % útrat za potraviny jde na tuto podtřídu
//  u průměrné domácnosti (ČSÚ) a u tebe (účtenky za zvolené období, výchozí 12 měsíců).
function mapaVahaPodtridy(kod4) {
  if (typeof _productDB === 'undefined' || !_productDB || !_productDB.groups || typeof coicopNorm !== 'function') return null;
  const k = Object.keys(_productDB.groups).find(g => coicopNorm(g) === kod4);
  return k && _productDB.groups[k].w ? _productDB.groups[k].w : null;
}
function mapaVahaOddilu(odd) {
  if (typeof _productDB === 'undefined' || !_productDB || !_productDB.groups || typeof coicopNorm !== 'function') return null;
  const s = Object.entries(_productDB.groups).filter(([g]) => coicopNorm(g).startsWith(odd + '.')).reduce((a, [, x]) => a + (x.w || 0), 0);
  return s || null;
}
//  S25 (Milan): období pro „tvůj podíl" volitelné – výchozí posledních 12 měsíců (váhy ČSÚ jsou
//  roční, celý rok nezkreslí sezónnost), dál jednotlivé roky z účtenek nebo vše. Období je vidět na kartě.
let _mapaVahaObdobi = '12';
function mapaVahaRadky(D) {
  if (typeof spRadky !== 'function' || typeof _mapaUziv === 'undefined') return [];
  return spRadky(typeof _mapaUzivReceipts !== 'undefined' && _mapaUzivReceipts.length ? _mapaUzivReceipts : ((D || getData()).receipts || []), _mapaUziv, D || getData());
}
function mapaVahaRoky(r) { return [...new Set(r.map(x => String(x.mesic || '').slice(0, 4)).filter(y => /^\d{4}$/.test(y)))].sort().reverse(); }
function mapaVahaObdobiNazev(o) { return o === 'vse' ? 'celou dobu' : /^\d{4}$/.test(o) ? 'rok ' + o : o === '3' ? 'poslední 3 měsíce' : o === '6' ? 'posledních 6 měsíců' : 'posledních 12 měsíců'; }
function mapaMujPodil(kod4, D, obdobi) {   // {podtrida, oddil, pocet} v Kč z účtenek za zvolené období
  const o = obdobi || _mapaVahaObdobi;
  let r = mapaVahaRadky(D);
  r = mapaVyberObdobi(r, o);   // S25 (v11.56): 3 / 6 / 12 měsíců, rok, vše – jedno místo pro výběr období
  const odd = kod4.slice(0, 2);
  const sum = fn => r.filter(fn).reduce((a, x) => a + x.castka, 0);
  return { podtrida: sum(x => x.coicop && (x.coicop === kod4 || x.coicop.startsWith(kod4 + '.'))), oddil: sum(x => x.coicop && x.coicop.startsWith(odd + '.')) };
}
function mapaVahaObdobi(v) { _mapaVahaObdobi = v || '12'; if (typeof _mapaKartaI !== 'undefined' && _mapaKartaI >= 0 && typeof mapaUzivDetail === 'function') mapaUzivDetail(_mapaKartaI); }
window.mapaVahaObdobi = mapaVahaObdobi;
function mapaVahaHTML(code, D) {
  if (typeof coicopNorm !== 'function') return '';
  const kod4 = coicopNorm(code).split('.').slice(0, 4).join('.'); if (kod4.split('.').length < 4) return '';
  const odd = kod4.slice(0, 2);
  const w = mapaVahaPodtridy(kod4), wOdd = mapaVahaOddilu(odd), m = mapaMujPodil(kod4, D);
  if (w == null) return '';
  const f = v => (Math.round(v * 10) / 10).toLocaleString('cs-CZ');
  const kc = v => Math.round(v).toLocaleString('cs-CZ') + ' Kč';
  const csuPct = wOdd ? w / wOdd * 100 : null, mujPct = m && m.oddil > 0 ? m.podtrida / m.oddil * 100 : null;
  const oddN = ((typeof coicopNazev === 'function' && coicopNazev(odd)) || 'oddílu ' + odd).toLowerCase();
  const roky = mapaVahaRoky(mapaVahaRadky(D));
  const opt = [['12', 'posledních 12 měsíců'], ...roky.map(y => [y, 'rok ' + y]), ['vse', 'celá doba']];
  const sel = `<select onchange="mapaVahaObdobi(this.value)" style="font-size:.66rem;padding:1px 4px;background:#1a1f35;color:#e8eaf0;border:1px solid #2d3555;border-radius:6px">${opt.map(([v, n]) => `<option value="${v}"${v === _mapaVahaObdobi ? ' selected' : ''}>${escHtml(n)}</option>`).join('')}</select>`;
  return `<div style="font-size:.68rem;margin-top:3px;line-height:1.5" title="Váha ČSÚ: z každých 1 000 Kč všech výdajů průměrné domácnosti (stálé váhy spotřebního koše, podle nich se počítá inflace). Srovnání uvnitř oddílu: jaká část útrat za ${escHtml(oddN)} jde na tuto podtřídu – u průměrné domácnosti a u tebe.">
    <span style="color:#fbbf24">váha ČSÚ ${f(w)} ‰</span> <span style="color:#8b93ad">ze všech výdajů · podtřída ${escHtml(kod4)}</span>
    ${csuPct != null && mujPct != null ? `<br><span style="color:#8b93ad">z útrat za ${escHtml(oddN)}:</span> <span style="color:#fbbf24">průměr ${f(csuPct)} %</span> · <span style="color:#4ade80">ty ${f(mujPct)} %</span>
      <span style="color:${mujPct > csuPct * 1.25 ? '#f87171' : mujPct < csuPct * 0.8 ? '#4ade80' : '#a8aec8'}">(${mujPct >= csuPct ? '+' : ''}${Math.round((mujPct - csuPct) / csuPct * 100)} %)</span>
      <br><span style="color:#8b93ad">tvůj podíl: ${kc(m.podtrida)} z ${kc(m.oddil)} · počítá se z účtenek za ${escHtml(mapaVahaObdobiNazev(_mapaVahaObdobi))}</span>`
      : `<br><span style="color:#8b93ad">tvůj podíl: za ${escHtml(mapaVahaObdobiNazev(_mapaVahaObdobi))} nejsou účtenky z tohoto oddílu</span>`}
    <div style="margin-top:2px;color:#8b93ad">období: ${sel}</div></div>`;
}
window.mapaVahaHTML = mapaVahaHTML;

function mapaKosRadek(pg, taxKod, radek) {
  if (!pg || !pg.group) return '';
  const kod = typeof pgKodCsu === 'function' ? pgKodCsu(pg.code) : pg.code;
  const tk = taxKod && typeof coicopNorm === 'function' ? coicopNorm(taxKod) : '';
  const w = pg.w ? String(Math.round(pg.w * 100) / 100).replace('.', ',') : '';
  const vaha = w ? `<span title="Z každých 1 000 Kč výdajů průměrné domácnosti jde ${w} Kč na tuto skupinu – tak moc ovlivňuje inflaci.">${w} ‰</span>` : '';
  if (tk && (tk === kod || tk.startsWith(kod + '.'))) return vaha ? radek('Váha v koši ČSÚ', vaha + ` <span style="color:#a8aec8">· ${pg.w.toFixed(2).replace('.', ',')} Kč z každých 1 000 Kč útrat</span>`) : '';
  return radek('Spotřební koš ČSÚ', escHtml(kod + ' · ' + pg.group) + (vaha ? ` <span style="color:#a8aec8">· váha ${vaha}</span>` : ''));
}
window.mapaKosRadek = mapaKosRadek;

// ══════════════════════════════════════════════════════════════════════
//  S25 (v11.56, Milan: „karta je obsahově dobrá, ale pokulhává vizuálně – políčka přetékají,
//  číslování je namačkané, vyšší kategorie se schovávají pod COICOP, alias je tam několikrát“)
//  PŘESTAVBA KARTY VÝROBKU (cesta: Analýza účtenek → 🗺️ Mapa položek → klepnutí na položku).
//  · bloky v rámečcích, řádky „popisek | hodnota“ v mřížce – hodnota se zalomí, nepřeteče,
//  · VÝROBEK: EAN (nebo Naskenovat), český název, název z EAN (originál), značka,
//  · ZAŘAZENÍ: oblast → kategorie → obecný název → COICOP; hierarchie, váha ČSÚ a tvůj podíl
//    v rozbalovacím panelu s přepínačem období (3/6/12 měsíců, rok, vše) a základu
//    (výdaje za potraviny / všechny výdaje) – dřív se míchaly ‰ ze všech výdajů a % z potravin,
//  · NÁZVY Z ÚČTENEK: každý název jednou (VELKÁ/malá, diakritika i gramáž sloučené).
// ══════════════════════════════════════════════════════════════════════
//  S25 (v11.58, TODO-323): vlastní SVG ikony (js/ikony.js). Bez modulu zůstanou emoji.
function rpIk(id, px, barva) { return typeof ffIkona === 'function' ? ffIkona(id, px, barva ? { barva } : null) : ''; }
function rpIkTax(tax, px) {
  if (typeof ffIkonaTax !== 'function') return escHtml(tax ? tax.ikona : '📦');
  const k = ffIkonaTax(tax); return ffIkona(k.id, px, { barva: k.barva });
}
function rpIkDlazdice(tax, box, px, zalohaStyl) {
  if (typeof ffIkonaDlazdice === 'function') return ffIkonaDlazdice(tax, box, px);
  return `<div style="${zalohaStyl}">${escHtml(tax ? tax.ikona : '📦')}</div>`;
}
window.rpIk = rpIk; window.rpIkTax = rpIkTax; window.rpIkDlazdice = rpIkDlazdice;
function mkStyl() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function' || !document.head || document.getElementById('mkStyl')) return;
  const st = document.createElement('style'); st.id = 'mkStyl';
  st.textContent = `
    .mk-tit{font-size:.7rem;color:#60a5fa;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:16px 0 6px;display:flex;align-items:center;gap:7px}
    .mk-box{border:1px solid var(--border);border-radius:12px;background:var(--surface2);overflow:hidden}
    .mk-r{display:grid;grid-template-columns:minmax(92px,36%) minmax(0,1fr);gap:4px 12px;padding:8px 12px;font-size:.8rem;line-height:1.4;border-top:1px solid var(--border)}
    .mk-r:first-child{border-top:none}
    .mk-r>.l{color:#a8aec8}
    .mk-r>.v{color:var(--text);overflow-wrap:anywhere;min-width:0}
    .mk-sub{display:block;font-size:.68rem;color:#8b93ad;margin-top:1px}
    .mk-chip{display:inline-block;font-size:.66rem;border:1px solid #60a5fa55;color:#9cc3ff;background:#60a5fa12;border-radius:7px;padding:1px 7px;margin:2px 4px 0 0;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
    .mk-pozn{padding:10px 12px;font-size:.78rem;line-height:1.5;color:var(--text)}
    .mk-btn-link{background:none;border:none;color:#60a5fa;font-size:.72rem;cursor:pointer;padding:0;margin-left:6px}
    .mk-seg{display:flex;gap:4px;flex-wrap:wrap}
    .mk-seg button{flex:1;min-width:58px;font-size:.72rem;padding:5px 6px;border-radius:8px;border:1px solid var(--border);background:transparent;color:#a8aec8;cursor:pointer}
    .mk-seg button.on{background:#60a5fa22;border-color:#60a5fa88;color:var(--text);font-weight:700}
    .mk-hier{background:var(--bg);border-radius:9px;padding:8px 10px;font-size:.74rem;line-height:1.55}
    .mk-hier div{display:grid;grid-template-columns:auto 1fr;gap:6px}
    .mk-hier .kod{font-family:monospace;color:#9cc3ff;white-space:nowrap}
    .mk-cislo{background:var(--bg);border-radius:10px;padding:9px 11px;margin-top:6px}
    .mk-cislo .h{font-size:1.25rem;font-weight:800;color:var(--text)}
    .mk-cislo .p{font-size:.68rem;color:#a8aec8;line-height:1.45}
    .mk-cislo .t{font-size:.8rem;font-weight:700;color:#fbbf24;margin-bottom:2px}
    .mk-nic{color:#8b93ad;letter-spacing:.1em}
    .mk-dlazdice{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .mk-dlazdice>div{border:1px solid var(--border);border-radius:12px;padding:9px 12px;background:var(--surface2)}
    .mk-dlazdice .p{font-size:.68rem;color:#a8aec8}
    .mk-dlazdice .h{font-size:1.15rem;font-weight:800;color:var(--text)}
    details.mk-roz>summary{list-style:none;cursor:pointer}
    details.mk-roz>summary::-webkit-details-marker{display:none}
    details.mk-roz .sip{transition:transform .2s;display:inline-block}
    details.mk-roz[open] .sip{transform:rotate(180deg)}
  `;
  document.head.appendChild(st);
}
window.mkStyl = mkStyl;
const mkR = (l, v, sub) => `<div class="mk-r"><span class="l">${l}</span><span class="v">${v}${sub ? `<span class="mk-sub">${sub}</span>` : ''}</span></div>`;
//  S25 (v11.60, Milan: „karta není jednotná – u položek bez kódu chybí políčka i živiny a nejde
//  je doplnit“): každá karta má stejná políčka, prázdné = „----“. Co nejde do komunitní databáze
//  (položka bez čárového kódu, opsaná přední strana obalu, značka…), se ukládá jen uživateli do
//  S.uiCfg.karty – synchronizuje se mezi jeho zařízeními, partnerovi se nesdílí.
//  Klíč: 'e' + EAN, jinak 'n' + otisk zkratky z účtenky (FNV, bez znaků zakázaných ve Firebase).
const MK_PRAZDNE = '<span class="mk-nic">----</span>';
const MK_POLE = {
  nazevObal: ['Obal – přední strana', 100, 'název z přední strany obalu'],
  nazevPopisek: ['Obal – CZ popisek', 100, 'název z české nálepky'],
  znacka: ['Značka', 60, 'např. Orion'],
  vyrobce: ['Výrobce', 100, 'kdo výrobek vyrobil'],
  dovozce: ['Dovozce', 120, 'u zahraničního zboží z české nálepky'],
};
function mapaKartaKlic(z) {
  if (!z) return '';
  if (z.ean) return 'e' + String(z.ean).replace(/\D/g, '');
  const t = String(z.klic || z.nazev || ''); let h = 0x811c9dc5;
  for (let k = 0; k < t.length; k++) { h ^= t.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; }
  return 'n' + h.toString(36);
}
function mapaKartaLok(z) {
  const k = mapaKartaKlic(z);
  const v = (k && typeof S !== 'undefined' && S.uiCfg && S.uiCfg.karty) ? S.uiCfg.karty[k] : null;
  return (v && typeof v === 'object') ? v : {};
}
function mapaKartaLokUloz(z, patch) {
  const k = mapaKartaKlic(z); if (!k || typeof S === 'undefined') return null;
  S.uiCfg = S.uiCfg || {}; S.uiCfg.karty = S.uiCfg.karty || {};
  const o = Object.assign({}, S.uiCfg.karty[k] || {}, patch || {}, { zkratka: String(z.nazev || '').slice(0, 100), kdy: Date.now() });
  Object.keys(o).forEach(x => { if (o[x] === '' || o[x] == null) delete o[x]; });
  S.uiCfg.karty[k] = o;
  if (typeof save === 'function') save();
  return o;
}
//  Ruční úprava jednoho políčka karty (přední strana obalu, CZ popisek bez kódu, značka, výrobce, dovozce).
function mapaKartaUprav(i, pole) {
  const z = _mapaUziv[i]; const el = document.getElementById('mkp_' + pole);
  if (!z || !el || !MK_POLE[pole]) return;
  const [, max, ph] = MK_POLE[pole];
  const v = mapaKartaLok(z)[pole] || el.getAttribute('data-hodnota') || '';
  el.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap"><input class="fi" id="mkp_${pole}_in" maxlength="${max}" value="${escHtml(v)}" placeholder="${escHtml(ph)}" style="flex:1;min-width:140px;font-size:.8rem" onkeydown="if(event.key==='Enter')mapaKartaUlozPole(${i},'${pole}')">
    <button class="btn btn-sm btn-primary" onclick="mapaKartaUlozPole(${i},'${pole}')">Uložit</button></div>
    <span class="mk-sub">Opiš z obalu. Prázdné = smazat tvůj zápis. Uloží se jen tobě.</span>`;
  const inp = document.getElementById('mkp_' + pole + '_in'); if (inp && inp.focus) inp.focus();
}
function mapaKartaUlozPole(i, pole) {
  const z = _mapaUziv[i]; if (!z || !MK_POLE[pole]) return;
  const v = ((document.getElementById('mkp_' + pole + '_in') || {}).value || '').trim().slice(0, MK_POLE[pole][1]);
  mapaKartaLokUloz(z, { [pole]: v });
  if (typeof showToast === 'function') showToast(v ? '✅ Uloženo do karty' : 'Tvůj zápis smazán');
  if (typeof mapaUzivKresli === 'function' && document.getElementById('mapaUzivSeznam')) mapaUzivKresli();
  if (typeof mapaUzivDetail === 'function') mapaUzivDetail(i);
}
Object.assign(window, { mapaKartaKlic, mapaKartaLok, mapaKartaLokUloz, mapaKartaUprav, mapaKartaUlozPole });

//  Názvy z účtenek bez opakování: „NEW REMYS ZÁZVOR KOSTKY 100G“ = „New Remys Zázvor kostky 100g“.
//  Skupina podle normName (bez velikosti písmen, diakritiky a gramáže); ukáže se nejčitelnější
//  podoba (malá písmena a diakritika mají přednost před VERZÁLKAMI).
function mapaAliasySkupiny(z) {
  const nn = (typeof normName === 'function') ? normName : (t => String(t || '').toLowerCase());
  const sk = {};
  (z.nakupy || []).forEach(n => {
    const raw = String(n.raw || '').trim(); if (!raw) return;
    const k = nn(raw) || raw.toLowerCase();
    const g = sk[k] || (sk[k] = { varianty: {}, obchody: new Set(), pocet: 0 });
    g.pocet++; g.varianty[raw] = (g.varianty[raw] || 0) + 1;
    if (n.obchodNazev || n.obchod) g.obchody.add((n.obchodNazev || n.obchod) + (n.mesto ? ' · ' + n.mesto : ''));
  });
  const citelnost = t => (/[a-zá-ž]/.test(t) ? 2 : 0) + (/[áčďéěíňóřšťúůýž]/i.test(t) ? 1 : 0);
  return Object.values(sk).map(g => {
    const v = Object.keys(g.varianty).sort((a, b) => citelnost(b) - citelnost(a) || g.varianty[b] - g.varianty[a] || a.length - b.length);
    return { nazev: v[0], variant: v.length, obchody: [...g.obchody], pocet: g.pocet };
  }).sort((a, b) => b.pocet - a.pocet);
}
window.mapaAliasySkupiny = mapaAliasySkupiny;

//  Rozbalovací panel COICOP: hierarchie + váha ČSÚ + tvůj podíl se STEJNÝM základem a obdobím.
let _mapaVahaZaklad = 'potraviny';
function mapaVahaZaklad(v) { _mapaVahaZaklad = v === 'vse' ? 'vse' : 'potraviny'; if (typeof _mapaKartaI !== 'undefined' && _mapaKartaI >= 0 && typeof mapaUzivDetail === 'function') mapaUzivDetail(_mapaKartaI); }
window.mapaVahaZaklad = mapaVahaZaklad;
let _mapaKoicopOtevreno = false;
function mapaObdobiOd(o) {   // 'YYYY-MM' od kdy (včetně), nebo null
  if (!/^(3|6|12)$/.test(String(o))) return null;
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - Number(o) + 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function mapaVyberObdobi(r, o) {
  const od = mapaObdobiOd(o);
  if (od) return r.filter(x => !x.mesic || x.mesic >= od);
  if (/^\d{4}$/.test(o)) return r.filter(x => String(x.mesic || '').slice(0, 4) === o);
  return r;
}
//  Všechny výdaje (transakce, bez převodů a vyrovnání) za stejné období – základ „ze všech výdajů“.
function mapaVsechnyVydaje(D, o) {
  const tx = ((D || getData()).transactions || []).filter(t => t && t.date);
  const od = mapaObdobiOd(o);
  const vyb = od ? tx.filter(t => String(t.date).slice(0, 7) >= od) : /^\d{4}$/.test(o) ? tx.filter(t => String(t.date).slice(0, 4) === o) : tx;
  return typeof expSum === 'function' ? expSum(vyb, D || getData()) : vyb.filter(t => t.type === 'expense').reduce((a, t) => a + (t.amount || 0), 0);
}
window.mapaVsechnyVydaje = mapaVsechnyVydaje;
function mapaKoicopPanelHTML(code, D, cast) {
  if (typeof coicopNorm !== 'function') return '';
  const cesta = typeof coicopCesta === 'function' ? coicopCesta(code) : [];
  const kod4 = coicopNorm(code).split('.').slice(0, 4).join('.');
  const odd = kod4.slice(0, 2);
  const f = v => (Math.round(v * 10) / 10).toLocaleString('cs-CZ');
  const kc = v => Math.round(v).toLocaleString('cs-CZ') + ' Kč';
  const hier = cesta.length ? `<div class="mk-hier">${cesta.map((x, i) => `<div style="padding-left:${i * 6}px"><span class="kod">${i ? '↳ ' : ''}${escHtml(x.kod)}</span><span>${escHtml(x.nazev)}</span></div>`).join('')}</div>` : '';
  let srov = '';
  const w = kod4.split('.').length === 4 ? mapaVahaPodtridy(kod4) : null;
  if (w != null) {
    const o = _mapaVahaObdobi;
    const r = mapaVyberObdobi(mapaVahaRadky(D), o);
    const sum = fn => r.filter(fn).reduce((a, x) => a + x.castka, 0);
    const moje = sum(x => x.coicop && (x.coicop === kod4 || x.coicop.startsWith(kod4 + '.')));
    const potr = sum(x => x.coicop && x.coicop.startsWith(odd + '.'));
    const vse = _mapaVahaZaklad === 'vse' ? mapaVsechnyVydaje(D, o) : 0;
    const wOdd = mapaVahaOddilu(odd);
    const oddN = ((typeof coicopNazev === 'function' && coicopNazev(odd)) || 'oddíl ' + odd).toLowerCase();
    const zakladTxt = _mapaVahaZaklad === 'vse' ? 'ze všech výdajů' : 'z výdajů za ' + oddN;
    const csu = _mapaVahaZaklad === 'vse' ? w / 10 : (wOdd ? w / wOdd * 100 : null);
    const jm = _mapaVahaZaklad === 'vse' ? vse : potr;
    const muj = jm > 0 ? moje / jm * 100 : null;
    const roky = mapaVahaRoky(mapaVahaRadky(D));
    const seg = [['3', '3 měs.'], ['6', '6 měs.'], ['12', '12 měs.'], ['vse', 'vše']].map(([v, n]) => `<button type="button" class="${o === v ? 'on' : ''}" onclick="mapaVahaObdobi('${v}')">${n}</button>`).join('');
    const rokSel = roky.length ? `<select onchange="mapaVahaObdobi(this.value)" style="font-size:.7rem;padding:4px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:8px">
        <option value="">rok…</option>${roky.map(y => `<option value="${y}"${o === y ? ' selected' : ''}>${y}</option>`).join('')}</select>` : '';
    const rozdil = csu && muj != null ? Math.round((muj - csu) / csu * 100) : null;
    srov = `<div style="margin-top:10px;font-weight:700;font-size:.8rem">Srovnání výdajů</div>
      <div style="font-size:.7rem;color:#a8aec8;margin:6px 0 4px">Období tvých nákupů</div>
      <div class="mk-seg">${seg}${rokSel}</div>
      <div style="font-size:.7rem;color:#a8aec8;margin:10px 0 4px">Základ srovnání</div>
      <div class="mk-seg">
        <button type="button" class="${_mapaVahaZaklad !== 'vse' ? 'on' : ''}" onclick="mapaVahaZaklad('potraviny')">z výdajů za ${escHtml(oddN.split(' ')[0])}</button>
        <button type="button" class="${_mapaVahaZaklad === 'vse' ? 'on' : ''}" onclick="mapaVahaZaklad('vse')">ze všech výdajů</button></div>
      <div class="mk-cislo"><div class="t">Váha ČSÚ – průměrná domácnost</div>
        <div><span class="h">${csu != null ? f(csu) + ' %' : '—'}</span> <span class="p">${escHtml(zakladTxt)}</span></div>
        <div class="p">Stálé váhy spotřebního koše ČSÚ (podle nich se počítá inflace) · podtřída ${escHtml(kod4)} · ${f(w)} ‰ ze všech výdajů</div></div>
      <div class="mk-cislo"><div class="t">Tvůj podíl</div>
        <div><span class="h" style="color:#4ade80">${muj != null ? f(muj) + ' %' : '—'}</span> <span class="p">${escHtml(zakladTxt)}</span>
          ${rozdil != null ? `<span style="font-size:.72rem;font-weight:700;color:${rozdil > 25 ? '#f87171' : rozdil < -20 ? '#4ade80' : '#a8aec8'}">${rozdil >= 0 ? '+' : ''}${rozdil} % proti průměru</span>` : ''}</div>
        <div class="p">${muj != null ? `${kc(moje)} z ${kc(jm)} · ${escHtml(mapaVahaObdobiNazev(o))}` : `za ${escHtml(mapaVahaObdobiNazev(o))} nemáš ${_mapaVahaZaklad === 'vse' ? 'výdaje' : 'účtenky z tohoto oddílu'}`}${_mapaVahaZaklad === 'vse' ? ' · výdaje z transakcí, položka z účtenek' : ' · z účtenek'}</div></div>`;
  }
  //  v11.60 (Milan): rozbaluje se jen číselník; Srovnání výdajů je v kartě vždy vidět.
  if (cast === 'hier') return hier ? `<div style="padding:0 12px 12px">${hier}</div>` : '';
  if (cast === 'srov') return srov ? `<div style="padding:0 12px 12px;border-top:1px solid var(--border)">${srov}</div>` : '';
  if (!hier && !srov) return '';
  return `<div style="padding:0 12px 12px">${hier}${srov}</div>`;
}
window.mapaKoicopPanelHTML = mapaKoicopPanelHTML;
//  S25 (v11.57, Milan: „rozbalovací menu číselníku hned na řádku COICOP“): řádek COICOP je sám
//  rozbalovací – klepnutí na kód ukáže hierarchii číselníku a srovnání výdajů přímo pod ním.
function mapaKoicopRadekHTML(kodC, posl, D) {
  const e = t => escHtml(String(t == null ? '' : t));
  const hodnota = posl ? `<span style="font-family:monospace;font-weight:700">${e(posl.kod)}</span><span class="mk-sub">${e(posl.nazev)}</span>` : e(typeof coicopNorm === 'function' ? coicopNorm(kodC) : kodC);
  const telo = mapaKoicopPanelHTML(kodC, D, 'hier');
  const srov = mapaKoicopPanelHTML(kodC, D, 'srov');
  if (!telo) return mkR('COICOP', hodnota) + srov;
  return `<details class="mk-roz"${_mapaKoicopOtevreno ? ' open' : ''} ontoggle="_mapaKoicopOtevreno=this.open" style="border-top:1px solid var(--border)">
    <summary class="mk-r" style="border-top:none;cursor:pointer"><span class="l">COICOP</span>
      <span class="v" style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><span style="min-width:0">${hodnota}<span class="mk-sub" style="color:#60a5fa">číselník ČSÚ</span></span>
        <span class="sip" style="color:#60a5fa;font-size:1rem;line-height:1">⌄</span></span></summary>
    ${telo}</details>${srov}`;
}
window.mapaKoicopRadekHTML = mapaKoicopRadekHTML;

function mapaUzivKartaHTML(i, produkt) {
  const z = _mapaUziv[i]; if(!z) return '';
  mkStyl();
  const p = produkt && produkt.stav === 'nalezeno' ? produkt : null;
  const D = getData();
  const e = t => escHtml(String(t == null ? '' : t));
  const MK_IK = { 'Výrobek': 'vyrobek', 'Zařazení': 'zarazeni', 'Názvy z účtenek': 'uctenka', 'Balení a složení': 'slozeni', 'Moje nákupy': 'nakupy', 'Ceny v kraji': 'kraj' };
  const tit = t => `<div class="mk-tit">${MK_IK[t] ? rpIk(MK_IK[t], 17) : ''}${t}</div>`;
  const radek = (l, v) => mkR(l, v);   // pro mapaKartaKatalog (identifikace a zdroje)
  const q = p && p.mnozstvi ? p.mnozstvi : (z.baleni ? { hodnota: z.baleni.m, jednotka: z.baleni.j } : ((typeof normQty === 'function') ? normQty(z.nazev) : null));
  const gram = q ? (q.hodnota >= 1000 && (q.jednotka==='g'||q.jednotka==='ml') ? (q.hodnota/1000).toLocaleString('cs-CZ') + (q.jednotka==='g'?' kg':' l') : q.hodnota + ' ' + q.jednotka) : '';
  const lok = mapaKartaLok(z);   // v11.60: osobní údaje karty (bez kódu / opsané ručně)
  const titul = (p && typeof eanNazevVyrobku === 'function' ? eanNazevVyrobku(p, z.ean) : (p && p.nazev)) || lok.nazevPopisek || lok.nazevObal || z.mapa?.konkretni || (z.tax ? _mapaVelke(z.tax.nazev) : (typeof nazevBezGramaze === 'function' ? nazevBezGramaze(z.nazev) : z.nazev));
  const NB = { a:'#038141', b:'#85bb2f', c:'#fecb02', d:'#ee8100', e:'#e63e11' };
  const znacky = p ? [
    //  v11.56: Nutri-Score jen jednou – v bloku Balení a složení
    p.nova ? `<span title="NOVA: míra průmyslového zpracování (1 nezpracované … 4 ultra-zpracované)" style="border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:.72rem">NOVA ${p.nova} · ${['','nezpracované','kulinářská surovina','zpracované','ultra-zpracované'][p.nova]}</span>` : '',
    p.slozeni ? `<span title="Přídatné látky (éčka)" style="border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:.72rem">${(p.aditiva||[]).length} éček</span>` : '',
    ...(p.stitky||[]).map(s => `<span style="border:1px solid #34d39966;color:var(--income);border-radius:6px;padding:3px 8px;font-size:.72rem">${e(s)}</span>`),
  ].filter(Boolean).join('') : '';

  // ── VÝROBEK ──
  const moje = z.ean && typeof _eanMojeNazvy !== 'undefined' && _eanMojeNazvy && _eanMojeNazvy[z.ean] && _eanMojeNazvy[z.ean].nazev;
  const JAZ = { cs:'čeština', sk:'slovenština', en:'angličtina', de:'němčina', pl:'polština', hu:'maďarština', fr:'francouzština', it:'italština', es:'španělština', nl:'nizozemština', at:'němčina' };
  const nn = (typeof normName === 'function') ? normName : (t => String(t || '').toLowerCase());
  let vyr = '';
  vyr += z.ean
    ? `<div class="mk-r" style="align-items:center"><span class="l">EAN / GTIN</span><span class="v" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
         <span style="font-family:monospace">${e(z.ean)}</span><button class="btn btn-sm" style="font-size:.7rem" onclick="mapaUzivKartaSken(${i})">${rpIk('skenovat', 15) || '▮▮'} Změnit</button></span></div>`
    : `<div class="mk-r" style="align-items:center"><span class="l">EAN / GTIN</span><span class="v" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
         <span style="color:#8b93ad;font-size:.74rem;letter-spacing:.04em">— ZATÍM NEPŘIŘAZEN</span><button class="btn btn-sm btn-primary" style="font-size:.72rem" onclick="mapaUzivKartaSken(${i})">${rpIk('skenovat', 16) || '▮▮'} Naskenovat kód</button></span></div>`;
  //  S25 (v11.57, Milan): TŘI NÁZVY – u zahraničních výrobků se liší. Z EAN (databáze),
  //  z přední strany obalu (fotka nebo opsaná ručně) a z českého popisku (fotka nálepky, nebo opsaný ručně).
  //  v11.60: všechna políčka u každé karty (i bez kódu), prázdné = „----“, každé jde doplnit.
  const ikTxt = (t, id) => { const k = rpIk(id, 15); return k && /^(📸|✎) /.test(t) ? k + ' ' + t.replace(/^(📸|✎) /, '') : t; };
  const fotoBtn = (druh, txt) => `<button class="mk-btn-link" style="margin:0" onclick="eanFoto('${e(z.ean)}','${druh}',mapaUzivFotoHotovo)">${ikTxt(txt, 'foto')}</button>`;
  const akce = (...b) => `<span style="display:flex;gap:12px;flex-wrap:wrap;margin-top:3px">${b.filter(Boolean).join('')}</span>`;
  const upr = (pole, ma) => `<button class="mk-btn-link" style="margin:0" onclick="mapaKartaUprav(${i},'${pole}')">${ikTxt(ma ? '✎ Opravit' : '✎ Doplnit ručně', 'upravit')}</button>`;
  //  Políčko s osobní úpravou: hodnota (nebo ----), odkud je, tlačítka
  const pRadek = (pole, hodnota, sub, ...tl) => `<div class="mk-r"><span class="l">${MK_POLE[pole][0]}</span><span class="v" id="mkp_${pole}" data-hodnota="${e(hodnota || '')}">${hodnota ? e(hodnota) : MK_PRAZDNE}${sub ? `<span class="mk-sub">${sub}</span>` : ''}${akce(...tl, upr(pole, !!hodnota))}</span></div>`;
  if (z.ean && !produkt) vyr += mkR('Název z EAN', MK_PRAZDNE, '⏳ načítám z databáze…');
  else if (z.ean) {
    const zDb = p && p.nazev && p.zdroj !== 'fotka obalu' ? p.nazev : '';
    vyr += zDb ? mkR('Název z EAN', e(zDb), (p.jazyk && JAZ[p.jazyk] ? JAZ[p.jazyk] + ' · ' : '') + e(p.zdroj || 'databáze'))
               : mkR('Název z EAN', MK_PRAZDNE, 'databáze kód nezná');
  } else vyr += mkR('Název z EAN', MK_PRAZDNE, 'až po naskenování čárového kódu');
  //  Obal – přední strana: tvůj opis → fotka obalu. U kódu i fotka, vždy i ruční opis (Milan).
  const obal = lok.nazevObal || (p && p.nazevObal) || '';
  vyr += pRadek('nazevObal', obal, lok.nazevObal ? '✍️ opsáno ručně' : obal ? '📸 z fotky obalu' : '',
    z.ean && produkt ? fotoBtn('obal', obal ? '📸 Vyfotit znovu' : '📸 Vyfotit') : '');
  //  Obal – CZ popisek. S kódem: fotka popisku → tvůj (opsaný, i pro komunitu) → český z přední strany →
  //  český z databáze → návrh AI. Bez kódu: jen tvůj opis.
  if (z.ean && produkt) {
    const cz = p && p.nazevPopisek ? [p.nazevPopisek, '📸 z českého popisku']
      : moje ? [moje, '✍️ opsáno ručně']
      : p && p.nazevCs && p.nazevCsZdroj === 'foto' ? [p.nazevCs, '📸 česky z přední strany']
      : p && p.nazevCesky && p.nazev ? [p.nazev, 'český název z databáze']
      : p && p.nazevCs ? [p.nazevCs, p.nazevCsZdroj === 'admin' ? 'schválený komunitou' : 'návrh AI – ověř podle popisku'] : null;
    vyr += `<div class="mk-r"><span class="l">Obal – CZ popisek</span><span class="v" id="mk_${e(z.ean)}">${cz ? `<b>${e(cz[0])}</b><span class="mk-sub">${cz[1]}${cz[0] === titul ? ' · používá se v appce' : ''}</span>` : MK_PRAZDNE}
      ${akce(`<button class="mk-btn-link" style="margin:0" onclick="eanNazevUprav('${e(z.ean)}','mk_${e(z.ean)}')">${ikTxt(cz ? '✎ Opravit' : '✎ Doplnit ručně', 'upravit')}</button>`, p && p.nazevPopisek ? '' : fotoBtn('popisek', '📸 Vyfotit popisek'))}</span></div>`;
  } else if (z.ean) vyr += mkR('Obal – CZ popisek', MK_PRAZDNE, '⏳ načítám…');
  else vyr += pRadek('nazevPopisek', lok.nazevPopisek || '', lok.nazevPopisek ? '✍️ opsáno ručně' : '');
  if (p && (p.nazvyJine || []).length) vyr += mkR('Jiné názvy', e(p.nazvyJine.join(' · ')));
  const zdrojDb = (pole, dbV) => lok[pole] ? '✍️ tvůj zápis' : dbV ? (pole === 'dovozce' ? '📸 z českého popisku' : 'databáze') : '';
  vyr += pRadek('znacka', lok.znacka || (p && p.znacka) || '', zdrojDb('znacka', p && p.znacka));
  vyr += pRadek('vyrobce', lok.vyrobce || (p && p.vyrobce) || '', zdrojDb('vyrobce', p && p.vyrobce));
  vyr += pRadek('dovozce', lok.dovozce || (p && p.dovozce) || '', zdrojDb('dovozce', p && p.dovozce));
  if (z.ean && produkt && produkt.stav === 'nenalezeno') vyr += mkR('Databáze', '<span style="color:#fbbf24">výrobek zatím nezná</span>');
  //  CZ název chybí úplně → rovnou pole k opsání (stejné jako ve skeneru)
  const czChybi = z.ean && produkt && !(p && (p.nazevPopisek || p.nazevCs || p.nazevCesky)) && !moje;
  const vyrPod = z.ean
    ? ((typeof eanNazvyHTML === 'function' && produkt && czChybi ? `<div style="margin-top:8px">${eanNazvyHTML(p || {}, z.ean, 'mk')}</div>` : '')
      )   // v11.57: fotky obalu jsou u řádků názvů, živiny v bloku Balení a složení
    : `<div style="font-size:.74rem;color:#a8aec8;line-height:1.5;margin-top:6px">Na účtence je jen zkratka. Políčka můžeš opsat z obalu ručně (uloží se jen tobě), nebo naskenuj čárový kód – doplní přesný název, značku, složení, Nutri-Score a živiny pro všechny a appka pak pozná stejný výrobek i v jiném obchodě.</div>`;

  // ── ZAŘAZENÍ ──
  let zar;
  if (z.tax) {
    const kodC = z.tax.coicop5 || z.tax.coicop;
    const cc = typeof coicopCesta === 'function' ? coicopCesta(kodC) : [];
    const posl = cc.length ? cc[cc.length - 1] : null;
    zar = mkR('Oblast', (typeof ffIkonaOblasti === 'function' ? `<span style="display:inline-flex;align-items:center;gap:7px">${ffIkonaOblasti(z.tax.oblastId, 18)}${e(z.tax.oblastNazev)}</span>` : e(z.tax.ikona + ' ' + z.tax.oblastNazev)))
      + mkR('Kategorie', typeof ffIkonaTax === 'function' ? `<span style="display:inline-flex;align-items:center;gap:7px">${rpIkTax(z.tax, 18)}${e(z.tax.podNazev)}</span>` : e(z.tax.podNazev))
      + mkR('Obecný název', '<b>' + e(z.tax.nazev) + '</b>') + (z.mapa.konkretni ? mkR('Konkrétní', e(z.mapa.konkretni)) : '')
      + mapaKoicopRadekHTML(kodC, posl, D)
      + mkR('Zdroj zařazení', z.mapa.zdrojTax === 'nazev' ? '🧭 podle názvu' : z.mapa.zdrojTax === 'ean' ? '▮▮ podle čárového kódu' : '🗺️ komunitní mapa');
  } else zar = `<div class="mk-pozn" style="color:#a8aec8">Zatím mimo taxonomii – zařadí ji admin v komunitní mapě. Pomůže, když přiřadíš čárový kód.</div>`;
  { const stit = mapaStitek(z.nazev, D);
    if (typeof loadProductDB === 'function') loadProductDB();
    const pg = typeof productGroupLookup === 'function' ? productGroupLookup(z.nazev) : null;
    if (stit) zar += mkR('Štítek', `<span style="color:var(--income);font-style:italic">${e(stit)}</span>`);
    if (!z.tax) zar += mapaKosRadek(pg, '', radek); }
  const zarPanel = '';   // v11.57: číselník se rozbaluje přímo z řádku COICOP (mapaKoicopRadekHTML)

  // ── NÁZVY Z ÚČTENEK ──
  const al = mapaAliasySkupiny(z);
  const alRadek = a => `<div class="mk-r" style="grid-template-columns:minmax(0,1fr)"><span class="v">${e(a.nazev)}${a.pocet > 1 ? ` <span style="color:#8b93ad;font-size:.7rem">· ${a.pocet}×</span>` : ''}
      <span style="display:block">${a.obchody.slice(0, 3).map(o => `<span class="mk-chip">🏪 ${e(o)}</span>`).join('')}</span></span></div>`;
  const aliasy = al.length ? al.slice(0, 3).map(alRadek).join('')
    + (al.length > 3 ? `<details class="mk-roz"><summary style="padding:8px 12px;font-size:.74rem;color:#60a5fa;border-top:1px solid var(--border)">Zobrazit všechny názvy (${al.length}) <span class="sip">⌄</span></summary>${al.slice(3).map(alRadek).join('')}</details>` : '') : '';

  // ── BALENÍ A SLOŽENÍ ──
  //  v11.60: stejná políčka u každé karty, prázdné „----“. Živiny a složení jdou zadat ručně
  //  i bez čárového kódu (osobní karta); s kódem se ukládají ke kódu pro všechny.
  const dbJen = z.ean ? 'z databáze podle kódu' : 'jen s čárovým kódem';
  let bal = '';
  bal += mkR('Čisté množství', gram ? e(gram) : MK_PRAZDNE, gram ? (p && p.mnozstvi ? 'databáze' : 'z účtenky') : '');
  bal += mkR('Typ výrobku', p && (p.konkretni || p.obecny) ? e(p.konkretni || p.obecny) : MK_PRAZDNE, p && (p.konkretni || p.obecny) ? '' : dbJen);
  bal += mkR('Obal', p && (p.obal || []).length ? e(p.obal.join(', ')) : MK_PRAZDNE);
  bal += mkR('Země původu', p && p.puvod ? e(p.puvod) : MK_PRAZDNE);
  bal += mkR('Prodává se v', p && (p.zeme || []).length ? e(p.zeme.join(', ')) : MK_PRAZDNE);
  bal += mkR('Nutri-Score', p && p.nutriscore ? `<span style="background:${NB[p.nutriscore]};color:#fff;font-weight:800;border-radius:5px;padding:1px 7px">${p.nutriscore.toUpperCase()}</span>` : MK_PRAZDNE, p && p.nutriscore ? '' : dbJen);
  const slozT = String((p && (p.slozeniObal || p.slozeni)) || lok.slozeni || '');
  bal += mkR('Složení', slozT ? `<details class="mk-roz"><summary style="color:#c3c8dc">${e(slozT.slice(0, 70))}${slozT.length > 70 ? '… <span style="color:#60a5fa">celé</span>' : ''}</summary>${slozT.length > 70 ? `<div style="margin-top:4px;color:#c3c8dc">${e(slozT)}</div>` : ''}</details>` : MK_PRAZDNE,
    slozT ? (!(p && (p.slozeniObal || p.slozeni)) ? '✍️ opsáno ručně' : '') : 'doplníš spolu s živinami');
  bal += mkR('Alergeny', p && (p.alergeny || []).length ? `<span style="color:#fbbf24">${e(p.alergeny.join(', '))}</span>` : MK_PRAZDNE);
  const zivN = (p && (p.nutriceObal || p.nutrice)) || lok.nutrice || null;
  const zivKlic = z.ean || mapaKartaKlic(z);   // bez kódu = osobní karta (eanZivinyForm to pozná podle „n…“)
  const zivZdroj = p && p.nutriceObal ? (typeof eanZivinyZdroj === 'function' ? eanZivinyZdroj(p.nutriceObal) : '📸 podle obalu') + (p.nutriceObal.kdy ? ' (' + new Date(p.nutriceObal.kdy).toLocaleDateString('cs-CZ') + ')' : '')
    : p && p.nutrice ? 'z databáze Open Food Facts'
    : lok.nutrice ? '✍️ zadáno ručně – jen pro tebe' + (lok.nutrice.kdy ? ' (' + new Date(lok.nutrice.kdy).toLocaleDateString('cs-CZ') + ')' : '') : '';
  const ziv = zivN
    ? `<div class="mk-box" style="margin-top:8px;padding:10px 12px"><div style="font-size:.74rem;font-weight:700;margin-bottom:6px">Nutriční hodnoty na 100 ${zivN.na === 'ml' ? 'ml' : 'g'}</div>${typeof eanNutriceHTML === 'function' ? eanNutriceHTML(zivN) : ''}
        <div style="font-size:.64rem;color:#8b93ad;margin-top:6px">${zivZdroj}
        <button class="mk-btn-link" onclick="eanZivinyForm('${e(zivKlic)}','mapaUzivFotoHotovo')">✍️ Opravit ručně</button></div></div>`
    : `<div class="mk-box mk-pozn" style="margin-top:8px;color:#a8aec8"><div style="display:flex;justify-content:space-between;gap:8px"><span>Nutriční hodnoty na 100 g</span>${MK_PRAZDNE}</div>
        <div style="font-size:.72rem;margin-top:3px">${z.ean ? 'Živiny databáze zatím nemá.' : 'Bez čárového kódu je opíšeš z obalu ručně (uloží se jen tobě).'}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${z.ean ? `<button class="btn btn-sm" style="font-size:.72rem" onclick="eanFoto('${e(z.ean)}','ziviny',mapaUzivFotoHotovo)">📸 Vyfotit tabulku živin</button>
        <button class="btn btn-sm" style="font-size:.72rem" onclick="eanFoto('${e(z.ean)}','ziviny',mapaUzivFotoHotovo,true)">🖼️ z galerie</button>` : ''}
        <button class="btn btn-sm" style="font-size:.72rem" onclick="eanZivinyForm('${e(zivKlic)}','mapaUzivFotoHotovo')">✍️ Zadat ručně</button></div></div>`;

  // ── MOJE NÁKUPY ──
  const ob = mapaUzivObchody(z);
  const posl = z.nakupy[0]; const jed = mapaUzivCenaZaJednotku(posl);
  const nejl = ob.length > 1 && ob[0].cena && ob[ob.length-1].cena > ob[0].cena
    ? mkR('Nejlevněji', `<span style="color:var(--income)">${e(ob[0].obchodNazev)}, −${Math.round((1 - ob[0].cena / ob[ob.length-1].cena) * 100)} %</span>`) : '';
  const nak = `<div class="mk-dlazdice">
      <div><div class="p">Poslední cena</div><div class="h">${posl && posl.cena ? _mapaKc(posl.cena) : '—'}</div></div>
      <div><div class="p">Cena za ${jed ? jed.j : 'kg / l'}</div><div class="h">${jed ? _mapaKc(jed.cena) : '—'}</div></div></div>
    ${ob.length ? `<div class="mk-box" style="margin-top:8px">${ob.map(n => `<div class="mk-r"><span class="l" style="color:var(--text)">${e(n.obchodNazev)}${n.mesto ? `<span class="mk-sub">📍 ${e(n.mesto)}${n.kraj ? ', ' + e(n.kraj) : ''}</span>` : ''}</span>
        <span class="v" style="text-align:right;font-weight:700">${n.cena ? _mapaKc(n.cena) : '—'}</span></div>`).join('')}${nejl}</div>` : ''}`;

  // ── ROZPOČET (sekundární) ──
  const cats = (D.categories||[]).filter(c=>c.type==='expense'||c.type==='both'||!c.type);
  const cat = cats.find(c=>c.id===z.catId);
  const subs = cat?.subs || [];
  const mapaKat = z.lisiSe ? cats.find(c=>c.id===z.mapa.catId) : null;
  const rozp = `<details style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:9px 12px">
      <summary style="cursor:pointer;font-size:.78rem;color:var(--text)">💼 Rozpočet: ${cat ? e((cat.icon||'')+' '+cat.name) : '📦 Nezařazeno'}${z.stav==='moje' ? ' <span style="color:var(--income);font-size:.68rem">✋ moje volba</span>' : ''}</summary>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px;align-items:center">
        <select onchange="mapaUzivZmen(${i},'cat',this.value)" style="background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:5px 4px;color:var(--text);font-size:.74rem;max-width:190px">
          ${cat?'':'<option value="" selected>📦 Nezařazeno</option>'}${cats.map(c=>`<option value="${e(c.id)}"${c.id===z.catId?' selected':''}>${e((c.icon||'')+' '+c.name)}</option>`).join('')}</select>
        ${subs.length ? `<select onchange="mapaUzivZmen(${i},'sub',this.value)" style="background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:5px 4px;color:var(--text);font-size:.74rem;max-width:150px">
          <option value="">— podkat. —</option>${subs.map(sb=>`<option value="${e(sb)}"${sb===z.subcat?' selected':''}>${e(sb)}</option>`).join('')}</select>` : ''}
        ${mapaKat ? `<button class="btn btn-sm" style="font-size:.7rem" onclick="mapaUzivPouzijMapu(${i})">🗺️ Použít návrh: ${e((mapaKat.icon||'')+' '+mapaKat.name)}</button>` : ''}
        ${z.maOsobni ? `<button class="btn btn-sm" style="font-size:.7rem;color:#a8aec8" onclick="mapaUzivZrus(${i})">✕ Zrušit moji volbu</button>` : ''}
      </div>
      <div style="font-size:.66rem;color:#8b93ad;margin-top:6px">Platí pro další účtenky; staré zůstanou, jak jsou.</div>
    </details>`;

  //  Identifikace a zdroje dat (jen to, co opravdu máme) – sbalené, je to „pro zvědavé“
  const katalog = mapaKartaKatalog(z, p, produkt, radek, gram);

  return `<div style="display:flex;gap:12px;align-items:center;padding-right:28px">
      ${p && p.foto ? `<img src="${e(p.foto)}" alt="" style="width:76px;height:76px;object-fit:contain;background:#fff;border-radius:14px;flex-shrink:0">`
        : rpIkDlazdice(z.tax, 76, 40, 'width:76px;height:76px;border-radius:14px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:2.1rem;flex-shrink:0')}
      <div style="min-width:0;flex:1">
        <div style="font-size:1.15rem;font-weight:800;color:var(--text);overflow-wrap:anywhere;line-height:1.25">${e(titul)}</div>
        <div style="font-size:.78rem;color:#a8aec8;margin-top:3px">${[p && p.znacka, gram, 'koupeno ' + z.pocet + '×'].filter(Boolean).map(e).join(' · ')}</div>
      </div>
    </div>
    ${znacky ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">${znacky}</div>` : ''}
    ${tit('Výrobek')}<div class="mk-box">${vyr}</div>${vyrPod}
    ${tit('Zařazení')}<div class="mk-box">${zar}${zarPanel}</div>
    ${aliasy ? tit('Názvy z účtenek') + `<div class="mk-box">${aliasy}</div>` : ''}
    ${tit('Balení a složení')}<div class="mk-box">${bal}</div>${ziv}
    ${tit('Moje nákupy')}${nak}
    ${typeof cenyDoKarty === 'function' ? tit('Ceny v kraji') + '<div class="mk-box mk-pozn"><div id="mkCeny" style="font-size:.76rem;color:#a8aec8">⏳ Načítám…</div></div>' : ''}
    ${katalog.zdroje ? `<details class="mk-roz" style="margin-top:16px"><summary class="mk-tit" style="margin:0 0 6px;display:flex;justify-content:space-between"><span style="display:inline-flex;align-items:center;gap:7px">${rpIk('ean', 17)}Identifikace a zdroje dat</span> <span class="sip">⌄</span></summary><div class="mk-box">${katalog.zdroje}</div></details>` : ''}
    <div style="margin-top:14px">${rozp}</div>
    ${p ? `<div style="font-size:.64rem;color:#8b93ad;margin-top:12px;line-height:1.5">Data o výrobku: Open Food Facts a sesterské databáze (licence ODbL) – zapisují je dobrovolníci, mohou být neúplná. Nesedí složení nebo živiny? <a href="https://world.openfoodfacts.org/product/${encodeURIComponent(z.ean)}" target="_blank" rel="noopener" style="color:#60a5fa">Oprav je na Open Food Facts ↗</a>${p.nazevCs && !p.nazevCesky && !p.nazevPopisek && p.nazevCsZdroj !== 'foto' ? ' · český název doplnila AI' : ''}</div>` : ''}`;
}
window.mapaUzivKartaHTML = mapaUzivKartaHTML;

let _mapaKartaI = -1;
async function mapaUzivDetail(i) {
  const z = _mapaUziv[i]; if(!z) return;
  _mapaKartaI = i;
  let o = document.getElementById('mapaKarta');
  if(!o) {
    o = document.createElement('div'); o.id = 'mapaKarta';
    o.style.cssText = 'position:fixed;inset:0;z-index:10040;background:rgba(8,10,20,.8);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:16px 12px calc(16px + env(safe-area-inset-bottom))';
    o.addEventListener('click', e => { if(e.target === o) mapaUzivKartaZavri(); });
    document.body.appendChild(o);
  }
  const kresli = (prod) => { o.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;width:100%;max-width:520px;position:relative">
      <button onclick="mapaUzivKartaZavri()" style="position:absolute;top:10px;right:12px;background:none;border:none;color:#a8aec8;font-size:1.3rem;cursor:pointer">✕</button>
      ${mapaUzivKartaHTML(i, prod)}</div>`;
    if (typeof cenyDoKarty === 'function') cenyDoKarty(i); };   // S25: sdílené ceny v kraji
  kresli(null);
  if(z.ean && typeof eanNactiProdukt === 'function') {
    const prod = await eanNactiProdukt(z.ean);
    if(_mapaKartaI === i && document.getElementById('mapaKarta')) kresli(prod);
  }
}
function mapaUzivFotoHotovo() { mapaUzivKresli(); if(_mapaKartaI >= 0) mapaUzivDetail(_mapaKartaI); }
window.mapaUzivFotoHotovo = mapaUzivFotoHotovo;
function mapaUzivKartaZavri() { _mapaKartaI = -1; const o = document.getElementById('mapaKarta'); if(o) o.remove(); }
function mapaUzivKartaSken(i) {
  const z = _mapaUziv[i]; if(!z || typeof eanSkenujPolozku !== 'function') return;
  const n = z.nakupy[0] || { raw: z.nazev, obchod: '' };
  mapaUzivKartaZavri();
  eanSkenujPolozku({ raw: n.raw, obchod: n.obchod, ean: z.ean, hotovo: () => { mapaUzivKresli(); mapaUzivDetail(i); } });
}

// ══════════════════════════════════════════════════════
//  S24 (v11.22, TODO-314, Milan): PŘEŘADIT STARÉ ÚČTENKY PODLE MAPY
//  cesta: Analýza účtenek → 🗺️ Mapa položek → „🔄 Přeřadit staré účtenky"
//  Taxonomie platí zpětně sama (dohledává se), ale ROZPOČTOVÁ KATEGORIE je u
//  položky staré účtenky uložená. Tohle ji na přání přepíše podle dnešního
//  zařazení: tvoje volba (učení kategorií) → komunitní mapa / taxonomie.
//  Klíčová slova a „Nákup = nevím" se NEpoužijí – to není lepší informace.
//  Mění se položky v účtenkách i jejich kopie v transakcích (receiptItems).
//  Vždy s náhledem, nikdy samo.
// ══════════════════════════════════════════════════════
function mapaPrerazeniNavrh(D) {
  D = D || getData();
  const zmeny = [];
  const zpracuj = (it, kde) => {
    if(!it || !it.name) return;
    const g = guessItemCatId(it.name, null, it.ean);
    if(!g || !g.catId || !(g.fromMemory || g.fromMap)) return;
    const stejnaKat = g.catId === (it.itemCatId || '');
    if(stejnaKat && (!g.subcat || g.subcat === (it.itemSubcat || ''))) return;
    zmeny.push({ it, kde, nazev: it.name, z: it.itemCatId || '', na: g.catId, sub: g.subcat || '', stejnaKat });
  };
  (D.receipts || []).forEach(r => (r.items || []).forEach(it => zpracuj(it, 'uctenka')));
  (D.transactions || []).forEach(t => (t.receiptItems || []).forEach(it => zpracuj(it, 'transakce')));
  return zmeny;
}
window.mapaPrerazeniNavrh = mapaPrerazeniNavrh;

function mapaPrerazeniTlacitko() {
  if(typeof viewingUid !== 'undefined' && viewingUid) return '';
  const n = mapaPrerazeniNavrh(S).filter(z => z.kde === 'uctenka').length;
  if(!n) return '';
  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <span style="flex:1;min-width:200px;font-size:.78rem;line-height:1.45;color:var(--text)">🔄 <b>${n} položek ve starých účtenkách</b> má podle dnešní mapy jinou rozpočtovou kategorii, než s jakou byly uložené.</span>
    <button class="btn btn-sm" onclick="mapaPrerazeniNahled()">Zobrazit a přeřadit</button></div>`;
}

function mapaPrerazeniNahled() {
  const D = S, zm = mapaPrerazeniNavrh(D);
  const cats = D.categories || [];
  const jm = id => { const c = cats.find(x => x.id === id); return c ? (c.icon || '') + ' ' + c.name : '📦 bez kategorie'; };
  const skup = {};
  zm.filter(z => z.kde === 'uctenka').forEach(z => {
    const k = z.z + '→' + z.na + (z.stejnaKat ? '|' + z.sub : '');
    const g = skup[k] || (skup[k] = { z: z.z, na: z.na, sub: z.sub, stejnaKat: z.stejnaKat, n: 0, nazvy: new Set() });
    g.n++; g.nazvy.add(z.nazev);
  });
  const radky = Object.values(skup).sort((a, b) => b.n - a.n);
  let o = document.getElementById('mapaPrerazeniOkno');
  if(!o) { o = document.createElement('div'); o.id = 'mapaPrerazeniOkno';
    o.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(8,10,20,.85);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:16px 12px';
    o.addEventListener('click', e => { if(e.target === o) o.remove(); }); document.body.appendChild(o); }
  o.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;width:100%;max-width:520px">
    <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:800;font-size:1rem;color:var(--text)">🔄 Přeřadit staré účtenky</div>
      <button onclick="document.getElementById('mapaPrerazeniOkno').remove()" style="background:none;border:none;color:#a8aec8;font-size:1.3rem;cursor:pointer">✕</button></div>
    <div style="font-size:.74rem;color:#a8aec8;margin:6px 0 10px;line-height:1.5">Rozpočtová kategorie se u těchto položek změní podle tvé volby v Mapě položek nebo podle komunitní mapy. Změní se tím i historické statistiky a rozpočty. Částky ani účtenky se nemění.</div>
    ${radky.map(r => `<div style="padding:7px 0;border-top:1px solid var(--border);font-size:.78rem">
      <div><b>${r.n}×</b> ${escHtml(jm(r.z))} → <b style="color:var(--income)">${escHtml(jm(r.na))}</b>${r.stejnaKat && r.sub ? ` › ${escHtml(r.sub)}` : ''}</div>
      <div style="font-size:.68rem;color:#8b93ad;margin-top:2px">${[...r.nazvy].slice(0, 5).map(escHtml).join(', ')}${r.nazvy.size > 5 ? ' …' : ''}</div></div>`).join('')}
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-primary" style="flex:1" onclick="mapaPrerazeniProvest()">✅ Přeřadit ${zm.filter(z => z.kde === 'uctenka').length} položek</button>
      <button class="btn" onclick="document.getElementById('mapaPrerazeniOkno').remove()">Zrušit</button></div></div>`;
}

function mapaPrerazeniProvest() {
  const zm = mapaPrerazeniNavrh(S);
  const cats = S.categories || [];
  zm.forEach(z => {
    const c = cats.find(x => x.id === z.na); if(!c) return;
    if(!z.stejnaKat) { z.it.itemCatId = z.na; z.it.itemCat = c.name; z.it.itemSubcat = z.sub || ''; }
    else if(z.sub) z.it.itemSubcat = z.sub;
  });
  if(typeof save === 'function') save();
  const n = zm.filter(z => z.kde === 'uctenka').length;
  const o = document.getElementById('mapaPrerazeniOkno'); if(o) o.remove();
  if(typeof showToast === 'function') showToast('🔄 Přeřazeno ' + n + ' položek');
  mapaUzivKresli();
}
Object.assign(window, { mapaPrerazeniNahled, mapaPrerazeniProvest });

function mapaUzivKresli() {
  //  Přepočet stavu (mapa se mohla právě dotáhnout) bez překreslení celé stránky.
  const el = document.getElementById('mapaUzivSeznam'); if(!el) return;
  _mapaUziv = mapaUzivData(_mapaUzivReceipts);
  el.innerHTML = mapaUzivSeznamHTML();
  const st = document.getElementById('mapaUzivStat'); if(st) st.innerHTML = mapaUzivStatHTML();
  const pz = document.getElementById('mapaPrerazeni'); if(pz) pz.innerHTML = mapaPrerazeniTlacitko();
  const f = document.getElementById('mapaUzivFiltry'); if(f) f.innerHTML = mapaUzivFiltryHTML();
  const pr = document.getElementById('mapaUzivPrevod');
  if(pr) { const otevreno = pr.querySelector('details')?.open; pr.innerHTML = mapaUzivPrevodHTML(); if(otevreno) pr.querySelector('details')?.setAttribute('open',''); }
}
async function mapaUzivPrevod(podId, catId) {
  if(typeof saveTaxRozpocet !== 'function') return;
  await saveTaxRozpocet(podId, catId);
  if(typeof showToast==='function') showToast(catId ? '💼 Uloženo – platí pro další účtenky' : '💼 Vráceno na výchozí');
  mapaUzivKresli();
}
window.mapaUzivKresli = mapaUzivKresli;
window.mapaUzivPrevod = mapaUzivPrevod;

function mapaUzivStav(id) { _mapaUzivFiltr.stav = id; mapaUzivKresli(); }
function mapaUzivOblast(id) { _mapaUzivFiltr.oblast = id; mapaUzivKresli(); }
function mapaUzivHledej(v) {
  _mapaUzivFiltr.hledat = v;
  const el = document.getElementById('mapaUzivSeznam'); if(el) el.innerHTML = mapaUzivSeznamHTML();
}
function _mapaPoZmene(i) { mapaUzivKresli(); if(_mapaKartaI === i) mapaUzivDetail(i); }
async function mapaUzivZmen(i, co, hodnota) {
  const z = _mapaUziv[i]; if(!z) return;
  if(co === 'cat') {
    if(!hodnota) return;
    await saveCategoryMapping(z.nazev, hodnota, '', 'uzivatel');
  } else {
    if(!z.catId) return;
    await saveCategoryMapping(z.nazev, z.catId, hodnota, 'uzivatel');
  }
  if(typeof showToast==='function') showToast('✋ Zapamatováno – platí pro další účtenky');
  _mapaPoZmene(i);
}
async function mapaUzivPouzijMapu(i) {
  const z = _mapaUziv[i]; if(!z || !z.mapa?.catId) return;
  await saveCategoryMapping(z.nazev, z.mapa.catId, z.mapa.subcat||'', 'uzivatel');
  if(typeof showToast==='function') showToast('🗺️ Použit návrh mapy');
  _mapaPoZmene(i);
}
async function mapaUzivZrus(i) {
  const z = _mapaUziv[i]; if(!z) return;
  await deleteCategoryMapping(z.nazev);
  if(typeof showToast==='function') showToast('Volba zrušena');
  _mapaPoZmene(i);
}
Object.assign(window, { mapaUzivStav, mapaUzivOblast, mapaUzivHledej, mapaUzivZmen, mapaUzivPouzijMapu, mapaUzivZrus,
  mapaUzivDetail, mapaUzivKartaZavri, mapaUzivKartaSken });

function buildLearnTab(receipts, allItems, storeStats, totalSpent) {
  if(receipts.length < 3) {
    return '<div id="utab-learn-content" style="display:none"><div class="card"><div class="card-body">'
      + '<div class="empty"><div class="ei">🧠</div><div class="et">Automatické učení</div>'
      + '<div style="font-size:.76rem;color:var(--text2);margin-top:8px">Naskenujte alespoň 3 účtenky a aplikace začne chápat vaše nákupní návyky.</div>'
      + '</div></div></div></div>';
  }

  // ── Pattern learning ──
  // 1. Kde nakupuješ
  const topStore = Object.entries(storeStats).sort((a,b)=>b[1].visits-a[1].visits)[0];
  const topStoreName = topStore?.[0]||'';
  const topStoreVisits = topStore?.[1]?.visits||0;

  // 2. Typický nákup – medián
  const sortedTotals = [...receipts].map(r=>r.total||0).sort((a,b)=>a-b);
  const medianReceipt = sortedTotals[Math.floor(sortedTotals.length/2)]||0;

  // 3. Nejčastější den nákupu
  const dayCount = {};
  const CZ_D2 = ['Neděle','Pondělí','Úterý','Středa','Čtvrtek','Pátek','Sobota'];
  receipts.forEach(r=>{
    if(!r.date)return;
    const d = new Date(r.date+'T12:00:00').getDay();
    dayCount[d] = (dayCount[d]||0)+1;
  });
  const topDay = Object.entries(dayCount).sort((a,b)=>b[1]-a[1])[0];
  const topDayName = topDay ? CZ_D2[parseInt(topDay[0])] : '–';

  // 4. Predikce příštího nákupu
  const sortedDates = receipts.map(r=>r.date).filter(Boolean).sort();
  let avgInterval = 0, nextShop = '';
  if(sortedDates.length >= 2) {
    const intervals = [];
    for(let i=1;i<sortedDates.length;i++){
      const d = (new Date(sortedDates[i])-new Date(sortedDates[i-1]))/(24*60*60*1000);
      if(d>0&&d<60) intervals.push(d);
    }
    if(intervals.length) {
      avgInterval = Math.round(intervals.reduce((a,b)=>a+b,0)/intervals.length);
      const lastDate = new Date(sortedDates[sortedDates.length-1]);
      const nextDate = new Date(lastDate.getTime()+avgInterval*24*60*60*1000);
      const daysUntil = Math.round((nextDate-new Date())/(24*60*60*1000));
      nextShop = daysUntil <= 0 ? 'Dnes nebo včera' : daysUntil === 1 ? 'Zítra' : 'Za '+daysUntil+' dní';
    }
  }

  // 5. Nákupní DNA – kategorie pie chart data
  const catStats = {};
  receipts.forEach(r=>{catStats[r.category||'Jiné']=(catStats[r.category||'Jiné']||0)+(r.total||0);});
  const catTotal = Object.values(catStats).reduce((a,b)=>a+b,0);
  const dnaColors = ['#4ade80','#60a5fa','#f87171','#fbbf24','#a78bfa','#34d399','#fb923c'];

  // 6. Frequent items – automatické kategorizace
  const itemFreq = {};
  allItems.forEach(it=>{
    const k=(it.name||'').trim().toLowerCase();
    if(k.length<3)return;
    if(rpIsGenericName(it.name))return;   // S25 (TODO-276): „Pečivo 14×“ není výrobek, ale oddělení
    if(!itemFreq[k])itemFreq[k]={name:it.name,count:0,total:0,stores:new Set()};
    itemFreq[k].count++;
    itemFreq[k].total+=it.price||0;
    if(it.store)itemFreq[k].stores.add(it.store);
  });
  const frequentItems = Object.values(itemFreq).filter(v=>v.count>=2).sort((a,b)=>b.count-a.count).slice(0,6);

  let html = '<div id="utab-learn-content" style="display:none">';

  // Co aplikace ví
  html += '<div style="background:linear-gradient(135deg,rgba(96,165,250,.08),rgba(74,222,128,.05));border:1px solid rgba(96,165,250,.2);border-radius:var(--radius);padding:16px;margin-bottom:14px">'
    + '<div style="font-size:.72rem;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">🧠 Co se aplikace naučila</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';

  if(topStoreName) html += '<div style="background:var(--surface2);border-radius:10px;padding:10px;border:1px solid var(--border)">'
    + '<div style="font-size:.68rem;color:var(--text2);margin-bottom:3px">Oblíbený obchod</div>'
    + '<div style="font-weight:700;font-size:.9rem">🏪 '+topStoreName+'</div>'
    + '<div style="font-size:.72rem;color:var(--text2)">'+topStoreVisits+' návštěv</div></div>';

  html += '<div style="background:var(--surface2);border-radius:10px;padding:10px;border:1px solid var(--border)">'
    + '<div style="font-size:.68rem;color:var(--text2);margin-bottom:3px">Typický nákup</div>'
    + '<div style="font-weight:700;font-size:.9rem">💰 '+fmtB(Math.round(medianReceipt))+'</div>'
    + '<div style="font-size:.72rem;color:var(--text2)">medián z '+receipts.length+' nákupů</div></div>';

  if(topDayName) html += '<div style="background:var(--surface2);border-radius:10px;padding:10px;border:1px solid var(--border)">'
    + '<div style="font-size:.68rem;color:var(--text2);margin-bottom:3px">Nejčastější den nákupu</div>'
    + '<div style="font-weight:700;font-size:.9rem">📅 '+topDayName+'</div>'
    + '<div style="font-size:.72rem;color:var(--text2)">nejvíce účtenek (celkově)</div></div>';

  if(nextShop) html += '<div style="background:rgba(74,222,128,.08);border-radius:10px;padding:10px;border:1px solid rgba(74,222,128,.2)">'
    + '<div style="font-size:.68rem;color:var(--text2);margin-bottom:3px">Předpověď příštího nákupu</div>'
    + '<div style="font-weight:700;font-size:.9rem;color:var(--income)">🛒 '+nextShop+'</div>'
    + '<div style="font-size:.72rem;color:var(--text2)">interval ~'+avgInterval+' dní · ø '+fmtB(Math.round(medianReceipt))+'</div></div>';

  html += '</div></div>';

  // Nákupní DNA – vizualizace
  html += '<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">🧬 Nákupní DNA</span></div><div class="card-body">'
    + '<div style="display:flex;gap:0;height:20px;border-radius:10px;overflow:hidden;margin-bottom:10px">';
  Object.entries(catStats).sort((a,b)=>b[1]-a[1]).forEach(([cat,amt],i)=>{
    const pct = catTotal>0?Math.round(amt/catTotal*100):0;
    html += '<div title="'+cat+': '+pct+'%" style="width:'+pct+'%;background:'+dnaColors[i%dnaColors.length]+';transition:width .6s"></div>';
  });
  html += '</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
  Object.entries(catStats).sort((a,b)=>b[1]-a[1]).forEach(([cat,amt],i)=>{
    const pct = catTotal>0?Math.round(amt/catTotal*100):0;
    html += '<div style="display:flex;align-items:center;gap:4px;font-size:.72rem">'
      + '<div style="width:10px;height:10px;border-radius:2px;background:'+dnaColors[i%dnaColors.length]+';flex-shrink:0"></div>'
      + '<span>'+cat+' '+pct+'%</span></div>';
  });
  html += '</div></div></div>';

  // ── S12.1d: MĚSÍČNÍ PŘEHLED OBCHODŮ – tabulka (aktuální měsíc) ──
  const CZ_M2 = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
  const monthReceipts = receipts.filter(r=>{
    if(!r.date) return false;
    const d = new Date(r.date+'T12:00:00');
    return d.getMonth()===S.curMonth && d.getFullYear()===S.curYear;
  });
  if(monthReceipts.length){
    const storeM = {};
    monthReceipts.forEach(r=>{
      const s = r.store||'?';
      if(!storeM[s]) storeM[s] = {visits:0, total:0, days:{}};
      storeM[s].visits++;
      storeM[s].total += (r.total||0);
      const wd = new Date(r.date+'T12:00:00').getDay();
      storeM[s].days[wd] = (storeM[s].days[wd]||0)+1;
    });
    const storeRows = Object.entries(storeM).sort((a,b)=>b[1].total-a[1].total).slice(0,8);
    html += '<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">🏪 Obchody v měsíci</span>'
      + '<span style="font-size:.68rem;color:var(--text3)">'+CZ_M2[S.curMonth]+' '+S.curYear+'</span></div><div class="card-body">'
      + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.74rem;min-width:380px">'
      + '<thead><tr style="color:#a8aec8;text-align:left">'
      + '<th style="padding:5px 6px">Obchod</th>'
      + '<th style="padding:5px 6px;text-align:right">Návštěv</th>'
      + '<th style="padding:5px 6px;text-align:right">Celkem</th>'
      + '<th style="padding:5px 6px;text-align:right">Ø útrata</th>'
      + '<th style="padding:5px 6px;text-align:right">Typický den</th>'
      + '</tr></thead><tbody>';
    storeRows.forEach(([s,v])=>{
      const topD = Object.entries(v.days).sort((a,b)=>b[1]-a[1])[0];
      const dayName = topD ? CZ_D2[parseInt(topD[0])] : '–';
      html += '<tr style="border-top:1px solid var(--border)">'
        + '<td style="padding:6px;font-weight:600;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+storeBadgeHTML(s)+s+'</td>'
        + '<td style="padding:6px;text-align:right">'+v.visits+'×</td>'
        + '<td style="padding:6px;text-align:right;font-weight:700">'+fmtB(Math.round(v.total))+'</td>'
        + '<td style="padding:6px;text-align:right;color:#a8aec8">'+fmtB(Math.round(v.total/v.visits))+'</td>'
        + '<td style="padding:6px;text-align:right;color:#a8aec8">'+dayName+'</td></tr>';
    });
    html += '</tbody></table></div></div></div>';
  }

  //  S23: karta „Ušetřeno slevami" se přestěhovala do vlastní záložky 💸 Slevy (buildDiscountsTab).

  // ── S12.1d: TREND OBCHODŮ – spojnicový graf útrat po měsících (top 4) ──
  const storeTrend = buildStoreTrendData(receipts);
  if(storeTrend.series.length){
    html += '<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">📈 Trend útrat dle obchodů</span>'
      + '<span style="font-size:.68rem;color:var(--text3)">posledních 6 měsíců</span></div><div class="card-body">'
      + '<canvas id="storeTrendChart" style="width:100%;max-width:100%;height:190px"></canvas>'
      + '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:8px">'
      + storeTrend.series.map(s=>'<span style="display:flex;align-items:center;gap:5px;font-size:.72rem;color:#c2c7da">'
          + storeBadgeHTML(s.store, s.color) + s.store + '</span>').join('')
      + '</div></div></div>';
    setTimeout(()=>drawStoreTrendChart('storeTrendChart', storeTrend), 60);
  }

  // Pravidelné položky – co kupuješ opakovaně
  if(frequentItems.length) {
    html += '<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">🔄 Pravidelně nakupuješ</span></div><div class="card-body">';
    frequentItems.forEach(it=>{
      // S12.1g: dedup obchodů (case/diakritika-insensitive: „Můj obchod" = „MOJ OBCHOD")
      const seen = {}; const storeList = [];
      [...it.stores].forEach(s=>{
        const k = String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
        if(!seen[k]){ seen[k] = true; storeList.push(s); }
      });
      const stores = storeList.join(', ');
      html += '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);min-width:0">'
        + '<span style="flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:24px;padding:0 7px;border-radius:12px;background:rgba(96,165,250,.15);color:var(--bank);font-size:.76rem;font-weight:800">'+it.count+'×</span>'
        + '<div style="flex:1;min-width:0">'
        +   '<div style="font-weight:600;font-size:.84rem;overflow-wrap:anywhere">'+it.name+'</div>'
        +   (stores?'<div style="font-size:.7rem;color:#a8aec8;margin-top:2px;overflow-wrap:anywhere">'+stores+'</div>':'')
        + '</div>'
        + '<div style="flex-shrink:0;text-align:right;white-space:nowrap">'
        +   '<span style="font-weight:700;font-size:.88rem">Ø '+fmtB(Math.round(it.total/it.count))+'</span>'
        +   '<div style="font-size:.64rem;color:#a8aec8">za kus</div>'
        + '</div></div>';
    });
    html += '</div></div>';
  }

  // Tip na úspory z učení
  const expensiveStore = Object.entries(storeStats).sort((a,b)=>(b[1].total/b[1].visits)-(a[1].total/a[1].visits))[0];
  const cheapStore = Object.entries(storeStats).sort((a,b)=>(a[1].total/a[1].visits)-(b[1].total/b[1].visits))[0];
  if(expensiveStore && cheapStore && expensiveStore[0]!==cheapStore[0]) {
    const expAvg = Math.round(expensiveStore[1].total/expensiveStore[1].visits);
    const cheapAvg = Math.round(cheapStore[1].total/cheapStore[1].visits);
    html += '<div class="insight-item good"><div class="insight-icon">💡</div><div class="insight-text">'
      + 'V <strong>'+expensiveStore[0]+'</strong> utrácíte průměrně '+_cNum(expAvg)+' '+curSym()+'/nákup, '
      + 'v <strong>'+cheapStore[0]+'</strong> jen '+fmtB(cheapAvg)+'. '
      + 'Úspora '+fmtB(expAvg-cheapAvg)+' na nákup!</div></div>';
  }

  html += '</div>';
  return html;
}

function exportReceiptsCSV() {
  if(!S.receipts?.length) { alert('Žádné účtenky k exportu'); return; }
  // Hlavička
  const header = 'Datum;Obchod;Kategorie;Celkem (Kč);Počet položek;Položky (název:cena/ks:qty)\n';
  const rows = S.receipts.map(r => {
    const items = (r.items||[]).map(it=>`${it.name}:${it.price}:${it.qty||1}`).join('|');
    return [
      r.date||'',
      (r.store||'').replace(/;/g,','),
      r.category||'',
      (r.total||0).toString().replace('.',','),
      (r.items||[]).length,
      items
    ].join(';');
  }).join('\n');
  const blob = new Blob(['\uFEFF'+header+rows], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'financeflow-uctenky-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function deleteAllReceipts() {
  if(!confirm('Chcete opravdu odstranit všechny účtenky? Tato akce je nevratná.')) return;
  S.receipts = [];
  save();
  renderUctenky();
}

function editReceiptFromHistory(index) {
  const r = S.receipts?.[index];
  if(!r) return;
  //  S25 (v11.52): editor si účtenku pamatuje podle id (ne podle pozice) – stará účtenka ho dostane hned
  if(!r.id && typeof ffIdUctenky === 'function') r.id = ffIdUctenky(r);
  // FIX (S12.1m): TVRDÝ reset stavu před otevřením – po překliknutí stránek mohl
  // zůstat _receiptEditorOpen=true a osiřelé _editReceipt/_lastReceiptResult z minula,
  // což blokovalo render i nové otevření (editor „zmizel").
  window._editReceipt = null;
  window._receiptEditorOpen = false;
  window._rpScanFoto = null;   // S25: z Historie žádná čerstvá fotka není – nabídne se výběr

  // Použij dedikovaný div v buildHistoryTab
  const slot = document.getElementById('rcpt_hist_'+index);
  if(slot) {
    const isOpen = slot.style.display !== 'none' && slot.innerHTML.trim() !== '';
    // Zavři VŠECHNY ostatní otevřené editory (jen jeden editor naráz)
    document.querySelectorAll('[id^="rcpt_hist_"]').forEach(s => {
      if(s.id !== 'rcpt_hist_'+index) { s.style.display='none'; s.innerHTML=''; }
    });
    if(isOpen) { slot.style.display = 'none'; slot.innerHTML = ''; window._receiptEditorOpen = false; return; }
    _lastReceiptResult = {receipt: JSON.parse(JSON.stringify(r)), n: 1, historyIndex: index};
    slot.innerHTML = buildReceiptPreviewHTML(_lastReceiptResult.receipt, 1);
    if(window._editReceipt) window._editReceipt._historyIdx = index;
    slot.style.display = 'block';
    window._receiptEditorOpen = true; // chraň editor před Firebase re-renderem
    // Synchronní volání – zabrání race condition s Firebase re-render
    initReceiptEditor();
    // Záložní render přes rAF (pro případ že DOM ještě nebyl ready)
    requestAnimationFrame(() => { if(window._editReceipt && document.getElementById('rp_items')) rpRender(); });
    slot.scrollIntoView({behavior:'smooth', block:'nearest'});
    return;
  }

  // Fallback pro Obchody záložku (nemá rcpt_hist_ slot)
  const editId = 'rcpt_edit_'+index;
  const existing = document.getElementById(editId);
  if(existing) { existing.remove(); return; }
  _lastReceiptResult = {receipt: JSON.parse(JSON.stringify(r)), n: 1, historyIndex: index};
  const div = document.createElement('div');
  div.id = editId;
  div.style.cssText = 'border-top:2px solid var(--accent);background:var(--surface2);padding:14px;margin:0';
  div.innerHTML = buildReceiptPreviewHTML(_lastReceiptResult.receipt, 1);
  const btns = document.querySelectorAll('[onclick]');
  let inserted = false;
  btns.forEach(btn => {
    if(btn.getAttribute('onclick')?.includes('editReceiptFromHistory('+index+')') && !inserted) {
      const row = btn.closest('.card') || btn.parentElement;
      if(row) { row.after(div); inserted = true; }
    }
  });
  if(!inserted) document.body.appendChild(div);
  setTimeout(initReceiptEditor, 50);
}

function deleteReceipt(index) {
  if(!confirm('Chcete účtenku opravdu odstranit?'))return;
  //  S23 (TODO-277c): AŽ PO POTVRZENÍ – s účtenkou zmizí i uschovaná fotka,
  //  jinak by v R2 zůstala navždy a uživatel by o ní nevěděl.
  const _r = (S.receipts || [])[index];
  if (_r && _r.photoKey && typeof archivSmaz === 'function') rpFotky(_r).forEach(k => archivSmaz(k));   // S25: všechny fotky
  //  S25: nabídnout smazání i transakce, která z účtenky vznikla (dřív zůstala v Transakcích)
  const _t = _r ? rcptNajdiTx(_r, S) : null;
  if (_t && confirm(`Smazat i transakci „${_t.name || 'účtenka'}“ ${fmtB(Math.round(_t.amount || 0))} z Transakcí?`)) S.transactions = S.transactions.filter(x => x !== _t);
  if(S.receipts)S.receipts.splice(index,1);
  save(); renderUctenky();
  switchUctenkyTab('history',document.getElementById('utab-history'));
}

// ── Fronta fotek účtenek ──
let _receiptQueue = []; // [{base64, thumb}]

// ══════════════════════════════════════════════════════
//  S23 (TODO-277b): ARCHIV FOTEK ÚČTENEK (Cloudflare R2)
//  Fotka dosud jen proletěla workerem k analýze a zmizela. Kdo si chce
//  uschovat doklad kvůli záruce (spotřebiče), potřebuje ji uloženou.
//  Ukládá se JEN na vyžádání (tlačítko „📌 Uschovat doklad"), nikdy sama:
//  fotka účtenky je citlivý doklad a většina lidí ji archivovat nepotřebuje.
//  Komprese je tvrdší než u analýzy (1200 px, JPEG 0.7) – na čtení očima
//  to stačí a do R2 jde ~150–250 kB místo 1 MB.
// ══════════════════════════════════════════════════════
const ARCHIV_MAX_PX = 1200, ARCHIV_KVALITA = 0.7, ARCHIV_STROP = 2 * 1024 * 1024;

async function archivZmensi(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if (w > ARCHIV_MAX_PX || h > ARCHIV_MAX_PX) {
        if (w > h) { h = Math.round(h * ARCHIV_MAX_PX / w); w = ARCHIV_MAX_PX; }
        else { w = Math.round(w * ARCHIV_MAX_PX / h); h = ARCHIV_MAX_PX; }
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      let q = ARCHIV_KVALITA, data = c.toDataURL('image/jpeg', q);
      //  Když by fotka i tak přesáhla strop workeru, ubereme kvalitu.
      while (data.length * 0.75 > ARCHIV_STROP && q > 0.35) { q -= 0.1; data = c.toDataURL('image/jpeg', q); }
      res({ base64: data.split(',')[1], mime: 'image/jpeg', px: Math.max(w, h), bajtu: Math.round(data.length * 0.75) });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Fotku se nepodařilo načíst')); };
    img.src = url;
  });
}

async function archivVolej(akce, telo) {
  if (!window._currentUser) throw new Error('Nejsi přihlášený');
  const token = await window._currentUser.getIdToken();
  const wu = (typeof WORKER_URL !== 'undefined' && WORKER_URL) || 'https://misty-limit-0523.bc-milda.workers.dev';
  const r = await fetch(`${wu}/archiv/${akce}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(telo || {}),
  });
  if (akce === 'get') { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || ('HTTP ' + r.status));
  return d;
}
window.archivVolej = archivVolej;

//  Uschová fotku k účtence. Vrací klíč, který se uloží do záznamu účtenky.
async function archivUloz(file, receiptId) {
  const z = await archivZmensi(file);
  const d = await archivVolej('upload', { photo: z.base64, mime: z.mime, receiptId: receiptId || '' });
  return { key: d.key, bajtu: d.size, pocet: d.pocet, limit: d.limit };
}
window.archivUloz = archivUloz;

//  Smaže fotku (při smazání účtenky i ručně v archivu). Chyba se jen zaloguje –
//  kvůli nedostupné síti nesmí selhat smazání samotné účtenky.
async function archivSmaz(key) {
  if (!key) return false;
  try { await archivVolej('delete', { key }); return true; }
  catch (e) { console.warn('Archiv – fotku se nepodařilo smazat:', e.message); return false; }
}
window.archivSmaz = archivSmaz;

async function compressReceiptImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_PX = 1600;
      let w = img.width, h = img.height;
      if(w > MAX_PX || h > MAX_PX) {
        if(w > h) { h = Math.round(h * MAX_PX / w); w = MAX_PX; }
        else { w = Math.round(w * MAX_PX / h); h = MAX_PX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      res(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => rej(new Error('Nepodařilo se načíst obrázek'));
    img.src = url;
  });
}

// FIX-058 (TODO-021): Komprese vracející OBOJÍ – Blob (pro offline IndexedDB)
// a base64 (pro online Worker). Tím se vyhneme dvojí kompresi i zbytečné konverzi
// base64↔Blob v analyzeMultiReceipt offline větvi.
// Stejné parametry jako compressReceiptImage (MAX_PX=1600, JPEG 0.85).
async function compressReceiptImageDual(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_PX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX_PX || h > MAX_PX) {
        if (w > h) { h = Math.round(h * MAX_PX / w); w = MAX_PX; }
        else { w = Math.round(w * MAX_PX / h); h = MAX_PX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      // Blob → toBlob (asynchronní, bez base64 mezikroku) – nejefektivnější
      canvas.toBlob(blob => {
        if (!blob) { rej(new Error('Komprese selhala (toBlob vrátil null)')); return; }
        // Pro online cestu zároveň extrahujeme base64 z dataURL (z téhož canvasu)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];
        res({
          blob,
          base64,
          thumb: dataUrl,
          width: w,
          height: h,
          sizeKB: Math.round(blob.size / 1024),
        });
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => rej(new Error('Nepodařilo se načíst obrázek'));
    img.src = url;
  });
}

async function addReceiptPhoto(file) {
  if(!file) return;
  const status = document.getElementById('receiptStatus');
  if(status) { status.style.display='block'; status.innerHTML='<div class="insight-item warn"><div class="insight-icon">⏳</div><div class="insight-text">Připravuji foto...</div></div>'; }
  try {
    // FIX-058 (TODO-021): Komprese se dělá VŽDY hned (online i offline cesta),
    // a vrací Blob i base64. Tím se vyhneme dvojí kompresi v offline větvi.
    const compressed = await compressReceiptImageDual(file);

    // ── OFFLINE VĚTEV ──────────────────────────────────────────────
    // Pokud nejsme online, uložíme JIŽ ZKOMPRIMOVANOU fotku do IndexedDB.
    // Analýza proběhne automaticky po obnovení připojení.
    if (!navigator.onLine && window.OfflineSync) {
      const offlineId = await window.OfflineSync.saveReceiptOffline(compressed.blob, {
        month: S.curMonth,
        year:  S.curYear,
      });
      if(status) {
        status.style.display='block';
        status.innerHTML=`
          <div class="insight-item warn" style="flex-direction:column;align-items:flex-start;gap:6px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:1.1rem">📵</span>
              <strong>Uloženo offline (${compressed.sizeKB} KB)</strong>
            </div>
            <div style="font-size:.78rem;color:var(--text2)">
              Fotka je uložena v telefonu (ID: ${offlineId}).<br>
              AI analýza proběhne automaticky, jakmile se připojíš k internetu.
            </div>
            <div style="font-size:.72rem;color:var(--text3)">
              ☁️ Klikni na žlutý odznak vpravo dole pro správu offline fronty.
            </div>
          </div>`;
      }
      return; // Nepokračujeme – čekáme na síť
    }
    // ── ONLINE VĚTEV – přidání do fronty pro analýzu ────────────────
    // FIX-058: Ukládáme i Blob, aby `analyzeMultiReceipt` offline větev
    // mohla použít Blob přímo bez zbytečné atob/Uint8Array konverze.
    _receiptQueue.push({
      base64: compressed.base64,
      thumb:  compressed.thumb,
      blob:   compressed.blob, // FIX-058: nově – pro offline fallback v multi-receipt
    });
    updateReceiptQueue();
    if(status) status.style.display='none';
    // Nezačínáme automaticky – uživatel klikne na tlačítko Analyzovat
  } catch(e) {
    if(status) status.innerHTML=`<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text">${e.message}</div></div>`;
  }
}

function updateReceiptQueue() {
  const queue = document.getElementById('receiptPhotoQueue');
  const list = document.getElementById('receiptPhotoList');
  if(!queue || !list) return;
  if(_receiptQueue.length === 0) {
    queue.style.display = 'none';
    return;
  }
  queue.style.display = 'block';
  list.innerHTML = _receiptQueue.map((p,i) => `
    <div style="position:relative;width:56px;height:72px">
      <img src="${p.thumb}" style="width:56px;height:72px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">
      <button onclick="removeReceiptPhoto(${i})" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--expense);border:none;color:white;font-size:.65rem;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      <div style="text-align:center;font-size:.6rem;color:var(--text3);margin-top:2px">Část ${i+1}</div>
    </div>`).join('');
  // Aktualizuj text tlačítka
  const btn = queue.querySelector('.btn-accent');
  if(btn) btn.textContent = `🧠 Analyzovat ${_receiptQueue.length} ${_receiptQueue.length===1?'foto':'fotek'} jako 1 účtenku`;
}

function removeReceiptPhoto(i) {
  _receiptQueue.splice(i, 1);
  updateReceiptQueue();
}

function clearReceiptQueue() {
  _receiptQueue = [];
  updateReceiptQueue();
  const preview = document.getElementById('receiptPreview');
  const status = document.getElementById('receiptStatus');
  if(preview) preview.style.display = 'none';
  if(status) status.style.display = 'none';
}

async function analyzeMultiReceipt() {
  if(_rpAnalyzaBezi) return;                 // S25 (v11.53): jedna analýza naráz (viz analyzeReceipt)
  _rpAnalyzaBezi = true;
  try { return await _analyzeMultiReceipt(); } finally { _rpAnalyzaBezi = false; }
}
async function _analyzeMultiReceipt() {
  if(typeof gateFeature==='function' && !gateFeature('receiptAnalyze','Analýza účtenek')) return; // S12.1p
  if(!_receiptQueue.length) return;
  const status = document.getElementById('receiptStatus');
  const preview = document.getElementById('receiptPreview');

  const token = await getAuthToken();
  if(!token) {
    if(status) { status.style.display='block'; status.innerHTML='<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Pro analýzu účtenek se musíte přihlásit přes <strong>Google účet</strong>.</div></div>'; }
    return;
  }

  // ── OFFLINE VĚTEV ──────────────────────────────────────────────────
  if (!navigator.onLine && window.OfflineSync) {
    const n = _receiptQueue.length;
    // FIX-058 (TODO-021): Ukládáme JIŽ ZKOMPRIMOVANÉ Bloby přímo z fronty.
    // Před fixem: base64 → atob loop → Uint8Array → Blob → compressPhoto (DRUHÁ KOMPRESE).
    // Po fixu: Blob z queue → saveReceiptOffline → compressPhoto detekuje že už je
    // zkomprimovaný a uloží 1:1 (žádná degradace kvality, žádná zbytečná CPU práce).
    let savedCount = 0;
    for (const item of _receiptQueue) {
      try {
        // FIX-058: Použij Blob z queue (nový formát). Fallback na starou base64→Blob
        // konverzi pro robustnost (pro případ že někdo přidá položku starým způsobem).
        let blob = item.blob;
        if (!blob) {
          // Legacy fallback – mělo by být vzácné
          const byteStr = atob(item.base64);
          const arr = new Uint8Array(byteStr.length);
          for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
          blob = new Blob([arr], { type: 'image/jpeg' });
        }
        await window.OfflineSync.saveReceiptOffline(blob, {
          month: S.curMonth, year: S.curYear,
          multiPart: n > 1, partIndex: savedCount,
        });
        savedCount++;
      } catch(e) { console.error('Offline save error:', e); }
    }
    _receiptQueue = [];
    updateReceiptQueue();
    if(status) {
      status.style.display='block';
      status.innerHTML=`
        <div class="insight-item warn" style="flex-direction:column;align-items:flex-start;gap:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:1.1rem">📵</span>
            <strong>${savedCount} ${savedCount===1?'foto uloženo':'fotek uloženo'} offline</strong>
          </div>
          <div style="font-size:.78rem;color:var(--text2)">
            AI analýza proběhne automaticky po připojení k internetu.
          </div>
        </div>`;
    }
    return;
  }
  // ── ONLINE VĚTEV (původní kód) ─────────────────────────────────────

  const n = _receiptQueue.length;
  if(status) { status.style.display='block'; status.innerHTML=`<div class="insight-item warn"><div class="insight-icon">⏳</div><div class="insight-text">Claude analyzuje ${n === 1 ? 'účtenku' : n + ' části účtenky'}...</div></div>`; }
  if(preview) preview.style.display='none';
  //  S25 (v11.53, Milan): čekací okno – přesýpací hodiny, co se děje, nedá se mezitím nikam kliknout
  const ctrl = new AbortController();
  let zruseno = false, krokTimer = null;
  if(typeof ffCekaniStart==='function') {
    ffCekaniStart({
      titulek: n === 1 ? 'Analyzuji účtenku' : `Analyzuji účtenku (${n} fotky)`,
      podtitulek: 'Nezavírej aplikaci a nikam neodcházej, výsledek se otevře sám.',
      kroky: ['Připravuji ' + (n === 1 ? 'fotku' : 'fotky'), 'Posílám účtenku ke čtení', 'AI čte obchod, položky a ceny', 'Kontroluji výsledek'],
      odhadS: 20 + 8 * (n - 1), odhadText: n === 1 ? '10–30 s' : '20–50 s',
      zrusit: () => { zruseno = true; ctrl.abort(); },
    });
    ffCekaniKrok(1); krokTimer = setTimeout(() => ffCekaniKrok(2), 2000);   // fotky jsou ve frontě už zmenšené
  }

  try {
    // FIX-061 (Session 8): 60s timeout – ochrana před viseními Worker volánímami.
    const timeoutId = setTimeout(() => ctrl.abort(), 60000);
    let res;
    try {
      res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          type: 'receipt',
          payload: {
            images: _receiptQueue.map(p => ({imageData: p.base64, mediaType: 'image/jpeg'}))
          }
        }),
        signal: ctrl.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        throw new Error(zruseno ? 'Analýza zrušena.' : 'Analýza trvala déle než 60 sekund. Zkuste znovu nebo s menším počtem fotek.');
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);
    if(krokTimer) clearTimeout(krokTimer);
    if(typeof ffCekaniKrok==='function') ffCekaniKrok(3);

    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      if(res.status===429 && typeof uctenkyKvotaObnov==='function') setTimeout(uctenkyKvotaObnov,0);   // S24 (v11.16)
      throw new Error(err?.message || err?.error || 'HTTP ' + res.status);
    }
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    if(!text) throw new Error('Prázdná odpověď od Claude');

    let receipt;
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
      receipt = validateReceiptJSON(parsed); // TODO-008
    } catch(e) {
      throw new Error('Claude nevrátil validní JSON: ' + e.message + '. Zkuste čitelnější foto.');
    }

    if(typeof ffCekaniKonec==='function') ffCekaniKonec();
    if(status) status.style.display='none';
    // S25 (Milan): fotka z právě naskenované účtenky – „📌 Uschovat tuto fotku“ ji nahraje bez nového výběru
    { const blobs = _receiptQueue.map(q => q && q.blob).filter(Boolean);   // S25: VŠECHNY fotky účtenky (dlouhá = víc fotek)
      const tok = 'sc' + Date.now(); receipt._scanTok = tok;
      window._rpScanFoto = blobs.length ? { blobs, at: Date.now(), tok } : null; }
    _receiptQueue = [];
    updateReceiptQueue();
    _lastReceiptResult = {receipt, n}; // Ulož pro případ překreslení

    if(preview) {
      preview.style.display='block';
      preview.innerHTML = buildReceiptPreviewHTML(receipt, n);
      setTimeout(() => {
        initReceiptEditor();
        // Scroll k editoru aby ho uživatel viděl
        const prev = document.getElementById('receiptPreview') || document.getElementById('rpPreviewArea');
        if(prev) prev.scrollIntoView({behavior:'smooth', block:'start'});
      }, 80);
    }
  } catch(e) {
    if(status) {
      status.style.display='block';
      status.innerHTML = zruseno
        ? `<div class="insight-item warn"><div class="insight-icon">✋</div><div class="insight-text">Analýza zrušena. Fotky zůstaly připravené, můžeš to zkusit znovu.</div></div>`
        : `<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text">
        <strong>Nepodařilo se analyzovat</strong><br>
        <span style="font-size:.76rem">${escHtml(e.message)}</span>
      </div></div>`;
    }
  } finally {
    if(krokTimer) clearTimeout(krokTimer);
    if(typeof ffCekaniKonec==='function') ffCekaniKonec();   // okno zmizí vždy – i po chybě
  }
}

// Uložený výsledek analýzy – přežije překreslení stránky
let _lastReceiptResult = null;

function guessReceiptCategory(receipt) {
  const text = [
    receipt.store||'',
    ...(receipt.items||[]).map(it=>it.name||'')
  ].join(' ').toLowerCase();
  const rules = [
    { cat:'Restaurace',      keys:['pizza','burger','kebab','sushi','bistro','kavárna','café','cafe','restaurant','hospoda','mcdonald','kfc','subway'] },
    { cat:'Benzín',          keys:['benzín','nafta','shell','mol','benzina','orlen','čerpací'] },
    { cat:'Drogerie',        keys:['dm ','rossmann','teta','drogerie','šampon','gel','mýdlo','zubní','toaletní','hygien','plena','pampers'] },
    { cat:'Lékárna',         keys:['lékárna','pharmacy','ibuprofen','paralen','vitamin','magistra','benu','dr.max'] },
    { cat:'Elektronika',     keys:['samsung','apple','xiaomi','datart','czc','alza','kasa','notebook','laptop','tablet'] },
    { cat:'Oblečení',        keys:['zara','h&m','reserved','deichmann','boty','tričko','oblečení'] },
    { cat:'Sport',           keys:['intersport','decathlon','fitness','squash','golf'] },
    { cat:'Domácí mazlíčci', keys:['zoocentrum','zoopark','krmivo','granule','kočka','pes','králík','morče','vitakraft','versele'] },
    { cat:'Dům & Zahrada',   keys:['hornbach','obi','ikea','bauhaus','zahrada','šroub','barva','kladivo'] },
    { cat:'Jídlo & Nákupy',  keys:['albert','lidl','kaufland','penny','tesco','billa','globus','coop','potraviny','supermarket','hypermarket','rohlík','mléko','chléb'] },
  ];
  for(const rule of rules) {
    if(rule.keys.some(k => text.includes(k))) return rule.cat;
  }
  return 'Jiné';
}

function buildReceiptPreviewHTML(receipt, n) {
  // Auto-detekuj kategorii pokud není nastavena nebo je generická
  if(!receipt.category || receipt.category === 'Jiné') {
    receipt.category = guessReceiptCategory(receipt);
  }
  if(typeof rpApplyNegativeLines==='function') rpApplyNegativeLines(receipt);   // S23
  window._editReceipt = JSON.parse(JSON.stringify(receipt));
  // Session 12.1: předvyplň 🏷️ tagy položek z produktové DB (ČSÚ spotřební koš) – jen kde tag chybí
  if(typeof productGroupPrefill === 'function') productGroupPrefill(window._editReceipt);
  const r = window._editReceipt;
  //  S22: zapamatuj si, co bylo na účtence NATIŠTĚNO, než to cokoli přepíše.
  //  Bez toho není proti čemu součet položek porovnávat.
  if(r.printedTotal == null && r.total != null) r.printedTotal = r.total;

  return `<div id="receiptEditForm" onclick="event.stopPropagation()" style="background:var(--surface);border:2px solid rgba(74,222,128,.3);border-radius:14px;padding:16px;margin-top:12px;box-shadow:0 4px 24px rgba(0,0,0,.3)">

    <!-- Hlavička -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
      <div style="flex:1;margin-right:12px">
        <input id="rp_store" class="fi" value="${(r.store||'').replace(/"/g,'&quot;')}" placeholder="Název obchodu"
          style="font-weight:700;font-size:.95rem;margin-bottom:6px"
          oninput="window._editReceipt.store=this.value;rpUpdateTotal()">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
          <input id="rp_city" class="fi" value="${escHtml(r.storeCity||'')}" placeholder="📍 Město pobočky" title="${escHtml(r.storeAddress||'')}"
            style="font-size:.78rem;flex:1 1 130px;min-width:120px" oninput="rpPobocka('storeCity',this.value)">
          <select id="rp_region" class="fi" style="font-size:.78rem;flex:1 1 140px;min-width:130px" onchange="rpPobocka('storeRegion',this.value)">
            <option value="">— kraj —</option>${RCPT_KRAJE.concat(r.storeRegion && !RCPT_KRAJE.includes(r.storeRegion) ? [r.storeRegion] : []).map(k => `<option value="${escHtml(k)}" ${r.storeRegion === k ? 'selected' : ''}>${escHtml(k)}</option>`).join('')}</select>
        </div>
        <!--  S22 (Milan): na mobilu se datum i kategorie mačkaly vedle sebe do
              jednoho řádku a nebylo pořádně vidět ani jedno. flex-wrap je
              pod sebe zalomí, min-width drží čitelnou šířku. -->
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <input id="rp_date" class="fi" type="date" value="${r.date||''}"
            style="font-size:.8rem;flex:1 1 140px;min-width:140px"
            oninput="window._editReceipt.date=this.value; rpCheckFutureDate()">
          <select id="rp_cat" class="fi" style="font-size:.8rem;flex:1 1 150px;min-width:150px"
            onchange="window._editReceipt.category=this.value; if(window._editReceipt.store){ const D=getData(); const cat=D.categories?.find(c=>c.name===this.value); if(cat) saveCategoryMapping(window._editReceipt.store, cat.id, ''); }">
            ${(()=>{
              const D = getData();
              const userCats = (D.categories||[]).map(c=>c.name);
              const allCats = [...new Set(['Jídlo & Nákupy','Drogerie','Restaurace','Benzín','Elektronika','Lékárna','Oblečení','Sport','Domácí mazlíčci','Dům & Zahrada','Jiné',...userCats])];
              return allCats.map(c=>`<option value="${c}" ${r.category===c?'selected':''}>${c}</option>`).join('');
            })()}
          </select>
        </div>
        <!--  S23 (Milan): „PO ÚTRATĚ 2 500 Kč UKAZUJE MAJETEK JEN −300."
              Transakce z účtenky neměla peněženku, takže ji zůstatek žádné
              peněženky neviděl – v Souhrnu výdajů byla, v majetku ne. -->
        ${(()=>{
          const ws = (typeof getWallets==='function') ? getWallets(getData()) : (S.wallets||[]);
          if(!ws.length) return '';
          if(!r.wallet || !ws.some(w=>w.id===r.wallet)) r.wallet = rpDefaultWalletId();
          return `<select id="rp_wallet" class="fi" style="font-size:.8rem;margin-top:6px" title="Z které peněženky se platilo"
            onchange="window._editReceipt.wallet=this.value">
            ${ws.map(w=>`<option value="${w.id}" ${r.wallet===w.id?'selected':''}>${w.icon||'💼'} ${w.name}${w.currency&&w.currency!=='CZK'?' ('+w.currency+')':''}</option>`).join('')}
          </select>`;
        })()}
        ${rpArchivBlok(r)}
        <div id="rp_future_warn" style="display:${(r.date && new Date(r.date) > new Date(new Date().setHours(23,59,59,999)))?'flex':'none'};gap:8px;align-items:center;margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--expense-bg);border:1px solid rgba(248,113,113,.3);font-size:.74rem;color:var(--expense)">
          <span>⚠️</span><span>Datum je v budoucnosti – zkontroluj, jestli analyzér nepřečetl datum špatně. Transakce by spadla mimo aktuální měsíc.</span>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:.72rem;color:var(--text2);margin-bottom:2px">Celkem</div>
        <div id="rp_total_display" style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800;color:var(--expense)">−${fmtP(r.total||0)} Kč</div>
        ${(r.subtotal!=null && Math.abs((r.total||0)-r.subtotal)>0.001)
          ? `<div style="font-size:.64rem;color:var(--text3);margin-top:2px">součet ${fmtP(r.subtotal)} + zaokr. ${fmtP((r.total||0)-r.subtotal)}</div>` : ''}
      </div>
    </div>

    <!--  S22 (Milan): KONTROLA HNED PO SKENU, ne až v Historii.
          Milan naskenoval Kaufland a rovnou viděl špatné číslo: analyzér
          přehlédl slevový řádek „Tvoje cena s −49,90". Kontrola úplnosti
          v appce byla od S19, ale běžela až v Historii – tedy až potom, co
          uživatel transakci uložil.
          Hlásí se NEUTRÁLNĚ: rozdíl nemusí být chyba AI, bývá to i vratná
          záloha na lahve nebo sleva na celý doklad.
          Částka se NEPŘEPISUJE automaticky (výhrada Milana: špatně přečtený
          total by zmařil celý výpočet) – nabídne se oprava jedním klikem. -->
    <div id="rp_check"></div>

    <!-- Položky -->
    <div style="border-top:1px solid var(--border);padding-top:10px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:.76rem;font-weight:600;color:var(--text2)">Položky <span style="font-size:.62rem;color:var(--text3);font-weight:400">· ← potáhni do stran →</span></span>
        <button class="btn btn-ghost btn-sm" onclick="rpAddItem()" style="font-size:.72rem">➕ Přidat</button>
      </div>
      <div id="rp_items" style="overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px"></div>
    </div>

    <!-- Akce -->
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-accent" style="flex:1" onclick="rpSave()">💾 Uložit změny</button>
      <button class="btn btn-ghost btn-sm" style="min-width:36px;color:#ef4444;border:1.5px solid #ef4444;border-radius:8px" onclick="(function(){
        // FIX: použij _historyIdx z _editReceipt jako zálohu pokud _lastReceiptResult byl vymazán (navigace)
  const histIdx = window._lastReceiptResult?.historyIndex ?? window._editReceipt?._historyIdx;
        if(histIdx !== undefined && histIdx !== null) {
          const slot = document.getElementById('rcpt_hist_'+histIdx);
          if(slot && slot.style.display !== 'none') { slot.style.display='none'; slot.innerHTML=''; return; }
          const editDiv = document.getElementById('rcpt_edit_'+histIdx);
          if(editDiv) { editDiv.remove(); return; }
        }
        const prev = document.getElementById('receiptPreview');
        const stat = document.getElementById('receiptStatus');
        if(prev) prev.style.display='none';
        if(stat) stat.style.display='none';
        window._lastReceiptResult=null;
      })()">✕</button>
    </div>
    <div style="font-size:.7rem;color:var(--text2);text-align:center;margin-top:8px">✕ pro zavření bez uložení</div>
  </div>`;
}

// Kategorie pro položky účtenky – klíčová slova
const RP_ITEM_CATS = {
  'Jídlo & Nákupy':   ['rohlík','chléb','chleba','mléko','sýr','máslo','jogurt','vejce','maso','kuře','vepř','hovězí','ryba','zelenina','ovoce','brambor','rýže','těstovin','mouka','cukr','olej','káva','čaj','džus','čokoláda','sušenk','chipsy','müsli','med','jam','ovocn','jogobella','salám','šunka','párek','klobás','kroket'],
  'Jídlo & Pití':     ['pivo','víno','sekt','limonáda','coca','pepsi','sprite','fanta','red bull','monster','vodka','rum','whisky','gin','alko'],
  'Drogerie':         ['šampon','kondicionér','gel','mýdlo','zubní','pasta','kartáček','deo','deodorant','parfém','krém','makeup','rtěnk','kosmetik','toaletní','papír','hygien','vložk','tampon','plena','pampers'],
  'Domácí mazlíček':  ['granule','krmivo','pamlsk','kočka','pes','králík','morče','rybičk','seno','podestýlk','akvárium','vitakraft','versele','whiskas','purina','pedigree','aniland','vločky hrachov'],
  'Domácí potřeby':   ['jar','fairy','prací','aviváž','domestos','ajax','mr.muscle','wc','čistič','prostředek','sponge','houba','pytel','sáček','utěrka','alumin','fólie','pergamen'],
  'Zdraví':           ['ibuprofen','paralen','acylpyrin','vitamin','lék','tablety','kapky','sirup','náplast','obvaz','teploměr','magistra','benu'],
  'Elektronika':      ['baterie','nabíječ','kabel','sluchátk','myš','klávesnic','reproduktor','flash','sd karta','usb'],
  'Oblečení':         ['tričko','ponožk','spodní','podprsenk','kalhoty','košile','boty','tenisky','sandál','ponožky'],
};

// Mapování RP_ITEM_CATS name → catId z S.categories
function getRpCatId(itemCatName) {
  const D = getData();
  if(!D.categories) return '';
  // Přímá shoda jménem
  const direct = D.categories.find(c=>c.name===itemCatName);
  if(direct) return direct.id;
  // Fuzzy: obsahuje klíčové slovo
  const fuzzy = D.categories.find(c=>
    itemCatName.toLowerCase().includes(c.name.toLowerCase()) ||
    c.name.toLowerCase().includes(itemCatName.toLowerCase().replace('&','').trim())
  );
  return fuzzy?.id || '';
}

//  S23 (Milan): „V ANALÝZE ÚČTENEK JE 2× KATEGORIE NÁKUP – PROČ?"
//  Protože existovaly dvě různé věci se stejným jménem: skutečná kategorie
//  🛍️ Nákup (cat23, výchozí sada) a VIRTUÁLNÍ 📦 Nákup = prázdné itemCatId,
//  kterou jsem v S22 zavedl jako náhradu za „Ostatní". Položky z AI paměti
//  padaly do první, nezařazené do druhé, a editor je poctivě seskupil zvlášť.
//  Nově je Nákup JEDEN: nezařazená položka dostane rovnou id skutečné
//  kategorie. Virtuální 📦 zůstává jen jako nouzovka pro uživatele, který
//  si kategorii Nákup smazal.
function rpNakupCat(D){
  D = D || getData();
  const cats = (D.categories||[]).filter(c => c.type==='expense' || c.type==='both' || !c.type);
  return cats.find(c => c.id==='cat23' && /^n[aá]kup$/i.test((c.name||'').trim()))
      || cats.find(c => /^n[aá]kup$/i.test((c.name||'').trim()))
      || null;
}
window.rpNakupCat = rpNakupCat;

//  S24 (TODO-312, Mapa položek F3) – POŘADÍ ZAŘAZENÍ POLOŽKY:
//    1) osobní volba uživatele (categoryMappings)
//    2) komunitní mapa (community/productMap) – jen NÁVRH, předvyplní se
//    3) klíčová slova
//    4) 🛍️ Nákup
//  Osobní vrstvou je dosavadní učení kategorií, ne nový uzel productPrefs:
//  obojí by ukládalo totéž (klíč položky → kategorie) a dvě místa by se
//  rozcházela – přesně chyba, kterou F1 odstraňovala.
//  Výjimka: starý automatický záznam „→ Nákup" (bez zdroje) není rozhodnutí,
//  jen uložené „nevím". Kdyby vyhrával, komunitní mapa by se k položce nikdy
//  nedostala.
function rpOsobniVolba(cached, D) {
  if(!cached || !cached.catId) return null;
  const cat = (D.categories||[]).find(c=>c.id===cached.catId);
  if(!cat) return null;
  const nk = rpNakupCat(D);
  if(nk && cat.id===nk.id && cached.zdroj!=='uzivatel') return null;
  return cat;
}
window.rpOsobniVolba = rpOsobniVolba;

//  Návrh z komunitní mapy převedený na UŽIVATELOVU kategorii. Mapa nese id
//  kategorie z výchozí sady (cat1…cat23); vlastní kategorie admina ostatní
//  nemají, takový návrh se tiše přeskočí. Podkategorie jen když ji uživatel má.
//  S24 (T3): návrh vede přes TAXONOMII. Záznam mapy ukazuje na obecný název
//  (obecnyId) → podkategorie. Rozpočtová kategorie se bere v pořadí:
//    uživatelův převod podkategorie (taxRozpocet) → výchozí z taxonomie →
//    catId záznamu (starší záznamy bez taxonomie).
//  Když položka v mapě vůbec není, zkusí se taxonomie přímo podle názvu –
//  ale jen jistá shoda (přesně / všechna slova), ne zkratka z pokladny.
//  S24 (v11.23, Milan: „Mapa ukázala Mandle u mléčné čokolády s mandlemi"):
//  pořadí zařazení do taxonomie: komunitní mapa (admin) → ČÁROVÝ KÓD (obecný
//  název, který AI vybrala jednou pro celou komunitu podle skutečného výrobku)
//  → odhad podle názvu na účtence. Konkrétní název: z mapy, jinak český název
//  výrobku z kódu.
function rpMapaNavrh(itemName, D, ean) {
  const z = (typeof lookupProductMap === 'function') ? lookupProductMap(itemName) : null;
  let tax = (z && z.obecnyId && typeof taxInfo === 'function') ? taxInfo(z.obecnyId) : null;
  let zdrojTax = tax ? 'mapa' : '';
  const ep = (ean && typeof eanProduktZCache === 'function') ? eanProduktZCache(ean) : null;
  if(!tax && ep && ep.obecnyId && typeof taxInfo === 'function') { tax = taxInfo(ep.obecnyId); if(tax) zdrojTax = 'ean'; }
  if(!z && !tax && typeof taxNavrh === 'function') {
    const n = taxNavrh(itemName);
    if(n && (n.jistota === 'presne' || n.jistota === 'slova' || n.jistota === 'tvar')) { tax = n.info; zdrojTax = 'nazev'; }
  }
  if(!z && !tax && !ep) return null;
  D = D || getData();
  const cats = D.categories || [];
  const prevod = (tax && typeof taxRozpocetUzivatel === 'function') ? taxRozpocetUzivatel(tax.podId) : '';
  const cat = [prevod, tax && tax.rozpocet, z && z.catId].filter(Boolean)
    .map(id => cats.find(c => c.id === id)).find(Boolean) || null;
  const subcat = (cat && z && z.subcat && (cat.subs||[]).includes(z.subcat)) ? z.subcat : '';
  return { catId: cat?cat.id:'', catName: cat?cat.name:'', subcat,
           obecny: (tax && tax.nazev) || (z && z.obecny) || '',
           konkretni: (z && z.konkretni) || (ep && typeof eanNazevVyrobku === 'function' ? eanNazevVyrobku(ep, ean) : '') || '',
           tax, zdrojTax, podlePrevodu: !!(prevod && cat && cat.id === prevod) };
}
//  Řetěz pro zobrazení: „🛒 Potraviny › Pečivo › rohlík".
function rpTaxRetez(m) {
  if(!m) return '';
  if(m.tax) return [m.tax.ikona + ' ' + m.tax.oblastNazev, m.tax.podNazev, m.tax.nazev].join(' › ');
  return [m.obecny, m.konkretni].filter(Boolean).join(' → ');
}
window.rpTaxRetez = rpTaxRetez;
window.rpMapaNavrh = rpMapaNavrh;

//  Zapíše výsledek guessItemCatId do položky editoru (jediné místo – dřív se
//  pole přiřazovala na třech místech zvlášť).
function rpPriradOdhad(it, g) {
  it.itemCat = g.catName;
  it.itemCatId = g.catId;
  it._fromMemory = !!g.fromMemory;
  it._fromMap = !!g.fromMap;
  it._mapa = g.mapa || null;
  if(g.subcat && !it.itemSubcat) it.itemSubcat = g.subcat;
}

function guessItemCatId(itemName, receiptCat, ean) {
  const D = getData();
  // 1. Osobní volba (učení kategorií)
  const cat1 = rpOsobniVolba(lookupCategoryMapping(itemName), D);
  if(cat1) {
    const c = lookupCategoryMapping(itemName);
    const subcat = (c.subcat && (cat1.subs||[]).includes(c.subcat)) ? c.subcat : '';
    return {catId: cat1.id, catName: cat1.name, subcat, fromMemory: true};
  }
  // 2. Komunitní mapa – návrh
  const m = rpMapaNavrh(itemName, D, ean);
  if(m && m.catId) {
    return {catId: m.catId, catName: m.catName, subcat: m.subcat, fromMemory: false, fromMap: true, mapa: m};
  }
  // 3. Keyword match → catId
  const n = (itemName||'').toLowerCase();
  for(const [catName, keys] of Object.entries(RP_ITEM_CATS)) {
    if(keys.some(k=>n.includes(k))) {
      const catId = getRpCatId(catName);
      return {catId, catName, fromMemory: false};
    }
  }
  // 4. Fallback – S22 (Milan): dřív „Ostatní". U nákupu v potravinách tak
  //    skončily VŠECHNY položky v Ostatní a uživatel musel každou ručně
  //    přepnout. Nově se nejdřív zkusí kategorie celé účtenky (Kaufland →
  //    Jídlo & Nákupy), takže položky rovnou sednou tam, kam patří.
  //    Teprve když ani ta není, použije se obecný „Nákup" místo „Ostatní“.
  //    S23 (Milan): nezařazené položky jdou PRIMÁRNĚ do 🛍️ Nákup – ne do
  //    kategorie celé účtenky. Účtenka z Kauflandu má kategorii Jídlo & Nákupy,
  //    ale položka, kterou appka nepoznala, může být klidně prací prášek;
  //    tvrdit o ní „jídlo" je odhad vydávaný za fakt. Nákup je poctivé „nevím".
  const nk = rpNakupCat(D);
  if(nk) return {catId: nk.id, catName: nk.name, fromMemory: false};
  return {catId:'', catName:'Nákup', fromMemory: false};
}

function guessItemCategory(name, receiptCat) {
  return guessItemCatId(name, receiptCat).catName;
}

// ── TODO-008: Validace JSON odpovědí z AI ──
// Zajišťuje že AI vrátila správný formát před dalším zpracováním
//  S25: 14 krajů ČR (krátké názvy). Cokoli mimo seznam = stát/zahraničí, nebo nic.
const RCPT_KRAJE = ['Praha', 'Středočeský', 'Jihočeský', 'Plzeňský', 'Karlovarský', 'Ústecký', 'Liberecký', 'Královéhradecký', 'Pardubický', 'Vysočina', 'Jihomoravský', 'Olomoucký', 'Zlínský', 'Moravskoslezský'];
function rcptKraj(t) {
  const s = String(t || '').trim(); if (!s) return '';
  const n = x => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\bkraj\b|\bhlavni mesto\b/g, '').trim();
  const k = n(s); if (k === 'kraj vysocina' || k === 'vysocina') return 'Vysočina';
  const hit = RCPT_KRAJE.find(x => n(x) === k || k.startsWith(n(x)));
  if (hit) return hit;
  return /^(slovensko|slovakia|polsko|poland|rakousko|austria|nemecko|germany|madarsko|hungary)$/i.test(k) ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
function rcptPobockaNorm(r) {
  const t = (v, n) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null') ? v.trim().slice(0, n) : '';
  const a = t(r.storeAddress, 120), c = t(r.storeCity, 60), k = rcptKraj(r.storeRegion), i = t(r.storeIco, 12).replace(/\D/g, '');
  delete r.storeAddress; delete r.storeCity; delete r.storeRegion; delete r.storeIco;   // žádné prázdné / null do Firebase
  if (a) r.storeAddress = a; if (c) r.storeCity = c; if (k) r.storeRegion = k; if (i.length === 8) r.storeIco = i;
  return r;
}
window.RCPT_KRAJE = RCPT_KRAJE; window.rcptKraj = rcptKraj; window.rcptPobockaNorm = rcptPobockaNorm;

function validateReceiptJSON(r) {
  if(!r || typeof r !== 'object') throw new Error('Odpověď není objekt');
  // store – fallback na 'Neznámý obchod'
  if(!r.store || typeof r.store !== 'string') r.store = 'Neznámý obchod';
  //  S25 (katalog krok 3): pobočka – adresa, město, kraj, IČO z hlavičky účtenky
  rcptPobockaNorm(r);
  // total – musí být číslo nebo null
  if(r.total !== null && r.total !== undefined) {
    r.total = parseFloat(r.total);
    if(isNaN(r.total)) r.total = null;
  }
  // date – základní formát YYYY-MM-DD nebo null
  if(r.date && !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) r.date = null;
  // items – musí být pole
  if(!Array.isArray(r.items)) r.items = [];
  // Validace a normalizace každé položky
  r.items = r.items
    .filter(it => it && typeof it === 'object' && it.name)
    .map(it => ({
      name: String(it.name||'').trim().slice(0,80),
      price: Math.abs(parseFloat(it.price)||0),
      qty: parseFloat(it.qty)||1,
      ...(/^(kg|l)$/i.test(String(it.unit||'')) ? { unit: String(it.unit).toLowerCase() } : {}),   // S25: vážené zboží
      itemCat: it.itemCat || '',
      itemCatId: it.itemCatId || '',
    }))
    .filter(it => it.price > 0); // přeskočit položky bez ceny (záhlaví, daňové řádky)
  // Dopočítej total pokud chybí
  if(!r.total && r.items.length) {
    r.total = Math.round(r.items.reduce((a,it)=>a+lineAmt(it),0)*100)/100;
  }
  if(!r.total) throw new Error('Nepodařilo se rozpoznat celkovou částku');
  return r;
}

function validateAiCatJSON(j) {
  if(!j || typeof j !== 'object') throw new Error('Odpověď není objekt');
  if(!j.catId || typeof j.catId !== 'string') throw new Error('Chybí catId');
  if(!j.catName) j.catName = j.catId;
  if(!['high','mid','low'].includes(j.confidence)) j.confidence = 'mid';
  if(!j.reason) j.reason = '';
  if(!j.subcat) j.subcat = '';
  // S12.1: COICOP oddíl 1-13 (volitelný)
  j.coicop = parseInt(j.coicop);
  if(!(j.coicop >= 1 && j.coicop <= 13)) j.coicop = null;
  return j;
}


function rpItemSubcatOptions(catId) {
  const D = getData();
  const cat = (D.categories||[]).find(c=>c.id===catId);
  if(!cat || !(cat.subs||[]).length) return '';
  return `<option value="">— podkat. —</option>` +
    cat.subs.map(s=>`<option value="${s}">${s}</option>`).join('');
}

// ── ITEM STATS – Firebase agregát ──
// Ukládá se do users/{uid}/itemStats/{normKey}
// {name, count, totalSpent, avgPrice, lastDate, catId, history:[{date,price,qty}]}
async function updateItemStats(items, date) {
  if(!items?.length) return;
  const uid = window._currentUser?.uid; if(!uid) return;
  const idToken = await window._currentUser.getIdToken?.();
  if(!idToken) return;

  const patches = [];
  const processed = new Set();

  for(const it of items) {
    const rawName = (it.name||'').toLowerCase().trim();
    const key = normName(it.name) || rawName
      .replace(/\d+\s*(g|kg|ml|l|ks|cm|mm)\b/g,'')
      .replace(/[^a-záčďéěíňóřšťúůýž0-9\s]/g,'')
      .replace(/\s+/g,' ').trim().slice(0,30);
    if(key.length < 2 || processed.has(key)) continue;
    processed.add(key);

    const price = parseFloat(it.price)||0;
    const qty = parseFloat(it.qty)||1;
    if(price <= 0) continue;

    const fireKey = key.replace(/[.#$/\[\]]/g,'_');

    patches.push(
      fetch(`https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users/${uid}/itemStats/${fireKey}.json?auth=${idToken}`)
        .then(r=>r.ok?r.json():null)
        .then(existing => {
          const updated = {
            name: it.name||key,
            count: (existing?.count||0) + 1,
            totalSpent: Math.round(((existing?.totalSpent||0) + price*qty)*100)/100,
            avgPrice: 0,
            lastDate: date||new Date().toISOString().slice(0,10),
            catId: it.itemCatId||existing?.catId||'',
            subcat: it.subcat||it.itemSubcat||existing?.subcat||'',
          };
          updated.avgPrice = Math.round(updated.totalSpent/updated.count*100)/100;
          // Historie posledních 24 záznamů (pro trend grafu)
          const hist = [...(existing?.history||[]), {date:date||new Date().toISOString().slice(0,10), price, qty}].slice(-24);
          updated.history = hist;
          return fetch(
            `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users/${uid}/itemStats/${fireKey}.json?auth=${idToken}`,
            {method:'PUT', body:JSON.stringify(updated)}
          );
        })
    );
  }
  try { await Promise.all(patches); } catch(e){ console.warn('updateItemStats failed:', e); }
}

function rpAutoAssignCategories() {
  const r = window._editReceipt; if(!r?.items) return;
  r.items.forEach(it => {
    if(!it.itemCatId) { // nepřepisuj ruční přiřazení
      rpPriradOdhad(it, guessItemCatId(it.name, null, it.ean));
    }
  });
}

function rpRender() {
  const el = document.getElementById('rp_items'); if(!el) return;
  // FIX: Nepřekreslovat pokud je fokusovaný input (způsobuje blikání a ztrátu hodnoty na mobilu)
  const focused = document.activeElement;
  // FIX: Blokuj re-render jen pro TEXT inputy (zabraňuje ztrátě kurzoru při psaní).
  // SELECT a ostatní prvky NEVYLUČUJ – jinak se nevykreslí subkat po změně kategorie.
  const isTextInput = focused && (focused.tagName==='INPUT' && focused.type!=='number') && focused.closest('#rp_items');
  if(isTextInput) return;
  const r = window._editReceipt;
  if(!r?.items?.length) {
    el.innerHTML = '<div style="font-size:.78rem;color:var(--text2);padding:8px 0">Žádné položky · klikněte Přidat</div>';
    return;
  }

  const D = getData();
  // Sestavení option listu z uživatelských kategorií
  const userCats = (D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  const catOptions = userCats.map(c=>`<option value="${c.id}" data-name="${c.name}">${c.icon} ${c.name}</option>`).join('');
  //  S23: virtuální 📦 Nákup se nabízí JEN když skutečná kategorie Nákup chybí.
  const _nk = rpNakupCat(D);
  const catOptionsAll = (_nk ? '' : `<option value="">📦 Nákup</option>`) + catOptions;
  //  Starší účtenky mají nezařazené položky s prázdným id → převést na skutečný
  //  Nákup, jinak by se dál kreslily jako druhá skupina. Uloží se s účtenkou.
  if(_nk) r.items.forEach(it => { if(!it.itemCatId){ it.itemCatId = _nk.id; it.itemCat = _nk.name; } });

  // Seskup položky dle itemCatId/itemCat pro přehlednost
  const groups = {};
  r.items.forEach((it, i) => {
    const key = it.itemCatId || '__other__';
    const label = it.itemCat || 'Nákup';
    if(!groups[key]) groups[key] = {label, items:[], catId:it.itemCatId||''};
    groups[key].items.push({it, i});
  });

  let html = '';
  for(const [key, group] of Object.entries(groups)) {
    const cat = userCats.find(c=>c.id===key);
    if(cat) group.label = cat.name;
    const icon = cat?.icon || '📦';
    const color = cat?.color || '#6b7280';
    const catTotal = group.items.reduce((a,{it})=>a+lineAmt(it),0);
    html += `
      <div style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:2px solid ${color}44;margin-bottom:4px">
          <span style="font-size:.9rem">${icon}</span>
          <span style="font-weight:700;font-size:.82rem;flex:1;color:var(--text)">${group.label}</span>
          <span style="font-size:.76rem;color:var(--expense);font-weight:600">${fmtP(catTotal)} Kč</span>
        </div>`;
    group.items.forEach(({it, i}) => {
      //  S24: 🗺️ = návrh z komunitní mapy. Jen předvyplněno – potvrdit stačí
      //  nechat, změnit = změnit kategorii (tím vznikne vlastní volba).
      const _mp = it._fromMap && it._mapa;
      const fromMem = it._fromMemory ? `<span title="Tvoje volba z dřívějška" style="font-size:.55rem;color:var(--income);margin-left:2px">🧠</span>`
        : _mp ? `<span title="${escHtml((it._mapa.zdrojTax==='nazev' ? 'Podle názvu v taxonomii' : 'Návrh z komunitní Mapy položek') + ': ' + rpTaxRetez(it._mapa) + (it._mapa.konkretni && it._mapa.tax ? ' · ' + it._mapa.konkretni : '') + '. Když nesedí, změň kategorii – zapamatuje se jako tvoje volba.')}" style="font-size:.6rem;color:#60a5fa;margin-left:2px">${it._mapa.zdrojTax==='nazev'?'🧭':'🗺️'}</span>` : '';
      html += `
        <div style="display:flex;align-items:center;gap:5px;padding:5px 2px;border-bottom:1px solid var(--border)" id="rp_item_${i}">
          <input id="rp_name_${i}"
            value="${(it.name||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}"
            placeholder="Název položky"
            title="${rpIsGenericName(it.name)?'Obecný název (oddělení, ne výrobek) – do sledování cen se nepočítá. Přepiš na konkrétní výrobek s gramáží.':''}"
            style="flex:1;background:var(--surface2);border:1px ${rpIsGenericName(it.name)?'dashed #60a5fa':'solid var(--border)'};border-radius:7px;padding:6px 8px;color:var(--text);font-size:.78rem;min-width:130px"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
          <div style="position:relative;flex-shrink:0;display:flex;gap:3px">
            <select id="rp_cat_${i}"
              style="background:var(--surface2);border:1px solid ${it.itemCatId?color:'var(--border)'};border-radius:7px;padding:5px 4px;color:var(--text2);font-size:.68rem;max-width:100px">
              ${catOptionsAll.replace(`value="${it.itemCatId||''}"`,`value="${it.itemCatId||''}" selected`)}
            </select>
            <select id="rp_subcat_${i}"
              style="background:var(--surface2);border:1.5px solid ${it.itemCatId?color+'66':'var(--border)'};border-radius:7px;padding:5px 4px;color:var(--text2);font-size:.7rem;max-width:90px;font-weight:500${!it.itemCatId?';opacity:.4':''}">
              ${rpItemSubcatOptions(it.itemCatId||'').replace(`value="${it.itemSubcat||''}"`,`value="${it.itemSubcat||''}" selected`)}
            </select>
            ${fromMem}
          </div>
          ${(() => { const vaz = rpVazene(it);   // S25: vážené zboží – v poli ČÁSTKA Z ÚČTENKY, ne cena za kg
            return `<input id="rp_qty_${i}" type="number"
            value="${it.qty||1}" min="${vaz ? '0.001' : '1'}" step="${vaz ? 'any' : '1'}"
            style="width:${vaz ? 54 : 42}px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 4px;color:var(--text);font-size:.78rem;text-align:center"
            inputmode="decimal">
          <span style="font-size:.68rem;color:var(--text2);flex-shrink:0">${vaz ? escHtml(rpVazJed(it)) : 'ks'}</span>
          <input id="rp_price_${i}" type="number"
            value="${vaz ? (Math.round(lineAmt(it) * 100) / 100) : (it.price||0)}" min="0" step="0.01"
            title="${vaz ? 'Částka za položku, jak je na účtence' : 'Cena za kus'}"
            style="width:68px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 6px;color:var(--text);font-size:.82rem;text-align:right;-moz-appearance:textfield"
            inputmode="decimal">
          <span style="font-size:.68rem;color:var(--text2);flex-shrink:0;line-height:1.1;text-align:left">Kč${vaz ? `<br><span id="rp_pkg_${i}" style="font-size:.58rem;color:#a8aec8;white-space:nowrap">${fmtP(it.price||0)}/${escHtml(rpVazJed(it))}</span>` : ''}</span>`; })()}
          <input id="rp_tag_${i}" type="text"
            value="${it.tag||''}"
            placeholder="🏷️ tag"
            style="width:72px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 6px;color:var(--income);font-size:.72rem;font-style:italic"
            list="rp_tag_suggestions"
            title="Vlastní tag (např. Kafe, Jogurt, Svačina...)"
            onfocus="this.placeholder=''"
            onblur="if(!this.value)this.placeholder='🏷️ tag'">
          ${/* S24 (TODO-308): čárový kód z obalu → co to doopravdy je + spojení mezi obchody */''}
          <button onclick="eanSkenuj(${i})" title="${it.ean ? escHtml('Kód '+it.ean+(it.eanNazev?' · '+it.eanNazev:'')+' – klepni pro změnu') : 'Vyfotit čárový kód z obalu'}"
            style="background:${it.ean?'#34d39922':'var(--surface2)'};border:1px solid ${it.ean?'#34d39966':'var(--border)'};border-radius:7px;cursor:pointer;font-size:.8rem;padding:4px 6px;flex-shrink:0;color:var(--text)">${it.ean?'✅':'📷'}</button>
          <button onclick="rpRemoveItem(${i})" style="background:none;border:none;color:var(--expense);cursor:pointer;font-size:1rem;padding:2px;flex-shrink:0">✕</button>
        </div>`;
    });
    html += '</div>';
  }
  //  S24 (v11.09): skenování kódu bylo „zapadlé" – bez vysvětlení nikdo netušil,
  //  k čemu 📷 u položky je. Tip se ukazuje, dokud ho uživatel nezavře.
  let _eanTip = '';
  try { if(!localStorage.getItem('ff_eanTipSkryt') && !r.items.some(x=>x.ean)) _eanTip =
    '<div style="display:flex;gap:8px;align-items:flex-start;background:#60a5fa14;border:1px solid #60a5fa44;border-radius:9px;padding:8px 10px;margin-bottom:8px;font-size:.74rem;line-height:1.45;color:var(--text);max-width:600px">'
    + '<span>📷</span><span style="flex:1"><b>Tip:</b> klepni na 📷 u položky a vyfoť čárový kód z obalu. Appka zjistí přesný název, značku, složení a Nutri-Score a pozná stejný výrobek i v jiných obchodech.</span>'
    + '<button onclick="try{localStorage.setItem(\'ff_eanTipSkryt\',\'1\')}catch(e){};this.parentNode.remove()" style="background:none;border:1px solid var(--border);border-radius:6px;color:#a8aec8;font-size:.68rem;padding:2px 7px;cursor:pointer">Rozumím</button></div>'; } catch(e) {}
  el.innerHTML = _eanTip + '<div style="min-width:600px">' + html + '</div>';

  // Event listenery
  r.items.forEach((it, i) => {
    const nameEl  = document.getElementById('rp_name_'+i);
    const catEl   = document.getElementById('rp_cat_'+i);
    const qtyEl   = document.getElementById('rp_qty_'+i);
    const priceEl = document.getElementById('rp_price_'+i);

    if(nameEl) {
      nameEl.addEventListener('input',  () => { r.items[i].name = nameEl.value; });
      nameEl.addEventListener('change', () => {
        r.items[i].name = nameEl.value;
        // Auto-přiřaď kategorii pokud položka nemá přiřazenou
        if(!r.items[i].itemCatId) {
          rpPriradOdhad(r.items[i], guessItemCatId(nameEl.value));
          rpRender();
        }
      });
    }
    // Tag listener
    const tagEl = document.getElementById('rp_tag_'+i);
    if(tagEl) {
      tagEl.addEventListener('change', () => {
        r.items[i].tag = tagEl.value.trim();
        // Ulož tag mapování do community Firebase
        if(r.items[i].name && tagEl.value.trim()) {
          saveItemTagMapping(r.items[i].name, tagEl.value.trim());
        }
      });
    }
    if(catEl) {
      catEl.addEventListener('change', () => {
        const selectedId = catEl.value;
        const D2 = getData();
        const selectedCat = D2.categories?.find(c=>c.id===selectedId);
        r.items[i].itemCatId = selectedId;
        r.items[i].itemCat = selectedCat?.name || 'Nákup';
        r.items[i]._fromMemory = false;
        r.items[i]._fromMap = false;
        r.items[i]._rucne = true;    // S24: rozhodl uživatel → uloží se jako jeho volba
        r.items[i].itemSubcat = ''; // reset subcat při změně kategorie
        if(r.items[i].name && selectedId) {
          saveCategoryMapping(r.items[i].name, selectedId, '', 'uzivatel');
        }
        catEl.blur(); // FIX: uvolni fokus → rpRender() nebude blokován
        rpRender();
      });
    }
    const subcatEl = document.getElementById('rp_subcat_'+i);
    if(subcatEl) {
      subcatEl.addEventListener('change', () => {
        r.items[i].itemSubcat = subcatEl.value;
        //  S24: i výběr podkategorie je rozhodnutí – dřív se nepamatoval vůbec.
        r.items[i]._rucne = true; r.items[i]._fromMap = false;
        if(r.items[i].name && r.items[i].itemCatId) {
          saveCategoryMapping(r.items[i].name, r.items[i].itemCatId, subcatEl.value, 'uzivatel');
        }
      });
    }
    //  S25: vážené zboží – částka za položku (z účtenky) zůstává, cena za kg se dopočítá
    const vaz = rpVazene(it);
    const pkg = () => { const e = document.getElementById('rp_pkg_'+i); if (e) e.textContent = fmtP(r.items[i].price||0) + '/' + rpVazJed(r.items[i]); };
    if(qtyEl && vaz) {
      const q = () => { const v = parseFloat(String(qtyEl.value).replace(',', '.')); if (!(v > 0)) return;
        const tot = lineAmt(r.items[i]); r.items[i].qty = v; r.items[i].lineTotal = tot; r.items[i].price = Math.round(tot / v * 100) / 100; pkg(); rpUpdateTotal(); };
      qtyEl.addEventListener('input', q); qtyEl.addEventListener('change', q);
    }
    if(priceEl && vaz) {
      const p = () => { const v = parseFloat(String(priceEl.value).replace(',', '.')); if (!(v >= 0)) return;
        const q = parseFloat(r.items[i].qty) || 1; r.items[i].lineTotal = Math.round(v * 100) / 100; r.items[i].price = Math.round(v / q * 100) / 100; pkg(); rpUpdateTotal(); };
      priceEl.addEventListener('input', p); priceEl.addEventListener('change', p);
    }
    if(qtyEl && !vaz) {
      qtyEl.addEventListener('input',  () => { r.items[i].qty = parseFloat(qtyEl.value)||1; rpUpdateTotal(); });
      qtyEl.addEventListener('change', () => { r.items[i].qty = parseFloat(qtyEl.value)||1; rpUpdateTotal(); });
    }
    if(priceEl && !vaz) {
      priceEl.addEventListener('input',  () => { r.items[i].price = parseFloat(priceEl.value)||0; rpUpdateTotal(); });
      priceEl.addEventListener('change', () => { r.items[i].price = parseFloat(priceEl.value)||0; rpUpdateTotal(); });
    }
  });

  // Datalist pro tag suggestions (z community + uživatelovy historické tagy)
  const existingTags = [...new Set((window._editReceipt?.items||[]).map(it=>it.tag).filter(Boolean))];
  const communityTagSuggestions = window._communityTagSuggestions || [];
  const allTagSuggestions = [...new Set([...existingTags, ...communityTagSuggestions])];
  el.insertAdjacentHTML('beforeend', `<datalist id="rp_tag_suggestions">
    ${allTagSuggestions.map(t=>`<option value="${t}">`).join('')}
    <option value="Kafe"><option value="Jogurt"><option value="Pečivo"><option value="Maso">
    <option value="Zelenina"><option value="Ovoce"><option value="Nápoje"><option value="Svačina">
    <option value="Drogerie"><option value="Kosmetika"><option value="Léky"><option value="Čistění">
  </datalist>`);

  rpUpdateTotal();
}

// Uložení tag mapování do community Firebase
async function saveItemTagMapping(itemName, tag) {
  if(!itemName || !tag) return;
  // Klíč: lowercase, bez diakritiky, bez speciálních znaků, max 30 znaků
  //  S23 (PLAN F1): jednotný klíč – tagy položek jsou základ „obecného názvu"
  //  v budoucí Mapě produktů, takže musí sedět s ostatními místy.
  const key = normName(itemName) || itemName.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\d+\s*(g|kg|ml|l|ks)\b/g,'')
    .replace(/[^a-z0-9\s]/g,'')
    .replace(/\s+/g,'_').trim().replace(/_+$/,'').slice(0,30);
  if(!key || key.length < 2) return;
  const tagKey = tag.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/gi,'').replace(/\s+/g,'_').toLowerCase().slice(0,20);
  if(!tagKey) return;

  try {
    const uid = window._currentUser?.uid; if(!uid) return;
    const idToken = await window._currentUser.getIdToken?.();
    // Načti aktuální počet
    const res = await fetch(
      `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/community/itemTags/${key}/${tagKey}.json?auth=${idToken}`
    );
    const current = res.ok ? (await res.json())||0 : 0;
    // Ulož increment
    await fetch(
      `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/community/itemTags/${key}/${tagKey}.json?auth=${idToken}`,
      {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(typeof current==='number'?current+1:1)}
    );
  } catch(e) { console.warn('saveItemTagMapping failed:', e?.message); }
}

// Oddělené handlery – zachovány pro zpětnou kompatibilitu
function rpPobocka(pole, v) {   // S25: město / kraj pobočky v editoru (prázdné = smazat, žádné '' do Firebase)
  const r = window._editReceipt; if (!r) return;
  v = String(v || '').trim().slice(0, 60);
  if (v) r[pole] = v; else delete r[pole];
}
window.rpPobocka = rpPobocka;
function rpItemName(i, val) { if(window._editReceipt?.items?.[i]) window._editReceipt.items[i].name = val; }
// Session 10: varování když je datum účtenky v budoucnosti (špatně přečtené AI)
function rpCheckFutureDate(){
  const warn=document.getElementById('rp_future_warn'); if(!warn) return;
  const v=window._editReceipt?.date;
  const isFuture = v && new Date(v) > new Date(new Date().setHours(23,59,59,999));
  warn.style.display = isFuture ? 'flex' : 'none';
}
function rpItemQty(i, val)  { if(window._editReceipt?.items?.[i]) { window._editReceipt.items[i].qty = parseFloat(val)||1; rpUpdateTotal(); } }
function rpItemPrice(i, val){ if(window._editReceipt?.items?.[i]) { window._editReceipt.items[i].price = parseFloat(val)||0; rpUpdateTotal(); } }

//  S22 (Milan): DŘÍV TU BYL TICHÝ PŘEPIS NATIŠTĚNÉ ČÁSTKY.
//  Funkce nastavovala r.total = součet položek. I kdyby analyzér přečetl
//  „CELKEM 1 490,99" správně, první úprava kterékoli položky to číslo přepsala
//  součtem – a rozpor, který měla odhalit kontrola úplnosti, zmizel.
//  Nově se natištěná částka drží zvlášť v `printedTotal` a nikdy se nepřepisuje;
//  a když si uživatel částku výslovně zvolil (tlačítko „Použít částku
//  z účtenky"), drží ji zámek `_totalLocked` a součet položek ji nepřebije.
function rpUpdateTotal() {
  const r = window._editReceipt; if(!r) return;
  const sum = Math.round((r.items||[]).reduce((a,it)=>a+lineAmt(it),0)*100)/100;
  if(!r._totalLocked) r.total = sum;
  const el = document.getElementById('rp_total_display');
  if(el) el.textContent = '−' + fmtP(r.total||0) + ' Kč';
  if(typeof rpRenderCheck==='function') rpRenderCheck();
}

function rpAddItem() {
  if(!window._editReceipt.items) window._editReceipt.items = [];
  const _nk = rpNakupCat();
  window._editReceipt.items.push({name:'', price:0, qty:1, itemCatId:_nk?.id||'', itemCat:_nk?.name||'Nákup'});
  rpRender();
  // Focus na nový input
  setTimeout(()=>{
    const last = document.getElementById('rp_item_'+(window._editReceipt.items.length-1));
    if(last) last.querySelector('input')?.focus();
  }, 50);
}

function rpRemoveItem(i) {
  window._editReceipt.items.splice(i,1);
  rpRender();
}

// Sdílený katalog položek
// Sdílený katalog – jen názvy položek ze skenování
let _itemCatalog = [];

async function loadItemCatalog() {
  try {
    const snap = await _get(_ref(_db, 'catalog/items'));
    if(snap.exists()) {
      // Katalog je objekt {key: {name:...}} – seřaď abecedně
      _itemCatalog = Object.values(snap.val())
        .map(v => typeof v === 'string' ? {name:v} : v)
        .filter(v => v.name)
        .sort((a,b) => a.name.localeCompare(b.name, 'cs'));
    }
  } catch(e) {}
}

async function rpShowCatalog(i, input) {
  const val = (input.value||'').toLowerCase().trim();
  const el = document.getElementById('rp_catalog_'+i); if(!el) return;
  if(_itemCatalog.length === 0) await loadItemCatalog();
  const matches = _itemCatalog
    .filter(it => val.length === 0 || it.name.toLowerCase().includes(val))
    .slice(0, 8);
  if(!matches.length) { el.style.display='none'; return; }
  el.style.display='block';
  el.innerHTML = matches.map(it=>`
    <div onclick="rpSelectItem(${i},'${it.name.replace(/'/g,"&#39;")}')"
      style="padding:7px 10px;cursor:pointer;font-size:.8rem;border-bottom:1px solid var(--border)"
      onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">
      <span style="font-weight:600">${it.name}</span>
    </div>`).join('');
}

function rpHideCatalog(i) {
  const el = document.getElementById('rp_catalog_'+i);
  if(el) el.style.display='none';
}

function rpSelectItem(i, name) {
  if(!window._editReceipt?.items?.[i]) return;
  window._editReceipt.items[i].name = name;
  rpHideCatalog(i);
  rpRender();
}

async function publishToCatalog(items) {
  // Přispěj do sdíleného katalogu – pouze názvy ze skenování
  if(!items?.length) return;
  try {
    const updates = {};
    items.forEach(it => {
      if(!it.name || it.name.length < 2 || it.name.length > 60) return;
      // Klíč = normalizovaný název
      const key = it.name.toLowerCase()
        .replace(/[^a-z0-9áčďéěíňóřšťúůýž\s]/g,'')
        .replace(/\s+/g,'_')
        .slice(0, 40);
      if(key.length < 2) return;
      updates['catalog/items/'+key] = {name: it.name};
    });
    if(Object.keys(updates).length > 0) {
      await _update(_ref(_db), updates);
      loadItemCatalog(); // obnov lokální cache
    }
  } catch(e) {}
}

//  Blok „doklad" v editoru účtenky: buď je fotka uschovaná (zobrazit/odstranit),
//  nebo jde vybrat. Nahrává se výhradně kliknutím uživatele.
//  S25 (Milan): fotky ke čerstvě naskenované účtence se uschovají JEDNÍM klepnutím (všechny,
//  bez otevírání alba), nebo samy při uložení, když je zapnuté automatické uschovávání.
//  Album se otevírá jen u účtenek z Historie, kde fotka ze skenu už není.
function rpFotky(r) { return r ? (Array.isArray(r.photoKeys) && r.photoKeys.length ? r.photoKeys : (r.photoKey ? [r.photoKey] : [])) : []; }
window.rpFotky = rpFotky;
function rpScanPro(r) { const s = window._rpScanFoto; return !!(s && r && r._scanTok && s.tok === r._scanTok && (s.blobs || []).length); }
function rpAutoDoklad() { return !!((S.uiCfg || {}).autoDoklad); }
function rpAutoDokladNastav(on) { S.uiCfg = S.uiCfg || {}; S.uiCfg.autoDoklad = !!on; save();
  if (typeof showToast === 'function') showToast(on ? '📎 Fotky nových účtenek se budou uschovávat samy' : 'Automatické uschovávání vypnuto');
  if (typeof rpRender === 'function' && window._editReceipt) rpRender(); }
window.rpAutoDokladNastav = rpAutoDokladNastav;

function rpArchivBlok(r) {
  const keys = rpFotky(r);
  if (keys.length) {
    return `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:6px;padding:7px 9px;border-radius:9px;background:var(--surface2)">
      <span style="font-size:.76rem;color:#c9cede">📎 Doklad uschovaný${keys.length > 1 ? ` (${keys.length} fotky)` : ''}</span>
      <button type="button" class="btn btn-ghost btn-sm" style="font-size:.72rem" onclick="rpArchivZobraz()">👁️ Zobrazit</button>
      <button type="button" class="btn btn-ghost btn-sm" style="font-size:.72rem;color:var(--expense)" onclick="rpArchivOdstran()">🗑️ Odstranit</button>
    </div>`;
  }
  const auto = rpAutoDoklad();
  const prepinac = `<label style="display:flex;align-items:center;gap:6px;font-size:.7rem;color:#a8aec8;margin-top:6px;cursor:pointer"><input type="checkbox" ${auto ? 'checked' : ''} onchange="rpAutoDokladNastav(this.checked)"> uschovávat fotky účtenek automaticky</label>`;
  if (rpScanPro(r)) {
    const n = window._rpScanFoto.blobs.length;
    return `<div style="margin-top:6px">
      ${auto ? `<div style="font-size:.74rem;color:#c9cede">📎 ${n > 1 ? n + ' fotky se uschovají' : 'Fotka se uschová'} při uložení účtenky</div>`
             : `<button type="button" class="btn btn-ghost btn-sm" style="font-size:.72rem" onclick="rpArchivUlozScan()">📌 Uschovat ${n > 1 ? 'fotky účtenky (' + n + ')' : 'fotku účtenky'}</button>
                <span style="font-size:.68rem;color:#a8aec8;margin-left:7px">kvůli záruce – uloží se zmenšené</span>`}
      ${prepinac}
      <div id="rp_archiv_stav" style="font-size:.72rem;color:#a8aec8;margin-top:4px"></div>
    </div>`;
  }
  return `<div style="margin-top:6px">
    <label class="btn btn-ghost btn-sm" style="font-size:.72rem;cursor:pointer;display:inline-flex;align-items:center;gap:5px">
      📌 Přidat fotku dokladu<input type="file" accept="image/*" multiple style="display:none" onchange="rpArchivNahraj([...this.files])"></label>
    <span style="font-size:.68rem;color:#a8aec8;margin-left:7px">kvůli záruce – uloží se zmenšená fotka</span>
    ${prepinac}
    <div id="rp_archiv_stav" style="font-size:.72rem;color:#a8aec8;margin-top:4px"></div>
  </div>`;
}
window.rpArchivBlok = rpArchivBlok;

//  S25: nahraje 1..N fotek k účtence (klíče do photoKeys, photoKey = první kvůli Dokladům a starým verzím)
async function archivUlozVse(files, receiptId) {
  const keys = []; let bajtu = 0, posl = null;
  for (const f of files) { const v = await archivUloz(f, receiptId || ''); keys.push(v.key); bajtu += v.bajtu || 0; posl = v; }
  return { keys, bajtu, pocet: posl && posl.pocet, limit: posl && posl.limit };
}
function rpPripojFotky(r, v) {
  const keys = rpFotky(r).concat(v.keys);
  r.photoKeys = keys; r.photoKey = keys[0]; r.photoAt = Date.now(); r.photoBytes = (r.photoBytes || 0) + v.bajtu;
}
function _rpJakoSoubor(b) { return b instanceof File ? b : new File([b], 'uctenka.jpg', { type: b.type || 'image/jpeg' }); }

async function rpArchivNahraj(files) {
  const r = window._editReceipt; files = (Array.isArray(files) ? files : [files]).filter(Boolean);
  if (!r || !files.length) return;
  const stav = document.getElementById('rp_archiv_stav');
  if (stav) stav.textContent = files.length > 1 ? `⏳ Ukládám ${files.length} fotky…` : '⏳ Ukládám doklad…';
  try {
    const v = await archivUlozVse(files, r.id);
    rpPripojFotky(r, v);
    // už uložená účtenka (úprava z Historie) dostane klíče hned – nečeká na „Uložit“ v editoru
    const ul = (S.receipts || []).find(x => x && r.id && x.id === r.id);
    if (ul) { ul.photoKeys = r.photoKeys; ul.photoKey = r.photoKey; ul.photoAt = r.photoAt; ul.photoBytes = r.photoBytes; save(); }
    if (typeof rpRender === 'function') rpRender();
    if (typeof showToast === 'function') showToast(`📎 Uschováno ${v.keys.length > 1 ? v.keys.length + ' fotek' : ''} (${Math.round(v.bajtu/1024)} kB · ${v.pocet}/${v.limit})`);
  } catch (e) {
    if (stav) stav.textContent = '⚠️ ' + e.message;
  }
}
window.rpArchivNahraj = rpArchivNahraj;
function rpArchivUlozScan() {
  const r = window._editReceipt; if (!rpScanPro(r)) return;
  return rpArchivNahraj(window._rpScanFoto.blobs.map(_rpJakoSoubor));
}
window.rpArchivUlozScan = rpArchivUlozScan;

//  Automatické uschování při uložení účtenky (addReceiptAsTx) – na pozadí, chyba nic nezastaví.
async function rpArchivAuto(ulozena, scanTok) {
  try {
    const s = window._rpScanFoto;
    if (!rpAutoDoklad() || !ulozena || rpFotky(ulozena).length || !s || s.tok !== scanTok) return;
    const v = await archivUlozVse(s.blobs.map(_rpJakoSoubor), ulozena.id);
    //  S25 (v11.48, Milan: „účtenka se neuložila, i když mám automatické uschovávání“):
    //  během nahrávání proběhla synchronizace a S.receipts obsahuje NOVÉ objekty – klíče fotek
    //  se zapsaly do starého (odpojeného) objektu a save() je neuložil. Fotka ležela v úložišti
    //  bez odkazu. Nově se účtenka hledá v aktuálních datech podle id.
    const aktualni = (S.receipts || []).find(x => x && ulozena.id && x.id === ulozena.id) || ulozena;
    rpPripojFotky(aktualni, v); save();
    if (typeof showToast === 'function') showToast(`📎 Fotk${v.keys.length > 1 ? 'y účtenky uschovány' : 'a účtenky uschována'}`);
  } catch (e) { console.warn('Automatické uschování dokladu:', e.message); }
}
window.rpArchivAuto = rpArchivAuto;

//  Prohlížeč dokladu – všechny fotky pod sebou v okně (window.open pro víc fotek blokuje prohlížeč)
async function archivProhlizec(keys) {
  if (!keys || !keys.length) return;
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,.92);overflow-y:auto;overscroll-behavior:contain;padding:14px;text-align:center';
  ov.innerHTML = `<button type="button" class="btn btn-ghost" style="position:sticky;top:0;float:right;background:var(--surface)" onclick="this.closest('div').remove()">✕ Zavřít</button>
    <div id="arch-prohl" style="clear:both;color:#c9cede;font-size:.8rem;padding-top:8px">⏳ Načítám ${keys.length > 1 ? keys.length + ' fotky' : 'doklad'}…</div>`;
  document.body.appendChild(ov);
  const box = ov.querySelector('#arch-prohl'); const urls = [];
  try {
    for (const k of keys) urls.push(URL.createObjectURL(await archivVolej('get', { key: k })));
    box.innerHTML = urls.map(u => `<img src="${u}" alt="doklad" style="max-width:100%;border-radius:8px;margin:0 auto 12px;display:block">`).join('');
  } catch (e) { box.textContent = 'Doklad se nepodařilo načíst: ' + e.message; }
  new MutationObserver((m, o) => { if (!document.body.contains(ov)) { urls.forEach(u => URL.revokeObjectURL(u)); o.disconnect(); } }).observe(document.body, { childList: true });
}
window.archivProhlizec = archivProhlizec;
async function archivSmazVse(r) { for (const k of rpFotky(r)) await archivSmaz(k); delete r.photoKeys; delete r.photoKey; delete r.photoAt; delete r.photoBytes; }

async function rpArchivZobraz() { const r = window._editReceipt; if (r) archivProhlizec(rpFotky(r)); }
window.rpArchivZobraz = rpArchivZobraz;

async function rpArchivOdstran() {
  const r = window._editReceipt; if (!r || !rpFotky(r).length) return;
  if (!confirm('Odstranit uschovaný doklad? Účtenka zůstane.')) return;
  await archivSmazVse(r);
  const ul = (S.receipts || []).find(x => x && r.id && x.id === r.id);
  if (ul) { delete ul.photoKeys; delete ul.photoKey; delete ul.photoAt; delete ul.photoBytes; save(); }
  if (typeof rpRender === 'function') rpRender();
  if (typeof showToast === 'function') showToast('Doklad odstraněn');
}
window.rpArchivOdstran = rpArchivOdstran;

function rpSave() {
  const r = window._editReceipt; if(!r) return;
  publishToCatalog(r.items||[]);
  // Aktualizuj i cenový katalog pro hlídač
  if(r.items?.length && typeof publishPricesToCatalog === 'function') {
    publishPricesToCatalog(r.items, r.store, r.date);
  }

  // Pokud editujeme existující účtenku z historie, přepiš ji
  const histIdx = (_lastReceiptResult?.historyIndex) ?? (window._editReceipt?._historyIdx);
  //  S25 (v11.52, audit přepisů): pořadí účtenek se může během úprav změnit (synchronizace,
  //  smazání na jiném zařízení). Zápis podle POZICE by pak přepsal JINOU účtenku (a její fotky
  //  by se vmíchaly do téhle). Hledá se proto podle id. Když účtenka mezitím zmizela (smazaná
  //  jinde), úprava ji vrátí – nepřepíše cizí ani nezaloží novou s transakcemi navíc.
  //  Úprava se zapisuje DO existujícího objektu (odkazy držené jinde dál platí).
  if(histIdx !== undefined) {
    if(!Array.isArray(S.receipts)) S.receipts = [];
    let i = -1;
    if(r.id) i = S.receipts.findIndex(x => x && x.id === r.id);
    else if(S.receipts[histIdx] && !S.receipts[histIdx].id) i = histIdx;   // jen úplně stará účtenka bez id
    const cil = i >= 0 ? S.receipts[i] : null;
    const upr = Object.assign({}, r, { updatedAt: Date.now() }); delete upr._historyIdx;
    if(cil) Object.assign(cil, upr); else S.receipts.push(upr);
    // FIX (Úkol 3): re-sync tagy + receiptItems do propojených transakcí (podle data+obchodu)
    syncReceiptToTransactions(r);
    save();
    _lastReceiptResult = null;
    const preview = document.getElementById('receiptPreview');
    const status = document.getElementById('receiptStatus');
    if(preview) preview.style.display = 'none';
    if(status) { status.style.display='block'; status.innerHTML='<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text">Účtenka byla upravena (změny promítnuty i do transakcí).</div></div>'; }
    window._receiptEditorOpen = false; // editor uzavřen → povol re-render
    renderUctenky();
    return;
  }

  // Nová účtenka
  addReceiptAsTx(r);
}

function initReceiptEditor() {
  // FIX: guard – pokud form neexistuje v DOM (slot byl destroyed re-renderem), abort
  if(!document.getElementById('receiptEditForm') && !window._editReceipt) {
    console.warn('[initReceiptEditor] form not found, aborting');
    return;
  }
  loadItemCatalog();
  rpAutoAssignCategories(); // auto-přiřaď kategorie položkám
  rpRender();
}

function handleReceiptDrop(e) {
  e.preventDefault();
  document.getElementById('receiptDropZone').style.borderColor='var(--border)';
  const file=e.dataTransfer.files[0];
  if(file&&file.type.startsWith('image/'))addReceiptPhoto(file);
}

//  S25 (v11.53): jedna analýza naráz – pojistka hned na začátku (dvojí ťuknutí přijde dřív,
//  než se stihne otevřít čekací okno → dřív odešly dva dotazy a spotřebovaly dvě analýzy).
let _rpAnalyzaBezi = false;
async function analyzeReceipt(file) {
  if(_rpAnalyzaBezi) return;
  _rpAnalyzaBezi = true;
  try { return await _analyzeReceipt(file); } finally { _rpAnalyzaBezi = false; }
}
async function _analyzeReceipt(file) {
  if(typeof gateFeature==='function' && !gateFeature('receiptAnalyze','Analýza účtenek')) return; // S12.1p
  if(!file) return;
  const status = document.getElementById('receiptStatus');
  const preview = document.getElementById('receiptPreview');

  const token = await getAuthToken();
  if(!token) {
    if(status) { status.style.display='block'; status.innerHTML='<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Pro analýzu účtenek se musíte přihlásit přes <strong>Google účet</strong>.</div></div>'; }
    return;
  }

  if(status) { status.style.display='block'; status.innerHTML='<div class="insight-item warn"><div class="insight-icon">⏳</div><div class="insight-text">Claude analyzuje účtenku...</div></div>'; }
  if(preview) preview.style.display='none';
  //  S25 (v11.53, Milan): čekací okno – přesýpací hodiny, co se děje, nedá se mezitím nikam kliknout
  const ctrl = new AbortController();
  let zruseno = false, krokTimer = null;
  if(typeof ffCekaniStart==='function') ffCekaniStart({
    titulek: 'Analyzuji účtenku',
    podtitulek: 'Nezavírej aplikaci a nikam neodcházej, výsledek se otevře sám.',
    kroky: ['Připravuji fotku', 'Posílám účtenku ke čtení', 'AI čte obchod, položky a ceny', 'Kontroluji výsledek'],
    odhadS: 20, odhadText: '10–30 s',
    zrusit: () => { zruseno = true; ctrl.abort(); },
  });

  try {
    // Zmenš obrázek pokud je větší než 4MB (Claude limit je 5MB)
    const base64 = await new Promise((res, rej) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        // Cílová velikost: max 1600px na delší straně
        const MAX_PX = 1600;
        let w = img.width, h = img.height;
        if(w > MAX_PX || h > MAX_PX) {
          if(w > h) { h = Math.round(h * MAX_PX / w); w = MAX_PX; }
          else { w = Math.round(w * MAX_PX / h); h = MAX_PX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        // Komprimuj jako JPEG kvalita 0.85
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        res(dataUrl.split(',')[1]);
      };
      img.onerror = () => rej(new Error('Nepodařilo se načíst obrázek'));
      img.src = objectUrl;
    });
    if(zruseno) throw new Error('Analýza zrušena.');
    if(typeof ffCekaniKrok==='function'){ ffCekaniKrok(1); krokTimer = setTimeout(() => ffCekaniKrok(2), 2000); }

    // FIX-061 (Session 8): 60s timeout – pokud Worker nereaguje, neblokovat UI navěky.
    // AbortController odpojí fetch a vyhodí chybu, kterou catch zachytí jako "timeout".
    const timeoutId = setTimeout(() => ctrl.abort(), 60000);
    let response;
    try {
      response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          type: 'receipt',
          payload: { imageData: base64, mediaType: 'image/jpeg' }
        }),
        signal: ctrl.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        throw new Error(zruseno ? 'Analýza zrušena.' : 'Analýza trvala déle než 60 sekund. Zkuste foto znovu nebo později.');
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);
    if(krokTimer) clearTimeout(krokTimer);
    if(typeof ffCekaniKrok==='function') ffCekaniKrok(3);

    if(!response.ok) {
      const err = await response.json().catch(()=>({}));
      //  S24 (v11.16): worker při vyčerpaném limitu vrací 429 + čitelnou zprávu (dřív se ukázalo jen „rate_limit").
      if(response.status===429 && typeof uctenkyKvotaObnov==='function') setTimeout(uctenkyKvotaObnov,0);
      throw new Error(err?.message||err?.error||'HTTP '+response.status);
    }
    const data = await response.json();
    const text = data.content?.[0]?.text||'';
    if(!text) throw new Error('Prázdná odpověď od Claude');
    let receipt;
    try {
      receipt = JSON.parse(text.replace(/```json|```/g,'').trim());
    } catch(parseErr) {
      throw new Error('Claude nevrátil validní JSON. Zkuste čitelnější foto účtenky.');
    }
    if(!receipt.store && !receipt.total) throw new Error('Účtenka nebyla rozpoznána. Ujistěte se že foto je ostré a dobře osvětlené.');
    if (typeof rcptPobockaNorm === 'function') rcptPobockaNorm(receipt);   // S25: pobočka (město, kraj)

    if(typeof ffCekaniKonec==='function') ffCekaniKonec();
    if(status) status.style.display='none';
    { const tok = 'sc' + Date.now(); receipt._scanTok = tok; window._rpScanFoto = file ? { blobs: [file], at: Date.now(), tok } : null; }   // S25
    _lastReceiptResult = {receipt, n:1};
    if(preview) {
      preview.style.display='block';
      preview.innerHTML = buildReceiptPreviewHTML(receipt, 1); setTimeout(initReceiptEditor, 50);
    }
  } catch(e) {
    if(status) {
      status.style.display='block';
      status.innerHTML = zruseno
        ? `<div class="insight-item warn"><div class="insight-icon">✋</div><div class="insight-text">Analýza zrušena. Fotku můžeš poslat znovu.</div></div>`
        : `<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text">
        <strong>Nepodařilo se analyzovat účtenku</strong><br>
        <span style="font-size:.76rem">${escHtml(e.message)}</span><br>
        <span style="font-size:.72rem;color:var(--text3)">Tip: Ujistěte se že jste přihlášeni přes Google a foto je čitelné.</span>
      </div></div>`;
    }
  } finally {
    if(krokTimer) clearTimeout(krokTimer);
    if(typeof ffCekaniKonec==='function') ffCekaniKonec();   // okno zmizí vždy – i po chybě
  }
}

// ══════════════════════════════════════════════════════
//  JEDNA ÚČTENKA = JEDNA TRANSAKCE  (oprava S22, Milan)
//
//  Co se stalo: v6.88 (S9) byla funkce přepsána na „multi-transakce: každá
//  skupina položek stejné kategorie = samostatná transakce". Zadání TODO-014
//  ale znělo jinak – šlo o KATEGORIZACI (učení obchodník→kategorie pro importy,
//  bankovní výpisy, AI rádce a účtenky). Dělení nákupu na víc transakcí si
//  nikdo nepřál, přišlo to jako vedlejší produkt: přes kategorie na položkách
//  se to dalo udělat snadno, tak to vzniklo.
//
//  Roky to nevadilo, protože bez naučených přiřazení spadly položky do jedné
//  skupiny a transakce byla jedna. Jakmile se učení rozběhlo, vyrobil jeden
//  nákup v Kauflandu sedm řádků – a celková zaplacená částka, tedy to hlavní,
//  co člověk chce vidět, nebyla nikde.
//
//  Nyní: JEDNA transakce za celou účtenku, ve výši toho, co bylo skutečně
//  zaplaceno. Kategorie se NEZTRÁCEJÍ – žijí dál na položkách v `receiptItems`
//  a statistiky i Inflace z nich čtou stejně jako dřív. Učení mapování zůstává
//  beze změny: ukládá se za každou položku i za obchod.
// ══════════════════════════════════════════════════════
//  S23: výchozí peněženka pro účtenku – stejná logika jako u ruční transakce
//  (Nastavení → výchozí peněženka, jinak první aktivní).
function rpDefaultWalletId(){
  const ws = (typeof getWallets==='function') ? getWallets(getData()) : (S.wallets||[]);
  if(!ws.length) return '';
  const pref = (typeof _settings!=='undefined' && _settings && _settings.defWallet) || '';
  return ws.some(w=>w.id===pref) ? pref : ws[0].id;
}
window.rpDefaultWalletId = rpDefaultWalletId;

//  S23: JEDNORÁZOVÁ OPRAVA starších transakcí z účtenek bez peněženky.
//  Doplní se JEN když je peněženka jediná – pak není o čem rozhodovat.
//  Při více peněženkách appka neví, čím se platilo, a hádat nebude (SKILL 31);
//  doplní se při nejbližším uložení účtenky z editoru.
function rpFixReceiptTxWallets(){
  const ws = (typeof getWallets==='function') ? getWallets(getData(), true) : (S.wallets||[]);
  if(ws.length !== 1 || !Array.isArray(S.transactions)) return 0;
  let n = 0;
  S.transactions.forEach(t => {
    if(t && !t.wallet && (t.receiptItems || t.receiptStore) && t.type==='expense'){ t.wallet = ws[0].id; n++; }
  });
  return n;
}
window.rpFixReceiptTxWallets = rpFixReceiptTxWallets;

function addReceiptAsTx(receipt) {
  const D = getData();
  if(!S.transactions) S.transactions=[];
  if(!S.receipts) S.receipts=[];

  const items = receipt.items||[];
  const date = receipt.date||new Date().toISOString().slice(0,10);
  const store = receipt.store||'Nákup';

  //  Položky s dopočítanou řádkovou cenou (lineTotal má přednost – nese slevu).
  const polozky = items.map(it => ({
    ...it,
    lineTotal: (it.lineTotal != null && isFinite(it.lineTotal))
      ? (parseFloat(it.lineTotal)||0)
      : (parseFloat(it.price)||0) * (parseFloat(it.qty)||1),
  }));

  //  Kategorie transakce = ta, ve které je nejvíc peněz. Zbytek zůstává
  //  na položkách, takže se nic neztratí, jen se to nerozseká na víc řádků.
  const podleKat = {};
  polozky.forEach(it => {
    const k = it.itemCatId || '';
    if(!podleKat[k]) podleKat[k] = 0;
    podleKat[k] += it.lineTotal;
  });
  let hlavniCatId = '';
  let nejvic = -1;
  Object.keys(podleKat).forEach(k => { if(k && podleKat[k] > nejvic){ nejvic = podleKat[k]; hlavniCatId = k; } });

  //  Bez položek (nebo bez kategorií u nich) se sáhne po naučeném mapování
  //  obchodu a teprve pak po rozumném výchozím nastavení.
  if(!hlavniCatId){
    const cached = lookupCategoryMapping(store);
    const cat = cached ? D.categories?.find(c=>c.id===cached.catId) : null;
    const fallbackCat = cat
      || D.categories?.find(c=>c.name.includes('Jídlo')||c.name.includes('Nákup'))
      || D.categories?.[0];
    hlavniCatId = fallbackCat?.id || '';
  }

  //  ČÁSTKA = co bylo SKUTEČNĚ ZAPLACENO. U hotovostních účtenek se liší od
  //  součtu položek o zaokrouhlení na koruny (SOUČET 122,60 · CELKEM 123,00) –
  //  a z účtu odešlo to druhé. Součet položek je záloha, když částka chybí.
  const soucetPolozek = Math.round(polozky.reduce((a,it)=>a+it.lineTotal, 0)*100)/100;
  const castka = (receipt.total != null && isFinite(receipt.total) && receipt.total > 0)
    ? Math.round(receipt.total*100)/100
    : soucetPolozek;

  const nazvy = polozky.map(it=>it.name).filter(Boolean).join(', ');
  const _addedAt = Date.now();   // S25: vazba účtenka ↔ transakce (receiptAddedAt = addedAt účtenky)
  S.transactions.push({
    id: genTxId(),
    receiptAddedAt: _addedAt,
    name: store,
    amount: castka, amt: castka,
    type: 'expense',
    wallet: (receipt.wallet && (S.wallets||[]).some(w=>w.id===receipt.wallet)) ? receipt.wallet
      : ((typeof rpDefaultWalletId==='function' && rpDefaultWalletId()) || undefined),
    date, catId: hlavniCatId, category: hlavniCatId,
    subcat: polozky.find(it=>it.itemSubcat)?.itemSubcat || '',
    tags: [...new Set(polozky.map(it=>it.tag).filter(Boolean))].join(' '),
    note: polozky.length
      ? `📸 Naskenováno · ${polozky.length} pol.: ${nazvy.slice(0,60)}${nazvy.length>60?'…':''}`
      : `📸 Naskenováno`,
    //  Kategorie a ceny JEDNOTLIVÝCH položek – odsud čtou statistiky, Inflace
    //  i Detektor. Rozpad se neztrácí, jen nezakládá vlastní transakce.
    receiptItems: polozky.map(it=>({
      name: it.name, price: it.price, qty: it.qty, unit: it.unit||'ks',
      lineTotal: it.lineTotal, tag: it.tag||'', discount: parseFloat(it.discount)||0,
      itemCatId: it.itemCatId||'', itemSubcat: it.itemSubcat||'',
      ...(it.ean ? { ean: it.ean } : {}),     // S24 (TODO-308)
      ...(it.baleni ? { baleni: it.baleni } : {}),   // S25: gramáž zvlášť
    })),
    receiptDate: receipt.date || '',
    receiptStore: receipt.store || '',
    //  Zaokrouhlení si držíme zvlášť, ať je při zpětné kontrole jasné, proč
    //  částka nesedí na součet položek na haléř.
    receiptRounding: (receipt.subtotal != null && isFinite(receipt.subtotal))
      ? Math.round((castka - receipt.subtotal)*100)/100 : 0,
  });
  let addedCount = 1;

  //  UČENÍ MAPOVÁNÍ (TODO-014). S24 (TODO-312): pamatuje se jen ROZHODNUTÍ –
  //  ruční změna (_rucne) nebo potvrzení dřívější volby (_fromMemory).
  //  Dřív se ukládalo všechno, i odhad z klíčových slov a „nevím" = Nákup;
  //  takový záznam pak navždy přebíjel komunitní mapu, i když ji admin opravil.
  //  Návrh z mapy, který uživatel nechal být, se neukládá – položka se dál
  //  řídí mapou a dostane i její pozdější opravy.
  polozky.forEach(it => {
    if(!it.name || !it.itemCatId) return;
    if(it._rucne) saveCategoryMapping(it.name, it.itemCatId, it.itemSubcat||'', 'uzivatel');
    else if(it._fromMemory) saveCategoryMapping(it.name, it.itemCatId, it.itemSubcat||'');
  });
  if(store && hlavniCatId) saveCategoryMapping(store, hlavniCatId, '');

  //  S25 (v11.48): účtenka dostane stálé id – synchronizace z Firebase nahrazuje objekty v S,
  //  takže pozdější zápis (uschovaná fotka) musí účtenku najít podle id, ne podle odkazu.
  S.receipts.unshift({...receipt, id: receipt.id || ('rc' + _addedAt.toString(36) + Math.random().toString(36).slice(2, 6)), addedAt:_addedAt});
  // S25: automatické uschování fotek ze skenu (Analýza účtenek → editor → „uschovávat automaticky“)
  { const _ul = S.receipts[0], _tok = _ul._scanTok; delete _ul._scanTok;
    if (_tok && typeof rpArchivAuto === 'function') rpArchivAuto(_ul, _tok);
    if (typeof cenyOdeslat === 'function') cenyOdeslat(_ul); }   // S25: anonymní ceny po krajích (lze vypnout v Nastavení)
  if(receipt.items?.length && typeof publishPricesToCatalog === 'function') {
    publishPricesToCatalog(receipt.items, store, date);
  }
  if(S.receipts.length>5000) S.receipts=S.receipts.slice(0,5000);

  // TODO-014+: Aktualizuj itemStats v Firebase
  updateItemStats(items, date).catch(e=>console.warn('itemStats update failed:', e));

  const savePromise = save();
  _lastReceiptResult = null;
  const preview = document.getElementById('receiptPreview');
  const status = document.getElementById('receiptStatus');
  if(preview) preview.style.display='none';
  if(status) { status.style.display='block'; status.innerHTML=`<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text">Přidána <strong>1 transakce</strong> za ${fmtP(castka)} Kč${polozky.length?` · ${polozky.length} položek s kategoriemi`:''}. Uloženo do AI paměti.</div></div>`; }
  const histEl = document.getElementById('utab-history-content');
  if(histEl && histEl.style.display!=='none') renderUctenky();
  return savePromise;
}

// S12.1j: součet slev na účtence (z it.discount extrahovaných AI analýzou)
function receiptSavings(rec){
  if(!rec || !Array.isArray(rec.items)) return 0;
  return rec.items.reduce((a,it)=>a+(parseFloat(it&&it.discount)||0),0);
}

// ══════════════════════════════════════════════════════
//  S12.1d: TREND OBCHODŮ (Nákupní DNA)
//  „Logo" obchodu = barevný badge s iniciálou; známé CZ
//  řetězce mají firemní barvu. Spojnicový graf top 4
//  obchodů za 6 měsíců – osy, mřížka, legenda, touch tooltip.
// ══════════════════════════════════════════════════════
const STORE_BRAND_COLORS = {
  'lidl':'#0050aa','kaufland':'#e10915','albert':'#00963f','billa':'#fdd900',
  'tesco':'#00539f','penny':'#cd1414','globus':'#f77f00','coop':'#f58220',
  'dm':'#1a3c8b','rossmann':'#c8102e','teta':'#e6007e','ikea':'#0058a3',
  'alza':'#11a44c','datart':'#e2001a','lekarna':'#2e8b57','benzina':'#00b050',
  'orlen':'#e30613','shell':'#fbce07','omv':'#003a7d','mol':'#e30613',
};
function storeBrandColor(store){
  const n = String(store||'').toLowerCase();
  for(const k in STORE_BRAND_COLORS){ if(n.includes(k)) return STORE_BRAND_COLORS[k]; }
  let h = 0; for(let i=0;i<n.length;i++) h = (h*31 + n.charCodeAt(i)) >>> 0;
  return ['#60a5fa','#fbbf24','#a78bfa','#34d399','#fb923c','#f87171','#4ade80'][h % 7];
}
function storeBadgeHTML(store, color){
  const c = color || storeBrandColor(store);
  const ini = String(store||'?').trim().charAt(0).toUpperCase() || '?';
  return '<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:'+c+';color:#fff;font-size:.58rem;font-weight:800;margin-right:5px;flex-shrink:0;vertical-align:-3px">'+ini+'</span>';
}

// Top 4 obchody dle celkové útraty → série útrat za posledních 6 měsíců
function buildStoreTrendData(receipts){
  const now = new Date();
  const months = [];
  for(let i=5;i>=0;i--){
    let m = now.getMonth()-i, y = now.getFullYear(); while(m<0){m+=12;y--;}
    months.push({m, y, label: (m+1)+'/'+String(y).slice(2)});
  }
  // S12.1g: dedup názvů (case/diakritika: „Můj obchod" = „MOJ OBCHOD"), řazení dle POČTU
  // návštěv (ne útraty) – jednorázové velké faktury (vodárny apod.) graf nezaplevelí.
  const normKey = s => String(s||'?').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const agg = {}; // key → {name, visits, total, byMonth:{m-y: sum}}
  receipts.forEach(rr=>{
    if(!rr.date) return;
    const k = normKey(rr.store);
    if(!agg[k]) agg[k] = {name: rr.store||'?', visits:0, total:0, byMonth:{}};
    agg[k].visits++; agg[k].total += (rr.total||0);
    const d = new Date(rr.date+'T12:00:00');
    const mk = d.getMonth()+'-'+d.getFullYear();
    agg[k].byMonth[mk] = (agg[k].byMonth[mk]||0) + (rr.total||0);
    if((rr.store||'').length > agg[k].name.length) agg[k].name = rr.store; // delší varianta názvu vyhrává
  });
  const top = Object.values(agg)
    .sort((a,b)=>b.total-a.total)                   // řadit dle celkové sumy
    .slice(0,4);
  const series = top.map(a=>{
    const values = months.map(({m,y})=>Math.round(a.byMonth[m+'-'+y]||0));
    return {store: a.name, color: storeBrandColor(a.name), values};
  }).filter(s=>s.values.some(v=>v>0));
  return {months, series};
}

function drawStoreTrendChart(id, data){
  const canvas = document.getElementById(id); if(!canvas) return;
  const draw = ()=>{
    const cw = canvas.clientWidth || canvas.parentElement?.clientWidth || 0;
    if(!cw){ requestAnimationFrame(draw); return; } // skrytý tab má clientWidth=0
    const dpr = window.devicePixelRatio||1, H = 190;
    canvas.width = cw*dpr; canvas.height = H*dpr;
    const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
    const pad = {l:52, r:10, t:12, b:24};
    const W = cw, n = data.months.length;
    const maxV = Math.max(...data.series.flatMap(s=>s.values), 1);
    const x = i => pad.l + (n<=1?0:(W-pad.l-pad.r)*i/(n-1));
    const y = v => pad.t + (H-pad.t-pad.b)*(1 - v/maxV);
    ctx.clearRect(0,0,W,H);
    // mřížka + Y popisky (Kč)
    ctx.font = '9.5px Instrument Sans'; ctx.fillStyle = '#a8aec8'; ctx.textAlign = 'right';
    for(let g=0; g<=3; g++){
      const v = Math.round(maxV*g/3), yy = y(v);
      ctx.strokeStyle = 'rgba(168,174,200,.14)'; ctx.beginPath();
      ctx.moveTo(pad.l, yy); ctx.lineTo(W-pad.r, yy); ctx.stroke();
      ctx.fillText(_cNum(v), pad.l-7, yy+3);
    }
    // X popisky (měsíce)
    ctx.textAlign = 'center';
    data.months.forEach((mo,i)=>ctx.fillText(mo.label, x(i), H-7));
    // čáry + badge s iniciálou obchodu na každém průsečíku (S12.1g)
    data.series.forEach(s=>{
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath();
      s.values.forEach((v,i)=>{ i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)); });
      ctx.stroke();
    });
    // badge kreslit až PO všech čarách, ať je nepřekrývají
    data.series.forEach(s=>{
      const ini = String(s.store||'?').trim().charAt(0).toUpperCase();
      s.values.forEach((v,i)=>{
        if(v <= 0) return;                       // nulové měsíce bez badge (jen čára)
        const px2 = x(i), py2 = y(v);
        ctx.beginPath(); ctx.arc(px2, py2, 7, 0, Math.PI*2);
        ctx.fillStyle = s.color; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(15,17,28,.9)'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Instrument Sans';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ini, px2, py2 + 0.5);
      });
    });
    ctx.textBaseline = 'alphabetic';
    // tooltip (myš + dotyk přes attachChartTouch)
    canvas.onmousemove = function(e){
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX-rect.left;
      let idx = 0, best = 1e9;
      for(let i=0;i<n;i++){ const d=Math.abs(mx-x(i)); if(d<best){best=d; idx=i;} }
      draw();
      requestAnimationFrame(()=>{
        const ctx2 = canvas.getContext('2d');
        ctx2.save(); ctx2.scale(dpr,dpr);
        ctx2.strokeStyle = 'rgba(232,234,242,.45)'; ctx2.setLineDash([3,3]);
        ctx2.beginPath(); ctx2.moveTo(x(idx), pad.t); ctx2.lineTo(x(idx), H-pad.b); ctx2.stroke(); ctx2.setLineDash([]);
        const lines = data.series.map(s=>({t:s.store.slice(0,14)+': '+fmtB(s.values[idx]), c:s.color, v:s.values[idx]}))
          .filter(l=>l.v>0);
        if(!lines.length){ ctx2.restore(); return; }
        const bw = 152, bh = 18+lines.length*14;
        let bx = x(idx)+10; if(bx+bw > W-pad.r) bx = x(idx)-bw-10;
        ctx2.fillStyle = 'rgba(20,23,38,.95)'; ctx2.strokeStyle = 'rgba(168,174,200,.3)';
        ctx2.beginPath();
        (ctx2.roundRect ? ctx2.roundRect(bx, pad.t, bw, bh, 7) : ctx2.rect(bx, pad.t, bw, bh));
        ctx2.fill(); ctx2.stroke();
        ctx2.textAlign = 'left'; ctx2.font = '10px Instrument Sans';
        ctx2.fillStyle = '#e8eaf2'; ctx2.fillText(data.months[idx].label, bx+9, pad.t+13);
        lines.forEach((l,li)=>{
          ctx2.fillStyle = l.c; ctx2.fillRect(bx+9, pad.t+20+li*14, 8, 8);
          ctx2.fillStyle = '#c2c7da'; ctx2.fillText(l.t, bx+22, pad.t+28+li*14);
        });
        ctx2.restore();
      });
    };
    canvas.onmouseleave = function(){ draw(); };
    // S12.1g: dotyk napřímo (touch-action:pan-y = svislý scroll zůstává, tah prstem = scrub)
    if(!canvas._touchBound){
      canvas._touchBound = true;
      canvas.style.touchAction = 'pan-y';
      const fire = (ev)=>{
        const t = ev.touches && ev.touches[0]; if(!t) return;
        if(typeof canvas.onmousemove === 'function') canvas.onmousemove({clientX:t.clientX, clientY:t.clientY});
      };
      canvas.addEventListener('touchstart', fire, {passive:true});
      canvas.addEventListener('touchmove',  fire, {passive:true});
    }
  };
  requestAnimationFrame(draw);
}

// ══════════════════════════════════════════════════════

// Otevři konkrétní účtenku v Historii podle data+obchodu (z transakce s 📷)
function openReceiptInHistory(date, store) {
  // Najdi index PŘEDEM
  const idx = (S.receipts||[]).findIndex(r =>
    (r.date||'')===date && (r.store||'').toLowerCase()===(store||'').toLowerCase());
  showPage('uctenky');
  // Nastav aktivní tab na history PŘED renderem
  if(typeof _activeUctenkyTab !== 'undefined') _activeUctenkyTab = 'history';
  setTimeout(() => {
    const histBtn = document.getElementById('utab-history');
    if(histBtn) switchUctenkyTab('history', histBtn);
    setTimeout(() => {
      if(idx >= 0) {
        // Otevři editor té účtenky (slot existuje po renderu history)
        const slot = document.getElementById('rcpt_hist_'+idx);
        if(slot) {
          editReceiptFromHistory(idx);
          setTimeout(()=>{ const s2=document.getElementById('rcpt_hist_'+idx); if(s2) s2.scrollIntoView({behavior:'smooth', block:'center'}); }, 100);
        } else if(typeof showToast==='function') {
          showToast('Účtenka nebyla v historii nalezena');
        }
      }
    }, 250);
  }, 200);
}
window.openReceiptInHistory = openReceiptInHistory;

// Re-sync tagů + receiptItems z editované účtenky do propojených transakcí
// (transakce mají receiptDate + receiptStore z addReceiptAsTx)
function syncReceiptToTransactions(r) {
  if(!r || !S.transactions) return;
  const linked = S.transactions.filter(t =>
    t.receiptDate === r.date && (t.receiptStore||'').toLowerCase() === (r.store||'').toLowerCase());
  if(!linked.length) return;
  //  FIX (audit S22): DVĚ VADY, OBĚ DŮSLEDEK PŘECHODU NA JEDNU TRANSAKCI (v10.73).
  //
  //  1) Filtr `it.itemCatId === t.catId` pocházel z doby, kdy každá transakce
  //     nesla JEN položky své kategorie. Dnes je transakce jedna a nese
  //     všechny – po editaci účtenky by si tedy ponechala jen položky hlavní
  //     kategorie a zbytek rozpadu by zmizel. U Kauflandu se čtyřiceti
  //     položkami by po jedné úpravě zbyly třeba dvě.
  //
  //  2) Přestavěné položky zahazovaly `itemCatId` a `itemSubcat`. Od v10.73
  //     na nich kategorie ŽIJÍ – editace účtenky by je smazala a rozpad by
  //     zůstal beze smyslu.
  //
  //  Nově: jedna účtenka = jedna transakce, takže se přenášejí VŠECHNY položky
  //  se VŠEMI poli. Přenáší se i částka, jinak by se transakce po úpravě
  //  účtenky rozešla s tím, co je na dokladu.
  linked.forEach(t => {
    const itemsForTx = (r.items||[]);
    const tagSet = [...new Set(itemsForTx.map(it=>it.tag).filter(Boolean))];
    t.tags = tagSet.join(' ');          // i prázdné – smazaný tag musí zmizet
    t.receiptItems = itemsForTx.map(it=>({
      name: it.name, price: it.price, qty: it.qty, unit: it.unit||'ks',
      lineTotal: (it.lineTotal != null && isFinite(it.lineTotal))
        ? it.lineTotal : (parseFloat(it.price)||0)*(parseFloat(it.qty)||1),
      tag: it.tag||'', discount: parseFloat(it.discount)||0,
      itemCatId: it.itemCatId||'', itemSubcat: it.itemSubcat||'',
      ...(it.ean ? { ean: it.ean } : {}),     // S24 (TODO-308)
      ...(it.baleni ? { baleni: it.baleni } : {}),   // S25: gramáž zvlášť
    }));
    //  S23: peněženka – uživatelova volba v editoru, jinak doplnit chybějící.
    if(r.wallet && (S.wallets||[]).some(w=>w.id===r.wallet)) t.wallet = r.wallet;
    else if(!t.wallet && typeof rpDefaultWalletId==='function'){ const dw = rpDefaultWalletId(); if(dw) t.wallet = dw; }
    if(r.total != null && isFinite(r.total) && r.total > 0){
      const nova = Math.round(r.total*100)/100;
      t.amount = nova; t.amt = nova;
    }
  });
}
window.syncReceiptToTransactions = syncReceiptToTransactions;

// S17.13 (Milan): multifiltr položek v záložce Zdražování
function pricePickToggle(n){
  if(!Array.isArray(window._pricePick)) window._pricePick=[];
  const i=window._pricePick.indexOf(n);
  if(i>=0) window._pricePick.splice(i,1); else window._pricePick.push(n);
  if(typeof renderUctenky==='function') renderUctenky();
  const t=document.getElementById('utab-prices'); if(t && typeof switchUctenkyTab==='function') switchUctenkyTab('prices',t);
}
function pricePickClear(){
  window._pricePick=[];
  if(typeof renderUctenky==='function') renderUctenky();
  const t=document.getElementById('utab-prices'); if(t && typeof switchUctenkyTab==='function') switchUctenkyTab('prices',t);
}

// S17.16 (Milan): přepnutí seznamu položek mezi TOP 15 a kompletním výpisem.
// „Vše od začátku" zároveň přepne období na „vše", aby seznam opravdu pokryl celou historii.
function toggleItemStatsAll() {
  window._itemStatsShowAll = !window._itemStatsShowAll;
  if(window._itemStatsShowAll) _itemStatsPeriod = 'vše';
  // popisek tlačítka je v hlavičce karty → nutný plný re-render (renderUctenky obnoví i záložku)
  if(typeof renderUctenky === 'function') renderUctenky();
  else if(typeof _itemStatsRerender === 'function') _itemStatsRerender();
}

// S17.35 (FIX-219, Milan): otevření Analýzy účtenek rovnou na konkrétní záložce.
// PROBLÉM: odkaz z Detektoru úspor volal showPage() a hned switchUctenkyTab(), jenže
// showPage jen zobrazí stránku – obsah záložek vykresluje až renderUctenky() v renderPage,
// který proběhne AŽ POTOM. Přepnutí tedy pracovalo s prázdným DOM a stránka zůstala prázdná,
// dokud uživatel neklikl na ikonu záložky ručně.
function openUctenkyTab(tab) {
  if (typeof showPage === 'function') showPage('uctenky', null);
  if (typeof _activeUctenkyTab !== 'undefined') _activeUctenkyTab = tab;  // renderUctenky ji obnoví
  setTimeout(() => {
    const btn = document.getElementById('utab-' + tab);
    if (typeof switchUctenkyTab === 'function') switchUctenkyTab(tab, btn);
  }, 60);
}

// ══════════════════════════════════════════════════════
//  S22 (Milan): KONTROLA ÚČTENKY HNED PO SKENU + OPRAVA JEDNÍM KLIKEM
//
//  Milan naskenoval Kaufland a rovnou viděl špatné číslo (1 540,88 místo
//  1 490,99): analyzér přehlédl slevový řádek „Tvoje cena s −49,90".
//  Kontrola úplnosti v appce byla od S19 (TODO-226), ale běžela až v Historii
//  – tedy až POTOM, co uživatel transakci uložil. Tady se ukáže okamžitě.
//
//  Částka se NIKDY nepřepisuje sama (výhrada Milana: špatně přečtený total by
//  zmařil celý výpočet). Nabídne se oprava a rozhodne uživatel – ten má
//  účtenku v ruce a ví, co je správně.
// ══════════════════════════════════════════════════════
function rpRenderCheck(){
  const el = document.getElementById('rp_check'); if(!el) return;
  const r = window._editReceipt; if(!r){ el.innerHTML=''; return; }
  const c = (typeof receiptCompleteness==='function') ? receiptCompleteness(r) : null;
  if(!c || c.ok){ el.innerHTML=''; return; }

  const rozdil = Math.abs(c.diff);
  const chybi = c.chybi;   // true = položky nedosahují sumy → něco se nezapočítalo
  el.innerHTML = `
    <div style="display:flex;gap:9px;align-items:flex-start;margin-bottom:10px;padding:9px 11px;border-radius:9px;
                background:var(--debt-bg,rgba(251,191,36,.12));border:1px solid rgba(251,191,36,.35)">
      <span style="flex-shrink:0">⚠️</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:.76rem;color:#e8eaf2;line-height:1.5">
          Součet položek <b>${fmtP(c.sum)} Kč</b> ${chybi?'nedosahuje':'přesahuje'}
          částku na účtence <b>${fmtP(c.subtotal||c.total)} Kč</b> — rozdíl <b>${fmtP(rozdil)} Kč</b>.
        </div>
        <div style="font-size:.68rem;color:#a8aec8;line-height:1.5;margin-top:4px">
          ${chybi ? 'Nejspíš analyzéru unikla položka, nebo je na účtence záloha na lahve.'
                  : 'Nejspíš analyzér nezapočítal slevu, nebo přečetl nějakou cenu dvakrát.'}
          Projdi položky níž — appka sama nic nepřepisuje.
        </div>
        ${(()=>{
          //  S23 (Milan): Kaufland i po novém skenu slevu nezachytil. Prompt
          //  můžu ladit donekonečna, ale čtení z fotky nikdy nebude stoprocentní –
          //  takže musí jít chyba opravit TAK, ABY SE SLEVA ZAPOČÍTALA, ne jen
          //  aby seděl součet. „Doplnit rozdíl jako položku" součet srovná, ale
          //  do „Ušetřeno slevami" ani do ceny položky se nic nedostane.
          if(chybi) return '';
          const kand = rpDiscountCandidates(r, rozdil);
          if(!kand.length) return '';
          const silny = kand[0].silny;
          return `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.3)">
            <div style="font-size:.72rem;color:#e8eaf2;line-height:1.5;margin-bottom:6px">
              ${silny ? `💡 Rozdíl <b>${fmtP(rozdil)} Kč</b> odpovídá ceně jednoho kusu u „<b>${kand[0].name}</b>" — vypadá to na slevu typu „Tvoje cena" / 1+1.`
                      : `💡 Je rozdíl <b>${fmtP(rozdil)} Kč</b> sleva? Vyber položku, ke které patří:`}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
              <select id="rp_disc_item" class="fi" style="font-size:.74rem;flex:1 1 170px;min-width:150px;padding:6px 8px">
                ${kand.map(k=>`<option value="${k.i}">${k.silny?'⭐ ':''}${(k.name||'bez názvu').replace(/</g,'&lt;')} · ${fmtP(k.amt)} Kč</option>`).join('')}
              </select>
              <button class="btn btn-accent btn-sm" style="font-size:.72rem" onclick="rpApplyDiffAsDiscount()">Započítat jako slevu</button>
            </div>
          </div>`;
        })()}
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px">
          <button class="btn btn-ghost btn-sm" style="font-size:.7rem" onclick="rpUseReceiptTotal()">
            Použít částku z účtenky</button>
          <button class="btn btn-ghost btn-sm" style="font-size:.7rem" onclick="rpAddDiffItem()">
            Doplnit rozdíl jako položku</button>
          <button class="btn btn-ghost btn-sm" style="font-size:.7rem" onclick="rrOtevri()">
            🚩 Nahlásit špatné čtení</button>
        </div>
        <div id="rp_report"></div>
      </div>
    </div>`;
}

//  Přepíše celkovou částku tak, jak je natištěná na účtence. Položky nechá být –
//  ty se opravují ručně níž. Účtenka může mít SOUČET i CELKEM; bere se to,
//  co bylo zaplaceno.
function rpUseReceiptTotal(){
  const r = window._editReceipt; if(!r) return;
  const c = (typeof receiptCompleteness==='function') ? receiptCompleteness(r) : null;
  if(!c) return;
  r.total = c.total;
  r._totalLocked = true;      // ať ji součet položek zase nepřepíše
  if(typeof rpUpdateTotal==='function') rpUpdateTotal();
  const d = document.getElementById('rp_total_display');
  if(d) d.textContent = '−' + fmtP(r.total||0) + ' Kč';
  rpRenderCheck();
  if(typeof showToast==='function') showToast('Použita částka z účtenky');
}

//  Doplní chybějící rozdíl jako jednu položku, ať sedí součet. Použitelné,
//  když uživatel vidí, co analyzéru uniklo, ale nechce to vypisovat po kusech.
function rpAddDiffItem(){
  const r = window._editReceipt; if(!r) return;
  const c = (typeof receiptCompleteness==='function') ? receiptCompleteness(r) : null;
  if(!c) return;
  if(!Array.isArray(r.items)) r.items = [];
  const g = (typeof guessItemCatId==='function') ? guessItemCatId('', r.category) : {catId:'',catName:'Nákup'};
  r.items.push({
    name: c.chybi ? 'Nezachycená položka' : 'Sleva / oprava',
    price: c.diff, qty: 1, lineTotal: c.diff,
    itemCatId: g.catId, itemCat: g.catName,
  });
  if(typeof rpRender==='function') rpRender();
  rpRenderCheck();
  if(typeof showToast==='function') showToast('Rozdíl doplněn jako položka — uprav jí název');
}

//  Komu rozdíl nejspíš patří. Silný kandidát = položka s 2+ kusy, jejíž
//  jednotková cena se rovná rozdílu (na haléře) – přesně tvar kauflandské
//  „OYAKATA 2 × 49,90 … Tvoje cena s −49,90". Ostatní se jen nabídnou.
function rpDiscountCandidates(r, rozdil){
  const out = [];
  ((r && r.items) || []).forEach((it, i) => {
    const amt = lineAmt(it);
    if(!(amt > rozdil + 0.005)) return;               // sleva nemůže být větší než řádek
    const price = parseFloat(it.price) || 0, qty = parseFloat(it.qty) || 1;
    const bezSlevy = !(parseFloat(it.discount) > 0);
    const silny = bezSlevy && qty >= 2 && Math.abs(price - rozdil) <= 0.06;
    out.push({ i, name: it.name || '', amt, silny, bezSlevy });
  });
  out.sort((a,b) => (b.silny - a.silny) || (b.bezSlevy - a.bezSlevy) || (b.amt - a.amt));
  return out;
}

function rpApplyDiffAsDiscount(){
  const r = window._editReceipt; if(!r) return;
  const c = (typeof receiptCompleteness==='function') ? receiptCompleteness(r) : null;
  if(!c || c.ok || c.chybi) return;
  const idx = parseInt(document.getElementById('rp_disc_item')?.value, 10);
  const it = r.items && r.items[idx]; if(!it) return;
  let rozdil = Math.abs(c.diff);
  //  Silný kandidát: sleva = cena kusu (49,90), ne rozdíl po zaokrouhlení (49,89).
  const _pr = parseFloat(it.price) || 0;
  if((parseFloat(it.qty)||1) >= 2 && Math.abs(_pr - rozdil) <= 0.06) rozdil = _pr;
  const nova = Math.round((lineAmt(it) - rozdil) * 100) / 100;
  if(nova < 0) return;
  it.discount = Math.round(((parseFloat(it.discount)||0) + rozdil) * 100) / 100;
  it.lineTotal = nova;
  it._discountManual = true;
  if(typeof rpRender==='function') rpRender();
  if(typeof rpUpdateTotal==='function') rpUpdateTotal();
  rpRenderCheck();
  if(typeof showToast==='function') showToast('Sleva ' + fmtP(rozdil) + ' Kč započítána u „' + (it.name||'položky') + '"');
}
window.rpDiscountCandidates = rpDiscountCandidates;
window.rpApplyDiffAsDiscount = rpApplyDiffAsDiscount;

//  S23: POJISTKA PROTI PŘEHLÉDNUTÉ SLEVĚ. Worker od v10.84 vrací i pole
//  `negativeLines` = VŠECHNY záporné řádky, které na účtence viděl, s indexem
//  položky, ke které patří. Když analyzér slevu vidí, ale do položky ji
//  nepromítne (přesně kauflandský případ), appka ji doplní sama – ovšem JEN
//  tehdy, když tím součet položek dojde PŘESNĚ na natištěnou částku. To není
//  hádání: obě čísla jsou z účtenky a sedí na haléř. Jinak se nic nemění.
function rpApplyNegativeLines(receipt){
  if(!receipt || receipt._negApplied || !Array.isArray(receipt.negativeLines) || !Array.isArray(receipt.items)) return 0;
  receipt._negApplied = true;
  const proti = parseFloat(receipt.subtotal != null ? receipt.subtotal : receipt.total) || 0;
  if(!proti) return 0;
  const soucet = () => receipt.items.reduce((a,it)=>a+lineAmt(it),0);
  let diff = Math.round((soucet() - proti)*100)/100;
  if(diff <= RECEIPT_TOLERANCE) return 0;                      // nic nepřesahuje
  const cekajici = receipt.negativeLines
    .map(n => ({ i: parseInt(n && n.itemIndex, 10), a: Math.abs(parseFloat(n && n.amount) || 0) }))
    .filter(n => n.a > 0 && receipt.items[n.i] && !(parseFloat(receipt.items[n.i].discount) > 0));
  const celkem = Math.round(cekajici.reduce((a,n)=>a+n.a,0)*100)/100;
  if(!cekajici.length || Math.abs(celkem - diff) > 0.5) return 0;   // nesedí (víc než haléřové zaokrouhlení) → nesahat
  cekajici.forEach(n => {
    const it = receipt.items[n.i];
    const nova = Math.round((lineAmt(it) - n.a)*100)/100;
    if(nova < 0) return;
    it.discount = n.a; it.lineTotal = nova; it._discountAuto = true;
  });
  return cekajici.length;
}
window.rpApplyNegativeLines = rpApplyNegativeLines;

window.rpRenderCheck = rpRenderCheck;
window.rpUseReceiptTotal = rpUseReceiptTotal;
window.rpAddDiffItem = rpAddDiffItem;

// ══════════════════════════════════════════════════════════════════════
//  S22 (Milan): NAHLÁŠENÍ ŠPATNĚ PŘEČTENÉ ÚČTENKY
//
//  Formulář v „O aplikaci" na tohle nestačil: uživatel musí slovy popsat,
//  co viděl, a stejně chybí to jediné, z čeho jde prompt opravit – FOTKA
//  a JSON, který z ní analyzér vyrobil. Milanův Kaufland (přehlédnutá sleva
//  „Tvoje cena s −49,90") by se z textového popisu ladil roky.
//
//  SOUKROMÍ: účtenka není neutrální obrázek. Je na ní adresa prodejny, čas
//  nákupu, konec čísla karty a co člověk jedl. Proto se NIC neodesílá bez
//  výslovného odklepnutí a uživatel dopředu vidí, co přesně odejde. Snímek
//  je volitelný – hlášení bez něj dává pořád smysl (čísla a názvy položek
//  odhalí většinu chyb).
//
//  Ukládá se do /receipt_reports/{uid}/{id} – uživatel píše jen do svého
//  podstromu, čte jen admin (stejný vzor jako coicop_corrections).
// ══════════════════════════════════════════════════════════════════════
const RCPT_REPORT_MAX_KB = 400;     // strop na snímek, ať se nenahrávají 5MB fotky

//  Zmenší fotku na rozumný rozměr. Účtenka se čte i na 1000 px na šířku
//  a 5MB originál by z mobilních dat udělal problém.
function rrZmensiSnimek(dataUrl, maxSirka){
  return new Promise((resolve)=>{
    try{
      const img = new Image();
      img.onload = ()=>{
        try{
          const w = Math.min(maxSirka || 1000, img.width || maxSirka || 1000);
          const h = Math.round((img.height||1) * (w / (img.width||1)));
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(cv.toDataURL('image/jpeg', 0.7));
        }catch(e){ resolve(null); }
      };
      img.onerror = ()=>resolve(null);
      img.src = dataUrl;
    }catch(e){ resolve(null); }
  });
}

function rrOtevri(){
  const r = window._editReceipt; if(!r){ if(typeof showToast==='function') showToast('Není co nahlásit'); return; }
  const c = (typeof receiptCompleteness==='function') ? receiptCompleteness(r) : null;
  const maSnimek = !!(r.imageData || r.image || (Array.isArray(r.images) && r.images.length));
  const el = document.getElementById('rp_report'); if(!el) return;
  el.innerHTML = `
    <div style="margin-top:10px;padding:11px 12px;border-radius:10px;background:var(--surface3);border:1px solid var(--border)">
      <div style="font-family:Syne,sans-serif;font-weight:800;font-size:.86rem;color:#e8eaf2;margin-bottom:6px">
        🚩 Nahlásit špatné čtení</div>
      <div style="font-size:.74rem;color:#a8aec8;line-height:1.55">
        Odešle se: název obchodu, datum, částka na účtence i spočítaná, počet položek
        a jejich <b>názvy a ceny</b>. Díky tomu půjde opravit, proč to analyzér přečetl špatně.
      </div>
      ${maSnimek ? `
      <label style="display:flex;gap:8px;align-items:flex-start;margin-top:9px;cursor:pointer">
        <input type="checkbox" id="rr_foto" style="margin-top:2px;accent-color:#8b7cf6">
        <span style="font-size:.74rem;color:#c9cede;line-height:1.5">
          Přiložit i <b>fotku účtenky</b> — pomůže nejvíc, ale je na ní adresa prodejny,
          čas nákupu a co jsi kupoval. Bez ní hlášení funguje taky.
        </span>
      </label>` : `
      <div style="font-size:.7rem;color:#8b91a8;margin-top:8px">Fotka k téhle účtence není uložená, odejdou jen údaje výše.</div>`}
      <textarea id="rr_pozn" rows="2" placeholder="Co je špatně? (nepovinné)"
        style="width:100%;margin-top:9px;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:#e8eaf2;font-size:.8rem;font-family:inherit;resize:vertical"></textarea>
      <div style="display:flex;gap:8px;margin-top:9px">
        <button class="btn btn-accent btn-sm" onclick="rrOdeslat()">Odeslat hlášení</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('rp_report').innerHTML=''">Zrušit</button>
      </div>
    </div>`;
}

async function rrOdeslat(){
  const r = window._editReceipt; if(!r) return;
  const btn = document.querySelector('#rp_report .btn-accent');
  if(btn){ btn.disabled = true; btn.textContent = 'Odesílám…'; }
  try{
    const c = (typeof receiptCompleteness==='function') ? receiptCompleteness(r) : null;
    const chciFoto = !!(document.getElementById('rr_foto') || {}).checked;
    const pozn = ((document.getElementById('rr_pozn')||{}).value || '').trim();

    let snimek = null;
    if(chciFoto){
      const zdroj = r.imageData || r.image || (Array.isArray(r.images) ? r.images[0] : null);
      if(zdroj) snimek = await rrZmensiSnimek(zdroj, 1000);
      //  Když je i po zmenšení moc velký, radši ho nepošli než aby zápis spadl.
      if(snimek && snimek.length > RCPT_REPORT_MAX_KB * 1024) snimek = null;
    }

    const zaznam = {
      date: r.date || new Date().toISOString().slice(0,10),
      store: r.store || '',
      printedTotal: (r.printedTotal != null ? r.printedTotal : (r.total || 0)),
      itemsSum: c ? c.sum : null,
      subtotal: r.subtotal != null ? r.subtotal : null,
      rozdil: c ? c.diff : null,
      pocetPolozek: (r.items||[]).length,
      polozky: (r.items||[]).slice(0,80).map(it=>({
        name: it.name||'', qty: it.qty||1, price: it.price||0,
        lineTotal: (it.lineTotal!=null?it.lineTotal:null), discount: it.discount||0,
      })),
      poznamka: pozn,
      maSnimek: !!snimek,
      appVerze: (document.title||'').replace('FinanceFlow ',''),
      nahlaseno: Date.now(),
    };
    if(snimek) zaznam.snimek = snimek;

    //  Stejný vzor jako updateItemStats() níž v souboru.
    const uid = window._currentUser?.uid;
    const token = uid ? await window._currentUser.getIdToken?.() : null;
    if(!uid || !token) throw new Error('nepřihlášen');

    const res = await fetch(
      `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/receipt_reports/${uid}/${Date.now()}.json?auth=${token}`,
      { method:'PUT', body: JSON.stringify(zaznam) });
    if(!res.ok) throw new Error('HTTP '+res.status);

    const el = document.getElementById('rp_report');
    if(el) el.innerHTML = `<div style="margin-top:10px;padding:10px 12px;border-radius:10px;
      background:rgba(74,222,128,.12);border:1px solid rgba(74,222,128,.35);font-size:.78rem;color:#c9cede;line-height:1.5">
      ✅ Díky. Hlášení odešlo${zaznam.maSnimek?' i s fotkou':''} — pomůže opravit čtení účtenek z tohohle obchodu.</div>`;
  }catch(e){
    console.warn('[report] selhalo', e);
    if(btn){ btn.disabled = false; btn.textContent = 'Odeslat hlášení'; }
    if(typeof showToast==='function') showToast('Hlášení se nepodařilo odeslat');
  }
}

window.rrOtevri = rrOtevri;
window.rrOdeslat = rrOdeslat;
