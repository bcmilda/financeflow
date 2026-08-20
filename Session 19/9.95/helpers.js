// FinanceFlow · v9.95 · helpers.js · 2026-08-19
//  HELPERS
// ══════════════════════════════════════════════════════
const fmt=n=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(n||0);

// ── COICOP skupiny – globální konstanta (Session 9, ADR-044)
// Definováno zde v helpers.js aby bylo dostupné ve stats.js, projects.js i receipts.js.
// receipts.js má vlastní kopii COICOP_GROUPS_DEF – při konfliktu má přednost tato (helpers.js se načítá dříve).
if(typeof COICOP_GROUPS_DEF === 'undefined'){
  window.COICOP_GROUPS_DEF = [
    {id:1,  name:'Potraviny a nealkoholické nápoje',     icon:'🛒', color:'#4ade80', avg_osoba:3300, avg_domacnost:7920, groups:['01.1 Potraviny','01.2 Nealkoholické nápoje']},
    {id:2,  name:'Alkoholické nápoje, tabák',            icon:'🍺', color:'#f59e0b', avg_osoba:620,  avg_domacnost:1490, groups:['02.1 Alkoholické nápoje','02.2 Služby pro výrobu alkoholu','02.3 Tabákové výrobky','02.4 Narkotika']},
    {id:3,  name:'Odívání a obuv',                       icon:'👗', color:'#f472b6', avg_osoba:700,  avg_domacnost:1680, groups:['03.1 Oděvy','03.2 Obuv']},
    {id:4,  name:'Bydlení, voda, energie, paliva',       icon:'🏠', color:'#60a5fa', avg_osoba:5200, avg_domacnost:12480, groups:['04.1 Nájemné z bytu','04.3 Běžná údržba a opravy bytu','04.4 Dodávka vody a jiné služby','04.5 Elektřina, plyn a ostatní paliva']},
    {id:5,  name:'Vybavení domácnosti, údržba',          icon:'🛋️', color:'#a78bfa', avg_osoba:1100, avg_domacnost:2640, groups:['05.1 Nábytek a vybavení','05.2 Bytový textil','05.3 Domácí spotřebiče','05.4 Sklo, nádobí a potřeby','05.5 Nářadí pro dům a zahradu','05.6 Běžná údržba domácnosti']},
    {id:6,  name:'Zdraví',                               icon:'💊', color:'#f87171', avg_osoba:900,  avg_domacnost:2160, groups:['06.1 Léčiva a zdravotnické potřeby','06.2 Ambulantní služby','06.3 Nemocniční služby']},
    {id:7,  name:'Doprava',                              icon:'🚗', color:'#fb923c', avg_osoba:2400, avg_domacnost:5760, groups:['07.1 Nákup vozidel','07.2 Provoz osobní dopravy','07.3 Dopravní služby']},
    {id:8,  name:'Informace a komunikace',               icon:'📱', color:'#34d399', avg_osoba:750,  avg_domacnost:1800, groups:['08.1 Poštovní služby','08.2 Telefon a zařízení','08.3 Internet a informační služby']},
    {id:9,  name:'Rekreace, sport a kultura',            icon:'🎭', color:'#e879f9', avg_osoba:1900, avg_domacnost:4560, groups:['09.1 Audiovizuální a IT zařízení','09.2 Sport, zahrada, mazlíčci','09.3 Rekreační a kulturní služby','09.4 Tisk, knihy, papírnictví','09.5 Dovolené (balíčky)']},
    {id:10, name:'Vzdělávání',                           icon:'📚', color:'#2dd4bf', avg_osoba:250,  avg_domacnost:600,  groups:['10.x Vzdělávání (předškolní až vysokoškolské)']},
    {id:11, name:'Stravování a ubytování',               icon:'🍽️', color:'#facc15', avg_osoba:1500, avg_domacnost:3600, groups:['11.1 Stravovací služby','11.2 Ubytovací služby']},
    {id:12, name:'Pojištění a finanční služby',          icon:'🛡️', color:'#94a3b8', avg_osoba:900,  avg_domacnost:2160, groups:['12.1 Pojištění','12.2 Finanční služby']},
    {id:13, name:'Osobní péče, sociální ochrana, různé', icon:'🧴', color:'#cbd5e1', avg_osoba:1100, avg_domacnost:2640, groups:['13.1 Osobní péče','13.2 Sociální ochrana','13.3 Jiné zboží a služby']},
  ];
}

// Session 10: 3. úroveň COICOP (třídy) – mapa „kód skupiny → třídy".
// Reprezentativní výběr dle CZ-COICOP 2018 (platná od 1.1.2024). Slouží pro
// rozklikávací strom oddíl → skupina → třída v Komunitním přehledu.
if(typeof window.COICOP_CLASSES === 'undefined'){
  window.COICOP_CLASSES = {
    '01.1':['01.1.1 Pekárenské výrobky a obiloviny','01.1.2 Maso','01.1.3 Ryby a mořské plody','01.1.4 Mléko, sýry a vejce','01.1.5 Oleje a tuky','01.1.6 Ovoce','01.1.7 Zelenina','01.1.8 Cukr, marmeláda, sladkosti','01.1.9 Ostatní potravinářské výrobky'],
    '01.2':['01.2.1 Káva, čaj a kakao','01.2.2 Minerální vody, nealko nápoje, šťávy'],
    '02.1':['02.1.1 Lihoviny','02.1.2 Víno','02.1.3 Pivo'],
    '02.3':['02.3.0 Tabákové výrobky'],
    '03.1':['03.1.1 Oděvní materiály','03.1.2 Oděvy','03.1.3 Ostatní oděvní doplňky','03.1.4 Čištění a opravy oděvů'],
    '03.2':['03.2.1 Obuv','03.2.2 Opravy obuvi'],
    '04.1':['04.1.1 Skutečné nájemné za bydlení'],
    '04.3':['04.3.1 Materiály pro údržbu bytu','04.3.2 Služby pro údržbu bytu'],
    '04.4':['04.4.1 Dodávka vody','04.4.2 Sběr odpadu','04.4.3 Stočné','04.4.4 Ostatní služby bydlení'],
    '04.5':['04.5.1 Elektřina','04.5.2 Plyn','04.5.3 Tekutá paliva','04.5.4 Tuhá paliva','04.5.5 Teplo'],
    '05.1':['05.1.1 Nábytek a bytové zařízení','05.1.2 Koberce a podlahové krytiny'],
    '05.3':['05.3.1 Velké domácí spotřebiče','05.3.2 Malé domácí spotřebiče','05.3.3 Opravy spotřebičů'],
    '06.1':['06.1.1 Léčiva','06.1.2 Ostatní zdravotnické výrobky','06.1.3 Léčebné a protetické přístroje'],
    '06.2':['06.2.1 Lékařské služby','06.2.2 Stomatologické služby','06.2.3 Paramedicínské služby'],
    '07.1':['07.1.1 Motorová vozidla','07.1.2 Motocykly','07.1.3 Jízdní kola'],
    '07.2':['07.2.1 Náhradní díly','07.2.2 Pohonné hmoty a maziva','07.2.3 Údržba a opravy','07.2.4 Ostatní služby'],
    '07.3':['07.3.1 Železniční doprava','07.3.2 Silniční doprava','07.3.3 Letecká doprava','07.3.4 Vodní doprava'],
    '08.2':['08.2.1 Telefonní přístroje','08.2.2 Telefonní služby'],
    '08.3':['08.3.1 Internetové připojení','08.3.2 Balíčky telekomunikačních služeb'],
    '09.1':['09.1.1 Audiovizuální zařízení','09.1.2 Počítače a příslušenství','09.1.3 Nosiče a software'],
    '09.2':['09.2.1 Sportovní a kempinkové vybavení','09.2.2 Zahrada a domácí mazlíčci'],
    '09.3':['09.3.1 Rekreační a sportovní služby','09.3.2 Kulturní služby (kino, divadlo)'],
    '09.4':['09.4.1 Knihy','09.4.2 Noviny a časopisy','09.4.3 Papírenské zboží'],
    '11.1':['11.1.1 Restaurace, kavárny','11.1.2 Jídelny a závodní stravování'],
    '11.2':['11.2.0 Ubytovací služby'],
    '12.1':['12.1.1 Životní pojištění','12.1.2 Pojištění bydlení','12.1.3 Pojištění zdraví','12.1.4 Pojištění dopravy'],
    '12.2':['12.2.1 Poplatky finančních institucí','12.2.2 Ostatní finanční služby'],
    '13.1':['13.1.1 Kadeřnictví a osobní péče','13.1.2 Elektrické přístroje pro péči','13.1.3 Výrobky pro osobní péči'],
    '13.3':['13.3.1 Jiné osobní potřeby','13.3.2 Sociální ochrana','13.3.3 Ostatní služby'],
  };
}

