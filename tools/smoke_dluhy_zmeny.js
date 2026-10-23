// FinanceFlow · smoke test · Session 27 (v12.01) · 📜 Změny půjčky, „Zbývá · ke dni“, historie dluhu
//  Milan: „do formuláře bych přidal mimořádnou splátku i změnu měsíční částky či úroku. Ve hře je
//  také navýšení půjčky či konsolidace… zkrátka si myslím, že se do minulosti můžeme podívat.“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const ds=fs.readFileSync(najdi('debts.js','../js/debts.js'),'utf8'), hp=fs.readFileSync(najdi('helpers.js','../js/helpers.js'),'utf8'), pr=fs.readFileSync(najdi('premium.js','../js/premium.js'),'utf8');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};
const c={console,S:{curMonth:9,curYear:2025}}; vm.createContext(c);
c.calcAnnuity=()=>0; c.getSplatkaCat=()=>({id:'catSpl'});
vm.runInContext(['debtStartStr','debtDatumSplatky','_debtDnes','debtZmeny','debtSplatkyMezi','_debtZmenyUcinek','debtZiveZbyva','debtZbyvaKDni','debtHodnotaKDni','debtKDni','debtOcekavanyZbytek','generateSchedule','debtPlnyPlan','debtAplikujCekajiciSplatky'].map(n=>pick(ds,n)).join('\n')+'\n'+pick(hp,'computeMonthlyDebtPayments')+'\n'+pick(pr,'_sablonaSplatka'),c);

//  Půjčka 100 000 od 15. 1. 2025, podle výpisu ke 30. 6. zbývá 70 000.
//  Navázané splátky: 15. 6. (už ve výpisu), 15. 7., 15. 8. po 5 000. Mimořádná 10 000 (1. 8.),
//  navýšení 20 000 (10. 9.), splátka 4 000 → 5 000 od 1. 10.
const d={id:'d1',total:100000,startDate:'2025-01-15',payment:5000,interest:0,freq:'monthly',
  zmeny:[{id:'a',typ:'mimoradna',den:'2025-08-01',castka:10000},{id:'b',typ:'navyseni',den:'2025-09-10',castka:20000},
         {id:'c',typ:'splatka',den:'2025-10-01',castka:5000,predtim:4000}]};
const D={transactions:[{debtId:'d1',amount:5000,date:'2025-06-15'},{debtId:'d1',amount:5000,date:'2025-07-15'},
  {debtId:'d1',amount:5000,date:'2025-08-15'},{debtId:'jiny',amount:999,date:'2025-08-20'},{debtId:'d1',amount:5000,date:'2025-08-20',splitParent:true}]};
const kotva={den:'2025-06-30',castka:70000};

console.log('── Zbývá · ke dni → dnešní zbytek ──');
const zive=c.debtZiveZbyva(d,D,kotva);
t('dnes = 70 000 − splátky po 30. 6. (10 000) − mimořádná 10 000 + navýšení 20 000 = 70 000',zive===70000,zive);
t('splátka 15. 6. (do dne výpisu) zbytek znovu nesnižuje',c.debtSplatkyMezi(d,D,'2025-06-30','2099-01-01')===10000);
t('cizí půjčka a rozpadlá transakce se nepočítají',c.debtSplatkyMezi(d,D,'2025-08-16','2099-01-01')===0);
t('dnešní nebo budoucí den výpisu = zadaná částka',c.debtZiveZbyva(d,D,{den:'2099-01-01',castka:12345})===12345);

console.log('── zbytek ke dni (historie) ──');
d.remaining=zive;
const kd=den=>c.debtZbyvaKDni(d,D,den);
t('1. 6. 2025: 75 000 (před splátkou 15. 6.)',kd('2025-06-01')===75000,kd('2025-06-01'));
t('30. 6.: 70 000 = výpis',kd('2025-06-30')===70000,kd('2025-06-30'));
t('31. 7.: 65 000',kd('2025-07-31')===65000,kd('2025-07-31'));
t('31. 8.: 50 000 (mimořádná + splátka)',kd('2025-08-31')===50000,kd('2025-08-31'));
t('30. 9.: 70 000 (navýšení)',kd('2025-09-30')===70000,kd('2025-09-30'));
t('dnes / bez dne: živý zbytek',c.debtZbyvaKDni(d,D)===70000&&kd('2999-01-01')===70000);

