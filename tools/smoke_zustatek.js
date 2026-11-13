// FIX-279 – uploadCoicopToFirebase() byla DRUHÁ cesta do komunity a souhlas
//           nekontrolovala vůbec (FIX-278 opravil jen publishCommunityStats).
// FIX-280 – computeBank/bankSeries volaly incSum/expSum bez D + txCZK fallback
//           sahal do S.wallets i při prohlížení partnera.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('helpers.js','utf8');
const pick=n=>{
  let i=src.indexOf('async function '+n);
  if(i<0) i=src.indexOf('function '+n);
  if(i<0) i=src.indexOf('const '+n+'=');
  if(i<0) throw new Error('nenalezeno: '+n);
  let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)+(src.startsWith('const',i)?';':'')}}};

function mkSandbox(opts){
  opts=opts||{};
  const sb={console,JSON,Object,Array,Set,Map,Date,Math,String,Number,isFinite,Promise};
  sb.S=opts.S||{wallets:[{id:'czk',currency:'CZK'}],curMonth:7,curYear:2026,transactions:[],bank:{startBalance:0}};
  sb.viewingUid=opts.viewingUid||null;
  sb.partnerData=opts.partnerData||{};
  sb._settings=opts.settings;
  sb.CZ_M=['Led','Úno','Bře','Dub','Kvě','Črv','Čvc','Srp','Zář','Říj','Lis','Pro'];
  sb.toCZK=(a,c)=>a*({EUR:25,USD:23}[c]||1);
  sb.isTransferTx=t=>!!(t&&t.transferId);
  sb.getData=()=>sb.viewingUid&&sb.partnerData[sb.viewingUid]?sb.partnerData[sb.viewingUid].data:sb.S;
  sb.getTx=(m,y,D)=>((D||sb.getData()).transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y});
  sb.window={_currentUser:{uid:'me'},_db:{}};
  sb._writes=[];
  sb._set=(ref,val)=>{sb._writes.push({ref,val});return Promise.resolve();};
  sb._ref=(db,p)=>p; sb._db={};
  sb.computeCoicopAggregates=()=>({cats:{},unassigned:0});
  // FIX-307 (S21): uploadCoicopToFirebase publikuje pod PSEUDONYMEM z
  //   users/{uid}/communityId, ne pod uid. V testu stačí stabilní náhrada –
  //   ověřujeme obsah zápisu, ne generování identifikátoru.
  sb.getCommunityId=()=>Promise.resolve('pseudo-me');
  sb.dropLegacyCommunityRecord=()=>Promise.resolve();
  vm.createContext(sb);
  vm.runInContext([
    pick('txCZK'),
    "const incSum=(txs,data)=>txs.filter(t=>t.type==='income'&&!t.isBalancing&&!t.splitParent&&!isTransferTx(t)).reduce((a,t)=>a+txCZK(t,data),0);",
    "const expSum=(txs,data)=>txs.filter(t=>t.type==='expense'&&!t.isBalancing&&!t.splitParent&&!isTransferTx(t)).reduce((a,t)=>a+txCZK(t,data),0);",
    pick('computeBank'), pick('bankSeries'), pick('uploadCoicopToFirebase')
  ].join('\n'),sb);
  // txCZK je deklarovane pres const -> neni property sandboxu, vytahneme ho ven
  sb.txCZK = vm.runInContext('txCZK', sb);
  return sb;
}

