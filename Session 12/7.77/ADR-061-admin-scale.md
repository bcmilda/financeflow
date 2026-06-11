# ADR-061 · Škálování admin auditů – agregační index uzel (Krok 2)

> **Stav:** Schváleno (design) · implementace ODLOŽENA do růstu uživatelů
> **Session:** 12.1 · 2026-06-10
> **Souvisí:** TODO-122 (Krok 1 – HOTOVO v7.77), ADR-060

## Kontext

Admin audity (uživatelé, adopce kategorií, COICOP mapování) původně stahovaly **celou `users.json`** – tj. kompletní DB včetně všech transakcí všech uživatelů. Při stovkách uživatelů s historií jde o desítky MB na jedno kliknutí (pomalé UI + placený Firebase egress).

**Krok 1 (HOTOVO, v7.77):** `users.json?shallow=true` → seznam UID, poté per-uid jen `users/{uid}/data/categories.json` (pár kB, pool 8 souběžně) přes helper `adminFetchUserCategories()`. Přepsáno: `loadCustomCatsNoCoicop`, `loadCustomSubsNoCoicop`, `assignCoicop`, `assignSubCoicop`. Klientů se změna nedotkla.

**Co Krok 1 neřeší:** `loadAdminUsers` a `loadCategoryAdoption` potřebují i transakce/statistiky → per-uid stažení by přeneslo stejné množství dat, jen po částech.

## Rozhodnutí (Krok 2)

1. **Agregační uzel `/index/userSummary/{uid}`** zapisovaný klientem při `save()`:
   ```json
   { "email": "...", "txCount": 123, "lastActive": 1718..., "premium": true,
     "catUsage": {"cat1": 45, "cat42": 3}, "customCats": ["xls"],
     "appVersion": "v7.77" }
   ```
   Malý (≤2 kB/uživatel), admin pak čte **jediný uzel** `/index/userSummary.json`.
2. **database_rules.json:** zápis vlastního summary jen vlastníkem, čtení jen adminem; `.indexOn` dle potřeby řazení (lastActive).
3. **Klientský zápis:** v `saveToFirebase()` přidat `_set('/index/userSummary/'+uid, summary)` – POZOR na pattern FIX-118 (zápis mimo hlavní uzel, nesmí přepsat cizí data).
4. **Adopce/COICOP audity** zůstávají na Kroku 1 (kategorie jsou malé); na summary přejdou jen users-list a statistiky.

## Důsledky

- ✅ Admin panel O(1) čtení nezávisle na velikosti transakční historie
- ⚠️ Duplikovaná data (summary vs. zdroj) – řeší se přepisem při každém save()
- ⚠️ Zásah do klienta (saveToFirebase) + pravidel → vyžaduje testy a verzi
- 📌 **Spouštěč implementace:** >50 aktivních uživatelů NEBO publikace na Google Play
