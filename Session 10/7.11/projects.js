//  PROJEKTY
// ══════════════════════════════════════════════════════

// Session 10: vysvětlující banner k záložkám (co to je, proč to tam je, k čemu slouží).
// Sbalitelný – uloží stav do _tabIntroHidden, ať neotravuje pokročilé uživatele.
const _tabIntroHidden = {};
function tabIntroToggle(key){ _tabIntroHidden[key] = !_tabIntroHidden[key];
  const el=document.getElementById('tabIntro_'+key); if(el) el.style.display=_tabIntroHidden[key]?'none':'block';
  const b=document.getElementById('tabIntroBtn_'+key); if(b) b.textContent=_tabIntroHidden[key]?'ⓘ Co to je?':'✕ skrýt';
}
function tabIntro(key, icon, title, text){
  const hidden = _tabIntroHidden[key];
  return `<div style="margin-bottom:14px">
    <button id="tabIntroBtn_${key}" onclick="tabIntroToggle('${key}')" style="border:none;background:var(--surface2);color:var(--text3);font-size:.7rem;padding:4px 10px;border-radius:8px;cursor:pointer">${hidden?'ⓘ Co to je?':'✕ skrýt'}</button>
    <div id="tabIntro_${key}" style="display:${hidden?'none':'block'};margin-top:8px;background:linear-gradient(135deg,var(--surface2),var(--surface));border:1px solid var(--border);border-radius:11px;padding:12px 14px">
      <div style="font-size:.84rem;font-weight:700;margin-bottom:4px">${icon} ${title}</div>
      <div style="font-size:.76rem;color:var(--text3);line-height:1.6">${text}</div>
    </div>
  </div>`;
}

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
  // ADR-044 (Session 9): Vážený základ příjmu
  // Každá příjmová kategorie má stabilityWeight (0.0–1.0).
  // baseIncome = Σ(průměr_3M_kategorie × weight)
  // Neoznačené kategorie (weight undefined/null nebo 0) se nezapočítávají.
  // Fallback (jen pokud ŽÁDNÁ kategorie nemá weight > 0): průměr všech příjmů za 3M.
  D = D || getData();
  const incCats = (D.categories||[]).filter(c => c.type==='income' || c.type==='both');

  // Spočítej průměr příjmů za poslední 3 měsíce pro každou kategorii
  const catAvgs = incCats.map(cat => {
    let total = 0;
    for(let i=1;i<=3;i++){
      let m=S.curMonth-i, y=S.curYear; if(m<0){m+=12;y--;}
      const txs=getTx(m,y,D);
      const monthInc=txs.filter(t=>t.type==='income'&&(t.catId||t.category)===cat.id)
                        .reduce((a,t)=>a+(t.amount||t.amt||0),0);
      total+=monthInc;
    }
    const avg=total/3;
    // Urči váhu: uložená stabilityWeight má přednost, jinak výchozí z incomeChar
    let weight;
    if(cat.stabilityWeight!==undefined && cat.stabilityWeight!==null){
      weight=cat.stabilityWeight;
    } else if(cat.stable===true){
      // Legacy: stable:true bez nové váhy → 1.0
      weight=1.0;
    } else {
      weight=0; // neoznačené = 0 (ADR-044)
    }
    return {catId:cat.id, avg, weight};
  });

  const weighted = catAvgs.reduce((a,c)=>a+(c.avg*c.weight),0);

  if(weighted > 0) return Math.round(weighted);

  // Fallback: žádná kategorie s váhou > 0 → průměr všech příjmů za 3M
  let incTotal=0, incMonths=0;
  for(let i=1;i<=3;i++){
    let m=S.curMonth-i, y=S.curYear; if(m<0){m+=12;y--;}
    const mi=incSum(getTx(m,y,D));
    if(mi>0){incTotal+=mi;incMonths++;}
  }
  return incMonths>0 ? Math.round(incTotal/incMonths) : 0;
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
function computeHealthScores(D, m, y) {
  D = D || getData();
  if (m === undefined) m = S.curMonth;
  if (y === undefined) y = S.curYear;
  const baseIncome = computeBaseIncome(D);
  const txs = getTx(m, y, D);
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
    const spent = getActual(cat.id, null, m, y, D);
    const score = computeCatHealth(cat, spent, baseIncome);
    return score !== null ? score : null;
  }).filter(s => s !== null);
  const budgetScore = catScores.length > 0 ? Math.round(catScores.reduce((a,s)=>a+s,0)/catScores.length) : 75;

  // 3. ÚSPOROVÉ ZDRAVÍ – spoření + investice
  const savingCats = (D.categories||[]).filter(c => c.isSaving);
  let savingScore = 50;
  if(savingCats.length > 0 && baseIncome > 0) {
    const totalSaved = savingCats.reduce((a,c) => a + getActual(c.id, null, m, y, D), 0);
    const minSaving = baseIncome * 0.1;
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
function drawHealthRing(canvasId, score, size=160, noSub=false) {
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
  ctx.font=`bold ${size*(noSub?0.30:0.22)}px Syne,sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(score, cx, noSub?cy:cy-size*0.04);
  if(!noSub){
    ctx.fillStyle='rgba(255,255,255,.5)';
    ctx.font=`${size*0.09}px Instrument Sans,sans-serif`;
    ctx.fillText('/100', cx, cy+size*0.13);
  }
}

// Session 10: mřížka kruhů Celkového zdraví pro libovolný počet měsíců (2–12).
// Každý měsíc = jeden mini ring s číslem + popisek úrovně; dole průměr období.
function renderHealthRingGrid(D) {
  const cont = document.getElementById('healthGridContainer');
  if (!cont) return;
  D = D || getData();
  const n = periodToMonths(_reportPeriod);
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    let m = S.curMonth - i, y = S.curYear; while (m < 0) { m += 12; y--; }
    const sc = computeHealthScores(D, m, y);
    months.push({ m, y, score: sc.overall, label: CZ_M[m].slice(0,3) });
  }
  // Chytré rozložení sloupců: ≤4 = n sloupců, ≤6 = 3, jinak 6
  const cols = n <= 4 ? n : n <= 6 ? 3 : 6;
  const cellSize = n <= 4 ? 64 : 54;
  const avg = Math.round(months.reduce((a,x)=>a+x.score,0)/months.length);

  const cells = months.map(mo => `
    <div style="text-align:center">
      <canvas id="hgrid_${mo.m}_${mo.y}" width="${cellSize}" height="${cellSize}" style="width:${cellSize}px;height:${cellSize}px"></canvas>
      <div style="font-size:.62rem;color:var(--text3);margin-top:2px">${mo.label}</div>
      <div style="font-size:.58rem;color:${healthColor(mo.score)}">${healthLabel(mo.score).replace(/^.. /,'')}</div>
    </div>`).join('');

  cont.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px 4px;justify-items:center;margin-bottom:12px">${cells}</div>
    <div style="font-size:.7rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em">Průměr období</div>
    <div class="health-score-label" style="color:${healthColor(avg)}">${avg}</div>
    <div class="health-score-sub">${healthLabel(avg)}</div>`;

  setTimeout(() => {
    months.forEach(mo => drawHealthRing(`hgrid_${mo.m}_${mo.y}`, mo.score, cellSize));
  }, 20);
}

// Session 10: tabulka 3 složek zdraví jako KRUHY PO MĚSÍCÍCH (dle návrhu uživatele).
// Pro 1 měsíc = 1 řádek se 3 kruhy (výdajové/rozpočtové/úsporové),
// pro N měsíců = N řádků pod sebou. Popisky sloupců jsou v HTML nad gridem.
function renderComp3Grid(D, nMonths) {
  const cont = document.getElementById('comp3Grid');
  if (!cont) return;
  D = D || getData();
  const n = Math.max(1, nMonths || 1);
  const r = n > 6 ? 22 : 26; // velikost kruhu

  const rows = [];
  for (let i = n - 1; i >= 0; i--) {
    let m = S.curMonth - i, y = S.curYear; while (m < 0) { m += 12; y--; }
    const sc = computeHealthScores(D, m, y);
    rows.push({ m, y, label: `${CZ_M[m].slice(0,3)} ${String(y).slice(2)}`, exp: sc.expScore, budget: sc.budgetScore, saving: sc.savingScore });
  }

  cont.innerHTML = rows.map(row => `
    <div style="display:grid;grid-template-columns:auto repeat(3,1fr);gap:6px 8px;align-items:center;margin-bottom:${n>1?'8px':'0'}">
      <div style="font-size:.68rem;color:var(--text3);min-width:46px;font-weight:600">${n>1?row.label:''}</div>
      <div style="display:flex;justify-content:center"><canvas id="c3_${row.m}_${row.y}_e" width="${r*2}" height="${r*2}" style="width:${r*2}px;height:${r*2}px"></canvas></div>
      <div style="display:flex;justify-content:center"><canvas id="c3_${row.m}_${row.y}_b" width="${r*2}" height="${r*2}" style="width:${r*2}px;height:${r*2}px"></canvas></div>
      <div style="display:flex;justify-content:center"><canvas id="c3_${row.m}_${row.y}_s" width="${r*2}" height="${r*2}" style="width:${r*2}px;height:${r*2}px"></canvas></div>
    </div>`).join('');

  setTimeout(() => {
    rows.forEach(row => {
      drawHealthRing(`c3_${row.m}_${row.y}_e`, row.exp, r*2, true);
      drawHealthRing(`c3_${row.m}_${row.y}_b`, row.budget, r*2, true);
      drawHealthRing(`c3_${row.m}_${row.y}_s`, row.saving, r*2, true);
    });
  }, 20);
}

// ══════════════════════════════════════════════════════
//  MĚSÍČNÍ REPORT
// ══════════════════════════════════════════════════════
// ── Stav záložky reportu ──
let _reportPeriod = '1M'; // '7D'|'1M'..'12M'|'advisor'
function reportSetPeriod(p) { _reportPeriod = p; renderReport(); }
// Session 10: stepper – nastav libovolný počet měsíců 1–12
function reportSetMonths(n) { n = Math.max(1, Math.min(12, n)); _reportPeriod = n + 'M'; renderReport(); }

// Session 10: převod periody na počet měsíců. Podporuje 1M–12M (i 2M/4M/5M/7-11M).
function periodToMonths(p) {
  if (p === '7D') return 1; // 7D = poslední dny aktuálního měsíce
  const m = /^(\d+)M$/.exec(p);
  return m ? Math.max(1, Math.min(12, parseInt(m[1], 10))) : 1;
}

// OPEN-012 + OPEN-029 FIX (Session 10): agregace výdajů kategorie/podkategorie
// přes CELÉ období dle zvolené periody (7D/1M..12M), ne jen aktuální měsíc.
// Tohle bylo příčinou „statických dat" v sekci Finanční zdraví dle kategorií –
// health rows braly vždy getActual(..., S.curMonth, S.curYear) bez ohledu na záložku.
function getActualRange(catId, sub, period, D) {
  D = D || getData();
  if (period === '7D') {
    // posledních 7 dní podle data transakce
    const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 6);
    from.setHours(0,0,0,0); to.setHours(23,59,59,999);
    return (D.transactions||[])
      .filter(t => t.type==='expense' && !t.isBalancing && t.catId===catId && (!sub||t.subcat===sub))
      .filter(t => { const d=new Date(t.date); return d>=from && d<=to; })
      .reduce((a,t)=>a+(t.amount||t.amt||0),0);
  }
  const n = periodToMonths(period);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let m = S.curMonth - i, y = S.curYear; while (m < 0) { m += 12; y--; }
    sum += getActual(catId, sub, m, y, D);
  }
  return sum;
}

