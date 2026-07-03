//  HELPERS
// ══════════════════════════════════════════════════════
const fmt=n=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(n||0);

// ── COICOP skupiny – globální konstanta (Session 9, ADR-044)
// Definováno zde v helpers.js aby bylo dostupné ve stats.js, projects.js i receipts.js.
// receipts.js má vlastní kopii COICOP_GROUPS_DEF – při konfliktu má přednost tato (helpers.js se načítá dříve).
if(typeof COICOP_GROUPS_DEF === 'undefined'){
  window.COICOP_GROUPS_DEF = [
    {id:1,  name:'Potraviny a nealkoholické nápoje',     icon:'🛒', color:'#4ade80', avg_osoba:3300, avg_domacnost:7920, groups:['01.1 Potraviny','01.2 Nealkoholické nápoje']},
    {id:2,  name:'Alkoholické nápoje, tabák',            icon:'🍺', color:'#f59e0b', avg_osoba:620,  avg_domacnost:1490, groups:['02.1 Alkoholické nápoje','02.2 Služby pro výrobu alkoholu','02.3 Tabákové výrobky','02.4 Narkotika']},
    {id:3,  name:'Odívání a obuv',                       icon:'👗', color:'#f472b6', avg_osoba:700,  avg_domacnost:1680, groups:['03.1 Oděvy','03.2 Obuv']},
    {id:4,  name:'Bydlení, voda, energie, paliva',       icon:'🏠', color:'#60a5fa', avg_osoba:5200, avg_domacnost:12480, groups:['04.1 Nájemné z bytu','04.3 Běžná údržba a opravy bytu','04.4 Dodávka vody a jiné služby','04.5 Elektřina, plyn a ostatní paliva']},
    {id:5,  name:'Vybavení domácnosti, údržba',          icon:'🛋️', color:'#a78bfa', avg_osoba:1100, avg_domacnost:2640, groups:['05.1 Nábytek a vybavení','05.2 Bytový textil','05.3 Domácí spotřebiče','05.4 Sklo, nádobí a potřeby','05.5 Nářadí pro dům a zahradu','05.6 Běžná údržba domácnosti']},
    {id:6,  name:'Zdraví',                               icon:'💊', color:'#f87171', avg_osoba:900,  avg_domacnost:2160, groups:['06.1 Léčiva a zdravotnické potřeby','06.2 Ambulantní služby','06.3 Nemocniční služby']},
    {id:7,  name:'Doprava',                              icon:'🚗', color:'#fb923c', avg_osoba:2400, avg_domacnost:5760, groups:['07.1 Nákup vozidel','07.2 Provoz osobní dopravy','07.3 Dopravní služby']},
    {id:8,  name:'Informace a komunikace',               icon:'📱', color:'#34d399', avg_osoba:750,  avg_domacnost:1800, groups:['08.1 Poštovní služby','08.2 Telefon a zařízení','08.3 Internet a informační služby']},
    {id:9,  name:'Rekreace, sport a kultura',            icon:'🎭', color:'#e879f9', avg_osoba:1900, avg_domacnost:4560, groups:['09.1 Audiovizuální a IT zařízení','09.2 Sport, zahrada, mazlíčci','09.3 Rekreační a kulturní služby','09.4 Tisk, knihy, papírnictví','09.5 Dovolené (balíčky)']},
    {id:10, name:'Vzdělávání',                           icon:'📚', color:'#2dd4bf', avg_osoba:250,  avg_domacnost:600,  groups:['10.x Vzdělávání (předškolní až vysokoškolské)']},
    {id:11, name:'Stravování a ubytování',               icon:'🍽️', color:'#facc15', avg_osoba:1500, avg_domacnost:3600, groups:['11.1 Stravovací služby','11.2 Ubytovací služby']},
    {id:12, name:'Pojištění a finanční služby',          icon:'🛡️', color:'#94a3b8', avg_osoba:900,  avg_domacnost:2160, groups:['12.1 Pojištění','12.2 Finanční služby']},
    {id:13, name:'Osobní péče, sociální ochrana, různé', icon:'🧴', color:'#cbd5e1', avg_osoba:1100, avg_domacnost:2640, groups:['13.1 Osobní péče','13.2 Sociální ochrana','13.3 Jiné zboží a služby']},
  ];
}

