// TODO-231 – našeptávač u Transakcí (Název, Poznámka).
// Vzor: nakupShowCatalogSuggest (nakup.js), tagsInputHandler (admin.js).
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('ui.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};

let TX=[];
const els={};
const mkEl=id=>els[id]||(els[id]={style:{display:''},value:'',innerHTML:'',focus(){}});
const sb={console,
  getData(){return {transactions:TX}},
  document:{getElementById:id=>mkEl(id)}};
sb.window=sb; vm.createContext(sb);
vm.runInContext([
  pick('_txFieldFreqList'), pick('txShowNameSuggest'), pick('txHideNameSuggest'), pick('txSelectNameSuggest'),
  pick('txShowNoteSuggest'), pick('txHideNoteSuggest'), pick('txSelectNoteSuggest')
].join('\n'), sb);

const showName=vm.runInContext('txShowNameSuggest',sb);
const selName=vm.runInContext('txSelectNameSuggest',sb);
const showNote=vm.runInContext('txShowNoteSuggest',sb);
const selNote=vm.runInContext('txSelectNoteSuggest',sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};

console.log('── TODO-231 · našeptávač Název/Poznámka ──');

TX=[
  {id:1,name:'Albert Ostrava',note:'týdenní nákup',type:'expense'},
  {id:2,name:'Albert Ostrava',note:'',type:'expense'},
  {id:3,name:'Albert Poruba',note:'týdenní nákup',type:'expense'},
  {id:4,name:'Shell',note:'',type:'expense'},
];

check('pod 2 znaky box schová (prázdné pole při otevření modalu)',()=>{
  showName('a');
  assert(mkEl('txNameSuggest').style.display==='none');
});
check('2+ znaky najdou shodu a četnost',()=>{
  showName('al');
  const html=mkEl('txNameSuggest').innerHTML;
  assert(html.includes('Albert Ostrava'),'chybí Albert Ostrava');
  assert(html.includes('2×'),'špatná četnost (má být 2×)');
  assert(mkEl('txNameSuggest').style.display==='block');
});
check('žádná shoda schová box',()=>{
  showName('neexistujenikde');
  assert(mkEl('txNameSuggest').style.display==='none');
});
check('výběr vyplní pole a zavře box',()=>{
  selName('Albert Ostrava');
  assert(mkEl('txName').value==='Albert Ostrava');
  assert(mkEl('txNameSuggest').style.display==='none');
});
check('poznámka: shoda i četnost',()=>{
  showNote('týd');
  const html=mkEl('txNoteSuggest').innerHTML;
  assert(html.includes('týdenní nákup'));
  assert(html.includes('2×'));
});
check('poznámka: výběr vyplní pole',()=>{
  selNote('týdenní nákup');
  assert(mkEl('txNote').value==='týdenní nákup');
});
check('prázdné name/note se do seznamu nepočítají',()=>{
  showName('shell');
  assert(mkEl('txNameSuggest').innerHTML.includes('1×'),'Shell má být jen 1×, ne víc');
});
check('apostrof v názvu se escapuje (bezpečný onclick)',()=>{
  TX.push({id:5,name:"Kaufland O'Reilly",note:'',type:'expense'});
  showName('kau');
  assert(mkEl('txNameSuggest').innerHTML.includes('&#39;'),'apostrof by rozbil onclick atribut');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ NAŠEPTÁVAČ OVĚŘEN');
process.exit(fails?1:0);
