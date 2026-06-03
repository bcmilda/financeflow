//  STATISTIKY
// ══════════════════════════════════════════════════════
function renderStats(){
  const D=getData();
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  const total=expCats.reduce((a,c)=>a+getActual(c.id,null,S.curMonth,S.curYear,D),0);
  let pm=S.curMonth-1,py=S.curYear;if(pm<0){pm=11;py--;}
  const prev=expCats.reduce((a,c)=>a+getActual(c.id,null,pm,py,D),0);
  // Category breakdown
  const catEl=document.getElementById('statCats');
  if(catEl){
    const items=expCats.map(c=>({name:c.name,icon:c.icon,color:c.color,val:getActual(c.id,null,S.curMonth,S.curYear,D)})).filter(d=>d.val>0).sort((a,b)=>b.val-a.val);
    catEl.innerHTML=items.map(d=>`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:3px"><span>${d.icon} ${d.name}</span><strong>${fmt(d.val)}</strong></div><div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${total?Math.round(d.val/total*100):0}%;background:${d.color};border-radius:3px"></div></div></div>`).join('')||'<div class="empty"><div class="et">Žádné výdaje</div></div>';
  }
  // Insights
  const iEl=document.getElementById('statInsights');
  if(iEl){
    const diff=prev>0?Math.round((total-prev)/prev*100):null;
    let html='';
    if(diff!==null)html+=`<div class="insight-item ${diff>5?'bad':diff<-5?'good':'warn'}"><div class="insight-icon">${diff>5?'📈':diff<-5?'📉':'↔️'}</div><div class="insight-text">Výdaje ${diff>0?'vzrostly o':'klesly o'} <strong>${Math.abs(diff)}%</strong> oproti ${CZ_M[pm]}</div></div>`;
    const bank=computeBank(D);
    if(bank>0)html+=`<div class="insight-item good"><div class="insight-icon">🏦</div><div class="insight-text">Celkové úspory: <strong>${fmt(bank)}</strong></div></div>`;
    const debts=(D.debts||[]).reduce((a,d)=>a+d.remaining,0);
    if(debts>0)html+=`<div class="insight-item warn"><div class="insight-icon">💰</div><div class="insight-text">Celkový dluh: <strong>${fmt(debts)}</strong></div></div>`;
    iEl.innerHTML=html||'<div class="empty"><div class="et">Přidej transakce</div></div>';
  }
  // Trend chart
  const tc=document.getElementById('trendCanvas');
  if(tc){const labels=[],saldos=[];for(let i=11;i>=0;i--){let m=S.curMonth-i,y=S.curYear;if(m<0){m+=12;y--;}const txs=getTx(m,y,D);saldos.push(incSum(txs)-expSum(txs));labels.push(CZ_M[m].slice(0,3));}drawSaldoBars('trendCanvas',labels,saldos);}
}

// ══════════════════════════════════════════════════════
//  KATEGORIE
// ══════════════════════════════════════════════════════
// Expand stav podkategorií – drží která cat ID jsou rozbalena
const _catExpanded = {};

// Importuje chybějící výchozí kategorie do Firebase (přidá jen ty co uživatel nemá)
// + doplní chybějící podkategorie u kategorií které uživatel již má
function importDefaultCategories(){
  if(viewingUid) return;
  if(typeof DEFAULT_CATEGORIES === 'undefined'){
    alert('DEFAULT_CATEGORIES není definováno – zkontroluj načtení app.js');
    return;
  }
  const existing = S.categories || [];
  const existingIds = new Set(existing.map(c=>c.id));

  // 1. Přidej zcela nové kategorie (co uživatel vůbec nemá)
  const toAdd = DEFAULT_CATEGORIES.filter(c => !existingIds.has(c.id));

  // 2. Doplň chybějící podkategorie u existujících kategorií (merge, ne přepis)
  let subsMergedCount = 0;
  existing.forEach(cat => {
    const def = DEFAULT_CATEGORIES.find(d => d.id === cat.id);
    if(!def || !def.subs) return;
    const existingSubs = new Set(cat.subs || []);
    const newSubs = def.subs.filter(s => !existingSubs.has(s));
    if(newSubs.length){
      cat.subs = [...(cat.subs||[]), ...newSubs];
      subsMergedCount += newSubs.length;
    }
  });

  if(!toAdd.length && subsMergedCount === 0){
    alert('✅ Vše je aktuální – žádné nové kategorie ani podkategorie k přidání.');
    return;
  }

  S.categories = [...existing, ...toAdd.map(c=>({...c}))];
  save();
  renderCatPage();

  const parts = [];
  if(toAdd.length) parts.push(`${toAdd.length} kategorií`);
  if(subsMergedCount) parts.push(`${subsMergedCount} podkategorií`);
  const btn = document.getElementById('importCatsBtn');
  if(btn){ btn.textContent = `✅ Přidáno: ${parts.join(' + ')}`; btn.disabled = true; }
}

