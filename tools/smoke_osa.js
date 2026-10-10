// TODO-207 varianta B – osa života.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('projects.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
//  S26: konstanty (const X = …;) – vyjmout až po středník v nulové hloubce závorek
const pickConst=n=>{const i=src.indexOf('const '+n+' ');if(i<0)throw new Error('chybí const '+n);let d=0;
  for(let k=i;k<src.length;k++){const c=src[k];if('[({'.includes(c))d++;else if('])}'.includes(c))d--;else if(c===';'&&!d)return src.slice(i,k+1)}};
let DATA=null,S={curMonth:7,curYear:2026,milestones:[],transactions:[]};
const sb={console,Date,Math,Object,Array,Set,Number,String,parseInt,isFinite,Infinity,
  get S(){return S},set S(v){S=v},
  getData:()=>DATA, czkToBase:v=>v||0, baseCur:()=>'Kč',
  CZ_M:['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'],
  txCZK:t=>t.amtCZK!=null?t.amtCZK:(t.amount||0),
  isTransferTx:t=>!!(t&&(t.transferId||t.catId==='transfer'))};
sb.window=sb;vm.createContext(sb);
vm.runInContext(['MS_BARVA_VYCHOZI','OSA_ROZSAHY','OSA_MES','OSA_MES_2P'].map(pickConst).join('\n')+'\nvar _osaVybrano=null;\n'
  +['msBarvaPlatna','_osaCfg','_osaZivotaData','_osaZivotaHTML'].map(pick).join('\n'),sb);
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
check('HISTORIE SE NEOŘEZÁVÁ – 40 let se zobrazí celých',()=>{
  DATA={transactions:mk(480)};S.transactions=DATA.transactions;
  const d=data(DATA);
  assert(d.monthsTotal===480,'měsíců '+d.monthsTotal);
  assert(d.step==='year','krok '+d.step+' (nad 12 let se má slučovat po letech)');
  assert(d.win.length>=40&&d.win.length<=41,'košů '+d.win.length);
  assert(d.win[0].y===1986,'začátek '+d.win[0].y);
});
check('4–12 let → čtvrtletí, do 4 let → měsíce',()=>{
  DATA={transactions:mk(72)};S.transactions=DATA.transactions;
  const q=data(DATA); assert(q.step==='quarter','72 měs. → '+q.step);
  // 72 měsíců nezačíná na hranici čtvrtletí, takže krajní koše jsou neúplné → 24 nebo 25
  assert(q.win.length>=24&&q.win.length<=25,'čtvrtletí '+q.win.length);
  DATA={transactions:mk(36)};S.transactions=DATA.transactions;
  assert(data(DATA).step==='month','36 měs. → '+data(DATA).step);
});
check('slučováním se součty neztratí (kumulace sedí)',()=>{
  DATA={transactions:mk(72)};S.transactions=DATA.transactions;
  const d=data(DATA);
  assert(d.win.slice(-1)[0].cum===72*8000,'kumulace '+d.win.slice(-1)[0].cum+' místo '+(72*8000));
});
check('u dlouhé historie jsou křivky PRŮMĚRY na měsíc, ne součty za rok',()=>{
  DATA={transactions:mk(480)};S.transactions=DATA.transactions;
  const b=data(DATA).win[5];
  assert(Math.abs(b.incA-30000)<1,'incA '+b.incA+' – rok by udělal umělý dvanáctinásobný skok');
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

console.log('── S26 · rozsah, poznámky, filtr ──');
check('výchozí rozsah je Vše (ADR-106 – historie se neořezává)',()=>{
  S.uiCfg={};DATA={transactions:mk(30)};S.transactions=DATA.transactions;S.milestones=[];
  const c=vm.runInContext('_osaCfg()',sb); assert(c.rozsah==='vse','rozsah '+c.rozsah);
  assert(data(DATA).win.length===30,'košů '+data(DATA).win.length);
});
check('rozsah 6M = posledních 6 měsíců, kumulace pořád od začátku záznamů',()=>{
  DATA={transactions:mk(24)};S.transactions=DATA.transactions;
  const d=data(DATA,{rozsah:'6m'});
  assert(d.win.length===6,'košů '+d.win.length);
  assert(d.win[0].y===2026&&d.win[0].m===2,'začátek '+d.win[0].m+'/'+d.win[0].y+' (čekám březen 2026)');
  assert(d.win[5].cum===24*8000,'poslední cum '+d.win[5].cum+' – kumulace se nesmí ořezat');
  assert(d.win[0].cum===19*8000,'první cum '+d.win[0].cum);
  assert(d.step==='month','krok '+d.step);
});
check('rozsah 2 roky u kratší historie ukáže vše, co je',()=>{
  DATA={transactions:mk(10)};S.transactions=DATA.transactions;
  const d=data(DATA,{rozsah:'2r'}); assert(d.win.length===10,'košů '+d.win.length);
});
check('neznámý rozsah z jiného zařízení = Vše',()=>{
  S.uiCfg={osa:{rozsah:'xxx',skryt:{poznamky:'ano'}}};
  const c=vm.runInContext('_osaCfg()',sb); assert(c.rozsah==='vse'); assert(c.skryt.poznamky===true);
  S.uiCfg={};
});
check('poznámka jde do notes (ne do událostí) a barva se ověří',()=>{
  DATA={transactions:mk(12)};S.transactions=DATA.transactions;
  S.milestones=[{id:'n1',kind:'note',label:'Začala topná sezóna',date:'2026-03-16',color:'#E5534B'},
                {id:'n2',kind:'note',label:'Zlá barva',date:'2026-04-01',color:'red" onload="x'},
                {id:'e1',label:'Hypotéka',date:'2026-03-01'}];
  const d=data(DATA);
  assert(d.notes.length===2&&d.events.length===1,'notes '+d.notes.length+' events '+d.events.length);
  assert(d.notes[0].color==='#e5534b','barva '+d.notes[0].color);
  assert(d.notes[1].color==='#4a90d9','neplatná barva prošla: '+d.notes[1].color);
});
check('poznámka leží v přesném dni měsíce, ne na středu koše',()=>{
  const d=data(DATA); const i=d.win.findIndex(b=>b.y===2026&&b.m===2);
  const p=d.notes.find(n=>n.id==='n1').pos;
  assert(p>i+0.45&&p<i+0.52,'pozice '+p+' (16. 3. má být kolem poloviny března, koš '+i+')');
});
check('poznámka mimo okno 6M se nekreslí',()=>{
  S.milestones=[{id:'n3',kind:'note',label:'Stará',date:'2025-11-02',color:'#4caf50'}];
  assert(data(DATA,{rozsah:'6m'}).notes.length===0,'stará poznámka v okně 6M');
  assert(data(DATA).notes.length===1,'ve Vše chybí');
});
check('událost po konci osy se nekreslí (dřív se přilepila k poslednímu měsíci)',()=>{
  S.milestones=[{id:'f1',label:'Plánované stěhování',date:'2027-02-01'}];
  assert(data(DATA).events.length===0,'budoucí událost na ose');
});
check('etapa skončená před oknem se nekreslí (dřív zabrala celou osu)',()=>{
  DATA={transactions:mk(24)};S.transactions=DATA.transactions;
  S.milestones=[{id:'r1',label:'Stará etapa',kind:'era',date:'2024-09-01',dateTo:'2025-01-31'},
                {id:'r2',label:'Přes okraj',kind:'era',date:'2025-06-01',dateTo:'2026-04-30'}];
  const d=data(DATA,{rozsah:'6m'});
  assert(!d.eras.some(e=>e.id==='r1'),'skončená etapa je vidět');
  const r2=d.eras.find(e=>e.id==='r2'); assert(r2&&r2.from===0&&r2.to===1,'etapa přes okraj '+JSON.stringify(r2&&[r2.from,r2.to]));
});
check('HTML: poznámka = plná čára v její barvě, filtr ji schová',()=>{
  DATA={transactions:mk(12)};S.transactions=DATA.transactions;
  S.milestones=[{id:'n1',kind:'note',label:'Začala <b>topná</b> sezóna',date:'2026-03-16',color:'#e5534b'}];
  S.uiCfg={};
  let h=html();
  assert(h.indexOf('data-osa-poznamka="n1"')>=0,'poznámka chybí v grafu');
  assert(/<line[^>]*stroke="#e5534b"/.test(h),'čára nemá barvu poznámky');
  assert(h.indexOf('<b>topná')<0,'HTML v textu poznámky prošlo');
  assert(h.indexOf('NaN')<0&&h.indexOf('undefined')<0,'NaN/undefined v SVG');
  S.uiCfg={osa:{skryt:{poznamky:true}}};
  h=html(); assert(h.indexOf('data-osa-poznamka')<0,'filtr poznámky neschoval');
  S.uiCfg={osa:{rozsah:'6m'}};
  h=html(); assert(/aria-pressed="true"[^>]*>6M</.test(h),'tlačítko 6M není označené');
  assert(h.indexOf('posledních <b>6 měsíců</b>')>=0,'chybí vysvětlení přiblížení');
  S.uiCfg={};
});
check('graf je vyšší než dřív (Milan: „je malý")',()=>{
  const h=html(); const m=/<svg width="(\d+)" height="(\d+)"/.exec(h);
  assert(+m[2]>=330,'výška '+m[2]); assert(+m[1]>=800,'šířka '+m[1]+' (náhradní šířka bez DOM)');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ OSA ŽIVOTA OVĚŘENA');
process.exit(fails?1:0);
