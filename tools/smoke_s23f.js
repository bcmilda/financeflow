const fs=require('fs');const PJ=fs.readFileSync('projects.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=n=>{const a=PJ.indexOf('function '+n+'(');let i=PJ.indexOf('{',a),d=0;for(;i<PJ.length;i++){if(PJ[i]==='{')d++;else if(PJ[i]==='}'){d--;if(!d)break;}}return PJ.slice(a,i+1);};
const g=n=>eval(cut(n).replace('function '+n,'global.'+n+'=function'));
global._settings={firstDay:18,payFreq:'monthly'};
global.isTransferTx=t=>!!t.transferId; global.txCZK=t=>t.amount;
global.radarAdjustWeekend=d=>{const w=d.getDay(); if(w===6)d.setDate(d.getDate()-1); if(w===0)d.setDate(d.getDate()-2); return d;};
global.radarDetectPaydayDay=()=>18;
['radarPaydayInfo','radarPaydayForMonth'].forEach(g);
const D={transactions:[
  {date:'2026-08-18',type:'income',amount:30000},
  {date:'2026-09-18',type:'income',amount:30000},
]};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dnes=new Date(); dnes.setHours(0,0,0,0);

// bez refDate = jako dřív
const P0=radarPaydayInfo(D); T('bez referenčního data počítá od dneška (zpětná kompatibilita)', P0.today.getTime()===dnes.getTime());

// s refDate
const P1=radarPaydayInfo(D,new Date(2026,7,31));
T('reference 31. 8. → cyklus 18. 8. → 18. 9.', iso(P1.lastPayday)==='2026-08-18' && iso(P1.nextPayday)==='2026-09-18');
T('reference se propíše do P.today', iso(P1.today)==='2026-08-31');

// přepínač měsíce – minulý měsíc
global.S={curMonth:dnes.getMonth(),curYear:dnes.getFullYear()};
const pm=new Date(dnes.getFullYear(),dnes.getMonth()-2,1);   // o 2 měsíce zpět = cyklus určitě uzavřený
S.curMonth=pm.getMonth(); S.curYear=pm.getFullYear();
const DP={transactions:[{date:iso(new Date(pm.getFullYear(),pm.getMonth(),18)),type:'income',amount:30000}]};
const r=radarPaydayForMonth(DP);
T('minulý měsíc → režim „past"', r.mode==='past');
T('uzavřený cyklus: 0 dní do výplaty, celý cyklus odžitý', r.P.closed===true && r.P.daysLeft===0 && r.P.dayInCycle===r.P.cycleDays);
T('cyklus začíná výplatou ve zvoleném měsíci', r.P.lastPayday.getMonth()===pm.getMonth() && r.P.lastPayday.getDate()===18);
T('P.today = den před další výplatou (cyklus do konce)', (r.P.nextPayday - r.P.today)===86400000);

// aktuální měsíc
S.curMonth=dnes.getMonth(); S.curYear=dnes.getFullYear();
const rc=radarPaydayForMonth(D);
T('aktuální měsíc → režim „current" od dneška', rc.mode==='current' && rc.P.today.getTime()===dnes.getTime() && !rc.P.closed);

// budoucí měsíc
const fm=new Date(dnes.getFullYear(),dnes.getMonth()+1,1); S.curMonth=fm.getMonth(); S.curYear=fm.getFullYear();
T('budoucí měsíc → režim „future", nic se nepočítá', radarPaydayForMonth(D).mode==='future');

// kód
T('uzavřený cyklus nepočítá budoucí platby', /const bud=P\.closed\?\[\]:/.test(PJ));
T('týdny cyklu vylučují přesuny (TODO-286)', /!t\.splitParent&&!isTransferTx\(t\)\);/.test(PJ.slice(PJ.indexOf('const cycAllExp'),PJ.indexOf('const cycAllExp')+200)));
T('uzavřený cyklus mluví v minulém čase', /🏁 Cyklus skončil s/.test(PJ) && /✅ uzavřen/.test(PJ) && /Zbylo z cyklu/.test(PJ));
T('proužek říká, který cyklus se zobrazuje', /zobrazuji <strong>uzavřený cyklus/.test(PJ));
T('ostatní volání radarPaydayInfo zůstala s jedním parametrem', (PJ.match(/radarPaydayInfo\(getData\(\)\)/g)||[]).length>=1);
console.log(`S23/v10.90: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
