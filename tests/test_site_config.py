"""Configuration and deployment export security checks."""

import base64
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

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
            headers = (output / "_headers").read_text(encoding="utf-8")
            self.assertIn("/assets/js/*\n  Cache-Control: no-cache", headers)
            self.assertIn("/assets/css/*\n  Cache-Control: no-cache", headers)
            self.assertIn("/admin/*.html\n  Cache-Control: no-cache", headers)

    def test_static_export_allows_design_only_configuration(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            config = {
                "SUPABASE_URL": "",
                "SUPABASE_ANON_KEY": "",
                "SITE_URL": "",
                "CURRENCY": "PHP",
                "CURRENCY_LOCALE": "en-PH",
                "DEBUG": False,
            }
            with patch(
                "site_config.public_config",
                return_value=config,
            ), patch(
                "tools.build_site.public_config",
                return_value=config,
            ):
                count = build(output)

            self.assertGreater(count, 50)
            self.assertTrue((output / "index.html").is_file())
            generated_config = (
                output / "assets/js/config.js"
            ).read_bytes()
            prefix = b"window.NBJ_ENV = Object.freeze("
            self.assertTrue(generated_config.startswith(prefix))
            config_json = json.loads(generated_config[len(prefix):-3])
            self.assertEqual(config_json["SUPABASE_URL"], "")
            self.assertEqual(config_json["SUPABASE_ANON_KEY"], "")

    def test_static_export_uses_netlify_public_config_when_environment_is_empty(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "site"
            with patch.dict("os.environ", {}, clear=True):
                build(output)

            generated_config = (output / "assets/js/config.js").read_bytes()
            prefix = b"window.NBJ_ENV = Object.freeze("
            self.assertTrue(generated_config.startswith(prefix))
            config_json = json.loads(generated_config[len(prefix):-3])
            self.assertEqual(
                config_json["SUPABASE_URL"],
                "https://wcqohzdsrvqiqlopwbdr.supabase.co",
            )
            self.assertTrue(
                config_json["SUPABASE_ANON_KEY"].startswith("sb_publishable_")
            )
            self.assertEqual(
                config_json["SITE_URL"],
                "https://leafy-valkyrie-c0f0a0.netlify.app",
            )


if __name__ == "__main__":
    unittest.main()
