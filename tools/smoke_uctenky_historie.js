// FinanceFlow · smoke test · S26 (v11.70) · Historie účtenek: ✎/✕ podle klíče, zaokrouhlení, staré datum
//  Milan: „Při editaci starších účtenek se něco hodně rozbilo. Nevidím položky a cena je taky mimo.“
//  ✎ nesl pozici účtenky z doby vykreslení (navíc v seznamu bez duplikátů). Nová účtenka ze skenu
//  jde na začátek (unshift) → pozice se posunuly → ✎ otevřel jinou účtenku a ✕ by smazal jinou.
//  Milan: „zaplacená cena byla 311 Kč vs 311,41“ – AI prohodila SOUČET a CELKEM.
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const app=R('app.js','../js/app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
const S={categories:[{id:'cat1',name:'Jídlo',type:'expense'}],receipts:[],transactions:[],uiCfg:{}};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>({style:{}}),body:{appendChild(){}},head:{appendChild(){}}},
  fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout,URL,confirm:()=>true,showToast(){}};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),ctx);
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení'),ctx);
vm.runInContext(R('receipts.js','../js/receipts.js'),ctx);
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};

console.log('── ✎ a ✕ podle klíče, ne podle pozice ──');
const albert={id:'rcA',store:'Albert',date:'2026-10-10',total:238.8,items:[{name:'Rohlík',price:3,qty:1}]};
const kauf={id:'rcK',store:'Kaufland',date:'2026-10-09',total:940.63,items:[{name:'Mléko',price:20,qty:1}]};
const stara={store:"Lidl's \"Ostrava\"",date:'2026-01-10',total:448.4,items:[]};   // bez id, s uvozovkami
S.receipts.push(albert,kauf,stara);
const kA=ctx.rcptKlic(albert), kL=ctx.rcptKlic(stara);
S.receipts.unshift({id:'rcO',store:'OXALIS',date:'2026-04-14',total:311,items:[]});   // nový sken → pozice +1
t('po přidání účtenky klíč najde Albert na nové pozici',ctx.rcptNajdiPos(0,kA)===1,ctx.rcptNajdiPos(0,kA));
t('NEGATIVNÍ KONTROLA: bez klíče by pozice 0 byla OXALIS',S.receipts[0].store==='OXALIS');
t('stará účtenka bez id se najde podle data|obchodu|částky',ctx.rcptNajdiPos(2,kL)===3);
stara.id='rcs123';
t('…i potom, co při otevření dostala id',ctx.rcptNajdiPos(2,kL)===3);
t('klíč nemá znaky, které by rozbily onclick',!/['"\\<>&]/.test(kL),kL);
t('smazaná účtenka → -1 (nic se neotevře ani nesmaže)',ctx.rcptNajdiPos(1,'rcNeni')===-1);
t('Historie posílá skutečnou pozici v S.receipts i se skrytými duplikáty',(()=>{
  const dup={...kauf,id:'rcK2'}; S.receipts.splice(1,0,dup);   // duplikát se v Historii nezobrazí
  const h=ctx.buildHistoryTab(ctx.rcptUnikatni(S.receipts));
  const m=/editReceiptFromHistory\((\d+),'rcA'\)/.exec(h); S.receipts.splice(1,1);
  return !!m && +m[1]===2;   // [OXALIS, duplikát, Albert, …] → Albert je na pozici 2
})());
const src=R('receipts.js','../js/receipts.js');
t('✕ maže podle klíče',/function deleteReceipt\(index, klic\)[\s\S]{0,200}rcptNajdiPos\(index, klic\)/.test(src));
t('po přidání účtenky se Historie přestaví (i když je vidět Skenovat)',/rcptHistorieObnov\(\);\s*return savePromise;/.test(src));
t('po uložení se editor ze skenu vyprázdní, ne jen skryje',(src.match(/preview\.innerHTML\s*=\s*''/g)||[]).length>=2);

console.log('── zaokrouhlení: zaplaceno je celá koruna ──');
const o={total:311.41,subtotal:311,printedTotal:311.41};
t('OXALIS: prohozený součet a celkem se vrátí (zaplaceno 311)',ctx.rcptZaokrouhleniNorm(o)&&o.total===311&&o.subtotal===311.41&&o.printedTotal===311,o);
const spravne={total:123,subtotal:122.6};
t('správná účtenka (SOUČET 122,60 · CELKEM 123) se nemění',!ctx.rcptZaokrouhleniNorm(spravne)&&spravne.total===123);
const karta={total:311.41,subtotal:null};
t('platba kartou bez zaokrouhlení se nemění',!ctx.rcptZaokrouhleniNorm(karta)&&karta.total===311.41);
const sleva={total:280,subtotal:311.41};
t('rozdíl přes 1 Kč (sleva na doklad) se nemění',!ctx.rcptZaokrouhleniNorm(sleva)&&sleva.total===280);

console.log('── staré datum u nového skenu ──');
const dny=n=>{const d=new Date(Date.now()-n*864e5);return d.toISOString().slice(0,10);};
t('nový sken s datem před půl rokem → upozornění',ctx.rpDatumStare({_novySken:true,date:dny(180)}));
t('nový sken z minulého týdne → nic',!ctx.rpDatumStare({_novySken:true,date:dny(7)}));
t('stará účtenka otevřená z Historie → nic',!ctx.rpDatumStare({_novySken:false,date:dny(300)}));

console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
