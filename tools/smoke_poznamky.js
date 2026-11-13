// FinanceFlow · v10.62 · tools/smoke_poznamky.js · 2026-09-12
// S22 · DENÍKOVÉ POZNÁMKY K VÝDAJŮM (level 1).
// Behaviorální test (SKILL 35): volá skutečné funkce a čte vygenerované HTML.
// Nejdůležitější je sekce ÚNIK – poznámky jsou osobní deník a partnerovi
// nesmí odejít ani ve „full" režimu sdílení (tatáž chyba jako FIX-317).
const fs = require('fs'), vm = require('vm');
let fails = 0;
const check = (n,f) => { try{ f(); console.log('  ✅', n); } catch(e){ fails++; console.log('  ❌', n, '→', e.message); } };
const assert = (c,m) => { if(!c) throw new Error(m); };

const noop = () => {};
const el = new Proxy({}, { get:(t,k)=> k==='style'?{}:noop });
//  pznText musí umět focus() – skutečný kód ho volá při úpravě zápisu.
const prvky = { poznamkyContent:{innerHTML:''}, denikContent:{innerHTML:''},
                pznText:{ value:'', focus:()=>{}, select:()=>{} } };
const sb = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Map, Set, Promise,
  Infinity, NaN, isFinite, isNaN, parseInt, parseFloat, setTimeout, clearTimeout,
  window:{}, document:{ getElementById:id=>prvky[id]||null, querySelector:()=>null,
    querySelectorAll:()=>[], createElement:()=>el, addEventListener:noop, body:el, documentElement:el },
  localStorage:{getItem:()=>null,setItem:noop,removeItem:noop},
  navigator:{language:'cs-CZ'}, location:{href:'x',pathname:'/'},
  fetch:()=>Promise.resolve({ok:false,json:()=>Promise.resolve({})}),
  requestAnimationFrame:c=>setTimeout(c,0), IntersectionObserver:class{observe(){}disconnect(){}},
  confirm:()=>true, alert:noop, prompt:()=>null,
};
sb.window = sb; sb.globalThis = sb; sb.self = sb;
vm.createContext(sb);
['helpers.js','poznamky.js'].forEach(f=>{
  try{ vm.runInContext(fs.readFileSync(f,'utf8'), sb, {filename:f}); }
  catch(e){ console.error('❌ Nelze načíst '+f+': '+e.message); process.exit(2); }
});

const iso = '2026-07-15';
sb.S = { curMonth:6, curYear:2026, transactions:[
  {id:'tx1', date:iso, type:'expense', amount:900, name:'Sluchátka', catId:'zabava'},
  {id:'tx2', date:iso, type:'expense', amount:300, name:'Oběd', catId:'jidlo', priorityNote:'zbytečné'},
], categories:[{id:'zabava',name:'Zábava'},{id:'jidlo',name:'Jídlo'}] };
let ulozeno = 0;
vm.runInContext(`S = globalThis.S;
  getData = () => S;
  save = () => { globalThis.__ulozeno = (globalThis.__ulozeno||0) + 1; };
  showToast = (m) => { globalThis.__toast = m; };
  showPage = (p) => { globalThis.__page = p; };
  showPageByName = (p) => { globalThis.__page = p; };`, sb);

const tx = id => sb.S.transactions.find(t=>t.id===id);
const html = () => prvky.poznamkyContent.innerHTML;
const zapis = (txt) => { prvky.pznText.value = txt; vm.runInContext('pznUloz()', sb); };

console.log('── Poznámky k výdajům: zápis ──');

check('otevření výdaje přepne na stránku poznámek', () => {
  vm.runInContext("pznOtevri('tx1','denik')", sb);
  assert(sb.__page === 'poznamky', 'nepřepnulo na poznamky, ale na '+sb.__page);
  assert(/Sluchátka/.test(html()), 'nezobrazuje název transakce');
  //  fmt() vrací holé číslo bez měny – měnu doplňuje až šablona.
  assert(/900/.test(html()), 'nezobrazuje částku');
});

check('prázdný stav vysvětlí, co sem psát', () => {
  assert(/Zatím tu nic není/.test(html()), 'chybí prázdný stav');
  assert(/první zápis/.test(html()), 'prázdný stav nevysvětluje, co dělat');
});

check('první zápis se uloží a zobrazí', () => {
  zapis('Koupil jsem si je po půl roce váhání.');
  assert(sb.__ulozeno >= 1, 'save() se nezavolalo');
  assert(tx('tx1').notes.length === 1, 'zápis se neuložil');
  assert(/po půl roce váhání/.test(html()), 'zápis se nezobrazil');
});

check('LEVEL 1 · druhý zápis první NEPŘEPÍŠE (to je celý smysl deníku)', () => {
  zapis('Po měsíci: používám je denně, nelituju.');
  const n = tx('tx1').notes;
  assert(n.length === 2, 'zápisů je '+n.length+', ne 2 – druhý přepsal první');
  assert(/váhání/.test(html()) && /nelituju/.test(html()), 'v seznamu nejsou oba zápisy');
});

check('zápisy jsou seřazené od nejnovějšího', () => {
  const h = html();
  assert(h.indexOf('nelituju') < h.indexOf('váhání'), 'nejnovější není nahoře');
});

