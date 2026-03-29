//  PROJEKTY
// ══════════════════════════════════════════════════════
const PROJECT_TYPES = {
  vacation:'✈️ Dovolená', renovation:'🔨 Rekonstrukce', wedding:'💍 Svatba',
  property:'🏠 Nemovitost', car:'🚗 Auto', education:'📚 Vzdělání',
  health:'💊 Zdraví', other:'📁 Jiný'
};
let _projectFilter = 'all';

function getProjects(D) { return (D||getData()).projects || []; }

function setProjectFilter(f) {
  _projectFilter = f;
  ['All','Open','Closed'].forEach(x => {
    const el = document.getElementById('filter'+x);
    if(el) el.style.background = (f === x.toLowerCase()) ? 'var(--income-bg)' : '';
  });
  renderProjectGrid();
}

function renderProjectGrid() {
  const D = getData(); const ro = viewingUid !== null;
  const el = document.getElementById('projectGrid'); if(!el) return;
  let projects = getProjects(D);
  if(_projectFilter === 'open') projects = projects.filter(p => !p.closed);
  if(_projectFilter === 'closed') projects = projects.filter(p => p.closed);
  if(!projects.length) {
    el.innerHTML = `<div style="grid-column:1/-1"><div class="empty"><div class="ei">📁</div><div class="et">${_projectFilter==='all'?'Žádné projekty. Přidejte první!':'Žádné projekty v tomto filtru.'}</div></div></div>`;
    return;
  }
  el.innerHTML = projects.map(p => {
    const txs = getProjectTxs(p.id, D);
    const spent = txs.filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||t.amt||0),0);
    const income = txs.filter(t=>t.type==='income').reduce((a,t)=>a+(t.amount||t.amt||0),0);
    const budget = p.budget || 0;
    const pct = budget > 0 ? Math.min(100, Math.round(spent/budget*100)) : 0;
    const barColor = pct >= 100 ? '#f87171' : pct >= 80 ? '#fbbf24' : p.color || '#06b6d4';
    return `<div class="project-card ${p.closed?'closed':''}" onclick="openProjectDetail('${p.id}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div style="display:flex;gap:10px;align-items:flex-start">
          <div style="font-size:1.6rem;line-height:1">${PROJECT_TYPES[p.type]?.split(' ')[0]||'📁'}</div>
          <div>
            <div style="font-weight:700;font-size:.95rem;margin-bottom:2px">${p.name}</div>
            <div style="font-size:.72rem;color:var(--text3)">${PROJECT_TYPES[p.type]||'Projekt'}</div>
            ${p.desc?`<div style="font-size:.74rem;color:var(--text3);margin-top:3px">${p.desc.slice(0,60)}${p.desc.length>60?'...':''}</div>`:''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px" onclick="event.stopPropagation()">
          <span class="project-tag" style="background:${p.closed?'var(--surface3)':'rgba(6,182,212,.15)'};color:${p.closed?'var(--text3)':p.color||'#06b6d4'};border:1px solid ${p.closed?'var(--border)':'rgba(6,182,212,.3)'}">${p.closed?'✓ Uzavřen':'● Aktivní'}</span>
          ${!ro?`<div style="display:flex;gap:4px">
            <button class="btn btn-edit btn-icon btn-sm" onclick="editProject('${p.id}')">✎</button>
            <button class="btn btn-ghost btn-icon btn-sm" onclick="toggleProjectClosed('${p.id}')" title="${p.closed?'Otevřít':'Uzavřít'}">${p.closed?'↩':'✓'}</button>
          </div>`:''}
        </div>
      </div>
      <div style="display:flex;gap:16px;font-size:.78rem;margin-bottom:10px;padding:8px;background:var(--surface2);border-radius:8px">
        <div><span style="color:var(--text3)">Zahájení:</span> <strong>${p.start||'–'}</strong></div>
        <div><span style="color:var(--text3)">Ukončení:</span> <strong>${p.end||p.closed?p.end||new Date().toISOString().slice(0,10):'–'}</strong></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:6px">
        <span style="color:var(--expense)">Výdaje: <strong>${fmt(spent)}</strong></span>
        <span style="color:var(--income)">Příjmy: <strong>${fmt(income)}</strong></span>
        ${budget>0?`<span style="color:var(--text3)">Limit: ${fmt(budget)}</span>`:''}
      </div>
      ${budget>0?`<div class="project-progress"><div class="project-progress-bar" style="width:${pct}%;background:${barColor}"></div></div>
      <div style="font-size:.7rem;color:var(--text2);margin-top:3px;text-align:right">${pct}% z rozpočtu</div>`:''}
      <div style="font-size:.72rem;color:var(--text3);margin-top:8px;border-top:1px solid var(--border);padding-top:6px">${txs.length} transakcí · saldo: <span style="color:${income-spent>=0?'var(--income)':'var(--expense)'};font-weight:600">${fmt(income-spent)} Kč</span></div>
    </div>`;
  }).join('');
}

function getProjectTxs(projectId, D) {
  D = D || getData();
  return (D.transactions||[]).filter(t => t.projectId === projectId);
}

let _currentProjectId = null;

function openProjectDetail(id) {
  _currentProjectId = id;
  renderProjectDetail(id);
  showPageByName('projektDetail');
}