console.log('── splátka a úrok v čase ──');
t('splátka před změnou = „předtím“ (4 000)',c.debtHodnotaKDni(d,'splatka','2025-09-30')===4000);
t('splátka od 1. 10. = 5 000',c.debtHodnotaKDni(d,'splatka','2025-10-05')===5000);
t('bez změn úroku: aktuální úrok',c.debtHodnotaKDni(d,'urok','2025-01-01')===0);
const u={interest:7,zmeny:[{typ:'urok',den:'2025-03-01',castka:6,predtim:8},{typ:'urok',den:'2025-09-01',castka:7,predtim:6}]};
t('úrok: před 1. změnou 8 %, pak 6 %, od září 7 %',c.debtHodnotaKDni(u,'urok','2025-02-01')===8&&c.debtHodnotaKDni(u,'urok','2025-05-01')===6&&c.debtHodnotaKDni(u,'urok','2025-09-15')===7);
const k=c.debtKDni(d,D,'2025-08-31');
t('půjčka ke 31. 8.: zbývá 50 000, splátka 4 000; originál nezměněn',k.remaining===50000&&k.payment===4000&&d.remaining===70000&&k!==d);

console.log('── kontrola proti splátkovému plánu ──');
const oc=c.debtOcekavanyZbytek(d,'2025-06-30');
t('plán: 100 000 − 6 splátek po 4 000 (15. 1.–15. 6.) = 76 000',oc===76000,oc);
t('bez data začátku / jistiny plán nepočítá',c.debtOcekavanyZbytek({total:0,startDate:'2025-01-01'},'2025-06-30')===null&&c.debtOcekavanyZbytek({total:1000},'2025-06-30')===null);
const s={total:12000,startDate:'2025-01-10',payment:1000,interest:12,freq:'monthly'};
const s3=c.debtOcekavanyZbytek(s,'2025-03-31'); // 12000→+120−1000=11120→+111.2−1000=10231.2→+102.31−1000=9333.5
t('s úrokem 12 % (3 splátky): ~9 334',Math.abs(s3-9334)<=1,s3);

console.log('── konsolidace ──');
const stara={id:'o',remaining:0,zmeny:[{typ:'konsolidace',den:'2025-09-01',castka:30000}]};
t('stará půjčka před konsolidací: 30 000, po ní 0',c.debtZbyvaKDni(stara,{transactions:[]},'2025-08-31')===30000&&c.debtZbyvaKDni(stara,{transactions:[]},'2025-09-02')===0);
const nova={id:'n',remaining:45000,vznik:'2025-09-01'};
t('nová konsolidovaná půjčka před vznikem neexistovala (0)',c.debtZbyvaKDni(nova,{transactions:[]},'2025-08-31')===0);

console.log('── měsíční splátky (DSTI) ──');
const mp=c.computeMonthlyDebtPayments({debts:[{remaining:0,payment:3000},{remaining:100,payment:2000},{payment:1000}]});
t('splacená/uzavřená půjčka (zbývá 0) se do splátek nepočítá',mp===3000,mp);

console.log('── splátkový kalendář od začátku (v12.02) ──');
const dn=new Date(), p2=n=>String(n).padStart(2,'0'), dnes=`${dn.getFullYear()}-${p2(dn.getMonth()+1)}-${p2(dn.getDate())}`;
const r0=new Date(dn.getFullYear(),dn.getMonth()-10,5), start=`${r0.getFullYear()}-${p2(r0.getMonth()+1)}-05`;
const pj={id:'k',total:60000,remaining:40000,payment:2000,interest:0,freq:'monthly',startDate:start};
const fut=c.generateSchedule(pj);
t('kalendář z dnešního zbytku začíná první splátkou ode dneška (dřív datem začátku)',fut.length&&fut[0].date>=dnes&&fut[0].num>1,fut[0]);
t('pořadí splátky od data začátku: 1. budoucí = splátka č. (minulé + 1), 40 000 / 2 000 = 20 splátek',fut.length===20&&fut[fut.length-1].remaining===0);
const pl=c.debtPlnyPlan(pj,{transactions:[]});
t('celý plán: minulé splátky od data začátku z jistiny (60 000)',pl.minule.length>=10&&pl.minule[0].date===start&&pl.minule[0].remaining===58000,pl.minule.slice(0,2));
t('minulé + budoucí navazují (číslo splátky)',pl.vse.length===pl.minule.length+fut.length&&fut[0].num===pl.minule.length+1);
t('dnešní datum odděluje minulé a budoucí',pl.minule.every(x=>x.date<dnes)&&pl.budouci.every(x=>x.date>=dnes));
t('budoucí start (datum začátku v budoucnu) → kalendář od data začátku',c.generateSchedule({remaining:1000,payment:500,startDate:'2999-01-10'})[0].date==='2999-01-10');

