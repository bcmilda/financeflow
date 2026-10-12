// FinanceFlow · smoke test · S26 (v11.69) · šablona importu: znaménka + a −
//  Milan: „Šablona pro excel, uprav jen + a −, ať sedí." O typu transakce rozhoduje
//  znaménko částky; ukázka v šabloně ale měla výdaj KLADNĚ → import z něj udělal příjem.
const fs=require('fs'),vm=require('vm'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const src=fs.readFileSync(najdi('import.js','../js/import.js'),'utf8');
const pick=n=>{const i=src.indexOf('function '+n);if(i<0)throw new Error('nenalezeno: '+n);
  let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
let csv='';
const sb={console,Date,Math,Number,isNaN,String,Array,Object,parseFloat,setTimeout:()=>{},
  getData:()=>({categories:[{id:'c1',name:'Jídlo & Nákupy'},{id:'c2',name:'Příjem'}]}),
  Blob:class{constructor(p){csv=String(p[0]).replace(/^﻿/,'');}},
  URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},
  document:{createElement:()=>({click(){}}),body:{appendChild(){},removeChild(){}}}};
vm.createContext(sb);
vm.runInContext([pick('mapImportRows'),pick('parseImportDate'),pick('downloadImportTemplate')].join('\n'),sb);
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};
const rad=s=>s.trim().split('\n').map(r=>r.split(';'));

console.log('── stažená šablona ──');
sb.downloadImportTemplate();
const sab=sb.mapImportRows(rad(csv),'template');
t('výdaj v ukázce je záporně',/;výdaj;-1250\.50;/.test(csv),csv.split('\n')[1]);
t('ukázka se naimportuje jako výdaj + příjem',sab.length===2&&sab[0].type==='expense'&&sab[0].amount===1250.5&&sab[1].type==='income'&&sab[1].amount===45000,sab.map(r=>[r.type,r.amount]));
t('kategorie se přiřadí podle názvu, jak ji uživatel napsal',sab[0].catId==='c1');

console.log('── vyplněné šablony ──');
const H='Datum;Typ;Částka;Kategorie;Podkategorie;Název;Poznámka;Tagy';
const stara=sb.mapImportRows(rad(H+'\n2026-03-21;výdaj;1250.50;Jídlo;;Albert;;'),'template');
t('NEGATIVNÍ KONTROLA: stará šablona (výdaj kladně) = výdaj, ne příjem',stara[0]&&stara[0].type==='expense',stara);
const bezTypu=sb.mapImportRows(rad(H+'\n2026-03-21;;-80;;;Kafe;;\n2026-03-22;;2000;;;Vratka;;'),'template');
t('bez vyplněného typu rozhoduje znaménko',bezTypu[0].type==='expense'&&bezTypu[1].type==='income');
const minus=sb.mapImportRows(rad(H+'\n2026-03-21;;−300;;;Oběd;;'),'template');
t('typografické minus „−“ z Wordu/Excelu = výdaj',minus[0]&&minus[0].type==='expense'&&minus[0].amount===300,minus);
const prij=sb.mapImportRows(rad(H+'\n2026-03-21;Příjem;-500;;;Vratka;;'),'template');
t('Typ „Příjem“ má přednost před znaménkem',prij[0].type==='income'&&prij[0].amount===500);

console.log('── banky beze změny ──');
const fio=sb.mapImportRows(rad('Datum;Objem;Název;Typ\n21.03.2026;250;Pepa;Bezhotovostní platba\n22.03.2026;-90;Trafika;Platba kartou'),'fio');
t('Fio: sloupec Typ neovlivní znaménko',fio[0].type==='income'&&fio[1].type==='expense',fio.map(r=>r.type));

console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
