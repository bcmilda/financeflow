// TODO-216 – peněžní vstupní pole v základní měně.
// KLÍČOVÝ TEST je round-trip: zadám → uložím → otevřu editaci → uložím ZNOVU.
// Druhé uložení odhalí chybějící zpětný převod (hodnota by se násobila kurzem).
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('helpers.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};

let BASE='CZK';
const RATES={CZK:1,EUR:25.3,GBP:28.224,PLN:5.9};
const DOM={};
const sb={console,Math,parseFloat,isFinite,String,Number,
  czkToBase:v=>(parseFloat(v)||0)/RATES[BASE],
  curSym:()=>({CZK:'Kč',EUR:'€',GBP:'£',PLN:'zł'}[BASE]),
  document:{getElementById:id=>DOM[id]||null,querySelectorAll:()=>[]}};
sb.window=sb;vm.createContext(sb);
vm.runInContext([pick('baseToCzk'),pick('moneyInFill'),pick('moneyInRead'),pick('refreshMoneyLabels')].join('\n'),sb);
const fill=vm.runInContext('moneyInFill',sb), read=vm.runInContext('moneyInRead',sb),
      b2c=vm.runInContext('baseToCzk',sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};
const field=id=>{DOM[id]={value:''};return DOM[id]};

console.log('── TODO-216 · peněžní vstupní pole ──');

check('CZK: převod je identita, nic se pro většinu uživatelů nemění',()=>{
  BASE='CZK'; field('f');
  DOM.f.value='25000';
  assert(read('f')===25000,'read '+read('f'));
  fill('f',25000);
  assert(Number(DOM.f.value)===25000,'fill '+DOM.f.value);
});

check('EUR: zadám 1000 → uloží se 25 300 CZK',()=>{
  BASE='EUR'; field('f'); DOM.f.value='1000';
  assert(read('f')===25300,'uloženo '+read('f')+' místo 25300');
});

check('EUR: 25 300 CZK z databáze → v poli 1000',()=>{
  BASE='EUR'; field('f'); fill('f',25300);
  assert(Number(DOM.f.value)===1000,'v poli '+DOM.f.value);
});

check('🚩 ROUND-TRIP: druhé uložení NESMÍ hodnotu znovu vynásobit',()=>{
  BASE='EUR'; field('f');
  DOM.f.value='1000';
  const ulozeno1=read('f');                       // 25 300
  fill('f',ulozeno1);                             // zpět do editace → 1000
  const videl=Number(DOM.f.value);
  const ulozeno2=read('f');                       // uložím beze změny
  assert(videl===1000,'v editaci vidím '+videl+' místo 1000');
  assert(ulozeno2===ulozeno1,`po druhém uložení ${ulozeno2} místo ${ulozeno1} – CHYBÍ ZPĚTNÝ PŘEVOD`);
});

check('🚩 ROUND-TRIP pětkrát po sobě zůstane stabilní',()=>{
  BASE='GBP'; field('f'); DOM.f.value='500';
  let czk=read('f');
  const prvni=czk;
  for(let i=0;i<5;i++){ fill('f',czk); czk=read('f'); }
  assert(Math.abs(czk-prvni)<1,`po 5 kolech ${czk} místo ${prvni} – hodnota eskaluje`);
});

check('prázdné pole zůstane prázdné, ne "0"',()=>{
  BASE='EUR'; field('f'); fill('f',0);
  assert(DOM.f.value==='','nula se zobrazila jako hodnota: "'+DOM.f.value+'"');
  fill('f',null); assert(DOM.f.value==='');
  fill('f',undefined); assert(DOM.f.value==='');
});

check('prázdné pole se přečte jako 0, ne NaN',()=>{
  BASE='EUR'; field('f'); DOM.f.value='';
  assert(read('f')===0,'read '+read('f'));
});

check('desetinná čárka i mezery v tisících projdou',()=>{
  BASE='EUR'; field('f');
  DOM.f.value='1 000,50';
  assert(Math.abs(read('f')-25312.65)<0.5,'read '+read('f'));
});

check('nesmysl v poli nespadne na NaN do databáze',()=>{
  BASE='EUR'; field('f'); DOM.f.value='abc';
  assert(read('f')===0,'read '+read('f'));
});

check('neexistující pole vrátí 0 a nespadne',()=>{
  assert(read('neexistuje')===0);
  fill('neexistuje',100);   // nesmí vyhodit výjimku
});

check('velká částka se nezaokrouhlí do ztráty',()=>{
  BASE='EUR'; field('f'); DOM.f.value='123456.78';
  const czk=read('f'); fill('f',czk);
  assert(Math.abs(Number(DOM.f.value)-123456.78)<0.02,'zpět '+DOM.f.value);
});

console.log('\n── popisky ──');
check('při CZK se popisky nesahají vůbec',()=>{
  BASE='CZK';
  let called=false;
  sb.document.querySelectorAll=()=>{called=true;return[]};
  vm.runInContext('refreshMoneyLabels()',sb);
  assert(!called,'zbytečně prochází DOM i při korunách');
});
check('při EUR se "(Kč)" v popisku přepíše',()=>{
  BASE='EUR';
  const lab={children:[],textContent:'Rozpočet (Kč)'};
  sb.document.querySelectorAll=()=>[lab];
  vm.runInContext('refreshMoneyLabels()',sb);
  assert(lab.textContent==='Rozpočet (€)','popisek '+lab.textContent);
});
check('popisek s vnořenými prvky se nepřepisuje (rozbil by HTML)',()=>{
  BASE='EUR';
  const lab={children:[{}],textContent:'ČÁSTKA (Kč)'};
  sb.document.querySelectorAll=()=>[lab];
  vm.runInContext('refreshMoneyLabels()',sb);
  assert(lab.textContent==='ČÁSTKA (Kč)','přepsal se popisek s vnořeným span');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ VSTUPNÍ POLE OVĚŘENA');
process.exit(fails?1:0);