// Session 10: 3. úroveň COICOP (třídy) – mapa „kód skupiny → třídy".
// Reprezentativní výběr dle CZ-COICOP 2018 (platná od 1.1.2024). Slouží pro
// rozklikávací strom oddíl → skupina → třída v Komunitním přehledu.
if(typeof window.COICOP_CLASSES === 'undefined'){
  window.COICOP_CLASSES = {
    '01.1':['01.1.1 Pekárenské výrobky a obiloviny','01.1.2 Maso','01.1.3 Ryby a mořské plody','01.1.4 Mléko, sýry a vejce','01.1.5 Oleje a tuky','01.1.6 Ovoce','01.1.7 Zelenina','01.1.8 Cukr, marmeláda, sladkosti','01.1.9 Ostatní potravinářské výrobky'],
    '01.2':['01.2.1 Káva, čaj a kakao','01.2.2 Minerální vody, nealko nápoje, šťávy'],
    '02.1':['02.1.1 Lihoviny','02.1.2 Víno','02.1.3 Pivo'],
    '02.3':['02.3.0 Tabákové výrobky'],
    '03.1':['03.1.1 Oděvní materiály','03.1.2 Oděvy','03.1.3 Ostatní oděvní doplňky','03.1.4 Čištění a opravy oděvů'],
    '03.2':['03.2.1 Obuv','03.2.2 Opravy obuvi'],
    '04.1':['04.1.1 Skutečné nájemné za bydlení'],
    '04.3':['04.3.1 Materiály pro údržbu bytu','04.3.2 Služby pro údržbu bytu'],
    '04.4':['04.4.1 Dodávka vody','04.4.2 Sběr odpadu','04.4.3 Stočné','04.4.4 Ostatní služby bydlení'],
    '04.5':['04.5.1 Elektřina','04.5.2 Plyn','04.5.3 Tekutá paliva','04.5.4 Tuhá paliva','04.5.5 Teplo'],
    '05.1':['05.1.1 Nábytek a bytové zařízení','05.1.2 Koberce a podlahové krytiny'],
    '05.3':['05.3.1 Velké domácí spotřebiče','05.3.2 Malé domácí spotřebiče','05.3.3 Opravy spotřebičů'],
    '06.1':['06.1.1 Léčiva','06.1.2 Ostatní zdravotnické výrobky','06.1.3 Léčebné a protetické přístroje'],
    '06.2':['06.2.1 Lékařské služby','06.2.2 Stomatologické služby','06.2.3 Paramedicínské služby'],
    '07.1':['07.1.1 Motorová vozidla','07.1.2 Motocykly','07.1.3 Jízdní kola'],
    '07.2':['07.2.1 Náhradní díly','07.2.2 Pohonné hmoty a maziva','07.2.3 Údržba a opravy','07.2.4 Ostatní služby'],
    '07.3':['07.3.1 Železniční doprava','07.3.2 Silniční doprava','07.3.3 Letecká doprava','07.3.4 Vodní doprava'],
    '08.2':['08.2.1 Telefonní přístroje','08.2.2 Telefonní služby'],
    '08.3':['08.3.1 Internetové připojení','08.3.2 Balíčky telekomunikačních služeb'],
    '09.1':['09.1.1 Audiovizuální zařízení','09.1.2 Počítače a příslušenství','09.1.3 Nosiče a software'],
    '09.2':['09.2.1 Sportovní a kempinkové vybavení','09.2.2 Zahrada a domácí mazlíčci'],
    '09.3':['09.3.1 Rekreační a sportovní služby','09.3.2 Kulturní služby (kino, divadlo)'],
    '09.4':['09.4.1 Knihy','09.4.2 Noviny a časopisy','09.4.3 Papírenské zboží'],
    '11.1':['11.1.1 Restaurace, kavárny','11.1.2 Jídelny a závodní stravování'],
    '11.2':['11.2.0 Ubytovací služby'],
    '12.1':['12.1.1 Životní pojištění','12.1.2 Pojištění bydlení','12.1.3 Pojištění zdraví','12.1.4 Pojištění dopravy'],
    '12.2':['12.2.1 Poplatky finančních institucí','12.2.2 Ostatní finanční služby'],
    '13.1':['13.1.1 Kadeřnictví a osobní péče','13.1.2 Elektrické přístroje pro péči','13.1.3 Výrobky pro osobní péči'],
    '13.3':['13.3.1 Jiné osobní potřeby','13.3.2 Sociální ochrana','13.3.3 Ostatní služby'],
  };
}

