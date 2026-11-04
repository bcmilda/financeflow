# Chrome Multi-Profile

Desktopová aplikace pro Windows, která:

1. **Otevře najednou několik profilů Chrome.** Každý profil se otevře ve vlastním okně a okna se rozloží vedle sebe.
2. **Otevře jeden nebo více odkazů** ve všech profilech zároveň.
3. **Automaticky obnovuje stránky.** Nastavíš interval, náhodnou odchylku a počet cyklů. Refresh jde spustit, pozastavit a zastavit.
4. **Po každém refreshi klikne na zadaná tlačítka**, například „Search again“ a pak „Find …“. Tlačítko zadáš textem, nebo ho aplikaci ukážeš kliknutím (🎯 Nahrát kliknutím). Systémová okna prohlížeče (alert / confirm) umí potvrzovat automaticky.

## Instalace

### Varianta A: hotový .exe (doporučeno)
1. Na GitHubu otevři **Actions → „Chrome Multi-Profile – sestavení .exe“**.
2. Klikni na poslední úspěšný běh. Dole v části **Artifacts** stáhni `ChromeMultiProfile-windows`.
3. Rozbal ZIP a spusť `ChromeMultiProfile.exe`. Windows SmartScreen může varovat, protože program není podepsaný. Klikni na *Další informace → Přesto spustit*.

Potřebuješ jen nainstalovaný **Google Chrome**.

### Varianta B: ze zdrojového kódu
1. Nainstaluj Python 3.10 nebo novější z [python.org](https://www.python.org/downloads/). Při instalaci zaškrtni *Add python.exe to PATH*.
2. Dvojklikni na `spustit.bat`. Při prvním spuštění se doinstalují knihovny.

Vlastní `.exe` si můžeš sestavit souborem `sestavit-exe.bat`. Výsledek najdeš v `dist\`.

## Jak to používat

1. **Profily:** výchozí jsou 3, další přidáš tlačítkem *Přidat*. Dvojklikem profil zapneš nebo vypneš.
2. **Odkazy:** napiš je do pole, jeden na řádek. Řádek začínající `#` se přeskočí.
3. Klikni na **▶ Otevřít profily**. Při úplně prvním spuštění se v každém okně přihlas k účtu. Přihlášení zůstane uložené i pro příště.
4. **Kroky:** nastav, na co se má po refreshi kliknout. Výchozí kroky jsou:
   1. `Search again`
   2. `Find` (klikne na první viditelné tlačítko, jehož text obsahuje „Find“)

   Kroky můžeš vytvořit i tlačítkem **🎯 Nahrát kliknutím**: v okně Chrome se prvek pod myší zvýrazní oranžově a ty na něj klikneš. Kliknutí se přitom na stránce neprovede, jen se zapamatuje. Klávesa Esc nahrávání zruší.

   Krok čeká, než se prvek objeví (výchozí čekání je max. 10 s). Když se prvek neobjeví, další kroky se přeskočí, protože vyskakovací okno se nejspíš vůbec neukázalo.
5. Tlačítko **Otestovat teď** provede kroky hned, bez refreshe. Hodí se na vyzkoušení.
6. Nastav interval a počet cyklů (0 = pořád dokola) a klikni na **▶ Start**.

## Důležité vědět

- Aplikace **nepoužívá tvé běžné profily Chrome**. Pro každý profil si vytvoří vlastní, oddělený profil ve složce `%LOCALAPPDATA%\ChromeMultiProfile\profiles`. Je to tak proto, že Chrome automatické ovládání svých běžných profilů z bezpečnostních důvodů blokuje. Tvůj normální Chrome můžeš mít otevřený současně.
- Nastavení se ukládá do `%APPDATA%\ChromeMultiProfile\config.json`.
- Obnovují se **všechny záložky** ve všech otevřených profilech.
- Mnoho webů v podmínkách použití zakazuje automatizaci nebo více účtů. Používej to s rozmyslem, hrozí zablokování účtu.

## Pro vývoj

```
python tests/test_engine.py            # test s nainstalovaným Chrome
python tests/test_engine.py C:\cesta\k\chrome.exe
```

Soubory:
- `app.py`: okno aplikace (tkinter)
- `engine.py`: ovládání Chrome (Playwright), refresh, kroky, nahrávání kliků
- `config.py`: ukládání nastavení
