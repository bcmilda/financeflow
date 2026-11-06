### Ekonomika AI volání (Claude Sonnet 4)

Tvůj worker používá `claude-sonnet-4`, který stojí **$3 / milion vstupních tokenů, $15 / milion výstupních** (přibližně 70 / 350 Kč).

**Cena za jeden typ volání (odhad):**
|Funkce|Vstup|Výstup|Cena/volání|

|Analýza účtenky (foto)|~1500 tok obraz + prompt|~2000 tok|**~0,60–0,90 Kč**|
Import banky (CSV/PDF)~3000–8000 tok~4000 tok**~1,00–1,80 Kč**
AI Rádce (report)~4000 tok~2000 tok**~0,70 Kč**
Kategorizace transakce~800 tok~200 tok**~0,10 Kč**

**Klíčové: účtenky a import jsou nejdražší** (obraz/velký kontext + dlouhý výstup).

### Modelový měsíc Premium uživatele

Řekněme aktivní uživatel: 60 účtenek + 4 importy + 10× rádce + 50 kategorizací měsíčně:

- 60 × 0,75 = 45 Kč
- 4 × 1,4 = 5,6 Kč
- 10 × 0,7 = 7 Kč
- 50 × 0,10 = 5 Kč
- **Celkem ~63 Kč/měsíc na API**

### Co doporučuju (a co je v ADR-041)

- **Free:** 0 AI volání, jen 1× CSV import banky (parsing CSV jde i bez AI — čistý JS). Účtenky/rádce/import PDF = zamčeno.
- **Trial:** plný přístup, ale tvrdé limity (např. 20 účtenek + 5 importů + 5 reportů/měsíc) — ať to vyzkouší, ne aby to týden drancoval.
- **Premium:** velkorysé limity, ne neomezené (např. 150 účtenek, 30 importů, 30 reportů/měsíc) — pokrývá 99 % a chrání před extrémy.
- **Pro:** vyšší limity pro náročné (rodina, malý podnikatel).

pozn.`reportAdvisor` v FEATURE_TIERS je tedy redundantní, ale neškodí (necháme pro budoucí oddělení)