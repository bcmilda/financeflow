//  STATISTIKY
// ══════════════════════════════════════════════════════
// Session 10: TOP 30 kategorií s přepínačem měsíc / rok / všechny roky.
let _statCatMode = 'month';   // 'month' | 'year' | 'all'
let _statCatYear = null;      // pro režim 'year' a 'month' výběr roku (null = aktuální)
function statSetCatMode(m){ _statCatMode = m; _statCatYear = null; renderStats(); }
function statSetCatYear(y){ _statCatYear = parseInt(y,10); renderStats(); }

// Součet výdajů kategorie/podkat. dle režimu
function statCatSum(catId, sub, D){
  D = D || getData();
  if (_statCatMode === 'month') {
    return getActual(catId, sub, S.curMonth, S.curYear, D);
  }
  if (_statCatMode === 'year') {
    const y = _statCatYear || S.curYear;
    let sum = 0; for (let m=0;m<12;m++) sum += getActual(catId, sub, m, y, D);
    return sum;
  }
  // all: přes všechny roky v datech
  const years = statAvailableYears(D);
  let sum = 0;
  years.forEach(y => { for (let m=0;m<12;m++) sum += getActual(catId, sub, m, y, D); });
  return sum;
}

function statAvailableYears(D){
  D = D || getData();
  const ys = new Set();
  (D.transactions||[]).forEach(t => { const d=new Date(t.date); if(!isNaN(d)) ys.add(d.getFullYear()); });
  ys.add(S.curYear);
  return [...ys].sort((a,b)=>b-a);
}

