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

check('PAST 3: každé zbylé fmt() převádí samo nebo nese vlastní symbol',()=>{
  // Čísla řádků se s každou úpravou posouvají – hlídáme OBSAH řádku, ne pozici.
  const bad=[];
  ['projects.js','transactions.js'].forEach(f=>{
    fs.readFileSync(f,'utf8').split('\n').forEach((l,i)=>{
      if(!/(?<![A-Za-z0-9_])fmt\(/.test(l)) return;
      // legitimní jsou jen dva případy: hodnota už prošla czkToBase(),
      // nebo si řádek symbol měny doplňuje sám přes curSym()
      if(/czkToBase|curSym/.test(l)) return;
      bad.push(`${f}:${i+1} → ${l.trim().slice(0,70)}`);
    });
  });
  assert(!bad.length,'fmt() bez převodu i bez symbolu: '+bad.join(' | '));
});

check('ai.js zůstává v Kč (prompt, ne obrazovka)',()=>{
  const n=(fs.readFileSync('ai.js','utf8').match(/Kč/g)||[]).length;
  assert(n>10,'ai.js má jen '+n+' zmínek Kč – nebyl omylem převeden?');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ MĚNOVÉ KONTROLY PROŠLY');
process.exit(fails?1:0);
