//  ADD / EDIT TX
// ══════════════════════════════════════════════════════
function openAddTx(){
  if(viewingUid)return;
  document.getElementById('editTxId').value='';
  document.getElementById('txName').value='';
  document.getElementById('txAmt').value='';
  document.getElementById('txDate').value=new Date().toISOString().slice(0,10);
  document.getElementById('txNote').value='';
  document.getElementById('modalAddTitle').textContent='Přidat transakci';
  setTxType('expense');selCatId='';selSub='';customSub='';
  populateTxProjectSelect();
  populateTxTransferWallets();
  renderCatPicker();
  document.getElementById('modalAdd').classList.add('open');
}
function setTxType(type){
  curTxType=type;
  ['income','expense','debt','transfer'].forEach(t=>{
    const el=document.getElementById('tt-'+t);
    if(el)el.className='tt';
  });
  const el=document.getElementById('tt-'+type);
  if(el)el.className='tt sel-'+type;
  // Show/hide transfer picker
  const tp=document.getElementById('transferPickerInModal');
  if(tp)tp.style.display=type==='transfer'?'block':'none';
  // Show/hide debt picker
  const dp=document.getElementById('debtPickerInModal');
  if(dp){
    dp.style.display=type==='debt'?'block':'none';
    if(type==='debt') populateTxDebtSelect();
  }
  // Show/hide cat/sub pickers
  const cp=document.getElementById('catPicker')?.parentElement?.parentElement;
  const sp=document.getElementById('subPicker');
  const hideCP = type==='transfer'||type==='debt';
  if(cp)cp.style.display=hideCP?'none':'block';
  if(sp&&hideCP)sp.style.display='none';
  if(!hideCP)renderCatPicker();
}
function saveTx(){
  if(viewingUid)return;
  const eid=document.getElementById('editTxId').value;
  const name=document.getElementById('txName').value.trim();
  const amt=parseFloat(document.getElementById('txAmt').value);
  const date=document.getElementById('txDate').value;
  const note=document.getElementById('txNote').value.trim();
  const projectId=document.getElementById('txProject')?.value||'';
  customSub=document.getElementById('customSubInput').value.trim();
  if(curTxType==='transfer'){
    // Handle transfer
    const from=document.getElementById('txTransferFrom')?.value;
    const to=document.getElementById('txTransferTo')?.value;
    if(!from||!to){alert('Vyber obě peněženky');return;}
    if(from===to){alert('Peněženky musí být různé');return;}
    if(!amt||!date){alert('Vyplň částku a datum');return;}
    const wFrom=getWallets().find(w=>w.id===from);
    const wTo=getWallets().find(w=>w.id===to);
    const transferId=uid();
    const txName=name||(wFrom&&wTo?`Převod: ${wFrom.name} → ${wTo.name}`:'Převod');
    const txOut={id:uid(),name:txName,amount:amt,amt,type:'expense',date,wallet:from,note:note||'Přesun',transferId,category:'transfer',catId:'transfer',projectId:projectId||undefined};
    const txIn={id:uid(),name:txName,amount:amt,amt,type:'income',date,wallet:to,note:note||'Přesun',transferId,category:'transfer',catId:'transfer',projectId:projectId||undefined};
    if(!S.transactions)S.transactions=[];
    S.transactions.push(txOut,txIn);
    save();closeModal('modalAdd');{ const pid=selProjectId; selProjectId=''; if(pid&&curPage==='projektDetail'){renderProjectDetail(pid);}else{renderPage();} }
    return;
  }
  if(!amt||!date){alert('Vyplň částku a datum');return;}
  // Dluh/Splátka – propojení s půjčkou
  if(curTxType==='debt') {
    const debtId = document.getElementById('txDebtId')?.value;
    const debt = debtId ? S.debts.find(x=>x.id===debtId) : null;
    const txName = name || (debt ? 'Splátka: '+debt.name : 'Splátka dluhu');
    const txObj = {type:'expense', name:txName, amount:amt, amt, catId:'debt-payment', category:'debt-payment', date, note, debtId:debtId||null};
    if(projectId) txObj.projectId = projectId;
    if(eid) { const t=S.transactions.find(x=>x.id==eid); if(t) Object.assign(t,txObj); }
    else S.transactions.push({id:Date.now(),...txObj});
    // Snížit zbývající částku půjčky
    if(debt && !eid) {
      debt.remaining = Math.max(0, debt.remaining - amt);
      // Označit splátku v kalendáři jako zaplacenou
      if(debt.schedule) {
        const unpaid = debt.schedule.find(s=>!s.paid);
        if(unpaid) unpaid.paid = true;
      }
    }
    save(); closeModal('modalAdd'); { const pid=selProjectId; selProjectId=''; if(pid&&curPage==='projektDetail'){renderProjectDetail(pid);}else{renderPage();} }
    return;
  }
  const type = curTxType;
  const finalSub = customSub||selSub;
  const D2 = getData();
  const cat = getCat(selCatId, D2.categories);
  const autoName = name||(cat.name!=='❓'?cat.name+(finalSub?' – '+finalSub:''):'Transakce');
  const txObj = {type, name:autoName, amount:amt, amt, catId:selCatId, category:selCatId, subcat:finalSub, date, note};
  if(projectId) txObj.projectId = projectId;
  // Tagy
  const tagsRaw = document.getElementById('txTags')?.value || '';
  const tags = parseTags(tagsRaw);
  if(tags.length) txObj.tags = tags;
  if(eid) { const t=S.transactions.find(x=>x.id==eid); if(t) Object.assign(t,txObj); }
  else S.transactions.push({id:Date.now(),...txObj});
  save(); closeModal('modalAdd'); { const pid=selProjectId; selProjectId=''; if(pid&&curPage==='projektDetail'){renderProjectDetail(pid);}else{renderPage();} }
}
function renderCatPicker(){
  const picker=document.getElementById('catPicker');if(!picker)return;
  const type=curTxType==='debt'?'expense':curTxType;
  const cats=S.categories.filter(c=>c.type===type||c.type==='both');
  picker.innerHTML=cats.map(c=>`<div class="cat-chip ${selCatId===c.id?'sel':''}" style="${selCatId===c.id?`background:${c.color}`:'border-color:'+c.color}" onclick="selCatBtn('${c.id}')">${c.icon} ${c.name}</div>`).join('');
  renderSubPicker();
}
function selCatBtn(id){selCatId=id;selSub='';customSub='';document.getElementById('customSubInput').value='';renderCatPicker();}
function renderSubPicker(){
  const wrap=document.getElementById('subPicker');const inner=document.getElementById('subPickerInner');
  const cat=S.categories.find(c=>c.id===selCatId);
  if(!cat||!(cat.subs||[]).length){if(wrap)wrap.style.display='none';return;}
  if(wrap)wrap.style.display='block';
  inner.innerHTML=(cat.subs||[]).map(s=>`<div class="sub-chip ${selSub===s?'sel':''}" onclick="selSubBtn('${s}')">${s}</div>`).join('');
}
function selSubBtn(s){selSub=s;customSub='';document.getElementById('customSubInput').value='';renderSubPicker();}
// ══════════════════════════════════════════════════════
//  PŮJČKY – ENGINE
// ══════════════════════════════════════════════════════
const DEBT_TYPES = {
  personal: {label:'🏦 Spotřebitelský úvěr', rate:9.9, freq:'monthly', grace:0, tip:null},
  mortgage: {label:'🏠 Hypotéka', rate:5.5, freq:'monthly', grace:0, tip:null},
  nonbank:  {label:'⚠️ Nebankovní půjčka', rate:89, freq:'weekly', grace:14, tip:'💡 TIP: Mnoho nebankovních půjček má <strong>bezúročné období 14–30 dní</strong>. Splatíte-li celou částku včas, neplatíte žádný úrok! Vždy si ověřte VOP. RPSN může být i přes 100%!'},
  credit:   {label:'💳 Kreditní karta', rate:25, freq:'monthly', grace:45, tip:'💡 TIP: Kreditní karta má obvykle <strong>45 dní bezúročné období</strong>. Splatíte-li celý výpis včas, neplatíte žádné úroky. Po uplynutí se úroky (~25% p.a.) počítají zpětně!'},
  ico:      {label:'💼 Půjčka na IČO', rate:15, freq:'monthly', grace:0, tip:'⚠️ Půjčky na IČO mívají vysoké RPSN (15–60%). Vždy porovnejte nabídky více poskytovatelů.'},
  friend:   {label:'🤝 Od známého', rate:0, freq:'monthly', grace:0, tip:'💡 Doporučujeme sepsat i neformální smlouvu o půjčce – chrání obě strany.'},
};

