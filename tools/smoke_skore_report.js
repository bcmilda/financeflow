// S23 (Milan): Dashboard a Měsíční report musí ukazovat STEJNÉ skóre.
// Spuštění: node tools/smoke_skore_report.js
const fs=require('fs');const P=fs.readFileSync('premium.js','utf8');const J=fs.readFileSync('projects.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=(src,n)=>{const a=src.indexOf('function '+n+'(');let i=src.indexOf('{',a),d=0;for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'){d--;if(!d)break;}}return src.slice(a,i+1);};
global.window={};
eval(cut(P,'scoreZobrazeni').replace('function scoreZobrazeni','global.scoreZobrazeni=function'));
const sc=(cov,tot)=>({total:tot===0?null:1,rawTotal:tot,rawMax:310,availMax:Math.round(cov/100*310),coverage:cov});
// plné pokrytí
let z=scoreZobrazeni(sc(100,250));
T('plné pokrytí: beze změny (250 z 310)',z.tot===250&&z.max===310&&!z.zuzeno);
// neúplné – Milanův případ
z=scoreZobrazeni(sc(65,310));
T('65 % pokrytí: 202 z 202, ne 310 z 310',z.max===202&&z.tot===202&&z.zuzeno);
T('řekne, kolik bodů je mimo hru',z.chybi===108);
z=scoreZobrazeni(sc(65,155));
T('poměr zůstává (polovina bodů → 101 z 202)',z.tot===101&&z.max===202);
T('nikdy nepřeteče',scoreZobrazeni(sc(65,400)).tot<=scoreZobrazeni(sc(65,400)).max);
T('bez dat nespadne',scoreZobrazeni(null).max===0);
// napojení
T('Dashboard používá scoreZobrazeni',/const _z = scoreZobrazeni\(sc\)/.test(cut(P,'renderFinancialScore')));
T('report používá scoreZobrazeni, ne rawTotal/rawMax',/scoreZobrazeni\(fs\)/.test(J)&&!/score: sc, max: fs \? fs\.rawMax/.test(J));
T('report ukazuje „nezměřeno" místo 0 u nedostupných složek',/c\.avail===false\) return/.test(J)&&/nezměřeno/.test(J));
// S25 (v11.59, Milan: „report 0 z 310, Dashboard 202“ + čísla „cik cak“)
T('neměřený měsíc: místo 0 pomlčka a „zatím nelze určit“',/\$\{_nemer \? '–' : mo\.score\}/.test(J)&&/zatím nelze určit/.test(J));
T('neměřený měsíc: žádné „Nejvyšší pásmo 🏆 dosaženo“ ani „+0 bodů“',/\$\{_nemer \? `<div[\s\S]*?Změřit jde/.test(J)&&/mo\.mereno !== false && _pz && _pz\.max === mo\.max/.test(J));
T('změna proti minulému měsíci na stejné škále (ne rawTotal)',!/mo\.score - _pf\.rawTotal/.test(J)&&/mo\.score - _pz\.tot/.test(J));
T('patička říká, za který měsíc a proč se liší od Dashboardu',/Stejný výpočet jako skóre na Dashboardu, za \$\{_mesTxt\}/.test(J)&&!/Stejné číslo jako na Dashboardu/.test(J));
T('11 · Z účtenek: sloupec pod-hodnot má pevnou šířku vždy (čísla v jedné svislici)',/width:92px;flex-shrink:0;text-align:right">\$\{sub\|\|''\}<\/span>/.test(J)&&!/\$\{sub\?`<span/.test(J));
T('9: „nezměřeno“ má stejný sloupec odznaku jako měřené složky (čísla pod sebou)',/nezměřeno<\/span><span style="min-width:56px"><\/span>/.test(J));
console.log(`Skóre report vs Dashboard: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
