// TODO-230 – Rodinné souhrny: "Kdo na co utratil" – kombinovaný seznam napříč
// členy domácnosti, ne jen souhrnná čísla za sloupec.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('stats.js','utf8');
// S21: konstanta stropu domácnosti žije MIMO funkci, takže se musí vytáhnout
//   zvlášť – jinak renderFamilySummary spadne na ReferenceError.
const maxDecl=(src.match(/const FAMILY_MAX_MEMBERS = \d+;/)||[''])[0];
const i=src.indexOf('function renderFamilySummary');
let d=0,j=src.indexOf('{',i),end=0;
for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d){end=k+1;break}}}
const body=maxDecl+'\n'+src.slice(i,end);

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
    // FIX-273 detekce: pokud by kód volal incSum/expSum BEZ druhého argumentu (D),
    // txCZK by u partnerovy cizoměnové transakce hledal kurz v MÝCH peněženkách.
    // Sandbox to simuluje: bez D vrátí VŽDY nominál (bez použití amtCZK).
    incSum:(txs,D)=>txs.filter(t=>t.type==='income'&&!t.isBalancing&&!t.splitParent).reduce((a,t)=>a+sb.txCZK(t,D),0),
    expSum:(txs,D)=>txs.filter(t=>t.type==='expense'&&!t.isBalancing&&!t.splitParent).reduce((a,t)=>a+sb.txCZK(t,D),0),
    getActual:()=>0,
    computeBank:()=>0,
    getCat:(id,cats)=>(cats||[]).find(c=>c.id===id),
    // Simuluje SKUTEČNÉ chování txCZK (helpers.js): najde měnu přes peněženku
    // v D.wallets, ale BEZ D spadne na MOJE globální S.wallets (FIX-273 riziko).
    toCZK:(amt,cur)=>amt*({EUR:25}[cur]||1),
    txCZK(t,D){
      if(t.amtCZK!=null) return t.amtCZK;
      const amt=t.amount||t.amt||0;
      if(!t.wallet) return amt;
      const wallets=(D&&D.wallets)||(sb.S&&sb.S.wallets)||[];
      const w=wallets.find(x=>x.id===t.wallet);
      const cur=(w&&w.currency)?w.currency:'CZK';
      if(cur==='CZK') return amt;
      return sb.toCZK(amt,cur);
    },
    isTransferTx:t=>!!(t&&t.transferId),
    fmtB:v=>Math.round(v)+' Kč',
    escHtml:s=>String(s==null?'':s).replace(/</g,'&lt;'),
    _initCatDnD:()=>{},
    requestAnimationFrame:(cb)=>cb(),
    setTimeout:(cb)=>cb(),
    _drawSaldoBarsCalls:[],
    drawSaldoBars(id,labels,data){ sb._drawSaldoBarsCalls.push({id,labels:[...labels],data:[...data]}); }
  };
  sb.window=sb.window; vm.createContext(sb);
  // Výchozí stav pohledu (odpovídá čerstvě načtené appce): všichni členové, 6 měsíců
  vm.runInContext('var _famRange=6, _famMember=null;', sb);
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
  assert(sb.document.getElementById('familyContent').innerHTML.includes('člena domácnosti'),'chybí hláška prázdného stavu');
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

check('FIX-273: partnerova EUR transakce se počítá přes JEJÍ peněženku, ne moje (SKILL 20)',()=>{
  const sb=mkSandbox();
  sb.window._currentUser={uid:'me',displayName:'Milan'};
  sb.S={curMonth:7,curYear:2026,categories:CATS,wallets:[],transactions:[]}; // moje peněženky – partnerin eur_wallet zde NENÍ
  sb.partnerData={'p1':{profile:{displayName:'Petra'},data:{
    categories:CATS, wallets:[{id:'eur_wallet',currency:'EUR'}],
    transactions:[{id:'ptx',type:'expense',catId:'c1',name:'Dovolená',amount:100,wallet:'eur_wallet',date:'2026-08-05'}]
  }}};
  vm.runInContext(body,sb);
  sb.renderFamilySummary.call(sb, {});
  const html=sb.document.getElementById('familyContent').innerHTML;
  // Správně: 100 EUR × 25 = 2500 Kč. Bug (bez D): spadne na moje wallets (nenajde
  // eur_wallet) → CZK nominál → 100 Kč, tedy 25× méně.
  assert(html.includes('2500 Kč'),'Rodinné výdaje nepočítají partnerovu EUR transakci správným kurzem (FIX-273 regrese) – html: '+html.match(/Rodinné výdaje[\s\S]{0,120}/)?.[0]);
  assert(!html.includes('>100 Kč<'),'objevil se nepřevedený nominál – D se nepředává do txCZK');
});