function selectDebtType(type) {
  document.querySelectorAll('.debt-type-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector('.debt-type-btn[data-type="'+type+'"]');
  if(btn) btn.classList.add('active');
  document.getElementById('dType').value = type;
  const dt = DEBT_TYPES[type];
  if(!dt) return;
  if(!document.getElementById('dInterest').value || document.getElementById('dInterest').value === '0')
    document.getElementById('dInterest').value = dt.rate;
  document.getElementById('dFreq').value = dt.freq;
  document.getElementById('dGrace').value = dt.grace;
  const tip = document.getElementById('debtTipBox');
  if(dt.tip) { tip.innerHTML = dt.tip; tip.style.display = 'block'; }
  else tip.style.display = 'none';
  generateSchedulePreview();
}

function calcAnnuity(principal, annualRate, periodsPerYear, totalPeriods) {
  if(annualRate <= 0) return principal / totalPeriods;
  const r = annualRate / 100 / periodsPerYear;
  return principal * r * Math.pow(1+r, totalPeriods) / (Math.pow(1+r, totalPeriods) - 1);
}

function generateSchedule(debt) {
  const principal = debt.remaining || debt.total || 0;
  const annualRate = debt.interest || 0;
  const freq = debt.freq || 'monthly';
  const periodsPerYear = freq === 'weekly' ? 52 : freq === 'biweekly' ? 26 : 12;
  const payment = debt.payment || calcAnnuity(principal, annualRate, periodsPerYear, 24);
  const ratePerPeriod = annualRate / 100 / periodsPerYear;
  const startDate = new Date(debt.startDate || new Date());
  const schedule = [];
  let remaining = principal;
  let periodNum = 0;
  // Zvýšen limit na 600 let (7200 měsíců) – prakticky neomezeno
  const maxPeriods = periodsPerYear * 600;
  while(remaining > 0.5 && periodNum < maxPeriods) {
    const interest = remaining * ratePerPeriod;
    const principalPart = Math.min(payment - interest, remaining);
    // Splátka nepokrývá úroky
    if(principalPart <= 0 && annualRate > 0) break;
    const actualPayment = Math.min(payment, remaining + interest);
    remaining = Math.max(0, remaining - principalPart);
    const d = new Date(startDate);
    if(freq === 'weekly') d.setDate(d.getDate() + periodNum * 7);
    else if(freq === 'biweekly') d.setDate(d.getDate() + periodNum * 14);
    else d.setMonth(d.getMonth() + periodNum);
    schedule.push({
      num: periodNum+1,
      date: d.toISOString().slice(0,10),
      payment: Math.round(actualPayment),
      principal: Math.round(principalPart),
      interest: Math.round(interest),
      remaining: Math.round(remaining),
      paid: false
    });
    periodNum++;
  }
  return schedule;
}

function calcRPSN(principal, schedule) {
  if(!schedule.length || !principal || principal <= 0) return 0;
  const totalPaid = schedule.reduce((a,s) => a + s.payment, 0);
  if(totalPaid <= principal) return 0;

  // Detekuj frekvenci
  const freq = schedule.length > 1
    ? Math.round((new Date(schedule[1].date) - new Date(schedule[0].date)) / (24*60*60*1000))
    : 30;
  const periodsPerYear = freq <= 8 ? 52 : freq <= 16 ? 26 : 12;

  // Použij jen prvních 360 splátek pro výpočet (výkon) – RPSN se nemění po 30 letech
  const sched = schedule.slice(0, 360);

  // Newton-Raphson – více iterací a lepší počáteční odhad
  // Počáteční odhad z jednoduchého vzorce: (totalInterest / principal) / (n/2)
  const totalInterest = sched.reduce((a,s) => a + s.interest, 0);
  const n = sched.length;
  let r = Math.max(0.0001, (totalInterest / principal) / (n / 2) / periodsPerYear);

  for(let iter = 0; iter < 200; iter++) {
    let npv = -principal;
    let dnpv = 0;
    sched.forEach((s, i) => {
      const t = i + 1;
      const disc = Math.pow(1 + r, t);
      npv += s.payment / disc;
      dnpv -= t * s.payment / (disc * (1 + r));
    });
    if(Math.abs(npv) < 0.001) break;
    if(Math.abs(dnpv) < 1e-10) break;
    const delta = npv / dnpv;
    r -= delta;
    if(r <= 0) r = 0.00001;
    if(r > 10) r = 0.5; // zamez divergenci
  }

  if(r <= 0 || r > 10) return 0;
  const annualRate = (Math.pow(1 + r, periodsPerYear) - 1) * 100;
  return Math.round(annualRate * 10) / 10;
}

function generateSchedulePreview() {
  const el = document.getElementById('schedulePreview'); if(!el) return;
  const total = parseFloat(document.getElementById('dTotal')?.value) || 0;
  const interest = parseFloat(document.getElementById('dInterest')?.value) || 0;
  const payment = parseFloat(document.getElementById('dPayment')?.value) || 0;
  const freq = document.getElementById('dFreq')?.value || 'monthly';
  if(!total) { el.innerHTML = ''; return; }
  const tempDebt = {total, remaining:total, interest, payment:payment||0, freq, startDate:new Date().toISOString().slice(0,10)};
  const schedule = generateSchedule(tempDebt);
  if(!schedule.length) { el.innerHTML = '<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Splátka nepokrývá úroky! Zvyšte splátku.</div></div>'; return; }
  const totalPaid = schedule.reduce((a,s)=>a+s.payment,0);
  const totalInterest = schedule.reduce((a,s)=>a+s.interest,0);
  const rpsn = calcRPSN(total, schedule);
  const ppy = freq==='weekly'?52:freq==='biweekly'?26:12;
  const years = Math.floor(schedule.length/ppy);
  const rem = schedule.length%ppy;
  el.innerHTML = '<div style="background:var(--surface3);border-radius:10px;padding:12px;font-size:.78rem"><div style="font-weight:600;color:var(--text2);margin-bottom:8px">📊 Přehled splácení</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><span style="color:var(--text3)">Počet splátek:</span> <strong>'+schedule.length+' × '+(freq==='weekly'?'týdně':freq==='biweekly'?'2 týdny':'měsíčně')+'</strong></div><div><span style="color:var(--text3)">Doba:</span> <strong>'+(years>0?years+'r ':'')+rem+'m</strong></div><div><span style="color:var(--text3)">Celkem zaplatíte:</span> <strong style="color:var(--expense)">'+fmt(Math.round(totalPaid))+' Kč</strong></div><div><span style="color:var(--text3)">Z toho úroky:</span> <strong style="color:var(--debt)">'+fmt(Math.round(totalInterest))+' Kč</strong></div>'+(rpsn>0?'<div style="grid-column:1/-1"><span style="color:var(--text3)">RPSN:</span> <strong style="color:'+(rpsn>50?'var(--expense)':rpsn>20?'var(--debt)':'var(--income)')+'">'+rpsn+'%</strong> '+(rpsn>50?'⚠️ Velmi vysoké!':rpsn>20?'⚠️ Vysoké':'')+'</div>':'')+'</div></div>';
}

function openDebtModal() {
  if(viewingUid) return;
  document.getElementById('editDebtId').value = '';
  ['dName','dCreditor','dTotal','dRemaining','dPayment','dPenaltyPct','dPenaltyFixed','dDueDate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('dInterest').value='0';
  document.getElementById('dGrace').value='0';
  document.getElementById('dAlertDays').value='7';
  document.getElementById('dPriority').value='mid';
  document.getElementById('dFreq').value='monthly';
  document.getElementById('dType').value='personal';
  document.getElementById('dStartDate').value=new Date().toISOString().slice(0,10);
  document.getElementById('debtTipBox').style.display='none';
  document.getElementById('schedulePreview').innerHTML='';
  document.querySelectorAll('.debt-type-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.debt-type-btn[data-type="personal"]')?.classList.add('active');
  document.getElementById('debtModalTitle').textContent='Přidat půjčku';
  document.getElementById('modalDebt').classList.add('open');
}

function editDebt(id) {
  if(viewingUid) return;
  const d=S.debts.find(x=>x.id===id); if(!d) return;
  document.getElementById('editDebtId').value=id;
  document.getElementById('dName').value=d.name||'';
  document.getElementById('dCreditor').value=d.creditor||'';
  document.getElementById('dTotal').value=d.total||'';
  document.getElementById('dRemaining').value=d.remaining||'';
  document.getElementById('dInterest').value=d.interest||'0';
  document.getElementById('dPayment').value=d.payment||'';
  document.getElementById('dFreq').value=d.freq||'monthly';
  document.getElementById('dPriority').value=d.priority||'mid';
  document.getElementById('dGrace').value=d.gracePeriod||'0';
  document.getElementById('dAlertDays').value=d.alertDays||'7';
  document.getElementById('dPenaltyPct').value=d.penaltyPct||'';
  document.getElementById('dPenaltyFixed').value=d.penaltyFixed||'';
  document.getElementById('dStartDate').value=d.startDate||'';
  document.getElementById('dDueDate').value=d.dueDate||'';
  document.getElementById('dType').value=d.type||'personal';
  document.querySelectorAll('.debt-type-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.debt-type-btn[data-type="'+(d.type||'personal')+'"]')?.classList.add('active');
  const dt=DEBT_TYPES[d.type];
  const tip=document.getElementById('debtTipBox');
  if(dt?.tip){tip.innerHTML=dt.tip;tip.style.display='block';}else tip.style.display='none';
  generateSchedulePreview();
  document.getElementById('debtModalTitle').textContent='Upravit půjčku';
  document.getElementById('modalDebt').classList.add('open');
}

function saveDebt() {
  if(viewingUid) return;
  const eid=document.getElementById('editDebtId').value;
  const name=document.getElementById('dName').value.trim();
  const total=parseFloat(document.getElementById('dTotal').value)||0;
  const remaining=parseFloat(document.getElementById('dRemaining').value)||total;
  const payment=Math.max(0,parseFloat(document.getElementById('dPayment').value)||0);
  if(!name||!total){alert('Vyplň název a celkovou částku');return;}
  const obj={name,total,remaining,
    interest:parseFloat(document.getElementById('dInterest').value)||0,
    payment,
    creditor:document.getElementById('dCreditor').value.trim(),
    freq:document.getElementById('dFreq').value,
    priority:document.getElementById('dPriority').value,
    type:document.getElementById('dType').value,
    gracePeriod:parseInt(document.getElementById('dGrace').value)||0,
    alertDays:parseInt(document.getElementById('dAlertDays').value)||7,
    penaltyPct:parseFloat(document.getElementById('dPenaltyPct').value)||0,
    penaltyFixed:parseFloat(document.getElementById('dPenaltyFixed').value)||0,
    startDate:document.getElementById('dStartDate').value||new Date().toISOString().slice(0,10),
    dueDate:document.getElementById('dDueDate').value||null,
  };
  obj.schedule=generateSchedule(obj);
  if(eid){const d=S.debts.find(x=>x.id===eid);if(d){obj.id=eid;Object.assign(d,obj);}}
  else S.debts.push({id:uid(),...obj});
  save();closeModal('modalDebt');renderPage();
}

function openDebtSim() {
  if(!S.debts.length){alert('Nejprve přidej půjčku.');return;}
  const sel=document.getElementById('simDebtId');
  sel.innerHTML=S.debts.map(d=>'<option value="'+d.id+'">'+d.name+' – zbývá '+fmt(d.remaining)+' Kč</option>').join('');
  const first=S.debts[0];
  document.getElementById('simAmt').value=first.payment||Math.round(calcAnnuity(first.remaining,first.interest||0,12,24));
  document.getElementById('simLump').value=0;
  runDebtSim();
  document.getElementById('modalDebtSim').classList.add('open');
}

function runDebtSim() {
  const id=document.getElementById('simDebtId')?.value;
  const d=S.debts.find(x=>x.id===id); if(!d) return;
  const simPayment=Math.max(1,parseFloat(document.getElementById('simAmt').value)||0);
  const lump=parseFloat(document.getElementById('simLump').value)||0;
  const rEl=document.getElementById('simResult'); if(!rEl) return;

  const origSchedule=d.schedule?.length?d.schedule:generateSchedule(d);
  const simDebt={...d, remaining:Math.max(0,d.remaining-lump), payment:simPayment};
  const simSchedule=generateSchedule(simDebt);

  if(!simSchedule.length){
    rEl.innerHTML='<div class="insight-item bad"><div class="insight-icon">🚨</div><div class="insight-text">Splátka nepokrývá úroky! Minimální splátka: '+fmt(Math.round(d.remaining*(d.interest/100/12)+1))+' Kč</div></div>';
    return;
  }

  const origTotal=origSchedule.reduce((a,s)=>a+s.payment,0);
  const simTotal=simSchedule.reduce((a,s)=>a+s.payment,0)+lump;
  const origInterest=origSchedule.reduce((a,s)=>a+s.interest,0);
  const simInterest=simSchedule.reduce((a,s)=>a+s.interest,0);

  // RPSN počítáme ze simSchedule s aktuální zbývající jistinou
  const rpsn=calcRPSN(simDebt.remaining, simSchedule);

  const freq=d.freq||'monthly';
  const fl=freq==='weekly'?'týdně':freq==='biweekly'?'2 týdny':'měsíčně';
  const mLen=(n)=>freq==='weekly'?Math.round(n/4.33)+' měs':freq==='biweekly'?Math.round(n/2.17)+' měs':n+' měs';

  // Správné porovnání – splácíme stejnou jistinu, porovnáváme jen úroky
  const interestSaved = origInterest - simInterest;
  const monthsSaved = origSchedule.length - simSchedule.length;

  // Nový plán je lepší jen pokud platíme MÉNĚ úroků celkem
  const better = interestSaved > 0;
  // Varování pokud je splátka nižší než původní
  const lowerPayment = simPayment < (d.payment||0);

  rEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border)">
        <div style="font-size:.68rem;color:var(--text3);margin-bottom:4px;font-weight:700;text-transform:uppercase">Aktuální plán</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700">${mLen(origSchedule.length)}</div>
        <div style="font-size:.75rem;color:var(--text3)">${fmt(d.payment||0)} Kč/${fl}</div>
        <div style="font-size:.75rem;color:var(--debt);margin-top:4px">Úroky: ${fmt(Math.round(origInterest))} Kč</div>
        <div style="font-size:.75rem;color:var(--expense)">Celkem: ${fmt(Math.round(origTotal))} Kč</div>
      </div>
      <div style="background:${better?'var(--income-bg)':lowerPayment?'var(--expense-bg)':'var(--surface2)'};border-radius:10px;padding:12px;border:1px solid ${better?'rgba(74,222,128,.3)':lowerPayment?'rgba(248,113,113,.3)':'var(--border)'}">
        <div style="font-size:.68rem;color:var(--text3);margin-bottom:4px;font-weight:700;text-transform:uppercase">Nový plán</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700;color:${better?'var(--income)':lowerPayment?'var(--expense)':'var(--text)'}">${mLen(simSchedule.length)}</div>
        <div style="font-size:.75rem;color:var(--text3)">${fmt(simPayment)} Kč/${fl}${lump?' +'+fmt(lump)+' jednorázově':''}</div>
        <div style="font-size:.75rem;color:var(--debt);margin-top:4px">Úroky: ${fmt(Math.round(simInterest))} Kč</div>
        <div style="font-size:.75rem;color:var(--expense)">Celkem: ${fmt(Math.round(simTotal))} Kč</div>
      </div>
    </div>
    ${rpsn>0?`<div class="insight-item ${rpsn>50?'bad':rpsn>20?'warn':'good'}">
      <div class="insight-icon">📊</div>
      <div class="insight-text">RPSN nového plánu: <strong>${rpsn}%</strong> ${rpsn>50?'⚠️ Velmi vysoké!':rpsn>20?'Poměrně vysoké':'Přijatelné'}</div>
    </div>`:''}
    ${lowerPayment?`<div class="insight-item bad">
      <div class="insight-icon">⚠️</div>
      <div class="insight-text">Nižší splátka prodlouží splácení o <strong>${Math.abs(monthsSaved)} měsíců</strong> a zaplatíte o <strong>${fmt(Math.round(Math.abs(interestSaved)))} Kč více</strong> na úrocích.</div>
    </div>`:''}
    ${better&&!lowerPayment?`<div class="insight-item good">
      <div class="insight-icon">🎯</div>
      <div class="insight-text">Ušetříte <strong>${fmt(Math.round(interestSaved))} Kč</strong> na úrocích!</div>
    </div>`:''}
    ${monthsSaved>0&&!lowerPayment?`<div class="insight-item good">
      <div class="insight-icon">⏱️</div>
      <div class="insight-text">Zkrácení o <strong>${monthsSaved} splátek</strong> (${Math.floor(monthsSaved/12)}r ${monthsSaved%12}m)</div>
    </div>`:''}`;

  window._lastSimSchedule = simSchedule;
  drawSimChart(origSchedule, simSchedule);
}

function drawSimChart(origSchedule, simSchedule) {
  // Pokud voláno se starým API (jen jeden parametr), použij jako sim
  if(!simSchedule) { simSchedule = origSchedule; origSchedule = null; }
  setTimeout(() => {
    const canvas=document.getElementById('simChart'); if(!canvas) return;
    const W=canvas.parentElement?.clientWidth||480;
    if(W < 10) { setTimeout(()=>drawSimChart(origSchedule, simSchedule), 100); return; }
    canvas.width=W; canvas.height=230;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,W,230);
    if(!simSchedule.length) return;

    const step=Math.max(1,Math.floor(simSchedule.length/60));
    const pts=simSchedule.filter((_,i)=>i%step===0||i===simSchedule.length-1);
    const simTotal=simSchedule.reduce((a,s)=>a+s.payment,0);
    const origTotal=origSchedule?origSchedule.reduce((a,s)=>a+s.payment,0):simTotal;
    const maxVal=Math.max(simSchedule[0]?.remaining||0, simTotal, origTotal);
    if(!maxVal) return;

    // Více pravého paddingu aby label nepřetékal
    const pad={l:65,r:16,t:14,b:50};
    const cH=230-pad.t-pad.b;
    const cW=W-pad.l-pad.r;
    const x=i=>pad.l+(i/(pts.length-1||1))*cW;
    const y=v=>pad.t+cH-(v/maxVal)*cH;

    // Build cumulative arrays
    let cumPaid=0, cumInterest=0;
    const cumPts=[], cumIntPts=[];
    pts.forEach((_,i)=>{
      const origIdx=i*step;
      for(let j=(i===0?0:((i-1)*step)+1); j<=Math.min(origIdx,simSchedule.length-1); j++){
        cumPaid+=simSchedule[j].payment;
        cumInterest+=simSchedule[j].interest;
      }
      cumPts.push(cumPaid);
      cumIntPts.push(cumInterest);
    });

    // Grid
    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
    [0,0.25,0.5,0.75,1].forEach(f=>{
      const yv=pad.t+cH*(1-f);
      ctx.beginPath(); ctx.moveTo(pad.l,yv); ctx.lineTo(W-pad.r,yv); ctx.stroke();
    });
    ctx.setLineDash([]);

    // Interest area (red stacked)
    ctx.beginPath();
    pts.forEach((p,i)=>{
      const sy=y(p.remaining+cumIntPts[i]);
      i===0?ctx.moveTo(x(i),sy):ctx.lineTo(x(i),sy);
    });
    for(let i=pts.length-1;i>=0;i--) ctx.lineTo(x(i),y(pts[i].remaining));
    ctx.closePath(); ctx.fillStyle='rgba(248,113,113,.3)'; ctx.fill();
    ctx.beginPath();
    pts.forEach((p,i)=>{ const sy=y(p.remaining+cumIntPts[i]); i===0?ctx.moveTo(x(i),sy):ctx.lineTo(x(i),sy); });
    ctx.strokeStyle='rgba(248,113,113,.6)'; ctx.lineWidth=1.5; ctx.stroke();

    // Principal area (green)
    ctx.beginPath();
    ctx.moveTo(x(0),y(pts[0].remaining));
    pts.forEach((p,i)=>ctx.lineTo(x(i),y(p.remaining)));
    ctx.lineTo(x(pts.length-1),pad.t+cH); ctx.lineTo(x(0),pad.t+cH);
    ctx.closePath(); ctx.fillStyle='rgba(74,222,128,.2)'; ctx.fill();
    ctx.beginPath();
    pts.forEach((p,i)=>i===0?ctx.moveTo(x(i),y(p.remaining)):ctx.lineTo(x(i),y(p.remaining)));
    ctx.strokeStyle='#4ade80'; ctx.lineWidth=2.5; ctx.setLineDash([]); ctx.stroke();

    // Cumulative paid line (blue dashed)
    ctx.beginPath();
    cumPts.forEach((v,i)=>i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
    ctx.strokeStyle='#60a5fa'; ctx.lineWidth=2; ctx.setLineDash([6,4]); ctx.stroke();
    ctx.setLineDash([]);

    // End dot + label – zarovnat doleva pokud je blízko pravého okraje
    const endX=x(pts.length-1);
    const endY=y(simTotal);
    ctx.beginPath(); ctx.moveTo(endX,pad.t); ctx.lineTo(endX,pad.t+cH);
    ctx.strokeStyle='rgba(96,165,250,.25)'; ctx.lineWidth=1; ctx.setLineDash([4,3]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(endX,endY,5,0,Math.PI*2);
    ctx.fillStyle='#60a5fa'; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=1.5; ctx.stroke();

    // Label – vždy viditelný, posun doleva pokud u pravého okraje
    const lbl=fmt(Math.round(simTotal))+' Kč';
    ctx.font='bold 10px Instrument Sans';
    const lblW=ctx.measureText(lbl).width+10;
    const lblX = endX+6+lblW > W-4 ? endX-lblW-8 : endX+6;
    const lblY = Math.max(pad.t+14, Math.min(endY, pad.t+cH-4));
    ctx.fillStyle='rgba(26,29,46,.92)';
    ctx.beginPath(); ctx.roundRect(lblX-2,lblY-13,lblW,16,4); ctx.fill();
    ctx.fillStyle='#60a5fa'; ctx.textAlign='left';
    ctx.fillText(lbl,lblX+3,lblY);
    ctx.font='9px Instrument Sans'; ctx.fillStyle='rgba(168,173,196,.7)';
    ctx.fillText('celkem',lblX+3,lblY-15);

    // Y labels
    ctx.fillStyle='rgba(168,173,196,.8)'; ctx.font='10px Instrument Sans'; ctx.textAlign='right';
    [0,0.25,0.5,0.75,1].forEach(f=>{
      const v=maxVal*f;
      ctx.fillText(v>=1000?Math.round(v/1000)+'k':Math.round(v), pad.l-4, pad.t+cH*(1-f)+4);
    });

    // X labels
    ctx.textAlign='center'; ctx.font='10px Instrument Sans'; ctx.fillStyle='rgba(168,173,196,.7)';
    [0,Math.floor(pts.length/3),Math.floor(pts.length*2/3),pts.length-1].forEach(i=>{
      if(pts[i]) ctx.fillText(pts[i].date.slice(0,7), x(i), 230-34);
    });

    // Legend
    const legY=230-22;
    ctx.textAlign='left'; ctx.font='10px Instrument Sans';
    [{c:'#4ade80',l:'Zbývá jistina'},{c:'rgba(248,113,113,.7)',l:'Úroky'},{c:'#60a5fa',l:'Zaplaceno celkem',dash:true}].forEach((it,i)=>{
      const lx=pad.l+(i*120);
      if(it.dash){ctx.setLineDash([5,3]);ctx.strokeStyle=it.c;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lx,legY+3);ctx.lineTo(lx+14,legY+3);ctx.stroke();ctx.setLineDash([]);}
      else{ctx.fillStyle=it.c;ctx.fillRect(lx,legY,14,4);}
      ctx.fillStyle='rgba(168,173,196,.8)'; ctx.fillText(it.l,lx+17,legY+7);
    });
  }, 50);
}

function openScheduleFromSim() {
  const id=document.getElementById('simDebtId')?.value;
  if(!id) { alert('Vyberte půjčku'); return; }
  // Don't close simulation – open schedule on top
  showDebtSchedule(id);
}

function showDebtSchedule(id) {
  const d=S.debts.find(x=>x.id===id); if(!d) return;
  const schedule=d.schedule?.length?d.schedule:generateSchedule(d);
  const today=new Date().toISOString().slice(0,10);
  const totalPaid=schedule.reduce((a,s)=>a+s.payment,0);
  const totalInterest=schedule.reduce((a,s)=>a+s.interest,0);
  const rpsn=calcRPSN(d.total||d.remaining,schedule);
  const rows=schedule.slice(0,120).map((s,i)=>{
    const isOverdue=!s.paid&&s.date<today;
    const isCurrent=!s.paid&&s.date>=today&&(i===0||schedule[i-1]?.paid);
    return '<div class="debt-schedule-row '+(s.paid?'paid':'')+(isOverdue?' overdue':'')+(isCurrent?' current':'')+'"><span>'+s.date+'</span><span style="text-align:right">'+fmt(s.payment)+' Kč</span><span style="text-align:right;color:var(--income)">'+fmt(s.principal)+' Kč</span><span style="text-align:right;color:var(--debt)">'+fmt(s.interest)+' Kč</span><span style="text-align:right;color:var(--text3)">'+fmt(s.remaining)+' Kč</span><span style="text-align:center">'+(s.paid?'✅':isOverdue?'⚠️':isCurrent?'▶':'○')+'</span></div>';
  }).join('');
  document.getElementById('scheduleContent').innerHTML='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px"><div class="stat-card expense"><div class="stat-label">Celkem zaplatíte</div><div class="stat-value down">'+fmt(Math.round(totalPaid))+' Kč</div></div><div class="stat-card debt"><div class="stat-label">Z toho úroky</div><div class="stat-value warn">'+fmt(Math.round(totalInterest))+' Kč</div></div><div class="stat-card income"><div class="stat-label">Počet splátek</div><div class="stat-value up">'+schedule.length+'</div></div><div class="stat-card bank"><div class="stat-label">RPSN</div><div class="stat-value '+(rpsn>50?'down':rpsn>20?'warn':'up')+'">'+rpsn+'%</div></div></div><div class="debt-schedule-row header"><span>Datum</span><span style="text-align:right">Splátka</span><span style="text-align:right">Jistina</span><span style="text-align:right">Úrok</span><span style="text-align:right">Zbývá</span><span>Stav</span></div><div style="max-height:380px;overflow-y:auto">'+rows+'</div>'+(schedule.length>120?'<div style="text-align:center;padding:8px;font-size:.74rem;color:var(--text3)">Zobrazeno prvních 120 z '+schedule.length+' splátek</div>':'');
  document.getElementById('modalSchedule').classList.add('open');
}

function showTransferInfo() {
  const box=document.getElementById('transferInfoBox');
  if(box) box.style.display=box.style.display==='none'?'block':'none';
}

function populateTxDebtSelect() {
  const sel=document.getElementById('txDebtId'); if(!sel) return;
  sel.innerHTML='<option value="">– vyberte půjčku –</option>'+(S.debts||[]).map(d=>'<option value="'+d.id+'">'+d.name+' – zbývá '+fmt(d.remaining)+' Kč</option>').join('');
}

function getCurInst(d) { return d?.payment || 0; }

// ══════════════════════════════════════════════════════
//  WIDGET: KALKULAČKA DLUHOVÉ REALITY
// ══════════════════════════════════════════════════════
function renderDebtRealityWidget(D) {
  const el = document.getElementById('debtRealityWidget'); if(!el) return;
  const debts = D.debts || [];
  if(!debts.length) { el.innerHTML=''; return; }

  const totalRemaining = debts.reduce((a,d)=>a+d.remaining,0);
  const baseIncome = computeBaseIncome(D);
  const monthlyPayments = debts.reduce((a,d)=>{
    const freq=d.freq||'monthly';
    return a+(freq==='weekly'?(d.payment||0)*4.33:freq==='biweekly'?(d.payment||0)*2.17:(d.payment||0));
  },0);

  // Celkové úroky ze všech splátkových kalendářů
  let totalWillPay=0, totalInterest=0;
  debts.forEach(d=>{
    const s=d.schedule?.length?d.schedule:generateSchedule(d);
    const paid=d.total-d.remaining;
    const futureTotal=s.reduce((a,p)=>a+p.payment,0);
    totalWillPay+=paid+futureTotal;
    totalInterest+=s.reduce((a,p)=>a+p.interest,0);
  });

  // Kolik stojí každý den
  const dailyCost = Math.round(totalInterest / Math.max(1, debts.reduce((a,d)=>{
    const s=d.schedule?.length?d.schedule:generateSchedule(d);
    return a+s.length;
  },0) * 30));

  // Kolik let/měsíců splácení zbývá
  const allSchedules = debts.map(d=>d.schedule?.length?d.schedule:generateSchedule(d));
  const maxMonths = Math.max(...allSchedules.map(s=>s.length),0);
  const years = Math.floor(maxMonths/12);
  const months = maxMonths%12;

  // Ekvivalenty přeplatku
  const overpay = Math.round(totalInterest);
  const vacations = Math.round(overpay/25000); // průměrná dovolená
  const iphones = Math.round(overpay/30000);
  const coffees = Math.round(overpay/65);

  // Příjem věnovaný dluhům
  const incomePct = baseIncome>0 ? Math.round(monthlyPayments/baseIncome*100) : 0;
  const yearsOfWork = baseIncome>0 ? Math.round(totalWillPay/baseIncome/12*10)/10 : 0;

  el.innerHTML=`<div class="reality-card">
    <div style="font-size:.72rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">💥 Kalkulačka dluhové reality</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px">
      <div class="reality-metric">
        <div class="reality-big" style="color:var(--expense)">${fmt(overpay)} Kč</div>
        <div class="reality-lbl">přeplatíte celkem na úrocích</div>
      </div>
      <div class="reality-metric">
        <div class="reality-big" style="color:var(--debt)">${dailyCost} Kč</div>
        <div class="reality-lbl">stojí vás dluh každý den</div>
      </div>
      <div class="reality-metric">
        <div class="reality-big" style="color:var(--expense)">${years>0?years+'r ':''} ${months}m</div>
        <div class="reality-lbl">ještě budete splácet</div>
      </div>
      <div class="reality-metric">
        <div class="reality-big" style="color:var(--debt)">${incomePct}%</div>
        <div class="reality-lbl">příjmu jde na splátky</div>
      </div>
    </div>
    <!-- Ekvivalenty -->
    <div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:.74rem;font-weight:600;color:var(--text2);margin-bottom:8px">Za přeplacené úroky (${fmt(overpay)} Kč) byste mohli mít:</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <div style="text-align:center;flex:1;min-width:60px">
          <div style="font-size:1.6rem">✈️</div>
          <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:var(--income)">${vacations}×</div>
          <div style="font-size:.68rem;color:var(--text3)">dovolených</div>
        </div>
        <div style="text-align:center;flex:1;min-width:60px">
          <div style="font-size:1.6rem">📱</div>
          <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:var(--income)">${iphones}×</div>
          <div style="font-size:.68rem;color:var(--text3)">nových telefonů</div>
        </div>
        <div style="text-align:center;flex:1;min-width:60px">
          <div style="font-size:1.6rem">☕</div>
          <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:var(--income)">${fmt(coffees)}×</div>
          <div style="font-size:.68rem;color:var(--text3)">káv</div>
        </div>
        <div style="text-align:center;flex:1;min-width:60px">
          <div style="font-size:1.6rem">💼</div>
          <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:var(--income)">${yearsOfWork}r</div>
          <div style="font-size:.68rem;color:var(--text3)">práce celkem</div>
        </div>
      </div>
    </div>
    <!-- Cena dluhu za hodinu – virální číslo -->
    <div class="hourly-cost-card" onclick="openFutureSim()" style="margin-bottom:10px">
      <div style="font-size:.72rem;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">💰 Vaše dluhy vás stojí</div>
      <div style="display:flex;align-items:baseline;justify-content:center;gap:8px;flex-wrap:wrap">
        <div class="hourly-big">${Math.round(totalInterest/Math.max(1,maxMonths*30*24))} Kč</div>
        <div style="font-size:1.1rem;color:var(--text2);font-weight:600">každou hodinu</div>
      </div>
      <div style="font-size:.76rem;color:var(--text3);margin-top:6px">
        ${Math.round(totalInterest/Math.max(1,maxMonths*30))} Kč/den · ${Math.round(totalInterest/Math.max(1,maxMonths))} Kč/měsíc jen na úrocích
      </div>
      <div style="font-size:.68rem;color:var(--text3);margin-top:4px">Klikněte pro simulaci jak to snížit →</div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  WIDGET: DLUHOVÝ STRES INDEX
// ══════════════════════════════════════════════════════
function renderDebtStressWidget(D) {
  const el = document.getElementById('debtStressWidget'); if(!el) return;
  const debts = D.debts || [];
  if(!debts.length) { el.innerHTML=''; return; }

  const baseIncome = computeBaseIncome(D);
  const monthlyPayments = debts.reduce((a,d)=>{
    const freq=d.freq||'monthly';
    return a+(freq==='weekly'?(d.payment||0)*4.33:freq==='biweekly'?(d.payment||0)*2.17:(d.payment||0));
  },0);
  const totalDebt = debts.reduce((a,d)=>a+d.remaining,0);
  const annualIncome = baseIncome*12;

  // 4 faktory stres indexu (každý 0-25 bodů)
  // 1. DSTI (splátky/příjem)
  const dsti = baseIncome>0 ? monthlyPayments/baseIncome*100 : 0;
  const dstiScore = dsti<20?0:dsti<35?10:dsti<50?18:25;

  // 2. DTI (dluh/roční příjem)
  const dti = annualIncome>0 ? totalDebt/annualIncome*100 : 0;
  const dtiScore = dti<300?0:dti<600?8:dti<900?16:25;

  // 3. Počet půjček
  const loanCount = debts.length;
  const loanScore = loanCount<=1?0:loanCount<=2?5:loanCount<=4?15:25;

  // 4. Rizikové typy (nebankovní, kreditka s vysokým využitím)
  const risky = debts.filter(d=>d.type==='nonbank'||d.interest>30).length;
  const riskyScore = risky===0?0:risky===1?10:risky===2?18:25;

  // Trend (porovnání s minulým měsícem)
  let pm=S.curMonth-1, py=S.curYear; if(pm<0){pm=11;py--;}
  const prevTxs = getTx(pm, py, D);
  const prevInc = incSum(prevTxs);
  const curInc = incSum(getTx(S.curMonth, S.curYear, D));
  const incomeTrend = prevInc>0 ? (curInc-prevInc)/prevInc*100 : 0;
  const trendBonus = incomeTrend>5?-5:incomeTrend<-5?5:0;

  const totalScore = Math.min(100, dstiScore+dtiScore+loanScore+riskyScore+trendBonus);
  const stressLevel = totalScore<30?'stable':totalScore<60?'risk':'spiral';
  const stressColor = stressLevel==='stable'?'var(--income)':stressLevel==='risk'?'var(--debt)':'var(--expense)';
  const stressLabel = stressLevel==='stable'?'🟢 Stabilní':stressLevel==='risk'?'🟡 Rizikové':'🔴 Dluhová spirála';
  const stressBg = stressLevel==='stable'?'rgba(74,222,128,.06)':stressLevel==='risk'?'rgba(251,191,36,.06)':'rgba(248,113,113,.06)';
  const stressBorder = stressLevel==='stable'?'rgba(74,222,128,.2)':stressLevel==='risk'?'rgba(251,191,36,.2)':'rgba(248,113,113,.25)';

  const factors = [
    {label:'Zatížení příjmu (DSTI)', val:Math.round(dsti)+'%', score:dstiScore, max:25, note:dsti<35?'✅ OK':dsti<50?'⚠️ Zvýšené':'🚨 Kritické'},
    {label:'Celková zadluženost (DTI)', val:Math.round(dti)+'%', score:dtiScore, max:25, note:dti<600?'✅ OK':dti<900?'⚠️ Blíží se limitu':'🚨 Překračuje ČNB limit'},
    {label:'Počet půjček', val:loanCount, score:loanScore, max:25, note:loanCount<=2?'✅ OK':loanCount<=4?'⚠️ Více půjček':'🚨 Příliš mnoho půjček'},
    {label:'Rizikové typy', val:risky+' půj.', score:riskyScore, max:25, note:risky===0?'✅ Žádné':risky===1?'⚠️ 1 riziková':'🚨 Více rizikových'},
  ];

  el.innerHTML=`<div class="stress-card" style="background:${stressBg};border-color:${stressBorder}">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div style="font-size:.72rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">🧠 Dluhový stres index</div>
      <div style="font-family:Syne,sans-serif;font-size:1.6rem;font-weight:800;color:${stressColor}">${totalScore}/100</div>
    </div>
    <!-- Gauge -->
    <div class="stress-gauge">
      <div class="stress-needle" style="left:${totalScore}%"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:.68rem;color:var(--text3);margin-bottom:12px">
      <span style="color:var(--income)">🟢 Stabilní</span>
      <span style="color:var(--debt)">🟡 Rizikové</span>
      <span style="color:var(--expense)">🔴 Spirála</span>
    </div>
    <div style="text-align:center;margin-bottom:14px">
      <span style="font-size:1rem;font-weight:700;color:${stressColor}">${stressLabel}</span>
      ${incomeTrend!==0?`<div style="font-size:.72rem;color:var(--text3);margin-top:3px">Příjem ${incomeTrend>0?'↑ roste':'↓ klesá'} o ${Math.abs(Math.round(incomeTrend))}% vs minulý měsíc</div>`:''}
    </div>
    <!-- 4 faktory -->
    <div style="display:flex;flex-direction:column;gap:6px">
      ${factors.map(f=>`
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;font-size:.74rem;margin-bottom:2px">
              <span style="color:var(--text2)">${f.label}</span>
              <span style="color:var(--text3)">${f.val} · ${f.note}</span>
            </div>
            <div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${Math.round(f.score/f.max*100)}%;background:${f.score<10?'var(--income)':f.score<18?'var(--debt)':'var(--expense)'};border-radius:3px;transition:width .6s"></div>
            </div>
          </div>
          <div style="font-size:.7rem;font-weight:700;color:${f.score<10?'var(--income)':f.score<18?'var(--debt)':'var(--expense)'};min-width:28px;text-align:right">${f.score}/${f.max}</div>
        </div>
      `).join('')}
    </div>
    ${stressLevel!=='stable'?`<div style="margin-top:12px;padding:8px 12px;background:var(--surface2);border-radius:8px;font-size:.76rem;color:var(--text2)">
      💡 ${stressLevel==='risk'?'Zvažte konsolidaci půjček nebo refinancování na nižší úrok.':'Váš finanční stres je kritický. Okamžitě kontaktujte finančního poradce nebo zvažte restrukturalizaci dluhů.'}
      <span onclick="openBetterLoanPage()" style="color:var(--bank);cursor:pointer;text-decoration:underline;margin-left:4px">Najdeme lepší úvěr →</span>
    </div>`:''}
  </div>`;
}

// ══════════════════════════════════════════════════════
//  SIMULACE BUDOUCNOSTI
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  DLUH VS INVESTOVÁNÍ
// ══════════════════════════════════════════════════════
function openDebtVsInvest() {
  if(!S.debts?.length) { alert('Nejprve přidejte půjčku.'); return; }
  const sel = document.getElementById('dviDebtId');
  sel.innerHTML = S.debts.map(d=>`<option value="${d.id}">${d.name} – ${d.interest}% p.a. – zbývá ${fmt(d.remaining)} Kč</option>`).join('');
  document.getElementById('dviAmount').value = Math.round((S.debts[0].payment||2000)*0.3);
  runDebtVsInvest();
  document.getElementById('modalDebtVsInvest').classList.add('open');
}

function runDebtVsInvest() {
  const id = document.getElementById('dviDebtId')?.value;
  const d = S.debts?.find(x=>x.id===id); if(!d) return;
  const monthly = parseFloat(document.getElementById('dviAmount')?.value)||0;
  const investReturn = parseFloat(document.getElementById('dviReturn')?.value)||7;
  const years = parseInt(document.getElementById('dviYears')?.value)||10;
  const rEl = document.getElementById('dviResult'); if(!rEl) return;
  if(!monthly) { rEl.innerHTML=''; return; }

  const debtRate = d.interest;
  const months = years * 12;

  // Varianta A: Extra splátka na půjčku
  const scheduleOrig = d.schedule?.length?d.schedule:generateSchedule(d);
  const debtWithExtra = {...d, payment:(d.payment||0)+monthly};
  const scheduleExtra = generateSchedule(debtWithExtra);
  const interestSaved = scheduleOrig.reduce((a,s)=>a+s.interest,0) - scheduleExtra.reduce((a,s)=>a+s.interest,0);
  const monthsSaved = scheduleOrig.length - scheduleExtra.length;
  // Po splacení investuj dál zbývající čas
  const remainingMonths = Math.max(0, months - scheduleExtra.length);
  const investAfterDebt = remainingMonths > 0 ?
    monthly * ((Math.pow(1+investReturn/100/12, remainingMonths)-1)/(investReturn/100/12)) : 0;
  const totalRepayBenefit = Math.round(interestSaved + investAfterDebt);

  // Varianta B: Investovat místo splácení
  const investTotal = Math.round(monthly * ((Math.pow(1+investReturn/100/12, months)-1)/(investReturn/100/12)));
  const extraInterestPaid = Math.round(monthly * monthsSaved); // úroky zaplacené navíc kvůli pomalejšímu splácení

  const netInvestBenefit = investTotal - extraInterestPaid;
  const breakeven = debtRate; // pokud výnos > úrok → investuj, jinak splácet

  const investWins = investReturn > debtRate;
  const winner = investWins ? 'invest' : 'repay';
  const winnerLabel = investWins ? '📈 Investování' : '💳 Splácení dluhu';
  const winnerColor = investWins ? 'var(--income)' : 'var(--bank)';
  const diff = Math.abs(totalRepayBenefit - netInvestBenefit);

  rEl.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div class="dvi-winner repay">
        <div style="font-size:.7rem;font-weight:700;color:var(--text3);margin-bottom:6px">💳 EXTRA SPLÁTKA</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--bank)">${fmt(totalRepayBenefit)} Kč</div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:4px">ušetříte na úrocích + investice po splacení</div>
        <div style="font-size:.72rem;color:var(--income);margin-top:3px">Splatíte o ${Math.floor(monthsSaved/12)}r ${monthsSaved%12}m dříve</div>
      </div>
      <div class="dvi-winner invest">
        <div style="font-size:.7rem;font-weight:700;color:var(--text3);margin-bottom:6px">📈 INVESTOVÁNÍ (${investReturn}% p.a.)</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--income)">${fmt(netInvestBenefit)} Kč</div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:4px">čistý výnos za ${years} let minus extra úroky</div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:3px">Celkový výnos: ${fmt(investTotal)} Kč</div>
      </div>
    </div>
    <div style="background:${investWins?'rgba(74,222,128,.08)':'rgba(96,165,250,.08)'};border:1px solid ${investWins?'rgba(74,222,128,.2)':'rgba(96,165,250,.2)'};border-radius:12px;padding:14px;text-align:center;margin-bottom:10px">
      <div style="font-size:.8rem;color:var(--text3);margin-bottom:4px">Vítěz při úroku ${debtRate}% vs výnos ${investReturn}%</div>
      <div style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800;color:${winnerColor}">${winnerLabel} 🏆</div>
      <div style="font-size:.78rem;color:var(--text2);margin-top:4px">o <strong>${fmt(diff)} Kč</strong> výhodnější za ${years} let</div>
    </div>
    <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;font-size:.76rem;color:var(--text2);border:1px solid var(--border)">
      📐 <strong>Zlaté pravidlo:</strong> Pokud je výnos investice <strong>vyšší než úrok půjčky</strong> → investuj.
      Zlomový bod je při <strong>${debtRate}% výnosu</strong>.
      ${investReturn > debtRate ?
        `Váš očekávaný výnos ${investReturn}% > úrok ${debtRate}% → <span style="color:var(--income)">investování vychází lépe</span>.` :
        `Váš očekávaný výnos ${investReturn}% < úrok ${debtRate}% → <span style="color:var(--bank)">splácet je jistější volba</span>.`}
    </div>`;

  // Draw chart
  drawDviChart(scheduleOrig.length, scheduleExtra.length, monthly, investReturn, years);
}

function drawDviChart(origMonths, extraMonths, monthly, investReturn, years) {
  setTimeout(()=>{
    const canvas = document.getElementById('dviChart'); if(!canvas) return;
    const W = canvas.parentElement?.clientWidth||480;
    canvas.width=W; canvas.height=160;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,W,160);
    const months = years*12;
    const r = investReturn/100/12;
    const pad={l:55,r:10,t:10,b:24};
    const cW=W-pad.l-pad.r, cH=160-pad.t-pad.b;

    // Build series
    const investSeries=[], repaySeries=[];
    let cumInvest=0, cumSaved=0;
    for(let i=1;i<=months;i++){
      cumInvest = cumInvest*(1+r)+monthly;
      // Repay: after loan paid off, invest the freed amount
      if(i<=extraMonths) cumSaved=0;
      else cumSaved = cumSaved*(1+r)+monthly;
      investSeries.push(cumInvest);
      repaySeries.push(cumSaved);
    }
    const maxVal = Math.max(...investSeries, ...repaySeries);
    const x=i=>pad.l+(i/months)*cW;
    const y=v=>pad.t+cH-(v/maxVal)*cH;

    // Grid
    ctx.strokeStyle='rgba(46,51,71,.5)';ctx.lineWidth=1;ctx.setLineDash([3,3]);
    [0,0.5,1].forEach(f=>{ctx.beginPath();ctx.moveTo(pad.l,pad.t+cH*(1-f));ctx.lineTo(W-pad.r,pad.t+cH*(1-f));ctx.stroke();});
    ctx.setLineDash([]);

    // Invest line (green)
    ctx.beginPath();
    investSeries.forEach((v,i)=>i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
    ctx.strokeStyle='var(--income)';ctx.lineWidth=2;ctx.stroke();

    // Repay+invest line (blue)
    ctx.beginPath();
    repaySeries.forEach((v,i)=>i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
    ctx.strokeStyle='var(--bank)';ctx.lineWidth=2;ctx.setLineDash([5,3]);ctx.stroke();
    ctx.setLineDash([]);

    // Y labels
    ctx.fillStyle='rgba(139,144,168,.7)';ctx.font='10px Instrument Sans';ctx.textAlign='right';
    [0,maxVal/2,maxVal].forEach(v=>ctx.fillText(fmt(Math.round(v)),pad.l-3,y(v)+4));

    // Legend
    ctx.textAlign='left';ctx.font='10px Instrument Sans';ctx.fillStyle='rgba(139,144,168,.7)';
    ctx.fillStyle='var(--income)';ctx.fillRect(pad.l,152,14,3);
    ctx.fillStyle='rgba(139,144,168,.7)';ctx.fillText('Investice hned',pad.l+17,158);
    ctx.fillStyle='var(--bank)';ctx.fillRect(pad.l+110,152,14,3);
    ctx.fillStyle='rgba(139,144,168,.7)';ctx.fillText('Splácet → pak investovat',pad.l+127,158);
  },50);
}

// ══════════════════════════════════════════════════════
//  KOLIK TĚ STOJÍ ODKLÁDÁNÍ
// ══════════════════════════════════════════════════════
function openDelayCost() {
  if(!S.debts?.length) { alert('Nejprve přidejte půjčku.'); return; }
  const sel = document.getElementById('delayDebtId');
  sel.innerHTML = S.debts.map(d=>`<option value="${d.id}">${d.name} – ${d.interest}% p.a.</option>`).join('');
  const firstDebt = S.debts[0];
  document.getElementById('delayNewRate').value = Math.max(1, Math.round((firstDebt.interest||10) * 0.6 * 10)/10);
  runDelayCost();
  document.getElementById('modalDelayCost').classList.add('open');
}

function runDelayCost() {
  const id = document.getElementById('delayDebtId')?.value;
  const d = S.debts?.find(x=>x.id===id); if(!d) return;
  const newRate = parseFloat(document.getElementById('delayNewRate')?.value)||0;
  const rEl = document.getElementById('delayCostResult'); if(!rEl) return;
  if(!newRate || newRate >= d.interest) {
    rEl.innerHTML=`<div class="insight-item warn"><div class="insight-icon">⚠️</div><div class="insight-text">Nový úrok musí být nižší než současný (${d.interest}%)</div></div>`;
    return;
  }

  const origSchedule = d.schedule?.length?d.schedule:generateSchedule(d);
  const origInterest = origSchedule.reduce((a,s)=>a+s.interest,0);

  // Refinancování dnes
  const refinNow = {...d, interest:newRate};
  refinNow.schedule = generateSchedule(refinNow);
  const refinNowInterest = refinNow.schedule.reduce((a,s)=>a+s.interest,0);
  const saveNow = Math.round(origInterest - refinNowInterest);

  // Refinancování za X měsíců
  const delays = [3,6,12,24,36];
  const delayRows = delays.map(delayMonths => {
    // After delay months, remaining debt
    let rem = d.remaining;
    let extraInterest = 0;
    const r = d.interest/100/12;
    for(let i=0;i<delayMonths && rem>0;i++) {
      const interest = rem*r;
      const principal = Math.min((d.payment||0)-interest, rem);
      if(principal<=0) break;
      extraInterest += interest;
      rem = Math.max(0, rem-principal);
    }
    const delayedDebt = {...d, remaining:rem, interest:newRate, payment:d.payment};
    const delayedSchedule = generateSchedule(delayedDebt);
    const delayedInterest = delayedSchedule.reduce((a,s)=>a+s.interest,0) + extraInterest;
    const saveDelayed = Math.round(origInterest - delayedInterest);
    const costOfDelay = saveNow - saveDelayed;
    return {months:delayMonths, save:saveDelayed, cost:costOfDelay};
  });

  const costPerMonth = delayRows[0].cost / 3;

  rEl.innerHTML=`
    <div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:10px;padding:12px;margin-bottom:12px;text-align:center">
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:4px">Refinancujete-li DNES (${d.interest}% → ${newRate}%)</div>
      <div style="font-family:Syne,sans-serif;font-size:1.8rem;font-weight:800;color:var(--income)">Ušetříte ${fmt(saveNow)} Kč</div>
      <div style="font-size:.76rem;color:var(--text3);margin-top:4px">Každý měsíc čekání vás stojí ~${fmt(Math.round(costPerMonth))} Kč</div>
    </div>
    <div style="margin-bottom:10px">
      <div class="delay-row today">
        <span style="font-weight:700;color:var(--income)">✅ Refinancování DNES</span>
        <span style="font-weight:800;color:var(--income);font-family:Syne,sans-serif">${fmt(saveNow)} Kč</span>
      </div>
      ${delayRows.map(r=>`
        <div class="delay-row later">
          <div>
            <div style="font-weight:600">Za ${r.months < 12 ? r.months+' měsíců' : Math.floor(r.months/12)+(r.months%12?' r '+r.months%12+' m':' rok')}</div>
            <div style="font-size:.72rem;color:var(--expense)">Přijdete o ${fmt(r.cost)} Kč odkládáním</div>
          </div>
          <span style="font-weight:700;color:${r.save>0?'var(--text2)':'var(--expense)'};font-family:Syne,sans-serif">${r.save>0?fmt(r.save)+' Kč':'nevýhodné'}</span>
        </div>
      `).join('')}
    </div>
    <div style="font-size:.74rem;color:var(--text3);text-align:center;padding:8px">
      ⏰ Každý den bez refinancování vás stojí <strong style="color:var(--expense)">${fmt(Math.round(costPerMonth/30))} Kč</strong>
    </div>`;
}

function openFutureSim() {
  if(!S.debts?.length) { alert('Nejprve přidejte půjčku.'); return; }
  const sel = document.getElementById('futureSimDebtId');
  sel.innerHTML = S.debts.map(d=>`<option value="${d.id}">${d.name} – zbývá ${fmt(d.remaining)} Kč</option>`).join('');
  document.getElementById('futureSlider').value = 1000;
  document.getElementById('futureSliderVal').textContent = '+1 000 Kč';
  runFutureSim();
  document.getElementById('modalFutureSim').classList.add('open');
}

function runFutureSim() {
  const id = document.getElementById('futureSimDebtId')?.value;
  const d = S.debts?.find(x=>x.id===id); if(!d) return;
  const extra = parseInt(document.getElementById('futureSlider')?.value)||0;
  const rEl = document.getElementById('futureSimResult'); if(!rEl) return;

  // Original
  const origSchedule = d.schedule?.length?d.schedule:generateSchedule(d);
  const origTotal = origSchedule.reduce((a,s)=>a+s.payment,0);
  const origInterest = origSchedule.reduce((a,s)=>a+s.interest,0);

  // With extra payment
  const newDebt = {...d, payment:(d.payment||0)+extra};
  const newSchedule = generateSchedule(newDebt);
  const newTotal = newSchedule.reduce((a,s)=>a+s.payment,0);
  const newInterest = newSchedule.reduce((a,s)=>a+s.interest,0);

  const savedMoney = Math.round(origTotal - newTotal);
  const savedMonths = origSchedule.length - newSchedule.length;
  const savedYears = Math.floor(savedMonths/12);
  const savedMonthsRem = savedMonths%12;
  const freq = d.freq||'monthly';
  const freqLabel = freq==='weekly'?'týdně':freq==='biweekly'?'2 týdny':'měsíčně';

  if(extra === 0) {
    rEl.innerHTML=`<div style="text-align:center;padding:16px;color:var(--text3)">Pohybujte sliderem pro zobrazení výsledku</div>`;
    return;
  }

  rEl.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border);text-align:center">
        <div style="font-size:.68rem;color:var(--text3);margin-bottom:4px;font-weight:600">BEZ ZMĚNY</div>
        <div style="font-family:Syne,sans-serif;font-size:1rem;font-weight:700">${origSchedule.length} splátek</div>
        <div style="font-size:.76rem;color:var(--text3)">${fmt(d.payment||0)} Kč/${freqLabel}</div>
        <div style="font-size:.76rem;color:var(--debt);margin-top:4px">Úroky: ${fmt(Math.round(origInterest))} Kč</div>
      </div>
      <div style="background:var(--income-bg);border-radius:10px;padding:12px;border:1px solid rgba(74,222,128,.3);text-align:center">
        <div style="font-size:.68rem;color:var(--text3);margin-bottom:4px;font-weight:600">S EXTRA +${fmt(extra)} Kč</div>
        <div style="font-family:Syne,sans-serif;font-size:1rem;font-weight:700;color:var(--income)">${newSchedule.length} splátek</div>
        <div style="font-size:.76rem;color:var(--text3)">${fmt((d.payment||0)+extra)} Kč/${freqLabel}</div>
        <div style="font-size:.76rem;color:var(--income);margin-top:4px">Úroky: ${fmt(Math.round(newInterest))} Kč</div>
      </div>
    </div>
    ${savedMoney>0?`
    <div style="background:linear-gradient(135deg,rgba(74,222,128,.1),rgba(96,165,250,.05));border:1px solid rgba(74,222,128,.2);border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:.74rem;color:var(--text3);margin-bottom:4px">Přidáním ${fmt(extra)} Kč/${freqLabel} navíc:</div>
      <div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap">
        <div>
          <div style="font-family:Syne,sans-serif;font-size:1.6rem;font-weight:800;color:var(--income)">💰 ${fmt(savedMoney)} Kč</div>
          <div style="font-size:.72rem;color:var(--text3)">ušetříte na úrocích</div>
        </div>
        <div>
          <div style="font-family:Syne,sans-serif;font-size:1.6rem;font-weight:800;color:var(--income)">⏱️ ${savedYears>0?savedYears+'r ':''} ${savedMonthsRem}m</div>
          <div style="font-size:.72rem;color:var(--text3)">dříve splatíte</div>
        </div>
      </div>
    </div>`:''}`;

  // Draw comparison chart
  drawFutureSimChart(origSchedule, newSchedule);
}