// Formátování s desetinnými místy – pro účtenky a transakce
const fmtP=n=>{
  const num=parseFloat(n)||0;
  // Pokud je celé číslo, zobraz bez desetinných míst
  if(Number.isInteger(num)) return new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(num);
  // Jinak zobraz max 2 desetinná místa
  return new Intl.NumberFormat('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2}).format(num);
};
const fmtD=s=>new Date(s).toLocaleDateString('cs-CZ',{day:'numeric',month:'short'});
const getCat=(id,cats)=>(cats||getData().categories||[]).find(c=>c.id===id)||{name:'?',icon:'📋',color:'#666',subs:[]};
const uid=()=>'id'+Date.now()+Math.random().toString(36).slice(2,6);
// FIX-056: Generátor numerických ID transakcí odolný proti kolizím.
// Date.now() vrací ms-přesné timestampy → při batch importu nebo dvojkliku se může opakovat.
// Přidáme 4-bit random suffix (0-15) → 16× nižší šance kolize ve stejné ms.
// Číslo zůstane bezpečně v Number rangu (max ~5e16, JS limit 2^53 ≈ 9e15... ale skutečné Date.now()*16 ~2.7e13).
function genTxId(){return Date.now()*16+Math.floor(Math.random()*16);}
function hexA(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;}
const getTx=(m,y,data)=>{const D=data||getData();return(D.transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===(m!==undefined?m:S.curMonth)&&d.getFullYear()===(y!==undefined?y:S.curYear);});};
// FIX-069 (Session 8): isBalancing transakce (EUR vyrovnávací úhrady) se nepočítají do příjmů/výdajů.
// Jsou evidovány v databázi pro úplnost výpisu, ale nesmí ovlivnit finanční statistiky.
const incSum=txs=>txs.filter(t=>t.type==='income'&&!t.isBalancing).reduce((a,t)=>a+(t.amount||t.amt||0),0);
const expSum=txs=>txs.filter(t=>t.type==='expense'&&!t.isBalancing).reduce((a,t)=>a+(t.amount||t.amt||0),0);
// FIX-073 (Session 8): getActual opraveno - čte t.amount||t.amt||0 (PDF transakce mají 'amount', starší mají 'amt').
// Původně čteno jen t.amt → transakce z PDF importu byly ignorovány (vrátilo 0) → Treemap prázdná, výdaje chybí.
// Také přidán isBalancing filter – vyrovnávací transakce se nezapočítávají.
const getActual=(catId,sub,m,y,data)=>{const D=data||getData();return(D.transactions||[]).filter(t=>t.type==='expense'&&!t.isBalancing&&t.catId===catId&&(!sub||t.subcat===sub)).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;}).reduce((a,t)=>a+(t.amount||t.amt||0),0);};
const isPast=(m,y)=>{const n=new Date();return y<n.getFullYear()||(y===n.getFullYear()&&m<n.getMonth());};
const isCur=(m,y)=>{const n=new Date();return m===n.getMonth()&&y===n.getFullYear();};
// Vrátí transakce v rozsahu dat (fromDate, toDate = 'YYYY-MM-DD' string nebo Date objekt)
const getTxByRange=(fromDate,toDate,data)=>{const D=data||getData();const from=new Date(fromDate);const to=new Date(toDate);to.setHours(23,59,59,999);return(D.transactions||[]).filter(t=>{const d=new Date(t.date);return d>=from&&d<=to;});};
// Vrátí pole {m, y} objektů pro každý měsíc v rozsahu
function getMonthsInRange(fromDate,toDate){const result=[];const from=new Date(fromDate);const to=new Date(toDate);let m=from.getMonth(),y=from.getFullYear();while(y<to.getFullYear()||(y===to.getFullYear()&&m<=to.getMonth())){result.push({m,y});if(++m>11){m=0;y++;}}return result;}
function getCurInst(debt){const now=`${S.curYear}-${String(S.curMonth+1).padStart(2,'0')}`;let a=debt.installments[0]?.amt||0;for(const i of debt.installments)if(i.from<=now)a=i.amt;return a;}