// Formátování s desetinnými místy – pro účtenky a transakce
const fmtP=n=>{
  const num=parseFloat(n)||0;
  // Pokud je celé číslo, zobraz bez desetinných míst
  if(Number.isInteger(num)) return new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(num);
  // Jinak zobraz max 2 desetinná místa
  return new Intl.NumberFormat('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2}).format(num);
};
const fmtD=s=>new Date(s).toLocaleDateString('cs-CZ',{day:'numeric',month:'short'});
// FIX (S14): syntetické ID transakcí (debt-payment, transfer) nemají vlastní kategorii v datech
// uživatele → dřív se zobrazovalo „?". Built-in fallback dá čitelný název/ikonu i bez kategorie.
const getCat=(id,cats)=>(cats||getData().categories||[]).find(c=>c.id===id)
  || (id==='debt-payment' ? {name:'Splátka', icon:'💳', color:'#b45309', subs:[]}
  :  id==='transfer'      ? {name:'Přesun',  icon:'🔄', color:'#818cf8', subs:[]}
  :  {name:'?',icon:'📋',color:'#666',subs:[]});

// S14: když uživatel napíše novou podkategorii přímo v transakci, přidej ji do kategorie,
// aby šla filtrovat v Transakcích a příště nabídnout jako chip (jinak by zůstala jen jako text na transakci).
function ensureSubcat(catId, sub){
  if(!catId || !sub) return;
  const cat = (S.categories||[]).find(c=>c.id===catId);
  if(!cat) return;
  if(!Array.isArray(cat.subs)) cat.subs = [];
  const s = (''+sub).trim();
  if(s && !cat.subs.includes(s)) cat.subs.push(s);
}
const uid=()=>'id'+Date.now()+Math.random().toString(36).slice(2,6);
// FIX-056: Generátor numerických ID transakcí odolný proti kolizím.
// Date.now() vrací ms-přesné timestampy → při batch importu nebo dvojkliku se může opakovat.
// Přidáme 4-bit random suffix (0-15) → 16× nižší šance kolize ve stejné ms.
// Číslo zůstane bezpečně v Number rangu (max ~5e16, JS limit 2^53 ≈ 9e15... ale skutečné Date.now()*16 ~2.7e13).
function genTxId(){return Date.now()*16+Math.floor(Math.random()*16);}
function hexA(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;}
const getTx=(m,y,data)=>{const D=data||getData();return(D.transactions||[]).filter(t=>{const d=new Date(t.date);return d.getMonth()===(m!==undefined?m:S.curMonth)&&d.getFullYear()===(y!==undefined?y:S.curYear);});};
// FIX-069 (Session 8): isBalancing transakce (EUR vyrovnávací úhrady) se nepočítají do příjmů/výdajů.
// Jsou evidovány v databázi pro úplnost výpisu, ale nesmí ovlivnit finanční statistiky.
// S12.1h: PŘESUNY mezi peněženkami (spoření, banka…) NEJSOU příjem ani výdaj – jen pohyb majetku.
// Pár transakcí sdílí transferId; zůstatky peněženek je započítávají (computeWalletBalance), statistiky NE.
// Set ID kategorií typu 'transfer' (Přesuny) – rebuilduje se z dat (rebuildTransferCatIds).
window._transferCatIds = window._transferCatIds || new Set();
function rebuildTransferCatIds(){
  try {
    const cats = (typeof getData==='function' ? getData().categories : (window.S&&S.categories)) || [];
    window._transferCatIds = new Set(cats.filter(c=>c.type==='transfer').map(c=>c.id));
  } catch(_) { window._transferCatIds = new Set(); }
}

// Spočítá kolik peněz přiteklo do každé transfer-kategorie (Investice, Rezerva...).
// Vrací per kategorii: total (kumulativně), month (tento měsíc), a součet podle cílové skupiny aktiv.
// Výdaj v transfer-kategorii = peníze SEM (do investice), Příjem = peníze VEN (výběr). Net = výdaje - příjmy.
function computeTransferTotals(D){
  D = D || (typeof getData==='function'?getData():{});
  const cats = (D.categories||[]).filter(c=>c.type==='transfer');
  const txs = (D.transactions||[]).filter(t=>!t.splitParent && !t.isBalancing);
  const now = new Date();
  const curM = now.getMonth(), curY = now.getFullYear();
  // Mapa kategorie -> skupina aktiv (investment / savings). Po migraci mají kategorie
  // staré ID (cat10 apod.), proto klasifikujeme i podle NÁZVU – jinak Investice spadne
  // do fallbacku isSaving=savings a velké číslo Investice ukáže 0 (FIX-S14).
  const ASSET_GROUP = { cat_t_invest:'investment', cat_t_trading:'investment', cat_t_funds:'investment',
                        cat_t_reserve:'savings', cat_t_savings:'savings', cat_t_pension:'savings' };
  const _nm = s => (s||'').trim().toLowerCase();
  const INVEST_NAMES = ['investice','trading','fondy','akcie','etf','krypto','podílové fondy'];
  const SAVE_NAMES = ['spoření','sporeni','finanční rezerva','financni rezerva','rezerva','penzijko','penzijní','penzijni'];
  const groupOf = c => ASSET_GROUP[c.id]
    || (INVEST_NAMES.includes(_nm(c.name)) ? 'investment'
    :  SAVE_NAMES.includes(_nm(c.name)) ? 'savings'
    :  (c.isSaving ? 'savings' : 'investment'));
  const perCat = {};
  cats.forEach(c=>{ perCat[c.id] = {id:c.id, name:c.name, icon:c.icon, color:c.color, total:0, month:0,
                                    group: groupOf(c)}; });
  txs.forEach(t=>{
    const cid = t.catId||t.category;
    if(!perCat[cid]) return;
    const amt = (t.amount||t.amt||0);
    const sign = (t.type==='income') ? -1 : 1; // příjem = výběr (mínus), výdaj = vklad (plus)
    perCat[cid].total += sign*amt;
    const d = new Date(t.date);
    if(d.getMonth()===curM && d.getFullYear()===curY) perCat[cid].month += sign*amt;
  });
  // Souhrn podle skupiny
  const byGroup = { investment:{total:0,month:0}, savings:{total:0,month:0} };
  Object.values(perCat).forEach(p=>{
    if(byGroup[p.group]){ byGroup[p.group].total += p.total; byGroup[p.group].month += p.month; }
  });
  const grandTotal = Object.values(perCat).reduce((a,p)=>a+p.total,0);
  const grandMonth = Object.values(perCat).reduce((a,p)=>a+p.month,0);
  return { perCat:Object.values(perCat), byGroup, grandTotal, grandMonth };
}
// Přesun = klasický převod mezi peněženkami (transferId/category transfer) NEBO transakce v kategorii typu 'transfer'.
const isTransferTx=t=>!!(t&&(t.transferId||t.catId==='transfer'||t.category==='transfer'||(window._transferCatIds&&window._transferCatIds.has(t.catId||t.category))));
// v8.58 (TODO-144): částka transakce v ZÁKLADNÍ MĚNĚ (CZK). Priorita:
// 1) t.amtCZK – zafixovaná hodnota z okamžiku vložení/editace (kurz banky, ručně upravitelná, už se nepřepočítává)
// 2) peněženka v CZK (nebo bez peněženky) → amount
// 3) cizí peněženka bez fixace (staré transakce) → fallback živým kurzem ČNB (toCZK)
const txCZK=(t,data)=>{
  if(t&&t.amtCZK!=null&&isFinite(t.amtCZK))return t.amtCZK;
  const amt=(t&&(t.amount||t.amt))||0;
  if(!t||!t.wallet)return amt;
  const ws=(data&&data.wallets)||(typeof S!=='undefined'&&S&&S.wallets)||[];
  const w=ws.find(x=>x.id===t.wallet);
  const cur=(w&&w.currency)?w.currency:'CZK';
  if(cur==='CZK')return amt;
  return (typeof toCZK==='function')?toCZK(amt,cur):amt;
};
window.txCZK=txCZK;
// v8.60 (TODO-150, ADR-080): ZÁKLADNÍ MĚNA UŽIVATELE (CZK/EUR/USD/GBP/PLN).
// Interní kanonická měna zůstává CZK (amtCZK, rozpočty, cíle – žádná migrace dat).
// Základní měna je ZOBRAZOVACÍ vrstva: CZK hodnoty se před zobrazením převedou
// živým kurzem ČNB (_FX_RATES) a dostanou symbol měny. Nastavení: _settings.currency.
const CUR_SYMS={CZK:'Kč',EUR:'€',USD:'$',GBP:'£',PLN:'zł'};
const baseCur=()=> (typeof _settings!=='undefined'&&_settings&&_settings.currency)||'CZK';
const baseRate=()=>{const c=baseCur();if(c==='CZK')return 1;const r=(typeof _FX_RATES!=='undefined'&&_FX_RATES[c]);return (r&&isFinite(r)&&r>0)?r:1;}; // Kč za 1 jednotku základní měny
const czkToBase=v=>(v||0)/baseRate();
const curSym=c=>CUR_SYMS[c||baseCur()]||(c||baseCur());
const fmtB=v=>`${fmt(czkToBase(v))} ${curSym()}`;   // CZK hodnota → „1 234 €" v základní měně (celá čísla)
const fmtBP=v=>`${fmtP(czkToBase(v))} ${curSym()}`; // přesná varianta (desetiny)
window.baseCur=baseCur;window.baseRate=baseRate;window.czkToBase=czkToBase;window.curSym=curSym;window.fmtB=fmtB;window.fmtBP=fmtBP;
// v8.58 (TODO-144/146): součty v základní měně (CZK) přes txCZK – cizí peněženky se už nesčítají 1:1 jako Kč.
const incSum=(txs,data)=>txs.filter(t=>t.type==='income'&&!t.isBalancing&&!t.splitParent&&!isTransferTx(t)).reduce((a,t)=>a+txCZK(t,data),0);
const expSum=(txs,data)=>txs.filter(t=>t.type==='expense'&&!t.isBalancing&&!t.splitParent&&!isTransferTx(t)).reduce((a,t)=>a+txCZK(t,data),0);
// FIX-073 (Session 8): getActual opraveno - čte t.amount||t.amt||0 (PDF transakce mají 'amount', starší mají 'amt').
// Původně čteno jen t.amt → transakce z PDF importu byly ignorovány (vrátilo 0) → Treemap prázdná, výdaje chybí.
// Také přidán isBalancing filter – vyrovnávací transakce se nezapočítávají.
// FIX-120 (Session 11): Split double counting – split parent s existujícími children se NEpočítá (children pokrývají celou částku).

// ── parseTxTags: bezpečně převede t.tags na array (string nebo array vstup)
// addReceiptAsTx ukládá tags jako STRING ("sladkost nákup"), editace transakce jako ARRAY
function parseTxTags(t) {
  if (!t || !t.tags) return [];
  if (Array.isArray(t.tags)) return t.tags;
  if (typeof t.tags === 'string') return t.tags.split(/[\s,]+/).filter(Boolean);
  return [];
}
window.parseTxTags = parseTxTags;

// TODO-212 (S19, v9.81): PŘESUNY se do výdajů kategorie NEPOČÍTAJÍ – peníze neodešly,
//   jen se přesunuly. Dřív je getActual() zahrnovala, takže součet řádků po kategoriích
//   byl VYŠŠÍ než celkový součet nad ním (ten jede přes expSum/allExpTxs, které přesuny
//   vylučují). Stejný rozpor byl mezi Reportem (vylučuje) a Statistikami (zahrnovaly).
//   ⚠️ FILTR NENÍ PLOŠNÝ – to by rozbilo skóre. Kategorie spoření a investic
//   (isSaving/isInvest) jsou typu 'transfer', takže isTransferTx() je true pro KAŽDOU
//   jejich transakci. premium.js:1520 (S4 Aktivní spoření) a projects.js:512 (savingScore)
//   na getActual() nad těmito kategoriemi přímo stojí → plošný filtr by jim vrátil 0
//   a poctivě spořícímu uživateli by spadlo skóre až o 35 bodů.
//   Pravidlo: ptá-li se volající PŘÍMO na přesunovou kategorii, chce vidět, co do ní
//   přiteklo → nefiltruj. Ptá-li se na výdajovou kategorii → přesun tam nepatří.
//   Rozhoduje se podle ARGUMENTU, ne podle volajícího → žádné z 37 volání se nemění.
const getActual=(catId,sub,m,y,data)=>{
  const D=data||getData();
  const txs=D.transactions||[];
  // Split parents s children → exclude (children už pokrývají celou sumu ve svých kategoriích)
  const splitIdsWithChildren=new Set(txs.filter(t=>t.splitId&&t.splitParent).map(t=>t.splitId).filter(sid=>txs.some(c=>c.splitId===sid&&!c.splitParent)));
  const askedForTransferCat=!!(window._transferCatIds&&window._transferCatIds.has(catId));
  return txs.filter(t=>t.type==='expense'&&!t.isBalancing&&t.catId===catId&&(!sub||t.subcat===sub)).filter(t=>askedForTransferCat||!isTransferTx(t)).filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;}).filter(t=>!(t.splitId&&t.splitParent&&splitIdsWithChildren.has(t.splitId))).reduce((a,t)=>a+txCZK(t,D),0);};
