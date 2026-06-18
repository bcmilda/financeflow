### Stav v8.10 — co je hotové

Doteď proběhlo (s ověřením syntaxe po každém kroku):

**Reverz peněz (bug fix):** Vklad do cíle si nově pamatuje `walletId`, `walletAmount`, `walletCurrency` a `txOutId`. Při smazání cíle, vkladu nebo označení „splněno" se smaže párová výdajová transakce → peníze se vrátí na původní peněženku přes `computeWalletBalance`. Klíčové: zjistil jsem, že zůstatek se počítá z transakcí, takže jsem odstranil přímou úpravu `balance`, která by způsobila dvojí odečtení.

**Měnový přepočet:** `doTransfer` používá existující `_FX_RATES` z debts.js (helper `toCZK`). 30 EUR → 30×kurz CZK do cíle; reverz vrací originál v původní měně.

**Převod z cíle zpět** na peněženku (transferFrom podporuje `goal:ID`), **hlídání cílové částky** (nelze překročit), **splnění cíle** (`goalMarkDone` + záložka Aktivní/Splněno), **banner** (Aktivních/Pasivních/Splněno + virtuální peněženka se žlutým kolečkem), **dvě tlačítka** bez přepínače (přepínač jen v editaci), přejmenování na „Přání a cíle", skrytí ručních vkladů.

### Co zbývá (potřebuju od tebe `ui.js`)

Dvě věci jsem nestihl, protože vyžadují `ui.js`, který nemám v aktuální verzi:

1. **Dashboard widget** virtuální peněženky (renderDashboard je v ui.js)
2. **Reverz při smazání transfer transakce přímo v Transakcích** (deleteTx je v ui.js)

Pošli mi prosím aktuální `ui.js` a v dalším kole to dodělám + dokončím verzování a deploy. Hashe a VERZE_LOG pro v8.10 jsou připravené; chybí jen finální `present_files`, který udělám hned v příští zprávě spolu s ui.js změnami.

Přání a cíle:
původní koncept - pasivní - bez investic a spoření pouze čumenda

Cíle (aktivní)
spoření, pravidelné vklady

Editací se dá změnit Přání X Cíl