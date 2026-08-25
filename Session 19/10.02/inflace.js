// FinanceFlow · v10.02 · inflace.js · 2026-08-24
// S19 (TODO-219, Milan): částky se přepočítávají do základní měny, ale symbol
//   se NEOPAKUJE v každé buňce – je jednou v popisku karty. Výjimka: sloupec
//   „Za kg/l" symbol nese, protože je to JINÁ JEDNOTKA (cena za kilo, ne za kus)
//   a bez ní by se čísla ve dvou různých jednotkách pletla.
const _iNum = v => fmt(Math.round(czkToBase(v)));

// ══════════════════════════════════════════════════════
//  INFLACE (TODO-185, S17.11, Milan) – vlastní inflace z účtenek.
//  Dva nezávislé indexy nad stejnými daty:
//    1) YoY index  = medián ceny za posledních 12 měs vs. předchozích 12 měs (vážený podílem výdaje)
//    2) První→poslední = první vs. poslední pozorovaná cena položky (vážený stejně)
//  Ceny se berou JEDNOTKOVĚ (Kč/kg, Kč/l, jinak Kč/ks). Slevněné položky se značí a
//  do indexu se ve výchozím stavu NEpočítají (lze zapnout přepínačem – akce zkreslují trend,
//  ale někdy je „sleva" dražší než původní cena → proto je vidět obojí).
// ══════════════════════════════════════════════════════

// Extrakce hmotnosti/objemu z názvu (vlastní kopie – v receipts.js je vnořená, není globální).
// Drží se stejné logiky, aby Kč/kg a Kč/l vycházely shodně s Analýzou účtenek.
function _inflExtractUnit(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  let m = n.match(/(\d+[.,]?\d*)\s*(kg)\b/);
  if (m) return { value: parseFloat(m[1].replace(',', '.')), unit: 'kg' };
  m = n.match(/(\d+[.,]?\d*)\s*(g)\b/);
  if (m) return { value: parseFloat(m[1].replace(',', '.')) / 1000, unit: 'kg' };
  m = n.match(/(\d+[.,]?\d*)\s*(l)\b/);
  if (m) return { value: parseFloat(m[1].replace(',', '.')), unit: 'l' };
  m = n.match(/(\d+[.,]?\d*)\s*(ml)\b/);
  if (m) return { value: parseFloat(m[1].replace(',', '.')) / 1000, unit: 'l' };
  return null;
}

let _inflStores = [];       // multifiltr obchodů (prázdné = vše)
let _inflItems = [];        // multifiltr položek (prázdné = vše)
let _inflInclDiscount = false;
let _inflSort = 'impact';

