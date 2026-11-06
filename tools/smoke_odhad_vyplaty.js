// FinanceFlow · smoke test · S26 (v11.75) · Pracovní kalendář: 12h směna − 1 h přestávka, odhad výplaty
//  Milan: „12 hodinová směna + 1 h přestávky, odpracováno je 11 h, dovolená 1 den = 11 h“
//         „můžeme tam přidat odhad výplaty pro daný měsíc?“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const src=fs.readFileSync(najdi('kalendar.js','../js/kalendar.js'),'utf8');
const pick=n=>{let i=src.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};
const S={workCal:{hpd:12,breakMin:60,days:{},salaryM:{}}};
const sb={S,Math,Date,Object,String,Set,window:{}};
vm.createContext(sb);
vm.runInContext(['_workCfg','_workVacH','_czHolidays','_workDay','_workHodiny','workOdhadVyplaty'].map(pick).join('\n')+"\nfunction _ck(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0')}",sb);
const den=(y,m,d,o)=>{S.workCal.days[`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`]=o;};
//  Říjen 2026 podle Milanova screenshotu: 14 směn + 1 přesčasový den po 12 h, 1 den dovolené
const smeny=[1,2,3,8,9,11,16,17,18,19,24,25,26,27], nocni=[2,3,11,18,19,26,27];
smeny.forEach(d=>den(2026,9,d,{type:'smena',hours:12,shift:nocni.includes(d)?'nocni':'ranni'}));
den(2026,9,15,{type:'prescas',hours:12}); den(2026,9,10,{type:'dovolena'});
//  Září 2026: stejný rozpis o měsíc dřív, výplata zadaná
smeny.forEach(d=>den(2026,8,d,{type:'smena',hours:12,shift:nocni.includes(d)?'nocni':'ranni'}));
S.workCal.salaryM['2026-09']=32700;
const cfg=sb._workCfg(), h=sb._workHodiny(cfg,2026,9);
t('den dovolené = 12 h − 1 h přestávky = 11 h',sb._workVacH({type:'dovolena'},cfg)===11);
t('odpracováno bez přestávek: 15 × 11 h = 165 h (180 h včetně přestávek)',h.payH===165&&h.grossH===180,h);
t('směny 14 + 1 přesčasový den (dřív Sumář 14 a Mzda „15 směn“)',h.smen===14&&h.prescasDni===1);
t('dovolená 11 h se počítá do placených hodin (platí se průměrným výdělkem)',h.vacH===11&&h.weightedH>h.payH+h.vacH);
const o=sb.workOdhadVyplaty(cfg,2026,9);
const zari=sb._workHodiny(cfg,2026,8);
t('odhad za říjen = sazba ze září × vážené hodiny října',o&&Math.abs(o.sazba-32700/zari.weightedH)<1e-9&&o.castka===Math.round(32700/zari.weightedH*h.weightedH/100)*100,o);
t('víc hodin než v září → vyšší odhad',o.castka>32700,o.castka);
t('bez výplaty v předchozích měsících žádný odhad (ne vymyšlené číslo)',sb.workOdhadVyplaty(cfg,2026,7)===null);
t('karta ukazuje odhad i srovnání se skutečností',src.includes('📈 Odhad čisté výplaty za')&&src.includes('skutečnost ${fmt(sal)} Kč'));
t('NEGATIVNÍ KONTROLA: sazba se nebere z cizí (minulé) výplaty',/const sal = \(salInfo\.zadana \|\|/.test(src));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
