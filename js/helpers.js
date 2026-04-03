//  HELPERS
// ══════════════════════════════════════════════════════
const fmt=n=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(n||0);
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
function hexA(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;}
const getTx=(m,y,data)=>{const D=data||getData();return(D.transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===(m!==undefined?m:S.curMonth)&&d.getFullYear()===(y!==undefined?y:S.curYear);});};
const incSum=txs=>txs.filter(t=>t.type==='income').reduce((a,t)=>a+(t.amount||t.amt||0),0);
const expSum=txs=>txs.filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||t.amt||0),0);
const getActual=(catId,sub,m,y,data)=>{const D=data||getData();return(D.transactions||[]).filter(t=>t.type==='expense'&&t.catId===catId&&(!sub||t.subcat===sub)).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;}).reduce((a,t)=>a+(t.amount||t.amt||0),0);};
const isPast=(m,y)=>{const n=new Date();return y<n.getFullYear()||(y===n.getFullYear()&&m<n.getMonth());};
const isCur=(m,y)=>{const n=new Date();return m===n.getMonth()&&y===n.getFullYear();};
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
// ══════════════════════════════════════════════════════
//  PREDIKČNÍ SYSTÉM v2 – Personalizované učení (v6.41)
// ══════════════════════════════════════════════════════
//
// ARCHITEKTURA:
// 1. computePersonalSeason(catId, D) → sezónní koeficienty z vlastní historie
// 2. detectTrend(catId, D) → rostoucí/klesající/stabilní výdaje
// 3. predictCatV2() → nahrazuje starý predictCat, používá personal season
// 4. computeYearForecast() → "Předpoklad YTD" = actual + predikce zbytku roku

/**
 * Z vlastní historie spočítá sezónní koeficienty per měsíc.
 * Výsledek: pole 12 čísel, kde 1.0 = průměr.
 * Vyžaduje min. 2 roky dat, jinak vrátí globální SEASON.
 */
function computePersonalSeason(catId, sub, D) {
  const txs = (D.transactions || []).filter(t => {
    if (t.type !== 'expense' || t.catId !== catId) return false;
    if (sub && t.subcat !== sub) return false;
    return true;
  });

  if (!txs.length) return null;

  // Seskup po měsících × roce
  const byYearMonth = {}; // "2024-3" → suma
  txs.forEach(t => {
    const d = new Date(t.date);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    byYearMonth[k] = (byYearMonth[k] || 0) + (t.amount || t.amt || 0);
  });

  // Spočítej kolik různých roků máme
  const years = [...new Set(Object.keys(byYearMonth).map(k => k.split('-')[0]))];
  if (years.length < 2) return null; // Málo dat – použij globální SEASON

  // Průměr per měsíc přes všechny roky
  const monthSums = Array(12).fill(0);
  const monthCounts = Array(12).fill(0);
  Object.entries(byYearMonth).forEach(([k, v]) => {
    const m = parseInt(k.split('-')[1]);
    monthSums[m] += v;
    monthCounts[m]++;
  });

  const monthAvgs = monthSums.map((s, m) => monthCounts[m] > 0 ? s / monthCounts[m] : null);
  const validAvgs = monthAvgs.filter(v => v !== null);
  if (!validAvgs.length) return null;

  const overallAvg = validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length;
  if (!overallAvg) return null;

  // Koeficienty: měsíční průměr / celkový průměr
  // Kde nemáme data → fallback na globální SEASON
  return monthAvgs.map((avg, m) => {
    if (avg === null) return SEASON[m]?.mult || 1;
    return avg / overallAvg;
  });
}

/**
 * Detekuje trend výdajů (poslední 3 vs předchozí 3 měsíce).
 * Vrátí: { trend: 'up'|'down'|'stable', pct: číslo }
 */
