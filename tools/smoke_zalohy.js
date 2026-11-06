/* smoke_zalohy.js — FIX-293: window.X = () => X() je nekonečná rekurze
 * Simuluje prostředí klasického skriptu (deklarace funkce = vlastnost window)
 * a ověří, že export záloh nesahá sám na sebe. */
const fs=require('fs'), vm=require('vm'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'settings.js'),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };

console.log('smoke_zalohy.js');

// 1–3: statická kontrola – žádný self-referencující export
const selfRef=/window\.([A-Za-z0-9_$]+)\s*=\s*(\([^)]*\)|[A-Za-z0-9_$]+)\s*=>\s*\1\s*\(/g;
ok('žádný export tvaru window.X = () => X()', !selfRef.test(src));
ok('renderBackupBody exportován referencí', /window\.renderBackupBody\s*=\s*renderBackupBody\s*;/.test(src));
ok('doBackupNow + doBackupRestore exportovány referencí',
   /window\.doBackupNow\s*=\s*doBackupNow\s*;/.test(src) && /window\.doBackupRestore\s*=\s*doBackupRestore\s*;/.test(src));

// 4: runtime – v globálním scope klasického skriptu volání nesmí zacyklit
const ctx=vm.createContext({console}); ctx.window=ctx;
vm.runInContext(`
  let volani=0;
  function renderBackupBody(){ volani++; return 'ok'; }
  window.renderBackupBody = renderBackupBody;
  window.vysledek = (()=>{ try { return {v:renderBackupBody(), volani}; }
                           catch(e){ return {err:e.message}; } })();
`, ctx);
ok('volání neskončí rekurzí (1 průchod)', ctx.vysledek.v==='ok' && ctx.vysledek.volani===1);

// 5: kontrola, že starý zápis by SKUTEČNĚ spadl (regrese má smysl)
const ctx2=vm.createContext({console}); ctx2.window=ctx2;
vm.runInContext(`
  function renderBackupBody(){ return 'ok'; }
  window.renderBackupBody = () => renderBackupBody();
  window.stary = (()=>{ try { renderBackupBody(); return 'nespadlo'; }
                        catch(e){ return e.constructor.name; } })();
`, ctx2);
ok('starý zápis skutečně padá na RangeError', ctx2.stary==='RangeError');

// 6: engine v app.js pořád existuje (modal by jinak zůstal prázdný)
const appSrc=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
ok('backupList/backupRun/backupRestore v app.js existují',
   /async function backupList\s*\(/.test(appSrc) &&
   /async function backupRun\s*\(/.test(appSrc) &&
   /async function backupRestore\s*\(/.test(appSrc));

// 7: modal používá skutečné třídy (FIX-256 nesmí regredovat)
ok('modal záloh používá overlay/modal/modal-head',
   /modalBackup'[\s\S]{0,300}className = 'overlay'/.test(src) && /modal-head/.test(src));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
