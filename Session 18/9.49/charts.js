// FinanceFlow · v9.49 · charts.js · 2026-08-03
//  GRAFY (simplified)
// ══════════════════════════════════════════════════════
function renderGrafy(){
  const D=getData();
  document.getElementById('grafYear').textContent=S.curYear;
  initGrafFilters();
  const inc12=[],exp12=[],sal12=[],labels12=[];
  for(let i=11;i>=0;i--){let m=S.curMonth-i,y=S.curYear;if(m<0){m+=12;y--;}const txs=getTx(m,y,D);inc12.push(incSum(txs));exp12.push(expSum(txs));sal12.push(incSum(txs)-expSum(txs));labels12.push(CZ_M[m].slice(0,3));}
  // Dvojitý requestAnimationFrame zajistí, že prohlížeč dokončí layout (display:none→block)
  // před tím než začneme číst getBoundingClientRect()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        drawSimpleAreaChart('incomeChart',labels12,inc12,'#4ade80');
        drawSimpleAreaChart('expenseChart',labels12,exp12,'#f87171');
        drawSaldoBars('saldoChart',labels12,sal12);
        renderDebtChart(D);
        renderPredLineChartSimple(S.curYear,D);
      }, 50);
    });
  });
}

function renderDebtChart(D) {
  const canvas=document.getElementById('debtChart'); if(!canvas) return;
  const debts=(D.debts||[]).filter(d=>d.remaining>0&&d.schedule?.length);
  const W=canvas.parentElement.clientWidth||400;
  canvas.width=W; canvas.height=200;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,W,200);
  if(!debts.length){
    ctx.fillStyle='#a8aec8';ctx.font='13px Instrument Sans';ctx.textAlign='center';
    ctx.fillText('Přidejte půjčku se splátkovým kalendářem',W/2,100);return;
  }
  const colors=['#f87171','#fbbf24','#60a5fa','#a78bfa','#34d399'];
  const months=24;
  const labels=[];
  for(let i=0;i<months;i++){let m=S.curMonth+i,y=S.curYear;while(m>=12){m-=12;y++;}labels.push(CZ_M[m].slice(0,3));}
  const pad={l:60,r:16,t:30,b:30};
  const cW=W-pad.l-pad.r, cH=200-pad.t-pad.b;
  const maxVal=Math.max(...debts.map(d=>d.remaining),1);
  const xf=i=>pad.l+(i/(months-1))*cW;
  const yf=v=>pad.t+cH-(v/maxVal*cH);

  // Grid lines
  ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1;ctx.setLineDash([3,4]);
  [0,0.25,0.5,0.75,1].forEach(f=>{
    ctx.beginPath();ctx.moveTo(pad.l,yf(maxVal*f));ctx.lineTo(W-pad.r,yf(maxVal*f));ctx.stroke();
  });
  ctx.setLineDash([]);

  // Compute all debt lines
  const allPts=debts.map(d=>{
    const pts=[];let rem=d.remaining;
    for(let i=0;i<months;i++){
      let m=S.curMonth+i,yr=S.curYear;while(m>=12){m-=12;yr++;}
      const dateStr=`${yr}-${String(m+1).padStart(2,'0')}`;
      const monthPmts=(d.schedule||[]).filter(s=>s.date.startsWith(dateStr)&&!s.paid);
      monthPmts.forEach(s=>{rem=Math.max(0,rem-s.principal);});
      pts.push(rem);
    }
    return pts;
  });

  // Draw lines
  allPts.forEach((pts,di)=>{
    const color=colors[di%colors.length];
    ctx.beginPath();
    pts.forEach((v,i)=>i===0?ctx.moveTo(xf(i),yf(v)):ctx.lineTo(xf(i),yf(v)));
    ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.stroke();
  });

  // Legend – vpravo nahoře, bez překrývání os
  const legendX=pad.l+8;
  debts.forEach((d,di)=>{
    const color=colors[di%colors.length];
    const ly=pad.t+di*18;
    ctx.fillStyle=color;ctx.fillRect(legendX,ly,14,3);
    ctx.fillStyle='rgba(220,224,240,.85)';ctx.font='bold 10px Instrument Sans';ctx.textAlign='left';
    ctx.fillText(d.name.slice(0,18),legendX+18,ly+4);
  });

  // X labels – každé 4 měsíce
  ctx.fillStyle='rgba(168,173,196,.8)';ctx.font='10px Instrument Sans';ctx.textAlign='center';
  [0,4,8,12,16,20,23].forEach(i=>{ctx.fillText(labels[i],xf(i),200-8);});

  // Y labels
  ctx.textAlign='right';ctx.fillStyle='rgba(168,173,196,.8)';ctx.font='10px Instrument Sans';
  [0,0.25,0.5,0.75,1].forEach(f=>{
    const v=czkToBase(maxVal*f); // v8.61 (TODO-151): ticky v základní měně
    ctx.fillText(v>=1000?Math.round(v/1000)+'k':Math.round(v),pad.l-6,yf(maxVal*f)+4);
  });

  // Y axis label
  ctx.save();ctx.translate(12,pad.t+cH/2);ctx.rotate(-Math.PI/2);
  ctx.fillStyle='rgba(168,173,196,.6)';ctx.font='10px Instrument Sans';ctx.textAlign='center';
  ctx.fillText('Zbývá ('+curSym()+')',0,0);ctx.restore();

  // Hover tooltip
  canvas._chartData={allPts,debts,colors,months,xf,yf,labels,pad,cW,cH,maxVal,W};
  canvas.onmousemove=function(e){
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left;
    const idx=Math.round((mx-pad.l)/cW*(months-1));
    if(idx<0||idx>=months)return;
    // Redraw
    renderDebtChart(D);
    const ctx2=canvas.getContext('2d');
    // Vertical line
    ctx2.strokeStyle='rgba(255,255,255,.2)';ctx2.lineWidth=1;
    ctx2.beginPath();ctx2.moveTo(xf(idx),pad.t);ctx2.lineTo(xf(idx),200-pad.b);ctx2.stroke();
    // Tooltip box
    const tipX=Math.min(xf(idx)+8,W-120);
    const tipY=pad.t+4;
    const tipH=debts.length*16+20;
    ctx2.fillStyle='rgba(26,29,46,.95)';ctx2.strokeStyle='rgba(255,255,255,.1)';ctx2.lineWidth=1;
    ctx2.beginPath();ctx2.roundRect(tipX,tipY,110,tipH,6);ctx2.fill();ctx2.stroke();
    ctx2.fillStyle='rgba(220,224,240,.9)';ctx2.font='bold 10px Instrument Sans';ctx2.textAlign='left';
    ctx2.fillText(labels[idx],tipX+8,tipY+14);
    debts.forEach((d,di)=>{
      ctx2.fillStyle=colors[di%colors.length];
      ctx2.fillText(d.name.slice(0,10)+': '+fmt(Math.round(czkToBase(allPts[di][idx]))),tipX+8,tipY+28+di*16);
    });
  };
  canvas.onmouseleave=function(){renderDebtChart(D);};
  attachChartTouch(canvas); // S12.1: tooltipy fungují i na mobilu
}

function drawSimpleAreaChart(id,labels,data,color,_retryCount){
  const canvas=document.getElementById(id);if(!canvas)return;
  // Zajisti že canvas je viditelný a má správnou šířku
  canvas.style.display='block';
  canvas.style.width='100%';
  const parent=canvas.parentElement;
  // Zkus více způsobů jak získat šířku - getBoundingClientRect je nejspolehlivější
  let W=parent.getBoundingClientRect().width;
  if(!W||W<50) W=parent.offsetWidth||parent.clientWidth||0;
  if(!W||W<50) W=canvas.offsetWidth||0;
  // Pokud šířka stále 0 a máme retry pokusy zbývající → zkus znovu po delší době
  if(W<50){
    const retry=(_retryCount||0)+1;
    if(retry<=5){
      setTimeout(()=>drawSimpleAreaChart(id,labels,data,color,retry), retry*80);
    }
    return;
  }
  canvas.width=W;
  const H=canvas.height||160;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  const maxV=Math.max(...data,1);
  const pad={l:52,r:12,t:14,b:28};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
  const n=data.length;
  const xf=i=>pad.l+i/(n-1)*cW;
  const yf=v=>pad.t+cH*(1-v/maxV);

  // Grid
  ctx.setLineDash([3,4]);
  [0,0.25,0.5,0.75,1].forEach(f=>{
    ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pad.l,pad.t+cH*(1-f));ctx.lineTo(W-pad.r,pad.t+cH*(1-f));ctx.stroke();
  });
  ctx.setLineDash([]);

  // Area
  const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16);
  const grad=ctx.createLinearGradient(0,pad.t,0,H-pad.b);
  grad.addColorStop(0,`rgba(${r},${g},${b},.35)`);
  grad.addColorStop(1,`rgba(${r},${g},${b},0)`);
  ctx.beginPath();ctx.moveTo(xf(0),H-pad.b);
  data.forEach((v,i)=>ctx.lineTo(xf(i),yf(v)));
  ctx.lineTo(xf(n-1),H-pad.b);ctx.closePath();ctx.fillStyle=grad;ctx.fill();

  // Line
  ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.beginPath();
  data.forEach((v,i)=>i===0?ctx.moveTo(xf(i),yf(v)):ctx.lineTo(xf(i),yf(v)));
  ctx.stroke();

  // Dots na datových bodech
  data.forEach((v,i)=>{
    if(v===0)return;
    ctx.beginPath();ctx.arc(xf(i),yf(v),3,0,Math.PI*2);
    ctx.fillStyle=color;ctx.fill();
  });

  // X labels – jen každý druhý nebo každý třetí pokud je moc
  ctx.fillStyle='rgba(168,173,196,.8)';ctx.font='10px Instrument Sans';ctx.textAlign='center';
  const step=n<=12?1:2;
  labels.forEach((l,i)=>{if(i%step===0)ctx.fillText(l,xf(i),H-6);});

  // Y labels
  ctx.fillStyle='rgba(168,173,196,.8)';ctx.font='10px Instrument Sans';ctx.textAlign='right';
  [0,0.25,0.5,0.75,1].forEach(f=>{
    const v=maxV*f;
    if(v===0)return;
    ctx.fillText(v>=1000?Math.round(v/1000)+'k':Math.round(v),pad.l-5,pad.t+cH*(1-f)+4);
  });

  // Hover tooltip
  canvas.onmousemove=function(e){
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left;
    const idx=Math.max(0,Math.min(n-1,Math.round((mx-pad.l)/cW*(n-1))));
    // Redraw base
    drawSimpleAreaChart(id,labels,data,color);
    const ctx2=canvas.getContext('2d');
    // Vertical line
    ctx2.strokeStyle='rgba(255,255,255,.2)';ctx2.lineWidth=1;ctx2.setLineDash([3,3]);
    ctx2.beginPath();ctx2.moveTo(xf(idx),pad.t);ctx2.lineTo(xf(idx),H-pad.b);ctx2.stroke();
    ctx2.setLineDash([]);
    // Dot highlight
    ctx2.beginPath();ctx2.arc(xf(idx),yf(data[idx]),5,0,Math.PI*2);
    ctx2.fillStyle=color;ctx2.strokeStyle='white';ctx2.lineWidth=1.5;ctx2.fill();ctx2.stroke();
    // Tooltip
    const tipX=Math.min(xf(idx)+10,W-90);
    ctx2.fillStyle='rgba(26,29,46,.95)';ctx2.strokeStyle='rgba(255,255,255,.1)';ctx2.lineWidth=1;
    ctx2.beginPath();ctx2.roundRect(tipX,pad.t+4,82,34,6);ctx2.fill();ctx2.stroke();
    ctx2.fillStyle='rgba(220,224,240,.9)';ctx2.font='bold 10px Instrument Sans';ctx2.textAlign='left';
    ctx2.fillText(labels[idx],tipX+8,pad.t+17);
    ctx2.fillStyle=color;ctx2.font='bold 11px Instrument Sans';
    {const _b=czkToBase(data[idx]);ctx2.fillText(_b>=1000?Math.round(_b/1000)+'k '+curSym():Math.round(_b)+' '+curSym(),tipX+8,pad.t+30);}
  };
  canvas.onmouseleave=function(){drawSimpleAreaChart(id,labels,data,color);};
  attachChartTouch(canvas); // S12.1: tooltipy fungují i na mobilu
}

