# TODO – FinanceFlow

> Poslední aktualizace: 2026-04-19 | Verze: v6.45

---

## 🔴 Urgentní

- [ ] **Opravit sekci Predikce** – tabulka se nezobrazuje, graf "Predikce vs Skutečnost" prázdný (BUG-01)
- [ ] **Nasadit Cloudflare Worker v5** – zkopírovat nový kód z `cloudflare-worker/worker.js` do Cloudflare dashboardu
- [ ] **Nastavit `RESEND_API_KEY`** v Cloudflare Variables – aby fungoval kontaktní formulář (BUG-04)

---

## 🟡 Střední priorita

- [ ] **Opravit GitHub Pages** – zjistit proč `https://bcmilda.github.io/financeflow/` nefunguje (BUG-02, BUG-03)
- [ ] **Service worker (sw.js)** – přidat pro funkčnost PWA na GitHub Pages
- [ ] **Přidat `https://bcmilda.github.io` do Firebase Hosting** – pokud je nutné pro auth/DB přístup

---

## 🟢 Vylepšení / Features

- [ ] **Docs složka** – nahrát všech 7 markdown souborů do `/docs/` na GitHubu (dev větev)
- [ ] **Merge dev → main** – po otestování preview URL z GitHub Actions
- [ ] **VERZE_LOG** – při každé session doplnit nový záznam do `js/admin.js`
- [ ] **Sekce Predikce** – po opravě BUG-01 otestovat všechny grafy a tabulky

---

## ✅ Dokončeno (session 3–4)

- [x] Opraveny 4 bugy v sekci Grafy (hoisting, kumulChart, HTML layout, box plot)
- [x] Vytvořen `.env` soubor pro Resend API klíč
- [x] Přidána záložka **Verze** do Admin panelu s changelogem
- [x] Nastaveny GitHub Actions – automatický preview deploy na push do `dev`
- [x] Cloudflare Worker v5 – přidán `bcmilda.github.io` do CORS, Resend key do env
- [x] Playwright soubory přesunuty do složky `Playwrite/`
- [x] Vytvořen `CLAUDE.md` s kontextem projektu pro Claude Code sessions
- [x] Vytvořen `cloudflare-worker/worker.js` v repozitáři pro verzování workeru
