/* smoke_tabulka.js — S21: měsíční tabulka, strop domácnosti, odemčené stránky */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_tabulka.js');

// ── Tabulka: agregace ─────────────────────────────────────────────
const src=R('ui.js');
const ctx=vm.createContext({console}); ctx.window=ctx;
ctx.isTransferTx=t=>!!(t&&t.transferId);
ctx.txCZK=(t,D)=>(t.cur==='EUR'?25:1)*(t.amount||t.amt||0);
const i=src.indexOf('function txMonthlySummary(');
vm.runInContext(src.slice(i, src.indexOf('function toggleTxTable(', i)), ctx);

const D={transactions:[
  {date:'2026-08-03',type:'income',  amount:40000},
  {date:'2026-08-10',type:'expense', amount:1200},
  {date:'2026-08-11',type:'expense', amount:100, cur:'EUR'},      // cizí měna → 2500
  {date:'2026-08-12',type:'expense', amount:500, transferId:'x'}, // přesun → nepočítá se do částek
  {date:'2026-08-13',type:'expense', amount:900, splitParent:true},
  {date:'2026-08-14',type:'expense', amount:700, isBalancing:true},
  {date:'2026-07-05',type:'income',  amount:38000},
  {date:'2026-07-09',type:'expense', amount:3000},
  {date:'nesmysl',   type:'expense', amount:999},                 // neplatné datum
]};
const r=ctx.txMonthlySummary(D);
const srp=r.find(x=>x.m===7&&x.y===2026), cvc=r.find(x=>x.m===6&&x.y===2026);
ok('měsíce se seskupí správně', r.length===2 && !!srp && !!cvc);
ok('„Záznamů“ počítá VŠECHNO, co uživatel zapsal (i přesuny a splity)', srp.n===6);
ok('částky vylučují přesun, split i vyrovnání', srp.exp===1200+2500);
ok('cizí měna přes txCZK, ne nominál', srp.exp!==1200+100);
ok('příjmy sedí', srp.inc===40000 && cvc.inc===38000);
ok('neplatné datum spadne pod stůl, ne do nesmyslného měsíce',
   !r.some(x=>isNaN(x.y)||isNaN(x.m)));

// Řazení oběma směry
const desc=[...r].sort((a,b)=>(b.y-a.y)||(b.m-a.m));
const asc =[...r].sort((a,b)=>(a.y-b.y)||(a.m-b.m));
ok('řazení sestupně dá srpen první', desc[0].m===7);
ok('řazení vzestupně dá červenec první', asc[0].m===6);
ok('přepínač směru existuje a je klikací',
   /function setTxTableDir\(\)/.test(src) && /onclick="setTxTableDir\(\)"/.test(src));

// Tabulka nesmí zůstat viset nad skrytým seznamem
ok('přepnutí typu filtru tabulku zavře',
   /if\(_txTableOpen\)\{ _txTableOpen = false; renderTxMonthTable\(\); \}/.test(src));
ok('tabulka se překreslí i po změně měsíce',
   /if\(typeof renderTxMonthTable === 'function' && _txTableOpen\) renderTxMonthTable\(\)/.test(src));
ok('při otevřené tabulce se schová hlavička i seznam',
   /head\.style\.display = _txTableOpen \? 'none' : ''/.test(src) &&
   /list\.style\.display = _txTableOpen \? 'none' : ''/.test(src));

const html=R('app.html');
ok('tlačítko Tabulka i kontejner jsou v app.html',
   /id="filt-tabulka"[^>]*onclick="toggleTxTable\(this\)"/.test(html) && /id="txMonthTable"/.test(html));

// ── Strop domácnosti ──────────────────────────────────────────────
{
  const st=R('stats.js');
  ok('strop je 6 členů', /const FAMILY_MAX_MEMBERS = 6;/.test(st));
  ok('počítadlo započítává i mě (partneři + 1)', /const pocet=partners\.length\+1;/.test(st));
  ok('addPartner strop skutečně vynucuje',
     /Object\.keys\(partnerData\)\.length\+1>=_max/.test(st) && /Domácnost je plná/.test(st));
  ok('prázdný stav říká, kolik členů je možných', /až \$\{FAMILY_MAX_MEMBERS\} členů/.test(st));
}

// ── Odemčení stránek ──────────────────────────────────────────────
{
  const pr=R('premium.js');
  ok('rodina a sdileni už nejsou v PREMIUM_PAGES',
     /const PREMIUM_PAGES = \['predikce','grafy','ai','narozeniny','uctenky','nakup','report2','inflace'\];/.test(pr));
  ok('showPagePremium už je zvlášť nezamyká', !/name==='sdileni'\|\|name==='rodina'\) && !canUseFeature/.test(pr));
  ok('FIX-310 · showPagePremium ČTE PREMIUM_PAGES (jinak zamyká všechno)',
     /PREMIUM_PAGES\.includes\(name\)/.test(pr) && /!jePlacena \|\| hasPremiumAccess\(\)/.test(pr));

  // Chování, ne tvar: pustit Free uživatele na stránky a koukat, kam se dostane.
  //   Právě tenhle test v10.34 chyběl – kontrolovalo se jen, že jméno stránky
  //   zmizelo ze seznamu, ne že se na ni dá po kliknutí opravdu dostat.
  const c=vm.createContext({console}); c.window=c;
  vm.runInContext(pr.match(/const PREMIUM_PAGES = \[[^\]]*\];/)[0], c);
  vm.runInContext('let _isLocalMode=false; let _premiumStatus={type:"free"}; window.kam=null;'
    +'function showPage(n){window.kam="OK";} function showPaywall(){window.kam="ZAMCENO";}', c);
  const telo=n=>{const i=pr.indexOf('function '+n+'(');let d=0,j=pr.indexOf('{',i);
    for(let k=j;k<pr.length;k++){if(pr[k]==='{')d++;else if(pr[k]==='}'){d--;if(!d)return pr.slice(i,k+1);}}};
  vm.runInContext(telo('hasPremiumAccess'), c);
  vm.runInContext(telo('showPagePremium'), c);
  const zkus=p=>{ c.kam=null; c.showPagePremium(p,null); return c.kam; };
  ok('FIX-310 · Free se DOSTANE na Sdílení', zkus('sdileni')==='OK');
  ok('FIX-310 · Free se DOSTANE na Rodinný souhrn', zkus('rodina')==='OK');
  ok('FIX-310 · placené stránky Free pořád nepustí',
     zkus('uctenky')==='ZAMCENO' && zkus('ai')==='ZAMCENO' && zkus('grafy')==='ZAMCENO');
  // Premium musí projít všude
  vm.runInContext('_premiumStatus={type:"premium"};', c);
  ok('FIX-310 · Premium projde i na placené stránky', zkus('uctenky')==='OK' && zkus('ai')==='OK');
  ok('režim „bez účtu“ je pořád blokovaný (to není o tieru)',
     /_isLocalMode && \(name==='sdileni'\|\|name==='rodina'\)/.test(pr));
  ok('diamanty zmizely ze sidebaru', !/navlock-rodina/.test(html) && !/navlock-sdileni/.test(html));
  ok('placené AI funkce zůstávají placené',
     /aiRadce:\s*'premium'/.test(pr) && /receiptAnalyze:\s*'premium'/.test(pr) && /bankImport:\s*'premium'/.test(pr));
}

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
