"""HTTP checks for the local app.py entry point."""

import http.client
import json
import threading
import unittest
from http.server import ThreadingHTTPServer

from app import SiteHandler


class QuietSiteHandler(SiteHandler):
    def log_message(self, *_args):
        pass


class SiteServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), QuietSiteHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(self, path, method="GET"):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port)
        try:
            connection.request(method, path)
            response = connection.getresponse()
            headers = {name.lower(): value for name, value in response.getheaders()}
            return response.status, headers, response.read()
        finally:
            connection.close()

    def test_public_pages_and_css(self):
        for path, expected in (
            ("/", b"<html"),
            ("/admin/ingredients.html", b"<html"),
            ("/admin/suppliers.html", b"<html"),
            ("/assets/css/main.css", b"@import"),
            ("/assets/css/customer-shopping.css", b"CUSTOMER DASHBOARD"),
        ):
            with self.subTest(path=path):
                status, headers, body = self.request(path)
                self.assertEqual(status, 200)
                self.assertIn(expected.lower(), body.lower())
                self.assertEqual(headers["x-content-type-options"], "nosniff")

    def test_head_and_query_string(self):
        status, headers, body = self.request("/menu.html?category=burgers", "HEAD")
        self.assertEqual(status, 200)
        self.assertEqual(body, b"")
        self.assertIn("text/html", headers["content-type"])
        self.assertEqual(headers["cache-control"], "no-cache")

    def test_javascript_is_revalidated(self):
        status, headers, body = self.request("/assets/js/components/persistent-navigation.js")
        self.assertEqual(status, 200)
        self.assertIn(b"dataset.entity", body)
        self.assertEqual(headers["cache-control"], "no-cache")

    def test_public_config_is_generated_at_request_time(self):
        status, headers, body = self.request("/assets/js/config.js")
        self.assertEqual(status, 200)
        self.assertEqual(headers["cache-control"], "no-store")
        prefix = b"window.NBJ_ENV = Object.freeze("
        self.assertTrue(body.startswith(prefix))
        config = json.loads(body[len(prefix):-3])
        self.assertIn("SUPABASE_URL", config)
        self.assertIn("SUPABASE_ANON_KEY", config)
        self.assertNotIn("SUPABASE_SERVICE_ROLE_KEY", config)

    def test_project_files_and_directories_are_private(self):
        for path in (
            "/.venv/pyvenv.cfg",
            "/supabase/config.toml",
            "/README.md",
            "/app.py",
            "/node_modules/",
            "/assets/",
            "/assets/css/",
            "/%2e%2e/supabase/config.toml",
        ):
            with self.subTest(path=path):
                status, _, body = self.request(path)
                self.assertEqual(status, 404)
                self.assertIn(b"<html", body.lower())


if __name__ == "__main__":
    unittest.main()
