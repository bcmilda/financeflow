// S23 (TODO-294): Play režim – v aplikaci z Google Play žádná klikací cesta k nákupu.
// Spuštění: node tools/smoke_play_rezim.js
const fs=require('fs');const P=fs.readFileSync(process.argv[2]||'premium.js','utf8');const D=fs.readFileSync('donate.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=(src,n)=>{const a=src.indexOf('function '+n+'(');let i=src.indexOf('{',a),d=0;for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'){d--;if(!d)break;}}return src.slice(a,i+1);};
const g=(src,n)=>eval(cut(src,n).replace('function '+n,'global.'+n+'=function'));
const LS={};global.localStorage={getItem:k=>LS[k]??null,setItem:(k,v)=>{LS[k]=String(v);},removeItem:k=>{delete LS[k];}};
eval(P.slice(P.indexOf("const PLAY_BALIK"),P.indexOf('\n',P.indexOf("const PLAY_BALIK"))).replace('const ','global.'));
g(P,'isPlayApp'); g(P,'playInfoHTML');
const nastav=(ref,search='')=>{global.document={referrer:ref};global.location={search};};
// detekce
nastav('');T('web: Play režim vypnutý',isPlayApp()===false);
nastav('android-app://cz.financeflow.app/');T('appka z Play: režim zapnutý',isPlayApp()===true);
nastav('');T('režim vydrží i bez referreru (další stránky v appce)',isPlayApp()===true);
nastav('', '?play=0');T('?play=0 režim vypne (pro ladění)',isPlayApp()===false);
nastav('', '?play=1');T('?play=1 režim zapne',isPlayApp()===true);
nastav('android-app://com.jiny.balik/');delete LS.ff_playApp;T('cizí balík režim nezapne',isPlayApp()===false);
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
T('na webu se nic nemění (vše za podmínkou isPlayApp)',cut(P,'applyPlayMode').indexOf('if (!isPlayApp()) return;')>0);
// výměna v DOM
let odstraneno=0,vlozeno='';
const el={id:'tierPremiumCta',dataset:{},insertAdjacentHTML:(k,h)=>{vlozeno=h;},remove:()=>{odstraneno++;},closest:()=>null};
global.document={getElementById:id=>id==='tierPremiumCta'?el:null,querySelectorAll:()=>[],addEventListener:()=>{}};
nastav('android-app://cz.financeflow.app/');global.document.getElementById=id=>id==='tierPremiumCta'?el:null;global.document.querySelectorAll=()=>[];
g(P,'applyPlayMode');applyPlayMode();
T('tlačítko „Vyzkoušet Premium" se odstraní a nahradí textem',odstraneno===1&&/financeflow\.cz/.test(vlozeno));
applyPlayMode();
T('opakované volání nic nezdvojí',odstraneno===1);
console.log(`Play režim: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
