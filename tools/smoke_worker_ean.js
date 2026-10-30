// FinanceFlow · smoke test · S24 · TODO-306 worker /ean (databáze, komunitní cache, spojení obchod+zkratka)
const vm=require('vm'),fs=require('fs');
let src=fs.readFileSync(require('path').join(__dirname,'worker.js'),'utf8').replace('export default {','globalThis.__w = {');
const db={}; let offCalls=0, uid='U1';
const get=(p)=>p.split('/').filter(Boolean).reduce((o,k)=>o&&o[k],db);
const set=(p,v)=>{const ks=p.split('/').filter(Boolean);let o=db;ks.slice(0,-1).forEach(k=>o=o[k]=o[k]||{});if(v===null)delete o[ks.at(-1)];else o[ks.at(-1)]=v;};
const R=(st,b)=>({ok:st<400,status:st,json:async()=>b,text:async()=>JSON.stringify(b)});
const OFF={'8595237405947':{product_name:'Čočka červená',brands:'Gustito',categories_hierarchy:['en:plant-based-foods','en:legumes','en:lentils','en:red-lentils'],nutriscore_grade:'a',nova_group:1,product_quantity:'500',product_quantity_unit:'g',labels_tags:['en:organic'],nutriments:{'energy-kcal_100g':340,'proteins_100g':24}}};
async function fetchMock(u,o={}){
  u=String(u);
  if(u.includes('identitytoolkit')) return R(200,{users:[{localId:uid}]});
  if(u.includes('firebasedatabase')){ const p=decodeURIComponent(u.split('.app/')[1].split('.json')[0]);
    const m=o.method||'GET';
    if(m==='GET') return R(200,get(p)??null);
    if(m==='PUT'){set(p,JSON.parse(o.body));return R(200,{});}
    if(m==='PATCH'){set(p,{...(get(p)||{}),...JSON.parse(o.body)});return R(200,{});}
    if(m==='DELETE'){set(p,null);return R(200,{});}
  }
  if(u.includes('facts.org')){ offCalls++; if(!o.headers||!o.headers['User-Agent'])throw new Error('no UA');
    const ean=u.match(/product\/(\d+)/)[1];
    if(u.includes('openfoodfacts')&&OFF[ean]) return R(200,{status:1,product:OFF[ean]});
    return R(404,{status:0}); }
  throw new Error('neznámé '+u);
}
const cacheStore=new Map();
const ctx={console,fetch:fetchMock,Request:class{constructor(u){this.url=u}},Response:class{constructor(b,o={}){this.body=b;this.status=o.status||200;this.headers=o.headers;}async text(){return String(this.body)}async json(){return JSON.parse(this.body)}},
 caches:{default:{match:async k=>cacheStore.get(k.url),put:async(k,v)=>cacheStore.set(k.url,v)}},URL,atob,btoa,crypto:globalThis.crypto,TextEncoder,setTimeout,Date,Math,JSON,Promise};
vm.createContext(ctx); vm.runInContext(src,ctx);
const env={FIREBASE_DB_SECRET:'S'};
const req=(body)=>({method:'POST',url:'https://w/ean',headers:{get:h=>h==='Origin'?'https://financeflow.cz':h==='Authorization'?'Bearer T':null},json:async()=>body});
const call=async b=>{const r=await ctx.__w.fetch(req(b),env);return {st:r.status,d:JSON.parse(r.body)};};
let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
(async()=>{
 let r=await call({ean:'8595237405948'}); t('neplatný kód 400',r.st===400);
 r=await call({ean:'2012345678903'.slice(0,12)+'0'}); // compute valid 2-prefix
 const mk=b=>{const c=b.split('').map(Number);let s=0;c.slice().reverse().forEach((n,i)=>s+=n*(i%2===0?3:1));return b+((10-s%10)%10)};
 r=await call({ean:mk('200123456789')}); t('kód obchodu se nehledá',r.d.obchodni===true&&offCalls===0);
 r=await call({ean:'8595237405947'}); const p=r.d.produkt;
 t('nalezeno + normalizace',p.stav==='nalezeno'&&p.nazev==='Čočka červená'&&p.znacka==='Gustito');
 t('gramáž z číselného pole',p.mnozstvi&&p.mnozstvi.hodnota===500&&p.mnozstvi.jednotka==='g');
 t('obecný → konkrétní',p.obecny==='lentils'&&p.konkretni==='red lentils');
 t('COICOP 1',p.coicop===1); t('nutriscore/nova/bio',p.nutriscore==='a'&&p.nova===1&&p.stitky[0]==='bio');
 t('nutrice',p.nutrice.kcal===340&&p.nutrice.bilkoviny===24);
 t('uloženo do komunity',get('community/eanProdukty/8595237405947').nazev==='Čočka červená');
 const c1=offCalls; await call({ean:'8595237405947'}); t('druhý dotaz z komunity, ne z OFF',offCalls===c1);
 r=await call({ean:'8594040230203'}); t('nenalezeno',r.d.produkt.stav==='nenalezeno');
 // alias
 r=await call({ean:'8595237405947',potvrdit:true,klic:'kaufland__cocka_cerv_500g',obchod:'KAUFLAND',raw:'COCKA CERV 500G'});
 t('alias uložen, pocet 1',r.d.alias.pocet===1&&get('community/eanAliasy/8595237405947/kaufland__cocka_cerv_500g').raw==='COCKA CERV 500G');
 t('bez uid v komunitě',!JSON.stringify(db.community).includes('U1'));
 t('opačný index',get('community/eanPodleNazvu/kaufland__cocka_cerv_500g/8595237405947')===1);
 r=await call({ean:'8595237405947',potvrdit:true,klic:'kaufland__cocka_cerv_500g',obchod:'KAUFLAND',raw:'x'});
 t('stejný uživatel znovu = počet se nezvýší',r.d.alias.pocet===1);
 uid='U2'; r=await call({ean:'8595237405947',potvrdit:true,klic:'kaufland__cocka_cerv_500g',obchod:'KAUFLAND',raw:'x'});
 t('druhý uživatel = 2',r.d.alias.pocet===2);
 r=await call({ean:'8594040230203',potvrdit:true,klic:'kaufland__cocka_cerv_500g',obchod:'KAUFLAND',raw:'x'});
 t('přeřazení ubere starému kódu',get('community/eanAliasy/8595237405947/kaufland__cocka_cerv_500g').pocet===1&&get('community/eanPodleNazvu/kaufland__cocka_cerv_500g/8595237405947')===1);
 t('nový kód má potvrzení',get('community/eanAliasy/8594040230203/kaufland__cocka_cerv_500g').pocet===1);
 r=await call({ean:'8595237405947',potvrdit:true,klic:'../evil/path',obchod:'x',raw:'x'});
 t('nebezpečný klíč se ignoruje',r.d.alias===null&&!get('evil'));
 // výpadek všech databází se neukládá
 const orig=ctx.fetch; ctx.fetch=async(u,o)=>{if(String(u).includes('facts.org'))throw new Error('down');return fetchMock(u,o)};
 r=await call({ean:'4006381333931'}); t('výpadek = 502, nic neuloženo',r.st===502&&!get('community/eanProdukty/4006381333931'));
 ctx.fetch=orig;
 console.log(`\n${ok} OK, ${bad} chyb`);
})().catch(e=>console.log('PAD',e));