// ══════════════════════════════════════════════════════
//  v8.73 (TODO-158): MILANOVY BODOVACÍ TABULKY (dashboard_body.xlsx 1:1)
//  S1 Cash flow 0–75 · DTI 0–60 · DSTI 0–40 · S3 Rezerva 0–50 · S4 Aktivní spoření 0–35.
//  Jemné odstupňování (76/60/41/50/31 řádků) – jeden zdroj pravdy pro Měsíční report,
//  Dluhový stres index i Bankovní hodnocení.
// ══════════════════════════════════════════════════════
const _SCORING={
  max:{S1:75,DTI:60,DSTI:40,S3:50,S4:35,BONUS:30},
  S1:[[0.5,75],[0.51,74],[0.52,73],[0.53,72],[0.54,71],[0.55,70],[0.56,69],[0.57,68],[0.58,67],[0.59,66],[0.6,65],[0.61,64],[0.62,63],[0.63,62],[0.64,61],[0.65,60],[0.66,59],[0.67,58],[0.68,57],[0.69,56],[0.7,55],[0.71,54],[0.72,53],[0.73,52],[0.74,51],[0.75,50],[0.76,49],[0.77,48],[0.78,47],[0.79,46],[0.8,45],[0.81,44],[0.82,43],[0.83,42],[0.84,41],[0.85,40],[0.86,39],[0.87,38],[0.88,37],[0.89,36],[0.9,35],[0.91,34],[0.92,33],[0.93,32],[0.94,31],[0.95,30],[0.96,29],[0.97,28],[0.98,27],[0.99,26],[1,25],[1.01,24],[1.02,23],[1.03,22],[1.04,21],[1.05,20],[1.06,19],[1.07,18],[1.08,17],[1.09,16],[1.1,15],[1.11,14],[1.12,13],[1.13,12],[1.14,11],[1.15,10],[1.16,9],[1.17,8],[1.18,7],[1.19,6],[1.2,5],[1.21,4],[1.22,3],[1.23,2],[1.24,1],[1.25,0]],
  DTI:[[15,60],[30,59],[45,58],[60,57],[75,56],[90,55],[105,54],[120,53],[135,52],[150,51],[165,50],[180,49],[195,48],[210,47],[225,46],[240,45],[255,44],[270,43],[285,42],[300,41],[315,40],[330,39],[345,38],[360,37],[375,36],[390,35],[405,34],[420,33],[435,32],[450,31],[465,30],[480,29],[495,28],[510,27],[525,26],[540,25],[555,24],[570,23],[585,22],[600,21],[615,20],[630,19],[645,18],[660,17],[675,16],[690,15],[705,14],[720,13],[735,12],[750,11],[765,10],[780,9],[795,8],[810,7],[825,6],[840,5],[855,4],[870,3],[885,2],[900,1]],
  DSTI:[[0,40],[1.5,39],[3,38],[4.5,37],[6,36],[7.5,35],[9,34],[10.5,33],[12,32],[13.5,31],[15,30],[16.5,29],[18,28],[19.5,27],[21,26],[22.5,25],[24,24],[25.5,23],[27,22],[28.5,21],[30,20],[31.5,19],[33,18],[34.5,17],[36,16],[37.5,15],[39,14],[40.5,13],[42,12],[43.5,11],[45,10],[46.5,9],[48,8],[49.5,7],[51,6],[52.5,5],[54,4],[55.5,3],[57,2],[58.5,1],[60,0]],
  S3:[[12,50],[11.75,49],[11.5,48],[11.25,47],[11,46],[10.75,45],[10.5,44],[10.25,43],[10,42],[9.75,41],[9.5,40],[9.25,39],[9,38],[8.75,37],[8.5,36],[8.25,35],[8,34],[7.75,33],[7.5,32],[7.25,31],[7,30],[6.75,29],[6.5,28],[6.25,27],[6,26],[5.75,25],[5.5,24],[5.25,23],[5,22],[4.75,21],[4.5,20],[4.25,19],[4,18],[3.75,17],[3.5,16],[3.25,15],[3,14],[2.75,13],[2.5,12],[2.25,11],[2,10],[1.75,9],[1.5,8],[1.25,7],[1,6],[0.75,5],[0.5,4],[0.25,3],[0.1,2],[0,1]],
  S4:[[30,35],[29,34],[28,33],[27,32],[26,31],[25,30],[24,28],[23,27],[22,26],[21,25],[20,23],[19,22],[18,21],[17,20],[16,18],[15,17],[14,16],[13,15],[12,13],[11,12],[10,11],[9,10],[8,9],[7,8],[6,7],[5,6],[4,5],[3,4],[2,3],[1,2],[0.1,1]],
  BONUS:[[0,0],[1,1],[2,3],[3,5],[4,9],[5,13],[6,15],[7,17],[8,19],[9,21],[10,24],[11,27],[12,30]]
};
function msc_S1(ratio){ if(ratio==null)return null; for(const[t,p]of _SCORING.S1){if(ratio<=t)return p;} return 0; }
function msc_DTI(pct){ for(const[t,p]of _SCORING.DTI){if(pct<=t)return p;} return 0; }
function msc_DSTI(pct){ for(const[t,p]of _SCORING.DSTI){if(pct<=t)return p;} return 0; }
function msc_S3(months){ if(months==null)return null; for(const[t,p]of _SCORING.S3){if(months>=t)return p;} return 0; }
function msc_S4(rate){ if(rate==null)return null; for(const[t,p]of _SCORING.S4){if(rate>=t)return p;} return 0; }
function msc_BONUS(m){ let out=0; for(const[t,p]of _SCORING.BONUS){ if(m>=t) out=p; } return out; }