function renderCatPage(){
  const D=getData();const ro=viewingUid!==null;
  const el=document.getElementById('catList');if(!el)return;
  const cats=D.categories||[];

  // Zjisti kolik výchozích kategorií a podkategorií chybí
  const existingIds=new Set(cats.map(c=>c.id));
  let missingCatCount=0, missingSubCount=0;
  if(typeof DEFAULT_CATEGORIES!=='undefined'){
    DEFAULT_CATEGORIES.forEach(def=>{
      if(!existingIds.has(def.id)){ missingCatCount++; return; }
      // Existující kat – zkontroluj chybějící podkategorie
      const userCat=cats.find(c=>c.id===def.id);
      const userSubs=new Set(userCat?.subs||[]);
      (def.subs||[]).forEach(s=>{ if(!userSubs.has(s)) missingSubCount++; });
    });
  }
  const hasAnythingToImport = missingCatCount>0 || missingSubCount>0;

  // Banner pro import chybějících kategorií/podkategorií
  const bannerParts=[];
  if(missingCatCount) bannerParts.push(`<strong>${missingCatCount}</strong> kategorií`);
  if(missingSubCount) bannerParts.push(`<strong>${missingSubCount}</strong> podkategorií`);
  const importBanner = hasAnythingToImport && !ro
    ? `<div style="padding:10px 12px;margin-bottom:10px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span style="font-size:.8rem;color:var(--text2)">💡 Chybí ti ${bannerParts.join(' a ')} z výchozí sady</span>
        <button id="importCatsBtn" class="btn btn-accent btn-sm" onclick="importDefaultCategories()">+ Doplnit</button>
       </div>` : '';

  if(!cats.length){
    el.innerHTML = importBanner + '<div class="empty"><div class="et">Žádné kategorie</div></div>';
    return;
  }

  // Rozdělení dle typu pro header skupiny
  const expCats=cats.filter(c=>c.type==='expense');
  const incCats=cats.filter(c=>c.type==='income');
  const bothCats=cats.filter(c=>c.type==='both');

  const renderGroup=(groupCats, groupLabel)=>{
    if(!groupCats.length) return '';
    return `<div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;padding:10px 2px 4px">${groupLabel}</div>
    ${groupCats.map((c)=>{
      const isIncome=c.type==='income'||c.type==='both';
      const isExpense=c.type==='expense'||c.type==='both';
      const isStable=c.stable===true;
      const hasSubs=(c.subs||[]).length>0;
      const expanded=!!_catExpanded[c.id];
      const globalIdx=cats.indexOf(c);
      const isFirst=globalIdx===0;
      const isLast=globalIdx===cats.length-1;
      // Charakter badge
      const charLabel = isIncome&&c.incomeChar ? (INCOME_CHAR_LABELS[c.incomeChar]||'')
                      : isExpense&&c.expenseChar&&c.expenseChar!=='none' ? (EXPENSE_CHAR_LABELS[c.expenseChar]||'') : '';
      return `<div class="cat-item" style="flex-direction:column;align-items:stretch;padding:0">
        <div style="display:flex;align-items:center;gap:8px;padding:10px">
          <div class="cat-icon-big" style="background:${hexA(c.color,.15)};flex-shrink:0">${c.icon}</div>
          <div class="cat-info" style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
              <span class="cat-name" style="font-weight:600">${c.name}</span>
              <span style="font-size:.63rem;color:var(--text3);background:var(--surface3);padding:2px 6px;border-radius:10px">${c.type==='income'?'příjem':c.type==='both'?'příjem/výdaj':'výdaj'}</span>
              ${charLabel?`<span style="font-size:.63rem;color:var(--text2);background:var(--surface3);padding:2px 6px;border-radius:10px">${charLabel}</span>`:''}
              ${isIncome&&isStable?`<span style="font-size:.63rem;color:var(--income);background:rgba(74,222,128,.12);padding:2px 6px;border-radius:10px">✅ stabilní</span>`:''}
            </div>
            ${hasSubs?`<div style="margin-top:3px">
              <button onclick="toggleCatExpand('${c.id}')" style="background:none;border:none;padding:0;cursor:pointer;font-size:.72rem;color:var(--text3);display:flex;align-items:center;gap:3px">
                <span style="transition:transform .2s;display:inline-block;transform:rotate(${expanded?'90deg':'0deg'})">▶</span>
                ${expanded?'Skrýt':'Zobrazit'} podkategorie (${(c.subs||[]).length})
              </button>
            </div>`:`<div style="font-size:.72rem;color:var(--text3);margin-top:2px">bez podkategorií</div>`}
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">
            ${!ro?`<button class="btn btn-ghost btn-icon btn-sm" title="Posunout nahoru" onclick="moveCatUp('${c.id}')" style="font-size:.7rem;padding:2px 5px;opacity:${isFirst?.3:1}" ${isFirst?'disabled':''}>▲</button>
            <button class="btn btn-ghost btn-icon btn-sm" title="Posunout dolů" onclick="moveCatDown('${c.id}')" style="font-size:.7rem;padding:2px 5px;opacity:${isLast?.3:1}" ${isLast?'disabled':''}>▼</button>`:''}
          </div>
          ${!ro?`<div style="display:flex;gap:4px;flex-shrink:0">
            ${isIncome?`<button class="btn btn-ghost btn-icon btn-sm" title="${isStable?'Označit jako nestabilní':'Označit jako stabilní'}" onclick="toggleCatStable('${c.id}')" style="font-size:.85rem">${isStable?'✅':'⚪'}</button>`:''}
            <button class="btn btn-edit btn-icon btn-sm" onclick="editCat('${c.id}')">✎</button>
            <button class="btn btn-danger btn-icon btn-sm" onclick="deleteCat('${c.id}')">✕</button>
          </div>`:''}
        </div>
        ${hasSubs&&expanded?`<div style="border-top:1px solid var(--border);padding:8px 14px 10px 46px;background:var(--surface2)">
          <div style="font-size:.68rem;color:var(--text3);margin-bottom:6px;font-weight:600;text-transform:uppercase">Podkategorie</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${(c.subs||[]).map(s=>`<span style="font-size:.75rem;padding:3px 9px;background:${hexA(c.color,.12)};border:1px solid ${hexA(c.color,.3)};border-radius:12px;color:var(--text2)">${s}</span>`).join('')}
          </div>
        </div>`:''}
      </div>`;
    }).join('')}`;
  };

  el.innerHTML = importBanner +
    renderGroup(incCats,  '💰 Příjmy') +
    renderGroup(expCats,  '💸 Výdaje') +
    renderGroup(bothCats, '↔️ Příjem i výdaj');
}