let fails=0;
const check=async(n,f)=>{try{await f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

(async()=>{
console.log('── FIX-280 · zůstatek a cizí měna ──');

const PARTNER={
  bank:{startBalance:0},
  wallets:[{id:'eur',currency:'EUR'}],
  transactions:[{id:'p1',type:'income',amount:2000,wallet:'eur',date:'2026-08-01'}]
};

await check('computeBank nad PARTNEROVÝMI daty počítá přes JEHO peněženky',async()=>{
  const sb=mkSandbox();
  const bal=sb.computeBank(PARTNER);
  assert(bal===50000,'zůstatek '+bal+' místo 50000 – D se nepředává do incSum/expSum');
});

await check('bankSeries nad partnerovými daty taky (graf vývoje)',async()=>{
  const sb=mkSandbox();
  const ser=sb.bankSeries(1,PARTNER);
  assert(ser[0].balance===50000,'balance '+ser[0].balance+' místo 50000');
  assert(ser[0].saldo===50000,'saldo '+ser[0].saldo+' místo 50000');
});

await check('txCZK bez D respektuje prohlížení partnera (viewingUid)',async()=>{
  const sb=mkSandbox({viewingUid:'p1',partnerData:{p1:{data:PARTNER}}});
  // volající nepředá D – dřív spadlo na MOJE S.wallets a vyšlo 2000
  const v=sb.txCZK({type:'income',amount:2000,wallet:'eur'});
  assert(v===50000,'txCZK vrátil '+v+' místo 50000 – fallback sahá do S.wallets');
});

await check('bez viewingUid zůstává fallback na vlastní peněženky',async()=>{
  const sb=mkSandbox();
  const v=sb.txCZK({type:'expense',amount:500,wallet:'czk'});
  assert(v===500,'vlastní korunová transakce: '+v);
});

await check('explicitní D má přednost před vším',async()=>{
  const sb=mkSandbox({viewingUid:'p1',partnerData:{p1:{data:PARTNER}}});
  const v=sb.txCZK({type:'expense',amount:100,wallet:'czk'},sb.S);
  assert(v===100,'předané D se ignorovalo: '+v);
});

await check('amtCZK má pořád absolutní přednost (ADR-101)',async()=>{
  const sb=mkSandbox();
  const v=sb.txCZK({amount:100,amtCZK:594,wallet:'eur'});
  assert(v===594,'zafixovaná částka se přepsala: '+v);
});

console.log('\n── FIX-279 · druhá cesta do komunity ──');

const MYDATA={
  bank:{startBalance:0}, wallets:[{id:'czk',currency:'CZK'}],
  transactions:[
    {id:'a',type:'income',amount:40000,wallet:'czk',date:'2026-08-01'},
    {id:'b',type:'expense',amount:10000,wallet:'czk',date:'2026-08-05'},
  ]
};

await check('BEZ souhlasu uploadCoicop NEODESÍLÁ (jádro FIX-279)',async()=>{
  const sb=mkSandbox({settings:{lang:'cs'}});
  await sb.uploadCoicopToFirebase(7,2026,MYDATA);
  assert(sb._writes.length===0,'odeslalo se: '+JSON.stringify(sb._writes));
});

await check('community:false NEODESÍLÁ',async()=>{
  const sb=mkSandbox({settings:{community:false}});
  await sb.uploadCoicopToFirebase(7,2026,MYDATA);
  assert(sb._writes.length===0,'odeslalo se i při výslovném nesouhlasu');
});

await check('SE souhlasem odešle',async()=>{
  const sb=mkSandbox({settings:{community:true}});
  await sb.uploadCoicopToFirebase(7,2026,MYDATA);
  assert(sb._writes.length===1,'neodeslalo se nic');
  // FIX-307: klíčem je pseudonym – uid se v cestě nesmí objevit
  assert(String(sb._writes[0].ref).includes('community/2026-08/users/pseudo-me'),'špatná cesta: '+sb._writes[0].ref);
  assert(!/users\/me$/.test(String(sb._writes[0].ref)),'publikuje se pořád pod uid!');
  assert(sb._writes[0].val.income===40000,'income: '+sb._writes[0].val.income);
});

await check('uploadCoicop počítá příjem přes D (cizí měna)',async()=>{
  const sb=mkSandbox({settings:{community:true}});
  await sb.uploadCoicopToFirebase(7,2026,{
    wallets:[{id:'eur',currency:'EUR'}],
    transactions:[
      {id:'x',type:'income',amount:2000,wallet:'eur',date:'2026-08-01'},
      {id:'y',type:'expense',amount:100,wallet:'eur',date:'2026-08-02'},
    ]});
  assert(sb._writes[0].val.income===50000,'income '+sb._writes[0].val.income+' místo 50000');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ FIX-279 + FIX-280 OVĚŘENY');
process.exit(fails?1:0);
})();