function drawSaldoBars(id,labels,data){
  const canvas=document.getElementById(id);if(!canvas)return;
  let W=canvas.parentElement.getBoundingClientRect().width;
  if(!W||W<50) W=canvas.parentElement.clientWidth||canvas.parentElement.offsetWidth||500;
  canvas.width=W;
  const H=canvas.height||150;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  const maxA=Math.max(...data.map(Math.abs),1);
  const pad={l:52,r:12,t:10,b:28};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
  const n=data.length;
  const midY=pad.t+cH*0.55;
  const bw=Math.max(6,(cW/n)*0.55);
  const gap=cW/n;

  // Grid
  ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1;ctx.setLineDash([3,4]);
  ctx.beginPath();ctx.moveTo(pad.l,midY);ctx.lineTo(W-pad.r,midY);ctx.stroke();
  ctx.setLineDash([]);

  // Bars
  data.forEach((v,i)=>{
    const x=pad.l+i*gap+(gap-bw)/2;
    const h=Math.max(3,Math.abs(v)/maxA*(cH*0.45));
    const col=v>=0?'#4ade80':'#f87171';
    ctx.fillStyle=col+'bb';
    ctx.beginPath();
    if(v>=0) ctx.roundRect(x,midY-h,bw,h,[2,2,0,0]);
    else ctx.roundRect(x,midY,bw,h,[0,0,2,2]);
    ctx.fill();
    // Value label on bigger bars
    if(h>18){
      ctx.fillStyle='rgba(220,224,240,.9)';ctx.font='10px Instrument Sans';ctx.textAlign='center';
      const label=Math.abs(v)>=1000?Math.round(v/1000)+'k':Math.round(v);
      ctx.fillText(label,x+bw/2,v>=0?midY-h-3:midY+h+10);
    }
  });

  // X labels
  ctx.fillStyle='rgba(168,173,196,.8)';ctx.font='10px Instrument Sans';ctx.textAlign='center';
  const step=n<=12?1:2;
  labels.forEach((l,i)=>{if(i%step===0)ctx.fillText(l,pad.l+i*gap+gap/2,H-6);});

  // Y labels
  ctx.fillStyle='rgba(168,173,196,.8)';ctx.font='10px Instrument Sans';ctx.textAlign='right';
  const tick=Math.ceil(maxA/2/1000)*1000||1000;
  [-tick,0,tick].forEach(v=>{
    const vy=midY-v/maxA*(cH*0.45);
    ctx.fillText(v>=1000?v/1000+'k':v<=- 1000?v/1000+'k':v,pad.l-5,vy+4);
  });

  // S12.1: legenda (čitelná barva, nepřekrývá data – pravý horní roh nad grafem)
  ctx.textAlign='right'; ctx.font='10px Instrument Sans';
  ctx.fillStyle='#4ade80'; ctx.fillText('■ přebytek', W-pad.r-58, pad.t+2);
  ctx.fillStyle='#f87171'; ctx.fillText('■ schodek', W-pad.r, pad.t+2);

  // Hover
  canvas.onmousemove=function(e){
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left;
    const idx=Math.max(0,Math.min(n-1,Math.floor((mx-pad.l)/gap)));
    drawSaldoBars(id,labels,data);
    const ctx2=canvas.getContext('2d');
    const tipX=Math.min(pad.l+idx*gap+gap/2+8,W-88);
    ctx2.fillStyle='rgba(26,29,46,.95)';ctx2.strokeStyle='rgba(255,255,255,.1)';ctx2.lineWidth=1;
    ctx2.beginPath();ctx2.roundRect(tipX,pad.t+4,80,34,6);ctx2.fill();ctx2.stroke();
    ctx2.fillStyle='rgba(220,224,240,.9)';ctx2.font='bold 10px Instrument Sans';ctx2.textAlign='left';
    ctx2.fillText(labels[idx],tipX+8,pad.t+17);
    ctx2.fillStyle=data[idx]>=0?'#4ade80':'#f87171';ctx2.font='bold 11px Instrument Sans';
    ctx2.fillText((data[idx]>=0?'+':'')+Math.round(czkToBase(data[idx])/1000*10)/10+'k '+curSym(),tipX+8,pad.t+30);
  };
  canvas.onmouseleave=function(){drawSaldoBars(id,labels,data);};
  attachChartTouch(canvas); // S12.1: tooltipy fungují i na mobilu
}

function drawLineChart(id,data,color){drawSimpleAreaChart(id,data.map(d=>d.label),data.map(d=>d.val),color);}

// ══════════════════════════════════════════════════════
//  NAROZENINY & PŘÁNÍ
// ══════════════════════════════════════════════════════
function renderNarozeniny(){renderBdayList();renderBdayUpcoming();renderWishList();if(typeof renderNakupCile==='function')renderNakupCile();}
function renderBdayList(){
  const D=getData();const ro=viewingUid!==null;
  const el=document.getElementById('bdayList');if(!el)return;
  const bdays=(D.birthdays||[]).sort((a,b)=>a.month-b.month||a.day-b.day);
  if(!bdays.length){el.innerHTML='<div class="empty"><div class="ei">🎂</div><div class="et">Žádné narozeniny</div></div>';return;}
  el.innerHTML=bdays.map(b=>`<div class="bday-item"><div class="bday-icon">🎂</div><div class="bday-info"><div class="bday-name">${b.name}</div><div class="bday-date">${b.day}. ${CZ_M[b.month-1]}${b.gift?` · 🎁 ${fmt(b.gift)}`:''}</div>${b.note?`<div class="bday-date" style="color:var(--text3)">${b.note}</div>`:''}</div><div style="text-align:right">${daysUntilBday(b)<=30?`<div class="bday-soon">za ${daysUntilBday(b)} dní</div>`:''}<div style="display:flex;gap:4px;margin-top:4px">${!ro?`<button class="btn btn-edit btn-icon btn-sm" onclick="editBday('${b.id}')">✎</button><button class="btn btn-danger btn-icon btn-sm" onclick="deleteBday('${b.id}')">✕</button>`:''}</div></div></div>`).join('');
}
function renderBdayUpcoming(){
  const D=getData();const el=document.getElementById('bdayUpcoming');if(!el)return;
  const bdays=(D.birthdays||[]).map(b=>({...b,days:daysUntilBday(b)})).sort((a,b)=>a.days-b.days).slice(0,5);
  if(!bdays.length){el.innerHTML='<div class="empty"><div class="et">Žádné narozeniny</div></div>';return;}
  el.innerHTML=bdays.map(b=>`<div class="insight-item ${b.days<=7?'bad':b.days<=30?'warn':'info'}"><div class="insight-icon">🎂</div><div class="insight-text"><strong>${b.name}</strong> – ${b.day}. ${CZ_M[b.month-1]}<br>${b.days===0?'<strong>DNES!</strong>':b.days===1?'<strong>ZÍTRA!</strong>':`za <strong>${b.days} dní</strong>`}${b.gift?` · dárek: <strong>${fmt(b.gift)}</strong>`:''}</div></div>`).join('');
}
function daysUntilBday(b){const now=new Date();const ny=now.getFullYear();let next=new Date(ny,b.month-1,b.day);if(next<now)next=new Date(ny+1,b.month-1,b.day);return Math.round((next-now)/(1000*60*60*24));}
function openBdayModal(){if(viewingUid)return;['editBdayId','bdayName','bdayDay','bdayGift','bdayNote'].forEach(id=>document.getElementById(id).value='');document.getElementById('bdayMonth').value='1';document.getElementById('bdayModalTitle').textContent='Přidat narozeniny';document.getElementById('modalBday').classList.add('open');}
function editBday(id){if(viewingUid)return;const b=(S.birthdays||[]).find(x=>x.id===id);if(!b)return;document.getElementById('editBdayId').value=id;document.getElementById('bdayName').value=b.name;document.getElementById('bdayDay').value=b.day;document.getElementById('bdayMonth').value=b.month;document.getElementById('bdayGift').value=b.gift||'';document.getElementById('bdayNote').value=b.note||'';document.getElementById('bdayModalTitle').textContent='Upravit narozeniny';document.getElementById('modalBday').classList.add('open');}
function saveBday(){const eid=document.getElementById('editBdayId').value;const name=document.getElementById('bdayName').value.trim();const day=parseInt(document.getElementById('bdayDay').value);const month=parseInt(document.getElementById('bdayMonth').value);const gift=parseFloat(document.getElementById('bdayGift').value)||0;const note=document.getElementById('bdayNote').value.trim();if(!name||!day||!month){alert('Vyplň jméno, den a měsíc');return;}if(!S.birthdays)S.birthdays=[];if(eid){const b=S.birthdays.find(x=>x.id===eid);if(b)Object.assign(b,{name,day,month,gift,note});}else S.birthdays.push({id:uid(),name,day,month,gift,note});save();closeModal('modalBday');renderPage();}
function deleteBday(id){if(viewingUid)return;if(!confirm('Smazat?'))return;S.birthdays=S.birthdays.filter(b=>b.id!==id);save();renderPage();}
function searchWishHeureka(n){if(!n)return;window.open('https://www.heureka.cz/?h[fraze]='+encodeURIComponent(n),'_blank');}

async function importWishFromUrl() {
  const url = document.getElementById('wishUrl')?.value.trim();
  if(!url) return;
  const status = document.getElementById('wishUrlStatus');
  const btn = document.getElementById('wishUrlBtn');
  if(!url.startsWith('http')) { if(status) status.textContent = '⚠️ Zadejte platnou URL'; return; }
  if(status) status.textContent = '⏳ Načítám produkt...';
  if(btn) btn.disabled = true;
  try {
    const token = await getAuthToken();
    if(!token) throw new Error('Přihlaste se přes Google');
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        type: 'wish_url',
        payload: { url, pageContent: '' }
      })
    });
    const data = await response.json();
    if(data.error) throw new Error(data.error);
    // Najdi text blok v odpovědi (různé formáty)
    let text = '';
    if(Array.isArray(data.content)) {
      const tb = data.content.find(b => b.type==='text' || typeof b.text==='string');
      text = tb?.text || '';
    } else if(typeof data.content==='string') { text = data.content; }
    else if(typeof data.text==='string') { text = data.text; }
    const clean = text.replace(/```json|```/g,'').trim();
    // Vytáhni JSON i kdyby kolem byl text
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    if(parsed.name) {
      document.getElementById('wishName').value = parsed.name;
      if(parsed.price && Number(parsed.price)>0) document.getElementById('wishPrice').value = parsed.price;
      if(parsed.desc) document.getElementById('wishDesc').value = parsed.desc;
      wishUpdateEstimate();
      // Show link
      const linkRow = document.getElementById('wishUrlLinkRow');
      const linkEl = document.getElementById('wishUrlLink');
      if(linkRow) linkRow.style.display = 'block';
      if(linkEl) linkEl.innerHTML = `<a href="${url}" target="_blank" style="color:var(--bank)">${url.slice(0,60)}${url.length>60?'...':''}</a>`;
      const priceTxt = (parsed.price && Number(parsed.price)>0) ? ` · ${parsed.price} Kč` : ' · cenu doplň ručně';
      if(status) status.innerHTML = `✅ Načteno: <strong>${parsed.name}</strong>${priceTxt}`;
    } else {
      throw new Error('Produkt nenalezen v odpovědi');
    }
  } catch(e) {
    console.warn('URL import error:', e);
    // Fallback – try to parse URL manually
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const guessName = pathParts[pathParts.length-1]?.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) || '';
      if(guessName) {
        document.getElementById('wishName').value = guessName;
        if(status) status.textContent = '⚠️ Načteno jen ze URL – zkontrolujte název';
      } else {
        if(status) status.textContent = '⚠️ Nepodařilo se načíst – vyplňte ručně';
      }
    } catch(e2) {
      if(status) status.textContent = '⚠️ Nepodařilo se načíst – vyplňte ručně';
    }
  }
  if(btn) btn.disabled = false;
}

// searchWishGoogle zachováno níže


