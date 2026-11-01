"""Export only browser-facing files for a static web host."""

import argparse
import os
import shutil
import sys
from pathlib import Path
import tomllib


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import ASSET_EXTENSIONS, PAGE_DIRECTORIES  # noqa: E402
from site_config import ENV_NAMES, public_config, render_public_config  # noqa: E402


def build(output: Path) -> int:
    output = output.resolve()
    if output == ROOT or (ROOT in output.parents and output != ROOT / "dist"):
        raise ValueError("Choose a dedicated empty output directory, such as dist.")
    if output.exists() and any(output.iterdir()):
        raise FileExistsError(f"Output directory is not empty: {output}")
    public_config(ROOT)

    files = list(ROOT.glob("*.html"))
    for directory in PAGE_DIRECTORIES:
        files.extend((ROOT / directory).glob("*.html"))
    files.extend(path for path in (ROOT / "assets").rglob("*")
                 if path.is_file() and path.suffix.lower() in ASSET_EXTENSIONS)

    for source in files:
        if source.is_symlink():
            raise ValueError(f"Refusing to publish a symlink: {source}")
        target = output / source.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    netlify_config = tomllib.loads(
        (ROOT / "netlify.toml").read_text(encoding="utf-8")
    )
    configured_environment = netlify_config.get("build", {}).get("environment", {})
    public_environment = {
        name: os.environ.get(name) or configured_environment.get(name)
        for name in ENV_NAMES
        if os.environ.get(name) or configured_environment.get(name)
    }
    config_path = output / "assets/js/config.js"
    config_path.write_bytes(
        render_public_config(ROOT, public_environment)
    )
    headers_path = output / "_headers"
    headers_path.write_text(
        "/*\n"
        "  X-Content-Type-Options: nosniff\n"
        "  Referrer-Policy: strict-origin-when-cross-origin\n"
        "  Permissions-Policy: camera=(), microphone=(), geolocation=()\n"
        "/*.html\n"
        "  Cache-Control: no-cache\n"
        "/admin/*.html\n"
        "  Cache-Control: no-cache\n"
        "/customer/*.html\n"
        "  Cache-Control: no-cache\n"
        "/operations/*.html\n"
        "  Cache-Control: no-cache\n"
        "/assets/css/*\n"
        "  Cache-Control: no-cache\n"
        "/assets/js/*\n"
        "  Cache-Control: no-cache\n",
        encoding="utf-8",
    )
    return len(files)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    count = build(args.output)
    print(f"Exported {count} public files to {args.output.resolve()}")


if __name__ == "__main__":
    main()
