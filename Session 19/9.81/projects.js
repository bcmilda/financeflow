// FinanceFlow · v9.81 · projects.js · 2026-08-17
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
    const spent = txs.filter(t=>t.type==='expense').reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
    const income = txs.filter(t=>t.type==='income').reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
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
      <div style="font-size:.72rem;color:var(--text3);margin-top:8px;border-top:1px solid var(--border);padding-top:6px">${txs.length} transakcí · saldo: <span style="color:${income-spent>=0?'var(--income)':'var(--expense)'};font-weight:600">${fmtB(income-spent)}</span></div>
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
  const spent = txs.filter(t=>t.type==='expense'||t.type==='debt').reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
  const income = txs.filter(t=>t.type==='income').reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
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
      <div class="stat-card expense"><div class="stat-label">Výdaje</div><div class="stat-value down">${fmtB(spent)}</div></div>
      <div class="stat-card income"><div class="stat-label">Příjmy / Dotace</div><div class="stat-value up">${fmtB(income)}</div></div>
      <div class="stat-card balance"><div class="stat-label">Bilance</div><div class="stat-value ${balance>=0?'up':'down'}">${fmtB(balance)}</div></div>
      ${budget>0?`<div class="stat-card debt"><div class="stat-label">Zbývá z rozpočtu</div><div class="stat-value ${budget-spent>=0?'bankc':'down'}">${fmtB(budget-spent)}</div><div class="stat-sub">${pct}% vyčerpáno</div></div>`:`<div class="stat-card bank"><div class="stat-label">Transakcí</div><div class="stat-value bankc">${txs.length}</div></div>`}
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
          const amt = txCZK(t, D); // v8.61 (TODO-151): v základní měně (cizí peněženky správně)
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
              <div style="font-weight:700;font-size:.95rem;color:${isIncome?'var(--income)':'var(--expense)'}">${isIncome?'+':'−'}${fmtB(amt)}</div>
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
                        .reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A: základ příjmu vstupuje do S1/DTI/DSTI/S3/S4
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
  // v8.63 (FIX-177): samotná Kč částka dřív NEFUNGOVALA – chybějící healthPct dávalo
  // limitByPct=0 → min(0, Kč)=0 → „bez limitu". Nyní: nevyplněné % = Infinity (neomezuje).
  const limitByPct = (cat.healthPct > 0 && baseIncome > 0) ? baseIncome * cat.healthPct / 100 : Infinity;
  const limitByAmt = cat.healthAmt || Infinity;
  // Pro spoření: minimum (chceme aby odkládali ASPOŇ tolik). Platí VYŠŠÍ z (% ze základu, Kč).
  if(cat.isSaving || cat.isInvest) { // v8.70: investice = také minimum
    const minByPct = (cat.healthPct > 0 && baseIncome > 0) ? baseIncome * cat.healthPct / 100 : 0;
    const minTarget = Math.max(minByPct, cat.healthAmt || 0); // v8.63: Kč funguje i u spoření
    if(minTarget <= 0) return null;
    const ratio = spent / minTarget;
    return Math.min(100, Math.round(ratio * 100));
  }
  // Pro výdaje: maximum. Platí PŘÍSNĚJŠÍ (nižší) z (% ze základu příjmu, Kč strop).
  const limit = Math.min(limitByPct, limitByAmt);
  if(limit <= 0 || limit === Infinity) return null;
  if(spent === 0) return 100;
  const ratio = spent / limit;
  if(ratio <= 0.8) return 100;
  if(ratio <= 1.0) return Math.round(100 - (ratio-0.8)/0.2 * 30); // 100→70
  if(ratio <= 1.5) return Math.round(70 - (ratio-1.0)/0.5 * 50);  // 70→20
  return Math.max(0, Math.round(20 - (ratio-1.5) * 20));           // 20→0
}

// ══════════════════════════════════════════════════════
//  v8.63 (TODO-152): AUTOMATICKÉ ROZDĚLENÍ LIMITŮ KATEGORIÍ
//  Návrh % limitů (2 desetinná místa) ze základu příjmu podle skutečných
//  výdajů za poslední 3 měsíce. Bez historie → rovnoměrné rozdělení 80 %.
// ══════════════════════════════════════════════════════
function _autoLimitsSuggest(){
  const D=getData();
  const base=computeBaseIncome(D);
  const cats=(D.categories||[]).filter(c=>(c.type==='expense'||c.type==='both')&&!c.isSaving);
  const r2=v=>Math.round(v*100)/100;
  const rows=cats.map(c=>{
    let t=0;
    for(let i=1;i<=3;i++){ let m=S.curMonth-i,y=S.curYear; if(m<0){m+=12;y--;} t+=getActual(c.id,null,m,y,D); }
    return {id:c.id, name:c.name, icon:c.icon||'📋', cur:c.healthPct||0, avg:t/3};
  });
  const totalAvg=rows.reduce((a,r)=>a+r.avg,0);
  const hasHistory = base>0 && totalAvg>0;
  if(hasHistory){
    rows.forEach(r=>{ r.suggest = r.avg>0 ? r2(r.avg/base*100) : 0; }); // podíl skutečné útraty na základu příjmu
  } else {
    // v8.64 (TODO-152): nový uživatel bez historie → rozdělení podle PRŮMĚRNÉ ÚTRATY V ČR
    // (ČSÚ COICOP oddíly, avg_osoba z COICOP_GROUPS_DEF). Obálka 80 % základu příjmu,
    // rozdělená poměrově podle podílů oddílů; víc kategorií v oddílu se o podíl dělí rovným dílem.
    const DIVS=(typeof COICOP_GROUPS_DEF!=='undefined'?COICOP_GROUPS_DEF:(window.COICOP_GROUPS_DEF||[]));
    const czTotal=DIVS.reduce((a,g)=>a+(g.avg_osoba||0),0);
    const catMeta={}; (D.categories||[]).forEach(c=>{ catMeta[c.id]=c; });
    const perDivCount={};
    rows.forEach(r=>{ const dv=catMeta[r.id]?.coicop||0; if(dv) perDivCount[dv]=(perDivCount[dv]||0)+1; });
    const ENVELOPE=80; let assigned=0; const unmatched=[];
    rows.forEach(r=>{
      const dv=catMeta[r.id]?.coicop||0;
      const g=DIVS.find(x=>x.id===dv);
      if(g && czTotal>0){
        r.suggest=r2(ENVELOPE*(g.avg_osoba||0)/czTotal/(perDivCount[dv]||1));
        assigned+=r.suggest;
      } else { unmatched.push(r); }
    });
    // Kategorie bez COICOP přiřazení dostanou zbylou část obálky rovným dílem
    if(unmatched.length){
      const rest=Math.max(0, ENVELOPE-assigned);
      unmatched.forEach(r=>{ r.suggest=r2(rest/unmatched.length); });
    }
  }
  return {rows, base, hasHistory};
}

function openAutoLimitsModal(){
  if(viewingUid) return;
  const {rows, base, hasHistory}=_autoLimitsSuggest();
  if(!rows.length){ alert('Nemáš žádné výdajové kategorie.'); return; }
  let ov=document.getElementById('autoLimitsOverlay');
  if(ov) ov.remove();
  ov=document.createElement('div');
  ov.id='autoLimitsOverlay';
  ov.style.cssText='position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:14px';
  ov.innerHTML=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;max-width:520px;width:100%;max-height:86vh;display:flex;flex-direction:column">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border)">
      <strong style="font-size:.95rem">🎯 Automatické rozdělení limitů</strong>
      <button onclick="document.getElementById('autoLimitsOverlay').remove()" style="background:none;border:none;color:var(--text3);font-size:1.1rem;cursor:pointer">✕</button>
    </div>
    <div style="padding:12px 16px;overflow-y:auto;flex:1">
      <div style="font-size:.72rem;color:#a8aec8;line-height:1.5;margin-bottom:10px">
        ${hasHistory
          ? `Návrh podle tvých skutečných výdajů za poslední 3 měsíce, vztaženo k základu příjmu <strong style="color:var(--text)">${fmt(base)} Kč</strong>. Uprav dle potřeby a ulož.`
          : 'Zatím nemáš historii výdajů – návrh vychází z <strong style="color:var(--text)">průměrné útraty české domácnosti (ČSÚ, COICOP oddíly)</strong>, rozdělené do tvých kategorií v obálce 80 % základu příjmu. Po ~3 měsících spusť znovu – přepočítá se podle tvých skutečných výdajů.'}
      </div>
      ${rows.map((r,i)=>`
      <div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <span style="font-size:1rem;flex-shrink:0">${r.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:.8rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.name}</div>
          <div style="font-size:.66rem;color:#a8aec8">${hasHistory?`Ø ${fmt(Math.round(r.avg))} Kč/měs`:''}${r.cur?` · nyní ${r.cur} %`:''}</div>
        </div>
        <input type="number" class="fi" id="al_${i}" value="${r.suggest}" min="0" max="100" step="0.01"
          oninput="_autoLimitsSum()" style="width:88px;text-align:right;flex-shrink:0">
        <span style="font-size:.78rem;color:var(--text2);flex-shrink:0">%</span>
      </div>`).join('')}
      <div id="autoLimitsSum" style="font-size:.76rem;margin-top:10px;font-weight:600"></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 16px;border-top:1px solid var(--border)">
      <button class="btn btn-ghost" onclick="document.getElementById('autoLimitsOverlay').remove()">Zrušit</button>
      <button class="btn btn-accent" onclick="applyAutoLimits()">✓ Uložit limity</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  window._autoLimitsRows=rows;
  _autoLimitsSum();
}

function _autoLimitsSum(){
  const rows=window._autoLimitsRows||[];
  const r2=v=>Math.round(v*100)/100;
  let sum=0;
  rows.forEach((r,i)=>{ sum+=parseFloat(document.getElementById('al_'+i)?.value)||0; });
  // + již nastavená minima spoření (do 100 % se počítají také)
  let sav=0;
  (S.categories||[]).forEach(c=>{ if((c.type==='expense'||c.type==='both')&&c.isSaving&&c.healthPct>0) sav+=c.healthPct; });
  const total=r2(sum+sav), rem=r2(100-total);
  const el=document.getElementById('autoLimitsSum'); if(!el) return;
  el.innerHTML=`Součet: <span style="color:var(--text)">${r2(sum)} %</span> výdaje${sav>0?` + ${r2(sav)} % spoření (min)`:''}
    · <span style="color:${rem<0?'var(--expense)':'#4ade80'}">${rem<0?'překročeno o '+r2(-rem)+' %':'zbývá '+rem+' % do 100 %'}</span>`;
}

function applyAutoLimits(){
  if(viewingUid) return;
  const rows=window._autoLimitsRows||[];
  const r2=v=>Math.round(v*100)/100;
  let n=0;
  rows.forEach((r,i)=>{
    const v=parseFloat(document.getElementById('al_'+i)?.value);
    const c=(S.categories||[]).find(x=>x.id===r.id); if(!c) return;
    c.healthPct=(isFinite(v)&&v>0)?r2(v):null;
    if(c.healthPct) n++;
  });
  save();
  const ov=document.getElementById('autoLimitsOverlay'); if(ov) ov.remove();
  if(typeof showToast==='function') showToast(`✅ Limity nastaveny u ${n} kategorií`);
  if(typeof renderPage==='function') renderPage();
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

  // 1. VÝDAJOVÉ ZDRAVÍ – v8.72 (TODO-157): napojeno na Dashboard scoring (bodovací tabulka S1
  // Cash flow, výdaje/příjmy → 0–25 b) × 4 = 0–100. Jeden zdroj pravdy pro obě obrazovky.
  let expScore;
  if(totalInc > 0) {
    // v8.73 (TODO-158): detailní tabulka S1 (76 řádků, 0–75 b) → 0–100
    expScore = (typeof msc_S1==='function')
      ? Math.round((msc_S1(totalExp/totalInc)??36)/_SCORING.max.S1*100)
      : (typeof finScoreS1==='function' ? finScoreS1(totalExp/totalInc)*4 : 50);
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
  const savingCats = (D.categories||[]).filter(c => (c.isSaving || c.isInvest) && c.name!=='Virtuální přesun'); // v8.71: virtuální přesun se neboduje
  // v8.72 (TODO-157): napojeno na Dashboard scoring (S4 tabulka: % základu příjmu odloženo) × 4.
  let savingScore = 50;
  let savedRate = null;
  if(savingCats.length > 0 && baseIncome > 0) {
    const totalSaved = savingCats.reduce((a,c) => a + getActual(c.id, null, m, y, D), 0);
    savedRate = totalSaved / baseIncome * 100;
    // v8.73 (TODO-158): tabulka S4 (0–35 b) → 0–100
    savingScore = (typeof msc_S4==='function')
      ? Math.round((msc_S4(savedRate)??17)/_SCORING.max.S4*100)
      : (typeof finScoreS4==='function' ? finScoreS4(savedRate)*4 : 50);
  }

  const overall = Math.round((expScore + budgetScore + savingScore) / 3);
  return { overall, expScore, budgetScore, savingScore, savedRate, baseIncome, totalInc, totalExp };
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
      <div style="font-size:.62rem;color:#a8aec8;margin-top:2px">${mo.label}</div>
      <div style="font-size:.66rem;color:${healthColor(mo.score)}">${healthLabel(mo.score).replace(/^.. /,'')}</div>
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
      <div style="font-size:.68rem;color:#a8aec8;min-width:46px;font-weight:600">${n>1?row.label:''}</div>
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
      .reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A: shodné s getActual()
  }
  const n = periodToMonths(period);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let m = S.curMonth - i, y = S.curYear; while (m < 0) { m += 12; y--; }
    sum += getActual(catId, sub, m, y, D);
  }
  return sum;
}

// ══════════════════════════════════════════════════════
//  v9.62 (TODO-209): DOPLŇUJÍCÍ BLOKY MĚSÍČNÍHO REPORTU
//  Výpočty odděleně od vykreslení – vrací hodnoty, nesahají na globální S.
// ══════════════════════════════════════════════════════

//  „Na co si dát pozor" – pravidla se liší podle délky okna:
//   N = 1 → vzrostlo o víc než 25 % A ZÁROVEŇ o 500 Kč, nebo překročen limit
//   N > 1 → frekvenčně a trendově (kolikrát překročen limit, kolik měsíců v řadě
//           rostlo, odlehlý měsíc nad 2× vlastní medián)
//  Absolutní práh je tam schválně: bez něj by se sem každý měsíc dostalo deset
//  řádků typu „poštovné +40 %" a uživatel by si blok odnaučil číst.
function reportWatchlist(D, nMonths) {
  const out = [];
  const cats = (D.categories || []).filter(c => c.type === 'expense' || c.type === 'both');
  const msSet = new Set(((S.milestones) || []).filter(x => !x.hidden)
    .map(x => String(x.date || '').slice(0, 7)));

  cats.forEach(c => {
    const vals = [];
    for (let i = nMonths - 1; i >= 0; i--) {
      let m = S.curMonth - i, y = S.curYear; while (m < 0) { m += 12; y--; }
      vals.push({ m, y, v: (typeof getActual === 'function') ? getActual(c.id, null, m, y, D) : 0 });
    }
    const limit = c.healthAmt || 0;
    const over = limit > 0 ? vals.filter(x => x.v > limit).length : 0;
    const cur = vals[vals.length - 1] || { v: 0 };
    const explained = msSet.has(`${cur.y}-${String(cur.m + 1).padStart(2, '0')}`);

    if (nMonths === 1) {
      let m0 = S.curMonth - 1, y0 = S.curYear; if (m0 < 0) { m0 = 11; y0--; }
      const prev = (typeof getActual === 'function') ? getActual(c.id, null, m0, y0, D) : 0;
      const d = cur.v - prev;
      if (limit > 0 && cur.v > limit)
        out.push({ lvl: explained ? 'info' : 'high', cat: c,
          t: `${c.name}: překročen limit o ${fmt(Math.round(cur.v - limit))}`,
          d: `${fmt(Math.round(cur.v))} z limitu ${fmt(Math.round(limit))}.` });
      else if (prev > 0 && d > 500 && d / prev > 0.25)
        out.push({ lvl: explained ? 'info' : 'mid', cat: c,
          t: `${c.name}: +${fmt(Math.round(d))} vs. minulý měsíc`,
          d: `Nárůst o ${Math.round(d / prev * 100)} %. Práh je 25 % a zároveň 500 Kč, aby sem nepadaly drobnosti.` });
    } else {
      if (over >= 2)
        out.push({ lvl: 'high', cat: c,
          t: `${c.name}: limit překročen v ${over} z ${nMonths} měsíců`,
          d: `Systematické, ne jednorázový výkyv – limit buď nedodržuješ, nebo je nastavený mimo realitu.` });
      let rise = 0;
      for (let i = 1; i < vals.length; i++) if (vals[i].v > vals[i - 1].v) rise++; else rise = 0;
      if (rise >= 2 && cur.v > 500)
        out.push({ lvl: 'mid', cat: c,
          t: `${c.name}: rostla ${rise + 1} měsíce v řadě`,
          d: vals.map(x => fmt(Math.round(x.v))).join(' → ') + ' Kč.' });
      const nz = vals.map(x => x.v).filter(v => v > 0).sort((a, b) => a - b);
      if (nz.length >= 3) {
        const med = nz[Math.floor(nz.length / 2)];
        const peak = vals.reduce((a, b) => b.v > a.v ? b : a, vals[0]);
        if (med > 0 && peak.v > med * 2 && peak.v - med > 1000)
          out.push({ lvl: 'mid', cat: c,
            t: `${c.name}: ${CZ_M[peak.m]} ${fmt(Math.round(peak.v))}, jinak kolem ${fmt(Math.round(med))}`,
            d: 'Jeden měsíc nad dvojnásobkem vlastního mediánu. Pokud šlo o jednorázovou událost, je vše v pořádku – jen ať ti nezmizí v průměru.' });
      }
    }
  });
  const rank = { high: 0, mid: 1, info: 2 };
  return out.sort((a, b) => rank[a.lvl] - rank[b.lvl]).slice(0, 6);
}

//  Výsledky hodnocení útrat – data se sbírají od S17, ale nikde se nezobrazovala.
//  „Co se nejvíc změnilo" – pět kategorií s největším POHYBEM proti minulému
//  měsíci (v obou směrech). Uživatele nezajímá tabulka osmnácti kategorií,
//  zajímá ho pět řádků, které se pohnuly; zbytek je šum.
//  v9.72: seznam měsíců ve zvoleném okně – bloky 11–14 kumulují přes celé
//  období, ne jen přes aktuální měsíc. Do teď ukazovaly data jednoho měsíce
//  uvnitř sekce nadepsané „6 měsíců", což bylo zavádějící.
function _repWindowMonths(nMonths) {
  const out = [];
  for (let i = nMonths - 1; i >= 0; i--) {
    let m = S.curMonth - i, y = S.curYear;
    while (m < 0) { m += 12; y--; }
    out.push({ m, y, ym: `${y}-${String(m + 1).padStart(2, '0')}` });
  }
  return out;
}

function reportBiggestMoves(D, m, y) {
  let pm = m - 1, py = y; if (pm < 0) { pm = 11; py--; }
  const rows = (D.categories || [])
    .filter(c => c.type === 'expense' || c.type === 'both')
    .map(c => {
      const now = (typeof getActual === 'function') ? getActual(c.id, null, m, y, D) : 0;
      const prev = (typeof getActual === 'function') ? getActual(c.id, null, pm, py, D) : 0;
      return { c, now, prev, d: now - prev, pct: prev > 0 ? (now - prev) / prev * 100 : null };
    })
    .filter(r => Math.abs(r.d) >= 100)          // pod stovku je to šum
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 5);
  return rows;
}

