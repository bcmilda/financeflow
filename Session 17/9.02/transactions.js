//  FinanceFlow · v9.02 · transactions.js · 2026-07-19
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
// Session 10: skrýt prázdné podkategorie (bez transakce v daném roce)
// FIX (S12.1): stav se pamatuje přes localStorage (přežije reload i přepnutí stránky)
let _hideEmptyPredSubs = (function(){ try{ return localStorage.getItem('ff_predHideEmptySubs')==='1'; }catch(e){ return false; } })();
function togglePredEmptySubs(){
  _hideEmptyPredSubs = !_hideEmptyPredSubs;
  try{ localStorage.setItem('ff_predHideEmptySubs', _hideEmptyPredSubs?'1':'0'); }catch(e){}
  renderPredTable(S.curYear, getData());
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
      <div style="font-size:.68rem;color:var(--text2);line-height:1.4">Skutečně utraceno od ledna do teď</div>
    </div>
    <div style="flex:1;min-width:150px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid #a78bfa;border-radius:8px;padding:8px 10px">
      <div style="font-size:.74rem;font-weight:700;color:#a78bfa">Předpoklad YTD</div>
      <div style="font-size:.68rem;color:var(--text2);line-height:1.4">Celý rok = skutečnost + predikce zbytku roku</div>
    </div>
    <div style="flex:1;min-width:150px;background:var(--surface2);border:1px solid var(--border);border-left:3px solid #7c6fcd;border-radius:8px;padding:8px 10px">
      <div style="font-size:.74rem;font-weight:700;color:#7c6fcd">Odhad roku</div>
      <div style="font-size:.68rem;color:var(--text2);line-height:1.4">Čistá predikce všech 12 měsíců (teorie)</div>
    </div>
  </div>`;
  // Session 10: tlačítko skrýt prázdné podkategorie
  html+=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
    <button class="tx-filt-btn ${_hideEmptyPredSubs?'active':''}" onclick="togglePredEmptySubs()" style="font-size:.74rem">
      ${_hideEmptyPredSubs?'👁️ Zobrazit všechny podkategorie':'🙈 Skrýt prázdné podkategorie'}
    </button>
  </div>`;
  // S12.1r: vysvětlivka barev a popisků (uživatelé nevěděli co znamenají)
  html+=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:.7rem;color:#a8aec8;line-height:1.7">
    <div style="font-weight:700;color:var(--text2);margin-bottom:4px">Jak číst tabulku:</div>
    <span style="color:var(--text)">■ tučné</span> = skutečně utraceno ·
    <span style="color:var(--bank)">■ modré</span> = predikce aplikace (kolik podle historie utratíš) ·
    <span style="color:#4ade80">■ zelené</span> / <span style="color:var(--expense)">■ červené</span> = u minulých měsíců rozdíl skutečnost vs. predikce (zelená = utratil jsi míň, červená = víc) ·
    <span style="color:var(--debt)">„+12% sez."</span> = sezónní přirážka pro daný měsíc (např. prosinec bývá dražší)
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
      // Session 10: přeskoč prázdné podkategorie (bez skutečné transakce v roce)
      if(_hideEmptyPredSubs){
        const hasReal = months.some(({m,y})=>(isPast(m,y)||isCur(m,y)) && getActual(cat.id,sub,m,y,D)>0);
        if(!hasReal) return;
      }
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
    const act=getTx(m,year,D).filter(t=>t.type==='expense').reduce((a,t)=>a+txCZK(t,D),0); // v8.61 (TODO-151)
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
  // S17.3: tracking přesnosti predikce (záložka Přesnost)
  if(typeof renderPredAccuracy==='function') renderPredAccuracy(D);
}