// v8.72 (FIX-187): PŘÍJMOVÁ obdoba getActual – FFR a Diverzifikace příjmů dřív používaly
// getActual (jen expense) → pasivní příjem vždy 0 a jediným „zdrojem příjmu" byla income
// kategorie s výdajovou transakcí (Finanční úřad – daň). Bez přesunů a vyrovnání.
const getIncActual=(catId,sub,m,y,data)=>{
  const D=data||getData();
  return (D.transactions||[]).filter(t=>t.type==='income'&&!t.isBalancing&&!t.splitParent&&!isTransferTx(t)&&t.catId===catId&&(!sub||t.subcat===sub))
    .filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;})
    .reduce((a,t)=>a+txCZK(t,D),0);};

// v8.72 (FIX-188): SDÍLENÝ výpočet měsíčních splátek dluhů – tři místa (Dluhový stres index,
// Bankovní DTI&DSTI, Finanční skóre S2) počítala každé jinak (installments vs d.payment)
// → DSTI 732 % vs 753 %. Jediný zdroj pravdy: aktuální splátka dle installments + freq přepočet.

// ══ S16.5 (AUDIT P0-1): Neutralizace HTML v uživatelských řetězcích PŘI NAČTENÍ ══
// Řeší cross-user stored XSS: partner (rules mu dávají čtení celého data uzlu) může
// zapsat do názvu transakce <img onerror=…> a ten by se spustil v cizí session.
// Sanitizace NA VSTUPU dat pokrývá vlastní i partnerova data a všech ~50 míst renderu
// najednou (výstupní escapování by znamenalo 50 zásahů do šablon). Do DB se nic aktivně
// nepřepisuje (vlastní data se pročistí až s běžným save). Jen pole, kde < > nemají co dělat.
function _stripTags(v){ return (typeof v==='string' && (v.indexOf('<')>=0||v.indexOf('>')>=0)) ? v.replace(/[<>]/g,'') : v; }
function sanitizeUserData(D){
  if(!D||typeof D!=='object') return D;
  // S17 (ADR-062): diff-write ukládá transakce jako OBJEKT keyed by id (data/tx/{id}).
  //   Při načtení je znormalizujeme zpět na POLE → 33 modulů pracuje beze změny.
  //   Zpětně kompatibilní: staré pole (v1) projde beze změny.
  // S16.9 (Milan): RTDB vrací uzel jako POLE, pokud jsou klíče souvislá čísla od 0
  //   (legacy transakce z doby před genTxId/FIX-056 měly jednoduchá číselná id 0,1,2…).
  //   Mezera v historii (dřív smazaná transakce) by se pak objevila jako `null` prvek pole.
  //   Filtrujeme VŽDY, i když už D.transactions přišlo jako pravé pole.
  if(Array.isArray(D.transactions)){
    D.transactions = D.transactions.filter(Boolean);
  } else if(D.transactions && typeof D.transactions==='object'){
    D.transactions = Object.keys(D.transactions).map(k=>D.transactions[k]).filter(Boolean);
  }
  const N=(arr,fields)=>{ (arr||[]).forEach(o=>{ if(o&&typeof o==='object') fields.forEach(f=>{ if(o[f]!=null) o[f]=_stripTags(o[f]); }); }); };
  N(D.transactions,['name','note','subcat','subcategory']);
  N(D.debts,['name','note','creditor','lender']);
  N(D.wallets,['name']);
  N(D.assets,['name','note']);
  N(D.projects,['name','note']);
  N(D.sablony,['name','note']);
  N(D.wishes,['name','note']);
  N(D.birthdays,['name']);
  N(D.nakupList,['name','note']);
  (D.categories||[]).forEach(c=>{ if(!c)return; if(c.name!=null)c.name=_stripTags(c.name); if(Array.isArray(c.subs)) c.subs=c.subs.map(_stripTags); });
  if(D.calNotes&&typeof D.calNotes==='object') Object.keys(D.calNotes).forEach(k=>{ const n=D.calNotes[k]; if(n&&n.text!=null) n.text=_stripTags(n.text); });
  return D;
}

