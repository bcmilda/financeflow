// FinanceFlow · v9.99 · stats.js · 2026-08-22

// S19 (TODO-219, Milan): v maticích zůstávají HOLÁ čísla přepočtená do základní měny,
//   symbol je jednou v popisku tabulky. Samostatné hodnoty (souhrny, karty rodiny)
//   používají fmtB(), protože stojí mimo tabulku a symbol tam nese informaci.
const _sNum = v => fmt(Math.round(czkToBase(v)));
//  STATISTIKY
// ══════════════════════════════════════════════════════
// Session 10: TOP 30 kategorií s přepínačem měsíc / rok / všechny roky.
let _statCatMode = 'month';   // 'month' | 'year' | 'all'
let _statCatYear = null;      // pro režim 'year' a 'month' výběr roku (null = aktuální)
let _statYearSpan = 'ytd';    // pro režim 'year': 'ytd' (od ledna) | 'last12' (posledních 12 měs.)
const _statExpanded = new Set(); // rozbalené kategorie v měsíční tabulce
function statSetCatMode(m){ _statCatMode = m; _statCatYear = null; renderStats(); }
function statSetCatYear(y){ _statCatYear = parseInt(y,10); renderStats(); }
function statSetYearSpan(s){ _statYearSpan = s; renderStats(); }
function statToggleCat(id){ if(_statExpanded.has(id))_statExpanded.delete(id); else _statExpanded.add(id); renderStats(); }

// Vrátí pole {m,y,label} měsíců pro režim 'year' dle _statYearSpan
function statYearMonths(){
  const arr=[];
  if(_statYearSpan==='last12'){
    for(let i=11;i>=0;i--){ let m=S.curMonth-i,y=S.curYear; while(m<0){m+=12;y--;} arr.push({m,y,label:CZ_M[m].slice(0,3)}); }
  } else { // ytd – od ledna zvoleného roku do prosince
    const y=_statCatYear||S.curYear;
    for(let m=0;m<12;m++) arr.push({m,y,label:CZ_M[m].slice(0,3)});
  }
  return arr;
}

