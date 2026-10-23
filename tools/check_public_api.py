"""Read-only anonymous API probe. Prints status codes, never response bodies."""

from pathlib import Path
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
from site_config import public_config  # noqa: E402

config = public_config(root)
if not config["SUPABASE_URL"] or not config["SUPABASE_ANON_KEY"]:
    sys.exit("Missing NBJ_SUPABASE_URL or NBJ_SUPABASE_PUBLISHABLE_KEY")

base = config["SUPABASE_URL"].rstrip("/")
key = config["SUPABASE_ANON_KEY"]
headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def status(path, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(base + path, data=data, headers=headers)
    try:
        with urlopen(request, timeout=15) as response:
            return response.status
    except HTTPError as error:
        return error.code


try:
    catalog = status("/rest/v1/categories?select=id&limit=1")
    store = status("/rest/v1/rpc/get_store_status", {})
    private_setting = status("/rest/v1/rpc/setting_json", {"p_key": "inventory_deduction_stage"})
except URLError as error:
    sys.exit(f"Cannot reach Supabase: {error.reason}")

print(f"Public catalog HTTP {catalog}")
print(f"Public store-status RPC HTTP {store}")
print(f"Private setting RPC HTTP {private_setting} (response body withheld)")
if private_setting == 200:
    sys.exit("FAIL: anonymous caller can execute private setting RPC")
if catalog != 200 or store != 200:
    sys.exit("INCOMPLETE: live project schema or public API is not ready")
print("Anonymous API probe passed. Test all roles in an isolated project as well.")
