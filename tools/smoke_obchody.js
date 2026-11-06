// FinanceFlow · smoke test · Session 27 (v12.07) · 🏪 Trend nákupů po obchodech (js/obchody.js)
//  Milan: „trend za 12 měsíců, za kalendářní rok · barva v tabulce = barva osy grafu · v Reportu od začátku
//  roku (max 12 M) · v Grafech překlikávat roky a porovnat roky ve sloupcovém grafu s filtrem obchodu“
//  Rozhodnutí: zdroj = účtenky i obchody z notifikací, výchozí míra = útrata.
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const rc=R('receipts.js','../js/receipts.js'), ob=R('obchody.js','../js/obchody.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const S={uiCfg:{},receipts:[],transactions:[]};
const c={S,console,Date,Math,JSON,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},setTimeout:()=>0,save(){c.ulozeno=1},
  isTransferTx:t=>t.catId==='transfer'||!!t.transferId,txCZK:t=>t.amount,dupUctenkaPro:t=>t.receiptAddedAt?{r:{}}:null};
c.window=c; c.window._transferCatIds=new Set(['cat_t_invest']); vm.createContext(c);
const _ib=rc.indexOf('const STORE_BRAND_COLORS'), _ie=rc.indexOf('};',_ib)+2;
vm.runInContext(['normalizeStoreName','storeBrandColor'].map(n=>pick(rc,n)).join('\n')+'\n'+rc.slice(_ib,_ie)+'\n'+ob,c);

console.log('── zdroj: účtenky + notifikace ──');
S.receipts=[{store:'PENNY MARKET',date:'2026-10-01',total:300,items:[1]},{store:'Penny Market s.r.o.',date:'2026-10-02',total:200,items:[1]},
  {store:'PENNY MARKET',date:'2026-10-01',total:300,items:[1]},   // kopie téže účtenky
  {store:'MOL Česká republika, s.r.o.',date:'2026-09-05',total:900,items:[1,2]},{store:'Kaufland',date:'2025-03-03',total:500,items:[1]}];
S.transactions=[{type:'expense',name:'Alza.cz',amount:1168,date:'2026-10-22',zNotifikace:{id:'a'}},
  {type:'expense',name:'Penny Market',amount:145,date:'2026-10-16',zNotifikace:{id:'b'},receiptAddedAt:5},   // spojená s účtenkou → přes účtenku
  {type:'expense',name:'Převod na účet 27-1/0100',amount:399,date:'2026-10-22',zNotifikace:{id:'c'}},
  {type:'expense',name:'Spořák',amount:500,date:'2026-10-22',zNotifikace:{id:'d'},catId:'transfer',transferId:'x'},
  {type:'expense',name:'Investice',amount:700,date:'2026-10-22',zNotifikace:{id:'e'},catId:'cat_t_invest'},
  {type:'expense',name:'Ruční výdaj',amount:50,date:'2026-10-22'}];
const nak=c.obchodNakupy(S);
t('účtenky bez kopií + platba z notifikace (Alza), sjednocené názvy',nak.length===5&&nak.filter(x=>x.obchod==='PENNY MARKET').length===2&&nak.some(x=>x.obchod==='Alza.cz'&&x.zdroj==='notifikace'),nak);
t('bez převodů, přesunů, investic, ručních výdajů a plateb spojených s účtenkou',!nak.some(x=>/P[rř]evod|Spořák|Investice|Ruční/.test(x.obchod))&&nak.filter(x=>x.zdroj==='notifikace').length===1);
t('„MOL Česká republika, s.r.o.“ → „MOL Česká republika“ (bez čárky)',nak.some(x=>x.obchod==='MOL Česká republika'),nak.map(x=>x.obchod));

console.log('── období ──');
const d=new Date('2026-10-23T12:00:00');
t('6 / 12 měsíců končí aktuálním měsícem',c.obchodyMesice('6',0,d).length===6&&c.obchodyMesice('12',0,d).length===12&&c.obchodyMesice('12',0,d)[11].m===9);
t('kalendářní rok: letos leden–říjen, loni leden–prosinec',c.obchodyMesice('rok',2026,d).length===10&&c.obchodyMesice('rok',2025,d).length===12&&c.obchodyMesice('rok',2025,d)[0].label==='I');

