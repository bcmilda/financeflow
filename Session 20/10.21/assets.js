//  FinanceFlow · v10.21 · assets.js · 2026-08-28
// ══════════════════════════════════════════════════════
//  FINANČNÍ AKTIVA – FinanceFlow v6.50
//  Správa majetku: nemovitosti, investice, vozidla, vlastní
// ══════════════════════════════════════════════════════

const ASSET_TYPES = {
  property:   { label: 'Nemovitosti', icon: '🏠', color: '#f59e0b', examples: 'Byt, dům, chata, pozemek', liq: 'fixed'  },
  investment: { label: 'Investice',   icon: '📈', color: '#10b981', examples: 'ETF, akcie, dluhopisy, krypto', liq: 'invest' },
  vehicle:    { label: 'Vozidla',     icon: '🚗', color: '#6366f1', examples: 'Auto, motorka, přívěs', liq: 'fixed'  },
  savings:    { label: 'Spoření',     icon: '🏦', color: '#06b6d4', examples: 'Stavební spoření, penzijní fond, termínovaný vklad', liq: 'invest' },
  custom:     { label: 'Ostatní',     icon: '💎', color: '#ec4899', examples: 'Umění, šperky, jiný majetek', liq: 'fixed'  },
};

// S12.1k: skupiny dle LIKVIDITY (Gemini struktura) – peněženky = likvidní vrstva
const LIQ_GROUPS = {
  wallets: { label: 'Peněženky',                     icon: '👛', color: '#60a5fa', desc: 'běžné účty, hotovost, kreditka' },
  virtual: { label: 'Virtuální přesuny',              icon: '📋', color: '#c084fc', desc: 'peníze odložené na cíle – nejde o investici, jen o rezervaci vlastních peněz' },
  reserve: { label: 'Finanční rezerva',              icon: '🛟', color: '#22d3ee', desc: 'spoření, spořicí účet, termínovaný vklad – likvidní' },
  mid:     { label: 'Střednědobá a investiční aktiva', icon: '📈', color: '#10b981', desc: 'akcie, ETF, fondy, krypto' },
  fixed:   { label: 'Fyzická a dlouhodobá aktiva',   icon: '🏠', color: '#f59e0b', desc: 'nemovitosti, auta, penzijko, drahé kovy' },
  // FIX-285 (S20, Milan): virtuální přesuny STOJÍ MIMO investice. „Vklad do cíle"
  //   se doposud choval jako investiční aktivum (kategorie „Virtuální přesun"
  //   nespadala do žádného vzoru v assetCatLiq → default 'mid'), takže peníze
  //   odložené na cíl nafukovaly částku „investováno". Je to ale jen přehození
  //   v rámci vlastních peněz, ne investice.
};

// ADR-076b: stupeň likvidity přesunové kategorie → určuje sekci aktiva
//   'reserve' = likvidní rezerva, 'mid' = střednědobé/investiční, 'long' = dlouhodobé/fyzické
function assetCatLiq(catId){
  const cc = ((typeof S!=='undefined' && S.categories) || []).find(x => x.id === catId);
  if (!cc) return null;
  if (cc.liq === 'reserve' || cc.liq === 'mid' || cc.liq === 'long') return cc.liq; // ruční nastavení
  const n = (cc.name || '').toLowerCase(); // odvození podle názvu (výchozí)
  if (/virtuáln|virtualn/.test(n)) return 'virtual';   // FIX-285: cíle nejsou investice
  if (/rezerv|spoř|spor|stavebn|termín|termin|vkladn/.test(n)) return 'reserve';
  if (/penzij|důchod|duchod|dlouhodob/.test(n)) return 'long';
  return 'mid';
}
// Do které sekce aktivum patří: 'reserve' | 'mid' | 'fixed'
function assetTier(a){
  if (a.linkedCatId){ const t = assetCatLiq(a.linkedCatId); if (t) return (t === 'long') ? 'fixed' : t; }
  if (a.liqTier === 'reserve' || a.liqTier === 'mid' || a.liqTier === 'fixed' || a.liqTier === 'virtual') return a.liqTier;
  if (a.type === 'investment') return 'mid';
  if (a.type === 'savings')    return 'reserve';
  return 'fixed'; // property / vehicle / custom
}

const ASSET_TABS = ['property','investment','vehicle','savings','custom'];

let _assetsTab = 'property'; // aktivní záložka

