// FinanceFlow · smoke test · Session 27 (v12.12) · 🔗 Spojit s… (TODO-358) · Statistiky za vybraný měsíc · Report nákupy
//  Milan: „Není brambor jako brambor… dal bych název Brambory konzumní a 3 aliasy“ · „aby se stejné výrobky
//  spojovaly a netvořily nové karty“ · „Statistiky + Nákupní DNA… Vybraný měsíc a Vše“ · „Report: 3 největší a 3 nejmenší nákupy“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const app=R('app.js','../js/app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const S={uiCfg:{},curMonth:9,curYear:2026,categories:[{id:'cat1',name:'Nákupy potravin',type:'expense'}],
 receipts:[
  {id:'a',store:'PENNY MARKET',date:'2026-10-02',total:40,items:[{name:'Brambory konz.poz.',price:39.9,qty:1}]},
  {id:'b',store:'Penny Market',date:'2026-10-09',total:35,items:[{name:'Brambory konzumni pozdn',price:34.9,qty:1}]},
  {id:'c',store:'Lidl',date:'2026-09-20',total:30,items:[{name:'BRAMBORY POZDNÍ',price:29.9,qty:1}]},
  {id:'d',store:'Albert',date:'2026-10-11',total:25,items:[{name:'Rané brambory',price:24.9,qty:1}]},
  {id:'e',store:'Albert',date:'2026-10-12',total:900,items:[{name:'Kefír 500ml',price:30,qty:1,ean:'8594003840110'},{name:'Kefir mix',price:870,qty:1}]}],
 transactions:[]};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[]},fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout,save(){}};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),ctx);
ctx.taxNastav(JSON.parse(R('taxonomie.json','../data/taxonomie.json')));
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení')+';this._set=(c,m,t)=>{_catMappingsCache=c;_productMapCache=m;_taxRozpocetCache=t;};',ctx);
vm.runInContext(R('receipts.js','../js/receipts.js'),ctx);
ctx._set({},{},{});
const L=()=>ctx.mapaUzivData(S.receipts,S);
console.log('── spojení ──');
let l=L(); const A=l.find(z=>z.nazev==='Brambory konz.poz.'), B=l.find(z=>z.nazev==='Brambory konzumni pozdn'), C=l.find(z=>z.nazev==='BRAMBORY POZDNÍ');
t('bez spojení: 3 karty brambor (+ rané zvlášť)',A&&B&&C&&l.some(z=>z.nazev==='Rané brambory'));
let k=ctx.mapaSpojitProvest(A,B,'Brambory konzumní'); l=L();
t('A + B → jedna karta s hlavním názvem a 2 zkratkami',l.filter(z=>/konz/i.test(z.nazev)).length===1&&l.find(z=>z.klic===k).pocet===2&&l.find(z=>z.klic===k).hlavniNazev==='Brambory konzumní',l.map(z=>[z.klic,z.pocet,z.hlavniNazev]));
const AB=l.find(z=>z.klic===k), C2=l.find(z=>z.nazev==='BRAMBORY POZDNÍ');
ctx.mapaSpojitProvest(AB,C2,'Brambory konzumní'); l=L();
t('+ Lidl → 1 karta, 3 aliasy ze 2 obchodů, rané brambory zůstaly zvlášť',l.find(z=>z.klic===k).pocet===3&&ctx.mapaAliasySkupiny(l.find(z=>z.klic===k)).length===3&&l.some(z=>z.nazev==='Rané brambory'));
S.receipts.push({id:'f',store:'Lidl',date:'2026-10-20',total:31,items:[{name:'BRAMBORY POZDNÍ',price:30.9,qty:1}]}); l=L();
t('další účtenka se stejnou zkratkou padne rovnou do karty',l.find(z=>z.klic===k).pocet===4);
t('text účtenek se nemění',S.receipts[2].items[0].name==='BRAMBORY POZDNÍ');
const kef=l.find(z=>z.klic==='ean:8594003840110'), mix=l.find(z=>z.nazev==='Kefir mix');
t('zkratka bez kódu + karta s kódem → zůstane karta s kódem',ctx.mapaSpojitProvest(mix,kef,'')==='ean:8594003840110'&&L().find(z=>z.klic==='ean:8594003840110').pocet===2);
t('dvě karty s různými kódy spojit nejde',ctx.mapaSpojitProvest({klic:'ean:1',nakupy:[]},{klic:'ean:2',nakupy:[]},'')===null);
t('✕ Odpojit: zkratka má zase vlastní kartu',ctx.mapaOdpojitProvest(ctx.normName('BRAMBORY POZDNÍ'))&&L().find(z=>z.klic===k).pocet===2&&L().some(z=>z.nazev==='BRAMBORY POZDNÍ'&&z.pocet===2));
t('kandidáti: podobné karty bez kódu, ne ona sama',ctx.mapaSpojitKandidati(L().find(z=>z.klic===k),'',L()).map(([x])=>x.nazev).includes('BRAMBORY POZDNÍ'));
const sp=R('statistika-polozek.js','../js/statistika-polozek.js');
t('Statistika položek bere spojené zkratky do stejné karty',/mapaSpojeniKam\(klic\)/.test(sp));

