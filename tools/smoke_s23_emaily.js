// S23 (TODO-295 + GDPR přehled). Spuštění: node tools/smoke_s23_emaily.js
const fs=require('fs');const A=fs.readFileSync(process.argv[2]||'admin.js','utf8');const S=fs.readFileSync('settings.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=(src,n)=>{const a=src.indexOf('function '+n+'(');let i=src.indexOf('{',a),d=0;for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'){d--;if(!d)break;}}return src.slice(a,i+1);};
const g=(src,n)=>eval(cut(src,n).replace('function '+n,'global.'+n+'=function'));
// ── výběr adres ──
global._cachedUsers=[
 {uid:'a',email:'a@x.cz',displayName:'Alice',newsletter:true,newsletterAt:Date.parse('2026-05-01')},
 {uid:'b',email:'b@x.cz',displayName:'Bob',newsletter:false},
 {uid:'c',email:'A@X.cz',displayName:'Alice dubl',newsletter:true},     // stejná adresa jiným zápisem
 {uid:'d',email:'',displayName:'Bez mailu',newsletter:true},
];
g(A,'_adminEmailSeznam');
T('se souhlasem: jen kdo zapnul novinky',_adminEmailSeznam('souhlas').map(u=>u.uid).join()==='a');
T('všechny: i bez souhlasu, ale bez prázdných a duplicit',_adminEmailSeznam('vse').map(u=>u.uid).join()==='a,b');
// ── export ──
let stazeno=null,klik=0;
global.URL={createObjectURL:b=>{stazeno=b;return 'blob:x';},revokeObjectURL(){}};
global.Blob=function(p,o){this.txt=p.join('');this.type=o&&o.type;};
global.document={createElement:()=>({set href(v){},set download(v){this._d=v;},click(){klik++;}})};
global.showToast=()=>{};global.alert=m=>{global._alert=m;};
g(A,'adminEmaily');
adminEmaily('souhlas');
T('CSV se souhlasem: hlavička, sloupce, 1 adresa',/se souhlasem/.test(stazeno.txt)&&/email;jmeno;souhlas;souhlas_od/.test(stazeno.txt)&&(stazeno.txt.match(/@x\.cz/gi)||[]).length===1);
T('CSV nese datum souhlasu',/2026-05-01/.test(stazeno.txt));
adminEmaily('vse');
T('CSV všech VAROVÁNÍ, že se nesmí použít na nabídky',/NE k nabídkám/.test(stazeno.txt)&&(stazeno.txt.match(/@x\.cz/gi)||[]).length===2);
global._cachedUsers=[{uid:'b',email:'b@x.cz',newsletter:false}];
adminEmaily('souhlas');
T('bez souhlasů export nespadne a vysvětlí to',/nezapnul novinky/.test(global._alert));
// ── worker: hromadná zpráva ──
const W=fs.readFileSync('worker.js','utf8');
T('worker: /mass-mail jen pro admina (token + ADMIN_UIDS)',/ADMIN_UIDS\.includes\(uid\)/.test(cut(W,'handleMassMail'))&&/Neplatný Firebase token/.test(cut(W,'handleMassMail')));
T('worker: odhlašovací informace se přidá vždy, i když ji admin nenapíše',/Nastavení → Novinky a nabídky e-mailem/.test(W)&&/\$\{odhlaseni\}/.test(W));
T('worker: text uživatele se escapuje do HTML e-mailu',/esc\(text\)\.replace/.test(W));
T('worker: strop příjemců na dávku',/slice\(0, 200\)/.test(W));
// ── nastavení: souhlas ──
T('nastavení: přepínač výchozí VYPNUTÝ (jen ===true zaškrtne)',/_settings\?\.newsletter===true\?'checked':''/.test(S));
T('nastavení: ukládá datum souhlasu',/_settings\.newsletterAt = Date\.now\(\)/.test(S));
T('nastavení: odvolání se zaznamená taky',/newsletterOffAt/.test(S));
T('admin načítá souhlas z nastavení uživatele',/newsletter: nast\?\.newsletter === true/.test(A));
// ── GDPR přehled ──
let okno=null;
global.window={open:()=>({document:{write:h=>{okno=h;},close(){}}})};
g(A,'_gdprPrehled');
_gdprPrehled({_meta:{subjekt:'UID123',vygenerovano:'2026-09-22T18:28:42.707Z',spravce:'FinanceFlow · info@financeflow.cz',ucel_zpracovani:'Vedení evidence.',prijemci:['Google Firebase – uložení dat','Stripe – platby'],doba_uchovani:'Do smazání účtu.',poznamka:'Prázdný uzel = žádné údaje.'},
  uzivatel:{data:{transactions:{t1:{},t2:{}},receipts:{},bank:{startBalance:0}},profile:{email:'a@x.cz'}}},'UID123');
T('přehled je čitelné HTML, ne JSON',/<h1>Přehled zpracování osobních údajů/.test(okno)&&/čl. 15 GDPR/.test(okno));
T('přehled překládá názvy uzlů do češtiny',/Zapsané příjmy a výdaje/.test(okno)&&/Naskenované účtenky/.test(okno));
T('přehled ukazuje počty a prázdné kategorie',/2×/.test(okno)&&/žádné údaje/.test(okno));
T('přehled obsahuje příjemce, dobu uchování a práva',/Google Firebase/.test(okno)&&/Do smazání účtu/.test(okno)&&/uoou\.gov\.cz/.test(okno));
T('přehled má tlačítko tisku (→ PDF) a A4',/window\.print\(\)/.test(okno)&&/@page\{size:A4/.test(okno));
T('JSON zůstává (čl. 20 přenositelnost)',/application\/json/.test(cut(A,'adminGdprExport')));
console.log(`E-maily + GDPR přehled: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