// ══════════════════════════════════════════════════════
//  S14: PROPOJENÍ PŘESUNŮ → FINANČNÍ AKTIVA
//  Každá transfer-kategorie (Investice/Spoření/Penzijko/Trading…) = jedno finanční aktivum.
//  invested = vklady (expense) − výběry (income) v té kategorii (napříč VŠEMI podkategoriemi).
//  value (tržní hodnota) zůstává ruční; dokud ji uživatel nezadá, kopíruje invested.
//  Granularitu řídí uživatel strukturou kategorií: 1 kategorie = 1 aktivum
//  (penzijko: vlastní vklad + státní + zaměstnavatel = JEDNO aktivum).
// ══════════════════════════════════════════════════════
const _SAVE_ASSET_NAMES = ['spoř','spor','rezerva','penzij','stavebn','termínovan','terminovan','vkladn'];
function syncInvestmentAssets(){
  if (typeof viewingUid !== 'undefined' && viewingUid) return; // jen vlastní data
  if (typeof S==='undefined' || !Array.isArray(S.categories)) return;
  const transferIds = new Set(S.categories.filter(c => c.type === 'transfer').map(c => c.id));
  if (!transferIds.size) return;
  if (!Array.isArray(S.assets)) S.assets = [];
  const wallets = S.wallets || [];
  const FX = (typeof _FX_RATES !== 'undefined') ? _FX_RATES : {};
  const txs = (S.transactions || []).filter(t => !t.splitParent);

  // částka transakce v CZK (převod dle měny peněženky, kurzy ČNB z _FX_RATES)
  function _amtCZK(t){
    // v8.58 (TODO-148): zafixovaná částka v Kč z okamžiku vložení (kurz banky) má přednost
    if (t.amtCZK != null && isFinite(t.amtCZK)) return t.amtCZK;
    let amt = (t.amount || t.amt || 0);
    const w = wallets.find(x => x.id === t.wallet);
    const cur = (w && w.currency) ? w.currency : 'CZK';
    if (cur && cur !== 'CZK') amt = amt * (FX[cur] || 1); // fallback živým kurzem (staré tx bez fixace)
    return amt;
  }

  // Seskup přesunové transakce podle PODKATEGORIE (klíč = catId::subkat).
  const groups = {};
  for (const t of txs){
    const catId = t.catId || t.category;
    if (!transferIds.has(catId)) continue;
    if (t.type !== 'expense' && t.type !== 'income') continue;
    const sub = (t.subcat || '').trim();
    const key = catId + '::' + sub;
    if (!groups[key]){
      const cat = S.categories.find(x => x.id === catId) || {};
      groups[key] = { catId, sub, name: sub || cat.name || 'Investice', icon: cat.icon || '📈', invested: 0 };
    }
    const amtCZK = _amtCZK(t);
    groups[key].invested += (t.type === 'expense') ? amtCZK : -amtCZK; // výdaj=vklad, příjem=výběr
  }

  // v8.71 (FIX-184): blocklist noSyncKeys ZRUŠEN – způsoboval, že se po smazání napojeného
  // aktiva už nikdy nevytvořilo znovu (ani po nové transakci). Nově nejde napojené aktivum
  // smazat (X skryto) a případné staré blokace se jednorázově vyčistí.
  if (Array.isArray(S.noSyncKeys) && S.noSyncKeys.length){ S.noSyncKeys = []; if(typeof save==='function') try{save();}catch(_){}} 
  Object.keys(groups).forEach(key => {
    const g = groups[key];
    const inv = Math.round(g.invested);

    // 1) přesné napojení; 2) adopce ručně vytvořeného aktiva stejného jména (zatím nenapojeného)
    let asset = S.assets.find(a => a.linkedKey === key);
    if (!asset){
      const nm = g.name.trim().toLowerCase();
      asset = S.assets.find(a => !a.linkedKey && !a.noAutoSync && (a.name || '').trim().toLowerCase() === nm);
      if (asset){
        asset.linkedKey = key; asset.linkedCatId = g.catId; asset.linkedSub = g.sub; asset.auto = true;
        // jeho dosavadní ruční hodnota = baseline; všechny dosavadní vklady jsou "v ceně"
        asset.valueBaseline = (typeof asset.value === 'number') ? asset.value : inv;
        asset.investedAtBaseline = inv;
      }
    }
    if (asset && asset.noAutoSync) return; // uživatel aktivum odpojil
    if (!asset){
      if (inv === 0) return; // nic k vytvoření
      const nm = g.name.toLowerCase();
      const grp = _SAVE_ASSET_NAMES.some(s => nm.includes(s)) ? 'savings' : 'investment';
      asset = { id: uid(), name: g.name, icon: g.icon, type: grp,
                linkedKey: key, linkedCatId: g.catId, linkedSub: g.sub, auto: true,
                invested: 0, value: 0, valueBaseline: null, investedAtBaseline: null,
                updatedAt: Date.now() };
      S.assets.push(asset);
    }

    asset.invested = inv;
    // Hodnota = ruční baseline + vklady přibyvší po jejím nastavení; jinak = vloženo
    if (asset.valueBaseline != null && asset.investedAtBaseline != null){
      asset.value = Math.round(asset.valueBaseline + (inv - asset.investedAtBaseline));
    } else if (!asset.valueManual){
      asset.value = inv;
    }
    asset.updatedAt = Date.now();
  });
}

window.syncInvestmentAssets = syncInvestmentAssets;

// ADR-076: ruční přepojení aktiv z přesunových transakcí + diagnostika (neprůstřelné)
function resyncAssetsFromTransfers(){
  try {
    if (typeof S === 'undefined' || !S){ alert('⚠️ Data nejsou načtena.'); return; }
    if (typeof viewingUid !== 'undefined' && viewingUid){ alert('⚠️ Prohlížíš cizí data – přepni na svá a zkus znovu.'); return; }
    if (!Array.isArray(S.noSyncKeys)) S.noSyncKeys = [];
    const hadBlocked = S.noSyncKeys.length;
    S.noSyncKeys = [];
    const transferCats = (S.categories||[]).filter(c => c.type === 'transfer');
    const transferIds = new Set(transferCats.map(c => c.id));
    const allTx = (S.transactions||[]);
    const txMatch = allTx.filter(t => !t.splitParent && (t.type==='expense'||t.type==='income') && transferIds.has(t.catId||t.category));
    const bySub = {};
    txMatch.forEach(t => { const c=(S.categories.find(x=>x.id===(t.catId||t.category))||{}); const k=(c.name||'?')+' / '+(t.subcat||'(bez podkat.)'); bySub[k]=(bySub[k]||0)+1; });

    const before = (S.assets||[]).length;
    if (typeof syncInvestmentAssets === 'function') syncInvestmentAssets();
    else { alert('⚠️ Funkce syncInvestmentAssets chybí – starý assets.js? Nasaď v8.55.'); return; }
    const linked = (S.assets||[]).filter(a => a.linkedKey).length;
    const created = (S.assets||[]).length - before;
    if (typeof save === 'function') save();
    if (typeof renderPage === 'function') renderPage();

    let msg = '🔄 Přepojení z přesunů\n\n';
    msg += '• Všech transakcí: ' + allTx.length + '\n';
    msg += '• Přesunových kategorií: ' + transferCats.length;
    msg += transferCats.length ? (' (' + transferCats.map(c=>c.name).join(', ') + ')\n') : '\n';
    msg += '• Transakcí v nich (vklady/výběry): ' + txMatch.length + '\n';
    Object.keys(bySub).forEach(k => { msg += '   – ' + k + ' ×' + bySub[k] + '\n'; });
    msg += '• Nově vytvořeno aktiv: ' + created + '\n';
    msg += '• Napojených aktiv celkem: ' + linked + '\n';
    if (hadBlocked) msg += '• Odblokováno dříve smazaných: ' + hadBlocked + '\n';

    if (transferCats.length === 0)
      msg += '\n⚠️ Žádná kategorie nemá typ „Přesun".';
    else if (txMatch.length === 0)
      msg += '\n⚠️ Žádná transakce nemíří do přesunové kategorie. (Použij + → Přesun → Do investic & spoření.)';
    else if (linked === 0)
      msg += '\n⚠️ Transakce existují, ale aktivum nevzniklo. Pošli mi prosím tento výpis.';
    else
      msg += '\n✅ Hotovo. Aktiva jsou v sekcích Rezerva / Střednědobá.';
    alert(msg);
  } catch(e){
    try { alert('❌ Chyba při přepojení:\n' + ((e&&e.message)||e) + '\n\n' + ((e&&e.stack)?e.stack.split('\n').slice(0,4).join('\n'):'')); } catch(_){}
    console.error('resyncAssetsFromTransfers error:', e);
  }
}
window.resyncAssetsFromTransfers = resyncAssetsFromTransfers;

