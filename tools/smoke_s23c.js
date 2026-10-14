const fs=require('fs');
let ok=0,bad=0; const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=(src,n,kw)=>{const a=src.indexOf((kw||'function ')+n+(kw?'=':'('));if(a<0)throw new Error('chybí '+n);let i=src.indexOf('{',a),d=0;for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'){d--;if(!d)break;}}return src.slice(a,i+1);};
const H=fs.readFileSync('helpers.js','utf8'), TR=fs.readFileSync('transactions.js','utf8'), PJ=fs.readFileSync('projects.js','utf8');

// ── A) predikční funkce umí příjmy ──
global.S={curMonth:8,curYear:2026};
global.window={};
global.isTransferTx=()=>false;
global.txCZK=t=>t.amount;
global.SEASON=Array.from({length:12},(_,m)=>({mult:m===11?1.12:1}));
global.getCat=(id,cats)=>(cats||[]).find(c=>c.id===id)||{};
const D={categories:[{id:'e1',name:'Jídlo',type:'expense'},{id:'i1',name:'Výplata',type:'income'}],
  transactions:[
    {date:'2026-06-10',type:'income', catId:'i1',amount:30000},
    {date:'2026-07-10',type:'income', catId:'i1',amount:30000},
    {date:'2026-08-10',type:'income', catId:'i1',amount:36000},
    {date:'2026-06-15',type:'expense',catId:'e1',amount:5000},
    {date:'2026-07-15',type:'expense',catId:'e1',amount:5000},
  ]};
global.getData=()=>D;
eval(cut(H,'getActual','const ').replace('const getActual','global.getActual'));
eval(cut(H,'getHistAvg').replace('function getHistAvg','global.getHistAvg=function')); eval(cut(H,'predictCat').replace('function predictCat','global.predictCat=function'));
global.isPast=(m,y)=>y<2026||(y===2026&&m<8); global.isCur=(m,y)=>y===2026&&m===8;
eval(cut(H,'computeYearForecast').replace('function computeYearForecast','global.computeYearForecast=function'));
T('getActual bez typu = výdaje (zpětná kompatibilita)', getActual('e1',null,6,2026,D)===5000);
T('getActual s typem income čte příjmy', getActual('i1',null,6,2026,D,'income')===30000);
T('getActual income nevrací výdaje', getActual('e1',null,6,2026,D,'income')===0);
T('predictCat umí příjem (Ø 30/30/36 = 32000)', predictCat('i1',null,9,2026,D,'income')===32000);
T('predictCat bez typu dál predikuje výdaje', predictCat('e1',null,9,2026,D)===5000);
T('sezónnost se na PŘÍJEM nepouští (prosinec = stejný)', predictCat('i1',null,11,2026,D,'income')===32000);
T('sezónnost na výdaje platí dál (prosinec +12 %)', predictCat('e1',null,11,2026,D)===5600);
T('computeYearForecast respektuje typ', computeYearForecast('i1',null,2026,D,'income')>0);
T('přepínač má stav v localStorage', /ff_predMode/.test(TR) && /function setPredMode/.test(TR));
T('tabulka filtruje kategorie podle režimu', /jeP \? \(c\.type==='income'\|\|c\.type==='both'\)/.test(TR));
T('žádné volání v Predikci nezůstalo bez režimu', !/predictCat\([^)]*,D\)|getActual\([^)]*,D\)|computeYearForecast\([^)]*,D\)/.test(TR));
T('graf pod tabulkou sleduje přepínač', /t\.type===_pm/.test(TR));

