// FinanceFlow · smoke test · Session 27 (v11.96) · 🔎 Zeptej se svých dat
//  Milan: „kolik utrácím za kávu – kavárny, restaurace, nákup kávy v obchodě, zelené tagy káva/kafe“,
//  „jak často chodím do obchodu“, „kolik kupuju pečiva“, „měsíc, rok, celá historie; tabulka, číslo,
//  statistika nebo graf“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const src=R('dotazy.js','../js/dotazy.js'), ui=R('ui.js','../js/ui.js'), html=R('app.html','../app.html');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

const c={console,Intl,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,activeElement:null},
  isTransferTx:t=>t.category==='transfer',txCZK:t=>t.amtCZK!=null?t.amtCZK:t.amount,fmtB:v=>v+' Kč',
  parseTxTags:t=>Array.isArray(t.tags)?t.tags:typeof t.tags==='string'?t.tags.split(/[\s,]+/).filter(Boolean):[],
  CZ_M:['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec']};
c.window=c; vm.createContext(c); vm.runInContext(src,c);
const dnes=new Date(2026,9,21);

const D={categories:[{id:'jidlo',name:'Nákupy potravin',type:'expense',subs:['Supermarket']},{id:'rest',name:'Restaurace & Kavárny',type:'expense',subs:['Restaurace','Kavárna']},
  {id:'auto',name:'Auto',type:'expense',subs:['Palivo']},{id:'alk',name:'Pivo',type:'expense',subs:[]}],
 transactions:[
  {id:1,type:'expense',amount:85,date:'2026-10-05',catId:'rest',subcat:'Kavárna',name:'Kavárna Mlýnek'},
  {id:2,type:'expense',amount:412,date:'2026-10-12',catId:'jidlo',name:'Penny Market',receiptStore:'Penny Market',tags:'Kafe Pečivo',receiptItems:[{name:'Jacobs Krönung 250g',qty:1,lineTotal:129.9,tag:'Kafe'},{name:'ROHLÍK 43G',qty:10,lineTotal:35},{name:'Chléb Šumava',qty:1,lineTotal:49.9,tag:'Pečivo'},{name:'Mléko 1l',qty:1,lineTotal:24.9}]},
  {id:3,type:'expense',amount:1022.4,date:'2026-10-14',catId:'auto',subcat:'Palivo',name:'MOL',receiptStore:'MOL',receiptItems:[{name:'EVO 95',qty:22,lineTotal:988.4},{name:'Kafe',qty:1,lineTotal:34}]},
  {id:4,type:'expense',amount:640,date:'2026-10-16',catId:'rest',subcat:'Restaurace',name:'Hostinec',receiptStore:'Hostinec',receiptItems:[{name:'Pivo',qty:4,lineTotal:208,tag:'Pivo'},{name:'Svíčková',qty:1,lineTotal:239},{name:'Espresso',qty:2,lineTotal:98}]},
  {id:5,type:'expense',amount:120,date:'2026-10-18',catId:'rest',name:'Kafe s Pavlem',tags:['kafe']},
  {id:6,type:'expense',amount:40,date:'2026-09-03',catId:'jidlo',name:'Billa AT',currency:'EUR',amtCZK:1000,receiptStore:'Billa',receiptItems:[{name:'Nescafe Gold',qty:1,lineTotal:8},{name:'Brot',qty:1,lineTotal:2}]},
  {id:7,type:'expense',amount:500,date:'2026-10-10',category:'transfer',name:'Kafe – převod'},
  {id:8,type:'expense',amount:300,date:'2026-10-11',catId:'jidlo',name:'Kaufland',splitParent:true},
  {id:9,type:'expense',amount:99,date:'2025-01-04',catId:'rest',subcat:'Kavárna',name:'Kavárna stará'},
  {id:10,type:'income',amount:30000,date:'2026-10-15',catId:'vyp',name:'Výplata'}]};

console.log('── hledání slov ──');
t('krátké slovo celé, delší od začátku, jiný tvar dlouhého slova',c.dotSedi('Kafe s Pavlem',['kafe'])==='kafe'&&c.dotSedi('Rumunský salát',['rum'])===''&&c.dotSedi('Nákupy potravin',['potraviny'])==='potraviny'&&c.dotSedi('Kavárna Mlýnek',['kavarna'])==='kavarna');
t('bez diakritiky a velikosti písmen',c.dotSedi('JACOBS KRÖNUNG',['jacobs'])==='jacobs'&&c.dotSedi('Espresso',['ESPRESSO'])==='ESPRESSO');

