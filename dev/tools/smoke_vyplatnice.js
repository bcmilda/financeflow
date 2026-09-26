/* smoke_vyplatnice.js — TODO-257: evidence výplatnic (fáze 1) */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_vyplatnice.js');

const v=R('vyplatnice.js'), app=R('app.js'), kal=R('kalendar.js');
const ctx=vm.createContext({}); ctx.window=ctx;
// SKILL 36: detektor (fáze 3) leží AŽ ZA sekcí Render, takže se musí vytáhnout
//   zvlášť – původní rozsah extrakce ho míjel a padalo to na „not a function“.
vm.runInContext('var S={};'+v.slice(v.indexOf('const VYPL_POVAHY'), v.indexOf('// ── Render')), ctx);
vm.runInContext(v.slice(v.indexOf('function vyplZmenyTarifu('), v.indexOf('function _vyplDetektor(')), ctx);

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
    ok('importní soubor pokrývá 19 měsíců', data.length>=19);
    ok('období se řídí sloupcem Obd. na pásce, ne měsícem výplaty',
       data.some(z=>z.m==='2026-01') && data.some(z=>z.m==='2025-12'));
    ok('řada je SOUVISLÁ (žádný chybějící měsíc)', (()=>{
      const ms=data.map(z=>z.m).sort();
      for(let i=0;i<ms.length-1;i++){
        const [y,m]=ms[i].split('-').map(Number), [y2,m2]=ms[i+1].split('-').map(Number);
        if((y2*12+m2)-(y*12+m)!==1) return false;
      } return true; })());
    ok('roční prémie je v šabloně (nalezena v 05/26)',
       /kod: '5045', label: 'Roční prémie'/.test(v));
    ok('02/2025 je zpátky (Milanovo upřesnění: první páska)',
       data.some(z=>z.m==='2025-02'));
    ok('vánoční příspěvek je v šabloně (nalezen v 11/25)',
       /kod: '5010', label: 'Vánoční příspěvek'/.test(v));
  }
}

// ── FÁZE 2 · rozklad a grafy (TODO-258) ───────────────────────────
{
  const r=ctx.vyplRozklad({prijmy:{zaklad:20000,mobilita:2000,dovolena:1000,
    nocni:500,prescas:800,vykonove:900,osobni:600,penzPrisp:800}});
  ok('rozklad · pevná = tarif + mobilita + dovolená', r.pevna===23000);
  ok('rozklad · za čas = noční + přesčas',            r.zaCas===1300);
  ok('rozklad · za výkon = prémie',                   r.zaVykon===1500);
  ok('rozklad · průchozí položka se nezapočítá',      r.celkem===25800);
  ok('rozklad · skupiny dají dohromady celek',
     r.pevna+r.zaCas+r.zaVykon+r.jine===r.celkem);
  ok('rozklad · neznámá položka spadne do „jiné“, neztratí se',
     ctx.vyplRozklad({prijmy:{zaklad:100,neznama:50}}).jine===50);
  ok('rozklad · prázdná páska nespadne', ctx.vyplRozklad({}).celkem===0);

  // Nad skutečnými daty musí rozklad sedět na hrubou mzdu z pásky
  const fsx=require('fs'), px=require('path');
  const cesta=px.join(__dirname,'vyplatnice-import.json');
  if (fsx.existsSync(cesta)) {
    const data=JSON.parse(fsx.readFileSync(cesta,'utf8'));
    const nesedi=data.filter(z=>ctx.vyplRozklad(z).celkem!==z.ocekavano.hruba);
    ok('rozklad sedí na hrubou mzdu ve VŠECH 19 měsících', nesedi.length===0);
    const podily=data.map(z=>{const q=ctx.vyplRozklad(z);return q.pevna/q.celkem*100;});
    ok('podíl pevné složky je v rozumném rozmezí (60–95 %)',
       podily.every(p=>p>=55 && p<=95));
  }
}
{
  const g=R('vyplatnice.js');
  ok('grafy · bez canvasu (žádné DPR ani čekání na layout)',
     !/getContext\('2d'\)/.test(g) && /display:flex;gap:2px;align-items:flex-end/.test(g));
  ok('grafy · při jednom měsíci se nekreslí nic', /if \(zaznamy\.length < 2\) return ''/.test(g));
  ok('grafy · zobrazí se posledních 24 měsíců', /\.slice\(-24\)/.test(g));
  ok('grafy · legenda vysvětluje všechny tři skupiny',
     /Za výkon/.test(g) && /Za čas/.test(g) && /Pevná/.test(g));
  ok('grafy · srážky vylučují průchozí položky', /pruchoziSr\.has\(k\)/.test(g));
  ok('grafy · appka NEHODNOTÍ, který podíl je správný',
     /Appka neříká, který podíl je správný/.test(g));
  ok('grafy · dělení nulou při prázdné pásce ošetřeno', /r\.celkem \? r\.pevna \/ r\.celkem/.test(g));
}