function computeMonthlyDebtPayments(D){
  const nowStr=`${S.curYear}-${String(S.curMonth+1).padStart(2,'0')}`;
  return (D.debts||[]).reduce((a,d)=>{
    let amt;
    if(Array.isArray(d.installments)&&d.installments.length){
      let cur=d.installments[0].amt||0;
      for(const inst of d.installments){ if((inst.from||'')<=nowStr) cur=inst.amt||cur; }
      amt=cur;
    } else {
      const base=d.payment||d.installment||0;
      const f=d.freq||'monthly';
      amt=f==='weekly'?base*4.33:f==='biweekly'?base*2.17:base;
    }
    return a+amt;
  },0);
}
// S16 (TODO-160): Příjmová základna pro DTI/DSTI = KLOUZAVÝ PRŮMĚR měsíčního příjmu.
// Milan: „klouzavé průměry jsou super, necháme je, jen doplníme škálu" → DTI 12M, DSTI 3–12M.
//   windowMonths = okno (DTI i DSTI = 12). Dělí se počtem měsíců S PŘÍJMEM, takže reálné okno
//   roste s historií (nováček 3 měsíce → 3, zaběhnutý uživatel → 12) = ono „3–12 pro DSTI".
//   minMonths = volitelné adaptivní zastavení (rezervováno pro budoucí ladění – zatím nevyužito).
// Ukotveno k S.curMonth (reaktivní), ale díky 12M oknu posun o měsíc změní jen ~1/12 dat
//   → konec divokých skoků DTI/DSTI při proklikávání měsíců (dřív 3M okno: 1506 %→4597 %).
// Bez přesunů/splitů/vyrovnání (incSum). Trailing okno (i=1..N) – vynechává aktuální (často
//   částečný) měsíc. Krátká historie se netrestá (dělí se počtem měsíců s příjmem, ne pevně 12).
// Pozn.: ADR-044 vážený základ (computeBaseIncome) se pro DTI/DSTI záměrně NEuplatňuje –
//   Milan chce prostý klouzavý průměr. computeBaseIncome zůstává beze změny (zdraví kategorií ap.).
function computeEffectiveIncome(D, windowMonths, minMonths){
  D = D || getData();
  windowMonths = windowMonths || 3;
  let t=0, n=0;
  for(let i=1;i<=windowMonths;i++){
    let m=S.curMonth-i, y=S.curYear; if(m<0){m+=12;y--;}
    const mi=incSum(getTx(m,y,D), D);
    if(mi>0){ t+=mi; n++; }
    if(minMonths && n>=minMonths && i>=minMonths) break;
  }
  return n ? Math.round(t/n) : 0;
}

const isPast=(m,y)=>{const n=new Date();return y<n.getFullYear()||(y===n.getFullYear()&&m<n.getMonth());};
const isCur=(m,y)=>{const n=new Date();return m===n.getMonth()&&y===n.getFullYear();};
// Vrátí transakce v rozsahu dat (fromDate, toDate = 'YYYY-MM-DD' string nebo Date objekt)
const getTxByRange=(fromDate,toDate,data)=>{const D=data||getData();const from=new Date(fromDate);const to=new Date(toDate);to.setHours(23,59,59,999);return(D.transactions||[]).filter(t=>{const d=new Date(t.date);return d>=from&&d<=to;});};
// Vrátí pole {m, y} objektů pro každý měsíc v rozsahu
function getMonthsInRange(fromDate,toDate){const result=[];const from=new Date(fromDate);const to=new Date(toDate);let m=from.getMonth(),y=from.getFullYear();while(y<to.getFullYear()||(y===to.getFullYear()&&m<=to.getMonth())){result.push({m,y});if(++m>11){m=0;y++;}}return result;}
function getCurInst(debt){const now=`${S.curYear}-${String(S.curMonth+1).padStart(2,'0')}`;let a=debt.installments[0]?.amt||0;for(const i of debt.installments)if(i.from<=now)a=i.amt;return a;}