function renderStats(){
  const D=getData();
  const expCats=(D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');

  // Přepínač režimu
  const modeTabs=document.getElementById('statCatModeTabs');
  if(modeTabs){
    const modes=[['month','📅 Měsíc'],['year','🗓️ Rok'],['all','📚 Vše']];
    modeTabs.innerHTML=modes.map(([k,v])=>`<button onclick="statSetCatMode('${k}')"
      style="flex:1;padding:6px 4px;border:none;border-radius:8px;font-size:.72rem;font-weight:${_statCatMode===k?700:500};cursor:pointer;
        background:${_statCatMode===k?'var(--surface)':'transparent'};color:${_statCatMode===k?'var(--text)':'var(--text3)'}">${v}</button>`).join('');
  }
  // Výběr roku (jen pro režim 'year')
  const yearSel=document.getElementById('statCatYearSel');
  if(yearSel){
    if(_statCatMode==='year'){
      const years=statAvailableYears(D);
      const sel=_statCatYear||S.curYear;
      yearSel.innerHTML=`<select onchange="statSetCatYear(this.value)" style="width:100%;padding:7px 10px;border-radius:8px;background:var(--surface2);color:var(--text);border:1px solid var(--border);font-size:.78rem">
        ${years.map(y=>`<option value="${y}" ${y===sel?'selected':''}>${y}</option>`).join('')}</select>`;
    } else { yearSel.innerHTML=''; }
  }

  // TOP 30 kategorií
  const total=expCats.reduce((a,c)=>a+statCatSum(c.id,null,D),0);
  const catEl=document.getElementById('statCats');
  if(catEl){
    const items=expCats.map(c=>{
      const val=statCatSum(c.id,null,D);
      if(!val) return null;
      const activeSubs=(c.subs||[]).map(sub=>({name:sub,val:statCatSum(c.id,sub,D)})).filter(s=>s.val>0).sort((a,b)=>b.val-a.val);
      return {id:c.id, name:c.name, icon:c.icon, color:c.color, val, subs:activeSubs};
    }).filter(Boolean).sort((a,b)=>b.val-a.val).slice(0,30);

    const periodTxt = _statCatMode==='month' ? `${CZ_M[S.curMonth]} ${S.curYear}` :
      _statCatMode==='year' ? `rok ${_statCatYear||S.curYear}` : 'všechny roky';

    const header = items.length ? `<div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--text3);margin-bottom:8px">
      <span>${items.length} kategorií · ${periodTxt}</span><span>Celkem ${fmt(total)} Kč</span></div>` : '';

    catEl.innerHTML = header + (items.map((d,idx)=>`
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:3px;align-items:center">
          <span style="font-weight:600"><span style="color:var(--text3);font-size:.72rem;margin-right:5px">${idx+1}.</span>${d.icon} ${d.name}</span>
          <span style="text-align:right"><strong>${fmt(d.val)}</strong> <span style="color:var(--text3);font-size:.7rem">${total?Math.round(d.val/total*100):0}%</span></span>
        </div>
        <div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden;margin-bottom:${d.subs.length?'6px':'0'}">
          <div style="height:100%;width:${total?Math.round(d.val/total*100):0}%;background:${d.color};border-radius:3px"></div>
        </div>
        ${d.subs.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px">
          ${d.subs.map(s=>`<span style="font-size:.7rem;padding:2px 8px;background:${d.color}18;border:1px solid ${d.color}33;border-radius:10px;color:var(--text2)">
            ${s.name} <span style="color:${d.color};font-weight:600">${fmt(s.val)}</span>
          </span>`).join('')}
        </div>` : ''}
      </div>`).join('') || '<div class="empty"><div class="et">Žádné výdaje v tomto období</div></div>');
  }
  // Insights
  let pm=S.curMonth-1,py=S.curYear;if(pm<0){pm=11;py--;}
  const monthTotal=expCats.reduce((a,c)=>a+getActual(c.id,null,S.curMonth,S.curYear,D),0);
  const prev=expCats.reduce((a,c)=>a+getActual(c.id,null,pm,py,D),0);
  const iEl=document.getElementById('statInsights');
  if(iEl){
    const diff=prev>0?Math.round((monthTotal-prev)/prev*100):null;
    let html='';
    if(diff!==null)html+=`<div class="insight-item ${diff>5?'bad':diff<-5?'good':'warn'}"><div class="insight-icon">${diff>5?'📈':diff<-5?'📉':'↔️'}</div><div class="insight-text">Výdaje ${diff>0?'vzrostly o':'klesly o'} <strong>${Math.abs(diff)}%</strong> oproti ${CZ_M[pm]}</div></div>`;
    const bank=computeBank(D);
    if(bank>0)html+=`<div class="insight-item good"><div class="insight-icon">🏦</div><div class="insight-text">Celkové úspory: <strong>${fmt(bank)}</strong></div></div>`;
    const debts=(D.debts||[]).reduce((a,d)=>a+d.remaining,0);
    if(debts>0)html+=`<div class="insight-item warn"><div class="insight-icon">💰</div><div class="insight-text">Celkový dluh: <strong>${fmt(debts)}</strong></div></div>`;
    iEl.innerHTML=html||'<div class="empty"><div class="et">Přidej transakce</div></div>';
  }
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
  const rawCats=D.categories||[];

  // Zjisti kolik výchozích kategorií a podkategorií chybí
  const existingIds=new Set(rawCats.map(c=>c.id));
  let missingCatCount=0, missingSubCount=0;
  if(typeof DEFAULT_CATEGORIES!=='undefined'){
    DEFAULT_CATEGORIES.forEach(def=>{
      if(!existingIds.has(def.id)){ missingCatCount++; return; }
      const userCat=rawCats.find(c=>c.id===def.id);
      const userSubs=new Set(userCat?.subs||[]);
      (def.subs||[]).forEach(s=>{ if(!userSubs.has(s)) missingSubCount++; });
    });
  }
  const hasAnythingToImport = missingCatCount>0 || missingSubCount>0;

  const bannerParts=[];
  if(missingCatCount) bannerParts.push(`<strong>${missingCatCount}</strong> kategorií`);
  if(missingSubCount) bannerParts.push(`<strong>${missingSubCount}</strong> podkategorií`);
  const importBanner = hasAnythingToImport && !ro
    ? `<div style="padding:10px 12px;margin-bottom:10px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span style="font-size:.8rem;color:var(--text2)">💡 Chybí ti ${bannerParts.join(' a ')} z výchozí sady</span>
        <button id="importCatsBtn" class="btn btn-accent btn-sm" onclick="importDefaultCategories()">+ Doplnit</button>
       </div>` : '';

  if(!rawCats.length){
    el.innerHTML = importBanner + '<div class="empty"><div class="et">Žádné kategorie</div></div>';
    return;
  }

  // Lookup COICOP definice pro kruh (barva + číslo)
  const _coicopArr = (typeof COICOP_GROUPS_DEF !== 'undefined' ? COICOP_GROUPS_DEF : null)
                  || (typeof window !== 'undefined' ? window.COICOP_GROUPS_DEF : null) || [];
  const coicopDef = Object.fromEntries(_coicopArr.map(g=>[g.id,g]));

  // Runtime merge coicop/shared/coicopOverrides z DEFAULT_CATEGORIES
  // DŮLEŽITÉ: vytváříme KOPII objektů – nesmíme mutovat S.categories (způsobuje Firebase crash)
  // Pole coicop/shared/coicopOverrides se neukládají do Firebase → doplníme jen pro zobrazení
  const _defMap = typeof DEFAULT_CATEGORIES !== 'undefined'
    ? Object.fromEntries(DEFAULT_CATEGORIES.map(d=>[d.id,d])) : {};
  const cats = (D.categories||[]).map(c => {
    const def = _defMap[c.id];
    if(!def) return c; // custom kategorie – beze změny
    return {
      ...c,
      coicop: c.coicop !== undefined ? c.coicop : (def.coicop ?? null),
      shared: c.shared || def.shared || null,
      coicopOverrides: c.coicopOverrides || def.coicopOverrides || null,
    };
  });

  // Helper: COICOP kruh s číslem
  const coicopCircle = (num) => {
    if(!num || !coicopDef[num]) return '';
    const g = coicopDef[num];
    return `<span title="COICOP ${num}: ${g.name}" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${g.color};color:#000;font-size:.6rem;font-weight:800;flex-shrink:0;cursor:default">${num}</span>`;
  };

  // Rozdělení dle typu pro header skupiny
  const expCats=cats.filter(c=>c.type==='expense');
  const incCats=cats.filter(c=>c.type==='income');
  const bothCats=cats.filter(c=>c.type==='both');

  // Množina sdílených kategorií pro rychlé vyhledání
  const sharedCatIds = new Set(cats.flatMap(c=>c.shared||[]));

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
      const charLabel = isIncome&&c.incomeChar ? (INCOME_CHAR_LABELS[c.incomeChar]||'')
                      : isExpense&&c.expenseChar&&c.expenseChar!=='none' ? (EXPENSE_CHAR_LABELS[c.expenseChar]||'') : '';

      // Fáze 2: COICOP kruh
      const ccircle = coicopCircle(c.coicop);

      // Fáze 3: shared – přerušovaný rámeček + tooltip
      const isShared = (c.shared||[]).length > 0 || sharedCatIds.has(c.id);
      const sharedNames = (c.shared||[]).map(sid=>{
        const sc = cats.find(x=>x.id===sid);
        return sc ? sc.name : sid;
      });
      const sharedBorder = isShared
        ? `border:1.5px dashed ${c.color}88;`
        : `border:1px solid var(--border);`;
      const sharedTitle = isShared && sharedNames.length
        ? `title="Sdílené téma s: ${sharedNames.join(', ')}"`
        : '';

      return `<div class="cat-item" ${sharedTitle} style="flex-direction:column;align-items:stretch;padding:0;${sharedBorder}border-radius:10px;margin-bottom:6px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;padding:10px">
          <!-- Ikona kategorie s COICOP kruhem v rohu -->
          <div style="position:relative;flex-shrink:0">
            <div class="cat-icon-big" style="background:${hexA(c.color,.15)}">${c.icon}</div>
            ${ccircle?`<div style="position:absolute;bottom:-3px;right:-3px">${ccircle}</div>`:''}
          </div>
          <div class="cat-info" style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
              <span class="cat-name" style="font-weight:600">${c.name}</span>
              <span style="font-size:.63rem;color:var(--text);font-weight:600;background:${c.type==='income'?'rgba(74,222,128,.18)':c.type==='both'?'rgba(96,165,250,.18)':'rgba(248,113,113,.15)'};padding:2px 7px;border-radius:10px">${c.type==='income'?'💰 příjem':c.type==='both'?'↔️ příjem/výdaj':'💸 výdaj'}</span>
              ${charLabel?`<span style="font-size:.63rem;color:var(--text2);background:var(--surface3);padding:2px 6px;border-radius:10px">${charLabel}</span>`:''}
              ${isIncome&&isStable?`<span style="font-size:.63rem;color:var(--income);background:rgba(74,222,128,.12);padding:2px 6px;border-radius:10px">✅ stabilní</span>`:''}
              ${isShared?`<span style="font-size:.6rem;color:var(--text3);padding:1px 5px;border:1px dashed var(--border);border-radius:8px" title="${sharedTitle}">⟷ sdílené</span>`:''}
            </div>
            ${hasSubs?`<div style="margin-top:3px">
              <button onclick="toggleCatExpand('${c.id}')" style="background:none;border:none;padding:0;cursor:pointer;font-size:.74rem;color:var(--text2);display:flex;align-items:center;gap:3px;font-weight:500">
                <span style="transition:transform .2s;display:inline-block;transform:rotate(${expanded?'90deg':'0deg'})">▶</span>
                ${expanded?'Skrýt':'Zobrazit'} podkategorie (${(c.subs||[]).length})
              </button>
            </div>`:`<div style="font-size:.74rem;color:var(--text2);margin-top:2px;font-weight:500">bez podkategorií</div>`}
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
          <div style="font-size:.7rem;color:var(--text2);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">Podkategorie</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${(c.subs||[]).map(s=>{
              const subCoicop = (c.coicopOverrides||{})[s];
              const subCircle = subCoicop && subCoicop !== c.coicop ? coicopCircle(subCoicop) : '';
              return `<span style="font-size:.78rem;padding:4px 10px;background:${hexA(c.color,.18)};border:1px solid ${hexA(c.color,.4)};border-radius:12px;color:var(--text);font-weight:500;display:inline-flex;align-items:center;gap:4px">${s}${subCircle}</span>`;
            }).join('')}
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
      ${s}<button onclick="catSubRemove(${i})" style="background:none;border:none;cursor:pointer;color:#f87171;font-size:.8rem;padding:0 0 0 2px;line-height:1;font-weight:700" title="Odebrat">✕</button>
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
  const stRow=document.getElementById('catStabilityRow');
  const isIncome=(type==='income'||type==='both');
  if(incRow) incRow.style.display=isIncome?'block':'none';
  if(stRow)  stRow.style.display=isIncome?'block':'none';
  if(expRow) expRow.style.display=(type==='expense'||type==='both')?'block':'none';
}

// ── CHARAKTER – popisky a výchozí váhy stability (ADR-044) ──
const INCOME_CHAR_LABELS = {regular:'🔄 Pravidelný', irregular:'📊 Nepravidelný', onetime:'1️⃣ Jednorázový', passive:'🌱 Pasivní'};
const EXPENSE_CHAR_LABELS = {regular:'🔄 Pravidelný', variable:'📊 Variabilní', irregular:'🎲 Nepravidelný', onetime:'1️⃣ Jednorázový', none:'⬜ Neurčeno'};

// Výchozí váha stability pro každý charakter příjmu (ADR-044)
// Neoznačené = 0 (dle Milanovy specifikace)
const INCOME_CHAR_DEFAULT_WEIGHT = {
  regular:  1.0,   // zaměstnání, OSVČ – každý měsíc stejná částka
  passive:  0.7,   // pronájem, dividendy – pravidelné ale závislé na 3. straně
  irregular:0.4,   // freelance, brigáda – nepravidelné zakázky
  onetime:  0.0,   // prodej auta, dar – nelze počítat jako trvalý příjem
  '':       0.0,   // neoznačené = 0 (ADR-044)
};

// FIX (S9): toggleCatStable bylo ztraceno při přepisu stats.js v v6.70
function toggleCatStable(id){
  const c=(S.categories||[]).find(x=>x.id===id);if(!c)return;
  c.stable=!c.stable;
  // Pokud zapínáme stable a nemáme váhu, nastavíme výchozí z incomeChar
  if(c.stable && (c.stabilityWeight===undefined||c.stabilityWeight===null)){
    c.stabilityWeight = INCOME_CHAR_DEFAULT_WEIGHT[c.incomeChar||''] ?? 1.0;
  }
  save();renderCatPage();
}

// Aktualizace slideru při změně charakteru příjmu
function catIncomeCharChanged(){
  const char=document.getElementById('catIncomeChar')?.value||'';
  const slider=document.getElementById('catStabilitySlider');
  const label=document.getElementById('catStabilityLabel');
  if(!slider||!label) return;
  const defaultW=INCOME_CHAR_DEFAULT_WEIGHT[char]??0;
  slider.value=Math.round(defaultW*100);
  label.textContent=Math.round(defaultW*100)+'%';
}
function catStabilitySliderInput(val){
  const label=document.getElementById('catStabilityLabel');
  if(label) label.textContent=val+'%';
}

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
  const sl=document.getElementById('catStabilitySlider'); if(sl) sl.value=0;
  const lb=document.getElementById('catStabilityLabel'); if(lb) lb.textContent='0%';
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
  // Slider – načti uloženou váhu, nebo výchozí z incomeChar
  const savedW = (c.stabilityWeight!==undefined&&c.stabilityWeight!==null)
    ? c.stabilityWeight
    : (INCOME_CHAR_DEFAULT_WEIGHT[c.incomeChar||'']??0);
  const sl=document.getElementById('catStabilitySlider'); if(sl) sl.value=Math.round(savedW*100);
  const lb=document.getElementById('catStabilityLabel'); if(lb) lb.textContent=Math.round(savedW*100)+'%';
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

  // Váha stability a stable flag – POUZE pro příjmové kategorie
  // FIX (S9): undefined způsobuje Firebase error → vždy null pro výdaje
  const isIncomeType=(type==='income'||type==='both');
  const sliderEl=document.getElementById('catStabilitySlider');
  const stabilityWeight = isIncomeType && sliderEl ? parseFloat(sliderEl.value)/100 : null;
  const stable = isIncomeType ? (stabilityWeight > 0) : false; // nikdy undefined

  // Sestavení objektu – vyfiltruj null hodnoty které Firebase nechce
  const obj={name,icon,color,type,subs:[..._catSubsList],isSaving,incomeChar,expenseChar,stable};
  if(healthPct!==null) obj.healthPct=healthPct; else obj.healthPct=null;
  if(healthAmt!==null) obj.healthAmt=healthAmt; else obj.healthAmt=null;
  if(stabilityWeight!==null) obj.stabilityWeight=stabilityWeight;

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
