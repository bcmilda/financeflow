// FinanceFlow · smoke test · S24 · v11.19 T4 krok 1 – zdražování a shrinkflace přes taxonomii
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const app=R('app.js','../js/app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
const S={categories:[{id:'cat1',name:'Jídlo',type:'expense'}],receipts:[]};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[]},fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),ctx);
ctx.taxNastav(JSON.parse(R('taxonomie.json','../data/taxonomie.json')));
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení')+';this._set=(c,m,t)=>{_catMappingsCache=c;_productMapCache=m;_taxRozpocetCache=t;};',ctx);
vm.runInContext(R('receipts.js','../js/receipts.js'),ctx);
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
ctx._set({}, {
  'k exo vlock':{obecny:'ovesné vločky',obecnyId:'ovesne vlocky',konkretni:'K-Classic ovesné vločky'},
  'vlocky oves':{obecny:'ovesné vločky',obecnyId:'ovesne vlocky',konkretni:'K-Classic ovesné vločky'},
  'sedita mila rezy':{obecny:'oplatky',obecnyId:'oplatky',konkretni:'Sedita Mila řezy'}}, {});
const I=(name,price,date,store,extra)=>Object.assign({name,price,qty:1,date,store},extra||{});
const items=[
  I('K EXO VLOCK 500G',24.9,'2026-06-05','Kaufland'), I('VLOCKY OVES. 500G',27.9,'2026-07-10','Albert'),
  I('K EXO VLOCK 500G',27.9,'2026-09-02','Kaufland'), I('Ovesné vločky 250g',16.9,'2026-09-20','Lidl'),
  I('SEDITA MILA REZY 50G',12.9,'2026-06-01','Albert'), I('SEDITA MILA REZY 45G',12.9,'2026-09-01','Kaufland'),
  I('Banány',32.9,'2026-06-01','Lidl',{unit:'kg',qty:1.2}), I('Banány',36.9,'2026-09-01','Lidl',{unit:'kg',qty:1.1}),
  I('XYZ neznámé',50,'2026-09-01','Lidl')];
t('cena za kg z gramáže',Math.abs(ctx.taxJednotkovaCena({name:'K EXO VLOCK 500G',price:24.9}).cena-49.8)<1e-9);
t('vážené zboží: cena je už za kg',ctx.taxJednotkovaCena({name:'Banány',price:32.9,unit:'kg'}).cena===32.9);
const v=ctx.taxCenyVyvoj(items,S);
const vl=v.polozky.find(p=>p.id==='ovesne vlocky');
t('různé zkratky a obchody = jeden výrobek',vl&&vl.pocet===4&&vl.zkratek===3,vl);
t('srovnání za kg (první vs poslední měsíc)',Math.abs(vl.prvni-49.8)<1e-9&&Math.abs(vl.posledni-_m([55.8,67.6]))<1e-9&&vl.zmena===Math.round((_m([55.8,67.6])-49.8)/49.8*100),vl);
function _m(a){a=a.slice().sort((x,y)=>x-y);const k=a.length>>1;return a.length%2?a[k]:(a[k-1]+a[k])/2;}
t('nejlevnější obchod',vl.obchody[0].obchod==='Kaufland'||vl.obchody[0].obchod==='Albert');
const ban=v.polozky.find(p=>p.id==='banan'); t('banány podle názvu, vážené',ban&&ban.zmena===12,ban&&ban.zmena);
t('pokrytí útraty taxonomií',v.pokryti===80,v.pokryti);
const sh=ctx.taxShrinkflace(items,S);
t('shrinkflace napříč obchody',sh.length===1&&sh[0].nazev==='Sedita Mila řezy'&&sh[0].baleniZmena===-10&&sh[0].skryteZdrazeni===11,sh);
t('dražší balení není shrinkflace',ctx.taxShrinkflace([I('SEDITA MILA REZY 50G',12.9,'2026-06-01','A'),I('SEDITA MILA REZY 45G',14.9,'2026-09-01','B')],S).length===0);
const h=ctx.taxZdrazovaniHTML(items);
t('karta: nadpis, pokrytí, výrobky',h.includes('Podle výrobků')&&h.includes('pokrývá')&&h.includes('Ovesné vločky')&&h.includes('3 různé zkratky'));
t('karta: shrinkflace',h.includes('Shrinkflace napříč obchody')&&h.includes('+11 %'));
t('v záložce Zdražování nahoře',/html \+= taxZdrazovaniHTML\(allItems \|\| \[\]\)/.test(R('receipts.js','../js/receipts.js')));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
