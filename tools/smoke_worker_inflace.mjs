// Test workeru /inflace (S23, TODO-290) proti SKUTEČNÉMU formátu ČSÚ (výběr CEN0101ET03,
// zkopírováno z odpovědi, kterou Milan poslal) + /archiv žije.
// Spuštění: node tools/smoke_worker_inflace.mjs [worker.js]
import fs from 'fs';
const src=fs.readFileSync(process.argv[2]||'worker.js','utf8');
const mod=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const H={'Origin':'https://financeflow.cz'};
const call=(env={})=>mod.default.fetch(new Request('https://w/inflace',{headers:H}),env);
const HL='"Ukazatel","IndicatorType","Typ indexu","TYPUDAJE4A","Území","UZ02P","Skupiny domácností","EKAKTIOCDS","Klasifikace COICOP 2018-Oddíl","CZCOICOP2.CZCOP1","Klasifikace COICOP 2018-Skupina a třída","CZCOICOP2.CZCOP23","Měsíce","CasM","Hodnota","MJ_TEXT","MJ_SYMBOL","POZNAMKA","POZNAMKA_TEXT"';
const MESN=['leden','únor','březen','duben','květen','červen','červenec','srpen','září','říjen','listopad','prosinec'];
const R=(typK,typT,kod,naz,obd,h,skup='',skupT='')=>{const [y,m]=obd.split('-');return `"Index spotřebitelských cen (životních nákladů)","6134","${typT}","${typK}","Česko","CZ","Domácnosti celkem","0","${naz}","${kod}","${skupT}","${skup}","${MESN[+m-1]} ${y}","${obd}","${h}","procento","%","",""`;};
const mesice=(od,n)=>{const out=[];let [y,m]=od.split('-').map(Number);for(let i=0;i<n;i++){out.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){m=1;y++;}}return out;};
// ── P: předdefinovaný výběr = bazický index 2025=100, 13 měsíců (2025-08 … 2026-08) ──
const m13=mesice('2025-08',13);
const baz=[HL]; m13.forEach((o,i)=>{ baz.push(R('IZ2025','Bazický index (2025 = 100)','0','Úhrn',o,(100.7+i*0.2).toFixed(1)));
  baz.push(R('IZ2025','Bazický index (2025 = 100)','01','Potraviny a nealkoholické nápoje',o,(99+i*0.5).toFixed(1)));
  baz.push(R('IZ2025','Bazický index (2025 = 100)','01','Potraviny a nealkoholické nápoje',o,'130.0','011','Potraviny')); });   // skupina – přeskočit