console.log('── rozpoznání bez AI ──');
let p=c.dotPlanLokalne('Kolik utrácím za kávu?',D);
t('káva: obměny, podkategorie Kavárna (ne celá „Restaurace & Kavárny“), 12 měsíců, útrata, název „kávu“',p.pojmy.includes('kafe')&&p.pojmy.includes('espresso')&&JSON.stringify(p.kategorie)==='["rest|Kavárna"]'&&p.obdobi==='12m'&&p.mira==='utrata'&&p.nazev==='kávu',p);
p=c.dotPlanLokalne('Jak často chodím nakupovat potraviny?',D);
t('jak často: počet nákupů, kategorie Nákupy potravin, statistika',p.mira==='pocet'&&p.kategorie.includes('jidlo|')&&p.vystup==='statistika',p);
p=c.dotPlanLokalne('Kolik kupuju pečiva za měsíc?',D);
t('pečivo „za měsíc“ = průměr (statistika), ne jen tento měsíc',p.obdobi==='12m'&&p.vystup==='statistika'&&p.pojmy.includes('rohlik')&&p.nazev==='pečivo',p);
p=c.dotPlanLokalne('Kolik mě letos stál alkohol?',D);
t('letos = rok; alkohol najde i kategorii Pivo',p.obdobi==='rok'&&p.kategorie.includes('alk|')&&p.pojmy.includes('pivo'),p);
p=c.dotPlanLokalne('Ve kterém obchodě utrácím nejvíc? Tabulka',D);
t('ve kterém obchodě: všechny výdaje po obchodech, tabulka',p.vse&&p.rozpad==='obchod'&&p.vystup==='tabulka'&&!p.pojmy.length,p);
p=c.dotPlanLokalne('Restaurace po měsících za celou historii – graf',D);
t('restaurace, celá historie, graf po měsících',p.obdobi==='vse'&&p.vystup==='graf'&&p.rozpad==='mesic'&&p.kategorie.includes('rest|Restaurace'),p);
t('tento měsíc / kolik kusů',c.dotPlanLokalne('Kolik kusů rohlíků jsem koupil tento měsíc?',D).obdobi==='mesic'&&c.dotPlanLokalne('Kolik kusů rohlíků jsem koupil tento měsíc?',D).mira==='mnozstvi');

