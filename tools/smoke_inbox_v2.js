// FinanceFlow · smoke test · Session 27 (v12.06) · 📲 Doručené: duplikáty, banka podle appky, přesuny a investice, karta → peněženka
//  Milan: „notifikace chytila 2× stejnou částku 1168 Kč… já žádné George nemám“ · „nemohu přiřadit
//  některé transakce, protože to jsou Přesuny nebo Investice“ · „můžeme nastavit číslo karty = typ peněženky?“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const sms=R('sms-import.js','../js/sms-import.js'), ib=R('inbox.js','../js/inbox.js');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const S={categories:[{id:'cat1',name:'Jídlo',type:'expense'},{id:'cat_t_invest',name:'Investice',type:'transfer'}],wallets:[{id:'w1',name:'Běžný účet'},{id:'w2',name:'Spořák'}],receipts:[],transactions:[],uiCfg:{}};
const els={};
const c={S,console,Date,Math,JSON,Object,String,Number,parseFloat,Promise,getData:()=>S,getWallets:()=>S.wallets,save(){},showToast(m){c.toast=m},genTxId:()=>'n'+(++c.n),n:0,alert(m){c.alerted=m},
  document:{getElementById:id=>els[id]||null},fetch:async()=>({ok:true,status:200,json:async()=>null}),window:{_currentUser:{uid:'U1',getIdToken:async()=>'tok'}},dupUctenkaPro:()=>null};
vm.createContext(c);
vm.runInContext(sms.replace(/^function renderSmsImport[\s\S]*$/m,'')+'\n'+ib+'\n;this._setIb=v=>{_inbox=v};this._ib=()=>_inbox;this._dupy=()=>_inboxDupy;',c);
const T=Date.parse('2026-10-22T12:16:00');
const plna={app:'KB+',pkg:'cz.kb.mobilnibanka',title:'Platba kartou',text:'Platba 1 168 Kč u obchodníka Alza.cz, 💳 VISA Classic 4779 75** **** 2267.',postedAt:T};
const kratka={app:'KB+',pkg:'cz.kb.mobilnibanka',title:'Platba kartou',text:'Platba 1 168 Kč u obchodníka Alza.cz',postedAt:T+20000};

console.log('── banka podle aplikace, čistý název ──');
const p=c.inboxRozpoznej(plna);
t('notifikace z KB+ = banka KB (dřív George, protože „George:“ je v parseru nepovinné)',p&&p.bank==='KB',p&&p.bank);
t('obchodník bez „u obchodníka“ a bez karty: „Alza.cz“',p&&p.merchant==='Alza.cz',p&&p.merchant);
t('převod z účtu na účet → „Převod na účet …“',c.inboxObchodnik('z účtu 43-1062300257/0100 na účet 27-4908440207/0100.')==='Převod na účet 27-4908440207/0100');
t('George z George zůstane George',c.inboxBankaZAppky('George').bank==='George');

console.log('── duplikáty: tatáž platba 2× ──');
const jina={app:'KB+',pkg:'cz.kb.mobilnibanka',title:'Platba kartou',text:'Platba 64 Kč u obchodníka POTRAVINY GOCZOL',postedAt:T-4*3600e3};
const pozdeji={app:'KB+',pkg:'cz.kb.mobilnibanka',title:'Platba kartou',text:'Platba 1 168 Kč u obchodníka Alza.cz',postedAt:T+3600e3};
const d=c.inboxDuplikaty([['b',kratka],['a',plna],['c',jina],['e',pozdeji]]);
t('zůstane jedna 1 168 Kč s plnějším textem, kratší je duplikát',d.drz.some(([id])=>id==='a')&&!d.drz.some(([id])=>id==='b')&&JSON.stringify(d.dupy.a)==='["b"]',d);
t('jiná částka a stejná částka o hodinu později nejsou duplikát',d.drz.some(([id])=>id==='c')&&d.drz.some(([id])=>id==='e'));
c._setIb({a:Object.assign({},plna),b:Object.assign({},kratka)});
vm.runInContext('_inboxDupy={a:["b"]}',c);
(async()=>{
  els.ib_cat_a={value:'cat1'}; els.ib_wal_a={value:'w1'}; els.ib_name_a={value:''};
  await c.inboxPrijmout('a');
  const ibx=c._ib();
  t('Přidat → transakce vznikne jednou, duplikát označen',S.transactions.length===1&&ibx.a.stav==='prijato'&&ibx.b.stav==='duplikat'&&ibx.b.duplikatK==='a',[S.transactions.length,ibx.b.stav]);

  console.log('── karta → peněženka ──');
  t('identifikátor karty z notifikace: karta:2267',c.inboxIdent(plna)==='karta:2267');
  t('po Přidat s peněženkou se karta zapamatuje',S.uiCfg.inboxPenezenky&&S.uiCfg.inboxPenezenky['karta:2267']==='w1',S.uiCfg);
  t('vlastní účet z převodu: ucet:43-1062300257/0100',c.inboxIdent({text:'Platba 399 Kč z účtu 43-1062300257/0100 na účet 27-4908440207/0100.'})==='ucet:43-1062300257/0100');
  t('protistrana převodu: ucet:27-4908440207/0100',c.inboxProtiucet({text:'Platba 399 Kč z účtu 43-1062300257/0100 na účet 27-4908440207/0100.'},{type:'expense'})==='ucet:27-4908440207/0100');
  t('„Platba kartou 1250 Kč“ není číslo karty',c.inboxIdent({text:'Platba kartou 1250 Kč SHELL'})==='');

  console.log('── přesun a investice ──');
  const prev={app:'KB+',title:'Odchozí platba',text:'Platba 399 Kč z účtu 43-1062300257/0100 na účet 27-4908440207/0100.',postedAt:T+5e6};
  c._setIb({p:prev}); vm.runInContext('_inboxDupy={}',c);
  els.ib_cat_p={value:'presun:w2'}; els.ib_wal_p={value:''}; els.ib_name_p={value:'Na spořák'};
  await c.inboxPrijmout('p');
  t('přesun bez zdrojové peněženky se nezapíše (upozornění)',S.transactions.length===1&&/Vyber peněženku/.test(c.alerted||''));
  els.ib_wal_p={value:'w1'};
  await c.inboxPrijmout('p');
  const par=S.transactions.filter(x=>x.transferId);
  t('přesun = pár transakcí (výdaj z Běžného, příjem na Spořák, společné transferId, kategorie přesun)',par.length===2&&par.find(x=>x.type==='expense').wallet==='w1'&&par.find(x=>x.type==='income').wallet==='w2'&&par.every(x=>x.catId==='transfer'&&x.amount===399),par);
  const inv={app:'KB+',title:'Odchozí platba',text:'Platba 500 Kč z účtu 43-1062300257/0100 na účet 76788295/2010.',postedAt:T+6e6};
  c._setIb({i:inv}); els.ib_cat_i={value:'cat_t_invest'}; els.ib_wal_i={value:'w1'}; els.ib_name_i={value:'Investice'};
  await c.inboxPrijmout('i');
  const ti=S.transactions[S.transactions.length-1];
  t('investice = výdaj s kategorií Investice (jako Přesun → Do aktiv)',ti.type==='expense'&&ti.catId==='cat_t_invest'&&ti.wallet==='w1');
  t('v nabídce kategorií jsou Investice a ↔️ přesun do vlastní peněženky',/optgroup label="📈 Investice a spoření"/.test(ib)&&/↔️ Přesun do vlastní peněženky/.test(ib));
  console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
})();
