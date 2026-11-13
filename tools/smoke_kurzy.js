/* smoke_kurzy.js — FIX-322: připnuté měny jsou per uživatel */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_kurzy.js');

const src=R('kurzy.js');
const mk=(store={})=>{
  const ctx=vm.createContext({}); ctx.window=ctx;
  ctx.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
  ctx.renderKurzy=()=>{};
  const i=src.indexOf('function _pinnedFxKey()');
  vm.runInContext(src.slice(i, src.indexOf('window.getPinnedFx')), ctx);
  ctx._store=store;
  return ctx;
};

// Jádro: dva účty na jednom prohlížeči se nesmí ovlivnit
let c=mk(); c._currentUser={uid:'milan'};
c.togglePinFx('EUR'); c.togglePinFx('USD');
c._currentUser={uid:'jarda'};
ok('FIX-322 · druhý účet nevidí cizí připnuté měny', c.getPinnedFx().length===0);
c.togglePinFx('PLN');
ok('FIX-322 · a svoje si uloží', c.getPinnedFx().join()==='PLN');
c._currentUser={uid:'milan'};
ok('FIX-322 · první účet má pořád svoje', c.getPinnedFx().join()==='EUR,USD');
ok('FIX-322 · v úložišti jsou dva oddělené klíče',
   Object.keys(c._store).sort().join()==='ff_pinnedFx_jarda,ff_pinnedFx_milan');

// Migrace starého společného seznamu
c=mk({'ff_pinnedFx':'["CHF","GBP"]'}); c._currentUser={uid:'milan'};
ok('FIX-322 · staré připnuté měny se nezahodí', c.getPinnedFx().join()==='CHF,GBP');
ok('FIX-322 · starý společný klíč se smaže, ať se nešíří dál', !('ff_pinnedFx' in c._store));
c._currentUser={uid:'jarda'};
ok('FIX-322 · a druhý účet už je po migraci nezdědí', c.getPinnedFx().length===0);

// Odhlášený stav nesmí spadnout ani zapisovat pod cizí klíč
c=mk(); c._currentUser=null;
ok('FIX-322 · bez přihlášení nespadne', Array.isArray(c.getPinnedFx()));
c.togglePinFx('EUR');
ok('FIX-322 · bez přihlášení píše do vlastního klíče', 'ff_pinnedFx_local' in c._store);

// Odolnost
c=mk({'ff_pinnedFx_milan':'{rozbité json'}); c._currentUser={uid:'milan'};
ok('FIX-322 · poškozený zápis vrátí prázdno, ne pád', c.getPinnedFx().length===0);

// Nikde se kurzy nezapisují do Firebase (to by teprve bylo globální)
ok('FIX-322 · kurzy se nikam do databáze nezapisují',
   !/_set\(_ref|_update\(_ref/.test(src));
ok('FIX-322 · klíč nese uid', /ff_pinnedFx_\$\{uid\}/.test(src));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
