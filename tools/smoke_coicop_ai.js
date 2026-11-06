// FinanceFlow · smoke test · S24 · AI zařazení vlastních kategorií do COICOP (coicop-ai.js + worker /coicop)
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
// ── klient ──
const S={categories:[
 {id:'cat5',name:'Zábava',type:'expense',coicop:9,subs:['Kino','Kavárna']},
 {id:'c_vl',name:'Kočka',type:'expense',subs:['Krmivo']},
 {id:'c_ok',name:'Moje',type:'expense',coicop:13,subs:[]},
 {id:'cat7',name:'Výplata',type:'income',subs:['Bonus']}]};
const calls=[];
const ctx={console,S,getData:()=>S,save(){ctx._ulozeno=(ctx._ulozeno||0)+1;},document:{getElementById:()=>null,createElement:()=>({style:{},addEventListener(){}}),body:{appendChild(){}}},
 DEFAULT_CATEGORIES:[{id:'cat5',name:'Zábava',coicop:9,subs:['Kino']},{id:'cat7',name:'Výplata',subs:['Bonus']}],
 COICOP_GROUPS_DEF:[{id:9,name:'Rekreace',icon:'🎭'},{id:11,name:'Stravování a ubytování',icon:'🍽️'},{id:13,name:'Ostatní',icon:'🧴'}],
 fetch:async(u,o)=>{const b=JSON.parse(o.body);calls.push(b);
   if(b.akce==='hlas') return {ok:true,json:async()=>({ok:true})};
   return {ok:true,json:async()=>({ok:true,vysledky:b.nazvy.map(n=>({klic:ctx.coicopAiKlic(n.nazev),coicop:{'Kavárna':11,'Kočka':9,'Krmivo':9}[n.nazev]??13,stav:'navrh'}))})};}};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('coicop-ai.js','../js/coicop-ai.js'),ctx);
