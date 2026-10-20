// FinanceFlow · smoke test · Session 27 (v11.90) · 🧮 Kalkulačky (TODO-356, TODO-355)
//  Milan: „ano, jedna stránka“ · „rozklikávací karty jako u jiných tvůrců“
//  Monte Carlo s pevným seedem, tři karty na datech, vykreslení a napojení do appky.
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const src=R('kalkulacky.js','../js/kalkulacky.js'), ui=R('ui.js','../js/ui.js'), html=R('app.html','../app.html'), proj=R('projects.js','../js/projects.js');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

const els={};
const mkEl=id=>({id,style:{},innerHTML:'',contains:()=>false});
const ctx={console,Intl,Date,Math,JSON,
  localStorage:{_s:{},getItem(k){return this._s[k]||null},setItem(k,v){this._s[k]=v}},
  document:{getElementById:id=>els[id],querySelector:()=>els._mn||(els._mn={style:{}}),activeElement:null,createElement:()=>({})},
  CZ_M:['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'],
  fmtB:v=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(v)+' Kč',
  isTransferTx:t=>t.category==='transfer'||t.catId==='transfer',
  txCZK:t=>t.amtCZK!=null?t.amtCZK:(t.amount||0),
  walletBalanceCZK:(id,D)=>D.wallets.find(w=>w.id===id).balance,
  PAGE_TITLES:{}};
ctx.window=ctx; vm.createContext(ctx); vm.runInContext(src,ctx);

console.log('── Monte Carlo jádro ──');
t('mcPercentil: lineární interpolace (P50 z 1..4 = 2,5; P0 = min; P100 = max)',ctx.mcPercentil([1,2,3,4],50)===2.5&&ctx.mcPercentil([1,2,3,4],0)===1&&ctx.mcPercentil([1,2,3,4],100)===4);
const a1=ctx.mcRng(7),a2=ctx.mcRng(7),b=ctx.mcRng(8);
const s1=[a1(),a1(),a1()],s2=[a2(),a2(),a2()];
t('mcRng: stejný seed = stejná řada, jiný seed = jiná, hodnoty v [0,1)',JSON.stringify(s1)===JSON.stringify(s2)&&b()!==s1[0]&&s1.every(x=>x>=0&&x<1));
const m1=ctx.mcSimuluj(500,r=>r()*100),m2=ctx.mcSimuluj(500,r=>r()*100);
t('mcSimuluj: výchozí pevný seed → opakovaně stejné percentily',m1.p50===m2.p50&&m1.p5===m2.p5);
t('mcSimuluj: rovnoměrné 0–100 → P50 ≈ 50, P5 ≈ 5, P95 ≈ 95, seřazené',Math.abs(m1.p50-50)<6&&Math.abs(m1.p5-5)<3&&Math.abs(m1.p95-95)<3&&m1.p5<m1.p25&&m1.p25<m1.p50&&m1.p50<m1.p75&&m1.p75<m1.p95,m1);
const mc=ctx.mcSimuluj(300,r=>{const c=[0];for(let k=1;k<=4;k++)c.push(c[k-1]+r());return c;});
t('mcSimuluj s cestami: percentily po krocích, výsledek = konec cesty',mc.kroky.length===5&&mc.kroky[0].p50===0&&mc.kroky[4].p50===mc.p50);
let nn=0;for(let i=0;i<20000;i++){const z=ctx.mcNormal(ctx.mcRng(i+1));if(Math.abs(z)<1.96)nn++;}
t('mcNormal: ~95 % hodnot v ±1,96',Math.abs(nn/20000-0.95)<0.01,nn/20000);
t('mcPodil',ctx.mcPodil([1,2,3,4],x=>x>=3)===0.5&&ctx.mcPodil([],()=>true)===0);

