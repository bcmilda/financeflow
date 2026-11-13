// FIX-291 (S20) – daysUntilBday() porovnávala PŮLNOC cílového dne s AKTUÁLNÍM časem.
// Půlnoc dneška je vždy menší než „teď" → datum se posunulo o rok: dnešní narozeniny
// hlásily „za 364 dní" a spadly na konec seznamu, zítřejší hlásily „0 dní".
// Texty „DNES!" / „ZÍTRA!" v renderBdayUpcoming se proto zobrazovaly o den dřív.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('charts.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);if(i<0)throw new Error(n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]=='{')d++;else if(src[k]=='}'){d--;if(!d)return src.slice(i,k+1)}}};

// Zmrazený „dnešek" 28. 8. 2026, 15:00 – ať test nezestárne
function mk(hour){
  const sb={console,Math,Number,String};
  const FIXED=new Date(2026,7,28,hour||15,0,0);
  sb.Date=class extends Date{constructor(...a){ if(!a.length) super(FIXED.getTime()); else super(...a); }};
  vm.createContext(sb);
  vm.runInContext([pick('daysUntilBday'),pick('_bdayDnu')].join('\n'),sb);
  return sb;
}
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

console.log('── FIX-291 · dny do narozenin ──');
const sb=mk(15), du=vm.runInContext('daysUntilBday',sb);

check('DNEŠNÍ narozeniny = 0 dní (jádro opravy, dřív 364)',()=>{
  assert(du({month:8,day:28})===0,'vyšlo '+du({month:8,day:28}));
});
check('zítřejší = 1 den (dřív 0)',()=>{
  assert(du({month:8,day:29})===1,'vyšlo '+du({month:8,day:29}));
});
check('nezávisí na denní době',()=>{
  [0,7,15,23].forEach(h=>{
    const d=vm.runInContext('daysUntilBday',mk(h));
    assert(d({month:8,day:28})===0,'v '+h+':00 vyšlo '+d({month:8,day:28}));
    assert(d({month:8,day:29})===1,'zítřek v '+h+':00 vyšlo '+d({month:8,day:29}));
  });
});
check('včerejší = příští rok (365 dní, 2027 není přestupný)',()=>{
  const v=du({month:8,day:27});
  assert(v===364,'vyšlo '+v);
});
check('vzdálenější datum v témže roce',()=>{
  assert(du({month:12,day:24})===118,'Štědrý den: '+du({month:12,day:24}));
});
check('datum už za sebou se posune na příští rok',()=>{
  assert(du({month:1,day:1})===126,'Nový rok: '+du({month:1,day:1}));
});
check('skloňování: 1 den · 3 dny · 8 dní',()=>{
  const f=vm.runInContext('_bdayDnu',sb);
  assert(f(1)==='1 den',f(1));
  assert(f(3)==='3 dny',f(3));
  assert(f(8)==='8 dní',f(8));
  assert(f(21)==='21 dní',f(21));
});
check('seznam ukazuje DNES/ZÍTRA místo „za 0 dní"',()=>{
  assert(/_d===0\?'DNES/.test(src),'chybí text DNES v seznamu');
  assert(/_d===1\?'ZÍTRA'/.test(src),'chybí text ZÍTRA v seznamu');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-291 OVĚŘEN');
process.exit(fails?1:0);
