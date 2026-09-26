// FinanceFlow · v10.76 · tools/smoke_schema.js · 2026-09-16
// ══════════════════════════════════════════════════════════════════════
//  AUDIT SYNCHRONIZAČNÍHO SCHÉMATU — automaticky (S22)
//
//  Proč existuje: během S22 jsme dvakrát narazili na tutéž třídu chyby –
//  `fixedLog` by Firebase sync tiše smazal, osobní poznámky by odešly
//  partnerovi. Obojí se zachytilo NÁHODOU, ne systematicky. Ručně provedený
//  audit se podruhé neudělá; tenhle ho zopakuje při každém běhu testů.
//
//  Co hlídá:
//    1) každé pole `S.*` má cestu do Firebase (schéma + _DW_META),
//    2) seznam sdílených partnerovi je ÚPLNÝ – žádný klíč nepropadl
//       bez rozhodnutí (10 sdílených + 15 vyjmenovaných = 25 = _DW_META),
//    3) `_dataSig()` nesleduje pole, která v aplikaci neexistují.
//
//  Když přibude nové pole, test spadne a donutí rozhodnout, kam patří.
//  To je jeho smysl – ne aby byl zelený, ale aby se na nic nezapomnělo.
// ══════════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path');
let fails = 0;
const check = (n,f) => { try{ f(); console.log('  ✅', n); } catch(e){ fails++; console.log('  ❌', n, '→', e.message); } };
const assert = (c,m) => { if(!c) throw new Error(m); };

const KOREN = path.resolve(__dirname, '..');
const moduly = fs.readdirSync(KOREN).filter(f =>
  f.endsWith('.js') && !f.startsWith('smoke') &&
  !['check_tdz.js','audit_transfer.js','worker.js','worker-push.js','sw.js'].includes(f));
const cti = f => fs.readFileSync(path.join(KOREN, f), 'utf8');

//  Komentáře se musí odstranit, jinak test najde pole i tam, kde se o něm jen
//  PÍŠE. Hned první běh na to narazil: komentář vysvětlující, že `S.goals` je
//  zrušené, sám obsahoval „S.goals" a test hlásil, že se pořád používá.
function bezKomentaru(src){
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')          // blokové komentáře
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')         // řádkové (ne v https://)
    //  Pryč i s obsahem běžných řetězců: changelog v admin.js jmenuje pole,
    //  o kterých píše („sledoval `S.goals`"), a test by je bral jako použití.
    //  Šablonové řetězce (backtick) se NEČISTÍ – tam `${S.neco}` je skutečný kód.
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
}
const ctiKod = f => bezKomentaru(cti(f));
//  `app`    = očištěný zdroj → hledání POUŽITÍ polí
//  `appRaw` = surový zdroj   → čtení STRUKTUR, které jsou samy z řetězců
//             a komentářů (_DW_META, seznam nesdílených)
const app = ctiKod('app.js');
const appRaw = cti('app.js');

//  Pole, která se ZÁMĚRNĚ neukládají – každé s důvodem. Přidat sem něco
//  znamená rozhodnout, že to opravdu nemá přežít restart.
const BEHOVE = {
  curMonth:'běhový stav (zvolený měsíc)', curYear:'běhový stav',
  page:'aktuální stránka', settings:'čte se ze samostatného uzlu',
  schemaV:'verze schématu, řeší se zvlášť', _msTrackInit:'jednorázový příznak',
  transactions:'vlastní synchronizační cesta data/transactions/{id}, do _DW_META nepatří',
  cnbInflace:'veřejný údaj ČSÚ, kdykoli znovu stažitelný (v10.72)',
  cnbInflaceAt:'časová značka téhož', cnbInflaceObd:'období téhož',
  cnbInflaceOddily:'oddíly COICOP téhož',
};

function poleS(){
  const out = {};
  moduly.forEach(f => {
    const c = ctiKod(f);
    const re = /(?<![A-Za-z0-9_.])S\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let m; while((m = re.exec(c))) (out[m[1]] = out[m[1]] || new Set()).add(f);
  });
  return out;
}

console.log('── 1) Každé pole S.* má cestu do Firebase ──');
const dwRaw = /const _DW_META = \[(.*?)\];/s.exec(appRaw);
const DW = new Set((dwRaw ? dwRaw[1] : '').match(/'([^']+)'/g)?.map(s=>s.slice(1,-1)) || []);
const SCHEMA = new Set([...app.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*S\.[a-zA-Z_]/g)].map(m=>m[1]));
const pole = poleS();

