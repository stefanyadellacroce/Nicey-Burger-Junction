"""Export only browser-facing files for a static web host."""

import argparse
import shutil
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app import ASSET_EXTENSIONS, PAGE_DIRECTORIES  # noqa: E402
from site_config import public_config, render_public_config  # noqa: E402


def build(output: Path) -> int:
    output = output.resolve()
    if output == ROOT or (ROOT in output.parents and output != ROOT / "dist"):
        raise ValueError("Choose a dedicated empty output directory, such as dist.")
    if output.exists() and any(output.iterdir()):
        raise FileExistsError(f"Output directory is not empty: {output}")
    config = public_config(ROOT)
    if not config["SUPABASE_URL"] or not config["SUPABASE_ANON_KEY"]:
        raise ValueError("Set NBJ_SUPABASE_URL and NBJ_SUPABASE_PUBLISHABLE_KEY first.")

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
    config_path = output / "assets/js/config.js"
    config_path.write_bytes(render_public_config(ROOT))
    return len(files)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist")
    args = parser.parse_args()
    count = build(args.output)
    print(f"Exported {count} public files to {args.output.resolve()}")


if __name__ == "__main__":
    main()