function toggleCatExpand(id){
  _catExpanded[id]=!_catExpanded[id];
  renderCatPage();
}

function moveCatUp(id){
  const cats=S.categories||[];
  const i=cats.findIndex(c=>c.id===id);
  if(i<=0) return;
  [cats[i-1],cats[i]]=[cats[i],cats[i-1]];
  save();renderCatPage();
}

function moveCatDown(id){
  const cats=S.categories||[];
  const i=cats.findIndex(c=>c.id===id);
  if(i<0||i>=cats.length-1) return;
  [cats[i],cats[i+1]]=[cats[i+1],cats[i]];
  save();renderCatPage();
}

// ── EMOJI PICKER ──
const CAT_EMOJIS = ['🛒','🚗','🏠','💊','🎬','🎁','💰','💵','🐷','📈',
  '🚙','🏦','💸','🏛️','🤝','👶','🧹','🏖️','💻','🍽️','📦','✈️','🛍️',
  '👕','🔧','🍺','🛡️','📮','📚','📺','🏢','🤲','🔨','⚙️','💳','📱',
  '📊','🏨','🏧','😰','💪','📄','🚬','🐾','🌱','👷','🎯','🔑','🌍'];

function toggleEmojiPicker(){
  const drop=document.getElementById('emojiPickerDrop');
  if(!drop) return;
  const isOpen = drop.style.display==='block';
  if(isOpen){ drop.style.display='none'; return; }
  // Build grid once
  const grid=document.getElementById('emojiGrid');
  if(!grid.children.length){
    CAT_EMOJIS.forEach(e=>{
      const btn=document.createElement('button');
      btn.textContent=e;
      btn.style.cssText='background:none;border:none;font-size:1.25rem;cursor:pointer;padding:3px;border-radius:6px;transition:background .1s';
      btn.onmouseenter=()=>btn.style.background='var(--surface3)';
      btn.onmouseleave=()=>btn.style.background='none';
      btn.onclick=()=>{ document.getElementById('catIcon').value=e; drop.style.display='none'; };
      grid.appendChild(btn);
    });
  }
  drop.style.display='block';
  // Zavři při kliku mimo
  setTimeout(()=>{
    const close=(e)=>{ if(!drop.contains(e.target)&&e.target.id!=='catIcon'){ drop.style.display='none'; document.removeEventListener('mousedown',close); } };
    document.addEventListener('mousedown',close);
  },10);
}
function previewEmoji(val){ if(val) document.getElementById('catIcon').value=val; }
function confirmCustomEmoji(){
  const v=document.getElementById('emojiCustom').value.trim();
  if(v){ document.getElementById('catIcon').value=v; document.getElementById('emojiPickerDrop').style.display='none'; document.getElementById('emojiCustom').value=''; }
}

