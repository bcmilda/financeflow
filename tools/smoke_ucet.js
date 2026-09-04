/* smoke_ucet.js — TODO-233: stránka Můj účet nahradila modal */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_ucet.js');

const uc=R('ucet.js'), app=R('app.js'), html=R('app.html'), set=R('settings.js');
// Kontroly typu „tohle tu být nemá“ musí koukat na KÓD, ne na komentáře –
// jinak je shodí vysvětlení, proč tam ta věc není.
const ucKod = uc.replace(/^\s*\/\/.*$/gm, '');

// ── Modal je pryč a nic po něm nespadne ───────────────────────────
ok('TODO-233 · modal profilu už v app.html není', !/id="modalProfile"/.test(html));
ok('TODO-233 · v kódu nezůstal odkaz na neexistující modal', !/modalProfile/.test(app));
ok('TODO-233 · openProfileModal odvede na stránku', /function openProfileModal\(\) \{\s*\n\s*if \(typeof showPage === 'function'\) showPage\('ucet'\);/.test(app));
ok('TODO-233 · saveProfile deleguje, nesahá na smazané prvky',
   /if \(typeof saveUcetProfil === 'function'\) return saveUcetProfil\(\);/.test(app) &&
   !/document\.getElementById\('profileName'\)\.value/.test(app));
ok('TODO-233 · Nastavení odkazuje na stránku, ne na modal', /onclick="showPage\('ucet'\)"/.test(set));

// ── Spouštěč a registrace stránky ─────────────────────────────────
ok('TODO-233 · spouštěčem je celý blok se jménem', /class="sidebar-user" onclick="showPage\('ucet'\)"/.test(html));
ok('TODO-233 · tužka zmizela', !/user-edit-btn/.test(html));
ok('TODO-233 · stránka existuje', /id="page-ucet"/.test(html) && /id="ucetContent"/.test(html));
ok('TODO-233 · je v dispatcheru', /curPage==='ucet' && typeof renderUcetPage==='function'/.test(R('ui.js')));
ok('TODO-233 · má název v PAGE_TITLES', /ucet:'👤 Můj účet'/.test(app));
ok('TODO-233 · ucet.js se načítá před firebase.js (ten musí být poslední)',
   html.indexOf('js/ucet.js') < html.indexOf('js/firebase.js'));

// ── Obsah podle Milanova zadání ───────────────────────────────────
ok('TODO-233 · avatar, jméno, e-mail, UID', /profileAvatarPicker/.test(uc) && /ucetName/.test(uc)
   && /E-mail/.test(uc) && /ID uživatele/.test(uc));
ok('TODO-233 · e-mail i UID jdou zkopírovat',
   /const kopie = \(txt, hlaska\)/.test(uc) && (uc.match(/kopie\(/g)||[]).length>=2);
ok('TODO-233 · účtenky jen odkazem, ne duplicitní seznam',
   /showPage\('uctenky'\)/.test(uc) && !/receipts\.map\(/.test(uc));
ok('TODO-233 · proklik na tarify', /showPage\('nastaveni'\)[\s\S]{0,120}tiersAnchor/.test(uc));
ok('TODO-233 · Aktivita: transakce a měsíce s daty', /Měsíců s daty/.test(uc) && /pocetTx/.test(uc));
ok('TODO-233 · referral používá TÝŽ renderer jako dřív (žádná kopie)',
   /id="profileRefRow"/.test(uc) && /renderReferralCodeRow/.test(uc));
ok('TODO-233 · avatar picker se taky nekopíruje', /renderAvatarPicker\(\)/.test(uc) && !/AVATAR_CHOICES/.test(uc));

// ── Co tam být NEMÁ (Milanovo zadání) ─────────────────────────────
ok('TODO-233 · není tu „Co partner uvidí“', !/Co partner uvidí/.test(ucKod));
ok('TODO-233 · není tu Moje domácnost', !/getMyHousehold/.test(uc));
ok('TODO-233 · není tu Tutoriál ani Nastavení jako sekce', !/Tutoriál/.test(ucKod));

// ── Mazání účtu ───────────────────────────────────────────────────
ok('TODO-233 · mazání má dvě potvrzení, druhé opsáním slova',
   /confirm\(/.test(uc) && /slovo !== 'SMAZAT'/.test(uc));
ok('TODO-233 · předem varuje, že předplatné to nezruší', /Stripe ti bude účtovat dál|NEZRUŠÍ/.test(uc));
ok('TODO-233 · nejdřív odejde z komunity a domácnosti, pak maže data',
   uc.indexOf('purgeMyCommunityData') < uc.indexOf('users/${me.uid}`), null)'.replace('null)','null)')));
ok('TODO-233 · dílčí selhání nezastaví zbytek (vlastní try/catch)',
   (uc.match(/console\.warn\('\[smazání\]/g)||[]).length>=2);
ok('TODO-233 · při chybě se řekne, že data zůstala', /Data zůstala beze změny/.test(uc));
ok('TODO-233 · nad cizími daty se nemaže nic', /if \(typeof viewingUid !== 'undefined' && viewingUid\) return;/.test(uc));

// ── Čitelnost (Milanovo opakované zadání) ─────────────────────────
ok('TODO-233 · žádný var(--text3) ani var(--text2) na stránce',
   !/var\(--text3\)/.test(ucKod) && !/var\(--text2\)/.test(ucKod));
ok('TODO-233 · popisky jsou #a8aec8 a hodnoty #c9cede',
   /UCET_POPISEK = '#a8aec8'/.test(uc) && /UCET_HODNOTA = '#c9cede'/.test(uc));
ok('TODO-233 · nic menšího než .72rem', !/font-size:\.6\d/.test(uc) && !/font-size:\.71/.test(uc));
ok('TODO-233 · jméno se escapuje (může obsahovat < nebo &)', /escHtml\(jmeno\)/.test(uc));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