function renderReport() {
  const el = document.getElementById('reportContent'); if(!el) return;

  // Záložky period + stepper pro libovolný počet měsíců (1–12) + Poradce
  const quick = ['7D','1M','3M','6M','12M'];
  const labels  = {'7D':'7 dní','1M':'Měsíc','3M':'3 měs.','6M':'6 měs.','12M':'12 měs.'};
  const curN = periodToMonths(_reportPeriod);
  const isCustom = _reportPeriod !== '7D' && !['1M','3M','6M','12M'].includes(_reportPeriod);
  const tabBar = tabIntro('report','📊','Měsíční report',
    'Komplexní pohled na tvé finance za zvolené období. Uvidíš příjmy, výdaje a saldo, zdraví jednotlivých kategorií (kolik utrácíš vs. limity), celkové finanční skóre a jeho vývoj v čase. Záložka <strong>Poradce</strong> přidává AI doporučení na míru. Slouží k tomu, abys rychle poznal, kde peníze utíkají a jestli se tvá situace zlepšuje.')
    + `<div style="display:flex;gap:3px;margin-bottom:8px;background:var(--surface2);border-radius:12px;padding:4px;border:1px solid var(--border);overflow-x:auto">
    ${quick.map(p=>`<button onclick="reportSetPeriod('${p}')"
      style="flex:1;padding:8px 4px;border:none;border-radius:9px;font-size:.74rem;font-weight:${_reportPeriod===p?700:500};cursor:pointer;transition:all .15s;white-space:nowrap;
        background:${_reportPeriod===p?'var(--surface)':'transparent'};
        color:${_reportPeriod===p?'var(--text)':'var(--text3)'};
        box-shadow:${_reportPeriod===p?'0 1px 4px rgba(0,0,0,.18)':'none'}">${labels[p]}</button>`).join('')}
    <button onclick="reportSetPeriod('advisor')"
      style="flex-shrink:0;padding:8px 10px;border:none;border-radius:9px;font-size:.74rem;font-weight:${_reportPeriod==='advisor'?700:500};cursor:pointer;transition:all .15s;white-space:nowrap;
        background:${_reportPeriod==='advisor'?'var(--bank)':'transparent'};
        color:${_reportPeriod==='advisor'?'#fff':'var(--bank)'};
        box-shadow:${_reportPeriod==='advisor'?'0 1px 4px rgba(0,0,0,.18)':'none'}">📋 Poradce</button>
  </div>
  ${_reportPeriod==='advisor' ? '' : `<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:.74rem;color:var(--text3)">
    <span>Vlastní počet měsíců:</span>
    <button onclick="reportSetMonths(${Math.max(1,curN-1)})" style="width:26px;height:26px;border:none;border-radius:7px;background:var(--surface2);color:var(--text);cursor:pointer;font-size:1rem;line-height:1">−</button>
    <span style="min-width:54px;text-align:center;font-weight:700;color:${isCustom?'var(--bank)':'var(--text)'}">${_reportPeriod==='7D'?'7 dní':curN+' měs.'}</span>
    <button onclick="reportSetMonths(${Math.min(12,curN+1)})" style="width:26px;height:26px;border:none;border-radius:7px;background:var(--surface2);color:var(--text);cursor:pointer;font-size:1rem;line-height:1">+</button>
    <span style="font-size:.68rem">(1–12)</span>
  </div>`}`;

  // Záložka Poradce
  if (_reportPeriod === 'advisor') {
    // Session 10 FIX: anti-flicker. renderReport() se volá z Firebase listeneru
    // při každé synchronizaci. Pokud už advisorContainer existuje, NEPŘEPISUJ
    // celý innerHTML (to by zlikvidovalo a znovu vytvořilo DOM → blikání).
    // Nech renderAdvisor() rozhodnout, zda je potřeba překreslit (má vlastní guard).
    if (!document.getElementById('advisorContainer')) {
      el.innerHTML = tabBar + '<div id="advisorContainer"><div class="empty" style="padding:24px"><div class="ei">⏳</div><div class="et">Načítám report...</div></div></div>';
    }
    setTimeout(() => {
      try {
        if (typeof renderAdvisor === 'function') renderAdvisor();
        else {
          document.getElementById('advisorContainer').innerHTML = '<div style="padding:20px;color:var(--expense)">⚠️ advisor.js není načten</div>';
        }
      } catch(e) {
        console.error('renderAdvisor error:', e);
        document.getElementById('advisorContainer').innerHTML = `<div style="padding:20px;color:var(--expense)">⚠️ Chyba: ${e.message}</div>`;
      }
    }, 30);
    return;
  }

  const D = getData();
  // Výběr počátečního měsíce dle počtu měsíců v periodě
  const nMonths = periodToMonths(_reportPeriod);
  let rMonth = S.curMonth - (nMonths - 1), rYear = S.curYear;
  while (rMonth < 0) { rMonth += 12; rYear--; }

  // computeHealthScores pro správný měsíc
  const scores = computeHealthScores(D, rMonth, rYear);

  // Agreguj transakce přes více měsíců / dní
  let txs = [];
  if (_reportPeriod === '7D') {
    const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 6);
    from.setHours(0,0,0,0); to.setHours(23,59,59,999);
    txs = (D.transactions||[]).filter(t => { const d=new Date(t.date); return d>=from && d<=to; });
  } else if (nMonths === 1) {
    txs = getTx(S.curMonth, S.curYear, D);
  } else {
    let m = rMonth, y = rYear;
    while (y < S.curYear || (y === S.curYear && m <= S.curMonth)) {
      txs = txs.concat(getTx(m, y, D));
      m++; if (m > 11) { m = 0; y++; }
    }
  }
  const totalInc = incSum(txs), totalExp = expSum(txs), saldo = totalInc - totalExp;

  // Předchozí měsíc pro srovnání
  let pm = S.curMonth-1, py = S.curYear; if(pm<0){pm=11;py--;}
  const prevTxs = getTx(pm, py, D);
  const prevInc = incSum(prevTxs), prevExp = expSum(prevTxs);
  const expDiff = prevExp>0 ? Math.round((totalExp-prevExp)/prevExp*100) : null;

  // Název období
  const periodLabel = _reportPeriod === '7D' ? 'Posledních 7 dní' :
    nMonths === 1 ? `${CZ_M[S.curMonth]} ${S.curYear}` :
    `${CZ_M[rMonth]} ${rYear} – ${CZ_M[S.curMonth]} ${S.curYear} (${nMonths} měs.)`;

  // Category health rows
  // OPEN-012/029 FIX: hodnoty se agregují přes zvolené období (perioda), ne jen
  // aktuální měsíc. Trend se srovnává s předchozím stejně dlouhým oknem.
  const periodMonths = nMonths;
  const expCats = (D.categories||[]).filter(c => c.type==='expense'||c.type==='both');
  const catRows = expCats.map(cat => {
    const spent = getActualRange(cat.id, null, _reportPeriod, D);
    if(spent === 0 && !cat.isSaving) return null;
    const score = computeCatHealth(cat, spent, scores.baseIncome);
    const limitPct = cat.healthPct ? `${cat.healthPct}%` : '–';
    const limitAmt = cat.healthAmt ? fmt(cat.healthAmt) : (cat.isSaving ? 'min' : '–');
    const pctOfInc = totalInc > 0 ? Math.round(spent/totalInc*100) : 0;
    const planAmt = cat.healthPct && scores.baseIncome > 0 ? fmt(Math.round(scores.baseIncome*cat.healthPct/100)) : '–';
    const sc = score !== null ? score : 75;
    const barW = Math.min(100, sc);
    const trend = (() => {
      // Předchozí stejně dlouhé okno: pro 1M/7D minulý měsíc, pro 3M předchozí 3M atd.
      let prev = 0;
      for (let i = 0; i < periodMonths; i++) {
        let m = S.curMonth - periodMonths - i, y = S.curYear; while (m < 0) { m += 12; y--; }
        prev += getActual(cat.id, null, m, y, D);
      }
      if(!prev) return '';
      const d = Math.round((spent-prev)/prev*100);
      return d > 5 ? `<span style="color:var(--expense);font-size:.7rem">↑${d}%</span>` :
             d < -5 ? `<span style="color:var(--income);font-size:.7rem">↓${Math.abs(d)}%</span>` :
             `<span style="color:var(--text3);font-size:.7rem">↔ stabilní</span>`;
    })();
    // Podkategorie s daty pro aktuální období
    const activeSubs = (cat.subs||[]).map(sub=>({
      name:sub, val: getActualRange(cat.id, sub, _reportPeriod, D)
    })).filter(s=>s.val>0).sort((a,b)=>b.val-a.val);
    return `<div class="health-bar-row" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div style="font-size:1rem;flex-shrink:0;margin-top:2px">${cat.icon}</div>
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
      </div>
      ${activeSubs.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:7px;padding-left:28px">
        ${activeSubs.map(s=>`<span style="font-size:.7rem;padding:2px 8px;background:${hexA(cat.color,.12)};border:1px solid ${hexA(cat.color,.3)};border-radius:10px;color:var(--text2)">
          ${s.name} <span style="color:var(--text2);font-weight:600">${fmt(s.val)}</span>
        </span>`).join('')}
      </div>` : ''}
    </div>`;
  }).filter(Boolean).join('');

  el.innerHTML = tabBar + `
    <div class="report-section-title">📊 ${periodLabel} – Měsíční přehled</div>
    <div class="report-stat-grid">
      <div class="stat-card income"><div class="stat-label">Příjmy</div><div class="stat-value up">${fmt(totalInc)}</div><div class="stat-sub" style="font-size:.68rem">${prevInc?'min. '+fmt(prevInc):''}</div></div>
      <div class="stat-card expense"><div class="stat-label">Výdaje</div><div class="stat-value down">${fmt(totalExp)}</div><div class="stat-sub">${expDiff!==null?`<span style="color:${expDiff>0?'var(--expense)':'var(--income)'}">${expDiff>0?'↑':'↓'}${Math.abs(expDiff)}%</span>`:''}</div></div>
      <div class="stat-card balance"><div class="stat-label">Saldo</div><div class="stat-value ${saldo>=0?'up':'down'}">${fmt(saldo)}</div></div>
      <div class="stat-card bank"><div class="stat-label">Základ příjmu</div><div class="stat-value bankc">${fmt(scores.baseIncome)}</div><div class="stat-sub" style="font-size:.68rem">prům. 3 měs.</div></div>
    </div>

    <div class="report-section-title">💚 Finanční zdraví dle kategorií</div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-body">
        <div style="background:var(--surface2);border-radius:9px;padding:9px 12px;margin-bottom:12px;font-size:.7rem;color:var(--text3);line-height:1.6">
          <div style="display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:4px">
            <span>📊 <strong style="color:var(--text2)">Částka</strong> = výdaje za období</span>
            <span>📈 <strong style="color:var(--text2)">trend</strong> = vs minulé období</span>
            <span><span class="health-score-pill" style="color:var(--income)">75</span> = <strong style="color:var(--text2)">skóre kategorie</strong> (0–100)</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px 14px">
            <span><span style="color:#4ade80">🟢 zelená</span> v limitu / bez limitu (výchozí 75)</span>
            <span><span style="color:#fbbf24">🟡 žlutá</span> blíží se limitu</span>
            <span><span style="color:#f87171">🔴 červená</span> překročen limit kategorie</span>
          </div>
        </div>
        ${catRows||'<div class="empty"><div class="et">Žádné výdaje v tomto období</div></div>'}
      </div>
    </div>

    <div class="report-section-title">🏆 Celkové finanční zdraví</div>
    <div class="grid2" style="margin-bottom:16px;align-items:start">
      <div class="card" style="text-align:center;padding:24px">
        ${(nMonths >= 2)
          ? `<div id="healthGridContainer"><div style="color:var(--text3);font-size:.8rem">Načítám…</div></div>`
          : `<canvas id="mainHealthRing"></canvas>
        <div class="health-score-label" style="color:${healthColor(scores.overall)}">${scores.overall}</div>
        <div class="health-score-sub">${healthLabel(scores.overall)}</div>`}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">3 složky zdraví ${nMonths>=2?`(${nMonths} měsíců)`:''}</span></div>
        <div class="card-body">
          <!-- Popisky nad polem hodnot -->
          <div style="display:grid;grid-template-columns:auto repeat(3,1fr);gap:6px 8px;align-items:center;margin-bottom:8px">
            <div></div>
            <div style="text-align:center;font-size:.64rem;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.03em">Výdajové</div>
            <div style="text-align:center;font-size:.64rem;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.03em">Rozpočtové</div>
            <div style="text-align:center;font-size:.64rem;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.03em">Úsporové</div>
          </div>
          <div id="comp3Grid"><div style="color:var(--text3);font-size:.8rem">Načítám…</div></div>
          <div style="font-size:.72rem;color:var(--text3);line-height:1.6;margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
            <div><strong style="color:var(--text2)">Výdajové</strong> – poměr výdajů k příjmům (méně utrácíš = vyšší).</div>
            <div><strong style="color:var(--text2)">Rozpočtové</strong> – dodržování nastavených limitů kategorií.</div>
            <div><strong style="color:var(--text2)">Úsporové</strong> – zda odkládáš alespoň 10 % příjmu.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Session 10: Graf finančního skóre v čase (dle zvolené periody) -->
    <div class="report-section-title">📈 Vývoj finančního skóre</div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:12px 8px">
        <div id="reportScoreChartContainer">
          <div style="color:var(--text3);font-size:.8rem;padding:16px;text-align:center">Načítám graf…</div>
        </div>
        <div style="font-size:.68rem;color:var(--text3);margin-top:6px;text-align:center">Kruhy se skóre propojené čarou · vyšší = lepší · osa: měsíce</div>
      </div>
    </div>`;

  // Draw ring after DOM update – velký ring pro 1M/7D, mřížka kruhů pro 2M+
  if (nMonths < 2) {
    setTimeout(() => drawHealthRing('mainHealthRing', scores.overall, 160), 50);
  } else {
    setTimeout(() => renderHealthRingGrid(D), 50);
  }

  // Session 10: tabulka 3 složek zdraví jako kruhy po měsících
  setTimeout(() => renderComp3Grid(D, nMonths), 55);

  // Session 10: Graf vývoje skóre dle zvolené periody (počet bodů = počet měsíců)
  setTimeout(() => {
    const cont = document.getElementById('reportScoreChartContainer');
    if (!cont) return;
    const n = nMonths;
    const months = [];
    for (let i = n - 1; i >= 0; i--) {
      let m = S.curMonth - i, y = S.curYear; while (m < 0) { m += 12; y--; }
      const t = getTx(m, y, D);
      const inc = incSum(t), exp = expSum(t);
      // Použij stejné skóre jako Poradce, pokud je advisorMonthScore dostupná
      const sc = typeof advisorMonthScore === 'function'
        ? advisorMonthScore(inc, exp, D)
        : (inc > 0 ? Math.min(100, Math.round(Math.max(0,(inc-exp)/inc)*100)) : 0);
      months.push({ m, y, score: sc, label: CZ_M[m].slice(0,3) });
    }
    if (n === 1) {
      // Jediný měsíc – graf nedává smysl, ukaž velké číslo
      const mo = months[0];
      const col = mo.score>=75?'#4ade80':mo.score>=50?'#fbbf24':'#f87171';
      cont.innerHTML = `<div style="text-align:center;padding:8px">
        <div style="font-size:2rem;font-weight:800;font-family:Syne,sans-serif;color:${col}">${mo.score}<span style="font-size:.9rem;color:var(--text3)">/100</span></div>
        <div style="font-size:.72rem;color:var(--text3)">${mo.label} ${mo.y} · pro graf zvol 3M / 6M / 12M</div>
      </div>`;
    } else if (typeof drawHealthScoreLineChart === 'function') {
      cont.innerHTML = `<canvas id="reportScoreCanvas" style="width:100%;display:block"></canvas>`;
      setTimeout(() => drawHealthScoreLineChart('reportScoreCanvas', months), 30);
    }
  }, 60);

  // Session 10: DTI/DSTI bylo přesunuto do záložky Půjčky (renderDebts → renderDTISection).
  // Důvod: DTI/DSTI je momentka dluhového profilu (celkový dluh + splátky), ne měsíční
  // metrika – proto se neměnila při přepínání měsíců, což mátlo. Patří k Půjčkám.
}