// ── TAGOVÝ EDITOR PODKATEGORIÍ ──
let _catSubsList = []; // pracovní pole tagů

function catSubRender(){
  const wrap=document.getElementById('catSubTags'); if(!wrap) return;
  wrap.innerHTML=_catSubsList.map((s,i)=>`
    <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px 3px 10px;background:var(--surface3);border:1px solid var(--border);border-radius:12px;font-size:.78rem;color:var(--text)">
      ${s}<button onclick="catSubRemove(${i})" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:.75rem;padding:0;line-height:1;margin-left:1px" title="Odebrat">✕</button>
    </span>`).join('');
}
function catSubAdd(){
  const inp=document.getElementById('catSubInput'); if(!inp) return;
  const val=inp.value.trim(); if(!val) return;
  // Podpora více položek najednou oddělených čárkou
  val.split(',').map(s=>s.trim()).filter(Boolean).forEach(s=>{ if(!_catSubsList.includes(s)) _catSubsList.push(s); });
  inp.value=''; catSubRender();
}
function catSubRemove(i){ _catSubsList.splice(i,1); catSubRender(); }
function catSubInputKey(e){ if(e.key==='Enter'||e.key===','){ e.preventDefault(); catSubAdd(); } }

// ── VIDITELNOST POLÍ DLE TYPU ──
function catTypeChanged(){
  const type=document.getElementById('catType')?.value||'expense';
  const incRow=document.getElementById('catIncomeCharRow');
  const expRow=document.getElementById('catExpenseCharRow');
  if(incRow) incRow.style.display=(type==='income')?'block':'none';
  if(expRow) expRow.style.display=(type==='expense'||type==='both')?'block':'none';
}

