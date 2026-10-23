"""Configuration and deployment export security checks."""

import base64
import json
import tempfile
import unittest
from pathlib import Path

from site_config import public_config
from tools.build_site import build


class ConfigTests(unittest.TestCase):
    def test_environment_overrides_local_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / ".env.local").write_text(
                "NBJ_SUPABASE_URL=https://local.supabase.co\n"
                "NBJ_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local\n",
                encoding="utf-8",
            )
            config = public_config(root, {
                "NBJ_SUPABASE_URL": "https://test.supabase.co",
            })
            self.assertEqual(config["SUPABASE_URL"], "https://test.supabase.co")
            self.assertEqual(config["SUPABASE_ANON_KEY"], "sb_publishable_local")

    def test_service_role_key_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(ValueError):
                public_config(root, {"NBJ_SUPABASE_PUBLISHABLE_KEY": "sb_secret_private"})
            payload = base64.urlsafe_b64encode(
                json.dumps({"role": "service_role"}).encode()
            ).decode().rstrip("=")
            with self.assertRaises(ValueError):
                public_config(root, {"NBJ_SUPABASE_PUBLISHABLE_KEY": f"a.{payload}.b"})

    def test_static_export_excludes_project_files(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            count = build(output)
            self.assertGreater(count, 50)
            self.assertTrue((output / "index.html").is_file())
            self.assertTrue((output / "admin/settings.html").is_file())
            self.assertFalse((output / "supabase").exists())
            self.assertFalse((output / ".env.local").exists())
            self.assertFalse((output / "app.py").exists())
            self.assertIn(b"SUPABASE_URL", (output / "assets/js/config.js").read_bytes())


if __name__ == "__main__":
    unittest.main()
