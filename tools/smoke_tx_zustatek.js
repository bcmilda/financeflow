// FinanceFlow · smoke test · Session 27 (v11.90) · zůstatek v závorce v Transakcích (FIX-484)
//  Milan: „co znamená zelené číslo v závorce a proč nesedí výpočty?"
//  Data ze screenshotu 16.–18. 10. 2026: Penny −145,40 (37 357,27), MOL −1 022,40 (36 334,87),
//  Auto – Palivo −988,40 (35 346,47), Hostinec −1 017 (34 329,47).
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const ui=R('ui.js','../js/ui.js'), prem=R('premium.js','../js/premium.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

const ctx={console,window:{}};vm.createContext(ctx);
vm.runInContext(['_txVytvorenoMs','_walletTxPoStavu','_walletTxZnak','findWallet','computeWalletBalance'].map(n=>{try{return pick(prem,n)}catch(e){return ''}}).join('\n')
  +'\n'+pick(ui,'_txChronoCmp')+'\n'+pick(ui,'txZustatkyPoTransakci'),ctx);
if(typeof ctx.findWallet!=='function') vm.runInContext('function findWallet(id,D){return (D.wallets||[]).find(w=>w.id===id)}',ctx);

// id = genTxId (ms×16) → čas vzniku; Penny zapsaná první, pak MOL, pak ruční palivo; uložené v jiném pořadí
const ms=s=>Date.parse(s)*16;
const tx=[
  {id:ms('2026-10-18T20:00:00Z'),name:'Hostinec',type:'expense',amount:1017,date:'2026-10-18',wallet:'w1'},
  {id:ms('2026-10-16T19:00:00Z'),name:'Auto – Palivo',type:'expense',amount:988.40,date:'2026-10-16',wallet:'w1'},
  {id:ms('2026-10-16T09:00:00Z'),name:'Penny',type:'expense',amount:145.40,date:'2026-10-16',wallet:'w1'},
  {id:ms('2026-10-16T12:00:00Z'),name:'MOL',type:'expense',amount:1022.40,date:'2026-10-16',wallet:'w1'},
  {id:ms('2026-10-01T08:00:00Z'),name:'Výplata',type:'income',amount:30000,date:'2026-10-01',wallet:'w1'},
];
const D={wallets:[{id:'w1',balance:7502.67}],transactions:tx};

console.log('── pořadí uvnitř dne = pořadí výpočtu zůstatku ──');
const desc=tx.slice().sort((a,b)=>-ctx._txChronoCmp(a,b)).map(x=>x.name);
t('seznam od nejnovějšího: Hostinec, Auto, MOL, Penny, Výplata',JSON.stringify(desc)===JSON.stringify(['Hostinec','Auto – Palivo','MOL','Penny','Výplata']),desc);
const M=ctx.txZustatkyPoTransakci(D);
const shora=tx.slice().sort((a,b)=>-ctx._txChronoCmp(a,b)).map(x=>M[x.id]);
t('zůstatky shora dolů jen rostou (žádné skákání) – čteno pozpátku po výdajích',shora.slice(0,4).every((v,i,a)=>i===0||v>a[i-1]),shora);
t('čísla jako na screenshotu: 34 329,47 · 35 346,47 · 36 334,87 · 37 357,27',JSON.stringify(shora.slice(0,4))==='[34329.47,35346.47,36334.87,37357.27]',shora);
t('ui.js: řazení podle data používá _txChronoCmp',/if\(_txSort==='date'\)\{ const c=_txChronoCmp\(a,b\); return _txSortDir==='desc' \? -c : c; \}/.test(ui));
t('ui.js: renderTx bere zůstatky z txZustatkyPoTransakci',/window\._txBalMap = txZustatkyPoTransakci\(D\);/.test(ui));

console.log('── poslední zůstatek v závorce = zůstatek v Peněženkách ──');
t('bez data zůstatku: konec = computeWalletBalance',M[tx[0].id]===Math.round(ctx.computeWalletBalance('w1',D)*100)/100,[M[tx[0].id],ctx.computeWalletBalance('w1',D)]);
//  zůstatek ke dni 16. 10. (výpis) = 35 346,47 – Penny, MOL i palivo už jsou v něm (import)
const D2={wallets:[{id:'w1',balance:35346.47,balanceDate:'2026-10-16',balanceSetAt:Date.parse('2026-10-17T00:00:00Z')}],
  transactions:tx.map(x=>x.date==='2026-10-16'?Object.assign({},x,{src:'import'}):x)};
const M2=ctx.txZustatkyPoTransakci(D2);
t('se zůstatkem ke dni: po palivu 35 346,47, po Hostinci 34 329,47',M2[tx[1].id]===35346.47&&M2[tx[0].id]===34329.47,M2);
t('se zůstatkem ke dni: konec = computeWalletBalance (dřív o 27 844 Kč víc)',M2[tx[0].id]===Math.round(ctx.computeWalletBalance('w1',D2)*100)/100,[M2[tx[0].id],ctx.computeWalletBalance('w1',D2)]);
t('rozdělená platba (rodič s peněženkou, části bez) se do zůstatku počítá jako v Peněženkách',
  ctx.txZustatkyPoTransakci({wallets:[{id:'w1',balance:1000}],transactions:[{id:1,type:'expense',amount:300,date:'2026-10-02',wallet:'w1',splitParent:true,splitId:'s'},{id:2,type:'expense',amount:100,date:'2026-10-02',splitId:'s'},{id:3,type:'expense',amount:200,date:'2026-10-02',splitId:'s'}]})[1]===700);
t('přesun do jiné peněženky snižuje zůstatek, transakce bez peněženky zůstatek nemá',
  (()=>{const m=ctx.txZustatkyPoTransakci({wallets:[{id:'a',balance:500},{id:'b',balance:0}],transactions:[{id:'x1',type:'expense',category:'transfer',amount:200,date:'2026-10-03',wallet:'a'},{id:'x2',type:'income',category:'transfer',amount:200,date:'2026-10-03',wallet:'b'},{id:'x3',type:'expense',amount:50,date:'2026-10-03'}]});return m.x1===300&&m.x2===200&&!('x3' in m)})());

console.log(`\n${ok} ✅  ${bad} ❌`);
process.exit(bad?1:0);