check('prázdný zápis se neuloží', () => {
  const pred = tx('tx1').notes.length;
  zapis('   ');
  assert(tx('tx1').notes.length === pred, 'uložil se prázdný zápis');
  assert(/prázdn/i.test(sb.__toast||''), 'uživateli se nic neřeklo');
});

check('zápis jde upravit i smazat', () => {
  const id = tx('tx1').notes[0].id;
  vm.runInContext(`pznUprav('${id}')`, sb);
  zapis('Upraveno.');
  const z = tx('tx1').notes.find(x=>x.id===id);
  assert(z.text === 'Upraveno.', 'úprava se neprojevila: '+z.text);
  assert(z.editedAt, 'chybí značka úpravy');
  vm.runInContext(`pznSmaz('${id}')`, sb);
  assert(!tx('tx1').notes.some(x=>x.id===id), 'zápis se nesmazal');
});

check('HTML v textu se neprovede (escapování)', () => {
  zapis('<img src=x onerror=alert(1)>');
  assert(!/<img src=x/.test(html()), 'neescapované HTML propadlo do stránky');
  assert(/&lt;img/.test(html()), 'text se vůbec nezobrazil');
});

console.log('\n── Převzetí staré poznámky ──');

check('stará priorityNote se převezme jako první zápis, nezmizí', () => {
  vm.runInContext("pznOtevri('tx2','review')", sb);
  const n = tx('tx2').notes;
  assert(n && n.length === 1, 'stará poznámka se nepřevzala');
  assert(n[0].text === 'zbytečné', 'převzal se špatný text: '+n[0].text);
  assert(n[0].migrated === true, 'chybí označení, že jde o převzatý zápis');
});

check('převzetí proběhne jen jednou (nezduplikuje se)', () => {
  vm.runInContext("pznOtevri('tx2','review')", sb);
  assert(tx('tx2').notes.length === 1, 'po druhém otevření je zápisů '+tx('tx2').notes.length);
});

check('priorityNote zrcadlí nejnovější zápis (čte ho Detektor a souhrny)', () => {
  zapis('Novější úvaha.');
  assert(tx('tx2').priorityNote === 'Novější úvaha.', 'zrcadlo nesedí: '+tx('tx2').priorityNote);
});

console.log('\n── ÚNIK: poznámky se partnerovi NESMÍ poslat ──');

//  Výřez pro partnera (_shTxObj) v režimu 'full' posílal CELÉ objekty
//  transakcí. Tady se ověřuje, že z nich osobní pole vypadnou.
const appjs = fs.readFileSync('app.js','utf8');
//  Vytáhne celou funkci párováním závorek (stejný postup jako smoke_sdileni.js) –
//  hledat konec podle '\n}' by se rozbilo při první vnořené funkci.
function vytahni(nazev){
  const i = appjs.indexOf('function '+nazev);
  assert(i >= 0, 'v app.js chybí '+nazev);
  let d = 0;
  for(let k = appjs.indexOf('{', i); k < appjs.length; k++){
    if(appjs[k]==='{') d++;
    else if(appjs[k]==='}'){ d--; if(!d) return appjs.slice(i, k+1); }
  }
  throw new Error('nepodařilo se vytáhnout '+nazev);
}
assert(/_TX_OSOBNI/.test(appjs), 'app.js neobsahuje _TX_OSOBNI – výřez není ošetřen');
const sb2 = { console, Object, Array, JSON, String };
vm.createContext(sb2);
vm.runInContext(vytahni('_shTxObj'), sb2, {filename:'app-sh'});

check('v režimu full se poznámky z výřezu odstraní', () => {
  sb2.txShareMode = () => 'full';
  sb2._dwTxObj = () => ({
    a: { id:'a', name:'Sluchátka', amount:900, notes:[{id:'n1',ts:1,text:'osobní'}], priorityNote:'osobní' },
    b: { id:'b', name:'Oběd', amount:300 },
  });
  const out = vm.runInContext('_shTxObj()', sb2);
  assert(out.a, 'transakce z výřezu zmizela úplně');
  assert(out.a.notes === undefined, 'POZNÁMKY UNIKLY PARTNEROVI');
  assert(out.a.priorityNote === undefined, 'priorityNote unikla partnerovi');
  assert(out.a.name === 'Sluchátka' && out.a.amount === 900, 'ořezalo se i to, co partner vidět má');
});

check('transakce bez poznámek se nekopíruje (nemění podpis → nezapisuje se znovu)', () => {
  sb2.txShareMode = () => 'full';
  const zdroj = { b: { id:'b', name:'Oběd', amount:300 } };
  sb2._dwTxObj = () => zdroj;
  const out = vm.runInContext('_shTxObj()', sb2);
  assert(out.b === zdroj.b, 'transakce bez poznámek se zbytečně klonuje');
});

check('režim bez sdílení transakcí posílá prázdno', () => {
  sb2.txShareMode = () => 'sums';
  const out = vm.runInContext('_shTxObj()', sb2);
  assert(Object.keys(out).length === 0, 'v režimu sums se posílají transakce');
});

check('úložiště zůstává nedotčené (výřez ≠ smazání dat)', () => {
  assert(Array.isArray(tx('tx2').notes) && tx('tx2').notes.length > 0,
    'poznámky zmizely i z vlastních dat');
});

console.log(fails ? `\n❌ SELHALO ${fails}` : '\n✅ POZNÁMKY OVĚŘENY');
process.exit(fails ? 1 : 0);
