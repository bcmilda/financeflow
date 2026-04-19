# Bugs – FinanceFlow

> Poslední aktualizace: 2026-04-19 | Verze: v6.45

---

## 🔴 Kritické / Neopravené

### BUG-01 · Predikce – tabulka se nezobrazuje
- **Sekce:** Grafy → Predikce
- **Popis:** Po opravě grafů v session 3 přestala fungovat sekce Predikce. Tabulka predikce výdajů se vůbec nezobrazuje.
- **Vedlejší efekt:** Graf "Predikce vs Skutečnost" se zobrazí pouze po překliknutí na Dashboard a zpět – jinak je prázdný.
- **Příčina:** Pravděpodobně vedlejší efekt opravy initGrafFilters() nebo renderKumulChart() – nutné prošetřit.
- **Priorita:** Vysoká

### BUG-02 · GitHub Pages – financeflow nefunguje
- **Sekce:** Deployment / GitHub Pages
- **URL:** `https://bcmilda.github.io/financeflow/`
- **Popis:** Stránka se nenačte. GitHub Pages je sice zapnuté (branch: main), ale web neběží.
- **Příčina:** Neznámá – možná chybí service worker, nebo problém s routováním SPA.
- **Priorita:** Střední

### BUG-03 · GitHub Pages – lepsi-uver.html nefunguje
- **Sekce:** Deployment / GitHub Pages
- **URL:** `https://bcmilda.github.io/financeflow/lepsi-uver.html`
- **Popis:** Stránka porovnání úroků bank se nenačte přes GitHub Pages.
- **Poznámka:** Soubor `lepsi-uver.html` na větvi `main` existuje – problém je jinde (Pages build, Cloudflare?).
- **Priorita:** Střední

### BUG-04 · Kontaktní formulář – emaily se neodesílají
- **Sekce:** O aplikaci → Kontakt
- **Popis:** Formulář neodešle email. Resend API klíč v Cloudflare Workeru je starý/neplatný.
- **Řešení:** V Cloudflare Worker dashboardu nastavit env proměnnou `RESEND_API_KEY` = nový klíč. Worker v5 byl aktualizován – klíč už není hardcoded.
- **Stav:** Worker kód opraven, ale Cloudflare proměnná ještě nebyla nastavena.
- **Priorita:** Střední

---

## 🟡 Varování / Vedlejší efekty

### BUG-05 · Cloudflare Worker – chybějící origin
- **Sekce:** AI funkce / Cloudflare Worker
- **Popis:** `https://bcmilda.github.io` chyběl v `allowedOrigins` → CORS chyba při volání AI z GitHub Pages.
- **Stav:** ✅ Opraveno ve Worker v5 – nutno deployovat nový kód do Cloudflare.

---

## ✅ Opravené bugy (v6.45)

| ID | Sekce | Popis | Opraveno |
|----|-------|-------|---------|
| – | Grafy → Obecné / Měsíční | Infinite loop v `initGrafFilters()` – hoisting problem | ✅ v6.45 |
| – | Grafy → Měsíční | Chybějící `renderKumulChart()` – kumulativní graf se nevykresloval | ✅ v6.45 |
| – | Grafy → Všechny roky | Špatný HTML layout – `gtab-vsechny-content` vnořen do `gtab-rocni-content` | ✅ v6.45 |
| – | Grafy → Obecné | Nefunkční karta Box plot – canvas ID neexistoval | ✅ v6.45 |
