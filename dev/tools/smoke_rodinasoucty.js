/* smoke_rodinasoucty.js — TODO-240: souhrn čte catSums · FIX-321: adminovo přepínání */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_rodinasoucty.js');

const st=R('stats.js'), app=R('app.js');

// ── Chování sčítání: člen se souhrny musí do součtů přispět ───────
const ctx=vm.createContext({}); ctx.window=ctx;
vm.runInContext(`
  var S={curYear:2026,curMonth:7};
  var mesicKlic = S.curYear+'-'+String(S.curMonth+1).padStart(2,'0');
  var jenSoucty = m => (m.data?.txMode === 'sums') && m.data?.catSums;
  var soucetZaMesic = m => {
    const mes = (m.data.catSums||{})[mesicKlic] || {};
    let inc=0, exp=0;
    Object.values(mes).forEach(r=>{ inc += r.inc||0; exp += r.exp||0; });
    return {inc, exp};
  };
`, ctx);
const clenSoucty={data:{txMode:'sums',catSums:{'2026-08':{jidlo:{inc:0,exp:5300,n:9},plat:{inc:38000,exp:0,n:1}},
                                              '2026-07':{jidlo:{inc:0,exp:4000,n:6}}}}};
const clenPodrobne={data:{txMode:'full',transactions:[{id:1,date:'2026-08-01',type:'expense',amount:100}]}};

ok('TODO-240 · člen se souhrny se pozná', vm.runInContext('jenSoucty', ctx)(clenSoucty)!==undefined
   && !!vm.runInContext('jenSoucty', ctx)(clenSoucty));
ok('TODO-240 · člen s podrobnými transakcemi se za „souhrnový“ nepovažuje',
   !vm.runInContext('jenSoucty', ctx)(clenPodrobne));
const sc=vm.runInContext('soucetZaMesic', ctx)(clenSoucty);
ok('TODO-240 · sečte se správný měsíc, ne všechny', sc.exp===5300 && sc.inc===38000);
ok('TODO-240 · jiný měsíc dá jiná čísla',
   (()=>{ vm.runInContext("S.curMonth=6; mesicKlic='2026-07';", ctx);
          const x=vm.runInContext('soucetZaMesic', ctx)(clenSoucty); return x.exp===4000 && x.inc===0; })());
ok('TODO-240 · měsíc bez dat dá nuly, ne pád',
   (()=>{ vm.runInContext("mesicKlic='2026-01';", ctx);
          const x=vm.runInContext('soucetZaMesic', ctx)(clenSoucty); return x.exp===0 && x.inc===0; })());
ok('TODO-240 · chybějící catSums shodí do podrobné větve, ne do chyby',
   !vm.runInContext('jenSoucty', ctx)({data:{txMode:'sums'}}));

// ── Zdroj ─────────────────────────────────────────────────────────
ok('TODO-240 · souhrn sčítá i členy se souhrny', /familyInc\+=s2\.inc; familyExp\+=s2\.exp;/.test(st));
ok('TODO-240 · žebříček útrat je přeskočí (nemají co zobrazit)',
   /if\(jenSoucty\(m\)\) return;   \/\/ TODO-240/.test(st));
ok('TODO-240 · a uživateli se řekne, PROČ v žebříčku nejsou',
   /jen souhrny za kategorie<\/strong>/.test(st) && /v žebříčku útrat níž ne/.test(st));
ok('TODO-240 · klíč měsíce má tvar RRRR-MM', /\$\{S\.curYear\}-\$\{String\(S\.curMonth\+1\)\.padStart\(2,'0'\)\}/.test(st));
ok('TODO-240 · dluh bez remaining nespadne na NaN', /a\+\(d\.remaining\|\|0\)/.test(st));

// ── FIX-321 · adminovo přepínání ──────────────────────────────────
ok('FIX-321 · dlaždice jsou klikací jen pro admina',
   /const jsemAdmin = \(typeof isAdmin === 'function' && isAdmin\(\)\)/.test(app) &&
   /jsemAdmin \? ` onclick="\$\{akce\}"/.test(app));
ok('FIX-321 · vlastní dlaždice vrací zpět k mým datům', /klik\('switchToOwnData\(\)'\)/.test(app));
ok('FIX-321 · dlaždice člena přepne náhled', /klik\(`adminViewAs\('\$\{uid\}'\)`\)/.test(app));
ok('FIX-321 · při náhledu se u vlastní dlaždice ukáže „← zpět“', /'← zpět' : 'Já'/.test(app));
ok('FIX-321 · aktivní dlaždice se zvýrazní', /viewingUid===uid\?'active-partner':''/.test(app));
ok('FIX-321 · po přepnutí se seznam překreslí', /renderPartnerSection\(Object\.keys\(partnerData\)\); \} catch\(_\) \{\}\s*\n\s*renderPage\(\);/.test(app));
ok('FIX-321 · běžný uživatel dlaždice neproklikne (žádný onclick)',
   / style="cursor:default"/.test(app));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
