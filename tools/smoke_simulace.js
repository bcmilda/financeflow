/* smoke_simulace.js — S21, FIX-294 až FIX-301
 * Simulace života: pět opravených vad modelu + jeden zdroj pro karty i graf. */
const fs=require('fs'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'projects.js'),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
const blizko=(a,b,tol)=>Math.abs(a-b)<=tol;

console.log('smoke_simulace.js');

// Vytáhni simCompute + simDoba ze zdroje
const pick=(name,konec)=>{ const i=src.indexOf('function '+name+'('); if(i<0) throw new Error('nenalezeno: '+name);
  const j=src.indexOf(konec,i); return src.slice(i,j); };
eval(pick('simCompute','// „za 7 měsíců'));
eval(pick('simDoba','function runSimulace()'));

// ── Milanovy vstupy ze screenshotu ──────────────────────────────
const P = { months:360, income:10000, expenses:7000, debt:5000, savings:0,
            debtPayment:3000, debtRate:9.9, inflation:3, investReturn:7, investPct:15 };
const s = simCompute(P);

// FIX-295: splátka končí spolu s dluhem, ne až v důchodu
ok('FIX-295 · dluh 5 000 se splatí do 2 měsíců, ne za 30 let',
   s.A.freeMonth !== null && s.A.freeMonth <= 2);
ok('FIX-295 · po splacení se přebytek uvolní na 3 000',
   s.prebytekPoSplaceni === 3000 && s.prebytek === 0);

// FIX-294: nelze investovat peníze, které nejsou
const bezPrebytku = simCompute({...P, debt:0, debtPayment:0, expenses:10000});
ok('FIX-294 · při nulovém přebytku se neinvestuje nic',
   bezPrebytku.investSkutecne === 0 && bezPrebytku.B.final === 0);
ok('FIX-294 · cílové procento se ohlásí jako omezené', bezPrebytku.investOmezen === true);

// FIX-296: úrok dluhu má vliv
const Q = {...P, debt:300000, debtPayment:5000, income:30000, expenses:20000};
const drahyDluh = simCompute({...Q, debtRate:18});
const levnyDluh = simCompute({...Q, debtRate:1});
const naRovine  = simCompute({...Q, debtRate:7});   // úrok = výnos investic
ok('FIX-296 · při úroku 18 % vyhraje splacení dluhu (C > B)', drahyDluh.C.final > drahyDluh.B.final);
ok('FIX-296 · při úroku 1 % vyhraje investování (B > C)',    levnyDluh.B.final > levnyDluh.C.final);
// Ekonomický test správnosti modelu: když se úrok dluhu rovná výnosu investic,
// nesmí ani jeden scénář výrazně vyhrát – je jedno, kam korunu pošleš.
ok('FIX-296 · při shodě úroku a výnosu jsou B a C prakticky nastejno',
   Math.abs(naRovine.C.final - naRovine.B.final) / naRovine.B.final < 0.005);
ok('FIX-296 · odměna za splacení se neztratí v hotovosti (C roste s úrokem)',
   (drahyDluh.C.final - drahyDluh.B.final) > (levnyDluh.C.final - levnyDluh.B.final));
ok('FIX-296 · drahý dluh se splácí déle než levný',
   drahyDluh.A.freeMonth !== null && drahyDluh.A.freeMonth > levnyDluh.A.freeMonth);

// Když splátka nestačí, ale přebytek ano – C to má zvládnout a text to má říct
const jenC = simCompute({...P, debt:300000, debtPayment:5000, debtRate:25, income:30000, expenses:20000});
ok('nesplatitelné sjednanou splátkou, ale C dluh umoří',
   jenC.nesplatitelny === true && jenC.A.freeMonth === null && jenC.C.freeMonth !== null);

// FIX-297: jedna měna pro všechny tři scénáře (dnešní peníze)
const jenHotovost = simCompute({months:120, income:20000, expenses:10000, debt:0, savings:0,
                                debtPayment:0, debtRate:0, inflation:3, investReturn:3, investPct:100});
ok('FIX-297 · A (hotovost) je inflací znehodnocená pod nominál',
   jenHotovost.A.final < 10000*120 && jenHotovost.A.final > 0);