function renderProjectDetail(id) {
  _currentProjectId = id;
  const D = getData();
  const p = getProjects(D).find(x => x.id === id); if(!p) return;
  const ro = viewingUid !== null;
  const txs = getProjectTxs(id, D).sort((a,b) => new Date(b.date)-new Date(a.date));
  const spent = txs.filter(t=>t.type==='expense'||t.type==='debt').reduce((a,t)=>a+(t.amount||t.amt||0),0);
  const income = txs.filter(t=>t.type==='income').reduce((a,t)=>a+(t.amount||t.amt||0),0);
  const balance = income - spent;
  const budget = p.budget || 0;
  const pct = budget > 0 ? Math.min(100, Math.round(spent/budget*100)) : 0;
  const barColor = pct>=100?'#f87171':pct>=80?'#fbbf24':p.color||'#06b6d4';

  const el = document.getElementById('projektDetailContent'); if(!el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="showPageByName('projekty')">← Zpět</button>
      <div style="font-size:1.5rem">${PROJECT_TYPES[p.type]?.split(' ')[0]||'📁'}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:1.1rem">${p.name}</div>
        <div style="font-size:.74rem;color:var(--text3)">${PROJECT_TYPES[p.type]||''} · ${p.start||''}${p.end?' → '+p.end:''}</div>
      </div>
      ${!ro?`<button class="btn btn-accent btn-sm" onclick="addTxToProject('${id}')">+ Přidat transakci</button>`:''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div class="stat-card expense"><div class="stat-label">Výdaje</div><div class="stat-value down">${fmt(spent)} Kč</div></div>
      <div class="stat-card income"><div class="stat-label">Příjmy / Dotace</div><div class="stat-value up">${fmt(income)} Kč</div></div>
      <div class="stat-card balance"><div class="stat-label">Bilance</div><div class="stat-value ${balance>=0?'up':'down'}">${fmt(balance)} Kč</div></div>
      ${budget>0?`<div class="stat-card debt"><div class="stat-label">Zbývá z rozpočtu</div><div class="stat-value ${budget-spent>=0?'bankc':'down'}">${fmt(budget-spent)} Kč</div><div class="stat-sub">${pct}% vyčerpáno</div></div>`:`<div class="stat-card bank"><div class="stat-label">Transakcí</div><div class="stat-value bankc">${txs.length}</div></div>`}
    </div>

    ${budget>0?`<div class="project-progress" style="height:8px;margin-bottom:14px;border-radius:4px"><div class="project-progress-bar" style="width:${pct}%;background:${barColor}"></div></div>`:''}

    <div class="card">
      <div class="card-header">
        <span class="card-title">Transakce projektu</span>
        <span style="font-size:.74rem;color:var(--text3)">${txs.length} záznamy</span>
      </div>
      <div class="card-body" style="padding:0">
        ${txs.length ? txs.map(t => {
          const cat = getCat(t.catId || t.category, D.categories);
          const amt = t.amount || t.amt || 0;
          const isIncome = t.type === 'income';
          return `<div class="tx-row-v2" style="padding:10px 12px">
            <div class="tx-date-col">
              <div class="tx-date-day">${new Date(t.date+'T12:00:00').getDate()}</div>
              <div class="tx-date-mon">${CZ_M[new Date(t.date+'T12:00:00').getMonth()].slice(0,3)}</div>
            </div>
            <div class="tx-cat-icon" style="background:${cat.color||'#4ade80'}22">${cat.icon}</div>
            <div class="tx-body">
              <div class="tx-cat-name">${cat.name}${t.subcat?` <span style="color:var(--text3);font-weight:400">· ${t.subcat}</span>`:''}</div>
              ${t.name&&t.name!==cat.name?`<div class="tx-custom-name">${t.name}</div>`:''}
              ${t.note?`<div class="tx-sub-name">📝 ${t.note}</div>`:''}
            </div>
            <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
              <div style="font-weight:700;font-size:.95rem;color:${isIncome?'var(--income)':'var(--expense)'}">${isIncome?'+':'−'}${fmt(amt)} Kč</div>
              ${!ro?`<button class="btn btn-edit btn-icon btn-sm" onclick="editTxFromProject('${t.id}','${id}')">✎</button>
              <button class="btn btn-danger btn-icon btn-sm" onclick="deleteTxFromProject('${t.id}','${id}')">✕</button>`:''}
            </div>
          </div>`;
        }).join('') : '<div class="empty" style="padding:24px"><div class="et">Žádné transakce – přidejte první!</div></div>'}
      </div>
    </div>`;
}

function editTxFromProject(txId, projectId) {
  editTx(txId);
  _currentProjectId = projectId;
}

function deleteTxFromProject(txId, projectId) {
  if(!confirm('Smazat transakci?')) return;
  S.transactions = S.transactions.filter(t => t.id != txId);
  save();
  renderProjectDetail(projectId);
}

function addTxToProject(projectId) {
  _currentProjectId = projectId;
  selProjectId = projectId;
  openAddTx();
  setTimeout(()=>{
    const sel = document.getElementById('txProject');
    if(sel) sel.value = projectId;
  }, 80);
}

function openProjectModal() {
  ['editProjectId','projectName','projectDesc','projectBudget','projectEnd'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('projectType').value='vacation';
  document.getElementById('projectColor').value='#06b6d4';
  document.getElementById('projectStart').value=new Date().toISOString().slice(0,10);
  document.getElementById('projectModalTitle').textContent='Nový projekt';
  document.getElementById('modalProject').classList.add('open');
}

function editProject(id) {
  const p = getProjects().find(x=>x.id===id); if(!p) return;
  document.getElementById('editProjectId').value=id;
  document.getElementById('projectName').value=p.name;
  document.getElementById('projectType').value=p.type||'other';
  document.getElementById('projectStart').value=p.start||'';
  document.getElementById('projectEnd').value=p.end||'';
  document.getElementById('projectBudget').value=p.budget||'';
  document.getElementById('projectDesc').value=p.desc||'';
  document.getElementById('projectColor').value=p.color||'#06b6d4';
  document.getElementById('projectModalTitle').textContent='Upravit projekt';
  document.getElementById('modalProject').classList.add('open');
}

function saveProject() {
  const eid=document.getElementById('editProjectId').value;
  const name=document.getElementById('projectName').value.trim();
  if(!name){alert('Zadej název projektu');return;}
  const p={
    id:eid||uid(), name,
    type:document.getElementById('projectType').value,
    start:document.getElementById('projectStart').value,
    end:document.getElementById('projectEnd').value||null,
    budget:parseFloat(document.getElementById('projectBudget').value)||0,
    desc:document.getElementById('projectDesc').value.trim(),
    color:document.getElementById('projectColor').value,
    closed:false
  };
  if(!S.projects)S.projects=[];
  if(eid){const i=S.projects.findIndex(x=>x.id===eid);if(i>=0){p.closed=S.projects[i].closed;S.projects[i]=p;}}
  else S.projects.push(p);
  // Save immediately – bypass debounce to prevent race condition
  clearTimeout(saveTimeout);
  saveTimeout = null;
  saveToFirebase();
  closeModal('modalProject');
  renderProjectGrid();
}

function toggleProjectClosed(id) {
  const p=(S.projects||[]).find(x=>x.id===id); if(!p) return;
  p.closed=!p.closed;
  if(p.closed && !p.end) {
    p.end = new Date().toISOString().slice(0,10); // auto-set end date
  }
  save(); renderProjectGrid();
}

function deleteProject(id) {
  if(!confirm('Smazat projekt? Transakce zůstanou, jen ztratí vazbu na projekt.'))return;
  S.projects=(S.projects||[]).filter(p=>p.id!==id);
  // Remove project link from transactions
  (S.transactions||[]).forEach(t=>{if(t.projectId===id)delete t.projectId;});
  save(); renderProjectGrid();
}

// Populate project selector in tx modal
let selProjectId = '';
function populateTxProjectSelect() {
  const sel = document.getElementById('txProject'); if(!sel) return;
  const projects = getProjects();
  sel.innerHTML = '<option value="">– bez projektu –</option>' +
    projects.filter(p=>!p.closed).map(p=>`<option value="${p.id}">${PROJECT_TYPES[p.type]?.split(' ')[0]||'📁'} ${p.name}</option>`).join('');
  if(selProjectId) sel.value = selProjectId;
}

// ══════════════════════════════════════════════════════
//  PŘESUN TRANSAKCÍ (TRANSFER TYPE)
// ══════════════════════════════════════════════════════
function populateTxTransferWallets() {
  const wallets = getWallets();
  ['txTransferFrom','txTransferTo'].forEach(id => {
    const sel = document.getElementById(id); if(!sel) return;
    sel.innerHTML = wallets.map(w=>`<option value="${w.id}">${WALLET_TYPES[w.type]?.split(' ')[0]||'👛'} ${w.name}</option>`).join('');
  });
}

// ══════════════════════════════════════════════════════
//  FINANČNÍ ZDRAVÍ ENGINE
// ══════════════════════════════════════════════════════

// Výpočet stabilního základního příjmu – průměr 3 měsíce
function computeBaseIncome(D) {
  D = D || getData();
  const stableCats = (D.categories||[]).filter(c => (c.type==='income'||c.type==='both') && c.stable===true).map(c=>c.id);
  if(!stableCats.length) return 0;
  let total = 0;
  for(let i=1;i<=3;i++){
    let m=S.curMonth-i, y=S.curYear;
    if(m<0){m+=12;y--;}
    const txs=getTx(m,y,D);
    const monthInc=txs.filter(t=>(t.type==='income')&&stableCats.includes(t.catId||t.category)).reduce((a,t)=>a+(t.amount||t.amt||0),0);
    total+=monthInc; // měsíc s 0 příjmem = 0, nezahazujeme
  }
  return Math.round(total/3);
}

// Výpočet zdraví jedné kategorie (0-100)
function computeCatHealth(cat, spent, baseIncome) {
  if(!cat.healthPct && !cat.healthAmt) return null; // bez limitu
  const limitByPct = baseIncome > 0 ? baseIncome * (cat.healthPct||0) / 100 : Infinity;
  const limitByAmt = cat.healthAmt || Infinity;
  // Pro spoření: minimum (chceme aby utratili ASPOŇ tolik)
  if(cat.isSaving) {
    const minPct = baseIncome > 0 ? baseIncome * (cat.healthPct||0) / 100 : 0;
    if(minPct <= 0) return null;
    const ratio = spent / minPct;
    return Math.min(100, Math.round(ratio * 100));
  }
  // Pro výdaje: maximum
  const limit = Math.min(limitByPct, limitByAmt);
  if(limit <= 0 || limit === Infinity) return null;
  if(spent === 0) return 100;
  const ratio = spent / limit;
  if(ratio <= 0.8) return 100;
  if(ratio <= 1.0) return Math.round(100 - (ratio-0.8)/0.2 * 30); // 100→70
  if(ratio <= 1.5) return Math.round(70 - (ratio-1.0)/0.5 * 50);  // 70→20
  return Math.max(0, Math.round(20 - (ratio-1.5) * 20));           // 20→0
}

// Výpočet 3 složek skóre
function computeHealthScores(D) {
  D = D || getData();
  const baseIncome = computeBaseIncome(D);
  const txs = getTx(S.curMonth, S.curYear, D);
  const totalInc = incSum(txs);
  const totalExp = expSum(txs);

  // 1. VÝDAJOVÉ ZDRAVÍ – výdaje vs příjmy
  let expScore = 100;
  if(totalInc > 0) {
    const ratio = totalExp / totalInc;
    if(ratio <= 0.7) expScore = 100;
    else if(ratio <= 0.9) expScore = Math.round(100 - (ratio-0.7)/0.2 * 30);
    else if(ratio <= 1.0) expScore = Math.round(70 - (ratio-0.9)/0.1 * 30);
    else expScore = Math.max(0, Math.round(40 - (ratio-1.0) * 40));
  } else expScore = totalExp > 0 ? 0 : 50;

  // 2. ROZPOČTOVÉ ZDRAVÍ – kategorie vs limity
  const expCats = (D.categories||[]).filter(c => c.type==='expense' || c.type==='both');
  const catScores = expCats.map(cat => {
    const spent = getActual(cat.id, null, S.curMonth, S.curYear, D);
    const score = computeCatHealth(cat, spent, baseIncome);
    return score !== null ? score : null;
  }).filter(s => s !== null);
  const budgetScore = catScores.length > 0 ? Math.round(catScores.reduce((a,s)=>a+s,0)/catScores.length) : 75;

  // 3. ÚSPOROVÉ ZDRAVÍ – spoření + investice
  const savingCats = (D.categories||[]).filter(c => c.isSaving);
  let savingScore = 50; // výchozí pokud nemá kategorie spoření
  if(savingCats.length > 0 && baseIncome > 0) {
    const totalSaved = savingCats.reduce((a,c) => a + getActual(c.id, null, S.curMonth, S.curYear, D), 0);
    const minSaving = baseIncome * 0.1; // min 10% příjmu
    const ratio = totalSaved / minSaving;
    savingScore = Math.min(100, Math.round(ratio * 100));
  }

  const overall = Math.round((expScore + budgetScore + savingScore) / 3);
  return { overall, expScore, budgetScore, savingScore, baseIncome, totalInc, totalExp };
}

function healthColor(score) {
  if(score >= 71) return '#4ade80';
  if(score >= 41) return '#fbbf24';
  return '#f87171';
}
function healthLabel(score) {
  if(score >= 71) return '🟢 Zdravé';
  if(score >= 41) return '🟡 Průměrné';
  return '🔴 Kritické';
}

// Kreslení kolečka zdraví
function drawHealthRing(canvasId, score, size=160) {
  const canvas = document.getElementById(canvasId); if(!canvas) return;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx=size/2, cy=size/2, r=size*0.42, lw=size*0.1;
  const color = healthColor(score);
  // Background ring
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=lw; ctx.stroke();
  // Score arc
  const startAngle = -Math.PI/2;
  const endAngle = startAngle + (score/100)*Math.PI*2;
  ctx.beginPath(); ctx.arc(cx,cy,r,startAngle,endAngle);
  ctx.strokeStyle=color; ctx.lineWidth=lw;
  ctx.lineCap='round'; ctx.stroke();
  // Score text
  ctx.fillStyle=color;
  ctx.font=`bold ${size*0.22}px Syne,sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(score, cx, cy-size*0.04);
  ctx.fillStyle='rgba(255,255,255,.5)';
  ctx.font=`${size*0.09}px Instrument Sans,sans-serif`;
  ctx.fillText('/100', cx, cy+size*0.13);
}

// ══════════════════════════════════════════════════════
//  MĚSÍČNÍ REPORT
// ══════════════════════════════════════════════════════
function renderReport() {
  const el = document.getElementById('reportContent'); if(!el) return;
  const D = getData();
  const scores = computeHealthScores(D);
  const txs = getTx(S.curMonth, S.curYear, D);
  const totalInc = incSum(txs), totalExp = expSum(txs), saldo = totalInc - totalExp;
  let pm=S.curMonth-1, py=S.curYear; if(pm<0){pm=11;py--;}
  const prevTxs = getTx(pm, py, D);
  const prevInc = incSum(prevTxs), prevExp = expSum(prevTxs);
  const expDiff = prevExp>0 ? Math.round((totalExp-prevExp)/prevExp*100) : null;

  // Category health rows
  const expCats = (D.categories||[]).filter(c => c.type==='expense'||c.type==='both');
  const catRows = expCats.map(cat => {
    const spent = getActual(cat.id, null, S.curMonth, S.curYear, D);
    if(spent === 0 && !cat.isSaving) return null;
    const score = computeCatHealth(cat, spent, scores.baseIncome);
    const limitPct = cat.healthPct ? `${cat.healthPct}%` : '–';
    const limitAmt = cat.healthAmt ? fmt(cat.healthAmt) : (cat.isSaving ? 'min' : '–');
    const pctOfInc = scores.totalInc > 0 ? Math.round(spent/scores.totalInc*100) : 0;
    const planAmt = cat.healthPct && scores.baseIncome > 0 ? fmt(Math.round(scores.baseIncome*cat.healthPct/100)) : '–';
    const sc = score !== null ? score : 75;
    const barW = Math.min(100, sc);
    const trend = (() => {
      const prev = getActual(cat.id, null, pm, py, D);
      if(!prev) return '';
      const d = Math.round((spent-prev)/prev*100);
      return d > 5 ? `<span style="color:var(--expense);font-size:.7rem">↑${d}%</span>` :
             d < -5 ? `<span style="color:var(--income);font-size:.7rem">↓${Math.abs(d)}%</span>` :
             `<span style="color:var(--text3);font-size:.7rem">↔ stabilní</span>`;
    })();
    return `<div class="health-bar-row">
      <div style="font-size:1rem;flex-shrink:0">${cat.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-weight:600;font-size:.82rem">${cat.name}</span>
          <span style="font-size:.78rem;color:var(--text2)">${fmt(spent)}</span>
        </div>
        <div class="health-bar-bg"><div class="health-bar-fill" style="width:${barW}%;background:${healthColor(sc)}"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:3px">
          <span style="font-size:.7rem;color:var(--text3)">${pctOfInc}% příjmu · plán ${planAmt} (${limitPct})</span>
          <span style="display:flex;align-items:center;gap:6px">${trend}<span class="health-score-pill" style="color:${healthColor(sc)}">${sc}</span></span>
        </div>
      </div>
    </div>`;
  }).filter(Boolean).join('');

  el.innerHTML = `
    <div class="report-section-title">📊 ${CZ_M[S.curMonth]} ${S.curYear} – Měsíční přehled</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
      <div class="stat-card income"><div class="stat-label">Příjmy</div><div class="stat-value up">${fmt(totalInc)}</div><div class="stat-sub" style="font-size:.68rem">${prevInc?'min. '+fmt(prevInc):''}</div></div>
      <div class="stat-card expense"><div class="stat-label">Výdaje</div><div class="stat-value down">${fmt(totalExp)}</div><div class="stat-sub">${expDiff!==null?`<span style="color:${expDiff>0?'var(--expense)':'var(--income)'}">${expDiff>0?'↑':'↓'}${Math.abs(expDiff)}%</span>`:''}</div></div>
      <div class="stat-card balance"><div class="stat-label">Saldo</div><div class="stat-value ${saldo>=0?'up':'down'}">${fmt(saldo)}</div></div>
      <div class="stat-card bank"><div class="stat-label">Základ příjmu</div><div class="stat-value bankc">${fmt(scores.baseIncome)}</div><div class="stat-sub" style="font-size:.68rem">prům. 3 měs.</div></div>
    </div>

    <div class="report-section-title">💚 Finanční zdraví dle kategorií</div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-body">${catRows||'<div class="empty"><div class="et">Žádné výdaje tento měsíc</div></div>'}</div>
    </div>

    <div class="report-section-title">🏆 Celkové finanční zdraví</div>
    <div class="grid2" style="margin-bottom:16px;align-items:start">
      <div class="card" style="text-align:center;padding:24px">
        <canvas id="mainHealthRing"></canvas>
        <div class="health-score-label" style="color:${healthColor(scores.overall)}">${scores.overall}</div>
        <div class="health-score-sub">${healthLabel(scores.overall)}</div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">3 složky zdraví</span></div>
        <div class="card-body">
          <div class="health-3scores">
            <div class="health-3score-card">
              <div class="health-3score-val" style="color:${healthColor(scores.expScore)}">${scores.expScore}</div>
              <div class="health-3score-label">Výdajové</div>
            </div>
            <div class="health-3score-card">
              <div class="health-3score-val" style="color:${healthColor(scores.budgetScore)}">${scores.budgetScore}</div>
              <div class="health-3score-label">Rozpočtové</div>
            </div>
            <div class="health-3score-card">
              <div class="health-3score-val" style="color:${healthColor(scores.savingScore)}">${scores.savingScore}</div>
              <div class="health-3score-label">Úsporové</div>
            </div>
          </div>
          <div style="font-size:.78rem;color:var(--text3);line-height:1.6">
            <div><strong style="color:var(--text2)">Výdajové</strong> – poměr výdajů k příjmům</div>
            <div><strong style="color:var(--text2)">Rozpočtové</strong> – dodržování limitů kategorií</div>
            <div><strong style="color:var(--text2)">Úsporové</strong> – odkládáte min. 10% příjmu?</div>
          </div>
        </div>
      </div>
    </div>`;

  // Draw ring after DOM update
  setTimeout(() => drawHealthRing('mainHealthRing', scores.overall, 160), 50);

  // Add DTI/DSTI section
  renderDTISection(D, scores.baseIncome);
}

function renderDTISection(D, baseIncome) {
  const el = document.getElementById('reportContent'); if(!el) return;
  const debts = D.debts || [];
  if(!debts.length && !baseIncome) return;

  const totalDebt = debts.reduce((a,d) => a+(d.remaining||0), 0);
  // Splátky jsou v d.installments[].amt - vezmi aktuální splátku
  const now = new Date();
  const nowStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const monthlyPayments = debts.reduce((a,d) => {
    // Najdi aktuální splátku z installments
    let amt = 0;
    if(d.installments && d.installments.length) {
      let cur = d.installments[0].amt || 0;
      for(const inst of d.installments) {
        if((inst.from||'') <= nowStr) cur = inst.amt || cur;
      }
      amt = cur;
    } else {
      amt = d.payment || d.installment || 0;
    }
    return a + amt;
  }, 0);
  const annualIncome = baseIncome * 12;

  // DTI = celkový dluh / roční příjem × 100 (ČNB limit: max 900%)
  const dti = annualIncome > 0 ? Math.round(totalDebt / annualIncome * 100) : 0;
  // DSTI = měsíční splátky / měsíční příjem × 100 (ČNB limit: max 45%)
  const dsti = baseIncome > 0 ? Math.round(monthlyPayments / baseIncome * 100) : 0;

  // ČNB limity
  const dtiStatus = dti < 700 ? 'safe' : dti < 900 ? 'warn' : 'danger';
  const dstiStatus = dsti < 35 ? 'safe' : dsti < 45 ? 'warn' : 'danger';
  const dtiColor = dtiStatus==='safe'?'var(--income)':dtiStatus==='warn'?'var(--debt)':'var(--expense)';
  const dstiColor = dstiStatus==='safe'?'var(--income)':dstiStatus==='warn'?'var(--debt)':'var(--expense)';
  const dtiLabel = dtiStatus==='safe'?'🟢 Banka schválí':'warn'===dtiStatus?'🟡 Rizikové':'🔴 Banka pravděpodobně zamítne';
  const dstiLabel = dstiStatus==='safe'?'🟢 Banka schválí':'warn'===dstiStatus?'🟡 Rizikové':'🔴 Banka pravděpodobně zamítne';

  const dtiSection = document.createElement('div');
  dtiSection.innerHTML = `
    <div class="report-section-title">🏦 Bankovní hodnocení – DTI & DSTI</div>
    <div style="background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:8px;font-size:.76rem;color:var(--text3);border:1px solid var(--border)">
      ℹ️ Banky v ČR hodnotí každou žádost o úvěr podle limitů ČNB. Toto je odhad vašeho profilu.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <!-- DTI -->
      <div class="card">
        <div class="card-body">
          <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:6px">DTI – Celková zadluženost</div>
          <div style="font-family:Syne,sans-serif;font-size:2rem;font-weight:800;color:${dtiColor}">${dti}%</div>
          <div style="font-size:.74rem;margin:4px 0 8px">${dtiLabel}</div>
          <div class="trap-bar"><div class="trap-bar-fill" style="width:${Math.min(100,dti/10)}%;background:${dtiColor}"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:.68rem;color:var(--text3);margin-top:3px">
            <span>0%</span><span style="color:var(--income)">700% ✅</span><span style="color:var(--debt)">900% ⚠️</span><span style="color:var(--expense)">1000%+🚨</span>
          </div>
          <div style="font-size:.72rem;color:var(--text3);margin-top:8px">
            Dluh ${fmt(totalDebt)} Kč / roční příjem ${fmt(Math.round(annualIncome))} Kč
          </div>
        </div>
      </div>
      <!-- DSTI -->
      <div class="card">
        <div class="card-body">
          <div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:6px">DSTI – Měsíční zatížení</div>
          <div style="font-family:Syne,sans-serif;font-size:2rem;font-weight:800;color:${dstiColor}">${dsti}%</div>
          <div style="font-size:.74rem;margin:4px 0 8px">${dstiLabel}</div>
          <div class="trap-bar"><div class="trap-bar-fill" style="width:${Math.min(100,dsti*2)}%;background:${dstiColor}"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:.68rem;color:var(--text3);margin-top:3px">
            <span>0%</span><span style="color:var(--income)">35% ✅</span><span style="color:var(--debt)">45% ⚠️</span><span style="color:var(--expense)">50%+🚨</span>
          </div>
          <div style="font-size:.72rem;color:var(--text3);margin-top:8px">
            Splátky ${fmt(Math.round(monthlyPayments))} Kč / příjem ${fmt(Math.round(baseIncome))} Kč
          </div>
        </div>
      </div>
    </div>
    ${(dtiStatus!=='safe'||dstiStatus!=='safe')?`
    <div class="insight-item ${dtiStatus==='danger'||dstiStatus==='danger'?'bad':'warn'}" style="margin-bottom:16px">
      <div class="insight-icon">${dtiStatus==='danger'||dstiStatus==='danger'?'🚨':'⚠️'}</div>
      <div class="insight-text">
        ${dstiStatus==='danger'?'Vaše měsíční splátky překračují 50% příjmu – banky standardně odmítají takové žádosti o úvěr.':''}
        ${dtiStatus==='danger'?'Celková zadluženost překračuje 1000% ročního příjmu – ČNB limit pro hypotéky.':''}
        ${dtiStatus==='warn'&&dstiStatus!=='danger'?'Blížíte se limitu zadluženosti. Před žádostí o nový úvěr zvažte splacení části dluhů.':''}
        <strong style="display:block;margin-top:4px">💡 <span style="cursor:pointer;color:var(--bank);text-decoration:underline" onclick="openBetterLoanPage()">Chcete najít výhodnější refinancování?</span></strong>
      </div>
    </div>`:''}
  `;
  el.appendChild(dtiSection);
}

// ══════════════════════════════════════════════════════
//  FINANČNÍ RADAR – Predikce problémů
// ══════════════════════════════════════════════════════
function renderRadar() {
  const el = document.getElementById('radarContent'); if(!el) return;
  const D = getData();
  const baseIncome = computeBaseIncome(D);
  const txs = getTx(S.curMonth, S.curYear, D);
  const totalInc = incSum(txs);
  const totalExp = expSum(txs);
  const saldo = totalInc - totalExp;

  // Predikce příštího měsíce
  let pm = S.curMonth-1, py = S.curYear; if(pm<0){pm=11;py--;}
  const prevTxs = getTx(pm, py, D);
  const prevInc = incSum(prevTxs), prevExp = expSum(prevTxs);

  // Trend výdajů (3 měsíce)
  const expTrends = [];
  for(let i=2;i>=0;i--){
    let m=S.curMonth-i, y=S.curYear; if(m<0){m+=12;y--;}
    expTrends.push(expSum(getTx(m,y,D)));
  }
  const expTrend = expTrends[2]>0&&expTrends[0]>0 ? Math.round((expTrends[2]-expTrends[0])/expTrends[0]*100) : 0;

  // Nadcházející splátky
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth()+1, 1);
  const nextMonthStr = nextMonth.toISOString().slice(0,7);
  const upcomingPayments = (D.debts||[]).reduce((a,d)=>{
    const s = d.schedule?.find(s=>s.date.startsWith(nextMonthStr)&&!s.paid);
    return a + (s?.payment||d.payment||0);
  },0);

  // Dny do konce měsíce
  const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const daysLeft = daysInMonth - today.getDate();
  const spentSoFar = totalExp;
  const dailyRate = today.getDate() > 0 ? spentSoFar / today.getDate() : 0;
  const projectedExp = Math.round(spentSoFar + dailyRate * daysLeft);
  const projectedSaldo = totalInc - projectedExp;

  // Analýza rizik
  const alerts = [];
  const tips = [];

  if(projectedSaldo < 0) {
    alerts.push({level:'danger', icon:'🚨', text:`Za ${daysLeft} dní hrozí záporné saldo! Předpokládané výdaje ${fmt(projectedExp)} Kč přesahují příjmy ${fmt(totalInc)} Kč.`});
  } else if(projectedSaldo < totalInc * 0.1) {
    alerts.push({level:'warn', icon:'⚠️', text:`Tento měsíc zbývá jen ${fmt(projectedSaldo)} Kč. Méně než 10% příjmu.`});
  }

  if(expTrend > 10) {
    alerts.push({level:'warn', icon:'📈', text:`Výdaje rostou ${expTrend}% za poslední 3 měsíce. Trend je nepříznivý.`});
  }

  if(upcomingPayments > 0) {
    const upcomingPct = totalInc > 0 ? Math.round(upcomingPayments/totalInc*100) : 0;
    if(upcomingPct > 40) {
      alerts.push({level:'danger', icon:'💳', text:`Příští měsíc splátky ${fmt(Math.round(upcomingPayments))} Kč = ${upcomingPct}% příjmu. Kritické zatížení!`});
    } else if(upcomingPct > 25) {
      alerts.push({level:'warn', icon:'💳', text:`Příští měsíc splátky ${fmt(Math.round(upcomingPayments))} Kč = ${upcomingPct}% příjmu.`});
    }
  }

  // Opakované výdaje – detekce předplatných
  const subscriptions = (D.transactions||[]).filter(t => {
    if(t.type!=='expense') return false;
    const name = (t.name||'').toLowerCase();
    return ['netflix','spotify','youtube','apple','google','microsoft','amazon','alza','mall','heureka','o2','vodafone','t-mobile'].some(s=>name.includes(s));
  });
  const subTotal = subscriptions.reduce((a,t)=>a+(t.amount||t.amt||0),0);
  if(subTotal > 0) tips.push({icon:'📺', text:`Detekována předplatná: ${fmt(subTotal)} Kč/měs – zkontrolujte zda vše využíváte`});

  if(saldo > 0 && totalInc > 0 && saldo/totalInc < 0.1) {
    tips.push({icon:'💡', text:`Odkládáte méně než 10% příjmu. Doporučujeme min. 10-20% na spořicí účet.`});
  }

  if(!alerts.length) alerts.push({level:'safe', icon:'✅', text:'Žádná finanční rizika tento měsíc. Vše vypadá dobře!'});

  const radarScore = alerts.filter(a=>a.level==='danger').length > 0 ? 'danger' :
                     alerts.filter(a=>a.level==='warn').length > 0 ? 'warn' : 'safe';
  const radarColor = radarScore==='safe'?'var(--income)':radarScore==='warn'?'var(--debt)':'var(--expense)';
  const radarBg = radarScore==='safe'?'rgba(74,222,128,.06)':radarScore==='warn'?'rgba(251,191,36,.06)':'rgba(248,113,113,.06)';

  el.innerHTML = `
    <div style="background:${radarBg};border:1px solid ${radarColor}44;border-radius:var(--radius);padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="font-size:2rem">🎯</div>
        <div>
          <div style="font-weight:700;font-size:1rem">Finanční radar</div>
          <div style="font-size:.76rem;color:var(--text3)">${CZ_M[S.curMonth]} ${S.curYear} · ${daysLeft} dní do konce měsíce</div>
        </div>
        <div style="margin-left:auto;font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:${radarColor}">
          ${radarScore==='safe'?'🟢 V pohodě':radarScore==='warn'?'🟡 Pozor':'🔴 Riziko!'}
        </div>
      </div>
      <!-- Projekce měsíce -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        <div class="stat-card income"><div class="stat-label">Příjmy</div><div class="stat-value up">${fmt(totalInc)} Kč</div></div>
        <div class="stat-card expense"><div class="stat-label">Výdaje (zatím)</div><div class="stat-value down">${fmt(totalExp)} Kč</div></div>
        <div class="stat-card ${projectedSaldo>=0?'balance':'expense'}">
          <div class="stat-label">Projekce konce měsíce</div>
          <div class="stat-value ${projectedSaldo>=0?'up':'down'}">${fmt(projectedSaldo)} Kč</div>
          <div class="stat-sub" style="font-size:.68rem">při denních výdajích ${fmt(Math.round(dailyRate))} Kč/den</div>
        </div>
      </div>
      <!-- Alerty -->
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:${tips.length?'14px':'0'}">
        ${alerts.map(a=>`
          <div style="padding:10px 14px;border-radius:10px;background:${a.level==='danger'?'var(--expense-bg)':a.level==='warn'?'var(--debt-bg)':'rgba(74,222,128,.08)'};border:1px solid ${a.level==='danger'?'rgba(248,113,113,.3)':a.level==='warn'?'rgba(251,191,36,.3)':'rgba(74,222,128,.2)'};display:flex;gap:10px;align-items:flex-start">
            <span style="font-size:1.2rem;flex-shrink:0">${a.icon}</span>
            <span style="font-size:.82rem;color:var(--text2)">${a.text}</span>
          </div>
        `).join('')}
      </div>
      ${tips.length?`
      <div style="margin-top:4px">
        <div style="font-size:.72rem;font-weight:600;color:var(--text3);margin-bottom:6px;text-transform:uppercase">💡 Tipy</div>
        ${tips.map(t=>`<div style="padding:8px 12px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);margin-bottom:6px;font-size:.8rem;display:flex;gap:8px"><span>${t.icon}</span><span>${t.text}</span></div>`).join('')}
      </div>`:''}
    </div>
    <!-- Trend výdajů 3 měsíce -->
    <div class="card">
      <div class="card-header"><span class="card-title">📊 Trend výdajů – 3 měsíce</span></div>
      <div class="card-body">
        ${expTrends.map((v,i)=>{
          let m=S.curMonth-2+i, y=S.curYear; if(m<0){m+=12;y--;}
          const pct = Math.max(...expTrends)>0?Math.round(v/Math.max(...expTrends)*100):0;
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:4px">
              <span style="font-weight:600">${CZ_M[m]} ${y}</span>
              <span style="color:var(--expense)">${fmt(v)} Kč</span>
            </div>
            <div class="trap-bar"><div class="trap-bar-fill" style="width:${pct}%;background:${i===2&&expTrend>10?'var(--expense)':'var(--bank)'}"></div></div>
          </div>`;
        }).join('')}
        ${expTrend!==0?`<div style="font-size:.76rem;color:${expTrend>10?'var(--expense)':expTrend>0?'var(--debt)':'var(--income)'};text-align:right;margin-top:4px">
          Trend: ${expTrend>0?'↑':'↓'} ${Math.abs(expTrend)}% za 3 měsíce
        </div>`:''}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  FINANČNÍ OBRAZ – Zlepšuji se?
