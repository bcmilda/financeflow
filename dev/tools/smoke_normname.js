// S23 (PLAN-mapa-produktu F1): jeden klíč pro celou appku.
// Spuštění: node tools/smoke_normname.js
const fs=require('fs');
const H=fs.readFileSync('helpers.js','utf8'),A=fs.readFileSync('app.js','utf8'),R=fs.readFileSync('receipts.js','utf8'),
      N=fs.readFileSync('nakup.js','utf8'),P=fs.readFileSync('product-db.js','utf8'),J=fs.readFileSync('projects.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
global.window={};
const a=H.indexOf('const NORM_JEDNOTKY_RE'),b=H.indexOf('window.normName = normName;');
eval(H.slice(a,b).replace(/^const NORM/gm,'global.NORM').replace(/^function (normQty|normName|normKey)/gm,'global.$1=function'));
// ── normName ──
T('ROHLÍK 43G = Rohlik 43 g',normName('ROHLÍK 43G')===normName('Rohlik 43 g')&&normName('ROHLÍK 43G')==='rohlik');
T('různá balení dají stejný klíč (kvůli shrinkflaci)',normName('Sojové kostky 300g')===normName('Sojove kostky 100 g'));
T('procenta v názvu nevadí',normName('Mléko 1,5% 1l')==='mleko'&&normName('MLEKO 1.5 % 1 L')==='mleko');
T('různé výrobky se neslijí',normName('sladky rohlik')!==normName('rohlik'));
T('interpunkce a vícenásobné mezery',normName('JOG.BILY   150G')==='jog bily');
T('prázdný vstup nespadne',normName(null)===''&&normName(undefined)==='');
T('dlouhý název se ořízne na 60 znaků',normName('a'.repeat(200)).length===60);
// ── normQty ──
T('43G → 43 g',JSON.stringify(normQty('ROHLÍK 43G'))==='{"hodnota":43,"jednotka":"g"}');
T('1,5 l → 1500 ml',normQty('1,5 l').hodnota===1500&&normQty('1,5 l').jednotka==='ml');
T('0,5 kg → 500 g',normQty('Maso 0,5kg').hodnota===500);
T('bez množství → null',normQty('Uzeniny')===null);
T('množství se nezahazuje (shrinkflace ho potřebuje)',normQty('Kostky 100 g').hodnota===100&&normQty('Kostky 90 g').hodnota===90);
// ── normKey ──
T('normKey drží balení oddělené',normKey('Sojové kostky 300g')!==normKey('Sojove kostky 100 g'));
// ── zpětná kompatibilita uloženého mapování ──
const cut=(src,n)=>{const i=src.indexOf('function '+n+'(');let j=src.indexOf('{',i),d=0;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(!d)break;}}return src.slice(i,j+1);};
eval(cut(A,'normalizeMappingKey').replace('function normalizeMappingKey','global.normalizeMappingKey=function'));
eval(cut(A,'lookupCategoryMapping').replace('function lookupCategoryMapping','global.lookupCategoryMapping=function'));
//  S24 (v11.20, TODO-311): starý klíč se už nečte – data smazána, přechod skončil.
T('klíč je bez množství',normalizeMappingKey('ROHLÍK 43G')==='rohlik');
global._catMappingsCache={'rohlik':{catId:'novy'},'rohlik 43g':{catId:'stary'}};
T('najde se jen nový klíč',lookupCategoryMapping('Rohlík 43 g').catId==='novy');
T('starý klíč se už nečte',!/normalizeMappingKeyStary/.test(A));
global._catMappingsCache={}; T('nic uloženého → null',lookupCategoryMapping('cokoliv')===null);
global._catMappingsCache=null; T('bez načtené cache nespadne',lookupCategoryMapping('x')===null);
// ── všechna místa používají jeden klíč ──
T('cenová historie',/const key = normName\(it\.name\);/.test(R));
T('našeptávač/katalog',/const key = normName\(it\.name\) \|\| rawName/.test(R));
T('tagy položek',/const key = normName\(itemName\) \|\|/.test(R));
T('nákupní seznam',/if \(typeof normName === 'function'\) return normName\(name\);/.test(N));
T('katalog produktů',/if \(typeof normName === 'function'\) return normName\(s\);/.test(P));
T('pravidelně nakupuješ',/const key = normName\(it\.name\);   \/\/ S23/.test(J));
T('učení kategorií',/normName\(name\)/.test(cut(A,'normalizeMappingKey')));
console.log(`Jednotná normalizace: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
