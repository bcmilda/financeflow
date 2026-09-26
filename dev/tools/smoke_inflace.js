// FinanceFlow · v10.72 · tools/smoke_inflace.js · 2026-09-16
// S22 · Oficialni inflace z CSU (Worker routa /inflace) + klientske napojeni.
// Format CSV podle dokumentace CSU sady CEN0101E:
//   casz_kod = C  -> mezirocni index (bereme)
//   casz_kod = B  -> mezimesicni, K -> klouzave prumery (ignorujeme)
//   prazdny ucel_kod = souhrnny index za vsechny oddily
//   `hodnota` je index v %, mira inflace = hodnota - 100
const fs=require('fs');
const src=fs.readFileSync('/tmp/ff2/worker.js','utf8');
// vytáhni csvRadek + handleInflace
function vytahni(n){const i=src.indexOf((n==='handleInflace'?'async function ':'function ')+n);let d=0;
  for(let k=src.indexOf('{',i);k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1);}}}
const vm=require('vm');
const sb={console,Math,Number,parseInt,parseFloat,isFinite,JSON,Object,String,Array};
vm.createContext(sb);
vm.runInContext("const CSU_ISC_CSV='x';",sb);
vm.runInContext(vytahni('csvRadek'),sb);
vm.runInContext('function json(o,s,h){return {__json:o,status:s};}',sb);
// fake fetch s realistickym CSV podle dokumentace CSU
const hlavicka='"idhod","hodnota","stapro_kod","ucel_tep","ucel_cis","ucel_kod","casz_kod","mesic","rok","obdobiod","obdobido","baz_obdobiod","baz_obdobido","ucel_txt","casz_txt"';
const radky=[hlavicka,
 // starsi mesic - musi byt prebit novejsim
 '"1","103.5","6134","","6000","","C","7","2026","2026-07-01","2026-07-31","2025-07-01","2025-07-31","","stejné období předchozího roku"',
 '"2","108.1","6134","ECOICOP","6000","1","C","7","2026","2026-07-01","2026-07-31","2025-07-01","2025-07-31","Potraviny a nealkoholické nápoje, celkem","stejné období předchozího roku"',
 // nejnovejsi mesic
 '"3","102.4","6134","","6000","","C","8","2026","2026-08-01","2026-08-31","2025-08-01","2025-08-31","","stejné období předchozího roku"',
 '"4","106.9","6134","ECOICOP","6000","1","C","8","2026","2026-08-01","2026-08-31","2025-08-01","2025-08-31","Potraviny a nealkoholické nápoje, celkem","stejné období předchozího roku"',
 '"5","101.2","6134","ECOICOP","6000","4","C","8","2026","2026-08-01","2026-08-31","2025-08-01","2025-08-31","Bydlení, voda, energie, paliva","stejné období předchozího roku"',
 // jiny typ indexu - musi se ignorovat
 '"6","100.3","6134","","6000","","B","8","2026","2026-08-01","2026-08-31","2026-07-01","2026-07-31","","předchozí období"',
 '"7","99.9","6134","","6000","","K","8","2026","2026-08-01","2026-08-31","","","","stejných 12 měsíců předchozího roku"',
].join('\n');
sb.fetch=async()=>({ok:true,text:async()=>radky});
vm.runInContext(vytahni('handleInflace'),sb);
sb.__cors={};
vm.runInContext('handleInflace(__cors).then(r=>{globalThis.__out=r;})',sb);
setTimeout(()=>{
  const o=sb.__out && sb.__out.__json;
  let f=0; const ok=(n,c)=>{if(c)console.log('  ✅',n);else{f++;console.log('  ❌',n,'→',JSON.stringify(o));}};
  console.log('── Parser ČSÚ ──');
  ok('vrátí souhrnnou inflaci', o && o.inflace===2.4);
  ok('vezme NEJNOVĚJŠÍ měsíc (srpen), ne první nalezený', o && o.rok===2026 && o.mesic===8);
  ok('index převede na míru inflace (102.4 → 2.4)', o && o.inflace===2.4);
  ok('ignoruje meziměsíční (B) a klouzavé průměry (K)', o && o.typ==='mezirocni' && o.inflace===2.4);
  ok('vrátí i oddíly', o && o.oddily && o.oddily['1'] && o.oddily['1'].mira===6.9);
  ok('oddíly jsou taky z nejnovějšího měsíce (6.9, ne 8.1)', o && o.oddily && o.oddily['1'] && o.oddily['1'].mira===6.9);
  ok('název oddílu s čárkou se nerozbije', o && o.oddily && o.oddily['4'] && /Bydlení, voda/.test(o.oddily['4'].nazev));
  ok('uvádí zdroj', o && /CSU/.test(o.source||''));
  console.log('\n── Klient ──');
  const prj=fs.readFileSync('/tmp/ff2/projects.js','utf8');
  const ui=fs.readFileSync('/tmp/ff2/ui.js','utf8');
  ok('stahuje se pres sdilenou konstantu WORKER_URL, ne natvrdo', /typeof WORKER_URL !== 'undefined'/.test(prj));
  ok('stahuje se nejvys jednou za den', /CSU_REFRESH_MS/.test(prj) && /Date\.now\(\) - S\.cnbInflaceAt\) < CSU_REFRESH_MS/.test(prj));
  ok('selhani site appku neshodi', /catch\(e\)\{ \/\* bez site/.test(prj.replace(/[ěščřžýáíéúůťďňó]/g,c=>({'ě':'e','š':'s','č':'c','ř':'r','ž':'z','ý':'y','á':'a','í':'i','é':'e','ú':'u','ů':'u','ť':'t','ď':'d','ň':'n','ó':'o'})[c])));
  ok('CSU ma prednost pred pevnymi 3 %, ale ne pred osobni inflaci',
     prj.indexOf("zdroj: 'osobni'") < prj.indexOf("zdroj: 'csu'") && prj.indexOf("zdroj: 'csu'") < prj.indexOf("zdroj: 'fix'"));
  ok('uzivatel vidi, ze cislo je z CSU a za jake obdobi', /oficialni mezirocni inflace CSU/.test(prj.normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
  ok('spousti se z renderPage', /nactiInflaciCSU\(\)/.test(ui));
  ok('ukladaji se i oddily COICOP pro srovnani ty vs prumer', /cnbInflaceOddily/.test(prj));
  console.log(f?`\n❌ SELHALO ${f}`:'\n✅ INFLACE OVERENA');
  process.exit(f?1:0);
},300);
