/* smoke_pohled.js — FIX-320: přepínání profilů zrušeno pro běžné uživatele */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_pohled.js');

const app=R('app.js'), adm=R('admin.js');

// ── Chování: kdo smí přepnout pohled ──────────────────────────────
const sandbox=()=>{
  const ctx=vm.createContext({console:{warn(){}}}); ctx.window=ctx;
  ctx.partnerData={cizi:{profile:{displayName:'Jarda'}}};
  ctx.document={getElementById:()=>null};
  const i=app.indexOf('function adminViewAs(');
  vm.runInContext('var viewingUid=null; function renderPage(){} function updateReadonlyUI(){}'
    + app.slice(i, app.indexOf('window.adminViewAs')), ctx);
  return ctx;
};
let c=sandbox(); c._currentUser={uid:'bezny'};
c.adminViewAs('cizi');
ok('FIX-320 · běžný uživatel pohled NEPŘEPNE', vm.runInContext('viewingUid',c)===null);
ok('FIX-320 · a funkce to přizná návratovou hodnotou', c.adminViewAs('cizi')===false);

c=sandbox(); c._currentUser={uid:'admin'};
vm.runInContext('function isAdmin(){return true;}', c);
ok('FIX-320 · admin pohled přepnout smí', c.adminViewAs('cizi')===true
   && vm.runInContext('viewingUid',c)==='cizi');

c=sandbox(); c._currentUser={uid:'bezny'};
const i2=app.indexOf('function switchToPartner(');
vm.runInContext('function showToast(m){window._t=m;} function showPage(p){window._p=p;}'
  + app.slice(i2, app.indexOf('function switchToOwnData(')), c);
c.switchToPartner('cizi');
ok('FIX-320 · starý odkaz běžného uživatele odvede do Rodinného souhrnu',
   c._p==='rodina' && vm.runInContext('viewingUid',c)===null);

// ── Zdrojový kód ──────────────────────────────────────────────────
ok('FIX-320 · seznam členů už nemá onclick na přepnutí',
   !/onclick="switchToPartner\('\$\{uid\}'\)"/.test(app));
ok('FIX-320 · odznak „Prohlíží“ ze seznamu zmizel', !/badge-view">\$\{viewingUid===uid/.test(app));
ok('FIX-320 · místo něj se ukazuje, jestli data dorazila', /const mam = !!\(p && p\.data\)/.test(app));
ok('FIX-320 · seznam odkáže na Rodinný souhrn', /Rodinném souhrnu<\/a>/.test(app));
ok('FIX-320 · admin používá isAdmin(), ne vlastní kopii UID (SKILL 17)',
   /typeof isAdmin === 'function' && isAdmin\(\)/.test(app) &&
   !/LNEC8VNB2QPwIv6WWQ9lqgR4O5v1/.test(app));
ok('FIX-320 · adminViewUserAs v admin.js pořád existuje', /async function adminViewUserAs\(uid\)/.test(adm));

// Ochranné podmínky nad cizími daty musí platit dál
ok('FIX-320 · zápis nad cizími daty zůstává zakázaný',
   /if \(typeof viewingUid !== 'undefined' && viewingUid\) return;/.test(app));
ok('FIX-320 · zálohu ani obnovu nad cizími daty nelze spustit',
   /Nelze zálohovat cizí data/.test(app) && /Nelze obnovovat cizí data/.test(app));
ok('FIX-320 · getData nad partnerem funguje dál (admin ho potřebuje)',
   /if\(viewingUid && partnerData\[viewingUid\]\)/.test(app));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