function renderWishList(){
  const D=getData();const ro=viewingUid!==null;
  const el=document.getElementById('wishList');if(!el)return;
  const wishes=(D.wishes||[]).filter(w=>!w.isGoal);
  if(!wishes.length){el.innerHTML='<div class="empty"><div class="ei">🎁</div><div class="et">Žádná přání</div></div>';return;}
  const order={high:0,mid:1,low:2};
  el.innerHTML=[...wishes].sort((a,b)=>order[a.priority]-order[b.priority]).map(w=>`<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);margin-bottom:8px;background:var(--surface2);${w.done?'opacity:.5':''}">
    <div style="font-size:1.2rem">${w.done?'✅':'🎁'}</div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:600;font-size:.88rem;${w.done?'text-decoration:line-through':''}">${w.name}</div>
      ${w.desc?`<div style="font-size:.74rem;color:var(--text3);margin-top:2px">${w.desc}</div>`:''}
      <div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap;align-items:center">
        <span style="font-size:.75rem;color:${w.priority==='high'?'#f87171':w.priority==='low'?'#4ade80':'#fbbf24'}">${w.priority==='high'?'🔴 Vysoká':w.priority==='low'?'🟢 Nízká':'🟡 Střední'}</span>
        ${w.price?`<span style="font-size:.78rem;font-weight:600">~${fmt(w.price)}</span>`:''}
        <button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:3px 8px" onclick="searchWishHeureka('${w.name.replace(/'/g,"\\'")}')">🔍 Heureka</button>
        <button class="btn btn-ghost btn-sm" style="font-size:.7rem;padding:3px 8px" onclick="searchWishGoogle('${w.name.replace(/'/g,"\\'")}')">🔎 Google</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px">${!ro?`<button class="btn btn-edit btn-icon btn-sm" onclick="editWish('${w.id}')">✎</button><button class="btn btn-danger btn-icon btn-sm" onclick="deleteWish('${w.id}')">✕</button><button onclick="toggleWishDone('${w.id}')" style="background:none;border:1px solid var(--border);border-radius:6px;cursor:pointer;padding:3px 6px;font-size:.7rem;color:var(--text3)">${w.done?'↩':'✓'}</button>`:''}</div>
  </div>`).join('');
}
// ═══ SJEDNOCENÝ MODAL Přání / Cíl (S13) ═══════════════════
const WISH_ICONS = ['🎯','🏠','🚗','✈️','🎓','💍','📱','💻','🏖️','🎁','🚲','🛋️','👶','🐶','💰','🏥','🎸','📷','⌚','🛒'];
function renderWishIconPicker(selected){
  const wrap = document.getElementById('wishIconPicker'); if(!wrap) return;
  const sel = selected || document.getElementById('wishIcon')?.value || '🎯';
  wrap.innerHTML = WISH_ICONS.map(ic =>
    `<button type="button" onclick="wishPickIcon('${ic}')" style="width:38px;height:38px;border-radius:9px;border:1.5px solid ${ic===sel?'var(--accent,#4ade80)':'var(--border)'};background:${ic===sel?'rgba(74,222,128,.14)':'var(--surface2)'};font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center">${ic}</button>`
  ).join('');
}
function wishPickIcon(ic){
  const inp = document.getElementById('wishIcon'); if(inp) inp.value = ic;
  renderWishIconPicker(ic);
}
function wishSetType(type){
  document.getElementById('wishType').value = type;
  const bw = document.getElementById('wishTypeWish');
  const bg = document.getElementById('wishTypeGoal');
  if(bw && bg){
    if(type==='goal'){
      bg.style.background='var(--surface)'; bg.style.color='var(--text)';
      bw.style.background='transparent';    bw.style.color='var(--text3)';
    } else {
      bw.style.background='var(--surface)'; bw.style.color='var(--text)';
      bg.style.background='transparent';    bg.style.color='var(--text3)';
    }
  }
  // SJEDNOCENÝ MODAL: oba typy mají VŠECHNA pole (ikona, URL, priorita, měsíční vklad, deadline)
  document.getElementById('wishIconWrap').style.display='';
  document.getElementById('wishUrlImport').style.display='';
  document.getElementById('wishPriorityWrap').style.display='';
  document.getElementById('wishMonthlyWrap').style.display='';
  document.getElementById('wishDeadlineWrap').style.display='';
  // Liší se jen popisky podle typu
  if(type==='goal'){
    document.getElementById('wishNameLabel').textContent='Název cíle';
    document.getElementById('wishPriceLabel').textContent='Cílová částka (Kč)';
  } else {
    document.getElementById('wishNameLabel').textContent='Název předmětu';
    document.getElementById('wishPriceLabel').textContent='Odhadovaná cena (Kč)';
  }
  renderWishIconPicker();
  wishUpdateEstimate();
}
function wishUpdateEstimate(){
  if(document.getElementById('wishType').value!=='goal') return;
  const target=parseFloat(document.getElementById('wishPrice').value)||0;
  const monthly=parseFloat(document.getElementById('wishMonthly').value)||0;
  const el=document.getElementById('wishEstimate'); if(!el) return;
  if(!target||!monthly){el.style.display='none';el.textContent='';return;}
  const months=Math.ceil(target/monthly), years=Math.floor(months/12), rem=months%12;
  el.style.display='';
  el.textContent=`≈ ${years>0?years+' r. ':''}${rem>0?rem+' měs.':''} našetřeno`;
}
function openWishModal(forceType){
  if(viewingUid)return;
  const type = (forceType==='goal') ? 'goal' : 'wish';
  ['editWishId','wishName','wishDesc','wishPrice','wishUrl','wishMonthly','wishDeadline'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('wishPriority').value='mid';
  document.getElementById('wishIcon').value='🎯';
  const status=document.getElementById('wishUrlStatus'); if(status)status.textContent='';
  const linkRow=document.getElementById('wishUrlLinkRow'); if(linkRow)linkRow.style.display='none';
  document.getElementById('wishModalTitle').textContent = type==='goal' ? 'Nový cíl' : 'Nové přání';
  // V přidávacím módu je přepínač typu SKRYTÝ (typ určuje tlačítko)
  const tw=document.getElementById('wishTypeWrap'); if(tw) tw.style.display='none';
  wishSetType(type);
  document.getElementById('modalWish').classList.add('open');
}
function editWish(id){
  if(viewingUid)return;
  const w=(S.wishes||[]).find(x=>x.id===id);if(!w)return;
  document.getElementById('editWishId').value=id;
  document.getElementById('wishName').value=w.name||'';
  document.getElementById('wishDesc').value=w.desc||'';
  wishSetType(w.isGoal ? 'goal' : 'wish');
  // Sjednoceno: načti všechna pole pro oba typy
  document.getElementById('wishPrice').value = (w.isGoal ? w.targetAmount : w.price) || '';
  document.getElementById('wishMonthly').value = w.monthlyTarget || '';
  document.getElementById('wishDeadline').value = w.deadline || '';
  document.getElementById('wishIcon').value = w.icon || '🎯';
  document.getElementById('wishPriority').value = w.priority || 'mid';
  if(document.getElementById('wishUrl')) document.getElementById('wishUrl').value = w.url || '';
  renderWishIconPicker(w.icon || '🎯');
  wishUpdateEstimate();
  document.getElementById('wishModalTitle').textContent=w.isGoal?'Upravit cíl':'Upravit přání';
  // V editaci je přepínač typu VIDITELNÝ (lze přepnout přání↔cíl)
  const tw=document.getElementById('wishTypeWrap'); if(tw) tw.style.display='';
  document.getElementById('modalWish').classList.add('open');
}
function saveWish(){
  if(viewingUid)return;
  const type=document.getElementById('wishType').value;
  const eid=document.getElementById('editWishId').value;
  const name=document.getElementById('wishName').value.trim();
  const desc=document.getElementById('wishDesc').value.trim();
  if(!name){alert('Zadej název');return;}
  if(!S.wishes)S.wishes=[];
  // Sjednocený modal: oba typy ukládají všechna pole
  const amount=parseFloat(document.getElementById('wishPrice').value)||0;
  const monthlyTarget=parseFloat(document.getElementById('wishMonthly').value)||0;
  const deadline=document.getElementById('wishDeadline').value||'';
  const icon=document.getElementById('wishIcon').value.trim()||'🎯';
  const priority=document.getElementById('wishPriority').value||'mid';
  const url=document.getElementById('wishUrl')?.value.trim()||'';
  if(type==='goal'){
    if(!amount){alert('Zadej cílovou částku');return;}
    const obj={name,desc,targetAmount:amount,monthlyTarget,deadline,icon,priority,url:url||undefined,isGoal:true};
    if(eid){const w=S.wishes.find(x=>x.id===eid);if(w)Object.assign(w,obj);}
    else S.wishes.push({id:uid(),addedAt:Date.now(),...obj});
  } else {
    const obj={name,desc,price:amount,monthlyTarget,deadline,icon,priority,url:url||undefined,isGoal:false};
    if(eid){const w=S.wishes.find(x=>x.id===eid);if(w)Object.assign(w,obj);}
    else S.wishes.push({id:uid(),...obj,done:false});
  }
  save();closeModal('modalWish');renderPage();
}
function searchWishGoogle(n){if(!n)return;window.open('https://www.google.com/search?q='+encodeURIComponent(n+' cena'),'_blank');}
function deleteWish(id){if(viewingUid)return;if(!confirm('Smazat přání?'))return;S.wishes=S.wishes.filter(w=>w.id!==id);save();renderPage();}
function toggleWishDone(id){if(viewingUid)return;const w=(S.wishes||[]).find(x=>x.id===id);if(w){w.done=!w.done;save();renderPage();}}

// ══════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════
//  VYLEPŠENÉ GRAFY – záložky + filtr
// ══════════════════════════════════════════════════════
let _grafMonth = null;
let _grafYear2 = null;

// S16.4 (P1-1 + Milan): MULTI-SELECT filtry (checkboxy) + typ „Přesuny".
//   Prázdný výběr kategorií/podkategorií = VŠE. Typy nikdy prázdné (poslední nejde odškrtnout).
//   Stav mimo S (view-only) → sync ho nemaže.
window._grafF = window._grafF || { cats: [], subs: [], projects: [], types: ['income','expense'] };  // S16.12: + projekty
const _GF_TYPES = [
  { id:'income',   label:'Příjmy',  icon:'💰' },
  { id:'expense',  label:'Výdaje',  icon:'💸' },
  { id:'transfer', label:'Přesuny', icon:'🔁' },
];
// Druh transakce pro grafy: přesun má přednost před income/expense nohou
function _txKind(t){ return isTransferTx(t) ? 'transfer' : t.type; }

function initGrafFilters() {
  renderGrafFilters();
  if(!window._gfDocClose){
    window._gfDocClose = true;
    document.addEventListener('click', (e)=>{
      if(!e.target.closest('.gf-wrap')) document.querySelectorAll('.gf-panel').forEach(pn=>pn.style.display='none');
    });
  }
}

function _gfSubOptions(D){
  const F=window._grafF;
  const cats=(D.categories||[]).filter(c=>!F.cats.length||F.cats.includes(c.id));
  const set=new Set();
  cats.forEach(c=>(c.subs||[]).forEach(su=>set.add(su)));
  return [...set].sort((a,b)=>a.localeCompare(b,'cs'));
}

// S16.12: helpery sdílené s _gfRefreshSubs (aby šlo překreslit JEN podkategorie)
function _gfChk(group,val,label,on){
  const v=String(val).replace(/'/g,"\\'").replace(/"/g,'&quot;');
  return `<label class="gf-item"><input type="checkbox" data-g="${group}" data-v="${v}" ${on?'checked':''} onchange="_gfToggle('${group}','${v}')"> ${label}</label>`;
}
function _gfPanelInner(group,items,allLbl){
  const F=window._grafF;
  const isTyp = group==='typ'||group==='types';
  return `<label class="gf-item" style="border-bottom:1px solid var(--border);margin-bottom:4px;padding-bottom:8px">
      <input type="checkbox" data-all="${group}" ${!isTyp&&!F[group].length?'checked':''} ${isTyp?'style="visibility:hidden"':''} onchange="_gfAll('${group}')"> <strong>${allLbl}</strong></label>
    ${items}`;
}

function renderGrafFilters(){
  const el=document.getElementById('grafFilters'); if(!el) return;
  const D=getData(); const F=window._grafF;
  if(!F.projects) F.projects=[];
  const subOpts=_gfSubOptions(D);
  F.subs=F.subs.filter(su=>subOpts.includes(su));
  const projs=(D.projects||[]);
  F.projects=F.projects.filter(id=>projs.some(p=>p.id===id));

  const catItems=(D.categories||[]).map(c=>_gfChk('cats',c.id,`${c.icon} ${c.name}`,F.cats.includes(c.id))).join('');
  const subItems=subOpts.length?subOpts.map(su=>_gfChk('subs',su,su,F.subs.includes(su))).join(''):'<div style="font-size:.74rem;color:#a8aec8;padding:6px 8px">Zvolené kategorie nemají podkategorie</div>';
  const typItems=_GF_TYPES.map(t=>_gfChk('types',t.id,`${t.icon} ${t.label}`,F.types.includes(t.id))).join('');
  const projItems=projs.length?projs.map(p=>_gfChk('projects',p.id,`${p.icon||'📁'} ${p.name}`,F.projects.includes(p.id))).join(''):'<div style="font-size:.74rem;color:#a8aec8;padding:6px 8px">Zatím žádné projekty</div>';

  const wrap=(group,inner)=>`<div class="gf-wrap"><button class="gf-btn" data-gb="${group}" onclick="_gfOpen('${group}')">… <span style="opacity:.6">▾</span></button>
    <div class="gf-panel" id="gfp-${group}">${inner}</div></div>`;

  el.innerHTML =
      wrap('cats',_gfPanelInner('cats',catItems,'Vše (žádný filtr)'))
    + wrap('subs',_gfPanelInner('subs',subItems,'Vše (žádný filtr)'))
    + wrap('projects',_gfPanelInner('projects',projItems,'Vše (žádný filtr)'))
    + wrap('types',_gfPanelInner('types',typItems,'Typ transakcí'));
  _gfSyncLabels();  // doplní texty tlačítek
}

function _gfOpen(group){
  const id = 'gfp-'+group;
  document.querySelectorAll('.gf-panel').forEach(pn=>{ if(pn.id!==id) pn.style.display='none'; });
  const pn=document.getElementById(id); if(pn) pn.style.display = pn.style.display==='block'?'none':'block';
}

function _gfToggle(group,val){
  const F=window._grafF;
  const key = group==='typ'?'types':group;
  const arr=F[key];
  const i=arr.indexOf(val);
  if(i>=0){
    if(key==='types'&&arr.length===1){ // poslední typ nejde odškrtnout – vrátit checkbox
      const cb=document.querySelector(`[data-g="${key}"][data-v="${String(val).replace(/"/g,'')}"]`);
      if(cb) cb.checked=true;
      return;
    }
    arr.splice(i,1);
  } else arr.push(val);
  // S16.12 (FIX-203, Milan): dřív se volalo renderGrafFilters() = přepis celého panelu
  //   → nové elementy → panel odscrolloval NAHORU. Nyní se panel NEPŘEKRESLUJE:
  //   aktualizují se jen popisky tlačítek a (u kategorií) obsah panelu podkategorií.
  _gfSyncLabels();
  if(key==='cats') _gfRefreshSubs();
  onGrafFilterChange();
}

// Aktualizace popisků na tlačítkách (bez přepisu panelů → scroll zůstane)
function _gfSyncLabels(){
  const D=getData(); const F=window._grafF;
  const catLbl = !F.cats.length ? 'Všechny kategorie'
    : F.cats.length===1 ? (()=>{const c=(D.categories||[]).find(x=>x.id===F.cats[0]);return c?`${c.icon} ${c.name}`:'1 kategorie';})()
    : `${F.cats.length} kategorie`;
  const subLbl = !F.subs.length ? 'Všechny podkategorie' : F.subs.length===1 ? F.subs[0] : `${F.subs.length} podkategorií`;
  const typLbl = F.types.length===3 ? 'Vše vč. přesunů'
    : (F.types.includes('income')&&F.types.includes('expense')&&F.types.length===2) ? 'Příjmy + Výdaje'
    : _GF_TYPES.filter(t=>F.types.includes(t.id)).map(t=>t.label).join(' + ');
  const projLbl = !F.projects.length ? 'Všechny projekty' : F.projects.length===1
    ? (()=>{const p2=(D.projects||[]).find(x=>x.id===F.projects[0]);return p2?p2.name:'1 projekt';})()
    : `${F.projects.length} projektů`;
  const set=(g,txt)=>{ const b=document.querySelector(`.gf-btn[data-gb="${g}"]`); if(b) b.innerHTML=`${txt} <span style="opacity:.6">▾</span>`; };
  set('cats',catLbl); set('subs',subLbl); set('types',typLbl); set('projects',projLbl);
  // „Vše" checkbox nahoře panelu odráží prázdný výběr
  ['cats','subs','projects'].forEach(g=>{
    const all=document.querySelector(`[data-all="${g}"]`);
    if(all) all.checked = !F[g].length;
  });
}

// Překreslí JEN panel podkategorií (mění se s výběrem kategorií), scroll ostatních zůstane
function _gfRefreshSubs(){
  const D=getData(); const F=window._grafF;
  const opts=_gfSubOptions(D);
  F.subs=F.subs.filter(su=>opts.includes(su));
  const pn=document.getElementById('gfp-subs');
  if(pn) pn.innerHTML=_gfPanelInner('subs', opts.length
    ? opts.map(su=>_gfChk('subs',su,su,F.subs.includes(su))).join('')
    : '<div style="font-size:.74rem;color:#a8aec8;padding:6px 8px">Zvolené kategorie nemají podkategorie</div>', 'Vše (žádný filtr)');
  _gfSyncLabels();
}

function _gfAll(group){
  const F=window._grafF;
  if(group==='cats'){ F.cats=[]; F.subs=[]; }
  else if(group==='subs'){ F.subs=[]; }
  else if(group==='projects'){ F.projects=[]; }
  else return; // typ nemá „vše"
  // S16.12 (FIX-203): odškrtat checkboxy v místě, NEpřekreslovat panel (scroll by skočil nahoru)
  document.querySelectorAll(`[data-g="${group}"]`).forEach(cb=>cb.checked=false);
  if(group==='cats'){ document.querySelectorAll('[data-g="subs"]').forEach(cb=>cb.checked=false); _gfRefreshSubs(); }
  _gfSyncLabels();
  onGrafFilterChange();
}

function onGrafFilterChange() {
  // Překresli aktivní záložku
  const active = document.querySelector('[id^="gtab-"][id$="-content"]:not([style*="none"])');
  if(active?.id === 'gtab-mesicni-content') renderMesicniGraf();
  else if(active?.id === 'gtab-rocni-content') renderRocniGraf();
  else if(active?.id === 'gtab-vsechny-content') renderVsechnyRoky();
  else if(active?.id === 'gtab-denni-content') renderDenniGrafy();  // S16.12
}

// ══ S16.12 (Milan): DENNÍ GRAFY – malé sloupcové grafy denních výdajů po kategoriích ══
//   Inspirace Milanovým Excelem: mřížka mini-grafů, jeden na kategorii, den 1–31.
//   Volitelné kategorie (respektuje multi-select filtr), společná osa Y volitelná.
window._denniSameScale = false;
function denniToggleScale(){ window._denniSameScale=!window._denniSameScale; renderDenniGrafy(); }

function renderDenniGrafy(){
  const el=document.getElementById('gtab-denni-content'); if(!el) return;
  const D=getData();
  const txs=getGrafTxs().filter(t=>_txKind(t)!=='income');
  const m=S.curMonth, y=S.curYear;
  const days=new Date(y,m+1,0).getDate();
  const mTxs=txs.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});

  // kategorie → denní součty
  const F=window._grafF;
  const cats=(D.categories||[]).filter(c=>!F.cats.length||F.cats.includes(c.id));
  const rows=cats.map(c=>{
    const daily=Array(days).fill(0);
    mTxs.filter(t=>t.catId===c.id).forEach(t=>{
      const dd=new Date(t.date).getDate()-1;
      if(dd>=0&&dd<days) daily[dd]+=txCZK(t,D);
    });
    return { cat:c, daily, total:daily.reduce((a,b)=>a+b,0) };
  }).filter(r=>r.total>0).sort((a,b)=>b.total-a.total);

  const yrEl=document.getElementById('grafFilterYearRange');
  if(yrEl) yrEl.textContent=`${CZ_M[m]} ${y}`;

  if(!rows.length){
    el.innerHTML='<div class="card"><div class="empty"><div class="ei">📊</div><div class="et">Žádné výdaje v tomto měsíci</div></div></div>';
    return;
  }
  const globalMax=Math.max(...rows.map(r=>Math.max(...r.daily)),1);
  el.innerHTML=`
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:4px">
        <div class="card-title" style="margin:0">📊 Denní výdaje po kategoriích · ${CZ_M[m]} ${y}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn btn-ghost btn-sm" style="font-size:.72rem" onclick="changeGrafMonth(-1)">‹</button>
          <button class="btn btn-ghost btn-sm" style="font-size:.72rem;${window._denniSameScale?'border-color:rgba(139,124,246,.5);color:#b9aefc':''}" onclick="denniToggleScale()">${window._denniSameScale?'⚖️ Společná osa':'📐 Vlastní osa'}</button>
          <button class="btn btn-ghost btn-sm" style="font-size:.72rem" onclick="changeGrafMonth(1)">›</button>
        </div>
      </div>
      <div style="font-size:.72rem;color:#a8aec8;margin-bottom:12px">${rows.length} kategorií s výdaji · ${window._denniSameScale?'všechny grafy mají stejné měřítko (porovnatelné)':'každý graf má vlastní měřítko (vidíš tvar i u malých kategorií)'} · filtruj nahoře</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
        ${rows.map(r=>_denniMiniChart(r,days,globalMax)).join('')}
      </div>
    </div>`;
}