const bezInflace = simCompute({...jenHotovost0(), inflation:0});
function jenHotovost0(){ return {months:120, income:20000, expenses:10000, debt:0, savings:0,
   debtPayment:0, debtRate:0, inflation:0, investReturn:0, investPct:0}; }
ok('FIX-297 · bez inflace a bez výnosu je A přesně součet přebytků',
   blizko(bezInflace.A.final, 10000*120, 1));
ok('FIX-297 · B roste reálně jen o rozdíl výnos − inflace',
   simCompute({...jenHotovost0(), investReturn:3, inflation:3, investPct:100}).B.final
   <= simCompute({...jenHotovost0(), investReturn:7, inflation:3, investPct:100}).B.final);

// FIX-298: nesplacený dluh se odečítá z čistého jmění
const zustavaDluh = simCompute({months:12, income:10000, expenses:10000, debt:100000, savings:0,
                                debtPayment:0, debtRate:0, inflation:0, investReturn:0, investPct:0});
ok('FIX-298 · nesplacený dluh drží čisté jmění v mínusu',
   zustavaDluh.A.final === -100000 && zustavaDluh.A.debtLeft === 100000);
ok('FIX-298 · řada čistého jmění začíná úsporami minus dluh',
   zustavaDluh.A.nw[0] === -100000);

// Splátka nepokrývá úrok → musí se ohlásit, ne tiše počítat
const past = simCompute({...P, debt:200000, debtPayment:100, debtRate:60});
ok('past · splátka pod úrokem se ohlásí jako nesplatitelná', past.nesplatitelny === true);
ok('past · a dluh skutečně zůstává', past.A.debtLeft > 200000);
ok('zdravý dluh se jako nesplatitelný NEhlásí (falešný poplach)', s.nesplatitelny === false);

// FIX-299: čitelná doba splacení
ok('FIX-299 · 2 měsíce se nepíšou jako „0.1r“', simDoba(2) === 'za 2 měsíce');
ok('FIX-299 · skloňování 1 / 3 / 30 měsíců',
   simDoba(1)==='za 1 měsíc' && simDoba(3)==='za 3 měsíce' && simDoba(30)==='za 2,5 roku');
ok('FIX-299 · nesplacený dluh nehlásí číslo', simDoba(null) === 'nesplaceno');

// FIX-300: titulek nejlepšího scénáře odpovídá číslu pod ním
ok('FIX-300 · zdroj vybírá titulek ze všech tří scénářů',
   /best === scenC \? 'C[\s\S]{0,120}best === scenB \? 'B/.test(src));

// FIX-301: graf i karty čtou z téhož výpočtu
ok('FIX-301 · graf dostává `sim`, ne vlastní parametry modelu',
   /drawSimulaceChart\(age, retireAge, sim\)/.test(src) &&
   /function drawSimulaceChart\(age, retireAge, sim\)/.test(src));
ok('FIX-301 · graf nepočítá vlastní scénáře',
   !/let a=startSavings, b=startSavings, c=startSavings/.test(src));
ok('FIX-301 · řady grafu mají délku měsíců+1', s.A.nw.length === 361);

// Osa Y unese záporné hodnoty
ok('osa Y počítá i se záporným minimem', /const minVal=Math\.min\(\.\.\.vsechny,0\)/.test(src));

// Pole úroku dluhu existuje a je předvyplněné z reálných dluhů
ok('pole „Úrok dluhu“ v formuláři', /id="simDebtRate"/.test(src) && /wAvgDebtRate/.test(src));

// Model je vnitřně konzistentní: bez dluhu jsou B a C totéž
const bezDluhu = simCompute({...P, debt:0, debtPayment:0});
ok('bez dluhu vycházejí B a C stejně', bezDluhu.B.final === bezDluhu.C.final);

// Uvolněná splátka se po splacení dluhu opravdu investuje (jinak by mizela v hotovosti)
ok('uvolněná splátka se po splacení investuje',
   s.investPoSplaceni === 3000 && s.investSkutecne === 0);

// Karta B nesmí tvrdit procento, když investuje jinou částku (FIX-302)
ok('FIX-302 · karta B ukazuje částku, ne cílové procento',
   src.includes("'Scénář B<br>Investuji', scenB") &&
   src.includes("sim.investPoSplaceni))}/měs při ${investReturn}"));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