// Součet výdajů kategorie/podkat. dle režimu
function statCatSum(catId, sub, D){
  D = D || getData();
  if (_statCatMode === 'month') {
    return getActual(catId, sub, S.curMonth, S.curYear, D);
  }
  if (_statCatMode === 'year') {
    let sum = 0; statYearMonths().forEach(({m,y})=> sum += getActual(catId, sub, m, y, D)); return sum;
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
  // Výběr roku + span (jen pro režim 'year')
  const yearSel=document.getElementById('statCatYearSel');
  if(yearSel){
    if(_statCatMode==='year'){
      const years=statAvailableYears(D);
      const sel=_statCatYear||S.curYear;
      const spanBtn=(k,lbl)=>`<button onclick="statSetYearSpan('${k}')" style="flex:1;padding:6px 4px;border:none;border-radius:7px;font-size:.7rem;font-weight:${_statYearSpan===k?700:500};cursor:pointer;background:${_statYearSpan===k?'var(--surface)':'transparent'};color:${_statYearSpan===k?'var(--text)':'var(--text3)'}">${lbl}</button>`;
      yearSel.innerHTML=`
        <div style="display:flex;gap:3px;margin-bottom:8px;background:var(--surface2);border-radius:9px;padding:3px">
          ${spanBtn('ytd','Od ledna')}${spanBtn('last12','Posledních 12 měs.')}
        </div>
        ${_statYearSpan==='ytd'?`<select onchange="statSetCatYear(this.value)" style="width:100%;padding:7px 10px;border-radius:8px;background:var(--surface2);color:var(--text);border:1px solid var(--border);font-size:.78rem">
          ${years.map(y=>`<option value="${y}" ${y===sel?'selected':''}>${y}</option>`).join('')}</select>`:''}`;
    } else { yearSel.innerHTML=''; }
  }

  // Měsíční tabulka (jen režim 'year'): kategorie × 12 měsíců
  const monthlyEl=document.getElementById('statMonthlyTable');
  if(monthlyEl){
    if(_statCatMode==='year'){
      const cols=statYearMonths();
      // řádky = TOP kategorie dle součtu
      const rows=expCats.map(c=>({c, total:statCatSum(c.id,null,D)})).filter(r=>r.total>0).sort((a,b)=>b.total-a.total).slice(0,30);
      if(rows.length){
        const colTotals=cols.map(({m,y})=>expCats.reduce((a,c)=>a+getActual(c.id,null,m,y,D),0));
        let html=`<div style="overflow-x:auto;margin-bottom:14px"><table style="border-collapse:collapse;font-size:.7rem;min-width:100%;white-space:nowrap">
          <thead><tr style="color:var(--text3)">
            <th style="text-align:left;padding:5px 8px;position:sticky;left:0;background:var(--surface);z-index:2" title="Všechny částky v ${curSym()}">Kategorie <span style="font-weight:400;opacity:.7">(${curSym()})</span></th>
            ${cols.map(c=>`<th style="text-align:right;padding:5px 6px">${c.label}</th>`).join('')}
            <th style="text-align:right;padding:5px 8px;font-weight:700">Σ</th>
          </tr></thead><tbody>`;
        rows.forEach(r=>{
          const subs=(r.c.subs||[]).map(sub=>({name:sub, total:statCatSum(r.c.id,sub,D)})).filter(s=>s.total>0);
          const hasSubs=subs.length>0;
          const expanded=_statExpanded.has(r.c.id);
          html+=`<tr style="border-top:1px solid var(--border)${hasSubs?';cursor:pointer':''}" ${hasSubs?`onclick="statToggleCat('${r.c.id}')"`:''}>
            <td style="text-align:left;padding:5px 8px;position:sticky;left:0;background:var(--surface);color:${r.c.color};font-weight:600">${hasSubs?`<span style="display:inline-block;width:12px;color:var(--text3)">${expanded?'▾':'▸'}</span>`:'<span style="display:inline-block;width:12px"></span>'}${r.c.icon||''} ${r.c.name}</td>
            ${cols.map(({m,y})=>{const v=getActual(r.c.id,null,m,y,D);return `<td style="text-align:right;padding:5px 6px;color:${v?'var(--text)':'var(--text3)'}">${v?_sNum(v):'·'}</td>`;}).join('')}
            <td style="text-align:right;padding:5px 8px;font-weight:700;color:${r.c.color}">${_sNum(r.total)}</td>
          </tr>`;
          // Rozbalené řádky podkategorií
          if(expanded){
            subs.sort((a,b)=>b.total-a.total).forEach(s=>{
              html+=`<tr style="background:var(--surface2);font-size:.66rem">
                <td style="text-align:left;padding:4px 8px 4px 24px;position:sticky;left:0;background:var(--surface2);color:var(--text2)">${s.name}</td>
                ${cols.map(({m,y})=>{const v=getActual(r.c.id,s.name,m,y,D);return `<td style="text-align:right;padding:4px 6px;color:${v?'var(--text2)':'var(--text3)'}">${v?_sNum(v):'·'}</td>`;}).join('')}
                <td style="text-align:right;padding:4px 8px;color:var(--text2)">${_sNum(s.total)}</td>
              </tr>`;
            });
          }
        });
        html+=`<tr style="border-top:2px solid var(--border2);font-weight:700">
          <td style="text-align:left;padding:6px 8px;position:sticky;left:0;background:var(--surface)">Celkem</td>
          ${colTotals.map(v=>`<td style="text-align:right;padding:6px 6px">${v?_sNum(v):'·'}</td>`).join('')}
          <td style="text-align:right;padding:6px 8px">${_sNum(colTotals.reduce((a,b)=>a+b,0))}</td>
        </tr></tbody></table></div>`;
        monthlyEl.innerHTML=html;
      } else monthlyEl.innerHTML='';
    } else if(_statCatMode==='all'){
      // v8.67: „Vše" ve formátu tabulky jako Rok – sloupce = ROKY, rozbalitelné podkategorie.
      // Jednoprůchodový index přes všechny transakce (bez přesunů/split rodičů/vyrovnání).
      const idx={};
      (D.transactions||[]).forEach(t=>{
        if(t.type!=='expense'||t.isBalancing||t.splitParent||isTransferTx(t))return;
        const cid=t.catId||t.category; if(!cid)return;
        const y=new Date(t.date).getFullYear(); if(!isFinite(y))return;
        const v=txCZK(t,D);
        (idx[y]=idx[y]||{}); (idx[y][cid]=idx[y][cid]||{__t:0});
        idx[y][cid].__t+=v;
        if(t.subcat) idx[y][cid][t.subcat]=(idx[y][cid][t.subcat]||0)+v;
      });
      const yearsAll=Object.keys(idx).map(Number).sort((a,b)=>a-b);
      const cell=(y,cid,sub)=>{const c=idx[y]&&idx[y][cid];if(!c)return 0;return sub?(c[sub]||0):(c.__t||0);};
      const rows=expCats.map(c=>({c, total:yearsAll.reduce((a,y)=>a+cell(y,c.id,null),0)}))
        .filter(r=>r.total>0).sort((a,b)=>b.total-a.total).slice(0,30);
      if(rows.length&&yearsAll.length){
        const colTotals=yearsAll.map(y=>rows.reduce((a,r)=>a+cell(y,r.c.id,null),0));
        let html=`<div style="overflow-x:auto;margin-bottom:14px"><table style="border-collapse:collapse;font-size:.7rem;min-width:100%;white-space:nowrap">
          <thead><tr style="color:var(--text3)">
            <th style="text-align:left;padding:5px 8px;position:sticky;left:0;background:var(--surface);z-index:2" title="Všechny částky v ${curSym()}">Kategorie <span style="font-weight:400;opacity:.7">(${curSym()})</span></th>
            ${yearsAll.map(y=>`<th style="text-align:right;padding:5px 6px">${y}</th>`).join('')}
            <th style="text-align:right;padding:5px 8px;font-weight:700">Σ</th>
          </tr></thead><tbody>`;
        rows.forEach(r=>{
          const subs=(r.c.subs||[]).map(sub=>({name:sub, total:yearsAll.reduce((a,y)=>a+cell(y,r.c.id,sub),0)})).filter(s=>s.total>0);
          const hasSubs=subs.length>0;
          const expanded=_statExpanded.has(r.c.id);
          html+=`<tr style="border-top:1px solid var(--border)${hasSubs?';cursor:pointer':''}" ${hasSubs?`onclick="statToggleCat('${r.c.id}')"`:''}>
            <td style="text-align:left;padding:5px 8px;position:sticky;left:0;background:var(--surface);color:${r.c.color};font-weight:600">${hasSubs?`<span style="display:inline-block;width:12px;color:var(--text3)">${expanded?'▾':'▸'}</span>`:'<span style="display:inline-block;width:12px"></span>'}${r.c.icon||''} ${r.c.name}</td>
            ${yearsAll.map(y=>{const v=cell(y,r.c.id,null);return `<td style="text-align:right;padding:5px 6px;color:${v?'var(--text)':'var(--text3)'}">${v?_sNum(v):'·'}</td>`;}).join('')}
            <td style="text-align:right;padding:5px 8px;font-weight:700;color:${r.c.color}">${_sNum(r.total)}</td>
          </tr>`;
          if(expanded){
            subs.sort((a,b)=>b.total-a.total).forEach(s=>{
              html+=`<tr style="background:var(--surface2);font-size:.66rem">
                <td style="text-align:left;padding:4px 8px 4px 24px;position:sticky;left:0;background:var(--surface2);color:var(--text2)">${s.name}</td>
                ${yearsAll.map(y=>{const v=cell(y,r.c.id,s.name);return `<td style="text-align:right;padding:4px 6px;color:${v?'var(--text2)':'var(--text3)'}">${v?_sNum(v):'·'}</td>`;}).join('')}
                <td style="text-align:right;padding:4px 8px;color:var(--text2)">${_sNum(s.total)}</td>
              </tr>`;
            });
          }
        });
        html+=`<tr style="border-top:2px solid var(--border2);font-weight:700">
          <td style="text-align:left;padding:6px 8px;position:sticky;left:0;background:var(--surface)">Celkem</td>
          ${colTotals.map(v=>`<td style="text-align:right;padding:6px 6px">${v?_sNum(v):'·'}</td>`).join('')}
          <td style="text-align:right;padding:6px 8px">${_sNum(colTotals.reduce((a,b)=>a+b,0))}</td>
        </tr></tbody></table></div>`;
        monthlyEl.innerHTML=html;
      } else monthlyEl.innerHTML='';
    } else monthlyEl.innerHTML='';
  }

  // TOP 30 kategorií
  const total=expCats.reduce((a,c)=>a+statCatSum(c.id,null,D),0);
  const catEl=document.getElementById('statCats');
  // Session 10: v režimu 'year' zobrazujeme jen měsíční tabulku (statMonthlyTable),
  // TOP 30 list se skryje (byly tam dvě tabulky). V 'month'/'all' zůstává TOP 30.
  if(catEl && (_statCatMode==='year'||_statCatMode==='all')){ catEl.innerHTML=''; } // v8.67: 'all' má vlastní tabulku
  else if(catEl){
    const items=expCats.map(c=>{
      const val=statCatSum(c.id,null,D);
      if(!val) return null;
      const activeSubs=(c.subs||[]).map(sub=>({name:sub,val:statCatSum(c.id,sub,D)})).filter(s=>s.val>0).sort((a,b)=>b.val-a.val);
      return {id:c.id, name:c.name, icon:c.icon, color:c.color, val, subs:activeSubs};
    }).filter(Boolean).sort((a,b)=>b.val-a.val).slice(0,30);

    const periodTxt = _statCatMode==='month' ? `${CZ_M[S.curMonth]} ${S.curYear}` :
      _statCatMode==='year' ? `rok ${_statCatYear||S.curYear}` : 'všechny roky';

    const header = items.length ? `<div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--text3);margin-bottom:8px">
      <span>${items.length} kategorií · ${periodTxt}</span><span>Celkem ${fmtB(total)}</span></div>` : '';

    catEl.innerHTML = header + (items.map((d,idx)=>`
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:3px;align-items:center">
          <span style="font-weight:600"><span style="color:var(--text3);font-size:.72rem;margin-right:5px">${idx+1}.</span>${d.icon} ${d.name}</span>
          <span style="text-align:right"><strong>${fmtB(d.val)}</strong> <span style="color:var(--text3);font-size:.7rem">${total?Math.round(d.val/total*100):0}%</span></span>
        </div>
        <div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden;margin-bottom:${d.subs.length?'6px':'0'}">
          <div style="height:100%;width:${total?Math.round(d.val/total*100):0}%;background:${d.color};border-radius:3px"></div>
        </div>
        ${d.subs.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px">
          ${d.subs.map(s=>`<span style="font-size:.7rem;padding:2px 8px;background:${d.color}18;border:1px solid ${d.color}33;border-radius:10px;color:var(--text2)">
            ${s.name} <span style="color:${d.color};font-weight:600">${fmtB(s.val)}</span>
          </span>`).join('')}
        </div>` : ''}
      </div>`).join('') || '<div class="empty"><div class="et">Žádné výdaje v tomto období</div></div>');
  }
  // Insights — mode-aware
  const iEl=document.getElementById('statInsights');
  if(iEl){
    let html='';
    const bank=computeBank(D);
    const debts=(D.debts||[]).reduce((a,d)=>a+d.remaining,0);

    if(_statCatMode==='month'){
      let pm=S.curMonth-1,py=S.curYear;if(pm<0){pm=11;py--;}
      const monthTotal=expCats.reduce((a,c)=>a+getActual(c.id,null,S.curMonth,S.curYear,D),0);
      const prev=expCats.reduce((a,c)=>a+getActual(c.id,null,pm,py,D),0);
      const diff=prev>0?Math.round((monthTotal-prev)/prev*100):null;
      if(diff!==null)html+=`<div class="insight-item ${diff>5?'bad':diff<-5?'good':'warn'}"><div class="insight-icon">${diff>5?'📈':diff<-5?'📉':'↔️'}</div><div class="insight-text">Výdaje ${diff>0?'vzrostly o':'klesly o'} <strong>${Math.abs(diff)}%</strong> oproti ${CZ_M[pm]}</div></div>`;
    } else if(_statCatMode==='year'){
      const curY=_statCatYear||S.curYear;
      const prevY=curY-1;
      const yearTotal=expCats.reduce((a,c)=>a+statCatSum(c.id,null,D),0);
      // Výdaje za předchozí rok
      const prevYearTotal=(D.transactions||[]).filter(t=>new Date(t.date).getFullYear()===prevY&&t.type==='expense'&&!t.splitParent).reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
      const diff=prevYearTotal>0?Math.round((yearTotal-prevYearTotal)/prevYearTotal*100):null;
      if(diff!==null)html+=`<div class="insight-item ${diff>5?'bad':diff<-5?'good':'warn'}"><div class="insight-icon">${diff>5?'📈':diff<-5?'📉':'↔️'}</div><div class="insight-text">Roční výdaje ${diff>0?'vzrostly o':'klesly o'} <strong>${Math.abs(diff)}%</strong> vs. ${prevY}</div></div>`;
      if(yearTotal>0)html+=`<div class="insight-item info"><div class="insight-icon">📅</div><div class="insight-text">Celkové výdaje ${curY}: <strong>${fmtB(yearTotal)}</strong></div></div>`;
    } else {
      // all — celkový pohled
      const allTotal=(D.transactions||[]).filter(t=>t.type==='expense'&&!t.splitParent).reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
      const allIncome=(D.transactions||[]).filter(t=>t.type==='income'&&!t.splitParent).reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A
      if(allTotal>0)html+=`<div class="insight-item info"><div class="insight-icon">💸</div><div class="insight-text">Celkové výdaje za vše: <strong>${fmtB(allTotal)}</strong></div></div>`;
      if(allIncome>0)html+=`<div class="insight-item good"><div class="insight-icon">💰</div><div class="insight-text">Celkové příjmy za vše: <strong>${fmtB(allIncome)}</strong></div></div>`;
      const balance=allIncome-allTotal;
      if(allTotal>0&&allIncome>0)html+=`<div class="insight-item ${balance>=0?'good':'bad'}"><div class="insight-icon">${balance>=0?'✅':'⚠️'}</div><div class="insight-text">Celkové saldo: <strong>${balance>=0?'+':''}${fmtB(balance)}</strong></div></div>`;
    }

    if(bank>0)html+=`<div class="insight-item good"><div class="insight-icon">🏦</div><div class="insight-text">Celkové úspory: <strong>${fmtB(bank)}</strong></div></div>`;
    if(debts>0)html+=`<div class="insight-item warn"><div class="insight-icon">💳</div><div class="insight-text">Celkový dluh: <strong>${fmtB(debts)}</strong></div></div>`;
    iEl.innerHTML=html||'<div class="empty"><div class="et">Přidej transakce</div></div>';
  }
  renderChordDiagram(); // Session 11 – tok výdajů
}

// ══════════════════════════════════════════════════════
//  CHORD DIAGRAM – tok výdajů (Session 11)
//  Kruhový diagram vztahů mezi TOP N kategoriemi výdajů.
//  Arky = podíl kategorie na celku; struny spojují kategorie,
//  tloušťka = geometrický průměr obou kategorií → velké
//  struny mezi dominantními kategoriemi.
// ══════════════════════════════════════════════════════
function renderChordDiagram() {
  const el = document.getElementById('statChord');
  if (!el) return;
  const D = getData();

  // Sběr dat dle aktuálního režimu (month / year / all)
  const catDefs = (D.categories||[]).filter(c => !c.parentId && (c.type==='expense'||c.type==='both'));
  const items = catDefs.map(c => {
    let amt = 0;
    if (_statCatMode === 'month') {
      amt = getActual(c.id, null, S.curMonth, S.curYear, D);
    } else if (_statCatMode === 'year') {
      for (let m = 0; m < 12; m++) amt += getActual(c.id, null, m, S.curYear, D);
    } else {
      // FIX: použít statCatSum pro 'all' - správně prochází všechny roky/měsíce
      amt = statCatSum(c.id, null, D);
    }
    return { id: c.id, name: c.name||c.id, amount: amt, color: c.color||'#60a5fa' };
  }).filter(x => x.amount > 0).sort((a,b) => b.amount - a.amount).slice(0, 8);

  if (items.length < 2) {
    el.innerHTML = '<div class="empty"><div class="ei">🎭</div><div class="et">Pro chord diagram přidej výdaje alespoň do 2 kategorií</div></div>';
    return;
  }

  const total = items.reduce((a, x) => a + x.amount, 0);
  const N = items.length;
  const W = Math.min(400, window.innerWidth - 32);
  const cx = W / 2, cy = W / 2;
  const Rout = W * 0.40;   // vnější poloměr arky
  const Rin  = W * 0.30;   // vnitřní poloměr (úpony strun)
  const GAP  = 0.05;       // mezera mezi segmenty (rad)

  const totalSpan = Math.PI * 2 - GAP * N;
  let cur = -Math.PI / 2;  // začátek nahoře

  // Přiřaď úhly každému segmentu
  const segs = items.map(it => {
    const span = (it.amount / total) * totalSpan;
    const s = cur, e = cur + span;
    cur = e + GAP;
    return { ...it, s, e, mid: (s + e) / 2, span };
  });

  const pt = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  const co = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;

  // Hex → rgba helper
  function withAlpha(hex, a) {
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  let svg = '';

  // ── 1) Struny (chords) ──────────────────────────────
  // Přidělení šířky struny na každém arku: seřadíme partnery,
  // každý dostane proporcionální výřez z vnitřní hrany arku.
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const si = segs[i], sj = segs[j];
      // šířka struny na arku i = (ai/total)*span_i ale max 85% span
      const wi = Math.min(si.span * 0.85, (sj.amount / total) * si.span * 3.5);
      const wj = Math.min(sj.span * 0.85, (si.amount / total) * sj.span * 3.5);
      const ai1 = si.mid - wi / 2, ai2 = si.mid + wi / 2;
      const aj1 = sj.mid - wj / 2, aj2 = sj.mid + wj / 2;
      const Pi1 = pt(ai1, Rin), Pi2 = pt(ai2, Rin);
      const Pj1 = pt(aj1, Rin), Pj2 = pt(aj2, Rin);
      const col = withAlpha(si.color, 0.40);
      const stroke = withAlpha(si.color, 0.15);
      // Cesta: arc i → bezier do arc j → arc j zpět → bezier zpět
      const d = [
        `M${co(Pi1)}`,
        `A${Rin.toFixed(1)},${Rin.toFixed(1)} 0 0 1 ${co(Pi2)}`,
        `Q${cx},${cy} ${co(Pj2)}`,
        `A${Rin.toFixed(1)},${Rin.toFixed(1)} 0 0 0 ${co(Pj1)}`,
        `Q${cx},${cy} ${co(Pi1)}Z`,
      ].join(' ');
      svg += `<path d="${d}" fill="${col}" stroke="${stroke}" stroke-width="0.5">
        <title>${si.name} ↔ ${sj.name}\n${si.name}: ${Math.round(si.amount/total*100)}%  ${sj.name}: ${Math.round(sj.amount/total*100)}%</title></path>`;
    }
  }

  // ── 2) Arky (segmenty) ──────────────────────────────
  for (const s of segs) {
    const [ox1,oy1] = pt(s.s, Rout), [ox2,oy2] = pt(s.e, Rout);
    const [ix1,iy1] = pt(s.s, Rin),  [ix2,iy2] = pt(s.e, Rin);
    const lf = s.span > Math.PI ? 1 : 0;
    const d = [
      `M${ix1.toFixed(1)},${iy1.toFixed(1)}`,
      `A${Rin.toFixed(1)},${Rin.toFixed(1)} 0 ${lf} 1 ${ix2.toFixed(1)},${iy2.toFixed(1)}`,
      `L${ox2.toFixed(1)},${oy2.toFixed(1)}`,
      `A${Rout.toFixed(1)},${Rout.toFixed(1)} 0 ${lf} 0 ${ox1.toFixed(1)},${oy1.toFixed(1)}Z`,
    ].join(' ');
    svg += `<path d="${d}" fill="${s.color}" opacity="0.92">
      <title>${s.name}: ${typeof fmtB==='function'?fmtB(s.amount):s.amount} (${Math.round(s.amount/total*100)}%)</title></path>`;
  }

  // ── 3) Popisky ──────────────────────────────────────
  // Malé segmenty (pod 3 %) nemají vlastní popisek u kruhu (zůstávají v legendě)
  // → zabrání překrývání textů v místech, kde se sbíhají úzké segmenty.
  // Leader-line spojuje popisek s arkem pro lepší čitelnost.
  let lastLabelY = {};  // pro hrubé rozhazování ve svislém směru
  for (const s of segs) {
    const pct = Math.round(s.amount / total * 100);
    if (pct < 3) continue;  // malé segmenty bez popisku
    const [ax, ay] = pt(s.mid, Rout);                    // bod na arku
    let [lx, ly]   = pt(s.mid, Rout + W * 0.085);         // bod popisku (dál od kruhu)
    const side = Math.cos(s.mid) < -0.05 ? 'end' : Math.cos(s.mid) > 0.05 ? 'start' : 'middle';
    // jemné rozhození kolize: pokud už je popisek blízko stejné výšky, posuň
    const bucket = Math.round(ly / 14);
    if (lastLabelY[bucket]) ly += (W * 0.03);
    lastLabelY[bucket] = 1;
    const name = s.name.length > 9 ? s.name.slice(0, 8) + '…' : s.name;
    const fs1 = Math.max(9, W * 0.031), fs2 = Math.max(8, W * 0.026);
    // leader-line
    svg += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="${s.color}" stroke-width="0.6" opacity="0.5"/>`;
    svg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${side}" dominant-baseline="middle"
        style="font-size:${fs1}px;fill:#c2c7da;font-weight:600;font-family:sans-serif">${name}</text>
      <text x="${lx.toFixed(1)}" y="${(ly + fs1 + 1).toFixed(1)}" text-anchor="${side}"
        style="font-size:${fs2}px;fill:${s.color};font-family:sans-serif">${pct}%</text>`;
  }

  // ── 4) Střed: celková suma ──────────────────────────
  svg += `<text x="${cx}" y="${cy - 8}" text-anchor="middle" style="font-size:${W*0.038}px;fill:#c2c7da;font-family:sans-serif">Celkem</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" style="font-size:${W*0.048}px;fill:var(--text);font-weight:700;font-family:sans-serif">${typeof czkToBase==='function'?fmt(czkToBase(total)):(typeof fmt==='function'?fmt(total):'—')}</text>
    <text x="${cx}" y="${cy + 14 + W*0.042}" text-anchor="middle" style="font-size:${W*0.03}px;fill:#a8aec8;font-family:sans-serif">${typeof curSym==='function'?curSym():'Kč'}</text>`;

  const pad = W * 0.18;
  el.innerHTML = `<svg viewBox="${-pad} ${-pad} ${W+2*pad} ${W+2*pad}" width="100%"
    style="max-width:${W+2*pad}px;display:block;margin:0 auto;overflow:visible">${svg}</svg>
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px">
      ${segs.map(s=>`<span style="display:flex;align-items:center;gap:5px;font-size:.74rem;color:#c2c7da">
        <span style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0"></span>${s.name} ${Math.round(s.amount/total*100)}%
      </span>`).join('')}
    </div>`;
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
    if(!def) return c; // custom kategorie – coicop má přímo z Firebase (admin assignCoicop)
    return {
      ...c,
      coicop: c.coicop !== undefined && c.coicop !== null ? c.coicop : (def.coicop ?? null),
      shared: c.shared || def.shared || null,
      // FIX (S12.1): SLOUČIT defaultní + uložené overridy (dřív c.coicopOverrides defaultní zahodily)
      coicopOverrides: (def.coicopOverrides || c.coicopOverrides)
        ? { ...(def.coicopOverrides||{}), ...(c.coicopOverrides||{}) }
        : null,
    };
  });

  // Helper: COICOP kruh s číslem
  const coicopCircle = (num) => {
    if(!num || !coicopDef[num]) return '';
    const g = coicopDef[num];
    return `<span title="COICOP ${num}: ${g.name}" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${g.color};color:#000;font-size:.6rem;font-weight:800;flex-shrink:0;cursor:default">${num}</span>`;
  };

  // Rozdělení dle typu pro header skupiny.
  // _catSection: „Virtuální přesun" (typ 'both') patří vizuálně do Přesunů.
  const expCats=cats.filter(c=>_catSection(c)==='expense');
  const incCats=cats.filter(c=>_catSection(c)==='income');
  const bothCats=cats.filter(c=>_catSection(c)==='both');
  const transferCats=cats.filter(c=>_catSection(c)==='transfer');

  // Množina sdílených kategorií pro rychlé vyhledání
  const sharedCatIds = new Set(cats.flatMap(c=>c.shared||[]));

  const renderGroup=(groupCats, groupLabel)=>{
    if(!groupCats.length) return '';
    return `<div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;padding:10px 2px 4px">${groupLabel}</div>
    ${groupCats.map((c, idxInGroup)=>{
      const isIncome=c.type==='income'||c.type==='both';
      const isExpense=c.type==='expense'||c.type==='both';
      const isStable=c.stable===true;
      const hasSubs=(c.subs||[]).length>0;
      const expanded=!!_catExpanded[c.id];
      const isFirst=idxInGroup===0;
      const isLast=idxInGroup===groupCats.length-1;
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

      // Virtuální přesun = systémová kategorie. Pro ne-admina zamčená (gold border, bez úprav).
      const _isLockedCat = (c.name === 'Virtuální přesun');
      const _amAdmin = (typeof isAdmin === 'function' && isAdmin());
      const _catLocked = _isLockedCat && !_amAdmin;
      const _goldBorder = _isLockedCat ? 'border:1.5px solid #f5b942;box-shadow:0 0 0 1px rgba(245,185,66,.25) inset;' : sharedBorder;
      return `<div class="cat-item" data-cat-id="${c.id}" ${sharedTitle} style="flex-direction:column;align-items:stretch;padding:0;${_goldBorder}border-radius:10px;margin-bottom:6px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;padding:10px">
          ${!ro && !_catLocked?`<span class="cat-drag" draggable="true" data-drag-id="${c.id}" title="Přetáhni pro změnu pořadí" style="cursor:grab;color:#a8aec8;font-size:1.05rem;padding:6px 3px;margin:-6px 0;flex-shrink:0;user-select:none;touch-action:none">⠿</span>`:''}
          <!-- Ikona kategorie s COICOP kruhem v rohu -->
          <div style="position:relative;flex-shrink:0">
            <div class="cat-icon-big" style="background:${hexA(c.color,.15)}">${c.icon}</div>
            ${ccircle?`<div style="position:absolute;bottom:-3px;right:-3px">${ccircle}</div>`:''}
          </div>
          <div class="cat-info" style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
              <span class="cat-name" style="font-weight:600">${c.name}</span>
              <span style="font-size:.63rem;color:var(--text);font-weight:600;background:${c.type==='income'?'rgba(74,222,128,.18)':c.type==='both'?'rgba(96,165,250,.18)':c.type==='transfer'?'rgba(168,139,250,.18)':'rgba(248,113,113,.15)'};padding:2px 7px;border-radius:10px">${c.type==='income'?'💰 příjem':c.type==='both'?'↔️ příjem/výdaj':c.type==='transfer'?'🔄 přesun':'💸 výdaj'}</span>
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
            ${!ro && !_catLocked?`<button class="btn btn-ghost btn-icon btn-sm" data-mv="up" title="Posunout nahoru" onclick="moveCatUp('${c.id}',event)" style="font-size:.7rem;padding:2px 5px;opacity:${isFirst?.3:1}" ${isFirst?'disabled':''}>▲</button>
            <button class="btn btn-ghost btn-icon btn-sm" data-mv="down" title="Posunout dolů" onclick="moveCatDown('${c.id}',event)" style="font-size:.7rem;padding:2px 5px;opacity:${isLast?.3:1}" ${isLast?'disabled':''}>▼</button>`:''}
          </div>
          ${!ro && _catLocked ? `<div style="display:flex;align-items:center;flex-shrink:0"><span style="font-size:.6rem;color:#f5b942;background:rgba(245,185,66,.12);border:1px solid rgba(245,185,66,.4);padding:2px 7px;border-radius:10px" title="Systémová kategorie – nelze upravit ani smazat">🔒 systémová</span></div>` : ''}
          ${!ro && !_catLocked?`<div style="display:flex;gap:4px;flex-shrink:0">
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
              // Sdílená podkategorie: existuje samostatná kategorie stejného jména, která se sem hlásí přes shared
              const sharedCat = cats.find(x => x.name === s && (x.shared||[]).includes(c.id));
              const sharedMark = sharedCat
                ? `<span title="Sdíleno se samostatnou kategorií „${s}" (COICOP ${sharedCat.coicop||'?'})" style="font-size:.66rem;color:#f5b942;margin-left:1px">↔</span>`
                : '';
              const sharedBdr = sharedCat ? `border:1px dashed ${hexA('#f5b942',.6)};` : `border:1px solid ${hexA(c.color,.4)};`;
              return `<span style="font-size:.78rem;padding:4px 10px;background:${hexA(c.color,.18)};${sharedBdr}border-radius:12px;color:var(--text);font-weight:500;display:inline-flex;align-items:center;gap:4px">${s}${subCircle}${sharedMark}</span>`;
            }).join('')}
          </div>
        </div>`:''}
      </div>`;
    }).join('')}`;
  };

  el.innerHTML = importBanner +
    renderGroup(incCats,  '💰 Příjmy') +
    renderGroup(expCats,  '💸 Výdaje') +
    renderGroup(bothCats, '↔️ Příjem i výdaj') +
    renderGroup(transferCats, '🔄 Přesuny (investice, rezerva, spoření)');
}

function toggleCatExpand(id){
  _catExpanded[id]=!_catExpanded[id];
  renderCatPage();
}

// Sekce kategorie pro řazení/zobrazení. „Virtuální přesun" (typ 'both') patří do Přesunů.
function _catSection(c){
  if(c && c.name === 'Virtuální přesun') return 'transfer';
  return c ? c.type : '';
}

// ══ S16.15 (FIX-205 v3, Milan): DRAG & DROP přeskládání kategorií ══
//   Definitivní řešení místo scroll-gymnastiky: chytni ⠿, táhni, pusť.
//   Přesun jen v rámci stejné sekce (Příjmy/Výdaje/…). Šipky zůstávají pro mobil.
let _catDragId=null;
function _initCatDnD(){
  const list=document.getElementById('catList'); if(!list||list._dndInit) return;
  list._dndInit=true;
  list.addEventListener('dragstart',(e)=>{
    const h=e.target.closest('.cat-drag'); if(!h) return;
    _catDragId=h.dataset.dragId;
    const card=h.closest('.cat-item');
    if(card){ card.style.opacity='.45'; }
    e.dataTransfer.effectAllowed='move';
    try{ e.dataTransfer.setData('text/plain',_catDragId); }catch(_e){}
  });
  list.addEventListener('dragover',(e)=>{
    if(!_catDragId) return;
    const card=e.target.closest('.cat-item'); 
    list.querySelectorAll('.cat-item').forEach(c2=>{ c2.style.borderTop=''; c2.style.borderBottom=''; });
    if(!card||card.dataset.catId===_catDragId) return;
    const cats=S.categories||[];
    const a=cats.find(c2=>c2.id===_catDragId), b=cats.find(c2=>c2.id===card.dataset.catId);
    if(!a||!b||_catSection(a)!==_catSection(b)) return;   // jen stejná sekce
    e.preventDefault();
    const r=card.getBoundingClientRect();
    const before=(e.clientY-r.top)<r.height/2;
    if(before) card.style.borderTop='2px solid var(--bank)';
    else card.style.borderBottom='2px solid var(--bank)';
    card.dataset.dropBefore=before?'1':'0';
  });
  list.addEventListener('drop',(e)=>{
    if(!_catDragId) return;
    const card=e.target.closest('.cat-item');
    if(card&&card.dataset.catId!==_catDragId){
      e.preventDefault();
      const cats=S.categories||[];
      const ai=cats.findIndex(c2=>c2.id===_catDragId);
      const a=cats[ai];
      const b=cats.find(c2=>c2.id===card.dataset.catId);
      if(a&&b&&_catSection(a)===_catSection(b)){
        cats.splice(ai,1);
        let bi=cats.findIndex(c2=>c2.id===b.id);
        if(card.dataset.dropBefore!=='1') bi++;
        cats.splice(bi,0,a);
        save();renderCatPage();
      }
    }
    _catDragId=null;
  });
  list.addEventListener('dragend',()=>{
    _catDragId=null;
    list.querySelectorAll('.cat-item').forEach(c2=>{ c2.style.opacity=''; c2.style.borderTop=''; c2.style.borderBottom=''; });
  });
}

function moveCatUp(id, ev){
  // v8.71 (FIX-183): kurzor po clampnutém scrollu zůstal nad JINOU kartou → klik přesměruj
  // na původně přesouvanou kategorii (stejný směr) = plynulé opakované klikání i u okraje stránky.
  // S16.15 (FIX-205 v3): redirect guard ZRUŠEN – přesměrovával kliky na dřívější kategorii
  //   („hýbe se pořád ta samá"). Šipky teď dělají přesně to, na co uživatel kliká;
  //   primární nástroj pro přeskládání je DRAG & DROP (⠿ úchyt).
  const cats=S.categories||[];
  const i=cats.findIndex(c=>c.id===id);
  if(i<0) return;
  // najdi PŘEDCHOZÍ kategorii ve stejné sekci (ne jen sousední prvek pole)
  let j=-1;
  for(let k=i-1;k>=0;k--){ if(_catSection(cats[k])===_catSection(cats[i])){ j=k; break; } }
  if(j<0) return; // už první ve své sekci
  [cats[i],cats[j]]=[cats[j],cats[i]];
  save();renderCatPage();
  _keepCatBtn(id,'up',ev);
}

function moveCatDown(id, ev){
  // v8.71 (FIX-183): kurzor po clampnutém scrollu zůstal nad JINOU kartou → klik přesměruj
  // na původně přesouvanou kategorii (stejný směr) = plynulé opakované klikání i u okraje stránky.
  // S16.15 (FIX-205 v3): redirect guard ZRUŠEN – přesměrovával kliky na dřívější kategorii
  //   („hýbe se pořád ta samá"). Šipky teď dělají přesně to, na co uživatel kliká;
  //   primární nástroj pro přeskládání je DRAG & DROP (⠿ úchyt).
  const cats=S.categories||[];
  const i=cats.findIndex(c=>c.id===id);
  if(i<0) return;
  let j=-1;
  for(let k=i+1;k<cats.length;k++){ if(_catSection(cats[k])===_catSection(cats[i])){ j=k; break; } }
  if(j<0) return; // už poslední ve své sekci
  [cats[i],cats[j]]=[cats[j],cats[i]];
  save();renderCatPage();
  _keepCatBtn(id,'down',ev);
}

// Po přesunu doroluj tak, aby kliknuté tlačítko zůstalo pod kurzorem → lze klikat opakovaně.
// S16.15: _catMoveGuard odstraněn (FIX-205 v3) – viz drag & drop níže
function _keepCatBtn(id, dir, ev){
  if(!ev || typeof ev.clientY!=='number') return;
  const targetY = ev.clientY;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const card = document.querySelector(`.cat-item[data-cat-id="${id}"]`);
    if(!card) return;
    const btn = card.querySelector(`[data-mv="${dir}"]`);
    if(!btn) return;
    const r = btn.getBoundingClientRect();
    const cur = r.top + r.height/2;
    const delta = cur - targetY;
    if(Math.abs(delta) < 1) return;
    const sc = _scrollParentEl(card);
    if(sc===window || sc===document.documentElement || sc===document.body){ window.scrollBy(0, delta); }
    else if(sc){ sc.scrollTop += delta; }
    // v8.68 (FIX-181): u horního okraje stránky se scroll nemá kam posunout (clamp) → kurzor
    // skončí nad JINOU kategorií a další klik „přeskočí". Detekuj a zvýrazni přesunutou kartu,
    // aby bylo jasné, kam se posunula.
    requestAnimationFrame(()=>{
      const r2 = btn.getBoundingClientRect();
      if(Math.abs((r2.top + r2.height/2) - targetY) > 8){
        // kompenzace se nevešla (horní okraj stránky) → kurzor je nad jinou kartou.
        // Zvýrazni přesunutou kartu a na 500 ms ignoruj klik na JINOU kategorii (anti-bounce).
        // S16.15: jen zvýraznit, kam se karta posunula (guard zrušen)
        card.style.transition='box-shadow .15s, outline .15s';
        card.style.outline='2px solid var(--bank)';
        card.style.boxShadow='0 0 0 4px rgba(96,165,250,.18)';
        setTimeout(()=>{ card.style.outline=''; card.style.boxShadow=''; }, 700);
      }
    });
  }));
}

function _scrollParentEl(node){
  let n=node && node.parentElement;
  while(n){
    const oy=getComputedStyle(n).overflowY;
    if((oy==='auto'||oy==='scroll') && n.scrollHeight>n.clientHeight+2) return n;
    n=n.parentElement;
  }
  return window;
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
  const isTransfer=(type==='transfer');
  const isIncome=(type==='income'||type==='both');
  // Přesun: skryj charakter příjmu/výdaje (nehodí se – není to spotřeba ani příjem, jen pohyb peněz)
  if(incRow) incRow.style.display=(isIncome&&!isTransfer)?'block':'none';
  if(stRow)  stRow.style.display=(isIncome&&!isTransfer)?'block':'none';
  if(expRow) expRow.style.display=((type==='expense'||type==='both')&&!isTransfer)?'block':'none';
  const liqRow=document.getElementById('catLiqRow');
  if(liqRow) liqRow.style.display=isTransfer?'block':'none';
  // v8.65: checkbox Spoření/investic POUZE u Přesunů (vklady do spoření/investic = S4 skóre).
  // Uložená hodnota u starých kategorií zůstává zachována, jen se needituje.
  // v8.71: Virtuální přesun je čistě informativní – nelze ho označit jako rezervu/investici
  const _isVirtual=((document.getElementById('catName')?.value||'').trim()==='Virtuální přesun');
  const savRow=document.getElementById('catIsSavingRow');
  if(savRow) savRow.style.display=(isTransfer&&!_isVirtual)?'flex':'none';
  const invRow=document.getElementById('catIsInvestRow');
  if(invRow) invRow.style.display=(isTransfer&&!_isVirtual)?'flex':'none'; // v8.70
  // Hint pro přesun
  let hint=document.getElementById('catTransferHint');
  if(isTransfer){
    if(!hint){
      hint=document.createElement('div');
      hint.id='catTransferHint';
      hint.style.cssText='font-size:.74rem;color:#a8aec8;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.3);border-radius:8px;padding:9px 11px;margin-top:8px;line-height:1.45';
      hint.innerHTML='🔄 <strong>Přesun</strong> – transakce v této kategorii se <strong>nepočítají jako výdaj</strong> (nesníží celkový majetek). Ukazují kolik peněz směřuje na investice, rezervu apod. Zůstatek peněženky se ale upraví (peníze reálně odešly).';
      const sel=document.getElementById('catType'); if(sel&&sel.parentElement) sel.parentElement.appendChild(hint);
    }
    hint.style.display='block';
  } else if(hint){ hint.style.display='none'; }
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

// v8.70: rezerva vs investice – vzájemně výlučné (kategorie boduje buď Rezervu, nebo Aktivní spoření)
function catSavInvChanged(which){
  const s=document.getElementById('catIsSaving'), i=document.getElementById('catIsInvest');
  if(which==='saving' && s?.checked && i) i.checked=false;
  if(which==='invest' && i?.checked && s) s.checked=false;
  updateCatPctInfo();
}

// v8.63: přehled rozdělených % v modalu kategorie – kolik je přiděleno a kolik zbývá do 100
function updateCatPctInfo(){
  const el=document.getElementById('catPctAllocInfo'); if(!el) return;
  const eid=document.getElementById('editCatId')?.value||'';
  const curVal=parseFloat(document.getElementById('catHealthPct')?.value)||0;
  const curSaving=!!document.getElementById('catIsSaving')?.checked || !!document.getElementById('catIsInvest')?.checked; // v8.70
  let expAlloc=0, savAlloc=0;
  (S.categories||[]).forEach(c=>{
    if(c.id===eid) return; // editovanou kategorii nahradí aktuální hodnota z pole
    if(!(c.type==='expense'||c.type==='both')) return;
    const p=parseFloat(c.healthPct)||0; if(p<=0) return;
    if(c.isSaving||c.isInvest) savAlloc+=p; else expAlloc+=p; // v8.70: investice = také minimum
  });
  if(curSaving) savAlloc+=curVal; else expAlloc+=curVal;
  const r2=v=>Math.round(v*100)/100;
  const totalAlloc=r2(expAlloc+savAlloc), remaining=r2(100-totalAlloc);
  el.innerHTML=`Rozděleno napříč kategoriemi: <strong style="color:var(--text)">${r2(expAlloc)} %</strong> výdaje`
    +(savAlloc>0?` + <strong style="color:var(--income)">${r2(savAlloc)} %</strong> spoření (min)`:'')
    +` · <strong style="color:${remaining<0?'var(--expense)':'#4ade80'}">${remaining<0?'překročeno o '+r2(-remaining):'zbývá '+remaining} %</strong> do 100 %`;
}

function openCatModal(){
  if(viewingUid)return;
  document.getElementById('editCatId').value='';
  document.getElementById('catName').value='';
  document.getElementById('catIcon').value='📋';
  document.getElementById('catColor').value='#4ade80';
  document.getElementById('catType').value='expense';
  { const lq=document.getElementById('catLiq'); if(lq) lq.value=''; }
  document.getElementById('catHealthPct').value='';
  document.getElementById('catHealthAmt').value='';
  document.getElementById('catIsSaving').checked=false;
  { const iv=document.getElementById('catIsInvest'); if(iv) iv.checked=false; } // v8.70
  const ic=document.getElementById('catIncomeChar'); if(ic) ic.value='';
  const ec=document.getElementById('catExpenseChar'); if(ec) ec.value='';
  const sl=document.getElementById('catStabilitySlider'); if(sl) sl.value=0;
  const lb=document.getElementById('catStabilityLabel'); if(lb) lb.textContent='0%';
  _catSubsList=[];
  catSubRender();
  catTypeChanged();
  document.getElementById('catModalTitle').textContent='Přidat kategorii';
  document.getElementById('modalCat').classList.add('open');
  updateCatPctInfo(); // v8.63
}

function editCat(id){
  if(viewingUid)return;
  const c=S.categories.find(x=>x.id===id);if(!c)return;
  document.getElementById('editCatId').value=id;
  document.getElementById('catName').value=c.name;
  document.getElementById('catIcon').value=c.icon;
  document.getElementById('catColor').value=c.color;
  document.getElementById('catType').value=c.type;
  { const lq=document.getElementById('catLiq'); if(lq) lq.value=c.liq||''; }
  document.getElementById('catHealthPct').value=c.healthPct||'';
  document.getElementById('catHealthAmt').value=c.healthAmt||'';
  document.getElementById('catIsSaving').checked=!!c.isSaving;
  { const iv=document.getElementById('catIsInvest'); if(iv) iv.checked=!!c.isInvest; } // v8.70
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
  updateCatPctInfo(); // v8.63
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
  const isInvest=!!document.getElementById('catIsInvest')?.checked; // v8.70
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
  const obj={name,icon,color,type,subs:[..._catSubsList],isSaving,isInvest,incomeChar,expenseChar,stable};
  if(type==='transfer'){ const lq=document.getElementById('catLiq')?.value||''; obj.liq = lq||null; } else { obj.liq=null; }
  if(healthPct!==null) obj.healthPct=healthPct; else obj.healthPct=null;
  if(healthAmt!==null) obj.healthAmt=healthAmt; else obj.healthAmt=null;
  if(stabilityWeight!==null) obj.stabilityWeight=stabilityWeight;

  if(eid){
    const c=S.categories.find(x=>x.id===eid);
    if(c){
      // Upozornění: přejmenování kategorie s COICOP nemění její COICOP zařazení
      const oldName = c.name;
      const cCoicop = c.coicop || (typeof DEFAULT_CATEGORIES!=='undefined' ? (DEFAULT_CATEGORIES.find(d=>d.id===eid)?.coicop) : null);
      if(oldName !== name && cCoicop && cCoicop>=1 && cCoicop<=13){
        const grp=(window.COICOP_GROUPS_DEF||[]).find(g=>String(g.id)===String(cCoicop));
        const grpName = grp ? grp.name : ('COICOP '+cCoicop);
        if(!confirm(`Měníš název „${oldName}" → „${name}".\n\nUpozornění: COICOP zařazení zůstává „${cCoicop}. ${grpName}". Nové transakce v této kategorii se budou počítat do této COICOP divize bez ohledu na nový název.\n\nPokud potřebuješ jiné COICOP zařazení, vytvoř raději novou kategorii.\n\nPokračovat v přejmenování?`)) return;
      }
      Object.assign(c,obj);
    }
  }
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
    <div class="family-stat"><div class="family-stat-label">Rodinné příjmy</div><div class="family-stat-val" style="color:var(--income)">${fmtB(familyInc)}</div></div>
    <div class="family-stat"><div class="family-stat-label">Rodinné výdaje</div><div class="family-stat-val" style="color:var(--expense)">${fmtB(familyExp)}</div></div>
    <div class="family-stat"><div class="family-stat-label">Rodinné saldo</div><div class="family-stat-val" style="color:${familyInc-familyExp>=0?'var(--income)':'var(--expense)'}">${fmtB(familyInc-familyExp)}</div></div>
    <div class="family-stat"><div class="family-stat-label">Celkový dluh</div><div class="family-stat-val" style="color:var(--debt)">${fmtB(familyDebt)}</div></div>
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
          <div style="background:var(--income-bg);border-radius:9px;padding:9px;border:1px solid rgba(74,222,128,.15)"><div style="font-size:.62rem;color:var(--text3);margin-bottom:2px">PŘÍJMY</div><div style="font-family:Syne,sans-serif;font-weight:700;color:var(--income);font-size:.9rem">${fmtB(inc)}</div></div>
          <div style="background:var(--expense-bg);border-radius:9px;padding:9px;border:1px solid rgba(248,113,113,.15)"><div style="font-size:.62rem;color:var(--text3);margin-bottom:2px">VÝDAJE</div><div style="font-family:Syne,sans-serif;font-weight:700;color:var(--expense);font-size:.9rem">${fmtB(exp)}</div></div>
          <div style="background:var(--bank-bg);border-radius:9px;padding:9px;border:1px solid rgba(96,165,250,.15)"><div style="font-size:.62rem;color:var(--text3);margin-bottom:2px">ÚSPORY</div><div style="font-family:Syne,sans-serif;font-weight:700;color:var(--bank);font-size:.9rem">${fmtB(bank)}</div></div>
          <div style="background:var(--debt-bg);border-radius:9px;padding:9px;border:1px solid rgba(251,191,36,.15)"><div style="font-size:.62rem;color:var(--text3);margin-bottom:2px">DLUHY</div><div style="font-family:Syne,sans-serif;font-weight:700;color:var(--debt);font-size:.9rem">${fmtB(debts)}</div></div>
        </div>
        ${topCats.length?`<div style="font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:6px">Top výdaje</div>${topCats.map(c=>`<div style="display:flex;justify-content:space-between;font-size:.8rem;padding:4px 0;border-bottom:1px solid var(--border)"><span>${c.icon} ${c.name}</span><strong>${fmtB(c.val)}</strong></div>`).join('')}`:''}
      </div>
    </div>`;
  });
  
  html+=`</div>`;
  el.innerHTML=html;
  _initCatDnD();  // S16.15: drag & drop přeskládání (listenery na kontejneru, přežijí re-render)
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