function _denniMiniChart(r,days,globalMax){
  const W=240,H=118,pad={l:34,r:6,t:8,b:16};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
  const maxV=window._denniSameScale?globalMax:Math.max(...r.daily,1);
  const slot=cW/days, bw=Math.max(1.6,Math.min(slot*0.66,7));
  const yf=v=>pad.t+cH*(1-v/maxV);
  const kf=v=>v>=1000?Math.round(v/1000)+'k':Math.round(v);
  let g='';
  [maxV,maxV/2,0].forEach(v=>{
    g+=`<line x1="${pad.l}" y1="${yf(v).toFixed(1)}" x2="${W-pad.r}" y2="${yf(v).toFixed(1)}" stroke="rgba(168,174,200,${v===0?'.35':'.14'})" stroke-width="1" ${v!==0?'stroke-dasharray="2,3"':''}/>`;
    g+=`<text x="${pad.l-4}" y="${(yf(v)+3).toFixed(1)}" text-anchor="end" font-size="8.5" fill="#a8aec8">${kf(v)}</text>`;
  });
  r.daily.forEach((v,i)=>{
    if(v>0){
      const x=pad.l+i*slot+(slot-bw)/2, yy=yf(v), hh=Math.max(yf(0)-yy,1.5);
      g+=`<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" rx="1.5" fill="#8b7cf6" opacity=".9"><title>${i+1}. ${CZ_M[S.curMonth]}: ${fmtB(Math.round(v))}</title></rect>`;
    }
  });
  [1,8,15,22,days].forEach(d2=>{ g+=`<text x="${(pad.l+(d2-1)*slot+slot/2).toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="8.5" fill="#a8aec8">${d2}</text>`; });
  const active=r.daily.filter(v=>v>0).length;
  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;margin-bottom:2px">
      <span style="font-size:.8rem;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.cat.icon} ${r.cat.name}</span>
      <span style="font-size:.78rem;font-weight:800;color:#f87171;white-space:nowrap">${fmtB(Math.round(r.total))}</span>
    </div>
    <div style="font-size:.68rem;color:#a8aec8;margin-bottom:4px">${active} ${active===1?'den':active<5?'dny':'dnů'} · max ${fmtB(Math.round(Math.max(...r.daily)))}</div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:${W}px;height:auto;display:block">${g}</svg>
  </div>`;
}

function switchGrafTab(tab, btn) {
  // S16.13 (Milan): filtr Projekty jen od Měsíčního výše – v Denním nedává smysl
  const pw=document.querySelector('.gf-wrap [data-gb="projects"]')?.closest('.gf-wrap');
  if(pw) pw.style.display = (tab==='denni'||tab==='obecne') ? 'none' : '';
  ['obecne','mesicni','rocni','vsechny','denni'].forEach(t => {  // S16.12: + denni
    const el = document.getElementById('gtab-'+t+'-content');
    if(el) el.style.display = t===tab ? 'block' : 'none';
    const b = document.getElementById('gtab-'+t);
    if(b) b.classList.toggle('active', t===tab);
  });
  // Month-nav: viditelný jen pro Obecné
  const mn = document.querySelector('.month-nav');
  if(mn) mn.style.display = tab==='obecne' ? '' : 'none';
  // Sdílené kompaktní filtry — Měsíční + Roční + Všechny roky (Roční↔Vsechny sdílí stav)
  const fw = document.getElementById('grafFilterWrap');
  if(fw) fw.style.display = (tab==='obecne') ? 'none' : 'flex';
  // Rok range zobrazit jen pro vsechny
  const yr = document.getElementById('grafFilterYearRange');
  if(yr) yr.style.display = tab==='vsechny' ? '' : 'none';
  requestAnimationFrame(() => {
    setTimeout(() => {
      if(tab==='obecne')  renderGrafy();
      else if(tab==='mesicni') renderMesicniGraf();
      else if(tab==='rocni')   renderRocniGraf();
      else if(tab==='vsechny') renderVsechnyRoky();
  else if(tab==='denni') renderDenniGrafy();  // S16.12
    }, 30);
  });
}

function getGrafTxs() {
  // S16.4 (P1-1): VŽDY bez splitParent a isBalancing (dřív se splity počítaly dvojitě
  //   a přesuny jako výdaje). Přesuny jen když je typ „Přesuny" zvolen.
  const D = getData();
  const F = window._grafF || { cats: [], subs: [], types: ['income','expense'] };
  return (D.transactions || []).filter(t=>{
    if(t.isBalancing || t.splitParent) return false;
    const kind = _txKind(t);
    if(!F.types.includes(kind)) return false;
    if(F.cats.length && !F.cats.includes(t.catId)) return false;
    if(F.subs.length && !F.subs.includes(t.subcat||t.subcategory||'')) return false;
    if(F.projects && F.projects.length && !F.projects.includes(t.projectId)) return false;  // S16.12
    return true;
  });
}

function changeGrafMonth(d) {
  if(!_grafMonth) { _grafMonth = S.curMonth; _grafYear2 = S.curYear; }
  _grafMonth += d;
  if(_grafMonth < 0) { _grafMonth = 11; _grafYear2--; }
  if(_grafMonth > 11) { _grafMonth = 0; _grafYear2++; }
  renderMesicniGraf();
}

function changeGrafYear(d) {
  if(!_grafYear2) _grafYear2 = S.curYear;
  _grafYear2 += d;
  renderRocniGraf();
}

function renderMesicniGraf(_tipOnly) {
  if(!_grafMonth && _grafMonth !== 0) { _grafMonth = S.curMonth; _grafYear2 = S.curYear; }
  const m = _grafMonth, y = _grafYear2;
  const label = document.getElementById('mesicniGrafLabel');
  if(label) label.textContent = CZ_M[m] + ' ' + y;

  const allTxs = getGrafTxs();
  const txs = allTxs.filter(t => {
    const d = new Date(t.date);
    return d.getMonth()===m && d.getFullYear()===y;
  });

  // Denní data
  const days = new Date(y, m+1, 0).getDate();
  const daily = Array(days).fill(0);
  const dailyCumul = Array(days).fill(0);
  // S16.4: výdajové křivky = výdaje + zvolené přesuny; částky v CZK (txCZK – FIX cizí měny)
  txs.filter(t=>_txKind(t)!=='income').forEach(t => {
    const d = new Date(t.date).getDate()-1;
    if(d>=0 && d<days) daily[d] += txCZK(t, undefined);
  });
  // Kumulativní
  let sum = 0;
  const cumul = daily.map(v => { sum+=v; return sum; });

  // Medián z posledních 6 měsíců
  let medians = [];
  for(let i=1;i<=6;i++) {
    let pm=m-i, py=y;
    if(pm<0){pm+=12;py--;}
    const ptxs = allTxs.filter(t=>{const d=new Date(t.date);return d.getMonth()===pm&&d.getFullYear()===py&&_txKind(t)!=='income';});
    const total = ptxs.reduce((a,t)=>a+txCZK(t, undefined),0);
    medians.push(total);
  }
  const medVal = medians.length ? medians.sort((a,b)=>a-b)[Math.floor(medians.length/2)] : 0;

  const canvas = document.getElementById('mesicniChart');
  if(!canvas) return;
  const W = canvas.parentElement.clientWidth||400;
  canvas.width=W; canvas.height=220;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,W,220);

  const pad={l:55,r:16,t:20,b:30};
  const cW=W-pad.l-pad.r, cH=220-pad.t-pad.b;
  const maxCumul = cumul.length ? cumul[cumul.length-1] : 0;
  const maxVal = Math.max(...daily, maxCumul, medVal||0, 1);
  const xf=i=>pad.l+(i+0.5)*(cW/days);
  const yf=v=>pad.t+cH-Math.max(0,Math.min(cH, v/maxVal*cH));

  // Grid
  ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;
  [0.25,0.5,0.75,1].forEach(f=>{
    const y2=pad.t+cH*(1-f);
    ctx.beginPath();ctx.moveTo(pad.l,y2);ctx.lineTo(W-pad.r,y2);ctx.stroke();
    ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='right';
    ctx.fillText(fmt(Math.round(czkToBase(maxVal*f))),pad.l-4,y2+3);
  });

  // Sloupce (denní výdaje)
  const bW = Math.max(2, cW/days - 2);
  daily.forEach((v,i)=>{
    if(v<=0)return;
    const h=v/maxVal*cH;
    ctx.fillStyle='rgba(96,165,250,.55)';
    ctx.fillRect(xf(i)-bW/2, pad.t+cH-h, bW, h);
  });

  // S16 (TODO-168): zelené podbarvení pod kumulací (sladěno se spodním grafem)
  const gradM = ctx.createLinearGradient(0, pad.t, 0, pad.t+cH);
  gradM.addColorStop(0,'rgba(74,222,128,.28)'); gradM.addColorStop(1,'rgba(74,222,128,0)');
  ctx.beginPath(); ctx.moveTo(xf(0), pad.t+cH);
  cumul.forEach((v,i)=>ctx.lineTo(xf(i), yf(v)));
  ctx.lineTo(xf(days-1), pad.t+cH); ctx.closePath(); ctx.fillStyle=gradM; ctx.fill();

  // Kumulativní křivka – přes všechny dny (rovně tam kde není data)
  ctx.strokeStyle='#4ade80';ctx.lineWidth=2.5;ctx.setLineDash([]);
  ctx.beginPath();
  cumul.forEach((v,i)=>{
    const x=xf(i), y2=yf(v);
    i===0?ctx.moveTo(x,y2):ctx.lineTo(x,y2);
  });
  ctx.stroke();

  // Medián linie (kompaktní label nahoře, ne přes linii)
  if(medVal>0) {
    const medY = yf(medVal);
    ctx.strokeStyle='#f87171';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(pad.l,medY);ctx.lineTo(W-pad.r,medY);ctx.stroke();
    ctx.setLineDash([]);
  }

  // Legenda – HTML div pod canvasem (čitelnější než canvas text)
  const legEl = document.getElementById('mesicniLegend');
  if(legEl) {
    legEl.innerHTML = `
      <span style="display:flex;align-items:center;gap:5px;font-size:.82rem;color:#a8aec8">
        <span style="display:inline-block;width:14px;height:10px;background:rgba(96,165,250,.6);border-radius:2px"></span>Denní výdaje
      </span>
      <span style="display:flex;align-items:center;gap:5px;font-size:.82rem;color:#a8aec8">
        <span style="display:inline-block;width:18px;height:2.5px;background:#4ade80;border-radius:2px"></span>Kumulace
      </span>
      ${medVal>0?`<span style="display:flex;align-items:center;gap:5px;font-size:.82rem;color:#f87171">
        <span style="display:inline-block;width:18px;height:0;border-top:2px dashed #f87171"></span>Medián ${fmtB(medVal)}
      </span>`:''}`;
  }

  // Osy X - dny
  // S16 (TODO-168): osa X po 2 dnech, čitelnější barva
  ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='center';ctx.setLineDash([]);
  for(let d=1;d<=days;d+=2){ ctx.fillText(d,xf(d-1),pad.t+cH+14); }
  if(days%2===0) ctx.fillText(days,xf(days-1),pad.t+cH+14);

  // S16 (TODO-168): interaktivní tooltip (hover + dotyk)
  canvas.onmousemove=function(e){
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left;
    const idx=Math.round((mx-pad.l)/(cW/days)-0.5);
    if(idx<0||idx>=days)return;
    renderMesicniGraf(true);
    const c2=canvas.getContext('2d');
    c2.strokeStyle='rgba(255,255,255,.25)';c2.lineWidth=1;
    c2.beginPath();c2.moveTo(xf(idx),pad.t);c2.lineTo(xf(idx),pad.t+cH);c2.stroke();
    const bx=Math.min(Math.max(xf(idx)+8,pad.l),W-176),by=pad.t+4;
    c2.fillStyle='rgba(26,29,46,.95)';c2.strokeStyle='rgba(255,255,255,.12)';
    c2.beginPath();c2.roundRect(bx,by,166,medVal>0?66:52,6);c2.fill();c2.stroke();
    c2.font='bold 11px Instrument Sans';c2.textAlign='left';c2.fillStyle='#e8eaf2';
    c2.fillText(`${idx+1}. ${CZ_M[m].slice(0,3)} ${y}`,bx+8,by+15);
    c2.font='10px Instrument Sans';
    c2.fillStyle='#60a5fa';c2.fillText('Den: '+fmtB(Math.round(daily[idx])),bx+8,by+30);
    c2.fillStyle='#4ade80';c2.fillText('Kumulace: '+fmtB(Math.round(cumul[idx])),bx+8,by+44);
    if(medVal>0){c2.fillStyle='#f87171';c2.fillText('vs medián: '+Math.round(cumul[idx]/medVal*100)+' %',bx+8,by+58);}
  };
  canvas.onmouseleave=function(){renderMesicniGraf(true);};
  attachChartTouch(canvas);

  // Statistiky
  const total = txs.filter(t=>_txKind(t)!=='income').reduce((a,t)=>a+txCZK(t, undefined),0);
  const income = txs.filter(t=>_txKind(t)==='income').reduce((a,t)=>a+txCZK(t, undefined),0);
  const statsEl = document.getElementById('mesicniStats');
  if(statsEl) statsEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <div style="text-align:center"><div style="font-size:.72rem;color:var(--text3)">Výdaje</div><div style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:700;color:var(--expense)">${fmtB(Math.round(total))}</div></div>
      <div style="text-align:center"><div style="font-size:.72rem;color:var(--text3)">Příjmy</div><div style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:700;color:var(--income)">${fmtB(Math.round(income))}</div></div>
      <div style="text-align:center"><div style="font-size:.72rem;color:var(--text3)">Saldo</div><div style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:700;color:${income-total>=0?'var(--income)':'var(--expense)'}">${fmtB(Math.round(income-total))}</div></div>
    </div>`;
  if(!_tipOnly) renderKumulChart(days, cumul, medVal, m, y, allTxs);
}

