// FIX-281 (S20) – budouciIsPaid() označovalo „✓ Zaplaceno" u nesouvisejících
// transakcí: shoda jmen běžela přes `includes` v obou směrech, takže kratší
// název byl podřetězcem delšího („Voda" ↔ „Vodafone"). Částka se neporovnávala
// vůbec – nájem 15 000 se tvářil zaplacený i po záloze 500 Kč.
// Oprava nesmí rozbít legitimní shody typu „Nájem" ↔ „Nájem srpen".
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('budouci.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);if(i<0)throw new Error('nenalezeno: '+n);
  let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};

function mkSandbox(txs){
  const sb={console,Date,Math,String,Array,Object};
  sb.getData=()=>({transactions:txs||[],wallets:[{id:'czk',currency:'CZK'},{id:'eur',currency:'EUR'}]});
  sb.txCZK=(t,D)=>{
    if(t.amtCZK!=null)return t.amtCZK;
    const amt=t.amount||t.amt||0;
    if(!t.wallet)return amt;
    const w=((D&&D.wallets)||[]).find(x=>x.id===t.wallet);
    return (w&&w.currency==='EUR')?amt*25:amt;
  };
  vm.createContext(sb);
  vm.runInContext([pick('_budouciWords'),pick('_budouciNameMatch'),pick('_budouciAmtMatch'),pick('budouciIsPaid')].join('\n'),sb);
  return sb;
}
const item=(name,amount,dateStr,isTransfer)=>({name,amount,date:new Date(dateStr),isTransfer:!!isTransfer});
const tx=(name,amount,date,type,extra)=>Object.assign({name,amount,date,type:type||'expense'},extra||{});

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

console.log('── FIX-281 · falešné shody se už nestanou ──');

[['Voda','Vodafone',499],['Nájem','Nájemné garáž',15000],
 ['Plyn','Plynulá jízda pojištění',1200],['Auto','Autolékárna',300]].forEach(([sablona,transakce,castka])=>{
  check(`"${sablona}" se NEOZNAČÍ kvůli "${transakce}"`,()=>{
    const sb=mkSandbox([tx(transakce,castka,'2026-08-15')]);
    assert(!sb.budouciIsPaid(item(sablona,castka,'2026-08-10'),null,false),'označeno jako zaplacené');
  });
});

console.log('\n── legitimní shody MUSÍ dál fungovat ──');

check('"Nájem" ↔ "Nájem srpen" (rozšířený název)',()=>{
  const sb=mkSandbox([tx('Nájem srpen',15000,'2026-08-15')]);
  assert(sb.budouciIsPaid(item('Nájem',15000,'2026-08-10'),null,false),'legitimní shoda se ztratila');
});
check('"ČEZ" ↔ "ČEZ Prodej"',()=>{
  const sb=mkSandbox([tx('ČEZ Prodej',2500,'2026-08-15')]);
  assert(sb.budouciIsPaid(item('ČEZ',2500,'2026-08-10'),null,false));
});
check('shoda i bez diakritiky ("Nájem" ↔ "najem")',()=>{
  const sb=mkSandbox([tx('najem',15000,'2026-08-15')]);
  assert(sb.budouciIsPaid(item('Nájem',15000,'2026-08-10'),null,false),'diakritika rozbila shodu');
});
check('přesná shoda jména',()=>{
  const sb=mkSandbox([tx('Internet',600,'2026-08-15')]);
  assert(sb.budouciIsPaid(item('Internet',600,'2026-08-10'),null,false));
});

console.log('\n── částka rozhoduje ──');

check('záloha 500 NEOZNAČÍ nájem 15 000 jako zaplacený',()=>{
  const sb=mkSandbox([tx('Nájem',500,'2026-08-15')]);
  assert(!sb.budouciIsPaid(item('Nájem',15000,'2026-08-10'),null,false),'označeno i při 30× nižší částce');
});
check('drobná odchylka projde (záloha za energie 2500 vs 2380)',()=>{
  const sb=mkSandbox([tx('Elektřina',2380,'2026-08-15')]);
  assert(sb.budouciIsPaid(item('Elektřina',2500,'2026-08-10'),null,false),'běžná odchylka označena jako neshoda');
});
check('malé částky nespadnou na pár korunách (200 vs 240)',()=>{
  const sb=mkSandbox([tx('Spotify',240,'2026-08-15')]);
  assert(sb.budouciIsPaid(item('Spotify',200,'2026-08-10'),null,false));
});
check('neznámá částka (0) částku neřeší',()=>{
  const sb=mkSandbox([tx('Něco',999,'2026-08-15')]);
  assert(sb.budouciIsPaid(item('Něco',0,'2026-08-10'),null,false),'nulová částka blokuje shodu');
});
check('cizí měna se porovná přes txCZK (100 EUR = 2500 Kč)',()=>{
  const sb=mkSandbox([tx('Hotel',100,'2026-08-15','expense',{wallet:'eur'})]);
  assert(sb.budouciIsPaid(item('Hotel',2500,'2026-08-10'),null,false),'EUR transakce se neporovnala v CZK');
});

console.log('\n── ostatní pravidla beze změny ──');

check('příjem nezaplatí výdajovou položku',()=>{
  const sb=mkSandbox([tx('Nájem',15000,'2026-08-15','income')]);
  assert(!sb.budouciIsPaid(item('Nájem',15000,'2026-08-10'),null,false),'příjem označil výdaj jako zaplacený');
});
check('split-rodič se ignoruje',()=>{
  const sb=mkSandbox([tx('Nájem',15000,'2026-08-15','expense',{splitParent:true})]);
  assert(!sb.budouciIsPaid(item('Nájem',15000,'2026-08-10'),null,false));
});
check('exact=true vyžaduje přesný den',()=>{
  const sb=mkSandbox([tx('Nájem',15000,'2026-08-15')]);
  assert(!sb.budouciIsPaid(item('Nájem',15000,'2026-08-10'),null,true),'jiný den prošel jako shoda');
  assert(sb.budouciIsPaid(item('Nájem',15000,'2026-08-15'),null,true),'stejný den neprošel');
});
check('jiný měsíc se nepočítá',()=>{
  const sb=mkSandbox([tx('Nájem',15000,'2026-07-15')]);
  assert(!sb.budouciIsPaid(item('Nájem',15000,'2026-08-10'),null,false));
});
check('prázdný název nespadne',()=>{
  const sb=mkSandbox([tx('',15000,'2026-08-15')]);
  assert(!sb.budouciIsPaid(item('',15000,'2026-08-10'),null,false));
  assert(!sb.budouciIsPaid(item('Nájem',15000,'2026-08-10'),null,false));
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-281 OVĚŘEN');
process.exit(fails?1:0);
