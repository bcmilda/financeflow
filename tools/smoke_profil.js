/* smoke_profil.js — FIX-313 (viditelné UID + kopírování) · FIX-314 (avatar) */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_profil.js');

// ── FIX-314 · avatar: vědomá volba přebije výchozí fotku ──────────
{
  const app=R('app.js');
  const i=app.indexOf("const av = document.getElementById('sidebarAvatar');");
  const blok=app.slice(i, i+1400);
  ok('FIX-314 · emoji avatar se testuje PŘED fotkou',
     blok.indexOf('_userProfile?.avatar') < blok.indexOf('} else if(photo)'));
  ok('FIX-314 · fotka zůstává jako druhá volba', /\} else if\(photo\) \{/.test(blok));
  ok('FIX-314 · fallback 👤 zůstal', /id=sidebarAvatar>👤/.test(blok));

  // Chování: se zvoleným avatarem I s Google fotkou musí vyhrát avatar
  const vyber=(profil,user)=>{
    if(profil?.avatar) return 'emoji';
    if(profil?.photoURL||user?.photoURL) return 'foto';
    return 'placeholder';
  };
  ok('FIX-314 · Google fotka + zvolený avatar → vyhraje avatar',
     vyber({avatar:'🦊'},{photoURL:'https://g/x.jpg'})==='emoji');
  ok('FIX-314 · bez volby zůstává Google fotka',
     vyber({},{photoURL:'https://g/x.jpg'})==='foto');
  ok('FIX-314 · nic → placeholder', vyber({},{})==='placeholder');

  // FIX-320: obě dlaždice teď kreslí sdílený helper `avatar()`, ne dva
  //   samostatné výrazy – priorita se tím drží na jednom místě (SKILL 17).
  ok('FIX-314 · seznam členů používá sdílený helper avatar()',
     /const avatar = \(prof, user\) => prof\?\.avatar \? prof\.avatar/.test(app));
  ok('FIX-314 · helper dává přednost avataru před fotkou',
     app.indexOf('prof?.avatar ? prof.avatar') < app.indexOf('prof?.photoURL || user?.photoURL'));
  // TODO-233: ukládání profilu se přesunulo do ucet.js spolu se stránkou
  ok('FIX-314 · uložení profilu dá zpětnou vazbu',
     /showToast\('✅ Profil uložen'\)/.test(R('ucet.js')));
}

// ── FIX-313 · UID viditelné + spolehlivé kopírování ───────────────
{
  const st=R('stats.js');
  ok('FIX-313 · UID není schované pod rozbalovátkem', !/<details[\s\S]{0,200}Kopírovat ID/.test(st));
  ok('FIX-313 · UID má vlastní sekci s nadpisem', /Moje ID uživatele/.test(st));
  ok('FIX-313 · u ID je řečeno, že propojí jen jednu stranu', /propojí jen <strong>jedna strana<\/strong>|propojí jen <strong>jednu stranu<\/strong>|jen <strong>jedna strana<\/strong>/.test(st));
  ok('FIX-313 · kopírování má zálohu pro prostředí bez clipboard API',
     /function copyText\(text, hlaska\)/.test(st) && /document\.execCommand\('copy'\)/.test(st));
  ok('FIX-313 · úplné selhání skončí promptem, ne tichem', /prompt\('Zkopíruj ručně:'/.test(st));
  ok('FIX-313 · přímé volání clipboard.writeText už v UI není',
     !/onclick="navigator\.clipboard\.writeText/.test(st));

  // Chování copyText bez clipboard API
  const ctx=vm.createContext({}); ctx.window=ctx;
  let zkopirovano=null;
  ctx.navigator={};
  ctx.document={ createElement:()=>({style:{},select(){}}), body:{appendChild(){},removeChild(){}},
                 execCommand:(c)=>{ zkopirovano=c; return true; } };
  ctx.document.execCommand=(c)=>{ zkopirovano=c; return true; };
  ctx.showToast=()=>{ ctx._toast=true; };
  ctx.alert=()=>{}; ctx.prompt=()=>{};
  const i=st.indexOf('function copyText(');
  vm.runInContext(st.slice(i, st.indexOf('window.copyText=copyText;', i)), ctx);
  ctx.copyText('abc','ok');
  ok('FIX-313 · bez clipboard API se použije záloha a uživatel dostane hlášku',
     zkopirovano==='copy' && ctx._toast===true);
}

// ── TODO-239 · odeslat přes systémové sdílení ─────────────────────
{
  const st=R('stats.js');
  ok('TODO-239 · shareInvite používá Web Share API', /navigator\.share\(\{/.test(st));
  ok('TODO-239 · bez podpory se tlačítko vůbec nenabídne',
     /\$\{navigator\.share \? `<button[^`]*shareInvite/.test(st));
  ok('TODO-239 · i tak existuje fallback na kopírování',
     /if\(!navigator\.share\)\{ copyText\(url,'Odkaz zkopírován'\); return; \}/.test(st));
}

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
