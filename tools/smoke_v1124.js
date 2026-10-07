// FinanceFlow · smoke test · S24 · v11.24 český název výrobku (zdroje, návrhy), fotka obalu a tabulky živin
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
const TJ=R('taxonomie.json','../data/taxonomie.json');
const db={}; const get=p=>p.split('/').filter(Boolean).reduce((o,k)=>o&&o[k],db);
const set=(p,v)=>{const ks=p.split('/').filter(Boolean);let o=db;ks.slice(0,-1).forEach(k=>o=o[k]=o[k]||{});if(v===null)delete o[ks.at(-1)];else o[ks.at(-1)]=v;};
let aiOdpoved='';
const w={console,Date,Math,JSON,Promise,URL,setTimeout,TextEncoder,atob,btoa,crypto:globalThis.crypto,Request:class{},Response:class{constructor(b,o={}){this.body=b;this.status=o.status||200;}},caches:{default:{}},
 fetch:async(u,o={})=>{u=String(u);
  if(u.includes('financeflow.cz/data/taxonomie.json')) return {ok:true,json:async()=>JSON.parse(TJ)};
  if(u.includes('api.anthropic.com')) return {ok:true,json:async()=>({content:[{text:aiOdpoved}]})};
  if(u.includes('firebasedatabase')){const p=decodeURIComponent(u.split('.app/')[1].split('.json')[0]);const m=o.method||'GET';
    if(m==='GET')return {ok:true,json:async()=>get(p)??null}; if(m==='PUT'){set(p,JSON.parse(o.body));return {ok:true,json:async()=>({})};}}
  throw new Error(u);}};
