// FIX-275 (S20) – detekce duplicit při importu musí porovnávat částky v CZK.
// Bankovní výpis nese částku v MĚNĚ ÚČTU (CZK). Existující transakce může být
// v cizí měně: 100 EUR = amount 100, ale amtCZK 2500. Porovnávat 2500 proti 100
// znamenalo 0 bodů za částku → duplikát propadl a naimportoval se podruhé.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('import.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);if(i<0)throw new Error('nenalezeno: '+n);
  let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};

function mkSandbox(){
  const sb={console,Date,Math,Number,isNaN,String,Array,Object};
  // Zjednodušený txCZK podle helpers.js: amtCZK má přednost, jinak kurz peněženky
  sb.txCZK=(t,D)=>{
    if(t&&t.amtCZK!=null&&isFinite(t.amtCZK))return t.amtCZK;
    const amt=(t&&(t.amount||t.amt))||0;
    if(!t||!t.wallet)return amt;
    const ws=(D&&D.wallets)||[];
    const w=ws.find(x=>x.id===t.wallet);
    const cur=(w&&w.currency)?w.currency:'CZK';
    return cur==='CZK'?amt:amt*25;
  };
  vm.createContext(sb);
  vm.runInContext([pick('buildExistingIndex'),pick('calcDupScore')].join('\n'),sb);
  return sb;
}

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

console.log('── FIX-275 · duplicity a cizí měna ──');

const D={wallets:[{id:'eur',currency:'EUR'},{id:'czk',currency:'CZK'}]};

check('EUR transakce se pozná jako duplikát řádku z výpisu v CZK',()=>{
  const sb=mkSandbox();
  // v appce: 100 EUR z eurové peněženky, reálně stálo 2500 Kč
  const existing=[{id:'e1',date:'2026-08-10',name:'Hotel Wien',type:'expense',amount:100,amtCZK:2500,wallet:'eur'}];
  const idx=sb.buildExistingIndex(existing,D);
  assert(idx[0]._amt===2500,'index nese '+idx[0]._amt+' místo 2500 – txCZK se nepoužil');
  // z banky přijde stejná transakce jako 2500 Kč
  const row={date:'2026-08-10',name:'Hotel Wien',type:'expense',amount:2500};
  const res=sb.calcDupScore(row,idx);
  assert(res.score>=80,'skóre jen '+res.score+' – duplikát v cizí měně se neodhalil (má být ≥80 = červená)');
});

check('bez amtCZK se použije kurz peněženky',()=>{
  const sb=mkSandbox();
  const existing=[{id:'e2',date:'2026-08-10',name:'Hotel Wien',type:'expense',amount:100,wallet:'eur'}];
  const idx=sb.buildExistingIndex(existing,D);
  assert(idx[0]._amt===2500,'kurz peněženky se nepoužil: '+idx[0]._amt);
});

check('korunová transakce funguje beze změny (žádná regrese)',()=>{
  const sb=mkSandbox();
  const existing=[{id:'e3',date:'2026-08-10',name:'Albert',type:'expense',amount:450,wallet:'czk'}];
  const idx=sb.buildExistingIndex(existing,D);
  assert(idx[0]._amt===450,'korunová částka se změnila: '+idx[0]._amt);
  const res=sb.calcDupScore({date:'2026-08-10',name:'Albert',type:'expense',amount:450},idx);
  assert(res.score>=80,'korunový duplikát se přestal poznávat: '+res.score);
});

check('RŮZNÉ transakce se pořád NEoznačí jako duplikát',()=>{
  const sb=mkSandbox();
  const existing=[{id:'e4',date:'2026-08-10',name:'Albert',type:'expense',amount:450,wallet:'czk'}];
  const idx=sb.buildExistingIndex(existing,D);
  const res=sb.calcDupScore({date:'2026-08-10',name:'Shell benzín',type:'expense',amount:1800},idx);
  assert(res.score<60,'nesouvisející transakce označena jako duplikát: '+res.score);
});

check('transakce bez peněženky nespadne (starší data)',()=>{
  const sb=mkSandbox();
  const existing=[{id:'e5',date:'2026-08-10',name:'Starý zápis',type:'expense',amount:300}];
  const idx=sb.buildExistingIndex(existing,D);
  assert(idx[0]._amt===300,'transakce bez peněženky: '+idx[0]._amt);
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-275 OVĚŘEN');
process.exit(fails?1:0);
