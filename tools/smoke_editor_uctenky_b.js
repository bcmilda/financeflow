// FinanceFlow · smoke test · S28 (v12.42) · nový editor účtenky – varianta B (TODO-374, návrh C1–C4)
//  Milan: „varianta B… přidáme slevu z B4 a musí zůstat i názvy – z účtenky, upravené AI (uživatelem) a z EANu“;
//  „modře otaguju vybrané položky nebo k nim přidám poznámku, nebo poznámku za celý nákup“;
//  8. 11.: zelený tag = „Druh“ · tag položky v Tagy jen částkou položky · poznámka jde najít.
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const rc=R('receipts.js','../js/receipts.js'), hp=R('helpers.js','../js/helpers.js'), adm=R('admin.js','../js/admin.js'), ui=R('ui.js','../js/ui.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

console.log('── karta položky: sleva, název, tagy, poznámka ──');
const r={items:[{name:'RŮŽE HARLEKÝN SVAZE',price:99.9,qty:1,lineTotal:99.9},{name:'MILKINIS 87.5G',price:29.9,qty:1,lineTotal:29.9,nazevAI:'Kinder Milkinis'},{name:'TATRANKY',price:38.5,qty:1,lineTotal:38.5}],total:168.3};
const c={window:{},document:{getElementById:()=>null,activeElement:null},Math,parseFloat,String,Set,showToast:m=>{c.toast=m},
  lineAmt:it=>it.lineTotal!=null?it.lineTotal:(it.price||0)*(it.qty||1),rpEditor:()=>r,rpRender:()=>{c.kresleno=(c.kresleno||0)+1},rpUpdateTotal:()=>{},
  parseTags:x=>x.split(/[\s,]+/).map(t=>t.replace(/^#+/,'').trim().toLowerCase()).filter(t=>t.length>=1&&t.length<=30)};
vm.createContext(c);
vm.runInContext(['_rpUvolni','_rpIt','_rpTagy','rpItemNazev','rpItemNazevAI','rpItemSleva','rpItemTagPridej','rpItemTagOdeber','rpItemPozn','rpVyberPrepni','rpVyberPolozku','rpVyberPouzij','rpNakupTag','rpNakupTagOdeber','rpNakupPozn','rpKamSkupiny'].map(n=>pick(rc,n)).join('\n'),c);
c.rpItemSleva(0,'20');
t('sleva 20 Kč u růže: zaplaceno 79,90, sleva uložená',r.items[0].discount===20&&r.items[0].lineTotal===79.9,r.items[0]);
c.rpItemSleva(0,'25');
t('změna slevy počítá z ceny PŘED slevou (99,90 − 25 = 74,90)',r.items[0].discount===25&&r.items[0].lineTotal===74.9,r.items[0]);
c.rpItemSleva(0,'');
t('smazaná sleva → zpět 99,90, bez discount',r.items[0].discount===undefined&&r.items[0].lineTotal===99.9,r.items[0]);
c.rpItemSleva(2,'500');
t('sleva větší než cena se ořízne na cenu (nikdy záporná položka)',r.items[2].discount===38.5&&r.items[2].lineTotal===0,r.items[2]);
c.rpItemSleva(2,'0');
c.rpItemNazev(0,'Růže harlekýn – 7 ks');
t('vlastní název se ukládá zvlášť (it.nazev), text z účtenky zůstává',r.items[0].nazev==='Růže harlekýn – 7 ks'&&r.items[0].name==='RŮŽE HARLEKÝN SVAZE');
c.rpItemNazev(1,'Kinder Milkinis');
t('název stejný jako návrh AI se neukládá (zůstává „navrhla AI“)',r.items[1].nazev===undefined);
c.rpItemNazev(1,'Milkinis tyčinka'); c.rpItemNazevAI(1);
t('„vrátit návrh AI“ smaže vlastní název',r.items[1].nazev===undefined);
c.rpItemTagPridej(0,'#Mamka narozeniny');
t('modré tagy položky (bez #, malými, víc najednou)',JSON.stringify(r.items[0].tagy)==='["mamka","narozeniny"]',r.items[0].tagy);
c.rpItemTagOdeber(0,1);
t('odebrání tagu podle pořadí',JSON.stringify(r.items[0].tagy)==='["mamka"]');
c.rpItemPozn(0,'  kytka k 60. narozeninám  ');
t('poznámka položky (oříznutá)',r.items[0].poznamka==='kytka k 60. narozeninám');
c.rpItemPozn(0,''); t('prázdná poznámka se smaže',r.items[0].poznamka===undefined); c.rpItemPozn(0,'kytka k 60. narozeninám');

console.log('── Vybrat položky → tag / poznámka najednou ──');
c.rpVyberPrepni(); c.rpVyberPolozku(1,true); c.rpVyberPolozku(2,true);
const pole={rp_vtag:{value:'mamka'},rp_vpozn:{value:''}}; c.document.getElementById=id=>pole[id]||null;
c.rpVyberPouzij();
t('tag přidán ke 2 vybraným, výběr skončil',JSON.stringify(r.items.map(x=>(x.tagy||[]).join()))==='["mamka","mamka","mamka"]'&&c.window._rpVyber===null&&/2 položkám/.test(c.toast),[r.items.map(x=>x.tagy),c.toast]);
c.rpVyberPrepni(); pole.rp_vtag.value=''; c.rpVyberPolozku(2,true); c.rpVyberPouzij();
t('bez tagu i poznámky se nic nestane',/Napiš/.test(c.toast)&&c.window._rpVyber.size===1);
c.window._rpVyber=null;

console.log('── celý nákup + kam se zapíše ──');
c.rpNakupTag('oslava'); c.rpNakupPozn('Nákup na oslavu');
t('tagy a poznámka celého nákupu na účtence',JSON.stringify(r.tagy)==='["oslava"]'&&r.poznamka==='Nákup na oslavu');
c.rpNakupTagOdeber(0); t('odebrání tagu celého nákupu',r.tagy===undefined); c.rpNakupTag('oslava');
r.items[0].itemCatId='dar';r.items[0].itemSubcat='Narozeniny';r.items[1].itemCatId='dar';r.items[1].itemSubcat='Narozeniny';r.items[2].itemCatId='potr';
const sk=c.rpKamSkupiny(r,{categories:[{id:'dar',name:'Dárky',color:'#d4a72c'},{id:'potr',name:'Nákupy potravin'}]});
t('náhled rozdělení = stejné skupiny jako rcptRozdelTx (kategorie + podkategorie)',sk.length===2&&sk[0].nazev==='Dárky › Narozeniny'&&sk[0].n===2&&Math.abs(sk[0].kc-129.8)<0.001,sk);

console.log('── transakce: tagy, Tagy částkou položky, hledání ──');
const ch={window:{},console};vm.createContext(ch);
vm.runInContext(pick(hp,'parseTxTags')+'\n'+pick(hp,'txTagyPolozek')+'\n'+pick(hp,'txVsechnyTagy')+'\n'+pick(hp,'txHledanyText'),ch);
const tx={id:'t',type:'expense',amount:268.1,tags:'Bonboniera Květiny',tagyNakup:['oslava'],poznamkaNakup:'Nákup na oslavu v sobotu',
  receiptItems:[{name:'MERCI',lineTotal:79.9,tag:'Bonboniera',tagy:['mamka']},{name:'RŮŽE',nazev:'Růže harlekýn',lineTotal:79.9,tag:'Květiny',tagy:['mamka'],poznamka:'kytka k 60. narozeninám'},{name:'TATRANKY',lineTotal:108.3}]};
t('parseTxTags: zelené druhy + tagy celého nákupu',JSON.stringify(ch.parseTxTags(tx))==='["Bonboniera","Květiny","oslava"]',ch.parseTxTags(tx));
t('parseTxTags beze změny u ruční transakce (pole) a bez tagů',JSON.stringify(ch.parseTxTags({tags:['dovolena']}))==='["dovolena"]'&&ch.parseTxTags({}).length===0&&ch.parseTxTags(null).length===0);
t('txVsechnyTagy vidí i tagy položek',ch.txVsechnyTagy(tx).includes('mamka'));
t('hledání najde poznámku položky, její název i poznámku nákupu',ch.txHledanyText(tx).includes('narozeninám')&&ch.txHledanyText(tx).includes('růže harlekýn')&&ch.txHledanyText(tx).includes('oslavu'));
const ca={console,getData:()=>({transactions:[tx,{id:'r',type:'expense',amount:500,tags:['mamka']}]}),txCZK:(x)=>x.amount};
vm.createContext(ca); vm.runInContext(pick(hp,'parseTxTags')+'\n'+pick(hp,'txTagyPolozek')+'\n'+pick(adm,'getAllTags'),ca);
const g=Object.fromEntries(ca.getAllTags().map(x=>[x.name,Math.round(x.total*100)/100]));
t('Tagy: #mamka = 79,90 + 79,90 z položek + 500 ruční transakce (ne celá účtenka 268,10)',g.mamka===659.8,g);
t('Tagy: #oslava (celý nákup) = celá účtenka 268,10',g.oslava===268.1,g);
t('Tagy: zelený druh dál jen částkou svých položek (Bonboniera 79,90)',g.Bonboniera===79.9,g);

console.log('── editor: rozložení a propsání ──');
const rr=pick(rc,'rpRender');
t('karta bez posouvání do stran (žádné min-width 726 px)',!/min-width:726px/.test(rc)&&/el\.innerHTML = _eanTip \+ html \+ rpNakupHTML\(r, D\);/.test(rr));
t('tři názvy: Název (it.nazev / návrh AI), „z účtenky“ (rp_name_ = it.name), karta výrobku z kódu',/id="rp_nazev_\$\{i\}"/.test(rr)&&/const nazev = it\.nazev \|\| it\.nazevAI \|\| '';/.test(rr)&&/🧾 z účtenky:/.test(rr)&&/<input id="rp_name_\$\{i\}"/.test(rr)&&/\$\{kodRadek\}/.test(rr));
t('„navrhla AI · klepni a uprav“ / „upraveno tebou“ + vrátit návrh AI',/navrhla AI · klepni a uprav/.test(rr)&&/upraveno tebou/.test(rr)&&/rpItemNazevAI\(\$\{i\}\)/.test(rr));
t('sleva jen u zlevněné položky: přeškrtnutá původní cena + zelený pruh, jinak „+ sleva“',/text-decoration:line-through/.test(rr)&&/id="rp_disc_\$\{i\}"/.test(rr)&&/rpSlevaOtevri\(\$\{i\}\)/.test(rr)&&/disc > 0 \|\| it\._slevaOtevrena/.test(rr));
t('zelené pole se jmenuje „Druh“ (s nápovědou), id rp_tag_ zůstává',/>Druh<\/span>/.test(rr)&&/<input id="rp_tag_\$\{i\}"/.test(rr)&&/RP_DRUH_NAPOVEDA/.test(rr));
t('# modrý tag a poznámka u položky, zaškrtávátko v režimu Vybrat',/rpItemPanel\(\$\{i\}\)/.test(rr)&&/id="rp_itag_\$\{i\}"/.test(rr)&&/id="rp_ipozn_\$\{i\}"/.test(rr)&&/id="rp_vyb_\$\{i\}"/.test(rr));
t('zaškrtávátko neblokuje překreslení (jako textové pole)',/\['number','checkbox','radio','button'\]\.includes\(focused\.type\)/.test(rr));
t('hlavička: ušetřeno na slevách + tlačítko ☑ Vybrat',/id="rp_usetreno"/.test(rc)&&/id="rp_vyber_btn"/.test(rc));
const n=(rc.match(/\.\.\.\(Array\.isArray\(it\.tagy\) && it\.tagy\.length \? \{ tagy: it\.tagy\.slice\(\) \} : \{\}\)/g)||[]).length;
t('tagy, poznámka a název položky jdou do transakce (nová účtenka i úprava)',n===2&&(rc.match(/\.\.\.\(it\.poznamka \? \{ poznamka: it\.poznamka \} : \{\}\)/g)||[]).length===2&&(rc.match(/\.\.\.\(it\.nazev \? \{ nazev: it\.nazev \} : \{\}\)/g)||[]).length===2);
t('tagy a poznámka celého nákupu → tagyNakup / poznamkaNakup (smazané zmizí)',/tagyNakup: receipt\.tagy\.slice\(\)/.test(rc)&&/else delete t\.tagyNakup;/.test(rc)&&/else delete t\.poznamkaNakup;/.test(rc));
t('Transakce: filtr tagu a hledání přes txVsechnyTagy / txHledanyText, štítky modré i zelené',/txVsechnyTagy\(t\)/.test(ui)&&/txHledanyText\(t\)\.includes\(searchFilter\)/.test(ui)&&/function _txStitky\(t\)/.test(ui)&&/t\.poznamkaNakup \? /.test(ui));

console.log(`\n${ok} ✅ · ${bad} ❌`);process.exit(bad?1:0);