console.log('── 🛟 Rezerva ──');
let r=ctx.kalkRezerva({uspory:30000,vydaje:[10000]});
t('30 000 Kč, výdaje stále 10 000 → vydrží přesně 3 měsíce, 3 m. 100 %, 6 m. 0 %',Math.abs(r.median-3)<1e-9&&r.pst3===1&&r.pst6===0,{m:r.median,p3:r.pst3,p6:r.pst6});
r=ctx.kalkRezerva({uspory:30000,vydaje:[10000],omezeni:0.5});
t('omezení výdajů o 50 % → 6 měsíců',Math.abs(r.median-6)<1e-9&&r.pst6===1);
r=ctx.kalkRezerva({uspory:30000,vydaje:[10000],prijem:10000});
t('příjem během výpadku pokryje výdaje → horizont (60+)',r.median===60&&r.pst6===1);
r=ctx.kalkRezerva({uspory:25000,vydaje:[10000]});
t('neúplný měsíc: 25 000 / 10 000 = 2,5 měsíce',Math.abs(r.median-2.5)<1e-9);
r=ctx.kalkRezerva({uspory:30000,vydaje:[5000,15000]});
t('kolísavé výdaje (5 000 / 15 000): medián kolem 3, pásmo široké, pst 3 m. mezi 0 a 1',r.median>2&&r.median<4.5&&r.pst3>0.2&&r.pst3<0.9&&r.sim.kroky[2].p5<r.sim.kroky[2].p95,{m:r.median,p3:r.pst3});
t('bez výdajů nic nepočítá (null)',ctx.kalkRezerva({uspory:1,vydaje:[]})===null);

console.log('── 📈 investice ──');
let inv=ctx.kalkInvestice({mesicne:1000,let:10,vynos:0,volatilita:0});
t('0 % výnos, 0 % kolísání → 120 000 Kč = vloženo',inv.sim.p50===120000&&inv.vlozeno[10]===120000&&inv.sim.kroky.length===11);
inv=ctx.kalkInvestice({mesicne:1000,let:10,vynos:12,volatilita:0});
const fv=Math.round(1000*((Math.pow(1.01,120)-1)/0.01));
t('12 % ročně bez kolísání = složené úročení 1 %/měs (230 039 Kč)',Math.abs(inv.sim.p50-fv)<=2,[inv.sim.p50,fv]);
inv=ctx.kalkInvestice({mesicne:1000,let:10,vynos:6,volatilita:15});
const kk=inv.sim.kroky[10];
t('s kolísáním vějíř: P5 < vloženo < P95 a medián > vloženo',kk.p5<120000&&kk.p95>120000&&kk.p50>120000,kk);

console.log('── 📅 Do výplaty ──');
let v=ctx.kalkDoVyplaty({volne:1000,dni:5,denni:[100]});
t('1 000 Kč, 5 dní po 100 → zbude 500, vyjdeš 100 %',v.median===500&&v.pstVyjdes===1&&v.sim.kroky.length===6);
v=ctx.kalkDoVyplaty({volne:1000,dni:15,denni:[100]});
t('15 dní po 100 → chybí 500, vyjdeš 0 %, horších 10 % = −500',v.median===-500&&v.pstVyjdes===0&&v.p10===-500);
v=ctx.kalkDoVyplaty({volne:1000,dni:10,denni:[0,200],minRez:500});
t('dny bez útraty se počítají; rezerva má nižší pravděpodobnost než „vyjdeš“',v.pstVyjdes>0.4&&v.pstVyjdes<0.8&&v.pstRezerva<v.pstVyjdes,{a:v.pstVyjdes,b:v.pstRezerva});
t('měřítko: denní útrata ×2',ctx.kalkDoVyplaty({volne:1000,dni:5,denni:[100],meritko:2}).median===0);

