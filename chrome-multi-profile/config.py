"""Načítání a ukládání nastavení aplikace."""

import json
import os
import re
import sys
import uuid
from pathlib import Path

APP_NAME = "ChromeMultiProfile"


def _base_dirs():
    """Vrátí (adresář pro nastavení, adresář pro data profilů)."""
    override = os.environ.get("CMP_DATA_DIR")
    if override:
        base = Path(override)
        return base, base
    if sys.platform == "win32":
        cfg = Path(os.environ.get("APPDATA", Path.home())) / APP_NAME
        data = Path(os.environ.get("LOCALAPPDATA", Path.home())) / APP_NAME
    else:
        cfg = Path.home() / ".config" / APP_NAME
        data = Path.home() / ".local" / "share" / APP_NAME
    return cfg, data


CONFIG_DIR, DATA_DIR = _base_dirs()
CONFIG_FILE = CONFIG_DIR / "config.json"
PROFILES_DIR = DATA_DIR / "profiles"


def new_profile(name):
    slug = re.sub(r"[^A-Za-z0-9_-]+", "-", name).strip("-").lower() or "profil"
    return {"name": name, "dir": f"{slug}-{uuid.uuid4().hex[:6]}", "enabled": True}


def default_steps():
    return [
        {
            "name": "Search again",
            "kind": "text",
            "value": "Search again",
            "css": "",
            "exact": False,
            "timeout": 10.0,
            "delay_after": 1.0,
            "skip_rest": True,
        },
        {
            "name": "Find",
            "kind": "text",
            "value": "Find",
            "css": "",
            "exact": False,
            "timeout": 10.0,
            "delay_after": 0.0,
            "skip_rest": True,
        },
    ]


def default_config():
    return {
        "profiles": [new_profile(f"Profil {i}") for i in range(1, 4)],
        "urls": "",
        "tile_windows": True,
        "chrome_path": "",
        "interval": 30.0,
        "jitter": 0.0,
        "cycles": 10,
        "auto_dialogs": True,
        "steps": default_steps(),
    }


def load_config():
    cfg = default_config()
    try:
        with open(CONFIG_FILE, encoding="utf-8") as f:
            stored = json.load(f)
        if isinstance(stored, dict):
            cfg.update(stored)
    except (OSError, ValueError):
        pass
    return cfg


def save_config(cfg):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    tmp = CONFIG_FILE.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
    os.replace(tmp, CONFIG_FILE)


def profile_path(profile):
    return PROFILES_DIR / profile["dir"]
