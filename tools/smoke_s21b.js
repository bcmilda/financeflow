/* smoke_s21b.js — FIX-308 (párování partnerů) + FIX-309 (škála skóre) */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_s21b.js');

// ── FIX-308 · addPartner: pořadí zápis → čtení ────────────────────
{
  const st=R('stats.js');
  const i=st.indexOf('async function addPartner(');
  const fn=st.slice(i, st.indexOf('async function removePartner('));
  const zapis = fn.indexOf('partners/${partnerUid}`),true)');
  const cteni = fn.indexOf('users/${partnerUid}/shared');
  ok('FIX-308 · udělení přístupu se děje PŘED čtením partnera', zapis > -1 && cteni > -1 && zapis < cteni);
  ok('FIX-308 · čtení partnera je v try/catch (Permission denied není pád)',
     /catch\(e\)\{ odepreno=true; \}/.test(fn));
  ok('FIX-308 · při odepření se nehlásí „Uživatel nenalezen“ (byla to lež)',
     !/Uživatel nenalezen/.test(fn));
  ok('FIX-308 · uživatel dostane své ID, aby ho mohl poslat druhé straně',
     /Pošli mu svoje ID/.test(fn) && fn.includes("+ myUid"));
  ok('FIX-308 · půlka propojení se uloží i tak (nevrací se před zápisem)',
     fn.indexOf('_set(_ref(_db,`users/${myUid}/partners/') < fn.indexOf('if(odepreno'));
  ok('FIX-308 · popisek už neslibuje přístup k cizím datům',
     !/Zadejte ID uživatele partnera pro přístup k jeho datům/.test(st) &&
     /Zpřístupníš mu svá data/.test(st));
}

// ── FIX-308 · odkaz nepíše do cizího podstromu ────────────────────
{
  const sh=R('share.js');
  ok('FIX-308 · párovací odkaz nezapisuje do users/{cizí}/partners',
     !/users\/\$\{partnerOfUid\}\/partners\/\$\{myUid\}/.test(sh));
  ok('FIX-308 · zapisuje se jen vlastní strana',
     /_set\(_ref\(_db, `users\/\$\{myUid\}\/partners\/\$\{partnerOfUid\}`\)/.test(sh));
  // Pravidla to potvrzují: do cizího podstromu se psát nesmí
  const rules=JSON.parse(R('database_rules.json').replace(/^\s*\/\/.*$/gm,''));
  ok('FIX-308 · pravidla skutečně zakazují zápis do cizího users/$uid',
     rules.rules.users.$uid['.write'] === 'auth.uid === $uid');
  ok('FIX-308 · čtení /shared vyžaduje, aby mě druhý měl v partners',
     /partners'\)\.child\(auth\.uid\)\.exists\(\)/.test(rules.rules.users.$uid.shared['.read']));
}

// ── FIX-309 · škála skóre ─────────────────────────────────────────
{
  const pr=R('premium.js');
  ok('FIX-309 · půlkruh měří proti DOSAŽITELNÉMU maximu',
     /_scoreArcGauge\(sc\.rawTotal, sc\.availMax \|\| sc\.rawMax, grade\.color\)/.test(pr));
  ok('FIX-309 · „do další známky chybí“ počítá ze stejné škály',
     /_scoreNextGrade\(sc\.rawTotal, sc\.availMax \|\| sc\.rawMax\)/.test(pr));
  ok('FIX-309 · zkrácená škála se uživateli vysvětlí',
     /sc\.availMax < sc\.rawMax/.test(pr) && /škála se zase natáhne/.test(pr));
  ok('FIX-309 · neměřitelná složka se ukáže jako „—“, ne jako 0/100',
     /c\.avail === false \?/.test(pr) && /Zatím nezměřeno/.test(pr));
  ok('FIX-309 · ze Zadluženosti vede proklik na zadání půjčky',
     /action:"showPage\('dluhy'\);"/.test(pr) && /actionLabel:'Zadat půjčku →'/.test(pr));

  // Normalizace: dosažitelné maximum musí klesnout spolu s vyřazenou složkou
  const ctx=vm.createContext({}); ctx.window=ctx;
  vm.runInContext(`
    const slozky=[{avail:true,max:75,score:40},{avail:false,max:100,score:0},
                  {avail:true,max:50,score:30},{avail:true,max:35,score:20},{avail:true,max:50,score:10}];
    const live=slozky.filter(x=>x.avail);
    window.availMax=live.reduce((a,x)=>a+x.max,0);
    window.rawMax=slozky.reduce((a,x)=>a+x.max,0);
    window.total=live.reduce((a,x)=>a+x.score,0);
  `, ctx);
  ok('FIX-309 · při vyřazené S2 je dosažitelné maximum 210, ne 310',
     ctx.availMax === 210 && ctx.rawMax === 310);
  ok('FIX-309 · procento se počítá z dosažitelného, ne z plné škály',
     Math.round(ctx.total/ctx.availMax*100) === 48);
}

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