// ── CHARAKTER – popisky ──
const INCOME_CHAR_LABELS = {regular:'🔄 Pravidelný', irregular:'📊 Nepravidelný', onetime:'1️⃣ Jednorázový', passive:'🌱 Pasivní'};
const EXPENSE_CHAR_LABELS = {regular:'🔄 Pravidelný', variable:'📊 Variabilní', irregular:'🎲 Nepravidelný', onetime:'1️⃣ Jednorázový', none:'⬜ Neurčeno'};

function openCatModal(){
  if(viewingUid)return;
  document.getElementById('editCatId').value='';
  document.getElementById('catName').value='';
  document.getElementById('catIcon').value='📋';
  document.getElementById('catColor').value='#4ade80';
  document.getElementById('catType').value='expense';
  document.getElementById('catHealthPct').value='';
  document.getElementById('catHealthAmt').value='';
  document.getElementById('catIsSaving').checked=false;
  const ic=document.getElementById('catIncomeChar'); if(ic) ic.value='';
  const ec=document.getElementById('catExpenseChar'); if(ec) ec.value='';
  _catSubsList=[];
  catSubRender();
  catTypeChanged();
  document.getElementById('catModalTitle').textContent='Přidat kategorii';
  document.getElementById('modalCat').classList.add('open');
}

function editCat(id){
  if(viewingUid)return;
  const c=S.categories.find(x=>x.id===id);if(!c)return;
  document.getElementById('editCatId').value=id;
  document.getElementById('catName').value=c.name;
  document.getElementById('catIcon').value=c.icon;
  document.getElementById('catColor').value=c.color;
  document.getElementById('catType').value=c.type;
  document.getElementById('catHealthPct').value=c.healthPct||'';
  document.getElementById('catHealthAmt').value=c.healthAmt||'';
  document.getElementById('catIsSaving').checked=!!c.isSaving;
  const ic=document.getElementById('catIncomeChar'); if(ic) ic.value=c.incomeChar||'';
  const ec=document.getElementById('catExpenseChar'); if(ec) ec.value=c.expenseChar||'';
  _catSubsList=[...(c.subs||[])];
  catSubRender();
  catTypeChanged();
  document.getElementById('catModalTitle').textContent='Upravit kategorii';
  document.getElementById('modalCat').classList.add('open');
}

function saveCat(){
  if(viewingUid)return;
  const eid=document.getElementById('editCatId').value;
  const name=document.getElementById('catName').value.trim();
  const icon=document.getElementById('catIcon').value.trim()||'📋';
  const color=document.getElementById('catColor').value;
  const type=document.getElementById('catType').value;
  const healthPct=parseFloat(document.getElementById('catHealthPct').value)||null;
  const healthAmt=parseFloat(document.getElementById('catHealthAmt').value)||null;
  const isSaving=document.getElementById('catIsSaving').checked;
  const incomeChar=document.getElementById('catIncomeChar')?.value||'';
  const expenseChar=document.getElementById('catExpenseChar')?.value||'';
  if(!name){alert('Zadej název');return;}
  const obj={name,icon,color,type,subs:[..._catSubsList],healthPct,healthAmt,isSaving,incomeChar,expenseChar};
  if(eid){const c=S.categories.find(x=>x.id===eid);if(c)Object.assign(c,obj);}
  else S.categories.push({id:uid(),...obj});
  save();closeModal('modalCat');renderPage();
}

function deleteCat(id){if(viewingUid)return;if(!confirm('Smazat kategorii?'))return;S.categories=S.categories.filter(c=>c.id!==id);save();renderPage();}


