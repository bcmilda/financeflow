// S25 (v11.44) – data v MÍSTNÍM čase místo UTC (toISOString). V Česku v letním čase vycházela
// místní půlnoc jako předchozí den: splátky dluhů o den dřív, auto-šablony a „Zaznamenat“
// v Budoucích platbách o den dřív, export od posledního dne minulého měsíce, splátky
// „příští měsíc“ v Projektech brány z tohoto měsíce. Test běží v časové zóně Prahy.
process.env.TZ = 'Europe/Prague';
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i));if(!c)bad++;};
const pick=(src,n)=>{let a=src.indexOf('function '+n+'(');let d=0,j=src.indexOf('{',a);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(a,k+1)}}};
const BD=R('budouci.js','../js/budouci.js'),DB=R('debts.js','../js/debts.js'),PR=R('premium.js','../js/premium.js'),PJ=R('projects.js','../js/projects.js'),PS=R('pristi.js','../js/pristi.js'),TX=R('transactions.js','../js/transactions.js');
console.log('── S25 · data v místním čase ──');
const sb={window:{}};vm.createContext(sb);
const hl=BD.split('\n').filter(l=>/^const _b(Iso|Den) =/.test(l)).join('\n').replace(/^const /gm,'var ');
vm.runInContext(hl+'\n'+['debtStartStr','debtDatumSplatky','_nextPeriodDate'].map(n=>pick(DB,n)).join('\n'),sb);
t('Budoucí platby: místní půlnoc 1. 7. → „2026-07-01“ (dřív 2026-06-30)',sb._bIso(new Date(2026,6,1))==='2026-07-01');
t('Budoucí platby: „2026-07-15“ se čte jako 15. 7. místního času',(d=>d.getDate()===15&&d.getMonth()===6&&d.getHours()===0)(sb._bDen('2026-07-15'))&&sb._bDen('')===null);
t('Budoucí platby: v souboru už není toISOString na datech výskytů',!/\.toISOString\(\)\.slice\(0, ?10\)/.test(BD));
t('příští splátka po 31. 1. je 28. 2. (dřív 3. 3.), po 15. 4. je 15. 5.',sb._nextPeriodDate('2026-01-31','monthly')==='2026-02-28'&&sb._nextPeriodDate('2026-04-15','monthly')==='2026-05-15'&&sb._nextPeriodDate('2026-07-10','weekly')==='2026-07-17');
t('export: výchozí „od“ je 1. den měsíce, ne poslední den minulého',PR.includes("String(new Date().getMonth()+1).padStart(2,'0')+'-01'")&&!/new Date\(new Date\(\)\.getFullYear\(\),new Date\(\)\.getMonth\(\),1\)\.toISOString/.test(PR));
t('auto-šablony: datum přes místní kalendář',/const iso=d=>d\.getFullYear\(\)/.test(PR));
t('Projekty: „příští měsíc“ u splátek je opravdu příští měsíc',PJ.includes("const nextMonthStr = nextMonthDate.getFullYear()+'-'+String(nextMonthDate.getMonth()+1)"));
t('Příští měsíc: jednorázová platba se čte jako místní den',PS.includes('new Date(+_m[1], +_m[2] - 1, +_m[3])'));
t('Dluhy: oprava uložených kalendářů při otevření stránky',TX.includes('debtOpravDataSplatek(S.debts)'));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
