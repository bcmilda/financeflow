// TODO-230 – Rodinné souhrny: "Kdo na co utratil" – kombinovaný seznam napříč
// členy domácnosti, ne jen souhrnná čísla za sloupec.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('stats.js','utf8');
const i=src.indexOf('function renderFamilySummary');
let d=0,j=src.indexOf('{',i),end=0;
for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d){end=k+1;break}}}
const body=src.slice(i,end);

function mkSandbox(){
  const els={};
  const doc={ getElementById(id){ if(!els[id]) els[id]={value:'',innerHTML:'',textContent:''}; return els[id]; } };
  const sb={
    console, Date, Math, Object, Array, String, Number, isNaN,
    document:doc, els,
    window:{_currentUser:{uid:'me',displayName:'Milan'},_userProfile:{displayName:'Milan',photoURL:null}},
    S:{curMonth:7,curYear:2026},
    CZ_M:['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'],
    partnerData:{},
    getTx:(m,y,D)=>((D||{}).transactions||[]).filter(t=>{const dt=new Date(t.date);return dt.getMonth()===m&&dt.getFullYear()===y}),
    incSum:(txs,D)=>txs.filter(t=>t.type==='income'&&!t.isBalancing&&!t.splitParent).reduce((a,t)=>a+sb.txCZK(t,D),0),
    expSum:(txs,D)=>txs.filter(t=>t.type==='expense'&&!t.isBalancing&&!t.splitParent).reduce((a,t)=>a+sb.txCZK(t,D),0),
    getActual:()=>0,
    computeBank:()=>0,
    getCat:(id,cats)=>(cats||[]).find(c=>c.id===id),
    txCZK:(t)=>t.amtCZK!=null?t.amtCZK:(t.amount||t.amt||0),
    isTransferTx:t=>!!(t&&t.transferId),
    fmtB:v=>Math.round(v)+' Kč',
    escHtml:s=>String(s==null?'':s).replace(/</g,'&lt;'),
    _initCatDnD:()=>{}
  };
  sb.window=sb.window; vm.createContext(sb);
  return sb;
}

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

console.log('── TODO-230 · Kdo na co utratil (rodinné souhrny) ──');

const CATS=[{id:'c1',name:'Jídlo',icon:'🍔',type:'expense'},{id:'c2',name:'Doprava',icon:'🚗',type:'expense'}];

check('bez partnerů se seznam vůbec nevykreslí (žádná chyba)',()=>{
  const sb=mkSandbox();
  sb.S_data={categories:CATS,transactions:[]};
  vm.runInContext(body,sb);
  sb.renderFamilySummary.call(sb, {});
  // partnerData prázdné -> funkce skončí na "Zatím nemáš partnery" hlášce
  assert(sb.document.getElementById('familyContent').innerHTML.includes('partnery'),'chybí hláška o chybějících partnerech');
});

check('kombinovaný seznam obsahuje transakce OBOU členů, seřazené podle částky',()=>{
  const sb=mkSandbox();
  sb.window._currentUser={uid:'me',displayName:'Milan'};
  sb.S={curMonth:7,curYear:2026};
  sb.getData=()=>({categories:CATS,transactions:[
    {id:'m1',type:'expense',catId:'c1',name:'Albert',amount:500,date:'2026-08-05'},
    {id:'m2',type:'expense',catId:'c2',name:'Benzín',amount:1200,date:'2026-08-06'},
  ]});
  // vlastní data jsou v S (globální) přes m.data:S
  sb.S={curMonth:7,curYear:2026,categories:CATS,transactions:[
    {id:'m1',type:'expense',catId:'c1',name:'Albert',amount:500,date:'2026-08-05'},
    {id:'m2',type:'expense',catId:'c2',name:'Benzín',amount:1200,date:'2026-08-06'},
  ]};
  sb.partnerData={'p1':{profile:{displayName:'Petra',photoURL:null},data:{categories:CATS,transactions:[
    {id:'p1tx',type:'expense',catId:'c1',name:'Rohlík',amount:100,date:'2026-08-07'},
    {id:'p2tx',type:'expense',catId:'c2',name:'Kabelka',amount:3000,date:'2026-08-08'},
  ]}}};
  vm.runInContext(body,sb);
  sb.renderFamilySummary.call(sb, {});
  const html=sb.document.getElementById('familyContent').innerHTML;
  assert(html.includes('Kdo na co utratil'),'chybí nový nadpis sekce');
  assert(html.includes('Kabelka'),'chybí Petřina nejdražší položka');
  assert(html.includes('Petra'),'jméno člena chybí u položky');
  assert(html.includes('Milan'),'jméno druhého člena chybí');
  // Kabelka (3000) musí být PŘED Benzínem (1200) - seřazeno sestupně
  assert(html.indexOf('Kabelka') < html.indexOf('Benzín'),'seznam není seřazený podle částky sestupně');
});

check('transfer, split-rodič a vyrovnání se do žebříčku NEDOSTANOU (SKILL 20)',()=>{
  const sb=mkSandbox();
  sb.window._currentUser={uid:'me',displayName:'Milan'};
  sb.S={curMonth:7,curYear:2026,categories:CATS,transactions:[
    {id:'t1',type:'expense',catId:'c1',name:'Normální nákup',amount:400,date:'2026-08-05'},
    {id:'t2',type:'expense',catId:'c1',name:'Přesun na spoření',amount:99999,date:'2026-08-05',transferId:'x'},
    {id:'t3',type:'expense',catId:'c1',name:'Split rodič',amount:88888,date:'2026-08-05',splitParent:true,splitId:'s1'},
    {id:'t4',type:'expense',catId:'c1',name:'Vyrovnání',amount:77777,date:'2026-08-05',isBalancing:true},
  ]};
  sb.partnerData={'p1':{profile:{displayName:'Petra'},data:{categories:CATS,transactions:[]}}};
  vm.runInContext(body,sb);
  sb.renderFamilySummary.call(sb, {});
  const html=sb.document.getElementById('familyContent').innerHTML;
  assert(!html.includes('Přesun na spoření'),'přesun se objevil v žebříčku útrat');
  assert(!html.includes('Split rodič'),'split-rodič se objevil (počítal by se dvakrát s dětmi)');
  assert(!html.includes('Vyrovnání'),'vyrovnávací korekce se objevila jako útrata');
  assert(html.includes('Normální nákup'),'legitimní útrata chybí');
});

check('bez výdajů v měsíci se nová sekce vůbec nevykreslí (prázdný seznam = žádný box)',()=>{
  const sb=mkSandbox();
  sb.window._currentUser={uid:'me',displayName:'Milan'};
  sb.S={curMonth:7,curYear:2026,categories:CATS,transactions:[]};
  sb.partnerData={'p1':{profile:{displayName:'Petra'},data:{categories:CATS,transactions:[]}}};
  vm.runInContext(body,sb);
  sb.renderFamilySummary.call(sb, {});
  const html=sb.document.getElementById('familyContent').innerHTML;
  assert(!html.includes('Kdo na co utratil'),'prázdná sekce se přesto vykreslila');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ RODINNÉ SOUHRNY OVĚŘENY');
process.exit(fails?1:0);
