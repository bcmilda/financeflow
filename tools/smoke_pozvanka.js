/* smoke_pozvanka.js — FIX-311 (výřez shared) + FIX-312 (oboustranná pozvánka) */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_pozvanka.js');

// ── FIX-311 · shared se píše podle SPRÁVNÉHO seznamu ──────────────
{
  const app=R('app.js');
  ok('FIX-311 · _hasPartners se ptá na to, komu jsem dal přístup',
     /_myGrants && _myGrants\.size/.test(app));
  ok('FIX-311 · _myGrants se plní z users/{já}/partners',
     /_myGrants\.clear\(\); partnerUids\.forEach\(u=>_myGrants\.add\(u\)\)/.test(app));
  ok('FIX-311 · prázdný uzel seznam vyprázdní (ne že zůstane starý)',
     /if\(!snap\.exists\(\)\) \{\s*_myGrants\.clear\(\);/.test(app));
  // FIX-319 vložil mezi ně načtení členů domácnosti, takže je mezera delší
  ok('FIX-311 · výřez vzniká už po přihlášení, ne až po prvním uložení',
     /loadPartners[\s\S]{0,2000}await _shWrite\(user\.uid\)/.test(app));
  ok('FIX-311 · zápis výřezu je side-write ve vlastním try/catch',
     /try \{ if\(typeof _shWrite==='function'\) await _shWrite\(user\.uid\); \}\s*\r?\n\s*catch/.test(app));

  // Chování: kdo jen udělil přístup (a nic nečte), MUSÍ výřez psát
  // `let` v sandboxu není vlastnost kontextu → sáhneme dovnitř přes runInContext
  const i=app.indexOf('function _hasPartners()');
  const ctx=vm.createContext({}); ctx.window=ctx;
  vm.runInContext('var partnerData={}; var _myGrants=new Set();'+
    app.slice(i, app.indexOf('window._myGrants', i)), ctx);
  const zkus=(grants,pd)=>vm.runInContext(
    `_myGrants=new Set(${JSON.stringify(grants)}); partnerData=${JSON.stringify(pd)}; _hasPartners();`, ctx);
  ok('FIX-311 · jen udělený přístup (žádné čtení) → výřez se píše', zkus(['partner'],{}) === true);
  ok('FIX-311 · jen čtení cizích dat → výřez se taky píše', zkus([],{x:1}) === true);
  ok('FIX-311 · nikdo nikde → výřez se nepíše (zbytečný zápis)', zkus([],{}) === false);
}

// ── FIX-312 · oboustranná pozvánka ────────────────────────────────
{
  const sh=R('share.js'), st=R('stats.js');
  ok('FIX-312 · odkaz nese token', /params\.get\('t'\)/.test(sh) && /&t=\$\{token\}/.test(st));
  ok('FIX-312 · s tokenem se zapíše i do seznamu zvoucího',
     /users\/\$\{partnerOfUid\}\/partners\/\$\{myUid\}`\)[\s\S]{0,160}token: inviteToken/.test(sh));
  ok('FIX-312 · vlastní strana se zapisuje vždy, i bez tokenu',
     sh.indexOf('users/${myUid}/partners/${partnerOfUid}') < sh.indexOf('if(inviteToken)'));
  ok('FIX-312 · zápis do cizího je ve vlastním try/catch (nesmí shodit ten můj)',
     /catch\(e\)\{ console\.warn\('\[pozvánka\] token neprošel:'/.test(sh));
  ok('FIX-312 · uživateli se řekne, jestli je propojení oboustranné',
     /Propojeno – uvidíte na sebe navzájem/.test(sh) && /ať ti pošle pozvánku/.test(sh));
  ok('FIX-312 · token je náhodný a jde zneplatnit',
     /crypto\?\.randomUUID/.test(st) && /function revokeInvite\(token\)/.test(st));
  // FIX-313: formulace se změnila spolu s tím, že UID vylezlo zpátky na světlo
  ok('FIX-312 · ruční ID zůstává, ale označené jako jednostranné',
     /Moje ID uživatele/.test(st) && /propojí jen <strong>jedna strana<\/strong>/.test(st));
}

// ── FIX-312 · pravidla ────────────────────────────────────────────
{
  const rules=JSON.parse(R('database_rules.json').replace(/^\s*\/\/.*$/gm,''));
  const pid=rules.rules.users.$uid.partners.$pid;
  ok('pravidla · pozvaný smí zapsat sám sebe jen s platným tokenem',
     /auth\.uid === \$pid && !data\.exists\(\) && newData\.exists\(\)/.test(pid['.write']) &&
     /invites'\)\.child\(newData\.child\('token'\)\.val\(\)\)\.val\(\) === true/.test(pid['.write']));
  ok('pravidla · vlastník píše dál bez omezení', /auth\.uid === \$uid \|\|/.test(pid['.write']));
  ok('pravidla · cizí zápis nesmí PŘEPSAT existující záznam (!data.exists)',
     pid['.write'].includes('!data.exists()'));
  ok('pravidla · tvar zapsané hodnoty je omezený', /newData\.hasChildren\(\['token'\]\)/.test(pid['.validate']));
  ok('pravidla · uzel invites je jen pro vlastníka',
     rules.rules.users.$uid.invites['.read'] === 'auth.uid === $uid');
  ok('pravidla · token musí být boolean (ne úložiště čehokoli)',
     rules.rules.users.$uid.invites.$token['.validate'] === 'newData.isBoolean()');
  ok('pravidla · čtení /shared pořád vyžaduje záznam v partners',
     /partners'\)\.child\(auth\.uid\)\.exists\(\)/.test(rules.rules.users.$uid.shared['.read']));
}

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