check('graf: drawSaldoBars se zavolá se 6 měsíci a součet odpovídá salda obou členů',()=>{
  const sb=mkSandbox();
  sb.window._currentUser={uid:'me',displayName:'Milan'};
  sb.S={curMonth:7,curYear:2026,categories:CATS,transactions:[
    {id:'m1',type:'income',catId:'c1',name:'Výplata',amount:30000,date:'2026-08-01'},
    {id:'m2',type:'expense',catId:'c1',name:'Nákup',amount:5000,date:'2026-08-05'},
  ]};
  sb.partnerData={'p1':{profile:{displayName:'Petra'},data:{categories:CATS,transactions:[
    {id:'p1',type:'income',catId:'c1',name:'Výplata P',amount:20000,date:'2026-08-01'},
    {id:'p2',type:'expense',catId:'c1',name:'Nákup P',amount:3000,date:'2026-08-05'},
  ]}}};
  vm.runInContext(body,sb);
  sb.renderFamilySummary.call(sb, {});
  assert(sb._drawSaldoBarsCalls.length===1,'drawSaldoBars se nezavolalo přesně jednou');
  const call=sb._drawSaldoBarsCalls[0];
  assert(call.id==='familySaldoChart','špatné id canvasu');
  assert(call.labels.length===6,'graf nemá 6 měsíců, má '+call.labels.length);
  // srpen (poslední měsíc, i=0): (30000-5000)+(20000-3000) = 42000
  assert(call.data[5]===42000,'saldo posledního měsíce neodpovídá součtu obou členů: '+call.data[5]);
});

check('4členná domácnost: VŠICHNI členové se počítají (regrese proti partners[0])',()=>{
  const sb=mkSandbox();
  sb.window._currentUser={uid:'me',displayName:'Táta'};
  sb.window._userProfile={displayName:'Táta',photoURL:null};
  sb.S={curMonth:7,curYear:2026,categories:CATS,transactions:[
    {id:'t1',type:'expense',catId:'c1',name:'Táta nákup',amount:1000,date:'2026-08-05'}]};
  const mk=(nm,amt,id)=>({profile:{displayName:nm,photoURL:null},data:{categories:CATS,transactions:[
    {id:id,type:'expense',catId:'c1',name:nm+' nákup',amount:amt,date:'2026-08-05'}]}});
  sb.partnerData={ p1:mk('Máma',2000,'x1'), p2:mk('Babička',300,'x2'), p3:mk('Děda',400,'x3') };
  vm.runInContext(body,sb);
  sb.renderFamilySummary.call(sb, {});
  const html=sb.document.getElementById('familyContent').innerHTML;
  // 1000+2000+300+400 = 3700. S bugem (jen první partner) by vyšlo 3000.
  assert(html.includes('3700 Kč'),'rodinné výdaje nesečetly všechny členy (bug partners[0] zpět?)');
  ['Táta','Máma','Babička','Děda'].forEach(n=>{
    assert(html.includes(n),'chybí člen domácnosti: '+n);
  });
});

