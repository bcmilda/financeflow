"""Automatický test enginu na lokální testovací stránce (bez GUI).

Spuštění:  python tests/test_engine.py  [cesta-k-chromium]
"""
import functools
import http.server
import os
import sys
import tempfile
import threading
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.environ["CMP_DATA_DIR"] = tempfile.mkdtemp(prefix="cmp-test-")
sys.path.insert(0, str(HERE.parent))

import config  # noqa: E402
from engine import Engine  # noqa: E402


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    handler = functools.partial(Quiet, directory=str(HERE))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]


def main():
    port = serve()
    url = f"http://127.0.0.1:{port}/test_page.html"
    events = []
    eng = Engine(lambda k, d: events.append((k, d)), headless=True)
    eng.chrome_path = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("CMP_CHROME", "")
    profiles = [config.new_profile("A"), config.new_profile("B")]

    eng.submit(eng.open_profiles(profiles, [url + "#alert"], screen=(1920, 1080))).result(60)
    assert len(eng.pages()) == 2, eng.pages()

    steps = config.default_steps()
    for s in steps:
        s["timeout"] = 5
        s["delay_after"] = 0.3
    eng.submit(eng.start_refresh(1, 0.2, 3, steps)).result(10)
    deadline = time.time() + 90
    while not any(k == "status" and d.get("done") for k, d in events):
        assert time.time() < deadline, "refresh nedoběhl"
        time.sleep(0.2)

    counts = [eng.submit(p.evaluate("() => +localStorage.finds")).result(10) for _, p in eng.pages()]
    print("Počet kliknutí na Find v profilech:", counts)
    if counts != [3, 3]:
        print("\n".join(str(e) for e in events))
    assert counts == [3, 3], counts
    assert any(k == "log" and "Potvrzuji okno" in d for k, d in events), "alert nebyl potvrzen"

    # nahrávání kliknutím
    _, page = eng.pages()[0]
    eng.submit(page.reload()).result(10)
    eng.submit(page.wait_for_selector("#again", state="visible")).result(10)
    assert eng.submit(eng.start_record()).result(10)
    box = eng.submit(page.locator("#again").bounding_box()).result(10)
    eng.submit(page.mouse.click(box["x"] + 5, box["y"] + 5)).result(10)
    deadline = time.time() + 10
    while not any(k == "recorded" for k, _ in events):
        assert time.time() < deadline, "nahrávání nic nevrátilo"
        time.sleep(0.1)
    rec = next(d for k, d in events if k == "recorded")
    print("Nahraný prvek:", rec)
    assert rec["css"] == "#again" and rec["text"] == "Search again", rec
    still_visible = eng.submit(page.locator("#again").is_visible()).result(10)
    assert still_visible, "kliknutí při nahrávání se nemělo provést"

    # nahraný krok jde spustit
    step = {"name": "rec", "kind": "recorded", "value": rec["text"], "css": rec["css"],
            "exact": False, "timeout": 5, "delay_after": 0, "skip_rest": True}
    assert eng.submit(eng.run_step("A", page, step)).result(20)

    eng.submit(eng.shutdown()).result(30)
    print("\n".join(d for k, d in events if k == "log"))
    print("\nOK – všechny testy prošly")


if __name__ == "__main__":
    main()
