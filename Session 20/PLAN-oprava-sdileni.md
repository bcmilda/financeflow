# Oprava sdílení (Krok 0) — co přesně se změní

**Session 20 · podklad k rozhodnutí, zatím NEIMPLEMENTOVÁNO**

---

## Jádro problému v jedné větě

`users/{uid}/data` slouží zároveň jako **tvoje úložiště** i jako **výdejní okénko
pro partnery** — a protože se filtruje při zápisu, „nechci tohle ukazovat"
skončí jako „tohle smaž".

Řetěz, který k tomu vede (vše ověřeno v kódu):

```
updateShareSetting('transactions', false)      stats.js:1184
  └─ S.shareSettings.transactions = false
  └─ save()                                    app.js:1259
      └─ saveToFirebase()                      app.js:1212
          └─ _dwTxObj() → {}                   app.js:1196   (ss.transactions===false)
          └─ updates['transactions/'+id] = null pro každou    app.js:1246
          └─ _update(dataRef, updates)         app.js:1249    ← data pryč
```

Přepínače jsou dostupné **každému uživateli**, i bez jediného partnera
(`renderSdileni()` vykresluje `sharingContent` nezávisle na seznamu partnerů).

---

## Návrh: oddělit úložiště od výdejního okénka

```
users/{uid}/data      ← VŽDY kompletní, nefiltrované, čte jen vlastník
users/{uid}/shared    ← výřez podle shareSettings, tohle čtou partneři
```

### Změna 1 · `app.js` — `_dwMetaVals()` přestane filtrovat

*Dnes (app.js ~1169):*
```js
function _dwMetaVals(){
  const ss=S.shareSettings||{};
  return {
    debts: ss.debts===false?[]:S.debts||[],           // ← filtr uvnitř úložiště
    categories: ss.categories===false?[]:S.categories||[],
    ...
  };
}
```

*Nově — dvě oddělené funkce:*
```js
// Úložiště: nikdy nefiltruje. Tohle je zdroj pravdy uživatele.
function _dwMetaVals(){
  return {
    debts: S.debts||[],
    categories: S.categories||[],
    bank: S.bank||{startBalance:0},
    ...
  };
}

// Výdejní okénko: filtr se přesouvá SEM, kde nemůže nic smazat.
function _shMetaVals(){
  const ss=S.shareSettings||{};
  const mv=_dwMetaVals();
  return {
    debts: ss.debts===false?[]:mv.debts,
    categories: ss.categories===false?[]:mv.categories,
    ...
  };
}
```

Totéž pro `_dwTxObj()` → `_shTxObj()`.

### Změna 2 · `app.js` — zápis výřezu

`saveToFirebase()` (~1212) po dokončení zápisu do `data` zapíše i `shared`.
Vlastní diff sada signatur (`_sh.metaSig`, `_sh.txSig`), aby se i tady
zapisovalo jen změněné.

```js
// Kdo nemá partnera, výdejní okénko vůbec nepotřebuje – ušetří polovinu zápisů.
if(_hasPartners()){
  await _shWrite(uid);
}
```

`_hasPartners()` čte `users/{uid}/partners` (načteno už při přihlášení).

### Změna 3 · `app.js` — `loadPartners()` čte `shared`

*Dnes (app.js:900, 910):*
```js
_get(_ref(_db, `users/${uid}/data`))
const pRef = _ref(_db, `users/${uid}/data`);
```

*Nově:*
```js
_get(_ref(_db, `users/${uid}/shared`))
const pRef = _ref(_db, `users/${uid}/shared`);
```

`sanitizeUserData()` zůstává beze změny — pořád jde o cizí data (XSS vektor).

### Změna 4 · `database_rules.json` — ⚠️ nasazuješ ručně ve Firebase Console

*Dnes:*
```json
"data": {
  ".read": "auth.uid === $uid || root.child('users').child($uid)
             .child('partners').child(auth.uid).exists() || auth.uid === 'ADMIN'"
}
```

*Nově:*
```json
"data": {
  ".read": "auth.uid === $uid || auth.uid === 'ADMIN'"
},
"shared": {
  ".read": "auth.uid === $uid || root.child('users').child($uid)
             .child('partners').child(auth.uid).exists() || auth.uid === 'ADMIN'"
}
```

Zápis do `shared` je krytý kaskádou `.write` z `users/$uid` — nové pravidlo netřeba.

---

## Pořadí nasazení (aby partneři nepřestali vidět data)

Přímá výměna by znamenala výpadek: appka píše do `shared`, ale partner ho
ještě nesmí číst — nebo naopak čte `shared`, který ještě neexistuje.

**Dvoufázově:**

1. **Fáze 1** — pravidla povolí partnerovi **obojí** (`data` i `shared`).
   Nasadí se appka, ta začne psát `shared`. Partneři pořád vidí `data`.
2. **Fáze 2** (po pár dnech, až mají všichni aktivní účty zapsáno `shared`) —
   z pravidel se odebere partnerský přístup k `data`.

Mezi fázemi je krátké okno, kdy `data` zůstávají partnerům čitelná —
tedy stav, který platí i dnes. Nic se nezhorší.

---

## Co to stojí

| | |
|---|---|
| **Místo v DB** | Sdílené sekce 2×. Kdo nemá partnera, nepřibude nic. |
| **Zápisy** | 2 diff-zápisy místo 1 — **jen u uživatelů s partnerem**. |
| **Migrace dat** | Žádná. `shared` se vytvoří sám při prvním uložení. |
| **Riziko ztráty** | Žádné — `data` se pouze přestanou filtrovat, nic se nemaže. |

---

## Alternativa B (zvažoval jsem, nedoporučuji)

Nechat jeden uzel a filtrovat **pravidly při čtení** — partner by měl `.read`
na jednotlivé podsekce podle `shareSettings`.

Nefunguje jednoduše: `.read` **kaskáduje dolů stejně jako `.write`** a nelze
ho v hlubším uzlu odebrat (přesně lekce z `SECURITY.md`). Muselo by se tedy
`.read` na `data` odebrat úplně a dát ho zvlášť každé z ~20 podsekcí — a
`loadPartners()` by místo jednoho čtení dělal dvacet.

Výhoda (žádná duplikace) nevyváží to, že by hlavní bezpečnostní pravidlo bylo
o řád složitější. Pravidla nás už dvakrát stála nejvíc ze všech chyb.

---

## Co se NEmění

- Struktura `S` a formát dat
- `sanitizeUserData()`, diff-read pro vlastní data, offline režim
- UI Sdílení — přepínače zůstanou přesně jak jsou, jen konečně dělají, co slibují
- Onboarding, skóre, rodinné souhrny

---

## Než se do toho pustím, potřebuju od tebe

1. **Souhlas s dvoufázovým nasazením** — znamená to dva zásahy do Firebase
   Console v odstupu několika dní, ne jeden.
2. **Ověření na testovacím účtu**, ne na produkci. Nemám jak spustit appku
   naživo; smoke testy pokryjí logiku výřezu, ale ne skutečný Firebase.