check('žebříček i graf zahrnují všechny členy, ne jen první dva',()=>{
  const sb=mkSandbox();
  sb.window._currentUser={uid:'me',displayName:'Táta'};
  sb.window._userProfile={displayName:'Táta',photoURL:null};
  sb.S={curMonth:7,curYear:2026,categories:CATS,transactions:[
    {id:'t1',type:'income',catId:'c1',name:'Mzda',amount:10000,date:'2026-08-01'}]};
  const mkInc=(nm,amt,id)=>({profile:{displayName:nm},data:{categories:CATS,transactions:[
    {id:id,type:'income',catId:'c1',name:'Mzda '+nm,amount:amt,date:'2026-08-01'}]}});
  sb.partnerData={ p1:mkInc('Máma',8000,'y1'), p2:mkInc('Děda',5000,'y2') };
  vm.runInContext(body,sb);
  sb.renderFamilySummary.call(sb, {});
  const call=sb._drawSaldoBarsCalls[0];
  // 10000+8000+5000 = 23000, žádné výdaje
  assert(call.data[5]===23000,'graf nesečetl příjmy všech členů: '+call.data[5]);
});

// ── filtry a historie (S20) ──
function mkTwoMember(sb){
  sb.window._currentUser={uid:'me',displayName:'Táta'};
  sb.window._userProfile={displayName:'Táta',photoURL:null};
  sb.S={curMonth:7,curYear:2026,categories:CATS,transactions:[
    {id:'t1',type:'expense',catId:'c1',name:'Tátův nákup',amount:1000,date:'2026-08-05'}]};
  sb.partnerData={p1:{profile:{displayName:'Máma'},data:{categories:CATS,transactions:[
    {id:'p1',type:'expense',catId:'c2',name:'Mámin nákup',amount:2000,date:'2026-08-06'}]}}};
}

check('filtr člena zúží ŽEBŘÍČEK, ale ne souhrnná čísla ani graf',()=>{
  const sb=mkSandbox(); mkTwoMember(sb);
  vm.runInContext(body,sb);
  vm.runInContext('_famMember="Máma"; _famRange=6;',sb);
  sb.renderFamilySummary.call(sb, {});
  const html=sb.document.getElementById('familyContent').innerHTML;
  assert(html.includes('Mámin nákup'),'filtrovaný člen chybí v žebříčku');
  assert(!html.includes('Tátův nákup'),'filtr nezúžil žebříček');
  // souhrn musí zůstat za celou domácnost: 1000+2000 = 3000
  assert(html.includes('3000 Kč'),'filtr ovlivnil i souhrnné výdaje domácnosti');
  assert(sb._drawSaldoBarsCalls[0].data[5]===-3000,'filtr ovlivnil i graf: '+sb._drawSaldoBarsCalls[0].data[5]);
});

check('filtr bez výsledku NESKRYJE ovládání a řekne proč je prázdno (FIX-214)',()=>{
  const sb=mkSandbox(); mkTwoMember(sb);
  vm.runInContext(body,sb);
  vm.runInContext('_famMember="Babička"; _famRange=6;',sb); // člen bez výdajů
  sb.renderFamilySummary.call(sb, {});
  const html=sb.document.getElementById('familyContent').innerHTML;
  assert(html.includes('Kdo na co utratil'),'celá sekce zmizela i s filtrem');
  assert(html.includes('setFamMember'),'zmizely přepínače členů – uživatel se nemá jak vrátit');
  assert(html.includes('žádný výdaj nemá'),'prázdný stav nevysvětluje, proč nic nevidí');
});

check('rozsah grafu 12 měsíců dá 12 sloupců',()=>{
  const sb=mkSandbox(); mkTwoMember(sb);
  vm.runInContext(body,sb);
  vm.runInContext('_famMember=null; _famRange=12;',sb);
  sb.renderFamilySummary.call(sb, {});
  assert(sb._drawSaldoBarsCalls[0].labels.length===12,'graf nemá 12 měsíců: '+sb._drawSaldoBarsCalls[0].labels.length);
});

check('přepínač rozsahu ukazuje aktivní volbu',()=>{
  const sb=mkSandbox(); mkTwoMember(sb);
  vm.runInContext(body,sb);
  vm.runInContext('_famMember=null; _famRange=12;',sb);
  sb.renderFamilySummary.call(sb, {});
  const html=sb.document.getElementById('familyContent').innerHTML;
  assert(html.includes('setFamRange(6)')&&html.includes('setFamRange(12)'),'chybí přepínače rozsahu');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ RODINNÉ SOUHRNY OVĚŘENY');
process.exit(fails?1:0);
