// Statická kontrola měnové konverze (SKILL 26) – hlídá tři pasti plošné náhrady.
const fs=require('fs');
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};
const FILES=['projects.js','transactions.js','debts.js','stats.js','ui.js','helpers.js','pristi.js','premium.js','report.js','inflace.js','review.js','receipts.js'];

console.log('── SKILL 26 · statické kontroly ──');

check('PAST 1: žádné fmtB() nad hodnotou, která už prošla czkToBase()',()=>{
  const bad=[];
  FILES.forEach(f=>{ if(!fs.existsSync(f))return;
    fs.readFileSync(f,'utf8').split('\n').forEach((l,i)=>{
      if(/fmtB\([^)]*czkToBase\(/.test(l)) bad.push(`${f}:${i+1}`);
    });});
  assert(!bad.length,'dvojí převod: '+bad.join(', '));
});

check('PAST 2: žádné fmt(x) + " Kč" u částky na obrazovce',()=>{
  const bad=[];
  ['projects.js','transactions.js','debts.js','stats.js','ui.js'].forEach(f=>{ if(!fs.existsSync(f))return;
    fs.readFileSync(f,'utf8').split('\n').forEach((l,i)=>{
      if(/\$\{fmt\([^{}]*\)\}\s*Kč|fmt\([^()]*\)\s*\+\s*['"] Kč['"]/.test(l)) bad.push(`${f}:${i+1}`);
    });});
  assert(!bad.length,'natvrdo Kč: '+bad.join(', '));
});

check('PAST 3: zbylá fmt() jsou jen doložené výjimky',()=>{
  const povoleno={'projects.js':[111,2226,2227,2238,2386,2405,2424],'transactions.js':[497]};
  const bad=[];
  Object.keys(povoleno).forEach(f=>{
    fs.readFileSync(f,'utf8').split('\n').forEach((l,i)=>{
      if(/(?<![A-Za-z0-9_])fmt\(/.test(l) && !povoleno[f].includes(i+1)) bad.push(`${f}:${i+1} → ${l.trim().slice(0,70)}`);
    });});
  assert(!bad.length,'neschválené fmt(): '+bad.join(' | '));
});

check('výjimky opravdu obsahují czkToBase nebo vlastní symbol',()=>{
  const bad=[];
  [['projects.js',[2226,2227,2238,2386,2405,2424]],['transactions.js',[497]]].forEach(([f,ns])=>{
    const L=fs.readFileSync(f,'utf8').split('\n');
    ns.forEach(n=>{ if(!/czkToBase/.test(L[n-1])) bad.push(`${f}:${n} nemá czkToBase`); });
  });
  const L=fs.readFileSync('projects.js','utf8').split('\n');
  assert(/curSym/.test(L[110]),'projects.js:111 nemá curSym');
  assert(!bad.length,bad.join(', '));
});

check('ai.js zůstává v Kč (prompt, ne obrazovka)',()=>{
  const n=(fs.readFileSync('ai.js','utf8').match(/Kč/g)||[]).length;
  assert(n>10,'ai.js má jen '+n+' zmínek Kč – nebyl omylem převeden?');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ MĚNOVÉ KONTROLY PROŠLY');
process.exit(fails?1:0);
