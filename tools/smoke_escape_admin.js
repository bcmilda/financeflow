// S23 (TODO-289): admin panel nesmí vkládat texty od uživatelů do stránky bez escapování.
// Spuštění: node tools/smoke_escape_admin.js [admin.js]
const fs=require('fs');const A=fs.readFileSync(process.argv[2]||'admin.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const ln=(s,i)=>s.slice(0,i).split('\n').length;
// 1) escapery samotné
const get=n=>{const m=A.match(new RegExp('const '+n+' = ([^\\n]+)'));return eval('('+m[1].replace(/;$/,'')+')');};
global.escHtml=undefined;
const _vzEsc=get('_vzEsc'), _jsEsc=get('_jsEsc'), _onEsc=s=>_vzEsc(_jsEsc(s));
T('_vzEsc ošetří < > & " \'', _vzEsc('<img src=x onerror=alert(1)>')==='&lt;img src=x onerror=alert(1)&gt;' && _vzEsc(`a"b'c&d`)==='a&quot;b&#39;c&amp;d');
T('_jsEsc ošetří apostrof a zpětné lomítko', _jsEsc("';alert(1);//")==="\\';alert(1);//" && _jsEsc('a\\b')==='a\\\\b');
T('_onEsc zvládne dvojitý kontext (HTML atribut + JS řetězec)', !/[^\\]'/.test(_onEsc("x');alert(1);('")) && !_onEsc('<b>').includes('<'));
T('_onEsc odstraní konce řádků (rozbily by atribut)', !/\n/.test(_onEsc('a\nb')));
// 2) žádné neošetřené vložení uživatelských polí
const POLE=['u\\.displayName','u\\.email','u\\.name','r\\.email','r\\.name','r\\.text','l\\.name','l\\.phone','l\\.email','z\\.poznamka','z\\.store'];
const re=new RegExp('\\$\\{('+POLE.join('|')+')\\b[^}]*\\}','g');
const nalez=[];let m;
while((m=re.exec(A))){
  const pred=A.slice(Math.max(0,m.index-45),m.index);
  if(/_vzEsc\(|_onEsc\(|_rrEsc\(|encodeURIComponent\(/.test(pred)) continue;         // ošetřeno
  if(/_vzEsc\(|_onEsc\(|_rrEsc\(|encodeURIComponent\(/.test(m[0])) continue;         // ošetřeno uvnitř výrazu
  if(/^\s*`\$\{i\+1\}/.test(A.slice(m.index-20,m.index))) continue;
  const okoli=A.slice(Math.max(0,m.index-260),m.index+120);
  //  CSV export a schránka = PROSTÝ TEXT, escapovat do HTML by bylo špatně.
  const vTextu=/copyAllLeads|navigator\.clipboard\.writeText\(text|\| 📞 |\| ✉️ |_adminEmailSeznam|email;jmeno;souhlas|hlavicka \+ /.test(okoli);
  nalez.push({txt:ln(A,m.index)+': '+m[0].slice(0,60), vTextu});
}
// copyAllLeads skládá PROSTÝ TEXT do schránky, ne HTML – escapovat by bylo špatně.
// Pozná se podle okolí, ne podle čísla řádku (to se posouvá s každou změnou).
const cist=nalez.filter(x=>!x.vTextu);
T('žádné uživatelské pole se nevkládá do HTML bez escapování',cist.length===0||(console.log('   ',cist.map(x=>x.txt).join('\n    ')),false));
// 3) konkrétní opravená místa
T('lead: telefon v onclick prochází _onEsc',/writeText\('\$\{_onEsc\(l\.phone\)\}'\)/.test(A));
T('lead: tel:/mailto: přes encodeURIComponent',/href="tel:\$\{encodeURIComponent\(l\.phone\)\}/.test(A)&&/href="mailto:\$\{encodeURIComponent\(l\.email\)\}/.test(A));
T('recenze: jméno i text přes _vzEsc',/_vzEsc\(r\.name\|\|'Bez jména'\)/.test(A)&&/_vzEsc\(r\.text\)/.test(A));
T('recenze: zrušena neúplná náhrada jen „<"',!/String\(r\.text\)\.replace\(\/<\/g/.test(A));
T('audit plateb: e-mail v tabulce i v upozorněních přes _vzEsc',/_vzEsc\(r\.email\)/.test(A)&&(A.match(/warns\.push\(`⚠️ \$\{_vzEsc\(u\.profile\?\.email \|\| uid\)\}/g)||[]).length===2);
T('changelog (v10.92) je dál escapovaný',/_vzEsc\(z\)/.test(A));
console.log(`Escapování adminu: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
