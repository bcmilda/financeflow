const fs=require('fs');
let ok=0,bad=0; const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=(src,n)=>{const a=src.indexOf('function '+n+'(');if(a<0)throw new Error('chybí '+n);let i=src.indexOf('{',a),d=0;for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'){d--;if(!d)break;}}return src.slice(a,i+1);};
const PR=fs.readFileSync('premium.js','utf8'), PS=fs.readFileSync('pristi.js','utf8'), BD=fs.readFileSync('budouci.js','utf8'), UI=fs.readFileSync('ui.js','utf8'), HT=fs.readFileSync('app.html','utf8');

// ── 1) kategorie při přepnutí typu šablony ──
const els={}; const mk=id=>els[id]||(els[id]={id,style:{},className:'',value:'',textContent:'',innerHTML:''});
global.document={getElementById:id=>mk(id)};
global.S={categories:[{id:'c1',name:'Nájem',type:'expense'},{id:'c2',name:'Výplata',type:'income'},{id:'c3',name:'Vyrovnání',type:'both'}]};
let repaints=0; global.selCatId='c1'; global._sablonaType='expense';
global.renderSablonaCatPicker=()=>{repaints++; const cats=S.categories.filter(c=>c.type===_sablonaType||c.type==='both'); mk('sablonaCatPicker').innerHTML=cats.map(c=>c.name).join('|');};
eval(cut(PR,'setSablonaType')); eval(cut(PR,'sablonaFreqChange'));
renderSablonaCatPicker(); repaints=0;
setSablonaType('income');
T('přepnutí výdaj→příjem překreslí kategorie hned', repaints===1);
T('a ukáže PŘÍJMOVÉ kategorie', els.sablonaCatPicker.innerHTML==='Výplata|Vyrovnání');
T('vybraná výdajová kategorie se zahodí', selCatId==='');
selCatId='c3'; setSablonaType('expense');
T('kategorie typu „both“ přepnutí přežije', selCatId==='c3');
setSablonaType('transfer'); T('u přesunu se kategorie skryje', els.sablonaCatSection.style.display==='none');

// ── 2) přepínač frekvence ──
mk('sablonaFreq').value='once'; sablonaFreqChange();
T('1× schová „den v měsíci“', els.sablonaDenWrap.style.display==='none');
T('1× ukáže pole s datem', els.sablonaOnceWrap.style.display==='block');
T('1× zamkne automatické vytvoření', els.sablonaAuto.checked===true && els.sablonaAuto.disabled===true);
mk('sablonaFreq').value='monthly'; sablonaFreqChange();
T('zpět na měsíčně vrátí „den v měsíci“', els.sablonaDenWrap.style.display==='block' && els.sablonaAuto.disabled===false);
T('volba je i v HTML', /value="once">1× jednorázově/.test(HT) && /id="sablonaOnceDate"/.test(HT));

// ── 3) jednorázová šablona se provede jednou a pak už ne ──
global.uid=(()=>{let i=0;return()=>'id'+(++i);})();
global.save=()=>{}; global.renderPage=()=>{}; global.viewingUid=null;
global.rpFixReceiptTxWallets=()=>0;
eval(cut(PR,'processAutoSablony'));
const _loc=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');   // S25: místní datum, ne UTC
const dnes=_loc(new Date());
const zitra=_loc(new Date(Date.now()+86400000));
S.sablony=[{id:'s1',name:'Zubař',amount:3000,type:'expense',freq:'once',onceDate:dnes,auto:true,catId:'c1'}];
S.transactions=[];
processAutoSablony();
T('jednorázová platba se v den D zapíše do transakcí', S.transactions.length===1 && S.transactions[0].name==='Zubař' && S.transactions[0].date===dnes);
T('a šablona se označí jako provedená', S.sablony[0].done===true);
processAutoSablony();
T('podruhé už transakci nevytvoří', S.transactions.length===1);
S.sablony=[{id:'s2',name:'Servis',amount:5000,type:'expense',freq:'once',onceDate:zitra,auto:true}];
S.transactions=[]; processAutoSablony();
T('budoucí datum se nezapisuje předčasně', S.transactions.length===0 && !S.sablony[0].done);

// S25 (v11.44): měsíční auto-šablona dostane přesně svůj den (dřív o den dřív kvůli UTC)
{ const d0=new Date(); const den=Math.min(28,d0.getDate()+1>28?28:d0.getDate()+1);
  S.sablony=[{id:'s3',name:'Nájem',amount:9000,type:'expense',freq:'monthly',den,auto:true,catId:'c1'}]; S.transactions=[];
  processAutoSablony();
  const ocek=_loc(new Date(d0.getFullYear(),d0.getMonth(),den));
  T('měsíční auto-šablona má datum svého dne (ne o den dřív)', d0.getDate()>=28 || (S.transactions.length===1 && S.transactions[0].date===ocek)); }

// ── 4) budoucí platby a Příští měsíc ji vidí ──
eval(cut(PS,'pristiOccurrences'));
const from=new Date(new Date().getFullYear(), new Date().getMonth(),1), to=new Date(new Date().getFullYear(), new Date().getMonth()+1,0);
const sab={onceDate:_loc(from).slice(0,8)+'15'};
T('Příští měsíc zobrazí jednorázovou platbu v daném měsíci', pristiOccurrences('once',1,from,to,sab).length===1);
T('mimo měsíc ji nezobrazí', pristiOccurrences('once',1,from,to,{onceDate:'2099-01-01'}).length===0);
T('provedenou ji nezobrazí', pristiOccurrences('once',1,from,to,{onceDate:sab.onceDate,done:true}).length===0);
T('bez data nespadne', pristiOccurrences('once',1,from,to,{}).length===0);
T('měsíční šablony fungují dál', pristiOccurrences('monthly',15,from,to,{}).length>=1);
T('Budoucí platby znají „once“', /freq === 'once'/.test(BD) && /s\.onceDate/.test(BD));

// ── 5) tlačítka Příštího měsíce vedou do transakcí ──
let otevreno=null, typ=null;
global.openAddTx=()=>{otevreno=true;}; global.setTxType=t=>{typ=t;};
global._pristiLast={ym:'2026-10'};
eval(cut(PS,'pristiAddCustom'));
mk('txDate').value=''; pristiAddCustom('expense');
T('tlačítko otevře modal transakce', otevreno===true && typ==='expense');
T('s datem v zobrazeném měsíci', els.txDate.value==='2026-10-15');
pristiAddCustom('income'); T('u příjmu přepne typ', typ==='income');
T('nezakládá se nic do pristiCfg.custom', !/pristiCfgWrite/.test(cut(PS,'pristiAddCustom')));
T('mazání starých položek zůstalo', /function pristiDelCustom/.test(PS));

// ── 6) mobilní tabulka ──
T('tabulka má jeden posuvný rám', (UI.match(/overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px/g)||[]).length===1);
T('hlavička, řádky i součet mají stejnou min-šířku', (UI.match(/min-width:460px/g)||[]).length===3);
T('tlačítko Šablona už se neodsouvá doprava', !/openSablonaModal\(\)[^>]*margin-left:auto/.test(HT));

console.log(`S23/v10.86: ${ok} OK, ${bad} chyb`); process.exit(bad?1:0);
