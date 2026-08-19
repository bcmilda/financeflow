# TODO-213 · Evidence aktivity — co se sbírá a proč

## Kde to leží a proč zrovna tam

Uzel **`users/{uid}/activity`**, ne `profile`.

`profile` má v pravidlech `.read: "auth != null"` — vidí na něj **každý přihlášený uživatel**,
protože se odtud berou jména a fotky partnerů. Aktivita tam nepatří.
Pod `users/$uid` čte jen vlastník a admin, zápis kaskáduje.

**Firebase pravidla se nemění.**

## Co se sbírá

| Pole | Co | Kdy se zapisuje |
|---|---|---|
| `last` | čas posledního použití | max 1× za hodinu |
| `visits` | počet spuštění celkem | tamtéž |
| `d/{YYYY-MM-DD}` | značka aktivního dne | 1× denně |
| `ver` | verze aplikace při posledním použití | tamtéž |
| `pwa` | nainstalovaná aplikace vs. prohlížeč | tamtéž |
| `firstSeen` | první zápis | jednou |
| `firstTx` | čas první transakce (aktivace) | jednou |

Z denních značek se **bez dalšího ukládání** dopočítá: aktivní dny za 30 a 90 dní,
aktuální série a celkový počet aktivních dní.

## Cena

Jeden malý zápis za hodinu, cca 365 klíčů ročně (jednotky kB).
V admin panelu jeden request navíc na uživatele (bylo 5, je 6).
Zápis běží **bez `await`** a ve vlastním `try/catch` — telemetrie nesmí shodit přihlášení.

## GDPR

Žádná IP adresa, poloha ani otisk zařízení — to by vyžadovalo souhlas.
Evidence vlastního účtu je **provoz služby**, souhlas nepotřebuje.
Patří to jednou větou do zásad ochrany údajů (souvisí s **TODO-137**, cookie lišta pro GA4).

## Skóre — nová logika

| | Dřív | Teď |
|---|---|---|
| Objem 0–60 b | transakce za celou historii (50 = plný počet) | **aktivní dny za 30 dní** (20+ = plný počet) |
| Čerstvost 0–40 b | dny od **registrace** | dny od **skutečného použití** |

**Tvůj účet:** dřív 60/100 (plný objem, nulová čerstvost, protože se měřila proti registraci
před 155 dny). Teď při denním používání **100/100**.

**U účtů bez evidence se skóre neukazuje vůbec** a místo něj je vysvětlení proč.
Falešná nula je horší než žádné číslo. Data začnou naskakovat po prvním přihlášení na v9.85.

## Nové v admin panelu

**Detail uživatele:** aktivních dní za 30 dní · aktuální série · spuštění celkem ·
aktivních dní za 90 dní · verze při posledním použití · PWA vs. prohlížeč ·
aktivace (za jak dlouho po registraci přišla první transakce).

**Seznam:** filtry *Aktivní (5+ dní za 30 d)*, *Usínající (0 dní za 30 d)*,
*Bez evidence aktivity*; řazení *Naposledy aktivní*, *Nejvíc aktivních dní*.

## K čemu ty metriky jsou

- **Usínající** — kdo se přihlašuje, ale přestal. Jediná skupina, kde má smysl zasáhnout.
- **Verze při posledním použití** — okamžitě uvidíš, kolik lidí visí na staré cache.
- **PWA vs. prohlížeč** — podklad pro rozhodnutí o TWA a Google Play, ne dohady.
- **Aktivace** — kolik dní trvá od registrace k první transakci. Měří onboarding.
- **Série** — návyk. Kdo má sérii 30 dní, ten nezruší předplatné.
