// FinanceFlow · smoke test · Session 27 (v11.98) · Čistý majetek ke konci vybraného měsíce
//  Milan: „stejná hodnota se objevuje i při přepnutí měsíce… zapnout odečítání od zvoleného
//  zůstatku – možná se tak najdou zapomenuté transakce, když stavy nebudou v souladu“.
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const pr=fs.readFileSync(najdi('premium.js','../js/premium.js'),'utf8');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};

const c={console,toCZK:(v,m)=>m==='EUR'?v*25:v,assetTier:a=>a.liqTier||'fixed',goalGetSaved:id=>id==='g1'?1500:0,
  findWallet:(id,D)=>(D.wallets||[]).find(w=>w.id===id),computeBank:()=>0};
vm.createContext(c);
vm.runInContext(['_txVytvorenoMs','_walletTxPoStavu','_walletTxZnak','computeWalletBalance','walletBalanceAt','_nwDnes','_nwAktivumKDni','_nwZaporneVObdobi','computeNetWorth'].map(n=>pick(pr,n)).join('\n')
  +'\nvar _goalDeposits={g1:[{amount:1000,date:"2025-09-01"},{amount:500,date:"2025-11-01"}]};',c);

//  Hotovost: zůstatek 200 Kč ke dni 15. 10. 2025. Výdaj 1 500 (3. 10.) a příjem 1 000 (10. 10.) jsou
//  v něm už započítané → zpětně: 3.–9. 10. vychází −800 (chybí příjem/vklad před 3. 10.).
const D={
  wallets:[{id:'h',name:'Hotovost',type:'cash',balance:200,balanceDate:'2025-10-15',currency:'CZK'},
           {id:'u',name:'Běžný účet',type:'account',balance:-300,balanceDate:'2025-10-15',currency:'CZK'},
           {id:'e',name:'Eura',type:'savings',balance:100,currency:'EUR'}],
  transactions:[{wallet:'h',type:'expense',amount:1500,date:'2025-10-03'},{wallet:'h',type:'income',amount:1000,date:'2025-10-10'},
                {wallet:'h',type:'expense',amount:50,date:'2025-11-02'},{wallet:'e',type:'income',amount:10,date:'2025-12-01'}],
  wishes:[{id:'g1',isGoal:true}],
  assets:[{name:'Byt',value:120000,valuations:[{d:'2025-06-01',v:100000},{d:'2025-12-01',v:120000}]},
          {name:'Auto',value:5000},{name:'Vklad do cíle',value:999,liqTier:'virtual'}],
  debts:[{remaining:10000}]};

console.log('── dnešní stav (bez dne / aktuální měsíc) ──');
const dnes=c.computeNetWorth(D);
t('bez dne = dnešní stav jako dřív (kDni null)',dnes.kDni===null);
t('hotovost dnes 200 − 50 = 150',dnes.rows.find(r=>r.name==='Hotovost').balance===150,dnes.rows);
t('virtuální peněženka dnes 1 500 (goalGetSaved)',dnes.rows.find(r=>r.isVirtual).balance===1500);
t('aktivum dnes 120 000, Vklad do cíle se nepočítá dvakrát',dnes.totalAssets===125000);
t('budoucí den = dnešní stav',c.computeNetWorth(D,'2999-12-31').kDni===null);

console.log('── ke konci října 2025 ──');
const r=c.computeNetWorth(D,'2025-10-31');
t('kDni = 2025-10-31',r.kDni==='2025-10-31');
t('hotovost 31. 10. = 200 (výdaj 2. 11. ještě nebyl)',r.rows.find(x=>x.name==='Hotovost').balance===200);
t('eurová peněženka bez data: 100 EUR (příjem v prosinci odečten), v součtu 2 500 Kč',r.rows.find(x=>x.name==='Eura').balance===100&&r.rows.find(x=>x.name==='Eura').balanceCZK===2500);
t('virtuální peněženka jen z vkladů do toho dne (1 000)',r.rows.find(x=>x.isVirtual).balance===1000);
const byt=r.assetRows.find(a=>a.name==='Byt'),auto=r.assetRows.find(a=>a.name==='Auto');
t('aktivum z historie hodnoty: poslední zápis do toho dne (100 000)',byt.balance===100000&&!byt.dnes);
t('aktivum bez historie: dnešní hodnota s příznakem „dnes“',auto.balance===5000&&auto.dnes===true);
t('dluhy zůstávají dnešní (10 000)',r.totalDebt===10000);
t('součet: 200 − 300 + 2 500 + 1 000 + 105 000 − 10 000 = 98 400',Math.round(r.total)===98400,r.total);
const zari=c.computeNetWorth(D,'2025-09-30');
t('hotovost 30. 9. = 200 + 1 500 − 1 000 = 700',zari.rows.find(x=>x.name==='Hotovost').balance===700);

console.log('── zapomenuté transakce (mínus v hotovosti / spořáku) ──');
const z=c._nwZaporneVObdobi(D,'2025-10-01','2025-10-31');
t('hotovost v říjnu vychází v mínusu −800 od 3. 10.',z.length===1&&z[0].name==='Hotovost'&&z[0].min===-800&&z[0].den==='2025-10-03',z);
t('běžný účet v mínusu se nehlásí (kontokorent)',!z.some(x=>x.name==='Běžný účet'));
t('září bez problému',c._nwZaporneVObdobi(D,'2025-09-01','2025-09-30').length===0);
t('prázdné období nic nehlásí',c._nwZaporneVObdobi(D,'2025-10-05','2025-10-01').length===0);

console.log('── napojení na kartu ──');
const rn=pick(pr,'renderNetWorth');
t('karta počítá ke konci vybraného měsíce (S.curMonth/S.curYear)',/computeNetWorth\(D, _konec\)/.test(rn)&&/S\.curMonth/.test(rn));
t('karta ukazuje „Stav k …“ a poznámku k dluhům',/📅 Stav k/.test(rn)&&/Dluhy: dnešní stav/.test(rn));
t('karta hlásí mínus v hotovosti/spořáku',/_nwZaporneVObdobi\(D, _od,/.test(rn)&&/v mínusu/.test(rn));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
