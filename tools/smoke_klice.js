/* smoke_klice.js — FIX-315 (neplatné klíče) · FIX-316 (čekající partner) */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_klice.js');

const app=R('app.js');
const ctx=vm.createContext({console:{warn(){}}}); ctx.window=ctx;
const i=app.indexOf('const _FB_ZAKAZANE');
vm.runInContext(app.slice(i, app.indexOf('window._fbSafeKeys')), ctx);
const S=ctx._fbSafeKeys;

// Přesně ten případ z produkce
const realny={categories:[{id:13,name:'Dítě',coicopOverrides:{'Školka/škola':10,'Kroužky':9}}]};
const out=S(realny);
ok('FIX-315 · „Školka/škola“ projde jako „Školka-škola“',
   Object.keys(out.categories[0].coicopOverrides).includes('Školka-škola'));
ok('FIX-315 · hodnota se NEZTRATÍ (jen se přejmenuje klíč)',
   out.categories[0].coicopOverrides['Školka-škola']===10);
ok('FIX-315 · nedotčené klíče zůstávají beze změny',
   out.categories[0].coicopOverrides['Kroužky']===9 && out.categories[0].name==='Dítě');

ok('FIX-315 · všech pět zakázaných znaků', (()=>{
  const r=S({'a.b':1,'c#d':2,'e/f':3,'g[h':4,'i]j':5,'k$l':6});
  return Object.keys(r).every(k=>!/[.#$/\[\]]/.test(k)) && Object.keys(r).length===6;
})());
ok('FIX-315 · pole zůstane polem, ne objektem', Array.isArray(S([1,2,3])));
ok('FIX-315 · vnořená struktura se projde do hloubky',
   S({a:{b:[{'x/y':1}]}}).a.b[0]['x-y']===1);
ok('FIX-315 · prázdný klíč se zahodí (Firebase ho taky nebere)',
   Object.keys(S({'':1,ok:2})).join()==='ok');
ok('FIX-315 · primitivní hodnoty projdou beze změny',
   S(5)===5 && S('text')==='text' && S(null)===null);
ok('FIX-315 · celý strom je po sanitaci platný pro Firebase', (()=>{
  const zkontroluj=v=>{
    if(Array.isArray(v)) return v.every(zkontroluj);
    if(v && typeof v==='object') return Object.keys(v).every(k=>k && !/[.#$/\[\]]/.test(k) && zkontroluj(v[k]));
    return true;
  };
  return zkontroluj(S({'a/b':{'c.d':[{'e#f':{'g$h':1}}]}}));
})());

ok('FIX-315 · sanitace visí na OBOU zápisových cestách (data i shared)',
   /const mv = _fbSafeKeys\(_dwMetaVals\(\)\)/.test(app) &&
   /_fbSafeKeys\(Object\.assign\(\{\}, _dwMetaVals\(\)/.test(app) &&
   /const mv=_fbSafeKeys\(_dwMetaVals\(\)\)/.test(app));

// FIX-316
ok('FIX-316 · odepření se neloguje jako Error', !/console\.log\('Partner load error:'/.test(app));
ok('FIX-316 · odepřený partner se zapamatuje', /_cekajiciPartneri\.push\(uid\)/.test(app));
ok('FIX-316 · seznam se při každém načtení vyprázdní', /_cekajiciPartneri\.length = 0;/.test(app));
ok('FIX-316 · skutečná chyba se pořád hlásí jako varování',
   /console\.warn\('\[sdílení\] partnera se nepodařilo načíst:'/.test(app));
const st=R('stats.js');
ok('FIX-316 · souhrn rozliší „nikoho nemám“ od „čeká se na druhou stranu“',
   /Čeká se na druhou stranu/.test(st) && /Zatím nemáš nikoho ve sdílení/.test(st));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
