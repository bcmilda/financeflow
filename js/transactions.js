//  BANK
// ══════════════════════════════════════════════════════
function renderBank(){
  const D=getData();
  const bal=computeBank(D);
  const bc=document.getElementById('bankCard');
  if(bc){
    const s=bankSeries(6,D),last=s[s.length-1]?.saldo||0;
    bc.innerHTML=`<div class="bank-label">Kumulované úspory</div>
      <div class="bank-balance">${fmt(bal)}</div>
      <div class="bank-sub">Automaticky z příjmů a výdajů</div>
      <div style="margin-top:9px;font-size:.8rem;color:rgba(232,244,253,.7)">Saldo ${CZ_M[S.curMonth]}: <strong style="color:${last>=0?'#a7f3d0':'#fca5a5'}">${last>=0?'+':''}${fmt(last)}</strong></div>
      ${!viewingUid?`<div class="bank-ops"><button class="bank-btn" onclick="adjustStartBal()">⚙ Počáteční stav</button></div>`:''}`;
  }
  drawLineChart('bankCanvas',bankSeries(6,D).map(s=>({label:s.label,val:s.balance})),'#60a5fa');
  const hEl=document.getElementById('bankHistory');
  if(hEl){
    const ser=bankSeries(12,D).reverse().filter(s=>s.saldo!==0);
    if(!ser.length){hEl.innerHTML='<div class="empty"><div class="et">Přidej transakce</div></div>';return;}
    hEl.innerHTML=ser.map(s=>`<div class="bhi"><span>${s.saldo>=0?'📈':'📉'}</span><div style="flex:1"><div style="font-size:.85rem;font-weight:500">${CZ_M[s.m]} ${s.y}</div><div style="font-size:.7rem;color:var(--text3)">příjmy − výdaje</div></div><div style="font-weight:600;color:${s.saldo>=0?'var(--income)':'var(--expense)'};font-size:.87rem">${s.saldo>=0?'+':''}${fmt(s.saldo)}</div><div style="color:var(--text2);font-size:.8rem;min-width:75px;text-align:right">${fmt(s.balance)}</div></div>`).join('');
  }
}
function adjustStartBal(){
  if(viewingUid)return;
  const v=prompt('Počáteční stav (Kč):',S.bank?.startBalance||0);
  if(v===null)return;if(!S.bank)S.bank={};S.bank.startBalance=parseFloat(v)||0;save();renderPage();
}

