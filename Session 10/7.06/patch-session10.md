# Patch – Session 10 (2026-05-29)

> **Cíl session:** Oprava přetékajících bublinových grafů (OPEN-031 / TODO-076), přidání hover tooltipů, přiblížení funkcionality prototypu `ff-grafy-final.html`. Zvýraznění sdílených podkategorií gradientem + 📎 sponkou. Odebrání duplicitní Treemap záložky z bublinového grafu.
>
> **Verze:** v7.05.2 → **v7.06**
>
> **Změněné soubory:** `ui.js`, `index.html`, `admin.js`
>
> **Konflikty:** žádné. Navazuje na Session 9 (v7.05).
>
> **Procedura:** Patch-only – pouze delta změny. Nemazat historická data.

---

## 🎯 Co bylo uděláno

### 1. bCluster() – oprava přetékání (OPEN-031 / TODO-076) ✅
Hlavní příčina přetékání: FIX-072 (S8) zavedl absolutní px souřadnice s paddingem 60px (`PAD + W*.13`) a širší viewBox (`svgW = W + 120`). To problém nevyřešilo – satelitní bubliny se počítaly z absolutních středů a u krajních kategorií stále přetékaly.

**Řešení (dle `ff-grafy-final.html`):** návrat k **relativním souřadnicím** `POS=[{x:.18,y:.27},…]` a `cx = p.x*W, cy = p.y*H`. SVG `viewBox="0 0 W H"` s `width:100%` se vždy vejde do kontejneru bez ohledu na šířku. Žádný padding, žádný širší viewBox.

### 2. Tooltipy ve všech bublinových grafech ✅
Nová infrastruktura v `ui.js`:
- `bEsc(s)` – escaping pro inline SVG event handlery
- `_bubbleTipEl()` – lazy-vytvoří dynamický `#_bubbleTip` element připojený k `document.body`
- `bTip(node, html)` – pozicuje tooltip nad hoverovanou bublinu, `scroll` (capture) ho skryje

Tooltipy přidány na: **Cluster** (kategorie + subkat), **Drill L1** (kategorie), **Drill L2** (sdílené i nesdílené subkat), **Drill L3** (rodičovské kategorie sdílené subkat), **Gradient** (kategorie + sdílené bubliny + no-shared fallback). Celkem 9 hover handlerů.

### 3. Zvýraznění sdílených podkategorií ✅
- **Sdílené podkat. = zvýrazněné gradientem barev** obou rodičovských kategorií (`linearGradient sg{i}` mezi `color1` a `color2`) – jádro Gradient varianty.
- **📎 sponka uvnitř bubliny** kategorie, která obsahuje sdílenou podkategorii (Cluster i Gradient). V Clusteru navíc zůstává šedá tečka + šedý přerušovaný okraj u samotné sdílené satelitní bubliny.

### 4. Odebrání duplicitní Treemap záložky ✅
- Záložka **D (Treemap)** z bublinového grafu odstraněna – Treemap už je samostatná karta v dashboardu (`renderDashTreemap → #bubbleTreemapWrap`).
- Router `renderBubbleChart` redukován na A/B/C.
- Funkce `bTreemap()` smazána.
- Guard `if(_bv!=='A'&&_bv!=='B'&&_bv!=='C')_bv='A'` proti uložené staré hodnotě `_bv='D'`.

---

## 📄 Soubory ke commitu (dev větev)

| Soubor | Změna |
|---|---|
| `js/ui.js` | bCluster přepis, tooltip infra, drill+gradient tooltipy, 📎 sponky, bTreemap smazán |
| `index.html` | verze v7.06 (title ř.6, sidebar logo ř.125, O aplikaci ř.789), cache hash `ui.js?v=c0df6548552c885f` |
| `js/admin.js` | VERZE_LOG záznam v7.06 |

**Nový cache-busting hash ui.js:** `c0df6548552c885f`

---

## 📋 Aktualizace dokumentace (k aplikaci do doc/)

### `bugs.md`
- **OPEN-031** → ✅ VYŘEŠENO S10. Příčina: FIX-072 absolutní px+padding nestačil. Fix: relativní souřadnice (FIX-090). Cross-ref TODO-076.

### `todo.md`
- **TODO-076** (Bubble chart přepracování pozicování) → ✅ DOKONČENO S10.
- Doplnit do TL;DR: P1 kritické sníženo (TODO-076 uzavřeno).

### Navrhovaná nová FIX ID
- **FIX-090** · `ui.js` – bCluster relativní souřadnice (řeší OPEN-031), tooltipy, 📎 sponky, Treemap záložka odebrána.

---

## 🧪 Co otestovat
1. Dashboard → bublinový graf → záložka **Cluster**: bubliny se vejdou, nepřetékají pod lištu ani mimo kartu.
2. Hover na kteroukoli bublinu (všechny 3 záložky) → tooltip s názvem, částkou, %.
3. Kategorie se sdílenou podkat → 📎 sponka v rohu bubliny (Cluster i Gradient).
4. Záložka **Gradient**: sdílené na ose dole se zvýrazní gradientem barev rodičů; když nejsou žádné sdílené → fallback text.
5. Bublinový graf má jen **3 záložky** (A/B/C), žádná Treemap.
6. Dashboard má Treemap **jen jednou** (horní samostatná karta).

---

## 📦 Nasazení
```bash
# 1. GitHub: nahrát js/ui.js + js/admin.js + index.html do dev větve
# 2. firebase deploy --only hosting
# 3. Prohlížeč: Ctrl+Shift+R (hard refresh)
```

*Session 10 · v7.06 · Claude Opus · 2026-05-29*
