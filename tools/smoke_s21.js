/* smoke_s21.js — FIX-303 až FIX-307
 * Likvidita kategorií · den výplaty · Stripe idempotence · pseudonym komunity */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_s21.js');

// ── FIX-303 · assetCatLiq: pořadí vzorů ───────────────────────────
{
  const src=R('assets.js');
  const ctx=vm.createContext({}); ctx.window=ctx;
  ctx.S={categories:[
    {id:1,name:'Penzijní spoření'}, {id:2,name:'Spořicí účet'},
    {id:3,name:'Doplňkové penzijní spoření'}, {id:4,name:'Důchodové připojištění'},
    {id:5,name:'Stavební spoření'}, {id:6,name:'ETF portfolio'},
    {id:7,name:'Termínovaný vklad'}, {id:8,name:'Virtuální přesun'},
    {id:9,name:'Penzijní'}, {id:10,name:'Rezerva'},
  ]};
  const i=src.indexOf('function assetCatLiq(');
  vm.runInContext(src.slice(i, src.indexOf('// Do které sekce', i)), ctx);
  const liq=id=>ctx.assetCatLiq(id);
  ok('FIX-303 · „Penzijní spoření“ je dlouhodobé, ne rezerva', liq(1)==='long');
  ok('FIX-303 · „Doplňkové penzijní spoření“ taky', liq(3)==='long');
  ok('FIX-303 · „Důchodové připojištění“ taky', liq(4)==='long');
  ok('FIX-303 · žádná regrese: spořicí účet zůstává rezervou', liq(2)==='reserve');
  ok('FIX-303 · žádná regrese: stavební spoření a termínovaný vklad', liq(5)==='reserve' && liq(7)==='reserve');
  ok('FIX-303 · žádná regrese: ETF je mid, virtuální přesun mimo', liq(6)==='mid' && liq(8)==='virtual');
  ok('FIX-303 · ruční nastavení liq má přednost před názvem',
     (ctx.S.categories.push({id:11,name:'Penzijní spoření',liq:'reserve'}), liq(11)==='reserve'));
}

