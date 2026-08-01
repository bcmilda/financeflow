// FinanceFlow · v9.35 · receipts.js · 2026-08-01
//  ANALÝZA ÚČTENEK
// ══════════════════════════════════════════════════════
// ── lineAmt helper: bezpečný výpočet celkové ceny položky ──
// Nové záznamy mají it.lineTotal (z opraveného AI promptu).
// Staré záznamy mají it.price = cena/ks → fallback na price × qty.
function lineAmt(it) {
  if(it && it.lineTotal != null) return parseFloat(it.lineTotal) || 0;
  return (parseFloat(it?.price) || 0) * (parseFloat(it?.qty) || 1);
}
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
  const receipts = S.receipts || [];

  // Deduplikace – identifikátor: obchod|datum|suma|počet položek
  const _seen = new Set();
  const uniqueReceipts = receipts.filter(r => {
    const key = `${normalizeStoreName(r.store)}|${r.date}|${Math.round((r.total||0)*100)}|${(r.items||[]).length}`;
    if(_seen.has(key)) return false;
    _seen.add(key); return true;
  });
  const dupCount = receipts.length - uniqueReceipts.length;

  const hasData = uniqueReceipts.length >= 3;
  const allItems = uniqueReceipts.flatMap(r => (r.items||[]).map(it => ({...it, store:normalizeStoreName(r.store), date:r.date})));
  const storeStats = {};
  uniqueReceipts.forEach(r => {
    const s = normalizeStoreName(r.store);
    if(!storeStats[s]) storeStats[s] = {total:0, count:0, visits:0};
    storeStats[s].total += r.total||0;
    storeStats[s].count += (r.items||[]).length;
    storeStats[s].visits++;
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
  allItems.forEach(it => {
    const rawName = (it.name||'').toLowerCase().trim();
    const key = rawName
      .replace(/\d+\s*(g|kg|ml|l|ks|cm|mm)\b/g, '')
      .replace(/\s+/g, ' ').trim().slice(0, 25);
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
  const mergedPrices = {};
  Object.entries(itemPrices).forEach(([key, vals]) => {
    // Normalizovaný klíč bez číslic a jednotek pro porovnání
    const normalize = s => s.replace(/\d+/g, '').replace(/\s+/g,' ').trim();
    const normKey = normalize(key);
    const match = Object.keys(mergedPrices).find(k => {
      const normK = normalize(k);
      // Shodují se normalizované verze (liší se jen čísly)
      return normK === normKey;
    });
    if(match) {
      mergedPrices[match] = [...mergedPrices[match], ...vals];
    } else {
      mergedPrices[key] = [...vals];
    }
  });

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

  el.innerHTML = '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">'
    + '<button class="tx-filt-btn" id="utab-scan" onclick="switchUctenkyTab(\'scan\',this)">📸 Skenovat</button>'
    + '<button class="tx-filt-btn" id="utab-learn" onclick="switchUctenkyTab(\'learn\',this)">🧠 Učení</button>'
    + '<button class="tx-filt-btn" id="utab-stats" onclick="switchUctenkyTab(\'stats\',this)">📊 Statistiky</button>'
    + '<button class="tx-filt-btn" id="utab-compare" onclick="switchUctenkyTab(\'compare\',this)">🇨🇿 Srovnání ČR</button>'
    + '<button class="tx-filt-btn" id="utab-trend" onclick="switchUctenkyTab(\'trend\',this)">📈 Trend</button>'
    + '<button class="tx-filt-btn" id="utab-prices" onclick="switchUctenkyTab(\'prices\',this)">💹 Zdražování</button>'
    + '<button class="tx-filt-btn" id="utab-stores" onclick="switchUctenkyTab(\'stores\',this)">🏪 Obchody</button>'
    + '<button class="tx-filt-btn" id="utab-history" onclick="switchUctenkyTab(\'history\',this)">📋 Historie</button>'
    + '</div>'
    + (dupCount > 0 ? `<div style="padding:10px 14px;margin-bottom:10px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span style="font-size:.8rem;color:var(--text2)">⚠️ Nalezeno <strong>${dupCount} duplicitních účtenek</strong> (stejný obchod + datum + suma + počet položek). Zobrazuji jen unikátní.</span>
        <button class="btn btn-accent btn-sm" onclick="removeDuplicateReceipts()">🗑️ Smazat duplikáty</button>
      </div>` : '')
    + buildScanTab(uniqueReceipts, totalSpent)
    + buildLearnTab(uniqueReceipts, allItems, storeStats, totalSpent)
    + buildStatsTab(hasData, uniqueReceipts, totalSpent, allItems, catStats)
    + buildCompareTab(hasData, coicopUserTotals, COICOP_GROUPS_DEF, uniqueReceipts, catStats, householdSize)
    + buildTrendTab(coicopMonthly, COICOP_GROUPS_DEF, last6Months)
    + buildPricesTab(priceChanges)
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
  return `<div id="utab-scan-content">
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
      ${receipts.length>0 ? `<div style="text-align:center;font-size:.74rem;color:var(--text2);margin-top:8px">Celkem: <strong>${receipts.length} účtenek</strong> · <strong>${fmt(Math.round(totalSpent))} Kč</strong></div>` : ''}
    </div></div>

    <!-- Preview výsledku – STICKY, nekliknutelné přes overlay -->
    <div id="receiptPreview" style="display:none"></div>

    ${receipts.length===0 ? '<div class="insight-item warn"><div class="insight-icon">💡</div><div class="insight-text">Naskenujte alespoň 3 účtenky pro analýzy a statistiky.</div></div>' : ''}
  </div>`;
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

  let html = `<div id="utab-stats-content" style="display:none">
    <!-- Souhrn -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      <div class="stat-card expense"><div class="stat-label">Celkem utraceno</div><div class="stat-value down">${fmt(Math.round(totalSpent))} Kč</div><div class="stat-sub">${receipts.length} účtenek</div></div>
      <div class="stat-card bank"><div class="stat-label">Průměrný nákup</div><div class="stat-value bankc">${fmt(avgReceipt)} Kč</div></div>
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
              <span>${fmt(Math.round(v.total))} Kč <span style="color:var(--text3)">(${pct}%)</span></span>
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
    g+=`<text x="${pad.l-7}" y="${yy+3.5}" font-size="10" text-anchor="end" fill="#a8aec8">${metric==='qty'?(Math.round(v*10)/10):fmt(Math.round(v))}</text>`;
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
          <title>${k} · ${mLabel(m)}: ${metric==='qty'?((Math.round(v*10)/10)+' ks celkem'):(fmt(Math.round(v))+' Kč celkem')}</title></rect>`;
      });
    });
  } else {
    keys.forEach((k,ki)=>{
      const col=COLORS[ki%COLORS.length];
      const pts=axisMonths.map((m,i)=>({x:x(i), y:y(valOf(k,i)), v:valOf(k,i), m}));
      g+=`<polyline points="${pts.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      pts.forEach(p=>{
        g+=`<circle cx="${p.x}" cy="${p.y}" r="${p.v>0?3.4:2}" fill="${p.v>0?col:'#2a2f42'}" stroke="${col}" stroke-width="1.4">
          <title>${k} · ${mLabel(p.m)}: ${metric==='qty'?((Math.round(p.v*10)/10)+' ks'):(fmt(Math.round(p.v))+' Kč')}</title></circle>`;
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
        <div style="font-family:Syne,sans-serif;font-size:clamp(.78rem,3.4vw,.95rem);font-weight:800;color:var(--expense);line-height:1.1;white-space:nowrap">${fmt(Math.round(v.total))}</div>
        <div style="font-size:.58rem;color:var(--text3)">Kč</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:.82rem;font-weight:600;color:#c9cede">ø&nbsp;${fmt(avgPrice)}</div>
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
            <div style="font-size:.8rem;font-weight:600">ø ${fmt(it.avgPrice)} Kč <span style="color:${trendColor};font-size:.75rem">${priceTrend}</span></div>
            <div style="font-size:.68rem;color:var(--text3)">celkem ${fmt(Math.round(it.totalSpent))} Kč</div>
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
        Vaše měsíční výdaje: <strong>${fmt(totalUser)} Kč</strong> · ČR průměr: <strong>${fmt(totalCzu)} Kč</strong>
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
          ${hasData2 ? (diff===0?'= průměr':(diff>0?'+':'')+fmt(diff)+' Kč ('+pct+'%)') : 'žádná data'}
        </span>
      </div>
      <div style="position:relative;height:16px;background:rgba(139,144,168,.15);border-radius:5px;overflow:hidden;margin-bottom:3px">
        <div style="position:absolute;left:0;top:0;height:100%;width:${czW}%;background:rgba(139,144,168,.3);border-radius:5px"></div>
        ${hasData2?`<div style="position:absolute;left:0;top:0;height:100%;width:${myW}%;background:${g.color};border-radius:5px;opacity:.85"></div>`:''}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.7rem">
        <span style="color:${hasData2?color:'var(--text3)'};font-weight:${hasData2?'700':'400'}">${hasData2?fmt(myAmt)+' Kč':'–'}</span>
        <span style="color:var(--text2)">${fmt(czAmt)} Kč ČR</span>
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
      <div style="font-size:.68rem;color:var(--text2);font-weight:600">${val > 0 ? fmt(Math.round(val/1000))+'k' : '–'}</div>
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
        <div style="font-size:.7rem;color:var(--text2)">ø ${fmt(avg)} Kč/měs</div>
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

function buildPricesTab(priceChanges) {
  let html = '<div id="utab-prices-content" style="display:none">';
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

    html += `<div class="card" style="margin-bottom:12px"><div class="card-body">
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

    const shrinkItems = _filtered.filter(p=>p.shrinkflation);
    const kgItems = _filtered.filter(p=>!p.shrinkflation && p.perUnitData);
    const stdItems = _filtered.filter(p=>!p.shrinkflation && !p.perUnitData);

    html += `<div style="background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.76rem;color:var(--text2);border:1px solid var(--border)">
      📊 Vývoj cen · <strong>${priceChanges.length} položek</strong> ·
      ${shrinkItems.length ? `<span style="color:var(--expense)">🔻 ${shrinkItems.length} shrinkflation</span> · ` : ''}
      ${kgItems.length ? `<span style="color:var(--debt)">⚖️ ${kgItems.length} sledovaných kg/l</span> · ` : ''}
      ${stdItems.length ? `<span style="color:var(--text2)">${stdItems.length} cenových změn</span>` : ''}
    </div>`;

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
        const diff = prev !== null ? h.price - prev : 0;
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
            const diff = prev!==null?h.pricePerUnit-prev:0;
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

      return `<div class="card" style="margin-bottom:10px;border:1px solid ${highlight?'rgba(248,113,113,.4)':'var(--border)'}">
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
function removeDuplicateReceipts() {
  if(!confirm('Smazat duplikátní účtenky? Tato akce je nevratná.')) return;
  const seen = new Set();
  const before = (S.receipts||[]).length;
  S.receipts = (S.receipts||[]).filter(r => {
    const key = `${normalizeStoreName(r.store)}|${r.date}|${Math.round((r.total||0)*100)}|${(r.items||[]).length}`;
    if(seen.has(key)) return false;
    seen.add(key); return true;
  });
  const removed = before - S.receipts.length;
  save();
  renderUctenky();
  alert(`✅ Odstraněno ${removed} duplikátů. Zbývá ${S.receipts.length} účtenek.`);
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
  Object.entries(storeStats).sort((a,b)=>b[1].total-a[1].total).forEach(([store,stats]) => {
    const pct = Math.round(stats.total/totalSpent*100);
    const avg = stats.visits > 1 ? Math.round(stats.total/stats.visits) : null;
    const storeId = 'store_'+store.replace(/[^a-z0-9]/gi,'_');
    const rcts = storeReceipts[store]||[];

    html += `<div class="card" style="margin-bottom:8px;overflow:hidden">
      <!-- Řádek obchodu -->
      <div style="padding:13px 16px;cursor:pointer;display:flex;align-items:center;gap:12px" onclick="toggleHistGroup('${storeId}')">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:1rem;color:var(--text)">${store}</div>
          <div style="font-size:.78rem;color:var(--text2);margin-top:3px">${stats.visits} ${stats.visits===1?'návštěva':stats.visits<5?'návštěvy':'návštěv'} · ${stats.count} položek</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:Syne,sans-serif;font-size:1.25rem;font-weight:800;color:var(--expense)">${fmt(Math.round(stats.total))} Kč</div>
          ${avg !== null ? `<div style="font-size:.75rem;color:var(--text2)">ø ${fmt(avg)} Kč/nákup</div>` : ''}
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
            const catParts = Object.entries(catGroups).slice(0,3).map(([n,v])=>`${v.icon} ${n} ${fmt(Math.round(v.total))} Kč`).join(' · ');
            return `<div style="border-bottom:1px solid var(--border)">
              <!-- Účtenka řádek (bez edit/delete - ty jsou v Historii) -->
              <div style="padding:10px 16px;display:flex;align-items:center;gap:8px;cursor:pointer"
                   onclick="toggleHistReceipt('${rcptId}')">
                <div style="flex:1;min-width:0">
                  <div style="font-size:.85rem;font-weight:600;color:var(--text)">${r.date||'–'}</div>
                  <div style="font-size:.72rem;color:var(--text2);margin-top:2px">${(r.items||[]).length} položek${catParts?' · '+catParts.slice(0,70):''}</div>
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

function switchUctenkyTab(tab, btn) {
  _activeUctenkyTab = tab;
  // FIX (S12.1m): opouštíme záložku → zavři editor účtenky a vyčisti stav
  window._receiptEditorOpen = false;
  window._editReceipt = null;
  ['scan','learn','stats','compare','trend','prices','stores','history'].forEach(t=>{
    const c=document.getElementById('utab-'+t+'-content');
    const b=document.getElementById('utab-'+t);
    if(c)c.style.display='none';
    if(b)b.classList.remove('active');
  });
  const content=document.getElementById('utab-'+tab+'-content');
  if(content)content.style.display='block';
  const button = btn || document.getElementById('utab-'+tab);
  if(button)button.classList.add('active');
}

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
    + '<div style="font-weight:700;font-size:.9rem">💰 '+fmt(Math.round(medianReceipt))+' Kč</div>'
    + '<div style="font-size:.72rem;color:var(--text2)">medián z '+receipts.length+' nákupů</div></div>';

  if(topDayName) html += '<div style="background:var(--surface2);border-radius:10px;padding:10px;border:1px solid var(--border)">'
    + '<div style="font-size:.68rem;color:var(--text2);margin-bottom:3px">Nejčastější den nákupu</div>'
    + '<div style="font-weight:700;font-size:.9rem">📅 '+topDayName+'</div>'
    + '<div style="font-size:.72rem;color:var(--text2)">nejvíce účtenek (celkově)</div></div>';

  if(nextShop) html += '<div style="background:rgba(74,222,128,.08);border-radius:10px;padding:10px;border:1px solid rgba(74,222,128,.2)">'
    + '<div style="font-size:.68rem;color:var(--text2);margin-bottom:3px">Předpověď příštího nákupu</div>'
    + '<div style="font-weight:700;font-size:.9rem;color:var(--income)">🛒 '+nextShop+'</div>'
    + '<div style="font-size:.72rem;color:var(--text2)">interval ~'+avgInterval+' dní · ø '+fmt(Math.round(medianReceipt))+' Kč</div></div>';

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
        + '<td style="padding:6px;text-align:right;font-weight:700">'+fmt(Math.round(v.total))+' Kč</td>'
        + '<td style="padding:6px;text-align:right;color:#a8aec8">'+fmt(Math.round(v.total/v.visits))+' Kč</td>'
        + '<td style="padding:6px;text-align:right;color:#a8aec8">'+dayName+'</td></tr>';
    });
    html += '</tbody></table></div></div></div>';
  }

  // ── S12.1j: SČÍTAČ SLEV – kolik jsi ušetřil slevami (měsíc / rok / celkem + průběh) ──
  {
    const now = new Date();
    let savMonth=0, savYear=0, savTotal=0;
    const byMonth = {};
    receipts.forEach(rr=>{
      const sv = receiptSavings(rr);
      if(sv<=0 || !rr.date) return;
      const d = new Date(rr.date+'T12:00:00');
      savTotal += sv;
      if(d.getFullYear()===now.getFullYear()){ savYear+=sv; if(d.getMonth()===now.getMonth()) savMonth+=sv; }
      const mk = d.getMonth()+'-'+d.getFullYear();
      byMonth[mk]=(byMonth[mk]||0)+sv;
    });
    if(savTotal>0){
      const bars=[];
      for(let i2=5;i2>=0;i2--){
        let m=now.getMonth()-i2, y=now.getFullYear(); while(m<0){m+=12;y--;}
        bars.push({label:(m+1)+'/'+String(y).slice(2), v:Math.round(byMonth[m+'-'+y]||0)});
      }
      const maxB=Math.max(...bars.map(b=>b.v),1);
      html += '<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">💸 Ušetřeno slevami</span></div><div class="card-body">'
        + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">'
        +   '<div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0"><div class="stat-value-h" style="color:var(--income)">'+fmt(Math.round(savMonth))+'</div><div class="stat-label-h">tento měsíc (Kč)</div></div>'
        +   '<div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0"><div class="stat-value-h" style="color:var(--income)">'+fmt(Math.round(savYear))+'</div><div class="stat-label-h">letos (Kč)</div></div>'
        +   '<div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0"><div class="stat-value-h" style="color:var(--income)">'+fmt(Math.round(savTotal))+'</div><div class="stat-label-h">celkem (Kč)</div></div>'
        + '</div>'
        + '<div style="display:flex;align-items:flex-end;gap:6px;height:58px">'
        +   bars.map(b=>'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0">'
              + '<div style="font-size:.6rem;color:var(--income);font-weight:700">'+(b.v?fmt(b.v):'')+'</div>'
              + '<div style="width:100%;max-width:34px;height:'+Math.max(3,Math.round(b.v/maxB*30))+'px;background:linear-gradient(180deg,#4ade80,#22c55e);border-radius:4px 4px 0 0;opacity:'+(b.v?'1':'.25')+'"></div>'
              + '<div style="font-size:.6rem;color:#a8aec8">'+b.label+'</div>'
            + '</div>').join('')
        + '</div></div></div>';
    }
  }

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
        +   '<span style="font-weight:700;font-size:.88rem">Ø '+fmt(Math.round(it.total/it.count))+'&nbsp;Kč</span>'
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
      + 'V <strong>'+expensiveStore[0]+'</strong> utrácíte průměrně '+fmt(expAvg)+' Kč/nákup, '
      + 'v <strong>'+cheapStore[0]+'</strong> jen '+fmt(cheapAvg)+' Kč. '
      + 'Úspora '+fmt(expAvg-cheapAvg)+' Kč na nákup!</div></div>';
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
  // FIX (S12.1m): TVRDÝ reset stavu před otevřením – po překliknutí stránek mohl
  // zůstat _receiptEditorOpen=true a osiřelé _editReceipt/_lastReceiptResult z minula,
  // což blokovalo render i nové otevření (editor „zmizel").
  window._editReceipt = null;
  window._receiptEditorOpen = false;

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
  if(S.receipts)S.receipts.splice(index,1);
  save(); renderUctenky();
  switchUctenkyTab('history',document.getElementById('utab-history'));
}

// ── Fronta fotek účtenek ──
let _receiptQueue = []; // [{base64, thumb}]

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

  try {
    // FIX-061 (Session 8): 60s timeout – ochrana před viseními Worker volánímami.
    const ctrl = new AbortController();
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
        throw new Error('Analýza trvala déle než 60 sekund. Zkuste znovu nebo s menším počtem fotek.');
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err?.error || 'HTTP ' + res.status);
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

    if(status) status.style.display='none';
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
      status.innerHTML=`<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text">
        <strong>Nepodařilo se analyzovat</strong><br>
        <span style="font-size:.76rem">${e.message}</span>
      </div></div>`;
    }
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
  window._editReceipt = JSON.parse(JSON.stringify(receipt));
  // Session 12.1: předvyplň 🏷️ tagy položek z produktové DB (ČSÚ spotřební koš) – jen kde tag chybí
  if(typeof productGroupPrefill === 'function') productGroupPrefill(window._editReceipt);
  const r = window._editReceipt;

  return `<div id="receiptEditForm" onclick="event.stopPropagation()" style="background:var(--surface);border:2px solid rgba(74,222,128,.3);border-radius:14px;padding:16px;margin-top:12px;box-shadow:0 4px 24px rgba(0,0,0,.3)">

    <!-- Hlavička -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
      <div style="flex:1;margin-right:12px">
        <input id="rp_store" class="fi" value="${(r.store||'').replace(/"/g,'&quot;')}" placeholder="Název obchodu"
          style="font-weight:700;font-size:.95rem;margin-bottom:6px"
          oninput="window._editReceipt.store=this.value;rpUpdateTotal()">
        <div style="display:flex;gap:6px">
          <input id="rp_date" class="fi" type="date" value="${r.date||''}"
            style="font-size:.8rem;flex:1"
            oninput="window._editReceipt.date=this.value; rpCheckFutureDate()">
          <select id="rp_cat" class="fi" style="font-size:.8rem;flex:1"
            onchange="window._editReceipt.category=this.value; if(window._editReceipt.store){ const D=getData(); const cat=D.categories?.find(c=>c.name===this.value); if(cat) saveCategoryMapping(window._editReceipt.store, cat.id, ''); }">
            ${(()=>{
              const D = getData();
              const userCats = (D.categories||[]).map(c=>c.name);
              const allCats = [...new Set(['Jídlo & Nákupy','Drogerie','Restaurace','Benzín','Elektronika','Lékárna','Oblečení','Sport','Domácí mazlíčci','Dům & Zahrada','Jiné',...userCats])];
              return allCats.map(c=>`<option value="${c}" ${r.category===c?'selected':''}>${c}</option>`).join('');
            })()}
          </select>
        </div>
        <div id="rp_future_warn" style="display:${(r.date && new Date(r.date) > new Date(new Date().setHours(23,59,59,999)))?'flex':'none'};gap:8px;align-items:center;margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--expense-bg);border:1px solid rgba(248,113,113,.3);font-size:.74rem;color:var(--expense)">
          <span>⚠️</span><span>Datum je v budoucnosti – zkontroluj, jestli analyzér nepřečetl datum špatně. Transakce by spadla mimo aktuální měsíc.</span>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:.72rem;color:var(--text2);margin-bottom:2px">Celkem</div>
        <div id="rp_total_display" style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800;color:var(--expense)">−${fmtP(r.total||0)} Kč</div>
      </div>
    </div>

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

// Vrátí {catName, catId} pro položku – priority: 1) AI mappings, 2) keyword match, 3) Ostatní
function guessItemCatId(itemName) {
  const D = getData();
  // 1. AI mappings cache
  const cached = lookupCategoryMapping(itemName);
  if(cached && cached.catId && D.categories?.find(c=>c.id===cached.catId)) {
    const cat = D.categories.find(c=>c.id===cached.catId);
    return {catId: cat.id, catName: cat.name, fromMemory: true};
  }
  // 2. Keyword match → catId
  const n = (itemName||'').toLowerCase();
  for(const [catName, keys] of Object.entries(RP_ITEM_CATS)) {
    if(keys.some(k=>n.includes(k))) {
      const catId = getRpCatId(catName);
      return {catId, catName, fromMemory: false};
    }
  }
  // 3. Fallback
  return {catId:'', catName:'Ostatní', fromMemory: false};
}

function guessItemCategory(name) {
  return guessItemCatId(name).catName;
}

// ── TODO-008: Validace JSON odpovědí z AI ──
// Zajišťuje že AI vrátila správný formát před dalším zpracováním
function validateReceiptJSON(r) {
  if(!r || typeof r !== 'object') throw new Error('Odpověď není objekt');
  // store – fallback na 'Neznámý obchod'
  if(!r.store || typeof r.store !== 'string') r.store = 'Neznámý obchod';
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
    const key = rawName
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
      const g = guessItemCatId(it.name);
      it.itemCat = g.catName;
      it.itemCatId = g.catId;
      it._fromMemory = g.fromMemory;
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
  // Přidat fallback "Ostatní" pokud není v user cats
  const catOptionsAll = `<option value="">📦 Ostatní</option>` + catOptions;

  // Seskup položky dle itemCatId/itemCat pro přehlednost
  const groups = {};
  r.items.forEach((it, i) => {
    const key = it.itemCatId || '__other__';
    const label = it.itemCat || 'Ostatní';
    if(!groups[key]) groups[key] = {label, items:[], catId:it.itemCatId||''};
    groups[key].items.push({it, i});
  });

  let html = '';
  for(const [key, group] of Object.entries(groups)) {
    const cat = userCats.find(c=>c.id===key);
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
      const fromMem = it._fromMemory ? `<span title="Z AI paměti" style="font-size:.55rem;color:var(--income);margin-left:2px">🧠</span>` : '';
      html += `
        <div style="display:flex;align-items:center;gap:5px;padding:5px 2px;border-bottom:1px solid var(--border)" id="rp_item_${i}">
          <input id="rp_name_${i}"
            value="${(it.name||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}"
            placeholder="Název položky"
            style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 8px;color:var(--text);font-size:.78rem;min-width:130px"
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
          <input id="rp_qty_${i}" type="number"
            value="${it.qty||1}" min="1" step="1"
            style="width:42px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 4px;color:var(--text);font-size:.78rem;text-align:center"
            inputmode="numeric">
          <span style="font-size:.68rem;color:var(--text2);flex-shrink:0">ks</span>
          <input id="rp_price_${i}" type="number"
            value="${it.price||0}" min="0" step="0.01"
            style="width:68px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 6px;color:var(--text);font-size:.82rem;text-align:right;-moz-appearance:textfield"
            inputmode="decimal">
          <span style="font-size:.68rem;color:var(--text2);flex-shrink:0">Kč</span>
          <input id="rp_tag_${i}" type="text"
            value="${it.tag||''}"
            placeholder="🏷️ tag"
            style="width:72px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 6px;color:var(--income);font-size:.72rem;font-style:italic"
            list="rp_tag_suggestions"
            title="Vlastní tag (např. Kafe, Jogurt, Svačina...)"
            onfocus="this.placeholder=''"
            onblur="if(!this.value)this.placeholder='🏷️ tag'">
          <button onclick="rpRemoveItem(${i})" style="background:none;border:none;color:var(--expense);cursor:pointer;font-size:1rem;padding:2px;flex-shrink:0">✕</button>
        </div>`;
    });
    html += '</div>';
  }
  el.innerHTML = '<div style="min-width:600px">' + html + '</div>';

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
          const g = guessItemCatId(nameEl.value);
          r.items[i].itemCat = g.catName;
          r.items[i].itemCatId = g.catId;
          r.items[i]._fromMemory = g.fromMemory;
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
        r.items[i].itemCat = selectedCat?.name || 'Ostatní';
        r.items[i]._fromMemory = false;
        r.items[i].itemSubcat = ''; // reset subcat při změně kategorie
        if(r.items[i].name && selectedId) {
          saveCategoryMapping(r.items[i].name, selectedId, '');
        }
        catEl.blur(); // FIX: uvolni fokus → rpRender() nebude blokován
        rpRender();
      });
    }
    const subcatEl = document.getElementById('rp_subcat_'+i);
    if(subcatEl) {
      subcatEl.addEventListener('change', () => {
        r.items[i].itemSubcat = subcatEl.value;
      });
    }
    if(qtyEl) {
      qtyEl.addEventListener('input',  () => { r.items[i].qty = parseFloat(qtyEl.value)||1; rpUpdateTotal(); });
      qtyEl.addEventListener('change', () => { r.items[i].qty = parseFloat(qtyEl.value)||1; rpUpdateTotal(); });
    }
    if(priceEl) {
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
  const key = itemName.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // diakritika
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

function rpUpdateTotal() {
  const r = window._editReceipt; if(!r) return;
  const sum = (r.items||[]).reduce((a,it)=>a+lineAmt(it),0);
  r.total = Math.round(sum*100)/100;
  const el = document.getElementById('rp_total_display');
  if(el) el.textContent = '−' + fmtP(r.total) + ' Kč';
}

function rpAddItem() {
  if(!window._editReceipt.items) window._editReceipt.items = [];
  window._editReceipt.items.push({name:'', price:0, qty:1});
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

function rpSave() {
  const r = window._editReceipt; if(!r) return;
  publishToCatalog(r.items||[]);
  // Aktualizuj i cenový katalog pro hlídač
  if(r.items?.length && typeof publishPricesToCatalog === 'function') {
    publishPricesToCatalog(r.items, r.store, r.date);
  }

  // Pokud editujeme existující účtenku z historie, přepiš ji
  const histIdx = (_lastReceiptResult?.historyIndex) ?? (window._editReceipt?._historyIdx);
  if(histIdx !== undefined && S.receipts?.[histIdx]) {
    S.receipts[histIdx] = {...S.receipts[histIdx], ...r, updatedAt: Date.now()};
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

async function analyzeReceipt(file) {
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

    // FIX-061 (Session 8): 60s timeout – pokud Worker nereaguje, neblokovat UI navěky.
    // AbortController odpojí fetch a vyhodí chybu, kterou catch zachytí jako "timeout".
    const ctrl = new AbortController();
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
        throw new Error('Analýza trvala déle než 60 sekund. Zkuste foto znovu nebo později.');
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    if(!response.ok) {
      const err = await response.json().catch(()=>({}));
      throw new Error(err?.error||'HTTP '+response.status);
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

    if(status) status.style.display='none';
    _lastReceiptResult = {receipt, n:1};
    if(preview) {
      preview.style.display='block';
      preview.innerHTML = buildReceiptPreviewHTML(receipt, 1); setTimeout(initReceiptEditor, 50);
    }
  } catch(e) {
    if(status) {
      status.style.display='block';
      status.innerHTML=`<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text">
        <strong>Nepodařilo se analyzovat účtenku</strong><br>
        <span style="font-size:.76rem">${e.message}</span><br>
        <span style="font-size:.72rem;color:var(--text3)">Tip: Ujistěte se že jste přihlášeni přes Google a foto je čitelné.</span>
      </div></div>`;
    }
  }
}

function addReceiptAsTx(receipt) {
  const D = getData();
  if(!S.transactions) S.transactions=[];
  if(!S.receipts) S.receipts=[];

  const items = receipt.items||[];
  const date = receipt.date||new Date().toISOString().slice(0,10);
  const store = receipt.store||'Nákup';

  // Rozděl položky dle catId → skupiny
  const catGroups = {}; // {catId: {cat, items, total}}
  items.forEach(it => {
    const catId = it.itemCatId || '';
    const cat = D.categories?.find(c=>c.id===catId);
    const key = catId || '__other__';
    if(!catGroups[key]) catGroups[key] = {cat, catId, items:[], total:0};
    const lineTotal = (parseFloat(it.price)||0) * (parseFloat(it.qty)||1);
    catGroups[key].items.push({...it, lineTotal});
    catGroups[key].total += lineTotal;
  });

  // Pokud žádné položky nebo jen jedna skupina → fallback na jednu transakci
  const groupKeys = Object.keys(catGroups);
  let addedCount = 0;

  if(!items.length || groupKeys.length === 0) {
    // Fallback – jedna transakce pro celou účtenku
    const cached = lookupCategoryMapping(store);
    const cat = cached ? D.categories?.find(c=>c.id===cached.catId) : null;
    const fallbackCat = cat || D.categories?.find(c=>c.name.includes('Jídlo')||c.name.includes('Nákup')) || D.categories?.[0];
    S.transactions.push({
      id:genTxId(), name:store, amount:receipt.total||0, amt:receipt.total||0,
      type:'expense', date, catId:fallbackCat?.id||'', category:fallbackCat?.id||'',
      note:`📸 Naskenováno · ${items.length} položek`,
    });
    if(store && fallbackCat?.id) saveCategoryMapping(store, fallbackCat.id, '');
    addedCount = 1;
  } else {
    // Multi-tx: jedna transakce per kategorii
    groupKeys.forEach(key => {
      const group = catGroups[key];
      const catId = group.catId;
      const cat = group.cat;
      const itemNames = group.items.map(it=>it.name).filter(Boolean).join(', ');
      const note = `📸 ${store} · ${group.items.length} pol.: ${itemNames.slice(0,60)}${itemNames.length>60?'…':''}`;

      S.transactions.push({
        id: genTxId(),
        name: store,
        amount: Math.round(group.total*100)/100,
        amt: Math.round(group.total*100)/100,
        type: 'expense',
        date, catId, category: catId,
        // Podkategorie – z první položky skupiny co má itemSubcat
        subcat: group.items.find(it=>it.itemSubcat)?.itemSubcat || '',
        // Tagy z položek (🏷️ zelené tagy)
        tags: [...new Set(group.items.map(it=>it.tag).filter(Boolean))].join(' '),
        note,
        receiptItems: group.items.map(it=>({name:it.name, price:it.price, qty:it.qty, unit:it.unit||'ks', lineTotal:it.lineTotal, tag:it.tag||''})),
        receiptDate: receipt.date || '',
        receiptStore: receipt.store || '',
      });

      // Ulož mapování pro každou položku
      group.items.forEach(it => {
        if(it.name && catId) saveCategoryMapping(it.name, catId, '');
      });
      addedCount++;
    });

    // Ulož i obchod→nejčastější kategorie
    if(store) {
      const biggestGroup = groupKeys.reduce((a,b)=>catGroups[a].total>catGroups[b].total?a:b);
      const mainCatId = catGroups[biggestGroup].catId;
      if(mainCatId) saveCategoryMapping(store, mainCatId, '');
    }
  }

  S.receipts.unshift({...receipt, addedAt:Date.now()});
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
  if(status) { status.style.display='block'; status.innerHTML=`<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text">Přidáno <strong>${addedCount} transakcí</strong> dle kategorií položek. Uloženo do AI paměti.</div></div>`; }
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
      ctx.fillText(fmt(v), pad.l-7, yy+3);
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
        const lines = data.series.map(s=>({t:s.store.slice(0,14)+': '+fmt(s.values[idx])+' Kč', c:s.color, v:s.values[idx]}))
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
  // Pro každou propojenou transakci aktualizuj tagy podle jejích položek
  linked.forEach(t => {
    // Najdi položky které patří této transakci (podle kategorie transakce)
    const matchItems = (r.items||[]).filter(it => {
      // Pokud transakce má catId, vyber položky té kategorie; jinak všechny
      return !t.catId || it.itemCatId === t.catId;
    });
    const itemsForTx = matchItems.length ? matchItems : (r.items||[]);
    // Tagy z těchto položek
    const tagSet = [...new Set(itemsForTx.map(it=>it.tag).filter(Boolean))];
    if(tagSet.length) t.tags = tagSet.join(' ');
    // Aktualizuj receiptItems (pro expand v transakci)
    t.receiptItems = itemsForTx.map(it=>({name:it.name, price:it.price, qty:it.qty, unit:it.unit||'ks', lineTotal:it.lineTotal, tag:it.tag||''}));
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