// ══════════════════════════════════════════════════════
//  PREDIKCE
// ══════════════════════════════════════════════════════
function renderPredikce(){
  const D=getData();
  document.getElementById('predMonth').textContent=`${CZ_M[S.curMonth]} ${S.curYear}`;
  document.getElementById('predYear').textContent=S.curYear;
  renderPredTable(S.curYear,D);
  renderPredLineChartSimple(S.curYear,D);
}
function renderPredTable(year,D){
  const el=document.getElementById('predTable');if(!el)return;
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  if(!expCats.length){el.innerHTML='<div class="empty"><div class="et">Nejprve přidej kategorie výdajů</div></div>';return;}
  const months=Array.from({length:12},(_,m)=>({m,y:year}));
  let html=`<div style="overflow-x:auto"><table class="pred-tbl"><thead><tr>
    <th style="position:sticky;left:0;background:var(--surface2);z-index:2;text-align:left">Kategorie</th>
    ${months.map(({m})=>`<th style="${isCur(m,year)?'color:var(--income)':''}">${CZ_M[m].slice(0,3)}</th>`).join('')}
    <th style="border-left:2px solid var(--border);color:var(--debt)">YTD</th>
    <th style="color:#a78bfa" title="Součet skutečných výdajů + predikce zbytku roku">Předpoklad YTD</th>
  </tr></thead><tbody>`;
  expCats.forEach(cat=>{
    let ytd=0;
    const cells=months.map(({m,y})=>{
      const actual=getActual(cat.id,null,m,y,D);
      const pred=predictCat(cat.id,null,m,y,D);
      const past=isPast(m,y),cur=isCur(m,y);
      if(past||cur)ytd+=actual;
      if(cur)return`<td style="background:rgba(74,222,128,.05)"><div class="cell-real">${actual?fmt(actual):'–'}</div>${pred?`<div class="cell-pred">${fmt(pred)}</div>`:''}</td>`;
      if(past)return`<td><div class="cell-real">${actual?fmt(actual):'–'}</div></td>`;
      const globalS=SEASON[m]?.mult||1;
      const personalS=computePersonalSeason(cat.id,null,D);
      const effectiveS=personalS?(personalS[m]*0.8+globalS*0.2):globalS;
      const isSeas=effectiveS>1.08||effectiveS<0.93;
      const seasPct=Math.round((effectiveS-1)*100);
      const trendInfo=detectTrend(cat.id,null,D);
      const trendIcon=trendInfo.trend==='up'?'↑':trendInfo.trend==='down'?'↓':'';
      return`<td>${pred?`<div class="cell-pred">${fmt(pred)}</div>`:'<div style="color:var(--text3)">–</div>'}${isSeas?`<div style="font-size:.64rem;color:var(--debt)">${seasPct>0?'+':''}${seasPct}% sez.</div>`:''}${trendIcon?`<div style="font-size:.64rem;color:${trendInfo.trend==='up'?'var(--expense)':'var(--income)'}">${trendIcon}${Math.abs(trendInfo.pct)}% trend</div>`:''}</td>`;
    });
    const decPred=computeYearForecast(cat.id,null,year,D);
    html+=`<tr><td style="position:sticky;left:0;background:var(--surface);z-index:1;font-weight:600;text-align:left">${cat.icon} ${cat.name}</td>${cells.join('')}<td class="ytd-val" style="border-left:2px solid var(--border)">${ytd?fmt(ytd):'–'}</td><td class="pred-dec">${decPred?fmt(decPred):'–'}</td></tr>`;
    (cat.subs||[]).forEach(sub=>{
      let sytd=0;
      const scells=months.map(({m,y})=>{
        const actual=getActual(cat.id,sub,m,y,D);
        const pred=predictCat(cat.id,sub,m,y,D);
        const past=isPast(m,y),cur=isCur(m,y);
        if(past||cur)sytd+=actual;
        if(cur)return`<td style="background:rgba(74,222,128,.04)"><div style="font-size:.76rem">${actual?fmt(actual):'–'}</div>${pred?`<div class="cell-pred" style="font-size:.68rem">${fmt(pred)}</div>`:''}</td>`;
        if(past)return`<td><div style="font-size:.76rem">${actual?fmt(actual):'–'}</div></td>`;
        return`<td>${pred?`<div style="font-size:.76rem;color:var(--bank)">${fmt(pred)}</div>`:'–'}</td>`;
      });
      html+=`<tr class="sub-row"><td style="position:sticky;left:0;background:var(--surface);z-index:1;text-align:left">↳ ${sub}</td>${scells.join('')}<td style="border-left:2px solid var(--border);font-size:.76rem;color:var(--debt)">${sytd?fmt(sytd):'–'}</td><td style="font-size:.76rem;color:#a78bfa">${computeYearForecast(cat.id,sub,year,D)?fmt(computeYearForecast(cat.id,sub,year,D)):'–'}</td></tr>`;
    });
  });
  const totals=months.map(({m,y})=>({act:expCats.reduce((a,c)=>a+getActual(c.id,null,m,y,D),0),pred:expCats.reduce((a,c)=>{const p=predictCat(c.id,null,m,y,D);return a+(p||0);},0),past:isPast(m,y),cur:isCur(m,y)}));
  const totalYTD=totals.filter(t=>t.past||t.cur).reduce((a,t)=>a+t.act,0);
  html+=`<tr class="total-row"><td style="position:sticky;left:0;background:var(--surface2);z-index:1;text-align:left">CELKEM</td>${totals.map(t=>{
    if(t.cur)return`<td style="background:rgba(74,222,128,.05)"><div class="cell-real">${t.act?fmt(t.act):'–'}</div>${t.pred?`<div class="cell-pred" style="font-size:.71rem">${fmt(t.pred)}</div>`:''}</td>`;
    if(t.past)return`<td><div class="cell-real">${t.act?fmt(t.act):'–'}</div></td>`;
    return`<td><div class="cell-pred">${t.pred?fmt(t.pred):'–'}</div></td>`;
  }).join('')}<td class="ytd-val" style="border-left:2px solid var(--border)">${fmt(totalYTD)}</td><td class="pred-dec">${fmt(expCats.reduce((a,c)=>a+(computeYearForecast(c.id,null,year,D)||0),0))}</td></tr>`;
  html+=`</tbody></table></div>`;
  const bdays=(D.birthdays||[]).filter(b=>b.month-1===S.curMonth);
  if(bdays.length)html+=`<div style="margin-top:10px;padding:9px 12px;background:var(--bday-bg);border-radius:9px;font-size:.78rem;color:var(--bday)">🎂 Narozeniny v ${CZ_M[S.curMonth]}: ${bdays.map(b=>`<strong>${b.name}</strong>`).join(', ')}</div>`;
  el.innerHTML=html;
}
function renderPredLineChartSimple(year,D){
  const canvas=document.getElementById('predLineCanvas');if(!canvas)return;
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  const labels=[],acts=[],preds=[];
  for(let m=0;m<12;m++){
    labels.push(CZ_M[m].slice(0,3));
    const act=getTx(m,year,D).filter(t=>t.type==='expense').reduce((a,t)=>a+t.amt,0);
    const pred=expCats.reduce((a,cat)=>{const p=predictCat(cat.id,null,m,year,D);return a+(p||0);},0);
    acts.push(isPast(m,year)||isCur(m,year)?act||null:null);
    preds.push(pred||null);
  }
  drawSimpleDualLine(canvas,labels,acts,preds);
}
function drawSimpleDualLine(canvas,labels,data1,data2){
  const W=canvas.parentElement.clientWidth||500;canvas.width=W;
  const H=canvas.height||200;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  const allVals=[...data1,...data2].filter(v=>v!=null);
  if(!allVals.length)return;
  const maxV=Math.max(...allVals,1);
  const pad=40,right=20,bottom=24,n=labels.length;
  const W2=W-pad-right,H2=H-bottom-10;
  // Grid
  for(let i=0;i<=4;i++){const y=10+H2*(1-i/4);ctx.strokeStyle='rgba(46,51,71,.5)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-right,y);ctx.stroke();}
  ctx.setLineDash([]);
  // Actual line
  ctx.strokeStyle='#e8eaf2';ctx.lineWidth=2;ctx.beginPath();let first=true;
  data1.forEach((v,i)=>{if(v==null)return;const x=pad+i/(n-1)*W2,y=10+H2*(1-v/maxV);if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);});
  ctx.stroke();
  // Pred line dashed
  ctx.strokeStyle='#60a5fa';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.beginPath();first=true;
  data2.forEach((v,i)=>{if(v==null)return;const x=pad+i/(n-1)*W2,y=10+H2*(1-v/maxV);if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);});
  ctx.stroke();ctx.setLineDash([]);
  // Labels
  ctx.fillStyle='#545870';ctx.font='9px Instrument Sans';ctx.textAlign='center';
  labels.forEach((l,i)=>{const x=pad+i/(n-1)*W2;ctx.fillText(l,x,H-4);});
  // Legend
  ctx.fillStyle='#e8eaf2';ctx.fillRect(W-right-100,12,10,2);ctx.fillStyle='#8b90a8';ctx.font='9px Instrument Sans';ctx.textAlign='left';ctx.fillText('Skutečnost',W-right-86,16);
  ctx.strokeStyle='#60a5fa';ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(W-right-100,26);ctx.lineTo(W-right-90,26);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#8b90a8';ctx.fillText('Predikce',W-right-86,30);
}

