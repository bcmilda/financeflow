// FinanceFlow · smoke test · Session 27 (v12.08) · jednotky množství u položek účtenek
//  Milan: „u EVO paliva mi to ukazuje 67 kg/l a u Detektoru úspor zase 67 ks – nesedí jednotky“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const hl=R('helpers.js','../js/helpers.js'), vz=R('vozidla.js','../js/vozidla.js'), rc=R('receipts.js','../js/receipts.js'), pj=R('projects.js','../js/projects.js'), sp=R('statistika-polozek.js','../js/statistika-polozek.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
const radek=(s,z)=>s.split('\n').find(l=>l.startsWith(z));
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const c={console,Math,parseFloat,Set,String}; c.window=c; vm.createContext(c);
vm.runInContext([radek(vz,'const TANK_NE_RE'),radek(vz,'const TANK_PALIVO_SILNE_RE'),pick(vz,'_tankKc'),pick(vz,'tankJePalivo'),pick(hl,'polozkaJednotka'),pick(hl,'jednotkySouhrn')].join('\n'),c);

console.log('── jednotka jedné položky ──');
t('EVO 95, 41,5 l za 1 580 Kč → l',c.polozkaJednotka({name:'EVO 95',qty:41.5,price:38.07})==='l');
t('vážené banány (unit kg) → kg',c.polozkaJednotka({name:'Banány',qty:0.84,price:29.9,unit:'kg'})==='kg');
t('rohlík → ks',c.polozkaJednotka({name:'Rohlík 43g',qty:4,price:2.9})==='ks');
t('káva na pumpě (Latte) není palivo → ks',c.polozkaJednotka({name:'EVO Latte',qty:1,price:59})==='ks');
console.log('── souhrn ──');
t('samé litry → l, samé kusy → ks',c.jednotkySouhrn(['l','l'])==='l'&&c.jednotkySouhrn(['ks'])==='ks'&&c.jednotkySouhrn([])==='ks');
t('kusy i váha → kg/ks (nesčítá se)',c.jednotkySouhrn(['ks','kg','ks'])==='kg/ks');

console.log('── napojení ──');
t('Analýza účtenek → seznam položek: jednotka podle položek, průměr za jednotku (dřív útrata ÷ nákupy s popiskem Kč/ks)',/jednotkySouhrn\(v\.jedn\)/.test(rc)&&/Math\.round\(v\.total\/totalQty\)/.test(rc)&&/const avgJedn = jednaJedn \? 'Kč\/' \+ jedn : 'Kč\/nák\.'/.test(rc)&&!/Number\.isInteger\(totalQty\)\?'ks':'kg\/l'/.test(rc));
t('Detektor úspor → Častý nákup: množství s jednotkou (palivo v l)',/jednotkySouhrn\(x\.jedn\)/.test(pj)&&!/Math\.round\(x\.qty\)\} ks, celkem/.test(pj));
t('Statistika položek: palivo má cenu za litr',/tankJePalivo\(it\)\) \{ zaJed = castka \/ q; jed = 'l'; \}/.test(sp));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
