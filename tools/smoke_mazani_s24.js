// FinanceFlow · smoke test · S24 · v11.20 Vymazat data maže i uzly funkcí ze S24; TODO-289 ikona oznámení
const fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const S=R('settings.js','../js/settings.js');
const f=S.slice(S.indexOf('async function confirmDeleteAllData'));
['meridla','vozidla','taxRozpocet','categoryMappings','eanAliasy','coicopHlasy'].forEach(u=>t('mazání: users/{uid}/'+u, f.includes("'"+u+"'")));
t('mazání: aiUsage se schválně nemaže (limit AI)',!/'aiUsage'/.test(f.slice(0,f.indexOf('// 3)'))));
['ff_meridla','ff_vozidla','ff_taxRozpocet','ff_catMappings'].forEach(k=>t('mazání: localStorage '+k,f.includes("'"+k+"'")));
const A=R('announcements.js','../js/announcements.js');
t('oznámení: ikona se escapuje (TODO-289)',A.includes("escapeAnnounce(m.icon)")&&!A.includes("${m.icon ? m.icon + ' '"));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
