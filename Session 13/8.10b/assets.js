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
  liquid: { label: 'Běžná a likvidní aktiva', icon: '💧', color: '#60a5fa', desc: 'hotovost, běžné účty (peněženky)' },
  invest: { label: 'Střednědobá a investiční aktiva', icon: '📈', color: '#10b981', desc: 'akcie, ETF, krypto, termínované vklady, spoření' },
  fixed:  { label: 'Nelikvidní a fyzická aktiva', icon: '🏠', color: '#f59e0b', desc: 'nemovitosti, auta, drahé kovy, umění' },
};

const ASSET_TABS = ['property','investment','vehicle','savings','custom'];

let _assetsTab = 'property'; // aktivní záložka

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
      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px">💎 Čisté jmění (Net Worth)</div>
      <div style="font-size:1.6rem;font-weight:800;font-family:Syne,sans-serif;color:${netWorth>=0?'var(--income)':'var(--expense)'};margin-bottom:10px">
        ${fmtP(netWorth)} Kč
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div style="text-align:center;padding:8px;background:var(--surface3);border-radius:10px">
          <div style="font-size:.92rem;font-weight:700;color:var(--income)">${fmtP(totalAssets)} Kč</div>
          <div style="font-size:.68rem;color:var(--text3)">Aktiva</div>
        </div>
        <div style="text-align:center;padding:8px;background:var(--surface3);border-radius:10px">
          <div style="font-size:.92rem;font-weight:700;color:var(--bank)">${fmtP(totalWallets)} Kč</div>
          <div style="font-size:.68rem;color:var(--text3)">Peněženky</div>
        </div>
        <div style="text-align:center;padding:8px;background:var(--surface3);border-radius:10px">
          <div style="font-size:.92rem;font-weight:700;color:${totalDebts>0?'var(--expense)':'var(--text3)'}">−${fmtP(totalDebts)} Kč</div>
          <div style="font-size:.68rem;color:var(--text3)">Závazky</div>
        </div>
      </div>
      ${(()=>{ // S12.1k: rozpad dle likvidity
        const lt = assetLiqTotals(D);
        return `<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
          ${Object.entries(LIQ_GROUPS).map(([k,g])=>`<span style="font-size:.68rem;background:${g.color}18;color:${g.color};padding:3px 9px;border-radius:8px;border:1px solid ${g.color}40">${g.icon} ${fmtP(lt[k]||0)} Kč</span>`).join('')}
        </div>`; })()}
    </div>

    <!-- Session 10 TODO-090: Asset Allocation – rozložení majetku -->
    <div id="assetAllocationCard"></div>

    <!-- Flat seznam aktiv -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:.78rem;color:var(--text3);font-weight:600">${D.assets.length ? D.assets.length + (D.assets.length===1?' aktivum':D.assets.length<5?' aktiva':' aktiv') : 'Žádná aktiva'}</div>
      ${!viewingUid ? '<button class="btn btn-accent btn-sm" onclick="openAssetModal()">+ Přidat</button>' : ''}
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
      <span style="color:var(--text3)"><strong style="color:var(--text)">${fmtP(s.value)} Kč</strong> · ${pct}%</span>
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
        ${tabTotal > 0 ? `<div style="font-size:.74rem;color:var(--text3)">Celkem: <strong style="color:${type.color}">${fmtP(tabTotal)} Kč</strong></div>` : ''}
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
  const out = { liquid: 0, invest: 0, fixed: 0 };
  out.liquid = (D.wallets||[]).reduce((s,w)=>s+(typeof walletBalanceCZK==='function'?walletBalanceCZK(w.id,D):(typeof computeWalletBalance==='function'?computeWalletBalance(w.id,D):(w.balance||0))),0);
  (D.assets||[]).forEach(a=>{ const g=(ASSET_TYPES[a.type]||ASSET_TYPES.custom).liq||'fixed'; out[g]+=(a.value||0); });
  return out;
}

