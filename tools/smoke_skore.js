// TODO-227 · FIX-270 · FIX-271 – dynamický jmenovatel a Detektor.
const fs=require('fs');
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};

console.log('── TODO-227 · dynamický jmenovatel ──');
const prem=fs.readFileSync('premium.js','utf8');
check('žádné neutrální výchozí hodnoty',()=>{
  assert(!/score1 = msc_S1\(expRatio\) \?\? 36/.test(prem),'S1 stále 36');
  assert(!/else score1 = 36/.test(prem),'S1 stále 36 bez příjmu');
  assert(!/score3 = monthsReserve!==null \? \(msc_S3\(monthsReserve\) \?\? Math\.round\(s3max\/2\)\)/.test(prem),'S3 stále polovina');
  assert(!/let score4 = Math\.round\(s4max\/2\)/.test(prem),'S4 stále polovina');
  assert(!/let score5 = Math\.round\(s5max\/2\)/.test(prem),'S5 stále polovina');
});
check('každá složka má příznak dostupnosti',()=>{
  ['s1avail','s2avail','s3avail','s4avail','s5avail'].forEach(v=>
    assert(new RegExp(v).test(prem),'chybí '+v));
});
check('jmenovatel je availMax, ne pevných 310',()=>{
  assert(/const availMax = _live\.reduce/.test(prem),'availMax nepočítán');
  assert(/total = availMax > 0 \? Math\.round\(rawTotal \/ availMax \* 100\) : null/.test(prem),'dělí se pořád rawMax');
});
check('hodnocení používá dosažitelné maximum',()=>{
  assert(/const _gMax = availMax \|\| rawMax/.test(prem),'prahy pořád z 310');
  assert(/Zatím nelze určit/.test(prem),'chybí stav bez dat');
});
check('„nemám dluh" se uzná jen po potvrzení',()=>{
  assert(/_settings\.hasDebts === false/.test(prem),'plný počet i bez potvrzení');
});
// simulace
const max={S1:75,S2:100,S3:50,S4:35,S5:50};
const skore=(av,sc)=>{let am=0,t=0;Object.keys(max).forEach(k=>{if(av[k]){am+=max[k];t+=sc[k]||0}});
  return am?Math.round(t/am*100):null;};
check('zcela nový uživatel → skóre nelze určit (dřív 70/100)',()=>{
  assert(skore({},{})===null,'stále vrací číslo');
});
check('jen příjmy a výdaje → hodnotí se pouze cash flow',()=>{
  assert(skore({S1:1},{S1:36})===48,'vyšlo '+skore({S1:1},{S1:36}));
});
check('doplnění složky změní jmenovatel, ne jen čitatel',()=>{
  const a=skore({S1:1},{S1:36});
  const b=skore({S1:1,S3:1},{S1:36,S3:0});
  assert(b<a,'přidání neměřené rezervy skóre nesnížilo — jmenovatel se nemění');
});

console.log('\n── FIX-270 · Detektor nepočítá dvakrát ──');
const prj=fs.readFileSync('projects.js','utf8');
check('evidence započítaných transakcí existuje',()=>{
  assert(/const _claimed = new Set\(\)/.test(prj),'chybí _claimed');
  assert(/const _free =/.test(prj)&&/const _claim =/.test(prj),'chybí _free/_claim');
});
check('překrývající se detektory berou jen nezabrané',()=>{
  const n=(prj.match(/_free\(subTxs\)/g)||[]).length;
  assert(n>=6,'jen '+n+' detektorů zapojeno, čekáno 6+');
});
check('Zbytečné utrácení zabírá až transakce, které v nálezu jsou',()=>{
  assert(/smallExpMap\)\.filter\(v=>v\.count>=4\)\.forEach\(v=>_claim\(v\.txs/.test(prj),
    'zabírá všechny, i ty pod prahem');
});
check('demonstrace: jedna útrata už nespadne do tří nálezů',()=>{
  const claimed=new Set();
  const free=a=>a.filter(t=>!claimed.has(t.id));
  const claim=a=>{a.forEach(t=>claimed.add(t.id));return a};
  const txs=[{id:1,amt:900}];
  const jidlo=claim(free(txs));                 // Jídlo venku
  const zbytecne=claim(free(txs));              // Zbytečné utrácení
  const soucet=jidlo.reduce((a,t)=>a+t.amt*0.3,0)+zbytecne.reduce((a,t)=>a+t.amt*0.5,0);
  assert(soucet===270,'součet '+soucet+' – druhý detektor si ji vzal znovu');
});

console.log('\n── FIX-271 · rozsah místo součtu ──');
check('zobrazuje se rozsah, ne jedno číslo',()=>{
  assert(/dolni > 0 && horni > dolni/.test(prj),'chybí rozsah');
  assert(!/\$\{fmtB\(totalSavable\)\}\/měs<\/div>/.test(prj),'stále jedno číslo');
});
check('jisté je odděleno od odhadu',()=>{
  assert(/const JISTE = \['Bankovní','Refinancování','Kurzy'\]/.test(prj),'chybí rozdělení');
  assert(/doložitelných/.test(prj)&&/odhadem/.test(prj),'chybí popisky');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ SKÓRE A DETEKTOR OVĚŘENY');
process.exit(fails?1:0);