// ══════════════════════════════════════════════════════
//  RODINNÝ SOUHRN
// ══════════════════════════════════════════════════════
function renderFamilySummary(){
  document.getElementById('familyMonthLabel').textContent=`${CZ_M[S.curMonth]} ${S.curYear}`;
  const el=document.getElementById('familyContent');if(!el)return;
  
  const me=window._currentUser;
  const myName=window._userProfile?.displayName||me?.displayName||'Já';
  const partners=Object.entries(partnerData);
  
  if(!partners.length){
    el.innerHTML=`<div class="insight-item info"><div class="insight-icon">🔗</div><div class="insight-text">Zatím nemáš žádné sdílené partnery. Jdi do sekce <strong>Sdílení & Partneři</strong> a přidej svou manželku.</div></div>`;
    return;
  }
  
  // All members data
  const members=[{name:myName,photo:window._userProfile?.photoURL||me?.photoURL,data:S},{...partners.map(([uid,p])=>({name:p.profile?.displayName||'Partner',photo:p.profile?.photoURL,data:p.data}))[0]}];
  
  // Family totals
  let familyInc=0,familyExp=0,familyDebt=0,familyBank=0;
  members.forEach(m=>{
    const D=Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[]},m.data);
    const txs=getTx(S.curMonth,S.curYear,D);
    familyInc+=incSum(txs);familyExp+=expSum(txs);
    familyDebt+=(D.debts||[]).reduce((a,d)=>a+d.remaining,0);
    familyBank+=computeBank(D);
  });
  
  let html=`<div class="family-grid">
    <div class="family-stat"><div class="family-stat-label">Rodinné příjmy</div><div class="family-stat-val" style="color:var(--income)">${fmt(familyInc)}</div></div>
    <div class="family-stat"><div class="family-stat-label">Rodinné výdaje</div><div class="family-stat-val" style="color:var(--expense)">${fmt(familyExp)}</div></div>
    <div class="family-stat"><div class="family-stat-label">Rodinné saldo</div><div class="family-stat-val" style="color:${familyInc-familyExp>=0?'var(--income)':'var(--expense)'}">${fmt(familyInc-familyExp)}</div></div>
    <div class="family-stat"><div class="family-stat-label">Celkový dluh</div><div class="family-stat-val" style="color:var(--debt)">${fmt(familyDebt)}</div></div>
  </div>
  <div class="grid2">`;
  
  members.forEach(m=>{
    const D=Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[]},m.data);
    const txs=getTx(S.curMonth,S.curYear,D);
    const inc=incSum(txs),exp=expSum(txs),bank=computeBank(D);
    const debts=(D.debts||[]).reduce((a,d)=>a+d.remaining,0);
    const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
    const topCats=expCats.map(c=>({name:c.name,icon:c.icon,val:getActual(c.id,null,S.curMonth,S.curYear,D)})).filter(d=>d.val>0).sort((a,b)=>b.val-a.val).slice(0,4);
    html+=`<div class="family-member-col">
      <div class="family-member-head">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--surface3);display:flex;align-items:center;justify-content:center;font-size:.8rem;overflow:hidden">${m.photo?`<img src="${m.photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`:'👤'}</div>
        ${m.name}
      </div>
      <div class="family-member-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          <div style="background:var(--income-bg);border-radius:9px;padding:9px;border:1px solid rgba(74,222,128,.15)"><div style="font-size:.62rem;color:var(--text3);margin-bottom:2px">PŘÍJMY</div><div style="font-family:Syne,sans-serif;font-weight:700;color:var(--income);font-size:.9rem">${fmt(inc)}</div></div>
          <div style="background:var(--expense-bg);border-radius:9px;padding:9px;border:1px solid rgba(248,113,113,.15)"><div style="font-size:.62rem;color:var(--text3);margin-bottom:2px">VÝDAJE</div><div style="font-family:Syne,sans-serif;font-weight:700;color:var(--expense);font-size:.9rem">${fmt(exp)}</div></div>
          <div style="background:var(--bank-bg);border-radius:9px;padding:9px;border:1px solid rgba(96,165,250,.15)"><div style="font-size:.62rem;color:var(--text3);margin-bottom:2px">ÚSPORY</div><div style="font-family:Syne,sans-serif;font-weight:700;color:var(--bank);font-size:.9rem">${fmt(bank)}</div></div>
          <div style="background:var(--debt-bg);border-radius:9px;padding:9px;border:1px solid rgba(251,191,36,.15)"><div style="font-size:.62rem;color:var(--text3);margin-bottom:2px">DLUHY</div><div style="font-family:Syne,sans-serif;font-weight:700;color:var(--debt);font-size:.9rem">${fmt(debts)}</div></div>
        </div>
        ${topCats.length?`<div style="font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:6px">Top výdaje</div>${topCats.map(c=>`<div style="display:flex;justify-content:space-between;font-size:.8rem;padding:4px 0;border-bottom:1px solid var(--border)"><span>${c.icon} ${c.name}</span><strong>${fmt(c.val)}</strong></div>`).join('')}`:''}
      </div>
    </div>`;
  });
  
  html+=`</div>`;
  el.innerHTML=html;
}

// ══════════════════════════════════════════════════════
//  SDÍLENÍ
// ══════════════════════════════════════════════════════
function renderSdileni(){
  const me=window._currentUser;if(!me)return;
  const myUid=me.uid;
  const sharingEl=document.getElementById('sharingContent');
  const partnersEl=document.getElementById('partnersContent');
  const shareSettings = S.shareSettings || {
    transactions:true, debts:true, categories:true,
    bank:true, projects:true, wishes:false, birthdays:false,
    wallets:true, receipts:false
  };

  if(sharingEl){
    const sections = [
      {key:'transactions', label:'💳 Transakce', desc:'Příjmy a výdaje'},
      {key:'debts', label:'💰 Půjčky', desc:'Dluhy a splátky'},
      {key:'bank', label:'🏦 Zůstatek', desc:'Celkový bankovní zůstatek'},
      {key:'wallets', label:'👛 Peněženky', desc:'Stavy peněženek'},
      {key:'categories', label:'🏷️ Kategorie', desc:'Kategorie výdajů'},
      {key:'projects', label:'📁 Projekty', desc:'Projekty a jejich náklady'},
      {key:'wishes', label:'🎁 Přání', desc:'Seznam přání'},
      {key:'birthdays', label:'🎂 Narozeniny', desc:'Narozeniny a dárky'},
      {key:'receipts', label:'📸 Účtenky', desc:'Naskenované účtenky'},
    ];

    sharingEl.innerHTML=`
      <div style="margin-bottom:14px">
        <div style="font-size:.82rem;color:var(--text2);margin-bottom:10px">Sdílejte toto <strong>ID</strong> s partnerem. On ho vloží do své aplikace a uvidí vaše data (pouze čtení).</div>
        <div style="background:var(--surface2);border-radius:10px;padding:11px 13px;border:1px solid var(--border);font-size:.78rem;word-break:break-all;color:var(--bank);font-family:monospace">${myUid}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:7px" onclick="navigator.clipboard.writeText('${myUid}').then(()=>alert('Zkopírováno!'))">📋 Kopírovat ID</button>
      </div>

      <!-- Slider nastavení -->
      <div style="font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:10px">Co partner uvidí</div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-body" style="padding:10px 14px">
          ${sections.map(s=>`
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-size:.84rem;font-weight:600">${s.label}</div>
                <div style="font-size:.72rem;color:var(--text3)">${s.desc}</div>
              </div>
              <label style="position:relative;display:inline-block;width:42px;height:24px;flex-shrink:0;cursor:pointer">
                <input type="checkbox" ${shareSettings[s.key]?'checked':''} 
                  onchange="updateShareSetting('${s.key}',this.checked)"
                  style="opacity:0;width:0;height:0;position:absolute">
                <span style="position:absolute;inset:0;background:${shareSettings[s.key]?'var(--income)':'var(--surface3)'};border-radius:24px;transition:.3s">
                  <span style="position:absolute;left:${shareSettings[s.key]?'20px':'2px'};top:2px;width:20px;height:20px;background:white;border-radius:50%;transition:.3s;box-shadow:0 1px 4px rgba(0,0,0,.3)"></span>
                </span>
              </label>
            </div>`).join('')}
        </div>
      </div>

      <div style="font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:8px">Jak sdílení funguje</div>
      <div class="insight-item info"><div class="insight-icon">1️⃣</div><div class="insight-text">Zkopírujte vaše <strong>ID</strong> a pošlete ho partnerovi.</div></div>
      <div class="insight-item info"><div class="insight-icon">2️⃣</div><div class="insight-text">Partner se přihlásí, jde do <strong>Sdílení & Partneři</strong> a zadá vaše ID.</div></div>
      <div class="insight-item info"><div class="insight-icon">3️⃣</div><div class="insight-text">V menu uvidí přepínač mezi svými daty a vašimi.</div></div>
      <div class="insight-item good"><div class="insight-icon">🔒</div><div class="insight-text">Partner může vaše data <strong>pouze číst</strong>, ne upravovat.</div></div>`;
  }

  if(partnersEl){
    const pUids=Object.keys(partnerData);
    let html=`<div style="margin-bottom:12px">
      <div style="font-size:.8rem;color:var(--text2);margin-bottom:8px">Zadejte ID uživatele partnera pro přístup k jeho datům:</div>
      <div style="display:flex;gap:7px">
        <input class="fi" id="addPartnerInput" placeholder="ID uživatele (uid)..." style="flex:1;font-size:.78rem;font-family:monospace">
        <button class="btn btn-accent" onclick="addPartner()">Přidat</button>
      </div>
    </div>`;
    if(pUids.length){
      html+=`<div style="font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:8px">Mám přístup k datům</div>`;
      pUids.forEach(uid=>{
        const p=partnerData[uid];
        html+=`<div style="display:flex;align-items:center;gap:9px;padding:8px 10px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);margin-bottom:7px">
          <div style="font-size:1.1rem">👤</div>
          <div style="flex:1"><div style="font-size:.86rem;font-weight:600">${p.profile?.displayName||'Partner'}</div><div style="font-size:.68rem;color:var(--text3);font-family:monospace">${uid.slice(0,16)}...</div></div>
          <button class="btn btn-danger btn-sm" onclick="removePartner('${uid}')">Odebrat</button>
        </div>`;
      });
    } else {
      html+=`<div class="empty"><div class="et">Zatím žádní partneři</div></div>`;
    }
    partnersEl.innerHTML=html;
  }
}

function updateShareSetting(key, value) {
  if(!S.shareSettings) S.shareSettings = {};
  S.shareSettings[key] = value;
  save();
  // Přerenduj slider (aktualizuj barvy)
  renderSdileni();
}

async function addPartner(){
  const input=document.getElementById('addPartnerInput');
  const partnerUid=input.value.trim();
  if(!partnerUid){alert('Zadej ID uživatele');return;}
  if(partnerUid===window._currentUser.uid){alert('Nemůžeš přidat sám sebe');return;}
  try{
    const [dataSnap,profileSnap]=await Promise.all([_get(_ref(_db,`users/${partnerUid}/data`)),_get(_ref(_db,`users/${partnerUid}/profile`))]);
    if(!dataSnap.exists()){alert('Uživatel nenalezen. Zkontroluj ID.');return;}
    // Save partner to my list
    await _set(_ref(_db,`users/${window._currentUser.uid}/partners/${partnerUid}`),true);
    partnerData[partnerUid]={data:dataSnap.val(),profile:profileSnap.exists()?profileSnap.val():{displayName:'Partner',photoURL:null}};
    // Live listener
    const pRef=_ref(_db,`users/${partnerUid}/data`);
    _partnerListeners[partnerUid]=_onValue(pRef,(s)=>{if(s.exists()){partnerData[partnerUid].data=s.val();if(viewingUid===partnerUid)renderPage();if(curPage==='rodina')renderFamilySummary();}});
    input.value='';
    renderPartnerSection(Object.keys(partnerData));
    renderSdileni();
    alert('Partner přidán! 🎉');
  }catch(e){alert('Chyba: '+e.message);}
}

async function removePartner(partnerUid){
  if(!confirm('Odebrat partnera?'))return;
  await _set(_ref(_db,`users/${window._currentUser.uid}/partners/${partnerUid}`),null);
  delete partnerData[partnerUid];
  if(viewingUid===partnerUid)switchToOwnData();
  renderPartnerSection(Object.keys(partnerData));
  renderSdileni();
}

// ══════════════════════════════════════════════════════
