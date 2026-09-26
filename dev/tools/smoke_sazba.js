/* smoke_sazba.js — FIX-325 zarovnání pole · FIX-326 hodinová sazba */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_sazba.js');
const k=R('kalendar.js');

// ── FIX-325 · zarovnání ───────────────────────────────────────────
ok('FIX-325 · pole se zarovnávají podle spodní hrany',
   /grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;align-items:end/.test(k));
ok('FIX-325 · řeší se to zarovnáním, ne pevnou výškou popisku',
   !/min-height:3[0-9]px[^"]*Čistá výplata/.test(k));
ok('FIX-325 · popisky mají čitelnou barvu, ne var(--text3)',
   /color:#a8aec8;margin-bottom:4px;line-height:1\.35">Čistá výplata/.test(k));

// ── FIX-326 · fond hodin ──────────────────────────────────────────
const ctx=vm.createContext({}); ctx.window=ctx;
vm.runInContext(k.slice(k.indexOf('function workFondHodin('), k.indexOf('function workPreviewSazba')), ctx);
const F=ctx.workFondHodin;
const cfg={workdays:[1,2,3,4,5],hpd:12,breakMin:30};

ok('FIX-326 · září 2026 má 22 pracovních dní', F(2026,8,cfg).dni===22);
ok('FIX-326 · únor 2026 má 20', F(2026,1,cfg).dni===20);
ok('FIX-326 · prosinec 2026 má 23', F(2026,11,cfg).dni===23);
ok('FIX-326 · fond se počítá z REÁLNÉHO měsíce, ne z paušálu',
   F(2026,1,cfg).hodin !== F(2026,11,cfg).hodin);
ok('FIX-326 · rozdíl mezi nejkratším a nejdelším měsícem je přes 10 %',
   (F(2026,11,cfg).hodin - F(2026,1,cfg).hodin) / F(2026,1,cfg).hodin > 0.10);
ok('FIX-326 · přestávka se odečítá', F(2026,8,cfg).hodinDen===11.5);
ok('FIX-326 · bez přestávky se neodečte nic',
   F(2026,8,{...cfg,breakMin:0}).hodinDen===12);
ok('FIX-326 · nestandardní pracovní dny se respektují',
   F(2026,8,{...cfg,workdays:[1,3,5]}).dni===13);
ok('FIX-326 · sedmidenní provoz dá všechny dny v měsíci',
   F(2026,8,{...cfg,workdays:[0,1,2,3,4,5,6]}).dni===30);
ok('FIX-326 · přestávka delší než směna nedá zápornou hodnotu',
   F(2026,8,{...cfg,hpd:1,breakMin:120}).hodinDen===0);

// ── FIX-326 · náhled ──────────────────────────────────────────────
ok('FIX-326 · konfigurace se bere ŽIVĚ z polí, ne z uložené',
   /parseFloat\(document\.getElementById\('workBreakMin'\)\?\.value\)/.test(k));
ok('FIX-326 · přepočítává se při psaní', /oninput="workPreviewSazba\(\)"/.test(k));
ok('FIX-326 · a jednou po vykreslení stránky',
   /typeof workPreviewSazba === 'function'\) workPreviewSazba\(\)/.test(k));
ok('FIX-326 · bez výplaty vyzve k zadání, nespadne', /Zadej čistou výplatu/.test(k));
ok('FIX-326 · nulový fond hodin nedělí nulou', /if \(!f\.hodin\)/.test(k));
ok('FIX-326 · ukazuje i přesčasovou hodinu s příplatkem',
   /sazba \* \(1 \+ cfg\.bonusOT \/ 100\)/.test(k));
ok('FIX-326 · vysvětlí, z čeho sazba vyšla (dny × hodiny)',
   /pracovních dní/.test(k));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
