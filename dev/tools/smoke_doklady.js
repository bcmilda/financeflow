// S23 (TODO-304): archiv dokladů – záruky, řazení, výpis. node tools/smoke_doklady.js
const fs=require('fs');const R=fs.readFileSync(process.argv[2]||'receipts.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=n=>{let a=R.indexOf('async function '+n+'(');if(a<0)a=R.indexOf('function '+n+'(');let i=R.indexOf('{',a),d=0;for(;i<R.length;i++){if(R[i]==='{')d++;else if(R[i]==='}'){d--;if(!d)break;}}return R.slice(a,i+1);};
const g=n=>{const c=cut(n);eval(c.replace(/^async /,'').replace('function '+n,'global.'+n+'='+(c.startsWith('async')?'async ':'')+'function'));};
eval(R.slice(R.indexOf('const DOKLAD_VAROVANI_DNI'),R.indexOf('\n',R.indexOf('const DOKLAD_VAROVANI_DNI'))).replace('const ','global.'));
['dokladZaruka','dokladySeznam','buildDokladyTab'].forEach(g);
global.escHtml=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
global.fmtP=v=>String(v);
const D=(s)=>new Date(s).getTime();
const dnes=D('2026-09-24');
// ── záruky ──
T('bez nastavené záruky → „bez záruky"',dokladZaruka({date:'2025-01-10'},dnes).stav==='bez');
T('24 měsíců od data účtenky',dokladZaruka({date:'2025-01-10',warrantyMonths:24},dnes).datum==='10. 1. 2027');
T('platná záruka daleko → stav plati',dokladZaruka({date:'2025-01-10',warrantyMonths:24},dnes).stav==='plati');
const k=dokladZaruka({date:'2024-11-01',warrantyMonths:24},dnes);
T('konec do 60 dnů → varování s počtem dní',k.stav==='konci'&&k.dni===38&&/záruka končí za 38 dní/.test(k.text));
T('po konci → propadla',dokladZaruka({date:'2020-01-01',warrantyMonths:24},dnes).stav==='propadla');
T('rozbité datum nespadne',dokladZaruka({date:'nesmysl',warrantyMonths:24},dnes).stav==='bez');
T('skloňování dní (1 den)',/za 1 den /.test(dokladZaruka({date:'2024-09-25',warrantyMonths:24},dnes).text));
T('poslední den záruky = 0 dní, ještě platí',dokladZaruka({date:'2024-09-24',warrantyMonths:24},dnes).dni===0);
T('den po konci už propadla',dokladZaruka({date:'2024-09-23',warrantyMonths:24},dnes).stav==='propadla');
// ── seznam ──
const recs=[
 {store:'Alza',date:'2024-11-01',photoKey:'k1',warrantyMonths:24},        // končí za 38 dní
 {store:'Bez fotky',date:'2026-09-01'},                                    // nepatří do archivu
 {store:'IKEA',date:'2026-09-01',photoKey:'k2',warrantyMonths:24},         // platí
 {store:'Datart',date:'2020-01-01',photoKey:'k3',warrantyMonths:24},       // propadlá
 {store:'Lidl',date:'2026-08-15',photoKey:'k4'},                           // bez záruky
 {store:'Datart2',date:'2024-10-20',photoKey:'k5',warrantyMonths:24},      // končí za 26 dní
];
const l=dokladySeznam(recs,dnes);
T('do archivu jdou jen účtenky s fotkou',l.length===5&&!l.some(x=>x.r.store==='Bez fotky'));
T('nahoře to, co hoří, a dřívější konec první',l[0].r.store==='Datart2'&&l[1].r.store==='Alza');
T('propadlé záruky jsou úplně dole',l[l.length-1].r.store==='Datart');
T('index ukazuje na původní účtenku',recs[l[0].i].store==='Datart2');
// ── výpis ──
global.S={receipts:recs};
const h=buildDokladyTab(recs);
T('hlavička shrne, kolika dokladům končí záruka',/2<\/b> dokladů má záruku ke konci/.test(h));
T('ukáže stav kvóty',/5 z 300/.test(h));
T('náhled nese klíč pro dotažení z R2',/data-key="k1"/.test(h));
T('tlačítka: otevřít, záruka, poznámka, smazat',/dokladOtevri\(/.test(h)&&/dokladZaruku\(/.test(h)&&/dokladPoznamka\(/.test(h)&&/dokladSmaz\(/.test(h));
T('prázdný archiv poradí, kde doklad uschovat',/Uschovat fotku účtenky/.test(buildDokladyTab([]))&&/Přidat fotku dokladu/.test(buildDokladyTab([])));   // S25: nové popisky
T('poznámka se escapuje',/&lt;img/.test(buildDokladyTab([{store:'X',date:'2026-01-01',photoKey:'k',photoNote:'<img src=x onerror=alert(1)>'}])));
// ── zapojení ──
T('záložka je v liště i v přepínači',/id="utab-doklady"/.test(R)&&/'discounts','doklady','stores'/.test(R));
T('náhledy se tahají až po otevření záložky',/tab==='doklady' && typeof dokladyNactiNahledy/.test(R)&&/dataset\.nacteno/.test(R));
console.log(`Archiv dokladů: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
