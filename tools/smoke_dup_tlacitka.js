// FinanceFlow · smoke test · Session 27 (v12.03) · FIX-488 tlačítka duplikátu v řádku se týkají TOHO řádku
//  Milan: „chtěl jsem smazat duplicity, schválně jsem klikl na položku, kde není foťák (ruční transakce),
//  přesto upozornění si myslí něco jiného“ – „Smazat duplikát“ v řádku mazalo tu DRUHOU (z účtenky).
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const src=fs.readFileSync(najdi('duplicates.js','../js/duplicates.js'),'utf8');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':i)}};
const c={volano:[]}; vm.createContext(c);
vm.runInContext(pick(src,'buildDupActions')+'\nfunction dupMerge(keep,del){volano.push([keep,del])} function dupIgnore(){}',c);
const html=c.buildDupActions({id:'RUCNI'},{RUCNI:[{otherId:'UCTENKA'}]},false);
const klik=lbl=>{const i=html.indexOf(lbl);const s=html.lastIndexOf('onclick="',i);const e=html.indexOf('"',s+9);return html.slice(s+9,e).replace('event.stopPropagation();','');};
c.volano=[]; vm.runInContext(klik('Smazat duplikát'),c);
t('„🗑 Smazat duplikát“ v řádku smaže TENHLE řádek (ruční), druhý (z účtenky) zůstane',JSON.stringify(c.volano)==='[["UCTENKA","RUCNI"]]',JSON.stringify(c.volano));
c.volano=[]; vm.runInContext(klik('Zachovat tento'),c);
t('„✅ Zachovat tento“ nechá tenhle řádek a smaže ten druhý',JSON.stringify(c.volano)==='[["RUCNI","UCTENKA"]]',JSON.stringify(c.volano));
t('okno Detail beze změny: tlačítka u shody se týkají shody',/dupMerge\('\$\{txId\}','\$\{dup\.otherId\}'\)">\s*🗑 Smazat tuto shodu/.test(src)&&/dupMerge\('\$\{dup\.otherId\}','\$\{txId\}'\)">\s*✅ Zachovat tuto shodu/.test(src));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
