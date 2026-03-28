//  ANALÝZA ÚČTENEK
// ══════════════════════════════════════════════════════
// ── COICOP globální konstanty a engine ──
const COICOP_GROUPS_DEF = [
  {id:1,  name:'Potraviny a nealk. nápoje',  icon:'🛒', color:'#4ade80', avg_osoba:3300, avg_domacnost:7800},
  {id:2,  name:'Alkohol a tabák',             icon:'🍺', color:'#f59e0b', avg_osoba:310,  avg_domacnost:730},
  {id:3,  name:'Oblečení a obuv',             icon:'👗', color:'#f472b6', avg_osoba:400,  avg_domacnost:940},
  {id:4,  name:'Bydlení a energie',           icon:'🏠', color:'#60a5fa', avg_osoba:4000, avg_domacnost:9500},
  {id:5,  name:'Vybavení domácnosti',         icon:'🛋️', color:'#a78bfa', avg_osoba:500,  avg_domacnost:1200},
  {id:6,  name:'Zdraví',                      icon:'💊', color:'#f87171', avg_osoba:500,  avg_domacnost:1100},
  {id:7,  name:'Doprava',                     icon:'🚗', color:'#fb923c', avg_osoba:1800, avg_domacnost:4200},
  {id:8,  name:'Komunikace',                  icon:'📱', color:'#34d399', avg_osoba:350,  avg_domacnost:820},
  {id:9,  name:'Rekreace a kultura',          icon:'🎭', color:'#e879f9', avg_osoba:1100, avg_domacnost:2600},
  {id:10, name:'Vzdělávání',                  icon:'📚', color:'#2dd4bf', avg_osoba:150,  avg_domacnost:350},
  {id:11, name:'Restaurace a ubytování',      icon:'🍽️', color:'#facc15', avg_osoba:600,  avg_domacnost:1400},
  {id:12, name:'Ostatní zboží a služby',      icon:'💼', color:'#94a3b8', avg_osoba:400,  avg_domacnost:950},
  {id:13, name:'Transfery a ostatní',         icon:'↔️', color:'#cbd5e1', avg_osoba:200,  avg_domacnost:470},
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

function renderUctenky() {
  const el = document.getElementById('uctenkyContent'); if(!el) return;
  const receipts = S.receipts || [];
  const hasData = receipts.length >= 3;
  const allItems = receipts.flatMap(r => (r.items||[]).map(it => ({...it, store:r.store, date:r.date})));
  const storeStats = {};
  receipts.forEach(r => {
    const s = r.store||'Neznámý';
    if(!storeStats[s]) storeStats[s] = {total:0, count:0, visits:0};
    storeStats[s].total += r.total||0;
    storeStats[s].count += (r.items||[]).length;
    storeStats[s].visits++;
  });
  const totalSpent = receipts.reduce((a,r)=>a+(r.total||0),0);
  const avgReceipt = receipts.length ? Math.round(totalSpent/receipts.length) : 0;
  const catStats = {};
  receipts.forEach(r => {
    const c = r.category||'Jiné';
    if(!catStats[c]) catStats[c] = 0;
    catStats[c] += r.total||0;
  });
  const itemPrices = {};
  allItems.forEach(it => {
    // Normalizuj název – odstraň hmotnosti, gramy, ml, velikosti
    const rawName = (it.name||'').toLowerCase().trim();
    const key = rawName
      .replace(/\d+\s*(g|kg|ml|l|ks|cm|mm)\b/g, '')  // odstraň "43g", "250ml"
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 25);
    if(key.length < 3) return;

    const qty = Math.max(1, it.qty || 1);
    const rawPrice = it.price || 0;
    if(rawPrice <= 0) return;

    // Claude má instrukci vracet vždy jednotkovou cenu - důvěřujeme mu
    const unitPrice = parseFloat(rawPrice.toFixed(2));

    if(unitPrice <= 0) return;
    if(!itemPrices[key]) itemPrices[key] = [];
    itemPrices[key].push({
      date: it.date || '',
      price: unitPrice,
      qty,
      store: it.store || '',
      originalName: it.name || ''
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
      // Deduplikuj – zachovej jen záznamy kde se cena změnila oproti předchozímu
      const deduped = sorted.filter((h, i) => {
        if(i === 0) return true; // vždy první
        return h.price !== sorted[i-1].price; // jen pokud se cena změnila
      });
      // Potřebujeme alespoň 2 různé ceny
      if(deduped.length < 2) return null;
      const first = deduped[0].price;
      const last = deduped[deduped.length-1].price;
      const change = first > 0 ? Math.round((last-first)/first*100) : 0;
      const displayName = sorted[sorted.length-1].originalName || name;
      return {name, displayName, first, last, change, count: deduped.length, history: deduped, allHistory: sorted};
    })
    .filter(p => p && Math.abs(p.change) > 3)
    .sort((a,b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 10);
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
  const allMonthTxs = (D2.transactions||[]).filter(t=>t.type==='expense');
  const txMonths = new Set(allMonthTxs.map(t=>(t.date||'').slice(0,7)));
  const numMonths = Math.max(txMonths.size, 1);
  allMonthTxs.forEach(tx => {
    const {coicopId} = mapToCOICOP(tx);
    coicopUserTotals[coicopId] = (coicopUserTotals[coicopId]||0) + (tx.amount||tx.amt||0);
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
    coicopMonthly[coicopId][month] = (coicopMonthly[coicopId][month]||0) + (tx.amount||tx.amt||0);
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
    + buildScanTab(receipts, totalSpent)
    + buildLearnTab(receipts, allItems, storeStats, totalSpent)
    + buildStatsTab(hasData, receipts, totalSpent, allItems, catStats)
    + buildCompareTab(hasData, coicopUserTotals, COICOP_GROUPS_DEF, receipts, catStats, householdSize)
    + buildTrendTab(coicopMonthly, COICOP_GROUPS_DEF, last6Months)
    + buildPricesTab(priceChanges)
    + buildStoresTab(storeStats, totalSpent)
    + buildHistoryTab(receipts);

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
  const itemFreq = {};
  allItems.forEach(it=>{
    const k=(it.name||'').trim(); if(k.length<2)return;
    if(!itemFreq[k])itemFreq[k]={count:0,total:0};
    itemFreq[k].count++; itemFreq[k].total+=it.price||0;
  });
  const topItems = Object.entries(itemFreq).sort((a,b)=>b[1].count-a[1].count).slice(0,8);
  let html = '<div id="utab-stats-content" style="display:none">'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">'
    + '<div class="stat-card expense"><div class="stat-label">Celkem utraceno</div><div class="stat-value down">'+fmt(Math.round(totalSpent))+' Kč</div><div class="stat-sub">'+receipts.length+' účtenek</div></div>'
    + '<div class="stat-card bank"><div class="stat-label">Průměrný nákup</div><div class="stat-value bankc">'+fmt(avgReceipt)+' Kč</div></div>'
    + '<div class="stat-card income"><div class="stat-label">Naskenováno položek</div><div class="stat-value up">'+allItems.length+'</div></div>'
    + '</div>';
  // Category bars
  html += '<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">🛒 Výdaje dle kategorie</span></div><div class="card-body">';
  Object.entries(catStats).sort((a,b)=>b[1]-a[1]).forEach(([cat,amt])=>{
    const pct = Math.round(amt/totalSpent*100);
    html += '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:3px"><span style="font-weight:600">'+cat+'</span><span>'+fmt(Math.round(amt))+' Kč <span style="color:var(--text2)">('+pct+'%)</span></span></div><div class="trap-bar"><div class="trap-bar-fill" style="width:'+pct+'%;background:var(--bank)"></div></div></div>';
  });
  html += '</div></div>';
  // Top items
  html += '<div class="card"><div class="card-header"><span class="card-title">🧬 Nejčastěji nakupované položky</span></div><div class="card-body">';
  if(topItems.length) {
    topItems.forEach(([name,v])=>{
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:.8rem"><div><span style="font-weight:600">'+name+'</span> <span style="color:var(--text2);font-size:.72rem">'+v.count+'×</span></div><span style="color:var(--text2)">ø '+fmt(Math.round(v.total/v.count))+' Kč</span></div>';
    });
  } else html += '<div class="empty"><div class="et">Přidejte účtenky s položkami</div></div>';
  html += '</div></div></div>';
  return html;
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
        Potřebuje stejnou položku se dvěma různými cenami na různých účtenkách.
      </div>
    </div></div></div>`;
  } else {
    html += `<div style="background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.76rem;color:var(--text2);border:1px solid var(--border)">
      📊 Vývoj <strong>ceny za kus</strong> · zobrazeny pouze záznamy se změnou ceny · ${priceChanges.length} položek
    </div>`;

    priceChanges.forEach((p, pi) => {
      const color = p.change > 0 ? 'var(--expense)' : 'var(--income)';
      const arrow = p.change > 0 ? '↑' : '↓';
      const label = p.change > 0 ? 'Zdražilo' : 'Zlevnilo';
      const minP = Math.min(...p.history.map(h=>h.price));
      const maxP = Math.max(...p.history.map(h=>h.price));
      const range = maxP - minP || 1;

      // Slider pro časové rozmezí – všechny záznamy včetně duplikátů
      const allDates = (p.allHistory || p.history).map(h=>h.date).filter(Boolean);
      const firstDate = allDates[0] || '';
      const lastDate = allDates[allDates.length-1] || '';
      const sliderHtml = allDates.length > 1 ? `
        <div style="padding:8px 14px 4px;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--text2);margin-bottom:4px">
            <span>📅 Rozmezí: <strong id="price-range-label-${pi}">${firstDate} – ${lastDate}</strong></span>
            <span style="color:${color};font-weight:700">${fmtP(minP)} – ${fmtP(maxP)} Kč/ks</span>
          </div>
          <input type="range" min="0" max="${allDates.length-1}" value="${allDates.length-1}"
            style="width:100%;accent-color:${p.change>0?'#f87171':'#4ade80'};height:4px;cursor:pointer"
            oninput="updatePriceSlider(${pi},this.value,${JSON.stringify(allDates).replace(/"/g,"'")})"
          >
        </div>` : '';

      // Timeline – jen unikátní ceny
      const timeline = p.history.map((h, i) => {
        const prev = i > 0 ? p.history[i-1].price : null;
        const diff = prev !== null ? h.price - prev : 0;
        const diffStr = diff !== 0 ? `<span style="font-size:.7rem;color:${diff>0?'var(--expense)':'var(--income)'}">
          ${diff>0?'↑':'↓'} ${fmtP(Math.abs(diff))} Kč</span>` : '';
        const barW = range > 0 ? Math.round((h.price - minP) / range * 80) + 10 : 50;
        const isLast = i === p.history.length - 1;
        const barColor = i === 0 ? 'var(--bank)' : diff > 0 ? 'var(--expense)' : 'var(--income)';
        const priceColor = diff > 0 ? 'var(--expense)' : diff < 0 ? 'var(--income)' : 'var(--text)';
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:${isLast?'none':'1px solid var(--border)'}">
          <div style="min-width:72px;font-size:.72rem;color:var(--text2)">${h.date||'–'}</div>
          <div style="width:120px;flex-shrink:0">
            <div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${barW}%;background:${barColor};border-radius:3px"></div>
            </div>
          </div>
          <div style="min-width:56px;text-align:right;font-weight:700;font-size:.84rem;color:${priceColor}">
            ${fmtP(h.price)} Kč
          </div>
          <div style="min-width:64px;font-size:.7rem">${diffStr}</div>
          ${h.store?`<div style="font-size:.7rem;color:var(--text2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.store}</div>`:''}
        </div>`;
      }).join('');

      html += `<div class="card" style="margin-bottom:12px">
        <div style="padding:12px 14px;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:700;font-size:.9rem;text-transform:capitalize">${p.displayName}</div>
              <div style="font-size:.72rem;color:var(--text2)">${p.count} unikátních cen</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800;color:${color}">${arrow} ${Math.abs(p.change)}%</div>
              <div style="font-size:.72rem;color:var(--text2)">${label} o ${fmtP(Math.abs(p.last-p.first))} Kč/ks</div>
            </div>
          </div>
        </div>
        ${sliderHtml}
        <div style="padding:8px 14px">${timeline}</div>
      </div>`;
    });
  }
  return html + '</div>';
}

function updatePriceSlider(pi, val, dates) {
  const label = document.getElementById('price-range-label-'+pi);
  if(!label) return;
  const idx = parseInt(val);
  label.textContent = dates[0] + ' – ' + dates[idx];
}

function buildStoresTab(storeStats, totalSpent) {
  let html = '<div id="utab-stores-content" style="display:none">';
  if(!Object.keys(storeStats).length) {
    html += '<div class="card"><div class="card-body"><div class="empty"><div class="et">Žádné obchody zatím</div></div></div></div>';
  } else {
    html += '<div style="background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.76rem;color:var(--text2);border:1px solid var(--border)">🏪 Kde utrácíte a průměrný nákup.</div>';
    Object.entries(storeStats).sort((a,b)=>b[1].total-a[1].total).forEach(([store,stats])=>{
      const avg = Math.round(stats.total/stats.visits);
      const pct = Math.round(stats.total/totalSpent*100);
      html += '<div class="card" style="margin-bottom:10px"><div class="card-body" style="padding:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><div style="font-weight:700;font-size:.9rem">'+store+'</div><div style="font-size:.72rem;color:var(--text2)">'+stats.visits+' návštěv · '+stats.count+' položek</div></div><div style="text-align:right"><div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:var(--expense)">'+fmt(Math.round(stats.total))+' Kč</div><div style="font-size:.72rem;color:var(--text2)">ø '+fmt(avg)+' Kč/nákup</div></div></div><div class="trap-bar"><div class="trap-bar-fill" style="width:'+pct+'%;background:var(--bank)"></div></div><div style="font-size:.7rem;color:var(--text2);margin-top:3px">'+pct+'% z celkových výdajů</div></div></div>';
    });
  }
  return html+'</div>';
}

function buildHistoryTab(receipts) {
  let html = '<div id="utab-history-content" style="display:none">';
  if(!receipts.length) {
    html += '<div class="card"><div class="card-body"><div class="empty"><div class="ei">📋</div><div class="et">Žádné účtenky</div></div></div></div>';
  } else {
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:.76rem;color:var(--text2)">${receipts.length} účtenek celkem</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" onclick="exportReceiptsCSV()" title="Export do CSV/Excel">📊 Export</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--expense)" onclick="deleteAllReceipts()">🗑️ Smazat vše</button>
      </div>
    </div>`;
    html += '<div class="card"><div class="card-body" style="padding:0">';
    receipts.forEach((r,i)=>{
      html += '<div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px"><div style="flex:1"><div style="font-weight:600;font-size:.85rem">'+(r.store||'Neznámý')+'</div><div style="font-size:.72rem;color:var(--text2)">'+(r.date||'')+' · '+(r.category||'')+' · '+(r.items||[]).length+' položek</div></div><div style="font-weight:700;color:var(--expense);margin-right:6px">'+fmtP(r.total||0)+' Kč</div><button class="btn btn-edit btn-icon btn-sm" onclick="editReceiptFromHistory('+i+')" title="Upravit">✎</button><button class="btn btn-danger btn-icon btn-sm" onclick="deleteReceipt('+i+')">✕</button></div>';
    });
    html += '</div></div>';
  }
  return html+'</div>';
}

let _activeUctenkyTab = 'scan'; // Zapamatuj aktivní záložku

function switchUctenkyTab(tab, btn) {
  _activeUctenkyTab = tab;
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
    + '<div style="font-size:.72rem;color:var(--text2)">nejvíce účtenek</div></div>';

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

  // Pravidelné položky – co kupuješ opakovaně
  if(frequentItems.length) {
    html += '<div class="card" style="margin-bottom:14px"><div class="card-header"><span class="card-title">🔄 Pravidelně nakupuješ</span></div><div class="card-body">';
    frequentItems.forEach(it=>{
      const stores = [...it.stores].join(', ');
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">'
        + '<div><div style="font-weight:600;font-size:.84rem">'+it.name+'</div>'
        + '<div style="font-size:.76rem;color:var(--text2);margin-top:2px"><strong style="color:var(--bank)">'+it.count+'×</strong> nakoupeno'+( stores?' · <span style="color:var(--text2)">'+stores+'</span>':'')+'</div></div>'
        + '<div style="text-align:right"><div style="font-weight:700;font-size:.9rem">'+fmt(Math.round(it.total/it.count))+' Kč</div>'
        + '<div style="font-size:.7rem;color:var(--text2)">průměr/ks</div></div></div>';
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
  // Přepni na záložku Skenovat
  switchUctenkyTab('scan');
  // Zobraz editor s touto účtenkou
  _lastReceiptResult = {receipt: JSON.parse(JSON.stringify(r)), n: 1, historyIndex: index};
  const preview = document.getElementById('receiptPreview');
  const status = document.getElementById('receiptStatus');
  if(status) status.style.display = 'none';
  if(preview) {
    preview.style.display = 'block';
    preview.innerHTML = buildReceiptPreviewHTML(_lastReceiptResult.receipt, 1);
    setTimeout(initReceiptEditor, 50);
  }
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

async function addReceiptPhoto(file) {
  if(!file) return;
  const status = document.getElementById('receiptStatus');
  if(status) { status.style.display='block'; status.innerHTML='<div class="insight-item warn"><div class="insight-icon">⏳</div><div class="insight-text">Připravuji foto...</div></div>'; }
  try {
    const base64 = await compressReceiptImage(file);
    const thumb = 'data:image/jpeg;base64,' + base64;
    _receiptQueue.push({base64, thumb});
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
  if(!_receiptQueue.length) return;
  const status = document.getElementById('receiptStatus');
  const preview = document.getElementById('receiptPreview');

  const token = await getAuthToken();
  if(!token) {
    if(status) { status.style.display='block'; status.innerHTML='<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Pro analýzu účtenek se musíte přihlásit přes <strong>Google účet</strong>.</div></div>'; }
    return;
  }

  const n = _receiptQueue.length;
  if(status) { status.style.display='block'; status.innerHTML=`<div class="insight-item warn"><div class="insight-icon">⏳</div><div class="insight-text">Claude analyzuje ${n === 1 ? 'účtenku' : n + ' části účtenky'}...</div></div>`; }
  if(preview) preview.style.display='none';

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        type: 'receipt',
        payload: {
          images: _receiptQueue.map(p => ({imageData: p.base64, mediaType: 'image/jpeg'}))
        }
      })
    });

    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err?.error || 'HTTP ' + res.status);
    }
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    if(!text) throw new Error('Prázdná odpověď od Claude');

    let receipt;
    try {
      receipt = JSON.parse(text.replace(/```json|```/g,'').trim());
    } catch(e) {
      throw new Error('Claude nevrátil validní JSON. Zkuste čitelnější foto.');
    }
    if(!receipt.store && !receipt.total) throw new Error('Účtenka nebyla rozpoznána.');

    if(status) status.style.display='none';
    _receiptQueue = [];
    updateReceiptQueue();
    _lastReceiptResult = {receipt, n}; // Ulož pro případ překreslení

    if(preview) {
      preview.style.display='block';
      preview.innerHTML = buildReceiptPreviewHTML(receipt, n); setTimeout(initReceiptEditor, 50);
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
            oninput="window._editReceipt.date=this.value">
          <select id="rp_cat" class="fi" style="font-size:.8rem;flex:1"
            onchange="window._editReceipt.category=this.value">
            ${(()=>{
              const D = getData();
              const userCats = (D.categories||[]).map(c=>c.name);
              const allCats = [...new Set(['Jídlo & Nákupy','Drogerie','Restaurace','Benzín','Elektronika','Lékárna','Oblečení','Sport','Domácí mazlíčci','Dům & Zahrada','Jiné',...userCats])];
              return allCats.map(c=>`<option value="${c}" ${r.category===c?'selected':''}>${c}</option>`).join('');
            })()}
          </select>
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
        <span style="font-size:.76rem;font-weight:600;color:var(--text2)">Položky</span>
        <button class="btn btn-ghost btn-sm" onclick="rpAddItem()" style="font-size:.72rem">➕ Přidat</button>
      </div>
      <div id="rp_items"></div>
    </div>

    <!-- Akce -->
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-accent" style="flex:1" onclick="rpSave()">✅ Přidat jako transakci</button>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('receiptPreview').style.display='none';document.getElementById('receiptStatus').style.display='none';_lastReceiptResult=null">✕</button>
    </div>
    <div style="font-size:.7rem;color:var(--text2);text-align:center;margin-top:8px">Upravte položky před uložením · ✕ pro zavření</div>
  </div>`;
}

// Kategorie pro položky účtenky – klíčová slova
const RP_ITEM_CATS = {
  'Jídlo & Nákupy':   ['rohlík','chléb','chleba','mléko','sýr','máslo','jogurt','vejce','maso','kuře','vepř','hovězí','ryba','zelenina','ovoce','brambor','rýže','těstovin','mouka','cukr','olej','káva','čaj','džus','pivo','víno','limonáda','čokoláda','sušenk','chipsy','müsli','med','jam','ovocn','jogobella'],
  'Drogerie':         ['šampon','kondicionér','gel','mýdlo','zubní','pasta','kartáček','deo','deodorant','parfém','krém','makeup','rtěnk','kosmetik','toaletní','papír','hygien','vložk','tampon','plena','pampers'],
  'Domácí mazlíčci': ['granule','krmivo','pamlsk','kočka','pes','králík','morče','rybičk','seno','podestýlk','akvárium','zoocentrum','zoo','vitakraft','versele','whiskas','purina','pedigree','aniland','c-compositum','vločky hrachov'],
  'Drogerie/Chemie':  ['jar','fairy','prací','aviváž','domestos','ajax','mr.muscle','wc','čistič','prostředek','sponge','houba','pytel','sáček'],
  'Lékárna':          ['ibuprofen','paralen','acylpyrin','vitamin','lék','tablety','kapky','sirup','náplast','obvaz','teploměr','magistra','benu'],
  'Pečivo':           ['rohlík','houska','bageta','croissant','koláč','buchta','dort','pečivo','baget'],
  'Nápoje':           ['voda','džus','coca','pepsi','sprite','fanta','red bull','monster','pivo','víno','sekt','limonáda'],
};

function guessItemCategory(name) {
  const n = (name||'').toLowerCase();
  for(const [cat, keys] of Object.entries(RP_ITEM_CATS)) {
    if(keys.some(k => n.includes(k))) return cat;
  }
  return 'Ostatní';
}

function rpAutoAssignCategories() {
  const r = window._editReceipt; if(!r?.items) return;
  r.items.forEach(it => {
    if(!it.itemCat) it.itemCat = guessItemCategory(it.name);
  });
}

function rpRender() {
  const el = document.getElementById('rp_items'); if(!el) return;
  const r = window._editReceipt;
  if(!r?.items?.length) {
    el.innerHTML = '<div style="font-size:.78rem;color:var(--text2);padding:8px 0">Žádné položky · klikněte Přidat</div>';
    return;
  }

  // Seskup položky dle itemCat
  const groups = {};
  r.items.forEach((it, i) => {
    const cat = it.itemCat || 'Ostatní';
    if(!groups[cat]) groups[cat] = [];
    groups[cat].push({it, i});
  });

  const catIcons = {
    'Jídlo & Nákupy':'🛒','Drogerie':'🧴','Domácí mazlíčci':'🐾',
    'Drogerie/Chemie':'🧹','Lékárna':'💊','Pečivo':'🥐','Nápoje':'🥤','Ostatní':'📦'
  };

  // Všechny dostupné kategorie pro select
  const D = getData();
  const allCats = [...new Set(['Jídlo & Nákupy','Drogerie','Domácí mazlíčci','Drogerie/Chemie','Lékárna','Pečivo','Nápoje','Ostatní',...Object.keys(RP_ITEM_CATS),(D.categories||[]).map(c=>c.name)])].flat();
  const catOptions = [...new Set(allCats)].map(c=>`<option value="${c}">${c}</option>`).join('');

  let html = '';
  for(const [cat, items] of Object.entries(groups)) {
    const icon = catIcons[cat] || '📦';
    const catTotal = items.reduce((a,{it})=>a+(parseFloat(it.price)||0)*(parseFloat(it.qty)||1),0);
    html += `
      <div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:2px solid var(--border);margin-bottom:4px">
          <span style="font-size:.9rem">${icon}</span>
          <span style="font-weight:700;font-size:.82rem;flex:1">${cat}</span>
          <span style="font-size:.76rem;color:var(--text2);font-weight:600">${fmtP(catTotal)} Kč</span>
        </div>`;
    items.forEach(({it, i}) => {
      html += `
        <div style="display:flex;align-items:center;gap:5px;padding:5px 2px;border-bottom:1px solid var(--border)" id="rp_item_${i}">
          <input id="rp_name_${i}"
            value="${(it.name||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}"
            placeholder="Název"
            style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 8px;color:var(--text);font-size:.78rem;min-width:0;-webkit-user-select:text;user-select:text"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
          <select id="rp_cat_${i}"
            style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:5px 4px;color:var(--text2);font-size:.7rem;max-width:90px">
            ${allCats.filter((v,i,a)=>a.indexOf(v)===i).map(c=>`<option value="${c}" ${it.itemCat===c?'selected':''}>${c}</option>`).join('')}
          </select>
          <input id="rp_qty_${i}" type="number"
            value="${it.qty||1}" min="0.001" step="0.001"
            style="width:46px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 4px;color:var(--text);font-size:.78rem;text-align:center"
            inputmode="decimal">
          <input id="rp_price_${i}" type="number"
            value="${it.price||0}" min="0" step="0.01"
            style="width:62px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 4px;color:var(--text);font-size:.78rem;text-align:right"
            inputmode="decimal">
          <span style="font-size:.68rem;color:var(--text2);flex-shrink:0">Kč</span>
          <button onclick="rpRemoveItem(${i})" style="background:none;border:none;color:var(--expense);cursor:pointer;font-size:1rem;padding:2px;flex-shrink:0">✕</button>
        </div>`;
    });
    html += '</div>';
  }
  el.innerHTML = html;

  // Event listenery – MIMO innerHTML aby se nerekreslovalo
  r.items.forEach((it, i) => {
    const nameEl  = document.getElementById('rp_name_'+i);
    const catEl   = document.getElementById('rp_cat_'+i);
    const qtyEl   = document.getElementById('rp_qty_'+i);
    const priceEl = document.getElementById('rp_price_'+i);

    if(nameEl) {
      // Klíč: input/change NEREKRESUJÍ – jen ukládají do paměti
      nameEl.addEventListener('input',  () => { r.items[i].name = nameEl.value; });
      nameEl.addEventListener('change', () => { r.items[i].name = nameEl.value; });
    }
    if(catEl) {
      catEl.addEventListener('change', () => {
        r.items[i].itemCat = catEl.value;
        rpRender(); // překreslí jen při změně kategorie (přeskupení)
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

  rpUpdateTotal();
}

// Oddělené handlery – zachovány pro zpětnou kompatibilitu
function rpItemName(i, val) { if(window._editReceipt?.items?.[i]) window._editReceipt.items[i].name = val; }
function rpItemQty(i, val)  { if(window._editReceipt?.items?.[i]) { window._editReceipt.items[i].qty = parseFloat(val)||1; rpUpdateTotal(); } }
function rpItemPrice(i, val){ if(window._editReceipt?.items?.[i]) { window._editReceipt.items[i].price = parseFloat(val)||0; rpUpdateTotal(); } }

function rpUpdateTotal() {
  const r = window._editReceipt; if(!r) return;
  const sum = (r.items||[]).reduce((a,it)=>a+(parseFloat(it.price)||0)*(parseFloat(it.qty)||1),0);
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

  // Pokud editujeme existující účtenku z historie, přepiš ji
  const histIdx = _lastReceiptResult?.historyIndex;
  if(histIdx !== undefined && S.receipts?.[histIdx]) {
    S.receipts[histIdx] = {...S.receipts[histIdx], ...r, updatedAt: Date.now()};
    save();
    _lastReceiptResult = null;
    const preview = document.getElementById('receiptPreview');
    const status = document.getElementById('receiptStatus');
    if(preview) preview.style.display = 'none';
    if(status) { status.style.display='block'; status.innerHTML='<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text">Účtenka byla upravena.</div></div>'; }
    renderUctenky();
    return;
  }

  // Nová účtenka
  addReceiptAsTx(r);
}

function initReceiptEditor() {
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

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        type: 'receipt',
        payload: { imageData: base64, mediaType: 'image/jpeg' }
      })
    });

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
  const catMap = {
    'Jídlo & Nákupy': D.categories?.find(c=>c.name.includes('Jídlo')||c.name.includes('Nákup')),
    'Drogerie': D.categories?.find(c=>c.name.includes('Zdraví')||c.name.includes('Drogerie')),
    'Restaurace': D.categories?.find(c=>c.name.includes('Zábava')||c.name.includes('Restaurace')),
    'Benzín': D.categories?.find(c=>c.name.includes('Doprava')),
  };
  const cat = catMap[receipt.category] || D.categories?.[0];
  const tx = {
    id: Date.now(),
    name: receipt.store||'Nákup',
    amount: receipt.total||0,
    amt: receipt.total||0,
    type: 'expense',
    date: receipt.date||new Date().toISOString().slice(0,10),
    catId: cat?.id||'',
    category: cat?.id||'',
    note: `📸 Naskenováno · ${(receipt.items||[]).length} položek`,
  };
  if(!S.transactions) S.transactions=[];
  S.transactions.push(tx);
  if(!S.receipts) S.receipts=[];
  S.receipts.unshift({...receipt, addedAt:Date.now()});
  if(S.receipts.length>5000) S.receipts=S.receipts.slice(0,5000);
  save();
  _lastReceiptResult = null; // Vymaž uložený výsledek
  const preview = document.getElementById('receiptPreview');
  const status = document.getElementById('receiptStatus');
  if(preview) preview.style.display='none';
  if(status) { status.style.display='block'; status.innerHTML='<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text">Transakce přidána! Účtenka uložena do historie.</div></div>'; }
  // Refresh jen history tab pokud je viditelný, nezničí scan tab
  const histEl = document.getElementById('utab-history-content');
  if(histEl && histEl.style.display!=='none') renderUctenky();
}

// ══════════════════════════════════════════════════════