function drawFutureSimChart(orig, newSched) {
  setTimeout(()=>{
    const canvas = document.getElementById('futureSimChart'); if(!canvas) return;
    const W = canvas.parentElement?.clientWidth||480;
    canvas.width=W; canvas.height=160;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,W,160);
    if(!orig.length) return;

    const maxMonths = Math.max(orig.length, newSched.length);
    const step = Math.max(1, Math.floor(maxMonths/40));
    const origPts = [], newPts = [];
    for(let i=0;i<maxMonths;i+=step){
      origPts.push(orig[i]?.remaining??0);
      newPts.push(newSched[i]?.remaining??0);
    }
    const maxVal = orig[0]?.remaining||1;
    const pad={l:50,r:10,t:10,b:24};
    const cW=W-pad.l-pad.r, cH=160-pad.t-pad.b;
    const x=(i,len)=>pad.l+(i/(len-1||1))*cW;
    const y=v=>pad.t+cH-(v/maxVal)*cH;

    // Grid
    ctx.strokeStyle='rgba(46,51,71,.5)';ctx.lineWidth=1;ctx.setLineDash([3,3]);
    [0,0.5,1].forEach(f=>{ctx.beginPath();ctx.moveTo(pad.l,pad.t+cH*(1-f));ctx.lineTo(W-pad.r,pad.t+cH*(1-f));ctx.stroke();});
    ctx.setLineDash([]);

    // Original line (red)
    ctx.beginPath();
    origPts.forEach((v,i)=>i===0?ctx.moveTo(x(i,origPts.length),y(v)):ctx.lineTo(x(i,origPts.length),y(v)));
    ctx.strokeStyle='var(--expense)';ctx.lineWidth=2;ctx.stroke();

    // New line (green)
    ctx.beginPath();
    newPts.forEach((v,i)=>i===0?ctx.moveTo(x(i,newPts.length),y(v)):ctx.lineTo(x(i,newPts.length),y(v)));
    ctx.strokeStyle='var(--income)';ctx.lineWidth=2.5;ctx.stroke();

    // Y labels
    ctx.fillStyle='rgba(139,144,168,.7)';ctx.font='10px Instrument Sans';ctx.textAlign='right';
    [0,maxVal/2,maxVal].forEach(v=>ctx.fillText(fmt(Math.round(v)),pad.l-3,y(v)+4));

    // Legend
    ctx.textAlign='left';ctx.font='10px Instrument Sans';
    ctx.fillStyle='var(--expense)';ctx.fillRect(pad.l,152,12,4);
    ctx.fillStyle='rgba(139,144,168,.7)';ctx.fillText('Bez změny',pad.l+15,158);
    ctx.fillStyle='var(--income)';ctx.fillRect(pad.l+85,152,12,4);
    ctx.fillStyle='rgba(139,144,168,.7)';ctx.fillText('S extra splátkou',pad.l+100,158);
  },50);
}
function renderDebtFreedomWidget(D) {
  const el = document.getElementById('debtFreedomWidget'); if(!el) return;
  const debts = D.debts || [];
  if(!debts.length) { el.innerHTML=''; return; }

  const baseIncome = computeBaseIncome(D);
  const monthlyPayments = debts.reduce((a,d) => {
    const freq = d.freq||'monthly';
    const monthly = freq==='weekly'?(d.payment||0)*4.33:freq==='biweekly'?(d.payment||0)*2.17:(d.payment||0);
    return a + monthly;
  }, 0);
  if(!baseIncome || !monthlyPayments) { el.innerHTML=''; return; }

  const pct = Math.min(100, Math.round(monthlyPayments / baseIncome * 100));
  const daysPerMonth = 21;
  const daysForDebt = Math.round(daysPerMonth * pct / 100);
  const daysForSelf = daysPerMonth - daysForDebt;
  const safe = pct <= 30;
  const warning = pct > 30 && pct <= 50;
  const barColor = safe?'var(--income)':warning?'var(--debt)':'var(--expense)';

  // Fun metrics
  const coffeePrice = 65; // Kč za kávu
  const coffeesPerMonth = Math.round(monthlyPayments / coffeePrice);
  const pizzaPrice = 180;
  const pizzasPerMonth = Math.round(monthlyPayments / pizzaPrice);
  const netflixPrice = 239;
  const netflixMonths = Math.round(monthlyPayments / netflixPrice);
  const hourlyWage = Math.round(baseIncome / (21 * 8)); // Kč/hod
  const hoursForDebt = Math.round(monthlyPayments / hourlyWage);

  // Debt-free day
  const allSchedules = debts.map(d => d.schedule?.length ? d.schedule : generateSchedule(d));
  const lastPaymentDate = allSchedules.reduce((latest, schedule) => {
    if(!schedule.length) return latest;
    const last = schedule[schedule.length-1].date;
    return last > latest ? last : latest;
  }, new Date().toISOString().slice(0,10));
  const debtFreeDate = new Date(lastPaymentDate);
  const today = new Date();
  const daysUntilFree = Math.ceil((debtFreeDate - today) / (24*60*60*1000));
  const yearsUntilFree = Math.floor(daysUntilFree / 365);
  const monthsUntilFree = Math.floor((daysUntilFree % 365) / 30);
  const debtFreeDateStr = debtFreeDate.toLocaleDateString('cs-CZ', {day:'numeric', month:'long', year:'numeric'});

  el.innerHTML = `<div class="debt-freedom-card">
    <div style="font-size:.72rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">💸 Jak pracuješ pro banky</div>

    <!-- Hlavní číslo -->
    <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:14px">
      <div style="text-align:center;min-width:80px">
        <div class="debt-days-big" style="color:${barColor}">${daysForDebt}</div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:2px">dní / měsíc<br>pro banky</div>
      </div>
      <div style="flex:1;min-width:160px">
        <div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--text3);margin-bottom:3px">
          <span>0 dní</span>
          <span style="color:${barColor};font-weight:700">${pct}% příjmu</span>
          <span>21 dní</span>
        </div>
        <div class="trap-bar" style="height:14px">
          <div class="trap-bar-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <div style="font-size:.74rem;margin-top:5px">
          ${safe?`<span style="color:var(--income)">✅ Bezpečné pásmo</span>`:
            warning?`<span style="color:var(--debt)">⚠️ Zvýšené zatížení</span>`:
            `<span style="color:var(--expense)">🚨 Kritické! Hrozí finanční potíže</span>`}
        </div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:3px">
          Splátky <strong>${fmt(Math.round(monthlyPayments))} Kč</strong> z příjmu <strong>${fmt(Math.round(baseIncome))} Kč</strong>
        </div>
      </div>
    </div>

    <!-- Vizuální kalendář -->
    <div style="display:flex;gap:2px;flex-wrap:wrap;margin-bottom:8px">
      ${Array.from({length:daysPerMonth},(_,i)=>`
        <div title="${i<daysForDebt?'Pro banky':'Pro tebe'}" style="width:24px;height:24px;border-radius:4px;background:${i<daysForDebt?barColor:'var(--income)'};opacity:${i<daysForDebt?'.75':'.35'};display:flex;align-items:center;justify-content:center;font-size:.58rem;color:white;font-weight:700">${i+1}</div>
      `).join('')}
    </div>
    <div style="font-size:.68rem;color:var(--text3);margin-bottom:14px">
      <span style="background:${barColor};padding:1px 8px;border-radius:3px;color:white;opacity:.8">■ ${daysForDebt} dní pro banky</span>
      &nbsp;
      <span style="background:var(--income);padding:1px 8px;border-radius:3px;color:white;opacity:.4">■ ${daysForSelf} dní pro tebe</span>
    </div>

    <!-- Fun metriky -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px">
      <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;border:1px solid var(--border)">
        <div style="font-size:1.4rem;margin-bottom:2px">☕</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--debt)">${coffeesPerMonth}×</div>
        <div style="font-size:.72rem;color:var(--text3)">káv měsíčně místo splátky</div>
        <div style="font-size:.68rem;color:var(--text3);margin-top:2px">(při ceně ${coffeePrice} Kč/káva)</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;border:1px solid var(--border)">
        <div style="font-size:1.4rem;margin-bottom:2px">🍕</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--debt)">${pizzasPerMonth}×</div>
        <div style="font-size:.72rem;color:var(--text3)">pizz měsíčně místo splátky</div>
        <div style="font-size:.68rem;color:var(--text3);margin-top:2px">(při ceně ${pizzaPrice} Kč/pizza)</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;border:1px solid var(--border)">
        <div style="font-size:1.4rem;margin-bottom:2px">📺</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--debt)">${netflixMonths}×</div>
        <div style="font-size:.72rem;color:var(--text3)">Netflix měsíců místo splátky</div>
        <div style="font-size:.68rem;color:var(--text3);margin-top:2px">(${netflixPrice} Kč/měs)</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;border:1px solid var(--border)">
        <div style="font-size:1.4rem;margin-bottom:2px">⏱️</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--debt)">${hoursForDebt}h</div>
        <div style="font-size:.72rem;color:var(--text3)">práce měsíčně jen na dluhy</div>
        <div style="font-size:.68rem;color:var(--text3);margin-top:2px">(${hourlyWage} Kč/hod)</div>
      </div>
    </div>

    <!-- Debt-free day -->
    <div style="background:linear-gradient(135deg,rgba(74,222,128,.1),rgba(96,165,250,.1));border:1px solid rgba(74,222,128,.25);border-radius:12px;padding:12px 14px;text-align:center">
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">🎉 Debt-free day</div>
      <div style="font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800;color:var(--income)">${debtFreeDateStr}</div>
      <div style="font-size:.78rem;color:var(--text2);margin-top:4px">
        za <strong>${yearsUntilFree > 0 ? yearsUntilFree+'r ' : ''}${monthsUntilFree}m</strong> budete zcela bez dluhů! 🥳
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  WIDGET: MAPA DLUHOVÉ PASTI
// ══════════════════════════════════════════════════════
function renderDebtTrapWidget(D) {
  const el = document.getElementById('debtTrapWidget'); if(!el) return;
  const debts = D.debts || [];
  if(!debts.length) { el.innerHTML=''; return; }

  const totalBorrowed = debts.reduce((a,d) => a + (d.total||0), 0);
  const totalRemaining = debts.reduce((a,d) => a + (d.remaining||0), 0);

  // Calculate total to be paid (from schedules)
  let totalWillPay = 0;
  debts.forEach(d => {
    const schedule = d.schedule?.length ? d.schedule : generateSchedule(d);
    const paid = d.total - d.remaining; // already paid
    totalWillPay += paid + schedule.reduce((a,s)=>a+s.payment,0);
  });

  const totalInterest = totalWillPay - totalBorrowed;
  const overpayCurrent = totalWillPay - totalBorrowed;
  const overpayPct = totalBorrowed > 0 ? Math.round(overpayCurrent/totalBorrowed*100) : 0;

  // Already paid back
  const alreadyPaid = debts.reduce((a,d) => a + (d.total - d.remaining), 0);
  const progressPct = totalBorrowed > 0 ? Math.min(100, Math.round(alreadyPaid/totalBorrowed*100)) : 0;

  const severity = overpayPct < 20 ? 'low' : overpayPct < 50 ? 'mid' : 'high';
  const severityColor = severity==='low'?'var(--income)':severity==='mid'?'var(--debt)':'var(--expense)';
  const severityLabel = severity==='low'?'Výhodné půjčky':'mid'===severity?'Průměrné zatížení':'🔴 Dluhová past';

  el.innerHTML = `<div class="debt-trap-card">
    <div style="font-size:.72rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">🗺️ Mapa dluhové pasti</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
      <div>
        <div style="font-size:.68rem;color:var(--text3)">Půjčeno celkem</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700">${fmt(totalBorrowed)} Kč</div>
      </div>
      <div>
        <div style="font-size:.68rem;color:var(--text3)">Celkem zaplatíte</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700;color:var(--expense)">${fmt(Math.round(totalWillPay))} Kč</div>
      </div>
      <div>
        <div style="font-size:.68rem;color:var(--text3)">Přeplatíte</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700;color:${severityColor}">+${fmt(Math.round(totalInterest))} Kč</div>
      </div>
    </div>
    <!-- Přeplatek bar -->
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--text3);margin-bottom:3px">
        <span>Jistina ${fmt(totalBorrowed)} Kč</span>
        <span style="color:${severityColor};font-weight:700">+${overpayPct}% přeplatek</span>
      </div>
      <div style="height:16px;border-radius:8px;background:var(--surface3);overflow:hidden;position:relative">
        <div style="height:100%;width:${Math.min(100,100/(1+overpayPct/100))}%;background:var(--income);border-radius:8px 0 0 8px;position:absolute"></div>
        <div style="height:100%;left:${Math.min(100,100/(1+overpayPct/100))}%;right:0;background:${severityColor};opacity:.7;position:absolute;border-radius:0 8px 8px 0"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.68rem;margin-top:2px">
        <span style="color:var(--income)">■ Jistina</span>
        <span style="color:${severityColor}">■ Úroky +${fmt(Math.round(totalInterest))} Kč</span>
        <span style="color:${severityColor};font-weight:700">${severityLabel}</span>
      </div>
    </div>
    <!-- Pokrok splácení -->
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--text3);margin-bottom:3px">
        <span>Pokrok splácení</span>
        <span style="font-weight:600;color:var(--income)">${progressPct}% splaceno</span>
      </div>
      <div class="trap-bar"><div class="trap-bar-fill" style="width:${progressPct}%;background:var(--income)"></div></div>
      <div style="font-size:.7rem;color:var(--text3);margin-top:2px">Splaceno: ${fmt(alreadyPaid)} Kč · Zbývá: ${fmt(totalRemaining)} Kč</div>
    </div>
    ${buildDebtSpiralWarnings(D)}
    ${debts.length > 0 ? `<div style="margin-top:10px;text-align:center">
      <button class="btn btn-ghost btn-sm" onclick="openBetterLoanPage()" style="font-size:.76rem">
        🔍 Najdeme vám výhodnější refinancování →
      </button>
    </div>` : ''}
  </div>`;
}

// ══════════════════════════════════════════════════════
//  VAROVNÉ SIGNÁLY DLUHOVÉ SPIRÁLY
// ══════════════════════════════════════════════════════
function buildDebtSpiralWarnings(D) {
  const debts = D.debts || [];
  if(!debts.length) return '';
  const baseIncome = computeBaseIncome(D);
  const monthlyPayments = debts.reduce((a,d) => {
    const freq = d.freq||'monthly';
    return a + (freq==='weekly'?(d.payment||0)*4.33:freq==='biweekly'?(d.payment||0)*2.17:(d.payment||0));
  }, 0);
  const dsti = baseIncome > 0 ? monthlyPayments/baseIncome*100 : 0;

  const warnings = [];
  const good = [];

  // Signál 1 – splátky > 50% příjmu
  if(dsti > 50) warnings.push('🔴 Splátky tvoří ' + Math.round(dsti) + '% příjmu (> 50%) – kritické zatížení');
  else if(dsti > 35) warnings.push('🟡 Splátky tvoří ' + Math.round(dsti) + '% příjmu (> 35%) – zvýšené riziko');
  else good.push('✅ Splátky ' + Math.round(dsti) + '% příjmu – v bezpečném pásmu');

  // Signál 2 – více než 4 půjčky
  if(debts.length > 4) warnings.push('🔴 Máte ' + debts.length + ' půjček – typický znak dluhové spirály');
  else if(debts.length > 2) warnings.push('🟡 Máte ' + debts.length + ' půjčky – zvažte konsolidaci');
  else good.push('✅ Počet půjček (' + debts.length + ') je v pořádku');

  // Signál 3 – nebankovní půjčky
  const nonbank = debts.filter(d => d.type==='nonbank');
  if(nonbank.length > 0) warnings.push('🔴 ' + nonbank.length + ' nebankovní půjčka – velmi vysoké RPSN');

  // Signál 4 – kreditní karty
  const credit = debts.filter(d => d.type==='credit');
  if(credit.length > 0) {
    const creditDebt = credit.reduce((a,d)=>a+d.remaining,0);
    const creditTotal = credit.reduce((a,d)=>a+d.total,0);
    const creditPct = creditTotal > 0 ? creditDebt/creditTotal*100 : 0;
    if(creditPct > 70) warnings.push('🔴 Kreditní karta využita na ' + Math.round(creditPct) + '% limitu (> 70%)');
    else if(creditPct > 40) warnings.push('🟡 Kreditní karta využita na ' + Math.round(creditPct) + '% limitu');
    else good.push('✅ Kreditní karta využita na ' + Math.round(creditPct) + '% – OK');
  }

  // Signál 5 – vysoké RPSN
  const highRpsnDebts = debts.filter(d => d.interest > 30);
  if(highRpsnDebts.length > 0) warnings.push('🔴 ' + highRpsnDebts.length + ' půjčka s úrokem > 30% p.a. – drahé peníze');

  // Signál 6 – po splatnosti
  const today = new Date().toISOString().slice(0,10);
  const overdueDebts = debts.filter(d => d.dueDate && d.dueDate < today && d.remaining > 0);
  if(overdueDebts.length > 0) warnings.push('🔴 ' + overdueDebts.length + ' půjčka po datu splatnosti!');

  if(!warnings.length && !good.length) return '';

  const spiralRisk = warnings.filter(w=>w.startsWith('🔴')).length;
  const overallStatus = spiralRisk >= 3 ? 'danger' : spiralRisk >= 1 ? 'warn' : 'safe';

  return `
    <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
      <div style="font-size:.74rem;font-weight:700;color:var(--text2);margin-bottom:8px;display:flex;align-items:center;gap:6px">
        ${overallStatus==='danger'?'🚨 Riziko dluhové spirály!':overallStatus==='warn'?'⚠️ Varovné signály':'✅ Žádné varovné signály'}
        <span style="font-size:.68rem;font-weight:400;color:var(--text3)">(${warnings.length} varování, ${good.length} v pořádku)</span>
      </div>
      ${warnings.map(w=>`<div style="font-size:.76rem;padding:5px 0;border-bottom:1px solid var(--border)">${w}</div>`).join('')}
      ${good.map(g=>`<div style="font-size:.74rem;padding:4px 0;color:var(--text3)">${g}</div>`).join('')}
      ${spiralRisk >= 2 ? `<div style="margin-top:8px;padding:8px 10px;background:var(--expense-bg);border-radius:8px;border:1px solid rgba(248,113,113,.2);font-size:.76rem;color:var(--text2)">
        ⚠️ <strong>Riziko dluhové spirály:</strong> Více červených signálů najednou znamená, že nové půjčky jsou nutné jen pro splácení starých. Okamžitě zvažte konsolidaci nebo refinancování.
      </div>` : ''}
    </div>`;
}

function openBetterLoanPage() {
  // Open the standalone better loan page
  window.open('https://bcmilda.github.io/financeflow/lepsi-uver.html', '_blank');
}

// ══════════════════════════════════════════════════════
//  KONSOLIDACE PŮJČEK
// ══════════════════════════════════════════════════════
function openConsolidate() {
  if(!S.debts?.length) { alert('Nemáte žádné půjčky ke konsolidaci.'); return; }
  // Build checklist
  const el = document.getElementById('consolidateCheckList'); if(!el) return;
  el.innerHTML = '<div style="font-size:.74rem;font-weight:600;color:var(--text2);margin-bottom:6px">Vyberte půjčky ke sloučení:</div>' +
    S.debts.map(d => `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface2);border-radius:8px;margin-bottom:5px;cursor:pointer">
      <input type="checkbox" checked class="cons-check" data-id="${d.id}" onchange="runConsolidate()" style="width:16px;height:16px;accent-color:var(--income)">
      <div style="flex:1">
        <div style="font-size:.82rem;font-weight:600">${d.name}</div>
        <div style="font-size:.72rem;color:var(--text3)">Zbývá: ${fmt(d.remaining)} Kč · ${d.interest}% p.a. · ${fmt(d.payment||0)} Kč/${d.freq==='weekly'?'týdně':'měsíčně'}</div>
      </div>
      <div style="font-weight:700;color:var(--expense);font-size:.9rem">${fmt(d.remaining)} Kč</div>
    </label>`).join('');
  // Set default new rate as average of selected
  const avgRate = Math.round(S.debts.reduce((a,d)=>a+d.interest,0)/S.debts.length * 10)/10;
  document.getElementById('consRate').value = Math.max(avgRate - 2, 3); // suggest lower rate
  document.getElementById('consPayment').value = '';
  document.getElementById('consMonths').value = 60;
  runConsolidate();
  document.getElementById('modalConsolidate').classList.add('open');
}

function runConsolidate() {
  const checked = [...document.querySelectorAll('.cons-check:checked')].map(c => c.dataset.id);
  const selected = (S.debts||[]).filter(d => checked.includes(d.id));
  const result = document.getElementById('consolidateResult'); if(!result) return;
  if(!selected.length) { result.innerHTML = '<div class="insight-item warn"><div class="insight-icon">⚠️</div><div class="insight-text">Vyberte alespoň jednu půjčku</div></div>'; return; }

  const totalRemaining = selected.reduce((a,d) => a + d.remaining, 0);
  const newRate = parseFloat(document.getElementById('consRate')?.value) || 8;
  const newMonths = parseInt(document.getElementById('consMonths')?.value) || 60;
  const customPayment = parseFloat(document.getElementById('consPayment')?.value) || 0;

  // Current state – total monthly payments and total interest
  const currentMonthly = selected.reduce((a,d) => {
    const freq = d.freq||'monthly';
    const monthly = freq==='weekly' ? (d.payment||0)*4.33 : freq==='biweekly' ? (d.payment||0)*2.17 : (d.payment||0);
    return a + monthly;
  }, 0);
  const currentSchedules = selected.map(d => d.schedule?.length ? d.schedule : generateSchedule(d));
  const currentTotalPaid = currentSchedules.reduce((a,s) => a + s.reduce((b,p)=>b+p.payment,0), 0);
  const currentInterest = currentTotalPaid - totalRemaining;
  const currentMaxMonths = Math.max(...currentSchedules.map(s => s.length));

  // New consolidated loan
  const consDebt = {
    remaining: totalRemaining, total: totalRemaining,
    interest: newRate, freq: 'monthly',
    payment: customPayment || calcAnnuity(totalRemaining, newRate, 12, newMonths),
    startDate: new Date().toISOString().slice(0,10)
  };
  const consSchedule = generateSchedule(consDebt);
  const consTotalPaid = consSchedule.reduce((a,s) => a+s.payment, 0);
  const consInterest = consTotalPaid - totalRemaining;
  const consMonthly = consDebt.payment;
  const rpsn = calcRPSN(totalRemaining, consSchedule);

  const saving = currentInterest - consInterest;
  const monthlyDiff = currentMonthly - consMonthly;
  const isBetter = saving > 0 || monthlyDiff > 0;

  result.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border)">
        <div style="font-size:.68rem;color:var(--text3);margin-bottom:6px;font-weight:600">AKTUÁLNÍ STAV (${selected.length} půjček)</div>
        <div style="font-size:.82rem;margin-bottom:3px">Celkem dluh: <strong>${fmt(totalRemaining)} Kč</strong></div>
        <div style="font-size:.82rem;margin-bottom:3px;color:var(--expense)">Splátky: <strong>${fmt(Math.round(currentMonthly))} Kč/měs</strong></div>
        <div style="font-size:.82rem;margin-bottom:3px;color:var(--debt)">Celkem zaplatíte: <strong>${fmt(Math.round(currentTotalPaid))} Kč</strong></div>
        <div style="font-size:.82rem;color:var(--debt)">Úroky celkem: <strong>${fmt(Math.round(currentInterest))} Kč</strong></div>
        <div style="font-size:.78rem;color:var(--text3);margin-top:3px">Doba: ~${currentMaxMonths} měs</div>
      </div>
      <div style="background:${isBetter?'var(--income-bg)':'var(--expense-bg)'};border-radius:10px;padding:12px;border:1px solid ${isBetter?'rgba(74,222,128,.3)':'rgba(248,113,113,.3)'}">
        <div style="font-size:.68rem;color:var(--text3);margin-bottom:6px;font-weight:600">KONSOLIDACE (${newRate}% p.a.)</div>
        <div style="font-size:.82rem;margin-bottom:3px">Celkem dluh: <strong>${fmt(totalRemaining)} Kč</strong></div>
        <div style="font-size:.82rem;margin-bottom:3px;color:${monthlyDiff>=0?'var(--income)':'var(--expense)'}">Splátka: <strong>${fmt(Math.round(consMonthly))} Kč/měs</strong></div>
        <div style="font-size:.82rem;margin-bottom:3px;color:var(--debt)">Celkem zaplatíte: <strong>${fmt(Math.round(consTotalPaid))} Kč</strong></div>
        <div style="font-size:.82rem;color:var(--debt)">Úroky celkem: <strong>${fmt(Math.round(consInterest))} Kč</strong></div>
        <div style="font-size:.78rem;color:var(--text3);margin-top:3px">Doba: ${consSchedule.length} měs · RPSN: ${rpsn}%</div>
      </div>
    </div>
    ${saving > 0 ? `<div class="insight-item good"><div class="insight-icon">💰</div><div class="insight-text">Konsolidací ušetříte <strong>${fmt(Math.round(saving))} Kč</strong> na úrocích!</div></div>` : ''}
    ${monthlyDiff > 0 ? `<div class="insight-item good"><div class="insight-icon">📉</div><div class="insight-text">Měsíční splátka nižší o <strong>${fmt(Math.round(monthlyDiff))} Kč</strong></div></div>` : ''}
    ${monthlyDiff < 0 ? `<div class="insight-item warn"><div class="insight-icon">⚠️</div><div class="insight-text">Měsíční splátka vyšší o <strong>${fmt(Math.round(-monthlyDiff))} Kč</strong> – ale celkem zaplatíte ${saving>0?'méně':'více'}</div></div>` : ''}
    ${!isBetter ? `<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text">Konsolidace za těchto podmínek nevýhodná – zkuste nižší úrok nebo kratší splatnost</div></div>` : ''}
  `;
  // Store for import
  window._lastConsDebt = { ...consDebt, name: 'Konsolidovaná půjčka', creditor: 'Nový věřitel', type: 'personal', priority: 'mid' };
  window._lastConsSelected = checked;
}

function importConsolidated() {
  const d = window._lastConsDebt;
  if(!d) { alert('Nejprve spusťte výpočet'); return; }
  if(!confirm(`Importovat konsolidovanou půjčku ${fmt(d.remaining)} Kč jako novou půjčku?\n\nPůvodní půjčky zůstanou – odstraňte je ručně po splacení.`)) return;
  if(!S.debts) S.debts = [];
  d.id = uid();
  d.schedule = generateSchedule(d);
  S.debts.push(d);
  clearTimeout(saveTimeout); saveTimeout = null;
  saveToFirebase();
  closeModal('modalConsolidate');
  renderPage();
  alert('✅ Konsolidovaná půjčka přidána! Nezapomeňte smazat původní půjčky po jejich splacení.');
}

// ══════════════════════════════════════════════════════
