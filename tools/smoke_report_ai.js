// S25 (v11.47, TODO-317 F3) – AI vrstva měsíčního reportu: podklady bez osobních údajů,
// vykreslení AI textů s návratem k pravidlům a kontrola čísel ve workeru nad stejnými podklady.
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i).slice(0,300));if(!c)bad++;};
const cats=[{id:'cat1',name:'Jídlo',icon:'🛒',type:'expense',coicop:1,healthAmt:9000},{id:'cat3',name:'Bydlení',type:'expense',coicop:4},{id:'cat7',name:'Výplata',type:'income'}];
const tx=[];let id=1;
for(let k=0;k<13;k++){let m=9-k,y=2026;while(m<0){m+=12;y--;}const d=dd=>`${y}-${String(m+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
 tx.push({id:id++,type:'income',catId:'cat7',amount:40000,date:d(12)},{id:id++,type:'expense',catId:'cat3',amount:12000,date:d(13),name:'Nájem'},{id:id++,type:'expense',catId:'cat1',amount:9000+k*100,date:d(8),name:'Lidl'});}
const S={categories:cats,transactions:tx,wallets:[{id:'w1',name:'Účet',balance:20000}],sablony:[{type:'income',name:'Výplata',amount:40000,den:12},{type:'expense',name:'Nájem',amount:12000,den:13},{type:'expense',name:'Netflix',amount:329,den:12},{type:'expense',name:'Spotify',amount:199,den:5}],debts:[],wishes:[],receipts:[],curMonth:9,curYear:2026};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{}}),head:{appendChild(){}},body:{appendChild(){}}},fetch:async()=>({ok:true,json:async()=>null}),setTimeout,fmt:String,czkToBase:v=>v};
ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
const P=R('projects.js','../js/projects.js');vm.runInContext(P.slice(P.indexOf('const REPORT_KARTY = ['),P.indexOf('function renderReport() {')).replace(/const (REPORT_\w+) =/g,'var $1 ='),ctx);
vm.runInContext(R('report-mesicni.js','../js/report-mesicni.js'),ctx);
const rd=ctx.mesReportData(S,9,2026);
console.log('── S25 · AI vrstva reportu ──');
const data=ctx.mesReportAIPodklady(rd), js=JSON.stringify(data);
t('podklady: souhrn, minulý měsíc, průměr, skupiny, rozpočty, výhled',data.souhrn.prijmy===40000&&data.souhrn.bilance===19000&&data.prumer3Mesice.vydaje===21200&&data.skupinyVydaju.length>0&&data.rozpocty.length===1&&data.vyhledPristiMesic.prijmy===40000);
t('podklady: předpočítané rozdíly a roční částky (AI nic nepočítá)',data.rozdily.vydajeProtiPrumeru===-200&&data.pravidelnePlatby.drobneRocne===(329+199)*12&&data.prebytek.polovinaRocne===9500*12);
t('podklady neobsahují názvy transakcí („Lidl“), jen kategorie a šablony',!js.includes('Lidl')&&js.includes('Netflix'));
t('podklady jsou malé (< 30 kB, limit workeru)',js.length<30000,js.length);
// vykreslení
const bez=ctx.mesReportHTML(rd,true);
t('bez AI: postřehy a doporučení „spočítané z tvých čísel“, žádný ✨',bez.includes('Spočítané z tvých čísel')&&bez.includes('spočítané z tvých čísel')&&!bez.includes('✨'));
rd.ai={shrnuti:'Září skončilo v plusu 19 000 Kč a ušetřil jsi 48 % příjmů.',hodnoceni:{znamka:'výborný',proc:'Míra úspor je stabilně vysoká.'},
  postrehy:[{titulek:'Jídlo drží průměr',text:'Za jídlo 9 000 Kč, průměr 9 100 Kč.'},{titulek:'Rozpočet na hraně',text:'Jídlo vyčerpalo 100 % limitu.'},{titulek:'Pravidelné platby',text:'Drobné platby 528 Kč měsíčně.'}],
  doporuceni:[{titulek:'Polovinu přebytku do rezervy',prinos:'114 000 Kč ročně',text:'Trvalý příkaz na 9 500 Kč po výplatě.'},{titulek:'Projdi předplatné',prinos:'6 336 Kč ročně',text:'Netflix a Spotify.'}],
  vyhled:'Říjen by měl skončit v plusu kolem 19 000 Kč.',kdy:Date.now(),vyrazeno:0};
const s=ctx.mesReportHTML(rd,true);
t('s AI: shrnutí místo pravidlové věty v úvodu',s.includes('Září skončilo v plusu 19 000 Kč a ušetřil jsi 48 % příjmů.'));
t('s AI: hodnocení v rámečku verdiktu',s.includes('✨ Hodnocení:')&&s.includes('výborný měsíc'));
t('s AI: 3 postřehy s popiskem „každé číslo ověřené appkou“',s.includes('Jídlo drží průměr')&&s.includes('Pravidelné platby')&&s.includes('každé číslo ověřené appkou'));
t('s AI: doporučení a výhled',s.includes('Polovinu přebytku do rezervy')&&s.includes('114 000 Kč ročně')&&s.includes('✨ Říjen by měl skončit'));
rd.ai.shrnuti='<img src=x onerror=alert(1)>';t('AI text se escapuje',!ctx.mesReportHTML(rd,true).includes('<img src=x'));
rd.ai={postrehy:[],doporuceni:[],shrnuti:null,hodnoceni:null,vyhled:null};
const prazdne=ctx.mesReportHTML(rd,true);
t('AI bez použitelných textů → zůstanou pravidla',prazdne.includes('Spočítané z tvých čísel')&&prazdne.includes('spočítané z tvých čísel'));
rd.ai=null;
t('Free report AI nemá',!ctx.mesReportHTML(rd,false).includes('✨'));
// worker – stejné podklady
const w=R('worker.js','../cloudflare-worker/worker.js','../worker.js');
const pick=n=>{let a=w.indexOf('function '+n+'(');let d=0,j=w.indexOf('{',a);for(let k=j;k<w.length;k++){if(w[k]==='{')d++;else if(w[k]==='}'){d--;if(!d)return w.slice(a,k+1)}}};
const sw={};vm.createContext(sw);vm.runInContext("var REPORT_AI_ZNAMKY=['výborný','dobrý','průměrný','slabý','špatný'];\n"+['reportAIPovolena','reportAICisla','reportAITextOk','reportAIStr','reportAIOver','tierZPremium'].map(pick).join('\n'),sw);
const o=sw.reportAIOver({shrnuti:'Září skončilo v plusu 19 000 Kč, ušetřil jsi 48 % příjmů.',hodnoceni:{znamka:'Výborný',proc:'Míra úspor 48 %.'},
  postrehy:[{titulek:'Jídlo',text:'9 000 Kč, průměr 9 100 Kč.'},{titulek:'Vymyšlené',text:'Ušetříš 77 777 Kč.'},{titulek:'Předplatné',text:'528 Kč měsíčně, 6 336 Kč ročně.'},{titulek:'Rozpočet',text:'Limit 9 000 Kč vyčerpán na 100 %.'}],
  doporuceni:[{titulek:'Rezerva',prinos:'114 000 Kč ročně',text:'Pošli 9 500 Kč po výplatě.'},{titulek:'Spočítané AI',prinos:'40 000 Kč',text:'Ušetříš 55 555 Kč.'}],vyhled:'Kolem 19 000 Kč.'},JSON.parse(js));
t('worker: čísla z podkladů projdou (i roční částky a polovina přebytku)',o.vysledek.shrnuti&&o.vysledek.postrehy.length===3&&o.vysledek.doporuceni.length===1&&o.vysledek.vyhled,{p:o.vysledek.postrehy.length,d:o.vysledek.doporuceni,v:o.vyrazeno});
t('worker: vymyšlená čísla vyřadí (77 777 Kč, 55 555 Kč) a spočítá je',o.vyrazeno===2&&!JSON.stringify(o.vysledek).includes('77 777')&&!JSON.stringify(o.vysledek).includes('55 555'));
t('worker: známka sjednocená, neznámá se zahodí',o.vysledek.hodnoceni.znamka==='výborný'&&sw.reportAIOver({hodnoceni:{znamka:'super'}},{}).vysledek.hodnoceni===null);
// tarif – OPRAVA polí
const now=Date.now();
t('worker: tarif čte premiumUntil/trialUntil (dřív validUntil/trialEnd → každý Free)',sw.tierZPremium({type:'premium',premiumUntil:now+1e7})==='premium'&&sw.tierZPremium({type:'pro',premiumUntil:now+1e7})==='premium'&&sw.tierZPremium({type:'trial',trialUntil:now+1e7})==='trial'&&sw.tierZPremium({type:'premium',premiumUntil:now-1})==='free'&&sw.tierZPremium(null)==='free');
t('worker: /report-ai jen Premium, kvóta report_ai, uložení s otiskem, cache bez volání AI',w.includes("pathname === '/report-ai'")&&w.includes("if (tier === 'free') return json({ error: 'AI komentář reportu je součástí Premium.'")&&w.includes("checkAndIncrementQuota(uid, 'report_ai', env)")&&w.includes('ulozeny.otisk === otisk && !body.znovu')&&/report_ai: 0 }/.test(w)&&/report_ai: 15 }/.test(w));
const rm=R('report-mesicni.js','../js/report-mesicni.js');
t('appka: uzavřený měsíc se napíše sám, běžící jen tlačítkem, po chybě ne znovu sám',rm.includes('mesReportAIZajisti(rd, uzavreny && !bylaChyba)')&&rm.includes("✨ Napsat AI komentář"));
t('appka: e-mailový report čeká na AI max. 25 s, jinak pravidla',rm.includes('setTimeout(() => r(null), 25000)'));
t('appka: otisk podkladů stejný jako ve workeru',rm.includes("crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)))")&&w.includes("crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)))"));
if(process.env.NAHLED){rd.ai={shrnuti:'Září skončilo v plusu 19 000 Kč a ušetřil jsi 48 % příjmů – stejně jako v průměru posledních 3 měsíců. Výdaje se drží těsně pod průměrem.',hodnoceni:{znamka:'výborný',proc:'Míra úspor je stabilně vysoká a rozpočet na jídlo vychází přesně.'},
  postrehy:[{titulek:'Jídlo drží průměr',text:'Za jídlo jsi dal 9 000 Kč, v průměru posledních 3 měsíců 9 100 Kč. Rozpočet na jídlo je vyčerpaný přesně na 100 %.'},{titulek:'Nájem beze změny',text:'Bydlení stojí stále 12 000 Kč měsíčně – je to největší skupina výdajů.'},{titulek:'Drobné platby',text:'Netflix a Spotify dohromady 528 Kč měsíčně, za rok 6 336 Kč.'}],
  doporuceni:[{titulek:'Polovinu přebytku do rezervy',prinos:'114 000 Kč ročně',text:'Měsíc skončil v plusu 19 000 Kč. Trvalý příkaz na 9 500 Kč hned po výplatě zajistí, že peníze neodtečou.'},{titulek:'Zvaž limit na jídlo',prinos:'rozpočet na hraně',text:'Limit 9 000 Kč je vyčerpaný na 100 %. Buď ho mírně navyš, nebo hlídej nákupy ke konci měsíce.'},{titulek:'Projdi předplatné',prinos:'6 336 Kč ročně',text:'Netflix a Spotify – co nevyužíváš, zruš.'}],
  vyhled:'Říjen by při stejném tempu měl skončit v plusu kolem 19 000 Kč.',kdy:Date.now(),vyrazeno:0};
  fs.writeFileSync(process.env.NAHLED,'<!doctype html><html><head><meta charset=utf-8><style>'+ctx._rpCss()+' body{background:#E6EAF0}.rp4 .page{margin:8mm auto}</style></head><body><div class="rp4">'+ctx.mesReportHTML(rd,true)+'</div></body></html>');}
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
