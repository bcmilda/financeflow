// TODO-198 fáze 2+3 – souhrn hodnocení a vzorce.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('review.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
const groups=src.slice(src.indexOf('const REV_GROUPS'),src.indexOf('function _revGroupOf'));

let DATA=null,S={curMonth:7,curYear:2026};
const sb={console,Date,Math,Object,Array,Number,parseInt,isNaN,isFinite,String,
  get S(){return S},
  CZ_M:['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'],
  getData:()=>DATA,
  getTx:(m,y,D)=>((D||DATA).transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y}),
  txCZK:t=>t.amtCZK!=null?t.amtCZK:(t.amount||0),
  isTransferTx:t=>!!(t&&(t.transferId||t.catId==='transfer')),
  getCat:(id,cats)=>(cats||[]).find(c=>c.id===id)||{},
  fmtB:n=>Math.round(n)+' Kč', escHtml:s=>String(s==null?'':s).replace(/</g,'&lt;'),
  showPage:()=>{}};
sb.window=sb;vm.createContext(sb);
vm.runInContext([groups,pick('_revGroupOf'),'const REV_MIN_COVERAGE=0.15;',
  'const REV_PAT_MIN_N=5;','const REV_PAT_MIN_DIFF=0.6;',
  "const REV_DAYS=['neděle','pondělí','úterý','středa','čtvrtek','pátek','sobota'];",
  pick('revMonthStats'),pick('revTrend'),pick('revDenikHTML'),
  pick('_revBuckets'),pick('revPatterns'),pick('revTimePatternReady'),pick('revPatternsHTML')].join('\n'),sb);
const stats=vm.runInContext('revMonthStats',sb), denik=vm.runInContext('revDenikHTML',sb),
      pats=vm.runInContext('revPatterns',sb), patHTML=vm.runInContext('revPatternsHTML',sb),
      timeReady=vm.runInContext('revTimePatternReady',sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};

console.log('── TODO-198/2 · souhrn v Deníku ──');
DATA={categories:[{id:'c20',name:'Jídlo'}],payTypes:[{id:'p1',name:'Karta'},{id:'p2',name:'Hotovost'}],transactions:[
  {id:'1',type:'expense',catId:'c20',name:'Pivo',amount:2000,date:'2026-08-03',priority:1},
  {id:'2',type:'expense',catId:'c20',name:'Rohlík',amount:1000,date:'2026-08-04',priority:5},
  {id:'3',type:'expense',catId:'c20',name:'Oběd',amount:1000,date:'2026-08-05'},
  {id:'4',type:'expense',catId:'c20',name:'Split',amount:9999,date:'2026-08-06',priority:1,splitParent:true},
  {id:'5',type:'expense',catId:'transfer',name:'Přesun',amount:9999,date:'2026-08-07',priority:1,transferId:'x'}]};
check('split a přesun se do souhrnu nedostanou',()=>{
  const st=stats(7,2026,DATA);
  assert(st.total===3,'total '+st.total);
  assert(st.rated===2,'rated '+st.rated);
});
check('průměr je VÁŽENÝ částkou, ne počtem',()=>{
  const st=stats(7,2026,DATA);
  // (1×2000 + 5×1000)/3000 = 2,33 ; nevážený průměr by byl 3,0
  assert(Math.abs(st.avg-2.333)<0.01,'avg '+st.avg.toFixed(3)+' – jedna drahá útrata musí vážit víc');
});
check('pokrytí říká, jaká ČÁST útrat je ohodnocená',()=>{
  const st=stats(7,2026,DATA);
  assert(Math.abs(st.coverage-0.75)<0.01,'coverage '+st.coverage);
});
check('nízko/vysoko hodnocené se sčítají zvlášť',()=>{
  const st=stats(7,2026,DATA);
  assert(st.lowSum===2000&&st.highSum===1000,`low ${st.lowSum} high ${st.highSum}`);
});
check('HTML mluví o budoucnosti, ne o minulosti',()=>{
  const h=denik(7,2026);
  assert(/máš za rok/.test(h),'chybí nabídka do budoucna');
  // Hlídáme OBVINĚNÍ, ne slovo samotné – „nikdy neoznačí výdaj za zbytečný" je popření
  const veta=h.replace(/nikdy neoznačí[^<.]*/gi,'');
  assert(!/vyhodil|promrhal|špatně jsi|zbytečně jsi|utratil jsi \d/i.test(veta),'text obviňuje uživatele');
  assert(/Ne proto, že by ty výdaje byly špatné/.test(h),'chybí explicitní zmírnění');
  assert(h.indexOf('NaN')<0&&h.indexOf('undefined')<0,'NaN/undefined v HTML');
});
check('bez hodnocení vyzve, ale nic nevyčítá',()=>{
  DATA.transactions.forEach(t=>delete t.priority);
  const h=denik(7,2026);
  assert(/Ohodnoť/.test(h),'chybí výzva');
  assert(!/NaN/.test(h));
});
check('prázdný měsíc nevykreslí nic',()=>{
  assert(denik(0,2020)==='','vykreslil se prázdný blok');
});

