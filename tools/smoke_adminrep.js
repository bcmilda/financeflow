// FinanceFlow · v10.74 · tools/smoke_adminrep.js · 2026-09-16
// S22 · Admin rozhraní pro hlášení účtenek + oprava pořadí diagnostiky skriptů.
const fs=require('fs');
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n);}catch(e){fails++;console.log('  ❌',n,'→',e.message);}};
const assert=(c,m)=>{if(!c)throw new Error(m);};
const adm=fs.readFileSync('admin.js','utf8');
const html=fs.readFileSync('app.html','utf8');

console.log('── FIX · _ffScriptFail is not defined ──');
check('diagnostika stojí PŘED úplně prvním lokálním skriptem',()=>{
  const diag = html.indexOf('window._ffMissingScripts');
  const prvni = html.search(/<script src="js\/[a-z0-9_-]+\.js\?v=/);
  assert(diag >= 0, 'diagnostika chybí');
  assert(diag < prvni, 'diagnostika je až za prvním skriptem – onerror vystřelí do prázdna');
});
check('volání v onerror je obalené, ať nespadne na ReferenceError',()=>{
  const holé = (html.match(/onerror="_ffScriptFail\(/g)||[]).length;
  assert(holé === 0, holé+' skriptů volá funkci přímo');
  assert(/onerror="window\._ffScriptFail&&window\._ffScriptFail\(/.test(html), 'chybí obrana');
});
check('hlídané jsou všechny lokální skripty',()=>{
  const celkem=(html.match(/<script src="js\//g)||[]).length;
  const hlidane=(html.match(/onerror="window\._ffScriptFail/g)||[]).length;
  assert(celkem>0 && celkem===hlidane, hlidane+' z '+celkem);
});

console.log('\n── Admin: hlášení účtenek ──');
check('záložka existuje a je napojená',()=>{
  assert(/atab-reports/.test(adm),'chybí záložka');
  assert(/'reports'\]\.forEach/.test(adm) || /,'reports'[,\]]/.test(adm),'není v seznamu záložek');   // S25 v11.50: za ní přibyla 'uloziste'
  assert(/if\(tab==='reports'\)/.test(adm),'přepnutí nic nevykreslí');
});
check('čte se celý uzel receipt_reports, ne jen vlastní podstrom',()=>{
  assert(/receipt_reports\.json\?auth=/.test(adm),'špatná cesta');
});
check('řadí se podle VELIKOSTI ROZDÍLU, ne podle času',()=>{
  assert(/sort\(\(a,b\)=>Math\.abs\(b\.rozdil\|\|0\)-Math\.abs\(a\.rozdil\|\|0\)\)/.test(adm),
    'řazení podle rozdílu chybí – největší rozpory by zapadly');
});
check('seskupuje podle obchodu (opakovaný řetězec = chyba promptu)',()=>{
  assert(/podleObchodu/.test(adm),'chybí přehled podle obchodu');
});
check('fotka se ukáže až na kliknutí, ne rovnou v seznamu',()=>{
  assert(/_rrFoto === z\._id/.test(adm),'fotka se zobrazuje bez vyžádání');
  assert(/rrToggleDetail/.test(adm),'chybí rozbalení');
});
check('Permission denied vysvětlí, že chybí pravidla',()=>{
  assert(/receipt_reports<\/code> – nasazuje se do Firebase Console/.test(adm),
    'admin by nevěděl, že zapomněl nasadit pravidla');
});
check('prázdný stav vysvětlí, odkud se hlášení berou',()=>{
  assert(/Zatím žádné hlášení/.test(adm),'chybí prázdný stav');
  assert(/hlásí z karty účtenky/.test(adm),'neřekne, odkud hlášení chodí');
});
check('text se escapuje (poznámka je uživatelský vstup)',()=>{
  assert(/function _rrEsc/.test(adm),'chybí escapování');
  assert(/_rrEsc\(z\.poznamka\)/.test(adm),'poznámka se nevkládá bezpečně');
});
check('v šabloně nezůstal rozbitý kód',()=>{
  assert(!/chibi/.test(adm),'zbytek poškozené šablony');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ ADMIN HLÁŠENÍ OVĚŘENO');
process.exit(fails?1:0);
