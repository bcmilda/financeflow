Po nasazení zkus: vytvoř transakci do kategorie Investice → uvidíš že peněženka klesne, ale výdaje ne. Až budeš chtít fázi 2 (napojení na aktiva + dashboard), dej vědět.

**Nový typ kategorie „Přesun"** vedle Příjem/Výdaj/Oboji. V modalu kategorie 4. možnost „🔄 Přesun (investice, rezerva)" s vysvětlujícím hintem. V seznamu kategorií nová skupina „🔄 Přesuny (investice, rezerva, spoření)".

### K tvému návrhu přepínače

Zvolil jsem **rozšíření Runway přes nastavení frekvence** místo samostatné záložky – Runway už má přepínač Měsíc/Do výplaty a frekvence k němu přirozeně patří. Nepravidelný režim funguje automaticky jakmile zvolíš „Nepravidelně". Méně tlačítek, čistší. Pokud bys chtěl ještě vizuální přepínač přímo v radaru (ne jen v Nastavení), můžu doplnit.

Vyzkoušej: Nastavení → Frekvence výplaty → zvol týdně/nepravidelně, pak Bank → Do výplaty. Cyklus se přepočítá. Až otestuješ tohle i přesuny, dej vědět – nebo jdeme na fázi 2 (napojení přesunů na aktiva).

### Odpovědi na dotazy

**1. Sdílená karta Bydlení** – „sdílené" **nesouvisí s COICOP**. Je to vztah `shared` = kategorie sdílí téma s jinou. Bydlení je označené proto, že **Pojištění** má nastaveno „sdílím s Bydlením a Auto" (`shared:['cat3','cat11']`) – pojištění domácnosti patří k bydlení. U Jídla & Pití je to Alkohol, který sdílí téma s jídlem. Že alkohol má i jiný COICOP (2) je náhoda – to označení je o tematickém propojení, ne o COICOP. Najetím myší na kartu uvidíš tooltip „Sdílené téma s: …". V podkategoriích Bydlení žádný jiný COICOP než 4 není a ani být nemá.

**2. Spoření jako výdaj** – ano, **pokud dáš 1000 Kč na Spoření jako běžný výdaj, odečte se ti to z výdajů** (Spoření je `type:expense`). Aby se to nepočítalo jako utracené, musí to být **přesun** (transakce s `transferId`/category transfer). Takže tvůj instinkt je správný – stačí přesun, ale teď to není pohodlné.

**3. Cenový hlídač u 100% limitů** – **neexistuje.** Můžeš si nastavit součet limitů třeba 500 % a nic tě nezastaví. Limity hlídají jen jednotlivé kategorie v reportu.

### Návrhy featur (k odsouhlasení)

**A) Doporučené limity v checklistu (pro nové uživatele)** – tlačítko „Nastavit doporučené limity" které předvyplní rozumné `healthPct` podle běžného rozpočtu (např. bydlení 25 %, jídlo 15 %, doprava 10 %…). Dobré pro start.

**B) Hlídač součtu limitů** – když součet `healthPct` přesáhne 100 %, zobrazit upozornění „Tvé limity dohromady přesahují 100 % příjmu". Volitelně i celkový „rozpočtový strop".

**C) Checklist pokyn „nastav limit kategorie"** – po přidání transakce do kategorie bez limitu nabídnout nastavení limitu. (Promyslet kde – aby to nebylo otravné.)

**D) Kategorie typu „přesun"** – přidat spoření/investice/fondy jako **přesun** místo výdaj, aby se nepočítaly jako spotřeba. Tohle je větší zásah (dotkne se statistik, skóre, čistého majetku) – chtělo by to dobře promyslet, ať nerozbije výpočty.

### 🟡 Featury které dávají smysl (z tvého TODO)
zkontroluj (4 a 6 by mělo být a 5 snad také)
**4. Financial Freedom Ratio (TODO-088)** – poměr pasivní příjem / výdaje. Pro finanční appku silná metrika ("jsi na X % finanční nezávislosti"). Data už máš (pasivní příjem kategorie, výdaje).

**5. Cena/kg a cena/l tracking (TODO-084) + Shrinkflation detektor (TODO-085)** – tohle je tvoje **konkurenční výhoda**. Skenuješ účtenky, takže můžeš sledovat že "máslo zdražilo z 45 na 52 Kč" nebo "balení se zmenšilo z 500 na 450 g". To jiné české finanční appky nemají.

**6. Inflace životního stylu (TODO-089)** – upozornění když výdaje rostou rychleji než příjmy. Užitečné varování.

### 2 drobnosti, které jsem viděl v Analýze (Image 2) — vyřešíme spolu s tím

- **Názvy položek se ořezávají** („ROHLÍK 4…", „KRÉMKA …") — zalomit/rozšířit sloupec.
- **Špatné zařazení** „SLADKÝ … → Maso" — některé klíčové slovo trefuje špatný kód (nejspíš kolize „sladký"). Doladíme slovník/pořadí v `product-groups.json`.