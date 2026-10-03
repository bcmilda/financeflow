// Test karty „Tvoje inflace vs. oficiální" (S23, TODO-290). Spuštění: node tools/smoke_inflace_oficialni.js
const fs=require('fs');const IN=fs.readFileSync(process.argv[2]||'inflace.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=n=>{const a=IN.indexOf('function '+n+'(');let i=IN.indexOf('{',a),d=0;for(;i<IN.length;i++){if(IN[i]==='{')d++;else if(IN[i]==='}'){d--;if(!d)break;}}return IN.slice(a,i+1);};
eval(IN.slice(IN.indexOf('const _median'),IN.indexOf('\n',IN.indexOf('const _median'))).replace('const _median','global._median'));
eval(IN.slice(IN.indexOf('const INFL_MIN_POLOZEK'),IN.indexOf('\n',IN.indexOf('const INFL_MIN_POLOZEK'))).replace('const ','var ').replace(/, INFL/,'; var INFL'));
['_inflExtractUnit','_inflCompute','_inflOficialniCard','_inflCollect'].forEach(n=>eval(cut(n).replace('function '+n,'global.'+n+'=function')));
global.COICOP_GROUPS_DEF=[{id:1,name:'Potraviny a nealkoholické nápoje',icon:'🛒'},{id:4,name:'Bydlení, voda, energie, paliva',icon:'🏠'}];
global.normalizeStoreName=x=>x;
const rada=[];for(let k=12;k>=0;k--){const d=new Date(2026,7-k,1);rada.push({obd:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,inflace:2+k*0.1});}
global.S={cnbInflaceRada:rada,cnbInflaceOddily:{'01':{mira:4.1,nazev:'Potraviny'},'04':{mira:3.0,nazev:'Bydlení'}},categories:[{id:'j',name:'Jídlo',coicop:1},{id:'b',name:'Bydlení',coicop:4}]};
// osobní data: 6 položek, ceny před rokem a teď (+10 %), potraviny
const ts=s=>new Date(s).getTime();const obs=[];
['a','b','c','d','e','f'].forEach(k=>{obs.push({key:k,name:k,unit:'ks',ts:ts('2025-06-10'),date:'2025-06-10',unitPrice:100,spend:100,oddil:1,store:'X'});obs.push({key:k,name:k,unit:'ks',ts:ts('2026-08-10'),date:'2026-08-10',unitPrice:110,spend:110,oddil:1,store:'X'});});
// _inflCompute k datu
const dnes=_inflCompute(obs,ts('2026-08-31'));
T('osobní inflace k datu (+10 %)',Math.round(dnes.yoy)===10&&dnes.yoyCount===6);
T('k dřívějšímu datu nevidí budoucí nákupy',_inflCompute(obs,ts('2025-12-31')).yoyCount===0);
T('bez data se chová jako dřív (zpětná kompatibilita)',typeof _inflCompute(obs).yoy==='number');
let h=_inflOficialniCard(obs);
T('karta s oficiální inflací za poslední měsíc (+2,0 %)',/Oficiální inflace ČSÚ/.test(h)&&/\+2 %/.test(h));
T('graf: modrá oficiální + oranžová osobní',/stroke="#60a5fa"/.test(h)&&/stroke="#fb923c"/.test(h));
T('13 měsíců na ose',(h.match(/<circle[^>]*fill="#60a5fa"/g)||[]).length===13);
T('oddíly COICOP s názvy z appky',/🛒 Potraviny a nealkoholické nápoje/.test(h)&&/🏠 Bydlení/.test(h));
T('oddíl potraviny: ČSÚ +4,1 %, ty +10 %',/\+4,1 %/.test(h)&&/\+10 %/.test(h));
T('oddíl bez tvých položek ukáže „–"',(h.match(/title="Málo srovnatelných položek v tomto oddílu"/g)||[]).length===1);
T('rozdíl: zdražuje ti to víc než průměru',/zdražuje ti to víc než průměru/.test(h));
// málo položek → osobní čára se nekreslí a poradí se proč
const malo=obs.slice(0,4);h=_inflOficialniCard(malo);
T('pod 5 položek: bez osobní čáry + vysvětlení',!/stroke="#fb923c"/.test(h)&&/aspoň 5 stejných položek/.test(h));
// bez dat z ČSÚ
let volano=0;global.nactiInflaciCSU=()=>{volano++;};
S.cnbInflaceRada=null;h=_inflOficialniCard(obs);
T('bez dat ČSÚ: „Načítám…" a spustí načtení',/Načítám oficiální data ČSÚ/.test(h)&&volano===1);
S.cnbInflaceChyba=Date.now();h=_inflOficialniCard(obs);
T('při chybě: poctivá hláška, nenačítá dokola',/nepodařilo načíst/.test(h)&&volano===1);
// oddíl z kategorie položky
S.receipts=[{store:'X',date:'2026-08-10',total:10,category:'Bydlení',items:[{name:'Jogurt',price:10,qty:1,itemCatId:'j'},{name:'Žárovka',price:50,qty:1}]}];
const col=_inflCollect();
T('_inflCollect: oddíl z kategorie položky (1) a fallback z účtenky (4)',col.obs.find(o=>/jogurt/i.test(o.name)).oddil===1&&col.obs.find(o=>/žárovka/i.test(o.name)).oddil===4);
console.log(`Inflace vs. oficiální: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