// 3 kumulativní čáry: YTD / Předpoklad / Odhad
function drawPredTripleLine(canvas,labels,ytd,predp,odhad){
  const W=canvas.parentElement.clientWidth||500;canvas.width=W;
  const H=canvas.height||220;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  const allVals=[...ytd,...predp,...odhad].filter(v=>v!=null);
  if(!allVals.length)return;
  const maxV=Math.max(...allVals,1);
  // legenda zabírá horních 26 px, graf začíná pod ní (žádný překryv)
  const legendH=26, pad=46,right=14,bottom=22,n=labels.length;
  const top=legendH+8;
  const W2=W-pad-right,H2=H-bottom-top;
  for(let i=0;i<=4;i++){const y=top+H2*(1-i/4);ctx.strokeStyle='rgba(46,51,71,.5)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-right,y);ctx.stroke();
    ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='right';ctx.fillText(Math.round(maxV*i/4/1000)+'k',pad-4,y+3);}  // S16.11 (T3): bylo #7e84a0/8px = nečitelné
  ctx.setLineDash([]);
  const drawLine=(data,color,dash,width)=>{
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();let first=true;
    data.forEach((v,i)=>{if(v==null)return;const x=pad+i/(n-1)*W2,y=top+H2*(1-v/maxV);if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);});
    ctx.stroke();ctx.setLineDash([]);
  };
  drawLine(odhad,'#7c6fcd',[2,3],1.5);
  drawLine(predp,'#a78bfa',[6,4],2);
  drawLine(ytd,'#4ade80',[],2.5);
  ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='center';  // S16.11 (T3)
  labels.forEach((l,i)=>{if(i%2===0){const x=pad+i/(n-1)*W2;ctx.fillText(l,x,H-4);}});
  // Legenda (horní pruh, mimo plochu grafu)
  ctx.textAlign='left';ctx.font='9px Instrument Sans';
  let lx=pad;
  ctx.strokeStyle='#4ade80';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(lx,12);ctx.lineTo(lx+14,12);ctx.stroke();ctx.fillStyle='#a8aec8';ctx.fillText('YTD',lx+18,15);
  lx+=58;
  ctx.strokeStyle='#a78bfa';ctx.setLineDash([6,4]);ctx.beginPath();ctx.moveTo(lx,12);ctx.lineTo(lx+14,12);ctx.stroke();ctx.setLineDash([]);ctx.fillText('Předpoklad',lx+18,15);
  lx+=92;
  ctx.strokeStyle='#7c6fcd';ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(lx,12);ctx.lineTo(lx+14,12);ctx.stroke();ctx.setLineDash([]);ctx.fillText('Odhad',lx+18,15);

  // S16.11 (FIX-202): tooltip (graf neměl interaktivitu – unikl auditu)
  const base=ctx.getImageData(0,0,W,H);
  canvas.onmousemove=function(e){
    const r=canvas.getBoundingClientRect();
    const mx=(e.clientX-r.left)*(W/r.width);
    ctx.putImageData(base,0,0);
    const i=Math.round((mx-pad)/W2*(n-1));
    if(i<0||i>=n) return;
    const x=pad+i/(n-1)*W2;
    ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+H2);ctx.stroke();
    const rows=[];
    if(ytd[i]!=null) rows.push(['YTD (skutečnost)', fmtB(Math.round(ytd[i])), '#4ade80']);
    if(predp[i]!=null) rows.push(['Předpoklad', fmtB(Math.round(predp[i])), '#a78bfa']);
    if(odhad[i]!=null) rows.push(['Odhad', fmtB(Math.round(odhad[i])), '#9b8ff0']);
    if(!rows.length) return;
    const bw=168, bh=rows.length*14+22;
    const bx=Math.min(Math.max(x+8,pad),W-right-bw), by=top+4;
    ctx.fillStyle='rgba(26,29,46,.95)';ctx.strokeStyle='rgba(255,255,255,.12)';
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,6);ctx.fill();ctx.stroke();
    ctx.font='bold 11px Instrument Sans';ctx.textAlign='left';ctx.fillStyle='#e8eaf2';
    ctx.fillText(labels[i],bx+8,by+15);
    ctx.font='10px Instrument Sans';
    rows.forEach((rw,k)=>{ ctx.fillStyle=rw[2]; ctx.fillText(`${rw[0]}: ${rw[1]}`,bx+8,by+30+k*14); });
  };
  canvas.onmouseleave=function(){ ctx.putImageData(base,0,0); };
  if(typeof attachChartTouch==='function') attachChartTouch(canvas);
}