// ══════════════════════════════════════════════════════
//  PREDICTION ENGINE
// ══════════════════════════════════════════════════════
function getHistAvg(catId,sub,forM,forY,data){
  const D=data||getData();
  const byMonth={};
  (D.transactions||[]).filter(t=>{
    if(t.type!=='expense'||t.catId!==catId)return false;
    if(sub&&t.subcat!==sub)return false;
    const d=new Date(t.date),dm=d.getMonth(),dy=d.getFullYear();
    if(dy>forY||(dy===forY&&dm>=forM))return false;
    return true;
  }).forEach(t=>{
    const d=new Date(t.date);const k=`${d.getFullYear()}-${d.getMonth()}`;
    byMonth[k]=(byMonth[k]||0)+t.amt;
  });
  const vals=Object.values(byMonth);
  if(!vals.length)return null;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function predictCat(catId,sub,m,y,data){
  const D=data||getData();
  let avg=getHistAvg(catId,sub,m,y,D);
  if(avg===null){
    const curExp=getTx(S.curMonth,S.curYear,D).filter(t=>t.type==='expense'&&t.catId===catId&&(!sub||t.subcat===sub)).reduce((a,t)=>a+t.amt,0);
    if(!curExp)return null;
    avg=curExp;
  }
  const seasMult=SEASON[m]?.mult||1;
  let bdayBoost=0;
  const cat=getCat(catId,D.categories);
  if(cat.name&&cat.name.toLowerCase().includes('dárek')){
    const bdays=(D.birthdays||[]).filter(b=>b.month-1===m);
    bdayBoost=bdays.reduce((a,b)=>a+(b.gift||0),0);
  }
  return Math.round(avg*seasMult)+bdayBoost;
}

// ══════════════════════════════════════════════════════
//  YEAR FORECAST – součet skutečnosti (minulé+aktuální měsíce) + predikce (budoucí měsíce)
//  Vrací "Předpoklad YTD" – kolik kategorie utratí za celý rok
// ══════════════════════════════════════════════════════
function computeYearForecast(catId, sub, year, data) {
  const D = data || getData();
  let total = 0;
  for (let m = 0; m < 12; m++) {
    const past = isPast(m, year);
    const cur = isCur(m, year);
    if (past || cur) {
      // Použij skutečnost
      total += getActual(catId, sub, m, year, D) || 0;
    } else {
      // Použij predikci pro budoucí měsíce
      total += predictCat(catId, sub, m, year, D) || 0;
    }
  }
  return Math.round(total);
}

// ══════════════════════════════════════════════════════
//  BANK
// ══════════════════════════════════════════════════════
function computeBank(data){
  const D=data||getData();
  const start=D.bank?.startBalance||0;
  const monthKeys=new Set();
  (D.transactions||[]).forEach(t=>{const d=new Date(t.date);monthKeys.add(`${d.getFullYear()}_${d.getMonth()}`);});
  let total=start;
  monthKeys.forEach(key=>{
    const[y,m]=key.split('_').map(Number);
    if(y>S.curYear||(y===S.curYear&&m>S.curMonth))return;
    const txs=getTx(m,y,D);total+=incSum(txs)-expSum(txs);
  });
  return total;
}
function bankSeries(n,data){
  const D=data||getData();
  const start=D.bank?.startBalance||0;
  const allM=new Set();
  (D.transactions||[]).forEach(t=>{const d=new Date(t.date);allM.add(`${d.getFullYear()}_${d.getMonth()}`);});
  const arr=[];
  for(let i=n-1;i>=0;i--){
    let m=S.curMonth-i,y=S.curYear;if(m<0){m+=12;y--;}
    let bal=start;
    allM.forEach(key=>{const[ky,km]=key.split('_').map(Number);if(ky>y||(ky===y&&km>m))return;const txs=getTx(km,ky,D);bal+=incSum(txs)-expSum(txs);});
    const txs=getTx(m,y,D);
    arr.push({m,y,label:CZ_M[m].slice(0,3),balance:bal,saldo:incSum(txs)-expSum(txs)});
  }
  return arr;
}

// ══════════════════════════════════════════════════════
//  NAV
// ══════════════════════════════════════════════════════
function showPage(name,el){
  curPage=name;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(el)el.classList.add('active');
  document.getElementById('pageTitle').textContent=PAGE_TITLES[name]||name;
  const _mn=document.querySelector('.month-nav');
  if(_mn)_mn.style.display=(name==='import'||name==='grafy')?'none':'';
  // GA4 page tracking
  if(typeof gtag==='function') gtag('event','page_view',{page_title:PAGE_TITLES[name]||name,page_location:'/app/'+name});
  const fab=document.getElementById('mainFab');
  if(fab)fab.style.display=(name==='transakce'&&viewingUid===null)?'flex':'none';
  if(window.innerWidth<900)document.getElementById('sidebar').classList.remove('open');
  // Grafy potřebují čekat na CSS reflow (display:none → block)
  if(name==='grafy'){
    requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>_rp_force(),50)));
  } else {
    _rp_force();
  }
}
function showPageByName(name){
  curPage=name;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name)?.classList.add('active');
  document.getElementById('pageTitle').textContent=PAGE_TITLES[name]||name;
  const _mn2=document.querySelector('.month-nav'); if(_mn2)_mn2.style.display=(name==='import'||name==='grafy')?'none':'';
  document.querySelectorAll('.nav-item').forEach(n=>{if(n.getAttribute('onclick')?.includes(`'${name}'`))n.classList.add('active');else n.classList.remove('active');});
  _rp_force();
}
function changeMonth(d){S.curMonth+=d;if(S.curMonth<0){S.curMonth=11;S.curYear--;}if(S.curMonth>11){S.curMonth=0;S.curYear++;}updateMLabel();_rp_force();}
// Session 10: alias – vynutí render i přes anti-flicker guard (uživatelská akce).
function _rp_force(){ if(typeof forceRender==='function') forceRender(); else renderPage(); }
function updateMLabel(){document.getElementById('mlabel').textContent=`${CZ_M[S.curMonth]} ${S.curYear}`;}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');}

