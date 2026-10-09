// S25 – duplicitní účtenky (vidět je, smazat i s transakcí), Obchody (jedinečné ID řádku),
// karta výrobku (cena nepřetéká).
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const rc=fs.readFileSync(najdi('receipts.js','../js/receipts.js'),'utf8');
const pick=n=>{let i=rc.indexOf('function '+n+'(');let d=0,j=rc.indexOf('{',i);for(let k=j;k<rc.length;k++){if(rc[k]==='{')d++;else if(rc[k]==='}'){d--;if(!d)return rc.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{c?(ok++,console.log('  ✅',n)):(bad++,console.log('  ❌',n,i===undefined?'':JSON.stringify(i)));};
console.log('── S25 · duplicitní účtenky ──');
const r1={store:'LIDL',date:'2026-10-06',total:46.8,items:[1,2,3]}, r2={...r1}, r3={store:'PENNY',date:'2026-10-05',total:100,items:[1],addedAt:777};
const tx=[{id:1,type:'expense',receiptStore:'LIDL',receiptDate:'2026-10-06',amount:46.8,note:'📸 Naskenováno'},
          {id:2,type:'expense',receiptStore:'LIDL',receiptDate:'2026-10-06',amount:46.8,note:'📸 Naskenováno'},
          {id:3,type:'expense',receiptAddedAt:777,amount:100,receiptStore:'PENNY'},{id:4,type:'expense',name:'Jiný',amount:46.8,date:'2026-10-06'}];
const c={S:{receipts:[r1,r2,r3],transactions:tx.slice()},confirm:()=>true,alert(m){c.msg=m},save(){},renderUctenky(){},normalizeStoreName:s=>String(s||'').toUpperCase(),Math,Set,String};
vm.createContext(c); vm.runInContext(pick('rcptNajdiTx')+'\n'+pick('removeDuplicateReceipts'),c);
t('transakce účtenky: nová podle vazby receiptAddedAt',c.rcptNajdiTx(r3,c.S).id===3);
t('transakce účtenky: starší podle obchodu, data a částky (ne cizí transakce)',c.rcptNajdiTx(r1,c.S).id===1);
c.removeDuplicateReceipts();
t('smazání duplikátu: zmizí kopie účtenky i JEDNA její transakce, originál zůstane',c.S.receipts.length===2&&c.S.transactions.length===3&&c.S.transactions.some(x=>x.id===1)&&!c.S.transactions.some(x=>x.id===2),c.S.transactions.map(x=>x.id));
t('cizí transakce se stejnou částkou zůstala',c.S.transactions.some(x=>x.id===4));
t('hláška počítá i transakci',/1 transakce/.test(c.msg),c.msg);
t('banner: správné skloňování a seznam duplikátů',rc.includes("'duplicitní účtenka'")&&rc.includes('<summary style="cursor:pointer;color:var(--bank)">Zobrazit</summary>'));
t('nová účtenka má vazbu na transakci',rc.includes('receiptAddedAt: _addedAt,')&&(rc.includes('S.receipts.unshift({...receipt,')&&rc.includes('addedAt:_addedAt});')));
t('smazání účtenky nabídne smazat i transakci',pick('deleteReceipt').includes('rcptNajdiTx(_r, S)'));
console.log('── S25 · Obchody a karta výrobku ──');
t('ID řádku obchodu z pořadí (Můj/Môj už nekolidují)',rc.includes("const storeId = 'store_'+sIdx+'_'+store"));
t('karta výrobku: cena v samostatném sloupci, obchod pod názvem',rc.includes('<span class="v" style="text-align:right;font-weight:700">${n.cena ? _mapaKc(n.cena)'));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); if(bad) process.exitCode=1;
