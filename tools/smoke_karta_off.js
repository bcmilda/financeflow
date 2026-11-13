// FinanceFlow · smoke test · S26 (v11.82) · karta výrobku: živiny, Nutri-Score, Open Food Facts, prodejny, název z EAN
//  Milan: „proč v tabulce není bar u energie, bílkovin a sacharidů?“
//         „Nutri-Score nemohu ručně upravovat – je z Open Food Facts, a ty jsi tam ruční úpravu nechal“
//         „ta data neznám, radši bych je nafotil – není to součástí Open Food Facts?“
//         „proč je 2× prodejna Penny Market Frýdek-Místek?“ · „dovozce nezná ani Open Food Facts – pole je zbytečné“
//         „přeskočila mi písmenka v názvu z EAN a už to nejde změnit“ · „za jak dlouho se spárují data z Open Food Facts?“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const rc=fs.readFileSync(najdi('receipts.js','../js/receipts.js'),'utf8'), es=fs.readFileSync(najdi('ean-sken.js','../js/ean-sken.js'),'utf8');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

console.log('── živiny ──');
const c={Math,String,Object};
vm.createContext(c);
vm.runInContext(es.match(/const EAN_SEMAFOR = \{[\s\S]*?\};/)[0]+'\n'+pick(es,'eanSemaforUroven')+'\n'+pick(es,'eanNutriceHTML'),c);
const h=c.eanNutriceHTML({kcal:552,bilkoviny:6.2,sacharidy:50,tuky:35,nasycene:22,cukry:48,sul:0.2});
t('energie, bílkoviny i sacharidy mají pruh (% denní dávky)',/552 kcal <span[^>]*>· 28 % denní dávky/.test(h)&&/6,2 g <span[^>]*>· 12 % denní dávky/.test(h)&&/50 g <span[^>]*>· 19 % denní dávky/.test(h));
t('pruh je neutrální modrý (hodnotí se jen tuky, cukry a sůl)',(h.match(/background:#60a5fa/g)||[]).length===3&&/· vysoký/.test(h));
t('vysvětlivka referenčních hodnot',/2 000 kcal, 50 g bílkovin, 260 g sacharidů/.test(h));

console.log('── Nutri-Score a Open Food Facts ──');
t('Nutri-Score nejde upravit ručně (ani uložit, ani osobní zápis)',!/MK_POLE_KOMUNITA = \[[^\]]*nutriscore/.test(rc)&&/!MK_POLE\[pole\] \|\| pole === 'nutriscore'\) return;/.test(rc)&&/lok\[pole\] && pole !== 'nutriscore'/.test(rc)&&/pole === 'nutriscore' \? \(h\.t \? '' : offOdkaz\)/.test(rc));
t('prázdné složení / alergeny / obal / původ u výrobku s kódem → „Doplnit na Open Food Facts“',/const MK_POLE_OFF = \['znacka', 'vyrobce', 'obal', 'puvod', 'zeme', 'slozeni', 'alergeny'\]/.test(rc)&&/\(!h\.t && z\.ean && MK_POLE_OFF\.includes\(pole\)\) \? offOdkaz : upr\(pole, !!h\.t\)/.test(rc)&&/world\.openfoodfacts\.org\/product\//.test(rc));
t('Dovozce jen když je známý',/\{ const h = hodnotaPole\('dovozce'\); if \(h\.t\) vyr \+= pRadek\('dovozce', h\); \}/.test(rc));
t('stará karta (90+ dní) se obnoví i při otevření, ne jen při skenu',/Date\.now\(\) - p\.kdy > 90 \* 86400000/.test(es));

console.log('── název z EAN ──');
t('admin opraví název karty (zápis do eanProdukty, zámek rucne.nazev) a může ji načíst znovu z Open Food Facts',/function mapaKartaNazevEanUloz/.test(rc)&&/body: JSON\.stringify\(\{ nazev: v, rucne \}\)/.test(rc)&&/function mapaKartaObnovOff/.test(rc)&&/body: JSON\.stringify\(\{ kdy: 0 \}\)/.test(rc));
t('oprava jen pro admina',(rc.match(/typeof isAdmin === 'function' && isAdmin\(\)/g)||[]).length>=4);

console.log('── prodejny bez duplicit ──');
const d={normName:s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\d+\s*g\b/,'').trim(),Object,String,Map,Set,normalizeStoreName:s=>s,mapaUzivCenaZaJednotku:()=>null};
vm.createContext(d); vm.runInContext(pick(rc,'mapaAliasySkupiny')+'\n'+pick(rc,'mapaUzivObchody'),d);
const z={nakupy:[{raw:'Ledové kaštany 45g Orion',obchod:'Penny Market',mesto:'Frydek Mistek',datum:'2026-10-08'},{raw:'Ledové kaštany 45g Orion',obchod:'Penny Market',mesto:'Frýdek Místek',datum:'2026-10-01'}]};
const al=d.mapaAliasySkupiny(z);
t('Názvy z účtenek: „Frydek Mistek“ a „Frýdek Místek“ = jedna prodejna, s diakritikou',al.length===1&&al[0].obchody.length===1&&al[0].obchody[0]==='Penny Market · Frýdek Místek',al);
const ob=d.mapaUzivObchody(z);
t('Moje nákupy: město s diakritikou',ob.length===1&&ob[0].mesto==='Frýdek Místek',ob);
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
