// TODO-213 – metriky aktivity v admin panelu.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('admin.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
const sb={console,Date,Math,Object,Set,Number,isFinite,String};
vm.createContext(sb);
vm.runInContext(pick('adminActivityStats')+'\n'+pick('adminActivityScore'),sb);
const stats=vm.runInContext('adminActivityStats',sb), score=vm.runInContext('adminActivityScore',sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const daysBack=n=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-n);return iso(d)};
const mk=(offsets,extra={})=>{const d={};offsets.forEach(o=>d[daysBack(o)]=1);
  return Object.assign({last:Date.now(),visits:offsets.length,d},extra)};

console.log('── TODO-213 · metriky aktivity ──');

check('Milanův případ: denní uživatel = 100/100 (dřív 60)',()=>{
  const r=score({activity:mk([...Array(30).keys()])});
  assert(r.score===100,'skóre '+r.score+' (objem '+r.volScore+' + čerstvost '+r.freshScore+')');
});
check('bez evidence → skóre null, ne falešná nula',()=>{
  const r=score({activity:null,transactionsCount:376});
  assert(r.score===null,'skóre '+r.score);
  assert(r.st.has===false,'has má být false');
});
check('série dnů se počítá i když dnes ještě nebyl',()=>{
  const s=stats(mk([1,2,3,4,5]));
  assert(s.streak===5,'streak '+s.streak);
});
check('série se přeruší mezerou',()=>{
  const s=stats(mk([0,1,2,5,6]));
  assert(s.streak===3,'streak '+s.streak);
});
check('okna 30 a 90 dní se nepřekrývají chybně',()=>{
  const s=stats(mk([0,10,29,30,45,89,90,200]));
  assert(s.days30===3,'days30 '+s.days30);
  assert(s.days90===6,'days90 '+s.days90);
  assert(s.daysTotal===8,'daysTotal '+s.daysTotal);
});
check('vlažný uživatel (5 dní z 30, naposledy před 10 dny) = průměrný',()=>{
  const a=mk([10,12,15,20,25]); a.last=Date.now()-10*86400000;
  const r=score({activity:a});
  assert(r.score>=20&&r.score<=45,'skóre '+r.score);
});
check('aktivace se počítá z firstSeen → firstTx',()=>{
  const s=stats({last:Date.now(),d:{},firstSeen:Date.parse('2026-03-15'),firstTx:Date.parse('2026-03-18')});
  assert(s.activation===3,'aktivace '+s.activation);
});
check('poškozené klíče dnů appku nepoloží',()=>{
  const s=stats({last:1,d:{'nesmysl':1,'2026-13-99':1,'':1}});
  assert(s.daysTotal===0&&s.streak===0,'daysTotal '+s.daysTotal);
});
check('prázdný objekt aktivity nespadne',()=>{
  const s=stats({}); assert(s.has===true&&s.visits===0&&s.streak===0);
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ METRIKY AKTIVITY OVĚŘENY');
process.exit(fails?1:0);