// ══════════════════════════════════════════════════════
//  HLAVNÍ RENDER
// ══════════════════════════════════════════════════════
function renderAssets() {
  const el = document.getElementById('assetsContent'); if (!el) return;
  const D  = getData();
  if (!D.assets) D.assets = [];

  const totalAssets  = D.assets.reduce((s, a) => s + (a.value || 0), 0);
  const totalDebts   = (D.debts || []).reduce((s, d) => s + (d.remaining || 0), 0);
  const totalWallets = (D.wallets || []).reduce((s, w) => s + (typeof walletBalanceCZK==='function' ? walletBalanceCZK(w.id, D) : (w.balance || 0)), 0);
  const netWorth     = totalAssets + totalWallets - totalDebts;

  el.innerHTML = `
    <!-- Net Worth souhrn -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:16px">
      <div style="font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:#c9cede;font-weight:700;margin-bottom:8px">💎 Čisté jmění (Net Worth)</div>
      <div style="font-size:1.6rem;font-weight:800;font-family:Syne,sans-serif;color:${netWorth>=0?'var(--income)':'var(--expense)'};margin-bottom:10px">
        ${fmtBP(netWorth)}
      </div>
      ${(()=>{ // S14: karty dle likvidity + Závazky. FIX-285: virtuální přesuny zvlášť.
        const lt = assetLiqTotals(D);
        const cards = [
          {label:'Peněženky',    val:lt.wallets,  color:'#60a5fa'},
          {label:'Fin. rezerva', val:lt.reserve,  color:'#22d3ee'},
          {label:'Střednědobá',  val:lt.mid,      color:'#10b981'},
          {label:'Fyzická',      val:lt.fixed,    color:'#f59e0b'},
          {label:'Závazky',      val:-totalDebts, color:'#f87171'},
        ];
        // FIX-285 (Milan): „Z toho virtuální přesuny" – peníze odložené na cíle
        //   snižují zůstatek peněženky (odtud záporné číslo u Peněženek), ale
        //   nikam z majetku neodešly. Bez tohoto řádku to vypadá, že peníze zmizely.
        //   Není to šestá karta – je to ROZPAD už započítané částky, ne přírůstek.
        const virt = lt.virtual || 0;
        const virtRows = (D.assets||[]).filter(a=>assetTier(a)==='virtual')
          .sort((x,y)=>(y.value||0)-(x.value||0));
        return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px">
          ${cards.map(cd=>`<div style="text-align:center;padding:9px 6px;background:var(--surface3);border-radius:10px;border-top:2px solid ${cd.color}">
            <div style="font-size:.84rem;font-weight:800;color:${cd.color};font-family:Syne,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${fmtBP(cd.val)}</div>
            <div style="font-size:.72rem;color:${cd.color};font-weight:700;margin-top:3px">${cd.label}</div>
          </div>`).join('')}
        </div>
        ${virt!==0?`<div style="margin-top:10px;padding-top:9px;border-top:1px dashed var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:.76rem;color:#c084fc;font-weight:700">
            <span>📋 Z toho virtuální přesuny</span><span>${fmtBP(virt)}</span>
          </div>
          ${virtRows.map(a=>`<div style="display:flex;justify-content:space-between;font-size:.74rem;color:#a8aec8;margin-top:4px;padding-left:18px">
            <span>${a.icon||'📋'} ${escHtml(a.name||'')}</span><span>${fmtBP(a.value||0)}</span>
          </div>`).join('')}
          <div style="font-size:.7rem;color:#8b91a8;margin-top:6px;padding-left:18px;line-height:1.45">
            Peníze odložené na cíle. Odešly z peněženky, ale z majetku ne – proto je
            u Peněženek záporné číslo. Nejde o investici.
          </div>
        </div>`:''}`; })()}
    </div>

    <!-- Session 10 TODO-090: Asset Allocation – rozložení majetku -->
    <div id="assetAllocationCard"></div>

    <!-- Flat seznam aktiv -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:.78rem;color:var(--text3);font-weight:600">${D.assets.length ? D.assets.length + (D.assets.length===1?' aktivum':D.assets.length<5?' aktiva':' aktiv') : 'Žádná aktiva'}</div>
      ${!viewingUid ? '<button class="btn btn-ghost btn-sm" onclick="resyncAssetsFromTransfers()" title="Znovu propojit finanční aktiva z přesunových transakcí">🔄 Přepojit</button> <button class="btn btn-accent btn-sm" onclick="openAssetModal()">+ Přidat</button>' : ''}
    </div>
    ${assetBuildLiquiditySections(D)}
  `;

  // Session 10 TODO-090: vykresli alokační donut
  renderAssetAllocation(D);
}

// ══════════════════════════════════════════════════════
//  TODO-090 (Session 10): ASSET ALLOCATION – donut + legenda
//  Rozložení majetku dle typu (nemovitosti/investice/vozidla/spoření/ostatní)
//  + peněženky. Donut chart jako SVG (bez canvas závislosti).
// ══════════════════════════════════════════════════════
function renderAssetAllocation(D) {
  const cont = document.getElementById('assetAllocationCard');
  if (!cont) return;
  D = D || getData();
  const nw = computeAssetsNetWorth(D);

  // Sestav segmenty: typy aktiv + peněženky
  const segs = [];
  ASSET_TABS.forEach(t => {
    const v = nw.byType[t] || 0;
    if (v > 0) segs.push({ name: ASSET_TYPES[t].label, color: ASSET_TYPES[t].color, icon: ASSET_TYPES[t].icon, value: v });
  });
  if ((nw.totalWallets||0) > 0) segs.push({ name: 'Peněženky', color: '#94a3b8', icon: '👛', value: nw.totalWallets });

  const total = segs.reduce((s,x)=>s+x.value,0);
  if (!segs.length || total <= 0) {
    cont.innerHTML = `<div class="card" style="margin-bottom:16px"><div class="card-body" style="text-align:center;padding:18px;color:var(--text3);font-size:.8rem">
      📊 Přidej aktiva pro zobrazení rozložení majetku</div></div>`;
    return;
  }

  segs.sort((a,b)=>b.value-a.value);

  // SVG donut – conic přes stroke-dasharray na kružnici
  const R = 52, CX = 60, CY = 60, C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = segs.map(s => {
    const frac = s.value / total;
    const dash = C * frac;
    const arc = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${s.color}" stroke-width="14"
      stroke-dasharray="${dash} ${C-dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${CX} ${CY})"
      style="transition:stroke-dashoffset .5s"/>`;
    offset += dash;
    return arc;
  }).join('');

  const legend = segs.map(s => {
    const pct = Math.round(s.value/total*100);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;font-size:.76rem">
      <span style="display:flex;align-items:center;gap:6px"><span style="width:9px;height:9px;border-radius:2px;background:${s.color};display:inline-block"></span>${s.icon} ${s.name}</span>
      <span style="color:var(--text3)"><strong style="color:var(--text)">${fmtBP(s.value)}</strong> · ${pct}%</span>
    </div>`;
  }).join('');

  cont.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">📊 Rozložení majetku</span></div>
      <div class="card-body" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <svg viewBox="0 0 120 120" style="width:120px;height:120px;flex-shrink:0">
          ${arcs}
          <text x="60" y="56" text-anchor="middle" font-size="9" fill="var(--text3)">Celkem</text>
          <text x="60" y="70" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text)">${(total/1000).toFixed(0)}k</text>
        </svg>
        <div style="flex:1;min-width:160px">${legend}</div>
      </div>
    </div>`;
}

function assetsSetTab(tab) {
  _assetsTab = tab;
  const D = getData();
  renderAssetsTab(D);
  // Aktualizuj styly tlačítek
  renderAssets();
}

function renderAssetsTab(D) {
  const el = document.getElementById('assetsTabContent'); if (!el) return;
  const type    = ASSET_TYPES[_assetsTab];
  const assets  = (D.assets || []).filter(a => a.type === _assetsTab);
  const tabTotal = assets.reduce((s, a) => s + (a.value || 0), 0);

  el.innerHTML = `
    <!-- Záhlaví záložky -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div>
        <div style="font-size:.86rem;font-weight:700">${type.icon} ${type.label}</div>
        ${tabTotal > 0 ? `<div style="font-size:.74rem;color:var(--text3)">Celkem: <strong style="color:${type.color}">${fmtBP(tabTotal)}</strong></div>` : ''}
      </div>
      ${!viewingUid ? `<button class="btn btn-accent btn-sm" onclick="openAssetModal()">+ Přidat</button>` : ''}
    </div>

    <!-- Seznam aktiv -->
    ${assets.length ? assets.map(a => assetBuildCard(a, type)).join('') : `
      <div class="empty" style="padding:32px">
        <div class="ei">${type.icon}</div>
        <div class="et">Žádná ${type.label.toLowerCase()}</div>
        <div style="font-size:.76rem;color:var(--text3);margin-top:6px">${type.examples}</div>
        ${!viewingUid ? `<div style="margin-top:12px"><button class="btn btn-accent btn-sm" onclick="openAssetModal()">+ Přidat první</button></div>` : ''}
      </div>`}
  `;
}

// S12.1k: součty dle likvidity (peněženky = liquid)
function assetLiqTotals(D){
  D = D || getData();
  const out = { wallets: 0, reserve: 0, mid: 0, fixed: 0, virtual: 0 };  // FIX-285
  out.wallets = (D.wallets||[]).reduce((s,w)=>s+(typeof walletBalanceCZK==='function'?walletBalanceCZK(w.id,D):(typeof computeWalletBalance==='function'?computeWalletBalance(w.id,D):(w.balance||0))),0);
  (D.assets||[]).forEach(a=>{ const t=assetTier(a); out[t]=(out[t]||0)+(a.value||0); });
  return out;
}

// S12.1k: seznam aktiv ve 3 sekcích dle likvidity; likvidní sekce ukazuje peněženky
function assetBuildLiquiditySections(D){
  const lt = assetLiqTotals(D);
  const ro = viewingUid !== null;
  let html = '';
  Object.entries(LIQ_GROUPS).forEach(([key,g])=>{
    const isWallets = key === 'wallets';
    const assets = isWallets ? [] : (D.assets||[]).filter(a=>assetTier(a)===key).sort((x,y)=>(y.value||0)-(x.value||0));
    const hasContent = isWallets ? (D.wallets||[]).length : assets.length;
    // FIX-285b (Milan): virtuální přesuny navazují na Peněženky – šipka ukazuje,
    //   že ty peníze přišly odtud, ne že jde o další nezávislý majetek.
    html += `<div style="margin:${key==='virtual'?'4px':'16px'} 0 8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px${key==='virtual'?';padding-left:16px;border-left:2px solid '+g.color+';margin-left:4px':''}">
      <span style="font-size:.8rem;font-weight:800;color:${g.color}">${key==='virtual'?'↳ ':''}${g.icon} ${g.label}</span>
      <span style="font-size:.84rem;font-weight:800;color:${g.color}">${fmtBP(lt[key]||0)}</span>
    </div>
    <div style="font-size:.74rem;color:#a8aec8;margin:-2px 0 8px${key==='virtual'?';padding-left:20px':''}">${g.desc}</div>`;
    if(!hasContent){
      html += `<div style="font-size:.72rem;color:var(--text3);padding:6px 2px">Zatím nic${(isWallets||ro)?'':' – přidej tlačítkem „+ Přidat" nebo přes Přesun'}</div>`;
      return;
    }
    if(isWallets){
      const ws = (D.wallets||[]);
      html += ws.map(w=>{
        const bal = typeof computeWalletBalance==='function'?computeWalletBalance(w.id,D):(w.balance||0);
        const cur = w.currency||'CZK';
        const balCZK = (typeof toCZK==='function') ? toCZK(bal, cur) : bal;
        const isForeign = cur !== 'CZK';
        // v8.62 (FIX): responsivní řádek – pevné min-width 120+160px bralo názvu veškeré místo na mobilu („E…“)
        return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:9px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px">
          <span style="font-size:1.05rem;flex-shrink:0">${w.icon||'👛'}</span>
          <span style="flex:1;font-size:.82rem;font-weight:600;min-width:0;overflow:hidden;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${w.name}</span>
          <span style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:1px">
            <span style="font-weight:600;font-variant-numeric:tabular-nums;color:${balCZK>=0?'#60a5fa':'var(--expense)'};white-space:nowrap">${fmtBP(balCZK)}</span>
            ${isForeign?`<span style="font-size:.68rem;color:#a8aec8;white-space:nowrap">${fmtP(bal)} ${cur}</span>`:''}
          </span>
        </div>`;
      }).join('') || '<div style="font-size:.72rem;color:var(--text3);padding:6px 2px">Žádné peněženky – přidej v Nastavení</div>';
    } else {
      html += assets.map(x=>assetBuildCard(x, ASSET_TYPES[x.type]||ASSET_TYPES.custom)).join('');
    }
  });
  if(!(D.assets||[]).length && !(D.wallets||[]).length){
    html = `<div class="empty" style="padding:32px"><div class="ei">📦</div><div class="et">Zatím žádná aktiva</div>
      ${!ro ? '<div style="margin-top:12px"><button class="btn btn-accent btn-sm" onclick="openAssetModal()">+ Přidat první</button></div>' : ''}</div>`;
  }
  return html;
}

//  S12.1k: TRACK RECORD – historie hodnoty aktiva
//  a.valuations = [{d:'YYYY-MM-DD', v:Kč}]; a.invested = vloženo celkem (volitelné)
//  Zápis hodnoty aktualizuje a.value (poslední záznam = aktuální hodnota).
// ══════════════════════════════════════════════════════
// ADR-076c: vklady z transakcí pro napojené aktivum (pro historii hodnoty a graf)
function assetDepositEvents(asset){
  if(!asset || !asset.linkedCatId) return [];
  const sub = asset.linkedSub || '';
  const wallets = S.wallets||[];
  const FX = (typeof _FX_RATES!=='undefined')?_FX_RATES:{};
  const out = [];
  (S.transactions||[]).forEach(t=>{
    if(t.splitParent) return;
    if((t.catId||t.category)!==asset.linkedCatId) return;
    if((t.subcat||'')!==sub) return;
    if(t.type!=='expense' && t.type!=='income') return;
    let amt = (t.amount||t.amt||0);
    if (t.amtCZK != null && isFinite(t.amtCZK)) { amt = t.amtCZK; } // v8.58 (TODO-148): zafixovaný kurz vkladu
    else {
      const w = wallets.find(x=>x.id===t.wallet); const cur=(w&&w.currency)?w.currency:'CZK';
      if(cur!=='CZK') amt = amt*(FX[cur]||1);
    }
    out.push({ d:t.date, amt:(t.type==='expense')?Math.round(amt):-Math.round(amt) });
  });
  out.sort((a,b)=>a.d.localeCompare(b.d));
  return out;
}
function openAssetValModal(id){
  if(viewingUid) return;
  window._assetValId = id;
  const D = getData();
  const asset = (D.assets||[]).find(x=>x.id===id); if(!asset) return;
  document.getElementById('assetValTitle').textContent = `📈 ${asset.name} – historie hodnoty`;
  document.getElementById('assetValDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('assetValAmount').value = '';
  assetValRenderList(asset);
  document.getElementById('modalAssetVal').classList.add('open');
}
function assetValRenderList(asset){
  const el = document.getElementById('assetValList'); if(!el) return;
  const deposits = assetDepositEvents(asset).map(e=>({d:e.d, kind:'deposit', amt:e.amt}));
  const vals = (asset.valuations||[]).map(v=>({d:v.d, kind:'val', v:v.v}));
  const all = [...deposits, ...vals].sort((a,b)=> b.d.localeCompare(a.d) || (a.kind==='val'?-1:1));
  el.innerHTML = all.length ? all.map(r=> r.kind==='val' ? `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:.8rem">
      <span style="color:#a8aec8;flex:1">📊 ${fmtD(r.d)} <span style="color:var(--text3);font-size:.7rem">ocenění</span></span>
      <span style="font-weight:700">${fmtBP(r.v)}</span>
      <button class="btn btn-danger btn-icon btn-sm" onclick="deleteAssetValuation('${r.d}')" style="width:24px;height:24px;font-size:.7rem" title="Smazat ocenění">✕</button>
    </div>` : `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:.8rem;opacity:.9">
      <span style="color:#a8aec8;flex:1">📥 ${fmtD(r.d)} <span style="color:var(--text3);font-size:.7rem">vklad z transakce</span></span>
      <span style="font-weight:700;color:${r.amt>=0?'var(--income)':'var(--expense)'}">${r.amt>=0?'+':''}${fmtBP(r.amt)}</span>
      <span style="width:24px;flex-shrink:0" title="Z transakcí – nelze smazat zde"></span>
    </div>`).join('') : '<div style="font-size:.74rem;color:var(--text3);padding:8px 0">Zatím žádné záznamy – zapiš první hodnotu výše nebo přidej přesun v Transakcích.</div>';
}
function saveAssetValuation(){
  const id = window._assetValId; if(!id || viewingUid) return;
  const d = document.getElementById('assetValDate').value;
  const v = document.getElementById('assetValAmount').value==='' ? NaN : moneyInRead('assetValAmount');   // TODO-216
  if(!d || !(v>=0)){ alert('Zadej datum a hodnotu'); return; }
  const asset = (S.assets||[]).find(x=>x.id===id); if(!asset) return;
  asset.valuations = asset.valuations||[];
  const ex = asset.valuations.find(x=>x.d===d);
  if(ex) ex.v = v; else asset.valuations.push({d, v});
  asset.valuations.sort((a,b)=>a.d.localeCompare(b.d));
  asset.value = asset.valuations[asset.valuations.length-1].v; // aktuální hodnota = poslední záznam
  // ADR-076: ocenění = nová baseline; další vklady se přičtou nad ni
  asset.valueBaseline = asset.value;
  asset.investedAtBaseline = (typeof asset.invested === 'number') ? asset.invested : 0;
  asset.updatedAt = Date.now();
  save();
  document.getElementById('assetValAmount').value='';
  assetValRenderList(asset);
  renderAssets();
}
function deleteAssetValuation(d){
  const id = window._assetValId; if(!id || viewingUid) return;
  const asset = (S.assets||[]).find(x=>x.id===id); if(!asset||!asset.valuations) return;
  asset.valuations = asset.valuations.filter(x=>x.d!==d);
  if(asset.valuations.length) asset.value = asset.valuations[asset.valuations.length-1].v;
  save();
  assetValRenderList(asset);
  renderAssets();
}

// Graf: hodnota v čase (plná čára barvy typu) vs. vloženo (šedá čárkovaná) – osy, tooltip, dotyk
function drawAssetValChart(canvasId, assetId){
  const canvas = document.getElementById(canvasId); if(!canvas) return;
  const D = getData();
  const asset = (D.assets||[]).find(x=>x.id===assetId); if(!asset) return;
  // kombinuj vklady z transakcí (kumulativně) + ruční ocenění do jedné časové řady
  const _deps = assetDepositEvents(asset);
  let _cum=0; const byDate={};
  _deps.forEach(e=>{ _cum+=e.amt; byDate[e.d]={d:e.d, v:Math.round(_cum)}; });
  (asset.valuations||[]).forEach(v=>{ byDate[v.d]={d:v.d, v:v.v}; }); // ocenění přepíše vklad ve stejný den
  const vals = Object.values(byDate).sort((a,b)=>a.d.localeCompare(b.d));
  if(vals.length < 2) return;
  const color = (ASSET_TYPES[asset.type]||ASSET_TYPES.custom).color;
  const invested = parseFloat(asset.invested)||0;
  const draw = ()=>{
    const cw = canvas.clientWidth || canvas.parentElement?.clientWidth || 0;
    if(!cw){ requestAnimationFrame(draw); return; }
    const dpr = window.devicePixelRatio||1, H = 150;
    canvas.width = cw*dpr; canvas.height = H*dpr;
    const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
    const pad = {l:54, r:10, t:10, b:20};
    const maxV = Math.max(...vals.map(x=>x.v), invested, 1);
    const minV = Math.min(...vals.map(x=>x.v), invested>0?invested:Infinity, maxV) * 0.95;
    const x = i => pad.l + (cw-pad.l-pad.r)*(vals.length<=1?0:i/(vals.length-1));
    const y = v => pad.t + (H-pad.t-pad.b)*(1-(v-minV)/Math.max(maxV-minV,1));
    ctx.clearRect(0,0,cw,H);
    ctx.font='9px Instrument Sans'; ctx.fillStyle='#a8aec8'; ctx.textAlign='right';
    for(let g2=0; g2<=2; g2++){
      const v = minV + (maxV-minV)*g2/2, yy = y(v);
      ctx.strokeStyle='rgba(168,174,200,.14)'; ctx.beginPath(); ctx.moveTo(pad.l,yy); ctx.lineTo(cw-pad.r,yy); ctx.stroke();
      ctx.fillText(fmt(Math.round(czkToBase(v))), pad.l-6, yy+3); // v8.61: ticky v základní měně
    }
    ctx.textAlign='center';
    vals.forEach((v2,i)=>{ if(vals.length<=6 || i%Math.ceil(vals.length/6)===0 || i===vals.length-1) ctx.fillText(v2.d.slice(5).split('-').reverse().join('.'), x(i), H-6); });
    if(invested>0){ ctx.strokeStyle='#7e84a0'; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(pad.l,y(invested)); ctx.lineTo(cw-pad.r,y(invested)); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle='#7e84a0'; ctx.textAlign='left'; ctx.fillText('vloženo', pad.l+2, y(invested)-4); }
    ctx.strokeStyle=color; ctx.lineWidth=2; ctx.beginPath();
    vals.forEach((v2,i)=>{ i===0?ctx.moveTo(x(i),y(v2.v)):ctx.lineTo(x(i),y(v2.v)); }); ctx.stroke();
    ctx.fillStyle=color; vals.forEach((v2,i)=>{ ctx.beginPath(); ctx.arc(x(i),y(v2.v),3,0,Math.PI*2); ctx.fill(); });
    canvas.onmousemove = function(e){
      const rect=canvas.getBoundingClientRect(); const mx=e.clientX-rect.left;
      let idx=0,best=1e9; for(let i=0;i<vals.length;i++){const dd=Math.abs(mx-x(i)); if(dd<best){best=dd;idx=i;}}
      draw();
      requestAnimationFrame(()=>{
        const c2=canvas.getContext('2d'); c2.save(); c2.scale(dpr,dpr);
        c2.strokeStyle='rgba(232,234,242,.4)'; c2.setLineDash([3,3]); c2.beginPath(); c2.moveTo(x(idx),pad.t); c2.lineTo(x(idx),H-pad.b); c2.stroke(); c2.setLineDash([]);
        const txt1=fmtD(vals[idx].d), txt2=fmtBP(vals[idx].v); // v8.61
        const bw=110,bh=invested>0?44:32; let bx=x(idx)+8; if(bx+bw>cw-pad.r) bx=x(idx)-bw-8;
        c2.fillStyle='rgba(20,23,38,.95)'; c2.strokeStyle='rgba(168,174,200,.3)';
        c2.beginPath(); (c2.roundRect?c2.roundRect(bx,pad.t,bw,bh,6):c2.rect(bx,pad.t,bw,bh)); c2.fill(); c2.stroke();
        c2.textAlign='left'; c2.font='9.5px Instrument Sans';
        c2.fillStyle='#a8aec8'; c2.fillText(txt1, bx+8, pad.t+13);
        c2.fillStyle=color; c2.font='bold 10px Instrument Sans'; c2.fillText(txt2, bx+8, pad.t+26);
        if(invested>0){ const diff=vals[idx].v-invested; c2.fillStyle=diff>=0?'#4ade80':'#f87171'; c2.font='9px Instrument Sans'; c2.fillText((diff>=0?'+':'')+fmt(Math.round(czkToBase(diff)))+' '+curSym()+' vs vklad', bx+8, pad.t+39); }
        c2.restore();
      });
    };
    canvas.onmouseleave=function(){ draw(); };
    if(!canvas._touchBound){
      canvas._touchBound=true; canvas.style.touchAction='pan-y';
      const fire=(ev)=>{const t=ev.touches&&ev.touches[0]; if(t&&typeof canvas.onmousemove==='function') canvas.onmousemove({clientX:t.clientX,clientY:t.clientY});};
      canvas.addEventListener('touchstart',fire,{passive:true});
      canvas.addEventListener('touchmove',fire,{passive:true});
    }
  };
  requestAnimationFrame(draw);
}

function assetBuildCard(asset, type) {
  const ro = viewingUid !== null;
  return `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px;display:flex;align-items:flex-start;gap:12px">
      <!-- Ikona -->
      <div style="width:40px;height:40px;border-radius:10px;background:${type.color}22;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0">
        ${asset.icon || type.icon}
      </div>
      <!-- Info -->
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.9rem;margin-bottom:2px">${asset.name}${(asset.linkedCatId||asset.auto)?` <span style="font-size:.62rem;font-weight:600;color:#a8aec8;background:rgba(129,140,248,.18);padding:1px 6px;border-radius:6px;vertical-align:middle;white-space:nowrap">🔄 z přesunů</span>`:''}</div>
        ${asset.note ? `<div style="font-size:.74rem;color:var(--text3);margin-bottom:4px">${asset.note}</div>` : ''}
        <div style="font-size:1.1rem;font-weight:800;font-family:Syne,sans-serif;color:${type.color}">${fmtBP(asset.value || 0)}</div>
        ${(()=>{ // S12.1k: zisk/ztráta vs vloženo (track record)
          const inv=parseFloat(asset.invested)||0; if(!inv) return '';
          const diff=(asset.value||0)-inv; const pct=inv>0?Math.round(diff/inv*1000)/10:0;
          return `<div style="font-size:.7rem;margin-top:2px;color:${diff>=0?'var(--income)':'var(--expense)'}">${diff>=0?'▲':'▼'} ${diff>=0?'+':''}${fmtBP(diff)} (${pct>0?'+':''}${pct} %) <span style="color:var(--text3)">vs vloženo ${fmtBP(inv)}</span></div>`; })()}
        ${asset.updatedAt ? `<div style="font-size:.68rem;color:#a8aec8;margin-top:3px">Aktualizováno: ${fmtD(new Date(asset.updatedAt).toISOString().slice(0,10))}</div>` : ''}
        ${(((asset.valuations||[]).length + assetDepositEvents(asset).length) >= 2) ? (()=>{ const cid='avc_'+asset.id; setTimeout(()=>drawAssetValChart(cid, asset.id), 60); return `<canvas id="${cid}" style="width:100%;max-width:100%;height:150px;margin-top:8px"></canvas>`; })() : ''}
      </div>
      <!-- Akce -->
      ${!ro ? `<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
        <button class="btn btn-edit btn-icon btn-sm" onclick="openAssetModal('${asset.id}')">✎</button>
        ${type.liq==='invest' ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="openAssetValModal('${asset.id}')" title="Zapsat aktuální hodnotu">📈</button>` : ''}
        ${asset.linkedKey?'':`<button class="btn btn-danger btn-icon btn-sm" onclick="assetDelete('${asset.id}')">✕</button>`}
      </div>` : ''}
    </div>`;
}

// ══════════════════════════════════════════════════════
//  MODAL – přidat / upravit aktivum
// ══════════════════════════════════════════════════════
function openAssetModal(editId) {
  if (viewingUid) return;
  const modal = document.getElementById('modalAsset'); if (!modal) return;
  const D     = getData();
  const asset = editId ? (D.assets || []).find(a => a.id === editId) : null;

  document.getElementById('editAssetId').value    = editId || '';
  document.getElementById('assetName').value      = asset?.name || '';
  moneyInFill('assetValue', asset?.value);   // TODO-216
  document.getElementById('assetNote').value      = asset?.note || '';
  moneyInFill('assetInvested', asset?.invested);   // TODO-216
  document.getElementById('assetIcon').value      = asset?.icon || ASSET_TYPES[_assetsTab].icon;
  document.getElementById('assetType').value      = asset?.type || _assetsTab;
  document.getElementById('assetModalTitle').textContent = editId ? 'Upravit aktivum' : 'Nové aktivum';

  // Nastav příklady dle vybraného typu
  assetUpdateTypeHint();
  modal.classList.add('open');
}

function assetUpdateTypeHint() {
  const type = document.getElementById('assetType')?.value;
  const info = ASSET_TYPES[type] || ASSET_TYPES.custom;
  const valueRow = document.getElementById('assetValueRow');
  if (valueRow) valueRow.style.display = (info.liq==='invest') ? 'none' : 'block'; // investice/spoření: hodnotu řeš přes 📈 historii hodnoty
  const el   = document.getElementById('assetTypeHint'); if (!el) return;
  el.textContent = info.examples;
  el.style.color = info.color;
  // Session 11: při změně typu nastav výchozí ikonu typu (pokud uživatel nemá vlastní)
  const inp = document.getElementById('assetIcon');
  if (inp) {
    const defaults = Object.values(ASSET_TYPES).map(t => t.icon);
    if (!inp.value || defaults.includes(inp.value)) inp.value = info.icon;
  }
  assetRenderIconPicker();
}

// Výběr ikon (Session 11) – nabídka dle typu, klik nastaví ikonu
const ASSET_ICONS = {
  property:   ['🏠','🏢','🏡','🏘️','🏖️','🌳','🏚️','🅿️'],
  investment: ['📈','💹','🪙','💰','📊','🏦','💵','₿'],
  vehicle:    ['🚗','🏍️','🚙','🚐','🚲','⛵','✈️','🚛'],
  savings:    ['🏦','🐷','💰','💵','🪙','💳','📅','🧧'],
  custom:     ['💎','🎨','⌚','💍','🖼️','🎸','📦','🏺'],
};
function assetRenderIconPicker() {
  const el = document.getElementById('assetIconPicker'); if (!el) return;
  const type = document.getElementById('assetType')?.value || 'custom';
  const cur  = (document.getElementById('assetIcon')?.value || '').trim();
  const icons = ASSET_ICONS[type] || ASSET_ICONS.custom;
  el.innerHTML = icons.map(ic => {
    const sel = ic === cur;
    return `<button type="button" onclick="assetPickIcon('${ic}')" title="${ic}"
      style="font-size:1.25rem;width:38px;height:38px;border-radius:9px;cursor:pointer;
      border:1.5px solid ${sel ? 'var(--accent,#4ade80)' : 'var(--border)'};
      background:${sel ? 'rgba(74,222,128,.14)' : 'var(--surface2)'}">${ic}</button>`;
  }).join('');
}
function assetPickIcon(ic) {
  const inp = document.getElementById('assetIcon');
  if (inp) inp.value = ic;
  assetRenderIconPicker();
}

function saveAsset() {
  if (viewingUid) return;
  const eid  = document.getElementById('editAssetId').value;
  const name = document.getElementById('assetName').value.trim();
  const val  = moneyInRead('assetValue');   // TODO-216
  const note = document.getElementById('assetNote').value.trim();
  const icon = document.getElementById('assetIcon').value.trim();
  const type = document.getElementById('assetType').value;
  const invested = moneyInRead('assetInvested'); // S12.1k · TODO-216
  const _isInvest = ((ASSET_TYPES[type]||ASSET_TYPES.custom).liq === 'invest'); // hodnotu řeší 📈 historie/vklady

  if (!name)  { alert('Zadej název aktiva'); return; }
  if (!_isInvest && !val)   { alert('Zadej hodnotu aktiva'); return; }

  const D = getData();
  if (!D.assets) D.assets = [];

  // ADR-076: ruční hodnota = baseline; další vklady se přičtou. U investic se hodnota NEnastavuje (přes historii).
  const _prev = eid ? (D.assets.find(a => a.id === eid) || {}) : {};
  const _invNow = (typeof _prev.invested === 'number') ? _prev.invested : invested;
  const obj = {
    id:        eid || uid(),
    name, note, icon, type, invested,
    updatedAt: Date.now(),
  };
  if (!_isInvest){
    obj.value = val; obj.valueManual = true; obj.valueBaseline = val; obj.investedAtBaseline = _invNow;
  } else if (!eid){
    obj.value = 0; // nové investiční aktivum – hodnota se doplní přes 📈 historii nebo vklady z přesunů
  }

  if (eid) {
    const idx = D.assets.findIndex(a => a.id === eid);
    if (idx >= 0) D.assets[idx] = { ...D.assets[idx], ...obj }; else D.assets.push(obj); // S12.1k: merge zachová valuations
  } else {
    D.assets.push(obj);
  }

  S.assets = D.assets;
  _assetsTab = type; // přepni na záložku uloženého aktiva
  save();
  closeModal('modalAsset');
  renderAssets();
}

function assetDelete(id) {
  if (viewingUid) return;
  if (!confirm('Smazat toto aktivum?')) return;
  const _a = (S.assets || []).find(x => x.id === id);
  if (_a && _a.linkedKey) { alert('Toto aktivum je napojené na transakce (Přesuny) a nelze ho smazat – spravuje se automaticky. Smaž příslušné transakce, pokud ho chceš odstranit.'); return; } // v8.71 (FIX-184)
  S.assets = (S.assets || []).filter(a => a.id !== id);
  save();
  renderAssets();
}

// ══════════════════════════════════════════════════════
//  HELPER – Net Worth pro report poradce (advisor.js)
// ══════════════════════════════════════════════════════
function computeAssetsNetWorth(D) {
  D = D || getData();
  const assets  = D.assets || [];
  const wallets = D.wallets || [];
  const debts   = D.debts || [];

  const totalAssets  = assets.reduce((s, a) => s + (a.value || 0), 0);
  const totalWallets = wallets.reduce((s, w) => s + (typeof walletBalanceCZK==='function' ? walletBalanceCZK(w.id, D) : (w.balance || 0)), 0);
  const totalDebts   = debts.reduce((s, d) => s + (d.remaining || 0), 0);

  // Struktura aktiv dle typu
  const byType = {};
  ASSET_TABS.forEach(t => {
    byType[t] = assets.filter(a => a.type === t).reduce((s, a) => s + (a.value || 0), 0);
  });
  byType.wallets = totalWallets;

  return {
    totalAssets,
    totalWallets,
    totalDebts,
    netWorth:   totalAssets + totalWallets - totalDebts,
    byType,
    assets,
    wallets,
    debts,
  };
}
