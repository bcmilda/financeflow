# Co v Session 19 zbývá

Stav po v9.86. Seřazeno podle toho, co bych dělal dřív.

---

## 🔴 Rozdělané, čeká na dokončení

**1 · Popisky `(Kč)` u vstupních polí** — 20 míst v `app.html`, 18 polí v 5 modulech.
Detailní postup v `PLAN-vstupni-pole-mena.md`. **Nedělat bez round-trip testu** —
chybějící zpětný převod násobí hodnotu kurzem při každé editaci.

**2 · Zbylá `fmt()` v ostatních modulech** — `receipts.js` (35), `report.js` (18),
`inflace.js` (9), `review.js` (9), `premium.js` (11), `stats.js` (31), `ui.js` (26).
Tyhle moduly `fmtB` nepoužívají vůbec. Nutno projít ručně: rozlišit peníze od počtů,
procent a dnů. `smoke_mena.js` je zatím hlídá jen v opravených souborech.

**3 · Kurzové ztráty** — teď máme data (`amount` + `currency` + `amtCZK`), takže jde
spočítat: *„na kurzu a poplatcích jsi nechal X Kč"*, s rozpadem podle peněženky
(banka vs. bankomat vs. přepážka). Chybí **historické kurzy ČNB** k datu transakce —
dnes se nikde neukládají. Bez nich lze porovnávat jen proti dnešnímu kurzu, což
u starších transakcí nedává smysl.

---

## 🟡 Rozhodnuté, nezačaté

**4 · TODO-200** — diff-read fáze 2b. Postavená a zase zrušená ve v9.57.
Potřebuje formální rozhodnutí: definitivně zavřít, nebo vrátit?

**5 · TODO-207** — Životní mapa, vizuální rozšíření (varianta A doporučena).

**6 · TODO-201** — Portfolio ceny. Čeká na rozhodnutí Pro vs. Premium.

**7 · TODO-208** — Pravidelná záloha dat. **Sám jsi to označil za reálné riziko**
u aplikace s platícími zákazníky. Ze všeho na téhle stránce je to jediné,
co může způsobit nevratnou škodu.

**8 · TODO-137** — GDPR cookie lišta pro GA4. Nově souvisí i s evidencí aktivity
(v9.85) — obojí patří do zásad ochrany údajů.

---

## 🟢 Menší nálezy z téhle session

**9 · Landing page** — ceník neodpovídá Stripe (99 Kč / 100 uživatelů),
duplicity mezi `index.html` a podstránkami.

**10 · TWA / Google Play** — čeká na SHA-256 fingerprint. Podklad pro rozhodnutí
už máme: v9.85 sbírá PWA vs. prohlížeč.

**11 · Karta „Příští měsíc"** — pět otázek z v9.79 zodpovězeno, ale **kartu jsi
zatím neviděl s reálnými daty po opravách měny**. Stojí za prohlédnutí.

---

## Na konec session

- `Summary_s19.md`
- Aktualizace 15 living docs (`CLAUDE.md`, `todo.md`, `bugs.md`, `decisions.md`,
  `formulas.md`, `GLOSSARY.md`…)
- **`CLAUDE_SKILLS.md` → SKILL 26** (návrh hotový v `SKILL-26-mena.md`)
- Nové záznamy: FIX-252, FIX-253, FIX-254, FIX-255, TODO-212, TODO-213, TODO-214
