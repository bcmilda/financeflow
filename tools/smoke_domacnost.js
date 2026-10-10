/* smoke_domacnost.js — FIX-319: domácnost jako skupina (konec N×(N−1)) */
const fs=require('fs'), path=require('path');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_domacnost.js');

const rules=JSON.parse(R('database_rules.json').replace(/^\s*\/\/.*$/gm,''));
const hh=rules.rules.households.$hid;
const u=rules.rules.users.$uid;
const app=R('app.js'), st=R('stats.js'), sh=R('share.js');

// ── Pravidla: dvojitý souhlas ─────────────────────────────────────
ok('uzel households existuje s meta i members',
   !!hh && !!hh.meta && !!hh.members);
ok('číst skupinu smí jen její člen',
   /members'\)\.child\(auth\.uid\)\.val\(\) === true/.test(hh['.read']));
ok('připsat se smím JEN SÁM SEBE', /auth\.uid === \$uid && newData\.exists\(\)/.test(hh.members.$uid['.write']));
ok('a jen když je skupina otevřená', /joinOpen'\)\.val\(\) === true/.test(hh.members.$uid['.write']));
ok('odejít smí každý sám', /!newData\.exists\(\) && \(auth\.uid === \$uid/.test(hh.members.$uid['.write']));
ok('vyhodit smí i vlastník', /owner'\)\.val\(\) === auth\.uid/.test(hh.members.$uid['.write']));
ok('členství je boolean, ne úložiště čehokoli', hh.members.$uid['.validate']==='newData.isBoolean()');
ok('meta mění jen zakladatel', /data\.child\('owner'\)\.val\(\) === auth\.uid/.test(hh.meta['.write']));
ok('vlastníka nelze přepsat na cizí uid',
   /newData\.val\(\) === auth\.uid \|\| newData\.val\(\) === data\.val\(\)/.test(hh.meta.owner['.validate']));

// Jádro: čtení výřezu přes skupinu vyžaduje OBA uzly
const r=u.shared['.read'];
ok('čtení přes skupinu vyžaduje shodné householdId', /householdId'\)\.val\(\) === root\.child\('users'\)\.child\(auth\.uid\)\.child\('householdId'\)/.test(r));
ok('A ZÁROVEŇ členství v members (jinak by stačilo si hodnotu nastavit)',
   /households'\)[\s\S]{0,180}members'\)\.child\(auth\.uid\)\.val\(\) === true/.test(r));
ok('householdId nesmí být null (jinak by se spojili všichni bez skupiny)',
   /householdId'\)\.val\(\) !== null/.test(r));
ok('původní párování dvojic zůstává funkční', /partners'\)\.child\(auth\.uid\)\.exists\(\)/.test(r));
ok('householdId si píše jen vlastník (kaskáda z users/$uid)', u['.write']==='auth.uid === $uid');
ok('/data zůstává po fázi 2 zavřené i pro členy skupiny', !/household/.test(u.data['.read']));

// ── Kód ───────────────────────────────────────────────────────────
ok('vstup do skupiny píše OBA uzly',
   /households\/\$\{hid\}\/members\/\$\{uid\}`\), true\)/.test(st) &&
   /users\/\$\{uid\}\/householdId`\), hid\)/.test(st));
ok('odchod OBA uzly zase uklidí',
   /households\/\$\{h\.hid\}\/members\/\$\{uid\}`\), null\)/.test(st) &&
   /users\/\$\{uid\}\/householdId`\), null\)/.test(st));
ok('slučování dvou domácností je odmítnuté, ne tiché',
   /Slučovat dvě domácnosti/.test(st) && /return false;/.test(st));
ok('zmizelá skupina uklidí vlastní ukazatel', /Skupina zmizela/.test(st));
ok('pozvánka nese hid, když ho zvoucí má', /&join=\$\{dom\.hid\}/.test(st));
ok('příchozí odkaz se do skupiny opravdu přidá',
   /params\.get\('join'\)/.test(sh) && /await joinHousehold\(joinHid\)/.test(sh));
ok('přidání do skupiny nesmí shodit párování (vlastní try/catch)',
   /catch\(e\)\{ console\.warn\('\[domácnost\] přidání selhalo:'/.test(sh));
ok('loadPartners doplní členy skupiny ke jmenovitým partnerům',
   /households\/\$\{hid\}\/members`\)/.test(app) && /!partnerUids\.includes\(u\)/.test(app));
ok('sám sebe si mezi partnery nepřidá', /u !== user\.uid/.test(app));
ok('prázdný seznam partnerů už neukončí načítání, když mám skupinu',
   /prázdný seznam partnerů ještě neznamená/.test(app));
ok('členové skupiny se počítají do _myGrants (musí jim vzniknout výřez)',
   /i členy domácnosti – ti mě smí číst taky/.test(app));
ok('panel domácnosti je side-render ve vlastním try/catch',
   /try \{ if\(typeof renderHouseholdBox==='function'\) renderHouseholdBox\(\); \} catch\(e\)\{\}/.test(st));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