// ── Sběr pozorování cen z účtenek ──
// Vrací: { obs: [{key,name,store,date,ts,unit,unitPrice,spend,discounted}], stores:[], items:[] }
function _inflCollect() {
  const receipts = S.receipts || [];
  const seen = new Set(), obs = [];
  receipts.forEach(r => {
    // deduplikace účtenek (stejná logika jako v Analýze účtenek)
    const store = (typeof normalizeStoreName === 'function') ? normalizeStoreName(r.store) : (r.store || '');
    const sig = `${store}|${r.date}|${Math.round((r.total || 0) * 100)}|${(r.items || []).length}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    (r.items || []).forEach(it => {
      // ── FIX-268 (S19, nahlásil Milan): KLÍČ SLUČOVAL RŮZNÉ PRODUKTY ──
      //  Původně: název BEZ čísel a jednotek, oříznutý na 25 znaků.
      //    'mléko polotučné 1,5% 1l' → 'mléko %'
      //    'mléko plnotučné 3,5% 1l' → 'mléko %'      ← STEJNÝ KLÍČ
      //  Dvě různá zboží splynula v jedno a rozdíl jejich cen se tvářil jako inflace.
      //
      //  Proč se čísla původně odstraňovala: aby se spároval „Mléko 1l" a „Mléko".
      //  Jenže právě to číslo je často JEDINÝ rozlišovací znak (1,5 % vs. 3,5 %).
      //
      //  Nová úvaha: NEROZPOZNANÁ SHODA JE NESROVNATELNĚ MENŠÍ ŠKODA NEŽ FALEŠNÁ.
      //    • rozdělí-li se položka na dvě, každá má jedinou cenu → z indexu VYPADNE
      //      (rows.single) a index se jen opře o míň dat
      //    • sloučí-li se dvě různé, index si VYMYSLÍ zdražení, které neexistuje
      //  Proto se čísla ZACHOVÁVAJÍ a klíč se neořezává na 25 znaků.
      //
      //  Normalizuje se jen to, co je bezpečné: diakritika, velikost písmen,
      //  interpunkce a vícenásobné mezery – tím se spáruje „MLEKO POLOTUC. 1,5%"
      //  s „Mléko polotučné 1,5%", aniž by se ztratil rozlišovací údaj.
      const rawName = (it.name || '').toLowerCase().trim();
      //  Účtenky zkracují slova ('POLOTUC.' místo 'polotučné'), proto se každé
      //  slovo delší než 5 znaků ořízne na 5 – tím se zkratka spáruje s plným
      //  tvarem, ale ČÍSLA A PROCENTA zůstávají nedotčená.
      const key = rawName
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // diakritika pryč
        .replace(/(\d),(\d)/g, '$1.$2')                      // 1,5 → 1.5 (sjednocení zápisu)
        .replace(/[^a-z0-9%.]+/g, ' ')                       // interpunkce → mezera
        .replace(/\s+/g, ' ').trim()
        .split(' ')
        .map(w => /\d/.test(w) ? w : w.slice(0, 5))          // slova zkrátit, čísla ne
        .join(' ');
      if (key.length < 3) return;

      // ── FIX-269 (S19, nahlásil Milan): SLEVA SE DO CENY NEPROMÍTALA ──
      //  Bralo se `it.price`, tedy cena PŘED slevou. Zbytek aplikace používá
      //  lineAmt() = lineTotal ?? price × qty, protože `lineTotal` slevu obsahuje.
      //  Inflace tak u zlevněné položky počítala jinou cenu než Analýza účtenek
      //  a akce se v indexu neprojevila vůbec – přitom uživatel reálně zaplatil míň.
      const qtyRaw = Math.max(0.001, it.qty || 1);
      const lineTot = (it.lineTotal != null && it.lineTotal > 0) ? it.lineTotal : null;
      //  Skutečně zaplacená cena za jednotku. U váženého zboží je qty hmotnost,
      //  takže lineTotal/qty vyjde Kč/kg – stejná jednotka jako it.price. ✔
      const price = lineTot != null ? (lineTot / qtyRaw) : (it.price || 0);
      if (price <= 0) return;
      const date = it.date || r.date || '';
      if (!date) return;
      const ts = new Date(date).getTime();
      if (!ts || isNaN(ts)) return;

      // S17.18 (FIX-216, Milan): CENA ZA BALENÍ je hlavní metrika – rohlík stojí 3,50 Kč,
      // ne „81 Kč/kg". Přepočet na Kč/kg se dělá JEN u zboží skutečně prodávaného na váhu
      // (it.unit = kg/l, např. volné banány). U balených položek slouží Kč/kg pouze jako
      // DOPLŇKOVÝ údaj pro odhalení shrinkflace (balení se zmenší, cena zůstane).
      const weighed = (it.unit === 'kg' || it.unit === 'l');
      const ui = _inflExtractUnit(it.name || '');
      const unit = weighed ? it.unit : 'ks';
      const unitPrice = price;                       // u váženého = Kč/kg, u baleného = Kč/balení
      if (!(unitPrice > 0)) return;
      // doplňková cena za kilo/litr z hmotnosti v názvu (jen u balených položek)
      const perKg = (!weighed && ui && ui.value > 0) ? Math.round(price / ui.value * 100) / 100 : null;
      const perKgUnit = (!weighed && ui) ? ui.unit : null;

      const qty = qtyRaw;
      const spend = lineTot != null ? lineTot : price * qty;
      obs.push({
        // klíč obsahuje jednotku – tatáž položka může být jednou vážená a jindy balená
        key: key + '|' + unit, name: (it.name || '').trim(), store, date, ts, unit,
        unitPrice: Math.round(unitPrice * 100) / 100,
        perKg, perKgUnit,
        spend, discounted: !!(it.discount && it.discount > 0),
      });
    });
  });
  const stores = [...new Set(obs.map(o => o.store).filter(Boolean))].sort();
  const items = [...new Set(obs.map(o => o.key))].sort();  // klíč obsahuje |jednotku
  return { obs, stores, items };
}

const _median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// ── Jádro: spočítá oba indexy nad zadanou množinou pozorování ──
// Vrací {yoy, firstLast, rows:[{key,name,unit,firstP,lastP,pctFL,medOld,medNew,pctYoY,spend,n,stores,anyDisc}]}
function _inflCompute(obs) {
  const now = Date.now(), Y = 365 * 86400000;
  const byItem = {};
  obs.forEach(o => { (byItem[o.key] = byItem[o.key] || []).push(o); });

  const rows = [];
  Object.keys(byItem).forEach(k => {
    const list = byItem[k].sort((a, b) => a.ts - b.ts);
    // S17.20 (Milan): položky s JEDINOU cenou se dřív úplně zahodily → po výběru ve filtru
    // se ukázalo „Žádné položky" bez vysvětlení. Nově se zobrazí označené jako „jen 1 cena"
    // (do indexu nevstupují, protože nemají s čím porovnávat).
    const spend = list.reduce((a, o) => a + o.spend, 0);
    const firstP = list[0].unitPrice, lastP = list[list.length - 1].unitPrice;
    const pctFL = firstP > 0 ? (lastP - firstP) / firstP * 100 : null;
    // YoY: medián posledních 12 měs vs. medián předchozích 12 měs
    const newer = list.filter(o => now - o.ts <= Y).map(o => o.unitPrice);
    const older = list.filter(o => now - o.ts > Y && now - o.ts <= 2 * Y).map(o => o.unitPrice);
    const medNew = newer.length ? _median(newer) : null;
    const medOld = older.length ? _median(older) : null;
    const pctYoY = (medNew != null && medOld != null && medOld > 0) ? (medNew - medOld) / medOld * 100 : null;
    rows.push({
      single: list.length < 2,
      key: k, name: list[list.length - 1].name || k, unit: list[0].unit,
      firstP, lastP, pctFL, medOld, medNew, pctYoY, spend, n: list.length,
      // S17.18: doplňková cena za kg/l – když balení zdraží jinak než cena za kilo, jde o shrinkflaci
      perKgFirst: (list.find(o=>o.perKg!=null)||{}).perKg ?? null,
      perKgLast: ([...list].reverse().find(o=>o.perKg!=null)||{}).perKg ?? null,
      perKgUnit: (list.find(o=>o.perKgUnit)||{}).perKgUnit || null,
      firstDate: list[0].date, lastDate: list[list.length - 1].date,
      stores: [...new Set(list.map(o => o.store))],
      anyDisc: list.some(o => o.discounted),
    });
  });

  // vážený index (váha = podíl na výdaji), počítá jen z položek, kde je hodnota k dispozici
  const wIdx = (sel) => {
    const valid = rows.filter(r => !r.single && sel(r) != null && isFinite(sel(r)));
    const W = valid.reduce((a, r) => a + r.spend, 0);
    if (!W) return null;
    return valid.reduce((a, r) => a + sel(r) * r.spend, 0) / W;
  };
  return {
    yoy: wIdx(r => r.pctYoY),
    firstLast: wIdx(r => r.pctFL),
    yoyCount: rows.filter(r => !r.single && r.pctYoY != null).length,
    flCount: rows.filter(r => !r.single && r.pctFL != null).length,
    rows,
  };
}

// ── Per-obchod indexy ──
function _inflByStore(obs) {
  const stores = [...new Set(obs.map(o => o.store).filter(Boolean))];
  return stores.map(s => {
    const sub = obs.filter(o => o.store === s);
    const c = _inflCompute(sub);
    return { store: s, yoy: c.yoy, firstLast: c.firstLast, items: c.rows.length, spend: sub.reduce((a, o) => a + o.spend, 0) };
  }).filter(x => x.items > 0).sort((a, b) => b.spend - a.spend);
}

// ══ RENDER ══
function renderInflace() {
  const el = document.getElementById('inflaceContent'); if (!el) return;
  const all = _inflCollect();
  if (!all.obs.length) {
    el.innerHTML = `<div class="card"><div class="card-body"><div class="empty" style="padding:24px">
      <div class="ei">🧾</div><div class="et">Zatím žádné účtenky</div>
      <div style="font-size:.76rem;color:#a8aec8;margin-top:8px;line-height:1.5">Inflace se počítá z položek na účtenkách. Naskenuj pár účtenek v <strong>Analýze účtenek</strong> – čím delší historie, tím spolehlivější číslo. Plnou vypovídací hodnotu má index po roce nákupů.</div>
    </div></div></div>`;
    return;
  }

  // aplikace filtrů
  let obs = all.obs;
  if (_inflStores.length) obs = obs.filter(o => _inflStores.includes(o.store));
  if (_inflItems.length) obs = obs.filter(o => _inflItems.includes(o.key));
  if (!_inflInclDiscount) obs = obs.filter(o => !o.discounted);

  const comp = _inflCompute(obs);
  const byStore = _inflByStore(obs);
  const discCount = all.obs.filter(o => o.discounted).length;

  const pct = v => v == null ? '–' : (v > 0 ? '+' : '') + (Math.round(v * 10) / 10).toLocaleString('cs-CZ') + ' %';
  const col = v => v == null ? 'var(--text3)' : v > 0.5 ? 'var(--expense)' : v < -0.5 ? 'var(--income)' : 'var(--debt)';

  // ── hlavní čísla ──
  let h = `<div class="card" style="margin-bottom:14px">
    <div class="card-header">
      <span class="card-title">🧮 Tvoje inflace</span>
      <span style="font-size:.7rem;color:#a8aec8">z ${obs.length} cen · ${comp.rows.length} položek</span>
    </div>
    <div class="card-body">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">
        <div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border);min-width:0">
          <div style="font-size:.68rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.05em">Meziročně (YoY)</div>
          <div class="stat-value-h" style="color:${col(comp.yoy)}">${pct(comp.yoy)}</div>
          <div style="font-size:.66rem;color:#a8aec8">medián 12 měs vs. předchozích 12 · ${comp.yoyCount} položek</div>
        </div>
        <div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border);min-width:0">
          <div style="font-size:.68rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.05em">První → poslední cena</div>
          <div class="stat-value-h" style="color:${col(comp.firstLast)}">${pct(comp.firstLast)}</div>
          <div style="font-size:.66rem;color:#a8aec8">celá tvá historie · ${comp.flCount} položek</div>
        </div>
        <div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border);min-width:0">
          <div style="font-size:.68rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.05em">Rozdíl indexů</div>
          <div class="stat-value-h" style="color:${(comp.yoy!=null&&comp.firstLast!=null)?col(comp.firstLast-comp.yoy):'var(--text3)'}">${(comp.yoy!=null&&comp.firstLast!=null)?pct(comp.firstLast-comp.yoy):'–'}</div>
          <div style="font-size:.66rem;color:#a8aec8">první→poslední mínus YoY</div>
        </div>
      </div>
      <div style="font-size:.7rem;color:#a8aec8;margin-top:10px;line-height:1.5">Obě čísla jsou vážená podílem položky na tvých výdajích. <strong>YoY</strong> porovnává mediány (odolné vůči jednorázovým výkyvům), <strong>první→poslední</strong> bere krajní ceny – bývá citlivější a u krátké historie kolísá. Ceny se srovnávají jednotkově (Kč/kg, Kč/l, jinak Kč/ks).</div>
    </div>
  </div>`;

  // ── filtry ──
  const chip = (active, label, onclick, cnt) => `<button onclick="${onclick}" style="padding:5px 11px;border-radius:14px;font-size:.72rem;font-weight:600;cursor:pointer;border:1px solid ${active ? 'var(--income)' : 'var(--border)'};background:${active ? 'rgba(74,222,128,.16)' : 'transparent'};color:${active ? 'var(--income)' : '#c9cede'};white-space:nowrap">${label}${cnt != null ? ` <span style="opacity:.7">${cnt}</span>` : ''}</button>`;
  h += `<div class="card" style="margin-bottom:14px"><div class="card-body">
    <div style="font-size:.72rem;color:#a8aec8;margin-bottom:6px">🏪 Obchody <span style="opacity:.7">(bez výběru = všechny)</span></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
      ${chip(!_inflStores.length, 'Vše', 'inflClearStores()')}
      ${all.stores.map(s => chip(_inflStores.includes(s), s, `inflToggleStore('${s.replace(/'/g, "\\'")}')`)).join('')}
    </div>
    <div style="font-size:.72rem;color:#a8aec8;margin-bottom:6px">🛒 Položky ${_inflItems.length ? `<span style="color:var(--income)">(${_inflItems.length} vybráno)</span>` : '<span style="opacity:.7">(bez výběru = všechny)</span>'}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <input type="text" id="inflItemSearch" placeholder="🔍 hledat položku…" oninput="renderInflaceItemPicker()"
        style="flex:1;min-width:160px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:#e8eaf2;font-size:.8rem">
      ${_inflItems.length ? chip(true, '✕ zrušit výběr', 'inflClearItems()') : ''}
    </div>
    <div id="inflItemPicker" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;max-height:132px;overflow-y:auto"></div>
    <label style="display:flex;align-items:center;gap:8px;margin-top:12px;cursor:pointer;font-size:.74rem;color:#c9cede">
      <input type="checkbox" ${_inflInclDiscount ? 'checked' : ''} onchange="inflToggleDiscount(this.checked)" style="width:15px;height:15px;cursor:pointer">
      Počítat i slevněné položky <span style="color:#a8aec8">(${discCount} cen se slevou)</span>
    </label>
  </div></div>`;

  // ── S17.20 (Milan): JEDNA POLOŽKA NAPŘÍČ OBCHODY ──
  //  Zobrazí se, když je vybraná právě jedna položka. Ukáže, kde ji kupuješ nejdráž,
  //  a odděleně běžnou a akční cenu – z tabulky per obchod to poznat nešlo.
  if (_inflItems.length === 1) {
    const k = _inflItems[0];
    const mine = all.obs.filter(o => o.key === k);
    if (mine.length) {
      const byStore = {};
      mine.forEach(o => { (byStore[o.store] = byStore[o.store] || []).push(o); });
      const srows = Object.keys(byStore).map(s => {
        const l = byStore[s].sort((a,b)=>a.ts-b.ts);
        const norm = l.filter(o=>!o.discounted), disc = l.filter(o=>o.discounted);
        const avg = a => a.length ? a.reduce((x,o)=>x+o.unitPrice,0)/a.length : null;
        const perKgLast = ([...l].reverse().find(o=>o.perKg!=null)||{}).perKg ?? (l[0].unit!=='ks' ? l[l.length-1].unitPrice : null);
        return { store:s, n:l.length, first:l[0].unitPrice, last:l[l.length-1].unitPrice,
                 normAvg:avg(norm), discAvg:avg(disc), perKgLast, unit:l[0].unit,
                 perKgUnit:(l.find(o=>o.perKgUnit)||{}).perKgUnit || l[0].unit };
      }).sort((a,b)=>(b.last||0)-(a.last||0));
      const cheapest = Math.min(...srows.map(r=>r.last).filter(v=>v>0));
      h += `<div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">🔎 ${k.split('|')[0]} – napříč obchody</span>
          <span style="font-size:.7rem;color:#a8aec8">${srows.length} obchodů · ${mine.length} cen</span></div>
        <div class="card-body" style="overflow-x:auto">
          <table class="stat-table" style="width:100%;min-width:620px;font-size:.76rem">
            <thead><tr><th style="text-align:left">Obchod</th><th style="text-align:right">První</th><th style="text-align:right">Poslední</th>
              <th style="text-align:right" title="Průměr cen bez akce">Běžná Ø</th>
              <th style="text-align:right" title="Průměr akčních cen">Akční Ø</th>
              <th style="text-align:right">Za kg/l</th><th style="text-align:right">Cen</th></tr></thead>
            <tbody>${srows.map(r=>`<tr>
              <td style="text-align:left;white-space:nowrap">${r.store}${r.last===cheapest?' <span style="font-size:.62rem;background:var(--income-bg);color:var(--income);padding:1px 5px;border-radius:4px">nejlevnější</span>':''}</td>
              <td style="text-align:right;color:#a8aec8">${_iNum(r.first)}</td>
              <td style="text-align:right;font-weight:700;color:${r.last===cheapest?'var(--income)':'#e8eaf2'}">${_iNum(r.last)}</td>
              <td style="text-align:right;color:#c9cede">${r.normAvg!=null?_iNum(r.normAvg):'–'}</td>
              <td style="text-align:right;color:${r.discAvg!=null?'var(--debt)':'#5a6078'}">${r.discAvg!=null?_iNum(r.discAvg):'–'}</td>
              <td style="text-align:right;color:#a8aec8">${r.perKgLast!=null?fmtB(Math.round(r.perKgLast))+'/'+(r.perKgUnit||'kg'):'–'}</td>
              <td style="text-align:right;color:#a8aec8">${r.n}</td>
            </tr>`).join('')}</tbody>
          </table>
          <div style="font-size:.7rem;color:#a8aec8;margin-top:8px;line-height:1.5"><strong>Běžná Ø</strong> = průměr cen bez akce, <strong>Akční Ø</strong> = průměr akčních cen. Když se akční cena blíží běžné (nebo ji převyšuje), sleva je jen marketingová. Vyber ve filtru jednu položku a uvidíš tuhle tabulku pro ni.</div>
        </div></div>`;
    }
  }

  // ── per obchod ──
  if (byStore.length) {
    h += `<div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">🏪 Inflace podle obchodu</span><span style="font-size:.7rem;color:#a8aec8">${byStore.length} obchodů · útrata v ${curSym()}</span></div>
      <div class="card-body" style="overflow-x:auto">
        <table class="stat-table" style="width:100%;min-width:520px;table-layout:auto;font-size:.76rem">
          <thead><tr><th style="text-align:left;white-space:nowrap">Obchod</th><th style="text-align:right;white-space:nowrap">YoY</th><th style="text-align:right;white-space:nowrap">První→posl.</th><th style="text-align:right;white-space:nowrap">Položek</th><th style="text-align:right;white-space:nowrap">Útrata</th></tr></thead>
          <tbody>${byStore.map(s => `<tr>
            <td style="text-align:left;white-space:nowrap;padding-right:14px">${s.store}</td>
            <td style="text-align:right;font-weight:700;white-space:nowrap;color:${col(s.yoy)}">${pct(s.yoy)}</td>
            <td style="text-align:right;font-weight:700;white-space:nowrap;color:${col(s.firstLast)}">${pct(s.firstLast)}</td>
            <td style="text-align:right;color:#a8aec8;white-space:nowrap">${s.items}</td>
            <td style="text-align:right;color:#a8aec8;white-space:nowrap">${_iNum(s.spend)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div></div>`;
  }

  // ── položky ──
  const sorted = [...comp.rows].sort((a, b) => {
    if (_inflSort === 'impact') return b.spend - a.spend;
    if (_inflSort === 'up') return (b.pctFL ?? -999) - (a.pctFL ?? -999);
    if (_inflSort === 'down') return (a.pctFL ?? 999) - (b.pctFL ?? 999);
    return b.n - a.n;
  }).slice(0, 120);

  const sortBtn = (id, label) => `<button onclick="inflSort('${id}')" style="padding:4px 10px;border-radius:8px;font-size:.71rem;font-weight:600;cursor:pointer;border:1px solid ${_inflSort === id ? 'rgba(139,124,246,.5)' : 'var(--border)'};background:${_inflSort === id ? 'rgba(139,124,246,.14)' : 'transparent'};color:${_inflSort === id ? '#b9aefc' : '#a8aec8'}">${label}</button>`;

  h += `<div class="card">
    <div class="card-header"><span class="card-title">🛒 Položky a jejich ceny</span>
      <span style="display:flex;gap:5px;flex-wrap:wrap">${sortBtn('impact', 'Dle útraty')}${sortBtn('up', 'Nejvíc zdražilo')}${sortBtn('down', 'Zlevnilo')}${sortBtn('n', 'Nejčastější')}</span></div>
    <div class="card-body" style="overflow-x:auto">
      ${sorted.length ? `<table class="stat-table" style="width:100%;min-width:760px;font-size:.75rem">
        <thead><tr>
          <th style="text-align:left">Položka</th>
          <th style="text-align:right" title="Cena za balení / za kg u váženého zboží">První cena</th><th style="text-align:right">Poslední cena</th>
          <th style="text-align:right">Změna</th>
          <th style="text-align:right" title="Cena přepočtená na kilo/litr – odhalí zdražení i když pokaždé koupíš jinou hmotnost">Za kg/l</th>
          <th style="text-align:right">YoY</th>
          <th style="text-align:right">Cen</th><th style="text-align:left">Obchody</th>
        </tr></thead>
        <tbody>${sorted.map(r => `<tr>
          <td style="text-align:left;max-width:210px">
            <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e8eaf2">${r.name}${r.single?' <span style="font-size:.62rem;background:rgba(148,163,184,.2);color:#c9cede;padding:1px 5px;border-radius:4px">jen 1 cena</span>':''}${r.anyDisc ? ' <span style="font-size:.62rem;background:rgba(251,191,36,.18);color:var(--debt);padding:1px 5px;border-radius:4px">slevněno</span>' : ''}</div>
            <div style="font-size:.65rem;color:#a8aec8">${r.firstDate} → ${r.lastDate} · ${r.unit==='ks'?'za balení':'za '+r.unit}</div>
          </td>
          <td style="text-align:right;color:#a8aec8">${_iNum(r.firstP)}</td>
          <td style="text-align:right;color:#c9cede;font-weight:600">${_iNum(r.lastP)}</td>
          <td style="text-align:right;font-weight:800;color:${col(r.pctFL)}">${pct(r.pctFL)}</td>
          <td style="text-align:right">${(()=>{
            // vážené zboží: cena UŽ JE za kg (ADR-059) → beru přímo hlavní cenu
            const isW = r.unit!=='ks';
            const f = isW ? r.firstP : r.perKgFirst;
            const l = isW ? r.lastP  : r.perKgLast;
            const u = isW ? r.unit : (r.perKgUnit||'kg');
            if(f==null||l==null||!(f>0)) return '<span style="color:#5a6078">–</span>';
            const p = Math.round((l-f)/f*1000)/10;
            const shrink = !isW && Math.abs(p-(r.pctFL??0))>3;
            return `<div style="font-weight:700;color:${col(p)};white-space:nowrap">${p>0?'+':''}${p} %</div>
              <div style="font-size:.63rem;color:#a8aec8;white-space:nowrap">${fmtB(Math.round(l))}/${u}</div>
              ${shrink?'<div style="font-size:.6rem;color:var(--debt);white-space:nowrap" title="Cena za kilo roste jinak než cena balení – nejspíš se zmenšilo balení.">⚠ shrinkflace</div>':''}`;
          })()}</td>
          <td style="text-align:right;font-weight:700;color:${col(r.pctYoY)}">${pct(r.pctYoY)}</td>
          <td style="text-align:right;color:#a8aec8">${r.n}</td>
          <td style="text-align:left;font-size:.68rem;color:#a8aec8;max-width:150px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.stores.join(', ')}</div></td>
        </tr>`).join('')}</tbody>
      </table>
      <div style="font-size:.7rem;color:#a8aec8;margin-top:8px;line-height:1.5">Zobrazeno ${sorted.length} z ${comp.rows.length} položek (aspoň 2 ceny). Ceny jsou <strong>za balení</strong> (u zboží na váhu za kg/l) – tedy to, co reálně zaplatíš. Sloupec <strong>Za kg/l</strong> ukazuje cenu přepočtenou na kilo/litr – u váženého zboží je to přímo jeho cena (proto nevadí, že pokaždé koupíš jinou hmotnost), u baleného dopočet z hmotnosti v názvu. Když se cena za kilo mění jinak než cena balení, označíme to jako <strong>⚠ shrinkflace</strong> (balení se zmenšilo). <strong>Slevněno</strong> = u položky byla někdy sleva – pozor, „akční" cena bývá občas stejná nebo vyšší než běžná, proto si u takových položek srovnej první a poslední cenu.</div>`
      : `<div class="empty" style="padding:20px"><div class="et">Žádné položky pro tento filtr</div><div style="font-size:.74rem;color:#a8aec8;margin-top:6px">Zkus zrušit filtry nebo zapnout slevněné položky. Index potřebuje aspoň 2 ceny téže položky.</div></div>`}
    </div></div>`;

  el.innerHTML = h;
  renderInflaceItemPicker();
}

// výběr položek (chipy dle hledání)
function renderInflaceItemPicker() {
  const box = document.getElementById('inflItemPicker'); if (!box) return;
  const q = (document.getElementById('inflItemSearch')?.value || '').toLowerCase().trim();
  const all = _inflCollect();
  let keys = all.items;
  if (q) keys = keys.filter(k => k.includes(q));
  keys = keys.slice(0, 60);
  box.innerHTML = keys.map(k => {
    const on = _inflItems.includes(k);
    return `<button onclick="inflToggleItem('${k.replace(/'/g, "\\'")}')" title="${k}" style="padding:4px 10px;border-radius:12px;font-size:.7rem;cursor:pointer;border:1px solid ${on ? 'var(--income)' : 'var(--border)'};background:${on ? 'rgba(74,222,128,.16)' : 'transparent'};color:${on ? 'var(--income)' : '#c9cede'};white-space:nowrap">${k.split('|')[0]} <span style="opacity:.7">${k.split('|')[1]||''}</span></button>`;
  }).join('') || '<span style="font-size:.72rem;color:#a8aec8">Nic nenalezeno</span>';
}

function inflToggleStore(s) { const i = _inflStores.indexOf(s); if (i >= 0) _inflStores.splice(i, 1); else _inflStores.push(s); renderInflace(); }
function inflClearStores() { _inflStores = []; renderInflace(); }
function inflToggleItem(k) { const i = _inflItems.indexOf(k); if (i >= 0) _inflItems.splice(i, 1); else _inflItems.push(k); renderInflace(); }
function inflClearItems() { _inflItems = []; renderInflace(); }
function inflToggleDiscount(v) { _inflInclDiscount = !!v; renderInflace(); }
function inflSort(id) { _inflSort = id; renderInflace(); }