// ══════════════════════════════════════════════════════
function renderObraz() {
  const el = document.getElementById('obrazContent'); if(!el) return;
  const D = getData();

  // Sbírej data za 6 měsíců
  const months = 6;
  const series = [];
  for(let i=months-1;i>=0;i--){
    let m=S.curMonth-i, y=S.curYear;
    while(m<0){m+=12;y--;}
    const txs = getTx(m,y,D);
    const inc = incSum(txs), exp = expSum(txs);
    const debts = D.debts||[];
    const totalDebt = debts.reduce((a,d)=>a+d.remaining,0);
    const savings = inc-exp;
    series.push({month:CZ_M[m].slice(0,3), year:y, inc, exp, savings, debt:totalDebt});
  }

  // Trendy
  const first = series[0], last = series[series.length-1];
  const incTrend = first.inc>0?Math.round((last.inc-first.inc)/first.inc*100):0;
  const expTrend = first.exp>0?Math.round((last.exp-first.exp)/first.exp*100):0;
  const savTrend = first.savings!==0?Math.round((last.savings-first.savings)/Math.abs(first.savings)*100):0;
  const debtTrend = first.debt>0?Math.round((last.debt-first.debt)/first.debt*100):0;

  // Skóre zlepšení (0-100)
  let score = 50;
  if(incTrend > 5) score += 15; else if(incTrend < -5) score -= 15;
  if(expTrend < -5) score += 15; else if(expTrend > 10) score -= 15;
  if(savTrend > 10) score += 15; else if(savTrend < -10) score -= 15;
  if(debtTrend < -5) score += 15; else if(debtTrend > 5) score -= 15;
  score = Math.max(0, Math.min(100, score));

  const trend = score>=65?'improving':score>=40?'stable':'declining';
  const trendLabel = trend==='improving'?'📈 Zlepšuji se!':trend==='stable'?'↔️ Stagnuji':'📉 Zhoršuji se';
  const trendColor = trend==='improving'?'var(--income)':trend==='stable'?'var(--debt)':'var(--expense)';

  const metrics = [
    {label:'💰 Příjmy', trend:incTrend, val:`${fmt(last.inc)} Kč`, good:incTrend>0},
    {label:'💸 Výdaje', trend:-expTrend, val:`${fmt(last.exp)} Kč`, good:expTrend<0},
    {label:'🐷 Úspory', trend:savTrend, val:`${fmt(last.savings)} Kč`, good:savTrend>0},
    {label:'🏦 Dluhy', trend:-debtTrend, val:`${fmt(last.debt)} Kč`, good:debtTrend<0},
  ];

  el.innerHTML=`
    <!-- Celkový trend -->
    <div style="background:linear-gradient(135deg,${trend==='improving'?'rgba(74,222,128,.08)':trend==='stable'?'rgba(251,191,36,.05)':'rgba(248,113,113,.06)'},transparent);border:1px solid ${trendColor}33;border-radius:var(--radius);padding:18px;margin-bottom:16px;text-align:center">
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Váš finanční trend – posledních 6 měsíců</div>
      <div style="font-family:Syne,sans-serif;font-size:2rem;font-weight:800;color:${trendColor}">${trendLabel}</div>
      <div style="margin:12px auto;width:200px;height:12px;background:linear-gradient(90deg,var(--expense),var(--debt),var(--income));border-radius:6px;position:relative">
        <div style="position:absolute;top:-4px;left:${score}%;transform:translateX(-50%);width:8px;height:20px;background:white;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:left .8s"></div>
      </div>
      <div style="font-size:.76rem;color:var(--text3)">Skóre: <strong style="color:${trendColor}">${score}/100</strong></div>
    </div>

    <!-- 4 metriky -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${metrics.map(m=>`
        <div class="card">
          <div class="card-body" style="padding:12px">
            <div style="font-size:.78rem;font-weight:600;margin-bottom:4px">${m.label}</div>
            <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800">${m.val}</div>
            <div style="font-size:.76rem;margin-top:4px;color:${m.good?'var(--income)':'var(--expense)'}">
              ${m.trend>0?'↑':'↓'} ${Math.abs(m.trend)}% za 6 měsíců
              ${m.good?'✅':'⚠️'}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Měsíční přehled tabulka -->
    <div class="card">
      <div class="card-header"><span class="card-title">📅 Měsíc po měsíci</span></div>
      <div class="card-body" style="padding:0">
        <div style="display:grid;grid-template-columns:60px 1fr 1fr 1fr;font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;padding:8px 12px;background:var(--surface3)">
          <span>Měsíc</span><span style="text-align:right">Příjmy</span><span style="text-align:right">Výdaje</span><span style="text-align:right">Saldo</span>
        </div>
        ${series.map((s,i)=>`
          <div style="display:grid;grid-template-columns:60px 1fr 1fr 1fr;padding:8px 12px;border-bottom:1px solid var(--border);font-size:.78rem;${i===series.length-1?'font-weight:600':''}">
            <span style="color:var(--text3)">${s.month}</span>
            <span style="text-align:right;color:var(--income)">${fmt(s.inc)}</span>
            <span style="text-align:right;color:var(--expense)">${fmt(s.exp)}</span>
            <span style="text-align:right;color:${s.savings>=0?'var(--income)':'var(--expense)'}">${s.savings>=0?'+':''}${fmt(s.savings)}</span>
          </div>
        `).join('')}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  DETEKTOR ÚSPOR
// ══════════════════════════════════════════════════════
function renderDetektor() {
  const el = document.getElementById('detektorContent'); if(!el) return;
  const D = getData();
  const txs = getTx(S.curMonth, S.curYear, D);
  const baseIncome = computeBaseIncome(D);
  const suggestions = [];
  let totalSavable = 0;

  // 1. Detekce předplatných z REÁLNÝCH transakcí uživatele
  // Hledáme opakující se výdaje podobné výše = předplatné
  const subTxs = txs.filter(t=>t.type==='expense');
  
  // Načti komunitní klíčová slova z Firebase + lokální základ
  const baseSubKeywords = [
    {kw:'netflix', tip:'Sdílený účet ušetří až 50%'},
    {kw:'spotify', tip:'Student plán nebo rodinný účet'},
    {kw:'youtube', tip:'Zvažte zrušení pokud nepoužíváte'},
    {kw:'apple', tip:'Zkontrolujte všechna Apple předplatná'},
    {kw:'microsoft', tip:'Alternativa: LibreOffice zdarma'},
    {kw:'amazon', tip:'Využíváte všechny výhody?'},
    {kw:'hbo', tip:'Sdílený účet nebo zrušení'},
    {kw:'disney', tip:'Sdílený účet ušetří 50%'},
    {kw:'patreon', tip:'Zkontrolujte které příspěvky skutečně využíváte'},
    {kw:'google one', tip:'Stačí vám nižší tarif?'},
    {kw:'google', tip:'Zkontrolujte Google předplatná'},
    {kw:'youtube premium', tip:'Sdílení v rodině ušetří'},
    {kw:'alza', tip:'Využíváte Alza+ naplno?'},
    {kw:'deezer', tip:'Přejděte na rodinný tarif'},
    {kw:'adobe', tip:'Alternativa: Affinity nebo Canva'},
    {kw:'dropbox', tip:'Google Drive nebo OneDrive mohou být zdarma'},
    {kw:'evernote', tip:'Notion nebo Obsidian jsou levnější'},
    {kw:'antivirus', tip:'Windows Defender je zdarma a dostatečný'},
    {kw:'vpn', tip:'Potřebujete VPN skutečně?'},
    {kw:'čt', tip:'Televizní poplatek – zkontrolujte výjimky'},
    {kw:'o2 tv', tip:'Sdílení v domácnosti'},
    {kw:'skylink', tip:'Využíváte všechny kanály?'},
    {kw:'membership', tip:'Zkontrolujte zda členství využíváte'},
    {kw:'členství', tip:'Zkontrolujte zda členství využíváte'},
    {kw:'předplatné', tip:'Zvažte zrušení nevyužívaných předplatných'},
  ];

  // Najdi skutečné transakce které odpovídají předplatným
  const foundSubs = new Map(); // kw -> {name, amt, count}
  subTxs.forEach(t => {
    const name = (t.name||'').toLowerCase();
    for(const sub of baseSubKeywords) {
      if(name.includes(sub.kw) && !foundSubs.has(sub.kw)) {
        const amt = t.amount||t.amt||0;
        if(amt > 0) foundSubs.set(sub.kw, {name: t.name, amt, tip: sub.tip});
      }
    }
  });

  // Přidej doporučení jen pro nalezené předplatné
  foundSubs.forEach((sub, kw) => {
    suggestions.push({
      category:'📺 Předplatné',
      item: sub.name,
      current:`${fmt(sub.amt)} Kč/měs`,
      saving: Math.round(sub.amt * 0.4),
      tip: sub.tip,
      severity:'low'
    });
    totalSavable += Math.round(sub.amt * 0.4);
    // Ulož do Firebase pro komunitní učení
    if(window._db && window._currentUser) {
      try {
        const ref = _ref(_db, 'community/subscriptions/' + kw.replace(/\s+/g,'_'));
        _get(ref).then(snap => {
          const cur = snap.exists() ? (snap.val()||{}) : {};
          const count = (cur.count||0) + 1;
          _set(ref, {kw, count, lastSeen: new Date().toISOString().slice(0,10)});
        });
      } catch(e) {}
    }
  });

  // 2. Bankovní poplatky
  const bankTxs = subTxs.filter(t=>{
    const n=(t.name||'').toLowerCase();
    return n.includes('poplatek')||n.includes('vedení účtu')||n.includes('banka');
  });
  const bankFees = bankTxs.reduce((a,t)=>a+(t.amount||t.amt||0),0);
  if(bankFees > 100) {
    suggestions.push({
      category:'🏦 Bankovní poplatky',
      item:'Poplatky za vedení účtu',
      current:`${fmt(bankFees)} Kč/měs`,
      saving: Math.round(bankFees*0.8),
      tip:'Air Bank, mBank nebo Fio nabízejí účty bez poplatků',
      severity:'mid'
    });
    totalSavable += Math.round(bankFees*0.8);
  }

  // 3. Pojištění
  const pojKeywords = ['pojištění','pojistné','allianz','kooperativa','generali','čsob pojišt','česká pojišt','uniqa','direct pojišt'];
  const pojTxs = subTxs.filter(t=>pojKeywords.some(kw=>(t.name||'').toLowerCase().includes(kw)));
  const pojTotal = pojTxs.reduce((a,t)=>a+(t.amount||t.amt||0),0);
  if(pojTotal > 300) {
    suggestions.push({
      category:'🛡️ Pojištění',
      item:'Pojistné smlouvy',
      current:`${fmt(Math.round(pojTotal))} Kč/měs`,
      saving: Math.round(pojTotal*0.2),
      tip:'Srovnejte pojistné na srovnávači.cz nebo ušetřete sloučením smluv. Průměrná úspora 15–25 %.',
      severity:'mid'
    });
    totalSavable += Math.round(pojTotal*0.2);
  }

  // 4. Telefon a internet
  const telKeywords = ['vodafone','t-mobile','o2','tmobile','telefonica','cetin','upc','starlink','internet','mobilní tarif','tarif','volání'];
  const telTxs = subTxs.filter(t=>telKeywords.some(kw=>(t.name||'').toLowerCase().includes(kw)));
  const telTotal = telTxs.reduce((a,t)=>a+(t.amount||t.amt||0),0);
  if(telTotal > 400) {
    const carriers = [...new Set(telTxs.map(t=>t.name).filter(Boolean))].slice(0,3).join(', ');
    suggestions.push({
      category:'📱 Telefon & Internet',
      item:carriers||'Mobilní tarify a internet',
      current:`${fmt(Math.round(telTotal))} Kč/měs`,
      saving: Math.round(telTotal*0.25),
      tip:'Srovnejte tarify na tarifnamax.cz nebo tariffcomparison.cz. Přechod k jinému operátorovi ušetří průměrně 200–500 Kč/měs.',
      severity:'mid'
    });
    totalSavable += Math.round(telTotal*0.25);
  }

  // 5. Analýza výdajů – kategorie přes limit
  const expCats = (D.categories||[]).filter(c=>c.healthPct&&(c.type==='expense'||c.type==='both'));
  expCats.forEach(cat=>{
    const spent = txs.filter(t=>(t.catId||t.category)===cat.id&&t.type==='expense').reduce((a,t)=>a+(t.amount||t.amt||0),0);
    const limit = baseIncome>0?baseIncome*cat.healthPct/100:0;
    if(spent>limit*1.2 && limit>0) {
      const over = Math.round(spent-limit);
      suggestions.push({
        category:`${cat.icon} ${cat.name}`,
        item:'Překročení limitu kategorie',
        current:`${fmt(spent)} Kč (limit ${fmt(Math.round(limit))} Kč)`,
        saving: over,
        tip:`Snižte výdaje v kategorii ${cat.name} o ${fmt(over)} Kč na plánovaný limit`,
        severity:'mid'
      });
      totalSavable += over;
    }
  });

  // 6. Půjčky – refinancování
  const expensiveDebts = (D.debts||[]).filter(d=>d.interest>10);
  expensiveDebts.forEach(d=>{
    const betterRate = Math.max(5, d.interest*0.65);
    const origSched = d.schedule?.length?d.schedule:generateSchedule(d);
    const betterDebt = {...d, interest:betterRate};
    const betterSched = generateSchedule(betterDebt);
    const saved = Math.round(origSched.reduce((a,s)=>a+s.interest,0)-betterSched.reduce((a,s)=>a+s.interest,0));
    if(saved>10000) {
      suggestions.push({
        category:'💳 Refinancování',
        item:d.name,
        current:`${d.interest}% p.a. – přeplatíte ${fmt(Math.round(origSched.reduce((a,s)=>a+s.interest,0)))} Kč`,
        saving: Math.round(saved/origSched.length),
        tip:`Refinancováním na ~${Math.round(betterRate*10)/10}% ušetříte ${fmt(saved)} Kč celkem`,
        severity:'high'
      });
      totalSavable += Math.round(saved/origSched.length);
    }
  });

  const sevColor = s=>s==='high'?'var(--expense)':s==='mid'?'var(--debt)':'var(--text3)';
  const sevLabel = s=>s==='high'?'🔴 Vysoká':s==='mid'?'🟡 Střední':'🟢 Nízká';

  // Co detektor analyzuje – přehled
  const analyzesList = [
    {icon:'📺', label:'Předplatná', desc:'Netflix, Spotify, Apple, HBO a další'},
    {icon:'🏦', label:'Bankovní poplatky', desc:'Poplatky za vedení účtu'},
    {icon:'🛡️', label:'Pojištění', desc:'Pojistné smlouvy – srovnání'},
    {icon:'📱', label:'Telefon & Internet', desc:'Mobilní tarify a internet'},
    {icon:'🏷️', label:'Limity kategorií', desc:'Výdaje přes nastavený limit'},
    {icon:'💳', label:'Drahé půjčky', desc:'Půjčky vhodné k refinancování'},
  ];

  el.innerHTML=`
    <!-- Co detektor analyzuje -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">🔍 Co detektor analyzuje</span></div>
      <div class="card-body" style="padding:10px 14px">
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px">
          ${analyzesList.map(a=>`
            <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--surface2);border-radius:8px">
              <span style="font-size:1.1rem">${a.icon}</span>
              <div>
                <div style="font-size:.8rem;font-weight:600">${a.label}</div>
                <div style="font-size:.7rem;color:var(--text2)">${a.desc}</div>
              </div>
            </div>`).join('')}
        </div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:10px;padding:8px 10px;background:var(--surface3);border-radius:8px">
          ℹ️ Detektor prohledává vaše transakce aktuálního měsíce. Čím více transakcí zadáte, tím přesnější analýza.
        </div>
      </div>
    </div>

    ${!suggestions.length ? `
      <div class="card"><div class="card-body">
        <div class="empty"><div class="ei">✅</div>
          <div class="et">Žádné úspory nebyly detekovány</div>
          <div style="font-size:.76rem;color:var(--text3);margin-top:8px">Přidejte více transakcí pro přesnější analýzu</div>
        </div>
      </div></div>` : `
    <!-- Shrnutí -->
    <div style="background:linear-gradient(135deg,rgba(74,222,128,.08),rgba(96,165,250,.05));border:1px solid rgba(74,222,128,.2);border-radius:var(--radius);padding:16px;margin-bottom:14px;text-align:center">
      <div style="font-size:.72rem;color:var(--text3);font-weight:600;text-transform:uppercase;margin-bottom:6px">Nalezené úspory – ${CZ_M[S.curMonth]} ${S.curYear}</div>
      <div style="font-family:Syne,sans-serif;font-size:2rem;font-weight:800;color:var(--income)">${fmt(totalSavable)} Kč/měs</div>
      <div style="font-size:.8rem;color:var(--text2);margin-top:4px">${suggestions.length} doporučení</div>
      <div style="font-size:.74rem;color:var(--text3);margin-top:4px">Ročně: <strong style="color:var(--income)">${fmt(totalSavable*12)} Kč</strong></div>
    </div>

    <!-- Doporučení -->
    ${suggestions.sort((a,b)=>b.saving-a.saving).map(s=>`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div>
            <div style="font-size:.7rem;color:var(--text3);margin-bottom:3px">${s.category}</div>
            <div style="font-weight:700;font-size:.9rem">${s.item}</div>
            <div style="font-size:.76rem;color:var(--text3);margin-top:2px">${s.current}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:var(--income)">−${fmt(s.saving)} Kč/měs</div>
            <div style="font-size:.68rem;color:${sevColor(s.severity)}">${sevLabel(s.severity)} priorita</div>
          </div>
        </div>
        <div style="margin-top:8px;padding:7px 10px;background:var(--surface2);border-radius:8px;font-size:.76rem;color:var(--text2)">
          💡 ${s.tip}
        </div>
      </div>`).join('')}`}`;
}