function reportRatingSummary(D, m, y) {
  const ym = `${y}-${String(m + 1).padStart(2, '0')}`;
  const txs = (D.transactions || []).filter(t => t && t.type === 'expense' &&
    !t.splitParent && !t.isBalancing && String(t.date || '').slice(0, 7) === ym &&
    !(typeof isTransferTx === 'function' && isTransferTx(t)));
  const items = [];
  (S.receipts || []).forEach(r => {
    if (String(r.date || '').slice(0, 7) !== ym) return;
    (r.items || []).forEach(it => { if (it && it.priority) items.push(it); });
  });
  const ratedTx = txs.filter(t => t.priority);
  const all = ratedTx.map(t => ({ p: t.priority, a: Math.abs(txCZK(t, D)), n: t.name || 'Bez názvu' }))
    .concat(items.map(it => ({ p: it.priority,
      a: (typeof lineAmt === 'function') ? lineAmt(it) : (it.price || 0) * (it.qty || 1),
      n: it.name || 'Položka' })));
  if (!all.length) return null;
  const sum = all.reduce((a, x) => a + x.a, 0);
  return {
    count: all.length,
    avg: all.reduce((a, x) => a + x.p, 0) / all.length,
    good: all.filter(x => x.p >= 4).reduce((a, x) => a + x.a, 0),
    bad: all.filter(x => x.p <= 2).reduce((a, x) => a + x.a, 0),
    sum,
    worst: all.filter(x => x.p <= 2).sort((a, b) => b.a - a.a).slice(0, 3),
  };
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
  ${_reportPeriod==='advisor' ? '' : `<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:.74rem;color:#a8aec8">
    <span>Vlastní počet měsíců:</span>
    <button onclick="reportSetMonths(${Math.max(1,curN-1)})" style="width:26px;height:26px;border:none;border-radius:7px;background:var(--surface2);color:var(--text);cursor:pointer;font-size:1rem;line-height:1">−</button>
    <span style="min-width:54px;text-align:center;font-weight:700;color:${isCustom?'var(--bank)':'var(--text)'}">${curN+' měs.'}</span>
    <button onclick="reportSetMonths(${Math.min(12,curN+1)})" style="width:26px;height:26px;border:none;border-radius:7px;background:var(--surface2);color:var(--text);cursor:pointer;font-size:1rem;line-height:1">+</button>
    <span style="font-size:.68rem">(1–12)</span>
  </div>`}`;

  // Záložka Poradce
  if (_reportPeriod === 'advisor') {
    // S17.21 (FIX-217, Milan): #reportSouhrn je SOUROZENEC #reportContent, takže přepsání
    // obsahu Poradce ho nesmaže. Tahle větev navíc končí early `return` PŘED úklidem na konci
    // funkce → po přepnutí z 1M na Poradce zůstal v DOM starý „Souhrn výdajů / Výdaje vzrostly".
    // Proto se maže hned tady.
    { const _sEl = document.getElementById('reportSouhrn'); if(_sEl) _sEl.innerHTML = ''; }
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
  // S16.15 (Milan – „proč 75 vs 83?"): banner dřív průměroval jen ZOBRAZENÉ dlaždice
  //   (jen s výdaji > 0, vč. spořicích), zatímco složka Rozpočtové průměruje VŠECHNY
  //   limitované výdajové kategorie – i ty s nulovým výdajem (limit dodržen → 100).
  //   Sjednoceno: banner nyní počítá ze STEJNÉ množiny jako Rozpočtové → čísla si sedí.
  let _hlTracked=0, _hlMet=0, _hlScoreSum=0, _hlShown=0;
  expCats.forEach(cat=>{
    const _sp = getActualRange(cat.id, null, _reportPeriod, D);
    const _sc2 = computeCatHealth(cat, _sp, scores.baseIncome);
    if(_sc2===null) return;               // bez limitu se nehodnotí
    _hlTracked++; _hlScoreSum+=_sc2;
    const _lp2=(cat.healthPct>0&&scores.baseIncome>0)?scores.baseIncome*cat.healthPct/100:Infinity;
    const _la2=cat.healthAmt||Infinity;
    const _e2=(cat.isSaving||cat.isInvest)?Math.max((cat.healthPct>0&&scores.baseIncome>0)?scores.baseIncome*cat.healthPct/100:0,cat.healthAmt||0):Math.min(_lp2,_la2);
    if((cat.isSaving||cat.isInvest)?(_sp>=_e2):(_sp<=_e2)) _hlMet++;
  });
  const _hlScored=_hlTracked;
  const catRows = expCats.map(cat => {
    const spent = getActualRange(cat.id, null, _reportPeriod, D);
    if(spent === 0 && !cat.isSaving) return null;
    const score = computeCatHealth(cat, spent, scores.baseIncome);
    // v8.63: efektivní limit vč. Kč stropu; procento vztažené k ZÁKLADU příjmu (stejná báze jako plán)
    const _lp = (cat.healthPct>0 && scores.baseIncome>0) ? scores.baseIncome*cat.healthPct/100 : Infinity;
    const _la = cat.healthAmt || Infinity;
    const _eff = (cat.isSaving||cat.isInvest)
      ? Math.max((cat.healthPct>0&&scores.baseIncome>0)?scores.baseIncome*cat.healthPct/100:0, cat.healthAmt||0)
      : Math.min(_lp, _la);
    const limitPct = (cat.isSaving||cat.isInvest)
      ? (cat.healthPct ? `min ${cat.healthPct} %` : (cat.healthAmt ? `min ${fmt(cat.healthAmt)} Kč` : '–'))
      : (_eff===Infinity ? '–' : (_la < _lp ? `strop ${fmt(cat.healthAmt)} Kč` : `${cat.healthPct} % základu`));
    const limitAmt = cat.healthAmt ? fmt(cat.healthAmt) : (cat.isSaving ? 'min' : '–');
    const pctOfInc = scores.baseIncome > 0 ? Math.round(spent/scores.baseIncome*100) : (totalInc > 0 ? Math.round(spent/totalInc*100) : 0);
    const planAmt = (_eff>0 && _eff!==Infinity) ? fmt(Math.round(_eff)) : '–';
    // v8.64: kategorie BEZ limitu se nehodnotí – šedý bar + „–" místo matoucího zeleného 75
    const noLimit = (score === null);
    const sc = noLimit ? null : score;
    _hlShown++;
    const barW = noLimit ? 100 : Math.min(100, sc);
    const scColor = noLimit ? '#565c74' : healthColor(sc);
    const scPill  = noLimit ? '–' : sc;
    const trend = (() => {
      // S16 (TODO-163): trend = změna vs předchozí stejně dlouhé období, VŽDY oranžově, srovnání v tooltipu
      let prev = 0;
      for (let i = 0; i < periodMonths; i++) {
        let m = S.curMonth - periodMonths - i, y = S.curYear; while (m < 0) { m += 12; y--; }
        prev += getActual(cat.id, null, m, y, D);
      }
      if(!prev) return '';
      const d = Math.round((spent-prev)/prev*100);
      const tip = ` title="vs. předchozí období: ${fmt(prev)}"`;
      return d > 5 ? `<span style="color:#fbbf24;font-size:.66rem"${tip}>↑${d}%</span>` :
             d < -5 ? `<span style="color:var(--income);font-size:.66rem"${tip}>↓${Math.abs(d)}%</span>` :
             `<span style="color:#a8aec8;font-size:.66rem"${tip}>↔</span>`;
    })();
    // S16 (TODO-163): kompaktní dlaždice – tenký bar s částkou/plánem uvnitř, bez podkategorií, trend oranžově
    return `<div class="cat-tile" title="${cat.name}: ${fmt(spent)}${noLimit?'':' / plán '+planAmt+' ('+limitPct+')'}">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        <span style="font-size:.95rem;flex-shrink:0">${cat.icon}</span>
        <span style="flex:1;min-width:0;font-weight:600;font-size:.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cat.name}</span>
        <span class="health-score-pill" style="color:${scColor};min-width:auto;font-size:.76rem">${scPill}</span>
      </div>
      <div class="cat-tile-bar">
        <div class="cat-tile-fill" style="width:${barW}%;background:${scColor};${noLimit?'opacity:.4':''}"></div>
        <div class="cat-tile-txt">${fmt(spent)}${noLimit?'':' / '+planAmt}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;font-size:.66rem;color:#a8aec8;gap:6px">
        <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${pctOfInc} % základu${noLimit?' · bez limitu':''}</span>
        ${trend}
      </div>
    </div>`;
  }).filter(Boolean).join('');

  //  v9.58: body ze složky S1 (0–75) – pro banner, ať je vidět celý řetězec výpočtu
  const _s1pts = (totalInc > 0 && typeof msc_S1 === 'function')
    ? (msc_S1(totalExp / totalInc) ?? null)
    : (totalInc > 0 && typeof finScoreS1 === 'function' ? finScoreS1(totalExp / totalInc) * 3 : null);

  el.innerHTML = tabBar + `
    <div class="report-section-title">📊 1 · ${periodLabel} — přehled období</div>
    <div class="report-stat-grid">
      <!-- v9.64: popisky říkají, PROTI ČEMU se porovnává. Dřív jen „min. 70 000"
           a „↓91 %" bez uvedení měsíce – nedalo se poznat, s čím se to srovnává. -->
      ${(()=>{ let pm=S.curMonth-1, py=S.curYear; if(pm<0){pm=11;py--;}
        const pl = nMonths===1 ? CZ_M[pm].toLowerCase() : 'předchozí období';
        const incDiff = (prevInc>0) ? Math.round((totalInc-prevInc)/prevInc*100) : null;
        const arrow = (d,goodDown)=> d===null ? '' :
          `<span style="color:${(goodDown? d>0 : d<0) ? 'var(--expense)':'var(--income)'}">${d>0?'↑':'↓'}${Math.abs(d)} %</span> <span style="color:#a8aec8">vs ${pl}</span>`;
        return `
      <div class="stat-card income"><div class="stat-label">Příjmy</div><div class="stat-value up">${fmt(totalInc)}</div>
        <div class="stat-sub" style="font-size:.68rem">${incDiff!==null?arrow(incDiff,false):(prevInc?'minule '+fmt(prevInc):'bez srovnání')}</div></div>
      <div class="stat-card expense"><div class="stat-label">Výdaje</div><div class="stat-value down">${fmt(totalExp)}</div>
        <div class="stat-sub" style="font-size:.68rem">${expDiff!==null?arrow(expDiff,true):'bez srovnání'}</div></div>
      <div class="stat-card balance"><div class="stat-label">Saldo</div><div class="stat-value ${saldo>=0?'up':'down'}">${fmt(saldo)}</div>
        <div class="stat-sub" style="font-size:.68rem">${saldo>=0?'zůstalo ti':'utratil jsi víc, než přišlo'}</div></div>`;
      })()}
      <div class="stat-card bank"><div class="stat-label">Základ příjmu</div><div class="stat-value bankc">${fmt(scores.baseIncome)}</div><div class="stat-sub" style="font-size:.68rem">prům. 3 měs.</div></div>
    </div>

    <!-- v9.58: banner ukazuje, JAK skóre vzniklo. Dřív se dalo jen hádat,
         proč je Výdajové zrovna 89 – tabulka S1 má rozsah 0–75 b, teprve
         přepočet na 0–100 dá číslo, které je vidět v kartě. -->
    <div class="card" style="margin-bottom:14px;border-color:rgba(96,165,250,.3)">
      <div class="card-body" style="padding:11px 14px;display:flex;gap:16px;flex-wrap:wrap;align-items:center">
        <div style="font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#93c5fd">2 · Výpočet výdajového zdraví</div>
        <div style="font-size:.82rem;color:#c9cede">
          ${fmt(totalExp)} ÷ ${fmt(totalInc)} =
          <b style="color:var(--text)">${totalInc>0?(totalExp/totalInc).toFixed(2).replace('.',','):'–'}</b>
          &nbsp;→&nbsp; tabulka S1 <b style="color:var(--text)">${_s1pts!==null?_s1pts+'/75 b':'–'}</b>
          &nbsp;→&nbsp; skóre <b style="color:${healthColor(scores.expScore)}">${scores.expScore}/100</b>
        </div>
      </div>
    </div>

    ${(()=>{
      const wl = reportWatchlist(D, nMonths);
      if (!wl.length) return `
        <div class="card" style="margin-bottom:14px;border-color:rgba(74,222,128,.25)">
          <div class="card-body" style="padding:12px 14px;font-size:.8rem;color:#c9cede">
            ✅ <b>Nic, co by stálo za pozornost.</b>
            <span style="color:#a8aec8">Prověřeno ${nMonths===1?'proti minulému měsíci':'napříč '+nMonths+' měsíci'}:
            žádná kategorie nepřekročila limit ani nevyskočila nad obvyklou hodnotu.</span>
          </div>
        </div>`;
      const st = { high:['rgba(248,113,113,.1)','var(--expense)','🔴'],
                   mid:['rgba(251,191,36,.09)','var(--debt)','🟡'],
                   info:['rgba(96,165,250,.08)','#60a5fa','ℹ️'] };
      return `
      <div class="report-section-title">⚠️ 3 · Na co si dát pozor</div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-body" style="padding:12px 14px">
          ${wl.map(w=>{ const [bg,bd,ic]=st[w.lvl];
            return `<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 11px;border-radius:0 9px 9px 0;margin-bottom:7px;background:${bg};border-left:3px solid ${bd}">
              <span style="flex-shrink:0">${ic}</span>
              <div><div style="font-size:.82rem;font-weight:700">${w.cat.icon||''} ${w.t}</div>
              <div style="font-size:.72rem;color:#a8aec8;line-height:1.5;margin-top:1px">${w.d}${w.lvl==='info'?' <b>Ve stejném měsíci máš milník ve Životní mapě – nejspíš to má vysvětlení.</b>':''}</div></div>
            </div>`; }).join('')}
        </div>
      </div>`;
    })()}

    ${(()=>{
      if(nMonths!==1) return '';
      const mv = reportBiggestMoves(D, S.curMonth, S.curYear);
      if(!mv.length) return '';
      let pm=S.curMonth-1, py=S.curYear; if(pm<0){pm=11;py--;}
      return `
      <div class="report-section-title">🔀 4 · Co se nejvíc změnilo vs. ${CZ_M[pm]}</div>
      <div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:6px 14px 12px">
        ${mv.map(r=>`
          <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:.86rem">${r.c.icon||''} ${r.c.name}</span>
            <span style="margin-left:auto;font-family:Syne,sans-serif;font-weight:800;font-size:.92rem;color:${r.d>0?'var(--expense)':'var(--income)'};min-width:110px;text-align:right">
              ${r.d>0?'+':'−'}${fmt(Math.abs(Math.round(r.d)))} Kč</span>
            <span style="font-size:.72rem;color:#a8aec8;min-width:62px;text-align:right">${r.pct===null?'nové':(r.pct>0?'+':'')+Math.round(r.pct)+' %'}</span>
          </div>`).join('')}
        <div style="font-size:.7rem;color:#8b93ad;margin-top:8px">Pět největších pohybů proti měsíci ${CZ_M[pm]}. Změny pod 100 Kč se neukazují.</div>
      </div></div>`;
    })()}

    <div id="reportSouhrnInline"></div>

    <div class="report-section-title">💚 6 · Rozpočtové zdraví dle kategorií</div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-body">
        <div style="background:var(--surface2);border-radius:9px;padding:9px 12px;margin-bottom:12px;font-size:.7rem;color:#a8aec8;line-height:1.6">
          <div style="display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:4px">
            <span>📊 <strong style="color:var(--text2)">Částka</strong> = výdaje za období</span>
            <span>📈 <strong style="color:var(--text2)">trend</strong> = vs minulé období</span>
            <span><span class="health-score-pill" style="color:var(--income)">75</span> = <strong style="color:var(--text2)">skóre kategorie</strong> (0–100)</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:4px">
            <span><span style="color:#4ade80">🟢 zelená</span> v limitu</span>
            <span><span style="color:#fbbf24">🟡 žlutá</span> blíží se limitu</span>
            <span><span style="color:#f87171">🔴 červená</span> překročen limit kategorie</span>
            <span><span style="color:#8b90a8">⚪ šedá</span> bez limitu – nehodnotí se</span>
          </div>
          <div style="color:#a8aec8">ℹ️ Plán i % se počítají ze <strong style="color:var(--text)">Základu příjmu ${fmt(scores.baseIncome)}</strong> (vážený průměr stabilních příjmů za 3 měsíce), ne z příjmu aktuálního měsíce.</div>
        </div>
        ${catRows?`
        <div style="display:flex;flex-wrap:wrap;gap:8px 22px;align-items:center;background:linear-gradient(135deg,rgba(139,124,246,.08),rgba(74,222,128,.06));border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin-bottom:12px">
          <span style="font-size:.78rem;color:#c9cede">📊 Sledovaných kategorií: <strong style="color:var(--text);font-size:.9rem">${_hlTracked}</strong><span style="color:#a8aec8"> s limitem (${_hlShown} dlaždic s výdaji)</span></span>
          <span style="font-size:.78rem;color:#c9cede">✅ Splněno: <strong style="color:${_hlTracked&&_hlMet===_hlTracked?'var(--income)':_hlMet>=_hlTracked*0.7?'#fbbf24':'var(--expense)'};font-size:.9rem">${_hlMet}/${_hlTracked}</strong><span style="color:#a8aec8"> v limitu</span></span>
          <span style="font-size:.78rem;color:#c9cede">⭐ Skóre: <strong style="color:${healthColor(_hlScored?Math.round(_hlScoreSum/_hlScored):0)};font-size:.9rem" title="Průměr všech limitovaných kategorií vč. nulových (limit dodržen = 100) – stejná množina jako složka Rozpočtové">${_hlScored?Math.round(_hlScoreSum/_hlScored):'–'}</strong><span style="color:#a8aec8"> (= Rozpočtové)</span></span>
        </div>
        <div class="cat-health-grid">${catRows}</div>`:'<div class="empty"><div class="et">Žádné výdaje v tomto období</div></div>'}
      </div>
    </div>

    <!-- v9.58: Úsporové zdraví chybělo úplně, přestože je to jedna ze tří
         složek, které se o pár řádků níž hodnotí. -->
    <div class="report-section-title">💎 7 · Úsporové zdraví</div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-body" style="padding:15px">
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
          ${(()=>{ const v=scores.savingScore, c=healthColor(v), R=34, C=2*Math.PI*R;
            return `<svg width="88" height="88" viewBox="0 0 88 88" style="flex-shrink:0">
              <circle cx="44" cy="44" r="${R}" fill="none" stroke="var(--surface3)" stroke-width="9"/>
              <circle cx="44" cy="44" r="${R}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"
                stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-v/100)).toFixed(1)}" transform="rotate(-90 44 44)"/>
              <text x="44" y="49" text-anchor="middle" font-family="Syne,sans-serif" font-size="21" font-weight="800" fill="${c}">${v}</text>
            </svg>`; })()}
          <div style="flex:1;min-width:210px">
            <div style="font-size:.9rem;font-weight:800;color:${healthColor(scores.savingScore)};margin-bottom:3px">
              ${scores.savingScore>=80?'Odkládáš výborně':scores.savingScore>=50?'Odkládáš slušně':scores.savingScore>0?'Odkládáš málo':'Tento měsíc jsi neodložil nic'}
            </div>
            <div style="font-size:.76rem;color:#c9cede;line-height:1.6">
              ${(()=>{ const base=scores.baseIncome||0;
                //  savedRate je UŽ v procentech (viz computeHealthScores), ne podíl
                const pct = Math.round(scores.savedRate||0);
                return base>0
                  ? `Ze Základu příjmu <b>${fmt(Math.round(base))} Kč</b> jsi odložil <b>${pct} %</b> do 📈 investic a spořicích kategorií.`
                  : 'Bez příjmu nelze poměr spočítat.'; })()}
              ${scores.savingScore===0?'<br><span style="color:#a8aec8">Jakmile zadáš převod do spoření nebo investice, číslo se zvedne.</span>':''}
            </div>
            <div style="font-size:.7rem;color:#8b93ad;margin-top:7px;padding-top:6px;border-top:1px solid var(--border)">
              Měří <b>tok</b> (kolik jsi odložil tenhle měsíc), ne <b>stav</b> (kolik už máš). Stav najdeš v Rezervě níž.
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="report-section-title">🏆 8 · Celkové finanční zdraví</div>
    <div class="grid2" style="margin-bottom:16px;align-items:start">
      <div class="card" style="text-align:center;padding:24px">
        ${(nMonths >= 2)
          ? `<div id="healthGridContainer"><div style="color:#a8aec8;font-size:.8rem">Načítám…</div></div>`
          : `<canvas id="mainHealthRing"></canvas>
        <div class="health-score-label" style="color:${healthColor(scores.overall)}">${scores.overall}</div>
        <div class="health-score-sub">${healthLabel(scores.overall)}</div>
        <div id="reportScoreCompare" style="margin-top:14px;text-align:left"></div>`}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">3 složky zdraví ${nMonths>=2?`(${nMonths} měsíců)`:''}</span></div>
        <div class="card-body">
          <!-- Popisky nad polem hodnot -->
          <div style="display:grid;grid-template-columns:auto repeat(3,1fr);gap:6px 8px;align-items:center;margin-bottom:8px">
            <div></div>
            <div style="text-align:center;font-size:.66rem;color:#a8aec8;font-weight:700;text-transform:uppercase;letter-spacing:.03em">Výdajové</div>
            <div style="text-align:center;font-size:.66rem;color:#a8aec8;font-weight:700;text-transform:uppercase;letter-spacing:.03em">Rozpočtové</div>
            <div style="text-align:center;font-size:.66rem;color:#a8aec8;font-weight:700;text-transform:uppercase;letter-spacing:.03em">Úsporové</div>
          </div>
          <div id="comp3Grid"><div style="color:#a8aec8;font-size:.8rem">Načítám…</div></div>
          <div style="font-size:.72rem;color:#a8aec8;line-height:1.6;margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
            <div><strong style="color:var(--text)">Výdajové</strong> – poměr výdaje/příjmy (složka S1 Cash flow, 0–75 b) přepočtený na 0–100.</div>
            <div><strong style="color:var(--text)">Rozpočtové</strong> – dodržování nastavených limitů kategorií (průměr skóre).</div>
            <div><strong style="color:var(--text)">Úsporové</strong> – aktivní spoření: % Základu příjmu odložené tento měsíc do 📈 investic a spořicích kategorií (složka S4, 0–35 b) přepočtené na 0–100.</div>
          </div>
          ${(()=>{ // v9.60 (FIX-231): maximum se čte ze složky, dřív bylo natvrdo /25.
            //  Škála 0–25 už neexistuje – Cash flow má 0–75, Rezerva 0–50, Spoření 0–35.
            if(typeof computeFinancialScore!=='function') return '';
            try{
              const fs=computeFinancialScore(D);
              const pick=l=>fs.components.find(c=>c.label.includes(l))||null;
              const cf=pick('Cash flow'), rz=pick('Rezerva'), sp=pick('Spoření');
              const one=(ic,name,c,note)=>c?`<span title="${note}">${ic} ${name} <strong style="color:var(--text)">${c.score}/${c.max}</strong></span>`:'';
              return `<div style="display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.74rem;margin-top:8px;background:var(--surface2);border-radius:10px;padding:8px 12px">
                <span style="color:#a8aec8;font-weight:700">Body do skóre 0–310:</span>
                ${one('💰','Cash flow',cf,'Totéž co Výdajové zdraví výše, jen v jiné škále')}
                ${one('💎','Spoření/Investice',sp,'Totéž co Úsporové zdraví výše, jen v jiné škále')}
                ${one('🛟','Rezerva',rz,'Samostatná složka – kolik měsíců výdajů máš odloženo. Do Úsporového zdraví nevstupuje.')}
              </div>
              <div style="font-size:.68rem;color:#a8aec8;margin-top:5px;line-height:1.5">
                💎 <b>Spoření/Investice</b> je přímý ekvivalent <b>Úsporového zdraví</b> (obojí složka S4, jen 0–35 vs. 0–100).
                🛟 <b>Rezerva</b> je něco jiného – měří <b>stav</b> (kolik už máš odloženo), ne <b>tok</b> (kolik odkládáš tento měsíc).
              </div>`;
            }catch(e){ return ''; }
          })()}
        </div>
      </div>
    </div>

    <!-- Session 10: Graf finančního skóre v čase (dle zvolené periody) -->
    <div class="report-section-title">📈 9 · Vývoj finančního skóre</div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:12px 8px">
        <div id="reportScoreChartContainer">
          <div style="color:#a8aec8;font-size:.8rem;padding:16px;text-align:center">Načítám graf…</div>
        </div>
        <div id="reportScoreAxisNote" style="font-size:.68rem;color:#a8aec8;margin-top:6px;text-align:center"></div>
      </div>
    </div>

    ${(()=>{
      // ── Stav bohatství ── report dosud končil u toku peněz; otázka „jsem na tom líp?"
      //    se ale ptá na STAV, ne na tok.
      let nwHtml = '';
      try{
        const nw = (typeof computeAssetsNetWorth==='function') ? computeAssetsNetWorth(D) : null;
        const liq = (typeof assetLiqTotals==='function') ? assetLiqTotals(D) : null;
        const liqNow = liq ? ((liq.wallets||0)+(liq.reserve||0)) : 0;
        const mExp = totalExp || 0;
        if(nw) nwHtml = `
          <div class="report-section-title">💰 10 · Stav bohatství k ${new Date(S.curYear,S.curMonth+1,0).getDate()}. ${S.curMonth+1}.</div>
          <div class="report-stat-grid" style="margin-bottom:14px">
            <div class="stat-card ${nw.netWorth>=0?'income':'expense'}">
              <div class="stat-label">Čisté jmění</div>
              <div class="stat-value ${nw.netWorth>=0?'up':'down'}">${fmt(Math.round(nw.netWorth))}</div>
              <div class="stat-sub" style="font-size:.68rem">majetek ${fmt(Math.round(nw.totalAssets+nw.totalWallets))} − dluhy ${fmt(Math.round(nw.totalDebts))}</div></div>
            <div class="stat-card ${nw.totalDebts>0?'debt':'income'}">
              <div class="stat-label">Dluhy</div>
              <div class="stat-value" style="color:${nw.totalDebts>0?'var(--debt)':'var(--income)'}">${fmt(Math.round(nw.totalDebts))}</div>
              <div class="stat-sub" style="font-size:.68rem">${nw.totalDebts>0?'celkem k doplacení':'bez dluhů'}</div></div>
            <div class="stat-card bank">
              <div class="stat-label">Rezerva vydrží</div>
              <div class="stat-value" style="color:${mExp>0&&liqNow/mExp>=3?'var(--income)':'var(--debt)'}">${mExp>0?(liqNow/mExp).toFixed(1).replace('.',',')+' měs.':'–'}</div>
              <div class="stat-sub" style="font-size:.68rem">${fmt(Math.round(liqNow))} při výdajích ${fmt(Math.round(mExp))}</div></div>
          </div>`;
      }catch(e){}

      // ── Z účtenek ── tohle umí jen FinanceFlow a v souhrnu to dosud chybělo
      let recHtml = '';
      try{
        const _wm = _repWindowMonths(nMonths).map(x=>x.ym);
        const recs = (S.receipts||[]).filter(r=>_wm.includes(String(r.date||'').slice(0,7)));
        //  v9.65: blok se zobrazí VŽDY. Když v měsíci nejsou účtenky, řekne to
        //  a vysvětlí, co by přinesly – tiché zmizení sekce vypadá jako chyba
        //  a uživatel netuší, že mu něco uniká (SKILL 22).
        if(!recs.length){
          recHtml = `
          <div class="report-section-title">🧾 11 · Z účtenek ${nMonths===1?'tohoto měsíce':nMonths+' měsíců'}</div>
          <div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:14px">
            <div style="font-size:.82rem;color:#c9cede">${nMonths===1?`V ${CZ_M[S.curMonth].toLowerCase()} nemáš`:`Za ${nMonths} měsíců nemáš`} naskenovanou žádnou účtenku.</div>
            <div style="font-size:.74rem;color:#a8aec8;line-height:1.6;margin-top:5px">
              Účtenky rozpadnou nákup na jednotlivé položky – uvidíš, za co konkrétně jsi utratil,
              jak se mění ceny věcí, které opravdu kupuješ, a kde se zmenšilo balení při stejné ceně.
              <a href="#" onclick="if(typeof showPage==='function')showPage('receipts');return false" style="color:#60a5fa;text-decoration:none">Přidat účtenku →</a>
            </div>
          </div></div>`;
        } else {
          const nItems = recs.reduce((a,r)=>a+((r.items||[]).length),0);
          const sum = recs.reduce((a,r)=>a+(r.total||0),0);
          const stores = {};
          recs.forEach(r=>{ const st=(typeof normalizeStoreName==='function')?normalizeStoreName(r.store):(r.store||'?');
            stores[st]=(stores[st]||0)+(r.total||0); });
          const top = Object.entries(stores).sort((a,b)=>b[1]-a[1])[0];
          const cheap = Object.entries(stores).sort((a,b)=>a[1]-b[1])[0];
          //  v9.66: ušetřeno na slevách – součet rozdílů mezi běžnou a akční cenou.
          //  Bereme jen položky, které slevu skutečně nesou; ostatní se ignorují.
          let saved = 0;
          recs.forEach(r=>(r.items||[]).forEach(it=>{
            const d = (it.discount!=null) ? Math.abs(it.discount)
                    : (it.priceOrig>0 && it.price>0 && it.priceOrig>it.price)
                      ? (it.priceOrig-it.price)*(it.qty||1) : 0;
            if(d>0) saved += d;
          }));
          const row = (l,v,sub,col)=>`
            <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:.84rem">${l}</span>
              <span style="margin-left:auto;font-family:Syne,sans-serif;font-weight:800;font-size:.95rem;color:${col||'var(--text)'}">${v}</span>
              ${sub?`<span style="font-size:.7rem;color:#a8aec8;min-width:74px;text-align:right">${sub}</span>`:''}
            </div>`;
          recHtml = `
          <div class="report-section-title">🧾 11 · Z účtenek ${nMonths===1?'tohoto měsíce':nMonths+' měsíců'}</div>
          <div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:6px 14px 12px">
            ${row('Naskenováno účtenek', recs.length, nItems+' položek')}
            ${row('Utraceno na účtenkách', fmt(Math.round(sum))+' Kč')}
            ${row('💚 Ušetřeno na slevách', saved>0?fmt(Math.round(saved))+' Kč':'–',
                  saved>0&&sum>0?Math.round(saved/(sum+saved)*100)+' % z nákupu':'', saved>0?'var(--income)':'#a8aec8')}
            ${top?row('Nejvíc utraceno', top[0], fmt(Math.round(top[1]))+' Kč'):''}
            ${cheap&&top&&cheap[0]!==top[0]?row('Nejmenší útrata', cheap[0], fmt(Math.round(cheap[1]))+' Kč'):''}
            <div style="font-size:.72rem;color:#a8aec8;margin-top:9px;line-height:1.55">
              Vývoj cen jednotlivých položek, tvoji osobní inflaci a detekci shrinkflace najdeš v
              <a href="#" onclick="if(typeof showPage==='function')showPage('receipts');return false" style="color:#60a5fa;text-decoration:none"><b>Účtenkách → Zdražování</b> →</a>
            </div>
          </div></div>`;
        }
      }catch(e){}

      // ── Milníky období ── kontext, ne hodnocení
      let msHtml = '';
      try{
        const _wm2 = _repWindowMonths(nMonths).map(x=>x.ym);
        const ms = ((S.milestones)||[]).filter(x=>!x.hidden && _wm2.includes(String(x.date||'').slice(0,7)));
        if(!ms.length) msHtml = `
          <div class="report-section-title">🗺️ 12 · Milníky období</div>
          <div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:14px">
            <div style="font-size:.82rem;color:#c9cede">${nMonths===1?`V ${CZ_M[S.curMonth].toLowerCase()}`:`Za ${nMonths} měsíců`} nemáš označenou žádnou událost.</div>
            <div style="font-size:.74rem;color:#a8aec8;line-height:1.6;margin-top:5px">
              Milníky jako změna práce, hypotéka nebo stěhování vysvětlují skoky v číslech výše.
              Označíš je v <b>Životní mapě</b> a report je pak sám připojí k měsíci, kterého se týkají.
              <a href="#" onclick="if(typeof showPage==='function')showPage('denik');return false" style="color:#60a5fa;text-decoration:none">Otevřít Životní mapu →</a>
            </div>
          </div></div>`;
        else msHtml = `
          <div class="report-section-title">🗺️ 12 · Milníky období</div>
          <div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:12px 14px">
            ${ms.map(x=>`<div style="display:flex;gap:9px;align-items:baseline;padding:4px 0">
              <span>${x.icon||'📌'}</span><b style="font-size:.84rem">${String(x.label||'').replace(/</g,'&lt;')}</b>
              <span style="font-size:.7rem;color:#a8aec8">${new Date(x.date).toLocaleDateString('cs-CZ')}</span>
            </div>${x.note?`<div style="font-size:.72rem;color:#a8aec8;line-height:1.5;margin:0 0 6px 26px">${String(x.note).replace(/</g,'&lt;')}</div>`:''}`).join('')}
            <div style="font-size:.7rem;color:#8b93ad;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);line-height:1.55">
              Zlomové události, které sis označil v <b>Životní mapě</b> (Deník). Vysvětlují skoky v číslech výše &mdash;
              nárůst v měsíci s hypotékou není odchylka, ale nový trvalý závazek. <b>Skóre neovlivňují.</b>
              <a href="#" onclick="if(typeof showPage==='function')showPage('denik');return false" style="color:#60a5fa;text-decoration:none;margin-left:4px">Otevřít Životní mapu →</a>
            </div>
          </div></div>`;
      }catch(e){}

      // ── Výhled ── report se dosud díval jen dozadu
      let fwHtml = '';
      try{
        let nm=S.curMonth+1, ny=S.curYear; if(nm>11){nm=0;ny++;}
        //  Známé budoucí platby bereme z budouciGetAll() (šablony + naplánované),
        //  predikci sečteme přes predictCat() po kategoriích – obojí už v appce je,
        //  nic se nepočítá znovu (SKILL 17).
        let plan = null;
        if(typeof budouciGetAll==='function'){
          const first=new Date(ny,nm,1), last=new Date(ny,nm+1,0);
          const days=Math.ceil((last-new Date())/86400000)+1;
          const all=budouciGetAll(D, Math.max(1,days));
          plan=all.filter(it=>{ const d=new Date(it.date||it.datum);
              return !isNaN(d) && d.getMonth()===nm && d.getFullYear()===ny; })
            .reduce((a,it)=>a+Math.abs(it.amount||it.castka||0),0);
        }
        let pred = null;
        if(typeof predictCat==='function'){
          pred=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both')
            .reduce((a,c)=>{ const v=predictCat(c.id,null,nm,ny,D); return a+(typeof v==='number'&&!isNaN(v)?v:0); },0);
          if(!pred) pred=null;
        }
        if(plan!==null || pred!==null) fwHtml = `
          <div class="report-section-title">🔮 13 · Výhled na ${CZ_M[nm]}</div>
          <div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:6px 14px 12px">
            ${plan!==null?`<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:.84rem">Známé budoucí platby</span>
              <b style="font-family:Syne,sans-serif;font-size:1rem">${fmt(Math.round(plan))} Kč</b></div>`:''}
            ${pred!==null?`<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:.84rem">Predikce výdajů</span>
              <b style="font-family:Syne,sans-serif;font-size:1rem">${fmt(Math.round(pred))} Kč</b></div>`:''}
            ${(()=>{ const exp = (pred!==null?pred:0);
              const inc = scores.baseIncome || 0;
              if(!inc) return '';
              const sal = inc - exp;
              //  v9.72: SKUTEČNÉ SALDO za zvolené okno – aby šlo porovnat odhad
              //  s tím, co se opravdu stalo. Kumuluje se přes 2–12 měsíců.
              let realInc=0, realExp=0;
              _repWindowMonths(nMonths).forEach(w=>{
                (D.transactions||[]).forEach(t=>{
                  if(!t||!t.date||t.splitParent||t.isBalancing) return;
                  if(typeof isTransferTx==='function' && isTransferTx(t)) return;
                  if(String(t.date).slice(0,7)!==w.ym) return;
                  const a=txCZK(t,D); if(a>0) realInc+=a; else realExp+=Math.abs(a);
                });
              });
              const realSal = realInc-realExp;
              return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
                <span style="font-size:.84rem">Očekávané saldo <span style="color:#a8aec8;font-size:.72rem">(základ příjmu ${fmt(Math.round(inc))})</span></span>
                <b style="font-family:Syne,sans-serif;font-size:1.05rem;color:${sal>=0?'var(--income)':'var(--expense)'}">${sal>=0?'+':''}${fmt(Math.round(sal))} Kč</b></div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0">
                <span style="font-size:.84rem">Skutečné saldo <span style="color:#a8aec8;font-size:.72rem">(${nMonths===1?CZ_M[S.curMonth].toLowerCase():'za '+nMonths+' měsíců'})</span></span>
                <b style="font-family:Syne,sans-serif;font-size:1.05rem;color:${realSal>=0?'var(--income)':'var(--expense)'}">${realSal>=0?'+':''}${fmt(Math.round(realSal))} Kč</b></div>`;
            })()}
            <div style="font-size:.7rem;color:#8b93ad;margin-top:6px;padding-top:7px;border-top:1px solid var(--border)">
              Odhad z opakovaných plateb a historie. Neúčtuje nic, co ještě nenastalo.</div>
          </div></div>`;
      }catch(e){}

      // ── Výsledky hodnocení útrat ── data sbíráš, ale nikde se nezhodnotila
      let rtHtml = '';
      try{
        //  součet přes celé okno – jednotlivé měsíce sečteme
        const _rs = _repWindowMonths(nMonths).map(x=>reportRatingSummary(D, x.m, x.y)).filter(Boolean);
        const r = !_rs.length ? null : (()=>{ 
          const all = { count:0, good:0, bad:0, sum:0, worst:[], _p:0 };
          _rs.forEach(x=>{ all.count+=x.count; all.good+=x.good; all.bad+=x.bad; all.sum+=x.sum;
            all._p += x.avg*x.count; all.worst = all.worst.concat(x.worst); });
          all.avg = all.count ? all._p/all.count : 0;
          all.worst = all.worst.sort((a,b)=>b.a-a.a).slice(0,3);
          return all; })();
        if(r) rtHtml = `
          <div class="report-section-title">🎯 14 · Stálo to za to? – výsledky</div>
          <div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:12px 14px">
            <div style="display:flex;gap:22px;flex-wrap:wrap;align-items:center">
              <div><div style="font-family:Syne,sans-serif;font-size:1.8rem;font-weight:800;color:${r.avg>=3.5?'var(--income)':r.avg>=2.5?'var(--debt)':'var(--expense)'}">${r.avg.toFixed(1).replace('.',',')}</div>
                <div style="font-size:.68rem;color:#a8aec8">průměr z ${r.count} hodnocení</div></div>
              <div style="flex:1;min-width:230px">
                <div style="display:flex;justify-content:space-between;font-size:.78rem;padding:4px 0;border-bottom:1px solid var(--border)">
                  <span>Ohodnoceno výdajů</span><b>${fmt(Math.round(r.sum))} / ${fmt(Math.round(totalExp))} Kč</b></div>
                <div style="display:flex;justify-content:space-between;font-size:.78rem;padding:4px 0;border-bottom:1px solid var(--border)">
                  <span>Hodnoceno 4–5 ⭐</span><b style="color:var(--income)">${fmt(Math.round(r.good))} Kč</b></div>
                <div style="display:flex;justify-content:space-between;font-size:.78rem;padding:4px 0">
                  <span>Hodnoceno 1–2 ⭐</span><b style="color:${r.bad>0?'var(--debt)':'#a8aec8'}">${fmt(Math.round(r.bad))} Kč</b></div>
              </div>
            </div>
            ${r.worst.length?`<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
              <div style="display:flex;font-size:.66rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.05em;padding-bottom:5px;border-bottom:1px solid var(--border)">
                <span style="flex:1">Nejhůř hodnocené</span><span style="min-width:80px;text-align:right">Částka</span><span style="min-width:70px;text-align:right">Ty</span></div>
              ${r.worst.map(w=>`<div style="display:flex;align-items:center;font-size:.78rem;padding:5px 0;border-bottom:1px solid var(--border)">
                <span style="flex:1">${String(w.n).replace(/</g,'&lt;')}</span>
                <b style="min-width:80px;text-align:right">${fmt(Math.round(w.a))}</b>
                <span style="min-width:70px;text-align:right;letter-spacing:1px;color:var(--debt)">${'★'.repeat(w.p)}${'☆'.repeat(5-w.p)}</span></div>`).join('')}
              <div style="font-size:.74rem;color:#c9cede;margin-top:9px;line-height:1.55">
                Kdybys polovinu z toho příště nasměroval jinam, je to <b style="color:var(--income)">${fmt(Math.round(r.bad*6))} Kč za rok</b>.
                <span style="color:#8b93ad">Appka nikdy neoznačí útratu za zbytečnou sama &mdash; tohle je tvoje vlastní hodnocení.</span></div>
            </div>`:''}
          </div></div>`;
      }catch(e){}

      return nwHtml + recHtml + msHtml + fwHtml + rtHtml;
    })()}`;

  //  v9.64: srovnávací tabulka pod Celkovým zdravím – „byl to dobrý měsíc?"
  //  se nedá odpovědět z jednoho čísla bez kontextu.
  setTimeout(() => {
    const box = document.getElementById('reportScoreCompare'); if(!box) return;
    if(nMonths !== 1){ box.innerHTML=''; return; }
    try{
      const hist = [];
      for(let i=0;i<6;i++){ let m=S.curMonth-i, y=S.curYear; while(m<0){m+=12;y--;}
        const v = computeHealthScores(D, m, y);
        if(v && (v.totalInc>0 || v.totalExp>0)) hist.push({m,y,score:v.overall}); }
      if(hist.length<2){ box.innerHTML=''; return; }
      const cur=hist[0], prev=hist[1];
      const avg=Math.round(hist.reduce((a,x)=>a+x.score,0)/hist.length);
      const best=Math.max(...hist.map(x=>x.score));
      const row=(l,v,good)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:.8rem">${l}</span><b style="font-family:Syne,sans-serif;font-size:.9rem;color:${good===null?'#a8aec8':good?'var(--income)':'var(--expense)'}">${v}</b></div>`;
      const d1=cur.score-prev.score, d2=cur.score-avg;
      box.innerHTML = row(`vs ${CZ_M[prev.m].toLowerCase()} (${prev.score})`, (d1>=0?'+':'')+d1, d1>=0)
        + row(`vs průměr ${hist.length} měsíců (${avg})`, (d2>=0?'+':'')+d2, d2>=0)
        + row('nejlepší měsíc dosud', cur.score>=best?'✅ ano':'ne ('+best+')', cur.score>=best?true:null);
    }catch(e){ box.innerHTML=''; }
  }, 60);

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
      //  v9.58 (FIX-228): graf ukazuje FINANČNÍ SKÓRE 0–310 (totéž číslo jako
      //  Dashboard), ne měsíční zdraví 0–100. Dřív kopíroval Celkové finanční
      //  zdraví, takže u sekce nadepsané „Vývoj finančního skóre" svítilo 91,
      //  zatímco Dashboard hlásil 140 – dvě různá čísla pod jedním názvem.
      const fs = (typeof computeFinancialScore === 'function')
        ? computeFinancialScore(D, m, y) : null;
      const sc = fs ? fs.rawTotal : computeHealthScores(D, m, y).overall;
      months.push({ m, y, score: sc, max: fs ? fs.rawMax : 100,
                    grade: fs ? fs.grade : null, label: CZ_M[m].slice(0,3) });
    }
    if (n === 1) {
      // Jediný měsíc – graf nedává smysl, ukaž velké číslo
      const mo = months[0];
      const col = mo.grade ? mo.grade.color : healthColor(mo.score);
      //  v9.66: podoba „skóre karty" z preview – celkové skóre, kolik chybí do
      //  lepší známky, a ROZPAD NA SLOŽKY vč. ZMĚNY ZA MĚSÍC. Stav řekne, jak
      //  jsi na tom; změna řekne, co jsi ten měsíc udělal.
      const _next = (()=>{ try{
          const th=[[.30,'⚠️ Rizikové'],[.45,'📊 Průměrné'],[.60,'👍 Dobré'],[.75,'⭐ Velmi dobré'],[.90,'🏆 Výborné']];
          for(const [t,l] of th){ const need=Math.round(mo.max*t)-mo.score; if(need>0) return {need,l}; }
          return null; }catch(e){ return null; } })();
      //  předchozí měsíc pro odznaky změny
      let _pf = null;
      try{ let pm=S.curMonth-1, py=S.curYear; if(pm<0){pm=11;py--;}
        _pf = (typeof computeFinancialScore==='function') ? computeFinancialScore(D, pm, py) : null; }catch(e){}
      const _prevComp = l => { if(!_pf) return null;
        const c=(_pf.components||[]).find(x=>x.label.includes(l)); return c?c.score:null; };
      //  v9.67 (FIX-241): `fs` existuje jen uvnitř smyčky, která plní `months`
      //  – tady už je mimo dosah. Skóre aktuálního měsíce si vyžádáme znovu.
      const _curFs = (()=>{ try{ return (typeof computeFinancialScore==='function')
        ? computeFinancialScore(D, S.curMonth, S.curYear) : null; }catch(e){ return null; } })();
      const _comps = (_curFs && _curFs.components) ? _curFs.components : [];
      const _dTotal = _pf ? (mo.score - _pf.rawTotal) : null;
      let _pm2=S.curMonth-1; if(_pm2<0) _pm2=11;

      //  v9.68: velké číslo dostalo prostor, popisky jsou pod sebou jako řádky
      //  a hodnoty složek zarovnané do sloupců (pevná šířka), aby se čísla
      //  nepřelévala podle délky názvu.
      const _bTxt = n => Math.abs(n)===1 ? 'bod' : Math.abs(n)<5 ? 'body' : 'bodů';
      cont.innerHTML = `<div style="padding:4px 2px">
        <div style="display:flex;align-items:center;gap:22px;flex-wrap:wrap;margin-bottom:16px">
          <div style="text-align:center;min-width:118px">
            <div style="font-family:Syne,sans-serif;font-size:3rem;font-weight:800;color:${col};line-height:1">${mo.score}</div>
            <div style="font-size:.72rem;color:#a8aec8;margin-top:2px">z ${mo.max} bodů</div>
          </div>
          <div style="flex:1;min-width:210px">
            <div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:.76rem;color:#a8aec8;min-width:120px">Stav</span>
              <b style="font-size:.82rem;color:${col}">${mo.grade?mo.grade.emoji+' '+mo.grade.label:'–'}</b></div>
            ${_dTotal!==null?`<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:.76rem;color:#a8aec8;min-width:120px">vs. ${CZ_M[_pm2].toLowerCase()}</span>
              <b style="font-size:.82rem;color:${_dTotal>=0?'var(--income)':'var(--expense)'}">${_dTotal>=0?'+':''}${_dTotal} ${_bTxt(_dTotal)}</b></div>`:''}
            <div style="display:flex;gap:10px;padding:5px 0">
              <span style="font-size:.76rem;color:#a8aec8;min-width:120px">${_next?'Do známky '+_next.l:'Nejvyšší pásmo'}</span>
              <b style="font-size:.82rem">${_next?`chybí ${_next.need} ${_bTxt(_next.need)}`:'🏆 dosaženo'}</b></div>
          </div>
        </div>
        ${_comps.map(c=>{
          const pv=_prevComp(c.label), d=(pv===null)?null:(c.score-pv);
          const pct=c.max>0?Math.max(0,Math.min(100,c.score/c.max*100)):0;
          const cc=pct>=80?'var(--income)':pct>=50?'var(--debt)':'var(--expense)';
          return `<div style="margin-bottom:10px">
            <div style="display:flex;align-items:baseline;gap:8px">
              <span style="font-size:.82rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.label}</span>
              <span style="font-family:Syne,sans-serif;font-weight:800;font-size:.88rem;color:${cc};min-width:74px;text-align:right">${c.score} / ${c.max}</span>
              <span style="min-width:56px;text-align:right">${d!==null&&d!==0?`<span style="font-size:.66rem;font-weight:700;padding:1px 7px;border-radius:99px;background:${d>0?'rgba(74,222,128,.15)':'rgba(248,113,113,.15)'};color:${d>0?'var(--income)':'var(--expense)'}">${d>0?'+':''}${d} b</span>`:''}</span>
            </div>
            <div style="height:7px;background:var(--surface3);border-radius:99px;overflow:hidden;margin-top:4px">
              <div style="height:100%;width:${pct.toFixed(1)}%;background:${cc};border-radius:99px"></div>
            </div>
          </div>`; }).join('')}
        <div style="font-size:.7rem;color:#8b93ad;margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">
          Stejné číslo jako na Dashboardu · odznaky vpravo ukazují změnu v bodech proti minulému měsíci · pro graf v čase zvol 3M / 6M / 12M
        </div>
      </div>`;
    } else if (typeof drawHealthScoreLineChart === 'function') {
      cont.innerHTML = `<canvas id="reportScoreCanvas" style="width:100%;display:block"></canvas>`;
      { const nEl=document.getElementById('reportScoreAxisNote');
        if(nEl) nEl.textContent='Finanční skóre 0–310 (jako na Dashboardu) · vyšší = lepší · osa: měsíce'; }
      setTimeout(() => drawHealthScoreLineChart('reportScoreCanvas', months), 30);
    }
  }, 60);

  // Session 10: DTI/DSTI bylo přesunuto do záložky Půjčky (renderDebts → renderDTISection).
  // Důvod: DTI/DSTI je momentka dluhového profilu (celkový dluh + splátky), ne měsíční
  // metrika – proto se neměnila při přepínání měsíců, což mátlo. Patří k Půjčkám.

  // S16.13 (Milan): SOUHRN VÝDAJŮ patří do měsíčního reportu (je to měsíční výsledek).
  //   Karta se sem vykreslí jen v režimu 1 měsíc – u víceměsíčních období by srovnání
  //   „tento vs. minulý měsíc" nesedělo s vybraným obdobím a mátlo by.
  //  v9.64: Souhrn výdajů se vykresluje VÝŠE v reportu (kontejner reportSouhrnInline),
  //  aby navazoval na „Co se nejvíc změnilo" a netvořil duplicitu s bloky dole.
  //  Starý kontejner zůstává v app.html kvůli zpětné kompatibilitě, ale plní se prázdnem.
  { const old = document.getElementById('reportSouhrn'); if(old) old.innerHTML=''; }
  const sEl = document.getElementById('reportSouhrnInline');
  if(sEl){
    if(curN===1 && _reportPeriod!=='advisor'){  // S16.15 (Milan): pod Poradcem se souhrn zobrazoval omylem
      // S17 (Milan): vyhodnocení měsíce (co se povedlo/nepovedlo) NAD tabulkou souhrnu
      sEl.innerHTML = `
        <div id="reportSuhrnInsights" style="margin-bottom:12px"></div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">💰 5 · Souhrn výdajů – ${CZ_M[S.curMonth]} ${S.curYear}</span>
            <span style="font-size:.72rem;color:#a8aec8">tento vs. minulý měsíc vs. predikce</span>
          </div>
          <div class="card-body" style="overflow-x:auto" id="reportSuhrnTable"></div>
        </div>`;
      if(typeof renderSouhrnInto==='function') renderSouhrnInto('reportSuhrnTable', {report:true});
    } else {
      sEl.innerHTML = '';   // víceměsíční období / Poradce – souhrn nedává smysl
    }
    // S17.34 (TODO-198, Milan): tlačítko pro měsíční review hodnocení útrat
    { const rv=document.getElementById('reviewSection');
      //  v9.62: hodnocení útrat počítá jen aktuální měsíc, takže při 3M/6M okně
      //  ukazovalo měsíční data uvnitř sekce hlásící půl roku. Skryto.
      if(rv && nMonths!==1){ rv.innerHTML=''; }
      else if(rv){
        if(window._reviewOpen && typeof renderReview==='function'){
          rv.innerHTML='<div id="reviewContent"></div>';
          renderReview();
        } else {
          rv.innerHTML=`<div class="card"><div class="card-body" style="text-align:center;padding:20px">
            <div style="font-size:1.6rem;margin-bottom:8px">🎯</div>
            <div style="font-family:Syne,sans-serif;font-size:1rem;font-weight:800;color:#e8eaf2;margin-bottom:5px">Stálo to za to?</div>
            <div style="font-size:.78rem;color:#a8aec8;line-height:1.55;max-width:430px;margin:0 auto 12px">
              Ohodnoť své útraty a appka pozná rozdíl mezi penězi, které ti něco daly, a těmi, co jen zmizely.
              Zabere to dvě minuty a časem odhalí vzorce, které z čísel samotných nevykoukáš.</div>
            <button onclick="window._reviewOpen=true;renderReport()" style="padding:9px 18px;border-radius:9px;border:none;background:#8b7cf6;color:#fff;font-weight:700;font-size:.84rem;cursor:pointer">🎯 Ohodnotit útraty</button>
          </div></div>`;
        }
      }
    }
  }
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
  // v8.72 (FIX-188): sjednoceno na sdílené helpery (stejná čísla jako Dluhový stres index)
  const monthlyPayments = computeMonthlyDebtPayments(D);
  // S16 (TODO-160): DTI = 12M klouzavý průměr, DSTI = 3–12M adaptivní → stabilní napříč měsíci
  const incDTI  = computeEffectiveIncome(D, 12);
  const incDSTI = computeEffectiveIncome(D, 12);
  const annualIncome = incDTI * 12;

  // DTI = celkový dluh / roční příjem × 100 (ČNB limit: max 900%)
  const dti = annualIncome > 0 ? Math.round(totalDebt / annualIncome * 100) : null;
  // DSTI = měsíční splátky / měsíční příjem × 100 (ČNB limit: max 45%)
  const dsti = incDSTI > 0 ? Math.round(monthlyPayments / incDSTI * 100) : null;

  // ČNB limity
  // Pokud nemáme příjem, zobraz varování místo 0%
  // v8.73 (TODO-158): body dle bodovacích tabulek (DTI 0–60, DSTI 0–40)
  const dtiPts = (dti!==null&&typeof msc_DTI==='function') ? msc_DTI(dti) : null;
  const dstiPts = (dsti!==null&&typeof msc_DSTI==='function') ? msc_DSTI(dsti) : null;
  const dtiStatus = dti === null ? 'nodata' : dti < 700 ? 'safe' : dti < 900 ? 'warn' : 'danger';
  const dstiStatus = dsti === null ? 'nodata' : dsti < 35 ? 'safe' : dsti < 45 ? 'warn' : 'danger';
  const dtiColor = dtiStatus==='safe'?'var(--income)':dtiStatus==='warn'?'var(--debt)':'var(--expense)';
  const dstiColor = dstiStatus==='safe'?'var(--income)':dstiStatus==='warn'?'var(--debt)':'var(--expense)';
  const dtiLabel = dtiStatus==='safe'?'🟢 Banka schválí':'warn'===dtiStatus?'🟡 Rizikové':'🔴 Banka pravděpodobně zamítne';
  const dstiLabel = dstiStatus==='safe'?'🟢 Banka schválí':'warn'===dstiStatus?'🟡 Rizikové':'🔴 Banka pravděpodobně zamítne';

  const dtiSection = document.createElement('div');
  dtiSection.innerHTML = `
    <div class="report-section-title">🏦 7 · Bankovní hodnocení – DTI & DSTI</div>
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
          <div style="display:flex;justify-content:space-between;font-size:.68rem;color:#a8aec8;margin-top:3px">
            <span>0%</span><span style="color:var(--income)">700% ✅</span><span style="color:var(--debt)">900% ⚠️</span><span style="color:var(--expense)">1000%+🚨</span>
          </div>
          <div style="font-size:.72rem;color:var(--text3);margin-top:8px">
            Dluh ${fmtB(totalDebt)} / roční příjem ${fmtB(Math.round(annualIncome))}
            ${dtiPts!==null?` · skóre <strong style="color:${dtiColor}">${dtiPts}/${_SCORING.max.DTI} b</strong>`:''}
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
          <div style="display:flex;justify-content:space-between;font-size:.68rem;color:#a8aec8;margin-top:3px">
            <span>0%</span><span style="color:var(--income)">35% ✅</span><span style="color:var(--debt)">45% ⚠️</span><span style="color:var(--expense)">50%+🚨</span>
          </div>
          <div style="font-size:.72rem;color:var(--text3);margin-top:8px">
            Splátky ${fmtB(Math.round(monthlyPayments))} / příjem ${fmtB(Math.round(incDSTI))}
            ${dstiPts!==null?` · skóre <strong style="color:${dstiColor}">${dstiPts}/${_SCORING.max.DSTI} b</strong>`:''}
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
    //  v9.78 (Milan): projekce vychází z DENNÍHO TEMPA běžné útraty a záměrně
    //  NEobsahuje známé jednorázové platby (nájem, pojistka, splátka). U velkých
    //  částek splatných na konci měsíce to vede k číslu, které vypadá optimisticky:
    //  „zbude ti 5 673" a přitom za dva dny odejde 46 952. Podtitulek proto
    //  vždycky říká, co v projekci NENÍ a jaký je výsledek s tím.
    projectedSub = `denní tempo ${fmtB(Math.round(dailyRate))}/den`;

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
  //  v9.76 (FIX-248): horizont byl natvrdo 30 DNÍ, takže při přepnutí na měsíc
  //  vzdálenější než měsíc dopředu (říjen, když je srpen) budouciGetAll() nevrátil
  //  nic a sloupec „Budoucí platby" hlásil nulu. Září fungovalo, říjen ne –
  //  proto oprava FIX-247 problém jen posunula, nevyřešila.
  //  Nyní se horizont dopočítá až ke KONCI ZVOLENÉHO MĚSÍCE.
  const _budHorizon = (() => {
    const eom = new Date(S.curYear, S.curMonth + 1, 0);
    const d = Math.ceil((eom - new Date()) / 86400000) + 1;
    return Math.max(30, Math.min(400, d));   // strop 400 dní, ať se nepočítá zbytečně daleko
  })();
  const budItems = typeof budouciGetAll === 'function' ? budouciGetAll(D, _budHorizon) : [];

  //  v9.78 (Milan): doplnění podtitulku projekce – musí být AŽ TADY, protože
  //  budItems se deklaruje níž než samotná projekce (jinak ReferenceError).
  try{
    if(projectedLabel === 'Projekce konce měsíce'){
      const _known = budItems.filter(b=>{ const d=new Date(b.date); return d<=eomDate && !b.paid; })
        .reduce((a,b)=>a+Math.abs(b.amount||0),0);
      if(_known > 0){
        const _withKnown = projectedSaldo - _known;
        projectedSub += ` · bez známých plateb ${fmtB(Math.round(_known))} — s nimi ${_withKnown>=0?'+':''}${fmtB(Math.round(_withKnown))}`;
      }
    }
  }catch(e){}
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
      alerts.push({level:'danger', icon:'🚨', text:`Za ${daysLeft} dní hrozí záporné saldo! Odhadované výdaje ${fmtB(projectedExp)} přesahují příjmy ${fmtB(totalInc)}.`});
    } else if(projectedSaldo >= 0 && projectedSaldo < totalInc * 0.1 && daysLeft > 0) {
      alerts.push({level:'warn', icon:'⚠️', text:`Tento měsíc zbývá jen ${fmtB(projectedSaldo)}. Méně než 10 % příjmu.`});
    }
  } else if(isPastMonth) {
    if(saldo < 0) {
      alerts.push({level:'danger', icon:'📉', text:`${CZ_M[S.curMonth]} ${S.curYear} skončil se záporným saldem ${fmtB(saldo)}.`});
    }
  }

  if(expTrend > 10) {
    alerts.push({level:'warn', icon:'📈', text:`Výdaje rostou ${expTrend} % za poslední 3 měsíce. Trend je nepříznivý.`});
  }

  if(upcomingPayments > 0) {
    const upcomingPct = totalInc > 0 ? Math.round(upcomingPayments/totalInc*100) : 0;
    if(upcomingPct > 40) {
      alerts.push({level:'danger', icon:'💳', text:`Příští měsíc splátky ${fmtB(Math.round(upcomingPayments))} = ${upcomingPct} % příjmu. Kritické zatížení!`});
    } else if(upcomingPct > 25) {
      alerts.push({level:'warn', icon:'💳', text:`Příští měsíc splátky ${fmtB(Math.round(upcomingPayments))} = ${upcomingPct} % příjmu.`});
    }
  }

  if(budNextTotal > 0 && upcomingPayments === 0) {
    const pct = totalInc > 0 ? Math.round(budNextTotal/totalInc*100) : 0;
    if(pct > 30) alerts.push({level:'warn', icon:'🗓️', text:`Příští měsíc plánované platby ${fmtB(Math.round(budNextTotal))} (${pct} % příjmu).`});
  }

  if(subTotal > 0) tips.push({icon:'📺', text:`Předplatná tento měsíc: ${fmtB(subTotal)} – zkontrolujte, zda vše využíváte${subMatched.length ? ' (' + subMatched.slice(0,3).join(', ') + (subMatched.length>3?'…':'') + ')' : ''}`});

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
  //  v9.74 (FIX-247): dřív `isCurrentMonth ? budItems : []` – u JAKÉHOKOLI jiného
  //  měsíce se budoucí platby vynulovaly. U minulého měsíce správně (nic nezbývá),
  //  ale u BUDOUCÍHO měsíce ještě neproběhlo nic, takže se má ukázat celý plán.
  //  Kvůli tomu hlásila sekce „Kam směřuju" nulu, zatímco „Nadcházející platby"
  //  na téže obrazovce ukazovaly 66 902 Kč ze stejných dat.
  const _budScope = isPastMonth ? []
    : isCurrentMonth ? budItems.filter(b=>{ const d=new Date(b.date); return d<=eomDate; })
    : budItems.filter(b=>{ const d=new Date(b.date);
        return d.getMonth()===S.curMonth && d.getFullYear()===S.curYear; });
  const budToEOM = _budScope.reduce((a,b)=>a+b.amount,0);
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
    alerts.unshift({level:'danger', icon:'📉', text:`Do konce měsíce ti chybí ${fmtB(Math.abs(eomLeft))}. Příjem ${fmt(expectedIncMonth)} − výdaje ${fmt(totalExp)} − známé platby ${fmt(Math.round(budToEOM))}.`});
  }
  if(pred3Total < 0) {
    alerts.push({level:'warn', icon:'🔮', text:`Predikce: další 3 měsíce směřují k zápornému saldu ${fmtB(pred3Total)} (průměrný příjem ${fmt(avgInc)} vs výdaje ${fmt(avgExp)} + plánované platby).`});
  }
  // Session 10: kvartální alert – nikdo dosud nehlídal kvartál.
  if(qRemainingMonths > 0 && qProjectedSaldo < 0) {
    alerts.push({level:'warn', icon:'📅', text:`${qLabel} směřuje k zápornému saldu ${fmtB(qProjectedSaldo)} (dosud ${fmt(Math.round(qActualSaldo))} + odhad ${qRemainingMonths} zbývajících měs.).`});
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
        <div class="stat-card income"><div class="stat-label">Příjmy</div><div class="stat-value up">${fmtB(totalInc)}</div></div>
        <div class="stat-card expense"><div class="stat-label">Výdaje${isPastMonth?'':' (zatím)'}</div><div class="stat-value down">${fmtB(totalExp)}</div></div>
        <div class="stat-card ${projectedSaldo>=0?'balance':'expense'}">
          <div class="stat-label">${projectedLabel}</div>
          <div class="stat-value ${projectedSaldo>=0?'up':'down'}">${fmtB(projectedSaldo)}</div>
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
            <span style="font-family:Syne;font-size:1.2rem;font-weight:800;color:${freeToSpend>=0?'var(--income)':'var(--expense)'};white-space:nowrap">${fmtB(Math.abs(freeToSpend))}</span>
          </div>
          <div style="font-size:.66rem;color:#a8aec8;margin-top:4px">Příjem ${fmt(Math.round(incForFree))} − utraceno ${fmt(totalExp)} − budoucí platby ${fmt(Math.round(budRestMonth))}${freeToSpend<0?' → na plánované platby ti nestačí příjem':''}</div>
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
          // S12.1s: PŘEPRACOVANÁ LOGIKA (sloupce se nepřekrývají → cashflow = prosté odečtení)
          // Plánovaný výdej = skutečná útrata + odhad zbytku měsíce (denní tempo), BEZ budoucích plateb.
          // Budoucí platby = jen známé naplánované platby do konce měsíce (nepřekrývají se s útratou).
          const income = Math.round(Math.max(totalInc, avgInc));
          // odhad zbytku měsíce z denního tempa (jen flexibilní útrata, ne budoucí platby)
          const dailyRate = daysElapsed>0 ? totalExp/daysElapsed : 0;
          const restEstimate = isCurrentMonth ? Math.round(dailyRate * daysLeft) : 0;
          //  v9.77 (FIX-250): u BUDOUCÍHO měsíce byly obě složky nulové (skutečnost
          //  ještě není a restEstimate se počítá jen pro aktuální měsíc), takže
          //  sloupec „Plánovaný výdej" hlásil 0. Nyní se u budoucího měsíce použije
          //  průměrná měsíční útrata – stejný zdroj, ze kterého počítá i predikce níž.
          const planned = isCurrentMonth || isPastMonth
            ? Math.round(totalExp + restEstimate)
            : Math.round(avgExp || 0);
          // S17.25 (Milan): sloupec ukazuje PLÁN ZA CELÝ MĚSÍC (plná fialová), ne jen zbytek od
          // dneška – jinak byl na konci měsíce prázdný. Zbývající částku ukazuje ukazatel pod ním.
          const _somD = new Date(S.curYear, S.curMonth, 1);
          const _monthPlan = (typeof budouciGetAll === 'function' && isCurrentMonth)
            ? budouciGetAll(D, Math.ceil((eomDate - _somD)/86400000)+1, _somD)
                .filter(b=>{ const d=new Date(b.date); return d>=_somD && d<=eomDate; })
                .reduce((a,b)=>a+(b.amount||0),0)
            : budToEOM;   // v9.74: u budoucího měsíce už budToEOM = celý plán
          const future    = Math.round(budToEOM);                      // ZBÝVAJÍCÍ – vstupuje do cashflow
          const futureBar = Math.round(Math.max(_monthPlan, budToEOM)); // plán měsíce – jen výška sloupce
          const cashflow = Math.round(income - planned - future); // teď už prosté odečtení

          // SKUTEČNÝ (aktuální) stav – čárový překryv: kde jsme teď, než měsíc skončí
          const realIncome = Math.round(totalInc);
          const realExp = Math.round(totalExp);
          const budPaid = isCurrentMonth ? budItems.filter(b=>{const d=new Date(b.date); return d<=eomDate && b.paid;}).reduce((a,b)=>a+b.amount,0) : 0;
          const realCashflow = Math.round(realIncome - realExp - budPaid);

          const bars=[
            {label:'Příjem', val:income, real:realIncome, color:'#4ade80'},
            {label:'Plánovaný výdej', val:planned, real:realExp, color:'#fb923c'},
            // S17.25: u tohoto sloupce je ukazatel ZBÝVAJÍCÍ částka (countdown k nule na konci měsíce)
            {label:'Budoucí platby', val:futureBar, real:Math.round(budToEOM), color:'#a78bfa', isRemaining:true},
            {label:'Cashflow', val:cashflow, real:realCashflow, color: cashflow>=0?'#60a5fa':'#f87171'},
          ];
          const maxAbs=Math.max(...bars.map(b=>Math.max(Math.abs(b.val),Math.abs(b.real))),1);
          const chartH=130, baseY=chartH+4;
          // body čáry skutečnosti (střed každého sloupce)
          const pts = bars.map((b,i)=>{
            const cx = (i+0.5)/bars.length*100; // % šířky
            const cy = baseY - (Math.abs(b.real)/maxAbs*chartH);
            return {cx, cy, val:b.real, color:b.color};
          });
          const linePath = pts.map((p,i)=>`${i?'L':'M'} ${p.cx} ${p.cy}`).join(' ');
          return `
          <div style="position:relative">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;align-items:end;min-height:${chartH+52}px">
              ${bars.map(b=>{
                const h=Math.round(Math.abs(b.val)/maxAbs*chartH)+4;
                // S17.24 (Milan): plán zůstává nad sloupcem; SKUTEČNÝ STAV je nově POD sloupcem
                // a NAD popiskem – dřív byl v rámečku u tečkované čáry a přes graf se hůř četl.
                const _done = b.val!==0 ? Math.round(Math.abs(b.real)/Math.abs(b.val)*100) : 0;
                const _dCol = b.real===0 ? '#a8aec8' : b.color;
                return `<div style="display:flex;flex-direction:column;align-items:center;gap:5px">
                  <div style="font-family:Syne;font-size:.82rem;font-weight:800;color:${b.color}">${b.val>=0?'':'−'}${fmt(Math.abs(b.val))}</div>
                  <div style="width:100%;max-width:54px;height:${h}px;background:${b.color};opacity:.85;border-radius:6px 6px 0 0"></div>
                  <div style="display:inline-flex;align-items:baseline;gap:4px;padding:2px 7px;border-radius:6px;background:rgba(15,17,28,.85);border:1px solid ${b.color}44;white-space:nowrap">
                    ${b.isRemaining?`<span style="font-size:.66rem;color:#a8aec8">${isCurrentMonth?'zbývá':'plán'}</span>`:''}
                    <span style="font-size:.72rem;font-weight:800;color:${_dCol}">${b.real>=0?'':'−'}${fmt(Math.abs(b.real))}</span>
                    <span style="font-size:.6rem;color:#a8aec8">${_done} %</span>
                  </div>
                  <div style="font-size:.66rem;color:#a8aec8;text-align:center;line-height:1.3">${b.label}</div>
                </div>`;
              }).join('')}
            </div>
            <!-- S12.1s: čára SKUTEČNÉHO stavu (kde jsme teď) přes sloupce plánu -->
            <svg viewBox="0 0 100 ${baseY+4}" preserveAspectRatio="none" style="position:absolute;top:18px;left:0;width:100%;height:${chartH+8}px;pointer-events:none;overflow:visible">
              <path d="${linePath}" fill="none" stroke="#e8eaf2" stroke-width="1.6" stroke-dasharray="3 2" vector-effect="non-scaling-stroke" opacity="0.85"/>
              ${pts.map(p=>`<circle cx="${p.cx}" cy="${p.cy}" r="3" fill="${p.color}" stroke="#0f111c" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('')}
            </svg>
            <!-- S17.24 (Milan): rámečky u bodů tečkované čáry ODSTRANĚNY – hodnota skutečného
                 stavu je nově pod sloupcem (čitelnější a nekazí graf). Čára zůstává jako vizuál. -->
          </div>`;
        })()}
        <div style="margin-top:6px;padding:10px 12px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);font-size:.78rem;color:var(--text2)">
          ${pred3Total>=0
            ? `📈 Při zachování průměru (příjem ${fmt(avgInc)} / výdaje ${fmt(avgExp)} měsíčně) bys za 3 měsíce <strong style="color:var(--income)">našetřil ${fmtB(pred3Total)}</strong>.`
            : `📉 Při zachování průměru (příjem ${fmt(avgInc)} / výdaje ${fmt(avgExp)} měsíčně) by ti za 3 měsíce <strong style="color:var(--expense)">chybělo ${fmtB(Math.abs(pred3Total))}</strong>. Zváž úpravu výdajů nebo plánovaných plateb.`}
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
                <div style="font-family:Syne;font-size:1.05rem;font-weight:800;color:${colColors[i]}">${fmtB(Math.round(sum))}</div>
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
              <span style="color:var(--expense)">${fmtB(s.v)}</span>
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
    ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='right';ctx.fillText(fmt(Math.round(czkToBase(maxV*i/4))),pad-6,y+3);}
  // vertikální mřížka (po 5 dnech)
  ctx.strokeStyle='rgba(46,51,71,.35)';ctx.setLineDash([2,4]);
  for(let d=5;d<days;d+=5){const x=xOf(d);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,H-bottom);ctx.stroke();}
  ctx.setLineDash([]);
  // popisek osy Y
  ctx.save();ctx.translate(13,top+H2/2);ctx.rotate(-Math.PI/2);ctx.fillStyle='#a8aec8';ctx.font='9px Instrument Sans';ctx.textAlign='center';ctx.fillText(curSym()+' (kumulativně)',0,0);ctx.restore();
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
  ctx.fillStyle='#4ade80';ctx.font='9px Instrument Sans';ctx.textAlign='left';ctx.fillText((incomeIsReal?'příjem ':'odhad příjmu ')+fmt(Math.round(czkToBase(incomeTarget))),pad+2,incY-4);
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
    ctx.textAlign='right';ctx.font='9px Instrument Sans';ctx.fillText('odhad '+fmt(Math.round(czkToBase(predEnd))),W-right,yOf(predEnd)-6);
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
    + `<br><span style="color:#60a5fa">●</span> denní výdaj: ${fmtB(Math.round(dEx))}`
    + `<br><span style="color:#e8eaf2">●</span> kumulativně: ${fmtB(Math.round(kum))}`
    + `<br><span style="color:#4ade80">●</span> příjem (cíl): ${fmtB(Math.round(incomeTarget))}`
    + (isCurrent && day===days ? `<br><span style="color:#fb923c">●</span> odhad konce: ${fmtB(Math.round(predEnd))}` : '');
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
      <div style="font-size:.64rem;color:#a8aec8;text-align:center">${w.label}</div>
    </div>`;
  }).join('');
  const rows = weeks.map(w=>`<tr style="border-top:1px solid var(--border)">
    <td style="padding:5px 6px">${w.label}</td>
    <td style="padding:5px 6px;text-align:right">${fmtB(w.total)}</td>
    <td style="padding:5px 6px;text-align:right;color:var(--text3)">${w.days}</td>
    <td style="padding:5px 6px;text-align:right;font-weight:700;color:#60a5fa">${fmtB(w.perDay)}</td>
  </tr>`).join('');
  box.innerHTML = `
    <div style="font-size:.72rem;font-weight:600;color:var(--text3);text-transform:uppercase;margin-bottom:4px">📅 Výdaje po týdnech od výplaty</div>
    <div style="font-size:.66rem;color:#a8aec8;margin-bottom:10px;line-height:1.5">Referenční bod = den výplaty (${payday}. den). Sloupce ukazují <strong>průměr ${curSym()}/den</strong> v každém týdnu – férové i pro kratší poslední týden. Vysoký 1. týden = utrácíš hned po výplatě.</div>
    <div style="display:flex;align-items:flex-end;gap:8px;height:130px;margin-bottom:12px;padding:0 4px">${bars}</div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.78rem">
      <thead><tr style="color:var(--text3);text-align:left">
        <th style="padding:5px 6px">Týden</th>
        <th style="padding:5px 6px;text-align:right">Výdaje</th>
        <th style="padding:5px 6px;text-align:right">Dní</th>
        <th style="padding:5px 6px;text-align:right">${curSym()}/den</th>
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
  const freq=(typeof _settings!=='undefined'&&_settings&&_settings.payFreq)?_settings.payFreq:'monthly';
  const detected=radarDetectPaydayDay(D);
  let anchor, source;
  if(setting>0){ anchor=setting; source='setting'; }
  else if(detected){ anchor=detected; source='auto'; }
  else { anchor=1; source='fallback'; }
  const today=new Date(); today.setHours(0,0,0,0);
  const MS=86400000;

  // ── NEPRAVIDELNÝ režim: cyklus = od poslední reálné příjmové transakce do příští očekávané
  //    (podle průměrného odstupu posledních příjmů). Žádná pevná kotva.
  if(freq==='irregular'){
    const incomes=(D.transactions||[]).filter(t=>t.type==='income'&&!t.isBalancing&&!t.splitParent&&!isTransferTx(t))
      .map(t=>{const d=new Date(t.date);d.setHours(0,0,0,0);return {d,a:(t.amount||t.amt||0)};})
      .filter(x=>x.d<=today).sort((a,b)=>a.d-b.d);
    if(incomes.length>=1){
      const lastPayday=incomes[incomes.length-1].d;
      // průměrný odstup mezi posledními (max 6) příjmy
      let avgGap=30;
      if(incomes.length>=2){
        const recent=incomes.slice(-6);
        let sum=0,cnt=0;
        for(let i=1;i<recent.length;i++){ sum+=Math.round((recent[i].d-recent[i-1].d)/MS); cnt++; }
        if(cnt>0) avgGap=Math.max(3,Math.round(sum/cnt));
      }
      const nextPayday=new Date(lastPayday); nextPayday.setDate(nextPayday.getDate()+avgGap);
      const daysLeft=Math.max(0,Math.round((nextPayday-today)/MS));
      const cycleDays=Math.max(1,avgGap);
      const dayInCycle=Math.min(cycleDays,Math.max(1,Math.round((today-lastPayday)/MS)+1));
      return {anchor,source:'irregular',detected,lastPayday,nextPayday,daysLeft,cycleDays,dayInCycle,paydayReal:true,today,freq};
    }
    // fallback když nejsou příjmy
  }

  // ── PRAVIDELNÉ frekvence (weekly/biweekly/monthly/semimonthly)
  const mkPayMonthly=(y,m)=>{ const dim=new Date(y,m+1,0).getDate(); return radarAdjustWeekend(new Date(y,m,Math.min(anchor,dim))); };

  // Pro týdenní/14denní použijeme anchor jako referenční datum a krokujeme o N dní
  if(freq==='weekly'||freq==='biweekly'){
    const stepDays=(freq==='weekly')?7:14;
    // referenční bod: poslední reálný příjem, jinak anchor den v tomto měsíci
    const incomes=(D.transactions||[]).filter(t=>t.type==='income'&&!t.isBalancing&&!t.splitParent&&!isTransferTx(t))
      .map(t=>{const d=new Date(t.date);d.setHours(0,0,0,0);return d;}).filter(d=>d<=today).sort((a,b)=>a-b);
    let ref = incomes.length ? incomes[incomes.length-1] : radarAdjustWeekend(new Date(today.getFullYear(),today.getMonth(),Math.min(anchor,28)));
    // posuň ref na poslední výplatu <= dnes
    let lastPayday=new Date(ref);
    while(lastPayday>today){ lastPayday.setDate(lastPayday.getDate()-stepDays); }
    while(true){ const nx=new Date(lastPayday); nx.setDate(nx.getDate()+stepDays); if(nx>today) break; lastPayday=nx; }
    const nextPayday=new Date(lastPayday); nextPayday.setDate(nextPayday.getDate()+stepDays);
    const daysLeft=Math.max(0,Math.round((nextPayday-today)/MS));
    const cycleDays=stepDays;
    const dayInCycle=Math.min(cycleDays,Math.max(1,Math.round((today-lastPayday)/MS)+1));
    return {anchor,source,detected,lastPayday,nextPayday,daysLeft,cycleDays,dayInCycle,paydayReal:incomes.length>0,today,freq};
  }

  // 2× měsíčně: výplaty kolem anchor a anchor+15 (resp. 1. a 15.)
  if(freq==='semimonthly'){
    const a1=Math.min(anchor||1,28);
    const a2=Math.min((a1+15)>28?(a1-15>0?a1-15:15):a1+15,28);
    const days=[Math.min(a1,a2),Math.max(a1,a2)];
    const mkOn=(y,m,dd)=>radarAdjustWeekend(new Date(y,m,Math.min(dd,new Date(y,m+1,0).getDate())));
    // poslední výplata <= dnes napříč oběma dny tento i minulý měsíc
    const cands=[];
    for(const off of [0,-1]){ let m=today.getMonth()+off,y=today.getFullYear(); if(m<0){m+=12;y--;} days.forEach(dd=>cands.push(mkOn(y,m,dd))); }
    const past=cands.filter(d=>d<=today).sort((a,b)=>b-a);
    let lastPayday=past.length?past[0]:mkOn(today.getFullYear(),today.getMonth(),days[0]);
    // další výplata > dnes
    const future=[];
    for(const off of [0,1]){ let m=today.getMonth()+off,y=today.getFullYear(); if(m>11){m-=12;y++;} days.forEach(dd=>future.push(mkOn(y,m,dd))); }
    const fut=future.filter(d=>d>today).sort((a,b)=>a-b);
    let nextPayday=fut.length?fut[0]:(()=>{const n=new Date(lastPayday);n.setDate(n.getDate()+15);return n;})();
    const daysLeft=Math.max(0,Math.round((nextPayday-today)/MS));
    const cycleDays=Math.max(1,Math.round((nextPayday-lastPayday)/MS));
    const dayInCycle=Math.min(cycleDays,Math.max(1,Math.round((today-lastPayday)/MS)+1));
    return {anchor,source,detected,lastPayday,nextPayday,daysLeft,cycleDays,dayInCycle,paydayReal:false,today,freq};
  }

  // ── MĚSÍČNĚ (výchozí, původní logika)
  let lastExpected=mkPayMonthly(today.getFullYear(),today.getMonth());
  if(lastExpected>today){ let pm=today.getMonth()-1, py=today.getFullYear(); if(pm<0){pm+=12;py--;} lastExpected=mkPayMonthly(py,pm); }
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
  let nm=lastExpected.getMonth()+1, ny=lastExpected.getFullYear(); if(nm>11){nm=0;ny++;}
  let nextPayday=mkPayMonthly(ny,nm);
  while(nextPayday<=today){ nm++; if(nm>11){nm=0;ny++;} nextPayday=mkPayMonthly(ny,nm); }
  const daysLeft=Math.max(0,Math.round((nextPayday-today)/MS));
  const cycleDays=Math.max(1,Math.round((nextPayday-lastPayday)/MS));
  const dayInCycle=Math.min(cycleDays,Math.max(1,Math.round((today-lastPayday)/MS)+1));
  return {anchor,source,detected,lastPayday,nextPayday,daysLeft,cycleDays,dayInCycle,paydayReal,today,freq:'monthly'};
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
    .reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
  const flexPace=P.dayInCycle>0?flexSoFar/P.dayInCycle:0;
  const projEnd=Math.round(free - flexPace*P.daysLeft);
  const projColor=projEnd>=minReserve?'var(--income)':projEnd>=0?'var(--debt)':'var(--expense)';

  // hint o zdroji kotvy dne výplaty
  let anchorHint='';
  const _freq=P.freq||'monthly';
  const _freqLabels={monthly:'měsíční',biweekly:'14denní',weekly:'týdenní',semimonthly:'2× měsíčně',irregular:'nepravidelný'};
  // Hint o frekvenci (jen pokud není měsíční – měsíční je výchozí, není potřeba zdůrazňovat)
  if(_freq==='irregular'){
    anchorHint=`🎲 <strong>Nepravidelný příjem</strong> – cyklus počítám od poslední příjmové transakce do příští očekávané (průměrný odstup tvých příjmů: ~${P.cycleDays} dní). Čím víc příjmů zadáš, tím přesnější.`;
  } else if(_freq==='weekly'||_freq==='biweekly'||_freq==='semimonthly'){
    anchorHint=`🔁 Frekvence výplaty: <strong>${_freqLabels[_freq]}</strong> (cyklus ${P.cycleDays} dní). Změnit v Nastavení → Frekvence výplaty.`;
  } else if(P.source==='auto') anchorHint=`🤖 Den výplaty odhaduji z transakcí (≈ ${P.anchor}. den). Upřesnit ho můžeš v Nastavení → Den výplaty.`;
  else if(P.source==='fallback') anchorHint=`⚠️ Den výplaty zatím neznám (žádné příjmy v historii) – počítám od 1. dne měsíce. Nastav ho v Nastavení → Den výplaty.`;
  else if(P.detected && Math.abs(P.detected-P.anchor)>3) anchorHint=`💡 V Nastavení máš ${P.anchor}. den, ale podle transakcí výplata chodí spíš ≈ ${P.detected}. den. Zkontroluj Nastavení → Den výplaty.`;

  const weekBars=weeks.map(w=>{
    const segs=GROUPS.map(g=>{ const v=w.sums[g.key]; if(v<=0)return''; const h=Math.max(2,Math.round(v/maxWeek*110)); return `<div style="width:100%;height:${h}px;background:${g.color};opacity:.85" title="${g.label}: ${fmtB(Math.round(v))}"></div>`; }).join('');
    return `<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:5px">
      <div style="font-size:.66rem;font-weight:700;color:#c2c7da;font-family:Syne">${w.total>0?fmt(w.total):(w.future?'·':'0')}</div>
      <div style="width:100%;max-width:46px;display:flex;flex-direction:column-reverse;border-radius:6px 6px 0 0;overflow:hidden;min-height:2px">${segs||'<div style="height:2px;background:var(--surface3)"></div>'}</div>
      <div style="font-size:.66rem;color:#a8aec8;text-align:center;line-height:1.3">${w.label}<br><span style="color:var(--text3)">${w.range}</span></div>
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
          <div class="stat-value ${free>=0?'up':'down'}">${fmtB(free)}</div>
          <div class="stat-sub" style="font-size:.66rem">po rezervě ${fmtB(budTotal)} na platby</div>
        </div>
        <div class="stat-card income">
          <div class="stat-label">Denní limit</div>
          <div class="stat-value">${P.daysLeft>0?fmtB(dailyLimit):'–'}</div>
          <div class="stat-sub" style="font-size:.66rem">${minReserve>0?`po rezervě ${fmtB(minReserve)} 🛡️`:'bezpečné tempo/den'}</div>
        </div>
        <div class="stat-card expense">
          <div class="stat-label">Utraceno v cyklu</div>
          <div class="stat-value down">${fmtB(Math.round(cycExp))}</div>
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
        <div style="font-size:.66rem;color:#a8aec8;margin-top:4px">Bílá značka = kde bys měl být při rovnoměrném tempu. Pruh před značkou = v pohodě, za značkou = utrácíš rychleji než cyklus běží.</div>
      </div>`:`<div style="font-size:.76rem;color:var(--text2)">V tomto cyklu zatím nemáš zapsaný příjem – volné peníze spočítám po připsání výplaty.</div>`}
      ${free<0?`<div style="margin-top:10px;padding:10px 14px;border-radius:10px;background:var(--expense-bg);border:1px solid rgba(248,113,113,.3);font-size:.8rem;color:var(--text2)">🔴 Při známých platbách (${fmtB(budTotal)}) ti do výplaty chybí <strong>${fmtB(Math.abs(free))}</strong>. Zvaž odklad nefixních výdajů.</div>`:''}
      ${P.dayInCycle>=3&&incomeBase>0?`<div style="margin-top:10px;padding:9px 14px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);font-size:.78rem;color:var(--text2)">
        📉 Dosavadním flexibilním tempem (${fmtB(Math.round(flexPace))}/den) skončíš cyklus s <strong style="color:${projColor}">${fmtB(projEnd)}</strong>${minReserve>0?` <span style="color:var(--text3)">(rezerva ${fmtB(minReserve)} ${projEnd>=minReserve?'zůstane nedotčená ✓':'bude nahlodaná!'})</span>`:''}
      </div>`:''}
    </div>

    <!-- SROVNÁNÍ S MINULÝM CYKLEM + TEMPO (S12.1b) -->
    ${prevTotal>0?`
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">🔁 Srovnání s minulým cyklem</span><span style="font-size:.68rem;color:#a8aec8">do ${P.dayInCycle}. dne</span></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
          <div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0">
            <div class="stat-value-h" style="color:#a8aec8">${fmt(prevSame)}</div>
            <div class="stat-label-h">minule do ${P.dayInCycle}. dne</div>
          </div>
          <div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0">
            <div class="stat-value-h" style="color:${sameDiffPct===null?'#a8aec8':sameDiffPct<=0?'var(--income)':sameDiffPct>15?'var(--expense)':'var(--debt)'}">${sameDiffPct===null?'–':(sameDiffPct>0?'+':'')+sameDiffPct+' %'}</div>
            <div class="stat-label-h">teď ${fmtB(Math.round(cycExp))}</div>
          </div>
          <div class="stat-card-h" style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0">
            <div class="stat-value-h" style="color:#a8aec8">${fmt(prevTotal)}</div>
            <div class="stat-label-h">minulý cyklus celkem</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;font-size:.78rem;color:var(--text2);flex-wrap:wrap">
          <span>📅 Všední den: <strong style="color:#60a5fa">${fmtB(wdPace)}/den</strong></span>
          <span>🎉 Víkend: <strong style="color:#fbbf24">${fmtB(wePace)}/den</strong></span>
          ${wdPace>0&&wePace>wdPace*1.5?`<span style="font-size:.7rem;color:var(--text3)">víkendy táhnou tempo ${(wePace/wdPace).toFixed(1)}× nahoru</span>`:''}
        </div>
      </div>
    </div>`:''}

    <!-- TÝDNY OD VÝPLATY – stacked fixní/variabilní -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">📊 Tempo po týdnech cyklu</span><span style="font-size:.68rem;color:#a8aec8">fixní vs variabilní</span></div>
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
            <th style="padding:5px 6px;text-align:right">${curSym()}/den</th>
          </tr></thead><tbody>${weekRows}</tbody></table></div>
        <div style="font-size:.66rem;color:#a8aec8;margin-top:8px;line-height:1.5">Týdny běží od výplaty (${fmtD(P.lastPayday)}), ne od 1. dne měsíce. ${curSym()}/den dělí jen odžité dny týdne. „Ostatní" = jednorázové + nepravidelné + neurčené. Budoucí týdny jsou ztlumené.</div>
      </div>
    </div>

    <!-- TOP VARIABILNÍ KATEGORIE CYKLU -->
    ${topVar.length?`
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">🎯 Co žene variabilní výdaje</span><span style="font-size:.68rem;color:#a8aec8">tento cyklus</span></div>
      <div class="card-body">
        ${topVar.map(t=>{ const pct=varTotal>0?Math.round(t.val/varTotal*100):0; return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;min-width:0">
          <div style="flex:1;min-width:0;font-size:.8rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</div>
          <div style="flex:2;height:8px;background:var(--surface3);border-radius:5px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#fbbf24;opacity:.85"></div></div>
          <div style="width:86px;text-align:right;font-size:.76rem;font-weight:700;color:#fbbf24;flex-shrink:0">${fmtB(t.val)}</div>
        </div>`;}).join('')}
        <div style="font-size:.66rem;color:#a8aec8;margin-top:4px">Jen kategorie s charakterem „Variabilní" – tady má smysl brzdit. Fixní výdaje denním tempem neovlivníš.</div>
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
  const passiveInc = passiveCats.reduce((s,c)=>s+getIncActual(c.id,null,m,y,D),0); // v8.72 (FIX-187): příjmy, ne výdaje
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
  // v8.65 (FIX): dřív se porovnával jen PRVNÍ vs POSLEDNÍ měsíc okna (náhodný šum)
  // a jediný sledovaný stav byl „výdaje rostou rychleji". Nyní:
  // – průměr PRVNÍ vs DRUHÉ poloviny okna (stabilnější trend),
  // – 3 stavy: 'inflation' (výdaje rostou rychleji), 'squeeze' (příjmy klesají
  //   výrazně rychleji než výdaje – výdaje se poklesu nepřizpůsobily), 'ok'.
  const withData = series.filter(s => s.inc > 0 || s.exp > 0);
  if (withData.length < 2) return { state:null, detected:false, incG:null, expG:null };
  const half = Math.ceil(withData.length/2);
  const avg = (arr,k) => arr.reduce((a,s)=>a+(s[k]||0),0)/arr.length;
  const f = withData.slice(0, half), l = withData.slice(half);
  const fInc=avg(f,'inc'), lInc=avg(l,'inc'), fExp=avg(f,'exp'), lExp=avg(l,'exp');
  const incG = fInc > 0 ? Math.round((lInc - fInc)/fInc*100) : null;
  const expG = fExp > 0 ? Math.round((lExp - fExp)/fExp*100) : null;
  if (incG === null || expG === null) return { state:null, detected:false, incG, expG };
  let state = 'ok';
  if (expG > 0 && (expG - incG) >= 3) state = 'inflation';        // výdaje rostou rychleji než příjmy
  else if (incG < 0 && (expG - incG) >= 10) state = 'squeeze';    // příjmy padají výrazně rychleji než výdaje
  return { state, detected: state==='inflation', incG, expG };
}

