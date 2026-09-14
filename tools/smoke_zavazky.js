// FinanceFlow · v10.63 · tools/smoke_zavazky.js · 2026-09-12
// S22 · FIX „Kam růst přistál" + historie šablon (fixedTotal).
//
// Karta od S10 tvrdila nepravdu: počítala Math.min(růst výdajů, součet VŠECH
// šablon). Součet šablon je u běžné domácnosti 15–20 tis. Kč, takže minimum
// vyšlo skoro vždy rovno růstu a karta hlásila, že CELÝ růst přistál
// v trvalých závazcích — i když se žádná pravidelná platba nezměnila.
// Věta „zbytek byly jednorázové výdaje" mluvila vždycky o nule.
const fs = require('fs'), vm = require('vm');
let fails = 0;
const check = (n,f) => { try{ f(); console.log('  ✅', n); } catch(e){ fails++; console.log('  ❌', n, '→', e.message); } };
const assert = (c,m) => { if(!c) throw new Error(m); };
const blizko = (a,b,tol) => Math.abs(a-b) <= tol;

const noop = () => {};
const el = new Proxy({}, { get:(t,k)=> k==='style'?{}:noop });
const sb = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Map, Set, Promise,
  Infinity, NaN, isFinite, isNaN, parseInt, parseFloat, setTimeout, clearTimeout, Intl,
  window:{}, document:{ getElementById:()=>null, querySelector:()=>null, querySelectorAll:()=>[],
    createElement:()=>el, addEventListener:noop, body:el, documentElement:el },
  localStorage:{getItem:()=>null,setItem:noop,removeItem:noop},
  navigator:{language:'cs-CZ'}, location:{href:'x',pathname:'/'},
  fetch:()=>Promise.resolve({ok:false,json:()=>Promise.resolve({})}),
  requestAnimationFrame:c=>setTimeout(c,0), IntersectionObserver:class{observe(){}disconnect(){}},
  confirm:()=>true, alert:noop,
};
sb.window = sb; sb.globalThis = sb; sb.self = sb;
vm.createContext(sb);
['helpers.js','assets.js','debts.js','projects.js'].forEach(f=>{
  try{ vm.runInContext(fs.readFileSync(f,'utf8'), sb, {filename:f}); }
  catch(e){ console.error('❌ Nelze načíst '+f+': '+e.message); process.exit(2); }
});
sb.S = { curMonth:6, curYear:2026, diary:{} };
vm.runInContext('S = globalThis.S; getData = () => globalThis.__D;', sb);
const vypocet = (D) => { sb.__D = D; return vm.runInContext('sablonyFixedTotal(__D)', sb); };

console.log('── Měsíční objem trvalých závazků ──');

check('sečte měsíční šablony', () => {
  const v = vypocet({ sablony:[
    {name:'Nájem', amount:-12000, type:'expense', freq:'monthly'},
    {name:'Netflix', amount:-280, type:'expense', freq:'monthly'},
  ]});
  assert(v === 12280, 'vyšlo '+v+', čekáno 12280');
});

check('FIX · roční platba se přepočítá na měsíc (starý kód ji bral celou)', () => {
  const v = vypocet({ sablony:[{name:'Pojištění', amount:-12000, type:'expense', freq:'yearly'}] });
  assert(v === 1000, 'roční 12000 Kč vyšlo jako '+v+'/měs, čekáno 1000');
});

check('týdenní a čtvrtletní se přepočítají taky', () => {
  const t = vypocet({ sablony:[{amount:-1000, type:'expense', freq:'weekly'}] });
  assert(blizko(t, 4333, 2), 'týdenní 1000 Kč vyšlo '+t+', čekáno ~4333');
  const q = vypocet({ sablony:[{amount:-3000, type:'expense', freq:'quarterly'}] });
  assert(q === 1000, 'čtvrtletní 3000 Kč vyšlo '+q+', čekáno 1000');
});

