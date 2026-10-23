// FinanceFlow · smoke test · Session 27 (v12.09) · karta výrobku: datum nákupu, Otevřít účtenku, ✏️ Opravit název
//  Milan: „Drubeji hamburger – rád bych to opravil, jen nevím, ve které účtence to je. Jak to mám najít?
//  Spíš najít způsob, jak to opravit rychle ručně, místo dalších utilit.“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const app=R('app.js','../js/app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const S={uiCfg:{},categories:[{id:'cat1',name:'Nákupy potravin',type:'expense'}],
 receipts:[
  {id:'a',store:'Penny Market',storeCity:'Frýdek-Místek',date:'2027-03-12',total:90,items:[{name:'Drubeji hamburger 250g',price:89.9,qty:1,itemCatId:'cat1'}]},
  {id:'b',store:'Penny Market',date:'2027-02-01',total:90,items:[{name:'Drůbeží hamburger 250g',price:84.9,qty:1,itemCatId:'cat1'}]},
  {id:'c',store:'Albert',date:'2026-11-05',total:30,items:[{name:'Kefír 500ml',price:30,qty:1,ean:'8594003840110'},{name:'KEFIR 500 ML',price:29,qty:1}]}],
 transactions:[{id:'t',type:'expense',receiptDate:'2027-03-12',receiptStore:'Penny Market',amount:90,receiptItems:[{name:'Drubeji hamburger 250g'}]}]};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[]},fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout,save(){}};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),ctx);
ctx.taxNastav(JSON.parse(R('taxonomie.json','../data/taxonomie.json')));
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení')+';this._set=(c,m,t)=>{_catMappingsCache=c;_productMapCache=m;_taxRozpocetCache=t;};',ctx);
vm.runInContext(R('receipts.js','../js/receipts.js'),ctx);
ctx._set({},{},{});

console.log('── data karty ──');
let L=ctx.mapaUzivData(S.receipts,S);
const typo=L.find(z=>z.nazev==='Drubeji hamburger 250g');
t('dvě karty: překlep a správný název (zatím)',typo&&L.some(z=>z.nazev==='Drůbeží hamburger 250g'));
t('nákup nese odkaz na účtenku a položku (neviditelně pro JSON)',typo.nakupy[0]._r===S.receipts[0]&&typo.nakupy[0]._it===S.receipts[0].items[0]&&!/_r|_it/.test(JSON.stringify(typo.nakupy[0])));
const al=ctx.mapaAliasySkupiny(typo);
t('Názvy z účtenek: u názvu nákupy (index), obchod s pobočkou',al.length===1&&al[0].nak.join()==='0'&&al[0].obchody[0]==='Penny Market · Frýdek-Místek',al);
t('datum krátce: letošní bez roku, starší s rokem',ctx.mapaDatumKratce('2027-03-12',new Date('2027-03-20'))==='12. 3.'&&ctx.mapaDatumKratce('2026-11-05',new Date('2027-03-20'))==='5. 11. 2026');

console.log('── oprava názvu ──');
const res=ctx.mapaOpravNazevProvest(typo,0,'  Drůbeží   hamburger 250g ');
t('přepíše text položky na účtence (ořízne mezery), vrátí dotčenou účtenku',res.n===1&&S.receipts[0].items[0].name==='Drůbeží hamburger 250g'&&res.uctenky[0]===S.receipts[0],res&&res.n);
L=ctx.mapaUzivData(S.receipts,S);
const sp=L.find(z=>z.nazev==='Drůbeží hamburger 250g');
t('karty se spojily: 1 karta, 2 nákupy',sp&&sp.pocet===2&&!L.some(z=>z.nazev==='Drubeji hamburger 250g'),L.map(z=>[z.nazev,z.pocet]));
t('prázdný název nic nezmění',ctx.mapaOpravNazevProvest(sp,0,'   ')===null);
ctx.syncReceiptToTransactions(S.receipts[0]);
t('kopie položky v transakci má nový název (synchronizace účtenky)',S.transactions[0].receiptItems[0].name==='Drůbeží hamburger 250g');

console.log('── karta s kódem ──');
//  „KEFIR 500 ML“ (bez kódu) přejmenovaný na název s kódem → kód zůstane spojený s kartou kódu
const kef=L.find(z=>z.klic==='ean:8594003840110');
t('karta s kódem drží svůj klíč',!!kef);
const ctxKarta=R('receipts.js','../js/receipts.js');
t('v kartě: 📅 data → mapaOtevriNakup, ✎ Opravit název → mapaOpravNazevForm',/onclick="mapaOtevriNakup\(\$\{i\},\$\{ni\}\)"/.test(ctxKarta)&&/onclick="mapaOpravNazevForm\(\$\{i\},\$\{ai\}\)"/.test(ctxKarta));
t('otevření účtenky z karty: přímo index + zvýraznění položky v editoru',/openReceiptInHistory\(n\.datum, n\.obchod, idx >= 0 \? idx : undefined, n\.raw\)/.test(ctxKarta)&&/pol\.style\.outline = '2px solid #fbbf24'/.test(ctxKarta));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
