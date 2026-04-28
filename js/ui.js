//  RENDER ROUTER
// ══════════════════════════════════════════════════════
function renderPage(){
  renderSummaryCards();
  if(curPage==='prehled')renderDashboard();
  if(curPage==='souhrn')renderSouhrn();
  if(curPage==='transakce')renderTxPage();
  if(curPage==='bank')renderBank();
  if(curPage==='predikce')renderPredikce();
  if(curPage==='dluhy')renderDebts();
  if(curPage==='grafy')renderGrafy();
  if(curPage==='narozeniny')renderNarozeniny();
  if(curPage==='statistiky')renderStats();
  if(curPage==='kategorie')renderCatPage();
  if(curPage==='ai')renderAiPage();
  if(curPage==='rodina')renderFamilySummary();
  if(curPage==='penezenky')renderWalletList();
  if(curPage==='typy')renderPayTypeList();
  if(curPage==='sablony')renderSablonaList();
  if(curPage==='nastaveni'){
    if(typeof renderSettingsPage==='function') renderSettingsPage();
    else if(typeof applySettings==='function') applySettings();
  }
  if(curPage==='sdileni')renderSdileni();
  if(curPage==='projekty')renderProjectGrid();
  if(curPage==='projektDetail'&&_currentProjectId)renderProjectDetail(_currentProjectId);
  if(curPage==='prehled'){renderNetWorth();renderDashboard();}
  if(curPage==='report')renderReport();
  if(curPage==='radar')renderRadar();
  if(curPage==='obraz')renderObraz();
  if(curPage==='detektor')renderDetektor();
  if(curPage==='simulace')renderSimulace();
  if(curPage==='uctenky')renderUctenky();
  if(curPage==='nakup')renderNakup();
  if(curPage==='budouci')renderBudouci();
  if(curPage==='smsimport')renderSmsImport();
  if(curPage==='admin')renderAdmin();
  if(curPage==='tagy')renderTagy();
  if(curPage==='import')renderImport();
  if(curPage==='kalendar')renderKalendar();
  if(curPage==='komunita')renderKomunita();
  updateReadonlyUI();
}

