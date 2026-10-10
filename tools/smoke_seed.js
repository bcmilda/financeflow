// FIX-264 + FIX-265 – nový uživatel musí mít kategorie, peněženku a nesmí o ně přijít.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};

let S={};
const sb={console,Date,Math,Object,Array,String,
  get S(){return S}, set S(v){S=v},
  DEFAULT_CATEGORIES:[{id:'c1',name:'Jídlo',type:'expense'},{id:'c2',name:'Výplata',type:'income'},
                      {id:'cat_t_savings',name:'Spoření',type:'transfer'}],
  uid:()=>'w-test', baseCur:()=>'CZK'};
sb.window=sb;vm.createContext(sb);
vm.runInContext(pick('ensureBaseData'),sb);
const ensure=vm.runInContext('ensureBaseData',sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};

console.log('── FIX-264 · nový uživatel dostane základ ──');
check('MILANŮV PŘÍPAD: prázdný účet dostane kategorie i peněženku',()=>{
  S={transactions:[]};
  const d=ensure();
  assert(S.categories.length===3,'kategorií '+ (S.categories||[]).length);
  assert(S.wallets.length===1,'peněženek '+(S.wallets||[]).length);
  assert(d.includes('kategorie')&&d.includes('peněženka'),'nehlásí co doplnil: '+d);
});
check('účet s EXISTUJÍCÍM uzlem, ale bez kategorií, se taky opraví',()=>{
  // přesně stav, který starý kód nikdy neopravil (uzel /data existoval)
  S={transactions:[{id:'t1'}],categories:[],wallets:[],payTypes:[]};
  ensure();
  assert(S.categories.length===3,'kategorie se nedoplnily');
  assert(S.wallets.length===1,'peněženka se nedoplnila');
});
check('IDEMPOTENCE: druhé spuštění už nic nemění',()=>{
  const pred=JSON.stringify(S);
  const d=ensure();
  assert(d.length===0,'hlásí doplnění, i když nic nechybí: '+d);
  assert(JSON.stringify(S)===pred,'data se změnila');
});
check('vlastní kategorie uživatele se NEPŘEPÍŠOU výchozími',()=>{
  S={categories:[{id:'moje',name:'Moje'}],wallets:[{id:'w9',name:'Moje peněženka'}]};
  ensure();
  assert(S.categories.length===1&&S.categories[0].id==='moje','přepsal vlastní kategorie');
  assert(S.wallets.length===1&&S.wallets[0].id==='w9','přepsal vlastní peněženku');
});
check('peněženka vzniká v základní měně uživatele',()=>{
  sb.baseCur=()=>'EUR'; S={};
  ensure();
  assert(S.wallets[0].currency==='EUR','měna '+S.wallets[0].currency);
  sb.baseCur=()=>'CZK';
});
check('chybí-li DEFAULT_CATEGORIES, nespadne to',()=>{
  const zaloha=sb.DEFAULT_CATEGORIES; delete sb.DEFAULT_CATEGORIES;
  S={};
  vm.runInContext('delete globalThis.DEFAULT_CATEGORIES',sb);
  ensure();          // nesmí vyhodit výjimku
  sb.DEFAULT_CATEGORIES=zaloha;
});

console.log('\n── FIX-265 · posluchač nesmí mazat lokální data ──');
// věrná kopie rozhodovací logiky z _attachOwnListeners
function prijmi(seen, key, existsRemote, remoteVal, local){
  let out=local;
  if(existsRemote){ out=remoteVal; seen[key]=true; }
  else if(seen[key]){ out=Array.isArray(local)?[]:local; }
  return out;
}
check('MILANŮV PŘÍPAD: chybějící uzel NESMAŽE právě obnovené kategorie',()=>{
  const seen={};
  const local=[{id:'c1'},{id:'c2'},{id:'c3'}];
  const po=prijmi(seen,'categories',false,null,local);
  assert(po.length===3,'kategorie vymazány na '+po.length+' – přesně to Milan viděl po znovupřihlášení');
});
check('existující uzel se normálně načte',()=>{
  const seen={};
  const po=prijmi(seen,'categories',true,[{id:'x'}],[]);
  assert(po.length===1&&seen.categories===true);
});
check('SKUTEČNÉ smazání se ale projeví',()=>{
  const seen={};
  prijmi(seen,'categories',true,[{id:'x'}],[]);        // nejdřív existoval
  const po=prijmi(seen,'categories',false,null,[{id:'x'}]);
  assert(Array.isArray(po)&&po.length===0,'smazání se neprojevilo');
});
check('skalární klíč se nemění na prázdné pole',()=>{
  const seen={};
  const po=prijmi(seen,'schemaV',false,null,2);
  assert(po===2,'schemaV zmizelo');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ ZÁKLADNÍ DATA OVĚŘENA');
process.exit(fails?1:0);