// ══════════════════════════════════════════════════════
//  DLUHY
// ══════════════════════════════════════════════════════
function renderDebts(){
  const D=getData(); const ro=viewingUid!==null;
  renderDebtRealityWidget(D);
  renderDebtStressWidget(D);
  renderDebtFreedomWidget(D);
  renderDebtTrapWidget(D);
  const el=document.getElementById('debtCards'); if(!el) return;
  if(!(D.debts||[]).length){ el.innerHTML='<div class="empty"><div class="ei">🎉</div><div class="et">Žádné půjčky!</div></div>'; return; }
  const today = new Date().toISOString().slice(0,10);
  el.innerHTML=(D.debts||[]).map(d=>{
    const pct=Math.round((1-d.remaining/d.total)*100);
    const pc=d.priority==='high'?'#f87171':d.priority==='low'?'#4ade80':'#fbbf24';
    const dt=DEBT_TYPES[d.type]||{label:'💰 Půjčka'};
    const schedule=d.schedule||[];
    const nextPayment=schedule.find(s=>!s.paid);
    const overdueCount=schedule.filter(s=>!s.paid&&s.date<today).length;
    const freq=d.freq||'monthly';
    const freqLabel=freq==='weekly'?'týdně':freq==='biweekly'?'2 týdny':'měsíčně';
    // Grace period warning
    const graceEnd = d.gracePeriod && d.startDate ? new Date(new Date(d.startDate).getTime()+d.gracePeriod*24*60*60*1000).toISOString().slice(0,10) : null;
    const inGrace = graceEnd && today <= graceEnd;
    // Due date warning
    const daysUntilDue = d.dueDate ? Math.ceil((new Date(d.dueDate)-new Date())/(24*60*60*1000)) : null;
    return `<div class="debt-card">
      <div class="debt-top">
        <div>
          <div class="debt-name">${d.name}</div>
          <div class="debt-sub">${dt.label} · ${d.creditor||''} · ${d.interest}% p.a.</div>
        </div>
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
          <span class="badge badge-${d.priority}">${d.priority==='high'?'🔴 Prioritní':d.priority==='low'?'🟢 Nízká':'🟡 Střední'}</span>
          ${!ro?`<button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:3px 8px" onclick="showDebtSchedule('${d.id}')">📋 Kalendář</button>
          <button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:3px 8px" onclick="openDebtSimFor('${d.id}')">🧮 Simulace</button>
          <button class="btn btn-edit btn-icon btn-sm" onclick="editDebt('${d.id}')">✎</button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="deleteDebt('${d.id}')">✕</button>`:''}
        </div>
      </div>
      ${overdueCount>0?`<div class="insight-item bad" style="margin-bottom:8px;padding:6px 10px"><div class="insight-icon">⚠️</div><div class="insight-text"><strong>${overdueCount} nezaplacená splátka!</strong> Hrozí sankce.</div></div>`:''}
      ${inGrace?`<div class="insight-item good" style="margin-bottom:8px;padding:6px 10px"><div class="insight-icon">💡</div><div class="insight-text">Bezúročné období do <strong>${graceEnd}</strong> – splaťte včas!</div></div>`:''}
      ${daysUntilDue!==null&&daysUntilDue<=d.alertDays?`<div class="insight-item ${daysUntilDue<=0?'bad':'warn'}" style="margin-bottom:8px;padding:6px 10px"><div class="insight-icon">⏰</div><div class="insight-text">${daysUntilDue<=0?'Půjčka je <strong>po splatnosti!</strong>':'Splatnost za <strong>'+daysUntilDue+' dní</strong> ('+d.dueDate+')'}</div></div>`:''}
      <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${pc}"></div></div>
      <div class="debt-stats">
        <div class="dst"><div class="dst-val" style="color:${pc}">${fmt(d.remaining)}</div><div class="dst-lbl">Zbývá</div></div>
        <div class="dst"><div class="dst-val">${fmt(d.payment||0)} Kč</div><div class="dst-lbl">${freqLabel}</div></div>
        <div class="dst"><div class="dst-val">${nextPayment?nextPayment.date:'–'}</div><div class="dst-lbl">Příští splátka</div></div>
        <div class="dst"><div class="dst-val">${schedule.length||'?'}</div><div class="dst-lbl">Zbývá splátek</div></div>
      </div>
    </div>`;
  }).join('');
}

function openDebtSimFor(id) {
  openDebtSim();
  setTimeout(()=>{
    const sel = document.getElementById('simDebtId');
    if(sel) { sel.value = id; runDebtSim(); }
  }, 100);
}

function deleteDebt(id){
  if(viewingUid)return;
  if(!confirm('Smazat půjčku?'))return;
  S.debts=S.debts.filter(d=>d.id!==id);
  save();renderPage();
}

// ══════════════════════════════════════════════════════
