# Proč modal „Přidat transakci" ukazuje KČ místo EUR

## Řetěz volání

`app.html:1402` → `<span id="txAmtCur">KČ</span>`
`debts.js:117` → `curEl.textContent = (cur==='CZK' ? 'KČ' : cur)`
`debts.js:116` → `const cur = _txEntryCur()`

```js
function _txEntryCur(){
  ...
  const id = document.getElementById('txWalletId')?.value || '';
  if(!id) return baseCur();                      // ← ZÁKLADNÍ MĚNA jen bez peněženky
  const w = (S.wallets||[]).find(x=>x.id===id);
  return (w && w.currency) ? w.currency : 'CZK'; // ← jinak VŽDY měna peněženky
}
```

Popisek tedy ukazuje **měnu vybrané peněženky**. Základní měna se použije
**jen když není vybraná žádná peněženka.**

## Proč to „dřív fungovalo"

`debts.js:28–29`, přidáno v **S17.5 na tvoje přání** („viditelné předvybrání výchozí
peněženky z Nastavení"):

```js
if(wSel && !wSel.value && _settings.defWallet && ...) wSel.value = _settings.defWallet;
```

Předtím byl výběr peněženky při otevření modalu **prázdný** → `!id` → vracela se
základní měna → popisek ukazoval EUR/GBP. Po S17.5 je peněženka předvybraná vždy,
takže **větev se základní měnou už prakticky nikdy nenastane.**

Máš „Vaše banka" v CZK → popisek KČ, i když je základní měna GBP.

**Není to rozbitá funkce ani regrese ve formátování** — je to vedlejší efekt S17.5.
A ta větev je dnes v podstatě mrtvý kód.

## Která měna má vlastně vyhrát

Tady je skutečné rozhodnutí, ne technikálie:

**A) Měna peněženky (dnešní chování).** Platíš z korunového účtu → zadáváš koruny.
Popisek říká pravdu. Základní měna je jen jednotka pro souhrny.
→ Oprava = žádná v kódu, jen doplnit do popisku *proč*: „ČÁSTKA (KČ — Vaše banka)".

**B) Základní měna vždy.** Zadáváš v EUR, aplikace přepočte na měnu peněženky.
→ Riziko: zadáš 1 000 při nastavené GBP a strhne se 28 256 Kč. Za mě nebezpečné.

**C) Nechat volbu na uživateli** — přepínač měny přímo u pole (převodník už tam je,
stačí ho povýšit ze zobrazovacího na zadávací).

**Doporučuji A + popisek s názvem peněženky.** Nejmenší zásah, žádné riziko překlepu
o řád, a odstraní přesně to překvapení, které jsi zažil. Ale je to tvoje volba.

## Vedlejší zjištění

`_txEntryCur()` má i druhou mrtvou větev — `if(isTransfer && !isAsset) return 'CZK'`
u přesunů mezi peněženkami. Přesun mezi dvěma eurovými peněženkami se tedy zadává
v korunách. Nekontroloval jsem to v běhu, jen v kódu — stojí za ověření.