// S12.1k: seznam aktiv ve 3 sekcích dle likvidity; likvidní sekce ukazuje peněženky
function assetBuildLiquiditySections(D){
  const lt = assetLiqTotals(D);
  const ro = viewingUid !== null;
  let html = '';
  Object.entries(LIQ_GROUPS).forEach(([key,g])=>{
    const assets = (D.assets||[]).filter(a=>((ASSET_TYPES[a.type]||ASSET_TYPES.custom).liq||'fixed')===key)
      .sort((x,y)=>(y.value||0)-(x.value||0));
    const isLiquid = key==='liquid';
    if(!isLiquid && !assets.length) {
      html += `<div style="margin:14px 0 8px;display:flex;align-items:center;gap:8px">
        <span style="font-size:.78rem;font-weight:800;color:${g.color}">${g.icon} ${g.label}</span>
        <span style="font-size:.66rem;color:var(--text3)">– ${g.desc}</span></div>
        <div style="font-size:.72rem;color:var(--text3);padding:8px 2px">Zatím nic${ro?'':' – přidej tlačítkem výše'}</div>`;
      return;
    }
    html += `<div style="margin:14px 0 8px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px">
      <span style="font-size:.78rem;font-weight:800;color:${g.color}">${g.icon} ${g.label}</span>
      <span style="font-size:.8rem;font-weight:800;color:${g.color}">${fmtP(lt[key]||0)} Kč</span>
    </div>`;
    if(isLiquid){
      const ws = (D.wallets||[]);
      html += ws.length ? ws.map(w=>{
        const bal = typeof computeWalletBalance==='function'?computeWalletBalance(w.id,D):(w.balance||0);
        return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:9px 12px;margin-bottom:6px;display:flex;align-items:center;gap:9px">
          <span style="font-size:1.05rem">${w.icon||'👛'}</span>
          <span style="flex:1;font-size:.82rem;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${w.name}</span>
          <span style="font-weight:800;font-family:Syne,sans-serif;color:${bal>=0?'#60a5fa':'var(--expense)'};white-space:nowrap">${fmtP(bal)} Kč</span>
        </div>`;
      }).join('') : '<div style="font-size:.72rem;color:var(--text3);padding:6px 2px">Žádné peněženky – přidej v Nastavení</div>';
    }
    html += assets.map(x=>assetBuildCard(x, ASSET_TYPES[x.type]||ASSET_TYPES.custom)).join('');
  });
  if(!(D.assets||[]).length && !(D.wallets||[]).length){
    html = `<div class="empty" style="padding:32px"><div class="ei">📦</div><div class="et">Zatím žádná aktiva</div>
      ${!ro ? '<div style="margin-top:12px"><button class="btn btn-accent btn-sm" onclick="openAssetModal()">+ Přidat první</button></div>' : ''}</div>`;
  }
  return html;
}

// ══════════════════════════════════════════════════════
//  S12.1k: TRACK RECORD – historie hodnoty aktiva
//  a.valuations = [{d:'YYYY-MM-DD', v:Kč}]; a.invested = vloženo celkem (volitelné)
//  Zápis hodnoty aktualizuje a.value (poslední záznam = aktuální hodnota).
// ══════════════════════════════════════════════════════
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
  const vals = [...(asset.valuations||[])].sort((a,b)=>b.d.localeCompare(a.d));
  el.innerHTML = vals.length ? vals.map((v,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:.8rem">
      <span style="color:#a8aec8;flex:1">${fmtD(v.d)}</span>
      <span style="font-weight:700">${fmtP(v.v)} Kč</span>
      <button class="btn btn-danger btn-icon btn-sm" onclick="deleteAssetValuation('${v.d}')" style="width:24px;height:24px;font-size:.7rem">✕</button>
    </div>`).join('') : '<div style="font-size:.74rem;color:var(--text3);padding:8px 0">Zatím žádné záznamy – zapiš první hodnotu výše.</div>';
}
function saveAssetValuation(){
  const id = window._assetValId; if(!id || viewingUid) return;
  const d = document.getElementById('assetValDate').value;
  const v = parseFloat(document.getElementById('assetValAmount').value);
  if(!d || !(v>=0)){ alert('Zadej datum a hodnotu'); return; }
  const asset = (S.assets||[]).find(x=>x.id===id); if(!asset) return;
  asset.valuations = asset.valuations||[];
  const ex = asset.valuations.find(x=>x.d===d);
  if(ex) ex.v = v; else asset.valuations.push({d, v});
  asset.valuations.sort((a,b)=>a.d.localeCompare(b.d));
  asset.value = asset.valuations[asset.valuations.length-1].v; // aktuální hodnota = poslední záznam
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
  const vals = [...(asset.valuations||[])].sort((a,b)=>a.d.localeCompare(b.d));
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
      ctx.fillText(fmt(Math.round(v)), pad.l-6, yy+3);
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
        const txt1=fmtD(vals[idx].d), txt2=fmtP(vals[idx].v)+' Kč';
        const bw=110,bh=invested>0?44:32; let bx=x(idx)+8; if(bx+bw>cw-pad.r) bx=x(idx)-bw-8;
        c2.fillStyle='rgba(20,23,38,.95)'; c2.strokeStyle='rgba(168,174,200,.3)';
        c2.beginPath(); (c2.roundRect?c2.roundRect(bx,pad.t,bw,bh,6):c2.rect(bx,pad.t,bw,bh)); c2.fill(); c2.stroke();
        c2.textAlign='left'; c2.font='9.5px Instrument Sans';
        c2.fillStyle='#a8aec8'; c2.fillText(txt1, bx+8, pad.t+13);
        c2.fillStyle=color; c2.font='bold 10px Instrument Sans'; c2.fillText(txt2, bx+8, pad.t+26);
        if(invested>0){ const diff=vals[idx].v-invested; c2.fillStyle=diff>=0?'#4ade80':'#f87171'; c2.font='9px Instrument Sans'; c2.fillText((diff>=0?'+':'')+fmt(Math.round(diff))+' Kč vs vklad', bx+8, pad.t+39); }
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
        <div style="font-weight:700;font-size:.9rem;margin-bottom:2px">${asset.name}</div>
        ${asset.note ? `<div style="font-size:.74rem;color:var(--text3);margin-bottom:4px">${asset.note}</div>` : ''}
        <div style="font-size:1.1rem;font-weight:800;font-family:Syne,sans-serif;color:${type.color}">${fmtP(asset.value || 0)} Kč</div>
        ${(()=>{ // S12.1k: zisk/ztráta vs vloženo (track record)
          const inv=parseFloat(asset.invested)||0; if(!inv) return '';
          const diff=(asset.value||0)-inv; const pct=inv>0?Math.round(diff/inv*1000)/10:0;
          return `<div style="font-size:.7rem;margin-top:2px;color:${diff>=0?'var(--income)':'var(--expense)'}">${diff>=0?'▲':'▼'} ${diff>=0?'+':''}${fmtP(diff)} Kč (${pct>0?'+':''}${pct} %) <span style="color:var(--text3)">vs vloženo ${fmtP(inv)} Kč</span></div>`; })()}
        ${asset.updatedAt ? `<div style="font-size:.68rem;color:var(--text3);margin-top:3px">Aktualizováno: ${fmtD(new Date(asset.updatedAt).toISOString().slice(0,10))}</div>` : ''}
        ${(asset.valuations||[]).length>=2 ? (()=>{ const cid='avc_'+asset.id; setTimeout(()=>drawAssetValChart(cid, asset.id), 60); return `<canvas id="${cid}" style="width:100%;max-width:100%;height:150px;margin-top:8px"></canvas>`; })() : ''}
      </div>
      <!-- Akce -->
      ${!ro ? `<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
        <button class="btn btn-edit btn-icon btn-sm" onclick="openAssetModal('${asset.id}')">✎</button>
        ${type.liq==='invest' ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="openAssetValModal('${asset.id}')" title="Zapsat aktuální hodnotu">📈</button>` : ''}
        <button class="btn btn-danger btn-icon btn-sm" onclick="assetDelete('${asset.id}')">✕</button>
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
  document.getElementById('assetValue').value     = asset?.value || '';
  document.getElementById('assetNote').value      = asset?.note || '';
  const _inv=document.getElementById('assetInvested'); if(_inv) _inv.value = asset?.invested || '';
  document.getElementById('assetIcon').value      = asset?.icon || ASSET_TYPES[_assetsTab].icon;
  document.getElementById('assetType').value      = asset?.type || _assetsTab;
  document.getElementById('assetModalTitle').textContent = editId ? 'Upravit aktivum' : 'Nové aktivum';

  // Nastav příklady dle vybraného typu
  assetUpdateTypeHint();
  modal.classList.add('open');
}

function assetUpdateTypeHint() {
  const type = document.getElementById('assetType')?.value;
  const el   = document.getElementById('assetTypeHint'); if (!el) return;
  const info = ASSET_TYPES[type] || ASSET_TYPES.custom;
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
  const val  = parseFloat(document.getElementById('assetValue').value) || 0;
  const note = document.getElementById('assetNote').value.trim();
  const icon = document.getElementById('assetIcon').value.trim();
  const type = document.getElementById('assetType').value;
  const invested = parseFloat(document.getElementById('assetInvested')?.value) || 0; // S12.1k

  if (!name)  { alert('Zadej název aktiva'); return; }
  if (!val)   { alert('Zadej hodnotu aktiva'); return; }

  const D = getData();
  if (!D.assets) D.assets = [];

  const obj = {
    id:        eid || uid(),
    name, value: val, note, icon, type, invested,
    updatedAt: Date.now(),
  };

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