// ══════════════════════════════════════════════════════
//  SUMMARY CARDS
// ══════════════════════════════════════════════════════
function renderSummaryCards(){
  const el=document.getElementById('summaryCards');if(!el)return;
  const D=getData();
  const txs=getTx(S.curMonth,S.curYear,D);
  const inc=incSum(txs),exp=expSum(txs),bal=inc-exp;
  let pm=S.curMonth-1,py=S.curYear;if(pm<0){pm=11;py--;}
  const prevTxs=getTx(pm,py,D),prevExp=expSum(prevTxs),prevInc=incSum(prevTxs);
  const expDiff=prevExp>0?Math.round((exp-prevExp)/prevExp*100):null;
  const bankBal=computeBank(D);
  const totalDebt=(D.debts||[]).reduce((a,d)=>a+d.remaining,0);
  // Prázdný měsíc banner - pokud nemáme transakce ale minulý měsíc ano
  const emptyBanner = document.getElementById('emptyMonthBanner');
  if(emptyBanner) {
    if(!txs.length && prevTxs.length) {
      emptyBanner.style.display = 'block';
      emptyBanner.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:10px;margin-bottom:10px">
        <span style="font-size:1.1rem">💡</span>
        <div style="flex:1;font-size:.82rem;color:var(--text2)">V <strong>${CZ_M[S.curMonth]}</strong> zatím žádné transakce. Poslední aktivita byla v ${CZ_M[pm]}.</div>
        <button class="btn btn-ghost btn-sm" onclick="changeMonth(-1)" style="flex-shrink:0">← ${CZ_M[pm]}</button>
      </div>`;
    } else {
      emptyBanner.style.display = 'none';
    }
  }
  el.innerHTML=`
    <div class="stat-card income"><div class="stat-label">Příjmy</div><div class="stat-value up">${fmt(inc)}</div><div class="stat-sub">${prevInc?fmt(prevInc)+' minulý m.':''}</div></div>
    <div class="stat-card expense"><div class="stat-label">Výdaje</div><div class="stat-value down">${fmt(exp)}</div><div class="stat-sub">${expDiff!==null?`<span style="color:${expDiff>0?'var(--expense)':'var(--income)'}">${expDiff>0?'↑':'↓'}${Math.abs(expDiff)}% vs minulý m.</span>`:''}</div></div>
    <div class="stat-card balance"><div class="stat-label">Zůstatek</div><div class="stat-value ${bal>=0?'up':'down'}">${fmt(bal)}</div><div class="stat-sub">${bal>=0?'přebytek':'schodek'}</div></div>
    <div class="stat-card bank"><div class="stat-label">Úspory (Bank)</div><div class="stat-value bankc">${fmt(bankBal)}</div><div class="stat-sub">kumulované</div></div>
    <div class="stat-card debt"><div class="stat-label">Celkový dluh</div><div class="stat-value warn">${fmt(totalDebt)}</div><div class="stat-sub">${(D.debts||[]).length} závazků</div></div>`;
}

// ══════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════
function renderDashboard(){
  const D=getData();
  // Financial score card
  renderFinancialScore(D);
  // Bday alert
  const bEl=document.getElementById('bdayAlert');
  if(bEl){
    const bdays=(D.birthdays||[]).filter(b=>daysUntilBday(b)<=7);
    bEl.innerHTML=bdays.length?bdays.map(b=>`<div class="insight-item warn" style="margin-bottom:10px"><div class="insight-icon">🎂</div><div class="insight-text"><strong>${b.name}</strong> – narozeniny za ${daysUntilBday(b)} dní${b.gift?` · Dárek: <strong>${fmt(b.gift)}</strong>`:''}</div></div>`).join(''):'';
  }
  // Recent tx
  const rEl=document.getElementById('recentTxList');
  if(rEl){
    const txs=getTx(S.curMonth,S.curYear,D).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
    if(!txs.length)rEl.innerHTML='<div class="empty"><div class="et">Žádné transakce</div></div>';
    else rEl.innerHTML=txs.map(t=>{const cat=getCat(t.catId,D.categories);return`<div class="tx-row"><div style="font-size:.9rem">${cat.icon}</div><div class="tx-info"><div class="tx-name">${t.name}</div><div class="tx-meta">${fmtD(t.date)} · ${cat.name}</div></div><div class="tx-amt ${t.type==='income'?'inc':'exp'}">${t.type==='income'?'+':'-'}${fmtP(t.amt)}</div></div>`;}).join('');
  }
  renderBubbleChart(D);
  renderBarChart(D);
}

// ══════════════════════════════════════════════════════
//  BUBBLE CHART – 4 varianty (TODO-060)
//  A) Cluster  B) Drill-down  C) Gradient  D) Treemap
// ══════════════════════════════════════════════════════
let _bv='A', _bl1=null, _bl2=null;

function renderBubbleChart(D) {
  const el=document.getElementById('bubbleChartWrap'); if(!el) return;
  D=D||getData();
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  const cats=expCats.map(c=>{
    const total=getActual(c.id,null,S.curMonth,S.curYear,D);
    const subs=(c.subs||[]).map(sub=>({name:sub,val:getActual(c.id,sub,S.curMonth,S.curYear,D),catId:c.id})).filter(s=>s.val>0);
    return {id:c.id,name:c.name,color:c.color||'#60a5fa',icon:c.icon||'📦',total,subs};
  }).filter(c=>c.total>0).sort((a,b)=>b.total-a.total).slice(0,8);
  if(!cats.length){el.innerHTML='<div class="empty" style="padding:20px"><div class="ei">📊</div><div class="et">Žádné výdaje</div></div>';return;}
  const subCatMap={};
  cats.forEach(c=>c.subs.forEach(s=>{if(!subCatMap[s.name])subCatMap[s.name]=[];subCatMap[s.name].push({catId:c.id,catName:c.name,catColor:c.color,val:s.val});}));
  const sharedSubs=Object.fromEntries(Object.entries(subCatMap).filter(([,a])=>a.length>=2));
  const totalAll=cats.reduce((s,c)=>s+c.total,0);
  const tabs=`<div style="display:flex;gap:3px;margin-bottom:10px;background:var(--surface3);border-radius:10px;padding:3px">
    ${[['A','⬤ Cluster'],['B','◎ Drill'],['C','◑ Gradient'],['D','▦ Treemap']].map(([k,v])=>`<button onclick="bubbleTab('${k}')"
      style="flex:1;padding:5px 0;border:none;border-radius:7px;font-size:.68rem;font-weight:${_bv===k?700:500};cursor:pointer;background:${_bv===k?'var(--surface2)':'transparent'};color:${_bv===k?'var(--text)':'var(--text3)'};transition:all .15s">${v}</button>`).join('')}
  </div>`;
  let body='';
  if(_bv==='A') body=bCluster(cats,totalAll,sharedSubs);
  else if(_bv==='B'){if(!_bl1)body=bL1(cats,totalAll,sharedSubs);else if(!_bl2)body=bL2(cats,totalAll,sharedSubs);else body=bL3(cats,sharedSubs);}
  else if(_bv==='C') body=bGradient(cats,totalAll,sharedSubs);
  else body=bTreemap(cats,totalAll,el.clientWidth||280);
  el.innerHTML=tabs+body;
}
function bubbleTab(v){_bv=v;_bl1=null;_bl2=null;renderBubbleChart(getData());}
function bubbleDrillL2(id){_bl1=id;_bl2=null;renderBubbleChart(getData());}
function bubbleDrillL3(s){_bl2=s;renderBubbleChart(getData());}
function bubbleBack(l){if(l===1){_bl1=null;_bl2=null;}else _bl2=null;renderBubbleChart(getData());}
function bPos(n,cx,cy,r){if(n===1)return[{x:cx,y:cy}];return Array.from({length:n},(_,i)=>({x:Math.round(cx+Math.cos((i/n)*Math.PI*2-Math.PI/2)*r),y:Math.round(cy+Math.sin((i/n)*Math.PI*2-Math.PI/2)*r)}));}

// A) CLUSTER
function bCluster(cats,totalAll,sharedSubs){
  const W=320,H=260,maxV=cats[0].total;
  const mr=cats.length<=3?70:cats.length<=5?80:90;
  const mp=bPos(cats.length,W/2,H/2,mr);
  let svg='';
  cats.forEach((cat,i)=>{
    const cr=Math.max(22,Math.min(44,Math.round(22+(cat.total/maxV)*22)));
    const {x,y}=mp[i];
    const maxSub=Math.max(...cat.subs.map(s=>s.val),1);
    const sp=bPos(cat.subs.length,x,y,cr+18);
    cat.subs.forEach((sub,j)=>{
      const {x:sx,y:sy}=sp[j];
      const sr=Math.max(10,Math.min(18,Math.round(10+(sub.val/maxSub)*8)));
      const sh=!!sharedSubs[sub.name];
      svg+=`<line x1="${x}" y1="${y}" x2="${sx}" y2="${sy}" stroke="${cat.color}33" stroke-width="1"/>
        <circle cx="${sx}" cy="${sy}" r="${sr}" fill="${sh?'#888a9a22':cat.color+'18'}" stroke="${sh?'#888a9a':cat.color+'77'}" stroke-width="1" ${sh?'stroke-dasharray="3,2"':''}/>
        ${sh?`<circle cx="${sx+sr-3}" cy="${sy-sr+3}" r="3" fill="#888a9a" stroke="var(--surface)" stroke-width="1"/>`:''}
        <text x="${sx}" y="${sy+3}" text-anchor="middle" font-size="6" fill="${sh?'#a8adc4':'var(--text3)'}" font-family="Instrument Sans" style="pointer-events:none">${sub.name.slice(0,7)}</text>`;
    });
    svg+=`<circle cx="${x}" cy="${y}" r="${cr}" fill="${cat.color}25" stroke="${cat.color}" stroke-width="1.8"/>
      <text x="${x}" y="${y-5}" text-anchor="middle" font-size="10" fill="${cat.color}" style="pointer-events:none">${cat.icon}</text>
      <text x="${x}" y="${y+6}" text-anchor="middle" font-size="7" font-weight="700" fill="var(--text2)" font-family="Instrument Sans" style="pointer-events:none">${cat.name.slice(0,8)}</text>
      <text x="${x}" y="${y+15}" text-anchor="middle" font-size="6.5" fill="var(--text3)" font-family="Instrument Sans" style="pointer-events:none">${Math.round(cat.total/totalAll*100)}%</text>`;
  });
  const leg=cats.slice(0,5).map(c=>`<span style="display:inline-flex;align-items:center;gap:3px;font-size:.65rem;margin:1px 4px 1px 0"><span style="width:6px;height:6px;border-radius:50%;background:${c.color};display:inline-block"></span>${c.name} <span style="color:var(--text3)">(${c.subs.length})</span></span>`).join('');
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">${svg}</svg><div style="margin-top:4px">${leg}</div>${Object.keys(sharedSubs).length?'<div style="font-size:.65rem;color:var(--text3);margin-top:3px">⬤ šedá tečka = sdílená podkategorie</div>':''}`;
}

// B) DRILL L1
function bL1(cats,totalAll,sharedSubs){
  const W=280,H=240,cx=W/2,cy=H/2,maxV=cats[0].total;
  const pos=bPos(cats.length,cx,cy,cats.length<=3?60:cats.length<=5?72:82);
  let svg='';
  cats.forEach((cat,i)=>{
    const r=Math.max(20,Math.min(46,Math.round(20+(cat.total/maxV)*26)));
    const {x,y}=pos[i];
    const hs=cat.subs.some(s=>sharedSubs[s.name]);
    svg+=`<g style="cursor:pointer" onclick="bubbleDrillL2('${cat.id}')">
      <circle cx="${x}" cy="${y}" r="${r}" fill="${cat.color}20" stroke="${cat.color}" stroke-width="1.5"/>
      ${hs?`<circle cx="${x+r-5}" cy="${y-r+5}" r="4.5" fill="#888a9a" stroke="var(--surface2)" stroke-width="1.5"/>`:''}
      <text x="${x}" y="${y-5}" text-anchor="middle" font-size="11" fill="${cat.color}" style="pointer-events:none">${cat.icon}</text>
      <text x="${x}" y="${y+7}" text-anchor="middle" font-size="7.5" font-weight="600" fill="var(--text2)" font-family="Instrument Sans" style="pointer-events:none">${cat.name.slice(0,9)}</text>
      <text x="${x}" y="${y+18}" text-anchor="middle" font-size="7" fill="var(--text3)" font-family="Instrument Sans" style="pointer-events:none">${Math.round(cat.total/totalAll*100)}%</text>
    </g>`;
  });
  const leg=cats.slice(0,5).map(c=>`<span style="display:inline-flex;align-items:center;gap:3px;font-size:.67rem;margin:2px 4px;cursor:pointer" onclick="bubbleDrillL2('${c.id}')"><span style="width:7px;height:7px;border-radius:50%;background:${c.color};display:inline-block"></span>${c.name}</span>`).join('');
  return `<div style="font-size:.7rem;color:var(--text3);margin-bottom:3px">Klikni na kategorii pro detail</div><svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">${svg}</svg><div style="margin-top:4px">${leg}</div>${Object.keys(sharedSubs).length?'<div style="font-size:.68rem;color:var(--text3);margin-top:4px">⬤ šedá tečka = sdílená podkategorie</div>':''}`;
}

// B) DRILL L2
function bL2(cats,totalAll,sharedSubs){
  const cat=cats.find(c=>c.id===_bl1);if(!cat){_bl1=null;return bL1(cats,totalAll,sharedSubs);}
  const W=280,H=250,cx=W/2,cy=H/2+10,mr=50;
  const sp=cat.subs.length?bPos(cat.subs.length,cx,cy,90):[];
  let svg='';
  cat.subs.forEach((_,i)=>{const {x,y}=sp[i];svg+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${cat.color}44" stroke-width="1" stroke-dasharray="3,3"/>`;});
  svg+=`<circle cx="${cx}" cy="${cy}" r="${mr}" fill="${cat.color}25" stroke="${cat.color}" stroke-width="2"/>
    <text x="${cx}" y="${cy-10}" text-anchor="middle" font-size="14" fill="${cat.color}" style="pointer-events:none">${cat.icon}</text>
    <text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--text)" font-family="Instrument Sans" style="pointer-events:none">${cat.name}</text>
    <text x="${cx}" y="${cy+18}" text-anchor="middle" font-size="8" fill="var(--text3)" font-family="Instrument Sans" style="pointer-events:none">${fmt(cat.total)} Kč</text>`;
  const ms=Math.max(...cat.subs.map(s=>s.val),1);
  cat.subs.forEach((sub,i)=>{
    const {x,y}=sp[i];
    const sr=Math.max(15,Math.min(30,Math.round(15+(sub.val/ms)*15)));
    const sh=!!sharedSubs[sub.name];
    if(sh) svg+=`<g style="cursor:pointer" onclick="bubbleDrillL3('${sub.name.replace(/'/g,"\\'")}')">
      <circle cx="${x}" cy="${y}" r="${sr}" fill="#888a9a15" stroke="#888a9a" stroke-width="1.5" stroke-dasharray="4,3"/>
      <text x="${x}" y="${y-3}" text-anchor="middle" font-size="7" fill="#a8adc4" font-family="Instrument Sans" style="pointer-events:none">🔗 ${sub.name.slice(0,9)}</text>
      <text x="${x}" y="${y+8}" text-anchor="middle" font-size="7" fill="var(--text3)" font-family="Instrument Sans" style="pointer-events:none">${fmt(sub.val)} Kč</text>
    </g>`;
    else svg+=`<g><circle cx="${x}" cy="${y}" r="${sr}" fill="${cat.color}18" stroke="${cat.color}88" stroke-width="1.2"/>
      <text x="${x}" y="${y-3}" text-anchor="middle" font-size="7.5" fill="var(--text2)" font-family="Instrument Sans" style="pointer-events:none">${sub.name.slice(0,10)}</text>
      <text x="${x}" y="${y+8}" text-anchor="middle" font-size="7" fill="var(--text3)" font-family="Instrument Sans" style="pointer-events:none">${fmt(sub.val)} Kč</text>
    </g>`;
  });
  if(!cat.subs.length) svg+=`<text x="${cx}" y="${cy+70}" text-anchor="middle" font-size="8" fill="var(--text3)" font-family="Instrument Sans">Žádné podkategorie</text>`;
  return `<div style="font-size:.7rem;color:var(--text3);display:flex;align-items:center;gap:4px;margin-bottom:4px">
    <span style="cursor:pointer;color:var(--bank)" onclick="bubbleBack(1)">📍 Kategorie</span><span>›</span><strong style="color:${cat.color}">${cat.name}</strong>
  </div><svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">${svg}</svg>${cat.subs.some(s=>sharedSubs[s.name])?'<div style="font-size:.68rem;color:var(--text3);margin-top:4px">🔗 šedá = sdílená, klikni pro překryv</div>':''}`;
}

// B) DRILL L3
function bL3(cats,sharedSubs){
  const sub=_bl2,entries=sharedSubs[sub];
  if(!entries?.length){_bl2=null;return bL2(cats,0,sharedSubs);}
  const W=280,H=230,cy=H/2,n=entries.length;
  const cp=n===1?[{x:W/2,y:cy}]:entries.map((_,i)=>({x:Math.round(W/2+Math.cos((i/n)*Math.PI*2-Math.PI/2)*90),y:Math.round(cy+Math.sin((i/n)*Math.PI*2-Math.PI/2)*70)}));
  let svg='';
  entries.forEach((_,i)=>{const {x,y}=cp[i];svg+=`<line x1="${x}" y1="${y}" x2="${W/2}" y2="${cy}" stroke="#888a9a44" stroke-width="1" stroke-dasharray="4,3"/>`;});
  const tot=entries.reduce((s,e)=>s+e.val,0);
  svg+=`<circle cx="${W/2}" cy="${cy}" r="32" fill="#888a9a12" stroke="#888a9a" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${W/2}" y="${cy-5}" text-anchor="middle" font-size="8" font-weight="700" fill="#a8adc4" font-family="Instrument Sans" style="pointer-events:none">🔗 ${sub.slice(0,12)}</text>
    <text x="${W/2}" y="${cy+8}" text-anchor="middle" font-size="7.5" fill="var(--text3)" font-family="Instrument Sans" style="pointer-events:none">${fmt(tot)} Kč</text>`;
  entries.forEach((e,i)=>{
    const {x,y}=cp[i];const r=Math.max(24,Math.min(40,Math.round(24+(e.val/tot)*16)));
    svg+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${e.catColor}25" stroke="${e.catColor}" stroke-width="1.8"/>
      <text x="${x}" y="${y-5}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${e.catColor}" font-family="Instrument Sans" style="pointer-events:none">${e.catName.slice(0,9)}</text>
      <text x="${x}" y="${y+7}" text-anchor="middle" font-size="7.5" fill="var(--text3)" font-family="Instrument Sans" style="pointer-events:none">${fmt(e.val)} Kč</text>`;
  });
  const det=entries.map(e=>`<div style="display:flex;align-items:center;gap:6px;font-size:.74rem;margin-bottom:3px"><span style="width:8px;height:8px;border-radius:50%;background:${e.catColor};flex-shrink:0;display:inline-block"></span><span style="flex:1">${e.catName}</span><strong>${fmt(e.val)} Kč</strong></div>`).join('');
  return `<div style="font-size:.7rem;color:var(--text3);display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:wrap">
    <span style="cursor:pointer;color:var(--bank)" onclick="bubbleBack(1)">📍 Kategorie</span><span>›</span>
    <span style="cursor:pointer;color:var(--bank)" onclick="bubbleBack(2)">${cats.find(c=>c.id===_bl1)?.name||'Zpět'}</span><span>›</span>
    <strong style="color:#a8adc4">🔗 ${sub}</strong>
  </div><svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">${svg}</svg>
  <div style="margin-top:8px;padding:8px 10px;background:var(--surface3);border-radius:10px">${det}</div>`;
}

// C) GRADIENT
function bGradient(cats,totalAll,sharedSubs){
  const W=280,H=240,cx=W/2,cy=H/2,maxV=cats[0].total;
  const pos=bPos(cats.length,cx,cy,cats.length<=3?60:cats.length<=5?72:82);
  let defs='<defs>',circles='',links='';
  cats.forEach((cat,i)=>{
    const r=Math.max(22,Math.min(48,Math.round(22+(cat.total/maxV)*26)));
    const {x,y}=pos[i];
    const hs=cat.subs.some(s=>sharedSubs[s.name]);
    const gid='g'+cat.id.replace(/\W/g,'');
    defs+=`<radialGradient id="${gid}" cx="38%" cy="35%" r="65%"><stop offset="0%" stop-color="${cat.color}" stop-opacity="0.95"/><stop offset="100%" stop-color="${cat.color}" stop-opacity="0.25"/></radialGradient>`;
    circles+=`<g><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${gid})" ${hs?`stroke="url(#${gid})" stroke-width="2.5" filter="url(#glow)"`:`stroke="${cat.color}66" stroke-width="1.5"`}/>
      ${hs?`<circle cx="${x+r-5}" cy="${y-r+5}" r="4" fill="#888a9a" stroke="var(--surface)" stroke-width="1"/>`:''}
      <text x="${x}" y="${y-4}" text-anchor="middle" font-size="10" fill="#fff" style="pointer-events:none">${cat.icon}</text>
      <text x="${x}" y="${y+8}" text-anchor="middle" font-size="7.5" font-weight="700" fill="rgba(255,255,255,.9)" font-family="Instrument Sans" style="pointer-events:none">${cat.name.slice(0,9)}</text>
      <text x="${x}" y="${y+18}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.65)" font-family="Instrument Sans" style="pointer-events:none">${Math.round(cat.total/totalAll*100)}%</text>
    </g>`;
  });
  defs+=`<filter id="glow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  Object.values(sharedSubs).forEach(entries=>{for(let a=0;a<entries.length;a++)for(let b=a+1;b<entries.length;b++){const i1=cats.findIndex(c=>c.id===entries[a].catId),i2=cats.findIndex(c=>c.id===entries[b].catId);if(i1>=0&&i2>=0)links+=`<line x1="${pos[i1].x}" y1="${pos[i1].y}" x2="${pos[i2].x}" y2="${pos[i2].y}" stroke="rgba(168,173,196,.2)" stroke-width="1" stroke-dasharray="3,4"/>`;}});
  const leg=cats.slice(0,5).map(c=>`<span style="display:inline-flex;align-items:center;gap:3px;font-size:.67rem;margin:2px 4px 2px 0"><span style="width:7px;height:7px;border-radius:50%;background:${c.color};display:inline-block"></span>${c.name}</span>`).join('');
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">${defs}${links}${circles}</svg><div style="margin-top:4px;display:flex;flex-wrap:wrap;align-items:center">${leg}${Object.keys(sharedSubs).length?'<span style="font-size:.67rem;color:var(--text3);margin-left:4px">⬤ šedá = sdílené</span>':''}</div>`;
}

// D) TREEMAP
function bTreemap(cats,totalAll,W){
  W=W||280;const H=200,pad=3;
  function squarify(items,x,y,w,h){
    if(!items.length)return[];
    const rects=[];let rem=[...items];
    while(rem.length){
      const row=[];let rs=0;
      const hz=w>=h,side=hz?h:w;
      for(const item of rem){
        const ti=[...row,item],ts=rs+item.area;
        const mr=Math.max(...ti.map(i=>{const l=ts/side;return Math.max((l*l*i.area)/(ts*ts),(ts*ts)/(l*l*i.area))}));
        if(row.length&&mr>(row.length===1?Infinity:Math.max(...row.map(i=>{const l=rs/side;return Math.max((l*l*i.area)/(rs*rs),(rs*rs)/(l*l*i.area))}))))break;
        row.push(item);rs+=item.area;
      }
      const rl=rs/side;let p=hz?y:x;
      row.forEach(item=>{const sz=item.area/rl;if(hz)rects.push({...item,x,y:p,w:rl,h:sz});else rects.push({...item,x:p,y,w:sz,h:rl});p+=sz;});
      if(hz){x+=rl;w-=rl;}else{y+=rl;h-=rl;}
      rem=rem.filter(i=>!row.includes(i));
    }
    return rects;
  }
  const items=cats.map(c=>({...c,area:(c.total/totalAll)*W*H}));
  const rects=squarify(items,pad,pad,W-pad*2,H-pad*2);
  const cells=rects.map(r=>{
    const rw=r.w-pad,rh=r.h-pad,pct=Math.round(r.total/totalAll*100);
    const cy2=r.y+rh/2;
    const si=rw>30&&rh>25,sn=rw>35&&rh>20,sv=rw>50&&rh>38;
    return `<g><rect x="${r.x}" y="${r.y}" width="${rw}" height="${rh}" rx="5" fill="${r.color}22" stroke="${r.color}" stroke-width="1.2"/>
      ${si?`<text x="${r.x+rw/2}" y="${cy2-(sv?12:sn?6:0)}" text-anchor="middle" font-size="${Math.min(16,rh/3)}" style="pointer-events:none">${r.icon}</text>`:''}
      ${sn?`<text x="${r.x+rw/2}" y="${cy2+(si?6:0)+(sv?-4:0)}" text-anchor="middle" font-size="${Math.min(10,rw/6)}" font-weight="700" fill="var(--text)" font-family="Instrument Sans" style="pointer-events:none">${r.name.slice(0,Math.floor(rw/6))}</text>`:''}
      ${sv?`<text x="${r.x+rw/2}" y="${cy2+(si?18:sn?12:0)}" text-anchor="middle" font-size="${Math.min(9,rw/7)}" fill="${r.color}" font-family="Instrument Sans" style="pointer-events:none">${fmt(r.total)} Kč</text>`:`${!sv&&sn?`<text x="${r.x+rw/2}" y="${cy2+(si?14:8)}" text-anchor="middle" font-size="8" fill="var(--text3)" font-family="Instrument Sans" style="pointer-events:none">${pct}%</text>`:''}`}
    </g>`;
  }).join('');
  const leg=cats.slice(0,5).map(c=>`<span style="display:inline-flex;align-items:center;gap:3px;font-size:.65rem;margin:1px 4px 1px 0"><span style="width:7px;height:7px;border-radius:3px;background:${c.color};display:inline-block"></span>${c.name}</span>`).join('');
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">${cells}</svg><div style="margin-top:4px">${leg}</div>`;
}

function renderBarChart(D){
  const canvas=document.getElementById('barCanvas');if(!canvas)return;
  const W=canvas.parentElement.clientWidth||500;canvas.width=W;canvas.height=130;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,130);
  const data=[];
  for(let i=5;i>=0;i--){let m=S.curMonth-i,y=S.curYear;if(m<0){m+=12;y--;}const txs=getTx(m,y,D);data.push({label:CZ_M[m].slice(0,3),inc:incSum(txs),exp:expSum(txs)});}
  const maxV=Math.max(...data.flatMap(d=>[d.inc,d.exp]),1);
  const pad=10,bw=26,gap=(W-pad*2)/6,mh=100;
  data.forEach((d,i)=>{
    const x=pad+i*gap+gap/2-bw;
    const ih=d.inc/maxV*mh,eh=d.exp/maxV*mh;
    ctx.fillStyle='rgba(74,222,128,.7)';ctx.beginPath();ctx.roundRect(x,mh-ih+10,bw-1,ih,[3,3,0,0]);ctx.fill();
    ctx.fillStyle='rgba(248,113,113,.7)';ctx.beginPath();ctx.roundRect(x+bw,mh-eh+10,bw-1,eh,[3,3,0,0]);ctx.fill();
    ctx.fillStyle='#545870';ctx.font='9px Instrument Sans';ctx.textAlign='center';
    ctx.fillText(d.label,x+bw,125);
  });
}

// ══════════════════════════════════════════════════════
//  SOUHRN
// ══════════════════════════════════════════════════════
function renderSouhrn(){
  const D=getData();
  document.getElementById('suhrnMonth').textContent=`${CZ_M[S.curMonth]} ${S.curYear}`;
  let pm=S.curMonth-1,py=S.curYear;if(pm<0){pm=11;py--;}
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  const totalCur=expCats.reduce((a,cat)=>a+getActual(cat.id,null,S.curMonth,S.curYear,D),0);
  const totalPrev=expCats.reduce((a,cat)=>a+getActual(cat.id,null,pm,py,D),0);
  const el=document.getElementById('suhrnTable');if(!el)return;
  let html=`<table class="stat-table" style="width:100%"><thead><tr><th>Kategorie</th><th>Tento měsíc</th><th>Minulý měsíc</th><th>Změna</th><th>Podíl</th></tr></thead><tbody>`;
  expCats.forEach(cat=>{
    const cur=getActual(cat.id,null,S.curMonth,S.curYear,D);
    const prev=getActual(cat.id,null,pm,py,D);
    if(!cur&&!prev)return;
    const pct=prev>0?Math.round((cur-prev)/prev*100):null;
    const pctCelku=totalCur>0?Math.round(cur/totalCur*100):0;
    html+=`<tr><td><span style="margin-right:5px">${cat.icon}</span>${cat.name}</td><td>${cur?fmt(cur):'–'}</td><td style="color:var(--text3)">${prev?fmt(prev):'–'}</td><td>${pct!==null?`<span class="pct-pill ${pct>5?'pct-up':pct<-5?'pct-dn':'pct-neu'}">${pct>0?'+':''}${pct}%</span>`:'–'}</td><td>${pctCelku}%</td></tr>`;
    (cat.subs||[]).forEach(sub=>{
      const sc=getActual(cat.id,sub,S.curMonth,S.curYear,D);const sp=getActual(cat.id,sub,pm,py,D);
      if(!sc&&!sp)return;
      const spct=sp>0?Math.round((sc-sp)/sp*100):null;
      html+=`<tr style="font-size:.78rem;color:var(--text2)"><td style="padding-left:20px">↳ ${sub}</td><td>${sc?fmt(sc):'–'}</td><td style="color:var(--text3)">${sp?fmt(sp):'–'}</td><td>${spct!==null?`<span class="pct-pill ${spct>5?'pct-up':spct<-5?'pct-dn':'pct-neu'}">${spct>0?'+':''}${spct}%</span>`:'–'}</td><td></td></tr>`;
    });
  });
  html+=`<tr style="font-weight:700;border-top:2px solid var(--border2)"><td>💰 CELKEM VÝDAJE</td><td style="color:var(--expense)">${fmt(totalCur)}</td><td style="color:var(--text3)">${fmt(totalPrev)}</td><td>${totalPrev>0?`<span class="pct-pill ${totalCur>totalPrev?'pct-up':'pct-dn'}">${totalCur>=totalPrev?'+':''}${Math.round((totalCur-totalPrev)/totalPrev*100)}%</span>`:'–'}</td><td>100%</td></tr>`;
  html+=`</tbody></table>`;
  el.innerHTML=html;
  renderSuhrnReport(expCats,totalCur,totalPrev,pm,py,D);
}

function renderSuhrnReport(expCats,totalCur,totalPrev,pm,py,D){
  const rEl=document.getElementById('suhrnReport');if(!rEl)return;
  if(!totalPrev){rEl.innerHTML='';return;}
  const totalDiff=Math.round((totalCur-totalPrev)/totalPrev*100);
  const totalSaved=totalPrev-totalCur;
  const good=[],bad=[],ok=[];
  expCats.forEach(cat=>{
    const cur=getActual(cat.id,null,S.curMonth,S.curYear,D);
    const prev=getActual(cat.id,null,pm,py,D);
    if(!cur&&!prev||!prev)return;
    const pct=Math.round((cur-prev)/prev*100);
    if(pct<-5)good.push({name:cat.name,icon:cat.icon,pct,cur,prev,saved:prev-cur});
    else if(pct>5)bad.push({name:cat.name,icon:cat.icon,pct,cur,prev,over:cur-prev});
    else ok.push({name:cat.name,icon:cat.icon,pct});
  });
  bad.sort((a,b)=>b.over-a.over);good.sort((a,b)=>b.saved-a.saved);
  let html=`<div class="card" style="border-left:4px solid ${totalDiff<=-5?'var(--income)':totalDiff>5?'var(--expense)':'var(--debt)'}">
    <div class="card-header" style="background:${totalDiff<=-5?'var(--income-bg)':totalDiff>5?'var(--expense-bg)':'var(--debt-bg)'}">
      <span class="card-title">${totalDiff<=-5?'✅ Skvělý výsledek!':totalDiff>5?'⚠️ Výdaje vzrostly':'✔️ Výdaje stabilní'} – ${CZ_M[S.curMonth]} ${S.curYear}</span>
      <span style="font-weight:700;color:${totalDiff<=0?'var(--income)':totalDiff<=5?'var(--debt)':'var(--expense)'}">${totalDiff>0?'+':''}${totalDiff}% vs ${CZ_M[pm]}</span>
    </div>
    <div class="card-body">`;
  if(totalDiff<=-5)html+=`<div class="insight-item good"><div class="insight-icon">🎉</div><div class="insight-text">Celkové výdaje klesly o <strong>${Math.abs(totalDiff)}%</strong> – ušetřeno <strong>${fmt(Math.abs(totalSaved))}</strong> oproti ${CZ_M[pm]}.</div></div>`;
  else if(totalDiff<=5)html+=`<div class="insight-item warn"><div class="insight-icon">↔️</div><div class="insight-text"><strong>Výdaje stabilní.</strong> Odchylka ${totalDiff>0?'+':''}${totalDiff}% – v pásmu ±5%.</div></div>`;
  else html+=`<div class="insight-item bad"><div class="insight-icon">📈</div><div class="insight-text"><strong>Výdaje vzrostly o ${totalDiff}%</strong> (+${fmt(totalCur-totalPrev)} oproti ${CZ_M[pm]}).</div></div>`;
  if(good.length){
    html+=`<div style="margin-top:12px;margin-bottom:5px;font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--income)">✅ Co se povedlo (výdaje nižší o &gt;5%)</div>`;
    good.forEach(g=>html+=`<div class="insight-item good"><div class="insight-icon">${g.icon}</div><div class="insight-text"><strong>${g.name}</strong> – výdaje klesly o <strong>${Math.abs(g.pct)}%</strong>, ušetřeno <strong>${fmt(g.saved)}</strong> (${fmt(g.cur)} vs ${fmt(g.prev)})</div></div>`);
  }
  if(bad.length){
    html+=`<div style="margin-top:12px;margin-bottom:5px;font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--expense)">❌ Co se nepovedlo (výdaje vyšší o &gt;5%)</div>`;
    bad.forEach(b=>html+=`<div class="insight-item bad"><div class="insight-icon">${b.icon}</div><div class="insight-text"><strong>${b.name}</strong> – výdaje vzrostly o <strong>+${b.pct}%</strong>, překročení o <strong>${fmt(b.over)}</strong> (${fmt(b.cur)} vs ${fmt(b.prev)})</div></div>`);
  }
  if(ok.length){
    html+=`<div style="margin-top:12px;margin-bottom:5px;font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text3)">✔️ Splnilo očekávání (±5%)</div>`;
    html+=`<div style="display:flex;flex-wrap:wrap;gap:6px">`;
    ok.forEach(o=>html+=`<div style="padding:4px 10px;border-radius:6px;background:var(--surface3);font-size:.78rem;color:var(--text2)">${o.icon} ${o.name} <span style="color:var(--text3)">${o.pct>0?'+':''}${o.pct}%</span></div>`);
    html+=`</div>`;
  }
  html+=`</div></div>`;
  rEl.innerHTML=html;
}

// ══════════════════════════════════════════════════════
//  TRANSAKCE
// ══════════════════════════════════════════════════════
let _txTypeFilter = 'all';
let _txSort = 'date';
let _txSortDir = 'desc';

function setTxTypeFilter(type, btn) {
  _txTypeFilter = type;
  document.querySelectorAll('.tx-filt-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderTx();
}

function setTxSort(col) {
  if(_txSort === col) { _txSortDir = _txSortDir === 'desc' ? 'asc' : 'desc'; }
  else { _txSort = col; _txSortDir = col === 'amt' ? 'desc' : 'asc'; }
  document.querySelectorAll('.tx-sort-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('sort-'+col);
  if(btn) btn.classList.add('active');
  // Update arrows
  ['date','cat','sub','name','project','amt'].forEach(c => {
    const a = document.getElementById('sort-'+c+'-arrow');
    if(a) a.textContent = '';
  });
  const arrow = document.getElementById('sort-'+col+'-arrow');
  if(arrow) arrow.textContent = _txSortDir === 'desc' ? ' ↓' : ' ↑';
  renderTx();
}

function renderTxPage(){
  const D = getData();
  document.getElementById('txMonthLabel').textContent = `${CZ_M[S.curMonth]} ${S.curYear}`;
  const catSel = document.getElementById('txCatFilter');
  if(catSel) {
    catSel.innerHTML = '<option value="">📂 Kategorie: Vše</option>' +
      (D.categories||[]).map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    catSel.onchange = () => {
      const cat = (D.categories||[]).find(c=>c.id===catSel.value);
      const subSel = document.getElementById('txSubFilter');
      if(subSel) subSel.innerHTML = '<option value="">📁 Podkategorie: Vše</option>' +
        (cat?.subs||[]).map(s=>`<option value="${s}">${s}</option>`).join('');
      renderTx();
    };
  }
  const projSel = document.getElementById('txProjectFilter');
  if(projSel) projSel.innerHTML = '<option value="">📋 Projekt: Vše</option>' +
    (D.projects||[]).map(p=>`<option value="${p.id}">📁 ${p.name}</option>`).join('');
  const walletSel = document.getElementById('txWalletFilter');
  if(walletSel) walletSel.innerHTML = '<option value="">👛 Peněženka: Vše</option>' +
    (D.wallets||[]).map(w=>`<option value="${w.id}">${w.icon||'👛'} ${w.name}</option>`).join('');
  const payTypeSel = document.getElementById('txPayTypeFilter');
  if(payTypeSel) payTypeSel.innerHTML = '<option value="">💳 Typ platby: Vše</option>' +
    (D.payTypes||[]).map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  renderTx();
}

function renderTx(){
  const D = getData();
  const el = document.getElementById('txList'); if(!el) return;
  const allMonthTxs = getTx(S.curMonth, S.curYear, D);
  if(typeof detectDuplicates === 'function') {
    _dupMap = detectDuplicates(allMonthTxs);
  }
  renderDupBanner(_dupMap||{});
  const catFilter = document.getElementById('txCatFilter')?.value || '';
  const subFilter = document.getElementById('txSubFilter')?.value || '';
  const projectFilter = document.getElementById('txProjectFilter')?.value || '';
  const walletFilter = document.getElementById('txWalletFilter')?.value || '';
  const payTypeFilter = document.getElementById('txPayTypeFilter')?.value || '';
  const tagFilter = document.getElementById('txTagFilter')?.value.replace(/^#+/,'').trim().toLowerCase() || '';
  const searchFilter = document.getElementById('txSearchFilter')?.value.trim().toLowerCase() || '';

  let txs = getTx(S.curMonth, S.curYear, D);

  // Apply filters
  if(_txTypeFilter === 'income') txs = txs.filter(t => t.type==='income');
  else if(_txTypeFilter === 'expense') txs = txs.filter(t => t.type==='expense');
  else if(_txTypeFilter === 'transfer') txs = txs.filter(t => t.catId==='transfer'||t.category==='transfer');
  if(catFilter) txs = txs.filter(t => (t.catId||t.category)===catFilter);
  if(subFilter) txs = txs.filter(t => t.subcat===subFilter);
  if(projectFilter) txs = txs.filter(t => t.projectId===projectFilter);
  if(walletFilter) txs = txs.filter(t => t.wallet===walletFilter);
  if(payTypeFilter) txs = txs.filter(t => t.payType===payTypeFilter);
  if(tagFilter) txs = txs.filter(t => (t.tags||[]).some(tag => tag.includes(tagFilter)));
  if(searchFilter) txs = txs.filter(t =>
    (t.name||'').toLowerCase().includes(searchFilter) ||
    (t.note||'').toLowerCase().includes(searchFilter)
  );
  if(typeof getDupFilterActive === 'function' && getDupFilterActive()) {
    txs = txs.filter(t => (_dupMap||{})[t.id]?.length > 0);
  }

  // Sort
  txs.sort((a,b) => {
    let va, vb;
    if(_txSort==='date'){ va=a.date; vb=b.date; }
    else if(_txSort==='cat'){ const ca=getCat(a.catId||a.category,D.categories); const cb=getCat(b.catId||b.category,D.categories); va=ca.name; vb=cb.name; }
    else if(_txSort==='sub'){ va=a.subcat||''; vb=b.subcat||''; }
    else if(_txSort==='name'){ va=a.name||''; vb=b.name||''; }
    else if(_txSort==='project'){ va=(D.projects||[]).find(p=>p.id===a.projectId)?.name||''; vb=(D.projects||[]).find(p=>p.id===b.projectId)?.name||''; }
    else if(_txSort==='amt'){ va=a.amount||a.amt||0; vb=b.amount||b.amt||0; }
    else { va=a.date; vb=b.date; }
    if(typeof va === 'number') return _txSortDir==='desc' ? vb-va : va-vb;
    return _txSortDir==='desc' ? vb.localeCompare(va,'cs') : va.localeCompare(vb,'cs');
  });

  // Summary badge
  const totalInc = txs.filter(t=>t.type==='income').reduce((a,t)=>a+(t.amount||t.amt||0),0);
  const totalExp = txs.filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||t.amt||0),0);
  const badge = document.getElementById('txSummaryBadge');
  if(badge) badge.innerHTML = txs.length ?
    `<span style="color:var(--income)">+${fmt(totalInc)} Kč</span> <span style="color:var(--text3)">·</span> <span style="color:var(--expense)">−${fmt(totalExp)} Kč</span> <span style="color:var(--text3)">· ${txs.length} záznamů</span>` : '';

  if(!txs.length){
    el.innerHTML='<div class="empty" style="padding:32px"><div class="ei">📭</div><div class="et">Žádné transakce</div></div>';
    return;
  }

  const ro = viewingUid !== null;
  const CZ_D = ['Ne','Po','Út','St','Čt','Pá','So'];

  // When sorting by date – group by day; otherwise show flat table
  const groupByDate = _txSort === 'date';

  let html = '';

  if(groupByDate) {
    const byDate = {};
    txs.forEach(t => { if(!byDate[t.date]) byDate[t.date]=[]; byDate[t.date].push(t); });
    const dates = Object.keys(byDate).sort((a,b) => _txSortDir==='desc' ? new Date(b)-new Date(a) : new Date(a)-new Date(b));
    dates.forEach(date => {
      const d = new Date(date+'T12:00:00');
      const dayTxs = byDate[date];
      const dayInc = dayTxs.filter(t=>t.type==='income').reduce((a,t)=>a+(t.amount||t.amt||0),0);
      const dayExp = dayTxs.filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||t.amt||0),0);
      const daySaldo = dayInc - dayExp;
      html += `<div class="tx-day-group">${CZ_D[d.getDay()]} ${d.getDate()}. ${CZ_M[d.getMonth()]}
        <span style="color:${daySaldo>=0?'var(--income)':'var(--expense)'};font-size:.76rem">${daySaldo>=0?'+':''}${fmt(daySaldo)} Kč</span>
      </div>`;
      // Split children se zobrazují uvnitř parent řádku – nezobrazuj je samostatně
      dayTxs.filter(t=>!t.splitId||t.splitParent).forEach(t => { html += buildTxRow(t, D, ro, _dupMap||{}); });
    });
  } else {
    txs.filter(t=>!t.splitId||t.splitParent).forEach(t => { html += buildTxRow(t, D, ro, _dupMap||{}); });
  }

  el.innerHTML = html;
}

function buildTxRow(t, D, ro, dupMap={}) {
  const cat = getCat(t.catId||t.category, D.categories);
  const amt = t.amount || t.amt || 0;
  const isTransfer = t.catId==='transfer'||t.category==='transfer';
  const amtColor = isTransfer?'var(--bank)':t.type==='income'?'var(--income)':'var(--expense)';
  const amtSign = isTransfer?'↔':t.type==='income'?'+':'−';
  const project = t.projectId ? (D.projects||[]).find(p=>p.id===t.projectId) : null;
  const customName = t.name && t.name!==cat.name && !t.name.startsWith(cat.name) ? t.name : '';
  const d = new Date(t.date+'T12:00:00');
  const CZ_D = ['Ne','Po','Út','St','Čt','Pá','So'];

  // Split logika
  const isSplitParent = t.splitId && t.splitParent;
  const isSplitChild  = t.splitId && !t.splitParent;
  const splitChildren = isSplitParent ? (D.transactions||[]).filter(x=>x.splitId===t.splitId&&!x.splitParent) : [];
  const rowClass = isSplitParent ? 'tx-table-row split-parent-row' : isSplitChild ? 'tx-table-row split-child-row' : 'tx-table-row';

  // Parent row – zobraz accordion s dětmi
  let childRows = '';
  if(isSplitParent && splitChildren.length) {
    childRows = `<div id="split-children-${t.splitId}" style="display:none">` +
      splitChildren.map(ch => buildTxRow(ch, D, ro)).join('') +
      '</div>';
  }

  // Pokud je child, zobraz zjednodušeně
  if(isSplitChild) {
    return `<div class="${rowClass}" style="opacity:.92">
      <div class="tx-table-cell" style="color:var(--text3);font-size:.7rem;padding-left:8px">└</div>
      <div class="tx-table-cell">
        <div style="display:flex;align-items:center;gap:5px">
          <span style="font-size:.85rem">${cat.icon}</span>
          <span style="font-weight:600;font-size:.78rem">${cat.name}</span>
        </div>
      </div>
      <div class="tx-table-cell tx-col-subcat" style="font-size:.74rem;color:var(--text3)">${t.subcat||'–'}</div>
      <div class="tx-table-cell"><span style="font-size:.78rem;color:var(--text2)">${t.name||''}</span></div>
      <div class="tx-table-cell tx-col-project"></div>
      <div class="tx-table-cell" style="text-align:right;font-weight:700;color:${amtColor};font-size:.82rem">${amtSign}${fmtP(amt)} Kč</div>
      <div class="tx-table-cell" style="display:flex;gap:3px;justify-content:flex-end">
        ${!ro?`<button class="btn btn-danger btn-icon btn-sm" onclick="deleteSplitChild('${t.id}')">✕</button>`:''}
      </div>
    </div>`;
  }

  return `<div class="${rowClass}" ${isSplitParent?`onclick="toggleSplitChildren('${t.splitId}')" style="cursor:pointer"`:''}">
    <div class="tx-table-cell" style="color:var(--text3);font-size:.76rem">
      <div style="font-weight:600;color:var(--text2)">${d.getDate()}. ${CZ_M[d.getMonth()].slice(0,3)}</div>
      <div style="font-size:.68rem">${CZ_D[d.getDay()]}</div>
    </div>
    <div class="tx-table-cell">
      <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
        <span style="font-size:.9rem">${cat.icon}</span>
        <span style="font-weight:600;font-size:.82rem">${cat.name}</span>
        ${typeof buildDupBadge==='function' ? buildDupBadge(t, dupMap) : ''}
      </div>
    </div>
    <div class="tx-table-cell tx-col-subcat" style="color:var(--text3);font-size:.78rem">${t.subcat||'–'}</div>
    <div class="tx-table-cell">
      ${customName?`<div style="font-size:.82rem;color:var(--text2)">${customName}</div>`:''}
      ${t.note?`<div style="font-size:.74rem;color:var(--text3)">📝 ${t.note}</div>`:''}
      ${(t.tags||[]).length?`<div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:2px">${(t.tags).map(tag=>`<span style="background:var(--bank);color:white;padding:1px 5px;border-radius:8px;font-size:.64rem">#${tag}</span>`).join('')}</div>`:''}
      ${!customName&&!t.note&&!(t.tags||[]).length?`<span style="color:var(--text3);font-size:.76rem">–</span>`:''}
      ${typeof buildDupActions==='function' ? buildDupActions(t, dupMap, ro) : ''}
    </div>
    <div class="tx-table-cell tx-col-project">
      ${project?`<span style="font-size:.74rem;background:var(--project-bg);color:var(--project);padding:2px 7px;border-radius:6px;border:1px solid var(--project-border)">📁 ${project.name}</span>`:`<span style="color:var(--text3);font-size:.76rem">–</span>`}
    </div>
    <div class="tx-table-cell" style="text-align:right">
      <div style="font-weight:700;color:${amtColor}">${amtSign}${fmtP(amt)} Kč</div>
      ${isSplitParent?`<span class="split-badge" style="margin-left:0;margin-top:3px;display:inline-block">✂️ SPLIT · ${splitChildren.length}×</span>`:''}
    </div>
    <div class="tx-table-cell" style="display:flex;gap:3px;justify-content:flex-end">
      ${!ro&&!isSplitParent?`<button class="btn btn-ghost btn-icon btn-sm" title="Rozdělit" onclick="event.stopPropagation();openSplitModal('${t.id}')">✂️</button>`:''}
      ${!ro?`<button class="btn btn-edit btn-icon btn-sm" onclick="event.stopPropagation();editTx('${t.id}')">✎</button><button class="btn btn-danger btn-icon btn-sm" onclick="event.stopPropagation();deleteTx('${t.id}')">✕</button>`:''}
    </div>
  </div>
  ${childRows}`;
}
function deleteTx(id){
  if(viewingUid)return;
  if(!confirm('Smazat transakci?'))return;
  S.transactions=S.transactions.filter(t=>t.id!=id);
  save();renderPage();
}
function editTx(id){
  if(viewingUid)return;
  const D=getData();
  const t=(D.transactions||[]).find(x=>x.id==id);if(!t)return;
  document.getElementById('editTxId').value=id;
  document.getElementById('txName').value=t.name||'';
  document.getElementById('txAmt').value=t.amount||t.amt||'';
  document.getElementById('txDate').value=t.date;
  document.getElementById('txNote').value=t.note||'';
  // Tagy
  const tagsEl=document.getElementById('txTags');
  if(tagsEl) { tagsEl.value=(t.tags||[]).map(g=>'#'+g).join(' '); updateTagsPreview(); }
  document.getElementById('modalAddTitle').textContent='Upravit transakci';
  populateTxProjectSelect();
  populateTxTransferWallets();
  if(document.getElementById('txProject'))document.getElementById('txProject').value=t.projectId||'';
  setTxType(t.type==='transfer'?'transfer':t.type);
  selCatId=t.catId||t.category||'';
  selSub=t.subcat||'';
  renderCatPicker();
  document.getElementById('modalAdd').classList.add('open');
}

// ══════════════════════════════════════════════════════