// TODO-091 · Income Diversification Score (0–100)
// Více příjmových zdrojů s vyrovnanějšími váhami = stabilita.
// Použije inverzní Herfindahl index (HHI) přes příjmové kategorie s daty.
function computeIncomeDiversification(D, m, y) {
  D = D || getData(); m = m ?? S.curMonth; y = y ?? S.curYear;
  const incCats = (D.categories||[]).filter(c => c.type==='income'||c.type==='both');
  const sources = incCats.map(c => ({ name:c.name, icon:c.icon, color:c.color,
    val: getIncActual(c.id,null,m,y,D) })).filter(s => s.val > 0); // v8.72 (FIX-187)
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
// ══════════════════════════════════════════════════════
//  v8.66: GRAFY FINANČNÍHO OBRAZU (Inflace životního stylu + Wealth Momentum)
//  SVG s pevným viewBox (kreslí se i ve skryté záložce), max-width, tooltipy přes <title>.
// ══════════════════════════════════════════════════════
// v8.67: interaktivní tooltip pro SVG grafy (SVG <title> na mobilu nefunguje)
function _obrazTip(evt, html){
  let el=document.getElementById('obrazTipEl');
  if(!el){ el=document.createElement('div'); el.id='obrazTipEl';
    el.style.cssText='position:fixed;z-index:9999;background:#1a1d27;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 10px;font-size:.72rem;color:#e8eaf2;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.4);line-height:1.5';
    document.body.appendChild(el); }
  const e=evt.touches?evt.touches[0]:evt;
  el.innerHTML=html; el.style.display='block';
  el.style.left=Math.min(e.clientX+12, window.innerWidth-180)+'px';
  el.style.top=Math.max(8, e.clientY-46)+'px';
  if(evt.touches) setTimeout(_obrazTipHide, 2200);
}
function _obrazTipHide(){ const el=document.getElementById('obrazTipEl'); if(el) el.style.display='none'; }

function _obrazK(v){ // kompaktní hodnota v základní měně: 70k / 1,2M
  const b=czkToBase(Math.abs(v)); const s=v<0?'−':'';
  if(b>=1e6) return s+(Math.round(b/1e5)/10).toLocaleString('cs-CZ')+'M';
  if(b>=1000) return s+Math.round(b/1000)+'k';
  return s+Math.round(b);
}
// Zrcadlový graf: příjmy VLEVO (zeleně), výdaje VPRAVO (červeně), měsíc po měsíci
function _obrazDivergingChart(series){
  const rows=series.filter(s=>s.inc>0||s.exp>0); const n=rows.length;
  if(n<2) return '';
  const W=640, rowH=30, T=24, B=6, H=T+n*rowH+B;
  const L=40, R=8, CX=L+(W-R-L)/2, half=(W-R-L)/2-52; // −52 = místo na popisky hodnot
  const maxV=Math.max(1,...rows.map(s=>Math.max(s.inc,s.exp)));
  const sc=v=>Math.max(v/maxV*half, v>0?1.5:0);
  let g='';
  rows.forEach((s,i)=>{
    const y=T+i*rowH+4, h=rowH-11;
    const wi=sc(s.inc), we=sc(s.exp);
    g+=`<text x="${L-6}" y="${y+h-2}" text-anchor="end" font-size="9.5" fill="#e8eaf2" font-weight="600">${s.month}</text>`;
    g+=`<rect x="${(CX-3-wi).toFixed(1)}" y="${y}" width="${wi.toFixed(1)}" height="${h}" rx="3" fill="#4ade80" opacity=".88" style="cursor:pointer"
      onmouseenter="_obrazTip(event,'<b>${s.month} ${s.year}</b><br>Příjmy ${fmtB(s.inc)}')" onmouseleave="_obrazTipHide()" ontouchstart="_obrazTip(event,'<b>${s.month} ${s.year}</b><br>Příjmy ${fmtB(s.inc)}')"></rect>`;
    g+=`<rect x="${CX+3}" y="${y}" width="${we.toFixed(1)}" height="${h}" rx="3" fill="#f87171" opacity=".88" style="cursor:pointer"
      onmouseenter="_obrazTip(event,'<b>${s.month} ${s.year}</b><br>Výdaje ${fmtB(s.exp)}')" onmouseleave="_obrazTipHide()" ontouchstart="_obrazTip(event,'<b>${s.month} ${s.year}</b><br>Výdaje ${fmtB(s.exp)}')"></rect>`;
    g+=`<text x="${(CX-7-wi).toFixed(1)}" y="${y+h-3}" text-anchor="end" font-size="9" fill="#a8aec8">${_obrazK(s.inc)}</text>`;
    g+=`<text x="${(CX+7+we).toFixed(1)}" y="${y+h-3}" text-anchor="start" font-size="9" fill="#a8aec8">${_obrazK(s.exp)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:${W}px;height:auto;display:block;margin-top:10px">
    <text x="${CX-8}" y="12" text-anchor="end" font-size="9.5" fill="#4ade80" font-weight="700">◀ PŘÍJMY</text>
    <text x="${CX+8}" y="12" text-anchor="start" font-size="9.5" fill="#f87171" font-weight="700">VÝDAJE ▶</text>
    <line x1="${CX}" y1="${T-4}" x2="${CX}" y2="${H-B}" stroke="rgba(168,174,200,.45)" stroke-width="1"/>
    ${g}
  </svg>`;
}
// Sloupcový graf měsíčních sald kolem nuly + čárkovaná linka průměru (momentum)
function _obrazSaldoChart(series, avg){
  const rows=series.filter(s=>s.inc>0||s.exp>0); const n=rows.length;
  if(n<2) return '';
  const W=640, H=190, pad={l:52,r:10,t:18,b:28};
  const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
  const maxAbs=Math.max(1,...rows.map(s=>Math.abs(s.savings)),Math.abs(avg||0));
  const y=v=>pad.t+cH*(0.5 - v/(2*maxAbs));
  const slot=cW/n, bw=Math.min(slot*0.55,54);
  let g='';
  [maxAbs,0,-maxAbs].forEach(v=>{
    g+=`<line x1="${pad.l}" y1="${y(v)}" x2="${W-pad.r}" y2="${y(v)}" stroke="rgba(168,174,200,${v===0?'.5':'.18'})" stroke-width="1" ${v!==0?'stroke-dasharray="3,3"':''}/>`;
    g+=`<text x="${pad.l-6}" y="${y(v)+3.5}" text-anchor="end" font-size="9.5" fill="#a8aec8">${v>0?'+':''}${_obrazK(v)}</text>`;
  });
  rows.forEach((s,i)=>{
    const x=pad.l+i*slot+(slot-bw)/2, v=s.savings;
    const yv=y(v), y0=y(0);
    const rY=Math.min(yv,y0), rH=Math.max(Math.abs(yv-y0),1.5);
    const tip=`<b>${s.month} ${s.year}</b><br>Saldo ${v>=0?'+':''}${fmtB(v)}`;
    g+=`<rect x="${x.toFixed(1)}" y="${rY.toFixed(1)}" width="${bw.toFixed(1)}" height="${rH.toFixed(1)}" rx="3" fill="${v>=0?'#4ade80':'#f87171'}" opacity=".88" style="cursor:pointer"
      onmouseenter="_obrazTip(event,'${tip}')" onmouseleave="_obrazTipHide()" ontouchstart="_obrazTip(event,'${tip}')"></rect>`;
    // v8.67: popisek hodnoty nesmí zasahovat do osy X – u vysokých sloupců se kreslí UVNITŘ
    let lY, lFill='#a8aec8';
    if(v>=0){ lY=rY-4; if(lY<pad.t+8){ lY=rY+11; lFill='#0f172a'; } }
    else { lY=rY+rH+11; if(lY>H-pad.b-3){ lY=rY+rH-5; lFill='#fff'; } }
    g+=`<text x="${(x+bw/2).toFixed(1)}" y="${lY.toFixed(1)}" text-anchor="middle" font-size="9" fill="${lFill}" font-weight="${lFill==='#a8aec8'?'400':'700'}">${v>=0?'+':''}${_obrazK(v)}</text>`;
    g+=`<text x="${(x+bw/2).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="9.5" fill="#e8eaf2" font-weight="600">${s.month}</text>`;
  });
  if(isFinite(avg)&&avg!==0){
    g+=`<line x1="${pad.l}" y1="${y(avg)}" x2="${W-pad.r}" y2="${y(avg)}" stroke="#60a5fa" stroke-width="1.6" stroke-dasharray="6,4" style="cursor:pointer"
      onmouseenter="_obrazTip(event,'Průměr ${avg>=0?'+':''}${fmtB(avg)}/měs')" onmouseleave="_obrazTipHide()" ontouchstart="_obrazTip(event,'Průměr ${avg>=0?'+':''}${fmtB(avg)}/měs')"></line>`;
    g+=`<text x="${W-pad.r}" y="${y(avg)-4}" text-anchor="end" font-size="9" fill="#60a5fa" font-weight="700">Ø ${avg>=0?'+':''}${_obrazK(avg)}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:${W}px;height:auto;display:block;margin-top:10px">${g}</svg>`;
}

function computeWealthMomentum(D, series) {
  D = D || getData();
  const nw = typeof computeAssetsNetWorth === 'function' ? computeAssetsNetWorth(D) : null;
  const withData = series.filter(s => s.inc > 0 || s.exp > 0);
  if (!withData.length) return { perMonth:0, netWorth: nw?nw.netWorth:null, months:0 };
  const avgSaldo = Math.round(withData.reduce((s,x)=>s+x.savings,0)/withData.length);
  return { perMonth: avgSaldo, netWorth: nw?nw.netWorth:null, months: withData.length };
}

// ══════════════════════════════════════════════════════
//  S16 (TODO-166): „Kam směřuju" – projekce 6 měsíců dopředu
//  Příjem = 12M klouzavý průměr; výdaje = průměr posledních 3 měsíců s daty
//  (bez aktuálního částečného měsíce). Dluh = rovnoměrné umořování
//  (měsíční splátky − měsíční úroky); schedule datumy záměrně nepoužívám
//  (běží od startDate půjčky → historicky nespolehlivé, viz v8.68).
// ══════════════════════════════════════════════════════
function _obrazProjection(D){
  const avgInc = (typeof computeEffectiveIncome==='function') ? computeEffectiveIncome(D, 12) : 0;
  let t=0,n=0;
  for(let i=1;i<=6 && n<3;i++){ let m=S.curMonth-i,y=S.curYear; while(m<0){m+=12;y--;} const e=expSum(getTx(m,y,D),D); if(e>0){t+=e;n++;} }
  const avgExp = n ? Math.round(t/n) : 0;
  // S16.2 (Milan): výdaje z PREDIKCE (predictCat – sezónnost + narozeniny, engine karty Predikce);
  //   Ø 3M jen fallback, když predikce nic nevrátí.
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  const predExpOf=(mm,yy)=>{
    if(typeof predictCat!=='function') return avgExp;
    let sum=0,hit=0;
    expCats.forEach(c=>{ const v=predictCat(c.id,null,mm,yy,D); if(v!==null&&!isNaN(v)){sum+=v;hit++;} });
    return hit?Math.round(sum):avgExp;
  };
  const saldo = avgInc - avgExp; // orientační Ø (fallback); po měsících viz months[].cash
  const wallets = (typeof assetLiqTotals==='function') ? Math.round(assetLiqTotals(D).wallets||0) : 0;
  const debts = D.debts||[];
  const debtNow = debts.reduce((a,d)=>a+(d.remaining||0),0);
  const mPay = (typeof computeMonthlyDebtPayments==='function') ? computeMonthlyDebtPayments(D) : 0;
  const mInt = debts.reduce((a,d)=>a+(d.remaining||0)*(d.interest||0)/100/12,0);
  const mPrin = Math.max(0, mPay - mInt);
  const months=[]; let cum=0;
  for(let k=1;k<=6;k++){
    let m=S.curMonth+k, y=S.curYear; while(m>11){m-=12;y++;}
    const pe=predExpOf(m,y);
    const cash=avgInc-pe; cum+=cash;
    months.push({label:CZ_M[m].slice(0,3), y, exp:pe, cash,
      reserve: Math.round(wallets + cum),
      debt: Math.round(Math.max(0, debtNow - mPrin*k))});
  }
  const avgCash=Math.round(months.reduce((a,mo)=>a+mo.cash,0)/months.length);
  // S16 (TODO-173): známé budoucí platby (šablony + splátky, budouci.js) po měsících
  if(typeof budouciGetAll==='function'){
    try{
      (budouciGetAll(D,190)||[]).forEach(b=>{
        const bd=new Date(b.date);
        const k=(bd.getFullYear()-S.curYear)*12+(bd.getMonth()-S.curMonth);
        if(k>=1&&k<=6) months[k-1].bud=(months[k-1].bud||0)+(b.amount||0);
      });
    }catch(e){}
  }
  months.forEach(mo=>{ mo.bud=Math.round(mo.bud||0); });
  return {avgInc, avgExp, saldo, avgCash, wallets, months, debtNow, mPrin, hasData: avgInc>0||avgExp>0};
}

// S16.2 (Milan): predikční graf 6 měsíců – příjem/výdaje/budoucí platby (sloupce),
// cashflow (čára s body), rezerva v tooltipu. Nahrazuje tabulku i dřívější graf rezervy.
function _obrazProjChart(proj){
  const rows=proj.months; if(!rows.length) return '';
  // S17.22 (Milan): + AKTUÁLNÍ měsíc na začátku (skutečné hodnoty, ne predikce) – ať je vidět,
  // kde uživatel právě stojí. Odlišen popiskem „teď" a plnější barvou.
  const D=getData();
  const nowExp=(typeof expSum==='function')?Math.round(expSum(getTx(S.curMonth,S.curYear,D),D)):0;
  const nowInc=(typeof incSum==='function')?Math.round(incSum(getTx(S.curMonth,S.curYear,D),D)):0;
  const nowRow={label:CZ_M[S.curMonth].slice(0,3), exp:nowExp, inc:nowInc, cash:nowInc-nowExp,
                reserve:proj.wallets, bud:0, isNow:true};
  const all=[nowRow,...rows];

  const W=900,H=330,pad={l:64,r:18,t:40,b:52};
  const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const incOf=r=>r.isNow?r.inc:proj.avgInc;
  const vMax=Math.max(...all.map(r=>Math.max(incOf(r),r.exp,r.bud||0)),1);
  const vMin=Math.min(0,...all.map(r=>Math.min(r.cash, r.reserve||0)));
  const span=Math.max(1,vMax-vMin);
  const y=v=>pad.t+cH*(1-(v-vMin)/span);
  const slot=cW/all.length, bw=Math.min(24,slot/4.4);
  let g='';

  // mřížka + osa Y
  [vMax,vMax/2,0].forEach(v=>{
    g+=`<line x1="${pad.l}" y1="${y(v)}" x2="${W-pad.r}" y2="${y(v)}" stroke="rgba(168,174,200,${v===0?'.5':'.18'})" stroke-width="1" ${v!==0?'stroke-dasharray="3,3"':''}/>`;
    g+=`<text x="${pad.l-6}" y="${y(v)+3.5}" text-anchor="end" font-size="9.5" fill="#a8aec8">${_obrazK(v)}</text>`;
  });
  if(vMin<0) g+=`<text x="${pad.l-6}" y="${y(vMin)+3.5}" text-anchor="end" font-size="9.5" fill="#a8aec8">${_obrazK(vMin)}</text>`;
  g+=`<text x="13" y="${pad.t+cH/2}" font-size="9.5" fill="#a8aec8" transform="rotate(-90,13,${pad.t+cH/2})" text-anchor="middle">Kč / měsíc</text>`;

  // sloupce + S17.22: POPISKY HODNOT nad sloupci
  all.forEach((r,i)=>{
    const cx=pad.l+i*slot+slot/2;
    const bars=[[incOf(r),'#4ade80','Příjem'],[r.exp,'#f87171','Výdaje'],[r.bud||0,'#a78bfa','Známé platby']];
    bars.forEach(([v,col,lbl],bi)=>{
      if(!(v>0)) return;
      const x=cx+(bi-1)*(bw+2)-bw/2;
      const rY=y(v), rH=Math.max(y(0)-rY,1.5);
      g+=`<rect x="${x.toFixed(1)}" y="${rY.toFixed(1)}" width="${bw.toFixed(1)}" height="${rH.toFixed(1)}" rx="2.5" fill="${col}" opacity="${r.isNow?'.95':'.8'}"><title>${lbl}: ${fmt(Math.round(v))} Kč</title></rect>`;
      // popisek nad sloupcem (jen když se vejde a hodnota není drobná)
      if(v > vMax*0.12) g+=`<text x="${(x+bw/2).toFixed(1)}" y="${(rY-3).toFixed(1)}" text-anchor="middle" font-size="7.6" fill="${col}" font-weight="700">${_obrazK(v)}</text>`;
    });
    if(r.isNow) g+=`<rect x="${(cx-slot/2+2).toFixed(1)}" y="${pad.t-2}" width="${(slot-4).toFixed(1)}" height="${cH+2}" fill="rgba(255,255,255,.035)" rx="4"/>`;
    g+=`<text x="${cx}" y="${H-pad.b+15}" text-anchor="middle" font-size="9.5" fill="${r.isNow?'#e8eaf2':'#a8aec8'}" font-weight="${r.isNow?'700':'400'}">${r.label}</text>`;
    if(r.isNow) g+=`<text x="${cx}" y="${H-pad.b+26}" text-anchor="middle" font-size="8" fill="var(--income)" font-weight="700">teď</text>`;
  });

  // čára REZERVA (kumulovaný zůstatek) – S17.22: Milan ji v grafu postrádal
  const resPts=all.map((r,i)=>({x:pad.l+i*slot+slot/2, y:y(r.reserve||0), v:r.reserve||0}));
  g+=`<polyline points="${resPts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')}" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-dasharray="5,3" opacity=".85"/>`;
  resPts.forEach(p=>g+=`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.6" fill="#fbbf24"><title>Rezerva: ${fmt(p.v)} Kč</title></circle>`);

  // čára CASHFLOW + hodnota v RÁMEČKU (Milan: lepší čitelnost)
  const cfPts=all.map((r,i)=>({x:pad.l+i*slot+slot/2, y:y(r.cash), v:r.cash}));
  g+=`<polyline points="${cfPts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')}" fill="none" stroke="#60a5fa" stroke-width="2.4" stroke-linejoin="round"/>`;
  cfPts.forEach(p=>{
    g+=`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.4" fill="#60a5fa"><title>Cashflow: ${p.v>=0?'+':''}${fmt(p.v)} Kč</title></circle>`;
    const txt=(p.v>=0?'+':'')+_obrazK(p.v), bwid=txt.length*4.6+7;
    g+=`<g><rect x="${(p.x-bwid/2).toFixed(1)}" y="${(p.y-16).toFixed(1)}" width="${bwid.toFixed(1)}" height="11.5" rx="3" fill="rgba(12,16,28,.9)" stroke="rgba(96,165,250,.55)" stroke-width=".8"/>
      <text x="${p.x.toFixed(1)}" y="${(p.y-7.6).toFixed(1)}" text-anchor="middle" font-size="7.8" fill="#93c5fd" font-weight="800">${txt}</text></g>`;
  });

  const leg=[['#4ade80','Příjem'],['#f87171','Výdaje (predikce)'],['#a78bfa','Známé platby'],['#60a5fa','Cashflow'],['#fbbf24','Rezerva (kumul.)']];
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:100%;height:auto;display:block">${g}</svg>
    <div style="display:flex;gap:11px;flex-wrap:wrap;justify-content:center;margin-top:6px;font-size:.68rem;color:#c9cede">
      ${leg.map(([c,l])=>`<span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:11px;height:3px;border-radius:2px;background:${c}"></span>${l}</span>`).join('')}
    </div>`;
}

// S17.22 (Milan): slovní vyhodnocení výhledu na 6 měsíců
function _obrazProjVerdict(proj){
  if(!proj.hasData||!proj.months.length) return '';
  const res6=proj.months[proj.months.length-1].reserve;
  const resNow=proj.wallets;
  const avg=proj.avgCash;
  const neg=proj.months.filter(m=>m.cash<0).length;
  const diff=res6-resNow;
  let tone,icon,head,body;
  if(avg>0 && res6>0){
    tone='var(--income)'; icon='✅'; head='Směřuješ správně';
    body=`Při současném tempu ti každý měsíc zbyde v průměru <strong>${fmtB(avg)}</strong>. Za půl roku bys měl mít <strong>${fmtB(res6)}</strong> místo dnešních ${fmtB(resNow)} – tedy <strong>${diff>=0?'+':''}${fmtB(diff)}</strong>.`;
  } else if(avg>0 && res6<=0){
    tone='var(--debt)'; icon='⚠️'; head='Zlepšuješ se, ale pořád v mínusu';
    body=`Měsíčně ti zbývá <strong>${fmtB(avg)}</strong>, jenže startuješ z ${fmtB(resNow)}. Za 6 měsíců budeš na <strong>${fmtB(res6)}</strong> – do plusu se takhle nedostaneš. Potřebuješ buď zvýšit příjem, nebo seškrtat výdaje.`;
  } else {
    tone='var(--expense)'; icon='🚨'; head='Takhle to nevydrží';
    body=`Predikce říká, že ti měsíčně <strong>chybí ${fmtB(Math.abs(avg))}</strong>${neg?` (${neg} z 6 měsíců v mínusu)`:''}. Rezerva klesne z ${fmtB(resNow)} na <strong>${fmtB(res6)}</strong>. Zaměř se na největší kategorie v Detektoru úspor.`;
  }
  return `<div style="display:flex;gap:10px;align-items:flex-start;padding:11px 13px;border-radius:10px;margin-bottom:12px;background:var(--surface3);border-left:3px solid ${tone}">
    <span style="font-size:1.15rem;line-height:1.2">${icon}</span>
    <div style="min-width:0">
      <div style="font-weight:800;font-size:.84rem;color:${tone};margin-bottom:3px">${head}</div>
      <div style="font-size:.74rem;color:#c9cede;line-height:1.55">${body}</div>
    </div>
  </div>`;
}

function _obrazProjDebtChart(proj){
  if(proj.debtNow<=0) return '';
  const rows=[{label:'teď',y:S.curYear,debt:proj.debtNow},...proj.months];
  const W=640,H=130,pad={l:56,r:12,t:14,b:24};
  const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const vMax=Math.max(...rows.map(r=>r.debt),1);
  const vMin=Math.min(...rows.map(r=>r.debt));
  const span=Math.max(1,vMax-vMin);
  const y=v=>pad.t+cH*(1-(v-vMin)/span);
  const x=i=>pad.l+cW*(rows.length>1?i/(rows.length-1):0);
  let g='';
  [vMax,vMin].forEach(v=>{
    g+=`<line x1="${pad.l}" y1="${y(v)}" x2="${W-pad.r}" y2="${y(v)}" stroke="rgba(168,174,200,.18)" stroke-width="1" stroke-dasharray="3,3"/>`;
    g+=`<text x="${pad.l-6}" y="${y(v)+3.5}" text-anchor="end" font-size="9.5" fill="#a8aec8">${_obrazK(v)}</text>`;
  });
  const pts=rows.map((r,i)=>`${x(i).toFixed(1)},${y(r.debt).toFixed(1)}`).join(' ');
  g+=`<polyline points="${pts}" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  rows.forEach((r,i)=>{
    const tip=`<b>${r.label}${i===0?'':' '+r.y}</b><br>Dluh ${fmtB(r.debt)}`;
    g+=`<circle cx="${x(i).toFixed(1)}" cy="${y(r.debt).toFixed(1)}" r="4" fill="#fbbf24" style="cursor:pointer"
      onmouseenter="_obrazTip(event,'${tip}')" onmouseleave="_obrazTipHide()" ontouchstart="_obrazTip(event,'${tip}')"></circle>`;
    g+=`<text x="${x(i).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="9.5" fill="#e8eaf2" font-weight="600">${r.label}</text>`;
  });
  //  v9.72: vpravo od grafu bylo prázdné místo – doplněny klíčové hodnoty,
  //  aby uživatel nemusel odečítat z osy.
  const _dStart = rows.length ? rows[0].debt : 0;
  const _dEnd   = rows.length ? rows[rows.length-1].debt : 0;
  const _dPay   = rows.length>1 ? (_dStart-_dEnd)/(rows.length-1) : 0;
  const _dBox = (l,v,c)=>`<div style="padding:7px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:.66rem;color:#a8aec8">${l}</div>
      <div style="font-family:Syne,sans-serif;font-size:1rem;font-weight:800;color:${c||'var(--text)'}">${v}</div></div>`;
  return `<div style="font-size:.72rem;color:#a8aec8;margin-top:12px">🏦 Trajektorie dluhu (splátky dle kalendáře)</div>
  <div style="display:grid;grid-template-columns:1fr 168px;gap:14px;align-items:center;margin-top:4px">
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block">${g}</svg>
    <div>
      ${_dBox('Stav dnes', fmtB(Math.round(_dStart)), 'var(--debt)')}
      ${_dBox('Ø splátka / měs', _dPay>0?'−'+fmtB(Math.round(_dPay)):'–', 'var(--income)')}
      ${_dBox('Stav za '+(rows.length-1)+' měs.', fmtB(Math.round(_dEnd)), _dEnd<_dStart?'var(--income)':'var(--debt)')}
      <div style="padding-top:7px;font-size:.66rem;color:#a8aec8;line-height:1.5">Splaceno ${fmtB(Math.round(_dStart-_dEnd))}${_dStart>0?` (${Math.round((_dStart-_dEnd)/_dStart*100)} %)`:''}</div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  S16 (TODO-167): Historie cyklů od výplaty k výplatě (týdenní výdaje)
// ══════════════════════════════════════════════════════
function radarPastCycles(D, nWant){
  if(typeof radarPaydayInfo!=='function') return [];
  const P=radarPaydayInfo(D); if(!P) return [];
  const MS=86400000;
  const snap=(expected)=>{ // přichycení očekávané výplaty na reálný příjem ±6 dní
    const w0=new Date(expected); w0.setDate(w0.getDate()-6);
    const w1=new Date(expected); w1.setDate(w1.getDate()+6);
    const cand=(D.transactions||[]).filter(t=>{
      if(t.type!=='income'||t.isBalancing||t.splitParent||isTransferTx(t)) return false;
      const d=new Date(t.date); d.setHours(0,0,0,0); return d>=w0&&d<=w1;
    });
    if(!cand.length) return expected;
    let b=cand[0]; cand.forEach(t=>{ if((t.amount||t.amt||0)>(b.amount||b.amt||0)) b=t; });
    const d=new Date(b.date); d.setHours(0,0,0,0); return d;
  };
  const cycles=[]; let end=new Date(P.lastPayday);
  for(let i=0;i<nWant;i++){
    let start;
    if(P.freq==='monthly'){
      const e=new Date(end); e.setMonth(e.getMonth()-1);
      start=snap(radarAdjustWeekend(new Date(e)));
    } else {
      start=new Date(end); start.setDate(start.getDate()-Math.max(7,P.cycleDays));
    }
    if(start>=end){ start=new Date(end); start.setDate(start.getDate()-28); }
    const last=new Date(end); last.setDate(last.getDate()-1);
    const txs=getTxByRange(start,last,D);
    const inc=Math.round(incSum(txs,D)), exp=Math.round(expSum(txs,D));
    const days=Math.max(1,Math.round((end-start)/MS));
    const weeks=[];
    for(let w=0;w*7<days;w++){
      const ws=new Date(start); ws.setDate(ws.getDate()+w*7);
      let we=new Date(ws); we.setDate(we.getDate()+6); if(we>last) we=new Date(last);
      const wtx=txs.filter(t=>{const d=new Date(t.date); d.setHours(0,0,0,0); return d>=ws&&d<=we;});
      weeks.push(Math.round(expSum(wtx,D)));
    }
    // S17.23 (Milan): denní rozpad – pro graf „po dnech" a pro zelenou křivku zbývajících peněz
    const daily=[], dailyInc=[];
    for(let d0=0; d0<days; d0++){
      const ds=new Date(start); ds.setDate(ds.getDate()+d0); ds.setHours(0,0,0,0);
      const dtx=txs.filter(t=>{const d=new Date(t.date); d.setHours(0,0,0,0); return d.getTime()===ds.getTime();});
      daily.push(Math.round(expSum(dtx,D)));
      dailyInc.push(Math.round(incSum(dtx,D)));
    }
    if(inc>0||exp>0) cycles.unshift({start,end:new Date(last),inc,exp,weeks,days,daily,dailyInc});
    end=start;
  }
  return cycles;
}

// Graf historie cyklů: sloupce = výdaje cyklu, tooltip = týdenní rozpad
// S17.22 (Milan): PŘEPRACOVÁNO – dřív sloupce = celkové výdaje cyklu s popiskem data (1.1., 1.2.).
// Nově čárový graf profilu utrácení: osa X = 1.–5. TÝDEN od výplaty, každá slabá čára = jeden
// cyklus, silná modrá = MEDIÁN týdne (odolnější než průměr vůči jednomu extrémnímu cyklu).
// Cíl: vidět STYL utrácení – jestli po výplatě „rozhazuješ" a ke konci cyklu šetříš.
// S17.23 (Milan): PŘEPRACOVÁNO PODRUHÉ. Dva režimy nad stejnými daty:
//   „Po týdnech" = velké SLOUPCE = medián útraty v daném týdnu cyklu (dřív modrá čára),
//                  přes ně slabé čáry jednotlivých cyklů (max/min/průběhy), popsané měsícem;
//   „Po dnech"   = 1 sloupec = 1 den cyklu (Ø útrata napříč cykly) – detailní profil.
// V obou režimech ZELENÁ křivka = kolik z výplaty ještě zbývá (klesá s utrácením,
// vyskočí nahoru, když během cyklu přijde další příjem).
// S17.24 (Milan): FINÁLNÍ PODOBA. Změť čar jednotlivých cyklů odstraněna – nedala se číst.
// Zůstávají jen: široké modré sloupce = TÝDEN (medián útraty za celý týden), uvnitř tenké
// červené sloupečky = jednotlivé DNY (medián útraty daného dne) a zelená křivka = kolik
// z výplaty ještě zbývá. Křivka startuje na VÝPLATĚ (ne na nule) a klesá, jak utrácíš;
// když během cyklu přijde další příjem, vyskočí nahoru.
let _cycMode = 'week';
function cycSetMode(m){ _cycMode = m; if(typeof renderObraz==='function') renderObraz(); }

function _obrazCyclesChart(cycles){
  if(!cycles||cycles.length<2) return '';
  const showDays = _cycMode === 'day';
  const med=a=>{ const s=a.filter(v=>v!==undefined&&isFinite(v)).sort((p,q)=>p-q); if(!s.length) return 0;
    const m=s.length>>1; return s.length%2?s[m]:Math.round((s[m-1]+s[m])/2); };

  const nW = Math.min(5, Math.max(...cycles.map(c=>(c.weeks||[]).length),1));
  if(nW<2) return '';
  const nD = Math.min(nW*7, Math.max(...cycles.map(c=>(c.daily||[]).length),1));
  const weekMed = Array.from({length:nW},(_,i)=>med(cycles.map(c=>(c.weeks||[])[i])));
  const dayMed  = Array.from({length:nD},(_,i)=>med(cycles.map(c=>(c.daily||[])[i])));

  // ── zelená křivka: kolik z výplaty zbývá ──
  // S17.24 (Milan): DŘÍV začínala na nule, protože se jen kumulovalo (příjem − výdaj) od 0.
  // Cyklus přitom ZAČÍNÁ výplatou, takže první den má být na maximu. Proto se křivka seeduje
  // první výplatou cyklu a dál už jen klesá o výdaje; další příjmy ji zvednou.
  const remainOf = c => {
    const ex=c.daily||[], inc=c.dailyInc||[]; if(!ex.length) return [];
    const seedIdx = inc.findIndex(v=>v>0);
    const seed = seedIdx>=0 ? inc[seedIdx] : (c.inc||0);
    let bal = seed; const out=[];
    for(let d=0; d<ex.length; d++){
      if(d>0 && d!==seedIdx && (inc[d]||0)>0) bal += inc[d];   // další příjem během cyklu
      bal -= (ex[d]||0);
      out.push(Math.round(bal));
    }
    return out;
  };
  const remains = cycles.map(remainOf).filter(a=>a.length);
  const remainDay = remains.length ? Array.from({length:nD},(_,i)=>med(remains.map(a=>a[i]))) : [];
  const remainWeek = remains.length ? Array.from({length:nW},(_,i)=>med(remains.map(a=>a[Math.min(a.length-1,(i+1)*7-1)]))) : [];

  // ── plátno ──
  const W=900,H=340,pad={l:70,r:22,t:26,b:56};
  const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const green = showDays ? remainDay : remainWeek;
  const allVals=[...weekMed,...(showDays?dayMed:[]),...green].filter(v=>isFinite(v));
  const vMaxRaw=Math.max(...allVals,1), vMinRaw=Math.min(0,...allVals);
  // S17.24: dolní tick se dřív kreslil těsně u osy X a překrýval popisky – přidán odstup
  const vMax=vMaxRaw*1.06, vMin=vMinRaw<0?vMinRaw*1.12:0;
  const span=Math.max(1,vMax-vMin);
  const y=v=>pad.t+cH*(1-(v-vMin)/span);
  const wSlot=cW/nW;
  let g='';

  // mřížka + osa Y (dolní hodnota jen když je dost daleko od nuly)
  const ticks=[vMaxRaw, vMaxRaw*0.5, 0];
  if(vMinRaw < -vMaxRaw*0.08) ticks.push(vMinRaw);
  ticks.forEach(v=>{
    const yy=y(v);
    g+=`<line x1="${pad.l}" y1="${yy.toFixed(1)}" x2="${W-pad.r}" y2="${yy.toFixed(1)}" stroke="rgba(168,174,200,${v===0?'.55':'.15'})" stroke-width="1" ${v!==0?'stroke-dasharray="3,3"':''}/>`;
    g+=`<text x="${pad.l-8}" y="${(yy+3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#a8aec8">${_obrazK(v)}</text>`;
  });
  g+=`<text x="16" y="${pad.t+cH/2}" font-size="10" fill="#a8aec8" transform="rotate(-90,16,${pad.t+cH/2})" text-anchor="middle">Kč</text>`;

  // ── široké TÝDENNÍ sloupce (dominantní) ──
  const wbw = wSlot*(showDays?0.86:0.52);
  weekMed.forEach((v,i)=>{
    if(!(v>0)) return;
    const cx=pad.l+wSlot*i+wSlot/2, yy=y(v), hh=Math.max(y(0)-yy,1.5);
    g+=`<rect x="${(cx-wbw/2).toFixed(1)}" y="${yy.toFixed(1)}" width="${wbw.toFixed(1)}" height="${hh.toFixed(1)}" rx="4"
      fill="#60a5fa" opacity="${showDays?'.24':'.8'}"><title>${i+1}. týden – medián: ${fmt(v)} Kč</title></rect>`;
    g+=`<text x="${cx.toFixed(1)}" y="${(yy-6).toFixed(1)}" text-anchor="middle" font-size="11" fill="#93c5fd" font-weight="800">${_obrazK(v)}</text>`;
  });

  // ── tenké DENNÍ sloupečky uvnitř týdnů (jen v denním režimu) ──
  if(showDays){
    const dSlot=cW/nD, dbw=Math.max(2.5,dSlot*0.5);
    dayMed.forEach((v,i)=>{
      if(!(v>0)) return;
      const cx=pad.l+dSlot*i+dSlot/2, yy=y(v), hh=Math.max(y(0)-yy,1.2);
      g+=`<rect x="${(cx-dbw/2).toFixed(1)}" y="${yy.toFixed(1)}" width="${dbw.toFixed(1)}" height="${hh.toFixed(1)}" rx="1.5"
        fill="#f87171" opacity=".9"><title>${i+1}. den – medián: ${fmt(v)} Kč</title></rect>`;
    });
  }

  // ── zelená křivka „zbývá z výplaty" ──
  if(green.length){
    const n=green.length, gx=i=> showDays ? (pad.l+(cW/nD)*i+(cW/nD)/2) : (pad.l+wSlot*i+wSlot/2);
    const pts=green.map((v,i)=>({x:gx(i),y:y(v),v}));
    g+=`<polyline points="${pts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')}" fill="none" stroke="#4ade80" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p,i)=>{
      if(showDays && n>12 && i%3!==0 && i!==n-1) return;
      g+=`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.6" fill="#4ade80" stroke="#0c101c" stroke-width="1.3">
        <title>Zbývá po ${showDays?(i+1)+'. dni':(i+1)+'. týdnu'}: ${fmt(p.v)} Kč</title></circle>`;
    });
    // popisek startu a konce
    const f=pts[0], l=pts[n-1];
    g+=`<text x="${(f.x+6).toFixed(1)}" y="${(f.y-8).toFixed(1)}" font-size="10" fill="#4ade80" font-weight="800">${_obrazK(f.v)}</text>`;
    g+=`<text x="${(l.x-4).toFixed(1)}" y="${(l.y-8).toFixed(1)}" text-anchor="end" font-size="10" fill="${l.v<0?'#f87171':'#4ade80'}" font-weight="800">${_obrazK(l.v)}</text>`;
  }

  // ── osa X ──
  for(let i=0;i<nW;i++){
    const cx=pad.l+wSlot*i+wSlot/2;
    g+=`<text x="${cx.toFixed(1)}" y="${H-pad.b+18}" text-anchor="middle" font-size="11" fill="#c9cede" font-weight="600">${i+1}. týden</text>`;
  }
  g+=`<text x="${(pad.l+cW/2).toFixed(1)}" y="${H-pad.b+36}" text-anchor="middle" font-size="9" fill="#a8aec8">${showDays?'dny seskupené do týdnů od výplaty':'týdny od výplaty'}</text>`;

  // slovní vyhodnocení
  const peak=weekMed.indexOf(Math.max(...weekMed)), tot=weekMed.reduce((a,b)=>a+b,0)||1;
  const firstShare=Math.round((weekMed[0]+(weekMed[1]||0))/tot*100);
  let verdict;
  if(peak<=1&&firstShare>=55) verdict=`Nejvíc utrácíš hned po výplatě – v prvních dvou týdnech padne <strong>${firstShare} %</strong> cyklu. Odlož si část stranou hned po výplatě.`;
  else if(peak>=nW-2) verdict=`Utrácení ti roste ke konci cyklu (vrchol v <strong>${peak+1}. týdnu</strong>) – typicky dobíhající platby nebo nákupy na poslední chvíli.`;
  else verdict=`Utrácíš poměrně rovnoměrně, vrchol máš ve <strong>${peak+1}. týdnu</strong>. Zdravý profil bez povýplatních horeček.`;

  const btn=(m,t)=>`<button onclick="cycSetMode('${m}')" style="padding:4px 11px;border-radius:8px;font-size:.73rem;font-weight:600;cursor:pointer;border:1px solid ${_cycMode===m?'rgba(96,165,250,.55)':'var(--border)'};background:${_cycMode===m?'rgba(96,165,250,.16)':'transparent'};color:${_cycMode===m?'#93c5fd':'#a8aec8'}">${t}</button>`;

  return `<div style="display:flex;gap:6px;justify-content:flex-end;margin-bottom:8px">${btn('week','📊 Po týdnech')}${btn('day','📅 Po dnech')}</div>
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:100%;height:auto;display:block">${g}</svg>
    <div style="display:flex;gap:13px;flex-wrap:wrap;justify-content:center;margin-top:7px;font-size:.7rem;color:#c9cede">
      <span style="display:inline-flex;align-items:center;gap:5px"><span style="display:inline-block;width:15px;height:9px;border-radius:2px;background:#60a5fa;opacity:${showDays?'.35':'.8'}"></span>Týden (medián)</span>
      ${showDays?`<span style="display:inline-flex;align-items:center;gap:5px"><span style="display:inline-block;width:5px;height:11px;border-radius:1px;background:#f87171"></span>Den (medián)</span>`:''}
      <span style="display:inline-flex;align-items:center;gap:5px"><span style="display:inline-block;width:15px;height:3px;border-radius:2px;background:#4ade80"></span>Zbývá z výplaty</span>
    </div>
    <div style="font-size:.72rem;color:#a8aec8;margin-top:8px;line-height:1.55;padding:7px 9px;background:var(--surface3);border-radius:7px">📊 ${verdict} <span style="opacity:.8">Zelená křivka startuje na výplatě a klesá, jak utrácíš – když vyskočí nahoru, přišel další příjem. Mediány jsou počítané ze ${cycles.length} cyklů.</span></div>`;
}

function _cycLbl(c){ try{ return `${c.start.getDate()}.${c.start.getMonth()+1}.`; }catch(e){ return 'cyklus'; } }

// ══════════════════════════════════════════════════════
//  v9.44 (S18): PŘEPÍNAČ OKNA + PODMETRIKY FINANČNÍHO OBRAZU
//
//  JEDNO PRAVIDLO pro všechna okna: okno se rozpůlí a 2. polovina
//  se porovná s 1. Datová náročnost = délka okna, žádná zvláštní
//  větev pro nové uživatele (kratší historie = kratší okno).
//    6M  → 3 vs 3 · 12M → 6 vs 6 · Celkově → půlka historie
//
//  ⚠️ ZÁMĚRNÁ FÁZE, NE NEDODĚLEK: podmetriky se zatím NEPROMÍTAJÍ
//  do skóre 0–100. Prahy pro bodování nelze odvodit dřív, než bude
//  vidět rozptyl na reálných datech (je Income Capture 40 % dobrý
//  výsledek? dnes to neví nikdo). Skóre zůstává ukotvené na 6M,
//  aby se uživateli nezměnilo jen přepnutím okna.
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  v9.51: SKÓRE FINANČNÍHO OBRAZU – oddělený výpočet
//  Vrací i ROZPAD na jednotlivé příspěvky, aby šel vykreslit vodopád.
//  ⚠️ Vzorec zůstává beze změny (základ 50 ± 15 za každou ze čtyř složek).
//  Nové podmetriky z v9.44 do skóre ZÁMĚRNĚ nevstupují – prahy pro bodování
//  nelze poctivě určit, dokud nebude vidět jejich rozptyl na reálných datech.
// ══════════════════════════════════════════════════════
function computeObrazScore(series){
  const withData = series.filter(s => s.inc > 0 || s.exp > 0);
  const first = withData.length >= 2 ? withData[0] : series[0];
  const last  = series[series.length-1];
  if(!first || !last) return {score:50, parts:[], hasData:false};

  const incT  = first.inc>0     ? Math.round((last.inc-first.inc)/first.inc*100) : 0;
  const expT  = first.exp>0     ? Math.round((last.exp-first.exp)/first.exp*100) : 0;
  const savT  = first.savings!==0 ? Math.round((last.savings-first.savings)/Math.abs(first.savings)*100) : 0;
  const debtT = first.debt>0    ? Math.round((last.debt-first.debt)/first.debt*100) : 0;

  const parts = [
    {key:'inc',  label:'💰 Příjmy',      d: incT>5?15  : incT<-5?-15 : 0, note: incT>5?'rostou':incT<-5?'klesají':'beze změny'},
    {key:'exp',  label:'🛒 Výdaje',      d: expT<-5?15 : expT>10?-15 : 0, note: expT<-5?'klesají':expT>10?'rostou':'drží se'},
    {key:'sav',  label:'🚀 Úspory',      d: savT>10?15 : savT<-10?-15: 0, note: savT>10?'rostou':savT<-10?'klesají':'beze změny'},
    {key:'debt', label:'💳 Zadluženost', d: debtT<-5?15: debtT>5?-15 : 0, note: debtT<-5?'klesá':debtT>5?'roste':'beze změny'},
  ];
  const raw = 50 + parts.reduce((a,p)=>a+p.d, 0);
  const score = Math.max(0, Math.min(100, raw));
  //  `raw` vracíme kvůli vodopádu: při plném zlepšení dá součet 110, ale skóre
  //  je oříznuté na 100 – bez téhle informace by rozpad neseděl se zobrazeným číslem.
  return { score, raw, clamped: raw !== score, parts, hasData: withData.length >= 2 };
}

// Skóre pro okno posunuté o `back` měsíců zpět – pro srovnání „kde jsem byl".
function computeObrazScoreBack(D, months, back){
  const ser = [];
  for(let i = months + back - 1; i >= back; i--){
    const dt = new Date(S.curYear, S.curMonth - i, 1);
    const m = dt.getMonth(), y = dt.getFullYear();
    let inc=0, exp=0;
    (D.transactions||[]).forEach(t=>{
      if(!t || !t.date || t.splitParent || t.isBalancing) return;
      if(typeof isTransferTx==='function' && isTransferTx(t)) return;
      const d = new Date(t.date); if(d.getMonth()!==m || d.getFullYear()!==y) return;
      const a = (typeof txCZK==='function') ? txCZK(t, D) : (t.amount||0);
      if(a>0) inc+=a; else exp+=Math.abs(a);
    });
    ser.push({inc, exp, savings:inc-exp, debt:0});
  }
  return computeObrazScore(ser);
}

// Sbalitelné řádky pokročilých metrik – volba se pamatuje
let _obrazRows = (()=>{ try{ return JSON.parse(localStorage.getItem('ff_obraz_rows')||'{}'); }catch(e){ return {}; } })();
function obrazToggleRow(k){
  _obrazRows[k] = !_obrazRows[k];
  try{ localStorage.setItem('ff_obraz_rows', JSON.stringify(_obrazRows)); }catch(e){}
  if(typeof renderObraz==='function') renderObraz();
}

let _obrazWin = (()=>{ try{ return localStorage.getItem('ff_obraz_win')||'6'; }catch(e){ return '6'; } })();
function obrazSetWin(w){
  _obrazWin = w;
  try{ localStorage.setItem('ff_obraz_win', w); }catch(e){}
  if(typeof renderObraz==='function') renderObraz();
}

// Kolik měsíců zpět načítat podle zvoleného okna.
// 'all' → od nejstarší transakce (strop 120 měs., ať render nezdivočí na dlouhé historii).
function _obrazWinMonths(D){
  if(_obrazWin==='12') return 12;
  if(_obrazWin==='all'){
    const ts=(D.transactions||[]).map(t=>new Date(t.date).getTime()).filter(x=>!isNaN(x));
    if(!ts.length) return 6;
    const oldest=new Date(Math.min(...ts));
    const n=(S.curYear-oldest.getFullYear())*12 + (S.curMonth-oldest.getMonth()) + 1;
    return Math.max(2, Math.min(120, n));
  }
  return 6;
}

// ── Výpočet podmetrik ODDĚLENĚ od vykreslení (architektonická zásada č. 2). ──
// Vrací hodnoty, nesahá na globální S. Připraveno pro sdílení s Deníkem,
// aby stejný výpočet nevznikl podruhé (SKILL 17).
function computeObrazSubmetrics(series){
  const av = x => x.length ? x.reduce((s,v)=>s+v,0)/x.length : 0;
  const halves = vals => { const h=Math.floor(vals.length/2);
    return { a: av(vals.slice(0, vals.length-h)), b: av(vals.slice(vals.length-h)) }; };

  const I = halves(series.map(x=>x.inc));
  const E = halves(series.map(x=>x.exp));
  const Sv= halves(series.map(x=>x.savings));
  const Dt= halves(series.map(x=>x.debt));

  const dI = I.b-I.a, dE = E.b-E.a, dS = Sv.b-Sv.a, dD = Dt.b-Dt.a;
  const incG = I.a>0 ? (dI/I.a*100) : null;
  const expG = E.a>0 ? (dE/E.a*100) : null;

  // Práh stability: pod ním by drobná změna dala nesmyslné procento
  // (ΔP 200 Kč, ΔV 600 Kč → MPC 300 %).
  const MIN = 2000;
  const grew = dI >= MIN, fell = dI <= -MIN;

  return {
    win: _obrazWin, months: series.length,
    baseInc:I.a, curInc:I.b, baseExp:E.a, curExp:E.b,
    dI, dE, dS, dD, incG, expG,
    // Expense Ratio – POMĚR ÚROVNÍ (ne tempo). Definice shodná s expRatio
    // ve složce S1 skóre 0–310, aby obě obrazovky neukázaly rozporná čísla.
    expRatioNow: I.b>0 ? E.b/I.b : null,
    expRatioBase: I.a>0 ? E.a/I.a : null,
    // Expense Control: výdaje VŮČI příjmům, ne samy o sobě
    control: (incG===null||expG===null) ? null : (expG<=incG),
    // Capture jen při RŮSTU, Resilience jen při POKLESU – nikdy obojí.
    // ΔS/ΔP dá při obou záporných kladné číslo, takže 50 % by znamenalo
    // „získal jsem 4 000\" i „přišel jsem o 5 000\".
    capture:    grew ? (dS/dI*100) : null,
    resilience: fell ? (dE/dI*100) : null,
    captureNA:  (!grew && !fell),
    // Dluhy v Kč/měs, ne v %: −10 % z 5 000 Kč a z 500 000 Kč je jiná situace
    debtPerMonth: series.length>1 ? dD/Math.max(1,Math.floor(series.length/2)) : 0,
  };
}

function renderObraz() {
  const el = document.getElementById('obrazContent'); if(!el) return;
  const D = getData();

  // v9.44: délka okna podle přepínače (dřív natvrdo 6)
  const months = _obrazWinMonths(D);
  const series = [];
  for(let i=months-1;i>=0;i--){
    let m=S.curMonth-i, y=S.curYear;
    while(m<0){m+=12;y--;}
    const txs = getTx(m,y,D);
    const inc = incSum(txs), exp = expSum(txs);
    const debts = D.debts||[];
    const totalDebtNow = debts.reduce((a,d)=>a+d.remaining,0);
    // v8.68: HISTORIE dluhu rekonstruovaná ze splátek (transakce s debtId) – zůstatek na konci
    // měsíce = dnešní zůstatek + splátky zaplacené PO tomto měsíci (orientačně, splátky vč. úroků).
    // Dřív měl každý měsíc stejné dnešní číslo → trend Dluhy byl vždy 0 %.
    const monthEnd = new Date(y, m+1, 1).getTime();
    const paidAfter = (D.transactions||[]).filter(t=>t.debtId && !t.splitParent && new Date(t.date).getTime()>=monthEnd)
      .reduce((a,t)=>a+txCZK(t,D),0);
    const totalDebt = totalDebtNow + paidAfter;
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

  // v9.51: výpočet skóre vytažen do computeObrazScore() – potřebujeme ho spočítat
  //  i pro STARŠÍ okno (Cesta finančního zdraví), a duplikovat vzorec by znamenalo
  //  dvě místa, která se časem rozejdou (SKILL 17).
  const _sc = computeObrazScore(series);
  const score = _sc.score;

  const trend = score>=65?'improving':score>=40?'stable':'declining';
  const trendLabel = trend==='improving'?'📈 Zlepšuji se!':trend==='stable'?'↔️ Stagnuji':'📉 Zhoršuji se';
  const trendColor = trend==='improving'?'var(--income)':trend==='stable'?'var(--debt)':'var(--expense)';

  // v8.74 (FIX-191): rawTrend = SKUTEČNÝ směr (šipka), good = jestli je to DOBŘE.
  // Dřív se u výdajů/dluhů posílal -trend → šipka i fajfka byly rozhozené
  // (výdaje +37 % ukazovaly ↓ a zelenou ✅). Nyní: výdaje ↑ = ⚠️, výdaje ↓ = ✅.

  // Session 10: pokročilé metriky (TODO-088, 089, 091, 092)
  const ffr = computeFFR(D);
  const lifestyle = computeLifestyleInflation(series);
  const diversification = computeIncomeDiversification(D);
  const momentum = computeWealthMomentum(D, series);

  // S16 (TODO-166/167): projekce 6 měsíců + historie payday cyklů
  const proj = _obrazProjection(D);
  const cycles = radarPastCycles(D, 6);

  // ── S16.3 (Milan): TREND = Ø POSLEDNÍCH 3 měsíců vs Ø PŘEDCHOZÍCH 3 (šipka + %). ──
  //   Regrese (v8.82) byla matematicky korektní, ale nečitelná („stabilní" u volatilní řady).
  //   Půlky okna zprůměrují šum – konzistentní s Inflací životního stylu níže.
  //   Základna blízko nule → absolutní Kč místo % (dělení ~nulou dává nesmysly).
  const _half=vals=>{ const h=Math.floor(vals.length/2); const a=vals.slice(0,vals.length-h), b=vals.slice(vals.length-h);
    const av=x=>x.length?x.reduce((s2,v)=>s2+v,0)/x.length:0; return {a:av(a), b:av(b)}; };
  const _pctTxt=vals=>{ const {a,b}=_half(vals);
    if(Math.abs(a)<1000){ const d=Math.round(b-a); return {txt:`${d>0?'↑ ':d<0?'↓ ':'↔ '}${d>=0?'+':''}${fmt(d)} Kč`, dir:d}; }
    const p2=Math.round((b-a)/Math.abs(a)*100);
    return {txt:`${p2>0?'↑ ':p2<0?'↓ ':'↔ '}${p2>=0?'+':''}${p2} %`, dir:p2}; };
  const trInc=_pctTxt(series.map(x=>x.inc)), trExp=_pctTxt(series.map(x=>x.exp));
  const trMom=_pctTxt(series.map(x=>x.savings)), trDebt=_pctTxt(series.map(x=>x.debt));

  // v9.44: podmetriky (výpočet je oddělený, tady se jen čte)
  const sm = computeObrazSubmetrics(series);
  const _halfN = Math.max(1, Math.floor(series.length/2));
  const _winTxt = `Ø posl. ${_halfN} vs předch. ${series.length-_halfN} měs.`;
  const _p1 = v => (v>=0?'+':'')+v.toFixed(1).replace('.',',')+' %';
  // Vysvětlivka „Co to je" – rozbalovací, ne natrvalo viditelná (zdvojnásobila by výšku karet)
  //  v9.70: vysvětlivky ROZBALENÉ (dřív <details>). Uživatel je nemá hledat –
  //  smyslem podmetrik je, aby jim rozuměl bez klikání.
  const _why = txt => `<div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);font-size:.68rem;color:#a8aec8;line-height:1.55"><b style="color:#c9cede">Co to je:</b> ${txt}</div>`;
  //  v9.70: nadpis o stupeň větší, HODNOTA MÁ BARVU KARTY (dřív byla vždy bílá,
  //  takže barevný pruh vlevo nedával smysl) a pod hlavním číslem je víc místa.
  const _sub = (title,val,desc,color,why) => `
    <div style="margin-top:11px;padding:10px 12px;background:var(--surface2);border-left:3px solid ${color};border-radius:0 10px 10px 0">
      <div style="display:flex;justify-content:space-between;gap:6px;align-items:baseline">
        <span style="font-size:.7rem;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:.05em">${title}</span>
        <span style="font-size:.66rem;color:#a8aec8">${_winTxt}</span>
      </div>
      <div style="font-family:Syne,sans-serif;font-size:1.15rem;font-weight:800;margin:3px 0 5px;color:${color}">${val}</div>
      <div style="font-size:.7rem;color:#a8aec8;line-height:1.5">${desc}</div>
      ${_why(why)}
    </div>`;

  const C_OK='var(--income)', C_WARN='var(--debt)', C_NA='var(--text3)', C_B='#60a5fa';

  const smIncome = _sub('Income Momentum',
    sm.incG===null ? '—' : _p1(sm.incG),
    sm.incG===null ? 'Bez příjmu nelze určit směr.' : (sm.incG>=0?'Příjem roste.':'Příjem klesá.'),
    sm.incG===null ? C_NA : (sm.incG>=0?C_OK:C_WARN),
    'Tempo změny příjmu. Odpovídá jen na otázku „vydělávám víc než dřív?" – neříká nic o tom, jestli si z toho něco necháváš.');

  const smExpense = _sub('Expense Control',
    sm.control===null ? '—' : (sm.control?'Drží krok':'Zaostává'),
    sm.control===null ? 'Chybí příjem pro porovnání.' : `Výdaje ${_p1(sm.expG)} vs. příjmy ${_p1(sm.incG)}.`,
    sm.control===null ? C_NA : (sm.control?C_OK:C_WARN),
    'Porovnává tempo výdajů <b>vůči tempu příjmů</b>. Samotný růst výdajů není problém – problém je, když roste rychleji než příjem.');

  const smCapture = sm.capture!==null
    ? _sub('Income Capture', Math.round(sm.capture)+' %',
        sm.capture<=5
          ? `Z nárůstu příjmu o ${fmtB(sm.dI)} se do úspor promítlo ${fmtB(sm.dS)}. Celý přírůstek se rozpustil ve výdajích.`
          : `Z nárůstu příjmu o ${fmtB(sm.dI)} se do úspor promítlo ${fmtB(sm.dS)}.`,
        sm.capture<=5?'var(--expense)':sm.capture<50?C_WARN:C_OK,
        'Kolik z <b>dodatečného</b> příjmu sis skutečně udržel. 0 % = celý přírůstek se rozpustil ve výdajích, 100 % = celý skončil v úsporách. Zobrazuje se jen při růstu příjmu.')
    : sm.resilience!==null
    ? _sub('Income Resilience', Math.round(sm.resilience)+' %',
        `Příjem klesl o ${fmtB(-sm.dI)}, výdaje o ${fmtB(-sm.dE)}. Tolik z propadu pokrylo přizpůsobení výdajů.`,
        sm.resilience>=70?C_OK:sm.resilience>=40?C_WARN:'var(--expense)',
        'Jak dobře se výdaje přizpůsobily poklesu příjmu. Nahrazuje Income Capture, protože při poklesu by stejné procento znamenalo opačnou situaci.')
    : _sub('Income Capture', '—',
        'Příjem se nezměnil dost na to, aby šlo poměr spočítat.',
        C_NA,
        'Potřebuje změnu příjmu aspoň 2 000 Kč. Bez prahu by drobný výkyv dal nesmyslné procento (např. 300 %).');

  const smDebt = _sub('Debt Momentum',
    (sm.debtPerMonth>=0?'+':'')+fmtB(sm.debtPerMonth)+'/měs',
    sm.debtPerMonth<0 ? 'Zadlužení klesá.' : sm.debtPerMonth>0 ? 'Zadlužení roste.' : 'Zadlužení se nemění.',
    sm.debtPerMonth<=0?C_OK:C_WARN,
    'Rychlost změny zadlužení <b>v korunách za měsíc</b>, ne v procentech. U dluhů procenta klamou: −10 % z 5 000 Kč a z 500 000 Kč je úplně jiná situace.');
  // S16 (TODO-171): Úspory (saldo aktuálního měsíce) nahrazeny Wealth Momentum (Ø saldo 6 měs.)
  //  v9.70: každé hlavní číslo má barvu podle toho, jestli je vývoj příznivý.
  //  U Momenta navíc POZNÁMKA K ŠIPCE – hodnota je PRŮMĚR za okno, kdežto šipka
  //  ukazuje TREND (poslední polovina vs. předchozí). Kladné momentum s klesající
  //  šipkou tedy není chyba: pořád ti přibývá, ale pomaleji než dřív.
  const _cGood = 'var(--income)', _cBad = 'var(--expense)', _cNeu = 'var(--debt)';
  const metrics = [
    {label:'💰 Příjmy',   val:fmtB(last.inc),  valColor: trInc.dir>0?_cGood:trInc.dir<0?_cNeu:'var(--text)',
     trendTxt:trInc.txt,  good:trInc.dir>=0, subm:smIncome},
    {label:'💸 Výdaje',   val:fmtB(last.exp),  valColor: trExp.dir<0?_cGood:trExp.dir>0?_cNeu:'var(--text)',
     trendTxt:trExp.txt,  good:trExp.dir<=0, subm:smExpense},
    {label:'🚀 Momentum', val:`${momentum.perMonth>=0?'+':''}${fmtB(momentum.perMonth)}/měs`,
     valColor: momentum.perMonth>=0?_cGood:_cBad,
     sub:`tento měsíc ${last.savings>=0?'+':''}${fmtB(last.savings)}`,
     trendTxt:trMom.txt, good:trMom.dir>=0, subm:smCapture,
     trendNote: momentum.perMonth>0 && trMom.dir<0
       ? 'Hodnota je průměr za okno, šipka ukazuje tempo. Pořád ti přibývá, ale pomaleji než v předchozím období.'
       : (momentum.perMonth<0 && trMom.dir>0 ? 'Saldo je zatím záporné, ale tempo se zlepšuje.' : '')},
    {label:'🏦 Dluhy',    val:fmtB(last.debt), valColor: last.debt>0?(trDebt.dir<0?_cGood:_cNeu):'var(--text)',
     trendTxt:trDebt.txt, good:trDebt.dir<=0, subm:smDebt},
  ];

  // ══════════════════════════════════════════════════════
  //  v9.51: CESTA FINANČNÍHO ZDRAVÍ – kde jsi byl → kde jsi teď → čím to bylo
  //  Skóre samo o sobě neřekne, co ho posunulo. Vodopád rozpadne aktuální
  //  skóre na příspěvky čtyř složek, ze kterých se skutečně počítá – tedy
  //  žádné dohadování, je to přesně ten vzorec.
  // ══════════════════════════════════════════════════════
  const _back = Math.max(3, Math.min(6, series.length));
  const _prev = computeObrazScoreBack(D, series.length, _back);
  const _dScore = _prev.hasData ? (score - _prev.score) : null;
  const _wfMax = 15;
  const journeyCard = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-body" style="padding:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <span style="font-size:.82rem;font-weight:700">🧭 1 · Cesta finančního zdraví</span>
          <span style="font-size:.66rem;color:#a8aec8">${_winTxt}</span>
        </div>
        ${_prev.hasData ? `
          <div style="display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;margin-bottom:12px">
            <div style="text-align:center"><div style="font-family:Syne,sans-serif;font-size:1.35rem;font-weight:800;color:#a8aec8">${_prev.score}</div>
              <div style="font-size:.66rem;color:#a8aec8">před ${_back} měs.</div></div>
            <div style="color:#a8aec8">→</div>
            <div style="text-align:center"><div style="font-family:Syne,sans-serif;font-size:1.35rem;font-weight:800;color:${trendColor}">${score}</div>
              <div style="font-size:.66rem;color:#a8aec8">dnes</div></div>
            <div style="background:${_dScore>=0?'rgba(74,222,128,.13)':'rgba(248,113,113,.13)'};border:1px solid ${_dScore>=0?'rgba(74,222,128,.3)':'rgba(248,113,113,.3)'};border-radius:11px;padding:6px 13px;text-align:center">
              <div style="font-family:Syne,sans-serif;font-size:1.05rem;font-weight:800;color:${_dScore>=0?'var(--income)':'var(--expense)'}">${_dScore>=0?'+':''}${_dScore} ${Math.abs(_dScore)===1?'bod':Math.abs(_dScore)<5?'body':'bodů'}</div>
              <div style="font-size:.66rem;color:#a8aec8">za ${_back} měsíců</div></div>
          </div>` : `
          <div style="font-size:.75rem;color:#a8aec8;margin-bottom:10px">
            Na srovnání „kde jsi byl" potřebujeme aspoň ${series.length + 3} měsíců dat. Zatím jich máme ${series.length}, takže ukazujeme jen dnešní rozpad.</div>`}

        ${(()=>{
          //  v9.70: Monthly Score a Momentum Score s plnými popisky dle modelu.
          //  Monthly = jak dopadlo poslední období proti průměru okna (kolísá).
          //  Momentum = SMĚR a STÁLOST pohybu, ne úroveň.
          const hist = [];
          for(let i=series.length-1;i>=0;i--){
            const sc = computeObrazScore(series.slice(0, series.length-i));
            if(sc.hasData || i===0) hist.push(sc.score);
          }
          if(hist.length < 2) return '';
          const avg = Math.round(hist.reduce((a,b)=>a+b,0)/hist.length);
          const monthly = hist[hist.length-1];
          const dAvg = monthly - avg;
          let ups=0; for(let i=1;i<hist.length;i++) if(hist[i]>=hist[i-1]) ups++;
          const steps = hist.length-1;
          const stable = Math.round(ups/steps*100);
          const mx = Math.max(...hist, 1);
          const nM = series.length;
          //  slovní hodnocení momenta – text musí odpovídat datům, ne být ozdoba
          const momUp = _dScore!==null && _dScore>0;
          const momLbl = _dScore===null ? '' :
            (_dScore>0 && stable>=60) ? ' · stabilní růst' :
            (_dScore>0)              ? ' · růst s výkyvy' :
            (_dScore<0 && stable<40) ? ' · trvalý pokles' :
            (_dScore<0)              ? ' · pokles s výkyvy' : ' · beze změny';
          const momCol = _dScore===null ? '#a8aec8' : _dScore>0 ? 'var(--income)' : _dScore<0 ? 'var(--expense)' : 'var(--debt)';
          const barCol = v => v>=65?'var(--income)':v>=40?'var(--debt)':'var(--expense)';
          return `
          <div style="display:flex;align-items:flex-end;gap:5px;height:52px">
            ${hist.map((v,i)=>`<div title="${v}/100" style="flex:1;height:${Math.max(8,v/mx*100)}%;border-radius:4px 4px 0 0;background:${i===hist.length-1?barCol(v):'rgba(96,165,250,.45)'}"></div>`).join('')}
          </div>
          <!-- v9.72: popisky osy X – bez nich nešlo poznat, který sloupec je který měsíc -->
          <div style="display:flex;gap:5px;margin-top:4px">
            ${hist.map((v,i)=>{ const off=hist.length-1-i; let m=S.curMonth-off, y=S.curYear; while(m<0){m+=12;y--;}
              return `<div style="flex:1;text-align:center;font-size:.66rem;color:${i===hist.length-1?'#c9cede':'#8b93ad'};font-weight:${i===hist.length-1?'700':'400'}">${CZ_M[m].slice(0,3)}</div>`; }).join('')}
          </div>
          <div style="font-size:.66rem;color:#8b93ad;text-align:center;margin:6px 0 14px">Vývoj skóre v okně · poslední sloupec = aktuální stav · skóre 0–100</div>

          <div style="padding:11px 13px;background:var(--surface2);border-left:3px solid #60a5fa;border-radius:0 10px 10px 0;margin-bottom:9px">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
              <span style="font-size:.7rem;font-weight:800;color:#60a5fa;text-transform:uppercase;letter-spacing:.05em">Monthly Score</span>
              <span style="font-size:.66rem;color:#a8aec8">tento měsíc vs baseline</span>
            </div>
            <div style="font-family:Syne,sans-serif;font-size:1.5rem;font-weight:800;margin:3px 0 5px;color:${barCol(monthly)}">${monthly}
              <span style="font-size:.8rem;color:${dAvg>=0?'var(--income)':'var(--expense)'}">(${dAvg>=0?'+':''}${dAvg} vs Ø ${nM}M)</span></div>
            <div style="font-size:.7rem;color:#a8aec8;line-height:1.5">Skóre za aktuální měsíc. Kolísá — jeden měsíc nic neznamená.</div>
            <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);font-size:.68rem;color:#a8aec8;line-height:1.55">
              <b style="color:#c9cede">Co to je:</b> ukazuje, jak dopadl <b>tento konkrétní měsíc</b> proti tvému ${nM}měsíčnímu průměru.
              Slouží jako rychlá zpětná vazba, ne jako hodnocení celkové situace.</div>
          </div>

          <div style="padding:11px 13px;background:var(--surface2);border-left:3px solid ${momCol};border-radius:0 10px 10px 0;margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
              <span style="font-size:.7rem;font-weight:800;color:${momCol};text-transform:uppercase;letter-spacing:.05em">${nM}M Momentum Score</span>
              <span style="font-size:.66rem;color:#a8aec8">trend ${nM} měsíců</span>
            </div>
            <div style="font-family:Syne,sans-serif;font-size:1.5rem;font-weight:800;margin:3px 0 5px;color:${momCol}">${_dScore!==null?(_dScore>0?'+':'')+_dScore+' '+(Math.abs(_dScore)===1?'bod':Math.abs(_dScore)<5?'body':'bodů'):'–'}<span style="font-size:.95rem;font-weight:700">${momLbl}</span></div>
            <div style="font-size:.7rem;color:#a8aec8;line-height:1.5">${ups} z ${steps} ${steps===1?'kroku':'kroků'} meziměsíčně nahoru (${stable} %). ${
              momUp && stable>=60 ? 'Zlepšení není náhoda jednoho měsíce.' :
              momUp ? 'Zlepšení je zatím nerovnoměrné.' :
              (_dScore<0 ? 'Propad se opakuje ve více měsících.' : 'Skóre se drží na stejné úrovni.')}</div>
            <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);font-size:.68rem;color:#a8aec8;line-height:1.55">
              <b style="color:#c9cede">Co to je:</b> měří <b>směr a stálost</b> pohybu skóre, ne jeho úroveň.
              Vysoké momentum při nízkém skóre znamená, že se rychle zlepšuješ. Nízké momentum při vysokém skóre znamená, že si dobrou pozici držíš.</div>
          </div>`;
        })()}

        <div style="font-size:.72rem;color:#c9cede;font-weight:700;margin-bottom:6px">Z čeho se dnešní skóre skládá:</div>
        <div style="font-size:.72rem;color:#a8aec8;margin-bottom:8px">Základ 50 bodů ${_sc.parts.filter(p=>p.d!==0).length?'a k tomu:':'– žádná složka se výrazně nevychýlila.'}</div>
        ${_sc.clamped?`<div style="font-size:.67rem;color:var(--debt);margin-bottom:6px">⚠️ Součet složek by dal ${_sc.raw} bodů, skóre je ale omezené rozsahem 0–100.</div>`:''}
        <!-- v9.70: vodopád zúžen (max 420 px) a bary jsou vyšší, aby vynikly -->
        <div style="max-width:420px">
        ${_sc.parts.map(p=>`
          <div style="display:grid;grid-template-columns:104px 1fr 42px;gap:9px;align-items:center;padding:5px 0">
            <span style="font-size:.75rem;color:#c9cede">${p.label}</span>
            <div style="height:20px;background:var(--surface3);border-radius:6px;position:relative;overflow:hidden">
              <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--border)"></div>
              ${p.d!==0?`<div style="position:absolute;top:0;bottom:0;border-radius:5px;${p.d>0?`left:50%;width:${Math.abs(p.d)/_wfMax*50}%;background:var(--income)`:`right:50%;width:${Math.abs(p.d)/_wfMax*50}%;background:var(--expense)`}"></div>`:''}
            </div>
            <span style="font-family:Syne,sans-serif;font-size:.85rem;font-weight:800;text-align:right;color:${p.d>0?'var(--income)':p.d<0?'var(--expense)':'var(--text3)'}">${p.d>0?'+':''}${p.d||'0'}</span>
          </div>
          <div style="font-size:.66rem;color:#8b93ad;margin:-4px 0 3px 113px">${p.note}</div>`).join('')}
        </div>
      </div>
    </div>`;

  // ── HTML pokročilých metrik ──
  // ══ v9.51: FFR + LIKVIDITA MOMENTUM ══
  //  Obojí se porovnává PROTI ZAČÁTKU OKNA, ne půlením – jsou to pomalu
  //  se měnící zásoby, ne měsíční toky.
  const _ffrStart = (()=>{ try{
      const dt = new Date(S.curYear, S.curMonth - (series.length-1), 1);
      return computeFFR(D, dt.getMonth(), dt.getFullYear());
    }catch(e){ return null; } })();
  const _ffrD = (ffr.ratio!==null && _ffrStart && _ffrStart.ratio!==null) ? (ffr.ratio - _ffrStart.ratio) : null;
  const _liq = (typeof assetLiqTotals==='function') ? (()=>{ try{ return assetLiqTotals(D); }catch(e){ return null; } })() : null;
  //  Okamžitě dostupné = peněženky + rezerva (mid/fixed jsou vázané)
  const _liqNow = _liq ? ((_liq.wallets||0) + (_liq.reserve||0)) : 0;

  const ffrBarW = ffr.ratio !== null ? Math.min(100, ffr.ratio) : 0;
  const ffrCard = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-body" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
          <span style="font-size:.86rem;font-weight:700">🏖️ Financial Freedom Ratio</span>
          <span style="font-size:.66rem;color:#a8aec8">${series.length}M vs baseline</span>
        </div>
        <div style="font-family:Syne,sans-serif;font-size:1.65rem;font-weight:800;color:${ffr.color};margin-bottom:7px">${ffr.ratio!==null?ffr.ratio+' %':'–'}</div>
        <div style="height:10px;background:var(--surface3);border-radius:6px;overflow:hidden;position:relative">
          <div style="height:100%;width:${ffrBarW}%;background:${ffr.color};border-radius:6px;transition:width .5s"></div>
          <div style="position:absolute;top:0;left:100%;transform:translateX(-100%);width:2px;height:100%;background:var(--text3);opacity:.5"></div>
        </div>
        <div style="font-size:.72rem;color:#a8aec8;margin-top:5px">${ffr.stage} · pasivní příjem ${fmtB(ffr.passiveInc)} / výdaje ${fmtB(ffr.exp)}</div>
        ${!ffr.hasPassive?`<div style="font-size:.68rem;color:#a8aec8;margin-top:4px;padding:6px 8px;background:var(--surface3);border-radius:7px">💡 Označ příjmové kategorie jako „🌱 Pasivní" (dividendy, nájem, úroky) v nastavení kategorie pro výpočet FFR.</div>`:''}
        ${_ffrD!==null?`
          <div style="margin-top:11px;padding:10px 12px;background:var(--surface2);border-left:3px solid ${_ffrD>=0?'var(--income)':'var(--expense)'};border-radius:0 10px 10px 0">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
              <span style="font-size:.7rem;font-weight:800;color:${_ffrD>=0?'var(--income)':'var(--expense)'};text-transform:uppercase;letter-spacing:.05em">FFR Momentum</span>
              <span style="font-size:.66rem;color:#a8aec8">${series.length}M vs baseline</span></div>
            <div style="font-family:Syne,sans-serif;font-size:1.15rem;font-weight:800;margin:3px 0 5px;color:${_ffrD>=0?'var(--income)':'var(--expense)'}">${_ffrD>=0?'+':''}${_ffrD} ${Math.abs(_ffrD)===1?'bod':'bodu'}</div>
            <div style="font-size:.7rem;color:#a8aec8;line-height:1.5">Pasivní příjem ${fmtB(ffr.passiveInc)} pokryje ${ffr.ratio!==null?ffr.ratio:'–'} % výdajů.${ffr.ratio>0&&_ffrD>0?` Při tomto tempu 100 % za ~${Math.max(1,Math.round((100-ffr.ratio)/(_ffrD/series.length*12)))} let.`:''}</div>
            <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);font-size:.68rem;color:#a8aec8;line-height:1.55">
              <b style="color:#c9cede">Co to je:</b> jaká část tvých výdajů je krytá pasivním příjmem (dividendy, nájem, úroky). 100 % znamená finanční nezávislost. Sleduje se <b>proti baseline</b>, ne půlením okna — je to pomalá metrika, kde má smysl srovnávat s výchozím bodem, ne měsíc po měsíci.</div>
          </div>`:''}
      </div>
    </div>`;

  //  v9.71: Likvidita je SAMOSTATNÁ karta (dřív byla schovaná uvnitř FFR).
  //  Je to vlastní metrika – peníze dostupné okamžitě, bez prodeje majetku.
  const _liqDelta = (()=>{ try{
      const bExp = _lsB && _lsB.exp ? _lsB.exp : null;
      return (bExp && last.exp) ? null : null; }catch(e){ return null; } })();
  const liqCard = !_liq ? '' : `
    <div class="card" style="margin-bottom:12px">
      <div class="card-body" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
          <span style="font-size:.86rem;font-weight:700">💧 Likvidita</span>
          <span style="font-size:.66rem;color:#a8aec8">aktuální stav</span>
        </div>
        <div style="font-family:Syne,sans-serif;font-size:1.65rem;font-weight:800;color:${_liqNow>=0?'#22d3ee':'var(--expense)'}">${fmtB(Math.round(_liqNow))}</div>
        <div style="font-size:.72rem;color:#a8aec8;margin-top:3px">peněženky ${fmtB(Math.round(_liq.wallets||0))} + rezerva ${fmtB(Math.round(_liq.reserve||0))}</div>
        <div style="margin-top:11px;padding:10px 12px;background:var(--surface2);border-left:3px solid #22d3ee;border-radius:0 10px 10px 0">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
            <span style="font-size:.7rem;font-weight:800;color:#22d3ee;text-transform:uppercase;letter-spacing:.05em">Liquidity Momentum</span>
            <span style="font-size:.66rem;color:#a8aec8">${series.length}M vs baseline</span></div>
          <div style="font-family:Syne,sans-serif;font-size:1.15rem;font-weight:800;margin:3px 0 5px;color:#22d3ee">${last.exp>0?(_liqNow/last.exp).toFixed(1).replace('.',',')+' měsíce výdajů':'–'}</div>
          <div style="font-size:.7rem;color:#a8aec8;line-height:1.5">${last.exp>0?`Při současných výdajích ${fmtB(Math.round(last.exp))}/měs.`:'Bez výdajů nelze dobu pokrytí spočítat.'}</div>
          <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);font-size:.68rem;color:#a8aec8;line-height:1.55">
            <b style="color:#c9cede">Co to je:</b> peníze, ke kterým se dostaneš okamžitě — bez prodeje investic či majetku. Stejně jako FFR se porovnává <b>proti baseline</b>, protože jde o pomalu se měnící zásobu, ne o měsíční tok.</div>
        </div>
      </div>
    </div>`;

  const _lsG = v => `${v>=0?'+':''}${v}%`;
  const lsChart = _obrazDivergingChart(series); // v8.66: zrcadlový graf příjmy ◀ | ▶ výdaje
  //  v9.70: hodnoty v podtextu obarvené – příjmy zeleně při růstu, výdaje žlutě
  const _lsCol = (v,goodUp) => v===null ? '#a8aec8' : ((goodUp? v>0 : v<0) ? 'var(--income)' : 'var(--debt)');
  const _lsSub = `průměr 2. vs 1. poloviny okna: příjmy <b style="color:${_lsCol(lifestyle.incG,true)}">${lifestyle.incG!==null?_lsG(lifestyle.incG):'–'}</b> · výdaje <b style="color:${_lsCol(lifestyle.expG,false)}">${lifestyle.expG!==null?_lsG(lifestyle.expG):'–'}</b>`;
  // ── v9.44: přejmenováno „Inflace životního stylu" → „Růst životního stylu" ──
  //  Důvod: appka už má osobní inflaci z účtenek (inflace.js). Dvě různé „inflace"
  //  o něčem jiném = zmatek. Slovo inflace zůstává vyhrazené cenám.
  //  Karta má nově STABILNÍ NÁZEV a proměnný verdikt (dřív měnila název podle stavu,
  //  takže si ji uživatel nemohl zapamatovat ani o ní mluvit).
  const _lsVerdict =
    lifestyle.state==='inflation' ? {ic:'⚠️', txt:'Výdaje rostou rychleji než příjmy', col:'var(--expense)', bd:'rgba(248,113,113,.35)',
      note:'Část navýšeného příjmu raději odkládej, ať růst životního stylu nesní celý nárůst.'} :
    lifestyle.state==='squeeze' ? {ic:'🟡', txt:'Příjmy klesají rychleji než výdaje', col:'#fbbf24', bd:'rgba(251,191,36,.35)',
      note:'Výdaje se poklesu příjmů nepřizpůsobily – zkontroluj, kde jde ubrat, než se prokousáš do rezervy.'} :
    lifestyle.state==='ok' ? {ic:'✅', txt:'Výdaje drží krok s příjmy', col:'var(--income)', bd:'rgba(74,222,128,.25)',
      note:'Výdaje nerostou rychleji než příjmy a drží krok s jejich vývojem.'} : null;

  //  Expense Ratio = ÚROVEŇ (kolik z příjmu spotřebuju), zatímco verdikt výše je TEMPO.
  //  Nepřekrývají se: ratio funguje od 1. měsíce, tempo potřebuje 6+ měsíců.
  //  ⚠️ Nezobrazovat vedle míry úspor – jsou komplementární (ER = 100 % − SR).
  const _erNow = sm.expRatioNow, _erBase = sm.expRatioBase;
  const _erTxt = _erNow===null ? null : `
      <div style="font-family:Syne,sans-serif;font-size:1.5rem;font-weight:800;color:${_erNow<=.7?'var(--income)':_erNow<=.9?'#fbbf24':'var(--expense)'}">${Math.round(_erNow*100)} % příjmu</div>
      <div style="font-size:.72rem;color:#a8aec8;margin-top:2px">spotřebuje tvůj životní styl${_erBase!==null&&Math.abs(_erNow-_erBase)>=.005?` · dřív ${Math.round(_erBase*100)} %`:''}</div>`;

  //  v9.70: tabulka ukazatelů baseline vs. aktuální (byla v modelu, chyběla v appce)
  const _lsHalf = Math.floor(series.length/2);
  const _lsAvg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  const _lsB = { inc:_lsAvg(series.slice(0,series.length-_lsHalf).map(x=>x.inc)),
                 exp:_lsAvg(series.slice(0,series.length-_lsHalf).map(x=>x.exp)) };
  const _lsA = { inc:_lsAvg(series.slice(series.length-_lsHalf).map(x=>x.inc)),
                 exp:_lsAvg(series.slice(series.length-_lsHalf).map(x=>x.exp)) };
  const _lsRow = (label, b, a, chg, chgCol, bold) => `
    <tr style="${bold?'font-weight:800;background:var(--surface2)':''};border-bottom:1px solid var(--border)">
      <td style="padding:7px 9px;text-align:left;border-right:1px solid var(--border)">${label}</td>
      <td style="padding:7px 9px;text-align:right;color:#a8aec8;border-right:1px solid var(--border)">${b}</td>
      <td style="padding:7px 9px;text-align:right;border-right:1px solid var(--border)">${a}</td>
      <td style="padding:7px 9px;text-align:right;font-weight:700;color:${chgCol||'#a8aec8'}">${chg}</td>
    </tr>`;
  const _pctS = v => (v>0?'+':'')+v.toFixed(1).replace('.',',')+' %';
  const _lsTable = (series.length<2 || (!_lsB.inc && !_lsB.exp)) ? '' : `
    <div style="overflow-x:auto;margin-top:12px;max-width:560px">
    <table style="width:100%;border-collapse:collapse;font-size:.75rem;min-width:360px">
      <thead><tr style="font-size:.66rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.04em">
        <th style="padding:5px 8px;text-align:left">Ukazatel</th>
        <th style="padding:5px 8px;text-align:right">Baseline</th>
        <th style="padding:5px 8px;text-align:right">Aktuální</th>
        <th style="padding:5px 8px;text-align:right">Změna</th></tr></thead>
      <tbody>
        ${_lsRow('Příjmy Ø/měs', fmtB(Math.round(_lsB.inc)), fmtB(Math.round(_lsA.inc)),
          lifestyle.incG!==null?_pctS(lifestyle.incG):'–', _lsCol(lifestyle.incG,true))}
        ${_lsRow('Výdaje Ø/měs', fmtB(Math.round(_lsB.exp)), fmtB(Math.round(_lsA.exp)),
          lifestyle.expG!==null?_pctS(lifestyle.expG):'–', _lsCol(lifestyle.expG,false))}
        ${_lsRow('Expense Ratio',
          _lsB.inc>0?Math.round(_lsB.exp/_lsB.inc*100)+' %':'–',
          _lsA.inc>0?Math.round(_lsA.exp/_lsA.inc*100)+' %':'–',
          (_lsB.inc>0&&_lsA.inc>0)?((_lsA.exp/_lsA.inc-_lsB.exp/_lsB.inc)*100).toFixed(0)+' b.':'–',
          (_lsB.inc>0&&_lsA.inc>0&&(_lsA.exp/_lsA.inc)<=(_lsB.exp/_lsB.inc))?'var(--income)':'var(--debt)')}
        ${_lsRow('Úspora Ø/měs', fmtB(Math.round(_lsB.inc-_lsB.exp)), fmtB(Math.round(_lsA.inc-_lsA.exp)),
          fmtB(Math.round((_lsA.inc-_lsA.exp)-(_lsB.inc-_lsB.exp))),
          ((_lsA.inc-_lsA.exp)>=(_lsB.inc-_lsB.exp))?'var(--income)':'var(--expense)')}
        ${sm.capture!==null?_lsRow('<b>Income Capture</b>','–', Math.round(sm.capture)+' %',
          sm.capture>=50?'zdravé':sm.capture>5?'nízké':'propálené',
          sm.capture>=50?'var(--income)':sm.capture>5?'var(--debt)':'var(--expense)', true):''}
      </tbody></table></div>`;

  //  v9.70: karta „Rezerva vydrží" – nejhmatatelnější důsledek dražšího
  //  životního stylu. Byla v modelu, v aplikaci chyběla.
  const _rezervaCard = (()=>{
    try{
      const liq = (typeof assetLiqTotals==='function') ? assetLiqTotals(D) : null;
      const rez = liq ? ((liq.wallets||0)+(liq.reserve||0)) : 0;
      const nowE = _lsA.exp, befE = _lsB.exp;
      if(!rez || !nowE) return '';
      const nowM = rez/nowE, befM = befE>0 ? rez/befE : null;
      const dM = befM===null ? null : nowM-befM;
      const col = nowM>=3 ? 'var(--income)' : nowM>=1.5 ? 'var(--debt)' : 'var(--expense)';
      return `
      <div class="card" style="margin-bottom:12px">
        <div class="card-body" style="padding:14px">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:4px">
            <span style="font-size:.82rem;font-weight:700">🛡 Rezerva vydrží</span>
            <span style="font-size:.66rem;color:#a8aec8">aktuální stav</span></div>
          <div style="font-family:Syne,sans-serif;font-size:1.7rem;font-weight:800;color:${col}">${nowM.toFixed(1).replace('.',',')} měsíce</div>
          <div style="font-size:.72rem;color:#a8aec8;margin-top:3px">rezerva ${fmtB(Math.round(rez))} ÷ výdaje ${fmtB(Math.round(nowE))}/měs${befM!==null?` · dřív ${befM.toFixed(1).replace('.',',')} měsíce`:''}</div>
          ${dM!==null?`
          <div style="margin-top:11px;padding:10px 12px;background:var(--surface2);border-left:3px solid ${dM<0?'var(--debt)':'var(--income)'};border-radius:0 10px 10px 0">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
              <span style="font-size:.7rem;font-weight:800;color:${dM<0?'var(--debt)':'var(--income)'};text-transform:uppercase;letter-spacing:.05em">Dopad životního stylu</span>
              <span style="font-size:.66rem;color:#a8aec8">aktuální</span></div>
            <div style="font-family:Syne,sans-serif;font-size:1.15rem;font-weight:800;margin:3px 0 5px;color:${dM<0?'var(--debt)':'var(--income)'}">${dM>=0?'+':''}${dM.toFixed(1).replace('.',',')} měsíce</div>
            <div style="font-size:.7rem;color:#a8aec8;line-height:1.5">${dM<0?'Rezerva možná vzrostla, ale výdaje taky — čistý efekt je kratší doba pokrytí.':'Doba pokrytí se prodloužila.'}</div>
            <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);font-size:.68rem;color:#a8aec8;line-height:1.55">
              <b style="color:#c9cede">Co to je:</b> jak dlouho by tě rezerva uživila při současných výdajích. Nejhmatatelnější důsledek dražšího životního stylu: i když našetříš víc, vyšší výdaje ti dobu pokrytí zkrátí.</div>
          </div>`:''}
        </div>
      </div>`;
    }catch(e){ return ''; }
  })();

  const lifestyleCard = !_lsVerdict ? '' : `
    <div class="card" style="margin-bottom:12px;border-color:${_lsVerdict.bd}">
      <div class="card-body" style="padding:14px">
        <div style="font-size:.82rem;font-weight:700;margin-bottom:6px">📊 Růst životního stylu</div>
        ${_erTxt||'<div style="font-size:.72rem;color:#a8aec8">Bez příjmu nelze poměr spočítat. Jakmile zadáš první příjem, ukážeme, kolik z něj tvůj životní styl spotřebuje.</div>'}
        ${_lsTable}
        <div style="margin-top:9px;padding-top:9px;border-top:1px solid var(--border)">
          <div style="font-size:.78rem;font-weight:700;color:${_lsVerdict.col};margin-bottom:3px">${_lsVerdict.ic} ${_lsVerdict.txt}</div>
          <div style="font-size:.74rem;color:var(--text2);line-height:1.55">${_lsSub}. ${_lsVerdict.note}</div>
        </div>
        ${lsChart}
        ${(()=>{
          //  KAM RŮST PŘISTÁL – kolik z nárůstu výdajů skončilo v opakovaných
          //  závazcích. Trvalé závazky při poklesu příjmu nezmizí, proto je
          //  tenhle rozdíl důležitější než celková částka.
          //  v9.71: karta se zobrazí VŽDY. Když výdaje nevzrostly, řekne to –
          //  tiché zmizení vypadá jako chyba a uživatel neví, co mu uniká.
          const dExp = _lsA.exp - _lsB.exp;
          if(!isFinite(dExp)) return '';
          let fixed = 0;
          try{
            (D.sablony||[]).forEach(t=>{ const a=Math.abs(t.amount||t.castka||0);
              if(a && (t.type==='expense'||(t.amount||0)<0)) fixed += a; });
          }catch(e){}
          const inFixed = Math.min(dExp, fixed);
          return `
          <div style="margin-top:11px;padding:10px 12px;background:var(--surface2);border-left:3px solid ${dExp>0?'var(--debt)':'var(--income)'};border-radius:0 10px 10px 0">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
              <span style="font-size:.7rem;font-weight:800;color:${dExp>0?'var(--debt)':'var(--income)'};text-transform:uppercase;letter-spacing:.05em">Kam růst přistál</span>
              <span style="font-size:.66rem;color:#a8aec8">${series.length}M vs baseline</span></div>
            <div style="font-family:Syne,sans-serif;font-size:1.15rem;font-weight:800;margin:3px 0 5px;color:${dExp>0?'var(--debt)':'var(--income)'}">${dExp>0?fmtB(Math.round(inFixed))+' do trvalých závazků':(dExp<0?'0 Kč – výdaje klesly':'0 Kč – beze změny')}</div>
            <div style="font-size:.7rem;color:#a8aec8;line-height:1.5">${dExp>0
              ? `Z nárůstu výdajů o ${fmtB(Math.round(dExp))} připadá ${fmtB(Math.round(inFixed))} na pravidelné měsíční platby, zbytek byly jednorázové výdaje.`
              : (dExp<0 ? `Výdaje se snížily o ${fmtB(Math.round(-dExp))} – žádný růst, který by mohl přistát v závazcích.`
                        : 'Výdaje zůstaly na stejné úrovni.')}</div>
            <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);font-size:.68rem;color:#a8aec8;line-height:1.55">
              <b style="color:#c9cede">Co to je:</b> rozlišuje, jestli vyšší výdaje skončily v <b>opakovaných závazcích</b> (nájem, leasing, předplatné), nebo v jednorázových nákupech. Trvalé závazky při poklesu příjmu nezmizí — proto je tenhle rozdíl důležitější než celková částka.</div>
          </div>`;
        })()}
        ${(()=>{
          //  REÁLNÝ RŮST PŘÍJMU – očištěný o osobní inflaci z účtenek.
          //  Tohle neumí žádný konkurent, protože potřebuje položkové účtenky.
          if(lifestyle.incG===null) return '';
          let infl = null;
          //  Osobní inflace z účtenek – existující funkce z inflace.js
          //  (_inflCollect nasbírá pozorování, _inflCompute vrátí {yoy, …}).
          try{ if(typeof _inflCollect==='function' && typeof _inflCompute==='function'){
              const r = _inflCompute(_inflCollect());
              infl = (r && typeof r.yoy==='number' && !isNaN(r.yoy)) ? r.yoy : null; } }catch(e){}
          const real = infl===null ? null : lifestyle.incG - infl;
          return `
          <div style="margin-top:9px;padding:10px 12px;background:var(--surface2);border-left:3px solid ${real===null?'#60a5fa':real>=0?'var(--income)':'var(--expense)'};border-radius:0 10px 10px 0">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
              <span style="font-size:.7rem;font-weight:800;color:${real===null?'#60a5fa':real>=0?'var(--income)':'var(--expense)'};text-transform:uppercase;letter-spacing:.05em">Reálný růst příjmu</span>
              <span style="font-size:.66rem;color:#a8aec8">očištěno o tvoji inflaci</span></div>
            <div style="font-family:Syne,sans-serif;font-size:1.15rem;font-weight:800;margin:3px 0 5px;color:${real===null?'#60a5fa':real>=0?'var(--income)':'var(--expense)'}">${real===null?'–':_pctS(real)}</div>
            <div style="font-size:.7rem;color:#a8aec8;line-height:1.5">${real===null
              ? 'Naskenuj účtenky ze dvou různých období a spočítáme tvoji osobní inflaci – pak uvidíš, jestli sis polepšil doopravdy.'
              : `Příjem ${_pctS(lifestyle.incG)}, tvoje osobní inflace z účtenek ${infl.toFixed(1).replace('.',',')} %.`}</div>
            <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);font-size:.68rem;color:#a8aec8;line-height:1.55">
              <b style="color:#c9cede">Co to je:</b> růst příjmu očištěný o to, jak zdražily věci, které <b>skutečně kupuješ</b> — ne o průměrnou inflaci ČSÚ. Vychází z tvých účtenek. Ukazuje, jestli sis polepšil doopravdy, nebo jen dorovnal zdražení.</div>
          </div>`;
        })()}
      </div>
    </div>
    ${_rezervaCard}`;

  const divBars = diversification.sources.slice(0,5).map(s=>{
    const pct = Math.round(s.val/diversification.total*100);
    return `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:2px">
        <span>${s.icon||'💵'} ${s.name}</span><span style="color:#a8aec8">${pct}%</span>
      </div>
      <div style="height:6px;background:var(--surface3);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${s.color||'#34d399'};border-radius:4px"></div>
      </div>
    </div>`;
  }).join('');
  // ══ v9.51: NET WORTH MOMENTUM ══
  //  Wealth Momentum měří TOK (Ø saldo). Čisté jmění je STAV. Nezaměňovat.
  //  Poctivá poznámka: historii čistého jmění zatím neukládáme, takže rozdíl
  //  „vytvořeno spořením vs. růstem tržní hodnoty" spočítat nelze. Ukazujeme
  //  tedy jen tu část, kterou uživatel skutečně vytvořil sám (součet sald).
  const _nw = (typeof computeAssetsNetWorth==='function') ? computeAssetsNetWorth(D) : null;
  const _savedInWin = series.reduce((a,x)=>a+(x.savings||0), 0);
  const nwCard = !_nw ? '' : `
    <div class="card" style="margin-bottom:12px">
      <div class="card-body" style="padding:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:.82rem;font-weight:700">💎 Čisté jmění</span>
          <span style="font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800;color:${_nw.netWorth>=0?'var(--income)':'var(--expense)'}">${fmtB(Math.round(_nw.netWorth))}</span>
        </div>
        <div style="font-size:.72rem;color:#a8aec8">Majetek ${fmtB(Math.round(_nw.totalAssets + _nw.totalWallets))} − dluhy ${fmtB(Math.round(_nw.totalDebts))}</div>
          <div style="margin-top:9px;padding-top:7px;border-top:1px dashed var(--border);font-size:.68rem;color:#a8aec8;line-height:1.55">
            <b style="color:#c9cede">Co to je:</b> majetek minus dluhy. Měří <b>stav</b> – kolik ti zbude, kdybys všechno prodal a splatil.
            Nezaměňovat s Wealth Momentum, které měří <b>tok</b> (kolik měsíčně přibývá).</div>
        <div style="margin-top:8px;padding:7px 9px;background:var(--surface2);border-left:2px solid ${_savedInWin>=0?'var(--income)':'var(--expense)'};border-radius:0 8px 8px 0">
          <div style="font-size:.66rem;font-weight:800;color:${_savedInWin>=0?'var(--income)':'var(--expense)'};text-transform:uppercase;letter-spacing:.05em">Net Worth Momentum</div>
          <div style="font-family:Syne,sans-serif;font-size:.98rem;font-weight:800;margin:1px 0">${_savedInWin>=0?'+':''}${fmtB(Math.round(_savedInWin))} za ${series.length} měs.</div>
          <div style="font-size:.67rem;color:#a8aec8;line-height:1.45">Tolik jsi za okno vytvořil <b>vlastním spořením</b>. Změnu tržní hodnoty majetku zatím nesledujeme zpětně, takže v tomhle čísle není.</div>
        </div>
      </div>
    </div>`;

  const divColor = diversification.score>=60?'var(--income)':diversification.score>=30?'var(--debt)':'var(--expense)';
  //  v9.71: jednotný tvar karty – velké číslo nahoře, pod ním podmetrika
  //  s vysvětlivkou. Dřív to byl jen pruh s procenty bez kontextu.
  const _divRisk = diversification.count<=1 ? 'var(--expense)' : diversification.topShare>=80 ? 'var(--debt)' : 'var(--income)';
  const diversCard = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-body" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
          <span style="font-size:.86rem;font-weight:700">🧩 Diverzifikace příjmů</span>
          <span style="font-size:.66rem;color:#a8aec8">aktuální měsíc</span>
        </div>
        <div style="font-family:Syne,sans-serif;font-size:1.65rem;font-weight:800;color:${_divRisk}">
          ${diversification.count} ${diversification.count===1?'zdroj':diversification.count<5?'zdroje':'zdrojů'}</div>
        <div style="font-size:.72rem;color:#a8aec8;margin-top:3px">skóre ${diversification.score}/100${diversification.count?` · největší tvoří ${diversification.topShare} %`:''}</div>
        ${diversification.count?divBars:'<div style="font-size:.74rem;color:#a8aec8;margin-top:6px">Žádné příjmy tento měsíc.</div>'}
        ${diversification.count?`
        <div style="margin-top:11px;padding:10px 12px;background:var(--surface2);border-left:3px solid ${_divRisk};border-radius:0 10px 10px 0">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
            <span style="font-size:.7rem;font-weight:800;color:${_divRisk};text-transform:uppercase;letter-spacing:.05em">Koncentrační riziko</span>
            <span style="font-size:.66rem;color:#a8aec8">aktuální</span></div>
          <div style="font-family:Syne,sans-serif;font-size:1.15rem;font-weight:800;margin:3px 0 5px;color:${_divRisk}">${diversification.topShare} % z jednoho zdroje</div>
          <div style="font-size:.7rem;color:#a8aec8;line-height:1.5">Výpadek hlavního příjmu by pokryl jen ${Math.max(0,100-diversification.topShare)} % současných výdajů.</div>
          <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);font-size:.68rem;color:#a8aec8;line-height:1.55">
            <b style="color:#c9cede">Co to je:</b> jak moc závisíš na jediném zdroji příjmu. Není to výtka — u zaměstnance je to normální. Slouží k tomu, abys věděl, jak velký nárazník potřebuješ.</div>
        </div>`:''}
      </div>
    </div>`;

  const momColor = momentum.perMonth>=0?'var(--income)':'var(--expense)';
  const momentumCard = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-body" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
          <span style="font-size:.86rem;font-weight:700">🚀 Wealth Momentum</span>
          <span style="font-size:.66rem;color:#a8aec8">${momentum.months}M průměr</span>
        </div>
        <div style="font-family:Syne,sans-serif;font-size:1.65rem;font-weight:800;color:${momColor}">${momentum.perMonth>=0?'+':''}${fmtB(momentum.perMonth)}/měs</div>
        <div style="font-size:.72rem;color:#a8aec8;margin-top:3px">Průměrný měsíční přírůstek za ${momentum.months} ${momentum.months===1?'měsíc':momentum.months<5?'měsíce':'měsíců'}</div>
        ${_obrazSaldoChart(series, momentum.perMonth)}
        ${(()=>{ const pos = series.filter(x=>x.savings>=0).length;
          return `
        <div style="margin-top:11px;padding:10px 12px;background:var(--surface2);border-left:3px solid ${pos===series.length?'var(--income)':pos>=series.length/2?'var(--debt)':'var(--expense)'};border-radius:0 10px 10px 0">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
            <span style="font-size:.7rem;font-weight:800;color:${pos===series.length?'var(--income)':pos>=series.length/2?'var(--debt)':'var(--expense)'};text-transform:uppercase;letter-spacing:.05em">Stálost</span>
            <span style="font-size:.66rem;color:#a8aec8">${series.length}M</span></div>
          <div style="font-family:Syne,sans-serif;font-size:1.15rem;font-weight:800;margin:3px 0 5px;color:${pos===series.length?'var(--income)':pos>=series.length/2?'var(--debt)':'var(--expense)'}">${pos} z ${series.length} měsíců kladné</div>
          <div style="font-size:.7rem;color:#a8aec8;line-height:1.5">${pos===series.length?'Ani jeden měsíc v mínusu.':pos===0?'Žádný měsíc v plusu.':`${series.length-pos} ${series.length-pos===1?'měsíc byl':'měsíce byly'} v mínusu.`}</div>
          <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);font-size:.68rem;color:#a8aec8;line-height:1.55">
            <b style="color:#c9cede">Co to je:</b> průměrné měsíční saldo za okno. Měří <b>tok</b> — kolik měsíčně přibývá. Nezaměňovat s čistým jměním, které měří <b>stav</b>.</div>
        </div>`; })()}
      </div>
    </div>`;

  // ── S16 (TODO-166): karta „Kam směřuju" ──
  const _pt=(label,val,sub,color)=>`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px;text-align:center">
    <div style="font-size:.7rem;color:#a8aec8;margin-bottom:3px">${label}</div>
    <div style="font-family:Syne,sans-serif;font-size:1.05rem;font-weight:800;color:${color}">${val}</div>
    <div style="font-size:.66rem;color:#a8aec8;margin-top:2px">${sub}</div>
  </div>`;
  const res6=proj.months.length?proj.months[proj.months.length-1].reserve:proj.wallets;
  const debt6=proj.months.length?proj.months[proj.months.length-1].debt:proj.debtNow;
  const smerujCard = proj.hasData ? `
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#a8aec8;margin-bottom:10px">🧭 3 · Kam směřuju – příštích 6 měsíců</div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:14px">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:4px">
          ${_pt('Predikovaný cashflow Ø', `${proj.avgCash>=0?'+':''}${fmtB(proj.avgCash)}/měs`, `příjem Ø ${fmtB(proj.avgInc)} − predikce výdajů`, proj.avgCash>=0?'var(--income)':'var(--expense)')}
          ${_pt('Rezerva za 6 měs.', fmtB(res6), `dnes ${fmtB(proj.wallets)}`, res6>=0?'var(--income)':'var(--expense)')}
          ${proj.debtNow>0?_pt('Dluh za 6 měs.', fmtB(debt6), `−${fmtB(proj.debtNow-debt6)} splaceno`, 'var(--debt)'):_pt('Dluh','0 Kč','bez dluhů 🎉','var(--income)')}
        </div>
        ${typeof _obrazProjVerdict==='function'?_obrazProjVerdict(proj):''}
        ${_obrazProjChart(proj)}
        ${_obrazProjDebtChart(proj)}
        <div style="font-size:.68rem;color:#a8aec8;margin-top:8px;padding:7px 9px;background:var(--surface3);border-radius:7px">ℹ️ Orientační predikce: příjem = 12M klouzavý průměr; výdaje = engine karty Predikce (historie kategorií + sezónnost + narozeniny); cashflow = příjem − predikce výdajů; rezerva = dnešní hotovost + kumulovaný cashflow (v tooltipu). <strong>Známé platby</strong> = šablony a splátky, které už znáš – jsou to jen ČÁSTI predikce výdajů (opakované platby už predikce obsahuje z historie), proto se k výdajům NEPŘIČÍTAJÍ, jinak by se počítaly dvakrát. <strong>Rezerva</strong> (žlutá čára) = dnešní zůstatek peněženek + kumulovaný cashflow. První sloupec je AKTUÁLNÍ měsíc se skutečnými čísly, ostatní jsou predikce. Dluh = rovnoměrné umořování dle splátek. Najeď na měsíc pro všechny hodnoty.</div>
      </div>
    </div>` : '';

  // ── S16 (TODO-167): karta historie payday cyklů ──
  const _cfD=d=>`${d.getDate()}.${d.getMonth()+1}.`;
  const cyklyCard = cycles.length>=2 ? `
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#a8aec8;margin-bottom:10px">💶 8 · Od výplaty k výplatě – historie cyklů</div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:14px">
        ${_obrazCyclesChart(cycles)}
        ${(()=>{ // S16 (TODO-172): tabulka 1.–5. týden od výplaty + trend mezi cykly
          const maxW=Math.min(5,Math.max(...cycles.map(c=>c.weeks.length)));
          const wAvg=Array.from({length:maxW},(_,i)=>{ const vs=cycles.map(c=>c.weeks[i]).filter(v=>v!==undefined); return vs.length?Math.round(vs.reduce((a,b)=>a+b,0)/vs.length):0; });
          const cell=(v,prev)=>{
            if(v===undefined) return '<td style="padding:5px 6px;text-align:right;color:#a8aec8">–</td>';
            let col='#c9cede', arr='';
            if(prev!==undefined&&prev>0){ const d=(v-prev)/prev; if(d>0.1){col='#f87171';arr='↑';} else if(d<-0.1){col='#4ade80';arr='↓';} }
            else if(prev===0&&v>0){ col='#f87171'; arr='↑'; }
            return `<td style="padding:5px 6px;text-align:right;color:${col}">${arr}${fmt(v)}</td>`;
          };
          const rows=cycles.map((c,ci)=>{
            const prev=ci>0?cycles[ci-1]:null;
            const dExp=prev&&prev.exp>0?Math.round((c.exp-prev.exp)/prev.exp*100):null;
            const saldo=c.inc-c.exp;
            return `<tr style="border-top:1px solid var(--border)">
              <td style="padding:5px 6px;color:#c9cede;font-weight:600;white-space:nowrap">${_cfD(c.start)}–${_cfD(c.end)}</td>
              ${Array.from({length:maxW},(_,i)=>cell(c.weeks[i],prev?prev.weeks[i]:undefined)).join('')}
              <td style="padding:5px 6px;text-align:right;font-weight:700;color:var(--expense)">${fmt(c.exp)}</td>
              <td style="padding:5px 6px;text-align:right;font-weight:700;color:${dExp===null?'var(--text3)':dExp<=0?'var(--income)':'var(--expense)'}">${dExp===null?'–':(dExp>0?'↑ +':'↓ ')+dExp+' %'}</td>
              <td style="padding:5px 6px;text-align:right;font-weight:700;color:${saldo>=0?'var(--income)':'var(--expense)'}">${saldo>=0?'+':''}${fmt(saldo)}</td>
            </tr>`;
          }).join('');
          return `<div style="overflow-x:auto;margin-top:10px">
            <table style="width:100%;border-collapse:collapse;font-size:.72rem;min-width:600px">
              <thead><tr style="color:#a8aec8;text-transform:uppercase;font-size:.66rem;letter-spacing:.04em">
                <th style="text-align:left;padding:5px 6px">Cyklus</th>
                ${Array.from({length:maxW},(_,i)=>`<th style="text-align:right;padding:5px 6px">${i+1}. týden</th>`).join('')}
                <th style="text-align:right;padding:5px 6px">Výdaje</th>
                <th style="text-align:right;padding:5px 6px">Δ výdajů</th>
                <th style="text-align:right;padding:5px 6px">Saldo</th>
              </tr></thead>
              <tbody>${rows}
                <tr style="border-top:2px solid var(--border2);background:var(--surface2)">
                  <td style="padding:5px 6px;font-weight:700;color:#a8aec8">Ø týden</td>
                  ${wAvg.map(v=>`<td style="padding:5px 6px;text-align:right;font-weight:600;color:#a8aec8">${fmt(v)}</td>`).join('')}
                  <!-- v9.71 (FIX-244): dřív colspan=3 slučoval Výdaje/Δ/Saldo do jedné
                       buňky, takže sloupce neměly součet a tabulka působila rozbitě. -->
                  <td style="padding:5px 6px;text-align:right;font-weight:700;color:var(--expense)">${fmt(Math.round(cycles.reduce((a,c)=>a+c.exp,0)/cycles.length))}</td>
                  <td style="padding:5px 6px;text-align:right;color:#a8aec8;font-size:.66rem">Ø/cyklus</td>
                  ${(()=>{ const sal=cycles.map(c=>(c.inc||0)-(c.exp||0));
                    const avg=Math.round(sal.reduce((a,b)=>a+b,0)/sal.length);
                    return `<td style="padding:5px 6px;text-align:right;font-weight:700;color:${avg>=0?'var(--income)':'var(--expense)'}">${avg>=0?'+':''}${fmt(avg)}</td>`; })()}
                </tr>
                <tr style="background:var(--surface2)">
                  <td style="padding:5px 6px;font-weight:700;color:#c9cede">Σ celkem</td>
                  ${wAvg.map((v,i)=>{ const sum=cycles.reduce((a,c)=>a+((c.weeks&&c.weeks[i])||0),0);
                    return `<td style="padding:5px 6px;text-align:right;color:#c9cede">${sum?fmt(Math.round(sum)):'–'}</td>`; }).join('')}
                  <td style="padding:5px 6px;text-align:right;font-weight:800;color:var(--expense)">${fmt(Math.round(cycles.reduce((a,c)=>a+c.exp,0)))}</td>
                  <td style="padding:5px 6px;text-align:right;color:#a8aec8">·</td>
                  ${(()=>{ const tot=cycles.reduce((a,c)=>a+((c.inc||0)-(c.exp||0)),0);
                    return `<td style="padding:5px 6px;text-align:right;font-weight:800;color:${tot>=0?'var(--income)':'var(--expense)'}">${tot>=0?'+':''}${fmt(Math.round(tot))}</td>`; })()}
                </tr>
              </tbody>
            </table></div>
          <div style="font-size:.68rem;color:#a8aec8;margin-top:8px;line-height:1.5">Cyklus = od výplaty k výplatě. Barvy týdnů = srovnání se <strong style="color:#a8aec8">stejným týdnem předchozího cyklu</strong> (🟢↓ méně, 🔴↑ více, ±10 % tolerance). <strong style="color:#a8aec8">Δ výdajů</strong> = celý cyklus vs předchozí – zelená = zlepšuješ se. Saldo = příjmy − výdaje cyklu.</div>`;
        })()}
      </div>
    </div>` : '';

  el.innerHTML=tabIntro('obraz','🖼️','Finanční obraz',
    'Dlouhodobý pohled na celkové směřování. Zatímco report řeší jednotlivé měsíce, obraz ukazuje trendy za 6 měsíců a pokročilé metriky: Financial Freedom Ratio (jak blízko jsi finanční nezávislosti), inflaci životního stylu, diverzifikaci příjmů a Wealth Momentum. Slouží ke strategickému rozhodování – kam tvé finance dlouhodobě míří.')
    + `
    <!-- Celkový trend -->
    <div style="background:linear-gradient(135deg,${trend==='improving'?'rgba(74,222,128,.08)':trend==='stable'?'rgba(251,191,36,.05)':'rgba(248,113,113,.06)'},transparent);border:1px solid ${trendColor}33;border-radius:var(--radius);padding:18px;margin-bottom:16px;text-align:center">
      <div style="font-size:.72rem;color:#a8aec8;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">Váš finanční trend – ${series.length===1?'1 měsíc':series.length<5?series.length+' měsíce':series.length+' měsíců'}</div>
      <!-- v9.44: přepínač okna. Volba se pamatuje (localStorage ff_obraz_win). -->
      <div style="display:flex;gap:6px;justify-content:center;margin-bottom:10px;flex-wrap:wrap">
        ${[['6','6M'],['12','12M'],['all','Celkově']].map(([k,t])=>`
          <button onclick="obrazSetWin('${k}')" style="padding:4px 11px;border-radius:8px;font-size:.72rem;font-weight:700;cursor:pointer;border:1px solid ${_obrazWin===k?'rgba(96,165,250,.55)':'var(--border)'};background:${_obrazWin===k?'rgba(96,165,250,.16)':'transparent'};color:${_obrazWin===k?'#93c5fd':'#a8aec8'}">${t}</button>`).join('')}
      </div>
      <div style="font-family:Syne,sans-serif;font-size:2rem;font-weight:800;color:${trendColor}">${trendLabel}</div>
      <div style="margin:12px auto;width:200px;height:12px;background:linear-gradient(90deg,var(--expense),var(--debt),var(--income));border-radius:6px;position:relative">
        <div style="position:absolute;top:-4px;left:${score}%;transform:translateX(-50%);width:8px;height:20px;background:white;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:left .8s"></div>
      </div>
      <div style="font-size:.76rem;color:#a8aec8">Skóre: <strong style="color:${trendColor}">${score}/100</strong></div>
    </div>

    ${journeyCard}

    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#a8aec8;margin:18px 0 10px">📈 2 · Hlavní metriky a jejich podmetriky</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${metrics.map(m=>`
        <div class="card">
          <div class="card-body" style="padding:14px">
            <div style="font-size:.82rem;font-weight:700;margin-bottom:5px">${m.label}</div>
            <div style="font-family:Syne,sans-serif;font-size:1.45rem;font-weight:800;color:${m.valColor||'var(--text)'}">${m.val}</div>
            ${m.sub?`<div style="font-size:.7rem;color:#a8aec8;margin-top:3px">${m.sub}</div>`:''}
            <div style="font-size:.76rem;margin-top:8px;color:${m.good?'var(--income)':'var(--expense)'}">
              ${m.trendTxt} <span style="font-size:.66rem;color:#a8aec8">(${_winTxt})</span>
              ${m.good?'✅':'⚠️'}
            </div>
            ${m.trendNote?`<div style="font-size:.66rem;color:#8b93ad;margin-top:2px;line-height:1.45">${m.trendNote}</div>`:''}
            ${m.subm||''}
          </div>
        </div>
      `).join('')}
    </div>


    <!-- v9.51: pokročilé metriky rozdělené do SBALITELNÝCH ŘÁDKŮ.
         Devět metrik v jedné hromadě se nedá číst; rozbalený zůstane jen ten,
         který uživatel opravdu sleduje. Volba se pamatuje (ff_obraz_rows). -->
    ${smerujCard}

    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#a8aec8;margin-bottom:10px">📐 4 · Pokročilé metriky</div>
    ${(()=>{
      const row = (key, icon, title, sub, body) => {
        const open = !_obrazRows[key];   // výchozí = rozbaleno
        return `
        <div style="margin-bottom:10px">
          <div onclick="obrazToggleRow('${key}')" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:7px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:${open?'10px 10px 0 0':'10px'}">
            <span style="font-size:.8rem;font-weight:800;color:var(--purple)">${icon} ${title}</span>
            <span style="font-size:.66rem;color:#a8aec8">${sub}</span>
            <span style="margin-left:auto;color:#a8aec8;font-size:.8rem;transform:rotate(${open?'0':'-90'}deg);transition:transform .15s">▾</span>
          </div>
          ${open?`<div style="border:1px solid var(--border);border-top:0;border-radius:0 0 10px 10px;padding:10px 10px 2px">${body}</div>`:''}
        </div>`;
      };
      return row('lifestyle','🏠','Lifestyle','životní styl, kam růst přistál, reálný růst', lifestyleCard)
           + row('indep','🏖️','5 · Nezávislost a stabilita','FFR, likvidita, diverzifikace',
                 `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${ffrCard}${liqCard}${diversCard}</div>`)
           + row('wealth','💎','6 · Majetek','čisté jmění a jeho růst',
                 `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${momentumCard}${nwCard}</div>`);
    })()}


    <!-- Měsíční přehled tabulka -->
    <div class="card">
      <div class="card-header"><span class="card-title">📅 7 · Měsíc po měsíci</span></div>
      <div class="card-body" style="padding:0">
        <div style="display:grid;grid-template-columns:46px repeat(6,minmax(58px,1fr));font-size:.66rem;font-weight:700;color:#a8aec8;text-transform:uppercase;padding:8px 10px;background:var(--surface3)">
          <span>Měsíc</span><span style="text-align:right">Příjmy</span><span style="text-align:right">Výdaje</span><span style="text-align:right">Momentum</span><span style="text-align:right" title="Výdaje ÷ příjmy">Exp.&nbsp;Ratio</span><span style="text-align:right" title="Skóre Finančního obrazu 0–100">Skóre</span><span style="text-align:right">Dluh</span>
        </div>
        ${series.map((s,i)=>`
          <div style="display:grid;grid-template-columns:46px repeat(6,minmax(58px,1fr));padding:8px 10px;border-bottom:1px solid var(--border);font-size:.73rem;${i===series.length-1?'font-weight:600':''}">
            <span style="color:#a8aec8">${s.month}</span>
            <span style="text-align:right;color:var(--income)">${fmt(s.inc)}</span>
            <span style="text-align:right;color:var(--expense)">${fmt(s.exp)}</span>
            <span style="text-align:right;color:${s.savings>=0?'var(--income)':'var(--expense)'}">${s.savings>=0?'+':''}${fmt(s.savings)}</span>
            ${(()=>{ //  v9.69: Exp. Ratio a Skóre po měsících – dosud jen v kartách výše
              const er = s.inc>0 ? s.exp/s.inc : null;
              const sc = computeObrazScore(series.slice(0, i+1));
              const erc = er===null?'#a8aec8':er<=.7?'var(--income)':er<=.9?'var(--debt)':'var(--expense)';
              const scc = sc.score>=65?'var(--income)':sc.score>=40?'var(--debt)':'var(--expense)';
              return `<span style="text-align:right;color:${erc}">${er===null?'–':Math.round(er*100)+' %'}</span>
                      <span style="text-align:right;color:${scc}">${i===0?'–':sc.score}</span>`; })()}
            <span style="text-align:right;color:${s.debt>0?'var(--debt)':'var(--text3)'}">${s.debt>0?fmt(Math.round(s.debt)):'·'}</span>
          </div>
        `).join('')}
        ${(()=>{ // v8.74: sumář období – součty + průměry
          const sInc=series.reduce((a,s)=>a+s.inc,0), sExp=series.reduce((a,s)=>a+s.exp,0);
          const sSav=sInc-sExp, n=series.length||1;
          //  v9.71 (FIX-243): sumáře měly 5 sloupců, hlavička 7 – tabulka se rozjela
          //  a chyběly souhrny za Exp. Ratio a Skóre. Nyní všechny řádky sedí.
          const sErAvg = sInc>0 ? sExp/sInc : null;
          const sScore = computeObrazScore(series);
          const lastDebt = series.length ? series[series.length-1].debt : 0;
          return `<div style="display:grid;grid-template-columns:46px repeat(6,minmax(58px,1fr));padding:9px 10px;border-top:2px solid var(--border2);font-size:.72rem;font-weight:700;background:var(--surface2)">
            <span style="color:#c9cede">Σ ${n}m</span>
            <span style="text-align:right;color:var(--income)">${fmt(sInc)}</span>
            <span style="text-align:right;color:var(--expense)">${fmt(sExp)}</span>
            <span style="text-align:right;color:${sSav>=0?'var(--income)':'var(--expense)'}">${sSav>=0?'+':''}${fmt(sSav)}</span>
            <span style="text-align:right;color:#a8aec8">·</span>
            <span style="text-align:right;color:#a8aec8">·</span>
            <span style="text-align:right;color:#a8aec8">·</span>
          </div>
          <div style="display:grid;grid-template-columns:46px repeat(6,minmax(58px,1fr));padding:6px 10px;font-size:.66rem;color:#a8aec8">
            <span>Ø/měs</span>
            <span style="text-align:right">${fmt(Math.round(sInc/n))}</span>
            <span style="text-align:right">${fmt(Math.round(sExp/n))}</span>
            <span style="text-align:right">${sSav>=0?'+':''}${fmt(Math.round(sSav/n))}</span>
            <span style="text-align:right">${sErAvg===null?'–':Math.round(sErAvg*100)+' %'}</span>
            <span style="text-align:right">${sScore.hasData?sScore.score:'–'}</span>
            <span style="text-align:right">${fmt(Math.round(lastDebt))}</span>
          </div>
          <div style="display:grid;grid-template-columns:46px repeat(6,minmax(58px,1fr));padding:7px 10px;font-size:.68rem;font-weight:700;border-top:1px solid var(--border)" title="Ø posledních 3 měsíců vs Ø předchozích 3 měsíců">
            <span style="color:#a8aec8">Trend 3v3</span>
            <span style="text-align:right;color:${trInc.dir>=0?'var(--income)':'var(--expense)'}">${trInc.txt}</span>
            <span style="text-align:right;color:${trExp.dir<=0?'var(--income)':'var(--expense)'}">${trExp.txt}</span>
            <span style="text-align:right;color:${trMom.dir>=0?'var(--income)':'var(--expense)'}">${trMom.txt}</span>
            <span style="text-align:right;color:#a8aec8">·</span>
            <span style="text-align:right;color:#a8aec8">·</span>
            <span style="text-align:right;color:${trDebt.dir<=0?'var(--income)':'var(--expense)'}">${trDebt.txt}</span>
          </div>`;
        })()}
      </div>
    </div>

    <div style="height:20px"></div>
    ${cyklyCard}`;
  // S17.4 (TODO-183, Milan): Ušlý zisk – peníze, které jen leží bez zhodnocení
  el.innerHTML += renderIdleYieldCard(D);
}

