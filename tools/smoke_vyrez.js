/* smoke_vyrez.js — FIX-317: výdejní okénko jako povolovací seznam */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_vyrez.js');

const app=R('app.js');
const ctx=vm.createContext({console:{warn(){}}}); ctx.window=ctx;
vm.runInContext(app.slice(app.indexOf('const _FB_ZAKAZANE'), app.indexOf('window._fbSafeKeys')), ctx);
vm.runInContext(app.slice(app.indexOf('function _dwMetaVals(){'), app.indexOf('function _dwTxObj(){')), ctx);
vm.runInContext(app.slice(app.indexOf('function _shCatSkeleton('), app.indexOf('function _shTxObj(){')), ctx);

// Úložiště plné osobních věcí
vm.runInContext(`S = {
  shareSettings:{}, transactions:[], payTypes:[{id:1,name:'Karta'}],
  categories:[{id:9,name:'Zdraví',icon:'🏥',color:'#f00',type:'expense',limit:4000,
               coicopOverrides:{'Lékárna':6},poznamka:'tajné',subs:['Lékárna']}],
  debts:[{id:1,remaining:1000}], bank:{startBalance:5000}, wallets:[{id:1}],
  diary:{'2026-09-01':'dnes mi bylo zle'},
  calNotes:{'2026-09-02':'pohovor'}, workCal:{x:1},
  milestones:[{name:'rozvod'}], idleCfg:{a:1}, pristiCfg:{b:1},
  importHistory:[{f:'vypis.pdf'}], nakupList:[{name:'test'}], sablony:[{id:1}],
  noSyncKeys:['x'], reportSectors:{s:1}, assets:[], projects:[], receipts:[],
  birthdays:[], wishes:[]
};`, ctx);
const v = vm.runInContext('_shMetaVals()', ctx);

const zakazane=['diary','calNotes','workCal','milestones','idleCfg','pristiCfg',
                'importHistory','nakupList','sablony','noSyncKeys','reportSectors','shareSettings'];
zakazane.forEach(k=>ok(`FIX-317 · „${k}“ se do výřezu NEDOSTANE`, !(k in v)));

ok('FIX-317 · výřez má jen povolené klíče (10)', Object.keys(v).length===10);
ok('FIX-317 · deník se neobjeví ani zanořený nikde v datech',
   !JSON.stringify(v).includes('dnes mi bylo zle') && !JSON.stringify(v).includes('rozvod'));

// Kategorie jen jako kostra
const c=v.categories[0];
ok('FIX-317 · kategorie si nese jméno a ikonu (jinak by transakce neměly popis)',
   c.name==='Zdraví' && c.icon==='🏥' && c.id===9);
ok('FIX-317 · rozpočet kategorie se NEsdílí', !('limit' in c));
ok('FIX-317 · ruční COICOP zatřídění se NEsdílí', !('coicopOverrides' in c));
ok('FIX-317 · poznámka u kategorie se NEsdílí', !('poznamka' in c));
ok('FIX-317 · podkategorie zůstanou jako názvy', Array.isArray(c.subs) && c.subs[0]==='Lékárna');

// Přepínače pořád fungují
vm.runInContext("S.shareSettings={debts:false,bank:false,wallets:false};", ctx);
const vy = vm.runInContext('_shMetaVals()', ctx);
ok('FIX-317 · vypnuté Půjčky se odešlou prázdné', vy.debts.length===0);
ok('FIX-317 · vypnutý Zůstatek se vynuluje', vy.bank.startBalance===0);
ok('FIX-317 · vypnuté Peněženky se odešlou prázdné', vy.wallets.length===0);
ok('FIX-317 · kategorie a typy plateb zůstávají i tak (nutné k vykreslení)',
   vy.categories.length===1 && vy.payTypes.length===1);

// UI
const st=R('stats.js');
ok('FIX-317 · přepínač „Kategorie“ z UI zmizel', !/key:'categories', label:'🏷️ Kategorie'/.test(st));
ok('FIX-317 · přibyl chybějící přepínač Majetek', /key:'assets', label:'📈 Majetek'/.test(st));
ok('FIX-317 · uživateli se řekne, že vypnuté se NEODESÍLÁ', /vůbec neodešle/.test(st));
ok('FIX-317 · a co se nesdílí nikdy', /deník, poznámky v kalendáři, Životní mapa/.test(st));

// Komentář, který drží pravidlo naživu
ok('FIX-317 · v kódu je výslovný seznam toho, co se nesdílí',
   /ZÁMĚRNĚ SE NESDÍLÍ/.test(app));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
