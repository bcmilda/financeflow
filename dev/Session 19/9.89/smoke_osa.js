// TODO-207 varianta B – osa života.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('projects.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
let DATA=null,S={curMonth:7,curYear:2026,milestones:[],transactions:[]};
const sb={console,Date,Math,Object,Array,Set,Number,String,parseInt,isFinite,
  get S(){return S},set S(v){S=v},
  getData:()=>DATA, czkToBase:v=>v||0,
  txCZK:t=>t.amtCZK!=null?t.amtCZK:(t.amount||0),
  isTransferTx:t=>!!(t&&(t.transferId||t.catId==='transfer'))};
sb.window=sb;vm.createContext(sb);
vm.runInContext(pick('_osaZivotaData')+'\n'+pick('_osaZivotaHTML'),sb);
const data=vm.runInContext('_osaZivotaData',sb), html=vm.runInContext('_osaZivotaHTML',sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};
const mk=(months)=>{const t=[];for(let i=0;i<months;i++){
  const d=new Date(2026,7-i,10);const ym=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  t.push({id:'i'+i,type:'income',amount:30000,date:ym+'-10'});
  t.push({id:'e'+i,type:'expense',amount:22000,date:ym+'-15'});}
  return t;};

console.log('── TODO-207/B · osa života ──');
check('pod 3 měsíce dat se osa nekreslí',()=>{
  DATA={transactions:mk(2)};S.transactions=DATA.transactions;
  assert(data(DATA)===null,'osa se kreslí i na dvou měsících');
  assert(html()==='','HTML se přesto vygenerovalo');
});
check('prázdná data nespadnou',()=>{
  DATA={transactions:[]};assert(data(DATA)===null);assert(html()==='');
});
check('12 měsíců → 12 bodů, kumulovaný tok roste o saldo',()=>{
  DATA={transactions:mk(12)};S.transactions=DATA.transactions;
  const d=data(DATA);
  assert(d.win.length===12,'měsíců '+d.win.length);
  assert(d.win[0].cum===8000,'první cum '+d.win[0].cum);
  assert(d.win[11].cum===96000,'poslední cum '+d.win[11].cum);
});
check('okno se ořízne na 72 měsíců',()=>{
  DATA={transactions:mk(90)};S.transactions=DATA.transactions;
  assert(data(DATA).win.length===72,'délka '+data(DATA).win.length);
});
check('cizí měna přes txCZK, přesuny a splity mimo',()=>{
  DATA={transactions:mk(6).concat([
    {id:'x1',type:'expense',amount:100,amtCZK:2500,date:'2026-08-03'},
    {id:'x2',type:'expense',amount:9999,splitParent:true,date:'2026-08-04'},
    {id:'x3',type:'expense',amount:9999,isBalancing:true,date:'2026-08-05'},
    {id:'x4',type:'expense',amount:9999,transferId:'t',date:'2026-08-06'}])};
  S.transactions=DATA.transactions;
  const last=data(DATA).win.slice(-1)[0];
  assert(last.exp===22000+2500,'výdaje '+last.exp+' – prosákl split/vyrovnání/přesun nebo nominál');
});
check('události a etapy se namapují na správný měsíc',()=>{
  DATA={transactions:mk(12)};S.transactions=DATA.transactions;
  S.milestones=[{id:'m1',label:'Hypotéka',date:'2026-03-01',icon:'🏠'},
                {id:'m2',label:'Rodina',kind:'era',date:'2025-10-01',dateTo:'2026-05-01'},
                {id:'m3',label:'Mimo rozsah',date:'2015-01-01'},
                {id:'m4',label:'Skrytá',date:'2026-04-01',hidden:true}];
  const d=data(DATA);
  assert(d.events.length===1,'událostí '+d.events.length+' (mimo rozsah a skryté musí vypadnout)');
  assert(d.eras.length===1 && d.eras[0].to>d.eras[0].from,'etapa špatně');
});
check('etapa bez dateTo sahá do současnosti',()=>{
  S.milestones=[{id:'m9',label:'Dosud',kind:'era',date:'2026-01-01'}];
  const d=data(DATA);
  assert(d.eras[0].to===d.win.length-1,'to='+d.eras[0].to);
});
check('HTML se vykreslí bez NaN a má vodorovný posuv',()=>{
  const h=html();
  assert(h.length>800,'délka '+h.length);
  assert(h.indexOf('NaN')<0,'NaN v SVG');
  assert(h.indexOf('undefined')<0,'undefined v SVG');
  assert(/overflow-x:auto/.test(h),'chybí posuv – na mobilu se osa nevejde');
  assert(/<svg width="\d+" height="\d+"/.test(h),'SVG nemá pixelovou šířku (roztáhlo by se)');
});
check('nebezpečné znaky v názvu události se escapují',()=>{
  S.milestones=[{id:'m5',label:'<img src=x onerror=alert(1)>',date:'2026-03-01'}];
  const h=html();
  assert(h.indexOf('<img')<0,'HTML injekce prošla');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ OSA ŽIVOTA OVĚŘENA');
process.exit(fails?1:0);