console.log('── výpočet ──');
let v=c.dotazSpocitej(D,c.dotPlanLokalne('Kolik utrácím za kávu?',D),dnes);
const s=c.dotazSouhrn(v,'mesic',dnes);
//  kavárna 85 + Jacobs 129,9 + kafe u benzínky 34 + espresso 98 + Kafe s Pavlem 120 + Nescafe 8 € → 200 Kč (kurz z transakce 1000/40)
t('káva = 85 + 129,90 + 34 + 98 + 120 + 200 (Nescafe v EUR přepočtené) = 666,90 Kč',Math.abs(s.kc-666.9)<0.01,s.kc);
t('celé transakce jen u kavárny a štítku; z Hostince jen espresso (ne svíčková a pivo), z MOL jen kafe',!v.zaznamy.some(x=>x.nazev==='Svíčková'||x.nazev==='Pivo'||x.nazev==='EVO 95')&&v.zaznamy.filter(x=>x.txId===4).length===1&&v.zaznamy.find(x=>x.txId===1).kc===85);
t('přesun a rodič rozpadu se nepočítají, stará kavárna mimo 12 měsíců',!v.zaznamy.some(x=>x.txId===7||x.txId===8||x.txId===9));
t('každá transakce/položka jednou (štítek Kafe u Jacobs i název – jen jednou)',v.zaznamy.filter(x=>x.nazev==='Jacobs Krönung 250g').length===1);
t('nákupů = 6 různých transakcí',s.nakupu===6);
t('zdroje: kategorie, štítek, položka účtenky',v.zdroje.kategorie===1&&v.zdroje.stitek===2&&v.zdroje.polozka===3,v.zdroje);
let p2=Object.assign({},c.dotPlanLokalne('Kolik utrácím za kávu?',D),{obdobi:'vse'});
t('celá historie přidá starou kavárnu (99 Kč)',Math.abs(c.dotazSouhrn(c.dotazSpocitej(D,p2,dnes),'mesic',dnes).kc-765.9)<0.01);
p2.vypnout=['stitek'];
t('vypnutý zdroj „štítek“: bez Kafe s Pavlem a Jacobs (−249,90)',Math.abs(c.dotazSouhrn(c.dotazSpocitej(D,p2,dnes),'mesic',dnes).kc-516)<0.01);
v=c.dotazSpocitej(D,c.dotPlanLokalne('Kolik kupuju pečiva za měsíc?',D),dnes);
t('pečivo: rohlíky 35 + chléb 49,90 + Brot? (ne – není v obměnách) = 84,90 Kč, 11 ks',Math.abs(c.dotazSouhrn(v,'mesic',dnes).kc-84.9)<0.01&&c.dotazSouhrn(v,'mesic',dnes).ks===11);
v=c.dotazSpocitej(D,c.dotPlanLokalne('Jak často chodím nakupovat potraviny?',D),dnes);
t('nákupy potravin: Penny + Billa = 2 (Kaufland jako rodič rozpadu ne)',c.dotazSouhrn(v,'mesic',dnes).nakupu===2);
v=c.dotazSpocitej(D,c.dotPlanLokalne('Ve kterém obchodě utrácím nejvíc?',D),dnes);
const so=c.dotazSouhrn(v,'obchod',dnes);
t('po obchodech: MOL první, bez příjmu a přesunů',so.radky[0].klic==='MOL'&&!v.zaznamy.some(x=>x.txId===10||x.txId===7),so.radky.slice(0,3));
const sm=c.dotazSouhrn(c.dotazSpocitej(D,Object.assign(c.dotPlanLokalne('Kolik utrácím za kávu?',D),{obdobi:'12m'}),dnes),'mesic',dnes);
t('rozpad po měsících: 12 měsíců včetně prázdných',sm.radky.length===12&&sm.radky[11].klic==='2026-10'&&sm.radky[0].kc===0,sm.radky.map(r=>r.klic));
t('dny v týdnu: 7 řádků',c.dotazSouhrn(c.dotazSpocitej(D,c.dotPlanLokalne('Kolik utrácím za kávu?',D),dnes),'den',dnes).radky.length===7);

console.log('── plán od AI ──');
const ai=c.dotPlanZAI('Tady je plán: {"nazev":"káva","pojmy":["kafe","espresso"],"kategorie":["rest|Kavárna","neexistuje","alk"],"mira":"pocet","obdobi":"rok","rozpad":"obchod","vystup":"graf","vysvetleni":"hledám kávu"}',D);
t('čte JSON i s textem okolo, neznámé kategorie zahodí, „alk“ = celá kategorie',ai&&ai.zdroj==='ai'&&JSON.stringify(ai.kategorie)==='["rest|Kavárna","alk|"]'&&ai.mira==='pocet'&&ai.obdobi==='rok'&&ai.vystup==='graf',ai);
const ai2=c.dotPlanZAI('{"pojmy":["x"],"mira":"nesmysl","obdobi":"tyden","vystup":"pdf"}',D);
t('neplatné hodnoty → výchozí (útrata, 12 měsíců, číslo)',ai2.mira==='utrata'&&ai2.obdobi==='12m'&&ai2.vystup==='cislo');
t('nevalidní odpověď → null (použije se rozpoznání bez AI)',c.dotPlanZAI('nevím',D)===null);
const pr=c.dotPromptAI('Kolik za kávu?',D);
t('AI dostane jen otázku a názvy (kategorie, štítky, obchody), žádné částky',/Restaurace & Kavárny \[Restaurace, Kavárna\]/.test(pr)&&/Kafe/.test(pr)&&/Penny Market/.test(pr)&&!/412|129|1022/.test(pr));

console.log('── napojení ──');
t('AI Rádce: místo pro kartu a skript dotazy.js',/<div id="dotazyBox"/.test(html)&&html.indexOf('id="dotazyBox"')>html.indexOf('id="page-ai"')&&/js\/dotazy\.js\?v=/.test(html));
t('renderPage na stránce AI kreslí i dotazy',/if\(curPage==='ai'\)\{renderAiPage\(\); if\(typeof dotazyRender==='function'\)dotazyRender\(\);\}/.test(ui));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
