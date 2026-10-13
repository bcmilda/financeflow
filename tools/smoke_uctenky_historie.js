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

console.log('── zaokrouhlení: appka nabídne, nemění sama (Milan: „ne všechny obchody zaokrouhlují“) ──');
t('OXALIS (311,41 a 311) → nabídne „zaplaceno 311 Kč“',ctx.rcptZaokrouhleniNavrh({total:311.41,subtotal:311})===311);
t('správná účtenka (SOUČET 122,60 · CELKEM 123) → nic',ctx.rcptZaokrouhleniNavrh({total:123,subtotal:122.6})===null);
t('platba kartou bez zaokrouhlení → nic',ctx.rcptZaokrouhleniNavrh({total:311.41,subtotal:null})===null);
t('rozdíl přes 1 Kč (sleva na doklad) → nic',ctx.rcptZaokrouhleniNavrh({total:280.5,subtotal:311})===null);
const o={total:311.41,subtotal:311,printedTotal:311.41,items:[]};
const nic={total:311.41,subtotal:311};
ctx.buildReceiptPreviewHTML(nic,1);
t('samotné otevření editoru částku NEZMĚNÍ',ctx._editReceipt.total===311.41);
ctx._editReceipt=o; ctx.rpZaplacenoCele();
t('až klepnutí: zaplaceno 311, součet 311,41, zamčeno proti přepočtu',o.total===311&&o.subtotal===311.41&&o.printedTotal===311&&o._totalLocked===true,o);

console.log('── kategorie všem položkám (místo „typu obchodu“) ──');
S.categories=[{id:'jidlo',name:'Jídlo',type:'expense',icon:'🛒',subs:['Supermarket','Pekárna']},{id:'dum',name:'Domácnost',type:'expense'}];
ctx.rpRender=()=>{};
const doc0=ctx.document;
ctx.document={...doc0,getElementById:id=>({rp_h_cat:{value:'jidlo'},rp_h_sub:{value:'Supermarket'}})[id]||null};
ctx._editReceipt={items:[{name:'Rohlík',itemCatId:'dum'},{name:'Mléko',itemCatId:'jidlo',itemSubcat:'Pekárna',_fromMemory:true},{name:'Sýr'}]};
ctx.rpHromadnePouzij();
const its=ctx._editReceipt.items;
t('všem položkám Jídlo › Supermarket',its[0].itemCatId==='jidlo'&&its[0].itemSubcat==='Supermarket'&&its[2].itemCat==='Jídlo',its);
t('položka s 🧠 (pamatovaná volba) zůstane',its[1].itemSubcat==='Pekárna');
t('hromadná volba se neučí jako rozhodnutí o výrobku',!its[0]._rucne&&its[0]._hromadne===true);
ctx.document=doc0;
const src2=R('receipts.js','../js/receipts.js');
t('pole „typ obchodu“ z editoru pryč',!/id="rp_cat"/.test(src2)&&/id="rp_h_cat"/.test(src2));
t('Nákupní DNA podle kategorií položek, ne podle typu obchodu',!/catStats\[r\.category\|\|'Jiné'\]=\(catStats/.test(src2));
t('upozornění na staré datum není (Milan doskenovává staré účtenky)',!/rp_old_warn/.test(src2));

console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
