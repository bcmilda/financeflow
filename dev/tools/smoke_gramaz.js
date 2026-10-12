// FinanceFlow · smoke test · S26 (v11.66) · gramáž položky z pole Balení, karty výrobku (obal) a zkratky
//  Milan: „připrav pole pro gramáž a čtení ze zkratky i obalu“. Dřív se cena za kg a shrinkflace
//  počítaly jen z gramáže napsané ve zkratce – „OREO DOUB. VAN.“ z výpočtů vypadlo.
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const app=R('app.js','../js/app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
const S={categories:[{id:'cat1',name:'Jídlo',type:'expense'}],receipts:[],uiCfg:{}};
const toasty=[];
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{}}),body:{appendChild(){}},head:{appendChild(){}}},
  fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout,URL,showToast:m=>toasty.push(m)};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),ctx);
ctx.taxNastav(JSON.parse(R('taxonomie.json','../data/taxonomie.json')));
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení')+';this._set=(c,m,t)=>{_catMappingsCache=c;_productMapCache=m;_taxRozpocetCache=t;};',ctx);
vm.runInContext(R('receipts.js','../js/receipts.js'),ctx);
vm.runInContext(R('ean-sken.js','../js/ean-sken.js'),ctx);
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};
const OREO='8590000000008';

console.log('── gramáž z textu (zkratka) ──');
const g=x=>JSON.stringify(ctx.gramazZTextu(x));
t('„Halls str. 33,5g“ → 33,5 g',g('Halls str. 33,5g')===JSON.stringify({m:33.5,j:'g'}),g('Halls str. 33,5g'));
t('„1,5 kg“ → 1500 g',g('Mouka 1,5 kg')===JSON.stringify({m:1500,j:'g'}));
t('multipack „6x0,5l“ → 3 l, 6 kusů',g('Voda 6x0,5l')===JSON.stringify({m:3000,j:'ml',kusy:6}),g('Voda 6x0,5l'));
t('multipack „PIVO 4X0,5L“ → 2 l',g('PIVO 4X0,5L')===JSON.stringify({m:2000,j:'ml',kusy:4}));
t('bez gramáže → nic',ctx.gramazZTextu('Oreo Doub. van.')===null);
t('zobrazení multipacku',ctx.baleniTextCely({m:3000,j:'ml',kusy:6})==='6× 500 ml (3 l)',ctx.baleniTextCely({m:3000,j:'ml',kusy:6}));

console.log('── pořadí zdrojů ──');
vm.runInContext(`_eanProdukty['${OREO}']={stav:'nalezeno',nazev:'Oreo Double vanilla',mnozstvi:{hodnota:157,jednotka:'g'}}`,ctx);
const P=it=>ctx.gramazPolozky(it);
t('zkratka bez gramáže + kód → gramáž z obalu (karta výrobku)',JSON.stringify(P({name:'Oreo Doub. van.',ean:OREO}))===JSON.stringify({m:157,j:'g',zdroj:'obal'}),P({name:'Oreo Doub. van.',ean:OREO}));
t('obal má přednost před zkratkou',P({name:'OREO DOUB VAN 154G',ean:OREO}).m===157);
t('ruční má přednost před obalem',P({name:'Oreo',ean:OREO,baleni:{m:150,j:'g'},baleniZdroj:'rucne'}).zdroj==='rucne');
t('uložená gramáž z obalu platí i bez načtené karty',P({name:'X',ean:'8591234000000',baleni:{m:90,j:'g'},baleniZdroj:'obal'}).zdroj==='obal');
const kk=ctx.mapaKartaKlic({klic:ctx.normName('Margot tyčinka')});
S.uiCfg.karty={[kk]:{mnozstvi:'80 g'}};
t('bez kódu → tvoje osobní karta',JSON.stringify(P({name:'Margot tyčinka'}))===JSON.stringify({m:80,j:'g',zdroj:'karta'}),P({name:'Margot tyčinka'}));
t('jen zkratka',P({name:'MLEKO 1L'}).zdroj==='zkratka'&&P({name:'MLEKO 1L'}).m===1000);
t('nic → null',P({name:'Rohlík'})===null);

