// FinanceFlow · smoke test · S24 · T1 taxonomie výrobků (data/taxonomie.json)
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const T=JSON.parse(fs.readFileSync(najdi('taxonomie.json','../data/taxonomie.json','data/taxonomie.json'),'utf8'));
const PG=JSON.parse(fs.readFileSync(najdi('product-groups.json','../data/product-groups.json','data/product-groups.json'),'utf8'));
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(najdi('helpers.js','../js/helpers.js'),'utf8'),ctx);
const normName=ctx.normName;
const app=fs.readFileSync(najdi('app.js','../js/app.js'),'utf8');
const katId=new Set([...app.matchAll(/\{id:'(cat\d+)'/g)].map(m=>m[1]));
let ok=0,bad=0;const t=(n,c,info)=>{c?ok++:(bad++,console.log('❌',n,info||''));};
const skupiny=new Set(Object.keys(PG.groups));
const coicopOk=c=>skupiny.has(c)||skupiny.has(c.replace(/(\d{2}\.\d{2})(\d)$/,'$1'));
const podIds=new Set(), obecne=new Map(); let nazvu=0;
T.oblasti.forEach(o=>{
  t('oblast '+o.id+' má rozpočtovou kategorii z výchozí sady',katId.has(o.rozpocet),o.rozpocet);
  o.podkategorie.forEach(p=>{
    t('unikátní id podkategorie '+p.id,!podIds.has(p.id)); podIds.add(p.id);
    t('id podkategorie jen malá písmena a pomlčky '+p.id,/^[a-z0-9-]+$/.test(p.id));
    t('COICOP podkategorie '+p.id+' je v číselníku ČSÚ',coicopOk(p.coicop),p.coicop);
    if(p.rozpocet) t('rozpočet podkategorie '+p.id,katId.has(p.rozpocet),p.rozpocet);
    t('podkategorie '+p.id+' má aspoň 1 název',p.nazvy.length>0);
    p.nazvy.forEach(x=>{
      nazvu++;
      const n=typeof x==='string'?x:x.n, k=normName(n);
      t('obecný název má klíč: '+n,k.length>=2);
      t('obecný název je unikátní: '+n,!obecne.has(k),obecne.get(k)); obecne.set(k,p.id);
      t('bez gramáže v obecném názvu: '+n,!/\d/.test(n));
      if(typeof x!=='string') t('COICOP výjimky '+n,coicopOk(x.coicop),x.coicop);
    });
  });
});
t('13 oblastí',T.oblasti.length===13);
t('aspoň 130 podkategorií',podIds.size>=130,podIds.size);
console.log(`taxonomie: ${T.oblasti.length} oblastí · ${podIds.size} podkategorií · ${nazvu} obecných názvů`);
console.log(`${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
