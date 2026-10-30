// S23 (TODO-277b/c): klientská část archivu fotek účtenek.
// Spuštění: node tools/smoke_archiv_klient.js
const fs=require('fs');const R=fs.readFileSync(process.argv[2]||'receipts.js','utf8');const U=fs.readFileSync('ucet.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=(src,n)=>{let a=src.indexOf('async function '+n+'(');if(a<0)a=src.indexOf('function '+n+'(');let i=src.indexOf('{',a),d=0;for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'){d--;if(!d)break;}}return src.slice(a,i+1);};
const g=(src,n)=>{const c=cut(src,n);const as=c.startsWith('async');eval(c.replace(/^async /,'').replace(new RegExp('function '+n),'global.'+n+'='+(as?'async ':'')+'function'));};
global.WORKER_URL='https://w.test';
global.S={uiCfg:{}};   // S25: rpAutoDoklad čte S.uiCfg
let volani=[];
global.window={_currentUser:{getIdToken:async()=>'TOK'}};
global.fetch=async(u,o)=>{volani.push({u:String(u),body:JSON.parse(o.body),auth:o.headers.Authorization});
  if(/\/upload/.test(u)) return {ok:true,json:async()=>({ok:true,key:'u/me/abc.jpg',size:180000,pocet:3,limit:300})};
  if(/\/get/.test(u)) return {ok:true,blob:async()=>'BLOB'};
  return {ok:true,json:async()=>({ok:true,smazano:1})};};
['archivVolej','archivUloz','archivSmaz','rpFotky','rpScanPro','rpAutoDoklad','rpArchivBlok'].forEach(n=>g(R,n));   // S25: + pomocné funkce bloku
(async()=>{
  // upload
  global.archivZmensi=async()=>({base64:'AAA',mime:'image/jpeg',px:1200,bajtu:180000});
  const v=await archivUloz({},'r1');
  T('upload posílá token a zmenšenou fotku',volani[0].auth==='Bearer TOK'&&volani[0].body.photo==='AAA'&&volani[0].body.mime==='image/jpeg');
  T('upload vrací klíč, velikost a stav kvóty',v.key==='u/me/abc.jpg'&&v.bajtu===180000&&v.pocet===3&&v.limit===300);
  T('endpoint je /archiv/upload',/\/archiv\/upload$/.test(volani[0].u));
  // get vrací blob, ne JSON
  volani=[];T('čtení fotky vrací binárku',await archivVolej('get',{key:'k'})==='BLOB');
  // smazání nesmí shodit appku
  global.fetch=async()=>{throw new Error('offline');};
  T('nedostupná síť při mazání fotky nic neshodí',await archivSmaz('k')===false);
  T('bez klíče se nevolá nic',await archivSmaz('')===false);
  // UI blok
  // S25: bez čerstvého skenu nabídne výběr fotky (Přidat fotku dokladu)
  T('bez fotky nabídne výběr fotky dokladu',/Přidat fotku dokladu/.test(rpArchivBlok({}))&&/type="file"/.test(rpArchivBlok({})));
  T('s fotkou nabídne zobrazit a odstranit',/Zobrazit/.test(rpArchivBlok({photoKey:'k'}))&&/Odstranit/.test(rpArchivBlok({photoKey:'k'})));
  T('nahrává se jen na kliknutí (žádné auto-uložení při skenu)',!/archivUloz\(/.test(cut(R,'handleReceiptFile')||'')&&/onchange="rpArchivNahraj/.test(R));
  // mazání účtenky
  const dr=cut(R,'deleteReceipt');
  T('smazání účtenky uklidí všechny fotky',/rpFotky\(_r\)\.forEach\(k => archivSmaz\(k\)\)/.test(dr));   // S25: více fotek
  T('a až PO potvrzení',dr.indexOf('confirm(')<dr.indexOf('archivSmaz'));
  // mazání účtu
  T('smazání účtu smaže celý archiv (all:true)',/archivVolej\('delete', \{ all: true \}\)/.test(U));
  T('a případná chyba archivu nezastaví mazání účtu',/catch \(e\) \{ console\.warn\('\[smazání\] archiv fotek/.test(U));
  // komprese
  const z=cut(R,'archivZmensi');
  T('komprese: max 1200 px a JPEG 0,7',/ARCHIV_MAX_PX/.test(z)&&/ARCHIV_KVALITA/.test(R)&&/1200, ARCHIV_KVALITA = 0\.7/.test(R));
  T('když je fotka i tak velká, ubere se kvalita',/while \(data\.length \* 0\.75 > ARCHIV_STROP/.test(z));
  console.log(`Archiv – klient: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
})();