// ══════════════════════════════════════════════════════

// ── TODO-082: COICOP agregáty ──
function computeCoicopAggregates(txs, D) {
  const defMap = Object.fromEntries((typeof DEFAULT_CATEGORIES!=='undefined'?DEFAULT_CATEGORIES:[]).map(d=>[d.id,d]));
  const result = {};
  let unassigned = 0;
  (txs||[]).forEach(tx => {
    if(tx.type !== 'expense') return;
    if(tx.isBalancing) return;
    const catId = tx.catId || tx.category || '';
    const amt = Math.abs(tx.amount || tx.amt || 0);
    if(amt <= 0) return;
    const defCat = defMap[catId];
    let coicop = defCat?.coicop || null;
    if(defCat?.coicopOverrides && tx.subcat && defCat.coicopOverrides[tx.subcat]) {
      coicop = defCat.coicopOverrides[tx.subcat];
    }
    if(!coicop) {
      const userCat = (D?.categories||[]).find(c=>c.id===catId);
      if(userCat?.coicop) coicop = userCat.coicop;
    }
    if(coicop && coicop >= 1 && coicop <= 13) {
      result[coicop] = (result[coicop]||0) + amt;
    } else {
      unassigned += amt;
    }
  });
  return {cats: result, unassigned: Math.round(unassigned)};
}

