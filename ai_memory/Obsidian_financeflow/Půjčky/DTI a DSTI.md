Hotovo — **v8.75** je připravená k nasazení. Tady je shrnutí a plán na zbytek.

### ✅ Oprava DTI/DSTI (FIX-192, TODO-160)

**Dvě věci, které bys měl vědět:**

1. Tvá čísla ve screenech se **změní** — DTI/DSTI se ustálí na jedné stabilní hodnotě (odraz 12M průměru), nebudou už skákat mezi měsíci.
2. Pro DTI/DSTI jsem záměrně **vypnul vážený stabilní základ (ADR-044)** a nechal prostý klouzavý průměr, jak jsi psal („klouzavé průměry jsou super"). `computeBaseIncome` (vážený) zůstává beze změny pro zdraví kategorií atd. Kdybys chtěl váhy vrátit i sem, je to malá úprava.