console.log('── data z appky ──');
const dnes=new Date(2026,9,19);
const D={categories:[{id:'jidlo',name:'Jídlo',subs:['Pivo','Supermarket']},{id:'pivo',name:'Pivo',icon:'🍺'},{id:'cig',name:'Cigarety'},{id:'byd',name:'Bydlení',expenseChar:'regular'},{id:'vyp',name:'Výplata',type:'income'}],
  wallets:[{id:'b',name:'Účet',type:'account',balance:20000},{id:'s',name:'Spořák',type:'savings',balance:50000},{id:'i',name:'ETF',type:'investment',balance:99999},{id:'k',name:'Kreditka',type:'card',balance:-3000},{id:'x',name:'Stará',type:'cash',balance:777,archived:true},{id:'h',name:'Hotovost',type:'cash',balance:1500}],
  transactions:[
    {id:1,type:'expense',amount:8000,date:'2026-07-10',catId:'jidlo'},
    {id:2,type:'expense',amount:12000,date:'2026-08-10',catId:'jidlo'},
    {id:3,type:'expense',amount:5000,date:'2026-08-11',catId:'x',category:'transfer'},
    {id:4,type:'expense',amount:9000,date:'2026-09-03',catId:'jidlo',splitParent:true},
    {id:5,type:'expense',amount:100,date:'2026-09-03',catId:'jidlo',amtCZK:2500,currency:'EUR'},
    {id:6,type:'expense',amount:300,date:'2026-10-05',catId:'jidlo'},
    {id:7,type:'expense',amount:150,date:'2026-09-20',catId:'jidlo',subcat:'Pivo'},
    {id:8,type:'expense',amount:600,date:'2026-09-21',catId:'pivo'},
    {id:9,type:'expense',amount:400,date:'2025-01-05',catId:'cig'},
    {id:10,type:'expense',amount:200,date:'2026-10-02',catId:'cig'},
  ]};
const mv=ctx.kalkMesicniVydaje(D,dnes,12);
t('uzavřené měsíce: bez října (běží), bez přesunu a rodiče rozpadu, cizí měna přes txCZK',JSON.stringify(mv.map(x=>[x.m,x.v]))===JSON.stringify([[6,8000],[7,12000],[8,3250]]),mv);
t('měsíc bez výdajů se vynechá (ne 0 Kč) a starší než rok se nebere',mv.length===3);
const us=ctx.kalkUspory(D);
t('úspory: účet + spořák + hotovost, bez investic, kreditky a archivu',us.celkem===71500&&us.penezenky.length===3,us);
const moz=ctx.kalkZlozvykMoznosti(D,dnes);
const vych=ctx.kalkZlozvykVychozi(moz);
t('automatický výběr: kategorie Pivo, Cigarety a podkategorie Jídlo › Pivo',vych.includes('pivo|')&&vych.includes('cig|')&&vych.includes('jidlo|Pivo')&&!vych.includes('jidlo|'),vych);
const zl=ctx.kalkZlozvykData(D,vych,dnes);
t('útrata za rok 950 Kč (150 + 600 + 200), celkem i se starými cigaretami 1 350',zl.rok===950&&zl.celkem===1350&&zl.pocet===4,zl);
t('měsíčně = rok ÷ 12 (data jsou starší než rok)',zl.mesicuDat===12&&zl.mesicne===79,zl);
t('podkategorie se nepřičte dvakrát, když je vybraná i celá kategorie',ctx.kalkZlozvykData(D,['jidlo|','jidlo|Pivo'],dnes).rok===22950);
ctx.vyplDopocet=z=>({cisty:z.c}); ctx.vyplHodinyZPasky=z=>({odprac:z.h,dovolenaH:z.d||0});
let h=ctx.kalkHodinovka({payslips:[{m:'2026-08',c:30000,h:150,d:11},{m:'2026-09',c:33000,h:165}]});
t('hodinovka z výplatnic: (30 000 + 33 000) ÷ (161 + 165) = 193 Kč/h',h.kc===193&&h.zdroj==='vyplatnice',h);
delete ctx.vyplDopocet; ctx.computeBaseIncome=()=>32000;
h=ctx.kalkHodinovka({payslips:[]});
t('bez výplatnic odhad: příjem 32 000 ÷ 160 h = 200 Kč/h',h.kc===200&&h.zdroj==='odhad');

