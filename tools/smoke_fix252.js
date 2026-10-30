// FIX-252 – ověření, že getHistAvg/predictCat filtrují stejně jako getActual.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('helpers.js','utf8');
// vytáhni jen potřebné funkce (zbytek helpers.js závisí na dalších modulech)
const pick=(name,kind)=>{const i=src.indexOf(kind+name); if(i<0) throw new Error('nenalezeno '+name);
  let d=0,j=src.indexOf('{',i); for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d){return src.slice(i,k+1)+(kind.startsWith('const')?';':'');}}}};
const code=[pick('getActual','const '),pick('getHistAvg','function '),pick('predictCat','function ')].join('\n');

let DATA=null, S={curMonth:7,curYear:2026};
const sb={console,Date,Math,JSON,Object,Array,Set,Number,isNaN,get S(){return S},
  SEASON:{0:{mult:1},1:{mult:1},2:{mult:1},3:{mult:1},4:{mult:1},5:{mult:1},6:{mult:1},7:{mult:1},8:{mult:1},9:{mult:1},10:{mult:1},11:{mult:1}},
  getData:()=>DATA,
  getTx:(m,y,D)=>((D||DATA).transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y}),
  txCZK:(t)=>t.amtCZK!=null?t.amtCZK:(t.amount||t.amt||0),
  getCat:(id,cats)=>(cats||[]).find(c=>c.id===id)||{}};
sb.window=sb; vm.createContext(sb);
// v9.81: getActual/getHistAvg nově volají isTransferTx + _transferCatIds
vm.runInContext(src.match(/const isTransferTx=[^\n]*/)[0],sb);
vm.runInContext(code,sb);
const _syncTransferCats=()=>vm.runInContext("window._transferCatIds=new Set(((getData()||{}).categories||[]).filter(c=>c.type==='transfer').map(c=>c.id))",sb);

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

// 3 dokončené měsíce, kategorie c1
function mk(extra){
  const D={categories:[{id:'c1',name:'Jídlo',type:'expense'}],transactions:[]};
  ['2026-05','2026-06','2026-07'].forEach((ym,i)=>{
    D.transactions.push({id:'a'+i,type:'expense',catId:'c1',amount:1000,date:ym+'-10',name:'běžný'});
  });
  (extra||[]).forEach((t,i)=>D.transactions.push(Object.assign({id:'x'+i,type:'expense',catId:'c1'},t)));
  return D;
}
console.log('── FIX-252 · getHistAvg zrcadlí getActual ──');

check('základ: průměr 1000/měs',()=>{
  DATA=mk(); _syncTransferCats();const v=vm.runInContext('getHistAvg("c1",null,7,2026,getData())',sb);
  assert(Math.round(v)===1000,'avg='+v);
});

check('cizí měna se počítá v CZK (2500), ne v nominálu (100)',()=>{
  DATA=mk([{amount:100,amtCZK:2500,date:'2026-06-15',name:'EUR nákup'}]);
  _syncTransferCats();const v=vm.runInContext('getHistAvg("c1",null,7,2026,getData())',sb);
  // červen = 1000+2500 = 3500 → průměr (1000+3500+1000)/3 = 1833
  assert(Math.round(v)===1833,'avg='+v+' (před opravou by vyšlo 1367 – nominál 100)');
});

check('rozdělená transakce se nepočítá dvakrát (rodič s dětmi vyřazen)',()=>{
  DATA=mk([{amount:900,date:'2026-06-05',splitId:'s1',splitParent:true,name:'rodič'},
           {amount:400,date:'2026-06-05',splitId:'s1',name:'dítě A'},
           {amount:500,date:'2026-06-05',splitId:'s1',name:'dítě B'}]);
  _syncTransferCats();const v=vm.runInContext('getHistAvg("c1",null,7,2026,getData())',sb);
  // červen = 1000+400+500 = 1900 → (1000+1900+1000)/3 = 1300
  assert(Math.round(v)===1300,'avg='+v+' (před opravou 1600 – rodič i děti)');
});

check('rodič BEZ dětí zůstává započítaný (neplošné filtrování)',()=>{
  DATA=mk([{amount:700,date:'2026-06-05',splitId:'s9',splitParent:true,name:'osiřelý rodič'}]);
  _syncTransferCats();const v=vm.runInContext('getHistAvg("c1",null,7,2026,getData())',sb);
  assert(Math.round(v)===1233,'avg='+v);
});

check('vyrovnávací transakce se nepočítá',()=>{
  DATA=mk([{amount:5000,date:'2026-06-05',isBalancing:true,name:'vyrovnání'}]);
  _syncTransferCats();const v=vm.runInContext('getHistAvg("c1",null,7,2026,getData())',sb);
  assert(Math.round(v)===1000,'avg='+v);
});

check('KLÍČOVÉ: getHistAvg a getActual dají nad jedním měsícem stejné číslo',()=>{
  DATA=mk([{amount:100,amtCZK:2500,date:'2026-06-15'},
           {amount:900,date:'2026-06-05',splitId:'s1',splitParent:true},
           {amount:400,date:'2026-06-05',splitId:'s1'},
           {amount:500,date:'2026-06-05',splitId:'s1'},
           {amount:5000,date:'2026-06-05',isBalancing:true}]);
  // vyrob data JEN za červen, ať průměr = jeden měsíc
  DATA.transactions=DATA.transactions.filter(t=>t.date.startsWith('2026-06'));
  _syncTransferCats();
  const hist=vm.runInContext('getHistAvg("c1",null,7,2026,getData())',sb);
  const act =vm.runInContext('getActual("c1",null,5,2026,getData())',sb);
  assert(Math.round(hist)===Math.round(act),`predikce ${Math.round(hist)} != skutečnost ${Math.round(act)} – sloupec odchylky by lhal`);
});

check('predictCat fallback (kategorie bez historie) jde přes getActual',()=>{
  DATA={categories:[{id:'c2',name:'Nová',type:'expense'}],
        transactions:[{id:'n1',type:'expense',catId:'c2',amount:100,amtCZK:2500,date:'2026-08-03'}]};
  _syncTransferCats();
  const v=vm.runInContext('predictCat("c2",null,8,2026,getData())',sb);
  assert(v===2500,'fallback='+v+' (před opravou 100 – nominál)');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-252 OVĚŘEN');
process.exit(fails?1:0);
