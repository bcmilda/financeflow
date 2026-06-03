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

  renderPredTable(S.curYear,D);
  renderPredLineChartSimple(S.curYear,D);
}
function renderPredTable(year,D){
  const el=document.getElementById('predTable');if(!el)return;
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  if(!expCats.length){el.innerHTML='<div class="empty"><div class="et">Nejprve přidej kategorie výdajů</div></div>';return;}
  const months=Array.from({length:12},(_,m)=>({m,y:year}));
  // Session 10: viditelná legenda 3 sloupců (dříve jen title tooltip)
  let html=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
    <div style="flex:1;min-width:150px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid var(--debt);border-radius:8px;padding:8px 10px">
      <div style="font-size:.74rem;font-weight:700;color:var(--debt)">YTD</div>
      <div style="font-size:.66rem;color:var(--text3);line-height:1.4">Skutečně utraceno od ledna do teď</div>
    </div>
    <div style="flex:1;min-width:150px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid #a78bfa;border-radius:8px;padding:8px 10px">
      <div style="font-size:.74rem;font-weight:700;color:#a78bfa">Předpoklad YTD</div>
      <div style="font-size:.66rem;color:var(--text3);line-height:1.4">Celý rok = skutečnost + predikce zbytku roku</div>
    </div>
    <div style="flex:1;min-width:150px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid #7c6fcd;border-radius:8px;padding:8px 10px">
      <div style="font-size:.74rem;font-weight:700;color:#7c6fcd">Odhad roku</div>
      <div style="font-size:.66rem;color:var(--text3);line-height:1.4">Čistá predikce všech 12 měsíců (teorie)</div>
    </div>
  </div>`;
  html+=`<div style="overflow-x:auto"><table class="pred-tbl"><thead><tr>
    <th style="position:sticky;left:0;background:var(--surface2);z-index:2;text-align:left">Kategorie</th>
    ${months.map(({m})=>`<th style="${isCur(m,year)?'color:var(--income)':''}">${CZ_M[m].slice(0,3)}</th>`).join('')}
    <th style="border-left:2px solid var(--border);color:var(--debt)">YTD</th>
    <th style="color:#a78bfa" title="Součet skutečných výdajů + predikce zbytku roku">Předpoklad YTD</th>
    <th style="color:#7c6fcd;min-width:90px" title="Čistý odhad: součet predikcí pro všech 12 měsíců">Odhad roku</th>
  </tr></thead><tbody>`;
  expCats.forEach(cat=>{
    let ytd=0;
    const cells=months.map(({m,y})=>{
      const actual=getActual(cat.id,null,m,y,D);
      const pred=predictCat(cat.id,null,m,y,D);
      const past=isPast(m,y),cur=isCur(m,y);
      if(past||cur)ytd+=actual;
      if(cur)return`<td style="background:rgba(74,222,128,.05)"><div class="cell-real">${actual?fmt(actual):'–'}</div>${pred?`<div class="cell-pred">${fmt(pred)}</div>`:''}</td>`;
      if(past){
        const diff = actual && pred ? actual - pred : 0;
        const diffPct = pred && Math.abs(diff/pred)>0.05 ? Math.round(diff/pred*100) : 0;
        const diffEl = diffPct ? `<div style="font-size:.62rem;color:${diff>0?'var(--expense)':'#4ade80'};opacity:.85">${diff>0?'+':''}${fmt(diff)} (${diffPct>0?'+':''}${diffPct}%)</div>` : '';
        const predEl = pred ? `<div class="cell-pred" style="opacity:.55">${fmt(pred)}</div>` : '';
        return`<td><div class="cell-real">${actual?fmt(actual):'–'}</div>${predEl}${diffEl}</td>`;
      }
      const globalS=SEASON[m]?.mult||1;
      const isSeas=globalS>1.08||globalS<0.93;
      const seasPct=Math.round((globalS-1)*100);
      return`<td>${pred?`<div class="cell-pred">${fmt(pred)}</div>`:'<div style="color:var(--text3)">–</div>'}${isSeas?`<div style="font-size:.64rem;color:var(--debt)">${seasPct>0?'+':''}${seasPct}% sez.</div>`:''}</td>`;
    });
    const decPred=computeYearForecast(cat.id,null,year,D);
    const yearEst=Array.from({length:12},(_,mi)=>predictCat(cat.id,null,mi,year,D)||0).reduce((a,b)=>a+b,0);
    html+=`<tr><td style="position:sticky;left:0;background:var(--surface);z-index:1;font-weight:600;text-align:left">${cat.icon} ${cat.name}</td>${cells.join('')}<td class="ytd-val" style="border-left:2px solid var(--border)">${ytd?fmt(ytd):'–'}</td><td class="pred-dec">${decPred?fmt(decPred):'–'}</td><td style="color:#7c6fcd;font-weight:600;border-left:1px solid var(--border)">${yearEst?fmt(yearEst):'–'}</td></tr>`;
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
      const subYearEst=Array.from({length:12},(_,mi)=>predictCat(cat.id,sub,mi,year,D)||0).reduce((a,b)=>a+b,0);
      html+=`<tr class="sub-row"><td style="position:sticky;left:0;background:var(--surface);z-index:1;text-align:left">↳ ${sub}</td>${scells.join('')}<td style="border-left:2px solid var(--border);font-size:.76rem;color:var(--debt)">${sytd?fmt(sytd):'–'}</td><td style="font-size:.76rem;color:#a78bfa">${computeYearForecast(cat.id,sub,year,D)?fmt(computeYearForecast(cat.id,sub,year,D)):'–'}</td><td style="font-size:.76rem;color:#7c6fcd;border-left:1px solid var(--border)">${subYearEst?fmt(subYearEst):'–'}</td></tr>`;
    });
  });
  const totals=months.map(({m,y})=>({act:expCats.reduce((a,c)=>a+getActual(c.id,null,m,y,D),0),pred:expCats.reduce((a,c)=>{const p=predictCat(c.id,null,m,y,D);return a+(p||0);},0),past:isPast(m,y),cur:isCur(m,y)}));
  const totalYTD=totals.filter(t=>t.past||t.cur).reduce((a,t)=>a+t.act,0);
  html+=`<tr class="total-row"><td style="position:sticky;left:0;background:var(--surface2);z-index:1;text-align:left">CELKEM</td>${totals.map(t=>{
    if(t.cur)return`<td style="background:rgba(74,222,128,.05)"><div class="cell-real">${t.act?fmt(t.act):'–'}</div>${t.pred?`<div class="cell-pred" style="font-size:.71rem">${fmt(t.pred)}</div>`:''}</td>`;
    if(t.past)return`<td><div class="cell-real">${t.act?fmt(t.act):'–'}</div></td>`;
    return`<td><div class="cell-pred">${t.pred?fmt(t.pred):'–'}</div></td>`;
  }).join('')}<td class="ytd-val" style="border-left:2px solid var(--border)">${fmt(totalYTD)}</td><td class="pred-dec">${fmt(expCats.reduce((a,c)=>a+(computeYearForecast(c.id,null,year,D)||0),0))}</td><td style="color:#7c6fcd;font-weight:700;border-left:1px solid var(--border)">${fmt(expCats.reduce((a,c)=>a+(Array.from({length:12},(_,mi)=>predictCat(c.id,null,mi,year,D)||0).reduce((x,y)=>x+y,0)),0))}</td></tr>`;
  html+=`</tbody></table></div>`;
  const bdays=(D.birthdays||[]).filter(b=>b.month-1===S.curMonth);
  if(bdays.length)html+=`<div style="margin-top:10px;padding:9px 12px;background:var(--bday-bg);border-radius:9px;font-size:.78rem;color:var(--bday)">🎂 Narozeniny v ${CZ_M[S.curMonth]}: ${bdays.map(b=>`<strong>${b.name}</strong>`).join(', ')}</div>`;
  el.innerHTML=html;
}
function renderPredLineChartSimple(year,D){
  const canvas=document.getElementById('yearPredChart') || document.getElementById('predLineCanvas');
  if(!canvas)return;
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  // Session 10: 3 kumulativní křivky – YTD (skutečnost), Předpoklad (skut+pred), Odhad (čistá predikce)
  const labels=[], ytdCum=[], predpCum=[], odhadCum=[];
  let ytdRun=0, predpRun=0, odhadRun=0, ytdEnded=false;
  for(let m=0;m<12;m++){
    labels.push(CZ_M[m].slice(0,3));
    const act=getTx(m,year,D).filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||t.amt||0),0);
    const pred=expCats.reduce((a,cat)=>{const p=predictCat(cat.id,null,m,year,D);return a+(p||0);},0);
    const isRealMonth = isPast(m,year)||isCur(m,year);
    // YTD: jen skutečnost, končí aktuálním měsícem
    if(isRealMonth){ ytdRun+=act; ytdCum.push(ytdRun); } else { ytdCum.push(null); ytdEnded=true; }
    // Předpoklad: skutečnost pro proběhlé, predikce pro budoucí
    predpRun += isRealMonth ? act : pred; predpCum.push(predpRun);
    // Odhad: čistě predikce všech 12 měsíců
    odhadRun += pred; odhadCum.push(odhadRun);
  }
  drawPredTripleLine(canvas,labels,ytdCum,predpCum,odhadCum);
  // sezónní graf (pokud je jeho záložka)
  if(typeof renderSeasChart==='function') renderSeasChart(year,D);
}

// 3 kumulativní čáry: YTD / Předpoklad / Odhad
function drawPredTripleLine(canvas,labels,ytd,predp,odhad){
  const W=canvas.parentElement.clientWidth||500;canvas.width=W;
  const H=canvas.height||200;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  const allVals=[...ytd,...predp,...odhad].filter(v=>v!=null);
  if(!allVals.length)return;
  const maxV=Math.max(...allVals,1);
  const pad=44,right=16,bottom=24,n=labels.length;
  const W2=W-pad-right,H2=H-bottom-12;
  for(let i=0;i<=4;i++){const y=12+H2*(1-i/4);ctx.strokeStyle='rgba(46,51,71,.5)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-right,y);ctx.stroke();
    ctx.fillStyle='#545870';ctx.font='8px Instrument Sans';ctx.textAlign='right';ctx.fillText(Math.round(maxV*i/4/1000)+'k',pad-4,y+3);}
  ctx.setLineDash([]);
  const drawLine=(data,color,dash,width)=>{
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();let first=true;
    data.forEach((v,i)=>{if(v==null)return;const x=pad+i/(n-1)*W2,y=12+H2*(1-v/maxV);if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);});
    ctx.stroke();ctx.setLineDash([]);
  };
  drawLine(odhad,'#7c6fcd',[2,3],1.5);   // Odhad – tečkovaně fialově
  drawLine(predp,'#a78bfa',[6,4],2);      // Předpoklad – čárkovaně světle fialově
  drawLine(ytd,'#4ade80',[],2.5);         // YTD – plná zelená (skutečnost)
  ctx.fillStyle='#545870';ctx.font='9px Instrument Sans';ctx.textAlign='center';
  labels.forEach((l,i)=>{if(i%2===0){const x=pad+i/(n-1)*W2;ctx.fillText(l,x,H-4);}});
  // Legenda
  const lx=pad+4;
  ctx.textAlign='left';ctx.font='9px Instrument Sans';
  ctx.strokeStyle='#4ade80';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(lx,14);ctx.lineTo(lx+14,14);ctx.stroke();ctx.fillStyle='#8b90a8';ctx.fillText('YTD',lx+18,17);
  ctx.strokeStyle='#a78bfa';ctx.setLineDash([6,4]);ctx.beginPath();ctx.moveTo(lx+58,14);ctx.lineTo(lx+72,14);ctx.stroke();ctx.setLineDash([]);ctx.fillText('Předpoklad',lx+76,17);
  ctx.strokeStyle='#7c6fcd';ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(lx+150,14);ctx.lineTo(lx+164,14);ctx.stroke();ctx.setLineDash([]);ctx.fillText('Odhad',lx+168,17);
}

// Sezonalita: tvoje reálné měsíční výdaje (index) vs pevný model SEASON
function renderSeasChart(year,D){
  const canvas=document.getElementById('seasChart');if(!canvas)return;
  // Reálný měsíční výdaj (průměr přes dostupné roky pro daný měsíc)
  const byMonth=Array(12).fill(0), cnt=Array(12).fill(0);
  (D.transactions||[]).filter(t=>t.type==='expense').forEach(t=>{
    const d=new Date(t.date);byMonth[d.getMonth()]+=(t.amount||t.amt||0);cnt[d.getMonth()]++;
  });
  // průměrný měsíční výdaj jako základ indexu
  const monthsWithData=byMonth.filter((v,i)=>v>0);
  const avgMonth=monthsWithData.length?monthsWithData.reduce((a,b)=>a+b,0)/monthsWithData.length:1;
  const realIdx=byMonth.map(v=>v>0?v/avgMonth:null);
  const modelIdx=Array.from({length:12},(_,m)=>SEASON[m]?.mult||1);
  drawSeasLines(canvas,realIdx,modelIdx);
}
function drawSeasLines(canvas,real,model){
  const W=canvas.parentElement.clientWidth||500;canvas.width=W;
  const H=canvas.height||200;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  const allV=[...real.filter(v=>v!=null),...model];
  const maxV=Math.max(...allV,1.4),minV=Math.min(...allV,0.6);
  const rng=(maxV-minV)||1;
  const pad=36,right=16,bottom=24,n=12;
  const W2=W-pad-right,H2=H-bottom-12;
  const yOf=v=>12+H2*(1-(v-minV)/rng);
  // čára indexu 1.0
  const y1=yOf(1.0);ctx.strokeStyle='rgba(46,51,71,.8)';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(pad,y1);ctx.lineTo(W-right,y1);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#545870';ctx.font='8px Instrument Sans';ctx.textAlign='right';ctx.fillText('1,0×',pad-4,y1+3);
  const months=['Led','Úno','Bře','Dub','Kvě','Čer','Čvc','Srp','Zář','Říj','Lis','Pro'];
  // model (šedá)
  ctx.strokeStyle='#8b90a8';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.beginPath();
  model.forEach((v,i)=>{const x=pad+i/(n-1)*W2,y=yOf(v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.setLineDash([]);
  // reál (modrá), přeskakuje null
  ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.beginPath();let first=true;
  real.forEach((v,i)=>{if(v==null)return;const x=pad+i/(n-1)*W2,y=yOf(v);if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);});ctx.stroke();
  real.forEach((v,i)=>{if(v==null)return;const x=pad+i/(n-1)*W2,y=yOf(v);ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fill();});
  ctx.fillStyle='#545870';ctx.font='9px Instrument Sans';ctx.textAlign='center';
  months.forEach((l,i)=>{if(i%2===0){const x=pad+i/(n-1)*W2;ctx.fillText(l,x,H-4);}});
  // legenda
  ctx.textAlign='left';ctx.font='9px Instrument Sans';
  ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(pad+4,14);ctx.lineTo(pad+18,14);ctx.stroke();ctx.fillStyle='#8b90a8';ctx.fillText('Tvoje reálná sezonalita',pad+22,17);
  ctx.strokeStyle='#8b90a8';ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(pad+150,14);ctx.lineTo(pad+164,14);ctx.stroke();ctx.setLineDash([]);ctx.fillText('Model aplikace',pad+168,17);
}

// Přepínač záložek grafu predikce
function switchPredGraph(tab,btn){
  document.getElementById('predGraph-kumul').style.display = tab==='kumul'?'block':'none';
  document.getElementById('predGraph-seas').style.display = tab==='seas'?'block':'none';
  document.querySelectorAll('#predGraphTab-kumul,#predGraphTab-seas').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  // překreslit aktivní (canvas se musí měřit po zobrazení)
  const D=getData(), year=S.curYear;
  if(tab==='seas' && typeof renderSeasChart==='function') renderSeasChart(year,D);
  else if(typeof renderPredLineChartSimple==='function') renderPredLineChartSimple(year,D);
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
  // Session 10: DTI/DSTI bankovní hodnocení (přesunuto z Měsíčního reportu)
  if(typeof renderDTISection==='function') renderDTISection(D);
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