ctx._currentUser={getIdToken:async()=>'T'};
t('klíč bez diakritiky',ctx.coicopAiKlic('Kavárna U Nás!')==='kavarna_u_nas');
const k=ctx.coicopAiKandidati(S);
t('kandidáti: vlastní kategorie bez COICOP + vlastní podkategorie',k.length===3&&k.some(x=>x.typ==='kat'&&x.nazev==='Kočka')&&k.some(x=>x.sub==='Kavárna')&&k.some(x=>x.sub==='Krmivo'),k);
t('kandidáti: výchozí podkategorie, příjmy a kategorie s COICOP ne',!k.some(x=>x.nazev==='Kino'||x.nazev==='Bonus'||x.nazev==='Moje'));
(async()=>{
 await ctx.coicopAiZkontroluj(true);
 const zab=S.categories[0], koc=S.categories[1];
 t('varianta B: odhad hned použitý',koc.coicop===9&&koc.coicopAi.kat==='odhad');
 t('podkategorie s jiným oddílem = výjimka + odhad',zab.coicopOverrides.Kavárna===11&&zab.coicopAi.subs.Kavárna==='odhad');
 t('podkategorie se stejným oddílem jako rodič = jen „dědí"',!(koc.coicopOverrides||{}).Krmivo&&koc.coicopAi.subs.Krmivo==='dedi');
 t('uloženo',ctx._ulozeno===1);
 t('podruhé se už neptá',ctx.coicopAiKandidati(S).length===0);
 t('seznam odhadů',ctx.coicopAiOdhady(S).length===2);
 t('značka 🤖 odhad',ctx.coicopAiZnacka(koc).includes('🤖 odhad')&&ctx.coicopAiZnacka(zab,'Kavárna').includes('odhad')&&ctx.coicopAiZnacka(zab,'Kino')==='');
 t('banner',ctx.coicopAiBanner().includes('2 tvé kategorie'));
 await ctx.coicopAiPotvrd('c_vl','', '13');
 t('změna uživatelem vyhrává a je potvrzená',koc.coicop===13&&koc.coicopAi.kat==='potvrzeno');
 t('hlas odeslán',calls.some(c=>c.akce==='hlas'&&c.klic==='kocka'&&c.coicop===13));
 t('potvrzené se znovu nepřepíše',ctx.coicopAiPouzij(S,[{typ:'kat',catId:'c_vl',nazev:'Kočka'}],[{klic:'kocka',coicop:9}])===0&&koc.coicop===13);
 // v11.14: nový název hned po předchozím dotazu se nepřeskočí
 const n0=calls.length; S.categories[1].subs.push('Kreslení'); await ctx.coicopAiZkontroluj();
 t('nový název hned po prvním dotazu jde k AI',calls.length===n0+1&&calls.at(-1).nazvy.some(x=>x.nazev==='Kreslení'));
 const zn='<img src=x>'; S.categories.push({id:'x',name:zn,type:'expense',coicop:9,coicopAi:{kat:'odhad'},subs:[]});
 t('escapování ve značce',!ctx.coicopAiZnacka(S.categories[4]).includes('<img'));
 // ── worker ──
 let src=R('worker.js','../cloudflare-worker/worker.js').replace('export default {','globalThis.__w = {');
 const db={}; let aiCalls=0, uid='U1';
 const get=p=>p.split('/').filter(Boolean).reduce((o,k)=>o&&o[k],db);
 const set=(p,v)=>{const ks=p.split('/').filter(Boolean);let o=db;ks.slice(0,-1).forEach(k=>o=o[k]=o[k]||{});if(v===null)delete o[ks.at(-1)];else o[ks.at(-1)]=v;};
 const Rs=(st,b)=>({ok:st<400,status:st,json:async()=>b,text:async()=>JSON.stringify(b)});
 const wctx={console,Request:class{constructor(u){this.url=u}},Response:class{constructor(b,o={}){this.body=b;this.status=o.status||200;}async text(){return String(this.body)}},
  caches:{default:{match:async()=>null,put:async()=>{}}},URL,atob,btoa,crypto:globalThis.crypto,TextEncoder,setTimeout,Date,Math,JSON,Promise,
  fetch:async(u,o={})=>{u=String(u);
   if(u.includes('identitytoolkit')) return Rs(200,{users:[{localId:uid}]});
   if(u.includes('api.anthropic.com')){aiCalls++;const n=JSON.parse(o.body).messages[0].content.split('\n').length;
     return Rs(200,{content:[{text:JSON.stringify(Array.from({length:n},(_,i)=>({i,coicop:11,skupina:'11.1'})))}]});}
   if(u.includes('firebasedatabase')){const p=decodeURIComponent(u.split('.app/')[1].split('.json')[0]);const m=o.method||'GET';
     if(m==='GET')return Rs(200,get(p)??null); if(m==='PUT'){set(p,JSON.parse(o.body));return Rs(200,{});} }
   throw new Error(u);}};
 vm.createContext(wctx); vm.runInContext(src,wctx);
 const env={FIREBASE_DB_SECRET:'S',ANTHROPIC_API_KEY:'k'};
 const req=b=>({method:'POST',url:'https://w/coicop',headers:{get:h=>h==='Origin'?'https://financeflow.cz':h==='Authorization'?'Bearer T':null},json:async()=>b});
 const call=async b=>{const r=await wctx.__w.fetch(req(b),env);return {st:r.status,d:JSON.parse(r.body)};};
 let r=await call({akce:'navrh',nazvy:[{nazev:'Kavárna'},{nazev:'Kočka',rodic:'Moje'}]});
 t('worker: AI návrh a uložení do komunity',r.d.vysledky.length===2&&get('community/coicopNavrhy/kavarna').ai.coicop===11&&aiCalls===1);
 t('worker: bez uid v komunitě',!JSON.stringify(db.community).includes('U1'));
 r=await call({akce:'navrh',nazvy:[{nazev:'kavarna'}]});
 t('worker: podruhé bez AI',aiCalls===1&&r.d.vysledky[0].coicop===11);
 t('worker: počet uživatelů jednou',get('community/coicopNavrhy/kavarna').pocet===1);
 uid='U2'; await call({akce:'navrh',nazvy:[{nazev:'Kavárna'}]}); t('worker: druhý uživatel',get('community/coicopNavrhy/kavarna').pocet===2);
 await call({akce:'hlas',klic:'kavarna',coicop:11}); await call({akce:'hlas',klic:'kavarna',coicop:11});
 t('worker: hlas jednou za uživatele',get('community/coicopNavrhy/kavarna').hlasy['11']===1);
 await call({akce:'hlas',klic:'kavarna',coicop:1});
 t('worker: změna hlasu přesune počet',!get('community/coicopNavrhy/kavarna').hlasy['11']&&get('community/coicopNavrhy/kavarna').hlasy['1']===1);
 set('community/coicopNavrhy/kavarna/schvaleno',{coicop:11,kdy:1});
 r=await call({akce:'navrh',nazvy:[{nazev:'Kavárna'}]}); t('worker: schválení má přednost',r.d.vysledky[0].stav==='schvaleno'&&r.d.vysledky[0].coicop===11);
 r=await call({akce:'hlas',klic:'kavarna',coicop:99}); t('worker: neplatný hlas',r.st===400);
 console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
})();
