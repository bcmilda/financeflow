// FinanceFlow · v12.45 · pruvodce.js · 2026-11-13
// ══════════════════════════════════════════════════════
//  S29 (v12.45, Milan): 🧭 PRŮVODCE APLIKACÍ
//  „Aplikace se komplikuje a má mnoho zákoutí. Proto by bylo dobré udělat nějakého průvodce používání
//  aplikace – co funguje, co udělat na začátku, nastavit peněženky a úvěry, používat skener…“
//  „V návodu je potřeba popis, příklady, přesměrování a návaznost na další karty.“
//  Návrh: plátno „Průvodce aplikací – návrh“ (13. 11.). Milan: menu nahoře v Přehledu; odkazy „?“ z karet NE.
//
//  cesta: Přehled → 🧭 Průvodce (rozcestník → kapitola) · Dashboard → 🚀 Začínáme (ui.js renderOnboardingCard)
//
//  Kapitola: Co to je · Proč · Příklad (s čísly) · Jak na to (kroky s cestou) · Otevřít (přesměrování na kartu
//  nebo rovnou do formuláře, cílový prvek se zvýrazní) · Časté chyby · Navazuje (další kapitoly).
//  Po „Otevřít“ drží lišta dole „‹ Zpět do návodu“. Přečtené kapitoly: S.uiCfg.pruvodce.p (synchronizuje se).
//  Texty odpovídají kódu v12.45 – při změně formuláře nebo cesty uprav i kapitolu (smoke_pruvodce.js hlídá,
//  že každá stránka a cílový prvek existují).
// ══════════════════════════════════════════════════════

//  Otevření formuláře transakce s typem (a režimem přesunu)
function _prTx(typ, rezim) {
  return () => {
    if (typeof openAddTx !== 'function') return;
    openAddTx();
    if (typ && typeof setTxType === 'function') setTxType(typ);
    if (rezim && typeof setTransferMode === 'function') setTransferMode(rezim);
  };
}

