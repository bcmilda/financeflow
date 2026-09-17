// FinanceFlow · v10.71 · tools/smoke_report.js · 2026-09-16
// S22 · Nahlášení špatně přečtené účtenky + diagnostika chybějícího skriptu.
const fs=require('fs');
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n);}catch(e){fails++;console.log('  ❌',n,'→',e.message);}};
const assert=(c,m)=>{if(!c)throw new Error(m);};
const src=fs.readFileSync('receipts.js','utf8');
const html=fs.readFileSync('app.html','utf8');
const rules=fs.readFileSync('database_rules.json','utf8');

console.log('── Hlášení účtenky ──');
check('tlačítko je u upozornění na rozpor',()=>{
  assert(/Nahlásit špatné čtení/.test(src),'tlačítko chybí');
  assert(/rp_report/.test(src),'chybí místo pro formulář');
});
check('uživatel dopředu VIDÍ, co se odešle',()=>{
  assert(/Odešle se: název obchodu, datum/.test(src),'neříká, co odchází');
  assert(/názvy a ceny/.test(src),'zamlčuje, že jdou i položky');
});
check('fotka se přikládá jen po odklepnutí, nikdy sama',()=>{
  assert(/id="rr_foto"[^>]*type="checkbox"|type="checkbox" id="rr_foto"/.test(src),'chybí zaškrtávátko');
  assert(/const chciFoto = !!\(document\.getElementById\('rr_foto'\)/.test(src),'fotka se posílá bez souhlasu');
});
check('u fotky se říká, co je na ní vidět',()=>{
  assert(/adresa prodejny/.test(src) && /čas nákupu/.test(src),'nevaruje na obsah účtenky');
});
check('bez uložené fotky se zaškrtávátko nenabízí',()=>{
  assert(/Fotka k téhle účtence není uložená/.test(src),'nabízí fotku, kterou nemá');
});
check('snímek se zmenší a má strop velikosti',()=>{
  assert(/RCPT_REPORT_MAX_KB/.test(src),'chybí strop');
  assert(/rrZmensiSnimek/.test(src),'fotka se posílá v originále');
  assert(/toDataURL\('image\/jpeg', 0\.7\)/.test(src),'nekomprimuje');
});
check('přes strop se snímek raději vynechá, než aby zápis spadl',()=>{
  assert(/if\(snimek && snimek\.length > RCPT_REPORT_MAX_KB \* 1024\) snimek = null;/.test(src),'chybí pojistka');
});
check('odesílají se čísla potřebná k ladění promptu',()=>{
  ['printedTotal','itemsSum','subtotal','rozdil','pocetPolozek','polozky'].forEach(k=>
    assert(new RegExp(k+':').test(src),'chybí pole '+k));
});
check('položky jsou omezené, ať zápis nenaroste bez hranic',()=>{
  assert(/\.slice\(0,80\)/.test(src),'posílá neomezený počet položek');
});
check('nepřihlášený uživatel hlášení neodešle',()=>{
  assert(/if\(!uid \|\| !token\) throw new Error\('nepřihlášen'\)/.test(src),'chybí kontrola přihlášení');
});
check('selhání se uživateli řekne, netváří se jako úspěch',()=>{
  assert(/Hlášení se nepodařilo odeslat/.test(src),'selhání je tiché');
});

console.log('\n── Firebase pravidla ──');
check('uzel receipt_reports existuje',()=>{
  assert(/"receipt_reports"/.test(rules),'uzel chybí – zápis by pravidla odmítla');
});
check('čte jen admin, píše přihlášený do SVÉHO podstromu',()=>{
  const i=rules.indexOf('"receipt_reports"');
  const usek=rules.slice(i,i+520);
  assert(/"\.read": "auth\.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'"/.test(usek),'čte kdokoli');
  assert(/auth\.uid === \$uid/.test(usek),'uživatel může psát do cizího podstromu');
});

console.log('\n── Diagnostika nenačteného skriptu ──');
check('každý lokální skript má onerror',()=>{
  //  v10.74: volání je obalené `window._ffScriptFail && ...` – bez toho spadlo
  //  na ReferenceError, když skript selhal dřív, než doběhl inline blok.
  const celkem=(html.match(/<script src="js\//g)||[]).length;
  const hlidane=(html.match(/onerror="window\._ffScriptFail/g)||[]).length;
  assert(celkem>0 && celkem===hlidane, hlidane+' z '+celkem+' skriptů hlídáno');
});
check('hláška řekne KTERÝ soubor chybí',()=>{
  assert(/Nenačetl se soubor: /.test(html),'chybí konkrétní jméno souboru');
  assert(/chybí na serveru/.test(html),'neřekne, co s tím');
});
check('zachytí i případ, kdy server vrátí HTML místo JS',()=>{
  assert(/Invalid or unexpected token/.test(html),'nezachytí parse chybu');
  assert(/addEventListener\('error'/.test(html),'chybí globální záchyt');
});
check('diagnostika běží PŘED prvním skriptem',()=>{
  assert(html.indexOf('_ffMissingScripts') < html.indexOf('<script src="js/helpers.js'),
    'diagnostika se načte až po skriptech, které má hlídat');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ HLÁŠENÍ A DIAGNOSTIKA OVĚŘENY');
process.exit(fails?1:0);
