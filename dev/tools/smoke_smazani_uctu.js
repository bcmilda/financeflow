// S25 (v11.45) – smazání účtu podle požadavků Google Play: přihlašovací účet (Firebase Auth)
// se maže spolu s daty a existuje veřejná webová stránka s postupem smazání.
const fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c)=>{console.log(c?'  ✅':'  ❌',n);if(!c)bad++;};
const fb=R('firebase.js','../js/firebase.js'),uc=R('ucet.js','../js/ucet.js'),pg=R('smazani-uctu.html','../smazani-uctu.html'),lg=R('legal.html','../legal.html'),ix=R('index.html','../index.html');
console.log('── S25 · smazání účtu ──');
t('firebase.js: _deleteAuthUser maže přihlašovací účet a rozliší „relogin“',/window\._deleteAuthUser = async/.test(fb)&&fb.includes('deleteUser(auth.currentUser)')&&fb.includes("'auth/requires-recent-login' ? 'relogin'"));
const iData=uc.indexOf('await _set(_ref(_db, `users/${me.uid}`), null);'),iAuth=uc.indexOf('await window._deleteAuthUser()');
t('Můj účet → Smazat účet: přihlašovací účet se maže AŽ po datech (bez přihlášení by data nešla smazat)',iData>0&&iAuth>iData);
t('hláška rozliší smazáno / znovu se přihlas / napiš nám',uc.includes("authStav === 'relogin'")&&uc.includes('info@financeflow.cz a smažeme ho ručně'));
t('po smazaném přihlašovacím účtu se už neptá „Odhlásit se?“',uc.includes("if (authStav !== 'ok' && typeof window._signOut === 'function') window._signOut();"));
t('stránka: název aplikace, postup v aplikaci, e-mailová žádost bez aplikace',pg.includes('Jak smazat účet FinanceFlow')&&pg.includes('Nevratné akce')&&pg.includes('SMAZAT')&&pg.includes('mailto:info@financeflow.cz'));
t('stránka: co se smaže, co zůstane a jak dlouho',pg.includes('id="co-se-smaze"')&&pg.includes('id="co-zustane"')&&pg.includes('Nejdéle 30 dnů')&&pg.includes('3 roky'));
t('odkazy na stránku z legal.html i z patičky webu',lg.includes('href="/smazani-uctu.html"')&&ix.includes('href="/smazani-uctu.html"'));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