const PRUVODCE = [
  { id: 'zaciname', c: '1', nazev: 'Začínáme', popis: 'Co nastavit hned na začátku, aby čísla seděla.', kap: [
    { id: 'penezenky', nazev: 'Peněženky a zůstatek ke dni', cesta: 'Správa → Peněženky',
      co: 'Peněženka je každé místo, kde máš peníze: běžný účet, hotovost, spořicí účet, kreditní karta, investice. Každá transakce z nějaké peněženky odchází nebo do ní přichází.',
      proc: 'Bez zůstatku appka ví jen, kolik jsi utratil, ale ne kolik máš. Zůstatek potřebuje Dashboard, Finanční radar, Finanční obraz i skóre.',
      priklad: { text: 'V bankovní aplikaci vidíš dnes večer <b>24 350 Kč</b>. Do FinanceFlow zadáš zůstatek 24 350 Kč <b>ke dni</b> dnešního data.',
        radky: [['Zůstatek ke dni (dnes)', '24 350 Kč'], ['Pak importuješ výpis za minulý měsíc', 'historie se dopočítá'], ['Zůstatek dnes', 'pořád 24 350 Kč']],
        pozn: 'Starší transakce zůstatek ke dni nezmění. Appka z nich jen dopočítá, kolik jsi měl dřív.' },
      kroky: ['Otevři <b>Správa → Peněženky</b> a klepni <b>+ Přidat</b>.',
        'Vyplň název, typ (Běžný účet, Hotovost, Spořicí účet…) a měnu.',
        'Do <b>Zůstatek · ke dni</b> napiš částku z banky a dnešní datum.',
        'Opakuj pro hotovost, spořicí účet a kartu. Účet v eurech založ s měnou EUR.'],
      otevrit: [{ label: 'Otevřít Peněženky', page: 'penezenky', cil: '#page-penezenky button[onclick="openWalletModal()"]' }],
      chyby: ['Výběr z bankomatu zapsaný jako výdaj. Je to <b>přesun</b> z účtu do Hotovosti, peníze jsi neutratil.',
        'Zůstatek po čase nesedí: chybí nějaká transakce. Zadej znovu skutečný stav s dnešním datem.',
        'Zůstatek bez data = stav před všemi transakcemi, ne dnešní.'],
      navazuje: ['bankomat', 'presun', 'importBanka', 'mena'] },
    { id: 'vyplata', nazev: 'Den výplaty a rezerva', cesta: 'Správa → Nastavení → Den výplaty, Nedotknutelná rezerva',
      co: 'Den výplaty je začátek tvého finančního cyklu. Nedotknutelná rezerva je částka, se kterou appka při počítání denního limitu nepočítá.',
      proc: 'Podle dne výplaty appka počítá „od výplaty k výplatě“: kolik můžeš denně utratit, aby peníze vydržely (Finanční radar → Do výplaty, Příští měsíc).',
      priklad: { text: 'Výplata chodí <b>15.</b>, dnes je 1. a na účtu máš 18 000 Kč. Rezervu sis nastavil na <b>5 000 Kč</b>.',
        radky: [['K utracení do výplaty', '18 000 − 5 000 = 13 000 Kč'], ['Dní do výplaty', '14'], ['Denně můžeš utratit', 'asi 930 Kč']],
        pozn: 'Čísla jsou ilustrační; skutečný výpočet bere i platby, které tě do výplaty čekají.' },
      kroky: ['Otevři <b>Nastavení</b> a najdi <b>Den výplaty</b>.',
        'Vyber den v měsíci. „Automaticky (z transakcí)“ nech, jen když výplata chodí pokaždé jindy.',
        'U <b>Frekvence výplaty</b> vyber, jak často chodí (měsíčně, 14 dní, záloha + doplatek…).',
        'Do <b>Nedotknutelná rezerva</b> napiš částku, na kterou nechceš sáhnout.'],
      otevrit: [{ label: 'Otevřít Nastavení', page: 'nastaveni', cil: '#settingFirstDay' }],
      chyby: ['Výplata není v kategorii označené jako ⭐ Hlavní zdroj příjmů – appka pak bere největší příjem měsíce, i jednorázový.',
        'Rezerva vyšší než zůstatek: denní limit vyjde nula.'],
      navazuje: ['radar', 'pristi', 'kategorie'] },
    { id: 'pujcky', nazev: 'Půjčky a úvěry', cesta: 'Majetek → Půjčky',
      co: 'Evidence toho, co dlužíš: spotřebitelský úvěr, hypotéka, kreditní karta, půjčka od známého. Ke každé půjčce zbývající dluh, úrok a splátka.',
      proc: 'Bez půjček Finanční skóre nezná zadluženost a vynechá ji. Splátky se pak ukážou v Budoucích platbách, Příštím měsíci i v reportu.',
      priklad: { text: 'Máš spotřebák: půjčeno <b>150 000 Kč</b>, podle výpisu k 1. 11. zbývá <b>96 400 Kč</b>, úrok 8,9 %, splátka 4 200 Kč měsíčně.',
        radky: [['Zbývá ke dni 1. 11.', '96 400 Kč'], ['Splátka 15. 11. (jistina 3 485 Kč + úrok 715 Kč)', '−3 485 Kč'], ['Zbývá po splátce', '92 915 Kč']],
        pozn: 'Zbývající dluh snižuje jen jistina, úrok ne.' },
      kroky: ['Otevři <b>Majetek → Půjčky</b> a klepni <b>+ Přidat půjčku</b>.',
        'Vyber typ, vyplň název, věřitele a <b>Půjčeno – jistina</b>.',
        'Do <b>Zbývá (Kč) · ke dni</b> napiš zbytek dluhu z výpisu banky a datum, ke kterému platí.',
        'Doplň úrok, frekvenci a výši splátky. Poplatky a pojištění vyplň, chceš-li vidět RPSN.'],
      otevrit: [{ label: 'Otevřít Půjčky', page: 'dluhy', cil: '#page-dluhy button[onclick="openDebtModal()"]' }],
      chyby: ['Splátka zapsaná jako běžný výdaj – zbývající dluh se pak nesníží. Zapiš ji jako <b>Dluh/Splátka</b>.',
        'Zbývá bez data: appka neví, které splátky už v čísle jsou.'],
      navazuje: ['splatky', 'sablony', 'budouci'] },
    { id: 'sablony', nazev: 'Pravidelné platby (šablony)', cesta: 'Správa → Opakované šablony',
      co: 'Šablona je platba, která se opakuje: nájem, telefon, předplatné, záloha na energie, pojištění, výplata.',
      proc: 'S „Automatickým vytvářením transakcí“ se platba zapíše sama v den splatnosti. Budoucí platby a Příští měsíc z šablon vědí, co tě čeká.',
      priklad: { text: 'Pojištění domácnosti <b>1 500 Kč čtvrtletně</b>, první platba 15. 8.',
        radky: [['15. 11.', 'zapíše se samo'], ['Do té doby v Transakcích', '📅 naplánováno'], ['Další platba', '15. 2.']],
        pozn: 'Měsíční i čtvrtletní, roční a týdenní šablony se zapisují v den splatnosti (od v12.44).' },
      kroky: ['Otevři <b>Správa → Opakované šablony</b> a klepni <b>+ Přidat</b>.',
        'Vyber typ (Výdaj, Příjem, Přesun, Dluh/Splátka), název, částku, peněženku a kategorii.',
        'Vyber frekvenci. U měsíční zadej den v měsíci, u čtvrtletní, roční a týdenní <b>První platbu (splatnost)</b>.',
        'Zaškrtni <b>Automatické vytváření transakcí</b>.'],
      tip: 'Šablonu založíš i rovnou z transakce: Transakce → + → Výdaj → 🔁 Opakovaná platba.',
      otevrit: [{ label: 'Otevřít Opakované šablony', page: 'sablony', cil: '#page-sablony button[onclick="openSablonaModal()"]' }],
      chyby: ['Čtvrtletní nebo roční šablona bez data první platby se nezapisuje (v seznamu ⚠️ doplň datum první platby).',
        'Stejnou platbu zapíšeš ručně pod jiným názvem – appka ji nepozná a zapíše ji i ze šablony.'],
      navazuje: ['budouci', 'pristi', 'zapis'] },
    { id: 'kategorie', nazev: 'Kategorie, charakter a limity', cesta: 'Správa → Kategorie',
      co: 'Kategorie třídí příjmy a výdaje (Bydlení, Jídlo & Nákupy, Doprava…). Každá může mít podkategorie, charakter výdaje a limit.',
      proc: 'Charakter (pravidelný, variabilní, nepravidelný) a limity používá Finanční skóre, Detektor úspor a rozpočet. U příjmů stabilita říká Příštímu měsíci, s čím počítat.',
      priklad: { text: 'Kategorie <b>Jídlo & Nákupy</b>: charakter Variabilní, limit <b>25 %</b> ze základu příjmu.',
        radky: [['Základ příjmu', '40 000 Kč'], ['Limit kategorie (25 %)', '10 000 Kč'], ['Utraceno tento měsíc', '7 800 Kč – v limitu']] },
      kroky: ['Otevři <b>Správa → Kategorie</b> a klepni na kategorii.',
        'Nastav <b>Charakter výdaje</b> (aspoň u 3 hlavních kategorií).',
        'U výplaty zaškrtni <b>⭐ Hlavní zdroj příjmů</b>.',
        'Limity nastavíš ručně v <b>💚 Limit finančního zdraví</b>, nebo najednou z Dashboardu (Začínáme → Nastav limity kategorií).'],
      otevrit: [{ label: 'Otevřít Kategorie', page: 'kategorie', cil: '#addCatBtn' }],
      chyby: ['Výplata bez ⭐ Hlavní zdroj příjmů – „od výplaty k výplatě“ se pak řídí největším příjmem, i jednorázovým.'],
      navazuje: ['vyplata', 'tagy', 'zapis'] },
  ] },
  { id: 'kazdyden', c: '2', nazev: 'Každý den', popis: 'Zápis výdajů a příjmů, účtenky, import z banky.', kap: [
    { id: 'zapis', nazev: 'Výdaj a příjem', cesta: 'Transakce → + (zelené tlačítko vpravo dole)',
      co: 'Ruční zápis platby: výdaj, příjem, přesun mezi peněženkami, nebo splátka dluhu.',
      proc: 'Každá transakce se promítne do zůstatku peněženky, rozpočtu, skóre a reportu.',
      priklad: { text: 'Oběd za <b>189 Kč</b> kartou z běžného účtu.',
        radky: [['Typ', '💸 Výdaj'], ['Kategorie › podkategorie', 'Jídlo & Pití › Restaurace'], ['Peněženka · typ platby', 'Běžný účet · Platební karta']] },
      kroky: ['V <b>Transakcích</b> klepni na zelené <b>+</b>.',
        'Vyber typ: 💰 Příjem, 💸 Výdaj, 🔴 Dluh/Splátka nebo ↔️ Přesun.',
        'Vyplň datum, částku, kategorii a podkategorii, peněženku a typ platby.',
        'Volitelně: poznámka, 🏷️ tagy, 🔗 propojení s jinou transakcí, 🔁 opakovaná platba.'],
      otevrit: [{ label: 'Zapsat výdaj', akce: _prTx('expense') }],
      chyby: ['Převod na vlastní spořicí účet zapsaný jako výdaj – je to ↔️ Přesun.', 'Splátka půjčky jako výdaj – je to 🔴 Dluh/Splátka.'],
      navazuje: ['uctenka', 'presun', 'splatky', 'tagy'] },
    { id: 'uctenka', nazev: 'Skener a editor účtenky', cesta: 'AI Asistent → Analýza účtenek → 📸 Skenovat',
      co: 'Vyfotíš účtenku a appka z ní rozepíše položky, ceny, slevy a kategorie. Výsledek zkontroluješ v editoru a uložíš jako jednu transakci.',
      proc: 'Z účtenek appka sleduje ceny výrobků, tvoji vlastní inflaci, Nákupní DNA a živiny. Výdaj se rozdělí podle kategorií položek.',
      priklad: { text: 'Účtenka z Penny za <b>56,96 Kč</b>: 2× Krajanka jogurt 29 Kč, mrkev 1,518 kg se slevou 1,52 Kč.',
        radky: [['Mrkev: zaplaceno', '18,06 Kč'], ['Cena před slevou', '19,58 Kč (−8 %)'], ['Transakce', 'jedna, 56,96 Kč, rozdělená podle kategorií']] },
      kroky: ['Otevři <b>Analýza účtenek</b> a klepni <b>📸 Skenovat</b>. Vyfoť celou účtenku, dlouhou po částech.',
        'V editoru zkontroluj obchod, datum a peněženku nahoře.',
        'U položek: <b>Název</b> (návrh AI nebo tvůj), <b>🧾 z účtenky</b> (klíč pro příští rozpoznání, oprav jen špatně přečtený text), kategorie, sleva.',
        'Klepni 📷 u balené položky a vyfoť čárový kód – appka zjistí přesný výrobek a pozná ho i v jiných obchodech.',
        'Ulož <b>💾 Uložit změny</b>.'],
      tip: 'Free má 3 skeny měsíčně. Starší účtenky najdeš v 📋 Historie → ✎.',
      otevrit: [{ label: 'Otevřít Analýzu účtenek', page: 'uctenky', premium: true }],
      chyby: ['Přepsaný text „z účtenky“ na hezký název – příští nákup se pak nespáruje. Hezký název patří do pole Název.',
        'Účtenka uložená do špatné peněženky – zůstatek pak nesedí. Peněženku zkontroluj nahoře v editoru.'],
      navazuje: ['tagy', 'zapis', 'cashback'] },
    { id: 'importBanka', nazev: 'Import z banky a výpisy', cesta: 'Import dat → 📥 Import dat · 📱 Import z banky',
      co: 'Dvě cesty: <b>📥 Import dat</b> nahraje výpis z banky (CSV, Excel, PDF) a <b>📱 Import z banky</b> rozpozná text notifikace nebo SMS (nebo je bere z telefonu přes appku FinanceFlow Inbox).',
      proc: 'Nemusíš zapisovat každou platbu ručně. Starší výpisy doplní historii, zůstatek ke dni přitom zůstane.',
      priklad: { text: 'Notifikace „George: Platba kartou 450 Kč Shell | Zůstatek 8 200 Kč“.',
        radky: [['Rozpoznáno', 'výdaj 450 Kč, Shell'], ['Kategorie (návrh)', 'Auto › Palivo'], ['Stav', 'čeká na potvrzení']] },
      kroky: ['Výpis: <b>Import dat → 📥 Import dat</b> → 📊 Import z CSV / Excel (rychlejší) nebo 📄 Import z PDF výpisu.',
        'Notifikace: <b>📱 Import z banky</b> → vlož text → 🔍 Rozpoznat transakce.',
        'Zkontroluj náhled a kategorie a potvrď.'],
      otevrit: [{ label: 'Otevřít Import dat', page: 'import' }, { label: 'Otevřít Import z banky', page: 'smsimport' }],
      chyby: ['Výběr z bankomatu z výpisu potvrzený jako výdaj – má to být přesun do Hotovosti.', 'Notifikace k platbě, kterou už máš naskenovanou: v 📥 Doručené potvrď spojení s účtenkou, ne novou transakci.'],
      navazuje: ['penezenky', 'bankomat', 'uctenka'] },
    { id: 'tagy', nazev: 'Tagy a sledovaná témata', cesta: 'Analýzy → Statistiky → ⭐ Sledovaná témata · Přehled → 🏷️ Tagy',
      co: '<b>🏷️ Tagy</b> jsou tvoje značky k platbám (#dovolená, #auto). <b>⭐ Sledovaná témata</b> sčítají věci napříč kategoriemi a obchody (káva, pivo, McDonald’s).',
      proc: 'Kategorie se nemění – téma i tag jsou jen značka. Uvidíš, kolik tě stojí káva, ať ji koupíš v supermarketu, kavárně nebo na benzínce.',
      priklad: { text: 'Téma <b>☕ Káva</b>: balená káva z Lidlu (položka účtenky) + 3× kavárna (celé platby).',
        radky: [['Položka z Lidlu', '189 Kč'], ['Kavárna 3×', '237 Kč'], ['Káva za měsíc', '426 Kč']],
        pozn: 'Označíš-li jednou „Pilsner 0,5 l“ jako pivo, příště se označí sám.' },
      kroky: ['Založ téma: <b>Statistiky → ⭐ Sledovaná témata → ＋ Téma</b>.',
        'U položky účtenky klepni ⭐ v editoru účtenky; u celé platby Transakce → Upravit → ⭐ Téma.',
        'Tag přidáš ve formuláři transakce v poli 🏷️ TAGY, u položek účtenky přes # (víc položek najednou: ☑ Vybrat).'],
      otevrit: [{ label: 'Otevřít Statistiky', page: 'statistiky' }, { label: 'Otevřít Tagy', page: 'tagy' }],
      chyby: ['Celá platba i její položky ve stejném tématu – appka počítá jen jedno z toho, nic dvakrát.'],
      navazuje: ['uctenka', 'kategorie'] },
  ] },
  { id: 'pohyb', c: '3', nazev: 'Peníze v pohybu', popis: 'Když peníze nezmizí, jen se přesunou.', kap: [
    { id: 'presun', nazev: 'Přesun mezi peněženkami', cesta: 'Transakce → + → ↔️ Přesun → Mezi peněženkami',
      co: 'Převod peněz mezi tvými vlastními peněženkami: z běžného účtu na spořicí, doplnění Revolutu, splátka kreditky z účtu.',
      proc: 'Přesun není výdaj: celkový majetek se nezmění, peníze se jen přesunou. Výdaje a rozpočet zůstanou čisté.',
      priklad: { text: 'Pošleš <b>5 000 Kč</b> z běžného účtu na spořicí.',
        radky: [['Běžný účet', '−5 000 Kč'], ['Spořicí účet', '+5 000 Kč'], ['Výdaje měsíce', 'beze změny']] },
      kroky: ['Transakce → <b>+</b> → <b>↔️ Přesun</b> → <b>Mezi peněženkami</b>.', 'Vyber Z peněženky a Do peněženky, zadej částku a datum.', 'Ulož.'],
      tip: 'Převod uděláš i přímo na stránce Správa → Peněženky v kartě 🔄 Převod mezi peněženkami.',
      otevrit: [{ label: 'Zapsat přesun', akce: _prTx('transfer', 'wallets') }],
      chyby: ['Převod zapsaný jako výdaj a příjem zvlášť – výdaje i příjmy se tím nafouknou.'],
      navazuje: ['bankomat', 'investice', 'penezenky'] },
    { id: 'bankomat', nazev: 'Výběr z bankomatu', cesta: 'Transakce → + → ↔️ Přesun → Mezi peněženkami',
      co: 'Výběr hotovosti je přesun z účtu do peněženky Hotovost. Výdajem je až to, za co hotovost utratíš.',
      proc: 'Kdyby byl výběr výdajem, každý nákup za hotovost by se počítal dvakrát.',
      priklad: { text: 'Vybereš <b>2 000 Kč</b> a v hospodě zaplatíš <b>450 Kč</b>.',
        radky: [['Přesun Běžný účet → Hotovost', '2 000 Kč (není výdaj)'], ['Výdaj z Hotovosti: Hospoda', '450 Kč'], ['Hotovost zbývá', '1 550 Kč']] },
      kroky: ['Transakce → <b>+</b> → <b>↔️ Přesun</b> → <b>Mezi peněženkami</b>.', 'Z peněženky: Běžný účet · Do peněženky: <b>Hotovost</b>.', 'Výdaje z hotovosti pak zapisuj s peněženkou Hotovost.'],
      otevrit: [{ label: 'Zapsat výběr', akce: _prTx('transfer', 'wallets') }],
      chyby: ['Nemáš peněženku Hotovost – nejdřív ji založ (Správa → Peněženky).'],
      navazuje: ['presun', 'penezenky', 'importBanka'] },
    { id: 'investice', nazev: 'Investice a spoření', cesta: 'Transakce → + → ↔️ Přesun → 📈 Do investic & spoření',
      co: 'Peníze odejdou z peněženky do investice nebo spoření (penzijko, ETF, stavebko, rezerva). Není to výdaj – majetek se jen přesune.',
      proc: 'Vklad se přičte k aktivu v <b>💎 Finanční aktiva</b> a ukáže se v kartě „Moje úspory a investice“ na Dashboardu.',
      priklad: { text: 'Měsíčně posíláš <b>1 000 Kč</b> na penzijní spoření.',
        radky: [['Běžný účet', '−1 000 Kč'], ['Aktivum Penzijní spoření', '+1 000 Kč'], ['Výdaje měsíce', 'beze změny']] },
      kroky: ['Transakce → <b>+</b> → <b>↔️ Přesun</b> → <b>📈 Do investic & spoření</b>.', 'Vyber Z peněženky, KAM (investice / spoření) a podkategorii – podle ní se vklad přiřadí k aktivu.', 'Pravidelný vklad ulož jako šablonu (typ Přesun).'],
      otevrit: [{ label: 'Zapsat vklad', akce: _prTx('transfer', 'assets') }, { label: 'Otevřít Finanční aktiva', page: 'aktiva' }],
      chyby: ['Vklad zapsaný jako výdaj – výdaje se nafouknou a investice nepřibude.'],
      navazuje: ['presun', 'sablony', 'mena'] },
    { id: 'mena', nazev: 'Cizí měna', cesta: 'Správa → Peněženky → měna peněženky',
      co: 'Peněženka může být v EUR, USD, PLN a dalších měnách. Transakce z ní zapisuješ v její měně.',
      proc: 'Součty a statistiky appka přepočítá na Kč kurzem ČNB ke dni transakce. Kurz se u transakce zafixuje.',
      priklad: { text: 'Z eurové peněženky zaplatíš <b>12,50 €</b>.',
        radky: [['Částka', '12,50 €'], ['Kurz ČNB ke dni (ilustrační)', '25,20 Kč/€'], ['Ve výdajích', '315 Kč']] },
      kroky: ['Založ peněženku s měnou, např. EUR.', 'Ve formuláři transakce vyber tuto peněženku – částka se zadává v eurech.', 'Pole v Kč je předvyplněné kurzem ČNB; uprav ho podle skutečně stržené částky.'],
      otevrit: [{ label: 'Otevřít Peněženky', page: 'penezenky' }],
      chyby: ['Platba v eurech zapsaná do korunové peněženky jako 12,50 Kč.'],
      navazuje: ['penezenky', 'presun'] },
    { id: 'cashback', nazev: 'Cashback a vrácení peněz', cesta: 'Transakce → + → 💰 Příjem → kategorie Cashback',
      co: 'Cashback, bonus za nákup nebo vrácené peníze za reklamaci zapisuješ jako <b>příjem</b> v kategorii Cashback.',
      proc: 'Původní výdaj se nemění – peníze jsi nejdřív zaplatil a vrátily se až později. Statistiky a reporty tak zůstanou přesné.',
      priklad: { text: 'Vrátíš sluchátka za <b>500 Kč</b>, peníze přijdou za týden.',
        radky: [['1. 11. výdaj Alza', '−500 Kč'], ['8. 11. příjem Cashback › Vrácení peněz', '+500 Kč'], ['🔗 Propojeno', 'vidíš, ke kterému nákupu patří']] },
      kroky: ['Transakce → <b>+</b> → <b>💰 Příjem</b> → kategorie <b>Cashback</b> a podkategorie.', 'Klepni <b>🔗 Propojit s jinou transakcí</b> a vyber původní nákup (jde už při zápisu).', 'Ulož.'],
      otevrit: [{ label: 'Zapsat příjem', akce: _prTx('income') }],
      chyby: ['Vratka zapsaná jako záporný výdaj – původní nákup by zmizel ze statistik.'],
      navazuje: ['zapis', 'uctenka'] },
  ] },
  { id: 'planovani', c: '4', nazev: 'Dluhy a plánování', popis: 'Splátky a co tě čeká v dalších týdnech.', kap: [
    { id: 'splatky', nazev: 'Splátka, úrok a RPSN', cesta: 'Transakce → + → 🔴 Dluh/Splátka',
      co: 'Splátku půjčky zapisuješ jako <b>Dluh/Splátka</b> s vybranou půjčkou. Appka ji rozdělí na jistinu a úrok.',
      proc: 'Zbývající dluh snižuje jen jistina. RPSN počítá i poplatky a pojištění ze smlouvy, takže uvidíš skutečnou cenu půjčky.',
      priklad: { text: 'Zbývá <b>96 400 Kč</b>, úrok 8,9 % ročně, splátka <b>4 200 Kč</b>.',
        radky: [['Úrok za měsíc (96 400 × 8,9 % ÷ 12)', '715 Kč'], ['Jistina', '4 200 − 715 = 3 485 Kč'], ['Zbývá po splátce', '92 915 Kč']] },
      kroky: ['Transakce → <b>+</b> → <b>🔴 Dluh/Splátka</b>.', 'Vyber půjčku, zadej částku a datum.', 'Pravidelnou splátku ulož jako šablonu typu Dluh/Splátka – zapíše se sama.'],
      otevrit: [{ label: 'Zapsat splátku', akce: _prTx('debt') }, { label: 'Otevřít Půjčky', page: 'dluhy' }],
      chyby: ['Splátka zapsaná jako výdaj – zbývající dluh zůstane stejný.'],
      navazuje: ['pujcky', 'sablony', 'budouci'] },
    { id: 'budouci', nazev: 'Budoucí platby', cesta: 'Přehled → 🗓️ Budoucí platby',
      co: 'Seznam plateb, které tě čekají: šablony, splátky, narozeniny a cíle, seřazené podle data.',
      proc: 'Uvidíš dopředu, kdy odejde nájem, pojistka nebo splátka, a nepřekvapí tě.',
      priklad: { text: 'Za 30 dní tě čeká:',
        radky: [['15. 11. Pojištění domácnosti', '−1 500 Kč'], ['20. 11. Splátka spotřebáku', '−4 200 Kč'], ['1. 12. Nájem', '−12 000 Kč']] },
      kroky: ['Otevři <b>Přehled → 🗓️ Budoucí platby</b>.', 'Platby sem přidáváš přes šablony, půjčky, narozeniny a cíle.', 'Ruční šablonu zapíšeš tlačítkem <b>Zaznamenat</b> u platby.'],
      otevrit: [{ label: 'Otevřít Budoucí platby', page: 'budouci' }],
      chyby: ['Čtvrtletní platba bez data první platby se ukáže ve špatném měsíci.'],
      navazuje: ['sablony', 'pristi', 'radar'] },
    { id: 'pristi', nazev: 'Příští měsíc', cesta: 'Plánování → 📅 Příští měsíc',
      co: 'Předpověď příštího měsíce: příjmy a výdaje s daty a průběžný zůstatek den po dni.',
      proc: 'Odpoví na otázku „vyjdu do výplaty?“. Rozlišuje jisté platby (šablony, splátky) a pravděpodobné (pravidelný příjem podle historie).',
      priklad: { text: 'Výplata přijde 15., nájem odchází 1.',
        radky: [['1. 12. zůstatek', '6 200 Kč'], ['1. 12. nájem', '−12 000 Kč → −5 800 Kč'], ['15. 12. výplata', '+38 000 Kč']],
        pozn: 'Záporný zůstatek před výplatou ti ukáže dopředu, že je potřeba přesun ze spořicího účtu.' },
      kroky: ['Otevři <b>Plánování → 📅 Příští měsíc</b>.', 'Zkontroluj tabulky Příjmy a Výdaje a graf zůstatku.', 'Chybí-li pravidelná platba, založ šablonu; chybí-li příjem, nastav stabilitu kategorie.'],
      otevrit: [{ label: 'Otevřít Příští měsíc', page: 'pristi' }],
      chyby: ['Příjmová kategorie bez stability – Příští měsíc neví, jestli s příjmem počítat.'],
      navazuje: ['budouci', 'sablony', 'kategorie'] },
    { id: 'radar', nazev: 'Finanční radar', cesta: 'Plánování → 🎯 Finanční radar',
      co: 'Přehled měsíce den po dni a pohled <b>Do výplaty</b>: kolik ti zbývá a kolik můžeš denně utratit.',
      proc: 'Uvidíš tempo útraty včas – ne až na konci měsíce.',
      priklad: { text: 'Do výplaty zbývá 10 dní a k utracení 6 000 Kč.',
        radky: [['Denní limit', '600 Kč'], ['Utraceno dnes', '240 Kč'], ['Rezerva', 'nedotčená']] },
      kroky: ['Otevři <b>Plánování → 🎯 Finanční radar</b>.', 'Přepni pohled <b>Měsíc</b> / <b>Do výplaty</b>.', 'Den výplaty a rezervu nastavíš v Nastavení.'],
      otevrit: [{ label: 'Otevřít Finanční radar', page: 'radar' }],
      chyby: ['Nenastavený den výplaty – radar ho odhaduje z transakcí.'],
      navazuje: ['vyplata', 'pristi', 'budouci'] },
  ] },
];

