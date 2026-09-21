// Test workeru: /inflace přes DataStat API (S23, TODO-290) + /archiv žije.
// Volá skutečný fetch() handler workeru s falešnou odpovědí ČSÚ.
import fs from 'fs';
const src=fs.readFileSync(process.argv[2]||'worker.js','utf8');
const mod=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const H={'Origin':'https://financeflow.cz'};
const call=()=>mod.default.fetch(new Request('https://w/inflace',{headers:H}),{});
// CSV ve tvaru DataStatu (kodZvlast=true): texty + kódy, hodnota s desetinnou čárkou
const hl='"Ukazatel","IndicatorType","Typ indexu","TYPUDAJE4A","Klasifikace COICOP 2018","CZCOICOP2","Skupiny domácností","EKAKTIOCDS","Území","UZ02P","Měsíce","CasM","Hodnota"';
const mes=[]; for(let k=13;k>=1;k--){const d=new Date(2026,8-k,1);mes.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}   // 2025-08 … 2026-08
const radek=(kod,naz,obd,h)=>`"Index spotřebitelských cen","6134","Meziroční index","IR","${naz}","${kod}","Domácnosti celkem","0","Česko","CZ","x","${obd}","${String(h).replace('.',',')}"`;
let csv=[hl];
mes.forEach((o,i)=>{ csv.push(radek('0','Úhrn',o,102+i*0.1)); csv.push(radek('01','Potraviny a nealkoholické nápoje',o,104+i*0.1)); csv.push(radek('04','Bydlení, voda, energie a paliva',o,103)); });
csv.push(radek('0111','Obiloviny',mes[12],110));                  // skupina – nesmí se započítat
let posledniTelo=null;
globalThis.fetch=async(url,opt)=>{ posledniTelo=opt&&opt.body; return {ok:true,status:200,text:async()=>'\uFEFF'+csv.join('\r\n')}; };
let r=await call(), j=await r.json();
T('200 s CORS',r.status===200&&r.headers.get('Access-Control-Allow-Origin')==='https://financeflow.cz');
T('ptá se API metodou POST jen na potřebné řádky',(()=>{const b=JSON.parse(posledniTelo);const f=k=>b.sloupce.find(s=>s.kodDimenze===k).filtr[0].zobrazitPolozky;return f('IndicatorType')[0]==='6134'&&f('TYPUDAJE4A')[0]==='IR'&&f('EKAKTIOCDS')[0]==='0'&&f('UZ02P')[0]==='CZ'&&f('CZCOICOP2').length===14&&f('CasM').length===15;})());
T('celková inflace = poslední měsíc úhrnu (103,2 − 100 = 3,2)',j.inflace===3.2&&j.obdobi==='2026-08'&&j.rok===2026&&j.mesic===8);
T('řada 13 měsíců, seřazená',j.rada.length===13&&j.rada[0].obd==='2025-08'&&j.rada[12].obd==='2026-08');
T('oddíly s názvem a mírou za poslední měsíc',j.oddily['01'].mira===5.2&&/Potraviny/.test(j.oddily['01'].nazev)&&j.oddily['04'].mira===3);
T('řady oddílů po 13 měsících',j.radaOddily['01'].length===13);
T('skupina 0111 se nezapočítá',!j.oddily['0111']&&!j.radaOddily['0111']);
T('Hodnota s desetinnou čárkou se přečte',j.rada[1].inflace===2.1);
// ČSÚ změní hlavičku → poctivá chyba s ukázkou
csv=['"A","B","C"','"1","2","3"']; r=await call(); j=await r.json();
T('neznámá hlavička → 502 s hlavičkou, ne nesmysl',r.status===502&&/neznama hlavicka/.test(j.error)&&Array.isArray(j.hlavicka));
// ČSÚ nedostupné
globalThis.fetch=async()=>({ok:false,status:503,text:async()=>'Service Unavailable'}); r=await call();
T('ČSÚ nedostupné → 502 s CORS',r.status===502&&r.headers.get('Access-Control-Allow-Origin')==='https://financeflow.cz');
globalThis.fetch=async()=>{throw new Error('síť');}; r=await call();
T('výjimka → 502 s CORS',r.status===502&&r.headers.get('Access-Control-Allow-Origin')==='https://financeflow.cz');
// diagnostika pryč, archiv žije
r=await mod.default.fetch(new Request('https://w/inflace-diag',{headers:H}),{});
T('dočasná /inflace-diag je odstraněná',r.status!==200||!/katalog/.test(await r.text()));
r=await mod.default.fetch(new Request('https://w/archiv/list',{method:'POST',headers:{...H,'Content-Type':'application/json'},body:'{}'}),{ARCHIV:{}});
T('/archiv/list dál odpovídá (bez tokenu 401)',r.status===401);
console.log(`Worker /inflace (DataStat) + /archiv: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