// Sezonalita: tvoje reálné měsíční výdaje (index) vs pevný model SEASON
function renderSeasChart(year,D){
  const canvas=document.getElementById('seasChart');if(!canvas)return;
  // Reálný měsíční výdaj (průměr přes dostupné roky pro daný měsíc)
  const byMonth=Array(12).fill(0), cnt=Array(12).fill(0);
  (D.transactions||[]).filter(t=>t.type==='expense'&&!t.splitParent).forEach(t=>{
    const d=new Date(t.date);byMonth[d.getMonth()]+=txCZK(t,D);cnt[d.getMonth()]++; // v8.61
  });
  // průměrný měsíční výdaj jako základ indexu
  const monthsWithData=byMonth.filter((v,i)=>v>0);
  const avgMonth=monthsWithData.length?monthsWithData.reduce((a,b)=>a+b,0)/monthsWithData.length:1;
  const realIdx=byMonth.map(v=>v>0?v/avgMonth:null);
  const modelIdx=Array.from({length:12},(_,m)=>SEASON[m]?.mult||1);
  drawSeasLines(canvas,realIdx,modelIdx);
  // S17.3 (TODO-184): tabulka sezónnosti per kategorie pod grafem
  if(typeof renderSeasTable==='function') renderSeasTable(D);
}
function drawSeasLines(canvas,real,model){
  const W=canvas.parentElement.clientWidth||500;canvas.width=W;
  const H=canvas.height||220;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  const allV=[...real.filter(v=>v!=null),...model];
  let maxV=Math.max(...allV,1.4),minV=Math.min(...allV,0.6);
  // zaokrouhli na 10% násobky pro pěknou osu (S12.1r: bylo 5% = moc čar)
  maxV=Math.ceil(maxV/0.10)*0.10; minV=Math.floor(minV/0.10)*0.10;
  const rng=(maxV-minV)||1;
  const legendH=26, pad=46,right=14,bottom=26;
  const top=legendH+8, n=12;
  const W2=W-pad-right,H2=H-bottom-top;
  const yOf=v=>top+H2*(1-(v-minV)/rng);
  // S16.11 (FIX-201, Milan): osa Y měla PEVNÝ krok 10 % → při velkém rozptylu (měsíc s 400 %)
  //   se vykreslily desítky popisků přes sebe = nečitelná šmouha. Nyní ADAPTIVNÍ krok:
  //   vybере se nejmenší „hezký" krok tak, aby popisků bylo max ~7.
  const niceSteps=[0.1,0.2,0.25,0.5,1,2,2.5,5,10];
  let step=niceSteps.find(st=>rng/st<=7) || Math.ceil(rng/7);
  const startV=Math.ceil(minV/step)*step;
  for(let v=startV; v<=maxV+1e-6; v+=step){
    const y=yOf(v);
    const is100 = Math.abs(v-1.0)<1e-6;
    ctx.strokeStyle=is100?'rgba(96,165,250,.4)':'rgba(46,51,71,.5)';ctx.lineWidth=1;ctx.setLineDash(is100?[]:[3,3]);
    ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-right,y);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=is100?'#60a5fa':'#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='right';
    ctx.fillText(Math.round(v*100)+'%',pad-5,y+3);
  }
  // referenční čára 100 % (roční průměr) i když ji krok minul
  if(minV<1 && maxV>1 && Math.abs((1-startV)%step)>1e-6){
    const y1=yOf(1);
    ctx.strokeStyle='rgba(96,165,250,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad,y1);ctx.lineTo(W-right,y1);ctx.stroke();
    ctx.fillStyle='#60a5fa';ctx.font='10px Instrument Sans';ctx.textAlign='right';ctx.fillText('100%',pad-5,y1+3);
  }
  const months=['Led','Úno','Bře','Dub','Kvě','Čer','Čvc','Srp','Zář','Říj','Lis','Pro'];
  // model (ČERVENÁ čárkovaně)
  ctx.strokeStyle='#f87171';ctx.lineWidth=1.8;ctx.setLineDash([5,4]);ctx.beginPath();
  model.forEach((v,i)=>{const x=pad+i/(n-1)*W2,y=yOf(v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.setLineDash([]);
  // reál (MODRÁ plná)
  ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.beginPath();let first=true;
  real.forEach((v,i)=>{if(v==null)return;const x=pad+i/(n-1)*W2,y=yOf(v);if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);});ctx.stroke();
  real.forEach((v,i)=>{if(v==null)return;const x=pad+i/(n-1)*W2,y=yOf(v);ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fill();});
  ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='center';
  months.forEach((l,i)=>{if(i%2===0){const x=pad+i/(n-1)*W2;ctx.fillText(l,x,H-6);}});
  // legenda (horní pruh)
  ctx.textAlign='left';ctx.font='9px Instrument Sans';
  ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(pad,12);ctx.lineTo(pad+14,12);ctx.stroke();ctx.fillStyle='#a8aec8';ctx.fillText('Tvoje reálná',pad+18,15);
  ctx.strokeStyle='#f87171';ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(pad+96,12);ctx.lineTo(pad+110,12);ctx.stroke();ctx.setLineDash([]);ctx.fillText('Model aplikace',pad+114,15);

  // S16.11 (FIX-202): tooltip – graf dřív neměl žádnou interaktivitu (unikl auditu, je mimo charts.js)
  const base=ctx.getImageData(0,0,W,H);
  canvas.onmousemove=function(e){
    const r=canvas.getBoundingClientRect();
    const mx=(e.clientX-r.left)*(W/r.width);
    ctx.putImageData(base,0,0);
    const i=Math.round((mx-pad)/W2*(n-1));
    if(i<0||i>=n) return;
    const x=pad+i/(n-1)*W2;
    ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+H2);ctx.stroke();
    const rv=real[i], mv=model[i];
    const rows=[['Model aplikace', mv!=null?Math.round(mv*100)+' %':'–', '#f87171']];
    if(rv!=null){
      rows.unshift(['Tvoje reálná', Math.round(rv*100)+' %', '#60a5fa']);
      const d=Math.round((rv-mv)*100);
      rows.push([d>=0?'Utrácíš víc':'Utrácíš míň', (d>=0?'+':'')+d+' b. b.', d>=0?'#fbbf24':'#4ade80']);
    }
    const bw=150, bh=rows.length*14+22;
    const bx=Math.min(Math.max(x+8,pad),W-right-bw), by=top+4;
    ctx.fillStyle='rgba(26,29,46,.95)';ctx.strokeStyle='rgba(255,255,255,.12)';
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,6);ctx.fill();ctx.stroke();
    ctx.font='bold 11px Instrument Sans';ctx.textAlign='left';ctx.fillStyle='#e8eaf2';
    ctx.fillText(months[i],bx+8,by+15);
    ctx.font='10px Instrument Sans';
    rows.forEach((rw,k)=>{ ctx.fillStyle=rw[2]; ctx.fillText(`${rw[0]}: ${rw[1]}`,bx+8,by+30+k*14); });
  };
  canvas.onmouseleave=function(){ ctx.putImageData(base,0,0); };
  if(typeof attachChartTouch==='function') attachChartTouch(canvas);
}

