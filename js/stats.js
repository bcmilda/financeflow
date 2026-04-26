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
function renderCatPage(){
  const D=getData();const ro=viewingUid!==null;
  const el=document.getElementById('catList');if(!el)return;
  if(!(D.categories||[]).length){el.innerHTML='<div class="empty"><div class="et">Žádné kategorie</div></div>';return;}
  el.innerHTML=(D.categories||[]).map(c=>{
    const isIncome=c.type==='income'||c.type==='both';
    const isStable=c.stable===true;
    return `<div class="cat-item">
      <div class="cat-icon-big" style="background:${hexA(c.color,.15)}">${c.icon}</div>
      <div class="cat-info">
        <div class="cat-name">${c.name} <span style="font-size:.68rem;color:var(--text3)">${c.type==='income'?'příjem':c.type==='both'?'oboje':'výdaj'}</span></div>
        <div class="cat-subs">${(c.subs||[]).join(' · ')||'bez podkategorií'}</div>
        ${isIncome&&!ro?`<div style="margin-top:5px"><span class="stable-toggle ${isStable?'active':''}" onclick="toggleCatStable('${c.id}')">${isStable?'✅ Stabilní příjem':'⚪ Nestabilní příjem'}</span></div>`:''}
      </div>
      ${!ro?`<div style="display:flex;gap:4px"><button class="btn btn-edit btn-icon btn-sm" onclick="editCat('${c.id}')">✎</button><button class="btn btn-danger btn-icon btn-sm" onclick="deleteCat('${c.id}')">✕</button></div>`:''}
    </div>`;
  }).join('');
}
function toggleCatStable(id){
  const c=(S.categories||[]).find(x=>x.id===id);if(!c)return;
  c.stable=!c.stable;
  save();renderCatPage();
}
function openCatModal(){
  if(viewingUid)return;
  ['editCatId','catName','catSubs','catHealthPct','catHealthAmt'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('catIcon').value='📋';
  document.getElementById('catColor').value='#4ade80';
  document.getElementById('catType').value='expense';
  document.getElementById('catIsSaving').checked=false;
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
  document.getElementById('catSubs').value=(c.subs||[]).join(', ');
  document.getElementById('catHealthPct').value=c.healthPct||'';
  document.getElementById('catHealthAmt').value=c.healthAmt||'';
  document.getElementById('catIsSaving').checked=!!c.isSaving;
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
  const subs=document.getElementById('catSubs').value.split(',').map(s=>s.trim()).filter(Boolean);
  const healthPct=parseFloat(document.getElementById('catHealthPct').value)||null;
  const healthAmt=parseFloat(document.getElementById('catHealthAmt').value)||null;
  const isSaving=document.getElementById('catIsSaving').checked;
  if(!name){alert('Zadej název');return;}
  const obj={name,icon,color,type,subs,healthPct,healthAmt,isSaving};
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
