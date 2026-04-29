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
  if(curPage==='budouci')renderBudouci();
  if(curPage==='aktiva')renderAssets();
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

// ══ BUBBLE CHART – 4 varianty (TODO-060) ══
let _bv='A', _bl1=null, _bl2=null, _bl2prev=null;

function renderBubbleChart(D) {
  const el=document.getElementById('bubbleChartWrap'); if(!el) return;
  D=D||getData();
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  const cats=expCats.map(c=>{
    const total=getActual(c.id,null,S.curMonth,S.curYear,D);
    const subs=(c.subs||[]).map(sub=>({name:sub,val:getActual(c.id,sub,S.curMonth,S.curYear,D),catId:c.id})).filter(s=>s.val>0);
    return {id:c.id,name:c.name,color:c.color||'#60a5fa',icon:c.icon||'📦',total,subs};
  }).filter(c=>c.total>0).sort((a,b)=>b.total-a.total).slice(0,8);
  if(!cats.length){el.innerHTML='<div class="empty" style="padding:16px"><div class="ei">📊</div><div class="et">Žádné výdaje</div></div>';return;}
  const subMap={};
  cats.forEach(c=>c.subs.forEach(s=>{if(!subMap[s.name])subMap[s.name]=[];subMap[s.name].push({catId:c.id,catName:c.name,catColor:c.color,val:s.val});}));
  const shared=Object.fromEntries(Object.entries(subMap).filter(([,a])=>a.length>=2));
  const totalAll=cats.reduce((s,c)=>s+c.total,0);
  const tabs=`<div style="display:flex;gap:3px;margin-bottom:10px;background:var(--surface3,#1e2335);border-radius:10px;padding:3px">
    ${[['A','⬤ Cluster'],['B','◎ Drill'],['C','◑ Gradient'],['D','▦ Treemap']].map(([k,v])=>`<button onclick="bubbleTab('${k}')" style="flex:1;padding:6px 0;border:none;border-radius:7px;font-size:.68rem;font-weight:${_bv===k?700:500};cursor:pointer;background:${_bv===k?'var(--surface2,#181c27)':'transparent'};color:${_bv===k?'var(--text,#f0f2f8)':'var(--text2,#8b93b0)'};transition:all .15s">${v}</button>`).join('')}
  </div>`;
  const W=Math.max(el.clientWidth||260,200);
  let body='';
  if(_bv==='A')      body=bCluster(cats,totalAll,shared,W);
  else if(_bv==='B') body=!_bl1?bDrillCats(cats,shared,W):!_bl2?bDrillSub(cats,shared,W):bDrillTag(cats,shared,W);
  else if(_bv==='C') body=bGradient(cats,totalAll,shared,W);
  else               body=bTreemap(cats,totalAll);
  el.innerHTML=tabs+body;
}
function bubbleTab(v){_bv=v;_bl1=null;_bl2=null;_bl2prev=null;renderBubbleChart(getData());}
function bubbleDrillL2(id){_bl1=id;_bl2=null;renderBubbleChart(getData());}
function bubbleDrillL3(sub,prevId){_bl2=sub;_bl2prev=prevId;renderBubbleChart(getData());}
function bubbleBack(l){if(l===0){_bl1=null;_bl2=null;}else _bl2=null;renderBubbleChart(getData());}
function bRgba(hex,a){const r=parseInt(hex.slice(1,3),16)||96,g=parseInt(hex.slice(3,5),16)||165,b=parseInt(hex.slice(5,7),16)||250;return `rgba(${r},${g},${b},${a})`;}
function bEsc(s){return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}
// Tooltip pro SVG bubliny – globální div
function bTip(el,txt){
  let t=document.getElementById('_bTip');
  if(!t){t=document.createElement('div');t.id='_bTip';t.style.cssText='position:fixed;background:#1e2335;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:7px 11px;font-size:.75rem;pointer-events:none;z-index:9999;line-height:1.5;color:#f0f2f8;display:none';document.body.appendChild(t);}
  if(!txt){t.style.display='none';return;}
  t.innerHTML=txt;t.style.display='block';
  const r=el.getBoundingClientRect();
  t.style.left=Math.min(r.left+r.width/2,window.innerWidth-160)+'px';
  t.style.top=(r.top-t.offsetHeight-8)+'px';
}