// ══════════════════════════════════════════════════════
//  v9.47 (TODO-204): HEATMAPA – sjednocené přechody barev
//  zelená = nízká hodnota · žlutá = střed · červená = vysoká
//  Škáluje se vůči MAXIMU ŘÁDKU, ne globálně – jinak by kategorie
//  s malými částkami byly vždy zelené a nešlo by v nich nic vyčíst.
// ══════════════════════════════════════════════════════
// ── v9.48 (FIX-224): jaký druh transakcí tabulky zobrazují ──
//  BUG: renderRocniGraf i renderVsechnyRoky měly natvrdo `_txKind(t)!=='income'`,
//  takže při filtru „Příjmy" se odfiltrovalo VŠECHNO a tabulka byla prázdná.
//  Typ přitom už filtruje getGrafTxs(); tahle podmínka byla navíc a proti filtru.
//  Když je zvolen jeden typ → ten. Když víc (výchozí Příjmy+Výdaje) → výdaje,
//  aby se nesčítaly dohromady dva různé směry peněz.
function _grafKind() {
  const t = (window._grafF && window._grafF.types) || ['income', 'expense'];
  if (!t.length) return 'expense';          // prázdný filtr = nic nevybráno → výchozí
  if (t.length === 1) return t[0];
  return t.indexOf('expense') >= 0 ? 'expense' : t[0];
}
function _grafKindLbl(k) { return k === 'income' ? 'Příjmy' : k === 'transfer' ? 'Přesuny' : 'Výdaje'; }

function _heatBg(v, max) {
  if (!v || !max || max <= 0) return 'transparent';
  const r = Math.max(0, Math.min(1, v / max));
  // 0 → zelená (74,222,128) · 0.5 → žlutá (251,191,36) · 1 → červená (248,113,113)
  let cr, cg, cb;
  if (r < 0.5) { const t = r / 0.5;
    cr = Math.round(74 + (251 - 74) * t); cg = Math.round(222 + (191 - 222) * t); cb = Math.round(128 + (36 - 128) * t);
  } else { const t = (r - 0.5) / 0.5;
    cr = Math.round(251 + (248 - 251) * t); cg = Math.round(191 + (113 - 191) * t); cb = Math.round(36 + (113 - 36) * t);
  }
  return `rgba(${cr},${cg},${cb},${(0.14 + r * 0.34).toFixed(2)})`;
}
function _heatFg(v, max) {
  const r = (!v || !max) ? 0 : Math.max(0, Math.min(1, v / max));
  return r > 0.72 ? '#ffd9d9' : '#e8eaf2';   // na sytě červené je světlejší text čitelnější
}

