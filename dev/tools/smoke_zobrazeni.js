// S25 (v11.28) – chyby zobrazení na mobilu:
//  1) scroll v okně přetekl na stránku → adresní řádek zmizel a pozadí okna zůstalo kratší
//  2) po otočení telefonu Chrome zvětšil písmo → štítky kategorií se lámaly na 2 řádky
const fs=require('fs'),path=require('path');
const find=f=>{for(const d of ['.','js','css','../js','../css','..']){const p=path.join(__dirname,d,f);if(fs.existsSync(p))return p;}throw new Error('nenalezeno '+f)};
const css=fs.readFileSync(find('styles.css'),'utf8'), imp=fs.readFileSync(find('import.js'),'utf8');
let fails=0;const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};
console.log('── S25 · zobrazení na mobilu ──');
check('html zakazuje automatické zvětšení písma',()=>assert(/html\{[^}]*text-size-adjust:100%/.test(css)));
check('otevřené okno zamkne stránku',()=>assert(css.includes('html:has(.overlay.open)')&&/html:has\(\.overlay\.open\)[^{]*\{overflow:hidden\}/.test(css)));
check('okno nepouští scroll dál (overscroll contain)',()=>assert(/\.modal\{[^}]*overscroll-behavior:contain/.test(css)));
check('okno používá dvh (dynamická výška)',()=>assert(/\.modal\{[^}]*92dvh/.test(css)));
check('štítek kategorie se nezalomí',()=>assert(/\.cat-chip\{[^}]*white-space:nowrap/.test(css)));
check('resize nepřekresluje při změně jen výšky',()=>{
  assert(!imp.includes("window.addEventListener('resize',()=>renderPage());"),'starý handler');
  const sb={renderPage(){sb.n++},n:0,window:{innerWidth:400,addEventListener(e,f){sb.h=f}}};
  const i=imp.indexOf('let _ffLastW'),j=imp.indexOf('\n',imp.indexOf("window.addEventListener('resize'",i));
  require('vm').runInNewContext(imp.slice(i,j),sb);
  sb.h(); assert(sb.n===0,'stejná šířka → nic'); sb.window.innerWidth=800; sb.h(); assert(sb.n===1,'nová šířka → překreslit');
});

// detail vozidla čitelnější + barevná tlačítka měřidla
{ const voz=fs.readFileSync(find('vozidla.js'),'utf8'), mer=fs.readFileSync(find('meridla.js'),'utf8');
  const det=voz.slice(voz.indexOf('function vozidloDetail('),voz.indexOf('function vozidloDetailZavri'));
  check('detail vozidla: žádné písmo pod .72rem, šířka 1100px',()=>assert(!/font-size:\.(5|6|70)\d*rem/.test(det)&&det.includes('max-width:1100px')));
  check('graf: sloupec max 64px, popisek .7rem',()=>assert(voz.includes('max-width:64px')&&!voz.includes('font-size:.5rem;color:#8b93ad;margin-top:2px')));
  check('měřidla: Uložit zeleně, Smazat červeně s bílým textem',()=>assert(/background:#22c55e[^"]*" onclick="merUlozMeridlo/.test(mer)&&/background:#dc2626;color:#fff[^"]*" onclick="merSmazMeridlo/.test(mer)));
}
console.log(fails?`❌ ${fails} selhalo`:'✅ vše prošlo'); process.exit(fails?1:0);