// ── FÁZE 3 · detektor přesunu (TODO-259) ──────────────────────────
{
  const mk=(m,tarif,vykonove,osobni,extra={})=>({m,hlavicka:{tarif},
    prijmy:Object.assign({zaklad:tarif,vykonove,osobni},extra)});
  // Základ nahoru, prémie dolů → přesun
  let r=ctx.vyplAnalyzaPresunu([
    mk('2025-01',20000,2000,1000), mk('2025-02',20000,2000,1000), mk('2025-03',20000,2000,1000),
    mk('2025-04',23000,500,500),   mk('2025-05',23000,500,500),   mk('2025-06',23000,500,500)],3)[0];
  ok('detektor · základ +3000 a prémie −2000 označí jako PŘESUN',
     r.dTarif===3000 && Math.round(r.dVykon)===-2000 && r.presun===true);
  ok('detektor · spočítá, kolik ze zvýšení pokles prémií snědl',
     Math.round(r.pokryti*100)===67);
  ok('detektor · netto je součet obou pohybů', Math.round(r.netto)===1000);

  // Základ nahoru, prémie taky → NENÍ přesun
  r=ctx.vyplAnalyzaPresunu([
    mk('2025-01',20000,2000,1000), mk('2025-02',20000,2000,1000), mk('2025-03',20000,2000,1000),
    mk('2025-04',23000,2500,1200), mk('2025-05',23000,2500,1200), mk('2025-06',23000,2500,1200)],3)[0];
  ok('detektor · skutečné zvýšení se za přesun NEoznačí', r.presun===false);

  // Jednorázová odměna nesmí zkreslit průměr
  const bezOdmeny=ctx.vyplAnalyzaPresunu([
    mk('2025-01',20000,2000,1000), mk('2025-02',20000,2000,1000), mk('2025-03',20000,2000,1000),
    mk('2025-04',23000,2000,1000), mk('2025-05',23000,2000,1000), mk('2025-06',23000,2000,1000)],3)[0];
  const sOdmenou=ctx.vyplAnalyzaPresunu([
    mk('2025-01',20000,2000,1000), mk('2025-02',20000,2000,1000,{vanocni:9000}), mk('2025-03',20000,2000,1000),
    mk('2025-04',23000,2000,1000), mk('2025-05',23000,2000,1000), mk('2025-06',23000,2000,1000)],3)[0];
  ok('detektor · vánoční příspěvek NEZKRESLÍ porovnání prémií',
     Math.round(bezOdmeny.dVykon)===Math.round(sOdmenou.dVykon));
  ok('detektor · vynechané jednorázovky se přesto vykážou', sOdmenou.jednorazovePred===9000);

  // Bez změny tarifu není co hlásit
  ok('detektor · beze změny tarifu nehlásí nic',
     ctx.vyplAnalyzaPresunu([mk('2025-01',20000,2000,1000),mk('2025-02',20000,2000,1000)],3).length===0);
  ok('detektor · bez měsíců na jedné straně analýzu vynechá',
     ctx.vyplAnalyzaPresunu([mk('2025-01',20000,2000,1000),mk('2025-02',23000,2000,1000)],3).length===1);

  // Skutečná data
  const fsx=require('fs'), px=require('path');
  const cesta=px.join(__dirname,'vyplatnice-import.json');
  if (fsx.existsSync(cesta)) {
    const data=JSON.parse(fsx.readFileSync(cesta,'utf8'));
    const an=ctx.vyplAnalyzaPresunu(data);
    ok('detektor · v Milanových datech najde OBĚ změny tarifu', an.length===2);
    ok('detektor · zachytí 23 000 → 25 500 i 25 500 → 26 140',
       an[0].tarifPred===23000 && an[0].tarifPo===25500 &&
       an[1].tarifPred===25500 && an[1].tarifPo===26140);
    ok('detektor · obě změny vyjdou jako čisté zvýšení (netto > 0)',
       an.every(a=>a.netto>0));
  }

  const g=R('vyplatnice.js');
  ok('detektor · porovnává TARIF, ne vyplacený základ',
     /Porovnává se <strong[^>]*>tarif<\/strong>, ne vyplacený základ/.test(g));
  ok('detektor · vysvětlí, proč se nekouká na vyplacený základ',
     /krátí\s*\n?\s*podle odpracovaných hodin/.test(g));
  ok('detektor · při málo datech se nekreslí', /if \(zaznamy\.length < 4\) return ''/.test(g));
  ok('pořadí · analýza je PŘED historií',
     g.indexOf('_vyplDetektor(zaznamy)') < g.indexOf('📜 Historie'));
}

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
