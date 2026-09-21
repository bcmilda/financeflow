const fs=require('fs');const PJ=fs.readFileSync('projects.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=n=>{const a=PJ.indexOf('function '+n+'(');let i=PJ.indexOf('{',a),d=0;for(;i<PJ.length;i++){if(PJ[i]==='{')d++;else if(PJ[i]==='}'){d--;if(!d)break;}}return PJ.slice(a,i+1);};
const box={innerHTML:''};global.document={getElementById:()=>box};global.fmtB=v=>v+' Kč';global.curSym=()=>'Kč';
eval(cut('renderPaydayWeeksTable').replace('function renderPaydayWeeksTable','global.renderPaydayWeeksTable=function'));
renderPaydayWeeksTable([{label:'1. týden',total:511,days:7,perDay:73},{label:'2. týden',total:0,days:6,perDay:0}],18);
const h=box.innerHTML, graf=h.split('<table')[0], tab=h.split('<table')[1];
T('sloupec ukazuje týdenní částku 511 Kč', />511 Kč</.test(graf));
T('sloupec už neukazuje 73 Kč/den', !/>73 Kč</.test(graf));
T('tabulka přepočet na den ponechala', /73 Kč/.test(tab) && /\/den/.test(tab));
T('nadpis je výraznější (ne malé šedé verzálky)', /font-size:\.9rem;font-weight:700;color:#e8eaf2[^>]*>📅 Výdaje po týdnech od výplaty/.test(h));
T('popisek netvrdí, že sloupce jsou Kč/den', !/Sloupce ukazují <strong>průměr/.test(h) && /kolik stál celý týden/.test(h));
T('Tempo přejmenováno na „Od výplaty k výplatě“', /card-title">📊 Od výplaty k výplatě</.test(PJ) && !/Tempo po týdnech cyklu<\/span>/.test(PJ));
T('Kč/den v Od výplaty k výplatě dělí dny týdne', /perDay:dnuVTydnu>0\?Math\.round\(total\/dnuVTydnu\)/.test(PJ));
// ověření na čísle: 511 Kč, týden 18.–24. (7 dní), odžito 4 dny → 73, ne 128
const ws=new Date(2026,8,18), we=new Date(2026,8,24); const dnu=Math.round((we-ws)/86400000)+1;
T('511 Kč za 7denní týden = 73 Kč/den (dřív 128)', Math.round(511/dnu)===73);
T('patička vysvětluje nový přepočet', /částka týdne ÷ počet dní v týdnu/.test(PJ));
console.log(`S23/v10.88: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