// ══════════════════════════════════════════════════════
//  PREDICTION ENGINE
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  PENĚŽNÍ VSTUPNÍ POLE V ZÁKLADNÍ MĚNĚ (TODO-216, v9.91)
//  Vnitřní jednotka aplikace je VŽDY CZK. Rozpočty, jistiny, cíle a ceny přání
//  se ukládaly syrově tak, jak je uživatel napsal – tedy jako koruny – zatímco
//  popisky u polí měly natvrdo „(Kč)". Kdo měl základní měnu EUR, zobrazoval si
//  všude eura, ale zadával koruny. Samotná změna popisku by ale byla HORŠÍ než
//  špatný popisek: napsal by 1000 s myšlenkou 1 000 €, uložilo by se 1 000 Kč.
//
//  Oprava musí být VŽDY dvoudílná – popisek i převod na OBOU stranách:
//    moneyInFill(id, czk)  CZK z databáze  → hodnota do pole v základní měně
//    moneyInRead(id)       hodnota z pole  → CZK k uložení
//
//  ⚠️ Nejčastější chyba je vynechat plnění (moneyInFill). Bez něj se hodnota
//  při každém otevření a uložení vynásobí kurzem znovu: 25 000 → 632 500 → 16 mil.
//  Proto na to existuje round-trip test (tools/smoke_moneyin.js).
//
//  U základní měny CZK je kurz 1,0, takže obě funkce jsou identita a pro drtivou
//  většinu uživatelů se nemění vůbec nic.
// ══════════════════════════════════════════════════════

// Základní měna → CZK. Opak czkToBase().
function baseToCzk(v){
  const n = parseFloat(v);
  if(!isFinite(n)) return 0;
  try{
    const probe = (typeof czkToBase==='function') ? czkToBase(1000) : 1000;
    if(!probe || !isFinite(probe)) return n;
    return n * (1000/probe);
  }catch(e){ return n; }
}

// Naplní pole hodnotou pro uživatele. czk = null/undefined/0 → prázdné pole
// (aby placeholder zůstal viditelný a nezobrazovala se nula jako zadaná hodnota).
function moneyInFill(id, czk){
  const el = document.getElementById(id); if(!el) return;
  if(czk===null || czk===undefined || czk==='' || !isFinite(parseFloat(czk)) || parseFloat(czk)===0){ el.value=''; return; }
  const v = (typeof czkToBase==='function') ? czkToBase(parseFloat(czk)) : parseFloat(czk);
  el.value = Math.round(v*100)/100;
}

// Přečte pole a vrátí CZK k uložení.
function moneyInRead(id){
  const el = document.getElementById(id); if(!el) return 0;
  const raw = String(el.value||'').replace(/\s/g,'').replace(',','.');
  if(raw==='') return 0;
  const czk = baseToCzk(raw);
  return isFinite(czk) ? Math.round(czk*100)/100 : 0;
}

// Doplní do popisků skutečný symbol základní měny. Popisky mají v app.html
// natvrdo „(Kč)" – ten se po startu přepíše, aby nebylo potřeba 20 samostatných
// span elementů a aby při základní měně CZK zůstalo všechno beze změny.
function refreshMoneyLabels(root){
  try{
    const sym = (typeof curSym==='function') ? curSym() : 'Kč';
    if(sym==='Kč') return;
    const scope = root || document;
    scope.querySelectorAll('label').forEach(l=>{
      if(l.children.length) return;                 // popisky s vnořenými prvky neměň
      if(l.textContent.indexOf('(Kč)')<0) return;
      l.textContent = l.textContent.replace('(Kč)','('+sym+')');
    });
  }catch(e){}
}

// ══════════════════════════════════════════════════════
//  KURZOVÉ ZTRÁTY (TODO-215 fáze 2, v9.90)
//  Kurz banky se nikde neukládá – dá se dopočítat: amtCZK / amount.
//  Proti němu stojí fxRef (kurz ČNB v době zápisu, sbíraný od v9.89).
//  Rozdíl je to, co si banka nechala navíc: marže + poplatek za směnu.
//
//  ⚠️ Počítá se JEN u transakcí, které mají OBĚ čísla. Transakce zapsané
//  před v9.89 fxRef nemají a dopočítat ho zpětně nejde – odhadovat by
//  znamenalo vyrábět čísla. Takové se z výpočtu tiše vynechají a jejich
//  počet se uživateli ukáže, ať ví, že souhrn není z celé historie.
// ══════════════════════════════════════════════════════
function fxLossOf(t){
  if(!t || !t.currency || t.currency==='CZK') return null;
  const amt = Math.abs(t.amount||t.amt||0);
  const czk = Math.abs(t.amtCZK||0);
  const ref = t.fxRef;
  if(!amt || !czk || !ref || !isFinite(ref) || ref<=0) return null;
  const bankRate = czk/amt;                 // kolik Kč banka reálně vzala za 1 jednotku
  const fair = amt*ref;                     // kolik by to bylo za kurz ČNB
  const loss = czk - fair;                  // rozdíl v Kč (může být i záporný – lepší kurz)
  return { bankRate, refRate:ref, fair, loss, pct:(bankRate/ref-1)*100,
           cur:t.currency, refDate:t.fxRefDate||null };
}