// Přepínač záložek grafu predikce
function switchPredGraph(tab,btn){
  document.getElementById('predGraph-kumul').style.display = tab==='kumul'?'block':'none';
  document.getElementById('predGraph-seas').style.display = tab==='seas'?'block':'none';
  const paceEl=document.getElementById('predGraph-pace'); if(paceEl) paceEl.style.display = tab==='pace'?'block':'none';
  const trackEl=document.getElementById('predGraph-track'); if(trackEl) trackEl.style.display = tab==='track'?'block':'none';  // S17.3
  document.querySelectorAll('#predGraphTab-kumul,#predGraphTab-seas,#predGraphTab-pace,#predGraphTab-track').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  // překreslit aktivní (canvas se musí měřit po zobrazení)
  const D=getData(), year=S.curYear;
  if(tab==='seas' && typeof renderSeasChart==='function') renderSeasChart(year,D);
  else if(tab==='pace' && typeof renderPaceChart==='function') renderPaceChart(D);
  else if(tab==='track' && typeof renderPredAccuracy==='function') renderPredAccuracy(D);  // S17.3
  else if(typeof renderPredLineChartSimple==='function') renderPredLineChartSimple(year,D);
}

// ══════════════════════════════════════════════════════
//  S17.3 (TODO-184, Milan): TABULKA SEZÓNNOSTI per kategorie
//  Jako Milanův Excel: Ø výdaj kategorie v každém kalendářním měsíci (přes všechny roky
//  s daty), NEJLEVNĚJŠÍ měsíc = základ (min), buňka = o kolik % je měsíc NAD minimem.
//  Heatmap: zelená ≈ minimum → červená = 2× minimum a víc (sezóna / nadměrné utrácení).
// ══════════════════════════════════════════════════════
function renderSeasTable(D){
  const el=document.getElementById('seasTable'); if(!el) return;
  D=D||getData();
  const cats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  const M=['Led','Úno','Bře','Dub','Kvě','Čer','Čvc','Srp','Zář','Říj','Lis','Pro'];
  const rows=[];
  cats.forEach(c=>{
    const sums=Array(12).fill(0); const years=Array.from({length:12},()=>new Set());
    (D.transactions||[]).forEach(t=>{
      if(t.type!=='expense'||t.isBalancing||t.splitParent) return;
      if(typeof isTransferTx==='function'&&isTransferTx(t)) return;
      if(t.catId!==c.id) return;
      const d=new Date(t.date); sums[d.getMonth()]+=txCZK(t,D); years[d.getMonth()].add(d.getFullYear());
    });
    const avg=sums.map((s,i)=>years[i].size?s/years[i].size:null);
    const withData=avg.filter(v=>v!=null&&v>0);
    if(withData.length<3) return;  // méně než 3 měsíce dat → jen šum
    const min=Math.min(...withData);
    rows.push({icon:c.icon,name:c.name,avg,min,total:withData.reduce((a,b)=>a+b,0)});
  });
  if(!rows.length){ el.innerHTML=''; return; }
  rows.sort((a,b)=>b.total-a.total);
  const cellCol=p=>{
    if(p<=5)   return 'rgba(74,222,128,.30)';
    if(p<=25)  return 'rgba(163,230,53,.24)';
    if(p<=50)  return 'rgba(251,191,36,.24)';
    if(p<=100) return 'rgba(251,146,60,.28)';
    return 'rgba(248,113,113,.34)';
  };
  let h=`<div style="margin-top:16px;font-size:.78rem;font-weight:700;color:#dfe3f0">📅 Sezónnost po kategoriích <span style="font-weight:400;color:#a8aec8">(% nad tvým nejlevnějším měsícem)</span></div>
  <div style="overflow-x:auto;margin-top:8px"><table class="stat-table" style="width:100%;min-width:780px;border-collapse:collapse;font-size:.73rem;text-align:center">
    <thead><tr><th style="text-align:left;position:sticky;left:0;background:var(--surface2);z-index:1">Kategorie</th>${M.map(m=>`<th>${m}</th>`).join('')}<th title="Nejnižší Ø měsíční výdaj = základ 0 %">min (Kč)</th></tr></thead><tbody>`;
  rows.forEach(r=>{
    h+=`<tr><td style="text-align:left;white-space:nowrap;position:sticky;left:0;background:var(--surface2);z-index:1">${r.icon} ${r.name}</td>`;
    r.avg.forEach(v=>{
      if(v==null||v<=0){ h+=`<td style="color:#5a6078">–</td>`; return; }
      const p=Math.round((v-r.min)/r.min*100);
      h+=`<td style="background:${cellCol(p)};color:#e8eaf2;font-weight:600" title="Ø ${fmt(Math.round(v))} Kč">${p===0?'0':'+'+p}%</td>`;
    });
    h+=`<td style="color:#a8aec8;white-space:nowrap">${fmt(Math.round(r.min))}</td></tr>`;
  });
  h+=`</tbody></table></div>
  <div style="font-size:.7rem;color:#a8aec8;margin-top:6px;line-height:1.5">Buňka = o kolik % je Ø výdaj daného měsíce <strong>nad tvým minimem</strong> (nejlevnější měsíc kategorie). Zelená ≈ minimum, oranžová/červená = výrazně dražší měsíc – sezóna, nebo nadměrné utrácení. Průměr přes všechny roky s daty; najetím myší zobrazíš částku. Plnou vypovídací hodnotu má tabulka po celém odžitém roce.</div>`;
  el.innerHTML=h;
}