//  Do výplaty – stejný základ jako Finanční radar (stuby výpočtu cyklu)
ctx.radarPaydayInfo=(D2,ref)=>({lastPayday:new Date(2026,9,15),today:new Date(ref),nextPayday:new Date(2026,9,25),daysLeft:6});
ctx.getTxByRange=(a,b2,D2)=>D2.transactions.filter(x=>{const d=new Date(x.date);return d>=a&&d<=b2;});
ctx.incSum=(txs)=>txs.filter(x=>x.type==='income').reduce((s,x)=>s+x.amount,0);
ctx.expSum=(txs)=>txs.filter(x=>x.type==='expense'&&!ctx.isTransferTx(x)).reduce((s,x)=>s+x.amount,0);
ctx.budouciGetAll=()=>[{date:'2026-10-22',amount:1200},{date:'2026-10-25',amount:9999}];
ctx._settings={minReserve:'500'};
const D3={categories:D.categories,transactions:[
  {id:'p',type:'income',amount:30000,date:'2026-10-15',catId:'vyp'},
  {id:'a',type:'expense',amount:800,date:'2026-10-16',catId:'jidlo'},
  {id:'r',type:'expense',amount:10000,date:'2026-10-16',catId:'byd'},
  {id:'c',type:'expense',amount:200,date:'2026-10-18',catId:'jidlo'},
  {id:'start',type:'expense',amount:50,date:'2026-10-10',catId:'jidlo'}]};
const dv=ctx.kalkDoVyplatyData(D3,dnes);
t('volné = příjem 30 000 − výdaje 11 000 − platby před výplatou 1 200 = 17 800 (platba v den výplaty se nepočítá)',dv.volne===17800&&dv.budouci===1200,dv);
t('denní útrata od prvního záznamu (9 dní, i nulové), bez fixního nájmu',dv.denni.length===9&&dv.denni.reduce((s,x)=>s+x,0)===1050&&dv.denni.filter(x=>x===0).length===6,dv.denni);
t('nedotknutelná rezerva z Nastavení',dv.minRez===500);