// Souhrn za sadu transakcí + rozpad podle peněženky a typu platby.
// Rozpad je to podstatné: „nechal jsi tam 1 240 Kč" je konstatování,
// „bankomat +8,4 %, karta +2,1 %" je rada, kterou lze následovat.
function fxLossSummary(txs, D){
  D = D || getData();
  const out = { n:0, loss:0, spentCZK:0, missing:0, byWallet:{}, byPay:{}, byCur:{} };
  (txs||[]).forEach(t=>{
    if(!t || t.splitParent || t.isBalancing) return;
    if(!t.currency || t.currency==='CZK') return;
    const r = fxLossOf(t);
    if(!r){ out.missing++; return; }
    out.n++; out.loss += r.loss; out.spentCZK += Math.abs(t.amtCZK||0);
    const add=(bucket,key,label)=>{
      if(!key) return;
      if(!bucket[key]) bucket[key]={ label, n:0, loss:0, spent:0 };
      bucket[key].n++; bucket[key].loss+=r.loss; bucket[key].spent+=Math.abs(t.amtCZK||0);
    };
    const w=(D.wallets||[]).find(x=>x.id===t.wallet);
    // FIX-258 (S19, z Milanova screenshotu): klíč musí odpovídat POPISKU.
    //   Dřív se u smazaného nebo neznámého typu platby použil jeho ID jako klíč,
    //   ale popisek byl „Neuvedeno" – v rozpadu pak vedle sebe stály dva různé
    //   koše se STEJNÝM názvem a věta hlásila „rozdíl mezi Neuvedeno a Neuvedeno".
    //   Vše nezařaditelné teď padá do jednoho koše.
    add(out.byWallet, w?t.wallet:'_none', w?((w.icon?w.icon+' ':'')+w.name):'Bez peněženky');
    const pt=(D.payTypes||[]).find(x=>x.id===t.payType);
    add(out.byPay, pt?t.payType:'_none', pt?((pt.icon?pt.icon+' ':'')+pt.name):'Neuvedeno');
    add(out.byCur, t.currency, t.currency);
  });
  out.pct = out.spentCZK>0 ? (out.loss/(out.spentCZK-out.loss))*100 : 0;
  const rank = b => Object.keys(b).map(k=>({ key:k, ...b[k],
      pct: (b[k].spent-b[k].loss)>0 ? (b[k].loss/(b[k].spent-b[k].loss))*100 : 0 }))
    .sort((a,b)=>b.loss-a.loss);
  out.wallets = rank(out.byWallet); out.pays = rank(out.byPay); out.currencies = rank(out.byCur);
  return out;
}

// FIX-252 (S19, v9.80) + TODO-212 (v9.81): historický průměr musí filtrovat PŘESNĚ JAKO getActual() – ty dvě
//   funkce se v UI zobrazují VEDLE SEBE (Predikce, Souhrn, Report: „odhad vs. skutečnost").
//   Dřív se lišily ve dvou bodech a odchylka tak porovnávala jiná čísla:
//     1) `t.amt` místo txCZK(t,D)  → cizí měny se sčítaly v NOMINÁLU (100 € = 100 Kč),
//        takže predikce u kategorií s eurovými výdaji vycházela mnohonásobně nízko.
//     2) chyběl filtr splitů a vyrovnání → rozdělená transakce se počítala DVAKRÁT
//        (rodič i děti), predikce tedy naopak nadhodnocovala.
//   Split se vyřazuje stejně jako v getActual(): jen RODIČ, který má děti (FIX-119) –
//   plošné `!t.splitParent` by zahodilo i rodiče bez dětí, což je normální výdaj.
//   ⚠️ isTransferTx se ZÁMĚRNĚ nefiltruje ani zde, ani v getActual() – obě funkce musí
//   zůstat zrcadlové. Přesuny uvnitř kategorií typu 'both' řeší TODO-212 pro OBĚ najednou.
function getHistAvg(catId,sub,forM,forY,data){
  const D=data||getData();
  const txs=D.transactions||[];
  const splitIdsWithChildren=new Set(txs.filter(t=>t&&t.splitId&&t.splitParent).map(t=>t.splitId)
    .filter(sid=>txs.some(c=>c&&c.splitId===sid&&!c.splitParent)));
  const askedForTransferCat=!!(window._transferCatIds&&window._transferCatIds.has(catId));
  const byMonth={};
  txs.filter(t=>{
    if(!t||t.type!=='expense'||t.catId!==catId)return false;
    if(t.isBalancing)return false;
    if(!askedForTransferCat&&isTransferTx(t))return false;   // TODO-212 – stejné pravidlo jako getActual
    if(t.splitId&&t.splitParent&&splitIdsWithChildren.has(t.splitId))return false;
    if(sub&&t.subcat!==sub)return false;
    const d=new Date(t.date),dm=d.getMonth(),dy=d.getFullYear();
    if(dy>forY||(dy===forY&&dm>=forM))return false;
    return true;
  }).forEach(t=>{
    const d=new Date(t.date);const k=`${d.getFullYear()}-${d.getMonth()}`;
    byMonth[k]=(byMonth[k]||0)+txCZK(t,D);
  });
  const vals=Object.values(byMonth);
  if(!vals.length)return null;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function predictCat(catId,sub,m,y,data){
  const D=data||getData();
  let avg=getHistAvg(catId,sub,m,y,D);
  if(avg===null){
    // FIX-252: i fallback (kategorie bez historie) musí přes txCZK a bez vyrovnání
    const curExp=getActual(catId,sub,S.curMonth,S.curYear,D);
    if(!curExp)return null;
    avg=curExp;
  }
  const seasMult=SEASON[m]?.mult||1;
  let bdayBoost=0;
  const cat=getCat(catId,D.categories);
  if(cat.name&&cat.name.toLowerCase().includes('dárek')){
    const bdays=(D.birthdays||[]).filter(b=>b.month-1===m);
    bdayBoost=bdays.reduce((a,b)=>a+(b.gift||0),0);
  }
  return Math.round(avg*seasMult)+bdayBoost;
}

// ══════════════════════════════════════════════════════
//  YEAR FORECAST – součet skutečnosti (minulé+aktuální měsíce) + predikce (budoucí měsíce)
//  Vrací "Předpoklad YTD" – kolik kategorie utratí za celý rok
// ══════════════════════════════════════════════════════
function computeYearForecast(catId, sub, year, data) {
  const D = data || getData();
  let total = 0;
  for (let m = 0; m < 12; m++) {
    const past = isPast(m, year);
    const cur = isCur(m, year);
    if (past || cur) {
      // Použij skutečnost
      total += getActual(catId, sub, m, year, D) || 0;
    } else {
      // Použij predikci pro budoucí měsíce
      total += predictCat(catId, sub, m, year, D) || 0;
    }
  }
  return Math.round(total);
}

// ══════════════════════════════════════════════════════
//  BANK
// ══════════════════════════════════════════════════════
function computeBank(data){
  const D=data||getData();
  const start=D.bank?.startBalance||0;
  const monthKeys=new Set();
  (D.transactions||[]).forEach(t=>{const d=new Date(t.date);monthKeys.add(`${d.getFullYear()}_${d.getMonth()}`);});
  let total=start;
  monthKeys.forEach(key=>{
    const[y,m]=key.split('_').map(Number);
    if(y>S.curYear||(y===S.curYear&&m>S.curMonth))return;
    const txs=getTx(m,y,D);total+=incSum(txs)-expSum(txs);
  });
  return total;
}
function bankSeries(n,data){
  const D=data||getData();
  const start=D.bank?.startBalance||0;
  const allM=new Set();
  (D.transactions||[]).forEach(t=>{const d=new Date(t.date);allM.add(`${d.getFullYear()}_${d.getMonth()}`);});
  const arr=[];
  for(let i=n-1;i>=0;i--){
    let m=S.curMonth-i,y=S.curYear;if(m<0){m+=12;y--;}
    let bal=start;
    allM.forEach(key=>{const[ky,km]=key.split('_').map(Number);if(ky>y||(ky===y&&km>m))return;const txs=getTx(km,ky,D);bal+=incSum(txs)-expSum(txs);});
    const txs=getTx(m,y,D);
    arr.push({m,y,label:CZ_M[m].slice(0,3),balance:bal,saldo:incSum(txs)-expSum(txs)});
  }
  return arr;
}

// ══════════════════════════════════════════════════════
//  NAV
// ══════════════════════════════════════════════════════
function showPage(name,el){
  curPage=name;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(el)el.classList.add('active');
  document.getElementById('pageTitle').textContent=PAGE_TITLES[name]||name;
  const _mn=document.querySelector('.month-nav');
  if(_mn)_mn.style.display=(name==='import'||name==='grafy')?'none':'';
  // GA4 page tracking
  if(typeof gtag==='function') gtag('event','page_view',{page_title:PAGE_TITLES[name]||name,page_location:'/app/'+name});
  const fab=document.getElementById('mainFab');
  if(fab)fab.style.display=(name==='transakce'&&viewingUid===null)?'flex':'none';
  if(window.innerWidth<900)document.getElementById('sidebar').classList.remove('open');
  // Grafy potřebují čekat na CSS reflow (display:none → block)
  if(name==='grafy'){
    requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>_rp_force(),50)));
  } else {
    _rp_force();
  }
}
function showPageByName(name){
  curPage=name;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name)?.classList.add('active');
  document.getElementById('pageTitle').textContent=PAGE_TITLES[name]||name;
  const _mn2=document.querySelector('.month-nav'); if(_mn2)_mn2.style.display=(name==='import'||name==='grafy')?'none':'';
  document.querySelectorAll('.nav-item').forEach(n=>{if(n.getAttribute('onclick')?.includes(`'${name}'`))n.classList.add('active');else n.classList.remove('active');});
  _rp_force();
}
function changeMonth(d){if(typeof _txDateFilter!=='undefined'&&_txDateFilter.active){_txDateFilter.active=false;}S.curMonth+=d;if(S.curMonth<0){S.curMonth=11;S.curYear--;}if(S.curMonth>11){S.curMonth=0;S.curYear++;}updateMLabel();_rp_force();}
// Session 10: alias – vynutí render i přes anti-flicker guard (uživatelská akce).
function _rp_force(){ if(typeof forceRender==='function') forceRender(); else renderPage(); }
function updateMLabel(){document.getElementById('mlabel').textContent=`${CZ_M[S.curMonth]} ${S.curYear}`;}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');}

