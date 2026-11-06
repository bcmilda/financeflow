// S25 (v11.30) – zůstatek peněženky KE DNI + import výpisu do peněženky + bankomat = přesun.
const fs=require('fs'),path=require('path'),vm=require('vm');
const find=f=>{for(const d of ['.','js','../js']){const p=path.join(__dirname,d,f);if(fs.existsSync(p))return p;}throw new Error('nenalezeno '+f)};
const pick=(src,n)=>{const i=src.indexOf('function '+n);if(i<0)throw new Error('nenalezeno: '+n);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
const prem=fs.readFileSync(find('premium.js'),'utf8'), imp=fs.readFileSync(find('import.js'),'utf8');
let fails=0;const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};
function sbP(){const sb={String,Math};vm.createContext(sb);
  vm.runInContext(['function findWallet(id,D){return (D.wallets||[]).find(w=>w.id===id)||null}','function getData(){return {}}',
   pick(prem,'_txVytvorenoMs'),pick(prem,'_walletTxPoStavu'),pick(prem,'_walletTxZnak'),pick(prem,'computeWalletBalance'),pick(prem,'walletBalanceAt')].join('\n'),sb);return sb;}
const T0=Date.parse('2026-10-04T08:00:00Z');
console.log('── S25 · zůstatek ke dni ──');
check('stará peněženka bez data = beze změny (počáteční stav + vše)',()=>{
  const sb=sbP(); const D={wallets:[{id:'a',balance:1000}],transactions:[{wallet:'a',type:'income',amount:500,date:'2026-01-01'},{wallet:'a',type:'expense',amount:200,date:'2026-12-01'}]};
  assert(sb.computeWalletBalance('a',D)===1300); assert(sb.walletBalanceAt('a',D,'2026-06-01')===1500); assert(sb.walletBalanceAt('a',D,'2025-12-31')===1000);
});
check('Milanův postup: dnešní zůstatek + import starších transakcí → dnešek se nezmění',()=>{
  const sb=sbP(); const w={id:'a',balance:50000,balanceDate:'2026-10-04',balanceSetAt:T0};
  const D={wallets:[w],transactions:[{wallet:'a',type:'income',amount:30000,date:'2026-09-10',src:'import'},{wallet:'a',type:'expense',amount:20000,date:'2026-09-20',src:'import'}]};
  assert(sb.computeWalletBalance('a',D)===50000,'dnes');
  assert(sb.walletBalanceAt('a',D,'2026-09-15')===70000,'po výplatě, před výdajem: '+sb.walletBalanceAt('a',D,'2026-09-15'));
  assert(sb.walletBalanceAt('a',D,'2026-09-01')===40000,'před výplatou');
});
check('nová transakce po zadání zůstatku se přičte',()=>{
  const sb=sbP(); const w={id:'a',balance:50000,balanceDate:'2026-10-04',balanceSetAt:T0};
  const D={wallets:[w],transactions:[{wallet:'a',type:'expense',amount:300,date:'2026-10-05',id:'id'+(T0+9e6)}]};
  assert(sb.computeWalletBalance('a',D)===49700); assert(sb.walletBalanceAt('a',D,'2026-10-04')===50000);
});
check('stejný den: ručně zapsaná PO nastavení se přičte, import ze stejného dne je obsažený',()=>{
  const sb=sbP(); const w={id:'a',balance:50000,balanceDate:'2026-10-04',balanceSetAt:T0};
  const po={wallet:'a',type:'expense',amount:100,date:'2026-10-04',id:(T0+60000)*16+3};
  const pred={wallet:'a',type:'expense',amount:100,date:'2026-10-04',id:(T0-60000)*16+3};
  const imp={wallet:'a',type:'expense',amount:100,date:'2026-10-04',id:(T0+60000)*16+5,src:'import'};
  assert(sb.computeWalletBalance('a',{wallets:[w],transactions:[po]})===49900,'po');
  assert(sb.computeWalletBalance('a',{wallets:[w],transactions:[pred]})===50000,'před');
  assert(sb.computeWalletBalance('a',{wallets:[w],transactions:[imp]})===50000,'import');
  assert(sb.walletBalanceAt('a',{wallets:[w],transactions:[pred]},'2026-10-03')===50100,'den předtím');
});
check('historie navazuje: zůstatek ke dni = součet pohybů mezi dny',()=>{
  const sb=sbP(); const w={id:'a',balance:1000,balanceDate:'2026-09-15',balanceSetAt:T0};
  const tx=[['2026-09-01',200,'income'],['2026-09-10',50,'expense'],['2026-09-15',30,'expense'],['2026-09-20',400,'income']].map(([date,amount,type],i)=>({wallet:'a',date,amount,type,src:'import'}));
  const D={wallets:[w],transactions:tx}; const b=d=>sb.walletBalanceAt('a',D,d);
  assert(b('2026-09-15')===1000); assert(b('2026-09-14')===1030); assert(b('2026-09-09')===1080); assert(b('2026-08-31')===880); assert(b('2026-09-20')===1400);
  assert(sb.computeWalletBalance('a',D)===1400);
});
check('přesun (pár výdaj+příjem) se promítne do obou peněženek',()=>{
  const sb=sbP(); const D={wallets:[{id:'a',balance:1000},{id:'h',balance:0}],transactions:[{wallet:'a',type:'expense',amount:500,date:'2026-09-01',catId:'transfer'},{wallet:'h',type:'income',amount:500,date:'2026-09-01',catId:'transfer'}]};
  assert(sb.computeWalletBalance('a',D)===500&&sb.computeWalletBalance('h',D)===500);
});
console.log('── S25 · import do peněženky ──');
function sbI(){const sb={String,Object,Array};vm.createContext(sb);
  const i=imp.indexOf('let _importWallet'),j=imp.indexOf('\n}',imp.indexOf('function importNaTransakce'))+2;
  vm.runInContext(imp.slice(i,j)+';this.set=(a,b)=>{_importWallet=a;_importAtmTo=b};this.get=()=>[_importWallet,_importAtmTo];',sb);return sb;}
