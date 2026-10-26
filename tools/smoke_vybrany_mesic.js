// FinanceFlow · smoke test · Session 27 (v12.11) · Analýza účtenek počítá od VYBRANÉHO měsíce
//  Milan: „Nejčastější položky a Vývoj nákupů: 1M–12M počítané od vybraného měsíce. Trend a Slevy taky.
//  Srovnání ČR: průměr za kalendářní rok… Učení: přepínač roku se zasekl na 2026… při přepínání měsíce
//  nepříjemný problik… zkontroluj, zda všechny stránky počítají ze zvoleného měsíce a ne od dneška.“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const rc=R('receipts.js','../js/receipts.js'), sp=R('statistika-polozek.js','../js/statistika-polozek.js'), ob=R('obchody.js','../js/obchody.js'), as=R('assets.js','../js/assets.js');
const S={curMonth:2,curYear:2027,uiCfg:{},receipts:[],transactions:[]};
const c={S,console,Date,Math,JSON,localStorage:{getItem:()=>null,setItem(){}},getData:()=>S,normalizeStoreName:x=>x,isTransferTx:()=>false,txCZK:t=>t.amount,dupUctenkaPro:()=>null};
c.window=c; vm.createContext(c);
vm.runInContext(pick(rc,'rpMesiceDoVybraneho')+'\n'+pick(rc,'rpObdobiPopis')+'\n'+pick(sp,'spFiltruj')+'\n'+ob.replace(/^const OBCH_PALETA[\s\S]*?;\n/m,m=>m),c);

console.log('── období končí vybraným měsícem ──');
t('3 měsíce do března 2027 = led–bře 2027',c.rpMesiceDoVybraneho(3).join()==='2027-01,2027-02,2027-03');
t('12 měsíců přes přelom roku',c.rpMesiceDoVybraneho(12)[0]==='2026-04'&&c.rpMesiceDoVybraneho(12)[11]==='2027-03');
t('popisek „do března 2027“',/do března 2027/.test(c.rpObdobiPopis()));
const rad=[{mesic:'2026-12'},{mesic:'2027-02'},{mesic:'2027-03'},{mesic:'2027-04'}].map(x=>Object.assign({obchod:'',kraj:'',mesto:'',stitek:'',kat:'',oblast:'',pod:'',coicop:'',nazev:'x',obecny:'',ean:''},x));
t('Statistika položek: 3 měsíce do března – bez dubna (horní mez) i bez prosince',c.spFiltruj(rad,{obdobi:'3'},new Date(2027,2,15)).map(x=>x.mesic).join()==='2027-02,2027-03');
t('Statistika položek: Vše = celá historie',c.spFiltruj(rad,{obdobi:'vse'},new Date(2027,2,15)).length===4);

console.log('── napojení v Analýze účtenek ──');
t('Nejčastější položky: 1M–12M od vybraného měsíce',/const _mes = period==='vše' \? null : rpMesiceDoVybraneho\(/.test(rc)&&!/fromDate\.setMonth\(fromDate\.getMonth\(\)-3\)/.test(rc));
t('Vývoj nákupů: osa končí vybraným měsícem',/const axisMonths = rpMesiceDoVybraneho\(months\)/.test(rc));
t('volba období přežije překreslení (dřív vždy 3M)',/renderItemStatsList\(topItems, allItems, D, _itemStatsPeriod\)/.test(rc)&&/p===_itemStatsPeriod\?'active'/.test(rc));
t('Trend: 6 měsíců do vybraného',/const last6Months = rpMesiceDoVybraneho\(6\)/.test(rc));
t('Slevy: měsíc a rok podle vybraného měsíce',/const now = \(typeof S !== 'undefined' && S\.curYear != null\) \? new Date\(S\.curYear, S\.curMonth, 15\)/.test(rc)&&/d\.getMonth\(\)<=now\.getMonth\(\)\)\{ savYear/.test(rc));
t('Srovnání ČR: průměr za rok vybraného měsíce (leden – vybraný), s popiskem',/mm\.slice\(0,4\) === _cmpRok && mm <= _cmpDo/.test(rc)&&/průměr na měsíc za rok \$\{o\.rok\}/.test(rc));
t('Statistika položek volá filtr s vybraným měsícem',/spFiltruj\(vse, f, \(typeof S !== 'undefined' && S\.curYear != null\) \? new Date\(S\.curYear, S\.curMonth, 15\)/.test(sp)&&/'Vybraný měsíc'/.test(sp));

console.log('── Učení: trend obchodů ──');
S.receipts=[{store:'Penny',date:'2026-06-03',total:300,items:[1]},{store:'Penny',date:'2027-02-03',total:200,items:[1]}];
c._obchTrend=undefined; vm.runInContext('window._obchTrend=undefined',c);
let h=c.obchTrendKartaHTML(S);
t('6 měsíců končí vybraným měsícem (popisek „do 3/27“)',/6 měsíců do 3\/27/.test(h),h.match(/6 měsíců[^<]*/));
c.obchTrendNastav=c.obchTrendNastav; vm.runInContext("window._obchTrend.obd='rok'",c);
h=c.obchTrendKartaHTML(S);
t('Rok = rok vybraného měsíce (2027), ‹ do 2026 povolená',/<b style="font-size:\.8rem">2027<\/b>/.test(h)&&/disabled[^>]*onclick="obchTrendNastav\('rok',-1\)"/.test(h)===false,h.slice(h.indexOf('‹')-200,h.indexOf('‹')));
vm.runInContext("window._obchTrend.rok=2026",c); h=c.obchTrendKartaHTML(S);
t('ručně zvolený rok zůstane, dokud se nezmění rok nahoře',/<b style="font-size:\.8rem">2026<\/b>/.test(h));
S.curYear=2026; S.curMonth=9; h=c.obchTrendKartaHTML(S);
t('jen jeden rok s daty → vysvětlení místo „zaseknutí“',/<b style="font-size:\.8rem">2026<\/b>/.test(h));
S.receipts=[{store:'Penny',date:'2026-06-03',total:300,items:[1]}]; h=c.obchTrendKartaHTML(S);
t('…„nákupy máš zatím jen z roku 2026“',/nákupy máš zatím jen z roku 2026/.test(h));

console.log('── bublina v grafu a problik ──');
t('bublina v grafu obchodů bez druhého měřítka (setTransform)',/ctx2\.save\(\); ctx2\.setTransform\(dpr,0,0,dpr,0,0\);/.test(rc)&&!/ctx2\.save\(\); ctx2\.scale\(dpr,dpr\);/.test(rc));
t('stejná chyba v grafu Aktiv opravena',/c2\.save\(\); c2\.setTransform\(dpr,0,0,dpr,0,0\);/.test(as)&&!/c2\.save\(\); c2\.scale\(dpr,dpr\);/.test(as));
t('překreslení drží výšku stránky a grafy kreslí hned',/el\.style\.minHeight = _vyska0 \+ 'px'/.test(rc)&&/if \(canvas\.clientWidth\) draw\(\); else requestAnimationFrame\(draw\);/.test(rc));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
