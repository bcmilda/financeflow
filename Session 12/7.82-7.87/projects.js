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
    <button id="tabIntroBtn_${key}" onclick="tabIntroToggle('${key}')" style="border:none;background:var(--surface2);color:var(--text2);font-size:.72rem;font-weight:600;padding:5px 12px;border-radius:8px;cursor:pointer">${hidden?'ⓘ Co to je?':'✕ skrýt'}</button>
    <div id="tabIntro_${key}" style="display:${hidden?'none':'block'};margin-top:8px;background:linear-gradient(135deg,var(--surface2),var(--surface));border:1px solid var(--border2);border-radius:11px;padding:13px 15px">
      <div style="font-size:.92rem;font-weight:800;margin-bottom:5px;color:var(--text)">${icon} ${title}</div>
      <div style="font-size:.8rem;color:var(--text2);line-height:1.65">${text}</div>
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
  const quick = ['1M','3M','6M','12M'];
  const labels  = {'1M':'Měsíc','3M':'3 měs.','6M':'6 měs.','12M':'12 měs.'};
  const curN = periodToMonths(_reportPeriod);
  const isCustom = !['1M','3M','6M','12M'].includes(_reportPeriod);
  const tabBar = tabIntro('report','📊','Měsíční report',
    'Komplexní pohled na tvé finance za zvolené období. Uvidíš příjmy, výdaje a saldo, zdraví jednotlivých kategorií (kolik utrácíš vs. limity), celkové finanční skóre a jeho vývoj v čase. Záložka <strong>Poradce</strong> přidává AI doporučení na míru. Slouží k tomu, abys rychle poznal, kde peníze utíkají a jestli se tvá situace zlepšuje.')
    + `<div style="display:flex;gap:3px;margin-bottom:8px;background:var(--surface2);border-radius:12px;padding:4px;border:1px solid var(--border);overflow-x:auto">
    ${quick.map(p=>`<button onclick="reportSetPeriod('${p}')"
      style="flex:1;padding:8px 4px;border:none;border-radius:9px;font-size:.74rem;font-weight:${_reportPeriod===p?700:500};cursor:pointer;transition:all .15s;white-space:nowrap;
        background:${_reportPeriod===p?'var(--surface)':'transparent'};
        color:${_reportPeriod===p?'var(--text)':'var(--text2)'};
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
    <span style="min-width:54px;text-align:center;font-weight:700;color:${isCustom?'var(--bank)':'var(--text)'}">${curN+' měs.'}</span>
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
      // Session 10 FIX: sjednoceno – stejný výpočet jako kruhy Celkového zdraví
      // (computeHealthScores().overall). Dřív graf používal advisorMonthScore →
      // jiné číslo než kruhy/tabulka pro stejný měsíc (13 vs 25 vs 56).
      const sc = computeHealthScores(D, m, y).overall;
      months.push({ m, y, score: sc, label: CZ_M[m].slice(0,3) });
    }
    if (n === 1) {
      // Jediný měsíc – graf nedává smysl, ukaž velké číslo
      const mo = months[0];
      const col = healthColor(mo.score);
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
  // ── Session 12.1: přepínač pohledu Měsíc / Do výplaty ──
  window._radarView = window._radarView || 'mesic';
  if(window._radarView === 'payday'){ renderRadarPayday(el, D); return; }
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

  // ── PREDIKCE BUDOUCNOSTI (Session 10) ──────────────────────────────
  // Musí být PŘED alerty (alerty čtou eomLeft / pred3Total).
  // Průměrný měsíční příjem a výdaj z posledních 3 měsíců (mimo aktuální neúplný).
  const histMonths = [];
  for(let i=3;i>=1;i--){ let m=S.curMonth-i,y=S.curYear; while(m<0){m+=12;y--;} histMonths.push(getTx(m,y,D)); }
  const avgInc = histMonths.length ? Math.round(histMonths.reduce((a,t)=>a+incSum(t),0)/histMonths.length) : totalInc;
  const avgExp = histMonths.length ? Math.round(histMonths.reduce((a,t)=>a+expSum(t),0)/histMonths.length) : totalExp;
  // Konec AKTUÁLNÍHO měsíce: příjmy − (dosavadní výdaje + známé budoucí platby do konce měsíce)
  const eomDate = new Date(S.curYear, S.curMonth+1, 0);
  const budToEOM = (isCurrentMonth ? budItems : []).filter(b=>{ const d=new Date(b.date); return d<=eomDate; }).reduce((a,b)=>a+b.amount,0);
  const expectedIncMonth = isCurrentMonth ? Math.max(totalInc, avgInc) : totalInc;
  const eomLeft = Math.round(expectedIncMonth - totalExp - budToEOM);
  // Session 10: VOLNÉ PENÍZE = kolik můžu ještě utratit do konce měsíce,
  // aby zbylo na zbývající budoucí platby tohoto měsíce.
  const incForFree = expectedIncMonth;
  const budRestMonth = budToEOM; // známé budoucí platby do konce měsíce (rezerva)
  const freeToSpend = isCurrentMonth ? Math.round(incForFree - totalExp - budRestMonth) : null;
  // Predikce dalších 3 měsíců (M+1..M+3)
  // horizont pokrývající konec 3. měsíce od VYBRANÉHO měsíce (aby tabulka fungovala i při přepnutí měsíce)
  const _bud90End = new Date(S.curYear, S.curMonth+3, 0);
  const _bud90Days = Math.max(95, Math.ceil((_bud90End - new Date())/86400000)+5);
  const bud90 = typeof budouciGetAll==='function' ? budouciGetAll(D, _bud90Days) : [];
  const futureMonths = [];
  let runningBalance = eomLeft;
  for(let k=1;k<=3;k++){
    let m=S.curMonth+k, y=S.curYear; while(m>11){m-=12;y++;}
    const mBud = bud90.filter(b=>{ const d=new Date(b.date); return d.getMonth()===m && d.getFullYear()===y; }).reduce((a,b)=>a+b.amount,0);
    const predExp = Math.max(avgExp, mBud);
    const monthSaldo = avgInc - predExp;
    runningBalance += monthSaldo;
    futureMonths.push({ m, y, label:CZ_M[m].slice(0,3), inc:avgInc, exp:predExp, bud:mBud, saldo:monthSaldo, cumulative:runningBalance });
  }
  const pred3Total = futureMonths.reduce((a,f)=>a+f.saldo, 0);
  const predDirection = pred3Total >= 0 ? 'up' : 'down';

  // Predikce AKTUÁLNÍHO kvartálu: skutečné saldo dosud + odhad zbývajících měsíců kvartálu
  const curQuarter = Math.floor(S.curMonth/3);
  const qMonths = [curQuarter*3, curQuarter*3+1, curQuarter*3+2];
  let qActualSaldo = 0, qRemainingMonths = 0;
  qMonths.forEach(m => {
    if(m < S.curMonth || (m===S.curMonth)){
      const mt = getTx(m, S.curYear, D);
      qActualSaldo += incSum(mt) - expSum(mt);
    } else {
      qRemainingMonths++;
    }
  });
  // zbývající měsíce kvartálu odhadneme průměrným měsíčním saldem
  const qProjectedSaldo = Math.round(qActualSaldo + qRemainingMonths * (avgInc - avgExp));
  const qLabel = 'Q' + (curQuarter+1);

  if(!alerts.length) alerts.push({level:'safe', icon:'✅', text:'Žádná finanční rizika tento měsíc. Vše vypadá dobře!'});

  // Session 10: predikční alerty – radar nově hlídá i budoucnost (ne jen aktuální měsíc).
  if(isCurrentMonth && eomLeft < 0) {
    alerts.unshift({level:'danger', icon:'📉', text:`Do konce měsíce ti chybí ${fmt(Math.abs(eomLeft))} Kč. Příjem ${fmt(expectedIncMonth)} − výdaje ${fmt(totalExp)} − známé platby ${fmt(Math.round(budToEOM))}.`});
  }
  if(pred3Total < 0) {
    alerts.push({level:'warn', icon:'🔮', text:`Predikce: další 3 měsíce směřují k zápornému saldu ${fmt(pred3Total)} Kč (průměrný příjem ${fmt(avgInc)} vs výdaje ${fmt(avgExp)} + plánované platby).`});
  }
  // Session 10: kvartální alert – nikdo dosud nehlídal kvartál.
  if(qRemainingMonths > 0 && qProjectedSaldo < 0) {
    alerts.push({level:'warn', icon:'📅', text:`${qLabel} směřuje k zápornému saldu ${fmt(qProjectedSaldo)} Kč (dosud ${fmt(Math.round(qActualSaldo))} + odhad ${qRemainingMonths} zbývajících měs.).`});
  }

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

  // ── Cashflow graf – 3 měsíce (krátkodobý pohled) ──
  const cashflowMonths = 3;
  const cfSeries = [];
  for(let i=cashflowMonths-1;i>=0;i--){
    let m=S.curMonth-i, y=S.curYear; while(m<0){m+=12;y--;}
    const mt = getTx(m,y,D);
    cfSeries.push({label:CZ_M[m].slice(0,3), m, y, inc:incSum(mt), exp:expSum(mt), cf:incSum(mt)-expSum(mt)});
  }
  const cfMax = Math.max(...cfSeries.map(s=>Math.max(s.inc,s.exp,1)));
  const cfHasData = cfSeries.some(s=>s.inc>0||s.exp>0);

  // ── Render ──
  el.innerHTML = tabIntro('radar','🎯','Finanční radar',
    'Včasné varování + predikce. Radar sleduje aktuální měsíc (hrozící záporné saldo, nadměrné výdaje, blížící se splátky) a navíc předpovídá, kolik ti zbude na konci měsíce a kam směřuješ v příštích 3 měsících – na základě průměrů a známých budoucích plateb. Zelená = klid, oranžová/červená = pozornost.')
    + radarViewTabs('mesic')
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
      <div class="radar-stat-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
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

    <!-- DENNÍ CASHFLOW MĚSÍCE (Session 10) -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title">📊 ${CZ_M[S.curMonth]} den po dni</span>
        <span style="font-size:.7rem;color:var(--text3)">výdaje vs příjem</span>
      </div>
      <div class="card-body">
        ${isCurrentMonth && freeToSpend!=null ? `
        <div style="background:${freeToSpend>=0?'rgba(74,222,128,.08)':'var(--expense-bg)'};border:1px solid ${freeToSpend>=0?'rgba(74,222,128,.25)':'rgba(248,113,113,.3)'};border-radius:10px;padding:11px 14px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
            <span style="font-size:.8rem;color:var(--text2)">${freeToSpend>=0?'💸 Můžeš ještě volně utratit':'⚠️ Chybí na pokrytí závazků'}</span>
            <span style="font-family:Syne;font-size:1.2rem;font-weight:800;color:${freeToSpend>=0?'var(--income)':'var(--expense)'};white-space:nowrap">${fmt(Math.abs(freeToSpend))} Kč</span>
          </div>
          <div style="font-size:.66rem;color:var(--text3);margin-top:4px">Příjem ${fmt(Math.round(incForFree))} − utraceno ${fmt(totalExp)} − budoucí platby ${fmt(Math.round(budRestMonth))}${freeToSpend<0?' → na plánované platby ti nestačí příjem':''}</div>
        </div>` : ''}
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;font-size:.7rem;color:#a8aec8">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:3px;background:var(--income);display:inline-block;border-radius:2px"></span>Příjem (cíl)</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:3px;background:#e8eaf2;display:inline-block;border-radius:2px"></span>Výdaje (kumul.)</span>
          ${isCurrentMonth?`<span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:3px;background:#fb923c;display:inline-block;border-radius:2px"></span>Predikce zbytku</span>`:''}
          <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:3px;background:#fbbf24;display:inline-block;border-radius:2px"></span>Ideální tempo</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;background:var(--bank);display:inline-block;border-radius:2px"></span>Denní výdaj</span>
        </div>
        <canvas id="radarDailyChart" height="200"></canvas>
        <div style="font-size:.7rem;color:#a8aec8;margin-top:6px;line-height:1.5">Bílá čára = kolik jsi celkem utratil (kumulativně). Zelená = úroveň příjmu měsíce. Žlutá = ideální rovnoměrné tempo (příjem ÷ dny). Když je bílá nad žlutou, utrácíš rychleji než rovnoměrně. Modré sloupce = denní výdaj. Najeď myší pro detail dne.</div>
        <!-- Trend po týdnech od výplaty (Session 10) -->
        <div id="paydayWeeksBox" style="margin-top:16px"></div>
      </div>
    </div>

    <!-- PREDIKCE BUDOUCNOSTI (Session 10) -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title">📍 Kam směřuju</span>
        <span style="font-size:.7rem;color:var(--text3)">predikce z průměrů + plánovaných plateb</span>
      </div>
      <div class="card-body">
        <!-- 4 sloupce aktuálního měsíce: Příjem / Plánovaný výdej / Budoucí platby / Cashflow -->
        <div style="font-size:.72rem;font-weight:600;color:var(--text3);text-transform:uppercase;margin-bottom:10px">Tento měsíc – přehled</div>
        ${(() => {
          const income = Math.round(Math.max(totalInc, avgInc));
          const planned = Math.round(avgExp);          // plánovaný/očekávaný výdej (z průměru)
          const future = Math.round(budToEOM);          // známé budoucí platby do konce měsíce
          const cashflow = Math.round(income - Math.max(planned, totalExp + future));
          const bars=[
            {label:'Příjem', val:income, color:'#4ade80'},
            {label:'Plánovaný výdej', val:planned, color:'#fb923c'},
            {label:'Budoucí platby', val:future, color:'#a78bfa'},
            {label:'Cashflow', val:cashflow, color: cashflow>=0?'#60a5fa':'#f87171'},
          ];
          const maxAbs=Math.max(...bars.map(b=>Math.abs(b.val)),1);
          return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;align-items:end;min-height:150px">
            ${bars.map(b=>{
              const h=Math.round(Math.abs(b.val)/maxAbs*110)+4;
              return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px">
                <div style="font-family:Syne;font-size:.82rem;font-weight:800;color:${b.color}">${b.val>=0?'':'−'}${fmt(Math.abs(b.val))}</div>
                <div style="width:100%;max-width:54px;height:${h}px;background:${b.color};opacity:.85;border-radius:6px 6px 0 0"></div>
                <div style="font-size:.66rem;color:var(--text3);text-align:center;line-height:1.3">${b.label}</div>
              </div>`;
            }).join('')}
          </div>`;
        })()}
        <div style="margin-top:6px;padding:10px 12px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);font-size:.78rem;color:var(--text2)">
          ${pred3Total>=0
            ? `📈 Při zachování průměru (příjem ${fmt(avgInc)} / výdaje ${fmt(avgExp)} měsíčně) bys za 3 měsíce <strong style="color:var(--income)">našetřil ${fmt(pred3Total)} Kč</strong>.`
            : `📉 Při zachování průměru (příjem ${fmt(avgInc)} / výdaje ${fmt(avgExp)} měsíčně) by ti za 3 měsíce <strong style="color:var(--expense)">chybělo ${fmt(Math.abs(pred3Total))} Kč</strong>. Zváž úpravu výdajů nebo plánovaných plateb.`}
        </div>
        <div style="font-size:.74rem;color:var(--text2);margin-top:8px;line-height:1.6">
          ℹ️ Odhad počítá průměr příjmů/výdajů z posledních 3 měsíců a přičítá známé budoucí platby (opakující, splátky, narozeniny). Není to záruka – jen trend dle dosavadních dat.
        </div>
        <!-- Session 10: odkaz na plnou roční predikci po kategoriích (Premium stránka) -->
        <div style="margin-top:12px">
          <button class="tx-filt-btn" onclick="(typeof showPagePremium==='function'?showPagePremium:showPage)('predikce')" style="width:100%;padding:11px;font-size:.82rem;font-weight:600;background:var(--surface2);color:var(--text2)">
            🔮 Plná predikce roku po kategoriích →
          </button>
          <div style="font-size:.72rem;color:var(--text3);margin-top:6px;text-align:center;line-height:1.5">
            Detailní tabulka: skutečnost (YTD) vs předpoklad celého roku, po kategoriích, se sezónními výkyvy.
          </div>
        </div>
      </div>
    </div>

    <!-- BUDOUCÍ PLATBY – 30/60/90 dní (Session 10) -->
    ${bud90.length ? `
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">🗓️ Nadcházející platby</span><span style="font-size:.7rem;color:#a8aec8">po měsících</span></div>
      <div class="card-body" style="padding:10px 14px">
        ${(() => {
          // 3 konkrétní měsíce dopředu (od vybraného měsíce)
          const months=[];
          for(let k=0;k<3;k++){ let m=S.curMonth+k,y=S.curYear; while(m>11){m-=12;y++;} months.push({m,y}); }
          const colColors=['var(--expense)','var(--debt)','#a78bfa'];
          const colHtml = months.map((mo,i)=>{
            const items=bud90.filter(b=>{const dt=new Date(b.date);return dt.getMonth()===mo.m && dt.getFullYear()===mo.y;})
              .sort((a,b)=>new Date(a.date)-new Date(b.date));
            const sum=items.reduce((a,b)=>a+b.amount,0);
            return `<div style="flex:1;min-width:210px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
              <div style="text-align:center;padding:8px;border-bottom:1px solid var(--border)">
                <div style="font-size:.72rem;color:#a8aec8">${CZ_M[mo.m]} ${mo.y}</div>
                <div style="font-family:Syne;font-size:1.05rem;font-weight:800;color:${colColors[i]}">${fmt(Math.round(sum))} Kč</div>
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:.74rem">
                <thead><tr style="color:#a8aec8;text-align:left">
                  <th style="padding:4px 8px;font-weight:500">Platba</th>
                  <th style="padding:4px 6px;font-weight:500">Datum</th>
                  <th style="padding:4px 8px;font-weight:500;text-align:right">Částka</th>
                </tr></thead><tbody>
                ${items.map(b=>`<tr style="border-top:1px solid var(--border)">
                  <td style="padding:4px 8px">${b.icon} ${b.name.length>16?b.name.slice(0,15)+'…':b.name}</td>
                  <td style="padding:4px 6px;color:#a8aec8;white-space:nowrap">${new Date(b.date).getDate()}. ${mo.m+1}.</td>
                  <td style="padding:4px 8px;text-align:right;font-weight:600;color:${b.color||'var(--expense)'};white-space:nowrap">${fmt(b.amount)}</td>
                </tr>`).join('')}
                ${!items.length?`<tr><td colspan="3" style="padding:10px;text-align:center;color:#a8aec8">Žádné platby</td></tr>`:''}
                </tbody>
              </table>
            </div>`;
          }).join('');
          return `<div style="display:flex;gap:10px;flex-wrap:wrap">${colHtml}</div>
            <div style="font-size:.7rem;color:#a8aec8;margin-top:8px;line-height:1.5">Každý sloupec = jeden měsíc. Suma nahoře = součet plateb daného měsíce. Opakující se platby (nájem, splátky) se objevují každý měsíc.</div>`;
        })()}
      </div>
    </div>` : ''}

    <!-- CASHFLOW GRAF – 3 měsíce -->
    ${cfHasData ? `
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">📈 Cashflow – poslední 3 měsíce</span></div>
      <div class="card-body">
        <div style="display:flex;gap:16px;margin-bottom:10px;font-size:.72rem;color:var(--text3)">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--income);display:inline-block"></span>Příjmy</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:var(--expense);display:inline-block"></span>Výdaje</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:14px;height:3px;border-radius:2px;background:var(--bank);display:inline-block"></span>Cashflow (saldo)</span>
        </div>
        ${(() => {
          // SVG graf: sloupce příjmy/výdaje + modrá cashflow linie přes nulovou osu
          const W=320, H=180, padB=40, padT=22;
          const cfVals = cfSeries.map(s=>s.cf);
          const maxPos = Math.max(0, ...cfVals, ...cfSeries.map(s=>Math.max(s.inc,s.exp)));
          const minNeg = Math.min(0, ...cfVals);
          const range = (maxPos - minNeg) || 1;
          const plotH = H - padB - padT;
          const yOf = v => padT + (maxPos - v)/range*plotH;
          const n = cfSeries.length;
          const slotW = W/n;
          const barW = slotW*0.18;
          let bars='', cfPts=[], cfDots='';
          cfSeries.forEach((s,i)=>{
            const cx = i*slotW + slotW/2;
            const y0 = yOf(0);
            const iy = yOf(s.inc), ey = yOf(s.exp);
            bars += `<rect x="${cx-barW-3}" y="${iy}" width="${barW}" height="${Math.max(0,y0-iy)}" fill="var(--income)" opacity=".8" rx="2"/>`;
            bars += `<rect x="${cx+3}" y="${ey}" width="${barW}" height="${Math.max(0,y0-ey)}" fill="var(--expense)" opacity=".8" rx="2"/>`;
            // hodnoty nad sloupci (v tisících)
            bars += `<text x="${cx-barW/2-3}" y="${iy-3}" text-anchor="middle" font-size="7.5" fill="var(--income)">${fmt(Math.round(s.inc/1000))}k</text>`;
            bars += `<text x="${cx+barW/2+3}" y="${ey-3}" text-anchor="middle" font-size="7.5" fill="var(--expense)">${fmt(Math.round(s.exp/1000))}k</text>`;
            const cfy = yOf(s.cf);
            cfPts.push(`${cx},${cfy}`);
            const sel = s.m===S.curMonth&&s.y===S.curYear;
            cfDots += `<circle cx="${cx}" cy="${cfy}" r="${sel?5:4}" fill="var(--bank)" stroke="#0e1018" stroke-width="1.5"/>`;
            // měsíc dole (pod osou), saldo u bodu
            cfDots += `<text x="${cx}" y="${H-22}" text-anchor="middle" font-size="11" fill="${sel?'var(--income)':'var(--text2)'}" font-weight="${sel?'700':'400'}">${s.label}</text>`;
            cfDots += `<text x="${cx}" y="${H-9}" text-anchor="middle" font-size="9" fill="${s.cf>=0?'var(--income)':'var(--expense)'}" font-weight="700">${s.cf>=0?'+':''}${fmt(s.cf)}</text>`;
          });
          const zeroY = yOf(0);
          // osa Y popisky (max a 0)
          const axisY = `<text x="2" y="${yOf(maxPos)+3}" font-size="8" fill="var(--text3)">${fmt(Math.round(maxPos/1000))}k</text>
            <text x="2" y="${zeroY+3}" font-size="8" fill="var(--text3)">0</text>`;
          return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:520px;height:auto;display:block;margin:0 auto;overflow:visible">
            <line x1="22" y1="${zeroY}" x2="${W}" y2="${zeroY}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 3"/>
            ${axisY}
            ${bars}
            <polyline points="${cfPts.join(' ')}" fill="none" stroke="var(--bank)" stroke-width="2.5" stroke-linejoin="round"/>
            ${cfDots}
          </svg>`;
        })()}
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

  // Session 10: vykresli denní graf vždy (i minulé měsíce), robustně
  requestAnimationFrame(()=>setTimeout(()=>renderRadarDailyChart(txs, totalInc, avgInc, avgExp, D), 50));
}

// Denní cashflow graf aktuálního měsíce
function renderRadarDailyChart(txs, monthInc, avgInc, avgExp, D){
  const canvas=document.getElementById('radarDailyChart'); if(!canvas) return;
  const today=new Date();
  const daysInMonth=new Date(S.curYear, S.curMonth+1, 0).getDate();
  const todayDay = (S.curMonth===today.getMonth()&&S.curYear===today.getFullYear()) ? today.getDate() : daysInMonth;
  const dailyExp=Array(daysInMonth+1).fill(0);
  let incomeDay=0, realMonthInc=0, _maxIncAmt=0;
  (txs||[]).forEach(t=>{
    const d=new Date(t.date).getDate();
    if(t.type==='expense' && !t.isBalancing) dailyExp[d]+=Math.abs(t.amount||t.amt||0);
    // FIX (S12.1): den výplaty = den NEJVĚTŠÍHO příjmu (ne prvního) – drobný příjem na začátku měsíce neposune referenční bod
    if(t.type==='income'&&!isTransferTx(t)){ const _a=(t.amount||t.amt||0); realMonthInc+=_a; if(_a>_maxIncAmt){ _maxIncAmt=_a; incomeDay=d; } }
  });
  // zelená čára = REÁLNÝ příjem měsíce (ne historický průměr). Když 0, fallback na průměr (jasně označeno).
  const incomeIsReal = realMonthInc > 0;
  const incomeTarget = incomeIsReal ? realMonthInc : Math.max(avgInc, 1);
  // kumulace VŠECH zapsaných výdajů měsíce (i s datem v budoucnu – reálně existují)
  const cumExp=[0]; for(let d=1;d<=daysInMonth;d++){ cumExp[d] = cumExp[d-1] + dailyExp[d]; }
  // poslední den, kde byl reálný výdaj (kam až kreslit plnou „kumulativní" čáru)
  let lastExpDay=0; for(let d=1;d<=daysInMonth;d++){ if(dailyExp[d]>0) lastExpDay=d; }
  const cumolEnd = Math.max(lastExpDay, todayDay);
  // predikce zbytku: lineární tempo z dosavadního průměru/den
  const spentSoFar=cumExp[cumolEnd]||0;
  const dailyRate = cumolEnd>0 ? spentSoFar/cumolEnd : 0;
  const predEnd = spentSoFar + dailyRate*(daysInMonth-cumolEnd);
  // žlutá křivka = IDEÁLNÍ rovnoměrné tempo (příjem rozložený lineárně přes měsíc).
  // Když je bílá (skutečné výdaje) NAD žlutou, utrácíš rychleji než rovnoměrně.
  const idealPace=[0];
  for(let d=1;d<=daysInMonth;d++){ idealPace[d] = incomeTarget * (d/daysInMonth); }
  // TREND PO TÝDNECH OD VÝPLATY (Session 10) – referenční bod = den výplaty
  // FIX (S12.1b): JEDINÝ ZDROJ PRAVDY = radarPaydayInfo (kotva z Nastavení / auto-detekce).
  // Největší příjem měsíce kotvu jen zpřesní (±6 dní = posun výplaty); měsíc bez příjmu
  // nebo s netypickým příjmem (cashback) už týdny nerozhodí. Fallback: největší příjem, pak 1.
  let payday = incomeDay || 1;
  if(typeof radarPaydayInfo === 'function'){
    try {
      const PI = radarPaydayInfo(getData());
      if(PI && PI.anchor){
        payday = (incomeDay && Math.abs(incomeDay - PI.anchor) <= 6)
          ? incomeDay                                  // reálná výplata poblíž kotvy → přesnější
          : Math.min(PI.anchor, daysInMonth);          // jinak kotva (měsíc bez výplaty / cizí příjem)
      }
    } catch(e) {}
  }
  const weeks=[]; // {label, total, days, perDay}
  for(let w=0;w<5;w++){
    const startDay = payday + w*7;
    if(startDay > daysInMonth) break;
    const endDay = Math.min(startDay+6, daysInMonth);
    let total=0, cnt=0;
    for(let d=startDay; d<=endDay; d++){ total+=dailyExp[d]; cnt++; }
    if(cnt>0) weeks.push({label:`${w+1}. týden`, total:Math.round(total), days:cnt, perDay:Math.round(total/cnt)});
  }
  const isCurrent = (S.curMonth===today.getMonth()&&S.curYear===today.getFullYear());
  // ulož data pro interaktivitu (hover)
  canvas._radarData = {daysInMonth, todayDay, cumolEnd, cumExp, dailyExp, incomeTarget, incomeIsReal, predEnd, incomeDay, weeks, idealPace, isCurrent};
  drawRadarDaily(canvas);
  // vykresli tabulku týdnů od výplaty
  renderPaydayWeeksTable(weeks, payday);
  // interaktivita: tooltip na hover
  if(!canvas._radarBound){
    canvas._radarBound = true;
    canvas.addEventListener('mousemove', e=>radarDailyHover(e, canvas));
    canvas.addEventListener('mouseleave', ()=>{ const tt=document.getElementById('radarDailyTip'); if(tt)tt.style.display='none'; drawRadarDaily(canvas); });
  }
}
function radarDailyGeom(canvas){
  const W=canvas.width, H=canvas.height;
  const pad=52,right=16,top=16,bottom=30;
  return {W,H,pad,right,top,bottom,W2:W-pad-right,H2:H-top-bottom};
}
function drawRadarDaily(canvas, hoverDay){
  const d0=canvas._radarData; if(!d0) return;
  const {daysInMonth:days, todayDay, cumolEnd, cumExp, dailyExp, incomeTarget, incomeIsReal, predEnd, incomeDay, idealPace, isCurrent}=d0;
  const W=Math.max(canvas.parentElement?.clientWidth||0, 320); canvas.width=W;
  const H=250; canvas.height=H;
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,W,H);
  const pad=54,right=20,top=18,bottom=42; // místo dole na osu dní + popisek
  const W2=W-pad-right, H2=H-top-bottom;
  const maxV=Math.max(incomeTarget, cumExp[cumolEnd]||0, predEnd, 1)*1.08;
  const xOf=d=>pad+(d-1)/(days-1)*W2;
  const yOf=v=>top+H2*(1-v/maxV);
  // horizontální mřížka + osa Y (Kč)
  for(let i=0;i<=4;i++){const y=top+H2*(1-i/4);ctx.strokeStyle='rgba(46,51,71,.5)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-right,y);ctx.stroke();
    ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='right';ctx.fillText(fmt(Math.round(maxV*i/4)),pad-6,y+3);}
  // vertikální mřížka (po 5 dnech)
  ctx.strokeStyle='rgba(46,51,71,.35)';ctx.setLineDash([2,4]);
  for(let d=5;d<days;d+=5){const x=xOf(d);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,H-bottom);ctx.stroke();}
  ctx.setLineDash([]);
  // popisek osy Y
  ctx.save();ctx.translate(13,top+H2/2);ctx.rotate(-Math.PI/2);ctx.fillStyle='#a8aec8';ctx.font='9px Instrument Sans';ctx.textAlign='center';ctx.fillText('Kč (kumulativně)',0,0);ctx.restore();
  // modré sloupce – denní výdaj VE STEJNÉM MĚŘÍTKU jako osa Kč (odpovídají hodnotě)
  for(let d=1;d<=days;d++){
    if(dailyExp[d]<=0) continue;
    const x=xOf(d);
    const y=yOf(dailyExp[d]); // vrchol sloupce na hodnotě denního výdaje
    const bh=(H-bottom)-y;
    ctx.fillStyle = (hoverDay===d)?'rgba(96,165,250,.95)':'rgba(96,165,250,.45)';
    ctx.fillRect(x-2.5, y, 5, Math.max(1,bh));
  }
  // zelená linie příjmu (cíl)
  const incY=yOf(incomeTarget);
  ctx.strokeStyle='#4ade80';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(pad,incY);ctx.lineTo(W-right,incY);ctx.stroke();
  ctx.fillStyle='#4ade80';ctx.font='9px Instrument Sans';ctx.textAlign='left';ctx.fillText((incomeIsReal?'příjem ':'odhad příjmu ')+fmt(Math.round(incomeTarget)),pad+2,incY-4);
  // žlutá křivka IDEÁLNÍ TEMPO (rovnoměrné rozložení příjmu)
  if(idealPace){
    ctx.strokeStyle='#fbbf24';ctx.lineWidth=1.8;ctx.setLineDash([4,3]);ctx.beginPath();
    for(let d=1;d<=days;d++){const x=xOf(d),y=yOf(idealPace[d]);d===1?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.stroke();ctx.setLineDash([]);
  }
  // bílá kumulativní výdaje (do posledního dne s výdajem)
  ctx.strokeStyle='#e8eaf2';ctx.lineWidth=2.5;ctx.beginPath();
  for(let d=1;d<=cumolEnd;d++){const x=xOf(d),y=yOf(cumExp[d]);d===1?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.stroke();
  // tečky na kumulativní (pro interaktivitu/orientaci)
  for(let d=1;d<=cumolEnd;d++){ if(dailyExp[d]>0){const x=xOf(d),y=yOf(cumExp[d]);ctx.fillStyle='#e8eaf2';ctx.beginPath();ctx.arc(x,y,2.5,0,7);ctx.fill();} }
  // oranžová predikce zbytku – jen aktuální měsíc
  if(isCurrent && cumolEnd<days){
    ctx.strokeStyle='#fb923c';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.beginPath();
    ctx.moveTo(xOf(cumolEnd), yOf(cumExp[cumolEnd]||0));
    ctx.lineTo(xOf(days), yOf(predEnd));ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#fb923c';ctx.beginPath();ctx.arc(xOf(days),yOf(predEnd),3,0,7);ctx.fill();
    ctx.textAlign='right';ctx.font='9px Instrument Sans';ctx.fillText('odhad '+fmt(Math.round(predEnd)),W-right,yOf(predEnd)-6);
  }
  // tečka dne příjmu
  if(incomeDay>0){
    const ix=xOf(incomeDay);
    ctx.fillStyle='#4ade80';ctx.beginPath();ctx.arc(ix,incY,5,0,7);ctx.fill();
    ctx.fillStyle='#0e1018';ctx.beginPath();ctx.arc(ix,incY,2,0,7);ctx.fill();
  }
  // DNEŠNÍ den
  if(todayDay>=1 && todayDay<=days){
    const tx=xOf(todayDay);
    ctx.strokeStyle='rgba(232,234,242,.35)';ctx.lineWidth=1;ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(tx,top);ctx.lineTo(tx,H-bottom);ctx.stroke();ctx.setLineDash([]);
    const ty=yOf(cumExp[Math.min(todayDay,cumolEnd)]||0);
    ctx.fillStyle='#e8eaf2';ctx.beginPath();ctx.arc(tx,ty,4,0,7);ctx.fill();
    ctx.fillStyle='#7e84a0';ctx.font='8px Instrument Sans';ctx.textAlign='center';ctx.fillText('dnes',tx,top-4);
  }
  // osa X – dny po 2
  ctx.fillStyle='#a8aec8';ctx.font='9px Instrument Sans';ctx.textAlign='center';
  for(let d=1;d<=days;d+=2){ ctx.fillText(d,xOf(d),H-22); }
  ctx.fillStyle='#7e84a0';ctx.font='9px Instrument Sans';ctx.fillText('den v měsíci',pad+W2/2,H-8);
  // hover zvýraznění + tečky všech linií
  if(hoverDay){
    const x=xOf(hoverDay);
    ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,H-bottom);ctx.stroke();
    // tečka na kumul
    if(hoverDay<=cumolEnd){const hv=cumExp[hoverDay]||0;ctx.fillStyle='#e8eaf2';ctx.beginPath();ctx.arc(x,yOf(hv),4,0,7);ctx.fill();}
    // tečka na příjmu
    ctx.fillStyle='#4ade80';ctx.beginPath();ctx.arc(x,incY,3,0,7);ctx.fill();
  }
}
function radarDailyHover(e, canvas){
  const d0=canvas._radarData; if(!d0) return;
  const rect=canvas.getBoundingClientRect();
  const scaleX=canvas.width/rect.width;
  const mx=(e.clientX-rect.left)*scaleX;
  const {daysInMonth:days, cumolEnd, cumExp, dailyExp, incomeTarget, predEnd, isCurrent}=d0;
  const pad=54,right=20; const W2=canvas.width-pad-right;
  let day=Math.round((mx-pad)/W2*(days-1))+1; // snap na nejbližší den
  day=Math.max(1,Math.min(days,day));
  drawRadarDaily(canvas, day);
  let tt=document.getElementById('radarDailyTip');
  if(!tt){ tt=document.createElement('div'); tt.id='radarDailyTip'; tt.style.cssText='position:fixed;z-index:9999;background:#1a1d27;border:1px solid var(--border);border-radius:8px;padding:7px 11px;font-size:.72rem;color:#e8eaf2;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.4);line-height:1.6'; document.body.appendChild(tt); }
  tt.style.display='block';
  tt.style.left=(e.clientX+12)+'px';
  tt.style.top=(e.clientY-10)+'px';
  const dEx = dailyExp[day]||0;
  const kum = cumExp[Math.min(day,cumolEnd)]||0;
  tt.innerHTML = `<b>${day}. den</b>`
    + `<br><span style="color:#60a5fa">●</span> denní výdaj: ${fmt(Math.round(dEx))} Kč`
    + `<br><span style="color:#e8eaf2">●</span> kumulativně: ${fmt(Math.round(kum))} Kč`
    + `<br><span style="color:#4ade80">●</span> příjem (cíl): ${fmt(Math.round(incomeTarget))} Kč`
    + (isCurrent && day===days ? `<br><span style="color:#fb923c">●</span> odhad konce: ${fmt(Math.round(predEnd))} Kč` : '');
}