// ══════════════════════════════════════════════════════

// ── TODO-082: COICOP agregáty ──
function computeCoicopAggregates(txs, D) {
  const defMap = Object.fromEntries((typeof DEFAULT_CATEGORIES!=='undefined'?DEFAULT_CATEGORIES:[]).map(d=>[d.id,d]));
  const result = {};
  let unassigned = 0;
  (txs||[]).forEach(tx => {
    if(tx.type !== 'expense') return;
    if(tx.isBalancing) return;
    const catId = tx.catId || tx.category || '';
    const amt = Math.abs(tx.amount || tx.amt || 0);
    if(amt <= 0) return;
    const defCat = defMap[catId];
    let coicop = defCat?.coicop || null;
    if(defCat?.coicopOverrides && tx.subcat && defCat.coicopOverrides[tx.subcat]) {
      coicop = defCat.coicopOverrides[tx.subcat];
    }
    // FIX (S12.1): overridy přiřazené adminem/uživatelem (uložené ve Firebase) mají přednost
    const userCat = (D?.categories||[]).find(c=>c.id===catId);
    if(userCat?.coicopOverrides && tx.subcat && userCat.coicopOverrides[tx.subcat] !== undefined && userCat.coicopOverrides[tx.subcat] !== null) {
      coicop = userCat.coicopOverrides[tx.subcat]; // i 0 = mimo COICOP (vyřadí se níže)
    }
    else if(!coicop && userCat?.coicop) coicop = userCat.coicop;
    if(coicop && coicop >= 1 && coicop <= 13) {
      result[coicop] = (result[coicop]||0) + amt;
    } else {
      unassigned += amt;
    }
  });
  return {cats: result, unassigned: Math.round(unassigned)};
}

async function uploadCoicopToFirebase(month, year, D) {
  try {
    if(!window._currentUser || !window._db) return;
    const uid = window._currentUser.uid;
    const txs = getTx(month, year, D);
    const income = incSum(txs);
    const exp = expSum(txs);
    if(exp <= 0) return;
    const {cats, unassigned} = computeCoicopAggregates(txs, D);
    const monthKey = `${year}-${String(month+1).padStart(2,'0')}`;
    await _set(_ref(_db, `community/${monthKey}/users/${uid}`), {
      totalExp: Math.round(exp), income: Math.round(income),
      savingRate: income > 0 ? Math.round((income-exp)/income*100) : 0,
      cats, unassigned, updatedAt: Date.now(),
    });
  } catch(e) { console.warn('uploadCoicop failed:', e?.message); }
}

// ══════════════════════════════════════════════════════
//  UI HELPERY (Session 11) – proti duplikaci inline HTML
//  Vzor: render funkce skládají HTML z těchto helperů místo
//  opakovaného psaní stejných <div style="...">. Compute funkce
//  počítají hodnoty zvlášť a sem posílají jen hotová čísla/texty.
// ══════════════════════════════════════════════════════

// Jedna stat-karta (hodnota + popisek). color = CSS proměnná/hex.
// opts: {sub, onclick, valueIsHtml}
function statCard(value, label, color, opts = {}) {
  const c = color || 'var(--text)';
  const val = opts.valueIsHtml ? value : escHtml(value);
  const click = opts.onclick ? ` onclick="${opts.onclick}" style="cursor:pointer"` : '';
  return `<div class="stat-card-h"${click} style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border);min-width:0">
    <div class="stat-value-h" style="color:${c}">${val}</div>
    <div class="stat-label-h">${escHtml(label)}</div>
    ${opts.sub ? `<div style="font-size:.66rem;color:#8b90a8;margin-top:2px">${escHtml(opts.sub)}</div>` : ''}
  </div>`;
}

// Mřížka stat-karet. cards = [{value,label,color,...opts}]. cols = počet sloupců.
function statGrid(cards, cols = 3) {
  return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px">
    ${cards.map(c => statCard(c.value, c.label, c.color, c)).join('')}
  </div>`;
}

// Prázdný stav (ikona + titulek + volitelný popis).
function emptyState(icon, title, desc) {
  return `<div class="empty">
    <div class="ei">${icon || '📭'}</div>
    <div class="et">${escHtml(title || '')}</div>
    ${desc ? `<div style="font-size:.78rem;color:#a8aec8;margin-top:4px">${escHtml(desc)}</div>` : ''}
  </div>`;
}

// Karta se záhlavím (title) a tělem (bodyHtml).
function sectionCard(title, bodyHtml, opts = {}) {
  const right = opts.headerRight ? opts.headerRight : '';
  return `<div class="card"${opts.style ? ` style="${opts.style}"` : ''}>
    <div class="card-header"><span class="card-title">${title}</span>${right}</div>
    <div class="card-body"${opts.bodyStyle ? ` style="${opts.bodyStyle}"` : ''}>${bodyHtml}</div>
  </div>`;
}

// Bezpečný escape pro vkládání textu do HTML (sdílený helper).
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