//  ── stav ──
let _prKapId = null, _prHledat = '', _prLista = null;
function _prVse() { const v = []; PRUVODCE.forEach(o => o.kap.forEach(k => v.push(Object.assign({ oddil: o }, k)))); return v; }
function _prKap(id) { return _prVse().find(k => k.id === id) || null; }
function _prStav() { const u = (typeof S !== 'undefined' && S.uiCfg) || {}; return (u.pruvodce && u.pruvodce.p) || {}; }
function pruvodcePrecteno(id) { return !!_prStav()[id]; }
function pruvodceOznac(id, ano) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  S.uiCfg = S.uiCfg || {}; S.uiCfg.pruvodce = S.uiCfg.pruvodce || {}; S.uiCfg.pruvodce.p = S.uiCfg.pruvodce.p || {};
  if (ano) S.uiCfg.pruvodce.p[id] = 1; else delete S.uiCfg.pruvodce.p[id];
  if (typeof save === 'function') save();
}
function _prNorm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]*>/g, ' '); }
function pruvodceHledej(q) {
  const n = _prNorm(q).trim(); if (!n) return [];
  const slova = n.split(/\s+/);
  //  shoda v názvu kapitoly první („bankomat“ → Výběr z bankomatu, pak kapitoly, které ho jen zmiňují)
  const vNazvu = k => slova.every(s => _prNorm(k.nazev).includes(s)) ? 0 : 1;
  return _prVse().filter(k => { const t = _prNorm([k.nazev, k.cesta, k.co, k.proc, (k.kroky || []).join(' '), (k.chyby || []).join(' '), k.tip || ''].join(' ')); return slova.every(s => t.includes(s)); })
    .sort((a, b) => vNazvu(a) - vNazvu(b));
}