// Trend výdajů po týdnech od výplaty – sloupcový graf (Kč/den) + tabulka
function renderPaydayWeeksTable(weeks, payday){
  const box=document.getElementById('paydayWeeksBox'); if(!box) return;
  if(!weeks || !weeks.length){ box.innerHTML=''; return; }
  const maxPerDay=Math.max(...weeks.map(w=>w.perDay),1);
  // graf: sloupce = průměr Kč/den v daném týdnu (férové i pro neúplný poslední týden)
  const bars = weeks.map(w=>{
    const h=Math.round(w.perDay/maxPerDay*90)+4;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px">
      <div style="font-size:.7rem;font-weight:700;color:#60a5fa;font-family:Syne">${fmt(w.perDay)}</div>
      <div style="width:100%;max-width:46px;height:${h}px;background:#60a5fa;opacity:.8;border-radius:6px 6px 0 0"></div>
      <div style="font-size:.64rem;color:var(--text3);text-align:center">${w.label}</div>
    </div>`;
  }).join('');
  const rows = weeks.map(w=>`<tr style="border-top:1px solid var(--border)">
    <td style="padding:5px 6px">${w.label}</td>
    <td style="padding:5px 6px;text-align:right">${fmt(w.total)} Kč</td>
    <td style="padding:5px 6px;text-align:right;color:var(--text3)">${w.days}</td>
    <td style="padding:5px 6px;text-align:right;font-weight:700;color:#60a5fa">${fmt(w.perDay)} Kč</td>
  </tr>`).join('');
  box.innerHTML = `
    <div style="font-size:.72rem;font-weight:600;color:var(--text3);text-transform:uppercase;margin-bottom:4px">📅 Výdaje po týdnech od výplaty</div>
    <div style="font-size:.66rem;color:var(--text3);margin-bottom:10px;line-height:1.5">Referenční bod = den výplaty (${payday}. den). Sloupce ukazují <strong>průměr Kč/den</strong> v každém týdnu – férové i pro kratší poslední týden. Vysoký 1. týden = utrácíš hned po výplatě.</div>
    <div style="display:flex;align-items:flex-end;gap:8px;height:130px;margin-bottom:12px;padding:0 4px">${bars}</div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.78rem">
      <thead><tr style="color:var(--text3);text-align:left">
        <th style="padding:5px 6px">Týden</th>
        <th style="padding:5px 6px;text-align:right">Výdaje</th>
        <th style="padding:5px 6px;text-align:right">Dní</th>
        <th style="padding:5px 6px;text-align:right">Kč/den</th>
      </tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ══════════════════════════════════════════════════════
//  RUNWAY DO VÝPLATY (Session 12.1)
//  Cyklus výplata→výplata místo kalendářního měsíce.
//  Kotva = den z Nastavení (Den výplaty) nebo auto-detekce:
//  medián dne NEJVĚTŠÍHO příjmu za posledních 6 měsíců.
//  Skutečný start cyklu se přichytí na reálnou příjmovou
//  transakci v okně ±6 dní (řeší měsíční posuny výplaty).
// ══════════════════════════════════════════════════════
function radarViewTabs(active){
  const btn=(key,label)=>`<button class="tx-filt-btn ${active===key?'active':''}" onclick="switchRadarView('${key}')" style="flex:1;font-size:.78rem">${label}</button>`;
  return `<div style="display:flex;gap:3px;background:var(--surface2);border-radius:9px;padding:3px;margin-bottom:14px">${btn('mesic','📅 Měsíc')}${btn('payday','💸 Do výplaty')}</div>`;
}
function switchRadarView(v){ window._radarView=v; if(typeof renderRadar==='function') renderRadar(); }

// Auto-detekce dne výplaty: medián dne NEJVĚTŠÍHO příjmu z posledních 6 měsíců s příjmem
function radarDetectPaydayDay(D){
  const days=[]; const now=new Date();
  for(let i=0;i<6;i++){
    let m=now.getMonth()-i, y=now.getFullYear(); while(m<0){m+=12;y--;}
    const inc=getTx(m,y,D).filter(t=>t.type==='income'&&!t.isBalancing&&!t.splitParent&&!isTransferTx(t));
    if(!inc.length) continue;
    let best=inc[0]; inc.forEach(t=>{ if((t.amount||t.amt||0)>(best.amount||best.amt||0)) best=t; });
    const d=new Date(best.date).getDate(); if(d>=1&&d<=31) days.push(d);
  }
  if(!days.length) return null;
  days.sort((a,b)=>a-b);
  return days[Math.floor((days.length-1)/2)];
}

// Výplata připadající na víkend chodí dřív → posun na pátek (CZ konvence)
function radarAdjustWeekend(dt){ const wd=dt.getDay(); if(wd===6) dt.setDate(dt.getDate()-1); else if(wd===0) dt.setDate(dt.getDate()-2); return dt; }

function radarPaydayInfo(D){
  const setting=(typeof _settings!=='undefined'&&_settings)?(parseInt(_settings.firstDay)||0):0;
  const detected=radarDetectPaydayDay(D);
  let anchor, source;
  if(setting>0){ anchor=setting; source='setting'; }
  else if(detected){ anchor=detected; source='auto'; }
  else { anchor=1; source='fallback'; }
  const today=new Date(); today.setHours(0,0,0,0);
  const mkPay=(y,m)=>{ const dim=new Date(y,m+1,0).getDate(); return radarAdjustWeekend(new Date(y,m,Math.min(anchor,dim))); };
  // poslední očekávaná výplata (tento, jinak minulý měsíc)
  let lastExpected=mkPay(today.getFullYear(),today.getMonth());
  if(lastExpected>today){ let pm=today.getMonth()-1, py=today.getFullYear(); if(pm<0){pm+=12;py--;} lastExpected=mkPay(py,pm); }
  // přichycení na REÁLNOU největší příjmovou transakci v okně ±6 dní
  const win0=new Date(lastExpected); win0.setDate(win0.getDate()-6);
  const win1=new Date(lastExpected); win1.setDate(win1.getDate()+6);
  const cand=(D.transactions||[]).filter(t=>{
    if(t.type!=='income'||t.isBalancing||t.splitParent||isTransferTx(t)) return false;
    const d=new Date(t.date); d.setHours(0,0,0,0);
    return d>=win0 && d<=win1 && d<=today;
  });
  let lastPayday=lastExpected, paydayReal=false;
  if(cand.length){
    let best=cand[0]; cand.forEach(t=>{ if((t.amount||t.amt||0)>(best.amount||best.amt||0)) best=t; });
    lastPayday=new Date(best.date); lastPayday.setHours(0,0,0,0); paydayReal=true;
  }
  // další očekávaná výplata
  let nm=lastExpected.getMonth()+1, ny=lastExpected.getFullYear(); if(nm>11){nm=0;ny++;}
  let nextPayday=mkPay(ny,nm);
  while(nextPayday<=today){ nm++; if(nm>11){nm=0;ny++;} nextPayday=mkPay(ny,nm); }
  const MS=86400000;
  const daysLeft=Math.max(0,Math.round((nextPayday-today)/MS));
  const cycleDays=Math.max(1,Math.round((nextPayday-lastPayday)/MS));
  const dayInCycle=Math.min(cycleDays,Math.max(1,Math.round((today-lastPayday)/MS)+1));
  return {anchor,source,detected,lastPayday,nextPayday,daysLeft,cycleDays,dayInCycle,paydayReal,today};
}

function renderRadarPayday(el, D){
  const P=radarPaydayInfo(D);
  const fmtD=d=>`${d.getDate()}. ${d.getMonth()+1}.`;
  // transakce cyklu (od výplaty do dneška)
  const cycSoFar=getTxByRange(P.lastPayday,P.today,D);
  const cycInc=incSum(cycSoFar), cycExp=expSum(cycSoFar);
  // budoucí platby do další výplaty (platby V den výplaty už pokryje nová výplata)
  const bud=(typeof budouciGetAll==='function'?budouciGetAll(D,P.daysLeft+1):[]).filter(b=>{const bd=new Date(b.date);bd.setHours(0,0,0,0);return bd<P.nextPayday;});
  const budTotal=Math.round(bud.reduce((a,b)=>a+(b.amount||0),0));
  const incomeBase=cycInc;
  const free=Math.round(incomeBase-cycExp-budTotal);
  // S12.1b: Nedotknutelná rezerva (Nastavení) – denní limit se počítá až po jejím odečtení
  const minReserve=(typeof _settings!=='undefined'&&_settings)?Math.max(0,parseInt(_settings.minReserve)||0):0;
  const freeUse=free-minReserve;
  const dailyLimit=P.daysLeft>0?Math.floor(Math.max(freeUse,0)/P.daysLeft):0;
  const cyclePct=Math.round(P.dayInCycle/P.cycleDays*100);
  const spentPct=incomeBase>0?Math.round(cycExp/incomeBase*100):0;
  const status = free<0?'danger':(incomeBase>0&&spentPct>cyclePct+15?'warn':'safe');
  const stColor=status==='safe'?'var(--income)':status==='warn'?'var(--debt)':'var(--expense)';
  const stBg=status==='safe'?'rgba(74,222,128,.06)':status==='warn'?'rgba(251,191,36,.06)':'rgba(248,113,113,.06)';

  // ── Týdny od výplaty k výplatě – rozpad dle charakteru výdaje (expenseChar) ──
  const charBy={}; (D.categories||[]).forEach(c=>{ charBy[c.id]=c.expenseChar||''; });
  const GROUPS=[
    {key:'regular', label:'Fixní',                color:'#60a5fa'},
    {key:'variable',label:'Variabilní',           color:'#fbbf24'},
    {key:'other',   label:'Jednoráz./nepravid.',  color:'#a78bfa'},
    {key:'none',    label:'Neurčeno',             color:'#7e84a0'},
  ];
  const grpOf=t=>{ const ch=charBy[t.catId]||''; if(ch==='regular')return'regular'; if(ch==='variable')return'variable'; if(ch==='irregular'||ch==='onetime')return'other'; return'none'; };
  const cycAllExp=getTxByRange(P.lastPayday,P.nextPayday,D).filter(t=>t.type==='expense'&&!t.isBalancing&&!t.splitParent);
  const weeks=[];
  for(let w=0; w*7<P.cycleDays; w++){
    const ws=new Date(P.lastPayday); ws.setDate(ws.getDate()+w*7);
    let we=new Date(ws); we.setDate(we.getDate()+6);
    const cycEnd=new Date(P.nextPayday); cycEnd.setDate(cycEnd.getDate()-1);
    if(we>cycEnd) we=cycEnd;
    const sums={regular:0,variable:0,other:0,none:0};
    cycAllExp.forEach(t=>{ const d=new Date(t.date); d.setHours(0,0,0,0); if(d>=ws&&d<=we) sums[grpOf(t)]+=(t.amount||t.amt||0); });
    const total=Math.round(sums.regular+sums.variable+sums.other+sums.none);
    const lastLived=P.today<we?P.today:we;
    const lived=lastLived>=ws?Math.round((lastLived-ws)/86400000)+1:0;
    weeks.push({label:`${w+1}. týden`, range:`${fmtD(ws)}–${fmtD(we)}`, sums, total, lived, perDay:lived>0?Math.round(total/lived):0, future:lived===0});
  }
  const maxWeek=Math.max(...weeks.map(w=>w.total),1);

  // ── Top variabilní kategorie cyklu ──
  const varAgg={};
  cycAllExp.forEach(t=>{ if(grpOf(t)!=='variable')return; varAgg[t.catId]=(varAgg[t.catId]||0)+(t.amount||t.amt||0); });
  const varTotal=Object.values(varAgg).reduce((a,b)=>a+b,0);
  const topVar=Object.entries(varAgg).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,v])=>{
    const c=(D.categories||[]).find(x=>x.id===id);
    return {name:c?`${c.icon||''} ${c.name}`.trim():'(neznámá)', val:Math.round(v)};
  });
  const hasChar=Object.values(charBy).some(v=>v&&v!=='none');

  // ── S12.1b: Minulý cyklus do stejného dne (férové srovnání tempa) ──
  const prevEnd=new Date(P.lastPayday); prevEnd.setDate(prevEnd.getDate()-1);
  let prevStart=new Date(P.lastPayday); prevStart.setMonth(prevStart.getMonth()-1); radarAdjustWeekend(prevStart);
  { // přichycení na reálnou výplatu ±6 dní (stejně jako u aktuálního cyklu)
    const w0=new Date(prevStart); w0.setDate(w0.getDate()-6);
    const w1=new Date(prevStart); w1.setDate(w1.getDate()+6);
    const cand=(D.transactions||[]).filter(t=>{
      if(t.type!=='income'||t.isBalancing||t.splitParent||isTransferTx(t)) return false;
      const d=new Date(t.date); d.setHours(0,0,0,0);
      return d>=w0 && d<=w1;
    });
    if(cand.length){ let b=cand[0]; cand.forEach(t=>{ if((t.amount||t.amt||0)>(b.amount||b.amt||0)) b=t; }); prevStart=new Date(b.date); prevStart.setHours(0,0,0,0); }
  }
  let prevSameEnd=new Date(prevStart); prevSameEnd.setDate(prevSameEnd.getDate()+P.dayInCycle-1);
  if(prevSameEnd>prevEnd) prevSameEnd=prevEnd;
  const prevSame=prevStart<P.lastPayday?Math.round(expSum(getTxByRange(prevStart,prevSameEnd,D))):0;
  const prevTotal=prevStart<P.lastPayday?Math.round(expSum(getTxByRange(prevStart,prevEnd,D))):0;
  const sameDiffPct=prevSame>0?Math.round((cycExp-prevSame)/prevSame*100):null;

  // ── S12.1b: Víkendové vs všednodenní tempo (cyklus dosud) ──
  let weDays=0,wdDays=0;
  for(let dI=0;dI<P.dayInCycle;dI++){ const d=new Date(P.lastPayday); d.setDate(d.getDate()+dI); const wd=d.getDay(); if(wd===0||wd===6) weDays++; else wdDays++; }
  let weSum=0,wdSum=0;
  cycSoFar.forEach(t=>{ if(t.type!=='expense'||t.isBalancing||t.splitParent||isTransferTx(t)) return; const wd=new Date(t.date).getDay(); const a=(t.amount||t.amt||0); if(wd===0||wd===6) weSum+=a; else wdSum+=a; });
  const wePace=weDays>0?Math.round(weSum/weDays):0;
  const wdPace=wdDays>0?Math.round(wdSum/wdDays):0;

  // ── S12.1b: Projekce konce cyklu – flexibilní tempo × zbývající dny ──
  //  (fixní výdaje neextrapoluji – známé budoucí platby už kryje budTotal)
  const flexSoFar=cycSoFar.filter(t=>t.type==='expense'&&!t.isBalancing&&!t.splitParent&&!isTransferTx(t)&&grpOf(t)!=='regular')
    .reduce((a,t)=>a+(t.amount||t.amt||0),0);
  const flexPace=P.dayInCycle>0?flexSoFar/P.dayInCycle:0;
  const projEnd=Math.round(free - flexPace*P.daysLeft);
  const projColor=projEnd>=minReserve?'var(--income)':projEnd>=0?'var(--debt)':'var(--expense)';

  // hint o zdroji kotvy dne výplaty
  let anchorHint='';
  if(P.source==='auto') anchorHint=`🤖 Den výplaty odhaduji z transakcí (≈ ${P.anchor}. den). Upřesnit ho můžeš v Nastavení → Den výplaty.`;
  else if(P.source==='fallback') anchorHint=`⚠️ Den výplaty zatím neznám (žádné příjmy v historii) – počítám od 1. dne měsíce. Nastav ho v Nastavení → Den výplaty.`;
  else if(P.detected && Math.abs(P.detected-P.anchor)>3) anchorHint=`💡 V Nastavení máš ${P.anchor}. den, ale podle transakcí výplata chodí spíš ≈ ${P.detected}. den. Zkontroluj Nastavení → Den výplaty.`;

  const weekBars=weeks.map(w=>{
    const segs=GROUPS.map(g=>{ const v=w.sums[g.key]; if(v<=0)return''; const h=Math.max(2,Math.round(v/maxWeek*110)); return `<div style="width:100%;height:${h}px;background:${g.color};opacity:.85" title="${g.label}: ${fmt(Math.round(v))} Kč"></div>`; }).join('');
    return `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:5px">
      <div style="font-size:.66rem;font-weight:700;color:#c2c7da;font-family:Syne">${w.total>0?fmt(w.total):(w.future?'·':'0')}</div>
      <div style="width:100%;max-width:46px;display:flex;flex-direction:column-reverse;border-radius:6px 6px 0 0;overflow:hidden;min-height:2px">${segs||'<div style="height:2px;background:var(--surface3)"></div>'}</div>
      <div style="font-size:.6rem;color:#a8aec8;text-align:center;line-height:1.3">${w.label}<br><span style="color:var(--text3)">${w.range}</span></div>
    </div>`;
  }).join('');

  const weekRows=weeks.map(w=>`<tr style="border-top:1px solid var(--border);${w.future?'opacity:.45':''}">
    <td style="padding:5px 6px;white-space:nowrap">${w.label}</td>
    <td style="padding:5px 6px;text-align:right;color:#60a5fa">${fmt(Math.round(w.sums.regular))}</td>
    <td style="padding:5px 6px;text-align:right;color:#fbbf24">${fmt(Math.round(w.sums.variable))}</td>
    <td style="padding:5px 6px;text-align:right;color:#a78bfa">${fmt(Math.round(w.sums.other+w.sums.none))}</td>
    <td style="padding:5px 6px;text-align:right;font-weight:700">${fmt(w.total)}</td>
    <td style="padding:5px 6px;text-align:right;font-weight:700;color:#e8eaf2">${w.lived>0?fmt(w.perDay):'–'}</td>
  </tr>`).join('');

  el.innerHTML = tabIntro('radar-payday','💸','Runway do výplaty',
    'Místo kalendářního měsíce počítá cyklus od výplaty k výplatě: kolik ti reálně zbývá do další výplaty po odečtení známých plateb, jaký je bezpečný denní limit a jak rychle utrácíš fixní vs variabilní výdaje v jednotlivých týdnech cyklu.')
    + radarViewTabs('payday')
    + (anchorHint?`<div style="padding:10px 14px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);font-size:.78rem;color:var(--text2);margin-bottom:14px;line-height:1.5">${anchorHint}</div>`:'')
    + `
    <!-- HLAVNÍ KARTA RUNWAY -->
    <div style="background:${stBg};border:1px solid ${stColor}44;border-radius:var(--radius);padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <div style="font-size:2rem">💸</div>
        <div style="min-width:0">
          <div style="font-weight:700;font-size:1rem">Do výplaty</div>
          <div style="font-size:.76rem;color:#a8aec8">cyklus ${fmtD(P.lastPayday)} → ${fmtD(P.nextPayday)}${P.paydayReal?'':' (odhad)'} · den ${P.dayInCycle}/${P.cycleDays}</div>
        </div>
        <div style="margin-left:auto;font-family:Syne,sans-serif;font-size:1rem;font-weight:800;color:${stColor};white-space:nowrap">⏳ ${P.daysLeft} ${P.daysLeft===1?'den':P.daysLeft>=2&&P.daysLeft<=4?'dny':'dní'}</div>
      </div>
      <div class="radar-stat-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
        <div class="stat-card ${free>=0?'balance':'expense'}">
          <div class="stat-label">Volné do výplaty</div>
          <div class="stat-value ${free>=0?'up':'down'}">${fmt(free)} Kč</div>
          <div class="stat-sub" style="font-size:.66rem">po rezervě ${fmt(budTotal)} Kč na platby</div>
        </div>
        <div class="stat-card income">
          <div class="stat-label">Denní limit</div>
          <div class="stat-value">${P.daysLeft>0?fmt(dailyLimit)+' Kč':'–'}</div>
          <div class="stat-sub" style="font-size:.66rem">${minReserve>0?`po rezervě ${fmt(minReserve)} Kč 🛡️`:'bezpečné tempo/den'}</div>
        </div>
        <div class="stat-card expense">
          <div class="stat-label">Utraceno v cyklu</div>
          <div class="stat-value down">${fmt(Math.round(cycExp))} Kč</div>
          <div class="stat-sub" style="font-size:.66rem">${incomeBase>0?spentPct+' % příjmu cyklu':'bez příjmu v cyklu'}</div>
        </div>
      </div>
      ${incomeBase>0?`
      <div style="margin-top:2px">
        <div style="display:flex;justify-content:space-between;font-size:.68rem;color:#a8aec8;margin-bottom:4px">
          <span>utraceno ${spentPct} %</span><span>uplynulo ${cyclePct} % cyklu</span>
        </div>
        <div style="position:relative;height:10px;background:var(--surface3);border-radius:6px;overflow:hidden">
          <div style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(spentPct,100)}%;background:${stColor};opacity:.8"></div>
          <div style="position:absolute;left:${Math.min(cyclePct,100)}%;top:-2px;bottom:-2px;width:2px;background:#e8eaf2"></div>
        </div>
        <div style="font-size:.66rem;color:var(--text3);margin-top:4px">Bílá značka = kde bys měl být při rovnoměrném tempu. Pruh před značkou = v pohodě, za značkou = utrácíš rychleji než cyklus běží.</div>
      </div>`:`<div style="font-size:.76rem;color:var(--text2)">V tomto cyklu zatím nemáš zapsaný příjem – volné peníze spočítám po připsání výplaty.</div>`}
      ${free<0?`<div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:var(--expense-bg);border:1px solid rgba(248,113,113,.3);font-size:.8rem;color:var(--text2)">🔴 Při známých platbách (${fmt(budTotal)} Kč) ti do výplaty chybí <strong>${fmt(Math.abs(free))} Kč</strong>. Zvaž odklad nefixních výdajů.</div>`:''}
      ${P.dayInCycle>=3&&incomeBase>0?`<div style="margin-top:10px;padding:9px 14px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);font-size:.78rem;color:var(--text2)">
        📉 Dosavadním flexibilním tempem (${fmt(Math.round(flexPace))} Kč/den) skončíš cyklus s <strong style="color:${projColor}">${fmt(projEnd)} Kč</strong>${minReserve>0?` <span style="color:var(--text3)">(rezerva ${fmt(minReserve)} Kč ${projEnd>=minReserve?'zůstane nedotčená ✓':'bude nahlodaná!'})</span>`:''}
      </div>`:''}
    </div>

    <!-- SROVNÁNÍ S MINULÝM CYKLEM + TEMPO (S12.1b) -->
    ${prevTotal>0?`
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">🔁 Srovnání s minulým cyklem</span><span style="font-size:.68rem;color:var(--text3)">do ${P.dayInCycle}. dne</span></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
          <div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0">
            <div class="stat-value-h" style="color:#a8aec8">${fmt(prevSame)}</div>
            <div class="stat-label-h">minule do ${P.dayInCycle}. dne</div>
          </div>
          <div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0">
            <div class="stat-value-h" style="color:${sameDiffPct===null?'#a8aec8':sameDiffPct<=0?'var(--income)':sameDiffPct>15?'var(--expense)':'var(--debt)'}">${sameDiffPct===null?'–':(sameDiffPct>0?'+':'')+sameDiffPct+' %'}</div>
            <div class="stat-label-h">teď ${fmt(Math.round(cycExp))} Kč</div>
          </div>
          <div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0">
            <div class="stat-value-h" style="color:#a8aec8">${fmt(prevTotal)}</div>
            <div class="stat-label-h">minulý cyklus celkem</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;font-size:.78rem;color:var(--text2);flex-wrap:wrap">
          <span>📅 Všední den: <strong style="color:#60a5fa">${fmt(wdPace)} Kč/den</strong></span>
          <span>🎉 Víkend: <strong style="color:#fbbf24">${fmt(wePace)} Kč/den</strong></span>
          ${wdPace>0&&wePace>wdPace*1.5?`<span style="font-size:.7rem;color:var(--text3)">víkendy táhnou tempo ${(wePace/wdPace).toFixed(1)}× nahoru</span>`:''}
        </div>
      </div>
    </div>`:''}

    <!-- TÝDNY OD VÝPLATY – stacked fixní/variabilní -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">📊 Tempo po týdnech cyklu</span><span style="font-size:.68rem;color:var(--text3)">fixní vs variabilní</span></div>
      <div class="card-body">
        ${hasChar?'':`<div style="padding:8px 12px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);font-size:.74rem;color:var(--text2);margin-bottom:10px">💡 Žádná kategorie nemá nastavený <strong>charakter výdaje</strong> – vše spadá do „Neurčeno". Nastav charakter u kategorií (✎ Upravit kategorii) a rozpad ožije.</div>`}
        <div style="display:flex;align-items:flex-end;gap:8px;min-height:150px;padding:0 2px;margin-bottom:8px">${weekBars}</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:12px">
          ${GROUPS.map(g=>`<span style="display:flex;align-items:center;gap:5px;font-size:.7rem;color:#c2c7da"><span style="width:10px;height:10px;border-radius:3px;background:${g.color};flex-shrink:0"></span>${g.label}</span>`).join('')}
        </div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.74rem;min-width:430px">
          <thead><tr style="color:#a8aec8;text-align:left">
            <th style="padding:5px 6px">Týden</th>
            <th style="padding:5px 6px;text-align:right">Fixní</th>
            <th style="padding:5px 6px;text-align:right">Variab.</th>
            <th style="padding:5px 6px;text-align:right">Ostatní</th>
            <th style="padding:5px 6px;text-align:right">Celkem</th>
            <th style="padding:5px 6px;text-align:right">Kč/den</th>
          </tr></thead><tbody>${weekRows}</tbody></table></div>
        <div style="font-size:.66rem;color:var(--text3);margin-top:8px;line-height:1.5">Týdny běží od výplaty (${fmtD(P.lastPayday)}), ne od 1. dne měsíce. Kč/den dělí jen odžité dny týdne. „Ostatní" = jednorázové + nepravidelné + neurčené. Budoucí týdny jsou ztlumené.</div>
      </div>
    </div>

    <!-- TOP VARIABILNÍ KATEGORIE CYKLU -->
    ${topVar.length?`
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">🎯 Co žene variabilní výdaje</span><span style="font-size:.68rem;color:var(--text3)">tento cyklus</span></div>
      <div class="card-body">
        ${topVar.map(t=>{ const pct=varTotal>0?Math.round(t.val/varTotal*100):0; return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;min-width:0">
          <div style="flex:1;min-width:0;font-size:.8rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</div>
          <div style="flex:2;height:8px;background:var(--surface3);border-radius:5px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#fbbf24;opacity:.85"></div></div>
          <div style="width:86px;text-align:right;font-size:.76rem;font-weight:700;color:#fbbf24;flex-shrink:0">${fmt(t.val)} Kč</div>
        </div>`;}).join('')}
        <div style="font-size:.66rem;color:var(--text3);margin-top:4px">Jen kategorie s charakterem „Variabilní" – tady má smysl brzdit. Fixní výdaje denním tempem neovlivníš.</div>
      </div>
    </div>`:''}
  `;
}

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
  // FIX (S12.1): výplata = NEJVĚTŠÍ příjem měsíce (ne první) – konzistentní s denním grafem a Runway
  const incTxsAll = txs.filter(t=>t.type==='income');
  const paydayTx = incTxsAll.length ? incTxsAll.reduce((a,b)=>((b.amount||b.amt||0)>(a.amount||a.amt||0)?b:a)) : null;
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
