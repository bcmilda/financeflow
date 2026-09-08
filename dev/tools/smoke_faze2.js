/* smoke_faze2.js — FIX-318: partneři čtou VÝHRADNĚ /shared */
const fs=require('fs'), path=require('path');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_faze2.js');

const app=R('app.js'), st=R('stats.js');
const rules=JSON.parse(R('database_rules.json').replace(/^\s*\/\/.*$/gm,''));
const u=rules.rules.users.$uid;

// ── Pravidla ──────────────────────────────────────────────────────
ok('FIX-318 · partneři už NESMÍ číst /data', !/partners/.test(u.data['.read']));
ok('FIX-318 · vlastník své /data čte dál', /auth\.uid === \$uid/.test(u.data['.read']));
ok('FIX-318 · admin čte /data dál (Milanovo právo nahlédnout)',
   u.data['.read'].includes("LNEC8VNB2QPwIv6WWQ9lqgR4O5v1"));
ok('FIX-318 · výřez /shared partnerům ZŮSTÁVÁ čitelný',
   /partners'\)\.child\(auth\.uid\)\.exists\(\)/.test(u.shared['.read']));
ok('FIX-318 · zápis do /data i /shared pořád jen vlastník',
   u['.write'] === 'auth.uid === $uid');
// Kdyby někdo omylem vrátil partnery zpět, tenhle test to chytí
ok('FIX-318 · /data a /shared mají RŮZNÁ čtecí pravidla (jinak je fáze 2 zbytečná)',
   u.data['.read'] !== u.shared['.read']);

// ── Kód ───────────────────────────────────────────────────────────
ok('FIX-318 · loadPartners už nečte /data', !/users\/\$\{uid\}\/data`\)\)/.test(app));
ok('FIX-318 · addPartner už nečte /data', !/users\/\$\{partnerUid\}\/data`\)/.test(st));
ok('FIX-318 · slovo „legacy“ z obou cest zmizelo',
   !/const legacy = await _get/.test(app) && !/const legacy=await _get/.test(st));
ok('FIX-318 · chybějící výřez se zaznamená, ne obejde', /_bezVyrezu\.push\(uid\)/.test(app));
ok('FIX-318 · seznam se při každém načtení vyprázdní', /_bezVyrezu\.length = 0;/.test(app));

// ── Co uživatel uvidí ─────────────────────────────────────────────
ok('FIX-318 · souhrn má vlastní hlášku pro chybějící výřez',
   /ještě nepřihlásil/.test(st) && /objeví sama/.test(st));
ok('FIX-318 · pořád se rozliší i „čeká se na druhou stranu“', /Čeká se na druhou stranu/.test(st));
ok('FIX-318 · a „nikoho nemám“', /Zatím nemáš nikoho ve sdílení/.test(st));

// Tři různé stavy nesmí splynout do jedné hlášky
const hlasky=['ještě nepřihlásil','Čeká se na druhou stranu','Zatím nemáš nikoho ve sdílení'];
ok('FIX-318 · tři různé příčiny prázdna = tři různé hlášky',
   new Set(hlasky).size===3 && hlasky.every(h=>st.includes(h)));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