async function uploadCoicopToFirebase(month, year, D) {
  try {
    if(!window._currentUser || !window._db) return;
    const uid = window._currentUser.uid;
    const txs = getTx(month, year, D);
    const income = incSum(txs);
    const exp = expSum(txs);
    if(exp <= 0) return;
    const {cats, unassigned} = computeCoicopAggregates(txs, D);
    const monthKey = `${year}-${String(month+1).padStart(2,'0')}`;
    await _set(_ref(_db, `community/${monthKey}/users/${uid}`), {
      totalExp: Math.round(exp), income: Math.round(income),
      savingRate: income > 0 ? Math.round((income-exp)/income*100) : 0,
      cats, unassigned, updatedAt: Date.now(),
    });
  } catch(e) { console.warn('uploadCoicop failed:', e?.message); }
}

// ══════════════════════════════════════════════════════
//  UI HELPERY (Session 11) – proti duplikaci inline HTML
//  Vzor: render funkce skládají HTML z těchto helperů místo
//  opakovaného psaní stejných <div style="...">. Compute funkce
//  počítají hodnoty zvlášť a sem posílají jen hotová čísla/texty.
// ══════════════════════════════════════════════════════

// Jedna stat-karta (hodnota + popisek). color = CSS proměnná/hex.
// opts: {sub, onclick, valueIsHtml}
function statCard(value, label, color, opts = {}) {
  const c = color || 'var(--text)';
  const val = opts.valueIsHtml ? value : escHtml(value);
  const click = opts.onclick ? ` onclick="${opts.onclick}" style="cursor:pointer"` : '';
  return `<div class="stat-card-h"${click} style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border)">
    <div style="font-size:1.4rem;font-weight:700;font-family:'Syne',sans-serif;color:${c}">${val}</div>
    <div style="font-size:.72rem;color:#a8aec8">${escHtml(label)}</div>
    ${opts.sub ? `<div style="font-size:.66rem;color:#8b90a8;margin-top:2px">${escHtml(opts.sub)}</div>` : ''}
  </div>`;
}

// Mřížka stat-karet. cards = [{value,label,color,...opts}]. cols = počet sloupců.
function statGrid(cards, cols = 3) {
  return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px">
    ${cards.map(c => statCard(c.value, c.label, c.color, c)).join('')}
  </div>`;
}

// Prázdný stav (ikona + titulek + volitelný popis).
function emptyState(icon, title, desc) {
  return `<div class="empty">
    <div class="ei">${icon || '📭'}</div>
    <div class="et">${escHtml(title || '')}</div>
    ${desc ? `<div style="font-size:.78rem;color:#a8aec8;margin-top:4px">${escHtml(desc)}</div>` : ''}
  </div>`;
}

// Karta se záhlavím (title) a tělem (bodyHtml).
function sectionCard(title, bodyHtml, opts = {}) {
  const right = opts.headerRight ? opts.headerRight : '';
  return `<div class="card"${opts.style ? ` style="${opts.style}"` : ''}>
    <div class="card-header"><span class="card-title">${title}</span>${right}</div>
    <div class="card-body"${opts.bodyStyle ? ` style="${opts.bodyStyle}"` : ''}>${bodyHtml}</div>
  </div>`;
}

// Bezpečný escape pro vkládání textu do HTML (sdílený helper).
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
