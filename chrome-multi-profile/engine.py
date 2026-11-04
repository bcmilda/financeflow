"""Ovládání oken Chrome přes Playwright.

Běží ve vlastním vlákně s vlastní asyncio smyčkou, aby GUI nezamrzalo.
GUI volá veřejné metody (open_profiles, start_refresh, ...), které jen
naplánují práci ve smyčce. Zpět do GUI se posílají zprávy přes callback
`emit(kind, data)` – GUI si je vyzvedává z fronty.
"""

import asyncio
import math
import random
import re
import threading
import time

from playwright.async_api import async_playwright

import config

CLICKABLE = (
    "button, a, [role=button], input[type=button], input[type=submit], "
    "input[type=reset], [onclick], label, summary"
)

# Skript vložený do stránky při „nahrávání kliknutí“. Zvýrazní prvek pod
# myší a po kliknutí pošle jeho popis zpět do aplikace (kliknutí samotné
# se na stránce neprovede). Esc nahrávání zruší.
RECORDER_JS = r"""
() => {
  if (window.__cmpRecActive) return;
  window.__cmpRecActive = true;
  const CLICKABLE = %CLICKABLE%;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;' +
    'border:3px solid #e8590c;background:rgba(232,89,12,.15);border-radius:3px;display:none';
  document.documentElement.appendChild(box);
  const pick = (el) => (el && el.closest && el.closest(CLICKABLE)) || el;
  const esc = (s) => (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&');
  const cssPath = (el) => {
    if (el.id && document.querySelectorAll('#' + esc(el.id)).length === 1) return '#' + esc(el.id);
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      let part = el.tagName.toLowerCase();
      if (el.id && document.querySelectorAll('#' + esc(el.id)).length === 1) {
        parts.unshift('#' + esc(el.id)); break;
      }
      const parent = el.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter(c => c.tagName === el.tagName);
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(el) + 1) + ')';
      }
      parts.unshift(part);
      el = parent;
    }
    return parts.join(' > ');
  };
  const textOf = (el) => ((el.innerText || el.value || el.getAttribute('aria-label') ||
    el.getAttribute('title') || '') + '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const move = (e) => {
    const el = pick(e.target); if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    Object.assign(box.style, {display:'block', left:r.left+'px', top:r.top+'px',
      width:r.width+'px', height:r.height+'px'});
  };
  const cleanup = () => {
    window.__cmpRecActive = false;
    document.removeEventListener('mousemove', move, true);
    document.removeEventListener('click', click, true);
    document.removeEventListener('mousedown', block, true);
    document.removeEventListener('mouseup', block, true);
    document.removeEventListener('keydown', key, true);
    box.remove();
  };
  window.__cmpRecCleanup = cleanup;
  const block = (e) => { e.preventDefault(); e.stopPropagation(); };
  const click = (e) => {
    block(e);
    const el = pick(e.target);
    cleanup();
    window.__cmpRecorded({css: cssPath(el), text: textOf(el), tag: el.tagName.toLowerCase()});
  };
  const key = (e) => {
    if (e.key === 'Escape') { block(e); cleanup(); window.__cmpRecorded({cancelled: true}); }
  };
  document.addEventListener('mousemove', move, true);
  document.addEventListener('mousedown', block, true);
  document.addEventListener('mouseup', block, true);
  document.addEventListener('click', click, true);
  document.addEventListener('keydown', key, true);
}
""".replace("%CLICKABLE%", repr(CLICKABLE))

STOP_RECORDER_JS = "() => { if (window.__cmpRecCleanup) window.__cmpRecCleanup(); }"


