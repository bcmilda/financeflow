// S25 (krok 2 katalogu) – gramáž jako samostatné pole a názvy výrobku zvlášť.
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i));if(!c)bad++;};
const sb={console,window:{},fetch:()=>Promise.resolve({ok:false})};sb.window=sb;vm.createContext(sb);
vm.runInContext(R('helpers.js','../js/helpers.js'),sb);
vm.runInContext(R('product-db.js','../js/product-db.js'),sb);
const rc=R('receipts.js','../js/receipts.js'), sp=R('statistika-polozek.js','../js/statistika-polozek.js'), wk=R('worker.js','../cloudflare-worker/worker.js','../worker.js');
const pick=(src,n)=>{let i=src.indexOf('function '+n+'(');let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
console.log('── S25 · gramáž zvlášť ──');
t('název bez gramáže',sb.nazevBezGramaze('ORION KOFILA OPLATKA 42G')==='ORION KOFILA OPLATKA'&&sb.nazevBezGramaze('Mléko polotučné 1,5 l')==='Mléko polotučné'&&sb.nazevBezGramaze('Rohlík')==='Rohlík');
t('balení z názvu',JSON.stringify(sb.baleniZNazvu('OPLATKA 42G'))==='{"m":42,"j":"g"}'&&sb.baleniZNazvu('Mléko 1,5 l').m===1500&&sb.baleniZNazvu('Rohlík')===null);
t('zobrazení balení',sb.baleniText({m:42,j:'g'})==='42 g'&&sb.baleniText({m:1500,j:'ml'})==='1,5 l'&&sb.baleniText({m:6,j:'ks'})==='6 ks');
vm.runInContext("var S={receipts:[]};_productDB={groups:{},keywords:{},tags:{}};_pgKeysSorted=[];",sb);
const r={items:[{name:'ORION KOFILA OPLATKA 42G'},{name:'KLOBÁSA',qty:0.192}]};sb.productGroupPrefill(r);
t('nová účtenka: balení se uloží k položce, název z účtenky zůstane',r.items[0].baleni&&r.items[0].baleni.m===42&&r.items[0].name==='ORION KOFILA OPLATKA 42G'&&!r.items[1].baleni);
t('balení se kopíruje i do položek transakce',(rc.match(/\.\.\.\(it\.baleni \? \{ baleni: it\.baleni \} : \{\}\)/g)||[]).length===2);
const c2={normQty:sb.normQty,Math};vm.createContext(c2);vm.runInContext(pick(rc,'mapaUzivCenaZaJednotku'),c2);
t('cena za kg: z balení 42 g',Math.round(c2.mapaUzivCenaZaJednotku({cena:10.9,raw:'X',baleni:{m:42,j:'g'}}).cena)===260);
t('cena za kg: vážené zboží (0,192 kg)',c2.mapaUzivCenaZaJednotku({cena:289,qty:0.192,raw:'KLOBÁSA'}).cena===289);
console.log('── S25 · názvy zvlášť ──');
const c3={escHtml:s=>String(s),Set,Math,Date,String,_eanMojeNazvy:{'1':{nazev:'Mléčná čokoláda s různými náplněmi'}}};vm.createContext(c3);vm.runInContext(pick(rc,'mapaKartaKatalog'),c3);
const k=c3.mapaKartaKatalog({ean:'1',nakupy:[],baleni:{m:200,j:'g'}},{nazev:'Lindor Assorted',nazevCesky:false,jazyk:'en',nazevObal:'LINDOR Mléčná čokoláda',nazevCs:'Pralinky mix',nazevCsZdroj:'foto'},{stav:'nalezeno'},(l,v)=>`[${l}:${v}]`,'200 g');
t('karta: používá se / originál / na obalu / AI překlad / tvůj – každý zvlášť',['Používá se','Originální název','Název na obalu','Překlad AI','Tvůj název'].every(x=>k.nazvy.includes('['+x+':')),k.nazvy);
t('karta: množství i se zdrojem',k.vyrobek.includes('[Množství:200 g')&&k.vyrobek.includes('z účtenky'));
t('worker: název na obalu se ukládá a obnova ho nesmaže',wk.includes("p.nazevObal = eanStr(j.nazev_obal, 100)")&&(o=>o!==null&&!o.includes("'nazevObal'"))((()=>{const m=wk.match(/const EAN_OFF_AKTUALIZOVAT = \[([^\]]*)\];\s*const EAN_OFF_DOPLNIT = \[([^\]]*)\]/);return m?m[1]+m[2]:null;})())&&wk.includes('produkt = eanSlouc(_eanStary, produkt)'));   // v11.61 (ADR-207): Open Food Facts mění jen svá políčka
t('statistika: Ø cena za kg/l z gramáže',sp.includes('zaJed = castka / (q * bal.m / 1000)')&&sp.includes('Ø za kg/l'));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