function renderRocniGraf() {
  if(!_grafYear2) _grafYear2 = S.curYear;
  const y = _grafYear2;
  const label = document.getElementById('rocniGrafYear');
  if(label) label.textContent = y;
  const labelNav = document.getElementById('rocniGrafLabel');
  if(labelNav) labelNav.textContent = y;

  const allTxs = getGrafTxs();
  const D = getData();
  // S16.4: multi-select – detail kategorie jen při výběru právě jedné
  const _fc=(window._grafF&&window._grafF.cats)||[];
  const cat = _fc.length===1 ? (D.categories||[]).find(c=>c.id===_fc[0]) : null;

  // Roční tabulka - měsíce jako sloupce, dny jako řádky
  const _pk = _grafKind();   // v9.48 (FIX-224): respektuj filtr typu, ne natvrdo výdaje
  const months = Array.from({length:12},(_,m)=>{
    const txs = allTxs.filter(t=>{
      const d=new Date(t.date);
      return d.getMonth()===m && d.getFullYear()===y && _txKind(t)===_pk;
    });
    return txs.reduce((a,t)=>a+txCZK(t, undefined),0);
  });

  const total = months.reduce((a,v)=>a+v,0);
  const nonZero = months.filter(v=>v>0);
  const avg = nonZero.length ? Math.round(total/nonZero.length) : 0;
  const maxM = Math.max(...months,1);

  // v9.48: „Roční tabulka" odstraněna – duplikovala matici Kategorie × měsíce,
  //  která nese stejná data a navíc ukazuje rozpad po kategoriích.
  const tableEl = document.getElementById('rocniTable');
  if (tableEl) tableEl.innerHTML = '';

  // ══ v9.47 (TODO-204, Milan dle Excelu): HEATMAPA KATEGORIE × MĚSÍCE ══
  //  Řeší: při zapnutém filtru nebylo v tabulce vidět, KTERÉ kategorie to jsou.
  //  Řádek = kategorie (respektuje filtr), sloupec = měsíc, barva = poměr v rámci řádku.
  const heatEl = document.getElementById('rocniHeat');
  if (heatEl) {
    const cats = (D.categories || []);
    const catName = id => { const c = cats.find(x => String(x.id) === String(id)); return c ? ((c.icon ? c.icon + ' ' : '') + c.name) : 'Bez kategorie'; };
    const byCat = {};
    allTxs.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() !== y || _txKind(t) !== _pk) return;
      const k = t.catId == null ? '_none' : String(t.catId);
      if (!byCat[k]) byCat[k] = Array.from({length: 12}, () => 0);
      byCat[k][d.getMonth()] += txCZK(t, undefined);
    });
    const rows = Object.keys(byCat).map(k => {
      const arr = byCat[k];
      const tot = arr.reduce((a, b) => a + b, 0);
      const nz = arr.filter(v => v > 0);
      return { k, arr, tot, max: Math.max(...arr), avg: nz.length ? tot / nz.length : 0 };
    }).filter(r => r.tot > 0).sort((a, b) => b.tot - a.tot);

    if (!rows.length) {
      heatEl.innerHTML = `<div style="font-size:.78rem;color:#a8aec8;padding:10px 2px">
        Pro rok ${y} a zvolený filtr (${_grafKindLbl(_pk)}) nejsou žádná data. Zkontrolováno: ${allTxs.length} transakcí ve filtru.</div>`;
    } else {
      const colTot = Array.from({length: 12}, (_, m) => rows.reduce((a, r) => a + r.arr[m], 0));
      const grand = colTot.reduce((a, b) => a + b, 0);
      const colMax = Math.max(...colTot);
      heatEl.innerHTML = `
        <div style="font-size:.78rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
          Kategorie × měsíce · ${y} · ${_grafKindLbl(_pk)} <span style="text-transform:none;letter-spacing:0;font-weight:400">· ${rows.length} kategorií · sytější = vyšší výdaj</span></div>
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:16px">
        <table style="width:100%;border-collapse:collapse;font-size:.76rem;white-space:nowrap;border:1px solid var(--border)">
          <thead><tr>
            <th style="position:sticky;left:0;background:var(--surface2);text-align:left;padding:6px 8px;font-size:.66rem;color:#a8aec8;letter-spacing:.04em;z-index:2;border:1px solid var(--border)">KATEGORIE</th>
            ${CZ_M.map(mn => `<th style="padding:6px 4px;font-size:.64rem;color:#a8aec8;border:1px solid var(--border)">${mn.slice(0,3).toUpperCase()}</th>`).join('')}
            <th style="padding:6px 8px;font-size:.64rem;color:#a8aec8;border-left:2px solid var(--border)">CELKEM</th>
            <th style="padding:6px 6px;font-size:.64rem;color:#a8aec8">Ø/MĚS</th>
          </tr></thead>
          <tbody>
            ${rows.map(r => `<tr>
              <td style="position:sticky;left:0;background:var(--surface);text-align:left;padding:5px 8px;font-weight:600;z-index:1;max-width:150px;overflow:hidden;text-overflow:ellipsis;border:1px solid var(--border)">${catName(r.k)}</td>
              ${r.arr.map(v => `<td style="text-align:right;padding:5px 4px;border:1px solid var(--border);background:${_heatBg(v, r.max)};color:${_heatFg(v, r.max)}">${v > 0 ? fmtB(Math.round(v)) : '<span style="color:#7e84a0">–</span>'}</td>`).join('')}
              <td style="text-align:right;padding:5px 8px;font-weight:800;color:var(--expense);border-left:2px solid var(--border)">${fmtB(Math.round(r.tot))}</td>
              <td style="text-align:right;padding:5px 6px;color:#a8aec8">${r.avg > 0 ? fmtB(Math.round(r.avg)) : '–'}</td>
            </tr>`).join('')}
            <tr style="border-top:2px solid var(--border);background:var(--surface2)">
              <td style="position:sticky;left:0;background:var(--surface2);text-align:left;padding:6px 8px;font-weight:800;z-index:1">Σ Suma</td>
              ${colTot.map(v => `<td style="text-align:right;padding:6px 4px;font-weight:700;border:1px solid var(--border);background:${_heatBg(v, colMax)};color:${_heatFg(v, colMax)}">${v > 0 ? fmtB(Math.round(v)) : '–'}</td>`).join('')}
              <td style="text-align:right;padding:6px 8px;font-weight:800;color:var(--expense);border-left:2px solid var(--border)">${fmtB(Math.round(grand))}</td>
              <td style="text-align:right;padding:6px 6px;color:#a8aec8">${fmtB(Math.round(grand / 12))}</td>
            </tr>
          </tbody>
        </table></div>
        <div style="display:flex;gap:12px;align-items:center;font-size:.68rem;color:#a8aec8;margin:-8px 0 16px 2px">
          <span>Méně</span>
          <span style="flex:0 0 120px;height:9px;border-radius:99px;background:linear-gradient(90deg,rgba(74,222,128,.35),rgba(251,191,36,.4),rgba(248,113,113,.48))"></span>
          <span>Více</span>
          <span style="color:#7e84a0">· barva se počítá v rámci řádku (kategorie)</span>
        </div>`;
    }
  }

  // ══ v9.48 (TODO-207): dva grafy v Ročních ══
  const chartsEl = document.getElementById('rocniCharts');
  if (chartsEl) {
    chartsEl.innerHTML = `
      <div style="font-size:.78rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin:4px 0 8px">
        ${_grafKindLbl(_pk)} po měsících · s průměrem</div>
      <canvas id="rocniBarsCanvas" height="210" style="width:100%;display:block;margin-bottom:18px"></canvas>
      <div style="font-size:.78rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
        Kumulace leden–prosinec ${y}</div>
      <canvas id="rocniCumCanvas" height="190" style="width:100%;display:block"></canvas>`;
    setTimeout(() => {
      drawVrBars(CZ_M.map(m => m.slice(0,3)), months, _grafKindLbl(_pk), 'rocniBarsCanvas');
      drawVrCum(CZ_M.map(m => m.slice(0,3)), months, 'rocniCumCanvas');
    }, 50);
  }

  // Statistiky pod grafem
  const statsEl = document.getElementById('rocniStats');
  if(statsEl) {
    const std = nonZero.length > 1 ? Math.sqrt(nonZero.reduce((a,v)=>a+(v-avg)**2,0)/nonZero.length) : 0;
    statsEl.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center">
        <div><div style="font-size:.7rem;color:var(--text3)">Celkem</div><div style="font-weight:700;font-family:'Syne',sans-serif">${fmtB(Math.round(total))}</div></div>
        <div><div style="font-size:.7rem;color:var(--text3)">Průměr/měs</div><div style="font-weight:700;font-family:'Syne',sans-serif">${fmtB(avg)}</div></div>
        <div><div style="font-size:.7rem;color:var(--text3)">Maximum</div><div style="font-weight:700;color:var(--expense);font-family:'Syne',sans-serif">${fmtB(Math.round(Math.max(...months)))}</div></div>
        <div><div style="font-size:.7rem;color:var(--text3)">Sm. odchylka</div><div style="font-weight:700;font-family:'Syne',sans-serif">${fmtB(Math.round(std))}</div></div>
      </div>`;
  }
}


// ══════════════════════════════════════════════════════
//  VŠECHNY ROKY – tabulka + krabicový graf (v6.39)
// ══════════════════════════════════════════════════════
let _vrCat = '';   // v9.47: vybraná kategorie pro matici měsíce × roky
function vrSetCat(v){ _vrCat = v; renderVsechnyRoky(); }

function renderVsechnyRoky() {
  const el = document.getElementById('gtab-vsechny-content'); if(!el) return;
  const D = getData();
  const allTxs = getGrafTxs(); // FIX: respektuj filtry kategorie/podkategorie/typ

  // Zjisti rozsah let
  const years = [...new Set(allTxs.map(t => new Date(t.date).getFullYear()))].sort();
  if(!years.length) {
    el.innerHTML = '<div class="empty"><div class="et">Žádná data</div></div>';
    return;
  }

  const _vrKind = _grafKind();   // v9.48 (FIX-224): respektuj filtr typu
  // Pro každý rok × každý měsíc spočítej výdaje
  const data = {}; // year → [jan..dec]
  years.forEach(y => {
    data[y] = Array.from({length:12}, (_,m) => {
      return allTxs.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear()===y && d.getMonth()===m && _txKind(t)===_vrKind;
      }).reduce((a,t) => a+txCZK(t, undefined), 0);
    });
  });

  // Kategorie filtr
  // FIX: nyní čteme z grafFilterWrap (sdíleno s Roční záložkou)
  // Aktualizuj rok range v hlavičce filtru
  const yrEl = document.getElementById('grafFilterYearRange');
  if(yrEl && years.length) yrEl.textContent = years[0] + ' – ' + years[years.length-1];

  // ══ S16.12 (Milan, dle jeho Excelu): MATICE KATEGORIE × ROKY se sumářem ══
  //   Řádek = kategorie, sloupec = rok, poslední sloupec + poslední řádek = součty.
  //   Respektuje filtry nahoře (vybrané kategorie / podkategorie / typ / projekty).
  const F2 = window._grafF || {cats:[]};
  const catsAll = (D.categories||[]).filter(c=>!F2.cats.length||F2.cats.includes(c.id));
  const mat = catsAll.map(c=>{
    const vals = years.map(y => allTxs.filter(t=>{
      const d=new Date(t.date);
      return d.getFullYear()===y && t.catId===c.id && _txKind(t)!=='income';
    }).reduce((a,t)=>a+txCZK(t,D),0));
    return { cat:c, vals, total: vals.reduce((a,b)=>a+b,0) };
  }).filter(r=>r.total>0).sort((a,b)=>b.total-a.total);
  const colSums = years.map((_,i)=>mat.reduce((a,r)=>a+r.vals[i],0));
  const grand = colSums.reduce((a,b)=>a+b,0);
  const matMax = Math.max(...mat.flatMap(r=>r.vals), 1);
  // v9.48: sjednoceno se zbytkem – zelená = nízká, červená = vysoká (dřív fialový odstín)
  const cell = (v)=>{
    if(!v) return `<td style="text-align:right;color:#5a6078;border:1px solid var(--border)">–</td>`;
    return `<td style="text-align:right;border:1px solid var(--border);background:${_heatBg(v,matMax)};color:${_heatFg(v,matMax)};font-weight:${v/matMax>0.5?'700':'500'}">${fmt(Math.round(czkToBase(v)))}</td>`;
  };
  let matHtml = mat.length ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">🗂️ Kategorie × roky <span style="font-size:.72rem;font-weight:400;color:#a8aec8">· ${mat.length} kategorií · zelená = nízká, červená = vysoká</span></div>
      <div style="overflow-x:auto">
      <table class="pred-tbl" style="min-width:${180+years.length*74}px">
        <thead><tr>
          <th style="position:sticky;left:0;background:var(--surface2);text-align:left;z-index:2;min-width:150px">Kategorie</th>
          ${years.map(y=>`<th style="text-align:right">${y}</th>`).join('')}
          <th style="border-left:2px solid var(--border);color:var(--debt);text-align:right">Celkem</th>
        </tr></thead>
        <tbody>
          ${mat.map(r=>`<tr>
            <td style="position:sticky;left:0;background:var(--surface2);text-align:left;z-index:1;white-space:nowrap">${r.cat.icon} ${r.cat.name}</td>
            ${r.vals.map(v=>cell(v)).join('')}
            <td style="border-left:2px solid var(--border);text-align:right;font-weight:800;color:#f87171">${fmt(Math.round(czkToBase(r.total)))}</td>
          </tr>`).join('')}
          <tr style="border-top:2px solid var(--border);background:rgba(255,255,255,.03)">
            <td style="position:sticky;left:0;background:var(--surface2);text-align:left;font-weight:800;z-index:1;border:1px solid var(--border)">Σ Suma</td>
            ${colSums.map(v=>`<td style="text-align:right;font-weight:800;color:#fbbf24;border:1px solid var(--border)">${v?fmt(Math.round(czkToBase(v))):'–'}</td>`).join('')}
            <td style="border-left:2px solid var(--border);text-align:right;font-weight:800;color:#fbbf24">${fmt(Math.round(czkToBase(grand)))}</td>
          </tr>
          <!-- v9.48: Průměr = přes všechny kategorie · Průměr>0 = jen z nenulových -->
          <tr style="background:rgba(255,255,255,.02)">
            <td style="position:sticky;left:0;background:var(--surface2);text-align:left;font-weight:700;z-index:1;border:1px solid var(--border)">Ø Průměr</td>
            ${years.map((_,yi)=>{ const v = mat.length ? colSums[yi]/mat.length : 0;
              return `<td style="text-align:right;color:#60a5fa;border:1px solid var(--border)">${v?fmt(Math.round(czkToBase(v))):'–'}</td>`; }).join('')}
            <td style="border-left:2px solid var(--border);text-align:right;color:#60a5fa;font-weight:700">${mat.length?fmt(Math.round(czkToBase(grand/mat.length))):'–'}</td>
          </tr>
          <tr style="background:rgba(255,255,255,.02)">
            <td style="position:sticky;left:0;background:var(--surface2);text-align:left;font-weight:700;z-index:1;border:1px solid var(--border)">Ø Průměr &gt; 0</td>
            ${years.map((_,yi)=>{ const nz = mat.map(r=>r.vals[yi]).filter(v=>v>0);
              const v = nz.length ? nz.reduce((a,b)=>a+b,0)/nz.length : 0;
              return `<td style="text-align:right;color:#4ade80;border:1px solid var(--border)">${v?fmt(Math.round(czkToBase(v))):'–'}</td>`; }).join('')}
            ${(()=>{ const nzAll = mat.flatMap(r=>r.vals).filter(v=>v>0);
              const v = nzAll.length ? nzAll.reduce((a,b)=>a+b,0)/nzAll.length : 0;
              return `<td style="border-left:2px solid var(--border);text-align:right;color:#4ade80;font-weight:700">${v?fmt(Math.round(czkToBase(v))):'–'}</td>`; })()}
          </tr>
        </tbody>
      </table>
      </div>
    </div>` : '';

  // v9.48: tabulka ROK × měsíce odstraněna – matice jedné kategorie níže
  //  ukazuje totéž, ale čitelněji a bez míchání kategorií dohromady.
  let html = matHtml;

  // ══ v9.47 (TODO-205, Milan dle Excelu): MATICE JEDNÉ KATEGORIE ══
  //  Dřív tabulka mísila všechny kategorie dohromady. Nyní se vybere jedna
  //  a rozpadne se na měsíce × roky – tam jsou vzorce vidět (sezónnost,
  //  kdy kategorie vznikla, kdy skončila).
  const _vrCats = (D.categories || []);
  const _selCats = (window._grafF && window._grafF.cats) || [];
  //  Nabídka odráží filtr nahoře; když není nic vybráno, nabídnou se kategorie s daty.
  const _catsWithData = [...new Set(allTxs.filter(t => _txKind(t) === _vrKind).map(t => t.catId == null ? '_none' : String(t.catId)))];
  const _optIds = (_selCats.length ? _selCats.map(String) : _catsWithData);
  if (!_vrCat || _optIds.indexOf(String(_vrCat)) < 0) _vrCat = _optIds[0] || '';

  const _cName = id => { if (String(id) === '_none') return 'Bez kategorie';
    const c = _vrCats.find(x => String(x.id) === String(id)); return c ? ((c.icon ? c.icon + ' ' : '') + c.name) : ('#' + id); };

  //  Data pro vybranou kategorii: řádek = měsíc, sloupec = rok
  const mx = Array.from({length: 12}, () => Array.from({length: years.length}, () => 0));
  allTxs.forEach(t => {
    if (_txKind(t) !== _vrKind) return;
    const k = t.catId == null ? '_none' : String(t.catId);
    if (k !== String(_vrCat)) return;
    const d = new Date(t.date); const yi = years.indexOf(d.getFullYear());
    if (yi < 0) return;
    mx[d.getMonth()][yi] += txCZK(t, undefined);
  });
  const colSum = years.map((_, yi) => mx.reduce((a, r) => a + r[yi], 0));
  const colAvgNZ = years.map((_, yi) => { const nz = mx.map(r => r[yi]).filter(v => v > 0); return nz.length ? nz.reduce((a, b) => a + b, 0) / nz.length : 0; });
  const mxMax = Math.max(1, ...mx.map(r => Math.max(...r)));

  html += `<div style="font-size:.78rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin:18px 0 8px">
      Jedna kategorie · měsíce × roky</div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <select onchange="vrSetCat(this.value)" style="padding:6px 10px;border-radius:9px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:.8rem;font-family:inherit;max-width:100%">
        ${_optIds.map(id => `<option value="${id}"${String(id) === String(_vrCat) ? ' selected' : ''}>${_cName(id)}</option>`).join('')}
      </select>
      <span style="font-size:.68rem;color:#a8aec8">${_selCats.length ? 'nabídka podle filtru nahoře' : 'všechny kategorie s daty'}</span>
    </div>`;

  if (!_optIds.length) {
    html += `<div style="font-size:.78rem;color:#a8aec8;margin-bottom:16px">Ve zvoleném filtru nejsou žádné výdajové kategorie.</div>`;
  } else {
    html += `<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:6px">
      <table style="border-collapse:collapse;font-size:.76rem;white-space:nowrap;border:1px solid var(--border)">
        <thead><tr>
          <th style="position:sticky;left:0;background:var(--surface2);padding:5px 8px;font-size:.64rem;color:#a8aec8;z-index:2;border:1px solid var(--border);width:52px">MĚS</th>
          ${years.map(y => `<th style="padding:5px 8px;font-size:.64rem;color:#a8aec8;border:1px solid var(--border);width:84px">${y}</th>`).join('')}
        </tr></thead><tbody>
        ${mx.map((row, m) => `<tr>
          <td style="position:sticky;left:0;background:var(--surface);padding:4px 8px;font-weight:700;z-index:1;border:1px solid var(--border)">${m + 1}</td>
          ${row.map(v => `<td style="text-align:right;padding:4px 8px;border:1px solid var(--border);background:${_heatBg(v, mxMax)};color:${_heatFg(v, mxMax)}">${v > 0 ? fmtB(Math.round(v)) : '<span style="color:#7e84a0">0</span>'}</td>`).join('')}
        </tr>`).join('')}
        <tr style="border-top:2px solid var(--border);background:var(--surface2)">
          <td style="position:sticky;left:0;background:var(--surface2);padding:5px 8px;font-weight:800;z-index:1;border:1px solid var(--border)">Ø</td>
          ${colAvgNZ.map(v => `<td style="text-align:right;padding:5px 8px;font-weight:700;color:var(--debt);border:1px solid var(--border)">${v > 0 ? fmtB(Math.round(v)) : '–'}</td>`).join('')}
        </tr>
        <tr style="background:var(--surface2)">
          <td style="position:sticky;left:0;background:var(--surface2);padding:5px 8px;font-weight:800;z-index:1;border:1px solid var(--border)">Celk</td>
          ${colSum.map(v => `<td style="text-align:right;padding:5px 8px;font-weight:800;color:var(--expense);border:1px solid var(--border)">${v > 0 ? fmtB(Math.round(v)) : '–'}</td>`).join('')}
        </tr>
      </tbody></table></div>
      <div style="font-size:.68rem;color:#a8aec8;margin-bottom:16px">Ø = průměr z měsíců s nenulovým výdajem · barva se počítá napříč celou maticí</div>`;
  }

  // Krabicový graf (box plot) - výdaje per rok
  html += `<div style="font-size:.78rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Krabicový graf – rozložení měsíčních výdajů</div>
    <canvas id="vsechnyBoxCanvas" height="220" style="width:100%;display:block;margin-bottom:16px"></canvas>`;

  // Řádkový graf - roční součty
  html += `<div style="font-size:.78rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Roční výdaje</div>
    <canvas id="vsechnyLineCanvas" height="160" style="width:100%;display:block;margin-bottom:18px"></canvas>`;

  // ══ v9.47 (TODO-206, Milan dle Excelu): SLOUPCE S PRŮMĚREM + KUMULACE ══
  //  Jmenuje se to Grafy, ne tabulky – roční součty jako sloupce s červenou
  //  linkou průměru (hned je vidět rok nad/pod) a vedle kumulace v čase.
  const _vrKindLbl = _grafKindLbl(_vrKind);
  html += `<div style="font-size:.78rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
      ${_vrKindLbl} po letech · s průměrem</div>
    <canvas id="vrBarsCanvas" height="210" style="width:100%;display:block;margin-bottom:18px"></canvas>
    <div style="font-size:.78rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
      Kumulace · kolik celkem od ${years[0]}</div>
    <canvas id="vrCumCanvas" height="190" style="width:100%;display:block"></canvas>`;

  el.innerHTML = html;

  // Nakresli grafy
  setTimeout(() => {
    drawVsechnyBoxPlot(years, data);
    drawVsechnyLine(years, data);
    const totals = years.map(y => data[y].reduce((a, b) => a + b, 0));
    drawVrBars(years, totals, _vrKindLbl);
    drawVrCum(years, totals);
  }, 50);
}