// ══════════════════════════════════════════════════════
//  S17.3 (TODO-186, Milan): PŘESNOST – tracking predikce vs skutečnost po měsících.
//  Zdroj: snímky S.diary (Deník). Snímek se tvoří AUTOMATICKY při vstupu do nového
//  měsíce (denikAutoSnapshot v projects.js) nebo ručně 🖋 v Deníku (admin). Uzavřené
//  měsíce se vyhodnotí, běžící měsíc jen průběžně. Vidíš: stav na začátku → výsledek.
// ══════════════════════════════════════════════════════
function renderPredAccuracy(D){
  const el=document.getElementById('predAccuracy'); if(!el) return;
  D=D||getData();
  const diary=S.diary||{};
  const keys=Object.keys(diary).sort();
  if(!keys.length){
    el.innerHTML=`<div class="empty" style="padding:18px"><div class="et">📸 Zatím žádný snímek predikce</div><div style="font-size:.74rem;color:#a8aec8;margin-top:6px;line-height:1.5">Snímek se vytvoří automaticky na začátku každého měsíce: zafixuje, co model předpověděl. Na konci měsíce tu pak uvidíš srovnání se skutečností – měsíc po měsíci.</div></div>`;
    return;
  }
  const now=new Date();
  const curKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const devBadge=d=>{
    const a=Math.abs(d);
    const col=a<=10?'var(--income)':a<=25?'var(--debt)':'var(--expense)';
    const bg=a<=10?'var(--income-bg)':a<=25?'var(--debt-bg)':'var(--expense-bg)';
    return `<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:${bg};color:${col};font-weight:800">${d>0?'+':''}${d} %</span>`;
  };
  let rowsH='', errs=[];
  keys.slice(-12).forEach(k=>{
    const s=diary[k]; if(!s) return;
    const [y,mm]=k.split('-').map(Number); const mi=mm-1;
    const txs=getTx(mi,y,D);
    const actExp=Math.round(expSum(txs,D));
    const actInc=Math.round(incSum(txs,D));
    const running = k===curKey;
    const closed = !running && (y<now.getFullYear() || (y===now.getFullYear() && mi<now.getMonth()));
    const dev = s.predExp>0 ? Math.round((actExp-s.predExp)/s.predExp*100) : null;
    if(closed && dev!==null) errs.push(Math.abs(dev));
    rowsH+=`<tr${running?' style="opacity:.75"':''}>
      <td style="text-align:left;white-space:nowrap">${CZ_M[mi]} ${y} ${s.auto?'<span title="automatický snímek" style="font-size:.62rem;color:#a8aec8">auto</span>':''}</td>
      <td style="color:#a8aec8">${fmt(s.predExp)}</td>
      <td style="color:var(--expense);font-weight:700">${actExp?fmt(actExp):'–'}</td>
      <td>${dev!==null?devBadge(dev):'–'}</td>
      <td style="color:#a8aec8">${fmt(s.predInc)}</td>
      <td style="color:var(--income)">${actInc?fmt(actInc):'–'}</td>
      <td style="font-size:.68rem;color:${running?'var(--debt)':'#a8aec8'}">${running?'⏳ probíhá':'✅ uzavřeno'}</td>
    </tr>`;
  });
  const mape = errs.length ? Math.round(errs.reduce((a,b)=>a+b,0)/errs.length) : null;
  let h='';
  if(mape!==null){
    const mCol=mape<=10?'var(--income)':mape<=25?'var(--debt)':'var(--expense)';
    h+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface3);border-radius:10px;margin-bottom:12px">
      <span style="font-size:1.3rem">🎯</span>
      <div><div style="font-size:.72rem;color:#a8aec8">Ø odchylka predikce výdajů (uzavřené měsíce: ${errs.length})</div>
      <div style="font-family:Syne;font-size:1.15rem;font-weight:800;color:${mCol}">±${mape} %</div></div>
    </div>`;
  }
  h+=`<div style="overflow-x:auto"><table class="stat-table" style="width:100%;min-width:640px;font-size:.75rem;text-align:center">
    <thead><tr><th style="text-align:left">Měsíc</th><th>🔮 Výdaje predikce</th><th>Výdaje skutečnost</th><th>Odchylka</th><th>🔮 Příjem predikce</th><th>Příjem skutečnost</th><th>Stav</th></tr></thead>
    <tbody>${rowsH}</tbody></table></div>
  <div style="font-size:.7rem;color:#a8aec8;margin-top:8px;line-height:1.5">Snímek predikce se ukládá na začátku měsíce (vidíš stav „na startu"), skutečnost se dopíše průběžně. <strong>Odchylka</strong> = o kolik % se skutečné výdaje lišily od predikce (zelená ±10 %, žlutá ±25 %, červená víc). Ø odchylka časem ukáže, jak dobře tě model zná.</div>`;
  el.innerHTML=h;
}

// Spending Pace – aktuální měsíc vs historický průměr kumulativních výdajů ke dni
function renderPaceChart(D){
  const canvas=document.getElementById('paceChart'); if(!canvas) return;
  const today=new Date();
  const cm=S.curMonth, cy=S.curYear;
  const daysInMonth=new Date(cy, cm+1, 0).getDate();
  // aktuální měsíc: kumulativní výdaje po dnech
  const curDaily=Array(32).fill(0);
  getTx(cm,cy,D).filter(t=>t.type==='expense'&&!t.isBalancing).forEach(t=>{const d=new Date(t.date).getDate();curDaily[d]+=Math.abs(txCZK(t,D));}); // v8.61
  const curCum=[0]; for(let d=1;d<=31;d++) curCum[d]=curCum[d-1]+curDaily[d];
  const todayDay=(cm===today.getMonth()&&cy===today.getFullYear())?today.getDate():daysInMonth;
  // historie: posledních 6 měsíců (mimo aktuální) – průměr kumulativní útraty ke každému dni
  const histCumByDay=Array(32).fill(0); let histMonthsCount=0;
  for(let k=1;k<=6;k++){
    let m=cm-k,y=cy; while(m<0){m+=12;y--;}
    const md=Array(32).fill(0); let any=false;
    getTx(m,y,D).filter(t=>t.type==='expense'&&!t.isBalancing).forEach(t=>{const d=new Date(t.date).getDate();md[d]+=Math.abs(txCZK(t,D));any=true;}); // v8.61
    if(!any) continue;
    histMonthsCount++;
    let c=0; for(let d=1;d<=31;d++){c+=md[d];histCumByDay[d]+=c;}
  }
  const histAvg=[0]; for(let d=1;d<=31;d++) histAvg[d]= histMonthsCount>0 ? histCumByDay[d]/histMonthsCount : 0;
  drawPaceChart(canvas, daysInMonth, todayDay, curCum, histAvg, histMonthsCount);
}
function drawPaceChart(canvas, days, todayDay, curCum, histAvg, histMonthsCount){
  const W=canvas.parentElement.clientWidth||500; canvas.width=W;
  const H=canvas.height||220; const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,W,H);
  if(histMonthsCount===0){
    ctx.fillStyle='#a8aec8';ctx.font='12px Instrument Sans';ctx.textAlign='center';
    ctx.fillText('Zatím málo dat – potřebuju aspoň 1 uplynulý měsíc výdajů.',W/2,H/2);
    return;
  }
  const pad=52,right=16,top=30,bottom=44;
  const W2=W-pad-right,H2=H-top-bottom;
  const maxV=Math.max(curCum[todayDay]||0,...histAvg,1)*1.08;
  const xOf=d=>pad+(d-1)/(days-1)*W2;
  const yOf=v=>top+H2*(1-v/maxV);
  // mřížka + osa Y
  for(let i=0;i<=4;i++){const y=top+H2*(1-i/4);ctx.strokeStyle='rgba(46,51,71,.5)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-right,y);ctx.stroke();
    ctx.fillStyle='#a8aec8';ctx.font='9px Instrument Sans';ctx.textAlign='right';ctx.fillText(fmt(Math.round(czkToBase(maxV*i/4))),pad-5,y+3);}
  ctx.setLineDash([]);
  ctx.save();ctx.translate(13,top+H2/2);ctx.rotate(-Math.PI/2);ctx.fillStyle='#a8aec8';ctx.font='9px Instrument Sans';ctx.textAlign='center';ctx.fillText(curSym()+' (kumulativně)',0,0);ctx.restore();
  // šedá historie (průměr)
  ctx.strokeStyle='#9aa0bc';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();
  for(let d=1;d<=days;d++){const x=xOf(d),y=yOf(histAvg[d]);d===1?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.stroke();ctx.setLineDash([]);
  // modrá aktuální (do dneška)
  ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.beginPath();
  for(let d=1;d<=todayDay;d++){const x=xOf(d),y=yOf(curCum[d]);d===1?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.stroke();
  ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(xOf(todayDay),yOf(curCum[todayDay]),4,0,7);ctx.fill();
  // osa X
  ctx.fillStyle='#a8aec8';ctx.font='9px Instrument Sans';ctx.textAlign='center';
  for(let d=1;d<=days;d+=5){ctx.fillText(d,xOf(d),top+H2+14);}
  ctx.fillStyle='#a8aec8';ctx.fillText('den v měsíci',pad+W2/2,top+H2+26);
  // legenda (horní pruh – sám nahoře, verdikt je dole → žádný překryv)
  ctx.textAlign='left';ctx.font='9px Instrument Sans';
  ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(pad,14);ctx.lineTo(pad+14,14);ctx.stroke();ctx.fillStyle='#cdd2e8';ctx.fillText('Tento měsíc',pad+18,17);
  ctx.strokeStyle='#9aa0bc';ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(pad+100,14);ctx.lineTo(pad+114,14);ctx.stroke();ctx.setLineDash([]);ctx.fillText(`Průměr (${histMonthsCount} měs.)`,pad+118,17);
  // S12.1r: verdikt PŘESUNUT POD graf (dřív top-12 přes legendu → překryv)
  const cur=curCum[todayDay]||0, exp=histAvg[todayDay]||0;
  if(exp>0){
    const diff=Math.round((cur/exp-1)*100);
    const txt = diff>10?`📈 Utrácíš o ${diff}% rychleji než obvykle`:diff<-10?`📉 Utrácíš o ${Math.abs(diff)}% pomaleji – šetříš`:`✅ Utrácíš zhruba jako obvykle`;
    const col = diff>10?'#f87171':diff<-10?'#4ade80':'#a8aec8';
    ctx.fillStyle=col;ctx.font='bold 10px Instrument Sans';ctx.textAlign='center';ctx.fillText(txt,pad+W2/2,H-2);
  }

  // S16.11 (FIX-202): tooltip (graf neměl interaktivitu – unikl auditu)
  const base=ctx.getImageData(0,0,W,H);
  canvas.onmousemove=function(e){
    const r=canvas.getBoundingClientRect();
    const mx=(e.clientX-r.left)*(W/r.width);
    ctx.putImageData(base,0,0);
    const d=Math.round((mx-pad)/W2*(days-1))+1;
    if(d<1||d>days) return;
    const x=pad+(d-1)/(days-1)*W2;
    ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+H2);ctx.stroke();
    const rows=[];
    if(d<=todayDay && curCum[d]!=null) rows.push(['Tento měsíc', fmtB(Math.round(curCum[d])), '#60a5fa']);
    if(histAvg[d]!=null) rows.push([`Průměr (${histMonthsCount} měs.)`, fmtB(Math.round(histAvg[d])), '#9aa0bc']);
    if(d<=todayDay && histAvg[d]>0 && curCum[d]!=null){
      const df=Math.round((curCum[d]/histAvg[d]-1)*100);
      rows.push([df>=0?'Rychleji než obvykle':'Pomaleji než obvykle', (df>=0?'+':'')+df+' %', df>10?'#f87171':df<-10?'#4ade80':'#a8aec8']);
    }
    if(!rows.length) return;
    const bw=178, bh=rows.length*14+22;
    const bx=Math.min(Math.max(x+8,pad),W-right-bw), by=top+4;
    ctx.fillStyle='rgba(26,29,46,.95)';ctx.strokeStyle='rgba(255,255,255,.12)';
    ctx.beginPath();ctx.roundRect(bx,by,bw,bh,6);ctx.fill();ctx.stroke();
    ctx.font='bold 11px Instrument Sans';ctx.textAlign='left';ctx.fillStyle='#e8eaf2';
    ctx.fillText(`${d}. den${d===todayDay?' (dnes)':''}`,bx+8,by+15);
    ctx.font='10px Instrument Sans';
    rows.forEach((rw,k)=>{ ctx.fillStyle=rw[2]; ctx.fillText(`${rw[0]}: ${rw[1]}`,bx+8,by+30+k*14); });
  };
  canvas.onmouseleave=function(){ ctx.putImageData(base,0,0); };
  if(typeof attachChartTouch==='function') attachChartTouch(canvas);
}

// ══════════════════════════════════════════════════════
//  DLUHY
// ══════════════════════════════════════════════════════
// S14 (f2): rozbalená tabulka splátek na kartě půjčky
const _debtTxExpanded = {};
function toggleDebtTxTable(id){ _debtTxExpanded[id]=!_debtTxExpanded[id]; renderDebts(); }

// f2: tabulka „plánováno vs zaplaceno" s ✓/✗ a odkazem na reálné transakce (editTx)
function renderDebtTxTable(d, paid, D){
  D = D || getData();
  const sched = d.schedule||[];
  const txs = paid.txs||[];
  const today = new Date().toISOString().slice(0,10);
  const GRID = 'grid-template-columns:104px 1fr 1fr 46px';
  const header = `<div class="debt-schedule-row header" style="${GRID}"><span>Splátka</span><span style="text-align:right">Plánováno</span><span style="text-align:right">Zaplaceno</span><span style="text-align:center">Stav</span></div>`;
  const actCell = (tx)=> tx
    ? `<span onclick="editTx('${tx.id}')" style="cursor:pointer;color:var(--income);text-decoration:underline;text-decoration-style:dotted" title="Otevřít transakci">${fmtB(tx.amount||tx.amt||0)}</span>`
    : '<span style="color:var(--text3)">–</span>';
  let rows='';
  if(sched.length){
    // splátka[i] ↔ skutečná platba[i] (po pořadí); zobraz zaplacené + pár dalších
    const showN = Math.min(sched.length, Math.max(paid.count+3, 6));
    for(let i=0;i<showN;i++){
      const s=sched[i]; const tx=txs[i];
      const isPaid=!!tx; const overdue=!isPaid && s.date<today;
      const status=isPaid?'✅':overdue?'⚠️':'○';
      rows+=`<div class="debt-schedule-row ${isPaid?'paid':''}${overdue?' overdue':''}" style="${GRID}"><span>#${s.num} · ${s.date}</span><span style="text-align:right">${fmtB(s.payment||0)}</span><span style="text-align:right">${actCell(tx)}</span><span style="text-align:center">${status}</span></div>`;
    }
    const more = sched.length>showN
      ? `<div style="text-align:center;padding:7px;font-size:.72rem;color:#a8aec8">…a dalších ${sched.length-showN} splátek · <span onclick="showDebtSchedule('${d.id}')" style="cursor:pointer;color:var(--bank);text-decoration:underline">celý kalendář</span></div>` : '';
    return `<div style="margin-top:8px;border:1px solid var(--border);border-radius:10px;overflow:hidden">${header}${rows}${more}</div>`;
  }
  // bez kalendáře → jen seznam reálných plateb
  if(!txs.length) return '<div style="margin-top:8px;font-size:.76rem;color:#a8aec8;padding:8px">Zatím žádné zaznamenané splátky.</div>';
  rows = txs.map((t,i)=>`<div class="debt-schedule-row paid" style="${GRID}"><span>#${i+1} · ${t.date}</span><span style="text-align:right;color:var(--text3)">–</span><span style="text-align:right">${actCell(t)}</span><span style="text-align:center">✅</span></div>`).join('');
  return `<div style="margin-top:8px;border:1px solid var(--border);border-radius:10px;overflow:hidden">${header}${rows}</div>`;
}

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
    const paid=(typeof computeDebtPaid==='function')?computeDebtPaid(d,D):{paidSum:0,paidPrincipal:0,paidInterest:0,count:0,txs:[]};
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
    // S14 (f5): bar = zaplaceno (zeleně) + po splatnosti (červeně) + zbývá (šedý track)
    // v8.71 (FIX-185): zaplaceno = splátky v appce + rozdíl (půjčeno − zbývá) splacený PŘED aplikací.
    // Dřív „Celková 60k, zbývá 40,5k" ukazovalo 0 % – transakce splátek neexistovaly.
    const _prePaid = Math.max(0, (d.total||0) - (d.remaining||0) - (paid.paidPrincipal||0));
    const _futureSum = (schedule&&schedule.length) ? schedule.reduce((a,s)=>a+(s.payment||0),0) : (d.remaining||0);
    const _totalToPay = _prePaid + paid.paidSum + _futureSum;
    const _paidAll = _prePaid + paid.paidSum;
    const _paidPct = _totalToPay>0 ? Math.min(100, _paidAll/_totalToPay*100) : 0;
    const _overdueAmt = (schedule||[]).filter((s,i)=> !s.paid && s.date<today && i>=paid.count).reduce((a,s)=>a+(s.payment||0),0);
    const _overduePct = _totalToPay>0 ? Math.min(Math.max(0,100-_paidPct), _overdueAmt/_totalToPay*100) : 0;
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
      <div class="prog-bar" style="display:flex">
        <div style="width:${_paidPct}%;background:#10b981"></div>
        <div style="width:${_overduePct}%;background:#ef4444"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.68rem;color:#a8aec8;margin:-2px 0 6px;gap:8px;flex-wrap:wrap">
        <span>✅ Zaplaceno ${fmtB(_paidAll)}${_prePaid>0?` <span style="color:#8b90a8">(z toho ${fmtB(_prePaid)} před appkou)</span>`:''}${_overdueAmt>0?` · <span style="color:#fca5a5">po splatnosti ${fmtB(_overdueAmt)}</span>`:''}</span>
        <span>z ${fmtB(_totalToPay)} (${Math.round(_paidPct)} %)</span>
      </div>
      <div class="debt-stats">
        <div class="dst"><div class="dst-val" style="color:${pc}">${fmt(d.remaining)}</div><div class="dst-lbl">Zbývá</div></div>
        <div class="dst"><div class="dst-val">${fmtB(d.payment||0)}</div><div class="dst-lbl">${freqLabel}</div></div>
        <div class="dst"><div class="dst-val">${nextPayment?nextPayment.date:'–'}</div><div class="dst-lbl">Příští splátka</div></div>
        <div class="dst"><div class="dst-val">${schedule.length||'?'}</div><div class="dst-lbl">Zbývá splátek</div></div>
      </div>
      ${(schedule&&schedule.length)?(()=>{ // v8.71: přeplatek + konec splácení přímo na kartě
        const _fi=schedule.reduce((a,s)=>a+(s.interest||0),0);
        const _end=schedule[schedule.length-1]?.date||'–';
        const _mo=Math.max(0,Math.round((new Date(_end)-new Date())/(30.44*24*3600*1000)));
        const _yy=Math.floor(_mo/12), _mm=_mo%12;
        return `<div class="debt-stats" style="margin-top:6px">
        <div class="dst"><div class="dst-val" style="color:var(--debt)">${fmtB(Math.round(_fi))}</div><div class="dst-lbl">Přeplatíš (úroky)</div></div>
        <div class="dst"><div class="dst-val">${_end}</div><div class="dst-lbl">Doplatíš</div></div>
        <div class="dst"><div class="dst-val">${_yy>0?_yy+'r ':''}${_mm}m</div><div class="dst-lbl">Zbývá doba</div></div>
      </div>`; })():''}
      ${paid.paidSum>0?`<div class="debt-stats" style="margin-top:6px">
        <div class="dst"><div class="dst-val" style="color:var(--income)">${fmtB(paid.paidSum)}</div><div class="dst-lbl">Zaplaceno (${paid.count}×)</div></div>
        <div class="dst"><div class="dst-val">${fmtB(paid.paidPrincipal)}</div><div class="dst-lbl">Na jistině</div></div>
        <div class="dst"><div class="dst-val" style="color:var(--debt)">${fmtB(paid.paidInterest)}</div><div class="dst-lbl">Na úrocích</div></div>
      </div>`:''}
      ${(paid.count>0||(schedule&&schedule.length))?`<button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%;font-size:.74rem;justify-content:center" onclick="toggleDebtTxTable('${d.id}')"><span style="display:inline-block;transition:transform .2s;transform:rotate(${_debtTxExpanded[d.id]?'90deg':'0deg'})">▶</span> Splátky a transakce (${paid.count}${schedule&&schedule.length?'/'+schedule.length:''})</button>${_debtTxExpanded[d.id]?renderDebtTxTable(d,paid,D):''}`:''}
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