let n=0;const idFn=()=>++n;
const DW={wallets:[{id:'ucet',type:'account',currency:'CZK'},{id:'hot',type:'cash',currency:'CZK'},{id:'eur',type:'cash',currency:'EUR'}]};
check('pozná výběr z bankomatu (různé zápisy), ne běžný nákup',()=>{
  const sb=sbI(); ['Výběr z bankomatu','VYBER Z ATM 1234','Výběr hotovosti KB','ATM Praha','Bankomat ČSOB'].forEach(x=>assert(sb.importJeBankomat({type:'expense',name:x}),x));
  ['Albert','Platba kartou Shell','Matematika'].forEach(x=>assert(!sb.importJeBankomat({type:'expense',name:x}),x));
  assert(!sb.importJeBankomat({type:'income',name:'Vklad bankomat'}),'příjem není výběr');
});
check('výchozí peněženka: naposledy použitá, jinak první běžný účet; bankomat → první hotovost',()=>{
  let sb=sbI(); sb.importVychoziPenezenky({},DW.wallets); assert(sb.get()[0]==='ucet'&&sb.get()[1]==='hot',sb.get());
  sb=sbI(); sb.importVychoziPenezenky({uiCfg:{importWallet:'eur'}},DW.wallets); assert(sb.get()[0]==='eur');
});
check('řádek dostane peněženku a src import',()=>{const sb=sbI();sb.set('ucet','');const r=sb.importNaTransakce({type:'expense',name:'Albert'},{name:'Albert',type:'expense',amount:100},DW,idFn);assert(r.length===1&&r[0].wallet==='ucet'&&r[0].src==='import');});
check('bankomat → přesun: výdaj z účtu + příjem do hotovosti se stejným transferId',()=>{
  const sb=sbI();sb.set('ucet','hot');const r=sb.importNaTransakce({type:'expense',name:'Výběr z bankomatu'},{name:'Výběr z bankomatu',type:'expense',amount:2000,catId:'cat21'},DW,idFn);
  assert(r.length===2,'2 transakce'); assert(r[0].wallet==='ucet'&&r[0].type==='expense'&&r[0].catId==='transfer');
  assert(r[1].wallet==='hot'&&r[1].type==='income'&&r[1].transferId===r[0].transferId&&r[1].id!==r[0].id);
});
check('bez peněženky nebo do jiné měny se nepřevádí',()=>{
  let sb=sbI();sb.set('','hot');let r=sb.importNaTransakce({type:'expense',name:'ATM'},{type:'expense',amount:1},DW,idFn);assert(r.length===1&&!r[0].wallet);
  sb=sbI();sb.set('ucet','eur');r=sb.importNaTransakce({type:'expense',name:'ATM'},{type:'expense',amount:1},DW,idFn);assert(r.length===1);
});
check('confirmImportInner volá importNaTransakce (žádný přímý push)',()=>{const b=pick(imp,'confirmImportInner');assert(b.includes('importNaTransakce(')&&!b.includes('S.transactions.push({'));});
console.log(fails?`❌ ${fails} selhalo`:'✅ vše prošlo'); process.exit(fails?1:0);
