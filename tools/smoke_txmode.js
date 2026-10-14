/* smoke_txmode.js — TODO-240: tři úrovně sdílení transakcí */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_txmode.js');

const app=R('app.js');
const ctx=vm.createContext({console}); ctx.window=ctx;
ctx.isTransferTx = t => !!(t && t.transferId);
ctx.txCZK = (t,D) => (t.cur==='EUR'?25:1)*(t.amount||t.amt||0);
vm.runInContext('var S={};', ctx);
const i=app.indexOf('const TX_SHARE_MODES');
vm.runInContext(app.slice(i, app.indexOf('async function _shWrite(')).replace(/function _dwTxObj[\s\S]*?\n\}/,''), ctx);
vm.runInContext(app.slice(app.indexOf('function _dwTxObj(){'), app.indexOf('// ── Výdejní okénko')), ctx);

// ── Překlad starého zápisu ────────────────────────────────────────
const m = v => vm.runInContext(`txShareMode(${JSON.stringify(v)})`, ctx);
ok('TODO-240 · staré `false` → nesdílím', m({transactions:false})==='off');
ok('TODO-240 · staré `true` → podrobné (nikomu se nic nezmění)', m({transactions:true})==='full');
ok('TODO-240 · chybějící hodnota → podrobné', m({})==='full');
ok('TODO-240 · nové režimy projdou', m({transactions:'sums'})==='sums' && m({transactions:'off'})==='off');
ok('TODO-240 · nesmysl spadne na bezpečné „full“ (ne na pád)', m({transactions:'nesmysl'})==='full');

// ── Data ──────────────────────────────────────────────────────────
vm.runInContext(`S = { shareSettings:{transactions:'sums'}, transactions:[
  {id:1,date:'2026-08-03',type:'income', amount:40000, catId:'plat'},
  {id:2,date:'2026-08-10',type:'expense',amount:1200,  catId:'jidlo'},
  {id:3,date:'2026-08-11',type:'expense',amount:100, cur:'EUR', catId:'jidlo'},
  {id:4,date:'2026-08-12',type:'expense',amount:500,  catId:'jidlo', transferId:'x'},
  {id:5,date:'2026-08-13',type:'expense',amount:900,  catId:'jidlo', splitParent:true},
  {id:6,date:'2026-08-14',type:'expense',amount:700,  catId:'jidlo', isBalancing:true},
  {id:7,date:'2026-07-09',type:'expense',amount:3000, catId:'jidlo'},
]};`, ctx);

const sums = vm.runInContext('_shCatSums()', ctx);
ok('TODO-240 · součty se dělí po měsících', Object.keys(sums).sort().join()==='2026-07,2026-08');
ok('TODO-240 · a po kategoriích', Object.keys(sums['2026-08']).sort().join()==='jidlo,plat');
ok('TODO-240 · cizí měna přes txCZK, ne nominál', sums['2026-08'].jidlo.exp === 1200+2500);
ok('TODO-240 · přesun, rozpad ani vyrovnání se nepočítají', sums['2026-08'].jidlo.n === 2);
ok('TODO-240 · příjmy zvlášť od výdajů', sums['2026-08'].plat.inc===40000 && sums['2026-08'].plat.exp===0);

const tx = vm.runInContext('_shTxObj()', ctx);
ok('TODO-240 · v režimu „souhrny“ se jednotlivé transakce NEODEŠLOU', Object.keys(tx).length===0);
ok('TODO-240 · a v součtech není nic, z čeho by šlo poznat co kdo koupil',
   !JSON.stringify(sums).includes('date') && !JSON.stringify(sums).includes('name'));

vm.runInContext("S.shareSettings.transactions='full';", ctx);
ok('TODO-240 · v režimu „podrobné“ transakce odejdou', Object.keys(vm.runInContext('_shTxObj()',ctx)).length===7);
ok('TODO-240 · a součty se pak neposílají (byla by to duplicita)', vm.runInContext('_shCatSums()',ctx)===null);

vm.runInContext("S.shareSettings.transactions='off';", ctx);
ok('TODO-240 · v režimu „nesdílím“ neodejde nic',
   Object.keys(vm.runInContext('_shTxObj()',ctx)).length===0 && vm.runInContext('_shCatSums()',ctx)===null);

// ── Zápis ─────────────────────────────────────────────────────────
ok('TODO-240 · součty jsou i v přírůstkovém zápisu (jinak by zamrzly)',
   /updates\['catSums'\] = sums \|\| null/.test(app));
ok('TODO-240 · při přepnutí režimu se starý agregát smaže', /sums \|\| null/.test(app));
ok('TODO-240 · režim se do výřezu posílá taky', /updates\['txMode'\] = rezim/.test(app));
ok('TODO-240 · signatury se resetují při odhlášení', /sumSig:'', mode:null/.test(app));

// ── UI ────────────────────────────────────────────────────────────
const st=R('stats.js');
ok('TODO-240 · Transakce už nejsou mezi obyčejnými přepínači',
   !/key:'transactions', label:'💳 Transakce'/.test(st));
ok('TODO-240 · místo nich tři tlačítka', /updateShareSetting\('transactions','\$\{o\.v\}'\)/.test(st));
ok('TODO-240 · u každého režimu je vysvětlené, co partner uvidí',
   /jen součty za kategorie a měsíc/.test(st) && /každou transakci/.test(st));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