class Engine:
    def __init__(self, emit, headless=False):
        self.emit = emit
        self.headless = headless
        self.chrome_path = ""
        self.auto_dialogs = True
        self.contexts = {}  # dir profilu -> (název, BrowserContext)
        self._pw = None
        self._refresh_task = None
        self._paused = None
        self._stop = None
        self._recording = False
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._loop.run_forever, daemon=True)
        self._thread.start()

    # ------------------------------------------------------------ obecné
    def log(self, text):
        self.emit("log", text)

    def submit(self, coro):
        """Naplánuje korutinu ve vlákně enginu; vrací concurrent Future."""
        fut = asyncio.run_coroutine_threadsafe(self._guard(coro), self._loop)
        return fut

    async def _guard(self, coro):
        try:
            return await coro
        except Exception as e:  # chyby posílat do logu, ne tiše zahodit
            self.log(f"Chyba: {e}")
            raise

    def open_profile_dirs(self):
        return set(self.contexts)

    def pages(self):
        result = []
        for name, ctx in list(self.contexts.values()):
            for page in ctx.pages:
                if not page.is_closed():
                    result.append((name, page))
        return result

    # ------------------------------------------------------------ profily
    async def _ensure_pw(self):
        if self._pw is None:
            self._pw = await async_playwright().start()
        return self._pw

    def _window_args(self, index, count, screen):
        if not screen or count < 1:
            return []
        sw, sh = screen
        cols = math.ceil(math.sqrt(count))
        rows = math.ceil(count / cols)
        w, h = sw // cols, (sh - 40) // rows
        x, y = (index % cols) * w, (index // cols) * h
        return [f"--window-position={x},{y}", f"--window-size={w},{h}"]

    async def open_profiles(self, profiles, urls, screen=None):
        """Otevře zadané profily (seznam dictů z configu) a v nich odkazy."""
        pw = await self._ensure_pw()
        to_open = [p for p in profiles if p["dir"] not in self.contexts]
        for idx, prof in enumerate(profiles):
            if prof not in to_open:
                continue
            path = config.profile_path(prof)
            path.mkdir(parents=True, exist_ok=True)
            kwargs = dict(
                user_data_dir=str(path),
                headless=self.headless,
                no_viewport=True,
                ignore_default_args=["--enable-automation"],
                args=self._window_args(idx, len(profiles), screen),
            )
            if self.chrome_path:
                kwargs["executable_path"] = self.chrome_path
            else:
                kwargs["channel"] = "chrome"
            self.log(f"Spouštím profil „{prof['name']}“…")
            ctx = await pw.chromium.launch_persistent_context(**kwargs)
            await self._setup_context(prof, ctx)
            self.contexts[prof["dir"]] = (prof["name"], ctx)
            await self._open_urls_in(ctx, urls, reuse_blank=True)
        self.emit("profiles_changed", None)

    async def _setup_context(self, prof, ctx):
        async def on_recorded(source, data):
            await self._on_recorded(data)

        await ctx.expose_binding("__cmpRecorded", on_recorded)
        for page in ctx.pages:
            self._setup_page(page)
        ctx.on("page", self._setup_page)

        def on_close(*_):
            if self.contexts.get(prof["dir"], (None, None))[1] is ctx:
                del self.contexts[prof["dir"]]
                self.log(f"Profil „{prof['name']}“ byl zavřen.")
                self.emit("profiles_changed", None)

        ctx.on("close", on_close)

    def _setup_page(self, page):
        async def on_dialog(dialog):
            if self.auto_dialogs:
                self.log(f"Potvrzuji okno prohlížeče ({dialog.type}): {dialog.message[:80]}")
                try:
                    await dialog.accept()
                except Exception:
                    pass
            # jinak okno necháme na uživateli

        page.on("dialog", on_dialog)

    async def _open_urls_in(self, ctx, urls, reuse_blank=False):
        for i, url in enumerate(urls):
            page = None
            if reuse_blank and i == 0:
                blanks = [p for p in ctx.pages if p.url in ("about:blank", "chrome://newtab/", "")]
                page = blanks[0] if blanks else None
            if page is None:
                page = await ctx.new_page()
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            except Exception as e:
                self.log(f"Nepodařilo se otevřít {url}: {e}")

    async def open_urls(self, urls):
        if not self.contexts:
            self.log("Nejsou otevřené žádné profily.")
            return
        await asyncio.gather(*(self._open_urls_in(ctx, urls) for _, ctx in self.contexts.values()))
        self.log(f"Otevřeno {len(urls)} odkaz(ů) v {len(self.contexts)} profilech.")

    async def close_all(self):
        await self.stop_refresh()
        for _, ctx in list(self.contexts.values()):
            try:
                await ctx.close()
            except Exception:
                pass
        self.contexts.clear()
        self.emit("profiles_changed", None)

    async def shutdown(self):
        await self.close_all()
        if self._pw:
            await self._pw.stop()
            self._pw = None

    # ------------------------------------------------------------ kroky
    async def _find_visible(self, page, step):
        """Najde viditelný prvek pro krok ve všech rámech stránky."""
        candidates = []
        for frame in page.frames:
            css = (step.get("css") or "").strip()
            if step["kind"] in ("css", "recorded") and css:
                candidates.append(frame.locator(css))
            text = (step.get("value") or "").strip()
            if step["kind"] in ("text", "recorded") and text:
                exact = bool(step.get("exact"))
                candidates.append(frame.get_by_role("button", name=text, exact=exact))
                if exact:
                    candidates.append(frame.get_by_text(text, exact=True))
                else:
                    # tlačítka/odkazy stačí, když text obsahují; u ostatních prvků
                    # musí text začínat (jinak by se kliklo např. na odstavec,
                    # kde se slovo jen zmiňuje)
                    candidates.append(frame.locator(CLICKABLE).filter(has_text=text))
                    candidates.append(frame.get_by_text(
                        re.compile(r"^\s*" + re.escape(text), re.IGNORECASE)))
        for loc in candidates:
            try:
                count = await loc.count()
                for i in range(min(count, 10)):
                    el = loc.nth(i)
                    if await el.is_visible():
                        return el
            except Exception:
                continue
        return None

    async def run_step(self, name, page, step):
        deadline = time.monotonic() + float(step.get("timeout") or 0)
        while True:
            el = await self._find_visible(page, step)
            if el is not None:
                try:
                    await el.click(timeout=5000)
                    self.log(f"[{name}] Kliknuto: {step['name']}")
                    delay = float(step.get("delay_after") or 0)
                    if delay:
                        await asyncio.sleep(delay)
                    return True
                except Exception as e:
                    self.log(f"[{name}] Kliknutí na „{step['name']}“ selhalo: {e}")
            if time.monotonic() >= deadline or self._stopping():
                self.log(f"[{name}] Nenalezeno: {step['name']}")
                return False
            await asyncio.sleep(0.3)

    async def run_steps(self, name, page, steps):
        for step in steps:
            if self._stopping():
                return
            ok = await self.run_step(name, page, step)
            if not ok and step.get("skip_rest", True):
                return

    async def test_steps(self, steps):
        pages = self.pages()
        if not pages:
            self.log("Nejsou otevřené žádné stránky.")
            return
        await asyncio.gather(*(self.run_steps(n, p, steps) for n, p in pages))
        self.log("Test kroků dokončen.")

    # ------------------------------------------------------------ refresh
    def _stopping(self):
        return self._stop is not None and self._stop.is_set()

    async def _refresh_page(self, name, page, steps):
        try:
            await page.reload(wait_until="domcontentloaded", timeout=45000)
        except Exception as e:
            self.log(f"[{name}] Refresh selhal: {e}")
            return
        await self.run_steps(name, page, steps)

    async def _wait(self, seconds, cycle, total):
        end = time.monotonic() + seconds
        while not self._stopping():
            if not self._paused.is_set():
                pause_start = time.monotonic()
                self.emit("status", {"cycle": cycle, "total": total, "text": "Pozastaveno"})
                await asyncio.sleep(0.2)
                end += time.monotonic() - pause_start
                continue
            left = end - time.monotonic()
            if left <= 0:
                return
            self.emit("status", {"cycle": cycle, "total": total, "text": f"Další refresh za {left:.0f} s"})
            await asyncio.sleep(min(0.5, left))

    async def _refresh_loop(self, interval, jitter, cycles, steps):
        total = cycles if cycles > 0 else None
        cycle = 0
        self.log(f"Start refreshe: interval {interval:g} s, cyklů {'∞' if not total else total}.")
        try:
            while not self._stopping() and (total is None or cycle < total):
                pages = self.pages()
                if not pages:
                    self.log("Žádné otevřené stránky – refresh končí.")
                    break
                cycle += 1
                self.emit("status", {"cycle": cycle, "total": total, "text": "Obnovuji stránky…"})
                await asyncio.gather(*(self._refresh_page(n, p, steps) for n, p in pages))
                if total is not None and cycle >= total:
                    break
                wait = max(0.0, interval + random.uniform(-jitter, jitter))
                await self._wait(wait, cycle, total)
        finally:
            self.log(f"Refresh ukončen po {cycle} cyklech.")
            self.emit("status", {"cycle": cycle, "total": total, "text": "Hotovo", "done": True})
            self._refresh_task = None
            self._stop = None

    async def start_refresh(self, interval, jitter, cycles, steps):
        if self._refresh_task:
            self.log("Refresh už běží.")
            return
        self._stop = asyncio.Event()
        self._paused = asyncio.Event()
        self._paused.set()
        self._refresh_task = asyncio.ensure_future(
            self._refresh_loop(float(interval), float(jitter), int(cycles), list(steps)))

    async def toggle_pause(self):
        if not self._refresh_task:
            return None
        if self._paused.is_set():
            self._paused.clear()
            self.log("Refresh pozastaven.")
            return True
        self._paused.set()
        self.log("Refresh pokračuje.")
        return False

    async def stop_refresh(self):
        task = self._refresh_task
        if task:
            self._stop.set()
            self._paused.set()
            try:
                await asyncio.wait_for(asyncio.shield(task), timeout=60)
            except Exception:
                task.cancel()

    # ------------------------------------------------------------ nahrávání
    async def start_record(self):
        pages = self.pages()
        if not pages:
            self.log("Nejdřív otevři profil se stránkou.")
            return False
        self._recording = True
        for _, page in pages:
            for frame in page.frames:
                try:
                    await frame.evaluate(RECORDER_JS)
                except Exception:
                    pass
        self.log("Nahrávání: klikni v kterémkoli okně Chrome na tlačítko (Esc = zrušit).")
        return True

    async def _on_recorded(self, data):
        if not self._recording:
            return
        self._recording = False
        for _, page in self.pages():
            for frame in page.frames:
                try:
                    await frame.evaluate(STOP_RECORDER_JS)
                except Exception:
                    pass
        if data.get("cancelled"):
            self.log("Nahrávání zrušeno.")
            self.emit("recorded", None)
        else:
            self.log(f"Zaznamenán prvek: {data.get('text') or data.get('css')}")
            self.emit("recorded", data)