//  ── render ──
function renderPruvodce() {
  const el = document.getElementById('pruvodceContent'); if (!el) return;
  pruvodceListaSkryj();
  el.innerHTML = _prKapId && _prKap(_prKapId) ? _prKapitolaHTML(_prKap(_prKapId)) : _prRozcestnikHTML();
}
const _prBtn = 'font:inherit;cursor:pointer;border-radius:10px;';
function _prRozcestnikHTML() {
  const vys = pruvodceHledej(_prHledat);
  const kapBtn = k => { const p = pruvodcePrecteno(k.id);
    return `<button onclick="pruvodceKapitola('${k.id}')" style="${_prBtn}font-size:.82rem;min-height:38px;padding:0 11px;border:1px solid ${p ? '#2f7a4d' : 'var(--border2)'};background:var(--surface2);color:${p ? '#86efac' : 'var(--text)'}">${p ? '✓ ' : ''}${k.nazev}</button>`; };
  const nejcastejsi = ['bankomat', 'uctenka', 'splatky'].map(_prKap).filter(Boolean);
  return `
  <div style="max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:12px">
    <div style="font-size:.86rem;color:#a8aec8;line-height:1.5">Co která část umí, proč ji použít a jak. Každý návod tě rovnou přenese na správnou kartu.</div>
    <label style="display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border2);border-radius:12px;padding:0 12px;min-height:46px">
      <span aria-hidden="true">🔍</span>
      <input id="pruvodceHledat" value="${escHtml(_prHledat)}" placeholder="Hledat, např. bankomat, sleva, záloha" aria-label="Hledat v průvodci"
        oninput="_prHledat=this.value;pruvodceVysledky()" style="font:inherit;font-size:.92rem;color:var(--text);background:transparent;border:none;flex:1;min-width:0;padding:10px 0;outline:none">
    </label>
    <div id="pruvodceVysledky">${_prVysledkyHTML(vys)}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span style="font-size:.74rem;color:#a8aec8">Nejčastější:</span>${nejcastejsi.map(kapBtn).join('')}</div>
    ${PRUVODCE.map(o => { const n = o.kap.filter(k => pruvodcePrecteno(k.id)).length;
      return `<div class="card" style="margin:0"><div class="card-body" style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
          <span style="font-size:1rem;font-weight:700"><span style="color:#93c5fd">${o.c}</span> ${o.nazev}</span>
          <span style="font-size:.72rem;color:${n ? '#86efac' : '#a8aec8'};white-space:nowrap">${n ? `${n} z ${o.kap.length} přečteno` : `${o.kap.length} návodů`}</span>
        </div>
        <div style="font-size:.78rem;color:#a8aec8">${o.popis}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${o.kap.map(kapBtn).join('')}</div>
      </div></div>`; }).join('')}
    <div style="font-size:.72rem;color:#8b93ad;text-align:center">Další oddíly (Auto a domácnost, Přehledy, Rodina, Nástroje) přibudou v další verzi.</div>
  </div>`;
}
function _prVysledkyHTML(vys) {
  if (!_prHledat.trim()) return '';
  if (!vys.length) return `<div style="font-size:.8rem;color:#a8aec8">Nic nenalezeno. Zkus jiné slovo.</div>`;
  return `<div style="display:flex;flex-direction:column;gap:6px">${vys.map(k => `<button onclick="pruvodceKapitola('${k.id}')" style="${_prBtn}text-align:left;padding:9px 12px;border:1px solid var(--border2);background:var(--surface);color:var(--text)"><span style="display:block;font-size:.88rem;font-weight:600">${k.nazev}</span><span style="font-size:.72rem;color:#a8aec8">${k.oddil.c} ${k.oddil.nazev} · ${k.cesta}</span></button>`).join('')}</div>`;
}
function pruvodceVysledky() { const e = document.getElementById('pruvodceVysledky'); if (e) e.innerHTML = _prVysledkyHTML(pruvodceHledej(_prHledat)); }

