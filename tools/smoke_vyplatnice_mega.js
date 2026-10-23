// FinanceFlow · smoke test · S26 (v11.78) · Výplatnice: megagraf, otázky, odvody z přesčasu, odhad výplaty z pásky
//  Milan: „o kolik Kč (%) mám větší odvody, když pracuji přesčas?“ · „kolikrát jsem byl na přesčasu, kdy dovolená / paragraf?“
//         „megagraf přes celou šířku, filtr, hlavní a vedlejší osa, tabulka“ · „AI vrstva: otázky v bublině“
//         „Daně: filtr sloupců, hrubá, čistá, přesčas; je 734 konstanta?“ · „příplatky So+Ne+noční zvlášť od přesčasu, prémie sloupce“
//         „198 vážených hodin je kde?! V listopadu nemám přesčas, 33 500 mít nebudu. Výplata za listopad přijde v prosinci.“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const src=fs.readFileSync(najdi('vyplatnice.js','../js/vyplatnice.js'),'utf8');
const kal=fs.readFileSync(najdi('kalendar.js','../js/kalendar.js'),'utf8');
const realne=najdi('vyplatnice-import.json','../vyplatnice-import.json');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
const CZ_M=['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
const fmt=n=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(n||0);
const fmtP=n=>{const x=parseFloat(n)||0;return Number.isInteger(x)?fmt(x):new Intl.NumberFormat('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2}).format(x)};
const el={};
const c={CZ_M,fmt,fmtP,Math,JSON,Intl,String,Number,Object,Array,Set,Date,isFinite,parseFloat,console,window:{},document:{getElementById:id=>el[id]||null},
  S:{payslips:[],workCal:{hpd:12,breakMin:60,days:{},salaryM:{}}},showToast(m){c.toast=m}};
vm.createContext(c);
vm.runInContext(src.replace(/^const VYPL_POVAHY/m,'var S=this.S;\nconst VYPL_POVAHY')+'\nthis.S=S;'
  +['_workCfg','_workVacH','_czHolidays','_workDay','_workHodiny','workOdhadVyplaty','_ck'].map(n=>pick(kal,n)).join('\n'),c);
if(!realne){ console.log('  (bez skutečných pásek – přeskočeno)'); console.log(`\n${ok} OK, ${bad} chyb`); return; }
const data=JSON.parse(fs.readFileSync(realne,'utf8')).sort((a,b)=>a.m.localeCompare(b.m));
c.S.payslips=data;
const srp=data.find(z=>z.m==='2026-08');

console.log('── hodiny zpětně z pásky ──');
const h=c.vyplHodinyZPasky(srp);
t('srpen 2026: přesčas 21,25 h, dovolená 22 h, noční 56 h, žádná jiná nepřítomnost',h.prescasH===21.25&&h.dovolenaH===22&&h.nocniH===56&&h.jinaH===0,h);

console.log('── odvody z přesčasu (Milanova otázka) ──');
const zp=c.vyplOdvodyZeSlozky(srp,'prescas');
t('přesčas srpen 4 534 Kč → odvody z něj přesně (páska přepočtená bez přesčasu)',zp.kc===4534&&zp.presne&&zp.odvody>1150&&zp.odvody<1250,zp);
t('z přesčasu odejde ~26,6 % (stejně jako z koruny základu)',Math.abs(zp.odvody/zp.kc-0.266)<0.01,zp.odvody/zp.kc);
const zust=data.map(z=>c.vyplMezniMesic(z)).filter(Boolean).map(m=>Math.round((1-m)*1000));
t('z 1 000 Kč navíc zůstane 734 Kč skoro ve všech měsících (konstanta)',zust.filter(v=>v===734).length>=data.length-3,zust);

console.log('── odhad výplaty z pásky (backtest na skutečných páskách) ──');
const chyby=[];
data.forEach((z,i)=>{ if(i<3||z.m<'2026-03'||(z.hlavicka||{}).neplacene) return;
  const hh=c.vyplHodinyZPasky(z);
  const o=c.vyplOdhadVypocet(data.slice(0,i),{planH:hh.fond-hh.neprit,otH:hh.prescasH,vacH:hh.dovolenaH,parH:hh.jinaH,nightH:hh.nocniH,weH:hh.vikendH,holH:hh.svatekH});
  const v=c.vyplDopocet(z), bezOdmen=v.hruba-c.vyplRozklad(z).odmeny;
  chyby.push({m:z.m,dh:Math.round(o.v.hruba-bezOdmen)});
});
t('březen–srpen 2026: odhad hrubé bez odměn do ± 1 000 Kč od pásky',chyby.length>=4&&chyby.every(x=>Math.abs(x.dh)<1000),chyby);
const o8=(()=>{const i=data.indexOf(srp),hh=c.vyplHodinyZPasky(srp);return c.vyplOdhadVypocet(data.slice(0,i),{planH:hh.fond-hh.neprit,otH:hh.prescasH,vacH:hh.dovolenaH,parH:0,nightH:hh.nocniH,weH:hh.vikendH,holH:hh.svatekH});})();
t('srpen: základ, dovolená a přesčas z modelu sedí na pásku na korunu',Math.abs(o8.z.prijmy.zaklad-22655)<=1&&Math.abs(o8.z.prijmy.dovolena-4838)<=1&&Math.abs(o8.z.prijmy.prescas-3366)<=1&&Math.abs(o8.z.prijmy.prescasPr-1168)<=1,o8.z.prijmy);

//  Listopad 2026 podle Milanova screenshotu: 16 směn po 12 h (11 h bez přestávky), 8 nočních, 2 o víkendu, 1 ve svátek, žádný přesčas.
const den=(d,o)=>{c.S.workCal.days[`2026-11-${String(d).padStart(2,'0')}`]=o;};
[2,3,6,7,10,11,14,15,17,18,21,22,25,26,29,30].forEach((d,i)=>den(d,{type:'smena',hours:12,shift:i%2?'nocni':'ranni'}));
const hm=c._workHodiny(c._workCfg(),2026,10);
t('kalendář: plánované hodiny bez přesčasu 176 h, přesčas 0 h',hm.planH===176&&hm.otNetH===0,hm);
{ const o={...c.S.workCal.days}; c.S.workCal.days['2026-11-09']={type:'prescas',hours:12};
  const hp=c._workHodiny(c._workCfg(),2026,10);
  t('přesčasová směna 12 h = 11 h přesčasu (přestávka se nepočítá), Odpracováno 176 + 11',hp.otH===11&&hp.otGrossH===12&&hp.payH===187,hp);
  c.S.workCal.days=o; }
const nov=c.vyplOdhadMesice(2026,10);
t('odhad za listopad bez přesčasu < 33 500 Kč (dřív sazba z října s přesčasy)',nov&&nov.dobirka<33500&&nov.dobirka>28000,nov&&nov.dobirka);
t('rozpis: základ = tarif (žádná nepřítomnost), žádná položka přesčasu',nov.pol.some(p=>p.key==='zaklad'&&Math.abs(p.kc-26140)<=1)&&!nov.pol.some(p=>/prescas/.test(p.key)),nov.pol.map(p=>p.key+':'+p.kc));
t('výplata za listopad přijde v prosinci',nov.vyplaceno==='v prosinci');
den(9,{type:'prescas',hours:12}); den(23,{type:'prescas',hours:12});
const nov2=c.vyplOdhadMesice(2026,10);
t('2 přesčasové směny (22 h) → odhad vyšší a v rozpisu je přesčas',nov2.dobirka>nov.dobirka+3000&&nov2.pol.some(p=>p.key==='prescas'&&p.hodin===22),nov2.dobirka-nov.dobirka);
den(9,{type:'paragraf'}); delete c.S.workCal.days['2026-11-23'];
const nov3=c.vyplOdhadMesice(2026,10);
//  v11.79 (Milan): „paragraf snižuje mzdu, peníze přijdou od státu“ – zaměstnavatel ho neplatí.
t('🩺 paragraf: zaměstnavatel neplatí – základ se zkrátí, žádná náhrada, appka řekne o kolik',!nov3.pol.some(p=>p.key==='_paragraf')&&nov3.fond===187&&nov3.parH===11&&nov3.parZtrata>1500&&nov3.z.prijmy.zaklad<26140&&nov3.dobirka<nov.dobirka,{pol:nov3.pol.map(p=>p.key+':'+p.kc),z:nov3.parZtrata});
t('Sumář: přesčas bez přestávky (11 h, ne 12 h), směny bez „směn + přesč.“, dlaždice Paragraf',/r\.otGrossH = r\.otH; r\.otH = r\.otNetH;/.test(kal)&&!/směn \+ přesč\./.test(kal)&&/sc\('Paragraf'/.test(kal)&&/dávku vyplácí ČSSZ/.test(kal));
c.S.workCal.salaryM['2026-10']=33000; [1,4,5,8,9,12,13,16,19,20,23,24,27,28,31].forEach(d=>c.S.workCal.days[`2026-10-${String(d).padStart(2,'0')}`]={type:'smena',hours:12});
c.S.workCal.days['2026-10-30']={type:'prescas',hours:12};
delete c.S.workCal.days['2026-11-09'];
const stary=c.workOdhadVyplaty(c._workCfg(),2026,10), novy=c.vyplOdhadMesice(2026,10);
t('NEGATIVNÍ KONTROLA: starý odhad (sazba z října vč. přesčasu) je vyšší než odhad z pásky',stary&&novy&&stary.castka>novy.dobirka,{stary:stary&&stary.castka,novy:novy&&novy.dobirka});
t('karta Hodinová mzda: odhad z pásky má přednost a vážené hodiny jsou rozepsané',/odhadP \? _workOdhadZPaskyHTML\(odhadP, m, y, fmt1\)/.test(kal)&&/vážené hodiny \(\$\{fmt1\(weightedH\)\} h = \$\{fmt1\(payH \+ vacH\)\} h/.test(kal)&&/Rozpis odhadu/.test(kal));
t('kalendář: nový typ dne 🩺 Paragraf',/paragraf: \{ label: 'Paragraf', icon: '🩺'/.test(kal));

console.log('── megagraf ──');
c.S.payslips=data;
const htmlPrehled=c._renderKalVyplatnice({},7,2026);
t('v11.88: v přehledu Výplatnice je pod kartou měsíce odkaz na stránku Megagraf (graf samotný ne)',htmlPrehled.indexOf('Megagraf výplat a otázky')>htmlPrehled.indexOf('id="vyplFormBox"')&&htmlPrehled.indexOf('Megagraf výplat a otázky')<htmlPrehled.indexOf('📊 Z čeho se skládá')&&!/id="vgMega"/.test(htmlPrehled));
c.window._vyplStranka='mega';
const html=c._renderKalVyplatnice({},7,2026);
t('v11.88: stránka 🔭 Megagraf – jen megagraf s otázkami, bez karty měsíce',/id="vgMega"/.test(html)&&/Zeptej se svých výplat/.test(html)&&!/id="vyplFormBox"/.test(html));
const kat=c.vyplMegaRady(data);
t('katalog řad: Kč, hodiny, poměry i sazby (přesčas h, dovolená h, paragraf / nemoc h, odvody z přesčasu…)',['hruba','cisty','dobirka','prescasKc','odvodyPrescas','prescasCisty','prescasH','dovolenaH','jinaH','nocniH','sazbaOdvodu','podilPevne','hodinovka','zustane1000'].every(k=>kat.some(r=>r.k===k))&&kat.length>=28,kat.length);
t('výchozí pohled Hrubá × čistá: sloupce na hlavní ose, odvody % čárkovaně na vedlejší (pravá stupnice)',/id="vgMega"/.test(html)&&/class="vg-tk vg-tkp"/.test(html)&&/stroke-dasharray="6 4"/.test(html));
t('pás událostí: přesčas, dovolená, odměna (velikost tečky = hodiny)',/class="vg-udl">⏱</.test(html)&&/class="vg-udl">🏖</.test(html)&&/class="vg-udl">🎁</.test(html));
t('tabulka pod megagrafem s průměrem',/<th>Hrubá<\/th>/.test(html.slice(html.indexOf('id="vgMega"')))&&/<td>Průměr<\/td>/.test(html.slice(html.indexOf('id="vgMega"'))));
vm.runInContext('window._vyplStav={}',c);
c.vyplMegaPohled('hrubaCista');
c.vyplMegaRada('prescasH');
let st=c.window._vyplStav.mega;
t('klepnutí přidá řadu na hlavní osu',st.rady.find(r=>r.k==='prescasH').osa==='L');
//  v11.87 (Milan: „nevím, jak se mění hlavní a vedlejší osa“): osa tlačítky ◀ Hlavní | Vedlejší ▶, klepnutí na řadu = zapnout / vypnout
c.vyplMegaOsa('prescasH','P'); st=c.window._vyplStav.mega; const osaV=st.rady.find(r=>r.k==='prescasH').osa;
const mgOsa=vm.runInContext('_vyplMegaObsah()',c);
c.vyplMegaRada('prescasH'); st=c.window._vyplStav.mega;
t('v11.87: osa tlačítky „◀ Hlavní / Vedlejší ▶“ u každé zobrazené řady, další klepnutí na řadu ji vypne',osaV==='P'&&!st.rady.some(r=>r.k==='prescasH')&&/vyplMegaOsa\('prescasH','L'\)">◀ Hlavní/.test(mgOsa)&&/class="on" onclick="vyplMegaOsa\('prescasH','P'\)">Vedlejší ▶/.test(mgOsa));
const slotCista=st.rady.find(r=>r.k==='cisty').slot; c.vyplMegaRada('hruba'); c.vyplMegaRada('hruba'); c.vyplMegaRada('hruba'); c.vyplMegaRada('dobirka');
st=c.window._vyplStav.mega;
t('barva (slot) zůstává řadě – přidání / odebrání jiné řady ji nepřebarví',st.rady.find(r=>r.k==='cisty').slot===slotCista);
['zp','sp','dan','premie','odmeny'].forEach(k=>c.vyplMegaRada(k));
t(`nejvýš 6 řad najednou (pak upozornění)`,c.window._vyplStav.mega.rady.length===6&&/nejvýš 6/.test(c.toast||''),c.window._vyplStav.mega.rady.length);
c.vyplMegaPohled('nepritomnost');
const mg=vm.runInContext('_vyplMegaObsah()',c);
t('pohled Dovolená a nepřítomnost: skládané hodiny + dobírka na vedlejší ose',/Odpracováno · hlavní osa/.test(mg)&&/Dovolená · hlavní osa/.test(mg)&&/Dobírka \(na účet\) · vedlejší osa/.test(mg));
c.vyplMegaNastav('obdobi','rok');
{ const mr=vm.runInContext('_vyplMegaObsah()',c); const rok=(c.window._vyplRadaVse.slice(-1)[0].m||'').slice(0,4);
  const n=c.window._vyplRadaVse.filter(z=>z.m.startsWith(rok)).length;
  t('v11.87: období „Od ledna“ = jen pásky roku poslední pásky',/Od ledna \d{4}/.test(mr)&&(mr.match(/<tr><td>[A-ZÚČŘŽ][a-zěščřžýáíéůú]{2} \d\d<\/td>/g)||[]).length===n,n);
  c.vyplMegaNastav('kum',1); const mk=vm.runInContext('_vyplMegaObsah()',c);
  t('v11.87: kumulativně – průběžný součet (dovolená, odpracováno), bez řádků průměr / součet',/\(kumulativně\)/.test(mk)&&!/<td>Průměr<\/td>/.test(mk.slice(mk.indexOf('id="vgMega"'))));
  c.vyplMegaNastav('kum',0); }
//  v11.88 (Milan: „megagraf jsem chtěl na samostatnou stránku u Výplatnice“) – místo překryvu přepínač stránek
t('v11.88: Výplatnice má stránky 🧾 Výplatnice / 🔭 Megagraf; na stránce megagrafu větší graf, v přehledu jen odkaz',/zal\('prehled', '🧾 Výplatnice'\)\}\$\{zal\('mega', '🔭 Megagraf'\)\}/.test(src)&&/if \(st === 'mega'\) \{/.test(src)&&/const vyska = cela \? Math\.max\(300/.test(src)&&/Megagraf výplat a otázky/.test(src)&&!/vyplMegaCelaOkno/.test(src));
//  řazení (Milan: „seřaď mi graf hrubé mzdy od největší po nejmenší“)
vm.runInContext('window._vyplStav={}',c);
c.vyplMegaNastav('rady',[{k:'hruba',osa:'L',slot:0}]); c.vyplMegaNastav('obdobi',0); c.vyplMegaNastav('razeni','desc');
{ const ms=vm.runInContext('_vyplMegaObsah()',c);
  const hr=data.map(z=>c.vyplDopocet(z).hruba).sort((a,b)=>b-a);
  const radky=[...ms.slice(ms.indexOf('id="vgMega"')).matchAll(/<tr><td>(\d+)\. [^<]+<\/td><td>([\d\s ]+)<\/td>/g)].map(m=>+m[2].replace(/\D/g,''));
  t('v11.88: řazení ↓ od největší – tabulka i graf v pořadí podle hrubé, s pořadím 1., 2., …',radky.length===data.length&&radky[0]===Math.round(hr[0])&&radky.every((v,i)=>!i||v<=radky[i-1])&&/↓ Od největší/.test(ms)&&/Seřazeno podle řady <b>Hrubá/.test(ms),radky.slice(0,4));
  c.vyplMegaNastav('razeni','asc'); const ma=vm.runInContext('_vyplMegaObsah()',c);
  const ra=[...ma.slice(ma.indexOf('id="vgMega"')).matchAll(/<tr><td>(\d+)\. [^<]+<\/td><td>([\d\s ]+)<\/td>/g)].map(m=>+m[2].replace(/\D/g,''));
  t('v11.88: řazení ↑ od nejmenší',ra.length&&ra.every((v,i)=>!i||v>=ra[i-1]));
  c.vyplMegaNastav('kum',1); const mk=vm.runInContext('_vyplMegaObsah()',c);
  t('v11.88: při řazení se kumulace vypne (s poznámkou)',!/\(kumulativně\)/.test(mk)&&/kumulace je při řazení vypnutá/.test(mk));
  c.vyplMegaNastav('kum',0); c.vyplMegaNastav('razeni',''); }
//  nové otázky
{ const o=c.vyplOdpoved('serazeni',data);
  t('v11.88: otázka „Seřaď hrubou mzdu“ → nejvyšší a nejnižší měsíce, tabulka s pořadím, graf přepnut na řazení',/Nejvyšší hrubá/.test(o.html)&&o.tab[1].length===data.length&&o.tab[1][0][0]==='1.'&&o.nastav.razeni==='desc');
  c.workDovolenaZbyva=()=>({narokH:220,vycerpanoH:88,zPasekH:88,zKalH:0,planH:0,zbyvaH:132,denH:11,paskyDo:'srpen 2026'});
  const d=c.vyplOdpoved('dovolenaZbyva',data);
  t('v11.88: otázka „Kolik dní a hodin dovolené mi zbývá?“ → 132 h = 12 dní (den = 11 h), nárok / vyčerpáno, od ledna kumulativně',/zbývá <b>132 h<\/b> = <b>12 dní<\/b>/.test(d.html)&&/z pásek 88 h \(do srpen 2026\)/.test(d.html)&&d.nastav.obdobi==='rok'&&d.nastav.kum===1);
  t('v11.88: kalendář má workDovolenaZbyva (stejný výpočet jako Sumář)',/function workDovolenaZbyva\(y, dnes\)/.test(kal)); }
c.vyplMegaNastav('obdobi',12);
t('období 12 m: v tabulce 12 měsíců',(vm.runInContext('_vyplMegaObsah()',c).match(/<tr><td>[A-ZÚČŘŽ][a-zěščřžýáíéůú]{2} \d\d<\/td>/g)||[]).length===12);

console.log('── otázky v bublinách ──');
const ids=['prescasOdvody','prescasKolikrat','prescasHodina','nepritomnost','konstanta','nejlepsi','priplatky'];
const odp=ids.map(id=>c.vyplOdpoved(id,data));
t('všech 7 otázek má odpověď (text, většinou i tabulku a pohled megagrafu)',odp.every(o=>o.html&&o.html.length>40)&&odp.filter(o=>o.tab).length>=4,odp.map(o=>o.html.length));
t('„Kolik mi z přesčasu sebere stát?“ → Kč i % a co zůstalo',/odešlo na pojistném a dani <b>[\d\s ]+Kč<\/b>, tj\. <b>26,\d %<\/b>/.test(odp[0].html.replace(/ /g,' ')),odp[0].html.slice(0,200));
t('„Kolikrát jsem byl na přesčasu?“ → počet měsíců a hodin',/Přesčas jsi měl <b>\d+×<\/b>/.test(odp[1].html));
t('„Je 734 Kč konstanta?“ → ano/skoro + kdy se mění',/zůstalo <b>734 Kč<\/b>/.test(odp[4].html)&&/nulová/.test(odp[4].html));
t('„Kolik čistého za hodinu přesčasu?“ → tarifní sazba + příplatek z PPÚ',/tarifní sazba/.test(odp[2].html)&&/čistého/.test(odp[2].html));
el.vyplOdpoved={innerHTML:''}; c.vyplOtazka('prescasOdvody');
t('klepnutí na bublinu: odpověď + tabulka + megagraf přepnut na pohled Přesčas',/vg-odp/.test(el.vyplOdpoved.innerHTML)&&/<table>/.test(el.vyplOdpoved.innerHTML)&&c.window._vyplStav.mega.pohled==='prescas');

console.log('── karty Prémie a Daně ──');
const pr=htmlPrehled.slice(htmlPrehled.indexOf('📈 Prémie, příplatky a přesčas'));
t('Prémie: sloupce prémií, čáry příplatků So+Ne/noční a přesčasu zvlášť',/id="vgPremie"/.test(pr)&&(pr.slice(0,pr.indexOf('</svg>')).match(/<polyline/g)||[]).length===2&&/Příplatky So\+Ne, noční, svátek/.test(pr));
const dn=htmlPrehled.slice(htmlPrehled.indexOf('🏛️ Daně a odvody'));
t('Daně: filtr ZP / SP / daň + čáry hrubá, čistá, přesčas',['vyplOdvFiltr(\'zp\')','vyplOdvFiltr(\'hruba\')','vyplOdvFiltr(\'cisty\')','vyplOdvFiltr(\'prescas\')'].every(x=>dn.includes(x)));
t('Daně: KPI přesčas → odvody z něj a „je to konstanta“',/Přesčas za 12 měsíců/.test(dn)&&/odvody z něj/.test(dn)&&/je to konstanta|stejně v \d+ z \d+/.test(dn));
t('Daně: tabulka má sloupce přesčas / odvody z něj a Z 1 000 zůstane',/<th>Přesčas \/ odvody z něj<\/th>/.test(dn)&&/<th>Z 1 000 zůstane<\/th>/.test(dn));
vm.runInContext('window._vyplStav.odv=null',c); c.vyplOdvFiltr('hruba');
t('filtr: vypnutá hrubá zmizí z grafu, ostatní zůstanou',!c.window._vyplStav.odv.includes('hruba')&&c.window._vyplStav.odv.includes('zp'));
t('složení mzdy: šest složek včetně Přesčasu zvlášť',/vyplFiltr\('prescas'\)/.test(htmlPrehled)&&/vyplFiltr\('priplatky'\)/.test(htmlPrehled));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