function detectTrend(catId, sub, D) {
  const now = new Date();
  const vals = [];

  for (let i = 5; i >= 0; i--) {
    let m = now.getMonth() - i;
    let y = now.getFullYear();
    if (m < 0) { m += 12; y--; }
    const sum = (D.transactions || [])
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && t.catId === catId &&
               (!sub || t.subcat === sub) &&
               d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((a, t) => a + (t.amount || t.amt || 0), 0);
    vals.push(sum);
  }

  const older = vals.slice(0, 3).filter(v => v > 0);
  const newer = vals.slice(3).filter(v => v > 0);
  if (!older.length || !newer.length) return { trend: 'stable', pct: 0 };

  const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
  const avgNewer = newer.reduce((a, b) => a + b, 0) / newer.length;
  const pct = avgOlder > 0 ? Math.round((avgNewer - avgOlder) / avgOlder * 100) : 0;

  return {
    trend: pct > 8 ? 'up' : pct < -8 ? 'down' : 'stable',
    pct,
    avgOlder: Math.round(avgOlder),
    avgNewer: Math.round(avgNewer)
  };
}

/**
 * Hlavní predikční funkce v2 – nahrazuje starý predictCat.
 * Používá personalizované sezónní koeficienty + trend detekci.
 */
function predictCat(catId, sub, m, y, data) {
  const D = data || getData();

  // Základ: historický průměr (bez sezónnosti)
  let baseAvg = getHistAvg(catId, sub, m, y, D);

  if (baseAvg === null) {
    // Žádná historie → zkus aktuální měsíc jako základ
    const curExp = getTx(S.curMonth, S.curYear, D)
      .filter(t => t.type === 'expense' && t.catId === catId &&
                   (!sub || t.subcat === sub))
      .reduce((a, t) => a + (t.amount || t.amt || 0), 0);
    if (!curExp) return null;
    baseAvg = curExp;
  }

  // Sezónní koeficient: personal (pokud ≥2 roky dat) nebo globální
  const personalSeason = computePersonalSeason(catId, sub, D);
  let seasMult;

  if (personalSeason) {
    // Blend: 80% personal + 20% globální (pro stabilitu)
    const globalMult = SEASON[m]?.mult || 1;
    seasMult = personalSeason[m] * 0.8 + globalMult * 0.2;
  } else {
    seasMult = SEASON[m]?.mult || 1;
  }

  // Trend korekce: pokud výdaje rostou/klesají, zohledni to
  const trendInfo = detectTrend(catId, sub, D);
  let trendMult = 1;
  if (trendInfo.trend === 'up')   trendMult = 1 + Math.min(trendInfo.pct / 100 * 0.5, 0.15); // max +15%
  if (trendInfo.trend === 'down') trendMult = 1 + Math.max(trendInfo.pct / 100 * 0.5, -0.15); // max -15%

  // Narozeninový boost (pro kategorie dárků)
  const cat = getCat(catId, D.categories);
  let bdayBoost = 0;
  if (cat.name && cat.name.toLowerCase().includes('dárek')) {
    const bdays = (D.birthdays || []).filter(b => b.month - 1 === m);
    bdayBoost = bdays.reduce((a, b) => a + (b.gift || 0), 0);
  }

  return Math.round(baseAvg * seasMult * trendMult) + bdayBoost;
}

/**
 * Spočítá "Předpoklad YTD" pro celý rok:
 * = suma skutečných výdajů (minulé měsíce) + predikce (budoucí měsíce)
 */
function computeYearForecast(catId, sub, year, D) {
  let total = 0;
  const now = new Date();
  const curM = now.getMonth();
  const curY = now.getFullYear();

  for (let m = 0; m < 12; m++) {
    const isPastMonth = year < curY || (year === curY && m < curM);
    const isCurrentMonth = year === curY && m === curM;

    if (isPastMonth || isCurrentMonth) {
      // Skutečná data
      total += getActual(catId, sub, m, year, D);
    } else {
      // Predikce
      const pred = predictCat(catId, sub, m, year, D);
      if (pred) total += pred;
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
  renderPage();
  if(window.innerWidth<900)document.getElementById('sidebar').classList.remove('open');
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
