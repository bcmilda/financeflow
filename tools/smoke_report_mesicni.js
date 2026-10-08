// FinanceFlow · smoke test · S24 · v11.27 měsíční report na skutečných datech (Report2, TODO-317 F2)
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
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
t('příjmy, výdaje, bilance',rd.inc===40000&&rd.vyd===21000&&rd.bil===19000,{i:rd.inc,v:rd.vyd});
t('skupiny sedí na výdaje',Math.round(rd.karty.reduce((a,k)=>a+k.v,0))===rd.vyd);
t('minulý měsíc a průměr 3 měsíců',rd.pm.v===21100&&Math.round(rd.avg.v)===21200,{pm:rd.pm.v,a:rd.avg.v});
t('12 měsíců řady',rd.rok.length===12&&rd.rok.at(-1).v===21000);
t('kumulovaný pohyb den po dni končí bilancí',Math.round(rd.kumNet.at(-1))===19000&&rd.kumNet.length===31);
t('rozpočet z limitu kategorie',rd.rozp.length===1&&rd.rozp[0].lim===9000&&rd.rozp[0].v===9000);
t('pravidelné platby a příští měsíc ze šablon',rd.pravidelne.length===3&&rd.pristi.length===4&&rd.pristi[0].d===5);
t('odhad: příjem ze šablon',rd.fc.p===40000&&rd.fc.pasmo>0);
const f=ctx.mesReportHTML(rd,false), p=ctx.mesReportHTML(rd,true);
t('Free: 2 strany s upoutávkou',(f.match(/class="page/g)||[]).length===2&&f.includes('V Premium reportu je rozbor'));
t('Premium: 4 strany, vodopád, účtenky prázdný stav, doporučení',(p.match(/class="page/g)||[]).length===4&&p.includes('Od příjmu k úspoře')&&p.includes('nemáš žádnou naskenovanou účtenku')&&p.includes('Doporučení na listopad'));
t('doporučení neruší nájem',!/zruš[^<]*Nájem/.test(p)&&p.includes('Netflix'));
t('bez undefined/NaN',!/undefined|NaN/.test(f+p));
t('bez AI komentáře jsou postřehy označené jako spočítané z čísel',p.includes('Spočítané z tvých čísel')&&!p.includes('✨'));   // S25 (F3): AI vrstva hotová – smoke_report_ai.js
const RJ=R('report.js','../js/report.js'),PM=R('premium.js','../js/premium.js');
t('Report2: záložky, matice jen Premium',/rep2Tab\('mesicni'/.test(RJ)||RJ.includes("btn('mesicni'")&&RJ.includes("if (t === 'matice' && !pro)"));
t('Report2 odemčen pro Free',!/const PREMIUM_PAGES = \[[^\]]*'report2'/.test(PM));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