// ── B) projekce: příjem po měsících, rozpětí, kalendář ──
global.CZ_M=['Led','Úno','Bře','Dub','Kvě','Čer','Čec','Srp','Zář','Říj','Lis','Pro'];
global.getTx=(m,y,d)=>(d.transactions||[]).filter(t=>{const dd=new Date(t.date);return dd.getMonth()===m&&dd.getFullYear()===y;});
global.expSum=(tx)=>tx.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
global.incSum=(tx)=>tx.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);
global.computeEffectiveIncome=()=>32000;
global.assetLiqTotals=()=>({wallets:20000});
global.computeMonthlyDebtPayments=()=>0;
global.pristiOccurrences=(freq,den,from,to)=>{const d=new Date(from.getFullYear(),from.getMonth(),den);return (d>=from&&d<=to)?[d]:[];};
global.budouciGetAll=()=>[{date:'2026-10-15',name:'Nájem',amount:12000},{date:'2026-11-15',name:'Nájem',amount:12000}];
D.sablony=[{id:'s1',type:'income',name:'Výplata',amount:30000,freq:'monthly',den:10}];
D.debts=[];
eval(cut(PJ,'_obrazProjection').replace('function _obrazProjection','global._obrazProjection=function'));
const proj=_obrazProjection(D);
T('projekce má 6 měsíců', proj.months.length===6);
T('příjem se liší podle predikce, ne plochý průměr', proj.months[0].inc===32000);
T('první měsíc NEMÁ rozpětí (má konkrétní data)', proj.months[0].sirka===0 && proj.months[0].cashLo===proj.months[0].cash);
T('další měsíce rozpětí mají', proj.months[1].sirka>0);
T('rozpětí roste s horizontem', proj.months[5].sirka>proj.months[1].sirka);
T('a roste odmocninou, ne lineárně', proj.months[5].sirka < proj.months[1].sirka*5);
T('kalendář prvního měsíce má výplatu i nájem', proj.months[0].dny.length===2);
T('výplata je kladná, nájem záporný', proj.months[0].dny.find(d=>d.name==='Výplata').amount===30000 && proj.months[0].dny.find(d=>d.name==='Nájem').amount===-12000);
T('kalendář je seřazený podle data', proj.months[0].dny[0].date <= proj.months[0].dny[1].date);
T('do kalendáře nespadne platba z listopadu', !proj.months[0].dny.some(d=>d.date.getMonth()===10));
T('zbytek = predikce mínus známé výdaje', proj.months[0].zbytek === Math.max(0,Math.round(proj.months[0].exp-12000)));

// render
global.escHtml=x=>String(x); global.fmtB=v=>Math.round(v)+' Kč'; global.showPage=()=>{};
eval(cut(PJ,'_obrazProjKalendar').replace('function _obrazProjKalendar','global._obrazProjKalendar=function')); eval(cut(PJ,'_obrazProjRozpeti').replace('function _obrazProjRozpeti','global._obrazProjRozpeti=function'));
const kal=_obrazProjKalendar(proj);
T('kalendář ukazuje konkrétní datum', /10\. 10\./.test(kal) && /15\. 10\./.test(kal));
T('kalendář počítá průběžný zůstatek od peněženek', /zůstatek 50000 Kč/.test(kal) && /zůstatek 38000 Kč/.test(kal));
//  Ve scénáři výše je známý nájem (12 000) vyšší než predikce výdajů (5 000),
//  takže na běžný život nezbývá nic – a řádek se správně nezobrazí.
//  Stejné pravidlo jako v Příštím měsíci: dvakrát počítat tytéž peníze nelze.
T('zbytek nejde do minusu, když známé platby převyšují predikci', proj.months[0].zbytek===0 && !/Běžný život \(jídlo/.test(kal));
(()=>{
  const p2=JSON.parse(JSON.stringify(proj), (k,v)=> k==='date'? new Date(v) : v);
  p2.months[0].exp=20000; p2.months[0].zbytek=8000;
  const k2=_obrazProjKalendar(p2);
  T('když na běžný život zbývá, má vlastní řádek bez data', /Běžný život \(jídlo/.test(k2) && /průběžně/.test(k2) && /8000 Kč/.test(k2));
})();
const rz=_obrazProjRozpeti(proj);
T('rozpětí se zobrazí jako „od–do“', /až/.test(rz) && /rezerva/.test(rz));
T('rozpětí nezobrazuje první měsíc (ten má data)', !new RegExp('>'+proj.months[0].label+' ').test(rz));
T('vysvětlí, proč dál nejsou konkrétní data', /přesnost, kterou appka nemá/.test(rz));
const proj2={months:[{m:9,y:2026,dny:[],exp:5000}],wallets:1000};
T('bez šablon kalendář neselže a poradí', /opakované šablony/.test(_obrazProjKalendar(proj2)));

console.log(`S23/v10.87: ${ok} OK, ${bad} chyb`); process.exit(bad?1:0);
