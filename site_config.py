"""Public browser configuration supplied by the local environment."""

import base64
import json
import os
from pathlib import Path
from typing import Mapping, Optional


ENV_NAMES = (
    "NBJ_SUPABASE_URL",
    "NBJ_SUPABASE_PUBLISHABLE_KEY",
    "NBJ_SITE_URL",
    "NBJ_CURRENCY",
    "NBJ_CURRENCY_LOCALE",
)


def _local_values(root: Path) -> dict[str, str]:
    path = root / ".env.local"
    if not path.is_file():
        return {}
    values = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        if name not in ENV_NAMES:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[name] = value
    return values


def _assert_public_key(key: str) -> None:
    if key.startswith("sb_secret_"):
        raise ValueError("Never put a Supabase secret key in browser configuration.")
    if key.count(".") == 2:
        try:
            payload = key.split(".")[1]
            payload += "=" * (-len(payload) % 4)
            role = json.loads(base64.urlsafe_b64decode(payload)).get("role")
        except (ValueError, UnicodeDecodeError):
            role = None
        if role == "service_role":
            raise ValueError("Never put a service-role key in browser configuration.")


def public_config(root: Path, environ: Optional[Mapping[str, str]] = None) -> dict:
    values = _local_values(root)
    source = os.environ if environ is None else environ
    values.update({name: value for name, value in source.items()
                   if name in ENV_NAMES})
    key = values.get("NBJ_SUPABASE_PUBLISHABLE_KEY", "")
    _assert_public_key(key)
    return {
        "SUPABASE_URL": values.get("NBJ_SUPABASE_URL", ""),
        "SUPABASE_ANON_KEY": key,
        "SITE_URL": values.get("NBJ_SITE_URL", ""),
        "CURRENCY": values.get("NBJ_CURRENCY", "PHP"),
        "CURRENCY_LOCALE": values.get("NBJ_CURRENCY_LOCALE", "en-PH"),
        "DEBUG": False,
    }


def render_public_config(root: Path, environ: Optional[Mapping[str, str]] = None) -> bytes:
    data = json.dumps(public_config(root, environ), separators=(",", ":"))
    return f"window.NBJ_ENV = Object.freeze({data});\n".encode("utf-8")
