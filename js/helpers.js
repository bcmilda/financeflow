//  HELPERS
// ══════════════════════════════════════════════════════
const fmt=n=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(n||0);

// ── COICOP skupiny – globální konstanta (Session 9, ADR-044)
// Definováno zde v helpers.js aby bylo dostupné ve stats.js, projects.js i receipts.js.
// receipts.js má vlastní kopii COICOP_GROUPS_DEF – při konfliktu má přednost tato (helpers.js se načítá dříve).
if(typeof COICOP_GROUPS_DEF === 'undefined'){
  window.COICOP_GROUPS_DEF = [
    {id:1,  name:'Potraviny a nealk. nápoje',  icon:'🛒', color:'#4ade80', avg_osoba:3300, avg_domacnost:7800},
    {id:2,  name:'Alkohol a tabák',             icon:'🍺', color:'#f59e0b', avg_osoba:310,  avg_domacnost:730},
    {id:3,  name:'Oblečení a obuv',             icon:'👗', color:'#f472b6', avg_osoba:400,  avg_domacnost:940},
    {id:4,  name:'Bydlení a energie',           icon:'🏠', color:'#60a5fa', avg_osoba:4000, avg_domacnost:9500},
    {id:5,  name:'Vybavení domácnosti',         icon:'🛋️', color:'#a78bfa', avg_osoba:500,  avg_domacnost:1200},
    {id:6,  name:'Zdraví',                      icon:'💊', color:'#f87171', avg_osoba:500,  avg_domacnost:1100},
    {id:7,  name:'Doprava',                     icon:'🚗', color:'#fb923c', avg_osoba:1800, avg_domacnost:4200},
    {id:8,  name:'Komunikace',                  icon:'📱', color:'#34d399', avg_osoba:350,  avg_domacnost:820},
    {id:9,  name:'Rekreace a kultura',          icon:'🎭', color:'#e879f9', avg_osoba:1100, avg_domacnost:2600},
    {id:10, name:'Vzdělávání',                  icon:'📚', color:'#2dd4bf', avg_osoba:150,  avg_domacnost:350},
    {id:11, name:'Restaurace a ubytování',      icon:'🍽️', color:'#facc15', avg_osoba:600,  avg_domacnost:1400},
    {id:12, name:'Ostatní zboží a služby',      icon:'💼', color:'#94a3b8', avg_osoba:400,  avg_domacnost:950},
    {id:13, name:'Transfery a ostatní',         icon:'↔️', color:'#cbd5e1', avg_osoba:200,  avg_domacnost:470},
  ];
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
  const fab=document.getElementById('mainFab');
  if(fab)fab.style.display=(name==='transakce'&&viewingUid===null)?'flex':'none';
  if(window.innerWidth<900)document.getElementById('sidebar').classList.remove('open');
  // Grafy potřebují čekat na CSS reflow (display:none → block)
  if(name==='grafy'){
    requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>renderPage(),50)));
  } else {
    renderPage();
  }
}
function showPageByName(name){
  curPage=name;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name)?.classList.add('active');
  document.getElementById('pageTitle').textContent=PAGE_TITLES[name]||name;
  document.querySelectorAll('.nav-item').forEach(n=>{if(n.getAttribute('onclick')?.includes(`'${name}'`))n.classList.add('active');else n.classList.remove('active');});
  renderPage();
}
function changeMonth(d){S.curMonth+=d;if(S.curMonth<0){S.curMonth=11;S.curYear--;}if(S.curMonth>11){S.curMonth=0;S.curYear++;}updateMLabel();renderPage();}
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