// ── FIX-304 · den výplaty 1–31 a ořez na délku měsíce ─────────────
{
  const onb=R('onboarding.js'), set=R('settings.js'), pro=R('projects.js');
  ok('FIX-304 · onboarding nabízí 31 dní', /Array\.from\(\{length:31\}/.test(onb));
  ok('FIX-304 · Nastavení nabízí 31 dní',  /Array\.from\(\{length:31\}/.test(set));
  ok('FIX-304 · dny nad 28 mají vysvětlivku',
     onb.includes('v kratším měsíci poslední') && set.includes('v kratším měsíci poslední'));
  ok('FIX-304 · nikde nezůstal strop 28 u kotvy výplaty', !/Math\.min\(anchor(\|\|1)?,\s*28\)/.test(pro));
  // Kotva 31 musí v únoru spadnout na 28./29., ne přetéct do března
  const mk=(y,m,anchor)=>{const dim=new Date(y,m+1,0).getDate();return new Date(y,m,Math.min(anchor,dim));};
  ok('FIX-304 · kotva 31 v únoru 2026 = 28. 2.', mk(2026,1,31).getDate()===28 && mk(2026,1,31).getMonth()===1);
  ok('FIX-304 · kotva 31 v lednu = 31. 1.',      mk(2026,0,31).getDate()===31);
  ok('FIX-304 · kotva 31 v dubnu = 30. 4.',      mk(2026,3,31).getDate()===30);
}

// ── FIX-305 · druhé kliknutí na platební odkaz ────────────────────
{
  const don=R('donate.js'), pre=R('premium.js');
  ok('FIX-305 · startPremiumSubscription kontroluje aktivní Premium',
     /function startPremiumSubscription[\s\S]{0,900}_premiumStatus[\s\S]{0,300}st\.until > Date\.now\(\)/.test(don));
  ok('FIX-305 · kontrola je PŘED window.open (jinak popup blocker)',
     don.indexOf("st.until > Date.now()") < don.indexOf('window.open(url'));
  ok('FIX-305 · kontrola je synchronní, bez await',
     !/await[^\n]{0,80}premium[\s\S]{0,200}window\.open\(url/i.test(don));
  ok('FIX-305 · goPremium neotevře výběr tarifu aktivnímu předplatiteli',
     /function goPremium\(\)[\s\S]{0,500}_premiumStatus\.until > Date\.now\(\)[\s\S]{0,200}return;/.test(pre));
}

// ── FIX-306 · Stripe webhook: idempotence ─────────────────────────
{
  const w=R('worker.js');
  ok('FIX-306 · founderCount používá ETag compare-and-set',
     /X-Firebase-ETag/.test(w) && /'if-match': etag/.test(w));
  ok('FIX-306 · kolize (412) se opakuje, jiná chyba vyhodí výjimku',
     /if \(w\.status !== 412\) throw/.test(w));
  ok('FIX-306 · read-modify-write bez ochrany už v kódu není',
     !/const cur = await \(await fetch\(url\)\)\.json\(\) \|\| 0;/.test(w));
  ok('FIX-306 · event se zamlouvá přes if-match: null_etag',
     /claimStripeEvent[\s\S]{0,400}'if-match': 'null_etag'/.test(w));
  ok('FIX-306 · duplicitní doručení se přeskočí s 200',
     /duplicitní doručení, přeskočeno/.test(w) && /if \(!prvni\) return json/.test(w));
  ok('FIX-306 · zámek se při chybě uvolní, ať může Stripe zopakovat',
     /releaseStripeEvent\(eventId, env\)/.test(w) && /method: 'DELETE'/.test(w));
  ok('FIX-306 · zamluvení běží PŘED jakýmkoli zápisem premia',
     w.indexOf('claimStripeEvent(eventId, env)') < w.indexOf("event.type === 'checkout.session.completed'"));
  ok('FIX-306 · id eventu se sanitizuje (nesmí do cesty projít lomítko)',
     /replace\(\/\[\^A-Za-z0-9_-\]\/g, ''\)/.test(w));
}

// ── FIX-307 · pseudonym místo uid ─────────────────────────────────
{
  const h=R('helpers.js'), a=R('admin.js'), st=R('settings.js'), rules=R('database_rules.json');
  ok('FIX-307 · existuje getCommunityId s cache', /function getCommunityId\(\)/.test(h) && /_communityIdCache/.test(h));
  ok('FIX-307 · pseudonym je náhodný, neodvozený z uid',
     /crypto\?\.randomUUID/.test(h) && !/communityId.*=.*uid/.test(h));
  ok('FIX-307 · publishCommunityStats publikuje pod pseudonymem',
     /users\/\$\{pid\}/.test(a) && !/community\/\$\{monthKey\}\/users\/\$\{uid\}/.test(a));
  ok('FIX-307 · uploadCoicopToFirebase taky (druhá cesta z FIX-279)',
     /users\/\$\{pid\}/.test(h) && !/community\/\$\{monthKey\}\/users\/\$\{uid\}/.test(h));
  ok('FIX-307 · starý uid-klíčovaný záznam se po migraci maže',
     /dropLegacyCommunityRecord/.test(h) && /dropLegacyCommunityRecord/.test(a));
  ok('FIX-307 · purge maže OBOJÍ – pseudonym i staré uid',
     /updates\[`community\/\$\{key\}\/users\/\$\{uid\}`\] = null/.test(st) &&
     /pid !== uid\) updates\[`community\/\$\{key\}\/users\/\$\{pid\}`\] = null/.test(st));
  ok('FIX-307 · pravidla váží zápis na vlastnictví pseudonymu',
     /communityId'\)\.val\(\) === \$pid/.test(rules));
  ok('FIX-307 · pravidla povolují u uid-klíče jen SMAZÁNÍ, ne zápis',
     /auth\.uid === \$pid && !newData\.exists\(\)/.test(rules));
  // Chybějící pseudonym nesmí vést k publikaci pod uid
  ok('FIX-307 · bez pseudonymu se nepublikuje vůbec',
     /if \(!pid\) return;/.test(a) && /if \(!pid\) return;/.test(h));
}

// ── TODO-236 · onboarding → checklist ─────────────────────────────
{
  const onb=R('onboarding.js'), ui=R('ui.js'), pre=R('premium.js');
  ok('TODO-236 · přeskočení nastaví onboardingSkipped', /onboardingSkipped = true/.test(onb));
  ok('TODO-236 · vyplnění příznak zase shodí', /onboardingSkipped = false/.test(onb));
  ok('TODO-236 · modal jde otevřít z checklistu', /window\.openOnboardingModal = openOnboardingModal/.test(onb));
  ok('TODO-236 · checklist má krok „Dokonči úvodní nastavení“',
     /Dokonči úvodní nastavení[\s\S]{0,200}openOnboardingModal\(\)/.test(ui));
  ok('TODO-236 · kdo onboardingem neprošel, krok má rovnou hotový (undefined !== true)',
     /done: st\.onboardingSkipped !== true/.test(ui));
  ok('TODO-236 · checklist má krok na dotaz po půjčce', /Řekni, jestli máš půjčku/.test(ui));
  // Checklist a skóre musí stát na TÉŽE podmínce, jinak si budou protiřečit
  ok('TODO-236 · podmínka je shodná s _debtsKnown v premium.js',
     /done: \(D\.debts\|\|\[\]\)\.length > 0 \|\| st\.hasDebts === false \|\| st\.hasDebts === true/.test(ui) &&
     /debts\.length>0[\s\S]{0,120}_settings\.hasDebts === false/.test(pre));
  ok('TODO-236 · přeskočení překreslí stránku, ať se krok objeví hned',
     /onboardingSkip[\s\S]{0,600}renderPage\(\)/.test(onb));
}

// ── Automatická likvidita je nově vidět ve správě kategorií ───────
{
  const as=R('assets.js'), st=R('stats.js'), html=R('app.html');
  ok('odhad podle názvu je sdílený helper, ne kopie', /function assetLiqFromName\(name\)/.test(as) &&
     /return assetLiqFromName\(cc\.name\);/.test(as));
  ok('nápověda ukazuje, co odhad vybral', /function catLiqHint\(\)/.test(st) &&
     /assetLiqFromName\(nazev\)/.test(st));
  ok('nápověda se přepočítá při psaní názvu i změně výběru',
     /id="catName" oninput="typeof catLiqHint/.test(html) && /id="catLiq" onchange="typeof catLiqHint/.test(html));
  ok('ruční volba nápovědu o odhadu neukazuje (nemátla by)',
     /if \(!sel \|\| sel\.value\) \{ el\.innerHTML = zaklad; return; \}/.test(st));
}

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
