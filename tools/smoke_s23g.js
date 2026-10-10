const fs=require('fs');const PJ=fs.readFileSync('projects.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=n=>{const a=PJ.indexOf('function '+n+'(');let i=PJ.indexOf('{',a),d=0;for(;i<PJ.length;i++){if(PJ[i]==='{')d++;else if(PJ[i]==='}'){d--;if(!d)break;}}return PJ.slice(a,i+1);};
const g=n=>eval(cut(n).replace('function '+n,'global.'+n+'=function'));
eval(PJ.slice(PJ.indexOf('const RADAR_CHAR_GROUPS'),PJ.indexOf('];',PJ.indexOf('const RADAR_CHAR_GROUPS'))+2).replace('const RADAR_CHAR_GROUPS','global.RADAR_CHAR_GROUPS'));
global._settings={firstDay:17,payFreq:'monthly'};
global.isTransferTx=t=>!!t.transferId; global.txCZK=t=>t.amount; global.fmtB=v=>v+' Kč';
global.radarAdjustWeekend=d=>d; global.radarDetectPaydayDay=()=>17;
global.getTxByRange=(f,t,D)=>{const a=new Date(f),b=new Date(t);b.setHours(23,59,59);return D.transactions.filter(x=>{const d=new Date(x.date);return d>=a&&d<=b;});};
['radarCharGroupOf','radarPaydayInfo','radarPaydayWindow','radarPaydayDailyCard','radarPaydayWeeksPlanCard'].forEach(g);
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

// ── Uzavřený měsíc (srpen 2025) – celé okno je skutečnost ──
global.budouciGetAll=()=>[];
const D={categories:[{id:'n',expenseChar:'regular'},{id:'j',expenseChar:'variable'}],transactions:[
  {date:'2025-07-17',type:'income',amount:30000},
  {date:'2025-07-20',type:'expense',catId:'n',amount:12000},
  {date:'2025-08-05',type:'expense',catId:'j',amount:3000},
  {date:'2025-08-10',type:'expense',catId:'j',amount:500,transferId:'x'},   // přesun
  {date:'2025-08-17',type:'income',amount:30000},
  {date:'2025-08-20',type:'expense',catId:'j',amount:2000},
]};
const W=radarPaydayWindow(D,7,2025);
T('okno srpna začíná výplatou 17. 7. (ze které žiju 1. 8.)', iso(W.start)==='2025-07-17');
T('okno končí posledním dnem měsíce 31. 8.', iso(W.end)==='2025-08-31');
T('v okně jsou obě výplaty (17. 7. a 17. 8.)', W.paydays.length===2 && iso(W.paydays[1])==='2025-08-17');
T('graf se na výplatě nezastaví – pokračuje do 31. 8.', iso(W.days[W.days.length-1].date)==='2025-08-31');
T('zůstatek po výplatě vyskočí nahoru', W.days.find(x=>iso(x.date)==='2025-08-17').bal > W.days.find(x=>iso(x.date)==='2025-08-16').bal);
T('zůstatek na konci = příjmy − výdaje (bez přesunu)', W.days[W.days.length-1].bal===60000-12000-3000-2000);
T('nic není odhad (měsíc uplynul)', W.days.every(x=>!x.forecast));
T('týdny pokrývají celé okno bez děr', W.weeks.reduce((a,w)=>a+w.dnu,0)===W.days.length);
T('týden s 17. 8. je označený výplatou', W.weeks.some(w=>w.payday && w.ws<=new Date(2025,7,17) && w.we>=new Date(2025,7,17)));
T('stav na konci týdne = na začátku + změna', W.weeks.every(w=>w.endBal===w.startBal+w.change));
T('stav na začátku týdne navazuje na konec předchozího', W.weeks.every((w,i)=>i===0||w.startBal===W.weeks[i-1].endBal));

// ── Aktuální měsíc – odhad po dnešku ──
//  S24 (v11.16): PEVNÉ DATUM. Dřív se bralo skutečné „dnes" a poslední den měsíce
//  (žádné dny po dnešku) test shodil, i když kód byl v pořádku. Teď je „dnes"
//  vždy 10. 9. 2025 – uprostřed měsíce, po výplatě 17. 8., před koncem září.
const _RealDate=Date, _FIX=new _RealDate(2025,8,10,12,0,0).getTime();
global.Date=class extends _RealDate{ constructor(...a){ if(a.length) super(...a); else super(_FIX); } static now(){ return _FIX; } };
const now=new Date(); now.setHours(0,0,0,0);
const m=now.getMonth(), y=now.getFullYear();
const pd=new Date(y,m-1,17), dnesIso=iso(now);
const zitra=new Date(now.getTime()+86400000*2);
global.budouciGetAll=()=>[{date:iso(zitra),amount:4000}];
const D2={categories:[{id:'j',expenseChar:'variable'}],transactions:[
  {date:iso(pd),type:'income',amount:30000},
  {date:iso(new Date(y,m-1,20)),type:'expense',catId:'j',amount:2000},
]};
const W2=radarPaydayWindow(D2,m,y);
T('aktuální měsíc: dny po dnešku jsou odhad', W2.days.some(x=>x.forecast) && W2.days.filter(x=>!x.forecast).every(x=>x.date<=now));
T('odhad započítá známou platbu z Budoucích plateb', W2.days.some(x=>x.known===4000));
T('odhad očekává výplatu ve výši minulé (30 000)', W2.estInc===30000);
T('týdny rozlišují skutečnost a odhad (actTotal ≤ total)', W2.weeks.every(w=>w.actTotal<=w.total+0.5));

// ── render ──
const h1=radarPaydayDailyCard(W), h2=radarPaydayWeeksPlanCard(W);
T('graf den po dni se vykreslí s oběma výplatami', /Od výplaty den po dni/.test(h1) && (h1.match(/💰 /g)||[]).length>=2);
T('graf ukazuje začátek měsíce', /1\. 8\./.test(h1));
T('uzavřený měsíc: „zbylo", ne „zbude"', /zbylo/.test(h1) && !/zbude/.test(h1));
const h3=radarPaydayDailyCard(W2);
global.Date=_RealDate;   // konec pevného data
T('aktuální měsíc: čárkovaný odhad a „zbude"', /stroke-dasharray="6 5"/.test(h3) && /zbude/.test(h3));
T('Kam směřuju: 2 sloupce na týden (zelená+modrá | oranžová+fialová)', /#4ade80/.test(h2)&&/#60a5fa|rgba\(96,165,250/.test(h2)&&/#fb923c/.test(h2)&&/#a78bfa/.test(h2));
T('Kam směřuju: tabulka Na začátku / Změna / Na konci / Plán. výdej / Budoucí platby', ['Na začátku','Změna','Na konci','Plán. výdej','Budoucí platby'].every(x=>h2.includes('>'+x+'</th>')));
T('obě karty jsou v záložce Do výplaty', /\$\{radarPaydayDailyCard\(W\)\}/.test(PJ) && /\$\{radarPaydayWeeksPlanCard\(W\)\}/.test(PJ));
T('Od výplaty k výplatě čte týdny z okna', /const W=radarPaydayWindow\(D, S\.curMonth, S\.curYear\);/.test(PJ));
const _okA=ok,_badA=bad;
(()=>{

const cut2=n=>{const a=PJ.indexOf('function '+n+'(');let i=PJ.indexOf('{',a),d=0;for(;i<PJ.length;i++){if(PJ[i]==='{')d++;else if(PJ[i]==='}'){d--;if(!d)break;}}return PJ.slice(a,i+1);};
['radarMonthCompare','renderMonthCompare'].forEach(n=>eval(cut2(n).replace('function '+n,'global.'+n+'=function')));
global.isTransferTx=t=>!!t.transferId; global.txCZK=t=>t.amount; global.fmtB=v=>v+' Kč';
global.CZ_M=['Led','Úno','Bře','Dub','Kvě','Čer','Čec','Srp','Zář','Říj','Lis','Pro'];
global.getTx=(m,y,D)=>D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const D={transactions:[
  {date:'2025-07-05',type:'expense',amount:1000},{date:'2025-07-25',type:'expense',amount:4000},
  {date:'2025-08-05',type:'expense',amount:800},{date:'2025-08-26',type:'expense',amount:500},
  {date:'2025-08-06',type:'expense',amount:9999,transferId:'x'},
]};
const c=radarMonthCompare(D,7,2025);
T('uplynulý měsíc: celý srpen vs celý červenec', c.doDne===31 && c.ted===1300 && c.minuleCelkem===5000);
T('procento proti stejnému úseku (1300 vs 5000 = −74 %)', c.pct===-74);
T('přesun se nepočítá', c.ted===1300);
const box={innerHTML:''}; global.document={getElementById:()=>box}; renderMonthCompare(D,7,2025);
T('karta se vykreslí', /Srovnání s minulým měsícem/.test(box.innerHTML) && /méně než minule/.test(box.innerHTML));
T('karta je v záložce Měsíc', /id="monthCompareBox"/.test(PJ) && /renderMonthCompare\(getData\(\), S\.curMonth, S\.curYear\)/.test(PJ));

})();
console.log(`S23/v10.91 (S24: pevné datum): ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