console.log('── agregace a barvy ──');
const tr=c.obchodyTrendData(nak,c.obchodyMesice('rok',2026,d),{top:4});
const pen=tr.series.find(x=>x.obchod==='PENNY MARKET');
t('Penny v říjnu = 2 nákupy, 500 Kč; výchozí míra útrata',pen&&pen.values[9]===500&&pen.navstev===2&&tr.mira==='kc',pen);
t('Ø nákup a návštěvy',c.obchodyTrendData(nak,c.obchodyMesice('rok',2026,d),{mira:'avg'}).series.find(x=>x.obchod==='PENNY MARKET').values[9]===250&&c.obchodyTrendData(nak,c.obchodyMesice('rok',2026,d),{mira:'n'}).series.find(x=>x.obchod==='PENNY MARKET').values[9]===2);
t('výběr obchodů (filtr)',c.obchodyTrendData(nak,c.obchodyMesice('rok',2026,d),{vyber:['Alza.cz']}).series.map(x=>x.obchod).join()==='Alza.cz');
const b1=c.obchodBarva('PENNY MARKET'), b2=c.obchodBarva('Penny Market'), bm=c.obchodBarva('MOL Česká republika'), bk=c.obchodBarva('Kaufland');
t('barva obchodu je zapamatovaná a stejná pro všechny varianty názvu',b1===b2&&S.uiCfg.barvyObchodu['penny market']===b1);
t('Penny, MOL a Kaufland (všechny firemně červené) mají různé barvy',new Set([b1,bm,bk]).size===3,[b1,bm,bk]);
t('modrá Lidlu a světle modrá se nepletou (podobný odstín = jiná barva)',!vm.runInContext('_obchBlizko("#0050aa","#fbbf24")',c)&&vm.runInContext('_obchBlizko("#0050aa","#60a5fa")',c));

console.log('── roky a report ──');
const ry=c.obchodyRoky(nak,{top:5});
t('porovnání let: 2025 a 2026, Kaufland jen v 2025',ry.roky.join()==='2025,2026'&&ry.series.find(x=>x.obchod==='KAUFLAND').values.join()==='500,0',ry);
const rep=c.obchodyReportData(S,9,2026);
t('report: trend od ledna do vybraného měsíce (10 měsíců) a top obchody měsíce',rep.trend.months.length===10&&rep.trend.months[0].label==='led'&&rep.top[0].obchod==='Alza.cz'&&rep.top.some(o=>o.obchod==='PENNY MARKET'&&o.navstev===2),rep.top);
t('report SVG se vykreslí',/<svg[\s\S]*polyline/.test(c.obchodyReportSvg(rep.trend)));

console.log('── napojení ──');
const rm=R('report-mesicni.js','../js/report-mesicni.js'), ch=R('charts.js','../js/charts.js'), html=R('app.html','../app.html');
t('Analýza účtenek: karta s přepínačem 6 / 12 měsíců / rok a tabulka obchodů ze stejného zdroje',/html \+= obchTrendKartaHTML\(getData\(\)\);/.test(rc)&&/obchodyMesic\(getData\(\), S\.curMonth, S\.curYear\)/.test(rc));
t('odznak obchodu v tabulce = barva v grafu (obchodBarva)',/const c = color \|\| \(typeof obchodBarva === 'function' \? obchodBarva\(store\)/.test(rc));
t('Report strana 3: obchody měsíce + trend od ledna',/ucet\.obch = obchodyReportData\(D, m, y\)/.test(rm)&&/Trend obchodů od ledna/.test(rm));
t('Grafy → 🏪 Obchody (záložka, obsah, vykreslení)',/id="gtab-obchody"/.test(html)&&/id="gtab-obchody-content"/.test(html)&&/renderObchodyGraf\(\);  \/\/ v12\.07/.test(ch)&&/js\/obchody\.js\?v=[0-9a-f]{16}/.test(html));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
