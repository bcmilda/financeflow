const fs=require('fs');const PJ=fs.readFileSync('projects.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=n=>{const a=PJ.indexOf('function '+n+'(');let i=PJ.indexOf('{',a),d=0;for(;i<PJ.length;i++){if(PJ[i]==='{')d++;else if(PJ[i]==='}'){d--;if(!d)break;}}return PJ.slice(a,i+1);};
const g=(n)=>eval(cut(n).replace('function '+n,'global.'+n+'=function'));
eval(PJ.slice(PJ.indexOf('const RADAR_CHAR_GROUPS'),PJ.indexOf('];',PJ.indexOf('const RADAR_CHAR_GROUPS'))+2).replace('const RADAR_CHAR_GROUPS','global.RADAR_CHAR_GROUPS'));
['radarCharGroupOf','radarMonthWeeks','renderMonthWeeks'].forEach(g);
global.txCZK=t=>t.amount; global.isTransferTx=t=>!!t.transferId; global.fmtB=v=>v+' Kč'; global.curSym=()=>'Kč';
global.getTx=(m,y,D)=>D.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
const D={categories:[{id:'n',name:'Nájem',expenseChar:'regular'},{id:'j',name:'Jídlo',expenseChar:'variable'},{id:'x',name:'Ostatní'}],
 transactions:[
  {date:'2026-09-01',type:'expense',catId:'n',amount:12000},   // Út, 1. týden (1.–6.)
  {date:'2026-09-03',type:'expense',catId:'j',amount:500},
  {date:'2026-09-08',type:'expense',catId:'x',amount:300},     // 2. týden (7.–13.)
  {date:'2026-09-09',type:'expense',catId:'j',amount:999,transferId:'t'}, // přesun – nepočítat
  {date:'2026-09-10',type:'expense',catId:'j',amount:50,isBalancing:true},// vyrovnání – nepočítat
  {date:'2026-09-30',type:'expense',catId:'j',amount:200},     // St, poslední týden (28.–30.)
  {date:'2026-10-01',type:'expense',catId:'j',amount:7777},    // jiný měsíc
 ]};
const {weeks}=radarMonthWeeks(D,8,2026);
T('září 2026 má 5 kalendářních týdnů (Po–Ne, oříznuté)', weeks.length===5);
T('1. týden je 1.–6. 9. (začíná úterkem, 6 dní)', weeks[0].range==='1.–6. 9.' && weeks[0].dnu===6);
T('2. týden je celý 7.–13. 9. (7 dní)', weeks[1].range==='7.–13. 9.' && weeks[1].dnu===7);
T('poslední týden 28.–30. 9. (3 dny)', weeks[4].range==='28.–30. 9.' && weeks[4].dnu===3);
T('součet dní týdnů = dní v měsíci', weeks.reduce((a,w)=>a+w.dnu,0)===30);
T('rozpad: fixní 12 000, variabilní 500 v 1. týdnu', weeks[0].sums.regular===12000 && weeks[0].sums.variable===500);
T('neurčená kategorie jde do „none"', weeks[1].sums.none===300);
T('přesun ani vyrovnání se nepočítají', weeks[1].total===300);
T('výdaj z října do září nespadne', weeks.reduce((a,w)=>a+w.total,0)===13000);
T('Kč/den = částka ÷ dny týdne (12 500 / 6)', weeks[0].perDay===Math.round(12500/6));
const box={innerHTML:''}; global.document={getElementById:()=>box};
renderMonthWeeks(D,8,2026); const h=box.innerHTML;
T('nadpis „Výdaje po týdnech" (ne „od výplaty")', />📅 Výdaje po týdnech</.test(h) && !/od výplaty/.test(h));
T('sloupec nese týdenní částku', />12500 Kč</.test(h.split('<table')[0]));
T('tabulka má Fixní/Variab./Ostatní/Celkem/Dní/Kč/den', ['Fixní','Variab.','Ostatní','Celkem','Dní','Kč/den'].every(x=>h.includes('>'+x+'</th>')));
T('legenda barev rozpadu', /Jednoráz\.\/nepravid\./.test(h));
T('mobil: tabulka se posouvá do strany', /overflow-x:auto/.test(h) && /min-width:460px/.test(h));
T('Měsíc volá nový graf, ne týdny od výplaty', /renderMonthWeeks\(getData\(\), S\.curMonth, S\.curYear\)/.test(PJ) && !/^\s*renderPaydayWeeksTable\(weeks, payday\);/m.test(PJ));
const D2={categories:[{id:'x',name:'X'}],transactions:[]}; renderMonthWeeks(D2,8,2026);
T('bez nastaveného charakteru poradí', /charakter výdaje/.test(box.innerHTML));
console.log(`S23/v10.89: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
