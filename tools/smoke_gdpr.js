/* smoke_gdpr.js — TODO-254 GDPR export · TODO-255 zrušení Stripu · TODO-256 náhrobky */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_gdpr.js');

const adm=R('admin.js'), uc=R('ucet.js'), wk=R('worker.js');
const rules=JSON.parse(R('database_rules.json').replace(/^\s*\/\/.*$/gm,''));

// ── TODO-254 · GDPR export ────────────────────────────────────────
ok('GDPR · export obsahuje uzly MIMO users/{uid} (v záloze nejsou)',
   /GDPR_UZLY_MIMO = \['premiumLog'/.test(adm));
ok('GDPR · a i ty uvnitř podstromu', /'data','profile','settings','premium'/.test(adm));
ok('GDPR · včetně náhrobku u smazaných účtů', /deletedAccounts\/\$\{uid\}/.test(adm));
ok('GDPR · komunitní záznamy se hledají pod PSEUDONYMEM, ne uid',
   /community\/\$\{klic\}\/users\/\$\{pid\}/.test(adm));
ok('GDPR · bez pseudonymu se vysvětlí, proč tam nic není',
   /nepřispívá/.test(adm));
ok('GDPR · odpověď obsahuje účel, příjemce a dobu uchování (ne jen data)',
   /ucel_zpracovani/.test(adm) && /prijemci/.test(adm) && /doba_uchovani/.test(adm));
ok('GDPR · uvádí právní základ', /Čl\. 15 GDPR/.test(adm));
ok('GDPR · selhání jednoho uzlu nezastaví celý export',
   /catch \(e\) \{ return \{ _chyba/.test(adm));
ok('GDPR · export smí jen admin', /if \(!isAdmin\(\)\) \{ alert\('Jen pro admina/.test(adm));
ok('GDPR · v adminu je na to tlačítko a lhůta 1 měsíc',
   /adminGdprExport\(document\.getElementById\('gdprUid'\)/.test(adm) && /1 měsíc/.test(adm));

// ── TODO-256 · náhrobky ───────────────────────────────────────────
const da=rules.rules.deletedAccounts;
ok('náhrobek · zapsat smí uživatel jen sám sebe', /auth\.uid === \$uid/.test(da.$uid['.write']));
ok('náhrobek · a jen jednou (nelze přepsat)', /!data\.exists\(\)/.test(da.$uid['.write']));
ok('náhrobek · číst smí jen admin', da['.read'].includes('LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'));
ok('náhrobek · žije MIMO users/ (přežije smazání podstromu)',
   !!rules.rules.deletedAccounts && !rules.rules.users.$uid.deletedAccounts);
ok('náhrobek · obsahuje jen uid, datum a hash – žádná data',
   Object.keys(da.$uid).filter(k=>!k.startsWith('.')).sort().join()==='at,emailHash,melPredplatne,stripeZrusen');
ok('náhrobek · e-mail se ukládá jen jako hash', /crypto\.subtle\.digest\('SHA-256'/.test(uc));
ok('náhrobek · hash je z normalizovaného e-mailu (velikost písmen)', /trim\(\)\.toLowerCase\(\)/.test(uc));
ok('náhrobek · selhání zápisu nezastaví mazání', /catch \(e\) \{ console\.warn\('\[smazání\] náhrobek:'/.test(uc));
ok('admin · seznam smazaných účtů + upozornění na opakování',
   /function renderDeletedAccounts\(\)/.test(adm) && /tentýž e-mail opakovaně/.test(adm));
ok('admin · seznam se načte při otevření záložky Údržba',
   /tab==='udrzba'\)\{ if\(typeof renderDeletedAccounts/.test(adm));

// ── TODO-255 · zrušení předplatného ───────────────────────────────
ok('Stripe · worker má endpoint /cancel-subscription', /pathname === '\/cancel-subscription'/.test(wk));
ok('Stripe · uid se bere z OVĚŘENÉHO tokenu, ne z těla požadavku',
   /uid VÝHRADNĚ z ověřeného tokenu/.test(wk) && /vd\.users\?\.\[0\]\?\.localId/.test(wk));
ok('Stripe · ruší se k konci období, ne okamžitě bez vrácení peněz',
   /cancel_at_period_end=true/.test(wk));
ok('Stripe · zápis do auditu premiumLog (ten přežije smazání účtu)',
   /premiumLog\/\$\{uid\}[\s\S]{0,200}cancelOnDelete/.test(wk));
ok('Stripe · audit je bonus, ne podmínka', /audit je bonus, ne podmínka/.test(wk));
ok('Stripe · když se zrušení nepovede, uživatel se to DOZVÍ',
   uc.includes('Předplatné se nepodařilo zrušit automaticky') && uc.includes('bude účtovat dál'));
ok('Stripe · neúspěch nezastaví mazání účtu',
   uc.indexOf('stripeZrusen = false') < uc.indexOf('users/${me.uid}`), null)'));
ok('Stripe · neplatící se na worker vůbec neptá', /if \(platici\) \{/.test(uc));

// ── Datum založení účtu ───────────────────────────────────────────
ok('profil · datum založení se bere z premium.createdAt',
   /users\/\$\{uid\}\/premium\/createdAt/.test(uc));
ok('profil · ukazuje i „před X dny“', /před \$\{dni\} dny/.test(uc));
ok('profil · chybějící údaj dá pomlčku, ne pád', /el\.textContent = '—'/.test(uc));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
