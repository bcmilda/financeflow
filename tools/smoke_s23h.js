const fs=require('fs');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cutF=(src,n)=>{const a=src.indexOf('function '+n+'(');let i=src.indexOf('{',a),d=0;for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'){d--;if(!d)break;}}return src.slice(a,i+1);};
// ── panel Verze: escapování ──
const AD=fs.readFileSync('admin.js','utf8');
const a=AD.indexOf('const VERZE_LOG');const b=AD.indexOf('];',a);
eval(AD.slice(a,b+2).replace('const VERZE_LOG','global.VERZE_LOG'));
eval(AD.slice(AD.indexOf('const _vzEsc'),AD.indexOf('\n',AD.indexOf('const _vzEsc'))).replace('const _vzEsc','global._vzEsc'));
eval(cutF(AD,'loadVerze').replace('function loadVerze','global.loadVerze=function'));
const el={innerHTML:''}; global.document={getElementById:()=>el};
loadVerze(); const h=el.innerHTML;
T('záznam v10.62 se vykreslí jako TEXT, ne jako obrázek', !/<img/i.test(h) && /&lt;img src=x onerror=…&gt;/.test(h));
T('v celém panelu není žádný spustitelný atribut on…=', !/<[a-z][^>]*\son[a-z]+=/i.test(h));
T('<loni> a <typ> jsou vidět jako text', /&lt;loni&gt;/.test(h) && /&lt;typ&gt;/.test(h));
T('počet záznamů sedí', (h.match(/<li /g)||[]).length===VERZE_LOG.reduce((x,v)=>x+v.zmeny.length,0));
// ── Poznámky k vydání (share.js) ──
const SH=fs.readFileSync('share.js','utf8');
eval(cutF(SH,'renderReleaseNotes').replace('function renderReleaseNotes','global.renderReleaseNotes=function'));
global.VERZE_LOG=[{verze:'vX',datum:'d',zmeny:['✅ oprava <img src=x onerror=alert(1)>']}];
renderReleaseNotes();
T('Poznámky k vydání escapují HTML', !/<img/i.test(el.innerHTML) && /&lt;img/.test(el.innerHTML));
// ── Kam směřuju po týdnech je větší ──
const PJ=fs.readFileSync('projects.js','utf8');
T('sloupce až 230 px (dřív 120)', /\/mx\*230\)\)/.test(PJ));
T('týden má min. šířku 112 px a graf se na mobilu posouvá', /min-width:112px/.test(PJ) && /overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:10px"><div style="display:flex;gap:10px/.test(PJ));
T('sloupec max 44 px (dřív 26)', /max-width:44px;display:flex;flex-direction:column-reverse;border-radius:5px/.test(PJ));
console.log(`S23/v10.92: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
