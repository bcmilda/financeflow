// S25 – Predikce: klik na skutečnou částku → Transakce s filtrem kategorie (+ podkategorie) a měsíce.
const fs=require('fs'),path=require('path'),vm=require('vm');
const find=f=>{for(const d of ['.','js','../js']){const p=path.join(__dirname,d,f);if(fs.existsSync(p))return p;}throw new Error('nenalezeno '+f)};
const pick=(src,n)=>{let i=src.indexOf('function '+n+'(');if(i<0)throw new Error('nenalezeno: '+n);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
const tx=fs.readFileSync(find('transactions.js'),'utf8');
let fails=0;const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};
console.log('── S25 · proklik z Predikce ──');
const el={};const mkEl=id=>el[id]||(el[id]={value:'x',checked:true});
const log=[];
const sb={S:{curMonth:0,curYear:2026},decodeURIComponent,encodeURIComponent,Set,_txDateFilter:{active:true},_txTypeFilter:'income',
  updateMLabel(){log.push('label')},document:{getElementById:mkEl,querySelector:()=>null},window:{scrollTo(){}},
  showPage(n){log.push('page:'+n)},renderTxPage(){log.push('txpage:'+el.txCatFilter.value)},renderTx(){log.push('tx:'+el.txSubFilter.value)}};
vm.createContext(sb);vm.runInContext(pick(tx,'predKlikAttr')+'\n'+pick(tx,'predOtevriTx')+';this.st=()=>({_txDateFilter,_txTypeFilter})',sb);
check('atribut nese kategorii, podkategorii (zakódovanou) a měsíc',()=>{const a=sb.predKlikAttr('cat11','Palivo & olej',9,2026);assert(a.includes("predOtevriTx('cat11','Palivo%20%26%20olej',9,2026)"),a);});
check('klik nastaví měsíc, filtr, vynuluje ostatní filtry a otevře Transakce',()=>{
  sb.predOtevriTx('cat11',encodeURIComponent('Palivo'),9,2026);
  assert(sb.S.curMonth===9&&sb.S.curYear===2026,'měsíc'); assert(el.txCatFilter.value==='cat11'&&el.txSubFilter.value==='Palivo','filtr');
  assert(el.txSearchFilter.value===''&&el.txWalletFilter.value===''&&el.txSearchAllMonths.checked===false,'ostatní filtry');
  assert(sb.st()._txDateFilter.active===false&&sb.st()._txTypeFilter==='all','datum/typ');
  assert(log.join(',')==='label,page:transakce,txpage:cat11,tx:Palivo',log.join(','));
});
check('v tabulce jsou klikací jen skutečné částky (kategorie i podkategorie)',()=>{const r=tx;
  assert(r.includes("actual ? predKlikAttr(cat.id, '', m, y) : ''")&&r.includes('actual ? predKlikAttr(cat.id, sub, m, y)'));});
console.log(fails?`❌ ${fails} selhalo`:'✅ vše prošlo'); process.exit(fails?1:0);
