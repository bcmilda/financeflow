// FinanceFlow · smoke test · S27 (v11.87) · rychlé poznámky Milana
//  „účtenka z benzínky + stejná transakce ručně – Podezřelé to neodhalily“
//  „pozměnil jsem částku a zahodila se zapsaná data natankovaného paliva“
//  „na účtence bylo 1/10/2026 a AI zapsalo 10. ledna 2026“ · „čára grafu zasahuje do osy“ · „kde jsem ušetřil 3 Kč na kuponech?“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const dup=R('duplicates.js','../js/duplicates.js'), deb=R('debts.js','../js/debts.js'), rc=R('receipts.js','../js/receipts.js'), voz=R('vozidla.js','../js/vozidla.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

console.log('── Podezřelé: položka účtenky = jiná transakce ──');
const S={uiCfg:{},receipts:[{addedAt:111,store:'MOL',date:'2026-10-16',total:1022.4,items:[{name:'EVO 95',lineTotal:988.4,qty:22.27},{name:'FC Sezónní Caffe Latte M',lineTotal:34}]}],
  transactions:[{id:'a',type:'expense',name:'MOL',amount:1022.4,catId:'cat11',date:'2026-10-16',receiptAddedAt:111},{id:'b',type:'expense',name:'',amount:988.4,catId:'cat11',date:'2026-10-16'},
    {id:'c',type:'expense',name:'Albert',amount:34,catId:'cat1',date:'2026-10-20'}]};
const c={S,console,fmt:n=>String(n),Math,Date,String,Number,Object,Array,parseFloat,isFinite};
vm.createContext(c);
vm.runInContext(dup.replace(/\nwindow\.[^\n]*/g,'\n')+'\n;var S=this.S;',c);
let pary=c.dupPary(S.transactions);
const p=pary.find(x=>x.type==='polozka');
t('ruční 988,40 Kč vedle účtenky MOL 1 022,40 Kč (benzín 988,40 + káva) → 🧾 Položka účtenky',p&&p.a.id==='a'&&p.b.id==='b'&&/EVO 95/.test(p.reason),pary.map(x=>[x.type,x.a.id,x.b.id]));
t('položka jiný den (víc než 1 den) se nepáruje (káva 34 Kč za 4 dny)',!pary.some(x=>x.b.id==='c'||x.a.id==='c'));
c.S.uiCfg.dupNeni={'a|b':1}; pary=c.dupPary(S.transactions);
t('„Není duplikát“ platí i pro toto pravidlo',!pary.some(x=>x.type==='polozka'));
t('v přehledu všech měsíců je filtr 🧾 Z účtenky a štítek',/polozka: \['🧾', 'Položka účtenky'/.test(dup)&&/chip\('polozka', '🧾 Z účtenky'\)/.test(dup)&&/polozka:     \{ icon: '🧾'/.test(dup));

console.log('── úprava transakce s tankováním ──');
t('úprava se stejnou kategorií tankování nesmaže (ani když zmizí podkategorie Palivo)',/if\(_old && _old\.tank && !txObj\.tank && type==='expense' && \(_old\.catId\|\|_old\.category\)===selCatId\)\{\s*txObj\.tank=_old\.tank;/.test(deb)&&/if\(!finalSub && _old\.subcat\)\{ txObj\.subcat=_old\.subcat;/.test(deb));
const d={selCatId:'cat11',selSub:'Palivo',customSub:'',_catPickSel:'cat11',document:{getElementById:()=>({value:'x'})},renderCatPicker(){d.r=(d.r||0)+1}};
vm.createContext(d); vm.runInContext('var selCatId="cat11",selSub="Palivo",customSub="",_catPickSel="cat11";'+pick(deb,'selCatBtn')+';this.f=selCatBtn;this.g=()=>selSub;',d);
d.f('cat11');
t('klepnutí na už vybranou kategorii nesmaže podkategorii',d.g()==='Palivo'&&d.r===1);
d.f('cat3');
t('jiná kategorie podkategorii vynuluje (jako dřív)',d.g()==='');

console.log('── datum z účtenky: den a měsíc prohozené ──');
const e={};vm.createContext(e);vm.runInContext(pick(rc,'rcptDatumProhozene'),e);
const ted=new Date('2026-10-16T12:00:00');
t('1/10/2026 přečtené jako 10. 1. 2026 → nabídne 1. 10. 2026',e.rcptDatumProhozene('2026-01-10',ted)==='2026-10-01');
t('správné nedávné datum nic nenabízí',e.rcptDatumProhozene('2026-10-01',ted)===null&&e.rcptDatumProhozene('2026-10-14',ted)===null);
t('budoucí datum (12. 10. → 10. 12.) nabídne prohození',e.rcptDatumProhozene('2026-12-10',ted)==='2026-10-12');
t('den > 12 nebo stejný den a měsíc nejde prohodit',e.rcptDatumProhozene('2026-01-25',ted)===null&&e.rcptDatumProhozene('2026-05-05',ted)===null);
t('editor účtenky ukáže návrh pod datem a tlačítko „↔ Prohodit“ (nemění samo)',/<div id="rp_swap_warn">\$\{rcptDatumNavrhHTML\(r\)\}<\/div>/.test(rc)&&/↔ Prohodit na/.test(rc)&&/function rcptDatumProhod\(\)/.test(rc));

console.log('── Vozidla: graf ceny a kupony ──');
const f={_vozEsc:s=>String(s),Math,String};vm.createContext(f);vm.runInContext(pick(voz,'ffGrafCara'),f);
const g=f.ffGrafCara([{y:45.74},{y:44.38}],{fmt:x=>x+' Kč'});
const x0=+g.match(/<circle cx="([\d.]+)"/)[1], lbl=g.match(/<text x="([\d.]+)"[^>]*text-anchor="end"/);
t('čára začíná za popisky osy (popisky zarovnané doprava před svislou osou)',x0>=150&&lbl&&+lbl[1]<x0-6,{x0,lbl:lbl&&lbl[1]});
t('Ušetřeno na kuponech: vysvětlení výpočtu a sloupec Ušetřeno (litry × cena u stojanu)',/cena u stojanu × litry − zaplaceno/.test(voz)&&/th\('Ušetřeno'\)/.test(voz)&&/\$\{_vozDes\(x\.litry, 2\)\} × \$\{_vozDes\(x\.cenaStojan, 2\)\}/.test(voz));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