console.log('── Statistiky za vybraný měsíc ──');
const rc=R('receipts.js','../js/receipts.js');
t('výchozí vybraný měsíc, přepínač 📅 měsíc / ∞ Vše',ctx.rpStatObdobi()==='month'&&/∞ Vše/.test(ctx.rpObdobiPrepinac())&&/říjen 2026/.test(ctx.rpObdobiPrepinac()));
ctx._coicopPeriod='all'; t('∞ Vše přepne',ctx.rpStatObdobi()==='all'); ctx._coicopPeriod=undefined;
t('Za co utrácíš, souhrn, kategorie i Co nakupuješ z položek vybraného měsíce',/receipts = receipts\.filter\(r => rpVMesici\(r\.date\)\)/.test(rc)&&/rpStatObdobi\(\)==='month' \? allItems : _vse\.allItems/.test(rc));
t('Nejčastější položky dál s vlastním obdobím (ze všech položek)',/renderItemStatsList\(topItems, _vse\.allItems, D, _itemStatsPeriod\)/.test(rc));
t('Nákupní DNA za vybraný měsíc s přepínačem',/receipts\.filter\(r => rpStatObdobi\(\) === 'all' \|\| rpVMesici\(r\.date\)\)/.test(rc)&&/🧬 Nákupní DNA<\/span>' \+ rpObdobiPrepinac\(\)/.test(rc));

console.log('── Měsíční report: nákupy ──');
const rm=R('report-mesicni.js','../js/report-mesicni.js');
const c2={console,Date,Math,JSON,String,parseFloat,normalizeStoreName:x=>x,rcptUnikatni:x=>x}; c2.window=c2; vm.createContext(c2);
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');let d=0,j=s.indexOf('{',i);for(let q=j;q<s.length;q++){if(s[q]==='{')d++;else if(s[q]==='}'){d--;if(!d)return s.slice(i,q+1)}}};
vm.runInContext(pick(rm,'rpReportNakupy'),c2);
const n=c2.rpReportNakupy(S,9,2026);
t('3 největší (Albert 900, Lidl 31, Penny 40 → 900, 40, 35) a 3 nejmenší bez překryvu',n.nejvetsi.map(x=>x.kc).join()==='900,40,35'&&n.nejmensi.map(x=>x.kc).join()==='25,31',n);
t('srovnání s minulým měsícem (září: 1 účtenka, 29,9 Kč)',n.minule.n===1&&Math.abs(n.minule.kc-29.9)<0.01&&n.minule.m===8);
t('report: tabulka 3.5 a srovnání u KPI',/Největší a nejmenší nákupy/.test(rm)&&/proti \$\{_rpE\(RP_MES6\[u\.nakupy\.minule\.m\]\)\}/.test(rm));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
