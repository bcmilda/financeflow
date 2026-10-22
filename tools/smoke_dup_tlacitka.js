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
console.log('── FIX-489 filtr Podezřelé po smazání (v12.04) ──');
const ui=fs.readFileSync(najdi('ui.js','../js/ui.js'),'utf8'), ad=fs.readFileSync(najdi('admin.js','../js/admin.js'),'utf8');
const c2={document:{getElementById:id=>c2.el[id]||null},el:{}}; c2.window=c2; vm.createContext(c2);
const tl=()=>({classList:{_a:false,toggle(n,v){this._a=v}},style:{}});
c2.el['filt-dup']=tl(); c2.el['dupFilterBtn']=tl();
vm.runInContext('let _dupFilterOn=false;\n'+pick(src,'_dupFiltrTlacitka')+'\n'+pick(src,'setDupFilter')+'\nfunction renderTx(){}\n'+pick(src,'toggleDupFilter'),c2);
c2.toggleDupFilter(c2.el['dupFilterBtn']);
t('zapnutí z lišty rozsvítí i tlačítko ⚠️ Podezřelé nahoře',c2.el['filt-dup'].classList._a===true&&c2.el['dupFilterBtn'].classList._a===true);
c2.setDupFilter(false);
t('vypnutí zhasne obě tlačítka',c2.el['filt-dup'].classList._a===false&&c2.el['dupFilterBtn'].classList._a===false);
t('bez podezřelých párů se filtr sám vypne (žádný prázdný seznam)',/if\(!Object\.keys\(_dupMap\|\|\{\}\)\.length && typeof setDupFilter === 'function'\) setDupFilter\(false\);/.test(ui));
t('✕ Vymazat vypne i Podezřelé',/function clearTxFilters\(\) \{[\s\S]{0,700}setDupFilter\(false\)/.test(ad));
t('hláška u chráněné transakce říká, že se nic nesmaže a co udělá OK',/proto se teď nic nesmaže/.test(src)&&/OK = otevřít účtenku v Historii \(nic se nesmaže\)/.test(src));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
