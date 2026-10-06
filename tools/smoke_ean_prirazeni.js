// S25 – skenování kódu výrobku: výběr přes účtenky, oprava chybného přiřazení, živiny v kartě,
// kód ze souboru, tlačítko Zavřít, worker akce „odebrat“.
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{c?(ok++,console.log('  ✅',n)):(bad++,console.log('  ❌',n,i===undefined?'':JSON.stringify(i)));};
const EAN='8003340805528';
const S={receipts:[
  {date:'2026-09-10',store:'Lidl',items:[{name:'LINDOR 200G',price:129},{name:'Rohlík',ean:'111',eanNazev:'Rohlík tukový'}]},
  {date:'2026-09-20',store:'Lidl',items:[{name:'MLEKO 1L',ean:EAN,eanNazev:'Lindt'},{name:'Banány',price:30}]}],
 transactions:[{receiptStore:'Lidl',receiptItems:[{name:'MLEKO 1L',ean:EAN}]}]};
const calls=[]; const els={}; const el=()=>({style:{},innerHTML:'',appendChild(){},value:''});
const c={console,S,getData:()=>S,save(){c._ulozeno=(c._ulozeno||0)+1;},showToast(){},confirm:()=>true,localStorage:{getItem:()=>null},URL,setTimeout,
 document:{getElementById:id=>els[id]||(els[id]=el()),createElement:()=>el(),body:{appendChild(){}},head:{appendChild(){}}},navigator:{},
 fetch:async(u,o)=>{ if(o&&o.body){const b=JSON.parse(o.body);calls.push(b);return {ok:true,status:200,json:async()=>({ok:true})};} return {ok:true,json:async()=>({})};}};
c.window=c; vm.createContext(c);
vm.runInContext(R('helpers.js','../js/helpers.js'),c);
const rc=R('receipts.js','../js/receipts.js'); const i=rc.indexOf('function normalizeStoreName'); vm.runInContext(rc.slice(i,rc.indexOf('\n}\n',i)+3),c);
const src=R('ean-sken.js','../js/ean-sken.js'); vm.runInContext(src,c);
c._currentUser={uid:'u',getIdToken:async()=>'T'};
console.log('── S25 · přiřazení kódu výrobku ──');
(async()=>{
 vm.runInContext('_eanAliasy={}',c);
 const sk=c.eanPolozkyUctenek(S,'',EAN);
 t('výběr seskupený po účtenkách, nejnovější nahoře',sk.length===2&&sk[0].datum==='2026-09-20'&&sk[0].obchod==='Lidl',sk.map(g=>g.datum));
 const rows=sk.flatMap(g=>g.rows), st=n=>rows.find(x=>x.raw===n).stav;
 t('stavy: tento výrobek / jiný kód / volná',st('MLEKO 1L')==='tento'&&st('Rohlík')==='jiny'&&st('LINDOR 200G')==='volna');
 t('volná položka má cenu',rows.find(x=>x.raw==='LINDOR 200G').cena===129);
 vm.runInContext(`_eanStav.vysledek={ean:"${EAN}",produkt:{stav:"nalezeno",nazev:"Lindt Lindor",nutriceObal:{energie:600}}};_eanMojeNazvy={}`,c);
 c.eanVyberPolozku(); c.eanZavri=()=>{};
 t('okno informuje, že výrobek už je přiřazený',els.eanVyber.innerHTML.includes('už máš přiřazený')&&els.eanVyber.innerHTML.includes('MLEKO 1L'));
 const idx=n=>c._eanKandidati.findIndex(x=>x.raw===n);
 await c.eanOdebratZPolozky(idx('MLEKO 1L'));
 t('odebrání: kód pryč z účtenky i z kopie v transakci',!S.receipts[1].items[0].ean&&!S.receipts[1].items[0].eanNazev&&!S.transactions[0].receiptItems[0].ean);
 t('odebrání: worker dostane akci odebrat se zkratkou',calls.some(b=>b.akce==='odebrat'&&b.ean===EAN&&b.klic));
 await c.eanPriradKPolozce(c._eanKandidati.findIndex(x=>x.raw==='LINDOR 200G'));
 t('přiřazení ke správné položce',S.receipts[0].items[0].ean===EAN);
 c.eanVyberPolozku(); let asked=0; c.confirm=()=>{asked++;return false;};
 await c.eanPriradKPolozce(c._eanKandidati.findIndex(x=>x.raw==='Rohlík'));
 t('položka s jiným kódem: zeptá se a bez souhlasu nepřepíše',asked===1&&S.receipts[0].items[1].ean==='111');
 t('karta výrobku ukazuje živiny',c.eanKartaHTML({stav:'nalezeno',nazev:'X',nutriceObal:{energie:100,tuky:5}},EAN).includes('Nutriční hodnoty na 100 g'));
 t('kód jde načíst i ze souboru (bez capture)',/🖼️ Ze souboru\s*<input type="file" accept="image\/\*" style/.test(src));
 t('okno má tlačítko Zavřít dole',src.includes('onclick="eanZavri()">✕ Zavřít</button>'));
 t('fotka živin hlásí stav v okně skeneru',src.includes("eanZprava(t, chyba)")&&src.includes('najdeš je v kartě výrobku'));
 const wk=R('worker.js','../cloudflare-worker/worker.js','../worker.js');
 t('worker: akce odebrat ubere jen vlastní potvrzení',wk.includes("body.akce === 'odebrat'")&&/moje\.ean !== ean\) return json\(\{ ok: true, odebrano: false/.test(wk));
 t('fotka živin: tlačítko foťák (capture) + zvlášť z galerie',src.includes("if (!zGalerie) inp.setAttribute('capture', 'environment');")&&src.includes("'ziviny',${poHotovo},true)"));
 t('AI název výrobku se značkou, bez gramáže',/značka \(\+ řada\) a co to je/.test(wk)&&wk.includes('se značkou (+ řadou), bez gramáže'));
 console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); if(bad) process.exitCode=1;
})();
