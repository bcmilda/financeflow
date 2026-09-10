/* smoke_vyplatnice.js — TODO-257: evidence výplatnic (fáze 1) */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_vyplatnice.js');

const v=R('vyplatnice.js'), app=R('app.js'), kal=R('kalendar.js');
const ctx=vm.createContext({}); ctx.window=ctx;
vm.runInContext('var S={};'+v.slice(v.indexOf('const VYPL_POVAHY'), v.indexOf('// ── Render')), ctx);

// ── Výpočet ověřený na SKUTEČNÝCH páskách ─────────────────────────
const pasky=[
 ['08/26',{zaklad:22655,dovolena:4838,vykonove:984,osobni:1952,mobilita:3383,
           nocni:1231,prescas:3366,prescasPr:1168,vikend:1677,penzPrisp:800},
          {slevaZak:2570,slevaDet:1267},{stravovani:260,dps:800}, 41254,34109,33849],
 ['08/25',{zaklad:25500,vykonove:858,osobni:1926,mobilita:3339,nocni:1230,
           prescas:181,prescasPr:69,vikend:747},
          {slevaZak:2570},{stravovani:310,penezenka:11}, 33850,27407,27086],
 ['06/25',{zaklad:25500,vykonove:852,osobni:2295,korekce:500,mobilita:3315,
           nocni:1043,vikend:1093},
          {slevaZak:2570},{stravovani:310}, 34598,27964,27654],
 ['02/25',{zaklad:9857,vykonove:394,osobni:887,mobilita:1281,nocni:395,
           vikend:155,nabor:3000},
          {slevaZak:2570},{}, 15969,14116,14116],
];
pasky.forEach(([m,pr,od,sr,hr,ci,dob])=>{
  const r=ctx.vyplDopocet({m,prijmy:pr,odvody:od,srazky:sr});
  ok(`${m} · hrubá ${hr}`,   r.hruba===hr);
  ok(`${m} · čistý ${ci}`,   r.cisty===ci);
  ok(`${m} · dobírka ${dob}`,r.dobirka===dob);
});

// ── Průchozí položky se ruší ──────────────────────────────────────
ok('PENZ se nepočítá do hrubé mzdy',
   ctx.vyplDopocet({prijmy:{zaklad:1000,penzPrisp:800},odvody:{},srazky:{}}).hruba===1000);
ok('DPS se nepočítá do srážek',
   ctx.vyplDopocet({prijmy:{zaklad:1000},odvody:{},srazky:{dps:800}}).srazky===0);

// ── Zaokrouhlování NAHORU ─────────────────────────────────────────
const z=ctx.vyplDopocet({prijmy:{zaklad:41254},odvody:{slevaZak:2570,slevaDet:1267},srazky:{}});
ok('pojistné se zaokrouhluje nahoru (1857/2930)', z.zp===1857 && z.sp===2930);
ok('základ daně nahoru na stovky (41 300 × 15 %)', z.danPred===6195);
ok('záporná daň se nedělá (slevy > daň)',
   ctx.vyplDopocet({prijmy:{zaklad:5000},odvody:{slevaZak:2570},srazky:{}}).dan===0);

// ── Podíl pevné složky ────────────────────────────────────────────
const pod=ctx.vyplPodilPevne({prijmy:{zaklad:7000,mobilita:1000,vykonove:2000}});
ok('podíl pevné složky 8000/10000 = 80 %', pod===80);
ok('prázdná páska nedělí nulou', ctx.vyplPodilPevne({prijmy:{}})===null);

// ── Povahy položek (SKILL 31) ─────────────────────────────────────
const sab=ctx.vyplSablona();
const najdi=k=>sab.prijmy.concat(sab.odvody,sab.srazky).find(x=>x.key===k);
ok('dovolená je příležitostná (chybí ≠ nula)', najdi('dovolena').povaha==='prilezitostna');
ok('sleva na dítě je podmíněná',              najdi('slevaDet').povaha==='podminena');
ok('prémie jsou stálé',                       najdi('vykonove').povaha==='stala');
ok('PENZ i DPS jsou průchozí',                najdi('penzPrisp').povaha==='pruchozi' && najdi('dps').povaha==='pruchozi');
ok('všechny položky mají platnou povahu',
   sab.prijmy.concat(sab.odvody,sab.srazky).every(x=>vm.runInContext('VYPL_POVAHY',ctx).includes(x.povaha)));

