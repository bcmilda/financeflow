od výplaty k výpltě.

**Runway dostala čtyři upgrady:**

1. **🛡️ Nedotknutelná rezerva** — nové pole v Nastavení (pod Dnem výplaty). Denní limit se počítá až po jejím odečtení; karta limitu ukazuje „po rezervě X Kč".
2. **📉 Projekce konce cyklu** — extrapoluje jen _flexibilní_ tempo (fixní výdaje se neextrapolují, známé platby už kryje rezerva budoucích plateb — žádné dvojí počítání). Barevně hlídá, jestli rezerva zůstane nedotčená.
3. **🔁 Srovnání s minulým cyklem** — utraceno do stejného dne cyklu (±%, zeleně/červeně), celkové výdaje minulého cyklu. Minulý cyklus se přichytává na reálnou výplatu stejně jako aktuální.
4. **Víkend vs. všední den** — Kč/den zvlášť + upozornění, když víkendy táhnou tempo víc než 1,5×.

**Konzistence výplaty opravena.** „Týdny od výplaty" v záložce Měsíc teď čtou `radarPaydayInfo()` jako jediný zdroj pravdy: kotva z Nastavení/auto-detekce, a největší příjem měsíce ji jen _zpřesní_, pokud je do ±6 dní od kotvy (= posun výplaty). Měsíc bez výplaty nebo s netypickým příjmem (cashback uprostřed měsíce) už týdny nerozhodí — obě záložky Radaru jsou konzistentní.