// ══════════════════════════════════════════════════════
//  FINANČNÍ SIMULACE ŽIVOTA
// ══════════════════════════════════════════════════════
function renderSimulace() {
  const el = document.getElementById('simulaceContent'); if(!el) return;
  const D = getData();
  const baseIncome = computeBaseIncome(D) || 0;
  const baseExp = (() => {
    let total = 0;
    for(let i=0;i<3;i++){
      let m=S.curMonth-i,y=S.curYear; if(m<0){m+=12;y--;}
      total += expSum(getTx(m,y,D));
    }
    return Math.round(total/3);
  })();
  const totalDebt = (D.debts||[]).reduce((a,d)=>a+d.remaining,0);
  const monthlyPayments = (D.debts||[]).reduce((a,d)=>{
    const freq=d.freq||'monthly';
    return a+(freq==='weekly'?(d.payment||0)*4.33:freq==='biweekly'?(d.payment||0)*2.17:(d.payment||0));
  },0);
  const savWallets = (D.wallets||[]).filter(w=>w.type==='savings'||w.type==='investment');
  const currentSavings = savWallets.reduce((a,w)=>a+(w.balance||0),0);

  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">🔮 Finanční simulace života</span></div>
      <div class="card-body">
        <div style="font-size:.8rem;color:var(--text2);margin-bottom:14px">Zadejte parametry a aplikace spočítá vaši finanční budoucnost ve třech scénářích.</div>
        <div class="frow">
          <div class="fg"><label>Váš věk</label><input class="fi" type="number" id="simAge" value="35" min="18" max="64" oninput="runSimulace()"></div>
          <div class="fg"><label>Věk odchodu do důchodu</label><input class="fi" type="number" id="simRetireAge" value="65" min="40" max="80" oninput="runSimulace()"></div>
        </div>
        <div class="frow">
          <div class="fg"><label>Čistý příjem (Kč/měs)</label><input class="fi" type="number" id="simIncome" value="${baseIncome||45000}" min="0" oninput="runSimulace()"></div>
          <div class="fg"><label>Měsíční výdaje (Kč)</label><input class="fi" type="number" id="simExpenses" value="${baseExp||30000}" min="0" oninput="runSimulace()"></div>
        </div>
        <div class="frow">
          <div class="fg"><label>Celkový dluh (Kč)</label><input class="fi" type="number" id="simDebt" value="${totalDebt||0}" min="0" oninput="runSimulace()"></div>
          <div class="fg"><label>Aktuální úspory (Kč)</label><input class="fi" type="number" id="simSavings" value="${currentSavings||0}" min="0" oninput="runSimulace()"></div>
        </div>
        <div class="frow">
          <div class="fg"><label>Splátky dluhu (Kč/měs)</label><input class="fi" type="number" id="simDebtPayment" value="${Math.round(monthlyPayments)||0}" min="0" oninput="runSimulace()"></div>
          <div class="fg"><label>Inflace (% p.a.)</label><input class="fi" type="number" id="simInflation" value="3" step="0.5" min="0" max="15" oninput="runSimulace()"></div>
        </div>
        <!-- Scénáře -->
        <div style="background:var(--surface3);border-radius:10px;padding:12px;margin-bottom:14px">
          <div style="font-size:.74rem;font-weight:600;color:var(--text2);margin-bottom:10px">⚙️ Nastavení scénářů</div>
          <div class="frow">
            <div class="fg"><label>📈 Výnos investic (% p.a.)</label><input class="fi" type="number" id="simInvestReturn" value="7" step="0.5" min="0" max="20" oninput="runSimulace()"></div>
            <div class="fg"><label>% příjmu investovat</label><input class="fi" type="number" id="simInvestPct" value="15" min="0" max="100" oninput="runSimulace()"></div>
          </div>
        </div>
      </div>
    </div>
    <div id="simulaceResult"></div>
    <canvas id="simulaceChart" height="200" style="margin-top:16px"></canvas>`;

  runSimulace();
}

function runSimulace() {
  const age = parseInt(document.getElementById('simAge')?.value)||35;
  const retireAge = parseInt(document.getElementById('simRetireAge')?.value)||65;
  const income = parseFloat(document.getElementById('simIncome')?.value)||0;
  const expenses = parseFloat(document.getElementById('simExpenses')?.value)||0;
  const debt = parseFloat(document.getElementById('simDebt')?.value)||0;
  const savings = parseFloat(document.getElementById('simSavings')?.value)||0;
  const debtPayment = parseFloat(document.getElementById('simDebtPayment')?.value)||0;
  const inflation = parseFloat(document.getElementById('simInflation')?.value)||3;
  const investReturn = parseFloat(document.getElementById('simInvestReturn')?.value)||7;
  const investPct = parseFloat(document.getElementById('simInvestPct')?.value)||15;
  const rEl = document.getElementById('simulaceResult'); if(!rEl) return;

  const years = Math.max(1, retireAge - age);
  const months = years * 12;
  const monthlySurplus = income - expenses - debtPayment;
  const monthlyInvest = income * investPct / 100;
  const realReturn = (investReturn - inflation) / 100 / 12;
  const r = investReturn / 100 / 12;

  // Scénář A: Stejné tempo (jen spoření bez investic)
  let scenA = savings;
  const savingsRate = Math.max(0, monthlySurplus);
  for(let i=0;i<months;i++) {
    scenA += savingsRate;
    // Devalvace inflací
    scenA *= (1 - inflation/100/12);
  }
  scenA = Math.round(Math.max(0, scenA));

  // Scénář B: Aktivní investování
  let scenB = savings;
  for(let i=0;i<months;i++) {
    scenB = scenB * (1+r) + monthlyInvest;
  }
  scenB = Math.round(scenB);

  // Scénář C: Dřívější splacení dluhu (extra splátka = surplus - investice)
  let scenC = savings;
  let remainDebt = debt;
  let extraPayment = Math.max(0, monthlySurplus * 0.5);
  let debtFreeMonth = months;
  for(let i=0;i<months;i++) {
    if(remainDebt > 0) {
      const payment = Math.min(debtPayment + extraPayment, remainDebt);
      remainDebt = Math.max(0, remainDebt - payment);
      if(remainDebt <= 0 && debtFreeMonth === months) debtFreeMonth = i;
    } else {
      // Po splacení dluhu investuj splátku
      scenC = scenC * (1+r) + debtPayment + extraPayment;
    }
  }
  scenC = Math.round(scenC);

  // Měsíční důchod ze spořené částky (4% pravidlo / 12)
  const monthlyA = Math.round(scenA * 0.04 / 12);
  const monthlyB = Math.round(scenB * 0.04 / 12);
  const monthlyC = Math.round(scenC * 0.04 / 12);

  // Státní důchod odhad
  const stateDuchodEst = Math.round(income * 0.4 * 0.7); // rough estimate

  const best = Math.max(scenA, scenB, scenC);
  const bestLabel = scenB >= scenC ? 'B – Investování' : 'C – Splacení dluhu';

  rEl.innerHTML = `
    <!-- 3 scénáře -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      <div style="background:var(--surface2);border-radius:12px;padding:14px;border:1px solid var(--border);text-align:center">
        <div style="font-size:.68rem;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase">📉 Scénář A<br>Stejné tempo</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:var(--text)">${fmt(scenA)} Kč</div>
        <div style="font-size:.7rem;color:var(--text3);margin-top:4px">při odchodu v ${retireAge}</div>
        <div style="font-size:.76rem;color:var(--text2);margin-top:6px">${fmt(monthlyA)} Kč/měs<br><span style="font-size:.66rem;color:var(--text3)">z úspor (4% rule)</span></div>
      </div>
      <div style="background:${scenB>=scenC?'rgba(74,222,128,.08)':'var(--surface2)'};border-radius:12px;padding:14px;border:1px solid ${scenB>=scenC?'rgba(74,222,128,.3)':'var(--border)'};text-align:center">
        <div style="font-size:.68rem;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase">📈 Scénář B<br>Investuji ${investPct}%</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:var(--income)">${fmt(scenB)} Kč</div>
        <div style="font-size:.7rem;color:var(--text3);margin-top:4px">při ${investReturn}% p.a. výnosu</div>
        <div style="font-size:.76rem;color:var(--text2);margin-top:6px">${fmt(monthlyB)} Kč/měs<br><span style="font-size:.66rem;color:var(--text3)">z úspor (4% rule)</span></div>
      </div>
      <div style="background:${scenC>scenB?'rgba(74,222,128,.08)':'var(--surface2)'};border-radius:12px;padding:14px;border:1px solid ${scenC>scenB?'rgba(74,222,128,.3)':'var(--border)'};text-align:center">
        <div style="font-size:.68rem;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase">💳 Scénář C<br>Splatím dluh dříve</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:${scenC>scenA?'var(--income)':'var(--text)'}">${fmt(scenC)} Kč</div>
        <div style="font-size:.7rem;color:var(--text3);margin-top:4px">splacení za ${Math.round(debtFreeMonth/12*10)/10}r</div>
        <div style="font-size:.76rem;color:var(--text2);margin-top:6px">${fmt(monthlyC)} Kč/měs<br><span style="font-size:.66rem;color:var(--text3)">z úspor (4% rule)</span></div>
      </div>
    </div>
    <!-- Insight -->
    <div style="background:linear-gradient(135deg,rgba(96,165,250,.08),rgba(74,222,128,.05));border:1px solid rgba(96,165,250,.2);border-radius:12px;padding:14px;margin-bottom:14px">
      <div style="font-size:.74rem;color:var(--text3);margin-bottom:6px">🏆 Nejlepší scénář: <strong style="color:var(--income)">${bestLabel}</strong></div>
      <div style="font-family:Syne,sans-serif;font-size:1.6rem;font-weight:800;color:var(--income)">${fmt(best)} Kč</div>
      <div style="font-size:.78rem;color:var(--text2);margin-top:6px">
        O <strong>${fmt(best-scenA)} Kč více</strong> než při stejném tempu · 
        Měsíční renta: <strong>${fmt(Math.max(monthlyB,monthlyC))} Kč</strong> + státní důchod ~${fmt(stateDuchodEst)} Kč
      </div>
    </div>
    <!-- Inflace warning -->
    ${inflation > 0 ? `<div class="insight-item warn" style="margin-bottom:14px"><div class="insight-icon">📉</div><div class="insight-text">Při inflaci ${inflation}% p.a. bude <strong>${fmt(best)} Kč</strong> mít reálnou hodnotu pouze <strong>${fmt(Math.round(best/Math.pow(1+inflation/100,years)))} Kč</strong> dnešních peněz.</div></div>` : ''}
    <!-- Doporučení -->
    <div class="card">
      <div class="card-header"><span class="card-title">💡 Co dělat</span></div>
      <div class="card-body">
        ${monthlySurplus < 0 ? '<div class="insight-item bad"><div class="insight-icon">🚨</div><div class="insight-text">Výdaje převyšují příjmy! Bez změny nebude možné spořit ani investovat.</div></div>' : ''}
        ${monthlyInvest > 0 ? `<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text">Investujte ${fmt(Math.round(monthlyInvest))} Kč/měs (${investPct}% příjmu) do indexových fondů nebo ETF.</div></div>` : ''}
        ${debt > 0 ? `<div class="insight-item warn"><div class="insight-icon">💳</div><div class="insight-text">Dluh ${fmt(debt)} Kč – zvažte zda úrok > očekávaný výnos. Pokud ano, nejprve splaťte dluh.</div></div>` : ''}
        <div class="insight-item good"><div class="insight-icon">🎯</div><div class="insight-text">Cíl: naspořit ${fmt(Math.round(expenses*12/0.04))} Kč (25× roční výdaje) pro finanční nezávislost.</div></div>
      </div>
    </div>`;

  // Draw chart
  drawSimulaceChart(age, retireAge, savings, monthlySurplus, monthlyInvest, r, debtPayment, debt, inflation);
}

function drawSimulaceChart(age, retireAge, startSavings, surplus, monthlyInvest, r, debtPayment, debt, inflation) {
  setTimeout(()=>{
    const canvas = document.getElementById('simulaceChart'); if(!canvas) return;
    const W = canvas.parentElement?.clientWidth||500;
    canvas.width=W; canvas.height=200;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,W,200);
    const years = retireAge-age;
    const pts = Math.min(years, 50);
    const stepYears = years/pts;

    // Build 3 series
    const serA=[], serB=[], serC=[];
    let a=startSavings, b=startSavings, c=startSavings, cDebt=debt;
    for(let i=0;i<=pts;i++){
      serA.push(Math.round(a));
      serB.push(Math.round(b));
      serC.push(Math.round(c));
      const stepMonths = Math.round(stepYears*12);
      for(let m=0;m<stepMonths;m++){
        a += Math.max(0,surplus);
        a *= (1-inflation/100/12);
        b = b*(1+r)+monthlyInvest;
        if(cDebt>0){cDebt=Math.max(0,cDebt-debtPayment);}
        else{c=c*(1+r)+debtPayment;}
      }
    }

    const maxVal = Math.max(...serA,...serB,...serC,1);
    const pad={l:55,r:10,t:10,b:30};
    const cW=W-pad.l-pad.r, cH=200-pad.t-pad.b;
    const x=i=>pad.l+(i/pts)*cW;
    const y=v=>pad.t+cH-(v/maxVal)*cH;

    // Grid
    ctx.strokeStyle='rgba(46,51,71,.5)';ctx.lineWidth=1;ctx.setLineDash([3,3]);
    [0,0.25,0.5,0.75,1].forEach(f=>{ctx.beginPath();ctx.moveTo(pad.l,pad.t+cH*(1-f));ctx.lineTo(W-pad.r,pad.t+cH*(1-f));ctx.stroke();});
    ctx.setLineDash([]);

    const lines = [
      {data:serA, color:'rgba(139,144,168,.7)', dash:[]},
      {data:serB, color:'var(--income)', dash:[]},
      {data:serC, color:'var(--bank)', dash:[5,3]},
    ];
    lines.forEach(l=>{
      ctx.beginPath();
      l.data.forEach((v,i)=>i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
      ctx.strokeStyle=l.color;ctx.lineWidth=2;ctx.setLineDash(l.dash);ctx.stroke();
    });
    ctx.setLineDash([]);

    // Y labels
    ctx.fillStyle='rgba(139,144,168,.7)';ctx.font='10px Instrument Sans';ctx.textAlign='right';
    [0,0.25,0.5,0.75,1].forEach(f=>ctx.fillText(fmt(Math.round(maxVal*f)),pad.l-3,y(maxVal*f)+4));

    // X labels
    ctx.textAlign='center';
    [0,Math.floor(pts/4),Math.floor(pts/2),Math.floor(pts*3/4),pts].forEach(i=>{
      ctx.fillText(age+Math.round(i*years/pts)+'r',x(i),200-4);
    });

    // Legend
    ctx.textAlign='left';ctx.font='10px Instrument Sans';
    [{c:'rgba(139,144,168,.7)',l:'A: Stejné tempo'},{c:'var(--income)',l:'B: Investuji'},{c:'var(--bank)',l:'C: Splatím dluh'}].forEach((it,i)=>{
      const lx = pad.l+(i*120);
      ctx.fillStyle=it.c;ctx.fillRect(lx,192,12,3);
      ctx.fillStyle='rgba(139,144,168,.7)';ctx.fillText(it.l,lx+15,198);
    });
  },50);
}

// ══════════════════════════════════════════════════════
