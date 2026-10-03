// FIX-282 – parseCzNum() u tečkového oddělovače tisíců zmenšil částku 1000×
// FIX-283 – splátkový kalendář přeskakoval měsíce u splatnosti 29.–31.
const fs=require('fs');
const pickFrom=(src,n)=>{const i=src.indexOf('function '+n);if(i<0)throw new Error('nenalezeno: '+n);
  let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

// ══════ FIX-282 ══════
eval(pickFrom(fs.readFileSync('sms-import.js','utf8'),'parseCzNum'));

console.log('── FIX-282 · částka z notifikace ──');

check('český formát s mezerou (hlavní cesta)',()=>{
  assert(parseCzNum('1 234,50')===1234.5,parseCzNum('1 234,50'));
  assert(parseCzNum('1 234 567,89')===1234567.89);
  assert(parseCzNum('99,90')===99.9);
});
check('TEČKOVÝ oddělovač tisíců (jádro opravy – dřív 1.234)',()=>{
  assert(parseCzNum('1.234,50')===1234.5,'vyšlo '+parseCzNum('1.234,50')+' místo 1234.5');
});
check('anglický formát – Revolut (1,234.50)',()=>{
  assert(parseCzNum('1,234.50')===1234.5,'vyšlo '+parseCzNum('1,234.50'));
});
check('desetinná tečka bez tisíců (€12.50)',()=>{
  assert(parseCzNum('12.50')===12.5);
  assert(parseCzNum('€12.50')===12.5,'měnový symbol rozbil parsování: '+parseCzNum('€12.50'));
});
check('jediný oddělovač se 3 číslicemi = TISÍCE, ne desetiny',()=>{
  // "1.234" je 1234 Kč, ne 1,23 Kč – u peněz se píší dvě desetinná místa
  assert(parseCzNum('1.234')===1234,'vyšlo '+parseCzNum('1.234'));
  assert(parseCzNum('1 234')===1234);
});
check('víc oddělovačů téhož druhu = všechno tisíce',()=>{
  assert(parseCzNum('1.000.000')===1000000,'vyšlo '+parseCzNum('1.000.000'));
});
check('záporná částka a celé číslo',()=>{
  assert(parseCzNum('-320')===-320);
  assert(parseCzNum('1234')===1234);
});
check('prázdný vstup nespadne',()=>{
  assert(parseCzNum('')===0);
  assert(parseCzNum(null)===0);
  assert(parseCzNum('abc')===0);
});

// ══════ FIX-283 ══════
global.calcAnnuity=()=>0;
eval(pickFrom(fs.readFileSync('debts.js','utf8'),'generateSchedule'));
const gen=(startDate,freq)=>generateSchedule({remaining:100000,interest:5,freq:freq||'monthly',payment:5000,startDate});

console.log('\n── FIX-283 · data splátek ──');

check('splatnost 31. – každý měsíc právě jednou (jádro opravy)',()=>{
  const s=gen('2026-01-31').slice(0,6).map(x=>x.date);
  assert(s[1]==='2026-02-28','2. splátka '+s[1]+' místo 2026-02-28 (únor přeskočen?)');
  assert(s[2]==='2026-03-31','3. splátka '+s[2]);
  assert(s[3]==='2026-04-30','4. splátka '+s[3]+' (duben přeskočen?)');
  const months=s.map(d=>d.slice(0,7));
  assert(new Set(months).size===months.length,'dvě splátky v jednom měsíci: '+months.join(', '));
});
check('splatnost 30. – únor se ořízne, ostatní drží den',()=>{
  const s=gen('2026-01-30').slice(0,4).map(x=>x.date);
  assert(s[1]==='2026-02-28','únor: '+s[1]);
  assert(s[2]==='2026-03-30','březen: '+s[2]);
});
check('přestupný rok – únor má 29.',()=>{
  const s=gen('2028-01-31').slice(0,2).map(x=>x.date);
  assert(s[1]==='2028-02-29','přestupný únor: '+s[1]);
});
check('splatnost 15. beze změny (žádná regrese)',()=>{
  const s=gen('2026-01-15').slice(0,4).map(x=>x.date);
  assert(s.join(',')==='2026-01-15,2026-02-15,2026-03-15,2026-04-15','vyšlo '+s.join(','));
});
check('přechod přes rok',()=>{
  const s=gen('2026-11-30').slice(0,4).map(x=>x.date);
  assert(s[1]==='2026-12-30',s[1]);
  assert(s[2]==='2027-01-30',s[2]);
  assert(s[3]==='2027-02-28','únor dalšího roku: '+s[3]);
});
check('týdenní a čtrnáctidenní frekvence beze změny',()=>{
  const w=gen('2026-01-31','weekly').slice(0,3).map(x=>x.date);
  assert(w.join(',')==='2026-01-31,2026-02-07,2026-02-14','týdenní: '+w.join(','));
  const b=gen('2026-01-31','biweekly').slice(0,3).map(x=>x.date);
  assert(b.join(',')==='2026-01-31,2026-02-14,2026-02-28','14denní: '+b.join(','));
});
check('částky a úroky zůstaly nedotčené',()=>{
  const s=gen('2026-01-31');
  assert(s[0].payment===5000,'splátka: '+s[0].payment);
  assert(s[0].interest===Math.round(100000*0.05/12),'úrok: '+s[0].interest);
  assert(s[s.length-1].remaining===0,'nedosplaceno: '+s[s.length-1].remaining);
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-282 + FIX-283 OVĚŘENY');
process.exit(fails?1:0);
