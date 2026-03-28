//  GRAFY (simplified)
// ══════════════════════════════════════════════════════
function renderGrafy(){
  const D=getData();
  document.getElementById('grafYear').textContent=S.curYear;
  const inc12=[],exp12=[],sal12=[],labels12=[];
  for(let i=11;i>=0;i--){let m=S.curMonth-i,y=S.curYear;if(m<0){m+=12;y--;}const txs=getTx(m,y,D);inc12.push(incSum(txs));exp12.push(expSum(txs));sal12.push(incSum(txs)-expSum(txs));labels12.push(CZ_M[m].slice(0,3));}
  drawSimpleAreaChart('incomeChart',labels12,inc12,'#4ade80');
  drawSimpleAreaChart('expenseChart',labels12,exp12,'#f87171');
  drawSaldoBars('saldoChart',labels12,sal12);
  renderDebtChart(D);
  renderPredLineChartSimple(S.curYear,D);
}

function renderDebtChart(D) {
  const canvas=document.getElementById('debtChart'); if(!canvas) return;
  const debts=(D.debts||[]).filter(d=>d.remaining>0&&d.schedule?.length);
  const W=canvas.parentElement.clientWidth||400;
  canvas.width=W; canvas.height=200;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,W,200);
  if(!debts.length){
    ctx.fillStyle='rgba(139,144,168,.5)';ctx.font='13px Instrument Sans';ctx.textAlign='center';
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
    const v=maxVal*f;
    ctx.fillText(v>=1000?Math.round(v/1000)+'k':Math.round(v),pad.l-6,yf(v)+4);
  });

  // Y axis label
  ctx.save();ctx.translate(12,pad.t+cH/2);ctx.rotate(-Math.PI/2);
  ctx.fillStyle='rgba(168,173,196,.6)';ctx.font='10px Instrument Sans';ctx.textAlign='center';
  ctx.fillText('Zbývá (Kč)',0,0);ctx.restore();

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
      ctx2.fillText(d.name.slice(0,10)+': '+fmt(Math.round(allPts[di][idx])),tipX+8,tipY+28+di*16);
    });
  };
  canvas.onmouseleave=function(){renderDebtChart(D);};
}

function drawSimpleAreaChart(id,labels,data,color){
  const canvas=document.getElementById(id);if(!canvas)return;
  const W=canvas.parentElement.clientWidth||400;canvas.width=W;
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
    ctx2.fillText(data[idx]>=1000?Math.round(data[idx]/1000)+'k Kč':Math.round(data[idx])+' Kč',tipX+8,pad.t+30);
  };
  canvas.onmouseleave=function(){drawSimpleAreaChart(id,labels,data,color);};
}

function drawSaldoBars(id,labels,data){
  const canvas=document.getElementById(id);if(!canvas)return;
  const W=canvas.parentElement.clientWidth||500;canvas.width=W;
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
      ctx.fillStyle='rgba(220,224,240,.9)';ctx.font='9px Instrument Sans';ctx.textAlign='center';
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
    ctx2.fillText((data[idx]>=0?'+':'')+Math.round(data[idx]/1000*10)/10+'k Kč',tipX+8,pad.t+30);
  };
  canvas.onmouseleave=function(){drawSaldoBars(id,labels,data);};
}

function drawLineChart(id,data,color){drawSimpleAreaChart(id,data.map(d=>d.label),data.map(d=>d.val),color);}