console.log('── vykreslení: rozklikávací karty ──');
els.kalkulackyContent=mkEl('kalkulackyContent');
ctx.getData=()=>D3; ctx.tabIntro=(k,i,n,txt)=>`<div class="intro">${n}</div>`;
ctx.renderKalkulacky();
let out=els.kalkulackyContent.innerHTML;
t('tři karty s ikonou, názvem, popiskem a tlačítkem „Otevřít kalkulačku →“',['kalkK_rezerva','kalkK_zlozvyk','kalkK_vyplata'].every(k=>out.includes(`id="${k}"`))&&(out.match(/Otevřít kalkulačku →/g)||[]).length===3&&/🛟/.test(out)&&/🚬/.test(out)&&/📅/.test(out));
t('sbalená karta ukazuje výsledek (souhrn), ale ne vstupy ani graf',/id="kalkTeaser_vyplata"/.test(out)&&/vyjdeš/.test(out)&&!/<svg/.test(out)&&!/<input/.test(out));
t('šipky měsíce schované (počítá se k dnešku)',els._mn.style.display==='none');
t('název stránky v hlavičce',ctx.PAGE_TITLES.kalkulacky==='🧮 Kalkulačky');
ctx.kalkOtevri('vyplata'); out=els.kalkulackyContent.innerHTML;
t('otevřená karta: vstupy z dat, „Sbalit ↑“, graf a tabulka',/Sbalit ↑/.test(out)&&/oninput="kalkVstup\('vyplata','volne',this\)"/.test(out)&&/placeholder="17\u00a0800"/.test(out)&&/<svg viewBox="0 0 360 230"/.test(out)&&/max-width:640px/.test(out)&&/Tabulka hodnot/.test(out));
t('graf: osy s popisky, legenda, klepnutí pro hodnoty',/dny do výplaty/.test(out)&&/zbývá peněz \(Kč\)/.test(out)&&/9 z 10 případů/.test(out)&&/medián/.test(out)&&/onclick="kalkTip\('vyplata',/.test(out));
t('otevřená je jen jedna karta',(out.match(/Sbalit ↑/g)||[]).length===1);
t('stav se pamatuje (otevřená karta)',JSON.parse(ctx.localStorage._s.ffKalkStav).otevrena==='vyplata');
ctx.kalkOtevri('rezerva'); out=els.kalkulackyContent.innerHTML;
t('otevření jiné karty zavře předchozí',/oninput="kalkVstup\('rezerva','uspory',this\)"/.test(out)&&!/kalkVstup\('vyplata'/.test(out));
ctx.kalkOtevri('rezerva'); out=els.kalkulackyContent.innerHTML;
t('druhé klepnutí kartu sbalí',!/Sbalit ↑/.test(out));
ctx.kalkOtevri('zlozvyk'); out=els.kalkulackyContent.innerHTML;
t('výnos a kolísání jsou „výchozí hodnota“, ne „z tvých dat“',/kalkVstup\('zlozvyk','vynos',this\)"[\s\S]{0,600}⚙️ výchozí hodnota/.test(out)&&/kalkVstup\('zlozvyk','volatilita',this\)"[\s\S]{0,600}⚙️ výchozí hodnota/.test(out));
ctx.kalkOtevri('zlozvyk');
// ruční hodnota: přepočítá jen výsledek, políčko zůstane
els.kalkTeaser_vyplata={innerHTML:''}; els.kalkVysl_vyplata={innerHTML:''};
ctx.kalkVstup('vyplata','volne',{tagName:'INPUT',value:'100'});
t('ruční „volné 100 Kč“ → přepočet souhrnu i výsledku bez přestavby políček',/vyjdeš/.test(els.kalkTeaser_vyplata.innerHTML)&&/chybělo/.test(els.kalkVysl_vyplata.innerHTML)&&ctx._kalk.vyplata.volne===100);
ctx.kalkVstup('vyplata','volne',{tagName:'INPUT',value:''});
t('prázdné políčko = zpět na hodnotu z dat',ctx._kalk.vyplata.volne===null);
// psaní do políčka → synchronizace nepřestaví stránku
const pred=els.kalkulackyContent.innerHTML; ctx.document.activeElement={tagName:'INPUT'}; els.kalkulackyContent.contains=()=>true;
els.kalkulackyContent.innerHTML='ZACHOVAT'; ctx.renderKalkulacky();
t('když se píše do políčka, překreslení stránku nepřestaví',els.kalkulackyContent.innerHTML==='ZACHOVAT');
ctx.document.activeElement=null; els.kalkulackyContent.contains=()=>false; els.kalkulackyContent.innerHTML=pred;
// prázdná data: vysvětlit, co se hledalo (FIX-214)
ctx.getData=()=>({categories:[],wallets:[],transactions:[]}); ctx.kalkOtevri('rezerva'); out=els.kalkulackyContent.innerHTML;
t('prázdná data: karta vysvětlí, co hledala, a políčka zůstanou',/Zatím nemám z čeho počítat/.test(out)&&/uzavřené měsíce/.test(out)&&/kalkVstup\('rezerva','vydaje'/.test(out));

console.log('── napojení do appky ──');
t('menu Nástroje → 🧮 Kalkulačky',/showPage\('kalkulacky',this\)"><span class="nav-icon">🧮<\/span> Kalkulačky/.test(html));
t('stránka page-kalkulacky s kalkulackyContent',/<div class="page" id="page-kalkulacky">\s*<div id="kalkulackyContent"><\/div>/.test(html));
t('skript kalkulacky.js načtený před firebase.js',html.indexOf('js/kalkulacky.js')>0&&html.indexOf('js/kalkulacky.js')<html.indexOf('js/firebase.js'));
t('renderPage volá renderKalkulacky',/if\(curPage==='kalkulacky'&&typeof renderKalkulacky==='function'\)renderKalkulacky\(\);/.test(ui));
t('Simulace života odkazuje na Kalkulačky',/showPageByName\('kalkulacky'\)/.test(proj));

console.log(`\n${ok} ✅  ${bad} ❌`);
process.exit(bad?1:0);