// ── Prázdné pole se NEUKLÁDÁ jako nula ────────────────────────────
ok('prázdné pole se přeskočí, neuloží jako 0', /if \(raw === ''\) return;/.test(v));
ok('a je to uživateli vysvětlené', /znamená „neproběhlo“, ne nulu/.test(v));

// ── Integrace ─────────────────────────────────────────────────────
ok('záložka je v Kalendáři', /tabBtn\('vyplatnice', '🧾', 'Výplatnice'\)/.test(kal));
ok('a má vlastní větev renderu', /mode === 'vyplatnice'/.test(kal));
ok('chybějící modul nespadne, jen to řekne', /Modul výplatnic se nenačetl/.test(kal));
ok('payslips JSOU ve Firebase schématu (jinak by je sync smazal)',
   /payslips:      S\.payslips      \|\| \[\]/.test(app));
ok('payslips jsou v _DW_META (diff-write)', /'payslips','payslipTemplate'/.test(app));
ok('payslips jsou i v záloze', /payslips:S\.payslips\|\|\[\]/.test(app));
ok('výplatnice se NESDÍLÍ s partnery', /payslips, payslipTemplate            – výplatní pásky/.test(app));
ok('nad cizími daty se neukládá ani nemaže',
   (v.match(/typeof viewingUid !== 'undefined' && viewingUid\) return;/g)||[]).length>=2);

// ── Import s kontrolou (TODO-257) ─────────────────────────────────
ok('import odmítne měsíc, který nesedí na dobírku', /nesedi\.push\(`dobírka/.test(v));
ok('import kontroluje hrubou, čistý i dobírku',
   /nesedi\.push\(`hrubá/.test(v) && /nesedi\.push\(`čistý/.test(v));
ok('bez `ocekavano` se pásce věří (nevynucuje se)', /if \(o\.hruba   != null/.test(v));
ok('naimportují se jen měsíce, které prošly', /const klice = new Set\(ok\.map/.test(v));
ok('uživatel se dozví, PROČ měsíc neprošel', /✗ \$\{c\}/.test(v));
ok('rozbitý JSON nespadne, jen to řekne', /Nepovedlo se přečíst JSON/.test(v));
ok('import nad cizími daty neprojde',
   /function vyplImportSpustit\(\) \{\s*\n\s*if \(typeof viewingUid/.test(v));
ok('příplatek za svátek je v šabloně (nalezen v 05\/25)',
   /kod: '2089', label: 'Příplatek práce ve svátek'/.test(v));

// Ověření importního souboru proti skutečným páskám
{
  const fsx=require('fs'), px=require('path');
  const cesta=px.join(__dirname,'vyplatnice-import.json');
  if (fsx.existsSync(cesta)) {
    const data=JSON.parse(fsx.readFileSync(cesta,'utf8'));
    const spatne=data.filter(z=>{
      const r=ctx.vyplDopocet(z), o=z.ocekavano||{};
      return r.hruba!==o.hruba || r.cisty!==o.cisty || r.dobirka!==o.dobirka;
    });
    ok(`importní soubor: všech ${data.length} měsíců sedí na skutečnou pásku`, spatne.length===0);
    ok('importní soubor pokrývá víc než rok', data.length>=11);
    ok('02/2025 v importu NENÍ (Milan: první páska je 03/2025)',
       !data.some(z=>z.m==='2025-02'));
    ok('vánoční příspěvek je v šabloně (nalezen v 11/25)',
       /kod: '5010', label: 'Vánoční příspěvek'/.test(v));
  }
}

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
