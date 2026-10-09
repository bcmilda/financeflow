// S25 – TODO-276 (obecné názvy oddělení mimo Zdražování), TODO-272 (prázdné stavy karet
// Finančního obrazu), TODO-309 (konec záruky dokladu na Dashboardu).
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i));if(!c)bad++;};
const rc=R('receipts.js','../js/receipts.js'),inf=R('inflace.js','../js/inflace.js'),pj=R('projects.js','../js/projects.js'),ui=R('ui.js','../js/ui.js'),app=R('app.html','../app.html');
const pick=(s,n)=>{let a=s.indexOf('function '+n+'(');let d=0,j=s.indexOf('{',a);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(a,k+1)}}};
const konst=(s,n)=>{const a=s.indexOf('const '+n);return s.slice(a,s.indexOf(';',s.indexOf(']',a))+1)};
console.log('── S25 · obecné názvy, Obraz, záruka ──');
// 276
t('Inflace: obecné názvy oddělení se vynechají a počet se ukáže',inf.includes("rpIsGenericName(it.name)) { obecne++; return; }")&&inf.includes('return { obs, stores, items, obecne };')&&inf.includes('s obecným názvem oddělení'));
t('Analýza účtenek → Pravidelně nakupuješ: bez obecných názvů',/if\(k\.length<3\)return;\n\s*if\(rpIsGenericName\(it\.name\)\)return;/.test(rc));
t('Detektor úspor: nejčastější položky i zdražování za 3 měsíce bez obecných názvů',(pj.match(/rpIsGenericName\(it\.name\)\) return;/g)||[]).length===2);
t('Detektor: klíč už se neořezává na 25 znaků (slučoval podobné výrobky)',!pj.includes(".toLowerCase().trim().slice(0,25).replace(/\\s+/g,'_')")&&pj.includes(".toLowerCase().trim().replace(/\\s+/g,'_');"));
const sg={};vm.createContext(sg);vm.runInContext(konst(rc,'RP_GENERIC_NAMES')+'\n'+pick(rc,'rpIsGenericName'),sg);
t('rozpozná „Pečivo“, „Uzeniny 21 %“, ne „Rohlík 43g“',sg.rpIsGenericName('Pečivo')&&sg.rpIsGenericName('UZENINY 21%')&&!sg.rpIsGenericName('Rohlík 43g'));
// 272
t('Obraz: Rezerva bez dat → prázdný stav místo zmizení',pj.includes("if(!rez) return _obrazPrazdna('🛡 Rezerva vydrží'")&&pj.includes("if(!nowE) return _obrazPrazdna('🛡 Rezerva vydrží'"));
t('Obraz: Čisté jmění bez peněženek, aktiv i dluhů → prázdný stav místo „0 Kč“',pj.includes("const nwCard = _nwPrazdne ? _obrazPrazdna('💎 Čisté jmění'"));
t('Obraz: Wealth Momentum bez měsíce s daty → prázdný stav místo „Ani jeden měsíc v mínusu“',pj.includes("const momentumCard = !momentum.months ? _obrazPrazdna('🚀 Wealth Momentum'"));
// 309
const sb={escHtml:s=>String(s).replace(/</g,'&lt;'),Date,Math,parseInt,isNaN,String};vm.createContext(sb);
vm.runInContext('const DOKLAD_VAROVANI_DNI = 60;\n'+['dokladZaruka','dokladySeznam','dokladyUpozorneniHTML'].map(n=>pick(rc,n)).join('\n'),sb);
const dnes=new Date(2026,9,8).getTime();
const r=[{store:'Datart',photoKey:'a',date:'2024-11-01',warrantyMonths:24,photoNote:'Pračka Bosch'},   // končí 1. 11. 2026 → 24 dní
         {store:'Alza',photoKey:'b',date:'2024-01-01',warrantyMonths:24},                              // prošlá
         {store:'Lidl',photoKey:'c',date:'2026-10-01',warrantyMonths:24},                              // daleko
         {store:'Albert',date:'2024-11-01',warrantyMonths:24}];                                        // bez fotky = není doklad
let h=sb.dokladyUpozorneniHTML(r,dnes);
t('Dashboard: jeden doklad ke konci → „Pračka Bosch – záruka končí za 24 dní“',h.includes('Pračka Bosch')&&h.includes('za 24 dní')&&h.includes('dokladyOtevriZDashboardu()'),h.slice(0,200));
t('prošlá záruka, vzdálená záruka a účtenka bez fotky se nehlásí',!h.includes('Alza')&&!h.includes('Lidl')&&!h.includes('Albert'));
t('nic ke konci → nic se nezobrazí',sb.dokladyUpozorneniHTML([r[1],r[2]],dnes)==='');
h=sb.dokladyUpozorneniHTML([r[0],{store:'Datart',photoKey:'d',date:'2024-11-20',warrantyMonths:24}],dnes);
t('víc dokladů → souhrn „2 doklady mají záruku ke konci“',h.includes('2 doklady</strong> mají záruku ke konci'));
t('Dashboard volá upozornění (ne při prohlížení partnera) a má pro něj místo',ui.includes("getElementById('zarukaAlert')")&&app.includes('<div id="zarukaAlert"></div>'));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