check('příjmy a převody se nepočítají', () => {
  const v = vypocet({ sablony:[
    {name:'Výplata', amount:40000, type:'income', freq:'monthly'},
    {name:'Na spoření', amount:-5000, type:'transfer', freq:'monthly'},
    {name:'Nájem', amount:-12000, type:'expense', freq:'monthly'},
  ]});
  assert(v === 12000, 'vyšlo '+v+' – započítal příjem nebo převod');
});

check('prošlá šablona se nepočítá', () => {
  const v = vypocet({ sablony:[
    {name:'Starý leasing', amount:-4500, type:'expense', freq:'monthly', endDate:'2025-01-01'},
    {name:'Nájem', amount:-12000, type:'expense', freq:'monthly'},
  ]});
  assert(v === 12000, 'vyšlo '+v+' – počítá i ukončenou šablonu');
});

check('bez šablon vrací 0, ne pád', () => {
  assert(vypocet({}) === 0, 'prázdná data nevrací 0');
  assert(vypocet({sablony:[]}) === 0, 'prázdné pole nevrací 0');
});

console.log('\n── Historie ze snímků ──');
const before = (zpet) => vm.runInContext(`sablonyFixedBefore(__D, ${zpet})`, sb);

check('bez snímku vrací null (ne nulu – nula by lhala, že se tehdy neplatilo nic)', () => {
  sb.S.diary = {}; sb.__D = {};
  assert(before(6) === null, 'vrátilo '+before(6)+' místo null');
});

check('snímek bez pole fixedTotal se nepovažuje za nulu', () => {
  sb.S.diary = { '2026-01': { predInc: 40000 } };   // starý snímek z doby před v10.63
  assert(before(6) === null, 'starý snímek se tváří jako nula');
});

check('snímek s fixedTotal se načte', () => {
  sb.S.diary = { '2026-01': { predInc: 40000, fixedTotal: 14000 } };
  assert(before(6) === 14000, 'načetlo '+before(6));
});

console.log('\n── FIX: karta už netvrdí, že celý růst padl do závazků ──');

//  Reprodukce původní vady na číslech, aby bylo vidět, co se opravilo.
check('starý vzorec min(dExp, součet šablon) hlásil celý růst jako závazky', () => {
  const soucetSablon = 18180;
  [500, 2000, 5000, 9000].forEach(dExp=>{
    const stary = Math.min(dExp, soucetSablon);
    assert(stary === dExp, 'kontrola reprodukce selhala');
  });
});

check('nový vzorec bez historie NEVYDÁ číslo (řekne, že to zatím neumí)', () => {
  const src = fs.readFileSync('projects.js','utf8');
  assert(!/const inFixed = Math\.min\(dExp, fixed\)/.test(src), 'starý vzorec je pořád v kódu');
  assert(/zatím nelze určit/.test(src), 'karta nemá poctivý stav pro chybějící historii');
  assert(/sablonyFixedBefore/.test(src), 'karta nečte historii ze snímků');
});

check('nový vzorec s historií spočítá skutečný přírůstek závazků', () => {
  //  výdaje vzrostly o 5000, z toho závazky o 1500 → zbytek 3500 jednorázově
  const dExp = 5000, fixedNyni = 15500, fixedDrive = 14000;
  const dFixed = fixedNyni - fixedDrive;
  const vZavazcich = Math.max(0, Math.min(dExp, dFixed));
  const jednorazove = Math.max(0, dExp - vZavazcich);
  assert(vZavazcich === 1500, 'závazky '+vZavazcich);
  assert(jednorazove === 3500, 'jednorázové '+jednorazove);
});

check('závazky klesly → do růstu nepřistálo nic (ne záporné číslo)', () => {
  const dExp = 5000, dFixed = -2000;
  const vZavazcich = Math.max(0, Math.min(dExp, dFixed));
  assert(vZavazcich === 0, 'vyšlo '+vZavazcich+' místo 0');
});

check('závazky vzrostly víc než celkové výdaje → strop drží', () => {
  const dExp = 1000, dFixed = 4000;
  const vZavazcich = Math.max(0, Math.min(dExp, dFixed));
  assert(vZavazcich === 1000, 'vyšlo '+vZavazcich+' – do závazků přistálo víc, než výdaje vzrostly');
});

