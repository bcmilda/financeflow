// S25 (v11.50) – úložiště dokladů podle tarifu (Free 300, Premium 1 000) s počítadlem u účtu,
// přehled úložiště v adminu a ruční karta výrobku k čárovému kódu, který databáze nezná.
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i).slice(0,300));if(!c)bad++;};
const w=R('worker.js','../cloudflare-worker/worker.js','../worker.js'),rc=R('receipts.js','../js/receipts.js'),ad=R('admin.js','../js/admin.js'),es=R('ean-sken.js','../js/ean-sken.js');
const pick=(s,n)=>{let a=s.indexOf('function '+n+'(');if(a<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',a);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(a,k+1)}}};
console.log('── S25 · úložiště a karta výrobku ──');
(async()=>{
  // úložiště – limit podle tarifu
  const now=Date.now(); let prem=null;
  const sw={fetch:async()=>({ok:true,json:async()=>prem}),FIREBASE_DB_URL:'db',ADMIN_UIDS:['ADMIN'],Date};vm.createContext(sw);
  vm.runInContext("var ARCHIV_MAX_FILES=300;var ARCHIV_LIMITY={ free: 300, trial: 1000, premium: 1000, admin: 100000 };\n"+pick(w,'tierZPremium')+'\nasync '+pick(w,'archivLimit'),sw);
  prem=null; const lf=await sw.archivLimit('u1',{}); prem={type:'premium',premiumUntil:now+1e8}; const lp=await sw.archivLimit('u1',{});
  prem={type:'trial',trialUntil:now+1e8}; const lt=await sw.archivLimit('u1',{}); const la=await sw.archivLimit('ADMIN',{});
  t('limit fotek: Free 300, Premium 1 000, trial 1 000, admin bez limitu',lf===300&&lp===1000&&lt===1000&&la===100000,{lf,lp,lt,la});
  t('worker: plné úložiště hlásí počet a limit a nabídne Premium',w.includes('Úložiště dokladů je plné (${pocet} z ${limit} fotek)')&&w.includes("nebo s Premium máš místo na"));
  t('worker: seznam fotek stránkuje (víc než 1 000) a vrací limit podle tarifu',w.includes("cursor = l.truncated ? l.cursor : null")&&w.includes('limit: await archivLimit(a.uid, env)'));
  t('worker: přehled celého úložiště jen pro admina',w.includes("akce === 'admin-stav'")&&w.includes("if (!ADMIN_UIDS.includes(a.uid)) return json({ error: 'Jen pro admina' }, 403"));
  // počítadlo u účtu
  const sr={};vm.createContext(sr);vm.runInContext(pick(rc,'dokladyPocitadloHTML'),sr);
  const h1=sr.dokladyPocitadloHTML({pocet:240,limit:300,bajtu:60*1048576});
  t('počítadlo: „240 z 300 fotek“, MB, zbývá 60 a výzva k Premium nad 75 %',h1.includes('<b>240</b> z 300 fotek')&&h1.includes('60,0 MB')&&h1.includes('zbývá 60')&&h1.includes('S Premium máš místo na 1 000 fotek'));
  t('počítadlo u Premium bez výzvy',!sr.dokladyPocitadloHTML({pocet:900,limit:1000,bajtu:1}).includes('S Premium'));
  t('Doklady: počítadlo se načte při otevření záložky (i v prázdném stavu)',rc.includes("if(tab==='doklady' && typeof dokladyPocitadlo==='function') dokladyPocitadlo();")&&(rc.match(/class="dokPocitadlo"/g)||[]).length===2&&!rc.includes('${list.length} z 300'));
  // admin
  const sa={_vzEsc:s=>String(s),Date,Math};vm.createContext(sa);vm.runInContext([pick(ad,'adminArchivLimit'),pick(ad,'adminUlozisteHTML')].join('\n'),sa);
  const d={soubory:1250,bajtu:2.5*1073741824,zdarmaBajtu:10*1073741824,limity:{free:300,trial:1000,premium:1000,admin:100000},
    uzivatele:[{uid:'A',soubory:290,bajtu:72*1048576,posledni:now},{uid:'B',soubory:960,bajtu:240*1048576,posledni:now}]};
  const users=[{uid:'A',displayName:'Jana',email:'j@x.cz',premium:{type:'free'}},{uid:'B',displayName:'Petr',premium:{type:'premium',premiumUntil:now+1e8}}];
  const ha=sa.adminUlozisteHTML(d,users).replace(/\u00a0|\u202f/g,' ');
  t('admin: zaplněno 2,50 GB, zbývá 7,50 GB z 10,00 GB, 1 250 fotek',ha.includes('2,50 GB')&&ha.includes('7,50 GB z 10,00 GB')&&ha.includes('1 250'));
  t('admin: po uživatelích se jménem, limitem podle tarifu a procenty (Jana 290/300, Petr 960/1 000)',ha.includes('Jana')&&ha.includes('290 / 300')&&ha.includes('960 / 1 000')&&ha.includes('2 nad 80 %'));
  t('admin: záložka 💾 Úložiště v panelu i v přepínači',ad.includes("id=\"atab-uloziste\"")&&ad.includes("'reports','uloziste'].forEach")&&ad.includes("if(tab==='uloziste') renderAdminUloziste();"));
  // karta výrobku – worker
  const db={};
  const sk={Date,Object,JSON,String,FIREBASE_DB_URL:'db',
    fetch:async(url,o)=>{const k=url.replace(/^db\//,'').replace(/\.json.*$/,''); if(o&&o.method==='PUT'){db[k]=JSON.parse(o.body);return{ok:true};} return{ok:true,json:async()=>db[k]===undefined?null:db[k]};},
    json:(x,st)=>({x,st}),eanStr:(t,m)=>String(t==null?'':t).trim().slice(0,m),
    eanMnozstvi:p=>{const m=/(\d+(?:[.,]\d+)?)\s*(g|ml|l|kg)/.exec(String(p.quantity||''));if(!m)return null;let h=parseFloat(m[1].replace(',','.')),j=m[2];if(j==='kg'){h*=1000;j='g'}if(j==='l'){h*=1000;j='ml'}return{hodnota:h,jednotka:j}},
    eanTaxonomie:async()=>({nazvy:{'cokolada':'Čokoláda'}}),eanTaxKlic:t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''),
    eanAkceNazev:async()=>{sk.nazevUlozen=true;}};
  vm.createContext(sk);vm.runInContext('async '+pick(w,'eanAkceKarta'),sk);
  let r=await sk.eanAkceKarta('u1','111',{nazev:'Mléčná čokoláda s oříšky',znacka:'Milka',mnozstvi:'100 g',obecny:'Čokoláda'},{},{});
  const p1=db['community/eanProdukty/111'];
  t('neznámý kód → nová karta „zadáno ručně“ s názvem, značkou, balením a druhem',p1&&p1.stav==='nalezeno'&&p1.zdroj==='zadáno ručně'&&p1.nazev==='Mléčná čokoláda s oříšky'&&p1.nazevCesky===true&&p1.znacka==='Milka'&&p1.mnozstvi.hodnota===100&&p1.obecny==='Čokoláda',p1);
  t('karta se zapíše i jako tvůj název a do záznamu změn (bez jména)',sk.nazevUlozen&&db['community/eanKartyLog/111/u1']&&db['community/eanKartyLog/111/u1'].nazev==='Mléčná čokoláda s oříšky');
  db['community/eanProdukty/222']={stav:'nalezeno',nazev:'Lindt Excellence Milk',nazevCesky:false,znacka:'Lindt',mnozstvi:{hodnota:100,jednotka:'g'}};
  await sk.eanAkceKarta('u1','222',{nazev:'Mléčná čokoláda',znacka:'Jiná',mnozstvi:'200 g'},{},{});
  const p2=db['community/eanProdukty/222'];
  t('známý kód → doplní jen chybějící český název, značku ani balení z databáze nepřepíše',p2.nazev==='Lindt Excellence Milk'&&p2.nazevCs==='Mléčná čokoláda'&&p2.znacka==='Lindt'&&p2.mnozstvi.hodnota===100,p2);
  r=await sk.eanAkceKarta('u1','333',{nazev:'x'},{},{});
  t('bez názvu se karta nezaloží',r.st===400&&!db['community/eanProdukty/333']);
  t('worker: ručně založený nebo z fotky doplněný výrobek se po 90 dnech nepřepíše na „nenalezeno“',w.includes("if (produkt && produkt.stav !== 'nalezeno' && _eanStary && _eanStary.stav === 'nalezeno') produkt = Object.assign({}, _eanStary"));
  t('worker: akce „karta“ v routeru',w.includes("if (body.akce === 'karta') return eanAkceKarta(uid, ean, body, env, cors);"));
  // appka
  t('skener: u neznámého kódu tlačítko „Zapsat název / založit kartu výrobku“',es.includes("onclick=\"eanKartaForm('${escHtml(ean)}')\">✍️ Zapsat název / založit kartu výrobku"));
  t('Moje výrobky: u neznámého výzva „Zapiš název výrobku“, název z účtenky jako nápověda',es.includes("✍️ ${st.neznamy ? 'Zapiš název výrobku' : 'Doplň český název'}")&&es.includes('(z účtenky)'));
  t('formulář: název z účtenky, druh z taxonomie, povinný název',es.includes('Na účtence: <b')&&es.includes('list="ekTaxList"')&&es.includes("if (nazev.length < 2) { if (chyba) chyba.textContent = 'Napiš název výrobku.'"));
  console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
})();