// ══════════════════════════════════════════════════════
//  S17.4 (TODO-183, Milan): UŠLÝ ZISK – peníze, které nepracují
//  Každá peněženka má vlastní úrok p.a. (default 0 % – prakticky všechny obsahují
//  neúročenou částku). Referenční sazba = kolik by nesly aspoň na spořáku (1–4 %).
//  Operační rezerva = částka, která ležet MÁ (klidně uvnitř spořáku) – odečítá se.
//  Ušlý zisk = Σ zůstatek × (referenční − vlastní úrok) − rezerva × referenční.
// ══════════════════════════════════════════════════════
function _idleCfg(){
  if(!S.idleCfg||typeof S.idleCfg!=='object') S.idleCfg={rate:3.0,reserve:0,walletRates:{}};
  if(!S.idleCfg.walletRates) S.idleCfg.walletRates={};
  if(typeof S.idleCfg.rate!=='number') S.idleCfg.rate=3.0;
  if(typeof S.idleCfg.reserve!=='number') S.idleCfg.reserve=0;
  return S.idleCfg;
}
function idleCfgSet(field,val,walletId){
  if(viewingUid) return;  // jen vlastní data
  const c=_idleCfg();
  const v=parseFloat(String(val).replace(',','.'));
  if(field==='rate') c.rate=Math.min(10,Math.max(0,isNaN(v)?0:v));
  else if(field==='reserve') c.reserve=Math.max(0,isNaN(v)?0:Math.round(v));
  else if(field==='wrate'&&walletId!=null) c.walletRates[walletId]=Math.min(15,Math.max(0,isNaN(v)?0:v));
  save();
  if(typeof renderObraz==='function') renderObraz();
}
function renderIdleYieldCard(D){
  const c=_idleCfg();
  const wallets=(D.wallets||[]);
  if(!wallets.length) return '';
  const balOf=w=>(typeof walletBalanceCZK==='function')?walletBalanceCZK(w.id,D):(typeof computeWalletBalance==='function'?computeWalletBalance(w.id,D):(w.balance||0));
  const rows=wallets.map(w=>{
    const bal=Math.round(balOf(w));
    const wr=c.walletRates[w.id]||0;
    const lost=bal>0?Math.round(bal*Math.max(0,c.rate-wr)/100):0;
    return {w,bal,wr,lost};
  }).filter(r=>r.bal>0);
  if(!rows.length) return '';
  rows.sort((a,b)=>b.lost-a.lost||b.bal-a.bal);
  const grossLost=rows.reduce((a,r)=>a+r.lost,0);
  const idleBase=rows.reduce((a,r)=>a+(r.wr<c.rate?r.bal:0),0);
  const reserveLost=Math.round(Math.min(c.reserve,idleBase)*c.rate/100);  // rezerva ležet MÁ – její výnos neúčtujeme jako ušlý
  const lostYear=Math.max(0,grossLost-reserveLost);
  const lostMonth=Math.round(lostYear/12);
  const sumCol=lostYear>0?'var(--expense)':'var(--income)';
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title">💤 9 · Ušlý zisk – peníze, které nepracují</span>
        <span style="font-size:.7rem;color:#a8aec8">z aktuálních zůstatků peněženek</span>
      </div>
      <div class="card-body">
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:end;margin-bottom:12px">
          <label style="font-size:.72rem;color:#a8aec8;display:flex;flex-direction:column;gap:4px">Referenční sazba (spořák, % p.a.)
            <input type="number" min="0" max="10" step="0.1" value="${c.rate}" onchange="idleCfgSet('rate',this.value)"
              style="width:110px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:#e8eaf2;padding:6px 8px;font-size:.85rem"></label>
          <label style="font-size:.72rem;color:#a8aec8;display:flex;flex-direction:column;gap:4px">Operační rezerva, která ležet má (Kč)
            <input type="number" min="0" step="1000" value="${c.reserve}" onchange="idleCfgSet('reserve',this.value)"
              style="width:130px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:#e8eaf2;padding:6px 8px;font-size:.85rem"></label>
          <!-- v9.69: na mobilu se částka odsazovala doprava mimo obraz. Nyní má
               vlastní podklad, zarovnává se doleva na úzkém displeji a nezalamuje se. -->
          <div style="flex:1 1 100%;min-width:0;padding:9px 12px;background:var(--surface2);border-left:3px solid ${sumCol};border-radius:0 10px 10px 0">
            <div style="font-size:.7rem;color:#a8aec8">Ročně ti utíká</div>
            <div style="font-family:Syne,sans-serif;font-size:clamp(1.1rem,4.5vw,1.35rem);font-weight:800;color:${sumCol};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lostYear>0?'−':''}${fmt(lostYear)} Kč</div>
            <div style="font-size:.7rem;color:#a8aec8">≈ ${fmt(lostMonth)} Kč/měsíc</div>
          </div>
        </div>
        <div style="overflow-x:auto"><table class="stat-table" style="width:100%;min-width:460px;font-size:.76rem">
          <thead><tr><th style="text-align:left">Peněženka</th><th style="text-align:right">Zůstatek</th><th style="text-align:center" title="Skutečný úrok, který ti peněženka nese (spořák, termíňák…)">Tvůj úrok % p.a.</th><th style="text-align:right">Ušlý zisk / rok</th></tr></thead>
          <tbody>
          ${rows.map(r=>`<tr>
            <td style="text-align:left;white-space:nowrap">${r.w.icon||'👛'} ${r.w.name}</td>
            <td style="text-align:right;color:#c9cede">${fmt(r.bal)}</td>
            <td style="text-align:center"><input type="number" min="0" max="15" step="0.1" value="${r.wr}" ${viewingUid?'disabled':''}
              onchange="idleCfgSet('wrate',this.value,'${r.w.id}')"
              style="width:66px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:#e8eaf2;padding:4px 6px;font-size:.78rem;text-align:center"></td>
            <td style="text-align:right;font-weight:700;color:${r.lost>0?'var(--expense)':'var(--income)'}">${r.lost>0?'−'+fmt(r.lost):'0'}</td>
          </tr>`).join('')}
          </tbody>
        </table></div>
        <div style="font-size:.7rem;color:#a8aec8;margin-top:8px;line-height:1.5">Ušlý zisk = zůstatek × (referenční sazba − tvůj úrok). <strong>Rezerva</strong> se od výpočtu odečítá – ta má ležet dostupná (klidně jako součást spořáku). Nastav u spořicích účtů jejich skutečný úrok, běžné účty nech na 0 %. Hrubý odhad před zdaněním, počítá se z dnešních zůstatků.</div>
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
    const amt = txCZK(t); // v8.61 (TODO-151)
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
      current: `${fmtB(amt)}/měs`,
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
  const bankFees = bankTxs.reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
  if(bankFees > 100) {
    suggestions.push({
      category:'🏦 Bankovní poplatky',
      item:'Poplatky za vedení účtu',
      current:`${fmtB(bankFees)}/měs`,
      saving: Math.round(bankFees*0.8),
      tip:'Air Bank, mBank nebo Fio nabízejí účty bez poplatků',
      severity:'mid'
    });
    totalSavable += Math.round(bankFees*0.8);
  }

  // 2b. ALKOHOL & TABÁK (S17.13, Milan) – neřestí bývá největší tichý žrout rozpočtu.
  // Zdroj: názvy transakcí + položky z účtenek (COICOP oddíl 2).
  {
    const alcKw = ['alkohol','pivo','víno','vino','rum','vodka','whisky','becherovka','fernet','gin','tequila','likér','liker','prosecco','sekt','cigaret','tabák','tabak','marlboro','camel','lucky strike','nikotin','vape','iqos','heets'];
    const alcTx = subTxs.filter(t => alcKw.some(kw => (t.name||'').toLowerCase().includes(kw)));
    let alcTotal = alcTx.reduce((a,t)=>a+(typeof txCZK==='function'?txCZK(t,D):(t.amount||t.amt||0)),0);
    // + položky z účtenek za aktuální měsíc
    const ymNow = `${S.curYear}-${String(S.curMonth+1).padStart(2,'0')}`;
    let alcItems = 0;
    (S.receipts||[]).forEach(r => {
      if(String(r.date||'').slice(0,7) !== ymNow) return;
      (r.items||[]).forEach(it => {
        const n=(it.name||'').toLowerCase();
        if(alcKw.some(kw=>n.includes(kw))) alcItems += (typeof lineAmt==='function'?lineAmt(it):(it.price||0)*(it.qty||1));
      });
    });
    alcTotal = Math.round(alcTotal + alcItems);
    if(alcTotal > 300){
      suggestions.push({
        category:'🍺 Alkohol & tabák',
        item:'Výdaje za neřesti',
        current:`${fmtB(alcTotal)}/měs`,
        saving: Math.round(alcTotal*0.5),
        tip:`Omezení na polovinu ušetří ${fmtB(Math.round(alcTotal*0.5))}/měs (${fmtB(Math.round(alcTotal*6))}/rok). Zdraví bonus zdarma.`,
        severity: alcTotal>2000 ? 'high' : 'mid'
      });
      totalSavable += Math.round(alcTotal*0.5);
    }
  }

  // 2c. NEJČASTĚJI NAKUPOVANÉ POLOŽKY (S17.13, Milan) – top 5 z účtenek za 3 měsíce.
  // Odhalí tiché žrouty typu oříšky, káva, sladkosti – jednotlivě malé, v součtu velké.
  {
    const cut = new Date(); cut.setMonth(cut.getMonth()-3);
    const agg = {};
    (S.receipts||[]).forEach(r => {
      const rd = new Date(r.date||''); if(isNaN(rd) || rd < cut) return;
      (r.items||[]).forEach(it => {
        const key = (it.name||'').trim().toLowerCase().replace(/\d+\s*(g|kg|ml|l|ks)\b/g,'').replace(/\s+/g,' ').trim().slice(0,25);
        if(key.length < 3) return;
        if(!agg[key]) agg[key] = {name:(it.name||'').trim(), total:0, qty:0, n:0};
        agg[key].total += (typeof lineAmt==='function'?lineAmt(it):(it.price||0)*(it.qty||1));
        agg[key].qty += (it.qty||1); agg[key].n++;
      });
    });
    const top = Object.values(agg).filter(x=>x.n>=3 && x.total>=200).sort((a,b)=>b.total-a.total).slice(0,5);
    top.forEach(x => {
      const perMonth = Math.round(x.total/3);
      if(perMonth < 100) return;
      suggestions.push({
        category:'🛒 Častý nákup',
        item: x.name,
        current:`${fmtB(perMonth)}/měs`,
        saving: Math.round(perMonth*0.3),
        tip:`${x.n}× za 3 měsíce (${Math.round(x.qty)} ks, celkem ${fmtB(Math.round(x.total))}). Omezení o třetinu ušetří ${fmtB(Math.round(perMonth*0.3))}/měs.`,
        severity:'low'
      });
      totalSavable += Math.round(perMonth*0.3);
    });
  }

  // 3. Pojištění
  const pojKeywords = ['pojištění','pojistné','allianz','kooperativa','generali','čsob pojišt','česká pojišt','uniqa','direct pojišt'];
  const pojTxs = subTxs.filter(t=>pojKeywords.some(kw=>(t.name||'').toLowerCase().includes(kw)));
  const pojTotal = pojTxs.reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
  if(pojTotal > 300) {
    suggestions.push({
      category:'🛡️ Pojištění',
      item:'Pojistné smlouvy',
      current:`${fmtB(Math.round(pojTotal))}/měs`,
      saving: Math.round(pojTotal*0.2),
      tip:'Srovnejte pojistné na srovnávači.cz nebo ušetřete sloučením smluv. Průměrná úspora 15–25 %.',
      severity:'mid'
    });
    totalSavable += Math.round(pojTotal*0.2);
  }

  // 4. Telefon a internet
  const telKeywords = ['vodafone','t-mobile','o2','tmobile','telefonica','cetin','upc','starlink','internet','mobilní tarif','tarif','volání'];
  const telTxs = subTxs.filter(t=>telKeywords.some(kw=>(t.name||'').toLowerCase().includes(kw)));
  const telTotal = telTxs.reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
  if(telTotal > 400) {
    const carriers = [...new Set(telTxs.map(t=>t.name).filter(Boolean))].slice(0,3).join(', ');
    suggestions.push({
      category:'📱 Telefon & Internet',
      item:carriers||'Mobilní tarify a internet',
      current:`${fmtB(Math.round(telTotal))}/měs`,
      saving: Math.round(telTotal*0.25),
      tip:'Srovnejte tarify na tarifnamax.cz nebo tariffcomparison.cz. Přechod k jinému operátorovi ušetří průměrně 200–500 Kč/měs.',
      severity:'mid'
    });
    totalSavable += Math.round(telTotal*0.25);
  }

  // 5. Analýza výdajů – kategorie přes limit
  const expCats = (D.categories||[]).filter(c=>c.healthPct&&(c.type==='expense'||c.type==='both'));
  expCats.forEach(cat=>{
    const spent = txs.filter(t=>(t.catId||t.category)===cat.id&&t.type==='expense').reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
    const limit = baseIncome>0?baseIncome*cat.healthPct/100:0;
    if(spent>limit*1.2 && limit>0) {
      const over = Math.round(spent-limit);
      suggestions.push({
        category:`${cat.icon} ${cat.name}`,
        item:'Překročení limitu kategorie',
        current:`${fmtB(spent)} (limit ${fmtB(Math.round(limit))})`,
        saving: over,
        tip:`Snižte výdaje v kategorii ${cat.name} o ${fmtB(over)} na plánovaný limit`,
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

  // S17.35 (Milan): práh snížen z 10 % na 7 %. Původní hranice vznikla v době vyšších sazeb;
  // dnes se vyplatí refinancovat i hypotéku nad 6 % nebo spotřebák nad 8 %.
  const REFI_THRESHOLD = 7;
  const expensiveDebts = (D.debts||[]).filter(d=>d.interest>REFI_THRESHOLD);
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
        current:`${d.interest}% p.a. – přeplatíte ${fmtB(Math.round(orig.totalInterest))}`,
        saving: perPeriodSaving,
        tip:`Refinancováním na ~${Math.round(betterRate*10)/10}% ušetříte ${fmtB(saved)} celkem`,
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
        current: `${fmtB(Math.round(item.total))}/měs`,
        saving,
        tip: `Platíte průměrně ${fmtB(Math.round(item.total/item.count))} za platbu, ${item.count}× v měsíci. Zkuste nastavit limit nebo alternativu.`,
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
    const totalExpAll = expAll.reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
    const expWeek1 = expAll.filter(t=>{
      const d = new Date(t.date||'');
      return d >= payday && d <= week1End;
    }).reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
    const week1Pct = totalExpAll>0 ? Math.round(expWeek1/totalExpAll*100) : 0;
    if(week1Pct >= 60 && expWeek1 > 3000) {
      suggestions.push({
        category: '📅 Výplata efekt',
        item: `${week1Pct} % výdajů v prvním týdnu`,
        current: `${fmtB(Math.round(expWeek1))} / 7 dní`,
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
  const foodOutTotal = foodOutTxs.reduce((a,t)=>a+txCZK(t),0); // v8.61 (TODO-151)
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
      current: `${fmtB(Math.round(foodOutTotal))} (${fmtB(dailyFoodOut)}/den)`,
      saving: Math.round(monthlyEstimate * 0.3),
      tip: `Průměrně ${fmtB(dailyFoodOut)}/den za jídlo venku. Odhad na celý měsíc: ${fmtB(monthlyEstimate)}. Vaření doma nebo příprava jídla ušetří 30–50 %.`,
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
        current: `${fmt(pa.oldPrice)} → ${fmtB(pa.newPrice)} (+${pa.changePct}%)`,
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
    {icon:'💳', label:'Drahé půjčky', desc:'Úrok nad 7 % p.a. vhodný k refinancování'},
    {icon:'☕', label:'Zbytečné utrácení', desc:'Malé časté platby (4× za měsíc)'},
    {icon:'📅', label:'Výplata efekt', desc:'60 %+ výdajů v 1. týdnu po výplatě'},
    {icon:'🍽️', label:'Jídlo venku', desc:'Podle názvu transakce (McDonald, pizza, kavárna…)'},
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
          Pro detailní přehled zdražení položek navštivte <span style="color:var(--bank);cursor:pointer;text-decoration:underline" onclick="openUctenkyTab('prices')">Analýza účtenek → Zdražování</span>.
        </div>
      </div>
    </div>

    ${!suggestions.length ? `
      <div class="card"><div class="card-body">
        <div class="empty" style="padding:20px"><div class="ei">✅</div>
          <div class="et">Nenašel jsem, kde ubrat</div>
          <div style="font-size:.78rem;color:#a8aec8;margin-top:8px;line-height:1.6;max-width:460px;margin-left:auto;margin-right:auto">
            To není chyba – detektor proběhl a nic zbytečného nenašel.
          </div>
        </div>
        <!-- S17.35 (Milan): prázdný stav nyní VYSVĚTLUJE, co se prověřilo a proč to prošlo.
             Dřív jen „žádné úspory" – uživatel netušil, jestli appka funguje, nebo je vše OK. -->
        <div style="margin-top:12px;font-size:.76rem;color:#c9cede;line-height:1.7">
          ${(()=>{
            const rows=[];
            const dbs=(D.debts||[]).filter(d=>(d.remaining||d.total||0)>0);
            if(dbs.length){
              const worst=Math.max(...dbs.map(d=>d.interest||0));
              rows.push(worst>REFI_THRESHOLD
                ? `💳 Prověřeno ${dbs.length} půjček – nejdražší má ${worst} %, ale úspora refinancováním by nepřesáhla 10 000 Kč.`
                : `💳 Prověřeno ${dbs.length} půjček – nejdražší má <strong>${worst} %</strong>, což je pod hranicí ${REFI_THRESHOLD} % pro refinancování. Máš dobré sazby.`);
            }
            const nSub=subTxs.length;
            rows.push(`🧾 Prošel jsem <strong>${nSub}</strong> transakcí tohoto měsíce – žádná se neopakuje podezřele často ani nepřekračuje limit.`);
            if(foodOutCount) rows.push(`🍽️ Restaurace a kavárny: ${foodOutCount}× za ${fmtB(Math.round(foodOutTotal))} – v normě.`);
            const lim=(D.categories||[]).filter(c=>c.limit>0).length;
            if(!lim) rows.push(`🏷️ <strong>Zatím nemáš nastavené limity kategorií</strong> – nastav je v Kategoriích a detektor pozná, kdy je překročíš.`);
            if(!(S.receipts||[]).length) rows.push(`📸 <strong>Žádné naskenované účtenky</strong> – bez nich nepoznám zdražování konkrétních položek.`);
            return rows.map(r=>`<div style="padding:5px 0">${r}</div>`).join('');
          })()}
        </div>
      </div></div>` : `
    <!-- Shrnutí -->
    <div style="background:linear-gradient(135deg,rgba(74,222,128,.08),rgba(96,165,250,.05));border:1px solid rgba(74,222,128,.2);border-radius:var(--radius);padding:16px;margin-bottom:14px;text-align:center">
      <div style="font-size:.72rem;color:var(--text3);font-weight:600;text-transform:uppercase;margin-bottom:6px">Nalezené úspory – ${CZ_M[S.curMonth]} ${S.curYear}</div>
      <div style="font-family:Syne,sans-serif;font-size:2rem;font-weight:800;color:var(--income)">${fmtB(totalSavable)}/měs</div>
      <div style="font-size:.8rem;color:var(--text2);margin-top:4px">${suggestions.length} doporučení</div>
      <div style="font-size:.74rem;color:var(--text3);margin-top:4px">Ročně: <strong style="color:var(--income)">${fmtB(totalSavable*12)}</strong></div>
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
            <div style="font-size:.7rem;color:var(--text3);margin-top:4px">💡 možná úspora: <strong style="color:var(--income)">−${fmtB(s.saving)}/měs</strong> · ${sevLabel(s.severity)} priorita</div>
          </div>
          <div style="text-align:right;flex-shrink:1;min-width:0;max-width:52%">
            <div style="font-family:Syne,sans-serif;font-size:clamp(.88rem,3.6vw,1.4rem);font-weight:800;color:var(--expense);line-height:1.2;overflow-wrap:anywhere">${s.current}</div>
            <div style="font-size:.66rem;color:#a8aec8;margin-top:2px;letter-spacing:.04em;text-transform:uppercase">aktuálně utrácíš</div>
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
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px">
      <div style="background:var(--surface2);border-radius:12px;padding:14px;border:1px solid var(--border);text-align:center;min-width:0">
        <div style="font-size:.68rem;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase">📉 Scénář A<br>Stejné tempo</div>
        <div style="font-family:Syne,sans-serif;font-size:clamp(.82rem,3.2vw,1.1rem);font-weight:800;color:var(--text);overflow-wrap:anywhere;line-height:1.25">${fmtB(scenA)}</div>
        <div style="font-size:.7rem;color:var(--text3);margin-top:4px">při odchodu v ${retireAge}</div>
        <div style="font-size:.76rem;color:var(--text2);margin-top:6px">${fmtB(monthlyA)}/měs<br><span style="font-size:.66rem;color:#a8aec8">z úspor (4% rule)</span></div>
      </div>
      <div style="background:${scenB>=scenC?'rgba(74,222,128,.08)':'var(--surface2)'};border-radius:12px;padding:14px;border:1px solid ${scenB>=scenC?'rgba(74,222,128,.3)':'var(--border)'};text-align:center;min-width:0">
        <div style="font-size:.68rem;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase">📈 Scénář B<br>Investuji ${investPct}%</div>
        <div style="font-family:Syne,sans-serif;font-size:clamp(.82rem,3.2vw,1.1rem);font-weight:800;color:var(--income);overflow-wrap:anywhere;line-height:1.25">${fmtB(scenB)}</div>
        <div style="font-size:.7rem;color:var(--text3);margin-top:4px">při ${investReturn}% p.a. výnosu</div>
        <div style="font-size:.76rem;color:var(--text2);margin-top:6px">${fmtB(monthlyB)}/měs<br><span style="font-size:.66rem;color:#a8aec8">z úspor (4% rule)</span></div>
      </div>
      <div style="background:${scenC>scenB?'rgba(74,222,128,.08)':'var(--surface2)'};border-radius:12px;padding:14px;border:1px solid ${scenC>scenB?'rgba(74,222,128,.3)':'var(--border)'};text-align:center;min-width:0">
        <div style="font-size:.68rem;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase">💳 Scénář C<br>Splatím dluh dříve</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:${scenC>scenA?'var(--income)':'var(--text)'}">${fmtB(scenC)}</div>
        <div style="font-size:.7rem;color:var(--text3);margin-top:4px">splacení za ${Math.round(debtFreeMonth/12*10)/10}r</div>
        <div style="font-size:.76rem;color:var(--text2);margin-top:6px">${fmtB(monthlyC)}/měs<br><span style="font-size:.66rem;color:#a8aec8">z úspor (4% rule)</span></div>
      </div>
    </div>
    <!-- Insight -->
    <div style="background:linear-gradient(135deg,rgba(96,165,250,.08),rgba(74,222,128,.05));border:1px solid rgba(96,165,250,.2);border-radius:12px;padding:14px;margin-bottom:14px">
      <div style="font-size:.74rem;color:var(--text3);margin-bottom:6px">🏆 Nejlepší scénář: <strong style="color:var(--income)">${bestLabel}</strong></div>
      <div style="font-family:Syne,sans-serif;font-size:1.6rem;font-weight:800;color:var(--income)">${fmtB(best)}</div>
      <div style="font-size:.78rem;color:var(--text2);margin-top:6px">
        O <strong>${fmtB(best-scenA)} více</strong> než při stejném tempu · 
        Měsíční renta: <strong>${fmtB(Math.max(monthlyB,monthlyC))}</strong> + státní důchod ~${fmtB(stateDuchodEst)}
      </div>
    </div>
    <!-- Inflace warning -->
    ${inflation > 0 ? `<div class="insight-item warn" style="margin-bottom:14px"><div class="insight-icon">📉</div><div class="insight-text">Při inflaci ${inflation}% p.a. bude <strong>${fmtB(best)}</strong> mít reálnou hodnotu pouze <strong>${fmtB(Math.round(best/Math.pow(1+inflation/100,years)))}</strong> dnešních peněz.</div></div>` : ''}
    <!-- Doporučení -->
    <div class="card">
      <div class="card-header"><span class="card-title">💡 Co dělat</span></div>
      <div class="card-body">
        ${monthlySurplus < 0 ? '<div class="insight-item bad"><div class="insight-icon">🚨</div><div class="insight-text">Výdaje převyšují příjmy! Bez změny nebude možné spořit ani investovat.</div></div>' : ''}
        ${monthlyInvest > 0 ? `<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text">Investujte ${fmtB(Math.round(monthlyInvest))}/měs (${investPct}% příjmu) do indexových fondů nebo ETF.</div></div>` : ''}
        ${debt > 0 ? `<div class="insight-item warn"><div class="insight-icon">💳</div><div class="insight-text">Dluh ${fmtB(debt)} – zvažte zda úrok > očekávaný výnos. Pokud ano, nejprve splaťte dluh.</div></div>` : ''}
        <div class="insight-item good"><div class="insight-icon">🎯</div><div class="insight-text">Cíl: naspořit ${fmtB(Math.round(expenses*12/0.04))} (25× roční výdaje) pro finanční nezávislost.</div></div>
      </div>
    </div>`;

  // Draw chart
  drawSimulaceChart(age, retireAge, savings, monthlySurplus, monthlyInvest, r, debtPayment, debt, inflation);
}

function drawSimulaceChart(age, retireAge, startSavings, surplus, monthlyInvest, r, debtPayment, debt, inflation) {
  // v8.62 (FIX): kompletní přepis – canvas neumí CSS proměnné (graf byl „bez barev"),
  // legenda se křížila s popisky osy X, chybělo DPR škálování (rozmazané na mobilu).
  setTimeout(()=>{
    const canvas = document.getElementById('simulaceChart'); if(!canvas) return;
    const W = canvas.parentElement?.clientWidth||500, H = 260;
    const dpr = window.devicePixelRatio||1;
    canvas.width=W*dpr; canvas.height=H*dpr;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
    ctx.clearRect(0,0,W,H);
    const years = retireAge-age;
    const pts = Math.min(years, 50);
    const stepYears = years/pts;

    // Výpočet 3 scénářů
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
    const pad={l:58,r:12,t:30,b:44}; // t: legenda nahoře · b: popisky X + název osy (nekryjí se)
    const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
    const x=i=>pad.l+(i/pts)*cW;
    const y=v=>pad.t+cH-(v/maxVal)*cH;
    const COLS={A:'#8b90a8', B:'#4ade80', C:'#60a5fa'}; // hex – CSS var() v canvas nefunguje

    // Mřížka + ticky osy Y (v základní měně)
    ctx.strokeStyle='rgba(96,102,130,.35)';ctx.lineWidth=1;ctx.setLineDash([3,3]);
    ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='right';
    [0,0.25,0.5,0.75,1].forEach(f=>{
      const yy=pad.t+cH*(1-f);
      ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(W-pad.r,yy);ctx.stroke();
      const v=czkToBase(maxVal*f);
      ctx.fillText(v>=1000000?(Math.round(v/100000)/10)+'M':v>=1000?Math.round(v/1000)+'k':Math.round(v), pad.l-6, yy+3.5);
    });
    ctx.setLineDash([]);
    // Osy
    ctx.strokeStyle='rgba(168,174,200,.5)';
    ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+cH);ctx.lineTo(W-pad.r,pad.t+cH);ctx.stroke();

    // Čáry scénářů
    const lines=[{data:serA,color:COLS.A,dash:[]},{data:serB,color:COLS.B,dash:[]},{data:serC,color:COLS.C,dash:[6,4]}];
    lines.forEach(l=>{
      ctx.beginPath();
      l.data.forEach((v,i)=>i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
      ctx.strokeStyle=l.color;ctx.lineWidth=2.5;ctx.setLineDash(l.dash);ctx.stroke();
    });
    ctx.setLineDash([]);

    // Popisky osy X (věk) + názvy os
    ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='center';
    [0,Math.floor(pts/4),Math.floor(pts/2),Math.floor(pts*3/4),pts].forEach(i=>{
      ctx.fillText(age+Math.round(i*years/pts)+' let',x(i),pad.t+cH+15);
    });
    ctx.font='9px Instrument Sans';
    ctx.fillText('Věk',pad.l+cW/2,H-4);
    ctx.save();ctx.translate(11,pad.t+cH/2);ctx.rotate(-Math.PI/2);ctx.textAlign='center';
    ctx.fillText('Majetek ('+curSym()+')',0,0);ctx.restore();

    // Legenda NAHOŘE (nekryje se s osou X)
    ctx.textAlign='left';ctx.font='10.5px Instrument Sans';
    let lx=pad.l;
    [{c:COLS.A,l:'A: Stejné tempo'},{c:COLS.B,l:'B: Investuji'},{c:COLS.C,l:'C: Splatím dluh'}].forEach(it=>{
      ctx.fillStyle=it.c;ctx.fillRect(lx,9,14,3.5);
      ctx.fillStyle='#c9cede';ctx.fillText(it.l,lx+18,14);
      lx += 18 + ctx.measureText(it.l).width + 16;
    });

    // Tooltip (myš i dotyk)
    canvas.onmousemove = canvas.ontouchstart = function(ev){
      const e = ev.touches?ev.touches[0]:ev;
      const rect=canvas.getBoundingClientRect();
      const mx=e.clientX-rect.left;
      const i=Math.max(0,Math.min(pts,Math.round((mx-pad.l)/cW*pts)));
      let tt=document.getElementById('simulaceTip');
      if(!tt){ tt=document.createElement('div'); tt.id='simulaceTip'; tt.style.cssText='position:fixed;z-index:9999;background:#1a1d27;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:7px 11px;font-size:.72rem;color:#e8eaf2;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.4);line-height:1.6'; document.body.appendChild(tt); }
      tt.style.display='block';
      tt.style.left=Math.min(e.clientX+12, window.innerWidth-190)+'px';
      tt.style.top=Math.max(8, e.clientY-70)+'px';
      tt.innerHTML=`<b>${age+Math.round(i*years/pts)} let</b>`
        +`<br><span style="color:${COLS.A}">●</span> Stejné tempo: ${fmtB(serA[i])}`
        +`<br><span style="color:${COLS.B}">●</span> Investuji: ${fmtB(serB[i])}`
        +`<br><span style="color:${COLS.C}">●</span> Splatím dluh: ${fmtB(serC[i])}`;
      if(ev.touches) setTimeout(()=>{ if(tt) tt.style.display='none'; }, 2500);
    };
    canvas.onmouseleave=function(){ const tt=document.getElementById('simulaceTip'); if(tt) tt.style.display='none'; };
  },50);
}

// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
//  S16 (TODO-174): 📖 DENÍK v2 – starodávná kniha · predikce vs. skutečnost (zatím jen ADMIN)
//  Koncept (Milan): snímkovat PREDIKCE (neměnný fakt vyslovený v čase),
//  skutečnost počítat živě z transakcí → zpětné úpravy dat se propíšou samy.
//  v2: vizuál starodávné knihy (pergamenové stránky, kožená vazba, inkoustové barvy)
//      + graf PŘÍJEM / VÝDEJ / PREDIKCE kumulativně den po dni na spodním listu.
//  Data: S.diary[YYYY-MM] = {createdAt, predInc, predExp, predBud, predCurve[],
//  debtNow, wallets, scoreRaw, scoreMax} – v saveToFirebase schématu (cloud).
// ══════════════════════════════════════════════════════
function _denikKey(y,m){ return `${y}-${String(m+1).padStart(2,'0')}`; }

// S16.14 (Milan): Deník měl DVA přepínače měsíce (globální hlavička + vlastní ‹ ›)
//   a nebyly propojené → zmatek. Vlastní zrušen, Deník jede z globálního S.curMonth/S.curYear.

// Predikovaná kumulativní křivka den po dni: tvar = Ø tvar posledních 6 měsíců, škálovaný na predExp
function _denikPredCurve(D, m, y, predExp){
  const days=new Date(y,m+1,0).getDate();
  const shape=Array(days).fill(0); let used=0;
  for(let i=1;i<=6;i++){
    let hm=m-i,hy=y; while(hm<0){hm+=12;hy--;}
    const hd=new Date(hy,hm+1,0).getDate();
    const arr=Array(hd).fill(0);
    getTx(hm,hy,D).forEach(t=>{ if(t.type!=='expense'||t.isBalancing||t.splitParent||isTransferTx(t))return; const di=new Date(t.date).getDate()-1; if(di>=0&&di<hd) arr[di]+=txCZK(t,D); });
    let sm=0; const cum=arr.map(v=>{sm+=v;return sm;});
    if(sm<=0) continue;
    for(let d2=0;d2<days;d2++){ const v=d2<hd?cum[d2]:cum[hd-1]; shape[d2]+=v/sm; }
    used++;
  }
  if(!used){ return Array.from({length:days},(_,i)=>Math.round(predExp*(i+1)/days)); }
  return shape.map(v=>Math.round(predExp*v/used));
}

// S17.3 (TODO-186): výpočet snímku vytažen do sdílené funkce – používá ruční 🖋 i automatický snímek.
function _denikBuildSnap(D,m,y){
  const avgInc=(typeof computeEffectiveIncome==='function')?computeEffectiveIncome(D,12):0;
  let predExp=0,hit=0;
  (D.categories||[]).filter(c=>c.type==='expense'||c.type==='both').forEach(c=>{
    const v=(typeof predictCat==='function')?predictCat(c.id,null,m,y,D):null;
    if(v!==null&&!isNaN(v)){predExp+=v;hit++;}
  });
  if(!hit){ let t=0,n2=0; for(let i=1;i<=3;i++){ let mm=m-i,yy=y; if(mm<0){mm+=12;yy--;} const e=expSum(getTx(mm,yy,D),D); if(e>0){t+=e;n2++;} } predExp=n2?Math.round(t/n2):0; }
  predExp=Math.round(predExp);
  let predBud=0;
  if(typeof budouciGetAll==='function'){
    try{ const eom=new Date(y,m+1,0,23,59,59);
      (budouciGetAll(D,45)||[]).forEach(b=>{ const bd=new Date(b.date); if(bd<=eom) predBud+=(b.amount||0); });
    }catch(e){}
  }
  const debts=D.debts||[];
  const sc=(typeof computeFinancialScore==='function')?(()=>{try{return computeFinancialScore(D);}catch(e){return null;}})():null;
  return {
    createdAt: Date.now(),
    predInc: Math.round(avgInc),
    predExp,
    predBud: Math.round(predBud),
    predCurve: _denikPredCurve(D,m,y,predExp),
    debtNow: Math.round(debts.reduce((a,d)=>a+(d.remaining||0),0)),
    wallets: (typeof assetLiqTotals==='function')?Math.round(assetLiqTotals(D).wallets||0):0,
    scoreRaw: sc?sc.rawTotal:null, scoreMax: sc?sc.rawMax:null,
    stressRaw: (typeof computeStressIndex==='function')?(computeStressIndex(D)||{total:null}).total:null,  // S16.8 (Deník v2.1)
  };
}

function denikSnapshot(){
  const D=getData();
  const m=S.curMonth, y=S.curYear; // snímek vždy pro AKTUÁLNÍ reálný měsíc
  const key=_denikKey(y,m);
  if(!S.diary) S.diary={};
  if(S.diary[key] && !confirm('Snímek pro tento měsíc už existuje. Přepsat novým?')) return;
  S.diary[key]=_denikBuildSnap(D,m,y);
  save();
  renderDenik();
  if(typeof showToast==='function') showToast('📸 Snímek predikce zapsán do Deníku');
}

// S17.3 (TODO-186, Milan): AUTOMATICKÝ snímek predikce při vstupu do nového měsíce.
// Volá se z renderPage (1× za session). Tvoří základ záložky „Přesnost" v Predikci:
// na začátku měsíce se zafixuje, co model tvrdil, na konci se srovná se skutečností.
function denikAutoSnapshot(){
  if(window._denikAutoDone) return;
  if(typeof viewingUid!=='undefined' && viewingUid) return;   // ne při prohlížení dat partnera
  const D=getData();
  if(!(D.transactions||[]).length) return;                    // data ještě nenaběhla / prázdný účet
  const now=new Date(), m=now.getMonth(), y=now.getFullYear(); // vždy REÁLNÝ měsíc (ne S.curMonth)
  const key=_denikKey(y,m);
  if(!S.diary) S.diary={};
  if(S.diary[key]){ window._denikAutoDone=true; return; }     // už existuje (ruční nebo dřívější auto)
  const snap=_denikBuildSnap(D,m,y);
  if(!snap.predExp) return;                                    // bez historie by snímek byl samé nuly
  snap.auto=true;
  S.diary[key]=snap;
  window._denikAutoDone=true;
  save();
}

function denikDeleteSnap(key){
  if(!confirm('Smazat snímek predikce pro tento měsíc?')) return;
  if(S.diary) delete S.diary[key];
  save(); renderDenik();
}

// v2: graf na pergamenu – PŘÍJEM (zelený inkoust) / VÝDEJE (červený) / PREDIKCE výdajů (fialová přerušovaná)
function _denikDayChart(days, actExp, actInc, pred, todayD){
  const W=640,H=210,pad={l:58,r:14,t:16,b:30};
  const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const vMax=Math.max(...actExp,...actInc,...(pred||[0]),1);
  const xf=i=>pad.l+(i+0.5)*(cW/days);
  const yf=v=>pad.t+cH*(1-v/vMax);
  const AX='#7a6248', INK_I='#2e6b3f', INK_E='#8c2f2f', INK_P='#6b4b8a';
  let g='';
  [vMax,vMax/2,0].forEach(v=>{
    g+=`<line x1="${pad.l}" y1="${yf(v)}" x2="${W-pad.r}" y2="${yf(v)}" stroke="rgba(90,60,30,${v===0?'.5':'.22'})" stroke-width="1" ${v!==0?'stroke-dasharray="3,3"':''}/>`;
    g+=`<text x="${pad.l-6}" y="${yf(v)+3.5}" text-anchor="end" font-size="9.5" fill="${AX}">${_obrazK(v)}</text>`;
  });
  const lastIdx=todayD?Math.min(todayD,days):days;
  // predikce výdajů – fialová přerušovaná (celý měsíc)
  if(pred&&pred.length){
    const pts=pred.slice(0,days).map((v,i)=>`${xf(i).toFixed(1)},${yf(v).toFixed(1)}`).join(' ');
    g+=`<polyline points="${pts}" fill="none" stroke="${INK_P}" stroke-width="2" stroke-dasharray="6,4"/>`;
  }
  // skutečné výdaje – červený inkoust s lehkou plochou
  const exp=actExp.slice(0,lastIdx);
  if(exp.length){
    let area=`M ${xf(0).toFixed(1)} ${yf(0).toFixed(1)} `;
    exp.forEach((v,i)=>{ area+=`L ${xf(i).toFixed(1)} ${yf(v).toFixed(1)} `; });
    area+=`L ${xf(exp.length-1).toFixed(1)} ${yf(0).toFixed(1)} Z`;
    g+=`<path d="${area}" fill="rgba(140,47,47,.12)"></path>`;
    g+=`<polyline points="${exp.map((v,i)=>`${xf(i).toFixed(1)},${yf(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${INK_E}" stroke-width="2.4" stroke-linejoin="round"/>`;
  }
  // skutečné příjmy – zelený inkoust
  const inc2=actInc.slice(0,lastIdx);
  if(inc2.length){
    g+=`<polyline points="${inc2.map((v,i)=>`${xf(i).toFixed(1)},${yf(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${INK_I}" stroke-width="2.4" stroke-linejoin="round"/>`;
  }
  // osa X po 2 dnech
  for(let d2=1;d2<=days;d2+=2){ g+=`<text x="${xf(d2-1).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="10" fill="${AX}">${d2}</text>`; }
  if(days%2===0) g+=`<text x="${xf(days-1).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="10" fill="${AX}">${days}</text>`;
  // tooltip pásy
  for(let i=0;i<days;i++){
    const e=i<lastIdx?actExp[i]:null, inc3=i<lastIdx?actInc[i]:null, p=pred&&i<pred.length?pred[i]:null;
    const diff=(e!==null&&p)?Math.round((e-p)/p*100):null;
    const tip=`<b>${i+1}. den</b>`+(inc3!==null?`<br>Příjem ${fmtB(inc3)}`:'')+(e!==null?`<br>Výdaje ${fmtB(e)}`:'')+(p!==null?`<br>Predikce výd. ${fmtB(p)}`:'')+(diff!==null?`<br>${diff>=0?'+':''}${diff} % vs predikce`:'');
    g+=`<rect x="${(pad.l+i*(cW/days)).toFixed(1)}" y="${pad.t}" width="${(cW/days).toFixed(1)}" height="${cH}" fill="transparent" style="cursor:pointer"
      onmouseenter="_obrazTip(event,'${tip}')" onmouseleave="_obrazTipHide()" ontouchstart="_obrazTip(event,'${tip}')"></rect>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:100%;height:auto;display:block">${g}</svg>`;
}

// S16.11 (Milan): přepínač grafu v Deníku – kumulativní vs denní nákupy
function denikSetChart(mode){ window._denikChart = mode; renderDenik(); }

// Sloupcový graf DENNÍCH nákupů (kolik utraceno každý den) – inkoustový styl knihy
function _denikDailyChart(days, dailyExp, todayD){
  const W=640,H=210,pad={l:58,r:14,t:16,b:30};
  const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  const lastIdx = todayD ? Math.min(todayD,days) : days;
  const vals = dailyExp.slice(0,lastIdx).map(v=>Math.round(v));
  const vMax = Math.max(...vals, 1);
  const spent = vals.filter(v=>v>0);
  const avg = spent.length ? Math.round(spent.reduce((a,b)=>a+b,0)/spent.length) : 0;
  const AX='#7a6248', INK='#8c2f2f', INK_AVG='#6b4b8a';
  const slot=cW/days, bw=Math.max(2,Math.min(slot*0.62,16));
  const y=v=>pad.t+cH*(1-v/vMax);
  let g='';
  [vMax,vMax/2,0].forEach(v=>{
    g+=`<line x1="${pad.l}" y1="${y(v)}" x2="${W-pad.r}" y2="${y(v)}" stroke="rgba(90,60,30,${v===0?'.5':'.22'})" stroke-width="1" ${v!==0?'stroke-dasharray="3,3"':''}/>`;
    g+=`<text x="${pad.l-6}" y="${y(v)+3.5}" text-anchor="end" font-size="9.5" fill="${AX}">${_obrazK(v)}</text>`;
  });
  vals.forEach((v,i)=>{
    if(v>0){
      const x=pad.l+i*slot+(slot-bw)/2;
      const rY=y(v), rH=Math.max(y(0)-rY,1.5);
      g+=`<rect x="${x.toFixed(1)}" y="${rY.toFixed(1)}" width="${bw.toFixed(1)}" height="${rH.toFixed(1)}" rx="2" fill="${INK}" opacity=".82"></rect>`;
    }
  });
  if(avg>0){
    g+=`<line x1="${pad.l}" y1="${y(avg)}" x2="${W-pad.r}" y2="${y(avg)}" stroke="${INK_AVG}" stroke-width="1.6" stroke-dasharray="6,4"/>`;
    g+=`<text x="${W-pad.r}" y="${y(avg)-4}" text-anchor="end" font-size="9" fill="${INK_AVG}" font-weight="700">Ø ${_obrazK(avg)}/den utracení</text>`;
  }
  for(let d2=1;d2<=days;d2+=2){ g+=`<text x="${(pad.l+(d2-1)*slot+slot/2).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="10" fill="${AX}">${d2}</text>`; }
  // tooltip pásy
  for(let i=0;i<days;i++){
    const v=i<lastIdx?vals[i]:null;
    const tip=`<b>${i+1}. den</b><br>${v===null?'—':(v>0?`Utraceno ${fmtB(v)}`+(avg?`<br>${v>avg?'nad':'pod'} průměrem (${fmtB(avg)})`:''):'Nic neutraceno 🎉')}`;
    g+=`<rect x="${(pad.l+i*slot).toFixed(1)}" y="${pad.t}" width="${slot.toFixed(1)}" height="${cH}" fill="transparent" style="cursor:pointer"
      onmouseenter="_obrazTip(event,'${tip}')" onmouseleave="_obrazTipHide()" ontouchstart="_obrazTip(event,'${tip}')"></rect>`;
  }
  const zero=vals.filter(v=>v===0).length;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:100%;height:auto;display:block">${g}</svg>
    <div style="text-align:center;font-size:.78rem;color:#5b4636;font-family:Georgia,serif;margin-top:4px">
      Dnů bez utrácení: <strong>${zero}</strong> z ${lastIdx} · nejdražší den: <strong>${fmtB(vMax)}</strong>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  v9.45 (TODO-203): ŽIVOTNÍ MAPA
//
//  Uživatel si na časovou osu značí zlomové životní události.
//  DŮVOD: dlouhé horizonty (12M+) neměří návyky, ale životní události –
//  stěhování, dítě, hypotéka. Bez kontextu vypadá takový zlom jako selhání.
//  Označená událost ho VYSVĚTLÍ místo aby ho penalizovala.
//
//  ⚠️ ZÁMĚRNĚ NEOVLIVŇUJE BODOVÁNÍ (produktové rozhodnutí). Kdyby událost
//  měnila skóre, appka by rozhodovala, které životní volby jsou omluvitelné –
//  to jí nepřísluší (SKILL 22). Navíc by šlo zneužít: označit každý drahý
//  měsíc jako „stěhování". Kontext ano, výmluva ne.
// ══════════════════════════════════════════════════════
const MS_PRESETS = [
  ['💼','Změna práce'], ['📈','Zvýšení platu'], ['📉','Ztráta příjmu'],
  ['👶','Narození dítěte'], ['💍','Svatba'], ['💔','Rozvod'],
  ['🏠','Hypotéka'], ['📦','Stěhování'], ['🚗','Koupě auta'],
  ['🎓','Studium'], ['🏥','Nemoc'], ['🎁','Dědictví'],
];
// v9.50 (5b): ETAPY – životní období, ne bod na ose.
//  Milník je datum („vzal jsem si hypotéku"), etapa má začátek a konec
//  („Rodina bez dětí" 2019–2023). Teprve etapa umožní srovnat Ø výdaje
//  mezi obdobími – u bodového milníku není co s čím porovnat.
const MS_ERAS = [
  ['🎓','Student'], ['🧍','Svobodný'], ['💑','Pár'], ['👨‍👩‍👦','Rodina'],
  ['👶','Rodina s dítětem'], ['🏠','Vlastní bydlení'], ['🌴','Bez práce'],
];
let _msForm = null;   // null = zavřeno, {} = nová, {id..} = editace

function msOpen(id, kind){
  const list = S.milestones||[];
  _msForm = id ? Object.assign({}, list.find(x=>x.id===id)) : {
    kind: kind==='era' ? 'era' : 'point',
    date: new Date().toISOString().slice(0,10), dateTo:'',
    icon: kind==='era' ? '🎓' : '💼', label:'', note:''
  };
  renderDenik();
}
function msCancel(){ _msForm=null; renderDenik(); }
function msPick(icon,label){
  if(!_msForm) return;
  _msForm.icon=icon;
  const known = MS_PRESETS.concat(MS_ERAS);
  if(!_msForm.label || known.some(p=>p[1]===_msForm.label)) _msForm.label=label;
  renderDenik();
}
function msSave(){
  if(!_msForm) return;
  const date=(document.getElementById('msDate')||{}).value || _msForm.date;
  const label=((document.getElementById('msLabel')||{}).value||'').trim();
  const note=((document.getElementById('msNote')||{}).value||'').trim();
  if(!label){ if(typeof showToast==='function') showToast('Zadej název události'); return; }
  if(!date){ if(typeof showToast==='function') showToast('Zadej datum'); return; }
  const isEra = _msForm.kind==='era';
  const dateTo = isEra ? (((document.getElementById('msDateTo')||{}).value)||'') : '';
  if(isEra && dateTo && dateTo < date){ if(typeof showToast==='function') showToast('Konec etapy je před začátkem'); return; }
  S.milestones = S.milestones||[];
  if(_msForm.id){
    const it=S.milestones.find(x=>x.id===_msForm.id);
    if(it){ it.date=date; it.dateTo=dateTo; it.label=label.slice(0,120); it.note=note.slice(0,500); it.icon=_msForm.icon; it.kind=_msForm.kind||'point'; }
  } else {
    S.milestones.push({ id:'ms_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
      kind: isEra?'era':'point', date, dateTo,
      icon:_msForm.icon||'📌', label:label.slice(0,120), note:note.slice(0,500) });
  }
  _msForm=null;
  if(typeof save==='function') save();
  renderDenik();
}
function msDelete(id){
  const it=(S.milestones||[]).find(x=>x.id===id);
  if(!confirm(it && it.kind==='era' ? 'Opravdu smazat tuto etapu ze životní mapy?' : 'Opravdu smazat tuto událost ze životní mapy?')) return;
  // v9.50: automatický milník se NEMAŽE, jen skryje. Kdyby se odstranil,
  // msEnsureTrackStart() by ho při dalším načtení vytvořil znovu (příznak
  // v paměti se nesynchronizuje) a uživateli by se pořád vracel.
  if(it && it.auto){ it.hidden = 1; }
  else { S.milestones=(S.milestones||[]).filter(x=>x.id!==id); }
  if(typeof save==='function') save();
  renderDenik();
}
// v9.50 (5a): AUTOMATICKÝ MILNÍK „Začal jsem sledovat výdaje".
//  Vznikne sám u první transakce zadané V APLIKACI (ne importované z minulosti).
//  Smysl: dovolí srovnat NESLEDOVANÉ vs. SLEDOVANÉ období – tedy doložit přínos
//  aplikace tvými vlastními čísly, ne tvrzením. Uživatel ho může smazat i posunout.
//  Rozpoznání: `auto:'trackStart'`. Zakládá se jen jednou (i po smazání se nevrací).
function msEnsureTrackStart(){
  try{
    if(!Array.isArray(S.milestones)) S.milestones = [];
    if(S._msTrackInit) return;                       // už jsme to jednou řešili
    const txs = (S.transactions||[]).filter(t=>t && t.date);
    if(txs.length < 5) return;                       // pod 5 transakcemi je brzy
    S._msTrackInit = 1;
    if(S.milestones.some(m=>m.auto==='trackStart')) return;
    // datum = kdy byla appka poprvé použita; fallback na nejstarší transakci
    const created = txs.map(t=>t.createdAt||0).filter(Boolean);
    const d = created.length ? new Date(Math.min(...created))
                             : new Date(Math.min(...txs.map(t=>new Date(t.date).getTime()).filter(x=>!isNaN(x))));
    if(isNaN(d)) return;
    S.milestones.push({ id:'ms_track', auto:'trackStart', kind:'point',
      date: d.toISOString().slice(0,10), icon:'🎯',
      label:'Začal jsem sledovat výdaje',
      note:'Od tohoto dne máš data z aplikace. Starší období je tu z importů – porovnáním obojího uvidíš, co se změnilo.' });
    if(typeof save==='function') save();
  }catch(e){}
}

// Rozdělení výdajů podle etap / před a po začátku sledování
function msEraStats(){
  const out = [];
  const txs = (S.transactions||[]).filter(t=>t && t.date && typeof isTransferTx==='function' ? !isTransferTx(t) : true);
  const exp = txs.filter(t=>!t.splitParent && !t.isBalancing && (typeof _txKind!=='function' || true));
  const sum = (from,to)=>{
    let total=0, months={};
    exp.forEach(t=>{
      const ds = String(t.date).slice(0,10);
      if(from && ds < from) return;
      if(to && ds > to) return;
      const amt = (typeof txCZK==='function') ? txCZK(t, getData()) : (t.amount||0);
      if(amt >= 0) return;                      // jen výdaje
      total += Math.abs(amt);
      months[ds.slice(0,7)] = 1;
    });
    const n = Math.max(1, Object.keys(months).length);
    return { total, months:Object.keys(months).length, avg: total/n };
  };
  (S.milestones||[]).filter(m=>m.kind==='era' && !m.hidden).forEach(m=>{
    const r = sum(m.date, m.dateTo||null);
    if(r.months) out.push({ label:(m.icon||'')+' '+m.label, from:m.date, to:m.dateTo||'dosud', ...r });
  });
  return out;
}

// Události v daném měsíci – pro značky v grafu
function msInMonth(m,y){
  return (S.milestones||[]).filter(x=>{ if(x.hidden) return false; const d=new Date(x.date);
    return !isNaN(d) && d.getMonth()===m && d.getFullYear()===y; });
}

function renderDenik(){
  if(typeof msEnsureTrackStart==='function') msEnsureTrackStart();   // v9.50 (5a)
  const el=document.getElementById('denikContent'); if(!el) return;
  if(typeof isAdmin==='function' && !isAdmin()){ el.innerHTML='<div class="empty"><div class="et">📖 Deník je zatím dostupný jen pro administrátora.</div></div>'; return; }
  const D=getData();
  const m=S.curMonth, y=S.curYear;  // S16.14: jediný zdroj pravdy = globální přepínač měsíce
  const key=_denikKey(y,m);
  const snap=(S.diary||{})[key];
  const isCurM=(m===S.curMonth&&y===S.curYear);
  const today=new Date();
  const todayD=(today.getMonth()===m&&today.getFullYear()===y)?today.getDate():null;

  // Skutečnost (živě)
  const txs=getTx(m,y,D);
  const inc=Math.round(incSum(txs,D)), exp=Math.round(expSum(txs,D)), saldo=inc-exp;
  const days=new Date(y,m+1,0).getDate();
  const aE=Array(days).fill(0), aI=Array(days).fill(0);
  txs.forEach(t=>{ if(t.isBalancing||t.splitParent||isTransferTx(t))return; const di=new Date(t.date).getDate()-1; if(di<0||di>=days)return;
    if(t.type==='expense') aE[di]+=txCZK(t,D); else if(t.type==='income') aI[di]+=txCZK(t,D); });
  let sE=0,sI=0; const actExp=aE.map(v=>{sE+=v;return Math.round(sE);}); const actInc=aI.map(v=>{sI+=v;return Math.round(sI);});

  const dRow=(label,val,cls)=>`<div class="denik-row"><span class="dl">${label}</span><span class="dv ${cls||''}">${val}</span></div>`;
  const diffTag=(act,pr,lowerBetter)=>{
    if(pr===null||pr===undefined||!pr) return '';
    const d=Math.round((act-pr)/Math.abs(pr)*100);
    const good=lowerBetter?d<=0:d>=0;
    return ` <span style="font-size:.68rem;font-weight:700;color:${good?'#2e6b3f':'#8c2f2f'}">(${d>=0?'+':''}${d} %)</span>`;
  };

  // Levá stránka – predikce (snímek)
  const leftBody = snap ? `
    ${dRow('Zapsáno dne', new Date(snap.createdAt).toLocaleDateString('cs-CZ'))}
    ${dRow('Očekávaný příjem', fmtB(snap.predInc), 'denik-ink-inc')}
    ${dRow('Predikce výdajů', fmtB(snap.predExp), 'denik-ink-exp')}
    ${dRow('Známé budoucí platby', snap.predBud?fmtB(snap.predBud):'–', 'denik-ink-pred')}
    ${dRow('Očekávané saldo', `${snap.predInc-snap.predExp>=0?'+':''}${fmtB(snap.predInc-snap.predExp)}`, snap.predInc-snap.predExp>=0?'denik-ink-inc':'denik-ink-exp')}
    ${dRow('Dluh (k datu zápisu)', fmtB(snap.debtNow))}
    ${dRow('Hotovost (k datu zápisu)', fmtB(snap.wallets))}
    ${snap.scoreRaw!==null&&snap.scoreRaw!==undefined?dRow('Finanční skóre', `${snap.scoreRaw} / ${snap.scoreMax}`):''}
    ${snap.stressRaw!==null&&snap.stressRaw!==undefined?dRow('Dluhový stres', `${snap.stressRaw} / 100`):''}
    <div style="text-align:right;margin-top:10px"><button onclick="denikDeleteSnap('${key}')" style="background:none;border:1px solid rgba(140,47,47,.5);border-radius:7px;color:#8c2f2f;font-size:.68rem;padding:4px 9px;cursor:pointer;font-family:Georgia,serif">🗑 Vytrhnout list</button></div>
  ` : `
    <div style="font-size:.84rem;line-height:1.7;color:#5b4636;padding:6px 0 12px;font-style:italic">Tato stránka je zatím prázdná – predikce pro ${CZ_M[m].toLowerCase()} nebyla zapsána.${isCurM?'<br><br>Zapiš ji: snímek je neměnný záznam „co jsme čekali", zatímco skutečnost na protější straně se dopočítává živě z transakcí.':''}</div>
    ${isCurM?`<button class="denik-btn" onclick="denikSnapshot()">🖋 Zapsat predikci (${CZ_M[m]})</button>`:''}
  `;

  // Pravá stránka – skutečnost (živě)
  const rightBody = `
    ${dRow('Příjmy', fmtB(inc)+(snap?diffTag(inc,snap.predInc,false):''), 'denik-ink-inc')}
    ${dRow('Výdaje', fmtB(exp)+(snap?diffTag(exp,snap.predExp,true):''), 'denik-ink-exp')}
    ${dRow('Saldo', `${saldo>=0?'+':''}${fmtB(saldo)}`+(snap?diffTag(saldo,snap.predInc-snap.predExp,false):''), saldo>=0?'denik-ink-inc':'denik-ink-exp')}
    ${dRow('Zapsaných transakcí', txs.filter(t=>!t.splitParent).length)}
    ${todayD?dRow('Den v měsíci', `${todayD}. / ${days}`):''}
    ${snap&&todayD?dRow('Tempo výdajů vs predikce', (()=>{ const pi=Math.min(todayD,snap.predCurve.length)-1; const pv=snap.predCurve[pi]||0; const av=actExp[Math.min(todayD,days)-1]||0; if(!pv) return '–'; const d2=Math.round((av-pv)/pv*100); return `<span style="color:${d2<=0?'#2e6b3f':'#8c2f2f'}">${d2>=0?'+':''}${d2} %</span>`; })()):''}
    ${(()=>{ // S16.8 (Deník v2.1): živý stres index vs snímek
      const st=(typeof computeStressIndex==='function')?computeStressIndex(D):null;
      if(!st) return '';
      const d4=(snap&&snap.stressRaw!=null)?st.total-snap.stressRaw:null;
      return dRow('Dluhový stres (živě)', `${st.total} / 100`+(d4!==null?` <span style="font-size:.68rem;font-weight:700;color:${d4<=0?'#2e6b3f':'#8c2f2f'}">(${d4>=0?'+':''}${d4})</span>`:''), st.total<30?'denik-ink-inc':st.total<60?'':'denik-ink-exp');
    })()}
  `;

  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="font-size:.74rem;color:#a8aec8">📖 Kronika predikcí a skutečnosti · ukládá se do cloudu · zatím jen admin</div>
      <div style="font-size:.86rem;font-weight:700">${CZ_M[m]} ${y} <span style="font-weight:400;font-size:.7rem;color:#a8aec8">· listuj přepínačem měsíce nahoře</span></div>
    </div>
    <div class="denik-book">
      <div class="denik-spread">
        <div class="denik-page denik-page-l">
          <div class="denik-h">📜 Predikce · ${CZ_M[m]} ${y}</div>
          ${leftBody}
        </div>
        <div class="denik-page denik-page-r">
          <div class="denik-h">✒️ Skutečnost (živě)</div>
          ${rightBody}
        </div>
      </div>
      <div class="denik-sheet">
        <div class="denik-h" style="margin-bottom:6px">${window._denikChart==='daily'?'Denní nákupy (kolik jsem utratil každý den)':'Den po dni · příjem / výdej / predikce'}</div>
        <div style="display:flex;gap:6px;justify-content:center;margin-bottom:8px">
          <button onclick="denikSetChart('cumul')" style="padding:5px 12px;border-radius:7px;cursor:pointer;font-family:Georgia,serif;font-size:.76rem;font-weight:700;border:1px solid #8a6a3e;background:${window._denikChart!=='daily'?'linear-gradient(180deg,#7a5a30,#5e4423)':'transparent'};color:${window._denikChart!=='daily'?'#f3ead2':'#b09f82'}">📈 Kumulativně</button>
          <button onclick="denikSetChart('daily')" style="padding:5px 12px;border-radius:7px;cursor:pointer;font-family:Georgia,serif;font-size:.76rem;font-weight:700;border:1px solid #8a6a3e;background:${window._denikChart==='daily'?'linear-gradient(180deg,#7a5a30,#5e4423)':'transparent'};color:${window._denikChart==='daily'?'#f3ead2':'#b09f82'}">📊 Denní nákupy</button>
        </div>
        ${window._denikChart==='daily' ? _denikDailyChart(days, aE, todayD) : _denikDayChart(days, actExp, actInc, snap?snap.predCurve:null, todayD)}
        <div style="display:flex;gap:16px;justify-content:center;margin-top:6px;flex-wrap:wrap;font-size:.76rem;font-family:Georgia,serif">
          ${window._denikChart==='daily' ? `
            <span style="display:flex;align-items:center;gap:5px;color:#8c2f2f"><span style="width:12px;height:9px;background:#8c2f2f;display:inline-block;border-radius:2px"></span>Denní výdaj</span>
            <span style="display:flex;align-items:center;gap:5px;color:#6b4b8a"><span style="width:16px;height:0;border-top:2px dashed #6b4b8a;display:inline-block"></span>Průměr měsíce</span>
          ` : `
            <span style="display:flex;align-items:center;gap:5px;color:#2e6b3f"><span style="width:16px;height:2.5px;background:#2e6b3f;display:inline-block"></span>Příjem (kumul.)</span>
            <span style="display:flex;align-items:center;gap:5px;color:#8c2f2f"><span style="width:16px;height:2.5px;background:#8c2f2f;display:inline-block"></span>Výdaje (kumul.)</span>
            ${snap?'<span style="display:flex;align-items:center;gap:5px;color:#6b4b8a"><span style="width:16px;height:0;border-top:2px dashed #6b4b8a;display:inline-block"></span>Predikce výdajů</span>':'<span style="color:#7a6248;font-style:italic">Predikční křivka se objeví po zápisu snímku.</span>'}
          `}
        </div>
        ${(()=>{ // S16.8 (Deník v2.1): řádek cyklu od výplaty přímo na listu
          if(!todayD || typeof radarPaydayInfo!=='function') return '';
          try{
            const P=radarPaydayInfo(D); if(!P||!P.lastPayday) return '';
            const start=new Date(P.lastPayday); start.setHours(0,0,0,0);
            const now=new Date();
            const txs2=getTxByRange(start, now, D);
            const exp2=Math.round(expSum(txs2,D));
            const days2=Math.max(1,Math.round((now-start)/86400000)+1);
            const next=new Date(start); next.setDate(next.getDate()+(P.cycleDays||30));
            const toNext=Math.max(0,Math.round((next-now)/86400000));
            const weeks2=[];
            for(let w=0;w*7<days2;w++){
              const ws=new Date(start); ws.setDate(ws.getDate()+w*7);
              let we=new Date(ws); we.setDate(we.getDate()+6); if(we>now) we=new Date(now);
              const wtx=txs2.filter(t=>{const d3=new Date(t.date);d3.setHours(0,0,0,0);return d3>=ws&&d3<=we;});
              weeks2.push(Math.round(expSum(wtx,D)));
            }
            return `<div style="border-top:1px solid rgba(90,60,30,.35);margin-top:12px;padding-top:10px;font-size:.8rem;color:#5b4636;line-height:1.6">
              <strong>💶 Od výplaty k výplatě:</strong> ${start.getDate()}.${start.getMonth()+1}. – dnes (${days2}. den cyklu) ·
              výdaje <span class="denik-ink-exp" style="font-weight:700">${fmtB(exp2)}</span> ·
              týdny: ${weeks2.map(w=>fmt(w)).join(' / ')} ·
              do výplaty ~${toNext} dní</div>`;
          }catch(e){ return ''; }
        })()}
      </div>
    </div>
    ${_denikCestaHTML()}
    ${_zivotniMapaHTML(m,y)}`;
}

// ── Životní mapa: chronologická osa událostí + formulář ──
function _zivotniMapaHTML(m,y){
  const esc = t => String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const all=(S.milestones||[]).filter(x=>!x.hidden).slice().sort((a,b)=> new Date(b.date)-new Date(a.date));
  const f=_msForm;
  const BTN='padding:5px 12px;border-radius:7px;cursor:pointer;font-family:Georgia,serif;font-size:.76rem;font-weight:700;border:1px solid #8a6a3e';
  const INP='padding:6px 8px;border-radius:7px;border:1px solid #8a6a3e;background:rgba(255,255,255,.06);color:#f3ead2;font-family:Georgia,serif;font-size:.78rem';

  const form = !f ? '' : `
    <div style="background:rgba(255,255,255,.05);border:1px solid #8a6a3e;border-radius:10px;padding:12px;margin-bottom:12px">
      <div class="denik-h" style="margin-bottom:8px;color:#f3ead2">${f.id?(f.kind==='era'?'Upravit etapu':'Upravit událost'):(f.kind==='era'?'Nová etapa':'Nová událost')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:9px">
        ${(f.kind==='era'?MS_ERAS:MS_PRESETS).map(([ic,lb])=>`<button onclick="msPick('${ic}','${lb.replace(/'/g,"\\'")}')" style="padding:4px 9px;border-radius:7px;cursor:pointer;font-family:Georgia,serif;font-size:.7rem;border:1px solid #8a6a3e;background:${f.icon===ic?'linear-gradient(180deg,#7a5a30,#5e4423)':'transparent'};color:${f.icon===ic?'#f3ead2':'#c9b48a'}">${ic} ${lb}</button>`).join('')}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:7px">
        <input id="msDate" type="date" value="${esc(f.date)}" title="${f.kind==='era'?'Začátek etapy':'Datum'}" style="flex:0 0 148px;${INP}">
        ${f.kind==='era'?`<input id="msDateTo" type="date" value="${esc(f.dateTo)}" title="Konec etapy (prázdné = dosud)" style="flex:0 0 148px;${INP}">`:''}
        <input id="msLabel" type="text" maxlength="120" placeholder="${f.kind==='era'?'Název etapy':'Název události'}" value="${esc(f.label)}" style="flex:1 1 180px;${INP}">
      </div>
      <textarea id="msNote" maxlength="500" rows="2" placeholder="Poznámka (nepovinné) – co to pro tvoje finance znamenalo" style="width:100%;resize:vertical;${INP}">${esc(f.note)}</textarea>
      <div style="display:flex;gap:7px;margin-top:8px">
        <button onclick="msSave()" style="${BTN};background:linear-gradient(180deg,#7a5a30,#5e4423);color:#f3ead2">Uložit</button>
        <button onclick="msCancel()" style="${BTN};font-weight:400;background:transparent;color:#c9b48a">Zrušit</button>
      </div>
    </div>`;

  // Prázdný stav VYSVĚTLÍ, k čemu to je – nemlčí (SKILL 22)
  const body = all.length ? `
    <div style="position:relative;padding-left:20px">
      <div style="position:absolute;left:5px;top:6px;bottom:6px;width:2px;background:rgba(138,106,62,.45)"></div>
      ${all.map(x=>{
        const d=new Date(x.date); const inThis=(d.getMonth()===m&&d.getFullYear()===y);
        return `<div style="position:relative;margin-bottom:11px">
          <div style="position:absolute;left:-19px;top:4px;width:12px;height:12px;border-radius:50%;background:${inThis?'#7a5a30':'#5e4423'};border:2px solid ${inThis?'#d9c49a':'#8a6a3e'}"></div>
          <div style="display:flex;align-items:baseline;gap:7px;flex-wrap:wrap">
            <span style="font-size:.95rem">${esc(x.icon)||'\u{1F4CC}'}</span>
            <span class="denik-h" style="font-size:.84rem;color:#f3ead2">${esc(x.label)}</span>
            <span style="font-size:.7rem;color:#c0ac86">${isNaN(d)?'':d.toLocaleDateString('cs-CZ')}${x.kind==='era'?(' – '+(x.dateTo?new Date(x.dateTo).toLocaleDateString('cs-CZ'):'dosud')):''}</span>
            ${x.kind==='era'?'<span style="font-size:.62rem;padding:1px 6px;border-radius:99px;border:1px solid #b08d52;color:#d9c49a">etapa</span>':''}
            ${x.auto==='trackStart'?'<span style="font-size:.62rem;padding:1px 6px;border-radius:99px;background:rgba(122,90,48,.35);color:#d9c49a">automaticky</span>':''}
            <button onclick="msOpen('${x.id}')" style="margin-left:auto;background:none;border:0;cursor:pointer;color:#8a6a3e;font-size:.72rem;font-family:Georgia,serif">upravit</button>
            <button onclick="msDelete('${x.id}')" style="background:none;border:0;cursor:pointer;color:#8c2f2f;font-size:.72rem;font-family:Georgia,serif">smazat</button>
          </div>
          ${x.note?`<div style="font-size:.74rem;color:#b09f82;line-height:1.5;margin-top:2px">${esc(x.note)}</div>`:''}
        </div>`;
      }).join('')}
    </div>` : `
    <div style="font-size:.78rem;color:#b09f82;line-height:1.6">
      Zatím sis nezaznamenal žádnou událost. Označ zlomy jako změna práce, hypotéka nebo narození dítěte &mdash;
      až se budeš dívat na dlouhodobý vývoj, uvidíš, <b>proč</b> se čísla v daném období změnila.
      <br><span style="font-size:.72rem">Události slouží jen jako kontext. Nijak neovlivňují tvoje skóre.</span>
    </div>`;

  // v9.50 (5b): srovnání etap – teprve tady dávají etapy smysl
  const eras = (typeof msEraStats==='function') ? msEraStats() : [];
  const eraCmp = eras.length < 2 ? '' : `
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(138,106,62,.4)">
      <div class="denik-h" style="font-size:.86rem;margin-bottom:7px">Srovnání etap · průměrné měsíční výdaje</div>
      ${(()=>{ const mx=Math.max(...eras.map(e=>e.avg));
        return eras.map(e=>`
          <div style="margin-bottom:7px">
            <div style="display:flex;justify-content:space-between;gap:8px;font-size:.76rem">
              <span>${esc(e.label)} <span style="color:#c0ac86;font-size:.68rem">${esc(e.from)} – ${esc(e.to)} · ${e.months} měs.</span></span>
              <b>${typeof fmt==='function'?fmt(Math.round(e.avg)):Math.round(e.avg)}/měs</b>
            </div>
            <div style="height:6px;border-radius:99px;background:rgba(138,106,62,.25);margin-top:3px">
              <div style="height:100%;width:${mx>0?Math.round(e.avg/mx*100):0}%;border-radius:99px;background:linear-gradient(90deg,#7a5a30,#b08d52)"></div>
            </div>
          </div>`).join(''); })()}
      <div style="font-size:.7rem;color:#b09f82;margin-top:4px">Počítáno jen z měsíců, ve kterých máš data. Etapy nijak neovlivňují tvoje skóre.</div>
    </div>`;

  return `
    <div class="denik-book" style="margin-top:14px">
      <div style="padding:16px 18px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap">
          <div class="denik-h" style="font-size:.95rem;color:#f3ead2">\u{1F5FA}\uFE0F Životní mapa</div>
          ${f?'':`<span style="display:flex;gap:6px">
            <button onclick="msOpen()" style="${BTN};background:linear-gradient(180deg,#7a5a30,#5e4423);color:#f3ead2">+ Událost</button>
            <button onclick="msOpen(null,'era')" style="${BTN};background:rgba(176,141,82,.15);color:#e8d9b5">+ Etapa</button>
          </span>`}
        </div>
        ${form}
        ${body}
        ${eraCmp}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  v9.50 (bod 4): PROUŽEK „KDE JSI NA CESTĚ" v Deníku
//  Deník je místo, kam chodíš často – proto sem patří připomínka směru,
//  ne celá analýza. Detail zůstává ve Finančním obrazu.
//  ⚠️ Čte z computeObrazSubmetrics() (v9.44), NEPOČÍTÁ podruhé (SKILL 17).
// ══════════════════════════════════════════════════════
function _denikCestaHTML(){
  try{
    if(typeof computeObrazSubmetrics!=='function') return '';
    const D = getData();
    const months = 6, series = [];
    for(let i=months-1;i>=0;i--){
      const dt = new Date(S.curYear, S.curMonth - i, 1);
      const m = dt.getMonth(), y = dt.getFullYear();
      let inc=0, exp=0;
      (D.transactions||[]).forEach(t=>{
        if(!t || !t.date || t.splitParent || t.isBalancing) return;
        if(typeof isTransferTx==='function' && isTransferTx(t)) return;
        const d = new Date(t.date); if(d.getMonth()!==m || d.getFullYear()!==y) return;
        const a = (typeof txCZK==='function') ? txCZK(t,D) : (t.amount||0);
        if(a>0) inc+=a; else exp+=Math.abs(a);
      });
      series.push({inc, exp, savings:inc-exp, debt:0});
    }
    if(series.every(x=>!x.inc && !x.exp)) return '';
    const sm = computeObrazSubmetrics(series);
    const er = sm.expRatioNow, erB = sm.expRatioBase;
    if(er===null) return '';
    const dir = (erB!==null && Math.abs(er-erB)>=.005) ? (er<erB?'lepší':'horší') : 'stejné';
    const col = dir==='lepší' ? '#8fd694' : dir==='horší' ? '#e39a9a' : '#c9b48a';
    return `
      <div class="denik-book" style="margin-top:14px">
        <div style="padding:13px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div>
            <div style="font-size:.68rem;color:#c9b48a;text-transform:uppercase;letter-spacing:.08em">Kde jsi na cestě</div>
            <div class="denik-h" style="font-size:1.05rem;margin-top:2px;color:#f3ead2">Životní styl spotřebuje <b style="color:${col}">${Math.round(er*100)} %</b> příjmu</div>
            <div style="font-size:.74rem;color:#b09f82;margin-top:2px">
              ${erB!==null?`Před půl rokem ${Math.round(erB*100)} % · ${dir==='stejné'?'beze změny':'je to '+dir}`:'Na srovnání zatím nemám dost historie.'}
            </div>
          </div>
          <a href="#" onclick="if(typeof showPage==='function')showPage('obraz');return false"
             style="margin-left:auto;font-family:Georgia,serif;font-size:.76rem;color:#e8d9b5;text-decoration:none;border:1px solid #b08d52;background:rgba(176,141,82,.18);border-radius:7px;padding:5px 11px">Finanční obraz →</a>
        </div>
      </div>`;
  }catch(e){ return ''; }
}