check('_DW_META se podařilo přečíst',()=>{
  assert(DW.size > 10, 'nalezeno jen '+DW.size+' klíčů – změnil se zápis?');
});
check('žádné ukládané pole nechybí v _DW_META',()=>{
  const chybi = Object.keys(pole).filter(k => !BEHOVE[k] && !DW.has(k));
  assert(!chybi.length,
    'pole bez _DW_META (Firebase je tiše smaže – TODO-257): '+chybi.join(', ')+
    '\\n     Buď je doplň do _DW_META, nebo do seznamu BEHOVE v tomhle testu s důvodem.');
});
check('žádné ukládané pole nechybí v ukládacím schématu',()=>{
  const chybi = Object.keys(pole).filter(k => !BEHOVE[k] && !SCHEMA.has(k));
  assert(!chybi.length, 'pole mimo schéma (nepřežije zálohu/export): '+chybi.join(', '));
});
check('v _DW_META není klíč, který nikdo nepoužívá',()=>{
  const mrtve = [...DW].filter(k => !pole[k]);
  assert(!mrtve.length, 'klíče v _DW_META bez jediného použití: '+mrtve.join(', '));
});

console.log('\n── 2) Sdílení partnerovi je uzavřené ──');
//  Seznam nesdílených klíčů je záměrně komentář, ne kód – je to dokumentace
//  rozhodnutí, ne datová struktura, a nikdo ho nemá číst za běhu. Proto appRaw.
const shBlok = (()=>{ const i = appRaw.indexOf('function _shMetaVals'); assert(i>=0,'_shMetaVals chybí');
  return appRaw.slice(i, appRaw.indexOf('\n}', appRaw.indexOf('ZÁMĚRNĚ SE NESDÍLÍ'))); })();

check('_shMetaVals je POVOLOVACÍ seznam, ne mazání z celku',()=>{
  //  Před FIX-317 se brala celá data a vypnuté sekce se mazaly – propadlo
  //  tím 13 uzlů, o kterých uživatel nevěděl.
  assert(/const out = \{/.test(shBlok), 'nevrací sestavený objekt');
  assert(!/delete\s+out\[/.test(shBlok), 'maže z celku místo aby vyjmenovalo');
});
check('každý klíč _DW_META je buď sdílený, nebo výslovně vyjmenovaný',()=>{
  const sdilene = new Set([...shBlok.matchAll(/^\s{4}([a-zA-Z_][a-zA-Z0-9_]*):\s/gm)].map(m=>m[1]));
  const i = shBlok.indexOf('ZÁMĚRNĚ SE NESDÍLÍ');
  const komentar = i >= 0 ? shBlok.slice(i) : '';
  const nerozhodnute = [...DW].filter(k => !sdilene.has(k) &&
    !new RegExp('(^|[\\s,])'+k+'([\\s,]|$)', 'm').test(komentar));
  assert(!nerozhodnute.length,
    'klíče bez rozhodnutí o sdílení: '+nerozhodnute.join(', ')+
    '\\n     Každý nový klíč musí být buď v `out`, nebo vyjmenovaný v komentáři ZÁMĚRNĚ SE NESDÍLÍ.');
});
check('osobní pole transakce se do výřezu nedostanou',()=>{
  //  _dwTxObj posílá CELÉ objekty transakcí, takže tohle je jediná obrana.
  const i = appRaw.indexOf('_TX_OSOBNI');
  assert(i >= 0, 'chybí seznam osobních polí transakce');
  const usek = appRaw.slice(i, i + 200);
  ['notes','priorityNote'].forEach(k =>
    assert(new RegExp("'"+k+"'").test(usek), 'v _TX_OSOBNI chybí '+k));
});

console.log('\n── 3) Podpis dat sleduje existující pole ──');
const ui = ctiKod('ui.js');
const sigBlok = (()=>{ const i = ui.indexOf('function _dataSig'); assert(i>=0,'_dataSig chybí');
  return ui.slice(i, i+1800); })();

check('_dataSig nesleduje pole, které v aplikaci neexistuje',()=>{
  const sledovana = [...sigBlok.matchAll(/S\.([a-zA-Z_][a-zA-Z0-9_]*)/g)].map(m=>m[1]);
  const duchove = [...new Set(sledovana)].filter(k => {
    const jinde = Object.keys(pole).includes(k) && [...pole[k]].some(f => f !== 'ui.js');
    return !jinde && !BEHOVE[k];
  });
  assert(!duchove.length,
    'podpis sleduje neexistující pole: '+duchove.join(', ')+
    '\\n     Takový součet je vždy 0 a změna dat nemusí překreslit stránku.');
});
check('podpis sleduje přání (S.wishes), ne zrušené S.goals',()=>{
  assert(!/S\.goals/.test(sigBlok), 'pořád sleduje neexistující S.goals');
  assert(/S\.wishes/.test(sigBlok), 'nesleduje přání – úprava cíle nepřekreslí stránku');
});

console.log(fails ? `\n❌ SELHALO ${fails}` : '\n✅ SCHÉMA OVĚŘENO');
process.exit(fails ? 1 : 0);
