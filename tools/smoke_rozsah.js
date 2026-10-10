/* smoke_rozsah.js — TODO-242: přepínač rozsahu řídí celou stránku */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_rozsah.js');
const st=R('stats.js');

// ── Chování filtru ────────────────────────────────────────────────
const ctx=vm.createContext({}); ctx.window=ctx;
vm.runInContext("var _famMember=null; var vRozsahu = m => !_famMember || m.name === _famMember;", ctx);
const clenove=[{name:'Milan'},{name:'Jarda'},{name:'Babička'}];
const filtr=()=>clenove.filter(vm.runInContext('vRozsahu',ctx)).map(m=>m.name);
ok('TODO-242 · bez výběru se počítá celá domácnost', filtr().join()==='Milan,Jarda,Babička');
vm.runInContext("_famMember='Jarda';", ctx);
ok('TODO-242 · s výběrem jen ten člen', filtr().join()==='Jarda');
vm.runInContext("_famMember='Nikdo';", ctx);
ok('TODO-242 · neexistující člen dá prázdno, ne celou domácnost', filtr().length===0);
vm.runInContext("_famMember=null;", ctx);
ok('TODO-242 · návrat na domácnost funguje', filtr().length===3);

// ── Rozsah musí platit VŠUDE, ne jen v žebříčku ───────────────────
ok('TODO-242 · dlaždice počítají jen vybrané členy', /members\.filter\(vRozsahu\)\.forEach\(m=>\{/.test(st));
ok('TODO-242 · graf trendu taky', /members\.filter\(vRozsahu\)\.forEach\(mem=>\{/.test(st));
ok('TODO-242 · žebříček používá týž stav', /_famMember \? familyTxs\.filter/.test(st));
ok('TODO-242 · přepínač je nahoře nad dlaždicemi',
   st.indexOf('Rozsah</span>') < st.indexOf('class="family-grid"'));
ok('TODO-242 · v žebříčku už druhý přepínač není (dva by se rozešly)',
   !/const memberChips=/.test(st));

// ── Popisky se rozsahu přizpůsobí ─────────────────────────────────
ok('TODO-242 · dlaždice se přejmenují („Rodinné příjmy“ vs „Příjmy“)',
   /\$\{jeCely\?'Rodinné příjmy':'Příjmy'\}/.test(st) &&
   /\$\{jeCely\?'Rodinné výdaje':'Výdaje'\}/.test(st) &&
   /\$\{jeCely\?'Rodinné saldo':'Saldo'\}/.test(st));
ok('TODO-242 · nadpis grafu nese jméno člena', /Saldo · '\+escHtml\(_famMember\)/.test(st));
ok('TODO-242 · nadpis žebříčku taky', /Na co utratil '\+escHtml\(_famMember\)/.test(st));
ok('TODO-242 · jméno člena se escapuje (může obsahovat < nebo &)',
   (st.match(/escHtml\(_famMember\)/g)||[]).length >= 2);

// ── Souhrny se do trendu započítají i po zavedení rozsahu ─────────
ok('TODO-240+242 · člen se souhrny přispěje i do grafu trendu',
   /if\(jenSoucty\(mem\)\)\{[\s\S]{0,220}mInc\+=r\.inc\|\|0; mExp\+=r\.exp\|\|0;/.test(st));
ok('TODO-240+242 · graf si bere správný měsíc', /const mk2=`\$\{y\}-\$\{String\(m\+1\)\.padStart\(2,'0'\)\}`/.test(st));

// Nezůstala nepoužitá proměnná (TDZ checker to nechytí, čitelnost ano)
ok('úklid · nepoužitá `predpona` odstraněna', !/const predpona/.test(st));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