// ══════════════════════════════════════════════════════
//  NAROZENINY & PŘÁNÍ
// ══════════════════════════════════════════════════════
function renderNarozeniny(){renderBdayList();renderBdayUpcoming();renderWishList();}
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
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(clean);
    if(parsed.name) {
      document.getElementById('wishName').value = parsed.name;
      if(parsed.price) document.getElementById('wishPrice').value = parsed.price;
      if(parsed.desc) document.getElementById('wishDesc').value = parsed.desc;
      // Show link
      const linkRow = document.getElementById('wishUrlLinkRow');
      const linkEl = document.getElementById('wishUrlLink');
      if(linkRow) linkRow.style.display = 'block';
      if(linkEl) linkEl.innerHTML = `<a href="${url}" target="_blank" style="color:var(--bank)">${url.slice(0,60)}${url.length>60?'...':''}</a>`;
      if(status) status.innerHTML = `✅ Načteno: <strong>${parsed.name}</strong>`;
    }
  } catch(e) {
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

function openWishModal(){
  if(viewingUid)return;
  ['editWishId','wishName','wishDesc','wishPrice','wishUrl'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('wishPriority').value='mid';
  document.getElementById('wishModalTitle').textContent='Přidat přání';
  const status=document.getElementById('wishUrlStatus'); if(status) status.textContent='';
  const linkRow=document.getElementById('wishUrlLinkRow'); if(linkRow) linkRow.style.display='none';
  document.getElementById('modalWish').classList.add('open');
}

function saveWish(){
  const eid=document.getElementById('editWishId').value;
  const name=document.getElementById('wishName').value.trim();
  const desc=document.getElementById('wishDesc').value.trim();
  const price=parseFloat(document.getElementById('wishPrice').value)||0;
  const priority=document.getElementById('wishPriority').value;
  const url=document.getElementById('wishUrl')?.value.trim()||'';
  if(!name){alert('Zadej název');return;}
  if(!S.wishes)S.wishes=[];
  const obj={name,desc,price,priority,url:url||undefined};
  if(eid){const w=S.wishes.find(x=>x.id===eid);if(w)Object.assign(w,obj);}
  else S.wishes.push({id:uid(),...obj,done:false});
  save();closeModal('modalWish');renderPage();
}function searchWishGoogle(n){if(!n)return;window.open('https://www.google.com/search?q='+encodeURIComponent(n+' cena'),'_blank');}

function renderWishList(){
  const D=getData();const ro=viewingUid!==null;
  const el=document.getElementById('wishList');if(!el)return;
  const wishes=D.wishes||[];
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
function openWishModal(){if(viewingUid)return;['editWishId','wishName','wishDesc','wishPrice'].forEach(id=>document.getElementById(id).value='');document.getElementById('wishPriority').value='mid';document.getElementById('wishModalTitle').textContent='Přidat přání';document.getElementById('modalWish').classList.add('open');}
function editWish(id){if(viewingUid)return;const w=(S.wishes||[]).find(x=>x.id===id);if(!w)return;document.getElementById('editWishId').value=id;document.getElementById('wishName').value=w.name;document.getElementById('wishDesc').value=w.desc||'';document.getElementById('wishPrice').value=w.price||'';document.getElementById('wishPriority').value=w.priority;document.getElementById('wishModalTitle').textContent='Upravit přání';document.getElementById('modalWish').classList.add('open');}
function saveWish(){const eid=document.getElementById('editWishId').value;const name=document.getElementById('wishName').value.trim();const desc=document.getElementById('wishDesc').value.trim();const price=parseFloat(document.getElementById('wishPrice').value)||0;const priority=document.getElementById('wishPriority').value;if(!name){alert('Zadej název');return;}if(!S.wishes)S.wishes=[];if(eid){const w=S.wishes.find(x=>x.id===eid);if(w)Object.assign(w,{name,desc,price,priority});}else S.wishes.push({id:uid(),name,desc,price,priority,done:false});save();closeModal('modalWish');renderPage();}
function deleteWish(id){if(viewingUid)return;if(!confirm('Smazat přání?'))return;S.wishes=S.wishes.filter(w=>w.id!==id);save();renderPage();}
function toggleWishDone(id){if(viewingUid)return;const w=(S.wishes||[]).find(x=>x.id===id);if(w){w.done=!w.done;save();renderPage();}}

// ══════════════════════════════════════════════════════