let volano=[];
globalThis.fetch=async(url)=>{ volano.push(String(url)); return {ok:true,status:200,text:async()=>baz.join('\n')}; };
let r=await call(), j=await r.json();
T('P: GET na výběr CEN0101ET03 s kódy, žádný POST',volano.length===1&&/vybery\/CEN0101ET03\?format=CSV&kodZvlast=true/.test(volano[0]));
T('P: 200 s CORS',r.status===200&&r.headers.get('Access-Control-Allow-Origin')==='https://financeflow.cz');
// srpen 2026 = 100,7+12×0,2 = 103,1 ; srpen 2025 = 100,7 → 103,1/100,7 = +2,4 %
T('P: meziroční inflace dopočtená z bazického indexu (103,1 / 100,7 → +2,4 %)',j.inflace===2.4&&j.obdobi==='2026-08'&&j.typIndexu==='IZ2025');
T('P: oddíl potraviny (105 / 99 → +6,1 %), skupina 011 se nesmíchá',j.oddily['01'].mira===6.1);
T('P: řada má jen 1 bod a je označená jako neúplná',j.rada.length===1&&j.radaNeuplna===true);
T('P: zdroj uvedený',/CEN0101ET03/.test(j.zdroj));
// ── U: vlastní výběr (meziroční index IR, 13 měsíců) ──
const m14=mesice('2025-07',14);
const irCsv=[HL]; m14.forEach((o,i)=>{ irCsv.push(R('IR','Meziroční index','0','Úhrn',o,(102+i*0.1).toFixed(1))); irCsv.push(R('IR','Meziroční index','04','Bydlení, voda, energie a paliva',o,'103.5')); });
volano=[]; globalThis.fetch=async(url)=>{ volano.push(String(url)); return {ok:true,status:200,text:async()=>irCsv.join('\n')}; };
const env={CSU_VYBER_URL:'https://data.csu.gov.cz/datastat/data/UZIVATELSKY_VYBER/90afdb36-9165-4f41-a784-e0130e712ca6'};
r=await call(env); j=await r.json();
T('U: webový odkaz vlastního výběru se převede na API CSV',/vybery\/uzivatelske\/90afdb36-9165-4f41-a784-e0130e712ca6\?format=CSV&kodZvlast=true/.test(volano[0]));
T('U: úspěch bez pokusů, vlastniVyber = ok',!j.pokusy&&j.vlastniVyber==='ok');
T('U: plná řada 13 měsíců, poslední = 2026-08 (103,3 → +3,3 %)',j.rada.length===13&&j.obdobi==='2026-08'&&j.inflace===3.3&&j.radaNeuplna===false&&j.typIndexu==='IR');
T('U: oddíly z meziročního indexu (bydlení +3,5 %)',j.oddily['04'].mira===3.5&&j.radaOddily['04'].length===13);
// U selže → spadne na P
volano=[]; globalThis.fetch=async(url)=>{ volano.push(String(url)); if(/uzivatelske/.test(url)) return {ok:false,status:404,text:async()=>'nenalezeno'}; return {ok:true,status:200,text:async()=>baz.join('\n')}; };
r=await call(env); j=await r.json();
T('U nedostupný → záloha předdefinovaný výběr',r.status===200&&volano.length===3&&/CEN0101ET03/.test(j.zdroj));
T('záloha VRÁTÍ neúspěšné pokusy vlastního výběru (nic se neskrývá)',j.vlastniVyber==='selhal – viz pokusy'&&j.pokusy.length===2&&j.pokusy[0].status===404);
// U1 (s kódy) selže, U2 (bez kodZvlast) projde
volano=[]; globalThis.fetch=async(url)=>{ volano.push(String(url)); if(/kodZvlast/.test(url)&&/uzivatelske/.test(url)) return {ok:false,status:400,text:async()=>'neznamy parametr'}; return {ok:true,status:200,text:async()=>irCsv.join('\n')}; };
r=await call(env); j=await r.json();
T('U1 s kodZvlast selže → U2 bez něj projde',r.status===200&&/^U2/.test(j.zdroj)&&j.rada.length===13);
// vlastní výběr uložený jako MEZIMĚSÍČNÍ index → pozná se a padne na zálohu s vysvětlením
const imCsv=irCsv.map(l=>l.replace('"Meziroční index","IR"','"Meziměsíční index","IM"'));
globalThis.fetch=async(url)=>({ok:true,status:200,text:async()=>(/uzivatelske/.test(url)?imCsv:baz).join('\n')});
r=await call(env); j=await r.json();
T('meziměsíční výběr → záloha + pokus uvádí typ IM',/CEN0101ET03/.test(j.zdroj)&&j.pokusy.some(p=>p.typy&&p.typy.includes('IM')));
r=await call({}); j=await r.json();
T('bez proměnné → vlastniVyber hlásí, že CSU_VYBER_URL chybí',/CSU_VYBER_URL neni nastavena/.test(j.vlastniVyber));
// ── chyby ──
globalThis.fetch=async()=>({ok:true,status:200,text:async()=>'"A","B"\n"1","2"'}); r=await call(); j=await r.json();
T('neznámý formát → 502 s hlavičkou a ukázkou',r.status===502&&j.pokusy[0].chyba==='neznama hlavicka');
const jen1=[HL,R('IZ2025','Bazický index (2025 = 100)','0','Úhrn','2026-08','103.0')];
globalThis.fetch=async()=>({ok:true,status:200,text:async()=>jen1.join('\n')}); r=await call(); j=await r.json();
T('bez měsíce o rok zpět → poctivá chyba s typy a měsíci',r.status===502&&j.pokusy[0].chyba==='nelze spocitat mezirocni inflaci'&&j.pokusy[0].mesice[0]==='2026-08');
globalThis.fetch=async()=>{throw new Error('síť');}; r=await call();
T('výjimka sítě → 502 s CORS',r.status===502&&r.headers.get('Access-Control-Allow-Origin')==='https://financeflow.cz');
T('POST dotazy na /vlastni jsou pryč (z workeru vždy 500)',!/\/vlastni\?/.test(src)&&!/csuVarianty/.test(src));
r=await mod.default.fetch(new Request('https://w/archiv/list',{method:'POST',headers:{...H,'Content-Type':'application/json'},body:'{}'}),{ARCHIV:{}});
T('/archiv/list dál odpovídá (bez tokenu 401)',r.status===401);
console.log(`Worker /inflace + /archiv: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