console.log('── výpočty ──');
const jc=ctx.taxJednotkovaCena({name:'Oreo Doub. van.',ean:OREO,price:39.9});
t('NEGATIVNÍ KONTROLA naopak: cena za kg i bez gramáže ve zkratce',jc&&Math.abs(jc.cena-39.9/157*1000)<1e-9&&jc.zdroj==='obal',jc);
const ui=ctx.gramazNaKgL({name:'Voda 6x0,5l',price:59.4});
t('multipack: cena za litr z celého balení',ui&&ui.value===3&&ui.unit==='l',ui);
ctx._set({}, {'oreo doub van':{obecny:'sušenky',obecnyId:'susenky',konkretni:'Oreo Double vanilla'}}, {});
vm.runInContext(`_eanProdukty['8591234000000']={stav:'nalezeno',nazev:'Oreo Double vanilla',mnozstvi:{hodnota:145,jednotka:'g'}}`,ctx);
const I=(name,price,date,store,extra)=>Object.assign({name,price,qty:1,date,store},extra||{});
const sh=ctx.taxShrinkflace([I('Oreo Doub. van.',39.9,'2026-05-01','Albert',{ean:OREO}),I('Oreo Doub. van.',39.9,'2026-09-01','Albert',{ean:'8591234000000'})],S);
t('shrinkflace se pozná i u zkratky bez gramáže (157 g → 145 g, jiný kód)',sh.length===1&&sh[0].pred.baleni===157&&sh[0].po.baleni===145,sh);

console.log('── uložení gramáže z karty k položce ──');
const it1={name:'Oreo Doub. van.',ean:OREO};
t('kód + karta → položka dostane balení z obalu',ctx.eanGramazZKarty(it1)&&it1.baleni.m===157&&it1.baleniZdroj==='obal');
t('podruhé nic nemění',ctx.eanGramazZKarty(it1)===false);
const it2={name:'Oreo',ean:OREO,baleni:{m:150,j:'g'},baleniZdroj:'rucne'};
t('ruční gramáž se nepřepíše',ctx.eanGramazZKarty(it2)===false&&it2.baleni.m===150);

console.log('── pole Balení v editoru ──');
let kresleno=0; ctx.rpRender=()=>{kresleno++};
ctx._editReceipt={store:'Lidl',items:[{name:'Voda perlivá',price:12},{name:'Džus 1L',price:30},{name:'Sýr',price:40}]};
ctx.rpBaleniZmen(0,'6x0,5 l');
const e0=ctx._editReceipt.items[0];
t('zapsaný multipack se uloží jako ruční',e0.baleniZdroj==='rucne'&&e0.baleni.m===3000&&e0.baleni.j==='ml',e0);
ctx.rpBaleniZmen(1,'750');
const e1=ctx._editReceipt.items[1];
t('samotné číslo převezme jednotku z automatiky (ml)',e1.baleni.m===750&&e1.baleni.j==='ml'&&e1.baleniZdroj==='rucne',e1);
ctx.rpBaleniZmen(1,'');
t('prázdné = zpět na zkratku',!e1.baleniZdroj&&e1.baleni.m===1000,e1);
ctx.rpBaleniZmen(2,'hodně');
t('nesmysl se neuloží a ukáže se nápověda',!ctx._editReceipt.items[2].baleni&&toasty.length===1);
const src=R('receipts.js','../js/receipts.js');
t('editor má pole Balení (ne u váženého zboží – tam jen prázdné místo stejné šířky)',/id="rp_bal_\$\{i\}"/.test(src)&&/if \(rpVazene\(it\)\) return '<span style="width:76px;flex-shrink:0"/.test(src));
t('odkud gramáž je, se ukládá i do položek transakce',(src.match(/baleniZdroj: it\.baleniZdroj/g)||[]).length===2);
const inf=R('inflace.js','../js/inflace.js'), stp=R('statistika-polozek.js','../js/statistika-polozek.js');
t('Inflace i Statistika položek čtou gramáž ze stejného místa',/gramazNaKgL\(it\)/.test(inf)&&/gramazPolozky\(it\)/.test(stp));

console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
