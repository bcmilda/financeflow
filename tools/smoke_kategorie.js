// S25 (v11.29) – výběr kategorie v transakci: nejčastější + rozbalovací skupiny.
const fs=require('fs'),path=require('path'),vm=require('vm');
const find=f=>{for(const d of ['.','js','../js']){const p=path.join(__dirname,d,f);if(fs.existsSync(p))return p;}throw new Error('nenalezeno '+f)};
const src=fs.readFileSync(find('debts.js'),'utf8');
const i=src.indexOf('const CAT_SKUPINY'),j=src.indexOf('function selCatBtn');
const j2=src.indexOf('\n',j);
let fails=0;const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};
function mk(cats,txs,type='expense'){
  const el={innerHTML:''};
  const sb={S:{categories:cats,transactions:txs},curTxType:type,selCatId:'',selSub:'',customSub:'',Date,Object,Set,
    document:{getElementById:id=>id==='catPicker'?el:{value:''}},renderSubPicker(){} };
  vm.createContext(sb); vm.runInContext(src.slice(i,j2)+'\n;this.CAT_SKUPINY=CAT_SKUPINY;this.st=()=>({_catOpenGrp,_catPickSel});',sb);
  sb.el=el; return sb;
}
const ids=['cat1','cat2','cat3','cat4','cat5','cat11','cat12','cat17','cat20','cat22','cat26','cat36','cat41','cat47'];
const cats=ids.map(id=>({id,name:'K'+id,icon:'•',color:'#123456',type:'expense'})).concat([{id:'idVlastni',name:'Moje',icon:'•',color:'red',type:'expense'},{id:'cat7',name:'Výplata',type:'income',color:'#00ff00'}]);
const d=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
console.log('── S25 · výběr kategorie ──');
check('nejčastější podle posledních 90 dní, starší se nepočítají',()=>{
  const sb=mk(cats,[]);
  const tx=[...Array(5)].map(()=>({catId:'cat22',date:d(3)})).concat([{catId:'cat4',date:d(10)},{catId:'cat4',date:d(11)},{catId:'cat2',date:d(200)},{catId:'cat2',date:d(201)},{catId:'cat2',date:d(202)}]);
  const top=sb.catNejcastejsi(sb.S.categories.filter(c=>c.type==='expense'),tx);
  assert(top[0]==='cat22'&&top[1]==='cat4'&&!top.includes('cat2'),JSON.stringify(top));
});
check('přesuny a cizí typy se nepočítají',()=>{
  const sb=mk(cats,[]); const top=sb.catNejcastejsi(cats.filter(c=>c.type==='expense'),[{catId:'transfer',date:d(1)},{catId:'cat7',date:d(1)}]);
  assert(!top.includes('transfer')&&!top.includes('cat7'));
});
check('bez historie → výchozí sada',()=>{const sb=mk(cats,[]);const top=sb.catNejcastejsi(cats.filter(c=>c.type==='expense'),[]);assert(top[0]==='cat1'&&top.length<=6,JSON.stringify(top));});
check('vlastní kategorie spadne do Ostatní, každá kategorie je právě v jedné skupině',()=>{
  const sb=mk(cats,[]); const ex=cats.filter(c=>c.type==='expense'); const g=sb.catDoSkupin(ex);
  const all=g.flatMap(x=>x.cats.map(c=>c.id)); assert(all.length===ex.length&&new Set(all).size===all.length,'duplicita/chybí');
  assert(g.find(x=>x.n==='Ostatní').cats.some(c=>c.id==='idVlastni'));
});
check('výchozí skupiny nemají duplicitní ID',()=>{const sb=mk(cats,[]);const a=sb.CAT_SKUPINY.flatMap(g=>g.ids);assert(new Set(a).size===a.length);});
check('render: nejčastější + skupiny, výběr mimo top rozbalí svou skupinu',()=>{
  const sb=mk(cats,[{catId:'cat1',date:d(1)}]); sb.selCatId='cat47'; vm.runInContext('selCatId="cat47";renderCatPicker()',sb);
  const h=sb.el.innerHTML; assert(h.includes('NEJČASTĚJŠÍ')&&h.includes('VŠECHNY KATEGORIE'));
  assert(sb.st()._catOpenGrp==='Zdraví a péče',sb.st()._catOpenGrp); assert(h.includes("selCatBtn('cat47')"));
});
check('příjmy (málo kategorií) → jen mřížka bez skupin',()=>{
  const sb=mk(cats,[],'income'); vm.runInContext('curTxType="income";renderCatPicker()',sb); assert(!sb.el.innerHTML.includes('VŠECHNY')&&sb.el.innerHTML.includes('catp-grid'));
});
check('nehex barva nerozbije styl',()=>{const sb=mk(cats,[]);vm.runInContext('renderCatPicker()',sb);assert(!sb.el.innerHTML.includes('red1f'));});
console.log(fails?`❌ ${fails} selhalo`:'✅ vše prošlo'); process.exit(fails?1:0);
