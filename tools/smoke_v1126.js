// FinanceFlow · smoke test · S24 · v11.26 T4 krok 2 – inflace a statistiky přes taxonomii
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
const app=R('app.js','../js/app.js'); const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
const S={categories:[{id:'cat1',name:'Jídlo',coicop:1,type:'expense'}],receipts:[
 {date:'2025-03-05',store:'Lidl',total:100,items:[{name:'Rohlík 43g',price:3,qty:10,itemCatId:'cat1'},{name:'Prostředek na nádobí 450ml',price:50,qty:1,itemCatId:'cat1'}]},
 {date:'2026-03-05',store:'Lidl',total:120,items:[{name:'Rohlík 43g',price:3.6,qty:10,itemCatId:'cat1'},{name:'Prostředek na nádobí 450ml',price:55,qty:1,itemCatId:'cat1'},{name:'XYZ',price:20,qty:1,itemCatId:'cat1'}]}]};
const c={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[]},fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout,
  fmt:v=>String(v),czkToBase:v=>v,productGroupLookup:n=>/xyz/i.test(n)?{code:'01.199'}:null};
c.window=c; vm.createContext(c);
vm.runInContext(R('helpers.js','../js/helpers.js'),c); vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),c); c.taxNastav(JSON.parse(R('taxonomie.json','../data/taxonomie.json')));
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení')+';this._set=(cc,m)=>{_catMappingsCache=cc;_productMapCache=m;};',c);
vm.runInContext(R('receipts.js','../js/receipts.js'),c); c._set({},{});
vm.runInContext(R('inflace.js','../js/inflace.js'),c);
vm.runInContext(R('coicop.js','../js/coicop.js'),c);
const items=S.receipts.flatMap(r=>r.items.map(it=>Object.assign({},it,{date:r.date,store:r.store})));
const u=c.taxUtrataPodkategorie(items,S);
t('statistiky: podkategorie Pečivo a Mytí nádobí',u.pods.some(p=>p.id==='pecivo')&&u.pods.some(p=>p.nazev==='Mytí nádobí'),u.pods.map(p=>p.id));
t('statistiky: mimo taxonomii zvlášť',u.mimo===20);
t('statistiky: měsíční průměr',u.mesicu===2&&Math.abs(u.pods.find(p=>p.id==='pecivo').mesicne-(30+36)/2)<1e-9);
t('statistiky: karta',c.taxUtrataHTML(items).includes('Za co utrácíš')&&c.taxUtrataHTML(items).includes('Mimo taxonomii'));
const col=c._inflCollect();
const jar=col.obs.find(o=>/nadobi|nádobí/.test(o.name.toLowerCase()));
t('inflace: oddíl z taxonomie (nádobí = 05, ne 01 podle kategorie)',jar.oddil===5&&jar.pod&&jar.pod.nazev==='Mytí nádobí',jar);
t('inflace: položka mimo taxonomii dál podle kategorie',col.obs.find(o=>o.name==='XYZ').oddil===1);
const pk=c._inflPodlePodkategorii(col.obs);
t('inflace po podkategoriích: Pečivo +20 %',Math.abs(pk.find(x=>x.pod.id==='pecivo').zmena-20)<1e-6,pk);
t('inflace: karta „Co tě zdražuje nejvíc"',c._inflPodkategorieCard(col.obs).includes('Co tě zdražuje nejvíc'));
const roll=c.coicopSubclassTotals(2,2026);
t('COICOP rozpad: kód ČSÚ z taxonomie (pečivo 01.113, nádobí 05.611)',roll.code['01.113']===36&&roll.code['05.611']===55,roll.code);
t('COICOP rozpad: záloha klíčová slova',roll.code['01.199']===20);
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