// ══ v9.49: sdílený tooltip pro grafy Roční/Všechny roky ══
//  Po vykreslení si uložíme snímek plátna. Při hoveru ho jen obnovíme
//  a dokreslíme bublinu – překreslovat celý graf při každém pohybu myši
//  by na dlouhé historii sekalo.
function _vrAttachTip(cv, ctx, W, H, hit) {
  let base = null;
  try { base = ctx.getImageData(0, 0, W, H); } catch (e) { return; }
  cv.onmousemove = function (e) {
    const rect = cv.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    ctx.putImageData(base, 0, 0);
    const h = hit(mx, my); if (!h) return;

    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(h.x, 12); ctx.lineTo(h.x, H - 26); ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x, h.y, 4.5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();

    ctx.font = '700 11px system-ui';
    const w = Math.max(86, ctx.measureText(h.v).width + 20, ctx.measureText(h.t).width + 20);
    let tx = h.x + 10; if (tx + w > W - 4) tx = h.x - w - 10;
    const ty = Math.max(6, Math.min(h.y - 34, H - 52));
    ctx.fillStyle = 'rgba(26,29,46,.96)'; ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath(); ctx.roundRect(tx, ty, w, 42, 7); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a8aec8'; ctx.font = '10px system-ui'; ctx.fillText(h.t, tx + 9, ty + 15);
    ctx.fillStyle = '#e8eaf2'; ctx.font = '700 12px system-ui'; ctx.fillText(h.v, tx + 9, ty + 32);
  };
  cv.onmouseleave = function () { try { ctx.putImageData(base, 0, 0); } catch (e) {} };
  if (typeof attachChartTouch === 'function') attachChartTouch(cv);
}

// ══ v9.47: sloupce ročních součtů + červená linka průměru ══
function drawVrBars(years, totals, kindLbl, canvasId) {
  const cv = document.getElementById(canvasId || 'vrBarsCanvas'); if (!cv) return;
  const W = (cv.parentElement && cv.parentElement.clientWidth) || 600;  // skrytý tab má 0 → fallback
  if (!W) return;
  const H = 210; cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, W, H);
  const n = years.length; if (!n) return;
  const maxV = Math.max(...totals, 1);
  const avg = totals.reduce((a, b) => a + b, 0) / n;
  const pad = { l: 58, r: 14, t: 16, b: 30 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const yf = v => pad.t + cH * (1 - v / maxV);

  ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
  ctx.font = '10px system-ui'; ctx.textAlign = 'right';
  [0, .25, .5, .75, 1].forEach(f => {
    const yy = pad.t + cH * (1 - f);
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(W - pad.r, yy); ctx.stroke();
    ctx.fillStyle = '#a8aec8'; ctx.fillText(fmtB(Math.round(maxV * f)), pad.l - 7, yy + 3);
  });
  ctx.setLineDash([]);

  const bw = Math.min(46, cW / n * 0.62);
  years.forEach((y, i) => {
    const x = pad.l + cW * ((i + 0.5) / n);
    const v = totals[i]; const h = cH * (v / maxV);
    const g = ctx.createLinearGradient(0, yf(v), 0, pad.t + cH);
    g.addColorStop(0, v >= avg ? 'rgba(96,165,250,.95)' : 'rgba(96,165,250,.55)');
    g.addColorStop(1, 'rgba(96,165,250,.18)');
    ctx.fillStyle = g; ctx.fillRect(x - bw / 2, yf(v), bw, h);
    ctx.fillStyle = '#a8aec8'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(String(y), x, H - 10);
  });

  // červená linka průměru
  ctx.strokeStyle = '#f87171'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad.l, yf(avg)); ctx.lineTo(W - pad.r, yf(avg)); ctx.stroke();
  ctx.fillStyle = '#f87171'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('Ø ' + fmtB(Math.round(avg)), pad.l + 4, yf(avg) - 5);

  ctx.fillStyle = '#7e84a0'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
  ctx.fillText(kindLbl + ' (Kč) · osa X: ' + (canvasId ? 'měsíce' : 'roky'), W - pad.r, pad.t - 4);

  // v9.49: tooltip – nejbližší sloupec podle vodorovné pozice
  _vrAttachTip(cv, ctx, W, H, (mx) => {
    let bi = -1, bd = 1e9;
    for (let i = 0; i < n; i++) { const x = pad.l + cW * ((i + 0.5) / n); const d = Math.abs(mx - x); if (d < bd) { bd = d; bi = i; } }
    if (bi < 0 || bd > cW / n) return null;
    const v = totals[bi];
    const diff = v - avg;
    return { x: pad.l + cW * ((bi + 0.5) / n), y: yf(v),
             t: String(years[bi]) + (diff >= 0 ? '  ▲ nad Ø' : '  ▼ pod Ø'),
             v: fmtB(Math.round(v)) + ' Kč  (' + (diff >= 0 ? '+' : '') + fmtB(Math.round(diff)) + ')' };
  });
}

// ══ v9.47: kumulace – kolik celkem od prvního roku ══
function drawVrCum(years, totals, canvasId) {
  const cv = document.getElementById(canvasId || 'vrCumCanvas'); if (!cv) return;
  const W = (cv.parentElement && cv.parentElement.clientWidth) || 600; if (!W) return;
  const H = 190; cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, W, H);
  const n = years.length; if (!n) return;
  let run = 0; const cum = totals.map(v => (run += v));
  const maxV = Math.max(...cum, 1);
  const pad = { l: 62, r: 14, t: 16, b: 30 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const yf = v => pad.t + cH * (1 - v / maxV);
  const xf = i => pad.l + (n === 1 ? cW / 2 : cW * (i / (n - 1)));

  ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
  [0, .5, 1].forEach(f => { const yy = pad.t + cH * (1 - f);
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(W - pad.r, yy); ctx.stroke();
    ctx.fillStyle = '#a8aec8'; ctx.fillText(fmtB(Math.round(maxV * f)), pad.l - 7, yy + 3); });
  ctx.setLineDash([]);

  const g = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
  g.addColorStop(0, 'rgba(74,222,128,.32)'); g.addColorStop(1, 'rgba(74,222,128,0)');
  ctx.beginPath(); ctx.moveTo(xf(0), pad.t + cH);
  cum.forEach((v, i) => ctx.lineTo(xf(i), yf(v)));
  ctx.lineTo(xf(n - 1), pad.t + cH); ctx.closePath(); ctx.fillStyle = g; ctx.fill();

  ctx.beginPath(); cum.forEach((v, i) => i ? ctx.lineTo(xf(i), yf(v)) : ctx.moveTo(xf(i), yf(v)));
  ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.2; ctx.stroke();
  cum.forEach((v, i) => { ctx.beginPath(); ctx.arc(xf(i), yf(v), 3.4, 0, 7); ctx.fillStyle = '#4ade80'; ctx.fill(); });

  ctx.fillStyle = '#a8aec8'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
  years.forEach((y, i) => { if (n <= 8 || i % 2 === 0) ctx.fillText(String(y), xf(i), H - 10); });
  ctx.fillStyle = '#7e84a0'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
  ctx.fillText('Kumulativně (Kč) · osa X: ' + (canvasId ? 'měsíce' : 'roky'), W - pad.r, pad.t - 4);

  // v9.49: tooltip – kumulace k danému bodu + přírůstek
  _vrAttachTip(cv, ctx, W, H, (mx) => {
    let bi = -1, bd = 1e9;
    for (let i = 0; i < n; i++) { const d = Math.abs(mx - xf(i)); if (d < bd) { bd = d; bi = i; } }
    if (bi < 0) return null;
    return { x: xf(bi), y: yf(cum[bi]),
             t: String(years[bi]) + '  ·  přírůstek ' + fmtB(Math.round(totals[bi])),
             v: fmtB(Math.round(cum[bi])) + ' Kč celkem' };
  });
}

function drawVsechnyBoxPlot(years, data) {
  const cv = document.getElementById('vsechnyBoxCanvas'); if(!cv) return;
  const W = cv.parentElement.clientWidth || 600;
  cv.width = W; cv.height = 220;
  const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, W, 220);

  const n = years.length;
  if(!n) return;

  // Spočítej statistiky pro každý rok
  const stats = years.map(y => {
    const vals = data[y].filter(v=>v>0).sort((a,b)=>a-b);
    if(!vals.length) return null;
    const q1 = vals[Math.floor(vals.length*0.25)];
    const q3 = vals[Math.floor(vals.length*0.75)];
    const med = vals[Math.floor(vals.length/2)];
    const min = vals[0];
    const max = vals[vals.length-1];
    const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
    return {q1,q3,med,min,max,avg,vals};
  }).filter(Boolean);

  if(!stats.length) return;

  const maxV = Math.max(...stats.map(s=>s.max), 1);
  const pad = {l:55,r:16,t:20,b:28};
  const cW = W-pad.l-pad.r, cH = 220-pad.t-pad.b;
  const yf = v => pad.t + cH*(1-v/maxV);
  const boxW = Math.min(40, cW/n*0.5);

  // Grid
  ctx.setLineDash([3,4]); ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1;
  [0.25,0.5,0.75,1].forEach(f => {
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t+cH*(1-f)); ctx.lineTo(W-pad.r, pad.t+cH*(1-f)); ctx.stroke();
    ctx.fillStyle='#a8aec8'; ctx.font='10px Instrument Sans'; ctx.textAlign='right';  // S16.7 (T1/T4)
    ctx.fillText(fmt(Math.round(czkToBase(maxV*f)/1000))+'k', pad.l-3, pad.t+cH*(1-f)+4);
  });
  ctx.setLineDash([]);

  const colors = ['#60a5fa','#4ade80','#f59e0b','#f87171','#a78bfa','#34d399','#fb923c','#e879f9','#facc15'];

  stats.forEach((s, i) => {
    const cx = pad.l + (i+0.5)*(cW/n);
    const color = colors[i % colors.length];

    // Whiskers
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, yf(s.min)); ctx.lineTo(cx, yf(s.max)); ctx.stroke();
    [s.min, s.max].forEach(v => {
      ctx.beginPath(); ctx.moveTo(cx-boxW*0.3, yf(v)); ctx.lineTo(cx+boxW*0.3, yf(v)); ctx.stroke();
    });

    // Box Q1-Q3
    const bx = cx - boxW/2;
    const by = yf(s.q3);
    const bh = yf(s.q1) - yf(s.q3);
    ctx.fillStyle = color+'33'; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.fillRect(bx, by, boxW, bh);
    ctx.strokeRect(bx, by, boxW, bh);

    // Medián
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx, yf(s.med)); ctx.lineTo(bx+boxW, yf(s.med)); ctx.stroke();

    // Průměr ×
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign='center';
    ctx.fillText('×', cx, yf(s.avg)+4);

    // Rok label
    ctx.fillStyle='#e8eaf2'; ctx.font='600 10px Instrument Sans'; ctx.textAlign='center';
    ctx.fillText(years[i], cx, 220-8);
  });

  // S16.7 (T1): tooltip – rok pod kurzorem
  const baseImg = ctx.getImageData(0,0,W,220);
  cv.onmousemove = function(e){
    const rect=cv.getBoundingClientRect();
    const mx=e.clientX-rect.left;
    ctx.putImageData(baseImg,0,0);
    const i=Math.floor((mx-pad.l)/(cW/n));
    if(i<0||i>=stats.length) return;
    const st=stats[i];
    const rows=[['Max',st.max],['Q3',st.q3],['Medián',st.med],['Průměr',st.avg],['Q1',st.q1],['Min',st.min]];
    const bx2=Math.min(Math.max(mx+10,pad.l),W-152), by2=pad.t+2;
    ctx.fillStyle='rgba(26,29,46,.95)';ctx.strokeStyle='rgba(255,255,255,.12)';
    ctx.beginPath();ctx.roundRect(bx2,by2,144,7*14+10,6);ctx.fill();ctx.stroke();
    ctx.font='bold 11px Instrument Sans';ctx.textAlign='left';ctx.fillStyle='#e8eaf2';
    ctx.fillText(String(years[i]),bx2+9,by2+15);
    ctx.font='10px Instrument Sans';
    rows.forEach((r2,i2)=>{ ctx.fillStyle=i2===2?'#4ade80':i2===3?'#fbbf24':'#c9cede';
      ctx.fillText(`${r2[0]}: ${fmtB(Math.round(r2[1]))}`,bx2+9,by2+30+i2*14); });
  };
  cv.onmouseleave = function(){ ctx.putImageData(baseImg,0,0); };
  if(typeof attachChartTouch==='function') attachChartTouch(cv);
}