function renderDTISection(D, baseIncome) {
  // Session 10: cílí na dtiDstiContainer v záložce Půjčky (přesunuto z reportu).
  const el = document.getElementById('dtiDstiContainer'); if(!el) return;
  D = D || getData();
  const debts = D.debts || [];
  if(!debts.length) { el.innerHTML = ''; return; }
  if (baseIncome === undefined) {
    const sc = computeHealthScores(D, S.curMonth, S.curYear);
    baseIncome = sc.baseIncome;
  }

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
      // OPEN-009 FIX (Session 10): fallback na d.payment musí zohlednit
      // periodicitu (d.freq). Týdenní/čtrnáctidenní splátka se přepočítá na měsíční,
      // jinak DSTI podhodnocené (sjednoceno s advisor.js).
      const base = d.payment || d.installment || 0;
      const f = d.freq || 'monthly';
      amt = f === 'weekly' ? base * 4.33 : f === 'biweekly' ? base * 2.17 : base;
    }
    return a + amt;
  }, 0);
  // v6.39 FIX: Fallback - pokud baseIncome=0 (žádná 'stabilní' kategorie příjmů),
  // použij skutečný součet příjmů z posledních 3 měsíců jako průměr
  let effectiveIncome = baseIncome;
  if(!effectiveIncome) {
    let incTotal = 0, incMonths = 0;
    for(let i=0; i<3; i++) {
      let m=S.curMonth-i, y=S.curYear; if(m<0){m+=12;y--;}
      const monthInc = incSum(getTx(m,y,D));
      if(monthInc > 0) { incTotal += monthInc; incMonths++; }
    }
    effectiveIncome = incMonths > 0 ? Math.round(incTotal / incMonths) : 0;
  }
  const annualIncome = effectiveIncome * 12;

  // DTI = celkový dluh / roční příjem × 100 (ČNB limit: max 900%)
  const dti = annualIncome > 0 ? Math.round(totalDebt / annualIncome * 100) : null;
  // DSTI = měsíční splátky / měsíční příjem × 100 (ČNB limit: max 45%)
  const dsti = effectiveIncome > 0 ? Math.round(monthlyPayments / effectiveIncome * 100) : null;

  // ČNB limity
  // Pokud nemáme příjem, zobraz varování místo 0%
  const dtiStatus = dti === null ? 'nodata' : dti < 700 ? 'safe' : dti < 900 ? 'warn' : 'danger';
  const dstiStatus = dsti === null ? 'nodata' : dsti < 35 ? 'safe' : dsti < 45 ? 'warn' : 'danger';
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
  el.innerHTML = '';
  el.appendChild(dtiSection);
}

