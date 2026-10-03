// FinanceFlow · smoke test · S24 · v11.25 samostatné skenování výrobku a přiřazení k položce, dovolání AI u starých výrobků
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
const S={receipts:[
  {date:'2026-09-10',store:'Lidl',items:[{name:'MANDLE MLEC COKOL 100G'},{name:'Rohlík',ean:'1'}]},
  {date:'2026-09-20',store:'Lidl',items:[{name:'MANDLE MLEC COKOL 100G'},{name:'Banány'}]}],
 transactions:[{receiptStore:'Lidl',receiptItems:[{name:'MANDLE MLEC COKOL 100G'}]}]};
const calls=[]; const els={}; const el=()=>({style:{},innerHTML:'',appendChild(){},value:''});
const c={console,S,getData:()=>S,save(){c._ulozeno=1;},showToast(){},localStorage:{getItem:()=>null},URL,setTimeout,
 document:{getElementById:id=>els[id]||(els[id]=el()),createElement:()=>el(),body:{appendChild(){}},head:{appendChild(){}}},navigator:{},
 fetch:async(u,o)=>{ if(o&&o.body){const b=JSON.parse(o.body);calls.push(b);return {ok:true,status:200,json:async()=>({ok:true,ean:b.ean,produkt:{stav:'nalezeno',nazev:'Vollmilch',nazevCs:'Mléčná čokoláda',aiKdy:1},alias:b.potvrdit?{pocet:1}:null})};}
   return {ok:true,json:async()=>(String(u).includes('eanProdukty')?{stav:'nalezeno',nazev:'Alt',nazevCesky:false}:{})};}};
c.window=c; vm.createContext(c);
vm.runInContext(R('helpers.js','../js/helpers.js'),c);
const rc=R('receipts.js','../js/receipts.js'); const i=rc.indexOf('function normalizeStoreName'); vm.runInContext(rc.slice(i,rc.indexOf('\n}\n',i)+3),c);
vm.runInContext(R('ean-sken.js','../js/ean-sken.js'),c);
c._currentUser={uid:'u',getIdToken:async()=>'T'};
(async()=>{
 vm.runInContext('_eanAliasy={}',c);
 const k=c.eanKandidatiPolozek(S);
 t('kandidáti: unikátní obchod+zkratka, bez kódu',k.length===2&&k[0].raw==='MANDLE MLEC COKOL 100G'&&!k.some(x=>x.raw==='Rohlík'),k);
 t('kandidáti: hledání',c.eanKandidatiPolozek(S,'banan').length===1);
 vm.runInContext('_eanStav.vysledek={ean:"4056489321453",produkt:{stav:"nalezeno",nazev:"Vollmilch",nazevCs:"Mléčná čokoláda"}};_eanMojeNazvy={}',c);
 c.eanVyberPolozku(); c.eanZavri=()=>{};
 await c.eanPriradKPolozce(0);
 t('přiřazení: kód ke všem stejným zkratkám v obchodě',S.receipts[0].items[0].ean==='4056489321453'&&S.receipts[1].items[0].ean==='4056489321453'&&S.receipts[0].items[0].eanNazev==='Mléčná čokoláda');
 t('přiřazení: i kopie v transakci',S.transactions[0].receiptItems[0].ean==='4056489321453');
 t('přiřazení: spojení obchod+zkratka do komunity',calls.some(b=>b.potvrdit&&b.raw==='MANDLE MLEC COKOL 100G'&&b.obchod==='Lidl'));
 t('uloženo',c._ulozeno===1);
 t('po přiřazení položka zmizí z kandidátů',!c.eanKandidatiPolozek(S).some(x=>x.raw==='MANDLE MLEC COKOL 100G'));
 const n0=calls.length; const p=await c.eanNactiProdukt('999');
 t('starý výrobek bez AI se jednou pošle přes worker',calls.length===n0+1&&p.nazevCs==='Mléčná čokoláda');
 t('tlačítko v záložce Skenovat',rc.includes('eanSkenujVolne()'));
 console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
})();