function drawVsechnyLine(years, data) {
  const cv = document.getElementById('vsechnyLineCanvas'); if(!cv) return;
  const W = cv.parentElement.clientWidth || 600;
  cv.width = W; cv.height = 160;
  const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, W, 160);

  const totals = years.map(y => data[y].reduce((a,b)=>a+b,0));
  const maxV = Math.max(...totals, 1);
  const n = years.length;
  const pad = {l:55,r:16,t:14,b:24};
  const cW = W-pad.l-pad.r, cH = 160-pad.t-pad.b;
  const xf = i => pad.l + (n<2 ? cW/2 : i/(n-1)*cW);
  const yf = v => pad.t + cH*(1-v/maxV);

  ctx.setLineDash([3,4]); ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1;
  [0.25,0.5,0.75,1].forEach(f => {
    ctx.beginPath(); ctx.moveTo(pad.l,pad.t+cH*(1-f)); ctx.lineTo(W-pad.r,pad.t+cH*(1-f)); ctx.stroke();
    ctx.fillStyle='#a8aec8'; ctx.font='10px Instrument Sans'; ctx.textAlign='right';  // S16.7 (T1/T4)
    ctx.fillText(fmt(Math.round(czkToBase(maxV*f)/1000))+'k', pad.l-3, pad.t+cH*(1-f)+4);
  });
  ctx.setLineDash([]);

  // Area
  const r=parseInt('60',16),g=parseInt('a5',16),b=parseInt('fa',16);
  const grad=ctx.createLinearGradient(0,pad.t,0,160-pad.b);
  grad.addColorStop(0,`rgba(${r},${g},${b},.3)`); grad.addColorStop(1,`rgba(${r},${g},${b},0)`);
  ctx.beginPath(); ctx.moveTo(xf(0),160-pad.b);
  totals.forEach((v,i)=>ctx.lineTo(xf(i),yf(v)));
  ctx.lineTo(xf(n-1),160-pad.b); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();

  ctx.strokeStyle='#60a5fa'; ctx.lineWidth=2.5; ctx.beginPath();
  totals.forEach((v,i)=>i===0?ctx.moveTo(xf(i),yf(v)):ctx.lineTo(xf(i),yf(v)));
  ctx.stroke();

  totals.forEach((v,i)=>{
    ctx.beginPath(); ctx.arc(xf(i),yf(v),3,0,Math.PI*2);
    ctx.fillStyle='#60a5fa'; ctx.fill();
  });

  ctx.fillStyle='#e8eaf2'; ctx.font='600 10px Instrument Sans'; ctx.textAlign='center';
  years.forEach((y,i) => ctx.fillText(y, xf(i), 160-6));

  // S16.7 (T1): tooltip – roční součet + srovnání s předchozím rokem
  const baseImg = ctx.getImageData(0,0,W,160);
  cv.onmousemove = function(e){
    const rect=cv.getBoundingClientRect();
    const mx=e.clientX-rect.left;
    ctx.putImageData(baseImg,0,0);
    let best=0,bd=1e9; totals.forEach((_,i)=>{ const d2=Math.abs(xf(i)-mx); if(d2<bd){bd=d2;best=i;} });
    if(bd>60) return;
    ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(xf(best),pad.t);ctx.lineTo(xf(best),pad.t+cH);ctx.stroke();
    const prev=best>0?totals[best-1]:0;
    const dTxt=prev>0?` (${totals[best]>=prev?'+':''}${Math.round((totals[best]-prev)/prev*100)} % vs ${years[best-1]})`:'';
    const bx2=Math.min(Math.max(xf(best)+8,pad.l),W-190), by2=pad.t+2;
    ctx.fillStyle='rgba(26,29,46,.95)';ctx.strokeStyle='rgba(255,255,255,.12)';
    ctx.beginPath();ctx.roundRect(bx2,by2,182,40,6);ctx.fill();ctx.stroke();
    ctx.font='bold 11px Instrument Sans';ctx.textAlign='left';ctx.fillStyle='#e8eaf2';
    ctx.fillText(String(years[best]),bx2+9,by2+15);
    ctx.font='10px Instrument Sans';ctx.fillStyle='#f87171';
    ctx.fillText(`Výdaje ${fmtB(Math.round(totals[best]))}${dTxt}`,bx2+9,by2+30);
  };
  cv.onmouseleave = function(){ ctx.putImageData(baseImg,0,0); };
  if(typeof attachChartTouch==='function') attachChartTouch(cv);
}

function renderKumulChart(days, cumul, medVal, m, y, allTxs) {
  const canvas=document.getElementById('kumulChart'); if(!canvas) return;
  let W=canvas.parentElement.getBoundingClientRect().width;
  if(!W||W<50) W=canvas.parentElement.clientWidth||400;
  canvas.width=W; canvas.height=190;
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,W,190);

  // S16 (TODO-168): graf přepracován – dřív duplikoval horní (stejná kumulace + medián).
  // Nově SROVNÁNÍ TEMPA den po dni: tento měsíc vs minulý měsíc vs průměr 6 měsíců.
  const cumulOf=(mm,yy)=>{
    const dd=new Date(yy,mm+1,0).getDate();
    const arr=Array(dd).fill(0);
    (allTxs||[]).forEach(t=>{ if(t.type!=='expense'||t.isBalancing||t.splitParent||isTransferTx(t))return; const d=new Date(t.date); if(d.getMonth()!==mm||d.getFullYear()!==yy)return; const di=d.getDate()-1; if(di>=0&&di<dd) arr[di]+=txCZK(t, undefined); });
    let sm=0; return arr.map(v=>{sm+=v;return sm;});
  };
  let pm=m-1,py=y; if(pm<0){pm=11;py--;}
  const prevCumul=cumulOf(pm,py);
  const histo=[];
  for(let i=1;i<=6;i++){ let hm=m-i,hy=y; while(hm<0){hm+=12;hy--;} const c=cumulOf(hm,hy); if(c.length&&c[c.length-1]>0) histo.push(c); }
  const avgCumul=Array(days).fill(null);
  for(let d=0;d<days;d++){ let sm=0,n=0; histo.forEach(c=>{ const v=d<c.length?c[d]:c[c.length-1]; sm+=v;n++; }); avgCumul[d]=n?sm/n:null; }

  const maxVal=Math.max(medVal||0, cumul[cumul.length-1]||0, prevCumul[prevCumul.length-1]||0, ...avgCumul.filter(v=>v!==null), 1);
  const pad={l:55,r:16,t:14,b:30};
  const cW=W-pad.l-pad.r,cH=190-pad.t-pad.b;
  const xf=i=>pad.l+(i+0.5)*(cW/days);
  const yf=v=>pad.t+cH*(1-v/maxVal);

  // Grid + osa Y (S16: čitelnější #a8aec8)
  ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;ctx.setLineDash([3,4]);
  [0.25,0.5,0.75,1].forEach(f=>{ const y2=pad.t+cH*(1-f);
    ctx.beginPath();ctx.moveTo(pad.l,y2);ctx.lineTo(W-pad.r,y2);ctx.stroke();
    ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='right';
    ctx.fillText(fmt(Math.round(czkToBase(maxVal*f))),pad.l-4,y2+3); });
  ctx.setLineDash([]);

  // Ø 6 měsíců – šedá přerušovaná
  if(histo.length){
    ctx.strokeStyle='#a8aec8';ctx.lineWidth=1.6;ctx.setLineDash([4,4]);ctx.beginPath();
    let st=false;
    avgCumul.forEach((v,i)=>{ if(v===null)return; st?ctx.lineTo(xf(i),yf(v)):ctx.moveTo(xf(i),yf(v)); st=true; });
    if(st) ctx.stroke(); ctx.setLineDash([]);
  }

  // Minulý měsíc – modrá
  ctx.strokeStyle='#60a5fa';ctx.lineWidth=2;ctx.beginPath();
  prevCumul.forEach((v,i)=>{ if(i>=days)return; i===0?ctx.moveTo(xf(i),yf(v)):ctx.lineTo(xf(i),yf(v)); });
  ctx.stroke();

  // Tento měsíc – zelená + podbarvení
  const grad=ctx.createLinearGradient(0,pad.t,0,pad.t+cH);
  grad.addColorStop(0,'rgba(74,222,128,.3)');grad.addColorStop(1,'rgba(74,222,128,0)');
  ctx.beginPath();ctx.moveTo(xf(0),pad.t+cH);
  cumul.forEach((v,i)=>ctx.lineTo(xf(i),yf(v)));
  ctx.lineTo(xf(cumul.length-1),pad.t+cH);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.strokeStyle='#4ade80';ctx.lineWidth=2.5;ctx.beginPath();
  cumul.forEach((v,i)=>i===0?ctx.moveTo(xf(i),yf(v)):ctx.lineTo(xf(i),yf(v)));
  ctx.stroke();

  // Medián 6 měsíců
  if(medVal>0){ const my2=yf(medVal);
    ctx.strokeStyle='#f87171';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
    ctx.beginPath();ctx.moveTo(pad.l,my2);ctx.lineTo(W-pad.r,my2);ctx.stroke();ctx.setLineDash([]); }

  // Osa X – po 2 dnech (S16)
  ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='center';
  for(let d=1;d<=days;d+=2){ ctx.fillText(d,xf(d-1),pad.t+cH+14); }
  if(days%2===0) ctx.fillText(days,xf(days-1),pad.t+cH+14);
  ctx.font='10px Instrument Sans';
  ctx.fillText('den v měsíci',pad.l+cW/2,190-2);
  ctx.save();ctx.translate(11,pad.t+cH/2);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.fillText(curSym()+' (kumulativně)',0,0);ctx.restore();

  // Legenda – HTML pod canvasem (vytvoří se, pokud chybí)
  let leg=document.getElementById('kumulLegend');
  if(!leg){ leg=document.createElement('div'); leg.id='kumulLegend';
    leg.style.cssText='display:flex;gap:14px;justify-content:center;margin-top:8px;flex-wrap:wrap';
    canvas.insertAdjacentElement('afterend',leg); }
  const li=(sw,txt,col)=>`<span style="display:flex;align-items:center;gap:5px;font-size:.78rem;color:${col||'#a8aec8'}">${sw}${txt}</span>`;
  leg.innerHTML =
    li('<span style="display:inline-block;width:18px;height:2.5px;background:#4ade80;border-radius:2px"></span>',`Tento měsíc ${fmtB(Math.round(cumul[cumul.length-1]||0))}`,'#4ade80')+
    li('<span style="display:inline-block;width:18px;height:2px;background:#60a5fa;border-radius:2px"></span>',`Minulý měsíc ${fmtB(Math.round(prevCumul[prevCumul.length-1]||0))}`,'#60a5fa')+
    (histo.length?li('<span style="display:inline-block;width:18px;height:0;border-top:2px dashed #a8aec8"></span>',`Ø ${histo.length} měs.`):'')+
    (medVal>0?li('<span style="display:inline-block;width:18px;height:0;border-top:2px dashed #f87171"></span>',`Medián ${fmtB(Math.round(medVal))}`,'#f87171'):'');

  // S16: interaktivní tooltip (hover + dotyk)
  canvas.onmousemove=function(e){
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left;
    const idx=Math.round((mx-pad.l)/(cW/days)-0.5);
    if(idx<0||idx>=days)return;
    renderKumulChart(days,cumul,medVal,m,y,allTxs);
    const c2=canvas.getContext('2d');
    c2.strokeStyle='rgba(255,255,255,.25)';c2.lineWidth=1;
    c2.beginPath();c2.moveTo(xf(idx),pad.t);c2.lineTo(xf(idx),pad.t+cH);c2.stroke();
    const bx=Math.min(Math.max(xf(idx)+8,pad.l),W-176),by=pad.t+4;
    const rows=2+(idx<prevCumul.length?1:0)+(avgCumul[idx]!==null?1:0);
    c2.fillStyle='rgba(26,29,46,.95)';c2.strokeStyle='rgba(255,255,255,.12)';
    c2.beginPath();c2.roundRect(bx,by,166,rows*14+12,6);c2.fill();c2.stroke();
    c2.font='bold 11px Instrument Sans';c2.textAlign='left';c2.fillStyle='#e8eaf2';
    c2.fillText(`${idx+1}. den`,bx+8,by+15);
    let ty=by+30;
    c2.font='10px Instrument Sans';
    c2.fillStyle='#4ade80';c2.fillText('Tento měsíc: '+fmtB(Math.round(cumul[idx]||0)),bx+8,ty);ty+=14;
    if(idx<prevCumul.length){c2.fillStyle='#60a5fa';c2.fillText('Minulý: '+fmtB(Math.round(prevCumul[idx])),bx+8,ty);ty+=14;}
    if(avgCumul[idx]!==null){c2.fillStyle='#a8aec8';c2.fillText('Ø 6 měs.: '+fmtB(Math.round(avgCumul[idx])),bx+8,ty);}
  };
  canvas.onmouseleave=function(){renderKumulChart(days,cumul,medVal,m,y,allTxs);};
  attachChartTouch(canvas);
}


// ══════════════════════════════════════════════════════
//  S12.1: DOTYKOVÁ PODPORA GRAFŮ (mobil)
//  onmousemove na dotykových zařízeních nestřílí → namapuj
//  touchstart/touchmove na stejný handler. touch-action:pan-y
//  zachová vertikální scroll stránky, horizontální tah = scrub.
// ══════════════════════════════════════════════════════
function attachChartTouch(canvas){
  if(!canvas || canvas._touchAttached) return;
  canvas._touchAttached = true;
  canvas.style.touchAction = 'pan-y';
  const fire = (ev)=>{
    const t = ev.touches && ev.touches[0]; if(!t) return;
    if(typeof canvas.onmousemove === 'function') canvas.onmousemove({clientX:t.clientX, clientY:t.clientY});
  };
  canvas.addEventListener('touchstart', fire, {passive:true});
  canvas.addEventListener('touchmove',  fire, {passive:true});
  // tooltip po zvednutí prstu necháme zobrazený (zmizí dalším překreslením)
}
