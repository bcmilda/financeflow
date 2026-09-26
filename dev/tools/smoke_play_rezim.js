// S23 (TODO-294): Play režim – v aplikaci z Google Play žádná klikací cesta k nákupu.
// Spuštění: node tools/smoke_play_rezim.js
const fs=require('fs');const P=fs.readFileSync(process.argv[2]||'premium.js','utf8');const D=fs.readFileSync('donate.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=(src,n)=>{const a=src.indexOf('function '+n+'(');let i=src.indexOf('{',a),d=0;for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'){d--;if(!d)break;}}return src.slice(a,i+1);};
const g=(src,n)=>eval(cut(src,n).replace('function '+n,'global.'+n+'=function'));
const LS={},SS={};
global.localStorage={getItem:k=>LS[k]??null,setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
global.sessionStorage={getItem:k=>SS[k]??null,setItem:(k,v)=>{SS[k]=String(v);},removeItem:k=>{delete SS[k];}};
eval(P.slice(P.indexOf("const PLAY_BALIK"),P.indexOf('\n',P.indexOf("const PLAY_BALIK"))).replace('const ','global.'));
g(P,'isPlayApp'); g(P,'playInfoHTML');
const nastav=(ref,search='')=>{global.document={referrer:ref};global.location={search};};
// detekce
nastav('');T('web: Play režim vypnutý',isPlayApp()===false);
nastav('android-app://cz.financeflow.app/');T('appka z Play: režim zapnutý',isPlayApp()===true);
nastav('');T('režim vydrží i bez referreru (další stránky v appce)',isPlayApp()===true);
//  KLÍČOVÉ (Milan, v11.00): TWA sdílí localStorage s prohlížečem → příznak
//  se nesmí ukládat tam, jinak zmizí tlačítko i na webu.
T('příznak je v sessionStorage, ne v localStorage',SS.ff_playApp==='1'&&!LS.ff_playApp);
(()=>{ LS.ff_playApp='1'; const S2=Object.keys(SS); S2.forEach(k=>delete SS[k]); nastav('');
  T('starý příznak z localStorage se ignoruje a smaže',isPlayApp()===false&&!LS.ff_playApp); })();
nastav('android-app://cz.financeflow.app/');isPlayApp();
nastav('', '?play=0');T('?play=0 režim vypne (pro ladění)',isPlayApp()===false);
nastav('', '?play=1');T('?play=1 režim zapne',isPlayApp()===true);
nastav('android-app://com.jiny.balik/');delete LS.ff_playApp;delete SS.ff_playApp;T('cizí balík režim nezapne',isPlayApp()===false);
Object.keys(SS).forEach(k=>delete SS[k]);
// text místo tlačítka
const txt=playInfoHTML();
T('text uvádí, kde koupit',/financeflow\.cz/.test(txt));
T('text NEOBSAHUJE odkaz ani tlačítko (to Google zakazuje)',!/<a\s|href=|<button/i.test(txt));
T('text neslibuje kliknutí',!/klikn|otevř/i.test(txt));
// pojistky
//  Kontrola aktivního předplatného musí zůstat PŘED Play blokem (FIX-305):
//  kdo Premium má, dostane informaci o platnosti, ne návod k nákupu.
const gp=cut(P,'goPremium');
T('goPremium v Play režimu nenabídne tarify',/isPlayApp === 'function' && isPlayApp\(\)[\s\S]{0,400}planChoiceModal/.test(gp));
T('pořadí: aktivní předplatitel se řeší dřív než Play režim',gp.indexOf('_premiumStatus.until > Date.now()')<gp.indexOf('isPlayApp'));
T('startPremiumSubscription se v Play režimu zastaví hned',/isPlayApp\(\) *\) *\{[\s\S]{0,200}return;/.test(cut(D,'startPremiumSubscription').slice(0,600)));
T('dary jsou v Play režimu taky zastavené',/isPlayApp/.test(cut(D,'openDonateModal')));
T('applyPlayMode vymění i tlačítka přidaná později',/querySelectorAll\('\[onclick\*="startPremiumSubscription"\]/.test(P));
//  v11.00: na webu funkce jen uklidí text, který tam mohl zůstat po sdíleném
//  úložišti s TWA – žádné tlačítko neodebírá.
T('na webu se žádné tlačítko neodebírá, jen se uklidí cizí text',/if \(!isPlayApp\(\)\) \{ document\.querySelectorAll\('\.ff-play-info'\)\.forEach\(el => el\.remove\(\)\); return; \}/.test(cut(P,'applyPlayMode')));
// výměna v DOM
let odstraneno=0,vlozeno='';
const el={id:'tierPremiumCta',dataset:{},insertAdjacentHTML:(k,h)=>{vlozeno=h;},remove:()=>{odstraneno++;},closest:()=>null};
let vlozene=[];   // simulace vložených textů v DOM
const mkDom=()=>({getElementById:id=>id==='tierPremiumCta'?el:null,
  querySelectorAll:s=>s==='.ff-play-info'?vlozene.map(()=>({remove:()=>{vlozene.pop();}})):[],
  addEventListener:()=>{}});
el.insertAdjacentHTML=(k,h)=>{vlozeno=h;vlozene.push(h);};
//  nejdřív referrer (tím se zapíše příznak do sessionStorage), pak teprve
//  DOM stub – jinak by se režim nezapnul a test by měřil něco jiného
nastav('android-app://cz.financeflow.app/');isPlayApp();
global.document=mkDom();
g(P,'applyPlayMode');applyPlayMode();
//  S23 (Milan): 30denní triál je ZDARMA → v Play verzi zůstává. Vymění se
//  jen skutečný nákup; pod triál se jen doplní informace, kde koupit.
T('triál „Vyzkoušet Premium" zůstává (je zdarma)',odstraneno===0);
T('pod triál se doplní text, kde Premium koupit',/financeflow\.cz/.test(vlozeno));
applyPlayMode();applyPlayMode();
T('opakované volání nic nezdvojí (Milan viděl 3 hlášky)',odstraneno===0&&vlozene.length===1);
T('výjimka pro triál je i u hromadné výměny tlačítek',/includes\('startTrial'\)\) return;/.test(P));
console.log(`Play režim: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
