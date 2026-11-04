"""Chrome Multi-Profile – okenní aplikace (tkinter)."""

import os
import queue
import sys
import time
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, ttk
from tkinter.scrolledtext import ScrolledText

import config
from engine import Engine

KIND_LABELS = {"text": "Text", "css": "CSS selektor", "recorded": "Nahraný klik"}


def _float(var, default=0.0):
    try:
        return float(str(var.get()).replace(",", "."))
    except (ValueError, tk.TclError):
        return default


class StepDialog(tk.Toplevel):
    """Úprava jednoho kroku (na co kliknout po refreshi)."""

    def __init__(self, master, step):
        super().__init__(master)
        self.title("Krok po refreshi")
        self.resizable(False, False)
        self.transient(master)
        self.result = None
        s = dict(step)
        self.v_name = tk.StringVar(value=s.get("name", ""))
        self.v_kind = tk.StringVar(value=KIND_LABELS.get(s.get("kind", "text")))
        self.v_value = tk.StringVar(value=s.get("value", ""))
        self.v_css = tk.StringVar(value=s.get("css", ""))
        self.v_exact = tk.BooleanVar(value=s.get("exact", False))
        self.v_timeout = tk.StringVar(value=str(s.get("timeout", 10)))
        self.v_delay = tk.StringVar(value=str(s.get("delay_after", 0)))
        self.v_skip = tk.BooleanVar(value=s.get("skip_rest", True))

        f = ttk.Frame(self, padding=12)
        f.pack(fill="both", expand=True)
        rows = [
            ("Název kroku:", ttk.Entry(f, textvariable=self.v_name, width=44)),
            ("Hledat podle:", ttk.Combobox(f, textvariable=self.v_kind, state="readonly",
                                           values=list(KIND_LABELS.values()), width=20)),
            ("Text tlačítka:", ttk.Entry(f, textvariable=self.v_value, width=44)),
            ("CSS selektor:", ttk.Entry(f, textvariable=self.v_css, width=44)),
            ("Čekat max. (s):", ttk.Entry(f, textvariable=self.v_timeout, width=8)),
            ("Pauza po kliku (s):", ttk.Entry(f, textvariable=self.v_delay, width=8)),
        ]
        for r, (label, widget) in enumerate(rows):
            ttk.Label(f, text=label).grid(row=r, column=0, sticky="w", pady=3)
            widget.grid(row=r, column=1, sticky="w", pady=3)
        r = len(rows)
        ttk.Checkbutton(f, text="Přesná shoda textu (jinak stačí část textu tlačítka)",
                        variable=self.v_exact).grid(row=r, column=0, columnspan=2, sticky="w")
        ttk.Checkbutton(f, text="Když se prvek nenajde, přeskočit další kroky",
                        variable=self.v_skip).grid(row=r + 1, column=0, columnspan=2, sticky="w")
        ttk.Label(f, foreground="#666", wraplength=380, justify="left",
                  text="Tip: u „Nahraného kliku“ se zkusí nejdřív CSS selektor a pak text. "
                       "Krok čeká, až se prvek objeví (max. zadaný čas).").grid(
            row=r + 2, column=0, columnspan=2, sticky="w", pady=(6, 0))
        b = ttk.Frame(f)
        b.grid(row=r + 3, column=0, columnspan=2, sticky="e", pady=(10, 0))
        ttk.Button(b, text="Uložit", command=self._ok).pack(side="left", padx=4)
        ttk.Button(b, text="Zrušit", command=self.destroy).pack(side="left")
        self.bind("<Return>", lambda e: self._ok())
        self.bind("<Escape>", lambda e: self.destroy())
        self.grab_set()
        rows[0][1].focus_set()

    def _ok(self):
        kind = {v: k for k, v in KIND_LABELS.items()}[self.v_kind.get()]
        value, css = self.v_value.get().strip(), self.v_css.get().strip()
        if kind == "text" and not value or kind == "css" and not css or \
                kind == "recorded" and not (value or css):
            messagebox.showwarning("Chybí údaj", "Vyplň text tlačítka nebo CSS selektor.", parent=self)
            return
        self.result = {
            "name": self.v_name.get().strip() or value or css,
            "kind": kind, "value": value, "css": css,
            "exact": self.v_exact.get(),
            "timeout": _float(self.v_timeout, 10.0),
            "delay_after": _float(self.v_delay, 0.0),
            "skip_rest": self.v_skip.get(),
        }
        self.destroy()


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Chrome Multi-Profile")
        self.geometry("1040x760")
        self.minsize(900, 640)
        self.cfg = config.load_config()
        self.events = queue.Queue()
        self.engine = Engine(lambda kind, data: self.events.put((kind, data)))
        self.engine.chrome_path = self.cfg.get("chrome_path", "")
        self.engine.auto_dialogs = self.cfg.get("auto_dialogs", True)
        self._paused = False

        self._build()
        self._refresh_profiles()
        self._refresh_steps()
        self.protocol("WM_DELETE_WINDOW", self._on_close)
        self.after(100, self._poll)

    # ------------------------------------------------------------ UI
    def _build(self):
        style = ttk.Style(self)
        if "vista" in style.theme_names():
            style.theme_use("vista")
        style.configure("Big.TButton", padding=(10, 6))

        top = ttk.Frame(self, padding=8)
        top.pack(fill="both", expand=True)
        top.columnconfigure(0, weight=1, uniform="col")
        top.columnconfigure(1, weight=1, uniform="col")
        top.rowconfigure(0, weight=1)

        # ---- levý sloupec: profily + odkazy
        left = ttk.Frame(top)
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 6))
        left.rowconfigure(0, weight=1)
        left.columnconfigure(0, weight=1)

        pf = ttk.LabelFrame(left, text="1. Profily Chrome", padding=8)
        pf.grid(row=0, column=0, sticky="nsew")
        pf.rowconfigure(0, weight=1)
        pf.columnconfigure(0, weight=1)
        self.tv_prof = ttk.Treeview(pf, columns=("on", "name", "state"), show="headings", height=6)
        for col, text, w in (("on", "Použít", 60), ("name", "Název", 200), ("state", "Stav", 90)):
            self.tv_prof.heading(col, text=text)
            self.tv_prof.column(col, width=w, anchor="w" if col == "name" else "center")
        self.tv_prof.grid(row=0, column=0, sticky="nsew")
        self.tv_prof.bind("<Double-1>", lambda e: self._toggle_profile())
        self.tv_prof.bind("<space>", lambda e: self._toggle_profile())
        pb = ttk.Frame(pf)
        pb.grid(row=1, column=0, sticky="w", pady=(6, 0))
        for text, cmd in (("Přidat", self._add_profile), ("Přejmenovat", self._rename_profile),
                          ("Odebrat", self._remove_profile), ("Zapnout/vypnout", self._toggle_profile)):
            ttk.Button(pb, text=text, command=cmd).pack(side="left", padx=(0, 4))
        ttk.Label(pf, foreground="#666", wraplength=440, justify="left",
                  text="Každý profil má vlastní okno Chrome. Při prvním spuštění se v něm "
                       "jednou přihlas – přihlášení si pak pamatuje.").grid(row=2, column=0, sticky="w", pady=(6, 0))

        uf = ttk.LabelFrame(left, text="2. Odkazy (jeden na řádek)", padding=8)
        uf.grid(row=1, column=0, sticky="nsew", pady=(6, 0))
        uf.columnconfigure(0, weight=1)
        self.txt_urls = tk.Text(uf, height=5, wrap="none", font=("Consolas", 10))
        self.txt_urls.grid(row=0, column=0, sticky="ew")
        self.txt_urls.insert("1.0", self.cfg.get("urls", ""))
        self.v_tile = tk.BooleanVar(value=self.cfg.get("tile_windows", True))
        ttk.Checkbutton(uf, text="Rozložit okna vedle sebe", variable=self.v_tile).grid(
            row=1, column=0, sticky="w", pady=(4, 0))
        ub = ttk.Frame(uf)
        ub.grid(row=2, column=0, sticky="w", pady=(6, 0))
        ttk.Button(ub, text="▶ Otevřít profily", style="Big.TButton",
                   command=self._open_profiles).pack(side="left", padx=(0, 4))
        ttk.Button(ub, text="Otevřít odkazy v otevřených", command=self._open_urls).pack(side="left", padx=(0, 4))
        ttk.Button(ub, text="Zavřít vše", command=self._close_all).pack(side="left")
        cf = ttk.Frame(uf)
        cf.grid(row=3, column=0, sticky="ew", pady=(8, 0))
        cf.columnconfigure(1, weight=1)
        ttk.Label(cf, text="Chrome.exe (nepovinné):").grid(row=0, column=0, sticky="w")
        self.v_chrome = tk.StringVar(value=self.cfg.get("chrome_path", ""))
        ttk.Entry(cf, textvariable=self.v_chrome).grid(row=0, column=1, sticky="ew", padx=4)
        ttk.Button(cf, text="…", width=3, command=self._pick_chrome).grid(row=0, column=2)

        # ---- pravý sloupec: refresh + kroky
        right = ttk.Frame(top)
        right.grid(row=0, column=1, sticky="nsew", padx=(6, 0))
        right.columnconfigure(0, weight=1)
        right.rowconfigure(1, weight=1)

        rf = ttk.LabelFrame(right, text="3. Automatický refresh", padding=8)
        rf.grid(row=0, column=0, sticky="ew")
        self.v_interval = tk.StringVar(value=str(self.cfg.get("interval", 30)))
        self.v_jitter = tk.StringVar(value=str(self.cfg.get("jitter", 0)))
        self.v_cycles = tk.StringVar(value=str(self.cfg.get("cycles", 10)))
        self.v_dialogs = tk.BooleanVar(value=self.cfg.get("auto_dialogs", True))
        fields = (("Interval mezi refreshi (s):", self.v_interval),
                  ("Náhodná odchylka ± (s):", self.v_jitter),
                  ("Počet cyklů (0 = stále):", self.v_cycles))
        for r, (label, var) in enumerate(fields):
            ttk.Label(rf, text=label).grid(row=r, column=0, sticky="w", pady=2)
            ttk.Spinbox(rf, textvariable=var, from_=0, to=100000, increment=1, width=8).grid(
                row=r, column=1, sticky="w", pady=2)
        ttk.Checkbutton(rf, text="Automaticky potvrzovat okna prohlížeče (alert / confirm)",
                        variable=self.v_dialogs, command=self._dialogs_changed).grid(
            row=3, column=0, columnspan=3, sticky="w", pady=(4, 0))
        rb = ttk.Frame(rf)
        rb.grid(row=4, column=0, columnspan=3, sticky="w", pady=(8, 0))
        self.btn_start = ttk.Button(rb, text="▶ Start", style="Big.TButton", command=self._start)
        self.btn_pause = ttk.Button(rb, text="⏸ Pauza", style="Big.TButton", command=self._pause, state="disabled")
        self.btn_stop = ttk.Button(rb, text="⏹ Stop", style="Big.TButton", command=self._stop, state="disabled")
        for b in (self.btn_start, self.btn_pause, self.btn_stop):
            b.pack(side="left", padx=(0, 4))
        self.progress = ttk.Progressbar(rf, mode="determinate")
        self.progress.grid(row=5, column=0, columnspan=3, sticky="ew", pady=(8, 0))
        rf.columnconfigure(2, weight=1)
        self.v_status = tk.StringVar(value="Připraveno")
        ttk.Label(rf, textvariable=self.v_status).grid(row=6, column=0, columnspan=3, sticky="w")

        sf = ttk.LabelFrame(right, text="4. Co kliknout po každém refreshi (v tomto pořadí)", padding=8)
        sf.grid(row=1, column=0, sticky="nsew", pady=(6, 0))
        sf.rowconfigure(0, weight=1)
        sf.columnconfigure(0, weight=1)
        self.tv_steps = ttk.Treeview(sf, columns=("n", "name", "kind", "find", "wait"),
                                     show="headings", height=6)
        for col, text, w in (("n", "#", 30), ("name", "Krok", 120), ("kind", "Typ", 90),
                             ("find", "Hledá", 170), ("wait", "Čeká", 50)):
            self.tv_steps.heading(col, text=text)
            self.tv_steps.column(col, width=w, anchor="w")
        self.tv_steps.grid(row=0, column=0, sticky="nsew")
        self.tv_steps.bind("<Double-1>", lambda e: self._edit_step())
        sb = ttk.Frame(sf)
        sb.grid(row=1, column=0, sticky="w", pady=(6, 0))
        self.btn_record = ttk.Button(sb, text="🎯 Nahrát kliknutím", command=self._record)
        self.btn_record.pack(side="left", padx=(0, 4))
        for text, cmd in (("Přidat text", self._add_step), ("Upravit", self._edit_step),
                          ("Odebrat", self._remove_step)):
            ttk.Button(sb, text=text, command=cmd).pack(side="left", padx=(0, 4))
        sb2 = ttk.Frame(sf)
        sb2.grid(row=2, column=0, sticky="w", pady=(4, 0))
        ttk.Button(sb2, text="↑ Nahoru", command=lambda: self._move_step(-1)).pack(side="left", padx=(0, 4))
        ttk.Button(sb2, text="↓ Dolů", command=lambda: self._move_step(1)).pack(side="left", padx=(0, 4))
        ttk.Button(sb2, text="Otestovat teď",
                   command=self._test_steps).pack(side="left")

        lf = ttk.LabelFrame(self, text="Průběh", padding=(8, 4))
        lf.pack(fill="both", padx=8, pady=(0, 8))
        self.log = ScrolledText(lf, height=9, state="disabled", font=("Consolas", 9))
        self.log.pack(fill="both", expand=True)

    # ------------------------------------------------------------ pomocné
    def _write_log(self, text):
        self.log.configure(state="normal")
        self.log.insert("end", time.strftime("%H:%M:%S ") + text + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def _save(self):
        self.cfg["urls"] = self.txt_urls.get("1.0", "end").strip()
        self.cfg["tile_windows"] = self.v_tile.get()
        self.cfg["chrome_path"] = self.v_chrome.get().strip()
        self.cfg["interval"] = _float(self.v_interval, 30.0)
        self.cfg["jitter"] = _float(self.v_jitter, 0.0)
        self.cfg["cycles"] = int(_float(self.v_cycles, 10))
        self.cfg["auto_dialogs"] = self.v_dialogs.get()
        self.engine.chrome_path = self.cfg["chrome_path"]
        self.engine.auto_dialogs = self.cfg["auto_dialogs"]
        try:
            config.save_config(self.cfg)
        except OSError as e:
            self._write_log(f"Nastavení nelze uložit: {e}")

    def _urls(self):
        urls = []
        for line in self.txt_urls.get("1.0", "end").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "://" not in line:
                line = "https://" + line
            urls.append(line)
        return urls

    def _poll(self):
        try:
            while True:
                kind, data = self.events.get_nowait()
                if kind == "log":
                    self._write_log(data)
                elif kind == "profiles_changed":
                    self._refresh_profiles()
                elif kind == "status":
                    self._on_status(data)
                elif kind == "recorded":
                    self._on_recorded(data)
                elif kind == "call":
                    data()
        except queue.Empty:
            pass
        self.after(100, self._poll)

    def _run(self, coro, done=None):
        fut = self.engine.submit(coro)
        if done:
            # výsledek přijde z vlákna enginu – do GUI ho předáme přes frontu
            fut.add_done_callback(lambda f: self.events.put(("call", lambda: done(f))))
        return fut

    # ------------------------------------------------------------ profily
    def _refresh_profiles(self):
        sel = self.tv_prof.selection()
        self.tv_prof.delete(*self.tv_prof.get_children())
        open_dirs = self.engine.open_profile_dirs()
        for p in self.cfg["profiles"]:
            self.tv_prof.insert("", "end", iid=p["dir"], values=(
                "✔" if p.get("enabled", True) else "—", p["name"],
                "otevřený" if p["dir"] in open_dirs else ""))
        keep = [s for s in sel if self.tv_prof.exists(s)]
        if keep:
            self.tv_prof.selection_set(keep)

    def _selected_profile(self):
        sel = self.tv_prof.selection()
        if not sel:
            return None
        return next((p for p in self.cfg["profiles"] if p["dir"] == sel[0]), None)

    def _add_profile(self):
        name = simpledialog.askstring("Nový profil", "Název profilu:", parent=self,
                                      initialvalue=f"Profil {len(self.cfg['profiles']) + 1}")
        if name and name.strip():
            self.cfg["profiles"].append(config.new_profile(name.strip()))
            self._save()
            self._refresh_profiles()

    def _rename_profile(self):
        p = self._selected_profile()
        if not p:
            return
        name = simpledialog.askstring("Přejmenovat", "Nový název:", parent=self, initialvalue=p["name"])
        if name and name.strip():
            p["name"] = name.strip()
            self._save()
            self._refresh_profiles()

    def _remove_profile(self):
        p = self._selected_profile()
        if not p:
            return
        if not messagebox.askyesno("Odebrat profil",
                                   f"Odebrat profil „{p['name']}“ ze seznamu?\n\n"
                                   f"Data (přihlášení) zůstanou ve složce:\n{config.profile_path(p)}"):
            return
        self.cfg["profiles"].remove(p)
        self._save()
        self._refresh_profiles()

    def _toggle_profile(self):
        p = self._selected_profile()
        if p:
            p["enabled"] = not p.get("enabled", True)
            self._save()
            self._refresh_profiles()

    def _pick_chrome(self):
        path = filedialog.askopenfilename(title="Vyber chrome.exe",
                                          filetypes=[("Chrome", "chrome.exe"), ("Programy", "*.exe"),
                                                     ("Vše", "*")])
        if path:
            self.v_chrome.set(path)
            self._save()

    def _open_profiles(self):
        self._save()
        profiles = [p for p in self.cfg["profiles"] if p.get("enabled", True)]
        if not profiles:
            messagebox.showinfo("Profily", "Zapni aspoň jeden profil.")
            return
        screen = (self.winfo_screenwidth(), self.winfo_screenheight()) if self.v_tile.get() else None
        self._run(self.engine.open_profiles(profiles, self._urls(), screen))

    def _open_urls(self):
        self._save()
        urls = self._urls()
        if not urls:
            messagebox.showinfo("Odkazy", "Zadej aspoň jeden odkaz.")
            return
        self._run(self.engine.open_urls(urls))

    def _close_all(self):
        self._run(self.engine.close_all())

    # ------------------------------------------------------------ refresh
    def _dialogs_changed(self):
        self.engine.auto_dialogs = self.v_dialogs.get()
        self._save()

    def _start(self):
        self._save()
        if not self.engine.pages():
            messagebox.showinfo("Refresh", "Nejdřív otevři profily se stránkami.")
            return
        if self.cfg["interval"] <= 0:
            messagebox.showwarning("Refresh", "Interval musí být větší než 0.")
            return
        self._paused = False
        self.btn_start.configure(state="disabled")
        self.btn_pause.configure(state="normal", text="⏸ Pauza")
        self.btn_stop.configure(state="normal")
        cycles = self.cfg["cycles"]
        self.progress.configure(mode="determinate" if cycles > 0 else "indeterminate",
                                maximum=max(cycles, 1), value=0)
        if cycles <= 0:
            self.progress.start(30)
        self._run(self.engine.start_refresh(self.cfg["interval"], self.cfg["jitter"],
                                            cycles, self.cfg["steps"]))

    def _pause(self):
        def done(f):
            try:
                paused = f.result()
            except Exception:
                return
            if paused is not None:
                self.btn_pause.configure(text="▶ Pokračovat" if paused else "⏸ Pauza")
        self._run(self.engine.toggle_pause(), done)

    def _stop(self):
        self.v_status.set("Zastavuji…")
        self._run(self.engine.stop_refresh())

    def _on_status(self, d):
        total = d.get("total")
        prefix = f"Cyklus {d['cycle']}/{total}" if total else f"Cyklus {d['cycle']}"
        self.v_status.set(f"{prefix} – {d['text']}")
        if total:
            self.progress.configure(value=d["cycle"])
        if d.get("done"):
            self.progress.stop()
            self.btn_start.configure(state="normal")
            self.btn_pause.configure(state="disabled", text="⏸ Pauza")
            self.btn_stop.configure(state="disabled")

    # ------------------------------------------------------------ kroky
    def _refresh_steps(self):
        self.tv_steps.delete(*self.tv_steps.get_children())
        for i, s in enumerate(self.cfg["steps"]):
            find = s.get("value") or s.get("css")
            if s["kind"] == "css":
                find = s.get("css")
            self.tv_steps.insert("", "end", iid=str(i), values=(
                i + 1, s["name"], KIND_LABELS.get(s["kind"], s["kind"]), find, f"{s.get('timeout', 0):g} s"))

    def _selected_step(self):
        sel = self.tv_steps.selection()
        return int(sel[0]) if sel else None

    def _step_dialog(self, step):
        dlg = StepDialog(self, step)
        self.wait_window(dlg)
        return dlg.result

    def _add_step(self):
        res = self._step_dialog({"kind": "text", "timeout": 10, "delay_after": 0.5, "skip_rest": True})
        if res:
            self.cfg["steps"].append(res)
            self._save()
            self._refresh_steps()

    def _edit_step(self):
        i = self._selected_step()
        if i is None:
            return
        res = self._step_dialog(self.cfg["steps"][i])
        if res:
            self.cfg["steps"][i] = res
            self._save()
            self._refresh_steps()

    def _remove_step(self):
        i = self._selected_step()
        if i is not None:
            del self.cfg["steps"][i]
            self._save()
            self._refresh_steps()

    def _move_step(self, delta):
        i = self._selected_step()
        steps = self.cfg["steps"]
        if i is None or not 0 <= i + delta < len(steps):
            return
        steps[i], steps[i + delta] = steps[i + delta], steps[i]
        self._save()
        self._refresh_steps()
        self.tv_steps.selection_set(str(i + delta))

    def _record(self):
        def done(f):
            try:
                ok = f.result()
            except Exception:
                ok = False
            if ok:
                self.btn_record.configure(text="🎯 Čekám na klik…", state="disabled")
        self._run(self.engine.start_record(), done)

    def _on_recorded(self, data):
        self.btn_record.configure(text="🎯 Nahrát kliknutím", state="normal")
        if not data:
            return
        self.lift()
        self.focus_force()
        res = self._step_dialog({
            "name": data.get("text") or data.get("tag", "prvek"), "kind": "recorded",
            "value": data.get("text", ""), "css": data.get("css", ""), "exact": False,
            "timeout": 10, "delay_after": 0.5, "skip_rest": True})
        if res:
            self.cfg["steps"].append(res)
            self._save()
            self._refresh_steps()

    def _test_steps(self):
        if not self.cfg["steps"]:
            return
        self._run(self.engine.test_steps(self.cfg["steps"]))

    # ------------------------------------------------------------ konec
    def _on_close(self):
        self._save()
        try:
            self.engine.submit(self.engine.shutdown()).result(timeout=15)
        except Exception:
            pass
        self.destroy()


def main():
    if sys.platform == "win32":
        try:  # ostré písmo na monitorech se zvětšením
            import ctypes
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            pass
    App().mainloop()


if __name__ == "__main__":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    main()