const _prSekce = (nadpis, barva, obsah, styl) => `<div class="card" style="margin:0${styl || ''}"><div class="card-body" style="display:flex;flex-direction:column;gap:8px">
  <span style="font-size:.7rem;font-weight:700;letter-spacing:.06em;color:${barva}">${nadpis}</span>${obsah}</div></div>`;
function _prKapitolaHTML(k) {
  const o = k.oddil, i = o.kap.indexOf(o.kap.find(x => x.id === k.id)), vse = _prVse(), gi = vse.findIndex(x => x.id === k.id);
  const dalsi = vse[gi + 1], p = pruvodcePrecteno(k.id);
  const pr = k.priklad;
  return `
  <div style="max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:12px">
    <nav aria-label="Drobečková navigace" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:.76rem;color:#a8aec8">
      <button onclick="pruvodceKapitola(null)" style="${_prBtn}background:none;border:none;color:#93c5fd;padding:8px 0;font-size:.76rem">‹ Průvodce</button>
      <span aria-hidden="true">›</span><span>${o.c} ${o.nazev}</span><span aria-hidden="true">›</span><span style="color:var(--text)">${i + 1} z ${o.kap.length}</span>
    </nav>
    <div><div style="font-size:1.3rem;font-weight:700;line-height:1.25">${k.nazev}</div><div style="font-size:.76rem;color:#a8aec8;margin-top:4px">cesta: ${k.cesta}</div></div>
    ${_prSekce('CO TO JE', '#93c5fd', `<div style="font-size:.92rem;line-height:1.55">${k.co}</div>`)}
    ${_prSekce('PROČ', '#93c5fd', `<div style="font-size:.92rem;line-height:1.55">${k.proc}</div>`)}
    ${pr ? _prSekce('PŘÍKLAD', '#93c5fd', `<div style="font-size:.92rem;line-height:1.55">${pr.text}</div>
      ${pr.radky ? `<div style="display:flex;flex-direction:column;gap:5px;background:var(--surface2);border-radius:10px;padding:10px;font-size:.84rem">${pr.radky.map(r => `<div style="display:flex;justify-content:space-between;gap:10px"><span style="color:#a8aec8">${r[0]}</span><b style="text-align:right">${r[1]}</b></div>`).join('')}</div>` : ''}
      ${pr.pozn ? `<div style="font-size:.8rem;color:#cbd0e2;line-height:1.45">${pr.pozn}</div>` : ''}`, ';border-color:rgba(96,165,250,.45)') : ''}
    ${_prSekce('JAK NA TO', '#93c5fd', `<ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px">${k.kroky.map((s, j) => `<li style="display:flex;gap:10px"><span style="width:24px;height:24px;border-radius:12px;background:var(--surface3);font-size:.74rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${j + 1}</span><span style="font-size:.88rem;line-height:1.5">${s}</span></li>`).join('')}</ol>
      ${k.tip ? `<div style="font-size:.8rem;color:#cbd0e2;background:var(--surface2);border-radius:9px;padding:8px 10px;line-height:1.45">💡 ${k.tip}</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:6px">${(k.otevrit || []).map((b, j) => `<button onclick="pruvodceOtevri('${k.id}',${j})" style="${_prBtn}font-size:.92rem;font-weight:700;min-height:46px;border:${j ? '1px solid #60a5fa' : 'none'};background:${j ? 'rgba(96,165,250,.12)' : '#60a5fa'};color:${j ? '#bfdbfe' : '#0f1117'}">${b.label} →</button>`).join('')}</div>`)}
    ${(k.chyby || []).length ? _prSekce('ČASTÉ CHYBY', '#fbbf24', `<ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:.86rem;line-height:1.5">${k.chyby.map(c => `<li>${c}</li>`).join('')}</ul>`, ';border-color:rgba(251,191,36,.4)') : ''}
    ${(k.navazuje || []).length ? _prSekce('NAVAZUJE', '#93c5fd', k.navazuje.map(_prKap).filter(Boolean).map(n => `<button onclick="pruvodceKapitola('${n.id}')" style="${_prBtn}text-align:left;display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:46px;padding:6px 10px;border:1px solid var(--border2);background:var(--surface2);color:var(--text)"><span><span style="display:block;font-size:.88rem;font-weight:600">${pruvodcePrecteno(n.id) ? '✓ ' : ''}${n.nazev}</span><span style="font-size:.72rem;color:#a8aec8">${n.cesta}</span></span><span aria-hidden="true" style="color:#93c5fd">›</span></button>`).join('')) : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button onclick="pruvodceOznac('${k.id}',${!p});renderPruvodce()" style="${_prBtn}font-size:.86rem;min-height:46px;border:1px solid ${p ? 'var(--border2)' : '#2f7a4d'};background:${p ? 'var(--surface2)' : 'rgba(74,222,128,.08)'};color:${p ? '#a8aec8' : '#86efac'}">${p ? '↺ Označit jako nepřečtené' : '✓ Mám hotovo'}</button>
      ${dalsi ? `<button onclick="pruvodceKapitola('${dalsi.id}')" style="${_prBtn}font-size:.86rem;font-weight:600;min-height:46px;border:1px solid var(--border2);background:var(--surface3);color:var(--text)">Další: ${dalsi.nazev} ›</button>` : '<span></span>'}
    </div>
  </div>`;
}
function pruvodceKapitola(id) {
  _prKapId = id || null;
  if (typeof curPage !== 'undefined' && curPage !== 'pruvodce') {
    const nav = document.querySelector(`.nav-item[onclick*="showPage('pruvodce'"]`);
    showPage('pruvodce', nav);
  } else renderPruvodce();
  const c = document.querySelector('.content') || document.scrollingElement; try { (c || window).scrollTo(0, 0); window.scrollTo(0, 0); } catch (e) {}
}

//  ── Otevřít: přesměrování + zvýraznění + lišta Zpět do návodu ──
function pruvodceOtevri(id, j) {
  const k = _prKap(id), b = k && (k.otevrit || [])[j || 0]; if (!b) return;
  if (b.page) { const nav = document.querySelector(`.nav-item[onclick*="'${b.page}',this"]`);
    if (b.premium && typeof showPagePremium === 'function') showPagePremium(b.page, nav); else showPage(b.page, nav); }   // Premium stránka jako z menu
  setTimeout(() => {
    try { if (typeof b.akce === 'function') b.akce(); } catch (e) { console.warn('[pruvodce]', e); }
    if (b.cil) { const el = document.querySelector(b.cil);
      if (el) { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
        el.classList.add('pr-zvyraz'); setTimeout(() => el.classList.remove('pr-zvyraz'), 4500); } }
    pruvodceListaUkaz(k);
  }, b.page ? 250 : 0);
}
function pruvodceListaUkaz(k) {
  _prLista = k.id;
  let el = document.getElementById('pruvodceLista');
  if (!el) { el = document.createElement('div'); el.id = 'pruvodceLista'; document.body.appendChild(el); }
  const o = k.oddil, i = o.kap.findIndex(x => x.id === k.id);
  el.innerHTML = `<span style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0">
      <span style="font-size:.7rem;color:#a8aec8">Průvodce · ${o.nazev} ${i + 1} z ${o.kap.length}</span>
      <span style="font-size:.84rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${k.nazev}</span></span>
    <button onclick="pruvodceKapitola('${k.id}')" style="font:inherit;font-size:.82rem;font-weight:700;min-height:44px;padding:0 12px;border-radius:10px;border:none;background:#60a5fa;color:#0f1117;white-space:nowrap;cursor:pointer">‹ Zpět do návodu</button>
    <button onclick="pruvodceListaSkryj()" aria-label="Zavřít lištu průvodce" style="font:inherit;font-size:1.1rem;width:40px;min-height:44px;border:none;background:transparent;color:#a8aec8;cursor:pointer">✕</button>`;
  el.style.display = 'flex';
}
function pruvodceListaSkryj() { _prLista = null; const el = document.getElementById('pruvodceLista'); if (el) el.style.display = 'none'; }

Object.assign(window, { PRUVODCE, renderPruvodce, pruvodceKapitola, pruvodceOtevri, pruvodceOznac, pruvodcePrecteno, pruvodceHledej, pruvodceVysledky, pruvodceListaUkaz, pruvodceListaSkryj });
