# ADR-062 · Diff-write architektura – konec zapisování celé databáze najednou

> **Stav:** Schváleno Milanem (11. 7. 2026, S16) · implementace S17–S18
> **Session:** 16 · 2026-07-11
> **Souvisí:** AUDIT_s16 P0-4, ADR-061 (admin agregát), FIX-118 (zápisy mimo hlavní uzel)

## Lidsky: co se děje a proč to měníme

Dnes funguje ukládání takhle: **kdykoli přidáš jednu transakci za 89 Kč, aplikace pošle na server ÚPLNĚ VŠECHNO** – všechny transakce za všechny roky, dluhy, kategorie, deník… Je to, jako bys kvůli jedné nové větě přepisoval celou knihu. A server tu celou knihu obratem pošle zpátky tobě (a partnerovi, pokud sdílíte).

Dokud máš stovky transakcí, nikdo si ničeho nevšimne. Ale kniha roste: s pár lety historie má ~1,5 MB, a při 10 000 uživatelích by to znamenalo **stovky GB přenosů denně** a tisíce dolarů měsíčně jen za data. Navíc na mobilu s pomalou sítí by každé uložení trvalo znatelně dlouho.

**Po změně:** přidání transakce pošle jen tu jednu transakci (~1 KB, tj. **~1500× méně**). Nic se nemaže, nic nemizí, aplikace vypadá i funguje úplně stejně – mění se jen "pošťák" pod kapotou.

## Kontext (technicky)

- `app.js:808` – `saveToFirebase()` = `_set('users/{uid}/data', celýObjekt)`.
- `onValue('users/{uid}/data')` stáhne po každé změně celý uzel zpět; partnerský listener totéž.
- Transakce = JS pole uvnitř monolitu → nelze zapsat/číst po kouskách, nelze validovat per-záznam v rules.

## Rozhodnutí

### 1. Nová struktura v RTDB (schemaV 2)

```
users/{uid}/
  schemaV: 2
  data/
    meta/            ← settings, categories, wallets, debts, projects, sablony,
                        wishes, birthdays, nakupList, assets, bank, calNotes,
                        workCal, diary, shareSettings, importHistory (malé, mění se zřídka)
    tx/{txId}/       ← KAŽDÁ transakce samostatný uzel (id = stávající t.id)
  stats/{YYYY}/      ← předpočítané roční agregáty (inc, exp, perCat) pro grafy
                        "Všechny roky" bez stahování historie
```

### 2. Zápisová vrstva – `txStore` (nový modul, ~150 řádků)

- `txAdd(t)` / `txUpdate(t)` / `txDelete(id)` → `update()` JEDNOHO klíče `data/tx/{id}`.
- `meta`: dirty-flagy po sekcích → `update()` jen změněných sekcí (kategorie se nemění při každé transakci).
- **Klíčový princip pro 33 modulů: `S.transactions` zůstává v paměti jako pole.** Moduly se nepřepisují – mutace už dnes tečou přes několik funkcí v `transactions.js`, ty se jen obalí voláním txStore. Render, statistiky, grafy: beze změny.
- `stats/{rok}` se přepočítá při zápisu transakce daného roku (jen dotčený rok).

### 3. Čtecí vrstva

- Start: `meta` celé (malé) + transakce **posledních 12 měsíců** přes query
  `orderByChild('date').startAt(ISO −12M)` → rules `data/tx/.indexOn: ["date"]`.
- Starší roky on-demand (otevření staršího měsíce / stránky Transakce → dotáhne se rok, cache v paměti).
- Live: `onChildAdded/Changed/Removed` na `data/tx` + `onValue` na `data/meta` – místo jednoho obřího `onValue`.

### 4. Migrace (bez výpadku, vratná)

1. Klient v8.9x při loginu: `schemaV` chybí → **přečte starou strukturu jako dosud** (fallback zůstává v kódu), na pozadí přesype `transactions[]` → `data/tx/{id}` po dávkách 500, dopočítá `stats`, zapíše `meta`, nakonec `schemaV: 2`.
2. Stará data se **nemažou** (pole `data/transactions` zůstane ležet jako záloha; úklid až po ověření, samostatný krok).
3. Spící účty: hromadná migrace přes Cloudflare Worker (šetrně, mimo špičku).
4. **Rollback:** dokud existuje staré pole, stačí ignorovat `schemaV` a vydat verzi čtoucí v1 – žádná ztráta dat.

### 5. Rules (doplní P1-2 z auditu)

```
"data": {
  "tx": {
    ".indexOn": ["date"],
    "$txId": { ".validate": "newData.hasChildren(['date','type']) &&
       (!newData.child('name').exists() || newData.child('name').val().length < 300)" }
  }
}
```
Per-transakce validace, která u monolitu nešla (délky názvů = obrana XSS payloadů i cost-abuse).

## Dopady

| Metrika | Před | Po |
|---|---|---|
| Zápis 1 transakce | ~1,5 MB (celá data) | ~1 KB |
| Echo posluchačům | celý uzel | 1 dítě |
| Initial load | vše od začátku historie | meta + 12 měsíců |
| „Všechny roky" graf | celá historie v paměti | `stats/{rok}` agregáty |
| RTDB egress @10k DAU | řádově tisíce $/měs | řádově desítky $/měs |
| Admin `lastActivity` | – | vedlejší zisk: může jít z `stats` (ADR-061) |

## Rizika a jak jsou ošetřená

- **Offline fronta** (`offline-sync.js`): ukládá jednotlivé transakce → mapuje se na txStore 1:1 (zjednodušení, ne komplikace).
- **Partner/sdílení:** `data/.read` pravidlo dědí na `tx` i `meta` → beze změny; sanitizace XSS (v8.86) zůstává na load path.
- **Export/import + IDB snapshot:** adapter složí pole ↔ uzly; lokální snapshot zůstává celek (lokálně nevadí).
- **Souběh dvou zařízení:** update() po klíčích kolize prakticky eliminuje (dnes vyhrává poslední CELÝ objekt = horší).
- **Deník/diary, calNotes, workCal:** v `meta`, beze změny chování.

## Zamítnutá alternativa: Firestore

Lepší dotazy a offline, ale: přepis celé SDK vrstvy, per-read účtování, velká migrace. Diff-write na RTDB = ~90 % užitku za ~20 % práce. Firestore znovu zvážit až při dalším řádu růstu (100k+).

## Plán implementace

- **S17:** modul `txStore` + obalení mutací v `transactions.js` + zápis diff + lazy migrace + rules v2 + fallback čtení v1. Výstup: zápisy jsou malé, čtení zatím postaru (bezpečný mezikrok).
- **S18:** query čtení 12M + `onChild*` listenery + `stats/{rok}` + „Všechny roky" z agregátů + worker migrace spících účtů.
- Po 2 týdnech provozu bez incidentu: úklid starého pole `data/transactions` (samostatné rozhodnutí).