vm.createContext(w); vm.runInContext(R('worker.js','../cloudflare-worker/worker.js').replace('export default {','globalThis.__w = {'),w);
const env={FIREBASE_DB_SECRET:'S',ANTHROPIC_API_KEY:'k'};
const odp=r=>JSON.parse(r.body);
(async()=>{
 let r=odp(await w.eanAkceNazev('U1','4056489321453',{nazev:'Mléčná čokoláda s celými mandlemi'},env,{}));
 t('návrh názvu uložen (anonymně) + vlastní název',r.pocet===1&&get('users/U1/eanNazvy/4056489321453').nazev==='Mléčná čokoláda s celými mandlemi'&&Object.values(get('community/eanNavrhyNazvu/4056489321453'))[0].pocet===1);
 t('komunita bez uid',!JSON.stringify(get('community')).includes('U1'));
 r=odp(await w.eanAkceNazev('U1','4056489321453',{nazev:'Mléčná čokoláda s celými mandlemi'},env,{}));
 t('stejný uživatel podruhé = nezvyšuje',Object.values(get('community/eanNavrhyNazvu/4056489321453'))[0].pocet===1);
 await w.eanAkceNazev('U2','4056489321453',{nazev:'mléčná čokoláda s celými mandlemi'},env,{});
 t('druhý uživatel = 2',Object.values(get('community/eanNavrhyNazvu/4056489321453'))[0].pocet===2);
 await w.eanAkceNazev('U2','4056489321453',{nazev:''},env,{});
 t('zrušení vlastního názvu ubere hlas',Object.values(get('community/eanNavrhyNazvu/4056489321453'))[0].pocet===1&&!get('users/U2/eanNazvy/4056489321453'));
 const img='A'.repeat(200);
 aiOdpoved='{"nazev_cs":"Hořká čokoláda","nazev_obal":"Bitterschokolade","znacka":"Moser","mnozstvi":"100 g","obecny":"hořká čokoláda"}';
 r=odp(await w.eanAkceFoto('U1','8590000000005',{druh:'obal',obrazek:img},env,{}));
 const p=get('community/eanProdukty/8590000000005');
 t('fotka obalu: neznámý výrobek vznikne z fotky',p.stav==='nalezeno'&&p.zdroj==='fotka obalu'&&p.nazevCs==='Hořká čokoláda'&&p.nazevCsZdroj==='foto'&&p.znacka==='Moser'&&p.mnozstvi.hodnota===100&&p.obecnyId==='horka cokolada',p);
 aiOdpoved='{"kcal":540,"tuky":31.5,"nasycene":19,"sacharidy":52,"cukry":48.2,"bilkoviny":7,"sul":0.2,"slozeni_cs":"cukr, kakaové máslo"}';
 r=odp(await w.eanAkceFoto('U1','8590000000005',{druh:'ziviny',obrazek:img},env,{}));
 const p2=get('community/eanProdukty/8590000000005');
 t('fotka živin: uloženo jako „podle obalu"',p2.nutriceObal.kcal===540&&p2.nutriceObal.cukry===48.2&&p2.slozeniObal==='cukr, kakaové máslo'&&p2.nazevCs==='Hořká čokoláda');
 t('fotka se neukládá',!JSON.stringify(db).includes(img));
 t('neplatná fotka = 400',(await w.eanAkceFoto('U1','8590000000005',{druh:'obal',obrazek:'xx'},env,{})).status===400);
 t('limit ean_foto Free 3',/free:\s*\{[^}]*ean_foto: 3/.test(R('worker.js','../cloudflare-worker/worker.js')));
 t('obnova po 90 dnech zachová doplněná data',/EAN_ZACHOVAT\.forEach/.test(R('worker.js','../cloudflare-worker/worker.js')));
 // klient
 const c={console,window:{},localStorage:{getItem:()=>null},document:{getElementById:()=>null,createElement:()=>({style:{}}),body:{appendChild(){}}},fetch:async()=>({ok:true,json:async()=>null}),setTimeout,URL,escHtml:s=>String(s).replace(/</g,'&lt;')};
 c.window=c; vm.createContext(c); vm.runInContext(R('ean-sken.js','../js/ean-sken.js'),c);
 const P={stav:'nalezeno',nazev:'Vollmilch Schokolade',nazevCesky:false,nazevCs:'Mléčná čokoláda s mandlemi',nazevCsZdroj:'ai'};
 vm.runInContext('_eanMojeNazvy={}',c);
 t('zdroj názvu: návrh AI / schválený / z databáze / z fotky',c.eanZdrojNazvu(P,'x')==='návrh AI'&&c.eanZdrojNazvu(Object.assign({},P,{nazevCsZdroj:'admin'}),'x')==='schválený komunitou'&&c.eanZdrojNazvu({nazevCesky:true,nazev:'a'},'x')==='z databáze'&&c.eanZdrojNazvu(Object.assign({},P,{nazevCsZdroj:'foto'}),'x')==='z fotky obalu');
 const h=c.eanNazvyHTML(P,'4056489321453','mk');
 t('karta: název z kódu i český se zdrojem',h.includes('Název z kódu:')&&h.includes('Vollmilch Schokolade')&&h.includes('Mléčná čokoláda s mandlemi')&&h.includes('návrh AI')&&h.includes('✎ Opravit'));
 vm.runInContext('_eanMojeNazvy={"4056489321453":{nazev:"Moje čokoláda"}}',c);
 t('tvůj název má přednost',c.eanNazevVyrobku(P,'4056489321453')==='Moje čokoláda'&&c.eanZdrojNazvu(P,'4056489321453')==='tvůj název');
 t('chybí český název → Doplnit',c.eanNazvyHTML({stav:'nalezeno',nazev:'X',nazevCesky:false},'1','mk').includes('zatím chybí'));
 const f=c.eanFotoTlacitkaHTML('1',{stav:'nenalezeno'},'cb');
 t('fotka: neznámý výrobek → obal + Open Food Facts',f.includes('Vyfotit obal')&&f.includes('Open Food Facts')&&f.includes('neukládá'));
 t('fotka: kompletní výrobek → jen živiny',!c.eanFotoTlacitkaHTML('1',{stav:'nalezeno',nazevCesky:true,obecnyId:'x'},'cb').includes('Vyfotit obal'));
 const RC=R('receipts.js','../js/receipts.js');
 t('karta: živiny z obalu mají přednost a popisek',/p\.nutriceObal \|\| p\.nutrice/.test(RC)&&(RC.includes('podle českého obalu')||RC.includes('eanZivinyZdroj(p.nutriceObal)')));   // S25: popisek podle zdroje (fotka / ručně)
 const RL=JSON.parse(R('database.rules.json','../database.rules.json').replace(/^\s*\/\/.*$/mg,''));
 t('pravidla: návrhy názvů jen worker/admin',RL.rules.community.eanNavrhyNazvu['.write'].includes('LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'));
 console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
})();