// ══════════════════════════════════════════════════════
//  FINANČNÍ RADAR – Predikce problémů
// ══════════════════════════════════════════════════════
function renderRadar() {
  const el = document.getElementById('radarContent'); if(!el) return;
  const D = getData();
  const txs = getTx(S.curMonth, S.curYear, D);
  const totalInc = incSum(txs);
  const totalExp = expSum(txs);
  const saldo = totalInc - totalExp;

  // ── Zjisti zda je zobrazovaný měsíc aktuální nebo minulý ──
  const today = new Date();
  const isCurrentMonth = (S.curMonth === today.getMonth() && S.curYear === today.getFullYear());
  const isPastMonth = !isCurrentMonth && (S.curYear < today.getFullYear() || (S.curYear === today.getFullYear() && S.curMonth < today.getMonth()));

  // Dny do konce měsíce (jen pro aktuální měsíc)
  const daysInMonth = new Date(S.curYear, S.curMonth+1, 0).getDate();
  const daysLeft = isCurrentMonth ? daysInMonth - today.getDate() : 0;
  const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;

  // ── Projekce konce měsíce ──
  // FIX (Session 9): Pro minulý/uzavřený měsíc = skutečnost (inc - exp), žádná projekce.
  // Pro aktuální měsíc s alespoň 3 dny dat = extrapolace denní sazby.
  let projectedExp, projectedSaldo, projectedLabel, projectedSub;
  if(isPastMonth || daysLeft === 0) {
    // Měsíc skončil – projekce = skutečnost
    projectedExp = totalExp;
    projectedSaldo = saldo;
    projectedLabel = 'Skutečné saldo';
    projectedSub = 'měsíc uzavřen';
  } else if(daysElapsed >= 3 && totalExp > 0) {
    // Aktivní měsíc s dostatkem dat
    const dailyRate = totalExp / daysElapsed;
    projectedExp = Math.round(totalExp + dailyRate * daysLeft);
    projectedSaldo = totalInc - projectedExp;
    projectedLabel = 'Projekce konce měsíce';
    projectedSub = `denní tempo ${fmt(Math.round(dailyRate))} Kč/den`;
  } else {
    // Začátek měsíce, málo dat
    projectedExp = totalExp;
    projectedSaldo = saldo;
    projectedLabel = 'Saldo (zatím)';
    projectedSub = `${daysLeft} dní do konce`;
  }

  // ── Trend výdajů (3 měsíce) ──
  const expTrends = [];
  for(let i=2;i>=0;i--){
    let m=S.curMonth-i, y=S.curYear; while(m<0){m+=12;y--;}
    expTrends.push({v:expSum(getTx(m,y,D)), m, y});
  }
  const expTrend = expTrends[2].v>0&&expTrends[0].v>0 ? Math.round((expTrends[2].v-expTrends[0].v)/expTrends[0].v*100) : 0;

  // ── Budoucí platby – z budouci.js (30 dní) ──
  const budItems = typeof budouciGetAll === 'function' ? budouciGetAll(D, 30) : [];
  // Seskupuj po zdrojích pro zobrazení v rámečku
  const budThisMonth = budItems.filter(b => {
    const bd = new Date(b.date);
    return bd.getMonth() === today.getMonth() && bd.getFullYear() === today.getFullYear();
  });
  const budNextMonth = budItems.filter(b => {
    const bd = new Date(b.date);
    const nm = today.getMonth()+1 > 11 ? 0 : today.getMonth()+1;
    const ny = today.getMonth()+1 > 11 ? today.getFullYear()+1 : today.getFullYear();
    return bd.getMonth() === nm && bd.getFullYear() === ny;
  });
  const budThisTotal = budThisMonth.reduce((a,b)=>a+b.amount,0);
  const budNextTotal = budNextMonth.reduce((a,b)=>a+b.amount,0);

  // ── Nadcházející splátky dluhů (příští měsíc) ──
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth()+1, 1);
  const nextMonthStr = nextMonthDate.toISOString().slice(0,7);
  const upcomingPayments = (D.debts||[]).reduce((a,d)=>{
    const s = d.schedule?.find(s=>s.date.startsWith(nextMonthStr)&&!s.paid);
    return a + (s?.payment||d.payment||0);
  },0);

  // ── Detekce předplatných – POUZE z aktuálního měsíce (stejná logika jako Detektor úspor) ──
  // FIX (Session 9): Předchozí kód sčítal CELOU historii transakcí → zobrazoval mnohonásobně
  // nafouklou částku. Nyní čteme jen transakce aktuálního zobrazeného měsíce.
  const subKeywords = ['netflix','spotify','youtube premium','youtube','apple','microsoft','amazon',
    'hbo','disney','patreon','google one','alza','deezer','adobe','dropbox','evernote','o2 tv','skylink'];
  const subKeywordsSorted = [...subKeywords].sort((a,b)=>b.length-a.length);
  let subTotal = 0;
  const subMatched = [];
  txs.filter(t=>t.type==='expense').forEach(t=>{
    const name = (t.name||'').toLowerCase();
    const amt = t.amount||t.amt||0;
    if(amt<=0) return;
    for(const kw of subKeywordsSorted){
      if(name.includes(kw)){
        subTotal += amt;
        subMatched.push(t.name);
        break;
      }
    }
  });

  // ── Alerty ──
  const alerts = [];
  const tips = [];

  if(isCurrentMonth) {
    if(projectedSaldo < 0 && daysLeft > 0) {
      alerts.push({level:'danger', icon:'🚨', text:`Za ${daysLeft} dní hrozí záporné saldo! Odhadované výdaje ${fmt(projectedExp)} Kč přesahují příjmy ${fmt(totalInc)} Kč.`});
    } else if(projectedSaldo >= 0 && projectedSaldo < totalInc * 0.1 && daysLeft > 0) {
      alerts.push({level:'warn', icon:'⚠️', text:`Tento měsíc zbývá jen ${fmt(projectedSaldo)} Kč. Méně než 10 % příjmu.`});
    }
  } else if(isPastMonth) {
    if(saldo < 0) {
      alerts.push({level:'danger', icon:'📉', text:`${CZ_M[S.curMonth]} ${S.curYear} skončil se záporným saldem ${fmt(saldo)} Kč.`});
    }
  }

  if(expTrend > 10) {
    alerts.push({level:'warn', icon:'📈', text:`Výdaje rostou ${expTrend} % za poslední 3 měsíce. Trend je nepříznivý.`});
  }

  if(upcomingPayments > 0) {
    const upcomingPct = totalInc > 0 ? Math.round(upcomingPayments/totalInc*100) : 0;
    if(upcomingPct > 40) {
      alerts.push({level:'danger', icon:'💳', text:`Příští měsíc splátky ${fmt(Math.round(upcomingPayments))} Kč = ${upcomingPct} % příjmu. Kritické zatížení!`});
    } else if(upcomingPct > 25) {
      alerts.push({level:'warn', icon:'💳', text:`Příští měsíc splátky ${fmt(Math.round(upcomingPayments))} Kč = ${upcomingPct} % příjmu.`});
    }
  }

  if(budNextTotal > 0 && upcomingPayments === 0) {
    const pct = totalInc > 0 ? Math.round(budNextTotal/totalInc*100) : 0;
    if(pct > 30) alerts.push({level:'warn', icon:'🗓️', text:`Příští měsíc plánované platby ${fmt(Math.round(budNextTotal))} Kč (${pct} % příjmu).`});
  }

  if(subTotal > 0) tips.push({icon:'📺', text:`Předplatná tento měsíc: ${fmt(subTotal)} Kč – zkontrolujte, zda vše využíváte${subMatched.length ? ' (' + subMatched.slice(0,3).join(', ') + (subMatched.length>3?'…':'') + ')' : ''}`});

  if(saldo > 0 && totalInc > 0 && saldo/totalInc < 0.1) {
    tips.push({icon:'💡', text:`Odkládáte méně než 10 % příjmu. Doporučujeme min. 10–20 % na spořicí účet.`});
  }

  if(!alerts.length) alerts.push({level:'safe', icon:'✅', text:'Žádná finanční rizika tento měsíc. Vše vypadá dobře!'});

  const radarScore = alerts.filter(a=>a.level==='danger').length > 0 ? 'danger' :
                     alerts.filter(a=>a.level==='warn').length > 0 ? 'warn' : 'safe';
  const radarColor = radarScore==='safe'?'var(--income)':radarScore==='warn'?'var(--debt)':'var(--expense)';
  const radarBg = radarScore==='safe'?'rgba(74,222,128,.06)':radarScore==='warn'?'rgba(251,191,36,.06)':'rgba(248,113,113,.06)';

  // ── Kvartální přehled (od 1. 1. aktuálního roku) ──
  const quarters = [
    {label:'Q1', months:[0,1,2]},
    {label:'Q2', months:[3,4,5]},
    {label:'Q3', months:[6,7,8]},
    {label:'Q4', months:[9,10,11]},
  ];
  const qData = quarters.map(q => {
    let qInc=0, qExp=0;
    q.months.forEach(m => {
      const mt = getTx(m, S.curYear, D);
      qInc += incSum(mt);
      qExp += expSum(mt);
    });
    return {label:q.label, inc:qInc, exp:qExp, saldo:qInc-qExp};
  });
  // Zobraz jen kvartály s daty nebo do aktuálního čtvrtletí
  const curQ = Math.floor(today.getMonth()/3);
  const visibleQ = qData.filter((_,i)=>i<=curQ);

  // ── Cashflow graf – 12 měsíců ──
  const cashflowMonths = 12;
  const cfSeries = [];
  for(let i=cashflowMonths-1;i>=0;i--){
    let m=today.getMonth()-i, y=today.getFullYear(); while(m<0){m+=12;y--;}
    const mt = getTx(m,y,D);
    cfSeries.push({label:CZ_M[m].slice(0,3), m, y, inc:incSum(mt), exp:expSum(mt), cf:incSum(mt)-expSum(mt)});
  }
  const cfMax = Math.max(...cfSeries.map(s=>Math.max(s.inc,s.exp,1)));
  const cfHasData = cfSeries.some(s=>s.inc>0||s.exp>0);

  // ── Render ──
  el.innerHTML = tabIntro('radar','🎯','Finanční radar',
    'Včasné varování. Radar sleduje tvůj aktuální měsíc a předpovídá problémy dřív, než nastanou – hrozící záporné saldo, nadměrné výdaje v kategoriích, blížící se splátky nebo nízkou rezervu. Zelená = klid, oranžová/červená = něco si zaslouží pozornost. Cíl: zabránit nepříjemným překvapením na konci měsíce.')
    + `
    <!-- HLAVNÍ KARTA -->
    <div style="background:${radarBg};border:1px solid ${radarColor}44;border-radius:var(--radius);padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="font-size:2rem">🎯</div>
        <div>
          <div style="font-weight:700;font-size:1rem">Finanční radar</div>
          <div style="font-size:.76rem;color:var(--text3)">${CZ_M[S.curMonth]} ${S.curYear}${isCurrentMonth?' · '+daysLeft+' dní do konce':isPastMonth?' · uzavřený měsíc':''}</div>
        </div>
        <div style="margin-left:auto;font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:${radarColor}">
          ${radarScore==='safe'?'🟢 V pohodě':radarScore==='warn'?'🟡 Pozor':'🔴 Riziko!'}
        </div>
      </div>
      <!-- 3 metriky -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        <div class="stat-card income"><div class="stat-label">Příjmy</div><div class="stat-value up">${fmt(totalInc)} Kč</div></div>
        <div class="stat-card expense"><div class="stat-label">Výdaje${isPastMonth?'':' (zatím)'}</div><div class="stat-value down">${fmt(totalExp)} Kč</div></div>
        <div class="stat-card ${projectedSaldo>=0?'balance':'expense'}">
          <div class="stat-label">${projectedLabel}</div>
          <div class="stat-value ${projectedSaldo>=0?'up':'down'}">${fmt(projectedSaldo)} Kč</div>
          <div class="stat-sub" style="font-size:.68rem">${projectedSub}</div>
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
      <div style="margin-top:${alerts.length?'14px':'4px'}">
        <div style="font-size:.72rem;font-weight:600;color:var(--text3);margin-bottom:6px;text-transform:uppercase">💡 Tipy</div>
        ${tips.map(t=>`<div style="padding:8px 12px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);margin-bottom:6px;font-size:.8rem;display:flex;gap:8px"><span>${t.icon}</span><span style="color:var(--text2)">${t.text}</span></div>`).join('')}
      </div>`:''}
    </div>

    <!-- BUDOUCÍ PLATBY (rámeček) -->
    ${budItems.length ? `
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">🗓️ Nadcházející platby (30 dní)</span></div>
      <div class="card-body" style="padding:10px 14px">
        ${budThisMonth.length ? `
          <div style="font-size:.72rem;font-weight:600;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Tento měsíc</div>
          ${budThisMonth.slice(0,5).map(b=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:.8rem">
              <span style="display:flex;gap:6px;align-items:center"><span>${b.icon}</span><span style="color:var(--text2)">${b.name}</span><span style="font-size:.68rem;color:var(--text3)">${new Date(b.date).toLocaleDateString('cs-CZ',{day:'numeric',month:'short'})}</span></span>
              <span style="font-weight:600;color:${b.color||'var(--expense)'};">${fmt(b.amount)} Kč</span>
            </div>
          `).join('')}
          ${budThisMonth.length>5?`<div style="font-size:.72rem;color:var(--text3);text-align:right;margin-top:4px">+${budThisMonth.length-5} dalších · celkem ${fmt(budThisTotal)} Kč</div>`:`<div style="font-size:.72rem;color:var(--text3);text-align:right;margin-top:4px">Celkem: ${fmt(budThisTotal)} Kč</div>`}
        `:''}
        ${budNextMonth.length ? `
          <div style="font-size:.72rem;font-weight:600;color:var(--text3);text-transform:uppercase;margin:${budThisMonth.length?'12px':'0'} 0 6px">Příští měsíc</div>
          ${budNextMonth.slice(0,4).map(b=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:.8rem">
              <span style="display:flex;gap:6px;align-items:center"><span>${b.icon}</span><span style="color:var(--text2)">${b.name}</span></span>
              <span style="font-weight:600;color:var(--debt)">${fmt(b.amount)} Kč</span>
            </div>
          `).join('')}
          ${budNextMonth.length>4?`<div style="font-size:.72rem;color:var(--text3);text-align:right;margin-top:4px">+${budNextMonth.length-4} dalších · celkem ${fmt(budNextTotal)} Kč</div>`:`<div style="font-size:.72rem;color:var(--text3);text-align:right;margin-top:4px">Celkem: ${fmt(budNextTotal)} Kč</div>`}
        `:''}
      </div>
    </div>` : ''}

    <!-- CASHFLOW GRAF – 12 měsíců -->
    ${cfHasData ? `
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">📈 Cashflow – posledních 12 měsíců</span></div>
      <div class="card-body">
        <div style="display:flex;gap:16px;margin-bottom:10px;font-size:.72rem;color:var(--text3)">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--income);display:inline-block"></span>Příjmy</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--expense);display:inline-block"></span>Výdaje</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--bank);display:inline-block"></span>Cashflow</span>
        </div>
        <div style="display:flex;align-items:flex-end;gap:3px;height:100px;overflow-x:auto;padding-bottom:4px">
          ${cfSeries.map(s=>{
            const iH = Math.round(s.inc/cfMax*90);
            const eH = Math.round(s.exp/cfMax*90);
            const cfColor = s.cf>=0?'var(--income)':'var(--expense)';
            const isSelected = s.m===S.curMonth&&s.y===S.curYear;
            return `<div style="flex:1;min-width:28px;display:flex;flex-direction:column;align-items:center;gap:2px">
              <div style="width:100%;display:flex;gap:1px;align-items:flex-end;height:90px">
                <div style="flex:1;background:var(--income);opacity:.7;height:${iH}px;border-radius:2px 2px 0 0;min-height:${s.inc>0?2:0}px"></div>
                <div style="flex:1;background:var(--expense);opacity:.7;height:${eH}px;border-radius:2px 2px 0 0;min-height:${s.exp>0?2:0}px"></div>
              </div>
              <div style="font-size:.55rem;color:${isSelected?'var(--income)':'var(--text3)'};font-weight:${isSelected?'700':'400'};white-space:nowrap">${s.label}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
          ${cfSeries.filter(s=>s.inc>0||s.exp>0).slice(-3).map(s=>`
            <div style="font-size:.72rem;color:var(--text3)">
              ${s.label}: <span style="color:${s.cf>=0?'var(--income)':'var(--expense)'};font-weight:600">${s.cf>=0?'+':''}${fmt(s.cf)} Kč</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>` : ''}

    <!-- TREND VÝDAJŮ 3 měsíce -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">📊 Trend výdajů – 3 měsíce</span></div>
      <div class="card-body">
        ${expTrends.map((s,i)=>{
          const pct = Math.max(...expTrends.map(x=>x.v))>0?Math.round(s.v/Math.max(...expTrends.map(x=>x.v))*100):0;
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:4px">
              <span style="font-weight:600">${CZ_M[s.m]} ${s.y}</span>
              <span style="color:var(--expense)">${fmt(s.v)} Kč</span>
            </div>
            <div class="trap-bar"><div class="trap-bar-fill" style="width:${pct}%;background:${i===2&&expTrend>10?'var(--expense)':'var(--bank)'}"></div></div>
          </div>`;
        }).join('')}
        ${expTrend!==0?`<div style="font-size:.76rem;color:${expTrend>10?'var(--expense)':expTrend>0?'var(--debt)':'var(--income)'};text-align:right;margin-top:4px">
          Trend: ${expTrend>0?'↑':'↓'} ${Math.abs(expTrend)}% za 3 měsíce
        </div>`:''}
      </div>
    </div>

    <!-- KVARTÁLNÍ PŘEHLED -->
    <div class="card">
      <div class="card-header"><span class="card-title">📅 Kvartální přehled – ${S.curYear}</span></div>
      <div class="card-body" style="padding:0">
        <div style="display:grid;grid-template-columns:48px 1fr 1fr 1fr;font-size:.66rem;font-weight:700;color:var(--text3);text-transform:uppercase;padding:8px 12px;background:var(--surface3)">
          <span></span><span style="text-align:right">Příjmy</span><span style="text-align:right">Výdaje</span><span style="text-align:right">Saldo</span>
        </div>
        ${visibleQ.map((q,i)=>{
          const isCurQ = i === curQ;
          return `<div style="display:grid;grid-template-columns:48px 1fr 1fr 1fr;padding:9px 12px;border-bottom:1px solid var(--border);font-size:.78rem;${isCurQ?'font-weight:600;background:var(--surface2)':''}">
            <span style="color:${isCurQ?'var(--income)':'var(--text3)'};font-weight:700">${q.label}</span>
            <span style="text-align:right;color:${q.inc>0?'var(--income)':'var(--text3)'}">${q.inc>0?fmt(q.inc):'–'}</span>
            <span style="text-align:right;color:${q.exp>0?'var(--expense)':'var(--text3)'}">${q.exp>0?fmt(q.exp):'–'}</span>
            <span style="text-align:right;color:${q.saldo>=0?'var(--income)':'var(--expense)'}">${q.inc>0||q.exp>0?(q.saldo>=0?'+':'')+fmt(q.saldo):'–'}</span>
          </div>`;
        }).join('')}
        ${visibleQ.length>0?`
        <div style="display:grid;grid-template-columns:48px 1fr 1fr 1fr;padding:9px 12px;font-size:.78rem;font-weight:700">
          <span style="color:var(--text3)">YTD</span>
          <span style="text-align:right;color:var(--income)">${fmt(visibleQ.reduce((a,q)=>a+q.inc,0))}</span>
          <span style="text-align:right;color:var(--expense)">${fmt(visibleQ.reduce((a,q)=>a+q.exp,0))}</span>
          <span style="text-align:right;color:${visibleQ.reduce((a,q)=>a+q.saldo,0)>=0?'var(--income)':'var(--expense)'}">${visibleQ.reduce((a,q)=>a+q.saldo,0)>=0?'+':''}${fmt(visibleQ.reduce((a,q)=>a+q.saldo,0))}</span>
        </div>`:``}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  FINANČNÍ OBRAZ – Zlepšuji se?
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  POKROČILÉ FINANČNÍ METRIKY – Session 10 (TODO-088–092)
// ══════════════════════════════════════════════════════

// TODO-088 · Financial Freedom Ratio (FFR)
// FFR = (Pasivní příjem / Měsíční výdaje) × 100
// Pasivní příjem = příjmové kategorie s incomeChar==='passive'
function computeFFR(D, m, y) {
  D = D || getData(); m = m ?? S.curMonth; y = y ?? S.curYear;
  const passiveCats = (D.categories||[]).filter(c =>
    (c.type==='income'||c.type==='both') && c.incomeChar==='passive');
  const passiveInc = passiveCats.reduce((s,c)=>s+getActual(c.id,null,m,y,D),0);
  const exp = expSum(getTx(m,y,D));
  const ratio = exp > 0 ? Math.round(passiveInc/exp*100) : null;
  let stage, color;
  if (ratio === null)       { stage='Bez dat'; color='var(--text3)'; }
  else if (ratio >= 100)    { stage='Finanční nezávislost 🎉'; color='var(--income)'; }
  else if (ratio >= 75)     { stage='Téměř svobodný'; color='var(--income)'; }
  else if (ratio >= 25)     { stage='Částečná svoboda'; color='var(--debt)'; }
  else                      { stage='Závislost na práci'; color='var(--expense)'; }
  return { ratio, passiveInc, exp, stage, color, hasPassive: passiveCats.length>0 };
}

// TODO-089 · Inflace životního stylu
// Porovná růst příjmů vs růst výdajů mezi prvním a posledním měsícem okna.
// Pokud výdaje rostou rychleji než příjmy → lifestyle inflation.
function computeLifestyleInflation(series) {
  const withData = series.filter(s => s.inc > 0 || s.exp > 0);
  if (withData.length < 2) return { detected:false, incG:null, expG:null };
  const f = withData[0], l = withData[withData.length-1];
  const incG = f.inc > 0 ? Math.round((l.inc - f.inc)/f.inc*100) : null;
  const expG = f.exp > 0 ? Math.round((l.exp - f.exp)/f.exp*100) : null;
  // detekce: výdaje rostou a rostou rychleji než příjmy (s tolerancí 3 p.b.)
  const detected = expG !== null && incG !== null && expG > 0 && (expG - incG) >= 3;
  return { detected, incG, expG };
}

// TODO-091 · Income Diversification Score (0–100)
// Více příjmových zdrojů s vyrovnanějšími váhami = stabilita.
// Použije inverzní Herfindahl index (HHI) přes příjmové kategorie s daty.
function computeIncomeDiversification(D, m, y) {
  D = D || getData(); m = m ?? S.curMonth; y = y ?? S.curYear;
  const incCats = (D.categories||[]).filter(c => c.type==='income'||c.type==='both');
  const sources = incCats.map(c => ({ name:c.name, icon:c.icon, color:c.color,
    val: getActual(c.id,null,m,y,D) })).filter(s => s.val > 0);
  const total = sources.reduce((s,x)=>s+x.val,0);
  if (!sources.length || total <= 0) return { score:0, count:0, sources:[], topShare:0 };
  // HHI = Σ(podíl²); diverzifikace = (1 - HHI) normalizováno
  const hhi = sources.reduce((s,x)=>{ const sh=x.val/total; return s+sh*sh; },0);
  // Pro n stejně velkých zdrojů je HHI=1/n; skóre 0 (1 zdroj) až ~100 (mnoho rovnoměrných)
  const score = Math.round((1 - hhi) / (1 - 1/Math.max(sources.length,1) || 1) * 100) || 0;
  const topShare = Math.round(Math.max(...sources.map(s=>s.val))/total*100);
  return {
    score: Math.max(0, Math.min(100, sources.length===1?0:score)),
    count: sources.length,
    sources: sources.sort((a,b)=>b.val-a.val),
    topShare, total
  };
}

// TODO-092 · Wealth Momentum
// Průměrný měsíční přírůstek čistého jmění. Aproximace: net worth nyní vs.
// odhad před N měsíci (současná aktiva/peněženky − dluhy mínus kumulované saldo).
// Jednoduchá varianta: průměrné měsíční saldo za okno × proxy.
function computeWealthMomentum(D, series) {
  D = D || getData();
  const nw = typeof computeAssetsNetWorth === 'function' ? computeAssetsNetWorth(D) : null;
  const withData = series.filter(s => s.inc > 0 || s.exp > 0);
  if (!withData.length) return { perMonth:0, netWorth: nw?nw.netWorth:null, months:0 };
  const avgSaldo = Math.round(withData.reduce((s,x)=>s+x.savings,0)/withData.length);
  return { perMonth: avgSaldo, netWorth: nw?nw.netWorth:null, months: withData.length };
}

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

  // Trendy – FIX-077: Použij první měsíc S DATY jako baseline, ne nutně první v sérii
  // Pokud Listopad a Prosinec mají 0 transakcí (no data), trend se počítá ze Ledna
  const seriesWithData = series.filter(s => s.inc > 0 || s.exp > 0);
  const first = seriesWithData.length >= 2 ? seriesWithData[0] : series[0];
  const last = series[series.length-1];

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

  // Session 10: pokročilé metriky (TODO-088, 089, 091, 092)
  const ffr = computeFFR(D);
  const lifestyle = computeLifestyleInflation(series);
  const diversification = computeIncomeDiversification(D);
  const momentum = computeWealthMomentum(D, series);

  // ── HTML pokročilých metrik ──
  const ffrBarW = ffr.ratio !== null ? Math.min(100, ffr.ratio) : 0;
  const ffrCard = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-body" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
          <span style="font-size:.82rem;font-weight:700">🏖️ Financial Freedom Ratio</span>
          <span style="font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800;color:${ffr.color}">${ffr.ratio!==null?ffr.ratio+'%':'–'}</span>
        </div>
        <div style="height:10px;background:var(--surface3);border-radius:6px;overflow:hidden;position:relative">
          <div style="height:100%;width:${ffrBarW}%;background:${ffr.color};border-radius:6px;transition:width .5s"></div>
          <div style="position:absolute;top:0;left:100%;transform:translateX(-100%);width:2px;height:100%;background:var(--text3);opacity:.5"></div>
        </div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:5px">${ffr.stage} · pasivní příjem ${fmt(ffr.passiveInc)} Kč / výdaje ${fmt(ffr.exp)} Kč</div>
        ${!ffr.hasPassive?`<div style="font-size:.68rem;color:var(--text3);margin-top:4px;padding:6px 8px;background:var(--surface3);border-radius:7px">💡 Označ příjmové kategorie jako „🌱 Pasivní" (dividendy, nájem, úroky) v nastavení kategorie pro výpočet FFR.</div>`:''}
      </div>
    </div>`;

  const lifestyleCard = lifestyle.detected ? `
    <div class="card" style="margin-bottom:12px;border-color:rgba(248,113,113,.35)">
      <div class="card-body" style="padding:14px">
        <div style="font-size:.82rem;font-weight:700;color:var(--expense);margin-bottom:4px">⚠️ Inflace životního stylu</div>
        <div style="font-size:.76rem;color:var(--text2);line-height:1.5">Tvé výdaje rostou rychleji než příjmy: příjmy ${lifestyle.incG>=0?'+':''}${lifestyle.incG}% vs výdaje ${lifestyle.expG>=0?'+':''}${lifestyle.expG}% za sledované období. Část navýšeného příjmu raději odkládej, ať růst životního stylu nesní celý nárůst.</div>
      </div>
    </div>` : (lifestyle.incG!==null ? `
    <div class="card" style="margin-bottom:12px;border-color:rgba(74,222,128,.25)">
      <div class="card-body" style="padding:14px">
        <div style="font-size:.82rem;font-weight:700;color:var(--income);margin-bottom:4px">✅ Životní styl pod kontrolou</div>
        <div style="font-size:.76rem;color:var(--text2)">Příjmy ${lifestyle.incG>=0?'+':''}${lifestyle.incG}% · výdaje ${lifestyle.expG>=0?'+':''}${lifestyle.expG}%. Výdaje nerostou rychleji než příjmy.</div>
      </div>
    </div>` : '');

  const divBars = diversification.sources.slice(0,5).map(s=>{
    const pct = Math.round(s.val/diversification.total*100);
    return `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:2px">
        <span>${s.icon||'💵'} ${s.name}</span><span style="color:var(--text3)">${pct}%</span>
      </div>
      <div style="height:6px;background:var(--surface3);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${s.color||'#34d399'};border-radius:4px"></div>
      </div>
    </div>`;
  }).join('');
  const divColor = diversification.score>=60?'var(--income)':diversification.score>=30?'var(--debt)':'var(--expense)';
  const diversCard = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-body" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
          <span style="font-size:.82rem;font-weight:700">🧩 Diverzifikace příjmů</span>
          <span style="font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800;color:${divColor}">${diversification.score}<span style="font-size:.7rem;color:var(--text3)">/100</span></span>
        </div>
        ${diversification.count?`<div style="font-size:.72rem;color:var(--text3);margin-bottom:8px">${diversification.count} ${diversification.count===1?'zdroj příjmu':diversification.count<5?'zdroje příjmu':'zdrojů příjmu'} · největší tvoří ${diversification.topShare}%${diversification.count===1?' ⚠️ vysoké riziko':''}</div>${divBars}`:'<div style="font-size:.74rem;color:var(--text3)">Žádné příjmy tento měsíc</div>'}
      </div>
    </div>`;

  const momColor = momentum.perMonth>=0?'var(--income)':'var(--expense)';
  const momentumCard = `
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span style="font-size:.82rem;font-weight:700">🚀 Wealth Momentum</span>
          <span style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:${momColor}">${momentum.perMonth>=0?'+':''}${fmt(momentum.perMonth)} Kč/měs</span>
        </div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:4px">Průměrný měsíční přírůstek jmění za ${momentum.months} ${momentum.months===1?'měsíc':momentum.months<5?'měsíce':'měsíců'}${momentum.netWorth!==null?` · čisté jmění ${fmt(momentum.netWorth)} Kč`:''}</div>
      </div>
    </div>`;

  el.innerHTML=tabIntro('obraz','🖼️','Finanční obraz',
    'Dlouhodobý pohled na celkové směřování. Zatímco report řeší jednotlivé měsíce, obraz ukazuje trendy za 6 měsíců a pokročilé metriky: Financial Freedom Ratio (jak blízko jsi finanční nezávislosti), inflaci životního stylu, diverzifikaci příjmů a Wealth Momentum. Slouží ke strategickému rozhodování – kam tvé finance dlouhodobě míří.')
    + `
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

    <!-- Session 10: Pokročilé finanční metriky (TODO-088/089/091/092) -->
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:10px">📐 Pokročilé metriky</div>
    ${ffrCard}
    ${lifestyleCard}
    ${diversCard}
    ${momentumCard}

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
  // FIX-059 (TODO-074, Session 8): Přepsáno – původní logika:
  //   1) Sčítala transakce za 3 měsíce ale labelovala "Kč/měs" → 3× nadhodnocení
  //   2) Vytvářela 2 záznamy pro 1 transakci kvůli překrývajícím se klíčovým slovům (patreon vs membership)
  //   3) Úspora 40 % byla optimistická
  // Nová logika (per Milan, Session 8):
  //   • Hledá JEN v AKTUÁLNÍM MĚSÍCI (label "Kč/měs" je pravdivý)
  //   • 1 transakce = 1 nález (uživatel si transakce sám rozlišuje názvem/tagy/poznámkou)
  //   • Žádné slučování stejnojmenných transakcí (3× Patreon Membership = 3 různé patreony)
  //   • Každá transakce má MAX 1 klíčové slovo (nejdelší match)
  //   • Datum v labelu pro disambiguaci (15.4. vs 28.4.)
  //   • Úspora 25 % (realističtější odhad)
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
    // FIX-059: 'membership', 'členství', 'předplatné' a 'google' jsou PŘÍLIŠ ŠIROKÉ
    // a falešně matchují legitimní transakce. Odstraněno.
  ];

  // FIX-059: Seřaď klíčová slova od nejdelšího (specifičtějšího) po nejkratší
  // → "google one" se vyhodnotí dříve než "google", "youtube premium" před "youtube"
  const sortedKeywords = [...baseSubKeywords].sort((a,b) => b.kw.length - a.kw.length);

  // FIX-059: Per-transaction matching pouze v AKTUÁLNÍM MĚSÍCI.
  // Každá transakce = 1 nález. Uživatel si transakce rozliší tím že je pojmenuje
  // (tagy/podkategorie/poznámka). 3× "Patreon* Membership" v měsíci = 3 různé patreony.
  // Datum v labelu pomáhá disambiguovat.
  const fmtDay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.getDate() + '.' + (d.getMonth()+1) + '.';
  };

  subTxs.forEach(t => {
    const name = (t.name||'').toLowerCase();
    const amt = t.amount || t.amt || 0;
    if (amt <= 0) return;
    // FIX-059 v3: Skip pouze 0 Kč (nula) — žádná jiná hranice.
    // Uživatel chce vidět i předplatná < 50 Kč (např. Google One 39 Kč).
    if (amt <= 0) return;

    // Najdi nejdelší klíčové slovo (díky sortedKeywords je první v poli)
    let matched = null;
    for (const sub of sortedKeywords) {
      if (name.includes(sub.kw)) {
        matched = sub;
        break;
      }
    }
    if (!matched) return;

    // FIX-059 DEBUG (v6.59): Log do konzole pro ověření že čteme správné transakce
    console.log('[Detektor] Match:', {
      name: t.name,
      amount: amt,
      date: t.date,
      month: S.curMonth + 1,
      year: S.curYear,
      keyword: matched.kw,
      txId: t.id,
    });

    // Sestav label – přidej datum pokud existuje, případně podkategorii/tag
    const day = fmtDay(t.date);
    const subcat = t.subcat || '';
    const tags = (t.tags||[]).length ? ' #' + t.tags.slice(0,2).join(' #') : '';
    const detailParts = [day, subcat, tags].filter(Boolean);
    const detail = detailParts.length ? ` (${detailParts.join(' · ')})` : '';

    const saving = Math.round(amt * 0.25);
    suggestions.push({
      category: '📺 Předplatné',
      item: t.name + detail,
      current: `${fmt(amt)} Kč/měs`,
      saving,
      tip: matched.tip,
      severity: 'low',
    });
    totalSavable += saving;
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
  // Session 10 FIX: PŮVODNĚ volalo generateSchedule(d) 2× na každý drahý dluh.
  // generateSchedule má strop 7200 období (600 let) a vytváří pole + Date objekty
  // v každém kroku. U velkého dluhu (např. -4,8 mil.) s nízkou splátkou běžela
  // smyčka do stropu a vytvořila dvě 7200-prvková pole → prohlížeč ZAMRZL při
  // otevření Detektoru. OPRAVA: lehký odhad celkového úroku bez generování
  // kalendáře, s tvrdým stropem MAX_PERIODS a bezpečným fallbackem.
  const estimateTotalInterest = (principal, annualRatePct, payment, periodsPerYear) => {
    const ratePerPeriod = annualRatePct/100/periodsPerYear;
    let remaining = principal, totalInterest = 0;
    const MAX_PERIODS = periodsPerYear * 50; // tvrdý strop 50 let
    // Pokud splátka nepokryje ani úrok prvního období → kalendář by byl nekonečný.
    // Vrať null = nelze rozumně spočítat (přeskočíme návrh refinancování).
    if (payment <= remaining * ratePerPeriod) return null;
    let n = 0;
    while (remaining > 0.5 && n < MAX_PERIODS) {
      const interest = remaining * ratePerPeriod;
      const principalPart = Math.min(payment - interest, remaining);
      if (principalPart <= 0) break;
      totalInterest += interest;
      remaining -= principalPart;
      n++;
    }
    return { totalInterest, periods: n };
  };

  const expensiveDebts = (D.debts||[]).filter(d=>d.interest>10);
  expensiveDebts.forEach(d=>{
    const principal = d.remaining || d.total || 0;
    if (principal <= 0) return;
    const freq = d.freq || 'monthly';
    const periodsPerYear = freq === 'weekly' ? 52 : freq === 'biweekly' ? 26 : 12;
    const payment = d.payment || calcAnnuity(principal, d.interest, periodsPerYear, 24);
    if (!payment || payment <= 0) return;

    const betterRate = Math.max(5, d.interest*0.65);
    const orig = estimateTotalInterest(principal, d.interest, payment, periodsPerYear);
    const better = estimateTotalInterest(principal, betterRate, payment, periodsPerYear);
    if (!orig || !better) return; // splátka nepokrývá úrok → nelze spočítat

    const saved = Math.round(orig.totalInterest - better.totalInterest);
    if(saved>10000) {
      const perPeriodSaving = orig.periods > 0 ? Math.round(saved/orig.periods) : 0;
      suggestions.push({
        category:'💳 Refinancování',
        item:d.name,
        current:`${d.interest}% p.a. – přeplatíte ${fmt(Math.round(orig.totalInterest))} Kč`,
        saving: perPeriodSaving,
        tip:`Refinancováním na ~${Math.round(betterRate*10)/10}% ušetříte ${fmt(saved)} Kč celkem`,
        severity:'high'
      });
      totalSavable += perPeriodSaving;
    }
  });

  // ── A) ZBYTEČNÉ UTRÁCENÍ – malé časté transakce (TODO-087) ──
  // Detekce opakujících se malých plateb (café, fast food, trafika…)
  const smallExpMap = {};
  subTxs.forEach(t => {
    const amt = t.amount || t.amt || 0;
    if(amt <= 0 || amt > 300) return; // max 300 Kč = "malá platba"
    const key = (t.name||'').toLowerCase().trim().slice(0,25);
    if(!key || key.length < 3) return;
    if(!smallExpMap[key]) smallExpMap[key] = {name:t.name, count:0, total:0};
    smallExpMap[key].count++;
    smallExpMap[key].total += amt;
  });
  const wastedItems = Object.values(smallExpMap).filter(v => v.count >= 4); // 4+ za měsíc
  if(wastedItems.length > 0) {
    wastedItems.sort((a,b) => b.total - a.total).slice(0,3).forEach(item => {
      const saving = Math.round(item.total * 0.5);
      suggestions.push({
        category: '☕ Zbytečné utrácení',
        item: `${item.name} (${item.count}× v měsíci)`,
        current: `${fmt(Math.round(item.total))} Kč/měs`,
        saving,
        tip: `Platíte průměrně ${fmt(Math.round(item.total/item.count))} Kč za platbu, ${item.count}× v měsíci. Zkuste nastavit limit nebo alternativu.`,
        severity: 'mid',
      });
      totalSavable += saving;
    });
  }

  // ── B) VÝPLATA EFEKT – výdaje v prvním týdnu (TODO-087) ──
  // Detekuj zda většina výdajů padne do 7 dní po výplatě
  const today2 = new Date();
  const incTxsSorted = txs.filter(t=>t.type==='income').sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const paydayTx = incTxsSorted[0]; // první příjem = výplata
  if(paydayTx?.date) {
    const payday = new Date(paydayTx.date);
    const week1End = new Date(payday); week1End.setDate(week1End.getDate()+7);
    const expAll = subTxs.filter(t=>(t.amount||t.amt||0)>0);
    const totalExpAll = expAll.reduce((a,t)=>a+(t.amount||t.amt||0),0);
    const expWeek1 = expAll.filter(t=>{
      const d = new Date(t.date||'');
      return d >= payday && d <= week1End;
    }).reduce((a,t)=>a+(t.amount||t.amt||0),0);
    const week1Pct = totalExpAll>0 ? Math.round(expWeek1/totalExpAll*100) : 0;
    if(week1Pct >= 60 && expWeek1 > 3000) {
      suggestions.push({
        category: '📅 Výplata efekt',
        item: `${week1Pct} % výdajů v prvním týdnu`,
        current: `${fmt(Math.round(expWeek1))} Kč / 7 dní`,
        saving: Math.round(expWeek1 * 0.2),
        tip: `${week1Pct} % měsíčních výdajů utratíte do 7 dní po výplatě. Zkuste metodu obálky – rozdělte si peníze na týdny hned po výplatě.`,
        severity: week1Pct >= 75 ? 'high' : 'mid',
      });
      totalSavable += Math.round(expWeek1 * 0.2);
    }
  }

  // ── C) JÍDLO VENKU – denní výdaj za restaurace/kavárny (TODO-087) ──
  const foodOutKeywords = ['restaurace','hospoda','pizza','kavárna','café','cafe','bistro',
    'kebab','burger','mcdonald','kfc','subway','starbucks','costa','nordsee','sushi',
    'bar ','hostinec','bufet','jídelna','fast food','fastfood','lunch','snack'];
  const foodOutTxs = subTxs.filter(t => {
    const n=(t.name||'').toLowerCase();
    return foodOutKeywords.some(kw=>n.includes(kw));
  });
  const foodOutTotal = foodOutTxs.reduce((a,t)=>a+(t.amount||t.amt||0),0);
  const foodOutCount = foodOutTxs.length;
  const daysInCurMonth = new Date(S.curYear, S.curMonth+1, 0).getDate();
  const isCurrentMon = (S.curMonth === new Date().getMonth() && S.curYear === new Date().getFullYear());
  const daysElapsedCur = isCurrentMon ? new Date().getDate() : daysInCurMonth;
  const dailyFoodOut = daysElapsedCur > 0 ? Math.round(foodOutTotal / daysElapsedCur) : 0;
  if(foodOutTotal > 500 && foodOutCount >= 3) {
    const monthlyEstimate = Math.round(foodOutTotal / daysElapsedCur * daysInCurMonth);
    suggestions.push({
      category: '🍽️ Jídlo venku',
      item: `${foodOutCount}× restaurace/kavárna`,
      current: `${fmt(Math.round(foodOutTotal))} Kč (${dailyFoodOut} Kč/den)`,
      saving: Math.round(monthlyEstimate * 0.3),
      tip: `Průměrně ${dailyFoodOut} Kč/den za jídlo venku. Odhad na celý měsíc: ${fmt(monthlyEstimate)} Kč. Vaření doma nebo příprava jídla ušetří 30–50 %.`,
      severity: dailyFoodOut > 200 ? 'high' : 'mid',
    });
    totalSavable += Math.round(monthlyEstimate * 0.3);
  }

  // ── D) ZDRAŽENÍ – propojení s itemStats z Analýzy účtenek (TODO-087) ──
  // Načte itemStats z S.receipts a detekuje položky zdražené >10 % vs. 3 měsíce zpět
  const priceAlerts = [];
  const allItems3M = [];
  for(let i=0;i<3;i++){
    let m=S.curMonth-i, y=S.curYear; while(m<0){m+=12;y--;}
    (S.receipts||[]).filter(r=>{
      const rd=r.date||''; return rd.startsWith(`${y}-${String(m+1).padStart(2,'0')}`);
    }).forEach(r=>(r.items||[]).forEach(it=>allItems3M.push({...it, month:m, year:y})));
  }
  // Seskup dle normalized názvu → porovnej cenu letos vs 3M zpět
  const priceByItem3M = {};
  allItems3M.forEach(it=>{
    const k=(it.name||'').toLowerCase().trim().slice(0,25).replace(/\s+/g,'_');
    if(!k||k.length<3||(it.price||0)<=0) return;
    if(!priceByItem3M[k]) priceByItem3M[k]={name:it.name,prices:[]};
    priceByItem3M[k].prices.push({price:it.price, month:it.month, year:it.year});
  });
  Object.values(priceByItem3M).forEach(item=>{
    if(item.prices.length < 2) return;
    const sorted = item.prices.sort((a,b)=>a.year!==b.year?a.year-b.year:a.month-b.month);
    const oldest = sorted[0].price;
    const newest = sorted[sorted.length-1].price;
    const changePct = oldest > 0 ? Math.round((newest-oldest)/oldest*100) : 0;
    if(changePct >= 10) { // zdražení >10 %
      priceAlerts.push({name:item.name, oldPrice:oldest, newPrice:newest, changePct});
    }
  });
  if(priceAlerts.length > 0) {
    priceAlerts.sort((a,b)=>b.changePct-a.changePct).slice(0,3).forEach(pa=>{
      suggestions.push({
        category: '📈 Zdražení položek',
        item: pa.name,
        current: `${fmt(pa.oldPrice)} → ${fmt(pa.newPrice)} Kč (+${pa.changePct}%)`,
        saving: Math.round((pa.newPrice - pa.oldPrice) * 4), // ~4 nákupy za měsíc
        tip: `Cena se za 3 měsíce zvýšila o ${pa.changePct}%. Zkuste srovnat u jiného obchodu nebo zvolit alternativu. Detaily v Analýza účtenek → Zdražování.`,
        severity: pa.changePct >= 20 ? 'high' : 'mid',
      });
      totalSavable += Math.round((pa.newPrice - pa.oldPrice) * 4);
    });
  }

  // Přidej nové kategorie do barevné logiky a analyzesList
  const analyzesList = [
    {icon:'📺', label:'Předplatná', desc:'Netflix, Spotify, Apple, HBO a další'},
    {icon:'🏦', label:'Bankovní poplatky', desc:'Poplatky za vedení účtu'},
    {icon:'🛡️', label:'Pojištění', desc:'Pojistné smlouvy – srovnání'},
    {icon:'📱', label:'Telefon & Internet', desc:'Mobilní tarify a internet'},
    {icon:'🏷️', label:'Limity kategorií', desc:'Výdaje přes nastavený limit'},
    {icon:'💳', label:'Drahé půjčky', desc:'Půjčky vhodné k refinancování'},
    {icon:'☕', label:'Zbytečné utrácení', desc:'Malé časté platby (4× za měsíc)'},
    {icon:'📅', label:'Výplata efekt', desc:'60 %+ výdajů v 1. týdnu po výplatě'},
    {icon:'🍽️', label:'Jídlo venku', desc:'Denní výdaj za restaurace a kavárny'},
    {icon:'📈', label:'Zdražení položek', desc:'Propojeno s Analýzou účtenek'},
  ];

  el.innerHTML=tabIntro('detektor','💡','Detektor úspor',
    'Hledač zbytečných výdajů. Detektor projde tvé transakce a najde místa, kde se dá ušetřit – opakovaná předplatná, nadprůměrné výdaje v kategoriích, drahé půjčky vhodné k refinancování nebo zdražování položek. U každého návrhu vidíš odhadovanou úsporu. Cíl: konkrétní tipy, jak snížit výdaje bez velké oběti.')
    + `
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
          Pro detailní přehled zdražení položek navštivte <span style="color:var(--bank);cursor:pointer;text-decoration:underline" onclick="showPage('uctenky',null);switchUctenkyTab('zdrazeni',null)">Analýza účtenek → Zdražování</span>.
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
    ${(() => {
      // FIX-066 (Session 8): Barevné rozlišení kategorií podle typu
      const catColor = (cat) => {
        if (cat.includes('Předplatné')) return '#a78bfa';
        if (cat.includes('Pojištění')) return '#60a5fa';
        if (cat.includes('Bankovní')) return '#fbbf24';
        if (cat.includes('Telefon')) return '#34d399';
        if (cat.includes('Refinancování')) return '#f87171';
        if (cat.includes('Zbytečné')) return '#fb923c';
        if (cat.includes('Výplata')) return '#e879f9';
        if (cat.includes('Jídlo')) return '#f97316';
        if (cat.includes('Zdražení')) return '#ef4444';
        return '#94a3b8';
      };
      const sevLabel = s => s==='high'?'🔴 Vysoká':s==='mid'?'🟡 Střední':'🟢 Nízká';
      return suggestions.sort((a,b)=>b.saving-a.saving).map(s=>{
        const col = catColor(s.category);
        return `
      <div style="background:var(--surface);border:1px solid var(--border);border-left:4px solid ${col};border-radius:12px;padding:14px 16px;margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div style="min-width:0;flex:1">
            <div style="display:inline-block;font-size:.7rem;color:${col};font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 8px;background:${col}22;border-radius:5px;margin-bottom:6px">${s.category}</div>
            <div style="font-weight:700;font-size:1rem;color:var(--text);line-height:1.3">${s.item}</div>
            <div style="font-size:.7rem;color:var(--text3);margin-top:4px">💡 možná úspora: <strong style="color:var(--income)">−${fmt(s.saving)} Kč/měs</strong> · ${sevLabel(s.severity)} priorita</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800;color:var(--expense);line-height:1.1">${s.current}</div>
            <div style="font-size:.66rem;color:var(--text3);margin-top:2px;letter-spacing:.04em;text-transform:uppercase">aktuálně utrácíš</div>
          </div>
        </div>
        <div style="margin-top:8px;padding:7px 10px;background:var(--surface2);border-radius:8px;font-size:.76rem;color:var(--text2)">
          💡 ${s.tip}
        </div>
      </div>`;
      }).join('');
    })()}`}`;
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
