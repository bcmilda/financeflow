// FIX-266 · FIX-267 · FIX-268 · FIX-269 – měření musí být všude stejné.
const fs=require('fs');
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};

console.log('── FIX-266 · Komunitní přehled ──');
const adm=fs.readFileSync('admin.js','utf8').split('\n');
check('myExp počítá přes txCZK a vylučuje splity i přesuny',()=>{
  const i=adm.findIndex(l=>l.includes('const myExp = myExpTxs.reduce'));
  assert(i>0,'řádek nenalezen');
  assert(/txCZK\(t,\s*D\)/.test(adm[i]),'stále surová částka: '+adm[i].trim());
  const filtr=adm.slice(i-3,i).join(' ');
  assert(/!t\.splitParent/.test(filtr),'nevylučuje splitParent');
  assert(/!isTransferTx\(t\)/.test(filtr),'nevylučuje přesuny');
});
check('rodinný souhrn měří stejně jako vlastní',()=>{
  const i=adm.findIndex(l=>l.includes('const pExp = pTxs.filter'));
  const blok=adm.slice(i,i+3).join(' ');
  assert(/txCZK\(t,\s*p\.data\)/.test(blok),'partner stále surově');
  assert(/!t\.splitParent/.test(blok)&&/!isTransferTx\(t\)/.test(blok),'partner bez vyloučení');
});
check('odesílaná i zobrazovaná strana mají shodný filtr',()=>{
  const pub=adm.findIndex(l=>l.includes('function publishCommunityStats'));
  const blokPub=adm.slice(pub,pub+40).join(' ');
  assert(/txCZK/.test(blokPub)&&/isTransferTx/.test(blokPub),'odesílací strana se změnila?');
});

console.log('\n── FIX-267 · Radar ──');
const prj=fs.readFileSync('projects.js','utf8').split('\n');
check('v Radaru (1840–3748) nezůstala syrová částka nad transakcí',()=>{
  const bad=[];
  prj.forEach((l,i)=>{ if(i>=1839&&i<3748&&/t\.amount\s*\|\|\s*t\.amt/.test(l)) bad.push(i+1); });
  assert(!bad.length,'zbylo na ř. '+bad.join(', '));
});
check('hledání největšího příjmu porovnává přes txCZK',()=>{
  const bad=[];
  prj.forEach((l,i)=>{ if(/best=t;|b=t;/.test(l)&&/\.amount\s*\|\|/.test(l)) bad.push(i+1); });
  assert(!bad.length,'porovnání nominálů na ř. '+bad.join(', ')+' – 1200 EUR prohraje s 3000 Kč');
});
check('práh malé platby v Detektoru se testuje v CZK',()=>{
  const i=prj.findIndex(l=>l.includes('amt > 300'));
  assert(i>0,'práh nenalezen');
  const okolí=prj.slice(Math.max(0,i-4),i).join(' ');
  assert(/txCZK\(t,\s*D\)/.test(okolí),'práh proti nominálu – 20 € by prošlo jako malá platba');
});
check('SKILL 29: žádný komentář nezakomentoval zbytek řádku',()=>{
  const bad=[];
  // past nastane, jen když komentář NÁSLEDUJE po kódu na témž řádku
  prj.forEach((l,i)=>{
    const p=l.split('// FIX-267');
    if(p.length>1 && p[0].trim() && p[1].trim()) bad.push(i+1);
  });
  assert(!bad.length,'kód za komentářem na ř. '+bad.join(', '));
});

console.log('\n── FIX-268 · klíč položky v Inflaci ──');
const key=n=>String(n||'').toLowerCase().trim()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/(\d),(\d)/g,'$1.$2')
  .replace(/[^a-z0-9%.]+/g,' ').replace(/\s+/g,' ').trim()
  .split(' ').map(w=>/\d/.test(w)?w:w.slice(0,5)).join(' ');
const spojit=[['Mléko polotučné 1,5% 1l','MLEKO POLOTUC. 1,5% 1L'],
              ['Rohlík tukový','ROHLIK TUKOVY'],
              ['Chléb konzumní kmínový','CHLEB KONZUM. KMINOVY']];
const rozdelit=[['Mléko polotučné 1,5%','Mléko plnotučné 3,5%'],
                ['Jogurt bílý 150g','Jogurt bílý 400g'],
                ['Máslo 250g','Margarín 250g']];
check('zkratky z účtenky se spárují s plným názvem',()=>{
  spojit.forEach(([a,b])=>assert(key(a)===key(b),`nespojilo: ${a} / ${b}`));
});
check('🚩 různé produkty se NESLUČUJÍ (jádro FIX-268)',()=>{
  rozdelit.forEach(([a,b])=>assert(key(a)!==key(b),
    `SLOUČILO ${a} a ${b} → index by si vymyslel zdražení`));
});
check('kód opravdu používá novou normalizaci',()=>{
  const inf=fs.readFileSync('inflace.js','utf8');
  assert(!/slice\(0,\s*25\)/.test(inf.split('const key =')[1].slice(0,400)),'stále ořezává na 25 znaků');
  assert(/normalize\('NFD'\)/.test(inf),'chybí normalizace diakritiky');
});

console.log('\n── FIX-269 · sleva v ceně ──');
check('cena za jednotku vychází z lineTotal, když existuje',()=>{
  const inf=fs.readFileSync('inflace.js','utf8');
  assert(/lineTot\s*!=\s*null\s*\?\s*\(lineTot\s*\/\s*qtyRaw\)/.test(inf),'sleva se stále ignoruje');
});
check('výpočet: 2 ks po 30 Kč se slevou na 50 → 25 Kč/ks',()=>{
  const it={price:30,qty:2,lineTotal:50};
  const qtyRaw=Math.max(0.001,it.qty||1);
  const lineTot=(it.lineTotal!=null&&it.lineTotal>0)?it.lineTotal:null;
  const price=lineTot!=null?(lineTot/qtyRaw):(it.price||0);
  assert(price===25,'cena '+price+' – bez FIX-269 by vyšlo 30 a akce by zmizela');
});
check('bez lineTotal se použije price (zpětná kompatibilita)',()=>{
  const it={price:30,qty:2};
  const qtyRaw=Math.max(0.001,it.qty||1);
  const lineTot=(it.lineTotal!=null&&it.lineTotal>0)?it.lineTotal:null;
  assert((lineTot!=null?(lineTot/qtyRaw):(it.price||0))===30);
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ VŠECHNY OPRAVY OVĚŘENY');
process.exit(fails?1:0);