console.log('── splátka z Opakované platby (v12.02) ──');
const tx=c._sablonaSplatka({id:'s1',amount:3000,date:'2025-10-05',catId:''},{debtId:'q'});
t('transakce ze šablony: vazba na půjčku, kategorie Splátka, čeká na den splátky',tx.debtId==='q'&&tx.debtCeka===true&&tx.catId==='catSpl');
c.S={debts:[{id:'q',remaining:50000,schedule:[{paid:false},{paid:false}]},{id:'w',remaining:9000,zbyvaKeDni:{den:'2025-12-31',castka:9000}}],
     transactions:[tx,{id:'s2',debtId:'q',amount:3000,date:'2999-01-05',debtCeka:true},{id:'s3',debtId:'w',amount:1000,date:'2025-11-05',debtCeka:true},{id:'s4',debtId:'q',amount:777,date:'2025-01-01'}]};
const n=c.debtAplikujCekajiciSplatky();
t('splátka, jejíž den nastal, sníží Zbývá (50 000 → 47 000) a označí splátku v kalendáři',c.S.debts[0].remaining===47000&&c.S.debts[0].schedule[0].paid===true&&!c.S.transactions[0].debtCeka,c.S.debts[0]);
t('budoucí splátka ze šablony čeká (Zbývá se zatím nemění)',c.S.transactions[1].debtCeka===true);
t('splátka s datem do „Zbývá · ke dni“ zbytek nesníží (už ve výpisu)',c.S.debts[1].remaining===9000&&!c.S.transactions[2].debtCeka);
t('ruční splátka (bez příznaku) se znovu neodečte; podruhé nic',n===2&&c.debtAplikujCekajiciSplatky()===0&&c.S.debts[0].remaining===47000);

console.log('── napojení ──');
const bd=fs.readFileSync(najdi('budouci.js','../js/budouci.js'),'utf8');
t('Budoucí platby: splátka půjčky „zaplacená“ podle vazby na půjčku; Zapsat otevře Dluh/Splátka s půjčkou',/item\.debtId && t\.debtId === item\.debtId && !t\.debtCeka/.test(bd)&&/setTxType\('debt'\); const ds = document\.getElementById\('txDebtId'\); if \(ds\) ds\.value = debtId;/.test(bd));
t('šablony (auto i ručně použitá) zakládají splátku přes _sablonaSplatka a processAutoSablony ji uplatní',(pr.match(/if\(s\.debtId\) _sablonaSplatka\(tx1?, s\)/g)||[]).length===2&&/_sablonaSplatka\(_t, s\)/.test(pr)&&/debtAplikujCekajiciSplatky\(\)\) \{ save\(\)/.test(pr));
t('nová splátka s datem do „ke dni“ zbytek nesnižuje',/!\(debt\.zbyvaKeDni && debt\.zbyvaKeDni\.den && String\(date\)\.slice\(0,10\) <= debt\.zbyvaKeDni\.den\)/.test(ds));
t('uložení půjčky počítá živý zbytek z „ke dni“ a ukládá změny',/obj\.zbyvaKeDni = \{ den: _den, castka: remaining \};\n  obj\.remaining = debtZiveZbyva\(/.test(ds)&&/obj\.zmeny = \(window\._debtZmenyEdit\|\|\[\]\)\.slice\(\)/.test(ds));
t('konsolidace zapíše původní zbytek jako změnu a vznik nové půjčky',/typ: 'konsolidace', den: _debtDnes\(\), castka: od\.remaining/.test(ds)&&/d\.vznik = _debtDnes\(\)/.test(ds));
t('Finanční skóre za minulý měsíc bere dluhy ke konci měsíce (debtKDni)',/\.map\(d => debtKDni\(d, D, _konecM\)\)/.test(pr));
t('Čistý majetek bere dluhy ke dni (debtZbyvaKDni)',/debtZbyvaKDni\(d, D, kDni\)/.test(pr));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
