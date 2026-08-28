// DŮKAZ: co by se stalo, kdyby getActual() plošně vyloučila přesuny.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/mnt/project/helpers.js','utf8');
const pick=(n,k)=>{const i=src.indexOf(k+n);let d=0,j=src.indexOf('{',i);
  for(let x=j;x<src.length;x++){if(src[x]==='{')d++;else if(src[x]==='}'){d--;if(!d)return src.slice(i,x+1)+(k.startsWith('const')?';':'')}}};
let DATA=null;
const sb={console,Date,Math,Set,Object,Array,Number,isNaN,get S(){return{curMonth:7,curYear:2026}},
  getData:()=>DATA,txCZK:t=>t.amtCZK!=null?t.amtCZK:(t.amount||t.amt||0)};
sb.window=sb;vm.createContext(sb);
vm.runInContext(src.match(/const isTransferTx=[^\n]*/)[0],sb);
vm.runInContext(pick('getActual','const '),sb);
// varianta B: plošné vyloučení přesunů
vm.runInContext(pick('getActual','const ').replace('const getActual=','const getActualBlanket=')
  .replace("t.type==='expense'&&!t.isBalancing","t.type==='expense'&&!t.isBalancing&&!isTransferTx(t)"),sb);
// varianta C: vyloučit přesuny JEN u nepřesunových kategorií
vm.runInContext(pick('getActual','const ').replace('const getActual=','const getActualSmart=')
  .replace("t.type==='expense'&&!t.isBalancing","t.type==='expense'&&!t.isBalancing&&(window._transferCatIds&&window._transferCatIds.has(catId)?true:!isTransferTx(t))"),sb);

DATA={categories:[
  {id:'cat_t_savings',name:'Spoření',type:'transfer',isSaving:true},
  {id:'cat_t_invest', name:'Investice',type:'transfer',isSaving:true},
  {id:'cat32',name:'Půjčka',type:'both'},
  {id:'cat20',name:'Jídlo',type:'expense'}],
 transactions:[
  {id:'1',type:'expense',catId:'cat_t_savings',amount:5000,date:'2026-08-05',name:'do rezervy'},
  {id:'2',type:'expense',catId:'cat_t_invest', amount:3000,date:'2026-08-06',name:'ETF'},
  {id:'3',type:'expense',catId:'cat32',transferId:'tr1',amount:4000,date:'2026-08-07',name:'přesun pod Půjčkou'},
  {id:'4',type:'expense',catId:'cat32',amount:1500,date:'2026-08-08',name:'skutečná splátka'},
  {id:'5',type:'expense',catId:'cat20',amount:2200,date:'2026-08-09',name:'potraviny'}]};
vm.runInContext("window._transferCatIds=new Set(getData().categories.filter(c=>c.type==='transfer').map(c=>c.id))",sb);

const g=(f,c)=>vm.runInContext(`${f}("${c}",null,7,2026,getData())`,sb);
const rows=[['Spoření (isSaving)','cat_t_savings'],['Investice (isSaving)','cat_t_invest'],
            ['Půjčka (both, obsahuje přesun 4000)','cat32'],['Jídlo (čistý výdaj)','cat20']];
console.log('kategorie                              DNES   plošně  chytře');
rows.forEach(([n,c])=>console.log(n.padEnd(38),
  String(g('getActual',c)).padStart(6),String(g('getActualBlanket',c)).padStart(7),String(g('getActualSmart',c)).padStart(7)));

const savCats=DATA.categories.filter(c=>c.isSaving);
const sum=f=>savCats.reduce((a,c)=>a+g(f,c.id),0);
console.log('\n── DOPAD NA SKÓRE (totalSaved v premium.js:1520 a projects.js:512) ──');
console.log('  dnes  :',sum('getActual'),'Kč');
console.log('  plošně:',sum('getActualBlanket'),'Kč  ← S4 „Aktivní spoření" spadne na nulu');
console.log('  chytře:',sum('getActualSmart'),'Kč  ← beze změny');
