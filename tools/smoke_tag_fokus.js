// FinanceFlow · smoke test · Session 27 (v11.97) · kurzor v tagu nesmí „uskočit“ (FIX-487)
//  Milan: „při editu skenované účtenky když upravuju zelený tag, tak mi občas uskočí kurzor“.
//  Ověřeno v Chromiu: přechod Balení → tag spustí „change“, když je aktivní <body>; překreslení
//  v tu chvíli zahodilo klepnuté pole tagu (fokus BODY, napsaný text se ztratil).
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const rc=fs.readFileSync(najdi('receipts.js','../js/receipts.js'),'utf8');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};

//  hlava rpRender (rozhodnutí, zda kreslit) + počítadlo místo kreslení
const rr=pick(rc,'rpRender'); const kde=rr.indexOf('window._rpCekaPrekresleni = false;');
const hlava=rr.slice(0,kde)+'window._rpCekaPrekresleni = false; kresleno++; }';
const posl={}; const casovace=[];
const body={tagName:'BODY'}; const vEditoru=x=>({...x,closest:q=>q==='#rp_items'?{}:null});
const c={console,kresleno:0,document:{body,activeElement:body,getElementById:id=>id==='rp_items'?{}:null,
  addEventListener:(n,f)=>{posl[n]=f}},setTimeout:f=>casovace.push(f)};
c.window=c; vm.createContext(c);
vm.runInContext('var kresleno=0;'+['_rpPrekreslitPozdeji','_rpDohnatPrekresleni'].map(n=>pick(rc,n)).join('\n').replace(/^/,'let _rpPrstDole = false;\n')+'\n'+hlava,c);
const tik=()=>{while(casovace.length)casovace.shift()()};
const K=()=>vm.runInContext('kresleno',c);

console.log('── Balení → tag (change, když je aktivní <body>) ──');
c.event={type:'change'}; c.document.activeElement=body;
c.rpRender(); t('při „change“ s aktivním <body> se nekreslí hned',K()===0);
c.event=undefined; c.document.activeElement=vEditoru({tagName:'INPUT',type:'text',id:'rp_tag_0'});
tik(); t('fokus se mezitím usadil v tagu → nekreslí se, čeká se',K()===0&&c._rpCekaPrekresleni===true);
t('hlídání fokusu a prstu zapnuto',!!posl.focusout&&!!posl.pointerdown&&!!posl.pointerup);
c.document.activeElement=vEditoru({tagName:'INPUT',type:'text',id:'rp_name_1'});
posl.focusout({target:vEditoru({})}); tik(); t('přechod tag → jiné pole editoru: pořád čeká',K()===0);

console.log('── odchod z polí ──');
posl.pointerdown(); c.document.activeElement=body; posl.focusout({target:vEditoru({})}); tik();
t('klepnutí jinam: dokud je prst dole, nekreslí se (tlačítko se nevymění pod prstem)',K()===0);
posl.pointerup(); tik(); t('po puštění prstu se odložené překreslení dožene',K()===1&&c._rpCekaPrekresleni===false);
c.document.activeElement=vEditoru({tagName:'INPUT',type:'text'}); c.rpRender(); t('psaní v textovém poli: čeká',K()===1&&c._rpCekaPrekresleni);
c.document.activeElement=body; posl.focusout({target:vEditoru({})}); tik(); t('klávesnice „Hotovo“ (blur bez prstu) → dokreslí',K()===2);

console.log('── bez změny chování jinde ──');
c.event={type:'change'}; c.document.activeElement=body; c.rpRender(); tik(); c.event=undefined;
t('výběr kategorie (change + blur, fokus nikam): nakreslí se o tik později',K()===3);
c.event={type:'click'}; c.rpRender(); c.event=undefined; t('klepnutí na tlačítko (➕, ✕): kreslí se hned',K()===4);
posl.focusout({target:{closest:()=>null}}); tik(); t('fokus mimo editor bez čekajícího kreslení nic nedělá',K()===4);

console.log('── pole tagu ──');
const tag=rc.slice(rc.indexOf('<input id="rp_tag_${i}"'),rc.indexOf("onblur=\"if(!this.value)this.placeholder='🏷️ tag'\""));
t('pole tagu větší (118 px, písmo .84rem)',/width:118px/.test(tag)&&/font-size:\.84rem/.test(tag));
t('tag escapovaný',/value="\$\{escHtml\(it\.tag\|\|''\)\}"/.test(tag));
t('řádek editoru o rozšíření tagu širší',/min-width:726px/.test(rc));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