console.log('\n── TODO-198/3 · vzorce ──');
const mk=(i,den,pay,pri,amt)=>({id:'t'+i,type:'expense',catId:'c20',name:'Nákup'+i,
  amount:amt||500,date:den,priority:pri,payType:pay});
DATA.transactions=[];
// pátky kartou hodnocené nízko, úterky hotově vysoko
['2026-08-07','2026-08-14','2026-08-21','2026-08-28','2026-07-03','2026-07-10']
  .forEach((d,i)=>DATA.transactions.push(mk(i,d,'p1',2)));
['2026-08-04','2026-08-11','2026-08-18','2026-08-25','2026-07-07','2026-07-14']
  .forEach((d,i)=>DATA.transactions.push(mk(100+i,d,'p2',5)));
check('vzorec se najde a seřadí podle síly',()=>{
  const p=pats(7,2026,6,DATA);
  assert(p.found.length>0,'nenalezen žádný vzorec');
  assert(p.found[0].diff>=p.found[p.found.length-1].diff,'není seřazeno');
});
check('den v týdnu i způsob platby vyjdou správně',()=>{
  const p=pats(7,2026,6,DATA);
  const den=p.found.find(f=>f.dim==='day'), pay=p.found.find(f=>f.dim==='pay');
  assert(den&&den.low.label==='pátek',   'nejnižší den '+(den&&den.low.label));
  assert(den&&den.high.label==='úterý',  'nejvyšší den '+(den&&den.high.label));
  assert(pay&&/Karta/.test(pay.low.label),'nejnižší platba '+(pay&&pay.low.label));
});
check('malý vzorek NEVYROBÍ vzorec',()=>{
  DATA.transactions=[mk(1,'2026-08-07','p1',1),mk(2,'2026-08-04','p2',5)];
  const p=pats(7,2026,6,DATA);
  assert(p.found.length===0,'ze 2 útrat udělal vzorec');
});
check('vyrovnané hodnocení NEVYROBÍ vzorec (šum se neukáže)',()=>{
  DATA.transactions=[];
  for(let i=0;i<12;i++) DATA.transactions.push(mk(i,`2026-08-${String((i%28)+1).padStart(2,'0')}`,i%2?'p1':'p2',3));
  const p=pats(7,2026,6,DATA);
  assert(p.found.length===0,'vyrobil vzorec z náhody: '+JSON.stringify(p.found.map(f=>f.title)));
});
check('denní doba: bez enteredAt není připravená',()=>{
  const r=timeReady(DATA);
  assert(r.ready===false&&r.n===0,JSON.stringify(r));
});
check('denní doba počítá JEN záznamy zapsané v den nákupu',()=>{
  const d=new Date(2026,7,10,19,30).getTime();
  DATA.transactions=[{id:'a',type:'expense',date:'2026-08-10',priority:2,enteredAt:d},
                     {id:'b',type:'expense',date:'2026-07-01',priority:2,enteredAt:d}];
  const r=timeReady(DATA);
  assert(r.n===1,'n='+r.n+' – dávkově zadaná transakce se nesmí počítat');
});
check('HTML vzorců přizná, co chybí, místo aby to zamlčelo',()=>{
  DATA.transactions=[];
  for(let i=0;i<12;i++) DATA.transactions.push(mk(i,`2026-08-${String((i%28)+1).padStart(2,'0')}`,i%2?'p1':'p2',3));
  const h=patHTML(7,2026);
  assert(/Denní doba zatím chybí/.test(h),'nepřiznává chybějící čas');
  assert(h.indexOf('NaN')<0&&h.indexOf('undefined')<0,'NaN/undefined');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ MĚSÍČNÍ REVIEW OVĚŘENO');
process.exit(fails?1:0);