// A) CLUSTER – velké kategorie, kolem nich malé subkategorie
function bCluster(cats,totalAll,shared,W){
  const H=270,maxV=cats[0].total;
  const POS=[{x:.18,y:.28},{x:.52,y:.14},{x:.84,y:.28},{x:.12,y:.72},{x:.5,y:.78},{x:.84,y:.72},{x:.35,y:.52},{x:.67,y:.52}];
  let defs='<defs>';
  cats.forEach((c,i)=>defs+=`<radialGradient id="cg${i}" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="${c.color}" stop-opacity="0.32"/><stop offset="100%" stop-color="${c.color}" stop-opacity="0.07"/></radialGradient>`);
  defs+='</defs>';
  let lines='',circles='';
  cats.forEach((cat,i)=>{
    const p=POS[i]||{x:.5,y:.5};
    const cx=Math.round(p.x*W),cy=Math.round(p.y*H);
    const cr=Math.max(24,Math.min(44,Math.round(24+(cat.total/maxV)*20)));
    const maxSub=Math.max(...cat.subs.map(s=>s.val),1);
    const tipTxt=`<b>${cat.name}</b><br>${fmt(cat.total)} Kč<br><span style='color:#8b93b0'>${Math.round(cat.total/totalAll*100)} % výdajů</span>`;
    cat.subs.forEach((sub,j)=>{
      const sr=Math.max(10,Math.min(16,Math.round(10+(sub.val/maxSub)*6)));
      const a=cat.subs.length===1?-Math.PI/2:((j/cat.subs.length)*Math.PI*2-Math.PI/2);
      const dist=cr+sr+4;
      const sx=Math.round(cx+Math.cos(a)*dist),sy=Math.round(cy+Math.sin(a)*dist);
      const sh=!!shared[sub.name];
      const subTip=`<b>${sub.name}</b><br>${fmt(sub.val)} Kč<br><span style='color:${cat.color}'>${cat.name}</span>${sh?' · 🔗 sdílená':''}`;
      lines+=`<line x1="${Math.round(cx+Math.cos(a)*cr)}" y1="${Math.round(cy+Math.sin(a)*cr)}" x2="${Math.round(sx-Math.cos(a)*sr)}" y2="${Math.round(sy-Math.sin(a)*sr)}" stroke="${cat.color}" stroke-width="1" stroke-dasharray="3 2" opacity=".35"/>`;
      circles+=`<circle cx="${sx}" cy="${sy}" r="${sr}" fill="${bRgba(sh?'#888a9a':cat.color,.15)}" stroke="${sh?'#888a9a':cat.color}" stroke-width="${sh?1.5:1.2}" ${sh?'stroke-dasharray="4,2"':''} style="cursor:default" onmouseenter="bTip(this,'${bEsc(subTip)}')" onmouseleave="bTip(this,'')"/>`;
      if(sh)circles+=`<circle cx="${sx+sr-3}" cy="${sy-sr+3}" r="3" fill="#888a9a" stroke="var(--surface2,#181c27)" stroke-width="1" pointer-events="none"/>`;
      circles+=`<text x="${sx}" y="${sy+3}" text-anchor="middle" font-size="5.5" fill="${sh?'#a8adc4':'rgba(255,255,255,.5)'}" font-family="Instrument Sans,sans-serif" pointer-events="none">${sub.name.slice(0,7)}</text>`;
    });
    circles+=`<circle cx="${cx}" cy="${cy}" r="${cr}" fill="url(#cg${i})" stroke="${cat.color}" stroke-width="2.5" style="cursor:pointer" onclick="bubbleDrillL2('${bEsc(cat.id)}')" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
    circles+=`<text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="${Math.max(8,Math.round(cr*.22))}" font-weight="700" fill="${cat.color}" font-family="Instrument Sans,sans-serif" pointer-events="none">${cat.name.slice(0,9)}</text>`;
    circles+=`<text x="${cx}" y="${cy+9}" text-anchor="middle" font-size="${Math.max(7,Math.round(cr*.19))}" fill="${bRgba(cat.color,.85)}" font-family="Instrument Sans,sans-serif" pointer-events="none">${(cat.total/1000).toFixed(1)}k</text>`;
  });
  const leg=cats.slice(0,6).map(c=>`<span style="display:inline-flex;align-items:center;gap:3px;font-size:.64rem;margin:1px 4px 1px 0"><span style="width:6px;height:6px;border-radius:50%;background:${c.color};flex-shrink:0;display:inline-block"></span>${c.name}</span>`).join('');
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">${defs}${lines}${circles}</svg><div style="margin-top:5px;display:flex;flex-wrap:wrap">${leg}</div>${Object.keys(shared).length?'<div style="font-size:.63rem;color:var(--text2,#8b93b0);margin-top:3px">⬤ šedá tečka = sdílená subkat. · klikni na kat. pro drill-down</div>':''}`;
}

// B) DRILL L1 – přehled kategorií
function bDrillCats(cats,shared,W){
  const H=290,maxV=cats[0].total;
  const POS=[{x:.2,y:.28},{x:.55,y:.18},{x:.83,y:.32},{x:.13,y:.7},{x:.5,y:.75},{x:.82,y:.7},{x:.34,y:.52},{x:.67,y:.52}];
  let html='';
  cats.forEach((cat,i)=>{
    const R=Math.round(28+(cat.total/maxV)*38);
    const px=Math.round((POS[i]||{x:.5,y:.5}).x*W),py=Math.round((POS[i]||{x:.5,y:.5}).y*H);
    const pct=Math.round(cat.total/cats.reduce((s,c)=>s+c.total,0)*100);
    const tipTxt=`<b>${cat.name}</b><br>${fmt(cat.total)} Kč · ${pct} %<br><span style='color:#8b93b0'>Klikni pro podkategorie</span>`;
    html+=`<circle cx="${px}" cy="${py}" r="${R}" fill="${bRgba(cat.color,.15)}" stroke="${cat.color}" stroke-width="2" style="cursor:pointer;transition:fill .15s" onclick="bubbleDrillL2('${bEsc(cat.id)}')" onmouseenter="this.style.fill='${bRgba(cat.color,.3)}';bTip(this,'${bEsc(tipTxt)}')" onmouseleave="this.style.fill='${bRgba(cat.color,.15)}';bTip(this,'')"/>`;
    html+=`<text x="${px}" y="${py-5}" text-anchor="middle" fill="${cat.color}" font-size="${Math.max(9,Math.round(R*.22))}" font-weight="700" font-family="Instrument Sans,sans-serif" pointer-events="none">${cat.name}</text>`;
    html+=`<text x="${px}" y="${py+9}" text-anchor="middle" fill="${bRgba(cat.color,.8)}" font-size="${Math.max(8,Math.round(R*.18))}" font-family="Instrument Sans,sans-serif" pointer-events="none">${(cat.total/1000).toFixed(1)}k</text>`;
  });
  return `<div style="font-size:.7rem;color:var(--text2,#8b93b0);margin-bottom:4px">📍 Přehled kategorií – klikni pro detail</div><svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">${html}</svg>`;
}

// B) DRILL L2 – podkategorie kolem rodiče
function bDrillSub(cats,shared,W){
  const cat=cats.find(c=>c.id===_bl1);if(!cat){_bl1=null;return bDrillCats(cats,shared,W);}
  const H=290,cx=W/2,cy=H/2+10,R=60;
  let html='';
  const n=Math.max(cat.subs.length,1);
  cat.subs.forEach((sub,si)=>{
    const a=(si/n)*Math.PI*2-Math.PI/2;
    const subR=Math.max(20,Math.min(30,Math.round(20+(sub.val/cat.total)*40)));
    const dist=R+subR+10;
    const sx=Math.round(cx+Math.cos(a)*dist),sy=Math.round(cy+Math.sin(a)*dist);
    const isS=!!shared[sub.name];
    const pct=Math.round(sub.val/cat.total*100);
    const tipTxt=`<b>${sub.name}</b><br>${fmt(sub.val)} Kč · ${pct} % kat.<br><span style='color:${cat.color}'>${cat.name}</span>${isS?'<br>🔗 sdílená s více kategoriemi':''}`;
    html+=`<line x1="${Math.round(cx+Math.cos(a)*R)}" y1="${Math.round(cy+Math.sin(a)*R)}" x2="${Math.round(sx-Math.cos(a)*subR*.6)}" y2="${Math.round(sy-Math.sin(a)*subR*.6)}" stroke="${cat.color}" stroke-width="1" stroke-dasharray="3 2" opacity=".4"/>`;
    if(isS){
      html+=`<circle cx="${sx}" cy="${sy}" r="${subR}" fill="${bRgba(cat.color,.2)}" stroke="${cat.color}" stroke-width="2" stroke-dasharray="4 2" style="cursor:pointer" onclick="bubbleDrillL3('${bEsc(sub.name)}','${bEsc(cat.id)}')" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
      html+=`<text x="${sx}" y="${sy-5}" text-anchor="middle" fill="${cat.color}" font-size="8" font-weight="700" font-family="Instrument Sans,sans-serif" pointer-events="none">${sub.name.slice(0,10)}</text>`;
      html+=`<text x="${sx}" y="${sy+6}" text-anchor="middle" fill="${bRgba(cat.color,.7)}" font-size="7" font-family="Instrument Sans,sans-serif" pointer-events="none">🔗 sdílené</text>`;
    } else {
      html+=`<circle cx="${sx}" cy="${sy}" r="${subR}" fill="${bRgba(cat.color,.13)}" stroke="${cat.color}" stroke-width="1.5" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
      html+=`<text x="${sx}" y="${sy}" text-anchor="middle" dominant-baseline="middle" fill="${cat.color}" font-size="8" font-family="Instrument Sans,sans-serif" pointer-events="none">${sub.name.slice(0,10)}</text>`;
    }
  });
  if(!cat.subs.length) html+=`<text x="${cx}" y="${cy+R+20}" text-anchor="middle" fill="rgba(255,255,255,.4)" font-size="9">Žádné podkategorie</text>`;
  html+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${bRgba(cat.color,.18)}" stroke="${cat.color}" stroke-width="2.5"/>`;
  html+=`<text x="${cx}" y="${cy-8}" text-anchor="middle" fill="${cat.color}" font-size="13" font-weight="700" font-family="Instrument Sans,sans-serif" pointer-events="none">${cat.name}</text>`;
  html+=`<text x="${cx}" y="${cy+10}" text-anchor="middle" fill="${bRgba(cat.color,.8)}" font-size="10" font-family="Instrument Sans,sans-serif" pointer-events="none">${fmt(cat.total)} Kč</text>`;
  const hint=cat.subs.some(s=>shared[s.name])?'<div style="font-size:.67rem;color:var(--text2,#8b93b0);margin-top:4px">🔗 přerušovaný okraj = sdílená, klikni pro detail</div>':'';
  return `<div style="font-size:.7rem;color:var(--text2,#8b93b0);margin-bottom:4px">📍 <span style="color:var(--income,#06d6a0);cursor:pointer" onclick="bubbleBack(0)">Kategorie</span> › <strong style="color:${cat.color}">${cat.name}</strong></div><svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">${html}</svg>${hint}`;
}

// B) DRILL L3 – sdílený tag a jeho kategorie
function bDrillTag(cats,shared,W){
  const entries=shared[_bl2];if(!entries?.length){_bl2=null;return bDrillSub(cats,shared,W);}
  const H=270,cx=W/2,cy=H/2,tot=entries.reduce((s,e)=>s+e.val,0);
  const prevCat=cats.find(c=>c.id===_bl2prev);
  let html='';
  entries.forEach((e,ci)=>{
    const a=(ci/entries.length)*Math.PI*2-Math.PI/2,dist=105,R=36;
    const px=Math.round(cx+Math.cos(a)*dist),py=Math.round(cy+Math.sin(a)*dist);
    const tipTxt=`<b>${e.catName}</b><br>${fmt(e.val)} Kč v této kat.<br><span style='color:#8b93b0'>Klikni pro detail kategorie</span>`;
    html+=`<line x1="${Math.round(cx+Math.cos(a)*42)}" y1="${Math.round(cy+Math.sin(a)*42)}" x2="${Math.round(px-Math.cos(a)*R*.7)}" y2="${Math.round(py-Math.sin(a)*R*.7)}" stroke="${e.catColor}" stroke-width="1.5" stroke-dasharray="5 3" opacity=".5"/>`;
    html+=`<circle cx="${px}" cy="${py}" r="${R}" fill="${bRgba(e.catColor,.18)}" stroke="${e.catColor}" stroke-width="2" style="cursor:pointer" onclick="bubbleDrillL2('${bEsc(e.catId)}')" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
    html+=`<text x="${px}" y="${py-5}" text-anchor="middle" fill="${e.catColor}" font-size="10" font-weight="700" font-family="Instrument Sans,sans-serif" pointer-events="none">${e.catName}</text>`;
    html+=`<text x="${px}" y="${py+8}" text-anchor="middle" fill="${bRgba(e.catColor,.7)}" font-size="8" font-family="Instrument Sans,sans-serif" pointer-events="none">${fmt(e.val)} Kč</text>`;
  });
  html+=`<circle cx="${cx}" cy="${cy}" r="40" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.3)" stroke-width="2"/>`;
  html+=`<text x="${cx}" y="${cy-6}" text-anchor="middle" fill="white" font-size="11" font-weight="700" font-family="Instrument Sans,sans-serif" pointer-events="none">🔗 ${_bl2}</text>`;
  html+=`<text x="${cx}" y="${cy+8}" text-anchor="middle" fill="rgba(255,255,255,.7)" font-size="9" font-family="Instrument Sans,sans-serif" pointer-events="none">${fmt(tot)} Kč</text>`;
  return `<div style="font-size:.7rem;color:var(--text2,#8b93b0);margin-bottom:4px;display:flex;gap:3px;flex-wrap:wrap">📍 <span style="color:var(--income,#06d6a0);cursor:pointer" onclick="bubbleBack(0)">Kategorie</span> › <span style="color:var(--income,#06d6a0);cursor:pointer" onclick="bubbleBack(1)">${prevCat?.name||'Zpět'}</span> › <strong style="color:#a8adc4">🔗 ${_bl2}</strong></div><svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">${html}</svg>`;
}

// C) GRADIENT – sdílené tagy s gradientem + osa
function bGradient(cats,totalAll,shared,W){
  const H=310,n=Math.min(cats.length,6);
  // Kategorie v trojúhelníkovém/kruhovém rozložení
  const catPos=cats.slice(0,n).map((cat,i)=>{
    const a=(i/n)*Math.PI*2-Math.PI/2;
    const rx=W*.3,ry=H*.27;
    return {x:Math.round(W/2+Math.cos(a)*rx),y:Math.round(H*0.45+Math.sin(a)*ry),cat};
  });
  const shArr=Object.entries(shared);
  let defs='<defs>';
  cats.slice(0,n).forEach((c,i)=>{
    defs+=`<radialGradient id="gcg${i}" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="${c.color}" stop-opacity="0.28"/><stop offset="100%" stop-color="${c.color}" stop-opacity="0.06"/></radialGradient>`;
  });
  shArr.forEach(([,e],i)=>{
    const c1=e[0].catColor,c2=(e[1]||e[0]).catColor;
    defs+=`<linearGradient id="gsg${i}" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>`;
    defs+=`<radialGradient id="gsgg${i}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${c1}" stop-opacity="0.35"/><stop offset="100%" stop-color="${c2}" stop-opacity="0"/></radialGradient>`;
  });
  defs+=`<linearGradient id="axisG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="rgba(255,255,255,0.05)"/><stop offset="50%" stop-color="rgba(255,255,255,0.2)"/><stop offset="100%" stop-color="rgba(255,255,255,0.05)"/></linearGradient>`;
  defs+=`<filter id="bglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

  // Sdílené bubliny na ose (spodní řada)
  const axisY=H-28;
  const shPos=shArr.map(([name,e],i)=>({
    x:Math.round(W*(0.15+i*(0.7/Math.max(shArr.length-1,1)))),
    y:axisY,name,e,i
  }));

  let html=defs;
  const CR=36;

  // Osa
  if(shPos.length){
    html+=`<line x1="${W*.05}" y1="${axisY}" x2="${W*.95}" y2="${axisY}" stroke="url(#axisG)" stroke-width="6" stroke-linecap="round" opacity=".5"/>`;
    html+=`<line x1="${W*.05}" y1="${axisY}" x2="${W*.95}" y2="${axisY}" stroke="url(#axisG)" stroke-width="1.5" stroke-linecap="round"/>`;
    html+=`<text x="${W/2}" y="${axisY-12}" text-anchor="middle" fill="rgba(255,255,255,.25)" font-size="7" letter-spacing="2" font-family="Instrument Sans,sans-serif">SDÍLENÉ VÝDAJE</text>`;
  }

  // Linky kategorie → sdílená bublina
  shPos.forEach(sp=>{
    sp.e.forEach(en=>{
      const cp=catPos.find(p=>p.cat.id===en.catId);if(!cp)return;
      const dx=cp.x-sp.x,dy=cp.y-sp.y,dist=Math.sqrt(dx*dx+dy*dy)||1;
      const ex=Math.round(sp.x+(dx/dist)*18),ey=Math.round(sp.y+(dy/dist)*18);
      const sx2=Math.round(cp.x-(dx/dist)*CR),sy2=Math.round(cp.y-(dy/dist)*CR);
      html+=`<line x1="${sx2}" y1="${sy2}" x2="${ex}" y2="${ey}" stroke="${en.catColor}" stroke-width="1.5" stroke-dasharray="5 3" opacity=".45"/>`;
      html+=`<circle cx="${ex}" cy="${ey}" r="2.5" fill="${en.catColor}" opacity=".7"/>`;
    });
  });

  // Kategorie bubliny
  catPos.forEach((cp,i)=>{
    const tipTxt=`<b>${cp.cat.name}</b><br>${fmt(cp.cat.total)} Kč<br>${Math.round(cp.cat.total/totalAll*100)} % výdajů`;
    html+=`<circle cx="${cp.x}" cy="${cp.y}" r="${CR}" fill="url(#gcg${i})" stroke="${cp.cat.color}" stroke-width="2.5" style="cursor:default" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
    html+=`<text x="${cp.x}" y="${cp.y-6}" text-anchor="middle" fill="${cp.cat.color}" font-size="11" font-weight="700" font-family="Instrument Sans,sans-serif" pointer-events="none">${cp.cat.name}</text>`;
    html+=`<text x="${cp.x}" y="${cp.y+8}" text-anchor="middle" fill="${bRgba(cp.cat.color,.8)}" font-size="9" font-family="Instrument Sans,sans-serif" pointer-events="none">${(cp.cat.total/1000).toFixed(1)}k</text>`;
  });

  // Sdílené gradient bubliny na ose
  shPos.forEach(sp=>{
    const SR=20;
    const tot=sp.e.reduce((s,e)=>s+e.val,0);
    const tipTxt=`<b>🔗 ${sp.name}</b><br>${fmt(tot)} Kč<br>${sp.e.map(e=>e.catName).join(' + ')}`;
    // Průsečníky osy s bublinou
    html+=`<circle cx="${sp.x-SR}" cy="${sp.y}" r="3" fill="url(#gsg${sp.i})" opacity=".8"/>`;
    html+=`<circle cx="${sp.x+SR}" cy="${sp.y}" r="3" fill="url(#gsg${sp.i})" opacity=".8"/>`;
    html+=`<circle cx="${sp.x}" cy="${sp.y}" r="${SR+10}" fill="url(#gsgg${sp.i})" pointer-events="none"/>`;
    html+=`<circle cx="${sp.x}" cy="${sp.y}" r="${SR}" fill="rgba(255,255,255,.05)" stroke="url(#gsg${sp.i})" stroke-width="2.5" filter="url(#bglow)" style="cursor:pointer" onmouseenter="bTip(this,'${bEsc(tipTxt)}')" onmouseleave="bTip(this,'')"/>`;
    html+=`<circle cx="${sp.x}" cy="${sp.y}" r="${SR*.5}" fill="url(#gsg${sp.i})" opacity=".25" pointer-events="none"/>`;
    html+=`<text x="${sp.x}" y="${sp.y-5}" text-anchor="middle" fill="white" font-size="7.5" font-weight="700" font-family="Instrument Sans,sans-serif" pointer-events="none">${sp.name}</text>`;
    html+=`<text x="${sp.x}" y="${sp.y+6}" text-anchor="middle" fill="rgba(255,255,255,.65)" font-size="7" font-family="Instrument Sans,sans-serif" pointer-events="none">${(tot/1000).toFixed(1)}k</text>`;
  });

  const leg=cats.slice(0,5).map(c=>`<span style="display:inline-flex;align-items:center;gap:3px;font-size:.64rem;margin:1px 4px 1px 0"><span style="width:7px;height:7px;border-radius:50%;background:${c.color};display:inline-block"></span>${c.name}</span>`).join('');
  const shLeg=shArr.slice(0,3).map(([name,e])=>{const c1=e[0].catColor,c2=(e[1]||e[0]).catColor;return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:.64rem;margin:1px 4px 1px 0"><span style="width:14px;height:7px;border-radius:4px;background:linear-gradient(90deg,${c1},${c2});display:inline-block"></span>${name}</span>`;}).join('');
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">${html}</svg><div style="margin-top:5px;display:flex;flex-wrap:wrap">${leg}${shLeg?'<span style="color:rgba(255,255,255,.3);margin:0 4px">|</span>'+shLeg:''}</div>`;
}

// D) TREEMAP – obdélníky, velikost = výdaj
function bTreemap(cats,totalAll){
  const sorted=[...cats].sort((a,b)=>b.total-a.total);
  const cell=(cat,h)=>{
    const pct=Math.round(cat.total/totalAll*100);
    return `<div style="background:${cat.color}1e;border:1px solid ${cat.color}55;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;justify-content:flex-end;cursor:default;min-height:${h}px;overflow:hidden;transition:background .2s,border-color .2s" onmouseenter="this.style.background='${cat.color}35';this.style.borderColor='${cat.color}99'" onmouseleave="this.style.background='${cat.color}1e';this.style.borderColor='${cat.color}55'"><div style="font-size:.7rem;font-weight:600;color:${cat.color}">${cat.name}</div><div style="font-size:.85rem;font-weight:800;color:${cat.color};font-family:Instrument Sans,sans-serif">${fmt(cat.total)}</div><div style="font-size:.65rem;color:${bRgba(cat.color,.6)}">${pct} %</div></div>`;
  };
  const big=sorted.filter(c=>c.total/totalAll>0.12);
  const small=sorted.filter(c=>c.total/totalAll<=0.12);
  const row1=big.map(c=>`<div style="flex:${Math.max(1,Math.round(c.total/totalAll*100))};min-width:60px">${cell(c,75)}</div>`).join('');
  const row2=small.map(c=>`<div style="flex:${Math.max(1,Math.round(c.total/totalAll*100))};min-width:42px">${cell(c,52)}</div>`).join('');
  return `<div style="display:flex;flex-direction:column;gap:4px">${row1?`<div style="display:flex;gap:4px">${row1}</div>`:''}${row2?`<div style="display:flex;gap:4px">${row2}</div>`:''}</div>`;
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