console.log('\n── Snímek ukládá fixedTotal ──');

check('_denikBuildSnap zapisuje fixedTotal', () => {
  const src = fs.readFileSync('projects.js','utf8');
  const i = src.indexOf('function _denikBuildSnap');
  assert(i > 0, 'funkce nenalezena');
  const usek = src.slice(i, i + 2500);
  assert(/fixedTotal:/.test(usek), 'snímek fixedTotal neukládá – historie by se nezačala kupit');
});

console.log('\n── Záznam změn objemu šablon (fixedLog) ──');

const touch = (D) => { sb.__D = D; return vm.runInContext('fixedLogTouch(__D)', sb); };
const logAt = (kdy) => vm.runInContext(`fixedLogAt(${JSON.stringify(kdy)})`, sb);
const log = () => vm.runInContext('S.fixedLog', sb);

check('prázdný začátek nezapíše nulu (není to zrušení závazků, jen prázdno)', () => {
  sb.S.fixedLog = [];
  touch({ sablony:[] });
  assert(log().length === 0, 'zapsal nulu do prázdného logu');
});

check('první šablona se zapíše', () => {
  sb.S.fixedLog = [];
  touch({ sablony:[{amount:-12000, type:'expense', freq:'monthly'}] });
  assert(log().length === 1 && log()[0].total === 12000, 'log: '+JSON.stringify(log()));
});

check('beze změny objemu log neroste', () => {
  const D = { sablony:[{amount:-12000, type:'expense', freq:'monthly'}] };
  touch(D); touch(D); touch(D);
  assert(log().length === 1, 'log narostl na '+log().length+' bez změny objemu');
});

check('změna objemu přidá záznam', () => {
  touch({ sablony:[{amount:-12000, type:'expense', freq:'monthly'},
                   {amount:-3000, type:'expense', freq:'monthly'}] });
  assert(log().length === 2 && log()[1].total === 15000, 'log: '+JSON.stringify(log()));
});

check('hodnota k dřívějšímu datu se zrekonstruuje', () => {
  sb.S.fixedLog = [
    { ts: new Date('2026-01-10').getTime(), total: 14000 },
    { ts: new Date('2026-05-20').getTime(), total: 15500 },
  ];
  assert(logAt('2026-03-01') === 14000, 'k březnu vyšlo '+logAt('2026-03-01'));
  assert(logAt('2026-07-01') === 15500, 'k červenci vyšlo '+logAt('2026-07-01'));
});

check('před začátkem logu vrací null, ne nulu', () => {
  assert(logAt('2025-06-01') === null, 'vrátilo '+logAt('2025-06-01')+' místo null');
});

check('fixedLog je v synchronizačním schématu (jinak ho Firebase tiše smaže)', () => {
  const app = fs.readFileSync('app.js','utf8');
  assert(/_DW_META[^\n]*'fixedLog'/.test(app), 'chybí v _DW_META (TODO-257)');
  assert((app.match(/fixedLog/g)||[]).length >= 4, 'není ve všech schématech');
});

check('fixedLog se NEsdílí partnerovi', () => {
  const app = fs.readFileSync('app.js','utf8');
  const i = app.indexOf('ZÁMĚRNĚ SE NESDÍLÍ');
  assert(i > 0 && /fixedLog/.test(app.slice(i, i+700)), 'není mezi nesdílenými');
});

console.log('\n── Mazání snímků zrušeno ──');

check('tlačítko „Vytrhnout list" je pryč', () => {
  const src = fs.readFileSync('projects.js','utf8');
  assert(!/onclick="denikDeleteSnap/.test(src), 'tlačítko je pořád v UI');
});

check('denikDeleteSnap už nemaže', () => {
  const src = fs.readFileSync('projects.js','utf8');
  const i = src.indexOf('function denikDeleteSnap');
  const usek = src.slice(i, i+400);
  assert(!/delete S\.diary/.test(usek), 'pořád maže snímek');
});

console.log(fails ? `\n❌ SELHALO ${fails}` : '\n✅ ZÁVAZKY OVĚŘENY');
process.exit(fails ? 1 : 0);
